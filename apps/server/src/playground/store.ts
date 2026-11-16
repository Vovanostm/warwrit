import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import {
  PLAYGROUND_CONTENT_REVISION,
  type PlaygroundCommand,
  type PlaygroundSandbox,
  type PlaygroundResult,
  type PlaygroundReceipt,
} from '@warwrit/protocol';
import type { DatabaseSchema } from '../db/database.js';
import { inspectPlaygroundScenario, playgroundTemplate } from './scenario.js';
import { activateSandboxEncounter, readSandboxEncounter } from './combat.js';

export class PlaygroundRefusal extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

interface SandboxRow {
  id: string;
  owner_id: string;
  revision: number;
  status: PlaygroundSandbox['status'];
  scenario: PlaygroundSandbox['scenario'];
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}
const project = (row: SandboxRow): PlaygroundSandbox => ({
  id: row.id,
  ownerId: row.owner_id,
  revision: row.revision,
  status: row.status,
  scenario: row.scenario,
  contentRevision: row.scenario.contentRevision,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  expiresAt: row.expires_at.toISOString(),
});

export async function cleanupPlayground(database: Kysely<DatabaseSchema>): Promise<void> {
  await sql`delete from playground.sandboxes where expires_at <= now()`.execute(database);
}

export async function listPlayground(database: Kysely<DatabaseSchema>, owner: string) {
  const result = await sql<SandboxRow>`select * from playground.sandboxes
    where owner_id = ${owner} and status <> 'deleted' and expires_at > now() order by created_at desc`.execute(
    database,
  );
  return result.rows.map(project);
}

export async function readPlayground(database: Kysely<DatabaseSchema>, owner: string, id: string) {
  return database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute((transaction) => readPlaygroundSnapshot(transaction, owner, id));
}

async function readPlaygroundSnapshot(database: Kysely<DatabaseSchema>, owner: string, id: string) {
  const result = await sql<SandboxRow>`select * from playground.sandboxes
    where id = ${id}::uuid and owner_id = ${owner} and status <> 'deleted' and expires_at > now()`.execute(
    database,
  );
  const row = result.rows[0];
  if (!row) throw new PlaygroundRefusal('NOT_FOUND', 404);
  const compatible = row.scenario.contentRevision === PLAYGROUND_CONTENT_REVISION;
  const combat =
    row.status === 'active' && compatible
      ? await readSandboxEncounter(database, id, row.scenario)
      : null;
  const audit = await sql<{ response: PlaygroundResult }>`select response from playground.receipts
    where sandbox_id = ${id}::uuid and owner_id = ${owner} order by created_at, command_id`.execute(
    database,
  );
  return {
    sandbox: project(row),
    ...(compatible ? {} : { validationError: 'CONTENT_REVISION_MISMATCH' as const }),
    view: combat?.view ?? null,
    ...(combat
      ? {
          encounterId: combat.row.id,
          commands: combat.commands,
          receipts: combat.receipts,
          rejections: combat.rejections,
          events: combat.events,
        }
      : {}),
    audit: audit.rows.map(({ response }) => response.receipt),
  };
}

/** A bounded lifecycle adapter; all writes target the literal playground schema. */
export async function executePlayground(
  database: Kysely<DatabaseSchema>,
  owner: string,
  command: PlaygroundCommand,
): Promise<PlaygroundResult> {
  return database.transaction().execute(async (transaction) => {
    // One bounded development store: also serializes quota checks and duplicate creates.
    await sql`select pg_advisory_xact_lock(57005, 5)`.execute(transaction);
    const prior = await sql<{
      response: PlaygroundResult;
      same: boolean;
    }>`select response, request = ${JSON.stringify(command)}::jsonb as same
      from playground.receipts where owner_id = ${owner} and command_id = ${command.commandId}::uuid`.execute(
      transaction,
    );
    if (prior.rows[0]) {
      if (!prior.rows[0].same) throw new PlaygroundRefusal('COMMAND_CONFLICT', 409);
      return prior.rows[0].response;
    }
    // Exact accepted retries win over request age. The future-clock tolerance
    // consumes a minute of the window so no valid new create outlives its receipt.
    const age = Date.now() - Date.parse(command.issuedAt);
    if (age < -60_000 || age >= 24 * 60 * 60_000 - 60_000)
      throw new PlaygroundRefusal('COMMAND_EXPIRED', 409);
    let source: SandboxRow | undefined;
    if (command.operation !== 'create') {
      source = (
        await sql<SandboxRow>`select * from playground.sandboxes where id = ${command.sandboxId}::uuid
        and owner_id = ${owner} and expires_at > now() and status <> 'deleted' for update`.execute(
          transaction,
        )
      ).rows[0];
      if (!source) throw new PlaygroundRefusal('NOT_FOUND', 404);
      if (source.revision !== command.expectedRevision)
        throw new PlaygroundRefusal('STALE_REVISION', 409);
    }
    if (source) {
      const count = (
        await sql<{
          count: number;
        }>`select count(*)::int as count from playground.receipts where sandbox_id = ${source.id}::uuid`.execute(
          transaction,
        )
      ).rows[0]!.count;
      if (count >= 128) throw new PlaygroundRefusal('COMMAND_LIMIT', 409);
    }
    const creating = command.operation === 'create' || command.operation === 'clone';
    let id = source?.id ?? randomUUID();
    let scenario = source?.scenario ?? playgroundTemplate();
    let status: PlaygroundSandbox['status'] = source?.status ?? 'draft';
    if (creating) {
      const counts = (
        await sql<{ total: number; owned: number }>`select count(*)::int as total,
        count(*) filter (where owner_id = ${owner})::int as owned from playground.sandboxes where expires_at > now()`.execute(
          transaction,
        )
      ).rows[0]!;
      if (counts.total >= 32 || counts.owned >= 8)
        throw new PlaygroundRefusal('SANDBOX_LIMIT', 409);
      id = randomUUID();
      status = 'draft';
    } else if (command.operation === 'configure') {
      if (status === 'active') throw new PlaygroundRefusal('ACTIVE_CONFIGURATION_FROZEN', 409);
      scenario = command.scenario!;
      status = 'draft';
    } else if (command.operation === 'validate' || command.operation === 'activate') {
      if (scenario.contentRevision !== PLAYGROUND_CONTENT_REVISION)
        throw new PlaygroundRefusal('CONTENT_REVISION_MISMATCH', 409);
      if (status === 'active' || (command.operation === 'activate' && status !== 'validated'))
        throw new PlaygroundRefusal('INVALID_LIFECYCLE', 409);
      try {
        inspectPlaygroundScenario(id, scenario);
      } catch {
        throw new PlaygroundRefusal('SCENARIO_INVALID', 400);
      }
      status = command.operation === 'activate' ? 'active' : 'validated';
    } else if (command.operation === 'reset') status = 'draft';
    else if (command.operation === 'delete') status = 'deleted';
    if (!creating && (command.operation === 'reset' || command.operation === 'delete'))
      await sql`delete from playground.encounters where sandbox_id = ${id}::uuid`.execute(
        transaction,
      );
    const revision = creating ? 0 : source!.revision + 1;
    const rows = creating
      ? await sql<SandboxRow>`insert into playground.sandboxes (id, owner_id, revision, status, scenario, expires_at)
          values (${id}::uuid, ${owner}, ${revision}, ${status}, ${JSON.stringify(scenario)}::jsonb, now() + interval '24 hours') returning *`.execute(
          transaction,
        )
      : await sql<SandboxRow>`update playground.sandboxes set revision = ${revision}, status = ${status},
          scenario = ${JSON.stringify(scenario)}::jsonb, updated_at = now() where id = ${id}::uuid and owner_id = ${owner} returning *`.execute(
          transaction,
        );
    if (command.operation === 'activate')
      await activateSandboxEncounter(transaction, id, owner, scenario);
    const receipt: PlaygroundReceipt = {
      commandId: command.commandId,
      receiptId: randomUUID(),
      sandboxId: id,
      revision,
      operation: command.operation,
      status: 'accepted',
    };
    const response = { sandbox: project(rows.rows[0]!), receipt };
    await sql`insert into playground.receipts (owner_id, command_id, sandbox_id, request, response)
      values (${owner}, ${command.commandId}::uuid, ${id}::uuid, ${JSON.stringify(command)}::jsonb, ${JSON.stringify(response)}::jsonb)`.execute(
      transaction,
    );
    return response;
  });
}

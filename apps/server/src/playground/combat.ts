import { createHash, randomUUID } from 'node:crypto';
import * as combat from '@warwrit/game-core';
import { sql, type Kysely, type Transaction } from 'kysely';
import { PLAYGROUND_CONTENT_REVISION, type PlaygroundScenario } from '@warwrit/protocol';
import type { DatabaseSchema } from '../db/database.js';
import type { EncounterStoredRow } from '../encounters/executor.js';
import { verifyEncounterReplay } from '../encounters/executor.js';
import { projectCombatLabView } from '../combat-lab/projection.js';
import { createCombatLabPresentation } from '../combat-lab/presentation.js';
import { createPlaygroundSetup } from './scenario.js';

export async function activateSandboxEncounter(
  transaction: Transaction<DatabaseSchema>,
  sandboxId: string,
  owner: string,
  scenario: PlaygroundScenario,
) {
  const id = randomUUID();
  const setup = createPlaygroundSetup(id, scenario);
  const started = combat.startBattleV2(setup);
  await sql`insert into playground.encounters (id, sandbox_id, world_id, schema_version, setup, state, revision, status, activation_id, activation_epoch, deadline_at, ai_wake_at)
    values (${id}::uuid, ${sandboxId}::uuid, 'sandbox', 2, ${JSON.stringify(setup)}::json, ${JSON.stringify(started.state)}::json, 0, ${started.state.status}, ${started.state.activation?.id ?? null}, 1, null, null)`.execute(
    transaction,
  );
  await sql`insert into playground.encounter_participants (encounter_id, account_id, side_id, unit_ids, admission_source)
    values (${id}::uuid, ${owner}::uuid, 'human', ${JSON.stringify(setup.units.map((unit) => unit.id))}::jsonb, 'fixture')`.execute(
    transaction,
  );
  for (const [ordinal, event] of started.events.entries()) {
    await sql`insert into playground.encounter_events (encounter_id, revision, ordinal, event_id, event)
      values (${id}::uuid, 0, ${ordinal}, ${`${id}:0:${ordinal}`}, ${JSON.stringify(event)}::json)`.execute(
      transaction,
    );
  }
  return id;
}

export async function readSandboxEncounter(
  database: Kysely<DatabaseSchema> | Transaction<DatabaseSchema>,
  sandboxId: string,
  scenario: PlaygroundScenario,
) {
  const row = (
    await sql<EncounterStoredRow>`select * from playground.encounters where sandbox_id = ${sandboxId}::uuid`.execute(
      database,
    )
  ).rows[0];
  if (!row) return null;
  const events = (
    await sql<{
      event: combat.CombatEvent;
    }>`select event from playground.encounter_events where encounter_id = ${row.id}::uuid order by revision, ordinal`.execute(
      database,
    )
  ).rows.map((item) => item.event);
  const commands = (
    await sql<{
      command: combat.CombatCommand;
    }>`select command from playground.encounter_commands where encounter_id = ${row.id}::uuid order by revision`.execute(
      database,
    )
  ).rows.map((item) => item.command);
  const receipts = (
    await sql<{
      response: unknown;
    }>`select response from playground.encounter_receipts where encounter_id = ${row.id}::uuid order by resulting_revision`.execute(
      database,
    )
  ).rows.map((item) => item.response);
  const rejections = (
    await sql<{
      response: unknown;
    }>`select response from playground.encounter_rejections where encounter_id = ${row.id}::uuid order by created_at, command_id`.execute(
      database,
    )
  ).rows.map((item) => item.response);
  // Both sides are controllable in a debug sandbox. No persisted actor is edited.
  const side =
    row.state.units.find((unit) => unit.id === row.state.activation?.unitId)?.sideId ?? 'human';
  return {
    row,
    commands,
    receipts,
    rejections,
    events,
    view: projectCombatLabView(row.id, side, row.state, events, scenario.initial),
  };
}

const digest = (state: combat.BattleState) =>
  createHash('sha256').update(combat.canonicalCombatState(state)).digest('hex');

export async function sandboxReplay(
  database: Kysely<DatabaseSchema>,
  sandboxId: string,
  scenario: PlaygroundScenario,
) {
  const stored = await database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute(async (transaction) => readSandboxEncounter(transaction, sandboxId, scenario));
  if (!stored || stored.row.setup.schemaVersion !== 2) throw new Error('SANDBOX_NOT_ACTIVE');
  const replay = {
    schemaVersion: 2 as const,
    setup: stored.row.setup,
    commands: stored.commands,
    contentRevision: PLAYGROUND_CONTENT_REVISION,
    labPresentation: createCombatLabPresentation(scenario.initial, stored.view.controlledSideId),
  };
  const expectedDigest = digest(stored.row.state);
  let actualDigest: string | null = null;
  try {
    actualDigest = digest(combat.replayCombat(replay).state);
  } catch {
    /* Report replay divergence rather than a successful reconstruction. */
  }
  const matches =
    expectedDigest === actualDigest &&
    (await verifyEncounterReplay(database, stored.row.id, 'playground'));
  return {
    matches,
    reason: matches
      ? null
      : actualDigest === null
        ? 'REPLAY_COMMAND_REJECTED'
        : expectedDigest !== actualDigest
          ? 'STATE_DIGEST_MISMATCH'
          : 'EVENT_OR_RECEIPT_MISMATCH',
    expectedDigest,
    actualDigest,
    rulesetId: stored.row.state.rulesetId,
    contentRevision: PLAYGROUND_CONTENT_REVISION,
    replay: { ...replay, finalDigest: expectedDigest },
  };
}

import { sql, type Kysely, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { lockCompanyAggregate } from '../company/repository.js';
import {
  applyFirstHuntTerminalEffectsInTransaction,
  TerminalAwaitingLeadershipChoice,
} from '../contracts/executor.js';
import { readFirstHuntTerminalLockSet } from '../contracts/repository.js';
import { readWorldClock } from '../world/clock.js';
import { prepareCompanyTerminalEvidence } from './executor.js';

interface PendingTerminal {
  readonly encounterId: string;
  readonly worldId: string;
  readonly terminalRevision: number;
}

async function readPendingTerminals(
  database: Kysely<DatabaseSchema>,
  limit: number,
): Promise<readonly PendingTerminal[]> {
  const result = await sql<{
    readonly encounter_id: string;
    readonly world_id: string;
    readonly terminal_revision: number;
  }>`
    select admission.encounter_id, admission.world_id, admission.terminal_revision
    from encounter_admissions as admission
    join encounters as encounter on encounter.id = admission.encounter_id
    where encounter.status = 'resolved'
      and admission.terminal_revision = encounter.revision
      and admission.effects_applied_at is null
      and admission.effects_source_id is null
    order by encounter.created_at asc, admission.encounter_id asc
    limit ${limit}
  `.execute(database);
  return result.rows.map((row) => ({
    encounterId: row.encounter_id,
    worldId: row.world_id,
    terminalRevision: row.terminal_revision,
  }));
}

async function applyOne(
  transaction: Transaction<DatabaseSchema>,
  terminal: PendingTerminal,
): Promise<boolean> {
  const lockSet = await readFirstHuntTerminalLockSet(transaction, {
    worldId: terminal.worldId,
    encounterId: terminal.encounterId,
  });
  if (lockSet === undefined || lockSet.companyIds.length !== lockSet.accountIds.length)
    return false;

  const lockedAccounts = await transaction
    .selectFrom('identity_accounts')
    .select('id')
    .where('id', 'in', [...lockSet.accountIds])
    .orderBy('id', 'asc')
    .forUpdate()
    .execute();
  if (lockedAccounts.length !== lockSet.accountIds.length) return false;

  const ownedCompanies = await transaction
    .selectFrom('company_account_owners')
    .select(['company_id', 'account_id'])
    .where('world_id', '=', lockSet.worldId)
    .where('company_id', 'in', [...lockSet.companyIds])
    .orderBy('company_id', 'asc')
    .forUpdate()
    .execute();
  if (
    ownedCompanies.length !== lockSet.companyIds.length ||
    lockSet.companyIds.some(
      (companyId) => !ownedCompanies.some((owner) => owner.company_id === companyId),
    ) ||
    lockSet.accountIds.some(
      (accountId) => !ownedCompanies.some((owner) => owner.account_id === accountId),
    )
  )
    return false;

  for (const companyId of lockSet.companyIds) {
    if (!(await lockCompanyAggregate(transaction, lockSet.worldId, companyId))) return false;
  }
  await transaction
    .selectFrom('world_party_routes')
    .select('party_id')
    .where('world_id', '=', lockSet.worldId)
    .where('company_id', 'in', [...lockSet.companyIds])
    .orderBy('party_id', 'asc')
    .forUpdate()
    .execute();
  await readWorldClock(transaction, lockSet.worldId, new Date(), true);

  const world = await transaction
    .selectFrom('world_first_hunt_state')
    .select('world_id')
    .where('world_id', '=', lockSet.worldId)
    .forUpdate()
    .executeTakeFirst();
  if (world === undefined) return false;

  const contract = await transaction
    .selectFrom('contract_instances')
    .select('instance_id')
    .where('world_id', '=', lockSet.worldId)
    .where('instance_id', '=', lockSet.instanceId)
    .forUpdate()
    .executeTakeFirst();
  if (contract === undefined) return false;

  const rechecked = await readFirstHuntTerminalLockSet(transaction, {
    worldId: terminal.worldId,
    encounterId: terminal.encounterId,
  });
  if (
    rechecked === undefined ||
    rechecked.companyIds.join('\0') !== lockSet.companyIds.join('\0') ||
    rechecked.accountIds.join('\0') !== lockSet.accountIds.join('\0')
  )
    return false;

  await applyFirstHuntTerminalEffectsInTransaction(transaction, {
    worldId: terminal.worldId,
    encounterId: terminal.encounterId,
    terminalRevision: terminal.terminalRevision,
    prepareCompanyTerminalEvidence,
  });
  return true;
}

/** Recover and apply committed V2 terminal outcomes, including after a process restart. */
export async function applyPendingFirstHuntTerminalEffects(
  database: Kysely<DatabaseSchema>,
  limit = 16,
): Promise<readonly string[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new TypeError('Terminal effects batch size is outside its bound');
  const pending = await readPendingTerminals(database, limit);
  const applied: string[] = [];
  for (const terminal of pending) {
    let acknowledged: boolean;
    try {
      acknowledged = await database
        .transaction()
        .execute((transaction) => applyOne(transaction, terminal));
    } catch (error) {
      // Rolled back unchanged; retried once the owner records a successor.
      if (error instanceof TerminalAwaitingLeadershipChoice) continue;
      throw error;
    }
    if (acknowledged) applied.push(terminal.encounterId);
  }
  return applied;
}

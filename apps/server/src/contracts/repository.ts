import type { FirstHuntCommandResponseDto } from '@warwrit/protocol';
import { sql, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { FIRST_HUNT_INSTANCE_ID, FIRST_HUNT_PROFILE_ID } from '@warwrit/game-core';
import { canonicalJson, readCompanyCombatAggregateState } from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import { FIRST_HUNT_TERMS } from './first-hunt-runtime.js';

export interface FirstHuntTerminalLockSet {
  readonly worldId: string;
  readonly instanceId: typeof FIRST_HUNT_INSTANCE_ID;
  readonly encounterId: string;
  readonly companyIds: readonly string[];
  readonly accountIds: readonly string[];
}

/** Read the immutable participant scope needed to acquire earlier-ranked locks. */
export async function readFirstHuntTerminalLockSet(
  transaction: Transaction<DatabaseSchema>,
  input: { readonly worldId: string; readonly encounterId: string },
): Promise<FirstHuntTerminalLockSet | undefined> {
  const admission = await transaction
    .selectFrom('encounter_admissions')
    .select(['world_id', 'instance_id', 'binding'])
    .where('world_id', '=', input.worldId)
    .where('encounter_id', '=', input.encounterId)
    .executeTakeFirst();
  if (
    !admission ||
    admission.instance_id !== FIRST_HUNT_INSTANCE_ID ||
    !isRecord(admission.binding) ||
    admission.binding['worldId'] !== input.worldId ||
    admission.binding['version'] !== 's02-encounter-binding-2' ||
    !Array.isArray(admission.binding['participants'])
  )
    return undefined;

  // Participants are per character; a company with several members appears several times.
  const participantCompanyIds = admission.binding['participants'].map((entry) =>
    isRecord(entry) && typeof entry['companyId'] === 'string' ? entry['companyId'] : '',
  );
  const companyIds = [...new Set(participantCompanyIds)];
  if (
    companyIds.length === 0 ||
    companyIds.length > 2 ||
    participantCompanyIds.some((id) => id.length === 0)
  )
    return undefined;

  const owners = await transaction
    .selectFrom('company_account_owners')
    .select(['company_id', 'account_id'])
    .where('world_id', '=', input.worldId)
    .where('company_id', 'in', companyIds)
    .orderBy('company_id', 'asc')
    .execute();
  if (
    owners.length !== companyIds.length ||
    new Set(owners.map((owner) => owner.account_id)).size !== owners.length
  )
    return undefined;
  return {
    worldId: input.worldId,
    instanceId: FIRST_HUNT_INSTANCE_ID,
    encounterId: input.encounterId,
    companyIds: [...companyIds].toSorted(compareCodeUnits),
    accountIds: owners.map((owner) => owner.account_id).toSorted(compareCodeUnits),
  };
}

export async function readFirstHuntRouteMembership(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  lock = true,
): Promise<{ readonly termsDigest: string } | undefined> {
  let query = transaction
    .selectFrom('contract_instances')
    .select(['profile_id', 'terms', 'terms_digest', 'owner_company_id', 'helper_company_id'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', FIRST_HUNT_INSTANCE_ID);
  if (lock) query = query.forUpdate();
  const row = await query.executeTakeFirst();
  if (
    !row ||
    row.profile_id !== FIRST_HUNT_PROFILE_ID ||
    canonicalJson(row.terms) !== canonicalJson(FIRST_HUNT_TERMS) ||
    (row.owner_company_id !== companyId && row.helper_company_id !== companyId)
  )
    return undefined;
  return { termsDigest: row.terms_digest.toString('hex') };
}

/** Exact replay reads from the shared company receipt namespace. */
export async function readFirstHuntReceipt(
  transaction: Transaction<DatabaseSchema>,
  input: { readonly worldId: string; readonly companyId: string; readonly commandId: string },
) {
  return transaction
    .selectFrom('company_receipts')
    .select(['request_key', 'response'])
    .where('world_id', '=', input.worldId)
    .where('company_id', '=', input.companyId)
    .where('command_id', '=', input.commandId)
    .executeTakeFirst();
}

/**
 * Persist a contract transition receipt without inventing an economy command.
 * The caller owns the surrounding transaction and must already hold the company root lock.
 */
export async function persistFirstHuntReceipt(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly worldId: string;
    readonly companyId: string;
    readonly commandId: string;
    readonly receiptId: string;
    readonly requestKey: string;
    readonly response: Extract<FirstHuntCommandResponseDto, { ok: true }>;
    readonly expectedCanonicalRevision: string;
  },
): Promise<void> {
  const snapshot = await transaction
    .selectFrom('company_snapshots')
    .select('canonical_revision')
    .where('world_id', '=', input.worldId)
    .where('company_id', '=', input.companyId)
    .forUpdate()
    .executeTakeFirst();
  if (!snapshot || snapshot.canonical_revision !== input.expectedCanonicalRevision)
    throw new TypeError('FIRST HUNT receipt root revision is stale');

  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: input.worldId,
      company_id: input.companyId,
      receipt_id: input.receiptId,
      command_id: input.commandId,
      source_key: null,
      request_key: input.requestKey,
      response: input.response,
      resulting_revision: input.expectedCanonicalRevision,
    })
    .execute();
}

/** Persist a binding-only aggregate transition without fabricating an economy command. */
export async function persistFirstHuntBinding(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly previous: CompanyCombatAggregateState;
    readonly next: CompanyCombatAggregateState;
    readonly encounterId: string;
    readonly bindingId: string;
  },
): Promise<void> {
  const previous = readCompanyCombatAggregateState(input.previous);
  const next = readCompanyCombatAggregateState(input.next);
  const lifecycle = next.economy.lifecycle;
  if (
    previous.economy.lifecycle.worldId !== lifecycle.worldId ||
    previous.economy.lifecycle.companyId !== lifecycle.companyId ||
    previous.economy.lifecycle.revision !== lifecycle.revision ||
    previous.economy.lifecycle.knowledge.revision !== lifecycle.knowledge.revision ||
    next.encounter.active?.binding.bindingId !== input.bindingId ||
    next.encounter.active.binding.setup.battleId !== input.encounterId
  )
    throw new TypeError('FIRST HUNT binding must preserve the company revision');

  const commandId = `first-hunt-binding-${input.encounterId}-${lifecycle.companyId}`;
  const receiptId = `first-hunt-binding-receipt-${input.encounterId}-${lifecycle.companyId}`;
  const requestKey = canonicalJson({
    type: 'FIRST_HUNT_BINDING',
    schemaVersion: 1,
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    encounterId: input.encounterId,
    bindingId: input.bindingId,
  });
  const updated = await transaction
    .updateTable('company_snapshots')
    .set({ state: next, updated_at: sql<Date>`now()` })
    .where('world_id', '=', lifecycle.worldId)
    .where('company_id', '=', lifecycle.companyId)
    .where('canonical_revision', '=', lifecycle.revision)
    .where('public_revision', '=', lifecycle.knowledge.revision)
    .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1) throw new Error('FIRST HUNT binding root CAS failed');

  await transaction
    .insertInto('company_receipts')
    .values({
      world_id: lifecycle.worldId,
      company_id: lifecycle.companyId,
      receipt_id: receiptId,
      command_id: commandId,
      source_key: null,
      request_key: requestKey,
      response: {
        schemaVersion: 1,
        type: 'FIRST_HUNT_BINDING',
        encounterId: input.encounterId,
        bindingId: input.bindingId,
      },
      resulting_revision: lifecycle.revision,
    })
    .execute();
  await transaction
    .insertInto('company_audit_events')
    .values({
      world_id: lifecycle.worldId,
      company_id: lifecycle.companyId,
      revision: lifecycle.revision,
      event_id: `${commandId}:activated`,
      event: {
        schemaVersion: 1,
        type: 'FirstHuntEncounterBound',
        encounterId: input.encounterId,
        bindingId: input.bindingId,
      },
    })
    .execute();
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

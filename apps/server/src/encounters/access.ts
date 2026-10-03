import * as combat from '@warwrit/game-core';
import type {
  EncounterActiveDto,
  EncounterControlGrantDto,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';
import { isEncounterId } from '@warwrit/protocol';
import { sql, type Kysely, type Transaction } from 'kysely';

import { loadCompanyAggregate } from '../company/repository.js';
import type { DatabaseSchema } from '../db/database.js';
import { verifyEncounterReplayRow, type EncounterStoredRow } from './executor.js';

interface OwnedCompany {
  readonly worldId: string;
  readonly companyId: string;
}

export class InconsistentActiveEncounterError extends Error {
  constructor() {
    super('Owned active encounter binding is inconsistent');
  }
}

export interface EncounterAccess {
  readonly projection: EncounterPublicProjectionDto;
  readonly controlGrant: EncounterControlGrantDto;
}

interface ParticipantRow {
  readonly account_id: string;
  readonly side_id: string;
  readonly unit_ids: unknown;
  readonly admission_source: 'fixture' | 'company_binding';
  readonly afk?: boolean;
  readonly resume_requested_after_epoch?: number | null;
}

interface BoundParticipant {
  readonly companyId: string;
  readonly sideId: string;
  readonly unitIds: readonly string[];
}

export function toEncounterPublicProjection(
  encounter: EncounterStoredRow,
): EncounterPublicProjectionDto {
  const activation = encounter.state.activation;
  return {
    version: 1,
    encounterId: encounter.id,
    revision: encounter.revision,
    status: encounter.status,
    round: encounter.state.round,
    activationId: activation?.id ?? null,
    actorUnitId: activation?.unitId ?? null,
    deadlineAt: encounter.deadline_at?.toISOString() ?? null,
    map: {
      hexes: encounter.setup.map.hexes.toSorted(combat.compareHex).map(({ q, r }) => ({ q, r })),
      blocked: encounter.setup.map.blocked
        .toSorted(combat.compareHex)
        .map(({ q, r }) => ({ q, r })),
    },
    units: encounter.state.units.map((unit) => ({
      id: unit.id,
      sideId: unit.sideId,
      q: unit.position.q,
      r: unit.position.r,
      health: unit.health,
      status: unit.status,
    })),
  };
}

function controlGrant(
  encounter: EncounterStoredRow,
  participant: Pick<ParticipantRow, 'unit_ids' | 'afk' | 'resume_requested_after_epoch'>,
): EncounterControlGrantDto | undefined {
  if (
    !Array.isArray(participant.unit_ids) ||
    participant.unit_ids.length === 0 ||
    !participant.unit_ids.every((unitId) => typeof unitId === 'string') ||
    new Set(participant.unit_ids).size !== participant.unit_ids.length ||
    (participant.afk !== undefined && typeof participant.afk !== 'boolean') ||
    (participant.resume_requested_after_epoch !== undefined &&
      participant.resume_requested_after_epoch !== null &&
      (!Number.isSafeInteger(participant.resume_requested_after_epoch) ||
        participant.resume_requested_after_epoch < 0))
  )
    return undefined;
  return {
    version: 1,
    encounterId: encounter.id,
    revision: encounter.revision,
    controllableUnitIds: [...participant.unit_ids],
    ...(typeof participant.afk === 'boolean' ? { selfAfk: participant.afk } : {}),
    ...(participant.resume_requested_after_epoch === null ||
    Number.isSafeInteger(participant.resume_requested_after_epoch)
      ? { resumeRequestedAfterEpoch: participant.resume_requested_after_epoch }
      : {}),
  };
}

function bindingParticipants(
  binding: combat.FrozenEncounterBinding,
): readonly BoundParticipant[] | undefined {
  const byCompany = new Map<string, { sideId: string; unitIds: string[] }>();
  const seenUnits = new Set<string>();
  for (const participant of binding.participants) {
    if (seenUnits.has(participant.unitId)) return undefined;
    seenUnits.add(participant.unitId);
    const existing = byCompany.get(participant.companyId);
    if (existing !== undefined && existing.sideId !== participant.sideId) return undefined;
    const group = existing ?? { sideId: participant.sideId, unitIds: [] };
    group.unitIds.push(participant.unitId);
    byCompany.set(participant.companyId, group);
  }
  return [...byCompany.entries()].map(([companyId, group]) => ({
    companyId,
    sideId: group.sideId,
    unitIds: group.unitIds,
  }));
}

function sameBinding(
  state: combat.CompanyCombatAggregateState,
  binding: combat.FrozenEncounterBinding,
): boolean {
  const active = state.encounter.active;
  return (
    active !== null &&
    active.bindingDigest === combat.canonicalJson(binding) &&
    combat.canonicalJson(active.binding) === combat.canonicalJson(binding)
  );
}

async function encounterRow(
  transaction: Transaction<DatabaseSchema>,
  encounterId: string,
): Promise<EncounterStoredRow | undefined> {
  const result = await sql<EncounterStoredRow>`
    select id, schema_version, setup, state, revision, status,
      activation_id, activation_epoch, deadline_at, ai_wake_at
    from encounters where id = ${encounterId}
  `.execute(transaction);
  return result.rows[0];
}

async function ownedCompany(
  transaction: Transaction<DatabaseSchema>,
  accountId: string,
): Promise<OwnedCompany | undefined> {
  const rows = await transaction
    .selectFrom('company_account_owners')
    .select(['world_id', 'company_id'])
    .where('account_id', '=', accountId)
    .execute();
  if (rows.length > 1) throw new InconsistentActiveEncounterError();
  const row = rows[0];
  return row === undefined ? undefined : { worldId: row.world_id, companyId: row.company_id };
}

async function fixtureAccess(
  transaction: Transaction<DatabaseSchema>,
  encounter: EncounterStoredRow,
  participant: ParticipantRow,
): Promise<EncounterAccess | undefined> {
  if (
    participant.admission_source !== 'fixture' ||
    typeof participant.side_id !== 'string' ||
    !Array.isArray(participant.unit_ids) ||
    participant.unit_ids.length === 0 ||
    !participant.unit_ids.every(
      (unitId) =>
        typeof unitId === 'string' &&
        encounter.setup.units.some(
          (unit) => unit.id === unitId && unit.sideId === participant.side_id,
        ),
    ) ||
    new Set(participant.unit_ids).size !== participant.unit_ids.length ||
    !(await verifyEncounterReplayRow(transaction, encounter))
  )
    return undefined;
  const grant = controlGrant(encounter, participant);
  return grant === undefined
    ? undefined
    : { projection: toEncounterPublicProjection(encounter), controlGrant: grant };
}

async function companyBindingAccess(
  transaction: Transaction<DatabaseSchema>,
  encounter: EncounterStoredRow,
  accountId: string,
  companyId: string,
  binding: combat.FrozenEncounterBinding,
): Promise<EncounterAccess | undefined> {
  if (
    encounter.schema_version !== combat.COMBAT_V2_SCHEMA_VERSION ||
    encounter.setup.schemaVersion !== combat.COMBAT_V2_SCHEMA_VERSION ||
    encounter.id !== binding.setup.battleId ||
    combat.canonicalJson(encounter.setup) !== combat.canonicalJson(binding.setup)
  )
    return undefined;

  const expectedParticipants = bindingParticipants(binding);
  if (
    expectedParticipants === undefined ||
    !expectedParticipants.some((entry) => entry.companyId === companyId) ||
    !(await verifyEncounterReplayRow(transaction, encounter))
  )
    return undefined;

  const storedResult = await sql<ParticipantRow>`
    select account_id, side_id, unit_ids, admission_source, afk,
      resume_requested_after_epoch
    from encounter_participants where encounter_id = ${encounter.id}
    order by account_id asc
  `.execute(transaction);
  const storedByAccount = new Map(storedResult.rows.map((row) => [row.account_id, row]));
  const owners = await transaction
    .selectFrom('company_account_owners')
    .select(['account_id', 'company_id'])
    .where('world_id', '=', binding.worldId)
    .where(
      'company_id',
      'in',
      expectedParticipants.map((entry) => entry.companyId),
    )
    .execute();
  if (
    owners.length !== expectedParticipants.length ||
    storedResult.rows.length !== expectedParticipants.length
  )
    return undefined;

  let requestedGrant: EncounterControlGrantDto | undefined;
  const participantAccounts = new Set<string>();
  for (const expected of expectedParticipants) {
    const owner = owners.find((entry) => entry.company_id === expected.companyId);
    if (owner === undefined || participantAccounts.has(owner.account_id)) return undefined;
    participantAccounts.add(owner.account_id);
    const stored = storedByAccount.get(owner.account_id);
    if (
      stored === undefined ||
      stored.admission_source !== 'company_binding' ||
      stored.side_id !== expected.sideId ||
      combat.canonicalJson(stored.unit_ids) !== combat.canonicalJson(expected.unitIds)
    )
      return undefined;

    let root: combat.CompanyCombatAggregateState | undefined;
    try {
      root = await loadCompanyAggregate(transaction, binding.worldId, expected.companyId);
    } catch {
      return undefined;
    }
    if (root === undefined || !sameBinding(root, binding)) return undefined;

    if (owner.account_id === accountId && expected.companyId === companyId) {
      requestedGrant = controlGrant(encounter, stored);
    }
  }
  if (requestedGrant === undefined) return undefined;
  return { projection: toEncounterPublicProjection(encounter), controlGrant: requestedGrant };
}

async function accessInTransaction(
  transaction: Transaction<DatabaseSchema>,
  accountId: string,
  encounterId: string,
  fixtureAdmission: boolean,
): Promise<EncounterAccess | undefined> {
  const encounter = await encounterRow(transaction, encounterId);
  if (encounter === undefined) return undefined;
  const participantResult = await sql<ParticipantRow>`
    select account_id, side_id, unit_ids, admission_source, afk,
      resume_requested_after_epoch
    from encounter_participants
    where encounter_id = ${encounterId} and account_id = ${accountId}
  `.execute(transaction);
  const participant = participantResult.rows[0];
  if (participant === undefined) return undefined;
  if (participant.admission_source === 'fixture') {
    return fixtureAdmission ? fixtureAccess(transaction, encounter, participant) : undefined;
  }

  let owner: OwnedCompany | undefined;
  try {
    owner = await ownedCompany(transaction, accountId);
  } catch {
    return undefined;
  }
  if (owner === undefined) return undefined;
  let root: combat.CompanyCombatAggregateState | undefined;
  try {
    root = await loadCompanyAggregate(transaction, owner.worldId, owner.companyId);
  } catch {
    return undefined;
  }
  const active = root?.encounter.active;
  if (
    root === undefined ||
    active == null ||
    active.binding.worldId !== owner.worldId ||
    active.binding.setup.battleId !== encounterId
  )
    return undefined;
  try {
    return await companyBindingAccess(
      transaction,
      encounter,
      accountId,
      owner.companyId,
      active.binding,
    );
  } catch {
    return undefined;
  }
}

export function readEncounterAccess(
  database: Kysely<DatabaseSchema>,
  accountId: string,
  encounterId: string,
  fixtureAdmission = false,
): Promise<EncounterAccess | undefined> {
  return database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute((transaction) =>
      accessInTransaction(transaction, accountId, encounterId, fixtureAdmission),
    );
}

export function readActiveEncounter(
  database: Kysely<DatabaseSchema>,
  accountId: string,
): Promise<EncounterActiveDto> {
  return database
    .transaction()
    .setIsolationLevel('repeatable read')
    .execute(async (transaction) => {
      let owner: OwnedCompany | undefined;
      try {
        owner = await ownedCompany(transaction, accountId);
      } catch {
        throw new InconsistentActiveEncounterError();
      }
      if (owner === undefined) return { version: 1, encounterId: null };

      let root: combat.CompanyCombatAggregateState | undefined;
      try {
        root = await loadCompanyAggregate(transaction, owner.worldId, owner.companyId);
      } catch {
        throw new InconsistentActiveEncounterError();
      }
      if (root === undefined) throw new InconsistentActiveEncounterError();
      const active = root.encounter.active;
      if (active === null) return { version: 1, encounterId: null };
      const encounterId = active.binding.setup.battleId;
      if (!isEncounterId(encounterId)) throw new InconsistentActiveEncounterError();
      const encounter = await encounterRow(transaction, encounterId);
      let access: EncounterAccess | undefined;
      try {
        access =
          encounter === undefined
            ? undefined
            : await companyBindingAccess(
                transaction,
                encounter,
                accountId,
                owner.companyId,
                active.binding,
              );
      } catch {
        access = undefined;
      }
      if (access === undefined) throw new InconsistentActiveEncounterError();
      return { version: 1, encounterId };
    });
}

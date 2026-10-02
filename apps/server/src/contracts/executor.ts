import { createHash } from 'node:crypto';
import {
  canPerform,
  campaignTick,
  canonicalRevision,
  canonicalJson,
  canonicalStateJson,
  COMBAT_V2_SCHEMA_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  FIRST_HUNT_ENCOUNTER_LOCATION,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_PROFILE_ID,
  FIRST_HUNT_PROOF_DEFINITION_ID,
  FIRST_HUNT_PROOF_ID,
  FIRST_HUNT_PRACTICE_PROFILE_ID,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  parseCompanyCommand,
  PHYSICAL_POLICY_VERSION,
  prepareConsumeCombatAggregate,
  prepareFinalizeCombatAggregate,
  prepareCompanyEconomy,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  BattleSetupV2,
  BattleState,
  CompanyCombatAggregateState,
  ConsumeCombatAggregateInput,
  FinalizeCombatAggregateInput,
  ItemAccessEvidence,
  LootAuthorizationEvidence,
  PhysicalContainer,
} from '@warwrit/game-core';
import type { FirstHuntCommandDto } from '@warwrit/protocol';
import { sql, type Transaction } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { verifyEncounterReplayRow, type EncounterStoredRow } from '../encounters/executor.js';
import {
  firstHuntTerminalReceiptIdentity,
  lockCompanyAggregate,
  persistFirstHuntTerminalCompanyTransition,
} from '../company/repository.js';
import { readFirstHuntTerminalLockSet } from './repository.js';
import {
  TerminalAwaitingLeadershipChoice,
  type FirstHuntTerminalEvidence,
  type PrepareFirstHuntTerminalEvidence,
} from './terminal-evidence-types.js';
import {
  FIRST_HUNT_TERMS,
  readFirstHuntWorldState,
  type FirstHuntHostileState,
} from './first-hunt-runtime.js';

const COMPANY_SIDE_ID = 'first-hunt-companies';
const HOSTILE_SIDE_ID = 'first-hunt-hostiles';
const GROUND_CONTAINER_ID = 'first-hunt-ground-proof';

export function canFirstHuntHelperOptIn(hasAdmission: boolean): boolean {
  return !hasAdmission;
}

export function canFirstHuntParticipantLeave(input: {
  readonly admission:
    | {
        readonly terminalRevision: number | null;
        readonly effectsSourceId: string | null;
        readonly effectsAppliedAt: Date | null;
      }
    | undefined;
  readonly encounterStatus: 'active' | 'resolved' | undefined;
  readonly encounterRevision: number | undefined;
  readonly expectedEffectsSourceId: string | undefined;
}): boolean {
  if (input.admission === undefined) return true;
  return (
    input.encounterStatus === 'resolved' &&
    input.encounterRevision !== undefined &&
    input.admission.terminalRevision === input.encounterRevision &&
    input.expectedEffectsSourceId !== undefined &&
    input.admission.effectsSourceId === input.expectedEffectsSourceId &&
    input.admission.effectsAppliedAt !== null
  );
}

export function resolveFirstHuntTerminalDisposition(input: {
  readonly effectsAppliedAt: Date | null;
  readonly effectsSourceId: string | null;
  readonly requestedSourceId: string;
  readonly admittedCompanyIds: readonly string[];
  readonly ownerCompanyId: string;
  readonly helperCompanyId: string | null;
}): 'REPLAY' | 'APPLY' {
  if (input.effectsAppliedAt !== null || input.effectsSourceId !== null) {
    if (input.effectsAppliedAt !== null && input.effectsSourceId === input.requestedSourceId)
      return 'REPLAY';
    throw new TypeError('FIRST HUNT terminal effects were acknowledged for another revision');
  }

  const contractCompanyIds = [
    input.ownerCompanyId,
    ...(input.helperCompanyId === null ? [] : [input.helperCompanyId]),
  ].toSorted(compareIds);
  const admittedCompanyIds = [...input.admittedCompanyIds].toSorted(compareIds);
  if (
    !admittedCompanyIds.includes(input.ownerCompanyId) ||
    canonicalJson(admittedCompanyIds) !== canonicalJson(contractCompanyIds)
  )
    throw new TypeError('FIRST HUNT admission companies do not match the accepted contract');
  return 'APPLY';
}

export function isFirstHuntTerminalReceiptCurrentOrAncestor(input: {
  readonly receiptId: unknown;
  readonly expectedReceiptId: string;
  readonly commandId: unknown;
  readonly expectedCommandId: string;
  readonly resultingRevision: unknown;
  readonly currentRevision: string;
  readonly response: unknown;
}): boolean {
  if (
    input.receiptId !== input.expectedReceiptId ||
    input.commandId !== input.expectedCommandId ||
    typeof input.resultingRevision !== 'string' ||
    !isRevision(input.resultingRevision) ||
    !isRevision(input.currentRevision) ||
    !isRecord(input.response)
  )
    return false;
  return (
    input.response['type'] === 'FIRST_HUNT_TERMINAL' &&
    input.response['commandId'] === input.expectedCommandId &&
    input.response['receiptId'] === input.expectedReceiptId &&
    input.response['resultingRevision'] === input.resultingRevision &&
    BigInt(input.resultingRevision) <= BigInt(input.currentRevision)
  );
}

export function isFirstHuntProofCustodian(
  authenticatedCompanyId: string,
  custodianCompanyId: string | null,
): boolean {
  return custodianCompanyId === authenticatedCompanyId;
}

export type FirstHuntPickupPreparation =
  | { readonly kind: 'PREPARED'; readonly next: CompanyCombatAggregateState }
  | { readonly kind: 'REJECTED'; readonly code: 'CAPACITY' | 'NOT_AVAILABLE' };

/** Prepare a real Company physical reducer transfer from the server-owned ground proof. */
export function prepareFirstHuntProofPickup(input: {
  readonly previous: CompanyCombatAggregateState;
  readonly accountId: string;
  readonly request: Extract<FirstHuntCommandDto, { readonly type: 'PICKUP' }>;
  readonly worldId: string;
  readonly campaignTick: string;
  readonly encounterId: string;
  readonly groundItem: unknown;
}): FirstHuntPickupPreparation {
  const previous = readCompanyCombatAggregateState(input.previous);
  const lifecycle = previous.economy.lifecycle;
  const physical = previous.economy.physical;
  if (!physical || lifecycle.worldId !== input.worldId || previous.encounter.active !== null)
    return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };

  const sourceId = `encounter:${input.encounterId}:terminal`;
  const groundItem = createGroundProof(input.worldId, sourceId);
  if (
    canonicalJson(input.groundItem) !== canonicalJson(groundItem) ||
    physical.items.some((item) => item.itemId === FIRST_HUNT_PROOF_ID) ||
    physical.containers.some((container) => container.containerId === GROUND_CONTAINER_ID)
  )
    return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };

  const location = { kind: 'AT' as const, ...FIRST_HUNT_ENCOUNTER_LOCATION };
  const target = physical.containers.find(
    (container) => container.containerId === input.request.payload.toContainerId,
  );
  const lifecycleCharacters = lifecycle.characters;
  const activeCharacterIds = new Set<string>(
    lifecycle.memberships
      .filter((membership) => membership.endedAt === null)
      .map((membership) => String(membership.characterId)),
  );
  const targetOwned =
    target &&
    ((target.custodian.kind === 'COMPANY' && target.custodian.id === lifecycle.companyId) ||
      (target.custodian.kind === 'CHARACTER' && activeCharacterIds.has(target.custodian.id)));
  const operator = lifecycleCharacters
    .filter(
      (character) =>
        character.presence.availability === 'AVAILABLE' &&
        character.presence.encounterBindingId === null &&
        character.presence.location.kind === 'AT' &&
        character.presence.location.siteId === location.siteId &&
        character.presence.location.areaId === location.areaId &&
        canPerform(character, 'travel'),
    )
    .toSorted((left, right) =>
      compareIds(left.identity.characterId, right.identity.characterId),
    )[0];
  if (
    !target ||
    !targetOwned ||
    target.access !== 'COMPANY' ||
    target.closed !== null ||
    (target.kind !== 'CARRIED' && target.kind !== 'PARTY_SUPPLY' && target.kind !== 'STATIC') ||
    target.location.kind !== 'AT' ||
    target.location.siteId !== location.siteId ||
    target.location.areaId !== location.areaId ||
    !operator
  )
    return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };

  const groundContainer: PhysicalContainer = {
    containerId: GROUND_CONTAINER_ID,
    kind: 'GROUND_BUNDLE',
    location,
    custodian: { kind: 'WORLD', id: input.worldId },
    carrier: null,
    capacityG: 1000,
    access: 'CUSTODIAN',
    closed: null,
  };
  const withGround = readCompanyCombatAggregateState({
    ...previous,
    economy: {
      ...previous.economy,
      physical: {
        ...physical,
        containers: [...physical.containers, groundContainer],
        items: [...physical.items, groundItem],
      },
    },
  });
  const sourceEventId = `first-hunt:${hashId([input.worldId, input.encounterId, input.request.commandId])}`;
  const factScope = {
    companyId: lifecycle.companyId,
    worldId: input.worldId,
    revision: canonicalRevision(lifecycle.revision),
    sourceEventId,
    atTick: campaignTick(input.campaignTick),
    ordinal: 0,
    version: PHYSICAL_POLICY_VERSION,
  };
  const access: ItemAccessEvidence = {
    ...factScope,
    id: `first-hunt-access-${hashId([input.worldId, input.encounterId, input.request.commandId])}`,
    kind: 'ITEM_ACCESS',
    operatorId: operator.identity.characterId,
    location,
    containerIds: [GROUND_CONTAINER_ID, target.containerId],
    itemIds: [FIRST_HUNT_PROOF_ID],
    purpose: 'LOOT',
  };
  const authorization: LootAuthorizationEvidence = {
    ...factScope,
    // One claim per terminal outcome: the authorization's source is that outcome.
    sourceEventId: sourceId,
    id: `first-hunt-loot-${hashId([input.worldId, input.encounterId, input.request.commandId])}`,
    kind: 'LOOT_AUTHORIZATION',
    outcomeId: sourceId,
    itemIds: [FIRST_HUNT_PROOF_ID],
    fromContainerIds: [GROUND_CONTAINER_ID],
    ownerAfter: { kind: 'COMPANY', id: lifecycle.companyId },
  };
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: input.request.commandId,
    worldId: input.worldId,
    companyId: lifecycle.companyId,
    actorRef: { kind: 'PLAYER', id: input.accountId },
    expectedRevision: lifecycle.knowledge.revision,
    campaignTick: campaignTick(input.campaignTick),
    rulesetId: COMPANY_RULESET_ID,
    type: 'ClaimLoot',
    payload: {
      outcomeId: sourceId,
      itemQuantities: [{ itemId: FIRST_HUNT_PROOF_ID, quantity: 1 }],
      toContainerId: target.containerId,
      accessEvidenceId: access.id,
      claimAuthorizationId: authorization.id,
    },
  });
  if (!parsed.ok) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const prepared = prepareCompanyEconomy(withGround.economy, parsed.command, {
    worldId: input.worldId,
    companyId: lifecycle.companyId,
    principal: { kind: 'PLAYER', id: input.accountId },
    publicRevision: lifecycle.knowledge.revision,
    canonicalRevision: lifecycle.revision,
    atTick: campaignTick(input.campaignTick),
    completeGraph: true,
    contactIds: [operator.identity.characterId],
    facts: [],
    financeFacts: [],
    physicalFacts: [access, authorization],
    practiceFacts: [],
  });
  if (prepared.kind !== 'PREPARED' || prepared.replayed)
    return {
      kind: 'REJECTED',
      code:
        prepared.kind === 'REJECTED' && prepared.error === 'CAPACITY'
          ? 'CAPACITY'
          : 'NOT_AVAILABLE',
    };
  const nextPhysical = prepared.next.physical;
  if (!nextPhysical) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const next = readCompanyCombatAggregateState({
    ...withGround,
    economy: {
      ...prepared.next,
      physical: {
        ...nextPhysical,
        containers: nextPhysical.containers.filter(
          (container) => container.containerId !== GROUND_CONTAINER_ID,
        ),
        knowledge: {
          ...nextPhysical.knowledge,
          containerSnapshots: nextPhysical.knowledge.containerSnapshots.filter(
            (container) => container.containerId !== GROUND_CONTAINER_ID,
          ),
        },
      },
    },
  });
  return { kind: 'PREPARED', next };
}

/** Apply the resolved encounter's durable world/proof effects in its caller-owned transaction. */
export async function applyFirstHuntTerminalEffectsInTransaction(
  transaction: Transaction<DatabaseSchema>,
  input: {
    readonly worldId: string;
    readonly encounterId: string;
    readonly terminalRevision: number;
    readonly prepareCompanyTerminalEvidence: PrepareFirstHuntTerminalEvidence;
  },
): Promise<void> {
  const lockSet = await readFirstHuntTerminalLockSet(transaction, {
    worldId: input.worldId,
    encounterId: input.encounterId,
  });
  if (lockSet === undefined) throw new TypeError('FIRST HUNT terminal lock set is unavailable');
  const accounts = await transaction
    .selectFrom('identity_accounts')
    .select('id')
    .where('id', 'in', [...lockSet.accountIds])
    .orderBy('id', 'asc')
    .forUpdate()
    .execute();
  if (accounts.length !== lockSet.accountIds.length)
    throw new TypeError('FIRST HUNT terminal account ownership is unavailable');
  const owners = await transaction
    .selectFrom('company_account_owners')
    .select(['company_id', 'account_id'])
    .where('world_id', '=', input.worldId)
    .where('company_id', 'in', [...lockSet.companyIds])
    .orderBy('company_id', 'asc')
    .forUpdate()
    .execute();
  if (
    owners.length !== lockSet.companyIds.length ||
    lockSet.companyIds.some(
      (companyId) => !owners.some((owner) => owner.company_id === companyId),
    ) ||
    lockSet.accountIds.some((accountId) => !owners.some((owner) => owner.account_id === accountId))
  )
    throw new TypeError('FIRST HUNT terminal company ownership changed');
  const previousByCompany = new Map<string, CompanyCombatAggregateState>();
  for (const companyId of lockSet.companyIds) {
    const previous = await lockCompanyAggregate(transaction, input.worldId, companyId);
    if (!previous) throw new TypeError('FIRST HUNT company root is unavailable');
    previousByCompany.set(companyId, previous);
  }

  const worldRow = await transaction
    .selectFrom('world_first_hunt_state')
    .selectAll()
    .where('world_id', '=', input.worldId)
    .forUpdate()
    .executeTakeFirst();
  if (!worldRow) throw new TypeError('FIRST HUNT world state is unavailable');
  const world = readFirstHuntWorldState(input.worldId, worldRow);

  const contract = await transaction
    .selectFrom('contract_instances')
    .select(['profile_id', 'terms', 'terms_digest', 'owner_company_id', 'helper_company_id'])
    .where('world_id', '=', input.worldId)
    .where('instance_id', '=', FIRST_HUNT_INSTANCE_ID)
    .forUpdate()
    .executeTakeFirst();
  if (
    !contract ||
    contract.profile_id !== FIRST_HUNT_PROFILE_ID ||
    contract.owner_company_id === null
  )
    throw new TypeError('FIRST HUNT contract binding is unavailable');
  const contractTermsDigest = createHash('sha256')
    .update(canonicalJson(contract.terms), 'utf8')
    .digest('hex');
  if (
    canonicalJson(contract.terms) !== canonicalJson(FIRST_HUNT_TERMS) ||
    contract.terms_digest.toString('hex') !== contractTermsDigest
  )
    throw new TypeError('FIRST HUNT contract terms are not the locked approved profile');
  const admission = await transaction
    .selectFrom('encounter_admissions')
    .selectAll()
    .where('world_id', '=', input.worldId)
    .where('encounter_id', '=', input.encounterId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !admission ||
    admission.instance_id !== FIRST_HUNT_INSTANCE_ID ||
    admission.binding_version !== 2 ||
    admission.terminal_revision !== input.terminalRevision ||
    !isRecord(admission.binding) ||
    admission.binding['worldId'] !== input.worldId ||
    admission.binding['version'] !== 's02-encounter-binding-2' ||
    !Array.isArray(admission.binding['participants'])
  )
    throw new TypeError('FIRST HUNT terminal admission is stale or unavailable');
  // One participant per character; several members of one company share its companyId.
  const participantCompanyIds = admission.binding['participants'].map((participant) =>
    isRecord(participant) && typeof participant['companyId'] === 'string'
      ? participant['companyId']
      : '',
  );
  const boundCompanyIds = [...new Set(participantCompanyIds)];
  if (
    boundCompanyIds.length === 0 ||
    participantCompanyIds.some((id) => id.length === 0) ||
    canonicalJson([...boundCompanyIds].toSorted(compareIds)) !== canonicalJson(lockSet.companyIds)
  )
    throw new TypeError('FIRST HUNT terminal lock set does not match immutable admission');

  const effectSourceId = `first-hunt-terminal:${input.encounterId}:${input.terminalRevision}`;
  const disposition = resolveFirstHuntTerminalDisposition({
    effectsAppliedAt: admission.effects_applied_at,
    effectsSourceId: admission.effects_source_id,
    requestedSourceId: effectSourceId,
    admittedCompanyIds: boundCompanyIds,
    ownerCompanyId: contract.owner_company_id,
    helperCompanyId: contract.helper_company_id,
  });
  if (disposition === 'REPLAY') {
    for (const companyId of lockSet.companyIds) {
      const previous = previousByCompany.get(companyId);
      const completed = previous?.encounter.completed.find(
        (entry) =>
          entry.terminalRevision === input.terminalRevision &&
          entry.terminalSourceEventId === `encounter:${input.encounterId}:terminal`,
      );
      if (!previous || previous.encounter.active !== null || !completed)
        throw new TypeError('FIRST HUNT terminal acknowledgement has an unreleased company');
      const receiptIdentity = firstHuntTerminalReceiptIdentity({
        worldId: input.worldId,
        companyId,
        encounterId: input.encounterId,
        terminalRevision: input.terminalRevision,
      });
      const receipt = await transaction
        .selectFrom('company_receipts')
        .select(['receipt_id', 'command_id', 'resulting_revision', 'response'])
        .where('world_id', '=', input.worldId)
        .where('company_id', '=', companyId)
        .where('command_id', '=', receiptIdentity.commandId)
        .executeTakeFirst();
      const audit = await transaction
        .selectFrom('company_audit_events')
        .select('event')
        .where('world_id', '=', input.worldId)
        .where('company_id', '=', companyId)
        .where('event_id', '=', receiptIdentity.eventId)
        .executeTakeFirst();
      if (
        !receipt ||
        !isFirstHuntTerminalReceiptCurrentOrAncestor({
          receiptId: receipt.receipt_id,
          expectedReceiptId: receiptIdentity.receiptId,
          commandId: receipt.command_id,
          expectedCommandId: receiptIdentity.commandId,
          resultingRevision: receipt.resulting_revision,
          currentRevision: previous.economy.lifecycle.revision,
          response: receipt.response,
        }) ||
        !audit ||
        !isRecord(audit.event) ||
        audit.event['type'] !== 'FirstHuntEncounterTerminalized' ||
        audit.event['encounterId'] !== input.encounterId ||
        audit.event['terminalRevision'] !== input.terminalRevision
      )
        throw new TypeError('FIRST HUNT terminal acknowledgement is missing a company receipt');
    }
    return;
  }

  const proofSourceId = `encounter:${input.encounterId}:terminal`;
  const existingProof = await transaction
    .selectFrom('world_proof_claims')
    .selectAll()
    .where('world_id', '=', input.worldId)
    .where('source_id', '=', proofSourceId)
    .forUpdate()
    .executeTakeFirst();
  if (existingProof)
    throw new TypeError('FIRST HUNT proof exists before terminal effects acknowledgement');

  const stored = await transaction
    .selectFrom('encounters')
    .selectAll()
    .where('id', '=', input.encounterId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !stored ||
    stored.world_id !== input.worldId ||
    stored.schema_version !== COMBAT_V2_SCHEMA_VERSION ||
    stored.status !== 'resolved' ||
    stored.revision !== input.terminalRevision
  )
    throw new TypeError('FIRST HUNT encounter is not at its recorded terminal revision');

  const encounter = stored as unknown as EncounterStoredRow;
  const setup = encounter.setup as BattleSetupV2;
  const state = encounter.state as BattleState;
  if (
    setup.schemaVersion !== COMBAT_V2_SCHEMA_VERSION ||
    setup.rulesetId !== M1_DOMAIN_BRIDGE_V2_RULESET_ID ||
    setup.units.length !== state.units.length ||
    !(await verifyEncounterReplayRow(transaction, encounter))
  )
    throw new TypeError('FIRST HUNT terminal encounter replay is invalid');

  const hostileIds = new Set(world.hostiles.map((hostile) => hostile.entityId));
  const hostileUnits = setup.units.filter((unit) => hostileIds.has(unit.id));
  if (
    hostileUnits.length !== world.hostiles.length ||
    hostileUnits.some((unit) => {
      const hostile = world.hostiles.find((entry) => entry.entityId === unit.id);
      return (
        !hostile ||
        canonicalJson(unit.initialPools) !== canonicalJson(hostile.currentPools) ||
        unit.sideId !== HOSTILE_SIDE_ID
      );
    })
  )
    throw new TypeError('FIRST HUNT terminal encounter does not match current hostile state');

  const terminalPools = new Map<
    string,
    {
      readonly health: number;
      readonly armor: number;
      readonly stamina: number;
      readonly morale: number;
    }
  >(
    state.units
      .filter((unit) => hostileIds.has(unit.id))
      .map((unit) => [
        String(unit.id),
        {
          health: unit.health,
          armor: unit.armor,
          stamina: unit.stamina,
          morale: unit.morale,
        },
      ]),
  );
  if (terminalPools.size !== world.hostiles.length)
    throw new TypeError('FIRST HUNT terminal hostile pool set is incomplete');

  const hostiles: readonly FirstHuntHostileState[] = world.hostiles.map((hostile) => {
    const pools = terminalPools.get(String(hostile.entityId));
    if (
      !pools ||
      pools.health < 0 ||
      pools.health > hostile.attributes['health']! ||
      pools.armor < 0 ||
      pools.armor > hostile.attributes['armor']! ||
      pools.stamina < 0 ||
      pools.stamina > hostile.attributes['stamina']! ||
      pools.morale < 0 ||
      pools.morale > hostile.attributes['morale']!
    )
      throw new TypeError('FIRST HUNT terminal hostile pools are invalid');
    return { ...hostile, currentPools: pools };
  });

  const released = [] as {
    readonly previous: CompanyCombatAggregateState;
    readonly next: CompanyCombatAggregateState;
    readonly evidence: Extract<FirstHuntTerminalEvidence, { readonly status: 'READY' }>;
  }[];
  for (const companyId of lockSet.companyIds) {
    const previous = previousByCompany.get(companyId);
    if (!previous || previous.encounter.active === null)
      throw new TypeError('FIRST HUNT bound company has no active encounter root');
    const evidence = await input.prepareCompanyTerminalEvidence(transaction, {
      worldId: input.worldId,
      encounterId: input.encounterId,
      terminalRevision: input.terminalRevision,
      companyId,
      previous,
      contractProfileId: contract.profile_id,
      contractTermsDigest: contract.terms_digest.toString('hex'),
    });
    if (evidence.status !== 'READY') {
      if (evidence.residuals.includes('LEADERSHIP_CHOICE_REQUIRED'))
        throw new TerminalAwaitingLeadershipChoice(companyId);
      throw new TypeError(
        `FIRST HUNT terminal evidence is not ready for ${companyId}: ${evidence.residuals.join(',')}`,
      );
    }
    const profile = evidence.consume.practiceProfile;
    const activeBinding = previous.encounter.active.binding;
    const expectedPracticeDigest = canonicalJson({
      version: profile.version,
      profileId: profile.profileId,
      bindingId: profile.bindingId,
      challengeLevel: profile.challengeLevel,
    });
    const consumed = prepareConsumeCombatAggregate(previous, evidence.consume);
    if (consumed.kind !== 'PREPARED' || consumed.replayed)
      throw new TypeError('FIRST HUNT terminal receipt consumption did not prepare');
    const finalized = prepareFinalizeCombatAggregate(consumed.next, evidence.finalize);
    if (finalized.kind !== 'PREPARED' || finalized.replayed)
      throw new TypeError('FIRST HUNT terminal aggregate finalization did not prepare');
    const finalState = readCompanyCombatAggregateState(evidence.finalState);
    const completed = finalState.encounter.completed.find(
      (entry) =>
        entry.bindingId === evidence.bindingId &&
        entry.terminalRevision === evidence.terminalRevision &&
        entry.terminalSourceEventId === `encounter:${input.encounterId}:terminal`,
    );
    if (
      evidence.terminalRevision !== input.terminalRevision ||
      evidence.contractProfileId !== contract.profile_id ||
      evidence.contractTermsDigest !== contract.terms_digest.toString('hex') ||
      evidence.consume.journal.companyId !== companyId ||
      activeBinding.bindingId !== evidence.bindingId ||
      activeBinding.setup.battleId !== input.encounterId ||
      activeBinding.worldId !== input.worldId ||
      evidence.consume.practiceProfile.bindingId !== evidence.bindingId ||
      evidence.practiceProfile.version !== profile.version ||
      evidence.practiceProfile.profileId !== profile.profileId ||
      profile.profileId !== FIRST_HUNT_PRACTICE_PROFILE_ID ||
      evidence.practiceProfile.challengeLevel !== profile.challengeLevel ||
      evidence.practiceProfile.challengeLevel !== 3 ||
      evidence.practiceProfile.digest !== expectedPracticeDigest ||
      evidence.finalize.terminal.bindingId !== evidence.bindingId ||
      evidence.finalize.terminal.battleId !== input.encounterId ||
      evidence.finalize.terminal.revision !== input.terminalRevision ||
      evidence.finalize.terminal.sourceEventId !== `encounter:${input.encounterId}:terminal` ||
      evidence.finalize.terminal.outcomeDigest !== evidence.outcomeDigest ||
      evidence.finalize.terminal.id !== evidence.finalStateDigest ||
      !completed ||
      completed.finalStateDigest !== evidence.finalStateDigest ||
      completed.outcomeDigest !== evidence.outcomeDigest ||
      canonicalStateJson(finalized.next) !== canonicalStateJson(finalState)
    )
      throw new TypeError(
        'FIRST HUNT terminal evidence does not match the locked company transition',
      );
    released.push({ previous, next: finalState, evidence });
  }

  for (const release of released) {
    await persistFirstHuntTerminalCompanyTransition(transaction, {
      previous: release.previous,
      next: release.next,
      encounterId: input.encounterId,
      terminalRevision: input.terminalRevision,
      bindingId: release.evidence.bindingId,
      finalStateDigest: release.evidence.finalStateDigest,
      outcomeDigest: release.evidence.outcomeDigest,
      practiceProfile: release.evidence.practiceProfile,
      contractProfileId: release.evidence.contractProfileId,
      contractTermsDigest: release.evidence.contractTermsDigest,
    });
  }

  const nextRevision = (BigInt(world.revision) + 1n).toString();
  const worldUpdated = await transaction
    .updateTable('world_first_hunt_state')
    .set({ hostiles: canonicalJson(hostiles), revision: nextRevision })
    .where('world_id', '=', input.worldId)
    .where('revision', '=', world.revision)
    .executeTakeFirst();
  if (Number(worldUpdated.numUpdatedRows) !== 1)
    throw new Error('FIRST HUNT hostile world state CAS failed');

  const companySide = setup.sides.find((side) => side.id === COMPANY_SIDE_ID);
  const hasCompanyVictory =
    companySide !== undefined && state.outcome?.winnerSideId === companySide.id;
  if (hasCompanyVictory) {
    const groundItem = createGroundProof(input.worldId, proofSourceId);
    await transaction
      .insertInto('world_proof_claims')
      .values({
        world_id: input.worldId,
        item_id: FIRST_HUNT_PROOF_ID,
        source_id: proofSourceId,
        encounter_id: input.encounterId,
        terminal_revision: input.terminalRevision,
        ground_item: groundItem,
        custodian_company_id: null,
        redeemed_company_id: null,
        redemption_receipt_id: null,
      })
      .execute();
  }

  const acknowledged = await transaction
    .updateTable('encounter_admissions')
    .set({ effects_source_id: effectSourceId, effects_applied_at: sql<Date>`now()` })
    .where('world_id', '=', input.worldId)
    .where('encounter_id', '=', input.encounterId)
    .where('terminal_revision', '=', input.terminalRevision)
    .where('effects_applied_at', 'is', null)
    .executeTakeFirst();
  if (Number(acknowledged.numUpdatedRows) !== 1)
    throw new Error('FIRST HUNT terminal effects acknowledgement CAS failed');
}

function createGroundProof(worldId: string, sourceId: string) {
  return {
    itemId: FIRST_HUNT_PROOF_ID,
    definitionId: FIRST_HUNT_PROOF_DEFINITION_ID,
    owner: { kind: 'WORLD' as const, id: worldId },
    containerId: GROUND_CONTAINER_ID,
    quantity: 1,
    currentCondition: 10000,
    maximumCondition: 10000,
    contentRevision: '0',
    provenance: { sourceId, parentItemId: null, ordinal: 0 },
    equipped: null,
    tombstone: null,
  };
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
}

function hashId(value: readonly string[]): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

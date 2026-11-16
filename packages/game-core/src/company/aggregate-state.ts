import { canonicalJson, plainObject } from './input.js';
import type { CompanyCombatAggregateState } from './combat-aggregate.js';
import { createCombatEncounterApplication } from './combat-aggregate.js';
import {
  ENCOUNTER_BINDING_VERSION,
  FIRST_HUNT_WORLD_BINDING_VERSION,
} from './encounter-binding.js';
import { assertBattleState } from '../combat/engine.js';
import { startBattleV2 } from '../combat/runtime-v2.js';
import { startBattleV3 } from '../combat/runtime-v3.js';
import {
  M1_DOMAIN_BRIDGE_RULESET_ID,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  M1_DOMAIN_BRIDGE_V3_RULESET_ID,
  M1_DOMAIN_BRIDGE_V4_RULESET_ID,
  M1_DOMAIN_BRIDGE_V5_RULESET_ID,
  M1_DOMAIN_BRIDGE_V6_RULESET_ID,
  type BattleSetupV2,
} from '../combat/setup-v2.js';
import type { BattleSetupV3 } from '../combat/setup-v3.js';
import { isCompanyFinanceShape, validateEconomy } from './economy-state.js';
import type { EconomyContext } from './economy-types.js';
import { readCompanyLearningState } from './learning-state.js';
import { readSocialState } from './social.js';
import { validatePhysicalState } from './physical-state.js';
import { isCompanyPhysicalStateShape, isItemInstanceShape } from './physical-state.js';
import { isLifecycleStateShape } from './lifecycle-state.js';
import { canonicalRevision, isEntityId, isExactInteger, publicRevision } from './values.js';
import { MAX_TEXT_LENGTH } from './values.js';
import {
  companyLocationShape as locationShape,
  hasExactStoredFields as shape,
} from './stored-shape.js';

const MAX_AGGREGATE_NODES = 250_000;
const MAX_AGGREGATE_DEPTH = 64;

/** Safely own a persisted JSON value without invoking accessors supplied by a caller. */
function ownAggregateJson(value: unknown): unknown {
  return copyAggregateJsonValue(value, 0, '$', { nodes: 0, ancestors: new Set() });
}

type AggregateCopyBudget = { nodes: number; ancestors: Set<object> };

function copyAggregateJsonValue(
  input: unknown,
  depth: number,
  path: string,
  budget: AggregateCopyBudget,
): unknown {
  if (++budget.nodes > MAX_AGGREGATE_NODES || depth > MAX_AGGREGATE_DEPTH)
    throw new TypeError('Aggregate JSON budget exceeded');
  if (input === null || typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    if (!isRetainedCanonicalString(path) && [...input].length > MAX_TEXT_LENGTH)
      throw new TypeError('Aggregate text too long');
    return input;
  }
  if (typeof input === 'number') {
    if (
      !Number.isFinite(input) ||
      Object.is(input, -0) ||
      (Number.isInteger(input) && !Number.isSafeInteger(input))
    )
      throw new TypeError('Invalid aggregate number');
    return input;
  }
  if (typeof input !== 'object' || budget.ancestors.has(input))
    throw new TypeError('Invalid aggregate JSON');
  return copyAggregateJsonContainer(input, depth, path, budget);
}

function copyAggregateJsonContainer(
  input: object,
  depth: number,
  path: string,
  budget: AggregateCopyBudget,
): unknown {
  const array = Array.isArray(input);
  if (array ? Object.getPrototypeOf(input) !== Array.prototype : !plainObject(input))
    throw new TypeError('Invalid aggregate container');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors).filter((key) => !array || key !== 'length');
  if (keys.length > 100_000 || (array && descriptors['length']?.value !== keys.length))
    throw new TypeError('Invalid aggregate container size');
  budget.ancestors.add(input);
  const result: unknown[] | Record<string, unknown> = array ? [] : {};
  for (const [index, key] of keys.entries()) {
    if (typeof key !== 'string' || (array && key !== String(index)))
      throw new TypeError('Invalid aggregate key');
    const descriptor = descriptors[key]!;
    if (!('value' in descriptor) || !descriptor.enumerable)
      throw new TypeError('Invalid aggregate property');
    const child = copyAggregateJsonValue(
      descriptor.value,
      depth + 1,
      array ? `${path}[${index}]` : `${path}.${key}`,
      budget,
    );
    if (array) (result as unknown[]).push(child);
    else Object.defineProperty(result, key, { value: child, enumerable: true });
  }
  budget.ancestors.delete(input);
  return Object.freeze(result);
}

function isRetainedCanonicalString(path: string): boolean {
  return (
    path === '$.encounter.active.bindingDigest' ||
    path === '$.encounter.active.initialRootDigest' ||
    path === '$.encounter.active.practiceProfileDigest' ||
    /^\$\.encounter\.active\.appliedReceipts\[\d+\]\.(receiptDigest|evidenceDigest|practiceProfileDigest)$/.test(
      path,
    ) ||
    /^\$\.encounter\.active\.appliedPractice\[\d+\]\.commandDigest$/.test(path) ||
    /^\$\.encounter\.completed\[\d+\]\.(commandDigest|finalizeEvidenceKey)$/.test(path)
  );
}

/** Strict persisted root reader. Each domain owner validates its own retained state. */
export function readCompanyCombatAggregateState(value: unknown): CompanyCombatAggregateState {
  const owned = ownAggregateJson(value);
  if (
    !plainObject(owned) ||
    canonicalJson(Object.keys(owned).sort()) !==
      canonicalJson(['economy', 'encounter', 'learning', 'social'])
  )
    throw new TypeError('Invalid company aggregate root');
  const economyValue = owned['economy'];
  if (
    !shape(economyValue, ['lifecycle', 'finance', 'physical']) ||
    !isLifecycleStateShape(economyValue['lifecycle']) ||
    !isCompanyFinanceShape(economyValue['finance']) ||
    !isCompanyPhysicalStateShape(economyValue['physical'])
  )
    throw new TypeError('Invalid company economy root');

  // The owner shape guards run before this internal type conversion; the detached
  // aggregate snapshot permits retained G10 canonical state to exceed request limits.
  const economy = economyValue as unknown as CompanyCombatAggregateState['economy'];
  const lifecycle = economy['lifecycle'];
  const context: EconomyContext = {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal: { kind: 'PLAYER', id: 'aggregate-reader' },
    publicRevision: publicRevision(String(lifecycle.knowledge.revision)),
    canonicalRevision: canonicalRevision(String(lifecycle.revision)),
    atTick: lifecycle.campaignTick,
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts: [],
  };
  validateEconomy(economy, context);
  if (!economy.physical) throw new TypeError('Company aggregate requires physical state');
  validatePhysicalState({ lifecycle, physical: economy.physical });

  const learning = readCompanyLearningState(owned['learning']);
  validateAggregateLearningScope(learning, lifecycle);
  const social = readSocialState(owned['social']);
  const encounter = readCombatEncounterApplication(owned['encounter']);
  validateAggregateEncounterPresence(lifecycle, economy, encounter);
  return Object.freeze({ economy, learning, social, encounter });
}

function validateAggregateLearningScope(
  learning: CompanyCombatAggregateState['learning'],
  lifecycle: CompanyCombatAggregateState['economy']['lifecycle'],
): void {
  const companyCharacterIds = new Set<string>(
    lifecycle.characters.map((character) => character.identity.characterId),
  );
  if (
    learning.tasks.tasks.some(
      (task) =>
        task.start.command.companyId !== lifecycle.companyId ||
        task.start.command.worldId !== lifecycle.worldId ||
        !companyCharacterIds.has(task.start.command.payload.characterId),
    ) ||
    learning.studyAccess.intervals.some(
      (interval) => !companyCharacterIds.has(interval.characterId),
    ) ||
    learning.studyProgress.some((progress) => !companyCharacterIds.has(progress.characterId)) ||
    learning.ownerTransitions.some(
      (transition) =>
        transition.learnerId !== null && !companyCharacterIds.has(transition.learnerId),
    )
  )
    throw new TypeError('Company learning scope does not match company root');
}

function validateAggregateEncounterPresence(
  lifecycle: CompanyCombatAggregateState['economy']['lifecycle'],
  economy: CompanyCombatAggregateState['economy'],
  encounter: CompanyCombatAggregateState['encounter'],
): void {
  const active = encounter.active;
  if (
    active &&
    (active.binding.worldId !== lifecycle.worldId ||
      !active.binding.participants.some(
        (participant) => participant.companyId === lifecycle.companyId,
      ))
  )
    throw new TypeError('Active encounter scope does not match company root');
  const participants = active
    ? active.binding.participants.filter(
        (participant) => participant.companyId === lifecycle.companyId,
      )
    : [];
  const participantIds = new Set(
    participants.map((participant) => participant.projection.characterId),
  );
  for (const character of lifecycle.characters) {
    if (character.presence.availability === 'IN_ENCOUNTER') {
      if (
        !active ||
        character.presence.encounterBindingId !== active.binding.bindingId ||
        !participantIds.has(character.identity.characterId) ||
        !active.priorPresence.some((entry) => entry.characterId === character.identity.characterId)
      )
        throw new TypeError('Encounter presence does not match active binding');
    }
  }
  if (active) {
    const participantIdList = participants.map((participant) => participant.projection.characterId);
    const priorIds = active.priorPresence.map((entry) => entry.characterId);
    if (
      participantIds.size !== participantIdList.length ||
      canonicalJson([...participantIdList].toSorted()) !==
        canonicalJson([...priorIds].toSorted()) ||
      participants.some((participant) => {
        const character = lifecycle.characters.find(
          (entry) => entry.identity.characterId === participant.projection.characterId,
        );
        const prior = active.priorPresence.find(
          (entry) => entry.characterId === participant.projection.characterId,
        );
        return (
          !character ||
          !prior ||
          prior.fieldPartyId !== participant.partyId ||
          (character.presence.availability === 'IN_ENCOUNTER'
            ? character.presence.encounterBindingId !== active.binding.bindingId
            : character.presence.availability !== 'DEAD' ||
              !deathRecordedInActiveEncounter(
                economy,
                lifecycle,
                active,
                participant.projection.characterId,
              ))
        );
      })
    )
      throw new TypeError('Active encounter presence does not match company root');
  }
}

function deathRecordedInActiveEncounter(
  economy: CompanyCombatAggregateState['economy'],
  lifecycle: CompanyCombatAggregateState['economy']['lifecycle'],
  active: NonNullable<CompanyCombatAggregateState['encounter']['active']>,
  characterId: string,
): boolean {
  const membershipIds = new Set<string>(
    lifecycle.memberships
      .filter((membership) => membership.characterId === characterId)
      .map((membership) => membership.membershipId),
  );
  const receiptSourceEventIds = new Set(
    active.appliedReceipts.flatMap((receipt) => receipt.sourceEventIds),
  );
  const financeSourceKeys = new Set(economy.finance.sourceEffects.map((effect) => effect.key));
  const physicalSourceKeys = new Set(economy.physical!.sourceEffects.map((effect) => effect.key));
  return economy.finance.accounts.some((account) => {
    if (
      !membershipIds.has(account.membershipId) ||
      account.death === null ||
      !receiptSourceEventIds.has(account.death.sourceId)
    )
      return false;
    const sourceEventId = account.death.sourceId;
    return (
      financeSourceKeys.has(canonicalJson(['FINANCIAL_DEATH', sourceEventId, characterId])) &&
      physicalSourceKeys.has(
        canonicalJson(['DEATH_OUTCOME', sourceEventId, ['character', characterId]]),
      )
    );
  });
}

function readCombatEncounterApplication(value: unknown): CompanyCombatAggregateState['encounter'] {
  if (
    !shape(value, ['schemaVersion', 'active', 'completed']) ||
    value['schemaVersion'] !== 1 ||
    !Array.isArray(value['completed']) ||
    !value['completed'].every(completedEncounterShape)
  )
    throw new TypeError('Invalid encounter application');
  const blank = createCombatEncounterApplication();
  if (value['active'] === null) {
    if (value['completed'].length === 0) return blank;
  } else if (!activeEncounterShape(value['active']))
    throw new TypeError('Invalid active encounter');
  const completedIds = (value['completed'] as readonly Record<string, unknown>[]).map(
    (entry) => entry['bindingId'],
  );
  const activeBindingId =
    value['active'] === null
      ? null
      : (value['active'] as Record<string, unknown>)['binding'] &&
        ((value['active'] as Record<string, unknown>)['binding'] as Record<string, unknown>)[
          'bindingId'
        ];
  if (
    new Set(completedIds).size !== completedIds.length ||
    (activeBindingId !== null && completedIds.includes(activeBindingId))
  )
    throw new TypeError('Duplicate encounter binding ID');
  return value as unknown as CompanyCombatAggregateState['encounter'];
}

function activeEncounterShape(value: unknown): boolean {
  if (
    !shape(value, [
      'binding',
      'bindingDigest',
      'initialRootDigest',
      'priorPresence',
      'lastAppliedRevision',
      'lastAppliedTick',
      'appliedReceipts',
      'appliedPractice',
      'practiceStartSnapshots',
      'practiceProfileDigest',
    ]) ||
    !nonEmpty(value['bindingDigest']) ||
    !nonEmpty(value['initialRootDigest']) ||
    !Array.isArray(value['priorPresence']) ||
    !value['priorPresence'].every(
      (entry) =>
        shape(entry, ['characterId', 'availability', 'assignment', 'fieldPartyId']) &&
        isEntityId(entry['characterId']) &&
        entry['availability'] === 'AVAILABLE' &&
        ['FIELD', 'RECOVERY'].includes(entry['assignment'] as string) &&
        isEntityId(entry['fieldPartyId']),
    ) ||
    !(
      value['lastAppliedRevision'] === null || Number.isSafeInteger(value['lastAppliedRevision'])
    ) ||
    !(value['lastAppliedTick'] === null || isExactInteger(value['lastAppliedTick'])) ||
    !Array.isArray(value['appliedReceipts']) ||
    !value['appliedReceipts'].every(
      (entry) =>
        shape(entry, [
          'revision',
          'receiptDigest',
          'evidenceDigest',
          'practiceProfileDigest',
          'sourceEventIds',
        ]) &&
        Number.isSafeInteger(entry['revision']) &&
        ['receiptDigest', 'evidenceDigest', 'practiceProfileDigest'].every((key) =>
          nonEmpty(entry[key]),
        ) &&
        isEntityIdList(entry['sourceEventIds']),
    ) ||
    !Array.isArray(value['appliedPractice']) ||
    !value['appliedPractice'].every(
      (entry) =>
        shape(entry, ['sourceEventId', 'commandDigest']) &&
        isEntityId(entry['sourceEventId']) &&
        nonEmpty(entry['commandDigest']),
    ) ||
    !Array.isArray(value['practiceStartSnapshots']) ||
    !value['practiceStartSnapshots'].every(
      (entry) =>
        shape(entry, [
          'sourceId',
          'startReceiptOrdinal',
          'characterId',
          'skillId',
          'levelAtStart',
          'aptitudeAtStartBps',
        ]) &&
        isEntityId(entry['sourceId']) &&
        Number.isSafeInteger(entry['startReceiptOrdinal']) &&
        isEntityId(entry['characterId']) &&
        isEntityId(entry['skillId']) &&
        Number.isSafeInteger(entry['levelAtStart']) &&
        Number.isSafeInteger(entry['aptitudeAtStartBps']),
    ) ||
    !(value['practiceProfileDigest'] === null || nonEmpty(value['practiceProfileDigest']))
  )
    return false;
  if (!bindingShape(value['binding'])) return false;
  const binding = value['binding'] as Record<string, unknown>;
  const receipts = value['appliedReceipts'] as readonly Record<string, unknown>[];
  const initialRevision = (binding['initial'] as { state: { revision: number } }).state.revision;
  if (
    !Number.isSafeInteger(initialRevision) ||
    receipts.some((receipt, index) => receipt['revision'] !== initialRevision + index) ||
    canonicalJson(binding) !== value['bindingDigest']
  )
    return false;
  const lastReceipt = receipts.at(-1);
  return lastReceipt
    ? value['lastAppliedRevision'] === lastReceipt['revision'] &&
        isExactInteger(value['lastAppliedTick']) &&
        BigInt(value['lastAppliedTick']) >= BigInt(binding['atTick'] as string)
    : value['lastAppliedRevision'] === null && value['lastAppliedTick'] === null;
}

function bindingShape(value: unknown): boolean {
  const baseKeys = [
    'schemaVersion',
    'version',
    'bindingId',
    'worldId',
    'sourceId',
    'sourceEventId',
    'atTick',
    'location',
    'participants',
    'setup',
    'initial',
    'lastAppliedRevision',
  ];
  const legacyBinding =
    value !== null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)['version'] === ENCOUNTER_BINDING_VERSION;
  const worldBinding =
    value !== null &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)['version'] === FIRST_HUNT_WORLD_BINDING_VERSION;
  if (
    !shape(value, worldBinding ? [...baseKeys, 'worldParticipants'] : baseKeys) ||
    value['schemaVersion'] !== 1 ||
    (!legacyBinding && !worldBinding) ||
    !isEntityId(value['bindingId']) ||
    !isEntityId(value['worldId']) ||
    !isEntityId(value['sourceId']) ||
    !isEntityId(value['sourceEventId']) ||
    !isExactInteger(value['atTick']) ||
    !locationShape(value['location']) ||
    !Array.isArray(value['participants']) ||
    !value['participants'].every(bindingParticipantShape) ||
    !(setupV2Shape(value['setup']) || setupV3Shape(value['setup'])) ||
    !transitionShape(value['initial']) ||
    !bindingVersionsMatch(value) ||
    !Number.isSafeInteger(value['lastAppliedRevision']) ||
    (worldBinding && !worldParticipantsShape(value['worldParticipants'], value['setup'])) ||
    (bindingNeedsMemberMatch(value) && !worldBindingMembersMatch(value))
  )
    return false;
  try {
    assertBattleState(
      (value['initial'] as { state: Parameters<typeof assertBattleState>[0] }).state,
    );
  } catch {
    return false;
  }
  return true;
}

function combatUnitValuesShape(entry: Record<string, unknown>): boolean {
  return (
    shape(entry['attributes'], [
      'accuracy',
      'armor',
      'defense',
      'health',
      'initiative',
      'morale',
      'stamina',
    ]) &&
    Object.values(entry['attributes']).every(Number.isSafeInteger) &&
    shape(entry['initialPools'], ['health', 'armor', 'stamina', 'morale']) &&
    Object.values(entry['initialPools']).every(Number.isSafeInteger)
  );
}

function worldParticipantsShape(value: unknown, setup: unknown): boolean {
  const allowMillSlam =
    plainObject(setup) &&
    setup['schemaVersion'] === 3 &&
    setup['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID;
  return !(
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(
      (entry) =>
        shape(entry, [
          'entityId',
          'sourceId',
          'unitId',
          'sideId',
          'position',
          'weaponId',
          'attributes',
          'initialPools',
          ...(plainObject(entry) && Object.hasOwn(entry, 'moralePolicy') ? ['moralePolicy'] : []),
          ...(allowMillSlam && plainObject(entry) && Object.hasOwn(entry, 'threatProfile')
            ? ['threatProfile']
            : []),
        ]) &&
        ['entityId', 'sourceId', 'unitId', 'sideId', 'weaponId'].every((key) =>
          isEntityId(entry[key]),
        ) &&
        (entry['moralePolicy'] === undefined ||
          ['human', 'beast', 'steady'].includes(entry['moralePolicy'] as string)) &&
        (!Object.hasOwn(entry, 'threatProfile') ||
          (allowMillSlam && entry['threatProfile'] === 'mill-slam')) &&
        entry['entityId'] === entry['unitId'] &&
        hexShape(entry['position']) &&
        combatUnitValuesShape(entry),
    )
  );
}

function bindingParticipantShape(entry: unknown): boolean {
  return (
    shape(entry, [
      'companyId',
      'partyId',
      'revision',
      'physicalPolicyVersion',
      'unitId',
      'sideId',
      'position',
      'projection',
      'vitals',
      'equipment',
    ]) &&
    ['companyId', 'partyId', 'physicalPolicyVersion', 'unitId', 'sideId'].every((key) =>
      isEntityId(entry[key]),
    ) &&
    isExactInteger(entry['revision']) &&
    hexShape(entry['position']) &&
    projectionShape(entry['projection']) &&
    vitalsShapeForBinding(entry['vitals']) &&
    Array.isArray(entry['equipment']) &&
    entry['equipment'].every(itemShapeForEncounter)
  );
}

function bindingVersionsMatch(value: Record<string, unknown>): boolean {
  const setup = value['setup'] as Record<string, unknown>;
  const expected =
    setup['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID
      ? 6
      : setup['rulesetId'] === M1_DOMAIN_BRIDGE_V5_RULESET_ID
        ? 5
        : setup['rulesetId'] === M1_DOMAIN_BRIDGE_V4_RULESET_ID
          ? 4
          : setup['rulesetId'] === M1_DOMAIN_BRIDGE_V3_RULESET_ID
            ? 3
            : 2;
  return (value['participants'] as Record<string, unknown>[]).every(
    (entry) => (entry['projection'] as Record<string, unknown>)['schemaVersion'] === expected,
  );
}

function isTacticalBridgeRuleset(ruleset: unknown): boolean {
  return (
    ruleset === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
    ruleset === M1_DOMAIN_BRIDGE_V5_RULESET_ID ||
    ruleset === M1_DOMAIN_BRIDGE_V6_RULESET_ID
  );
}

function playerCombatPartyId(companyId: string, partyId: string): string {
  return `player:${JSON.stringify([companyId, partyId])}`;
}

function npcCombatPartyId(sideId: string): string {
  return `npc:${JSON.stringify(sideId)}`;
}

function worldBindingMembersMatch(value: Record<string, unknown>): boolean {
  const participants = value['participants'];
  const worldParticipants = value['worldParticipants'] ?? [];
  const setup = value['setup'];
  if (
    !Array.isArray(participants) ||
    !Array.isArray(worldParticipants) ||
    !plainObject(setup) ||
    !Array.isArray(setup['units']) ||
    participants.length + worldParticipants.length !== setup['units'].length
  )
    return false;
  const setupUnits = setup['units'];
  const v3 = setup['schemaVersion'] === 3;
  if (v3) {
    if (!Array.isArray(setup['parties'])) return false;
    const playerParties = new Map<string, Record<string, unknown>>();
    for (const participant of participants) {
      if (!plainObject(participant)) return false;
      const id = playerCombatPartyId(
        String(participant['companyId']),
        String(participant['partyId']),
      );
      playerParties.set(id, {
        id,
        sideId: participant['sideId'],
        kind: 'player',
        controllerId: participant['companyId'],
      });
    }
    for (const participant of worldParticipants) {
      if (!plainObject(participant)) return false;
      const id = npcCombatPartyId(String(participant['sideId']));
      playerParties.set(id, { id, sideId: participant['sideId'], kind: 'npc' });
    }
    const comparePartyIds = (left: unknown, right: unknown) => {
      const a = String(left);
      const b = String(right);
      return a < b ? -1 : a > b ? 1 : 0;
    };
    const expectedParties = [...playerParties.values()].toSorted((a, b) =>
      comparePartyIds(a['id'], b['id']),
    );
    const actualParties = setup['parties'].toSorted((a, b) =>
      plainObject(a) && plainObject(b) ? comparePartyIds(a['id'], b['id']) : 0,
    );
    if (canonicalJson(actualParties) !== canonicalJson(expectedParties)) return false;
  }
  const companyUnitIds = participants.map((entry) =>
    plainObject(entry) ? entry['unitId'] : undefined,
  );
  const worldUnitIds = worldParticipants.map((entry) =>
    plainObject(entry) ? entry['unitId'] : undefined,
  );
  const allIds = [...companyUnitIds, ...worldUnitIds];
  if (
    !allIds.every(isEntityId) ||
    new Set(allIds).size !== allIds.length ||
    !setupUnits.every(
      (unit) => plainObject(unit) && isEntityId(unit['id']) && allIds.includes(unit['id']),
    )
  )
    return false;
  const companyParticipantsMatch = participants.every((participant) => {
    if (!plainObject(participant) || !plainObject(participant['projection'])) return false;
    const projection = participant['projection'];
    const weapon = projection['weapon'];
    const setupUnit = setupUnits.find(
      (unit) => plainObject(unit) && unit['id'] === participant['unitId'],
    );
    if (!plainObject(setupUnit) || !plainObject(weapon)) return false;
    return (
      canonicalJson({
        id: participant['unitId'],
        sideId: participant['sideId'],
        ...(v3
          ? {
              partyId: playerCombatPartyId(
                String(participant['companyId']),
                String(participant['partyId']),
              ),
            }
          : {}),
        position: participant['position'],
        weaponId: weapon['profileId'],
        attributes: projection['attributes'],
        initialPools: projection['current'],
        ...(projection['schemaVersion'] === 4 ||
        projection['schemaVersion'] === 5 ||
        projection['schemaVersion'] === 6
          ? { skillRanks: projection['skillRanks'], moralePolicy: projection['moralePolicy'] }
          : {}),
        ...(projection['schemaVersion'] === 3 ||
        projection['schemaVersion'] === 4 ||
        projection['schemaVersion'] === 5 ||
        projection['schemaVersion'] === 6
          ? { capabilities: projection['capabilities'] }
          : {}),
      }) === canonicalJson(setupUnit)
    );
  });
  if (!companyParticipantsMatch) return false;
  const participantsMatch = worldParticipants.every((participant) => {
    if (!plainObject(participant)) return false;
    const setupUnit = setupUnits.find(
      (unit) => plainObject(unit) && unit['id'] === participant['unitId'],
    );
    if (!plainObject(setupUnit)) return false;
    return (
      canonicalJson({
        id: participant['unitId'],
        sideId: participant['sideId'],
        ...(v3 ? { partyId: npcCombatPartyId(String(participant['sideId'])) } : {}),
        position: participant['position'],
        weaponId: participant['weaponId'],
        attributes: participant['attributes'],
        initialPools: participant['initialPools'],
        ...(isTacticalBridgeRuleset(setup['rulesetId'])
          ? {
              skillRanks: {},
              moralePolicy:
                setup['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID
                  ? (participant['moralePolicy'] ?? 'human')
                  : participant['moralePolicy'],
            }
          : {}),
        ...(setup['rulesetId'] === M1_DOMAIN_BRIDGE_V3_RULESET_ID ||
        isTacticalBridgeRuleset(setup['rulesetId'])
          ? { capabilities: { move: true, attack: true, defend: true, retreat: true } }
          : {}),
        ...(setup['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID &&
        Object.hasOwn(participant, 'threatProfile')
          ? { threatProfile: participant['threatProfile'] }
          : {}),
      }) === canonicalJson(setupUnit)
    );
  });
  if (!participantsMatch) return false;
  try {
    return (
      canonicalJson(
        v3
          ? startBattleV3(setup as unknown as BattleSetupV3)
          : startBattleV2(setup as unknown as BattleSetupV2),
      ) === canonicalJson(value['initial'])
    );
  } catch {
    return false;
  }
}

function battleGeometryShape(value: Record<string, unknown>): boolean {
  const v3 = value['schemaVersion'] === 3 || value['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID;
  return (
    mapShape(
      value['map'],
      value['rulesetId'] === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
        value['rulesetId'] === M1_DOMAIN_BRIDGE_V5_RULESET_ID ||
        value['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID,
    ) &&
    Array.isArray(value['sides']) &&
    (v3 ? value['sides'].length >= 2 && value['sides'].length <= 3 : value['sides'].length === 2) &&
    value['sides'].every(
      (entry) =>
        shape(entry, ['id', 'retreatHexes']) &&
        isEntityId(entry['id']) &&
        Array.isArray(entry['retreatHexes']) &&
        entry['retreatHexes'].every(hexShape),
    )
  );
}

function setupV2Shape(value: unknown): boolean {
  if (
    !shape(value, ['schemaVersion', 'battleId', 'rulesetId', 'seed', 'map', 'sides', 'units']) ||
    value['schemaVersion'] !== 2 ||
    !isEntityId(value['battleId']) ||
    (value['rulesetId'] !== M1_DOMAIN_BRIDGE_RULESET_ID &&
      value['rulesetId'] !== M1_DOMAIN_BRIDGE_V2_RULESET_ID &&
      value['rulesetId'] !== M1_DOMAIN_BRIDGE_V3_RULESET_ID &&
      value['rulesetId'] !== M1_DOMAIN_BRIDGE_V4_RULESET_ID &&
      value['rulesetId'] !== M1_DOMAIN_BRIDGE_V5_RULESET_ID) ||
    !Number.isSafeInteger(value['seed']) ||
    !battleGeometryShape(value) ||
    !Array.isArray(value['units']) ||
    !value['units'].every(
      (entry) =>
        shape(entry, [
          'id',
          'sideId',
          'position',
          'weaponId',
          'attributes',
          'initialPools',
          ...(value['rulesetId'] === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
          value['rulesetId'] === M1_DOMAIN_BRIDGE_V5_RULESET_ID
            ? ['capabilities', 'skillRanks', 'moralePolicy']
            : value['rulesetId'] === M1_DOMAIN_BRIDGE_V3_RULESET_ID
              ? ['capabilities']
              : []),
        ]) &&
        capabilitiesShape(entry['capabilities'], value['rulesetId']) &&
        tacticalProjectionFieldsShape(entry, value['rulesetId']) &&
        isEntityId(entry['id']) &&
        isEntityId(entry['sideId']) &&
        hexShape(entry['position']) &&
        isEntityId(entry['weaponId']) &&
        combatUnitValuesShape(entry),
    )
  )
    return false;
  return true;
}

function setupV3Shape(value: unknown): boolean {
  return !!(
    shape(value, [
      'schemaVersion',
      'battleId',
      'rulesetId',
      'seed',
      'map',
      'sides',
      'parties',
      'units',
    ]) &&
    value['schemaVersion'] === 3 &&
    value['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID &&
    isEntityId(value['battleId']) &&
    Number.isSafeInteger(value['seed']) &&
    battleGeometryShape(value) &&
    Array.isArray(value['parties']) &&
    value['parties'].every(
      (party) =>
        shape(party, ['id', 'sideId', 'kind'], ['controllerId']) &&
        isEntityId(party['id']) &&
        isEntityId(party['sideId']) &&
        (party['kind'] === 'npc'
          ? party['controllerId'] === undefined
          : party['kind'] === 'player' && isEntityId(party['controllerId'])),
    ) &&
    Array.isArray(value['units']) &&
    value['units'].length >= 2 &&
    value['units'].length <= 36 &&
    threatProfilesUseNpcParties(value['units'], value['parties']) &&
    value['units'].every(
      (entry) =>
        shape(
          entry,
          [
            'id',
            'sideId',
            'partyId',
            'position',
            'weaponId',
            'attributes',
            'initialPools',
            'capabilities',
            'skillRanks',
            'moralePolicy',
          ],
          ['threatProfile'],
        ) &&
        (!Object.hasOwn(entry, 'threatProfile') || entry['threatProfile'] === 'mill-slam') &&
        capabilitiesShape(entry['capabilities'], M1_DOMAIN_BRIDGE_V6_RULESET_ID) &&
        tacticalProjectionFieldsShape(entry, M1_DOMAIN_BRIDGE_V6_RULESET_ID) &&
        isEntityId(entry['id']) &&
        isEntityId(entry['sideId']) &&
        isEntityId(entry['partyId']) &&
        hexShape(entry['position']) &&
        isEntityId(entry['weaponId']) &&
        combatUnitValuesShape(entry),
    )
  );
}

function transitionShape(value: unknown): boolean {
  if (
    shape(value, ['state', 'events']) &&
    battleStateShape(value['state']) &&
    plainObject(value['state']) &&
    emptyRoundLimitTransitionShape(value['state'], value['events'])
  )
    return true;
  if (
    !shape(value, ['state', 'events']) ||
    !battleStateShape(value['state']) ||
    !Array.isArray(value['events']) ||
    value['events'].length !== 3
  )
    return false;
  const [started, round, activation] = value['events'];
  const state = value['state'] as Record<string, unknown>;
  if (!shape(state['activation'], ['id', 'unitId', 'remainingActionPoints'])) return false;
  const stateActivation = state['activation'] as Record<string, unknown>;
  return transitionEventsShape(started, round, activation, state, stateActivation);
}

function emptyRoundLimitTransitionShape(state: Record<string, unknown>, events: unknown): boolean {
  const round = state['round'];
  if (
    state['rulesetId'] !== M1_DOMAIN_BRIDGE_V6_RULESET_ID ||
    state['status'] !== 'resolved' ||
    state['activation'] !== null ||
    !plainObject(state['outcome']) ||
    state['outcome']['reason'] !== 'round-limit' ||
    !Number.isSafeInteger(round) ||
    (round as number) < 1 ||
    !Array.isArray(events) ||
    events.length !== (round as number) + 2 ||
    !Array.isArray(state['initiativeOrder']) ||
    state['initiativeOrder'].length !== 0 ||
    !Array.isArray(state['units']) ||
    !state['units'].every((unit) => {
      if (!plainObject(unit) || unit['status'] !== 'active') return false;
      const capabilities = unit['capabilities'];
      return (
        plainObject(capabilities) &&
        ['move', 'attack', 'defend', 'retreat'].every(
          (capability) => capabilities[capability] === false,
        )
      );
    }) ||
    !Array.isArray(state['processedCommandIds']) ||
    state['processedCommandIds'].length !== 0
  )
    return false;
  const [started, ...tail] = events;
  const resolved = tail.pop();
  return (
    shape(started, ['type', 'battleId', 'revision', 'seed', 'rulesetId']) &&
    started['type'] === 'battle.started' &&
    started['battleId'] === state['battleId'] &&
    started['revision'] === 0 &&
    started['seed'] === state['seed'] &&
    started['rulesetId'] === state['rulesetId'] &&
    tail.length === round &&
    tail.every(
      (event, index) =>
        shape(event, ['type', 'battleId', 'revision', 'round', 'initiativeOrder']) &&
        event['type'] === 'round.started' &&
        event['battleId'] === state['battleId'] &&
        event['revision'] === 0 &&
        event['round'] === index + 1 &&
        canonicalJson(event['initiativeOrder']) === canonicalJson(state['initiativeOrder']),
    ) &&
    shape(resolved, ['type', 'battleId', 'revision', 'outcome']) &&
    resolved['type'] === 'battle.resolved' &&
    resolved['battleId'] === state['battleId'] &&
    resolved['revision'] === 0 &&
    canonicalJson(resolved['outcome']) === canonicalJson(state['outcome'])
  );
}

function transitionEventsShape(
  started: unknown,
  round: unknown,
  activation: unknown,
  state: Record<string, unknown>,
  stateActivation: Record<string, unknown>,
): boolean {
  return (
    shape(started, ['type', 'battleId', 'revision', 'seed', 'rulesetId']) &&
    started['type'] === 'battle.started' &&
    isEntityId(started['battleId']) &&
    Number.isSafeInteger(started['revision']) &&
    Number.isSafeInteger(started['seed']) &&
    isEntityId(started['rulesetId']) &&
    shape(round, ['type', 'battleId', 'revision', 'round', 'initiativeOrder']) &&
    round['type'] === 'round.started' &&
    isEntityId(round['battleId']) &&
    Number.isSafeInteger(round['revision']) &&
    Number.isSafeInteger(round['round']) &&
    isEntityIdList(round['initiativeOrder']) &&
    shape(activation, ['type', 'battleId', 'revision', 'activationId', 'unitId', 'actionPoints']) &&
    activation['type'] === 'activation.started' &&
    isEntityId(activation['battleId']) &&
    Number.isSafeInteger(activation['revision']) &&
    nonEmpty(activation['activationId']) &&
    isEntityId(activation['unitId']) &&
    Number.isSafeInteger(activation['actionPoints']) &&
    state['status'] === 'active' &&
    started['battleId'] === state['battleId'] &&
    started['revision'] === 0 &&
    started['seed'] === state['seed'] &&
    started['rulesetId'] === state['rulesetId'] &&
    round['battleId'] === state['battleId'] &&
    round['revision'] === 0 &&
    round['round'] === state['round'] &&
    canonicalJson(round['initiativeOrder']) === canonicalJson(state['initiativeOrder']) &&
    activation['battleId'] === state['battleId'] &&
    activation['revision'] === 0 &&
    activation['activationId'] === stateActivation['id'] &&
    activation['unitId'] === stateActivation['unitId'] &&
    activation['actionPoints'] === stateActivation['remainingActionPoints']
  );
}
function battleStateShape(value: unknown): boolean {
  const v3 = plainObject(value) && value['rulesetId'] === M1_DOMAIN_BRIDGE_V6_RULESET_ID;
  if (
    !shape(
      value,
      [
        'schemaVersion',
        'battleId',
        'rulesetId',
        'seed',
        'map',
        'sides',
        'units',
        'random',
        'round',
        'initiativeOrder',
        'turnIndex',
        'activation',
        'revision',
        'processedCommandIds',
        'status',
      ],
      [...(v3 ? ['parties'] : []), 'outcome'],
    ) ||
    value['schemaVersion'] !== 1 ||
    !isEntityId(value['battleId']) ||
    !isEntityId(value['rulesetId']) ||
    !Number.isSafeInteger(value['seed']) ||
    !battleGeometryShape(value) ||
    !Array.isArray(value['units']) ||
    !value['units'].every((unit) => battleUnitShape(unit, value['rulesetId'])) ||
    (v3 &&
      (!Array.isArray(value['parties']) ||
        !value['parties'].every(
          (party) =>
            shape(party, ['id', 'sideId', 'kind'], ['controllerId']) &&
            isEntityId(party['id']) &&
            isEntityId(party['sideId']) &&
            (party['kind'] === 'npc'
              ? party['controllerId'] === undefined
              : party['kind'] === 'player' && isEntityId(party['controllerId'])),
        ))) ||
    (v3 && !threatProfilesUseNpcParties(value['units'], value['parties'])) ||
    !shape(value['random'], ['algorithm', 'value', 'draws']) ||
    value['random']['algorithm'] !== 'xorshift32-v1' ||
    !Number.isSafeInteger(value['random']['value']) ||
    !Number.isSafeInteger(value['random']['draws']) ||
    !Number.isSafeInteger(value['round']) ||
    !isEntityIdList(value['initiativeOrder']) ||
    !Number.isSafeInteger(value['turnIndex']) ||
    !(
      value['activation'] === null ||
      (shape(value['activation'], ['id', 'unitId', 'remainingActionPoints']) &&
        isEntityId(value['activation']['id']) &&
        isEntityId(value['activation']['unitId']) &&
        Number.isSafeInteger(value['activation']['remainingActionPoints']))
    ) ||
    !Number.isSafeInteger(value['revision']) ||
    !isEntityIdList(value['processedCommandIds']) ||
    !['active', 'resolved'].includes(value['status'] as string)
  )
    return false;
  if (
    Object.hasOwn(value, 'outcome') &&
    !(
      value['outcome'] !== null &&
      plainObject(value['outcome']) &&
      (value['outcome']['reason'] === 'round-limit'
        ? shape(value['outcome'], ['reason'])
        : value['outcome']['reason'] === 'last-side-standing' &&
          shape(value['outcome'], ['reason', 'winnerSideId']) &&
          isEntityId(value['outcome']['winnerSideId']))
    )
  )
    return false;
  return true;
}

function capabilitiesShape(value: unknown, rulesetId: unknown): boolean {
  return rulesetId === M1_DOMAIN_BRIDGE_V3_RULESET_ID ||
    rulesetId === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
    rulesetId === M1_DOMAIN_BRIDGE_V5_RULESET_ID ||
    rulesetId === M1_DOMAIN_BRIDGE_V6_RULESET_ID
    ? shape(value, ['move', 'attack', 'defend', 'retreat']) &&
        Object.values(value).every((entry) => typeof entry === 'boolean')
    : value === undefined;
}

function threatProfilesUseNpcParties(units: unknown, parties: unknown): boolean {
  if (!Array.isArray(units) || !Array.isArray(parties)) return false;
  return units.every((unit) => {
    if (!plainObject(unit) || !Object.hasOwn(unit, 'threatProfile')) return true;
    if (unit['threatProfile'] !== 'mill-slam' || typeof unit['partyId'] !== 'string') return false;
    return parties.some(
      (party) => plainObject(party) && party['id'] === unit['partyId'] && party['kind'] === 'npc',
    );
  });
}

function battleUnitShape(value: unknown, rulesetId: unknown): boolean {
  return (
    shape(
      value,
      [
        'id',
        'sideId',
        'position',
        'weaponId',
        'attributes',
        'health',
        'armor',
        'stamina',
        'morale',
        'guarding',
        'status',
        'wounds',
        ...(rulesetId === M1_DOMAIN_BRIDGE_V6_RULESET_ID
          ? ['partyId', 'capabilities', 'skillRanks', 'moralePolicy']
          : rulesetId === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
              rulesetId === M1_DOMAIN_BRIDGE_V5_RULESET_ID
            ? ['capabilities', 'skillRanks', 'moralePolicy']
            : rulesetId === M1_DOMAIN_BRIDGE_V3_RULESET_ID
              ? ['capabilities']
              : []),
      ],
      rulesetId === M1_DOMAIN_BRIDGE_V6_RULESET_ID
        ? ['shieldBraceRank', 'reactionSpent', 'threatProfile', 'threat', 'escapePlan']
        : [],
    ) &&
    capabilitiesShape(value['capabilities'], rulesetId) &&
    tacticalProjectionFieldsShape(value, rulesetId) &&
    isEntityId(value['id']) &&
    isEntityId(value['sideId']) &&
    (rulesetId !== M1_DOMAIN_BRIDGE_V6_RULESET_ID || isEntityId(value['partyId'])) &&
    hexShape(value['position']) &&
    isEntityId(value['weaponId']) &&
    shape(value['attributes'], [
      'accuracy',
      'armor',
      'defense',
      'health',
      'initiative',
      'morale',
      'stamina',
    ]) &&
    Object.values(value['attributes']).every(Number.isSafeInteger) &&
    ['health', 'armor', 'stamina', 'morale'].every((key) => Number.isSafeInteger(value[key])) &&
    typeof value['guarding'] === 'boolean' &&
    ['active', 'dead', 'retreated'].includes(value['status'] as string) &&
    (!Object.hasOwn(value, 'shieldBraceRank') ||
      [1, 2, 3].includes(value['shieldBraceRank'] as number)) &&
    (!Object.hasOwn(value, 'reactionSpent') || typeof value['reactionSpent'] === 'boolean') &&
    (!Object.hasOwn(value, 'threatProfile') || value['threatProfile'] === 'mill-slam') &&
    (!Object.hasOwn(value, 'threat') || combatThreatShape(value['threat'])) &&
    (!Object.hasOwn(value, 'escapePlan') || combatEscapePlanShape(value['escapePlan'])) &&
    Array.isArray(value['wounds']) &&
    value['wounds'].every(
      (wound) =>
        shape(wound, ['sequence', 'severity']) &&
        Number.isSafeInteger(wound['sequence']) &&
        ['minor', 'severe'].includes(wound['severity'] as string),
    )
  );
}
function combatThreatShape(value: unknown): boolean {
  return (
    shape(value, ['targetId', 'targetHex', 'range', 'damage', 'retargeted', 'responseReceived']) &&
    isEntityId(value['targetId']) &&
    hexShape(value['targetHex']) &&
    value['range'] === 2 &&
    shape(value['damage'], ['minimum', 'maximum']) &&
    Number.isSafeInteger(value['damage']['minimum']) &&
    Number.isSafeInteger(value['damage']['maximum']) &&
    typeof value['retargeted'] === 'boolean' &&
    typeof value['responseReceived'] === 'boolean'
  );
}
function combatEscapePlanShape(value: unknown): boolean {
  return (
    shape(value, ['exit', 'path', 'safe']) &&
    hexShape(value['exit']) &&
    Array.isArray(value['path']) &&
    value['path'].every(hexShape) &&
    typeof value['safe'] === 'boolean'
  );
}
function mapShape(value: unknown, tactical = false): boolean {
  return (
    shape(value, [
      'hexes',
      'blocked',
      ...(tactical && plainObject(value) && Object.hasOwn(value, 'tiles') ? ['tiles'] : []),
    ]) &&
    (!plainObject(value) ||
      value['tiles'] === undefined ||
      (Array.isArray(value['tiles']) &&
        value['tiles'].every(
          (tile) =>
            shape(tile, ['q', 'r', 'height', 'terrain']) &&
            Number.isSafeInteger(tile['q']) &&
            Number.isSafeInteger(tile['r']) &&
            [0, 1, 2].includes(tile['height'] as number) &&
            ['plain', 'mud', 'fire'].includes(tile['terrain'] as string),
        ))) &&
    Array.isArray(value['hexes']) &&
    value['hexes'].every(hexShape) &&
    Array.isArray(value['blocked']) &&
    value['blocked'].every(hexShape)
  );
}
function hexShape(value: unknown): boolean {
  return (
    shape(value, ['q', 'r']) && Number.isSafeInteger(value['q']) && Number.isSafeInteger(value['r'])
  );
}
function completedEncounterShape(value: unknown): boolean {
  if (
    !shape(value, [
      'bindingId',
      'terminalRevision',
      'terminalSourceEventId',
      'dispositions',
      'finalStateDigest',
      'outcomeDigest',
      'commandDigest',
      'finalizeEvidenceKey',
    ]) ||
    !isEntityId(value['bindingId']) ||
    !Number.isSafeInteger(value['terminalRevision']) ||
    !isEntityId(value['terminalSourceEventId']) ||
    !Array.isArray(value['dispositions']) ||
    !value['dispositions'].every((entry) => dispositionShape(entry)) ||
    !['finalStateDigest', 'outcomeDigest', 'commandDigest', 'finalizeEvidenceKey'].every((key) =>
      nonEmpty(value[key]),
    )
  )
    return false;
  return true;
}
function dispositionShape(value: unknown): boolean {
  if (
    !shape(
      value,
      ['id', 'sourceEventId', 'unitId', 'characterId', 'status', 'location'],
      ['missingEntryId', 'captureOutcomeId', 'seizedItems'],
    ) ||
    !['id', 'sourceEventId', 'unitId', 'characterId'].every((key) => isEntityId(value[key])) ||
    !['PRESENT', 'MISSING', 'DEAD', 'CAPTIVE'].includes(value['status'] as string) ||
    !locationShape(value['location']) ||
    (Object.hasOwn(value, 'missingEntryId') && !isEntityId(value['missingEntryId'])) ||
    (Object.hasOwn(value, 'captureOutcomeId') && !isEntityId(value['captureOutcomeId']))
  )
    return false;
  if (value['status'] === 'MISSING' && !isEntityId(value['missingEntryId'])) return false;
  if (
    value['status'] === 'CAPTIVE' &&
    (!isEntityId(value['captureOutcomeId']) || !seizedItemsShape(value['seizedItems']))
  )
    return false;
  return (
    !Object.hasOwn(value, 'seizedItems') ||
    (value['status'] === 'CAPTIVE' && seizedItemsShape(value['seizedItems']))
  );
}

function seizedItemsShape(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        shape(item, ['itemId', 'toContainerId', 'authorizationId']) &&
        ['itemId', 'toContainerId', 'authorizationId'].every((key) => isEntityId(item[key])),
    )
  );
}
function itemShapeForEncounter(value: unknown): boolean {
  return isItemInstanceShape(value);
}
function isEntityIdList(value: unknown): boolean {
  return Array.isArray(value) && value.every(isEntityId);
}
function nonEmpty(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}
function vitalsShapeForBinding(value: unknown): boolean {
  return (
    shape(
      value,
      [
        'characterId',
        'sourceId',
        'maximumHealth',
        'currentHealth',
        'healthCarry',
        'maximumStamina',
        'currentStamina',
        'staminaCarry',
      ],
      ['morale', 'moraleCarry'],
    ) &&
    ['characterId', 'sourceId'].every((key) => isEntityId(value[key])) &&
    ['maximumHealth', 'currentHealth', 'maximumStamina', 'currentStamina'].every((key) =>
      Number.isSafeInteger(value[key]),
    ) &&
    isExactInteger(value['healthCarry']) &&
    isExactInteger(value['staminaCarry']) &&
    (!Object.hasOwn(value, 'morale') || Number.isSafeInteger(value['morale'])) &&
    (!Object.hasOwn(value, 'moraleCarry') ||
      (Object.hasOwn(value, 'morale') && isExactInteger(value['moraleCarry'])))
  );
}
function projectionShape(value: unknown): boolean {
  return (
    shape(value, [
      'schemaVersion',
      'catalogueVersion',
      'domainRulesetId',
      'combatRulesetId',
      'characterId',
      'weapon',
      'armor',
      'conditionIds',
      'contributingPerkIds',
      'attributes',
      'current',
      'morale',
      ...projectionAdditionalKeys(value),
    ]) &&
    projectionVersionShape(value) &&
    isEntityId(value['catalogueVersion']) &&
    isEntityId(value['domainRulesetId']) &&
    isEntityId(value['characterId']) &&
    projectionEquipmentShape(value) &&
    isEntityIdList(value['conditionIds']) &&
    isEntityIdList(value['contributingPerkIds']) &&
    shape(value['attributes'], [
      'accuracy',
      'armor',
      'defense',
      'health',
      'initiative',
      'stamina',
      'morale',
    ]) &&
    Object.values(value['attributes']).every(Number.isSafeInteger) &&
    shape(value['current'], ['health', 'armor', 'stamina', 'morale']) &&
    Object.values(value['current']).every(Number.isSafeInteger) &&
    moraleProjectionShape(value['morale'])
  );
}

function projectionEquipmentShape(value: Record<string, unknown>): boolean {
  return (
    (((value['schemaVersion'] === 3 ||
      value['schemaVersion'] === 4 ||
      value['schemaVersion'] === 5 ||
      value['schemaVersion'] === 6) &&
      shape(value['weapon'], [
        'profileId',
        'itemId',
        'definitionId',
        'requiredOffHandItemId',
        'skillId',
      ]) &&
      value['weapon']['profileId'] === 'fists' &&
      ['itemId', 'definitionId', 'requiredOffHandItemId', 'skillId'].every(
        (key) => (value['weapon'] as Record<string, unknown>)[key] === null,
      )) ||
      (shape(value['weapon'], [
        'itemId',
        'requiredOffHandItemId',
        'definitionId',
        'profileId',
        'skillId',
      ]) &&
        isEntityId(value['weapon']['itemId']) &&
        (value['weapon']['requiredOffHandItemId'] === null ||
          isEntityId(value['weapon']['requiredOffHandItemId'])) &&
        isEntityId(value['weapon']['definitionId']) &&
        ['bow', 'great-weapon', 'raider', 'spear', 'sword-shield'].includes(
          value['weapon']['profileId'] as string,
        ) &&
        isEntityId(value['weapon']['skillId']))) &&
    Array.isArray(value['armor']) &&
    value['armor'].every(
      (entry) =>
        shape(entry, ['itemId', 'definitionId', 'slot', 'maximumArmor', 'currentArmor']) &&
        isEntityId(entry['itemId']) &&
        isEntityId(entry['definitionId']) &&
        ['HEAD', 'BODY'].includes(entry['slot'] as string) &&
        Number.isSafeInteger(entry['maximumArmor']) &&
        Number.isSafeInteger(entry['currentArmor']),
    )
  );
}

function moraleProjectionShape(value: unknown): boolean {
  if (
    !shape(value, [
      'policyVersion',
      'persistentSourceId',
      'persistentBefore',
      'actualInitialTactical',
      'partyId',
      'leader',
      'overflowModifier',
    ]) ||
    value['policyVersion'] !== 's02-combat-morale-1' ||
    !isEntityId(value['persistentSourceId']) ||
    !Number.isSafeInteger(value['persistentBefore']) ||
    !Number.isSafeInteger(value['actualInitialTactical']) ||
    !isEntityId(value['partyId']) ||
    !Number.isSafeInteger(value['overflowModifier'])
  )
    return false;
  const leader = value['leader'];
  return (
    shape(leader, [
      'schemaVersion',
      'kind',
      'catalogueVersion',
      'rulesetId',
      'effectiveLeaderId',
      'contributingPerkIds',
      'startingMorale',
    ]) &&
    leader['schemaVersion'] === 1 &&
    leader['kind'] === 'LEADER_GROUP' &&
    isEntityId(leader['catalogueVersion']) &&
    isEntityId(leader['rulesetId']) &&
    isEntityId(leader['effectiveLeaderId']) &&
    isEntityIdList(leader['contributingPerkIds']) &&
    Number.isSafeInteger(leader['startingMorale'])
  );
}

/** Frozen v4 campaign inputs deliberately have no mapped learned actions. */
function tacticalProjectionFieldsShape(
  value: Record<string, unknown>,
  rulesetId: unknown,
): boolean {
  return (
    (rulesetId !== M1_DOMAIN_BRIDGE_V4_RULESET_ID &&
      rulesetId !== M1_DOMAIN_BRIDGE_V5_RULESET_ID &&
      rulesetId !== M1_DOMAIN_BRIDGE_V6_RULESET_ID) ||
    (shape(value['skillRanks'], []) &&
      ['human', 'beast', 'steady'].includes(value['moralePolicy'] as string))
  );
}

function bindingNeedsMemberMatch(value: Record<string, unknown>): boolean {
  const ruleset = (value['setup'] as Record<string, unknown>)['rulesetId'];
  return (
    value['version'] === FIRST_HUNT_WORLD_BINDING_VERSION ||
    ruleset === M1_DOMAIN_BRIDGE_V3_RULESET_ID ||
    ruleset === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
    ruleset === M1_DOMAIN_BRIDGE_V5_RULESET_ID ||
    ruleset === M1_DOMAIN_BRIDGE_V6_RULESET_ID
  );
}
function projectionAdditionalKeys(value: unknown): readonly string[] {
  if (!plainObject(value)) return [];
  if (value['schemaVersion'] === 4 || value['schemaVersion'] === 5 || value['schemaVersion'] === 6)
    return ['capabilities', 'skillRanks', 'moralePolicy'];
  return value['schemaVersion'] === 3 ? ['capabilities'] : [];
}
function projectionVersionShape(value: Record<string, unknown>): boolean {
  const version = value['schemaVersion'];
  const expected =
    version === 6
      ? M1_DOMAIN_BRIDGE_V6_RULESET_ID
      : version === 5
        ? M1_DOMAIN_BRIDGE_V5_RULESET_ID
        : version === 4
          ? M1_DOMAIN_BRIDGE_V4_RULESET_ID
          : version === 3
            ? M1_DOMAIN_BRIDGE_V3_RULESET_ID
            : M1_DOMAIN_BRIDGE_RULESET_ID;
  return (
    [2, 3, 4, 5, 6].includes(version as number) &&
    value['combatRulesetId'] === expected &&
    capabilitiesShape(value['capabilities'], expected) &&
    tacticalProjectionFieldsShape(value, expected) &&
    ((version !== 4 && version !== 5 && version !== 6) || value['moralePolicy'] === 'human')
  );
}

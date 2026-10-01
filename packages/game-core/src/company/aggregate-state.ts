import { canonicalJson, plainObject } from './input.js';
import type { CompanyCombatAggregateState } from './combat-aggregate.js';
import { createCombatEncounterApplication } from './combat-aggregate.js';
import {
  ENCOUNTER_BINDING_VERSION,
  FIRST_HUNT_WORLD_BINDING_VERSION,
} from './encounter-binding.js';
import { assertBattleState } from '../combat/engine.js';
import { startBattleV2 } from '../combat/runtime-v2.js';
import {
  M1_DOMAIN_BRIDGE_RULESET_ID,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  type BattleSetupV2,
} from '../combat/setup-v2.js';
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
    !value['participants'].every(
      (entry) =>
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
        entry['equipment'].every(itemShapeForEncounter),
    ) ||
    !setupV2Shape(value['setup']) ||
    !transitionShape(value['initial']) ||
    !Number.isSafeInteger(value['lastAppliedRevision']) ||
    (worldBinding &&
      (!Array.isArray(value['worldParticipants']) ||
        value['worldParticipants'].length === 0 ||
        !value['worldParticipants'].every(
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
            ]) &&
            ['entityId', 'sourceId', 'unitId', 'sideId', 'weaponId'].every((key) =>
              isEntityId(entry[key]),
            ) &&
            entry['entityId'] === entry['unitId'] &&
            hexShape(entry['position']) &&
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
            Object.values(entry['initialPools']).every(Number.isSafeInteger),
        ))) ||
    (worldBinding && !worldBindingMembersMatch(value))
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

function worldBindingMembersMatch(value: Record<string, unknown>): boolean {
  const participants = value['participants'];
  const worldParticipants = value['worldParticipants'];
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
        position: participant['position'],
        weaponId: weapon['profileId'],
        attributes: projection['attributes'],
        initialPools: projection['current'],
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
        position: participant['position'],
        weaponId: participant['weaponId'],
        attributes: participant['attributes'],
        initialPools: participant['initialPools'],
      }) === canonicalJson(setupUnit)
    );
  });
  if (!participantsMatch) return false;
  try {
    return (
      canonicalJson(startBattleV2(setup as unknown as BattleSetupV2)) ===
      canonicalJson(value['initial'])
    );
  } catch {
    return false;
  }
}

function setupV2Shape(value: unknown): boolean {
  if (
    !shape(value, ['schemaVersion', 'battleId', 'rulesetId', 'seed', 'map', 'sides', 'units']) ||
    value['schemaVersion'] !== 2 ||
    !isEntityId(value['battleId']) ||
    (value['rulesetId'] !== M1_DOMAIN_BRIDGE_RULESET_ID &&
      value['rulesetId'] !== M1_DOMAIN_BRIDGE_V2_RULESET_ID) ||
    !Number.isSafeInteger(value['seed']) ||
    !mapShape(value['map']) ||
    !Array.isArray(value['sides']) ||
    value['sides'].length !== 2 ||
    !value['sides'].every(
      (entry) =>
        shape(entry, ['id', 'retreatHexes']) &&
        isEntityId(entry['id']) &&
        Array.isArray(entry['retreatHexes']) &&
        entry['retreatHexes'].every(hexShape),
    ) ||
    !Array.isArray(value['units']) ||
    !value['units'].every(
      (entry) =>
        shape(entry, ['id', 'sideId', 'position', 'weaponId', 'attributes', 'initialPools']) &&
        isEntityId(entry['id']) &&
        isEntityId(entry['sideId']) &&
        hexShape(entry['position']) &&
        isEntityId(entry['weaponId']) &&
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
        Object.values(entry['initialPools']).every(Number.isSafeInteger),
    )
  )
    return false;
  return true;
}

function transitionShape(value: unknown): boolean {
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
      ['outcome'],
    ) ||
    value['schemaVersion'] !== 1 ||
    !isEntityId(value['battleId']) ||
    !isEntityId(value['rulesetId']) ||
    !Number.isSafeInteger(value['seed']) ||
    !mapShape(value['map']) ||
    !Array.isArray(value['sides']) ||
    value['sides'].length !== 2 ||
    !value['sides'].every(
      (entry) =>
        shape(entry, ['id', 'retreatHexes']) &&
        isEntityId(entry['id']) &&
        Array.isArray(entry['retreatHexes']) &&
        entry['retreatHexes'].every(hexShape),
    ) ||
    !Array.isArray(value['units']) ||
    !value['units'].every(battleUnitShape) ||
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

function battleUnitShape(value: unknown): boolean {
  return (
    shape(value, [
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
    ]) &&
    isEntityId(value['id']) &&
    isEntityId(value['sideId']) &&
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
    Array.isArray(value['wounds']) &&
    value['wounds'].every(
      (wound) =>
        shape(wound, ['sequence', 'severity']) &&
        Number.isSafeInteger(wound['sequence']) &&
        ['minor', 'severe'].includes(wound['severity'] as string),
    )
  );
}
function mapShape(value: unknown): boolean {
  return (
    shape(value, ['hexes', 'blocked']) &&
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
      ['morale'],
    ) &&
    ['characterId', 'sourceId'].every((key) => isEntityId(value[key])) &&
    ['maximumHealth', 'currentHealth', 'maximumStamina', 'currentStamina'].every((key) =>
      Number.isSafeInteger(value[key]),
    ) &&
    isExactInteger(value['healthCarry']) &&
    isExactInteger(value['staminaCarry']) &&
    (!Object.hasOwn(value, 'morale') || Number.isSafeInteger(value['morale']))
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
    ]) &&
    value['schemaVersion'] === 2 &&
    isEntityId(value['catalogueVersion']) &&
    isEntityId(value['domainRulesetId']) &&
    value['combatRulesetId'] === 'm1-domain-bridge-v1' &&
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
    shape(value['weapon'], [
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
    isEntityId(value['weapon']['skillId']) &&
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

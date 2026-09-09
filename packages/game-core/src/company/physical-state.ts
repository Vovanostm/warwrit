import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { canonicalJson, snapshotJson } from './input.js';
import { sameLocation } from './lifecycle-state.js';
import type { LifecycleCharacter, LifecycleState } from './lifecycle-types.js';
import type { LocationRef, OwnerRef } from './model.js';
import { isEntityId, isExactInteger } from './values.js';
import type { CampaignTick } from './values.js';
import { PHYSICAL_POLICY_VERSION, PHYSICAL_SCHEMA_VERSION } from './physical-types.js';
import type {
  CompanyPhysicalState,
  ConditionInstance,
  ItemAccessEvidence,
  ItemInstance,
  LegacyConditionBinding,
  PhysicalContainer,
  PhysicalError,
  PhysicalEvidence,
  PhysicalInitialization,
  PhysicalVitals,
} from './physical-types.js';
import type { EconomyContext } from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';

export class PhysicalViolation extends Error {
  constructor(readonly code: PhysicalError) {
    super(code);
  }
}
export function requirePhysical(condition: unknown, code: PhysicalError): asserts condition {
  if (!condition) throw new PhysicalViolation(code);
}
export function physicalId(...parts: readonly string[]): string {
  const id = JSON.stringify(parts);
  requirePhysical(isEntityId(id), 'INVALID_SOURCE');
  return id;
}
export function ownPhysical<T>(value: T): T {
  const result = snapshotJson(value);
  requirePhysical(result !== undefined, 'INVALID_SOURCE');
  return result as unknown as T;
}
export function itemDefinition(item: ItemInstance) {
  const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === item.definitionId);
  requirePhysical(definition?.enabled, 'INVALID_STATE');
  return definition;
}
export function conditionDefinition(instance: ConditionInstance) {
  const definition = COMPANY_CATALOGUE.conditions.find(
    (entry) => entry.id === instance.definitionId,
  );
  requirePhysical(definition, 'INVALID_STATE');
  return definition;
}
export function physicalItem(state: CompanyPhysicalState, itemId: string): ItemInstance {
  const item = state.items.find((entry) => entry.itemId === itemId);
  requirePhysical(item && item.tombstone === null, 'CONTACT_OR_ACCESS_REQUIRED');
  return item;
}
export function physicalContainer(
  state: CompanyPhysicalState,
  containerId: string,
): PhysicalContainer {
  const container = state.containers.find((entry) => entry.containerId === containerId);
  requirePhysical(container && container.closed === null, 'CONTACT_OR_ACCESS_REQUIRED');
  return container;
}
export function physicalVitals(state: CompanyPhysicalState, characterId: string): PhysicalVitals {
  const vitals = state.vitals.find((entry) => entry.characterId === characterId);
  requirePhysical(vitals, 'INVALID_STATE');
  return vitals;
}
export function replaceItem(state: CompanyPhysicalState, item: ItemInstance): CompanyPhysicalState {
  return {
    ...state,
    items: state.items.map((entry) => (entry.itemId === item.itemId ? item : entry)),
  };
}
export function replaceContainer(
  state: CompanyPhysicalState,
  container: PhysicalContainer,
): CompanyPhysicalState {
  return {
    ...state,
    containers: state.containers.map((entry) =>
      entry.containerId === container.containerId ? container : entry,
    ),
  };
}
export function replaceVitals(
  state: CompanyPhysicalState,
  vitals: PhysicalVitals,
): CompanyPhysicalState {
  return {
    ...state,
    vitals: state.vitals.map((entry) =>
      entry.characterId === vitals.characterId ? vitals : entry,
    ),
  };
}
export function activeConditions(
  state: CompanyPhysicalState,
  characterId: string,
): readonly ConditionInstance[] {
  return state.conditions.filter(
    (entry) => entry.characterId === characterId && entry.resolvedAt === null,
  );
}
export function activeConditionDefinitionIds(
  state: CompanyPhysicalState,
  characterId: string,
): readonly string[] {
  return [
    ...new Set(activeConditions(state, characterId).map((entry) => entry.definitionId)),
  ].sort();
}
export function syncLifecycleConditions(
  lifecycle: LifecycleState,
  physical: CompanyPhysicalState,
): LifecycleState {
  return {
    ...lifecycle,
    characters: lifecycle.characters.map((character) => ({
      ...character,
      conditionIds: activeConditionDefinitionIds(physical, character.identity.characterId),
    })),
  };
}
export function containerWeightG(state: CompanyPhysicalState, containerId: string): number {
  return state.items
    .filter((item) => item.containerId === containerId && item.tombstone === null)
    .reduce((sum, item) => sum + itemDefinition(item).weightG * item.quantity, 0);
}
export function availableContainerG(state: CompanyPhysicalState, containerId: string): number {
  const container = physicalContainer(state, containerId);
  return container.capacityG - containerWeightG(state, containerId);
}
function ownerExists(lifecycle: LifecycleState, owner: OwnerRef): boolean {
  if (owner.kind === 'CHARACTER' || owner.kind === 'ESTATE')
    return lifecycle.characters.some((character) => character.identity.characterId === owner.id);
  if (owner.kind === 'COMPANY') return owner.id === lifecycle.companyId;
  return owner.kind === 'WORLD' && owner.id === lifecycle.worldId;
}
function locationValid(location: LocationRef): boolean {
  if (location.kind === 'AT') return isEntityId(location.siteId) && isEntityId(location.areaId);
  return (
    isEntityId(location.segmentId) &&
    isEntityId(location.from) &&
    isEntityId(location.to) &&
    isExactInteger(location.startedAt) &&
    isExactInteger(location.arrivalNotBefore) &&
    BigInt(location.arrivalNotBefore) >= BigInt(location.startedAt)
  );
}
function occurrenceBindings(
  characters: readonly LifecycleCharacter[],
  bindings: readonly LegacyConditionBinding[],
): readonly ConditionInstance[] {
  const result: ConditionInstance[] = [];
  for (const character of characters) {
    const expected = [...character.conditionIds].sort();
    const actual = bindings
      .filter((binding) => binding.characterId === character.identity.characterId)
      .sort((a, b) =>
        a.definitionId === b.definitionId
          ? a.conditionId < b.conditionId
            ? -1
            : 1
          : a.definitionId < b.definitionId
            ? -1
            : 1,
      );
    requirePhysical(
      actual.length === expected.length &&
        actual
          .map((binding) => binding.definitionId)
          .sort()
          .join('\u0000') === expected.join('\u0000'),
      'INVALID_STATE',
    );
    for (const binding of actual) {
      const definition = COMPANY_CATALOGUE.conditions.find(
        (entry) => entry.id === binding.definitionId,
      );
      requirePhysical(definition, 'INVALID_STATE');
      const deadline = binding.deadlineTick ?? null;
      requirePhysical(
        isEntityId(binding.conditionId) &&
          isEntityId(binding.sourceEventId) &&
          isEntityId(binding.causeId) &&
          isExactInteger(binding.onsetTick) &&
          (deadline === null || isExactInteger(deadline)) &&
          (definition.category === 'CRITICAL') === (deadline !== null),
        'INVALID_STATE',
      );
      result.push({
        conditionId: binding.conditionId,
        characterId: binding.characterId,
        definitionId: binding.definitionId,
        sourceEventId: binding.sourceEventId,
        causeId: binding.causeId,
        onsetTick: binding.onsetTick,
        deadlineTick: deadline,
        care: binding.care ?? null,
        recoveryTicks: binding.recoveryTicks ?? '0',
        resolvedAt: binding.resolvedAt ?? null,
        resolutionSourceId: binding.resolutionSourceId ?? null,
        scarId: binding.scarId ?? null,
      });
    }
  }
  const allowed = new Set<string>(characters.map((character) => character.identity.characterId));
  requirePhysical(
    bindings.every((binding) => allowed.has(binding.characterId)),
    'INVALID_STATE',
  );
  return result;
}
/**
 * Explicit V1 compatibility loader. Non-empty legacy condition definition lists are never
 * reinterpreted as instance IDs: each occurrence needs source/onset/instance bindings.
 */
export function createCompanyPhysicalState(
  lifecycle: LifecycleState,
  initialization: PhysicalInitialization = {},
): CompanyPhysicalState {
  const conditions = occurrenceBindings(
    lifecycle.characters,
    initialization.conditionBindings ?? [],
  );
  const knownConditions = occurrenceBindings(
    lifecycle.knowledge.characters,
    initialization.knownConditionBindings ?? [],
  );
  const state: CompanyPhysicalState = {
    schemaVersion: PHYSICAL_SCHEMA_VERSION,
    policyVersion: PHYSICAL_POLICY_VERSION,
    processedTick: lifecycle.campaignTick,
    items: ownPhysical(initialization.items ?? []),
    containers: ownPhysical(initialization.containers ?? []),
    conditions,
    vitals: ownPhysical(initialization.vitals ?? []),
    custody: [],
    food: [],
    foodCarry: [],
    careHandovers: [],
    sourceEffects: [],
    knowledge: {
      itemSnapshots: ownPhysical(initialization.knownItems ?? []),
      conditionSnapshots: knownConditions,
      vitalSnapshots: ownPhysical(initialization.knownVitals ?? []),
      containerSnapshots: ownPhysical(initialization.knownContainers ?? []),
    },
  };
  validatePhysicalState({ lifecycle, physical: state }, false);
  return state;
}
function evidenceBody(fact: PhysicalEvidence): string {
  const { id: _id, revision: _revision, ...body } = fact;
  return canonicalJson(body);
}
export function physicalEffectKey(fact: PhysicalEvidence): string {
  const subject =
    'itemId' in fact
      ? ['item', fact.itemId]
      : 'characterId' in fact
        ? ['character', fact.characterId]
        : 'membershipId' in fact
          ? ['membership', fact.membershipId]
          : 'containerId' in fact
            ? ['container', fact.containerId]
            : fact.kind === 'PHYSICAL_OBSERVATION'
              ? [fact.subject.kind, fact.subject.id]
              : fact.kind === 'LOOT_AUTHORIZATION'
                ? ['outcome', fact.outcomeId]
                : ['fact', fact.id];
  return canonicalJson([fact.kind, fact.sourceEventId, subject]);
}
export function recordPhysicalSource(
  state: CompanyPhysicalState,
  fact: PhysicalEvidence,
): { readonly state: CompanyPhysicalState; readonly replayed: boolean } {
  const key = physicalEffectKey(fact);
  const requestKey = evidenceBody(fact);
  const previous = state.sourceEffects.find((entry) => entry.key === key);
  if (previous) {
    requirePhysical(previous.requestKey === requestKey, 'IDEMPOTENCY_CONFLICT');
    return { state, replayed: true };
  }
  return {
    state: {
      ...state,
      sourceEffects: [...state.sourceEffects, { key, requestKey }],
    },
    replayed: false,
  };
}
export function physicalFact<K extends PhysicalEvidence['kind']>(
  context: EconomyContext,
  id: string,
  kind: K,
  atTick: CampaignTick = context.atTick,
): Extract<PhysicalEvidence, { kind: K }> {
  const matches = (context.physicalFacts ?? []).filter((fact) => fact.id === id);
  requirePhysical(matches.length === 1, 'INVALID_SOURCE');
  const fact = matches[0]!;
  requirePhysical(
    fact.kind === kind &&
      isEntityId(fact.id) &&
      isEntityId(fact.sourceEventId) &&
      fact.companyId === context.companyId &&
      fact.worldId === context.worldId &&
      fact.revision === context.canonicalRevision &&
      fact.atTick === atTick &&
      fact.version === PHYSICAL_POLICY_VERSION &&
      Number.isSafeInteger(fact.ordinal) &&
      fact.ordinal >= 0,
    'INVALID_SOURCE',
  );
  return fact as Extract<PhysicalEvidence, { kind: K }>;
}
export function uniquePhysicalFact<K extends PhysicalEvidence['kind']>(
  context: EconomyContext,
  kind: K,
  predicate: (fact: Extract<PhysicalEvidence, { kind: K }>) => boolean,
  atTick: CampaignTick = context.atTick,
): Extract<PhysicalEvidence, { kind: K }> {
  const matches = (context.physicalFacts ?? []).filter(
    (fact): fact is Extract<PhysicalEvidence, { kind: K }> =>
      fact.kind === kind && predicate(fact as Extract<PhysicalEvidence, { kind: K }>),
  );
  requirePhysical(matches.length === 1, 'INVALID_SOURCE');
  const fact = matches[0]!;
  return physicalFact(context, fact.id, kind, atTick);
}
export function requireItemAccess(
  root: MaterializedCompanyState,
  context: EconomyContext,
  evidenceId: string,
  purpose: ItemAccessEvidence['purpose'],
  containerIds: readonly string[],
  itemIds: readonly string[],
): ItemAccessEvidence {
  const fact = physicalFact(context, evidenceId, 'ITEM_ACCESS');
  requirePhysical(
    fact.purpose === purpose &&
      containerIds.every((id) => fact.containerIds.includes(id)) &&
      itemIds.every((id) => fact.itemIds.includes(id)),
    'INVALID_SOURCE',
  );
  const operator = root.lifecycle.characters.find(
    (character) => character.identity.characterId === fact.operatorId,
  );
  requirePhysical(
    operator &&
      context.contactIds.includes(fact.operatorId) &&
      operator.presence.availability === 'AVAILABLE' &&
      operator.presence.encounterBindingId === null &&
      operator.presence.location.kind === 'AT' &&
      sameLocation(operator.presence.location, fact.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  for (const containerId of containerIds) {
    const container = physicalContainer(root.physical, containerId);
    requirePhysical(
      container.location.kind === 'AT' && sameLocation(container.location, fact.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
  }
  return fact;
}
export function validatePhysicalState(
  root: Pick<MaterializedCompanyState, 'lifecycle' | 'physical'>,
  requireTickAlignment = true,
): void {
  const { lifecycle, physical } = root;
  requirePhysical(
    physical.schemaVersion === PHYSICAL_SCHEMA_VERSION &&
      physical.policyVersion === PHYSICAL_POLICY_VERSION &&
      isExactInteger(physical.processedTick) &&
      (!requireTickAlignment || physical.processedTick === lifecycle.campaignTick),
    'INVALID_STATE',
  );
  for (const ids of [
    physical.items.map((entry) => entry.itemId),
    physical.containers.map((entry) => entry.containerId),
    physical.conditions.map((entry) => entry.conditionId),
    physical.vitals.map((entry) => entry.characterId),
    physical.custody.map((entry) => entry.characterId),
    physical.foodCarry.map((entry) => entry.membershipId),
    physical.sourceEffects.map((entry) => entry.key),
  ])
    requirePhysical(new Set(ids).size === ids.length, 'INVALID_STATE');
  for (const container of physical.containers) {
    requirePhysical(
      isEntityId(container.containerId) &&
        Number.isSafeInteger(container.capacityG) &&
        container.capacityG >= 0 &&
        locationValid(container.location) &&
        ownerExists(lifecycle, container.custodian),
      'INVALID_STATE',
    );
    if (container.carrier?.kind === 'CHARACTER')
      requirePhysical(
        lifecycle.characters.some(
          (character) => character.identity.characterId === container.carrier!.id,
        ),
        'INVALID_STATE',
      );
    if (container.carrier?.kind === 'PARTY')
      requirePhysical(
        lifecycle.parties.some((party) => party.partyId === container.carrier!.id),
        'INVALID_STATE',
      );
    requirePhysical(
      containerWeightG(physical, container.containerId) <= container.capacityG,
      'CAPACITY',
    );
  }
  for (const item of physical.items) {
    const definition = itemDefinition(item);
    requirePhysical(
      isEntityId(item.itemId) &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= definition.stackMax &&
        Number.isSafeInteger(item.currentCondition) &&
        Number.isSafeInteger(item.maximumCondition) &&
        item.maximumCondition > 0 &&
        item.currentCondition >= 0 &&
        item.currentCondition <= item.maximumCondition &&
        ownerExists(lifecycle, item.owner) &&
        Number.isSafeInteger(item.provenance.ordinal) &&
        item.provenance.ordinal >= 0,
      'INVALID_STATE',
    );
    requirePhysical((item.containerId === null) === (item.tombstone !== null), 'INVALID_STATE');
    if (item.containerId !== null)
      requirePhysical(
        physical.containers.some((container) => container.containerId === item.containerId),
        'INVALID_STATE',
      );
    if (definition.stackMax === 1) requirePhysical(item.quantity === 1, 'INVALID_STATE');
    if (item.equipped) {
      requirePhysical(item.containerId !== null && item.tombstone === null, 'INVALID_STATE');
      const carrier = physical.containers.find(
        (container) => container.containerId === item.containerId,
      )?.carrier;
      requirePhysical(
        carrier?.kind === 'CHARACTER' && carrier.id === item.equipped.characterId,
        'INVALID_STATE',
      );
    }
  }
  for (const character of lifecycle.characters) {
    const expected = activeConditionDefinitionIds(physical, character.identity.characterId);
    requirePhysical(
      [...character.conditionIds].sort().join('\u0000') === expected.join('\u0000'),
      'INVALID_STATE',
    );
    const species = COMPANY_CATALOGUE.species.find(
      (entry) => entry.id === character.identity.speciesId && entry.enabled,
    );
    const body = species && COMPANY_CATALOGUE.bodies.find((entry) => entry.id === species.bodyId);
    requirePhysical(body, 'INVALID_STATE');
    // All carried containers share this body's allowance; equipment is already in that weight.
    const carried = physical.containers.filter(
      (container) =>
        container.closed === null &&
        container.carrier?.kind === 'CHARACTER' &&
        container.carrier.id === character.identity.characterId,
    );
    const weight = carried.reduce(
      (sum, container) => sum + containerWeightG(physical, container.containerId),
      0,
    );
    requirePhysical(Number.isSafeInteger(weight) && weight <= body.capacityG, 'CAPACITY');
    const equipped = physical.items.filter(
      (item) =>
        item.equipped?.characterId === character.identity.characterId && item.tombstone === null,
    );
    for (const slot of ['HEAD', 'BODY', 'MAIN_HAND', 'OFF_HAND'] as const)
      requirePhysical(
        equipped.filter((item) => item.equipped!.slots.includes(slot)).length <= 1,
        'INVALID_STATE',
      );
    requirePhysical(
      equipped.filter((item) => item.equipped!.slots.includes('BELT')).length <= body.beltSlots,
      'INVALID_STATE',
    );
  }
  for (const condition of physical.conditions) {
    const definition = conditionDefinition(condition);
    requirePhysical(
      lifecycle.characters.some(
        (character) => character.identity.characterId === condition.characterId,
      ) &&
        isExactInteger(condition.onsetTick) &&
        isExactInteger(condition.recoveryTicks) &&
        BigInt(condition.recoveryTicks) >= 0n &&
        (definition.category === 'CRITICAL') === (condition.deadlineTick !== null) &&
        (condition.deadlineTick === null || isExactInteger(condition.deadlineTick)) &&
        (condition.resolvedAt === null || isExactInteger(condition.resolvedAt)),
      'INVALID_STATE',
    );
  }
  for (const vitals of physical.vitals)
    requirePhysical(
      lifecycle.characters.some(
        (character) => character.identity.characterId === vitals.characterId,
      ) &&
        Number.isSafeInteger(vitals.maximumHealth) &&
        vitals.maximumHealth > 0 &&
        Number.isSafeInteger(vitals.currentHealth) &&
        vitals.currentHealth >= 0 &&
        vitals.currentHealth <= vitals.maximumHealth &&
        Number.isSafeInteger(vitals.maximumStamina) &&
        vitals.maximumStamina > 0 &&
        Number.isSafeInteger(vitals.currentStamina) &&
        vitals.currentStamina >= 0 &&
        vitals.currentStamina <= vitals.maximumStamina &&
        isExactInteger(vitals.healthCarry) &&
        isExactInteger(vitals.staminaCarry),
      'INVALID_STATE',
    );
  for (const entry of physical.foodCarry)
    requirePhysical(
      lifecycle.memberships.some((membership) => membership.membershipId === entry.membershipId) &&
        isExactInteger(entry.tickUnits) &&
        BigInt(entry.tickUnits) >= 0n,
      'INVALID_STATE',
    );
  for (const custody of physical.custody)
    requirePhysical(
      lifecycle.characters.some(
        (character) => character.identity.characterId === custody.characterId,
      ) &&
        ownerExists(lifecycle, custody.custodian) &&
        locationValid(custody.location) &&
        isExactInteger(custody.sinceTick),
      'INVALID_STATE',
    );
  validateFoodHistory(lifecycle, physical);
  const snapshotSets = [
    physical.knowledge.itemSnapshots.map((entry) => entry.itemId),
    physical.knowledge.conditionSnapshots.map((entry) => entry.conditionId),
    physical.knowledge.vitalSnapshots.map((entry) => entry.characterId),
    physical.knowledge.containerSnapshots.map((entry) => entry.containerId),
  ];
  for (const ids of snapshotSets)
    requirePhysical(new Set(ids).size === ids.length, 'INVALID_STATE');
}

/** Policy 2 carries only food already debited; loaded remainder alone is not fulfillment. */
function validateFoodHistory(lifecycle: LifecycleState, physical: CompanyPhysicalState): void {
  const day = BigInt(COMPANY_RULES.ticksPerDay);
  const rate = BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay);
  const memberships = new Set([
    ...physical.food.map((entry) => entry.membershipId),
    ...physical.foodCarry.map((entry) => entry.membershipId),
  ]);
  for (const membershipId of memberships) {
    requirePhysical(
      lifecycle.memberships.some((entry) => entry.membershipId === membershipId),
      'INVALID_STATE',
    );
    const entries = physical.food.filter((entry) => entry.membershipId === membershipId);
    for (const entry of entries)
      requirePhysical(
        isEntityId(entry.sourceId) &&
          isExactInteger(entry.fromTick) &&
          isExactInteger(entry.toTick) &&
          BigInt(entry.toTick) > BigInt(entry.fromTick) &&
          isExactInteger(entry.unitsConsumed) &&
          ['STOCK', 'PROVIDER'].includes(entry.channel),
        'INVALID_STATE',
      );
    entries.sort((a, b) => (BigInt(a.fromTick) < BigInt(b.fromTick) ? -1 : 1));
    let end = 0n;
    let demand = 0n;
    let debited = 0n;
    for (const entry of entries) {
      const from = BigInt(entry.fromTick);
      const to = BigInt(entry.toTick);
      requirePhysical(from >= end, 'INVALID_STATE');
      end = to;
      if (entry.channel === 'STOCK') {
        demand += (to - from) * rate;
        debited += BigInt(entry.unitsConsumed);
      } else requirePhysical(entry.unitsConsumed === '0', 'INVALID_STATE');
    }
    const carry =
      physical.foodCarry.find((entry) => entry.membershipId === membershipId)?.tickUnits ?? '0';
    requirePhysical(isExactInteger(carry), 'INVALID_STATE');
    requirePhysical(
      debited === (demand + day - 1n) / day && BigInt(carry) === demand % day,
      'INVALID_STATE',
    );
  }
}

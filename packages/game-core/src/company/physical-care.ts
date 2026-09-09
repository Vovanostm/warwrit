import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { person, sameLocation } from './lifecycle-state.js';
import { campaignTick } from './values.js';
import { consumePhysicalQuantity } from './physical-items.js';
import { payPhysicalProvider } from './physical-payments.js';
import {
  activeConditions,
  conditionDefinition,
  ownPhysical,
  physicalContainer,
  physicalFact,
  physicalId,
  physicalItem,
  recordPhysicalSource,
  replaceVitals,
  requirePhysical,
  syncLifecycleConditions,
  uniquePhysicalFact,
} from './physical-state.js';
import type { CommandOf, LifecycleState } from './lifecycle-types.js';
import type { CompanyFinance, EconomyContext, EconomyRequirement } from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type {
  CompanyPhysicalState,
  ConditionInstance,
  FoodCarry,
  PhysicalVitals,
} from './physical-types.js';
import type { PhysicalChange } from './physical-root-types.js';
import { PHYSICAL_RULES } from './physical-types.js';

function cloneKnownCharacter(
  lifecycle: LifecycleState,
  physical: CompanyPhysicalState,
  characterId: string,
): { readonly lifecycle: LifecycleState; readonly physical: CompanyPhysicalState } {
  const actual = lifecycle.characters.find((entry) => entry.identity.characterId === characterId);
  requirePhysical(actual, 'INVALID_STATE');
  const known = lifecycle.knowledge.characters.find(
    (entry) => entry.identity.characterId === characterId,
  );
  const nextLifecycle = known
    ? {
        ...lifecycle,
        knowledge: {
          ...lifecycle.knowledge,
          characters: lifecycle.knowledge.characters.map((entry) =>
            entry.identity.characterId === characterId ? ownPhysical(actual) : entry,
          ),
        },
      }
    : lifecycle;
  const conditions = physical.conditions.filter((entry) => entry.characterId === characterId);
  const vitals = physical.vitals.filter((entry) => entry.characterId === characterId);
  const nextPhysical = {
    ...physical,
    knowledge: {
      ...physical.knowledge,
      conditionSnapshots: [
        ...physical.knowledge.conditionSnapshots.filter(
          (entry) => entry.characterId !== characterId,
        ),
        ...ownPhysical(conditions),
      ],
      vitalSnapshots: [
        ...physical.knowledge.vitalSnapshots.filter((entry) => entry.characterId !== characterId),
        ...ownPhysical(vitals),
      ],
    },
  };
  return { lifecycle: nextLifecycle, physical: nextPhysical };
}
function providerAt(root: MaterializedCompanyState, providerId: string, characterId: string) {
  const provider = person(root.lifecycle, providerId);
  const subject = person(root.lifecycle, characterId);
  requirePhysical(
    provider.presence.availability === 'AVAILABLE' &&
      provider.presence.encounterBindingId === null &&
      provider.skills['medicine'] !== undefined &&
      provider.skills['medicine'] > 0 &&
      provider.presence.location.kind === 'AT' &&
      subject.presence.location.kind === 'AT' &&
      sameLocation(provider.presence.location, subject.presence.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  return provider;
}
export function applyCondition(
  root: MaterializedCompanyState,
  command: CommandOf<'ApplyCondition'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  const fact = physicalFact(context, p.receiptId, 'CONDITION_SOURCE');
  requirePhysical(
    fact.sourceEventId === command.sourceEventId &&
      fact.characterId === p.characterId &&
      fact.definitionId === p.conditionDefinitionId &&
      fact.causeId === p.causeId &&
      fact.onsetTick === context.atTick &&
      fact.deadlineTick === p.deadlineTick,
    'INVALID_SOURCE',
  );
  const character = person(root.lifecycle, p.characterId);
  requirePhysical(character.presence.availability !== 'DEAD', 'INCOMPATIBLE_ACTIVITY');
  const definition = COMPANY_CATALOGUE.conditions.find(
    (entry) => entry.id === p.conditionDefinitionId,
  );
  requirePhysical(definition, 'INVALID_SOURCE');
  if (definition.category === 'CRITICAL')
    requirePhysical(
      fact.deadlineTick !== undefined &&
        BigInt(fact.deadlineTick) === BigInt(context.atTick) + BigInt(definition.deadlineTicks!),
      'INVALID_SOURCE',
    );
  else requirePhysical(fact.deadlineTick === undefined, 'INVALID_SOURCE');
  const recorded = recordPhysicalSource(root.physical, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  const conditionId = physicalId(fact.id, p.characterId, p.conditionDefinitionId);
  requirePhysical(
    !recorded.state.conditions.some((entry) => entry.conditionId === conditionId),
    'IDEMPOTENCY_CONFLICT',
  );
  const condition: ConditionInstance = {
    conditionId,
    characterId: p.characterId,
    definitionId: p.conditionDefinitionId,
    sourceEventId: fact.sourceEventId,
    causeId: fact.causeId,
    onsetTick: context.atTick,
    deadlineTick: fact.deadlineTick ?? null,
    care: null,
    recoveryTicks: '0',
    resolvedAt: null,
    resolutionSourceId: null,
    scarId: null,
  };
  let physical = { ...recorded.state, conditions: [...recorded.state.conditions, condition] };
  const lifecycle = syncLifecycleConditions(root.lifecycle, physical);
  physical = { ...physical, processedTick: context.atTick };
  return { lifecycle, finance: root.finance, physical, requirements: [] };
}
function consumeCareMaterial(
  physical: CompanyPhysicalState,
  fact: Extract<NonNullable<EconomyContext['physicalFacts']>[number], { kind: 'CARE_FULFILLMENT' }>,
  careId: string,
  atTick: typeof physical.processedTick,
): CompanyPhysicalState {
  requirePhysical(
    fact.resourceItemId !== undefined && fact.resourceContainerId !== undefined,
    'INVALID_SOURCE',
  );
  const resource = physicalItem(physical, fact.resourceItemId);
  requirePhysical(resource.containerId === fact.resourceContainerId, 'INVALID_SOURCE');
  const definition = COMPANY_CATALOGUE.items.find((entry) => entry.id === resource.definitionId);
  requirePhysical(
    definition?.enabled && definition.kind === 'consumable' && definition.careIds?.includes(careId),
    'INVALID_SOURCE',
  );
  const container = physicalContainer(physical, fact.resourceContainerId);
  requirePhysical(
    container.location.kind === 'AT' && sameLocation(container.location, fact.location),
    'INVALID_SOURCE',
  );
  return consumePhysicalQuantity(
    physical,
    resource.itemId,
    1,
    fact.sourceEventId,
    `CARE:${fact.id}`,
    atTick,
  );
}
export function applyCare(
  root: MaterializedCompanyState,
  command: CommandOf<'ApplyCare'>,
  context: EconomyContext,
): PhysicalChange {
  const p = command.payload;
  let condition = root.physical.conditions.find(
    (entry) => entry.conditionId === p.conditionId && entry.characterId === p.characterId,
  );
  requirePhysical(condition && condition.resolvedAt === null, 'CONTACT_OR_ACCESS_REQUIRED');
  const definition = conditionDefinition(condition);
  requirePhysical(
    definition.careId === p.careDefinitionId && condition.care === null,
    'INVALID_ARGUMENT',
  );
  if (definition.category === 'CRITICAL')
    requirePhysical(
      condition.deadlineTick !== null && BigInt(context.atTick) <= BigInt(condition.deadlineTick),
      'INCOMPATIBLE_ACTIVITY',
    );
  const fact = physicalFact(context, p.resourceOrProviderReceiptId, 'CARE_FULFILLMENT');
  requirePhysical(
    fact.characterId === p.characterId &&
      fact.conditionId === p.conditionId &&
      fact.careDefinitionId === p.careDefinitionId &&
      fact.location.kind === 'AT',
    'INVALID_SOURCE',
  );
  providerAt(root, fact.providerId, p.characterId);
  let physical = recordPhysicalSource(root.physical, fact).state;
  let finance = root.finance;
  if (fact.channel === 'MATERIAL') {
    requirePhysical(
      p.budgetPoolId === undefined && fact.amountQ === undefined && fact.poolId === undefined,
      'INVALID_SOURCE',
    );
    physical = consumeCareMaterial(physical, fact, p.careDefinitionId, context.atTick);
    const resource = physical.items.find((entry) => entry.itemId === fact.resourceItemId)!;
    physical = {
      ...physical,
      knowledge: {
        ...physical.knowledge,
        itemSnapshots: [
          ...physical.knowledge.itemSnapshots.filter((entry) => entry.itemId !== resource.itemId),
          ownPhysical(resource),
        ],
      },
    };
  } else {
    requirePhysical(
      p.budgetPoolId !== undefined &&
        fact.poolId === p.budgetPoolId &&
        fact.providerWalletId !== undefined &&
        fact.moneyAccessEvidenceId !== undefined &&
        fact.amountQ !== undefined,
      'INVALID_SOURCE',
    );
    finance = payPhysicalProvider({ ...root, physical }, context, {
      poolId: fact.poolId,
      providerWalletId: fact.providerWalletId,
      moneyAccessEvidenceId: fact.moneyAccessEvidenceId,
      providerId: fact.providerId,
      location: fact.location,
      amountQ: fact.amountQ,
      movementId: physicalId(command.commandId, p.conditionId, 'care-payment'),
      purpose: 'CARE',
    });
  }
  condition = physical.conditions.find((entry) => entry.conditionId === p.conditionId)!;
  const care = {
    careDefinitionId: p.careDefinitionId,
    sourceId: fact.sourceEventId,
    fulfilledAt: context.atTick,
    channel: fact.channel,
  } as const;
  if (definition.category === 'CRITICAL') {
    const stableDefinition = COMPANY_CATALOGUE.conditions.find(
      (entry) =>
        entry.id === 'severe-stable-wound' && entry.category === 'TREATMENT_REQUIRED_STABLE',
    );
    requirePhysical(stableDefinition, 'INVALID_STATE');
    const stableId = physicalId(condition.conditionId, fact.id, 'post-stabilization');
    requirePhysical(
      !physical.conditions.some((entry) => entry.conditionId === stableId),
      'IDEMPOTENCY_CONFLICT',
    );
    physical = {
      ...physical,
      conditions: [
        ...physical.conditions.map((entry) =>
          entry.conditionId === condition!.conditionId
            ? {
                ...entry,
                care,
                resolvedAt: context.atTick,
                resolutionSourceId: fact.sourceEventId,
              }
            : entry,
        ),
        {
          conditionId: stableId,
          characterId: p.characterId,
          definitionId: stableDefinition.id,
          sourceEventId: condition.sourceEventId,
          causeId: condition.causeId,
          onsetTick: context.atTick,
          deadlineTick: null,
          care: {
            ...care,
            channel: 'INHERITED_STABILIZATION' as const,
          },
          recoveryTicks: '0',
          resolvedAt: null,
          resolutionSourceId: null,
          scarId: null,
        },
      ],
    };
  } else {
    physical = {
      ...physical,
      conditions: physical.conditions.map((entry) =>
        entry.conditionId === condition!.conditionId ? { ...entry, care } : entry,
      ),
    };
  }
  let lifecycle = syncLifecycleConditions(root.lifecycle, physical);
  const known = cloneKnownCharacter(lifecycle, physical, p.characterId);
  lifecycle = known.lifecycle;
  physical = known.physical;
  return { lifecycle, finance, physical, requirements: [] };
}
function foodCarry(physical: CompanyPhysicalState, membershipId: string): FoodCarry {
  return (
    physical.foodCarry.find((entry) => entry.membershipId === membershipId) ?? {
      membershipId,
      tickUnits: '0',
    }
  );
}
function consumeRations(
  physical: CompanyPhysicalState,
  containerId: string,
  units: bigint,
  factId: string,
  atTick: typeof physical.processedTick,
): CompanyPhysicalState {
  let remaining = units;
  for (const item of physical.items
    .filter(
      (entry) =>
        entry.containerId === containerId &&
        entry.tombstone === null &&
        COMPANY_CATALOGUE.items.find((definition) => definition.id === entry.definitionId)
          ?.foodUnits === 1,
    )
    .sort((a, b) => (a.itemId < b.itemId ? -1 : 1))) {
    if (remaining === 0n) break;
    const take = remaining < BigInt(item.quantity) ? remaining : BigInt(item.quantity);
    physical = consumePhysicalQuantity(
      physical,
      item.itemId,
      Number(take),
      factId,
      'FOOD_CONSUMPTION',
      atTick,
    );
    remaining -= take;
  }
  requirePhysical(remaining === 0n, 'INSUFFICIENT_ITEMS');
  return physical;
}
export function settleFoodConsumption(
  root: MaterializedCompanyState,
  requirement: Extract<EconomyRequirement, { kind: 'FOOD_CONSUMPTION' }>,
  context: EconomyContext,
): { readonly finance: CompanyFinance; readonly physical: CompanyPhysicalState } {
  const member = root.lifecycle.memberships.find(
    (entry) => entry.membershipId === requirement.membershipId,
  );
  requirePhysical(member, 'INVALID_STATE');
  const subject = person(root.lifecycle, member.characterId);
  const fact = uniquePhysicalFact(
    context,
    'FOOD_FULFILLMENT',
    (candidate) =>
      candidate.membershipId === requirement.membershipId &&
      candidate.fromTick === requirement.fromTick &&
      candidate.toTick === requirement.toTick,
    context.atTick,
  );
  requirePhysical(
    subject.presence.location.kind === 'AT' &&
      sameLocation(subject.presence.location, fact.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const recorded = recordPhysicalSource(root.physical, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  let physical = recorded.state;
  const prior = foodCarry(physical, requirement.membershipId);
  const total = BigInt(prior.tickUnits) + BigInt(requirement.tickUnits);
  const divisor = BigInt(COMPANY_RULES.ticksPerDay);
  const units = total / divisor;
  const carry = total % divisor;
  let finance = root.finance;
  if (fact.channel === 'STOCK') {
    requirePhysical(
      fact.containerId !== undefined &&
        fact.providerId === undefined &&
        fact.amountQ === undefined &&
        fact.poolId === undefined,
      'INVALID_SOURCE',
    );
    const container = physicalContainer(physical, fact.containerId);
    requirePhysical(
      container.location.kind === 'AT' && sameLocation(container.location, fact.location),
      'INVALID_SOURCE',
    );
    physical = consumeRations(
      physical,
      container.containerId,
      units,
      fact.sourceEventId,
      context.atTick,
    );
  } else {
    requirePhysical(
      fact.providerId !== undefined &&
        fact.poolId !== undefined &&
        fact.providerWalletId !== undefined &&
        fact.moneyAccessEvidenceId !== undefined &&
        fact.amountQ !== undefined,
      'INVALID_SOURCE',
    );
    const provider = person(root.lifecycle, fact.providerId);
    requirePhysical(
      provider.presence.availability === 'AVAILABLE' &&
        provider.presence.location.kind === 'AT' &&
        sameLocation(provider.presence.location, fact.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    if (units > 0n)
      finance = payPhysicalProvider({ ...root, physical }, context, {
        poolId: fact.poolId,
        providerWalletId: fact.providerWalletId,
        moneyAccessEvidenceId: fact.moneyAccessEvidenceId,
        providerId: fact.providerId,
        location: fact.location,
        amountQ: fact.amountQ,
        movementId: physicalId(fact.id, requirement.membershipId, 'food-payment'),
        purpose: 'FOOD',
      });
  }
  physical = {
    ...physical,
    foodCarry: [
      ...physical.foodCarry.filter((entry) => entry.membershipId !== requirement.membershipId),
      { membershipId: requirement.membershipId, tickUnits: carry.toString() },
    ],
    food: [
      ...physical.food,
      {
        sourceId: fact.sourceEventId,
        membershipId: requirement.membershipId,
        fromTick: requirement.fromTick,
        toTick: requirement.toTick,
        channel: fact.channel,
        unitsConsumed: units.toString(),
      },
    ],
  };
  return { finance, physical };
}
function coverageSegments(root: MaterializedCompanyState, membershipId: string) {
  const member = root.lifecycle.memberships.find((entry) => entry.membershipId === membershipId);
  if (!member) return [];
  return [
    ...root.physical.food
      .filter((entry) => entry.membershipId === membershipId)
      .map((entry) => ({ from: BigInt(entry.fromTick), to: BigInt(entry.toTick) })),
    ...root.finance.maintenanceReceipts
      .filter((entry) => entry.beneficiaryId === member.characterId)
      .map((entry) => ({ from: BigInt(entry.fromTick), to: BigInt(entry.toTick) })),
  ].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}
function foodCovered(
  root: MaterializedCompanyState,
  membershipId: string,
  from: bigint,
  to: bigint,
): boolean {
  let cursor = from;
  for (const segment of coverageSegments(root, membershipId)) {
    if (segment.to <= cursor || segment.from > cursor) continue;
    if (segment.from <= cursor) cursor = segment.to > cursor ? segment.to : cursor;
    if (cursor >= to) return true;
  }
  return cursor >= to;
}
function restore(
  current: number,
  maximum: number,
  carryText: string,
  elapsed: bigint,
  fullTicks: bigint,
): { readonly current: number; readonly carry: string } {
  if (current >= maximum) return { current: maximum, carry: '0' };
  const numerator = BigInt(carryText) + elapsed * BigInt(maximum);
  const gain = numerator / fullTicks;
  const next = Math.min(maximum, current + Number(gain));
  return {
    current: next,
    carry: next === maximum ? '0' : (numerator % fullTicks).toString(),
  };
}
export function advancePhysicalRecovery(
  root: MaterializedCompanyState,
  toTick: string,
): MaterializedCompanyState {
  const from = BigInt(root.physical.processedTick);
  const to = BigInt(toTick);
  requirePhysical(to >= from, 'INVALID_TIME');
  if (to === from) return root;
  let physical = root.physical;
  for (const member of root.lifecycle.memberships.filter(
    (membership) => membership.endedAt === null || BigInt(membership.endedAt) > from,
  )) {
    const character = person(root.lifecycle, member.characterId);
    const finish =
      member.endedAt === null || BigInt(member.endedAt) > to ? to : BigInt(member.endedAt);
    if (finish <= from) continue;
    const recoverable =
      character.presence.assignment === 'RECOVERY' &&
      character.presence.availability === 'AVAILABLE' &&
      character.presence.encounterBindingId === null &&
      foodCovered({ ...root, physical }, member.membershipId, from, finish);
    if (!recoverable) continue;
    const duration = finish - from;
    const existingVitals = physical.vitals.find(
      (entry) => entry.characterId === member.characterId,
    );
    const conditions = activeConditions(physical, member.characterId);
    if (
      conditions.some((instance) => {
        const definition = conditionDefinition(instance);
        return (
          definition.category === 'REST_RECOVERABLE' ||
          definition.category === 'TREATMENT_REQUIRED_STABLE'
        );
      })
    )
      requirePhysical(existingVitals, 'INVALID_STATE');
    if (existingVitals) {
      const health = restore(
        existingVitals.currentHealth,
        existingVitals.maximumHealth,
        existingVitals.healthCarry,
        duration,
        BigInt(COMPANY_RULES.restHealthTicks),
      );
      const stamina = restore(
        existingVitals.currentStamina,
        existingVitals.maximumStamina,
        existingVitals.staminaCarry,
        duration,
        BigInt(COMPANY_RULES.restStaminaTicks),
      );
      physical = replaceVitals(physical, {
        ...existingVitals,
        currentHealth: health.current,
        healthCarry: health.carry,
        currentStamina: stamina.current,
        staminaCarry: stamina.carry,
      });
    }
    physical = {
      ...physical,
      conditions: physical.conditions.map((instance) => {
        if (instance.characterId !== member.characterId || instance.resolvedAt !== null)
          return instance;
        const definition = conditionDefinition(instance);
        const allowed =
          definition.category === 'REST_RECOVERABLE' ||
          (definition.category === 'TREATMENT_REQUIRED_STABLE' && instance.care !== null);
        if (!allowed || definition.recoveryTicks === undefined) return instance;
        const total = BigInt(instance.recoveryTicks) + duration;
        const required = BigInt(definition.recoveryTicks);
        if (total < required) return { ...instance, recoveryTicks: total.toString() };
        const completedAt = campaignTick(
          (from + (required - BigInt(instance.recoveryTicks))).toString(),
        );
        return {
          ...instance,
          recoveryTicks: required.toString(),
          resolvedAt: completedAt,
          resolutionSourceId: physicalId(instance.conditionId, completedAt, 'rest-recovery'),
        };
      }),
    };
  }
  physical = { ...physical, processedTick: campaignTick(to.toString()) };
  const lifecycle = syncLifecycleConditions(root.lifecycle, physical);
  return { lifecycle, finance: root.finance, physical };
}
export function ensureNewMembershipVitals(
  before: LifecycleState,
  next: LifecycleState,
  physical: CompanyPhysicalState,
  sourceId: string,
): CompanyPhysicalState {
  let result = physical;
  for (const membership of next.memberships.filter((entry) => entry.endedAt === null)) {
    const isNewMembership = !before.memberships.some(
      (entry) => entry.membershipId === membership.membershipId,
    );
    if (!isNewMembership) continue;
    const hasVitals = result.vitals.some((entry) => entry.characterId === membership.characterId);
    if (hasVitals) continue;
    const vitals: PhysicalVitals = {
      characterId: membership.characterId,
      sourceId,
      maximumHealth: PHYSICAL_RULES.baseHealth,
      currentHealth: PHYSICAL_RULES.baseHealth,
      healthCarry: '0',
      maximumStamina: PHYSICAL_RULES.baseStamina,
      currentStamina: PHYSICAL_RULES.baseStamina,
      staminaCarry: '0',
    };
    result = {
      ...result,
      vitals: [...result.vitals, vitals],
      knowledge: {
        ...result.knowledge,
        vitalSnapshots: [...result.knowledge.vitalSnapshots, ownPhysical(vitals)],
      },
    };
  }
  return result;
}
export function settleCareHandover(
  root: MaterializedCompanyState,
  requirement: Extract<EconomyRequirement, { kind: 'CARE_HANDOVER' }>,
  context: EconomyContext,
  explicitId?: string,
): { readonly finance: CompanyFinance; readonly physical: CompanyPhysicalState } {
  const fact = explicitId
    ? physicalFact(context, explicitId, 'CARE_HANDOVER')
    : uniquePhysicalFact(
        context,
        'CARE_HANDOVER',
        (candidate) =>
          candidate.characterId === requirement.characterId &&
          candidate.receiverId === requirement.receiverId &&
          candidate.atTick === requirement.atTick,
      );
  requirePhysical(
    fact.handoverId === fact.id &&
      (!explicitId || fact.handoverId === explicitId) &&
      fact.characterId === requirement.characterId &&
      fact.receiverId === requirement.receiverId &&
      fact.atTick === requirement.atTick,
    'INVALID_SOURCE',
  );
  providerAt(root, fact.receiverId, fact.characterId);
  const subject = person(root.lifecycle, fact.characterId);
  requirePhysical(
    subject.presence.location.kind === 'AT' &&
      sameLocation(subject.presence.location, fact.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const recorded = recordPhysicalSource(root.physical, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  const finance = payPhysicalProvider({ ...root, physical: recorded.state }, context, {
    poolId: fact.poolId,
    providerWalletId: fact.providerWalletId,
    moneyAccessEvidenceId: fact.moneyAccessEvidenceId,
    providerId: fact.receiverId,
    location: fact.location,
    amountQ: fact.amountQ,
    movementId: physicalId(fact.id, fact.characterId, 'care-handover-payment'),
    purpose: 'CARE_HANDOVER',
  });
  const physical = {
    ...recorded.state,
    careHandovers: [
      ...recorded.state.careHandovers,
      {
        sourceId: fact.sourceEventId,
        characterId: fact.characterId,
        receiverId: fact.receiverId,
        atTick: fact.atTick,
      },
    ],
  };
  return { finance, physical };
}

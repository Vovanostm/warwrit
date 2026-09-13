import { COMPANY_CATALOGUE } from './definitions.js';
import { canPerform, person, sameLocation } from './lifecycle-state.js';
import { skillLevel } from './skill-progress.js';
import { consumePhysicalQuantity } from './physical-items.js';
import { payPhysicalProvider } from './physical-payments.js';
import { evaluatePerkEffects } from './perk-effects.js';
import type { ExactBps } from './perk-effects.js';
import {
  conditionDefinition,
  ownPhysical,
  physicalContainer,
  physicalFact,
  physicalId,
  physicalItem,
  recordPhysicalSource,
  requirePhysical,
  syncLifecycleConditions,
  uniquePhysicalFact,
} from './physical-state.js';
import type { CommandOf, LifecycleState } from './lifecycle-types.js';
import type { CompanyFinance, EconomyContext, EconomyRequirement } from './economy-types.js';
import type { MaterializedCompanyState, PhysicalChange } from './physical-root-types.js';
import type { CompanyPhysicalState, ConditionInstance, PhysicalVitals } from './physical-types.js';
import { PHYSICAL_RULES } from './physical-types.js';
import { isExactInteger, moneyQ } from './values.js';
import type { MoneyQ } from './values.js';

export { settleFoodConsumption } from './physical-food.js';
export { advancePhysicalRecovery } from './physical-recovery.js';

/** A performed treatment proves only its target and replacement, not unrelated hidden facts. */
function discloseCareConditions(
  lifecycle: LifecycleState,
  physical: CompanyPhysicalState,
  characterId: string,
  conditionIds: readonly string[],
): { readonly lifecycle: LifecycleState; readonly physical: CompanyPhysicalState } {
  const snapshots = [
    ...physical.knowledge.conditionSnapshots.filter(
      (entry) => !conditionIds.includes(entry.conditionId),
    ),
    ...ownPhysical(physical.conditions.filter((entry) => conditionIds.includes(entry.conditionId))),
  ];
  return {
    lifecycle: {
      ...lifecycle,
      knowledge: {
        ...lifecycle.knowledge,
        characters: lifecycle.knowledge.characters.map((entry) =>
          entry.identity.characterId === characterId
            ? {
                ...entry,
                conditionIds: snapshots
                  .filter((c) => c.characterId === characterId && c.resolvedAt === null)
                  .map((c) => c.definitionId),
              }
            : entry,
        ),
      },
    },
    physical: {
      ...physical,
      knowledge: { ...physical.knowledge, conditionSnapshots: snapshots },
    },
  };
}
function providerAt(root: MaterializedCompanyState, providerId: string, characterId: string) {
  const provider = person(root.lifecycle, providerId);
  const subject = person(root.lifecycle, characterId);
  requirePhysical(subject.presence.availability !== 'DEAD', 'INCOMPATIBLE_ACTIVITY');
  requirePhysical(
    provider.presence.availability === 'AVAILABLE' &&
      provider.presence.encounterBindingId === null &&
      canPerform(provider, 'basicWork') &&
      skillLevel(provider.skills['medicine'] ?? 0) > 0 &&
      provider.presence.location.kind === 'AT' &&
      subject.presence.location.kind === 'AT' &&
      sameLocation(provider.presence.location, subject.presence.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  return provider;
}
function positiveBps(value: ExactBps) {
  const numerator = BigInt(value.numerator);
  const denominator = BigInt(value.denominator) * 10000n;
  requirePhysical(numerator > 0n && denominator > 0n, 'INVALID_STATE');
  return { numerator, denominator };
}
function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}
function applyQuotedCost(amountQ: MoneyQ, modifier: ExactBps): MoneyQ {
  requirePhysical(isExactInteger(amountQ) && BigInt(amountQ) > 0n, 'INVALID_SOURCE');
  const ratio = positiveBps(modifier);
  const adjusted = ceilDiv(BigInt(amountQ) * ratio.numerator, ratio.denominator);
  return moneyQ((adjusted > 0n ? adjusted : 1n).toString());
}
function recoveryDuration(baseTicks: string, modifier: ExactBps): string {
  requirePhysical(isExactInteger(baseTicks) && BigInt(baseTicks) > 0n, 'INVALID_STATE');
  const ratio = positiveBps(modifier);
  const adjusted = ceilDiv(BigInt(baseTicks) * ratio.denominator, ratio.numerator);
  return (adjusted > 0n ? adjusted : 1n).toString();
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
  const perkEffects = evaluatePerkEffects(root, {
    kind: 'CHARACTER',
    characterId: fact.providerId,
    task: 'CARE',
  });
  const recorded = recordPhysicalSource(root.physical, fact);
  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');
  let physical = recorded.state;
  let finance = root.finance;
  if (fact.channel === 'MATERIAL') {
    requirePhysical(
      p.budgetPoolId === undefined &&
        fact.amountQ === undefined &&
        fact.poolId === undefined &&
        fact.providerWalletId === undefined &&
        fact.moneyAccessEvidenceId === undefined &&
        fact.supportsCareCostDiscount === undefined,
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
      fact.channel === 'PROVIDER' &&
        p.budgetPoolId !== undefined &&
        fact.poolId === p.budgetPoolId &&
        fact.providerWalletId !== undefined &&
        fact.moneyAccessEvidenceId !== undefined &&
        fact.amountQ !== undefined &&
        fact.resourceItemId === undefined &&
        fact.resourceContainerId === undefined,
      'INVALID_SOURCE',
    );
    const amountQ =
      fact.supportsCareCostDiscount === true
        ? applyQuotedCost(fact.amountQ, perkEffects.task.careCostBps)
        : fact.amountQ;
    finance = payPhysicalProvider({ ...root, physical }, context, {
      poolId: fact.poolId,
      providerWalletId: fact.providerWalletId,
      moneyAccessEvidenceId: fact.moneyAccessEvidenceId,
      providerId: fact.providerId,
      location: fact.location,
      amountQ,
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
    providerId: fact.providerId,
  } as const;
  const disclosedIds = [p.conditionId];
  if (definition.category === 'CRITICAL') {
    const stableDefinition = COMPANY_CATALOGUE.conditions.find(
      (entry) =>
        entry.id === 'severe-stable-wound' && entry.category === 'TREATMENT_REQUIRED_STABLE',
    );
    requirePhysical(stableDefinition?.recoveryTicks, 'INVALID_STATE');
    const stableId = physicalId(condition.conditionId, fact.id, 'post-stabilization');
    requirePhysical(
      !physical.conditions.some((entry) => entry.conditionId === stableId),
      'IDEMPOTENCY_CONFLICT',
    );
    disclosedIds.push(stableId);
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
            channel: 'INHERITED_STABILIZATION',
            recoveryTicksRequired: recoveryDuration(
              stableDefinition.recoveryTicks,
              perkEffects.task.careRecoveryBps,
            ),
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
        entry.conditionId === condition!.conditionId
          ? {
              ...entry,
              care: {
                ...care,
                ...(definition.recoveryTicks
                  ? {
                      recoveryTicksRequired: recoveryDuration(
                        definition.recoveryTicks,
                        perkEffects.task.careRecoveryBps,
                      ),
                    }
                  : {}),
              },
            }
          : entry,
      ),
    };
  }
  const lifecycle = syncLifecycleConditions(root.lifecycle, physical);
  const known = discloseCareConditions(lifecycle, physical, p.characterId, disclosedIds);
  return { ...known, finance, requirements: [] };
}

export function ensureNewMembershipVitals(
  before: LifecycleState,
  next: LifecycleState,
  physical: CompanyPhysicalState,
  sourceId: string,
): CompanyPhysicalState {
  // Only the source-backed opening creates healthy people from the opening profile.
  // Recruitment/rehire must retain the person's existing pools, including unknown legacy pools.
  if (before.company !== null) return physical;
  let result = physical;
  for (const membership of next.memberships.filter((entry) => entry.endedAt === null)) {
    if (before.characters.some((entry) => entry.identity.characterId === membership.characterId))
      continue;
    if (result.vitals.some((entry) => entry.characterId === membership.characterId)) continue;
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

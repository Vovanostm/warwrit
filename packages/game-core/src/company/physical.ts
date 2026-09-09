import { COMPANY_RULES } from './definitions.js';
import { canonicalJson } from './input.js';
import { canPerform, person, replacePerson } from './lifecycle-state.js';
import type { CompanyCommand } from './commands.js';
import type { EconomyContext, EconomyRequirement } from './economy-types.js';
import type { LifecycleState } from './lifecycle-types.js';
import { campaignTick } from './values.js';
import type { MaterializedCompanyState, PhysicalChange } from './physical-root-types.js';
import type { CompanyPhysicalState } from './physical-types.js';
import {
  applyCare,
  applyCondition,
  advancePhysicalRecovery,
  ensureNewMembershipVitals,
  settleCareHandover,
  settleFoodConsumption,
} from './physical-care.js';
import {
  applyContainerLifecycle,
  claimLoot,
  equipItem,
  materializeOpeningItems,
  repairItem,
  returnCompanyItemsForDeparture,
  settleRecruitItems,
  transferItem,
} from './physical-items.js';
import {
  captureCharacter,
  releaseCaptive,
  resolveMissing,
  settleOutcomeApplication,
  transferCaptive,
} from './physical-outcomes.js';
import {
  ownPhysical,
  physicalFact,
  recordPhysicalSource,
  requirePhysical,
  syncLifecycleConditions,
  validatePhysicalState,
} from './physical-state.js';

export function preparePhysicalCommand(
  root: MaterializedCompanyState,
  command: CompanyCommand,
  context: EconomyContext,
): PhysicalChange | null {
  switch (command.type) {
    case 'TransferItem':
      return transferItem(root, command, context);
    case 'EquipItem':
      return equipItem(root, command, context);
    case 'RepairItem':
      return repairItem(root, command, context);
    case 'ClaimLoot':
      return claimLoot(root, command, context);
    case 'ApplyContainerLifecycle':
      return applyContainerLifecycle(root, command, context);
    case 'ApplyCondition':
      return applyCondition(root, command, context);
    case 'ApplyCare':
      return applyCare(root, command, context);
    case 'Capture':
      return captureCharacter(root, command, context);
    case 'ReleaseCaptive':
      return releaseCaptive(root, command, context);
    case 'TransferCaptive':
      return transferCaptive(root, command, context);
    case 'ResolveMissing':
      return resolveMissing(root, command, context);
    default:
      return null;
  }
}
export function advancePhysicalTime(
  root: MaterializedCompanyState,
  toTick: string,
): MaterializedCompanyState {
  return advancePhysicalRecovery(root, toTick);
}

/** Accrual prerequisites must be physically fulfilled before recovery is advanced. */
export function settleClosedPhysicalRequirements(
  root: MaterializedCompanyState,
  requirements: readonly EconomyRequirement[],
  context: EconomyContext,
): {
  readonly root: MaterializedCompanyState;
  readonly residuals: readonly EconomyRequirement[];
} {
  let next = root;
  const residuals: EconomyRequirement[] = [];
  for (const requirement of requirements) {
    if (requirement.kind !== 'FOOD_CONSUMPTION') {
      residuals.push(requirement);
      continue;
    }
    const fulfilled = settleFoodConsumption(next, requirement, context);
    next = { ...next, finance: fulfilled.finance, physical: fulfilled.physical };
  }
  return { root: next, residuals };
}

/** Rebuild external food work from the corrected actual food ledger after retroactive outcomes. */
export function reconcileClosedFoodRequirements(
  root: MaterializedCompanyState,
  requirements: readonly EconomyRequirement[],
): readonly EconomyRequirement[] {
  const result: EconomyRequirement[] = [];
  for (const requirement of requirements) {
    if (requirement.kind !== 'FOOD_CONSUMPTION') {
      result.push(requirement);
      continue;
    }
    const from = BigInt(requirement.fromTick);
    const to = BigInt(requirement.toTick);
    const row = root.finance.food.find((entry) => entry.membershipId === requirement.membershipId);
    if (!row) continue;
    for (const interval of row.intervals) {
      if (interval.agreementId !== null) continue;
      const start = BigInt(interval.fromTick) > from ? BigInt(interval.fromTick) : from;
      const end = BigInt(interval.toTick) < to ? BigInt(interval.toTick) : to;
      if (end <= start) continue;
      result.push({
        kind: 'FOOD_CONSUMPTION',
        membershipId: requirement.membershipId,
        fromTick: campaignTick(start.toString()),
        toTick: campaignTick(end.toString()),
        tickUnits: ((end - start) * BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay)).toString(),
      });
    }
  }
  return result;
}
function endMembershipForDeparture(
  root: MaterializedCompanyState,
  requirement: Extract<EconomyRequirement, { kind: 'PHYSICAL_DEPARTURE' }>,
  context: EconomyContext,
): MaterializedCompanyState {
  const member = root.lifecycle.memberships.find(
    (entry) => entry.membershipId === requirement.membershipId,
  );
  requirePhysical(member && member.endedAt === null, 'INVALID_SOURCE');
  const character = person(root.lifecycle, member.characterId);
  requirePhysical(
    requirement.atTick === context.atTick &&
      character.presence.availability === 'AVAILABLE' &&
      character.presence.encounterBindingId === null,
    'INCOMPATIBLE_ACTIVITY',
  );
  let physical = root.physical;
  let finance = root.finance;
  if (!canPerform(character, 'travel')) {
    requirePhysical(requirement.careHandoverId !== null, 'INCOMPATIBLE_ACTIVITY');
    const handover = physicalFact(context, requirement.careHandoverId, 'CARE_HANDOVER');
    const fulfilled = settleCareHandover(
      { ...root, finance, physical },
      {
        kind: 'CARE_HANDOVER',
        characterId: member.characterId,
        receiverId: handover.receiverId,
        atTick: context.atTick,
      },
      context,
      requirement.careHandoverId,
    );
    finance = fulfilled.finance;
    physical = fulfilled.physical;
  } else requirePhysical(requirement.careHandoverId === null, 'INVALID_SOURCE');
  physical = returnCompanyItemsForDeparture(
    { ...root, physical },
    member.characterId,
    requirement.returnContainerId,
    requirement.intentId,
    context,
  );
  let lifecycle: LifecycleState = {
    ...root.lifecycle,
    memberships: root.lifecycle.memberships.map((entry) =>
      entry.membershipId === member.membershipId ? { ...entry, endedAt: context.atTick } : entry,
    ),
  };
  lifecycle = replacePerson(lifecycle, {
    ...person(lifecycle, member.characterId),
    presence: {
      ...person(lifecycle, member.characterId).presence,
      assignment: 'NONE',
      fieldPartyId: null,
      encounterBindingId: null,
    },
  });
  return { lifecycle, finance, physical };
}
/** Follow an actual admitted carrier movement; never recall property from another location. */
function followCarrierLocations(
  before: LifecycleState,
  after: LifecycleState,
  physical: CompanyPhysicalState,
): CompanyPhysicalState {
  return {
    ...physical,
    containers: physical.containers.map((container) => {
      const carrier = container.carrier;
      if (container.closed !== null || carrier === null) return container;
      const locationAt = (state: LifecycleState) =>
        carrier.kind === 'CHARACTER'
          ? state.characters.find((p) => p.identity.characterId === carrier.id)?.presence.location
          : state.parties.find((p) => p.partyId === carrier.id)?.location;
      const previous = locationAt(before);
      const current = locationAt(after);
      if (
        previous === undefined ||
        current === undefined ||
        canonicalJson(previous) === canonicalJson(current) ||
        canonicalJson(container.location) !== canonicalJson(previous)
      )
        return container;
      return { ...container, location: ownPhysical(current) };
    }),
  };
}

export function settlePhysicalRequirements(
  root: MaterializedCompanyState,
  beforeLifecycle: LifecycleState,
  requirements: readonly EconomyRequirement[],
  context: EconomyContext,
  sourceId: string,
  alignProcessedTick = true,
): {
  readonly root: MaterializedCompanyState;
  readonly residuals: readonly EconomyRequirement[];
} {
  let next = root;
  const residuals: EconomyRequirement[] = [];
  for (const requirement of requirements) {
    switch (requirement.kind) {
      case 'OPENING_NONFINANCIAL': {
        const opening = materializeOpeningItems(next, requirement, sourceId);
        next = { ...next, physical: opening.physical };
        residuals.push(opening.residual);
        break;
      }
      case 'RECRUIT_ITEMS':
        next = { ...next, physical: settleRecruitItems(next, requirement, context) };
        break;
      case 'CARE_HANDOVER': {
        const fulfilled = settleCareHandover(next, requirement, context);
        next = { ...next, finance: fulfilled.finance, physical: fulfilled.physical };
        break;
      }
      case 'FOOD_CONSUMPTION': {
        const fulfilled = settleFoodConsumption(next, requirement, context);
        next = { ...next, finance: fulfilled.finance, physical: fulfilled.physical };
        break;
      }
      case 'PHYSICAL_DEPARTURE':
        next = endMembershipForDeparture(next, requirement, context);
        break;
      case 'OUTCOME_APPLICATION': {
        const applied = settleOutcomeApplication(next, requirement, context);
        next = {
          lifecycle: applied.lifecycle,
          finance: applied.finance,
          physical: applied.physical,
        };
        residuals.push(...applied.requirements);
        break;
      }
      case 'INFORMED_SOCIAL_CONTRIBUTION':
        residuals.push(requirement);
        break;
      default: {
        const exhaustive: never = requirement;
        return exhaustive;
      }
    }
  }
  let physical = ensureNewMembershipVitals(
    beforeLifecycle,
    next.lifecycle,
    followCarrierLocations(beforeLifecycle, next.lifecycle, next.physical),
    sourceId,
  );
  const lifecycle = syncLifecycleConditions(next.lifecycle, physical);
  if (alignProcessedTick) physical = { ...physical, processedTick: lifecycle.campaignTick };
  next = { ...next, lifecycle, physical };
  validatePhysicalState(next, alignProcessedTick);
  return { root: next, residuals };
}
export function observePhysical(
  root: MaterializedCompanyState,
  command: Extract<CompanyCommand, { type: 'Observe' }>,
  context: EconomyContext,
): MaterializedCompanyState {
  const candidate = (context.physicalFacts ?? []).find(
    (fact) => fact.id === command.payload.observationId && fact.kind === 'PHYSICAL_OBSERVATION',
  );
  if (!candidate || candidate.kind !== 'PHYSICAL_OBSERVATION') return root;
  const fact = physicalFact(context, candidate.id, 'PHYSICAL_OBSERVATION');
  requirePhysical(
    fact.sourceEventId === command.sourceEventId &&
      command.payload.sourceId === fact.sourceEventId &&
      command.payload.factId === fact.id &&
      fact.observerCompanyId === root.lifecycle.companyId &&
      command.payload.subjectRef.kind === fact.subject.kind &&
      command.payload.subjectRef.id === fact.subject.id,
    'INVALID_SOURCE',
  );
  let physical = recordPhysicalSource(root.physical, fact).state;
  const itemSet = new Set(fact.itemIds);
  const containerSet = new Set(fact.containerIds);
  for (const itemId of itemSet)
    requirePhysical(
      physical.items.some((item) => item.itemId === itemId),
      'INVALID_SOURCE',
    );
  for (const containerId of containerSet)
    requirePhysical(
      physical.containers.some((container) => container.containerId === containerId),
      'INVALID_SOURCE',
    );
  physical = {
    ...physical,
    knowledge: {
      ...physical.knowledge,
      itemSnapshots: [
        ...physical.knowledge.itemSnapshots.filter((item) => !itemSet.has(item.itemId)),
        ...ownPhysical(physical.items.filter((item) => itemSet.has(item.itemId))),
      ],
      containerSnapshots: [
        ...physical.knowledge.containerSnapshots.filter(
          (container) => !containerSet.has(container.containerId),
        ),
        ...ownPhysical(
          physical.containers.filter((container) => containerSet.has(container.containerId)),
        ),
      ],
      conditionSnapshots:
        fact.subject.kind === 'CHARACTER'
          ? [
              ...physical.knowledge.conditionSnapshots.filter(
                (condition) => condition.characterId !== fact.subject.id,
              ),
              ...ownPhysical(
                physical.conditions.filter(
                  (condition) => condition.characterId === fact.subject.id,
                ),
              ),
            ]
          : physical.knowledge.conditionSnapshots,
      vitalSnapshots:
        fact.subject.kind === 'CHARACTER'
          ? [
              ...physical.knowledge.vitalSnapshots.filter(
                (vitals) => vitals.characterId !== fact.subject.id,
              ),
              ...ownPhysical(
                physical.vitals.filter((vitals) => vitals.characterId === fact.subject.id),
              ),
            ]
          : physical.knowledge.vitalSnapshots,
    },
  };
  return { ...root, physical };
}
export function projectCompanyPhysical(
  root: { readonly lifecycle: LifecycleState; readonly physical?: CompanyPhysicalState },
  observerCompanyId: string,
) {
  if (observerCompanyId !== root.lifecycle.companyId) return null;
  if (!root.physical) {
    if (root.lifecycle.knowledge.characters.some((character) => character.conditionIds.length > 0))
      return null;
    return {
      revision: root.lifecycle.knowledge.revision,
      items: [],
      containers: [],
      characters: root.lifecycle.knowledge.characters
        .map((character) => ({
          characterId: character.identity.characterId,
          conditions: [],
          vitals: null,
        }))
        .sort((a, b) => (a.characterId < b.characterId ? -1 : 1)),
    };
  }
  const p = root.physical.knowledge;
  return {
    revision: root.lifecycle.knowledge.revision,
    items: [...p.itemSnapshots]
      .sort((a, b) => (a.itemId < b.itemId ? -1 : 1))
      .map((item) => ({
        itemId: item.itemId,
        definitionId: item.definitionId,
        owner: ownPhysical(item.owner),
        containerId: item.containerId,
        quantity: item.quantity,
        currentCondition: item.currentCondition,
        maximumCondition: item.maximumCondition,
        equipped: item.equipped ? ownPhysical(item.equipped) : null,
        destroyed: item.tombstone !== null,
      })),
    containers: [...p.containerSnapshots]
      .sort((a, b) => (a.containerId < b.containerId ? -1 : 1))
      .map((container) => ({
        containerId: container.containerId,
        kind: container.kind,
        location: ownPhysical(container.location),
        closed: container.closed !== null,
      })),
    characters: root.lifecycle.knowledge.characters
      .map((character) => {
        const vitals = p.vitalSnapshots.find(
          (entry) => entry.characterId === character.identity.characterId,
        );
        return {
          characterId: character.identity.characterId,
          conditions: p.conditionSnapshots
            .filter(
              (condition) =>
                condition.characterId === character.identity.characterId &&
                condition.resolvedAt === null,
            )
            .map((condition) => ({
              conditionId: condition.conditionId,
              definitionId: condition.definitionId,
              deadlineTick: condition.deadlineTick,
            }))
            .sort((a, b) => (a.conditionId < b.conditionId ? -1 : 1)),
          vitals: vitals
            ? {
                currentHealth: vitals.currentHealth,
                maximumHealth: vitals.maximumHealth,
                currentStamina: vitals.currentStamina,
                maximumStamina: vitals.maximumStamina,
              }
            : null,
        };
      })
      .sort((a, b) => (a.characterId < b.characterId ? -1 : 1)),
  };
}
export function physicalObservableKey(root: {
  readonly lifecycle: LifecycleState;
  readonly physical?: CompanyPhysicalState;
}): string {
  const projection = projectCompanyPhysical(root, root.lifecycle.companyId);
  return canonicalJson(projection);
}

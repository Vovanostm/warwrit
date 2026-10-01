import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { person, sameLocation } from './lifecycle-state.js';
import { consumePhysicalQuantity } from './physical-items.js';
import { payPhysicalProvider } from './physical-payments.js';
import { canonicalJson } from './input.js';
import {
  physicalContainer,
  physicalId,
  recordPhysicalSource,
  requirePhysical,
  uniquePhysicalFact,
} from './physical-state.js';
import type { CompanyFinance, EconomyContext, EconomyRequirement } from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type { CompanyPhysicalState, TrustedTransitSegment } from './physical-types.js';
import { isExactInteger } from './values.js';

function consumeRations(
  physical: CompanyPhysicalState,
  containerIds: readonly string[],
  units: bigint,
  sourceId: string,
  atTick: typeof physical.processedTick,
  companyId?: string,
): CompanyPhysicalState {
  let remaining = units;
  for (const item of physical.items
    .filter(
      (entry) =>
        entry.containerId !== null &&
        containerIds.includes(entry.containerId) &&
        (companyId === undefined ||
          (entry.owner.kind === 'COMPANY' && entry.owner.id === companyId)) &&
        entry.tombstone === null &&
        COMPANY_CATALOGUE.items.find((definition) => definition.id === entry.definitionId)
          ?.foodUnits === 1,
    )
    .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0))) {
    if (remaining === 0n) break;
    const take = remaining < BigInt(item.quantity) ? remaining : BigInt(item.quantity);
    physical = consumePhysicalQuantity(
      physical,
      item.itemId,
      Number(take),
      sourceId,
      'FOOD_CONSUMPTION',
      atTick,
    );
    remaining -= take;
  }
  requirePhysical(remaining === 0n, 'INSUFFICIENT_ITEMS');
  return physical;
}

function stockUnitsForRequirement(
  requirement: Extract<EconomyRequirement, { kind: 'FOOD_CONSUMPTION' }>,
  prior: bigint,
): bigint {
  const divisor = BigInt(COMPANY_RULES.ticksPerDay);
  const demand = BigInt(requirement.tickUnits);
  requirePhysical(prior >= 0n && prior < divisor && demand > 0n, 'INVALID_STATE');
  const total = prior + demand;
  return (total + divisor - 1n) / divisor - (prior > 0n ? 1n : 0n);
}

function foodCarryUnits(physical: CompanyPhysicalState, membershipId: string): bigint {
  const matches = physical.foodCarry.filter((entry) => entry.membershipId === membershipId);
  requirePhysical(matches.length <= 1, 'INVALID_STATE');
  const carry = matches[0]?.tickUnits ?? '0';
  requirePhysical(isExactInteger(carry), 'INVALID_STATE');
  const units = BigInt(carry);
  requirePhysical(units < BigInt(COMPANY_RULES.ticksPerDay), 'INVALID_STATE');
  return units;
}

/** Exact stock forecast using the same fractional-ration rounding as actual settlement. */
export function assessPhysicalFoodStock(
  physical: CompanyPhysicalState,
  requirements: readonly Extract<EconomyRequirement, { kind: 'FOOD_CONSUMPTION' }>[],
  containerIds: readonly string[],
  companyId: string,
): {
  readonly requiredUnits: string;
  readonly availableUnits: string;
  readonly knownShortage: boolean;
} {
  requirePhysical(new Set(containerIds).size === containerIds.length, 'INVALID_STATE');
  const previousStartByMember = new Map<string, bigint>();
  for (const requirement of requirements) {
    requirePhysical(
      isExactInteger(requirement.fromTick) &&
        isExactInteger(requirement.toTick) &&
        isExactInteger(requirement.tickUnits),
      'INVALID_STATE',
    );
    const from = BigInt(requirement.fromTick);
    const to = BigInt(requirement.toTick);
    requirePhysical(to > from && BigInt(requirement.tickUnits) > 0n, 'INVALID_STATE');
    const previousStart = previousStartByMember.get(requirement.membershipId);
    requirePhysical(previousStart === undefined || from >= previousStart, 'INVALID_STATE');
    previousStartByMember.set(requirement.membershipId, from);
  }
  const orderedRequirements = requirements.toSorted((left, right) => {
    if (left.membershipId !== right.membershipId)
      return left.membershipId < right.membershipId ? -1 : 1;
    const leftFrom = BigInt(left.fromTick);
    const rightFrom = BigInt(right.fromTick);
    return leftFrom < rightFrom ? -1 : leftFrom > rightFrom ? 1 : 0;
  });
  const previousEndByMember = new Map<string, bigint>();
  const carryByMember = new Map<string, bigint>();
  const divisor = BigInt(COMPANY_RULES.ticksPerDay);
  let required = 0n;
  for (const requirement of orderedRequirements) {
    const from = BigInt(requirement.fromTick);
    const to = BigInt(requirement.toTick);
    const demand = BigInt(requirement.tickUnits);
    const previousEnd = previousEndByMember.get(requirement.membershipId);
    requirePhysical(
      to > from && demand > 0n && (previousEnd === undefined || from >= previousEnd),
      'INVALID_STATE',
    );
    const prior =
      carryByMember.get(requirement.membershipId) ??
      foodCarryUnits(physical, requirement.membershipId);
    required += stockUnitsForRequirement(requirement, prior);
    carryByMember.set(requirement.membershipId, (prior + demand) % divisor);
    previousEndByMember.set(requirement.membershipId, to);
  }
  const available = physical.items
    .filter(
      (entry) =>
        entry.containerId !== null &&
        containerIds.includes(entry.containerId) &&
        entry.owner.kind === 'COMPANY' &&
        entry.owner.id === companyId &&
        entry.tombstone === null &&
        COMPANY_CATALOGUE.items.find((definition) => definition.id === entry.definitionId)
          ?.foodUnits === 1,
    )
    .reduce((sum, entry) => sum + BigInt(entry.quantity), 0n);
  return {
    requiredUnits: required.toString(),
    availableUnits: available.toString(),
    knownShortage: available < required,
  };
}

function settleStockFood(
  requirement: Extract<EconomyRequirement, { kind: 'FOOD_CONSUMPTION' }>,
  physical: CompanyPhysicalState,
  containerIds: readonly string[],
  sourceEventId: string,
  atTick: typeof physical.processedTick,
  companyId?: string,
): { readonly physical: CompanyPhysicalState; readonly unitsConsumed: bigint } {
  const divisor = BigInt(COMPANY_RULES.ticksPerDay);
  const demand = BigInt(requirement.tickUnits);
  const prior = BigInt(
    physical.foodCarry.find((entry) => entry.membershipId === requirement.membershipId)
      ?.tickUnits ?? '0',
  );
  requirePhysical(prior >= 0n && prior < divisor && demand > 0n, 'INVALID_STATE');
  const total = prior + demand;
  // Open a real ration before granting any fraction of coverage. A nonzero carry is
  // already-used time in that debited ration, never an unfunded promise of future food.
  const units = stockUnitsForRequirement(
    requirement,
    foodCarryUnits(physical, requirement.membershipId),
  );
  let next = consumeRations(physical, containerIds, units, sourceEventId, atTick, companyId);
  next = {
    ...next,
    foodCarry: [
      ...next.foodCarry.filter((entry) => entry.membershipId !== requirement.membershipId),
      { membershipId: requirement.membershipId, tickUnits: (total % divisor).toString() },
    ],
  };
  return { physical: next, unitsConsumed: units };
}

function transitFoodContainers(
  root: MaterializedCompanyState,
  membershipId: string,
  segment: TrustedTransitSegment,
): readonly string[] {
  const membership = root.lifecycle.memberships.find(
    (entry) => entry.membershipId === membershipId,
  );
  requirePhysical(membership && membership.companyId === root.lifecycle.companyId, 'INVALID_STATE');
  const subject = person(root.lifecycle, membership.characterId);
  requirePhysical(
    subject.presence.location.kind === 'TRANSIT' &&
      subject.presence.location.segmentId === segment.segmentId &&
      subject.presence.fieldPartyId === segment.partyId,
    'INVALID_SOURCE',
  );
  const party = root.lifecycle.parties.find((entry) => entry.partyId === segment.partyId);
  const partyIsInSegment =
    party?.location.kind === 'TRANSIT' && party.location.segmentId === segment.segmentId;
  const partyMembers = new Set<string>(
    root.lifecycle.characters
      .filter(
        (character) =>
          character.presence.fieldPartyId === segment.partyId &&
          character.presence.location.kind === 'TRANSIT' &&
          character.presence.location.segmentId === segment.segmentId,
      )
      .map((character) => character.identity.characterId),
  );
  return root.physical.containers
    .filter((container) => {
      if (
        container.closed !== null ||
        container.location.kind !== 'TRANSIT' ||
        container.location.segmentId !== segment.segmentId ||
        container.carrier === null ||
        container.custodian.kind !== 'COMPANY' ||
        container.custodian.id !== root.lifecycle.companyId ||
        container.access !== 'COMPANY'
      )
        return false;
      return (
        (container.carrier.kind === 'PARTY' &&
          container.carrier.id === segment.partyId &&
          partyIsInSegment) ||
        (container.carrier.kind === 'CHARACTER' && partyMembers.has(container.carrier.id))
      );
    })
    .map((container) => container.containerId)
    .sort();
}

function transitSegmentFor(
  root: MaterializedCompanyState,
  context: EconomyContext,
  requirement: Extract<EconomyRequirement, { kind: 'FOOD_CONSUMPTION' }>,
): TrustedTransitSegment | null {
  const membership = root.lifecycle.memberships.find(
    (entry) => entry.membershipId === requirement.membershipId,
  );
  if (!membership) return null;
  const subject = root.lifecycle.characters.find(
    (character) => character.identity.characterId === membership.characterId,
  );
  const segmentId =
    subject?.presence.location.kind === 'TRANSIT' ? subject.presence.location.segmentId : null;
  if (segmentId === null) return null;
  const matches = (context.trustedTransitSegments ?? []).filter(
    (segment) =>
      segment.worldId === root.lifecycle.worldId &&
      segment.companyId === root.lifecycle.companyId &&
      segment.partyId === subject?.presence.fieldPartyId &&
      segment.segmentId === segmentId &&
      BigInt(requirement.fromTick) >= BigInt(segment.startedAt) &&
      BigInt(requirement.toTick) <= BigInt(segment.dueTick),
  );
  requirePhysical(matches.length === 1, 'INVALID_SOURCE');
  return matches[0]!;
}

function appendTransitFood(
  physical: CompanyPhysicalState,
  sourceId: string,
  requirement: Extract<EconomyRequirement, { kind: 'FOOD_CONSUMPTION' }>,
  unitsConsumed: bigint,
): CompanyPhysicalState {
  const previousIndex = physical.food.findIndex(
    (entry) => entry.sourceId === sourceId && entry.membershipId === requirement.membershipId,
  );
  if (previousIndex >= 0) {
    const previous = physical.food[previousIndex]!;
    requirePhysical(previous.toTick === requirement.fromTick, 'INVALID_STATE');
    const food = [...physical.food];
    food[previousIndex] = {
      ...previous,
      toTick: requirement.toTick,
      unitsConsumed: (BigInt(previous.unitsConsumed) + unitsConsumed).toString(),
    };
    return { ...physical, food };
  }
  return {
    ...physical,
    food: [
      ...physical.food,
      {
        sourceId,
        membershipId: requirement.membershipId,
        fromTick: requirement.fromTick,
        toTick: requirement.toTick,
        channel: 'STOCK',
        unitsConsumed: unitsConsumed.toString(),
      },
    ],
  };
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
  const candidates = (context.physicalFacts ?? []).filter(
    (entry) =>
      entry.kind === 'FOOD_FULFILLMENT' &&
      entry.membershipId === requirement.membershipId &&
      entry.fromTick === requirement.fromTick &&
      entry.toTick === requirement.toTick,
  );
  const segment = candidates.length === 0 ? transitSegmentFor(root, context, requirement) : null;
  if (segment) {
    requirePhysical(candidates.length === 0, 'INVALID_SOURCE');
    const containerIds = transitFoodContainers(root, requirement.membershipId, segment);
    const requestKey = canonicalJson({
      kind: 'TRANSIT_FOOD_V1',
      worldId: segment.worldId,
      companyId: segment.companyId,
      partyId: segment.partyId,
      segmentId: segment.segmentId,
      routeEpoch: segment.routeEpoch,
      membershipId: requirement.membershipId,
    });
    const previousEffect = root.physical.sourceEffects.find(
      (entry) => entry.requestKey === requestKey,
    );
    const sourceEventId =
      previousEffect?.key ??
      physicalId('transit-food-v1', root.physical.sourceEffects.length.toString());
    const settled = settleStockFood(
      requirement,
      root.physical,
      containerIds,
      sourceEventId,
      context.atTick,
      root.lifecycle.companyId,
    );
    const physical = previousEffect
      ? settled.physical
      : {
          ...settled.physical,
          sourceEffects: [...settled.physical.sourceEffects, { key: sourceEventId, requestKey }],
        };
    return {
      finance: root.finance,
      physical: appendTransitFood(physical, sourceEventId, requirement, settled.unitsConsumed),
    };
  }
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
  let finance = root.finance;
  let units = 0n;
  if (fact.channel === 'STOCK') {
    requirePhysical(
      fact.containerId !== undefined &&
        fact.providerId === undefined &&
        fact.amountQ === undefined &&
        fact.poolId === undefined &&
        fact.providerWalletId === undefined &&
        fact.moneyAccessEvidenceId === undefined,
      'INVALID_SOURCE',
    );
    const container = physicalContainer(physical, fact.containerId);
    requirePhysical(
      container.location.kind === 'AT' && sameLocation(container.location, fact.location),
      'INVALID_SOURCE',
    );
    const settled = settleStockFood(
      requirement,
      physical,
      [container.containerId],
      fact.sourceEventId,
      context.atTick,
    );
    physical = settled.physical;
    units = settled.unitsConsumed;
  } else {
    requirePhysical(
      fact.channel === 'PROVIDER' &&
        fact.containerId === undefined &&
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
        provider.presence.encounterBindingId === null &&
        provider.presence.location.kind === 'AT' &&
        sameLocation(provider.presence.location, fact.location),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    // The authoritative quote funds this exact interval, including sub-day intervals.
    // Provider meals neither debit stock nor erase an already-backed stock remainder.
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

export function foodCovered(
  root: MaterializedCompanyState,
  membershipId: string,
  from: bigint,
  to: bigint,
): boolean {
  const member = root.lifecycle.memberships.find((entry) => entry.membershipId === membershipId);
  if (!member) return false;
  const segments = [
    ...root.physical.food
      .filter((entry) => entry.membershipId === membershipId)
      .map((entry) => ({ from: BigInt(entry.fromTick), to: BigInt(entry.toTick) })),
    ...root.finance.maintenanceReceipts
      .filter((entry) => entry.beneficiaryId === member.characterId)
      .map((entry) => ({ from: BigInt(entry.fromTick), to: BigInt(entry.toTick) })),
  ].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  let cursor = from;
  for (const segment of segments) {
    if (segment.to <= cursor || segment.from > cursor) continue;
    cursor = segment.to;
    if (cursor >= to) return true;
  }
  return cursor >= to;
}

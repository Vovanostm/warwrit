import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { person, sameLocation } from './lifecycle-state.js';
import { consumePhysicalQuantity } from './physical-items.js';
import { payPhysicalProvider } from './physical-payments.js';
import {
  physicalContainer,
  physicalId,
  recordPhysicalSource,
  requirePhysical,
  uniquePhysicalFact,
} from './physical-state.js';
import type { CompanyFinance, EconomyContext, EconomyRequirement } from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type { CompanyPhysicalState } from './physical-types.js';

function consumeRations(
  physical: CompanyPhysicalState,
  containerId: string,
  units: bigint,
  sourceId: string,
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
      sourceId,
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
    const prior = BigInt(
      physical.foodCarry.find((entry) => entry.membershipId === requirement.membershipId)
        ?.tickUnits ?? '0',
    );
    const divisor = BigInt(COMPANY_RULES.ticksPerDay);
    const demand = BigInt(requirement.tickUnits);
    requirePhysical(prior >= 0n && prior < divisor && demand > 0n, 'INVALID_STATE');
    const total = prior + demand;
    // Open a real ration before granting any fraction of coverage. A nonzero carry is
    // already-used time in that debited ration, never an unfunded promise of future food.
    units = (total + divisor - 1n) / divisor - (prior > 0n ? 1n : 0n);
    physical = consumeRations(
      physical,
      container.containerId,
      units,
      fact.sourceEventId,
      context.atTick,
    );
    physical = {
      ...physical,
      foodCarry: [
        ...physical.foodCarry.filter((entry) => entry.membershipId !== requirement.membershipId),
        { membershipId: requirement.membershipId, tickUnits: (total % divisor).toString() },
      ],
    };
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

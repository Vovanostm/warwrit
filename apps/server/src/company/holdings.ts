import { COMPANY_CATALOGUE, COMPANY_RULES } from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import type { CompanyHoldingsDto } from '@warwrit/protocol';

/** Owner-private read model of money, carried items and bodily state; never sent to other accounts. */
export function projectCompanyHoldings(
  state: CompanyCombatAggregateState,
  companyId: string,
  memberIds: readonly string[],
): CompanyHoldingsDto {
  const characterIds = new Set<string>(memberIds);
  const ownedByCompany = (owner: { readonly kind: string; readonly id: string }) =>
    (owner.kind === 'COMPANY' && owner.id === companyId) ||
    (owner.kind === 'CHARACTER' && characterIds.has(owner.id));

  const wallets = state.economy.finance.wallets
    .filter((wallet) => ownedByCompany(wallet.owner))
    .map((wallet) => ({
      walletId: wallet.walletId,
      siteId: wallet.location.siteId,
      ownerCharacterId: wallet.owner.kind === 'CHARACTER' ? wallet.owner.id : null,
      cashQ: String(wallet.cashQ),
    }));
  const cashQ = wallets
    .filter((wallet) => wallet.ownerCharacterId === null)
    .reduce((sum, wallet) => sum + BigInt(wallet.cashQ), 0n)
    .toString();

  const physical = state.economy.physical;
  const carriers = new Map(
    (physical?.containers ?? []).map((container) => [
      container.containerId,
      container.carrier?.kind === 'CHARACTER' ? container.carrier.id : null,
    ]),
  );
  const items = (physical?.items ?? [])
    .filter((item) => item.tombstone === null && ownedByCompany(item.owner))
    .map((item) => ({
      itemId: item.itemId,
      definitionId: item.definitionId,
      quantity: item.quantity,
      currentCondition: item.currentCondition,
      maximumCondition: item.maximumCondition,
      carrierCharacterId:
        item.containerId === null ? null : (carriers.get(item.containerId) ?? null),
      equippedBy: item.equipped?.characterId ?? null,
      slot: COMPANY_CATALOGUE.items.find((entry) => entry.id === item.definitionId)?.slot ?? null,
    }));

  // Deaths the company witnessed in its own resolved encounters; lifecycle knowledge is only
  // refreshed by later observations, so the roster would otherwise show the fallen as present.
  const fallen = new Set(
    state.encounter.completed.flatMap((record) =>
      record.dispositions
        .filter((disposition) => disposition.status === 'DEAD')
        .map((disposition) => disposition.characterId as string),
    ),
  );
  const people = [...characterIds].map((characterId) => {
    const vitals = physical?.vitals.find((entry) => entry.characterId === characterId);
    return {
      characterId,
      fallen: fallen.has(characterId),
      currentHealth: vitals?.currentHealth ?? null,
      maximumHealth: vitals?.maximumHealth ?? null,
      currentStamina: vitals?.currentStamina ?? null,
      maximumStamina: vitals?.maximumStamina ?? null,
      conditions: (physical?.conditions ?? [])
        .filter(
          (condition) => condition.characterId === characterId && condition.resolvedAt === null,
        )
        .map((condition) => condition.definitionId),
    };
  });

  const fieldCamp = state.economy.finance.maintenance.some(
    (mode) => mode.kind === 'FIELD_CAMP' && mode.endedAt === null,
  );
  const finance = state.economy.finance;
  const owed = (claim: (typeof finance.claims)[number]) =>
    BigInt(claim.reportedQ) - BigInt(claim.reportedCoveredQ) - BigInt(claim.paidQ);
  const wagesOwedQ = finance.claims.reduce((sum, claim) => sum + owed(claim), 0n).toString();
  const wagesDueQ = finance.claims
    .filter((claim) => BigInt(claim.dueAt) <= BigInt(state.economy.lifecycle.campaignTick))
    .reduce((sum, claim) => sum + owed(claim), 0n)
    .toString();
  const party = state.economy.lifecycle.parties[0];
  const partyMembers = state.economy.lifecycle.characters.filter(
    (person) =>
      person.presence.fieldPartyId === party?.partyId && person.presence.availability !== 'DEAD',
  );
  const partyCarriers = new Set(
    partyMembers.map((person) => `CHARACTER:${person.identity.characterId}`),
  );
  if (party) partyCarriers.add(`PARTY:${party.partyId}`);
  const carriedContainers = new Set(
    (physical?.containers ?? [])
      .filter(
        (container) =>
          container.closed === null &&
          container.carrier !== null &&
          partyCarriers.has(`${container.carrier.kind}:${container.carrier.id}`),
      )
      .map((container) => container.containerId),
  );
  const rations = (physical?.items ?? [])
    .filter((item) => carriedContainers.has(item.containerId ?? ''))
    .filter(
      (item) =>
        item.tombstone === null &&
        item.definitionId === 'ration' &&
        item.owner.kind === 'COMPANY' &&
        item.owner.id === companyId,
    )
    .reduce((sum, item) => sum + item.quantity, 0);
  // Food already opened for today's partial interval still feeds the person.
  const dayTicks = Number(COMPANY_RULES.ticksPerDay);
  const openedFood = partyMembers.reduce((sum, person) => {
    const membership = state.economy.lifecycle.memberships.find(
      (entry) => entry.characterId === person.identity.characterId && entry.endedAt === null,
    );
    const usedTicks = Number(
      physical?.foodCarry.find((entry) => entry.membershipId === membership?.membershipId)
        ?.tickUnits ?? '0',
    );
    return sum + (usedTicks > 0 ? (dayTicks - usedTicks) / dayTicks : 0);
  }, 0);
  const supplies = {
    rations,
    people: partyMembers.length,
    days: partyMembers.length ? (rations + openedFood) / partyMembers.length : 0,
  };
  return { cashQ, wallets, items, people, fieldCamp, wagesOwedQ, wagesDueQ, supplies };
}

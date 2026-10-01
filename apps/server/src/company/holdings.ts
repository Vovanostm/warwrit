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
    }));

  const people = [...characterIds].map((characterId) => {
    const vitals = physical?.vitals.find((entry) => entry.characterId === characterId);
    return {
      characterId,
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

  return { cashQ, wallets, items, people };
}

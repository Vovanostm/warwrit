import { describe, expect, it } from 'vitest';
import {
  MILL_DESCENT_KIT_INITIAL_STOCK,
  MILL_DESCENT_KIT_PRICE_Q,
  MILL_DESCENT_KIT_SITE,
  consumeMillDescentKit,
  materializeCompanyPhysicalState,
  prepareMillDescentKitPurchase,
  readCompanyCombatAggregateState,
  moneyQ,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';

describe('mill descent kit', () => {
  it('debits the company, transfers one finite kit into party custody, then consumes it', () => {
    const fixture = createCompanyCombatAggregateFixture().state;
    const place = {
      kind: 'AT' as const,
      siteId: MILL_DESCENT_KIT_SITE,
      areaId: 'tikhaya-gat-bank',
    };
    const state = readCompanyCombatAggregateState({
      ...fixture,
      economy: {
        ...fixture.economy,
        lifecycle: {
          ...fixture.economy.lifecycle,
          parties: fixture.economy.lifecycle.parties.map((party) => ({
            ...party,
            location: place,
          })),
          characters: fixture.economy.lifecycle.characters.map((person) => ({
            ...person,
            presence: { ...person.presence, location: place },
          })),
        },
        finance: {
          ...fixture.economy.finance,
          wallets: fixture.economy.finance.wallets.map((wallet) =>
            wallet.owner.kind === 'COMPANY'
              ? { ...wallet, location: place, cashQ: moneyQ('50000000') }
              : { ...wallet, location: place },
          ),
        },
        physical: fixture.economy.physical
          ? {
              ...fixture.economy.physical,
              items: fixture.economy.physical.items.map((item) =>
                item.definitionId === 'ration' ? { ...item, quantity: 2 } : item,
              ),
              containers: fixture.economy.physical.containers.map((container) => ({
                ...container,
                ...(container.containerId === 'fixture-supply'
                  ? {
                      kind: 'PARTY_SUPPLY' as const,
                      carrier: {
                        kind: 'PARTY' as const,
                        id: fixture.economy.lifecycle.parties[0]!.partyId,
                      },
                    }
                  : {}),
                location: place,
              })),
            }
          : undefined,
      },
    });
    const root = materializeCompanyPhysicalState(state.economy);
    const party = state.economy.lifecycle.parties[0]!;
    const carried = state.economy.finance.wallets.find(
      (wallet) =>
        wallet.owner.kind === 'COMPANY' && wallet.owner.id === state.economy.lifecycle.companyId,
    )!;
    const stock = {
      worldId: state.economy.lifecycle.worldId,
      revision: '0',
      quantity: MILL_DESCENT_KIT_INITIAL_STOCK,
      priceQ: MILL_DESCENT_KIT_PRICE_Q,
      cashQ: '0',
    };
    const bought = prepareMillDescentKitPurchase(
      root,
      {
        commandId: 'rescue-kit-purchase',
        siteId: MILL_DESCENT_KIT_SITE,
        shopRevision: stock.revision,
      },
      stock,
      { walletId: carried.walletId, partyId: party.partyId },
    );
    expect(bought.kind, JSON.stringify(bought)).toBe('PREPARED');
    if (bought.kind !== 'PREPARED') return;
    expect(bought.stock).toMatchObject({
      quantity: 1,
      cashQ: MILL_DESCENT_KIT_PRICE_Q,
      revision: '1',
    });
    expect(
      bought.next.finance.wallets.find((wallet) => wallet.walletId === carried.walletId)?.cashQ,
    ).toBe((BigInt(carried.cashQ) - BigInt(MILL_DESCENT_KIT_PRICE_Q)).toString());
    expect(bought.next.physical.items.find((item) => item.itemId === bought.itemId)).toMatchObject({
      definitionId: 'mill-descent-kit',
      quantity: 1,
      owner: { kind: 'COMPANY', id: state.economy.lifecycle.companyId },
    });

    const consumed = consumeMillDescentKit(
      bought.next,
      bought.itemId,
      'quiet-rescue-release',
      bought.next.lifecycle.campaignTick,
    );
    expect(
      consumed.physical.items.find((item) => item.itemId === bought.itemId)?.tombstone,
    ).toMatchObject({
      sourceId: 'quiet-rescue-release',
      causeId: 'QUIET_MILL_RESCUE',
    });
  });
});

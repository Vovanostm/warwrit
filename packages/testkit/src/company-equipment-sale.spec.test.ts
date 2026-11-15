import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  entityId,
  materializeCompanyPhysicalState,
  prepareEquipmentSale,
} from '@warwrit/game-core';
import type { CompanyCommand, CompanyEconomyState, SettlementSupplies } from '@warwrit/game-core';
import { addContainer, addItem, container, item } from './company-physical-fixture.js';
import { cash, command, economy, place } from './company-economy-fixture.js';

const shop: SettlementSupplies = {
  worldId: 'world',
  siteId: 'kamenny-brod',
  revision: '4',
  rations: 10,
  cashQ: cash(20_000_000),
};
const market = { ...place, siteId: 'kamenny-brod' } as const;

function saleState(): CompanyEconomyState {
  let state = economy([], 100n, 0);
  state = {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      parties: state.lifecycle.parties.map((party) => ({ ...party, location: market })),
    },
    finance: {
      ...state.finance,
      wallets: state.finance.wallets.map((wallet) => ({ ...wallet, location: market })),
    },
  };
  state = addContainer(state, {
    ...container('market-stash', { kind: 'COMPANY', id: 'company' }, 30000, {
      kind: 'CHARACTER',
      id: 'leader',
    }),
    location: market,
    access: 'COMPANY',
  });
  state = addItem(state, {
    ...item('loot-sword', 'sword', { kind: 'COMPANY', id: 'company' }, 'market-stash'),
    equipped: { characterId: 'leader', slots: ['MAIN_HAND'] },
  });
  return state;
}

function sell(state: CompanyEconomyState, itemId = 'loot-sword', id = 'sell-1', revision = '4') {
  const root = materializeCompanyPhysicalState(state);
  const cmd = command(
    state,
    'SellItem',
    { siteId: 'kamenny-brod', itemId, shopRevision: revision },
    id,
  ) as Extract<CompanyCommand, { type: 'SellItem' }>;
  return prepareEquipmentSale(root, cmd, shop);
}

describe('M1 loot sale preparation', () => {
  it('moves one owned item to finite trader custody and credits the company exactly once', () => {
    const state = saleState();
    const before = canonicalJson(state);
    const result = sell(state);
    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.priceQ).toBe('4000000');
    expect(result.shop).toMatchObject({ cashQ: '16000000', revision: '5', rations: 10 });
    expect(result.sold).toMatchObject({
      itemId: 'loot-sword',
      definitionId: 'sword',
      owner: { kind: 'WORLD', id: 'world' },
      containerId: 'trader-items:world:kamenny-brod',
      provenance: { sourceId: 'fixture-item-source', parentItemId: null, ordinal: 0 },
      currentCondition: 10000,
      maximumCondition: 10000,
      contentRevision: '1',
      equipped: null,
    });
    expect(result.next.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ).toBe(
      '4000100',
    );
    expect(
      BigInt(result.shop.cashQ) +
        BigInt(result.next.finance.wallets.find((wallet) => wallet.walletId === 'purse')!.cashQ),
    ).toBe(20_000_100n);
    expect(result.next.finance.movements.at(-1)).toMatchObject({
      from: 'supplies:world:kamenny-brod',
      to: 'purse',
      amountQ: '4000000',
      purpose: 'SALE',
    });
    expect(result.next.physical.items.some((entry) => entry.itemId === 'loot-sword')).toBe(false);
    expect(
      result.next.physical.knowledge.itemSnapshots.some((entry) => entry.itemId === 'loot-sword'),
    ).toBe(false);
    expect(
      prepareEquipmentSale(
        result.next,
        command(
          state,
          'SellItem',
          { siteId: 'kamenny-brod', itemId: 'loot-sword', shopRevision: '4' },
          'sell-1',
        ) as Extract<CompanyCommand, { type: 'SellItem' }>,
        result.shop,
      ),
    ).toMatchObject({ kind: 'REJECTED', code: 'IDEMPOTENCY_CONFLICT' });
    expect(canonicalJson(state)).toBe(before);
  });

  it('refuses company gear stored in a foreign custodial container without changing input state', () => {
    const state = saleState();
    const before = canonicalJson(state);
    const materialized = materializeCompanyPhysicalState(state);
    const root = {
      ...materialized,
      physical: {
        ...materialized.physical,
        items: materialized.physical.items.map((entry) =>
          entry.itemId === 'loot-sword' ? { ...entry, equipped: null } : entry,
        ),
        containers: materialized.physical.containers.map((entry) =>
          entry.containerId === 'market-stash'
            ? {
                ...entry,
                custodian: { kind: 'COMPANY' as const, id: 'other-company' },
                carrier: null,
                access: 'CUSTODIAN' as const,
              }
            : entry,
        ),
      },
    };
    const result = prepareEquipmentSale(
      root,
      command(
        state,
        'SellItem',
        { siteId: 'kamenny-brod', itemId: 'loot-sword', shopRevision: '4' },
        'sell-foreign-container',
      ) as Extract<CompanyCommand, { type: 'SellItem' }>,
      shop,
    );
    expect(result).toMatchObject({ kind: 'REJECTED', code: 'CONTACT_OR_ACCESS_REQUIRED' });
    expect(canonicalJson(state)).toBe(before);
  });

  it('rejects inherited price-table keys', () => {
    const state = saleState();
    const materialized = materializeCompanyPhysicalState(state);
    const root = {
      ...materialized,
      physical: {
        ...materialized.physical,
        items: materialized.physical.items.map((entry) =>
          entry.itemId === 'loot-sword' ? { ...entry, definitionId: 'toString' } : entry,
        ),
      },
    };
    const result = prepareEquipmentSale(
      root,
      command(
        state,
        'SellItem',
        { siteId: 'kamenny-brod', itemId: 'loot-sword', shopRevision: '4' },
        'sell-inherited-price-key',
      ) as Extract<CompanyCommand, { type: 'SellItem' }>,
      shop,
    );
    expect(result).toMatchObject({ kind: 'REJECTED', code: 'UNSALEABLE_ITEM' });
  });

  it.each([
    [
      'remote',
      (state: CompanyEconomyState) => ({
        ...state,
        lifecycle: {
          ...state.lifecycle,
          parties: state.lifecycle.parties.map((party) => ({
            ...party,
            location: { ...market, siteId: 'village' },
          })),
        },
      }),
      'CONTACT_OR_ACCESS_REQUIRED',
    ],
    ['stale revision', (state: CompanyEconomyState) => state, 'STALE_REVISION'],
    [
      'foreign property',
      (state: CompanyEconomyState) =>
        addItem(
          {
            ...state,
            physical: {
              ...state.physical!,
              items: state.physical!.items.filter((entry) => entry.itemId !== 'loot-sword'),
              knowledge: {
                ...state.physical!.knowledge,
                itemSnapshots: state.physical!.knowledge.itemSnapshots.filter(
                  (entry) => entry.itemId !== 'loot-sword',
                ),
              },
            },
          },
          item('loot-sword', 'sword', { kind: 'CHARACTER', id: 'leader' }, 'market-stash'),
        ),
      'ITEM_NOT_OWNED',
    ],
    [
      'trophy',
      (state: CompanyEconomyState) =>
        addItem(
          {
            ...state,
            physical: {
              ...state.physical!,
              items: state.physical!.items.filter((entry) => entry.itemId !== 'loot-sword'),
              knowledge: {
                ...state.physical!.knowledge,
                itemSnapshots: state.physical!.knowledge.itemSnapshots.filter(
                  (entry) => entry.itemId !== 'loot-sword',
                ),
              },
            },
          },
          item(
            'loot-sword',
            'raider-standard-trophy',
            { kind: 'COMPANY', id: 'company' },
            'market-stash',
          ),
        ),
      'UNSALEABLE_ITEM',
    ],
    [
      'encounter bound',
      (state: CompanyEconomyState) => ({
        ...state,
        lifecycle: {
          ...state.lifecycle,
          characters: state.lifecycle.characters.map((person) =>
            person.identity.characterId === 'leader'
              ? {
                  ...person,
                  presence: {
                    ...person.presence,
                    encounterBindingId: entityId<'EncounterBinding'>('battle'),
                  },
                }
              : person,
          ),
        },
      }),
      'INCOMPATIBLE_ACTIVITY',
    ],
    ['merchant lacks funds', (state: CompanyEconomyState) => state, 'INSUFFICIENT_FUNDS'],
  ] as const)('refuses %s without changing input state', (_label, transform, expected) => {
    const state = transform(saleState());
    const before = canonicalJson(state);
    const selectedShop = _label === 'merchant lacks funds' ? { ...shop, cashQ: '3999999' } : shop;
    const result = prepareEquipmentSale(
      materializeCompanyPhysicalState(state),
      command(
        state,
        'SellItem',
        {
          siteId: 'kamenny-brod',
          itemId: 'loot-sword',
          shopRevision: _label === 'stale revision' ? '3' : '4',
        },
        'sell-refused',
      ) as Extract<CompanyCommand, { type: 'SellItem' }>,
      selectedShop,
    );
    expect(result).toMatchObject({ kind: 'REJECTED', code: expected });
    expect(canonicalJson(state)).toBe(before);
  });
});

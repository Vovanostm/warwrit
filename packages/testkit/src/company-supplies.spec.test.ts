import { expect, it } from 'vitest';
import {
  canonicalJson,
  parseCompanyCommand,
  prepareSupplyPurchase,
  supplySpendableCashQ,
} from '@warwrit/game-core';
import { economy, command } from './company-economy-fixture.js';
import { addContainer, container } from './company-physical-fixture.js';

it('exchanges local food for exact cash without mutation and rejects stale, remote, unfunded or oversized orders', () => {
  const location = { kind: 'AT' as const, siteId: 'severny-dvor', areaId: 'yard' };
  let state = economy([1n], 800000000n, 0);
  state = {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      parties: [{ partyId: 'party', location }],
      characters: state.lifecycle.characters.map((person) => ({
        ...person,
        presence: { ...person.presence, location },
      })),
    },
    finance: {
      ...state.finance,
      wallets: state.finance.wallets.map((wallet) => ({ ...wallet, location })),
    },
  };
  state = addContainer(state, {
    ...container('party-supply', { kind: 'COMPANY', id: 'company' }, 60000, {
      kind: 'PARTY',
      id: 'party',
    }),
    kind: 'PARTY_SUPPLY',
    location,
  });
  const root = { ...state, physical: state.physical! };
  const before = canonicalJson(root);
  const shop = {
    worldId: 'world',
    siteId: 'severny-dvor',
    revision: '0',
    rations: 300,
    cashQ: '0',
  };
  const order = (quantity: number, siteId = shop.siteId, shopRevision = shop.revision) => {
    const parsed = parseCompanyCommand(
      command(state, 'BuySupplies', { quantity, siteId, shopRevision }),
    );
    if (!parsed.ok || parsed.command.type !== 'BuySupplies')
      throw new Error('Invalid fixture command');
    return parsed.command;
  };
  expect(supplySpendableCashQ(root, shop.siteId)).toBe('800000000');
  const accepted = prepareSupplyPurchase(root, order(10), shop);
  expect(accepted.kind).toBe('PREPARED');
  if (accepted.kind !== 'PREPARED') throw new Error('Expected accepted purchase');
  expect(accepted.costQ).toBe('40000000');
  expect(accepted.shop.rations).toBe(290);
  expect(accepted.shop.cashQ).toBe('40000000');
  expect(supplySpendableCashQ(accepted.next, shop.siteId)).toBe('760000000');
  expect(
    accepted.next.physical.items
      .filter((item) => item.containerId === 'party-supply')
      .reduce((sum, item) => sum + item.quantity, 0),
  ).toBe(10);
  expect(canonicalJson(root)).toBe(before);
  expect(prepareSupplyPurchase(root, order(1, 'kamenny-brod'), shop)).toMatchObject({
    kind: 'REJECTED',
    code: 'CONTACT_OR_ACCESS_REQUIRED',
  });
  expect(prepareSupplyPurchase(root, order(1, shop.siteId, '1'), shop)).toMatchObject({
    kind: 'REJECTED',
    code: 'STALE_REVISION',
  });
  expect(prepareSupplyPurchase(root, order(10), { ...shop, rations: 9 })).toMatchObject({
    kind: 'REJECTED',
    code: 'OUT_OF_STOCK',
  });
  const broke = {
    ...root,
    finance: {
      ...root.finance,
      wallets: root.finance.wallets.map((wallet) => ({
        ...wallet,
        cashQ: '0' as typeof wallet.cashQ,
      })),
    },
  };
  expect(supplySpendableCashQ(broke, shop.siteId)).toBe('0');
  expect(prepareSupplyPurchase(broke, order(1), shop)).toMatchObject({
    kind: 'REJECTED',
    code: 'INSUFFICIENT_FUNDS',
  });
  const overloaded = {
    ...root,
    physical: {
      ...root.physical,
      containers: root.physical.containers.map((entry) =>
        entry.containerId === 'party-supply' ? { ...entry, capacityG: 0 } : entry,
      ),
    },
  };
  expect(prepareSupplyPurchase(overloaded, order(1), shop)).toMatchObject({
    kind: 'REJECTED',
    code: 'CAPACITY',
  });
  const remote = {
    ...root,
    finance: {
      ...root.finance,
      wallets: root.finance.wallets.map((wallet) => ({
        ...wallet,
        location: { ...location, siteId: 'kamenny-brod' },
      })),
    },
  };
  expect(supplySpendableCashQ(remote, shop.siteId)).toBe('0');
  const carriedPurse = { walletId: 'purse', partyId: 'party' };
  expect(supplySpendableCashQ(remote, shop.siteId, carriedPurse)).toBe('800000000');
  expect(prepareSupplyPurchase(remote, order(1), shop, carriedPurse)).toMatchObject({
    kind: 'PREPARED',
  });
});

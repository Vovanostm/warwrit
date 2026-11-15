import { describe, expect, it } from 'vitest';
import { entityId, moneyQ, type AtLocation, type CompanyEconomyState } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import {
  payDeceasedWagesCommandIntent,
  parsePayDeceasedWagesRequest,
} from './deceased-wages-routes.js';
import { prepareDeceasedWageAccess } from './deceased-wages.js';

const local = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const remote = { kind: 'AT' as const, siteId: 'bereznyak', areaId: 'bereznyak-green' };

function atPlace(root: CompanyEconomyState, place: AtLocation): CompanyEconomyState {
  return {
    ...root,
    lifecycle: {
      ...root.lifecycle,
      parties: root.lifecycle.parties.map((party) => ({ ...party, location: place })),
      characters: root.lifecycle.characters.map((character) => ({
        ...character,
        presence: { ...character.presence, location: place },
      })),
      knowledge: {
        ...root.lifecycle.knowledge,
        characters: root.lifecycle.knowledge.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location: place },
        })),
      },
    },
    finance: {
      ...root.finance,
      wallets: root.finance.wallets.map((wallet) => ({ ...wallet, location: place })),
    },
  };
}

function rootAtKamennyBrod(): CompanyEconomyState {
  const root = createCompanyCombatAggregateFixture().state.economy;
  const membership = root.lifecycle.memberships.find(
    (candidate) => candidate.characterId === 'a-worker-0',
  )!;
  const account = root.finance.accounts.find(
    (candidate) => candidate.membershipId === membership.membershipId,
  )!;
  return atPlace(
    {
      ...root,
      finance: {
        ...root.finance,
        claims: [
          {
            claimId: entityId('adapter-claim'),
            membershipId: membership.membershipId,
            poolId: account.poolId,
            rateVersion: entityId('adapter-rate'),
            dueAt: root.lifecycle.campaignTick,
            fromTick: root.lifecycle.campaignTick,
            toTick: root.lifecycle.campaignTick,
            dailyWageMilli: '0',
            maintenanceId: null,
            earned: [],
            paidQ: moneyQ('0'),
            reportedQ: moneyQ('0'),
            reportedCoveredQ: moneyQ('0'),
          },
        ],
      },
    },
    local,
  );
}

function scope(root: CompanyEconomyState) {
  return {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    atTick: root.lifecycle.campaignTick,
    commandId: 'pay-deceased-wages',
    sourceEventId: 'pay-deceased-wages-source',
    characterId: 'a-worker-0',
    expectedPublicRevision: root.lifecycle.knowledge.revision,
    carriedPurse: {
      walletId: root.finance.pools[0]!.walletId,
      partyId: root.lifecycle.parties[0]!.partyId,
    },
  };
}

describe('PayDeceasedWages server protocol adapter', () => {
  it('parses the narrow request, derives domain intent, and prepares Kamenny Brod owned access', () => {
    const request = {
      schemaVersion: 2,
      commandId: 'pay-deceased-wages',
      expectedPublicRevision: '0',
      type: 'PayDeceasedWages',
      payload: { characterId: 'a-worker-0' },
    };
    const parsed = parsePayDeceasedWagesRequest(request);
    expect(parsed).toBeDefined();
    expect(payDeceasedWagesCommandIntent(parsed!)).toEqual({
      type: 'PayDeceasedWages',
      payload: { characterId: 'a-worker-0' },
    });
    expect(
      parsePayDeceasedWagesRequest({
        ...request,
        payload: { characterId: 'a-worker-0', amountQ: '5' },
      }),
    ).toBeUndefined();

    const root = rootAtKamennyBrod();
    const prepared = prepareDeceasedWageAccess(root, scope(root));
    expect(prepared.kind).toBe('PREPARED');
    if (prepared.kind !== 'PREPARED') return;
    expect(prepared.access).toMatchObject({
      kind: 'LOCAL_MONEY_ACCESS',
      location: local,
      poolIds: ['local'],
      recipientWalletIds: [],
    });
    expect(prepared.contactIds).toContain(prepared.access.operatorId);
  });

  it('rejects stale, remote, or unowned purse access without relocating a wallet', () => {
    const root = rootAtKamennyBrod();
    expect(
      prepareDeceasedWageAccess(root, {
        ...scope(root),
        expectedPublicRevision: '1',
      }),
    ).toEqual({ kind: 'REJECTED', reason: 'CONTACT_OR_ACCESS_REQUIRED' });
    const away = atPlace(root, remote);
    expect(prepareDeceasedWageAccess(away, scope(away))).toEqual({
      kind: 'REJECTED',
      reason: 'CONTACT_OR_ACCESS_REQUIRED',
    });
    const noCarriedPurse = { ...scope(root), carriedPurse: undefined };
    expect(prepareDeceasedWageAccess(root, noCarriedPurse)).toEqual({
      kind: 'REJECTED',
      reason: 'CONTACT_OR_ACCESS_REQUIRED',
    });
    expect(root.finance.wallets[0]?.location).toEqual(local);
  });
});

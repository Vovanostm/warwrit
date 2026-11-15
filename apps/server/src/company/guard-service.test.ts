import { describe, expect, it } from 'vitest';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { courseProviderWalletId, KAMENNY_BROD_GUARD_COURSE } from './courses.js';
import {
  guardServiceOfferId,
  GUARD_SERVICE_TERMS_VERSION,
  prepareGuardServiceMoneyAccess,
  prepareGuardServiceOffer,
} from './guard-service.js';

function localCompany() {
  const base = createCompanyCombatAggregateFixture().state;
  const location = KAMENNY_BROD_GUARD_COURSE.location;
  const partyId = base.economy.lifecycle.parties[0]!.partyId;
  const members = new Set(
    base.economy.lifecycle.characters
      .filter((character) => character.presence.fieldPartyId === partyId)
      .map((character) => character.identity.characterId),
  );
  const state = {
    ...base,
    economy: {
      ...base.economy,
      lifecycle: {
        ...base.economy.lifecycle,
        parties: base.economy.lifecycle.parties.map((party) =>
          party.partyId === partyId ? { ...party, location } : party,
        ),
        characters: base.economy.lifecycle.characters.map((character) =>
          members.has(character.identity.characterId)
            ? {
                ...character,
                presence: {
                  ...character.presence,
                  location,
                  availability: 'AVAILABLE' as const,
                  encounterBindingId: null,
                },
              }
            : character,
        ),
      },
      finance: {
        ...base.economy.finance,
        wallets: base.economy.finance.wallets.map((wallet) =>
          wallet.walletId ===
          base.economy.finance.pools.find((pool) => pool.poolId === 'local')?.walletId
            ? { ...wallet, location }
            : wallet,
        ),
      },
    },
  };
  return state;
}

describe('Kamenny Brod guard service source', () => {
  it('derives a current offer from the real local company group and no provider purse', () => {
    const initial = localCompany();
    const companyId = initial.economy.lifecycle.companyId;
    const worldId = initial.economy.lifecycle.worldId;
    const revision = String(initial.economy.lifecycle.knowledge.revision);
    const offerId = guardServiceOfferId(worldId, companyId, revision, '0');
    const result = prepareGuardServiceOffer({
      state: initial,
      worldId,
      companyId,
      atTick: '0',
      offerId,
    });

    expect(result.offer).toMatchObject({
      id: offerId,
      kind: 'SAFE_SERVICE_OFFER',
      providerId: KAMENNY_BROD_GUARD_COURSE.providerId,
      offerRevision: revision,
      termsVersion: GUARD_SERVICE_TERMS_VERSION,
      safe: true,
      inhabited: true,
      accessible: true,
    });
    expect(result.offer?.permittedBeneficiaryIds).toContain(
      initial.economy.lifecycle.company?.currentLeaderId,
    );
    const access = prepareGuardServiceMoneyAccess({
      state: result.state,
      worldId,
      companyId,
      atTick: '0',
      evidenceId: 'guard-service-local-access',
    });
    expect(access).toMatchObject({
      kind: 'LOCAL_MONEY_ACCESS',
      location: KAMENNY_BROD_GUARD_COURSE.location,
      poolIds: ['local'],
      recipientWalletIds: [],
    });
    expect(
      result.state.economy.finance.wallets.find(
        (wallet) =>
          wallet.walletId === courseProviderWalletId(worldId, companyId) &&
          wallet.owner.id === KAMENNY_BROD_GUARD_COURSE.providerId,
      )?.cashQ,
    ).toBe('0');
  });

  it('withholds the offer away from the named guard place', () => {
    const initial = localCompany();
    const outside = {
      ...initial,
      economy: {
        ...initial.economy,
        lifecycle: {
          ...initial.economy.lifecycle,
          parties: initial.economy.lifecycle.parties.map((party) => ({
            ...party,
            location: { kind: 'AT' as const, siteId: 'bereznyak', areaId: 'green' },
          })),
        },
      },
    };
    const offer = prepareGuardServiceOffer({
      state: outside,
      worldId: outside.economy.lifecycle.worldId,
      companyId: outside.economy.lifecycle.companyId,
      atTick: '0',
      offerId: 'guard-service-away',
    });
    expect(offer.offer).toBeUndefined();
  });
});

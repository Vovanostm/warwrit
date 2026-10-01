import { describe, expect, it } from 'vitest';

import {
  FIRST_HUNT_ENCOUNTER_LOCATION,
  FIRST_HUNT_COMBAT_MAP,
  FIRST_HUNT_ALLIED_SLOTS,
  FIRST_HUNT_RETREAT_HEXES,
  FIRST_HUNT_GENESIS_WALLET_Q,
  FIRST_HUNT_HOSTILE_GENESIS,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_ISSUER_ID,
  FIRST_HUNT_ISSUER_LOCATION,
  FIRST_HUNT_PROFILE_ID,
  FIRST_HUNT_PROOF_ID,
  FIRST_HUNT_REWARD_Q,
  FIRST_HUNT_WALLET_ID,
  COMPANY_CATALOGUE,
  createHexagon,
  assessPhysicalFoodStock,
  isOpposingEncounterSide,
  prepareFirstHuntLifecycleTransition,
} from '@warwrit/game-core';
import { economy, tick } from './company-economy-fixture.js';

describe('FIRST HUNT world profile', () => {
  it('keeps its authored issuer, funded purse, unique proof and persistent hostile identities together', () => {
    expect(FIRST_HUNT_PROFILE_ID).toBe('first-hunt-runtime-profile-2026-10-01-v1');
    expect(FIRST_HUNT_INSTANCE_ID).toBe('ci.m1.raider-standard.01');
    expect(FIRST_HUNT_ISSUER_ID).toBe('npc.city-watch-contact.kamenny-brod.01');
    expect(FIRST_HUNT_WALLET_ID).toBe('wallet.city-watch.kamenny-brod.01');
    expect(FIRST_HUNT_ISSUER_LOCATION).toEqual({
      siteId: 'kamenny-brod',
      areaId: 'kamenny-brod-market',
    });
    expect(FIRST_HUNT_ENCOUNTER_LOCATION).toEqual({
      siteId: 'staraya-melnitsa',
      areaId: 'staraya-melnitsa-yard',
    });
    expect(FIRST_HUNT_GENESIS_WALLET_Q).toBe('200000000');
    expect(FIRST_HUNT_REWARD_Q).toBe('100000000');
    expect(FIRST_HUNT_PROOF_ID).toBe('proof.raider-standard.old-mill.01');
    expect(COMPANY_CATALOGUE.items.find((item) => item.id === 'raider-standard-trophy')).toEqual({
      id: 'raider-standard-trophy',
      kind: 'trophy',
      weightG: 1000,
      stackMax: 1,
      enabled: true,
    });
    expect(FIRST_HUNT_HOSTILE_GENESIS.map((hostile) => hostile.entityId)).toEqual([
      'world.raider.old-mill.front.01',
      'world.raider.old-mill.heavy.01',
      'world.raider.old-mill.bow.01',
    ]);
    expect(FIRST_HUNT_HOSTILE_GENESIS.map((hostile) => hostile.position)).toEqual([
      { q: 2, r: 0 },
      { q: 2, r: -1 },
      { q: 2, r: -2 },
    ]);
    expect(
      FIRST_HUNT_HOSTILE_GENESIS.every((hostile) =>
        createHexagon(3).some(
          (position) => position.q === hostile.position.q && position.r === hostile.position.r,
        ),
      ),
    ).toBe(true);
    expect(FIRST_HUNT_HOSTILE_GENESIS.every((hostile) => hostile.initialPools.health === 60)).toBe(
      true,
    );
    expect(FIRST_HUNT_COMBAT_MAP.hexes).toHaveLength(37);
    expect(FIRST_HUNT_COMBAT_MAP.blocked).toEqual([{ q: 0, r: 0 }]);
    expect(FIRST_HUNT_ALLIED_SLOTS).toHaveLength(9);
    expect(FIRST_HUNT_RETREAT_HEXES.allied.every(({ q }) => q === -3)).toBe(true);
    expect(FIRST_HUNT_RETREAT_HEXES.hostile.every(({ q }) => q === 3)).toBe(true);
  });

  it('treats a helper on the owner side as allied and a world raider on the other side as an opponent', () => {
    const binding = {
      participants: [
        { companyId: 'owner', sideId: 'companies' },
        { companyId: 'helper', sideId: 'companies' },
      ],
      setup: {
        units: [
          { id: 'owner-unit', sideId: 'companies' },
          { id: 'helper-unit', sideId: 'companies' },
          { id: 'world.raider.old-mill.front.01', sideId: 'hostiles' },
        ],
      },
    };
    expect(isOpposingEncounterSide(binding, 'owner', 'helper-unit')).toBe(false);
    expect(isOpposingEncounterSide(binding, 'owner', 'world.raider.old-mill.front.01')).toBe(true);
  });

  it('assesses route rations with the same fractional carry rule as physical settlement', () => {
    const base = economy([], 100n, 500);
    const companyId = base.lifecycle.companyId;
    const physical = {
      ...base.physical!,
      foodCarry: [{ membershipId: 'service-leader', tickUnits: '500' }],
      items: [
        {
          itemId: 'route-ration',
          definitionId: 'ration',
          owner: { kind: 'COMPANY' as const, id: companyId },
          containerId: 'party-supply',
          quantity: 1,
          currentCondition: 10000,
          maximumCondition: 10000,
          contentRevision: '1',
          provenance: { sourceId: 'ration-source', parentItemId: null, ordinal: 0 },
          equipped: null,
          tombstone: null,
        },
      ],
    };
    const retainedFraction = assessPhysicalFoodStock(
      physical,
      [
        {
          kind: 'FOOD_CONSUMPTION',
          membershipId: 'service-leader',
          fromTick: tick(500),
          toTick: tick(1000),
          tickUnits: '500',
        },
      ],
      ['party-supply'],
      companyId,
    );
    expect(retainedFraction).toEqual({
      requiredUnits: '0',
      availableUnits: '1',
      knownShortage: false,
    });

    const nextRation = assessPhysicalFoodStock(
      physical,
      [
        {
          kind: 'FOOD_CONSUMPTION',
          membershipId: 'service-leader',
          fromTick: tick(500),
          toTick: tick(1001),
          tickUnits: '501',
        },
      ],
      ['party-supply'],
      companyId,
    );
    expect(nextRation).toEqual({
      requiredUnits: '1',
      availableUnits: '1',
      knownShortage: false,
    });
  });
});

describe('FIRST HUNT participation lifecycle', () => {
  const offered = {
    revision: '0',
    ownerCompanyId: null,
    helperCompanyId: null,
    ownerJoin: null,
    helperJoin: null,
  } as const;

  it('binds one owner and helper to immutable terms and retains independent JOIN intents', () => {
    const accepted = prepareFirstHuntLifecycleTransition(offered, {
      type: 'ACCEPT',
      companyId: 'owner-company',
      accountId: 'owner-account',
      expectedRevision: '0',
      expectedTermsDigest: 'terms-digest',
      termsDigest: 'terms-digest',
      atIssuer: true,
    });
    expect(accepted.kind).toBe('PREPARED');
    if (accepted.kind !== 'PREPARED') return;
    const helped = prepareFirstHuntLifecycleTransition(accepted.next, {
      type: 'HELP',
      companyId: 'helper-company',
      accountId: 'helper-account',
      expectedRevision: '1',
      expectedTermsDigest: 'terms-digest',
      termsDigest: 'terms-digest',
      atIssuer: true,
    });
    expect(helped.kind).toBe('PREPARED');
    if (helped.kind !== 'PREPARED') return;
    const ownerJoin = prepareFirstHuntLifecycleTransition(helped.next, {
      type: 'JOIN',
      companyId: 'owner-company',
      accountId: 'owner-account',
      expectedRevision: '2',
      publicRevision: '4',
      campaignTick: '40',
      atObjective: true,
    });
    expect(ownerJoin.kind).toBe('PREPARED');
    if (ownerJoin.kind !== 'PREPARED') return;
    const helperJoin = prepareFirstHuntLifecycleTransition(ownerJoin.next, {
      type: 'JOIN',
      companyId: 'helper-company',
      accountId: 'helper-account',
      expectedRevision: '3',
      publicRevision: '8',
      campaignTick: '40',
      atObjective: true,
    });
    expect(helperJoin).toMatchObject({
      kind: 'PREPARED',
      next: {
        revision: '4',
        ownerJoin: { companyId: 'owner-company', accountId: 'owner-account' },
        helperJoin: { companyId: 'helper-company', accountId: 'helper-account' },
      },
    });
  });

  it('rejects changed terms, stale revisions and active encounter withdrawal unchanged', () => {
    expect(
      prepareFirstHuntLifecycleTransition(offered, {
        type: 'ACCEPT',
        companyId: 'owner-company',
        accountId: 'owner-account',
        expectedRevision: '0',
        expectedTermsDigest: 'frozen',
        termsDigest: 'changed',
        atIssuer: true,
      }),
    ).toEqual({ kind: 'REJECTED', code: 'TERMS_CHANGED' });
    expect(
      prepareFirstHuntLifecycleTransition(offered, {
        type: 'ACCEPT',
        companyId: 'owner-company',
        accountId: 'owner-account',
        expectedRevision: '1',
        expectedTermsDigest: 'frozen',
        termsDigest: 'frozen',
        atIssuer: true,
      }),
    ).toEqual({ kind: 'REJECTED', code: 'STALE_REVISION' });
    const active = {
      revision: '5',
      ownerCompanyId: 'owner-company',
      helperCompanyId: 'helper-company',
      ownerJoin: null,
      helperJoin: null,
    } as const;
    expect(
      prepareFirstHuntLifecycleTransition(active, {
        type: 'LEAVE',
        companyId: 'helper-company',
        accountId: 'helper-account',
        expectedRevision: '5',
        encounterActive: true,
      }),
    ).toEqual({ kind: 'REJECTED', code: 'NOT_AVAILABLE' });
  });

  it('lets a helper withdraw before activation without clearing the owner intent', () => {
    const state = {
      revision: '3',
      ownerCompanyId: 'owner-company',
      helperCompanyId: 'helper-company',
      ownerJoin: {
        companyId: 'owner-company',
        accountId: 'owner-account',
        publicRevision: '2',
        campaignTick: '40',
      },
      helperJoin: {
        companyId: 'helper-company',
        accountId: 'helper-account',
        publicRevision: '6',
        campaignTick: '40',
      },
    } as const;
    expect(
      prepareFirstHuntLifecycleTransition(state, {
        type: 'LEAVE',
        companyId: 'helper-company',
        accountId: 'helper-account',
        expectedRevision: '3',
        encounterActive: false,
      }),
    ).toEqual({
      kind: 'PREPARED',
      next: {
        revision: '4',
        ownerCompanyId: 'owner-company',
        helperCompanyId: null,
        ownerJoin: state.ownerJoin,
        helperJoin: null,
      },
    });
  });
});

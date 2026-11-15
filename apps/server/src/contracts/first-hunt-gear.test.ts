import { describe, expect, it } from 'vitest';

import {
  COMPANY_CATALOGUE,
  HUNT_PROFILES,
  M1_DOMAIN_BRIDGE_V6_RULESET_ID,
} from '@warwrit/game-core';

import { readHuntWorldState, type FirstHuntHostileState } from './first-hunt-runtime.js';
import {
  groundSurrenderedHostileGear,
  initializeHostileGearForNewV6Admission,
} from './first-hunt-gear.js';

const profile = HUNT_PROFILES[0]!;
const worldId = 'world.hostile-gear.test';
const encounterId = 'encounter.hostile-gear.test.01';
const location = { kind: 'AT' as const, ...profile.objectiveLocation };

function world(
  hostiles: readonly unknown[] = profile.hostiles.map((hostile) => ({
    ...hostile,
    currentPools: { ...hostile.initialPools },
  })),
) {
  return readHuntWorldState(worldId, profile, {
    world_id: worldId,
    schema_version: 1,
    profile_id: profile.profileId,
    genesis_source_id: 'first-hunt-world-genesis-v1',
    revision: '0',
    seed: '1',
    issuer_id: profile.issuerId,
    issuer_area_id: profile.issuerLocation.areaId,
    wallet_id: profile.walletId,
    wallet_q: profile.genesisWalletQ,
    hostiles,
  });
}

describe('canonical hostile gear', () => {
  it('keeps legacy absent gear absent until a new validated V6 admission', () => {
    const legacy = world();
    expect(legacy.hostiles.every((hostile) => hostile.gear === undefined)).toBe(true);

    const initialized = initializeHostileGearForNewV6Admission({
      world: legacy,
      encounterId,
      rulesetId: M1_DOMAIN_BRIDGE_V6_RULESET_ID,
      location,
    });
    expect(
      initialized.map((hostile) => hostile.gear?.items.map((item) => item.definitionId)),
    ).toEqual([
      ['raider-weapon', 'padded-coat'],
      ['great-weapon', 'padded-coat'],
      ['bow', 'padded-coat'],
    ]);
    expect(initialized[0]!.gear?.items.map((item) => item.currentCondition)).toEqual([10000, 40]);
    expect(
      initialized
        .flatMap((hostile) => hostile.gear!.items)
        .every((item) =>
          COMPANY_CATALOGUE.items.some(
            (definition) => definition.id === item.definitionId && definition.enabled,
          ),
        ),
    ).toBe(true);
    expect(
      initializeHostileGearForNewV6Admission({
        world: { ...legacy, hostiles: initialized },
        encounterId: 'encounter.hostile-gear.test.02',
        rulesetId: M1_DOMAIN_BRIDGE_V6_RULESET_ID,
        location,
      }),
    ).toEqual(initialized);
  });

  it('rejects non-V6 initialization and leaves beast descriptive gear without loot instances', () => {
    expect(() =>
      initializeHostileGearForNewV6Admission({
        world: world(),
        encounterId,
        rulesetId: 'sprite-prototype-v5',
        location,
      }),
    ).toThrow('validated V6 admission');

    const beastProfile = HUNT_PROFILES.find((entry) => entry.instanceId === 'ci.m1.mill-beast.01')!;
    const beastWorld = readHuntWorldState('world.beast-gear.test', beastProfile, {
      world_id: 'world.beast-gear.test',
      instance_id: beastProfile.instanceId,
      schema_version: 1,
      profile_id: beastProfile.profileId,
      genesis_source_id: `hunt-world-genesis-v1:${beastProfile.instanceId}`,
      revision: '0',
      seed: '2',
      issuer_id: beastProfile.issuerId,
      issuer_area_id: beastProfile.issuerLocation.areaId,
      wallet_id: beastProfile.walletId,
      wallet_q: beastProfile.genesisWalletQ,
      hostiles: beastProfile.hostiles.map((hostile) => ({
        ...hostile,
        currentPools: { ...hostile.initialPools },
      })),
    });
    const initialized = initializeHostileGearForNewV6Admission({
      world: beastWorld,
      encounterId,
      rulesetId: M1_DOMAIN_BRIDGE_V6_RULESET_ID,
      location: { kind: 'AT', ...beastProfile.objectiveLocation },
    });
    expect(initialized[0]!.gear).toBeUndefined();
  });

  it('persists explicit surrendered disposition only while the hostile is alive', () => {
    const raw = rawWorldHostiles();
    raw[0] = { ...raw[0]!, disposition: 'surrendered' };
    expect(world(raw).hostiles[0]!.disposition).toBe('surrendered');

    raw[0] = {
      ...raw[0]!,
      currentPools: {
        ...(raw[0]!['currentPools'] as Record<string, unknown>),
        health: 0,
      },
      disposition: 'surrendered',
    };
    expect(() => world(raw)).toThrow('disposition is invalid');
    raw[0] = { ...raw[0]!, disposition: 'escaped' };
    expect(() => world(raw)).toThrow('disposition is invalid');
  });

  it('grounds the same finite gear once under a world-owned terminal bundle', () => {
    const initialized = initializeHostileGearForNewV6Admission({
      world: world(),
      encounterId,
      rulesetId: M1_DOMAIN_BRIDGE_V6_RULESET_ID,
      location,
    });
    const surrendered: FirstHuntHostileState = {
      ...initialized[0]!,
      disposition: 'surrendered',
    };
    const dropped = groundSurrenderedHostileGear({
      worldId,
      profile,
      hostile: surrendered,
      terminalSourceId: 'encounter.hostile-gear.test.terminal',
      location,
    });
    expect(dropped.gear?.status).toBe('DROPPED');
    expect(dropped.gear?.container.kind).toBe('GROUND_BUNDLE');
    expect(dropped.gear?.container.custodian).toEqual({ kind: 'WORLD', id: worldId });
    expect(world([dropped, ...initialized.slice(1)]).hostiles[0]!.gear?.status).toBe('DROPPED');
    expect(dropped.gear?.items.map((item) => item.itemId)).toEqual(
      surrendered.gear!.items.map((item) => item.itemId),
    );
    expect(dropped.gear?.items.every((item) => item.equipped === null)).toBe(true);
    expect(
      groundSurrenderedHostileGear({
        worldId,
        profile,
        hostile: dropped,
        terminalSourceId: 'encounter.hostile-gear.test.terminal',
        location,
      }),
    ).toEqual(dropped);
    expect(() =>
      groundSurrenderedHostileGear({
        worldId,
        profile,
        hostile: dropped,
        terminalSourceId: 'encounter.hostile-gear.test.other-terminal',
        location,
      }),
    ).toThrow('already dropped');
  });

  it('rejects forged gear identities and ownership when reading saved hostiles', () => {
    const initialized = initializeHostileGearForNewV6Admission({
      world: world(),
      encounterId,
      rulesetId: M1_DOMAIN_BRIDGE_V6_RULESET_ID,
      location,
    });
    const hostiles = rawWorldHostiles(initialized);
    const first = hostiles[0] as Record<string, unknown>;
    const gear = first['gear'] as { items: Record<string, unknown>[] };
    gear.items[0] = { ...gear.items[0]!, owner: { kind: 'COMPANY', id: worldId } };
    expect(() => world(hostiles)).toThrow('item does not match');
  });
});

function rawWorldHostiles(
  values: readonly unknown[] = profile.hostiles.map((hostile) => ({
    ...hostile,
    currentPools: { ...hostile.initialPools },
  })),
): Record<string, unknown>[] {
  return values.map((hostile) => structuredClone(hostile) as Record<string, unknown>);
}

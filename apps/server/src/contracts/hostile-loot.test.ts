import { describe, expect, it } from 'vitest';

import {
  HUNT_PROFILES,
  M1_DOMAIN_BRIDGE_V6_RULESET_ID,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import type { HostileLootPickupRequestDto } from '@warwrit/protocol';

import { readHuntWorldState, type FirstHuntHostileState } from './first-hunt-runtime.js';
import {
  claimHostileGearItems,
  groundSurrenderedHostileGear,
  initializeHostileGearForNewV6Admission,
  recordHostileGearTerminal,
} from './first-hunt-gear.js';
import { prepareHostileLootPickup } from './hostile-loot.js';

const profile = HUNT_PROFILES[0]!;
const worldId = 'world';
const terminalSourceId = 'encounter:11111111-1111-4111-8111-111111111111:terminal';
const terminalRevision = 9;
const atObjective = { kind: 'AT' as const, ...profile.objectiveLocation };

function stateAtObjective() {
  const initial = createCompanyCombatAggregateFixture().state;
  const lifecycle = initial.economy.lifecycle;
  const characters = lifecycle.characters.map((character) => ({
    ...character,
    presence: { ...character.presence, location: atObjective },
  }));
  const knownCharacters = lifecycle.knowledge.characters.map((character) => ({
    ...character,
    presence: { ...character.presence, location: atObjective },
  }));
  const containers = initial.economy.physical!.containers.map((container) => ({
    ...container,
    location: atObjective,
  }));
  return readCompanyCombatAggregateState({
    ...initial,
    economy: {
      ...initial.economy,
      lifecycle: {
        ...lifecycle,
        characters,
        parties: lifecycle.parties.map((party) => ({ ...party, location: atObjective })),
        knowledge: { ...lifecycle.knowledge, characters: knownCharacters },
      },
      physical: {
        ...initial.economy.physical!,
        containers,
        knowledge: {
          ...initial.economy.physical!.knowledge,
          containerSnapshots: containers,
        },
      },
    },
  });
}

function deadHostile(): FirstHuntHostileState {
  const world = readHuntWorldState(worldId, profile, {
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
    hostiles: profile.hostiles.map((hostile) => ({
      ...hostile,
      currentPools: { ...hostile.initialPools },
    })),
  });
  const initialized = initializeHostileGearForNewV6Admission({
    world,
    encounterId: 'encounter.hostile-loot.test.admission',
    rulesetId: M1_DOMAIN_BRIDGE_V6_RULESET_ID,
    location: atObjective,
  });
  return recordHostileGearTerminal({
    worldId,
    profile,
    hostile: {
      ...initialized[0]!,
      currentPools: { ...initialized[0]!.currentPools, health: 0 },
    },
    terminalSourceId,
    terminalRevision,
  });
}

const request = (itemId: string): HostileLootPickupRequestDto => ({
  schemaVersion: 1,
  commandId: 'hostile-loot-command-1',
  expectedPublicRevision: '0',
  instanceId: profile.instanceId,
  hostileId: profile.hostiles[0]!.entityId,
  itemId,
  toContainerId: 'fixture-supply',
});

describe('hostile loot pickup preparation', () => {
  it('uses the existing item identity and ClaimLoot reducer for dead hostile gear', () => {
    const previous = stateAtObjective();
    const hostile = deadHostile();
    const sourceItem = hostile.gear!.items[0]!;
    const prepared = prepareHostileLootPickup({
      previous,
      accountId: 'owner-account',
      request: request(sourceItem.itemId),
      worldId,
      profile,
      hostile,
      terminalSourceId,
      terminalRevision,
      campaignTick: previous.economy.lifecycle.campaignTick,
    });
    expect(prepared.kind).toBe('PREPARED');
    if (prepared.kind !== 'PREPARED') return;
    expect(prepared.command.type).toBe('ClaimLoot');
    const claimed = prepared.next.economy.physical!.items.find(
      (item) => item.itemId === sourceItem.itemId,
    );
    expect(claimed).toMatchObject({
      itemId: sourceItem.itemId,
      definitionId: sourceItem.definitionId,
      owner: { kind: 'COMPANY', id: previous.economy.lifecycle.companyId },
      containerId: 'fixture-supply',
      provenance: sourceItem.provenance,
    });
    expect(
      prepared.next.economy.physical!.items.filter((item) => item.itemId === sourceItem.itemId),
    ).toHaveLength(1);
    expect(previous.economy.physical!.items.some((item) => item.itemId === sourceItem.itemId)).toBe(
      false,
    );
  });

  it('requires a loot operator to have active membership in the owning company', () => {
    const state = stateAtObjective();
    const lifecycle = state.economy.lifecycle;
    const remote = { kind: 'AT' as const, siteId: 'remote-site', areaId: 'remote-area' };
    const provider = lifecycle.characters.find(
      (character) => character.presence.fieldPartyId === null,
    )!;
    expect(
      lifecycle.memberships.some(
        (membership) => membership.characterId === provider.identity.characterId,
      ),
    ).toBe(false);
    const previous = readCompanyCombatAggregateState({
      ...state,
      economy: {
        ...state.economy,
        lifecycle: {
          ...lifecycle,
          parties: lifecycle.parties.map((party) => ({ ...party, location: remote })),
          characters: lifecycle.characters.map((character) =>
            character.presence.fieldPartyId === null
              ? character
              : { ...character, presence: { ...character.presence, location: remote } },
          ),
          knowledge: {
            ...lifecycle.knowledge,
            characters: lifecycle.knowledge.characters.map((character) =>
              character.presence.fieldPartyId === null
                ? character
                : { ...character, presence: { ...character.presence, location: remote } },
            ),
          },
        },
      },
    });
    const hostile = deadHostile();
    expect(
      prepareHostileLootPickup({
        previous,
        accountId: 'owner-account',
        request: request(hostile.gear!.items[0]!.itemId),
        worldId,
        profile,
        hostile,
        terminalSourceId,
        terminalRevision,
        campaignTick: lifecycle.campaignTick,
      }),
    ).toEqual({ kind: 'REJECTED', code: 'NOT_AVAILABLE' });
  });

  it('can claim the second item from the same retained source container', () => {
    const previous = stateAtObjective();
    const hostile = deadHostile();
    const first = hostile.gear!.items[0]!;
    const firstPrepared = prepareHostileLootPickup({
      previous,
      accountId: 'owner-account',
      request: request(first.itemId),
      worldId,
      profile,
      hostile,
      terminalSourceId,
      terminalRevision,
      campaignTick: previous.economy.lifecycle.campaignTick,
    });
    expect(firstPrepared.kind).toBe('PREPARED');
    if (firstPrepared.kind !== 'PREPARED') return;
    const afterFirst = claimHostileGearItems({
      worldId,
      profile,
      hostile,
      itemIds: [first.itemId],
      terminalSourceId,
      terminalRevision,
    });
    const second = afterFirst.gear!.items[0]!;
    const secondPrepared = prepareHostileLootPickup({
      previous: firstPrepared.next,
      accountId: 'owner-account',
      request: {
        ...request(second.itemId),
        commandId: 'hostile-loot-command-2',
        expectedPublicRevision: firstPrepared.next.economy.lifecycle.knowledge.revision,
      },
      worldId,
      profile,
      hostile: afterFirst,
      terminalSourceId,
      terminalRevision,
      campaignTick: firstPrepared.next.economy.lifecycle.campaignTick,
    });
    expect(secondPrepared.kind).toBe('PREPARED');
    if (secondPrepared.kind !== 'PREPARED') return;
    expect(
      secondPrepared.next.economy.physical!.items.filter(
        (item) => item.itemId === first.itemId || item.itemId === second.itemId,
      ),
    ).toHaveLength(2);
  });

  it('rejects living non-surrendered gear and a different terminal source', () => {
    const hostile = deadHostile();
    const alive = { ...hostile, currentPools: { ...hostile.currentPools, health: 10 } };
    const common = {
      previous: stateAtObjective(),
      accountId: 'owner-account',
      request: request(hostile.gear!.items[0]!.itemId),
      worldId,
      profile,
      terminalRevision,
      campaignTick: stateAtObjective().economy.lifecycle.campaignTick,
    } as const;
    expect(prepareHostileLootPickup({ ...common, hostile: alive, terminalSourceId })).toEqual({
      kind: 'REJECTED',
      code: 'NOT_AVAILABLE',
    });
    expect(
      prepareHostileLootPickup({
        ...common,
        hostile,
        terminalSourceId: 'encounter:22222222-2222-4222-8222-222222222222:terminal',
      }),
    ).toEqual({ kind: 'REJECTED', code: 'NOT_AVAILABLE' });
  });

  it('uses the same finite ClaimLoot path for living surrendered gear', () => {
    const dead = deadHostile();
    const surrendered = groundSurrenderedHostileGear({
      worldId,
      profile,
      hostile: {
        ...dead,
        currentPools: { ...dead.currentPools, health: 25 },
        disposition: 'surrendered',
      },
      terminalSourceId,
      terminalRevision,
      location: atObjective,
    });
    const item = surrendered.gear!.items[0]!;
    const prepared = prepareHostileLootPickup({
      previous: stateAtObjective(),
      accountId: 'owner-account',
      request: request(item.itemId),
      worldId,
      profile,
      hostile: surrendered,
      terminalSourceId,
      terminalRevision,
      campaignTick: stateAtObjective().economy.lifecycle.campaignTick,
    });
    expect(prepared.kind).toBe('PREPARED');
  });
});

import { describe, expect, it } from 'vitest';

import {
  applyCombatCommand,
  battleId,
  canonicalCombatState,
  commandId,
  COMBAT_SCHEMA_VERSION,
  COMBAT_V2_SCHEMA_VERSION,
  createHexagon,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  replayCombat,
  sideId,
  startBattleV2,
  unitId,
  type BattleSetupV2,
  type CombatReplayV2,
  type VersionedCombatReplay,
} from '../index.js';

function setupV2(): BattleSetupV2 {
  const hexes = createHexagon(2);
  const alpha = sideId('alpha');
  const beta = sideId('beta');
  return {
    schemaVersion: COMBAT_V2_SCHEMA_VERSION,
    battleId: battleId('g02-v2'),
    rulesetId: M1_DOMAIN_BRIDGE_RULESET_ID,
    seed: 23,
    map: { hexes, blocked: [] },
    sides: [
      { id: alpha, retreatHexes: hexes.filter(({ q }) => q === -2) },
      { id: beta, retreatHexes: hexes.filter(({ q }) => q === 2) },
    ],
    units: [
      {
        id: unitId('alpha-1'),
        sideId: alpha,
        position: { q: 0, r: 0 },
        weaponId: 'sword-shield',
        attributes: {
          health: 80,
          armor: 30,
          stamina: 80,
          initiative: 110,
          accuracy: 20,
          defense: 10,
          morale: 70,
        },
        initialPools: { health: 53, armor: 11, stamina: 0, morale: 42 },
      },
      {
        id: unitId('beta-1'),
        sideId: beta,
        position: { q: 1, r: 0 },
        weaponId: 'raider',
        attributes: {
          health: 90,
          armor: 35,
          stamina: 90,
          initiative: 100,
          accuracy: 18,
          defense: 8,
          morale: 75,
        },
        initialPools: { health: 71, armor: 5, stamina: 70, morale: 55 },
      },
    ],
  };
}

function unit(state: ReturnType<typeof startBattleV2>['state'], id: string) {
  const found = state.units.find(({ id: unitIdValue }) => unitIdValue === id);
  expect(found).toBeDefined();
  if (found === undefined) {
    throw new Error(`Expected combat unit ${id}`);
  }
  return found;
}

describe('combat V2 runtime', () => {
  it('uses explicit current pools before first initiative and only then applies activation recovery', () => {
    const started = startBattleV2(setupV2());

    expect(started.state.schemaVersion).toBe(COMBAT_SCHEMA_VERSION);
    expect(started.state.rulesetId).toBe(M1_DOMAIN_BRIDGE_RULESET_ID);
    expect(started.state.units).toHaveLength(2);
    expect(started.state.initiativeOrder).toEqual([unitId('beta-1'), unitId('alpha-1')]);
    expect(started.state.activation?.unitId).toBe(unitId('beta-1'));
    expect(started.state.random.draws).toBe(0);

    expect(unit(started.state, 'alpha-1')).toMatchObject({
      health: 53,
      armor: 11,
      stamina: 0,
      morale: 42,
      guarding: false,
      status: 'active',
      wounds: [],
    });
    expect(unit(started.state, 'beta-1')).toMatchObject({
      health: 71,
      armor: 5,
      stamina: 88,
      morale: 55,
      guarding: false,
      status: 'active',
      wounds: [],
    });
    expect(started.events).toMatchObject([
      { type: 'battle.started', rulesetId: M1_DOMAIN_BRIDGE_RULESET_ID },
      { type: 'round.started', initiativeOrder: [unitId('beta-1'), unitId('alpha-1')] },
      { type: 'activation.started', unitId: unitId('beta-1') },
    ]);
  });

  it('replays a serialized V2 attack through the shared reducer with identical RNG state', () => {
    const setup = setupV2();
    const started = startBattleV2(setup);
    const activation = started.state.activation;
    expect(activation).not.toBeNull();
    if (activation === null) {
      throw new Error('Expected V2 activation');
    }
    const attack = {
      type: 'attack' as const,
      commandId: commandId('g02:attack'),
      activationId: activation.id,
      actorId: activation.unitId,
      targetId: unitId('alpha-1'),
    };
    const applied = applyCombatCommand(started.state, attack);
    expect(applied.ok).toBe(true);
    if (!applied.ok) {
      throw new Error('Expected V2 attack to use the shared reducer');
    }

    const replay: CombatReplayV2 = {
      schemaVersion: COMBAT_V2_SCHEMA_VERSION,
      setup,
      commands: [attack],
    };
    const parsed = JSON.parse(JSON.stringify(replay)) as CombatReplayV2;
    const replayed = replayCombat(parsed);
    const replayedAgain = replayCombat(parsed);

    expect(replayed.commandsApplied).toBe(1);
    expect(replayed.state.random.draws).toBeGreaterThan(0);
    expect(replayed.state.random).toEqual(applied.state.random);
    expect(canonicalCombatState(replayed.state)).toBe(canonicalCombatState(applied.state));
    expect(canonicalCombatState(replayedAgain.state)).toBe(canonicalCombatState(replayed.state));
  });

  it('fails malformed V2 starts and unsupported replay versions closed without mutating input', () => {
    const setup = setupV2();
    const malformed = {
      ...setup,
      units: setup.units.map((candidate, index) =>
        index === 0
          ? {
              ...candidate,
              initialPools: { ...candidate.initialPools, stamina: candidate.attributes.stamina + 1 },
            }
          : candidate,
      ),
    } as BattleSetupV2;
    const before = JSON.stringify(malformed);

    expect(() => startBattleV2(malformed)).toThrow(/initialPools.stamina must not exceed/);
    expect(JSON.stringify(malformed)).toBe(before);

    const wrongRuleset = {
      ...setup,
      rulesetId: 'm0-prototype-v1',
    } as unknown as BattleSetupV2;
    expect(() => startBattleV2(wrongRuleset)).toThrow(/V2 battle setup ruleset must be/);

    const unsupported = {
      schemaVersion: 99,
      setup,
      commands: [],
    } as unknown as VersionedCombatReplay;
    expect(() => replayCombat(unsupported)).toThrow(/Unsupported combat replay schemaVersion: 99/);
  });
});

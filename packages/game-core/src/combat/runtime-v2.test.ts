import { describe, expect, it } from 'vitest';

import {
  applyCombatCommand,
  advanceCombatAutoplay,
  chooseAiCommand,
  battleId,
  canonicalCombatState,
  commandId,
  COMBAT_SCHEMA_VERSION,
  COMBAT_V2_SCHEMA_VERSION,
  createHexagon,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
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
  it('uses current pools before initiative, then applies activation recovery', () => {
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

  it('breaks initiative ties by id code units, independent of the host locale', () => {
    // ICU collation (any locale) puts 'unit-a' first; code units put 'Unit-b' first.
    // Recorded m1-domain-bridge encounters keep their locale order (see
    // order-compatibility.test.ts); the code-unit order applies from the V2 ruleset.
    const base = { ...setupV2(), rulesetId: M1_DOMAIN_BRIDGE_V2_RULESET_ID };
    const [template] = base.units;
    if (template === undefined) throw new Error('fixture unit missing');
    const tied = {
      ...base,
      units: base.units.map((unit, index) => ({
        ...unit,
        id: unitId(index === 0 ? 'unit-a' : 'Unit-b'),
        attributes: template.attributes,
        initialPools: template.initialPools,
      })),
    };

    const started = startBattleV2(tied);

    expect(started.state.initiativeOrder).toEqual([unitId('Unit-b'), unitId('unit-a')]);
    const canonical = JSON.parse(canonicalCombatState(started.state)) as {
      units: readonly { id: string }[];
    };
    expect(canonical.units.map(({ id }) => id)).toEqual(['Unit-b', 'unit-a']);
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

  it('fails malformed V2 starts and unsupported replay versions closed', () => {
    const setup = setupV2();
    const malformed = {
      ...setup,
      units: setup.units.map((candidate, index) =>
        index === 0
          ? {
              ...candidate,
              initialPools: {
                ...candidate.initialPools,
                stamina: candidate.attributes.stamina + 1,
              },
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

it('bridge-v3 retains immobile targets, rejects forbidden actions atomically and replays fists', () => {
  const base = setupV2();
  const setup: BattleSetupV2 = {
    ...base,
    rulesetId: 'm1-domain-bridge-v3',
    sides: [{ ...base.sides[0], retreatHexes: [{ q: 0, r: 0 }] }, base.sides[1]],
    units: base.units.map((entry, index) => ({
      ...entry,
      weaponId: index === 0 ? 'fists' : entry.weaponId,
      attributes: { ...entry.attributes, initiative: index === 0 ? 120 : 20, accuracy: 100 },
      initialPools: { ...entry.initialPools, stamina: 80 },
      capabilities: { move: false, attack: index === 0, defend: index === 0, retreat: false },
    })),
  };
  const started = startBattleV2(setup);
  const state = started.state;
  expect(state.activation?.unitId).toBe(setup.units[0]!.id);
  for (const intent of [
    { type: 'move' as const, to: { q: -1, r: 0 } },
    { type: 'retreat' as const },
  ]) {
    const rejected = applyCombatCommand(state, {
      ...intent,
      commandId: commandId('forbidden'),
      actorId: state.activation!.unitId,
      activationId: state.activation!.id,
    });
    expect(rejected).toMatchObject({ ok: false, error: { code: 'ACTION_NOT_AVAILABLE' } });
    expect(rejected.state).toBe(state);
    expect(rejected.state.random.draws).toBe(0);
  }
  const attack = {
    type: 'attack' as const,
    commandId: commandId('fists'),
    actorId: state.activation!.unitId,
    activationId: state.activation!.id,
    targetId: setup.units[1]!.id,
  };
  const hit = applyCombatCommand(state, attack);
  expect(hit.ok).toBe(true);
  if (!hit.ok) throw new Error(hit.error.code);
  expect(hit.events).toContainEqual(
    expect.objectContaining({
      type: 'unit.damaged',
      rawDamage: 6,
      armorAbsorbed: 5,
      healthDamage: 1,
      armorDamage: 5,
    }),
  );
  expect(hit.state.activation?.remainingActionPoints).toBe(2);
  expect(hit.state.units[0]!.stamina).toBe(72);
  expect(
    canonicalCombatState(replayCombat({ schemaVersion: 2, setup, commands: [attack] }).state),
  ).toBe(canonicalCombatState(hit.state));
  expect(() => startBattleV2({ ...setup, rulesetId: 'm1-domain-bridge-v2' })).toThrow();
  expect(() =>
    startBattleV2({
      ...setup,
      units: setup.units.map(({ capabilities: _capabilities, ...entry }) => entry),
    }),
  ).toThrow();
});

it('wait-only bridge-v3 actors remain targetable and autoplay terminates at the round limit', () => {
  const base = setupV2();
  const setup: BattleSetupV2 = {
    ...base,
    rulesetId: 'm1-domain-bridge-v3',
    units: base.units.map((unit) => ({
      ...unit,
      capabilities: { move: false, attack: false, defend: false, retreat: false },
    })),
  };
  const started = startBattleV2(setup);
  expect(chooseAiCommand(started.state, 'survivor').type).toBe('wait');
  const result = advanceCombatAutoplay(started.state, 'resolved');
  expect(result.state.status).toBe('resolved');
  expect(result.state.outcome?.reason).toBe('round-limit');
  expect(result.state.units.every((unit) => unit.status === 'active')).toBe(true);
  expect(result.commands.every((command) => command.type === 'wait')).toBe(true);
});

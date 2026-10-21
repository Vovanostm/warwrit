import { describe, expect, it } from 'vitest';

import {
  applyCombatCommand,
  advanceCombatAutoplay,
  chooseAiCommand,
  battleId,
  canonicalCombatState,
  commandId,
  combatRules,
  COMBAT_SCHEMA_VERSION,
  COMBAT_V2_SCHEMA_VERSION,
  createHexagon,
  M1_DOMAIN_BRIDGE_V4_RULESET_ID,
  M1_DOMAIN_BRIDGE_V5_RULESET_ID,
  previewCombatAttacks,
  queryCombatWeaponAttack,
  previewCombatMovement,
  M1_DOMAIN_BRIDGE_RULESET_ID,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  replayCombat,
  sideId,
  startBattleV2,
  chooseTacticalCombatCommand,
  unitId,
  weaponProfile,
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
  it.each([
    [M1_DOMAIN_BRIDGE_V4_RULESET_ID, 4, false],
    [M1_DOMAIN_BRIDGE_V5_RULESET_ID, 3, true],
  ] as const)(
    '%s keeps its bow AP profile through a same-activation move and shot',
    (rulesetId, shotCost, canShootAfterMoving) => {
      const base = setupV2();
      const setup: BattleSetupV2 = {
        ...base,
        rulesetId,
        units: base.units.map((unit, index) => ({
          ...unit,
          weaponId: index === 0 ? 'bow' : 'raider',
          attributes: { ...unit.attributes, stamina: 100 },
          initialPools: { ...unit.initialPools, stamina: 100 },
          capabilities: { move: true, attack: true, defend: true, retreat: true },
          skillRanks: {},
          moralePolicy: index === 0 ? 'human' : 'beast',
        })),
      };
      const initial = startBattleV2(setup).state;
      expect(weaponProfile(combatRules(rulesetId), 'bow').actionPointCost).toBe(shotCost);
      expect(initial.activation?.unitId).toBe(unitId('alpha-1'));
      expect(initial.activation?.remainingActionPoints).toBe(4);
      const activationId = initial.activation!.id;
      const move = previewCombatMovement(initial).find(
        (option) => option.to.q === -1 && option.to.r === 0,
      )!;
      expect(move).toMatchObject({ actionPointCost: 1, staminaCost: 4 });
      const moveCommand = {
        type: 'move' as const,
        commandId: commandId('bow-three-ap-step'),
        actorId: initial.activation!.unitId,
        activationId,
        to: move.to,
      };
      const moved = applyCombatCommand(initial, moveCommand);
      expect(moved.ok).toBe(true);
      if (!moved.ok) throw new Error(moved.error.code);
      expect(moved.state.activation).toMatchObject({ id: activationId, remainingActionPoints: 3 });
      expect(unit(moved.state, 'alpha-1').stamina).toBe(96);
      const previews = previewCombatAttacks(moved.state);
      if (!canShootAfterMoving) {
        expect(previews).toEqual([]);
        const rejected = applyCombatCommand(moved.state, {
          type: 'attack',
          commandId: commandId('historical-bow-three-ap-rejected'),
          actorId: unitId('alpha-1'),
          activationId,
          targetId: unitId('beta-1'),
        });
        expect(rejected).toMatchObject({
          ok: false,
          error: { code: 'INSUFFICIENT_ACTION_POINTS' },
          state: moved.state,
        });
        return;
      }
      expect(previews).toContainEqual(
        expect.objectContaining({
          targetId: unitId('beta-1'),
          actionPointCost: shotCost,
          staminaCost: 16,
        }),
      );
      const shotCommand = {
        type: 'attack' as const,
        commandId: commandId('bow-three-ap-shot'),
        actorId: unitId('alpha-1'),
        activationId,
        targetId: unitId('beta-1'),
      };
      const atomicCases = [
        {
          state: {
            ...moved.state,
            activation: { ...moved.state.activation!, remainingActionPoints: 2 },
          },
          code: 'INSUFFICIENT_ACTION_POINTS',
        },
        {
          state: {
            ...moved.state,
            units: moved.state.units.map((entry) =>
              entry.id === unitId('alpha-1') ? { ...entry, stamina: 15 } : entry,
            ),
          },
          code: 'INSUFFICIENT_STAMINA',
        },
      ] as const;
      for (const { state, code } of atomicCases) {
        const before = JSON.stringify(state);
        expect(previewCombatAttacks(state)).toEqual([]);
        expect(queryCombatWeaponAttack(state, unitId('beta-1'))).toMatchObject({ code });
        const rejected = applyCombatCommand(state, shotCommand);
        expect(rejected).toMatchObject({ ok: false, error: { code }, state });
        expect(rejected).not.toHaveProperty('events');
        expect(rejected.state).toBe(state);
        expect(rejected.state.random).toEqual(state.random);
        expect(JSON.stringify(state)).toBe(before);
      }
      const accepted = applyCombatCommand(moved.state, shotCommand);
      expect(accepted.ok).toBe(true);
      if (!accepted.ok) throw new Error(accepted.error.code);
      expect(unit(accepted.state, 'alpha-1').stamina).toBe(80);
      const replayed = replayCombat({
        schemaVersion: 2,
        setup,
        commands: [moveCommand, shotCommand],
      });
      expect(replayed.state.random).toEqual(accepted.state.random);
      expect(canonicalCombatState(replayed.state)).toBe(canonicalCombatState(accepted.state));
    },
  );

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

it.each([3, 4, 5] as const)(
  'bridge-v%s retains immobile targets, rejects forbidden actions atomically and replays fists',
  (version) => {
    const base = setupV2();
    const setup: BattleSetupV2 = {
      ...base,
      rulesetId: `m1-domain-bridge-v${version}`,
      sides: [{ ...base.sides[0], retreatHexes: [{ q: 0, r: 0 }] }, base.sides[1]],
      units: base.units.map((entry, index) => ({
        ...entry,
        weaponId: index === 0 ? 'fists' : entry.weaponId,
        attributes: { ...entry.attributes, initiative: index === 0 ? 120 : 20, accuracy: 100 },
        initialPools: { ...entry.initialPools, stamina: 80 },
        capabilities: { move: false, attack: index === 0, defend: index === 0, retreat: false },
        ...(version >= 4 ? { skillRanks: {}, moralePolicy: 'human' as const } : {}),
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
  },
);

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

it.each([M1_DOMAIN_BRIDGE_V4_RULESET_ID, M1_DOMAIN_BRIDGE_V5_RULESET_ID])(
  'keeps %s terrain, canonical preview costs, capabilities and replay without changing v3',
  async (rulesetId) => {
    const core = await import('../index.js');
    const legacy = setupV2();
    const setup: BattleSetupV2 = {
      ...legacy,
      rulesetId,
      map: { ...legacy.map, tiles: [{ q: -1, r: 0, height: 1, terrain: 'mud' }] },
      units: legacy.units.map((entry, index) => ({
        ...entry,
        weaponId: index === 0 ? 'fists' : entry.weaponId,
        initialPools: { ...entry.initialPools, stamina: 70 },
        capabilities: { move: true, attack: true, defend: true, retreat: true },
        skillRanks: {},
        moralePolicy: index === 0 ? 'human' : 'beast',
      })),
    };
    expect(() =>
      startBattleV2({
        ...setup,
        units: setup.units.map((unit, index) =>
          index === 0 ? { ...unit, skillRanks: { rally: 1 } } : unit,
        ),
      }),
    ).toThrow('Unmapped campaign skills are unavailable');
    const before = JSON.stringify(setup);
    const initial = startBattleV2(setup).state;
    expect(initial.activation?.remainingActionPoints).toBe(4);
    expect(initial.map.tiles).toEqual(setup.map.tiles);
    expect(core.getCombatSkills(initial, initial.units[0]!.id)).toEqual([]);
    const move = core
      .previewCombatMovement(initial)
      .find((option) => option.to.q === -1 && option.to.r === 0)!;
    expect(move).toMatchObject({ actionPointCost: 3, staminaCost: 9 });
    const command = {
      type: 'move' as const,
      commandId: commandId('weighted-path'),
      activationId: initial.activation!.id,
      actorId: initial.activation!.unitId,
      to: move.to,
    };
    const accepted = applyCombatCommand(initial, command);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error('previewed move rejected');
    expect(accepted.state.activation?.remainingActionPoints).toBe(1);
    expect(accepted.state.units.find((entry) => entry.id === command.actorId)?.stamina).toBe(71);
    expect(
      core.verifyCombatReplay(
        { schemaVersion: 2, setup: JSON.parse(before), commands: [command] },
        accepted.state,
      ).matches,
    ).toBe(true);
    expect(JSON.stringify(setup)).toBe(before);
    const immobile = {
      ...initial,
      units: initial.units.map((entry) =>
        entry.id === initial.activation!.unitId
          ? { ...entry, capabilities: { move: false, attack: true, defend: true, retreat: false } }
          : entry,
      ),
    };
    const panickedSetup: BattleSetupV2 = {
      ...setup,
      units: setup.units.map((unit, index) =>
        index === 0
          ? {
              ...unit,
              capabilities: { move: false, attack: true, defend: true, retreat: false },
              initialPools: { ...unit.initialPools, morale: 10 },
            }
          : unit,
      ),
    };
    const panicked = startBattleV2(panickedSetup).state;
    const automatic = core.chooseTacticalCombatCommand(panicked);
    expect(automatic.type).toBe('wait');
    expect(applyCombatCommand(panicked, automatic).ok).toBe(true);
    expect(core.previewCombatMovement(immobile)).toEqual([]);
    expect(applyCombatCommand(immobile, { ...command, type: 'flee' })).toMatchObject({
      ok: false,
      state: immobile,
    });
    const oldSetup: BattleSetupV2 = {
      ...setup,
      rulesetId: core.M1_DOMAIN_BRIDGE_V3_RULESET_ID,
      units: setup.units.map(({ skillRanks: _ranks, moralePolicy: _policy, ...entry }) => entry),
    };
    const oldState = startBattleV2(oldSetup).state;
    expect(oldState.map.tiles).toBeUndefined();
    expect(core.getCombatSkills(oldState, oldState.units[0]!.id)).toEqual([]);
    expect(core.combatRules(oldState.rulesetId).recovery.staminaPerActivation).toBe(18);
  },
);

it('replays deterministic bridge-v5 bow tactical autoplay with retained terrain and RNG draws', () => {
  const base = setupV2();
  const setup: BattleSetupV2 = {
    ...base,
    battleId: battleId('bridge-v5-tactical-bow'),
    rulesetId: M1_DOMAIN_BRIDGE_V5_RULESET_ID,
    map: { ...base.map, tiles: [{ q: 0, r: 0, height: 0, terrain: 'mud' }] },
    units: base.units.map((unit, index) => ({
      ...unit,
      position: index === 0 ? { q: -1, r: 0 } : { q: 1, r: 0 },
      weaponId: index === 0 ? 'bow' : 'raider',
      attributes: { ...unit.attributes, stamina: 100 },
      initialPools: { ...unit.initialPools, stamina: 100 },
      capabilities: { move: true, attack: true, defend: true, retreat: true },
      skillRanks: {},
      moralePolicy: index === 0 ? 'human' : 'beast',
    })),
  };
  const initial = startBattleV2(setup).state;
  const firstCommand = chooseTacticalCombatCommand(initial);
  expect(applyCombatCommand(initial, firstCommand).ok).toBe(true);

  const first = advanceCombatAutoplay(initial, 'resolved');
  const repeated = advanceCombatAutoplay(initial, 'resolved');
  expect(first.stoppedBecause).toBe('resolved');
  expect(first.commands.length).toBeLessThan(combatRules(setup.rulesetId).limits.maximumCommands);
  expect(first.commands[0]).toEqual(firstCommand);
  expect(repeated).toEqual(first);
  expect(first.state.random.draws).toBeGreaterThan(0);
  const replay = JSON.parse(
    JSON.stringify({ schemaVersion: 2, setup, commands: first.commands }),
  ) as CombatReplayV2;
  const replayed = replayCombat(replay);
  expect(replayed.events).toEqual([...startBattleV2(setup).events, ...first.events]);
  expect(replayed.state.random).toEqual(first.state.random);
  expect(canonicalCombatState(replayed.state)).toBe(canonicalCombatState(first.state));
});

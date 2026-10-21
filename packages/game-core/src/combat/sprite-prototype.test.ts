import { describe, expect, it } from 'vitest';

import {
  applyCombatCommand,
  battleId,
  commandId,
  chooseAiCommand,
  combatRules,
  createHexagon,
  M0_COMBAT_RULESET_ID,
  previewCombatAttacks,
  previewCombatMovement,
  previewCombatRangedArea,
  previewCombatWeaponReach,
  verifyCombatReplay,
  weaponProfile,
  SPRITE_PROTOTYPE_RULESET_ID,
  SPRITE_PROTOTYPE_V3_RULESET_ID,
  SPRITE_PROTOTYPE_V4_RULESET_ID,
  startBattle,
  unitId,
  type BattleSetup,
  type BattleState,
  type CombatCommand,
  type Hex,
  type UnitId,
} from '../index.js';

const alpha = 'alpha' as BattleSetup['sides'][number]['id'];
const beta = 'beta' as BattleSetup['sides'][number]['id'];

function setup(
  options: {
    readonly hexes?: readonly Hex[];
    readonly blocked?: readonly Hex[];
    readonly tiles?: BattleSetup['map']['tiles'];
    readonly actorWeapon?: BattleSetup['units'][number]['weaponId'];
    readonly actorPosition?: Hex;
    readonly targetPosition?: Hex;
    readonly actorStamina?: number;
    readonly actorHealth?: number;
    readonly actorTrainedMelee?: boolean;
    readonly targetIncorporeal?: boolean;
  } = {},
): BattleSetup {
  const hexes = options.hexes ?? createHexagon(3);
  const actorPosition = options.actorPosition ?? { q: 0, r: 0 };
  const targetPosition = options.targetPosition ?? { q: 0, r: 3 };
  return {
    schemaVersion: 1,
    battleId: battleId('sprite-prototype-test'),
    rulesetId: SPRITE_PROTOTYPE_RULESET_ID,
    seed: 42,
    map: {
      hexes,
      blocked: options.blocked ?? [],
      ...(options.tiles === undefined ? {} : { tiles: options.tiles }),
    },
    sides: [
      { id: alpha, retreatHexes: [actorPosition] },
      { id: beta, retreatHexes: [targetPosition] },
    ],
    units: [
      {
        id: unitId('alpha-1'),
        sideId: alpha,
        position: actorPosition,
        weaponId: options.actorWeapon ?? 'sword-shield',
        ...(options.actorTrainedMelee === undefined
          ? {}
          : { trainedMelee: options.actorTrainedMelee }),
        attributes: {
          health: options.actorHealth ?? 40,
          armor: 20,
          stamina: options.actorStamina ?? 40,
          initiative: 100,
          accuracy: 20,
          defense: 10,
          morale: 70,
        },
      },
      {
        id: unitId('beta-1'),
        sideId: beta,
        position: targetPosition,
        weaponId: 'raider',
        ...(options.targetIncorporeal === undefined
          ? {}
          : { incorporeal: options.targetIncorporeal }),
        attributes: {
          health: 40,
          armor: 20,
          stamina: 40,
          initiative: 10,
          accuracy: 10,
          defense: 10,
          morale: 70,
        },
      },
    ],
  };
}

type TestCommand =
  | { readonly type: 'move'; readonly to: Hex }
  | { readonly type: 'attack'; readonly targetId: UnitId };

function command(state: BattleState, input: TestCommand): CombatCommand {
  const activation = state.activation;
  if (activation === null) throw new Error('Expected an active unit');
  return {
    ...input,
    actorId: activation.unitId,
    activationId: activation.id,
    commandId: commandId(`sprite:${state.revision}:${input.type}`),
  } as CombatCommand;
}

describe('sprite prototype combat', () => {
  it.each([
    [SPRITE_PROTOTYPE_V3_RULESET_ID, 4, false],
    [SPRITE_PROTOTYPE_V4_RULESET_ID, 3, true],
  ] as const)(
    '%s keeps its bow AP profile through a same-activation move and shot',
    (rulesetId, shotCost, canShootAfterMoving) => {
      const base = setup({
        actorWeapon: 'bow',
        actorPosition: { q: 0, r: 0 },
        targetPosition: { q: 0, r: 3 },
        hexes: createHexagon(4),
        actorStamina: 100,
      });
      const initial = startBattle({ ...base, rulesetId }).state;
      expect(initial.activation?.unitId).toBe(unitId('alpha-1'));
      expect(initial.activation?.remainingActionPoints).toBe(4);
      const activationId = initial.activation!.id;
      const move = previewCombatMovement(initial).find(
        (option) => option.to.q === 1 && option.to.r === 0,
      )!;
      expect(move).toMatchObject({ actionPointCost: 1, staminaCost: 4 });
      const moved = applyCombatCommand(initial, command(initial, { type: 'move', to: move.to }));
      expect(moved.ok).toBe(true);
      if (!moved.ok) throw new Error(moved.error.code);
      expect(moved.state.activation).toMatchObject({ id: activationId, remainingActionPoints: 3 });
      expect(moved.state.units.find((entry) => entry.id === unitId('alpha-1'))?.stamina).toBe(96);

      const weapon = weaponProfile(combatRules(rulesetId), 'bow');
      expect(weapon).toMatchObject({
        actionPointCost: shotCost,
        staminaCost: 16,
        minimumRange: 1,
        maximumRange: 4,
        baseDamage: 18,
        damageVariance: 4,
        accuracyModifier: 0,
        armorPenetrationPercent: 20,
        armorDamagePercent: 50,
        defenseModifier: -8,
      });
      const previews = previewCombatAttacks(moved.state);
      if (!canShootAfterMoving) {
        expect(previews).toEqual([]);
        const rejected = applyCombatCommand(
          moved.state,
          command(moved.state, { type: 'attack', targetId: unitId('beta-1') }),
        );
        expect(rejected).toMatchObject({
          ok: false,
          error: { code: 'INSUFFICIENT_ACTION_POINTS' },
          state: moved.state,
        });
        return;
      }

      expect(previews).toContainEqual(
        expect.objectContaining({ targetId: unitId('beta-1'), actionPointCost: 3, staminaCost: 16 }),
      );
      const shot = command(moved.state, { type: 'attack', targetId: unitId('beta-1') });
      expect(shot.activationId).toBe(activationId);
      const accepted = applyCombatCommand(moved.state, shot);
      expect(accepted.ok).toBe(true);
      if (!accepted.ok) throw new Error(accepted.error.code);
      expect(accepted.state.units.find((entry) => entry.id === unitId('alpha-1'))?.stamina).toBe(
        80,
      );
    },
  );

  it('rejects new-profile bow shots at two AP or fifteen stamina without mutating state or RNG', () => {
    const base = setup({
      actorWeapon: 'bow',
      actorPosition: { q: 0, r: 0 },
      targetPosition: { q: 0, r: 3 },
      hexes: createHexagon(4),
      actorStamina: 100,
    });
    const initial = startBattle({ ...base, rulesetId: SPRITE_PROTOTYPE_V4_RULESET_ID }).state;
    const move = previewCombatMovement(initial).find(
      (option) => option.to.q === 1 && option.to.r === 0,
    )!;
    const moved = applyCombatCommand(initial, command(initial, { type: 'move', to: move.to }));
    if (!moved.ok) throw new Error(moved.error.code);
    const attack = command(moved.state, { type: 'attack', targetId: unitId('beta-1') });
    const cases = [
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
    for (const { state, code } of cases) {
      const before = JSON.stringify(state);
      const rejected = applyCombatCommand(state, { ...attack, activationId: state.activation!.id });
      expect(rejected).toMatchObject({ ok: false, error: { code }, state });
      expect(rejected.state.random).toEqual(state.random);
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it('inspects one-, two- and four-hex weapons independently of turn resources without mutation', () => {
    for (const [actorWeapon, maximumRange] of [
      ['sword-shield', 1],
      ['spear', 2],
      ['bow', 4],
    ] as const) {
      const state = startBattle(
        setup({ actorWeapon, hexes: createHexagon(5), targetPosition: { q: 0, r: 5 } }),
      ).state;
      const before = JSON.stringify(state);
      const reach = previewCombatWeaponReach(state, state.units[0]!.id);
      expect(reach?.maximumRange).toBe(maximumRange);
      expect(reach?.cells).toContainEqual({ q: maximumRange, r: 0 });
      expect(reach?.cells).not.toContainEqual({ q: maximumRange + 1, r: 0 });
      expect(reach?.cells).not.toContainEqual(state.units[0]!.position);
      const spent = {
        ...state,
        activation: { ...state.activation!, remainingActionPoints: 0 },
        units: state.units.map((unit) => ({ ...unit, stamina: 0 })),
      };
      expect(previewCombatWeaponReach(spent, state.units[0]!.id)).toEqual(reach);
      expect(previewCombatAttacks(spent)).toEqual([]);
      expect(previewCombatWeaponReach(state, state.units[1]!.id)?.cells).toContainEqual({
        q: 0,
        r: 4,
      });
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it('weapon reach omits blocked cells and follows the same bow LOS as an attack', () => {
    const state = startBattle(
      setup({ actorWeapon: 'bow', blocked: [{ q: 0, r: 1 }], targetPosition: { q: 0, r: 3 } }),
    ).state;
    const cells = previewCombatWeaponReach(state, state.units[0]!.id)?.cells;
    expect(cells).not.toContainEqual({ q: 0, r: 1 });
    expect(cells).not.toContainEqual({ q: 0, r: 3 });
    expect(cells).toContainEqual({ q: 1, r: 0 });
    expect(previewCombatAttacks(state)).toEqual([]);
    expect(
      previewCombatWeaponReach(
        { ...state, units: state.units.map((unit) => ({ ...unit, status: 'dead' as const })) },
        state.units[0]!.id,
      ),
    ).toBeUndefined();
  });

  it('admits a one-on-one setup and previews deterministic weighted movement without spending RNG', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 1, r: -1 },
      { q: 2, r: -1 },
      { q: 0, r: 3 },
    ];
    const tiles = [
      { q: 1, r: 0, height: 0 as const, terrain: 'mud' as const },
      { q: 2, r: 0, height: 0 as const, terrain: 'mud' as const },
    ];
    const state = startBattle(setup({ hexes, tiles, actorStamina: 10 })).state;
    const before = state.random;
    const first = previewCombatMovement(state);
    const second = previewCombatMovement({
      ...state,
      map: { ...state.map, hexes: [...state.map.hexes].reverse(), tiles: [...tiles].reverse() },
    });
    expect(first).toEqual(second);
    expect(first.find(({ to }) => to.q === 2 && to.r === 0)).toEqual({
      to: { q: 2, r: 0 },
      path: [
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
      actionPointCost: 4,
      staminaCost: 10,
      fireDamage: 0,
    });
    expect(state.random).toBe(before);
    const expectedMove = first.find(({ to }) => to.q === 2 && to.r === 0);
    expect(expectedMove).toBeDefined();
    if (expectedMove === undefined) return;
    const moved = applyCombatCommand(state, command(state, { type: 'move', to: expectedMove.to }));
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.events).toContainEqual(
        expect.objectContaining({
          type: 'unit.moved',
          path: expectedMove.path,
          actionPointCost: expectedMove.actionPointCost,
          staminaCost: expectedMove.staminaCost,
        }),
      );
    }
  });

  it('rejects an unaffordable weighted move without changing the state', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 3 },
    ];
    const state = startBattle(
      setup({ hexes, tiles: [{ q: 1, r: 0, height: 0, terrain: 'mud' }] }),
    ).state;
    const shortActivation = {
      ...state,
      activation: { ...state.activation!, remainingActionPoints: 1 },
    };
    const rejected = applyCombatCommand(
      shortActivation,
      command(shortActivation, { type: 'move', to: { q: 1, r: 0 } }),
    );
    expect(rejected).toEqual({
      ok: false,
      state: shortActivation,
      error: { code: 'INVALID_PATH', message: 'No non-empty path to 1,0' },
    });
  });

  it('chooses the lexically stable path when equal resource labels reach the same hex', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 1, r: 0 },
      { q: 2, r: -1 },
      { q: 0, r: 3 },
    ];
    const state = startBattle(setup({ hexes })).state;
    const destination = previewCombatMovement(state).find(({ to }) => to.q === 2 && to.r === -1);
    expect(destination?.path).toEqual([
      { q: 1, r: -1 },
      { q: 2, r: -1 },
    ]);
  });

  it('applies fire only on traversed path hexes and reports the actual health loss', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 0, r: 3 },
    ];
    const battleSetup = setup({
      hexes,
      tiles: [{ q: 1, r: 0, height: 0, terrain: 'fire' }],
    });
    const state = startBattle(battleSetup).state;
    const moveCommand = command(state, { type: 'move', to: { q: 1, r: 0 } });
    const moved = applyCombatCommand(state, moveCommand);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.state.units.find(({ id }) => id === 'alpha-1')?.health).toBe(35);
    expect(moved.events).toContainEqual(
      expect.objectContaining({
        type: 'unit.fire-damaged',
        unitId: 'alpha-1',
        healthDamage: 5,
        remainingHealth: 35,
      }),
    );
    expect(
      verifyCombatReplay(
        { schemaVersion: 1, setup: battleSetup, commands: [moveCommand] },
        moved.state,
      ).matches,
    ).toBe(true);
  });

  it('stops at lethal fire, charges only the traversed prefix, and advances past the dead actor', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 0, r: 2 },
      { q: 0, r: 3 },
    ];
    const base = setup({
      hexes,
      actorHealth: 5,
      tiles: [{ q: 1, r: 0, height: 0, terrain: 'fire' }],
    });
    const battleSetup: BattleSetup = {
      ...base,
      units: [
        base.units[0]!,
        {
          ...base.units[0]!,
          id: unitId('alpha-2'),
          position: { q: 0, r: 2 },
          attributes: { ...base.units[0]!.attributes, initiative: 90 },
        },
        base.units[1]!,
      ],
    };
    const state = startBattle(battleSetup).state;
    const result = applyCombatCommand(state, command(state, { type: 'move', to: { q: 2, r: 0 } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fallen = result.state.units.find(({ id }) => id === 'alpha-1');
    expect(fallen).toMatchObject({ status: 'dead', health: 0, position: { q: 1, r: 0 } });
    expect(result.state.activation?.unitId).toBe('alpha-2');
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'unit.moved',
        to: { q: 1, r: 0 },
        path: [{ q: 1, r: 0 }],
        actionPointCost: 1,
        staminaCost: 4,
      }),
    );
    expect(result.state.units.find(({ id }) => id === 'alpha-2')?.morale).toBe(52);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'unit.morale-changed',
        unitId: 'alpha-2',
        cause: 'ally-death',
      }),
    );
  });

  it('omits blocked bow targets from preview and rejects their attacks atomically', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ];
    const state = startBattle(
      setup({
        hexes,
        blocked: [{ q: 1, r: 0 }],
        actorWeapon: 'bow',
        targetPosition: { q: 2, r: 0 },
      }),
    ).state;
    expect(previewCombatAttacks(state)).toEqual([]);
    const rejected = applyCombatCommand(
      state,
      command(state, { type: 'attack', targetId: unitId('beta-1') }),
    );
    expect(rejected).toEqual({
      ok: false,
      state,
      error: {
        code: 'BLOCKED_LINE_OF_SIGHT',
        message: 'Target beta-1 is blocked from bow line of sight',
      },
    });
  });

  it('previews the sorted bow area within range while excluding invalid occupied cells and obstacles', () => {
    const base = setup({ hexes: createHexagon(5), actorWeapon: 'bow' });
    const actor = base.units[0]!;
    const target = base.units[1]!;
    const state = startBattle({
      ...base,
      units: [
        actor,
        target,
        { ...actor, id: unitId('alpha-2'), position: { q: 0, r: 1 } },
        { ...target, id: unitId('beta-2'), position: { q: -1, r: 1 }, incorporeal: true },
      ],
    }).state;
    const before = JSON.stringify(state);
    const area = previewCombatRangedArea(state);
    expect(area).toContainEqual({ q: 1, r: 0 });
    expect(area).toContainEqual({ q: 4, r: 0 });
    expect(area).toContainEqual(target.position);
    for (const position of [
      { q: 0, r: 0 },
      { q: 5, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
    ]) {
      expect(area).not.toContainEqual(position);
    }
    expect(
      previewCombatRangedArea({
        ...state,
        units: [...state.units].reverse(),
        map: { ...state.map, hexes: [...state.map.hexes].reverse() },
      }),
    ).toEqual(area);
    expect(JSON.stringify(state)).toBe(before);
    expect(previewCombatAttacks(state).map(({ targetId }) => targetId)).toEqual([target.id]);

    const blocked = {
      ...state,
      map: { ...state.map, blocked: [{ q: 1, r: 0 }] },
    };
    expect(previewCombatRangedArea(blocked)).not.toContainEqual({ q: 1, r: 0 });
    expect(previewCombatRangedArea(blocked)).not.toContainEqual({ q: 2, r: 0 });
  });

  it('shares bow height LOS between area, target forecasts and execution', () => {
    const base = setup({ actorWeapon: 'bow', targetPosition: { q: 2, r: 0 } });
    const state = startBattle({
      ...base,
      map: { ...base.map, tiles: [{ q: 1, r: 0, height: 2, terrain: 'plain' }] },
    }).state;
    expect(previewCombatRangedArea(state)).not.toContainEqual({ q: 2, r: 0 });
    expect(previewCombatAttacks(state)).toEqual([]);
    expect(
      applyCombatCommand(state, command(state, { type: 'attack', targetId: unitId('beta-1') })),
    ).toMatchObject({ ok: false, state, error: { code: 'BLOCKED_LINE_OF_SIGHT' } });
    const elevated = {
      ...state,
      map: {
        ...state.map,
        tiles: [
          { q: 0, r: 0, height: 2 as const, terrain: 'plain' as const },
          ...state.map.tiles!,
          { q: 2, r: 0, height: 2 as const, terrain: 'plain' as const },
        ],
      },
    };
    expect(previewCombatRangedArea(elevated)).toContainEqual({ q: 2, r: 0 });
    expect(previewCombatAttacks(elevated)[0]?.targetId).toBe('beta-1');
    expect(
      applyCombatCommand(
        elevated,
        command(elevated, { type: 'attack', targetId: unitId('beta-1') }),
      ).ok,
    ).toBe(true);
  });

  it('omits bow forecasts without attack resources or an active prototype battle', () => {
    const state = startBattle(setup({ actorWeapon: 'bow' })).state;
    const insufficientAp = {
      ...state,
      activation: { ...state.activation!, remainingActionPoints: 3 },
    };
    const insufficientStamina = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === state.activation?.unitId ? { ...unit, stamina: 15 } : unit,
      ),
    };
    for (const unavailable of [
      insufficientAp,
      insufficientStamina,
      { ...state, status: 'resolved' as const, activation: null },
      { ...state, rulesetId: M0_COMBAT_RULESET_ID },
    ]) {
      expect(previewCombatRangedArea(unavailable)).toEqual([]);
      expect(previewCombatAttacks(unavailable)).toEqual([]);
    }
    expect(previewCombatRangedArea(startBattle(setup()).state)).toEqual([]);
  });

  it('forecasts actual on-hit health and armor loss without consuming RNG', () => {
    const state = startBattle(setup({ actorWeapon: 'bow' })).state;
    expect(previewCombatAttacks(state)[0]?.damage).toEqual({
      health: { minimum: 2, maximum: 4 },
      armor: { minimum: 12, maximum: 18 },
    });
    for (const weaponId of ['bow', 'sword-shield', 'spear', 'great-weapon', 'raider'] as const) {
      for (const armor of [0, 5, 20, 60]) {
        for (const health of [4, 40]) {
          let hits = 0;
          for (let seed = 1; seed <= 16; seed += 1) {
            const base = setup({ actorWeapon: weaponId, targetPosition: { q: 1, r: 0 } });
            const battleSetup = {
              ...base,
              seed,
              units: base.units.map((unit) =>
                unit.sideId === beta
                  ? { ...unit, attributes: { ...unit.attributes, armor, health } }
                  : unit,
              ),
            };
            const initial = startBattle(battleSetup).state;
            const before = JSON.stringify(initial);
            const attack = command(initial, { type: 'attack', targetId: unitId('beta-1') });
            const withoutPreview = applyCombatCommand(initial, attack);
            const forecast = previewCombatAttacks(initial)[0]!;
            previewCombatRangedArea(initial);
            expect(JSON.stringify(initial)).toBe(before);
            const result = applyCombatCommand(initial, attack);
            expect(result).toEqual(withoutPreview);
            expect(result.ok).toBe(true);
            if (!result.ok) throw new Error('Expected an affordable attack');
            expect(
              verifyCombatReplay(
                { schemaVersion: 1, setup: battleSetup, commands: [attack] },
                result.state,
              ).matches,
            ).toBe(true);
            const damage = result.events.find((event) => event.type === 'unit.damaged');
            if (damage === undefined) continue;
            hits += 1;
            const healthLoss = health - damage.remainingHealth;
            const armorLoss = armor - damage.remainingArmor;
            expect(healthLoss).toBeGreaterThanOrEqual(forecast.damage.health.minimum);
            expect(healthLoss).toBeLessThanOrEqual(forecast.damage.health.maximum);
            expect(armorLoss).toBeGreaterThanOrEqual(forecast.damage.armor.minimum);
            expect(armorLoss).toBeLessThanOrEqual(forecast.damage.armor.maximum);
            expect(forecast.damage.health.maximum).toBeLessThanOrEqual(health);
            expect(forecast.damage.armor.maximum).toBeLessThanOrEqual(armor);
          }
          expect(hits).toBeGreaterThan(0);
        }
      }
    }
  });

  it('selects an affordable reachable position for the prototype AI', () => {
    const state = startBattle(setup()).state;
    const aiCommand = chooseAiCommand(state);
    expect(aiCommand.type).toBe('move');
    const applied = applyCombatCommand(state, aiCommand);
    expect(applied.ok).toBe(true);
  });

  it('routes the prototype AI around a wall even when the first step increases hex distance', () => {
    const hexes = Array.from({ length: 7 * 11 }, (_, index) => ({
      q: Math.floor(index / 11),
      r: index % 11,
    }));
    const blocked = Array.from({ length: 10 }, (_, r) => ({ q: 3, r }));
    const state = startBattle(
      setup({
        hexes,
        blocked,
        actorPosition: { q: 2, r: 5 },
        targetPosition: { q: 4, r: 5 },
      }),
    ).state;
    const aiCommand = chooseAiCommand(state);
    expect(aiCommand.type).toBe('move');
    if (aiCommand.type !== 'move') return;
    const distance = (position: Hex) => {
      const q = position.q - 4;
      const r = position.r - 5;
      return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
    };
    expect(distance(aiCommand.to)).toBeGreaterThan(distance({ q: 2, r: 5 }));
    expect(applyCombatCommand(state, aiCommand).ok).toBe(true);
  });

  it('crosses a fire-only wall gap when no safe attack route exists and survives', () => {
    const hexes = Array.from({ length: 15 * 11 }, (_, index) => ({
      q: Math.floor(index / 11),
      r: index % 11,
    }));
    const blocked = Array.from({ length: 11 }, (_, r) => ({ q: 7, r })).filter(({ r }) => r !== 5);
    const state = startBattle(
      setup({
        hexes,
        blocked,
        tiles: [{ q: 7, r: 5, height: 0, terrain: 'fire' }],
        actorPosition: { q: 6, r: 5 },
        targetPosition: { q: 8, r: 5 },
        actorHealth: 20,
      }),
    ).state;

    const aiCommand = chooseAiCommand(state);
    expect(aiCommand).toMatchObject({ type: 'move', to: { q: 7, r: 5 } });
    const result = applyCombatCommand(state, aiCommand);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.units.find(({ id }) => id === 'alpha-1')).toMatchObject({
      position: { q: 7, r: 5 },
      health: 15,
      status: 'active',
    });
  });

  it('prefers a safe attack route over a shorter survivable fire crossing', () => {
    const hexes = Array.from({ length: 15 * 11 }, (_, index) => ({
      q: Math.floor(index / 11),
      r: index % 11,
    }));
    const blocked = Array.from({ length: 11 }, (_, r) => ({ q: 7, r })).filter(
      ({ r }) => r !== 1 && r !== 5,
    );
    const state = startBattle(
      setup({
        hexes,
        blocked,
        tiles: [{ q: 7, r: 5, height: 0, terrain: 'fire' }],
        actorPosition: { q: 6, r: 5 },
        targetPosition: { q: 8, r: 5 },
        actorHealth: 20,
      }),
    ).state;

    const aiCommand = chooseAiCommand(state);
    expect(aiCommand.type).toBe('move');
    if (aiCommand.type !== 'move') return;
    expect(aiCommand.to).not.toEqual({ q: 7, r: 5 });
    const result = applyCombatCommand(state, aiCommand);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.units.find(({ id }) => id === 'alpha-1')?.health).toBe(20);
  });

  it('does not plan a lethal fire crossing', () => {
    const hexes = Array.from({ length: 15 * 11 }, (_, index) => ({
      q: Math.floor(index / 11),
      r: index % 11,
    }));
    const blocked = Array.from({ length: 11 }, (_, r) => ({ q: 7, r })).filter(({ r }) => r !== 5);
    const state = startBattle(
      setup({
        hexes,
        blocked,
        tiles: [{ q: 7, r: 5, height: 0, terrain: 'fire' }],
        actorPosition: { q: 6, r: 5 },
        targetPosition: { q: 8, r: 5 },
        actorHealth: 5,
      }),
    ).state;

    expect(chooseAiCommand(state).type).not.toBe('move');
  });

  it('guarantees trained adjacent melee damage and excludes incorporeal targets', () => {
    const adjacent = startBattle(
      setup({
        actorPosition: { q: 0, r: 0 },
        targetPosition: { q: 1, r: 0 },
        actorTrainedMelee: true,
      }),
    ).state;
    expect(previewCombatAttacks(adjacent)[0]?.hitChance).toBe(100);
    const attack = command(adjacent, { type: 'attack', targetId: unitId('beta-1') });
    const resolved = applyCombatCommand(adjacent, attack);
    expect(resolved.ok).toBe(true);
    if (resolved.ok)
      expect(resolved.events).toContainEqual(
        expect.objectContaining({ type: 'attack.resolved', hit: true, hitChance: 100 }),
      );

    const incorporeal = startBattle(
      setup({
        actorPosition: { q: 0, r: 0 },
        targetPosition: { q: 1, r: 0 },
        actorTrainedMelee: true,
        targetIncorporeal: true,
      }),
    ).state;
    expect(previewCombatAttacks(incorporeal)).toEqual([]);
    const rejected = applyCombatCommand(
      incorporeal,
      command(incorporeal, { type: 'attack', targetId: unitId('beta-1') }),
    );
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TARGET' },
      state: incorporeal,
    });
  });

  it('reports cumulative fire damage in movement previews, capped by current health', () => {
    const hexes = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 0, r: 3 },
    ];
    const state = startBattle(
      setup({
        hexes,
        actorHealth: 7,
        tiles: [
          { q: 1, r: 0, height: 0, terrain: 'fire' },
          { q: 2, r: 0, height: 0, terrain: 'fire' },
        ],
      }),
    ).state;
    expect(
      previewCombatMovement(state).find(({ to }) => to.q === 2 && to.r === 0)?.fireDamage,
    ).toBe(7);
  });

  it('preserves the old m0 setup gate and does not accept arbitrary m1 rulesets', () => {
    expect(() =>
      startBattle({ ...setup(), rulesetId: 'm1-domain-bridge-v99' } as unknown as BattleSetup),
    ).toThrow(/Unknown combat ruleset/);
    expect(() =>
      startBattle({ ...setup(), rulesetId: 'm1-domain-bridge-v3' } as unknown as BattleSetup),
    ).toThrow(/Battle setup ruleset must match/);
    expect(() =>
      startBattle({ ...setup(), rulesetId: 'm1-domain-bridge-v1' } as unknown as BattleSetup),
    ).toThrow(/Battle setup ruleset must match/);
  });
});

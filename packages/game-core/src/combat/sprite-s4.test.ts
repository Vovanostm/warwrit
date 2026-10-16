import { describe, expect, it } from 'vitest';
import {
  applyCombatCommand,
  startBattle,
  verifyCombatReplay,
  canonicalCombatState,
  battleId,
  unitId,
  commandId,
  createHexagon,
  previewCombatAttacks,
  previewCombatMovement,
  SPRITE_PROTOTYPE_RULESET_ID,
  SPRITE_PROTOTYPE_V2_RULESET_ID,
  SPRITE_PROTOTYPE_V3_RULESET_ID,
  sideId,
  type BattleSetup,
  type BattleState,
  type CombatCommand,
} from '../index.js';
import {
  choosePrototypeSpecialCommand,
  choosePanicCombatCommand,
  findCombatEscapePlan,
  previewCombatThreats,
} from './sprite-s4.js';

function setup(
  options: { panic?: 'human' | 'beast'; mill?: boolean; legacy?: boolean; blocked?: boolean } = {},
): BattleSetup {
  const alpha = 'alpha' as BattleSetup['sides'][0]['id'];
  const beta = 'beta' as BattleSetup['sides'][0]['id'];
  return {
    schemaVersion: 1,
    battleId: battleId('s4'),
    seed: 42,
    rulesetId: options.legacy ? SPRITE_PROTOTYPE_RULESET_ID : SPRITE_PROTOTYPE_V2_RULESET_ID,
    map: {
      hexes: createHexagon(6),
      blocked: options.blocked
        ? [
            { q: -5, r: 0 },
            { q: -5, r: -1 },
            { q: -6, r: 1 },
          ]
        : [],
    },
    sides: [
      { id: alpha, retreatHexes: [{ q: -6, r: 0 }] },
      { id: beta, retreatHexes: [{ q: 6, r: 0 }] },
    ],
    units: [
      {
        id: unitId('a'),
        sideId: alpha,
        position: { q: 0, r: 0 },
        weaponId: options.mill ? 'great-weapon' : 'sword-shield',
        ...(options.legacy ? {} : { moralePolicy: options.panic ?? ('steady' as const) }),
        ...(options.mill ? { threatProfile: 'mill-slam' as const } : {}),
        attributes: {
          health: 100,
          armor: 0,
          stamina: 100,
          initiative: 100,
          accuracy: 1,
          defense: 10,
          morale: options.panic ? 20 : 70,
        },
      },
      {
        id: unitId('b'),
        sideId: beta,
        position: { q: 2, r: 0 },
        weaponId: 'raider',
        ...(options.legacy ? {} : { moralePolicy: 'human' as const }),
        attributes: {
          health: 100,
          armor: 0,
          stamina: 100,
          initiative: 10,
          accuracy: 10,
          defense: 10,
          morale: 70,
        },
      },
    ],
  };
}
function act(state: BattleState, value: object): CombatCommand {
  return {
    actorId: state.activation!.unitId,
    activationId: state.activation!.id,
    commandId: commandId(`c${state.revision}`),
    ...value,
  } as CombatCommand;
}
function accept(state: BattleState, value: object): BattleState {
  const result = applyCombatCommand(state, act(state, value));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}
function reactionSetup(health = 100): BattleSetup {
  const source = setup();
  return {
    ...source,
    units: source.units.map((unit, index) =>
      index === 0
        ? { ...unit, attributes: { ...unit.attributes, health } }
        : { ...unit, position: { q: 1, r: 0 }, attributes: { ...unit.attributes, accuracy: 100 } },
    ),
  };
}
describe('sprite S4 public combat transitions', () => {
  it('caps a later reaction forecast after fire on the prior movement step', () => {
    const moverId = unitId('mover');
    const controllerId = unitId('controller');
    const source: BattleSetup = {
      schemaVersion: 1,
      battleId: battleId('forecast-fire-before-reaction'),
      rulesetId: SPRITE_PROTOTYPE_V3_RULESET_ID,
      seed: 42,
      map: {
        hexes: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },
          { q: 3, r: 0 },
          { q: 1, r: 1 },
        ],
        blocked: [],
        tiles: [{ q: 1, r: 0, height: 0, terrain: 'fire' }],
      },
      sides: [
        { id: sideId('a'), retreatHexes: [{ q: 0, r: 0 }] },
        { id: sideId('b'), retreatHexes: [{ q: 3, r: 0 }] },
      ],
      units: [
        {
          id: moverId,
          sideId: sideId('a'),
          position: { q: 0, r: 0 },
          weaponId: 'sword-shield',
          moralePolicy: 'human',
          attributes: {
            health: 6,
            armor: 0,
            stamina: 100,
            initiative: 100,
            accuracy: 40,
            defense: 5,
            morale: 80,
          },
        },
        {
          id: controllerId,
          sideId: sideId('b'),
          position: { q: 1, r: 1 },
          weaponId: 'raider',
          moralePolicy: 'human',
          trainedMelee: true,
          attributes: {
            health: 120,
            armor: 0,
            stamina: 100,
            initiative: 10,
            accuracy: 40,
            defense: 5,
            morale: 80,
          },
        },
      ],
    };
    const state = startBattle(source).state;
    const beforePreview = canonicalCombatState(state);
    const preview = previewCombatMovement(state).find(
      (move) => move.to.q === 3 && move.to.r === 0,
    )!;
    expect(canonicalCombatState(state)).toBe(beforePreview);
    expect(preview.fireDamage).toBe(5);
    const reaction = preview.reactions!.find((item) => item.attackerId === controllerId)!;
    expect(reaction.damage.health.maximum).toBe(1);

    const command: CombatCommand = {
      type: 'move',
      actorId: moverId,
      activationId: state.activation!.id,
      commandId: commandId('legal-fire-reaction'),
      to: { q: 3, r: 0 },
    };
    const result = applyCombatCommand(state, command);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    const reactionEvent = result.events.find(
      (event) => event.type === 'unit.damaged' && event.unitId === moverId,
    );
    expect(reactionEvent?.type).toBe('unit.damaged');
    if (reactionEvent?.type !== 'unit.damaged') throw new Error('Expected reaction damage');
    expect(reactionEvent.healthDamage).toBeGreaterThanOrEqual(reaction.damage.health.minimum);
    expect(reactionEvent.healthDamage).toBeLessThanOrEqual(reaction.damage.health.maximum);
    expect(result.events.find((event) => event.type === 'unit.fire-damaged')).toMatchObject({
      healthDamage: 5,
      remainingHealth: 1,
    });
    expect(result.state.units.find((unit) => unit.id === moverId)).toMatchObject({
      health: 0,
      status: 'dead',
      position: { q: 2, r: 0 },
    });
    expect(
      verifyCombatReplay({ schemaVersion: 1, setup: source, commands: [command] }, result.state)
        .matches,
    ).toBe(true);
  });

  it('requires an opposing response, permits one retarget and executes deterministic guaranteed damage', () => {
    const source = setup({ mill: true });
    let state = startBattle(source).state;
    const commands: CombatCommand[] = [];
    const run = (value: object) => {
      commands.push(act(state, value));
      state = accept(state, value);
    };
    expect(previewCombatAttacks(state)).toEqual([]);
    run({ type: 'prepare-threat', targetId: unitId('b') });
    expect(state.units[0]!.threat?.responseReceived).toBe(false);
    run({ type: 'move', to: { q: 1, r: 0 } });
    run({ type: 'wait' });
    expect(state.units[0]!.threat?.responseReceived).toBe(true);
    expect(previewCombatThreats(state)[0]?.action).toBe('retarget-threat');
    run({ type: 'retarget-threat', targetId: unitId('b') });
    expect(state.units[0]!.threat?.responseReceived).toBe(false);
    run({ type: 'wait' });
    const rejected = applyCombatCommand(
      state,
      act(state, { type: 'retarget-threat', targetId: unitId('b') }),
    );
    expect(rejected.ok).toBe(false);
    expect(rejected.state).toBe(state);
    const before = state.units[1]!.health;
    run({ type: 'execute-threat' });
    expect(state.units[1]!.health).toBeLessThan(before);
    expect(state.units[0]!.threat).toBeUndefined();
    expect(verifyCombatReplay({ schemaVersion: 1, setup: source, commands }, state).matches).toBe(
      true,
    );
  });
  it('escapes over multiple turns and rejects panic attacks atomically', () => {
    let state = startBattle(setup({ panic: 'human' })).state;
    const invalid = applyCombatCommand(
      state,
      act(state, { type: 'attack', targetId: unitId('b') }),
    );
    expect(invalid.ok).toBe(false);
    expect(invalid.state).toBe(state);
    expect(choosePanicCombatCommand(state)?.type).toBe('flee');
    state = accept(state, { type: 'flee' });
    expect(state.units[0]!.status).toBe('active');
    expect(state.units[0]!.escapePlan?.safe).toBe(true);
    state = accept(state, { type: 'wait' });
    state = accept(state, { type: 'flee' });
    expect(state.units[0]!.status).toBe('retreated');
  });
  it('surrenders blocked humans but never beasts', () => {
    const human = startBattle(setup({ panic: 'human', blocked: true })).state;
    expect(choosePanicCombatCommand(human)?.type).toBe('surrender');
    expect(accept(human, { type: 'surrender' }).units[0]!.status).toBe('surrendered');
    const beast = startBattle(setup({ panic: 'beast', blocked: true })).state;
    expect(choosePanicCombatCommand(beast)?.type).toBe('flee');
    expect(applyCombatCommand(beast, act(beast, { type: 'surrender' })).ok).toBe(false);
  });
  it('treats an available origin reaction as risky, surrendering only to capable humans', () => {
    const base = setup({ panic: 'human' });
    const source: BattleSetup = {
      ...base,
      units: base.units.map((unit, index) =>
        index === 1 ? { ...unit, position: { q: 1, r: 0 } } : unit,
      ),
    };
    const state = startBattle(source).state;
    const actor = state.units[0]!;
    expect(findCombatEscapePlan(state, actor)).toBeUndefined();
    expect(findCombatEscapePlan(state, actor, false)?.safe).toBe(false);
    expect(choosePanicCombatCommand(state)?.type).toBe('surrender');

    const beasts = {
      ...state,
      units: state.units.map((unit, index) =>
        index === 1 ? { ...unit, moralePolicy: 'beast' as const } : unit,
      ),
    };
    expect(choosePanicCombatCommand(beasts)?.type).toBe('flee');
    expect(accept(beasts, { type: 'flee' }).units[0]!.escapePlan?.safe).toBe(false);
  });
  it('does not surrender merely because a noncontrolling enemy stands beside the exit', () => {
    const base = setup({ panic: 'human' });
    const source: BattleSetup = {
      ...base,
      units: base.units.map((unit, index) =>
        index === 1 ? { ...unit, position: { q: -5, r: 0 } } : unit,
      ),
    };
    const initial = startBattle(source).state;
    for (const exemption of [
      { weaponId: 'bow' as const },
      { reactionSpent: true },
      { threatProfile: 'mill-slam' as const },
      { incorporeal: true },
      { morale: 20 },
    ]) {
      const state = {
        ...initial,
        units: initial.units.map((unit, index) => (index === 1 ? { ...unit, ...exemption } : unit)),
      };
      expect(findCombatEscapePlan(state, state.units[0]!)?.safe).toBe(true);
      expect(choosePanicCombatCommand(state)?.type).toBe('flee');
    }
    expect(findCombatEscapePlan(initial, initial.units[0]!)).toBeUndefined();
    expect(choosePanicCombatCommand(initial)?.type).toBe('surrender');
  });
  it('shares guarded preview and execution damage while legacy guarding preserves raw damage', () => {
    for (const legacy of [false, true]) {
      const source = setup({ legacy });
      let state = startBattle(source).state;
      state = accept(state, { type: 'defend' });
      state = accept(state, { type: 'move', to: { q: 1, r: 0 } });
      const guardedPreview = previewCombatAttacks(state)[0]!;
      const unguarded = { ...state, units: state.units.map((u) => ({ ...u, guarding: false })) };
      const plainPreview = previewCombatAttacks(unguarded)[0]!;
      if (legacy) expect(guardedPreview.damage).toEqual(plainPreview.damage);
      else
        expect(guardedPreview.damage.health.maximum).toBeLessThan(
          plainPreview.damage.health.maximum,
        );
      const attacked = applyCombatCommand(
        state,
        act(state, { type: 'attack', targetId: unitId('a') }),
      );
      expect(attacked.ok).toBe(true);
      if (attacked.ok && attacked.events.some((e) => e.type === 'attack.resolved' && e.hit)) {
        const loss = state.units[0]!.health - attacked.state.units[0]!.health;
        expect(loss).toBeGreaterThanOrEqual(guardedPreview.damage.health.minimum);
        expect(loss).toBeLessThanOrEqual(guardedPreview.damage.health.maximum);
      }
    }
  });
  it('recovers ten stamina in v2 and eighteen in legacy', () => {
    for (const legacy of [false, true]) {
      let state = startBattle(setup({ legacy })).state;
      state = {
        ...state,
        units: state.units.map((u) => (u.id === unitId('a') ? { ...u, stamina: 50 } : u)),
      };
      state = accept(state, { type: 'wait' });
      state = accept(state, { type: 'wait' });
      expect(state.units[0]!.stamina).toBe(legacy ? 68 : 60);
    }
  });
  it('forecasts a free reaction, moves through its hit and spends it once until controller activation', () => {
    const source = reactionSetup();
    let state = startBattle(source).state;
    const preview = previewCombatMovement(state).find(
      (move) => move.to.q === -1 && move.to.r === 0,
    )!;
    expect(preview.reactions).toHaveLength(1);
    const beforeStamina = state.units[1]!.stamina;
    const first = act(state, { type: 'move', to: { q: -1, r: 0 } });
    const result = applyCombatCommand(state, first);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    expect(state.units[0]!.position).toEqual({ q: -1, r: 0 });
    const damage = 100 - state.units[0]!.health;
    expect(damage).toBeGreaterThanOrEqual(preview.reactions![0]!.damage.health.minimum);
    expect(damage).toBeLessThanOrEqual(preview.reactions![0]!.damage.health.maximum);
    expect(state.units[1]!.stamina).toBe(beforeStamina);
    expect(state.units[1]!.reactionSpent).toBe(true);
    expect(
      verifyCombatReplay({ schemaVersion: 1, setup: source, commands: [first] }, state).matches,
    ).toBe(true);
    state = accept(state, { type: 'move', to: { q: 0, r: 0 } });
    expect(
      previewCombatMovement(state).find((move) => move.to.q === -1 && move.to.r === 0)!.reactions,
    ).toEqual([]);
    const health = state.units[0]!.health;
    state = accept(state, { type: 'move', to: { q: -1, r: 0 } });
    expect(state.units[0]!.health).toBe(health);
    state = accept(state, { type: 'wait' });
    expect(state.units[1]!.reactionSpent).toBe(false);
  });
  it('stops before the first step when a reaction kills without charging movement resources', () => {
    const state = startBattle(reactionSetup(1)).state;
    const result = applyCombatCommand(state, act(state, { type: 'move', to: { q: -2, r: 0 } }));
    expect(result.ok).toBe(true);
    expect(result.state.units[0]!.status).toBe('dead');
    expect(result.state.units[0]!.position).toEqual({ q: 0, r: 0 });
    expect(result.state.units[0]!.stamina).toBe(100);
    if (result.ok)
      expect(result.events.find((event) => event.type === 'unit.moved')).toMatchObject({
        path: [],
        actionPointCost: 0,
        staminaCost: 0,
      });
  });
  it('excludes panic, bows, surrendered, incorporeal and mill controllers; guards reduce reaction forecasts', () => {
    const base = startBattle(reactionSetup()).state;
    for (const patch of [
      { morale: 20 },
      { weaponId: 'bow' as const },
      { status: 'surrendered' as const },
      { incorporeal: true },
      { threatProfile: 'mill-slam' as const },
    ]) {
      const state = {
        ...base,
        units: base.units.map((u, index) => (index === 1 ? { ...u, ...patch } : u)),
      };
      expect(
        previewCombatMovement(state).find((move) => move.to.q === -1 && move.to.r === 0)!.reactions,
      ).toEqual([]);
    }
    const guarded = {
      ...base,
      units: base.units.map((u, index) => (index === 0 ? { ...u, guarding: true } : u)),
    };
    const plain = previewCombatMovement(base).find((move) => move.to.q === -1 && move.to.r === 0)!
      .reactions![0]!;
    const shield = previewCombatMovement(guarded).find(
      (move) => move.to.q === -1 && move.to.r === 0,
    )!.reactions![0]!;
    expect(shield.damage.health.maximum).toBeLessThan(plain.damage.health.maximum);
  });
  it('never permits surrender to only beasts', () => {
    const source = setup({ panic: 'human', blocked: true });
    const beasts = {
      ...source,
      units: source.units.map((u, index) =>
        index === 1 ? { ...u, moralePolicy: 'beast' as const } : u,
      ),
    };
    const state = startBattle(beasts).state;
    expect(choosePanicCombatCommand(state)?.type).toBe('flee');
    const rejected = applyCombatCommand(state, act(state, { type: 'surrender' }));
    expect(rejected.ok).toBe(false);
    expect(rejected.state).toBe(state);
  });
  it('does not treat a same-side completion as a response even when mill activation returns', () => {
    // A finite dense queue can complete another ally before an opposing response.
    const source = setup({ mill: true });
    const ally = {
      ...source.units[0]!,
      id: unitId('ally'),
      position: { q: -1, r: 0 },
      attributes: { ...source.units[0]!.attributes, initiative: 80 },
    };
    let dense = startBattle({ ...source, units: [...source.units, ally] }).state;
    dense = accept(dense, { type: 'prepare-threat', targetId: unitId('b') });
    expect(dense.activation!.unitId).toBe(unitId('ally'));
    dense = accept(dense, { type: 'wait' });
    expect(dense.units[0]!.threat!.responseReceived).toBe(false);
    // Public command validation must keep the warning gate even if initiative revisits the mill.
    dense = {
      ...dense,
      activation: { id: 'dense-mill', unitId: unitId('a'), remainingActionPoints: 4 },
    };
    const rejected = applyCombatCommand(dense, act(dense, { type: 'execute-threat' }));
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe('THREAT_RESPONSE_REQUIRED');
    expect(rejected.state).toBe(dense);
  });
  it('encloses each sequential reaction after earlier armor destruction', () => {
    const source = reactionSetup();
    const mover = {
      ...source.units[0]!,
      attributes: { ...source.units[0]!.attributes, armor: 20, health: 80 },
    };
    const first = { ...source.units[1]!, trainedMelee: true };
    const second = { ...first, id: unitId('c'), position: { q: 0, r: 1 } };
    const state = startBattle({ ...source, units: [mover, first, second] }).state;
    const preview = previewCombatMovement(state).find(
      (move) => move.to.q === -1 && move.to.r === 0,
    )!.reactions!;
    expect(preview).toHaveLength(2);
    const result = applyCombatCommand(state, act(state, { type: 'move', to: { q: -1, r: 0 } }));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    const damages = result.events.filter((event) => event.type === 'unit.damaged');
    expect(damages).toHaveLength(2);
    damages.forEach((event, index) => {
      expect(event.healthDamage).toBeGreaterThanOrEqual(preview[index]!.damage.health.minimum);
      expect(event.healthDamage).toBeLessThanOrEqual(preview[index]!.damage.health.maximum);
      expect(event.armorDamage).toBeGreaterThanOrEqual(preview[index]!.damage.armor.minimum);
      expect(event.armorDamage).toBeLessThanOrEqual(preview[index]!.damage.armor.maximum);
    });
    expect(preview[1]!.damage.health.maximum).toBeGreaterThan(preview[0]!.damage.health.maximum);
  });
  it('rejects a wall-obscured warning and cancels a prepared warning whose line closes', () => {
    const source = setup({ mill: true });
    const obscured = { ...source, map: { ...source.map, blocked: [{ q: 1, r: 0 }] } };
    const blocked = startBattle(obscured).state;
    expect(previewCombatThreats(blocked)).toEqual([]);
    const rejected = applyCombatCommand(
      blocked,
      act(blocked, { type: 'prepare-threat', targetId: unitId('b') }),
    );
    expect(rejected.ok).toBe(false);
    expect(rejected.state).toBe(blocked);
    let prepared = accept(startBattle(source).state, {
      type: 'prepare-threat',
      targetId: unitId('b'),
    });
    prepared = accept(prepared, { type: 'wait' });
    prepared = { ...prepared, map: obscured.map };
    expect(choosePrototypeSpecialCommand(prepared)?.type).toBe('execute-threat');
    const cancelled = applyCombatCommand(prepared, choosePrototypeSpecialCommand(prepared)!);
    expect(cancelled.ok).toBe(true);
    expect(cancelled.state.units[0]!.threat).toBeUndefined();
    expect(cancelled.state.units[1]!.health).toBe(100);
    if (cancelled.ok)
      expect(cancelled.events.some((e) => e.type === 'threat.cancelled')).toBe(true);
  });
  it('keeps legacy snapshots free of new traits', () => {
    const source = setup({ legacy: true });
    const state = accept(startBattle(source).state, { type: 'defend' });
    expect(canonicalCombatState(state)).not.toContain('moralePolicy');
    expect(canonicalCombatState(state)).not.toContain('escapePlan');
  });
});

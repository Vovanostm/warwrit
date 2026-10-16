import { describe, expect, it } from 'vitest';
import { SPRITE_PROTOTYPE_V3_RULESET_ID } from './types.js';

import {
  applyCombatCommand,
  battleId,
  chooseAiCommand,
  chooseTacticalCombatCommand,
  commandId,
  createHexagon,
  previewCombatAttacks,
  M0_COMBAT_RULESET_ID,
  SPRITE_PROTOTYPE_RULESET_ID,
  SPRITE_PROTOTYPE_V2_RULESET_ID,
  startBattle,
  unitId,
  type BattleSetup,
  type BattleState,
  type CombatCommand,
  type CombatUnitSetup,
  type Hex,
} from '../index.js';

const alpha = 'alpha' as CombatUnitSetup['sideId'];
const beta = 'beta' as CombatUnitSetup['sideId'];

function unit(
  id: string,
  sideId: CombatUnitSetup['sideId'],
  position: Hex,
  weaponId: CombatUnitSetup['weaponId'] = 'sword-shield',
  attributes: Partial<CombatUnitSetup['attributes']> = {},
): CombatUnitSetup {
  return {
    id: unitId(id),
    sideId,
    position,
    weaponId,
    trainedMelee: true,
    attributes: {
      health: 80,
      armor: 20,
      stamina: 100,
      initiative: sideId === alpha ? 100 : 10,
      accuracy: 10,
      defense: 10,
      morale: 70,
      ...attributes,
    },
  };
}

function setup(units: readonly CombatUnitSetup[], map?: BattleSetup['map']): BattleSetup {
  return {
    schemaVersion: 1,
    battleId: battleId('tactical-ai'),
    rulesetId: SPRITE_PROTOTYPE_RULESET_ID,
    seed: 42,
    map: map ?? { hexes: createHexagon(5), blocked: [] },
    sides: [
      { id: alpha, retreatHexes: [units.find(({ sideId }) => sideId === alpha)!.position] },
      { id: beta, retreatHexes: [units.find(({ sideId }) => sideId === beta)!.position] },
    ],
    units,
  };
}

function apply(state: BattleState, command: CombatCommand): BattleState {
  const result = applyCombatCommand(state, command);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function playerCommand(
  state: BattleState,
  input:
    | { type: 'move'; to: Hex }
    | { type: 'attack'; targetId: CombatUnitSetup['id'] }
    | { type: 'wait' },
): CombatCommand {
  if (state.activation === null) throw new Error('Expected activation');
  return {
    ...input,
    actorId: state.activation.unitId,
    activationId: state.activation.id,
    commandId: commandId(`player:${state.revision}`),
  };
}

describe('opt-in tactical sprite AI', () => {
  it('chooses the useful learned attack and rescues a panicked ally in v3', () => {
    const base = setup([
      { ...unit('bow', alpha, { q: 0, r: 0 }, 'bow'), skillRanks: { 'aimed-shot': 3, rally: 2 } },
      {
        ...unit('ally', alpha, { q: 0, r: 1 }, 'sword-shield', { initiative: 90, morale: 10 }),
        moralePolicy: 'human',
      },
      unit('enemy', beta, { q: 3, r: 0 }),
    ]);
    const state = startBattle({ ...base, rulesetId: SPRITE_PROTOTYPE_V3_RULESET_ID }).state;
    const rescue = chooseTacticalCombatCommand(state);
    expect(rescue).toMatchObject({ type: 'use-skill', skillId: 'rally', targetId: 'ally' });
    expect(apply(state, rescue).units.find((actor) => actor.id === 'ally')?.morale).toBe(28);
    const noPanic = startBattle({
      ...base,
      rulesetId: SPRITE_PROTOTYPE_V3_RULESET_ID,
      units: [base.units[0]!, base.units[2]!],
    }).state;
    const shot = chooseTacticalCombatCommand(noPanic);
    expect(shot).toMatchObject({ type: 'use-skill', skillId: 'aimed-shot', targetId: 'enemy' });
    apply(noPanic, shot);
  });

  it('uses brace rather than trading into a lethal heavy reply', () => {
    const state = startBattle({
      ...setup([
        {
          ...unit('actor', alpha, { q: 0, r: 0 }, 'sword-shield', { health: 20, armor: 0 }),
          skillRanks: { 'shield-brace': 3 },
        },
        unit('enemy', beta, { q: 1, r: 0 }, 'great-weapon'),
      ]),
      rulesetId: SPRITE_PROTOTYPE_V3_RULESET_ID,
    }).state;
    const tired = {
      ...state,
      units: state.units.map((actor) => (actor.id === 'actor' ? { ...actor, stamina: 12 } : actor)),
    };
    const choice = chooseTacticalCombatCommand(tired);
    expect(choice).toMatchObject({ type: 'use-skill', skillId: 'shield-brace' });
    apply(tired, choice);
  });

  it('a wounded v3 bow leaves a lethal reply without crossing a departure reaction', () => {
    const state = startBattle({
      ...setup([
        unit('actor', alpha, { q: 0, r: 0 }, 'bow', { health: 5, armor: 0 }),
        unit('enemy', beta, { q: 1, r: 0 }, 'great-weapon'),
      ]),
      rulesetId: SPRITE_PROTOTYPE_V3_RULESET_ID,
    }).state;
    expect(chooseTacticalCombatCommand(state).type).not.toBe('move');
    const spent = {
      ...state,
      units: state.units.map((actor) =>
        actor.id === 'enemy' ? { ...actor, reactionSpent: true } : actor,
      ),
    };
    const command = chooseTacticalCombatCommand(spent);
    expect(command.type).toBe('move');
    expect(apply(spent, command).units[0]?.health).toBe(5);
  });
  it('prioritizes v2 mill threats and panic over ordinary attacks', () => {
    const base = setup([
      { ...unit('mill', alpha, { q: 0, r: 0 }, 'great-weapon'), threatProfile: 'mill-slam' },
      { ...unit('enemy', beta, { q: 1, r: 0 }), moralePolicy: 'human' },
    ]);
    const state = startBattle({ ...base, rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID }).state;
    expect(chooseTacticalCombatCommand(state)).toMatchObject({
      type: 'prepare-threat',
      targetId: 'enemy',
    });
    apply(state, chooseTacticalCombatCommand(state));

    const panicked = startBattle({
      ...base,
      rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID,
      units: [
        {
          ...unit('mill', alpha, { q: 0, r: 0 }, 'great-weapon', { morale: 10 }),
          moralePolicy: 'human',
        },
        { ...unit('enemy', beta, { q: 1, r: 0 }), moralePolicy: 'human' },
      ],
    }).state;
    expect(chooseTacticalCombatCommand(panicked).type).toBe('surrender');
    apply(panicked, chooseTacticalCombatCommand(panicked));

    const escaping = startBattle({
      ...setup([
        {
          ...unit('runner', alpha, { q: 0, r: 0 }, 'sword-shield', { morale: 10 }),
          moralePolicy: 'human',
        },
        { ...unit('enemy', beta, { q: 3, r: 0 }), moralePolicy: 'human' },
      ]),
      rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID,
    }).state;
    expect(chooseTacticalCombatCommand(escaping).type).toBe('flee');
    apply(escaping, chooseTacticalCombatCommand(escaping));
  });

  it('finishes deterministic v2 six against six with legal commands', () => {
    const weapons = [
      'sword-shield',
      'spear',
      'great-weapon',
      'bow',
      'sword-shield',
      'spear',
    ] as const;
    const initial = startBattle({
      ...setup(
        weapons.flatMap((weapon, index) => [
          {
            ...unit(`a-${index}`, alpha, { q: -3, r: index - 2 }, weapon, {
              initiative: 100 - index,
            }),
            moralePolicy: 'human' as const,
          },
          {
            ...unit(`b-${index}`, beta, { q: 3, r: index - 3 }, weapon, { initiative: 50 - index }),
            moralePolicy: 'human' as const,
          },
        ]),
      ),
      rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID,
    }).state;
    let state = initial;
    let commands = 0;
    while (state.status === 'active' && commands < 600) {
      const chosen = chooseTacticalCombatCommand(state);
      expect(chooseTacticalCombatCommand(state)).toEqual(chosen);
      state = apply(state, chosen);
      commands += 1;
    }
    expect(state.status).toBe('resolved');
    expect(commands).toBeLessThan(600);
  });

  const contactMap = {
    hexes: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
    ],
    blocked: [],
  };
  it('prefers exposed health damage independent of target IDs and preserves legacy ID ordering', () => {
    for (const [tankId, bowId] of [
      ['a-tank', 'z-bow'],
      ['z-tank', 'a-bow'],
    ] as const) {
      const state = startBattle(
        setup(
          [
            unit('actor', alpha, { q: 0, r: 0 }),
            unit(tankId, beta, { q: 1, r: 0 }, 'sword-shield', { armor: 60 }),
            unit(bowId, beta, { q: 0, r: 1 }, 'bow', { armor: 0 }),
          ],
          contactMap,
        ),
      ).state;
      expect(chooseTacticalCombatCommand(state)).toMatchObject({ type: 'attack', targetId: bowId });
      expect(chooseAiCommand(state)).toMatchObject({
        type: 'attack',
        targetId: 'a-' + (tankId.startsWith('a-') ? 'tank' : 'bow'),
      });
    }
  });

  it('finishes a wounded enemy before stripping a healthy armored target', () => {
    const state = startBattle(
      setup(
        [
          unit('actor', alpha, { q: 0, r: 0 }),
          unit('a-tank', beta, { q: 1, r: 0 }, 'great-weapon', { armor: 60 }),
          unit('z-wounded', beta, { q: 0, r: 1 }, 'bow', { health: 1, armor: 0 }),
        ],
        contactMap,
      ),
    ).state;
    const chosen = chooseTacticalCombatCommand(state);
    expect(chosen).toMatchObject({ type: 'attack', targetId: 'z-wounded' });
    expect(apply(state, chosen).units.find(({ id }) => id === 'z-wounded')?.status).toBe('dead');
  });

  it('uses target threat before IDs when outgoing damage is equal', () => {
    const state = startBattle(
      setup(
        [
          unit('actor', alpha, { q: 0, r: 0 }),
          unit('a-sword', beta, { q: 1, r: 0 }),
          unit('z-heavy', beta, { q: 0, r: 1 }, 'great-weapon'),
        ],
        contactMap,
      ),
    ).state;
    expect(chooseTacticalCombatCommand(state)).toMatchObject({
      type: 'attack',
      targetId: 'z-heavy',
    });
  });

  it('stays put on harmless move-and-attack ties', () => {
    const state = startBattle(
      setup([
        unit('actor', alpha, { q: 0, r: 0 }, 'spear'),
        unit('enemy', beta, { q: 1, r: 0 }, 'bow'),
      ]),
    ).state;
    expect(chooseTacticalCombatCommand(state)).toMatchObject({ type: 'attack', targetId: 'enemy' });
  });

  it('delegates historical M0 decisions unchanged', () => {
    const sprite = setup([
      unit('actor', alpha, { q: 0, r: 0 }),
      unit('ally', alpha, { q: -1, r: 0 }, 'bow', { initiative: 90 }),
      unit('enemy', beta, { q: 1, r: 0 }),
      unit('enemy-bow', beta, { q: 3, r: 0 }, 'bow'),
    ]);
    const state = startBattle({
      ...sprite,
      rulesetId: M0_COMBAT_RULESET_ID,
      units: sprite.units.map(({ id, sideId, position, weaponId, attributes }) => ({
        id,
        sideId,
        position,
        weaponId,
        attributes,
      })),
    }).state;
    expect(chooseTacticalCombatCommand(state)).toEqual(chooseAiCommand(state));
  });

  it('compares a ranged spear attack with an affordable step to a guaranteed adjacent hit', () => {
    const state = startBattle(
      setup([unit('actor', alpha, { q: 0, r: 0 }, 'spear'), unit('enemy', beta, { q: 2, r: 0 })]),
    ).state;
    expect(previewCombatAttacks(state)[0]?.hitChance).toBeLessThan(100);
    expect(chooseAiCommand(state)).toMatchObject({ type: 'attack', targetId: 'enemy' });
    const choice = chooseTacticalCombatCommand(state);
    expect(choice).toMatchObject({ type: 'move', to: { q: 1, r: 0 } });
    const moved = apply(state, choice);
    expect(previewCombatAttacks(moved)[0]?.hitChance).toBe(100);
    expect(chooseTacticalCombatCommand(moved)).toMatchObject({ type: 'attack', targetId: 'enemy' });
    apply(moved, chooseTacticalCombatCommand(moved));
  });

  it('holds a heavy at two hexes so a sword approach and attack consumes the retreat AP', () => {
    let state = startBattle(
      setup([
        unit('heavy', alpha, { q: 0, r: 0 }, 'great-weapon'),
        unit('sword', beta, { q: 2, r: 0 }),
      ]),
    ).state;
    expect(chooseAiCommand(state).type).toBe('move');
    expect(chooseTacticalCombatCommand(state).type).toBe('defend');
    state = apply(state, chooseTacticalCombatCommand(state));
    expect(state.activation?.unitId).toBe('sword');
    state = apply(state, playerCommand(state, { type: 'move', to: { q: 1, r: 0 } }));
    state = apply(state, playerCommand(state, { type: 'attack', targetId: unitId('heavy') }));
    expect(state.activation?.remainingActionPoints).toBe(0);
    const illegalRetreat = applyCombatCommand(
      state,
      playerCommand(state, { type: 'move', to: { q: 2, r: 0 } }),
    );
    expect(illegalRetreat.ok).toBe(false);
    state = apply(state, playerCommand(state, { type: 'wait' }));
    const response = chooseTacticalCombatCommand(state);
    expect(response).toMatchObject({ type: 'attack', targetId: 'sword' });
    const responded = apply(state, response);
    expect(responded.units.find(({ id }) => id === 'sword')?.health).toBeLessThan(80);
  });

  it('advances a heavy against a stationary sword when a second enemy can punish holding', () => {
    let state = startBattle({
      ...setup([
        {
          ...unit('heavy', alpha, { q: 0, r: 0 }, 'great-weapon', { initiative: 100 }),
          moralePolicy: 'human',
        },
        {
          ...unit('sword', beta, { q: 2, r: 0 }, 'sword-shield', { initiative: 50 }),
          moralePolicy: 'human',
        },
        { ...unit('bow', beta, { q: -3, r: 0 }, 'bow', { initiative: 40 }), moralePolicy: 'human' },
      ]),
      rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID,
    }).state;
    expect(chooseTacticalCombatCommand(state).type).toBe('move');
    let heavyAttacked = false;
    for (
      let commands = 0;
      state.status === 'active' && commands < 80 && !heavyAttacked;
      commands += 1
    ) {
      const actorId = state.activation?.unitId;
      const command =
        actorId === 'sword'
          ? playerCommand(state, { type: 'wait' })
          : chooseTacticalCombatCommand(state);
      if (actorId === 'heavy' && command.type === 'attack') heavyAttacked = true;
      state = apply(state, command);
    }
    expect(heavyAttacked).toBe(true);
    expect(state.units.find(({ id }) => id === 'heavy')?.status).toBe('active');
    expect(
      state.units.filter(({ sideId, health }) => sideId === beta && health < 80).length,
    ).toBeGreaterThan(0);
  });

  it('uses available departure reactions when comparing a step with a current attack', () => {
    const state = startBattle({
      ...setup(
        [
          unit('actor', alpha, { q: 0, r: 0 }, 'spear'),
          unit('heavy', beta, { q: 1, r: 0 }, 'great-weapon', { armor: 60 }),
          unit('bow', beta, { q: -2, r: 0 }, 'bow', { armor: 0 }),
        ],
        {
          hexes: [-2, -1, 0, 1].map((q) => ({ q, r: 0 })),
          blocked: [],
        },
      ),
      rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID,
    }).state;
    expect(chooseTacticalCombatCommand(state)).toMatchObject({ type: 'attack', targetId: 'heavy' });
    const spent = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === 'heavy' ? { ...unit, reactionSpent: true } : unit,
      ),
    };
    const command = chooseTacticalCombatCommand(spent);
    expect(command).toMatchObject({ type: 'move', to: { q: -1, r: 0 } });
    apply(spent, command);
  });

  it('holds achieved contact instead of reversing pursuit with insufficient attack AP', () => {
    // Observed mill rush R2: 9,5 → 9,4 → 8,4, then the old policy reversed
    // to 9,4 and back, taking a reaction while unable to pay the heavy's 4 AP.
    let state = startBattle({
      ...setup(
        [
          {
            ...unit('opponent-4', alpha, { q: 9, r: 5 }, 'great-weapon', {
              health: 110,
              armor: 40,
              stamina: 94,
              accuracy: 25,
              morale: 62,
            }),
            trainedMelee: false,
            moralePolicy: 'steady',
          },
          unit('human-1', beta, { q: 5, r: 7 }),
          unit('human-2', beta, { q: 5, r: 6 }, 'spear'),
          unit('human-3', beta, { q: 3, r: 5 }, 'bow'),
          unit('human-4', beta, { q: 7, r: 4 }, 'raider', { health: 85, armor: 30 }),
          unit('human-5', beta, { q: 5, r: 5 }, 'spear'),
          unit('human-6', beta, { q: 6, r: 5 }),
        ],
        {
          hexes: Array.from({ length: 11 }, (_, r) =>
            Array.from({ length: 15 }, (_, q) => ({ q, r })),
          ).flat(),
          blocked: [
            { q: 8, r: 2 },
            { q: 7, r: 3 },
            { q: 7, r: 7 },
            { q: 8, r: 8 },
          ],
          tiles: [{ q: 8, r: 5, height: 0, terrain: 'fire' }],
        },
      ),
      rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID,
    }).state;
    state = apply(state, playerCommand(state, { type: 'move', to: { q: 9, r: 4 } }));
    state = apply(state, playerCommand(state, { type: 'move', to: { q: 8, r: 4 } }));
    expect(state.activation?.remainingActionPoints).toBe(2);
    expect(state.units[0]).toMatchObject({ health: 110, armor: 40, stamina: 86 });
    const hold = chooseTacticalCombatCommand(state);
    expect(hold.type).toBe('defend');
    state = apply(state, hold);
    expect(state.units[0]).toMatchObject({ position: { q: 8, r: 4 }, health: 110, armor: 40 });
    expect(state.activation?.unitId).not.toBe('opponent-4');
  });

  it('does not reposition a bow instead of its available shot or after exhausting AP', () => {
    const state = startBattle(
      setup([unit('bow', alpha, { q: 0, r: 0 }, 'bow'), unit('enemy', beta, { q: 4, r: 0 })]),
    ).state;
    const shot = chooseTacticalCombatCommand(state);
    expect(shot.type).toBe('attack');
    const after = apply(state, shot);
    expect(after.activation?.remainingActionPoints).toBe(0);
    expect(chooseTacticalCombatCommand(after).type).toBe('wait');
  });

  it('approaches once with a bow, then holds while unable to afford the shot', () => {
    const state = startBattle(
      setup([unit('bow', alpha, { q: 0, r: 0 }, 'bow'), unit('enemy', beta, { q: 5, r: 0 })]),
    ).state;
    const first = chooseTacticalCombatCommand(state);
    expect(first).toMatchObject({ type: 'move', to: { q: 1, r: 0 } });
    let moved = apply(state, first);
    expect(chooseTacticalCombatCommand(moved).type).toBe('defend');
    moved = apply(moved, chooseTacticalCombatCommand(moved));
    expect(moved.activation?.unitId).toBe('enemy');
    expect(moved.units.find(({ id }) => id === 'bow')?.position).toEqual({ q: 1, r: 0 });
  });

  it('never enters a lethal fire crossing even when it is the only approach', () => {
    const map = {
      hexes: createHexagon(5),
      blocked: createHexagon(5).filter(({ q, r }) => r !== 0 || q < 0 || q > 3),
      tiles: [{ q: 1, r: 0, terrain: 'fire' as const, height: 0 as const }],
    };
    const state = startBattle(
      setup(
        [
          unit('actor', alpha, { q: 0, r: 0 }, 'sword-shield', { health: 5 }),
          unit('enemy', beta, { q: 3, r: 0 }),
        ],
        map,
      ),
    ).state;
    expect(chooseTacticalCombatCommand(state).type).toBe('defend');
    expect(apply(state, chooseTacticalCombatCommand(state)).units[0]?.health).toBe(5);
  });

  it('returns deterministic legal commands without mutating state or reading ahead in RNG', () => {
    let state = startBattle(
      setup([
        unit('spear', alpha, { q: 0, r: 0 }, 'spear'),
        unit('bow', alpha, { q: -1, r: 0 }, 'bow', { initiative: 90 }),
        unit('heavy', beta, { q: 3, r: 0 }, 'great-weapon'),
        unit('sword', beta, { q: 3, r: -1 }),
      ]),
    ).state;
    let count = 0;
    while (state.status === 'active' && count < 300) {
      const before = JSON.parse(JSON.stringify(state)) as BattleState;
      const command = chooseTacticalCombatCommand(state);
      expect(chooseTacticalCombatCommand(state)).toEqual(command);
      expect(state).toEqual(before);
      state = apply(state, command);
      count += 1;
    }
    expect(state.status).toBe('resolved');
    expect(count).toBeLessThan(300);
  });
});

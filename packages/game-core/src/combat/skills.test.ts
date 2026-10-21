import { describe, expect, it } from 'vitest';
import { startBattle, applyCombatCommand } from './engine.js';
import { createHexagon } from './hex.js';
import { previewCombatMovement } from './sprite-prototype.js';
import {
  previewCombatSkills,
  previewCombatSkillReach,
  getCombatSkills,
  validateCombatSkillRanks,
} from './skills.js';
import { previewCombatWeaponReach } from './sprite-prototype.js';
import { verifyCombatReplay } from './replay.js';
import {
  battleId,
  unitId,
  sideId,
  commandId,
  SPRITE_PROTOTYPE_V3_RULESET_ID,
  SPRITE_PROTOTYPE_V4_RULESET_ID,
  type BattleSetup,
  type BattleState,
  type CombatCommand,
  type WeaponId,
  type CombatSkillRanks,
} from './types.js';
const actorId = unitId('actor');

it('rejects malformed learned-rank records before accepting canonical setup', () => {
  for (const invalid of [42, [], '', null, new Map(), { 'aimed-shot': 4 }, { unknown: 1 }]) {
    expect(validateCombatSkillRanks(invalid)).toBe(false);
    expect(() => startBattle(setup('bow', invalid as CombatSkillRanks))).toThrow(
      'Invalid combat skill ranks',
    );
  }
  expect(validateCombatSkillRanks(undefined)).toBe(true);
  expect(validateCombatSkillRanks({})).toBe(true);
});
const targetId = unitId('target');
function setup(
  weaponId: WeaponId = 'bow',
  skillRanks: CombatSkillRanks = { 'aimed-shot': 2 },
  rulesetId: BattleSetup['rulesetId'] = SPRITE_PROTOTYPE_V3_RULESET_ID,
): BattleSetup {
  return {
    schemaVersion: 1,
    battleId: battleId('skills'),
    rulesetId,
    seed: 31,
    map: { hexes: createHexagon(4), blocked: [] },
    sides: [
      { id: sideId('a'), retreatHexes: [{ q: -4, r: 0 }] },
      { id: sideId('b'), retreatHexes: [{ q: 4, r: 0 }] },
    ],
    units: [
      {
        id: actorId,
        sideId: sideId('a'),
        position: { q: 0, r: 0 },
        weaponId,
        skillRanks,
        moralePolicy: 'human',
        attributes: {
          health: 120,
          armor: 40,
          stamina: 100,
          initiative: 100,
          accuracy: 40,
          defense: 5,
          morale: 80,
        },
      },
      {
        id: targetId,
        sideId: sideId('b'),
        position: { q: 2, r: 0 },
        weaponId: 'raider',
        moralePolicy: 'human',
        attributes: {
          health: 120,
          armor: 40,
          stamina: 100,
          initiative: 10,
          accuracy: 40,
          defense: 5,
          morale: 80,
        },
      },
    ],
  };
}
function command(
  state: BattleState,
  skillId: keyof CombatSkillRanks,
  target = targetId,
): CombatCommand {
  return {
    type: 'use-skill',
    skillId,
    targetId: target,
    actorId,
    activationId: state.activation!.id,
    commandId: commandId(`skill-${state.revision}`),
  };
}
describe('finite battle skills', () => {
  it('keeps aimed-shot at four AP and twenty-four stamina under the new bow profile', () => {
    const initialSetup = setup('bow', { 'aimed-shot': 2 }, SPRITE_PROTOTYPE_V4_RULESET_ID);
    const initial = startBattle(initialSetup).state;
    const quote = previewCombatSkills(initial).find(
      (row) => row.skillId === 'aimed-shot' && row.targetId === targetId,
    )!;
    expect(quote).toMatchObject({ legal: true, actionPointCost: 4, staminaCost: 24 });

    const move = previewCombatMovement(initial).find(
      (option) => option.to.q === -1 && option.to.r === 0,
    )!;
    const moved = applyCombatCommand(initial, {
      type: 'move',
      to: move.to,
      actorId,
      activationId: initial.activation!.id,
      commandId: commandId('aimed-after-step-move'),
    });
    expect(moved.ok).toBe(true);
    if (!moved.ok) throw new Error(moved.error.code);
    expect(moved.state.activation?.remainingActionPoints).toBe(3);
    expect(
      previewCombatSkills(moved.state).find(
        (row) => row.skillId === 'aimed-shot' && row.targetId === targetId,
      ),
    ).toMatchObject({
      legal: false,
      reason: 'INSUFFICIENT_ACTION_POINTS',
      actionPointCost: 4,
      staminaCost: 24,
    });
    const rejected = applyCombatCommand(moved.state, command(moved.state, 'aimed-shot'));
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: 'INSUFFICIENT_ACTION_POINTS' },
      state: moved.state,
    });
  });

  it('preview matches strike resources/damage and deterministic replay', () => {
    const initial = setup();
    const state = startBattle(initial).state;
    const beforeRandom = { ...state.random };
    const preview = previewCombatSkills(state).find(
      (row) => row.skillId === 'aimed-shot' && row.targetId === targetId,
    )!;
    expect(preview.legal).toBe(true);
    expect(state.random).toEqual(beforeRandom);
    const action = command(state, 'aimed-shot');
    const result = applyCombatCommand(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activation!.remainingActionPoints).toBe(0);
    expect(result.state.units[0]!.stamina).toBe(76);
    const damage = result.events.find((event) => event.type === 'unit.damaged');
    if (damage?.type === 'unit.damaged') {
      expect(damage.healthDamage).toBeGreaterThanOrEqual(preview.damage!.health.minimum);
      expect(damage.healthDamage).toBeLessThanOrEqual(preview.damage!.health.maximum);
      expect(damage.armorDamage).toBeGreaterThanOrEqual(preview.damage!.armor.minimum);
      expect(damage.armorDamage).toBeLessThanOrEqual(preview.damage!.armor.maximum);
    }
    expect(
      verifyCombatReplay({ schemaVersion: 1, setup: initial, commands: [action] }, result.state)
        .matches,
    ).toBe(true);
  });
  it('v3 skill overkill reports actual HP loss while historical strike events remain uncapped', () => {
    const base = setup('sword-shield', { 'armor-pressure': 1 });
    const initial: BattleSetup = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === actorId
          ? { ...unit, trainedMelee: true }
          : {
              ...unit,
              position: { q: 1, r: 0 },
              attributes: { ...unit.attributes, health: 1, armor: 0 },
            },
      ),
    };
    const state = startBattle(initial).state;
    const preview = previewCombatSkills(state).find(
      (row) => row.skillId === 'armor-pressure' && row.targetId === targetId,
    )!;
    expect(preview.damage!.health).toEqual({ minimum: 1, maximum: 1 });
    const action = command(state, 'armor-pressure');
    const result = applyCombatCommand(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const damage = result.events.find((event) => event.type === 'unit.damaged');
    expect(damage?.type).toBe('unit.damaged');
    if (damage?.type !== 'unit.damaged') return;
    expect(damage.healthDamage).toBe(1);
    expect(damage.rawDamage).toBeGreaterThan(1);
    expect(
      verifyCombatReplay({ schemaVersion: 1, setup: initial, commands: [action] }, result.state)
        .matches,
    ).toBe(true);
    expect(getCombatSkills(result.state)).toEqual([]);
    for (const rulesetId of ['sprite-prototype-v1', 'sprite-prototype-v2'] as const) {
      const historic: BattleSetup = {
        ...initial,
        rulesetId,
        units: initial.units.map(({ skillRanks: _ranks, moralePolicy: _policy, ...unit }) => unit),
      };
      const oldState = startBattle(historic).state;
      const attacked = applyCombatCommand(oldState, {
        type: 'attack',
        targetId,
        actorId,
        activationId: oldState.activation!.id,
        commandId: commandId('historic-overkill'),
      });
      expect(attacked.ok).toBe(true);
      if (!attacked.ok) return;
      const oldDamage = attacked.events.find((event) => event.type === 'unit.damaged');
      expect(oldDamage?.type).toBe('unit.damaged');
      if (oldDamage?.type === 'unit.damaged')
        expect(oldDamage.healthDamage).toBe(oldDamage.rawDamage);
    }
  });
  it('equipment does not teach skills and rejected use is atomic', () => {
    const state = startBattle(setup('sword-shield')).state;
    expect(getCombatSkills(state)[0]!.equipmentAvailable).toBe(false);
    const result = applyCombatCommand(state, command(state, 'aimed-shot'));
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(getCombatSkills(startBattle(setup('bow', {})).state)).toEqual([]);
  });
  it('brace lasts through enemy activation and ends at next actor activation', () => {
    const initial = setup('sword-shield', { 'shield-brace': 3 });
    let state = startBattle(initial).state;
    const result = applyCombatCommand(state, command(state, 'shield-brace', actorId));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = result.state;
    expect(state.units[0]!.shieldBraceRank).toBe(3);
    expect(previewCombatSkills(state)[0]!.reason).toBe('SKILL_NOT_AVAILABLE');
    for (let index = 0; index < 2; index++) {
      const waited = applyCombatCommand(state, {
        type: 'wait',
        actorId: state.activation!.unitId,
        activationId: state.activation!.id,
        commandId: commandId(`wait-${index}`),
      });
      expect(waited.ok).toBe(true);
      if (!waited.ok) return;
      state = waited.state;
      if (index === 0) expect(state.units[0]!.shieldBraceRank).toBe(3);
    }
    expect(state.activation!.unitId).toBe(actorId);
    expect(state.units[0]!.shieldBraceRank).toBeUndefined();
    expect(state.units[0]!.guarding).toBe(false);
  });
  it('rally restores actual human morale while keeping resource debit', () => {
    let state = startBattle(setup('raider', { rally: 2 })).state;
    state = {
      ...state,
      units: state.units.map((unit) => (unit.id === actorId ? { ...unit, morale: 30 } : unit)),
    };
    const preview = previewCombatSkills(state).find((row) => row.targetId === actorId)!;
    expect(preview.moraleGain).toBe(18);
    const result = applyCombatCommand(state, command(state, 'rally', actorId));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.units[0]!.morale).toBe(48);
    expect(result.state.units[0]!.stamina).toBe(86);
  });
  it('historical profiles reject learned ranks and unknown ranks fail closed', () => {
    expect(() => startBattle({ ...setup(), rulesetId: 'sprite-prototype-v2' })).toThrow(
      'Skills require',
    );
    expect(() =>
      startBattle(setup('bow', { 'aimed-shot': 4 } as unknown as CombatSkillRanks)),
    ).toThrow('Invalid combat skill ranks');
  });
});

// A finite cross with all six adjacent cells. Expectations do not repeat the range formula.
const reachCells = [
  [-4, 0],
  [-3, 0],
  [-2, 0],
  [-1, 0],
  [-1, 1],
  [0, -2],
  [0, -1],
  [0, 0],
  [0, 1],
  [0, 2],
  [1, -1],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
].map(([q, r]) => ({ q: q!, r: r! }));
const nearCells = [
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
].map(([q, r]) => ({ q: q!, r: r! }));
const twoCells = [
  { q: -2, r: 0 },
  { q: 0, r: -2 },
  { q: 0, r: 2 },
  { q: 2, r: 0 },
];
function reachState(weapon: WeaponId, ranks: CombatSkillRanks): BattleState {
  const initial = setup(weapon, ranks);
  return startBattle({ ...initial, map: { hexes: reachCells, blocked: [] } }).state;
}
const sorted = (cells: readonly { q: number; r: number }[]) =>
  [...cells].sort((a, b) => a.q - b.q || a.r - b.r);

describe('passive learned-skill geometry', () => {
  it.each([
    ['shield-brace', 'sword-shield', 0, 0, [{ q: 0, r: 0 }]],
    ['armor-pressure', 'sword-shield', 1, 1, nearCells],
    ['reach-thrust', 'spear', 2, 2, twoCells],
    [
      'aimed-shot',
      'bow',
      2,
      4,
      [...twoCells, { q: -4, r: 0 }, { q: -3, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }],
    ],
    ['rally', 'raider', 0, 2, [...nearCells, ...twoCells, { q: 0, r: 0 }]],
  ] as const)(
    'publishes %s shape including empty and occupied cells',
    (skillId, weapon, minimumRange, maximumRange, cells) => {
      const state = reachState(weapon, { [skillId]: 2 });
      const before: BattleState = JSON.parse(JSON.stringify(state));
      const rows = previewCombatSkillReach(state, actorId);
      expect(rows).toEqual([
        {
          actorId,
          activationId: state.activation!.id,
          revision: state.revision,
          skillId,
          minimumRange,
          maximumRange,
          cells: sorted(cells),
        },
      ]);
      expect(previewCombatSkillReach(state, actorId)).toEqual(rows);
      if (skillId === 'aimed-shot') {
        expect(previewCombatWeaponReach(state, actorId)!.cells).toContainEqual({ q: 1, r: 0 });
        expect(rows[0]!.cells).not.toContainEqual({ q: 1, r: 0 });
      }
      (rows[0]!.cells[0] as { q: number }).q = 999;
      expect(state).toEqual(before);
      expect(previewCombatSkillReach(state, actorId)[0]!.cells).toEqual(sorted(cells));
    },
  );

  it.each(['reach-thrust', 'aimed-shot', 'rally'] as const)(
    'shares %s LOS with target admission on heights 0/1/2 and blockers',
    (skillId) => {
      const weapon = skillId === 'reach-thrust' ? 'spear' : 'bow';
      const base = reachState(weapon, { [skillId]: 1 });
      for (const height of [0, 1, 2] as const) {
        const state: BattleState = {
          ...base,
          activation: { ...base.activation!, remainingActionPoints: height === 0 ? 4 : 0 },
          map: {
            ...base.map,
            tiles: reachCells.map((cell) => ({
              ...cell,
              height: cell.q === 1 && cell.r === 0 ? height : 0,
              terrain: 'plain',
            })),
          },
          units: base.units.map((unit) =>
            unit.id === targetId && skillId === 'rally'
              ? { ...unit, sideId: sideId('a'), morale: 20 }
              : unit,
          ),
        };
        const expected = height === 0;
        expect(
          previewCombatSkillReach(state, actorId)[0]!.cells.some(
            (cell) => cell.q === 2 && cell.r === 0,
          ),
        ).toBe(expected);
        const preview = previewCombatSkills(state).find((row) => row.targetId === targetId)!;
        expect(preview.legal).toBe(expected);
        const result = applyCombatCommand(state, command(state, skillId));
        expect(result.ok).toBe(expected);
        if (!result.ok) expect(result.error.code).toBe('BLOCKED_LINE_OF_SIGHT');
      }
      const blocked = {
        ...base,
        map: {
          ...base.map,
          blocked: [
            { q: 1, r: 0 },
            { q: -2, r: 0 },
          ],
        },
      };
      const cells = previewCombatSkillReach(blocked, actorId)[0]!.cells;
      expect(cells).not.toContainEqual({ q: 2, r: 0 });
      expect(cells).not.toContainEqual({ q: -2, r: 0 });
    },
  );

  it('retains passive geometry through resource, panic, brace and target refusals', () => {
    const base = reachState('sword-shield', { 'shield-brace': 3, 'armor-pressure': 2, rally: 1 });
    const expected = previewCombatSkillReach(base, actorId);
    for (const [patch, reason] of [
      [{ stamina: 0 }, 'INSUFFICIENT_STAMINA'],
      [{ morale: 0 }, 'PANICKED'],
      [{ shieldBraceRank: 3 }, 'SKILL_NOT_AVAILABLE'],
    ] as const) {
      const state = {
        ...base,
        units: base.units.map((unit) => (unit.id === actorId ? { ...unit, ...patch } : unit)),
      };
      expect(previewCombatSkillReach(state, actorId)).toEqual(expected);
      expect(previewCombatSkills(state).find((row) => row.skillId === 'shield-brace')?.reason).toBe(
        reason,
      );
      const rejected = applyCombatCommand(state, command(state, 'shield-brace', actorId));
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) expect(rejected.error.code).toBe(reason);
      expect(rejected.state).toBe(state);
    }
    const exhausted = { ...base, activation: { ...base.activation!, remainingActionPoints: 0 } };
    expect(previewCombatSkillReach(exhausted, actorId)).toEqual(expected);
    expect(
      previewCombatSkills(exhausted).find((row) => row.skillId === 'shield-brace')?.reason,
    ).toBe('INSUFFICIENT_ACTION_POINTS');
    const rejected = applyCombatCommand(exhausted, command(exhausted, 'shield-brace', actorId));
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe('INSUFFICIENT_ACTION_POINTS');
    expect(rejected.state).toBe(exhausted);
    for (const patch of [
      { sideId: sideId('a') },
      { incorporeal: true },
      { status: 'dead' as const },
    ]) {
      const state = {
        ...base,
        units: base.units.map((unit) =>
          unit.id === targetId ? { ...unit, position: { q: 1, r: 0 }, ...patch } : unit,
        ),
      };
      expect(previewCombatSkillReach(state, actorId)).toEqual(expected);
      expect(
        previewCombatSkills(state).find(
          (row) => row.skillId === 'armor-pressure' && row.targetId === targetId,
        )?.reason,
      ).toBe('INVALID_TARGET');
    }
    for (const patch of [
      { morale: 100 },
      { moralePolicy: 'beast' as const },
      { moralePolicy: 'steady' as const },
    ]) {
      const state = {
        ...base,
        units: base.units.map((unit) =>
          unit.id === targetId ? { ...unit, sideId: sideId('a'), ...patch } : unit,
        ),
      };
      expect(previewCombatSkillReach(state, actorId)).toEqual(expected);
      expect(
        previewCombatSkills(state).find(
          (row) => row.skillId === 'rally' && row.targetId === targetId,
        )?.reason,
      ).toBe('INVALID_TARGET');
    }
  });

  it('keeps catalogue order, empty capability rows and current context only', () => {
    const state = reachState('bow', { rally: 1, 'armor-pressure': 1, 'aimed-shot': 1 });
    expect(previewCombatSkillReach(state, actorId).map((row) => row.skillId)).toEqual([
      'armor-pressure',
      'aimed-shot',
      'rally',
    ]);
    expect(previewCombatSkillReach(state, actorId)[0]!.cells).toEqual([]);
    const threat = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === actorId ? { ...unit, threatProfile: 'mill-slam' as const } : unit,
      ),
    };
    expect(previewCombatSkillReach(threat, actorId).every((row) => row.cells.length === 0)).toBe(
      true,
    );
    expect(previewCombatSkillReach(reachState('bow', {}), actorId)).toEqual([]);
    for (const id of [targetId, unitId('missing')])
      expect(previewCombatSkillReach(state, id)).toEqual([]);
    for (const patch of [
      { status: 'resolved' as const },
      { activation: null },
      { rulesetId: 'm0-prototype-v1' as const },
      { rulesetId: 'sprite-prototype-v1' as const },
      { rulesetId: 'sprite-prototype-v2' as const },
      { units: state.units.map((unit) => ({ ...unit, status: 'dead' as const })) },
    ])
      expect(previewCombatSkillReach({ ...state, ...patch }, actorId)).toEqual([]);
    const duplicate = {
      ...state,
      map: { ...state.map, hexes: [...state.map.hexes].reverse().concat(state.map.hexes) },
    };
    expect(previewCombatSkillReach(duplicate, actorId)).toEqual(
      previewCombatSkillReach(state, actorId),
    );
  });
});

it.each([
  ['shield-brace', 'sword-shield', 2, 12],
  ['armor-pressure', 'sword-shield', 4, 22],
  ['reach-thrust', 'spear', 4, 20],
  ['aimed-shot', 'bow', 4, 24],
  ['rally', 'raider', 2, 14],
] as const)(
  'preserves %s exact costs and rank effects through passive queries',
  (skillId, weapon, ap, stamina) => {
    for (const rank of [1, 2, 3] as const) {
      let state = reachState(weapon, { [skillId]: rank });
      state = {
        ...state,
        units: state.units.map((unit) =>
          unit.id === actorId
            ? { ...unit, morale: 30 }
            : { ...unit, position: { q: skillId === 'armor-pressure' ? 1 : 2, r: 0 } },
        ),
      };
      const target = skillId === 'shield-brace' || skillId === 'rally' ? actorId : targetId;
      const before = JSON.stringify(state);
      previewCombatSkillReach(state, actorId);
      expect(JSON.stringify(state)).toBe(before);
      const preview = previewCombatSkills(state).find((row) => row.targetId === target)!;
      const used = applyCombatCommand(state, command(state, skillId, target));
      expect(used.ok).toBe(true);
      if (!used.ok) return;
      expect(used.state.activation!.remainingActionPoints).toBe(4 - ap);
      expect(used.state.units[0]!.stamina).toBe(100 - stamina);
      if (skillId === 'shield-brace') expect(preview.damageReductionPercent).toBe(35 + rank * 5);
      if (skillId === 'rally') expect(used.state.units[0]!.morale).toBe(30 + 6 + rank * 6);
      if (skillId === 'aimed-shot' || skillId === 'reach-thrust')
        expect(preview.hitChance).toBe(95); // This accurate fixture reaches the existing cap.
      const damage = used.events.find((event) => event.type === 'unit.damaged');
      if (damage?.type === 'unit.damaged') {
        expect(damage.healthDamage).toBeGreaterThanOrEqual(preview.damage!.health.minimum);
        expect(damage.healthDamage).toBeLessThanOrEqual(preview.damage!.health.maximum);
        expect(damage.armorDamage).toBeGreaterThanOrEqual(preview.damage!.armor.minimum);
        expect(damage.armorDamage).toBeLessThanOrEqual(preview.damage!.armor.maximum);
      }
    }
  },
);

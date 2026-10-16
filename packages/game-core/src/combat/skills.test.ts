import { describe, expect, it } from 'vitest';
import { startBattle, applyCombatCommand } from './engine.js';
import { createHexagon } from './hex.js';
import { previewCombatSkills, getCombatSkills, validateCombatSkillRanks } from './skills.js';
import { verifyCombatReplay } from './replay.js';
import {
  battleId,
  unitId,
  sideId,
  commandId,
  SPRITE_PROTOTYPE_V3_RULESET_ID,
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
): BattleSetup {
  return {
    schemaVersion: 1,
    battleId: battleId('skills'),
    rulesetId: SPRITE_PROTOTYPE_V3_RULESET_ID,
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

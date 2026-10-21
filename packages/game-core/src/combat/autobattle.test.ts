import { describe, expect, it } from 'vitest';
import { advanceCombatAutoplay } from './autobattle.js';
import { applyCombatCommand, startBattle } from './engine.js';
import { createHexagon } from './hex.js';
import { replayCombat } from './replay.js';
import { combatRules } from './rules.js';
import { canonicalCombatState, chooseTacticalCombatCommand } from '../index.js';
import {
  battleId,
  commandId,
  sideId,
  unitId,
  SPRITE_PROTOTYPE_V2_RULESET_ID,
  SPRITE_PROTOTYPE_V3_RULESET_ID,
  SPRITE_PROTOTYPE_V4_RULESET_ID,
  type BattleSetup,
} from './types.js';

const setup: BattleSetup = {
  schemaVersion: 1,
  battleId: battleId('autoplay'),
  rulesetId: SPRITE_PROTOTYPE_V2_RULESET_ID,
  seed: 42,
  map: { hexes: createHexagon(4), blocked: [] },
  sides: [
    { id: sideId('alpha'), retreatHexes: [{ q: -4, r: 0 }] },
    { id: sideId('beta'), retreatHexes: [{ q: 4, r: 0 }] },
  ],
  units: ['alpha', 'beta'].map((side, index) => ({
    id: unitId(side),
    sideId: sideId(side),
    position: { q: index === 0 ? -1 : 1, r: 0 },
    weaponId: 'sword-shield',
    moralePolicy: 'human',
    attributes: {
      health: 80,
      armor: 20,
      stamina: 100,
      initiative: index === 0 ? 100 : 10,
      accuracy: 10,
      defense: 10,
      morale: 70,
    },
  })),
};

describe('canonical combat autoplay', () => {
  it('one command has exactly the manual transition and leaves input unchanged', () => {
    const initial = startBattle(setup).state;
    const before = JSON.parse(JSON.stringify(initial)) as typeof initial;
    const result = advanceCombatAutoplay(initial);
    expect(result.commands).toHaveLength(1);
    const manual = applyCombatCommand(initial, result.commands[0]!);
    expect(manual.ok).toBe(true);
    if (!manual.ok) throw new Error(manual.error.message);
    expect(result.state).toEqual(manual.state);
    expect(result.events).toEqual(manual.events);
    expect(initial).toEqual(before);
    expect(advanceCombatAutoplay(initial)).toEqual(result);
  });

  it('activation automation stops before commanding the next actor', () => {
    const initial = startBattle(setup).state;
    const result = advanceCombatAutoplay(initial, 'activation');
    expect(result.stoppedBecause).toBe('activation');
    expect(
      result.commands.every((command) => command.activationId === initial.activation?.id),
    ).toBe(true);
    expect(result.state.activation?.id).not.toBe(initial.activation?.id);
  });

  it('full battle resolves deterministically and replays the identical canonical state', () => {
    const initial = startBattle(setup).state;
    const result = advanceCombatAutoplay(initial, 'resolved');
    expect(result.stoppedBecause).toBe('resolved');
    expect(result.commands.length).toBeLessThan(
      combatRules(setup.rulesetId).limits.maximumCommands,
    );
    expect(advanceCombatAutoplay(initial, 'resolved')).toEqual(result);
    expect(replayCombat({ schemaVersion: 1, setup, commands: result.commands }).state).toEqual(
      result.state,
    );
    expect(advanceCombatAutoplay(result.state).commands).toEqual([]);
  });

  it('v3 skills resolve through the same replay without hidden autoplay state', () => {
    const skillsSetup: BattleSetup = {
      ...setup,
      rulesetId: SPRITE_PROTOTYPE_V3_RULESET_ID,
      units: setup.units.map((unit) => ({
        ...unit,
        skillRanks: { 'armor-pressure': 2, 'shield-brace': 2, rally: 1 },
      })),
    };
    const initial = startBattle(skillsSetup).state;
    const result = advanceCombatAutoplay(initial, 'resolved');
    expect(result.stoppedBecause).toBe('resolved');
    expect(result.commands.some((command) => command.type === 'use-skill')).toBe(true);
    expect(
      replayCombat({ schemaVersion: 1, setup: skillsSetup, commands: result.commands }).state,
    ).toEqual(result.state);
    expect(advanceCombatAutoplay(initial, 'resolved')).toEqual(result);
  });

  it('replays deterministic sprite-v4 bow and mixed-weapon tactical autoplay with terrain', () => {
    const tacticalSetup: BattleSetup = {
      ...setup,
      battleId: battleId('autoplay-sprite-v4-bow'),
      rulesetId: SPRITE_PROTOTYPE_V4_RULESET_ID,
      map: {
        ...setup.map,
        tiles: [{ q: 0, r: 0, height: 0, terrain: 'mud' }],
      },
      units: setup.units.map((unit, index) => ({
        ...unit,
        position: index === 0 ? { q: -1, r: 0 } : { q: 1, r: 0 },
        weaponId: index === 0 ? 'bow' : 'spear',
        skillRanks: index === 0 ? { 'aimed-shot': 2 } : { 'reach-thrust': 1 },
        moralePolicy: 'human',
      })),
    };
    const initial = startBattle(tacticalSetup).state;
    const firstCommand = chooseTacticalCombatCommand(initial);
    expect(applyCombatCommand(initial, firstCommand).ok).toBe(true);

    const first = advanceCombatAutoplay(initial, 'resolved');
    const repeated = advanceCombatAutoplay(initial, 'resolved');
    expect(first.stoppedBecause).toBe('resolved');
    expect(first.commands.length).toBeLessThan(
      combatRules(tacticalSetup.rulesetId).limits.maximumCommands,
    );
    expect(first.commands[0]).toEqual(firstCommand);
    expect(first.commands.some((command) => command.type === 'use-skill')).toBe(true);
    expect(repeated).toEqual(first);
    expect(first.state.random.draws).toBeGreaterThan(0);
    const replay = JSON.parse(
      JSON.stringify({ schemaVersion: 1, setup: tacticalSetup, commands: first.commands }),
    ) as Parameters<typeof replayCombat>[0];
    const replayed = replayCombat(replay);
    expect(replayed.state.random).toEqual(first.state.random);
    expect(canonicalCombatState(replayed.state)).toBe(canonicalCombatState(first.state));
  });

  it('uses the remaining canonical command budget without a second scheduler limit', () => {
    const initial = startBattle(setup).state;
    const limit = combatRules(setup.rulesetId).limits.maximumCommands;
    const exhausted = {
      ...initial,
      processedCommandIds: Array.from({ length: limit }, (_, index) => commandId(`old:${index}`)),
    };
    expect(advanceCombatAutoplay(exhausted, 'resolved')).toMatchObject({
      state: exhausted,
      commands: [],
      stoppedBecause: 'command-limit',
    });
  });
});

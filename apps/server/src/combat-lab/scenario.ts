import * as combat from '@warwrit/game-core';
import { COMBAT_LAB_SCENARIO } from '@warwrit/protocol';

// Diagnostic data only: neither a Company limit nor a production encounter.
export function createCombatLabFixture(id: string) {
  const human = combat.sideId('human');
  const opponent = combat.sideId('opponent');
  const hexes = combat.createHexagon(3);
  const setup: combat.BattleSetup = {
    schemaVersion: 1,
    rulesetId: 'm0-prototype-v1',
    battleId: combat.battleId(id),
    seed: 22092026,
    map: { hexes, blocked: [combat.hex(0, 0)] },
    sides: [
      { id: human, retreatHexes: hexes.filter(({ q }) => q === -3) },
      { id: opponent, retreatHexes: hexes.filter(({ q }) => q === 3) },
    ],
    units: (
      [
        ['human-shield', human, -2, 0, 'sword-shield', 60],
        ['human-spear', human, -2, 1, 'spear', 55],
        ['human-bow', human, -2, 2, 'bow', 50],
        ['opponent-raider', opponent, 2, 0, 'raider', 58],
        ['opponent-heavy', opponent, 2, -1, 'great-weapon', 53],
        ['opponent-bow', opponent, 2, -2, 'bow', 48],
      ] as const
    ).map(([id, sideId, q, r, weaponId, initiative]) => ({
      id: combat.unitId(id),
      sideId,
      position: combat.hex(q, r),
      weaponId,
      attributes: {
        accuracy: 25,
        armor: 24,
        defense: 15,
        health: 70,
        initiative,
        morale: 80,
        stamina: 80,
      },
    })),
  };
  return Object.freeze({
    scenarioId: COMBAT_LAB_SCENARIO,
    controlledSideId: human,
    originalSetup: () => structuredClone(setup),
    start: () => combat.startBattle(setup),
  });
}

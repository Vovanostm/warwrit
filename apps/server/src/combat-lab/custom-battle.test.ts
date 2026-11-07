import * as combat from '@warwrit/game-core';
import { expect, it } from 'vitest';
import type { CombatLabBattleConfig } from '@warwrit/protocol';
import { projectCombatLabView } from './projection.js';
import {
  combatLabCatalog,
  defaultSpriteBattle,
  createCustomBattleFixture,
} from './custom-battle.js';
const skillDuel = (): CombatLabBattleConfig => {
  const template = defaultSpriteBattle();
  return {
    ...template,
    map: {
      ...template.map,
      tiles: template.map.tiles.map((tile) => ({
        ...tile,
        blocked: false,
        height: 0,
        terrain: 'plain',
      })),
    },
    units: [
      {
        id: 'fighter',
        profileId: 'W01',
        sideId: 'human',
        position: { q: 3, r: 5 },
        skillRanks: { 'shield-brace': 2, 'armor-pressure': 1 },
      },
      { id: 'enemy', profileId: 'W02', sideId: 'opponent', position: { q: 4, r: 5 } },
    ],
  };
};

it('detaches the accepted setup from an editable draft', () => {
  const template = defaultSpriteBattle();
  const draft = {
    ...template,
    map: { ...template.map, tiles: template.map.tiles.map((tile) => ({ ...tile })) },
    units: template.units.map((unit) => ({ ...unit, position: { ...unit.position } })),
  };
  const fixture = createCustomBattleFixture('detached', draft);
  const before = fixture.originalSetup();
  draft.map.tiles[0]!.terrain = 'fire';
  draft.units[0]!.position.q = 9;
  expect(fixture.originalSetup()).toEqual(before);
});

it('serves canonical technique metadata and isolated profile defaults without changing battle version', () => {
  const catalog = combatLabCatalog();
  expect(catalog.skills).toEqual(combat.COMBAT_SKILLS);
  expect(catalog.defaultBattle.version).toBe(1);
  expect(catalog.profiles.find(({ id }) => id === 'W10')?.defaultSkillRanks).toEqual({
    'shield-brace': 1,
    rally: 1,
  });
  const profile = catalog.profiles.find(({ id }) => id === 'W10')!;
  expect(profile.defaultSkillRanks).not.toBe(
    catalog.defaultBattle.units.find(({ profileId }) => profileId === 'W10')?.skillRanks,
  );
});

function expectReadOnlySkillReach(replay: combat.VersionedCombatReplay) {
  const saved = JSON.stringify(replay);
  const reconstructed = combat.replayCombat(JSON.parse(saved) as combat.VersionedCombatReplay);
  const before = structuredClone(reconstructed);
  const canonical = combat.canonicalCombatState(reconstructed.state);
  for (let read = 0; read < 2; read++) {
    for (const unit of reconstructed.state.units)
      combat.previewCombatSkillReach(reconstructed.state, unit.id);
    if (combat.isSpritePrototypeRuleset(reconstructed.state.rulesetId)) {
      const state = reconstructed.state;
      const view = projectCombatLabView('replay', state.sides[0].id, state, reconstructed.events);
      const actor = state.units.find((unit) => unit.id === state.activation?.unitId);
      expect(view.skillReach).toEqual(
        actor?.sideId === state.sides[0].id ? combat.previewCombatSkillReach(state, actor.id) : [],
      );
    }
  }
  expect(reconstructed).toEqual(before);
  expect(combat.canonicalCombatState(reconstructed.state)).toBe(canonical);
  expect(JSON.stringify(replay)).toBe(saved);
  expect(combat.replayCombat(JSON.parse(saved) as combat.VersionedCombatReplay)).toEqual(before);
  expect(reconstructed.commandsApplied).toBe(replay.commands.length);
  return reconstructed;
}

it.each(['sprite-prototype-v1', 'sprite-prototype-v2'] as const)(
  'preserves complete saved %s replay results while deriving empty skill geometry',
  (rulesetId) => {
    const base = createCustomBattleFixture('legacy-reach', skillDuel()).originalSetup();
    const setup: combat.BattleSetup = {
      ...base,
      rulesetId,
      units: base.units.map(({ skillRanks: _skills, moralePolicy: _morale, ...unit }) => unit),
    };
    const state = combat.startBattle(setup).state;
    const replay: combat.CombatReplay = {
      schemaVersion: 1,
      setup,
      commands: [
        {
          type: 'wait',
          commandId: combat.commandId('saved-wait'),
          actorId: state.activation!.unitId,
          activationId: state.activation!.id,
        },
      ],
    };
    const reproduced = expectReadOnlySkillReach(replay);
    expect(
      combat.previewCombatSkillReach(reproduced.state, reproduced.state.activation!.unitId),
    ).toEqual([]);
  },
);

it('preserves supported schema2 bridge replay without inventing a sprite schema3', () => {
  const base = createCustomBattleFixture('schema2-reach', skillDuel()).originalSetup();
  const setup: combat.BattleSetupV2 = {
    ...base,
    schemaVersion: 2,
    rulesetId: 'm1-domain-bridge-v2',
    units: base.units.map(
      ({ skillRanks: _skills, moralePolicy: _morale, trainedMelee: _trained, ...unit }) => ({
        ...unit,
        weaponId: 'spear',
        initialPools: {
          health: unit.attributes.health,
          armor: unit.attributes.armor,
          stamina: unit.attributes.stamina,
          morale: unit.attributes.morale,
        },
      }),
    ),
  };
  const state = combat.startBattleV2(setup).state;
  expectReadOnlySkillReach({
    schemaVersion: 2,
    setup,
    commands: [
      {
        type: 'wait',
        commandId: combat.commandId('bridge-wait'),
        actorId: state.activation!.unitId,
        activationId: state.activation!.id,
      },
    ],
  });
});

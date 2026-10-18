import { assert, describe, expect, it } from 'vitest';
import * as combat from '@warwrit/game-core';
import { createCombatLabFixture } from './scenario.js';
import { projectCombatLabView } from './projection.js';
import { createCustomBattleFixture, defaultSpriteBattle, isCustomBattle } from './custom-battle.js';
import type { CombatLabBattleConfig } from '@warwrit/protocol';

describe('projectCombatLabView initiative forecast', () => {
  it('projects the core forecast only while a future round can occur', () => {
    const fixture = createCombatLabFixture('initiative-projection');
    let transition = fixture.start();
    let view = projectCombatLabView(
      'session',
      fixture.controlledSideId,
      transition.state,
      transition.events,
    );
    expect(view.nextRoundInitiative).toEqual(combat.previewCombatInitiative(transition.state));

    const activation = transition.state.activation;
    assert(activation);
    const result = combat.applyCombatCommand(transition.state, {
      type: 'wait',
      commandId: combat.commandId('initiative-projection-wait'),
      actorId: activation.unitId,
      activationId: activation.id,
    });
    assert(result.ok);
    transition = { state: result.state, events: [...transition.events, ...result.events] };
    view = projectCombatLabView(
      'session',
      fixture.controlledSideId,
      transition.state,
      transition.events,
    );
    expect(view.nextRoundInitiative).toEqual(combat.previewCombatInitiative(transition.state));

    const battle = combat.runAiBattle(fixture.originalSetup());
    const resolved = projectCombatLabView(
      'session',
      fixture.controlledSideId,
      battle.state,
      battle.events,
    );
    expect(resolved.status).toBe('resolved');
    expect(resolved).not.toHaveProperty('nextRoundInitiative');
  });
});

it('partitions every living mill opponent without mutating state or journal', async () => {
  const { defaultSpriteBattle, createCustomBattleFixture } = await import('./custom-battle.js');
  const battle = defaultSpriteBattle();
  const fixture = createCustomBattleFixture('refusals', battle);
  const { state, events } = fixture.start();
  const before = structuredClone({ state, events });
  const view = projectCombatLabView('session', fixture.controlledSideId, state, events, battle);
  const opponents = view.units
    .filter((unit) => unit.status === 'active' && unit.sideId !== view.controlledSideId)
    .map((unit) => unit.id)
    .sort();
  const partition = [...(view.attackPreview ?? []), ...(view.attackRefusals ?? [])]
    .map((row) => row.targetId)
    .sort();
  expect(partition).toEqual(opponents);
  expect(view.attackRefusals).toBeDefined();
  expect(projectCombatLabView('session', fixture.controlledSideId, state, events, battle)).toEqual(
    view,
  );
  expect({ state, events }).toEqual(before);
});

function duel(profileId = 'W01', targetPosition = { q: 4, r: 5 }) {
  const template = defaultSpriteBattle();
  const battle: CombatLabBattleConfig = {
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
      { id: 'actor', profileId, sideId: 'human', position: { q: 3, r: 5 } },
      { id: 'target', profileId: 'B053', sideId: 'opponent', position: targetPosition },
    ],
  };
  expect(isCustomBattle(battle)).toBe(true);
  const fixture = createCustomBattleFixture('projection-duel', battle);
  let { state, events } = fixture.start();
  while (state.activation?.unitId !== 'actor') {
    assert(state.activation);
    const result = combat.applyCombatCommand(state, {
      type: 'wait',
      commandId: combat.commandId(`wait-${state.revision}`),
      actorId: state.activation.unitId,
      activationId: state.activation.id,
    });
    assert(result.ok);
    state = result.state;
    events = [...events, ...result.events];
  }
  return { state, events, battle };
}

function projectDuel(fixture: ReturnType<typeof duel>, state = fixture.state) {
  return projectCombatLabView('session', 'human', state, fixture.events, fixture.battle);
}

it('matches command refusal precedence and exposes only controlled resource diagnostics', () => {
  const fixture = duel();
  const actor = fixture.state.units.find((unit) => unit.id === 'actor')!;
  for (const [ap, stamina, expected] of [
    [2, 0, 'insufficient-action-points'],
    [4, 0, 'insufficient-stamina'],
  ] as const) {
    const state = {
      ...fixture.state,
      activation: { ...fixture.state.activation!, remainingActionPoints: ap },
      units: fixture.state.units.map((unit) =>
        unit.id === actor.id ? { ...unit, stamina } : { ...unit, stamina: 73 },
      ),
    };
    const view = projectDuel(fixture, state);
    const weapon = combat.weaponProfile(combat.combatRules(state.rulesetId), actor.weaponId);
    expect(view.attackRefusals).toEqual([
      {
        targetId: 'target',
        code: expected,
        required: { actionPoints: weapon.actionPointCost, stamina: weapon.staminaCost },
        available: { actionPoints: ap, stamina },
      },
    ]);
    const before = structuredClone(state);
    const result = combat.applyCombatCommand(state, {
      type: 'attack',
      commandId: combat.commandId('reject'),
      actorId: actor.id,
      activationId: state.activation!.id,
      targetId: combat.unitId('target'),
    });
    assert(!result.ok);
    expect(result.error.code).toBe(
      ap === 2 ? 'INSUFFICIENT_ACTION_POINTS' : 'INSUFFICIENT_STAMINA',
    );
    expect(result.state).toEqual(before);
  }
  const far = duel('W01', { q: 8, r: 5 });
  const empty = {
    ...far.state,
    activation: { ...far.state.activation!, remainingActionPoints: 0 },
  };
  expect(projectDuel(far, empty).attackRefusals).toEqual([
    { targetId: 'target', code: 'out-of-range', distance: 5, minimumRange: 1, maximumRange: 1 },
  ]);
});

it('keeps LOS refusals free of blocker information and ahead of resources', () => {
  const fixture = duel('W08', { q: 6, r: 5 });
  const state = {
    ...fixture.state,
    map: { ...fixture.state.map, blocked: [{ q: 4, r: 5 }] },
    activation: { ...fixture.state.activation!, remainingActionPoints: 0 },
  };
  expect(projectDuel(fixture, state).attackRefusals).toEqual([
    { targetId: 'target', code: 'no-line-of-sight' },
  ]);
  expect(combat.queryCombatWeaponAttack(state, combat.unitId('target'))?.code).toBe(
    'BLOCKED_LINE_OF_SIGHT',
  );
});

it('covers admitted controlled B053, panic, opponent and terminal partitions', () => {
  const fixture = duel('B053');
  const view = projectDuel(fixture);
  expect(view.attackRefusals).toEqual([{ targetId: 'target', code: 'threat-not-available' }]);
  const poor = {
    ...fixture.state,
    activation: { ...fixture.state.activation!, remainingActionPoints: 0 },
    units: fixture.state.units.map((unit) => ({ ...unit, stamina: 0 })),
  };
  expect(projectDuel(fixture, poor).attackRefusals).toEqual(view.attackRefusals);
  const rejected = combat.applyCombatCommand(fixture.state, {
    type: 'attack',
    commandId: combat.commandId('b053-attack'),
    actorId: combat.unitId('actor'),
    activationId: fixture.state.activation!.id,
    targetId: combat.unitId('target'),
  });
  assert(!rejected.ok);
  expect(rejected.error.code).toBe('THREAT_NOT_AVAILABLE');
  expect(rejected.state).toBe(fixture.state);
  const human = duel();
  const panicked = {
    ...human.state,
    units: human.state.units.map((unit) =>
      unit.id === 'actor' ? { ...unit, morale: 0, moralePolicy: 'human' as const } : unit,
    ),
  };
  expect(projectDuel(human, panicked).attackRefusals).toEqual([
    { targetId: 'target', code: 'panicking' },
  ]);
  const opponent = {
    ...human.state,
    activation: { ...human.state.activation!, unitId: combat.unitId('target') },
  };
  expect(projectDuel(human, opponent).attackRefusals).toEqual([
    { targetId: 'target', code: 'not-actor-turn' },
  ]);
  expect(projectDuel(human, opponent).attackPreview).toEqual([]);
  const terminal = { ...human.state, status: 'resolved' as const, activation: null };
  expect(projectDuel(human, terminal).attackRefusals).toEqual([
    { targetId: 'target', code: 'battle-resolved' },
  ]);
  const noEnemies = {
    ...terminal,
    units: terminal.units.map((unit) =>
      unit.sideId !== 'human' ? { ...unit, status: 'dead' as const } : unit,
    ),
  };
  expect(projectDuel(human, noEnemies).attackRefusals).toEqual([]);
});

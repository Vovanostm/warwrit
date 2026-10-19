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

it('quotes ordinary attack affordability on every movement destination', () => {
  for (const profile of ['W01', 'W08']) {
    const fixture = duel(profile, { q: 8, r: 5 });
    const before = structuredClone(fixture);
    const movements = projectDuel(fixture).movementPreview!;
    expect(movements.map(({ attackAffordableAfter: _, ...row }) => row)).toEqual(
      combat.previewCombatMovement(fixture.state),
    );
    expect(fixture).toEqual(before);
    expect(movements.length).toBeGreaterThan(0);
    for (const movement of movements) {
      expect(movement.attackAffordableAfter).toBe(
        profile === 'W01' && movement.actionPointCost === 1,
      );
    }
  }
});

it('quotes fatigue and stamina boundaries against actual move then attack admission', () => {
  const fixture = duel('W01', { q: 5, r: 5 });
  for (const stamina of [100, 27, 16, 15]) {
    const state = {
      ...fixture.state,
      units: fixture.state.units.map((unit) => (unit.id === 'actor' ? { ...unit, stamina } : unit)),
    };
    const before = structuredClone(state);
    const quote = projectDuel(fixture, state).movementPreview!.find(
      (row) => row.to.q === 4 && row.to.r === 5,
    )!;
    expect(quote).toBeDefined();
    expect(quote.attackAffordableAfter).toBe(stamina >= 16);
    const move = combat.applyCombatCommand(state, {
      type: 'move',
      commandId: combat.commandId(`move-${stamina}`),
      actorId: combat.unitId('actor'),
      activationId: state.activation!.id,
      to: quote.to,
    });
    assert(move.ok);
    const result = combat.applyCombatCommand(move.state, {
      type: 'attack',
      commandId: combat.commandId(`attack-${stamina}`),
      actorId: combat.unitId('actor'),
      activationId: move.state.activation!.id,
      targetId: combat.unitId('target'),
    });
    expect(result.ok).toBe(quote.attackAffordableAfter);
    expect(state).toEqual(before);
    expect(move.state.units.find((unit) => unit.id === 'actor')!.stamina).toBe(stamina - 4);
    const afterMove = projectCombatLabView(
      'session',
      'human',
      move.state,
      [...fixture.events, ...move.events],
      fixture.battle,
    );
    expect(afterMove.viewRevision).toBe(move.state.revision);
    expect(afterMove.movementPreview!.length).toBeGreaterThan(0);
    expect(afterMove.movementPreview!.every((row) => row.attackAffordableAfter === false)).toBe(
      true,
    );
  }
});

it('does not invent post-move ordinary attack capability for panic or B053', () => {
  const fixture = duel('B053');
  const movements = projectDuel(fixture).movementPreview!;
  expect(movements.length).toBeGreaterThan(0);
  expect(movements.every((row) => row.attackAffordableAfter === false)).toBe(true);
  const human = duel();
  const state = {
    ...human.state,
    units: human.state.units.map((unit) =>
      unit.id === 'actor' ? { ...unit, morale: 0, moralePolicy: 'human' as const } : unit,
    ),
  };
  expect(
    projectDuel(human, state).movementPreview!.every((row) => row.attackAffordableAfter === false),
  ).toBe(true);
  const opponent = {
    ...human.state,
    activation: { ...human.state.activation!, unitId: combat.unitId('target') },
  };
  expect(projectDuel(human, opponent).movementPreview).toEqual([]);
  expect(
    projectDuel(human, { ...human.state, status: 'resolved', activation: null }),
  ).not.toHaveProperty('movementPreview');
  for (const type of ['move', 'attack'] as const) {
    const rejected = combat.applyCombatCommand(state, {
      type,
      commandId: combat.commandId(`panic-${type}`),
      actorId: combat.unitId('actor'),
      activationId: state.activation!.id,
      to: { q: 3, r: 4 },
      targetId: combat.unitId('target'),
    });
    assert(!rejected.ok);
    expect(rejected.error.code).toBe('PANICKED');
    expect(rejected.state).toBe(state);
  }
});

it('preserves ordinary attacks for untrained actors after a hazard-free move', () => {
  const fixture = duel('W01', { q: 5, r: 5 });
  const state = {
    ...fixture.state,
    units: fixture.state.units.map((unit) =>
      unit.id === 'actor' ? { ...unit, trainedMelee: false } : unit,
    ),
  };
  const quote = projectDuel(fixture, state).movementPreview!.find(
    ({ to }) => to.q === 4 && to.r === 5,
  )!;
  expect(quote.attackAffordableAfter).toBe(true);
  const move = combat.applyCombatCommand(state, {
    type: 'move',
    commandId: combat.commandId('untrained-move'),
    actorId: combat.unitId('actor'),
    activationId: state.activation!.id,
    to: quote.to,
  });
  assert(move.ok);
  const attack = combat.applyCombatCommand(move.state, {
    type: 'attack',
    commandId: combat.commandId('untrained-attack'),
    actorId: combat.unitId('actor'),
    activationId: move.state.activation!.id,
    targetId: combat.unitId('target'),
  });
  expect(attack.ok).toBe(true);
});

it('never restores insufficient resources and refreshes exhausted movement activation', () => {
  const fixture = duel('W01', { q: 8, r: 5 });
  for (const [ap, stamina] of [
    [2, 100],
    [4, 11],
  ]) {
    const state = {
      ...fixture.state,
      activation: { ...fixture.state.activation!, remainingActionPoints: ap! },
      units: fixture.state.units.map((unit) =>
        unit.id === 'actor' ? { ...unit, stamina: stamina! } : unit,
      ),
    };
    const movements = projectDuel(fixture, state).movementPreview!;
    expect(movements.length).toBeGreaterThan(0);
    expect(movements.every((row) => row.attackAffordableAfter === false)).toBe(true);
  }
  const quote = projectDuel(fixture).movementPreview!.find((row) => row.actionPointCost === 4)!;
  expect(quote).toBeDefined();
  const move = combat.applyCombatCommand(fixture.state, {
    type: 'move',
    commandId: combat.commandId('exhaust-move'),
    actorId: combat.unitId('actor'),
    activationId: fixture.state.activation!.id,
    to: quote.to,
  });
  assert(move.ok);
  expect(move.state.activation!.remainingActionPoints).toBe(0);
  const view = projectCombatLabView(
    'session',
    'human',
    move.state,
    [...fixture.events, ...move.events],
    fixture.battle,
  );
  expect(view.movementPreview).toEqual([]);
});

function expectSkillReach(fixture: ReturnType<typeof duel>) {
  const { state, events, battle } = fixture;
  const before = structuredClone(fixture);
  const view = projectDuel(fixture);
  expect(view.skillReach).toEqual(combat.previewCombatSkillReach(state, state.activation!.unitId));
  expect(view.skillReach!.length).toBeGreaterThan(0);
  for (const row of view.skillReach!) {
    expect(Object.keys(row).sort()).toEqual(
      [
        'actorId',
        'activationId',
        'revision',
        'skillId',
        'minimumRange',
        'maximumRange',
        'cells',
      ].sort(),
    );
    expect(row).toMatchObject({
      actorId: view.activation!.actorId,
      activationId: view.activation!.id,
      revision: view.viewRevision,
    });
    for (const cell of row.cells) expect(Object.keys(cell).sort()).toEqual(['q', 'r']);
  }
  expect(projectCombatLabView('session', 'opponent', state, events, battle).skillReach).toEqual([]);
  expect(projectDuel(fixture)).toEqual(view);
  const cell = view.skillReach!.flatMap((row) => row.cells)[0];
  if (cell) (cell as { q: number }).q = 999;
  expect(fixture).toEqual(before);
  expect(projectDuel(fixture).skillReach).toEqual(
    combat.previewCombatSkillReach(state, state.activation!.unitId),
  );
}
it('projects all current learned skills and refreshes origin/revision after accepted movement and actor changes', () => {
  const fixture = duel('W08', { q: 8, r: 5 });
  expectSkillReach(fixture);
  const move = combat.applyCombatCommand(fixture.state, {
    type: 'move',
    commandId: combat.commandId('reach-move'),
    actorId: fixture.state.activation!.unitId,
    activationId: fixture.state.activation!.id,
    to: { q: 3, r: 4 },
  });
  assert(move.ok);
  const moved = { ...fixture, state: move.state, events: [...fixture.events, ...move.events] };
  expectSkillReach(moved);
  expect(projectDuel(moved).skillReach).not.toEqual(projectDuel(fixture).skillReach);
  const wait = combat.applyCombatCommand(move.state, {
    type: 'wait',
    commandId: combat.commandId('reach-wait'),
    actorId: move.state.activation!.unitId,
    activationId: move.state.activation!.id,
  });
  assert(wait.ok);
  expect(
    projectDuel({ ...moved, state: wait.state, events: [...moved.events, ...wait.events] })
      .skillReach,
  ).toEqual([]);
});
it('emits empty sprite reach for legacy, terminal, missing and inactive actors and preserves explicit empty capability cells', () => {
  const fixture = duel('W08', { q: 8, r: 5 });
  for (const patch of [
    { activation: null },
    { status: 'resolved' as const, activation: null },
    { activation: { ...fixture.state.activation!, unitId: combat.unitId('missing') } },
    { units: fixture.state.units.map((unit) => ({ ...unit, status: 'dead' as const })) },
    { units: fixture.state.units.map(({ skillRanks: _ranks, ...unit }) => unit) },
    { rulesetId: 'sprite-prototype-v1' as const },
    { rulesetId: 'sprite-prototype-v2' as const },
  ])
    expect(projectDuel(fixture, { ...fixture.state, ...patch }).skillReach).toEqual([]);
  const incapable = {
    ...fixture.state,
    units: fixture.state.units.map((unit) => ({ ...unit, threatProfile: 'mill-slam' as const })),
  };
  expect(projectDuel(fixture, incapable).skillReach).toEqual(
    combat.previewCombatSkillReach(incapable, incapable.activation!.unitId),
  );
  expect(projectDuel(fixture, incapable).skillReach!.every((row) => row.cells.length === 0)).toBe(
    true,
  );
  const historic = createCombatLabFixture('reach-m0');
  const start = historic.start();
  expect(
    projectCombatLabView('session', historic.controlledSideId, start.state, start.events)
      .skillReach,
  ).toBeUndefined();
});

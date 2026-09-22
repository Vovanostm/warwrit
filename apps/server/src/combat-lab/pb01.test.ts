import { assert, expect, it } from 'vitest';
import * as combat from '@warwrit/game-core';
import { COMBAT_LAB_EVENT_LIMIT } from '@warwrit/protocol';
import { createCombatLabFixture } from './scenario.js';
import { projectCombatLabView } from './projection.js';

const forbidden =
  /seed|random|processedCommandIds|capabilit|privateCompany|hiddenFate|relations|secret|hitChance|"roll"/;
const fixture = createCombatLabFixture('pb01-proof');
const viewOf = (transition: ReturnType<typeof fixture.start>) =>
  projectCombatLabView('session', fixture.controlledSideId, transition.state, transition.events);

it('resolves the real fixture deterministically with truthful detached projections', () => {
  const setup = fixture.originalSetup();
  expect(
    setup.sides.map((side) => setup.units.filter((unit) => unit.sideId === side.id).length),
  ).toEqual([3, 3]);
  for (const unit of setup.units) {
    const edge = setup.sides.find((side) => side.id === unit.sideId)?.retreatHexes[0];
    assert(edge);
    expect(combat.findPath(setup.map, unit.position, edge)).toBeDefined();
  }
  const battle = combat.runAiBattle(setup);
  combat.assertBattleState(battle.state);
  expect(battle.state.status).toBe('resolved');
  expect(combat.verifyCombatReplay(battle.replay, battle.state).matches).toBe(true);
  const attacks = battle.commands.filter((command) => command.type === 'attack');
  const weapons = attacks.map(
    (command) => setup.units.find((unit) => unit.id === command.actorId)?.weaponId,
  );
  expect(weapons).toContain('bow');
  expect(weapons.some((weapon) => weapon !== 'bow')).toBe(true);
  let state = fixture.start().state;
  const actorId = state.activation!.unitId;
  for (const intent of [
    { type: 'move', to: setup.sides[0].retreatHexes[0]! },
    { type: 'retreat' },
  ] as const) {
    const result = combat.applyCombatCommand(state, {
      ...intent,
      actorId,
      activationId: state.activation!.id,
      commandId: combat.commandId(intent.type),
    });
    assert(result.ok);
    state = result.state;
  }
  expect(state.units.find((unit) => unit.id === actorId)?.status).toBe('retreated');
  let transition = fixture.start();
  let previous = viewOf(transition);
  const rules = combat.combatRules(transition.state.rulesetId);
  for (const expected of battle.commands) {
    const command = combat.chooseAiCommand(transition.state);
    expect(command).toEqual(expected);
    const result = combat.applyCombatCommand(transition.state, command);
    assert(result.ok);
    transition = { state: result.state, events: [...transition.events, ...result.events] };
    const view = viewOf(transition);
    expect(JSON.stringify(view)).not.toMatch(forbidden);
    expect(view.events.map(({ type }) => type)).toEqual(
      transition.events.slice(-COMBAT_LAB_EVENT_LIMIT).map(({ type }) => type),
    );
    expect(view.viewRevision).toBe(result.state.revision);
    expect(view.activation?.actionPoints.current ?? null).toBe(
      result.state.activation?.remainingActionPoints ?? null,
    );
    for (const [index, unit] of result.state.units.entries()) {
      for (const key of ['health', 'armor', 'stamina', 'morale'] as const) {
        expect(view.units[index]?.pools[key]).toEqual({
          current: unit[key],
          maximum: key === 'morale' ? rules.morale.maximum : unit.attributes[key],
        });
      }
    }
    for (const event of view.events) {
      const prior = previous.events.find(({ id }) => id === event.id);
      if (prior) expect(event).toEqual(prior);
      const sameRevision = transition.events.filter(({ revision }) => revision === event.revision);
      expect(sameRevision[event.ordinal]?.type).toBe(event.type);
      expect(event.id).toBe(JSON.stringify([result.state.battleId, event.revision, event.ordinal]));
    }
    expect(view.events.length + view.omittedEventPrefix).toBe(transition.events.length);
    expect(view.events.length).toBeLessThanOrEqual(COMBAT_LAB_EVENT_LIMIT);
    previous = view;
  }
  expect(transition.state).toEqual(battle.state);
  expect(previous.omittedEventPrefix).toBeGreaterThan(0);
  expect(previous.outcome).toEqual({
    reason: transition.state.outcome?.reason,
    winnerSideId: transition.state.outcome?.winnerSideId ?? null,
  });
});

it('retains original setup and detaches allowlisted views without canonical/private fields', () => {
  const original = fixture.originalSetup();
  const copy = fixture.originalSetup();
  Object.assign(copy.units[0]!.attributes, { health: 999 });
  Object.assign(copy.map.hexes[0]!, { q: 999 });
  Object.assign(copy, { seed: 999 });
  expect(fixture.originalSetup()).toEqual(original);
  const transition = fixture.start();
  const unit = transition.state.units[0]!;
  const tile = transition.state.map.hexes[0]!;
  const privateFields = {
    capabilities: 'secret',
    privateCompany: 'secret',
    hiddenFate: 'secret',
    relations: 'secret',
  };
  for (const input of [transition.state, unit, unit.position, tile, transition.events[0]!]) {
    Object.assign(input, privateFields);
  }
  const view = viewOf(transition);
  const serialized = JSON.stringify(view);
  expect(serialized).not.toMatch(forbidden);
  Object.assign(unit.position, { q: 99 });
  Object.assign(tile, { r: 99 });
  expect(JSON.stringify(view)).toBe(serialized);
  Object.assign(view.units[0]!.position, { q: 88 });
  expect(unit.position.q).toBe(99);
  expect(fixture.originalSetup()).toEqual(original);
});

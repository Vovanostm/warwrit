import { assert, describe, expect, it } from 'vitest';
import {
  applyCombatCommand,
  battleId,
  COMBAT_V2_SCHEMA_VERSION,
  commandId,
  createHexagon,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  previewCombatInitiative,
  sideId,
  startBattleV2,
  unitId,
  type BattleSetupV2,
  type BattleState,
} from '../index.js';

function setup(): BattleSetupV2 {
  const hexes = createHexagon(2);
  return {
    schemaVersion: COMBAT_V2_SCHEMA_VERSION,
    battleId: battleId('initiative-preview'),
    rulesetId: M1_DOMAIN_BRIDGE_V2_RULESET_ID,
    seed: 23,
    map: { hexes, blocked: [] },
    sides: [
      { id: sideId('alpha'), retreatHexes: hexes.filter(({ q }) => q === -2) },
      { id: sideId('beta'), retreatHexes: hexes.filter(({ q }) => q === 2) },
    ],
    units: [
      {
        id: unitId('alpha-1'),
        sideId: sideId('alpha'),
        position: { q: 0, r: 0 },
        weaponId: 'sword-shield',
        attributes: {
          health: 80,
          armor: 30,
          stamina: 80,
          initiative: 110,
          accuracy: 20,
          defense: 10,
          morale: 70,
        },
        initialPools: { health: 80, armor: 30, stamina: 80, morale: 70 },
      },
      {
        id: unitId('beta-1'),
        sideId: sideId('beta'),
        position: { q: 1, r: 0 },
        weaponId: 'raider',
        attributes: {
          health: 90,
          armor: 35,
          stamina: 90,
          initiative: 100,
          accuracy: 18,
          defense: 8,
          morale: 75,
        },
        initialPools: { health: 90, armor: 35, stamina: 90, morale: 75 },
      },
    ],
  };
}

function wait(state: BattleState): BattleState {
  const activation = state.activation;
  assert(activation);
  const result = applyCombatCommand(state, {
    type: 'wait',
    commandId: commandId(`wait-${state.revision}`),
    actorId: activation.unitId,
    activationId: activation.id,
  });
  assert(result.ok);
  return result.state;
}

describe('previewCombatInitiative', () => {
  it('matches the real next-round order after the final lawful activation', () => {
    let state = startBattleV2(setup()).state;
    state = wait(state);
    expect(state.round).toBe(1);
    const forecast = previewCombatInitiative(state);
    expect(forecast?.round).toBe(2);

    state = wait(state);
    expect(state.round).toBe(2);
    expect(state.initiativeOrder).toEqual(forecast?.unitIds);
  });

  it('recomputes command-produced fatigue while preserving canonical ties', () => {
    const tied = setup();
    const tiedSetup = {
      ...tied,
      units: tied.units.map((unit) => ({
        ...unit,
        attributes: { ...unit.attributes, initiative: 100 },
      })),
    };
    let state = startBattleV2(tiedSetup).state;
    const actor = state.activation;
    assert(actor);
    const initialStamina = state.units.find(({ id }) => id === actor.unitId)!.stamina;
    const baseline = previewCombatInitiative(state);
    expect(baseline?.unitIds).toEqual([unitId('alpha-1'), unitId('beta-1')]);
    const defended = applyCombatCommand(state, {
      type: 'defend',
      commandId: commandId('defend-first'),
      actorId: actor.unitId,
      activationId: actor.id,
    });
    assert(defended.ok);
    state = defended.state;
    expect(state.units.find(({ id }) => id === actor.unitId)?.stamina).toBeLessThan(initialStamina);
    expect(previewCombatInitiative(state)?.unitIds).toEqual([unitId('beta-1'), unitId('alpha-1')]);
  });

  it('uses a command-produced wound in the forecast', () => {
    const base = setup();
    const woundedSetup = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === unitId('alpha-1')
          ? {
              ...unit,
              weaponId: 'great-weapon' as const,
              attributes: { ...unit.attributes, initiative: 105, accuracy: 100 },
            }
          : {
              ...unit,
              attributes: { ...unit.attributes, armor: 0, initiative: 108 },
              initialPools: { ...unit.initialPools, armor: 0, stamina: 50 },
            },
      ),
    };
    let state = startBattleV2(woundedSetup).state;
    const activation = state.activation;
    assert(activation);
    expect(activation.unitId).toBe(unitId('alpha-1'));
    const attack = applyCombatCommand(state, {
      type: 'attack',
      commandId: commandId('wound-target'),
      actorId: activation.unitId,
      activationId: activation.id,
      targetId: unitId('beta-1'),
    });
    assert(attack.ok);
    state = attack.state;

    expect(state.units.find(({ id }) => id === unitId('beta-1'))?.wounds.length).toBeGreaterThan(0);
    expect(previewCombatInitiative(state)?.unitIds).toEqual([unitId('alpha-1'), unitId('beta-1')]);
  });

  it('excludes a retreated unit while both sides remain active', () => {
    const base = setup();
    const withReserve = {
      ...base,
      units: [
        { ...base.units[0]!, position: { q: -2, r: 0 } },
        { ...base.units[0]!, id: unitId('alpha-2'), position: { q: -1, r: 1 } },
        base.units[1]!,
      ],
    };
    let state = startBattleV2(withReserve).state;
    const activation = state.activation;
    assert(activation);
    expect(activation.unitId).toBe(unitId('alpha-1'));
    const retreat = applyCombatCommand(state, {
      type: 'retreat',
      commandId: commandId('retreat-one'),
      actorId: activation.unitId,
      activationId: activation.id,
    });
    assert(retreat.ok);
    state = retreat.state;
    expect(state.status).toBe('active');
    expect(previewCombatInitiative(state)?.unitIds).not.toContain(unitId('alpha-1'));
  });

  it('omits forecasts at a terminal and maximum-round boundary', () => {
    const retreatSetup = setup();
    const atEdge = {
      ...retreatSetup,
      units: retreatSetup.units.map((unit) =>
        unit.id === unitId('alpha-1') ? { ...unit, position: { q: -2, r: 0 } } : unit,
      ),
    };
    const terminal = startBattleV2(atEdge).state;
    const actor = terminal.activation;
    assert(actor);
    const retreat = applyCombatCommand(terminal, {
      type: 'retreat',
      commandId: commandId('retreat-at-edge'),
      actorId: actor.unitId,
      activationId: actor.id,
    });
    assert(retreat.ok);
    expect(retreat.state.status).toBe('resolved');
    expect(previewCombatInitiative(retreat.state)).toBeUndefined();

    let atLimit = startBattleV2(setup()).state;
    while (atLimit.round < 60) atLimit = wait(atLimit);
    expect(atLimit.status).toBe('active');
    expect(previewCombatInitiative(atLimit)).toBeUndefined();
  });
});

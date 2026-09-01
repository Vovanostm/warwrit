import { describe, expect, it } from 'vitest';

import {
  applyCombatCommand,
  battleId,
  canonicalCombatState,
  commandId,
  COMBAT_RULES_V1,
  createHexagon,
  replayCombat,
  runAiBattle,
  sideId,
  startBattle,
  unitId,
  verifyCombatReplay,
  type BattleSetup,
  type AttackCommand,
  type CombatCommand,
  type CombatReplay,
  type DefendCommand,
  type MoveCommand,
  type RetreatCommand,
  type WaitCommand,
} from '../index.js';

function setup(seed = 42): BattleSetup {
  const hexes = createHexagon(3);
  const alpha = sideId('alpha');
  const beta = sideId('beta');
  return {
    schemaVersion: 1,
    battleId: battleId(`fixture-${seed}`),
    rulesetId: COMBAT_RULES_V1.id,
    seed,
    map: { hexes, blocked: [] },
    sides: [
      { id: alpha, retreatHexes: hexes.filter(({ q }) => q === -3) },
      { id: beta, retreatHexes: hexes.filter(({ q }) => q === 3) },
    ],
    units: [
      {
        id: unitId('alpha-1'),
        sideId: alpha,
        position: { q: -1, r: 0 },
        weaponId: 'sword-shield',
        attributes: {
          health: 80,
          armor: 30,
          stamina: 80,
          initiative: 100,
          accuracy: 20,
          defense: 10,
          morale: 70,
        },
      },
      {
        id: unitId('beta-1'),
        sideId: beta,
        position: { q: 0, r: 0 },
        weaponId: 'raider',
        attributes: {
          health: 80,
          armor: 30,
          stamina: 80,
          initiative: 90,
          accuracy: 18,
          defense: 10,
          morale: 70,
        },
      },
      {
        id: unitId('alpha-2'),
        sideId: alpha,
        position: { q: -2, r: 1 },
        weaponId: 'spear',
        attributes: {
          health: 85,
          armor: 25,
          stamina: 85,
          initiative: 80,
          accuracy: 16,
          defense: 8,
          morale: 75,
        },
      },
      {
        id: unitId('beta-2'),
        sideId: beta,
        position: { q: 2, r: -1 },
        weaponId: 'great-weapon',
        attributes: {
          health: 90,
          armor: 35,
          stamina: 90,
          initiative: 70,
          accuracy: 14,
          defense: 7,
          morale: 75,
        },
      },
    ],
  };
}

type TestCommandInput =
  | Omit<MoveCommand, 'activationId' | 'actorId' | 'commandId'>
  | Omit<AttackCommand, 'activationId' | 'actorId' | 'commandId'>
  | Omit<DefendCommand, 'activationId' | 'actorId' | 'commandId'>
  | Omit<WaitCommand, 'activationId' | 'actorId' | 'commandId'>
  | Omit<RetreatCommand, 'activationId' | 'actorId' | 'commandId'>;

function commandForCurrent(
  state: ReturnType<typeof startBattle>['state'],
  command: TestCommandInput,
): CombatCommand {
  expect(state.activation).not.toBeNull();
  const activation = state.activation;
  if (activation === null) {
    throw new Error('Expected current activation');
  }
  return {
    ...command,
    actorId: activation.unitId,
    activationId: activation.id,
    commandId: commandId(`test:${activation.id}:${state.revision}:${command.type}`),
  } as CombatCommand;
}

describe('deterministic combat kernel', () => {
  it('fails invalid commands closed without replacing or mutating state', () => {
    const started = startBattle(setup());
    const before = canonicalCombatState(started.state);
    const result = applyCombatCommand(
      started.state,
      commandForCurrent(started.state, { type: 'move', to: { q: 0, r: 0 } }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected occupied move to fail');
    }
    expect(result.error.code).toBe('HEX_OCCUPIED');
    expect(result.state).toBe(started.state);
    expect(canonicalCombatState(started.state)).toBe(before);
  });

  it('uses activation identity to prevent stale or double actions', () => {
    const started = startBattle(setup());
    const oldActivation = started.state.activation;
    expect(oldActivation).not.toBeNull();
    const waited = applyCombatCommand(
      started.state,
      commandForCurrent(started.state, { type: 'wait' }),
    );
    expect(waited.ok).toBe(true);
    if (!waited.ok || oldActivation === null || waited.state.activation === null) {
      throw new Error('Expected battle to advance to another activation');
    }

    const stale = applyCombatCommand(waited.state, {
      type: 'wait',
      actorId: waited.state.activation.unitId,
      activationId: oldActivation.id,
      commandId: commandId('test:stale-activation'),
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) {
      expect(stale.error.code).toBe('STALE_ACTIVATION');
      expect(stale.state).toBe(waited.state);
    }
  });

  it('resolves attacks from explicit RNG state and versioned rules', () => {
    const first = startBattle(setup(1));
    const second = startBattle(setup(1));
    const firstCommand = commandForCurrent(first.state, {
      type: 'attack',
      targetId: unitId('beta-1'),
    });
    const secondCommand: CombatCommand = { ...firstCommand };
    const firstResult = applyCombatCommand(first.state, firstCommand);
    const secondResult = applyCombatCommand(second.state, secondCommand);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    if (!firstResult.ok || !secondResult.ok) {
      throw new Error('Expected deterministic attacks to be accepted');
    }
    expect(firstResult.events).toEqual(secondResult.events);
    expect(canonicalCombatState(firstResult.state)).toBe(canonicalCombatState(secondResult.state));
    expect(firstResult.state.random.draws).toBeGreaterThan(0);
  });

  it('requires physical retreat and keeps rejected retreat fail-closed', () => {
    const started = startBattle(setup());
    const rejected = applyCombatCommand(
      started.state,
      commandForCurrent(started.state, { type: 'retreat' }),
    );

    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error.code).toBe('RETREAT_NOT_AVAILABLE');
      expect(rejected.state).toBe(started.state);
    }

    const retreatSetup = setup();
    const retreatingUnit = retreatSetup.units[0];
    if (retreatingUnit === undefined) {
      throw new Error('Expected retreat fixture unit');
    }
    const retreatStarted = startBattle({
      ...retreatSetup,
      units: [{ ...retreatingUnit, position: { q: -3, r: 0 } }, ...retreatSetup.units.slice(1)],
    });
    const accepted = applyCombatCommand(
      retreatStarted.state,
      commandForCurrent(retreatStarted.state, { type: 'retreat' }),
    );

    expect(accepted.ok).toBe(true);
    if (!accepted.ok) {
      throw new Error('Expected retreat from the side edge to succeed');
    }
    expect(accepted.state.units.find(({ id }) => id === retreatingUnit.id)?.status).toBe(
      'retreated',
    );
  });

  it('replays a serialized AI battle to the exact canonical final state', () => {
    const simulation = runAiBattle(setup(77));
    const replay = JSON.parse(JSON.stringify(simulation.replay)) as CombatReplay;
    const replayed = replayCombat(replay);

    expect(simulation.state.status).toBe('resolved');
    expect(replayed.commandsApplied).toBe(simulation.commands.length);
    expect(canonicalCombatState(replayed.state)).toBe(canonicalCombatState(simulation.state));
    expect(verifyCombatReplay(replay, simulation.state).matches).toBe(true);
  });

  it('keeps a terminal battle immutable', () => {
    const simulation = runAiBattle(setup(91));
    const result = applyCombatCommand(simulation.state, {
      type: 'wait',
      actorId: unitId('alpha-1'),
      activationId: 'terminal',
      commandId: commandId('test:terminal'),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('BATTLE_TERMINAL');
      expect(result.state).toBe(simulation.state);
    }
  });
});

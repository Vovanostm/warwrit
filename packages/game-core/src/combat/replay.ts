import { invariant } from '../primitives.js';
import { applyCombatCommand, assertBattleState, startBattle } from './engine.js';
import { compareHex } from './hex.js';
import { COMBAT_SCHEMA_VERSION } from './types.js';
import type {
  BattleState,
  CombatEvent,
  CombatReplay,
  CombatUnitState,
  ReplayResult,
} from './types.js';

function canonicalUnit(unit: CombatUnitState) {
  return {
    id: unit.id,
    sideId: unit.sideId,
    position: unit.position,
    weaponId: unit.weaponId,
    attributes: unit.attributes,
    health: unit.health,
    armor: unit.armor,
    stamina: unit.stamina,
    morale: unit.morale,
    guarding: unit.guarding,
    status: unit.status,
    wounds: unit.wounds,
  };
}

export function canonicalCombatState(state: BattleState): string {
  return JSON.stringify({
    schemaVersion: state.schemaVersion,
    battleId: state.battleId,
    rulesetId: state.rulesetId,
    seed: state.seed,
    map: {
      hexes: state.map.hexes.toSorted(compareHex),
      blocked: state.map.blocked.toSorted(compareHex),
    },
    sides: state.sides.map((side) => ({
      id: side.id,
      retreatHexes: side.retreatHexes.toSorted(compareHex),
    })),
    units: state.units
      .toSorted((left, right) => left.id.localeCompare(right.id))
      .map(canonicalUnit),
    random: state.random,
    round: state.round,
    initiativeOrder: state.initiativeOrder,
    turnIndex: state.turnIndex,
    activation: state.activation,
    revision: state.revision,
    processedCommandIds: state.processedCommandIds,
    status: state.status,
    outcome: state.outcome,
  });
}

export function replayCombat(replay: CombatReplay): ReplayResult {
  invariant(
    replay.schemaVersion === COMBAT_SCHEMA_VERSION,
    `Combat replay schemaVersion must be ${COMBAT_SCHEMA_VERSION}`,
  );
  const started = startBattle(replay.setup);
  let state = started.state;
  const events: CombatEvent[] = [...started.events];
  let commandsApplied = 0;

  for (const command of replay.commands) {
    const result = applyCombatCommand(state, command);
    invariant(
      result.ok,
      `Replay command ${command.commandId} failed: ${result.ok ? '' : result.error.code}`,
    );
    state = result.state;
    events.push(...result.events);
    commandsApplied += 1;
  }

  assertBattleState(state);
  return { state, events, commandsApplied };
}

export function verifyCombatReplay(
  replay: CombatReplay,
  expectedState: BattleState,
): { readonly matches: boolean; readonly actualState: BattleState } {
  const actual = replayCombat(replay).state;
  return {
    matches: canonicalCombatState(actual) === canonicalCombatState(expectedState),
    actualState: actual,
  };
}

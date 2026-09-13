import { invariant } from '../primitives.js';
import { applyCombatCommand, assertBattleState, startBattle } from './engine.js';
import { compareHex } from './hex.js';
import { startBattleV2 } from './runtime-v2.js';
import { COMBAT_V2_SCHEMA_VERSION, type BattleSetupV2 } from './setup-v2.js';
import { COMBAT_SCHEMA_VERSION } from './types.js';
import type {
  BattleState,
  CombatCommand,
  CombatEvent,
  CombatReplay,
  CombatTransition,
  CombatUnitState,
  ReplayResult,
} from './types.js';

export interface CombatReplayV2 {
  readonly schemaVersion: typeof COMBAT_V2_SCHEMA_VERSION;
  readonly setup: BattleSetupV2;
  readonly commands: readonly CombatCommand[];
}

export type VersionedCombatReplay = CombatReplay | CombatReplayV2;

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

function startReplay(replay: VersionedCombatReplay): CombatTransition {
  if (replay.schemaVersion === COMBAT_SCHEMA_VERSION) {
    return startBattle(replay.setup);
  }
  if (replay.schemaVersion === COMBAT_V2_SCHEMA_VERSION) {
    return startBattleV2(replay.setup);
  }
  const version = (replay as { readonly schemaVersion: unknown }).schemaVersion;
  invariant(false, `Unsupported combat replay schemaVersion: ${String(version)}`);
}

export function replayCombat(replay: VersionedCombatReplay): ReplayResult {
  const started = startReplay(replay);
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
  replay: VersionedCombatReplay,
  expectedState: BattleState,
): { readonly matches: boolean; readonly actualState: BattleState } {
  const actual = replayCombat(replay).state;
  return {
    matches: canonicalCombatState(actual) === canonicalCombatState(expectedState),
    actualState: actual,
  };
}

import { invariant } from '../primitives.js';
import { applyCombatCommand } from './engine.js';
import { combatRules } from './rules.js';
import { chooseTacticalCombatCommand } from './tactical-ai.js';
import type { BattleState, CombatCommand, CombatEvent } from './types.js';

export interface CombatAutoplayResult {
  readonly state: BattleState;
  readonly commands: readonly CombatCommand[];
  readonly events: readonly CombatEvent[];
  readonly stoppedBecause: 'command' | 'activation' | 'resolved' | 'command-limit';
}

/** Pure automation of canonical commands; it neither creates authority nor substitutes a simulator. */
export function advanceCombatAutoplay(
  initial: BattleState,
  until: 'command' | 'activation' | 'resolved' = 'command',
): CombatAutoplayResult {
  let state = initial;
  const commands: CombatCommand[] = [];
  const events: CombatEvent[] = [];
  const activationId = initial.activation?.id;
  const remainingCommands =
    combatRules(initial.rulesetId).limits.maximumCommands - initial.processedCommandIds.length;
  while (state.status === 'active' && commands.length < remainingCommands) {
    const command = chooseTacticalCombatCommand(state);
    const applied = applyCombatCommand(state, command);
    invariant(
      applied.ok,
      `Autoplay generated invalid ${command.type}: ${applied.ok ? '' : applied.error.code}`,
    );
    invariant(applied.state.revision > state.revision, 'Autoplay command must advance revision');
    state = applied.state;
    commands.push(command);
    events.push(...applied.events);
    if (state.status === 'resolved') break;
    if (until === 'command') return { state, commands, events, stoppedBecause: 'command' };
    if (until === 'activation' && state.activation?.id !== activationId) {
      return { state, commands, events, stoppedBecause: 'activation' };
    }
  }
  return {
    state,
    commands,
    events,
    stoppedBecause: state.status === 'resolved' ? 'resolved' : 'command-limit',
  };
}

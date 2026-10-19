import * as combat from '@warwrit/game-core';
import type { CombatLabReplayPresentation } from '@warwrit/protocol';
import { projectCombatLabView } from './projection.js';

export type CombatLabReplay = combat.VersionedCombatReplay & {
  readonly labPresentation?: CombatLabReplayPresentation;
};

type ReplaySource = {
  readonly originalSetup: combat.BattleSetup;
  readonly commands: readonly combat.CombatCommand[];
  readonly presentation?: CombatLabReplayPresentation;
};

export function exportCombatLabReplay(session: ReplaySource): CombatLabReplay {
  return {
    schemaVersion: 1,
    setup: session.originalSetup,
    commands: session.commands,
    ...(session.presentation === undefined ? {} : { labPresentation: session.presentation }),
  };
}

function validatePresentation(
  presentation: CombatLabReplayPresentation,
  state: combat.BattleState,
): void {
  combat.invariant(
    presentation !== null && presentation.version === 1,
    'Unknown lab presentation version',
  );
  combat.invariant(
    state.sides.some(({ id }) => id === presentation.controlledSideId),
    'Unknown presentation controlled side',
  );
  combat.invariant(Array.isArray(presentation.units), 'Presentation roster required');
  const remaining = new Set<string>(state.units.map(({ id }) => id));
  for (const unit of presentation.units) {
    combat.invariant(
      unit !== null && typeof unit === 'object' && remaining.delete(unit.id),
      'Unknown or duplicate presentation unit',
    );
    combat.invariant(
      typeof unit.name === 'string' && unit.name.trim().length > 0,
      'Presentation label required',
    );
  }
  combat.invariant(remaining.size === 0, 'Incomplete presentation roster');
}

/** Reconstruct from the downloaded export alone, never from today's catalogue. */
export function projectCombatLabReplay(replay: CombatLabReplay) {
  const reconstructed = combat.replayCombat(replay);
  const presentation = replay.labPresentation;
  if (presentation !== undefined) validatePresentation(presentation, reconstructed.state);
  const sideId = presentation?.controlledSideId ?? reconstructed.state.sides[0].id;
  return projectCombatLabView(
    reconstructed.state.battleId,
    sideId,
    reconstructed.state,
    reconstructed.events,
    presentation?.battle,
    presentation,
  );
}

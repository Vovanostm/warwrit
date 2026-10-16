import type { CombatLabAction, CombatLabView } from '@warwrit/protocol';
import { canControl } from './command-availability.js';

interface AutoplayState {
  readonly enabled: boolean;
  readonly view: CombatLabView | null;
  readonly sessionLost: boolean;
  readonly deleting: boolean;
  readonly pending: { readonly uncertain: boolean } | null;
}

export function autoplayContinuation(
  state: AutoplayState,
): 'disabled' | 'stopped' | 'paused' | 'ready' {
  if (!state.enabled) return 'disabled';
  if (
    !state.view ||
    state.view.status !== 'active' ||
    state.sessionLost ||
    state.deleting ||
    state.pending?.uncertain
  )
    return 'stopped';
  return state.pending || !canControl(state.view) ? 'paused' : 'ready';
}

export function runAutoplayStep(
  view: CombatLabView | null,
  blocked: { readonly pending: boolean; readonly deleting: boolean; readonly sessionLost: boolean },
  act: (intent: CombatLabAction['intent'], description: string) => void,
): void {
  if (!view || blocked.pending || blocked.deleting || blocked.sessionLost || !canControl(view))
    return;
  act({ type: 'autoplay' }, 'Шаг автобоя');
}

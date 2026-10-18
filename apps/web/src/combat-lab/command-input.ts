import type { CombatLabAction, CombatLabSkillId, CombatLabView } from '@warwrit/protocol';

interface CommandKeyEvent {
  readonly key: string;
  readonly repeat: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  preventDefault(): void;
}
interface CommandKeyTarget {
  closest(selector: string): unknown;
}
export interface CombatLabHotkeyAction {
  readonly reason: string;
  readonly run: () => unknown;
  readonly cancel?: () => void;
}

interface EndTurnConfirmation {
  readonly context: string;
  readonly deadline: number;
}

/** UI warning only: costs and AP are published observations, never command admission. */
export function advanceEndTurnConfirmation(
  confirmation: EndTurnConfirmation | null,
  input: {
    readonly context: string;
    readonly current: number;
    readonly maximum: number;
    readonly attackCost: number | undefined;
    readonly available: boolean;
  },
  now: number,
): { confirmation: EndTurnConfirmation | null; dispatch: boolean } {
  if (!input.available) return { confirmation: null, dispatch: false };
  const needsWarning =
    input.current > 0 &&
    (input.current === input.maximum ||
      input.attackCost === undefined ||
      input.current >= input.attackCost);
  if (!needsWarning || (confirmation?.context === input.context && now < confirmation.deadline))
    return { confirmation: null, dispatch: true };
  return { confirmation: { context: input.context, deadline: now + 2000 }, dispatch: false };
}

/** Escape remains global cancellation; command keys belong only to the board, outside interactive controls. */
export function handleCombatLabKey(
  event: CommandKeyEvent,
  target: CommandKeyTarget | null,
  actions: Readonly<Record<string, CombatLabHotkeyAction>>,
  cancel: () => void,
): void {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'Escape') {
    actions['4']?.cancel?.();
    cancel();
    return;
  }
  if (
    !target ||
    target.closest('input, textarea, select, button, [contenteditable="true"]') ||
    !target.closest('.battle-view')
  )
    return;
  const action = actions[event.key === ' ' ? '4' : event.key];
  if (!action || action.reason) return;
  event.preventDefault();
  if (action !== actions['4']) actions['4']?.cancel?.();
  action.run();
}

export function selectCombatSkill(
  view: CombatLabView,
  skillId: CombatLabSkillId,
  selectedSkillId: CombatLabSkillId | null,
  disabledReason: string,
  effects: {
    readonly act: (intent: CombatLabAction['intent']) => void;
    readonly select: (skillId: CombatLabSkillId | null) => void;
  },
): void {
  const skill = view.skills?.find((candidate) => candidate.skillId === skillId);
  if (!skill || disabledReason) return;
  if (skill.target === 'self') effects.act({ type: 'use-skill', skillId });
  else effects.select(selectedSkillId === skillId ? null : skillId);
}

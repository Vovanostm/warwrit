import type { CombatLabAction, CombatLabSkillId, CombatLabView } from '@warwrit/protocol';
import { canControl } from './command-availability.js';
import { combatSkillReasonText } from './controller.js';

type FieldCommand =
  | {
      readonly intent: CombatLabAction['intent'];
      readonly description: string;
      readonly confirmation?: string;
    }
  | { readonly notice: string };

function skillCommand(
  view: CombatLabView,
  intent: CombatLabAction['intent'],
  selectedSkillId: CombatLabSkillId | null,
): FieldCommand {
  const skillId = intent.type === 'use-skill' ? intent.skillId : selectedSkillId;
  const targetId =
    intent.type === 'use-skill' || intent.type === 'attack' ? intent.targetId : undefined;
  const skill = view.skills?.find((candidate) => candidate.skillId === skillId);
  const resolvedTargetId = skill?.target === 'self' ? view.activation?.actorId : targetId;
  const preview = view.skillPreview?.find(
    (candidate) => candidate.skillId === skillId && candidate.targetId === resolvedTargetId,
  );
  if (!skill || !preview?.legal) return { notice: combatSkillReasonText(preview?.reason) };
  return {
    intent: {
      type: 'use-skill',
      skillId: skill.skillId,
      ...(skill.target === 'self' ? {} : { targetId: preview.targetId }),
    },
    description: skill.name,
  };
}

function movementCommand(
  view: CombatLabView,
  intent: Extract<CombatLabAction['intent'], { type: 'move' }>,
): FieldCommand | null {
  const preview = view.movementPreview?.find(
    ({ to }) => to.q === intent.to.q && to.r === intent.to.r,
  );
  if (!preview) return null;
  const fireDamage = preview.fireDamage ?? 0;
  const actor = view.units.find(({ id }) => id === view.activation?.actorId);
  return {
    intent,
    description: 'Перемещение',
    ...(fireDamage > 0
      ? {
          confirmation:
            actor && fireDamage >= actor.pools.health.current
              ? 'Боец погибнет на пути и не достигнет клетки. Продолжить?'
              : `Огонь нанесёт ${fireDamage} урона здоровью. Продолжить?`,
        }
      : {}),
  };
}

/** Admit field commands only from the active actor's published previews, never inspection selection. */
function fieldCommand(
  view: CombatLabView,
  intent: CombatLabAction['intent'],
  selectedSkillId: CombatLabSkillId | null,
): FieldCommand | null {
  if (selectedSkillId || intent.type === 'use-skill')
    return skillCommand(view, intent, selectedSkillId);
  if (intent.type === 'move') return movementCommand(view, intent);
  if (
    intent.type === 'attack' &&
    view.attackPreview?.some(({ targetId }) => targetId === intent.targetId)
  )
    return { intent, description: 'Атака' };
  return null;
}

export function canIssueManualCommand(
  view: CombatLabView,
  blocked: {
    readonly autoplay: boolean;
    readonly pending: boolean;
    readonly deleting: boolean;
    readonly sessionLost: boolean;
  },
): boolean {
  return (
    !blocked.autoplay &&
    !blocked.pending &&
    !blocked.deleting &&
    !blocked.sessionLost &&
    canControl(view)
  );
}

interface FieldCommandEffects {
  readonly notice: (message: string) => void;
  readonly confirm: (message: string) => boolean;
  readonly selectMovement: (to: { readonly q: number; readonly r: number }) => void;
  readonly selectTarget: (id: string) => void;
  readonly act: (intent: CombatLabAction['intent'], description: string) => void;
}

export function executeFieldCommand(
  view: CombatLabView,
  intent: CombatLabAction['intent'],
  selectedSkillId: CombatLabSkillId | null,
  effects: FieldCommandEffects,
): void {
  const command = fieldCommand(view, intent, selectedSkillId);
  if (!command) return;
  if ('notice' in command) {
    effects.notice(command.notice);
    return;
  }
  if (command.confirmation && !effects.confirm(command.confirmation)) return;
  if (command.intent.type === 'move') effects.selectMovement(command.intent.to);
  else if (command.intent.type === 'attack') effects.selectTarget(command.intent.targetId);
  effects.act(command.intent, command.description);
}

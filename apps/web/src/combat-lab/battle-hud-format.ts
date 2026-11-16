import type { CombatLabEvent } from '@warwrit/protocol';
import type { BattlePresentationView } from './battle-presentation.js';
export const unitStatus = {
  active: 'В строю',
  dead: 'Погиб',
  retreated: 'Отступил',
  surrendered: 'Сдался',
};
export const poolLabels = {
  health: 'Здоровье',
  armor: 'Броня',
  stamina: 'Силы',
  morale: 'Мораль',
};

/** Player-facing side name; stable order follows the already-rendered side list. */
export function battleSideLabel(view: BattlePresentationView, sideId: string | undefined): string {
  const sideIds = [
    ...new Set([
      ...(view.sides ?? []).map((side) => side.id),
      ...view.units.map((unit) => unit.sideId),
    ]),
  ];
  const index = sideIds.indexOf(sideId ?? '');
  if (view.viewerSideKnown === false) return index < 0 ? 'Сторона' : `Сторона ${index + 1}`;
  if (sideId === view.controlledSideId) return 'Ваша сторона';
  const opponents = sideIds.filter((id) => id !== view.controlledSideId);
  if (opponents.length === 1) return 'Противник';
  const opponentIndex = opponents.indexOf(sideId ?? '');
  return opponentIndex < 0 ? 'Противник' : `Противник ${opponentIndex + 1}`;
}

const eventLabels: Record<string, string> = {
  'skill.used': 'Приём применён',
  'battle.started': 'Бой начался',
  'round.started': 'Новый раунд',
  'activation.started': 'Ход бойца',
  'activation.ended': 'Активация завершена',
  'unit.moved': 'Перемещение',
  'attack.resolved': 'Атака',
  'unit.damaged': 'Получен урон',
  'unit.fire-damaged': 'Урон от огня',
  'unit.wounded': 'Ранение',
  'unit.died': 'Погиб',
  'unit.defended': 'Защита',
  'unit.retreated': 'Отступил',
  'unit.surrendered': 'Сдался',
  'threat.prepared': 'Готовит тяжёлый удар',
  'threat.retargeted': 'Изменил цель тяжёлого удара',
  'threat.cancelled': 'Тяжёлый удар отменён',
  'threat.executed': 'Тяжёлый удар',
  'unit.morale-changed': 'Изменилась мораль',
  'battle.resolved': 'Бой завершён',
};

export const damageRange = ({
  minimum,
  maximum,
}: {
  readonly minimum: number;
  readonly maximum: number;
}) => (minimum === maximum ? `${minimum}` : `${minimum}–${maximum}`);

type Event = CombatLabEvent;
function eventSubject(view: BattlePresentationView, event: Event): string | undefined {
  const actor = view.units.find(({ id }) => id === event.unitId);
  const target = view.units.find(({ id }) => id === event.targetId);
  if (['threat.prepared', 'threat.retargeted', 'threat.cancelled'].includes(event.type)) {
    return `${actor?.name ?? actor?.id ?? 'Тварь'}${target ? ` → ${target.name ?? target.id}` : ''}`;
  }
  return target?.name ?? target?.id ?? actor?.name ?? actor?.id;
}
const skillNames: Record<string, string> = {
  'shield-brace': 'Упор щитом',
  'armor-pressure': 'Удар по броне',
  'reach-thrust': 'Дальний укол',
  'aimed-shot': 'Прицельный выстрел',
  rally: 'Собраться',
};
function eventSkill(view: BattlePresentationView, event: Event): string {
  if (event.type !== 'skill.used') return '';
  const skill = view.skills?.find((candidate) => candidate.skillId === event.skillId);
  const name = skill?.name ?? skillNames[event.skillId ?? ''] ?? 'Приём';
  return ` · ${name} · ранг ${event.rank ?? '?'}${event.moraleGain ? ` · мораль +${event.moraleGain}` : ''}`;
}
function eventOutcome(event: Event): string {
  if (event.type !== 'attack.resolved') return '';
  if (event.hit === true) return ' · попадание';
  return event.hit === false ? ' · промах' : '';
}
function eventDamage(event: Event): string {
  if (event.healthDamage !== null && event.healthDamage > 0)
    return ` · здоровье −${event.healthDamage}`;
  if (event.armorDamage !== null && event.armorDamage > 0) return ` · броня −${event.armorDamage}`;
  return '';
}
export function eventText(view: BattlePresentationView, event: Event): string {
  const subject = eventSubject(view, event);
  return `${eventLabels[event.type] ?? 'Событие'}${subject ? ` · ${subject}` : ''}${eventSkill(view, event)}${eventOutcome(event)}${eventDamage(event)}`;
}

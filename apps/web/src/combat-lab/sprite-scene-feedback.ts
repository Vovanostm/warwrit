import type { CombatLabEvent, CombatLabView } from '@warwrit/protocol';
type FeedbackView = Pick<CombatLabView, 'units' | 'events' | 'viewRevision' | 'skills'>;
type BattleUnit = CombatLabView['units'][number];
const feedbackText: Partial<Record<CombatLabEvent['type'], string>> = {
  'unit.died': 'ПОГИБ',
  'unit.surrendered': 'СДАЛСЯ',
  'threat.prepared': 'ГОТОВИТ УДАР',
  'threat.retargeted': 'НОВОЕ НАВЕДЕНИЕ',
  'threat.cancelled': 'УДАР ОТМЕНЁН',
  'threat.executed': 'УДАР',
  'unit.defended': 'ЗАЩИТА',
};
function attackFeedback(event: CombatLabEvent): string {
  if (event.hit === false) return 'ПРОМАХ';
  if (event.hit !== true) return 'УДАР';
  const damage = event.healthDamage ?? event.armorDamage ?? 0;
  return `ПОПАДАНИЕ${damage > 0 ? ` −${damage}` : ''}`;
}
function damageFeedback(event: CombatLabEvent): string {
  if ((event.healthDamage ?? 0) > 0) return `ЗДОРОВЬЕ −${event.healthDamage}`;
  return (event.armorDamage ?? 0) > 0 ? `БРОНЯ −${event.armorDamage}` : '';
}
function skillFeedback(view: FeedbackView, event: CombatLabEvent): string {
  const fallback = event.skillId
    ? {
        'shield-brace': 'УПОР ЩИТОМ',
        'armor-pressure': 'ПРОБИВАНИЕ БРОНИ',
        'reach-thrust': 'ДАЛЬНИЙ ВЫПАД',
        'aimed-shot': 'ПРИЦЕЛЬНЫЙ ВЫСТРЕЛ',
        rally: 'ОБОДРЕНИЕ',
      }[event.skillId]
    : 'ПРИЁМ';
  return (
    view.skills?.find((skill) => skill.skillId === event.skillId)?.name.toUpperCase() ?? fallback
  );
}
const eventFormatters: Partial<
  Record<
    CombatLabEvent['type'],
    (view: FeedbackView, event: CombatLabEvent, previous: string | undefined) => string
  >
> = {
  'attack.resolved': (_view, event) => attackFeedback(event),
  'unit.damaged': (_view, event) => damageFeedback(event),
  'skill.used': skillFeedback,
  'unit.moved': (_view, event) =>
    `ШАГ${event.actionPointCost ? ` · −${event.actionPointCost} ОД` : ''}`,
  'unit.fire-damaged': (_view, event) => `ОГОНЬ −${event.healthDamage ?? 0}`,
  'unit.wounded': (_view, _event, previous) => (previous ? `${previous} · РАНЕНИЕ` : 'РАНЕНИЕ'),
};
function eventText(
  view: FeedbackView,
  event: CombatLabEvent,
  previous: string | undefined,
): string {
  const formatter = eventFormatters[event.type];
  return formatter ? formatter(view, event, previous) : (feedbackText[event.type] ?? '');
}
function duplicatesThreatBadge(unit: BattleUnit, event: CombatLabEvent): boolean {
  if (unit.status !== 'active' || !unit.threat) return false;
  if (event.targetId !== null && event.targetId !== unit.threat.targetId) return false;
  return event.type === (unit.threat.retargeted ? 'threat.retargeted' : 'threat.prepared');
}
function eventSubject(event: CombatLabEvent): string | null {
  return event.type.startsWith('threat.') && event.type !== 'threat.executed'
    ? event.unitId
    : (event.targetId ?? event.unitId);
}
export function eventFeedback(
  view: FeedbackView,
  previousRevision: number | null,
): Map<string, string> {
  const labels = new Map<string, string>();
  for (const event of view.events) {
    const fresh =
      previousRevision === null
        ? event.revision === view.viewRevision
        : event.revision > previousRevision;
    if (!fresh) continue;
    const subjectId = eventSubject(event);
    const unit = view.units.find(({ id }) => id === subjectId);
    if (!unit || duplicatesThreatBadge(unit, event)) continue;
    const text = eventText(view, event, labels.get(unit.id));
    if (text) labels.set(unit.id, text);
  }
  return labels;
}

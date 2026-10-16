import type { CombatLabView, CombatLabSkillId } from '@warwrit/protocol';
import type { Unit } from './BattleUnitCard.js';
export function BattleGuidance({
  view,
  status,
  reachUnit,
  reach,
  reachNote,
  selectedSkillId,
}: {
  view: CombatLabView;
  status: string;
  reachUnit: Unit | undefined;
  reach: Unit['weaponReach'] | undefined;
  reachNote: string;
  selectedSkillId: CombatLabSkillId | null;
}) {
  return (
    <div className="battle-order-guidance" role="status">
      <strong>{status}</strong>
      {view.status === 'active' && reach && !selectedSkillId && (
        <span className="battle-weapon-reach" aria-label="Дальность выбранного оружия">
          <i aria-hidden="true" />
          {reachUnit?.name ?? reachUnit?.id} ·{' '}
          {reach.minimumRange === reach.maximumRange
            ? reach.maximumRange
            : `${reach.minimumRange}–${reach.maximumRange}`}{' '}
          {reach.maximumRange === 1 ? 'гекс' : 'гекса'} · {reachNote}
        </span>
      )}
      {view.status === 'active' && !selectedSkillId ? (
        <span className="battle-range-legend" aria-label="Обозначения зон">
          <i data-zone="move" aria-hidden="true" /> Ход
          <i data-zone="weapon" aria-hidden="true" /> Дальность
          <i data-zone="both" aria-hidden="true" /> Ход + дальность
          <small>ПКМ — приказ ходящему</small>
        </span>
      ) : (
        <span className="battle-skill-mode">
          {selectedSkillId
            ? `Выбран приём: ${view.skills?.find((skill) => skill.skillId === selectedSkillId)?.name} · ПКМ по цели · Esc — отменить`
            : 'Наведение — прогноз · ПКМ — приказ'}
        </span>
      )}
    </div>
  );
}

import { BattleCost } from './BattleCost.js';
import type { CombatLabSkillId } from '@warwrit/protocol';
import type { BattlePresentationView } from './battle-presentation.js';
import type { Unit } from './battle-presentation.js';

export function BattleGuidance({
  view,
  status,
  reachUnit,
  reach,
  reachNote,
  selectedSkillId,
}: {
  view: BattlePresentationView;
  status: string;
  reachUnit: Unit | undefined;
  reach: Unit['weaponReach'] | undefined;
  reachNote: string;
  selectedSkillId: CombatLabSkillId | null;
}) {
  if (view.status !== 'active') return <div className="battle-order-guidance">{status}</div>;
  const skill = view.skills?.find(({ skillId }) => skillId === selectedSkillId);
  return (
    <div className="battle-order-guidance" role="status">
      {skill ? (
        <>
          <strong>{skill.name}</strong>
          <BattleCost cost={skill} />
          <span className="battle-skill-mode">
            Выберите цель · ПКМ — применить · Esc — отменить
          </span>
        </>
      ) : (
        <>
          {reach && (
            <span className="battle-weapon-reach" aria-label="Дальность выбранного оружия">
              {reachUnit?.name ?? reachUnit?.id} ·{' '}
              {reach.minimumRange === reach.maximumRange
                ? reach.maximumRange
                : `${reach.minimumRange}–${reach.maximumRange}`}{' '}
              {reach.maximumRange === 1 ? 'гекс' : 'гекса'}
              {reachNote && ` · ${reachNote}`}
            </span>
          )}
          <span className="battle-range-legend" aria-label="Обозначения зон">
            <i data-zone="move" aria-hidden="true" /> Движение
            <i data-zone="weapon" aria-hidden="true" /> Оружие
            <i data-zone="both" aria-hidden="true" /> Обе зоны
          </span>
        </>
      )}
    </div>
  );
}

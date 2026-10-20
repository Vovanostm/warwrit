import { BattleCost } from './BattleCost.js';
import type { CombatLabSkillId } from '@warwrit/protocol';
import type { BattlePresentationView } from './battle-presentation.js';
import type { Unit } from './battle-presentation.js';
import { movementBandSummary } from './sprite-scene-markers.js';

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
  const movementBands = movementBandSummary(view);
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
            {movementBands.generic && (
              <>
                <i data-zone="move" aria-hidden="true" /> Движение
              </>
            )}
            {movementBands.moveAttack && (
              <>
                <i data-zone="move-attack" aria-hidden="true" /> Дойти и атаковать
              </>
            )}
            {movementBands.movementOnly && (
              <>
                <i data-zone="move-only" aria-hidden="true" /> Только движение
              </>
            )}
            <i data-zone="weapon" aria-hidden="true" /> Оружие
          </span>
        </>
      )}
    </div>
  );
}

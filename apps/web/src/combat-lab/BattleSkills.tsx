import { useRef, useState } from 'react';
import type { CombatLabView, CombatLabSkillId } from '@warwrit/protocol';
import { CombatIcon } from './CombatIcon.js';
import { combatSkillReasonText } from './controller.js';
interface Props {
  view: CombatLabView;
  selectedSkillId: CombatLabSkillId | null;
  onSelectSkill: ((id: CombatLabSkillId) => void) | undefined;
  skillDisabledReason: string;
}
export function BattleSkills({ view, selectedSkillId, onSelectSkill, skillDisabledReason }: Props) {
  const [moreSkills, setMoreSkills] = useState(false);
  const moreSkillsButtonRef = useRef<HTMLButtonElement>(null);
  const renderSkillSlot = (skill: NonNullable<CombatLabView['skills']>[number]) => {
    const previews =
      view.skillPreview?.filter((candidate) => candidate.skillId === skill.skillId) ?? [];
    const reason =
      skillDisabledReason ||
      (previews.some((preview) => preview.legal) ? '' : combatSkillReasonText(previews[0]?.reason));
    return (
      <span className="battle-ability-slot battle-control-slot" key={skill.skillId}>
        <button
          className="battle-control battle-control--icon"
          type="button"
          aria-label={`${skill.name} · ранг ${skill.rank}`}
          aria-pressed={selectedSkillId === skill.skillId}
          aria-disabled={Boolean(reason)}
          onClick={() => {
            if (!reason) {
              setMoreSkills(false);
              onSelectSkill?.(skill.skillId);
            }
          }}
          aria-describedby={`skill-${skill.skillId}`}
        >
          <CombatIcon name={skillIcons[skill.skillId]} />
          <b className="battle-skill-rank">{skill.rank}</b>
        </button>
        <span id={`skill-${skill.skillId}`} className="battle-command-tooltip" role="tooltip">
          <strong>
            {skill.name} · ранг {skill.rank}
          </strong>
          <span>
            {skill.actionPointCost} ОД · {skill.staminaCost} сил
          </span>
          <span>{skill.description}</span>
          <small className={reason ? 'battle-command-reason' : ''}>
            {reason ||
              (skill.target === 'self'
                ? 'Применить к себе'
                : 'Выберите цель · ПКМ — приём · Esc — отменить')}
          </small>
        </span>
      </span>
    );
  };

  return (
    <nav
      className="battle-ability-dock"
      aria-label="Изученные приёмы"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMoreSkills(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && moreSkills) {
          setMoreSkills(false);
          moreSkillsButtonRef.current?.focus();
        }
      }}
    >
      <small>ПРИЁМЫ</small>
      <div className="battle-skill-list">
        {(view.skills?.length ?? 0) === 0 && (
          <span className="battle-no-skills">Нет изученных приёмов</span>
        )}
        {(view.skills ?? []).slice(0, 4).map(renderSkillSlot)}
        {(view.skills?.length ?? 0) > 4 && (
          <span className="battle-control-slot">
            <button
              ref={moreSkillsButtonRef}
              className="battle-control battle-control--icon battle-more-skills"
              type="button"
              aria-label={
                moreSkills ? 'Свернуть дополнительные приёмы' : `Ещё +${view.skills!.length - 4}`
              }
              aria-expanded={moreSkills}
              aria-controls="battle-skills-overflow"
              aria-describedby="battle-more-skills-tip"
              onClick={() => setMoreSkills(!moreSkills)}
            >
              <span aria-hidden="true">···</span>
              <b className="battle-skill-rank">+{view.skills!.length - 4}</b>
            </button>
            <span id="battle-more-skills-tip" className="battle-command-tooltip" role="tooltip">
              <strong>Дополнительные приёмы</strong>
              <small>Ещё +{view.skills!.length - 4} · Esc — закрыть</small>
            </span>
          </span>
        )}
      </div>
      <div
        id="battle-skills-overflow"
        className="battle-skills-overflow"
        hidden={!moreSkills}
        role="group"
        aria-label="Дополнительные приёмы"
      >
        {(view.skills ?? []).slice(4).map(renderSkillSlot)}
      </div>
    </nav>
  );
}

const skillIcons = {
  'shield-brace': 'brace',
  rally: 'rally',
  'aimed-shot': 'aim',
  'reach-thrust': 'reach',
  'armor-pressure': 'pressure',
} as const;

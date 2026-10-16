import type {
  CombatLabCatalog,
  CombatLabCustomUnit,
  CombatLabSkillDefinition,
  CombatLabSkillRanks,
} from '@warwrit/protocol';
import './skill-loadout.css';

interface Props {
  readonly unit: CombatLabCustomUnit;
  readonly catalog: CombatLabCatalog;
  readonly onChange: (ranks: CombatLabSkillRanks) => void;
}

export function changeSkillRank(
  ranks: CombatLabSkillRanks,
  skillId: CombatLabSkillDefinition['skillId'],
  rank: 0 | 1 | 2 | 3,
): CombatLabSkillRanks {
  const next = { ...ranks };
  if (rank === 0) delete next[skillId];
  else next[skillId] = rank;
  return next;
}

function SkillChoice({
  skill,
  unit,
  weaponId,
  onChange,
}: {
  readonly skill: CombatLabSkillDefinition;
  readonly unit: CombatLabCustomUnit;
  readonly weaponId: string | undefined;
  readonly onChange: Props['onChange'];
}) {
  const compatible = skill.equipment.some((id) => id === weaponId);
  const rank = unit.skillRanks?.[skill.skillId] ?? 0;
  return (
    <li className="skill-loadout-choice" data-compatible={compatible}>
      <label>
        <strong>{skill.name}</strong>
        <select
          aria-label={`${skill.name}: ${unit.id}`}
          value={rank}
          onChange={(event) =>
            onChange(
              changeSkillRank(
                unit.skillRanks ?? {},
                skill.skillId,
                Number(event.target.value) as 0 | 1 | 2 | 3,
              ),
            )
          }
        >
          <option value={0}>Не изучен</option>
          <option value={1}>Ранг 1</option>
          <option value={2}>Ранг 2</option>
          <option value={3}>Ранг 3</option>
        </select>
      </label>
      <span>
        {skill.actionPointCost} ОД · {skill.staminaCost} выносливости · дальность{' '}
        {skill.minimumRange}–{skill.maximumRange}
      </span>
      <p>{skill.description}</p>
      {!compatible && (
        <p className="skill-loadout-warning">
          Снаряжение не подходит.
          {rank > 0 ? ' Изученный ранг сохранён; приём недоступен в бою.' : ''}
        </p>
      )}
    </li>
  );
}

/** Sandbox ranks are explicit setup values, never earned campaign experience. */
export function SkillLoadout({ unit, catalog, onChange }: Props) {
  const profile = catalog.profiles.find(({ id }) => id === unit.profileId);
  return (
    <details className="skill-loadout">
      <summary>
        Приёмы · {Object.keys(unit.skillRanks ?? profile?.defaultSkillRanks ?? {}).length} изучено
      </summary>
      <p>Ранги для этого боя; опыт кампании здесь не начисляется.</p>
      <div className="skill-loadout-presets">
        <button type="button" onClick={() => onChange({})}>
          Без изученных приёмов
        </button>
        <button type="button" onClick={() => onChange({ ...profile?.defaultSkillRanks })}>
          Приёмы профиля
        </button>
      </div>
      <ul aria-label={`Изученные приёмы: ${profile?.name ?? unit.id}`}>
        {(catalog.skills ?? []).map((skill) => (
          <SkillChoice
            key={skill.skillId}
            skill={skill}
            unit={{ ...unit, skillRanks: unit.skillRanks ?? profile?.defaultSkillRanks ?? {} }}
            weaponId={profile?.weaponId}
            onChange={onChange}
          />
        ))}
      </ul>
      {!catalog.skills?.length && (
        <p>Каталог приёмов недоступен. Обновите страницу перед настройкой.</p>
      )}
    </details>
  );
}

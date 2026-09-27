import type { KeyboardEvent } from 'react';
import type { CombatLabEvent, CombatLabHex, CombatLabView } from '@warwrit/protocol';
import './battle-view.css';

export interface BattleViewProps {
  readonly view: CombatLabView;
  readonly selectedUnitId: string | null;
  readonly onSelectUnit: (id: string) => void;
  readonly onSelectHex: (hex: CombatLabHex) => void;
}

const hexKey = ({ q, r }: CombatLabHex) => `${q},${r}`;
const center = ({ q, r }: CombatLabHex): [number, number] => [
  Math.sqrt(3) * 24 * (q + r / 2),
  36 * r,
];
const corners = Array.from({ length: 6 }, (_, index) => {
  const angle = ((60 * index - 30) * Math.PI) / 180;
  return `${24 * Math.cos(angle)},${24 * Math.sin(angle)}`;
}).join(' ');
const unitStatus = { active: 'В строю', dead: 'Погиб', retreated: 'Отступил' };
const poolLabels = {
  health: 'Здоровье',
  armor: 'Броня',
  stamina: 'Выносливость',
  morale: 'Мораль',
};
const eventLabels: Record<CombatLabEvent['type'], string> = {
  'battle.started': 'Бой начался',
  'round.started': 'Начался раунд',
  'activation.started': 'Начался ход',
  'activation.ended': 'Ход завершён',
  'unit.moved': 'Перемещение',
  'attack.resolved': 'Атака',
  'unit.damaged': 'Урон',
  'unit.wounded': 'Ранение',
  'unit.died': 'Гибель',
  'unit.defended': 'Защита',
  'unit.retreated': 'Отступление',
  'unit.morale-changed': 'Изменение морали',
  'battle.resolved': 'Бой завершён',
};

function selectWithKeyboard(event: KeyboardEvent<SVGGElement>, select: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    select();
  }
}

/** Displays received observations only; selection never executes a combat action. */
export function BattleView({ view, selectedUnitId, onSelectUnit, onSelectHex }: BattleViewProps) {
  const points = view.map.hexes.map(center);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(0, ...xs) - 30;
  const top = Math.min(0, ...ys) - 30;
  const width = Math.max(0, ...xs) + 30 - left;
  const height = Math.max(0, ...ys) + 30 - top;
  const blocked = new Set(view.map.blocked.map(hexKey));
  const sideLabel = (id: string) =>
    `${id === view.controlledSideId ? 'Ваша сторона' : 'Противник'} (${id})`;

  return (
    <section className="combat-lab" aria-label="Лаборатория боя">
      <h2>Лаборатория боя</h2>
      <p>Диагностический бой. Прогресс кампании не сохраняется.</p>
      <p>
        Раунд {view.round} · Ревизия {view.viewRevision} ·{' '}
        {view.status === 'active' ? 'Бой идёт' : 'Бой завершён'}
      </p>
      <p>
        Круг — ваша сторона, квадрат — противник. Белая рамка — текущий ход, золотая — выбранный
        боец.
      </p>
      <svg
        className="combat-lab-board"
        viewBox={`${left} ${top} ${width} ${height}`}
        role="group"
        aria-label="Поле боя: выбор клетки или бойца для осмотра"
      >
        {view.map.hexes.map((hex) => {
          const key = hexKey(hex);
          const retreat = view.sides.filter((side) =>
            side.retreatHexes.some((tile) => hexKey(tile) === key),
          );
          const label = `Клетка ${key}${blocked.has(key) ? ', препятствие' : ''}${retreat.map((side) => `, выход: ${sideLabel(side.id)}`).join('')}`;
          return (
            <g
              key={key}
              transform={`translate(${center(hex).join(' ')})`}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={() => onSelectHex({ ...hex })}
              onKeyDown={(event) => selectWithKeyboard(event, () => onSelectHex({ ...hex }))}
            >
              <polygon
                points={corners}
                className={blocked.has(key) ? 'combat-lab-blocked' : 'combat-lab-cell'}
              />
              <text textAnchor="middle" y={5}>
                {blocked.has(key) ? '×' : retreat.length ? '↗' : ''}
              </text>
            </g>
          );
        })}
        {view.units
          .map((unit, index) => ({ unit, index }))
          .sort((a, b) => Number(a.unit.status === 'active') - Number(b.unit.status === 'active'))
          .map(({ unit, index }) => (
            <g
              key={unit.id}
              transform={`translate(${center(unit.position).join(' ')})`}
              role="button"
              tabIndex={0}
              aria-label={`Осмотреть ${unit.id}: ${sideLabel(unit.sideId)}, ${unitStatus[unit.status]}`}
              aria-pressed={selectedUnitId === unit.id}
              data-active={view.activation?.actorId === unit.id}
              data-status={unit.status}
              onClick={() => onSelectUnit(unit.id)}
              onKeyDown={(event) => selectWithKeyboard(event, () => onSelectUnit(unit.id))}
            >
              {unit.sideId === view.controlledSideId ? (
                <circle r={15} />
              ) : (
                <rect x={-14} y={-14} width={28} height={28} />
              )}
              <text textAnchor="middle" y={5}>
                {index + 1}
              </text>
            </g>
          ))}
      </svg>
      <h3>Очередь ходов</h3>
      <ol className="combat-lab-initiative">
        {view.initiativeOrder.map((id, index) => (
          <li
            key={id}
            aria-current={view.activation !== null && index === view.turnIndex ? 'step' : undefined}
          >
            {id}
          </li>
        ))}
      </ol>
      <p>
        {view.activation
          ? `Ход: ${view.activation.actorId}. Очки действий: ${view.activation.actionPoints.current}/${view.activation.actionPoints.maximum}`
          : 'Активного хода нет'}
      </p>
      <ul className="combat-lab-units">
        {view.units.map((unit, index) => (
          <li key={unit.id}>
            <button
              type="button"
              aria-pressed={selectedUnitId === unit.id}
              onClick={() => onSelectUnit(unit.id)}
            >
              {index + 1}. Осмотреть {unit.id}
            </button>
            <p>
              {sideLabel(unit.sideId)} · {unitStatus[unit.status]} · Инициатива: {unit.initiative}
            </p>
            <p>
              Позиция: {hexKey(unit.position)} · Оружие: {unit.weaponId}
              {unit.guarding ? ' · Защищается' : ''}
            </p>
            <dl>
              {(Object.keys(poolLabels) as (keyof typeof poolLabels)[]).map((key) => (
                <div key={key}>
                  <dt>{poolLabels[key]}</dt>
                  <dd>
                    {unit.pools[key].current}/{unit.pools[key].maximum}
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              Раны:{' '}
              {unit.wounds.length
                ? unit.wounds.map((wound) => (wound === 'minor' ? 'лёгкая' : 'тяжёлая')).join(', ')
                : 'нет'}
            </p>
          </li>
        ))}
      </ul>
      {view.outcome !== null && (
        <p role="status">
          {view.outcome.winnerSideId === null
            ? 'Победителя нет'
            : `Победитель: ${sideLabel(view.outcome.winnerSideId)}`}
          . Причина:{' '}
          {view.outcome.reason === 'round-limit' ? 'предел раундов' : 'осталась одна сторона'}.
        </p>
      )}
      <h3>Журнал боя</h3>
      {view.omittedEventPrefix > 0 && <p>Ранних событий не показано: {view.omittedEventPrefix}</p>}
      <ol className="combat-lab-log">
        {view.events.map((event) => (
          <li key={event.id}>
            {eventLabels[event.type]} · Ревизия {event.revision}
            {event.unitId !== null ? ` · ${event.unitId}` : ''}
            {event.targetId !== null ? ` → ${event.targetId}` : ''}
            {event.hit !== null ? (event.hit ? ' · попадание' : ' · промах') : ''}
            {event.healthDamage !== null ? ` · урон здоровью: ${event.healthDamage}` : ''}
            {event.armorDamage !== null ? ` · урон броне: ${event.armorDamage}` : ''}
          </li>
        ))}
      </ol>
    </section>
  );
}

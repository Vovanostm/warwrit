import type { CombatLabView } from '@warwrit/protocol';
import { spriteForUnit } from './sprite-art.js';
import { poolLabels, unitStatus } from './battle-hud-format.js';
export type Unit = CombatLabView['units'][number];
const iconPaths = {
  health: 'M14 24 4 14Q-1 3 8 4q4 0 6 5 2-5 6-5 9-1 4 10Z',
  armor: 'M14 3 5 7v8q1 7 9 10 8-3 9-10V7ZM14 6v15',
  stamina: 'M15 2 5 16h8l-1 10 11-15h-8Z',
  morale: 'M5 14l6 6L24 6',
  fear: 'M9 19q5-4 10 0M9 11h1m8 0h1M14 3C1 3 2 23 14 25 26 23 27 3 14 3Z',
  wound: 'M14 3 5 17q-3 9 9 9t9-9ZM9 21q0 3 4 3',
  grid: 'M6 4h8l4 7-4 7H6l-4-7ZM18 11h6l4 7-4 7h-8l-4-7',
  sun: 'M14 2v3m0 18v3M2 14h3m18 0h3M5 5l2 2m14 14 2 2M5 23l2-2M21 7l2-2M19 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  skill: 'M14 5v18M5 14h18',
};
export function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d={iconPaths[name]} />
    </svg>
  );
}
export function Portrait({ unit }: { unit: Unit }) {
  const art = spriteForUnit(unit);
  return (
    <span className="battle-portrait" data-art={art.id}>
      <img src={art.url} alt="" />
    </span>
  );
}
function PanicState({
  unit,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  return (
    <>
      {' '}
      {unit.status === 'active' && unit.panicking && (
        <span
          title="Паника: боец ищет выход с поля. При перекрытом безопасном выходе человек может сдаться людям."
          aria-label="Паника"
        >
          <Icon name="fear" />
          {!compact && 'Паника · бежит'}
        </span>
      )}
    </>
  );
}
function ThreatState({
  unit,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  return (
    <>
      {' '}
      {unit.status === 'active' && unit.threat && (
        <span
          title={`Тяжёлый удар: ${unit.threat.damage.minimum}–${unit.threat.damage.maximum}. ${unit.threat.responseReceived ? 'Ответный ход прошёл' : 'До удара будет ответный ход'}`}
          aria-label="Готовит тяжёлый удар"
        >
          <Icon name="wound" />
          {!compact && 'Готовит удар'}
        </span>
      )}
    </>
  );
}
function ShakenState({
  unit,
  view,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  const rules = view.ruleHints;
  const shaken =
    rules !== undefined &&
    unit.status === 'active' &&
    unit.pools.morale.current <= rules.hit.shakenMoraleThreshold;
  return (
    <>
      {' '}
      {shaken && rules && !unit.panicking && (
        <span
          title={`Мораль ${unit.pools.morale.current} ≤ ${rules.hit.shakenMoraleThreshold}. Точность и защита −${rules.hit.shakenPenalty}.`}
          aria-label={`Дрогнул: точность и защита −${rules.hit.shakenPenalty}`}
        >
          <Icon name="fear" />
          {!compact && 'Дрогнул'}
        </span>
      )}
    </>
  );
}
function ExhaustedState({
  unit,
  view,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  const rules = view.ruleHints;
  const exhausted =
    rules !== undefined &&
    unit.status === 'active' &&
    unit.pools.stamina.current * 100 <=
      unit.pools.stamina.maximum * rules.hit.lowStaminaThresholdPercent;
  return (
    <>
      {' '}
      {exhausted && rules && (
        <span
          title={`Силы не выше ${rules.hit.lowStaminaThresholdPercent}% максимума. Точность −${rules.hit.lowStaminaPenalty}.`}
          aria-label={`Истощён: точность −${rules.hit.lowStaminaPenalty}`}
        >
          <Icon name="stamina" />
          {!compact && 'Истощён'}
        </span>
      )}
    </>
  );
}
function GuardState({
  unit,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  return (
    <>
      {' '}
      {unit.status === 'active' && unit.guarding && (
        <span
          title={
            unit.shieldBraceRank
              ? `Упор щитом · ранг ${unit.shieldBraceRank}${unit.guardDamageReductionPercent !== undefined ? `: сила входящего удара −${unit.guardDamageReductionPercent}%` : ''}, до следующего хода`
              : unit.guardDamageReductionPercent !== undefined
                ? `Защита: сила входящего удара −${unit.guardDamageReductionPercent}%, до следующего хода`
                : 'Защита'
          }
          aria-label={unit.shieldBraceRank ? `Упор щитом · ранг ${unit.shieldBraceRank}` : 'Защита'}
        >
          <Icon name="armor" />
          {!compact && (unit.shieldBraceRank ? `Упор щитом · ${unit.shieldBraceRank}` : 'Защита')}
        </span>
      )}
    </>
  );
}
function WoundState({
  unit,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  return (
    <>
      {' '}
      {unit.wounds.length > 0 && (
        <span
          title={`Ранения: ${unit.wounds.map((w) => (w === 'severe' ? 'тяжёлое' : 'лёгкое')).join(', ')}`}
          aria-label={`Ранений: ${unit.wounds.length}`}
        >
          <Icon name="wound" />
          {!compact && `Ранений: ${unit.wounds.length}`}
        </span>
      )}
    </>
  );
}
function StatusState({ unit }: { unit: Unit; view: CombatLabView; compact?: boolean }) {
  return <> {unit.status !== 'active' && <span>{unitStatus[unit.status]}</span>}</>;
}
function MoraleState({
  unit,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  return (
    <>
      {' '}
      {!compact && (
        <span title="Наблюдаемое значение морали">
          <Icon name="morale" />
          Мораль {unit.pools.morale.current}/{unit.pools.morale.maximum}
        </span>
      )}
    </>
  );
}
function TerrainState({
  unit,
  view,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  const tile = view.map.tiles?.find(({ q, r }) => q === unit.position.q && r === unit.position.r);
  return (
    <>
      {' '}
      {!compact && tile && (tile.height > 0 || tile.terrain !== 'plain') && (
        <span title={`Клетка ${tile.q}, ${tile.r}; текущая поверхность, без постоянного эффекта`}>
          {tile.height > 0 && `Высота +${tile.height}`}
          {tile.height > 0 && tile.terrain !== 'plain' && ' · '}
          {tile.terrain === 'mud' ? 'Грязь' : tile.terrain === 'fire' ? 'Огонь' : ''}
        </span>
      )}
    </>
  );
}
export function UnitStates({
  unit,
  view,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'battle-effects' : 'battle-unit-states'}>
      <PanicState unit={unit} view={view} compact={compact} />
      <ThreatState unit={unit} view={view} compact={compact} />
      <ShakenState unit={unit} view={view} compact={compact} />
      <ExhaustedState unit={unit} view={view} compact={compact} />
      <GuardState unit={unit} view={view} compact={compact} />
      <WoundState unit={unit} view={view} compact={compact} />
      <StatusState unit={unit} view={view} compact={compact} />
      <MoraleState unit={unit} view={view} compact={compact} />
      <TerrainState unit={unit} view={view} compact={compact} />
    </div>
  );
}
export function UnitCard({
  unit,
  actor,
  view,
}: {
  unit: Unit | undefined;
  actor?: boolean;
  view: CombatLabView;
}) {
  const points = actor ? view.activation?.actionPoints : undefined;
  return (
    <section
      className={`battle-unit-card ${actor ? 'battle-acting-unit' : 'battle-inspected-unit'}`}
      aria-label={
        actor ? 'Действующий боец' : unit ? `Состояние: ${unit.name ?? unit.id}` : 'Осмотр бойца'
      }
    >
      <div className="battle-card-header">
        <span>{cardHeading(view, unit, actor)}</span>
        {points && (
          <div
            className="battle-action-points"
            aria-label={`Очки действий: ${points.current} из ${points.maximum}`}
          >
            <span className="battle-ap-pips" aria-hidden="true">
              {Array.from({ length: points.maximum }, (_, i) => (
                <i key={i} data-filled={i < points.current} />
              ))}
            </span>
            <b>
              ОД {points.current}/{points.maximum}
            </b>
          </div>
        )}
      </div>
      {unit ? (
        <>
          <div className="battle-card-main">
            <Portrait unit={unit} />
            <div className="battle-card-data">
              <h2>{unit.name ?? unit.id}</h2>
              <dl className="battle-pools">
                {(['health', 'armor', 'stamina'] as const).map((key) => (
                  <div className="battle-resource" data-resource={key} key={key}>
                    <Icon name={key} />
                    <dt>{poolLabels[key]}</dt>
                    <dd>
                      <strong>{unit.pools[key].current}</strong>
                      <small>/{unit.pools[key].maximum}</small>
                    </dd>
                    <span className="battle-resource-track">
                      <i
                        style={{
                          width: resourceWidth(unit.pools[key]),
                        }}
                      />
                    </span>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <UnitStates unit={unit} view={view} />
        </>
      ) : (
        <p className="battle-empty-inspection">
          Наведите на портрет или фигуру.
          <br />
          ЛКМ закрепляет осмотр.
        </p>
      )}
    </section>
  );
}

function cardHeading(view: CombatLabView, unit: Unit | undefined, actor: boolean | undefined) {
  return actor
    ? view.status === 'resolved'
      ? 'Бой завершён'
      : unit?.sideId === view.controlledSideId
        ? 'Ваш ход'
        : 'Ход противника'
    : unit
      ? `${unit.sideId === view.controlledSideId ? 'Союзник' : 'Противник'} · осмотр`
      : 'Осмотр бойца';
}

function resourceWidth(pool: { current: number; maximum: number }) {
  return `${pool.maximum > 0 ? Math.max(0, Math.min(100, (100 * pool.current) / pool.maximum)) : 0}%`;
}

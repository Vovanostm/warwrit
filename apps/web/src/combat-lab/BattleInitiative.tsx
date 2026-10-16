import { useEffect, useRef, useState } from 'react';
import type { CombatLabView } from '@warwrit/protocol';
import { Portrait, UnitStates, type Unit } from './BattleUnitCard.js';
import { unitStatus } from './battle-hud-format.js';

interface Props {
  view: CombatLabView;
  selectedUnitId: string | null;
  onSelectUnit: (id: string) => void;
  isAttackable: (unit: Unit) => boolean | undefined;
  setInitiativePointer: (id: string | null) => void;
  setInitiativeFocus: (id: string | null) => void;
  setHoveredTarget: (target: null) => void;
}

export function BattleInitiative(props: Props) {
  const { view } = props;
  const timeline = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ before: false, after: false });
  useEffect(() => {
    timeline.current?.scrollTo({ left: 0 });
  }, [view.activation?.id]);
  useEffect(() => {
    const element = timeline.current;
    if (!element) return;
    const update = () =>
      setScroll({
        before: element.scrollLeft > 1,
        after: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener('scroll', update);
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', update);
    };
  }, [view.status, view.viewRevision]);
  if (view.status !== 'active') return null;
  const upcoming = view.initiativeOrder
    .slice(view.turnIndex)
    .filter((id) => view.units.some((unit) => unit.id === id && unit.status === 'active'));
  const forecast = view.nextRoundInitiative;
  return (
    <nav className="battle-initiative" aria-label="Очередь инициативы">
      <button
        className="battle-control battle-timeline-arrow"
        type="button"
        aria-label="Предыдущие ходы"
        disabled={!scroll.before}
        onClick={() =>
          timeline.current?.scrollBy({
            left: -timeline.current.clientWidth * 0.75,
            behavior: 'smooth',
          })
        }
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <div className="battle-timeline" ref={timeline}>
        <RoundMarker round={view.round} />
        <div className="battle-current-queue" role="group" aria-label="Предстоящие ходы">
          {upcoming.map((id, index) => (
            <InitiativeUnit key={id} {...props} id={id} index={index} round={view.round} />
          ))}
        </div>
        {forecast && forecast.unitIds.length > 0 && (
          <>
            <RoundMarker round={forecast.round} forecast />
            <div className="battle-next-queue" role="group" aria-label="Прогноз следующего раунда">
              {forecast.unitIds.map((id, index) => (
                <InitiativeUnit
                  key={id}
                  {...props}
                  id={id}
                  index={index}
                  round={forecast.round}
                  forecast
                />
              ))}
            </div>
          </>
        )}
      </div>
      <button
        className="battle-control battle-timeline-arrow"
        type="button"
        aria-label="Следующие ходы"
        disabled={!scroll.after}
        onClick={() =>
          timeline.current?.scrollBy({
            left: timeline.current.clientWidth * 0.75,
            behavior: 'smooth',
          })
        }
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}

function RoundMarker({ round, forecast = false }: { round: number; forecast?: boolean }) {
  return (
    <div
      className={`battle-round-divider${forecast ? ' battle-next-round' : ''}`}
      title={forecast ? 'Прогноз по текущей инициативе' : undefined}
    >
      <span>Раунд</span>
      <b>{round}</b>
      {forecast && <small>прогноз</small>}
    </div>
  );
}

function InitiativeUnit({
  view,
  selectedUnitId,
  onSelectUnit,
  isAttackable,
  setInitiativePointer,
  setInitiativeFocus,
  setHoveredTarget,
  id,
  index,
  round,
  forecast = false,
}: Props & { id: string; index: number; round: number; forecast?: boolean }) {
  const unit = view.units.find((candidate) => candidate.id === id);
  if (unit?.status !== 'active') return null;
  const side = unit.sideId === view.controlledSideId ? 'Союзник' : 'Противник';
  const current = !forecast && view.activation?.actorId === id;
  const attackable = isAttackable(unit);
  const label = initiativeLabel({ unit, forecast, round, index, side, attackable });
  const currentStep = current ? 'step' : undefined;
  return (
    <button
      className="initiative-unit battle-control"
      type="button"
      data-unit-id={id}
      data-side={unit.sideId === view.controlledSideId ? 'human' : 'opponent'}
      data-forecast={forecast || undefined}
      aria-label={label}
      aria-current={currentStep}
      aria-pressed={selectedUnitId === id}
      data-attackable={attackable ? 'true' : undefined}
      onClick={() => onSelectUnit(id)}
      onMouseEnter={() => setInitiativePointer(id)}
      onMouseLeave={() => setInitiativePointer(null)}
      onFocus={() => {
        setHoveredTarget(null);
        setInitiativeFocus(id);
      }}
      onBlur={() => setInitiativeFocus(null)}
    >
      <Portrait unit={unit} />
      <span className="battle-side-mark" aria-label={side} title={side} />
      <b className="battle-order-number">{index + 1}</b>
      {current && <span className="battle-turn-now">ХОД</span>}
      <UnitStates unit={unit} view={view} compact />
      <InitiativeTooltip unit={unit} attackable={attackable} />
    </button>
  );
}

function InitiativeTooltip({ unit, attackable }: { unit: Unit; attackable: boolean | undefined }) {
  return (
    <span className="battle-initiative-tip" role="tooltip">
      <strong>{unit.name ?? unit.id}</strong>
      <span>
        {unitStatus[unit.status]} · инициатива {unit.initiative}
      </span>
      {attackable && <span>Можно атаковать</span>}
    </span>
  );
}

function initiativeLabel({
  unit,
  forecast,
  round,
  index,
  side,
  attackable,
}: {
  unit: Unit;
  forecast: boolean;
  round: number;
  index: number;
  side: string;
  attackable: boolean | undefined;
}): string {
  return `${forecast ? 'Прогноз: ' : ''}Раунд ${round}, ${index + 1}. ${unit.name ?? unit.id} · ${side}${attackable ? ' · Можно атаковать' : ''}`;
}

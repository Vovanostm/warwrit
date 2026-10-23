import { useEffect, useId, useRef, useState } from 'react';
import type { BattlePresentationView, Unit } from './battle-presentation.js';
import { Portrait } from './BattleUnitCard.js';
import { poolLabels, unitStatus } from './battle-hud-format.js';

type OutcomeProps = {
  view: BattlePresentationView;
  inspected?: Unit | undefined;
  busy: boolean;
  onRestart: (() => void) | undefined;
  onEditor: (() => void) | undefined;
};

function useOutcomeDisclosure() {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const focusRequested = useRef(false);
  useEffect(() => {
    if (!focusRequested.current) return;
    toggleRef.current?.focus();
    focusRequested.current = false;
  }, [expanded]);
  const toggle = () => {
    focusRequested.current = true;
    setExpanded(!expanded);
  };
  return { expanded, panelId, toggleRef, toggle };
}
type Disclosure = ReturnType<typeof useOutcomeDisclosure>;

export function BattleOutcome({ view, inspected, ...actions }: OutcomeProps) {
  const disclosure = useOutcomeDisclosure();
  if (view.status !== 'resolved' || !view.outcome) return null;
  return (
    <>
      <OutcomeSummary view={view} disclosure={disclosure} />
      <section
        id={disclosure.panelId}
        className="battle-outcome-panel"
        aria-label="Результат боя"
        hidden={!disclosure.expanded}
      >
        <p>РАУНД {view.round} · БОЙ ЗАВЕРШЁН</p>
        <h2>{outcomeTitle(view)}</h2>
        <small>{outcomeDescription(view)}</small>
        <div className="battle-outcome-sides">
          {outcomeSideIds(view).map((sideId, index) => (
            <OutcomeSide key={`${sideId ?? 'unknown'}:${index}`} sideId={sideId} view={view} />
          ))}
        </div>
        <OutcomeActions {...actions} disclosure={disclosure} />
      </section>
      {!disclosure.expanded && inspected && <FinalInspection unit={inspected} />}
    </>
  );
}

function OutcomeSummary({
  view,
  disclosure,
}: {
  view: BattlePresentationView;
  disclosure: Disclosure;
}) {
  const summary = `${outcomeTitle(view)} · Раунд ${view.round}`;
  return (
    <>
      <span className="battle-outcome-announcement" role="status">
        {summary}
      </span>
      {!disclosure.expanded && (
        <button
          ref={disclosure.toggleRef}
          className="battle-control battle-outcome-summary"
          type="button"
          aria-expanded={false}
          aria-controls={disclosure.panelId}
          onClick={disclosure.toggle}
        >
          {summary}
        </button>
      )}
    </>
  );
}

function OutcomeActions({
  disclosure,
  busy,
  onRestart,
  onEditor,
}: Omit<OutcomeProps, 'view' | 'inspected'> & { disclosure: Disclosure }) {
  return (
    <footer>
      <button
        ref={disclosure.expanded ? disclosure.toggleRef : undefined}
        className="battle-control"
        type="button"
        aria-expanded={true}
        aria-controls={disclosure.panelId}
        onClick={disclosure.toggle}
      >
        Осмотреть поле
      </button>
      {onRestart && (
        <button className="battle-control" type="button" disabled={busy} onClick={onRestart}>
          Начать заново
        </button>
      )}
      {onEditor && (
        <button className="battle-control" type="button" disabled={busy} onClick={onEditor}>
          К редактору
        </button>
      )}
    </footer>
  );
}

function finalPool(pool: Unit['pools']['health']) {
  if (!pool) return 'Нет данных';
  return pool.maximum === undefined ? `${pool.current}` : `${pool.current}/${pool.maximum}`;
}

function finalWounds(wounds: Unit['wounds']) {
  if (!wounds) return 'Ранения: нет данных';
  if (wounds.length === 0) return 'Нет ранений';
  const minor = wounds.filter((wound) => wound === 'minor').length;
  const severe = wounds.filter((wound) => wound === 'severe').length;
  return `Лёгкие: ${minor} · Тяжёлые: ${severe}`;
}

function FinalInspection({ unit }: { unit: Unit }) {
  return (
    <section
      className="battle-outcome-inspection"
      aria-label="Итоговое состояние бойца"
      data-unit-id={unit.id}
    >
      <Portrait unit={unit} />
      <div>
        <strong>{unit.name ?? unit.id}</strong>
        <p>{unitStatus[unit.status]}</p>
        {(['health', 'armor', 'stamina', 'morale'] as const).map((resource) => (
          <p key={resource}>
            {poolLabels[resource]}: {finalPool(unit.pools[resource])}
          </p>
        ))}
        <p>{finalWounds(unit.wounds)}</p>
      </div>
    </section>
  );
}

function outcomeTitle(view: BattlePresentationView) {
  if (view.outcome?.winnerSideId === null) return 'Ничья';
  if (view.viewerSideKnown === false) return 'Бой завершён';
  return view.outcome?.winnerSideId === view.controlledSideId ? 'Победа' : 'Поражение';
}

function outcomeDescription(view: BattlePresentationView) {
  if (view.outcome?.reason === 'round-limit') return 'Достигнут предел раундов.';
  if (view.viewerSideKnown === false)
    return 'Победившая сторона определена; принадлежность вашей компании неизвестна.';
  return view.outcome?.winnerSideId === view.controlledSideId
    ? 'У противника не осталось бойцов в строю.'
    : 'В вашем отряде не осталось бойцов в строю.';
}

function outcomeSideIds(view: BattlePresentationView): (string | undefined)[] {
  if (view.viewerSideKnown === false) return (view.sides ?? []).map((side) => side.id);
  return [
    view.controlledSideId,
    (view.sides ?? []).find((side) => side.id !== view.controlledSideId)?.id,
  ];
}

function OutcomeSide({
  sideId,
  view,
}: {
  sideId: string | undefined;
  view: BattlePresentationView;
}) {
  const units = view.units.filter((unit) => unit.sideId === sideId);
  const label =
    view.viewerSideKnown === false
      ? 'Сторона'
      : sideId === view.controlledSideId
        ? 'Ваш отряд'
        : 'Противник';
  return (
    <div>
      <strong>{label}</strong>
      <span>
        В строю <b>{units.filter((unit) => unit.status === 'active').length}</b>
      </span>
      <span>
        Погибли <b>{units.filter((unit) => unit.status === 'dead').length}</b>
      </span>
      <span>
        Ушли <b>{units.filter((unit) => unit.status === 'retreated').length}</b>
      </span>
      <span>
        Сдались <b>{units.filter((unit) => unit.status === 'surrendered').length}</b>
      </span>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CombatLabView } from '@warwrit/protocol';
import { Portrait } from './BattleUnitCard.js';
import { poolLabels, unitStatus } from './battle-hud-format.js';

type Unit = CombatLabView['units'][number];

function FinalFighter({ unit, inspected = false }: { unit: Unit; inspected?: boolean }) {
  const minor = unit.wounds.filter((wound) => wound === 'minor').length;
  const severe = unit.wounds.filter((wound) => wound === 'severe').length;
  const resources = inspected
    ? (['health', 'armor', 'stamina', 'morale'] as const)
    : (['health', 'armor'] as const);
  return (
    <div className="battle-outcome-fighter" data-unit-id={unit.id}>
      <Portrait unit={unit} />
      <div className="battle-outcome-fighter-data">
        <div className="battle-outcome-identity">
          <strong>{unit.name ?? unit.id}</strong>
          <span>{unitStatus[unit.status]}</span>
        </div>
        <div className="battle-outcome-pools">
          {resources.map((resource) => (
            <span key={resource}>
              {poolLabels[resource]} {unit.pools[resource].current}/{unit.pools[resource].maximum}
            </span>
          ))}
        </div>
        <div className="battle-outcome-wounds">
          {unit.wounds.length === 0 ? (
            'Нет ранений'
          ) : (
            <>
              <span>Лёгкие: {minor}</span>
              <span>Тяжёлые: {severe}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FinalRoster({ view }: { view: CombatLabView }) {
  return (
    <div className="battle-outcome-sides">
      {[
        view.controlledSideId,
        ...view.sides.filter((side) => side.id !== view.controlledSideId).map((side) => side.id),
      ].map((sideId) => (
        <section
          key={sideId}
          data-side-id={sideId}
          aria-label={sideId === view.controlledSideId ? 'Ваш отряд' : 'Противник'}
        >
          <h3>{sideId === view.controlledSideId ? 'Ваш отряд' : 'Противник'}</h3>
          {view.units
            .filter((unit) => unit.sideId === sideId)
            .map((unit) => (
              <FinalFighter key={unit.id} unit={unit} />
            ))}
        </section>
      ))}
    </div>
  );
}

function OutcomeActions({
  panelId,
  toggleRef,
  onToggle,
  busy,
  onRestart,
  onEditor,
}: {
  panelId: string;
  toggleRef: RefObject<HTMLButtonElement | null> | undefined;
  onToggle: () => void;
  busy: boolean;
  onRestart: (() => void) | undefined;
  onEditor: (() => void) | undefined;
}) {
  return (
    <footer>
      <button
        ref={toggleRef}
        className="battle-control"
        type="button"
        aria-expanded={true}
        aria-controls={panelId}
        onClick={onToggle}
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

function OutcomeHeader({
  result,
  round,
  outcome,
  controlledSideId,
}: {
  result: string;
  round: number;
  outcome: NonNullable<CombatLabView['outcome']>;
  controlledSideId: string;
}) {
  return (
    <header>
      <h2>{result}</h2>
      <p>Раунд {round} · Бой завершён</p>
      <p>
        {outcome.reason === 'round-limit'
          ? 'Достигнут предел раундов.'
          : outcome.winnerSideId === controlledSideId
            ? 'У противника не осталось бойцов в строю.'
            : 'В вашем отряде не осталось бойцов в строю.'}
      </p>
    </header>
  );
}

export function BattleOutcome({
  view,
  inspected,
  busy,
  onRestart,
  onEditor,
}: {
  view: CombatLabView;
  inspected?: Unit | undefined;
  busy: boolean;
  onRestart: (() => void) | undefined;
  onEditor: (() => void) | undefined;
}) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const focusRequested = useRef(false);
  useEffect(() => {
    if (!focusRequested.current) return;
    toggleRef.current?.focus();
    focusRequested.current = false;
  }, [expanded]);
  if (view.status !== 'resolved' || !view.outcome) return null;
  const result =
    view.outcome.winnerSideId === null
      ? 'Ничья'
      : view.outcome.winnerSideId === view.controlledSideId
        ? 'Победа'
        : 'Поражение';
  const toggle = () => {
    focusRequested.current = true;
    setExpanded(!expanded);
  };
  return (
    <>
      <span className="battle-outcome-announcement" role="status">
        {result} · Раунд {view.round}
      </span>
      <section
        id={panelId}
        className="battle-outcome-panel"
        aria-label="Результат боя"
        hidden={!expanded}
      >
        <OutcomeHeader
          result={result}
          round={view.round}
          outcome={view.outcome}
          controlledSideId={view.controlledSideId}
        />
        <FinalRoster view={view} />
        <OutcomeActions
          panelId={panelId}
          toggleRef={expanded ? toggleRef : undefined}
          onToggle={toggle}
          busy={busy}
          onRestart={onRestart}
          onEditor={onEditor}
        />
      </section>
      {!expanded && (
        <>
          <button
            ref={toggleRef}
            className="battle-control battle-outcome-summary"
            type="button"
            aria-expanded={false}
            aria-controls={panelId}
            onClick={toggle}
          >
            {result} · Раунд {view.round}
          </button>
          {inspected && (
            <section className="battle-outcome-inspection" aria-label="Итоговое состояние бойца">
              <FinalFighter unit={inspected} inspected />
            </section>
          )}
        </>
      )}
    </>
  );
}

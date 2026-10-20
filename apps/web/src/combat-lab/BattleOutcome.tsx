import type { BattlePresentationView } from './battle-presentation.js';
export function BattleOutcome({
  view,
  busy,
  onRestart,
  onEditor,
}: {
  view: BattlePresentationView;
  busy: boolean;
  onRestart: (() => void) | undefined;
  onEditor: (() => void) | undefined;
}) {
  return (
    <>
      {' '}
      {view.status === 'resolved' && view.outcome && (
        <section className="battle-outcome-panel" aria-label="Результат боя" role="status">
          <p>РАУНД {view.round} · БОЙ ЗАВЕРШЁН</p>
          <h2>{outcomeTitle(view)}</h2>
          <small>{outcomeDescription(view)}</small>
          <div className="battle-outcome-sides">
            {outcomeSideIds(view).map((sideId, index) => (
              <OutcomeSide key={`${sideId ?? 'unknown'}:${index}`} sideId={sideId} view={view} />
            ))}
          </div>
          <footer>
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
        </section>
      )}
    </>
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
  return [view.controlledSideId, (view.sides ?? []).find((side) => side.id !== view.controlledSideId)?.id];
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

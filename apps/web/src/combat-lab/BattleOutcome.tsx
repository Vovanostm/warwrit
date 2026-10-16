import type { CombatLabView } from '@warwrit/protocol';
export function BattleOutcome({
  view,
  busy,
  onRestart,
  onEditor,
}: {
  view: CombatLabView;
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
          <h2>
            {view.outcome.winnerSideId === null
              ? 'Ничья'
              : view.outcome.winnerSideId === view.controlledSideId
                ? 'Победа'
                : 'Поражение'}
          </h2>
          <small>
            {view.outcome.reason === 'round-limit'
              ? 'Достигнут предел раундов.'
              : view.outcome.winnerSideId === view.controlledSideId
                ? 'У противника не осталось бойцов в строю.'
                : 'В вашем отряде не осталось бойцов в строю.'}
          </small>
          <div className="battle-outcome-sides">
            {[
              view.controlledSideId,
              view.sides.find((side) => side.id !== view.controlledSideId)?.id,
            ].map((sideId) => {
              const units = view.units.filter((unit) => unit.sideId === sideId);
              return (
                <div key={sideId}>
                  <strong>{sideId === view.controlledSideId ? 'Ваш отряд' : 'Противник'}</strong>
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
            })}
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

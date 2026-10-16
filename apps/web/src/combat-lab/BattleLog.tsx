import type { CombatLabView } from '@warwrit/protocol';
import { eventText, unitStatus } from './battle-hud-format.js';
export function BattleLog({
  view,
  status,
  selectedUnitId,
  onSelectUnit,
}: {
  view: CombatLabView;
  status: string;
  selectedUnitId: string | null;
  onSelectUnit: (id: string) => void;
}) {
  return (
    <details className="battle-log">
      <summary>События боя ({view.events.length})</summary>
      <div className="battle-log-content">
        <p className="battle-status-line">{status}</p>
        <p>15 × 11 гексов · без сохранения кампании</p>
        {view.omittedEventPrefix > 0 && <p>Ранние события: {view.omittedEventPrefix}</p>}
        <ol>
          {view.events.map((event) => (
            <li key={event.id}>{eventText(view, event)}</li>
          ))}
        </ol>
        {view.outcome && (
          <p className="battle-result">
            {view.outcome.reason === 'round-limit'
              ? 'Достигнут предел раундов.'
              : 'На поле осталась одна сторона.'}
          </p>
        )}
        <p className="battle-icon-credits">
          Иконки: Lorc, Delapouite, Sbed ·{' '}
          <a href="https://game-icons.net" target="_blank" rel="noreferrer">
            Game Icons
          </a>
          {' · '}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
            CC BY 3.0
          </a>
          {' · адаптированы для интерфейса'}
        </p>
        <div className="battle-unit-rail" aria-label="Бойцы на поле">
          {view.units.map((unit) => (
            <button
              className="battle-roster-unit battle-control"
              key={unit.id}
              type="button"
              aria-pressed={selectedUnitId === unit.id}
              onClick={() => onSelectUnit(unit.id)}
            >
              {unit.name ?? unit.id} · {unitStatus[unit.status]}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

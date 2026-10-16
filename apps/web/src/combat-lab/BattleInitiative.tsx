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
export function BattleInitiative({
  view,
  selectedUnitId,
  onSelectUnit,
  isAttackable,
  setInitiativePointer,
  setInitiativeFocus,
  setHoveredTarget,
}: Props) {
  return (
    <nav className="battle-initiative" aria-label="Очередь инициативы">
      <div className="battle-round-divider">
        <b>{view.round}</b>
        <span>
          РАУНД
          <br />
          СЕЙЧАС →
        </span>
      </div>
      <div className="battle-current-queue">
        {view.initiativeOrder.map((id, index) => {
          const unit = view.units.find((u) => u.id === id);
          if (!unit) return null;
          return (
            <InitiativeUnit
              key={id}
              {...{
                view,
                selectedUnitId,
                onSelectUnit,
                isAttackable,
                setInitiativePointer,
                setInitiativeFocus,
                setHoveredTarget,
              }}
              unit={unit}
              index={index}
            />
          );
        })}
      </div>
      {view.status === 'active' && (
        <div className="battle-round-divider battle-next-round">
          <b>{view.round + 1}</b>
          <span>
            РАУНД
            <br />
            ПОРЯДОК НЕИЗВЕСТЕН
          </span>
        </div>
      )}
      {view.status === 'active' && (
        <span
          className="battle-unknown-order"
          title="Порядок следующего раунда ещё не получен от сервера"
        >
          ?
        </span>
      )}
    </nav>
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
  unit,
  index,
}: Props & { unit: Unit; index: number }) {
  const id = unit.id;
  const side = unit.sideId === view.controlledSideId ? 'Союзник' : 'Противник';
  const attackable = isAttackable(unit);
  const turn = initiativeTurn(view, id, index);
  return (
    <button
      className="initiative-unit battle-control"
      key={id}
      type="button"
      data-side={unit.sideId === view.controlledSideId ? 'human' : 'opponent'}
      data-past={index < view.turnIndex}
      aria-label={`Раунд ${view.round}, ${index + 1}. ${unit.name ?? unit.id} · ${side}${attackable ? ' · Можно атаковать' : ''}`}
      aria-current={view.activation?.actorId === id ? 'step' : undefined}
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
      <TurnBadge turn={turn} />
      <UnitStates unit={unit} view={view} compact />
      <span className="battle-initiative-tip" role="tooltip">
        <strong>{unit.name ?? unit.id}</strong>
        <span>
          {unitStatus[unit.status]} · инициатива {unit.initiative}
          {turn && ` · ${turn}`}
        </span>
        {attackable && <span>Можно атаковать</span>}
      </span>
    </button>
  );
}

function initiativeTurn(view: CombatLabView, id: string, index: number) {
  if (view.status !== 'active') return '';
  if (view.activation?.actorId === id) return 'Сейчас ходит';
  return index < view.turnIndex ? 'Ход завершён' : 'Ожидает хода';
}

function TurnBadge({ turn }: { turn: string }) {
  return (
    <>
      {' '}
      {turn === 'Сейчас ходит' ? (
        <span className="battle-turn-now">ХОД</span>
      ) : (
        turn === 'Ход завершён' && (
          <span className="battle-turn-acted" aria-label="Ход завершён">
            ✓
          </span>
        )
      )}
    </>
  );
}

import { BattleCost } from './BattleCost.js';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type {
  CombatLabAction,
  CombatLabHex,
  CombatLabSkillId,
  CombatLabView,
} from '@warwrit/protocol';
import { commandSelection, commandReasons } from './command-availability.js';
import { CombatIcon, type CombatIconName } from './CombatIcon.js';
import { advanceEndTurnConfirmation, type CombatLabHotkeyAction } from './command-input.js';
import { manualControlReasons } from './command-desk-state.js';

interface CommandDeskProps {
  readonly view: CombatLabView;
  readonly selectedUnitId: string | null;
  readonly selectedHex: CombatLabHex | null;
  readonly commonReason: string;
  readonly selectedSkillId: CombatLabSkillId | null;
  readonly menuOpen: boolean;
  readonly hotkeyActions: RefObject<Record<string, CombatLabHotkeyAction>>;
  readonly act: (intent: CombatLabAction['intent'], description: string) => void;
  readonly actOnField: (intent: CombatLabAction['intent']) => void;
  readonly autoplay: boolean;
  readonly pending: { readonly uncertain: boolean; readonly description: string } | null;
  readonly retryAction: () => void;
  readonly notice: string;
}

export function CommandDesk({
  view,
  selectedUnitId,
  selectedHex,
  commonReason,
  selectedSkillId,
  menuOpen,
  hotkeyActions,
  act,
  actOnField,
  autoplay,
  pending,
  retryAction,
  notice,
}: CommandDeskProps) {
  const selection = commandSelection(view, selectedUnitId, selectedHex);
  const { selectedMovement, activeActor, attackCost } = selection;
  const reasons = commandReasons(selection, view, selectedHex, commonReason);
  const { manualReason, menuReason } = manualControlReasons({
    commonReason,
    pending,
    autoplay,
    menuOpen,
    selectedSkillId,
  });
  const endTurn = useEndTurnConfirmation(
    view,
    attackCost?.actionPointCost,
    manualReason || reasons.waitReason,
    act,
  );
  return (
    <section className="combat-lab-controls" aria-label="Управление текущим ходом">
      <CommandOrders
        selection={selection}
        reasons={reasons}
        selectedHex={selectedHex}
        manualReason={manualReason}
        menuReason={menuReason}
        hotkeyActions={hotkeyActions}
        act={act}
        actOnField={actOnField}
        endTurn={endTurn}
      />

      <CommandFeedback
        selectedMovement={selectedMovement}
        activeActor={activeActor}
        autoplay={autoplay}
        pending={pending}
        retryAction={retryAction}
        notice={notice}
        endTurnWarning={endTurn.warning}
      />
    </section>
  );
}

interface CommandOrdersProps {
  readonly selection: ReturnType<typeof commandSelection>;
  readonly reasons: ReturnType<typeof commandReasons>;
  readonly selectedHex: CommandDeskProps['selectedHex'];
  readonly manualReason: string;
  readonly menuReason: string;
  readonly hotkeyActions: CommandDeskProps['hotkeyActions'];
  readonly act: CommandDeskProps['act'];
  readonly actOnField: CommandDeskProps['actOnField'];
  readonly endTurn: ReturnType<typeof useEndTurnConfirmation>;
}

function CommandOrders({
  selection,
  reasons,
  selectedHex,
  manualReason,
  menuReason,
  hotkeyActions,
  act,
  actOnField,
  endTurn,
}: CommandOrdersProps) {
  const { selectedTarget, selectedMovement, selectedAttack, rules, attackCost } = selection;
  const { attackReason, moveReason, defendReason, waitReason, retreatReason } = reasons;
  hotkeyActions.current = {};
  const actionButton = (
    label: string,
    cost: string,
    reason: string,
    onClick: () => unknown,
    detail: string,
    price?: { readonly actionPointCost: number; readonly staminaCost: number },
  ) => (
    <CommandButton
      label={label}
      cost={cost}
      reason={reason}
      onClick={onClick}
      detail={detail}
      price={price}
      selectedAttack={selectedAttack}
      manualReason={manualReason}
      menuReason={menuReason}
      hotkeyActions={hotkeyActions}
      endTurn={endTurn}
    />
  );
  return (
    <div className="battle-command-group">
      <small>ПРИКАЗЫ</small>
      <div className="combat-lab-actions">
        {actionButton(
          'Атаковать',
          publishedCost(selectedAttack ?? attackCost, 'Выберите цель'),
          attackReason,
          () => selectedTarget && actOnField({ type: 'attack', targetId: selectedTarget.id }),
          selectedTarget?.name ?? selectedTarget?.id ?? 'Выберите противника',
          selectedAttack ?? attackCost,
        )}
        {actionButton(
          'Переместиться',
          publishedCost(selectedMovement, 'Цена по пути'),
          moveReason,
          () => selectedHex && actOnField({ type: 'move', to: selectedHex }),
          selectedHex ? `Клетка ${selectedHex.q}, ${selectedHex.r}` : 'Выберите клетку',
          selectedMovement,
        )}
        {actionButton(
          'Защищаться',
          publishedCost(rules?.defend, 'Цена не опубликована'),
          defendReason,
          () => act({ type: 'defend' }, 'Защита'),
          rules?.defend.damageReductionPercent !== undefined
            ? `Сила входящего удара −${rules.defend.damageReductionPercent}% · завершает ход`
            : 'Защита · завершает ход',
          rules?.defend,
        )}
        {actionButton(
          'Завершить ход',
          'Оставшиеся ОД',
          waitReason,
          endTurn.request,
          rules
            ? `Передать инициативу · восстановление ${rules.recovery.staminaPerActivation} сил в начале следующего хода`
            : 'Передать инициативу',
        )}
        {actionButton(
          'Отступить',
          'Завершает ход',
          retreatReason,
          () => act({ type: 'retreat' }, 'Отступление'),
          'Уйти с поля',
        )}
      </div>
    </div>
  );
}

interface CommandButtonProps extends Pick<
  CommandOrdersProps,
  'manualReason' | 'menuReason' | 'hotkeyActions' | 'endTurn'
> {
  readonly label: string;
  readonly cost: string;
  readonly reason: string;
  readonly onClick: () => unknown;
  readonly detail: string;
  readonly price: { readonly actionPointCost: number; readonly staminaCost: number } | undefined;
  readonly selectedAttack: CommandOrdersProps['selection']['selectedAttack'];
}

function CommandButton({
  label,
  cost,
  reason,
  onClick,
  detail,
  price,
  selectedAttack,
  manualReason,
  menuReason,
  hotkeyActions,
  endTurn,
}: CommandButtonProps) {
  const commandIcons: Record<string, CombatIconName> = {
    Атаковать: 'attack',
    Переместиться: 'move',
    Защищаться: 'defend',
    'Завершить ход': 'wait',
    Отступить: 'retreat',
  };
  const commandKeys: Record<string, string> = {
    Атаковать: '1',
    Переместиться: '2',
    Защищаться: '3',
    'Завершить ход': '4',
    Отступить: '5',
  };
  reason = manualReason || reason;
  const key = commandKeys[label]!;
  const run = () => {
    if (reason) return;
    if (key !== '4') endTurn.cancel();
    onClick();
  };
  hotkeyActions.current[key] = {
    reason: menuReason || reason,
    run,
    ...(key === '4' ? { cancel: endTurn.cancel } : {}),
  };
  return (
    <div className="battle-command battle-control-slot" data-unavailable={Boolean(reason)}>
      <button
        className="battle-control battle-control--icon"
        data-ready={label === 'Атаковать' && Boolean(selectedAttack) && !reason}
        type="button"
        aria-label={label}
        aria-disabled={reason.length > 0}
        onClick={run}
        onKeyDown={(event) => {
          if (event.repeat) event.preventDefault();
        }}
        aria-describedby={`command-${label.replaceAll(' ', '-')}`}
      >
        <CombatIcon name={commandIcons[label]!} />
        {reason && <span className="battle-unavailable-mark" aria-hidden="true" />}
        <kbd aria-hidden="true">{key}</kbd>
      </button>
      <CommandButtonDetails
        label={label}
        cost={cost}
        price={price}
        detail={detail}
        reason={reason}
        commandKey={key}
      />
    </div>
  );
}

function CommandButtonDetails({
  label,
  cost,
  price,
  detail,
  reason,
  commandKey,
}: Pick<CommandButtonProps, 'label' | 'cost' | 'price' | 'detail' | 'reason'> & {
  readonly commandKey: string;
}) {
  return (
    <>
      <span className="battle-command-label">{shortCommandLabel[label]}</span>
      {price && <BattleCost cost={price} />}
      {label === 'Завершить ход' && <span className="battle-action-cost">Все ОД</span>}
      <div
        role="tooltip"
        id={`command-${label.replaceAll(' ', '-')}`}
        className="battle-command-tooltip"
      >
        <strong>
          {label} <kbd>{commandKey}</kbd>
        </strong>
        <span>{cost}</span>
        <small className={reason ? 'battle-command-reason' : ''}>{reason || detail}</small>
      </div>
    </>
  );
}

interface CommandFeedbackProps {
  readonly selectedMovement: ReturnType<typeof commandSelection>['selectedMovement'];
  readonly activeActor: ReturnType<typeof commandSelection>['activeActor'];
  readonly autoplay: boolean;
  readonly pending: CommandDeskProps['pending'];
  readonly retryAction: () => void;
  readonly notice: string;
  readonly endTurnWarning: string;
}

function CommandFeedback({
  selectedMovement,
  activeActor,
  autoplay,
  pending,
  retryAction,
  notice,
  endTurnWarning,
}: CommandFeedbackProps) {
  return (
    <div className="battle-feedback-row">
      <p className="battle-end-turn-warning" role="status" aria-live="polite" aria-atomic="true">
        {endTurnWarning}
      </p>
      {autoplay && (
        <span className="battle-autoplay-status" role="status" data-active="true">
          Автобой включён
        </span>
      )}
      <MovementWarning selectedMovement={selectedMovement} activeActor={activeActor} />
      <PendingCommandStatus pending={pending} retryAction={retryAction} />
      {notice && (
        <p className="battle-dock-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}

function MovementWarning({
  selectedMovement,
  activeActor,
}: Pick<CommandFeedbackProps, 'selectedMovement' | 'activeActor'>) {
  if (!selectedMovement?.fireDamage) return null;
  return (
    <p className="battle-danger-warning">
      {selectedMovement.fireDamage >= (activeActor?.pools.health.current ?? Infinity)
        ? 'Боец погибнет на пути и не достигнет клетки.'
        : `Огонь: −${selectedMovement.fireDamage} здоровья.`}{' '}
      Требуется подтверждение.
    </p>
  );
}

function PendingCommandStatus({
  pending,
  retryAction,
}: Pick<CommandFeedbackProps, 'pending' | 'retryAction'>) {
  if (!pending) return null;
  return (
    <p role="status" className="battle-pending-status">
      <span>
        {pending.uncertain
          ? `Неизвестный ответ: ${pending.description}.`
          : `Ожидается ответ: ${pending.description}.`}
      </span>
      {pending.uncertain && (
        <button className="battle-control" type="button" onClick={retryAction}>
          Повторить тот же запрос
        </button>
      )}
    </p>
  );
}

/** Published observations and identity for the local warning, not command admission. */
function endTurnObservation(view: CombatLabView, attackCost: number | undefined, reason: string) {
  const activation = view.activation;
  const actionPoints = activation?.actionPoints ?? { current: 0, maximum: 0 };
  return {
    context: JSON.stringify([
      view.sessionId,
      view.battleId,
      activation?.id,
      activation?.actorId,
      view.viewRevision,
    ]),
    current: actionPoints.current,
    maximum: actionPoints.maximum,
    attackCost,
    available: !reason && view.status === 'active' && Boolean(activation),
  };
}

function useEndTurnConfirmation(
  view: CombatLabView,
  attackCost: number | undefined,
  reason: string,
  act: CommandDeskProps['act'],
) {
  type Confirmation = ReturnType<typeof advanceEndTurnConfirmation>['confirmation'];
  const confirmation = useRef<Confirmation>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [warning, setWarning] = useState<Confirmation>(null);
  const observation = endTurnObservation(view, attackCost, reason);
  const { context, available } = observation;
  // Invalidate before input can run; effects alone leave a stale-confirmation window.
  if (!available || confirmation.current?.context !== context) confirmation.current = null;
  const cancel = useCallback(() => {
    confirmation.current = null;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setWarning(null);
  }, []);
  useEffect(() => cancel, [context, available, cancel]);
  const request = () => {
    const result = advanceEndTurnConfirmation(confirmation.current, observation, Date.now());
    cancel();
    confirmation.current = result.confirmation;
    if (result.dispatch) {
      act({ type: 'wait' }, 'Завершение хода');
      return;
    }
    if (result.confirmation) {
      setWarning(result.confirmation);
      timer.current = setTimeout(cancel, Math.max(0, result.confirmation.deadline - Date.now()));
    }
  };
  return {
    request,
    cancel,
    warning:
      // The ref is cleared synchronously above on any unavailable or foreign context.
      warning && warning === confirmation.current
        ? `Ещё раз — завершить; ОД не потрачены: ${observation.current}`
        : '',
  };
}

function publishedCost(
  cost: { readonly actionPointCost: number; readonly staminaCost: number } | undefined,
  fallback: string,
): string {
  return cost ? `${cost.actionPointCost} ОД · силы ${cost.staminaCost}` : fallback;
}

const shortCommandLabel: Readonly<Record<string, string>> = {
  Атаковать: 'Атака',
  Переместиться: 'Движение',
  Защищаться: 'Защита',
  'Завершить ход': 'Конец хода',
  Отступить: 'Отступить',
};

import { BattleCost } from './BattleCost.js';
import type { RefObject } from 'react';
import type {
  CombatLabAction,
  CombatLabHex,
  CombatLabSkillId,
  CombatLabView,
} from '@warwrit/protocol';
import { commandSelection, commandReasons } from './command-availability.js';
import { CombatIcon, type CombatIconName } from './CombatIcon.js';

interface CommandDeskProps {
  readonly view: CombatLabView;
  readonly selectedUnitId: string | null;
  readonly selectedHex: CombatLabHex | null;
  readonly commonReason: string;
  readonly selectedSkillId: CombatLabSkillId | null;
  readonly menuOpen: boolean;
  readonly hotkeyActions: RefObject<Record<string, { reason: string; run: () => unknown }>>;
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
  const { selectedTarget, selectedMovement, selectedAttack, activeActor, rules, attackCost } =
    selection;
  const { attackReason, moveReason, defendReason, waitReason, retreatReason } = commandReasons(
    selection,
    view,
    selectedHex,
    commonReason,
  );
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
  hotkeyActions.current = {};
  const actionButton = (
    label: string,
    cost: string,
    reason: string,
    onClick: () => unknown,
    detail: string,
    price?: { readonly actionPointCost: number; readonly staminaCost: number },
  ) => {
    reason = selectedSkillId ? 'Выбран приём · Esc — отменить' : reason;
    const key = commandKeys[label]!;
    hotkeyActions.current[key] = { reason: menuOpen ? 'Меню открыто' : reason, run: onClick };
    return (
      <div className="battle-command battle-control-slot">
        <button
          className="battle-control battle-control--icon"
          type="button"
          aria-label={label}
          aria-disabled={reason.length > 0}
          onClick={() => {
            if (!reason) onClick();
          }}
          aria-describedby={`command-${label.replaceAll(' ', '-')}`}
        >
          <CombatIcon name={commandIcons[label]!} />
          <kbd aria-hidden="true">{key}</kbd>
        </button>
        <span className="battle-command-label">{shortCommandLabel[label]}</span>
        {price ? (
          <BattleCost cost={price} />
        ) : label === 'Завершить ход' ? (
          <span className="battle-action-cost">Все ОД</span>
        ) : null}
        <div
          role="tooltip"
          id={`command-${label.replaceAll(' ', '-')}`}
          className="battle-command-tooltip"
        >
          <strong>
            {label} <kbd>{key}</kbd>
          </strong>
          <span>{cost}</span>
          <small className={reason ? 'battle-command-reason' : ''}>{reason || detail}</small>
        </div>
      </div>
    );
  };
  return (
    <section className="combat-lab-controls" aria-label="Управление текущим ходом">
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
            () => act({ type: 'wait' }, 'Завершение хода'),
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

      <CommandFeedback
        selectedMovement={selectedMovement}
        activeActor={activeActor}
        autoplay={autoplay}
        pending={pending}
        retryAction={retryAction}
        notice={notice}
      />
    </section>
  );
}

interface CommandFeedbackProps {
  readonly selectedMovement: ReturnType<typeof commandSelection>['selectedMovement'];
  readonly activeActor: ReturnType<typeof commandSelection>['activeActor'];
  readonly autoplay: boolean;
  readonly pending: CommandDeskProps['pending'];
  readonly retryAction: () => void;
  readonly notice: string;
}

function CommandFeedback({
  selectedMovement,
  activeActor,
  autoplay,
  pending,
  retryAction,
  notice,
}: CommandFeedbackProps) {
  return (
    <div className="battle-feedback-row">
      {autoplay && (
        <span className="battle-autoplay-status" role="status" data-active="true">
          Автобой включён
        </span>
      )}
      {selectedMovement?.fireDamage ? (
        <p className="battle-danger-warning">
          {selectedMovement.fireDamage >= (activeActor?.pools.health.current ?? Infinity)
            ? 'Боец погибнет на пути и не достигнет клетки.'
            : `Огонь: −${selectedMovement.fireDamage} здоровья.`}{' '}
          Требуется подтверждение.
        </p>
      ) : null}
      {pending && (
        <p role="status" className="battle-pending-status">
          {pending.uncertain
            ? `Неизвестный ответ: ${pending.description}.`
            : `Ожидается ответ: ${pending.description}.`}
          {pending.uncertain && (
            <button className="battle-control" type="button" onClick={retryAction}>
              Повторить тот же запрос
            </button>
          )}
        </p>
      )}
      {notice && (
        <p className="battle-dock-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
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

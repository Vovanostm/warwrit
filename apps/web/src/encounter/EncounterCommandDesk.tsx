import type { EncounterCommandDto } from '@warwrit/protocol';
import { BattleCost } from '../combat-lab/BattleCost.js';
import { CombatIcon, type CombatIconName } from '../combat-lab/CombatIcon.js';

type Intent = EncounterCommandDto['intent'];
type PrimaryIntent = Extract<Intent, { type: 'attack' | 'move' | 'defend' | 'wait' | 'retreat' }>;
type PrimaryIntentType = PrimaryIntent['type'];
type Cost = Readonly<{ actionPointCost: number; staminaCost: number }>;

const actions: readonly Readonly<{
  label: string;
  icon: CombatIconName;
  intent: PrimaryIntentType;
}>[] = [
  { label: 'Атаковать', icon: 'attack', intent: 'attack' },
  { label: 'Переместиться', icon: 'move', intent: 'move' },
  { label: 'Защищаться', icon: 'defend', intent: 'defend' },
  { label: 'Завершить ход', icon: 'wait', intent: 'wait' },
  { label: 'Отступить', icon: 'retreat', intent: 'retreat' },
];

export function EncounterCommandDesk({
  targetLabel,
  targetId,
  destinationLabel,
  destination,
  attackCost,
  moveCost,
  moveAllowed,
  attackAllowed,
  defendAllowed,
  waitAllowed,
  retreatAllowed,
  autoplayAllowed,
  fleeAllowed,
  surrenderAllowed,
  feedback,
  busy,
  onAct,
}: {
  readonly targetLabel: string;
  readonly targetId: string;
  readonly destinationLabel: string;
  readonly destination: Readonly<{ q: number; r: number }> | null;
  readonly attackCost?: Cost;
  readonly moveCost?: Cost;
  readonly moveAllowed: boolean;
  readonly attackAllowed: boolean;
  readonly defendAllowed: boolean;
  readonly waitAllowed: boolean;
  readonly retreatAllowed: boolean;
  readonly autoplayAllowed: boolean;
  readonly fleeAllowed: boolean;
  readonly surrenderAllowed: boolean;
  readonly feedback?: string;
  readonly busy: boolean;
  readonly onAct: (intent: Intent) => void;
}) {
  const allowed: Record<Intent['type'], boolean> = {
    attack: attackAllowed,
    move: moveAllowed,
    defend: defendAllowed,
    wait: waitAllowed,
    retreat: retreatAllowed,
    flee: fleeAllowed,
    surrender: surrenderAllowed,
    autoplay: autoplayAllowed,
    'use-skill': false,
    'prepare-threat': false,
    'retarget-threat': false,
    'execute-threat': false,
  };
  return (
    <section className="combat-lab-controls" aria-label="Приказы текущего участника">
      <div className="battle-command-group">
        <small>ПРИКАЗЫ · {targetLabel}</small>
        <div className="combat-lab-actions">
          {actions.map((action) => (
            <PrimaryCommand
              key={action.intent}
              action={action}
              reason={commandReason(busy, allowed[action.intent])}
              cost={
                action.intent === 'attack'
                  ? attackCost
                  : action.intent === 'move'
                    ? moveCost
                    : undefined
              }
              targetId={targetId}
              targetLabel={targetLabel}
              destination={destination}
              destinationLabel={destinationLabel}
              onAct={onAct}
            />
          ))}
        </div>
        <div className="battle-secondary-actions" role="group" aria-label="Дополнительные приказы">
          {secondaryActions.map((action) => (
            <SecondaryCommand
              key={action.intent}
              action={action}
              reason={commandReason(busy, allowed[action.intent])}
              onAct={onAct}
            />
          ))}
        </div>
      </div>
      {feedback && (
        <div className="battle-feedback-row" role="status">
          <p>{feedback}</p>
        </div>
      )}
    </section>
  );
}

const secondaryActions = [
  { intent: 'autoplay', label: 'Автобой: одно действие' },
  { intent: 'flee', label: 'Бежать' },
  { intent: 'surrender', label: 'Сдаться' },
] as const;

function commandReason(busy: boolean, allowed: boolean) {
  return busy ? 'Ожидаем ответ сервера' : allowed ? '' : 'Сейчас недоступно';
}

function PrimaryCommand({
  action,
  reason,
  cost,
  targetId,
  targetLabel,
  destination,
  destinationLabel,
  onAct,
}: {
  action: (typeof actions)[number];
  reason: string;
  cost: Cost | undefined;
  targetId: string;
  targetLabel: string;
  destination: Readonly<{ q: number; r: number }> | null;
  destinationLabel: string;
  onAct: (intent: PrimaryIntent) => void;
}) {
  const { label, icon, intent } = action;
  const command = reason ? null : primaryCommandPayload(intent, targetId, destination);
  const enabled = command !== null;
  return (
    <div className="battle-command battle-control-slot">
      <button
        className="battle-control battle-control--icon"
        type="button"
        aria-label={label}
        aria-disabled={!enabled}
        onClick={() => {
          if (command !== null) onAct(command);
        }}
        title={reason || (intent === 'move' ? destinationLabel : targetLabel)}
        disabled={!enabled}
      >
        <CombatIcon name={icon} />
      </button>
      <span className="battle-command-label">{intent === 'move' ? destinationLabel : label}</span>
      {cost && <BattleCost cost={cost} />}
      {reason && <small className="battle-command-reason">{reason}</small>}
    </div>
  );
}

function primaryCommandPayload(
  intent: PrimaryIntentType,
  targetId: string,
  destination: Readonly<{ q: number; r: number }> | null,
): PrimaryIntent | null {
  if (intent === 'attack') return targetId ? { type: 'attack', targetId } : null;
  if (intent === 'move') return destination ? { type: 'move', to: destination } : null;
  return { type: intent };
}

function SecondaryCommand({
  action,
  reason,
  onAct,
}: {
  action: (typeof secondaryActions)[number];
  reason: string;
  onAct: (intent: Intent) => void;
}) {
  return (
    <button
      className="battle-control"
      type="button"
      disabled={reason.length > 0}
      title={reason || action.label}
      onClick={() => onAct({ type: action.intent })}
    >
      {action.label}
    </button>
  );
}

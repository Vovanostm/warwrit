import {
  COMBAT_LAB_VERSION,
  type CombatLabAcknowledgement,
  type CombatLabAction,
  type CombatLabView,
} from '@warwrit/protocol';

const rejectionCodes = new Set([
  'INVALID_REQUEST',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'STALE_VIEW',
  'INVALID_ACTION',
  'REQUEST_CONFLICT',
  'LIMIT_REACHED',
]);

export function combatSkillReasonText(reason: string | undefined): string {
  const reasons: Readonly<Record<string, string>> = {
    BATTLE_TERMINAL: 'Бой завершён.',
    NOT_ACTIVE_UNIT: 'Сейчас ходит другой боец.',
    PANICKED: 'Боец в панике.',
    SKILL_NOT_AVAILABLE: 'Приём недоступен с этим снаряжением или уже применён.',
    INVALID_TARGET: 'Приём нельзя применить к этой цели.',
    OUT_OF_RANGE: 'Цель вне дальности приёма.',
    BLOCKED_LINE_OF_SIGHT: 'Линия до цели перекрыта.',
    INSUFFICIENT_ACTION_POINTS: 'Не хватает очков действий.',
    INSUFFICIENT_STAMINA: 'Не хватает сил.',
  };
  return reason ? (reasons[reason] ?? reason) : 'Нет допустимой цели.';
}

export type CombatLabActionReplyOutcome =
  | { readonly status: 'accepted' }
  | { readonly status: 'rejected'; readonly code: string }
  | { readonly status: 'uncertain' };

/** A response only resolves the submitted action when it matches the protocol and request. */
export async function handleCombatLabActionReply(
  httpStatus: number,
  value: unknown,
  action: CombatLabAction,
  refreshLatest: () => Promise<void>,
): Promise<CombatLabActionReplyOutcome> {
  let outcome: CombatLabActionReplyOutcome = { status: 'uncertain' };
  if (httpStatus < 500 && value !== null && typeof value === 'object') {
    const reply = value as Partial<CombatLabAcknowledgement>;
    if (
      reply.version === COMBAT_LAB_VERSION &&
      reply.requestId === action.requestId &&
      reply.status === 'rejected' &&
      typeof reply.code === 'string' &&
      rejectionCodes.has(reply.code)
    ) {
      outcome = {
        status: 'rejected',
        code: reply.code,
      };
    } else if (
      reply.version === COMBAT_LAB_VERSION &&
      reply.requestId === action.requestId &&
      reply.status === 'accepted' &&
      reply.sessionId === action.sessionId &&
      reply.battleId === action.battleId &&
      Number.isSafeInteger(reply.viewRevision) &&
      (reply.viewRevision ?? -1) >= 0
    ) {
      outcome = {
        status: 'accepted',
      };
    }
  }
  try {
    await refreshLatest();
  } catch {
    // A failed projection read cannot turn an unverified acknowledgement into success.
  }
  return outcome;
}

/** Accept only a newer projection for the same volatile session and battle. */
export function latestCombatLabView(
  current: CombatLabView | null,
  incoming: CombatLabView,
): CombatLabView {
  if (
    current === null ||
    (current.sessionId === incoming.sessionId &&
      current.battleId === incoming.battleId &&
      incoming.viewRevision > current.viewRevision)
  ) {
    return incoming;
  }
  return current;
}

/** Shared presentation feedback; command authority remains with the server. */
export function commonCombatLabReason(state: {
  readonly sessionLost: boolean;
  readonly autoplay: boolean;
  readonly deleting: boolean;
  readonly pending: { readonly uncertain: boolean } | null;
  readonly resolved: boolean;
  readonly controlling: boolean;
}): string {
  if (state.sessionLost) return 'Бой недоступен';
  if (state.autoplay) return 'Автобой включён — остановите для ручного приказа';
  if (state.deleting) return 'Завершаем бой';
  if (state.pending) {
    return state.pending.uncertain ? 'Результат не подтверждён' : 'Ожидается ответ';
  }
  if (state.resolved) return 'Бой завершён';
  if (!state.controlling) return 'Ход противника';
  return '';
}

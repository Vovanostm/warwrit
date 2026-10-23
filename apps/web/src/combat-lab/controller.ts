import {
  COMBAT_LAB_VERSION,
  type CombatLabAcknowledgement,
  type CombatLabAction,
  type CombatLabSkillId,
  type CombatLabView,
} from '@warwrit/protocol';

import { messageFor, responseCode, type ActiveSession } from './session-transport.js';
import { canControl } from './command-availability.js';

export interface PendingAction {
  readonly body: string;
  readonly description: string;
  readonly uncertain: boolean;
}

export interface CombatLabActionPorts {
  readonly sessionRef: { current: ActiveSession | null };
  readonly pendingRef: { current: PendingAction | null };
  readonly deletingRef: { current: boolean };
  readonly generation: { current: number };
  readonly setPending: (value: PendingAction | null) => void;
  readonly setNotice: (value: string) => void;
  readonly stopAutoplay: () => void;
  readonly setSelectedSkillId: (value: CombatLabSkillId | null) => void;
}

/** Reserve synchronously; retries retain their serialized command even after the view changes. */
export function admitCombatLabAction(
  ports: CombatLabActionPorts,
  requestBody: string,
  description: string,
  retry: boolean,
) {
  const current = ports.sessionRef.current;
  const existing = ports.pendingRef.current;
  if (
    current === null ||
    ports.deletingRef.current ||
    (existing !== null && (!retry || existing.body !== requestBody)) ||
    (!retry && !canControl(current.view))
  )
    return null;
  const flight: PendingAction = { body: requestBody, description, uncertain: false };
  ports.pendingRef.current = flight;
  ports.setPending(flight);
  ports.setNotice('');
  return { current, flight };
}

export function markCombatLabActionUncertain(
  ports: CombatLabActionPorts,
  flight: PendingAction,
  notice: string,
) {
  const uncertain = { ...flight, uncertain: true };
  ports.stopAutoplay();
  ports.pendingRef.current = uncertain;
  ports.setPending(uncertain);
  ports.setNotice(notice);
}

export function settleCombatLabActionReply(
  ports: CombatLabActionPorts,
  outcome: Exclude<CombatLabActionReplyOutcome, { readonly status: 'uncertain' }>,
  action: CombatLabAction,
  expectedGeneration: number,
) {
  if (outcome.status !== 'accepted') ports.stopAutoplay();
  if (
    outcome.status === 'accepted' &&
    ports.sessionRef.current?.view.viewRevision === action.expectedViewRevision
  )
    ports.stopAutoplay();
  if (outcome.status === 'accepted') ports.setSelectedSkillId(null);
  ports.setNotice(outcome.status === 'rejected' ? messageFor(outcome.code) : '');
  if (ports.generation.current === expectedGeneration) {
    ports.pendingRef.current = null;
    ports.setPending(null);
  }
}

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

/** Mutable cells stay owned by CombatLab; callbacks read their current values at invocation. */
export interface CombatLabSessionPorts {
  readonly generation: { current: number };
  readonly sessionRef: { current: ActiveSession | null };
  readonly sessionAbort: { current: AbortController | null };
  readonly pendingRef: { current: object | null };
  readonly deletingRef: { current: boolean };
  readonly sessionLostRef: { current: boolean };
  readonly installSession: (next: ActiveSession | null) => void;
  readonly stopAutoplay: () => void;
  readonly setDeleting: (value: boolean) => void;
  readonly setSessionLost: (value: boolean) => void;
  readonly setPending: (value: null) => void;
  readonly setNotice: (value: string) => void;
}

/** The same finite callbacks are used by the mounted client and controller tests. */
export function createCombatLabSessionCallbacks(apiBaseUrl: string, ports: CombatLabSessionPorts) {
  const capabilityHeader = 'x-combat-lab-capability';
  const applyLatest = (incoming: CombatLabView, expectedGeneration: number) => {
    if (ports.generation.current !== expectedGeneration) return;
    const current = ports.sessionRef.current;
    if (current === null || current.id !== incoming.sessionId) return;
    const view = latestCombatLabView(current.view, incoming);
    if (view !== current.view) ports.installSession({ ...current, view });
  };

  const endBattle = async (): Promise<boolean> => {
    ports.stopAutoplay();
    const current = ports.sessionRef.current;
    if (current === null) return true;
    if (ports.deletingRef.current || ports.pendingRef.current !== null) return false;
    ports.setDeleting(true);
    ports.deletingRef.current = true;
    const controller = ports.sessionAbort.current;
    let removed = false;
    try {
      const response = await fetch(`${apiBaseUrl}/dev/combat-lab/${current.id}`, {
        method: 'DELETE',
        headers: { [capabilityHeader]: current.capability },
        ...(controller === null ? {} : { signal: controller.signal }),
      });
      if (response.ok || response.status === 404) {
        ports.generation.current += 1;
        ports.sessionAbort.current?.abort();
        ports.installSession(null);
        removed = true;
        ports.sessionLostRef.current = false;
        ports.setSessionLost(false);
        ports.pendingRef.current = null;
        ports.setPending(null);
        ports.setNotice(
          response.status === 404 ? messageFor('NOT_FOUND') : 'Диагностическая сессия завершена.',
        );
      } else {
        ports.setNotice(
          messageFor(responseCode(await response.json().catch(() => null), `${response.status}`)),
        );
      }
    } catch {
      ports.setNotice('Удаление не подтверждено. Сессия остаётся на сервере, пока он работает.');
    } finally {
      ports.deletingRef.current = false;
      ports.setDeleting(false);
    }
    return removed;
  };
  return { applyLatest, endBattle };
}

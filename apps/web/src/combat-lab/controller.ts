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

export function isCombatLabView(value: unknown): value is CombatLabView {
  if (value === null || typeof value !== 'object') return false;
  const view = value as Partial<CombatLabView>;
  return (
    view.version === COMBAT_LAB_VERSION &&
    typeof view.sessionId === 'string' &&
    typeof view.battleId === 'string' &&
    typeof view.scenarioId === 'string' &&
    typeof view.controlledSideId === 'string' &&
    Number.isSafeInteger(view.viewRevision) &&
    (view.status === 'active' || view.status === 'resolved') &&
    Array.isArray(view.units) &&
    Array.isArray(view.initiativeOrder) &&
    Array.isArray(view.events) &&
    view.map !== undefined &&
    view.map !== null &&
    typeof view.map === 'object' &&
    Array.isArray(view.map.hexes) &&
    Array.isArray(view.map.blocked)
  );
}

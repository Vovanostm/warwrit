import { COMBAT_LAB_VERSION, type CombatLabView } from '@warwrit/protocol';

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

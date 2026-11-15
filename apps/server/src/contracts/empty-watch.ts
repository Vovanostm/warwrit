import type { OrdinaryContractState } from '@warwrit/game-core';

export const EMPTY_WATCH_CAMP_DELAY_TICKS = 2_000n;
export const EMPTY_WATCH_FORD_DELAY_TICKS = 3_000n;

export function emptyWatchTerminalFact(state: OrdinaryContractState) {
  return state.facts.find(
    (fact) =>
      fact.companyId === state.outcome?.companyId &&
      fact.sourceEventId === state.outcome?.sourceEventId &&
      fact.atTick === state.outcome?.atTick &&
      (fact.slotId === 'empty-watch-sack-handed-over' ||
        fact.slotId === 'empty-watch-proof-destroyed'),
  );
}

export function emptyWatchCampRemovedAt(state: OrdinaryContractState): bigint | undefined {
  if (!state.outcome) return undefined;
  const terminal = emptyWatchTerminalFact(state);
  return terminal?.slotId === 'empty-watch-sack-handed-over'
    ? BigInt(state.outcome.atTick) + EMPTY_WATCH_CAMP_DELAY_TICKS
    : undefined;
}

export function emptyWatchFordFact(state: OrdinaryContractState, companyId: string) {
  const dueAt = emptyWatchFordDueAt(state);
  const fact = state.facts.find(
    (fact) => fact.slotId === 'empty-watch-old-ford-revealed' && fact.companyId === companyId,
  );
  return fact && dueAt !== undefined && BigInt(fact.atTick) >= dueAt ? fact : undefined;
}

export function emptyWatchFordDueAt(state: OrdinaryContractState): bigint | undefined {
  if (!state.outcome || emptyWatchTerminalFact(state)?.slotId !== 'empty-watch-proof-destroyed')
    return undefined;
  return BigInt(state.outcome.atTick) + EMPTY_WATCH_FORD_DELAY_TICKS;
}

export function canObserveEmptyWatchFordAt(
  state: OrdinaryContractState,
  companyId: string,
  standingAt: { readonly siteId: string; readonly areaId: string } | null,
  currentTick: string,
): boolean {
  const dueAt = emptyWatchFordDueAt(state);
  return (
    dueAt !== undefined &&
    state.outcome?.companyId === companyId &&
    standingAt?.siteId === 'kamenny-brod' &&
    standingAt.areaId === 'kamenny-brod-market' &&
    BigInt(currentTick) >= dueAt
  );
}

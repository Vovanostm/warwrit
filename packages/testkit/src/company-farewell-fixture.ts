import { prepareCompanyEconomy, type CompanyEconomyState } from '@warwrit/game-core';
import { access, command, context, prepared, scope } from './company-economy-fixture.js';

export const serviceId = 'service-worker-0';
export const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export function requestExit(state: CompanyEconomyState, extra: Record<string, unknown> = {}) {
  const cmd = command(state, 'RequestDeparture', {
    membershipId: serviceId,
    reason: 'DISMISSED',
    causeId: 'owner-choice',
    acknowledgedQuoteRevision: state.lifecycle.knowledge.revision,
    ...extra,
  });
  return prepared(prepareCompanyEconomy(state, cmd, context(state, cmd))).next;
}
export function exitCommand(state: CompanyEconomyState) {
  return command(
    state,
    'ExecuteDeparture',
    {
      membershipId: serviceId,
      intentId: state.finance.departures[0]!.intentId,
      returnContainerId: 'fixture-supply',
    },
    'actual-exit',
    'SYSTEM',
  );
}
export function gift(state: CompanyEconomyState, amountQ: string) {
  const cmd = command(state, 'GrantFarewell', {
    membershipId: serviceId,
    quoteRevision: state.lifecycle.knowledge.revision,
    amountQ,
    poolId: 'local',
  });
  return prepared(
    prepareCompanyEconomy(
      state,
      cmd,
      context(state, cmd, [
        access(state),
        {
          ...scope(state, cmd.commandId),
          kind: 'FAREWELL_CONTEXT',
          membershipId: serviceId,
          departureIntentId: state.finance.departures[0]!.intentId,
          leaderId:
            state.lifecycle.company!.actingLeaderId ?? state.lifecycle.company!.currentLeaderId!,
          friendship: 40,
        },
      ]),
    ),
  );
}

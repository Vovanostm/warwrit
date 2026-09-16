import { describe, expect, it } from 'vitest';
import {
  createSocialState,
  parseCompanyCommand,
  recordDirectedRelation,
  prepareCompanyFinancialSocial,
  prepareCompanyEconomy,
  readFarewellOutcome,
  quoteCompanyFarewell,
  prepareFinancialSocialContext,
} from '@warwrit/game-core';
import type { CompanyEconomyState } from '@warwrit/game-core';
import {
  access,
  advance,
  command,
  context,
  economy,
  observation,
  prepared,
  scope,
} from './company-economy-fixture.js';
import { exitCommand, gift, reload, requestExit, serviceId } from './company-farewell-fixture.js';

function social() {
  return recordDirectedRelation(createSocialState(), {
    sourceEventId: 'actual-contact',
    fromId: 'worker-0',
    toId: 'leader',
    base: { friendship: 0, respect: 20, fear: 0, rivalry: 0 },
  }).state;
}
function exitInputs(state: CompanyEconomyState) {
  return [
    {
      ...scope(state, 'exit-talk'),
      kind: 'FAREWELL_CONTEXT' as const,
      membershipId: serviceId,
      leaderId: 'leader',
      departureIntentId: state.finance.departures[0]!.intentId,
    },
  ];
}
function settle(state: CompanyEconomyState, cmd = exitCommand(state)) {
  return prepareCompanyFinancialSocial(
    state,
    social(),
    cmd,
    context(state, cmd, [access(state)]),
    exitInputs(state),
  );
}
function midDay(balance = 10000n) {
  return observation(advance(economy([2n], balance, 30000), 30500).next, 'worker-0').result.next;
}
const selected = { farewell: { amountQ: '2000', poolId: 'local' } };

describe('E04: explicitly selected farewell is part of actual separation', () => {
  it('settles newly due partial-day wages before the chosen gift and retains one final outcome', () => {
    const state = requestExit(midDay(), selected);
    const cmd = exitCommand(state);
    const parsed = parseCompanyCommand(cmd);
    if (!parsed.ok) throw new Error(parsed.error);
    const quoteContext = prepareFinancialSocialContext(
      state,
      parsed.command,
      context(state, cmd, [access(state)]),
      { social: social(), inputs: exitInputs(state) },
    );
    expect(quoteCompanyFarewell(state, serviceId, quoteContext)).toMatchObject({
      reactionEligible: true,
      recognitionQ: '2000',
      mandatoryOutstandingQ: '1000',
    });
    const before = reload(state);
    const result = settle(state, cmd);
    if (result.kind === 'REJECTED') throw new Error(result.error);
    expect(state).toEqual(before);
    expect(result.next.finance.movements.map((m) => [m.purpose, m.amountQ])).toEqual([
      ['WAGE', '1000'],
      ['FAREWELL', '2000'],
    ]);
    expect(result.next.finance.wallets.find((w) => w.walletId === 'wallet-worker-0')!.cashQ).toBe(
      '3000',
    );
    expect(result.next.finance.wallets.find((w) => w.walletId === 'purse')!.cashQ).toBe('7000');
    expect(result.next.lifecycle.memberships[1]!.endedAt).toBe('30500');
    expect(result.receipt.farewellOutcome).toMatchObject({ givenQ: '2000', recognitionQ: '2000' });
    expect(result.social.chronicle).toEqual([]); // Payment is not a positive emotion.
    const restored = reload(result.next);
    expect(readFarewellOutcome(restored, serviceId)).toEqual(result.receipt.farewellOutcome);
    const replay = prepared(prepareCompanyEconomy(restored, cmd, context(restored, cmd)));
    expect(replay.replayed).toBe(true);
    expect(replay.receipt).toEqual(result.receipt);
    expect(replay.next.finance.movements).toEqual(result.next.finance.movements);
    const topped = gift(restored, '1').next;
    expect(readFarewellOutcome(topped, serviceId)).toEqual(result.receipt.farewellOutcome);
  });

  it('rejects an unaffordable selection wholly, but permits explicitly continuing without extra', () => {
    const state = requestExit(midDay(2500n), selected);
    const before = reload(state);
    expect(settle(state)).toMatchObject({
      kind: 'REJECTED',
      state: before,
      error: 'INSUFFICIENT_FUNDS',
    });
    expect(state).toEqual(before);
    const cleared = requestExit(state);
    const result = prepared(
      prepareCompanyEconomy(
        cleared,
        exitCommand(cleared),
        context(cleared, exitCommand(cleared), [access(cleared)]),
      ),
    );
    expect(result.next.lifecycle.memberships[1]!.endedAt).toBe('30500');
    expect(result.receipt.farewellOutcome?.givenQ).toBe('0');
    expect(result.next.finance.movements.map((m) => m.purpose)).toEqual(['WAGE']);
    expect(result.next.finance.claims[0]!.paidQ).toBe('1000');
  });

  it('uses the latest confirmed choice, not a retried older request or a changed body', () => {
    const original = midDay();
    const first = command(original, 'RequestDeparture', {
      membershipId: serviceId,
      reason: 'DISMISSED',
      causeId: 'owner-choice',
      acknowledgedQuoteRevision: original.lifecycle.knowledge.revision,
      ...selected,
    });
    const admitted = prepared(
      prepareCompanyEconomy(original, first, context(original, first)),
    ).next;
    const changed = requestExit(admitted, { farewell: { amountQ: '1', poolId: 'local' } });
    const retried = prepared(
      prepareCompanyEconomy(reload(changed), first, context(changed, first)),
    );
    expect(retried.replayed).toBe(true);
    const result = prepared(settle(retried.next));
    expect(result.receipt.farewellOutcome?.givenQ).toBe('1');
    const conflict = {
      ...first,
      payload: {
        ...selected,
        membershipId: serviceId,
        reason: 'DISMISSED',
        causeId: 'changed',
        acknowledgedQuoteRevision: original.lifecycle.knowledge.revision,
      },
    };
    expect(prepareCompanyEconomy(changed, conflict, context(changed, conflict))).toMatchObject({
      kind: 'REJECTED',
      state: changed,
      error: 'IDEMPOTENCY_CONFLICT',
    });
  });

  it('does not accept a system-selected gift, foreign funds, false physical completion or zero extra', () => {
    const original = midDay();
    const zero = command(original, 'RequestDeparture', {
      membershipId: serviceId,
      reason: 'DISMISSED',
      causeId: 'owner-choice',
      acknowledgedQuoteRevision: original.lifecycle.knowledge.revision,
      farewell: { amountQ: '0', poolId: 'local' },
    });
    expect(prepareCompanyEconomy(original, zero, context(original, zero)).kind).toBe('REJECTED');
    const state = requestExit(original, selected),
      cmd = exitCommand(state);
    const forged = {
      ...cmd,
      payload: { ...(cmd.payload as Record<string, unknown>), farewell: selected.farewell },
    };
    expect(prepareCompanyEconomy(state, forged, context(state, forged)).kind).toBe('REJECTED');
    const inaccessible = { ...context(state, cmd), contactIds: [] };
    expect(
      prepareCompanyFinancialSocial(state, social(), cmd, inaccessible, exitInputs(state)),
    ).toMatchObject({ kind: 'REJECTED', state });
    const wrongPool = requestExit(original, { farewell: { amountQ: '2000', poolId: 'foreign' } });
    expect(settle(wrongPool)).toMatchObject({ kind: 'REJECTED', state: wrongPool });
    const badExit = {
      ...cmd,
      payload: { ...(cmd.payload as Record<string, unknown>), returnContainerId: 'absent' },
    };
    expect(settle(state, badExit)).toMatchObject({ kind: 'REJECTED', state });
  });
});

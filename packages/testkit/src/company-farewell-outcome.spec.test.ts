import { describe, expect, it } from 'vitest';
import {
  prepareCompanyEconomy,
  projectCompanyEconomy,
  readFarewellOutcome,
} from '@warwrit/game-core';
import {
  access,
  advance,
  claims,
  context,
  economy,
  observation,
  prepared,
} from './company-economy-fixture.js';
import { exitCommand, gift, reload, requestExit, serviceId } from './company-farewell-fixture.js';

describe('E04: authentic immutable final farewell outcomes', () => {
  it('does not establish finality on an intent or failed physical exit, and retains earned debt', () => {
    const state = requestExit(
      observation(advance(economy([2n], 0n, 0), 30500).next, 'worker-0').result.next,
    );
    expect(readFarewellOutcome(state, serviceId)).toBeUndefined();
    const cmd = exitCommand(state);
    const immobile = reload(state);
    Object.assign(immobile.lifecycle.characters[1]!.presence, {
      encounterBindingId: 'real-battle',
    });
    const original = reload(immobile);
    expect(prepareCompanyEconomy(immobile, cmd, context(immobile, cmd))).toMatchObject({
      kind: 'REJECTED',
      state: original,
    });
    const result = prepared(prepareCompanyEconomy(state, cmd, context(state, cmd)));
    expect(result.next.lifecycle.memberships[1]!.endedAt).toBe('30500');
    expect(
      result.next.finance.claims.reduce((s, c) => s + BigInt(c.reportedQ) - BigInt(c.paidQ), 0n),
    ).toBe(61000n);
    expect(result.receipt.farewellOutcome).toMatchObject({
      eligible: true,
      givenQ: '0',
      recognitionQ: '2000',
    });
    const replay = prepared(
      prepareCompanyEconomy(reload(result.next), cmd, context(result.next, cmd)),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.receipt).toEqual(result.receipt);
  });

  it('uses actual service and paid basis, not the broader friendship-only gift eligibility', () => {
    for (const [at, rate, expected] of [
      [29999, 1n, false],
      [30000, 1n, true],
      [30001, 0n, false],
    ] as const) {
      const state = requestExit(economy([rate], 10000n, at));
      const cmd = exitCommand(state);
      const next = prepared(prepareCompanyEconomy(state, cmd, context(state, cmd))).next;
      expect(readFarewellOutcome(next, serviceId)?.eligible).toBe(expected);
    }
    const family = economy([1n], 10000n, 30000);
    Object.assign(family.lifecycle.memberships[1]!, { basis: 'FAMILY', wageScheduleId: null });
    Object.assign(family.finance.accounts[1]!, { schedule: null });
    const state = requestExit(family),
      cmd = exitCommand(state);
    expect(
      prepared(prepareCompanyEconomy(state, cmd, context(state, cmd))).receipt.farewellOutcome,
    ).toMatchObject({ eligible: false, recognitionQ: '0' });
  });

  it('freezes the original payment prefix, target and cohort across later grants and JSON', () => {
    const requested = requestExit(economy([2n, 3n], 10000n, 30000));
    const partial = gift(requested, '1').next;
    const cmd = exitCommand(partial);
    const result = prepared(prepareCompanyEconomy(partial, cmd, context(partial, cmd)));
    const outcome = readFarewellOutcome(result.next, serviceId)!;
    expect(outcome).toMatchObject({
      givenQ: '1',
      recognitionQ: '2000',
      leaderId: 'leader',
      observerIds: ['worker-0', 'worker-1'],
    });
    const adequate = gift(result.next, '1999').next;
    expect(readFarewellOutcome(reload(adequate), serviceId)).toEqual(outcome);
    expect(adequate.finance.farewells.map((g) => g.amountQ)).toEqual(['1', '1999']);
    const legacy = reload(adequate);
    for (const r of legacy.finance.applied) Reflect.deleteProperty(r, 'farewellOutcome');
    expect(readFarewellOutcome(legacy, serviceId)).toBeUndefined();
    expect(projectCompanyEconomy(adequate, 'company')).toEqual(
      projectCompanyEconomy(legacy, 'company'),
    );
    const detached = readFarewellOutcome(adequate, serviceId)!;
    expect(Reflect.set(detached.observerIds, '0', 'external-mutation')).toBe(false);
    expect(readFarewellOutcome(adequate, serviceId)).toEqual(outcome);
  });

  it('refuses contradictory outcome or incomplete original gift receipts without partial writes', () => {
    const state = gift(requestExit(economy([1n], 10000n, 30000)), '500').next;
    const cmd = exitCommand(state),
      result = prepared(prepareCompanyEconomy(state, cmd, context(state, cmd)));
    for (const patch of [
      { givenQ: '0' },
      { companyId: 'foreign' },
      { recognitionQ: '1' },
      { policy: 'unknown' },
    ]) {
      const corrupt = reload(result.next);
      Object.assign(corrupt.finance.applied.at(-1)!.farewellOutcome!, patch);
      expect(() => readFarewellOutcome(corrupt, serviceId)).toThrow('INVALID_SOURCE');
    }
    const missing = { ...state, finance: { ...state.finance, farewells: [] } };
    expect(
      prepareCompanyEconomy(missing, cmd, context(missing, cmd, [access(missing)])),
    ).toMatchObject({ kind: 'REJECTED', state: missing, error: 'INVALID_SOURCE' });
    const indebted = claims(requestExit(economy([1n], 10000n, 30000)), [100n]);
    expect(() => gift(indebted, '1')).toThrow('UNPAID_OBLIGATIONS');
  });
});

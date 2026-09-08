import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { prepareCompanyEconomy, projectCompanyEconomy } from '@warwrit/game-core';
import {
  access,
  cash,
  claims,
  command,
  context,
  economy,
  pay,
  prepared,
  tick,
} from './company-economy-fixture.js';

describe('WP02.3 — exact local finance postulates', () => {
  it('P2: C04 preserves prefixes across fragmented requests, reload and large exact amounts', () => {
    const base = claims(economy(), [1n, 3n]);
    const one = pay(base, 1n).next;
    expect(one.finance.claims.map((c) => c.paidQ)).toEqual(['0', '1']);
    const two = pay(JSON.parse(JSON.stringify(one)), 1n).next;
    expect(two.finance.claims.map((c) => c.paidQ)).toEqual(['0', '2']);
    expect(two.finance.epochs.filter((e) => e.closedAt === null)).toHaveLength(1);
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 1000 }),
        (values, selector) => {
          const weights = values.map(BigInt),
            total = weights.reduce((a, b) => a + b, 0n);
          const amount = 1n + (BigInt(selector) % total);
          let split = claims(economy(weights, total), weights);
          for (let i = 0n; i < amount; i++) split = pay(split, 1n).next;
          const whole = pay(claims(economy(weights, total), weights), amount).next;
          expect(split.finance.claims.map((c) => c.paidQ)).toEqual(
            whole.finance.claims.map((c) => c.paidQ),
          );
          expect(split.finance.wallets.reduce((s, w) => s + BigInt(w.cashQ), 0n)).toBe(total);
        },
      ),
      { numRuns: 40, seed: 23 },
    );
    const huge = 10n ** 60n;
    const large = pay(claims(economy([huge, huge], huge), [huge, huge]), huge).next;
    expect(large.finance.claims.map((c) => BigInt(c.paidQ))).toEqual([huge / 2n, huge / 2n]);
  });
  it('P1/P3/P8: exact interval partition, reserved cash, physical access and atomic invalid payment', () => {
    const start = economy([30000n], 10n ** 9n, 0);
    function advance(s: typeof start, to: number) {
      const cmd = command(
        s,
        'AdvanceCampaign',
        { toTick: String(to), authoritativeInputs: [] },
        `advance-${to}`,
        'SYSTEM',
      );
      return prepared(prepareCompanyEconomy(s, cmd, context(s, cmd))).next;
    }
    const full = advance(start, 1500);
    const fragmented = advance(advance(advance(start, 1), 777), 1500);
    expect(full.finance.claims).toEqual(fragmented.finance.claims);
    expect(full.finance.claims.reduce((s, c) => s + BigInt(c.reportedQ), 0n)).toBe(45000000n);
    expect(full.finance.food).toEqual(fragmented.finance.food);
    const owing = claims(economy(), [1n, 3n]);
    for (const payload of [
      { amountQ: '0', claimIds: [] },
      { amountQ: '5', claimIds: [] },
      { amountQ: '1', claimIds: ['claim-1'] },
    ]) {
      const cmd = command(owing, 'PayClaims', { poolId: 'local', mode: 'DEFAULT', ...payload });
      const result = prepareCompanyEconomy(owing, cmd, context(owing, cmd, [access(owing)]));
      expect(result.kind).toBe('REJECTED');
      expect(result.state).toBe(owing);
    }
    const inaccessible = {
      ...owing,
      finance: {
        ...owing.finance,
        wallets: owing.finance.wallets.map((w) =>
          w.walletId === 'purse' ? { ...w, location: { ...w.location, areaId: 'locked' } } : w,
        ),
      },
    };
    const cmd = command(inaccessible, 'PayClaims', {
      poolId: 'local',
      amountQ: '1',
      claimIds: [],
      mode: 'DEFAULT',
    });
    expect(
      prepareCompanyEconomy(inaccessible, cmd, context(inaccessible, cmd, [access(inaccessible)]))
        .kind,
    ).toBe('REJECTED');
    const unknown = {
      ...owing,
      finance: {
        ...owing.finance,
        accounts: owing.finance.accounts.map((a) => ({ ...a, confirmedAt: tick(0) })),
        wallets: owing.finance.wallets.map((w) =>
          w.walletId === 'purse' ? { ...w, cashQ: cash(2) } : w,
        ),
      },
    };
    const held = pay(unknown, 2n).next;
    expect(held.finance.claims.map((c) => c.paidQ)).toEqual(['0', '0']);
    expect(projectCompanyEconomy(held, 'company')?.finance.wallets[0]?.spendableQ).toBe('0');
    const tooMuch = command(held, 'PayClaims', {
      poolId: 'local',
      amountQ: '1',
      claimIds: [],
      mode: 'DEFAULT',
    });
    expect(
      prepareCompanyEconomy(held, tooMuch, context(held, tooMuch, [access(held)])),
    ).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS' });
  });
});

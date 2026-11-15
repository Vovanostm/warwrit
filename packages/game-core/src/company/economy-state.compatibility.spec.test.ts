import { describe, expect, it } from 'vitest';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { readCompanyCombatAggregateState } from './aggregate-state.js';
import { isCompanyFinanceShape } from './economy-state.js';

describe('persisted company learning finance compatibility', () => {
  it('reads legacy learning obligation and effect fields', () => {
    const state = createCompanyCombatAggregateFixture().state;
    const finance = state.economy.finance;
    const pool = finance.pools.find((entry) => entry.poolId === 'local');
    expect(pool).toBeDefined();
    const payer = finance.wallets.find((entry) => entry.walletId === pool?.walletId);
    expect(payer).toBeDefined();
    if (!pool || !payer) throw new Error('Fixture learning wallet is unavailable');

    const sourceId = 'legacy-learning-source';
    const sourceVersion = 'legacy-learning-v1';
    const taskId = 'legacy-learning-task';
    const authorizedBudgetQ = '15000000';
    const start = {
      taskId,
      quote: {
        sourceId,
        sourceVersion,
        maxTicks: '3000',
        funding: {
          poolId: pool.poolId,
          walletId: pool.walletId,
          providerWalletId: payer.walletId,
          authorizedBudgetQ,
          costQPerDay: { numerator: '5000000', denominator: '1' },
        },
      },
      inputs: { kind: 'COURSE', ticksPerDay: '1000' },
    };
    const legacy = {
      ...state,
      economy: {
        ...state.economy,
        finance: {
          ...finance,
          wallets: finance.wallets.map((wallet) =>
            wallet.walletId === payer.walletId ? { ...wallet, cashQ: '20000000' } : wallet,
          ),
          learningObligations: [
            {
              taskId,
              sourceId,
              sourceVersion,
              companyId: state.economy.lifecycle.companyId,
              worldId: state.economy.lifecycle.worldId,
              start,
              poolId: pool.poolId,
              payerWalletId: pool.walletId,
              recipientWalletId: payer.walletId,
              recipient: payer.owner,
              authorizedBudgetQ,
              fundedTicks: '1000',
              acceptedTicks: '1000',
              accruedQ: { numerator: '5000000', denominator: '1' },
              dischargedQ: { numerator: '0', denominator: '1' },
              terminal: null,
            },
          ],
          learningEffects: [],
        },
      },
    };

    expect(isCompanyFinanceShape({ ...finance, learningObligations: [], learningEffects: [] })).toBe(
      true,
    );
    expect(isCompanyFinanceShape(legacy.economy.finance)).toBe(true);
    expect(readCompanyCombatAggregateState(legacy).economy.finance.learningObligations).toHaveLength(
      1,
    );
    expect(readCompanyCombatAggregateState(legacy).economy.finance.learningEffects).toEqual([]);
  });
});

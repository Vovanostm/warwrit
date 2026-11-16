import { expect, it } from 'vitest';
import { campaignTick } from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { catchUpStationaryCompany } from './executor.js';

it('does not catch up a company while its encounter binding is active', async () => {
  const initial = createCompanyCombatAggregateFixture().state;
  const bindingTick = initial.economy.lifecycle.campaignTick;
  const binding = { atTick: bindingTick };
  const state = {
    ...initial,
    encounter: {
      ...initial.encounter,
      active: { binding },
    },
  } as unknown as CompanyCombatAggregateState;

  const result = await catchUpStationaryCompany({
    transaction: {} as never,
    accountId: 'account',
    state,
    atTick: (BigInt(bindingTick) + 1n).toString(),
    requestKind: 'test-bound-company',
    clock: { tick: campaignTick((BigInt(bindingTick) + 1n).toString()) } as never,
  });

  expect(result).toBeUndefined();
  expect(state.economy.lifecycle.campaignTick).toBe(bindingTick);
  expect(state.economy.finance.processedTick).toBe(initial.economy.finance.processedTick);
  expect(state.encounter.active?.binding.atTick).toBe(bindingTick);
});

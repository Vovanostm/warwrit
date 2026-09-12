import { describe, expect, it } from 'vitest';
import { prepareCompanyEconomy } from '@warwrit/game-core';
import type { CompanyEconomyState, PhysicalEvidence } from '@warwrit/game-core';
import {
  access,
  advance,
  cash,
  command,
  context,
  economy,
  physicalScope,
  place,
  prepared,
} from './company-economy-fixture.js';
import {
  addItem,
  addVitals,
  condition,
  item,
  visibleCharacter,
  withCareProvider,
} from './company-physical-fixture.js';

function withMedicinePerk(state: CompanyEconomyState, perkId: string) {
  return visibleCharacter(withCareProvider(state), 'provider', (provider) => ({
    ...provider,
    skills: { ...provider.skills, medicine: 25 },
    perks: [perkId],
  }));
}
function injured(state: CompanyEconomyState, definitionId: 'severe-stable-wound' | 'critical-bleed') {
  let next = visibleCharacter(state, 'worker-0', (character) => ({
    ...character,
    presence: { ...character.presence, assignment: 'RECOVERY' },
  }));
  next = addItem(
    next,
    item('medical-b03', 'medical-unit', { kind: 'COMPANY', id: 'company' }, 'fixture-supply', 2),
  );
  next = addVitals(next, {
    characterId: 'worker-0',
    sourceId: 'b03-vitals',
    maximumHealth: 100,
    currentHealth: 40,
    healthCarry: '0',
    maximumStamina: 100,
    currentStamina: 70,
    staminaCarry: '0',
  });
  return condition(next, 'worker-0', definitionId, `b03-${definitionId}`).next;
}
function activeCondition(state: CompanyEconomyState, definitionId: string) {
  return state.physical!.conditions.find(
    (entry) =>
      entry.characterId === 'worker-0' &&
      entry.definitionId === definitionId &&
      entry.resolvedAt === null,
  )!;
}
function materialCare(state: CompanyEconomyState, conditionId: string, careDefinitionId: string) {
  const cmd = command(state, 'ApplyCare', {
    characterId: 'worker-0',
    conditionId,
    careDefinitionId,
    resourceOrProviderReceiptId: 'b03-material-care',
  });
  const fact: PhysicalEvidence = {
    ...physicalScope(state, 'b03-material-care'),
    kind: 'CARE_FULFILLMENT',
    characterId: 'worker-0',
    conditionId,
    careDefinitionId,
    providerId: 'provider',
    location: place,
    channel: 'MATERIAL',
    resourceItemId: 'medical-b03',
    resourceContainerId: 'fixture-supply',
  };
  return prepared(prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact])));
}
function providerCare(
  state: CompanyEconomyState,
  conditionId: string,
  supportsCareCostDiscount: boolean | undefined,
) {
  const id = `b03-provider-${supportsCareCostDiscount ?? 'absent'}`;
  const cmd = command(state, 'ApplyCare', {
    characterId: 'worker-0',
    conditionId,
    careDefinitionId: 'wound-care',
    resourceOrProviderReceiptId: id,
    budgetPoolId: 'local',
  });
  const fact: PhysicalEvidence = {
    ...physicalScope(state, id),
    kind: 'CARE_FULFILLMENT',
    characterId: 'worker-0',
    conditionId,
    careDefinitionId: 'wound-care',
    providerId: 'provider',
    location: place,
    channel: 'PROVIDER',
    poolId: 'local',
    providerWalletId: 'wallet-provider',
    moneyAccessEvidenceId: 'money-access',
    amountQ: cash(11),
    ...(supportsCareCostDiscount === undefined ? {} : { supportsCareCostDiscount }),
  };
  return {
    result: prepareCompanyEconomy(state, cmd, context(state, cmd, [access(state)], [], [fact])),
    cmd,
  };
}

describe('B03 — CareRecovery/CareCost in actual care', () => {
  it('freezes the actual provider CareRecovery on material care and remains partition-invariant', () => {
    const beforeCare = injured(withMedicinePerk(economy([1n], 100n, 1000), 'medicine-25-a'), 'severe-stable-wound');
    const target = activeCondition(beforeCare, 'severe-stable-wound');
    const cared = materialCare(beforeCare, target.conditionId, 'wound-care').next;

    expect(cared.physical!.vitals.find((entry) => entry.characterId === 'worker-0')?.currentHealth).toBe(40);
    expect(cared.physical!.items.find((entry) => entry.itemId === 'medical-b03')?.quantity).toBe(1);
    expect(cared.finance.movements.filter((entry) => entry.purpose === 'CARE')).toHaveLength(0);
    expect(activeCondition(cared, 'severe-stable-wound').care).toMatchObject({
      providerId: 'provider',
      recoveryTicksRequired: '228',
      channel: 'MATERIAL',
    });

    const changedProvider = visibleCharacter(cared, 'provider', (provider) => ({
      ...provider,
      perks: [],
    }));
    const beforeBoundary = advance(changedProvider, 1227).next;
    expect(activeCondition(beforeBoundary, 'severe-stable-wound').resolvedAt).toBeNull();
    const whole = advance(changedProvider, 1228).next;
    expect(
      whole.physical!.conditions.find((entry) => entry.conditionId === target.conditionId)?.resolvedAt,
    ).toBe('1228');

    const split = advance(advance(changedProvider, 1100).next, 1228).next;
    expect(
      split.physical!.conditions.find((entry) => entry.conditionId === target.conditionId)?.resolvedAt,
    ).toBe('1228');
  });

  it('discounts only a supporting provider quote, rounds exact Q upward, and rejects insufficient funds atomically', () => {
    const quoted = injured(withMedicinePerk(economy([1n], 20n, 1000), 'medicine-25-b'), 'severe-stable-wound');
    const conditionId = activeCondition(quoted, 'severe-stable-wound').conditionId;
    const discounted = prepared(providerCare(quoted, conditionId, true).result).next;
    const payment = discounted.finance.movements.find((entry) => entry.purpose === 'CARE')!;
    expect(payment.amountQ).toBe('10');
    expect(discounted.finance.wallets.find((entry) => entry.walletId === 'wallet-provider')?.cashQ).toBe('10');

    const plain = injured(withMedicinePerk(economy([1n], 20n, 1000), 'medicine-25-b'), 'severe-stable-wound');
    const plainId = activeCondition(plain, 'severe-stable-wound').conditionId;
    const undiscounted = prepared(providerCare(plain, plainId, false).result).next;
    expect(undiscounted.finance.movements.find((entry) => entry.purpose === 'CARE')?.amountQ).toBe('11');

    const poor = injured(withMedicinePerk(economy([1n], 9n, 1000), 'medicine-25-b'), 'severe-stable-wound');
    const poorId = activeCondition(poor, 'severe-stable-wound').conditionId;
    const rejected = providerCare(poor, poorId, true).result;
    expect(rejected).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS' });
    expect(rejected.state).toBe(poor);
    expect(activeCondition(poor, 'severe-stable-wound').care).toBeNull();
    expect(poor.finance.movements.filter((entry) => entry.purpose === 'CARE')).toHaveLength(0);
  });

  it('inherits one stabilization into the severe recovery without a second material charge', () => {
    const critical = injured(withMedicinePerk(economy([1n], 100n, 1000), 'medicine-25-a'), 'critical-bleed');
    const target = activeCondition(critical, 'critical-bleed');
    const stabilized = materialCare(critical, target.conditionId, 'stabilize').next;
    const stable = activeCondition(stabilized, 'severe-stable-wound');

    expect(
      stabilized.physical!.conditions.find((entry) => entry.conditionId === target.conditionId)?.resolvedAt,
    ).toBe('1000');
    expect(stable.care).toMatchObject({
      providerId: 'provider',
      channel: 'INHERITED_STABILIZATION',
      recoveryTicksRequired: '228',
    });
    expect(stabilized.physical!.items.find((entry) => entry.itemId === 'medical-b03')?.quantity).toBe(1);
    expect(stabilized.finance.movements.filter((entry) => entry.purpose === 'CARE')).toHaveLength(0);
  });
});

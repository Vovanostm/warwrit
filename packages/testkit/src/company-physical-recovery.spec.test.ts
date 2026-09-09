import { describe, expect, it } from 'vitest';
import {
  prepareCompanyEconomy,
  projectCompanyEconomy,
  projectCompanyPhysical,
} from '@warwrit/game-core';
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
  tick,
} from './company-economy-fixture.js';
import {
  addItem,
  addVitals,
  condition,
  item,
  visibleCharacter,
  withCareProvider,
} from './company-physical-fixture.js';

function resting(state: CompanyEconomyState, characterId: string): CompanyEconomyState {
  return addVitals(
    visibleCharacter(state, characterId, (character) => ({
      ...character,
      presence: { ...character.presence, assignment: 'RECOVERY' },
    })),
    {
      characterId,
      sourceId: `loaded-vitals-${characterId}`,
      maximumHealth: 100,
      currentHealth: 40,
      healthCarry: '0',
      maximumStamina: 100,
      currentStamina: 70,
      staminaCarry: '0',
    },
  );
}
function withStock(state: CompanyEconomyState, quantity: number): CompanyEconomyState {
  const items = quantity === 0 ? [] : [{ ...state.physical!.items[0]!, quantity }];
  return {
    ...state,
    physical: {
      ...state.physical!,
      items,
      knowledge: { ...state.physical!.knowledge, itemSnapshots: structuredClone(items) },
    },
  };
}
function patient(): CompanyEconomyState {
  return addItem(
    resting(withCareProvider(economy([1n], 100n, 0)), 'worker-0'),
    item('medicine-stock', 'medical-unit', { kind: 'COMPANY', id: 'company' }, 'fixture-supply', 2),
  );
}
function careInput(state: CompanyEconomyState, conditionId: string, careDefinitionId = 'wound-care') {
  const cmd = command(
    state,
    'ApplyCare',
    {
      characterId: 'worker-0',
      conditionId,
      careDefinitionId,
      resourceOrProviderReceiptId: 'care-proof',
    },
    'scoped-care',
  );
  const fact: PhysicalEvidence = {
    ...physicalScope(state, 'care-proof'),
    kind: 'CARE_FULFILLMENT',
    characterId: 'worker-0',
    conditionId,
    careDefinitionId,
    providerId: 'provider',
    location: place,
    channel: 'MATERIAL',
    resourceItemId: 'medicine-stock',
    resourceContainerId: 'fixture-supply',
  };
  return { cmd, ctx: context(state, cmd, [], [], [fact]) };
}
function health(state: CompanyEconomyState, characterId = 'worker-0') {
  return state.physical!.vitals.find((v) => v.characterId === characterId)!.currentHealth;
}
function providerFood(state: CompanyEconomyState, to: number, cost: number) {
  const cmd = command(
    state,
    'AdvanceCampaign',
    { toTick: String(to), authoritativeInputs: [] },
    `provider-meal-${to}`,
    'SYSTEM',
  );
  const fact: PhysicalEvidence = {
    ...physicalScope(state, `meal-${to}`, tick(to)),
    kind: 'FOOD_FULFILLMENT',
    membershipId: 'service-leader',
    fromTick: state.finance.processedTick,
    toTick: tick(to),
    channel: 'PROVIDER',
    location: place,
    providerId: 'provider',
    poolId: 'local',
    providerWalletId: 'wallet-provider',
    moneyAccessEvidenceId: 'money-access',
    amountQ: cash(cost),
  };
  const ctx = {
    ...context(state, cmd, [access(state, tick(to))]),
    physicalFacts: [fact],
  };
  return { cmd, result: prepareCompanyEconomy(state, cmd, ctx) };
}

describe('WP-02.4 — adversarial recovery and fulfillment review', () => {
  it.each(['severe-stable-wound', 'critical-bleed'] as const)(
    'P3/P4: %s cannot restore health before actual treatment',
    (definitionId) => {
      const state = condition(patient(), 'worker-0', definitionId, 'untreated').next;
      const next = advance(state, 100).next;
      expect(health(next)).toBe(40);
      expect(next.physical!.conditions[0]?.recoveryTicks).toBe('0');
      expect(next.physical!.conditions[0]?.care).toBeNull();
      expect(next.physical!.conditions[0]?.resolvedAt).toBeNull();
    },
  );

  it('P3/P7: care discloses its target, not another hidden condition or hidden current pools', () => {
    const shared = condition(patient(), 'worker-0', 'severe-stable-wound', 'visible-target').next;
    const privateWound = condition(shared, 'worker-0', 'old-impairment', 'hidden-wound').next;
    const hidden: CompanyEconomyState = {
      ...privateWound,
      physical: {
        ...privateWound.physical!,
        vitals: privateWound.physical!.vitals.map((v) => ({ ...v, currentHealth: 20 })),
      },
    };
    const conditionId = shared.physical!.conditions[0]!.conditionId;
    const results = [shared, hidden].map((state) => {
      const { cmd, ctx } = careInput(state, conditionId);
      return prepared(prepareCompanyEconomy(state, cmd, ctx)).next;
    });
    expect(projectCompanyEconomy(results[1]!, 'company')).toEqual(
      projectCompanyEconomy(results[0]!, 'company'),
    );
    expect(projectCompanyPhysical(results[1]!, 'company')).toEqual(
      projectCompanyPhysical(results[0]!, 'company'),
    );
    expect(health(results[0]!)).toBe(40);
    expect(health(results[1]!)).toBe(20);
    expect(results[1]!.physical!.knowledge.conditionSnapshots).toHaveLength(1);
    expect(results[1]!.physical!.conditions).toHaveLength(2);
  });

  it('P3: an incapacitated clinician cannot fulfill a material-care receipt', () => {
    const wound = condition(patient(), 'worker-0', 'severe-stable-wound', 'target').next;
    const state = condition(wound, 'provider', 'critical-bleed', 'doctor-critical').next;
    const target = state.physical!.conditions.find((c) => c.characterId === 'worker-0')!;
    const { cmd, ctx } = careInput(state, target.conditionId);
    const result = prepareCompanyEconomy(state, cmd, ctx);
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'CONTACT_OR_ACCESS_REQUIRED' });
    expect(result.state).toBe(state);
    expect(state.physical!.items.find((i) => i.itemId === 'medicine-stock')?.quantity).toBe(2);
  });

  it('P3/P4/P8: timely stabilization is finite and idempotent, and late care cannot resurrect the opportunity', () => {
    const initial = condition(patient(), 'worker-0', 'critical-bleed', 'critical').next;
    const conditionId = initial.physical!.conditions[0]!.conditionId;
    const timely = advance(initial, 250).next;
    const { cmd, ctx } = careInput(timely, conditionId, 'stabilize');
    const treated = prepared(prepareCompanyEconomy(timely, cmd, ctx)).next;
    expect(health(treated)).toBe(40);
    const stable = treated.physical!.conditions.find((c) => c.resolvedAt === null)!;
    expect(stable).toMatchObject({
      definitionId: 'severe-stable-wound',
      onsetTick: '250',
      care: { channel: 'INHERITED_STABILIZATION' },
      recoveryTicks: '0',
    });
    const healed = advance(treated, 500).next;
    expect(health(healed)).toBe(100);
    expect(healed.physical!.conditions.find((c) => c.conditionId === stable.conditionId)).toMatchObject({
      resolvedAt: '500',
    });
    expect(prepared(prepareCompanyEconomy(healed, cmd, context(healed, cmd))).next).toBe(healed);
    expect(healed.physical!.items.find((i) => i.itemId === 'medicine-stock')?.quantity).toBe(1);
    const late = advance(initial, 251).next;
    const lateCare = careInput(late, conditionId, 'stabilize');
    const refusal = prepareCompanyEconomy(late, lateCare.cmd, lateCare.ctx);
    expect(refusal).toMatchObject({ kind: 'REJECTED', error: 'INCOMPATIBLE_ACTIVITY' });
    expect(refusal.state).toBe(late);
  });

  it('P4/P8: even one tick of recovery requires backed food and rejection rolls back the whole draft', () => {
    const state = withStock(resting(economy([], 0n, 0), 'leader'), 0);
    const cmd = command(
      state,
      'AdvanceCampaign',
      { toTick: '1', authoritativeInputs: [] },
      'unfunded-fraction',
      'SYSTEM',
    );
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_ITEMS' });
    expect(result.state).toBe(state);
    expect(health(state, 'leader')).toBe(40);
    expect(state.finance.processedTick).toBe('0');
  });

  it('P1/P4: two beneficiaries cannot reuse one ration to fund their first partial-day interval', () => {
    const state = withStock(economy([1n], 0n, 0), 1);
    const cmd = command(
      state,
      'AdvanceCampaign',
      { toTick: '1', authoritativeInputs: [] },
      'overcommitted-fractions',
      'SYSTEM',
    );
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_ITEMS' });
    expect(result.state).toBe(state);
    expect(state.physical!.items[0]?.quantity).toBe(1);
    expect(state.physical!.food).toEqual([]);
  });

  it('P4/P8: a consumed ration backs the remainder across reload and fragmented time', () => {
    const initial = withStock(resting(economy([], 0n, 0), 'leader'), 1);
    const first = advance(initial, 1).next;
    expect(first.physical!.items[0]?.quantity).toBe(0);
    expect(first.physical!.foodCarry[0]?.tickUnits).toBe('1');
    const split = advance(JSON.parse(JSON.stringify(first)), 1000).next;
    const whole = advance(initial, 1000).next;
    for (const state of [split, whole]) {
      expect(state.physical!.food.reduce((n, f) => n + BigInt(f.unitsConsumed), 0n)).toBe(1n);
      expect(state.physical!.foodCarry[0]?.tickUnits).toBe('0');
      expect(health(state, 'leader')).toBe(100);
    }
  });

  it('P3/P4/P8: provider food pays its sub-day quote once and does not erase backed stock time', () => {
    const initial = withStock(economy([], 10n, 0), 1);
    const first = advance(initial, 1).next;
    const refusal = providerFood(first, 101, 11).result;
    expect(refusal).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS' });
    expect(refusal.state).toBe(first);
    const { cmd, result } = providerFood(first, 101, 3);
    const meal = prepared(result).next;
    expect(meal.finance.wallets.find((w) => w.walletId === 'purse')?.cashQ).toBe('7');
    expect(meal.finance.wallets.find((w) => w.walletId === 'wallet-provider')?.cashQ).toBe('3');
    expect(meal.physical!.foodCarry[0]?.tickUnits).toBe('1');
    expect(prepared(prepareCompanyEconomy(meal, cmd, context(meal, cmd))).next).toBe(meal);
    const finished = advance(meal, 1100).next;
    expect(finished.physical!.foodCarry[0]?.tickUnits).toBe('0');
    expect(finished.physical!.food.reduce((n, f) => n + BigInt(f.unitsConsumed), 0n)).toBe(1n);
  });
});

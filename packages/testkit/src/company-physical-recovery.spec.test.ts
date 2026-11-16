import { describe, expect, it } from 'vitest';
import {
  prepareCompanyEconomy,
  projectCompanyEconomy,
  projectCompanyPhysical,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  CompanyEconomyState,
  FinanceEvidence,
  PhysicalEvidence,
} from '@warwrit/game-core';
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
  scope,
  tick,
} from './company-economy-fixture.js';
import { createCompanyCombatAggregateFixture } from './company-combat-aggregate-fixture.js';
import {
  addItem,
  addVitals,
  condition,
  item,
  visibleCharacter,
  withCareProvider,
} from './company-physical-fixture.js';

function resting(
  state: CompanyEconomyState,
  characterId: string,
  morale?: number,
): CompanyEconomyState {
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
      ...(morale === undefined ? {} : { morale }),
    },
  );
}
function beginSafeCamp(state: CompanyEconomyState, conflict = false) {
  const cmd = command(state, 'BeginFieldCamp', {
    partyId: 'party',
    siteEligibilityId: 'safe-rest-camp',
  });
  const site: FinanceEvidence = {
    ...scope(state, 'safe-rest-camp'),
    kind: 'CAMP_SITE',
    partyId: 'party',
    location: place,
    stationary: true,
    conflict,
  };
  return prepareCompanyEconomy(state, cmd, context(state, cmd, [site]));
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
function careInput(
  state: CompanyEconomyState,
  conditionId: string,
  careDefinitionId = 'wound-care',
) {
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
function morale(state: CompanyEconomyState, characterId = 'leader') {
  return state.physical!.vitals.find((v) => v.characterId === characterId)?.morale;
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
  it('P4/P8: a loaded food remainder must be backed by an actual fulfillment history', () => {
    const base = withStock(resting(economy([], 0n, 0), 'leader'), 0);
    const state: CompanyEconomyState = {
      ...base,
      physical: {
        ...base.physical!,
        foodCarry: [{ membershipId: 'service-leader', tickUnits: '1' }],
      },
    };
    const cmd = command(
      state,
      'AdvanceCampaign',
      { toTick: '10', authoritativeInputs: [] },
      'unbacked-carry',
      'SYSTEM',
    );
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INVALID_STATE' });
    expect(result.state).toBe(state);
  });

  it('I2/P8: an old unbacked physical policy is not silently interpreted as funded food', () => {
    const base = economy([], 0n, 0);
    const state = JSON.parse(JSON.stringify(base)) as CompanyEconomyState;
    Object.assign(state.physical!, { policyVersion: 's02-physical-1' });
    const cmd = command(state, 'RenameCompany', {
      companyId: 'company',
      name: 'New name',
      bannerId: 'banner',
    });
    const result = prepareCompanyEconomy(state, cmd, context(state, cmd));
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INVALID_STATE' });
    expect(result.state).toBe(state);
  });
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
    expect(
      healed.physical!.conditions.find((c) => c.conditionId === stable.conditionId),
    ).toMatchObject({
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
    expect(first.physical!.items.filter((i) => i.tombstone === null)).toEqual([]);
    expect(first.physical!.items[0]).toMatchObject({
      quantity: 1,
      containerId: null,
      tombstone: { causeId: 'FOOD_CONSUMPTION' },
    });
    expect(first.physical!.foodCarry[0]?.tickUnits).toBe('1');
    const split = advance(JSON.parse(JSON.stringify(first)), 1000).next;
    const whole = advance(initial, 1000).next;
    const resumed = JSON.parse(JSON.stringify(first)) as CompanyEconomyState;
    const cmd = command(
      resumed,
      'AdvanceCampaign',
      { toTick: '1000', authoritativeInputs: [] },
      'backed-meal-without-container',
      'SYSTEM',
    );
    const fact: PhysicalEvidence = {
      ...physicalScope(resumed, 'backed-meal', tick(1000)),
      kind: 'FOOD_FULFILLMENT',
      membershipId: 'service-leader',
      fromTick: tick(1),
      toTick: tick(1000),
      channel: 'STOCK',
      location: place,
    };
    const withoutContainer = prepared(
      prepareCompanyEconomy(resumed, cmd, {
        ...context(resumed, cmd),
        physicalFacts: [fact],
      }),
    ).next;
    expect(
      prepared(prepareCompanyEconomy(withoutContainer, cmd, context(withoutContainer, cmd))).next,
    ).toBe(withoutContainer);
    const exhausted = command(
      withoutContainer,
      'AdvanceCampaign',
      { toTick: '1001', authoritativeInputs: [] },
      'exhausted-meal-without-container',
      'SYSTEM',
    );
    const refused = prepareCompanyEconomy(withoutContainer, exhausted, {
      ...context(withoutContainer, exhausted),
      physicalFacts: [
        {
          ...fact,
          ...physicalScope(withoutContainer, 'exhausted-meal', tick(1001)),
          fromTick: tick(1000),
          toTick: tick(1001),
        },
      ],
    });
    expect(refused).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(refused.state).toBe(withoutContainer);
    for (const state of [split, whole, withoutContainer]) {
      expect(state.physical!.food.reduce((n, f) => n + BigInt(f.unitsConsumed), 0n)).toBe(1n);
      expect(state.physical!.foodCarry[0]?.tickUnits).toBe('0');
      expect(health(state, 'leader')).toBe(100);
    }
  });

  it('restores ten morale per fed campaign day only during the accepted safe-camp rest interval', () => {
    const initial = withStock(resting(economy([], 0n, 0), 'leader', 35), 100);
    const camped = prepared(beginSafeCamp(initial)).next;
    const first = advance(camped, 333).next;
    expect(morale(first)).toBe(38);
    expect(first.physical!.vitals.find((v) => v.characterId === 'leader')?.moraleCarry).toBe('330');

    const fragmented = advance(JSON.parse(JSON.stringify(first)) as CompanyEconomyState, 500).next;
    const whole = advance(camped, 500).next;
    const fullDay = advance(camped, 1000).next;
    const toOpening = advance(camped, 2000).next;
    expect(morale(fragmented)).toBe(40);
    expect(morale(whole)).toBe(40);
    expect(morale(fullDay)).toBe(45);
    expect(morale(toOpening)).toBe(50);
    expect(fragmented.physical!.vitals.find((v) => v.characterId === 'leader')?.moraleCarry).toBe(
      '0',
    );
    expect(toOpening.physical!.vitals.find((v) => v.characterId === 'leader')?.moraleCarry).toBe(
      '0',
    );
    expect(fragmented.physical!.food).toEqual(whole.physical!.food);
  });

  it('does not accrue prior time, time outside camp or time after the camp boundary', () => {
    const initial = withStock(resting(economy([], 0n, 0), 'leader', 35), 100);
    const beforeCamp = advance(initial, 250).next;
    expect(morale(beforeCamp)).toBe(35);
    const camped = prepared(beginSafeCamp(beforeCamp)).next;
    const afterCampStart = advance(camped, 500).next;
    expect(morale(afterCampStart)).toBe(37);
    expect(
      afterCampStart.physical!.vitals.find((v) => v.characterId === 'leader')?.moraleCarry,
    ).toBe('500');

    const boundaryCamp = prepared(beginSafeCamp(initial)).next;
    const agreementId = boundaryCamp.finance.maintenance[0]!.agreementId;
    const boundary: FinanceEvidence = {
      ...physicalScope(boundaryCamp, 'camp-ended-for-encounter', tick(500)),
      kind: 'MAINTENANCE_BOUNDARY',
      agreementId,
      reason: 'ENCOUNTER',
    };
    const ended = advance(boundaryCamp, 1000, [boundary]).next;
    expect(morale(ended)).toBe(40);
    expect(ended.finance.maintenance[0]?.endedAt).toBe('500');

    const movingCamp = prepared(beginSafeCamp(initial)).next;
    const movementBoundary: FinanceEvidence = {
      ...physicalScope(movingCamp, 'camp-ended-for-movement', tick(500)),
      kind: 'MAINTENANCE_BOUNDARY',
      agreementId: movingCamp.finance.maintenance[0]!.agreementId,
      reason: 'MOVE',
    };
    const afterMovement = advance(movingCamp, 1000, [movementBoundary]).next;
    expect(morale(afterMovement)).toBe(40);
    expect(afterMovement.finance.maintenance[0]?.endedAt).toBe('500');
  });

  it('requires a safe camp and fed time, and preserves higher or unknown legacy morale', () => {
    const initial = withStock(resting(economy([], 0n, 0), 'leader', 35), 100);
    const unsafe = beginSafeCamp(initial, true);
    expect(unsafe).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(unsafe.state).toBe(initial);
    expect(morale(advance(initial, 1000).next)).toBe(35);

    const emptyStock = withStock(resting(economy([], 0n, 0), 'leader', 35), 0);
    const suppliedCamp = prepared(beginSafeCamp(emptyStock)).next;
    const suppliedCommand = command(
      suppliedCamp,
      'AdvanceCampaign',
      { toTick: '1000', authoritativeInputs: [] },
      'camp-supplied-rest',
      'SYSTEM',
    );
    const suppliedRest = prepareCompanyEconomy(
      suppliedCamp,
      suppliedCommand,
      context(suppliedCamp, suppliedCommand),
    );
    expect(suppliedRest.state).toBe(suppliedCamp);
    if (suppliedRest.kind !== 'PREPARED') throw new Error(suppliedRest.error);
    expect(suppliedRest.next.finance.maintenanceReceipts).toContainEqual(
      expect.objectContaining({ fulfillment: 'CURRENT_FOOD', fromTick: '0', toTick: '1000' }),
    );
    expect(morale(suppliedRest.next)).toBe(45);

    const higher = withStock(resting(economy([], 0n, 0), 'leader', 70), 100);
    expect(morale(advance(prepared(beginSafeCamp(higher)).next, 1000).next)).toBe(70);
    const legacy = withStock(resting(economy([], 0n, 0), 'leader'), 100);
    const legacyAfter = advance(prepared(beginSafeCamp(legacy)).next, 1000).next;
    expect(morale(legacyAfter)).toBeUndefined();
  });

  it('round-trips the optional fractional morale carry and accepts legacy vitals without it', () => {
    const legacy = createCompanyCombatAggregateFixture().state;
    expect(readCompanyCombatAggregateState(JSON.parse(JSON.stringify(legacy)))).toEqual(legacy);
    const addCarry = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(addCarry);
      if (typeof value !== 'object' || value === null) return value;
      const record = value as Record<string, unknown>;
      const copied = Object.fromEntries(
        Object.entries(record).map(([key, entry]) => [key, addCarry(entry)]),
      );
      if (
        typeof copied['characterId'] === 'string' &&
        Number.isSafeInteger(copied['maximumHealth']) &&
        Number.isSafeInteger(copied['currentHealth']) &&
        typeof copied['morale'] === 'number'
      )
        copied['moraleCarry'] = '500';
      return copied;
    };
    const withCarry = addCarry(JSON.parse(JSON.stringify(legacy))) as CompanyCombatAggregateState;
    const reloaded = readCompanyCombatAggregateState(withCarry);
    expect(reloaded.economy.physical?.vitals.every((vitals) => vitals.moraleCarry === '500')).toBe(
      true,
    );
    expect(JSON.stringify(reloaded)).toContain('"moraleCarry":"500"');
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

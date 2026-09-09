import { describe, expect, it } from 'vitest';
import { prepareCompanyEconomy, projectCompanyPhysical } from '@warwrit/game-core';
import type { CompanyEconomyState, FinanceEvidence, PhysicalEvidence } from '@warwrit/game-core';
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
import {
  addContainer,
  addItem,
  container,
  item,
  visibleCharacter,
} from './company-physical-fixture.js';

function carried(): CompanyEconomyState {
  return addItem(
    addContainer(
      economy([1n], 10n, 0),
      container('pack', { kind: 'CHARACTER', id: 'worker-0' }, 30000, {
        kind: 'CHARACTER',
        id: 'worker-0',
      }),
    ),
    item('armor', 'padded-coat', { kind: 'CHARACTER', id: 'worker-0' }, 'pack', 1, 10, 40),
  );
}

describe('WP-02.4 — final integration review', () => {
  it('P1/P6: a delayed death closes actual food and earnings at the causal tick without confiscating personal gear', () => {
    const state = carried();
    const cmd = command(
      state,
      'RecordDeath',
      {
        receiptId: 'death-finance',
        characterId: 'worker-0',
        actualDeathTick: '500',
        causeId: 'fatal-battle',
        custodyOutcomeId: 'death-physical',
      },
      'late-death',
      'OUTCOME_RECEIPT',
      tick(1000),
    );
    const money: FinanceEvidence = {
      ...scope(state, 'death-finance', tick(1000)),
      sourceEventId: cmd.sourceEventId,
      kind: 'FINANCIAL_DEATH',
      characterId: 'worker-0',
      actualDeathTick: tick(500),
      causeId: 'fatal-battle',
      custodyOutcomeId: 'death-physical',
      recipient: { kind: 'ESTATE', id: 'worker-0' },
    };
    const outcome: PhysicalEvidence = {
      ...physicalScope(state, 'death-physical', tick(1000)),
      sourceEventId: cmd.sourceEventId,
      kind: 'DEATH_OUTCOME',
      characterId: 'worker-0',
      actualDeathTick: tick(500),
      causeId: 'fatal-battle',
      location: place,
      corpseContainerId: 'corpse',
    };
    const food: PhysicalEvidence[] = ['leader', 'worker-0'].map((id, ordinal) => ({
      ...physicalScope(state, `meal-${id}`, tick(1000), ordinal),
      kind: 'FOOD_FULFILLMENT',
      membershipId: `service-${id}`,
      fromTick: tick(0),
      toTick: tick(id === 'leader' ? 1000 : 500),
      channel: 'STOCK',
      location: place,
      containerId: 'fixture-supply',
    }));
    const next = prepared(
      prepareCompanyEconomy(state, cmd, context(state, cmd, [money], [], [outcome, ...food])),
    ).next;
    expect(next.finance.claims.find((c) => c.membershipId === 'service-worker-0')?.earned).toEqual([
      { fromTick: '0', toTick: '500', dailyWageMilli: '1', maintenanceId: null },
    ]);
    expect(next.physical!.food.find((f) => f.membershipId === 'service-worker-0')).toMatchObject({
      fromTick: '0',
      toTick: '500',
    });
    expect(next.physical!.items.find((i) => i.itemId === 'armor')).toMatchObject({
      containerId: 'corpse',
      owner: { kind: 'CHARACTER', id: 'worker-0' },
      currentCondition: 10,
    });
    expect(projectCompanyPhysical(next, 'company')).toEqual(
      projectCompanyPhysical(advance(state, 1000).next, 'company'),
    );
    expect(
      next.finance.accounts.find((a) => a.membershipId === 'service-worker-0')?.death?.recipient,
    ).toEqual({ kind: 'ESTATE', id: 'worker-0' });
    expect(prepared(prepareCompanyEconomy(next, cmd, context(next, cmd))).next).toBe(next);
  });

  it('P6/P8: missing-to-dead resolution requires both causal consumers and remains source-once', () => {
    const state = visibleCharacter(carried(), 'worker-0', (p) => ({
      ...p,
      presence: {
        ...p.presence,
        availability: 'OUT_OF_CONTACT',
        assignment: 'NONE',
        fieldPartyId: null,
      },
    }));
    const cmd = command(
      state,
      'ResolveMissing',
      {
        resolutionId: 'missing-resolution',
        characterId: 'worker-0',
        notBefore: '0',
        outcomeReceiptId: 'missing-dead',
      },
      'resolved-dead',
      'WORLD_RECEIPT',
    );
    const money: FinanceEvidence = {
      ...scope(state, 'death-finance'),
      sourceEventId: cmd.sourceEventId,
      kind: 'FINANCIAL_DEATH',
      characterId: 'worker-0',
      actualDeathTick: tick(0),
      causeId: 'source-battle',
      custodyOutcomeId: 'death-physical',
      recipient: { kind: 'ESTATE', id: 'worker-0' },
    };
    const outcome: PhysicalEvidence = {
      ...physicalScope(state, 'death-physical'),
      sourceEventId: cmd.sourceEventId,
      kind: 'DEATH_OUTCOME',
      characterId: 'worker-0',
      actualDeathTick: tick(0),
      causeId: 'source-battle',
      location: place,
      corpseContainerId: 'corpse',
    };
    const resolution: PhysicalEvidence = {
      ...physicalScope(state, 'missing-dead'),
      sourceEventId: cmd.sourceEventId,
      kind: 'MISSING_RESOLUTION',
      characterId: 'worker-0',
      notBefore: tick(0),
      outcome: 'DEAD',
      actualDeathTick: tick(0),
      causeId: 'source-battle',
      location: place,
      custodyOutcomeId: 'death-physical',
      financialDeathReceiptId: 'death-finance',
    };
    const refused = prepareCompanyEconomy(
      state,
      cmd,
      context(state, cmd, [], [], [resolution, outcome]),
    );
    expect(refused).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(refused.state).toBe(state);
    const next = prepared(
      prepareCompanyEconomy(state, cmd, context(state, cmd, [money], [], [resolution, outcome])),
    ).next;
    expect(
      next.lifecycle.characters.find((p) => p.identity.characterId === 'worker-0')?.presence
        .availability,
    ).toBe('DEAD');
    expect(next.physical!.items.find((i) => i.itemId === 'armor')?.containerId).toBe('corpse');
    const redelivered = { ...cmd, commandId: 'redelivered-death' };
    expect(
      prepared(prepareCompanyEconomy(next, redelivered, context(next, redelivered))).next,
    ).toBe(next);
    expect(next.physical!.containers.filter((c) => c.kind === 'CORPSE')).toHaveLength(1);
  });

  it('P2/P3/P8: paid repair requires an authorized recipient, transfers the quote once, and does not charge material too', () => {
    const state = carried();
    const cmd = command(state, 'RepairItem', {
      itemId: 'armor',
      repairUnits: 1,
      materialsContainerId: 'fixture-supply',
      serviceReceiptId: 'repair-proof',
    });
    const service: PhysicalEvidence = {
      ...physicalScope(state, 'repair-proof'),
      kind: 'REPAIR_SERVICE',
      itemId: 'armor',
      targetContainerId: 'pack',
      materialsContainerId: 'fixture-supply',
      providerId: 'provider',
      location: place,
      repairPoints: 5,
      poolId: 'local',
      providerWalletId: 'wallet-provider',
      moneyAccessEvidenceId: 'money-access',
      amountQ: cash(3),
    };
    const local = access(state);
    if (local.kind !== 'LOCAL_MONEY_ACCESS') throw new Error('fixture');
    const restricted = { ...local, recipientWalletIds: [] };
    const refused = prepareCompanyEconomy(
      state,
      cmd,
      context(state, cmd, [restricted], [], [service]),
    );
    expect(refused).toMatchObject({ kind: 'REJECTED', error: 'CONTACT_OR_ACCESS_REQUIRED' });
    expect(refused.state).toBe(state);
    const next = prepared(
      prepareCompanyEconomy(state, cmd, context(state, cmd, [local], [], [service])),
    ).next;
    expect(next.physical!.items.find((i) => i.itemId === 'armor')?.currentCondition).toBe(15);
    expect(next.finance.wallets.find((w) => w.walletId === 'purse')?.cashQ).toBe('7');
    expect(next.finance.wallets.find((w) => w.walletId === 'wallet-provider')?.cashQ).toBe('3');
    expect(next.physical!.items.filter((i) => i.definitionId === 'ration')).toEqual(
      state.physical!.items.filter((i) => i.definitionId === 'ration'),
    );
    expect(prepared(prepareCompanyEconomy(next, cmd, context(next, cmd))).next).toBe(next);
  });

  it('P2/P6: a verified arrival moves actually carried property, not remote or unrelated possessions', () => {
    const route = {
      kind: 'TRANSIT' as const,
      segmentId: 'route',
      from: 'outpost',
      to: 'village',
      startedAt: tick(0),
      arrivalNotBefore: tick(0),
    };
    const initial = visibleCharacter(carried(), 'worker-0', (p) => ({
      ...p,
      presence: { ...p.presence, assignment: 'NONE', fieldPartyId: null, location: route },
    }));
    const state: CompanyEconomyState = {
      ...initial,
      physical: {
        ...initial.physical!,
        containers: initial.physical!.containers.map((c) =>
          c.containerId === 'pack' ? { ...c, location: route } : c,
        ),
      },
    };
    const cmd = command(
      state,
      'Arrive',
      { characterId: 'worker-0', segmentId: 'route', arrivalEvidenceId: 'arrival' },
      'arrival',
      'WORLD_RECEIPT',
    );
    const ctx = context(
      state,
      cmd,
      [],
      [
        {
          ...scope(state, 'arrival'),
          sourceEventId: cmd.sourceEventId,
          kind: 'ARRIVAL',
          characterId: 'worker-0',
          segmentId: 'route',
          from: 'outpost',
          location: place,
        },
      ],
    );
    const next = prepared(prepareCompanyEconomy(state, cmd, ctx)).next;
    expect(next.physical!.containers.find((c) => c.containerId === 'pack')?.location).toEqual(
      place,
    );
    expect(next.physical!.containers.find((c) => c.containerId === 'fixture-supply')).toEqual(
      state.physical!.containers.find((c) => c.containerId === 'fixture-supply'),
    );
    expect(next.physical!.items).toEqual(state.physical!.items);
  });
});

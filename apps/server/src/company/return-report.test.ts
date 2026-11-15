import { campaignTick, moneyQ } from '@warwrit/game-core';
import type { CompanyCombatAggregateState, OrdinaryContractState } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { describe, expect, it } from 'vitest';
import {
  accruedReturnReportWagesQ,
  classifyReturnReportAcknowledgement,
  consumedReturnReportRations,
  hasReturnReportFacts,
  projectReturnReportEvent,
  projectEmptyWatchReturnOutcome,
  projectStretcherReturnOutcome,
  returnReportElapsedDays,
  settledMovementCount,
  settledReturnReportTick,
} from './return-report.js';

function withState(
  update: (state: CompanyCombatAggregateState) => CompanyCombatAggregateState,
): CompanyCombatAggregateState {
  return update(createCompanyCombatAggregateFixture().state);
}

describe('company return report facts', () => {
  it('uses the lagging settled domain tick instead of the world clock', () => {
    const state = withState((state) => ({
      ...state,
      economy: {
        ...state.economy,
        lifecycle: { ...state.economy.lifecycle, campaignTick: campaignTick('2200') },
        finance: { ...state.economy.finance, processedTick: campaignTick('1900') },
        physical: { ...state.economy.physical!, processedTick: campaignTick('1750') },
      },
    }));

    expect(settledReturnReportTick(state)).toBe('1750');
  });

  it('counts only stock rations and uses the exact delta from the acknowledged snapshot', () => {
    const state = withState((state) => ({
      ...state,
      economy: {
        ...state.economy,
        physical: {
          ...state.economy.physical!,
          food: [
            {
              sourceId: 'stock-source',
              membershipId: 'worker',
              fromTick: campaignTick('0'),
              toTick: campaignTick('1000'),
              channel: 'STOCK',
              unitsConsumed: '5',
            },
            {
              sourceId: 'provider-source',
              membershipId: 'worker',
              fromTick: campaignTick('1000'),
              toTick: campaignTick('2000'),
              channel: 'PROVIDER',
              unitsConsumed: '7',
            },
            {
              sourceId: 'late-catchup-source',
              membershipId: 'worker',
              fromTick: campaignTick('500'),
              toTick: campaignTick('2000'),
              channel: 'STOCK',
              unitsConsumed: '4',
            },
          ],
        },
      },
    }));
    const baseline = [
      { sourceId: 'stock-source', membershipId: 'worker', channel: 'STOCK', unitsConsumed: '2' },
      {
        sourceId: 'provider-source',
        membershipId: 'worker',
        channel: 'PROVIDER',
        unitsConsumed: '7',
      },
    ];

    expect(consumedReturnReportRations(state, baseline, '1000', '2000')).toEqual({
      unitsConsumed: 7n,
      includesLateSettlement: true,
      earliestFromTick: '0',
    });
  });

  it('counts only movements settled through the bounded tick', () => {
    const state = withState((state) => ({
      ...state,
      economy: {
        ...state.economy,
        finance: {
          ...state.economy.finance,
          movements: [
            {
              movementId: 'm1',
              from: 'a',
              to: 'b',
              amountQ: moneyQ('1'),
              purpose: 'WAGE',
              atTick: campaignTick('10'),
            },
            {
              movementId: 'm2',
              from: 'a',
              to: 'b',
              amountQ: moneyQ('1'),
              purpose: 'CARE',
              atTick: campaignTick('20'),
            },
            {
              movementId: 'm3',
              from: 'a',
              to: 'b',
              amountQ: moneyQ('1'),
              purpose: 'WAGE',
              atTick: campaignTick('30'),
            },
          ],
        },
      },
    }));

    expect(settledMovementCount(state, '20')).toBe(2);
    expect(settledMovementCount(state, '15')).toBe(1);
    const outOfOrder = withState((current) => ({
      ...current,
      economy: {
        ...current.economy,
        finance: {
          ...current.economy.finance,
          movements: [
            {
              movementId: 'm1',
              from: 'a',
              to: 'b',
              amountQ: moneyQ('1'),
              purpose: 'WAGE',
              atTick: campaignTick('10'),
            },
            {
              movementId: 'm2',
              from: 'a',
              to: 'b',
              amountQ: moneyQ('1'),
              purpose: 'CARE',
              atTick: campaignTick('20'),
            },
            {
              movementId: 'm3',
              from: 'a',
              to: 'b',
              amountQ: moneyQ('1'),
              purpose: 'WAGE',
              atTick: campaignTick('15'),
            },
          ],
        },
      },
    }));
    expect(settledMovementCount(outOfOrder, '15')).toBeUndefined();
  });

  it('calculates uncovered wages on the exact interval without treating maintenance as owed pay', () => {
    const state = withState((state) => ({
      ...state,
      economy: {
        ...state.economy,
        finance: {
          ...state.economy.finance,
          claims: [
            {
              claimId: 'claim',
              membershipId: 'worker',
              poolId: 'pool',
              rateVersion: 'v1',
              dueAt: campaignTick('200'),
              fromTick: campaignTick('0'),
              toTick: campaignTick('200'),
              dailyWageMilli: '3',
              maintenanceId: null,
              earned: [
                {
                  fromTick: campaignTick('0'),
                  toTick: campaignTick('100'),
                  dailyWageMilli: '3',
                  maintenanceId: null,
                },
                {
                  fromTick: campaignTick('100'),
                  toTick: campaignTick('200'),
                  dailyWageMilli: '9',
                  maintenanceId: 'covered',
                },
              ],
              paidQ: moneyQ('0'),
              reportedQ: moneyQ('0'),
              reportedCoveredQ: moneyQ('0'),
            },
          ],
        },
      },
    }));

    expect(accruedReturnReportWagesQ(state, '50', '150')).toBe(150n);
  });

  it('formats partial campaign days and suppresses a factually empty interval', () => {
    expect(returnReportElapsedDays(1n)).toBe('0.001');
    expect(returnReportElapsedDays(1250n)).toBe('1.25');
    expect(
      hasReturnReportFacts({
        elapsedTicks: 2000n,
        rationsConsumed: 0n,
        paidQ: 0n,
        accruedQ: 0n,
        oldOwedQ: 4n,
        owedQ: 4n,
        oldDebtQ: 0n,
        debtQ: 0n,
        eventCount: 0,
      }),
    ).toBe(false);
  });

  it('accepts an exact duplicate acknowledgement but rejects any unoffered report ID', () => {
    const acknowledged = {
      last_acknowledged_report_id: 'offered-id',
      offered_report_id: null,
    };
    expect(classifyReturnReportAcknowledgement(acknowledged, 'offered-id')).toBe('DUPLICATE');
    expect(classifyReturnReportAcknowledgement(acknowledged, 'another-id')).toBe('STALE');
    expect(
      classifyReturnReportAcknowledgement(
        { last_acknowledged_report_id: null, offered_report_id: 'offered-id' },
        'offered-id',
      ),
    ).toBe('CURRENT');
  });

  it('projects empty-watch choice and delayed outcomes only after their saved phases', () => {
    const project = (slotId: string, companyId: string) => {
      const sourceEventId = `contract:${slotId}`;
      const state = {
        outcome: {
          kind: 'SUCCESS',
          companyId: 'company-a',
          sourceEventId,
          atTick: '20',
        },
        facts: [
          {
            slotId,
            companyId: 'company-a',
            sourceEventId,
            atTick: '20',
          },
        ],
      } as unknown as OrdinaryContractState;
      return projectEmptyWatchReturnOutcome(state, companyId, '15', '25');
    };

    expect(project('empty-watch-sack-handed-over', 'company-a')).toEqual([
      {
        instanceId: 'ci.m1.empty-watch-record.01',
        outcome: 'PROKOP_HANDED_OVER',
        atTick: '20',
      },
    ]);
    expect(project('empty-watch-proof-destroyed', 'company-a')).toEqual([
      {
        instanceId: 'ci.m1.empty-watch-record.01',
        outcome: 'PROOF_DESTROYED',
        atTick: '20',
      },
    ]);
    expect(project('empty-watch-proof-destroyed', 'company-b')).toEqual([]);
    const handedOver = {
      outcome: {
        kind: 'SUCCESS',
        companyId: 'company-a',
        sourceEventId: 'contract:empty-watch-sack-handed-over',
        atTick: '20',
      },
      facts: [
        {
          slotId: 'empty-watch-sack-handed-over',
          companyId: 'company-a',
          sourceEventId: 'contract:empty-watch-sack-handed-over',
          atTick: '20',
        },
      ],
    } as unknown as OrdinaryContractState;
    expect(projectEmptyWatchReturnOutcome(handedOver, 'company-a', '20', '2019')).toHaveLength(1);
    expect(projectEmptyWatchReturnOutcome(handedOver, 'company-a', '20', '2020')).toEqual([
      {
        instanceId: 'ci.m1.empty-watch-record.01',
        outcome: 'PROKOP_HANDED_OVER',
        atTick: '20',
      },
      {
        instanceId: 'ci.m1.empty-watch-record.01',
        outcome: 'REFUGEE_CAMP_REMOVED',
        atTick: '2020',
      },
    ]);
    const proofDestroyed = {
      outcome: {
        kind: 'SUCCESS',
        companyId: 'company-a',
        sourceEventId: 'contract:empty-watch-proof-destroyed',
        atTick: '20',
      },
      facts: [
        {
          slotId: 'empty-watch-proof-destroyed',
          companyId: 'company-a',
          sourceEventId: 'contract:empty-watch-proof-destroyed',
          atTick: '20',
        },
      ],
    } as unknown as OrdinaryContractState;
    const beforeInterval = project('empty-watch-proof-destroyed', 'company-a');
    expect(projectEmptyWatchReturnOutcome(proofDestroyed, 'company-a', '20', '25')).toEqual([
      {
        instanceId: 'ci.m1.empty-watch-record.01',
        outcome: 'PROOF_DESTROYED',
        atTick: '20',
      },
    ]);
    expect(
      projectEmptyWatchReturnOutcome(
        proofDestroyed,
        'company-a',
        '20',
        '25',
        new Set(['ci.m1.empty-watch-record.01:contract:empty-watch-proof-destroyed']),
      ),
    ).toEqual([]);
    const fordRevealed = {
      ...proofDestroyed,
      facts: [
        ...proofDestroyed.facts,
        {
          slotId: 'empty-watch-old-ford-revealed',
          companyId: 'company-a',
          sourceEventId: 'empty-watch-read-old-ford',
          atTick: '3020',
        },
      ],
    } as unknown as OrdinaryContractState;
    expect(projectEmptyWatchReturnOutcome(fordRevealed, 'company-a', '20', '3020')).toEqual([
      {
        instanceId: 'ci.m1.empty-watch-record.01',
        outcome: 'PROOF_DESTROYED',
        atTick: '20',
      },
      {
        instanceId: 'ci.m1.empty-watch-record.01',
        outcome: 'OLD_FORD_REVEALED',
        atTick: '3020',
      },
    ]);
    expect(projectEmptyWatchReturnOutcome(fordRevealed, 'company-b', '20', '3020')).toEqual([]);
    expect(beforeInterval).toHaveLength(1);
  });

  it('reports the blue-kerchief choice and delayed Luka offer only to its company', () => {
    const rescued = {
      outcome: {
        kind: 'SUCCESS',
        companyId: 'company-a',
        sourceEventId: 'contract:deliver-luka',
        atTick: '20',
      },
      facts: [
        {
          slotId: 'stretcher-luka-delivered',
          companyId: 'company-a',
          sourceEventId: 'contract:deliver-luka',
          atTick: '20',
        },
        {
          slotId: 'stretcher-luka-recruit-offer',
          companyId: 'company-a',
          sourceEventId: 'observe-luka-at-camp',
          atTick: '3020',
        },
      ],
    } as unknown as OrdinaryContractState;
    expect(projectStretcherReturnOutcome(rescued, 'company-a', '15', '25')).toEqual([
      {
        instanceId: 'ci.m1.stretcher-and-sword.01',
        outcome: 'LUKA_RESCUED',
        atTick: '20',
      },
    ]);
    expect(projectStretcherReturnOutcome(rescued, 'company-a', '1000', '3019')).toEqual([]);
    expect(
      projectStretcherReturnOutcome(
        rescued,
        'company-a',
        '1000',
        '3020',
        new Set(['ci.m1.stretcher-and-sword.01:LUKA_RECRUIT_OFFER:observe-luka-at-camp']),
      ),
    ).toEqual([]);
    expect(projectStretcherReturnOutcome(rescued, 'company-b', '15', '3020')).toEqual([]);

    const lost = {
      ...rescued,
      facts: [
        {
          slotId: 'stretcher-luka-dead',
          companyId: 'company-a',
          sourceEventId: 'contract:leave-luka',
          atTick: '10',
        },
      ],
      outcome: {
        kind: 'SUCCESS',
        companyId: 'company-a',
        sourceEventId: 'contract:deliver-nastya',
        atTick: '20',
      },
    } as unknown as OrdinaryContractState;
    expect(projectStretcherReturnOutcome(lost, 'company-a', '15', '25')).toEqual([
      {
        instanceId: 'ci.m1.stretcher-and-sword.01',
        outcome: 'NASTYA_ONLY',
        atTick: '20',
      },
    ]);
    const observed = {
      ...lost,
      facts: [
        ...lost.facts,
        {
          slotId: 'stretcher-luka-death-observed',
          companyId: 'company-a',
          sourceEventId: 'inspect-return-road',
          atTick: '40',
        },
      ],
    } as unknown as OrdinaryContractState;
    expect(projectStretcherReturnOutcome(observed, 'company-a', '25', '39')).toEqual([]);
    expect(projectStretcherReturnOutcome(observed, 'company-a', '25', '40')).toEqual([
      {
        instanceId: 'ci.m1.stretcher-and-sword.01',
        outcome: 'LUKA_DEATH_OBSERVED',
        atTick: '40',
      },
    ]);
  });

  it('hides allowlisted audit events until the lifecycle observer knows their IDs and subjects', () => {
    const event = {
      id: 'event-known',
      type: 'ServiceStarted',
      atTick: '12',
      subjectIds: ['a-leader'],
    };

    expect(
      projectReturnReportEvent(event, '20', new Set(['event-known']), new Set(['a-leader'])),
    ).toEqual({ type: 'ServiceStarted', atTick: '12', subjectIds: ['a-leader'] });
    expect(projectReturnReportEvent(event, '20', new Set(), new Set(['a-leader']))).toBeUndefined();
    expect(
      projectReturnReportEvent(event, '20', new Set(['event-known']), new Set()),
    ).toBeUndefined();
  });
});

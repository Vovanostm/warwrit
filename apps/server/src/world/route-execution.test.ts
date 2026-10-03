import { describe, expect, it } from 'vitest';
import {
  campaignTick,
  TRAVEL_RULES,
  WORLD_REGION_VERSION,
  type PartyRouteExecution,
} from '@warwrit/game-core';

import { readRouteExecutionEnvelope, routeArrivalCommandId } from './route-execution.js';

function inTransitExecution(): PartyRouteExecution {
  return {
    schemaVersion: 2,
    routeExecutionId: 'route-execution-1',
    worldId: 'seroe-porechye',
    companyId: 'company-alpha',
    partyId: 'party-alpha',
    regionVersion: WORLD_REGION_VERSION,
    profileId: TRAVEL_RULES.profileId,
    routeEpoch: '1',
    purpose: 'NEW',
    edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
    phase: 'IN_TRANSIT',
    nextEdgeIndex: 0,
    currentSiteId: 'severny-dvor',
    segment: {
      segmentId: 'segment-1',
      fromSiteId: 'severny-dvor',
      toSiteId: 'kamenny-brod',
      startedAt: campaignTick('1000'),
      dueTick: campaignTick('1010'),
    },
  };
}

describe('route arrival command identity', () => {
  it('binds deterministic identity to the persisted route cursor and due segment', () => {
    const execution = inTransitExecution();

    const commandId = routeArrivalCommandId(execution);

    expect(routeArrivalCommandId({ ...execution })).toBe(commandId);
    expect(routeArrivalCommandId({ ...execution, nextEdgeIndex: 1 })).not.toBe(commandId);
    expect(
      routeArrivalCommandId({
        ...execution,
        segment: { ...execution.segment!, dueTick: campaignTick('1011') },
      }),
    ).not.toBe(commandId);
  });
});

describe('stored route execution envelope', () => {
  it('requires a pending edge at a boundary and an exhausted cursor at completion', () => {
    const inTransit = inTransitExecution();
    const execution: PartyRouteExecution = {
      ...inTransit,
      phase: 'AT_BOUNDARY',
      nextEdgeIndex: 1,
      currentSiteId: 'kamenny-brod',
      segment: null,
    };
    const envelope = { acceptedByAccountId: 'account-owner', execution };

    expect(readRouteExecutionEnvelope(envelope)).toEqual(envelope);
    expect(() =>
      readRouteExecutionEnvelope({
        ...envelope,
        execution: { ...execution, nextEdgeIndex: execution.edgeIds.length },
      }),
    ).toThrow('Stored route execution is invalid');
    expect(
      readRouteExecutionEnvelope({
        ...envelope,
        execution: {
          ...execution,
          phase: 'COMPLETE',
          nextEdgeIndex: execution.edgeIds.length,
          currentSiteId: 'bereznyak',
        },
      }).execution.phase,
    ).toBe('COMPLETE');
  });
});

import { describe, expect, it } from 'vitest';
import {
  SEROE_PORECHYE,
  preparePartyArrival,
  preparePartyRoute,
  campaignTick,
} from '@warwrit/game-core';
import type { LifecycleState } from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';

const at = (siteId: string, areaId: string) => ({ kind: 'AT' as const, siteId, areaId });

function lifecycleAt(siteId: string, areaId: string): LifecycleState {
  const initial = economy([1n], 100n, 0).lifecycle;
  const location = at(siteId, areaId);
  return {
    ...initial,
    parties: initial.parties.map((party) => ({ ...party, location })),
    characters: initial.characters.map((character) => ({
      ...character,
      presence: { ...character.presence, location },
    })),
  };
}

function transitState(
  state: LifecycleState,
  segment: LifecycleState['parties'][number]['location'],
) {
  return {
    ...state,
    parties: state.parties.map((party) => ({ ...party, location: segment })),
    characters: state.characters.map((character) =>
      character.presence.fieldPartyId === 'party'
        ? { ...character, presence: { ...character.presence, location: segment } }
        : character,
    ),
  };
}

function routeSupplyAssessment(state: LifecycleState, atTick: string, edgeIds: readonly string[]) {
  return {
    worldId: state.worldId,
    companyId: state.companyId,
    partyId: 'party',
    canonicalRevision: state.revision,
    atTick: campaignTick(atTick),
    edgeIds,
    knownShortage: false,
    assumptions: ['fixture assessment'],
  };
}

describe('world route preparation', () => {
  it('prepares one authored adjacent free intent with exact ticks and every party mover', () => {
    const state = lifecycleAt('kamenny-brod', 'kamenny-brod-market');
    const before = structuredClone(state);
    const edge = SEROE_PORECHYE.edges.find(
      (candidate) => candidate.edgeId === 'kamenny-brod-tikhaya-gat',
    )!;
    const proposal = preparePartyRoute({
      region: SEROE_PORECHYE,
      state,
      partyId: 'party',
      intent: { kind: 'FREE_INTENT', edgeIds: ['kamenny-brod-tikhaya-gat'], purpose: 'NEW' },
      atTick: campaignTick('1000'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
    });

    expect(proposal.segment).toMatchObject({ fromSiteId: 'kamenny-brod', toSiteId: 'tikhaya-gat' });
    expect(proposal.segment.startedAt).toBe('1000');
    expect(BigInt(proposal.segment.arrivalNotBefore) - BigInt(proposal.segment.startedAt)).toBe(
      BigInt(edge.provisionalTravelTicks),
    );
    expect(proposal.memberMoves.map((move) => move.characterId)).toEqual(['leader', 'worker-0']);
    expect(proposal.carrierFollow).toHaveLength(proposal.memberMoves.length + 1);
    expect(proposal.route[0]).toMatchObject({ edgeId: edge.edgeId, danger: 'SAFE' });
    expect(state).toEqual(before);
  });

  it('owns retained source locations in the prepared movement obligations', () => {
    const state = lifecycleAt('kamenny-brod', 'kamenny-brod-market');
    const proposal = preparePartyRoute({
      region: SEROE_PORECHYE,
      state,
      partyId: 'party',
      intent: { kind: 'FREE_INTENT', edgeIds: ['kamenny-brod-tikhaya-gat'], purpose: 'NEW' },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
    });
    const sourceLocation = state.characters[0]!.presence.location as {
      kind: 'AT';
      siteId: string;
      areaId: string;
    };
    sourceLocation.areaId = 'mutated-after-preparation';

    expect(proposal.memberMoves[0]!.from).toEqual(at('kamenny-brod', 'kamenny-brod-market'));
    expect(proposal.carrierFollow[1]!.from).toEqual(at('kamenny-brod', 'kamenny-brod-market'));
  });

  it('rejects off-route edges, incomplete party facts and members who cannot travel', () => {
    const state = lifecycleAt('kamenny-brod', 'kamenny-brod-market');
    const prepare = (overrides: Partial<Parameters<typeof preparePartyRoute>[0]> = {}) =>
      preparePartyRoute({
        region: SEROE_PORECHYE,
        state,
        partyId: 'party',
        intent: { kind: 'FREE_INTENT', edgeIds: ['tikhaya-gat-staraya-melnitsa'], purpose: 'NEW' },
        atTick: campaignTick('0'),
        expectedRouteEpoch: '0',
        currentRouteEpoch: '0',
        ...overrides,
      });

    expect(() => prepare()).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTE' }));
    const incomplete = {
      ...state,
      characters: state.characters.filter(
        (character) => character.identity.characterId !== 'worker-0',
      ),
    };
    expect(() => prepare({ state: incomplete })).toThrowError(
      expect.objectContaining({ code: 'INCOMPLETE_PARTY' }),
    );
    const mismatched = {
      ...state,
      characters: state.characters.map((character, index) =>
        index === 1
          ? {
              ...character,
              presence: { ...character.presence, location: at('bereznyak', 'bereznyak-green') },
            }
          : character,
      ),
    };
    expect(() => prepare({ state: mismatched })).toThrowError(
      expect.objectContaining({ code: 'PARTY_MEMBER_TRAVEL_UNSUPPORTED' }),
    );
    const unavailable = {
      ...state,
      characters: state.characters.map((character, index) =>
        index === 1
          ? {
              ...character,
              presence: { ...character.presence, availability: 'IN_ENCOUNTER' as const },
            }
          : character,
      ),
    };
    expect(() => prepare({ state: unavailable })).toThrowError(
      expect.objectContaining({ code: 'PARTY_MEMBER_TRAVEL_UNSUPPORTED' }),
    );
    expect(() => prepare({ state: { ...state, campaignTick: campaignTick('500') } })).toThrowError(
      expect.objectContaining({ code: 'STALE_ROUTE_TIME' }),
    );
    const unauthoredArea = {
      ...state,
      parties: state.parties.map((party) => ({
        ...party,
        location: at('kamenny-brod', 'unmapped-area'),
      })),
      characters: state.characters.map((character) =>
        character.presence.fieldPartyId === 'party'
          ? {
              ...character,
              presence: { ...character.presence, location: at('kamenny-brod', 'unmapped-area') },
            }
          : character,
      ),
    };
    expect(() => prepare({ state: unauthoredArea })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ROUTE' }),
    );
  });

  it('limits the shortage guard to new dangerous routes and scopes dangerous return or camp', () => {
    const state = lifecycleAt('tikhaya-gat', 'tikhaya-gat-bank');
    const base = {
      region: SEROE_PORECHYE,
      state,
      partyId: 'party',
      intent: {
        kind: 'FREE_INTENT' as const,
        edgeIds: ['tikhaya-gat-staraya-melnitsa'],
        purpose: 'NEW' as const,
      },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
    };
    expect(() => preparePartyRoute(base)).toThrowError(
      expect.objectContaining({ code: 'MISSING_DANGEROUS_SUPPLY_ASSESSMENT' }),
    );
    expect(() =>
      preparePartyRoute({
        ...base,
        supplyAssessment: {
          ...routeSupplyAssessment(state, '0', base.intent.edgeIds),
          knownShortage: true,
          assumptions: ['known empty'],
        },
      }),
    ).toThrowError(expect.objectContaining({ code: 'KNOWN_DANGEROUS_SUPPLY_SHORTAGE' }));
    expect(() =>
      preparePartyRoute({
        ...base,
        supplyAssessment: routeSupplyAssessment(state, '0', base.intent.edgeIds),
      }),
    ).not.toThrow();
    const safeRoute = {
      ...base,
      state: lifecycleAt('kamenny-brod', 'kamenny-brod-market'),
      intent: {
        ...base.intent,
        edgeIds: ['kamenny-brod-tikhaya-gat'],
        purpose: 'RETURN' as const,
      },
    };
    expect(() => preparePartyRoute(safeRoute)).not.toThrow();
    expect(() =>
      preparePartyRoute({ ...safeRoute, intent: { ...safeRoute.intent, purpose: 'CAMP' } }),
    ).not.toThrow();
    expect(() =>
      preparePartyRoute({ ...base, intent: { ...base.intent, purpose: 'RETURN' } }),
    ).toThrowError(
      expect.objectContaining({ code: 'MISSING_SCOPED_RETURN_OR_CAMP_AUTHORIZATION' }),
    );
    expect(() =>
      preparePartyRoute({ ...base, intent: { ...base.intent, purpose: 'CAMP' } }),
    ).toThrowError(
      expect.objectContaining({ code: 'MISSING_SCOPED_RETURN_OR_CAMP_AUTHORIZATION' }),
    );
  });

  it('rejects dangerous supply assessments outside the exact route scope', () => {
    const state = lifecycleAt('kamenny-brod', 'kamenny-brod-market');
    const intent = {
      kind: 'ROUTE' as const,
      edgeIds: ['kamenny-brod-tikhaya-gat', 'tikhaya-gat-staraya-melnitsa'],
      purpose: 'NEW' as const,
    };
    const base = {
      region: SEROE_PORECHYE,
      state,
      partyId: 'party',
      intent,
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
    };
    const assessment = routeSupplyAssessment(state, '0', intent.edgeIds);
    const invalidAssessments = [
      { ...assessment, worldId: 'another-world' },
      { ...assessment, companyId: 'another-company' },
      { ...assessment, partyId: 'another-party' },
      { ...assessment, canonicalRevision: '1' },
      { ...assessment, atTick: campaignTick('1') },
      { ...assessment, edgeIds: [...intent.edgeIds].reverse() },
    ];
    for (const supplyAssessment of invalidAssessments) {
      expect(() => preparePartyRoute({ ...base, supplyAssessment })).toThrowError(
        expect.objectContaining({ code: 'INVALID_DANGEROUS_SUPPLY_ASSESSMENT' }),
      );
    }
  });

  it('validates not-before and current epoch, and derives every arrival area from the authored site', () => {
    const initial = lifecycleAt('tikhaya-gat', 'tikhaya-gat-bank');
    const route = preparePartyRoute({
      region: SEROE_PORECHYE,
      state: initial,
      partyId: 'party',
      intent: { kind: 'FREE_INTENT', edgeIds: ['tikhaya-gat-staraya-melnitsa'], purpose: 'NEW' },
      atTick: campaignTick('50'),
      expectedRouteEpoch: '4',
      currentRouteEpoch: '4',
      supplyAssessment: routeSupplyAssessment(initial, '50', ['tikhaya-gat-staraya-melnitsa']),
    });
    const state = transitState(initial, {
      kind: 'TRANSIT',
      segmentId: route.segment.segmentId,
      from: route.segment.fromSiteId,
      to: route.segment.toSiteId,
      startedAt: route.segment.startedAt,
      arrivalNotBefore: route.segment.arrivalNotBefore,
    });
    const candidate = {
      worldId: state.worldId,
      partyId: route.partyId,
      segmentId: route.segment.segmentId,
      regionVersion: route.regionVersion,
      routeEpoch: route.routeEpoch,
      cause: 'ROUTE_ARRIVAL' as const,
      location: at('staraya-melnitsa', 'staraya-melnitsa-yard'),
      notBefore: route.segment.arrivalNotBefore,
    };
    const input = {
      region: SEROE_PORECHYE,
      state,
      candidate,
      acceptedRoute: route,
      currentRouteEpoch: route.routeEpoch,
    };
    const beforeNotBefore = campaignTick((BigInt(route.segment.arrivalNotBefore) - 1n).toString());
    const changedEpoch = (BigInt(route.routeEpoch) + 1n).toString();
    expect(() => preparePartyArrival({ ...input, atTick: beforeNotBefore })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ARRIVAL' }),
    );
    expect(() =>
      preparePartyArrival({
        ...input,
        currentRouteEpoch: changedEpoch,
        atTick: route.segment.arrivalNotBefore,
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARRIVAL' }));
    const arrival = preparePartyArrival({ ...input, atTick: route.segment.arrivalNotBefore });
    expect(arrival.location).toEqual(at('staraya-melnitsa', 'staraya-melnitsa-yard'));
    expect(arrival.memberMoves).toHaveLength(2);
    expect(arrival.carrierFollow).toHaveLength(3);
    expect(arrival.memberMoves.every((move) => move.to.areaId === 'staraya-melnitsa-yard')).toBe(
      true,
    );
    expect(() =>
      preparePartyArrival({
        ...input,
        state: { ...state, campaignTick: campaignTick('500') },
        atTick: route.segment.arrivalNotBefore,
      }),
    ).toThrowError(expect.objectContaining({ code: 'STALE_ROUTE_TIME' }));
  });
});

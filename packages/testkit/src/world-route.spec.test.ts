import { describe, expect, it } from 'vitest';
import {
  SEROE_PORECHYE,
  accrueFinance,
  assessPhysicalFoodStock,
  preparePartyArrival,
  preparePartyRoute,
  preparePartyTravelArrival,
  preparePartyTravelDeparture,
  preparePartyRouteExecutionDeparture,
  preparePartyRouteExecutionArrival,
  continuePartyRouteExecution,
  preparePartyRouteExecution,
  preparePartyRouteContinuation,
  prepareRouteExecutionArrival,
  prepareCompanyEconomy,
  campaignTick,
  entityId,
  createCompanyLearningState,
  createCombatEncounterApplication,
  createSocialState,
  readCompanyCombatAggregateState,
  TRAVEL_RULES,
  FIRST_HUNT_PROFILE_ID,
  travelProfile,
  observePartyMovement,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  LifecycleState,
  MaterializedCompanyState,
} from '@warwrit/game-core';
import { advance, command, context, economy } from './company-economy-fixture.js';

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

  it('allows a server-scoped FIRST HUNT return without applying the new-departure shortage gate', () => {
    const state = lifecycleAt('staraya-melnitsa', 'staraya-melnitsa-yard');
    const edgeIds = ['tikhaya-gat-staraya-melnitsa'];
    const departure = preparePartyRoute({
      region: SEROE_PORECHYE,
      state,
      partyId: 'party',
      intent: { kind: 'ROUTE', edgeIds, purpose: 'RETURN' },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      dangerousAuthorization: {
        instanceId: 'ci.m1.raider-standard.01',
        profileId: FIRST_HUNT_PROFILE_ID,
        termsDigest: 'a'.repeat(64),
        purpose: 'RETURN',
        worldId: state.worldId,
        companyId: state.companyId,
        partyId: 'party',
        canonicalRevision: state.revision,
        atTick: campaignTick('0'),
        edgeIds,
      },
    });

    expect(departure).toMatchObject({
      purpose: 'RETURN',
      segment: { fromSiteId: 'staraya-melnitsa', toSiteId: 'tikhaya-gat' },
      assumptions: [],
    });
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

describe('safe travel alpha composition', () => {
  function fieldRoot(atTick = 0): CompanyEconomyState {
    const initial = economy([1n], 100n, atTick);
    const physical = initial.physical;
    if (!physical) throw new Error('Expected physical fixture state');
    const origin = at('severny-dvor', 'severny-dvor-yard');
    return {
      ...initial,
      lifecycle: {
        ...initial.lifecycle,
        parties: initial.lifecycle.parties.map((party) => ({ ...party, location: origin })),
        characters: initial.lifecycle.characters.map((character) =>
          character.presence.fieldPartyId === 'party'
            ? { ...character, presence: { ...character.presence, location: origin } }
            : character,
        ),
      },
      physical: {
        ...physical,
        vitals: initial.lifecycle.characters
          .filter((character) => character.presence.fieldPartyId === 'party')
          .map((character) => ({
            characterId: character.identity.characterId,
            sourceId: `travel-vitals-${character.identity.characterId}`,
            maximumHealth: 100,
            currentHealth: 100,
            healthCarry: '0',
            maximumStamina: 100,
            currentStamina: 100,
            staminaCarry: '0',
          })),
        knowledge: {
          ...physical.knowledge,
          vitalSnapshots: initial.lifecycle.characters
            .filter((character) => character.presence.fieldPartyId === 'party')
            .map((character) => ({
              characterId: character.identity.characterId,
              sourceId: `travel-vitals-${character.identity.characterId}`,
              maximumHealth: 100,
              currentHealth: 100,
              healthCarry: '0',
              maximumStamina: 100,
              currentStamina: 100,
              staminaCarry: '0',
            })),
        },
        containers: physical.containers.map((container) => ({
          ...container,
          location: origin,
          carrier: { kind: 'PARTY' as const, id: 'party' },
        })),
      },
    };
  }

  function advanceTravel(state: CompanyEconomyState, commandId: string) {
    if (!state.physical) throw new Error('Expected physical fixture state');
    const departure = preparePartyTravelDeparture({
      root: {
        lifecycle: state.lifecycle,
        finance: state.finance,
        physical: state.physical,
      },
      region: SEROE_PORECHYE,
      partyId: 'party',
      intent: {
        kind: 'FREE_INTENT',
        edgeIds: ['kamenny-brod-severny-dvor'],
        purpose: 'NEW',
      },
      atTick: campaignTick(state.lifecycle.campaignTick),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: `safe-${commandId}`,
    });
    const transitState: CompanyEconomyState = {
      ...state,
      lifecycle: departure.root.lifecycle,
      physical: departure.root.physical,
    };
    const toTick = departure.route.segment.arrivalNotBefore;
    const advanceCommand = command(
      transitState,
      'AdvanceCampaign',
      { toTick, authoritativeInputs: [] },
      commandId,
      'SYSTEM',
      campaignTick(toTick),
    );
    const result = prepareCompanyEconomy(transitState, advanceCommand, {
      ...context(transitState, advanceCommand, [], [], []),
      physicalFacts: [],
      trustedTransitSegments: [departure.transitSegment],
    });
    return { departure, transitState, advanceCommand, result };
  }

  function ration(
    itemId: string,
    owner: { readonly kind: 'COMPANY' | 'WORLD' | 'CHARACTER' | 'ESTATE'; readonly id: string },
    quantity: number,
  ) {
    return {
      itemId,
      definitionId: 'ration',
      owner,
      containerId: 'fixture-supply',
      quantity,
      currentCondition: 10000,
      maximumCondition: 10000,
      contentRevision: '1',
      provenance: { sourceId: 'transit-food-fixture', parentItemId: null, ordinal: 0 },
      equipped: null,
      tombstone: null,
    } as const;
  }

  it('does not debit WORLD-owned stock from a WORLD-custodied party container', () => {
    const base = fieldRoot();
    if (!base.physical) throw new Error('Expected physical fixture state');
    const state: CompanyEconomyState = {
      ...base,
      physical: {
        ...base.physical,
        containers: base.physical.containers.map((container) => ({
          ...container,
          custodian: { kind: 'WORLD' as const, id: base.lifecycle.worldId },
          access: 'COMPANY' as const,
        })),
        items: [ration('world-rations', { kind: 'WORLD', id: base.lifecycle.worldId }, 100)],
      },
    };
    const { transitState, result } = advanceTravel(state, 'world-owned-rations');
    const before = structuredClone(transitState);

    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_ITEMS' });
    expect(result.state).toEqual(before);
    expect(result.state.physical?.items).toEqual(state.physical?.items);
    expect(result.state.physical?.containers[0]?.location.kind).toBe('TRANSIT');
  });

  it('consumes authorized company stock from a character-carried transit container', () => {
    const base = fieldRoot();
    if (!base.physical) throw new Error('Expected physical fixture state');
    const state: CompanyEconomyState = {
      ...base,
      physical: {
        ...base.physical,
        items: [
          ration(
            'character-carried-rations',
            {
              kind: 'COMPANY',
              id: base.lifecycle.companyId,
            },
            5,
          ),
        ],
        containers: base.physical.containers.map((container) => ({
          ...container,
          carrier: { kind: 'CHARACTER' as const, id: 'leader' },
        })),
      },
    };
    const { result } = advanceTravel(state, 'character-carried-rations');

    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') throw new Error(result.error);
    expect(result.next.physical?.items[0]?.quantity).toBe(3);
  });

  it('rejects atomically when company stock is short even if foreign stock is abundant', () => {
    const base = fieldRoot();
    if (!base.physical) throw new Error('Expected physical fixture state');
    const state: CompanyEconomyState = {
      ...base,
      physical: {
        ...base.physical,
        items: [
          ration('company-rations', { kind: 'COMPANY', id: base.lifecycle.companyId }, 1),
          ration('world-rations', { kind: 'WORLD', id: base.lifecycle.worldId }, 100),
        ],
      },
    };
    const { transitState, result } = advanceTravel(state, 'short-company-rations');
    const before = structuredClone(transitState);

    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_ITEMS' });
    expect(result.state).toEqual(before);
  });

  it('debits only company-owned items in mixed stock', () => {
    const base = fieldRoot();
    if (!base.physical) throw new Error('Expected physical fixture state');
    const state: CompanyEconomyState = {
      ...base,
      physical: {
        ...base.physical,
        items: [
          ration('personal-rations', { kind: 'CHARACTER', id: 'leader' }, 100),
          ration('company-rations', { kind: 'COMPANY', id: base.lifecycle.companyId }, 5),
        ],
      },
    };
    const { result } = advanceTravel(state, 'mixed-rations');

    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') throw new Error(result.error);
    expect(result.next.physical?.items.map((item) => [item.itemId, item.quantity]).sort()).toEqual([
      ['company-rations', 3],
      ['personal-rations', 100],
    ]);
  });

  it('selects the same ascending company item IDs when stock input order is permuted', () => {
    const base = fieldRoot();
    if (!base.physical) throw new Error('Expected physical fixture state');
    const first = ration('ration-a', { kind: 'COMPANY', id: base.lifecycle.companyId }, 3);
    const second = ration('ration-z', { kind: 'COMPANY', id: base.lifecycle.companyId }, 4);
    const run = (items: readonly (typeof first)[]) => {
      const state: CompanyEconomyState = {
        ...base,
        physical: { ...base.physical!, items },
      };
      const { result } = advanceTravel(state, 'permuted-rations');
      expect(result.kind).toBe('PREPARED');
      if (result.kind !== 'PREPARED') throw new Error(result.error);
      return result.next.physical?.items.map((item) => [item.itemId, item.quantity]).sort();
    };

    expect(run([first, second])).toEqual(run([second, first]));
    expect(run([second, first])).toEqual([
      ['ration-a', 1],
      ['ration-z', 4],
    ]);
  });

  it('accepts a zero-unit transit demand backed by existing carry without a travelling container', () => {
    const base = fieldRoot(990);
    if (!base.physical) throw new Error('Expected physical fixture state');
    const travelingMemberships = base.lifecycle.memberships.filter((membership) =>
      base.lifecycle.characters.some(
        (character) =>
          character.identity.characterId === membership.characterId &&
          character.presence.fieldPartyId === 'party',
      ),
    );
    const state: CompanyEconomyState = {
      ...base,
      physical: {
        ...base.physical,
        containers: base.physical.containers.map((container) => ({
          ...container,
          carrier: null,
        })),
        items: base.physical.items.map((item) => ({ ...item, quantity: item.quantity - 1 })),
        food: travelingMemberships.map((membership) => ({
          sourceId: `backed-food-${membership.characterId}`,
          membershipId: membership.membershipId,
          fromTick: campaignTick('0'),
          toTick: campaignTick('990'),
          channel: 'STOCK' as const,
          unitsConsumed: '1',
        })),
        foodCarry: travelingMemberships.map((membership) => ({
          membershipId: membership.membershipId,
          tickUnits: '990',
        })),
      },
    };
    const { result } = advanceTravel(state, 'backed-carry-only');

    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') throw new Error(result.error);
    expect(result.next.physical?.foodCarry).toEqual(
      travelingMemberships.map((membership) => ({
        membershipId: membership.membershipId,
        tickUnits: '0',
      })),
    );
    expect(result.next.physical?.items).toEqual(state.physical?.items);
  });

  it('moves the whole party, consumes carried stock, and charges one elapsed stamina tick once', () => {
    const base = fieldRoot();
    const longMembershipId = entityId<'Membership'>('m'.repeat(256));
    const renameMembership = (membership: (typeof base.lifecycle.memberships)[number]) =>
      membership.membershipId === 'service-leader'
        ? { ...membership, membershipId: longMembershipId }
        : membership;
    const initial: CompanyEconomyState = {
      ...base,
      finance: {
        ...base.finance,
        accounts: base.finance.accounts.map((account) =>
          account.membershipId === 'service-leader'
            ? { ...account, membershipId: longMembershipId }
            : account,
        ),
      },
      lifecycle: {
        ...base.lifecycle,
        memberships: base.lifecycle.memberships.map(renameMembership),
      },
    };
    const initialPhysical = initial.physical;
    if (!initialPhysical) throw new Error('Expected physical fixture state');
    const root: MaterializedCompanyState = {
      lifecycle: initial.lifecycle,
      finance: initial.finance,
      physical: initialPhysical,
    };
    const departureInput = {
      root,
      region: SEROE_PORECHYE,
      partyId: 'party',
      intent: {
        kind: 'FREE_INTENT',
        edgeIds: ['kamenny-brod-severny-dvor'],
        purpose: 'NEW',
      },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
    } satisfies Omit<Parameters<typeof preparePartyTravelDeparture>[0], 'segmentId'>;
    const departure = preparePartyTravelDeparture({
      ...departureInput,
      segmentId: 'safe-trip-0001',
    });
    expect(departure.route.segment.segmentId).toBe('safe-trip-0001');
    expect(() =>
      preparePartyTravelDeparture({
        ...departureInput,
        segmentId: 's'.repeat(65),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTE' }));
    expect(() =>
      preparePartyTravelDeparture(
        departureInput as unknown as Parameters<typeof preparePartyTravelDeparture>[0],
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTE' }));
    const profile = travelProfile(departure.transitSegment.profileId)!;
    const duration = BigInt(departure.route.route[0]!.provisionalTravelTicks);
    const dueTick = BigInt(departure.route.segment.arrivalNotBefore);
    const staminaTicks = duration / BigInt(profile.staminaEveryTicks);
    const expectedStamina = 100 - Number(staminaTicks) * profile.staminaPerMember;
    expect(departure.route.segment).toMatchObject({
      startedAt: '0',
      fromSiteId: 'severny-dvor',
      toSiteId: 'kamenny-brod',
    });
    expect(dueTick - BigInt(departure.route.segment.startedAt)).toBe(duration);
    expect(profile).toEqual(TRAVEL_RULES);
    expect(travelProfile('unknown-profile')).toBeUndefined();
    expect(departure.transitSegment.profileId).toBe(TRAVEL_RULES.profileId);
    expect(departure.root.lifecycle.revision).toBe(
      (BigInt(root.lifecycle.revision) + 1n).toString(),
    );
    expect(departure.root.lifecycle.knowledge.revision).toBe(
      (BigInt(root.lifecycle.knowledge.revision) + 1n).toString(),
    );
    expect(departure.observationEvents).toHaveLength(
      root.lifecycle.characters.filter((entry) => entry.presence.fieldPartyId === 'party').length,
    );
    expect(
      departure.root.lifecycle.knowledge.characters
        .filter((entry) => entry.presence.fieldPartyId === 'party')
        .every((entry) => entry.presence.location.kind === 'TRANSIT'),
    ).toBe(true);

    const member = root.lifecycle.characters.find(
      (entry) => entry.presence.fieldPartyId === 'party',
    )!;
    const aptitudeKey = Object.keys(member.aptitudeBySkill)[0]!;
    const hiddenAptitude = member.aptitudeBySkill[aptitudeKey]!;
    const hiddenRoot = {
      ...root,
      lifecycle: {
        ...root.lifecycle,
        characters: root.lifecycle.characters.map((entry) =>
          entry.identity.characterId === member.identity.characterId
            ? {
                ...entry,
                aptitudeBySkill: {
                  ...entry.aptitudeBySkill,
                  [aptitudeKey]: hiddenAptitude === 10000 ? 9999 : hiddenAptitude + 1,
                },
              }
            : entry,
        ),
      },
    };
    const hiddenDeparture = preparePartyTravelDeparture({
      root: hiddenRoot,
      region: SEROE_PORECHYE,
      partyId: 'party',
      intent: {
        kind: 'FREE_INTENT',
        edgeIds: ['kamenny-brod-severny-dvor'],
        purpose: 'NEW',
      },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: 'safe-trip-0001',
    });
    expect(hiddenDeparture.root.lifecycle.knowledge.characters).toEqual(
      departure.root.lifecycle.knowledge.characters,
    );
    expect(
      hiddenDeparture.root.lifecycle.characters.find(
        (entry) => entry.identity.characterId === member.identity.characterId,
      )!.aptitudeBySkill[aptitudeKey],
    ).not.toBe(member.aptitudeBySkill[aptitudeKey]);
    expect(departure.root.lifecycle.parties[0]!.location.kind).toBe('TRANSIT');
    expect(
      departure.root.lifecycle.characters
        .filter((entry) => entry.presence.fieldPartyId)
        .every((entry) => entry.presence.location.kind === 'TRANSIT'),
    ).toBe(true);
    expect(departure.root.physical.containers[0]!.location.kind).toBe('TRANSIT');

    const arrivalCandidate = {
      worldId: initial.lifecycle.worldId,
      partyId: departure.route.partyId,
      segmentId: departure.route.segment.segmentId,
      regionVersion: departure.route.regionVersion,
      routeEpoch: departure.route.routeEpoch,
      cause: 'ROUTE_ARRIVAL' as const,
      location: at('kamenny-brod', 'kamenny-brod-market'),
      notBefore: campaignTick(dueTick.toString()),
    };
    const beforeEarlyArrival = structuredClone(departure.root);
    expect(() =>
      preparePartyTravelArrival({
        root: departure.root,
        region: SEROE_PORECHYE,
        candidate: arrivalCandidate,
        acceptedRoute: departure.route,
        currentRouteEpoch: departure.route.routeEpoch,
        trustedNow: campaignTick((dueTick - 1n).toString()),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARRIVAL' }));
    expect(departure.root).toEqual(beforeEarlyArrival);

    const transitState: CompanyEconomyState = {
      ...initial,
      lifecycle: departure.root.lifecycle,
      physical: departure.root.physical,
    };
    const settleTo = (
      state: CompanyEconomyState,
      toTick: string,
      commandId: string,
      transitSegment = departure.transitSegment,
    ) => {
      const advanceCommand = command(
        state,
        'AdvanceCampaign',
        { toTick, authoritativeInputs: [] },
        commandId,
        'SYSTEM',
        campaignTick(toTick),
      );
      const advanceContext = {
        ...context(state, advanceCommand, [], [], []),
        physicalFacts: [],
        trustedTransitSegments: [transitSegment],
      };
      const result = prepareCompanyEconomy(state, advanceCommand, advanceContext);
      if (result.kind !== 'PREPARED') throw new Error(result.error);
      return result.next;
    };
    const unknownProfileSegment = { ...departure.transitSegment, profileId: 'unknown-profile' };
    const unknownProfileCommand = command(
      transitState,
      'AdvanceCampaign',
      { toTick: dueTick.toString(), authoritativeInputs: [] },
      'safe-travel-unknown-profile',
      'SYSTEM',
      campaignTick(dueTick.toString()),
    );
    expect(
      prepareCompanyEconomy(transitState, unknownProfileCommand, {
        ...context(transitState, unknownProfileCommand, [], [], []),
        physicalFacts: [],
        trustedTransitSegments: [unknownProfileSegment],
      }),
    ).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    const advanced = settleTo(transitState, dueTick.toString(), 'safe-travel-advance');
    const chunkTick =
      duration < BigInt(profile.staminaEveryTicks)
        ? dueTick - 1n
        : BigInt(profile.staminaEveryTicks) - 1n;
    const chunked = settleTo(
      settleTo(transitState, chunkTick.toString(), 'safe-travel-advance-first-chunk'),
      dueTick.toString(),
      'safe-travel-advance-10',
    );
    expect(chunked.physical!.items).toEqual(advanced.physical!.items);
    expect(chunked.physical!.food).toEqual(advanced.physical!.food);
    expect(chunked.physical!.foodCarry).toEqual(advanced.physical!.foodCarry);
    expect(chunked.physical!.vitals).toEqual(advanced.physical!.vitals);
    expect(advanced.lifecycle.campaignTick).toBe(dueTick.toString());
    expect(
      advanced.physical!.food.map((entry) => [entry.membershipId, entry.fromTick, entry.toTick]),
    ).toEqual([
      [longMembershipId, '0', dueTick.toString()],
      ['service-worker-0', '0', dueTick.toString()],
    ]);
    const persisted = readCompanyCombatAggregateState({
      economy: {
        lifecycle: advanced.lifecycle,
        finance: advanced.finance,
        physical: advanced.physical!,
      },
      learning: createCompanyLearningState(),
      social: createSocialState(),
      encounter: createCombatEncounterApplication(),
    });
    expect(persisted.economy.physical!.food[0]!.membershipId).toBe(longMembershipId);
    expect(
      persisted.economy.physical!.sourceEffects.every((entry) => entry.key.length <= 256),
    ).toBe(true);
    const transitFoodEffect = persisted.economy
      .physical!.sourceEffects.filter((entry) => entry.requestKey.includes('TRANSIT_FOOD_V1'))
      .map((entry) => JSON.parse(entry.requestKey) as Record<string, string>)
      .find((entry) => entry['membershipId'] === longMembershipId);
    expect(transitFoodEffect).toMatchObject({
      segmentId: 'safe-trip-0001',
      routeEpoch: departure.route.routeEpoch,
      membershipId: longMembershipId,
    });
    expect(readCompanyCombatAggregateState(persisted)).toEqual(persisted);
    expect(advanced.physical!.items.reduce((sum, item) => sum + item.quantity, 0)).toBe(
      initialPhysical.items.reduce((sum, item) => sum + item.quantity, 0) - 2,
    );
    expect(
      advanced
        .physical!.vitals.filter((entry) => ['leader', 'worker-0'].includes(entry.characterId))
        .map((entry) => entry.currentStamina),
    ).toEqual([expectedStamina, expectedStamina]);

    const arrived = preparePartyTravelArrival({
      root: {
        lifecycle: advanced.lifecycle,
        finance: advanced.finance,
        physical: advanced.physical!,
      },
      region: SEROE_PORECHYE,
      candidate: arrivalCandidate,
      acceptedRoute: departure.route,
      currentRouteEpoch: departure.route.routeEpoch,
      trustedNow: campaignTick((dueTick + 60n).toString()),
    });
    expect(arrived.arrival.atTick).toBe(dueTick.toString());
    expect(arrived.root.lifecycle.revision).toBe(
      (BigInt(advanced.lifecycle.revision) + 1n).toString(),
    );
    expect(arrived.root.lifecycle.knowledge.revision).toBe(
      (BigInt(advanced.lifecycle.knowledge.revision) + 1n).toString(),
    );
    expect(arrived.observationEvents).toHaveLength(departure.observationEvents.length);
    expect(
      arrived.root.lifecycle.knowledge.characters
        .filter((entry) => entry.presence.fieldPartyId === 'party')
        .every(
          (entry) =>
            entry.presence.location.kind === 'AT' &&
            entry.presence.location.siteId === 'kamenny-brod',
        ),
    ).toBe(true);
    expect(arrived.root.lifecycle.parties[0]!.location).toEqual(
      at('kamenny-brod', 'kamenny-brod-market'),
    );
    expect(arrived.root.physical.containers[0]!.location).toEqual(
      at('kamenny-brod', 'kamenny-brod-market'),
    );
    expect(
      arrived.root.physical.vitals
        .filter((entry) => ['leader', 'worker-0'].includes(entry.characterId))
        .map((entry) => entry.currentStamina),
    ).toEqual([expectedStamina, expectedStamina]);

    const arrivedRoot: MaterializedCompanyState = {
      lifecycle: arrived.root.lifecycle,
      finance: arrived.root.finance,
      physical: arrived.root.physical,
    };
    const returnInput = {
      root: arrivedRoot,
      region: SEROE_PORECHYE,
      partyId: 'party',
      intent: {
        kind: 'FREE_INTENT' as const,
        edgeIds: ['kamenny-brod-severny-dvor'],
        purpose: 'RETURN' as const,
      },
      atTick: campaignTick(dueTick.toString()),
      expectedRouteEpoch: departure.route.routeEpoch,
      currentRouteEpoch: departure.route.routeEpoch,
      segmentId: 'safe-return-0001',
    };
    const beforeReturn = structuredClone(arrivedRoot);
    const returnDeparture = preparePartyTravelDeparture(returnInput);
    expect(returnDeparture.route.segment).toMatchObject({
      segmentId: 'safe-return-0001',
      fromSiteId: 'kamenny-brod',
      toSiteId: 'severny-dvor',
      startedAt: dueTick.toString(),
    });
    expect(BigInt(returnDeparture.route.segment.arrivalNotBefore) - BigInt(dueTick)).toBe(duration);
    expect(returnDeparture.route.route[0]).toEqual(departure.route.route[0]);
    expect(returnDeparture.route.routeEpoch).toBe(
      (BigInt(departure.route.routeEpoch) + 1n).toString(),
    );
    expect(returnDeparture.route.memberMoves.map((move) => move.characterId)).toEqual(
      departure.route.memberMoves.map((move) => move.characterId),
    );
    expect(returnDeparture.root.physical.items).toEqual(arrivedRoot.physical.items);
    expect(returnDeparture.root.physical.food).toEqual(arrivedRoot.physical.food);
    expect(returnDeparture.root.physical.foodCarry).toEqual(arrivedRoot.physical.foodCarry);
    expect(returnDeparture.root.physical.vitals).toEqual(arrivedRoot.physical.vitals);
    expect(arrivedRoot).toEqual(beforeReturn);
    expect(
      preparePartyTravelDeparture({
        ...returnInput,
        root: JSON.parse(JSON.stringify(returnInput.root)) as MaterializedCompanyState,
      }),
    ).toEqual(returnDeparture);
    expect(() =>
      preparePartyTravelDeparture({
        ...returnInput,
        intent: { ...returnInput.intent, edgeIds: ['kamenny-brod-tikhaya-gat'] },
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_ALPHA_TRIP' }));
    expect(arrivedRoot).toEqual(beforeReturn);

    const returnDueTick = BigInt(returnDeparture.route.segment.arrivalNotBefore);
    const returnTransitState: CompanyEconomyState = {
      ...advanced,
      lifecycle: returnDeparture.root.lifecycle,
      physical: returnDeparture.root.physical,
    };
    const returnAdvanced = settleTo(
      returnTransitState,
      returnDueTick.toString(),
      'safe-travel-return-advance',
      returnDeparture.transitSegment,
    );
    expect(returnAdvanced.physical!.items.reduce((sum, item) => sum + item.quantity, 0)).toBe(
      initialPhysical.items.reduce((sum, item) => sum + item.quantity, 0) - 2,
    );
    expect(
      returnAdvanced
        .physical!.vitals.filter((entry) => ['leader', 'worker-0'].includes(entry.characterId))
        .map((entry) => entry.currentStamina),
    ).toEqual([
      expectedStamina - profile.staminaPerMember,
      expectedStamina - profile.staminaPerMember,
    ]);
    expect(
      returnAdvanced.physical!.food.map((entry) => [
        entry.membershipId,
        entry.fromTick,
        entry.toTick,
      ]),
    ).toEqual([
      [longMembershipId, '0', dueTick.toString()],
      ['service-worker-0', '0', dueTick.toString()],
      [longMembershipId, dueTick.toString(), returnDueTick.toString()],
      ['service-worker-0', dueTick.toString(), returnDueTick.toString()],
    ]);

    const returnArrivalCandidate = {
      worldId: initial.lifecycle.worldId,
      partyId: returnDeparture.route.partyId,
      segmentId: returnDeparture.route.segment.segmentId,
      regionVersion: returnDeparture.route.regionVersion,
      routeEpoch: returnDeparture.route.routeEpoch,
      cause: 'ROUTE_ARRIVAL' as const,
      location: at('severny-dvor', 'severny-dvor-yard'),
      notBefore: campaignTick(returnDueTick.toString()),
    };
    const returnArrivalRoot: MaterializedCompanyState = {
      lifecycle: returnAdvanced.lifecycle,
      finance: returnAdvanced.finance,
      physical: returnAdvanced.physical!,
    };
    const beforeInvalidReturnArrivals = structuredClone(returnArrivalRoot);
    const arrivalAt = (candidate: typeof returnArrivalCandidate, currentRouteEpoch: string) =>
      preparePartyTravelArrival({
        root: returnArrivalRoot,
        region: SEROE_PORECHYE,
        candidate,
        acceptedRoute: returnDeparture.route,
        currentRouteEpoch,
        trustedNow: campaignTick(returnDueTick.toString()),
      });
    expect(() =>
      arrivalAt(
        {
          ...returnArrivalCandidate,
          location: at('kamenny-brod', 'kamenny-brod-market'),
        },
        returnDeparture.route.routeEpoch,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARRIVAL' }));
    expect(() =>
      arrivalAt(returnArrivalCandidate, (BigInt(returnDeparture.route.routeEpoch) + 1n).toString()),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARRIVAL' }));
    expect(() =>
      arrivalAt(
        { ...returnArrivalCandidate, segmentId: 'wrong-segment' },
        returnDeparture.route.routeEpoch,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARRIVAL' }));
    expect(returnArrivalRoot).toEqual(beforeInvalidReturnArrivals);

    const returnArrived = preparePartyTravelArrival({
      root: returnArrivalRoot,
      region: SEROE_PORECHYE,
      candidate: returnArrivalCandidate,
      acceptedRoute: returnDeparture.route,
      currentRouteEpoch: returnDeparture.route.routeEpoch,
      trustedNow: campaignTick((returnDueTick + 60n).toString()),
    });
    expect(returnArrived.arrival.atTick).toBe(returnDueTick.toString());
    expect(returnArrived.root.lifecycle.parties[0]!.location).toEqual(
      at('severny-dvor', 'severny-dvor-yard'),
    );
    expect(returnArrived.root.physical.containers[0]!.location).toEqual(
      at('severny-dvor', 'severny-dvor-yard'),
    );
    expect(
      preparePartyTravelArrival({
        root: JSON.parse(JSON.stringify(returnArrivalRoot)) as MaterializedCompanyState,
        region: SEROE_PORECHYE,
        candidate: returnArrivalCandidate,
        acceptedRoute: JSON.parse(JSON.stringify(returnDeparture.route)),
        currentRouteEpoch: returnDeparture.route.routeEpoch,
        trustedNow: campaignTick((returnDueTick + 60n).toString()),
      }),
    ).toEqual(returnArrived);
  });

  it('keeps safe CAMP routes generic but rejects them in alpha travel without mutation', () => {
    const state = fieldRoot();
    if (!state.physical) throw new Error('Expected physical fixture state');
    const root: MaterializedCompanyState = {
      lifecycle: state.lifecycle,
      finance: state.finance,
      physical: state.physical,
    };
    const campIntent = {
      kind: 'FREE_INTENT' as const,
      edgeIds: ['kamenny-brod-severny-dvor'],
      purpose: 'CAMP' as const,
    };
    const campRoute = preparePartyRoute({
      region: SEROE_PORECHYE,
      state: root.lifecycle,
      partyId: 'party',
      intent: campIntent,
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: 'safe-camp-0001',
    });
    expect(campRoute.purpose).toBe('CAMP');

    const beforeDeparture = structuredClone(root);
    expect(() =>
      preparePartyTravelDeparture({
        root,
        region: SEROE_PORECHYE,
        partyId: 'party',
        intent: campIntent,
        atTick: campaignTick('0'),
        expectedRouteEpoch: '0',
        currentRouteEpoch: '0',
        segmentId: 'safe-camp-0001',
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_ALPHA_TRIP' }));
    expect(root).toEqual(beforeDeparture);

    const candidate = {
      worldId: root.lifecycle.worldId,
      partyId: campRoute.partyId,
      segmentId: campRoute.segment.segmentId,
      regionVersion: campRoute.regionVersion,
      routeEpoch: campRoute.routeEpoch,
      cause: 'ROUTE_ARRIVAL' as const,
      location: at('kamenny-brod', 'kamenny-brod-market'),
      notBefore: campaignTick(campRoute.segment.arrivalNotBefore),
    };
    const beforeArrival = structuredClone(root);
    expect(() =>
      preparePartyTravelArrival({
        root,
        region: SEROE_PORECHYE,
        candidate,
        acceptedRoute: campRoute,
        currentRouteEpoch: campRoute.routeEpoch,
        trustedNow: campaignTick(campRoute.segment.arrivalNotBefore),
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_ALPHA_TRIP' }));
    expect(root).toEqual(beforeArrival);
  });

  it('keeps movement identities bounded without widening an owner observation', () => {
    const initial = economy([1n], 100n, 0).lifecycle;
    const partyId = entityId<'FieldParty'>('p'.repeat(128));
    const origin = at('severny-dvor', 'severny-dvor-yard');
    const state: LifecycleState = {
      ...initial,
      worldId: 'w'.repeat(128) as LifecycleState['worldId'],
      parties: initial.parties.map((party) => ({ ...party, partyId, location: origin })),
      characters: initial.characters.map((character) =>
        character.presence.fieldPartyId === 'party'
          ? {
              ...character,
              presence: { ...character.presence, fieldPartyId: partyId, location: origin },
            }
          : character,
      ),
    };
    const route = preparePartyRoute({
      region: SEROE_PORECHYE,
      state,
      partyId,
      intent: {
        kind: 'FREE_INTENT',
        edgeIds: ['kamenny-brod-severny-dvor'],
        purpose: 'NEW',
      },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: 'server-minted-segment',
    });
    const transit = {
      kind: 'TRANSIT' as const,
      segmentId: route.segment.segmentId,
      from: route.segment.fromSiteId,
      to: route.segment.toSiteId,
      startedAt: route.segment.startedAt,
      arrivalNotBefore: route.segment.arrivalNotBefore,
    };
    const moved: LifecycleState = {
      ...state,
      parties: state.parties.map((party) =>
        party.partyId === partyId ? { ...party, location: transit } : party,
      ),
      characters: state.characters.map((character) =>
        character.presence.fieldPartyId === partyId
          ? { ...character, presence: { ...character.presence, location: transit } }
          : character,
      ),
    };
    const memberIds = route.memberMoves.map((move) => move.characterId);
    const observed = observePartyMovement(moved, {
      partyId,
      characterIds: memberIds,
      sourceEventId: 's'.repeat(256),
      atTick: campaignTick('0'),
    });
    expect(route.segment.segmentId).toBe('server-minted-segment');
    expect(observed.events.every((entry) => entry.id.length <= 256)).toBe(true);
    expect(observed.events.every((entry) => entry.sourceEventId === 's'.repeat(256))).toBe(true);
    expect(observed.state.knowledge.revision).toBe(
      (BigInt(state.knowledge.revision) + 1n).toString(),
    );
    expect(
      observed.state.knowledge.characters
        .filter((entry) => memberIds.includes(entry.identity.characterId))
        .every(
          (entry) =>
            entry.presence.fieldPartyId === partyId && entry.presence.location.kind === 'TRANSIT',
        ),
    ).toBe(true);
  });
});

describe('physical food stock forecasting', () => {
  it('folds same-member requirements across a day boundary with settlement-identical carry', () => {
    const initial = economy([1n], 100n, 900);
    if (!initial.physical) throw new Error('Expected physical fixture state');
    const requirements = accrueFinance(
      initial.finance,
      initial.lifecycle,
      campaignTick('1140'),
    ).requirements.filter((requirement) => requirement.kind === 'FOOD_CONSUMPTION');
    expect(requirements.filter((entry) => entry.membershipId === 'service-leader')).toHaveLength(2);

    const forecast = assessPhysicalFoodStock(
      initial.physical,
      requirements,
      ['fixture-supply'],
      initial.lifecycle.companyId,
    );
    expect(forecast.knownShortage).toBe(false);
    expect(() =>
      assessPhysicalFoodStock(
        initial.physical!,
        [requirements[0]!, requirements[0]!],
        ['fixture-supply'],
        initial.lifecycle.companyId,
      ),
    ).toThrow();

    const settled = advance(initial, 1140);
    const settledUnits = settled.next.physical!.food.reduce(
      (sum, entry) => sum + BigInt(entry.unitsConsumed),
      0n,
    );
    expect(settledUnits.toString()).toBe(forecast.requiredUnits);
    expect(
      settled.next
        .physical!.foodCarry.filter((entry) =>
          requirements.some((requirement) => requirement.membershipId === entry.membershipId),
        )
        .every((entry) => entry.tickUnits === '240'),
    ).toBe(true);
    expect(initial.physical.food).toHaveLength(0);
  });
});

describe('accepted route execution cursor', () => {
  function fieldRoot(): CompanyEconomyState {
    const initial = economy([1n], 100n, 0);
    if (!initial.physical) throw new Error('Expected physical fixture state');
    const origin = at('severny-dvor', 'severny-dvor-yard');
    return {
      ...initial,
      lifecycle: {
        ...initial.lifecycle,
        parties: initial.lifecycle.parties.map((party) => ({ ...party, location: origin })),
        characters: initial.lifecycle.characters.map((character) =>
          character.presence.fieldPartyId === 'party'
            ? { ...character, presence: { ...character.presence, location: origin } }
            : character,
        ),
      },
      physical: {
        ...initial.physical,
        vitals: initial.lifecycle.characters
          .filter((character) => character.presence.fieldPartyId === 'party')
          .map((character) => ({
            characterId: character.identity.characterId,
            sourceId: `route-execution-vitals-${character.identity.characterId}`,
            maximumHealth: 100,
            currentHealth: 100,
            healthCarry: '0',
            maximumStamina: 100,
            currentStamina: 100,
            staminaCarry: '0',
          })),
        knowledge: {
          ...initial.physical.knowledge,
          vitalSnapshots: initial.lifecycle.characters
            .filter((character) => character.presence.fieldPartyId === 'party')
            .map((character) => ({
              characterId: character.identity.characterId,
              sourceId: `route-execution-vitals-${character.identity.characterId}`,
              maximumHealth: 100,
              currentHealth: 100,
              healthCarry: '0',
              maximumStamina: 100,
              currentStamina: 100,
              staminaCarry: '0',
            })),
        },
        containers: initial.physical.containers.map((container) => ({
          ...container,
          location: origin,
          carrier: { kind: 'PARTY' as const, id: 'party' },
        })),
      },
    };
  }

  function guard(execution: Parameters<typeof continuePartyRouteExecution>[0]['execution']) {
    return {
      routeExecutionId: execution.routeExecutionId,
      regionVersion: execution.regionVersion,
      routeEpoch: execution.routeEpoch,
      nextEdgeIndex: execution.nextEdgeIndex,
      currentSiteId: execution.currentSiteId,
      edgeIds: execution.edgeIds,
    };
  }

  it('gates dangerous supply on NEW and completes an authorized return in reverse edge direction', () => {
    const edgeIds = ['tikhaya-gat-staraya-melnitsa'];
    const outboundState = lifecycleAt('tikhaya-gat', 'tikhaya-gat-bank');
    const outboundAuthorization = {
      instanceId: 'ci.m1.raider-standard.01' as const,
      profileId: FIRST_HUNT_PROFILE_ID,
      termsDigest: 'a'.repeat(64),
      purpose: 'NEW' as const,
      worldId: outboundState.worldId,
      companyId: outboundState.companyId,
      partyId: 'party',
      canonicalRevision: outboundState.revision,
      atTick: campaignTick('0'),
      edgeIds,
    };
    const outbound = {
      state: outboundState,
      region: SEROE_PORECHYE,
      partyId: 'party',
      routeExecutionId: 'route-execution-first-hunt-new-01',
      intent: { kind: 'ROUTE' as const, purpose: 'NEW' as const, edgeIds },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: 'route-first-hunt-new-01',
      dangerousAuthorization: outboundAuthorization,
    };
    expect(() => preparePartyRouteExecution(outbound)).toThrowError(
      expect.objectContaining({ code: 'MISSING_DANGEROUS_SUPPLY_ASSESSMENT' }),
    );
    expect(() =>
      preparePartyRouteExecution({
        ...outbound,
        supplyAssessment: {
          ...routeSupplyAssessment(outboundState, '0', edgeIds),
          knownShortage: true,
        },
      }),
    ).toThrowError(expect.objectContaining({ code: 'KNOWN_DANGEROUS_SUPPLY_SHORTAGE' }));
    expect(() =>
      preparePartyRouteExecution({
        ...outbound,
        supplyAssessment: routeSupplyAssessment(outboundState, '0', edgeIds),
      }),
    ).not.toThrow();

    const returnState = lifecycleAt('staraya-melnitsa', 'staraya-melnitsa-yard');
    const returned = preparePartyRouteExecution({
      state: returnState,
      region: SEROE_PORECHYE,
      partyId: 'party',
      routeExecutionId: 'route-execution-first-hunt-return-01',
      intent: { kind: 'ROUTE', purpose: 'RETURN', edgeIds },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: 'route-first-hunt-return-01',
      dangerousAuthorization: {
        ...outboundAuthorization,
        purpose: 'RETURN',
        worldId: returnState.worldId,
        companyId: returnState.companyId,
        canonicalRevision: returnState.revision,
      },
    });
    expect(returned.execution.segment).toMatchObject({
      fromSiteId: 'staraya-melnitsa',
      toSiteId: 'tikhaya-gat',
    });

    const segment = returned.execution.segment!;
    const transitLocation = {
      kind: 'TRANSIT' as const,
      segmentId: segment.segmentId,
      from: segment.fromSiteId,
      to: segment.toSiteId,
      startedAt: segment.startedAt,
      arrivalNotBefore: segment.dueTick,
    };
    const transitState = {
      ...returnState,
      campaignTick: campaignTick(segment.dueTick),
      parties: returnState.parties.map((party) => ({ ...party, location: transitLocation })),
      characters: returnState.characters.map((character) =>
        character.presence.fieldPartyId === 'party'
          ? { ...character, presence: { ...character.presence, location: transitLocation } }
          : character,
      ),
    };
    const arrival = prepareRouteExecutionArrival({
      region: SEROE_PORECHYE,
      state: transitState,
      execution: returned.execution,
      expected: returned.execution,
      candidate: {
        worldId: returnState.worldId,
        partyId: 'party',
        segmentId: segment.segmentId,
        regionVersion: SEROE_PORECHYE.version,
        routeEpoch: returned.execution.routeEpoch,
        cause: 'ROUTE_ARRIVAL',
        location: at('tikhaya-gat', 'tikhaya-gat-bank'),
        notBefore: campaignTick(segment.dueTick),
      },
      currentRouteEpoch: returned.execution.routeEpoch,
      trustedNow: campaignTick(segment.dueTick),
    });
    expect(arrival.execution).toMatchObject({
      purpose: 'RETURN',
      phase: 'COMPLETE',
      currentSiteId: 'tikhaya-gat',
    });
  });

  it('commits intermediate boundaries and completes only after the accepted final edge', () => {
    const initial = fieldRoot();
    if (!initial.physical) throw new Error('Expected physical fixture state');
    const root: MaterializedCompanyState = {
      lifecycle: initial.lifecycle,
      finance: initial.finance,
      physical: initial.physical,
    };
    const first = preparePartyRouteExecutionDeparture({
      root,
      region: SEROE_PORECHYE,
      partyId: 'party',
      routeExecutionId: 'route-execution-safe-0001',
      intent: {
        kind: 'ROUTE',
        edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
        purpose: 'NEW',
      },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: 'route-segment-0001',
    });
    expect(first.execution).toMatchObject({
      schemaVersion: 2,
      routeExecutionId: 'route-execution-safe-0001',
      regionVersion: first.route.regionVersion,
      routeEpoch: '1',
      edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
      phase: 'IN_TRANSIT',
      nextEdgeIndex: 0,
      currentSiteId: 'severny-dvor',
    });
    expect(first.execution.segment).toMatchObject({
      segmentId: 'route-segment-0001',
      fromSiteId: 'severny-dvor',
      toSiteId: 'kamenny-brod',
      dueTick: '10',
    });

    const advance = (
      state: MaterializedCompanyState,
      segment: (typeof first)['transitSegment'],
      id: string,
    ) => {
      const current: CompanyEconomyState = {
        ...initial,
        lifecycle: state.lifecycle,
        finance: state.finance,
        physical: state.physical,
      };
      const toTick = segment.dueTick;
      const nextCommand = command(
        current,
        'AdvanceCampaign',
        { toTick, authoritativeInputs: [] },
        id,
        'SYSTEM',
        campaignTick(toTick),
      );
      const result = prepareCompanyEconomy(current, nextCommand, {
        ...context(current, nextCommand, [], [], []),
        physicalFacts: [],
        trustedTransitSegments: [segment],
      });
      if (result.kind !== 'PREPARED' || !result.next.physical)
        throw new Error(
          `Expected prepared travel interval: ${result.kind}${result.kind === 'REJECTED' ? ` ${result.error}` : ''}`,
        );
      return {
        lifecycle: result.next.lifecycle,
        finance: result.next.finance,
        physical: result.next.physical,
      };
    };

    const firstDue = advance(first.root, first.transitSegment, 'route-segment-advance-0001');
    const firstArrival = preparePartyRouteExecutionArrival({
      root: firstDue,
      region: SEROE_PORECHYE,
      execution: first.execution,
      expected: first.execution,
      candidate: {
        worldId: first.execution.worldId,
        partyId: first.execution.partyId,
        segmentId: first.execution.segment!.segmentId,
        regionVersion: SEROE_PORECHYE.version,
        routeEpoch: first.execution.routeEpoch,
        cause: 'ROUTE_ARRIVAL',
        location: at('kamenny-brod', 'kamenny-brod-market'),
        notBefore: campaignTick(first.execution.segment!.dueTick),
      },
      currentRouteEpoch: first.execution.routeEpoch,
      trustedNow: campaignTick('10'),
    });
    expect(firstArrival.execution).toMatchObject({
      routeExecutionId: first.execution.routeExecutionId,
      routeEpoch: first.execution.routeEpoch,
      edgeIds: first.execution.edgeIds,
      phase: 'AT_BOUNDARY',
      nextEdgeIndex: 1,
      currentSiteId: 'kamenny-brod',
      segment: null,
    });

    const continueInput = {
      root: firstArrival.root,
      region: SEROE_PORECHYE,
      execution: firstArrival.execution,
      expected: guard(firstArrival.execution),
      currentRouteEpoch: first.execution.routeEpoch,
      atTick: campaignTick('10'),
      segmentId: 'route-segment-0002',
    };
    const second = continuePartyRouteExecution(continueInput);
    expect(second.execution).toMatchObject({
      routeExecutionId: first.execution.routeExecutionId,
      routeEpoch: first.execution.routeEpoch,
      edgeIds: first.execution.edgeIds,
      phase: 'IN_TRANSIT',
      nextEdgeIndex: 1,
      currentSiteId: 'kamenny-brod',
      segment: {
        segmentId: 'route-segment-0002',
        fromSiteId: 'kamenny-brod',
        toSiteId: 'bereznyak',
        startedAt: '10',
        dueTick: '110',
      },
    });
    expect(second.transitSegment.routeEpoch).toBe(first.execution.routeEpoch);
    expect(continuePartyRouteExecution(continueInput)).toEqual(second);
    expect(
      continuePartyRouteExecution({
        ...continueInput,
        execution: JSON.parse(
          JSON.stringify(continueInput.execution),
        ) as typeof continueInput.execution,
      }),
    ).toEqual(second);

    const secondDue = advance(second.root, second.transitSegment, 'route-segment-advance-0002');
    const final = preparePartyRouteExecutionArrival({
      root: secondDue,
      region: SEROE_PORECHYE,
      execution: second.execution,
      expected: second.execution,
      candidate: {
        worldId: second.execution.worldId,
        partyId: second.execution.partyId,
        segmentId: second.execution.segment!.segmentId,
        regionVersion: SEROE_PORECHYE.version,
        routeEpoch: second.execution.routeEpoch,
        cause: 'ROUTE_ARRIVAL',
        location: at('bereznyak', 'bereznyak-green'),
        notBefore: campaignTick(second.execution.segment!.dueTick),
      },
      currentRouteEpoch: second.execution.routeEpoch,
      trustedNow: campaignTick('110'),
    });
    expect(final.execution).toMatchObject({
      phase: 'COMPLETE',
      nextEdgeIndex: 2,
      currentSiteId: 'bereznyak',
      segment: null,
    });
    expect(final.root.lifecycle.parties[0]!.location).toEqual(at('bereznyak', 'bereznyak-green'));
    expect(() =>
      continuePartyRouteExecution({
        ...continueInput,
        root: final.root,
        execution: final.execution,
        expected: guard(final.execution),
        atTick: campaignTick('110'),
      }),
    ).toThrowError(expect.objectContaining({ code: 'STALE_ROUTE_EXECUTION' }));
  });

  it('rejects stale, changed, misplaced and unsupported continuation inputs atomically', () => {
    const initial = fieldRoot();
    if (!initial.physical) throw new Error('Expected physical fixture state');
    const departure = preparePartyRouteExecutionDeparture({
      root: { lifecycle: initial.lifecycle, finance: initial.finance, physical: initial.physical },
      region: SEROE_PORECHYE,
      partyId: 'party',
      routeExecutionId: 'route-execution-safe-0002',
      intent: {
        kind: 'ROUTE',
        edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
        purpose: 'NEW',
      },
      atTick: campaignTick('0'),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: 'route-segment-1001',
    });
    const due = BigInt(departure.execution.segment!.dueTick);
    const transit = {
      ...transitState(departure.root.lifecycle, departure.root.lifecycle.parties[0]!.location),
      campaignTick: campaignTick(due.toString()),
    };
    const arrival = prepareRouteExecutionArrival({
      state: transit,
      region: SEROE_PORECHYE,
      execution: departure.execution,
      expected: departure.execution,
      candidate: {
        worldId: departure.execution.worldId,
        partyId: departure.execution.partyId,
        segmentId: departure.execution.segment!.segmentId,
        regionVersion: SEROE_PORECHYE.version,
        routeEpoch: departure.execution.routeEpoch,
        cause: 'ROUTE_ARRIVAL',
        location: at('kamenny-brod', 'kamenny-brod-market'),
        notBefore: campaignTick(due.toString()),
      },
      currentRouteEpoch: departure.execution.routeEpoch,
      trustedNow: campaignTick(due.toString()),
    });
    const rejectArrivalExecution = (
      execution: typeof departure.execution,
      state: LifecycleState = transit,
    ) =>
      prepareRouteExecutionArrival({
        state,
        region: SEROE_PORECHYE,
        execution,
        expected: departure.execution,
        candidate: {
          worldId: departure.execution.worldId,
          partyId: departure.execution.partyId,
          segmentId: departure.execution.segment!.segmentId,
          regionVersion: SEROE_PORECHYE.version,
          routeEpoch: departure.execution.routeEpoch,
          cause: 'ROUTE_ARRIVAL',
          location: at('kamenny-brod', 'kamenny-brod-market'),
          notBefore: campaignTick(due.toString()),
        },
        currentRouteEpoch: departure.execution.routeEpoch,
        trustedNow: campaignTick(due.toString()),
      });
    expect(() =>
      rejectArrivalExecution({
        ...departure.execution,
        edgeIds: ['kamenny-brod-severny-dvor'],
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTE_EXECUTION' }));
    expect(() =>
      rejectArrivalExecution({
        ...departure.execution,
        segment: { ...departure.execution.segment!, dueTick: campaignTick('11') },
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTE_EXECUTION' }));
    const activeSegment = departure.execution.segment!;
    const mismatchedStart = transitState(transit, {
      kind: 'TRANSIT',
      segmentId: activeSegment.segmentId,
      from: activeSegment.fromSiteId,
      to: activeSegment.toSiteId,
      startedAt: campaignTick((BigInt(activeSegment.startedAt) + 1n).toString()),
      arrivalNotBefore: campaignTick(activeSegment.dueTick),
    });
    const beforeMismatchedStart = structuredClone(mismatchedStart);
    expect(() => rejectArrivalExecution(departure.execution, mismatchedStart)).toThrowError(
      expect.objectContaining({ code: 'INVALID_ARRIVAL' }),
    );
    expect(mismatchedStart).toEqual(beforeMismatchedStart);
    const boundaryState: LifecycleState = {
      ...transit,
      parties: transit.parties.map((party) =>
        party.partyId === 'party' ? { ...party, location: arrival.arrival.location } : party,
      ),
      characters: transit.characters.map((character) => {
        const move = arrival.arrival.memberMoves.find(
          (entry) => entry.characterId === character.identity.characterId,
        );
        return move
          ? { ...character, presence: { ...character.presence, location: move.to } }
          : character;
      }),
    };
    const input = {
      state: boundaryState,
      region: SEROE_PORECHYE,
      execution: arrival.execution,
      expected: guard(arrival.execution),
      currentRouteEpoch: arrival.execution.routeEpoch,
      atTick: campaignTick(due.toString()),
      segmentId: 'route-segment-1002',
    };
    const before = structuredClone(input.state);
    const reject = (overrides: Partial<typeof input>) =>
      preparePartyRouteContinuation({ ...input, ...overrides });

    expect(() => reject({ expected: { ...input.expected, nextEdgeIndex: 0 } })).toThrowError(
      expect.objectContaining({ code: 'STALE_ROUTE_EXECUTION' }),
    );
    expect(() => reject({ currentRouteEpoch: '99' })).toThrowError(
      expect.objectContaining({ code: 'STALE_ROUTE_EXECUTION' }),
    );
    expect(() =>
      reject({ execution: { ...input.execution, edgeIds: ['kamenny-brod-severny-dvor'] } }),
    ).toThrowError(expect.objectContaining({ code: 'STALE_ROUTE_EXECUTION' }));
    expect(() =>
      reject({
        state: {
          ...input.state,
          parties: input.state.parties.map((party) => ({
            ...party,
            location: at('tikhaya-gat', 'tikhaya-gat-bank'),
          })),
          characters: input.state.characters.map((character) =>
            character.presence.fieldPartyId === 'party'
              ? {
                  ...character,
                  presence: {
                    ...character.presence,
                    location: at('tikhaya-gat', 'tikhaya-gat-bank'),
                  },
                }
              : character,
          ),
        },
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTE_EXECUTION' }));
    const atWrongBoundary: LifecycleState = {
      ...input.state,
      parties: input.state.parties.map((party) =>
        party.partyId === 'party'
          ? { ...party, location: at('bereznyak', 'bereznyak-green') }
          : party,
      ),
      characters: input.state.characters.map((character) =>
        character.presence.fieldPartyId === 'party'
          ? {
              ...character,
              presence: {
                ...character.presence,
                location: at('bereznyak', 'bereznyak-green'),
              },
            }
          : character,
      ),
    };
    const beforeWrongBoundary = structuredClone(atWrongBoundary);
    expect(() => reject({ state: atWrongBoundary })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ROUTE_EXECUTION' }),
    );
    expect(atWrongBoundary).toEqual(beforeWrongBoundary);
    expect(() =>
      reject({ expected: { ...input.expected, regionVersion: 'unknown-edition' } }),
    ).toThrowError(expect.objectContaining({ code: 'STALE_ROUTE_EXECUTION' }));
    expect(() =>
      preparePartyRouteContinuation({
        ...input,
        execution: { ...input.execution, phase: 'COMPLETE' },
      }),
    ).toThrowError(expect.objectContaining({ code: 'STALE_ROUTE_EXECUTION' }));
    expect(input.state).toEqual(before);

    expect(() =>
      preparePartyRouteExecutionDeparture({
        root: {
          lifecycle: initial.lifecycle,
          finance: initial.finance,
          physical: initial.physical!,
        },
        region: SEROE_PORECHYE,
        partyId: 'party',
        routeExecutionId: 'route-execution-return-0001',
        intent: {
          kind: 'ROUTE',
          edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
          purpose: 'RETURN',
        },
        atTick: campaignTick('0'),
        expectedRouteEpoch: '0',
        currentRouteEpoch: '0',
        segmentId: 'route-return-0001',
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_ROUTE_CONTINUATION' }));

    expect(() =>
      preparePartyRouteExecution({
        state: initial.lifecycle,
        region: SEROE_PORECHYE,
        partyId: 'party',
        routeExecutionId: 'route-execution-camp-0001',
        intent: {
          kind: 'ROUTE',
          edgeIds: ['kamenny-brod-severny-dvor'],
          purpose: 'CAMP',
        },
        atTick: campaignTick('0'),
        expectedRouteEpoch: '0',
        currentRouteEpoch: '0',
        segmentId: 'route-camp-0001',
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_ROUTE_CONTINUATION' }));
    const dangerousState = lifecycleAt('tikhaya-gat', 'tikhaya-gat-bank');
    expect(() =>
      preparePartyRouteExecution({
        state: dangerousState,
        region: SEROE_PORECHYE,
        partyId: 'party',
        routeExecutionId: 'route-execution-danger-0001',
        intent: {
          kind: 'ROUTE',
          edgeIds: ['tikhaya-gat-staraya-melnitsa'],
          purpose: 'NEW',
        },
        atTick: campaignTick('0'),
        expectedRouteEpoch: '0',
        currentRouteEpoch: '0',
        segmentId: 'route-danger-0001',
        supplyAssessment: routeSupplyAssessment(dangerousState, '0', [
          'tikhaya-gat-staraya-melnitsa',
        ]),
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_ROUTE_CONTINUATION' }));
  });
});

import { followCarrierLocations } from '../company/physical.js';
import { validatePhysicalState } from '../company/physical-state.js';
import type { MaterializedCompanyState } from '../company/physical-root-types.js';
import { TRAVEL_RULES } from '../company/physical-types.js';
import type { TrustedTransitSegment } from '../company/physical-types.js';
import { observePartyMovement } from '../company/lifecycle.js';
import type { LifecycleEvent } from '../company/lifecycle-types.js';
import { campaignTick, canonicalRevision, entityId, isExactInteger } from '../company/values.js';
import type { CampaignTick } from '../company/values.js';
import type { WorldRegion } from './region.js';
import {
  preparePartyArrival,
  preparePartyRoute,
  preparePartyRouteContinuation,
  preparePartyRouteExecution as prepareRouteExecution,
  prepareRouteExecutionArrival,
  RoutePreparationError,
} from './route.js';
import type {
  PartyRouteExecution,
  PartyRouteExecutionArrivalGuard,
  PartyRouteExecutionContinuationGuard,
  PreparedPartyArrival,
  PreparedPartyRoute,
  RouteIntent,
  TrustedFirstHuntRouteAuthorization,
  TrustedRouteSupplyAssessment,
} from './route.js';

export const SAFE_TRAVEL_ALPHA_V1 = Object.freeze({
  profileId: TRAVEL_RULES.profileId,
  edgeId: 'kamenny-brod-severny-dvor',
  fromSiteId: 'severny-dvor',
  toSiteId: 'kamenny-brod',
} as const);

export class TravelPreparationError extends Error {
  constructor(readonly code: 'TRAVEL_ROOT_NOT_SETTLED' | 'UNSUPPORTED_ALPHA_TRIP') {
    super(code);
  }
}

function requireAlignedRoot(root: MaterializedCompanyState, atTick: CampaignTick): void {
  if (
    !isExactInteger(atTick) ||
    root.lifecycle.campaignTick !== atTick ||
    root.finance.processedTick !== atTick ||
    root.physical.processedTick !== atTick
  )
    throw new TravelPreparationError('TRAVEL_ROOT_NOT_SETTLED');
}

function isAlphaRoute(route: PreparedPartyRoute): boolean {
  const segment = route.segment;
  const followsAlphaEdge =
    (segment.fromSiteId === SAFE_TRAVEL_ALPHA_V1.fromSiteId &&
      segment.toSiteId === SAFE_TRAVEL_ALPHA_V1.toSiteId) ||
    (segment.fromSiteId === SAFE_TRAVEL_ALPHA_V1.toSiteId &&
      segment.toSiteId === SAFE_TRAVEL_ALPHA_V1.fromSiteId);
  return (
    (route.purpose === 'NEW' || route.purpose === 'RETURN') &&
    route.route.length === 1 &&
    route.travelProfileId === SAFE_TRAVEL_ALPHA_V1.profileId &&
    route.route[0]?.edgeId === SAFE_TRAVEL_ALPHA_V1.edgeId &&
    followsAlphaEdge &&
    BigInt(segment.arrivalNotBefore) - BigInt(segment.startedAt) ===
      BigInt(route.route[0]!.provisionalTravelTicks)
  );
}

function applyPartyMoves(
  root: MaterializedCompanyState,
  partyId: string,
  moves: readonly {
    readonly characterId: string;
    readonly to: MaterializedCompanyState['lifecycle']['characters'][number]['presence']['location'];
  }[],
  partyLocation: MaterializedCompanyState['lifecycle']['parties'][number]['location'],
  sourceEventId: string,
  atTick: CampaignTick,
): {
  readonly root: MaterializedCompanyState;
  readonly observationEvents: readonly LifecycleEvent[];
} {
  const moved = {
    ...root.lifecycle,
    parties: root.lifecycle.parties.map((party) =>
      party.partyId === partyId ? { ...party, location: partyLocation } : party,
    ),
    characters: root.lifecycle.characters.map((character) => {
      const move = moves.find((entry) => entry.characterId === character.identity.characterId);
      return move
        ? { ...character, presence: { ...character.presence, location: move.to } }
        : character;
    }),
  };
  const observed = observePartyMovement(moved, {
    partyId,
    characterIds: moves.map((move) => move.characterId),
    sourceEventId,
    atTick,
  });
  const lifecycle = {
    ...observed.state,
    revision: canonicalRevision((BigInt(root.lifecycle.revision) + 1n).toString()),
  };
  const physical = followCarrierLocations(root.lifecycle, lifecycle, root.physical);
  const next = { ...root, lifecycle, physical };
  validatePhysicalState(next);
  return { root: next, observationEvents: observed.events };
}

export function trustedTransitSegment(
  root: MaterializedCompanyState,
  route: PreparedPartyRoute,
): TrustedTransitSegment {
  return Object.freeze({
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    partyId: route.partyId,
    segmentId: route.segment.segmentId,
    routeEpoch: route.routeEpoch,
    profileId: route.travelProfileId,
    startedAt: route.segment.startedAt,
    dueTick: route.segment.arrivalNotBefore,
  });
}

export function preparePartyTravelDeparture(input: {
  readonly root: MaterializedCompanyState;
  readonly region: WorldRegion;
  readonly partyId: string;
  readonly intent: RouteIntent;
  readonly atTick: CampaignTick;
  readonly expectedRouteEpoch: string;
  readonly currentRouteEpoch: string;
  readonly segmentId: string;
  readonly supplyAssessment?: Parameters<typeof preparePartyRoute>[0]['supplyAssessment'];
  readonly safeTravelAuthorization?: Parameters<
    typeof preparePartyRoute
  >[0]['safeTravelAuthorization'];
}): {
  readonly root: MaterializedCompanyState;
  readonly route: PreparedPartyRoute;
  readonly transitSegment: TrustedTransitSegment;
  readonly observationEvents: readonly LifecycleEvent[];
} {
  requireAlignedRoot(input.root, input.atTick);
  if (
    typeof input.segmentId !== 'string' ||
    input.segmentId.length === 0 ||
    input.segmentId.length > 64
  )
    throw new RoutePreparationError('INVALID_ROUTE');
  const route = preparePartyRoute({
    region: input.region,
    state: input.root.lifecycle,
    partyId: input.partyId,
    intent: input.intent,
    atTick: input.atTick,
    expectedRouteEpoch: input.expectedRouteEpoch,
    currentRouteEpoch: input.currentRouteEpoch,
    segmentId: input.segmentId,
    ...(input.supplyAssessment ? { supplyAssessment: input.supplyAssessment } : {}),
    ...(input.safeTravelAuthorization
      ? { safeTravelAuthorization: input.safeTravelAuthorization }
      : {}),
  });
  if (!isAlphaRoute(route)) throw new TravelPreparationError('UNSUPPORTED_ALPHA_TRIP');
  const applied = applyPartyMoves(
    input.root,
    route.partyId,
    route.memberMoves,
    {
      kind: 'TRANSIT',
      segmentId: route.segment.segmentId,
      from: route.segment.fromSiteId,
      to: route.segment.toSiteId,
      startedAt: route.segment.startedAt,
      arrivalNotBefore: route.segment.arrivalNotBefore,
    },
    route.segment.segmentId,
    route.segment.startedAt,
  );
  return {
    root: applied.root,
    route,
    transitSegment: trustedTransitSegment(applied.root, route),
    observationEvents: applied.observationEvents,
  };
}

export function preparePartyTravelArrival(input: {
  readonly root: MaterializedCompanyState;
  readonly region: WorldRegion;
  readonly candidate: Parameters<typeof preparePartyArrival>[0]['candidate'];
  readonly acceptedRoute: PreparedPartyRoute;
  readonly currentRouteEpoch: string;
  /** Trusted server clock: proves arrival is now allowed; settlement remains at stored dueTick. */
  readonly trustedNow: CampaignTick;
}): {
  readonly root: MaterializedCompanyState;
  readonly arrival: PreparedPartyArrival;
  readonly observationEvents: readonly LifecycleEvent[];
} {
  if (!isAlphaRoute(input.acceptedRoute))
    throw new TravelPreparationError('UNSUPPORTED_ALPHA_TRIP');
  if (!isExactInteger(input.trustedNow)) throw new RoutePreparationError('INVALID_ARRIVAL');
  const dueTick = campaignTick(input.acceptedRoute.segment.arrivalNotBefore);
  // Reuse the public early-arrival rejection before checking the already-settled root.
  const earlyCheck = preparePartyArrival({
    region: input.region,
    state: input.root.lifecycle,
    candidate: input.candidate,
    acceptedRoute: input.acceptedRoute,
    currentRouteEpoch: input.currentRouteEpoch,
    atTick: input.trustedNow,
  });
  if (BigInt(input.trustedNow) < BigInt(dueTick) || !isExactInteger(dueTick))
    throw new RoutePreparationError('INVALID_ARRIVAL');
  requireAlignedRoot(input.root, dueTick);
  const arrival =
    input.trustedNow === dueTick
      ? earlyCheck
      : preparePartyArrival({
          region: input.region,
          state: input.root.lifecycle,
          candidate: input.candidate,
          acceptedRoute: input.acceptedRoute,
          currentRouteEpoch: input.currentRouteEpoch,
          atTick: dueTick,
        });
  const applied = applyPartyMoves(
    input.root,
    arrival.partyId,
    arrival.memberMoves,
    arrival.location,
    arrival.segmentId,
    arrival.atTick,
  );
  return { root: applied.root, arrival, observationEvents: applied.observationEvents };
}

/** Prepare the first segment of an accepted multi-edge safe itinerary. */
export function preparePartyRouteExecutionDeparture(input: {
  readonly root: MaterializedCompanyState;
  readonly region: WorldRegion;
  readonly partyId: string;
  readonly routeExecutionId: string;
  readonly intent: RouteIntent;
  readonly atTick: CampaignTick;
  readonly expectedRouteEpoch: string;
  readonly currentRouteEpoch: string;
  readonly segmentId: string;
  readonly supplyAssessment?: TrustedRouteSupplyAssessment;
  readonly safeTravelAuthorization?: Parameters<
    typeof prepareRouteExecution
  >[0]['safeTravelAuthorization'];
  readonly dangerousAuthorization?: TrustedFirstHuntRouteAuthorization;
}): {
  readonly root: MaterializedCompanyState;
  readonly route: PreparedPartyRoute;
  readonly execution: PartyRouteExecution;
  readonly transitSegment: TrustedTransitSegment;
  readonly observationEvents: readonly LifecycleEvent[];
} {
  requireAlignedRoot(input.root, input.atTick);
  if (
    typeof input.segmentId !== 'string' ||
    input.segmentId.length === 0 ||
    input.segmentId.length > 64
  )
    throw new RoutePreparationError('INVALID_ROUTE');
  const prepared = prepareRouteExecution({
    region: input.region,
    state: input.root.lifecycle,
    partyId: input.partyId,
    routeExecutionId: input.routeExecutionId,
    intent: input.intent,
    atTick: input.atTick,
    expectedRouteEpoch: input.expectedRouteEpoch,
    currentRouteEpoch: input.currentRouteEpoch,
    segmentId: input.segmentId,
    ...(input.supplyAssessment ? { supplyAssessment: input.supplyAssessment } : {}),
    ...(input.safeTravelAuthorization
      ? { safeTravelAuthorization: input.safeTravelAuthorization }
      : {}),
    ...(input.dangerousAuthorization
      ? { dangerousAuthorization: input.dangerousAuthorization }
      : {}),
  });
  if (
    prepared.route.purpose === 'RETURN' &&
    !isAlphaRoute(prepared.route) &&
    prepared.execution.dangerousAuthorization === undefined
  )
    throw new TravelPreparationError('UNSUPPORTED_ALPHA_TRIP');
  const applied = applyPartyMoves(
    input.root,
    prepared.route.partyId,
    prepared.route.memberMoves,
    {
      kind: 'TRANSIT',
      segmentId: prepared.route.segment.segmentId,
      from: prepared.route.segment.fromSiteId,
      to: prepared.route.segment.toSiteId,
      startedAt: prepared.route.segment.startedAt,
      arrivalNotBefore: prepared.route.segment.arrivalNotBefore,
    },
    prepared.route.segment.segmentId,
    prepared.route.segment.startedAt,
  );
  return Object.freeze({
    root: applied.root,
    route: prepared.route,
    execution: prepared.execution,
    transitSegment: trustedTransitSegment(applied.root, prepared.route),
    observationEvents: applied.observationEvents,
  });
}

/** Apply one already due edge and persist its boundary or final cursor candidate. */
export function preparePartyRouteExecutionArrival(input: {
  readonly root: MaterializedCompanyState;
  readonly region: WorldRegion;
  readonly execution: PartyRouteExecution;
  readonly expected: PartyRouteExecutionArrivalGuard;
  readonly candidate: Parameters<typeof preparePartyArrival>[0]['candidate'];
  readonly currentRouteEpoch: string;
  readonly trustedNow: CampaignTick;
}): {
  readonly root: MaterializedCompanyState;
  readonly arrival: PreparedPartyArrival;
  readonly execution: PartyRouteExecution;
  readonly observationEvents: readonly LifecycleEvent[];
} {
  if (!isExactInteger(input.trustedNow)) throw new RoutePreparationError('INVALID_ARRIVAL');
  if (input.execution.phase !== 'IN_TRANSIT' || !input.execution.segment)
    throw new RoutePreparationError('INVALID_ROUTE_EXECUTION');
  const dueTick = campaignTick(input.execution.segment.dueTick);
  const prepared = prepareRouteExecutionArrival({
    region: input.region,
    state: input.root.lifecycle,
    execution: input.execution,
    expected: input.expected,
    candidate: input.candidate,
    currentRouteEpoch: input.currentRouteEpoch,
    trustedNow: input.trustedNow,
  });
  if (BigInt(input.trustedNow) < BigInt(dueTick))
    throw new RoutePreparationError('INVALID_ARRIVAL');
  requireAlignedRoot(input.root, dueTick);
  const applied = applyPartyMoves(
    input.root,
    prepared.arrival.partyId,
    prepared.arrival.memberMoves,
    prepared.arrival.location,
    prepared.arrival.segmentId,
    prepared.arrival.atTick,
  );
  return Object.freeze({
    root: applied.root,
    arrival: prepared.arrival,
    execution: prepared.execution,
    observationEvents: applied.observationEvents,
  });
}

/** Continue only the next accepted safe edge after its boundary effects are settled. */
export function continuePartyRouteExecution(input: {
  readonly root: MaterializedCompanyState;
  readonly region: WorldRegion;
  readonly execution: PartyRouteExecution;
  readonly expected: PartyRouteExecutionContinuationGuard;
  readonly currentRouteEpoch: string;
  readonly atTick: CampaignTick;
  readonly segmentId: string;
}): {
  readonly root: MaterializedCompanyState;
  readonly route: PreparedPartyRoute;
  readonly execution: PartyRouteExecution;
  readonly transitSegment: TrustedTransitSegment;
  readonly observationEvents: readonly LifecycleEvent[];
} {
  requireAlignedRoot(input.root, input.atTick);
  if (
    typeof input.segmentId !== 'string' ||
    input.segmentId.length === 0 ||
    input.segmentId.length > 64
  )
    throw new RoutePreparationError('INVALID_ROUTE');
  const prepared = preparePartyRouteContinuation({
    region: input.region,
    state: input.root.lifecycle,
    execution: input.execution,
    expected: input.expected,
    currentRouteEpoch: input.currentRouteEpoch,
    atTick: input.atTick,
    segmentId: input.segmentId,
  });
  const applied = applyPartyMoves(
    input.root,
    prepared.route.partyId,
    prepared.route.memberMoves,
    {
      kind: 'TRANSIT',
      segmentId: prepared.route.segment.segmentId,
      from: prepared.route.segment.fromSiteId,
      to: prepared.route.segment.toSiteId,
      startedAt: prepared.route.segment.startedAt,
      arrivalNotBefore: prepared.route.segment.arrivalNotBefore,
    },
    prepared.route.segment.segmentId,
    prepared.route.segment.startedAt,
  );
  return Object.freeze({
    root: applied.root,
    route: prepared.route,
    execution: prepared.execution,
    transitSegment: trustedTransitSegment(applied.root, prepared.route),
    observationEvents: applied.observationEvents,
  });
}

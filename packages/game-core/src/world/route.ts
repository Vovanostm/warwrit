import type { LifecycleCharacter, LifecycleState } from '../company/lifecycle-types.js';
import { canPerform, sameLocation } from '../company/lifecycle-state.js';
import { canonicalJson } from '../company/input.js';
import type { LocationRef } from '../company/model.js';
import { campaignTick, entityId, isExactInteger } from '../company/values.js';
import type { CampaignTick } from '../company/values.js';
import { acceptedWorldRegion, SEROE_PORECHYE, WORLD_REGION_VERSION } from './region.js';
import type { WorldRegion, WorldRegionEdge } from './region.js';
import { FIRST_HUNT_PROFILE_ID } from './population.js';
import { TRAVEL_RULES } from '../company/physical-types.js';

export type RoutePreparationCode =
  | 'INVALID_REGION'
  | 'INVALID_ROUTE'
  | 'INVALID_ROUTE_EPOCH'
  | 'STALE_ROUTE_EPOCH'
  | 'INCOMPLETE_PARTY'
  | 'PARTY_MEMBER_TRAVEL_UNSUPPORTED'
  | 'MISSING_DANGEROUS_SUPPLY_ASSESSMENT'
  | 'INVALID_DANGEROUS_SUPPLY_ASSESSMENT'
  | 'KNOWN_DANGEROUS_SUPPLY_SHORTAGE'
  | 'MISSING_SCOPED_RETURN_OR_CAMP_AUTHORIZATION'
  | 'INVALID_SCOPED_RETURN_OR_CAMP_AUTHORIZATION'
  | 'INVALID_ARRIVAL'
  | 'STALE_ROUTE_TIME'
  | 'INVALID_ROUTE_EXECUTION'
  | 'STALE_ROUTE_EXECUTION'
  | 'UNSUPPORTED_ROUTE_CONTINUATION';

export class RoutePreparationError extends Error {
  constructor(readonly code: RoutePreparationCode) {
    super(code);
  }
}

export interface RouteIntent {
  readonly kind: 'ROUTE' | 'FREE_INTENT';
  readonly edgeIds: readonly string[];
  readonly purpose: 'NEW' | 'RETURN' | 'CAMP';
}

export interface SimpleWorldRouteCandidate {
  readonly edgeIds: readonly string[];
  readonly toSiteId: string;
}

/** Enumerate finite simple paths from an authored site; callers still run canonical route preparation. */
export function enumerateSimpleWorldRouteCandidates(
  region: WorldRegion,
  fromSiteId: string,
): readonly SimpleWorldRouteCandidate[] {
  if (!region.sites.some((site) => site.siteId === fromSiteId)) return [];
  const candidates: SimpleWorldRouteCandidate[] = [];
  const maximumEdges = Math.max(0, region.sites.length - 1);

  const visit = (siteId: string, visited: ReadonlySet<string>, edgeIds: readonly string[]) => {
    if (edgeIds.length >= maximumEdges) return;
    for (const edge of region.edges) {
      const nextSiteId =
        edge.fromSiteId === siteId
          ? edge.toSiteId
          : edge.toSiteId === siteId
            ? edge.fromSiteId
            : undefined;
      if (!nextSiteId || visited.has(nextSiteId)) continue;
      const nextEdgeIds = [...edgeIds, edge.edgeId];
      candidates.push({ edgeIds: nextEdgeIds, toSiteId: nextSiteId });
      visit(nextSiteId, new Set([...visited, nextSiteId]), nextEdgeIds);
    }
  };

  visit(fromSiteId, new Set([fromSiteId]), []);
  return candidates;
}

export interface TrustedRouteSupplyAssessment {
  readonly worldId: string;
  readonly companyId: string;
  readonly partyId: string;
  readonly canonicalRevision: string;
  readonly atTick: CampaignTick;
  readonly edgeIds: readonly string[];
  readonly knownShortage: boolean;
  readonly assumptions: readonly string[];
}

/**
 * Contracts whose members may take the single authored dangerous road to Старая мельница:
 * FIRST HUNT and the ordinary contracts with a step or encounter there (owner decision
 * 2026-10-02, ordinary contract working profile).
 */
export const DANGEROUS_ROUTE_CONTRACTS: Readonly<Record<string, string>> = Object.freeze({
  'ci.m1.raider-standard.01': FIRST_HUNT_PROFILE_ID,
  'ci.m1.cellar-rescue.01': 'ct.m1.cellar-rescue.v1',
  'ci.m1.mill-worker.01': 'ct.m1.mill-worker.v1',
  'ci.m1.mill-beast.01': 'ct.m1.mill-beast.v1',
});

export function isDangerousRouteContract(instanceId: string, profileId: string): boolean {
  return (
    Object.hasOwn(DANGEROUS_ROUTE_CONTRACTS, instanceId) &&
    DANGEROUS_ROUTE_CONTRACTS[instanceId] === profileId
  );
}

/** Server-derived authorization for the authored dangerous route from a contract membership. */
export interface TrustedContractRouteAuthorization {
  readonly instanceId: string;
  readonly profileId: string;
  readonly termsDigest: string;
  readonly purpose: 'NEW' | 'RETURN';
  readonly worldId: string;
  readonly companyId: string;
  readonly partyId: string;
  readonly canonicalRevision: string;
  readonly atTick: CampaignTick;
  readonly edgeIds: readonly string[];
}

export const FIRST_HUNT_TRAVEL_SCOPE = Object.freeze({
  edgeId: 'tikhaya-gat-staraya-melnitsa',
  fromSiteId: 'tikhaya-gat',
  toSiteId: 'staraya-melnitsa',
});
const FIRST_HUNT_EDGE_ID = FIRST_HUNT_TRAVEL_SCOPE.edgeId;
const FIRST_HUNT_SITES = Object.freeze({
  from: FIRST_HUNT_TRAVEL_SCOPE.fromSiteId,
  to: FIRST_HUNT_TRAVEL_SCOPE.toSiteId,
});

/** Must come from an existing trusted adapter; this preparer does not create it. */
export interface TrustedReturnOrCampAuthorization {
  readonly purpose: 'RETURN' | 'CAMP';
  readonly worldId: string;
  readonly companyId: string;
  readonly partyId: string;
  readonly canonicalRevision: string;
  readonly atTick: CampaignTick;
  readonly edgeIds: readonly string[];
}

export interface PreparedPartyRoute {
  readonly kind: 'PREPARED_PARTY_ROUTE';
  readonly worldId: string;
  readonly regionVersion: WorldRegion['version'];
  readonly partyId: string;
  /** The external monotonic route epoch advanced by this accepted proposal. */
  readonly routeEpoch: string;
  readonly travelProfileId: typeof TRAVEL_RULES.profileId;
  readonly purpose: RouteIntent['purpose'];
  readonly route: readonly WorldRegionEdge[];
  readonly segment: {
    readonly segmentId: string;
    readonly fromSiteId: string;
    readonly toSiteId: string;
    readonly startedAt: CampaignTick;
    readonly arrivalNotBefore: CampaignTick;
  };
  readonly memberMoves: readonly {
    readonly characterId: string;
    readonly from: LocationRef;
    readonly to: LocationRef;
  }[];
  /** Inputs for the existing physical composer; this preparation moves no container. */
  readonly carrierFollow: readonly {
    readonly carrier: { readonly kind: 'PARTY' | 'CHARACTER'; readonly id: string };
    readonly from: LocationRef;
    readonly to: LocationRef;
  }[];
  readonly assumptions: readonly string[];
  readonly residuals: readonly [
    'WORLD_ROUTE_EPOCH_PERSISTENCE',
    'PHYSICAL_CARRIER_FOLLOW_APPLICATION',
    'ACTUAL_SUPPLY_AND_FATIGUE_EFFECTS',
    'INCAPACITATED_OR_CARRIED_MEMBER_TRAVEL_PRODUCER',
    'TRUSTED_RETURN_OR_CAMP_AUTHORIZATION_PRODUCER',
  ];
}

export interface TrustedRouteArrivalCandidate {
  readonly worldId: string;
  readonly partyId: string;
  readonly segmentId: string;
  readonly regionVersion: WorldRegion['version'];
  readonly routeEpoch: string;
  readonly cause: 'ROUTE_ARRIVAL';
  readonly location: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string };
  readonly notBefore: CampaignTick;
}

export interface PreparedPartyArrival {
  readonly kind: 'PREPARED_PARTY_ARRIVAL';
  readonly partyId: string;
  readonly routeEpoch: string;
  readonly segmentId: string;
  readonly atTick: CampaignTick;
  readonly location: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string };
  readonly memberMoves: readonly {
    readonly characterId: string;
    readonly from: LocationRef;
    readonly to: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string };
  }[];
  readonly carrierFollow: PreparedPartyRoute['carrierFollow'];
  readonly residuals: readonly [
    'TRUSTED_ARRIVAL_RECEIPT_ISSUANCE',
    'ATOMIC_PARTY_AND_PHYSICAL_APPLICATION',
  ];
}

export type RouteExecutionPhase = 'IN_TRANSIT' | 'AT_BOUNDARY' | 'COMPLETE';

/** Serializable accepted itinerary state. Account authorization and receipts belong to adapters. */
export interface PartyRouteExecution {
  readonly schemaVersion: 2;
  readonly routeExecutionId: string;
  readonly worldId: string;
  readonly companyId: string;
  readonly partyId: string;
  readonly regionVersion: string;
  readonly profileId: string;
  readonly routeEpoch: string;
  readonly purpose: 'NEW' | 'RETURN';
  readonly edgeIds: readonly string[];
  /** Present only when the server accepted the authored dangerous FIRST HUNT edge. */
  readonly dangerousAuthorization?: Pick<
    TrustedContractRouteAuthorization,
    'instanceId' | 'profileId' | 'termsDigest'
  >;
  readonly phase: RouteExecutionPhase;
  /** Active edge while IN_TRANSIT; next untraversed edge at a boundary. */
  readonly nextEdgeIndex: number;
  /** Last actually committed site; while traveling this is the active edge's origin. */
  readonly currentSiteId: string;
  readonly segment: null | {
    readonly segmentId: string;
    readonly fromSiteId: string;
    readonly toSiteId: string;
    readonly startedAt: CampaignTick;
    readonly dueTick: CampaignTick;
  };
}

export interface PartyRouteExecutionContinuationGuard {
  readonly routeExecutionId: string;
  readonly regionVersion: string;
  readonly routeEpoch: string;
  readonly nextEdgeIndex: number;
  readonly currentSiteId: string;
  readonly edgeIds: readonly string[];
}

export type PartyRouteExecutionArrivalGuard = PartyRouteExecution;

function freezeExecution(execution: PartyRouteExecution): PartyRouteExecution {
  return Object.freeze({
    ...execution,
    edgeIds: Object.freeze([...execution.edgeIds]),
    segment: execution.segment ? Object.freeze({ ...execution.segment }) : null,
  });
}

function executionId(value: string): string {
  try {
    if (typeof value !== 'string' || value.length > 64) fail('INVALID_ROUTE_EXECUTION');
    return entityId(value);
  } catch {
    return fail('INVALID_ROUTE_EXECUTION');
  }
}

function routeForExecution(execution: PartyRouteExecution): readonly WorldRegionEdge[] {
  const region = acceptedWorldRegion(execution.regionVersion);
  if (!region) fail('INVALID_ROUTE_EXECUTION');
  const edges = execution.edgeIds.map((edgeId) => {
    const matches = region.edges.filter((edge) => edge.edgeId === edgeId);
    if (matches.length !== 1) fail('INVALID_ROUTE_EXECUTION');
    return matches[0]!;
  });
  const dangerous = edges.some((edge) => edge.danger !== 'SAFE');
  if (
    edges.length === 0 ||
    (dangerous && !matchesFirstHuntExecutionAuthorization(execution, edges)) ||
    (!dangerous && execution.dangerousAuthorization !== undefined)
  )
    fail('UNSUPPORTED_ROUTE_CONTINUATION');
  return edges;
}

function matchesFirstHuntExecutionAuthorization(
  execution: PartyRouteExecution,
  edges: readonly WorldRegionEdge[],
): boolean {
  const authorization = execution.dangerousAuthorization;
  const edge = edges.length === 1 ? edges[0] : undefined;
  const fromSiteId = execution.purpose === 'NEW' ? FIRST_HUNT_SITES.from : FIRST_HUNT_SITES.to;
  const toSiteId = execution.purpose === 'NEW' ? FIRST_HUNT_SITES.to : FIRST_HUNT_SITES.from;
  const traversalMatches = execution.segment
    ? execution.segment.fromSiteId === fromSiteId && execution.segment.toSiteId === toSiteId
    : execution.phase === 'COMPLETE' &&
      execution.nextEdgeIndex === execution.edgeIds.length &&
      execution.currentSiteId === toSiteId;
  return Boolean(
    authorization &&
    isDangerousRouteContract(authorization.instanceId, authorization.profileId) &&
    /^[0-9a-f]{64}$/.test(authorization.termsDigest) &&
    edge?.edgeId === FIRST_HUNT_EDGE_ID &&
    edge.danger === 'DANGEROUS' &&
    ((edge.fromSiteId === fromSiteId && edge.toSiteId === toSiteId) ||
      (edge.fromSiteId === toSiteId && edge.toSiteId === fromSiteId)) &&
    traversalMatches,
  );
}

function acceptedRouteForExecution(
  execution: PartyRouteExecution,
  region: WorldRegion,
  segment: NonNullable<PartyRouteExecution['segment']>,
): PreparedPartyRoute {
  return {
    kind: 'PREPARED_PARTY_ROUTE',
    worldId: execution.worldId,
    regionVersion: region.version,
    partyId: execution.partyId,
    routeEpoch: execution.routeEpoch,
    travelProfileId: TRAVEL_RULES.profileId,
    purpose: execution.purpose,
    route: routeForExecution(execution),
    segment: {
      segmentId: segment.segmentId,
      fromSiteId: segment.fromSiteId,
      toSiteId: segment.toSiteId,
      startedAt: segment.startedAt,
      arrivalNotBefore: segment.dueTick,
    },
    memberMoves: Object.freeze([]),
    carrierFollow: Object.freeze([]),
    assumptions: Object.freeze([]),
    residuals: Object.freeze([
      'WORLD_ROUTE_EPOCH_PERSISTENCE',
      'PHYSICAL_CARRIER_FOLLOW_APPLICATION',
      'ACTUAL_SUPPLY_AND_FATIGUE_EFFECTS',
      'INCAPACITATED_OR_CARRIED_MEMBER_TRAVEL_PRODUCER',
      'TRUSTED_RETURN_OR_CAMP_AUTHORIZATION_PRODUCER',
    ] as const),
  };
}

/** Start the first edge of a safe, explicitly accepted multi-edge itinerary. */
export function preparePartyRouteExecution(input: {
  readonly region: WorldRegion;
  readonly state: LifecycleState;
  readonly partyId: string;
  readonly routeExecutionId: string;
  readonly intent: RouteIntent;
  readonly atTick: CampaignTick;
  readonly expectedRouteEpoch: string;
  readonly currentRouteEpoch: string;
  readonly segmentId: string;
  readonly supplyAssessment?: TrustedRouteSupplyAssessment;
  readonly safeTravelAuthorization?: TrustedReturnOrCampAuthorization;
  readonly dangerousAuthorization?: TrustedContractRouteAuthorization;
}): { readonly route: PreparedPartyRoute; readonly execution: PartyRouteExecution } {
  if (input.intent.kind !== 'ROUTE' || input.intent.purpose === 'CAMP')
    fail('UNSUPPORTED_ROUTE_CONTINUATION');
  const routeExecutionId = executionId(input.routeExecutionId);
  const route = preparePartyRoute(input);
  const isDangerous = route.route.some((edge) => edge.danger !== 'SAFE');
  const authorization = input.dangerousAuthorization;
  if (
    isDangerous &&
    (!authorization ||
      !isDangerousRouteContract(authorization.instanceId, authorization.profileId) ||
      !/^[0-9a-f]{64}$/.test(authorization.termsDigest) ||
      authorization.purpose !== route.purpose ||
      authorization.worldId !== route.worldId ||
      authorization.companyId !== input.state.companyId ||
      authorization.partyId !== input.partyId ||
      authorization.canonicalRevision !== input.state.revision ||
      authorization.atTick !== input.atTick ||
      canonicalJson(authorization.edgeIds) !== canonicalJson(input.intent.edgeIds) ||
      route.route.length !== 1 ||
      route.route[0]?.edgeId !== FIRST_HUNT_EDGE_ID ||
      (route.purpose === 'NEW' &&
        (route.segment.fromSiteId !== FIRST_HUNT_SITES.from ||
          route.segment.toSiteId !== FIRST_HUNT_SITES.to)) ||
      (route.purpose === 'RETURN' &&
        (route.segment.fromSiteId !== FIRST_HUNT_SITES.to ||
          route.segment.toSiteId !== FIRST_HUNT_SITES.from)))
  )
    fail('UNSUPPORTED_ROUTE_CONTINUATION');
  if (!isDangerous && authorization) fail('UNSUPPORTED_ROUTE_CONTINUATION');
  if (route.purpose === 'RETURN' && route.route.length !== 1)
    fail('UNSUPPORTED_ROUTE_CONTINUATION');
  if (
    isDangerous &&
    route.purpose === 'NEW' &&
    authorization &&
    (!input.supplyAssessment || input.supplyAssessment.knownShortage)
  )
    fail(
      input.supplyAssessment
        ? 'KNOWN_DANGEROUS_SUPPLY_SHORTAGE'
        : 'MISSING_DANGEROUS_SUPPLY_ASSESSMENT',
    );
  const execution = freezeExecution({
    schemaVersion: 2,
    routeExecutionId,
    worldId: route.worldId,
    companyId: input.state.companyId,
    partyId: route.partyId,
    regionVersion: route.regionVersion,
    profileId: route.travelProfileId,
    routeEpoch: route.routeEpoch,
    purpose: route.purpose as 'NEW' | 'RETURN',
    edgeIds: route.route.map((edge) => edge.edgeId),
    ...(authorization === undefined
      ? {}
      : {
          dangerousAuthorization: {
            instanceId: authorization.instanceId,
            profileId: authorization.profileId,
            termsDigest: authorization.termsDigest,
          },
        }),
    phase: 'IN_TRANSIT',
    nextEdgeIndex: 0,
    currentSiteId: route.segment.fromSiteId,
    segment: {
      segmentId: route.segment.segmentId,
      fromSiteId: route.segment.fromSiteId,
      toSiteId: route.segment.toSiteId,
      startedAt: route.segment.startedAt,
      dueTick: route.segment.arrivalNotBefore,
    },
  });
  return Object.freeze({ route, execution });
}

/** Commit one due arrival to the next boundary or to final completion. */
export function prepareRouteExecutionArrival(input: {
  readonly region: WorldRegion;
  readonly state: LifecycleState;
  readonly execution: PartyRouteExecution;
  /** Separately loaded accepted snapshot; prevents arrival against a changed itinerary. */
  readonly expected: PartyRouteExecutionArrivalGuard;
  readonly candidate: TrustedRouteArrivalCandidate;
  readonly currentRouteEpoch: string;
  readonly trustedNow: CampaignTick;
}): { readonly arrival: PreparedPartyArrival; readonly execution: PartyRouteExecution } {
  const { execution } = input;
  const region = acceptedWorldRegion(execution.regionVersion);
  if (
    execution.schemaVersion !== 2 ||
    canonicalJson(execution) !== canonicalJson(input.expected) ||
    !region ||
    execution.phase !== 'IN_TRANSIT' ||
    !execution.segment ||
    !isExactInteger(execution.routeEpoch) ||
    execution.routeEpoch !== input.currentRouteEpoch ||
    execution.worldId !== input.state.worldId ||
    execution.companyId !== input.state.companyId ||
    execution.profileId !== TRAVEL_RULES.profileId ||
    !Number.isSafeInteger(execution.nextEdgeIndex) ||
    execution.nextEdgeIndex < 0 ||
    execution.nextEdgeIndex >= execution.edgeIds.length ||
    execution.currentSiteId !== execution.segment.fromSiteId
  )
    fail('INVALID_ROUTE_EXECUTION');
  const edges = routeForExecution(execution);
  const activeEdge = edges[execution.nextEdgeIndex]!;
  if (
    !(
      (activeEdge.fromSiteId === execution.segment.fromSiteId &&
        activeEdge.toSiteId === execution.segment.toSiteId) ||
      (activeEdge.toSiteId === execution.segment.fromSiteId &&
        activeEdge.fromSiteId === execution.segment.toSiteId)
    ) ||
    BigInt(execution.segment.dueTick) - BigInt(execution.segment.startedAt) !==
      BigInt(activeEdge.provisionalTravelTicks)
  )
    fail('INVALID_ROUTE_EXECUTION');
  const acceptedRoute = acceptedRouteForExecution(execution, region, execution.segment);
  const atTick = input.trustedNow;
  const arrivalAtTrustedTime = preparePartyArrival({
    region,
    state: input.state,
    candidate: input.candidate,
    acceptedRoute,
    currentRouteEpoch: input.currentRouteEpoch,
    atTick,
  });
  if (!isExactInteger(execution.segment.dueTick)) fail('INVALID_ROUTE_EXECUTION');
  const arrival =
    arrivalAtTrustedTime.atTick === execution.segment.dueTick
      ? arrivalAtTrustedTime
      : preparePartyArrival({
          region,
          state: input.state,
          candidate: input.candidate,
          acceptedRoute,
          currentRouteEpoch: input.currentRouteEpoch,
          atTick: execution.segment.dueTick,
        });
  const nextEdgeIndex = execution.nextEdgeIndex + 1;
  return Object.freeze({
    arrival,
    execution: freezeExecution({
      ...execution,
      phase: nextEdgeIndex === execution.edgeIds.length ? 'COMPLETE' : 'AT_BOUNDARY',
      nextEdgeIndex,
      currentSiteId: arrival.location.siteId,
      segment: null,
    }),
  });
}

/** Recheck the accepted cursor and start only its next safe edge. */
export function preparePartyRouteContinuation(input: {
  readonly region: WorldRegion;
  readonly state: LifecycleState;
  readonly execution: PartyRouteExecution;
  readonly expected: PartyRouteExecutionContinuationGuard;
  readonly currentRouteEpoch: string;
  readonly atTick: CampaignTick;
  readonly segmentId: string;
}): { readonly route: PreparedPartyRoute; readonly execution: PartyRouteExecution } {
  const { execution, expected } = input;
  const region = acceptedWorldRegion(execution.regionVersion);
  if (
    execution.schemaVersion !== 2 ||
    !region ||
    region.version !== input.region.version ||
    execution.phase !== 'AT_BOUNDARY' ||
    execution.segment !== null ||
    execution.worldId !== input.state.worldId ||
    execution.companyId !== input.state.companyId ||
    execution.profileId !== TRAVEL_RULES.profileId ||
    !isExactInteger(execution.routeEpoch) ||
    execution.routeEpoch !== input.currentRouteEpoch ||
    execution.routeExecutionId !== expected.routeExecutionId ||
    execution.regionVersion !== expected.regionVersion ||
    execution.routeEpoch !== expected.routeEpoch ||
    execution.nextEdgeIndex !== expected.nextEdgeIndex ||
    execution.currentSiteId !== expected.currentSiteId ||
    canonicalJson(execution.edgeIds) !== canonicalJson(expected.edgeIds) ||
    !Number.isSafeInteger(execution.nextEdgeIndex) ||
    execution.nextEdgeIndex < 0 ||
    execution.nextEdgeIndex >= execution.edgeIds.length
  )
    fail('STALE_ROUTE_EXECUTION');
  const parties = input.state.parties.filter((party) => party.partyId === execution.partyId);
  if (
    parties.length !== 1 ||
    parties[0]!.location.kind !== 'AT' ||
    parties[0]!.location.siteId !== execution.currentSiteId
  )
    fail('INVALID_ROUTE_EXECUTION');
  const edges = routeForExecution(execution);
  const nextEdge = edges[execution.nextEdgeIndex]!;
  if (
    !isExactInteger(input.atTick) ||
    BigInt(input.atTick) < BigInt(input.state.campaignTick) ||
    !(
      nextEdge.fromSiteId === execution.currentSiteId ||
      nextEdge.toSiteId === execution.currentSiteId
    )
  )
    fail('INVALID_ROUTE_EXECUTION');
  const prepared = preparePartyRoute({
    region,
    state: input.state,
    partyId: execution.partyId,
    intent: { kind: 'ROUTE', edgeIds: [nextEdge.edgeId], purpose: execution.purpose },
    atTick: input.atTick,
    expectedRouteEpoch: execution.routeEpoch,
    currentRouteEpoch: execution.routeEpoch,
    segmentId: input.segmentId,
  });
  const route = Object.freeze({ ...prepared, routeEpoch: execution.routeEpoch });
  return Object.freeze({
    route,
    execution: freezeExecution({
      ...execution,
      phase: 'IN_TRANSIT',
      currentSiteId: route.segment.fromSiteId,
      segment: {
        segmentId: route.segment.segmentId,
        fromSiteId: route.segment.fromSiteId,
        toSiteId: route.segment.toSiteId,
        startedAt: route.segment.startedAt,
        dueTick: route.segment.arrivalNotBefore,
      },
    }),
  });
}

function fail(code: RoutePreparationCode): never {
  throw new RoutePreparationError(code);
}

function routeSegmentId(worldId: string, partyId: string, routeEpoch: string): string {
  return entityId(`${worldId}:${partyId}:${routeEpoch}`);
}

function ownLocation(location: LocationRef): LocationRef {
  return Object.freeze({ ...location });
}

function partyMembers(state: LifecycleState, partyId: string): readonly LifecycleCharacter[] {
  const members = state.characters.filter(
    (character) => character.presence.fieldPartyId === partyId,
  );
  const ids = new Set<string>();
  if (
    members.length === 0 ||
    state.memberships
      .filter(
        (membership) => membership.companyId === state.companyId && membership.endedAt === null,
      )
      .some(
        (membership) =>
          state.characters.filter(
            (character) => character.identity.characterId === membership.characterId,
          ).length !== 1,
      ) ||
    members.some((character) => {
      const id = character.identity.characterId;
      if (
        ids.has(id) ||
        !state.memberships.some(
          (membership) =>
            membership.characterId === id &&
            membership.companyId === state.companyId &&
            membership.endedAt === null,
        )
      )
        return true;
      ids.add(id);
      return false;
    })
  )
    fail('INCOMPLETE_PARTY');
  return members;
}

function findRoute(
  region: WorldRegion,
  fromSiteId: string,
  intent: RouteIntent,
): readonly WorldRegionEdge[] {
  if (
    (intent.kind !== 'ROUTE' && intent.kind !== 'FREE_INTENT') ||
    !Array.isArray(intent.edgeIds) ||
    intent.edgeIds.length === 0 ||
    (intent.kind === 'FREE_INTENT' && intent.edgeIds.length !== 1) ||
    !['NEW', 'RETURN', 'CAMP'].includes(intent.purpose)
  )
    fail('INVALID_ROUTE');
  let current = fromSiteId;
  const selected: WorldRegionEdge[] = [];
  for (const edgeId of intent.edgeIds) {
    const matches = region.edges.filter((edge) => edge.edgeId === edgeId);
    if (matches.length !== 1) fail('INVALID_ROUTE');
    const edge = matches[0]!;
    if (edge.fromSiteId === current) current = edge.toSiteId;
    else if (edge.toSiteId === current) current = edge.fromSiteId;
    else fail('INVALID_ROUTE');
    selected.push(edge);
  }
  return selected;
}

/** Prepare a bounded proposal from the canonical company graph; this is not a command or applied movement. */
export function preparePartyRoute(input: {
  readonly region: WorldRegion;
  readonly state: LifecycleState;
  readonly partyId: string;
  readonly intent: RouteIntent;
  readonly atTick: CampaignTick;
  readonly expectedRouteEpoch: string;
  readonly currentRouteEpoch: string;
  /** Optional server-minted identity persisted with the accepted route receipt. */
  readonly segmentId?: string;
  readonly supplyAssessment?: TrustedRouteSupplyAssessment;
  readonly safeTravelAuthorization?: TrustedReturnOrCampAuthorization;
  readonly dangerousAuthorization?: TrustedContractRouteAuthorization;
}): PreparedPartyRoute {
  const { region, state, partyId, intent } = input;
  if (
    region.version !== WORLD_REGION_VERSION ||
    canonicalJson(region) !== canonicalJson(SEROE_PORECHYE)
  )
    fail('INVALID_REGION');
  if (
    !isExactInteger(input.expectedRouteEpoch) ||
    !isExactInteger(input.currentRouteEpoch) ||
    !isExactInteger(input.atTick) ||
    input.expectedRouteEpoch !== input.currentRouteEpoch
  )
    fail(
      input.expectedRouteEpoch === input.currentRouteEpoch
        ? 'INVALID_ROUTE_EPOCH'
        : 'STALE_ROUTE_EPOCH',
    );
  if (BigInt(input.atTick) < BigInt(state.campaignTick)) fail('STALE_ROUTE_TIME');
  const partyMatches = state.parties.filter((party) => party.partyId === partyId);
  if (partyMatches.length !== 1) fail('INCOMPLETE_PARTY');
  const party = partyMatches[0]!;
  if (party.location.kind !== 'AT') fail('INCOMPLETE_PARTY');
  const from = party.location;
  const fromSite = region.sites.find((site) => site.siteId === from.siteId);
  if (!fromSite?.areas.some((area) => area.areaId === from.areaId)) fail('INVALID_ROUTE');
  const members = partyMembers(state, partyId);
  if (
    members.some(
      (member) => !sameLocation(member.presence.location, from) || !canPerform(member, 'travel'),
    )
  )
    fail('PARTY_MEMBER_TRAVEL_UNSUPPORTED');

  const route = findRoute(region, from.siteId, intent);
  const isDangerous = route.some((edge) => edge.danger === 'DANGEROUS');
  const firstHuntAuthorizationValid = matchesFirstHuntRouteAuthorization({
    authorization: input.dangerousAuthorization,
    state,
    partyId,
    purpose: intent.purpose,
    atTick: input.atTick,
    edgeIds: intent.edgeIds,
    fromSiteId: from.siteId,
    route,
  });
  let assumptions: readonly string[] = [];
  if (isDangerous && intent.purpose !== 'NEW' && !firstHuntAuthorizationValid) {
    const authorization = input.safeTravelAuthorization;
    if (!authorization) fail('MISSING_SCOPED_RETURN_OR_CAMP_AUTHORIZATION');
    if (
      authorization.purpose !== intent.purpose ||
      authorization.worldId !== state.worldId ||
      authorization.companyId !== state.companyId ||
      authorization.partyId !== partyId ||
      authorization.canonicalRevision !== state.revision ||
      authorization.atTick !== input.atTick ||
      canonicalJson(authorization.edgeIds) !== canonicalJson(intent.edgeIds)
    )
      fail('INVALID_SCOPED_RETURN_OR_CAMP_AUTHORIZATION');
  }
  if (intent.purpose === 'NEW' && isDangerous) {
    const assessment = input.supplyAssessment;
    if (!assessment || assessment.assumptions.length === 0)
      fail('MISSING_DANGEROUS_SUPPLY_ASSESSMENT');
    if (
      assessment.worldId !== state.worldId ||
      assessment.companyId !== state.companyId ||
      assessment.partyId !== partyId ||
      assessment.canonicalRevision !== state.revision ||
      assessment.atTick !== input.atTick ||
      canonicalJson(assessment.edgeIds) !== canonicalJson(intent.edgeIds)
    )
      fail('INVALID_DANGEROUS_SUPPLY_ASSESSMENT');
    if (assessment.knownShortage) fail('KNOWN_DANGEROUS_SUPPLY_SHORTAGE');
    assumptions = Object.freeze([...assessment.assumptions]);
  }
  const routeEpoch = (BigInt(input.currentRouteEpoch) + 1n).toString();
  const segmentId =
    input.segmentId === undefined
      ? routeSegmentId(state.worldId, partyId, routeEpoch)
      : input.segmentId.length <= 64
        ? entityId(input.segmentId)
        : fail('INVALID_ROUTE');
  const firstEdge = route[0]!;
  const toSiteId = firstEdge.fromSiteId === from.siteId ? firstEdge.toSiteId : firstEdge.fromSiteId;
  const startedAt = campaignTick(input.atTick);
  const arrivalNotBefore = campaignTick(
    (BigInt(startedAt) + BigInt(firstEdge.provisionalTravelTicks)).toString(),
  );
  const transit: LocationRef = Object.freeze({
    kind: 'TRANSIT',
    segmentId,
    from: from.siteId,
    to: toSiteId,
    startedAt,
    arrivalNotBefore,
  });
  const memberMoves = Object.freeze(
    members.map((member) =>
      Object.freeze({
        characterId: member.identity.characterId,
        from: ownLocation(member.presence.location),
        to: transit,
      }),
    ),
  );
  const carrierFollow = Object.freeze([
    Object.freeze({
      carrier: Object.freeze({ kind: 'PARTY' as const, id: partyId }),
      from: ownLocation(from),
      to: transit,
    }),
    ...members.map((member) =>
      Object.freeze({
        carrier: Object.freeze({ kind: 'CHARACTER' as const, id: member.identity.characterId }),
        from: ownLocation(member.presence.location),
        to: transit,
      }),
    ),
  ]);
  return Object.freeze({
    kind: 'PREPARED_PARTY_ROUTE',
    worldId: state.worldId,
    regionVersion: region.version,
    partyId,
    routeEpoch,
    travelProfileId: TRAVEL_RULES.profileId,
    purpose: intent.purpose,
    route: Object.freeze(route.map((edge) => Object.freeze({ ...edge }))),
    segment: Object.freeze({
      segmentId: transit.segmentId,
      fromSiteId: from.siteId,
      toSiteId,
      startedAt,
      arrivalNotBefore,
    }),
    memberMoves,
    carrierFollow,
    assumptions,
    residuals: Object.freeze([
      'WORLD_ROUTE_EPOCH_PERSISTENCE',
      'PHYSICAL_CARRIER_FOLLOW_APPLICATION',
      'ACTUAL_SUPPLY_AND_FATIGUE_EFFECTS',
      'INCAPACITATED_OR_CARRIED_MEMBER_TRAVEL_PRODUCER',
      'TRUSTED_RETURN_OR_CAMP_AUTHORIZATION_PRODUCER',
    ] as const),
  });
}

function matchesFirstHuntRouteAuthorization(input: {
  readonly authorization: TrustedContractRouteAuthorization | undefined;
  readonly state: LifecycleState;
  readonly partyId: string;
  readonly purpose: RouteIntent['purpose'];
  readonly atTick: CampaignTick;
  readonly edgeIds: readonly string[];
  readonly fromSiteId: string;
  readonly route: readonly WorldRegionEdge[];
}): boolean {
  const { authorization, state, partyId, purpose, atTick, edgeIds, fromSiteId, route } = input;
  const toSiteId =
    route.length === 1 && route[0]!.fromSiteId === fromSiteId
      ? route[0]!.toSiteId
      : route.length === 1 && route[0]!.toSiteId === fromSiteId
        ? route[0]!.fromSiteId
        : undefined;
  return Boolean(
    authorization &&
    (purpose === 'NEW' || purpose === 'RETURN') &&
    isDangerousRouteContract(authorization.instanceId, authorization.profileId) &&
    /^[0-9a-f]{64}$/.test(authorization.termsDigest) &&
    authorization.purpose === purpose &&
    authorization.worldId === state.worldId &&
    authorization.companyId === state.companyId &&
    authorization.partyId === partyId &&
    authorization.canonicalRevision === state.revision &&
    authorization.atTick === atTick &&
    canonicalJson(authorization.edgeIds) === canonicalJson(edgeIds) &&
    canonicalJson(edgeIds) === canonicalJson([FIRST_HUNT_EDGE_ID]) &&
    route.length === 1 &&
    route[0]?.danger === 'DANGEROUS' &&
    ((purpose === 'NEW' &&
      fromSiteId === FIRST_HUNT_SITES.from &&
      toSiteId === FIRST_HUNT_SITES.to) ||
      (purpose === 'RETURN' &&
        fromSiteId === FIRST_HUNT_SITES.to &&
        toSiteId === FIRST_HUNT_SITES.from)),
  );
}

/** Prepare arrival against the finite authored edition bound to the accepted route. */
export function preparePartyArrival(input: {
  /** Current fixture is ignored; the accepted route edition is resolved from the finite archive. */
  readonly region: WorldRegion;
  readonly state: LifecycleState;
  readonly candidate: TrustedRouteArrivalCandidate;
  /** The adapter's current accepted route metadata, used to bind epoch to canonical transit. */
  readonly acceptedRoute: PreparedPartyRoute;
  readonly currentRouteEpoch: string;
  readonly atTick: CampaignTick;
}): PreparedPartyArrival {
  const { state, candidate } = input;
  const region = acceptedWorldRegion(input.acceptedRoute.regionVersion);
  if (!region) fail('INVALID_ARRIVAL');
  if (!isExactInteger(input.atTick)) fail('INVALID_ARRIVAL');
  if (BigInt(input.atTick) < BigInt(state.campaignTick)) fail('STALE_ROUTE_TIME');
  if (
    region.version !== input.acceptedRoute.regionVersion ||
    !isExactInteger(input.currentRouteEpoch) ||
    candidate.worldId !== state.worldId ||
    candidate.regionVersion !== input.acceptedRoute.regionVersion ||
    candidate.routeEpoch !== input.currentRouteEpoch ||
    input.acceptedRoute.worldId !== state.worldId ||
    input.acceptedRoute.partyId !== candidate.partyId ||
    input.acceptedRoute.regionVersion !== region.version ||
    input.acceptedRoute.routeEpoch !== input.currentRouteEpoch ||
    candidate.cause !== 'ROUTE_ARRIVAL'
  )
    fail('INVALID_ARRIVAL');
  const parties = state.parties.filter((party) => party.partyId === candidate.partyId);
  if (parties.length !== 1 || parties[0]!.location.kind !== 'TRANSIT') fail('INVALID_ARRIVAL');
  const party = parties[0]!;
  const segment = party.location;
  if (
    segment.kind !== 'TRANSIT' ||
    segment.segmentId !== candidate.segmentId ||
    input.acceptedRoute.segment.segmentId !== segment.segmentId ||
    input.acceptedRoute.segment.fromSiteId !== segment.from ||
    input.acceptedRoute.segment.toSiteId !== segment.to ||
    input.acceptedRoute.segment.startedAt !== segment.startedAt ||
    input.acceptedRoute.segment.arrivalNotBefore !== segment.arrivalNotBefore ||
    !isExactInteger(candidate.notBefore) ||
    BigInt(input.atTick) < BigInt(segment.arrivalNotBefore) ||
    candidate.notBefore !== segment.arrivalNotBefore ||
    candidate.location.siteId !== segment.to
  )
    fail('INVALID_ARRIVAL');
  const site = region.sites.find((entry) => entry.siteId === segment.to);
  const authoredArea = site?.areas[0];
  if (
    !authoredArea ||
    candidate.location.kind !== 'AT' ||
    candidate.location.areaId !== authoredArea.areaId
  )
    fail('INVALID_ARRIVAL');
  const members = partyMembers(state, candidate.partyId);
  if (members.some((member) => !sameLocation(member.presence.location, segment)))
    fail('INCOMPLETE_PARTY');
  const location = Object.freeze({
    kind: 'AT' as const,
    siteId: site!.siteId,
    areaId: authoredArea.areaId,
  });
  const memberMoves = Object.freeze(
    members.map((member) =>
      Object.freeze({
        characterId: member.identity.characterId,
        from: ownLocation(member.presence.location),
        to: location,
      }),
    ),
  );
  const carrierFollow = Object.freeze([
    Object.freeze({
      carrier: Object.freeze({ kind: 'PARTY' as const, id: candidate.partyId }),
      from: ownLocation(segment),
      to: location,
    }),
    ...members.map((member) =>
      Object.freeze({
        carrier: Object.freeze({ kind: 'CHARACTER' as const, id: member.identity.characterId }),
        from: ownLocation(member.presence.location),
        to: location,
      }),
    ),
  ]);
  return Object.freeze({
    kind: 'PREPARED_PARTY_ARRIVAL',
    partyId: candidate.partyId,
    routeEpoch: candidate.routeEpoch,
    segmentId: segment.segmentId,
    atTick: campaignTick(input.atTick),
    location,
    memberMoves,
    carrierFollow,
    residuals: Object.freeze([
      'TRUSTED_ARRIVAL_RECEIPT_ISSUANCE',
      'ATOMIC_PARTY_AND_PHYSICAL_APPLICATION',
    ] as const),
  });
}

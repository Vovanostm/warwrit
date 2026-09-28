import type { LifecycleCharacter, LifecycleState } from '../company/lifecycle-types.js';
import { canPerform, sameLocation } from '../company/lifecycle-state.js';
import { canonicalJson } from '../company/input.js';
import type { LocationRef } from '../company/model.js';
import { campaignTick, entityId, isExactInteger } from '../company/values.js';
import type { CampaignTick } from '../company/values.js';
import { SEROE_PORECHYE, WORLD_REGION_VERSION } from './region.js';
import type { WorldRegion, WorldRegionEdge } from './region.js';

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
  | 'STALE_ROUTE_TIME';

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
  readonly regionVersion: typeof WORLD_REGION_VERSION;
  readonly partyId: string;
  /** The external monotonic route epoch advanced by this accepted proposal. */
  readonly routeEpoch: string;
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
  readonly regionVersion: typeof WORLD_REGION_VERSION;
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
  readonly supplyAssessment?: TrustedRouteSupplyAssessment;
  readonly safeTravelAuthorization?: TrustedReturnOrCampAuthorization;
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
  let assumptions: readonly string[] = [];
  if (isDangerous && intent.purpose !== 'NEW') {
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
  const firstEdge = route[0]!;
  const toSiteId = firstEdge.fromSiteId === from.siteId ? firstEdge.toSiteId : firstEdge.fromSiteId;
  const startedAt = campaignTick(input.atTick);
  const arrivalNotBefore = campaignTick(
    (BigInt(startedAt) + BigInt(firstEdge.provisionalTravelTicks)).toString(),
  );
  const transit: LocationRef = Object.freeze({
    kind: 'TRANSIT',
    segmentId: routeSegmentId(state.worldId, partyId, routeEpoch),
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

/** Prepare a whole-party arrival against current transit facts and the authored destination area. */
export function preparePartyArrival(input: {
  readonly region: WorldRegion;
  readonly state: LifecycleState;
  readonly candidate: TrustedRouteArrivalCandidate;
  /** The adapter's current accepted route metadata, used to bind epoch to canonical transit. */
  readonly acceptedRoute: PreparedPartyRoute;
  readonly currentRouteEpoch: string;
  readonly atTick: CampaignTick;
}): PreparedPartyArrival {
  const { region, state, candidate } = input;
  if (!isExactInteger(input.atTick)) fail('INVALID_ARRIVAL');
  if (BigInt(input.atTick) < BigInt(state.campaignTick)) fail('STALE_ROUTE_TIME');
  if (
    region.version !== WORLD_REGION_VERSION ||
    canonicalJson(region) !== canonicalJson(SEROE_PORECHYE) ||
    !isExactInteger(input.currentRouteEpoch) ||
    candidate.worldId !== state.worldId ||
    candidate.regionVersion !== region.version ||
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
    segment.segmentId !==
      routeSegmentId(state.worldId, candidate.partyId, input.currentRouteEpoch) ||
    input.acceptedRoute.segment.segmentId !== segment.segmentId ||
    input.acceptedRoute.segment.fromSiteId !== segment.from ||
    input.acceptedRoute.segment.toSiteId !== segment.to ||
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

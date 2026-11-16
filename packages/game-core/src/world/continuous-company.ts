import { SEROE_PORECHYE } from './region.js';
import type { MaterializedCompanyState } from '../company/physical-root-types.js';
import type { LocationRef } from '../company/model.js';
import { canPerform, sameLocation } from '../company/lifecycle-state.js';
import { campaignTick } from '../company/values.js';
import { applyFreeMovement } from './free-movement.js';
import {
  positionAt,
  type ContinuousMovementPlan,
  type NavigationRegion,
  type PointMicroFp,
} from './continuous-movement.js';
import {
  CONTINUOUS_WORLD_REGION,
  continuousSite,
  isContinuousRegionVersion,
  sharesContinuousCoordinateFrame,
} from './continuous-region.js';

export interface ContinuousCompanyExecution {
  readonly schemaVersion: 2;
  readonly partyId: string;
  readonly regionVersion: string;
  readonly startedAt: string;
  readonly arrivesAt: string;
  readonly routeEpoch: string;
  readonly plan: ContinuousMovementPlan;
  readonly siteId: string | null;
  /** Server-attested contract scope retained for the accepted trip and its lawful return. */
  readonly dangerAuthorization?: {
    readonly worldId: string;
    readonly companyId: string;
    readonly partyId: string;
    readonly instanceId: string;
    readonly profileId: string;
    readonly termsDigest: string;
    readonly purpose: 'NEW' | 'RETURN';
  };
}

/** The edition defines the units of retained legacy coordinate slots: microFp for V2. */
export function continuousLocationPoint(
  location: LocationRef,
  region: NavigationRegion = CONTINUOUS_WORLD_REGION,
): PointMicroFp | undefined {
  if (location.kind === 'AT') {
    const site =
      region === CONTINUOUS_WORLD_REGION
        ? continuousSite(location.siteId)
        : region.sites.find((candidate) => candidate.siteId === location.siteId);
    return (
      site && {
        xMicroFp: String(site.anchorFp.xFp * 65536),
        zMicroFp: String(site.anchorFp.zFp * 65536),
      }
    );
  }
  if (
    location.kind === 'TERRAIN' &&
    isContinuousRegionVersion(location.regionVersion) &&
    sharesContinuousCoordinateFrame(location.regionVersion, region.mapEdition)
  )
    return { xMicroFp: location.q, zMicroFp: location.r };
  if (location.kind === 'TERRAIN' && location.regionVersion === SEROE_PORECHYE.version) {
    const q = Number(location.q),
      r = Number(location.r);
    if (Number.isSafeInteger(q) && Number.isSafeInteger(r))
      return { xMicroFp: String((1024 * q + 512 * r) * 65536), zMicroFp: String(-887 * r * 65536) };
  }
  return undefined;
}

function assertMovementOrigin(
  location: LocationRef,
  prior: ContinuousCompanyExecution | null,
  region: NavigationRegion,
) {
  if (
    prior
      ? location.kind !== 'MOVING' ||
        location.segmentId !== prior.plan.planId ||
        location.startedAt !== prior.startedAt ||
        location.arrivalNotBefore !== prior.arrivesAt ||
        location.regionVersion !== prior.regionVersion
      : location.kind !== 'AT' && location.kind !== 'TERRAIN'
  )
    throw new RangeError('MOVEMENT_NOT_ALLOWED');
  if (
    (prior && !sharesContinuousCoordinateFrame(prior.regionVersion, region.mapEdition)) ||
    (location.kind === 'TERRAIN' &&
      !sharesContinuousCoordinateFrame(location.regionVersion, region.mapEdition))
  )
    throw new RangeError('MOVEMENT_NOT_ALLOWED');
}

export function prepareContinuousCompanyMovement(input: {
  readonly root: MaterializedCompanyState;
  readonly partyId: string;
  readonly segmentId: string;
  readonly prior: ContinuousCompanyExecution | null;
  readonly next: ContinuousCompanyExecution | null;
  readonly nowMs: string;
  /** The selected immutable map edition; omitted for existing V5 callers. */
  readonly region?: NavigationRegion;
}) {
  const { root, prior, next } = input;
  const region = input.region ?? CONTINUOUS_WORLD_REGION;
  const party = root.lifecycle.parties.find((p) => p.partyId === input.partyId);
  if (!party) throw new RangeError('MOVEMENT_NOT_ALLOWED');
  assertMovementOrigin(party.location, prior, region);
  const point = prior
    ? positionAt(prior.plan, input.nowMs)
    : continuousLocationPoint(party.location, region);
  if (!point) throw new RangeError('MOVEMENT_NOT_ALLOWED');
  const members = root.lifecycle.characters.filter(
    (c) => c.presence.fieldPartyId === party.partyId,
  );
  if (
    members.length === 0 ||
    members.some(
      (c) =>
        !sameLocation(c.presence.location, party.location) ||
        c.presence.availability !== 'AVAILABLE' ||
        c.presence.encounterBindingId !== null ||
        (next && !canPerform(c, 'travel')),
    )
  )
    throw new RangeError('MOVEMENT_NOT_ALLOWED');
  if (
    next &&
    (next.plan.from.xMicroFp !== point.xMicroFp ||
      next.plan.from.zMicroFp !== point.zMicroFp ||
      next.partyId !== party.partyId ||
      next.regionVersion !== region.mapEdition)
  )
    throw new RangeError('MOVEMENT_NOT_ALLOWED');
  const site = next
    ? undefined
    : region.sites.find(
        (site) =>
          String(site.anchorFp.xFp * 65536) === point.xMicroFp &&
          String(site.anchorFp.zFp * 65536) === point.zMicroFp,
      );
  const location: LocationRef = next
    ? {
        kind: 'MOVING',
        segmentId: next.plan.planId,
        regionVersion: next.regionVersion,
        fromQ: next.plan.from.xMicroFp,
        fromR: next.plan.from.zMicroFp,
        toQ: next.plan.goal.xMicroFp,
        toR: next.plan.goal.zMicroFp,
        startedAt: campaignTick(next.startedAt),
        arrivalNotBefore: campaignTick(next.arrivesAt),
      }
    : site
      ? { kind: 'AT', siteId: site.siteId, areaId: site.areaId }
      : {
          kind: 'TERRAIN',
          regionVersion: region.mapEdition,
          q: point.xMicroFp,
          r: point.zMicroFp,
        };
  // The shared mover owns members, observations, carriers and the root revision.
  return applyFreeMovement(
    root,
    party.partyId,
    members,
    location,
    input.segmentId,
    root.lifecycle.campaignTick,
    next ?? prior,
  );
}

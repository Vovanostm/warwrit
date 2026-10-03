import { campaignTick, canonicalRevision, isExactInteger } from '../company/values.js';
import type { CampaignTick } from '../company/values.js';
import type { LocationRef } from '../company/model.js';
import type { MaterializedCompanyState } from '../company/physical-root-types.js';
import { observePartyMovement } from '../company/lifecycle.js';
import type { LifecycleEvent } from '../company/lifecycle-types.js';
import { canPerform, sameLocation } from '../company/lifecycle-state.js';
import { followCarrierLocations } from '../company/physical.js';
import { validatePhysicalState } from '../company/physical-state.js';
import type { WorldRegion } from './region.js';

export const FREE_MOVEMENT_PROFILE = Object.freeze({
  profileId: 'free-terrain-step-v1',
  ticksPerHex: 2,
} as const);

export interface WorldHexPosition {
  readonly q: number;
  readonly r: number;
}

export function terrainLocation(
  regionVersion: string,
  position: WorldHexPosition,
): Extract<LocationRef, { readonly kind: 'TERRAIN' }> {
  return Object.freeze({
    kind: 'TERRAIN',
    regionVersion,
    q: String(position.q),
    r: String(position.r),
  });
}

export interface FreeMovementExecution {
  readonly schemaVersion: 1;
  readonly partyId: string;
  readonly regionVersion: string;
  readonly profileId: typeof FREE_MOVEMENT_PROFILE.profileId;
  readonly routeEpoch: string;
  readonly startedAt: CampaignTick;
  readonly arrivesAt: CampaignTick;
  readonly from: WorldHexPosition;
  readonly to: WorldHexPosition;
  readonly path: readonly WorldHexPosition[];
}

export interface PreparedFreeMovement {
  readonly root: MaterializedCompanyState;
  readonly execution: FreeMovementExecution;
  readonly observationEvents: readonly LifecycleEvent[];
}

const HEX_STEPS: readonly WorldHexPosition[] = Object.freeze([
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
]);

export function isWalkableHex(region: WorldRegion, position: WorldHexPosition): boolean {
  if (
    !Number.isSafeInteger(position.q) ||
    !Number.isSafeInteger(position.r) ||
    position.q < region.walkBounds.minQ ||
    position.q > region.walkBounds.maxQ ||
    position.r < region.walkBounds.minR ||
    position.r > region.walkBounds.maxR
  )
    return false;
  const row = region.terrainRows.find((entry) => entry.r === position.r);
  return Boolean(
    row &&
    position.q >= row.fromQ &&
    position.q <= row.toQ &&
    !region.blockedHexes.some((entry) => entry.q === position.q && entry.r === position.r),
  );
}

/** Finite BFS over the authored hex terrain; stable neighbor order fixes path ties. */
export function findFreeMovementPath(
  region: WorldRegion,
  from: WorldHexPosition,
  to: WorldHexPosition,
): readonly WorldHexPosition[] | undefined {
  if (!isWalkableHex(region, from) || !isWalkableHex(region, to)) return undefined;
  const startKey = hexKey(from);
  const targetKey = hexKey(to);
  if (startKey === targetKey) return undefined;
  const pending: WorldHexPosition[] = [{ ...from }];
  const parents = new Map<string, string | null>([[startKey, null]]);
  let cursor = 0;
  while (cursor < pending.length) {
    const current = pending[cursor++]!;
    const currentKey = hexKey(current);
    if (currentKey === targetKey) break;
    for (const step of HEX_STEPS) {
      const next = { q: current.q + step.q, r: current.r + step.r };
      const nextKey = hexKey(next);
      if (parents.has(nextKey) || !isWalkableHex(region, next)) continue;
      parents.set(nextKey, currentKey);
      pending.push(next);
    }
  }
  if (!parents.has(targetKey)) return undefined;
  const reversed: WorldHexPosition[] = [];
  let key: string | null = targetKey;
  while (key !== null) {
    const [q, r] = key.split(',').map(Number);
    reversed.push({ q: q!, r: r! });
    key = parents.get(key) ?? null;
  }
  return Object.freeze(reversed.reverse().map((point) => Object.freeze(point)));
}

export function acceptFreeMovement(input: {
  readonly region: WorldRegion;
  readonly partyId: string;
  readonly from: WorldHexPosition;
  readonly to: WorldHexPosition;
  readonly routeEpoch: string;
  readonly atTick: CampaignTick;
}): FreeMovementExecution {
  if (!isExactInteger(input.atTick) || !/^(0|[1-9]\d{0,18})$/.test(input.routeEpoch))
    throw new RangeError('Invalid free movement boundary');
  const path = findFreeMovementPath(input.region, input.from, input.to);
  if (!path) throw new RangeError('Invalid free movement destination');
  const arrivesAt = campaignTick(
    (
      BigInt(input.atTick) +
      BigInt(path.length - 1) * BigInt(FREE_MOVEMENT_PROFILE.ticksPerHex)
    ).toString(),
  );
  return Object.freeze({
    schemaVersion: 1,
    partyId: input.partyId,
    regionVersion: input.region.version,
    profileId: FREE_MOVEMENT_PROFILE.profileId,
    routeEpoch: input.routeEpoch,
    startedAt: input.atTick,
    arrivesAt,
    from: Object.freeze({ ...input.from }),
    to: Object.freeze({ ...input.to }),
    path,
  });
}

/** Position is a deterministic projection of the accepted itinerary and trusted campaign tick. */
export function freeMovementPositionAt(
  execution: FreeMovementExecution,
  trustedTick: CampaignTick,
): WorldHexPosition {
  if (!isExactInteger(trustedTick) || BigInt(trustedTick) < BigInt(execution.startedAt))
    throw new RangeError('Invalid free movement time');
  const steps = Math.min(
    execution.path.length - 1,
    Number(
      (BigInt(trustedTick) - BigInt(execution.startedAt)) /
        BigInt(FREE_MOVEMENT_PROFILE.ticksPerHex),
    ),
  );
  return Object.freeze({ ...execution.path[steps]! });
}

export function freeMovementTimeAtPosition(
  execution: FreeMovementExecution,
  position: WorldHexPosition,
): CampaignTick | undefined {
  const index = execution.path.findIndex(
    (point) => point.q === position.q && point.r === position.r,
  );
  return index < 0
    ? undefined
    : campaignTick(
        (
          BigInt(execution.startedAt) +
          BigInt(index) * BigInt(FREE_MOVEMENT_PROFILE.ticksPerHex)
        ).toString(),
      );
}

export function prepareFreeMovementDeparture(input: {
  readonly root: MaterializedCompanyState;
  readonly region: WorldRegion;
  readonly execution: FreeMovementExecution;
  readonly segmentId: string;
}): PreparedFreeMovement {
  const { root, execution } = input;
  const partyMatches = root.lifecycle.parties.filter(
    (party) => party.partyId === execution.partyId,
  );
  const party = partyMatches.length === 1 ? partyMatches[0] : undefined;
  if (
    execution.regionVersion !== input.region.version ||
    root.lifecycle.campaignTick !== execution.startedAt ||
    execution.path.length < 2 ||
    execution.path.length > 512 ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(input.segmentId) ||
    !party ||
    (party.location.kind !== 'AT' && party.location.kind !== 'TERRAIN') ||
    !sameHex(positionOfLocation(party.location, input.region), execution.from)
  )
    throw new RangeError('Free movement origin is stale');

  const members = root.lifecycle.characters.filter(
    (character) => character.presence.fieldPartyId === party.partyId,
  );
  if (
    members.length === 0 ||
    members.some(
      (member) =>
        member.presence.availability !== 'AVAILABLE' ||
        member.presence.encounterBindingId !== null ||
        !canPerform(member, 'travel') ||
        !sameLocation(member.presence.location, party.location),
    )
  )
    throw new RangeError('Free movement party is not able to travel');

  const moving: LocationRef = Object.freeze({
    kind: 'MOVING',
    segmentId: input.segmentId,
    regionVersion: execution.regionVersion,
    fromQ: String(execution.from.q),
    fromR: String(execution.from.r),
    toQ: String(execution.to.q),
    toR: String(execution.to.r),
    startedAt: execution.startedAt,
    arrivalNotBefore: execution.arrivesAt,
  });
  return applyFreeMovement(
    root,
    party.partyId,
    members,
    moving,
    input.segmentId,
    execution.startedAt,
    execution,
  );
}

export function prepareFreeMovementSettlement(input: {
  readonly root: MaterializedCompanyState;
  readonly region: WorldRegion;
  readonly execution: FreeMovementExecution;
  readonly segmentId: string;
  readonly trustedTick: CampaignTick;
}): PreparedFreeMovement {
  const { root, execution } = input;
  const matches = root.lifecycle.parties.filter(
    (party) => party.location.kind === 'MOVING' && party.location.segmentId === input.segmentId,
  );
  const party = matches.length === 1 ? matches[0] : undefined;
  if (
    !isExactInteger(input.trustedTick) ||
    root.lifecycle.campaignTick !== input.trustedTick ||
    execution.regionVersion !== input.region.version ||
    BigInt(input.trustedTick) < BigInt(execution.startedAt) ||
    !party ||
    party.location.kind !== 'MOVING' ||
    party.location.regionVersion !== execution.regionVersion ||
    party.location.startedAt !== execution.startedAt ||
    party.location.arrivalNotBefore !== execution.arrivesAt ||
    party.location.fromQ !== String(execution.from.q) ||
    party.location.fromR !== String(execution.from.r) ||
    party.location.toQ !== String(execution.to.q) ||
    party.location.toR !== String(execution.to.r)
  )
    throw new RangeError('Free movement execution is stale');
  const position = freeMovementPositionAt(execution, input.trustedTick);
  const site = input.region.sites.find(
    (candidate) => candidate.coordinate.q === position.q && candidate.coordinate.r === position.r,
  );
  const location: LocationRef = site
    ? { kind: 'AT', siteId: site.siteId, areaId: site.areas[0]!.areaId }
    : terrainLocation(input.region.version, position);
  const members = root.lifecycle.characters.filter(
    (character) => character.presence.fieldPartyId === party.partyId,
  );
  return applyFreeMovement(
    root,
    party.partyId,
    members,
    location,
    input.segmentId,
    input.trustedTick,
    execution,
  );
}

function positionOfLocation(
  location: Extract<LocationRef, { readonly kind: 'AT' | 'TERRAIN' }>,
  region: WorldRegion,
): WorldHexPosition | undefined {
  if (location.kind === 'TERRAIN') {
    const q = Number(location.q);
    const r = Number(location.r);
    return Number.isSafeInteger(q) && Number.isSafeInteger(r) ? { q, r } : undefined;
  }
  const site = region.sites.find((candidate) => candidate.siteId === location.siteId);
  return site ? site.coordinate : undefined;
}

function sameHex(left: WorldHexPosition | undefined, right: WorldHexPosition): boolean {
  return left?.q === right.q && left.r === right.r;
}

export function applyFreeMovement<Execution>(
  root: MaterializedCompanyState,
  partyId: string,
  members: MaterializedCompanyState['lifecycle']['characters'],
  location: LocationRef,
  sourceEventId: string,
  atTick: CampaignTick,
  execution: Execution,
): {
  readonly root: MaterializedCompanyState;
  readonly execution: Execution;
  readonly observationEvents: readonly LifecycleEvent[];
} {
  const lifecycle = {
    ...root.lifecycle,
    parties: root.lifecycle.parties.map((party) =>
      party.partyId === partyId ? { ...party, location } : party,
    ),
    characters: root.lifecycle.characters.map((character) =>
      character.presence.fieldPartyId === partyId
        ? { ...character, presence: { ...character.presence, location } }
        : character,
    ),
  };
  const observed = observePartyMovement(lifecycle, {
    partyId,
    characterIds: members.map((member) => member.identity.characterId),
    sourceEventId,
    atTick,
  });
  const next = {
    ...root,
    lifecycle: {
      ...observed.state,
      revision: canonicalRevision((BigInt(root.lifecycle.revision) + 1n).toString()),
    },
    physical: followCarrierLocations(root.lifecycle, lifecycle, root.physical),
  };
  validatePhysicalState(next);
  return Object.freeze({ root: next, execution, observationEvents: observed.events });
}

function hexKey(position: WorldHexPosition): string {
  return `${position.q},${position.r}`;
}

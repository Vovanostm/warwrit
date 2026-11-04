import {
  PAINTED_ATLAS_SITES,
  paintedAtlasNearbySite,
  positionAt,
  readContinuousMovementPlan,
  canonicalJson,
  sightHasCell,
  worldSightCells,
  worldSightIndex,
  type ContinuousMovementPlan,
  type PaintedAtlasSite,
  type PointMicroFp,
} from '@warwrit/game-core';
import type { WorldFreeMovementV2ResponseDto } from '@warwrit/protocol';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import type { WorldClockReading } from '../world/clock.js';
import { readPartyRoute } from '../world/repository.js';
import {
  cartographyIdentity,
  knownSiteSnapshot,
  navigationField,
  sightField,
  worldSightConditionBoundaries,
  worldSightConditionsAt,
} from './cartography-field.js';
import {
  readCompanyCartography,
  recordCompanyExploration,
  type CartographyCursor,
  type CompanyPlaceObservation,
  type StoredCompanyCartography,
} from './cartography-store.js';
import type { WorldLabFixture } from './model.js';

const WEATHER_CYCLE_MS = 2_700_000;
const MAX_ROUTE_SAMPLES = 100_000;
const fpPoint = (point: PointMicroFp) => ({
  xFp: Number(point.xMicroFp) / 65_536,
  zFp: Number(point.zMicroFp) / 65_536,
});

/** Samples every saved speed-span turn and at most half a sight cell of travel. */
export function routeExplorationSampleTimes(
  plan: ContinuousMovementPlan,
  fromMs: number,
  toMs: number,
  cellSizeFp: number,
): number[] {
  const times = new Set<number>([fromMs, toMs]);
  const startedUs = BigInt(plan.startedAtMs) * 1000n;
  for (const span of plan.speedSpans) {
    const startUs = startedUs + BigInt(span.startOffsetUs);
    const endUs = startedUs + BigInt(span.endOffsetUs);
    if (Number(endUs / 1000n) < fromMs || Number(startUs / 1000n) > toMs) continue;
    const distanceFp =
      Math.hypot(
        Number(span.to.xMicroFp) - Number(span.from.xMicroFp),
        Number(span.to.zMicroFp) - Number(span.from.zMicroFp),
      ) / 65_536;
    const steps = Math.max(1, Math.ceil(distanceFp / (cellSizeFp / 2)));
    if (steps + times.size > MAX_ROUTE_SAMPLES)
      throw new RangeError('Saved route exceeds bounded exploration work');
    for (let step = 0; step <= steps; step += 1) {
      const at = Number(
        (startUs + ((endUs - startUs) * BigInt(step)) / BigInt(steps) + 999n) / 1000n,
      );
      if (at >= fromMs && at <= toMs) times.add(at);
    }
  }
  return [...times].sort((left, right) => left - right);
}

function stationaryTimes(epochMs: string, fromMs: number, toMs: number): number[] {
  if (fromMs > toMs) return [];
  // At one fixed point, a complete immutable weather/light cycle covers all
  // possible sight conditions. Keep the genuine first observation time too.
  return [
    fromMs,
    ...worldSightConditionBoundaries(
      epochMs,
      String(Math.max(fromMs, toMs - WEATHER_CYCLE_MS)),
      String(toMs),
    ).map(Number),
    toMs,
  ];
}

interface ExplorationSample {
  readonly at: number;
  readonly point: PointMicroFp;
}

interface StoredExplorationRoute {
  readonly kind?: string;
  readonly status?: string;
  readonly lastBoundaryMs?: string;
  readonly execution?: { readonly plan?: unknown };
}

function explorationIsDue(
  cursor: CartographyCursor | null,
  movement: WorldFreeMovementV2ResponseDto,
  clock: WorldClockReading,
): boolean {
  const nowMs = Number(clock.nowMs);
  if (cursor && Number(cursor.exploredThroughMs) > nowMs)
    throw new RangeError('Exploration cannot move backwards in world time');
  if (cursor?.exploredThroughMs === clock.nowMs && cursor.movementEpoch === movement.movementEpoch)
    return false;
  if (
    cursor &&
    movement.mode !== 'MOVING' &&
    cursor.movementEpoch === movement.movementEpoch &&
    cursor.lastXQ === movement.point.xMicroFp &&
    cursor.lastZQ === movement.point.zMicroFp &&
    nowMs - Number(cursor.exploredThroughMs) < 60_000 &&
    worldSightConditionBoundaries(clock.epochMs, cursor.exploredThroughMs, clock.nowMs).length === 0
  )
    return false;
  return true;
}

function traversedRouteSamples(
  plan: ContinuousMovementPlan,
  epochMs: string,
  fromMs: number,
  toMs: number,
): ExplorationSample[] {
  if (fromMs > toMs) return [];
  const times = routeExplorationSampleTimes(plan, fromMs, toMs, sightField.cellSizeFp);
  times.push(...worldSightConditionBoundaries(epochMs, String(fromMs), String(toMs)).map(Number));
  return times.map((at) => ({ at, point: positionAt(plan, String(at)) }));
}

function collectExplorationSamples(
  stored: StoredExplorationRoute | undefined,
  cursor: CartographyCursor | null,
  movement: WorldFreeMovementV2ResponseDto,
  clock: WorldClockReading,
): ExplorationSample[] {
  const nowMs = Number(clock.nowMs);
  const plan =
    stored?.kind === 'CONTINUOUS_MOVEMENT'
      ? readContinuousMovementPlan(stored.execution?.plan)
      : undefined;
  if (plan && plan.mapEdition !== navigationField.region.mapEdition)
    throw new TypeError('Saved exploration route belongs to another map edition');
  const fromMs = Number(cursor?.exploredThroughMs ?? plan?.startedAtMs ?? clock.nowMs);
  const samples: ExplorationSample[] = [];
  const stationary = (from: number, to: number, point: PointMicroFp) => {
    for (const at of stationaryTimes(clock.epochMs, from, to)) samples.push({ at, point });
  };
  if (plan) {
    const startMs = Number(plan.startedAtMs);
    const endMs = Math.min(
      nowMs,
      Number(plan.arrivesAtMs),
      stored?.status === 'STOPPED' ? Number(stored.lastBoundaryMs) : nowMs,
    );
    if (!Number.isSafeInteger(endMs)) throw new TypeError('Stopped route has no trusted boundary');
    if (fromMs < startMs) stationary(fromMs, Math.min(startMs, nowMs), plan.from);
    const travelFromMs = Math.max(fromMs, startMs);
    samples.push(...traversedRouteSamples(plan, clock.epochMs, travelFromMs, endMs));
    if (nowMs > endMs) stationary(Math.max(fromMs, endMs), nowMs, movement.point);
  } else {
    stationary(fromMs, nowMs, movement.point);
  }
  return samples.sort((left, right) => left.at - right.at);
}

function sampleVisibility(
  sample: ExplorationSample,
  epochMs: string,
  sightCache: Map<string, Uint8Array>,
): Uint8Array {
  const point = fpPoint(sample.point);
  const conditions = worldSightConditionsAt(epochMs, String(sample.at));
  const key = `${worldSightIndex(sightField, point)}:${conditions.time}:${conditions.weather}`;
  const cached = sightCache.get(key);
  if (cached) return cached;
  const visible = worldSightCells(sightField, point, conditions);
  if (sightCache.size >= 128) sightCache.delete(sightCache.keys().next().value!);
  sightCache.set(key, visible);
  return visible;
}

function placeSighting(
  site: PaintedAtlasSite,
  prior: CompanyPlaceObservation | undefined,
  sample: ExplorationSample,
  fixture: Pick<WorldLabFixture, 'companyId' | 'partyId'>,
  movementEpoch: string,
): CompanyPlaceObservation | undefined {
  const snapshot = knownSiteSnapshot(site);
  const changed = !prior || canonicalJson(prior.knownSnapshot) !== canonicalJson(snapshot);
  const earlierDiscovery = prior && sample.at < prior.firstDiscoveredAt.getTime();
  if (prior && !changed && !earlierDiscovery && sample.at - prior.lastObservedAt.getTime() < 60_000)
    return undefined;
  const at = new Date(sample.at);
  return {
    siteId: site.siteId,
    firstDiscoveredAt: earlierDiscovery || !prior ? at : prior.firstDiscoveredAt,
    lastObservedAt: prior && prior.lastObservedAt > at ? prior.lastObservedAt : at,
    firstVisitedAt: prior?.firstVisitedAt ?? null,
    lastVisitedAt: prior?.lastVisitedAt ?? null,
    knownSnapshot: snapshot,
    sourceKind: 'SIGHTING',
    sourceRef: `sight:${fixture.partyId}:${movementEpoch}:${sample.at}`,
  };
}

function accumulateExploration(
  samples: readonly ExplorationSample[],
  saved: StoredCompanyCartography,
  fixture: Pick<WorldLabFixture, 'companyId' | 'partyId'>,
  movementEpoch: string,
  epochMs: string,
) {
  const explored = new Uint8Array(saved.exploredBits.length);
  const places = new Map<string, CompanyPlaceObservation>();
  const knownPlaces = new Map(saved.places.map((place) => [place.siteId, place]));
  const sightCache = new Map<string, Uint8Array>();
  for (const sample of samples) {
    const visible = sampleVisibility(sample, epochMs, sightCache);
    for (let index = 0; index < explored.length; index += 1)
      explored[index] = explored[index]! | visible[index]!;
    const nearby = paintedAtlasNearbySite(navigationField, sample.point);
    for (const site of PAINTED_ATLAS_SITES) {
      const discoveredNearby = nearby?.siteId === site.siteId;
      if (!discoveredNearby && !sightHasCell(visible, worldSightIndex(sightField, site.anchorFp)))
        continue;
      const prior = places.get(site.siteId) ?? knownPlaces.get(site.siteId);
      const observation = placeSighting(site, prior, sample, fixture, movementEpoch);
      if (observation) places.set(site.siteId, observation);
    }
  }
  return { exploredBits: explored, places: [...places.values()] };
}

/** Caller holds the authoritative account/company/route/clock locks. */
export async function persistWorldLabExploration(
  transaction: Transaction<DatabaseSchema>,
  fixture: Pick<WorldLabFixture, 'companyId' | 'partyId'>,
  worldId: string,
  movement: WorldFreeMovementV2ResponseDto,
  clock: WorldClockReading,
): Promise<void> {
  const identity = cartographyIdentity(worldId, fixture.companyId);
  const saved = await readCompanyCartography(transaction, identity);
  if (!explorationIsDue(saved.cursor, movement, clock)) return;
  const row = await readPartyRoute(transaction, worldId, fixture.companyId, fixture.partyId);
  const samples = collectExplorationSamples(
    row?.accepted_route as StoredExplorationRoute | undefined,
    saved.cursor,
    movement,
    clock,
  );
  const observations = accumulateExploration(
    samples,
    saved,
    fixture,
    movement.movementEpoch,
    clock.epochMs,
  );
  await recordCompanyExploration(transaction, {
    ...identity,
    ...observations,
    cursor: {
      partyId: fixture.partyId,
      movementEpoch: movement.movementEpoch,
      exploredThroughMs: clock.nowMs,
      lastXQ: movement.point.xMicroFp,
      lastZQ: movement.point.zMicroFp,
    },
  });
}

/** Called only after authenticated, stopped, reachable-place validation in the same transaction. */
export async function recordWorldLabPlaceVisit(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  fixture: Pick<WorldLabFixture, 'companyId' | 'partyId'>,
  siteId: string,
  atMs: string,
): Promise<void> {
  const site = PAINTED_ATLAS_SITES.find((entry) => entry.siteId === siteId);
  if (!site) throw new RangeError('Unknown visited place');
  const identity = cartographyIdentity(worldId, fixture.companyId);
  const saved = await readCompanyCartography(transaction, identity);
  const prior = saved.places.find((entry) => entry.siteId === siteId);
  const at = new Date(Number(atMs));
  await recordCompanyExploration(transaction, {
    ...identity,
    exploredBits: new Uint8Array(saved.exploredBits.length),
    places: [
      {
        siteId,
        firstDiscoveredAt: prior && prior.firstDiscoveredAt < at ? prior.firstDiscoveredAt : at,
        lastObservedAt: prior && prior.lastObservedAt > at ? prior.lastObservedAt : at,
        firstVisitedAt: prior?.firstVisitedAt ?? at,
        lastVisitedAt: prior?.lastVisitedAt && prior.lastVisitedAt > at ? prior.lastVisitedAt : at,
        knownSnapshot: knownSiteSnapshot(site),
        sourceKind: 'VISIT',
        sourceRef: `visit:${fixture.partyId}:${siteId}:${atMs}`,
      },
    ],
  });
}

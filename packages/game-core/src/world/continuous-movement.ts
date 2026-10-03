import { compareCodeUnits } from '../primitives.js';

export const NAV_CELL_SIZE_FP = 64;
export const MICRO_FP_PER_FP = 65_536;
export const BASE_SPEED_FP_PER_SECOND = 24;
export const FREE_MOVEMENT_V2_PROFILE = 'free-terrain-continuous-v2' as const;
export const FREE_MOVEMENT_V3_PROFILE = 'free-terrain-continuous-v3' as const;
type SpeedProfileId = typeof FREE_MOVEMENT_V2_PROFILE | typeof FREE_MOVEMENT_V3_PROFILE;
export const MAX_NAV_CELLS = 49_152;
export const MAX_PATH_POINTS = 4_096;
export const MAX_SPEED_SPANS = 4_096;
const CLEARANCE_RADIUS_FP = 24;

export type TerrainId =
  'grassland' | 'forest' | 'hills' | 'marsh' | 'riverbank' | 'rock' | 'deep_water' | 'cliff';
export type OverlayId = 'road' | 'trail' | 'dirt_road' | 'paved_road' | 'bridge' | 'ford' | null;
export interface PointFp {
  readonly xFp: number;
  readonly zFp: number;
}
export interface PointMicroFp {
  readonly xMicroFp: string;
  readonly zMicroFp: string;
}
export interface NavigationRegion {
  readonly mapEdition: string;
  /** Omitted only by retained V2 navigation fixtures. Accepted schedules never use this default. */
  readonly speedProfileId?: SpeedProfileId;
  /** Scene units per canonical fp are scaled together for geography and movement. */
  readonly worldScale?: number;
  readonly origin: PointFp;
  readonly columns: number;
  readonly rows: number;
  readonly cellSizeFp: number;
  readonly boundary: readonly PointFp[];
  readonly terrainShapes: readonly {
    readonly shapeId: string;
    readonly terrainId: TerrainId;
    readonly paintPriority: number;
    readonly polygon: readonly PointFp[];
  }[];
  readonly overlayShapes: readonly {
    readonly shapeId: string;
    readonly overlayId: Exclude<OverlayId, null>;
    readonly polygon: readonly PointFp[];
  }[];
  readonly blockingShapes: readonly {
    readonly shapeId: string;
    readonly polygon: readonly PointFp[];
  }[];
  readonly dangerAreaShapes: readonly {
    readonly areaId: string;
    readonly polygon: readonly PointFp[];
  }[];
  readonly sites: readonly {
    readonly siteId: string;
    readonly anchorFp: PointFp;
    readonly areaId: string;
  }[];
}
export interface NavigationField {
  readonly region: NavigationRegion;
  readonly terrainIds: readonly TerrainId[];
  readonly overlays: readonly OverlayId[];
  readonly walkable: readonly boolean[];
  readonly dangerAreaIds: readonly (readonly string[])[];
}
export interface SpeedSpan {
  readonly from: PointMicroFp;
  readonly to: PointMicroFp;
  readonly terrainId: TerrainId;
  readonly overlayId: OverlayId;
  readonly speedPermille: number;
  readonly startOffsetUs: string;
  readonly endOffsetUs: string;
}
export interface ContinuousMovementPlan {
  readonly planVersion: 2;
  readonly planId: string;
  readonly mapEdition: string;
  readonly speedProfileId: SpeedProfileId;
  readonly movementEpoch: string;
  readonly from: PointMicroFp;
  readonly goal: PointMicroFp;
  readonly startedAtMs: string;
  readonly totalDurationUs: string;
  readonly arrivesAtMs: string;
  readonly path: readonly PointMicroFp[];
  readonly dangerAreaIds: readonly string[];
  readonly speedSpans: readonly SpeedSpan[];
}

type SpeedProfile = {
  readonly terrain: Readonly<Record<TerrainId, number>>;
  readonly overlays: Readonly<Partial<Record<Exclude<OverlayId, null>, number>>>;
};
const SPEED_PROFILES: Readonly<Record<SpeedProfileId, SpeedProfile>> = Object.freeze({
  [FREE_MOVEMENT_V2_PROFILE]: Object.freeze({
    terrain: Object.freeze({
      grassland: 1000,
      forest: 650,
      hills: 750,
      marsh: 450,
      riverbank: 850,
      rock: 550,
      deep_water: 0,
      cliff: 0,
    }),
    overlays: Object.freeze({ road: 1250, bridge: 1000, ford: 550 }),
  }),
  [FREE_MOVEMENT_V3_PROFILE]: Object.freeze({
    terrain: Object.freeze({
      grassland: 1000,
      forest: 600,
      hills: 800,
      marsh: 300,
      riverbank: 800,
      rock: 500,
      deep_water: 0,
      cliff: 0,
    }),
    overlays: Object.freeze({
      trail: 1400,
      dirt_road: 1800,
      paved_road: 2000,
      bridge: 1800,
      ford: 550,
    }),
  }),
});
const MAX_PROFILE_SPEED = Object.fromEntries(
  Object.entries(SPEED_PROFILES).map(([id, profile]) => [
    id,
    Math.max(...Object.values(profile.terrain), ...Object.values(profile.overlays)),
  ]),
) as Readonly<Record<SpeedProfileId, number>>;
/** Bridge precedence and fastest road selection are shared with the stationary terrain view. */
export function compareNavigationOverlays(
  left: string,
  right: string,
  speedProfileId: SpeedProfileId,
): number {
  if (left === right) return 0;
  if (left === 'bridge') return -1;
  if (right === 'bridge') return 1;
  const speeds = SPEED_PROFILES[speedProfileId].overlays;
  return (
    (speeds[right as Exclude<OverlayId, null>] ?? 0) -
    (speeds[left as Exclude<OverlayId, null>] ?? 0)
  );
}
const ROAD_OVERLAYS = new Set<OverlayId>(['road', 'trail', 'dirt_road', 'paved_road']);
function profileId(field: NavigationField): SpeedProfileId {
  return field.region.speedProfileId ?? FREE_MOVEMENT_V2_PROFILE;
}
function movementSpeed(field: NavigationField, terrainId: TerrainId, overlayId: OverlayId): number {
  const profile = SPEED_PROFILES[profileId(field)];
  return overlayId === null ? profile.terrain[terrainId] : (profile.overlays[overlayId] ?? 0);
}
const NEIGHBORS = Object.freeze([
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const);

export function buildNavigationField(region: NavigationRegion): NavigationField {
  const profile = SPEED_PROFILES[region.speedProfileId ?? FREE_MOVEMENT_V2_PROFILE];
  if (
    !profile ||
    region.overlayShapes.some((shape) => !Object.hasOwn(profile.overlays, shape.overlayId)) ||
    region.cellSizeFp !== NAV_CELL_SIZE_FP ||
    region.columns * region.rows > MAX_NAV_CELLS ||
    region.columns < 1 ||
    region.rows < 1 ||
    region.terrainShapes.length === 0
  )
    throw new RangeError('Invalid navigation edition');
  const terrainIds: TerrainId[] = [];
  const overlays: OverlayId[] = [];
  const walkable: boolean[] = [];
  const dangerAreaIds: string[][] = [];
  for (let row = 0; row < region.rows; row += 1) {
    for (let column = 0; column < region.columns; column += 1) {
      const point = {
        xFp: region.origin.xFp + (column + 0.5) * region.cellSizeFp,
        zFp: region.origin.zFp + (row + 0.5) * region.cellSizeFp,
      };
      const x1 = region.origin.xFp + column * region.cellSizeFp;
      const z1 = region.origin.zFp + row * region.cellSizeFp;
      const cell = {
        minX: x1,
        minZ: z1,
        maxX: x1 + region.cellSizeFp,
        maxZ: z1 + region.cellSizeFp,
      };
      const clearanceCell = {
        minX: cell.minX - CLEARANCE_RADIUS_FP,
        minZ: cell.minZ - CLEARANCE_RADIUS_FP,
        maxX: cell.maxX + CLEARANCE_RADIUS_FP,
        maxZ: cell.maxZ + CLEARANCE_RADIUS_FP,
      };
      const inside = rectWithinPolygon(cell, region.boundary);
      const terrain = region.terrainShapes
        .filter((shape) => inPolygon(point, shape.polygon))
        .toSorted(
          (left, right) =>
            left.paintPriority - right.paintPriority ||
            compareCodeUnits(left.shapeId, right.shapeId),
        )
        .at(-1);
      const overlayMatches = region.overlayShapes.filter((shape) =>
        inPolygon(point, shape.polygon),
      );
      if (
        new Set(overlayMatches.map((shape) => shape.overlayId)).size > 1 &&
        !overlayMatches.every(
          (shape) => ROAD_OVERLAYS.has(shape.overlayId) || shape.overlayId === 'bridge',
        )
      )
        throw new RangeError('Ambiguous navigation overlays');
      const overlay = overlayMatches.toSorted(
        (a, b) =>
          compareNavigationOverlays(
            a.overlayId,
            b.overlayId,
            region.speedProfileId ?? FREE_MOVEMENT_V2_PROFILE,
          ) || compareCodeUnits(a.shapeId, b.shapeId),
      )[0];
      const blocked = region.blockingShapes.some((shape) =>
        polygonIntersectsRect(shape.polygon, clearanceCell),
      );
      const terrainId = terrain?.terrainId ?? 'deep_water';
      const walk =
        inside &&
        terrain !== undefined &&
        !blocked &&
        terrainId !== 'cliff' &&
        (terrainId !== 'deep_water' ||
          overlay?.overlayId === 'bridge' ||
          overlay?.overlayId === 'ford');
      terrainIds.push(terrainId);
      overlays.push(overlay?.overlayId ?? null);
      walkable.push(walk);
      dangerAreaIds.push(
        region.dangerAreaShapes
          .filter((shape) => inPolygon(point, shape.polygon))
          .map((shape) => shape.areaId)
          .sort(),
      );
    }
  }
  return Object.freeze({
    region,
    terrainIds: Object.freeze(terrainIds),
    overlays: Object.freeze(overlays),
    walkable: Object.freeze(walkable),
    dangerAreaIds: Object.freeze(dangerAreaIds.map((ids) => Object.freeze(ids))),
  });
}

export function findTravelPath(
  field: NavigationField,
  start: PointFp,
  goal: PointFp,
): readonly PointFp[] | undefined {
  if (!pointValid(field, start) || !pointValid(field, goal)) return undefined;
  if (start.xFp === goal.xFp && start.zFp === goal.zFp) return Object.freeze([start]);
  const connectors = (point: PointFp) => {
    const column = Math.floor((point.xFp - field.region.origin.xFp) / NAV_CELL_SIZE_FP);
    const row = Math.floor((point.zFp - field.region.origin.zFp) / NAV_CELL_SIZE_FP);
    const result: number[] = [];
    for (let dr = -1; dr <= 1; dr += 1)
      for (let dc = -1; dc <= 1; dc += 1) {
        const c = column + dc;
        const r = row + dr;
        const index = nodeIndex(field, c, r);
        if (index >= 0 && field.walkable[index] && traceSegment(field, point, center(field, c, r)))
          result.push(index);
      }
    return result.sort((a, b) => a - b);
  };
  const startEdges = new Map<number, number>();
  for (const node of connectors(start)) {
    const edge = traceSegment(field, start, centerByIndex(field, node));
    if (edge) startEdges.set(node, edge.costUs);
  }
  const goalEdges = new Map<number, number>();
  for (const node of connectors(goal)) {
    const edge = traceSegment(field, centerByIndex(field, node), goal);
    if (edge) goalEdges.set(node, edge.costUs);
  }
  if (startEdges.size === 0 || goalEdges.size === 0) return undefined;

  const total = field.region.columns * field.region.rows;
  const cost = new Float64Array(total);
  cost.fill(Number.POSITIVE_INFINITY);
  const parent = new Int32Array(total);
  parent.fill(-1);
  const closed = new Uint8Array(total);
  const heap = new MinHeap();
  const estimates = new Float64Array(total);
  estimates.fill(-1);
  const estimate = (node: number) => {
    if (estimates[node]! < 0) estimates[node] = heuristic(field, node, goal);
    return estimates[node]!;
  };
  let bestCost = Number.POSITIVE_INFINITY;
  let bestPath: readonly PointFp[] | undefined;
  const direct = traceSegment(field, start, goal);
  if (direct) {
    bestCost = direct.costUs;
    bestPath = Object.freeze([start, goal]);
  }
  for (const [node, edgeCost] of startEdges) {
    cost[node] = edgeCost;
    parent[node] = -2;
    heap.push({ node, g: edgeCost, f: edgeCost + estimate(node) });
  }
  let expanded = 0;
  while (heap.size > 0) {
    const current = heap.pop()!;
    if (current.g !== cost[current.node]) continue;
    if (current.f >= bestCost) break;
    if (closed[current.node]) continue;
    closed[current.node] = 1;
    if (++expanded > MAX_NAV_CELLS) throw new RangeError('ROUTE_TOO_COMPLEX');
    const { column, row } = nodeCoords(field, current.node);
    const goalEdgeCost = goalEdges.get(current.node);
    if (goalEdgeCost !== undefined && current.g + goalEdgeCost < bestCost) {
      bestCost = current.g + goalEdgeCost;
      const reversed: number[] = [];
      for (let cursor = current.node; cursor >= 0; cursor = parent[cursor]!) reversed.push(cursor);
      bestPath = Object.freeze([
        start,
        ...reversed.reverse().map((index) => centerByIndex(field, index)),
        goal,
      ]);
    }
    for (const [dc, dr] of NEIGHBORS) {
      const next = nodeIndex(field, column + dc, row + dr);
      if (next < 0 || !field.walkable[next]) continue;
      const edgeCost = neighborCost(field, current.node, next, dc, dr);
      if (edgeCost === undefined) continue;
      const candidate = current.g + edgeCost;
      if (candidate < cost[next]! || (candidate === cost[next]! && current.node < parent[next]!)) {
        cost[next] = candidate;
        parent[next] = current.node;
        closed[next] = 0;
        heap.push({ node: next, g: candidate, f: candidate + estimate(next) });
      }
    }
  }
  if (!bestPath) return undefined;
  if (bestPath.length > MAX_PATH_POINTS) throw new RangeError('ROUTE_TOO_COMPLEX');
  return smoothPath(field, bestPath);
}

const CENTER_LENGTH_MICRO = BigInt(NAV_CELL_SIZE_FP * MICRO_FP_PER_FP);
const DIAGONAL_LENGTH_MICRO = integerSqrtCeil(2n * CENTER_LENGTH_MICRO * CENTER_LENGTH_MICRO);
const HALF_DIAGONAL_LENGTH_MICRO = integerSqrtCeil(2n * (CENTER_LENGTH_MICRO / 2n) ** 2n);
const STEP_DURATIONS: Readonly<Record<number, readonly number[]>> = Object.freeze(
  Object.fromEntries(
    [
      ...new Set(
        Object.values(SPEED_PROFILES).flatMap((profile) => [
          ...Object.values(profile.terrain),
          ...Object.values(profile.overlays),
        ]),
      ),
    ]
      .filter((speed) => speed > 0)
      .map((speed) => [
        speed,
        Object.freeze(
          [
            CENTER_LENGTH_MICRO,
            DIAGONAL_LENGTH_MICRO,
            CENTER_LENGTH_MICRO / 2n,
            HALF_DIAGONAL_LENGTH_MICRO,
          ].map((length) =>
            Number(
              ceilDiv(
                length * 1_000_000_000n,
                65_536n * BigInt(BASE_SPEED_FP_PER_SECOND) * BigInt(speed),
              ),
            ),
          ),
        ),
      ]),
  ),
);
function neighborCost(
  field: NavigationField,
  from: number,
  to: number,
  dc: number,
  dr: number,
): number | undefined {
  if (dc && dr) {
    const { column, row } = nodeCoords(field, from);
    if (
      !field.walkable[nodeIndex(field, column + dc, row)] ||
      !field.walkable[nodeIndex(field, column, row + dr)]
    )
      return undefined;
  }
  const aTerrain = field.terrainIds[from]!,
    bTerrain = field.terrainIds[to]!,
    aOverlay = field.overlays[from]!,
    bOverlay = field.overlays[to]!;
  const aSpeed = movementSpeed(field, aTerrain, aOverlay),
    bSpeed = movementSpeed(field, bTerrain, bOverlay);
  const diagonal = dc !== 0 && dr !== 0;
  return aTerrain === bTerrain && aOverlay === bOverlay
    ? STEP_DURATIONS[aSpeed]![diagonal ? 1 : 0]!
    : STEP_DURATIONS[aSpeed]![diagonal ? 3 : 2]! + STEP_DURATIONS[bSpeed]![diagonal ? 3 : 2]!;
}

export function compileMovementPlan(input: {
  readonly field: NavigationField;
  readonly path: readonly PointFp[];
  readonly movementEpoch: string;
  readonly startedAtMs: string;
  readonly planId: string;
}): ContinuousMovementPlan {
  if (
    !/^(0|[1-9]\d{0,18})$/.test(input.movementEpoch) ||
    !/^\d{1,16}$/.test(input.startedAtMs) ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(input.planId) ||
    input.path.length < 2
  )
    throw new RangeError('Invalid movement plan boundary');
  const routeSpans: SpeedSpan[] = [];
  let routeSpanStart: PointFp | undefined;
  const danger = new Set<string>();
  for (let i = 1; i < input.path.length; i += 1) {
    const traced = traceSegment(input.field, input.path[i - 1]!, input.path[i]!);
    if (!traced) throw new RangeError('NO_PATH');
    for (const area of traced.dangerAreaIds) danger.add(area);
    for (const span of traced.spans) {
      const previous = routeSpans.at(-1);
      if (
        previous &&
        previous.to.xMicroFp === span.from.xMicroFp &&
        previous.to.zMicroFp === span.from.zMicroFp &&
        previous.terrainId === span.terrainId &&
        previous.overlayId === span.overlayId &&
        previous.speedPermille === span.speedPermille &&
        routeSpanStart &&
        collinearFp(routeSpanStart, input.path[i - 1]!, input.path[i]!)
      ) {
        routeSpans[routeSpans.length - 1] = { ...previous, to: span.to };
      } else {
        routeSpans.push(span);
        routeSpanStart = input.path[i - 1]!;
      }
      if (routeSpans.length > MAX_SPEED_SPANS) throw new RangeError('ROUTE_TOO_COMPLEX');
    }
  }
  const speedSpans: SpeedSpan[] = [];
  let offset = 0n;
  for (const span of routeSpans) {
    const dx = BigInt(span.to.xMicroFp) - BigInt(span.from.xMicroFp);
    const dz = BigInt(span.to.zMicroFp) - BigInt(span.from.zMicroFp);
    const length = integerSqrtCeil(dx * dx + dz * dz);
    const duration = ceilDiv(
      length * 1_000_000_000n,
      65_536n * BigInt(BASE_SPEED_FP_PER_SECOND) * BigInt(span.speedPermille),
    );
    speedSpans.push(
      Object.freeze({
        ...span,
        startOffsetUs: offset.toString(),
        endOffsetUs: (offset + duration).toString(),
      }),
    );
    offset += duration;
  }
  if (offset <= 0n) throw new RangeError('ZERO_LENGTH_PLAN');
  const startedAtMs = BigInt(input.startedAtMs);
  const arrivesAtMs = ceilDiv(startedAtMs * 1000n + offset, 1000n);
  return Object.freeze({
    planVersion: 2,
    planId: input.planId,
    mapEdition: input.field.region.mapEdition,
    speedProfileId: profileId(input.field),
    movementEpoch: input.movementEpoch,
    from: toMicro(input.path[0]!),
    goal: toMicro(input.path.at(-1)!),
    startedAtMs: input.startedAtMs,
    totalDurationUs: offset.toString(),
    arrivesAtMs: arrivesAtMs.toString(),
    path: Object.freeze(input.path.map(toMicro)),
    dangerAreaIds: Object.freeze([...danger].sort()),
    speedSpans: Object.freeze(speedSpans),
  });
}

/** Read a frozen persisted schedule without rebuilding it under a later map. */
export function readContinuousMovementPlan(value: unknown): ContinuousMovementPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RangeError('Invalid saved movement plan');
  const p = value as ContinuousMovementPlan;
  const decimal = (n: unknown): n is string =>
    typeof n === 'string' && /^(0|[1-9]\d{0,15})$/.test(n);
  const point = (v: unknown): v is PointMicroFp => {
    if (!v || typeof v !== 'object') return false;
    const q = v as PointMicroFp;
    return [q.xMicroFp, q.zMicroFp].every(
      (n) =>
        typeof n === 'string' &&
        /^(0|-?[1-9]\d{0,11})$/.test(n) &&
        BigInt(n) >= -536870912n &&
        BigInt(n) <= 536870912n,
    );
  };
  const equal = (a: PointMicroFp, b: PointMicroFp) =>
    a.xMicroFp === b.xMicroFp && a.zMicroFp === b.zMicroFp;
  if (
    p.planVersion !== 2 ||
    (p.speedProfileId !== FREE_MOVEMENT_V2_PROFILE &&
      p.speedProfileId !== FREE_MOVEMENT_V3_PROFILE) ||
    typeof p.mapEdition !== 'string' ||
    !p.mapEdition ||
    !decimal(p.movementEpoch) ||
    !decimal(p.startedAtMs) ||
    !decimal(p.arrivesAtMs) ||
    !decimal(p.totalDurationUs) ||
    BigInt(p.totalDurationUs) <= 0n ||
    !point(p.from) ||
    !point(p.goal) ||
    typeof p.planId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(p.planId) ||
    !Array.isArray(p.path) ||
    p.path.length < 2 ||
    p.path.length > MAX_PATH_POINTS ||
    !p.path.every(point) ||
    !equal(p.path[0]!, p.from) ||
    !equal(p.path.at(-1)!, p.goal) ||
    !Array.isArray(p.dangerAreaIds) ||
    p.dangerAreaIds.some((n) => typeof n !== 'string' || n.length > 64) ||
    !Array.isArray(p.speedSpans) ||
    !p.speedSpans.length ||
    p.speedSpans.length > MAX_SPEED_SPANS
  )
    throw new RangeError('Invalid saved movement plan');
  const profile = SPEED_PROFILES[p.speedProfileId];
  let end = '0',
    last = p.from;
  for (const span of p.speedSpans as readonly SpeedSpan[]) {
    if (
      !span ||
      !point(span.from) ||
      !point(span.to) ||
      !equal(last, span.from) ||
      equal(span.from, span.to) ||
      !decimal(span.startOffsetUs) ||
      !decimal(span.endOffsetUs) ||
      span.startOffsetUs !== end ||
      BigInt(span.endOffsetUs) <= BigInt(end) ||
      !Object.hasOwn(profile.terrain, span.terrainId) ||
      (span.overlayId !== null && !Object.hasOwn(profile.overlays, span.overlayId)) ||
      span.speedPermille <= 0 ||
      span.speedPermille !==
        (span.overlayId ? profile.overlays[span.overlayId] : profile.terrain[span.terrainId])
    )
      throw new RangeError('Invalid saved movement plan');
    end = span.endOffsetUs;
    last = span.to;
  }
  if (
    end !== p.totalDurationUs ||
    !equal(last, p.goal) ||
    BigInt(p.arrivesAtMs) !== BigInt(p.startedAtMs) + ceilDiv(BigInt(p.totalDurationUs), 1000n)
  )
    throw new RangeError('Invalid saved movement plan');
  return p;
}

export function positionAt(plan: ContinuousMovementPlan, trustedTimeMs: string): PointMicroFp {
  if (!/^\d{1,16}$/.test(trustedTimeMs) || BigInt(trustedTimeMs) < BigInt(plan.startedAtMs))
    throw new RangeError('TRUSTED_TIME_UNAVAILABLE');
  const elapsed = BigInt(trustedTimeMs) * 1000n - BigInt(plan.startedAtMs) * 1000n;
  const total = BigInt(plan.totalDurationUs);
  if (elapsed >= total) return plan.goal;
  let low = 0;
  let high = plan.speedSpans.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (BigInt(plan.speedSpans[mid]!.endOffsetUs) <= elapsed) low = mid + 1;
    else high = mid;
  }
  const span = plan.speedSpans[low];
  if (!span) return plan.goal;
  const start = BigInt(span.startOffsetUs);
  const duration = BigInt(span.endOffsetUs) - start;
  const at = elapsed - start;
  return Object.freeze({
    xMicroFp: interpolate(
      BigInt(span.from.xMicroFp),
      BigInt(span.to.xMicroFp),
      at,
      duration,
    ).toString(),
    zMicroFp: interpolate(
      BigInt(span.from.zMicroFp),
      BigInt(span.to.zMicroFp),
      at,
      duration,
    ).toString(),
  });
}

function traceSegment(
  field: NavigationField,
  from: PointFp,
  to: PointFp,
):
  | {
      readonly costUs: number;
      readonly spans: readonly SpeedSpan[];
      readonly dangerAreaIds: readonly string[];
    }
  | undefined {
  if (!pointValid(field, from) || !pointValid(field, to)) return undefined;
  const start = toMicro(from);
  const finish = toMicro(to);
  const x0 = BigInt(start.xMicroFp),
    z0 = BigInt(start.zMicroFp);
  const x1 = BigInt(finish.xMicroFp),
    z1 = BigInt(finish.zMicroFp);
  const dx = x1 - x0,
    dz = z1 - z0;
  if (dx === 0n && dz === 0n) return { costUs: 0, spans: [], dangerAreaIds: [] };
  const xOrigin = BigInt(field.region.origin.xFp) * BigInt(MICRO_FP_PER_FP);
  const zOrigin = BigInt(field.region.origin.zFp) * BigInt(MICRO_FP_PER_FP);
  const cell = BigInt(field.region.cellSizeFp) * BigInt(MICRO_FP_PER_FP);
  const crossings = new Map<
    string,
    { n: bigint; d: bigint; xBoundary?: bigint; zBoundary?: bigint }
  >();
  const addCrossing = (
    boundary: bigint,
    startFp: bigint,
    delta: bigint,
    axis: 'xBoundary' | 'zBoundary',
  ) => {
    if (delta === 0n) return;
    let n = boundary - startFp,
      d = delta;
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    if (n <= 0n || n >= d) return;
    const divisor = gcd(n, d);
    n /= divisor;
    d /= divisor;
    const key = `${n}/${d}`;
    const event = crossings.get(key) ?? { n, d };
    event[axis] = boundary;
    crossings.set(key, event);
  };
  for (
    let column = Math.max(0, Number(((x0 < x1 ? x0 : x1) - xOrigin) / cell));
    column <= Math.min(field.region.columns, Number(((x0 > x1 ? x0 : x1) - xOrigin) / cell) + 1);
    column += 1
  )
    addCrossing(xOrigin + BigInt(column) * cell, x0, dx, 'xBoundary');
  for (
    let row = Math.max(0, Number(((z0 < z1 ? z0 : z1) - zOrigin) / cell));
    row <= Math.min(field.region.rows, Number(((z0 > z1 ? z0 : z1) - zOrigin) / cell) + 1);
    row += 1
  )
    addCrossing(zOrigin + BigInt(row) * cell, z0, dz, 'zBoundary');
  const events = [...crossings.values()].sort(compareFraction);
  const times = [{ n: 0n, d: 1n }, ...events, { n: 1n, d: 1n }];
  const danger = new Set<string>();
  const spans: SpeedSpan[] = [];
  const visit = (indices: readonly number[]) => {
    if (indices.length === 0 || indices.some((index) => index < 0 || !field.walkable[index]))
      return undefined;
    const ordered = [...new Set(indices)].sort((a, b) => a - b);
    const selected = ordered.map((index) => {
      const terrainId = field.terrainIds[index]!;
      const overlayId = field.overlays[index]!;
      for (const area of field.dangerAreaIds[index]!) danger.add(area);
      return {
        index,
        terrainId,
        overlayId,
        speedPermille: movementSpeed(field, terrainId, overlayId),
      };
    });
    return selected[0];
  };
  if (!visit(cellsAtPoint(field, x0, z0))) return undefined;
  for (const event of events) {
    const point = fractionPoint(x0, z0, dx, dz, event);
    if (!visit(cellsAtCrossing(field, point.x, point.z, event, xOrigin, zOrigin, cell)))
      return undefined;
  }
  if (!visit(cellsAtPoint(field, x1, z1))) return undefined;
  for (let index = 0; index + 1 < times.length; index += 1) {
    const fromTime = times[index]!;
    const toTime = times[index + 1]!;
    const midpoint = averageFraction(fromTime, toTime);
    const point = fractionPoint(x0, z0, dx, dz, midpoint);
    const touched = cellsAlongInterval(field, point.x, point.z, dx, dz, xOrigin, zOrigin, cell);
    const selected = visit(touched);
    if (!selected || selected.speedPermille <= 0) return undefined;
    const fromPoint = fractionPoint(x0, z0, dx, dz, fromTime);
    const toPoint = fractionPoint(x0, z0, dx, dz, toTime);
    const next: SpeedSpan = {
      from: microPoint(fromPoint.x, fromPoint.z),
      to: microPoint(toPoint.x, toPoint.z),
      terrainId: selected.terrainId,
      overlayId: selected.overlayId,
      speedPermille: selected.speedPermille,
      startOffsetUs: '0',
      endOffsetUs: '0',
    };
    const previous = spans.at(-1);
    if (
      previous &&
      previous.terrainId === next.terrainId &&
      previous.overlayId === next.overlayId &&
      previous.speedPermille === next.speedPermille
    )
      spans[spans.length - 1] = { ...previous, to: next.to };
    else spans.push(next);
  }
  let costUs = 0;
  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index]!;
    const dx = BigInt(span.to.xMicroFp) - BigInt(span.from.xMicroFp);
    const dz = BigInt(span.to.zMicroFp) - BigInt(span.from.zMicroFp);
    const length = integerSqrtCeil(dx * dx + dz * dz);
    const duration = ceilDiv(
      length * 1_000_000_000n,
      65_536n * BigInt(BASE_SPEED_FP_PER_SECOND) * BigInt(span.speedPermille),
    );
    costUs += Number(duration);
    spans[index] = { ...span, startOffsetUs: '0', endOffsetUs: duration.toString() };
  }
  return { costUs, spans, dangerAreaIds: [...danger].sort() };
}

function smoothPath(field: NavigationField, path: readonly PointFp[]): readonly PointFp[] {
  const out: PointFp[] = [path[0]!];
  const cumulative = [0];
  for (let i = 1; i < path.length; i++)
    cumulative.push(
      cumulative[i - 1]! +
        (traceSegment(field, path[i - 1]!, path[i]!)?.costUs ?? Number.MAX_SAFE_INTEGER),
    );
  let index = 0;
  while (index < path.length - 1) {
    let selected = index + 1;
    for (let candidate = path.length - 1; candidate > index + 1; candidate -= 1) {
      const direct = traceSegment(field, path[index]!, path[candidate]!);
      if (direct && direct.costUs <= cumulative[candidate]! - cumulative[index]!) {
        selected = candidate;
        break;
      }
    }
    out.push(path[selected]!);
    index = selected;
  }
  return Object.freeze(out);
}
function heuristic(field: NavigationField, node: number, goal: PointFp): number {
  const point = centerByIndex(field, node);
  const dx = BigInt(Math.round((point.xFp - goal.xFp) * MICRO_FP_PER_FP));
  const dz = BigInt(Math.round((point.zFp - goal.zFp) * MICRO_FP_PER_FP));
  const squared = dx * dx + dz * dz;
  const roundedDistance = integerSqrtCeil(squared);
  const distance =
    roundedDistance * roundedDistance === squared ? roundedDistance : roundedDistance - 1n;
  return Number(
    (distance * 1_000_000_000n) /
      (BigInt(MICRO_FP_PER_FP) *
        BigInt(BASE_SPEED_FP_PER_SECOND) *
        BigInt(MAX_PROFILE_SPEED[profileId(field)])),
  );
}
function pointValid(field: NavigationField, point: PointFp): boolean {
  const xMicro = point.xFp * MICRO_FP_PER_FP;
  const zMicro = point.zFp * MICRO_FP_PER_FP;
  if (!Number.isSafeInteger(xMicro) || !Number.isSafeInteger(zMicro)) return false;
  const index = cellAt(field, point);
  return index >= 0 && field.walkable[index] === true;
}
function cellAt(field: NavigationField, point: PointFp): number {
  const column = Math.floor((point.xFp - field.region.origin.xFp) / field.region.cellSizeFp);
  const row = Math.floor((point.zFp - field.region.origin.zFp) / field.region.cellSizeFp);
  return nodeIndex(field, column, row);
}
function nodeIndex(field: NavigationField, column: number, row: number): number {
  return column < 0 || row < 0 || column >= field.region.columns || row >= field.region.rows
    ? -1
    : row * field.region.columns + column;
}
type Fraction = {
  readonly n: bigint;
  readonly d: bigint;
  readonly xBoundary?: bigint;
  readonly zBoundary?: bigint;
};
function gcd(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) [left, right] = [right, left % right];
  return left || 1n;
}
function compareFraction(a: Fraction, b: Fraction): number {
  const difference = a.n * b.d - b.n * a.d;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
function averageFraction(a: Fraction, b: Fraction): Fraction {
  return { n: a.n * b.d + b.n * a.d, d: 2n * a.d * b.d };
}
function roundDiv(n: bigint, d: bigint): bigint {
  const negative = n < 0n;
  const magnitude = negative ? -n : n;
  const rounded = (magnitude * 2n + d) / (2n * d);
  return negative ? -rounded : rounded;
}
function floorDiv(n: bigint, d: bigint): bigint {
  const quotient = n / d;
  return n % d < 0n ? quotient - 1n : quotient;
}
function fractionPoint(
  x0: bigint,
  z0: bigint,
  dx: bigint,
  dz: bigint,
  t: Fraction,
): { x: bigint; z: bigint } {
  return {
    x: t.xBoundary ?? x0 + roundDiv(dx * t.n, t.d),
    z: t.zBoundary ?? z0 + roundDiv(dz * t.n, t.d),
  };
}
function microPoint(x: bigint, z: bigint): PointMicroFp {
  return Object.freeze({ xMicroFp: x.toString(), zMicroFp: z.toString() });
}
function pointCells(coordinate: bigint, origin: bigint, size: bigint, count: number): number[] {
  const offset = coordinate - origin;
  const lower = floorDiv(offset, size);
  const exact = offset === lower * size;
  const columns = exact ? [Number(lower - 1n), Number(lower)] : [Number(lower)];
  return columns.filter((value) => value >= 0 && value < count);
}
function cellsAtPoint(field: NavigationField, x: bigint, z: bigint): number[] {
  const cell = BigInt(field.region.cellSizeFp) * BigInt(MICRO_FP_PER_FP);
  const xOrigin = BigInt(field.region.origin.xFp) * BigInt(MICRO_FP_PER_FP);
  const zOrigin = BigInt(field.region.origin.zFp) * BigInt(MICRO_FP_PER_FP);
  const columns = pointCells(x, xOrigin, cell, field.region.columns);
  const rows = pointCells(z, zOrigin, cell, field.region.rows);
  const result: number[] = [];
  for (const row of rows) for (const column of columns) result.push(nodeIndex(field, column, row));
  if (columns.length === 0 || rows.length === 0) result.push(-1);
  return result;
}
function cellsAtCrossing(
  field: NavigationField,
  x: bigint,
  z: bigint,
  event: Fraction,
  xOrigin: bigint,
  zOrigin: bigint,
  cell: bigint,
): number[] {
  const columns =
    event.xBoundary === undefined && (x - xOrigin) % cell !== 0n
      ? [Number(floorDiv(x - xOrigin, cell))]
      : pointCells(event.xBoundary ?? x, xOrigin, cell, field.region.columns);
  const rows =
    event.zBoundary === undefined && (z - zOrigin) % cell !== 0n
      ? [Number(floorDiv(z - zOrigin, cell))]
      : pointCells(event.zBoundary ?? z, zOrigin, cell, field.region.rows);
  const result: number[] = [];
  for (const row of rows) for (const column of columns) result.push(nodeIndex(field, column, row));
  if (columns.length === 0 || rows.length === 0) result.push(-1);
  return result;
}
function cellsAlongInterval(
  field: NavigationField,
  x: bigint,
  z: bigint,
  dx: bigint,
  dz: bigint,
  xOrigin: bigint,
  zOrigin: bigint,
  cell: bigint,
): number[] {
  const columnOffset = x - xOrigin;
  const rowOffset = z - zOrigin;
  const columns =
    dx === 0n && columnOffset % cell === 0n
      ? pointCells(x, xOrigin, cell, field.region.columns)
      : [Number(floorDiv(columnOffset, cell))];
  const rows =
    dz === 0n && rowOffset % cell === 0n
      ? pointCells(z, zOrigin, cell, field.region.rows)
      : [Number(floorDiv(rowOffset, cell))];
  const result: number[] = [];
  for (const row of rows) for (const column of columns) result.push(nodeIndex(field, column, row));
  if (columns.length === 0 || rows.length === 0) result.push(-1);
  return result;
}
function nodeCoords(field: NavigationField, node: number): { column: number; row: number } {
  return { column: node % field.region.columns, row: Math.floor(node / field.region.columns) };
}
function center(field: NavigationField, column: number, row: number): PointFp {
  return {
    xFp: field.region.origin.xFp + column * NAV_CELL_SIZE_FP + NAV_CELL_SIZE_FP / 2,
    zFp: field.region.origin.zFp + row * NAV_CELL_SIZE_FP + NAV_CELL_SIZE_FP / 2,
  };
}
function centerByIndex(field: NavigationField, index: number): PointFp {
  const { column, row } = nodeCoords(field, index);
  return center(field, column, row);
}
function toMicro(point: PointFp): PointMicroFp {
  const x = point.xFp * MICRO_FP_PER_FP;
  const z = point.zFp * MICRO_FP_PER_FP;
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z))
    throw new RangeError('Invalid microFp point');
  return Object.freeze({ xMicroFp: String(x), zMicroFp: String(z) });
}
function integerSqrtCeil(value: bigint): bigint {
  if (value < 0n) throw new RangeError('Negative square root');
  if (value < 2n) return value;
  // A floating estimate is corrected using exact integers before it affects any cost.
  const estimate = Math.floor(Math.sqrt(Number(value)));
  if (Number.isSafeInteger(estimate)) {
    let floor = BigInt(estimate);
    while (floor * floor > value) floor--;
    while ((floor + 1n) * (floor + 1n) <= value) floor++;
    return floor * floor === value ? floor : floor + 1n;
  }
  let x = value;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + value / x) >> 1n;
  }
  return x * x === value ? x : x + 1n;
}
function ceilDiv(value: bigint, divisor: bigint): bigint {
  return (value + divisor - 1n) / divisor;
}
function interpolate(from: bigint, to: bigint, numerator: bigint, denominator: bigint): bigint {
  const product = (to - from) * numerator;
  const magnitude = product < 0n ? -product : product;
  const rounded = (magnitude * 2n + denominator) / (denominator * 2n);
  return from + (product < 0n ? -rounded : rounded);
}
function collinearFp(a: PointFp, b: PointFp, c: PointFp): boolean {
  return (b.xFp - a.xFp) * (c.zFp - a.zFp) === (b.zFp - a.zFp) * (c.xFp - a.xFp);
}
function inPolygon(point: PointFp, polygon: readonly PointFp[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (
      a.zFp > point.zFp !== b.zFp > point.zFp &&
      point.xFp < ((b.xFp - a.xFp) * (point.zFp - a.zFp)) / (b.zFp - a.zFp) + a.xFp
    )
      inside = !inside;
  }
  return inside;
}
type Rect = {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
};
function rectCorners(rect: Rect): readonly PointFp[] {
  return [
    { xFp: rect.minX, zFp: rect.minZ },
    { xFp: rect.maxX, zFp: rect.minZ },
    { xFp: rect.maxX, zFp: rect.maxZ },
    { xFp: rect.minX, zFp: rect.maxZ },
  ];
}
function withinRect(point: PointFp, rect: Rect): boolean {
  return (
    point.xFp >= rect.minX &&
    point.xFp <= rect.maxX &&
    point.zFp >= rect.minZ &&
    point.zFp <= rect.maxZ
  );
}
function pointOnSegment(point: PointFp, a: PointFp, b: PointFp): boolean {
  const cross = (point.xFp - a.xFp) * (b.zFp - a.zFp) - (point.zFp - a.zFp) * (b.xFp - a.xFp);
  return (
    cross === 0 &&
    point.xFp >= Math.min(a.xFp, b.xFp) &&
    point.xFp <= Math.max(a.xFp, b.xFp) &&
    point.zFp >= Math.min(a.zFp, b.zFp) &&
    point.zFp <= Math.max(a.zFp, b.zFp)
  );
}
function pointInPolygonOrEdge(point: PointFp, polygon: readonly PointFp[]): boolean {
  return (
    inPolygon(point, polygon) ||
    polygon.some((a, index) => pointOnSegment(point, a, polygon[(index + 1) % polygon.length]!))
  );
}
function orientation(a: PointFp, b: PointFp, c: PointFp): number {
  return Math.sign((b.xFp - a.xFp) * (c.zFp - a.zFp) - (b.zFp - a.zFp) * (c.xFp - a.xFp));
}
function segmentsIntersect(a: PointFp, b: PointFp, c: PointFp, d: PointFp): boolean {
  const o1 = orientation(a, b, c),
    o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a),
    o4 = orientation(c, d, b);
  return (
    (o1 !== o2 && o3 !== o4) ||
    pointOnSegment(a, c, d) ||
    pointOnSegment(b, c, d) ||
    pointOnSegment(c, a, b) ||
    pointOnSegment(d, a, b)
  );
}
function polygonIntersectsRect(polygon: readonly PointFp[], rect: Rect): boolean {
  const corners = rectCorners(rect);
  if (
    polygon.some((point) => withinRect(point, rect)) ||
    corners.some((point) => pointInPolygonOrEdge(point, polygon))
  )
    return true;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!,
      b = polygon[(index + 1) % polygon.length]!;
    for (let corner = 0; corner < corners.length; corner += 1)
      if (segmentsIntersect(a, b, corners[corner]!, corners[(corner + 1) % corners.length]!))
        return true;
  }
  return false;
}
function segmentCrossesRectInterior(a: PointFp, b: PointFp, rect: Rect): boolean {
  let start = 0;
  let end = 1;
  const dx = b.xFp - a.xFp;
  const dz = b.zFp - a.zFp;
  for (const [origin, delta, minimum, maximum] of [
    [a.xFp, dx, rect.minX, rect.maxX],
    [a.zFp, dz, rect.minZ, rect.maxZ],
  ] as const) {
    if (delta === 0) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const one = (minimum - origin) / delta;
    const two = (maximum - origin) / delta;
    start = Math.max(start, Math.min(one, two));
    end = Math.min(end, Math.max(one, two));
    if (start >= end) return false;
  }
  const middle = (start + end) / 2;
  const x = a.xFp + dx * middle;
  const z = a.zFp + dz * middle;
  return x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ;
}
function rectWithinPolygon(rect: Rect, polygon: readonly PointFp[]): boolean {
  const corners = rectCorners(rect);
  if (!corners.every((point) => pointInPolygonOrEdge(point, polygon))) return false;
  // A concave boundary can cut through the cell while still containing all four corners.
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!,
      b = polygon[(index + 1) % polygon.length]!;
    if (segmentCrossesRectInterior(a, b, rect)) return false;
  }
  return true;
}
class MinHeap {
  private readonly values: { node: number; g: number; f: number }[] = [];
  get size() {
    return this.values.length;
  }
  push(value: { node: number; g: number; f: number }) {
    this.values.push(value);
    let i = this.values.length - 1;
    while (i > 0) {
      const p = (i - 1) >>> 1;
      if (this.less(this.values[p]!, value)) break;
      this.values[i] = this.values[p]!;
      i = p;
    }
    this.values[i] = value;
  }
  pop() {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;
    let i = 0;
    while (true) {
      const l = i * 2 + 1,
        r = l + 1;
      if (l >= this.values.length) break;
      const c = r < this.values.length && this.less(this.values[r]!, this.values[l]!) ? r : l;
      if (this.less(last, this.values[c]!)) break;
      this.values[i] = this.values[c]!;
      i = c;
    }
    this.values[i] = last;
    return first;
  }
  private less(
    a: { node: number; f: number; g: number },
    b: { node: number; f: number; g: number },
  ) {
    return a.f < b.f || (a.f === b.f && (a.g < b.g || (a.g === b.g && a.node <= b.node)));
  }
}

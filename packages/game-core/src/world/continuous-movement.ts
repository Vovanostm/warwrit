import { compareCodeUnits } from '../primitives.js';
import {
  buildExactGeometry,
  exactPointValid,
  exactSurfaceAt,
  traceExactGeometry,
  exactIntervalLength,
  exactIntervalPoint,
  readRatio,
  ratio,
  compareRatio,
  type ExactGeometry,
  type StoredRatio,
  type SurfacePolicy,
} from './exact-navigation.js';

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

export type {
  TerrainId,
  OverlayId,
  PointFp,
  PointMicroFp,
  NavigationRegion,
} from './continuous-types.js';
import type {
  TerrainId,
  OverlayId,
  PointFp,
  PointMicroFp,
  NavigationRegion,
} from './continuous-types.js';

export interface NavigationField {
  readonly region: NavigationRegion;
  readonly terrainIds: readonly TerrainId[];
  readonly overlays: readonly OverlayId[];
  readonly walkable: readonly boolean[];
  readonly dangerAreaIds: readonly (readonly string[])[];
  readonly exactGeometry?: ExactGeometry;
  readonly exactSurfacePolicy?: SurfacePolicy;
  /** Derived search lattice only; polygon geometry and persisted plans keep their edition. */
  readonly searchGrid?: {
    readonly columns: number;
    readonly rows: number;
    readonly xStepFp: number;
    readonly zStepFp: number;
  };
  readonly roadEdgeDurations?: ReadonlyMap<string, number | undefined>;
  readonly gridEdgeDurations?: readonly number[];
  /** Sorted traversable neighbors compiled with the immutable grid-edge costs. */
  readonly gridNeighborNodes?: readonly (readonly number[])[];
  readonly gridNeighborDurations?: readonly (readonly number[])[];
  readonly roadPoints?: readonly PointFp[];
  readonly roadEdges?: ReadonlyMap<number, readonly number[]>;
}
export interface SpeedSpan {
  readonly from: PointMicroFp;
  readonly to: PointMicroFp;
  readonly terrainId: TerrainId;
  readonly overlayId: OverlayId;
  readonly speedPermille: number;
  readonly startOffsetUs: string;
  readonly endOffsetUs: string;
  readonly geometry?: {
    readonly segmentIndex: number;
    readonly fromT: StoredRatio;
    readonly toT: StoredRatio;
  };
}
export interface ContinuousMovementPlan {
  readonly planVersion: 2 | 3;
  readonly navigationVersion?: 'polygon-v1';
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
function assertCompatibleOverlays(matches: NavigationRegion['overlayShapes']): void {
  if (
    new Set(matches.map((s) => s.overlayId)).size > 1 &&
    !matches.every((s) => ROAD_OVERLAYS.has(s.overlayId) || s.overlayId === 'bridge')
  )
    throw new RangeError('Ambiguous navigation overlays');
}

function surfacePolicy(region: NavigationRegion): SurfacePolicy {
  const profile = SPEED_PROFILES[region.speedProfileId ?? FREE_MOVEMENT_V2_PROFILE];
  const terrainOrder = region.terrainShapes
    .map((_, i) => i)
    .sort(
      (a, b) =>
        region.terrainShapes[b]!.paintPriority - region.terrainShapes[a]!.paintPriority ||
        compareCodeUnits(region.terrainShapes[b]!.shapeId, region.terrainShapes[a]!.shapeId),
    );
  const overlayOrder = region.overlayShapes
    .map((_, i) => i)
    .sort(
      (a, b) =>
        compareNavigationOverlays(
          region.overlayShapes[a]!.overlayId,
          region.overlayShapes[b]!.overlayId,
          region.speedProfileId ?? FREE_MOVEMENT_V2_PROFILE,
        ) || compareCodeUnits(region.overlayShapes[a]!.shapeId, region.overlayShapes[b]!.shapeId),
    );
  return (terrainMatches, overlayMatches) => {
    const terrainIndex = terrainOrder.find((i) => terrainMatches.includes(i));
    const overlayIndex = overlayOrder.find((i) => overlayMatches.includes(i));
    const terrain = terrainIndex === undefined ? undefined : region.terrainShapes[terrainIndex];
    const overlay = overlayIndex === undefined ? undefined : region.overlayShapes[overlayIndex];
    assertCompatibleOverlays(overlayMatches.map((i) => region.overlayShapes[i]!));
    const terrainId = terrain?.terrainId ?? 'deep_water',
      overlayId = overlay?.overlayId ?? null;
    return {
      terrainId,
      overlayId,
      speedPermille:
        terrainId === 'cliff' ||
        (terrainId === 'deep_water' && overlayId !== 'bridge' && overlayId !== 'ford')
          ? 0
          : overlayId === null
            ? profile.terrain[terrainId]
            : (profile.overlays[overlayId] ?? 0),
    };
  };
}
/** Surface at the actual anchor, not the centre of its search bucket. */
export function continuousSurfaceAt(field: NavigationField, point: PointFp) {
  if (field.exactGeometry)
    return exactSurfaceAt(
      field.exactGeometry,
      point,
      field.exactSurfacePolicy ?? surfacePolicy(field.region),
    );
  const index = cellAt(field, point),
    terrainId = field.terrainIds[index] ?? 'deep_water',
    overlayId = field.overlays[index] ?? null;
  return { terrainId, overlayId, speedPermille: movementSpeed(field, terrainId, overlayId) };
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

function nearbyGridNodes(field: NavigationField, point: PointFp): number[] {
  const row = Math.floor(
    (point.zFp - field.region.origin.zFp) / (field.searchGrid?.zStepFp ?? NAV_CELL_SIZE_FP),
  );
  const column = Math.floor(
    (point.xFp - field.region.origin.xFp) / (field.searchGrid?.xStepFp ?? NAV_CELL_SIZE_FP),
  );
  const nodes: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const node = nodeIndex(field, column + dc, row + dr);
      if (node >= 0 && field.walkable[node]) nodes.push(node);
    }
  return nodes;
}
function validateNavigationEdition(region: NavigationRegion): void {
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
}

function legacyCellWalkable(
  inside: boolean,
  terrain: TerrainId | undefined,
  blocked: boolean,
  overlay: OverlayId | undefined,
): boolean {
  return (
    inside &&
    terrain !== undefined &&
    !blocked &&
    terrain !== 'cliff' &&
    (terrain !== 'deep_water' || overlay === 'bridge' || overlay === 'ford')
  );
}

function sampleNavigationCell(
  region: NavigationRegion,
  point: PointFp,
  column: number,
  row: number,
) {
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
        left.paintPriority - right.paintPriority || compareCodeUnits(left.shapeId, right.shapeId),
    )
    .at(-1);
  const overlayMatches = region.overlayShapes.filter((shape) => inPolygon(point, shape.polygon));
  assertCompatibleOverlays(overlayMatches);
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
  const walk = legacyCellWalkable(inside, terrain?.terrainId, blocked, overlay?.overlayId);
  return { terrainId, overlayId: overlay?.overlayId ?? null, walk };
}

function navigationSearchGrid(region: NavigationRegion, searchTopology: 'square' | 'hex') {
  if (searchTopology === 'hex' && region.navigationVersion !== 'polygon-v1')
    throw new RangeError('Hex search requires exact polygon geometry');
  // Near-equilateral six-neighbor lattice, quantized to microFp. About the same
  // node density as 64fp squares; region buckets remain square for exact geometry.
  const xStepFp = 70;
  const zStepFp = Math.round(((xStepFp * Math.sqrt(3)) / 2) * MICRO_FP_PER_FP) / MICRO_FP_PER_FP;
  const searchGrid =
    searchTopology === 'hex'
      ? Object.freeze({
          columns: Math.ceil((region.columns * region.cellSizeFp) / xStepFp),
          rows: Math.ceil((region.rows * region.cellSizeFp) / zStepFp),
          xStepFp,
          zStepFp,
        })
      : undefined;
  if (searchGrid && searchGrid.columns * searchGrid.rows > MAX_NAV_CELLS)
    throw new RangeError('ROUTE_TOO_COMPLEX');
  return searchGrid;
}

export function buildNavigationField(
  region: NavigationRegion,
  searchTopology: 'square' | 'hex' = region.navigationVersion === 'polygon-v1' ? 'hex' : 'square',
): NavigationField {
  validateNavigationEdition(region);
  const exactGeometry =
    region.navigationVersion === 'polygon-v1' ? buildExactGeometry(region) : undefined;
  const searchGrid = navigationSearchGrid(region, searchTopology);
  const policy = surfacePolicy(region);
  const layout = { region, ...(searchGrid ? { searchGrid } : {}) };
  const terrainIds: TerrainId[] = [];
  const overlays: OverlayId[] = [];
  const walkable: boolean[] = [];
  const dangerAreaIds: string[][] = [];
  for (let row = 0; row < (searchGrid?.rows ?? region.rows); row += 1) {
    for (let column = 0; column < (searchGrid?.columns ?? region.columns); column += 1) {
      const point = center(layout, column, row);
      const { terrainId, overlayId, walk } = sampleNavigationCell(region, point, column, row);
      terrainIds.push(terrainId);
      overlays.push(overlayId);
      walkable.push(
        exactGeometry
          ? point.xFp < region.origin.xFp + region.columns * region.cellSizeFp &&
              point.zFp < region.origin.zFp + region.rows * region.cellSizeFp &&
              exactPointValid(exactGeometry, point, policy)
          : walk,
      );
      dangerAreaIds.push(
        region.dangerAreaShapes
          .filter((shape) => inPolygon(point, shape.polygon))
          .map((shape) => shape.areaId)
          .sort(),
      );
    }
  }
  const field = {
    region,
    terrainIds: Object.freeze(terrainIds),
    overlays: Object.freeze(overlays),
    walkable: Object.freeze(walkable),
    dangerAreaIds: Object.freeze(dangerAreaIds.map((ids) => Object.freeze(ids))),
    ...(exactGeometry ? { exactGeometry, exactSurfacePolicy: policy } : {}),
    ...(searchGrid ? { searchGrid } : {}),
  };
  if (!exactGeometry) return Object.freeze(field);
  return compileExactRoadGraph(field, exactGeometry);
}

function compileExactGridEdges(field: NavigationField): readonly number[] {
  const count = gridCount(field);
  const gridEdgeDurations = Array<number>(count * 4).fill(-1);
  for (let node = 0; node < count; node++) {
    if (!field.walkable[node]) continue;
    const { column, row } = nodeCoords(field, node);
    for (const [dc, dr] of gridNeighbors(field, row).filter(
      ([dc, dr]) => dr > 0 || (dr === 0 && dc > 0),
    )) {
      const next = nodeIndex(field, column + dc, row + dr);
      if (next < 0 || !field.walkable[next]) continue;
      const duration = traceSegment(
        field,
        centerByIndex(field, node),
        centerByIndex(field, next),
      )?.costUs;
      gridEdgeDurations[node * 4 + gridEdgeSlot(field, node, next)] = duration ?? -1;
    }
  }
  return Object.freeze(gridEdgeDurations);
}

function compileGridNeighbors(field: NavigationField, gridEdgeDurations: readonly number[]) {
  const count = gridCount(field);
  const gridNeighborNodes: number[][] = Array.from({ length: count }, () => []);
  for (let node = 0; node < count; node++) {
    const { column, row } = nodeCoords(field, node);
    for (const [dc, dr] of gridNeighbors(field, row)) {
      const next = nodeIndex(field, column + dc, row + dr);
      if (next < 0) continue;
      const low = Math.min(node, next),
        high = Math.max(node, next);
      if (gridEdgeDurations[low * 4 + gridEdgeSlot(field, low, high)]! >= 0)
        gridNeighborNodes[node]!.push(next);
    }
    gridNeighborNodes[node]!.sort((a, b) => a - b);
  }
  return {
    gridNeighborNodes: Object.freeze(gridNeighborNodes.map((nodes) => Object.freeze(nodes))),
    gridNeighborDurations: Object.freeze(
      gridNeighborNodes.map((nodes, node) =>
        Object.freeze(
          nodes.map((next) => {
            const low = Math.min(node, next),
              high = Math.max(node, next);
            return gridEdgeDurations[low * 4 + gridEdgeSlot(field, low, high)]!;
          }),
        ),
      ),
    ),
  };
}

function compileExactRoadGraph(
  field: NavigationField,
  exactGeometry: ExactGeometry,
): NavigationField {
  const region = field.region;
  const roadPoints: PointFp[] = [],
    roadEdges = new Map<number, number[]>(),
    ids = new Map<string, number>();
  const connect = (a: number, b: number) => {
    if (a === b) return;
    const add = (x: number, y: number) => {
      const list = roadEdges.get(x) ?? [];
      if (!list.includes(y)) list.push(y);
      roadEdges.set(x, list);
    };
    add(a, b);
    add(b, a);
  };
  const count = gridCount(field);
  const addRoad = (road: NavigationRegion['overlayShapes'][number]) => {
    let previous: number | undefined;
    for (const p of road.stations ?? []) {
      const key = `${p.xFp}:${p.zFp}`;
      let node = ids.get(key);
      if (node === undefined) {
        node = count + roadPoints.length;
        ids.set(key, node);
        roadPoints.push(p);
      }
      if (previous !== undefined) {
        const trace = traceExactGeometry(
          exactGeometry,
          roadPoints[previous - count]!,
          p,
          field.exactSurfacePolicy ?? surfacePolicy(region),
        );
        if (!trace || trace.intervals.some((span) => span.overlayId === null))
          throw new RangeError('Invalid authored road corridor');
        connect(previous, node);
      }
      previous = node;
    }
  };
  region.overlayShapes.forEach(addRoad);
  if (roadPoints.length > 2048) throw new RangeError('ROUTE_TOO_COMPLEX');
  roadPoints.forEach((p, i) => {
    for (const node of nearbyGridNodes(field, p)) connect(count + i, node);
  });
  // Compile immutable adjacent-grid costs once per edition, through the same exact tracer.
  // No accepted order pays again for the unchanging geometry of these finite edges.
  const gridEdgeDurations = compileExactGridEdges(field);
  const compiledNeighbors = compileGridNeighbors(field, gridEdgeDurations);
  const roadEdgeDurations = new Map<string, number | undefined>();
  const point = (node: number) =>
    node < count ? centerByIndex(field, node) : roadPoints[node - count]!;
  for (const [a, neighbors] of roadEdges)
    for (const b of neighbors)
      if (a < b)
        roadEdgeDurations.set(`${a}:${b}`, traceSegment(field, point(a), point(b))?.costUs);
  return Object.freeze({
    ...field,
    roadEdgeDurations,
    gridEdgeDurations: Object.freeze(gridEdgeDurations),
    ...compiledNeighbors,
    roadPoints: Object.freeze(roadPoints),
    roadEdges: new Map(
      [...roadEdges].map(([n, edges]) => [n, Object.freeze(edges.sort((a, b) => a - b))]),
    ),
  });
}

export function findTravelPath(
  field: NavigationField,
  start: PointFp,
  goal: PointFp,
): readonly PointFp[] | undefined {
  if (!isContinuousPointWalkable(field, start) || !isContinuousPointWalkable(field, goal))
    return undefined;
  if (start.xFp === goal.xFp && start.zFp === goal.zFp) return Object.freeze([start]);
  if (field.exactGeometry) return findExactTravelPath(field, start, goal);
  const connectors = (point: PointFp) =>
    nearbyGridNodes(field, point)
      .filter((node) => traceSegment(field, point, centerByIndex(field, node)))
      .sort((a, b) => a - b);
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

function compileExactMovementPlan(input: {
  field: NavigationField;
  path: readonly PointFp[];
  movementEpoch: string;
  startedAtMs: string;
  planId: string;
}): ContinuousMovementPlan {
  const path = input.path.map(toMicro),
    speedSpans: SpeedSpan[] = [],
    danger = new Set<string>();
  if (path.length > MAX_PATH_POINTS) throw new RangeError('ROUTE_TOO_COMPLEX');
  let offset = 0n;
  for (let i = 0; i + 1 < path.length; i++) {
    const trace = traceExactGeometry(
      input.field.exactGeometry!,
      input.path[i]!,
      input.path[i + 1]!,
      surfacePolicy(input.field.region),
    );
    if (!trace) throw new RangeError('NO_PATH');
    if (!trace.intervals.length) throw new RangeError('ZERO_LENGTH_PLAN');
    for (const area of trace.dangerAreaIds) danger.add(area);
    for (const interval of trace.intervals) {
      const duration = ceilDiv(
        interval.lengthMicroFp * 1000000000n,
        65536n * BigInt(BASE_SPEED_FP_PER_SECOND) * BigInt(interval.speedPermille),
      );
      speedSpans.push(
        Object.freeze({
          from: interval.from,
          to: interval.to,
          terrainId: interval.terrainId,
          overlayId: interval.overlayId,
          speedPermille: interval.speedPermille,
          startOffsetUs: offset.toString(),
          endOffsetUs: (offset + duration).toString(),
          geometry: { segmentIndex: i, fromT: interval.fromT, toT: interval.toT },
        }),
      );
      offset += duration;
      if (speedSpans.length > MAX_SPEED_SPANS) throw new RangeError('ROUTE_TOO_COMPLEX');
    }
  }
  if (offset <= 0n) throw new RangeError('ZERO_LENGTH_PLAN');
  return Object.freeze({
    planVersion: 3,
    navigationVersion: 'polygon-v1',
    planId: input.planId,
    mapEdition: input.field.region.mapEdition,
    speedProfileId: profileId(input.field),
    movementEpoch: input.movementEpoch,
    from: path[0]!,
    goal: path.at(-1)!,
    startedAtMs: input.startedAtMs,
    totalDurationUs: offset.toString(),
    arrivesAtMs: (BigInt(input.startedAtMs) + ceilDiv(offset, 1000n)).toString(),
    path: Object.freeze(path),
    dangerAreaIds: Object.freeze([...danger].sort()),
    speedSpans: Object.freeze(speedSpans),
  });
}

function validateExactSpanContinuity(
  plan: ContinuousMovementPlan,
  index: number,
  geometry: NonNullable<SpeedSpan['geometry']>,
  a: ReturnType<typeof readRatio>,
  b: ReturnType<typeof readRatio>,
): void {
  const previous = plan.speedSpans[index - 1]?.geometry;
  if (
    !previous
      ? geometry.segmentIndex !== 0 || a.n !== 0n
      : previous.segmentIndex === geometry.segmentIndex
        ? compareRatio(readRatio(previous.toT), a) !== 0
        : geometry.segmentIndex !== previous.segmentIndex + 1 ||
          compareRatio(readRatio(previous.toT), ratio(1n, 1n)) !== 0 ||
          a.n !== 0n
  )
    throw new RangeError('Invalid saved geometric span');
  if (
    index === plan.speedSpans.length - 1 &&
    (geometry.segmentIndex !== plan.path.length - 2 || b.n !== b.d)
  )
    throw new RangeError('Invalid saved geometric span');
}

function validateExactSpan(plan: ContinuousMovementPlan, span: SpeedSpan, index: number): void {
  const geometry = span.geometry;
  if (
    !geometry ||
    !Number.isSafeInteger(geometry.segmentIndex) ||
    geometry.segmentIndex < 0 ||
    geometry.segmentIndex + 1 >= plan.path.length
  )
    throw new RangeError('Invalid saved geometric span');
  const a = readRatio(geometry.fromT),
    b = readRatio(geometry.toT);
  if (compareRatio(a, b) >= 0) throw new RangeError('Invalid saved geometric span');
  const from = plan.path[geometry.segmentIndex]!,
    to = plan.path[geometry.segmentIndex + 1]!;
  const start = exactIntervalPoint(from, to, a),
    end = exactIntervalPoint(from, to, b);
  if (
    start.xMicroFp !== span.from.xMicroFp ||
    start.zMicroFp !== span.from.zMicroFp ||
    end.xMicroFp !== span.to.xMicroFp ||
    end.zMicroFp !== span.to.zMicroFp
  )
    throw new RangeError('Invalid saved geometric span');
  validateExactSpanContinuity(plan, index, geometry, a, b);
  const duration = ceilDiv(
    exactIntervalLength(from, to, a, b) * 1000000000n,
    65536n * BigInt(BASE_SPEED_FP_PER_SECOND) * BigInt(span.speedPermille),
  );
  if (BigInt(span.endOffsetUs) - BigInt(span.startOffsetUs) !== duration)
    throw new RangeError('Invalid saved geometric timing');
}

function gridColumns(field: Pick<NavigationField, 'region' | 'searchGrid'>): number {
  return field.searchGrid?.columns ?? field.region.columns;
}
function gridCount(field: NavigationField): number {
  return gridColumns(field) * (field.searchGrid?.rows ?? field.region.rows);
}
const HEX_NEIGHBORS = [
  [
    [-1, -1],
    [0, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
  ],
  [
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
] as const;
function gridNeighbors(
  field: NavigationField,
  row: number,
): readonly (readonly [number, number])[] {
  if (!field.searchGrid) return NEIGHBORS;
  return HEX_NEIGHBORS[row % 2]!;
}
function gridEdgeSlot(field: NavigationField, a: number, b: number): number {
  const columns = gridColumns(field),
    delta = b - a;
  if (field.searchGrid) {
    const row = Math.floor(a / columns);
    return delta === 1 ? 0 : delta === columns + (row % 2 === 0 ? -1 : 0) ? 1 : 2;
  }
  return delta === 1 ? 0 : delta === columns - 1 ? 1 : delta === columns ? 2 : 3;
}

function prepareExactSearchGraph(field: NavigationField, start: PointFp, goal: PointFp) {
  const count = gridCount(field),
    roadPoints = [...(field.roadPoints ?? [])];
  const extras = new Map<number, number[]>(
    [...(field.roadEdges ?? [])].map(([node, edges]) => [node, [...edges]]),
  );
  const point = (node: number) =>
    node < count ? centerByIndex(field, node) : roadPoints[node - count]!;
  const connect = (a: number, b: number) => {
    if (a === b) return;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const list = extras.get(x!) ?? [];
      if (!list.includes(y!)) list.push(y!);
      extras.set(x!, list);
    }
  };
  const nearby = (origin: PointFp, p: PointFp) =>
    Math.abs(
      Math.floor((origin.xFp - field.region.origin.xFp) / 64) -
        Math.floor((p.xFp - field.region.origin.xFp) / 64),
    ) <= 1 &&
    Math.abs(
      Math.floor((origin.zFp - field.region.origin.zFp) / 64) -
        Math.floor((p.zFp - field.region.origin.zFp) / 64),
    ) <= 1;
  const originalRoadEdges = [...extras].flatMap(([a, edges]) =>
    a >= count ? edges.filter((b) => b >= count && b > a).map((b) => [a, b] as const) : [],
  );
  // A target can be between authored stations. Split a candidate edge at its exact clicked approach.
  for (const origin of [start, goal])
    for (const [a, b] of originalRoadEdges) {
      const one = point(a),
        two = point(b),
        dx = two.xFp - one.xFp,
        dz = two.zFp - one.zFp;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((origin.xFp - one.xFp) * dx + (origin.zFp - one.zFp) * dz) / (dx * dx + dz * dz),
        ),
      );
      const p = {
        xFp: Math.round((one.xFp + dx * t) * 65536) / 65536,
        zFp: Math.round((one.zFp + dz * t) * 65536) / 65536,
      };
      if (!nearby(origin, p) || !isContinuousPointWalkable(field, p)) continue;
      let index = roadPoints.findIndex((q) => q.xFp === p.xFp && q.zFp === p.zFp);
      if (index < 0) {
        index = roadPoints.length;
        roadPoints.push(p);
      }
      const node = count + index;
      connect(node, a);
      connect(node, b);
    }
  if (roadPoints.length > 2048) throw new RangeError('ROUTE_TOO_COMPLEX');

  for (const neighbors of extras.values()) neighbors.sort((a, b) => a - b);
  return { gridCount: count, roadPoints, extras, point, nearby };
}

function reconstructExactPath(
  parent: Int32Array,
  node: number,
  start: PointFp,
  goal: PointFp,
  point: (n: number) => PointFp,
): readonly PointFp[] {
  const reversed: number[] = [];
  for (let n = node; n >= 0; n = parent[n]!) reversed.push(n);
  return [start, ...reversed.reverse().map(point), goal];
}

function exactSearchEdgeCost(
  field: NavigationField,
  graph: ReturnType<typeof prepareExactSearchGraph>,
  edgeCosts: Map<string, number | undefined>,
  a: number,
  b: number,
): number | undefined {
  const { point } = graph;
  const key = a < b ? `${a}:${b}` : `${b}:${a}`;
  if (field.roadEdgeDurations?.has(key)) return field.roadEdgeDurations.get(key);
  if (!edgeCosts.has(key)) edgeCosts.set(key, traceSegment(field, point(a), point(b))?.costUs);
  return edgeCosts.get(key);
}

function exactEndpointConnections(
  field: NavigationField,
  graph: ReturnType<typeof prepareExactSearchGraph>,
  origin: PointFp,
): Map<number, number> {
  const { gridCount, roadPoints, point, nearby } = graph;
  const nodes = nearbyGridNodes(field, origin);
  roadPoints.forEach((p, i) => {
    if (nearby(origin, p)) nodes.push(gridCount + i);
  });
  return new Map(
    nodes
      .map((n) => [n, traceSegment(field, origin, point(n))?.costUs])
      .filter((entry): entry is [number, number] => entry[1] !== undefined),
  );
}

function findExactTravelPath(
  field: NavigationField,
  start: PointFp,
  goal: PointFp,
): readonly PointFp[] | undefined {
  const graph = prepareExactSearchGraph(field, start, goal);
  const { gridCount, roadPoints, point } = graph;
  const total = gridCount + roadPoints.length,
    edgeCosts = new Map<string, number | undefined>();
  const edge = (a: number, b: number) => exactSearchEdgeCost(field, graph, edgeCosts, a, b);
  const starts = exactEndpointConnections(field, graph, start),
    goals = exactEndpointConnections(field, graph, goal),
    cost = new Float64Array(total),
    parent = new Int32Array(total),
    closed = new Uint8Array(total),
    heap = new MinHeap();
  cost.fill(Infinity);
  parent.fill(-1);
  const estimates = new Float64Array(total);
  estimates.fill(-1);
  const estimate = (node: number) => {
    if (estimates[node]! >= 0) return estimates[node]!;
    return (estimates[node] = minimumTravelTime(field, point(node), goal));
  };
  const relax = (
    next: number,
    current: { node: number; g: number },
    duration: number | undefined,
  ) => {
    if (duration === undefined) return;
    const g = current.g + duration;
    if (!(g < cost[next]!)) return;
    cost[next] = g;
    parent[next] = current.node;
    closed[next] = 0;
    heap.push({ node: next, g, f: g + estimate(next) });
  };
  const relaxNeighbors = (current: { node: number; g: number }) => {
    // Grid IDs precede road IDs. Both lists are already sorted, preserving
    // deterministic relaxation order without allocating/sorting per expansion.
    const neighbors = field.gridNeighborNodes![current.node];
    const durations = field.gridNeighborDurations![current.node];
    if (neighbors && durations)
      for (let i = 0; i < neighbors.length; i++) relax(neighbors[i]!, current, durations[i]);
    for (const next of graph.extras.get(current.node) ?? [])
      relax(next, current, edge(current.node, next));
  };
  let best = Infinity,
    bestPath: readonly PointFp[] | undefined;
  for (const [node, g] of starts) {
    cost[node] = g;
    parent[node] = -2;
    heap.push({ node, g, f: g + estimate(node) });
  }
  let expanded = 0;
  while (heap.size) {
    const current = heap.pop()!;
    if (current.g !== cost[current.node] || closed[current.node]) continue;
    if (current.f >= best) break;
    if (++expanded > total) throw new RangeError('ROUTE_TOO_COMPLEX');
    closed[current.node] = 1;
    const finish = goals.get(current.node);
    if (finish !== undefined && current.g + finish < best) {
      best = current.g + finish;
      bestPath = reconstructExactPath(parent, current.node, start, goal, point);
    }
    relaxNeighbors(current);
  }
  return chooseExactShortcut(field, start, goal, bestPath);
}

function chooseExactShortcut(
  field: NavigationField,
  start: PointFp,
  goal: PointFp,
  bestPath: readonly PointFp[] | undefined,
): readonly PointFp[] | undefined {
  const direct = traceSegment(field, start, goal);
  const smoothed = finishExactPath(field, bestPath);
  if (!smoothed) return direct ? [start, goal] : undefined;
  const smoothedCost = smoothed
    .slice(1)
    .reduce((sum, p, i) => sum + traceSegment(field, smoothed[i]!, p)!.costUs, 0);
  return direct && direct.costUs <= smoothedCost ? [start, goal] : smoothed;
}

function finishExactPath(
  field: NavigationField,
  bestPath: readonly PointFp[] | undefined,
): readonly PointFp[] | undefined {
  if (!bestPath) return undefined;
  if (bestPath.length > MAX_PATH_POINTS) throw new RangeError('ROUTE_TOO_COMPLEX');
  const deduplicated = bestPath.filter(
    (p, i) => !i || p.xFp !== bestPath![i - 1]!.xFp || p.zFp !== bestPath![i - 1]!.zFp,
  );
  return smoothPath(field, deduplicated);
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
  if (input.field.exactGeometry) return compileExactMovementPlan(input);
  return compileLegacyMovementPlan(input);
}
function collectLegacyRouteSpans(field: NavigationField, path: readonly PointFp[]) {
  const routeSpans: SpeedSpan[] = [];
  let routeSpanStart: PointFp | undefined;
  const danger = new Set<string>();
  for (let i = 1; i < path.length; i += 1) {
    const traced = traceSegment(field, path[i - 1]!, path[i]!);
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
        collinearFp(routeSpanStart, path[i - 1]!, path[i]!)
      ) {
        routeSpans[routeSpans.length - 1] = { ...previous, to: span.to };
      } else {
        routeSpans.push(span);
        routeSpanStart = path[i - 1]!;
      }
      if (routeSpans.length > MAX_SPEED_SPANS) throw new RangeError('ROUTE_TOO_COMPLEX');
    }
  }
  return { routeSpans, danger };
}

function legacySpanDuration(span: Pick<SpeedSpan, 'from' | 'to' | 'speedPermille'>): bigint {
  const dx = BigInt(span.to.xMicroFp) - BigInt(span.from.xMicroFp);
  const dz = BigInt(span.to.zMicroFp) - BigInt(span.from.zMicroFp);
  const length = integerSqrtCeil(dx * dx + dz * dz);
  return ceilDiv(
    length * 1_000_000_000n,
    65_536n * BigInt(BASE_SPEED_FP_PER_SECOND) * BigInt(span.speedPermille),
  );
}

function compileLegacyMovementPlan(
  input: Parameters<typeof compileMovementPlan>[0],
): ContinuousMovementPlan {
  const { routeSpans, danger } = collectLegacyRouteSpans(input.field, input.path);
  const speedSpans: SpeedSpan[] = [];
  let offset = 0n;
  for (const span of routeSpans) {
    const duration = legacySpanDuration(span);
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

function supportedPlanVersion(p: ContinuousMovementPlan): boolean {
  return p.planVersion === 3
    ? p.navigationVersion === 'polygon-v1'
    : p.planVersion === 2 && p.navigationVersion === undefined;
}
function validateSpanVersion(plan: ContinuousMovementPlan, span: SpeedSpan, index: number): void {
  if (plan.planVersion === 3) {
    validateExactSpan(plan, span, index);
    return;
  }
  if (
    span.geometry !== undefined ||
    (span.from.xMicroFp === span.to.xMicroFp && span.from.zMicroFp === span.to.zMicroFp)
  )
    throw new RangeError('Invalid saved movement plan');
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
    !supportedPlanVersion(p) ||
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
  for (const [spanIndex, span] of (p.speedSpans as readonly SpeedSpan[]).entries()) {
    if (
      !span ||
      !point(span.from) ||
      !point(span.to) ||
      !equal(last, span.from) ||
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
    validateSpanVersion(p, span, spanIndex);
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
  if (plan.planVersion === 3) {
    const geometry = span.geometry!;
    const a = readRatio(geometry.fromT),
      b = readRatio(geometry.toT);
    const t = ratio(a.n * b.d * duration + (b.n * a.d - a.n * b.d) * at, a.d * b.d * duration);
    return exactIntervalPoint(
      plan.path[geometry.segmentIndex]!,
      plan.path[geometry.segmentIndex + 1]!,
      t,
    );
  }
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
  if (field.exactGeometry) {
    const traced = traceExactGeometry(
      field.exactGeometry,
      from,
      to,
      field.exactSurfacePolicy ?? surfacePolicy(field.region),
    );
    if (!traced) return undefined;
    const spans = traced.intervals.map((interval) => ({
      ...interval,
      startOffsetUs: '0',
      endOffsetUs: ceilDiv(
        interval.lengthMicroFp * 1000000000n,
        65536n * BigInt(BASE_SPEED_FP_PER_SECOND) * BigInt(interval.speedPermille),
      ).toString(),
    }));
    return {
      spans,
      costUs: spans.reduce((sum, s) => sum + Number(s.endOffsetUs), 0),
      dangerAreaIds: traced.dangerAreaIds,
    };
  }
  if (!isContinuousPointWalkable(field, from) || !isContinuousPointWalkable(field, to))
    return undefined;
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
    const duration = legacySpanDuration(span);
    costUs += Number(duration);
    spans[index] = { ...span, startOffsetUs: '0', endOffsetUs: duration.toString() };
  }
  return { costUs, spans, dangerAreaIds: [...danger].sort() };
}

// A lattice zigzag may conceal a cheaper two-chord terrain detour.
function improveDirectShortcut(
  field: NavigationField,
  path: readonly PointFp[],
  preserveRoad: boolean,
): readonly PointFp[] {
  let out: PointFp[] = [path[0]!, path.at(-1)!];
  let bestCost = traceSegment(field, path[0]!, path.at(-1)!)!.costUs;
  const stride = Math.max(1, Math.ceil((path.length - 2) / 16));
  for (let i = 1; i < path.length - 1; i += stride) {
    const first = traceSegment(field, path[0]!, path[i]!);
    const last = traceSegment(field, path[i]!, path.at(-1)!);
    if (!first || !last) continue;
    if (preserveRoad && ![...first.spans, ...last.spans].every((span) => span.overlayId !== null))
      continue;
    const cost = first.costUs + last.costUs;
    if (cost < bestCost) {
      bestCost = cost;
      out = [path[0]!, path[i]!, path.at(-1)!];
    }
  }
  return Object.freeze(out);
}
function smoothPath(field: NavigationField, path: readonly PointFp[]): readonly PointFp[] {
  const out: PointFp[] = [path[0]!];
  const cumulative = [0];
  const offRoadEdges = [0];
  for (let i = 1; i < path.length; i++) {
    const traced = traceSegment(field, path[i - 1]!, path[i]!);
    cumulative.push(cumulative[i - 1]! + (traced?.costUs ?? Number.MAX_SAFE_INTEGER));
    offRoadEdges.push(
      offRoadEdges[i - 1]! + (traced?.spans.every((s) => s.overlayId !== null) ? 0 : 1),
    );
  }
  let index = 0;
  while (index < path.length - 1) {
    let selected = index + 1;
    for (let candidate = path.length - 1; candidate > index + 1; candidate -= 1) {
      const direct = traceSegment(field, path[index]!, path[candidate]!);
      const preserveRoad = field.exactGeometry && offRoadEdges[candidate] === offRoadEdges[index];
      if (
        direct &&
        (!preserveRoad || direct.spans.every((s) => s.overlayId !== null)) &&
        direct.costUs <= cumulative[candidate]! - cumulative[index]!
      ) {
        selected = candidate;
        break;
      }
    }
    out.push(path[selected]!);
    index = selected;
  }
  if (field.exactGeometry && out.length === 2 && path.length > 2)
    return improveDirectShortcut(field, path, offRoadEdges.at(-1) === 0);
  return Object.freeze(out);
}
function heuristic(field: NavigationField, node: number, goal: PointFp): number {
  return minimumTravelTime(field, centerByIndex(field, node), goal);
}
function minimumTravelTime(field: NavigationField, point: PointFp, goal: PointFp): number {
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
export function isContinuousPointWalkable(field: NavigationField, point: PointFp): boolean {
  const xMicro = point.xFp * MICRO_FP_PER_FP;
  const zMicro = point.zFp * MICRO_FP_PER_FP;
  if (!Number.isSafeInteger(xMicro) || !Number.isSafeInteger(zMicro)) return false;
  if (field.exactGeometry)
    return exactPointValid(
      field.exactGeometry,
      point,
      field.exactSurfacePolicy ?? surfacePolicy(field.region),
    );
  const index = cellAt(field, point);
  return index >= 0 && field.walkable[index] === true;
}
function cellAt(field: NavigationField, point: PointFp): number {
  const column = Math.floor((point.xFp - field.region.origin.xFp) / field.region.cellSizeFp);
  const row = Math.floor((point.zFp - field.region.origin.zFp) / field.region.cellSizeFp);
  return nodeIndex(field, column, row);
}
function nodeIndex(field: NavigationField, column: number, row: number): number {
  return column < 0 ||
    row < 0 ||
    column >= gridColumns(field) ||
    row >= (field.searchGrid?.rows ?? field.region.rows)
    ? -1
    : row * gridColumns(field) + column;
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
  return { column: node % gridColumns(field), row: Math.floor(node / gridColumns(field)) };
}
function center(
  field: Pick<NavigationField, 'region' | 'searchGrid'>,
  column: number,
  row: number,
): PointFp {
  const xStep = field.searchGrid?.xStepFp ?? NAV_CELL_SIZE_FP;
  const zStep = field.searchGrid?.zStepFp ?? NAV_CELL_SIZE_FP;
  return {
    xFp: field.region.origin.xFp + (column + 0.5 + (field.searchGrid ? (row % 2) / 2 : 0)) * xStep,
    zFp:
      Math.round((field.region.origin.zFp + (row + 0.5) * zStep) * MICRO_FP_PER_FP) /
      MICRO_FP_PER_FP,
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

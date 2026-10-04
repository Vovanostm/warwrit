import type {
  NavigationRegion,
  OverlayId,
  PointFp,
  PointMicroFp,
  TerrainId,
} from './continuous-types.js';

const MICRO = 65536n;
const RADIUS = 24n * MICRO;
type Point = { readonly x: bigint; readonly z: bigint };
export type Ratio = { readonly n: bigint; readonly d: bigint };
export type StoredRatio = { readonly numerator: string; readonly denominator: string };
type Polygon = {
  readonly vertices: readonly Point[];
  readonly bounds: readonly [number, number, number, number];
  readonly rectangle: boolean;
};
interface GeometryBucket {
  readonly terrain: readonly number[];
  readonly overlays: readonly number[];
  readonly danger: readonly number[];
  readonly uniform: boolean;
}
export interface ExactGeometry {
  readonly buckets: readonly GeometryBucket[];
  readonly region: NavigationRegion;
  readonly boundary: Polygon;
  readonly terrain: readonly Polygon[];
  readonly overlays: readonly Polygon[];
  readonly blockers: readonly Polygon[];
  readonly danger: readonly Polygon[];
}
export interface ExactSurface {
  readonly terrainId: TerrainId;
  readonly overlayId: OverlayId;
  readonly speedPermille: number;
}
export type SurfacePolicy = (
  terrain: readonly number[],
  overlays: readonly number[],
) => ExactSurface;
export interface ExactInterval extends ExactSurface {
  readonly from: PointMicroFp;
  readonly to: PointMicroFp;
  readonly fromT: StoredRatio;
  readonly toT: StoredRatio;
  readonly lengthMicroFp: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a,
    y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x || 1n;
}
export function ratio(n: bigint, d: bigint): Ratio {
  if (!d) throw new RangeError('Invalid geometric denominator');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}
export function compareRatio(a: Ratio, b: Ratio): number {
  const delta = a.n * b.d - b.n * a.d;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}
function storedRatio(t: Ratio): StoredRatio {
  return { numerator: t.n.toString(), denominator: t.d.toString() };
}
// Every stored event is a determinant of two coordinate differences <=2^30 microFp.
// Its unreduced denominator is therefore <=2^61 (19 digits); interpolation is not persisted.
export function readRatio(t: StoredRatio): Ratio {
  if (!t || !/^(0|[1-9]\d{0,18})$/.test(t.numerator) || !/^[1-9]\d{0,18}$/.test(t.denominator))
    throw new RangeError('Invalid geometric fraction');
  const value = ratio(BigInt(t.numerator), BigInt(t.denominator));
  if (
    value.d > 1n << 61n ||
    value.n > value.d ||
    value.n.toString() !== t.numerator ||
    value.d.toString() !== t.denominator
  )
    throw new RangeError('Invalid geometric fraction');
  return value;
}
function roundRatio(n: bigint, d: bigint): bigint {
  const magnitude = n < 0n ? -n : n;
  const rounded = (2n * magnitude + d) / (2n * d);
  return n < 0n ? -rounded : rounded;
}
function micro(p: PointFp): Point {
  const x = p.xFp * Number(MICRO),
    z = p.zFp * Number(MICRO);
  if (
    !Number.isSafeInteger(x) ||
    !Number.isSafeInteger(z) ||
    Math.abs(x) > 536870912 ||
    Math.abs(z) > 536870912
  )
    throw new RangeError('Invalid geometry coordinate');
  return { x: BigInt(x), z: BigInt(z) };
}
function cross(a: Point, b: Point): bigint {
  return a.x * b.z - a.z * b.x;
}
function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, z: a.z - b.z };
}
function at(a: Point, delta: Point, t: Ratio): Point & { readonly d: bigint } {
  return { x: a.x * t.d + delta.x * t.n, z: a.z * t.d + delta.z * t.n, d: t.d };
}
function onSegment(p: Point & { readonly d: bigint }, a: Point, b: Point): boolean {
  return (
    p.x >= (a.x < b.x ? a.x : b.x) * p.d &&
    p.x <= (a.x > b.x ? a.x : b.x) * p.d &&
    p.z >= (a.z < b.z ? a.z : b.z) * p.d &&
    p.z <= (a.z > b.z ? a.z : b.z) * p.d
  );
}
function covered(p: Point & { readonly d: bigint }, polygon: Polygon): boolean {
  const vertices = polygon.vertices;
  if (polygon.rectangle) {
    return withinBounds(p, polygon);
  }
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j]!,
      b = vertices[i]!;
    const px = p.x - a.x * p.d,
      pz = p.z - a.z * p.d;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const turn = dx * pz - dz * px;
    if (turn === 0n && onSegment(p, a, b)) return true;
    if (a.z * p.d > p.z !== b.z * p.d > p.z && (dz > 0n ? turn > 0n : turn < 0n)) inside = !inside;
  }
  return inside;
}
function edgeIntersections(a: Point, delta: Point, c: Point, d: Point): Ratio[] {
  const edge = subtract(d, c),
    offset = subtract(c, a);
  const denominator = cross(delta, edge);
  if (denominator) {
    const t = ratio(cross(offset, edge), denominator),
      u = ratio(cross(offset, delta), denominator);
    return t.n >= 0n && t.n <= t.d && u.n >= 0n && u.n <= u.d ? [t] : [];
  }
  if (cross(offset, delta) !== 0n) return [];
  const axis = delta.x ? 'x' : 'z';
  if (!delta[axis]) return [];
  return [c, d]
    .map((p) => ratio(p[axis] - a[axis], delta[axis]))
    .filter((t) => t.n >= 0n && t.n <= t.d);
}
function intersections(a: Point, delta: Point, polygon: Polygon): Ratio[] {
  return polygon.vertices.flatMap((c, i) =>
    edgeIntersections(a, delta, c, polygon.vertices[(i + 1) % polygon.vertices.length]!),
  );
}

function distanceWithin(p: Point, a: Point, b: Point, radius: bigint, inclusive: boolean): boolean {
  const edge = subtract(b, a),
    offset = subtract(p, a);
  const squared = edge.x * edge.x + edge.z * edge.z;
  const projection = offset.x * edge.x + offset.z * edge.z;
  let numerator: bigint,
    denominator = 1n;
  if (projection <= 0n || !squared) numerator = offset.x * offset.x + offset.z * offset.z;
  else if (projection >= squared) {
    const d = subtract(p, b);
    numerator = d.x * d.x + d.z * d.z;
  } else {
    const turn = cross(edge, offset);
    numerator = turn * turn;
    denominator = squared;
  }
  return inclusive
    ? numerator <= radius * radius * denominator
    : numerator < radius * radius * denominator;
}
function nearPolygon(a: Point, b: Point, polygon: Polygon, inclusive: boolean): boolean {
  if (intersections(a, subtract(b, a), polygon).length) return true;
  return polygon.vertices.some((c, i) => {
    const d = polygon.vertices[(i + 1) % polygon.vertices.length]!;
    return (
      distanceWithin(a, c, d, RADIUS, inclusive) ||
      distanceWithin(b, c, d, RADIUS, inclusive) ||
      distanceWithin(c, a, b, RADIUS, inclusive) ||
      distanceWithin(d, a, b, RADIUS, inclusive)
    );
  });
}
function overlapsBounds(a: PointFp, b: PointFp, polygon: Polygon, margin = 0): boolean {
  const [minX, minZ, maxX, maxZ] = polygon.bounds;
  return (
    Math.max(a.xFp, b.xFp) + margin >= minX &&
    Math.min(a.xFp, b.xFp) - margin <= maxX &&
    Math.max(a.zFp, b.zFp) + margin >= minZ &&
    Math.min(a.zFp, b.zFp) - margin <= maxZ
  );
}
function assertSimpleEdges(vertices: readonly Point[]): void {
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!,
      b = vertices[(i + 1) % vertices.length]!;
    if (a.x === b.x && a.z === b.z) throw new RangeError('Zero geometry edge');
    for (let j = i + 2; j < vertices.length; j++) {
      if (i === 0 && j === vertices.length - 1) continue;
      const c = vertices[j]!,
        d = vertices[(j + 1) % vertices.length]!;
      if (
        intersections(a, subtract(b, a), {
          vertices: [c, d],
          bounds: [0, 0, 0, 0],
          rectangle: false,
        }).length
      )
        throw new RangeError('Self-intersecting geometry');
    }
  }
}
function polygon(points: readonly PointFp[]): Polygon {
  if (points.length < 3 || points.some((p) => !Number.isInteger(p.xFp) || !Number.isInteger(p.zFp)))
    throw new RangeError('Invalid geometry polygon');
  const vertices = points.map(micro);
  const area = vertices.reduce(
    (sum, p, i) => sum + cross(p, vertices[(i + 1) % vertices.length]!),
    0n,
  );
  if (area === 0n) throw new RangeError('Zero geometry area');
  assertSimpleEdges(vertices);
  return {
    vertices,
    rectangle:
      vertices.length === 4 &&
      vertices.every((p, i) => {
        const next = vertices[(i + 1) % 4]!;
        return (p.x === next.x) !== (p.z === next.z);
      }),
    bounds: [
      Math.min(...points.map((p) => p.xFp)),
      Math.min(...points.map((p) => p.zFp)),
      Math.max(...points.map((p) => p.xFp)),
      Math.max(...points.map((p) => p.zFp)),
    ],
  };
}
export function buildExactGeometry(region: NavigationRegion): ExactGeometry {
  const shapes = [
    ...region.terrainShapes,
    ...region.overlayShapes,
    ...region.blockingShapes,
    ...region.dangerAreaShapes,
  ];
  if (shapes.reduce((n, shape) => n + shape.polygon.length, region.boundary.length) > 4096)
    throw new RangeError('ROUTE_TOO_COMPLEX');
  const compiled = {
    region,
    boundary: polygon(region.boundary),
    terrain: region.terrainShapes.map((s) => polygon(s.polygon)),
    overlays: region.overlayShapes.map((s) => polygon(s.polygon)),
    blockers: region.blockingShapes.map((s) => polygon(s.polygon)),
    danger: region.dangerAreaShapes.map((s) => polygon(s.polygon)),
  };
  const buckets: GeometryBucket[] = [];
  for (let row = 0; row < region.rows; row++)
    for (let column = 0; column < region.columns; column++) {
      const from = {
        xFp: region.origin.xFp + column * region.cellSizeFp,
        zFp: region.origin.zFp + row * region.cellSizeFp,
      };
      const to = { xFp: from.xFp + region.cellSizeFp, zFp: from.zFp + region.cellSizeFp };
      const centre = {
        ...micro({ xFp: (from.xFp + to.xFp) / 2, zFp: (from.zFp + to.zFp) / 2 }),
        d: 1n,
      };
      const candidates = (shapes: readonly Polygon[]) =>
        shapes.flatMap((shape, i) => (overlapsBounds(from, to, shape) ? [i] : []));
      const terrain = candidates(compiled.terrain),
        overlays = candidates(compiled.overlays),
        danger = candidates(compiled.danger);
      const boundaries = [
        compiled.boundary,
        ...terrain.map((i) => compiled.terrain[i]!),
        ...overlays.map((i) => compiled.overlays[i]!),
        ...danger.map((i) => compiled.danger[i]!),
      ];
      // An edge bounding box is conservative: false MIXED is allowed; false FULL is not.
      // This detects concave/sliver boundaries wholly inside a cell, unlike centre/corner sampling.
      const boundaryTouches = boundaries.some((shape) =>
        shape.vertices.some((p, i) => {
          const q = shape.vertices[(i + 1) % shape.vertices.length]!;
          return (
            Number(p.x < q.x ? p.x : q.x) / 65536 <= to.xFp &&
            Number(p.x > q.x ? p.x : q.x) / 65536 >= from.xFp &&
            Number(p.z < q.z ? p.z : q.z) / 65536 <= to.zFp &&
            Number(p.z > q.z ? p.z : q.z) / 65536 >= from.zFp
          );
        }),
      );
      const bounds = compiled.boundary.bounds;
      const uniform =
        compiled.boundary.rectangle &&
        from.xFp >= bounds[0] + 24 &&
        to.xFp <= bounds[2] - 24 &&
        from.zFp >= bounds[1] + 24 &&
        to.zFp <= bounds[3] - 24 &&
        !boundaryTouches &&
        !compiled.blockers.some((shape) => overlapsBounds(from, to, shape, 24));
      buckets.push(
        Object.freeze({
          terrain: Object.freeze(
            uniform ? terrain.filter((i) => covered(centre, compiled.terrain[i]!)) : terrain,
          ),
          overlays: Object.freeze(
            uniform ? overlays.filter((i) => covered(centre, compiled.overlays[i]!)) : overlays,
          ),
          danger: Object.freeze(
            uniform ? danger.filter((i) => covered(centre, compiled.danger[i]!)) : danger,
          ),
          uniform,
        }),
      );
    }
  return { ...compiled, buckets: Object.freeze(buckets) };
}
function withinBounds(p: Point & { readonly d: bigint }, shape: Polygon): boolean {
  const [minX, minZ, maxX, maxZ] = shape.bounds,
    unit = MICRO * p.d;
  return (
    p.x >= BigInt(minX) * unit &&
    p.x <= BigInt(maxX) * unit &&
    p.z >= BigInt(minZ) * unit &&
    p.z <= BigInt(maxZ) * unit
  );
}
function boundaryClear(geometry: ExactGeometry, a: Point, b: Point): boolean {
  if (!geometry.boundary.rectangle) return !nearPolygon(a, b, geometry.boundary, false);
  const [minX, minZ, maxX, maxZ] = geometry.boundary.bounds;
  return [a, b].every(
    (p) =>
      p.x >= BigInt(minX) * MICRO + RADIUS &&
      p.x <= BigInt(maxX) * MICRO - RADIUS &&
      p.z >= BigInt(minZ) * MICRO + RADIUS &&
      p.z <= BigInt(maxZ) * MICRO - RADIUS,
  );
}
function bucketAt(
  geometry: ExactGeometry,
  p: Point & { readonly d: bigint },
): GeometryBucket | undefined {
  const unit = MICRO * p.d,
    cell = BigInt(geometry.region.cellSizeFp) * unit;
  const floor = (n: bigint) => (n >= 0n ? n / cell : -((-n + cell - 1n) / cell));
  const column = Number(floor(p.x - BigInt(geometry.region.origin.xFp) * unit));
  const row = Number(floor(p.z - BigInt(geometry.region.origin.zFp) * unit));
  return column >= 0 && row >= 0 && column < geometry.region.columns && row < geometry.region.rows
    ? geometry.buckets[row * geometry.region.columns + column]
    : undefined;
}
function selectedSurface(
  geometry: ExactGeometry,
  p: Point & { readonly d: bigint },
  policy: SurfacePolicy,
): ExactSurface {
  const bucket = bucketAt(geometry, p);
  if (bucket?.uniform) return policy(bucket.terrain, bucket.overlays);
  const indices = (shapes: readonly Polygon[], candidates: readonly number[] | undefined) =>
    (candidates ?? shapes.map((_, i) => i)).filter(
      (i) => withinBounds(p, shapes[i]!) && covered(p, shapes[i]!),
    );
  return policy(
    indices(geometry.terrain, bucket?.terrain),
    indices(geometry.overlays, bucket?.overlays),
  );
}
function sameSurface(a: ExactSurface, b: ExactSurface): boolean {
  return (
    a.terrainId === b.terrainId &&
    a.overlayId === b.overlayId &&
    a.speedPermille === b.speedPermille
  );
}
function uniformBucketBounds(region: NavigationRegion, from: PointFp, to: PointFp) {
  const minC = Math.floor((Math.min(from.xFp, to.xFp) - region.origin.xFp) / region.cellSizeFp);
  const maxC = Math.floor((Math.max(from.xFp, to.xFp) - region.origin.xFp) / region.cellSizeFp);
  const minR = Math.floor((Math.min(from.zFp, to.zFp) - region.origin.zFp) / region.cellSizeFp);
  const maxR = Math.floor((Math.max(from.zFp, to.zFp) - region.origin.zFp) / region.cellSizeFp);
  if (
    minC < 0 ||
    minR < 0 ||
    maxC >= region.columns ||
    maxR >= region.rows ||
    (maxC - minC + 1) * (maxR - minR + 1) > 64
  )
    return undefined;
  return { minC, maxC, minR, maxR };
}

/** Fast only when a closed bounding rectangle consists entirely of proven FULL buckets. */
function uniformTrace(
  geometry: ExactGeometry,
  from: PointFp,
  to: PointFp,
  policy: SurfacePolicy,
): { surface: ExactSurface; dangerAreaIds: readonly string[] } | undefined {
  const bounds = uniformBucketBounds(geometry.region, from, to);
  if (!bounds) return undefined;
  const { minC, maxC, minR, maxR } = bounds,
    region = geometry.region;
  let surface: ExactSurface | undefined;
  const danger = new Set<string>();
  for (let row = minR; row <= maxR; row++)
    for (let col = minC; col <= maxC; col++) {
      const bucket = geometry.buckets[row * region.columns + col]!;
      if (!bucket.uniform) return undefined;
      const next = policy(bucket.terrain, bucket.overlays);
      if (next.speedPermille <= 0 || (surface && !sameSurface(next, surface))) return undefined;
      surface = next;
      bucket.danger.forEach((i) => danger.add(region.dangerAreaShapes[i]!.areaId));
    }
  return surface ? { surface, dangerAreaIds: [...danger].sort() } : undefined;
}
export function exactSurfaceAt(
  geometry: ExactGeometry,
  point: PointFp,
  policy: SurfacePolicy,
): ExactSurface {
  return selectedSurface(geometry, { ...micro(point), d: 1n }, policy);
}
export function exactPointValid(
  geometry: ExactGeometry,
  point: PointFp,
  policy: SurfacePolicy,
): boolean {
  const p = micro(point);
  return (
    covered({ ...p, d: 1n }, geometry.boundary) &&
    boundaryClear(geometry, p, p) &&
    !geometry.blockers.some(
      (shape) =>
        overlapsBounds(point, point, shape, 24) &&
        (covered({ ...p, d: 1n }, shape) || nearPolygon(p, p, shape, true)),
    ) &&
    selectedSurface(geometry, { ...p, d: 1n }, policy).speedPermille > 0
  );
}
function ceilSqrt(value: bigint): bigint {
  if (value < 2n) return value;
  let x = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
  for (;;) {
    const y = (x + value / x) / 2n;
    if (y >= x) break;
    x = y;
  }
  return x * x === value ? x : x + 1n;
}
export function exactIntervalLength(
  from: PointMicroFp,
  to: PointMicroFp,
  start: Ratio,
  end: Ratio,
): bigint {
  const dx = BigInt(to.xMicroFp) - BigInt(from.xMicroFp),
    dz = BigInt(to.zMicroFp) - BigInt(from.zMicroFp);
  const length = ratio(end.n * start.d - start.n * end.d, end.d * start.d);
  const numerator = (dx * dx + dz * dz) * length.n * length.n,
    denominator = length.d * length.d;
  return ceilSqrt((numerator + denominator - 1n) / denominator);
}
export function exactIntervalPoint(from: PointMicroFp, to: PointMicroFp, t: Ratio): PointMicroFp {
  const x = BigInt(from.xMicroFp),
    z = BigInt(from.zMicroFp);
  return {
    xMicroFp: roundRatio(x * t.d + (BigInt(to.xMicroFp) - x) * t.n, t.d).toString(),
    zMicroFp: roundRatio(z * t.d + (BigInt(to.zMicroFp) - z) * t.n, t.d).toString(),
  };
}
function traversableSurface(surface: ExactSurface): boolean {
  return (
    surface.speedPermille > 0 &&
    surface.terrainId !== 'cliff' &&
    (surface.terrainId !== 'deep_water' ||
      surface.overlayId === 'bridge' ||
      surface.overlayId === 'ford')
  );
}
function classifyEventIntervals(
  geometry: ExactGeometry,
  a: Point,
  delta: Point,
  times: readonly Ratio[],
  policy: SurfacePolicy,
  visitDanger: (point: Point & { readonly d: bigint }) => void,
): { start: Ratio; end: Ratio; surface: ExactSurface }[] | undefined {
  const groups: { start: Ratio; end: Ratio; surface: ExactSurface }[] = [];
  for (const time of times) {
    const point = at(a, delta, time);
    if (selectedSurface(geometry, point, policy).speedPermille <= 0) return undefined;
    visitDanger(point);
  }
  for (let i = 0; i + 1 < times.length; i++) {
    const start = times[i]!,
      end = times[i + 1]!;
    const middle = ratio(start.n * end.d + end.n * start.d, 2n * start.d * end.d);
    const p = at(a, delta, middle),
      surface = selectedSurface(geometry, p, policy);
    if (!traversableSurface(surface)) return undefined;
    visitDanger(p);
    const previous = groups.at(-1);
    if (previous && sameSurface(previous.surface, surface)) previous.end = end;
    else groups.push({ start, end, surface });
  }
  return groups;
}
export function traceExactGeometry(
  geometry: ExactGeometry,
  from: PointFp,
  to: PointFp,
  policy: SurfacePolicy,
):
  | { readonly intervals: readonly ExactInterval[]; readonly dangerAreaIds: readonly string[] }
  | undefined {
  const uniform = uniformTrace(geometry, from, to, policy);
  if (uniform) {
    const a = micro(from),
      b = micro(to);
    const origin = { xMicroFp: a.x.toString(), zMicroFp: a.z.toString() },
      goal = { xMicroFp: b.x.toString(), zMicroFp: b.z.toString() };
    const length = exactIntervalLength(origin, goal, ratio(0n, 1n), ratio(1n, 1n));
    return {
      intervals:
        length === 0n
          ? []
          : [
              {
                ...uniform.surface,
                from: origin,
                to: goal,
                fromT: storedRatio(ratio(0n, 1n)),
                toT: storedRatio(ratio(1n, 1n)),
                lengthMicroFp: length,
              },
            ],
      dangerAreaIds: uniform.dangerAreaIds,
    };
  }
  if (!exactPointValid(geometry, from, policy) || !exactPointValid(geometry, to, policy))
    return undefined;
  const a = micro(from),
    b = micro(to),
    delta = subtract(b, a);
  if (delta.x === 0n && delta.z === 0n) return { intervals: [], dangerAreaIds: [] };
  if (
    !boundaryClear(geometry, a, b) ||
    geometry.blockers.some(
      (shape) => overlapsBounds(from, to, shape, 24) && nearPolygon(a, b, shape, true),
    )
  )
    return undefined;
  const shapes = [...geometry.terrain, ...geometry.overlays, ...geometry.danger];
  const events = [
    { n: 0n, d: 1n },
    { n: 1n, d: 1n },
    ...shapes.filter((s) => overlapsBounds(from, to, s)).flatMap((s) => intersections(a, delta, s)),
  ].sort(compareRatio);
  const times = events.filter((t, i) => !i || compareRatio(t, events[i - 1]!) !== 0);
  const danger = new Set<string>();
  const visitDanger = (p: Point & { readonly d: bigint }) =>
    geometry.danger.forEach((shape, i) => {
      if (withinBounds(p, shape) && covered(p, shape))
        danger.add(geometry.region.dangerAreaShapes[i]!.areaId);
    });
  const groups = classifyEventIntervals(geometry, a, delta, times, policy, visitDanger);
  if (!groups) return undefined;
  const origin = { xMicroFp: a.x.toString(), zMicroFp: a.z.toString() },
    goal = { xMicroFp: b.x.toString(), zMicroFp: b.z.toString() };
  return {
    intervals: groups.map((group) => ({
      ...group.surface,
      from: exactIntervalPoint(origin, goal, group.start),
      to: exactIntervalPoint(origin, goal, group.end),
      fromT: storedRatio(group.start),
      toT: storedRatio(group.end),
      lengthMicroFp: exactIntervalLength(origin, goal, group.start, group.end),
    })),
    dangerAreaIds: [...danger].sort(),
  };
}

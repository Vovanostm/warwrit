import {
  PAINTED_ATLAS_ENTRY_ZONES,
  isPointInsideConvexPolygon,
  polygonCrossProduct,
  compileMovementPlan,
  findTravelPath,
  isContinuousPointWalkable,
  type ContinuousMovementPlan,
  type NavigationField,
  type PointFp,
} from '@warwrit/game-core';
import { type Pixel } from './porechye-navigation.js';

export interface PlaceEntry {
  readonly name: string;
  // Convex, connected dry outskirts traced on the existing painting.
  readonly footprint: readonly PointFp[];
  readonly anchor: PointFp;
  readonly image: string;
}

// Local stand areas, not canonical server access rules or individual roof collisions.
export function placeEntries(
  point: (p: Pixel) => PointFp,
  offset: Pixel = [0, 0],
): readonly PlaceEntry[] {
  const at = (p: Pixel) => point([p[0] + offset[0], p[1] + offset[1]]);
  const images: Readonly<Record<string, string>> = {
    bereznyak: 'bereznyak-painting.png',
    'kamenny-brod': 'kamenny-brod-painting.png',
  };
  return PAINTED_ATLAS_ENTRY_ZONES.map((zone) => ({
    name: zone.name,
    footprint: zone.footprintPixels.map(at),
    anchor: at(zone.anchorPixel),
    image: images[zone.siteId]!,
  }));
}

const compile = (field: NavigationField, path: readonly PointFp[]) =>
  compileMovementPlan({ field, path, startedAtMs: '0', movementEpoch: '0', planId: 'place-entry' });
const distance = (a: PointFp, b: PointFp) => Math.hypot(a.xFp - b.xFp, a.zFp - b.zFp);
const interpolate = (a: PointFp, b: PointFp, t: number): PointFp => ({
  xFp: a.xFp + (b.xFp - a.xFp) * t,
  zFp: a.zFp + (b.zFp - a.zFp) * t,
});

function clearSegment(field: NavigationField, from: PointFp, to: PointFp): boolean {
  if (distance(from, to) === 0) return isContinuousPointWalkable(field, from);
  try {
    compile(field, [from, to]);
    return true;
  } catch (error) {
    if (error instanceof RangeError && error.message === 'NO_PATH') return false;
    throw error;
  }
}

function insideFootprint(entry: PlaceEntry, p: PointFp): boolean {
  return isPointInsideConvexPolygon(p, entry.footprint, entry.anchor);
}

export function canEnterPlace(field: NavigationField, entry: PlaceEntry, p: PointFp): boolean {
  if (!insideFootprint(entry, p)) return false;
  if (!isContinuousPointWalkable(field, p)) return false;
  return clearSegment(field, p, entry.anchor);
}

// Move just inside the polygon before integer quantization. It does not move the party.
function insetPoint(entry: PlaceEntry, p: PointFp): PointFp {
  const d = distance(p, entry.anchor);
  const inside = interpolate(p, entry.anchor, Math.min(1, 2 / Math.max(d, 1)));
  return { xFp: Math.round(inside.xFp), zFp: Math.round(inside.zFp) };
}

function edgeProjection(a: PointFp, b: PointFp, p: PointFp): number {
  const dx = b.xFp - a.xFp,
    dz = b.zFp - a.zFp;
  return Math.max(
    0,
    Math.min(1, ((p.xFp - a.xFp) * dx + (p.zFp - a.zFp) * dz) / (dx * dx + dz * dz)),
  );
}

function arrivalTargets(entry: PlaceEntry, start: PointFp): readonly PointFp[] {
  return entry.footprint.flatMap((a, i) => {
    const b = entry.footprint[(i + 1) % entry.footprint.length]!;
    // Uniform edge samples plus the start's nearest point on each edge. No gates.
    return [0, 0.25, 0.5, 0.75, edgeProjection(a, b, start)].map((t) =>
      insetPoint(entry, interpolate(a, b, t)),
    );
  });
}

function segmentEntry(entry: PlaceEntry, from: PointFp, to: PointFp): PointFp | undefined {
  const outline = entry.footprint;
  const orientation = Math.sign(polygonCrossProduct(outline[0]!, outline[1]!, entry.anchor));
  let enter = 0,
    exit = 1;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!,
      b = outline[(i + 1) % outline.length]!;
    const before = orientation * polygonCrossProduct(a, b, from),
      after = orientation * polygonCrossProduct(a, b, to);
    if (before < 0 && after < 0) return undefined;
    if (before < 0) enter = Math.max(enter, before / (before - after));
    if (after < 0) exit = Math.min(exit, before / (before - after));
  }
  if (enter > exit) return undefined;
  return insetPoint(entry, interpolate(from, to, enter));
}

function arrivalPath(field: NavigationField, entry: PlaceEntry, path: readonly PointFp[]) {
  for (let i = 1; i < path.length; i++) {
    const hit = segmentEntry(entry, path[i - 1]!, path[i]!);
    if (hit && canEnterPlace(field, entry, hit)) return [...path.slice(0, i), hit];
  }
  return path;
}

export function planPlaceArrival(
  field: NavigationField,
  entry: PlaceEntry,
  start: PointFp,
): { goal: PointFp; plan: ContinuousMovementPlan } | undefined {
  let best: ReturnType<typeof planPlaceArrival>;
  for (const target of arrivalTargets(entry, start)) {
    if (!canEnterPlace(field, entry, target)) continue;
    const path = findTravelPath(field, start, target);
    if (!path || path.length < 2) continue;
    const trimmed = arrivalPath(field, entry, path);
    const plan = compile(field, trimmed);
    if (!best || BigInt(plan.totalDurationUs) < BigInt(best.plan.totalDurationUs))
      best = { goal: trimmed.at(-1)!, plan };
  }
  return best;
}

import {
  compileMovementPlan,
  findTravelPath,
  isContinuousPointWalkable,
  type ContinuousMovementPlan,
  type NavigationField,
  type PointFp,
} from '@warwrit/game-core';
import { type Pixel } from './porechye-navigation.js';

export interface PlaceApproach {
  readonly name: string;
  readonly center: PointFp;
  readonly radiusFp: number;
}
export interface PlaceEntry {
  readonly name: string;
  // Convex footprint traced around the inhabited yards, excluding the river.
  readonly footprint: readonly PointFp[];
  readonly approaches: readonly PlaceApproach[];
  readonly image: string;
}

// Stand-only annotations of the existing district painting, not access policy.
export function placeEntries(
  point: (p: Pixel) => PointFp,
  fpPerPixel: number,
  offset: Pixel = [0, 0],
): readonly PlaceEntry[] {
  const at = (p: Pixel) => point([p[0] + offset[0], p[1] + offset[1]]);
  const approach = (name: string, p: Pixel, radius: number): PlaceApproach => ({
    name,
    center: at(p),
    radiusFp: radius * fpPerPixel,
  });
  return [
    {
      name: 'Березняк',
      footprint: [
        [145, 170],
        [235, 172],
        [260, 210],
        [248, 255],
        [175, 255],
        [135, 225],
      ].map((p) => at(p as unknown as Pixel)),
      approaches: [
        approach('Западная дорога', [125, 198], 14),
        approach('Восточная дорога', [265, 228], 14),
        approach('Дорога от моста', [265, 275], 14),
      ],
      image: 'bereznyak-painting.png',
    },
    {
      name: 'Каменный Брод',
      footprint: [
        [1060, 285],
        [1195, 285],
        [1248, 340],
        [1240, 425],
        [1115, 440],
        [1065, 400],
        [1035, 340],
      ].map((p) => at(p as unknown as Pixel)),
      approaches: [
        approach('Северная дорога', [1120, 270], 14),
        approach('Восточная дорога', [1255, 383], 14),
        approach('У каменного моста', [1157, 441], 10),
      ],
      image: 'kamenny-brod-painting.png',
    },
  ];
}

const distance = (a: PointFp, b: PointFp) => Math.hypot(a.xFp - b.xFp, a.zFp - b.zFp);
const compile = (field: NavigationField, path: readonly PointFp[]) =>
  compileMovementPlan({ field, path, startedAtMs: '0', movementEpoch: '0', planId: 'place-entry' });

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

function insideFootprint(outline: readonly PointFp[], p: PointFp): boolean {
  const sides = outline.map((a, i) => {
    const b = outline[(i + 1) % outline.length]!;
    return (b.xFp - a.xFp) * (p.zFp - a.zFp) - (b.zFp - a.zFp) * (p.xFp - a.xFp);
  });
  return sides.every((s) => s >= 0) || sides.every((s) => s <= 0);
}

function atApproach(field: NavigationField, approach: PlaceApproach, p: PointFp) {
  return (
    distance(p, approach.center) <= approach.radiusFp && clearSegment(field, p, approach.center)
  );
}

export function canEnterPlace(field: NavigationField, entry: PlaceEntry, p: PointFp): boolean {
  if (!isContinuousPointWalkable(field, p)) return false;
  if (insideFootprint(entry.footprint, p))
    return entry.approaches.some((a) => clearSegment(field, p, a.center));
  return entry.approaches.some((a) => atApproach(field, a, p));
}

// First intersection along a path segment, inset by 1fp before integer rounding.
function circleEntry(from: PointFp, to: PointFp, approach: PlaceApproach): PointFp | undefined {
  const radius = approach.radiusFp - 1;
  const dx = to.xFp - from.xFp,
    dz = to.zFp - from.zFp;
  const x = from.xFp - approach.center.xFp,
    z = from.zFp - approach.center.zFp;
  const a = dx * dx + dz * dz,
    b = 2 * (x * dx + z * dz);
  const c = x * x + z * z - radius * radius;
  if (c <= 0) return from;
  const discriminant = b * b - 4 * a * c;
  if (a === 0 || discriminant < 0) return undefined;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t < 0 || t > 1) return undefined;
  return { xFp: Math.round(from.xFp + t * dx), zFp: Math.round(from.zFp + t * dz) };
}

function approachPath(field: NavigationField, path: readonly PointFp[], approach: PlaceApproach) {
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1]!,
      to = path[i]!;
    const hit = circleEntry(from, to, approach);
    if (hit && atApproach(field, approach, hit)) return [...path.slice(0, i), hit];
    if (atApproach(field, approach, to)) return path.slice(0, i + 1);
  }
  return path;
}

export function planPlaceArrival(
  field: NavigationField,
  entry: PlaceEntry,
  start: PointFp,
): { approach: PlaceApproach; goal: PointFp; plan: ContinuousMovementPlan } | undefined {
  let best: ReturnType<typeof planPlaceArrival>;
  for (const approach of entry.approaches) {
    const path = findTravelPath(field, start, approach.center);
    if (!path || path.length < 2) continue;
    const trimmed = approachPath(field, path, approach);
    const plan = compile(field, trimmed);
    if (!best || BigInt(plan.totalDurationUs) < BigInt(best.plan.totalDurationUs))
      best = { approach, goal: trimmed.at(-1)!, plan };
  }
  return best;
}

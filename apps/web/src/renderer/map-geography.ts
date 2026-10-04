import type { WorldContinuousMapDto } from '@warwrit/protocol';

export function insidePolygon(
  x: number,
  z: number,
  points: readonly { xFp: number; zFp: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!,
      b = points[j]!;
    if (a.zFp > z !== b.zFp > z && x < ((b.xFp - a.xFp) * (z - a.zFp)) / (b.zFp - a.zFp) + a.xFp)
      inside = !inside;
  }
  return inside;
}
export function distanceToPolygonEdge(
  x: number,
  z: number,
  points: readonly { xFp: number; zFp: number }[],
): number {
  let nearest = Infinity;
  for (const [i, a] of points.entries()) {
    const b = points[(i + 1) % points.length]!;
    const dx = b.xFp - a.xFp,
      dz = b.zFp - a.zFp;
    const lengthSquared = dx * dx + dz * dz;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((x - a.xFp) * dx + (z - a.zFp) * dz) / lengthSquared));
    nearest = Math.min(nearest, Math.hypot(x - a.xFp - t * dx, z - a.zFp - t * dz));
  }
  return nearest;
}

export function nearPolygon(
  x: number,
  z: number,
  points: readonly { xFp: number; zFp: number }[],
  distance: number,
): boolean {
  return insidePolygon(x, z, points) || distanceToPolygonEdge(x, z, points) < distance;
}

/** Decorations avoid canonical obstacles and authored roads at the caller's clearance. */
export function decorationObstructed(
  region: WorldContinuousMapDto,
  x: number,
  z: number,
  clearance: number,
): boolean {
  return (
    region.blockingShapes.some((shape) => insidePolygon(x, z, shape.polygon)) ||
    region.overlayShapes.some((shape) => nearPolygon(x, z, shape.polygon, clearance))
  );
}

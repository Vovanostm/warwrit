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
function nearPolygon(
  x: number,
  z: number,
  points: readonly { xFp: number; zFp: number }[],
  distance: number,
): boolean {
  if (insidePolygon(x, z, points)) return true;
  return points.some((a, i) => {
    const b = points[(i + 1) % points.length]!;
    const dx = b.xFp - a.xFp,
      dz = b.zFp - a.zFp;
    const t = Math.max(0, Math.min(1, ((x - a.xFp) * dx + (z - a.zFp) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a.xFp - t * dx, z - a.zFp - t * dz) < distance;
  });
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

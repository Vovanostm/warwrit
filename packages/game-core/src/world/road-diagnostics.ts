import type { NavigationField, PointFp } from './continuous-movement.js';

export interface RoadConnection {
  readonly name: string;
  readonly from: PointFp;
  readonly to: PointFp;
  readonly roadShapePrefix: string;
}

/** Inspect only authored road edges: grid/off-road bypasses cannot satisfy a road connection. */
export function inspectRoadNetwork(field: NavigationField, expected: readonly RoadConnection[]) {
  const points = field.roadPoints ?? [];
  const offset = field.walkable.length;
  const neighbors = (index: number) =>
    (field.roadEdges?.get(index + offset) ?? [])
      .map((node) => node - offset)
      .filter((node) => node >= 0 && node < points.length);
  const reaches = (from: number, to: number, allowed: ReadonlySet<string>) => {
    if (from < 0 || to < 0) return false;
    const visited = new Set([from]);
    const queue = [from];
    for (const current of queue) {
      if (current === to) return true;
      for (const next of neighbors(current)) {
        if (visited.has(next) || !allowed.has(`${current}:${next}`)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    return false;
  };
  const nodeAt = (at: PointFp) => points.findIndex((p) => p.xFp === at.xFp && p.zFp === at.zFp);
  const edges: (readonly [PointFp, PointFp])[] = [];
  points.forEach((from, index) => {
    for (const next of neighbors(index)) if (next > index) edges.push([from, points[next]!]);
  });
  return {
    points,
    edges,
    connections: expected.map((connection) => {
      const allowed = new Set<string>();
      for (const road of field.region.overlayShapes) {
        if (!road.shapeId.startsWith(connection.roadShapePrefix)) continue;
        const stations = road.stations ?? [];
        for (let i = 1; i < stations.length; i++) {
          const a = nodeAt(stations[i - 1]!),
            b = nodeAt(stations[i]!);
          allowed.add(`${a}:${b}`);
          allowed.add(`${b}:${a}`);
        }
      }
      const from = nodeAt(connection.from),
        to = nodeAt(connection.to);
      return {
        ...connection,
        missing: from < 0 || to < 0,
        connected: reaches(from, to, allowed) && reaches(to, from, allowed),
      };
    }),
  };
}

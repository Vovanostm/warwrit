import type { NavigationRegion, PointFp } from './continuous-movement.js';
import { FREE_MOVEMENT_V3_PROFILE } from './continuous-movement.js';
import { SEROE_PORECHYE } from './region.js';

const rect = (x1: number, z1: number, x2: number, z2: number): readonly PointFp[] => [
  { xFp: x1, zFp: z1 },
  { xFp: x2, zFp: z1 },
  { xFp: x2, zFp: z2 },
  { xFp: x1, zFp: z2 },
];
const ROAD_TYPES = {
  'kamenny-brod-bereznyak': { overlayId: 'dirt_road', widthFp: 112 },
  'kamenny-brod-tikhaya-gat': { overlayId: 'dirt_road', widthFp: 112 },
  'kamenny-brod-severny-dvor': { overlayId: 'paved_road', widthFp: 144 },
  'tikhaya-gat-staraya-melnitsa': { overlayId: 'trail', widthFp: 96 },
} as const;
const polygon = (...points: readonly (readonly [number, number])[]): readonly PointFp[] =>
  points.map(([xFp, zFp]) => ({ xFp, zFp }));

/** Continuous editions share canonical fp units; accepted older plans remain frozen. */
export function isContinuousRegionVersion(version: string | undefined): boolean {
  return [
    'seroe-porechye-continuous-v1',
    'seroe-porechye-continuous-v2',
    'seroe-porechye-continuous-v3',
    'seroe-porechye-continuous-v4',
    'seroe-porechye-continuous-v5',
  ].includes(version ?? '');
}
const site = (siteId: string, q: number, r: number, areaId: string) => ({
  siteId,
  areaId,
  anchorFp: { xFp: 1024 * q + 512 * r, zFp: -887 * r },
});

// Authored waypoints follow the lowlands and settlement approaches, not periodic sine waves.
const ROAD_WAYPOINTS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  'kamenny-brod-bereznyak': [
    [-350, -20],
    [-760, -390],
    [-1170, -610],
  ],
  'kamenny-brod-tikhaya-gat': [
    [320, -40],
    [640, -220],
    [720, -490],
    [1040, -680],
    [1280, -620],
  ],
  'kamenny-brod-severny-dvor': [
    [240, -380],
    [170, -880],
    [470, -1250],
    [920, -1400],
    [1220, -1740],
    [1160, -2210],
  ],
  'tikhaya-gat-staraya-melnitsa': [
    [1710, -410],
    [1500, 0],
    [1330, 560],
    [1530, 1120],
    [1820, 1410],
  ],
};

/** Sample a bounded Catmull-Rom centreline once, shared by road speed and drawing. */
function sampleRoad(points: readonly PointFp[]): PointFp[] {
  const result: PointFp[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const d = points[Math.min(points.length - 1, i + 2)]!;
    const steps = Math.ceil(Math.hypot(c.xFp - b.xFp, c.zFp - b.zFp) / 96);
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const interpolate = (v0: number, v1: number, v2: number, v3: number) =>
        Math.round(
          0.5 *
            (2 * v1 +
              (-v0 + v2) * t +
              (2 * v0 - 5 * v1 + 4 * v2 - v3) * t * t +
              (-v0 + 3 * v1 - 3 * v2 + v3) * t * t * t),
        );
      result.push({
        xFp: interpolate(a.xFp, b.xFp, c.xFp, d.xFp),
        zFp: interpolate(a.zFp, b.zFp, c.zFp, d.zFp),
      });
    }
  }
  result.push({ ...points[points.length - 1]! });
  return result;
}

function authoredRoads() {
  const sites = new Map(SEROE_PORECHYE.sites.map((entry) => [entry.siteId, entry]));
  return SEROE_PORECHYE.edges.map((edge) => {
    const roadType = ROAD_TYPES[edge.edgeId as keyof typeof ROAD_TYPES];
    if (!roadType) throw new RangeError('Missing authored road type');
    const from = sites.get(edge.fromSiteId)!.coordinate;
    const to = sites.get(edge.toSiteId)!.coordinate;
    const points = sampleRoad([
      { xFp: 1024 * from.q + 512 * from.r, zFp: -887 * from.r },
      ...polygon(...(ROAD_WAYPOINTS[edge.edgeId] ?? [])),
      { xFp: 1024 * to.q + 512 * to.r, zFp: -887 * to.r },
    ]);
    const left: PointFp[] = [],
      right: PointFp[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i]!;
      const previous = points[Math.max(0, i - 1)]!;
      const next = points[Math.min(points.length - 1, i + 1)]!;
      const length = Math.hypot(next.xFp - previous.xFp, next.zFp - previous.zFp);
      const ux = (next.xFp - previous.xFp) / length;
      const uz = (next.zFp - previous.zFp) / length;
      const halfWidth =
        (roadType.widthFp / 2) * (1 + 0.08 * Math.sin(i * 0.43) + 0.05 * Math.sin(i * 0.93));
      const extension =
        i === 0 ? -roadType.widthFp / 2 : i === points.length - 1 ? roadType.widthFp / 2 : 0;
      const x = point.xFp + ux * extension,
        z = point.zFp + uz * extension;
      const center = { xFp: Math.round(x), zFp: Math.round(z) };
      const offset = { xFp: Math.round(-uz * halfWidth), zFp: Math.round(ux * halfWidth) };
      left.push({ xFp: center.xFp + offset.xFp, zFp: center.zFp + offset.zFp });
      right.push({ xFp: center.xFp - offset.xFp, zFp: center.zFp - offset.zFp });
    }
    return {
      shapeId: edge.edgeId,
      overlayId: roadType.overlayId,
      // Paired banks: forward left side, reversed right side. Renderer uses these exact vertices.
      polygon: [...left, ...right.reverse()],
      stations: points,
    };
  });
}

/** Authored continuous derivative; legacy road editions above remain byte-for-byte compatible. */
export const CONTINUOUS_WORLD_REGION: NavigationRegion = Object.freeze({
  mapEdition: 'seroe-porechye-continuous-v5',
  navigationVersion: 'polygon-v1',
  speedProfileId: FREE_MOVEMENT_V3_PROFILE,
  worldScale: 3,
  origin: Object.freeze({ xFp: -8192, zFp: -6144 }),
  columns: 256,
  rows: 192,
  cellSizeFp: 64,
  boundary: rect(-8192, -6144, 8192, 6144),
  terrainShapes: Object.freeze([
    {
      shapeId: 'field-base',
      terrainId: 'grassland' as const,
      paintPriority: 0,
      polygon: rect(-8192, -6144, 8192, 6144),
    },
    {
      shapeId: 'northwest-woodland',
      terrainId: 'forest' as const,
      paintPriority: 10,
      polygon: polygon(
        [-7100, -3100],
        [-6500, -4250],
        [-5300, -4550],
        [-4300, -4050],
        [-3300, -4500],
        [-2200, -3950],
        [-1600, -2900],
        [-2100, -1800],
        [-1300, -950],
        [-1750, 100],
        [-950, 1050],
        [-1250, 2350],
        [-2100, 2900],
        [-2300, 4200],
        [-3400, 5150],
        [-4700, 4900],
        [-5400, 5600],
        [-6750, 4800],
        [-7250, 3500],
        [-6600, 2200],
        [-7400, 1150],
        [-6800, -200],
        [-7450, -1550],
      ),
    },
    {
      shapeId: 'eastern-pinewood',
      terrainId: 'forest' as const,
      paintPriority: 11,
      polygon: polygon(
        [1400, 2450],
        [1100, 3300],
        [1700, 4350],
        [2850, 4950],
        [3450, 5550],
        [4850, 5250],
        [5700, 5800],
        [7150, 4900],
        [7550, 3650],
        [6900, 2750],
        [7250, 1400],
        [6300, 850],
        [5300, 1250],
        [4350, 800],
        [3600, 1450],
        [2800, 1350],
        [2350, 2150],
      ),
    },
    {
      shapeId: 'southern-uplands',
      terrainId: 'hills' as const,
      paintPriority: 12,
      polygon: polygon(
        [-1600, -6144],
        [-1000, -5000],
        [100, -4400],
        [800, -4650],
        [1650, -3850],
        [2800, -4100],
        [3400, -4800],
        [4550, -4500],
        [5600, -5450],
        [6900, -5100],
        [7900, -5900],
        [8192, -6144],
      ),
    },
    {
      shapeId: 'northern-uplands',
      terrainId: 'hills' as const,
      paintPriority: 12,
      polygon: polygon(
        [-900, 6144],
        [-1250, 5350],
        [-300, 4400],
        [550, 4700],
        [1300, 4100],
        [2150, 4950],
        [3000, 5200],
        [3500, 6144],
      ),
    },
    {
      shapeId: 'east-marsh',
      terrainId: 'marsh' as const,
      paintPriority: 14,
      polygon: polygon(
        [3400, -2350],
        [4000, -3000],
        [5050, -3250],
        [5650, -2750],
        [6650, -3000],
        [7500, -2400],
        [7150, -1350],
        [7600, -450],
        [6850, 200],
        [5900, -100],
        [5300, 600],
        [4300, 300],
        [4050, -650],
        [3300, -1150],
      ),
    },
    {
      shapeId: 'western-riverbank',
      terrainId: 'riverbank' as const,
      paintPriority: 15,
      polygon: polygon(
        [-6250, -850],
        [-5800, -1350],
        [-5100, -950],
        [-4300, -1450],
        [-3750, -650],
        [-4100, 350],
        [-3700, 1300],
        [-4200, 2200],
        [-3950, 3150],
        [-4650, 4000],
        [-5300, 3600],
        [-5500, 2450],
        [-6200, 1950],
        [-5950, 900],
        [-6450, 300],
      ),
    },
    {
      shapeId: 'cliff-lake-bank',
      terrainId: 'riverbank' as const,
      paintPriority: 16,
      polygon: polygon(
        [3850, 1000],
        [4350, 650],
        [5000, 950],
        [5400, 1800],
        [5250, 3100],
        [5450, 4100],
        [5100, 5350],
        [4500, 5500],
        [3850, 4650],
        [4050, 3450],
        [3800, 2300],
      ),
    },
    {
      shapeId: 'cliff-lake',
      terrainId: 'deep_water' as const,
      paintPriority: 20,
      // Entirely inside the retained north-cliff blocker: no old walkable origin is stranded.
      polygon: polygon(
        [4280, 1400],
        [4750, 1270],
        [5000, 1900],
        [4890, 2700],
        [5030, 3450],
        [4800, 4120],
        [4870, 4760],
        [4470, 4900],
        [4240, 4320],
        [4330, 3570],
        [4200, 2850],
        [4360, 2200],
      ),
    },
    {
      shapeId: 'mill-stone-ridge',
      terrainId: 'rock' as const,
      paintPriority: 21,
      polygon: polygon(
        [1000, 2800],
        [1400, 2300],
        [1900, 2550],
        [2400, 2200],
        [2900, 2600],
        [3200, 3400],
        [2600, 3950],
        [2150, 3750],
        [1700, 4250],
        [1150, 3800],
        [1300, 3250],
      ),
    },
    {
      shapeId: 'western-stone-ridge',
      terrainId: 'rock' as const,
      paintPriority: 21,
      polygon: polygon(
        [-3400, 1000],
        [-2920, 800],
        [-2500, 1000],
        [-2180, 1850],
        [-2310, 2900],
        [-2780, 3440],
        [-3300, 3100],
        [-3500, 2100],
      ),
    },
  ]),
  overlayShapes: Object.freeze([...authoredRoads()]),
  blockingShapes: Object.freeze([
    { shapeId: 'west-cliff', polygon: rect(-3072, 1024, -2432, 3072) },
    { shapeId: 'north-cliff', polygon: rect(4096, 1024, 5120, 5120) },
  ]),
  dangerAreaShapes: Object.freeze([
    { areaId: 'staraya-melnitsa-yard', polygon: rect(1792, 1536, 3072, 2304) },
  ]),
  sites: Object.freeze([
    site('kamenny-brod', 0, 0, 'kamenny-brod-market'),
    site('bereznyak', -2, 1, 'bereznyak-green'),
    site('tikhaya-gat', 2, 1, 'tikhaya-gat-bank'),
    site('severny-dvor', 0, 3, 'severny-dvor-yard'),
    site('staraya-melnitsa', 3, -2, 'staraya-melnitsa-yard'),
  ]),
});

export function continuousSite(siteId: string) {
  return CONTINUOUS_WORLD_REGION.sites.find((candidate) => candidate.siteId === siteId);
}

export const CONTINUOUS_REGION_SOURCE_VERSION = SEROE_PORECHYE.version;

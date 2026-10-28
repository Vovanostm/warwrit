import {
  compileMovementPlan,
  FREE_MOVEMENT_ATLAS_LAB_PROFILE,
  isContinuousPointWalkable,
  type NavigationField,
  type NavigationRegion,
  type PointFp,
  type PointMicroFp,
} from '../continuous-movement.js';
import { PAINTED_ATLAS_REGION_VERSION } from '../continuous-region.js';

export type PaintedAtlasPixel = readonly [x: number, y: number];
export const PAINTED_ATLAS_SHEET = Object.freeze({
  width: 4608,
  height: 3072,
  fpPerPixel: 3.5,
  metresPerPixel: 1.5625,
});

/** Convert atlas pixels to the exact world fixed-point frame used by movement. */
export function paintedAtlasPoint([x, y]: PaintedAtlasPixel): PointFp {
  return {
    xFp: Math.round((x - PAINTED_ATLAS_SHEET.width / 2) * PAINTED_ATLAS_SHEET.fpPerPixel),
    zFp: Math.round((PAINTED_ATLAS_SHEET.height / 2 - y) * PAINTED_ATLAS_SHEET.fpPerPixel),
  };
}

/** Convert world fixed-point coordinates back to source-sheet pixels. */
export function paintedAtlasPixel(point: PointFp): PaintedAtlasPixel {
  return [
    point.xFp / PAINTED_ATLAS_SHEET.fpPerPixel + PAINTED_ATLAS_SHEET.width / 2,
    PAINTED_ATLAS_SHEET.height / 2 - point.zFp / PAINTED_ATLAS_SHEET.fpPerPixel,
  ];
}

// Local atlas-v6 corrections: the same traced centreline owns road surface
// polygons and graph stations. Both labs and the server consume this region.
function paintedDirtRoad(
  id: string,
  line: readonly PaintedAtlasPixel[],
  width: number,
): NavigationRegion['overlayShapes'] {
  return line.slice(1).map((to, i) => {
    const from = line[i]!;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const half = width / 2;
    const corner = (p: PaintedAtlasPixel, along: number, across: number) =>
      paintedAtlasPoint([
        p[0] + (dx * along - dy * across) / length,
        p[1] + (dy * along + dx * across) / length,
      ]);
    return {
      shapeId: `${id}-${i}`,
      overlayId: 'dirt_road' as const,
      polygon: [
        corner(from, -half, half),
        corner(to, half, half),
        corner(to, half, -half),
        corner(from, -half, -half),
      ],
      stations: [paintedAtlasPoint(from), paintedAtlasPoint(to)],
    };
  });
}

const atlasGeometry = {
  columns: 252,
  rows: 168,
  cellSizeFp: 64,
  origin: {
    xFp: -8064,
    zFp: -5376,
  },
  boundary: [
    {
      xFp: -8064,
      zFp: 5376,
    },
    {
      xFp: 8064,
      zFp: 5376,
    },
    {
      xFp: 8064,
      zFp: -5376,
    },
    {
      xFp: -8064,
      zFp: -5376,
    },
  ],
  terrainShapes: [
    {
      shapeId: 'atlas-land',
      terrainId: 'grassland',
      paintPriority: 0,
      polygon: [
        {
          xFp: -8064,
          zFp: 5376,
        },
        {
          xFp: 8064,
          zFp: 5376,
        },
        {
          xFp: 8064,
          zFp: -5376,
        },
        {
          xFp: -8064,
          zFp: -5376,
        },
      ],
    },
    {
      shapeId: 'center-wood-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -2688,
          zFp: 1792,
        },
        {
          xFp: -1200,
          zFp: 1792,
        },
        {
          xFp: -1165,
          zFp: 1477,
        },
        {
          xFp: -1270,
          zFp: 1285,
        },
        {
          xFp: -1550,
          zFp: 1180,
        },
        {
          xFp: -1918,
          zFp: 1239,
        },
        {
          xFp: -2240,
          zFp: 994,
        },
        {
          xFp: -2688,
          zFp: 917,
        },
      ],
    },
    {
      shapeId: 'center-wood-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -168,
          zFp: 1792,
        },
        {
          xFp: 2688,
          zFp: 1792,
        },
        {
          xFp: 2688,
          zFp: 480,
        },
        {
          xFp: 2387,
          zFp: 585,
        },
        {
          xFp: 2177,
          zFp: 742,
        },
        {
          xFp: 2002,
          zFp: 602,
        },
        {
          xFp: 1862,
          zFp: 830,
        },
        {
          xFp: 1547,
          zFp: 882,
        },
        {
          xFp: 1617,
          zFp: 1162,
        },
        {
          xFp: 1232,
          zFp: 1267,
        },
        {
          xFp: 1092,
          zFp: 1355,
        },
        {
          xFp: 812,
          zFp: 1281,
        },
        {
          xFp: 392,
          zFp: 1414,
        },
        {
          xFp: 77,
          zFp: 1390,
        },
        {
          xFp: -63,
          zFp: 1554,
        },
      ],
    },
    {
      shapeId: 'center-wood-2',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -2688,
          zFp: -115,
        },
        {
          xFp: -2355,
          zFp: -220,
        },
        {
          xFp: -2093,
          zFp: -483,
        },
        {
          xFp: -1673,
          zFp: -623,
        },
        {
          xFp: -1253,
          zFp: -903,
        },
        {
          xFp: -1480,
          zFp: -1358,
        },
        {
          xFp: -1113,
          zFp: -1792,
        },
        {
          xFp: -2688,
          zFp: -1792,
        },
      ],
    },
    {
      shapeId: 'center-wood-3',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -903,
          zFp: -833,
        },
        {
          xFp: -588,
          zFp: -763,
        },
        {
          xFp: -483,
          zFp: -640,
        },
        {
          xFp: -168,
          zFp: -763,
        },
        {
          xFp: 147,
          zFp: -973,
        },
        {
          xFp: 375,
          zFp: -938,
        },
        {
          xFp: 550,
          zFp: -1218,
        },
        {
          xFp: 917,
          zFp: -1323,
        },
        {
          xFp: 1127,
          zFp: -1792,
        },
        {
          xFp: -1183,
          zFp: -1792,
        },
        {
          xFp: -1148,
          zFp: -1358,
        },
      ],
    },
    {
      shapeId: 'center-wood-4',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 1162,
          zFp: -1533,
        },
        {
          xFp: 1652,
          zFp: -1393,
        },
        {
          xFp: 2002,
          zFp: -1533,
        },
        {
          xFp: 2352,
          zFp: -1463,
        },
        {
          xFp: 2688,
          zFp: -1638,
        },
        {
          xFp: 2688,
          zFp: -1792,
        },
        {
          xFp: 1127,
          zFp: -1792,
        },
      ],
    },
    {
      shapeId: 'center-wet-floodplain',
      terrainId: 'marsh',
      paintPriority: 30,
      polygon: [
        {
          xFp: 1687,
          zFp: -343,
        },
        {
          xFp: 2037,
          zFp: -343,
        },
        {
          xFp: 2688,
          zFp: -588,
        },
        {
          xFp: 2688,
          zFp: -1008,
        },
        {
          xFp: 2317,
          zFp: -885,
        },
        {
          xFp: 1932,
          zFp: -728,
        },
      ],
    },
    {
      shapeId: 'center-mutnya',
      terrainId: 'deep_water',
      paintPriority: 100,
      polygon: [
        {
          xFp: -2688,
          zFp: 623,
        },
        {
          xFp: -2576,
          zFp: 592,
        },
        {
          xFp: -2464,
          zFp: 532,
        },
        {
          xFp: -2352,
          zFp: 515,
        },
        {
          xFp: -2240,
          zFp: 473,
        },
        {
          xFp: -2128,
          zFp: 452,
        },
        {
          xFp: -2016,
          zFp: 406,
        },
        {
          xFp: -1904,
          zFp: 392,
        },
        {
          xFp: -1792,
          zFp: 368,
        },
        {
          xFp: -1680,
          zFp: 354,
        },
        {
          xFp: -1568,
          zFp: 357,
        },
        {
          xFp: -1456,
          zFp: 350,
        },
        {
          xFp: -1344,
          zFp: 333,
        },
        {
          xFp: -1232,
          zFp: 319,
        },
        {
          xFp: -1120,
          zFp: 305,
        },
        {
          xFp: -1008,
          zFp: 238,
        },
        {
          xFp: -896,
          zFp: 182,
        },
        {
          xFp: -784,
          zFp: 95,
        },
        {
          xFp: -672,
          zFp: 53,
        },
        {
          xFp: -560,
          zFp: -21,
        },
        {
          xFp: -448,
          zFp: -73,
        },
        {
          xFp: -336,
          zFp: -119,
        },
        {
          xFp: -224,
          zFp: -129,
        },
        {
          xFp: -112,
          zFp: -185,
        },
        {
          xFp: 0,
          zFp: -164,
        },
        {
          xFp: 112,
          zFp: -157,
        },
        {
          xFp: 224,
          zFp: -105,
        },
        {
          xFp: 336,
          zFp: -63,
        },
        {
          xFp: 448,
          zFp: -21,
        },
        {
          xFp: 560,
          zFp: 18,
        },
        {
          xFp: 672,
          zFp: 56,
        },
        {
          xFp: 784,
          zFp: 63,
        },
        {
          xFp: 896,
          zFp: 84,
        },
        {
          xFp: 1008,
          zFp: 102,
        },
        {
          xFp: 1120,
          zFp: 165,
        },
        {
          xFp: 1232,
          zFp: 172,
        },
        {
          xFp: 1344,
          zFp: 175,
        },
        {
          xFp: 1456,
          zFp: 137,
        },
        {
          xFp: 1568,
          zFp: 119,
        },
        {
          xFp: 1680,
          zFp: 25,
        },
        {
          xFp: 1792,
          zFp: -21,
        },
        {
          xFp: 1904,
          zFp: -63,
        },
        {
          xFp: 2016,
          zFp: -192,
        },
        {
          xFp: 2128,
          zFp: -245,
        },
        {
          xFp: 2240,
          zFp: -273,
        },
        {
          xFp: 2352,
          zFp: -311,
        },
        {
          xFp: 2464,
          zFp: -329,
        },
        {
          xFp: 2576,
          zFp: -374,
        },
        {
          xFp: 2688,
          zFp: -385,
        },
        {
          xFp: 2688,
          zFp: -591,
        },
        {
          xFp: 2576,
          zFp: -556,
        },
        {
          xFp: 2464,
          zFp: -525,
        },
        {
          xFp: 2352,
          zFp: -525,
        },
        {
          xFp: 2240,
          zFp: -493,
        },
        {
          xFp: 2128,
          zFp: -458,
        },
        {
          xFp: 2016,
          zFp: -430,
        },
        {
          xFp: 1904,
          zFp: -381,
        },
        {
          xFp: 1792,
          zFp: -297,
        },
        {
          xFp: 1680,
          zFp: -220,
        },
        {
          xFp: 1568,
          zFp: -143,
        },
        {
          xFp: 1456,
          zFp: -66,
        },
        {
          xFp: 1344,
          zFp: -42,
        },
        {
          xFp: 1232,
          zFp: -63,
        },
        {
          xFp: 1120,
          zFp: -66,
        },
        {
          xFp: 1008,
          zFp: -105,
        },
        {
          xFp: 896,
          zFp: -133,
        },
        {
          xFp: 784,
          zFp: -147,
        },
        {
          xFp: 672,
          zFp: -164,
        },
        {
          xFp: 560,
          zFp: -178,
        },
        {
          xFp: 448,
          zFp: -224,
        },
        {
          xFp: 336,
          zFp: -262,
        },
        {
          xFp: 224,
          zFp: -301,
        },
        {
          xFp: 112,
          zFp: -318,
        },
        {
          xFp: 0,
          zFp: -343,
        },
        {
          xFp: -112,
          zFp: -367,
        },
        {
          xFp: -224,
          zFp: -350,
        },
        {
          xFp: -336,
          zFp: -308,
        },
        {
          xFp: -448,
          zFp: -283,
        },
        {
          xFp: -560,
          zFp: -245,
        },
        {
          xFp: -672,
          zFp: -220,
        },
        {
          xFp: -784,
          zFp: -136,
        },
        {
          xFp: -896,
          zFp: -80,
        },
        {
          xFp: -1008,
          zFp: 32,
        },
        {
          xFp: -1120,
          zFp: 81,
        },
        {
          xFp: -1232,
          zFp: 119,
        },
        {
          xFp: -1344,
          zFp: 119,
        },
        {
          xFp: -1456,
          zFp: 137,
        },
        {
          xFp: -1568,
          zFp: 144,
        },
        {
          xFp: -1680,
          zFp: 158,
        },
        {
          xFp: -1792,
          zFp: 172,
        },
        {
          xFp: -1904,
          zFp: 210,
        },
        {
          xFp: -2016,
          zFp: 249,
        },
        {
          xFp: -2128,
          zFp: 270,
        },
        {
          xFp: -2240,
          zFp: 284,
        },
        {
          xFp: -2352,
          zFp: 305,
        },
        {
          xFp: -2464,
          zFp: 322,
        },
        {
          xFp: -2576,
          zFp: 350,
        },
        {
          xFp: -2688,
          zFp: 392,
        },
      ],
    },
    {
      shapeId: 'center-mill-pool',
      terrainId: 'deep_water',
      paintPriority: 100,
      polygon: [
        {
          xFp: 364,
          zFp: -619,
        },
        {
          xFp: 413,
          zFp: -591,
        },
        {
          xFp: 469,
          zFp: -553,
        },
        {
          xFp: 522,
          zFp: -528,
        },
        {
          xFp: 588,
          zFp: -500,
        },
        {
          xFp: 651,
          zFp: -476,
        },
        {
          xFp: 707,
          zFp: -462,
        },
        {
          xFp: 742,
          zFp: -437,
        },
        {
          xFp: 763,
          zFp: -458,
        },
        {
          xFp: 721,
          zFp: -486,
        },
        {
          xFp: 672,
          zFp: -511,
        },
        {
          xFp: 609,
          zFp: -535,
        },
        {
          xFp: 543,
          zFp: -570,
        },
        {
          xFp: 490,
          zFp: -602,
        },
        {
          xFp: 427,
          zFp: -640,
        },
        {
          xFp: 389,
          zFp: -668,
        },
      ],
    },
    {
      shapeId: 'nw-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -8064,
          zFp: 5376,
        },
        {
          xFp: -2688,
          zFp: 5376,
        },
        {
          xFp: -2688,
          zFp: 4816,
        },
        {
          xFp: -3689,
          zFp: 4571,
        },
        {
          xFp: -3864,
          zFp: 3906,
        },
        {
          xFp: -4564,
          zFp: 3451,
        },
        {
          xFp: -5089,
          zFp: 3976,
        },
        {
          xFp: -5789,
          zFp: 3731,
        },
        {
          xFp: -6489,
          zFp: 4641,
        },
        {
          xFp: -7294,
          zFp: 4151,
        },
        {
          xFp: -8064,
          zFp: 4326,
        },
      ],
    },
    {
      shapeId: 'nw-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -8064,
          zFp: 3731,
        },
        {
          xFp: -7294,
          zFp: 3626,
        },
        {
          xFp: -6839,
          zFp: 3136,
        },
        {
          xFp: -5999,
          zFp: 3381,
        },
        {
          xFp: -5649,
          zFp: 2856,
        },
        {
          xFp: -5789,
          zFp: 1792,
        },
        {
          xFp: -8064,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'nw-forests-2',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -4564,
          zFp: 2506,
        },
        {
          xFp: -3864,
          zFp: 2681,
        },
        {
          xFp: -2688,
          zFp: 2506,
        },
        {
          xFp: -2688,
          zFp: 1792,
        },
        {
          xFp: -4739,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'nw-hills-0',
      terrainId: 'hills',
      paintPriority: 10,
      polygon: [
        {
          xFp: -6489,
          zFp: 5376,
        },
        {
          xFp: -5089,
          zFp: 5376,
        },
        {
          xFp: -4564,
          zFp: 4606,
        },
        {
          xFp: -5334,
          zFp: 4011,
        },
        {
          xFp: -6069,
          zFp: 4501,
        },
      ],
    },
    {
      shapeId: 'n-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -2688,
          zFp: 5376,
        },
        {
          xFp: 2688,
          zFp: 5376,
        },
        {
          xFp: 2688,
          zFp: 4851,
        },
        {
          xFp: 1757,
          zFp: 5026,
        },
        {
          xFp: 1162,
          zFp: 4816,
        },
        {
          xFp: 637,
          zFp: 4886,
        },
        {
          xFp: 112,
          zFp: 4501,
        },
        {
          xFp: -518,
          zFp: 4746,
        },
        {
          xFp: -1113,
          zFp: 4851,
        },
        {
          xFp: -1708,
          zFp: 4326,
        },
        {
          xFp: -2688,
          zFp: 4326,
        },
      ],
    },
    {
      shapeId: 'n-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -2688,
          zFp: 2611,
        },
        {
          xFp: -1988,
          zFp: 2401,
        },
        {
          xFp: -1708,
          zFp: 1792,
        },
        {
          xFp: -2688,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'n-forests-2',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 1757,
          zFp: 2401,
        },
        {
          xFp: 2688,
          zFp: 2646,
        },
        {
          xFp: 2688,
          zFp: 1792,
        },
        {
          xFp: 1722,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'ne-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 2688,
          zFp: 5376,
        },
        {
          xFp: 8064,
          zFp: 5376,
        },
        {
          xFp: 8064,
          zFp: 3976,
        },
        {
          xFp: 7378,
          zFp: 3906,
        },
        {
          xFp: 7133,
          zFp: 4326,
        },
        {
          xFp: 6713,
          zFp: 3941,
        },
        {
          xFp: 6013,
          zFp: 4186,
        },
        {
          xFp: 5488,
          zFp: 3801,
        },
        {
          xFp: 4963,
          zFp: 4151,
        },
        {
          xFp: 4193,
          zFp: 3976,
        },
        {
          xFp: 3388,
          zFp: 4501,
        },
        {
          xFp: 2688,
          zFp: 4361,
        },
      ],
    },
    {
      shapeId: 'ne-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 5838,
          zFp: 3066,
        },
        {
          xFp: 6538,
          zFp: 3206,
        },
        {
          xFp: 7133,
          zFp: 2821,
        },
        {
          xFp: 8064,
          zFp: 3101,
        },
        {
          xFp: 8064,
          zFp: 1792,
        },
        {
          xFp: 6713,
          zFp: 1792,
        },
        {
          xFp: 6363,
          zFp: 2226,
        },
      ],
    },
    {
      shapeId: 'ne-marshes-0',
      terrainId: 'marsh',
      paintPriority: 30,
      polygon: [
        {
          xFp: 4788,
          zFp: 4116,
        },
        {
          xFp: 6188,
          zFp: 3976,
        },
        {
          xFp: 6048,
          zFp: 2926,
        },
        {
          xFp: 6713,
          zFp: 2436,
        },
        {
          xFp: 6188,
          zFp: 1792,
        },
        {
          xFp: 5418,
          zFp: 1792,
        },
        {
          xFp: 5418,
          zFp: 2576,
        },
        {
          xFp: 4858,
          zFp: 3206,
        },
      ],
    },
    {
      shapeId: 'ne-marshes-1',
      terrainId: 'marsh',
      paintPriority: 30,
      polygon: [
        {
          xFp: 2688,
          zFp: 3276,
        },
        {
          xFp: 3913,
          zFp: 3416,
        },
        {
          xFp: 4263,
          zFp: 2786,
        },
        {
          xFp: 3738,
          zFp: 1792,
        },
        {
          xFp: 2688,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'w-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -8064,
          zFp: 1792,
        },
        {
          xFp: -6664,
          zFp: 1792,
        },
        {
          xFp: -6594,
          zFp: 1162,
        },
        {
          xFp: -7154,
          zFp: 917,
        },
        {
          xFp: -8064,
          zFp: 1092,
        },
      ],
    },
    {
      shapeId: 'w-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -8064,
          zFp: -868,
        },
        {
          xFp: -6944,
          zFp: -658,
        },
        {
          xFp: -6384,
          zFp: -1253,
        },
        {
          xFp: -6664,
          zFp: -1792,
        },
        {
          xFp: -8064,
          zFp: -1792,
        },
      ],
    },
    {
      shapeId: 'w-forests-2',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -4004,
          zFp: 1792,
        },
        {
          xFp: -2688,
          zFp: 1792,
        },
        {
          xFp: -2688,
          zFp: 1127,
        },
        {
          xFp: -3514,
          zFp: 917,
        },
      ],
    },
    {
      shapeId: 'w-marshes-0',
      terrainId: 'marsh',
      paintPriority: 30,
      polygon: [
        {
          xFp: -8064,
          zFp: -308,
        },
        {
          xFp: -6839,
          zFp: -658,
        },
        {
          xFp: -5614,
          zFp: -378,
        },
        {
          xFp: -4914,
          zFp: -413,
        },
        {
          xFp: -4039,
          zFp: -308,
        },
        {
          xFp: -3689,
          zFp: -1008,
        },
        {
          xFp: -4389,
          zFp: -1393,
        },
        {
          xFp: -5264,
          zFp: -1323,
        },
        {
          xFp: -6489,
          zFp: -1183,
        },
        {
          xFp: -8064,
          zFp: -973,
        },
      ],
    },
    {
      shapeId: 'w-water-0',
      terrainId: 'deep_water',
      paintPriority: 100,
      polygon: [
        {
          xFp: -8064,
          zFp: -196,
        },
        {
          xFp: -7014,
          zFp: -371,
        },
        {
          xFp: -5894,
          zFp: -126,
        },
        {
          xFp: -4914,
          zFp: 84,
        },
        {
          xFp: -3864,
          zFp: 504,
        },
        {
          xFp: -2688,
          zFp: 623,
        },
        {
          xFp: -2688,
          zFp: 392,
        },
        {
          xFp: -3864,
          zFp: 280,
        },
        {
          xFp: -4914,
          zFp: -140,
        },
        {
          xFp: -5894,
          zFp: -350,
        },
        {
          xFp: -7014,
          zFp: -595,
        },
        {
          xFp: -8064,
          zFp: -420,
        },
      ],
    },
    {
      shapeId: 'e-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 2688,
          zFp: 1792,
        },
        {
          xFp: 8064,
          zFp: 1792,
        },
        {
          xFp: 8064,
          zFp: 1022,
        },
        {
          xFp: 7238,
          zFp: 917,
        },
        {
          xFp: 6888,
          zFp: 1162,
        },
        {
          xFp: 6188,
          zFp: 847,
        },
        {
          xFp: 5488,
          zFp: 1022,
        },
        {
          xFp: 5208,
          zFp: 1372,
        },
        {
          xFp: 4438,
          zFp: 1022,
        },
        {
          xFp: 3738,
          zFp: 1267,
        },
        {
          xFp: 2688,
          zFp: 952,
        },
      ],
    },
    {
      shapeId: 'e-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 6538,
          zFp: -1183,
        },
        {
          xFp: 7308,
          zFp: -1008,
        },
        {
          xFp: 8064,
          zFp: -1288,
        },
        {
          xFp: 8064,
          zFp: -1792,
        },
        {
          xFp: 6538,
          zFp: -1792,
        },
      ],
    },
    {
      shapeId: 'e-marshes-0',
      terrainId: 'marsh',
      paintPriority: 30,
      polygon: [
        {
          xFp: 2688,
          zFp: -623,
        },
        {
          xFp: 3913,
          zFp: -483,
        },
        {
          xFp: 4788,
          zFp: -728,
        },
        {
          xFp: 5663,
          zFp: -1078,
        },
        {
          xFp: 6713,
          zFp: -1113,
        },
        {
          xFp: 8064,
          zFp: -1008,
        },
        {
          xFp: 8064,
          zFp: -1393,
        },
        {
          xFp: 6538,
          zFp: -1393,
        },
        {
          xFp: 5663,
          zFp: -1638,
        },
        {
          xFp: 4438,
          zFp: -1078,
        },
        {
          xFp: 3563,
          zFp: -938,
        },
        {
          xFp: 2688,
          zFp: -1008,
        },
      ],
    },
    {
      shapeId: 'e-water-0',
      terrainId: 'deep_water',
      paintPriority: 100,
      polygon: [
        {
          xFp: 2688,
          zFp: -385,
        },
        {
          xFp: 4032,
          zFp: -196,
        },
        {
          xFp: 4928,
          zFp: -441,
        },
        {
          xFp: 5663,
          zFp: -756,
        },
        {
          xFp: 6538,
          zFp: -686,
        },
        {
          xFp: 8064,
          zFp: -581,
        },
        {
          xFp: 8064,
          zFp: -805,
        },
        {
          xFp: 6538,
          zFp: -910,
        },
        {
          xFp: 5663,
          zFp: -980,
        },
        {
          xFp: 4928,
          zFp: -665,
        },
        {
          xFp: 4032,
          zFp: -420,
        },
        {
          xFp: 2688,
          zFp: -591,
        },
      ],
    },
    {
      shapeId: 'sw-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -8064,
          zFp: -1792,
        },
        {
          xFp: -6769,
          zFp: -1792,
        },
        {
          xFp: -6384,
          zFp: -2352,
        },
        {
          xFp: -5964,
          zFp: -2142,
        },
        {
          xFp: -5264,
          zFp: -2422,
        },
        {
          xFp: -5404,
          zFp: -3192,
        },
        {
          xFp: -6139,
          zFp: -3402,
        },
        {
          xFp: -6384,
          zFp: -4067,
        },
        {
          xFp: -5964,
          zFp: -4592,
        },
        {
          xFp: -6384,
          zFp: -5376,
        },
        {
          xFp: -8064,
          zFp: -5376,
        },
      ],
    },
    {
      shapeId: 'sw-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -4914,
          zFp: -1792,
        },
        {
          xFp: -2688,
          zFp: -1792,
        },
        {
          xFp: -2688,
          zFp: -2772,
        },
        {
          xFp: -3339,
          zFp: -3017,
        },
        {
          xFp: -3864,
          zFp: -2667,
        },
        {
          xFp: -4564,
          zFp: -2947,
        },
      ],
    },
    {
      shapeId: 'sw-forests-2',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -5089,
          zFp: -4242,
        },
        {
          xFp: -4389,
          zFp: -4172,
        },
        {
          xFp: -4214,
          zFp: -4872,
        },
        {
          xFp: -3339,
          zFp: -5117,
        },
        {
          xFp: -2688,
          zFp: -4942,
        },
        {
          xFp: -2688,
          zFp: -5376,
        },
        {
          xFp: -5404,
          zFp: -5376,
        },
      ],
    },
    {
      shapeId: 'sw-hills-0',
      terrainId: 'hills',
      paintPriority: 10,
      polygon: [
        {
          xFp: -5089,
          zFp: -3367,
        },
        {
          xFp: -3864,
          zFp: -3367,
        },
        {
          xFp: -2814,
          zFp: -3962,
        },
        {
          xFp: -2989,
          zFp: -4767,
        },
        {
          xFp: -4039,
          zFp: -5012,
        },
        {
          xFp: -4564,
          zFp: -4242,
        },
      ],
    },
    {
      shapeId: 's-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -2688,
          zFp: -1792,
        },
        {
          xFp: -1288,
          zFp: -1792,
        },
        {
          xFp: -1113,
          zFp: -2212,
        },
        {
          xFp: -238,
          zFp: -2142,
        },
        {
          xFp: 287,
          zFp: -2667,
        },
        {
          xFp: 812,
          zFp: -2422,
        },
        {
          xFp: 1162,
          zFp: -1792,
        },
        {
          xFp: 2688,
          zFp: -1792,
        },
        {
          xFp: 2688,
          zFp: -2422,
        },
        {
          xFp: 1862,
          zFp: -2667,
        },
        {
          xFp: 1162,
          zFp: -2842,
        },
        {
          xFp: 112,
          zFp: -3017,
        },
        {
          xFp: -588,
          zFp: -2667,
        },
        {
          xFp: -1463,
          zFp: -2842,
        },
        {
          xFp: -2163,
          zFp: -2492,
        },
        {
          xFp: -2688,
          zFp: -2562,
        },
      ],
    },
    {
      shapeId: 's-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: -2688,
          zFp: -4417,
        },
        {
          xFp: -1988,
          zFp: -4207,
        },
        {
          xFp: -1463,
          zFp: -4592,
        },
        {
          xFp: -1638,
          zFp: -5376,
        },
        {
          xFp: -2688,
          zFp: -5376,
        },
      ],
    },
    {
      shapeId: 's-forests-2',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 1687,
          zFp: -4242,
        },
        {
          xFp: 2688,
          zFp: -4172,
        },
        {
          xFp: 2688,
          zFp: -5376,
        },
        {
          xFp: 1512,
          zFp: -5376,
        },
      ],
    },
    {
      shapeId: 'se-forests-0',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 2688,
          zFp: -1792,
        },
        {
          xFp: 4263,
          zFp: -1792,
        },
        {
          xFp: 4438,
          zFp: -2352,
        },
        {
          xFp: 5138,
          zFp: -2247,
        },
        {
          xFp: 5418,
          zFp: -2842,
        },
        {
          xFp: 4788,
          zFp: -3192,
        },
        {
          xFp: 4018,
          zFp: -2842,
        },
        {
          xFp: 3283,
          zFp: -3052,
        },
        {
          xFp: 2688,
          zFp: -2632,
        },
      ],
    },
    {
      shapeId: 'se-forests-1',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 7238,
          zFp: -1792,
        },
        {
          xFp: 8064,
          zFp: -1792,
        },
        {
          xFp: 8064,
          zFp: -3192,
        },
        {
          xFp: 7308,
          zFp: -3367,
        },
        {
          xFp: 7063,
          zFp: -2667,
        },
      ],
    },
    {
      shapeId: 'se-forests-2',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 2688,
          zFp: -4242,
        },
        {
          xFp: 3563,
          zFp: -4172,
        },
        {
          xFp: 4438,
          zFp: -4767,
        },
        {
          xFp: 4193,
          zFp: -5376,
        },
        {
          xFp: 2688,
          zFp: -5376,
        },
      ],
    },
    {
      shapeId: 'se-forests-3',
      terrainId: 'forest',
      paintPriority: 20,
      polygon: [
        {
          xFp: 6888,
          zFp: -4522,
        },
        {
          xFp: 8064,
          zFp: -4312,
        },
        {
          xFp: 8064,
          zFp: -5376,
        },
        {
          xFp: 6608,
          zFp: -5376,
        },
      ],
    },
    {
      shapeId: 'se-marshes-0',
      terrainId: 'marsh',
      paintPriority: 30,
      polygon: [
        {
          xFp: 5488,
          zFp: -3892,
        },
        {
          xFp: 6888,
          zFp: -3857,
        },
        {
          xFp: 7308,
          zFp: -4697,
        },
        {
          xFp: 6713,
          zFp: -5082,
        },
        {
          xFp: 5838,
          zFp: -4837,
        },
        {
          xFp: 5418,
          zFp: -4382,
        },
      ],
    },
    {
      shapeId: 'se-hills-0',
      terrainId: 'hills',
      paintPriority: 10,
      polygon: [
        {
          xFp: 2863,
          zFp: -2142,
        },
        {
          xFp: 4193,
          zFp: -2037,
        },
        {
          xFp: 4788,
          zFp: -2772,
        },
        {
          xFp: 4438,
          zFp: -3472,
        },
        {
          xFp: 3563,
          zFp: -3542,
        },
        {
          xFp: 3038,
          zFp: -2982,
        },
      ],
    },
    {
      shapeId: 'se-water-0',
      terrainId: 'deep_water',
      paintPriority: 100,
      polygon: [
        {
          xFp: 6129,
          zFp: -4385,
        },
        {
          xFp: 6188,
          zFp: -4340,
        },
        {
          xFp: 6328,
          zFp: -4336,
        },
        {
          xFp: 6440,
          zFp: -4382,
        },
        {
          xFp: 6489,
          zFp: -4434,
        },
        {
          xFp: 6468,
          zFp: -4529,
        },
        {
          xFp: 6363,
          zFp: -4592,
        },
        {
          xFp: 6237,
          zFp: -4581,
        },
        {
          xFp: 6143,
          zFp: -4522,
        },
        {
          xFp: 6118,
          zFp: -4448,
        },
      ],
    },
  ],
  overlayShapes: [
    {
      shapeId: 'center-trunk-north-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1368,
          zFp: 1710,
        },
        {
          xFp: 1332,
          zFp: 1280,
        },
        {
          xFp: 1341,
          zFp: 1279,
        },
        {
          xFp: 1377,
          zFp: 1709,
        },
      ],
      stations: [
        {
          xFp: 1372,
          zFp: 1705,
        },
        {
          xFp: 1337,
          zFp: 1285,
        },
      ],
    },
    {
      shapeId: 'center-trunk-north-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1334,
          zFp: 1291,
        },
        {
          xFp: 1226,
          zFp: 879,
        },
        {
          xFp: 1236,
          zFp: 876,
        },
        {
          xFp: 1343,
          zFp: 1288,
        },
      ],
      stations: [
        {
          xFp: 1337,
          zFp: 1285,
        },
        {
          xFp: 1232,
          zFp: 882,
        },
      ],
    },
    {
      shapeId: 'center-trunk-north-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1225,
          zFp: 886,
        },
        {
          xFp: 1351,
          zFp: 543,
        },
        {
          xFp: 1362,
          zFp: 546,
        },
        {
          xFp: 1236,
          zFp: 889,
        },
      ],
      stations: [
        {
          xFp: 1232,
          zFp: 882,
        },
        {
          xFp: 1355,
          zFp: 550,
        },
      ],
    },
    {
      shapeId: 'center-trunk-north-3',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1349,
          zFp: 555,
        },
        {
          xFp: 1353,
          zFp: 198,
        },
        {
          xFp: 1363,
          zFp: 198,
        },
        {
          xFp: 1360,
          zFp: 555,
        },
      ],
      stations: [
        {
          xFp: 1355,
          zFp: 550,
        },
        {
          xFp: 1358,
          zFp: 203,
        },
      ],
    },
    {
      shapeId: 'center-brod-bridge-0',
      overlayId: 'bridge',
      polygon: [
        {
          xFp: 1353,
          zFp: 208,
        },
        {
          xFp: 1353,
          zFp: -89,
        },
        {
          xFp: 1363,
          zFp: -89,
        },
        {
          xFp: 1363,
          zFp: 208,
        },
      ],
      stations: [
        {
          xFp: 1358,
          zFp: 203,
        },
        {
          xFp: 1358,
          zFp: -84,
        },
      ],
    },
    {
      shapeId: 'center-trunk-south-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1351,
          zFp: -80,
        },
        {
          xFp: 1456,
          zFp: -385,
        },
        {
          xFp: 1467,
          zFp: -381,
        },
        {
          xFp: 1362,
          zFp: -77,
        },
      ],
      stations: [
        {
          xFp: 1358,
          zFp: -84,
        },
        {
          xFp: 1460,
          zFp: -378,
        },
      ],
    },
    ...paintedDirtRoad(
      'center-trunk-south-junction',
      [
        [2721, 1644],
        [2740, 1686],
        [2770, 1738],
        [2800, 1775],
        [2850, 1798],
        [2906, 1824],
      ],
      6,
    ),
    ...paintedDirtRoad(
      'center-south-field-link',
      [
        [2636, 2048],
        [2630, 2032],
        [2615, 2015],
        [2598, 2000],
        [2580, 1982],
        [2565, 1963],
        [2552, 1942],
        [2547, 1925],
        [2548, 1910],
        [2553, 1895],
        [2560, 1875],
        [2572, 1858],
        [2590, 1846],
        [2615, 1837],
        [2640, 1831],
        [2665, 1824],
        [2700, 1813],
        [2725, 1805],
        [2760, 1793],
        [2800, 1775],
      ],
      8,
    ),
    {
      shapeId: 'center-trunk-south-3',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 2100,
          zFp: -1011,
        },
        {
          xFp: 2390,
          zFp: -1155,
        },
        {
          xFp: 2394,
          zFp: -1145,
        },
        {
          xFp: 2104,
          zFp: -1001,
        },
      ],
      stations: [
        {
          xFp: 2107,
          zFp: -1008,
        },
        {
          xFp: 2387,
          zFp: -1148,
        },
      ],
    },
    {
      shapeId: 'center-trunk-south-4',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 2380,
          zFp: -1149,
        },
        {
          xFp: 2633,
          zFp: -1365,
        },
        {
          xFp: 2639,
          zFp: -1357,
        },
        {
          xFp: 2386,
          zFp: -1141,
        },
      ],
      stations: [
        {
          xFp: 2387,
          zFp: -1148,
        },
        {
          xFp: 2632,
          zFp: -1358,
        },
      ],
    },
    {
      shapeId: 'center-north-villages-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -2554,
          zFp: 1123,
        },
        {
          xFp: -2001,
          zFp: 1016,
        },
        {
          xFp: -1999,
          zFp: 1026,
        },
        {
          xFp: -2552,
          zFp: 1133,
        },
      ],
      stations: [
        {
          xFp: -2548,
          zFp: 1127,
        },
        {
          xFp: -2005,
          zFp: 1022,
        },
      ],
    },
    {
      shapeId: 'center-north-villages-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -2012,
          zFp: 1018,
        },
        {
          xFp: -1354,
          zFp: 946,
        },
        {
          xFp: -1352,
          zFp: 956,
        },
        {
          xFp: -2010,
          zFp: 1028,
        },
      ],
      stations: [
        {
          xFp: -2005,
          zFp: 1022,
        },
        {
          xFp: -1358,
          zFp: 952,
        },
      ],
    },
    {
      shapeId: 'center-north-villages-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -1361,
          zFp: 946,
        },
        {
          xFp: -827,
          zFp: 1071,
        },
        {
          xFp: -829,
          zFp: 1081,
        },
        {
          xFp: -1364,
          zFp: 956,
        },
      ],
      stations: [
        {
          xFp: -1358,
          zFp: 952,
        },
        {
          xFp: -833,
          zFp: 1075,
        },
      ],
    },
    {
      shapeId: 'center-north-villages-3',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -837,
          zFp: 1068,
        },
        {
          xFp: -232,
          zFp: 1140,
        },
        {
          xFp: -234,
          zFp: 1151,
        },
        {
          xFp: -839,
          zFp: 1079,
        },
      ],
      stations: [
        {
          xFp: -833,
          zFp: 1075,
        },
        {
          xFp: -238,
          zFp: 1145,
        },
      ],
    },
    {
      shapeId: 'center-north-villages-4',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -244,
          zFp: 1140,
        },
        {
          xFp: 466,
          zFp: 1016,
        },
        {
          xFp: 468,
          zFp: 1026,
        },
        {
          xFp: -242,
          zFp: 1151,
        },
      ],
      stations: [
        {
          xFp: -238,
          zFp: 1145,
        },
        {
          xFp: 462,
          zFp: 1022,
        },
      ],
    },
    {
      shapeId: 'center-north-villages-5',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 456,
          zFp: 1018,
        },
        {
          xFp: 1236,
          zFp: 876,
        },
        {
          xFp: 1238,
          zFp: 886,
        },
        {
          xFp: 458,
          zFp: 1028,
        },
      ],
      stations: [
        {
          xFp: 462,
          zFp: 1022,
        },
        {
          xFp: 1232,
          zFp: 882,
        },
      ],
    },
    {
      shapeId: 'center-karaulny-north-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -2012,
          zFp: 1021,
        },
        {
          xFp: -1602,
          zFp: 700,
        },
        {
          xFp: -1596,
          zFp: 708,
        },
        {
          xFp: -2006,
          zFp: 1029,
        },
      ],
      stations: [
        {
          xFp: -2005,
          zFp: 1022,
        },
        {
          xFp: -1603,
          zFp: 707,
        },
      ],
    },
    {
      shapeId: 'center-karaulny-north-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -1608,
          zFp: 712,
        },
        {
          xFp: -1591,
          zFp: 376,
        },
        {
          xFp: -1580,
          zFp: 376,
        },
        {
          xFp: -1598,
          zFp: 712,
        },
      ],
      stations: [
        {
          xFp: -1603,
          zFp: 707,
        },
        {
          xFp: -1585,
          zFp: 382,
        },
      ],
    },
    {
      shapeId: 'center-karaulny-bridge-0',
      overlayId: 'bridge',
      polygon: [
        {
          xFp: -1591,
          zFp: 387,
        },
        {
          xFp: -1591,
          zFp: 107,
        },
        {
          xFp: -1580,
          zFp: 107,
        },
        {
          xFp: -1580,
          zFp: 387,
        },
      ],
      stations: [
        {
          xFp: -1585,
          zFp: 382,
        },
        {
          xFp: -1585,
          zFp: 112,
        },
      ],
    },
    {
      shapeId: 'center-karaulny-south-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -1589,
          zFp: 116,
        },
        {
          xFp: -1571,
          zFp: -171,
        },
        {
          xFp: -1564,
          zFp: -171,
        },
        {
          xFp: -1582,
          zFp: 116,
        },
      ],
      stations: [
        {
          xFp: -1585,
          zFp: 112,
        },
        {
          xFp: -1568,
          zFp: -168,
        },
      ],
    },
    {
      shapeId: 'center-karaulny-south-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -1572,
          zFp: -170,
        },
        {
          xFp: -1076,
          zFp: -417,
        },
        {
          xFp: -1074,
          zFp: -411,
        },
        {
          xFp: -1570,
          zFp: -164,
        },
      ],
      stations: [
        {
          xFp: -1568,
          zFp: -168,
        },
        {
          xFp: -1078,
          zFp: -413,
        },
      ],
    },
    {
      shapeId: 'center-karaulny-south-2',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -1081,
          zFp: -416,
        },
        {
          xFp: -410,
          zFp: -504,
        },
        {
          xFp: -409,
          zFp: -498,
        },
        {
          xFp: -1081,
          zFp: -409,
        },
      ],
      stations: [
        {
          xFp: -1078,
          zFp: -413,
        },
        {
          xFp: -413,
          zFp: -500,
        },
      ],
    },
    {
      shapeId: 'center-karaulny-south-3',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -416,
          zFp: -505,
        },
        {
          xFp: 151,
          zFp: -381,
        },
        {
          xFp: 150,
          zFp: -374,
        },
        {
          xFp: -417,
          zFp: -498,
        },
      ],
      stations: [
        {
          xFp: -413,
          zFp: -500,
        },
        {
          xFp: 147,
          zFp: -378,
        },
      ],
    },
    {
      shapeId: 'center-mill-path-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 1360,
          zFp: -80,
        },
        {
          xFp: 843,
          zFp: -341,
        },
        {
          xFp: 845,
          zFp: -347,
        },
        {
          xFp: 1362,
          zFp: -86,
        },
      ],
      stations: [
        {
          xFp: 1358,
          zFp: -84,
        },
        {
          xFp: 847,
          zFp: -343,
        },
      ],
    },
    {
      shapeId: 'center-mill-path-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 849,
          zFp: -339,
        },
        {
          xFp: 458,
          zFp: -481,
        },
        {
          xFp: 460,
          zFp: -487,
        },
        {
          xFp: 851,
          zFp: -345,
        },
      ],
      stations: [
        {
          xFp: 847,
          zFp: -343,
        },
        {
          xFp: 462,
          zFp: -483,
        },
      ],
    },
    {
      shapeId: 'center-mill-path-2',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 466,
          zFp: -480,
        },
        {
          xFp: 144,
          zFp: -374,
        },
        {
          xFp: 143,
          zFp: -381,
        },
        {
          xFp: 465,
          zFp: -487,
        },
      ],
      stations: [
        {
          xFp: 462,
          zFp: -483,
        },
        {
          xFp: 147,
          zFp: -378,
        },
      ],
    },
    {
      shapeId: 'center-south-west-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -1568,
          zFp: -163,
        },
        {
          xFp: -1906,
          zFp: -483,
        },
        {
          xFp: -1900,
          zFp: -488,
        },
        {
          xFp: -1563,
          zFp: -168,
        },
      ],
      stations: [
        {
          xFp: -1568,
          zFp: -168,
        },
        {
          xFp: -1900,
          zFp: -483,
        },
      ],
    },
    {
      shapeId: 'center-south-west-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -1900,
          zFp: -478,
        },
        {
          xFp: -2273,
          zFp: -868,
        },
        {
          xFp: -2268,
          zFp: -873,
        },
        {
          xFp: -1895,
          zFp: -483,
        },
      ],
      stations: [
        {
          xFp: -1900,
          zFp: -483,
        },
        {
          xFp: -2268,
          zFp: -868,
        },
      ],
    },
    {
      shapeId: 'center-south-west-2',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -2267,
          zFp: -863,
        },
        {
          xFp: -2588,
          zFp: -1095,
        },
        {
          xFp: -2584,
          zFp: -1101,
        },
        {
          xFp: -2263,
          zFp: -869,
        },
      ],
      stations: [
        {
          xFp: -2268,
          zFp: -868,
        },
        {
          xFp: -2583,
          zFp: -1095,
        },
      ],
    },
    {
      shapeId: 'center-field-access-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -241,
          zFp: 1148,
        },
        {
          xFp: -276,
          zFp: 529,
        },
        {
          xFp: -269,
          zFp: 529,
        },
        {
          xFp: -234,
          zFp: 1148,
        },
      ],
      stations: [
        {
          xFp: -238,
          zFp: 1145,
        },
        {
          xFp: -273,
          zFp: 532,
        },
      ],
    },
    {
      shapeId: 'center-field-access-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -272,
          zFp: 537,
        },
        {
          xFp: -593,
          zFp: 270,
        },
        {
          xFp: -589,
          zFp: 264,
        },
        {
          xFp: -268,
          zFp: 531,
        },
      ],
      stations: [
        {
          xFp: -273,
          zFp: 532,
        },
        {
          xFp: -588,
          zFp: 270,
        },
      ],
    },
    {
      shapeId: 'center-field-access-2',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -586,
          zFp: 274,
        },
        {
          xFp: -820,
          zFp: 149,
        },
        {
          xFp: -817,
          zFp: 143,
        },
        {
          xFp: -584,
          zFp: 268,
        },
      ],
      stations: [
        {
          xFp: -588,
          zFp: 270,
        },
        {
          xFp: -815,
          zFp: 147,
        },
      ],
    },
    {
      shapeId: 'center-center-north-edge-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1367,
          zFp: 1797,
        },
        {
          xFp: 1332,
          zFp: 1279,
        },
        {
          xFp: 1342,
          zFp: 1279,
        },
        {
          xFp: 1377,
          zFp: 1797,
        },
      ],
      stations: [
        {
          xFp: 1372,
          zFp: 1792,
        },
        {
          xFp: 1337,
          zFp: 1285,
        },
      ],
    },
    ...paintedDirtRoad(
      'center-center-east-edge',
      [
        [2691, 1379],
        [2735, 1378],
        [2790, 1380],
        [2845, 1386],
        [2900, 1396],
        [2940, 1402],
        [2970, 1413],
        [2990, 1438],
        [2998, 1447],
        [3015, 1454],
        [3040, 1460],
        [3072, 1454],
      ],
      6,
    ),
    {
      shapeId: 'center-center-west-edge-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -2693,
          zFp: 1122,
        },
        {
          xFp: -2543,
          zFp: 1122,
        },
        {
          xFp: -2543,
          zFp: 1132,
        },
        {
          xFp: -2693,
          zFp: 1132,
        },
      ],
      stations: [
        {
          xFp: -2688,
          zFp: 1127,
        },
        {
          xFp: -2548,
          zFp: 1127,
        },
      ],
    },
    {
      shapeId: 'center-center-south-east-edge-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 2625,
          zFp: -1360,
        },
        {
          xFp: 2690,
          zFp: -1400,
        },
        {
          xFp: 2695,
          zFp: -1391,
        },
        {
          xFp: 2630,
          zFp: -1351,
        },
      ],
      stations: [
        {
          xFp: 2632,
          zFp: -1358,
        },
        {
          xFp: 2688,
          zFp: -1393,
        },
      ],
    },
    {
      shapeId: 'nw-road-0-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5260,
          zFp: 1789,
        },
        {
          xFp: -5401,
          zFp: 2615,
        },
        {
          xFp: -5408,
          zFp: 2614,
        },
        {
          xFp: -5267,
          zFp: 1788,
        },
      ],
      stations: [
        {
          xFp: -5264,
          zFp: 1792,
        },
        {
          xFp: -5404,
          zFp: 2611,
        },
      ],
    },
    {
      shapeId: 'nw-road-0-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5399,
          zFp: 2611,
        },
        {
          xFp: -5964,
          zFp: 3281,
        },
        {
          xFp: -5969,
          zFp: 3276,
        },
        {
          xFp: -5404,
          zFp: 2606,
        },
      ],
      stations: [
        {
          xFp: -5404,
          zFp: 2611,
        },
        {
          xFp: -5964,
          zFp: 3276,
        },
      ],
    },
    {
      shapeId: 'nw-road-0-2',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5960,
          zFp: 3274,
        },
        {
          xFp: -6487,
          zFp: 4225,
        },
        {
          xFp: -6493,
          zFp: 4223,
        },
        {
          xFp: -5966,
          zFp: 3272,
        },
      ],
      stations: [
        {
          xFp: -5964,
          zFp: 3276,
        },
        {
          xFp: -6489,
          zFp: 4221,
        },
      ],
    },
    {
      shapeId: 'nw-road-1-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -5407,
          zFp: 2605,
        },
        {
          xFp: -4208,
          zFp: 2923,
        },
        {
          xFp: -4210,
          zFp: 2932,
        },
        {
          xFp: -5410,
          zFp: 2615,
        },
      ],
      stations: [
        {
          xFp: -5404,
          zFp: 2611,
        },
        {
          xFp: -4214,
          zFp: 2926,
        },
      ],
    },
    {
      shapeId: 'nw-road-1-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -4219,
          zFp: 2921,
        },
        {
          xFp: -2683,
          zFp: 2921,
        },
        {
          xFp: -2683,
          zFp: 2931,
        },
        {
          xFp: -4219,
          zFp: 2931,
        },
      ],
      stations: [
        {
          xFp: -4214,
          zFp: 2926,
        },
        {
          xFp: -2688,
          zFp: 2926,
        },
      ],
    },
    {
      shapeId: 'nw-road-2-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -4211,
          zFp: 2922,
        },
        {
          xFp: -4035,
          zFp: 3629,
        },
        {
          xFp: -4042,
          zFp: 3630,
        },
        {
          xFp: -4218,
          zFp: 2923,
        },
      ],
      stations: [
        {
          xFp: -4214,
          zFp: 2926,
        },
        {
          xFp: -4039,
          zFp: 3626,
        },
      ],
    },
    {
      shapeId: 'nw-road-2-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -4035,
          zFp: 3623,
        },
        {
          xFp: -4141,
          zFp: 4330,
        },
        {
          xFp: -4148,
          zFp: 4329,
        },
        {
          xFp: -4042,
          zFp: 3622,
        },
      ],
      stations: [
        {
          xFp: -4039,
          zFp: 3626,
        },
        {
          xFp: -4144,
          zFp: 4326,
        },
      ],
    },
    {
      shapeId: 'n-road-0-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -2693,
          zFp: 2921,
        },
        {
          xFp: -408,
          zFp: 3096,
        },
        {
          xFp: -408,
          zFp: 3106,
        },
        {
          xFp: -2693,
          zFp: 2931,
        },
      ],
      stations: [
        {
          xFp: -2688,
          zFp: 2926,
        },
        {
          xFp: -413,
          zFp: 3101,
        },
      ],
    },
    {
      shapeId: 'n-road-0-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -417,
          zFp: 3095,
        },
        {
          xFp: 468,
          zFp: 3272,
        },
        {
          xFp: 466,
          zFp: 3282,
        },
        {
          xFp: -419,
          zFp: 3105,
        },
      ],
      stations: [
        {
          xFp: -413,
          zFp: 3101,
        },
        {
          xFp: 462,
          zFp: 3276,
        },
      ],
    },
    {
      shapeId: 'n-road-0-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 455,
          zFp: 3278,
        },
        {
          xFp: 985,
          zFp: 2394,
        },
        {
          xFp: 994,
          zFp: 2399,
        },
        {
          xFp: 464,
          zFp: 3283,
        },
      ],
      stations: [
        {
          xFp: 462,
          zFp: 3276,
        },
        {
          xFp: 987,
          zFp: 2401,
        },
      ],
    },
    {
      shapeId: 'n-road-0-3',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 980,
          zFp: 2403,
        },
        {
          xFp: 1370,
          zFp: 1785,
        },
        {
          xFp: 1379,
          zFp: 1790,
        },
        {
          xFp: 989,
          zFp: 2408,
        },
      ],
      stations: [
        {
          xFp: 987,
          zFp: 2401,
        },
        {
          xFp: 1372,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'n-road-1-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 458,
          zFp: 3270,
        },
        {
          xFp: 2694,
          zFp: 3622,
        },
        {
          xFp: 2692,
          zFp: 3632,
        },
        {
          xFp: 456,
          zFp: 3280,
        },
      ],
      stations: [
        {
          xFp: 462,
          zFp: 3276,
        },
        {
          xFp: 2688,
          zFp: 3626,
        },
      ],
    },
    {
      shapeId: 'n-road-2-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 463,
          zFp: 3269,
        },
        {
          xFp: 994,
          zFp: 3977,
        },
        {
          xFp: 986,
          zFp: 3983,
        },
        {
          xFp: 455,
          zFp: 3275,
        },
      ],
      stations: [
        {
          xFp: 462,
          zFp: 3276,
        },
        {
          xFp: 987,
          zFp: 3976,
        },
      ],
    },
    {
      shapeId: 'n-road-2-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 989,
          zFp: 3969,
        },
        {
          xFp: 1344,
          zFp: 4503,
        },
        {
          xFp: 1335,
          zFp: 4508,
        },
        {
          xFp: 980,
          zFp: 3974,
        },
      ],
      stations: [
        {
          xFp: 987,
          zFp: 3976,
        },
        {
          xFp: 1337,
          zFp: 4501,
        },
      ],
    },
    {
      shapeId: 'n-road-2-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1342,
          zFp: 4496,
        },
        {
          xFp: 1377,
          zFp: 5311,
        },
        {
          xFp: 1367,
          zFp: 5311,
        },
        {
          xFp: 1332,
          zFp: 4496,
        },
      ],
      stations: [
        {
          xFp: 1337,
          zFp: 4501,
        },
        {
          xFp: 1372,
          zFp: 5306,
        },
      ],
    },
    {
      shapeId: 'n-road-3-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -408,
          zFp: 3100,
        },
        {
          xFp: -937,
          zFp: 3806,
        },
        {
          xFp: -943,
          zFp: 3802,
        },
        {
          xFp: -414,
          zFp: 3096,
        },
      ],
      stations: [
        {
          xFp: -413,
          zFp: 3101,
        },
        {
          xFp: -938,
          zFp: 3801,
        },
      ],
    },
    {
      shapeId: 'n-road-3-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -934,
          zFp: 3798,
        },
        {
          xFp: -1110,
          zFp: 4330,
        },
        {
          xFp: -1117,
          zFp: 4329,
        },
        {
          xFp: -941,
          zFp: 3797,
        },
      ],
      stations: [
        {
          xFp: -938,
          zFp: 3801,
        },
        {
          xFp: -1113,
          zFp: 4326,
        },
      ],
    },
    {
      shapeId: 'n-road-4-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 991,
          zFp: 2398,
        },
        {
          xFp: 991,
          zFp: 2720,
        },
        {
          xFp: 984,
          zFp: 2720,
        },
        {
          xFp: 984,
          zFp: 2398,
        },
      ],
      stations: [
        {
          xFp: 987,
          zFp: 2401,
        },
        {
          xFp: 987,
          zFp: 2716,
        },
      ],
    },
    {
      shapeId: 'ne-road-0-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 2685,
          zFp: 3623,
        },
        {
          xFp: 4442,
          zFp: 3798,
        },
        {
          xFp: 4442,
          zFp: 3805,
        },
        {
          xFp: 2685,
          zFp: 3630,
        },
      ],
      stations: [
        {
          xFp: 2688,
          zFp: 3626,
        },
        {
          xFp: 4438,
          zFp: 3801,
        },
      ],
    },
    {
      shapeId: 'ne-road-0-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 4433,
          zFp: 3802,
        },
        {
          xFp: 4857,
          zFp: 3201,
        },
        {
          xFp: 4863,
          zFp: 3205,
        },
        {
          xFp: 4439,
          zFp: 3806,
        },
      ],
      stations: [
        {
          xFp: 4438,
          zFp: 3801,
        },
        {
          xFp: 4858,
          zFp: 3206,
        },
      ],
    },
    {
      shapeId: 'ne-road-1-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 4436,
          zFp: 3797,
        },
        {
          xFp: 5842,
          zFp: 4324,
        },
        {
          xFp: 5840,
          zFp: 4330,
        },
        {
          xFp: 4434,
          zFp: 3803,
        },
      ],
      stations: [
        {
          xFp: 4438,
          zFp: 3801,
        },
        {
          xFp: 5838,
          zFp: 4326,
        },
      ],
    },
    {
      shapeId: 'ne-road-1-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 5835,
          zFp: 4322,
        },
        {
          xFp: 6367,
          zFp: 4498,
        },
        {
          xFp: 6366,
          zFp: 4505,
        },
        {
          xFp: 5834,
          zFp: 4329,
        },
      ],
      stations: [
        {
          xFp: 5838,
          zFp: 4326,
        },
        {
          xFp: 6363,
          zFp: 4501,
        },
      ],
    },
    {
      shapeId: 'ne-road-2-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 5416,
          zFp: 2580,
        },
        {
          xFp: 5134,
          zFp: 1790,
        },
        {
          xFp: 5140,
          zFp: 1788,
        },
        {
          xFp: 5422,
          zFp: 2578,
        },
      ],
      stations: [
        {
          xFp: 5418,
          zFp: 2576,
        },
        {
          xFp: 5138,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'ne-road-3-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 5414,
          zFp: 2573,
        },
        {
          xFp: 6191,
          zFp: 2397,
        },
        {
          xFp: 6192,
          zFp: 2404,
        },
        {
          xFp: 5415,
          zFp: 2580,
        },
      ],
      stations: [
        {
          xFp: 5418,
          zFp: 2576,
        },
        {
          xFp: 6188,
          zFp: 2401,
        },
      ],
    },
    {
      shapeId: 'ne-road-3-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 6185,
          zFp: 2398,
        },
        {
          xFp: 6892,
          zFp: 2468,
        },
        {
          xFp: 6892,
          zFp: 2475,
        },
        {
          xFp: 6185,
          zFp: 2405,
        },
      ],
      stations: [
        {
          xFp: 6188,
          zFp: 2401,
        },
        {
          xFp: 6888,
          zFp: 2471,
        },
      ],
    },
    {
      shapeId: 'ne-road-4-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 4861,
          zFp: 3210,
        },
        {
          xFp: 4504,
          zFp: 3104,
        },
        {
          xFp: 4505,
          zFp: 3097,
        },
        {
          xFp: 4862,
          zFp: 3203,
        },
      ],
      stations: [
        {
          xFp: 4858,
          zFp: 3206,
        },
        {
          xFp: 4508,
          zFp: 3101,
        },
      ],
    },
    {
      shapeId: 'ne-road-4-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 4505,
          zFp: 3105,
        },
        {
          xFp: 4505,
          zFp: 2573,
        },
        {
          xFp: 4512,
          zFp: 2573,
        },
        {
          xFp: 4512,
          zFp: 3105,
        },
      ],
      stations: [
        {
          xFp: 4508,
          zFp: 3101,
        },
        {
          xFp: 4508,
          zFp: 2576,
        },
      ],
    },
    {
      shapeId: 'ne-road-4-2',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 4505,
          zFp: 2573,
        },
        {
          xFp: 5422,
          zFp: 2573,
        },
        {
          xFp: 5422,
          zFp: 2580,
        },
        {
          xFp: 4505,
          zFp: 2580,
        },
      ],
      stations: [
        {
          xFp: 4508,
          zFp: 2576,
        },
        {
          xFp: 5418,
          zFp: 2576,
        },
      ],
    },
    {
      shapeId: 'w-road-0-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -5270,
          zFp: 1796,
        },
        {
          xFp: -5092,
          zFp: 1156,
        },
        {
          xFp: -5083,
          zFp: 1159,
        },
        {
          xFp: -5260,
          zFp: 1798,
        },
      ],
      stations: [
        {
          xFp: -5264,
          zFp: 1792,
        },
        {
          xFp: -5089,
          zFp: 1162,
        },
      ],
    },
    {
      shapeId: 'w-road-0-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -5095,
          zFp: 1158,
        },
        {
          xFp: -4035,
          zFp: 1051,
        },
        {
          xFp: -4033,
          zFp: 1061,
        },
        {
          xFp: -5093,
          zFp: 1168,
        },
      ],
      stations: [
        {
          xFp: -5089,
          zFp: 1162,
        },
        {
          xFp: -4039,
          zFp: 1057,
        },
      ],
    },
    {
      shapeId: 'w-road-0-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -4044,
          zFp: 1052,
        },
        {
          xFp: -2683,
          zFp: 1122,
        },
        {
          xFp: -2683,
          zFp: 1132,
        },
        {
          xFp: -4044,
          zFp: 1062,
        },
      ],
      stations: [
        {
          xFp: -4039,
          zFp: 1057,
        },
        {
          xFp: -2688,
          zFp: 1127,
        },
      ],
    },
    {
      shapeId: 'w-road-1-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5086,
          zFp: 1166,
        },
        {
          xFp: -6493,
          zFp: 920,
        },
        {
          xFp: -6492,
          zFp: 913,
        },
        {
          xFp: -5085,
          zFp: 1159,
        },
      ],
      stations: [
        {
          xFp: -5089,
          zFp: 1162,
        },
        {
          xFp: -6489,
          zFp: 917,
        },
      ],
    },
    {
      shapeId: 'w-road-2-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5092,
          zFp: 1166,
        },
        {
          xFp: -5092,
          zFp: 599,
        },
        {
          xFp: -5085,
          zFp: 599,
        },
        {
          xFp: -5085,
          zFp: 1166,
        },
      ],
      stations: [
        {
          xFp: -5089,
          zFp: 1162,
        },
        {
          xFp: -5089,
          zFp: 602,
        },
      ],
    },
    {
      shapeId: 'w-road-2-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5090,
          zFp: 607,
        },
        {
          xFp: -5339,
          zFp: 286,
        },
        {
          xFp: -5333,
          zFp: 282,
        },
        {
          xFp: -5084,
          zFp: 603,
        },
      ],
      stations: [
        {
          xFp: -5089,
          zFp: 602,
        },
        {
          xFp: -5334,
          zFp: 287,
        },
      ],
    },
    {
      shapeId: 'w-road-3-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -5960,
          zFp: -1798,
        },
        {
          xFp: -5783,
          zFp: -1179,
        },
        {
          xFp: -5792,
          zFp: -1177,
        },
        {
          xFp: -5970,
          zFp: -1795,
        },
      ],
      stations: [
        {
          xFp: -5964,
          zFp: -1792,
        },
        {
          xFp: -5789,
          zFp: -1183,
        },
      ],
    },
    {
      shapeId: 'w-road-3-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -5794,
          zFp: -1188,
        },
        {
          xFp: -4209,
          zFp: -1118,
        },
        {
          xFp: -4209,
          zFp: -1108,
        },
        {
          xFp: -5794,
          zFp: -1178,
        },
      ],
      stations: [
        {
          xFp: -5789,
          zFp: -1183,
        },
        {
          xFp: -4214,
          zFp: -1113,
        },
      ],
    },
    {
      shapeId: 'w-road-3-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -4219,
          zFp: -1118,
        },
        {
          xFp: -2683,
          zFp: -1101,
        },
        {
          xFp: -2683,
          zFp: -1090,
        },
        {
          xFp: -4219,
          zFp: -1108,
        },
      ],
      stations: [
        {
          xFp: -4214,
          zFp: -1113,
        },
        {
          xFp: -2688,
          zFp: -1095,
        },
      ],
    },
    {
      shapeId: 'e-road-0-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 2684,
          zFp: 281,
        },
        {
          xFp: 3919,
          zFp: 563,
        },
        {
          xFp: 3917,
          zFp: 573,
        },
        {
          xFp: 2682,
          zFp: 291,
        },
      ],
      stations: [
        {
          xFp: 2688,
          zFp: 287,
        },
        {
          xFp: 3913,
          zFp: 567,
        },
      ],
    },
    {
      shapeId: 'e-road-0-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 3912,
          zFp: 560,
        },
        {
          xFp: 5145,
          zFp: 1441,
        },
        {
          xFp: 5139,
          zFp: 1449,
        },
        {
          xFp: 3906,
          zFp: 568,
        },
      ],
      stations: [
        {
          xFp: 3913,
          zFp: 567,
        },
        {
          xFp: 5138,
          zFp: 1442,
        },
      ],
    },
    {
      shapeId: 'e-road-0-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 5143,
          zFp: 1437,
        },
        {
          xFp: 5143,
          zFp: 1797,
        },
        {
          xFp: 5133,
          zFp: 1797,
        },
        {
          xFp: 5133,
          zFp: 1437,
        },
      ],
      stations: [
        {
          xFp: 5138,
          zFp: 1442,
        },
        {
          xFp: 5138,
          zFp: 1792,
        },
      ],
    },
    {
      shapeId: 'e-road-1-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 3916,
          zFp: 560,
        },
        {
          xFp: 4095,
          zFp: 920,
        },
        {
          xFp: 4085,
          zFp: 924,
        },
        {
          xFp: 3906,
          zFp: 564,
        },
      ],
      stations: [
        {
          xFp: 3913,
          zFp: 567,
        },
        {
          xFp: 4088,
          zFp: 917,
        },
      ],
    },
    {
      shapeId: 'e-road-2-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 3910,
          zFp: 564,
        },
        {
          xFp: 5667,
          zFp: 389,
        },
        {
          xFp: 5667,
          zFp: 396,
        },
        {
          xFp: 3910,
          zFp: 571,
        },
      ],
      stations: [
        {
          xFp: 3913,
          zFp: 567,
        },
        {
          xFp: 5663,
          zFp: 392,
        },
      ],
    },
    {
      shapeId: 'e-road-2-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 5660,
          zFp: 389,
        },
        {
          xFp: 6542,
          zFp: 319,
        },
        {
          xFp: 6542,
          zFp: 326,
        },
        {
          xFp: 5660,
          zFp: 396,
        },
      ],
      stations: [
        {
          xFp: 5663,
          zFp: 392,
        },
        {
          xFp: 6538,
          zFp: 322,
        },
      ],
    },
    {
      shapeId: 'e-road-3-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 2684,
          zFp: -1399,
        },
        {
          xFp: 4094,
          zFp: -1187,
        },
        {
          xFp: 4092,
          zFp: -1177,
        },
        {
          xFp: 2682,
          zFp: -1389,
        },
      ],
      stations: [
        {
          xFp: 2688,
          zFp: -1393,
        },
        {
          xFp: 4088,
          zFp: -1183,
        },
      ],
    },
    {
      shapeId: 'e-road-3-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 4082,
          zFp: -1187,
        },
        {
          xFp: 5492,
          zFp: -1364,
        },
        {
          xFp: 5494,
          zFp: -1354,
        },
        {
          xFp: 4084,
          zFp: -1177,
        },
      ],
      stations: [
        {
          xFp: 4088,
          zFp: -1183,
        },
        {
          xFp: 5488,
          zFp: -1358,
        },
      ],
    },
    {
      shapeId: 'e-road-3-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 5481,
          zFp: -1360,
        },
        {
          xFp: 6190,
          zFp: -1799,
        },
        {
          xFp: 6195,
          zFp: -1790,
        },
        {
          xFp: 5486,
          zFp: -1351,
        },
      ],
      stations: [
        {
          xFp: 5488,
          zFp: -1358,
        },
        {
          xFp: 6188,
          zFp: -1792,
        },
      ],
    },
    {
      shapeId: 'sw-road-0-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -5969,
          zFp: -1787,
        },
        {
          xFp: -5969,
          zFp: -2847,
        },
        {
          xFp: -5959,
          zFp: -2847,
        },
        {
          xFp: -5959,
          zFp: -1787,
        },
      ],
      stations: [
        {
          xFp: -5964,
          zFp: -1792,
        },
        {
          xFp: -5964,
          zFp: -2842,
        },
      ],
    },
    {
      shapeId: 'sw-road-0-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -5971,
          zFp: -2844,
        },
        {
          xFp: -4912,
          zFp: -3549,
        },
        {
          xFp: -4907,
          zFp: -3540,
        },
        {
          xFp: -5966,
          zFp: -2835,
        },
      ],
      stations: [
        {
          xFp: -5964,
          zFp: -2842,
        },
        {
          xFp: -4914,
          zFp: -3542,
        },
      ],
    },
    {
      shapeId: 'sw-road-0-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -4919,
          zFp: -3547,
        },
        {
          xFp: -2683,
          zFp: -3477,
        },
        {
          xFp: -2683,
          zFp: -3467,
        },
        {
          xFp: -4919,
          zFp: -3537,
        },
      ],
      stations: [
        {
          xFp: -4914,
          zFp: -3542,
        },
        {
          xFp: -2688,
          zFp: -3472,
        },
      ],
    },
    {
      shapeId: 'sw-road-1-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5960,
          zFp: -2838,
        },
        {
          xFp: -6492,
          zFp: -2838,
        },
        {
          xFp: -6492,
          zFp: -2845,
        },
        {
          xFp: -5960,
          zFp: -2845,
        },
      ],
      stations: [
        {
          xFp: -5964,
          zFp: -2842,
        },
        {
          xFp: -6489,
          zFp: -2842,
        },
      ],
    },
    {
      shapeId: 'sw-road-2-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -5964,
          zFp: -2837,
        },
        {
          xFp: -6669,
          zFp: -3542,
        },
        {
          xFp: -6664,
          zFp: -3547,
        },
        {
          xFp: -5959,
          zFp: -2842,
        },
      ],
      stations: [
        {
          xFp: -5964,
          zFp: -2842,
        },
        {
          xFp: -6664,
          zFp: -3542,
        },
      ],
    },
    {
      shapeId: 'sw-road-2-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -6667,
          zFp: -3538,
        },
        {
          xFp: -6843,
          zFp: -4455,
        },
        {
          xFp: -6836,
          zFp: -4456,
        },
        {
          xFp: -6660,
          zFp: -3539,
        },
      ],
      stations: [
        {
          xFp: -6664,
          zFp: -3542,
        },
        {
          xFp: -6839,
          zFp: -4452,
        },
      ],
    },
    {
      shapeId: 'sw-road-3-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -4919,
          zFp: -3543,
        },
        {
          xFp: -4213,
          zFp: -4072,
        },
        {
          xFp: -4209,
          zFp: -4066,
        },
        {
          xFp: -4915,
          zFp: -3537,
        },
      ],
      stations: [
        {
          xFp: -4914,
          zFp: -3542,
        },
        {
          xFp: -4214,
          zFp: -4067,
        },
      ],
    },
    {
      shapeId: 'sw-road-3-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -4219,
          zFp: -4066,
        },
        {
          xFp: -3865,
          zFp: -4597,
        },
        {
          xFp: -3859,
          zFp: -4593,
        },
        {
          xFp: -4213,
          zFp: -4062,
        },
      ],
      stations: [
        {
          xFp: -4214,
          zFp: -4067,
        },
        {
          xFp: -3864,
          zFp: -4592,
        },
      ],
    },
    {
      shapeId: 's-road-0-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -2693,
          zFp: -3477,
        },
        {
          xFp: -933,
          zFp: -3372,
        },
        {
          xFp: -933,
          zFp: -3362,
        },
        {
          xFp: -2693,
          zFp: -3467,
        },
      ],
      stations: [
        {
          xFp: -2688,
          zFp: -3472,
        },
        {
          xFp: -938,
          zFp: -3367,
        },
      ],
    },
    {
      shapeId: 's-road-0-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: -944,
          zFp: -3371,
        },
        {
          xFp: 816,
          zFp: -3548,
        },
        {
          xFp: 818,
          zFp: -3538,
        },
        {
          xFp: -942,
          zFp: -3361,
        },
      ],
      stations: [
        {
          xFp: -938,
          zFp: -3367,
        },
        {
          xFp: 812,
          zFp: -3542,
        },
      ],
    },
    {
      shapeId: 's-road-0-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 807,
          zFp: -3547,
        },
        {
          xFp: 2693,
          zFp: -3547,
        },
        {
          xFp: 2693,
          zFp: -3537,
        },
        {
          xFp: 807,
          zFp: -3537,
        },
      ],
      stations: [
        {
          xFp: 812,
          zFp: -3542,
        },
        {
          xFp: 2688,
          zFp: -3542,
        },
      ],
    },
    {
      shapeId: 's-road-1-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 1160,
          zFp: -1788,
        },
        {
          xFp: 808,
          zFp: -2669,
        },
        {
          xFp: 814,
          zFp: -2671,
        },
        {
          xFp: 1166,
          zFp: -1790,
        },
      ],
      stations: [
        {
          xFp: 1162,
          zFp: -1792,
        },
        {
          xFp: 812,
          zFp: -2667,
        },
      ],
    },
    {
      shapeId: 's-road-1-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 809,
          zFp: -2663,
        },
        {
          xFp: 809,
          zFp: -3545,
        },
        {
          xFp: 816,
          zFp: -3545,
        },
        {
          xFp: 816,
          zFp: -2663,
        },
      ],
      stations: [
        {
          xFp: 812,
          zFp: -2667,
        },
        {
          xFp: 812,
          zFp: -3542,
        },
      ],
    },
    {
      shapeId: 's-road-2-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 806,
          zFp: -3538,
        },
        {
          xFp: 1159,
          zFp: -4773,
        },
        {
          xFp: 1168,
          zFp: -4770,
        },
        {
          xFp: 816,
          zFp: -3536,
        },
      ],
      stations: [
        {
          xFp: 812,
          zFp: -3542,
        },
        {
          xFp: 1162,
          zFp: -4767,
        },
      ],
    },
    {
      shapeId: 's-road-2-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 1157,
          zFp: -4762,
        },
        {
          xFp: 1157,
          zFp: -5311,
        },
        {
          xFp: 1167,
          zFp: -5311,
        },
        {
          xFp: 1167,
          zFp: -4762,
        },
      ],
      stations: [
        {
          xFp: 1162,
          zFp: -4767,
        },
        {
          xFp: 1162,
          zFp: -5306,
        },
      ],
    },
    {
      shapeId: 's-road-3-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -933,
          zFp: -3367,
        },
        {
          xFp: -1288,
          zFp: -3012,
        },
        {
          xFp: -1293,
          zFp: -3017,
        },
        {
          xFp: -938,
          zFp: -3372,
        },
      ],
      stations: [
        {
          xFp: -938,
          zFp: -3367,
        },
        {
          xFp: -1288,
          zFp: -3017,
        },
      ],
    },
    {
      shapeId: 's-road-4-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -942,
          zFp: -3365,
        },
        {
          xFp: -590,
          zFp: -4071,
        },
        {
          xFp: -584,
          zFp: -4069,
        },
        {
          xFp: -936,
          zFp: -3363,
        },
      ],
      stations: [
        {
          xFp: -938,
          zFp: -3367,
        },
        {
          xFp: -588,
          zFp: -4067,
        },
      ],
    },
    {
      shapeId: 's-road-4-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: -592,
          zFp: -4064,
        },
        {
          xFp: -416,
          zFp: -4771,
        },
        {
          xFp: -409,
          zFp: -4770,
        },
        {
          xFp: -585,
          zFp: -4063,
        },
      ],
      stations: [
        {
          xFp: -588,
          zFp: -4067,
        },
        {
          xFp: -413,
          zFp: -4767,
        },
      ],
    },
    {
      shapeId: 'se-road-0-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 2684,
          zFp: -3548,
        },
        {
          xFp: 3919,
          zFp: -3371,
        },
        {
          xFp: 3917,
          zFp: -3361,
        },
        {
          xFp: 2682,
          zFp: -3538,
        },
      ],
      stations: [
        {
          xFp: 2688,
          zFp: -3542,
        },
        {
          xFp: 3913,
          zFp: -3367,
        },
      ],
    },
    {
      shapeId: 'se-road-0-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 3907,
          zFp: -3371,
        },
        {
          xFp: 5667,
          zFp: -3548,
        },
        {
          xFp: 5669,
          zFp: -3538,
        },
        {
          xFp: 3909,
          zFp: -3361,
        },
      ],
      stations: [
        {
          xFp: 3913,
          zFp: -3367,
        },
        {
          xFp: 5663,
          zFp: -3542,
        },
      ],
    },
    {
      shapeId: 'se-road-0-2',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 5660,
          zFp: -3549,
        },
        {
          xFp: 6720,
          zFp: -3020,
        },
        {
          xFp: 6716,
          zFp: -3010,
        },
        {
          xFp: 5656,
          zFp: -3539,
        },
      ],
      stations: [
        {
          xFp: 5663,
          zFp: -3542,
        },
        {
          xFp: 6713,
          zFp: -3017,
        },
      ],
    },
    {
      shapeId: 'se-road-1-0',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 6184,
          zFp: -1786,
        },
        {
          xFp: 6007,
          zFp: -2566,
        },
        {
          xFp: 6017,
          zFp: -2568,
        },
        {
          xFp: 6194,
          zFp: -1788,
        },
      ],
      stations: [
        {
          xFp: 6188,
          zFp: -1792,
        },
        {
          xFp: 6013,
          zFp: -2562,
        },
      ],
    },
    {
      shapeId: 'se-road-1-1',
      overlayId: 'dirt_road',
      polygon: [
        {
          xFp: 6010,
          zFp: -2555,
        },
        {
          xFp: 5656,
          zFp: -3545,
        },
        {
          xFp: 5667,
          zFp: -3549,
        },
        {
          xFp: 6020,
          zFp: -2558,
        },
      ],
      stations: [
        {
          xFp: 6013,
          zFp: -2562,
        },
        {
          xFp: 5663,
          zFp: -3542,
        },
      ],
    },
    {
      shapeId: 'se-road-2-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 3917,
          zFp: -3370,
        },
        {
          xFp: 3917,
          zFp: -2838,
        },
        {
          xFp: 3910,
          zFp: -2838,
        },
        {
          xFp: 3910,
          zFp: -3370,
        },
      ],
      stations: [
        {
          xFp: 3913,
          zFp: -3367,
        },
        {
          xFp: 3913,
          zFp: -2842,
        },
      ],
    },
    {
      shapeId: 'se-road-3-0',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 5659,
          zFp: -3539,
        },
        {
          xFp: 5835,
          zFp: -4071,
        },
        {
          xFp: 5842,
          zFp: -4070,
        },
        {
          xFp: 5666,
          zFp: -3538,
        },
      ],
      stations: [
        {
          xFp: 5663,
          zFp: -3542,
        },
        {
          xFp: 5838,
          zFp: -4067,
        },
      ],
    },
    {
      shapeId: 'se-road-3-1',
      overlayId: 'trail',
      polygon: [
        {
          xFp: 5833,
          zFp: -4067,
        },
        {
          xFp: 6083,
          zFp: -4300,
        },
        {
          xFp: 6088,
          zFp: -4294,
        },
        {
          xFp: 5838,
          zFp: -4062,
        },
      ],
      stations: [
        {
          xFp: 5838,
          zFp: -4067,
        },
        {
          xFp: 6083,
          zFp: -4294,
        },
      ],
    },
  ],
  blockingShapes: [],
  dangerAreaShapes: [],
} as const;

function freezePoints(points: readonly PointFp[]): readonly PointFp[] {
  return Object.freeze(points.map((point) => Object.freeze({ ...point })));
}

function freezeShapes<T extends { readonly polygon: readonly PointFp[] }>(
  shapes: readonly T[],
): readonly T[] {
  return Object.freeze(
    shapes.map((shape) =>
      Object.freeze({
        ...shape,
        polygon: freezePoints(shape.polygon),
        ...('stations' in shape && shape.stations
          ? { stations: freezePoints(shape.stations as readonly PointFp[]) }
          : {}),
      }),
    ),
  );
}

export interface PaintedAtlasSite {
  readonly siteId: string;
  readonly areaId: string;
  readonly name: string;
  readonly anchorFp: PointFp;
}

export interface PaintedAtlasEntryZone {
  readonly siteId: string;
  readonly areaId: string;
  readonly name: string;
  /** Original single-tile pixels; the center atlas tile is applied by the projector. */
  readonly footprintPixels: readonly PaintedAtlasPixel[];
  readonly anchorPixel: PaintedAtlasPixel;
}

export const PAINTED_ATLAS_ENTRY_ZONES: readonly PaintedAtlasEntryZone[] = Object.freeze([
  {
    siteId: 'bereznyak',
    areaId: 'bereznyak-green',
    name: 'Березняк',
    footprintPixels: [
      [120, 170],
      [240, 160],
      [280, 205],
      [280, 265],
      [230, 285],
      [150, 275],
      [118, 230],
    ],
    anchorPixel: [195, 220],
  },
  {
    siteId: 'kamenny-brod',
    areaId: 'kamenny-brod-market',
    name: 'Каменный Брод',
    footprintPixels: [
      [1040, 275],
      [1195, 270],
      [1270, 330],
      [1260, 435],
      [1160, 450],
      [1080, 435],
      [1020, 365],
    ],
    anchorPixel: [1125, 365],
  },
]);

export const PAINTED_ATLAS_SITES: readonly PaintedAtlasSite[] = Object.freeze(
  [
    {
      siteId: 'bereznyak',
      areaId: 'bereznyak-green',
      name: 'Березняк',
      anchorFp: {
        xFp: -2005,
        zFp: 1022,
      },
    },
    {
      siteId: 'severny-dvor',
      areaId: 'severny-dvor-yard',
      name: 'Северный Двор',
      anchorFp: {
        xFp: -238,
        zFp: 1145,
      },
    },
    {
      siteId: 'kamenny-brod',
      areaId: 'kamenny-brod-market',
      name: 'Каменный Брод',
      anchorFp: {
        xFp: 1250,
        zFp: 515,
      },
    },
    {
      siteId: 'tikhaya-gat',
      areaId: 'tikhaya-gat-bank',
      name: 'Тихая Гать',
      anchorFp: {
        xFp: 2177,
        zFp: -1008,
      },
    },
    {
      siteId: 'staraya-melnitsa',
      areaId: 'staraya-melnitsa-yard',
      name: 'Старая мельница',
      anchorFp: {
        xFp: 147,
        zFp: -378,
      },
    },
    {
      siteId: 'porechye-atlas-site-06',
      areaId: 'porechye-atlas-area-06',
      name: 'Караульный мост',
      anchorFp: {
        xFp: -1585,
        zFp: 249,
      },
    },
    {
      siteId: 'porechye-atlas-site-07',
      areaId: 'porechye-atlas-area-07',
      name: 'Вязов · разрушен',
      anchorFp: {
        xFp: -1953,
        zFp: 130,
      },
    },
    {
      siteId: 'porechye-atlas-site-08',
      areaId: 'porechye-atlas-area-08',
      name: 'Земляные редуты',
      anchorFp: {
        xFp: -1148,
        zFp: 1372,
      },
    },
    {
      siteId: 'porechye-atlas-site-09',
      areaId: 'porechye-atlas-area-09',
      name: 'Братские ямы',
      anchorFp: {
        xFp: 725,
        zFp: -388,
      },
    },
    {
      siteId: 'porechye-atlas-site-10',
      areaId: 'porechye-atlas-area-10',
      name: 'Глинистый берег',
      anchorFp: {
        xFp: -903,
        zFp: 287,
      },
    },
    {
      siteId: 'porechye-atlas-site-11',
      areaId: 'porechye-atlas-area-11',
      name: 'Смолокурня',
      anchorFp: {
        xFp: -6489,
        zFp: 4221,
      },
    },
    {
      siteId: 'porechye-atlas-site-12',
      areaId: 'porechye-atlas-area-12',
      name: 'Ловчая стоянка',
      anchorFp: {
        xFp: -4144,
        zFp: 4326,
      },
    },
    {
      siteId: 'porechye-atlas-site-13',
      areaId: 'porechye-atlas-area-13',
      name: 'Старая сторожка',
      anchorFp: {
        xFp: -5404,
        zFp: 2611,
      },
    },
    {
      siteId: 'porechye-atlas-site-14',
      areaId: 'porechye-atlas-area-14',
      name: 'Житный амбар',
      anchorFp: {
        xFp: 812,
        zFp: 3329,
      },
    },
    {
      siteId: 'porechye-atlas-site-15',
      areaId: 'porechye-atlas-area-15',
      name: 'Садовый хутор',
      anchorFp: {
        xFp: -1113,
        zFp: 4326,
      },
    },
    {
      siteId: 'porechye-atlas-site-16',
      areaId: 'porechye-atlas-area-16',
      name: 'Северный выгон',
      anchorFp: {
        xFp: 1337,
        zFp: 4501,
      },
    },
    {
      siteId: 'porechye-atlas-site-17',
      areaId: 'porechye-atlas-area-17',
      name: 'Торфяные резы',
      anchorFp: {
        xFp: 6363,
        zFp: 4501,
      },
    },
    {
      siteId: 'porechye-atlas-site-18',
      areaId: 'porechye-atlas-area-18',
      name: 'Просевшая гать',
      anchorFp: {
        xFp: 5138,
        zFp: 2926,
      },
    },
    {
      siteId: 'porechye-atlas-site-19',
      areaId: 'porechye-atlas-area-19',
      name: 'Зимняя делянка',
      anchorFp: {
        xFp: 6888,
        zFp: 2471,
      },
    },
    {
      siteId: 'porechye-atlas-site-20',
      areaId: 'porechye-atlas-area-20',
      name: 'Глиняный карьер',
      anchorFp: {
        xFp: -6489,
        zFp: 917,
      },
    },
    {
      siteId: 'porechye-atlas-site-21',
      areaId: 'porechye-atlas-area-21',
      name: 'Заброшенный перевоз',
      anchorFp: {
        xFp: -5334,
        zFp: 287,
      },
    },
    {
      siteId: 'porechye-atlas-site-22',
      areaId: 'porechye-atlas-area-22',
      name: 'Затопленный луг',
      anchorFp: {
        xFp: -4214,
        zFp: -1113,
      },
    },
    {
      siteId: 'porechye-atlas-site-23',
      areaId: 'porechye-atlas-area-23',
      name: 'Пустая мытарня',
      anchorFp: {
        xFp: 4088,
        zFp: 917,
      },
    },
    {
      siteId: 'porechye-atlas-site-24',
      areaId: 'porechye-atlas-area-24',
      name: 'Плотницкий двор',
      anchorFp: {
        xFp: 6538,
        zFp: 322,
      },
    },
    {
      siteId: 'porechye-atlas-site-25',
      areaId: 'porechye-atlas-area-25',
      name: 'Гончарная слобода',
      anchorFp: {
        xFp: 5488,
        zFp: -1358,
      },
    },
    {
      siteId: 'porechye-atlas-site-26',
      areaId: 'porechye-atlas-area-26',
      name: 'Пильный стан',
      anchorFp: {
        xFp: -6489,
        zFp: -2842,
      },
    },
    {
      siteId: 'porechye-atlas-site-27',
      areaId: 'porechye-atlas-area-27',
      name: 'Охотничий лаз',
      anchorFp: {
        xFp: -6839,
        zFp: -4452,
      },
    },
    {
      siteId: 'porechye-atlas-site-28',
      areaId: 'porechye-atlas-area-28',
      name: 'Щебёночный карьер',
      anchorFp: {
        xFp: -3864,
        zFp: -4592,
      },
    },
    {
      siteId: 'porechye-atlas-site-29',
      areaId: 'porechye-atlas-area-29',
      name: 'Постоялый двор',
      anchorFp: {
        xFp: 812,
        zFp: -3542,
      },
    },
    {
      siteId: 'porechye-atlas-site-30',
      areaId: 'porechye-atlas-area-30',
      name: 'Скотный загон',
      anchorFp: {
        xFp: -1288,
        zFp: -3017,
      },
    },
    {
      siteId: 'porechye-atlas-site-31',
      areaId: 'porechye-atlas-area-31',
      name: 'Обгоревшие повозки',
      anchorFp: {
        xFp: -413,
        zFp: -4767,
      },
    },
    {
      siteId: 'porechye-atlas-site-32',
      areaId: 'porechye-atlas-area-32',
      name: 'Сторожевой холм',
      anchorFp: {
        xFp: 3913,
        zFp: -2842,
      },
    },
    {
      siteId: 'porechye-atlas-site-33',
      areaId: 'porechye-atlas-area-33',
      name: 'Мочильный пруд',
      anchorFp: {
        xFp: 6083,
        zFp: -4294,
      },
    },
    {
      siteId: 'porechye-atlas-site-34',
      areaId: 'porechye-atlas-area-34',
      name: 'Кузнечный хутор',
      anchorFp: {
        xFp: 6713,
        zFp: -3017,
      },
    },
  ].map((site) => Object.freeze({ ...site, anchorFp: Object.freeze({ ...site.anchorFp }) })),
);

export const PAINTED_ATLAS_REGION: NavigationRegion = Object.freeze({
  ...atlasGeometry,
  origin: Object.freeze({ ...atlasGeometry.origin }),
  boundary: freezePoints(atlasGeometry.boundary),
  terrainShapes: freezeShapes(atlasGeometry.terrainShapes),
  overlayShapes: freezeShapes(atlasGeometry.overlayShapes),
  blockingShapes: freezeShapes(atlasGeometry.blockingShapes),
  dangerAreaShapes: Object.freeze(atlasGeometry.dangerAreaShapes),
  mapEdition: PAINTED_ATLAS_REGION_VERSION,
  navigationVersion: 'polygon-v1',
  speedProfileId: FREE_MOVEMENT_ATLAS_LAB_PROFILE,
  sites: PAINTED_ATLAS_SITES.map(({ siteId, areaId, anchorFp }) => {
    return Object.freeze({ siteId, areaId, anchorFp });
  }),
});

export const polygonCrossProduct = (a: PointFp, b: PointFp, p: PointFp) =>
  (b.xFp - a.xFp) * (p.zFp - a.zFp) - (b.zFp - a.zFp) * (p.xFp - a.xFp);

/** Test a convex polygon, including its boundary, using a known interior point for winding. */
export function isPointInsideConvexPolygon(
  point: PointFp,
  polygon: readonly PointFp[],
  interiorPoint: PointFp,
): boolean {
  const orientation = Math.sign(polygonCrossProduct(polygon[0]!, polygon[1]!, interiorPoint));
  if (orientation === 0) return false;
  return polygon.every(
    (vertex, index) =>
      orientation * polygonCrossProduct(vertex, polygon[(index + 1) % polygon.length]!, point) >= 0,
  );
}

function zoneFootprint(zone: PaintedAtlasEntryZone): readonly PointFp[] {
  return zone.footprintPixels.map(([x, y]) => paintedAtlasPoint([x + 1536, y + 1024]));
}

function zoneAnchor(zone: PaintedAtlasEntryZone): PointFp {
  return paintedAtlasPoint([zone.anchorPixel[0] + 1536, zone.anchorPixel[1] + 1024]);
}

function contains(zone: PaintedAtlasEntryZone, point: PointFp): boolean {
  return isPointInsideConvexPolygon(point, zoneFootprint(zone), zoneAnchor(zone));
}

function worldPoint(point: PointFp | PointMicroFp): PointFp | undefined {
  const micro = 'xMicroFp' in point;
  const xFp = micro ? Number(point.xMicroFp) / 65_536 : point.xFp;
  const zFp = micro ? Number(point.zMicroFp) / 65_536 : point.zFp;
  return Number.isFinite(xFp) && Number.isFinite(zFp) ? { xFp, zFp } : undefined;
}

function canReachAnchor(field: NavigationField, from: PointFp, anchor: PointFp, siteId: string) {
  if (from.xFp === anchor.xFp && from.zFp === anchor.zFp) return true;
  try {
    compileMovementPlan({
      field,
      path: [from, anchor],
      movementEpoch: '0',
      startedAtMs: '0',
      planId: `visit-${siteId}`,
    });
    return true;
  } catch (error) {
    if (error instanceof RangeError && error.message === 'NO_PATH') return false;
    throw error;
  }
}

/** Return a visitable settlement only from its walkable zone with a clear path to its anchor. */
export function paintedAtlasNearbySite(
  field: NavigationField,
  point: PointFp | PointMicroFp,
): PaintedAtlasSite | undefined {
  if (field.region.mapEdition !== PAINTED_ATLAS_REGION.mapEdition)
    throw new RangeError('Map edition mismatch');
  const at = worldPoint(point);
  if (!at || !isContinuousPointWalkable(field, at)) return undefined;
  for (const zone of PAINTED_ATLAS_ENTRY_ZONES) {
    if (!contains(zone, at)) continue;
    if (!canReachAnchor(field, at, zoneAnchor(zone), zone.siteId)) return undefined;
    return PAINTED_ATLAS_SITES.find((site) => site.siteId === zone.siteId);
  }
  return undefined;
}

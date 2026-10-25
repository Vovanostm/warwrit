import {
  FREE_MOVEMENT_V3_PROFILE,
  type NavigationRegion,
  type OverlayId,
  type PointFp,
  type TerrainId,
} from '@warwrit/game-core';

// Prototype annotations of porechye-detail-v5.png, in source-image pixels.
// These are NOT a published world edition or a migration of company positions.
export type Pixel = readonly [number, number];
export const SHEET = { width: 1536, height: 1024, fpPerPixel: 4 } as const;
export const point = ([x, y]: Pixel): PointFp => ({
  xFp: Math.round((x - SHEET.width / 2) * SHEET.fpPerPixel),
  zFp: Math.round((SHEET.height / 2 - y) * SHEET.fpPerPixel),
});
export const pixel = (p: PointFp): Pixel => [
  p.xFp / SHEET.fpPerPixel + SHEET.width / 2,
  SHEET.height / 2 - p.zFp / SHEET.fpPerPixel,
];

interface Zone {
  readonly id: string;
  readonly terrain: TerrainId;
  readonly outline: readonly Pixel[];
}
const zones: readonly Zone[] = [
  {
    id: 'gat-raised-ground',
    terrain: 'grassland',
    outline: [
      [1250, 790],
      [1356, 779],
      [1470, 799],
      [1507, 854],
      [1410, 900],
      [1300, 880],
      [1245, 836],
    ],
  },
  {
    id: 'dvor-clearing',
    terrain: 'grassland',
    outline: [
      [794, 293],
      [884, 287],
      [928, 343],
      [889, 376],
      [823, 356],
    ],
  },
  {
    id: 'north-hills',
    terrain: 'hills',
    outline: [
      [340, 0],
      [970, 0],
      [1030, 115],
      [735, 120],
      [610, 217],
      [477, 164],
      [445, 79],
    ],
  },
  {
    id: 'east-hills',
    terrain: 'hills',
    outline: [
      [1070, 210],
      [1355, 123],
      [1510, 219],
      [1536, 387],
      [1350, 391],
      [1210, 348],
      [1130, 315],
    ],
  },
  {
    id: 'west-forest',
    terrain: 'forest',
    outline: [
      [0, 350],
      [95, 375],
      [153, 430],
      [215, 416],
      [299, 475],
      [407, 488],
      [442, 539],
      [382, 609],
      [296, 626],
      [213, 672],
      [124, 641],
      [44, 598],
      [0, 580],
    ],
  },
  {
    id: 'south-forest',
    terrain: 'forest',
    outline: [
      [145, 765],
      [198, 695],
      [316, 708],
      [371, 758],
      [468, 757],
      [532, 816],
      [560, 937],
      [485, 1024],
      [283, 1024],
      [225, 957],
    ],
  },
  {
    id: 'central-wood',
    terrain: 'forest',
    outline: [
      [446, 654],
      [481, 620],
      [552, 660],
      [637, 665],
      [684, 710],
      [680, 791],
      [618, 833],
      [548, 810],
      [510, 755],
    ],
  },
  {
    id: 'south-east-wood',
    terrain: 'forest',
    outline: [
      [668, 882],
      [740, 854],
      [809, 886],
      [862, 959],
      [929, 995],
      [937, 1024],
      [577, 1024],
      [607, 966],
    ],
  },
  {
    id: 'north-wood',
    terrain: 'forest',
    outline: [
      [480, 0],
      [682, 0],
      [669, 80],
      [620, 145],
      [570, 224],
      [517, 203],
      [514, 135],
      [469, 80],
    ],
  },
  {
    id: 'birch-ridge',
    terrain: 'forest',
    outline: [
      [956, 0],
      [1233, 0],
      [1194, 101],
      [1135, 157],
      [1165, 233],
      [1102, 269],
      [1017, 230],
      [945, 254],
      [933, 188],
      [992, 148],
    ],
  },
  {
    id: 'north-east-wood',
    terrain: 'forest',
    outline: [
      [1290, 0],
      [1536, 0],
      [1536, 190],
      [1448, 157],
      [1428, 88],
      [1354, 80],
    ],
  },
  {
    id: 'north-bank-wood',
    terrain: 'forest',
    outline: [
      [734, 273],
      [832, 253],
      [893, 283],
      [960, 308],
      [1005, 371],
      [961, 416],
      [877, 409],
      [828, 357],
      [771, 336],
    ],
  },
  {
    id: 'east-bank-wood',
    terrain: 'forest',
    outline: [
      [1280, 386],
      [1374, 383],
      [1413, 448],
      [1390, 501],
      [1342, 536],
      [1280, 481],
    ],
  },
  {
    id: 'north-marsh',
    terrain: 'marsh',
    outline: [
      [1182, 215],
      [1231, 192],
      [1274, 225],
      [1325, 232],
      [1354, 290],
      [1435, 327],
      [1536, 366],
      [1536, 505],
      [1482, 520],
      [1456, 439],
      [1363, 373],
      [1275, 340],
      [1214, 282],
    ],
  },
  {
    id: 'east-reeds',
    terrain: 'marsh',
    outline: [
      [1420, 497],
      [1484, 467],
      [1536, 510],
      [1536, 774],
      [1470, 750],
      [1430, 690],
      [1384, 657],
      [1375, 572],
    ],
  },
  {
    id: 'south-bank-reeds',
    terrain: 'marsh',
    outline: [
      [1220, 766],
      [1310, 771],
      [1385, 814],
      [1456, 837],
      [1536, 862],
      [1536, 955],
      [1437, 949],
      [1365, 897],
      [1284, 889],
      [1230, 833],
    ],
  },
  // River is one continuous barrier to the image edges. Only the two explicit
  // bridge corridors below open it; the painted collapsed bridge is closed.
  {
    id: 'mutnya',
    terrain: 'deep_water',
    outline: [
      [0, 0],
      [64, 15],
      [128, 53],
      [192, 86],
      [256, 113],
      [320, 123],
      [384, 145],
      [448, 171],
      [512, 206],
      [576, 232],
      [640, 266],
      [680, 310],
      [704, 340],
      [736, 395],
      [768, 437],
      [800, 470],
      [832, 499],
      [848, 525],
      [864, 585],
      [896, 612],
      [960, 633],
      [1024, 647],
      [1088, 664],
      [1152, 676],
      [1216, 718],
      [1280, 742],
      [1344, 782],
      [1408, 790],
      [1472, 800],
      [1536, 810],
      [1536, 850],
      [1472, 834],
      [1408, 850],
      [1344, 852],
      [1280, 850],
      [1216, 838],
      [1152, 823],
      [1088, 790],
      [1024, 780],
      [960, 760],
      [896, 775],
      [864, 755],
      [832, 744],
      [800, 710],
      [768, 663],
      [736, 641],
      [704, 607],
      [680, 540],
      [640, 494],
      [576, 450],
      [512, 390],
      [448, 350],
      [384, 335],
      [320, 307],
      [256, 278],
      [192, 251],
      [128, 221],
      [64, 183],
      [0, 142],
    ],
  },
];

interface Road {
  readonly id: string;
  readonly kind: Exclude<OverlayId, null>;
  readonly width: number;
  readonly line: readonly Pixel[];
}
const roads: readonly Road[] = [
  {
    id: 'west-approach',
    kind: 'dirt_road',
    width: 18,
    line: [
      [18, 304],
      [108, 328],
      [198, 357],
      [285, 372],
      [355, 357],
      [395, 350],
    ],
  },
  {
    id: 'karaulny-bridge',
    kind: 'bridge',
    width: 20,
    line: [
      [395, 350],
      [675, 278],
    ],
  },
  {
    id: 'north-road',
    kind: 'dirt_road',
    width: 18,
    line: [
      [675, 278],
      [708, 252],
      [730, 219],
      [723, 184],
      [715, 155],
      [739, 126],
      [769, 93],
      [779, 60],
      [808, 30],
    ],
  },
  {
    id: 'bereznyak-road',
    kind: 'dirt_road',
    width: 16,
    line: [
      [730, 219],
      [798, 240],
      [865, 245],
      [933, 233],
      [1001, 213],
      [1082, 199],
      [1150, 175],
      [1216, 156],
      [1287, 130],
      [1344, 109],
    ],
  },
  {
    id: 'north-dvor-road',
    kind: 'dirt_road',
    width: 18,
    line: [
      [675, 278],
      [726, 294],
      [785, 321],
      [852, 339],
      [917, 349],
      [973, 363],
      [1027, 396],
      [1054, 434],
      [1039, 468],
      [1008, 500],
      [946, 534],
      [922, 537],
    ],
  },
  {
    id: 'east-ridge-road',
    kind: 'trail',
    width: 12,
    line: [
      [973, 363],
      [1067, 374],
      [1141, 360],
      [1206, 337],
      [1280, 328],
      [1370, 357],
      [1437, 397],
      [1498, 409],
    ],
  },
  {
    id: 'south-approach',
    kind: 'dirt_road',
    width: 20,
    line: [
      [395, 350],
      [403, 398],
      [433, 439],
      [484, 467],
      [545, 480],
      [575, 513],
      [580, 551],
      [612, 578],
      [661, 594],
      [696, 583],
    ],
  },
  {
    id: 'brod-bridge',
    kind: 'bridge',
    width: 20,
    line: [
      [696, 583],
      [922, 537],
    ],
  },
  {
    id: 'town-road',
    kind: 'dirt_road',
    width: 20,
    line: [
      [922, 537],
      [981, 551],
      [1045, 574],
      [1104, 605],
      [1162, 633],
      [1224, 658],
      [1301, 685],
      [1380, 710],
      [1448, 731],
      [1510, 749],
    ],
  },
  {
    id: 'south-trunk',
    kind: 'dirt_road',
    width: 18,
    line: [
      [575, 513],
      [566, 572],
      [593, 620],
      [644, 656],
      [689, 699],
      [726, 734],
      [771, 766],
      [817, 809],
      [858, 846],
      [890, 882],
      [932, 920],
      [984, 945],
      [1040, 963],
      [1112, 982],
      [1195, 1004],
    ],
  },
  {
    id: 'west-fields',
    kind: 'trail',
    width: 14,
    line: [
      [23, 685],
      [102, 708],
      [177, 725],
      [246, 735],
      [307, 758],
      [371, 787],
      [424, 820],
      [484, 846],
      [555, 863],
      [614, 876],
      [678, 888],
      [739, 921],
      [797, 956],
      [845, 989],
      [870, 1005],
    ],
  },
  {
    id: 'central-field-path',
    kind: 'trail',
    width: 12,
    line: [
      [23, 685],
      [97, 653],
      [154, 629],
      [228, 627],
      [302, 646],
      [376, 674],
      [447, 696],
      [518, 705],
      [596, 715],
      [670, 733],
      [726, 734],
    ],
  },
  {
    id: 'south-mill-path',
    kind: 'trail',
    width: 14,
    line: [
      [858, 846],
      [920, 836],
      [983, 851],
      [1042, 877],
      [1081, 893],
      [1120, 907],
      [1173, 908],
      [1235, 924],
      [1292, 925],
      [1352, 916],
      [1400, 899],
    ],
  },
];

// Each segment is a rectangle with overlapping ends. A union need not be
// approximated by one self-intersecting polygon, and corners keep their width.
function corridor(a: Pixel, b: Pixel, width: number): readonly PointFp[] {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const length = Math.hypot(dx, dy),
    half = width / 2;
  const ux = dx / length,
    uy = dy / length;
  const corner = (p: Pixel, along: number, across: number) =>
    point([p[0] + ux * along - uy * across, p[1] + uy * along + ux * across]);
  return [
    corner(a, -half, half),
    corner(b, half, half),
    corner(b, half, -half),
    corner(a, -half, -half),
  ];
}

export const region: NavigationRegion = {
  mapEdition: 'porechye-v5-navigation-lab',
  navigationVersion: 'polygon-v1',
  speedProfileId: FREE_MOVEMENT_V3_PROFILE,
  origin: point([0, 1024]),
  columns: 96,
  rows: 64,
  cellSizeFp: 64,
  boundary: [point([0, 0]), point([1536, 0]), point([1536, 1024]), point([0, 1024])],
  terrainShapes: [
    {
      shapeId: 'land',
      terrainId: 'grassland',
      paintPriority: 0,
      polygon: [point([0, 0]), point([1536, 0]), point([1536, 1024]), point([0, 1024])],
    },
    ...zones.map((z) => ({
      shapeId: z.id,
      terrainId: z.terrain,
      paintPriority:
        z.terrain === 'grassland'
          ? 90
          : z.terrain === 'deep_water'
            ? 100
            : z.terrain === 'marsh'
              ? 30
              : z.terrain === 'forest'
                ? 20
                : 10,
      polygon: z.outline.map(point),
    })),
  ],
  overlayShapes: roads.flatMap((road) =>
    road.line.slice(1).map((b, i) => ({
      shapeId: `${road.id}-${i}`,
      overlayId: road.kind,
      polygon: corridor(road.line[i]!, b, road.width),
      stations: [point(road.line[i]!), point(b)],
    })),
  ),
  blockingShapes: [],
  dangerAreaShapes: [],
  sites: [],
};

export const presets: readonly {
  readonly name: string;
  readonly from: Pixel;
  readonly to: Pixel;
}[] = [
  { name: 'Через Каменный Брод', from: [1000, 535], to: [1090, 927] },
  { name: 'Обход разрушенного моста', from: [176, 290], to: [279, 78] },
  { name: 'Напрямик или по дороге', from: [440, 460], to: [820, 816] },
];

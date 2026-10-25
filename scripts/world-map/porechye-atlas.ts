import { type NavigationRegion, type PointFp } from '@warwrit/game-core';
import { pixel, roadOverlays, type Pixel, type Road } from './porechye-navigation.js';
import * as district from './porechye-regional.js';
import { atlasTiles, type AtlasTilePlan } from './porechye-atlas-layout.js';
import { atlasContracts } from './porechye-atlas-contracts.js';

// Nine native tiles at the district's unchanged physical scale. The smaller
// fixed-point ratio keeps the existing bounded navigation grid below its cap.
export const ATLAS_SHEET = { width: 4608, height: 3072, fpPerPixel: 3.5 } as const;
export const atlasPoint = ([x, y]: Pixel): PointFp => ({
  xFp: Math.round((x - ATLAS_SHEET.width / 2) * ATLAS_SHEET.fpPerPixel),
  zFp: Math.round((ATLAS_SHEET.height / 2 - y) * ATLAS_SHEET.fpPerPixel),
});
export const atlasPixel = (p: PointFp): Pixel => [
  p.xFp / ATLAS_SHEET.fpPerPixel + ATLAS_SHEET.width / 2,
  ATLAS_SHEET.height / 2 - p.zFp / ATLAS_SHEET.fpPerPixel,
];
const onAtlas = (at: Pixel, column: number, row: number): Pixel => [
  at[0] + column * 1536,
  at[1] + row * 1024,
];
const transform = (p: PointFp, column: number, row: number) =>
  atlasPoint(onAtlas(pixel(p), column, row));
const boundary = [
  [0, 0],
  [4608, 0],
  [4608, 3072],
  [0, 3072],
].map((p) => atlasPoint(p as unknown as Pixel));

function tileTerrain(tile: AtlasTilePlan): NavigationRegion['terrainShapes'] {
  const groups = [
    ['forests', 'forest', 20],
    ['marshes', 'marsh', 30],
    ['hills', 'hills', 10],
    ['water', 'deep_water', 100],
  ] as const;
  return groups.flatMap(([key, terrainId, paintPriority]) =>
    tile[key].map((outline, i) => ({
      shapeId: `${tile.id}-${key}-${i}`,
      terrainId,
      paintPriority,
      polygon: outline.map((p) => atlasPoint(onAtlas(p, tile.column, tile.row))),
    })),
  );
}
function tileRoads(tile: AtlasTilePlan): NavigationRegion['overlayShapes'] {
  return roadOverlays(tile.roads).map((road) => ({
    ...road,
    polygon: road.polygon.map((p) => transform(p, tile.column, tile.row)),
    stations: road.stations!.map((p) => transform(p, tile.column, tile.row)),
  }));
}
// Visible center-edge roads were outside the earlier district corridors.
const edgeRoads: readonly Road[] = [
  {
    id: 'center-north-edge',
    kind: 'dirt_road',
    width: 3,
    line: [
      [1160, 0],
      [1150, 145],
    ],
  },
  {
    id: 'center-east-edge',
    kind: 'dirt_road',
    width: 3,
    line: [
      [1155, 355],
      [1305, 390],
      [1536, 430],
    ],
  },
  {
    id: 'center-west-edge',
    kind: 'dirt_road',
    width: 3,
    line: [
      [0, 190],
      [40, 190],
    ],
  },
  {
    id: 'center-south-east-edge',
    kind: 'dirt_road',
    width: 3,
    line: [
      [1520, 900],
      [1536, 910],
    ],
  },
];
export const atlasRegion: NavigationRegion = {
  ...district.regionalRegion,
  mapEdition: 'porechye-atlas-3x3-proposal',
  origin: atlasPoint([0, 3072]),
  columns: 252,
  rows: 168,
  boundary,
  terrainShapes: [
    { shapeId: 'atlas-land', terrainId: 'grassland', paintPriority: 0, polygon: boundary },
    ...district.regionalRegion.terrainShapes.slice(1).map((shape) => ({
      ...shape,
      shapeId: `center-${shape.shapeId}`,
      polygon: shape.polygon.map((p) => transform(p, 1, 1)),
    })),
    ...atlasTiles.flatMap(tileTerrain),
  ],
  overlayShapes: [
    ...[...district.regionalRegion.overlayShapes, ...roadOverlays(edgeRoads)].map((shape) => ({
      ...shape,
      shapeId: `center-${shape.shapeId}`,
      polygon: shape.polygon.map((p) => transform(p, 1, 1)),
      stations: shape.stations!.map((p) => transform(p, 1, 1)),
    })),
    ...atlasTiles.flatMap(tileRoads),
  ],
};
export interface AtlasPlace {
  readonly name: string;
  readonly at: Pixel;
  readonly label: Pixel;
  readonly description: string;
  readonly major: boolean;
}
export const atlasPlaces: readonly AtlasPlace[] = [
  ...district.places.map((place, i) => ({
    ...place,
    at: onAtlas(place.at, 1, 1),
    label: onAtlas(i === 8 ? [1065, 735] : place.label, 1, 1),
    major: i < 5,
  })),
  ...atlasContracts.map((c) => {
    const tile = atlasTiles.find((t) => t.id === c.tile)!;
    return {
      name: c.place,
      at: onAtlas(c.at, tile.column, tile.row),
      label: onAtlas(c.label, tile.column, tile.row),
      description: c.description,
      major: c.major,
    };
  }),
];
export const atlasPresets: readonly { name: string; from: Pixel; to: Pixel }[] = [
  {
    name: 'Березняк → Житный амбар',
    from: onAtlas([195, 220], 1, 1),
    to: onAtlas([1000, 585], 1, 0),
  },
  {
    name: 'Смолокурня → Кузнечный хутор · через реку',
    from: [450, 330],
    to: onAtlas([1150, 350], 2, 2),
  },
  {
    name: 'Глиняный карьер → Гончарная слобода',
    from: onAtlas([450, 250], 0, 1),
    to: onAtlas([800, 900], 2, 1),
  },
];
export const atlasSamples: Record<string, Pixel> = {
  forest: [100, 100],
  marsh: onAtlas([850, 600], 2, 0),
  deep_water: onAtlas([600, 580], 0, 1),
  hills: onAtlas([1250, 650], 0, 2),
};

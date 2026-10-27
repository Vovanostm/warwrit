import {
  PAINTED_ATLAS_REGION,
  PAINTED_ATLAS_SHEET,
  FREE_MOVEMENT_V3_PROFILE,
  paintedAtlasPixel,
  paintedAtlasPoint,
} from '@warwrit/game-core';
import type { Pixel } from './porechye-navigation.js';
import * as district from './porechye-regional.js';
import { atlasTiles } from './porechye-atlas-layout.js';
import { atlasContracts } from './porechye-atlas-contracts.js';

// Nine native tiles at the district's unchanged physical scale. The smaller
// fixed-point ratio keeps the existing bounded navigation grid below its cap.
export const ATLAS_SHEET = PAINTED_ATLAS_SHEET;
export const atlasPoint = paintedAtlasPoint;
export const atlasPixel = paintedAtlasPixel;
const onAtlas = (at: Pixel, column: number, row: number): Pixel => [
  at[0] + column * 1536,
  at[1] + row * 1024,
];
// Keep the interactive stand's existing travel times; the MMO profile is server-only.
export const atlasRegion = Object.freeze({
  ...PAINTED_ATLAS_REGION,
  mapEdition: 'porechye-atlas-3x3-proposal',
  speedProfileId: FREE_MOVEMENT_V3_PROFILE,
});
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

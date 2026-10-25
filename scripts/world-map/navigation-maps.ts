import * as previous from './porechye-navigation.js';
import * as district from './porechye-regional.js';
import * as atlas from './porechye-atlas.js';
import { placeEntries } from './place-entries.js';

const current = {
  region: district.regionalRegion,
  presets: district.regionalPresets,
  sheet: previous.SHEET,
  point: previous.point,
  pixel: previous.pixel,
  places: district.places.map((place, i) => ({ ...place, major: i < 5 })),
  samples: district.samples,
  entries: placeEntries(previous.point, previous.SHEET.fpPerPixel),
  image: 'porechye-v2/porechye-regional-v4.png',
  note: 'Поречье v2 · эскиз округа 2,4 × 1,6 км. Время движения пока тестовое.',
};
export const mapProfiles = {
  v2: current,
  v5: {
    ...current,
    region: previous.region,
    presets: previous.presets,
    places: [],
    entries: [],
    samples: {
      forest: [100, 500],
      marsh: [1480, 580],
      hills: [1200, 270],
      deep_water: [540, 340],
    } as Record<string, previous.Pixel>,
    image: 'porechye-v1/porechye-detail-v5.png',
    note: 'Поречье v5 · прежний опыт, масштаб в километрах не задан.',
  },
  atlas: {
    region: atlas.atlasRegion,
    presets: atlas.atlasPresets,
    sheet: atlas.ATLAS_SHEET,
    point: atlas.atlasPoint,
    pixel: atlas.atlasPixel,
    places: atlas.atlasPlaces,
    entries: placeEntries(atlas.atlasPoint, atlas.ATLAS_SHEET.fpPerPixel, [1536, 1024]),
    samples: atlas.atlasSamples,
    image: 'porechye-atlas-v1/atlas-v5.png',
    note: 'Атлас · 7,2 × 4,8 км · 34 места. 24 новых места и контракта — предложения.',
  },
};

import * as previous from './porechye-navigation.js';
import * as district from './porechye-regional.js';
import * as atlas from './porechye-atlas.js';
import { placeEntries } from './place-entries.js';
import type { RoadConnection } from './road-diagnostics.js';

const current = {
  region: district.regionalRegion,
  presets: district.regionalPresets,
  sheet: previous.SHEET,
  point: previous.point,
  pixel: previous.pixel,
  places: district.places.map((place, i) => ({ ...place, major: i < 5 })),
  samples: district.samples,
  entries: placeEntries(previous.point),
  roadConnections: [] as readonly RoadConnection[],
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
    entries: placeEntries(atlas.atlasPoint, [1536, 1024]),
    roadConnections: [
      {
        name: 'Восточный подход к Каменному Броду',
        roadShapePrefix: 'center-center-east-edge-',
        from: atlas.atlasPoint([2691, 1379]),
        to: atlas.atlasPoint([3072, 1454]),
      },
      {
        name: 'Лесная дорога к Тихой Гати',
        roadShapePrefix: 'center-south-field-link-',
        from: atlas.atlasPoint([2636, 2048]),
        to: atlas.atlasPoint([2800, 1775]),
      },
    ],
    samples: atlas.atlasSamples,
    image: 'porechye-atlas-v1/atlas-v6.png',
    note: 'Атлас · 7,2 × 4,8 км · 34 места. 24 новых места и контракта — предложения.',
  },
};

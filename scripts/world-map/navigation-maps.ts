import * as atlas from './porechye-atlas.js';
import { placeEntries } from './place-entries.js';
export const atlasMap = {
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
  note: 'Атлас v6 · 7,2 × 4,8 км · 34 места. 24 новых места и контракта — предложения.',
};

import village from '../../../../assets/art/m1/places/settlements-v2/bereznyak.png';
import villagePainting from '../../../../assets/art/m1/places/settlements-v2/bereznyak-painting.png';
import town from '../../../../assets/art/m1/places/settlements-v2/kamenny-brod.png';
import townPainting from '../../../../assets/art/m1/places/settlements-v2/kamenny-brod-painting.png';
import river from '../../../../assets/art/m1/places/settlements-v2/tikhaya-gat.png';
import riverPainting from '../../../../assets/art/m1/places/settlements-v2/tikhaya-gat-painting.png';
import farm from '../../../../assets/art/m1/places/settlements-v2/severny-dvor.png';
import farmPainting from '../../../../assets/art/m1/places/settlements-v2/severny-dvor-painting.png';
import ruin from '../../../../assets/art/m1/places/settlements-v2/staraya-melnitsa.png';
import ruinPainting from '../../../../assets/art/m1/places/staraya-melnitsa.png';
import ruinDistance from '../../../../assets/art/m1/places/settlements-v2/staraya-melnitsa-distance.png';
import townForeground from '../../../../assets/art/m1/places/settlements-v2/kamenny-brod-foreground.png';
import riverForeground from '../../../../assets/art/m1/places/settlements-v2/tikhaya-gat-foreground.png';
import ruinForeground from '../../../../assets/art/m1/places/settlements-v2/staraya-melnitsa-foreground.png';
import distance from '../../../../assets/art/m1/places/settlements-v2/distance.png';
import foreground from '../../../../assets/art/m1/places/settlements-v2/foreground.png';

export const BUILDINGS = {
  market: {
    name: 'Базар',
    sign: 'Весы',
    detail:
      'Под полотняными навесами — корзины, ящики и связки припасов. Торговые ряды обрамляют площадь.',
    interior: 'Прилавки под навесами',
    service: 'Торговля пока недоступна.',
  },
  forge: {
    name: 'Кузница',
    sign: 'Молот',
    detail:
      'Каменный горн, высокая труба и тяжёлый навес. У входа стоят наковальня и бочки с углём.',
    interior: 'У кузнечного горна',
    service: 'Можно осмотреть и сменить снаряжение отряда. Ремонт и изготовление пока недоступны.',
  },
  elder: {
    name: 'Дом старейшины',
    sign: 'Печать',
    detail:
      'Дверь под резным козырьком ведёт в общий зал. Здесь обсуждают дела поселения со старейшиной.',
    interior: 'В доме старейшины',
    service: 'Поручения старейшины обсуждаются здесь. Принятые договоры сохраняются в журнале.',
  },
  inn: {
    name: 'Трактир',
    sign: 'Кружка',
    detail: 'Тяжёлые балки, тёплые окна и вывеска над входом. За дверью — длинные столы у очага.',
    interior: 'Общий зал у очага',
    service: 'Ночлег и найм пока недоступны.',
  },
  chapel: {
    name: 'Часовня',
    sign: 'Колокол',
    detail: 'Небольшая звонница возвышается над кровлей. Свет из узких окон ложится на ступени.',
    interior: 'Под сводами часовни',
    service: 'Службы пока недоступны.',
  },
  herbalist: {
    name: 'Травник',
    sign: 'Лист',
    detail: 'Под стрехой сушатся травы. На полках у входа стоят глиняные сосуды и корзины.',
    interior: 'Сушильня и травяные полки',
    service: 'Покупка трав и лечение пока недоступны.',
  },
  stable: {
    name: 'Конюшня',
    sign: 'Подкова',
    detail: 'Широкие ворота ведут к стойлам. Рядом сложено сено и оставлена деревянная телега.',
    interior: 'Двор со стойлами',
    service: 'Покупка лошадей пока недоступна.',
  },
  watch: {
    name: 'Караульня',
    sign: 'Щит',
    detail: 'Низкие ворота, сторожевая башня и знамя. Отсюда просматриваются подступы к поселению.',
    interior: 'У сторожевых ворот',
    service: 'Услуги караула пока недоступны.',
  },
  mill: {
    name: 'Мельница',
    sign: 'Колесо',
    detail: 'Обветренные балки, жернова и зерновые мешки. Большое колесо задаёт силуэт здания.',
    interior: 'Мельничный двор',
    service: 'Помол пока недоступен. Действия по контрактам доступны среди поручений места.',
  },
  granary: {
    name: 'Амбар',
    sign: 'Колос',
    detail:
      'Под высокой крышей — мешки, бочки и широкие двустворчатые двери. Погрузочный навес укрывает припасы.',
    interior: 'Под крышей амбара',
    service: 'Хранение и торговля зерном пока недоступны.',
  },
} as const;

export type BuildingType = keyof typeof BUILDINGS;
interface PlaceBuilding {
  readonly type: BuildingType;
  /** Painted doorway and detail bounds, in source-image percentages. */
  readonly x: number;
  readonly y: number;
  readonly crop: readonly [number, number, number, number];
}

interface PlaceLayout {
  readonly distance?: string;
  readonly foreground?: string;
  readonly image: string | undefined;
  readonly painting: string | undefined;
  readonly aspect: number;
  readonly buildings: readonly PlaceBuilding[];
  readonly smoke: readonly (readonly [number, number])[];
  readonly ruined: boolean;
}

const RURAL: PlaceLayout = {
  image: village,
  painting: villagePainting,
  aspect: 1.5,
  ruined: false,
  buildings: [
    { type: 'chapel', x: 23.5, y: 18, crop: [12, 0, 19, 22] },
    { type: 'elder', x: 49.6, y: 23, crop: [36, 6, 28, 21] },
    { type: 'mill', x: 83.5, y: 22, crop: [76, 0, 17, 27] },
    { type: 'watch', x: 9.5, y: 35.5, crop: [0, 14, 18, 27] },
    { type: 'forge', x: 39, y: 41, crop: [17, 18, 29, 29] },
    { type: 'inn', x: 65, y: 43, crop: [52, 22, 27, 25] },
    { type: 'stable', x: 89, y: 44, crop: [77, 28, 23, 25] },
    { type: 'herbalist', x: 27, y: 70, crop: [3, 49, 34, 31] },
    { type: 'market', x: 61, y: 58, crop: [38, 43, 37, 22] },
    { type: 'granary', x: 80, y: 70, crop: [71, 47, 28, 38] },
  ],
  smoke: [
    [30.6, 20.5],
    [70.1, 23.5],
  ],
};
const TOWN: PlaceLayout = {
  foreground: townForeground,
  image: town,
  painting: townPainting,
  aspect: 1.5,
  ruined: false,
  buildings: [
    { type: 'chapel', x: 23.5, y: 17, crop: [12, 0, 19, 23] },
    { type: 'elder', x: 49.6, y: 24, crop: [37, 3, 25, 26] },
    { type: 'mill', x: 81.5, y: 27, crop: [76, 3, 19, 30] },
    { type: 'watch', x: 9, y: 35, crop: [0, 8, 18, 32] },
    { type: 'forge', x: 35, y: 46, crop: [13, 24, 29, 30] },
    { type: 'inn', x: 66, y: 46, crop: [52, 25, 27, 29] },
    { type: 'stable', x: 91, y: 46, crop: [78, 32, 22, 22] },
    { type: 'herbalist', x: 18.5, y: 73, crop: [4, 46, 27, 35] },
    { type: 'market', x: 57, y: 60, crop: [33, 44, 37, 25] },
    { type: 'granary', x: 83, y: 72, crop: [70, 46, 29, 36] },
  ],
  smoke: [
    [24.3, 28],
    [36.8, 25],
  ],
};
const RIVER: PlaceLayout = {
  foreground: riverForeground,
  image: river,
  painting: riverPainting,
  aspect: 1.5,
  ruined: false,
  buildings: [
    { type: 'chapel', x: 24, y: 18, crop: [12, 0, 19, 23] },
    { type: 'elder', x: 50.5, y: 23, crop: [38, 5, 23, 22] },
    { type: 'mill', x: 75, y: 27, crop: [65, 9, 27, 25] },
    { type: 'watch', x: 9, y: 36, crop: [0, 14, 20, 27] },
    { type: 'forge', x: 39, y: 41, crop: [16, 20, 29, 26] },
    { type: 'inn', x: 63.7, y: 43, crop: [48, 23, 27, 25] },
    { type: 'stable', x: 85.5, y: 47, crop: [74, 32, 23, 22] },
    { type: 'herbalist', x: 10, y: 67, crop: [1, 45, 32, 31] },
    { type: 'market', x: 45, y: 56, crop: [32, 41, 38, 25] },
    { type: 'granary', x: 72, y: 73, crop: [53, 50, 27, 34] },
  ],
  smoke: [
    [31.5, 22.5],
    [63, 25],
  ],
};
const FARM: PlaceLayout = {
  image: farm,
  painting: farmPainting,
  aspect: 1.5,
  ruined: false,
  buildings: [
    { type: 'elder', x: 36, y: 27, crop: [13, 8, 36, 26] },
    { type: 'mill', x: 81.5, y: 26, crop: [75, 0, 17, 30] },
    { type: 'stable', x: 19.5, y: 62, crop: [0, 35, 40, 38] },
    { type: 'granary', x: 83, y: 72, crop: [70, 42, 28, 38] },
  ],
  smoke: [[27, 10]],
};
const RUIN: PlaceLayout = {
  foreground: ruinForeground,
  distance: ruinDistance,
  image: ruin,
  painting: ruinPainting,
  aspect: 2.4,
  ruined: true,
  buildings: [{ type: 'mill', x: 61, y: 65, crop: [19, 1, 48, 94] }],
  smoke: [],
};
const LANDMARK: PlaceLayout = {
  image: undefined,
  painting: undefined,
  aspect: 1.5,
  ruined: false,
  buildings: [],
  smoke: [],
};
const PLACES: Readonly<Record<string, PlaceLayout>> = {
  'kamenny-brod': TOWN,
  bereznyak: RURAL,
  'tikhaya-gat': RIVER,
  'severny-dvor': FARM,
  'staraya-melnitsa': RUIN,
};
const DEFAULT_PLACES: Readonly<Record<'CITY' | 'VILLAGE' | 'LANDMARK', PlaceLayout>> = {
  CITY: TOWN,
  VILLAGE: RURAL,
  LANDMARK,
};

/** Painted scene and aligned entrance coordinates, never canonical NPC/service state. */
export function placeBuildings(siteId: string, kind: 'CITY' | 'VILLAGE' | 'LANDMARK') {
  return { distance, foreground, ...(PLACES[siteId] ?? DEFAULT_PLACES[kind]) };
}

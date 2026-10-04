import market from '../../../../assets/art/m1/places/buildings/market.png';
import forge from '../../../../assets/art/m1/places/buildings/forge.png';
import elder from '../../../../assets/art/m1/places/buildings/elder.png';
import inn from '../../../../assets/art/m1/places/buildings/inn.png';
import chapel from '../../../../assets/art/m1/places/buildings/chapel.png';
import herbalist from '../../../../assets/art/m1/places/buildings/herbalist.png';
import stable from '../../../../assets/art/m1/places/buildings/stable.png';
import watch from '../../../../assets/art/m1/places/buildings/watch.png';
import mill from '../../../../assets/art/m1/places/buildings/mill.png';
import granary from '../../../../assets/art/m1/places/buildings/granary.png';

export const BUILDINGS = {
  market: {
    name: 'Базар',
    image: market,
    sign: 'Весы',
    detail:
      'Под полотняными навесами — корзины, ящики и связки припасов. Торговые ряды обрамляют площадь.',
    interior: 'Прилавки под навесами',
    service: 'Торговля пока недоступна.',
  },
  forge: {
    name: 'Кузница',
    image: forge,
    sign: 'Молот',
    detail:
      'Каменный горн, высокая труба и тяжёлый навес. У входа стоят наковальня и бочки с углём.',
    interior: 'У кузнечного горна',
    service: 'Можно осмотреть и сменить снаряжение отряда. Ремонт и изготовление пока недоступны.',
  },
  elder: {
    name: 'Дом старейшины',
    image: elder,
    sign: 'Печать',
    detail:
      'Дверь под резным козырьком ведёт в общий зал. Здесь удобно свериться с местными поручениями.',
    interior: 'Зал местных поручений',
    service: 'Открыть доступные поручения и текущие договоры.',
  },
  inn: {
    name: 'Трактир',
    image: inn,
    sign: 'Кружка',
    detail: 'Тяжёлые балки, тёплые окна и вывеска над входом. За дверью — длинные столы у очага.',
    interior: 'Общий зал у очага',
    service: 'Ночлег и найм пока недоступны.',
  },
  chapel: {
    name: 'Часовня',
    image: chapel,
    sign: 'Колокол',
    detail: 'Небольшая звонница возвышается над кровлей. Свет из узких окон ложится на ступени.',
    interior: 'Под сводами часовни',
    service: 'Службы пока недоступны.',
  },
  herbalist: {
    name: 'Травник',
    image: herbalist,
    sign: 'Лист',
    detail: 'Под стрехой сушатся травы. На полках у входа стоят глиняные сосуды и корзины.',
    interior: 'Сушильня и травяные полки',
    service: 'Покупка трав и лечение пока недоступны.',
  },
  stable: {
    name: 'Конюшня',
    image: stable,
    sign: 'Подкова',
    detail: 'Широкие ворота ведут к стойлам. Рядом сложено сено и оставлена деревянная телега.',
    interior: 'Двор со стойлами',
    service: 'Покупка лошадей пока недоступна.',
  },
  watch: {
    name: 'Караульня',
    image: watch,
    sign: 'Щит',
    detail: 'Низкие ворота, сторожевая башня и знамя. Отсюда просматриваются подступы к поселению.',
    interior: 'У сторожевых ворот',
    service: 'Услуги караула пока недоступны.',
  },
  mill: {
    name: 'Мельница',
    image: mill,
    sign: 'Колесо',
    detail: 'Обветренные балки, жернова и зерновые мешки. Большое колесо задаёт силуэт здания.',
    interior: 'Мельничный двор',
    service: 'Помол пока недоступен. Действия по контрактам доступны среди поручений места.',
  },
  granary: {
    name: 'Амбар',
    image: granary,
    sign: 'Колос',
    detail:
      'Под высокой крышей — мешки, бочки и широкие двустворчатые двери. Погрузочный навес укрывает припасы.',
    interior: 'Под крышей амбара',
    service: 'Хранение и торговля зерном пока недоступны.',
  },
} as const;

export type BuildingType = keyof typeof BUILDINGS;
export type BuildingVariant = 0 | 1 | 2;

interface PlaceBuilding {
  readonly type: BuildingType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

const SETTLEMENT: readonly PlaceBuilding[] = [
  { type: 'chapel', x: 35, y: 34, width: 17 },
  { type: 'elder', x: 62, y: 38, width: 20 },
  { type: 'watch', x: 12, y: 47, width: 18 },
  { type: 'mill', x: 87, y: 48, width: 19 },
  { type: 'forge', x: 25, y: 67, width: 21 },
  { type: 'inn', x: 55, y: 64, width: 22 },
  { type: 'stable', x: 79, y: 70, width: 21 },
  { type: 'herbalist', x: 13, y: 93, width: 23 },
  { type: 'market', x: 44, y: 94, width: 29 },
  { type: 'granary', x: 84, y: 96, width: 22 },
];

const FARM: readonly PlaceBuilding[] = [
  { type: 'elder', x: 30, y: 46, width: 27 },
  { type: 'mill', x: 73, y: 48, width: 29 },
  { type: 'stable', x: 23, y: 86, width: 34 },
  { type: 'granary', x: 71, y: 89, width: 38 },
];

const OLD_MILL: readonly PlaceBuilding[] = [{ type: 'mill', x: 54, y: 76, width: 27 }];

interface PlaceLayout {
  readonly variant: BuildingVariant;
  readonly buildings: readonly PlaceBuilding[];
  readonly ruined: boolean;
}
const RURAL: PlaceLayout = { variant: 0, buildings: SETTLEMENT, ruined: false };
const TOWN: PlaceLayout = { variant: 2, buildings: SETTLEMENT, ruined: false };
const LANDMARK: PlaceLayout = { variant: 0, buildings: [], ruined: false };
const PLACES: Readonly<Record<string, PlaceLayout>> = {
  'kamenny-brod': TOWN,
  bereznyak: RURAL,
  'tikhaya-gat': { variant: 1, buildings: SETTLEMENT, ruined: false },
  'severny-dvor': { variant: 0, buildings: FARM, ruined: false },
  'staraya-melnitsa': { variant: 0, buildings: OLD_MILL, ruined: true },
};
const DEFAULT_PLACES: Readonly<Record<'CITY' | 'VILLAGE' | 'LANDMARK', PlaceLayout>> = {
  CITY: TOWN,
  VILLAGE: RURAL,
  LANDMARK,
};

/** Authored visual sets, not a source of NPC/service availability or canonical geography. */
export function placeBuildings(siteId: string, kind: 'CITY' | 'VILLAGE' | 'LANDMARK') {
  return PLACES[siteId] ?? DEFAULT_PLACES[kind];
}

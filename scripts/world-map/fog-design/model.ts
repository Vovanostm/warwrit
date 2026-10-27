/** Executable design examples only. Synthetic public fixtures, no game authority. */
export type Point = { readonly x: number; readonly y: number };
type Terrain = 'FIELD' | 'FOREST' | 'MARSH' | 'RIDGE' | 'RIVER' | 'ROAD';
type Place = Point & { readonly id: string; readonly name: string; readonly public: boolean };
type Group = Point & { readonly id: string; readonly name: string };
export const WIDTH = 72;
export const HEIGHT = 48;
const key = (p: Point) => Math.floor(p.y) * WIDTH + Math.floor(p.x);
const PLACES: readonly Place[] = [
  { id: 'brod', name: 'Каменный Брод', x: 12.5, y: 34.5, public: true },
  { id: 'bereznyak', name: 'Березняк', x: 29.5, y: 34.5, public: true },
  { id: 'north', name: 'Северный Двор', x: 59.5, y: 10.5, public: true },
  { id: 'mill', name: 'Старая мельница', x: 42.5, y: 25.5, public: false },
];
export const GROUPS: readonly Group[] = [
  { id: 'bandits', name: 'Разбойники', x: 22.5, y: 30.5 },
  { id: 'wolves', name: 'Волки', x: 35.5, y: 18.5 },
  { id: 'far', name: 'Дальний отряд', x: 58.5, y: 31.5 },
];
export function terrainAt(p: Point): Terrain {
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  if (x >= 47 && x <= 49 && y > 11 && y < 39) return 'RIDGE';
  if (Math.abs(x - (40 + Math.round(3 * Math.sin(y / 7)))) <= 1) return 'RIVER';
  if (y >= 33 && y <= 35 && x > 8 && x < 62) return 'ROAD';
  if ((x - 33) ** 2 / 110 + (y - 19) ** 2 / 90 < 1) return 'FOREST';
  if ((x - 57) ** 2 / 80 + (y - 37) ** 2 / 35 < 1) return 'MARSH';
  return 'FIELD';
}
export interface Conditions {
  readonly night: boolean;
  readonly weather: 'CLEAR' | 'RAIN' | 'FOG';
  readonly forest: boolean;
  readonly height: number;
}
const DAY: Conditions = { night: false, weather: 'CLEAR', forest: true, height: 0 };
/** Proposed cell-scale tuning; not metres, accepted balance or campaign ticks. */
export function sightBudget(c: Conditions): number {
  const weather = { CLEAR: 1, RAIN: 0.75, FOG: 0.45 }[c.weather];
  return 17 * (c.night ? 0.52 : 1) * weather;
}
/** Small stepped optical example; production requires conservative supercover LOS. */
export function canObserve(from: Point, to: Point, c: Conditions): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance > sightBudget(c)) return false;
  const steps = Math.max(1, Math.ceil(distance * 4));
  let cost = 0;
  for (let step = 1; step <= steps; step += 1) {
    const fraction = step / steps;
    const point = {
      x: from.x + (to.x - from.x) * fraction,
      y: from.y + (to.y - from.y) * fraction,
    };
    const terrain = terrainAt(point);
    const rayHeight = (c.height + 1) * (1 - fraction) + fraction;
    if (terrain === 'RIDGE' && 2 > rayHeight && key(point) !== key(to)) return false;
    const attenuation = terrain === 'FOREST' && c.forest ? 3.2 : 1;
    cost += (distance / steps) * attenuation;
  }
  return cost <= sightBudget(c);
}
export function visibleCells(from: Point, c: Conditions): Set<number> {
  const cells = new Set<number>();
  for (let y = 0; y < HEIGHT; y += 1)
    for (let x = 0; x < WIDTH; x += 1)
      if (canObserve(from, { x: x + 0.5, y: y + 0.5 }, c)) cells.add(y * WIDTH + x);
  return cells;
}
function startKnowledge(): Set<number> {
  // Authored starting knowledge, not remote live vision along a road.
  const cells = new Set<number>();
  for (let y = 30; y <= 38; y += 1) for (let x = 8; x <= 32; x += 1) cells.add(y * WIDTH + x);
  return cells;
}
function rememberTerrain(old: ReadonlySet<number>, visible: ReadonlySet<number>): Set<number> {
  return new Set([...old, ...visible]);
}
function forestSight(from: Point, to: Point, enabled: boolean): boolean {
  return canObserve(from, to, { ...DAY, forest: enabled });
}
function ridgeSight(from: Point, to: Point, height: number): boolean {
  return canObserve(from, to, { ...DAY, height });
}
function nightSight(from: Point, to: Point, night: boolean): boolean {
  return canObserve(from, to, { ...DAY, night });
}
function weatherSight(from: Point, to: Point, weather: Conditions['weather']): boolean {
  return canObserve(from, to, { ...DAY, weather });
}
export function pursuitOnLoss(lastObserved: Point): {
  readonly mode: 'LAST_SEEN';
  readonly destination: Point;
} {
  return { mode: 'LAST_SEEN', destination: { x: lastObserved.x, y: lastObserved.y } };
}
function rumourArea(): {
  readonly area: { readonly x: number; readonly y: number; readonly radius: number };
  readonly source: string;
  readonly receivedAtMs: number;
} {
  return { area: { x: 36, y: 20, radius: 6 }, source: 'Учебное сообщение', receivedAtMs: 40_000 };
}
export function overviewPlaces(): readonly {
  readonly name: string;
  readonly x: number;
  readonly y: number;
}[] {
  // Coarse public anchors deliberately contain no current settlement condition.
  return PLACES.filter((p) => p.public).map((p) => ({
    name: p.name,
    x: Math.round(p.x / 4) * 4,
    y: Math.round(p.y / 4) * 4,
  }));
}
export function projectGroups(
  groups: readonly Group[],
  from: Point,
  conditions: Conditions,
): readonly Group[] {
  return groups
    .filter((g) => canObserve(from, g, conditions))
    .map((g) => ({ id: g.id, name: g.name, x: g.x, y: g.y }));
}
export const EXAMPLES = [
  {
    title: 'Знакомая дорога',
    text: 'В начале известны Брод, Березняк и дорога между ними. Известная дорога не даёт наблюдения за далёкими отрядами.',
    before: 'Начало пути',
    after: 'Дойти до Березняка',
    code: startKnowledge,
  },
  {
    title: 'Память о местности',
    text: 'Изученная земля остаётся на карте. За пределами текущего обзора она темнее, а движущихся отрядов на ней нет.',
    before: 'До разведки',
    after: 'Вернуться после разведки',
    code: rememberTerrain,
  },
  {
    title: 'Лес закрывает обзор',
    text: 'Опушка видна, но сквозь чащу отряд не просматривается. Здесь меняется форма видимой области, а не только её радиус.',
    before: 'Без заслона · сравнение',
    after: 'Учесть лес',
    code: forestSight,
  },
  {
    title: 'Гряда и высота',
    text: 'Гряда закрывает дальний склон. С высокого наблюдательного места можно увидеть дальше, но высота не убирает лес и погоду.',
    before: 'В низине',
    after: 'На возвышенности',
    code: ridgeSight,
  },
  {
    title: 'Ночь',
    text: 'С наступлением ночи область наблюдения сокращается. Изученная карта сохраняется; дальние отряды исчезают из текущего наблюдения.',
    before: 'День',
    after: 'Ночь',
    code: nightSight,
  },
  {
    title: 'Погода',
    text: 'Туман уменьшает дальность сильнее дождя. В игре условия задаёт сервер, а переход применяется одинаково к наблюдению и выдаче целей.',
    before: 'Ясно',
    after: 'Густой туман',
    code: weatherSight,
  },
  {
    title: 'Цель потеряна',
    text: 'Преследование продолжается до последнего замеченного места. Исчезнувшая цель больше не обновляет координаты; там отряд остановится.',
    before: 'Цель наблюдается',
    after: 'Цель скрылась',
    code: pursuitOnLoss,
  },
  {
    title: 'Слух — это область',
    text: 'Чужое сообщение отмечает примерный район с источником. Оно не открывает местность и не выдаёт координаты отряда.',
    before: 'Без сведений',
    after: 'Получено сообщение',
    code: rumourArea,
  },
  {
    title: 'Общая карта и местность',
    text: 'Обзорная карта показывает только общеизвестные опорные места. При приближении видны сведения компании, а не весь каталог мира.',
    before: 'Общая карта',
    after: 'Карта компании',
    code: overviewPlaces,
  },
  {
    title: 'Что получает браузер',
    text: 'Изменение скрытого отряда не меняет разрешённый ответ. В реальной игре отбор происходит до отправки; здесь показана открытая учебная модель.',
    before: 'Скрытый мир А',
    after: 'Скрытый мир Б',
    code: projectGroups,
  },
] as const;
export interface ExampleView {
  readonly own: Point;
  readonly conditions: Conditions;
  readonly visible: ReadonlySet<number>;
  readonly explored: ReadonlySet<number>;
  readonly groups: readonly Group[];
  readonly sites: readonly Place[];
  readonly overview: boolean;
  readonly lastSeen: Point | null;
  readonly intel: {
    readonly source: string;
    readonly atMs: number;
    readonly kind: 'OBSERVED' | 'RECEIVED';
  } | null;
  readonly sampledAtMs: number;
  readonly rumour: ReturnType<typeof rumourArea> | null;
  readonly payload: object;
}
function exampleOrigin(index: number, after: boolean): Point {
  switch (index) {
    case 0:
      return after ? { x: 29.5, y: 34.5 } : { x: 13.5, y: 30.5 };
    case 2:
      return { x: 22.5, y: 19.5 };
    case 3:
      return { x: 43.5, y: 31.5 };
    default:
      return { x: 13.5, y: 30.5 };
  }
}
function exampleConditions(index: number, after: boolean): Conditions {
  switch (index) {
    case 2:
      return { ...DAY, forest: after };
    case 3:
      return { ...DAY, height: after ? 4 : 0 };
    case 4:
      return { ...DAY, night: after };
    case 5:
      return { ...DAY, weather: after ? 'FOG' : 'CLEAR' };
    default:
      return DAY;
  }
}
function exampleGroups(index: number, after: boolean): readonly Group[] {
  if (!after) return GROUPS;
  if (index === 6) return GROUPS.map((g) => (g.id === 'bandits' ? { ...g, x: 35.5, y: 18.5 } : g));
  if (index === 9)
    return GROUPS.map((g) =>
      g.id === 'far' ? { ...g, x: 66.5, y: 5.5, name: 'Другое скрытое имя' } : g,
    );
  return GROUPS;
}
function intelEvidence(
  lastSeen: Point | null,
  rumour: ReturnType<typeof rumourArea> | null,
): ExampleView['intel'] {
  if (lastSeen) return { source: 'Ваш отряд', atMs: 80_000, kind: 'OBSERVED' };
  if (rumour) return { source: rumour.source, atMs: rumour.receivedAtMs, kind: 'RECEIVED' };
  return null;
}
export function exampleView(index: number, after: boolean): ExampleView {
  const own = exampleOrigin(index, after);
  const conditions = exampleConditions(index, after);
  const groups = exampleGroups(index, after);
  let explored = startKnowledge();
  if (index === 1 && after)
    explored = rememberTerrain(explored, visibleCells({ x: 30.5, y: 30.5 }, DAY));
  const overview = index === 8 && !after;
  if (after && [0, 4, 5, 6].includes(index))
    explored = rememberTerrain(explored, visibleCells({ x: 13.5, y: 30.5 }, DAY));
  const visible = visibleCells(own, conditions);
  explored = rememberTerrain(explored, visible);
  const observedGroups = overview ? [] : projectGroups(groups, own, conditions);
  const sites = PLACES.filter((p) => explored.has(key(p)));
  const lastSeen = index === 6 && after ? pursuitOnLoss(GROUPS[0]!).destination : null;
  const rumour = index === 7 && after ? rumourArea() : null;
  return {
    own,
    conditions,
    visible,
    explored,
    groups: observedGroups,
    sites,
    overview,
    lastSeen,
    rumour,
    sampledAtMs: 100_000,
    intel: intelEvidence(lastSeen, rumour),
    payload: overview
      ? { chart: overviewPlaces(), liveGroups: [] }
      : {
          groups: observedGroups,
          sites: sites.map((p) => ({ id: p.id, name: p.name })),
          exploredCells: explored.size,
          visibleCells: visible.size,
          ...(lastSeen
            ? {
                pursuit: pursuitOnLoss(lastSeen),
                lastObservation: { source: 'own-party', observedAtMs: 80_000 },
              }
            : {}),
          ...(rumour ? { rumour } : {}),
        },
  };
}

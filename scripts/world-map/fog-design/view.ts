import { EXAMPLES, WIDTH, HEIGHT, exampleView, overviewPlaces, terrainAt } from './model.js';
import type { ExampleView, Point } from './model.js';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const map = document.getElementById('map') as unknown as SVGSVGElement;
const scale = 960 / WIDTH;
const colors = {
  FIELD: '#888465',
  FOREST: '#444f3e',
  MARSH: '#62716a',
  RIDGE: '#9a9587',
  RIVER: '#536f7a',
  ROAD: '#ae9872',
};
let selected = 0;
let after = false;
function svg(
  tag: string,
  attributes: Record<string, string | number>,
  parent: SVGElement = map,
): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  parent.append(node);
  return node;
}
function text(at: Point, value: string, color: string, size = 14): void {
  const node = svg('text', {
    x: at.x * scale,
    y: at.y * scale,
    fill: color,
    'font-size': size,
    'font-family': 'system-ui, sans-serif',
    'paint-order': 'stroke',
    stroke: '#22292a',
    'stroke-width': 4,
    'stroke-linejoin': 'round',
  });
  node.textContent = value;
}
function marker(at: Point, kind: 'own' | 'enemy' | 'site' | 'memory'): void {
  const g = svg('g', {
    transform: `translate(${at.x * scale} ${at.y * scale})`,
    fill: kind === 'enemy' ? '#c18b75' : '#d6bb79',
    stroke: '#24292a',
    'stroke-width': 2,
  });
  if (kind === 'own') {
    svg('circle', { r: 17, fill: '#252e2e', stroke: '#dec18a' }, g);
    svg(
      'path',
      { d: 'M-5 11V-12L10-10L7-2L-5 0', fill: '#d6bb79', stroke: '#dec18a', 'stroke-width': 2 },
      g,
    );
  } else if (kind === 'site') {
    svg('path', { d: 'M-12 9V-4L-3-11L5-4V9ZM4 9V-2L11-7L17-1V9Z' }, g);
  } else if (kind === 'enemy') {
    svg(
      'path',
      {
        d: 'M-9-10L9 10M9-10L-9 10M-12 3L-3 12M3 12L12 3',
        fill: 'none',
        stroke: '#cf9681',
        'stroke-width': 3,
      },
      g,
    );
  } else
    svg(
      'path',
      { d: 'M-10 0L0-10L10 0L0 10Z', fill: 'none', stroke: '#c5ad88', 'stroke-dasharray': '3 3' },
      g,
    );
}
function terrainPaths(view: ExampleView) {
  const visiblePaths: Record<string, string> = {};
  const remembered: Record<string, string> = {};
  for (let y = 0; y < HEIGHT; y += 1)
    for (let x = 0; x < WIDTH; x += 1) {
      const id = y * WIDTH + x;
      if (!view.explored.has(id)) continue;
      const path = `M${x * scale},${y * scale}h${scale + 0.1}v${scale + 0.1}h-${scale + 0.1}z`;
      const paths = view.visible.has(id) ? visiblePaths : remembered;
      const terrain = terrainAt({ x, y });
      paths[terrain] = (paths[terrain] ?? '') + path;
    }
  return { visiblePaths, remembered };
}
function drawTerrain(view: ExampleView): void {
  const { visiblePaths, remembered } = terrainPaths(view);
  // Only known cells enter the illustrative SVG. Unknown terrain is never painted.
  for (const [terrain, d] of Object.entries(remembered))
    svg('path', { d, fill: colors[terrain as keyof typeof colors], opacity: 0.38 });
  for (const [terrain, d] of Object.entries(visiblePaths))
    svg('path', { d, fill: colors[terrain as keyof typeof colors] });
  for (const site of view.sites) {
    marker(site, 'site');
    text({ x: site.x + 1.6, y: site.y - 1.4 }, site.name, '#e5d8ba');
  }
  for (const group of view.groups) {
    marker(group, 'enemy');
    text({ x: group.x + 1.5, y: group.y - 1.2 }, group.name, '#e0b5a2');
  }
}
function drawObstacle(view: ExampleView): void {
  const forest = selected === 2;
  const wanted = forest ? 'FOREST' : 'RIDGE';
  const target = forest ? { x: 27, y: 15 } : { x: 47, y: 27 };
  const known = [...view.explored]
    .map((id) => ({ x: (id % WIDTH) + 0.5, y: Math.floor(id / WIDTH) + 0.5 }))
    .filter((point) => terrainAt(point) === wanted)
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y),
    );
  const at = known[0];
  if (!at) return;
  const g = svg('g', {
    transform: `translate(${at.x * scale} ${at.y * scale})`,
    fill: 'none',
    stroke: '#e0d0aa',
    'stroke-width': 2,
  });
  svg('path', { d: forest ? 'M-10 6L0-13L10 6ZM0 6V13' : 'M-14 10L-4-10L1 0L7-15L18 10' }, g);
  text({ x: at.x + 2, y: at.y - 1.8 }, forest ? 'Лес' : 'Гряда', '#e5d8ba', 17);
}
function drawOverview(): void {
  // Company-authorized home chart; no unacquired region catalogue or live groups.
  svg('path', {
    d: 'M100 450Q350 480 770 140',
    fill: 'none',
    stroke: '#746b54',
    'stroke-width': 3,
    'stroke-dasharray': '10 8',
  });
  for (const site of overviewPlaces()) {
    marker(site, 'site');
    text({ x: site.x + 2, y: site.y - 2 }, site.name, '#e5d8ba', 17);
  }
  text({ x: 33, y: 8 }, 'СЕРОЕ ПОРЕЧЬЕ', '#b8ad94', 20);
  text({ x: 33, y: 10.5 }, 'Домашний регион компании', '#aaa994', 13);
  text({ x: 35, y: 42 }, 'Другие регионы: покупка карты или разведка', '#aaa994', 13);
}
function renderIntel(view: ExampleView): void {
  const intel = element('intel');
  intel.hidden = view.intel === null;
  if (!view.intel) return;
  const age = (view.sampledAtMs - view.intel.atMs) / 1000;
  const action = view.intel.kind === 'OBSERVED' ? 'Замечено' : 'Получено';
  intel.textContent = `Источник: ${view.intel.source}. ${action} ${age} с назад · условное время примера.`;
}
function render(): void {
  const example = EXAMPLES[selected]!;
  const view = exampleView(selected, after);
  element('number').textContent = `ПРИМЕР ${String(selected + 1).padStart(2, '0')} / 10`;
  element('title').textContent = example.title;
  element('description').textContent = example.text;
  element('before').textContent = example.before;
  element('after').textContent = example.after;
  element('before').setAttribute('aria-pressed', String(!after));
  element('after').setAttribute('aria-pressed', String(after));
  for (const button of document.querySelectorAll<HTMLButtonElement>('nav button'))
    button.setAttribute('aria-pressed', String(Number(button.dataset['index']) === selected));
  const weather = { CLEAR: 'Ясно', RAIN: 'Дождь', FOG: 'Туман' }[view.conditions.weather];
  element('conditions').textContent = `${view.conditions.night ? 'Ночь' : 'День'} · ${weather}`;
  element('code').textContent = example.code.toString();
  element('payload').textContent = JSON.stringify(view.payload, null, 2);
  renderIntel(view);
  map.replaceChildren();
  if (view.overview) drawOverview();
  else drawTerrain(view);
  if (selected === 2 || selected === 3) drawObstacle(view);
  element('obstacle-legend').hidden = selected !== 2 && selected !== 3;
  element('obstacle-legend').textContent =
    selected === 2 ? '△ Дерево — лесной заслон' : '⋀ Гряда — заслон рельефа';
  if (view.rumour) {
    const { x, y, radius } = view.rumour.area;
    svg('circle', {
      cx: x * scale,
      cy: y * scale,
      r: radius * scale,
      fill: '#ae9872',
      'fill-opacity': 0.12,
      stroke: '#bdab86',
      'stroke-width': 2,
      'stroke-dasharray': '7 6',
    });
    text({ x: x - 6, y: y - radius - 1 }, 'По сообщению · район', '#d4c099');
  }
  if (view.lastSeen) {
    svg('path', {
      d: `M${view.own.x * scale} ${view.own.y * scale}L${view.lastSeen.x * scale} ${view.lastSeen.y * scale}`,
      fill: 'none',
      stroke: '#d6bb79',
      'stroke-width': 2,
      'stroke-dasharray': '7 6',
    });
    marker(view.lastSeen, 'memory');
    text({ x: view.lastSeen.x + 1.5, y: view.lastSeen.y - 1.3 }, 'Последнее место', '#d4c099');
  }
  marker(view.own, 'own');
  const message = view.lastSeen
    ? 'Цель потеряна. Дойти до последнего места → остановиться.'
    : view.overview
      ? 'Начальный атлас: только домашний регион. Приближение не открывает другие земли.'
      : `Наблюдаемые отряды: ${view.groups.length}. Неизученная земля остаётся закрытой.`;
  element('result').textContent = message;
  map.setAttribute('aria-label', `${example.title}. ${message}`);
}
for (const [index, example] of EXAMPLES.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset['index'] = String(index);
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(2, '0');
  button.append(number, document.createTextNode(example.title));
  button.addEventListener('click', () => {
    selected = index;
    after = false;
    render();
  });
  element('examples').append(button);
}
element('before').addEventListener('click', () => {
  after = false;
  render();
});
element('after').addEventListener('click', () => {
  after = true;
  render();
});
render();

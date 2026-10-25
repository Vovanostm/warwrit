import {
  buildNavigationField,
  compileMovementPlan,
  continuousSurfaceAt,
  findTravelPath,
  isContinuousPointWalkable,
  positionAt,
  type ContinuousMovementPlan,
  type NavigationRegion,
  type PointFp,
} from '@warwrit/game-core';
import { pixel, point, presets, region, SHEET, type Pixel } from './porechye-navigation.js';

const element = <T extends Element>(id: string) => document.getElementById(id)! as unknown as T;
const map = element<SVGSVGElement>('map');
const status = element<HTMLElement>('status');
const play = element<HTMLButtonElement>('play');
const stop = element<HTMLButtonElement>('stop');
const rate = element<HTMLSelectElement>('rate');
const svgNS = 'http://www.w3.org/2000/svg';
const colours: Record<string, string> = {
  forest: '#6daf73',
  marsh: '#bd8cce',
  hills: '#c8935c',
  deep_water: '#6aaed5',
};
const names: Record<string, string> = {
  grassland: 'Поле',
  forest: 'Лес',
  marsh: 'Болото',
  hills: 'Холмы',
  deep_water: 'Вода',
  dirt_road: 'Грунтовая дорога',
  trail: 'Тропа',
  bridge: 'Мост',
};
let field: ReturnType<typeof buildNavigationField>;
let start: PointFp = point(presets[0]!.from);
let goal: PointFp = point(presets[0]!.to);
let markerPosition = start;
let mode: 'start' | 'goal' = 'goal';
let plan: ContinuousMovementPlan | undefined;
let elapsed = 0;
let running = false;
let lastFrame = 0;

function polygon(points: readonly PointFp[], group: string, colour?: string) {
  const shape = document.createElementNS(svgNS, 'polygon');
  shape.setAttribute('points', points.map((p) => pixel(p).join(',')).join(' '));
  if (colour) {
    shape.setAttribute('fill', colour);
    shape.setAttribute('stroke', colour);
  }
  element(group).append(shape);
  return shape;
}

function biomeMask(terrain: NavigationRegion['terrainShapes'][number]) {
  const mask = document.createElementNS(svgNS, 'mask');
  mask.id = `mask-${terrain.shapeId}`;
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('x', '0');
  mask.setAttribute('y', '0');
  mask.setAttribute('width', String(SHEET.width));
  mask.setAttribute('height', String(SHEET.height));
  element('map-defs').append(mask);
  polygon(region.boundary, mask.id, '#fff');
  for (const above of region.terrainShapes.filter((s) => s.paintPriority > terrain.paintPriority))
    polygon(above.polygon, mask.id, '#000');
  return `url(#${mask.id})`;
}

function drawLayers() {
  const defs = document.createElementNS(svgNS, 'defs');
  defs.id = 'map-defs';
  map.prepend(defs);
  for (const terrain of region.terrainShapes.filter((s) => s.terrainId !== 'grassland')) {
    const shape = polygon(terrain.polygon, 'biomes', colours[terrain.terrainId]);
    shape.dataset['terrain'] = terrain.terrainId;
    shape.setAttribute('mask', biomeMask(terrain));
  }
  for (const road of region.overlayShapes) {
    const shape = polygon(road.polygon, 'road-layer');
    shape.dataset['kind'] = road.overlayId;
  }
}

function addLayerToggle(
  id: string,
  text: string,
  colour: string,
  speed: string,
  toggle: (visible: boolean) => void,
) {
  const label = document.createElement('label');
  label.className = 'switch';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = true;
  input.id = `layer-${id}`;
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = colour;
  const value = document.createElement('small');
  value.textContent = speed;
  label.append(input, swatch, document.createTextNode(text), value);
  element('layers').append(label);
  input.addEventListener('change', () => toggle(input.checked));
}

function showSurface(p: PointFp) {
  const surface = continuousSurfaceAt(field, p);
  element('surface').textContent =
    `${names[surface.overlayId ?? surface.terrainId] ?? surface.terrainId} · ×${surface.speedPermille / 1000}`;
}

function moveMarker(id: string, p: PointFp) {
  const [x, y] = pixel(p);
  element(id).setAttribute('transform', `translate(${x} ${y})`);
}

function updateParty(p: PointFp) {
  const [x, y] = pixel(p),
    [oldX, oldY] = pixel(markerPosition);
  element('party-heading').setAttribute(
    'transform',
    `rotate(${(Math.atan2(x - oldX, oldY - y) * 180) / Math.PI})`,
  );
  markerPosition = p;
  moveMarker('party', p);
}

function drawRoute() {
  const path = plan?.path.map((p) =>
    pixel({ xFp: Number(p.xMicroFp) / 65536, zFp: Number(p.zMicroFp) / 65536 }),
  );
  const d = path?.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ') ?? '';
  element('route').setAttribute('d', d);
  element('route-edge').setAttribute('d', d);
  moveMarker('from-marker', start);
  moveMarker('party', start);
  markerPosition = start;
  element('to-marker').setAttribute('visibility', 'visible');
  moveMarker('to-marker', goal);
}

function createPlan(target: PointFp): ContinuousMovementPlan {
  const path = findTravelPath(field, start, target);
  if (!path) throw new Error('Путь не найден. Попробуйте другую точку.');
  if (path.length < 2) throw new Error('Старт и цель совпадают.');
  return compileMovementPlan({
    field,
    path,
    movementEpoch: '0',
    startedAtMs: '0',
    planId: 'navigation-lab',
  });
}

function calculateRoute() {
  running = false;
  elapsed = 0;
  plan = undefined;
  stop.disabled = true;
  const before = performance.now();
  try {
    plan = createPlan(goal);
    status.textContent = `Путь найден · поиск ${Math.round(performance.now() - before)} мс. Можно идти или выбрать другую цель.`;
  } catch (error) {
    status.textContent = `Не удалось построить путь: ${error instanceof Error ? error.message : 'ошибка'}`;
  }
  element('duration').textContent = plan
    ? `${(Number(plan.totalDurationUs) / 1e6).toFixed(1)} с`
    : '—';
  play.disabled = !plan;
  play.textContent = 'Идти';
  drawRoute();
  showSurface(start);
}

function setMode(next: typeof mode) {
  mode = next;
  element('start').setAttribute('aria-pressed', String(mode === 'start'));
  element('goal').setAttribute('aria-pressed', String(mode === 'goal'));
  element('mode').textContent =
    mode === 'start'
      ? 'Нажмите на карту, чтобы поставить старт'
      : 'Нажмите на карту, чтобы выбрать цель';
}

function selectPoint(p: PointFp) {
  if (!field) return;
  if (!isContinuousPointWalkable(field, p)) {
    status.textContent =
      'Эта точка непроходима или слишком близка к воде. Выберите сухую землю или середину целого моста.';
    return;
  }
  if (mode === 'start') {
    start = p;
    setMode('goal');
  } else goal = p;
  element<HTMLSelectElement>('preset').value = '';
  calculateRoute();
}

function mapPoint(event: MouseEvent): Pixel {
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    map.getScreenCTM()!.inverse(),
  );
  return [p.x, p.y];
}

let drag: { id: number; x: number; y: number; view: number[]; moved: boolean } | undefined;
map.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    view: [view.x, view.y, view.width, view.height],
    moved: false,
  };
  map.setPointerCapture(event.pointerId);
});
map.addEventListener('pointermove', (event) => {
  const p = mapPoint(event);
  element('coordinates').textContent = `${Math.round(p[0])}, ${Math.round(p[1])} px · Север ↑`;
  if (!drag) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
  if (!drag.moved) return;
  const scale = map.getScreenCTM()!.a;
  setView(
    drag.view[0]! - (event.clientX - drag.x) / scale,
    drag.view[1]! - (event.clientY - drag.y) / scale,
    drag.view[2]!,
    drag.view[3]!,
  );
});
map.addEventListener('pointerup', (event) => {
  if (!drag || drag.id !== event.pointerId) return;
  const moved = drag.moved;
  drag = undefined;
  if (!moved) selectPoint(point(mapPoint(event)));
});
map.addEventListener('pointercancel', () => {
  drag = undefined;
});
let view = { x: 0, y: 0, width: SHEET.width as number, height: SHEET.height as number };
function setView(x: number, y: number, width: number, height: number) {
  view = {
    x: Math.max(0, Math.min(SHEET.width - width, x)),
    y: Math.max(0, Math.min(SHEET.height - height, y)),
    width,
    height,
  };
  map.setAttribute('viewBox', `${view.x} ${view.y} ${width} ${height}`);
}
map.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const [x, y] = mapPoint(event);
    const factor = Math.max(
      0.18,
      Math.min(1, (view.width / SHEET.width) * (event.deltaY > 0 ? 1.15 : 1 / 1.15)),
    );
    const width = SHEET.width * factor,
      height = SHEET.height * factor;
    setView(
      x - ((x - view.x) * width) / view.width,
      y - ((y - view.y) * height) / view.height,
      width,
      height,
    );
  },
  { passive: false },
);
element('fit').addEventListener('click', () => setView(0, 0, SHEET.width, SHEET.height));
element('start').addEventListener('click', () => setMode('start'));
element('goal').addEventListener('click', () => setMode('goal'));
element<HTMLInputElement>('night').addEventListener('change', (event) =>
  map.classList.toggle('night', (event.target as HTMLInputElement).checked),
);
play.addEventListener('click', () => {
  if (!plan) return;
  if (elapsed >= Number(plan.arrivesAtMs)) elapsed = 0;
  running = true;
  lastFrame = performance.now();
  stop.disabled = false;
  play.disabled = true;
  status.textContent = 'Отряд в пути. Скорость меняется при переходе границ зон.';
});
stop.addEventListener('click', () => {
  running = false;
  play.disabled = false;
  stop.disabled = true;
  play.textContent = 'Продолжить';
  status.textContent = 'Отряд остановлен. Можно продолжить этот путь.';
});

function animate(now: number) {
  if (running && plan) {
    elapsed = Math.min(Number(plan.arrivesAtMs), elapsed + (now - lastFrame) * Number(rate.value));
    const p = positionAt(plan, String(Math.floor(elapsed)));
    const current = { xFp: Number(p.xMicroFp) / 65536, zFp: Number(p.zMicroFp) / 65536 };
    updateParty(current);
    showSurface(current);
    if (elapsed >= Number(plan.arrivesAtMs)) {
      running = false;
      play.disabled = false;
      stop.disabled = true;
      play.textContent = 'Повторить';
      status.textContent = 'Отряд прибыл в выбранную точку.';
    }
  }
  lastFrame = now;
  requestAnimationFrame(animate);
}

async function initialize() {
  drawLayers();
  // Yield once so the image and loading message paint before compiling geometry.
  await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  field = buildNavigationField(region);
  const samples: Record<string, Pixel> = {
    forest: [100, 500],
    marsh: [1480, 580],
    hills: [1200, 270],
    deep_water: [540, 340],
  };
  for (const terrain of ['forest', 'marsh', 'hills', 'deep_water']) {
    const speed = continuousSurfaceAt(field, point(samples[terrain]!)).speedPermille;
    addLayerToggle(
      terrain,
      names[terrain]!,
      colours[terrain]!,
      speed ? `×${speed / 1000}` : 'закрыта',
      (visible) => {
        map.querySelectorAll<SVGElement>(`[data-terrain="${terrain}"]`).forEach((shape) => {
          shape.style.display = visible ? '' : 'none';
        });
      },
    );
  }
  addLayerToggle('roads', 'Дороги и мосты', '#e9c27a', 'по типу', (visible) => {
    element<SVGElement>('road-layer').style.display = visible ? '' : 'none';
  });
  const select = element<HTMLSelectElement>('preset');
  presets.forEach((preset, index) => {
    const option = new Option(preset.name, String(index));
    select.add(option);
  });
  select.addEventListener('change', () => {
    const preset = presets[Number(select.value)];
    if (select.value === '' || !preset) return;
    start = point(preset.from);
    goal = point(preset.to);
    setMode('goal');
    calculateRoute();
  });
  const initial = presets[0]!;
  start = point(initial.from);
  goal = point(initial.to);
  select.value = '0';
  calculateRoute();
  requestAnimationFrame(animate);
}
void initialize().catch((error) => {
  status.textContent = `Карта не готова: ${error instanceof Error ? error.message : 'ошибка'}`;
});

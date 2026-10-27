import {
  BASE_SPEED_FP_PER_SECOND,
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
import { type Pixel } from './porechye-navigation.js';
import * as regional from './porechye-regional.js';
import {
  advanceMapView,
  boundedMapView,
  panMapView,
  wheelPixels,
  zoomMapView,
  type MapView,
} from './map-camera.js';
import { bindMapPanDrag, bindMapPanKeys } from './map-camera-input.js';
import { mapProfiles } from './navigation-maps.js';
import { mountContractPreview } from './navigation-contracts.js';
import { canEnterPlace, planPlaceArrival, type PlaceEntry } from './place-entries.js';

const requested = new URLSearchParams(location.search).get('map');
const editionId = requested === 'v5' || requested === 'v2' ? requested : 'atlas';
const legacy = editionId === 'v5';
const expanded = editionId === 'atlas';
const mapInfo = mapProfiles[editionId];
const { region, presets, sheet: SHEET, point, pixel, places } = mapInfo;
// Only playback/display time is calibrated. Core plans and biome ratios stay intact.
const walkingTimeScale = legacy
  ? 1
  : ((BASE_SPEED_FP_PER_SECOND / SHEET.fpPerPixel) * regional.metresPerPixel) /
    regional.walkingMetresPerSecond;

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
let destinationName: string | undefined;
let selectedEntry: PlaceEntry | undefined;
let nearbyEntry: PlaceEntry | undefined;
let visitIntent: PlaceEntry | undefined;

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

function drawGeography() {
  map.classList.toggle('atlas', expanded);
  map.setAttribute('viewBox', `0 0 ${SHEET.width} ${SHEET.height}`);
  element('sheet').setAttribute('width', String(SHEET.width));
  element('sheet').setAttribute('height', String(SHEET.height));
  element('sheet').setAttribute('href', `../../assets/art/world/${mapInfo.image}`);
  element('edition-note').textContent = mapInfo.note;
  const edition = element<HTMLSelectElement>('edition');
  edition.value = editionId;
  edition.addEventListener('change', () => {
    location.search = `?map=${edition.value}`;
  });
  if (legacy) return;
  element('time-note').textContent =
    'Пробный пеший темп: поле 1 м/с, местность меняет скорость. Ускорение меняет только просмотр.';
  element('scale').textContent = expanded
    ? 'Атлас 7,2 × 4,8 км · 9 участков'
    : 'Округ 2,4 × 1,6 км · масштаб эскиза';
  for (const place of places) {
    const label = document.createElementNS(svgNS, 'text');
    label.textContent = place.name;
    label.dataset['x'] = String(place.label[0]);
    label.dataset['y'] = String(place.label[1]);
    label.dataset['major'] = String(place.major);
    element('place-labels').append(label);
  }
  element('scale').removeAttribute('hidden');
  element('map-scale').removeAttribute('visibility');
}

function choosePlace(index: number) {
  const place = places[index]!;
  const target = point(place.at);
  clearDestination();
  selectedEntry = mapInfo.entries.find((entry) => entry.name === place.name);
  destinationName = place.name;
  start = markerPosition;
  goal = target;
  setMode('goal');
  if (alreadyAtPlace(target)) {
    clearRouteHere(markerPosition);
    status.textContent = `Отряд уже здесь: ${place.name}.`;
  } else {
    calculateRoute();
  }
  drawEntryZones();
  updateEntryControls();
  if (expanded) focusPlace(place.at);
  element<HTMLSelectElement>('place').value = String(index);
  element('place-description').textContent = place.description;
}

function alreadyAtPlace(target: PointFp) {
  return selectedEntry
    ? canEnterPlace(field, selectedEntry, markerPosition)
    : Math.hypot(target.xFp - markerPosition.xFp, target.zFp - markerPosition.zFp) < 1;
}

function drawEntryZones() {
  element('entry-zones').replaceChildren();
  const entry = selectedEntry ?? nearbyEntry;
  if (!entry) return;
  polygon(entry.footprint, 'entry-zones').classList.add('zone-edge');
  polygon(entry.footprint, 'entry-zones');
}

function refreshNearby() {
  const next = mapInfo.entries.find((entry) => canEnterPlace(field, entry, markerPosition));
  if (next === nearbyEntry) return;
  nearbyEntry = next;
  element('nearby-place').toggleAttribute('hidden', !next);
  element('nearby-title').textContent = next?.name ?? '';
  drawEntryZones();
}

function updateEntryControls() {
  element('entry-controls').toggleAttribute('hidden', !selectedEntry);
  play.textContent = selectedEntry ? 'Идти к окраине' : 'Идти';
  element('entry-status').textContent = selectedEntry
    ? 'Переход к окраине и вход по прибытии. Новый приказ на землю отменит визит.'
    : '';
}

const visit = element<HTMLDialogElement>('place-visit');
function openVisit(entry: PlaceEntry) {
  if (!canEnterPlace(field, entry, markerPosition)) return;
  visitIntent = undefined;
  if (running) pauseJourney();
  panKeys.clear();
  zoomTarget = undefined;
  element('visit-title').textContent = entry.name;
  element('visit-description').textContent = places.find((p) => p.name === entry.name)!.description;
  element<HTMLImageElement>('visit-image').src =
    `../../assets/art/m1/places/settlements-v2/${entry.image}`;
  visit.showModal();
}

element('nearby-enter').addEventListener('click', () => {
  if (nearbyEntry) openVisit(nearbyEntry);
});
element('visit-place').addEventListener('click', () => {
  if (!selectedEntry) return;
  if (canEnterPlace(field, selectedEntry, markerPosition)) {
    openVisit(selectedEntry);
    return;
  }
  start = markerPosition;
  calculateRoute();
  if (!plan) return;
  visitIntent = selectedEntry;
  startJourney();
});
visit.addEventListener('close', () => map.focus({ preventScroll: true }));

function clearRouteHere(target: PointFp) {
  running = false;
  elapsed = 0;
  plan = undefined;
  start = target;
  goal = target;
  play.disabled = true;
  stop.disabled = true;
  element<HTMLSelectElement>('preset').value = '';
  showRouteMetrics();
  drawRoute();
  element('to-marker').setAttribute('visibility', 'hidden');
  showSurface(target);
  updateProgress();
}

function clearDestination() {
  destinationName = undefined;
  selectedEntry = undefined;
  visitIntent = undefined;
  drawEntryZones();
  updateEntryControls();
  element<HTMLSelectElement>('place').value = '';
  element('place-description').textContent =
    'Метки на карте выбирают цель. Следующий переход начинается там, где находится отряд.';
}

function drawPlaces() {
  if (legacy) return;
  element('places-section').removeAttribute('hidden');
  const select = element<HTMLSelectElement>('place');
  select.options[0]!.textContent = `Выберите одно из ${places.length} мест`;
  places.forEach((place, index) => {
    select.add(new Option(place.name, String(index)));
    const marker = document.createElementNS(svgNS, 'g');
    marker.setAttribute('transform', `translate(${place.at.join(' ')})`);
    marker.setAttribute('role', 'button');
    marker.setAttribute('aria-label', `Путь к месту: ${place.name}`);
    marker.setAttribute('tabindex', '0');
    marker.innerHTML =
      '<g class="poi-symbol"><circle class="hit" r="18"/><circle r="7"/><path d="M-3 0H3M0 -3V3"/></g>';
    marker.addEventListener('pointerdown', (event) => event.stopPropagation());
    marker.addEventListener('click', () => choosePlace(index));
    marker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choosePlace(index);
      }
    });
    element('interest-sites').append(marker);
  });
  select.addEventListener('change', () => {
    if (select.value !== '') choosePlace(Number(select.value));
  });
}

function durationText(milliseconds: number) {
  if (legacy) return `${(milliseconds / 1000).toFixed(1)} с`;
  const seconds = Math.ceil(milliseconds / 1000),
    minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} мин ${seconds % 60} с` : `${seconds} с`;
}

function updateProgress() {
  element<HTMLProgressElement>('journey-progress').value = plan
    ? elapsed / Number(plan.arrivesAtMs)
    : 0;
  element('remaining').textContent = plan
    ? durationText((Number(plan.arrivesAtMs) - elapsed) * walkingTimeScale)
    : '—';
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
  input.checked = !expanded;
  if (expanded) toggle(false);
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
  element(id).setAttribute('transform', `translate(${x} ${y}) scale(${symbolScale()})`);
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
  refreshNearby();
}

function drawRoute() {
  const path = plan?.path.map((p) =>
    pixel({ xFp: Number(p.xMicroFp) / 65536, zFp: Number(p.zMicroFp) / 65536 }),
  );
  const d = path?.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ') ?? '';
  element('route').setAttribute('d', d);
  element('route-edge').setAttribute('d', d);
  element('from-marker').setAttribute('visibility', plan ? 'visible' : 'hidden');
  moveMarker('from-marker', start);
  moveMarker('party', start);
  markerPosition = start;
  refreshNearby();
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

function createArrivalPlan(entry: PlaceEntry) {
  const arrival = planPlaceArrival(field, entry, start);
  if (!arrival) throw new Error('Нет доступного подхода к поселению.');
  goal = arrival.goal;
  return arrival.plan;
}

function showRouteMetrics() {
  element('duration').textContent = plan
    ? durationText((Number(plan.totalDurationUs) / 1000) * walkingTimeScale)
    : '—';
  element('distance').textContent = '—';
  if (!plan || legacy) return;
  const length = plan.path.slice(1).reduce((sum, p, i) => {
    const before = plan!.path[i]!;
    return (
      sum +
      Math.hypot(
        Number(p.xMicroFp) - Number(before.xMicroFp),
        Number(p.zMicroFp) - Number(before.zMicroFp),
      ) /
        65536 /
        SHEET.fpPerPixel
    );
  }, 0);
  element('distance').textContent = `${Math.round(length * regional.metresPerPixel)} м`;
}

function calculateRoute() {
  running = false;
  elapsed = 0;
  plan = undefined;
  stop.disabled = true;
  const before = performance.now();
  try {
    plan = selectedEntry ? createArrivalPlan(selectedEntry) : createPlan(goal);
    status.textContent = `Путь найден · поиск ${Math.round(performance.now() - before)} мс. Можно идти или выбрать другую цель.`;
  } catch (error) {
    status.textContent = `Не удалось построить путь: ${error instanceof Error ? error.message : 'ошибка'}`;
  }
  showRouteMetrics();
  play.disabled = !plan;
  updateEntryControls();
  drawRoute();
  showSurface(start);
  updateProgress();
}

function setMode(next: typeof mode) {
  mode = next;
  element('start').setAttribute('aria-pressed', String(mode === 'start'));
  element('goal').setAttribute('aria-pressed', String(mode === 'goal'));
  element('mode').textContent =
    mode === 'start'
      ? 'Нажмите на карту, чтобы поставить старт'
      : 'ПКМ — идти · ЛКМ — выбрать путь или тянуть карту';
}

function setEndpoint(p: PointFp) {
  if (mode === 'start') {
    start = p;
    setMode('goal');
  } else {
    start = markerPosition;
    goal = p;
  }
}

function selectPoint(p: PointFp) {
  if (!field) return false;
  if (!isContinuousPointWalkable(field, p)) {
    status.textContent =
      'Эта точка непроходима или слишком близка к воде. Выберите сухую землю или середину целого моста.';
    return false;
  }
  setEndpoint(p);
  clearDestination();
  element<HTMLSelectElement>('preset').value = '';
  calculateRoute();
  return !!plan;
}

function mapPoint(event: MouseEvent): Pixel {
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    map.getScreenCTM()!.inverse(),
  );
  return [p.x, p.y];
}

function showCoordinates(p: Pixel) {
  element('coordinates').textContent = legacy
    ? `${Math.round(p[0])}, ${Math.round(p[1])} px · Север ↑`
    : `${Math.round(p[0] * regional.metresPerPixel)} м В · ${Math.round(p[1] * regional.metresPerPixel)} м Ю · Север ↑`;
}

map.addEventListener('pointermove', (event) => {
  const p = mapPoint(event);
  showCoordinates(p);
});
let view: MapView = { x: 0, y: 0, width: SHEET.width, height: SHEET.height };
let zoomTarget: MapView | undefined;
function setView(next: MapView) {
  zoomTarget = undefined;
  applyView(boundedMapView(next, SHEET));
}
function applyView(next: MapView) {
  view = next;
  map.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  updateViewportDetails();
}
function animateZoom(elapsedMs: number) {
  if (!zoomTarget) return;
  const next = advanceMapView(view, zoomTarget, elapsedMs);
  if (next === zoomTarget) zoomTarget = undefined;
  applyView(next);
}
const drag = bindMapPanDrag(map, {
  getView: () => view,
  setView,
  cancelZoom: () => (zoomTarget = undefined),
  onClick: (event) => selectPoint(point(mapPoint(event))),
});
const panKeys = bindMapPanKeys(map, toggleJourney);
function animateKeyboardPan(elapsedMs: number) {
  if (!panKeys.held.size) return;
  if (drag.isDragging()) return;
  const direction: Pixel = panKeys.direction();
  const next = panMapView(view, direction, elapsedMs, SHEET);
  if (zoomTarget)
    zoomTarget = boundedMapView(
      {
        ...zoomTarget,
        x: zoomTarget.x + next.x - view.x,
        y: zoomTarget.y + next.y - view.y,
      },
      SHEET,
    );
  applyView(next);
}
function symbolScale() {
  return expanded ? view.width / 1536 : 1;
}
function focusPlace(at: Pixel) {
  const width = Math.min(view.width, 2304),
    height = (width * 2) / 3;
  setView({ x: at[0] - width / 2, y: at[1] - height / 2, width, height });
}
function updateViewportDetails() {
  const scale = symbolScale();
  map.querySelectorAll<SVGElement>('#place-labels text').forEach((label) => {
    label.setAttribute(
      'transform',
      `translate(${label.dataset['x']} ${label.dataset['y']}) scale(${scale})`,
    );
    label.style.display =
      expanded && view.width > 2304 && label.dataset['major'] !== 'true' ? 'none' : '';
  });
  map
    .querySelectorAll<SVGElement>('.poi-symbol')
    .forEach((mark) => mark.setAttribute('transform', `scale(${scale})`));
  moveMarker('from-marker', start);
  moveMarker('to-marker', goal);
  moveMarker('party', markerPosition);
  drawRuler(scale);
}
function drawRuler(scale: number) {
  // The line stays 500m in source coordinates; only glyphs adapt to the view.
  const x = view.x + 55 * scale,
    y = view.y + view.height - 65 * scale;
  const end = x + 500 / regional.metresPerPixel;
  element('map-scale').setAttribute('transform', `translate(${x} ${y})`);
  element('map-scale').innerHTML =
    `<path d="M0 0V${12 * scale}H${end - x}V0"/><text transform="translate(0 ${35 * scale}) scale(${scale})">0</text><text text-anchor="end" transform="translate(${end - x} ${35 * scale}) scale(${scale})">500 м</text>`;
}
map.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    if (drag.isDragging()) return;
    map.focus({ preventScroll: true });
    const [x, y] = mapPoint(event);
    const fraction: Pixel = [(x - view.x) / view.width, (y - view.y) / view.height];
    const delta = wheelPixels(event.deltaY, event.deltaMode, map.clientHeight);
    zoomTarget = zoomMapView(zoomTarget ?? view, fraction, delta, SHEET);
  },
  { passive: false },
);
map.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  map.focus({ preventScroll: true });
  setMode('goal');
  if (selectPoint(point(mapPoint(event)))) startJourney();
});
element('fit').addEventListener('click', () =>
  setView({ x: 0, y: 0, width: SHEET.width, height: SHEET.height }),
);
element('start').addEventListener('click', () => setMode('start'));
element('goal').addEventListener('click', () => setMode('goal'));
element<HTMLInputElement>('night').addEventListener('change', (event) =>
  map.classList.toggle('night', (event.target as HTMLInputElement).checked),
);
function startJourney() {
  if (!plan || elapsed >= Number(plan.arrivesAtMs)) return;
  running = true;
  lastFrame = performance.now();
  stop.disabled = false;
  play.disabled = true;
  status.textContent = visitIntent
    ? `Отряд идёт посетить ${visitIntent.name}. Поселение откроется по прибытии.`
    : 'Отряд в пути. Скорость меняется при переходе границ зон.';
}
function toggleJourney() {
  if (running) pauseJourney();
  else startJourney();
}
play.addEventListener('click', startJourney);
function pauseJourney() {
  running = false;
  play.disabled = false;
  stop.disabled = true;
  play.textContent = 'Продолжить';
  status.textContent = visitIntent
    ? `Визит в ${visitIntent.name} приостановлен. «Продолжить» возобновит его.`
    : 'Отряд остановлен. Можно продолжить этот путь.';
}
stop.addEventListener('click', pauseJourney);

function arrive() {
  running = false;
  play.disabled = true;
  stop.disabled = true;
  play.textContent = 'Прибыли';
  status.textContent = destinationName
    ? `Отряд прибыл: ${destinationName}.`
    : 'Отряд прибыл в выбранную точку.';
  const entry = visitIntent;
  visitIntent = undefined;
  if (entry) openVisit(entry);
}

function animate(now: number) {
  // A click can start travel after this frame's timestamp was captured.
  const elapsedMs = Math.max(0, now - lastFrame);
  animateZoom(elapsedMs);
  animateKeyboardPan(elapsedMs);
  if (running && plan) {
    elapsed = Math.min(
      Number(plan.arrivesAtMs),
      elapsed + (elapsedMs * Number(rate.value)) / walkingTimeScale,
    );
    const p = positionAt(plan, String(Math.floor(elapsed)));
    const current = { xFp: Number(p.xMicroFp) / 65536, zFp: Number(p.zMicroFp) / 65536 };
    updateParty(current);
    showSurface(current);
    updateProgress();
    if (elapsed >= Number(plan.arrivesAtMs)) {
      arrive();
    }
  }
  lastFrame = Math.max(lastFrame, now);
  requestAnimationFrame(animate);
}

async function initialize() {
  drawGeography();
  drawLayers();
  // Yield once so the image and loading message paint before compiling geometry.
  await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  field = buildNavigationField(region);
  drawPlaces();
  if (expanded)
    mountContractPreview((name) => {
      choosePlace(places.findIndex((p) => p.name === name));
      element<HTMLDetailsElement>('contracts-section').open = false;
    });
  setView({ x: 0, y: 0, width: SHEET.width, height: SHEET.height });
  const samples = mapInfo.samples;
  for (const terrain of Object.keys(samples)) {
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
    start = markerPosition;
    goal = point(preset.to);
    clearDestination();
    setMode('goal');
    calculateRoute();
  });
  const initial = presets[0]!;
  start = point(initial.from);
  clearRouteHere(start);
  setMode('goal');
  status.textContent = 'ПКМ по сухой земле — идти. ЛКМ — предварительный выбор пути.';
  requestAnimationFrame(animate);
}
void initialize().catch((error) => {
  status.textContent = `Карта не готова: ${error instanceof Error ? error.message : 'ошибка'}`;
});

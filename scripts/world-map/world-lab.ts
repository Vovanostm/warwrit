import { Client, type Room, type SeatReservation } from '@colyseus/sdk';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  WORLD_LAB_PURSUIT_ORDER_HEADER,
  worldLabPursuitToken,
  type WorldFreeMovementV2RequestDto,
  type WorldLabObservedGroupDto,
  type WorldLabPursuitRequestDto,
  type WorldLabRoomTicketDto,
  type WorldLabSlot,
  type WorldLabStateDto,
  type WorldLabVisitDto,
} from '@warwrit/protocol';
import {
  PAINTED_ATLAS_SHEET,
  PAINTED_ATLAS_SITES,
  paintedAtlasPixel,
  paintedAtlasPoint,
  positionAt,
  type ContinuousMovementPlan,
} from '@warwrit/game-core';
import {
  advanceMapView,
  boundedMapView,
  panMapView,
  wheelPixels,
  zoomMapView,
  type MapView,
} from './map-camera.js';
import { bindMapPanDrag, bindMapPanKeys } from './map-camera-input.js';
import type { Pixel } from './porechye-navigation.js';
import { createMapIcon, createPartyKey, partyIconName, siteIconName } from './map-icons.js';
import { layoutMapLabels } from './map-labels.js';
import {
  isWorldLabStateNotOlder,
  preserveNewerWorldLabGroups,
  readWorldLabVisit,
  readWorldLabState,
} from './world-lab-state.js';

const API = '/world-lab-api/world-lab';
const SVG_NS = 'http://www.w3.org/2000/svg';
const SHEET = PAINTED_ATLAS_SHEET;
const $ = <T extends Element>(id: string) => document.getElementById(id)! as unknown as T;
const map = $<SVGSVGElement>('map');
const groupLayer = $<SVGGElement>('observed-groups');
const stateText = $<HTMLElement>('connection-status');
const message = $<HTMLElement>('client-message');
const followOwn = $<HTMLInputElement>('follow-own');
const requestHeaders = { 'content-type': 'application/json' };

let snapshot: WorldLabStateDto | undefined;
let room: Room | undefined;
let connectionAttempt = 0;
let sessionGeneration = 0;
let movementOrderGeneration = 0;
let reconnectTimer = 0;
let lastSnapshotReceivedAt = 0;
let snapshotServerTimeMs = 0;
let transportConnected = false;
let connectionError: string | undefined;
let lastStateRefreshAt = 0;
let view: MapView = { x: 0, y: 0, width: SHEET.width, height: SHEET.height };
let zoomTarget: MapView | undefined;
const groupElements = new Map<string, SVGGElement>();
let focusedGroupId: string | undefined;
let focusedSiteId: string | undefined;
let lastLabelLayoutAt = 0;
let lastLabelViewBox: string | null = null;
interface GroupSamples {
  previous?: { readonly x: number; readonly z: number; readonly timeMs: number };
  current: {
    readonly x: number;
    readonly z: number;
    readonly timeMs: number;
    readonly epoch: string;
  };
}
const groupSamples = new Map<string, GroupSamples>();
const MAX_SNAPSHOT_AGE_MS = 2000;
const INTERPOLATION_DELAY_MS = 200;

function showConnection(status: 'connecting' | 'live' | 'stale' | 'login', text: string) {
  document.body.dataset['connection'] = status;
  stateText.textContent = text;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function jsonRequest(
  url: string,
  init?: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
  const body: unknown = await response.json().catch(() => undefined);
  return { response, body };
}

function renderSessionPrompt(show: boolean) {
  $('fixture-login').toggleAttribute('hidden', !show);
  $('switch-slot').toggleAttribute('hidden', show || !snapshot);
}

function rememberGroups(state: WorldLabStateDto) {
  const present = new Set<string>();
  for (const group of state.groups) {
    present.add(group.id);
    const current = {
      x: Number(group.point.xMicroFp),
      z: Number(group.point.zMicroFp),
      timeMs: Number(group.observedAtMs),
      epoch: group.movementEpoch,
    };
    const previous = groupSamples.get(group.id);
    const canInterpolate =
      previous?.current.epoch === current.epoch && previous.current.timeMs < current.timeMs;
    groupSamples.set(group.id, {
      current,
      ...(canInterpolate ? { previous: previous.current } : {}),
    });
  }
  for (const id of groupSamples.keys()) if (!present.has(id)) groupSamples.delete(id);
}

function maybeNewer(next: WorldLabStateDto) {
  if (snapshot && !isWorldLabStateNotOlder(next, snapshot)) return;
  next = preserveNewerWorldLabGroups(next, snapshot);
  const newSession =
    !snapshot || next.worldId !== snapshot.worldId || next.own.companyId !== snapshot.own.companyId;
  if (newSession) groupSamples.clear();
  rememberGroups(next);
  snapshot = next;
  snapshotServerTimeMs = Number(next.serverTimeMs);
  lastSnapshotReceivedAt = performance.now();
  render(next);
  if (newSession) {
    followOwn.checked = false;
    centerOnOwn(true);
  }
  updateFreshness();
}

function pointOnMap(point: { readonly xMicroFp: string; readonly zMicroFp: string }): Pixel {
  return paintedAtlasPixel({
    xFp: Number(point.xMicroFp) / 65536,
    zFp: Number(point.zMicroFp) / 65536,
  });
}

function setMarker(
  group: SVGGElement,
  point: { readonly xMicroFp: string; readonly zMicroFp: string },
) {
  const [x, y] = pointOnMap(point);
  group.setAttribute('transform', `translate(${x} ${y}) scale(${markerScale()})`);
}

function setMarkerAtMicroFp(group: SVGGElement, xMicroFp: number, zMicroFp: number) {
  const [x, y] = paintedAtlasPixel({ xFp: xMicroFp / 65536, zFp: zMicroFp / 65536 });
  group.setAttribute('transform', `translate(${x} ${y}) scale(${markerScale()})`);
}

function groupGlyph(group: WorldLabObservedGroupDto): SVGGElement {
  let marker = groupElements.get(group.id);
  if (marker) return marker;
  marker = document.createElementNS(SVG_NS, 'g');
  marker.classList.add('group', 'observed');
  marker.dataset['kind'] = group.kind;
  marker.dataset['groupId'] = group.id;
  marker.setAttribute('tabindex', '0');
  marker.setAttribute('role', 'img');
  const symbol = createMapIcon(partyIconName(group.kind), 28);
  const disc = document.createElementNS(SVG_NS, 'circle');
  disc.classList.add('group-disc');
  disc.setAttribute('r', '19');
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('y', '37');
  const hit = document.createElementNS(SVG_NS, 'circle');
  hit.setAttribute('r', '28');
  hit.classList.add('group-hit');
  const ring = document.createElementNS(SVG_NS, 'circle');
  // Keep the selected threat visible even when the own 20px marker overlaps it.
  ring.setAttribute('r', '27');
  ring.classList.add('pursuit-ring');
  marker.append(hit, disc, ring, symbol, label);
  marker.addEventListener('keydown', (event) => {
    if (
      event.key === 'Enter' &&
      snapshot?.groups.some((entry) => entry.id === group.id && entry.pursuable)
    ) {
      event.preventDefault();
      void commandMovement({ kind: 'PURSUE', targetGroupId: group.id });
    }
  });
  const showIdentity = () => showContactIdentity(group.id);
  const clearIdentity = () => {
    if (focusedGroupId === group.id) showContactIdentity();
  };
  marker.addEventListener('mouseenter', showIdentity);
  marker.addEventListener('focus', showIdentity);
  marker.addEventListener('mouseleave', clearIdentity);
  marker.addEventListener('blur', clearIdentity);
  groupLayer.append(marker);
  groupElements.set(group.id, marker);
  return marker;
}

function showContactIdentity(id?: string) {
  const marker = id ? groupElements.get(id) : undefined;
  focusedGroupId = marker ? id : undefined;
  $('contact-focus').textContent =
    marker?.getAttribute('aria-label') ??
    PAINTED_ATLAS_SITES.find((site) => site.siteId === focusedSiteId)?.name ??
    '';
  updateSiteLabels(true);
}

function renderGroups(groups: readonly WorldLabObservedGroupDto[]) {
  const present = new Set<string>();
  const observed = groups.filter((group) => group.id !== snapshot?.own.companyId);
  for (const group of observed) {
    present.add(group.id);
    const marker = groupGlyph(group);
    marker.dataset['kind'] = group.kind;
    marker.setAttribute('role', group.pursuable ? 'button' : 'img');
    marker.toggleAttribute(
      'data-pursuit-target',
      snapshot?.pursuit?.status === 'CHASING' && snapshot.pursuit.targetId === group.id,
    );
    marker.setAttribute(
      'aria-label',
      `${group.name} · ${group.state === 'MOVING' ? 'движется' : 'стоит'}${group.pursuable ? ' · ПКМ — преследовать' : ''}`,
    );
    marker.querySelector('text')!.textContent = group.name;
    setMarker(marker, group.point);
  }
  for (const [id, marker] of groupElements) {
    if (!present.has(id)) {
      marker.remove();
      groupElements.delete(id);
    }
  }
  showContactIdentity(focusedGroupId);
  const list = $('nearby-groups');
  list.replaceChildren();
  if (!observed.length) {
    const empty = document.createElement('p');
    empty.className = 'fine';
    empty.textContent = 'Других наблюдаемых групп рядом сейчас нет.';
    list.append(empty);
    return;
  }
  for (const group of observed) {
    const row = document.createElement('div');
    row.className = 'group-row';
    const dot = createPartyKey(group.kind);
    const label = document.createElement('span');
    label.textContent = `${group.name} · ${group.state === 'MOVING' ? 'в пути' : 'стоит'}`;
    row.append(dot, label);
    list.append(row);
  }
}

function renderRoute(state: WorldLabStateDto) {
  const movement = state.own.movement;
  const path = movement.plan?.path.map(pointOnMap) ?? [];
  $('own-route').setAttribute(
    'd',
    path.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' '),
  );
  setMarker($<SVGGElement>('own-marker'), movement.point);
  $('stop').toggleAttribute(
    'disabled',
    !hasMovementOrder() || performance.now() - lastSnapshotReceivedAt > MAX_SNAPSHOT_AGE_MS,
  );
  $('own-state').textContent =
    pursuitMessage(state) ??
    (movement.mode === 'MOVING'
      ? 'Идёт по принятому сервером маршруту.'
      : 'Стоит. Можно задать новый путь правой кнопкой мыши.');
}

function hasMovementOrder() {
  return Boolean(
    snapshot?.pursuit?.status === 'CHASING' || snapshot?.own.movement.mode === 'MOVING',
  );
}

function pursuitMessage(state: WorldLabStateDto): string | undefined {
  const pursuit = state.pursuit;
  if (!pursuit) return undefined;
  switch (pursuit.status) {
    case 'CHASING':
      return `Преследует: ${pursuit.targetName}.`;
    case 'LAST_SEEN':
      return state.own.movement.mode === 'MOVING'
        ? 'Цель скрылась. Идёт к последнему замеченному месту.'
        : 'След потерян. Отряд у последнего замеченного места.';
    case 'REACHED':
      return 'Цель рядом. Отряд остановился.';
    case 'BLOCKED':
      return 'Преследование прекращено: путь недоступен.';
  }
}

function centerOnOwn(initial = false) {
  if (!snapshot) return;
  const width = initial ? Math.min(SHEET.width, 1536) : view.width;
  const aspect = map.clientWidth && map.clientHeight ? map.clientWidth / map.clientHeight : 1.5;
  const height = initial ? Math.min(SHEET.height, width / aspect) : view.height;
  setView(viewOnOwn(performance.now(), { ...view, width, height }));
}

function viewOnOwn(now: number, current: MapView): MapView {
  const point = ownPositionNow(now);
  if (!point) return current;
  const [x, y] = pointOnMap(point);
  return boundedMapView({ ...current, x: x - current.width / 2, y: y - current.height / 2 }, SHEET);
}

function markerScale() {
  // SVG units per screen pixel: symbols stay readable through zoom and resize.
  return 1 / (map.getScreenCTM()?.a ?? 1);
}

function updateSiteLabels(force = false) {
  const now = performance.now();
  const viewBox = map.getAttribute('viewBox');
  if (!force && viewBox === lastLabelViewBox && now - lastLabelLayoutAt < 180) return;
  lastLabelLayoutAt = now;
  lastLabelViewBox = viewBox;
  layoutMapLabels(map, view.width > 2304, focusedSiteId);
}

function syncStaticMarkerScale() {
  const scale = markerScale();
  map.classList.toggle('map-overview', view.width > 2304);
  map.querySelectorAll<SVGGElement>('#site-markers [data-site-id]').forEach((marker) => {
    marker.setAttribute(
      'transform',
      `translate(${marker.dataset['x']} ${marker.dataset['y']}) scale(${scale})`,
    );
  });
}

function snapshotIsFresh() {
  return !!snapshot && performance.now() - lastSnapshotReceivedAt <= MAX_SNAPSHOT_AGE_MS;
}

function updateFreshness() {
  const fresh = snapshotIsFresh();
  $('stop').toggleAttribute('disabled', !fresh || !hasMovementOrder());
  $('enter-site').toggleAttribute('disabled', !fresh || !snapshot?.nearbySite);
  $('center-own').toggleAttribute('disabled', !snapshot);
  followOwn.disabled = !snapshot;
  if (!snapshot) return;
  if (!fresh) {
    showConnection('stale', 'Состояние устарело · приказы временно заблокированы');
  } else if (!transportConnected) {
    showConnection('connecting', 'Снимок свежий · восстанавливаем связь');
  } else {
    showConnection('live', 'Мир обновляется');
  }
}

function estimatedServerTime(now: number) {
  return (
    snapshotServerTimeMs +
    Math.min(MAX_SNAPSHOT_AGE_MS, Math.max(0, now - lastSnapshotReceivedAt)) *
      (snapshot?.timeScale ?? 1)
  );
}

function ownPositionNow(now: number) {
  if (!snapshot) return undefined;
  const movement = snapshot.own.movement;
  if (movement.mode !== 'MOVING' || !movement.plan) return movement.point;
  try {
    const time = Math.min(
      Number(movement.plan.arrivesAtMs),
      Number(movement.serverTimeMs) +
        Math.min(MAX_SNAPSHOT_AGE_MS, Math.max(0, now - lastSnapshotReceivedAt)) *
          snapshot.timeScale,
    );
    return positionAt(
      movement.plan as ContinuousMovementPlan,
      String(Math.max(0, Math.floor(time))),
    );
  } catch {
    return movement.point;
  }
}

function observedPositionNow(id: string, now: number) {
  const samples = groupSamples.get(id);
  if (!samples) return undefined;
  const current = samples.current;
  const previous = samples.previous;
  if (!previous || previous.timeMs >= current.timeMs || !snapshot) return current;
  const renderTime = estimatedServerTime(now) - INTERPOLATION_DELAY_MS * snapshot.timeScale;
  const t = Math.max(
    0,
    Math.min(1, (renderTime - previous.timeMs) / (current.timeMs - previous.timeMs)),
  );
  return {
    x: previous.x + (current.x - previous.x) * t,
    z: previous.z + (current.z - previous.z) * t,
  };
}

function updateAnimatedMarkers(now: number) {
  const ownPosition = ownPositionNow(now);
  if (ownPosition) setMarker($<SVGGElement>('own-marker'), ownPosition);
  for (const [id, marker] of groupElements) {
    const point = observedPositionNow(id, now);
    if (point) setMarkerAtMicroFp(marker, point.x, point.z);
  }
  syncStaticMarkerScale();
  updateSiteLabels();
}

function render(state: WorldLabStateDto) {
  $('session-label').textContent = state.own.name;
  $('own-name').textContent = state.own.name;
  $('server-time').textContent = new Date(Number(state.serverTimeMs)).toLocaleTimeString('ru-RU');
  $('world-light').textContent = state.light === 'NIGHT' ? 'Ночь' : 'День';
  $('world-sequence').textContent = state.sequence;
  $('map-note').textContent =
    `Общее пробное время ×${state.timeScale} · позиции и видимость задаёт сервер`;
  map.classList.toggle('night', state.light === 'NIGHT');
  renderRoute(state);
  renderGroups(state.groups);
  $('nearby-site').toggleAttribute('hidden', !state.nearbySite);
  $('nearby-site-name').textContent = state.nearbySite?.name ?? '';
  renderSessionPrompt(false);
}

function drawSites() {
  const layer = $('site-markers');
  for (const site of PAINTED_ATLAS_SITES) {
    const marker = document.createElementNS(SVG_NS, 'g');
    marker.classList.add('site-marker');
    const major = PAINTED_ATLAS_SITES.indexOf(site) < 5;
    marker.classList.toggle('site-minor', !major);
    marker.dataset['siteId'] = site.siteId;
    marker.setAttribute('role', 'img');
    marker.setAttribute('aria-label', site.name);
    const [x, y] = paintedAtlasPixel(site.anchorFp);
    marker.dataset['x'] = String(x);
    marker.dataset['y'] = String(y);
    marker.setAttribute('transform', `translate(${x} ${y}) scale(${markerScale()})`);
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', '14');
    circle.classList.add('site-disc');
    const hit = document.createElementNS(SVG_NS, 'circle');
    hit.setAttribute('r', '18');
    hit.classList.add('site-hit');
    const label = document.createElementNS(SVG_NS, 'text');
    label.textContent = site.name;
    label.setAttribute('y', '-24');
    label.classList.add('site-label');
    label.dataset['major'] = String(major);
    const leader = document.createElementNS(SVG_NS, 'line');
    leader.classList.add('site-leader');
    marker.append(hit, leader, circle, createMapIcon(siteIconName(site.siteId), 21), label);
    marker.addEventListener('mouseenter', () => {
      focusedSiteId = site.siteId;
      showContactIdentity();
    });
    marker.addEventListener('mouseleave', () => {
      focusedSiteId = undefined;
      showContactIdentity(focusedGroupId);
    });
    layer.append(marker);
  }
}

async function loadState(generation = sessionGeneration) {
  const { response, body } = await jsonRequest(`${API}/state`);
  if (generation !== sessionGeneration) return;
  if (response.status === 401) {
    snapshot = undefined;
    lastSnapshotReceivedAt = 0;
    closeRoom();
    clearSnapshotView();
    showConnection('login', 'Нужен тестовый сеанс');
    renderSessionPrompt(true);
    return;
  }
  if (!response.ok) throw new Error('Не удалось получить состояние мира.');
  const state = readWorldLabState(body);
  if (!state) throw new Error('Сервер вернул некорректное состояние мира.');
  maybeNewer(state);
}

function closeRoom() {
  connectionAttempt += 1;
  window.clearTimeout(reconnectTimer);
  reconnectTimer = 0;
  if (room) void room.leave(true).catch(() => undefined);
  room = undefined;
  transportConnected = false;
}

function clearSnapshotView() {
  followOwn.checked = false;
  followOwn.disabled = true;
  groupElements.clear();
  showContactIdentity();
  groupLayer.replaceChildren();
  groupSamples.clear();
  lastSnapshotReceivedAt = 0;
  snapshotServerTimeMs = 0;
  $('nearby-groups').replaceChildren();
  $('nearby-site').setAttribute('hidden', '');
  $('own-name').textContent = '—';
  $('own-state').textContent = 'Ожидаем состояние мира…';
  $('own-route').setAttribute('d', '');
  $('stop').setAttribute('disabled', '');
  $('enter-site').setAttribute('disabled', '');
  $('session-label').textContent = 'Сеанс выбирается сервером лаборатории.';
}

async function connectRoom() {
  const generation = sessionGeneration;
  const attempt = ++connectionAttempt;
  showConnection('connecting', 'Подключение к общей карте…');
  try {
    const { response, body } = await jsonRequest(`${API}/room-ticket`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ schemaVersion: 1 }),
    });
    if (!response.ok || !record(body))
      throw new Error('Не удалось получить пропуск в комнату карты.');
    const ticket = body as unknown as WorldLabRoomTicketDto;
    const realtimeUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/world-lab-ws`;
    const client = new Client(realtimeUrl) as unknown as {
      consumeSeatReservation(value: SeatReservation): Promise<Room>;
    };
    const connected = await client.consumeSeatReservation(ticket as unknown as SeatReservation);
    if (attempt !== connectionAttempt || generation !== sessionGeneration) {
      await connected.leave(true);
      return;
    }
    room = connected;
    connected.onMessage('world', (payload: unknown) => {
      if (attempt !== connectionAttempt || generation !== sessionGeneration) return;
      const state = readWorldLabState(payload);
      if (state) maybeNewer(state);
    });
    connected.onDrop(() => {
      if (attempt !== connectionAttempt || generation !== sessionGeneration) return;
      transportConnected = false;
      updateFreshness();
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => {
        if (attempt !== connectionAttempt) return;
        void connected.leave(true).catch(() => undefined);
        void connectRoom();
      }, 2500);
    });
    connected.onReconnect(() => {
      if (attempt !== connectionAttempt || generation !== sessionGeneration) return;
      window.clearTimeout(reconnectTimer);
      reconnectTimer = 0;
      transportConnected = true;
      clearConnectionError();
      updateFreshness();
      void loadState(generation).catch(reportError);
    });
    connected.onLeave(() => {
      if (attempt !== connectionAttempt || generation !== sessionGeneration) return;
      transportConnected = false;
      updateFreshness();
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => {
        if (attempt === connectionAttempt) void connectRoom();
      }, 1500);
    });
    transportConnected = true;
    clearConnectionError();
    updateFreshness();
  } catch (error) {
    if (attempt !== connectionAttempt || generation !== sessionGeneration) return;
    transportConnected = false;
    updateFreshness();
    reportError(error);
    connectionError = message.textContent ?? undefined;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(() => {
      if (attempt === connectionAttempt) void connectRoom();
    }, 3000);
  }
}

function clearConnectionError() {
  if (message.textContent === connectionError) message.textContent = '';
  connectionError = undefined;
}

function reportError(error: unknown) {
  message.textContent = error instanceof Error ? error.message : 'Не удалось выполнить действие.';
}

async function selectFixture(slot: WorldLabSlot) {
  const generation = ++sessionGeneration;
  closeRoom();
  snapshot = undefined;
  clearSnapshotView();
  renderSessionPrompt(true);
  showConnection('connecting', 'Открываем тестовый сеанс…');
  try {
    const { response, body } = await jsonRequest(`${API}/session`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ slot }),
    });
    if (generation !== sessionGeneration) return;
    if (!response.ok)
      throw new Error(
        record(body) && typeof body['message'] === 'string'
          ? body['message']
          : 'Сервер не открыл тестовый сеанс.',
      );
    message.textContent = '';
    await loadState(generation);
    if (snapshot) await connectRoom();
  } catch (error) {
    if (generation !== sessionGeneration) return;
    reportError(error);
    showConnection('stale', 'Сеанс не подключён');
  }
}

async function commandMovement(
  action:
    | WorldFreeMovementV2RequestDto['action']
    | { readonly kind: 'PURSUE'; readonly targetGroupId: string },
  retryStale = true,
  expectedPursuitOrderId?: string,
): Promise<boolean> {
  if (!snapshot || !snapshotIsFresh()) {
    message.textContent = 'Состояние карты устарело. Дождитесь обновления перед приказом.';
    updateFreshness();
    return false;
  }
  const generation = sessionGeneration;
  const order = ++movementOrderGeneration;
  const companyId = snapshot.own.companyId;
  const pursuitOrderId = expectedPursuitOrderId ?? snapshot.pursuit?.orderId;
  const movement = snapshot.own.movement;
  const base = {
    commandId: crypto.randomUUID(),
    expectedPublicRevision: movement.publicRevision,
    expectedMovementEpoch: movement.movementEpoch,
  };
  const pursuing = action.kind === 'PURSUE';
  const request: WorldFreeMovementV2RequestDto | WorldLabPursuitRequestDto = pursuing
    ? { schemaVersion: 1, ...base, targetGroupId: action.targetGroupId }
    : { schemaVersion: 2, ...base, action };
  try {
    const { response, body } = await jsonRequest(`${API}/${pursuing ? 'pursuit' : 'movement'}`, {
      method: 'POST',
      headers: {
        ...requestHeaders,
        [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
        [WORLD_LAB_PURSUIT_ORDER_HEADER]: worldLabPursuitToken(pursuitOrderId),
      },
      body: JSON.stringify(request),
    });
    if (!isCurrentMovementOrder(generation, order)) return false;
    if (retryStale && isStaleMovementResponse(response, body)) {
      return await retryCurrentPursuitOrder(action, generation, order, pursuitOrderId);
    }
    if (!response.ok) throw new Error(movementFailureMessage(body));
    message.textContent = pursuing
      ? 'Преследование принято. Пробел — остановиться.'
      : 'Приказ принят сервером.';
    await loadState(generation);
    return true;
  } catch (error) {
    if (!isCurrentMovementOrder(generation, order)) return false;
    reportError(error);
    await loadState(generation).catch(() => undefined);
    return false;
  }
}

async function retryCurrentPursuitOrder(
  action: Parameters<typeof commandMovement>[0],
  generation: number,
  order: number,
  pursuitOrderId: string | undefined,
): Promise<boolean> {
  await loadState(generation);
  if (!isCurrentMovementOrder(generation, order)) return false;
  if (!pursuitOrderId || snapshot?.pursuit?.orderId !== pursuitOrderId)
    throw new Error('Положение изменилось. Проверьте карту и повторите приказ.');
  return commandMovement(action, false, pursuitOrderId);
}

function isCurrentMovementOrder(generation: number, order: number) {
  return generation === sessionGeneration && order === movementOrderGeneration;
}

function isStaleMovementResponse(response: Response, body: unknown) {
  return (
    response.status === 409 &&
    record(body) &&
    ['STALE_REVISION', 'STALE_MOVEMENT_EPOCH'].includes(String(body['code']))
  );
}

function movementFailureMessage(body: unknown): string {
  if (!record(body)) return 'Приказ не принят сервером.';
  if (body['code'] === 'TARGET_NOT_VISIBLE')
    return 'Цель недоступна для преследования. Дождитесь нового наблюдения.';
  return typeof body['code'] === 'string'
    ? `Приказ отклонён: ${body['code']}`
    : 'Приказ не принят сервером.';
}

function mapPoint(event: MouseEvent): Pixel {
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    map.getScreenCTM()!.inverse(),
  );
  return [point.x, point.y];
}

function setView(next: MapView) {
  zoomTarget = undefined;
  view = boundedMapView(next, SHEET);
  map.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  updateAnimatedMarkers(performance.now());
}

function issueMove(target: Pixel, siteId?: string) {
  if (!snapshot || !snapshotIsFresh()) {
    message.textContent = 'Сначала подключитесь и дождитесь свежего положения отряда.';
    updateFreshness();
    return;
  }
  const point = paintedAtlasPoint(target);
  void commandMovement({
    kind: 'MOVE_TO',
    mapEdition: snapshot.mapEdition,
    target: siteId ? { kind: 'SITE', siteId } : { kind: 'TERRAIN', xFp: point.xFp, zFp: point.zFp },
  });
}

const drag = bindMapPanDrag(map, {
  getView: () => view,
  setView: (next) => {
    followOwn.checked = false;
    setView(next);
  },
  cancelZoom: () => (zoomTarget = undefined),
});
map.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  map.focus({ preventScroll: true });
  const groupMarker =
    event.target instanceof Element ? event.target.closest<SVGGElement>('[data-group-id]') : null;
  const group = snapshot?.groups.find((entry) => entry.id === groupMarker?.dataset['groupId']);
  if (group?.pursuable) {
    void commandMovement({ kind: 'PURSUE', targetGroupId: group.id });
    return;
  }
  const site =
    event.target instanceof Element ? event.target.closest<SVGGElement>('[data-site-id]') : null;
  issueMove(mapPoint(event), site?.dataset['siteId']);
});
map.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    map.focus({ preventScroll: true });
    const [x, y] = mapPoint(event);
    const delta = wheelPixels(event.deltaY, event.deltaMode, map.clientHeight);
    zoomTarget = zoomMapView(
      zoomTarget ?? view,
      [(x - view.x) / view.width, (y - view.y) / view.height],
      delta,
      SHEET,
    );
  },
  { passive: false },
);

const panKeys = bindMapPanKeys(map, () => {
  if (hasMovementOrder()) void commandMovement({ kind: 'STOP' });
});

function animate(now: number) {
  const delta = Math.min(50, now - lastFrame);
  if (zoomTarget) {
    if (followOwn.checked) {
      view = viewOnOwn(now, view);
      zoomTarget = viewOnOwn(now, zoomTarget);
    }
    const next = advanceMapView(view, zoomTarget, delta);
    if (next === zoomTarget) zoomTarget = undefined;
    view = next;
    map.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    syncStaticMarkerScale();
  }
  if (panKeys.held.size && !drag.isDragging()) {
    followOwn.checked = false;
    zoomTarget = undefined;
    view = panMapView(view, panKeys.direction(), delta, SHEET);
    map.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  }
  if (followOwn.checked) {
    view = viewOnOwn(now, view);
    map.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  }
  updateAnimatedMarkers(now);
  lastFrame = now;
  requestAnimationFrame(animate);
}
let lastFrame = performance.now();

$('fit').addEventListener('click', () => {
  followOwn.checked = false;
  setView({ x: 0, y: 0, width: SHEET.width, height: SHEET.height });
});
$('center-own').addEventListener('click', () => centerOnOwn());
followOwn.addEventListener('change', () => {
  if (followOwn.checked) centerOnOwn();
});
$('stop').addEventListener('click', () => {
  if (hasMovementOrder()) void commandMovement({ kind: 'STOP' });
});
$('fixture-login')
  .querySelectorAll<HTMLButtonElement>('[data-slot]')
  .forEach((button) =>
    button.addEventListener(
      'click',
      () => void selectFixture(button.dataset['slot'] as WorldLabSlot),
    ),
  );
$('switch-slot').addEventListener('click', () => {
  sessionGeneration += 1;
  closeRoom();
  snapshot = undefined;
  clearSnapshotView();
  renderSessionPrompt(true);
  showConnection('login', 'Выберите тестового игрока');
});
$('enter-site').addEventListener('click', () => void visitNearbySite());

async function visitNearbySite() {
  const site = snapshot?.nearbySite;
  if (!site || !snapshot) return;
  if (!snapshotIsFresh()) {
    updateFreshness();
    return;
  }
  const generation = sessionGeneration;
  if (hasMovementOrder() && !(await commandMovement({ kind: 'STOP' }))) return;
  try {
    const { response, body } = await jsonRequest(`${API}/visit`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ siteId: site.siteId }),
    });
    if (generation !== sessionGeneration) return;
    if (!response.ok) {
      message.textContent = visitFailureMessage(response.status);
      await loadState();
      return;
    }
    const visit = readWorldLabVisit(body, site.siteId);
    if (!visit) {
      message.textContent = 'Сервер не подтвердил вход в поселение.';
      await loadState();
      return;
    }
    renderSiteVisit(visit);
  } catch (error) {
    if (generation === sessionGeneration) reportError(error);
  }
}

function visitFailureMessage(status: number) {
  return status === 409 || status === 422
    ? 'Отряд уже ушёл или зона входа изменилась. Обновляем положение.'
    : 'Сервер не подтвердил вход в поселение.';
}

function renderSiteVisit(visit: WorldLabVisitDto) {
  $('site-dialog-title').textContent = visit.name;
  const image = $<HTMLImageElement>('site-dialog-image');
  image.src = visit.image;
  image.alt = visit.name;
  $<HTMLDialogElement>('site-dialog').showModal();
}
document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest('dialog[open]') &&
      event.code.startsWith('Key')
    )
      event.stopPropagation();
  },
  true,
);

map.addEventListener('pointermove', (event) => {
  const [x, y] = mapPoint(event);
  $('map-coordinate').textContent =
    `${Math.round(x * 1.5625)} м В · ${Math.round(y * 1.5625)} м Ю · Север ↑`;
});

async function initialize() {
  $('own-marker').append(createMapIcon('company', 30));
  drawSites();
  new ResizeObserver(() => {
    updateAnimatedMarkers(performance.now());
    updateSiteLabels(true);
  }).observe(map);
  await loadState();
  if (snapshot) await connectRoom();
  requestAnimationFrame(animate);
  window.setInterval(() => {
    updateFreshness();
    const now = performance.now();
    if (snapshot && !snapshotIsFresh() && now - lastStateRefreshAt >= MAX_SNAPSHOT_AGE_MS) {
      lastStateRefreshAt = now;
      void loadState().catch(reportError);
    }
  }, 250);
}
void initialize().catch((error: unknown) => {
  showConnection('stale', 'Карта не подключена');
  reportError(error);
});

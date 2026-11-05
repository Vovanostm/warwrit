import { useEffect, useRef, useState } from 'react';
import type {
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldLabCartographyDto,
  WorldSurroundingsDto,
} from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import {
  advanceMapView,
  boundedMapView,
  panMapView,
  wheelPixels,
  zoomMapView,
  type MapView,
} from '../../../../scripts/world-map/map-camera.js';
import { bindMapPanDrag, bindMapPanKeys } from '../../../../scripts/world-map/map-camera-input.js';
import {
  createCartographyView,
  knownCartographyBounds,
} from '../../../../scripts/world-map/cartography-view.js';
import { isMapIconName, mapIconHref } from '../../../../scripts/world-map/map-symbols.js';
import { layoutMapLabels } from '../../../../scripts/world-map/map-labels.js';
import { continuousMovementPositionAt } from '../renderer/continuous-movement-display.js';
import unknownPaper from '../../../../assets/art/world/fog-paper-v1/unknown-paper.png?url';
import './painted-map.css';

type PaintedCartography = WorldLabCartographyDto & { readonly mapEdition: string };
type MapSite = WorldSurroundingsDto['map']['sites'][number];
const apiBaseUrl = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const toPixel = (
  point: { readonly xMicroFp: string; readonly zMicroFp: string },
  sheet: PaintedCartography['sheet'],
) => ({
  x: Number(point.xMicroFp) / 65536 / sheet.fpPerPixel + sheet.width / 2,
  y: sheet.height / 2 - Number(point.zMicroFp) / 65536 / sheet.fpPerPixel,
});

type PaintedMapProps = {
  readonly companyId: string;
  readonly cartography: PaintedCartography;
  readonly sites: readonly MapSite[];
  readonly current: WorldFreeMovementV2ResponseDto | null;
  readonly clock: { readonly serverMs: number; readonly receivedAt: number };
  readonly night: boolean;
  readonly onPosition?: (point: { xFp: number; zFp: number } | null) => void;
  readonly onMove: (action: WorldFreeMovementV2RequestDto['action']) => void;
  readonly onSelectSite: (id: string) => void;
};

type MapRef<T> = { current: T };
type PaintedMapRefs = {
  readonly map: MapRef<SVGSVGElement | null>;
  readonly tileLayer: MapRef<SVGGElement | null>;
  readonly knowledgeOverlay: MapRef<SVGImageElement | null>;
  readonly revealMask: MapRef<SVGImageElement | null>;
  readonly visibleFrontier: MapRef<SVGPathElement | null>;
  readonly party: MapRef<SVGGElement | null>;
  readonly camera: MapRef<MapView | undefined>;
  readonly zoomTarget: MapRef<MapView | undefined>;
  readonly cartographyView: MapRef<ReturnType<typeof createCartographyView> | undefined>;
  readonly latest: MapRef<PaintedMapProps>;
};

type MapFrameContext = {
  readonly svg: SVGSVGElement;
  readonly latest: MapRef<PaintedMapProps>;
  readonly camera: MapRef<MapView | undefined>;
  readonly zoomTarget: MapRef<MapView | undefined>;
  readonly party: MapRef<SVGGElement | null>;
  readonly movement: ReturnType<typeof bindMapPanKeys>;
  readonly drag: ReturnType<typeof bindMapPanDrag>;
  readonly updateView: (view: MapView) => void;
  readonly updateSiteMarkerScale: () => void;
  readonly lastLayout: MapRef<number>;
};

function updateMapCameraFrame(context: MapFrameContext, elapsed: number) {
  const current = context.camera.current;
  if (!current) return;
  if (context.zoomTarget.current) {
    const next = advanceMapView(current, context.zoomTarget.current, elapsed);
    if (next === context.zoomTarget.current) context.zoomTarget.current = undefined;
    context.updateView(next);
  }
  if (context.movement.held.size && !context.drag.isDragging()) {
    context.zoomTarget.current = undefined;
    context.updateView(
      panMapView(
        context.camera.current ?? current,
        context.movement.direction(),
        elapsed,
        context.latest.current.cartography.sheet,
      ),
    );
  }
}

function updateMapPartyFrame(context: MapFrameContext, now: number) {
  const point = continuousMovementPositionAt(
    context.latest.current.current,
    context.latest.current.clock.serverMs + now - context.latest.current.clock.receivedAt,
  );
  const party = context.party.current;
  if (!point || !party) {
    if (party) party.setAttribute('visibility', 'hidden');
    context.latest.current.onPosition?.(null);
    return;
  }
  const position = toPixel(point, context.latest.current.cartography.sheet);
  party.setAttribute('transform', `translate(${position.x} ${position.y})`);
  party.setAttribute('visibility', 'visible');
  context.latest.current.onPosition?.({
    xFp: Number(point.xMicroFp) / 65536,
    zFp: Number(point.zMicroFp) / 65536,
  });
}

function advancePaintedMapFrame(context: MapFrameContext, now: number, elapsed: number) {
  updateMapCameraFrame(context, elapsed);
  updateMapPartyFrame(context, now);
  if (now - context.lastLayout.current > 180) {
    context.lastLayout.current = now;
    context.updateSiteMarkerScale();
    layoutMapLabels(context.svg, (context.camera.current?.width ?? 0) > 2304);
  }
}

function mountPaintedMap(refs: PaintedMapRefs, setTileError: (error: boolean) => void) {
  const svg = refs.map.current;
  const tiles = refs.tileLayer.current;
  const knowledge = refs.knowledgeOverlay.current;
  const reveal = refs.revealMask.current;
  const frontier = refs.visibleFrontier.current;
  if (!svg || !tiles || !knowledge || !reveal || !frontier) return undefined;

  const updateSiteMarkerScale = () => {
    const scale = 1 / (svg.getScreenCTM()?.a ?? 1);
    for (const marker of svg.querySelectorAll<SVGGElement>('.painted-site'))
      marker.setAttribute(
        'transform',
        `translate(${marker.dataset['x']} ${marker.dataset['y']}) scale(${scale})`,
      );
  };
  const updateView = (view: MapView) => {
    refs.camera.current = boundedMapView(view, refs.latest.current.cartography.sheet);
    svg.setAttribute(
      'viewBox',
      `${refs.camera.current.x} ${refs.camera.current.y} ${refs.camera.current.width} ${refs.camera.current.height}`,
    );
    updateSiteMarkerScale();
    refs.cartographyView.current?.sync(refs.latest.current.cartography, refs.camera.current);
  };
  const viewLayer = createCartographyView(tiles, knowledge, reveal, frontier, {
    loadTile: async (revision, x, y, signal) => {
      const response = await fetch(
        `${apiBaseUrl}/world/cartography/tiles/${encodeURIComponent(revision)}/${x}/${y}.png`,
        {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: refs.latest.current.companyId },
          signal,
        },
      );
      if (!response.ok) throw new Error(`Map tile request failed (${response.status}).`);
      const url = URL.createObjectURL(await response.blob());
      return { url, dispose: () => URL.revokeObjectURL(url) };
    },
    onTileError: () => setTileError(true),
  });
  refs.cartographyView.current = viewLayer;
  const initial = fittedView(
    refs.latest.current.cartography,
    (svg.clientWidth || 3) / (svg.clientHeight || 2),
  );
  updateView(initial);
  viewLayer.render(refs.latest.current.cartography);

  const lastLayout = { current: 0 };
  const drag = bindMapPanDrag(svg, {
    getView: () => refs.camera.current ?? initial,
    setView: updateView,
    cancelZoom: () => (refs.zoomTarget.current = undefined),
  });
  const movement = bindMapPanKeys(
    svg,
    () => {
      if (refs.latest.current.current?.mode === 'MOVING')
        refs.latest.current.onMove({ kind: 'STOP' });
    },
    () => {
      if (refs.latest.current.current?.mode === 'MOVING')
        refs.latest.current.onMove({ kind: 'STOP' });
    },
  );
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    svg.focus({ preventScroll: true });
    const transform = svg.getScreenCTM();
    if (!transform || !refs.camera.current) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    refs.zoomTarget.current = zoomMapView(
      refs.zoomTarget.current ?? refs.camera.current,
      [
        (point.x - refs.camera.current.x) / refs.camera.current.width,
        (point.y - refs.camera.current.y) / refs.camera.current.height,
      ],
      wheelPixels(event.deltaY, event.deltaMode, svg.clientHeight),
      refs.latest.current.cartography.sheet,
    );
  };
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    const transform = svg.getScreenCTM();
    if (!transform) return;
    svg.focus({ preventScroll: true });
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    const target =
      event.target instanceof Element ? event.target.closest<SVGGElement>('[data-site-id]') : null;
    const siteId = target?.dataset['siteId'];
    const cartography = refs.latest.current.cartography;
    const site = cartography.sites.find((entry) => entry.siteId === siteId);
    refs.latest.current.onMove({
      kind: 'MOVE_TO',
      mapEdition: cartography.mapEdition,
      target:
        site && refs.latest.current.sites.some((entry) => entry.siteId === site.siteId)
          ? { kind: 'SITE', siteId: site.siteId }
          : {
              kind: 'TERRAIN',
              xFp: Math.round(
                (point.x - cartography.sheet.width / 2) * cartography.sheet.fpPerPixel,
              ),
              zFp: Math.round(
                (cartography.sheet.height / 2 - point.y) * cartography.sheet.fpPerPixel,
              ),
            },
    });
  };
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('contextmenu', onContextMenu);

  let frame = 0;
  let previous = performance.now();
  const frameContext: MapFrameContext = {
    svg,
    latest: refs.latest,
    camera: refs.camera,
    zoomTarget: refs.zoomTarget,
    party: refs.party,
    movement,
    drag,
    updateView,
    updateSiteMarkerScale,
    lastLayout,
  };
  const animate = (now: number) => {
    advancePaintedMapFrame(frameContext, now, now - previous);
    previous = now;
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
  const resize = new ResizeObserver(() => {
    refs.zoomTarget.current = undefined;
    if (refs.camera.current)
      updateView({
        ...refs.camera.current,
        height: (refs.camera.current.width * svg.clientHeight) / Math.max(1, svg.clientWidth),
      });
  });
  resize.observe(svg);

  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    movement.destroy();
    drag.destroy();
    svg.removeEventListener('wheel', onWheel);
    svg.removeEventListener('contextmenu', onContextMenu);
    viewLayer.clear();
    refs.cartographyView.current = undefined;
    refs.camera.current = undefined;
  };
}

function fittedView(cartography: PaintedCartography, aspect: number): MapView {
  const bounds = knownCartographyBounds(cartography);
  let width = Math.max(1, bounds.right - bounds.left + 520);
  let height = Math.max(1, bounds.bottom - bounds.top + 520);
  if (width / height < aspect) width = height * aspect;
  else height = width / aspect;
  const scaleDown = Math.min(1, cartography.sheet.width / width, cartography.sheet.height / height);
  width *= scaleDown;
  height *= scaleDown;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  return boundedMapView(
    { x: centerX - width / 2, y: centerY - height / 2, width, height },
    cartography.sheet,
  );
}

type PaintedSiteProps = {
  readonly site: PaintedCartography['sites'][number];
  readonly sheet: PaintedCartography['sheet'];
  readonly actionable: boolean;
  readonly onSelectSite: PaintedMapProps['onSelectSite'];
};

function PaintedSiteMarker({ site, sheet, actionable, onSelectSite }: PaintedSiteProps) {
  const position = toPixel(site.point, sheet);
  const icon = isMapIconName(site.icon) ? site.icon : undefined;
  return (
    <g
      className={`site-marker painted-site${site.visited ? ' site-visited' : ''}`}
      data-site-id={site.siteId}
      data-source={site.source.toLowerCase()}
      data-x={position.x}
      data-y={position.y}
      transform={`translate(${position.x} ${position.y})`}
      role={actionable ? 'button' : 'img'}
      tabIndex={actionable ? 0 : undefined}
      aria-label={site.name}
      onClick={actionable ? () => onSelectSite(site.siteId) : undefined}
      onKeyDown={
        actionable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectSite(site.siteId);
              }
            }
          : undefined
      }
    >
      <circle className="site-hit" r="18" />
      <line className="site-leader" />
      <circle className="site-disc" r="11" />
      {icon && (
        <use className="map-icon" href={mapIconHref(icon)} x="-10" y="-10" width="20" height="20" />
      )}
      <text
        className="site-label"
        data-major={String(site.questMarker === true || ['town', 'village'].includes(site.icon))}
        textAnchor="middle"
        y="-20"
      >
        {site.name}
      </text>
    </g>
  );
}

function refreshPaintedCartography(
  cartography: PaintedCartography,
  view: PaintedMapRefs['cartographyView']['current'],
  camera: MapView | undefined,
) {
  view?.render(cartography);
  if (camera) view?.sync(cartography, camera);
}

function PaintedRoute({
  current,
  sheet,
}: {
  readonly current: PaintedMapProps['current'];
  readonly sheet: PaintedCartography['sheet'];
}) {
  const route = current?.plan?.path ?? [];
  if (route.length < 2) return null;
  return (
    <polyline
      className="painted-map-route"
      points={route
        .map((point) => {
          const at = toPixel(point, sheet);
          return `${at.x},${at.y}`;
        })
        .join(' ')}
    />
  );
}

export function PaintedMapCanvas(props: PaintedMapProps) {
  const refs = useRef<PaintedMapRefs>({
    map: { current: null },
    tileLayer: { current: null },
    knowledgeOverlay: { current: null },
    revealMask: { current: null },
    visibleFrontier: { current: null },
    party: { current: null },
    camera: { current: undefined },
    zoomTarget: { current: undefined },
    cartographyView: { current: undefined },
    latest: { current: props },
  }).current;
  const { map, tileLayer, knowledgeOverlay, revealMask, visibleFrontier, party } = refs;
  const [tileError, setTileError] = useState(false);
  refs.latest.current = props;

  useEffect(() => mountPaintedMap(refs, setTileError), [props.cartography.mapEdition, refs]);

  useEffect(() => {
    setTileError(false);
  }, [props.cartography.revision]);

  useEffect(() => {
    refreshPaintedCartography(props.cartography, refs.cartographyView.current, refs.camera.current);
  }, [props.cartography, refs]);

  const actions = new Set(props.sites.map((site) => site.siteId));
  return (
    <div className="painted-map-stage">
      <svg
        ref={map}
        className={`world-map painted-world-map${props.night ? ' painted-world-map-night' : ''}`}
        aria-label="Карта Серого Поречья. Перетаскивание двигает карту, правая кнопка мыши задаёт путь, S или пробел останавливает отряд."
        tabIndex={0}
        preserveAspectRatio="none"
      >
        <defs>
          <mask
            id="painted-known-terrain-mask"
            x="0"
            y="0"
            width={props.cartography.sheet.width}
            height={props.cartography.sheet.height}
            maskUnits="userSpaceOnUse"
            style={{ maskType: 'alpha' }}
          >
            <image
              ref={revealMask}
              x="0"
              y="0"
              width={props.cartography.sheet.width}
              height={props.cartography.sheet.height}
            />
          </mask>
        </defs>
        <rect
          className="painted-map-ground"
          x="0"
          y="0"
          width={props.cartography.sheet.width}
          height={props.cartography.sheet.height}
        />
        <image
          className="painted-map-unknown"
          x="0"
          y="0"
          width={props.cartography.sheet.width}
          height={props.cartography.sheet.height}
          href={unknownPaper}
        />
        <g ref={tileLayer} className="painted-map-tiles" mask="url(#painted-known-terrain-mask)" />
        <image
          ref={knowledgeOverlay}
          className="painted-map-knowledge"
          x="0"
          y="0"
          mask="url(#painted-known-terrain-mask)"
        />
        <path ref={visibleFrontier} className="painted-map-frontier" />
        <g className="painted-map-sites">
          {props.cartography.sites.map((site) => (
            <PaintedSiteMarker
              key={site.siteId}
              site={site}
              sheet={props.cartography.sheet}
              actionable={actions.has(site.siteId)}
              onSelectSite={props.onSelectSite}
            />
          ))}
        </g>
        <PaintedRoute current={props.current} sheet={props.cartography.sheet} />
        <g ref={party} className="painted-map-party" visibility="hidden" aria-label="Ваш отряд">
          <circle r="15" />
          <use href={mapIconHref('company')} x="-12" y="-12" width="24" height="24" />
        </g>
      </svg>
      {tileError && (
        <p className="painted-map-error" role="alert">
          Часть карты недоступна. Обновите страницу, чтобы повторить загрузку.
        </p>
      )}
    </div>
  );
}

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
import { createCartographyView } from '../../../../scripts/world-map/cartography-view.js';
import { isMapIconName, mapIconHref } from '../../../../scripts/world-map/map-symbols.js';
import { layoutMapLabels } from '../../../../scripts/world-map/map-labels.js';
import { continuousMovementPositionAt } from '../renderer/continuous-movement-display.js';
import './painted-map.css';

type PaintedCartography = WorldLabCartographyDto & { readonly mapEdition: string };
type MapSite = WorldSurroundingsDto['map']['sites'][number];
const apiBaseUrl = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const unknownPaper = new URL(
  '../../../../assets/art/world/fog-paper-v1/unknown-paper.png',
  import.meta.url,
).href;
const toPixel = (
  point: { readonly xMicroFp: string; readonly zMicroFp: string },
  sheet: PaintedCartography['sheet'],
) => ({
  x: Number(point.xMicroFp) / 65536 / sheet.fpPerPixel + sheet.width / 2,
  y: sheet.height / 2 - Number(point.zMicroFp) / 65536 / sheet.fpPerPixel,
});

function knownBounds(cartography: PaintedCartography) {
  const { columns, rows, cellSizeFp, origin } = cartography.grid;
  const readMask = (mask: string) =>
    Uint8Array.from(atob(mask), (character) => character.charCodeAt(0));
  const charted = readMask(cartography.charted);
  const explored = readMask(cartography.explored);
  const visible = readMask(cartography.visible);
  const has = (mask: Uint8Array, index: number) => (mask[index >>> 3]! & (1 << (index & 7))) !== 0;
  let left = cartography.sheet.width;
  let top = cartography.sheet.height;
  let right = 0;
  let bottom = 0;
  let found = false;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (!has(charted, index) && !has(explored, index) && !has(visible, index)) continue;
      const x =
        (origin.xFp + column * cellSizeFp) / cartography.sheet.fpPerPixel +
        cartography.sheet.width / 2;
      const y =
        cartography.sheet.height / 2 -
        (origin.zFp + (row + 1) * cellSizeFp) / cartography.sheet.fpPerPixel;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + cellSizeFp / cartography.sheet.fpPerPixel);
      bottom = Math.max(bottom, y + cellSizeFp / cartography.sheet.fpPerPixel);
      found = true;
    }
  }
  for (const site of cartography.sites) {
    const point = toPixel(site.point, cartography.sheet);
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
    found = true;
  }
  if (!found)
    return {
      left: cartography.sheet.width / 2,
      right: cartography.sheet.width / 2,
      top: cartography.sheet.height / 2,
      bottom: cartography.sheet.height / 2,
    };
  return { left, right, top, bottom };
}

function fittedView(cartography: PaintedCartography, aspect: number): MapView {
  const bounds = knownBounds(cartography);
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

export function PaintedMapCanvas(props: {
  readonly companyId: string;
  readonly cartography: PaintedCartography;
  readonly sites: readonly MapSite[];
  readonly current: WorldFreeMovementV2ResponseDto | null;
  readonly clock: { readonly serverMs: number; readonly receivedAt: number };
  readonly night: boolean;
  readonly onPosition?: (point: { xFp: number; zFp: number } | null) => void;
  readonly onMove: (action: WorldFreeMovementV2RequestDto['action']) => void;
  readonly onSelectSite: (id: string) => void;
}) {
  const map = useRef<SVGSVGElement>(null);
  const tileLayer = useRef<SVGGElement>(null);
  const knowledgeOverlay = useRef<SVGImageElement>(null);
  const revealMask = useRef<SVGImageElement>(null);
  const visibleFrontier = useRef<SVGPathElement>(null);
  const revealFilter = useRef<SVGFilterElement>(null);
  const party = useRef<SVGGElement>(null);
  const camera = useRef<MapView | undefined>(undefined);
  const zoomTarget = useRef<MapView | undefined>(undefined);
  const cartographyView = useRef<ReturnType<typeof createCartographyView> | undefined>(undefined);
  const latest = useRef(props);
  const [tileError, setTileError] = useState(false);
  latest.current = props;

  useEffect(() => {
    const svg = map.current;
    const tiles = tileLayer.current;
    const knowledge = knowledgeOverlay.current;
    const reveal = revealMask.current;
    const frontier = visibleFrontier.current;
    if (!svg || !tiles || !knowledge || !reveal || !frontier) return;
    const updateSiteMarkerScale = () => {
      const scale = 1 / (svg.getScreenCTM()?.a ?? 1);
      for (const marker of svg.querySelectorAll<SVGGElement>('.painted-site'))
        marker.setAttribute(
          'transform',
          `translate(${marker.dataset['x']} ${marker.dataset['y']}) scale(${scale})`,
        );
    };
    const updateView = (view: MapView) => {
      camera.current = boundedMapView(view, latest.current.cartography.sheet);
      svg.setAttribute(
        'viewBox',
        `${camera.current.x} ${camera.current.y} ${camera.current.width} ${camera.current.height}`,
      );
      updateSiteMarkerScale();
      cartographyView.current?.sync(latest.current.cartography, camera.current);
    };
    const viewLayer = createCartographyView(tiles, knowledge, reveal, frontier, {
      revealFilter: revealFilter.current,
      loadTile: async (revision, x, y, signal) => {
        const response = await fetch(
          `${apiBaseUrl}/world/cartography/tiles/${encodeURIComponent(revision)}/${x}/${y}.png`,
          {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: latest.current.companyId },
            signal,
          },
        );
        if (!response.ok) throw new Error(`Map tile request failed (${response.status}).`);
        const url = URL.createObjectURL(await response.blob());
        return { url, dispose: () => URL.revokeObjectURL(url) };
      },
      onTileError: () => setTileError(true),
    });
    cartographyView.current = viewLayer;
    const initial = fittedView(
      latest.current.cartography,
      (svg.clientWidth || 3) / (svg.clientHeight || 2),
    );
    updateView(initial);
    viewLayer.render(latest.current.cartography);

    let lastLayout = 0;
    const drag = bindMapPanDrag(svg, {
      getView: () => camera.current ?? initial,
      setView: updateView,
      cancelZoom: () => (zoomTarget.current = undefined),
    });
    const movement = bindMapPanKeys(
      svg,
      () => {
        if (latest.current.current?.mode === 'MOVING') latest.current.onMove({ kind: 'STOP' });
      },
      () => {
        if (latest.current.current?.mode === 'MOVING') latest.current.onMove({ kind: 'STOP' });
      },
    );
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      svg.focus({ preventScroll: true });
      const transform = svg.getScreenCTM();
      if (!transform || !camera.current) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
      zoomTarget.current = zoomMapView(
        zoomTarget.current ?? camera.current,
        [
          (point.x - camera.current.x) / camera.current.width,
          (point.y - camera.current.y) / camera.current.height,
        ],
        wheelPixels(event.deltaY, event.deltaMode, svg.clientHeight),
        latest.current.cartography.sheet,
      );
    };
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const transform = svg.getScreenCTM();
      if (!transform) return;
      svg.focus({ preventScroll: true });
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
      const target =
        event.target instanceof Element
          ? event.target.closest<SVGGElement>('[data-site-id]')
          : null;
      const siteId = target?.dataset['siteId'];
      const cartography = latest.current.cartography;
      const site = cartography.sites.find((entry) => entry.siteId === siteId);
      latest.current.onMove({
        kind: 'MOVE_TO',
        mapEdition: cartography.mapEdition,
        target:
          site && latest.current.sites.some((entry) => entry.siteId === site.siteId)
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
    const animate = (now: number) => {
      const current = camera.current;
      if (current && zoomTarget.current) {
        const next = advanceMapView(current, zoomTarget.current, now - previous);
        if (next === zoomTarget.current) zoomTarget.current = undefined;
        updateView(next);
      }
      if (current && movement.held.size && !drag.isDragging()) {
        zoomTarget.current = undefined;
        updateView(
          panMapView(
            camera.current ?? current,
            movement.direction(),
            now - previous,
            latest.current.cartography.sheet,
          ),
        );
      }
      const point = continuousMovementPositionAt(
        latest.current.current,
        latest.current.clock.serverMs + now - latest.current.clock.receivedAt,
      );
      if (party.current && point) {
        const position = toPixel(point, latest.current.cartography.sheet);
        party.current.setAttribute('transform', `translate(${position.x} ${position.y})`);
        latest.current.onPosition?.({
          xFp: Number(point.xMicroFp) / 65536,
          zFp: Number(point.zMicroFp) / 65536,
        });
      } else {
        if (party.current) party.current.setAttribute('visibility', 'hidden');
        latest.current.onPosition?.(null);
      }
      if (party.current && point) party.current.setAttribute('visibility', 'visible');
      if (now - lastLayout > 180) {
        lastLayout = now;
        updateSiteMarkerScale();
        layoutMapLabels(svg, (camera.current?.width ?? 0) > 2304);
      }
      previous = now;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const resize = new ResizeObserver(() => {
      zoomTarget.current = undefined;
      if (camera.current)
        updateView({
          ...camera.current,
          height: (camera.current.width * svg.clientHeight) / Math.max(1, svg.clientWidth),
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
      cartographyView.current = undefined;
      camera.current = undefined;
    };
  }, [props.cartography.mapEdition]);

  useEffect(() => {
    setTileError(false);
  }, [props.cartography.revision]);

  useEffect(() => {
    cartographyView.current?.render(props.cartography);
    if (camera.current) cartographyView.current?.sync(props.cartography, camera.current);
  }, [props.cartography]);

  const actions = new Set(props.sites.map((site) => site.siteId));
  const route = props.current?.plan?.path ?? [];
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
          <filter
            ref={revealFilter}
            id="painted-known-terrain-filter"
            x="-8%"
            y="-8%"
            width="116%"
            height="116%"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="known-alpha" />
            <feMorphology in="known-alpha" operator="erode" radius="18" result="inside-known" />
            <feGaussianBlur in="inside-known" stdDeviation="24" result="soft-known" />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.004 0.006"
              numOctaves="1"
              seed="27"
              result="frontier-wash"
            />
            <feDisplacementMap
              in="soft-known"
              in2="frontier-wash"
              scale="74"
              xChannelSelector="R"
              yChannelSelector="G"
              result="irregular-known"
            />
          </filter>
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
              filter="url(#painted-known-terrain-filter)"
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
          {props.cartography.sites.map((site) => {
            const position = toPixel(site.point, props.cartography.sheet);
            const actionable = actions.has(site.siteId);
            const icon = isMapIconName(site.icon) ? site.icon : undefined;
            return (
              <g
                key={site.siteId}
                className={`site-marker painted-site${site.visited ? ' site-visited' : ''}`}
                data-site-id={site.siteId}
                data-source={site.source.toLowerCase()}
                data-x={position.x}
                data-y={position.y}
                transform={`translate(${position.x} ${position.y})`}
                role={actionable ? 'button' : 'img'}
                tabIndex={actionable ? 0 : undefined}
                aria-label={site.name}
                onClick={actionable ? () => props.onSelectSite(site.siteId) : undefined}
                onKeyDown={
                  actionable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          props.onSelectSite(site.siteId);
                        }
                      }
                    : undefined
                }
              >
                <circle className="site-hit" r="18" />
                <line className="site-leader" />
                <circle className="site-disc" r="11" />
                {icon && (
                  <use
                    className="map-icon"
                    href={mapIconHref(icon)}
                    x="-10"
                    y="-10"
                    width="20"
                    height="20"
                  />
                )}
                <text
                  className="site-label"
                  data-major={String(['town', 'village'].includes(site.icon))}
                  textAnchor="middle"
                  y="-20"
                >
                  {site.name}
                </text>
              </g>
            );
          })}
        </g>
        {route.length > 1 && (
          <polyline
            className="painted-map-route"
            points={route
              .map((point) => {
                const at = toPixel(point, props.cartography.sheet);
                return `${at.x},${at.y}`;
              })
              .join(' ')}
          />
        )}
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

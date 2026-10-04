import { useEffect, useId, useRef, useState } from 'react';
import type {
  WorldContinuousMapDto,
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldSurroundingsDto,
} from '@warwrit/protocol';
import { mountContinuousMapScene } from '../renderer/continuous-map-scene.js';
import type { MapLabelPosition } from '../renderer/map-scene.js';
import { mountRouteOverlay } from '../renderer/route-overlay.js';

export function ContinuousMapCanvas(props: {
  region: WorldContinuousMapDto;
  sites: WorldSurroundingsDto['map']['sites'];
  current: WorldFreeMovementV2ResponseDto | null;
  clock: { serverMs: number; receivedAt: number };
  night: boolean;
  onMove: (a: WorldFreeMovementV2RequestDto['action']) => void;
  onSelectSite: (id: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<ReturnType<typeof mountContinuousMapScene> | undefined>(undefined),
    latest = useRef(props);
  const routeSvg = useRef<SVGSVGElement>(null);
  const routeLegend = useRef<HTMLDivElement>(null);
  const partyIndicator = useRef<HTMLDivElement>(null);
  const maskId = `route-mask-${useId()}`;
  const labelPress = useRef<{ id: number; x: number; y: number; siteId: string } | null>(null);
  latest.current = props;
  const [labels, setLabels] = useState<readonly MapLabelPosition[]>([]),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!canvas.current || !routeSvg.current || !routeLegend.current) return;
    const drawRoute = mountRouteOverlay(routeSvg.current, routeLegend.current);
    try {
      scene.current = mountContinuousMapScene(canvas.current, props.region, props.sites, {
        onRoute: drawRoute,
        onParty: (point) => {
          const indicator = partyIndicator.current;
          if (!indicator) return;
          indicator.hidden = !point;
          if (point) {
            const container = indicator.parentElement!.getBoundingClientRect();
            const width = indicator.offsetWidth;
            const height = indicator.offsetHeight;
            const occupied = [...indicator.parentElement!.querySelectorAll('.map-label')].map(
              (label) => label.getBoundingClientRect(),
            );
            const gap =
              [0, 24, 48, 72, 96].find((offset) => {
                const left = container.left + point.x - width / 2;
                const top = container.top + point.y - point.spriteHeight - height - 8 - offset;
                return !occupied.some(
                  (rect) =>
                    left < rect.right + 4 &&
                    left + width > rect.left - 4 &&
                    top < rect.bottom + 4 &&
                    top + height > rect.top - 4,
                );
              }) ?? 96;
            indicator.style.transform = `translate(${point.x}px,${point.y - point.spriteHeight - gap}px)`;
            indicator.style.setProperty('--party-leader-length', `${gap + point.spriteHeight}px`);
          }
        },
        onMove: (a) => latest.current.onMove(a),
        onSelectSite: (id) => latest.current.onSelectSite(id),
        onLabels: (next) =>
          setLabels((old) =>
            old.length === next.length &&
            old.every(
              (p, i) =>
                p.siteId === next[i]?.siteId &&
                Math.abs(p.x - next[i]!.x) < 0.3 &&
                Math.abs(p.y - next[i]!.y) < 0.3,
            )
              ? old
              : next,
          ),
      });
    } catch {
      setFailed(true);
    }
    return () => {
      scene.current?.destroy();
      scene.current = undefined;
    };
  }, [props.region.mapEdition]);
  useEffect(() => {
    scene.current?.update(props.current, props.clock, props.night);
  });
  if (failed)
    return (
      <p role="alert">Не удалось открыть карту. Проверьте доступность WebGL и обновите страницу.</p>
    );
  return (
    <div className="world-map-canvas">
      <canvas
        ref={canvas}
        aria-label="Карта Серого Поречья. Зажать левую кнопку мыши — двигать карту, правая кнопка — идти, S — остановиться."
      />
      <svg ref={routeSvg} className="map-route-overlay" aria-hidden="true">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect data-route="background" fill="white" />
            <g data-route="sprites" />
            <circle data-route="party" r="8" fill="white" />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <path data-route="history" className="route-stroke route-history-outline" />
          <path data-route="history" className="route-stroke route-history" />
          <path data-route="remaining" className="route-stroke route-remaining-outline" />
          <path data-route="remaining" className="route-stroke route-remaining" />
          <g data-route="goal">
            <path d="M0 -8L8 0L0 8L-8 0Z" className="route-stroke route-goal-outline" />
            <path d="M0 -8L8 0L0 8L-8 0Z" className="route-stroke route-goal" />
            <circle r="1.5" className="route-goal-dot" />
          </g>
        </g>
      </svg>
      <div ref={routeLegend} className="map-route-legend" aria-label="Обозначения пути">
        <span>
          <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden="true">
            <path d="M4 7H40" className="route-stroke route-history-outline" />
            <path d="M4 7H40" className="route-stroke route-history" />
          </svg>
          Пройдено
        </span>
        <span>
          <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden="true">
            <path d="M4 7H40" className="route-stroke route-remaining-outline" />
            <path d="M4 7H40" className="route-stroke route-remaining" />
          </svg>
          Осталось
        </span>
      </div>
      <div ref={partyIndicator} className="map-party-indicator" hidden>
        Ваш отряд
      </div>
      <div className="world-map-labels">
        {labels.map((l) => (
          <button
            key={l.siteId}
            className="map-label"
            data-site-id={l.siteId}
            style={{ transform: `translate(${l.x}px,${l.y}px)` }}
            onClick={() => props.onSelectSite(l.siteId)}
            onPointerDown={(e) => {
              if (e.button === 2)
                labelPress.current = {
                  id: e.pointerId,
                  x: e.clientX,
                  y: e.clientY,
                  siteId: l.siteId,
                };
            }}
            onBlur={() => {
              labelPress.current = null;
            }}
            onPointerCancel={() => {
              labelPress.current = null;
            }}
            onPointerUp={(e) => {
              const p = labelPress.current;
              labelPress.current = null;
              if (
                e.button === 2 &&
                p?.id === e.pointerId &&
                p.siteId === l.siteId &&
                Math.hypot(e.clientX - p.x, e.clientY - p.y) <= 5
              ) {
                canvas.current?.focus();
                props.onMove({
                  kind: 'MOVE_TO',
                  mapEdition: props.region.mapEdition,
                  target: { kind: 'SITE', siteId: l.siteId },
                });
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {props.sites.find((s) => s.siteId === l.siteId)?.name}
          </button>
        ))}
      </div>
    </div>
  );
}

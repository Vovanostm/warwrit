import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  WorldContinuousMapDto,
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldSurroundingsDto,
} from '@warwrit/protocol';
import { mountContinuousMapScene } from '../renderer/continuous-map-scene.js';
import type { MapLabelPosition } from '../renderer/map-scene.js';
import { mountRouteOverlay } from '../renderer/route-overlay.js';

function alignedLabelLeft(label: MapLabelPosition, size: { width: number }) {
  return label.align === 'start'
    ? label.x
    : label.align === 'end'
      ? label.x - size.width
      : label.x - size.width * 0.34;
}

function centerLabelLeft(
  label: MapLabelPosition,
  left: number,
  size: { width: number },
  width: number,
) {
  if (label.align !== 'center') return left;
  if (left < 4) left = label.x + 4;
  else if (left + size.width > width - 4) left = label.x - size.width - 4;
  return left;
}

function labelPosition(
  label: MapLabelPosition,
  size: { width: number; height: number },
  width: number,
  height: number,
) {
  let left = centerLabelLeft(label, alignedLabelLeft(label, size), size, width);
  if (label.align === 'start' && left + size.width > width - 4)
    left = (label.alternateX ?? label.x - 8) - size.width;
  left = Math.max(4, Math.min(left, Math.max(4, width - size.width - 4)));
  const top = Math.max(4, Math.min(label.y + 4, Math.max(4, height - size.height - 4)));
  return { left, top };
}

function labelSizeChanged(
  previous: { width: number; height: number } | undefined,
  width: number,
  height: number,
) {
  return (
    !previous || Math.abs(previous.width - width) > 0.5 || Math.abs(previous.height - height) > 0.5
  );
}

function recordLabelSize(
  button: HTMLButtonElement,
  sizes: Map<string, { width: number; height: number }>,
) {
  const siteId = button.dataset['siteId'];
  if (!siteId) return false;
  const { width, height } = button.getBoundingClientRect();
  if (!labelSizeChanged(sizes.get(siteId), width, height)) return false;
  sizes.set(siteId, { width, height });
  return true;
}

function useMapLabels() {
  const labelsLayer = useRef<HTMLDivElement>(null);
  const labelSizes = useRef(new Map<string, { width: number; height: number }>());
  const [labels, setLabels] = useState<readonly MapLabelPosition[]>([]);
  const [, setLabelMeasurements] = useState(0);
  useLayoutEffect(() => {
    const buttons =
      labelsLayer.current?.querySelectorAll<HTMLButtonElement>('[data-site-id]') ?? [];
    const changed = Array.from(buttons, (button) => recordLabelSize(button, labelSizes.current));
    if (changed.some(Boolean)) setLabelMeasurements((revision) => revision + 1);
  }, [labels]);
  return { labelsLayer, labelSizes, labels, setLabels };
}

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
  const labelPress = useRef<{ id: number; x: number; y: number; siteId: string } | null>(null);
  latest.current = props;
  const { labelsLayer, labelSizes, labels, setLabels } = useMapLabels();
  const [failed, setFailed] = useState(false);
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
                Math.abs(p.y - next[i]!.y) < 0.3 &&
                p.visible === next[i]!.visible &&
                p.align === next[i]!.align &&
                p.alternateX === next[i]!.alternateX,
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
        <path data-route="history" className="route-stroke route-history-outline" />
        <path data-route="history" className="route-stroke route-history" />
        <path data-route="remaining" className="route-stroke route-remaining-outline" />
        <path data-route="remaining" className="route-stroke route-remaining" />
        <g data-route="goal">
          <path d="M0 -8L8 0L0 8L-8 0Z" className="route-stroke route-goal-outline" />
          <path d="M0 -8L8 0L0 8L-8 0Z" className="route-stroke route-goal" />
          <circle r="1.5" className="route-goal-dot" />
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
      <div className="world-map-labels" ref={labelsLayer}>
        {labels.map((l) => {
          if (l.visible === false) return null;
          const size = labelSizes.current.get(l.siteId) ?? { width: 96, height: 20 };
          const width = labelsLayer.current?.clientWidth ?? 0;
          const height = labelsLayer.current?.clientHeight ?? 0;
          const { left, top } = labelPosition(l, size, width, height);
          return (
            <button
              key={l.siteId}
              className="map-label"
              data-site-id={l.siteId}
              style={{ transform: `translate(${left}px,${top}px)`, translate: '0 0' }}
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
          );
        })}
      </div>
    </div>
  );
}

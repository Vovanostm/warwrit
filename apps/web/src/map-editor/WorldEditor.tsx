import { useEffect, useRef, useState } from 'react';
import type { MapIssue, MapPoint, MapPreview, MapRegion, WorldMapContent } from '@warwrit/protocol';
import { zoomMapView, boundedMapView } from '../../../../scripts/world-map/map-camera.js';
import type { MapView } from '../../../../scripts/world-map/map-camera.js';

const extent = { width: 4608, height: 3072 };
const pixel = (p: MapPoint): readonly [number, number] => [p.xFp / 3.5 + 2304, 1536 - p.zFp / 3.5];
const points = (p: readonly MapPoint[]) => p.map((x) => pixel(x).join(',')).join(' ');
type Layer = 'terrainShapes' | 'overlayShapes' | 'blockingShapes' | 'dangerAreaShapes' | 'sites';
const layers: readonly Layer[] = [
  'terrainShapes',
  'overlayShapes',
  'blockingShapes',
  'dangerAreaShapes',
  'sites',
];
const id = (s: object) =>
  'shapeId' in s
    ? String(s.shapeId)
    : 'siteId' in s
      ? String(s.siteId)
      : 'areaId' in s
        ? String(s.areaId)
        : '';
export function WorldEditor({
  content,
  onChange,
  issues,
  preview,
  disabled,
  onRoute,
  selectedIssue,
  atlasUrl,
  knownSites,
  canPreview,
}: {
  readonly content: WorldMapContent;
  readonly onChange: (c: WorldMapContent) => void;
  readonly issues: readonly MapIssue[];
  readonly preview: MapPreview | null;
  readonly disabled: boolean;
  readonly onRoute: (from: MapPoint, to: MapPoint) => void;
  readonly selectedIssue: MapIssue | null;
  readonly atlasUrl: string;
  readonly knownSites: WorldMapContent['region']['sites'];
  readonly canPreview: boolean;
}) {
  const [selection, setSelection] = useState<{ layer: Layer; index: number } | null>(null);
  const [view, setView] = useState<MapView>({ x: 0, y: 0, ...extent });
  const [night, setNight] = useState(false);
  const [geometry, setGeometry] = useState(true);
  const [graph, setGraph] = useState(true);
  const [mode, setMode] = useState<'select' | 'anchor' | 'from' | 'to'>('select');
  const [from, setFrom] = useState<MapPoint | null>(null),
    [to, setTo] = useState<MapPoint | null>(null);
  const [property, setProperty] = useState(''),
    [message, setMessage] = useState('');
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: MapView; moved: boolean } | null>(null);
  const object = selection ? content.region[selection.layer][selection.index] : null;
  useEffect(() => {
    const canvas = svg.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = canvas.getBoundingClientRect();
      setView((v) =>
        zoomMapView(
          v,
          [(event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height],
          event.deltaY,
          extent,
        ),
      );
    };
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => canvas.removeEventListener('wheel', wheel);
  }, []);

  useEffect(() => {
    setProperty(JSON.stringify(object, null, 2) ?? '');
    setMessage('');
  }, [object]);
  useEffect(() => {
    if (!selectedIssue) return;
    for (const layer of layers) {
      const index = content.region[layer].findIndex(
        (s) => id(s) === selectedIssue.objectId || id(s).startsWith(selectedIssue.objectId),
      );
      if (index >= 0) {
        setSelection({ layer, index });
        break;
      }
    }
    if (selectedIssue.point) {
      const [x, y] = pixel(selectedIssue.point);
      setView(boundedMapView({ x: x - 500, y: y - 330, width: 1000, height: 660 }, extent));
    }
  }, [selectedIssue, content]);
  function changeLayer(layer: Layer, items: readonly unknown[]) {
    onChange({ ...content, region: { ...content.region, [layer]: items } as MapRegion });
  }
  function apply() {
    if (!selection) return;
    try {
      const next = JSON.parse(property) as Record<string, unknown>;
      const validPoint = (p: unknown): boolean =>
        !!p &&
        typeof p === 'object' &&
        'xFp' in p &&
        'zFp' in p &&
        Number.isSafeInteger(p.xFp) &&
        Number.isSafeInteger(p.zFp);
      if (
        !next ||
        typeof next !== 'object' ||
        !id(next) ||
        (selection.layer === 'sites'
          ? !validPoint(next['anchorFp'])
          : !Array.isArray(next['polygon']) ||
            next['polygon'].length < 3 ||
            !next['polygon'].every(validPoint)) ||
        (next['stations'] !== undefined &&
          (!Array.isArray(next['stations']) || !next['stations'].every(validPoint)))
      )
        throw new Error('Проверьте ID и координаты объекта.');
      changeLayer(
        selection.layer,
        content.region[selection.layer].map((s, i) => (i === selection.index ? next : s)),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Некорректный JSON.');
    }
  }
  function add(layer: Exclude<Layer, 'sites'>) {
    const p = from ?? { xFp: -1900, zFp: 1100 };
    const tag = `draft-${crypto.randomUUID().slice(0, 8)}`;
    const polygon = [
      p,
      { xFp: p.xFp + 200, zFp: p.zFp },
      { xFp: p.xFp + 200, zFp: p.zFp + 100 },
      { xFp: p.xFp, zFp: p.zFp + 100 },
    ];
    const next =
      layer === 'terrainShapes'
        ? { shapeId: tag, terrainId: 'forest', paintPriority: 50, polygon }
        : layer === 'overlayShapes'
          ? {
              shapeId: tag,
              overlayId: 'dirt_road',
              polygon,
              stations: [
                { xFp: p.xFp + 10, zFp: p.zFp + 50 },
                { xFp: p.xFp + 190, zFp: p.zFp + 50 },
              ],
            }
          : layer === 'dangerAreaShapes'
            ? { areaId: tag, polygon }
            : { shapeId: tag, polygon };
    changeLayer(layer, [...content.region[layer], next]);
    setSelection({ layer, index: content.region[layer].length });
  }
  function clickPoint(clientX: number, clientY: number): MapPoint | null {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { xFp: Math.round((p.x - 2304) * 3.5), zFp: Math.round((1536 - p.y) * 3.5) };
  }
  function pick(p: MapPoint) {
    if (mode === 'from') setFrom(p);
    if (mode === 'to') setTo(p);
    if (mode === 'anchor' && selection && object) {
      const next =
        'anchorFp' in object
          ? { ...object, anchorFp: p }
          : 'stations' in object && Array.isArray(object.stations)
            ? { ...object, stations: [p, ...object.stations.slice(1)] }
            : null;
      if (next)
        changeLayer(
          selection.layer,
          content.region[selection.layer].map((s, i) => (i === selection.index ? next : s)),
        );
      else
        setMessage(
          'Выберите место или дорожную станцию. Вершины области редактируются в свойствах.',
        );
    }
  }
  return (
    <div className="map-world-editor">
      <div className="map-toolbar">
        <label>
          <input type="checkbox" checked={night} onChange={(e) => setNight(e.target.checked)} />
          Ночь
        </label>
        <label>
          <input
            type="checkbox"
            checked={geometry}
            onChange={(e) => setGeometry(e.target.checked)}
          />
          Геометрия
        </label>
        <label>
          <input type="checkbox" checked={graph} onChange={(e) => setGraph(e.target.checked)} />
          Узлы и связи сервера
        </label>
        <button onClick={() => setView({ x: 0, y: 0, ...extent })}>Вся карта</button>
        <select
          aria-label="Действие на карте"
          disabled={disabled}
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="select">Выбор объекта</option>
          <option value="anchor">Перенести anchor / первый узел</option>
          <option value="from">Начало маршрута / нового объекта</option>
          <option value="to">Конец маршрута</option>
        </select>
        <button
          disabled={disabled || !canPreview || !from || !to}
          onClick={() => from && to && onRoute(from, to)}
        >
          Маршрут сервера
        </button>
      </div>
      <p>
        Колесо — масштаб · перетаскивание — панорама · клик — выбранное действие. fp — координаты
        сервера. Дороги и станции задают единый граф; цены движения определяет текущий профиль.
      </p>
      <div className="map-world-layout">
        <svg
          ref={svg}
          className="map-world-canvas"
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          aria-label="Атлас v6 и серверная геометрия"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const box = e.currentTarget.getBoundingClientRect();
            const dx = e.clientX - d.x,
              dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) > 4) d.moved = true;
            if (d.moved)
              setView(
                boundedMapView(
                  {
                    ...d.view,
                    x: d.view.x - (dx * d.view.width) / box.width,
                    y: d.view.y - (dy * d.view.height) / box.height,
                  },
                  extent,
                ),
              );
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (!d || d.moved || disabled) return;
            const p = clickPoint(e.clientX, e.clientY);
            if (p) pick(p);
          }}
        >
          <image
            href={atlasUrl}
            width="4608"
            height="3072"
            style={{ filter: night ? 'brightness(.42) saturate(.6)' : 'none' }}
          />
          {geometry &&
            layers
              .filter((l) => l !== 'sites')
              .flatMap((layer) =>
                content.region[layer].map((s, i) =>
                  'polygon' in s ? (
                    <polygon
                      key={`${layer}-${i}`}
                      points={points(s.polygon)}
                      className={`map-shape ${layer} ${selection?.layer === layer && selection.index === i ? 'selected' : ''}`}
                      onPointerDown={() => {
                        if (!disabled && mode === 'select') setSelection({ layer, index: i });
                      }}
                    >
                      <title>{id(s)}</title>
                    </polygon>
                  ) : null,
                ),
              )}
          {graph &&
            preview?.edges?.map(([a, b], i) => (
              <polyline key={`e${i}`} points={points([a, b])} className="map-edge" />
            ))}
          {graph &&
            preview?.nodes?.map((p, i) => {
              const [x, y] = pixel(p);
              return <circle key={`n${i}`} cx={x} cy={y} r="4" className="map-node" />;
            })}
          {content.region.sites.map((s, i) => {
            const [x, y] = pixel(s.anchorFp);
            return (
              <g
                key={s.siteId}
                onPointerDown={() =>
                  !disabled && mode === 'select' && setSelection({ layer: 'sites', index: i })
                }
              >
                <circle cx={x} cy={y} r="12" className="map-site" />
                <text x={x + 15} y={y - 12}>
                  {s.siteId}
                </text>
              </g>
            );
          })}
          {preview?.route && <polyline points={points(preview.route)} className="map-route" />}
          {[from, to].map((p, i) => {
            if (!p) return null;
            const [x, y] = pixel(p);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="18" fill={i ? '#e8a46c' : '#a8d6b0'} />
                <text x={x + 22} y={y}>
                  {i ? 'B' : 'A'}
                </text>
              </g>
            );
          })}
          {issues
            .filter((i) => i.point)
            .map((i, n) => {
              const [x, y] = pixel(i.point!);
              return (
                <g key={n}>
                  <circle cx={x} cy={y} r="24" className="map-error" />
                  <title>{i.message}</title>
                </g>
              );
            })}
        </svg>
        <aside className="map-inspector">
          <h3>Объекты и свойства</h3>
          <select
            aria-label="Объект геометрии"
            disabled={disabled}
            value={selection ? `${selection.layer}:${selection.index}` : ''}
            onChange={(e) => {
              const [layer, index] = e.target.value.split(':');
              setSelection(layer ? { layer: layer as Layer, index: Number(index) } : null);
            }}
          >
            <option value="">Выберите объект…</option>
            {layers.flatMap((layer) =>
              content.region[layer].map((s, i) => (
                <option key={`${layer}:${i}`} value={`${layer}:${i}`}>
                  {layer} · {id(s)}
                </option>
              )),
            )}
          </select>
          <div className="map-toolbar">
            {(
              ['terrainShapes', 'overlayShapes', 'blockingShapes', 'dangerAreaShapes'] as const
            ).map((l, i) => (
              <button key={l} disabled={disabled} onClick={() => add(l)}>
                + {['Область', 'Дорога', 'Запретная зона', 'Зона риска'][i]}
              </button>
            ))}
          </div>
          <label>
            Добавить место из content IDs
            <select
              aria-label="Добавить место"
              disabled={disabled}
              value=""
              onChange={(e) => {
                const site = knownSites.find((s) => s.siteId === e.target.value);
                if (site) {
                  changeLayer('sites', [...content.region.sites, site]);
                  setSelection({ layer: 'sites', index: content.region.sites.length });
                }
              }}
            >
              <option value="">Выберите отсутствующее место…</option>
              {knownSites
                .filter((s) => !content.region.sites.some((current) => current.siteId === s.siteId))
                .map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.siteId}
                  </option>
                ))}
            </select>
          </label>
          {object && (
            <>
              <label>
                Свойства выбранного объекта
                <textarea
                  aria-label="Свойства объекта"
                  spellCheck={false}
                  value={property}
                  disabled={disabled}
                  onChange={(e) => setProperty(e.target.value)}
                />
              </label>
              <button disabled={disabled} onClick={apply}>
                Применить свойства
              </button>
              <button
                disabled={disabled}
                onClick={() => {
                  if (selection) {
                    changeLayer(
                      selection.layer,
                      content.region[selection.layer].filter((_, i) => i !== selection.index),
                    );
                    setSelection(null);
                  }
                }}
              >
                Удалить объект
              </button>
            </>
          )}
          <p role="status">{message}</p>
          <p>
            Новые места требуют существующих content IDs. Удалённые обязательные места отмечает
            серверная проверка. Узлы/связи дороги редактируются через stations; контур — polygon.
          </p>
        </aside>
      </div>
    </div>
  );
}

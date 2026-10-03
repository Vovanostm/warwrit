import { useEffect, useRef, useState } from 'react';

import type { WorldSurroundingsDto } from '@warwrit/protocol';

import {
  mountMapScene,
  type MapLabelPosition,
  type MapScene,
  type MapView,
} from '../renderer/map-scene.js';
import type { PartyMarker } from './WorldMap.js';

/** The Babylon.js global map with HTML labels and badges laid over the canvas. */
export function WorldMapCanvas(props: {
  readonly map: WorldSurroundingsDto['map'];
  readonly night: boolean;
  readonly party: PartyMarker | null;
  readonly observed: WorldSurroundingsDto['observedCompanies'];
  readonly hostileSiteIds: ReadonlySet<string>;
  readonly reachableSiteIds: ReadonlySet<string>;
  readonly selectedSiteId: string | null;
  readonly plannedEdgeIds: readonly string[];
  readonly selectedHex?: { readonly q: number; readonly r: number } | null;
  readonly plannedHexPath?: readonly { readonly q: number; readonly r: number }[];
  readonly onSelectSite: (siteId: string) => void;
  readonly onSelectTerrain: (position: { readonly q: number; readonly r: number }) => void;
  /** Rendered instead of the canvas when WebGL is unavailable. */
  readonly fallback: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<MapScene | undefined>(undefined);
  const [labels, setLabels] = useState<readonly MapLabelPosition[]>([]);
  const [failed, setFailed] = useState(false);
  const view: MapView = {
    night: props.night,
    party: props.party?.at ?? null,
    reachableSiteIds: props.reachableSiteIds,
    selectedSiteId: props.selectedSiteId,
    plannedEdgeIds: props.plannedEdgeIds,
    ...(props.selectedHex === undefined ? {} : { selectedHex: props.selectedHex }),
    ...(props.plannedHexPath === undefined ? {} : { plannedHexPath: props.plannedHexPath }),
  };
  const latest = useRef({
    view,
    onSelectSite: props.onSelectSite,
    onSelectTerrain: props.onSelectTerrain,
  });
  latest.current = {
    view,
    onSelectSite: props.onSelectSite,
    onSelectTerrain: props.onSelectTerrain,
  };
  const mapKey = `${props.map.regionVersion}:${props.map.sites.length}:${props.map.edges.length}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: MapScene;
    try {
      scene = mountMapScene(canvas, props.map, latest.current.view, {
        onSelectSite: (siteId) => latest.current.onSelectSite(siteId),
        onSelectTerrain: (position) => latest.current.onSelectTerrain(position),
        onLabels: setLabels,
      });
    } catch {
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      if (sceneRef.current === scene) sceneRef.current = undefined;
    };
    // The scene mounts once per region edition; later changes use update().
  }, [mapKey]);

  useEffect(() => {
    sceneRef.current?.update(view);
  });

  if (failed) return <>{props.fallback}</>;
  return (
    <div className="world-map-canvas">
      <canvas
        ref={canvasRef}
        aria-label={`Карта: ${props.map.regionName}. Щёлкните поселение, чтобы проложить путь.`}
      />
      <div className="world-map-labels" aria-hidden="false">
        {labels.map((label) => {
          const site = props.map.sites.find((entry) => entry.siteId === label.siteId);
          if (!site) return null;
          const observed = props.observed.filter((entry) => entry.siteId === site.siteId).length;
          return (
            <button
              key={label.siteId}
              type="button"
              className={`map-label${props.selectedSiteId === site.siteId ? ' map-label-selected' : ''}${
                site.danger === 'DANGEROUS' ? ' map-label-danger' : ''
              }`}
              style={{ transform: `translate(${label.x}px, ${label.y}px)` }}
              onClick={() => props.onSelectSite(site.siteId)}
            >
              {site.name}
              {props.hostileSiteIds.has(site.siteId) && (
                <span className="map-badge map-badge-hostile" title="Здесь замечены враги">
                  !
                </span>
              )}
              {observed > 0 && (
                <span className="map-badge" title={`Здесь замечены другие компании: ${observed}`}>
                  {observed}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

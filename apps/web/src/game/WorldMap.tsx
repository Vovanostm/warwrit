import type { WorldSurroundingsDto } from '@warwrit/protocol';

type MapDto = WorldSurroundingsDto['map'];
type Site = MapDto['sites'][number];

export interface PartyMarker {
  /** Site where the party stands, or the road it is on with progress 0..1 from `fromSiteId`. */
  readonly at:
    | { readonly kind: 'SITE'; readonly siteId: string }
    | {
        readonly kind: 'ROAD';
        readonly fromSiteId: string;
        readonly toSiteId: string;
        readonly progress: number;
      };
  readonly label: string;
}

const UNIT = 92;
const PADDING = 70;

function project(site: { readonly q: number; readonly r: number }): { x: number; y: number } {
  return { x: Math.sqrt(3) * (site.q + site.r / 2) * UNIT, y: 1.5 * site.r * UNIT };
}

export function WorldMap(props: {
  readonly map: MapDto;
  readonly night: boolean;
  readonly party: PartyMarker | null;
  readonly moving: boolean;
  readonly observed: WorldSurroundingsDto['observedCompanies'];
  readonly hostileSiteIds: ReadonlySet<string>;
  readonly reachableSiteIds: ReadonlySet<string>;
  readonly selectedSiteId: string | null;
  readonly plannedEdgeIds: readonly string[];
  readonly onSelectSite: (siteId: string) => void;
}) {
  const points = new Map(props.map.sites.map((site) => [site.siteId, project(site)]));
  const xs = [...points.values()].map((point) => point.x);
  const ys = [...points.values()].map((point) => point.y);
  const minX = Math.min(...xs) - PADDING;
  const minY = Math.min(...ys) - PADDING;
  const width = Math.max(...xs) - minX + PADDING;
  const height = Math.max(...ys) - minY + PADDING;
  const planned = new Set(props.plannedEdgeIds);

  const partyPoint = (() => {
    if (!props.party) return undefined;
    const at = props.party.at;
    if (at.kind === 'SITE') return points.get(at.siteId);
    const from = points.get(at.fromSiteId);
    const to = points.get(at.toSiteId);
    if (!from || !to) return undefined;
    const t = Math.min(1, Math.max(0, at.progress));
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  })();

  return (
    <svg
      className="world-map"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="img"
      aria-label={`Карта: ${props.map.regionName}`}
    >
      <defs>
        <pattern id="map-hex" width="46" height="80" patternUnits="userSpaceOnUse">
          <path
            d="M23 0 L46 13 L46 40 L23 53 L0 40 L0 13 Z M23 53 L23 80"
            fill="none"
            stroke="rgb(140 118 80 / 9%)"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id="map-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="55%" stopColor="rgb(0 0 0 / 0%)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 55%)" />
        </radialGradient>
      </defs>
      <rect x={minX} y={minY} width={width} height={height} className="map-ground" />
      <rect x={minX} y={minY} width={width} height={height} fill="url(#map-hex)" />

      {props.map.edges.map((edge) => {
        const from = points.get(edge.fromSiteId);
        const to = points.get(edge.toSiteId);
        if (!from || !to) return null;
        return (
          <g key={edge.edgeId}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={`map-road${edge.danger === 'DANGEROUS' ? ' map-road-danger' : ''}${
                planned.has(edge.edgeId) ? ' map-road-planned' : ''
              }`}
            />
          </g>
        );
      })}

      {props.map.sites.map((site) => (
        <SiteMarker
          key={site.siteId}
          site={site}
          point={points.get(site.siteId)!}
          reachable={props.reachableSiteIds.has(site.siteId)}
          selected={props.selectedSiteId === site.siteId}
          observedCount={props.observed.filter((entry) => entry.siteId === site.siteId).length}
          hostiles={props.hostileSiteIds.has(site.siteId)}
          onSelect={props.onSelectSite}
        />
      ))}

      {partyPoint && (
        <g
          className={`map-party${props.moving ? ' map-party-moving' : ''}`}
          transform={`translate(${partyPoint.x} ${partyPoint.y - 34})`}
          aria-label={props.party?.label}
        >
          <title>{props.party?.label}</title>
          <circle r="15" className="map-party-halo" />
          <path d="M-9 -12 H9 V4 L0 12 L-9 4 Z" className="map-party-banner" />
          <path d="M-4 -6 H4 M0 -9 V6" className="map-party-sigil" />
        </g>
      )}

      {props.night && (
        <rect x={minX} y={minY} width={width} height={height} className="map-night" />
      )}
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill="url(#map-vignette)"
        pointerEvents="none"
      />
    </svg>
  );
}

function SiteMarker(props: {
  readonly site: Site;
  readonly point: { readonly x: number; readonly y: number };
  readonly reachable: boolean;
  readonly selected: boolean;
  readonly observedCount: number;
  readonly hostiles: boolean;
  readonly onSelect: (siteId: string) => void;
}) {
  const { site, point } = props;
  const radius = site.kind === 'CITY' ? 22 : 17;
  const className = [
    'map-site',
    `map-site-${site.kind.toLowerCase()}`,
    site.danger === 'DANGEROUS' ? 'map-site-danger' : '',
    props.reachable ? 'map-site-reachable' : '',
    props.selected ? 'map-site-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <g
      className={className}
      transform={`translate(${point.x} ${point.y})`}
      role="button"
      tabIndex={0}
      aria-label={site.name}
      onClick={() => props.onSelect(site.siteId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          props.onSelect(site.siteId);
        }
      }}
    >
      <circle r={radius + 9} className="map-site-ring" />
      <circle r={radius} className="map-site-body" />
      <path d={siteGlyph(site.kind)} className="map-site-glyph" />
      <text y={radius + 24} className="map-site-label">
        {site.name}
      </text>
      {props.hostiles && (
        <g transform={`translate(${-radius - 4} ${-radius - 2})`} className="map-hostiles">
          <title>Здесь замечены враги</title>
          <circle r="9" />
          <text y="4">!</text>
        </g>
      )}
      {props.observedCount > 0 && (
        <g transform={`translate(${radius + 4} ${-radius - 2})`} className="map-observed">
          <title>Здесь замечены другие компании: {props.observedCount}</title>
          <circle r="9" />
          <text y="4">{props.observedCount}</text>
        </g>
      )}
    </g>
  );
}

function siteGlyph(kind: Site['kind']): string {
  switch (kind) {
    case 'CITY':
      // Keep with two towers.
      return 'M-12 9 V-5 H-8 V-9 H-4 V-5 H4 V-9 H8 V-5 H12 V9 Z M-3 9 V2 H3 V9';
    case 'VILLAGE':
      return 'M-10 8 V-1 L0 -9 L10 -1 V8 Z M-3 8 V2 H3 V8';
    case 'LANDMARK':
      // Broken mill: tower with sails.
      return 'M-5 9 L-3 -4 H3 L5 9 Z M0 -4 L-9 -12 M0 -4 L9 -12 M0 -4 L-8 3 M0 -4 L8 4';
  }
}

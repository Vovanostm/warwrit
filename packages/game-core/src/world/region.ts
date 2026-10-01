export const WORLD_REGION_VERSION = 'w01-authored-fixture-2026-10-01-v3' as const;
/** Previous edition; kept only so routes accepted before 2026-10-01 still settle. */
const WORLD_REGION_V2_VERSION = 'w01-authored-fixture-2026-09-29-v2' as const;

export type WorldTerrain = 'SETTLEMENT' | 'WOODLAND' | 'RIVERBANK' | 'OPEN_GROUND' | 'MILL_RUIN';
export type WorldDanger = 'SAFE' | 'DANGEROUS';

export interface WorldRegionArea {
  readonly areaId: string;
  readonly terrain: WorldTerrain;
  readonly danger: WorldDanger;
}

export interface WorldRegionSite {
  readonly siteId: string;
  readonly name: string;
  readonly kind: 'CITY' | 'VILLAGE' | 'LANDMARK';
  readonly coordinate: { readonly q: number; readonly r: number };
  readonly areas: readonly WorldRegionArea[];
}

export interface WorldRegionEdge {
  readonly edgeId: string;
  readonly fromSiteId: string;
  readonly toSiteId: string;
  readonly provisionalTravelTicks: number;
  readonly terrain: WorldTerrain;
  readonly danger: WorldDanger;
}

export interface WorldRegion {
  readonly version: typeof WORLD_REGION_VERSION | typeof WORLD_REGION_V2_VERSION;
  readonly regionId: string;
  readonly name: string;
  readonly provenance: 'AUTHORED_INITIAL_FIXTURE';
  readonly sites: readonly WorldRegionSite[];
  readonly edges: readonly WorldRegionEdge[];
}

function freezeSite(site: WorldRegionSite): WorldRegionSite {
  return Object.freeze({
    ...site,
    coordinate: Object.freeze({ ...site.coordinate }),
    areas: Object.freeze(site.areas.map((area) => Object.freeze({ ...area }))),
  });
}

// Owner decision 2026-10-01: shorten the provisional road lengths so a FIRST HUNT
// trip from Каменный Брод to Старая мельница takes ≈9 minutes instead of ≈2 hours.
// Campaign Day (1000 ticks / 6 h) and Light clocks are unchanged.
const regionDraft: WorldRegion = {
  version: WORLD_REGION_VERSION,
  regionId: 'seroe-porechye',
  name: 'Серое Поречье',
  provenance: 'AUTHORED_INITIAL_FIXTURE',
  sites: [
    {
      siteId: 'kamenny-brod',
      name: 'Каменный Брод',
      kind: 'CITY',
      coordinate: { q: 0, r: 0 },
      areas: [{ areaId: 'kamenny-brod-market', terrain: 'SETTLEMENT', danger: 'SAFE' }],
    },
    {
      siteId: 'bereznyak',
      name: 'Березняк',
      kind: 'VILLAGE',
      coordinate: { q: -2, r: 1 },
      areas: [{ areaId: 'bereznyak-green', terrain: 'WOODLAND', danger: 'SAFE' }],
    },
    {
      siteId: 'tikhaya-gat',
      name: 'Тихая Гать',
      kind: 'VILLAGE',
      coordinate: { q: 2, r: 1 },
      areas: [{ areaId: 'tikhaya-gat-bank', terrain: 'RIVERBANK', danger: 'SAFE' }],
    },
    {
      siteId: 'severny-dvor',
      name: 'Северный Двор',
      kind: 'VILLAGE',
      coordinate: { q: 0, r: 3 },
      areas: [{ areaId: 'severny-dvor-yard', terrain: 'OPEN_GROUND', danger: 'SAFE' }],
    },
    {
      siteId: 'staraya-melnitsa',
      name: 'Старая мельница',
      kind: 'LANDMARK',
      coordinate: { q: 3, r: -2 },
      areas: [{ areaId: 'staraya-melnitsa-yard', terrain: 'MILL_RUIN', danger: 'DANGEROUS' }],
    },
  ],
  edges: [
    {
      edgeId: 'kamenny-brod-bereznyak',
      fromSiteId: 'kamenny-brod',
      toSiteId: 'bereznyak',
      provisionalTravelTicks: 8,
      terrain: 'WOODLAND',
      danger: 'SAFE',
    },
    {
      edgeId: 'kamenny-brod-tikhaya-gat',
      fromSiteId: 'kamenny-brod',
      toSiteId: 'tikhaya-gat',
      provisionalTravelTicks: 10,
      terrain: 'RIVERBANK',
      danger: 'SAFE',
    },
    {
      edgeId: 'kamenny-brod-severny-dvor',
      fromSiteId: 'kamenny-brod',
      toSiteId: 'severny-dvor',
      provisionalTravelTicks: 10,
      terrain: 'OPEN_GROUND',
      danger: 'SAFE',
    },
    {
      edgeId: 'tikhaya-gat-staraya-melnitsa',
      fromSiteId: 'tikhaya-gat',
      toSiteId: 'staraya-melnitsa',
      provisionalTravelTicks: 16,
      terrain: 'MILL_RUIN',
      danger: 'DANGEROUS',
    },
  ],
};

function validateRegion(region: WorldRegion): void {
  const siteIds = new Set<string>();
  const areaIds = new Set<string>();
  const coordinates = new Set<string>();
  for (const site of region.sites) {
    if (!site.siteId || siteIds.has(site.siteId) || site.areas.length === 0)
      throw new RangeError('Invalid world region site');
    siteIds.add(site.siteId);
    const coordinateKey = `${site.coordinate.q},${site.coordinate.r}`;
    if (!Number.isSafeInteger(site.coordinate.q) || !Number.isSafeInteger(site.coordinate.r))
      throw new RangeError('Invalid world region coordinate');
    if (coordinates.has(coordinateKey)) throw new RangeError('Duplicate world region coordinate');
    coordinates.add(coordinateKey);
    for (const area of site.areas) {
      if (!area.areaId || areaIds.has(area.areaId)) throw new RangeError('Duplicate world area ID');
      areaIds.add(area.areaId);
    }
  }

  const adjacency = new Map(region.sites.map((site) => [site.siteId, new Set<string>()]));
  const edgeIds = new Set<string>();
  for (const edge of region.edges) {
    const from = adjacency.get(edge.fromSiteId);
    const to = adjacency.get(edge.toSiteId);
    if (
      !edge.edgeId ||
      edgeIds.has(edge.edgeId) ||
      !from ||
      !to ||
      edge.fromSiteId === edge.toSiteId ||
      !Number.isSafeInteger(edge.provisionalTravelTicks) ||
      edge.provisionalTravelTicks <= 0
    )
      throw new RangeError('Invalid world region edge');
    edgeIds.add(edge.edgeId);
    from.add(edge.toSiteId);
    to.add(edge.fromSiteId);
  }

  const reached = new Set<string>();
  const pending = [region.sites[0]?.siteId];
  while (pending.length > 0) {
    const siteId = pending.pop();
    if (!siteId || reached.has(siteId)) continue;
    reached.add(siteId);
    pending.push(...adjacency.get(siteId)!);
  }
  if (reached.size !== region.sites.length) throw new RangeError('Disconnected world region');
}

validateRegion(regionDraft);

export const SEROE_PORECHYE = Object.freeze({
  ...regionDraft,
  sites: Object.freeze(regionDraft.sites.map(freezeSite)),
  edges: Object.freeze(regionDraft.edges.map((edge) => Object.freeze({ ...edge }))),
});

// Keep every edition accepted by an in-flight persisted route here when the current
// authored region advances. Departures use SEROE_PORECHYE; arrivals resolve by version.
const V2_EDGE_TICKS: Readonly<Record<string, number>> = {
  'kamenny-brod-bereznyak': 100,
  'kamenny-brod-tikhaya-gat': 120,
  'kamenny-brod-severny-dvor': 10,
  'tikhaya-gat-staraya-melnitsa': 240,
};
const SEROE_PORECHYE_V2: WorldRegion = Object.freeze({
  ...SEROE_PORECHYE,
  version: WORLD_REGION_V2_VERSION,
  edges: Object.freeze(
    SEROE_PORECHYE.edges.map((edge) =>
      Object.freeze({ ...edge, provisionalTravelTicks: V2_EDGE_TICKS[edge.edgeId]! }),
    ),
  ),
});
const acceptedRegionEditions: readonly WorldRegion[] = Object.freeze([
  SEROE_PORECHYE,
  SEROE_PORECHYE_V2,
]);

export function acceptedWorldRegion(version: string): WorldRegion | undefined {
  return acceptedRegionEditions.find((region) => region.version === version);
}

import {
  PAINTED_ATLAS_REGION,
  PAINTED_ATLAS_SITES,
  paintedAtlasPoint,
  buildNavigationField,
  findTravelPath,
  compileMovementPlan,
  isContinuousPointWalkable,
  inspectRoadNetwork,
  type NavigationField,
} from '@warwrit/game-core';
import {
  MAP_CONTENT_REVISION,
  type MapContent,
  type MapIssue,
  type MapPreview,
  type MapPoint,
  type MapRegion,
} from '@warwrit/protocol';
import {
  combatLabCatalog,
  defaultSpriteBattle,
  isCustomBattle,
} from '../combat-lab/custom-battle.js';
import { inspectPlaygroundScenario, playgroundTemplate } from '../playground/scenario.js';

export { combatLabCatalog };
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const text = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= 100;
export const mapPoint = (v: unknown): v is MapPoint =>
  object(v) &&
  exact(v, ['xFp', 'zFp']) &&
  [v['xFp'], v['zFp']].every((n) => Number.isSafeInteger(n) && Math.abs(Number(n)) <= 10000);
const points = (v: unknown, min = 3): boolean =>
  Array.isArray(v) && v.length >= min && v.length <= 1024 && v.every(mapPoint);
const hex = (v: unknown) =>
  object(v) &&
  exact(v, ['q', 'r']) &&
  Number.isSafeInteger(v['q']) &&
  Number.isSafeInteger(v['r']) &&
  Number(v['q']) >= 0 &&
  Number(v['q']) < 15 &&
  Number(v['r']) >= 0 &&
  Number(v['r']) < 11;
const terrains = [
  'grassland',
  'forest',
  'hills',
  'marsh',
  'riverbank',
  'rock',
  'deep_water',
  'cliff',
];
const overlays = ['road', 'trail', 'dirt_road', 'paved_road', 'bridge', 'ford'];
function shapes(v: unknown, kind: 'terrain' | 'overlay' | 'blocking' | 'danger'): boolean {
  return (
    Array.isArray(v) &&
    v.length <= 512 &&
    v.every((s) => {
      if (!object(s) || !points(s['polygon'])) return false;
      const id = kind === 'danger' ? 'areaId' : 'shapeId';
      const extra =
        kind === 'terrain'
          ? ['terrainId', 'paintPriority']
          : kind === 'overlay'
            ? ['overlayId', ...(Object.hasOwn(s, 'stations') ? ['stations'] : [])]
            : [];
      return (
        exact(s, [id, 'polygon', ...extra]) &&
        text(s[id]) &&
        (kind !== 'terrain' ||
          (terrains.includes(String(s['terrainId'])) &&
            Number.isSafeInteger(s['paintPriority']) &&
            Math.abs(Number(s['paintPriority'])) <= 1000)) &&
        (kind !== 'overlay' ||
          (overlays.includes(String(s['overlayId'])) &&
            (!Object.hasOwn(s, 'stations') || points(s['stations'], 2))))
      );
    })
  );
}
function region(v: unknown): v is MapRegion {
  if (
    !object(v) ||
    !exact(v, [
      'mapEdition',
      'navigationVersion',
      'speedProfileId',
      'origin',
      'columns',
      'rows',
      'cellSizeFp',
      'boundary',
      'terrainShapes',
      'overlayShapes',
      'blockingShapes',
      'dangerAreaShapes',
      'sites',
    ])
  )
    return false;
  return (
    v['mapEdition'] === PAINTED_ATLAS_REGION.mapEdition &&
    v['navigationVersion'] === 'polygon-v1' &&
    v['speedProfileId'] === PAINTED_ATLAS_REGION.speedProfileId &&
    v['columns'] === 252 &&
    v['rows'] === 168 &&
    v['cellSizeFp'] === 64 &&
    mapPoint(v['origin']) &&
    v['origin'].xFp === PAINTED_ATLAS_REGION.origin.xFp &&
    v['origin'].zFp === PAINTED_ATLAS_REGION.origin.zFp &&
    points(v['boundary']) &&
    shapes(v['terrainShapes'], 'terrain') &&
    shapes(v['overlayShapes'], 'overlay') &&
    shapes(v['blockingShapes'], 'blocking') &&
    shapes(v['dangerAreaShapes'], 'danger') &&
    Array.isArray(v['sites']) &&
    v['sites'].length <= 128 &&
    v['sites'].every(
      (s) =>
        object(s) &&
        exact(s, ['siteId', 'areaId', 'anchorFp']) &&
        text(s['siteId']) &&
        text(s['areaId']) &&
        mapPoint(s['anchorFp']),
    )
  );
}
/** Bounded transport shape; semantic errors are saved for author correction. */
export function isMapContent(v: unknown): v is MapContent {
  if (
    !object(v) ||
    v['schemaVersion'] !== 1 ||
    v['contentRevision'] !== MAP_CONTENT_REVISION ||
    !text(v['name'])
  )
    return false;
  if (v['kind'] === 'world')
    return (
      exact(v, ['schemaVersion', 'contentRevision', 'name', 'kind', 'atlas', 'region']) &&
      v['atlas'] === 'atlas-v6' &&
      region(v['region'])
    );
  if (
    v['kind'] !== 'battle' ||
    !exact(v, ['schemaVersion', 'contentRevision', 'name', 'kind', 'battle', 'deployment'])
  )
    return false;
  const b = v['battle'];
  return (
    object(b) &&
    exact(b, ['version', 'name', 'seed', 'map', 'units']) &&
    b['version'] === 1 &&
    text(b['name']) &&
    Number.isSafeInteger(b['seed']) &&
    Number(b['seed']) >= 0 &&
    Number(b['seed']) <= 0xffffffff &&
    object(b['map']) &&
    exact(b['map'], ['name', 'tiles']) &&
    text(b['map']['name']) &&
    Array.isArray(b['map']['tiles']) &&
    b['map']['tiles'].length === 165 &&
    b['map']['tiles'].every(
      (t) =>
        object(t) &&
        exact(t, ['q', 'r', 'height', 'terrain', 'blocked']) &&
        hex({ q: t['q'], r: t['r'] }) &&
        [0, 1, 2].includes(t['height'] as number) &&
        ['plain', 'mud', 'fire'].includes(String(t['terrain'])) &&
        typeof t['blocked'] === 'boolean',
    ) &&
    Array.isArray(b['units']) &&
    b['units'].length <= 12 &&
    b['units'].every(
      (u) =>
        object(u) &&
        exact(u, [
          'id',
          'profileId',
          'sideId',
          'position',
          ...(Object.hasOwn(u, 'skillRanks') ? ['skillRanks'] : []),
        ]) &&
        text(u['id']) &&
        text(u['profileId']) &&
        ['human', 'opponent'].includes(String(u['sideId'])) &&
        hex(u['position']) &&
        (!Object.hasOwn(u, 'skillRanks') ||
          (object(u['skillRanks']) &&
            Object.keys(u['skillRanks']).length <= 5 &&
            Object.values(u['skillRanks']).every((r) => [1, 2, 3].includes(r as number)))),
    ) &&
    Array.isArray(v['deployment']) &&
    v['deployment'].length === 2 &&
    v['deployment'].every(
      (d) =>
        object(d) &&
        exact(d, ['sideId', 'hexes']) &&
        ['human', 'opponent'].includes(String(d['sideId'])) &&
        Array.isArray(d['hexes']) &&
        d['hexes'].length <= 165 &&
        d['hexes'].every(hex),
    )
  );
}
export function mapTemplates(): MapContent[] {
  const battle = defaultSpriteBattle();
  return [
    {
      schemaVersion: 1,
      contentRevision: MAP_CONTENT_REVISION,
      name: 'Атлас v6',
      kind: 'world',
      atlas: 'atlas-v6',
      region: structuredClone(PAINTED_ATLAS_REGION),
    },
    {
      schemaVersion: 1,
      contentRevision: MAP_CONTENT_REVISION,
      name: battle.map.name,
      kind: 'battle',
      battle,
      deployment: ['human', 'opponent'].map((sideId) => ({
        sideId: sideId as 'human' | 'opponent',
        hexes: battle.units.filter((u) => u.sideId === sideId).map((u) => u.position),
      })),
    },
  ];
}
const connections = [
  {
    name: 'Восточный подход',
    roadShapePrefix: 'center-center-east-edge-',
    from: paintedAtlasPoint([2691, 1379]),
    to: paintedAtlasPoint([3072, 1454]),
  },
  {
    name: 'Лесная дорога',
    roadShapePrefix: 'center-south-field-link-',
    from: paintedAtlasPoint([2636, 2048]),
    to: paintedAtlasPoint([2800, 1775]),
  },
];
function worldIssues(
  content: Extract<MapContent, { kind: 'world' }>,
  field: NavigationField,
): MapIssue[] {
  const issues: MapIssue[] = [];
  const seen = new Set<string>();
  for (const s of [
    ...content.region.terrainShapes,
    ...content.region.overlayShapes,
    ...content.region.blockingShapes,
  ]) {
    if (seen.has(s.shapeId))
      issues.push({
        objectId: s.shapeId,
        code: 'DUPLICATE_ID',
        message: 'ID геометрии повторяется.',
        point: s.polygon[0]!,
      });
    seen.add(s.shapeId);
  }
  const siteIds = new Set<string>();
  for (const site of content.region.sites) {
    const known = PAINTED_ATLAS_SITES.find(
      (s) => s.siteId === site.siteId && s.areaId === site.areaId,
    );
    if (!known || siteIds.has(site.siteId))
      issues.push({
        objectId: site.siteId,
        code: 'CONTENT_ID',
        message: 'Неизвестный, повторный или несовместимый site/area ID.',
        point: site.anchorFp,
      });
    siteIds.add(site.siteId);
    if (!isContinuousPointWalkable(field, site.anchorFp))
      issues.push({
        objectId: site.siteId,
        code: 'ANCHOR_BLOCKED',
        message: 'Anchor места непроходим.',
        point: site.anchorFp,
      });
  }
  const start = content.region.sites.find((s) => s.siteId === 'bereznyak');
  for (const required of PAINTED_ATLAS_SITES.slice(0, 5)) {
    const site = content.region.sites.find((s) => s.siteId === required.siteId);
    if (!site)
      issues.push({
        objectId: required.siteId,
        code: 'DANGLING_SITE',
        message: 'Обязательное место отсутствует.',
        point: required.anchorFp,
      });
    else if (start && !findTravelPath(field, start.anchorFp, site.anchorFp))
      issues.push({
        objectId: site.siteId,
        code: 'UNREACHABLE',
        message: 'Нет пути из Березняка.',
        point: site.anchorFp,
      });
  }
  const report = inspectRoadNetwork(field, connections);
  for (const c of report.connections)
    if (!c.connected)
      issues.push({
        objectId: c.roadShapePrefix,
        code: 'ROAD_CONTINUITY',
        message: `Разрыв дороги: ${c.name}.`,
        point: c.from,
      });
  const offset = field.walkable.length;
  for (const road of content.region.overlayShapes) {
    const stations = road.stations ?? [];
    for (let i = 1; i < stations.length; i++) {
      const a = report.points.findIndex(
        (p) => p.xFp === stations[i - 1]!.xFp && p.zFp === stations[i - 1]!.zFp,
      );
      const b = report.points.findIndex(
        (p) => p.xFp === stations[i]!.xFp && p.zFp === stations[i]!.zFp,
      );
      if (a < 0 || b < 0 || !(field.roadEdges?.get(a + offset) ?? []).includes(b + offset))
        issues.push({
          objectId: road.shapeId,
          code: 'ROAD_TRAVERSABILITY',
          message: 'Дорожная связь не проходит через разрешённую геометрию.',
          point: stations[i - 1]!,
        });
    }
  }
  return issues;
}
export function inspectMap(content: MapContent): MapPreview {
  try {
    if (content.kind === 'world') {
      const field = buildNavigationField(content.region);
      const report = inspectRoadNetwork(field, connections);
      return {
        revision: 0,
        issues: worldIssues(content, field),
        nodes: report.points,
        edges: report.edges,
      };
    }
    const issues: MapIssue[] = [];
    const keys = new Set<string>();
    for (const t of content.battle.map.tiles) {
      const id = `${t.q},${t.r}`;
      if (keys.has(id))
        issues.push({ objectId: id, hex: t, code: 'DUPLICATE_HEX', message: 'Повторная клетка.' });
      keys.add(id);
    }
    const validBattle: boolean = isCustomBattle(content.battle);
    if (!validBattle) {
      for (const u of content.battle.units)
        issues.push({
          objectId: u.id,
          hex: u.position,
          code: 'BATTLE_SETUP',
          message:
            'Проверьте profile ID, стороны, занятость, препятствия, связность и выходы карты.',
        });
      if (!content.battle.units.length)
        issues.push({
          objectId: 'battle',
          code: 'BATTLE_SETUP',
          message: 'Нужны участники обеих сторон.',
        });
    }
    const sideIds = new Set<string>();
    for (const d of content.deployment) {
      if (sideIds.has(d.sideId))
        issues.push({
          objectId: d.sideId,
          code: 'DEPLOYMENT',
          message: 'Зона стороны повторяется.',
        });
      sideIds.add(d.sideId);
      for (const h of d.hexes)
        if (!content.battle.map.tiles.some((t) => t.q === h.q && t.r === h.r && !t.blocked))
          issues.push({
            objectId: `${h.q},${h.r}`,
            hex: h,
            code: 'DEPLOYMENT',
            message: 'Зона содержит препятствие или отсутствующую клетку.',
          });
    }
    for (const u of content.battle.units)
      if (
        !content.deployment
          .find((d) => d.sideId === u.sideId)
          ?.hexes.some((h) => h.q === u.position.q && h.r === u.position.r)
      )
        issues.push({
          objectId: u.id,
          hex: u.position,
          code: 'SPAWN_OUTSIDE_DEPLOYMENT',
          message: 'Spawn находится вне зоны своей стороны.',
        });
    return {
      revision: 0,
      issues,
      ...(issues.length
        ? {}
        : {
            view: inspectPlaygroundScenario('map-preview', {
              ...playgroundTemplate(),
              initial: content.battle,
            }),
          }),
    };
  } catch (error) {
    const cause = error;
    const objectId =
      object(cause) && typeof cause['objectId'] === 'string' ? cause['objectId'] : 'geometry';
    const shape =
      content.kind === 'world'
        ? [
            ...content.region.terrainShapes,
            ...content.region.overlayShapes,
            ...content.region.blockingShapes,
            ...content.region.dangerAreaShapes,
          ].find((s) => ('shapeId' in s ? s.shapeId : s.areaId) === objectId)
        : undefined;
    const point =
      shape?.polygon[0] ?? (content.kind === 'world' ? content.region.boundary[0] : undefined);
    return {
      revision: 0,
      issues: [
        {
          objectId,
          code:
            error instanceof Error && error.message === 'Invalid authored road corridor'
              ? 'ROAD_TRAVERSABILITY'
              : 'CONTENT_INVALID',
          message: error instanceof Error ? error.message : 'Некорректная геометрия.',
          ...(point ? { point } : {}),
        },
      ],
    };
  }
}
export function previewMapRoute(content: MapContent, from: MapPoint, to: MapPoint) {
  if (content.kind !== 'world') return undefined;
  const field = buildNavigationField(content.region);
  const route = findTravelPath(field, from, to);
  if (!route) return undefined;
  const plan = compileMovementPlan({
    field,
    path: route,
    movementEpoch: '0',
    startedAtMs: '0',
    planId: 'map-editor-preview',
  });
  return { route, durationUs: plan.totalDurationUs };
}

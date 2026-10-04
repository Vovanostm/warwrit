import {
  Color3,
  Color4,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core';
import type { WorldSurroundingsDto } from '@warwrit/protocol';

import { MAP_ART, siteSprite } from './art.js';
import { acquireCanvasEngine, releaseCanvasEngine } from './canvas-engine.js';
import { mountThreeQuarterCamera, type ThreeQuarterCamera } from './three-quarter-camera.js';

type MapDto = WorldSurroundingsDto['map'];

export type MapPartyPosition =
  | { readonly kind: 'SITE'; readonly siteId: string }
  | { readonly kind: 'TERRAIN'; readonly q: number; readonly r: number }
  | {
      readonly kind: 'ROAD';
      readonly fromSiteId: string;
      readonly toSiteId: string;
      readonly progress: number;
    };

export interface MapView {
  readonly night: boolean;
  readonly party: MapPartyPosition | null;
  readonly reachableSiteIds: ReadonlySet<string>;
  readonly selectedSiteId: string | null;
  readonly plannedEdgeIds: readonly string[];
  readonly selectedHex?: { readonly q: number; readonly r: number } | null;
  readonly plannedHexPath?: readonly { readonly q: number; readonly r: number }[];
}

export interface MapLabelPosition {
  readonly siteId: string;
  /** CSS pixels from the canvas top-left corner. */
  readonly x: number;
  readonly y: number;
  readonly visible?: boolean;
  readonly align?: 'center' | 'start' | 'end';
  readonly alternateX?: number;
}

export interface MapScene {
  update(view: MapView): void;
  destroy(): void;
}

const SQRT3 = Math.sqrt(3);
const SITE_SIZE = 2.3;
const ROAD_COLORS = {
  SAFE: new Color3(0.36, 0.29, 0.2),
  DANGEROUS: new Color3(0.45, 0.13, 0.1),
  planned: new Color3(0.95, 0.75, 0.38),
} as const;

function siteToWorld(site: { readonly q: number; readonly r: number }): {
  readonly x: number;
  readonly z: number;
} {
  return { x: SQRT3 * (site.q + site.r / 2), z: -1.5 * site.r };
}

/** Deterministic decoration points away from sites and roads. */
function forestPoints(map: MapDto): { x: number; z: number }[] {
  const sites = map.sites.map(siteToWorld);
  const roads = map.edges.flatMap((edge) => {
    const from = map.sites.find((site) => site.siteId === edge.fromSiteId);
    const to = map.sites.find((site) => site.siteId === edge.toSiteId);
    return from && to ? [[siteToWorld(from), siteToWorld(to)] as const] : [];
  });
  const distanceToSegment = (
    p: { x: number; z: number },
    a: { x: number; z: number },
    b: { x: number; z: number },
  ) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
  };
  const points: { x: number; z: number }[] = [];
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const xs = sites.map((site) => site.x);
  const zs = sites.map((site) => site.z);
  for (let attempt = 0; attempt < 160 && points.length < 14; attempt += 1) {
    const p = {
      x: Math.min(...xs) - 2.5 + random() * (Math.max(...xs) - Math.min(...xs) + 5),
      z: Math.min(...zs) - 2 + random() * (Math.max(...zs) - Math.min(...zs) + 4),
    };
    if (sites.some((site) => Math.hypot(site.x - p.x, site.z - p.z) < 1.8)) continue;
    if (roads.some(([a, b]) => distanceToSegment(p, a, b) < 0.55)) continue;
    if (points.some((other) => Math.hypot(other.x - p.x, other.z - p.z) < 0.9)) continue;
    points.push(p);
  }
  return points;
}

/**
 * Babylon.js global map: ink sprites for settlements and the party on a painted ground,
 * roads as flat strips, the same fixed three-quarter camera as the battlefield. Mounting is
 * synchronous so a React cleanup can dispose the engine before another one claims the canvas.
 */
export function mountMapScene(
  canvas: HTMLCanvasElement,
  map: MapDto,
  initialView: MapView,
  callbacks: {
    readonly onSelectSite: (siteId: string) => void;
    readonly onSelectTerrain: (position: { readonly q: number; readonly r: number }) => void;
    readonly onLabels: (labels: readonly MapLabelPosition[]) => void;
  },
): MapScene {
  const engine = acquireCanvasEngine(canvas);
  const scene = new Scene(engine);
  const light = new HemisphericLight('sky', new Vector3(0.2, 1, -0.3), scene);
  light.groundColor = new Color3(0.42, 0.4, 0.36);

  const textures = new Map<string, Texture>();
  const texture = (url: string) => {
    let value = textures.get(url);
    if (!value) {
      value = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
      textures.set(url, value);
    }
    return value;
  };
  const sprite = (name: string, url: string, size: number) => {
    const mesh = MeshBuilder.CreatePlane(name, { size }, scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
    const material = new StandardMaterial(name, scene);
    const image = texture(url);
    image.hasAlpha = true;
    material.diffuseTexture = image;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.specularColor = Color3.Black();
    material.emissiveColor = new Color3(0.28, 0.26, 0.24);
    mesh.material = material;
    return mesh;
  };

  const points = new Map(map.sites.map((site) => [site.siteId, siteToWorld(site)]));
  const walkBounds = map.walkBounds ?? {
    minQ: Math.min(...map.sites.map((site) => site.q)),
    maxQ: Math.max(...map.sites.map((site) => site.q)),
    minR: Math.min(...map.sites.map((site) => site.r)),
    maxR: Math.max(...map.sites.map((site) => site.r)),
  };
  const boundPoints = [
    siteToWorld({ q: walkBounds.minQ, r: walkBounds.minR }),
    siteToWorld({ q: walkBounds.maxQ, r: walkBounds.maxR }),
    siteToWorld({ q: walkBounds.minQ, r: walkBounds.maxR }),
    siteToWorld({ q: walkBounds.maxQ, r: walkBounds.minR }),
  ];
  const xs = boundPoints.map((p) => p.x);
  const zs = boundPoints.map((p) => p.z);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };

  const groundSize = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) + 40;
  const ground = MeshBuilder.CreateGround('land', { width: groundSize, height: groundSize }, scene);
  ground.position.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  const groundMaterial = new StandardMaterial('land', scene);
  const groundTexture = new Texture(MAP_ART.ground, scene);
  groundTexture.uScale = groundSize / 6;
  groundTexture.vScale = groundSize / 6;
  groundMaterial.diffuseTexture = groundTexture;
  groundMaterial.specularColor = Color3.Black();
  ground.material = groundMaterial;
  ground.isPickable = false;

  const terrainColors = {
    WOODLAND: new Color3(0.24, 0.32, 0.21),
    RIVERBANK: new Color3(0.28, 0.37, 0.39),
    OPEN_GROUND: new Color3(0.39, 0.35, 0.26),
  } as const;
  const blockedHexes = new Set((map.blockedHexes ?? []).map(({ q, r }) => `${q},${r}`));
  const terrainTiles = new Map<
    string,
    { readonly mesh: Mesh; readonly material: StandardMaterial }
  >();
  for (const row of map.terrainRows ?? []) {
    for (let q = row.fromQ; q <= row.toQ; q += 1) {
      const key = `${q},${row.r}`;
      const center = siteToWorld({ q, r: row.r });
      const tile = MeshBuilder.CreateCylinder(
        `terrain:${key}`,
        { height: 0.05, diameter: 1.82, tessellation: 6 },
        scene,
      );
      tile.position.set(center.x, 0.035, center.z);
      const material = new StandardMaterial(`terrain:${key}`, scene);
      material.diffuseColor = blockedHexes.has(key)
        ? new Color3(0.14, 0.12, 0.1)
        : terrainColors[row.terrain];
      material.specularColor = Color3.Black();
      tile.material = material;
      tile.isPickable = true;
      tile.metadata = { terrainHex: !blockedHexes.has(key), q, r: row.r };
      terrainTiles.set(key, { mesh: tile, material });
    }
  }

  for (const [index, point] of forestPoints(map).entries()) {
    const forest = sprite(`forest:${index}`, MAP_ART.forest, 1.2 + (index % 3) * 0.2);
    forest.position.set(point.x, 0.5, point.z);
    forest.isPickable = false;
  }

  const roadMaterials = new Map<string, StandardMaterial>();
  for (const edge of map.edges) {
    const from = points.get(edge.fromSiteId);
    const to = points.get(edge.toSiteId);
    if (!from || !to) continue;
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const road = MeshBuilder.CreateBox(
      `road:${edge.edgeId}`,
      { width: length, height: 0.02, depth: 0.14 },
      scene,
    );
    road.position.set((from.x + to.x) / 2, 0.01, (from.z + to.z) / 2);
    road.rotation.y = -Math.atan2(to.z - from.z, to.x - from.x);
    const material = new StandardMaterial(`road:${edge.edgeId}`, scene);
    material.disableLighting = true;
    road.material = material;
    road.isPickable = false;
    roadMaterials.set(edge.edgeId, material);
  }

  const rings = new Map<string, { readonly mesh: Mesh; readonly material: StandardMaterial }>();
  for (const site of map.sites) {
    const point = points.get(site.siteId)!;
    const mesh = sprite(`site:${site.siteId}`, siteSprite(site.siteId, site.kind), SITE_SIZE);
    mesh.position.set(point.x, SITE_SIZE / 2 - 0.12, point.z);
    mesh.metadata = { siteId: site.siteId };
    const ring = MeshBuilder.CreateTorus(
      `ring:${site.siteId}`,
      { diameter: 1.9, thickness: 0.07, tessellation: 40 },
      scene,
    );
    ring.scaling.y = 0.15;
    ring.position.set(point.x, 0.02, point.z);
    ring.isPickable = false;
    const material = new StandardMaterial(`ring:${site.siteId}`, scene);
    material.disableLighting = true;
    ring.material = material;
    rings.set(site.siteId, { mesh: ring, material });
  }

  const banner = sprite('party', MAP_ART.party, 2.4);
  // The company's own banner stays readable at night.
  (banner.material as StandardMaterial).emissiveColor = new Color3(0.6, 0.55, 0.5);
  banner.isPickable = false;
  const bannerTarget = new Vector3();
  let bannerPlaced = false;

  const applyView = (next: MapView) => {
    light.intensity = next.night ? 0.55 : 1.05;
    light.diffuse = next.night ? new Color3(0.62, 0.7, 0.95) : new Color3(1, 0.97, 0.9);
    scene.clearColor = next.night
      ? new Color4(0.03, 0.035, 0.05, 1)
      : new Color4(0.08, 0.07, 0.06, 1);
    const planned = new Set(next.plannedEdgeIds);
    for (const edge of map.edges) {
      const material = roadMaterials.get(edge.edgeId);
      if (!material) continue;
      material.emissiveColor = planned.has(edge.edgeId)
        ? ROAD_COLORS.planned
        : ROAD_COLORS[edge.danger === 'DANGEROUS' ? 'DANGEROUS' : 'SAFE'];
    }
    const selectedHex = next.selectedHex ? `${next.selectedHex.q},${next.selectedHex.r}` : null;
    const plannedHexes = new Set((next.plannedHexPath ?? []).map(({ q, r }) => `${q},${r}`));
    for (const [key, tile] of terrainTiles) {
      const isSelected = key === selectedHex;
      const isPlanned = plannedHexes.has(key);
      tile.material.emissiveColor = isSelected
        ? new Color3(0.95, 0.76, 0.34)
        : isPlanned
          ? new Color3(0.42, 0.31, 0.11)
          : Color3.Black();
    }
    for (const [siteId, ring] of rings) {
      const selected = next.selectedSiteId === siteId;
      const reachable = next.reachableSiteIds.has(siteId);
      ring.mesh.setEnabled(selected || reachable);
      ring.material.emissiveColor = selected
        ? new Color3(1, 0.86, 0.52)
        : new Color3(0.55, 0.45, 0.25);
    }
    const party = next.party;
    banner.setEnabled(party !== null);
    if (!party) return;
    let target: { x: number; z: number } | undefined;
    if (party.kind === 'SITE') {
      const site = points.get(party.siteId);
      if (site) target = { x: site.x + 0.9, z: site.z - 0.5 };
    } else if (party.kind === 'TERRAIN') {
      target = siteToWorld(party);
    } else {
      const from = points.get(party.fromSiteId);
      const to = points.get(party.toSiteId);
      const t = Math.min(1, Math.max(0, party.progress));
      if (from && to) target = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
    }
    if (!target) return;
    bannerTarget.set(target.x, 1.05, target.z - 0.25);
    if (!bannerPlaced) {
      banner.position.copyFrom(bannerTarget);
      bannerPlaced = true;
    }
  };

  const camera: ThreeQuarterCamera = mountThreeQuarterCamera(scene, engine, canvas, {
    minZoom: 2,
    maxZoom: 14,
    onPick: (hit) => {
      const siteId = (hit?.pickedMesh?.metadata as { siteId?: string } | undefined)?.siteId;
      if (siteId) callbacks.onSelectSite(siteId);
      const terrain = hit?.pickedMesh?.metadata as
        { terrainHex?: boolean; q?: number; r?: number } | undefined;
      if (terrain?.terrainHex && Number.isSafeInteger(terrain.q) && Number.isSafeInteger(terrain.r))
        callbacks.onSelectTerrain({ q: terrain.q!, r: terrain.r! });
    },
  });

  // Labels are HTML over the canvas; publish their positions when the view matrix changes.
  let labelKey = '';
  const publishLabels = () => {
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const transform = scene.getTransformMatrix();
    const key = `${transform.m.join(',')}:${width}x${height}`;
    if (key === labelKey) return;
    labelKey = key;
    const scale = canvas.clientWidth / Math.max(width, 1);
    const viewport = scene.activeCamera!.viewport.toGlobal(width, height);
    callbacks.onLabels(
      map.sites.map((site) => {
        const point = points.get(site.siteId)!;
        const projected = Vector3.Project(
          new Vector3(point.x, 0, point.z),
          Matrix.Identity(),
          transform,
          viewport,
        );
        return { siteId: site.siteId, x: projected.x * scale, y: projected.y * scale };
      }),
    );
  };
  scene.onAfterRenderObservable.add(() => {
    if (bannerPlaced) Vector3.LerpToRef(banner.position, bannerTarget, 0.08, banner.position);
    publishLabels();
  });

  applyView(initialView);
  engine.resize();
  camera.fit(bounds, 1.1);
  engine.runRenderLoop(() => scene.render());

  return {
    update(next) {
      applyView(next);
    },
    destroy() {
      camera.dispose();
      engine.stopRenderLoop();
      scene.dispose();
      releaseCanvasEngine(canvas);
      textures.clear();
    },
  };
}

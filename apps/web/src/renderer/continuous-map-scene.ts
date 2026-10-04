import {
  type PickingInfo,
  Color3,
  Color4,
  HemisphericLight,
  Matrix,
  Material,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  VertexData,
  VertexBuffer,
} from '@babylonjs/core';
import type {
  WorldContinuousMapDto,
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldSurroundingsDto,
} from '@warwrit/protocol';
import { acquireCanvasEngine, releaseCanvasEngine } from './canvas-engine.js';
import { mountThreeQuarterCamera } from './three-quarter-camera.js';
import {
  MAP_ART,
  MAP_TREE_PARTS,
  CITY_SPRITE_SIZE,
  mapSiteSprite,
  type MapSpriteArt,
} from './art.js';
import { createComponentTreeBatch } from './map-trees.js';
import { TREE_FORMS } from './map-tree-forms.js';
import { generateForest } from './map-forest.js';
import { createTerrainMaterial, createRoadMaterial } from './terrain-material.js';
import { createMapRoads } from './map-roads.js';
import { createMapShadows } from './map-shadows.js';
import { createMapSurface } from './map-surface.js';
import { createMapLife } from './map-life.js';
import type { MapLabelPosition } from './map-scene.js';
import type { RouteOverlayFrame } from './route-overlay.js';

function spriteGeometry(art: MapSpriteArt, height: number): VertexData {
  const { bounds, pivot } = art;
  const width = height * (art.width / art.height);
  const left = (bounds.left - pivot.x) * width;
  const right = (bounds.right - pivot.x) * width;
  const top = (pivot.y - bounds.top) * height;
  const bottom = (pivot.y - bounds.bottom) * height;
  const data = new VertexData();
  data.positions = [left, bottom, 0, right, bottom, 0, right, top, 0, left, top, 0];
  data.indices = [0, 1, 2, 0, 2, 3];
  data.uvs = [
    bounds.left,
    1 - bounds.bottom,
    bounds.right,
    1 - bounds.bottom,
    bounds.right,
    1 - bounds.top,
    bounds.left,
    1 - bounds.top,
  ];
  data.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  return data;
}

interface AlphaMask {
  readonly width: number;
  readonly height: number;
  readonly alpha: Uint8Array;
}

function loadAlphaMask(url: string): Promise<AlphaMask | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return resolve(null);
      try {
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const alpha = new Uint8Array(canvas.width * canvas.height);
        for (let i = 0; i < alpha.length; i += 1) alpha[i] = pixels[i * 4 + 3]!;
        resolve({ width: canvas.width, height: canvas.height, alpha });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function spritePixelIsOpaque(mask: AlphaMask, u: number, v: number, cutoff: number): boolean {
  const x = Math.min(mask.width - 1, Math.max(0, Math.floor(u * mask.width)));
  // Babylon texture V grows from the source image's bottom edge.
  const y = Math.min(mask.height - 1, Math.max(0, Math.floor((1 - v) * mask.height)));
  return mask.alpha[y * mask.width + x]! >= cutoff;
}

function projectedSpriteBounds(mesh: Mesh, project: (point: Vector3) => { x: number; y: number }) {
  mesh.computeWorldMatrix(true);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
  const localBounds = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
  for (let index = 0; index < positions.length; index += 3) {
    localBounds.left = Math.min(localBounds.left, positions[index]!);
    localBounds.right = Math.max(localBounds.right, positions[index]!);
    localBounds.bottom = Math.min(localBounds.bottom, positions[index + 1]!);
    localBounds.top = Math.max(localBounds.top, positions[index + 1]!);
  }
  const world = mesh.getWorldMatrix();
  const projected = [
    [localBounds.left, localBounds.bottom],
    [localBounds.left, localBounds.top],
    [localBounds.right, localBounds.bottom],
    [localBounds.right, localBounds.top],
  ].map(([x, y]) => project(Vector3.TransformCoordinates(new Vector3(x!, y!, 0), world)));
  return {
    left: Math.min(...projected.map(({ x }) => x)),
    right: Math.max(...projected.map(({ x }) => x)),
    top: Math.min(...projected.map(({ y }) => y)),
    bottom: Math.max(...projected.map(({ y }) => y)),
  };
}

function spriteOnScreen(
  bounds: { left: number; right: number; top: number; bottom: number },
  width: number,
  height: number,
) {
  return bounds.right >= 0 && bounds.left <= width && bounds.bottom >= 0 && bounds.top <= height;
}

function pickedSiteId(hit: PickingInfo | null) {
  return (hit?.pickedMesh?.metadata as { siteId?: string } | undefined)?.siteId;
}

function pickedTerrainPoint(hit: PickingInfo | null, canvasWidth: number, unitsPerFp: number) {
  if (!hit?.pickedPoint || canvasWidth <= 0) return null;
  return {
    xFp: Math.round(hit.pickedPoint.x / unitsPerFp),
    zFp: Math.round(hit.pickedPoint.z / unitsPerFp),
  };
}

type PublicPlan = NonNullable<WorldFreeMovementV2ResponseDto['plan']>;
function spanInterpolation(p: PublicPlan, span: PublicPlan['speedSpans'][number], t: number) {
  const geometry = p.planVersion === 3 ? span.geometry : undefined;
  if (!geometry) return { from: span.from, to: span.to, along: t };
  const from = p.path[geometry.segmentIndex]!,
    to = p.path[geometry.segmentIndex + 1]!;
  const a = Number(geometry.fromT.numerator) / Number(geometry.fromT.denominator);
  const b = Number(geometry.toT.numerator) / Number(geometry.toT.denominator);
  const along = a + (b - a) * t;
  return { from, to, along };
}

function createSiteMarker(
  scene: Scene,
  site: WorldContinuousMapDto['sites'][number],
  info: WorldSurroundingsDto['map']['sites'][number],
  sceneFp: (fp: number) => number,
  heightAt: (x: number, z: number) => number,
) {
  const size = site.siteId === 'kamenny-brod' ? CITY_SPRITE_SIZE : info.kind === 'CITY' ? 1.3 : 1;
  const art = mapSiteSprite(site.siteId, info.kind);
  const mesh = new Mesh(`site:${site.siteId}`, scene);
  spriteGeometry(art, size).applyToMesh(mesh);
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const texture = new Texture(art.url, scene);
  texture.hasAlpha = true;
  const paint = new StandardMaterial(`site:${site.siteId}`, scene);
  paint.diffuseTexture = texture;
  paint.emissiveTexture = texture;
  paint.disableLighting = true;
  paint.useAlphaFromDiffuseTexture = true;
  paint.transparencyMode = Material.MATERIAL_ALPHATEST;
  paint.alphaCutOff = 0.04;
  paint.backFaceCulling = false;
  paint.specularColor = Color3.Black();
  mesh.material = paint;
  mesh.renderingGroupId = 1;
  const x = sceneFp(site.anchorFp.xFp),
    z = sceneFp(site.anchorFp.zFp);
  mesh.position.set(x, heightAt(x, z) + 0.025, z);
  mesh.isPickable = true;
  mesh.metadata = { siteId: site.siteId };
  return { mesh, art, contactRadius: site.siteId === 'kamenny-brod' ? 0.55 : 0.25 };
}

function mountMapSites(
  scene: Scene,
  region: WorldContinuousMapDto,
  sites: WorldSurroundingsDto['map']['sites'],
  sceneFp: (fp: number) => number,
  heightAt: (x: number, z: number) => number,
  contacts: ReturnType<typeof createMapShadows>,
) {
  const markers = new Map<string, Mesh>();
  const spriteAlphaMasks = new Map<string, AlphaMask>();
  const alphaMaskLoads = new Map<string, Promise<AlphaMask | null>>();
  for (const site of region.sites) {
    const info = sites.find((entry) => entry.siteId === site.siteId);
    if (!info) continue;
    const { mesh, art, contactRadius } = createSiteMarker(scene, site, info, sceneFp, heightAt);
    markers.set(site.siteId, mesh);
    contacts.add(mesh.position.x, mesh.position.z, contactRadius, 0.12);
    let alphaLoad = alphaMaskLoads.get(art.url);
    if (!alphaLoad) {
      alphaLoad = loadAlphaMask(art.url);
      alphaMaskLoads.set(art.url, alphaLoad);
    }
    void alphaLoad.then((mask) => {
      if (mask) spriteAlphaMasks.set(site.siteId, mask);
    });
  }
  return { markers, spriteAlphaMasks };
}

export function mountContinuousMapScene(
  canvas: HTMLCanvasElement,
  region: WorldContinuousMapDto,
  sites: WorldSurroundingsDto['map']['sites'],
  callbacks: {
    onMove: (action: WorldFreeMovementV2RequestDto['action']) => void;
    onSelectSite: (id: string) => void;
    onLabels: (labels: readonly MapLabelPosition[]) => void;
    onParty: (point: { x: number; y: number; spriteHeight: number } | null) => void;
    onRoute: (frame: RouteOverlayFrame | null) => void;
  },
) {
  const engine = acquireCanvasEngine(canvas),
    scene = new Scene(engine);
  // Projected prop footings can extend below their gate/root pivot.
  // Draw all props against each other after terrain, without clipping their painted foreground.
  scene.setRenderingAutoClearDepthStencil(1, true);
  // One forward/inverse transform owns all displayed distances and movement speed.
  const unitsPerFp = (region.worldScale ?? 1) / 1024;
  const sceneFp = (fp: number) => fp * unitsPerFp;
  const microScene = (fp: string) => sceneFp(Number(fp) / 65536);
  const light = new HemisphericLight('continuous-sky', new Vector3(-0.5, 1, -0.6), scene);
  const surface = createMapSurface(scene, region);
  const { ground, heightAt } = surface;
  const material = createTerrainMaterial(scene, region);
  ground.material = material;
  const meadowMaterial = createMapLife(scene, region, heightAt);
  const roadMaterials = {
    trail: createRoadMaterial(scene, 'trail'),
    dirt_road: createRoadMaterial(scene, 'dirt_road'),
    paved_road: createRoadMaterial(scene, 'paved_road'),
  };
  const shoulderMaterials = {
    trail: createRoadMaterial(scene, 'trail', true),
    dirt_road: createRoadMaterial(scene, 'dirt_road', true),
    paved_road: createRoadMaterial(scene, 'paved_road', true),
  };
  createMapRoads(scene, region, roadMaterials, shoulderMaterials, heightAt);
  const sprite = (
    name: string,
    url: string,
    size: number,
    { foot = 1, aspect = 1, rootX = 0.5 } = {},
  ) => {
    const width = size * aspect;
    const mesh = MeshBuilder.CreatePlane(name, { width, height: size }, scene);
    // Source art already includes projection. Rotate the whole plane toward the camera,
    // with its bottom pivot at the terrain contact instead of squashing it a second time.
    mesh.bakeTransformIntoVertices(
      Matrix.Translation(width * (0.5 - rootX), size * (foot - 0.5), 0),
    );
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const m = new StandardMaterial(name, scene),
      texture = new Texture(url, scene);
    texture.hasAlpha = true;
    m.diffuseTexture = texture;
    m.useAlphaFromDiffuseTexture = true;
    m.backFaceCulling = false;
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(0.3, 0.3, 0.3);
    mesh.material = m;
    mesh.isPickable = false;
    return mesh;
  };
  const contacts = createMapShadows(scene, heightAt);
  const { markers, spriteAlphaMasks } = mountMapSites(
    scene,
    region,
    sites,
    sceneFp,
    heightAt,
    contacts,
  );
  const trees = generateForest(region, TREE_FORMS);
  const componentTrees = createComponentTreeBatch(scene, MAP_TREE_PARTS, trees, sceneFp, heightAt);
  for (const shadow of componentTrees.shadows)
    contacts.add(shadow.x, shadow.z, shadow.width / 2, shadow.opacity);
  contacts.finish();
  const partySize = 0.48;
  const partyArt = MAP_ART.partyGroup;
  const banner = sprite('company-banner', partyArt.url, partySize, {
    foot: partyArt.groundPivot.y,
    rootX: partyArt.groundPivot.x,
  });
  const partyRing = MeshBuilder.CreateTorus(
    'party-ground-ring',
    { diameter: 0.24, thickness: 0.012, tessellation: 24 },
    scene,
  );
  partyRing.scaling.y = 0.1;
  partyRing.isPickable = false;
  partyRing.renderingGroupId = 2;
  const ringMaterial = new StandardMaterial('party-ground-ring', scene);
  ringMaterial.emissiveColor = new Color3(0.98, 0.86, 0.48);
  ringMaterial.disableLighting = true;
  partyRing.material = ringMaterial;
  (banner.material as StandardMaterial).emissiveColor = new Color3(0.65, 0.6, 0.5);
  banner.renderingGroupId = 2;
  const opaqueSiteHit = (hit: PickingInfo) => {
    const siteId = pickedSiteId(hit);
    if (typeof siteId !== 'string') return true;
    const mask = spriteAlphaMasks.get(siteId);
    if (!mask) return true;
    const uv = hit.getTextureCoordinates();
    const cutoff = Math.ceil((hit.pickedMesh!.material as StandardMaterial).alphaCutOff * 255);
    // Keep an unready sprite hit so it cannot silently turn into a terrain order.
    return !!uv && spritePixelIsOpaque(mask, uv.x, uv.y, cutoff);
  };
  const pickMapTarget = (x: number, y: number) => {
    // Props render after terrain, so an opaque foreground footing wins over ground depth.
    const hits = scene.multiPick(x, y, (mesh) => mesh.isPickable && mesh !== ground) ?? [];
    hits.sort((left, right) => left.distance - right.distance);
    return hits.find(opaqueSiteHit) ?? scene.pick(x, y, (mesh) => mesh === ground);
  };
  let view: WorldFreeMovementV2ResponseDto | null = null,
    clock = { serverMs: 0, receivedAt: 0 };
  let routeSpans: Vector3[][] = [];
  const groundPoint = (x: number, z: number) => new Vector3(x, heightAt(x, z) + 0.018, z);
  const drapedSegment = surface.drape;
  const camera = mountThreeQuarterCamera(scene, engine, canvas, {
    pick: pickMapTarget,
    elevation: Math.atan(Math.sqrt(0.5)),
    azimuth: Math.PI / 4,
    pickGround: (x, y) => scene.pick(x, y, (m) => m === ground)?.pickedPoint ?? null,
    minZoom: 2,
    maxZoom: 28,
    panButtons: [0, 1],
    wheelTarget: canvas.parentElement ?? canvas,
    onPick(hit) {
      const id = pickedSiteId(hit);
      if (typeof id === 'string' && spriteAlphaMasks.has(id)) callbacks.onSelectSite(id);
    },
    onSecondaryPick(hit) {
      const id = pickedSiteId(hit);
      if (typeof id === 'string') {
        if (!spriteAlphaMasks.has(id)) return;
        callbacks.onMove({
          kind: 'MOVE_TO',
          mapEdition: region.mapEdition,
          target: { kind: 'SITE', siteId: id },
        });
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const groundHit = scene.pick(scene.pointerX, scene.pointerY, (m) => m === ground);
      const point = pickedTerrainPoint(groundHit, rect.width, unitsPerFp);
      if (!point) return;
      canvas.focus();
      callbacks.onMove({
        kind: 'MOVE_TO',
        mapEdition: region.mapEdition,
        target: { kind: 'TERRAIN', ...point },
      });
    },
    onStop() {
      callbacks.onMove({ kind: 'STOP' });
    },
  });
  let cameraCentered = false;
  const centerCamera = (point: WorldFreeMovementV2ResponseDto['point']) => {
    const x = microScene(point.xMicroFp),
      z = microScene(point.zMicroFp);
    camera.fit({ minX: x - 5.0, maxX: x + 5.0, minZ: z - 5.0, maxZ: z + 5.0 }, 0.8);
  };
  const onContext = (event: MouseEvent) => event.preventDefault();
  canvas.addEventListener('contextmenu', onContext);
  const cancel = () => {
    canvas.blur();
  };
  canvas.addEventListener('pointercancel', cancel);
  const position = (now: number) => {
    if (!view) return null;
    if (!view.plan) return { point: view.point, spanIndex: -1 };
    const p = view.plan,
      elapsed = Math.max(0, (now - Number(p.startedAtMs)) * 1000);
    const spanIndex = p.speedSpans.findIndex((s) => elapsed < Number(s.endOffsetUs));
    const span = p.speedSpans[spanIndex];
    if (!span) return { point: p.goal, spanIndex: p.speedSpans.length };
    const t = Math.min(
      1,
      Math.max(
        0,
        (elapsed - Number(span.startOffsetUs)) /
          (Number(span.endOffsetUs) - Number(span.startOffsetUs)),
      ),
    );
    const { from, to, along } = spanInterpolation(p, span, t);
    return {
      spanIndex,
      point: {
        xMicroFp: String(
          Number(from.xMicroFp) + (Number(to.xMicroFp) - Number(from.xMicroFp)) * along,
        ),
        zMicroFp: String(
          Number(from.zMicroFp) + (Number(to.zMicroFp) - Number(from.zMicroFp)) * along,
        ),
      },
    };
  };
  const render = () => {
    const visualTime = performance.now() / 1000;
    material.setFloat('time', visualTime);
    meadowMaterial.setFloat('time', visualTime);
    const progress = position(clock.serverMs + performance.now() - clock.receivedAt);
    const p = progress?.point;
    banner.setEnabled(!!p);
    partyRing.setEnabled(!!p);
    if (p) {
      const foot = groundPoint(microScene(p.xMicroFp), microScene(p.zMicroFp));
      banner.position.copyFrom(foot);
      partyRing.position.copyFrom(foot);
    }
    const plan = view?.plan;
    const spanIndex = progress?.spanIndex ?? -1;
    const hasRemaining = !!plan && spanIndex >= 0 && spanIndex < plan.speedSpans.length;
    scene.render();
    const transform = scene.getTransformMatrix(),
      viewport = scene.activeCamera!.viewport.toGlobal(
        engine.getRenderWidth(),
        engine.getRenderHeight(),
      );
    const project = (point: Vector3) => {
      const screen = Vector3.Project(point, Matrix.Identity(), transform, viewport);
      return {
        x: (screen.x * canvas.clientWidth) / engine.getRenderWidth(),
        y: (screen.y * canvas.clientHeight) / engine.getRenderHeight(),
      };
    };
    // Billboard bounds can retain the pre-camera orientation. Project the authored
    // visible top through its actual rendered transform instead of those bounds.
    const partyFoot = project(banner.position);
    const partyTop = project(
      Vector3.TransformCoordinates(
        new Vector3(0, partySize * partyArt.visibleHeight, 0),
        banner.getWorldMatrix(),
      ),
    );
    const bannerHeight = partyFoot.y - partyTop.y;
    callbacks.onParty(
      p && bannerHeight < 24
        ? {
            ...partyFoot,
            spriteHeight: bannerHeight,
          }
        : null,
    );
    callbacks.onLabels(
      [...markers].map(([siteId, mesh]) => {
        const project = (world: Vector3) => {
          const point = Vector3.Project(world, Matrix.Identity(), transform, viewport);
          return {
            x: (point.x * canvas.clientWidth) / engine.getRenderWidth(),
            y: (point.y * canvas.clientHeight) / engine.getRenderHeight(),
          };
        };
        const point = Vector3.Project(
          groundPoint(mesh.position.x, mesh.position.z),
          Matrix.Identity(),
          transform,
          viewport,
        );
        const anchor = {
          x: (point.x * canvas.clientWidth) / engine.getRenderWidth(),
          y: (point.y * canvas.clientHeight) / engine.getRenderHeight(),
        };
        const spriteBounds = projectedSpriteBounds(mesh, project);
        const visible = spriteOnScreen(spriteBounds, canvas.clientWidth, canvas.clientHeight);
        if (siteId === 'kamenny-brod' || spriteBounds.bottom + 36 > canvas.clientHeight) {
          return {
            siteId,
            x: spriteBounds.right + 8,
            y: spriteBounds.top + 8,
            alternateX: spriteBounds.left - 8,
            visible,
            align: 'start' as const,
          };
        }
        return {
          siteId,
          x: anchor.x,
          y: spriteBounds.bottom + 8,
          visible,
          align: 'center' as const,
        };
      }),
    );
    if (hasRemaining && p) {
      const foot = groundPoint(banner.position.x, banner.position.z);
      const span = routeSpans[spanIndex]!;
      const traversed = [
        ...routeSpans.slice(0, spanIndex).flat(),
        ...drapedSegment(span[0]!, foot),
      ].map(project);
      const remaining = [
        ...drapedSegment(foot, span[span.length - 1]!),
        ...routeSpans.slice(spanIndex + 1).flat(),
      ].map(project);
      const bounds = (mesh: Mesh) => {
        const corners = mesh
          .getBoundingInfo()
          .boundingBox.vectors.map((corner) =>
            project(Vector3.TransformCoordinates(corner, mesh.getWorldMatrix())),
          );
        const x = Math.min(...corners.map((v) => v.x));
        const y = Math.min(...corners.map((v) => v.y));
        return {
          x,
          y,
          width: Math.max(...corners.map((v) => v.x)) - x,
          height: Math.max(...corners.map((v) => v.y)) - y,
        };
      };
      const goalSite = region.sites.find(
        (site) =>
          String(site.anchorFp.xFp * 65536) === plan.goal.xMicroFp &&
          String(site.anchorFp.zFp * 65536) === plan.goal.zMicroFp,
      );
      callbacks.onRoute({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        traversed,
        remaining,
        partyBounds: bounds(banner),
        goal: remaining[remaining.length - 1]!,
        goalSiteId: goalSite?.siteId,
      });
    } else callbacks.onRoute(null);
  };
  engine.runRenderLoop(render);
  return {
    update(
      current: WorldFreeMovementV2ResponseDto | null,
      nextClock: { serverMs: number; receivedAt: number },
      night: boolean,
    ) {
      const changed = current?.plan?.planId !== view?.plan?.planId;
      if (!cameraCentered && current) {
        centerCamera(current.point);
        cameraCentered = true;
      }
      view = current;
      clock = nextClock;
      material.setColor3(
        'lighting',
        night ? new Color3(0.76, 0.81, 0.91) : new Color3(1.04, 1.02, 0.98),
      );
      for (const roadMaterial of [
        ...Object.values(roadMaterials),
        ...Object.values(shoulderMaterials),
      ])
        roadMaterial.setColor3(
          'lighting',
          night ? new Color3(0.76, 0.81, 0.91) : new Color3(1.04, 1.02, 0.98),
        );
      meadowMaterial.setColor3(
        'lighting',
        night ? new Color3(0.68, 0.74, 0.84) : new Color3(1.04, 1.02, 0.98),
      );
      componentTrees.setNight(night);
      for (const mesh of markers.values())
        (mesh.material as StandardMaterial).emissiveColor.copyFrom(
          night ? new Color3(0.58, 0.64, 0.74) : new Color3(1, 1, 0.94),
        );
      light.intensity = night ? 0.62 : 1.15;
      light.diffuse = night ? new Color3(0.74, 0.8, 0.96) : new Color3(1, 0.98, 0.92);
      const edgeMist = night ? new Color3(0.13, 0.15, 0.18) : new Color3(0.2, 0.22, 0.21);
      material.setColor3('edgeMist', edgeMist);
      scene.clearColor = new Color4(edgeMist.r, edgeMist.g, edgeMist.b, 1);
      if (changed) {
        routeSpans =
          current?.plan?.speedSpans.map((span) =>
            drapedSegment(
              groundPoint(microScene(span.from.xMicroFp), microScene(span.from.zMicroFp)),
              groundPoint(microScene(span.to.xMicroFp), microScene(span.to.zMicroFp)),
            ),
          ) ?? [];
      }
    },
    destroy() {
      engine.stopRenderLoop(render);
      callbacks.onRoute(null);
      camera.dispose();
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('pointercancel', cancel);
      scene.dispose();
      releaseCanvasEngine(canvas);
    },
  };
}

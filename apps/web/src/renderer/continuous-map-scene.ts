import {
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
} from '@babylonjs/core';
import type {
  WorldContinuousMapDto,
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldSurroundingsDto,
} from '@warwrit/protocol';
import { acquireCanvasEngine, releaseCanvasEngine } from './canvas-engine.js';
import { mountThreeQuarterCamera } from './three-quarter-camera.js';
import { MAP_ART, siteSprite } from './art.js';
import { createTerrainMaterial, createRoadMaterial } from './terrain-material.js';
import { insidePolygon, nearPolygon } from './map-geography.js';
import { createMapLife } from './map-life.js';
import type { MapLabelPosition } from './map-scene.js';
import type { RouteOverlayFrame } from './route-overlay.js';

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

export function mountContinuousMapScene(
  canvas: HTMLCanvasElement,
  region: WorldContinuousMapDto,
  sites: WorldSurroundingsDto['map']['sites'],
  callbacks: {
    onMove: (action: WorldFreeMovementV2RequestDto['action']) => void;
    onSelectSite: (id: string) => void;
    onLabels: (labels: readonly MapLabelPosition[]) => void;
    onParty: (point: { x: number; y: number } | null) => void;
    onRoute: (frame: RouteOverlayFrame | null) => void;
  },
) {
  const engine = acquireCanvasEngine(canvas),
    scene = new Scene(engine);
  // One forward/inverse transform owns all displayed distances and movement speed.
  const unitsPerFp = (region.worldScale ?? 1) / 1024;
  const sceneFp = (fp: number) => fp * unitsPerFp;
  const microScene = (fp: string) => sceneFp(Number(fp) / 65536);
  const light = new HemisphericLight('continuous-sky', new Vector3(0.2, 1, -0.3), scene);
  const width = sceneFp(region.columns * region.cellSizeFp),
    height = sceneFp(region.rows * region.cellSizeFp);
  const ground = MeshBuilder.CreateGround('continuous-ground', { width, height }, scene);
  ground.position.set(
    sceneFp(region.origin.xFp) + width / 2,
    0,
    sceneFp(region.origin.zFp) + height / 2,
  );
  const material = createTerrainMaterial(scene, region);
  ground.material = material;
  const meadowMaterial = createMapLife(scene, region);
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
  // Slow surfaces first, bridge/fast winning core last. Opaque cores write depth.
  const orderedRoads = region.overlayShapes.toSorted(
    (a, b) =>
      (region.navigationOverlayOrder?.indexOf(b.overlayId) ?? 0) -
      (region.navigationOverlayOrder?.indexOf(a.overlayId) ?? 0),
  );
  for (const [roadIndex, corridor] of orderedRoads.entries()) {
    const points = corridor.polygon;
    if (points.length < 4 || points.length % 2 !== 0) continue;
    const road = new Mesh(`corridor:${corridor.shapeId}`, scene);
    const vertices = new VertexData();
    const positions: number[] = [],
      normals: number[] = [],
      uvs: number[] = [],
      widths: number[] = [],
      indices: number[] = [];
    const stations = points.length / 2;
    // Canonical banks remain the outside vertices. Only decorative Y is crowned;
    // picking, speed and the ground-projected route still use the shared x/z.
    const crossSection = [0, 0.22, 0.5, 0.78, 1];
    const stationDistances: number[] = [];
    let distance = 0;
    let acrossAngle: number | undefined;
    let previous: { x: number; z: number } | undefined;
    for (let i = 0; i < stations; i += 1) {
      const left = points[i]!,
        right = points[points.length - 1 - i]!;
      const station = corridor.stations?.[i];
      const center = {
        x: station?.xFp ?? (left.xFp + right.xFp) / 2,
        z: station?.zFp ?? (left.zFp + right.zFp) / 2,
      };
      if (previous) distance += sceneFp(Math.hypot(center.x - previous.x, center.z - previous.z));
      previous = center;
      stationDistances.push(distance);
      const width = sceneFp(Math.hypot(right.xFp - left.xFp, right.zFp - left.zFp));
      let angle = Math.atan2(right.zFp - left.zFp, right.xFp - left.xFp);
      if (acrossAngle !== undefined)
        angle += Math.round((acrossAngle - angle) / (2 * Math.PI)) * 2 * Math.PI;
      acrossAngle = angle;
      for (const across of crossSection) {
        const crown = 0.004 * Math.sin(across * Math.PI);
        positions.push(
          sceneFp(left.xFp + (right.xFp - left.xFp) * across),
          0.004 + roadIndex * 0.0002 + crown,
          sceneFp(left.zFp + (right.zFp - left.zFp) * across),
        );
        uvs.push(across, distance);
        widths.push(width, angle);
      }
      if (i > 0) {
        for (let across = 0; across < crossSection.length - 1; across++) {
          const j = i * crossSection.length + across;
          const p = j - crossSection.length;
          indices.push(p, p + 1, j, p + 1, j + 1, j);
        }
      }
    }
    VertexData.ComputeNormals(positions, indices, normals);
    vertices.positions = positions;
    vertices.normals = normals;
    vertices.indices = indices;
    vertices.uvs = uvs;
    vertices.uvs2 = widths;
    vertices.applyToMesh(road);
    road.material =
      corridor.overlayId === 'paved_road'
        ? roadMaterials.paved_road
        : corridor.overlayId === 'trail'
          ? roadMaterials.trail
          : roadMaterials.dirt_road;
    road.isPickable = false;
    const type =
      corridor.overlayId === 'paved_road'
        ? 'paved_road'
        : corridor.overlayId === 'trail'
          ? 'trail'
          : 'dirt_road';
    for (const side of [0, 1]) {
      const skirt = new Mesh(`shoulder:${corridor.shapeId}:${side}`, scene);
      const data = new VertexData(),
        positions: number[] = [],
        normals: number[] = [],
        uvs: number[] = [],
        widths: number[] = [],
        indices: number[] = [];
      for (let i = 0; i < stations; i++) {
        const left = points[i]!,
          right = points[points.length - 1 - i]!;
        const inner = side === 0 ? left : right,
          opposite = side === 0 ? right : left;
        const length = Math.hypot(inner.xFp - opposite.xFp, inner.zFp - opposite.zFp);
        const outer = {
          xFp: inner.xFp + ((inner.xFp - opposite.xFp) / length) * 8,
          zFp: inner.zFp + ((inner.zFp - opposite.zFp) / length) * 8,
        };
        positions.push(
          sceneFp(inner.xFp),
          0.004,
          sceneFp(inner.zFp),
          sceneFp(outer.xFp),
          0.004,
          sceneFp(outer.zFp),
        );
        normals.push(0, 1, 0, 0, 1, 0);
        const distance = stationDistances[i]!;
        uvs.push(0, distance, 1, distance);
        widths.push(sceneFp(8), 0, sceneFp(8), 0);
        if (i > 0) {
          const j = i * 2;
          indices.push(j - 2, j, j - 1, j - 1, j, j + 1);
        }
      }
      data.positions = positions;
      data.normals = normals;
      data.uvs = uvs;
      data.uvs2 = widths;
      data.indices = indices;
      data.applyToMesh(skirt);
      skirt.material = shoulderMaterials[type];
      skirt.isPickable = false;
      skirt.alphaIndex = roadIndex;
    }
  }
  const sprite = (name: string, url: string, size: number) => {
    const mesh = MeshBuilder.CreatePlane(name, { size }, scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
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
  const markers = new Map<string, Mesh>();
  for (const site of region.sites) {
    const info = sites.find((s) => s.siteId === site.siteId);
    if (!info) continue;
    const mesh = sprite(
      `site:${site.siteId}`,
      siteSprite(site.siteId, info.kind),
      info.kind === 'CITY' ? 1.3 : 1,
    );
    mesh.position.set(sceneFp(site.anchorFp.xFp), 0.45, sceneFp(site.anchorFp.zFp));
    mesh.isPickable = true;
    mesh.metadata = { siteId: site.siteId };
    markers.set(site.siteId, mesh);
  }
  const treeSources = [
    sprite('deciduous-tree', MAP_ART.trees.deciduous, 1),
    sprite('conifer-tree', MAP_ART.trees.conifer, 1),
  ];
  for (const source of treeSources) {
    source.isVisible = false;
    const treeMaterial = source.material as StandardMaterial;
    treeMaterial.transparencyMode = Material.MATERIAL_ALPHATEST;
    treeMaterial.alphaCutOff = 0.15;
    treeMaterial.emissiveColor = new Color3(0.15, 0.15, 0.15);
  }
  const foliage: {
    mesh: ReturnType<Mesh['createInstance']>;
    x: number;
    halfHeight: number;
    phase: number;
  }[] = [];
  // Deterministic scattered woodland clusters; geography excludes roads, cliffs and sites.
  for (let row = 0; row < region.rows; row += 3) {
    for (let column = 0; column < region.columns; column += 3) {
      const seed = ((column * 73856093) ^ (row * 19349663)) >>> 0;
      const x = region.origin.xFp + (column + 0.4 + (seed % 127) / 127) * region.cellSizeFp;
      const z = region.origin.zFp + (row + 0.4 + ((seed >>> 8) % 127) / 127) * region.cellSizeFp;
      const terrain = region.terrainShapes
        .filter((shape) => insidePolygon(x, z, shape.polygon))
        .sort((a, b) => b.paintPriority - a.paintPriority)[0];
      const wooded = terrain?.terrainId === 'forest';
      if (
        (!wooded && (terrain?.terrainId !== 'grassland' || seed % 31 !== 0)) ||
        (wooded && seed % 5 === 0) ||
        region.sites.some(
          (site) => Math.hypot(site.anchorFp.xFp - x, site.anchorFp.zFp - z) < 260,
        ) ||
        region.blockingShapes.some((shape) => insidePolygon(x, z, shape.polygon)) ||
        region.overlayShapes.some((shape) => nearPolygon(x, z, shape.polygon, 110))
      )
        continue;
      const type = wooded && (terrain.shapeId === 'eastern-pinewood' || seed % 4 === 0) ? 1 : 0;
      const tree = treeSources[type]!.createInstance(`tree:${column}:${row}`);
      const size = 0.42 + ((seed >>> 16) % 100) / 240;
      tree.scaling.set(size * (seed % 2 ? 1 : -1), size, size);
      tree.position.set(sceneFp(x), size * 0.5, sceneFp(z));
      tree.isPickable = false;
      foliage.push({ mesh: tree, x: tree.position.x, halfHeight: size * 0.5, phase: seed % 97 });
    }
  }
  const banner = sprite('company-banner', MAP_ART.party, 0.72);
  const partyRing = MeshBuilder.CreateTorus(
    'party-ground-ring',
    { diameter: 0.27, thickness: 0.035, tessellation: 24 },
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
  let view: WorldFreeMovementV2ResponseDto | null = null,
    clock = { serverMs: 0, receivedAt: 0 };
  let routePoints: Vector3[] = [];
  const camera = mountThreeQuarterCamera(scene, engine, canvas, {
    minZoom: 2,
    maxZoom: 28,
    panButtons: [0, 1],
    wheelTarget: canvas.parentElement ?? canvas,
    onPick(hit) {
      const id = hit?.pickedMesh?.metadata?.siteId;
      if (typeof id === 'string') callbacks.onSelectSite(id);
    },
    onSecondaryPick(hit) {
      const id = hit?.pickedMesh?.metadata?.siteId;
      if (typeof id === 'string') {
        callbacks.onMove({
          kind: 'MOVE_TO',
          mapEdition: region.mapEdition,
          target: { kind: 'SITE', siteId: id },
        });
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const groundHit = scene.pick(scene.pointerX, scene.pointerY, (m) => m === ground);
      if (!groundHit?.pickedPoint || rect.width <= 0) return;
      const p = groundHit.pickedPoint;
      const point = { xFp: Math.round(p.x / unitsPerFp), zFp: Math.round(p.z / unitsPerFp) };
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
    for (const tree of foliage) {
      const sway = 0.012 * Math.sin(visualTime * 0.85 + tree.x * 0.4 + tree.phase);
      tree.mesh.rotation.z = sway;
      // Compensate rotation around the sprite center so the trunk stays planted.
      tree.mesh.position.x = tree.x - Math.sin(sway) * tree.halfHeight;
      tree.mesh.position.y = Math.cos(sway) * tree.halfHeight;
    }
    const progress = position(clock.serverMs + performance.now() - clock.receivedAt);
    const p = progress?.point;
    banner.setEnabled(!!p);
    partyRing.setEnabled(!!p);
    if (p) {
      banner.position.set(microScene(p.xMicroFp), 0.34, microScene(p.zMicroFp));
      partyRing.position.set(microScene(p.xMicroFp), 0.015, microScene(p.zMicroFp));
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
    const bannerCorners = banner.getBoundingInfo().boundingBox.vectorsWorld.map(project);
    const bannerHeight =
      Math.max(...bannerCorners.map((v) => v.y)) - Math.min(...bannerCorners.map((v) => v.y));
    callbacks.onParty(
      p && bannerHeight < 24 ? project(new Vector3(banner.position.x, 0, banner.position.z)) : null,
    );
    callbacks.onLabels(
      [...markers].map(([siteId, mesh]) => {
        const point = project(new Vector3(mesh.position.x, 0.08, mesh.position.z));
        return { siteId, x: point.x, y: point.y + 12 };
      }),
    );
    if (hasRemaining && p) {
      const points = routePoints.map(project);
      const split = project(new Vector3(banner.position.x, 0, banner.position.z));
      const bounds = (mesh: Mesh) => {
        const corners = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(project);
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
        traversed: [...points.slice(0, spanIndex + 1), split],
        remaining: [split, ...points.slice(spanIndex + 1)],
        sprites: [banner, ...markers.values()].map(bounds),
        ring: bounds(partyRing),
        goal: points[points.length - 1]!,
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
      light.intensity = night ? 0.62 : 1.15;
      light.diffuse = night ? new Color3(0.74, 0.8, 0.96) : new Color3(1, 0.98, 0.92);
      scene.clearColor = night ? new Color4(0.06, 0.07, 0.09, 1) : new Color4(0.13, 0.13, 0.1, 1);
      if (changed) {
        routePoints = current?.plan
          ? [
              current.plan.speedSpans[0]!.from,
              ...current.plan.speedSpans.map((span) => span.to),
            ].map((p) => new Vector3(microScene(p.xMicroFp), 0, microScene(p.zMicroFp)))
          : [];
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

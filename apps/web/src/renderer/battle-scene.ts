import {
  Camera,
  Color3,
  Color4,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

import { acquireCanvasEngine, releaseCanvasEngine } from './canvas-engine.js';
import { BATTLE_ART, unitSprite, type UnitRole } from './art.js';
import {
  diffRenderUnits,
  type EncounterRenderProjection,
  type EncounterRenderUnit,
} from './projection.js';

export interface EncounterHighlights {
  /** Units of the viewer's own company; their side is drawn as ours, other sides as hostile. */
  readonly ownUnitIds: readonly string[];
  readonly selectedUnitId: string | null;
  readonly targetUnitId: string | null;
  readonly destination: { readonly q: number; readonly r: number } | null;
}

export interface EncounterScene {
  update(projection: EncounterRenderProjection, highlights: EncounterHighlights): void;
  destroy(): void;
}

export interface EncounterSceneCallbacks {
  readonly onPickUnit: (unitId: string) => void;
  readonly onPickHex: (hex: { readonly q: number; readonly r: number }) => void;
}

interface RenderedUnit {
  readonly root: TransformNode;
  readonly sprite: Mesh;
  readonly ring: Mesh;
  readonly ringMaterial: StandardMaterial;
  readonly bar: TransformNode;
  readonly healthFill: Mesh;
  /** Highest health seen; the public projection carries no maximum. */
  peakHealth: number;
  unit: EncounterRenderUnit;
}

const SQRT3 = Math.sqrt(3);
/** Fixed three-quarter view (owner decision 2026-10-02): elevation above the ground plane. */
const CAMERA_ELEVATION = (50 * Math.PI) / 180;
const SPRITE_SIZE = 1.45;
const HEX_RADIUS = 1 / SQRT3;
const MIN_ZOOM = 1.5;
const MAX_ZOOM = 10;

const RING_COLORS: Readonly<Record<UnitRole | 'selected' | 'target', Color3>> = {
  ours: new Color3(0.78, 0.62, 0.32),
  ally: new Color3(0.42, 0.58, 0.52),
  hostile: new Color3(0.6, 0.2, 0.16),
  selected: new Color3(1, 0.86, 0.52),
  target: new Color3(1, 0.34, 0.22),
};

export function hexToWorld(q: number, r: number): { readonly x: number; readonly z: number } {
  return { x: q + r * 0.5, z: (r * SQRT3) / 2 };
}

/** Nearest axial hex for a ground point: the inverse of `hexToWorld` with cube rounding. */
export function worldToHex(x: number, z: number): { readonly q: number; readonly r: number } {
  const r = (2 * z) / SQRT3;
  const q = x - r * 0.5;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 };
}

function hexOutline(cx: number, cz: number): Vector3[] {
  return Array.from({ length: 7 }, (_, corner) => {
    const angle = (Math.PI / 3) * corner + Math.PI / 6;
    return new Vector3(cx + HEX_RADIUS * Math.cos(angle), 0.01, cz + HEX_RADIUS * Math.sin(angle));
  });
}

function hexDisc(name: string, scale: number, scene: Scene): Mesh {
  const disc = MeshBuilder.CreateDisc(name, { radius: HEX_RADIUS * scale, tessellation: 6 }, scene);
  disc.rotation.x = Math.PI / 2;
  disc.rotation.y = Math.PI / 6;
  disc.isPickable = false;
  return disc;
}

/**
 * Babylon.js tactical view of the approved public encounter facts: ink sprites on a hex
 * field under a fixed three-quarter orthographic camera with pan and zoom, no rotation.
 */
export async function mountEncounterScene(
  canvas: HTMLCanvasElement,
  initialProjection: EncounterRenderProjection,
  initialHighlights: EncounterHighlights,
  callbacks: EncounterSceneCallbacks,
  signal?: AbortSignal,
): Promise<EncounterScene> {
  const engine = acquireCanvasEngine(canvas);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.07, 0.065, 0.06, 1);
  const light = new HemisphericLight('soft-sky', new Vector3(0.2, 1, -0.3), scene);
  light.intensity = 1.05;
  light.groundColor = new Color3(0.45, 0.42, 0.38);

  const camera = new FreeCamera('three-quarter', Vector3.Zero(), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  const view = { centerX: 0, centerZ: 0, zoom: 4 };
  const placeCamera = () => {
    const distance = 40;
    camera.position = new Vector3(
      view.centerX,
      Math.sin(CAMERA_ELEVATION) * distance,
      view.centerZ - Math.cos(CAMERA_ELEVATION) * distance,
    );
    camera.setTarget(new Vector3(view.centerX, 0, view.centerZ));
    const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);
    camera.orthoTop = view.zoom;
    camera.orthoBottom = -view.zoom;
    camera.orthoLeft = -view.zoom * aspect;
    camera.orthoRight = view.zoom * aspect;
  };
  scene.activeCamera = camera;

  const textures = new Map<string, Texture>();
  const texture = (url: string) => {
    let value = textures.get(url);
    if (!value) {
      value = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
      textures.set(url, value);
    }
    return value;
  };
  const spriteMaterials = new Map<string, StandardMaterial>();
  const spriteMaterial = (url: string, fallen = false) => {
    const key = `${url}|${fallen}`;
    let value = spriteMaterials.get(key);
    if (!value) {
      value = new StandardMaterial(`sprite:${key}`, scene);
      const image = texture(url);
      image.hasAlpha = true;
      value.diffuseTexture = image;
      value.useAlphaFromDiffuseTexture = true;
      value.backFaceCulling = false;
      value.specularColor = Color3.Black();
      value.emissiveColor = fallen ? new Color3(0.12, 0.11, 0.1) : new Color3(0.3, 0.28, 0.26);
      value.diffuseColor = fallen ? new Color3(0.4, 0.38, 0.37) : Color3.White();
      spriteMaterials.set(key, value);
    }
    return value;
  };

  const fieldRoot = new TransformNode('field', scene);
  const units = new Map<string, RenderedUnit>();
  let fieldKey = '';
  let highlights = initialHighlights;
  let hexSet = new Set<string>();
  let disposed = false;

  const destinationMarker = hexDisc('destination', 0.9, scene);
  const destinationMaterial = new StandardMaterial('destination', scene);
  destinationMaterial.disableLighting = true;
  destinationMaterial.emissiveColor = RING_COLORS.selected;
  destinationMaterial.alpha = 0.35;
  destinationMarker.material = destinationMaterial;
  destinationMarker.setEnabled(false);

  const buildField = (projection: EncounterRenderProjection) => {
    const key = JSON.stringify(projection.map ?? null);
    if (key === fieldKey) return;
    fieldKey = key;
    for (const child of fieldRoot.getChildMeshes()) child.dispose();
    const hexes = projection.map?.hexes ?? [];
    hexSet = new Set(hexes.map(({ q, r }) => `${q},${r}`));
    const blocked = new Set((projection.map?.blocked ?? []).map(({ q, r }) => `${q},${r}`));
    const points = [
      ...hexes.map(({ q, r }) => hexToWorld(q, r)),
      ...projection.units.map((unit) => hexToWorld(unit.q, unit.r)),
    ];
    const minX = Math.min(...points.map((p) => p.x), 0);
    const maxX = Math.max(...points.map((p) => p.x), 0);
    const minZ = Math.min(...points.map((p) => p.z), 0);
    const maxZ = Math.max(...points.map((p) => p.z), 0);
    const width = maxX - minX + 30;
    const depth = maxZ - minZ + 30;

    const ground = MeshBuilder.CreateGround('ground', { width, height: depth }, scene);
    ground.position.set((minX + maxX) / 2, -0.01, (minZ + maxZ) / 2);
    const groundMaterial = new StandardMaterial('ground', scene);
    const groundTexture = new Texture(BATTLE_ART.groundOuter, scene);
    groundTexture.uScale = width / 3;
    groundTexture.vScale = depth / 3;
    groundMaterial.diffuseTexture = groundTexture;
    groundMaterial.specularColor = Color3.Black();
    groundMaterial.diffuseColor = new Color3(0.5, 0.47, 0.43);
    ground.material = groundMaterial;
    ground.parent = fieldRoot;
    ground.metadata = { kind: 'ground' };

    const fieldMaterial = new StandardMaterial('field', scene);
    fieldMaterial.diffuseTexture = texture(BATTLE_ART.groundField);
    fieldMaterial.specularColor = Color3.Black();
    for (const { q, r } of hexes) {
      const { x, z } = hexToWorld(q, r);
      const cell = hexDisc(`hex:${q},${r}`, 0.985, scene);
      cell.position.set(x, 0, z);
      cell.material = fieldMaterial;
      cell.parent = fieldRoot;
      if (blocked.has(`${q},${r}`)) {
        const rubble = MeshBuilder.CreatePlane(`rubble:${q},${r}`, { size: 1.2 }, scene);
        rubble.billboardMode = Mesh.BILLBOARDMODE_Y;
        rubble.position.set(x, 0.45, z);
        rubble.material = spriteMaterial(BATTLE_ART.rubble);
        rubble.parent = fieldRoot;
        rubble.isPickable = false;
      }
    }
    if (hexes.length > 0) {
      const lines = MeshBuilder.CreateLineSystem(
        'hex-lines',
        {
          lines: hexes.map(({ q, r }) => {
            const { x, z } = hexToWorld(q, r);
            return hexOutline(x, z);
          }),
        },
        scene,
      );
      lines.color = new Color3(0.1, 0.08, 0.06);
      lines.alpha = 0.6;
      lines.parent = fieldRoot;
      lines.isPickable = false;
    }

    view.centerX = (minX + maxX) / 2;
    view.centerZ = (minZ + maxZ) / 2;
    // Fit the whole field: ground depth is foreshortened by the camera elevation.
    const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);
    const fitHeight = ((maxZ - minZ) * Math.sin(CAMERA_ELEVATION) + SPRITE_SIZE + 0.4) / 2;
    const fitWidth = (maxX - minX + 1) / (2 * Math.max(aspect, 0.5));
    view.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitHeight, fitWidth));
    placeCamera();
  };

  const roleOf = (unit: EncounterRenderUnit, projection: EncounterRenderProjection): UnitRole => {
    const own = new Set(highlights.ownUnitIds);
    if (own.has(unit.id)) return 'ours';
    const ownSides = new Set(
      projection.units.filter((entry) => own.has(entry.id)).map((entry) => entry.sideId),
    );
    return ownSides.has(unit.sideId) ? 'ally' : 'hostile';
  };

  /** +1 when the unit's opponents stand mostly to its right on screen. */
  const facing = (unit: EncounterRenderUnit, projection: EncounterRenderProjection) => {
    const others = projection.units.filter(
      (entry) => entry.sideId !== unit.sideId && entry.status === 'active',
    );
    if (others.length === 0) return 1;
    const meanX = others.reduce((sum, entry) => sum + entry.worldX, 0) / others.length;
    return meanX >= unit.worldX ? 1 : -1;
  };

  const placeUnit = (rendered: RenderedUnit, projection: EncounterRenderProjection) => {
    const { unit } = rendered;
    const { x, z } = hexToWorld(unit.q, unit.r);
    rendered.root.position.set(x, 0, z);
    rendered.root.setEnabled(unit.status !== 'retreated');
    const fallen = unit.status === 'dead';
    const role = roleOf(unit, projection);
    const art = unitSprite(unit.id, role);
    rendered.sprite.material = spriteMaterial(art.url, fallen);
    rendered.sprite.scaling.x = facing(unit, projection) * (art.facing === 'RIGHT' ? 1 : -1);
    if (fallen) {
      rendered.sprite.billboardMode = Mesh.BILLBOARDMODE_NONE;
      rendered.sprite.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      rendered.sprite.position.set(0, 0.03, 0);
    } else {
      rendered.sprite.billboardMode = Mesh.BILLBOARDMODE_Y;
      rendered.sprite.rotation.set(0, 0, 0);
      rendered.sprite.position.set(0, SPRITE_SIZE / 2 - 0.08, 0);
    }
    rendered.sprite.isPickable = !fallen;
    rendered.ringMaterial.emissiveColor =
      unit.id === highlights.selectedUnitId
        ? RING_COLORS.selected
        : unit.id === highlights.targetUnitId
          ? RING_COLORS.target
          : RING_COLORS[role];
    rendered.ring.setEnabled(!fallen);
    rendered.peakHealth = Math.max(rendered.peakHealth, unit.health, 1);
    const share = Math.max(0, Math.min(1, unit.health / rendered.peakHealth));
    rendered.healthFill.scaling.x = Math.max(share, 0.001);
    rendered.healthFill.position.x = -(1 - share) * 0.35;
    rendered.bar.setEnabled(!fallen);
  };

  const createUnit = (unit: EncounterRenderUnit): RenderedUnit => {
    const root = new TransformNode(`unit:${unit.id}`, scene);
    const sprite = MeshBuilder.CreatePlane(`sprite:${unit.id}`, { size: SPRITE_SIZE }, scene);
    sprite.parent = root;
    sprite.metadata = { kind: 'unit', unitId: unit.id };
    const ring = MeshBuilder.CreateTorus(
      `ring:${unit.id}`,
      { diameter: 0.8, thickness: 0.06, tessellation: 36 },
      scene,
    );
    ring.scaling.y = 0.15;
    ring.position.y = 0.02;
    ring.parent = root;
    ring.isPickable = false;
    const ringMaterial = new StandardMaterial(`ring:${unit.id}`, scene);
    ringMaterial.disableLighting = true;
    ring.material = ringMaterial;

    const bar = new TransformNode(`bar:${unit.id}`, scene);
    bar.parent = root;
    bar.position.y = SPRITE_SIZE - 0.02;
    bar.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    const back = MeshBuilder.CreatePlane(
      `bar-back:${unit.id}`,
      { width: 0.74, height: 0.09 },
      scene,
    );
    back.parent = bar;
    back.isPickable = false;
    const backMaterial = new StandardMaterial(`bar-back:${unit.id}`, scene);
    backMaterial.disableLighting = true;
    backMaterial.emissiveColor = new Color3(0.07, 0.05, 0.04);
    back.material = backMaterial;
    const healthFill = MeshBuilder.CreatePlane(
      `bar-fill:${unit.id}`,
      { width: 0.7, height: 0.06 },
      scene,
    );
    healthFill.parent = bar;
    healthFill.position.z = -0.002;
    healthFill.isPickable = false;
    const fillMaterial = new StandardMaterial(`bar-fill:${unit.id}`, scene);
    fillMaterial.disableLighting = true;
    fillMaterial.emissiveColor = new Color3(0.66, 0.2, 0.15);
    healthFill.material = fillMaterial;
    return { root, sprite, ring, ringMaterial, bar, healthFill, peakHealth: unit.health, unit };
  };

  const reconcile = (next: EncounterRenderProjection) => {
    buildField(next);
    const delta = diffRenderUnits(
      [...units.values()].map((rendered) => rendered.unit),
      next.units,
    );
    for (const id of delta.removed) {
      units.get(id)?.root.dispose(false, true);
      units.delete(id);
    }
    for (const unit of next.units) {
      const rendered = units.get(unit.id) ?? createUnit(unit);
      rendered.unit = unit;
      units.set(unit.id, rendered);
    }
    for (const rendered of units.values()) placeUnit(rendered, next);
    const destination = highlights.destination;
    destinationMarker.setEnabled(destination !== null);
    if (destination) {
      const { x, z } = hexToWorld(destination.q, destination.r);
      destinationMarker.position.set(x, 0.012, z);
    }
  };

  // Drag or WASD/arrows pan, the wheel zooms; a press without movement picks.
  let press: { x: number; y: number; centerX: number; centerZ: number; moved: boolean } | null =
    null;
  const pick = () => {
    const hit = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.isPickable);
    const meta = hit?.pickedMesh?.metadata as { kind?: string; unitId?: string } | undefined;
    if (meta?.kind === 'unit' && meta.unitId) {
      callbacks.onPickUnit(meta.unitId);
      return;
    }
    if (hit?.pickedPoint) {
      const hex = worldToHex(hit.pickedPoint.x, hit.pickedPoint.z);
      if (hexSet.has(`${hex.q},${hex.r}`)) callbacks.onPickHex(hex);
    }
  };
  const pointerObserver = scene.onPointerObservable.add((info) => {
    const event = info.event as PointerEvent;
    if (info.type === PointerEventTypes.POINTERDOWN) {
      press = {
        x: event.clientX,
        y: event.clientY,
        centerX: view.centerX,
        centerZ: view.centerZ,
        moved: false,
      };
    } else if (info.type === PointerEventTypes.POINTERMOVE && press && event.buttons !== 0) {
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (Math.hypot(dx, dy) > 5) press.moved = true;
      if (press.moved) {
        const step = (2 * view.zoom) / Math.max(canvas.clientHeight, 1);
        view.centerX = press.centerX - dx * step;
        view.centerZ = press.centerZ + (dy * step) / Math.sin(CAMERA_ELEVATION);
        placeCamera();
      }
    } else if (info.type === PointerEventTypes.POINTERUP) {
      if (press && !press.moved) pick();
      press = null;
    } else if (info.type === PointerEventTypes.POINTERWHEEL) {
      const wheel = info.event as WheelEvent;
      view.zoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, view.zoom * (wheel.deltaY > 0 ? 1.1 : 0.9)),
      );
      placeCamera();
      wheel.preventDefault();
    }
  });
  const onKey = (event: KeyboardEvent) => {
    const step = view.zoom * 0.08;
    const moves: Readonly<Record<string, readonly [number, number]>> = {
      KeyW: [0, step],
      ArrowUp: [0, step],
      KeyS: [0, -step],
      ArrowDown: [0, -step],
      KeyA: [-step, 0],
      ArrowLeft: [-step, 0],
      KeyD: [step, 0],
      ArrowRight: [step, 0],
    };
    const move = moves[event.code];
    if (!move) return;
    event.preventDefault();
    view.centerX += move[0];
    view.centerZ += move[1];
    placeCamera();
  };
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', onKey);

  const resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    engine.resize();
    placeCamera();
  });
  resizeObserver.observe(canvas);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    resizeObserver.disconnect();
    canvas.removeEventListener('keydown', onKey);
    scene.onPointerObservable.remove(pointerObserver);
    engine.stopRenderLoop();
    scene.dispose();
    releaseCanvasEngine(canvas);
    units.clear();
    textures.clear();
    spriteMaterials.clear();
  };
  const onAbort = () => dispose();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    engine.resize();
    reconcile(initialProjection);
    placeCamera();
    engine.runRenderLoop(() => scene.render());
    await scene.whenReadyAsync();
    if (disposed || signal?.aborted)
      throw new DOMException('Encounter scene mount was aborted', 'AbortError');
    signal?.removeEventListener('abort', onAbort);
    return {
      update(projection, nextHighlights) {
        if (disposed) return;
        highlights = nextHighlights;
        reconcile(projection);
      },
      destroy() {
        signal?.removeEventListener('abort', onAbort);
        dispose();
      },
    };
  } catch (error) {
    signal?.removeEventListener('abort', onAbort);
    dispose();
    throw error;
  }
}

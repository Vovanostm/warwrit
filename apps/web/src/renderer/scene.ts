import {
  Application,
  Color,
  FOG_LINEAR,
  Entity,
  FILLMODE_NONE,
  Picker,
  PROJECTION_ORTHOGRAPHIC,
  RESOLUTION_AUTO,
  StandardMaterial,
  type MeshInstance,
} from 'playcanvas';

import {
  diffRenderUnits,
  type EncounterRenderProjection,
  type EncounterRenderUnit,
} from './projection.js';

export interface EncounterScene {
  update(
    projection: EncounterRenderProjection,
    selectableUnitIds: readonly string[],
    selectedUnitId: string | null,
  ): void;
  resize(): void;
  destroy(): void;
}

export interface EncounterSceneCallbacks {
  readonly onSelectUnit: (unitId: string | null) => void;
}

interface RenderedUnit {
  readonly root: Entity;
  readonly marker: Entity;
  readonly markerMaterial: StandardMaterial;
  readonly pickMeshes: readonly MeshInstance[];
  unit: EncounterRenderUnit;
}

const sideColors = [
  new Color(0.53, 0.29, 0.19),
  new Color(0.28, 0.39, 0.41),
  new Color(0.48, 0.43, 0.3),
  new Color(0.38, 0.34, 0.42),
];

function sideColorIndex(sideId: string, sideOrder: readonly string[]): number {
  return Math.max(0, sideOrder.indexOf(sideId)) % sideColors.length;
}

/** Mounts an engine-only tactical position view from approved public facts. */
export async function mountEncounterScene(
  canvas: HTMLCanvasElement,
  initialProjection: EncounterRenderProjection,
  selectableUnitIds: readonly string[],
  selectedUnitId: string | null,
  callbacks: EncounterSceneCallbacks,
  signal?: AbortSignal,
): Promise<EncounterScene> {
  const app = new Application(canvas, {
    graphicsDeviceOptions: { antialias: true, alpha: false },
  });
  const units = new Map<string, RenderedUnit>();
  const pads = new Map<string, Entity>();
  const mapCells = new Map<
    string,
    { readonly entity: Entity; readonly material: StandardMaterial }
  >();
  const meshOwners = new Map<MeshInstance, string>();
  const selection = new Set(selectableUnitIds);
  let currentSelection = selectedUnitId;
  let currentProjection = initialProjection;
  let picker: Picker | undefined;
  let disposed = false;
  let pickerDirty = true;
  let resizeObserver: ResizeObserver | undefined;
  let resizeHandler: (() => void) | undefined;
  let pointerMoveHandler: ((event: PointerEvent) => void) | undefined;
  let pointerLeaveHandler: (() => void) | undefined;
  let pointerDownHandler: ((event: PointerEvent) => void) | undefined;
  let pointerFrame: number | undefined;
  let pendingPointer: { readonly x: number; readonly y: number } | undefined;
  let pickGeneration = 0;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (pointerFrame !== undefined) window.cancelAnimationFrame(pointerFrame);
    picker?.destroy();
    picker = undefined;
    resizeObserver?.disconnect();
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (pointerMoveHandler) canvas.removeEventListener('pointermove', pointerMoveHandler);
    if (pointerLeaveHandler) canvas.removeEventListener('pointerleave', pointerLeaveHandler);
    if (pointerDownHandler) canvas.removeEventListener('pointerdown', pointerDownHandler);
    for (const rendered of units.values()) rendered.markerMaterial.destroy();
    for (const cell of mapCells.values()) cell.material.destroy();
    app.destroy();
    units.clear();
    pads.clear();
    mapCells.clear();
    meshOwners.clear();
  };
  const onAbort = () => dispose();
  signal?.addEventListener('abort', onAbort, { once: true });
  const ensureAlive = () => {
    if (disposed || signal?.aborted)
      throw new DOMException('Encounter scene mount was aborted', 'AbortError');
  };

  const setMarkerMaterial = (rendered: RenderedUnit, sideOrder: readonly string[]) => {
    const sideColor = sideColors[sideColorIndex(rendered.unit.sideId, sideOrder)] ?? sideColors[0]!;
    const selected = rendered.unit.id === currentSelection;
    rendered.markerMaterial.diffuse = selected ? new Color(0.73, 0.55, 0.28) : sideColor;
    rendered.markerMaterial.emissive = selected
      ? new Color(0.12, 0.075, 0.025)
      : new Color(0.018, 0.014, 0.012);
    rendered.markerMaterial.update();
  };

  const frameCamera = () => {
    const positions = [
      ...currentProjection.units,
      ...(currentProjection.map?.hexes ?? []).map((hex) => ({
        worldX: hex.q + hex.r * 0.5,
        worldZ: hex.r * Math.sqrt(3) * 0.5,
      })),
    ];
    const bounds = positions.reduce(
      (value, unit) => ({
        minX: Math.min(value.minX, unit.worldX),
        maxX: Math.max(value.maxX, unit.worldX),
        minZ: Math.min(value.minZ, unit.worldZ),
        maxZ: Math.max(value.maxZ, unit.worldZ),
      }),
      { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
    );
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const camera = cameraEntity.camera;
    if (!camera) return;
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.height > 0 ? rect.width / rect.height : 1.7;
    const width = bounds.maxX - bounds.minX + 3;
    const depth = bounds.maxZ - bounds.minZ + 3;
    camera.orthoHeight = Math.max(depth, width / Math.max(aspect, 0.5), 3.6);
    cameraEntity.setPosition(centerX, 12, centerZ + 8);
    cameraEntity.lookAt(centerX, 0, centerZ);
  };

  const cameraEntity = new Entity('Encounter camera');

  const reconcile = (next: EncounterRenderProjection) => {
    const previous = [...units.values()].map((unit) => unit.unit);
    const delta = diffRenderUnits(previous, next.units);
    for (const id of delta.removed) {
      const old = units.get(id);
      if (!old) continue;
      for (const mesh of old.pickMeshes) meshOwners.delete(mesh);
      old.root.destroy();
      old.markerMaterial.destroy();
      units.delete(id);
      const pad = pads.get(id);
      pad?.destroy();
      pads.delete(id);
    }

    const blocked = new Set((next.map?.blocked ?? []).map(({ q, r }) => `${q},${r}`));
    const nextCells = new Set((next.map?.hexes ?? []).map(({ q, r }) => `${q},${r}`));
    for (const [key, cell] of mapCells) {
      if (nextCells.has(key)) continue;
      cell.entity.destroy();
      cell.material.destroy();
      mapCells.delete(key);
    }
    for (const hex of next.map?.hexes ?? []) {
      const key = `${hex.q},${hex.r}`;
      if (mapCells.has(key)) continue;
      const material = new StandardMaterial();
      material.diffuse = blocked.has(key)
        ? new Color(0.22, 0.16, 0.14)
        : new Color(0.19, 0.23, 0.2);
      material.emissive = blocked.has(key)
        ? new Color(0.015, 0.008, 0.006)
        : new Color(0.01, 0.012, 0.01);
      material.update();
      const entity = new Entity(blocked.has(key) ? 'Blocked public hex' : 'Public map hex');
      entity.addComponent('render', { type: 'cylinder', material });
      entity.setLocalPosition(hex.q + hex.r * 0.5, -0.06, hex.r * Math.sqrt(3) * 0.5);
      entity.setLocalScale(0.86, 0.045, 0.86);
      for (const mesh of entity.render?.meshInstances ?? []) mesh.pick = false;
      app.root.addChild(entity);
      mapCells.set(key, { entity, material });
    }

    const sideOrder = [...new Set(next.units.map((unit) => unit.sideId))].sort();
    for (const unit of next.units) {
      let rendered = units.get(unit.id);
      if (!rendered) {
        const markerMaterial = new StandardMaterial();
        markerMaterial.diffuse =
          sideColors[sideColorIndex(unit.sideId, sideOrder)] ?? sideColors[0]!;
        markerMaterial.emissive = new Color(0.018, 0.014, 0.012);
        markerMaterial.update();

        const root = new Entity(unit.id);
        root.setLocalPosition(unit.worldX, 0, unit.worldZ);
        const marker = new Entity('Public unit marker');
        marker.addComponent('render', { type: 'cylinder', material: markerMaterial });
        marker.setLocalPosition(0, 0.36, 0);
        marker.setLocalScale(0.32, 0.72, 0.32);
        root.addChild(marker);
        app.root.addChild(root);

        const pickMeshes = marker.render?.meshInstances ?? [];
        for (const mesh of pickMeshes) meshOwners.set(mesh, unit.id);
        rendered = { root, marker, markerMaterial, pickMeshes, unit };
        units.set(unit.id, rendered);

        const pad = new Entity('Coordinate marker');
        pad.addComponent('render', { type: 'cylinder' });
        pad.setLocalPosition(unit.worldX, -0.08, unit.worldZ);
        pad.setLocalScale(0.88, 0.04, 0.88);
        for (const mesh of pad.render?.meshInstances ?? []) mesh.pick = false;
        app.root.addChild(pad);
        pads.set(unit.id, pad);
      } else {
        rendered.unit = unit;
        rendered.root.setLocalPosition(unit.worldX, 0, unit.worldZ);
        pads.get(unit.id)?.setLocalPosition(unit.worldX, -0.08, unit.worldZ);
      }
      for (const mesh of rendered.pickMeshes) mesh.pick = selection.has(unit.id);
      setMarkerMaterial(rendered, sideOrder);
    }
    currentProjection = next;
    pickerDirty = true;
    frameCamera();
  };

  try {
    ensureAlive();
    app.setCanvasFillMode(FILLMODE_NONE);
    app.setCanvasResolution(RESOLUTION_AUTO);
    app.graphicsDevice.maxPixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    app.scene.ambientLight = new Color(0.28, 0.25, 0.22);
    app.scene.fog.type = FOG_LINEAR;
    app.scene.fog.color = new Color(0.055, 0.06, 0.06);
    app.scene.fog.start = 18;
    app.scene.fog.end = 45;

    cameraEntity.addComponent('camera', {
      clearColor: new Color(0.055, 0.06, 0.06),
      projection: PROJECTION_ORTHOGRAPHIC,
      farClip: 80,
    });
    app.root.addChild(cameraEntity);

    const light = new Entity('Soft overhead light');
    light.addComponent('light', {
      type: 'directional',
      color: new Color(0.82, 0.78, 0.7),
      intensity: 1.15,
    });
    light.setEulerAngles(48, 28, 0);
    app.root.addChild(light);

    reconcile(initialProjection);
    picker = new Picker(app, canvas.width, canvas.height);
    app.start();

    const resize = () => {
      if (disposed) return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      app.resizeCanvas(bounds.width, bounds.height);
      picker?.resize(canvas.width, canvas.height);
      frameCamera();
      pickerDirty = true;
    };
    resizeHandler = resize;
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', resize);

    const pickAt = async (x: number, y: number, generation: number) => {
      if (!picker || disposed) return null;
      if (pickerDirty) {
        picker.prepare(cameraEntity.camera!, app.scene);
        pickerDirty = false;
      }
      const hit = (await picker.getSelectionAsync(x, y))[0];
      if (generation !== pickGeneration || disposed || !hit || !('node' in hit)) return null;
      const unitId = meshOwners.get(hit as MeshInstance);
      return unitId && selection.has(unitId) ? unitId : null;
    };

    const onPointerMove = (event: PointerEvent) => {
      pendingPointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame !== undefined) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = undefined;
        const pointer = pendingPointer;
        pendingPointer = undefined;
        if (!pointer || disposed) return;
        const bounds = canvas.getBoundingClientRect();
        const x = ((pointer.x - bounds.left) * canvas.width) / Math.max(bounds.width, 1);
        const y = ((pointer.y - bounds.top) * canvas.height) / Math.max(bounds.height, 1);
        const generation = ++pickGeneration;
        void pickAt(x, y, generation).then((unitId) => {
          if (generation === pickGeneration) canvas.style.cursor = unitId ? 'pointer' : 'default';
        });
      });
    };
    const onPointerDown = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) * canvas.width) / Math.max(bounds.width, 1);
      const y = ((event.clientY - bounds.top) * canvas.height) / Math.max(bounds.height, 1);
      const generation = ++pickGeneration;
      void pickAt(x, y, generation).then((unitId) => {
        if (generation === pickGeneration) callbacks.onSelectUnit(unitId);
      });
    };
    const onPointerLeave = () => {
      pickGeneration += 1;
      pendingPointer = undefined;
      canvas.style.cursor = 'default';
    };
    pointerMoveHandler = onPointerMove;
    pointerLeaveHandler = onPointerLeave;
    pointerDownHandler = onPointerDown;
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('PlayCanvas scene did not render')),
        5000,
      );
      const onRender = () => {
        window.clearTimeout(timeout);
        app.off('postrender', onRender);
        resolve();
      };
      app.once('postrender', onRender);
      signal?.addEventListener(
        'abort',
        () => {
          window.clearTimeout(timeout);
          reject(new DOMException('Encounter scene mount was aborted', 'AbortError'));
        },
        { once: true },
      );
    });
    ensureAlive();

    signal?.removeEventListener('abort', onAbort);
    return {
      update(projection, selectableIds, selectedId) {
        if (disposed) return;
        selection.clear();
        for (const id of selectableIds) selection.add(id);
        currentSelection = selectedId;
        reconcile(projection);
      },
      resize,
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

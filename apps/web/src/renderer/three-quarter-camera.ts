import {
  Camera,
  FreeCamera,
  PointerEventTypes,
  Vector3,
  type AbstractEngine,
  type PickingInfo,
  type Scene,
} from '@babylonjs/core';

/** Fixed three-quarter view (owner decision 2026-10-02): elevation above the ground plane. */
export const CAMERA_ELEVATION = (50 * Math.PI) / 180;

export interface GroundBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface ThreeQuarterCamera {
  /** Centre and zoom so the bounds fit, plus `margin` world units around them. */
  fit(bounds: GroundBounds, margin: number): void;
  dispose(): void;
}

/**
 * Orthographic camera at a fixed angle with no rotation: drag or WASD/arrows pan, the wheel
 * zooms, and a press without movement reports a pick.
 */
export function mountThreeQuarterCamera(
  scene: Scene,
  engine: AbstractEngine,
  canvas: HTMLCanvasElement,
  options: {
    readonly elevation?: number;
    readonly azimuth?: number;
    /** Optional actual terrain hit; wheel anchoring must follow raised ground. */
    readonly pickGround?: (x: number, y: number) => { x: number; y: number; z: number } | null;
    readonly minZoom: number;
    readonly maxZoom: number;
    /** Optional alpha-aware map picker; battle picking keeps the default. */
    readonly pick?: (x: number, y: number) => PickingInfo | null;
    readonly onPick: (hit: PickingInfo | null) => void;
    readonly onSecondaryPick?: (hit: PickingInfo | null) => void;
    readonly onStop?: () => void;
    /** Defaults to all mouse buttons to preserve the existing battle camera. */
    readonly panButtons?: readonly number[];
    /** Include HTML map labels in the same wheel interaction area. */
    readonly wheelTarget?: HTMLElement;
  },
): ThreeQuarterCamera {
  const camera = new FreeCamera('three-quarter', Vector3.Zero(), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 400;
  scene.activeCamera = camera;
  const elevation = options.elevation ?? CAMERA_ELEVATION;
  const azimuth = options.azimuth ?? 0;
  const right = { x: Math.cos(azimuth), z: Math.sin(azimuth) };
  const forward = { x: -Math.sin(azimuth), z: Math.cos(azimuth) };
  const view = { centerX: 0, centerZ: 0, zoom: options.minZoom };
  let targetZoom = view.zoom;
  let zoomAnchor: { x: number; z: number; u: number; v: number } | null = null;

  const place = () => {
    const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);
    const halfWidth = view.zoom * aspect;
    const distance = 80;
    camera.position = new Vector3(
      view.centerX - forward.x * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      view.centerZ - forward.z * Math.cos(elevation) * distance,
    );
    camera.setTarget(new Vector3(view.centerX, 0, view.centerZ));
    camera.orthoTop = view.zoom;
    camera.orthoBottom = -view.zoom;
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
  };
  const clampZoom = (zoom: number) => Math.min(options.maxZoom, Math.max(options.minZoom, zoom));

  let press: {
    x: number;
    y: number;
    centerX: number;
    centerZ: number;
    moved: boolean;
    button: number;
    pointerId: number;
  } | null = null;
  const panButtons = options.panButtons ?? [0, 1, 2];
  const onPointerDown = (event: PointerEvent) => {
    if (event.button === 2 && options.onSecondaryPick) event.preventDefault();
    targetZoom = view.zoom;
    zoomAnchor = null;
    canvas.setPointerCapture?.(event.pointerId);
    press = {
      x: event.clientX,
      y: event.clientY,
      centerX: view.centerX,
      centerZ: view.centerZ,
      moved: false,
      button: event.button,
      pointerId: event.pointerId,
    };
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!press || event.buttons === 0) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (Math.hypot(dx, dy) > 5) press.moved = true;
    if (!press.moved || !panButtons.includes(press.button)) return;
    const step = (2 * view.zoom) / Math.max(canvas.clientHeight, 1);
    const depth = (dy * step) / Math.sin(elevation);
    view.centerX = press.centerX - dx * step * right.x + depth * forward.x;
    view.centerZ = press.centerZ - dx * step * right.z + depth * forward.z;
    place();
  };
  const onPointerUp = (event: PointerEvent) => {
    if (
      press &&
      !press.moved &&
      press.button === event.button &&
      press.pointerId === event.pointerId
    ) {
      const hit = options.pick
        ? options.pick(scene.pointerX, scene.pointerY)
        : scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.isPickable);
      if (press.button === 2 && options.onSecondaryPick) options.onSecondaryPick(hit);
      else if (press.button === 0) options.onPick(hit);
    }
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    press = null;
  };
  const pointerObserver = scene.onPointerObservable.add((info) => {
    const event = info.event as PointerEvent;
    switch (info.type) {
      case PointerEventTypes.POINTERDOWN:
        onPointerDown(event);
        break;
      case PointerEventTypes.POINTERMOVE:
        onPointerMove(event);
        break;
      case PointerEventTypes.POINTERUP:
        onPointerUp(event);
        break;
    }
  });

  // Native non-passive capture also handles wheel events over HTML labels.
  const wheelTarget = options.wheelTarget ?? canvas;
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.deltaY === 0) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
    const deltaPixels = Math.max(-240, Math.min(240, event.deltaY * unit));
    targetZoom = clampZoom(targetZoom * Math.exp(deltaPixels * 0.0012));
    const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);
    const u = ((event.clientX - rect.left) / rect.width - 0.5) * 2 * aspect;
    const v = ((0.5 - (event.clientY - rect.top) / rect.height) * 2) / Math.sin(elevation);
    const hit = options.pickGround?.(event.clientX - rect.left, event.clientY - rect.top);
    const x = hit?.x ?? view.centerX + (u * right.x + v * forward.x) * view.zoom;
    const z = hit?.z ?? view.centerZ + (u * right.z + v * forward.z) * view.zoom;
    // A raised point has a fixed screen-up displacement in addition to x/z.
    const heightOffset = (hit?.y ?? 0) / Math.tan(elevation);
    const anchorX = x + forward.x * heightOffset,
      anchorZ = z + forward.z * heightOffset;
    zoomAnchor = {
      x: anchorX,
      z: anchorZ,
      u: (anchorX - view.centerX) / view.zoom,
      v: (anchorZ - view.centerZ) / view.zoom,
    };
  };
  wheelTarget.addEventListener('wheel', onWheel, { passive: false, capture: true });
  const zoomObserver = scene.onBeforeRenderObservable.add(() => {
    const remaining = targetZoom - view.zoom;
    if (remaining === 0) return;
    const dt = Math.min(engine.getDeltaTime(), 50);
    view.zoom =
      Math.abs(remaining) < 0.0001 ? targetZoom : view.zoom + remaining * (1 - Math.exp(-dt / 90));
    if (zoomAnchor) {
      view.centerX = zoomAnchor.x - zoomAnchor.u * view.zoom;
      view.centerZ = zoomAnchor.z - zoomAnchor.v * view.zoom;
    }
    place();
  });

  const onKey = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;
    if (event.code === 'KeyS' && options.onStop) {
      event.preventDefault();
      options.onStop();
      return;
    }
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
    targetZoom = view.zoom;
    zoomAnchor = null;
    view.centerX += move[0] * right.x + move[1] * forward.x;
    view.centerZ += move[0] * right.z + move[1] * forward.z;
    place();
  };
  const clearPress = () => {
    press = null;
  };
  canvas.addEventListener('pointercancel', clearPress);
  canvas.addEventListener('lostpointercapture', clearPress);
  canvas.addEventListener('blur', clearPress);
  canvas.ownerDocument?.defaultView?.addEventListener('blur', clearPress);
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', onKey);
  const resizeObserver = new ResizeObserver(() => {
    engine.resize();
    place();
  });
  resizeObserver.observe(canvas);

  return {
    fit(bounds, margin) {
      const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);
      view.centerX = (bounds.minX + bounds.maxX) / 2;
      view.centerZ = (bounds.minZ + bounds.maxZ) / 2;
      const dx = bounds.maxX - bounds.minX,
        dz = bounds.maxZ - bounds.minZ;
      const fitHeight =
        ((dx * Math.abs(forward.x) + dz * Math.abs(forward.z)) * Math.sin(elevation)) / 2 + margin;
      const fitWidth =
        (dx * Math.abs(right.x) + dz * Math.abs(right.z)) / (2 * Math.max(aspect, 0.5)) + margin;
      view.zoom = clampZoom(Math.max(fitHeight, fitWidth));
      targetZoom = view.zoom;
      zoomAnchor = null;
      place();
    },
    dispose() {
      resizeObserver.disconnect();
      wheelTarget.removeEventListener('wheel', onWheel, true);
      scene.onBeforeRenderObservable.remove(zoomObserver);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointercancel', clearPress);
      canvas.removeEventListener('lostpointercapture', clearPress);
      canvas.removeEventListener('blur', clearPress);
      canvas.ownerDocument?.defaultView?.removeEventListener('blur', clearPress);
      scene.onPointerObservable.remove(pointerObserver);
    },
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName?.toLowerCase();
  return element.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
}

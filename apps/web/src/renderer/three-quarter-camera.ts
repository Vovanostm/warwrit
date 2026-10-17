import {
  Camera,
  FreeCamera,
  Matrix,
  PointerEventTypes,
  Vector3,
  type AbstractEngine,
  type PickingInfo,
  type Scene,
} from '@babylonjs/core';
import { projectCameraPoint, type PerspectiveReference } from './camera-projection.js';

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

const PAN_KEYS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/**
 * Camera at a fixed angle with no rotation: drag or held WASD/arrows pan continuously, the wheel
 * zooms, and a press without movement reports a pick.
 */
export function mountThreeQuarterCamera(
  scene: Scene,
  engine: AbstractEngine,
  canvas: HTMLCanvasElement,
  options: {
    readonly elevation?: number;
    readonly azimuth?: number;
    /** Painted perspective scenes pan the image window, keeping the optical centre fixed. */
    readonly perspective?: PerspectiveReference;
    /** Optional actual terrain hit; wheel anchoring must follow raised ground. */
    readonly pickGround?: (x: number, y: number) => { x: number; y: number; z: number } | null;
    /** Keep the viewport inside this reference-image rectangle (ground plane when orthographic). */
    readonly bounds?: GroundBounds;
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
  camera.mode = options.perspective ? Camera.PERSPECTIVE_CAMERA : Camera.ORTHOGRAPHIC_CAMERA;
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

  const viewportExtent = () => {
    const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);
    return {
      x: aspect * Math.abs(right.x) + Math.abs(forward.x) / Math.sin(elevation),
      z: aspect * Math.abs(right.z) + Math.abs(forward.z) / Math.sin(elevation),
    };
  };
  const clampZoom = (zoom: number) => {
    const bounds = options.bounds;
    const extent = viewportExtent();
    const maximum = bounds
      ? Math.min(
          options.maxZoom,
          (bounds.maxX - bounds.minX) / (2 * extent.x),
          (bounds.maxZ - bounds.minZ) / (2 * extent.z),
        )
      : options.maxZoom;
    return Math.min(maximum, Math.max(Math.min(options.minZoom, maximum), zoom));
  };
  const place = () => {
    view.zoom = clampZoom(view.zoom);
    targetZoom = clampZoom(targetZoom);
    if (options.bounds) {
      const extent = viewportExtent();
      const beforeX = view.centerX;
      const beforeZ = view.centerZ;
      view.centerX = Math.max(
        options.bounds.minX + extent.x * view.zoom,
        Math.min(options.bounds.maxX - extent.x * view.zoom, view.centerX),
      );
      view.centerZ = Math.max(
        options.bounds.minZ + extent.z * view.zoom,
        Math.min(options.bounds.maxZ - extent.z * view.zoom, view.centerZ),
      );
      if (zoomAnchor) {
        zoomAnchor.x += view.centerX - beforeX;
        zoomAnchor.z += view.centerZ - beforeZ;
      }
    }
    const aspect = engine.getRenderWidth() / Math.max(engine.getRenderHeight(), 1);
    const halfWidth = view.zoom * aspect;
    const reference = options.perspective;
    const distance = reference?.distance ?? 80;
    const targetX = reference?.targetX ?? view.centerX;
    const targetZ = reference?.targetZ ?? view.centerZ;
    camera.position = new Vector3(
      targetX - forward.x * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      targetZ - forward.z * Math.cos(elevation) * distance,
    );
    camera.setTarget(new Vector3(targetX, 0, targetZ));
    if (reference) {
      // Off-axis pinhole projection: pan/zoom crop one calibrated image, with no backdrop parallax.
      camera.fov = 2 * Math.atan(view.zoom / distance);
      const projection = Matrix.PerspectiveFovLH(camera.fov, aspect, camera.minZ, camera.maxZ);
      const dx = view.centerX - targetX;
      const dz = view.centerZ - targetZ;
      projection.setRowFromFloats(
        2,
        -(dx * right.x + dz * right.z) / halfWidth,
        -((dx * forward.x + dz * forward.z) * Math.sin(elevation)) / view.zoom,
        projection.m[10]!,
        projection.m[11]!,
      );
      camera.freezeProjectionMatrix(projection);
    }
    camera.orthoTop = view.zoom;
    camera.orthoBottom = -view.zoom;
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
  };

  const heldKeys = new Set<string>();
  let press: {
    x: number;
    y: number;
    moved: boolean;
    button: number;
    pointerId: number;
  } | null = null;
  const panButtons = options.panButtons ?? [0, 1, 2];
  const onPointerDown = (event: PointerEvent) => {
    if (event.button === 2 && options.onSecondaryPick) event.preventDefault();
    canvas.focus?.({ preventScroll: true });
    targetZoom = view.zoom;
    zoomAnchor = null;
    canvas.setPointerCapture?.(event.pointerId);
    press = {
      x: event.clientX,
      y: event.clientY,
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
    view.centerX += -dx * step * right.x + depth * forward.x;
    view.centerZ += -dx * step * right.z + depth * forward.z;
    press.x = event.clientX;
    press.y = event.clientY;
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
    const projected =
      hit && options.perspective
        ? projectCameraPoint(hit, options.perspective, elevation, azimuth)
        : null;
    const anchorX = projected?.x ?? x + forward.x * heightOffset,
      anchorZ = projected?.z ?? z + forward.z * heightOffset;
    zoomAnchor = {
      x: anchorX,
      z: anchorZ,
      u: (anchorX - view.centerX) / view.zoom,
      v: (anchorZ - view.centerZ) / view.zoom,
    };
  };
  wheelTarget.addEventListener('wheel', onWheel, { passive: false, capture: true });
  const easeZoom = (dt: number) => {
    const remaining = targetZoom - view.zoom;
    if (remaining === 0) return false;
    view.zoom =
      Math.abs(remaining) < 0.0001 ? targetZoom : view.zoom + remaining * (1 - Math.exp(-dt / 90));
    if (zoomAnchor) {
      view.centerX = zoomAnchor.x - zoomAnchor.u * view.zoom;
      view.centerZ = zoomAnchor.z - zoomAnchor.v * view.zoom;
    }
    return true;
  };
  const panWithKeys = (dt: number) => {
    let horizontal = 0;
    let vertical = 0;
    for (const code of heldKeys) {
      const move = PAN_KEYS[code]!;
      horizontal += move[0];
      vertical += move[1];
    }
    const length = Math.hypot(horizontal, vertical);
    if (length === 0) return false;
    // Constant screen speed at every zoom/elevation; diagonals are not faster.
    const step = (view.zoom * 1.4 * dt) / (1000 * length);
    const depth = (vertical * step) / Math.sin(elevation);
    const dx = horizontal * step * right.x + depth * forward.x;
    const dz = horizontal * step * right.z + depth * forward.z;
    view.centerX += dx;
    view.centerZ += dz;
    if (zoomAnchor) {
      zoomAnchor.x += dx;
      zoomAnchor.z += dz;
    }
    if (press) press.moved = true;
    return true;
  };
  const navigationObserver = scene.onBeforeRenderObservable.add(() => {
    // Bound long stalls without slowing ordinary 10–60 FPS held movement.
    const dt = Math.max(0, Math.min(engine.getDeltaTime(), 100));
    const zoomed = easeZoom(Math.min(dt, 50));
    const panned = panWithKeys(dt);
    if (zoomed || panned) place();
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'KeyS' && options.onStop) {
      event.preventDefault();
      if (!event.repeat) options.onStop();
      return;
    }
    if (!PAN_KEYS[event.code]) return;
    event.preventDefault();
    if (heldKeys.size === 0) {
      targetZoom = view.zoom;
      zoomAnchor = null;
    }
    heldKeys.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (heldKeys.delete(event.code)) event.preventDefault();
  };
  const clearPress = () => {
    press = null;
  };
  canvas.addEventListener('pointercancel', clearPress);
  canvas.addEventListener('lostpointercapture', clearPress);
  const clearInput = () => {
    heldKeys.clear();
    if (press && canvas.hasPointerCapture?.(press.pointerId))
      canvas.releasePointerCapture(press.pointerId);
    clearPress();
  };
  const onVisibilityChange = () => {
    if (canvas.ownerDocument?.hidden) clearInput();
  };
  canvas.addEventListener('blur', clearInput);
  canvas.ownerDocument?.defaultView?.addEventListener('blur', clearInput);
  canvas.ownerDocument?.addEventListener('visibilitychange', onVisibilityChange);
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  const resizeObserver = new ResizeObserver(() => {
    engine.resize();
    place();
  });
  resizeObserver.observe(canvas);

  return {
    fit(bounds, margin) {
      clearInput();
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
      clearInput();
      resizeObserver.disconnect();
      wheelTarget.removeEventListener('wheel', onWheel, true);
      scene.onBeforeRenderObservable.remove(navigationObserver);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointercancel', clearPress);
      canvas.removeEventListener('lostpointercapture', clearPress);
      canvas.removeEventListener('blur', clearInput);
      canvas.ownerDocument?.defaultView?.removeEventListener('blur', clearInput);
      canvas.ownerDocument?.removeEventListener('visibilitychange', onVisibilityChange);
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

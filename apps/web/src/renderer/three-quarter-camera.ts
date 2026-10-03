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
    readonly minZoom: number;
    readonly maxZoom: number;
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
  const view = { centerX: 0, centerZ: 0, zoom: options.minZoom };
  let targetZoom = view.zoom;
  let zoomAnchor: { x: number; z: number; u: number; v: number } | null = null;

  const place = () => {
    const distance = 80;
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
  const pointerObserver = scene.onPointerObservable.add((info) => {
    const event = info.event as PointerEvent;
    if (info.type === PointerEventTypes.POINTERDOWN) {
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
    } else if (info.type === PointerEventTypes.POINTERMOVE && press && event.buttons !== 0) {
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (Math.hypot(dx, dy) > 5) press.moved = true;
      if (press.moved && panButtons.includes(press.button)) {
        const step = (2 * view.zoom) / Math.max(canvas.clientHeight, 1);
        view.centerX = press.centerX - dx * step;
        view.centerZ = press.centerZ + (dy * step) / Math.sin(CAMERA_ELEVATION);
        place();
      }
    } else if (info.type === PointerEventTypes.POINTERUP) {
      if (
        press &&
        !press.moved &&
        press.button === event.button &&
        press.pointerId === event.pointerId
      ) {
        const hit = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.isPickable);
        if (press.button === 2 && options.onSecondaryPick) options.onSecondaryPick(hit);
        else if (press.button === 0) options.onPick(hit);
      }
      if (canvas.hasPointerCapture?.(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
      press = null;
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
    const v = ((0.5 - (event.clientY - rect.top) / rect.height) * 2) / Math.sin(CAMERA_ELEVATION);
    zoomAnchor = { x: view.centerX + u * view.zoom, z: view.centerZ + v * view.zoom, u, v };
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
    view.centerX += move[0];
    view.centerZ += move[1];
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
      const fitHeight = ((bounds.maxZ - bounds.minZ) * Math.sin(CAMERA_ELEVATION)) / 2 + margin;
      const fitWidth = (bounds.maxX - bounds.minX) / (2 * Math.max(aspect, 0.5)) + margin;
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

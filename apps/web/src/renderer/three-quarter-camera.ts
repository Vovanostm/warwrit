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
  },
): ThreeQuarterCamera {
  const camera = new FreeCamera('three-quarter', Vector3.Zero(), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 400;
  scene.activeCamera = camera;
  const view = { centerX: 0, centerZ: 0, zoom: options.minZoom };

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

  let press: { x: number; y: number; centerX: number; centerZ: number; moved: boolean } | null =
    null;
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
        place();
      }
    } else if (info.type === PointerEventTypes.POINTERUP) {
      if (press && !press.moved)
        options.onPick(scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.isPickable));
      press = null;
    } else if (info.type === PointerEventTypes.POINTERWHEEL) {
      const wheel = info.event as WheelEvent;
      view.zoom = clampZoom(view.zoom * (wheel.deltaY > 0 ? 1.1 : 0.9));
      place();
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
    place();
  };
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
      place();
    },
    dispose() {
      resizeObserver.disconnect();
      canvas.removeEventListener('keydown', onKey);
      scene.onPointerObservable.remove(pointerObserver);
    },
  };
}

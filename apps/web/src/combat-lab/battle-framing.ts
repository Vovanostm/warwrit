import { CAMERA_ELEVATION, type GroundBounds } from '../renderer/three-quarter-camera.js';

type FigureBounds = { minX: number; maxX: number; bottom: number; top: number };

/** Stable field identity, distinct from the changing activation order. */
export function battleUnitMarker(units: readonly { id: string }[], id: string) {
  const index = units.findIndex((unit) => unit.id === id);
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index] ?? String(index + 1);
}

/** Fit the full reference-image field and silhouettes into the measured HUD opening. */
export function battleFrameBounds({
  mapBounds,
  figures,
  width,
  height,
  safeTop,
  safeBottom,
  badge,
}: {
  mapBounds: GroundBounds;
  figures: readonly FigureBounds[];
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  badge?: { readonly width: number; readonly height: number } | undefined;
}): GroundBounds | null {
  // Fixed CSS-pixel strips extend 20px below feet and 16px to either side.
  const top = Math.max(0, safeTop) + 8 + (badge?.height ?? 0);
  const bottom = Math.min(height, safeBottom) - 20;
  const horizontalPadding = Math.max(32, badge?.width ?? 0);
  if (width <= horizontalPadding || height <= 0 || bottom <= top) return null;
  const sin = Math.sin(CAMERA_ELEVATION);
  const low = Math.min(mapBounds.minZ * sin, ...figures.map((figure) => figure.bottom));
  const high =
    Math.max(mapBounds.maxZ * sin, ...figures.map((figure) => figure.top)) + (badge ? 0.08 : 0);
  const minX = Math.min(mapBounds.minX, ...figures.map((figure) => figure.minX));
  const maxX = Math.max(mapBounds.maxX, ...figures.map((figure) => figure.maxX));
  const zoom = Math.max(
    ((high - low) * height) / (2 * (bottom - top)),
    ((maxX - minX) * height) / (2 * (width - horizontalPadding)),
    0.01,
  );
  const upCenter = (low + high) / 2 + (((top + bottom) / 2 - height / 2) * 2 * zoom) / height;
  const x = (minX + maxX) / 2;
  return { minX: x, maxX: x, minZ: (upCenter - zoom) / sin, maxZ: (upCenter + zoom) / sin };
}

/** Battle-local containment admits the overview, including its off-centre HUD opening. */
export function battleCameraLimits(frame: GroundBounds, width: number, height: number) {
  const maxZoom = Math.max(17, ((frame.maxZ - frame.minZ) * Math.sin(CAMERA_ELEVATION)) / 2);
  const halfWidth = (maxZoom * width) / height;
  const halfDepth = maxZoom / Math.sin(CAMERA_ELEVATION);
  const x = (frame.minX + frame.maxX) / 2;
  const z = (frame.minZ + frame.maxZ) / 2;
  return {
    maxZoom,
    bounds: {
      minX: x - halfWidth - 2,
      maxX: x + halfWidth + 2,
      minZ: z - halfDepth - 2,
      maxZ: z + halfDepth + 2,
    },
  };
}

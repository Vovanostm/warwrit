import { CAMERA_ELEVATION, type GroundBounds } from '../renderer/three-quarter-camera.js';

type FigureBounds = { minX: number; maxX: number; bottom: number; top: number };

/** Fit the full reference-image field and silhouettes into the measured HUD opening. */
export function battleFrameBounds({
  mapBounds,
  figures,
  width,
  height,
  safeTop,
  safeBottom,
}: {
  mapBounds: GroundBounds;
  figures: readonly FigureBounds[];
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
}): GroundBounds | null {
  // Fixed CSS-pixel strips extend 20px below feet and 16px to either side.
  const top = Math.max(0, safeTop) + 8;
  const bottom = Math.min(height, safeBottom) - 20;
  if (width <= 32 || height <= 0 || bottom <= top) return null;
  const sin = Math.sin(CAMERA_ELEVATION);
  const low = Math.min(mapBounds.minZ * sin, ...figures.map((figure) => figure.bottom));
  const high = Math.max(mapBounds.maxZ * sin, ...figures.map((figure) => figure.top));
  const minX = Math.min(mapBounds.minX, ...figures.map((figure) => figure.minX));
  const maxX = Math.max(mapBounds.maxX, ...figures.map((figure) => figure.maxX));
  const zoom = Math.max(
    ((high - low) * height) / (2 * (bottom - top)),
    ((maxX - minX) * height) / (2 * (width - 32)),
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

/** Separate each inspectable portrait, retaining a leader to the unchanged world foot. */
export function overviewPortraitPositions(
  points: readonly { x: number; y: number }[],
  width: number,
  top: number,
  bottom: number,
) {
  const slots = Array.from({ length: Math.max(1, Math.floor((bottom - top) / 48)) }, (_, row) =>
    Array.from({ length: Math.max(1, Math.floor((width - 16) / 40)) }, (_, column) => ({
      x: 8 + column * 40,
      y: top + row * 48,
    })),
  ).flat();
  const placed: { x: number; y: number }[] = [];
  for (const point of points) {
    const distance = (slot: { x: number; y: number }) =>
      (slot.x + 18 - point.x) ** 2 + (slot.y + 58 - point.y) ** 2;
    const nearest = slots
      .toSorted((a, b) => distance(a) - distance(b))
      .find((slot) =>
        placed.every(
          (other) => Math.abs(slot.x - other.x) >= 40 || Math.abs(slot.y - other.y) >= 48,
        ),
      );
    placed.push(nearest ?? { x: point.x - 18, y: point.y - 58 });
  }
  return placed;
}

import { CAMERA_ELEVATION } from '../renderer/three-quarter-camera.js';
import { BATTLE_HEX_RADIUS } from './battle-layout.js';

type MapBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
/** Initial overview: full map width and standing silhouettes fit between the HUD panels. */
export function battleFrameBounds({
  mapBounds,
  figures,
  width,
  height,
  safeTop,
  safeBottom,
}: {
  mapBounds: MapBounds;
  figures: readonly { bottom: number; top: number }[];
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
}) {
  const sin = Math.sin(CAMERA_ELEVATION);
  const low = figures.length
    ? Math.min(...figures.map((figure) => figure.bottom))
    : mapBounds.minZ * sin;
  const high = figures.length
    ? Math.max(...figures.map((figure) => figure.top))
    : mapBounds.maxZ * sin + 1.5;
  const zoom = Math.max(
    ((high - low) * height) / (2 * Math.max(180, safeBottom - safeTop)),
    (mapBounds.maxX - mapBounds.minX + BATTLE_HEX_RADIUS * 2 + 0.6) / ((2 * width) / height),
  );
  const upCenter =
    (low + high) / 2 + (((safeTop + safeBottom) / 2 - height / 2) * 2 * zoom) / height;
  const x = (mapBounds.minX + mapBounds.maxX) / 2;
  return { minX: x, maxX: x, minZ: (upCenter - zoom) / sin, maxZ: (upCenter + zoom) / sin };
}

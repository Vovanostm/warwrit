import { expect, it } from 'vitest';
import { battleFrameBounds } from './battle-framing.js';
import { CAMERA_ELEVATION } from '../renderer/three-quarter-camera.js';

it.each([
  [1280, 720],
  [1440, 900],
  [1920, 1080],
])('keeps deployed silhouettes between HUD panels at %sx%s', (width, height) => {
  const bounds = battleFrameBounds({
    mapBounds: { minX: 0, maxX: 26.6, minZ: 0, maxZ: 12.2 },
    figures: [
      { bottom: 2, top: 4 },
      { bottom: 8, top: 10.4 },
    ],
    width,
    height,
    safeTop: 192,
    safeBottom: height - 230,
  });
  const sin = Math.sin(CAMERA_ELEVATION),
    zoom = ((bounds.maxZ - bounds.minZ) * sin) / 2,
    center = ((bounds.maxZ + bounds.minZ) * sin) / 2;
  const screenY = (up: number) => height / 2 - ((up - center) * height) / (2 * zoom);
  expect(screenY(10.4)).toBeGreaterThanOrEqual(192 - 0.01);
  expect(screenY(2)).toBeLessThanOrEqual(height - 230 + 0.01);
  expect(((zoom * width) / height) * 2).toBeGreaterThan(26.6);
});
it('frames a terminal battle with no standing units without invalid camera values', () => {
  const bounds = battleFrameBounds({
    mapBounds: { minX: 0, maxX: 26.6, minZ: 0, maxZ: 12.2 },
    figures: [],
    width: 1280,
    height: 720,
    safeTop: 24,
    safeBottom: 696,
  });
  expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
  expect(bounds.maxZ).toBeGreaterThan(bounds.minZ);
});

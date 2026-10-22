import { expect, it } from 'vitest';
import { spriteFigureBounds } from './sprite-battle-scene.js';
import { spriteForUnit } from './sprite-art.js';
import { CAMERA_ELEVATION } from '../renderer/three-quarter-camera.js';
import { projectCameraPoint } from '../renderer/camera-projection.js';
import { battleHexToWorld } from './battle-layout.js';

it.each(['W01', 'B002', 'B053'])(
  'contains all padded %s corners near/far and on raised ground',
  (profileId) => {
    for (const position of [
      { q: 0, r: 0 },
      { q: 14, r: 10 },
    ]) {
      for (const groundY of [0, 0.2, 0.4]) {
        const unit = { id: profileId, profileId, position } as never;
        const art = spriteForUnit(unit);
        const scale = ((profileId === 'W01' ? 1.4 : 1.62) * 0.82) / art.bodyHeight;
        const foot = battleHexToWorld(position);
        const project = (point: { x: number; y: number; z: number }) =>
          projectCameraPoint(point, { targetX: 24, targetZ: 11, distance: 41.6 }, CAMERA_ELEVATION);
        const bounds = spriteFigureBounds(unit, groundY, project);
        for (const x of [art.visibleBounds[0], art.visibleBounds[2]]) {
          for (const y of [art.visibleBounds[1], art.visibleBounds[3], art.footY]) {
            const up = (art.footY - y) * scale;
            const point = project({
              x: foot.x + (x - art.footX) * scale,
              y: groundY + up * Math.cos(CAMERA_ELEVATION),
              z: foot.z + up * Math.sin(CAMERA_ELEVATION),
            });
            expect(point.x).toBeGreaterThanOrEqual(bounds.minX);
            expect(point.x).toBeLessThanOrEqual(bounds.maxX);
            expect(point.z * Math.sin(CAMERA_ELEVATION)).toBeGreaterThanOrEqual(bounds.bottom);
            expect(point.z * Math.sin(CAMERA_ELEVATION)).toBeLessThanOrEqual(bounds.top);
          }
        }
      }
    }
  },
);

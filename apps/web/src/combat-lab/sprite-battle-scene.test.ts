import { expect, it } from 'vitest';
import {
  initialFrameUnits,
  spriteFigureBounds,
  spriteFrameMapBounds,
} from './sprite-battle-scene.js';
import { spriteForUnit } from './sprite-art.js';
import { projectCameraPoint } from '../renderer/camera-projection.js';
import { battleHexToWorld } from './battle-layout.js';

const CAMERA_ELEVATION = Math.PI / 6;

it('retains full-field limits separately from initial subjects and empty terminal fields', () => {
  const field = Object.freeze({ minX: -20, maxX: 60, minZ: -30, maxZ: 40 });
  const figures = [{ minX: 2, maxX: 8, bottom: 1, top: 5 }];
  const squad = spriteFrameMapBounds(false, field, figures);
  expect(squad.minX).toBe(2);
  expect(squad.maxX).toBe(8);
  expect(squad.minZ).toBeCloseTo(2, 12);
  expect(squad.maxZ).toBeCloseTo(10, 12);
  expect(spriteFrameMapBounds(true, field, figures)).toBe(field);
  expect(spriteFrameMapBounds(false, field, [])).toBe(field);
});

it('initially shows every standing ally and each nearest standing threat, excluding empty margins and distant enemies', () => {
  const units = [
    { id: 'a', sideId: 'company', status: 'active', position: { q: 0, r: 0 } },
    { id: 'b', sideId: 'company', status: 'active', position: { q: 2, r: 0 } },
    { id: 'c', sideId: 'enemy', status: 'active', position: { q: 0, r: 1 } },
    { id: 'd', sideId: 'enemy', status: 'active', position: { q: 2, r: 1 } },
    { id: 'far', sideId: 'enemy', status: 'active', position: { q: 14, r: 10 } },
    { id: 'dead', sideId: 'enemy', status: 'dead', position: { q: 0, r: 0 } },
  ];
  const view = { controlledSideId: 'company', units };
  expect(initialFrameUnits(view as never).map(({ id }) => id)).toEqual(['a', 'b', 'c', 'd']);
  expect(view.units).toBe(units);
  expect(units.map(({ id }) => id)).toEqual(['a', 'b', 'c', 'd', 'far', 'dead']);
  expect(initialFrameUnits({ ...view, units: units.slice(0, 2) } as never)).toEqual(
    units.slice(0, 2),
  );
  expect(initialFrameUnits({ ...view, controlledSideId: 'absent' } as never)).toEqual(
    units.slice(0, 5),
  );
  expect(initialFrameUnits({ ...view, units: [] } as never)).toEqual([]);
});

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

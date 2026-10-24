import { NullEngine, Scene, MeshBuilder } from '@babylonjs/core';
import { expect, it } from 'vitest';
import {
  initialFrameUnits,
  combatAreaSubjects,
  combatAreaOpening,
  activationCameraTarget,
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

it.each([0, 0.2, 0.4])(
  'frames live figures and actual transformed plaques on height %s',
  (groundY) => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const units = ['active', 'dead', 'retreated', 'surrendered'].map((status, i) => ({
      id: String(i),
      profileId: 'W01',
      status,
      position: { q: 0, r: 0 },
    }));
    const markers = units.slice(1).map((unit, i) => {
      const mesh = MeshBuilder.CreatePlane(unit.status, { width: 1.35, height: 0.3 }, scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.scaling.set(0.55, 0.75, 1);
      mesh.position.set(i - 0.34, groundY + 0.055, 0.3);
      return mesh;
    });
    const project = (p: { x: number; y: number; z: number }) => ({
      x: p.x,
      z: p.z + p.y * Math.sqrt(3),
    });
    const subjects = combatAreaSubjects(units as never, markers, () => groundY, project);
    const expected = [
      spriteFigureBounds(units[0] as never, groundY, project),
      ...markers.map((_, i) => ({
        minX: i - 0.34 - (1.35 * 0.55) / 2,
        maxX: i - 0.34 + (1.35 * 0.55) / 2,
        bottom: (0.3 - (0.3 * 0.75) / 2 + (groundY + 0.055) * Math.sqrt(3)) / 2,
        top: (0.3 + (0.3 * 0.75) / 2 + (groundY + 0.055) * Math.sqrt(3)) / 2,
      })),
    ];
    expect(subjects).toEqual(
      expected.map((bounds) =>
        Object.fromEntries(
          Object.entries(bounds).map(([key, value]) => [key, expect.closeTo(value, 6)]),
        ),
      ),
    );
    markers.forEach((mesh) => mesh.setEnabled(false));
    expect(combatAreaSubjects([], markers, () => groundY, project)).toEqual([]);
    scene.dispose();
    engine.dispose();
  },
);

it('measures visible desktop HUD borders and ignores panels outside the opening', () => {
  const rect = (left: number, top: number, width: number, height: number, visible = true) => ({
    checkVisibility: () => visible,
    getBoundingClientRect: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }),
  });
  const groups = [
    [rect(20, 30, 600, 100), rect(20, 30, 600, 800, false), rect(20, 30, 0, 800)],
    [rect(20, 660, 1440, 240)],
    [rect(1120, 180, 300, 300), rect(100, 700, 300, 100)],
    [rect(40, 200, 256, 300), rect(20, 30, 600, 800, false), rect(20, 30, 0, 800)],
    [],
  ];
  const canvas = {
    getBoundingClientRect: () => ({ left: 20, top: 30, width: 1440, height: 900 }),
    closest: () => ({ querySelectorAll: () => groups.shift() }),
  };
  expect(combatAreaOpening(canvas as never)).toEqual({
    width: 1440,
    height: 900,
    safeLeft: 280,
    safeRight: 1096,
    safeTop: 104,
    safeBottom: 626,
  });
});

it('leaves the camera without a fit when HUD bands overlap', () => {
  const rect = {
    checkVisibility: () => true,
    getBoundingClientRect: () => ({ left: 0, top: 100, bottom: 700, width: 100, height: 600 }),
  };
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
    closest: () => ({ querySelectorAll: () => [rect] }),
  };
  expect(combatAreaOpening(canvas as never)).toBeNull();
});

it.each([
  ['a', 'b', false, 'b'],
  ['a', 'b', true, undefined],
  ['a', 'a', false, undefined],
  ['a', undefined, false, undefined],
  [undefined, 'a', false, 'a'],
])(
  'follows activation %s → %s only without manual camera intent (%s)',
  (previous, next, manual, expected) => {
    expect(
      activationCameraTarget(
        previous as string | undefined,
        next as string | undefined,
        manual as boolean,
      ),
    ).toBe(expected);
  },
);

it.each([
  ['below', { safeTop: 594 }],
  ['left', { safeRight: 506 }],
  ['right', { safeLeft: 934 }],
  ['above', { safeBottom: 248 }],
] as const)('offers the finite %s opening around the outcome', (side, edge) => {
  const outcome = {
    checkVisibility: () => true,
    getBoundingClientRect: () => ({
      left: 510,
      right: 930,
      top: 252,
      bottom: 590,
      width: 420,
      height: 338,
    }),
  };
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
    closest: () => ({
      querySelectorAll: (selector: string) =>
        selector === '.battle-outcome-panel' ? [outcome] : [],
    }),
  };
  expect(combatAreaOpening(canvas as never, side)).toMatchObject(edge);
});

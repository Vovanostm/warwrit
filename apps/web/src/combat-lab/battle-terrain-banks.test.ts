import { NullEngine, Scene } from '@babylonjs/core';
import { expect, it } from 'vitest';
import { createBattleTerrainBanks } from './battle-terrain-banks.js';

it('keeps the canonical top rim and caps deterministic natural banks at 0.22 radius', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const radius = 1.25;
    const top = 0.36;
    const bottoms = [0.12, 0.12, 0.24, 0.12, 0, 0.24];
    const banks = createBattleTerrainBanks('earth-bank', radius, top, bottoms, scene);
    const second = createBattleTerrainBanks('earth-bank-copy', radius, top, bottoms, scene);
    const positions = banks.getVerticesData('position')!;
    const normals = banks.getVerticesData('normal')!;
    const topRim = Array.from({ length: positions.length / 3 }, (_, index) => [
      positions[index * 3]!,
      positions[index * 3 + 1]!,
      positions[index * 3 + 2]!,
    ]).filter(([, y]) => y === top);

    expect(topRim).toHaveLength(6 * 7);
    for (let side = 0; side < 6; side++) {
      const firstAngle = (side * Math.PI) / 3 + Math.PI / 6;
      for (let segment = 0; segment <= 6; segment++) {
        const offset = (side * 35 + segment) * 3;
        const t = segment / 6;
        const expectedX =
          Math.cos(firstAngle) * radius * (1 - t) + Math.cos(firstAngle + Math.PI / 3) * radius * t;
        const expectedZ =
          Math.sin(firstAngle) * radius * (1 - t) + Math.sin(firstAngle + Math.PI / 3) * radius * t;
        expect(positions[offset]).toBeCloseTo(expectedX, 6);
        expect(positions[offset + 2]).toBeCloseTo(expectedZ, 6);

        const lipInner = (side * 35 + 28 + segment) * 3;
        expect(positions[lipInner + 1]).toBeCloseTo(top + 0.002, 7);
        expect(normals[lipInner + 1]).toBeGreaterThan(0);
        expect(Math.hypot(positions[lipInner]!, positions[lipInner + 2]!)).toBeLessThan(
          Math.hypot(expectedX, expectedZ),
        );
        expect(
          Math.hypot(positions[lipInner]! - expectedX, positions[lipInner + 2]! - expectedZ),
        ).toBeGreaterThanOrEqual(radius * 0.02 - 1e-8);
        expect(
          Math.hypot(positions[lipInner]! - expectedX, positions[lipInner + 2]! - expectedZ),
        ).toBeLessThanOrEqual(radius * 0.06 + 1e-8);
      }

      const nextSide = (side + 1) % 6;
      for (let row = 0; row < 5; row++) {
        const rowOffset = row < 3 ? row * 7 : 21 + (row - 3) * 7;
        const sideEnd = (side * 35 + rowOffset + 6) * 3;
        const nextStart = (nextSide * 35 + rowOffset) * 3;
        for (let axis = 0; axis < 3; axis++) {
          expect(positions[sideEnd + axis]).toBeCloseTo(positions[nextStart + axis]!, 8);
        }
      }
    }

    const radii = Array.from({ length: positions.length / 3 }, (_, index) =>
      Math.hypot(positions[index * 3]!, positions[index * 3 + 2]!),
    );
    expect(Math.max(...radii)).toBeLessThanOrEqual(radius * 1.22 + 1e-8);
    expect(positions.every(Number.isFinite)).toBe(true);
    expect(normals.every(Number.isFinite)).toBe(true);
    expect(normals.some((value) => Math.abs(value) > 0)).toBe(true);
    expect(second.getVerticesData('position')).toEqual(positions);
    expect(banks.getVerticesData('uv')?.length).toBe((positions.length / 3) * 2);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

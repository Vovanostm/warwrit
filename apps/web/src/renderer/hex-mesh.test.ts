import {
  Color3,
  VertexBuffer,
  NullEngine,
  Ray,
  Scene,
  Vector3,
  StandardMaterial,
  type Mesh,
} from '@babylonjs/core';
import { expect, it } from 'vitest';
import { createHexBorder, createHexDisc } from './hex-mesh.js';
import { createBattleTerrain, createBattleSurface } from './battle-terrain.js';
import { createBattleCellGrid, type BattleCellStyle } from './battle-cell-grid.js';
import { HEX_RADIUS, hexToWorld, worldToHex } from './hex-projection.js';

function worldVertices(mesh: Mesh): Vector3[] {
  const positions = mesh.getVerticesData('position')!;
  const matrix = mesh.computeWorldMatrix(true);
  return Array.from({ length: positions.length / 3 }, (_, index) =>
    Vector3.TransformCoordinates(Vector3.FromArray(positions, index * 3), matrix),
  );
}

it('tiles all six neighbours edge-to-edge and aligns the visible border with picking', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const cell = createHexDisc('cell', HEX_RADIUS, scene);
    const corners = worldVertices(cell).slice(1, 7);
    const border = createHexBorder('border', HEX_RADIUS * 2, 0.02, scene);
    const borderVertices = worldVertices(border);
    // Each torus cross-section has six vertices plus its repeated closing vertex.
    for (let section = 0; section < 6; section++) {
      const centre = borderVertices
        .slice(section * 7, section * 7 + 6)
        .reduce((sum, point) => sum.add(point), Vector3.Zero())
        .scale(1 / 6);
      expect(corners.some((corner) => Vector3.Distance(corner, centre) < 1e-6)).toBe(true);
    }
    for (const [q, r] of [
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1],
    ] as const) {
      const neighbour = createHexDisc(`neighbour:${q},${r}`, HEX_RADIUS, scene);
      const { x, z } = hexToWorld(q, r);
      neighbour.position.set(x, 0, z);
      const neighbourCorners = worldVertices(neighbour).slice(1, 7);
      const shared = corners.filter((a) =>
        neighbourCorners.some((b) => Vector3.Distance(a, b) < 1e-6),
      );
      expect(shared).toHaveLength(2);
      expect(Vector3.Distance(shared[0]!, shared[1]!)).toBeCloseTo(HEX_RADIUS, 6);
      const midpoint = shared[0]!.add(shared[1]!).scale(0.5);
      expect(worldToHex(midpoint.x * 0.999, midpoint.z * 0.999)).toEqual({ q: 0, r: 0 });
      expect(worldToHex(midpoint.x * 1.001, midpoint.z * 1.001)).toEqual({ q, r });
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('joins raised earth continuously while preserving centre heights and actual surface picks', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const tiles = [
      { q: 0, r: 0, height: 2 },
      { q: 1, r: 0, height: 0 },
      { q: 0, r: 1, height: 0 },
      { q: -1, r: 1, height: 0 },
      { q: -1, r: 0, height: 0 },
      { q: 0, r: -1, height: 0 },
      { q: 1, r: -1, height: 0 },
    ];
    const terrain = createBattleTerrain(tiles);
    for (const [key, cell] of terrain) createBattleSurface(`ground:${key}`, cell, scene);
    const raised = terrain.get('0,0')!,
      lower = terrain.get('1,0')!;
    const shared = raised.corners.filter((a) =>
      lower.corners.some((b) => Vector3.Distance(a, b) < 1e-6),
    );
    expect(shared).toHaveLength(2);
    expect(shared.every((p) => Math.abs(p.y - 0.56 / 3) < 1e-6)).toBe(true);
    const pick = (x: number, z: number) =>
      scene.pickWithRay(new Ray(new Vector3(x, 2, z), new Vector3(0, -1, 0)));
    expect(pick(0, 0)?.pickedPoint?.y).toBeCloseTo(0.56);
    expect(pick(0.05, 0)?.pickedPoint?.y).toBeCloseTo(0.56);
    expect(pick(1, 0)?.pickedPoint?.y).toBeCloseTo(0);
    expect(pick(0.49999, 0)?.pickedMesh?.name).toBe('ground:0,0');
    expect(pick(0.50001, 0)?.pickedMesh?.name).toBe('ground:1,0');
    expect(pick(0.49999, 0)?.pickedPoint?.y).toBeCloseTo(0.56 / 3, 4);
    expect(pick(0.50001, 0)?.pickedPoint?.y).toBeCloseTo(0.56 / 3, 4);
    expect(pick(3, 0)?.hit).toBe(false);
    createBattleCellGrid(scene, tiles, terrain);
    const fill = scene.getMeshByName('cell-fill:0,0') as Mesh;
    const ground = scene.getMeshByName('ground:0,0') as Mesh;
    const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
    const cornerRadius = Math.max(
      ...raised.corners.map((corner) =>
        Math.hypot(corner.x - raised.centre.x, corner.z - raised.centre.z),
      ),
    );
    const topRadii = Array.from(
      { length: 6 },
      (_, index) =>
        Math.hypot(positions[(index + 1) * 3]!, positions[(index + 1) * 3 + 2]!) / cornerRadius,
    );
    expect(Math.min(...topRadii)).toBeGreaterThanOrEqual(0.78);
    expect(Math.max(...topRadii)).toBeLessThanOrEqual(0.88);
    expect(
      Array.from({ length: 6 }, (_, index) => positions[(index + 1) * 3 + 1]!).every(
        (height) => height === 0,
      ),
    ).toBe(true);
    expect(
      ground
        .getVerticesData('normal')!
        .filter((_, i) => i % 3 === 1)
        .every((y) => y > 0),
    ).toBe(true);
    const top = worldVertices(ground),
      overlay = worldVertices(fill);
    expect(
      top.every(
        (point, i) => Vector3.Distance(point.add(new Vector3(0, 0.025, 0)), overlay[i]!) < 1e-6,
      ),
    ).toBe(true);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('scales connected terrain layout while keeping surface texture UVs normalized', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const tiles = [
      { q: 0, r: 0, height: 2 },
      { q: 1, r: 0, height: 0 },
      { q: 0, r: 1, height: 0 },
      { q: -1, r: 1, height: 0 },
      { q: -1, r: 0, height: 0 },
      { q: 0, r: -1, height: 0 },
      { q: 1, r: -1, height: 0 },
    ];
    const unit = createBattleTerrain(tiles);
    const spaced = createBattleTerrain(tiles, { spacing: 2.6, heightStep: 0.28 });
    const raised = spaced.get('0,0')!;
    const lower = spaced.get('1,0')!;
    expect(raised.centre.x).toBeCloseTo(0, 8);
    expect(raised.centre.y).toBeCloseTo(0.56, 8);
    expect(lower.centre.x).toBeCloseTo(2.6, 8);
    const shared = raised.corners.filter((a) =>
      lower.corners.some((b) => Vector3.Distance(a, b) < 1e-6),
    );
    expect(shared).toHaveLength(2);
    expect(shared.every((point) => Math.abs(point.y - 0.56 / 3) < 1e-6)).toBe(true);

    const unitMesh = createBattleSurface('unit-surface', unit.get('0,0')!, scene);
    const spacedMesh = createBattleSurface('spaced-surface', raised, scene);
    const unitUvs = unitMesh.getVerticesData(VertexBuffer.UVKind)!;
    const spacedUvs = spacedMesh.getVerticesData(VertexBuffer.UVKind)!;
    expect(spacedUvs).toHaveLength(unitUvs.length);
    spacedUvs.forEach((uv, index) => expect(uv).toBeCloseTo(unitUvs[index]!, 6));
    const radius = Math.max(
      ...raised.corners.map((corner) =>
        Math.hypot(corner.x - raised.centre.x, corner.z - raised.centre.z),
      ),
    );
    expect(radius).toBeCloseTo(HEX_RADIUS * 2.6, 8);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('draws shared grid edges once and recolours fixed cell geometry instead of stacking markers', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const tiles = [
      { q: 0, r: 0, height: 0 },
      { q: 1, r: 0, height: 0 },
    ];
    const grid = createBattleCellGrid(scene, tiles, createBattleTerrain(tiles));
    const borders = scene.getMeshByName('tactical-grid') as Mesh;
    expect(borders.getTotalVertices()).toBe(11 * 4);
    expect(scene.meshes.filter((mesh) => mesh.name.startsWith('cell-fill:'))).toHaveLength(2);
    const edges: string[][] = borders.metadata.edgeCells;
    expect(edges.filter((cells) => cells.length === 2)).toHaveLength(1);
    const sharedIndex = edges.findIndex((cells) => cells.length === 2);
    const cyan = Color3.FromHexString('#92bbb8');
    const gold = Color3.FromHexString('#dfb867');
    const fill = new StandardMaterial('wash', scene);
    const styles = new Map<string, BattleCellStyle>([
      ['0,0', { fill, border: cyan, priority: 3 }],
      ['1,0', { fill: null, border: gold, priority: 8 }],
    ]);
    const geometryIds = scene.meshes.map((mesh) => mesh.uniqueId);
    grid.paint(styles);
    const colours = borders.getVerticesData(VertexBuffer.ColorKind)!;
    for (const [channel, expected] of [gold.r, gold.g, gold.b, 1].entries()) {
      expect(colours[sharedIndex * 16 + channel]).toBeCloseTo(expected, 6);
    }
    expect(scene.getMeshByName('cell-fill:0,0')?.isEnabled()).toBe(true);
    expect(scene.getMeshByName('cell-fill:1,0')?.isEnabled()).toBe(false);
    grid.paint(new Map());
    expect(borders.getVerticesData(VertexBuffer.ColorKind)?.every((value) => value === 0)).toBe(
      true,
    );
    expect(scene.meshes.map((mesh) => mesh.uniqueId)).toEqual(geometryIds);
    expect(scene.meshes.every((mesh) => mesh.renderingGroupId === 0 && !mesh.isPickable)).toBe(
      true,
    );
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('draws one connected height edge regardless of tile order', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const tiles = [
      { q: 0, r: 0, height: 2 },
      { q: 1, r: 0, height: 0 },
      { q: 0, r: 1, height: 0 },
      { q: -1, r: 1, height: 0 },
      { q: -1, r: 0, height: 0 },
      { q: 0, r: -1, height: 0 },
      { q: 1, r: -1, height: 0 },
    ];
    const terrain = createBattleTerrain(tiles);
    createBattleCellGrid(scene, tiles, terrain);
    const borders = scene.getMeshByName('tactical-grid') as Mesh;
    expect(borders.getTotalVertices()).toBe(30 * 4);
    const shared = borders.metadata.edgeCells.findIndex(
      (cells: string[]) => cells.includes('0,0') && cells.includes('1,0'),
    );
    expect(
      worldVertices(borders)
        .slice(shared * 4, shared * 4 + 4)
        .every((p) => Math.abs(p.y - (0.56 / 3 + 0.045)) < 1e-6),
    ).toBe(true);
    const second = new Scene(engine);
    const reversed = tiles.toReversed();
    createBattleCellGrid(second, reversed, createBattleTerrain(reversed));
    const reverse = second.getMeshByName('tactical-grid') as Mesh;
    const reverseShared = reverse.metadata.edgeCells.findIndex(
      (cells: string[]) => cells.includes('0,0') && cells.includes('1,0'),
    );
    expect(
      worldVertices(reverse)
        .slice(reverseShared * 4, reverseShared * 4 + 4)
        .every((p) => Math.abs(p.y - (0.56 / 3 + 0.045)) < 1e-6),
    ).toBe(true);
    second.dispose();
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

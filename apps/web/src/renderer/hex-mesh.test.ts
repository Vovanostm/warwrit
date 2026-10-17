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
import { createHexBorder, createHexDisc, createHexSides } from './hex-mesh.js';
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

it('grounds raised tops and closes exposed step faces without changing hex corners', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const top = createHexDisc('ground:0,0', HEX_RADIUS, scene);
    top.position.y = 0.24;
    top.metadata = { combatHex: { q: 0, r: 0 } };
    const sides = createHexSides('ground-side:0,0', HEX_RADIUS, 0.24, [0.12, 0, 0, 0, 0, 0], scene);
    const material = new StandardMaterial('step', scene);
    material.backFaceCulling = false;
    sides.material = material;
    sides.metadata = top.metadata;
    const vertices = worldVertices(sides);
    const corners = worldVertices(top).slice(1, 7);
    expect(
      vertices
        .filter((point) => Math.abs(point.y - 0.24) < 1e-6)
        .every((point) => corners.some((corner) => Vector3.Distance(point, corner) < 1e-6)),
    ).toBe(true);
    // The first face borders a level-one neighbour; do not extend that face below it.
    expect(vertices.slice(0, 4).map((point) => point.y)).toEqual([0.12, 0.12, 0.24, 0.24]);
    const bank = createHexSides(
      'terrain-bank',
      HEX_RADIUS,
      0.24,
      [0.12, 0, 0, 0, 0, 0],
      scene,
      0.16,
    );
    bank.isPickable = false;
    const bankVertices = worldVertices(bank);
    expect(
      bankVertices
        .filter((p) => Math.abs(p.y - 0.24) < 1e-6)
        .every((p) => corners.some((corner) => Vector3.Distance(p, corner) < 1e-6)),
    ).toBe(true);
    expect(
      bankVertices.filter((p) => p.y < 0.24 - 1e-6).every((p) => Math.hypot(p.x, p.z) > HEX_RADIUS),
    ).toBe(true);
    // Front step strip has real geometry and selects its upper cell, not remote level zero.
    const ray = new Ray(new Vector3(0, 0.12, -2), new Vector3(0, 0, 1));
    const hit = scene.pickWithRay(ray, (mesh) => mesh.name.startsWith('ground'));
    expect(hit?.hit).toBe(true);
    expect(hit?.pickedMesh).toBe(sides);
    expect(hit?.pickedMesh?.metadata.combatHex).toEqual({ q: 0, r: 0 });
    expect(scene.pickWithRay(new Ray(new Vector3(1, 0.12, -2), new Vector3(0, 0, 1)))?.hit).toBe(
      false,
    );
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('draws shared grid edges once and recolours fixed cell geometry instead of stacking markers', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const grid = createBattleCellGrid(scene, [
      { q: 0, r: 0, height: 0 },
      { q: 1, r: 0, height: 0 },
    ]);
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

it('draws one shared step rim at the higher surface regardless of tile order', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    createBattleCellGrid(scene, [
      { q: 1, r: 0, height: 2 },
      { q: 0, r: 0, height: 0 },
    ]);
    const borders = scene.getMeshByName('tactical-grid') as Mesh;
    expect(borders.getTotalVertices()).toBe(11 * 4);
    const levels = new Set(worldVertices(borders).map((point) => Number(point.y.toFixed(3))));
    expect([...levels].sort()).toEqual([0.045, 0.285]);
    const shared = borders.metadata.edgeCells.findIndex((cells: string[]) => cells.length === 2);
    expect(
      worldVertices(borders)
        .slice(shared * 4, shared * 4 + 4)
        .every((p) => p.y > 0.28),
    ).toBe(true);
    const second = new Scene(engine);
    createBattleCellGrid(second, [
      { q: 0, r: 0, height: 0 },
      { q: 1, r: 0, height: 2 },
    ]);
    const reverse = second.getMeshByName('tactical-grid') as Mesh;
    const reverseShared = reverse.metadata.edgeCells.findIndex(
      (cells: string[]) => cells.length === 2,
    );
    expect(
      worldVertices(reverse)
        .slice(reverseShared * 4, reverseShared * 4 + 4)
        .every((p) => p.y > 0.28),
    ).toBe(true);
    second.dispose();
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

import { NullEngine, Scene, Vector3, VertexBuffer, type Mesh } from '@babylonjs/core';
import { expect, it } from 'vitest';
import type { CombatLabTile } from '@warwrit/protocol';
import { BATTLE_HEX_RADIUS, BATTLE_LAYOUT, battleHexToWorld } from './battle-layout.js';
import { createBattleTerrainMargin } from './battle-terrain-margin.js';
import { createHexDisc } from '../renderer/hex-mesh.js';

function corners(mesh: Mesh): Vector3[] {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
  const matrix = mesh.computeWorldMatrix(true);
  return Array.from({ length: 6 }, (_, index) =>
    Vector3.TransformCoordinates(Vector3.FromArray(positions, (index + 1) * 3), matrix),
  );
}

it('feathers only exposed hex sides and keeps the canonical top edge unchanged', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const tiles: CombatLabTile[] = [
    { q: 0, r: 0, height: 1, terrain: 'plain', blocked: false },
    { q: 0, r: 1, height: 1, terrain: 'plain', blocked: false },
  ];
  const original = structuredClone(tiles);
  try {
    const margin = createBattleTerrainMargin(scene, tiles, 3.2);
    const positions = margin.getVerticesData(VertexBuffer.PositionKind)!;
    const colors = margin.getVerticesData(VertexBuffer.ColorKind)!;
    const indices = margin.getIndices()!;
    const vertexCount = positions.length / 3;
    const topVertices = Array.from({ length: vertexCount }, (_, index) => index)
      .filter((index) => colors[index * 4 + 3] === 1)
      .map((index) => Vector3.FromArray(positions, index * 3));

    expect(margin.isPickable).toBe(false);
    expect(margin.renderingGroupId).toBe(0);
    expect(vertexCount).toBe(10 * 5 * 3);
    expect(indices).toHaveLength(10 * 4 * 2 * 6);
    expect(colors).toHaveLength(vertexCount * 4);
    expect(tiles).toEqual(original);
    for (const tile of tiles) {
      const ground = createHexDisc(`ground:${tile.q},${tile.r}`, BATTLE_HEX_RADIUS, scene);
      const center = battleHexToWorld(tile);
      ground.position.set(center.x, tile.height * BATTLE_LAYOUT.heightStep + 0.002, center.z);
      for (const corner of corners(ground)) {
        expect(topVertices.some((point) => Vector3.Distance(point, corner) < 1e-6)).toBe(true);
      }
    }
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const alpha = colors[vertex * 4 + 3]!;
      expect([1, 0.65, 0]).toContain(alpha);
    }
    const normals = margin.getVerticesData('normal')!;
    for (let offset = 1; offset < normals.length; offset += 3) {
      expect(normals[offset]).toBeGreaterThan(0);
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

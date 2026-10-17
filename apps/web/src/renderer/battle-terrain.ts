import { Mesh, Vector3, VertexData, type Scene } from '@babylonjs/core';
import type { CombatLabHex } from '@warwrit/protocol';
import { BATTLE_HEIGHT_STEP, HEX_RADIUS, hexToWorld } from './hex-projection.js';

type TerrainTile = CombatLabHex & { readonly height: number };
export interface BattleTerrainCell {
  readonly centre: Vector3;
  readonly corners: readonly Vector3[];
}
const cornerKey = (point: Vector3) => `${Math.round(point.x * 1e6)},${Math.round(point.z * 1e6)}`;

/** Shared corners join the earth; canonical cell centres retain their exact height. */
export function createBattleTerrain(tiles: readonly TerrainTile[]) {
  const cells = new Map<string, BattleTerrainCell>();
  const shared = new Map<string, { sum: number; count: number }>();
  for (const tile of tiles) {
    const { x, z } = hexToWorld(tile.q, tile.r);
    const centre = new Vector3(x, tile.height * BATTLE_HEIGHT_STEP, z);
    const corners = Array.from({ length: 6 }, (_, i) => {
      const angle = Math.PI / 6 + (i * Math.PI) / 3;
      const point = new Vector3(
        x + Math.cos(angle) * HEX_RADIUS,
        0,
        z + Math.sin(angle) * HEX_RADIUS,
      );
      const key = cornerKey(point),
        value = shared.get(key) ?? { sum: 0, count: 0 };
      value.sum += centre.y;
      value.count++;
      shared.set(key, value);
      return point;
    });
    cells.set(`${tile.q},${tile.r}`, { centre, corners });
  }
  for (const cell of cells.values()) {
    for (const corner of cell.corners) {
      const value = shared.get(cornerKey(corner))!;
      // Fade the finite board into the underlying painting at its perimeter.
      corner.y = value.count === 3 ? value.sum / value.count : 0;
    }
  }
  return cells;
}

/** A small level foot area joins shared corner heights with continuous earth slopes. */
export function createBattleSurface(
  name: string,
  cell: BattleTerrainCell,
  scene: Scene,
  offset = 0,
) {
  const positions = [0, 0, 0];
  for (const corner of cell.corners) {
    positions.push((corner.x - cell.centre.x) * 0.4, 0, (corner.z - cell.centre.z) * 0.4);
  }
  for (const corner of cell.corners) {
    positions.push(corner.x - cell.centre.x, corner.y - cell.centre.y, corner.z - cell.centre.z);
  }
  const indices: number[] = [];
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    indices.push(0, i + 1, next + 1, i + 1, next + 7, next + 1, i + 1, i + 7, next + 7);
  }
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.uvs = Array.from({ length: positions.length / 3 }, (_, i) => [
    positions[i * 3]! / (2 * HEX_RADIUS) + 0.5,
    positions[i * 3 + 2]! / (2 * HEX_RADIUS) + 0.5,
  ]).flat();
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  mesh.position.copyFrom(cell.centre);
  mesh.position.y += offset;
  mesh.computeWorldMatrix(true);
  return mesh;
}

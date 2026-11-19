import { Mesh, Vector3, VertexData, type Scene } from '@babylonjs/core';
import type { CombatLabHex } from '@warwrit/protocol';
import { BATTLE_HEIGHT_STEP, HEX_RADIUS, hexToWorld } from './hex-projection.js';

type TerrainTile = CombatLabHex & { readonly height: number };
export interface BattleTerrainLayout {
  readonly spacing?: number;
  readonly heightStep?: number;
}
export interface BattleTerrainCell {
  readonly centre: Vector3;
  readonly corners: readonly Vector3[];
  readonly exposedSides: readonly BattleTerrainSide[];
}
export interface BattleTerrainSide {
  readonly upperHex: string;
  readonly lowerHex: string | null;
  readonly side: number;
  readonly corners: readonly [Vector3, Vector3, Vector3, Vector3];
}
const hexKey = ({ q, r }: CombatLabHex) => `${q},${r}`;
const neighbours = [
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
  [1, 0],
] as const;

/** Discrete cell tops stay at canonical height; adjacent drops own explicit faces. */
export function createBattleTerrain(
  tiles: readonly TerrainTile[],
  layout: BattleTerrainLayout = { spacing: 1, heightStep: BATTLE_HEIGHT_STEP },
) {
  const spacing = layout.spacing ?? 1;
  const heightStep = layout.heightStep ?? BATTLE_HEIGHT_STEP;
  const cells = new Map<
    string,
    { centre: Vector3; corners: Vector3[]; exposedSides: BattleTerrainSide[] }
  >();
  const tilesByHex = new Map(tiles.map((tile) => [hexKey(tile), tile]));
  for (const tile of tiles) {
    const { x, z } = hexToWorld(tile.q, tile.r, spacing);
    const centre = new Vector3(x, tile.height * heightStep, z);
    const corners = Array.from({ length: 6 }, (_, i) => {
      const angle = Math.PI / 6 + (i * Math.PI) / 3;
      return new Vector3(
        x + Math.cos(angle) * HEX_RADIUS * spacing,
        centre.y,
        z + Math.sin(angle) * HEX_RADIUS * spacing,
      );
    });
    cells.set(hexKey(tile), { centre, corners, exposedSides: [] });
  }

  for (const tile of tiles) {
    const tileKey = hexKey(tile);
    const cell = cells.get(tileKey)!;
    const sides = cell.exposedSides;
    for (let side = 0; side < neighbours.length; side++) {
      const [dq, dr] = neighbours[side]!;
      const lowerTile = tilesByHex.get(hexKey({ q: tile.q + dq, r: tile.r + dr }));
      if (lowerTile ? tile.height <= lowerTile.height : tile.height <= 0) continue;
      const lowerHex = lowerTile ? hexKey(lowerTile) : null;
      const lowerY = (lowerTile?.height ?? 0) * heightStep;
      const topStart = cell.corners[side]!;
      const topEnd = cell.corners[(side + 1) % cell.corners.length]!;
      sides.push({
        upperHex: tileKey,
        lowerHex,
        side,
        corners: [
          topStart,
          topEnd,
          new Vector3(topEnd.x, lowerY, topEnd.z),
          new Vector3(topStart.x, lowerY, topStart.z),
        ],
      });
    }
  }
  return cells;
}

/** One flat selectable top; its edge faces are built separately from height differences. */
export function createBattleSurface(
  name: string,
  cell: BattleTerrainCell,
  scene: Scene,
  offset = 0,
) {
  const radius = Math.max(
    ...cell.corners.map((corner) => Math.hypot(corner.x - cell.centre.x, corner.z - cell.centre.z)),
  );
  const positions = [0, 0, 0];
  for (const [index, corner] of cell.corners.entries()) {
    const phase = index * 2.399 + cell.centre.x * 0.73 + cell.centre.z * 1.17;
    const topRadius = 0.83 + 0.05 * Math.sin(phase);
    positions.push(
      (corner.x - cell.centre.x) * topRadius,
      0,
      (corner.z - cell.centre.z) * topRadius,
    );
  }
  for (const corner of cell.corners) {
    positions.push(corner.x - cell.centre.x, corner.y - cell.centre.y, corner.z - cell.centre.z);
  }
  const indices: number[] = [];
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    indices.push(0, next + 1, i + 1, i + 1, next + 1, next + 7, i + 1, next + 7, i + 7);
  }
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.uvs = Array.from({ length: positions.length / 3 }, (_, i) => [
    positions[i * 3]! / (2 * radius) + 0.5,
    positions[i * 3 + 2]! / (2 * radius) + 0.5,
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

/** A visible terrain face for the real height difference between adjacent cells. */
export function createBattleSideSurface(
  name: string,
  side: BattleTerrainSide,
  scene: Scene,
) {
  const positions = side.corners.flatMap((point) => [point.x, point.y, point.z]);
  const edgeLength = Vector3.Distance(side.corners[0], side.corners[1]);
  const height = Vector3.Distance(side.corners[1], side.corners[2]);
  const data = new VertexData();
  data.positions = positions;
  data.indices = [0, 1, 2, 0, 2, 3];
  data.uvs = [0, 0, edgeLength / 2, 0, edgeLength / 2, height / 0.32, 0, height / 0.32];
  data.normals = [];
  VertexData.ComputeNormals(positions, data.indices, data.normals);
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  mesh.isPickable = true;
  const [q, r] = side.upperHex.split(',').map(Number);
  mesh.metadata = { combatHex: { q, r }, combatLowerHex: side.lowerHex };
  return mesh;
}

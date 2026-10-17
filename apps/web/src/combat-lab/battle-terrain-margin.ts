import { Mesh, VertexData, type Scene } from '@babylonjs/core';
import type { CombatLabTile } from '@warwrit/protocol';
import { BATTLE_HEX_RADIUS, BATTLE_LAYOUT, battleHexToWorld } from './battle-layout.js';

const SIDES = [
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
  [1, 0],
] as const;
const SEGMENTS = 4;
const key = (q: number, r: number) => `${q},${r}`;
interface Geometry {
  positions: number[];
  indices: number[];
  uvs: number[];
  colors: number[];
}
interface Point {
  x: number;
  y: number;
  z: number;
}

function vertex(geometry: Geometry, point: Point, alpha: number, textureSize: number): number {
  const index = geometry.positions.length / 3;
  geometry.positions.push(point.x, point.y, point.z);
  geometry.uvs.push(point.x / textureSize, point.z / textureSize);
  geometry.colors.push(1, 1, 1, alpha);
  return index;
}

function appendSide(
  geometry: Geometry,
  tile: CombatLabTile,
  center: { x: number; z: number },
  side: number,
  textureSize: number,
): void {
  const angleA = (side * Math.PI) / 3 + Math.PI / 6;
  const angleB = angleA + Math.PI / 3;
  const normalAngle = angleA + Math.PI / 6;
  const top = tile.height * BATTLE_LAYOUT.heightStep + 0.002;
  const rows: number[][] = [[], [], []];
  for (let segment = 0; segment <= SEGMENTS; segment++) {
    const t = segment / SEGMENTS;
    const point = {
      x:
        center.x +
        Math.cos(angleA) * BATTLE_HEX_RADIUS * (1 - t) +
        Math.cos(angleB) * BATTLE_HEX_RADIUS * t,
      z:
        center.z +
        Math.sin(angleA) * BATTLE_HEX_RADIUS * (1 - t) +
        Math.sin(angleB) * BATTLE_HEX_RADIUS * t,
    };
    const direction =
      segment === 0
        ? { x: Math.cos(angleA), z: Math.sin(angleA) }
        : segment === SEGMENTS
          ? { x: Math.cos(angleB), z: Math.sin(angleB) }
          : { x: Math.cos(normalAngle), z: Math.sin(normalAngle) };
    const seed = Math.round(point.x * 977 + point.z * 619);
    const noise = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
    const outer = BATTLE_LAYOUT.spacing * (0.45 + noise * 0.35);
    rows[0]!.push(vertex(geometry, { ...point, y: top }, 1, textureSize));
    rows[1]!.push(
      vertex(
        geometry,
        {
          x: point.x + direction.x * BATTLE_LAYOUT.spacing * 0.25,
          y: top * 0.65,
          z: point.z + direction.z * BATTLE_LAYOUT.spacing * 0.25,
        },
        0.65,
        textureSize,
      ),
    );
    rows[2]!.push(
      vertex(
        geometry,
        {
          x: point.x + direction.x * outer,
          y: 0,
          z: point.z + direction.z * outer,
        },
        0,
        textureSize,
      ),
    );
  }
  for (let layer = 0; layer < 2; layer++) {
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const a = rows[layer]![segment]!;
      const b = rows[layer]![segment + 1]!;
      const c = rows[layer + 1]![segment + 1]!;
      const d = rows[layer + 1]![segment]!;
      geometry.indices.push(a, c, b, a, d, c);
    }
  }
}

/** Feather earth outside the battle footprint without changing its canonical cells. */
export function createBattleTerrainMargin(
  scene: Scene,
  tiles: readonly CombatLabTile[],
  textureWorldSize: number,
): Mesh {
  const occupied = new Set(tiles.map((tile) => key(tile.q, tile.r)));
  const geometry: Geometry = { positions: [], indices: [], uvs: [], colors: [] };
  for (const tile of tiles) {
    const center = battleHexToWorld(tile);
    for (let side = 0; side < SIDES.length; side++) {
      const [dq, dr] = SIDES[side]!;
      if (!occupied.has(key(tile.q + dq, tile.r + dr))) {
        appendSide(geometry, tile, center, side, textureWorldSize);
      }
    }
  }
  const mesh = new Mesh('battle-terrain-margin', scene);
  const data = new VertexData();
  data.positions = geometry.positions;
  data.indices = geometry.indices;
  data.uvs = geometry.uvs;
  data.colors = geometry.colors;
  data.normals = [];
  VertexData.ComputeNormals(data.positions, data.indices, data.normals);
  data.applyToMesh(mesh);
  mesh.isPickable = false;
  mesh.hasVertexAlpha = true;
  mesh.renderingGroupId = 0;
  return mesh;
}

import {
  Color3,
  Mesh,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  VertexData,
  type Material,
  type Scene,
} from '@babylonjs/core';
import type { CombatLabHex } from '@warwrit/protocol';
import { createBattleSurface, createBattleTerrain } from './battle-terrain.js';

type GridTile = CombatLabHex & { readonly height: number };
export interface BattleCellStyle {
  readonly fill: Material | null;
  readonly border: Color3;
  readonly priority: number;
}

/** One fill per cell and one strip per shared physical edge, recoloured in place. */
export function createBattleCellGrid(
  scene: Scene,
  tiles: readonly GridTile[],
  terrain = createBattleTerrain(tiles),
) {
  const key = (hex: CombatLabHex) => `${hex.q},${hex.r}`;
  const fills = new Map<string, Mesh>();
  const edges = new Map<string, { cells: string[]; start: Vector3; end: Vector3 }>();
  const neighbours = [
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
    [1, 0],
  ] as const;
  for (const tile of tiles) {
    const cellKey = key(tile);
    const surface = terrain.get(cellKey)!;
    const fill = createBattleSurface(`cell-fill:${cellKey}`, surface, scene, 0.025);
    fill.isPickable = false;
    fill.renderingGroupId = 0;
    fill.alphaIndex = 1;
    fill.setEnabled(false);
    fills.set(cellKey, fill);
    for (let side = 0; side < 6; side++) {
      const [dq, dr] = neighbours[side]!;
      const neighbourKey = key({ q: tile.q + dq, r: tile.r + dr });
      const edgeKey = [cellKey, neighbourKey].sort().join('|');
      const existing = edges.get(edgeKey);
      if (existing) {
        existing.cells.push(cellKey);
        continue;
      }
      edges.set(edgeKey, {
        cells: [cellKey],
        start: surface.corners[side]!.add(new Vector3(0, 0.045, 0)),
        end: surface.corners[(side + 1) % 6]!.add(new Vector3(0, 0.045, 0)),
      });
    }
  }
  const edgeList = [...edges.values()];
  const positions: number[] = [];
  const indices: number[] = [];
  for (const edge of edgeList) {
    const direction = edge.end.subtract(edge.start);
    const offset = new Vector3(-direction.z, 0, direction.x).normalize().scale(0.014);
    const first = positions.length / 3;
    for (const point of [
      edge.start.add(offset),
      edge.end.add(offset),
      edge.end.subtract(offset),
      edge.start.subtract(offset),
    ]) {
      positions.push(point.x, point.y, point.z);
    }
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  const borders = new Mesh('tactical-grid', scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.colors = new Array(edgeList.length * 16).fill(0);
  data.applyToMesh(borders, true);
  borders.isPickable = false;
  borders.renderingGroupId = 0;
  borders.alphaIndex = 2;
  borders.hasVertexAlpha = true;
  borders.useVertexColors = true;
  borders.metadata = { edgeCells: edgeList.map((edge) => edge.cells) };
  const material = new StandardMaterial('tactical-grid-colours', scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.White();
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  borders.material = material;

  return {
    paint(styles: ReadonlyMap<string, BattleCellStyle>) {
      for (const [cellKey, fill] of fills) {
        const style = styles.get(cellKey);
        fill.material = style?.fill ?? null;
        fill.setEnabled(style?.fill != null);
      }
      const colours: number[] = [];
      for (const edge of edgeList) {
        const style = edge.cells
          .map((cell) => styles.get(cell))
          .filter((value): value is BattleCellStyle => value !== undefined)
          .sort((a, b) => b.priority - a.priority)[0];
        for (let vertex = 0; vertex < 4; vertex++) {
          colours.push(
            style?.border.r ?? 0,
            style?.border.g ?? 0,
            style?.border.b ?? 0,
            style ? 1 : 0,
          );
        }
      }
      borders.updateVerticesData(VertexBuffer.ColorKind, colours);
    },
  };
}

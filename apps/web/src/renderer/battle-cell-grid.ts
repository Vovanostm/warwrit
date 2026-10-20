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
import { createBattleSurface, type BattleTerrainCell } from './battle-terrain.js';

type GridTile = CombatLabHex & { readonly height: number };
export interface BattleCellStyle {
  readonly fill: Material | null;
  readonly border: Color3 | null;
  readonly priority: number;
  readonly hatch?: boolean;
}

function hatchIntersections(corners: readonly Vector3[], level: number) {
  const points: Vector3[] = [];
  for (let side = 0; side < corners.length; side++) {
    const start = corners[side]!;
    const end = corners[(side + 1) % corners.length]!;
    const startLevel = start.x + start.z;
    const endLevel = end.x + end.z;
    if ((startLevel <= level && endLevel > level) || (endLevel <= level && startLevel > level)) {
      points.push(Vector3.Lerp(start, end, (level - startLevel) / (endLevel - startLevel)));
    }
  }
  return points.length === 2 ? (points as [Vector3, Vector3]) : null;
}

function appendHatchBand(start: Vector3, end: Vector3, positions: number[], indices: number[]) {
  const direction = end.subtract(start);
  const endInset = direction.normalize().scale(0.05);
  const halfWidth = new Vector3(-direction.z, 0, direction.x).normalize().scale(0.009);
  const innerStart = start.add(endInset);
  const innerEnd = end.subtract(endInset);
  const first = positions.length / 3;
  for (const point of [
    innerStart.subtract(halfWidth).add(new Vector3(0, 0.038, 0)),
    innerEnd.subtract(halfWidth).add(new Vector3(0, 0.038, 0)),
    innerEnd.add(halfWidth).add(new Vector3(0, 0.038, 0)),
    innerStart.add(halfWidth).add(new Vector3(0, 0.038, 0)),
  ])
    positions.push(point.x, point.y, point.z);
  indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
}

function createMovementHatch(scene: Scene, cellKey: string, surface: BattleTerrainCell) {
  const positions: number[] = [];
  const indices: number[] = [];
  const levels = surface.corners.map(({ x, z }) => x + z);
  const minimum = Math.min(...levels);
  const maximum = Math.max(...levels);
  const pitch = 0.22;
  for (let level = Math.ceil(minimum / pitch) * pitch; level < maximum; level += pitch) {
    const line = hatchIntersections(surface.corners, level);
    if (line) appendHatchBand(line[0], line[1], positions, indices);
  }
  const hatch = new Mesh(`cell-hatch:${cellKey}`, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.applyToMesh(hatch, true);
  hatch.isPickable = false;
  hatch.renderingGroupId = 0;
  hatch.alphaIndex = 2;
  hatch.setEnabled(false);
  return hatch;
}

/** One fill per cell and one strip per shared physical edge, recoloured in place. */
export function createBattleCellGrid(
  scene: Scene,
  tiles: readonly GridTile[],
  terrain: ReadonlyMap<string, BattleTerrainCell>,
) {
  const key = (hex: CombatLabHex) => `${hex.q},${hex.r}`;
  const fills = new Map<string, Mesh>();
  const hatches = new Map<string, Mesh>();
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
    hatches.set(cellKey, createMovementHatch(scene, cellKey, surface));
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

  const hatchMaterial = new StandardMaterial('movement-only-hatch', scene);
  hatchMaterial.disableLighting = true;
  hatchMaterial.emissiveColor = new Color3(0.16, 0.16, 0.16);
  hatchMaterial.disableDepthWrite = true;
  hatchMaterial.backFaceCulling = false;
  hatchMaterial.alpha = 0.78;
  hatchMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  for (const hatch of hatches.values()) hatch.material = hatchMaterial;

  return {
    paint(styles: ReadonlyMap<string, BattleCellStyle>) {
      for (const [cellKey, fill] of fills) {
        const style = styles.get(cellKey);
        fill.material = style?.fill ?? null;
        fill.setEnabled(style?.fill != null);
        hatches.get(cellKey)?.setEnabled(style?.hatch === true);
      }
      const colours: number[] = [];
      for (const edge of edgeList) {
        const style = edge.cells
          .map((cell) => styles.get(cell))
          .filter((value): value is BattleCellStyle => value !== undefined && value.border !== null)
          .sort((a, b) => b.priority - a.priority)[0];
        for (let vertex = 0; vertex < 4; vertex++) {
          colours.push(
            style?.border?.r ?? 0,
            style?.border?.g ?? 0,
            style?.border?.b ?? 0,
            style?.border ? 1 : 0,
          );
        }
      }
      borders.updateVerticesData(VertexBuffer.ColorKind, colours);
    },
  };
}

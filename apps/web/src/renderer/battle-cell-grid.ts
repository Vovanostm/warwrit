import {
  Color3,
  Mesh,
  StandardMaterial,
  ShaderMaterial,
  Vector3,
  VertexBuffer,
  VertexData,
  type Material,
  type Scene,
} from '@babylonjs/core';
import type { CombatLabHex } from '@warwrit/protocol';
import { createBattleSurface, type BattleTerrainCell } from './battle-terrain.js';

type GridTile = CombatLabHex & { readonly height: number };
const hatchPitch = 0.42;
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

interface SurfaceTriangle {
  readonly a: Vector3;
  readonly b: Vector3;
  readonly c: Vector3;
}

function surfaceTriangles(surface: Mesh): SurfaceTriangle[] {
  const positions = surface.getVerticesData(VertexBuffer.PositionKind)!;
  const indices = surface.getIndices()!;
  const matrix = surface.computeWorldMatrix(true);
  const vertex = (index: number) =>
    Vector3.TransformCoordinates(Vector3.FromArray(positions, index * 3), matrix);
  const triangles: SurfaceTriangle[] = [];
  for (let index = 0; index < indices.length; index += 3)
    triangles.push({
      a: vertex(indices[index]!),
      b: vertex(indices[index + 1]!),
      c: vertex(indices[index + 2]!),
    });
  return triangles;
}

function heightOnTriangle(point: Vector3, { a, b, c }: SurfaceTriangle): number | null {
  const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  if (Math.abs(denominator) < 1e-12) return null;
  const wa = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / denominator;
  const wb = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / denominator;
  const wc = 1 - wa - wb;
  return Math.min(wa, wb, wc) >= -1e-7 ? wa * a.y + wb * b.y + wc * c.y : null;
}

function polygonArea(points: readonly Vector3[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.x * next.z - next.x * current.z;
  }
  return area / 2;
}

function clipPolygon(subject: readonly Vector3[], clipper: readonly Vector3[]): Vector3[] {
  let clipped = [...subject];
  const orientation = Math.sign(polygonArea(clipper)) || 1;
  for (let side = 0; side < clipper.length && clipped.length; side++) {
    const edgeStart = clipper[side]!;
    const edgeEnd = clipper[(side + 1) % clipper.length]!;
    const input = clipped;
    clipped = [];
    let previous = input[input.length - 1]!;
    let previousDistance =
      orientation *
      ((edgeEnd.x - edgeStart.x) * (previous.z - edgeStart.z) -
        (edgeEnd.z - edgeStart.z) * (previous.x - edgeStart.x));
    for (const current of input) {
      const currentDistance =
        orientation *
        ((edgeEnd.x - edgeStart.x) * (current.z - edgeStart.z) -
          (edgeEnd.z - edgeStart.z) * (current.x - edgeStart.x));
      if (previousDistance >= -1e-8 !== currentDistance >= -1e-8) {
        const amount = previousDistance / (previousDistance - currentDistance);
        clipped.push(Vector3.Lerp(previous, current, amount));
      }
      if (currentDistance >= -1e-8) clipped.push(current);
      previous = current;
      previousDistance = currentDistance;
    }
  }
  return clipped;
}

function clipHatchBand(start: Vector3, end: Vector3, corners: readonly Vector3[]): Vector3[] {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  // Keep strokes resolved at the mill overview, including native browser 125%.
  const halfWidth = 0.04;
  if (length < halfWidth * 2) return [];
  const along = new Vector3(dx / length, 0, dz / length);
  const across = new Vector3(-along.z, 0, along.x).scale(halfWidth);
  const extension =
    Math.max(...corners.map(({ x, z }) => Math.hypot(x - start.x, z - start.z))) + 1;
  const farStart = start.subtract(along.scale(extension));
  const farEnd = end.add(along.scale(extension));
  const band = [
    new Vector3(farStart.x - across.x, 0, farStart.z - across.z),
    new Vector3(farEnd.x - across.x, 0, farEnd.z - across.z),
    new Vector3(farEnd.x + across.x, 0, farEnd.z + across.z),
    new Vector3(farStart.x + across.x, 0, farStart.z + across.z),
  ];
  const clipped = clipPolygon(band, corners);
  return clipped.length >= 3 && Math.abs(polygonArea(clipped)) >= halfWidth * halfWidth
    ? clipped
    : [];
}

function appendHatchPolygon(
  polygon: readonly Vector3[],
  triangles: readonly SurfaceTriangle[],
  positions: number[],
  indices: number[],
) {
  for (const triangle of triangles) {
    const fragment = clipPolygon(polygon, [triangle.a, triangle.b, triangle.c]);
    if (fragment.length < 3 || Math.abs(polygonArea(fragment)) < 1e-12) continue;
    const heights = fragment.map((point) => heightOnTriangle(point, triangle));
    if (heights.some((height) => height === null)) continue;
    const first = positions.length / 3;
    for (const [index, point] of fragment.entries()) {
      positions.push(point.x, heights[index]! + 0.013, point.z);
    }
    for (let index = 1; index < fragment.length - 1; index++)
      indices.push(first, first + index, first + index + 1);
  }
}

function createMovementHatch(
  scene: Scene,
  cellKey: string,
  surface: BattleTerrainCell,
  fill: Mesh,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  const levels = surface.corners.map(({ x, z }) => x + z);
  const minimum = Math.min(...levels);
  const maximum = Math.max(...levels);
  const pitch = hatchPitch;
  const triangles = surfaceTriangles(fill);
  for (let level = Math.ceil(minimum / pitch) * pitch; level < maximum; level += pitch) {
    const line = hatchIntersections(surface.corners, level);
    if (line) {
      const polygon = clipHatchBand(line[0], line[1], surface.corners);
      appendHatchPolygon(polygon, triangles, positions, indices);
    }
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
    hatches.set(cellKey, createMovementHatch(scene, cellKey, surface, fill));
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

  // The clipped strips still own terrain/depth. Shade fine broken ink inside them:
  // derivatives cap close strokes in screen pixels without fading overview marks.
  const hatchMaterial = new ShaderMaterial(
    'movement-only-hatch',
    scene,
    {
      vertexSource: `precision highp float;
        attribute vec3 position;
        uniform mat4 worldViewProjection;
        varying vec2 ground;
        void main() {
          ground = position.xz;
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }`,
      fragmentSource: `#extension GL_OES_standard_derivatives : enable
        precision highp float;
        varying vec2 ground;
        void main() {
          float level = (ground.x + ground.y) / ${hatchPitch};
          float stroke = floor(level + 0.5);
          float along = ground.x - ground.y;
          float distance = abs(level - stroke) * ${hatchPitch} * 0.707107;
          float pixel = max(fwidth(distance), 0.00001);
          float grain = 0.85 + 0.15 * sin(along * 31.0 + stroke * 7.0);
          float core = 1.0 - smoothstep(min(0.022, pixel * 0.55) * grain,
            min(0.022, pixel * 0.55) * grain + pixel * 0.5, distance);
          float support = 1.0 - smoothstep(min(0.034, pixel * 1.1),
            min(0.034, pixel * 1.1) + pixel * 0.5, distance);
          float dash = fract(along / 0.9 + stroke * 0.37);
          float ink = 1.0 - smoothstep(0.68, 0.78, dash);
          gl_FragColor = vec4(vec3(mix(0.08, 0.62, core)), support * ink * 0.85);
        }`,
    },
    { attributes: ['position'], uniforms: ['worldViewProjection'], needAlphaBlending: true },
  );
  hatchMaterial.disableDepthWrite = true;
  hatchMaterial.backFaceCulling = false;
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

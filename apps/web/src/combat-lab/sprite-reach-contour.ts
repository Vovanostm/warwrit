import {
  Mesh,
  Vector3,
  VertexBuffer,
  VertexData,
  type Material,
  type Scene,
} from '@babylonjs/core';
import type { CombatLabHex } from '@warwrit/protocol';
import type { BattleTerrainCell } from '../renderer/battle-terrain.js';
import { exposedHexSides } from './sprite-scene-geometry.js';

interface ReachContourEdge {
  readonly start: Vector3;
  readonly end: Vector3;
  readonly side: Vector3;
}

const hexKey = ({ q, r }: CombatLabHex) => `${q},${r}`;

/** Owns the current reach perimeter and keeps its ribbon width fixed in screen pixels. */
export function createReachContour(
  scene: Scene,
  material: Material,
  terrainByHex: ReadonlyMap<string, BattleTerrainCell>,
  viewport: Pick<HTMLCanvasElement, 'clientHeight'>,
) {
  let contour: ReturnType<typeof createContourMesh> | null = null;
  let cellsKey: string | null = null;

  const refreshWidth = () => {
    const zoom = scene.activeCamera?.orthoTop;
    const viewportHeight = viewport.clientHeight;
    if (!contour || !zoom || !viewportHeight) return;
    contour.update(zoom, viewportHeight);
  };
  const renderObserver = scene.onBeforeRenderObservable.add(refreshWidth);

  return {
    get mesh() {
      return contour?.mesh ?? null;
    },
    setCells(cells: readonly CombatLabHex[]) {
      const orderedCells = [...new Map(cells.map((hex) => [hexKey(hex), hex])).values()].sort(
        (left, right) => hexKey(left).localeCompare(hexKey(right)),
      );
      const nextKey = orderedCells.map(hexKey).join('|');
      if (nextKey === cellsKey) return;
      cellsKey = nextKey;
      contour?.dispose();
      contour = null;

      const edges = exposedHexSides(orderedCells).flatMap(({ hex, side }) => {
        const surface = terrainByHex.get(hexKey(hex));
        if (!surface) return [];
        const start = surface.corners[side]!.add(new Vector3(0, 0.055, 0));
        const end = surface.corners[(side + 1) % 6]!.add(new Vector3(0, 0.055, 0));
        const direction = end.subtract(start);
        const perpendicular = new Vector3(-direction.z, 0, direction.x).normalize();
        return [{ start, end, side: perpendicular }];
      });
      if (edges.length === 0) return;
      contour = createContourMesh(scene, material, edges);
      refreshWidth();
    },
    dispose() {
      scene.onBeforeRenderObservable.remove(renderObserver);
      contour?.dispose();
      contour = null;
      cellsKey = null;
    },
  };
}

function createContourMesh(scene: Scene, material: Material, edges: readonly ReachContourEdge[]) {
  const mesh = new Mesh('weapon-skill-reach-contour', scene);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.renderingGroupId = 0;
  mesh.alphaIndex = 3;
  const positions = new Array<number>(edges.length * 12).fill(0);
  const indices = edges.flatMap((_, edge) => {
    const first = edge * 4;
    return [first, first + 1, first + 2, first, first + 2, first + 3];
  });
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.applyToMesh(mesh, true);

  return {
    mesh,
    update(zoom: number, viewportHeight: number) {
      if (
        !Number.isFinite(zoom) ||
        zoom <= 0 ||
        !Number.isFinite(viewportHeight) ||
        viewportHeight <= 0
      )
        return;
      // Four CSS pixels of half-width leaves margin over the two-pixel visibility floor.
      const halfWidth = (4 * zoom) / viewportHeight;
      const vertices = edges.flatMap(({ start, end, side }) => {
        const offset = side.scale(halfWidth);
        return [
          start.add(offset),
          end.add(offset),
          end.subtract(offset),
          start.subtract(offset),
        ].flatMap((point) => [point.x, point.y, point.z]);
      });
      // Recompute bounds with the moving camera-scaled ribbon; origin bounds cull distant contours.
      mesh.updateVerticesData(VertexBuffer.PositionKind, vertices, true, false);
    },
    dispose() {
      mesh.dispose(false, false);
    },
  };
}

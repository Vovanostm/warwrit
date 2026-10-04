import { Mesh, VertexData, type Material, type Scene } from '@babylonjs/core';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
type RoadMaterials = Readonly<Record<'trail' | 'dirt_road' | 'paved_road', Material>>;
type Banks = WorldContinuousMapDto['overlayShapes'][number]['polygon'];
type Height = (x: number, z: number) => number;
type Scale = (fp: number) => number;

function resampleBanks(polygon: Banks) {
  const leftBank: { xFp: number; zFp: number }[] = [],
    rightBank: typeof leftBank = [];
  const sourceStations = polygon.length / 2;
  for (let i = 0; i < sourceStations - 1; i++) {
    const a = polygon[i]!,
      b = polygon[i + 1]!;
    const c = polygon[polygon.length - 1 - i]!,
      d = polygon[polygon.length - 2 - i]!;
    const count = Math.max(
      1,
      Math.ceil(
        Math.max(
          Math.hypot(b.xFp - a.xFp, b.zFp - a.zFp),
          Math.hypot(d.xFp - c.xFp, d.zFp - c.zFp),
        ) / 24,
      ),
    );
    for (let j = 0; j < count; j++) {
      const t = j / count;
      leftBank.push({ xFp: a.xFp + (b.xFp - a.xFp) * t, zFp: a.zFp + (b.zFp - a.zFp) * t });
      rightBank.push({ xFp: c.xFp + (d.xFp - c.xFp) * t, zFp: c.zFp + (d.zFp - c.zFp) * t });
    }
  }
  leftBank.push(polygon[sourceStations - 1]!);
  rightBank.push(polygon[sourceStations]!);
  return [...leftBank, ...rightBank.reverse()];
}

function createCore(
  scene: Scene,
  points: Banks,
  heightAt: Height,
  sceneFp: Scale,
  material: Material,
  shapeId: string,
  index: number,
) {
  const road = new Mesh(`corridor:${shapeId}`, scene);
  const vertices = new VertexData();
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    widths: number[] = [],
    indices: number[] = [];
  const stations = points.length / 2;
  // Dense paired-bank stations preserve the canonical x/z polygon while following terrain.
  const crossSection = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1];
  const stationDistances: number[] = [];
  let distance = 0;
  let acrossAngle: number | undefined;
  let previous: { x: number; z: number } | undefined;
  for (let i = 0; i < stations; i += 1) {
    const left = points[i]!,
      right = points[points.length - 1 - i]!;
    const center = {
      x: (left.xFp + right.xFp) / 2,
      z: (left.zFp + right.zFp) / 2,
    };
    if (previous) distance += sceneFp(Math.hypot(center.x - previous.x, center.z - previous.z));
    previous = center;
    stationDistances.push(distance);
    const width = sceneFp(Math.hypot(right.xFp - left.xFp, right.zFp - left.zFp));
    let angle = Math.atan2(right.zFp - left.zFp, right.xFp - left.xFp);
    if (acrossAngle !== undefined)
      angle += Math.round((acrossAngle - angle) / (2 * Math.PI)) * 2 * Math.PI;
    acrossAngle = angle;
    for (const across of crossSection) {
      const crown = 0.007 * Math.sin(across * Math.PI);
      const x = sceneFp(left.xFp + (right.xFp - left.xFp) * across);
      const z = sceneFp(left.zFp + (right.zFp - left.zFp) * across);
      positions.push(x, heightAt(x, z) + 0.009 + index * 0.0002 + crown, z);
      uvs.push(across, distance);
      widths.push(width, angle);
    }
    if (i > 0) {
      for (let across = 0; across < crossSection.length - 1; across++) {
        const j = i * crossSection.length + across;
        const p = j - crossSection.length;
        indices.push(p, p + 1, j, p + 1, j + 1, j);
      }
    }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  vertices.positions = positions;
  vertices.normals = normals;
  vertices.indices = indices;
  vertices.uvs = uvs;
  vertices.uvs2 = widths;
  vertices.applyToMesh(road);
  road.material = material;
  road.isPickable = false;
  return { points, stationDistances };
}

function createShoulders(
  scene: Scene,
  geometry: ReturnType<typeof createCore>,
  heightAt: Height,
  sceneFp: Scale,
  material: Material,
  identity: { shapeId: string; index: number },
) {
  const { points, stationDistances } = geometry;
  const stations = points.length / 2;
  for (const side of [0, 1]) {
    const skirt = new Mesh(`shoulder:${identity.shapeId}:${side}`, scene);
    const data = new VertexData(),
      positions: number[] = [],
      normals: number[] = [],
      uvs: number[] = [],
      widths: number[] = [],
      indices: number[] = [];
    for (let i = 0; i < stations; i++) {
      const left = points[i]!,
        right = points[points.length - 1 - i]!;
      const inner = side === 0 ? left : right,
        opposite = side === 0 ? right : left;
      const length = Math.hypot(inner.xFp - opposite.xFp, inner.zFp - opposite.zFp);
      const outer = {
        xFp: inner.xFp + ((inner.xFp - opposite.xFp) / length) * 8,
        zFp: inner.zFp + ((inner.zFp - opposite.zFp) / length) * 8,
      };
      positions.push(
        sceneFp(inner.xFp),
        heightAt(sceneFp(inner.xFp), sceneFp(inner.zFp)) + 0.008,
        sceneFp(inner.zFp),
        sceneFp(outer.xFp),
        heightAt(sceneFp(outer.xFp), sceneFp(outer.zFp)) + 0.008,
        sceneFp(outer.zFp),
      );
      normals.push(0, 1, 0, 0, 1, 0);
      const distance = stationDistances[i]!;
      uvs.push(0, distance, 1, distance);
      widths.push(sceneFp(8), 0, sceneFp(8), 0);
      if (i > 0) {
        const j = i * 2;
        indices.push(j - 2, j, j - 1, j - 1, j, j + 1);
      }
    }
    data.positions = positions;
    data.normals = normals;
    data.uvs = uvs;
    data.uvs2 = widths;
    data.indices = indices;
    data.applyToMesh(skirt);
    skirt.material = material;
    skirt.isPickable = false;
    skirt.alphaIndex = identity.index;
  }
}

export function createMapRoads(
  scene: Scene,
  region: WorldContinuousMapDto,
  roadMaterials: RoadMaterials,
  shoulderMaterials: RoadMaterials,
  heightAt: Height,
) {
  const sceneFp = (fp: number) => (fp * (region.worldScale ?? 1)) / 1024;
  const ordered = region.overlayShapes.toSorted(
    (a, b) =>
      (region.navigationOverlayOrder?.indexOf(b.overlayId) ?? 0) -
      (region.navigationOverlayOrder?.indexOf(a.overlayId) ?? 0),
  );
  for (const [index, corridor] of ordered.entries()) {
    if (corridor.polygon.length < 4 || corridor.polygon.length % 2 !== 0) continue;
    const type =
      corridor.overlayId === 'paved_road' || corridor.overlayId === 'trail'
        ? corridor.overlayId
        : 'dirt_road';
    const points = resampleBanks(corridor.polygon);
    const geometry = createCore(
      scene,
      points,
      heightAt,
      sceneFp,
      roadMaterials[type],
      corridor.shapeId,
      index,
    );
    createShoulders(scene, geometry, heightAt, sceneFp, shoulderMaterials[type], {
      shapeId: corridor.shapeId,
      index,
    });
  }
}

import { Mesh, Vector3, VertexData, type Scene } from '@babylonjs/core';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { insidePolygon } from './map-geography.js';

const smooth = (t: number) => {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
};
function shapeWeight(x: number, z: number, polygon: WorldContinuousMapDto['boundary']) {
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!;
    const dx = b.xFp - a.xFp,
      dz = b.zFp - a.zFp;
    const t = Math.max(0, Math.min(1, ((x - a.xFp) * dx + (z - a.zFp) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - a.xFp - t * dx, z - a.zFp - t * dz));
  }
  const signed = insidePolygon(x, z, polygon) ? distance : -distance;
  return smooth(0.5 + signed / 640);
}

/** Presentation only. All consumers sample the triangles used by terrain ray picking. */
export function createMapSurface(scene: Scene, region: WorldContinuousMapDto) {
  const scale = (region.worldScale ?? 1) / 1024;
  const step = region.cellSizeFp * scale;
  const originX = region.origin.xFp * scale,
    originZ = region.origin.zFp * scale;
  const columns = region.columns,
    rows = region.rows,
    stride = columns + 1;
  const shapes = region.terrainShapes.filter((s) =>
    ['hills', 'rock', 'cliff', 'marsh', 'riverbank', 'deep_water'].includes(s.terrainId),
  );
  const authoredHeight = (x: number, z: number) => {
    const sx = x * scale,
      sz = z * scale;
    let y =
      0.28 +
      0.25 * Math.sin(sx * 0.65 + sz * 0.32) +
      0.18 * Math.sin(sz * 0.92 - sx * 0.37) +
      0.07 * Math.sin(sx * 1.6 + sz * 1.1);
    let wet = 0;
    for (const shape of shapes) {
      const weight = shapeWeight(x, z, shape.polygon);
      if (shape.terrainId === 'hills')
        y +=
          weight *
          (1.1 + 0.64 * Math.sin(sx * 0.75 + Math.sin(sz * 0.6)) + 0.4 * Math.cos(sz * 1.1));
      else if (shape.terrainId === 'rock' || shape.terrainId === 'cliff')
        y += weight * (shape.terrainId === 'cliff' ? 1.25 : 0.45);
      else wet = Math.max(wet, weight * (shape.terrainId === 'marsh' ? 0.8 : 1));
    }
    return y * (1 - wet);
  };
  const terraces = region.sites.map((site) => ({
    ...site.anchorFp,
    y: authoredHeight(site.anchorFp.xFp, site.anchorFp.zFp),
  }));
  const heights = new Float32Array(stride * (rows + 1));
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [],
    normals: number[] = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const x = region.origin.xFp + col * region.cellSizeFp;
      const z = region.origin.zFp + row * region.cellSizeFp;
      let y = authoredHeight(x, z);
      for (const site of terraces) {
        const influence = 1 - smooth((Math.hypot(x - site.xFp, z - site.zFp) - 140) / 220);
        y += (site.y - y) * influence;
      }
      heights[row * stride + col] = y;
      positions.push(x * scale, heights[row * stride + col]!, z * scale);
      uvs.push(col / columns, 1 - row / rows);
      if (row < rows && col < columns) {
        const a = row * stride + col,
          b = a + 1,
          c = a + stride,
          d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  const ground = new Mesh('continuous-ground', scene);
  const data = new VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.indices = indices;
  VertexData.ComputeNormals(positions, indices, normals);
  data.normals = normals;
  data.applyToMesh(ground);
  const heightAt = (x: number, z: number) => {
    const gx = Math.max(0, Math.min(columns - 0.000001, (x - originX) / step));
    const gz = Math.max(0, Math.min(rows - 0.000001, (z - originZ) / step));
    const col = Math.floor(gx),
      row = Math.floor(gz),
      u = gx - col,
      v = gz - row;
    const i = row * stride + col;
    const a = heights[i]!,
      b = heights[i + 1]!,
      c = heights[i + stride]!,
      d = heights[i + stride + 1]!;
    // Same diagonal as indices, not bilinear interpolation on a different surface.
    return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  };
  const drape = (a: { x: number; z: number }, b: { x: number; z: number }, lift = 0.018) => {
    const times = new Set([0, 1]);
    const addCrossings = (from: number, to: number) => {
      if (from === to) return;
      for (let k = Math.ceil(Math.min(from, to)); k < Math.max(from, to); k++) {
        const t = (k - from) / (to - from);
        if (t > 0 && t < 1) times.add(t);
      }
    };
    const ax = (a.x - originX) / step,
      az = (a.z - originZ) / step;
    const bx = (b.x - originX) / step,
      bz = (b.z - originZ) / step;
    addCrossings(ax, bx);
    addCrossings(az, bz);
    // Every cell's a/b/c diagonal lies on an integer gx+gz line.
    addCrossings(ax + az, bx + bz);
    return [...times]
      .sort((a, b) => a - b)
      .map((t) => {
        const x = a.x + (b.x - a.x) * t,
          z = a.z + (b.z - a.z) * t;
        return new Vector3(x, heightAt(x, z) + lift, z);
      });
  };
  return { ground, heightAt, step, drape };
}

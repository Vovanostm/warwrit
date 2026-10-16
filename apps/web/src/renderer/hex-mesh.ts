import { Mesh, MeshBuilder, VertexData, type Scene } from '@babylonjs/core';

/** The disc starts at 0° in XY; these rotations put pointy-top corners in XZ. */
export function createHexDisc(name: string, radius: number, scene: Scene): Mesh {
  const mesh = MeshBuilder.CreateDisc(name, { radius, tessellation: 6 }, scene);
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.y = Math.PI / 6;
  return mesh;
}

/** Babylon's torus starts at 90° in XZ, already pointy-top. Do not rotate it. */
export function createHexBorder(
  name: string,
  diameter: number,
  thickness: number,
  scene: Scene,
): Mesh {
  return MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 6 }, scene);
}

/** Exposed vertical faces use the same corners as the pointy-top surface. */
export function createHexSides(
  name: string,
  radius: number,
  top: number,
  bottoms: readonly number[],
  scene: Scene,
): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  for (let side = 0; side < 6; side++) {
    const bottom = bottoms[side] ?? 0;
    if (bottom >= top) continue;
    const first = (side * Math.PI) / 3 + Math.PI / 6;
    const second = first + Math.PI / 3;
    const x1 = Math.cos(first) * radius;
    const z1 = Math.sin(first) * radius;
    const x2 = Math.cos(second) * radius;
    const z2 = Math.sin(second) * radius;
    const offset = positions.length / 3;
    positions.push(x1, bottom, z1, x2, bottom, z2, x2, top, z2, x1, top, z1);
    // Preserve material grain size across level-one and level-two faces rather
    // than stretching the full square texture into each shallow wall.
    const u1 = (side * radius) / 2;
    const u2 = ((side + 1) * radius) / 2;
    uvs.push(u1, bottom / 2, u2, bottom / 2, u2, top / 2, u1, top / 2);
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.uvs = uvs;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(mesh);
  return mesh;
}

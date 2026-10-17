import { MeshBuilder, type Mesh, type Scene } from '@babylonjs/core';

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

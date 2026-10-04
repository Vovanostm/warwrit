import { Color3, Mesh, ShaderMaterial, VertexData, type Scene } from '@babylonjs/core';

/** Quiet ink-wash contacts on the same terrain triangles; no lights baked into mirrored art. */
export function createMapShadows(scene: Scene, heightAt: (x: number, z: number) => number) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const material = new ShaderMaterial(
    'map-contact-wash',
    scene,
    {
      vertexSource: `precision highp float; attribute vec3 position; attribute vec4 color;
      uniform mat4 worldViewProjection; varying float opacity;
      void main(){opacity=color.a;gl_Position=worldViewProjection*vec4(position,1);}`,
      fragmentSource: `precision highp float; varying float opacity; uniform vec3 tint;
      void main(){gl_FragColor=vec4(tint,opacity);}`,
    },
    {
      attributes: ['position', 'color'],
      uniforms: ['worldViewProjection', 'tint'],
      needAlphaBlending: true,
    },
  );
  material.setColor3('tint', new Color3(0.07, 0.065, 0.05));
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.zOffset = -1;
  const add = (x: number, z: number, size: number, opacity = 0.25) => {
    const start = positions.length / 3,
      sectors = 16,
      rings = 4;
    for (let ring = 0; ring <= rings; ring++) {
      const radius = ring / rings;
      for (let i = 0; i <= sectors; i++) {
        const angle = (i / sectors) * Math.PI * 2;
        const a = Math.cos(angle) * size * radius,
          b = Math.sin(angle) * size * radius * 0.48;
        const px = x + size * 0.25 + (a - b) * Math.SQRT1_2,
          pz = z + size * 0.3 + (a + b) * Math.SQRT1_2;
        positions.push(px, heightAt(px, pz) + 0.006, pz);
        colors.push(1, 1, 1, opacity * (1 - radius * radius) ** 2);
        if (ring > 0 && i > 0) {
          const j = start + ring * (sectors + 1) + i,
            p = j - sectors - 1;
          indices.push(p - 1, p, j - 1, p, j, j - 1);
        }
      }
    }
  };
  const finish = () => {
    const mesh = new Mesh('map-contact-shadows', scene),
      data = new VertexData();
    data.positions = positions;
    data.colors = colors;
    data.indices = indices;
    data.applyToMesh(mesh);
    mesh.material = material;
    mesh.isPickable = false;
  };
  return { add, finish };
}

import { Color3, Mesh, ShaderMaterial, VertexData, type Scene } from '@babylonjs/core';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { insidePolygon, nearPolygon } from './map-geography.js';

/** A finite decorative meadow, derived from public geography. Nothing here owns collision. */
export function createMapLife(
  scene: Scene,
  region: WorldContinuousMapDto,
  heightAt: (x: number, z: number) => number,
) {
  const scale = (region.worldScale ?? 1) / 1024;
  const minX = region.origin.xFp * scale,
    minZ = region.origin.zFp * scale;
  const maxX = minX + region.columns * region.cellSizeFp * scale;
  const maxZ = minZ + region.rows * region.cellSizeFp * scale;
  const terrain = [...region.terrainShapes].sort((a, b) => b.paintPriority - a.paintPriority);
  const positions: number[] = [],
    colors: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  let seed = 713;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const vertex = (x: number, y: number, z: number, bend: number, phase: number, color: Color3) => {
    positions.push(x, y + heightAt(x, z), z);
    uvs.push(bend, phase);
    const edge = Math.max(0, Math.min(1, Math.min(x - minX, maxX - x, z - minZ, maxZ - z) / 0.85));
    colors.push(color.r, color.g, color.b, edge * edge * (3 - 2 * edge));
  };
  const blade = (x: number, z: number, height: number, width: number, color: Color3) => {
    const angle = random() * Math.PI * 2;
    const dx = Math.cos(angle) * width,
      dz = Math.sin(angle) * width;
    const lean = (random() - 0.5) * height * 0.7;
    const phase = random() * Math.PI * 2;
    const start = positions.length / 3;
    const root = color.scale(0.55),
      tip = color.scale(1.17);
    vertex(x - dx, 0.006, z - dz, 0, phase, root);
    vertex(x + dx, 0.006, z + dz, 0, phase, root);
    vertex(x - dx * 0.45 + lean, height * 0.55, z - dz * 0.45, 0.3, phase, color);
    vertex(x + dx * 0.45 + lean, height * 0.55, z + dz * 0.45, 0.3, phase, color);
    vertex(x + lean * 1.6, height, z, 1, phase, tip);
    indices.push(
      start,
      start + 2,
      start + 1,
      start + 1,
      start + 2,
      start + 3,
      start + 2,
      start + 4,
      start + 3,
    );
  };
  const flower = (x: number, z: number, height: number) => {
    const color = random() < 0.7 ? new Color3(0.83, 0.77, 0.52) : new Color3(0.53, 0.48, 0.65);
    const radius = 0.013 + random() * 0.006;
    const phase = random() * 6;
    const start = positions.length / 3;
    vertex(x, height + radius, z, 1, phase, color);
    vertex(x - radius, height, z, 1, phase, color);
    vertex(x, height - radius, z, 1, phase, color.scale(0.7));
    vertex(x + radius, height, z, 1, phase, color);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };
  const stone = (x: number, z: number) => {
    const radius = 0.025 + random() * 0.045;
    const color = new Color3(0.36, 0.36, 0.3).scale(0.8 + random() * 0.4);
    const start = positions.length / 3;
    vertex(x - radius, 0.007, z - radius * 0.7, 0, 0, color.scale(0.65));
    vertex(x + radius, 0.007, z - radius * 0.5, 0, 0, color);
    vertex(x + radius * 0.4, 0.007, z + radius, 0, 0, color.scale(0.8));
    vertex(x - radius * 0.4, 0.007, z + radius * 0.7, 0, 0, color);
    vertex(x - radius * 0.2, radius * 0.65, z, 0, 0, color.scale(1.12));
    indices.push(
      start,
      start + 4,
      start + 1,
      start + 1,
      start + 4,
      start + 2,
      start + 2,
      start + 4,
      start + 3,
      start + 3,
      start + 4,
      start,
    );
  };
  for (let row = 0; row < region.rows; row += 2) {
    for (let column = 0; column < region.columns; column += 2) {
      const x = region.origin.xFp + (column + 0.1 + random() * 1.8) * region.cellSizeFp;
      const z = region.origin.zFp + (row + 0.1 + random() * 1.8) * region.cellSizeFp;
      const kind =
        terrain.find((shape) => insidePolygon(x, z, shape.polygon))?.terrainId ?? 'grassland';
      if (
        !insidePolygon(x, z, region.boundary) ||
        kind === 'deep_water' ||
        kind === 'cliff' ||
        kind === 'rock' ||
        region.blockingShapes.some((shape) => insidePolygon(x, z, shape.polygon)) ||
        region.overlayShapes.some((shape) => nearPolygon(x, z, shape.polygon, 28)) ||
        region.sites.some((site) => Math.hypot(site.anchorFp.xFp - x, site.anchorFp.zFp - z) < 175)
      )
        continue;
      const sx = x * scale,
        sz = z * scale;
      const patch =
        (Math.sin(sx * 0.84 + Math.sin(sz * 0.67) * 2) + Math.sin(sz * 1.17 + sx * 0.33)) * 0.25 +
        0.5;
      if (random() > 0.35 + patch * 0.6) continue;
      if (kind === 'hills' && random() < 0.24) stone(sx, sz);
      const reeds = kind === 'marsh' || kind === 'riverbank';
      const wooded = kind === 'forest';
      const count = reeds ? 4 : wooded ? 3 : 5 + Math.floor(random() * 3);
      const height = reeds ? 0.22 + random() * 0.14 : 0.14 + random() * 0.1;
      const green = random();
      const color = new Color3(0.28 + green * 0.12, 0.31 + green * 0.11, 0.17 + green * 0.07);
      for (let i = 0; i < count; i += 1) {
        blade(
          sx + (random() - 0.5) * 0.09,
          sz + (random() - 0.5) * 0.09,
          height * (0.65 + random() * 0.55),
          0.01,
          color.scale(0.85 + random() * 0.3),
        );
      }
      if (!wooded && !reeds && patch > 0.6 && random() < 0.1) flower(sx, sz, height * 0.8);
    }
  }
  const mesh = new Mesh('wind-meadow', scene);
  const data = new VertexData();
  data.positions = positions;
  data.colors = colors;
  data.uvs = uvs;
  data.indices = indices;
  data.applyToMesh(mesh);
  mesh.isPickable = false;
  const material = new ShaderMaterial(
    'wind-meadow',
    scene,
    {
      vertexSource: `precision highp float;
      attribute vec3 position; attribute vec4 color; attribute vec2 uv;
      uniform mat4 worldViewProjection; uniform float time;
      varying vec3 bladeColor; varying float edgeOpacity;
      void main(){
        vec3 p=position;
        float front=sin(p.x*0.71+p.z*0.39-time*1.65);
        float gust=0.55+0.45*sin(p.x*0.19-p.z*0.27-time*0.57);
        float flutter=sin(time*3.1+uv.y+p.x*2.0)*0.16;
        float bend=uv.x*(front*0.7+gust+flutter);
        p.x+=bend*0.065; p.z+=bend*0.038;
        p.y-=abs(bend)*uv.x*0.007;
        bladeColor=color.rgb*(0.94+0.06*front); edgeOpacity=color.a;
        gl_Position=worldViewProjection*vec4(p,1);
      }`,
      fragmentSource: `precision highp float; varying vec3 bladeColor; varying float edgeOpacity; uniform vec3 lighting;
      void main(){ if(edgeOpacity<0.01) discard; gl_FragColor=vec4(bladeColor*lighting,edgeOpacity); }`,
    },
    {
      attributes: ['position', 'color', 'uv'],
      uniforms: ['worldViewProjection', 'time', 'lighting'],
      needAlphaBlending: true,
    },
  );
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.setFloat('time', 0);
  material.setColor3('lighting', Color3.White());
  mesh.material = material;
  return material;
}

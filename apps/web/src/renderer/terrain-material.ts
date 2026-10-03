import type { Scene } from '@babylonjs/core';
import { Color3, RawTexture, ShaderMaterial, Texture, Vector2 } from '@babylonjs/core';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { MAP_ART } from './art.js';

// Shared lattice vertices sample only the image interior: neither mirrored motifs nor image
// borders can become a seam. Smooth weights preserve continuity between neighboring triangles.
const naturalTextureShader = `
  vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
  float landNoise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash2(i).x,hash2(i+vec2(1,0)).x,f.x),mix(hash2(i+vec2(0,1)).x,hash2(i+vec2(1)).x,f.x),f.y);
  }
  vec3 interiorPatch(sampler2D source,vec2 uv,vec2 vertex){
    vec2 random=hash2(vertex);
    float angle=random.x*6.2831853;
    mat2 rotation=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
    vec2 center=vec2(vertex.x+vertex.y*0.5,vertex.y*0.8660254);
    vec2 sampleUv=vec2(0.5)+(random-0.5)*0.18+rotation*(uv-center)*0.28;
    return texture2D(source,sampleUv).rgb;
  }
  vec3 naturalTile(sampler2D source,vec2 uv){
    vec2 skew=vec2(uv.x-uv.y*0.57735027,uv.y*1.15470054);
    vec2 base=floor(skew), f=fract(skew), a,b,c; vec3 blend;
    if(f.x+f.y<1.0){ a=base; b=base+vec2(1,0); c=base+vec2(0,1); blend=vec3(1.0-f.x-f.y,f.x,f.y); }
    else { a=base+vec2(1); b=base+vec2(0,1); c=base+vec2(1,0); blend=vec3(f.x+f.y-1.0,1.0-f.x,1.0-f.y); }
    blend=blend*blend*blend; blend/=dot(blend,vec3(1));
    return interiorPatch(source,uv,a)*blend.x+interiorPatch(source,uv,b)*blend.y+interiorPatch(source,uv,c)*blend.z;
  }`;

/** Public geography owns terrain boundaries; these weights only blend its appearance. */
export function createTerrainMaterial(scene: Scene, region: WorldContinuousMapDto) {
  const width = region.columns * region.cellSizeFp;
  const height = region.rows * region.cellSizeFp;
  const colors: Readonly<Record<string, readonly [string, string]>> = {
    grassland: ['#ff0000', '#000000'],
    forest: ['#00ff00', '#000000'],
    hills: ['#0000ff', '#000000'],
    marsh: ['#000000', '#ff0000'],
    riverbank: ['#000000', '#00ff00'],
    rock: ['#000000', '#0000ff'],
    cliff: ['#000000', '#0000ff'],
    deep_water: ['#000000', '#000000'],
  };
  const shapes = [
    ...region.terrainShapes,
    ...region.blockingShapes.map((s) => ({ ...s, terrainId: 'rock', paintPriority: 19 })),
  ].sort((a, b) => a.paintPriority - b.paintPriority);
  const controls = [0, 1].map((channel) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Terrain control texture unavailable');
    context.fillStyle = colors['grassland']![channel]!;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = 'blur(5px)';
    for (const shape of shapes) {
      context.beginPath();
      shape.polygon.forEach((point, i) => {
        const x = ((point.xFp - region.origin.xFp) / width) * canvas.width;
        const y = (1 - (point.zFp - region.origin.zFp) / height) * canvas.height;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.fillStyle = (colors[shape.terrainId] ?? colors['grassland'])![channel]!;
      context.fill();
    }
    const texture = RawTexture.CreateRGBATexture(
      new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data),
      canvas.width,
      canvas.height,
      scene,
      false,
      true,
      Texture.BILINEAR_SAMPLINGMODE,
    );
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    return texture;
  });
  const material = new ShaderMaterial(
    'continuous-terrain',
    scene,
    {
      vertexSource: `precision highp float;
      attribute vec3 position; attribute vec2 uv;
      uniform mat4 worldViewProjection; varying vec2 terrainUv;
      void main(){ terrainUv=uv; gl_Position=worldViewProjection*vec4(position,1.0); }`,
      fragmentSource: `precision highp float;
      varying vec2 terrainUv;
      uniform sampler2D controlA, controlB, grassMap, woodlandMap, hillsMap, marshMap, riverbankMap, rockMap, waterMap;
      uniform vec3 lighting; uniform vec2 detailScale,worldOffset; uniform float time;
      ${naturalTextureShader}
      void main(){
        vec3 a=texture2D(controlA,terrainUv).rgb, b=texture2D(controlB,terrainUv).rgb;
        float water=max(0.0,1.0-dot(a+b,vec3(1.0)));
        float sum=max(dot(a+b,vec3(1.0))+water,0.0001);
        a/=sum; b/=sum; water/=sum;
        vec2 uv=terrainUv*detailScale; vec3 color=vec3(0.0);
        if(a.r>0.001) color+=mix(naturalTile(grassMap,uv),vec3(0.34,0.37,0.20),0.24)*a.r;
        if(a.g>0.001) color+=naturalTile(woodlandMap,uv)*a.g;
        if(a.b>0.001) color+=naturalTile(hillsMap,uv)*a.b;
        if(b.r>0.001) color+=naturalTile(marshMap,uv)*b.r;
        if(b.g>0.001) color+=naturalTile(riverbankMap,uv)*b.g;
        if(b.b>0.001) color+=naturalTile(rockMap,uv)*b.b;
        if(water>0.001){
          vec2 drift=vec2(time*0.013,time*0.005);
          float ripples=sin(uv.x*31.0+uv.y*17.0-time*1.2+landNoise(uv*2.0)*6.0);
          color+=naturalTile(waterMap,uv*0.7+drift)*(1.0+0.045*ripples)*water;
        }
        float meadow=landNoise(uv*0.23+vec2(17,3));
        float variation=0.79+0.29*landNoise(uv*0.48)+0.08*landNoise(uv*1.8);
        vec3 tint=mix(vec3(0.84,0.94,0.83),vec3(1.07,1.01,0.87),meadow);
        color*=mix(vec3(1),tint,a.r+a.b*0.4);
        vec2 scenePoint=vec2(terrainUv.x,1.0-terrainUv.y)*detailScale*1.5+worldOffset;
        float windLight=sin(scenePoint.x*0.71+scenePoint.y*0.39-time*1.65);
        color*=1.0+a.r*0.055*windLight;
        float cloud=0.94+0.06*landNoise(uv*0.10+vec2(time*0.016,time*0.008));
        gl_FragColor=vec4(color*lighting*variation*cloud,1.0);
      }`,
    },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'lighting', 'detailScale', 'worldOffset', 'time'],
      samplers: [
        'controlA',
        'controlB',
        'grassMap',
        'woodlandMap',
        'hillsMap',
        'marshMap',
        'riverbankMap',
        'rockMap',
        'waterMap',
      ],
    },
  );
  material.setTexture('controlA', controls[0]!);
  material.setTexture('controlB', controls[1]!);
  const scale = (region.worldScale ?? 1) / 1024;
  material.setVector2('detailScale', new Vector2((width * scale) / 1.5, (height * scale) / 1.5));
  material.setVector2(
    'worldOffset',
    new Vector2(region.origin.xFp * scale, region.origin.zFp * scale),
  );
  material.setFloat('time', 0);
  for (const [sampler, url] of [
    ['grassMap', MAP_ART.terrainLayers.grass],
    ['woodlandMap', MAP_ART.terrainLayers.woodland],
    ['hillsMap', MAP_ART.terrainLayers.hills],
    ['marshMap', MAP_ART.terrainLayers.marsh],
    ['riverbankMap', MAP_ART.terrainLayers.riverbank],
    ['rockMap', MAP_ART.terrainLayers.rock],
    ['waterMap', MAP_ART.terrainLayers.water],
  ] as const) {
    const texture = new Texture(url, scene);
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 8;
    material.setTexture(sampler, texture);
  }
  material.setColor3('lighting', Color3.White());
  return material;
}

/** Three road surfaces share bank geometry and feather naturally into the ground. */
export function createRoadMaterial(scene: Scene, roadType: 'trail' | 'dirt_road' | 'paved_road') {
  const paved = roadType === 'paved_road';
  const material = new ShaderMaterial(
    `continuous-roads:${roadType}`,
    scene,
    {
      vertexSource: `precision highp float; attribute vec3 position; attribute vec2 uv;
      uniform mat4 worldViewProjection; varying vec2 roadUv,roadPoint;
      void main(){ roadUv=uv; roadPoint=position.xz; gl_Position=worldViewProjection*vec4(position,1.0); }`,
      fragmentSource: `precision highp float; varying vec2 roadUv,roadPoint;
      uniform sampler2D roadMap; uniform vec3 lighting, surfaceTint; uniform float paving, rutStrength;
      ${naturalTextureShader}
      void main(){
        float wear=landNoise(roadPoint*3.7);
        float waviness=0.04*(landNoise(roadPoint*7.0)-0.5);
        float edge=min(roadUv.x+waviness,1.0-roadUv.x-waviness);
        vec3 color=mix(naturalTile(roadMap,roadPoint*2.0),surfaceTint,0.28);
        if(paving>0.5){
          vec2 stoneUv=vec2(roadUv.x*5.0,roadUv.y*8.0);
          stoneUv.x+=mod(floor(stoneUv.y),2.0)*0.5;
          vec2 edgeUv=min(fract(stoneUv),1.0-fract(stoneUv));
          float stone=smoothstep(0.015,0.065,min(edgeUv.x,edgeUv.y));
          color*=mix(0.68,0.92+0.16*hash2(floor(stoneUv)).x,stone);
        }
        float ruts=1.0-smoothstep(0.025,0.10,min(abs(roadUv.x-0.32),abs(roadUv.x-0.68)));
        gl_FragColor=vec4(color*lighting*(0.83+0.10*wear-rutStrength*ruts),smoothstep(0.02,0.22+0.07*wear,edge)*0.90);
      }`,
    },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'lighting', 'surfaceTint', 'paving', 'rutStrength'],
      samplers: ['roadMap'],
      needAlphaBlending: true,
    },
  );
  const texture = new Texture(paved ? MAP_ART.terrainLayers.rock : MAP_ART.road, scene);
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 8;
  material.setTexture('roadMap', texture);
  material.setColor3('lighting', Color3.White());
  material.setColor3(
    'surfaceTint',
    Color3.FromHexString(paved ? '#8f9587' : roadType === 'trail' ? '#756047' : '#947253'),
  );
  material.setFloat('paving', paved ? 1 : 0);
  material.setFloat('rutStrength', roadType === 'dirt_road' ? 0.12 : 0);
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  return material;
}

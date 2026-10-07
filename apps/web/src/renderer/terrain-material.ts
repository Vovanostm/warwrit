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
    return pow(texture2D(source,sampleUv).rgb,vec3(2.2));
  }
  vec3 naturalTile(sampler2D source,vec2 uv){
    vec2 skew=vec2(uv.x-uv.y*0.57735027,uv.y*1.15470054);
    vec2 base=floor(skew), f=fract(skew), a,b,c; vec3 blend;
    if(f.x+f.y<1.0){ a=base; b=base+vec2(1,0); c=base+vec2(0,1); blend=vec3(1.0-f.x-f.y,f.x,f.y); }
    else { a=base+vec2(1); b=base+vec2(0,1); c=base+vec2(1,0); blend=vec3(f.x+f.y-1.0,1.0-f.x,1.0-f.y); }
    blend=blend*blend*blend; blend/=dot(blend,vec3(1));
    return interiorPatch(source,uv,a)*blend.x+interiorPatch(source,uv,b)*blend.y+interiorPatch(source,uv,c)*blend.z;
  }`;

function wetContactPoint(
  region: WorldContinuousMapDto,
  siteId: string,
  scale: number,
  offsetX: number,
  offsetZ: number,
) {
  const site = region.sites.find((candidate) => candidate.siteId === siteId);
  return site
    ? new Vector2(site.anchorFp.xFp * scale + offsetX, site.anchorFp.zFp * scale + offsetZ)
    : new Vector2(-1000, -1000);
}

/** Public geography owns terrain boundaries; these weights only blend its appearance. */
export function createTerrainMaterial(scene: Scene, region: WorldContinuousMapDto) {
  const width = region.columns * region.cellSizeFp;
  const height = region.rows * region.cellSizeFp;
  // Four opaque canvases encode RGB groups and the two fourth weights. Canvas alpha is
  // compositing coverage, so it cannot also encode marsh/water without losing painted regions.
  const colors: Readonly<Record<string, readonly string[]>> = {
    grassland: ['#ff0000', '#000000', '#000000', '#000000'],
    forest: ['#00ff00', '#000000', '#000000', '#000000'],
    hills: ['#0000ff', '#000000', '#000000', '#000000'],
    marsh: ['#000000', '#ff0000', '#000000', '#000000'],
    riverbank: ['#000000', '#000000', '#ff0000', '#000000'],
    rock: ['#000000', '#000000', '#00ff00', '#000000'],
    cliff: ['#000000', '#000000', '#0000ff', '#000000'],
    deep_water: ['#000000', '#000000', '#000000', '#ff0000'],
  };
  const shapes = [
    ...region.terrainShapes,
    ...region.blockingShapes.map((s) => ({ ...s, terrainId: 'rock', paintPriority: 19 })),
  ].toSorted(
    (a, b) =>
      a.paintPriority - b.paintPriority ||
      (a.shapeId < b.shapeId ? -1 : a.shapeId > b.shapeId ? 1 : 0),
  );
  const maskWidth = 1024,
    maskHeight = 768;
  const layers = [0, 1, 2, 3].map((channel) => {
    const canvas = document.createElement('canvas');
    canvas.width = maskWidth;
    canvas.height = maskHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Terrain control texture unavailable');
    context.fillStyle = colors['grassland']![channel]!;
    context.fillRect(0, 0, maskWidth, maskHeight);
    // An authored 80fp soft transition, independent of map dimensions, zoom and DPR.
    context.filter = `blur(${(80 * maskWidth) / width}px)`;
    for (const shape of shapes) {
      context.beginPath();
      shape.polygon.forEach((p, i) => {
        const x = ((p.xFp - region.origin.xFp) / width) * maskWidth;
        // Babylon ground V grows towards +z. Upload uses invertY=true exactly once.
        const y = (1 - (p.zFp - region.origin.zFp) / height) * maskHeight;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.fillStyle = (colors[shape.terrainId] ?? colors['grassland'])![channel]!;
      context.fill();
    }
    return context.getImageData(0, 0, maskWidth, maskHeight).data;
  });
  const controls = [0, 1].map((group) => {
    const data = new Uint8Array(maskWidth * maskHeight * 4);
    const rgb = layers[group * 2]!,
      alpha = layers[group * 2 + 1]!;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = rgb[i]!;
      data[i + 1] = rgb[i + 1]!;
      data[i + 2] = rgb[i + 2]!;
      data[i + 3] = alpha[i]!;
    }
    const texture = RawTexture.CreateRGBATexture(
      data,
      maskWidth,
      maskHeight,
      scene,
      false,
      true,
      Texture.BILINEAR_SAMPLINGMODE,
    );
    texture.gammaSpace = false;
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    return texture;
  });
  const material = new ShaderMaterial(
    'continuous-terrain',
    scene,
    {
      vertexSource: `precision highp float;
      attribute vec3 position,normal; attribute vec2 uv;
      uniform mat4 worldViewProjection; varying vec2 terrainUv; varying vec3 groundNormal;
      void main(){ terrainUv=uv; groundNormal=normal; gl_Position=worldViewProjection*vec4(position,1.0); }`,
      fragmentSource: `precision highp float;
      varying vec2 terrainUv; varying vec3 groundNormal;
      uniform sampler2D controlA, controlB, grassMap, woodlandMap, hillsMap, marshMap, riverbankMap, rockMap, waterMap;
      uniform vec3 lighting,edgeMist; uniform vec2 detailScale,worldOffset,wetSettlementPoint,millWheelPoint; uniform float time;
      ${naturalTextureShader}
      void main(){
        vec4 a=max(texture2D(controlA,terrainUv),vec4(0)), b=max(texture2D(controlB,terrainUv),vec4(0));
        float sum=max(dot(a+b,vec4(1.0)),0.0001);
        a/=sum; b/=sum; float water=b.a;
        vec2 uv=terrainUv*detailScale; vec3 color=vec3(0.0);
        if(a.r>0.001) color+=naturalTile(grassMap,uv)*a.r;
        if(a.g>0.001) color+=naturalTile(woodlandMap,uv)*a.g;
        if(a.b>0.001) color+=naturalTile(hillsMap,uv)*a.b;
        if(a.a>0.001) color+=naturalTile(marshMap,uv)*a.a;
        if(b.r>0.001) color+=naturalTile(riverbankMap,uv)*b.r;
        if(b.g>0.001) color+=naturalTile(rockMap,uv)*b.g;
        if(b.b>0.001) color+=naturalTile(rockMap,uv)*vec3(0.64,0.68,0.72)*b.b;
        if(water>0.001){
          vec2 drift=vec2(time*0.013,time*0.005);
          float ripples=sin(uv.x*31.0+uv.y*17.0-time*1.2+landNoise(uv*2.0)*6.0);
          color+=naturalTile(waterMap,uv*0.7+drift)*(1.0+0.045*ripples)*water;
        }
        vec2 scenePoint=vec2(terrainUv.x,1.0-terrainUv.y)*detailScale*1.5+worldOffset;
        vec2 villageOffset=scenePoint-wetSettlementPoint;
        float villageDistance=length(villageOffset);
        float bankNoise=landNoise(villageOffset*1.7+vec2(8.3,2.1));
        float villageEdge=1.15+(bankNoise-0.5)*0.55;
        float villageWet=1.0-smoothstep(villageEdge-0.16,villageEdge+0.16,villageDistance);
        if(villageWet>0.001){
          float pools=landNoise(villageOffset*2.5+vec2(4.7,11.2));
          float islands=landNoise(villageOffset*1.35+vec2(17.1,5.4));
          float poolMask=smoothstep(0.49,0.70,pools)*(1.0-smoothstep(0.54,0.76,islands)*0.55);
          vec2 wetUv=uv*0.78+vec2(time*0.002,time*0.0007);
          vec3 poolWater=naturalTile(waterMap,wetUv);
          vec3 peat=naturalTile(marshMap,uv);
          float peatLip=1.0-smoothstep(0.0,0.07,abs(pools-0.49));
          float reflection=pow(0.5+0.5*sin((villageOffset.y-villageOffset.x)*19.0+pools*5.0),14.0);
          color=mix(color,peat*0.84,villageWet*0.08);
          color=mix(color,poolWater*0.78+vec3(0.026,0.033,0.043),villageWet*poolMask*0.68);
          color=mix(color,peat*0.84,villageWet*peatLip*0.16);
          color+=vec3(0.022,0.029,0.038)*villageWet*poolMask*reflection;
          float outerPeat=1.0-smoothstep(0.0,0.09,abs(villageDistance-villageEdge));
          color=mix(color,peat*0.86,villageWet*outerPeat*0.16);
        }
        vec2 millOffset=scenePoint-millWheelPoint;
        float millDistance=length(millOffset);
        float millBankNoise=landNoise(millOffset*2.1+vec2(3.9,14.2));
        float millEdge=0.24+(millBankNoise-0.5)*0.12;
        float millWet=1.0-smoothstep(millEdge-0.07,millEdge+0.07,millDistance);
        if(millWet>0.001){
          float puddleNoise=landNoise(millOffset*5.2+vec2(9.1,6.3));
          float millPools=smoothstep(0.51,0.71,puddleNoise);
          float millIslands=landNoise(millOffset*2.2+vec2(2.8,18.7));
          millPools*=1.0-smoothstep(0.55,0.77,millIslands)*0.52;
          float wheelCore=1.0-smoothstep(0.12,0.18,millDistance);
          millPools=max(millPools,wheelCore);
          vec2 millWaterUv=uv*0.82+vec2(time*0.0015,time*0.0005);
          vec3 millWater=naturalTile(waterMap,millWaterUv);
          vec3 millPeat=naturalTile(marshMap,uv);
          float millLip=1.0-smoothstep(0.0,0.06,abs(puddleNoise-0.51));
          float wheelGlint=pow(0.5+0.5*sin((millOffset.y-millOffset.x)*22.0+puddleNoise*4.0),14.0);
          float waterMouth=max(wheelCore,millWet*millPools*0.76);
          color=mix(color,millWater*0.78+vec3(0.026,0.033,0.043),waterMouth);
          color=mix(color,millPeat*0.84,millWet*millLip*0.15);
          color+=vec3(0.022,0.029,0.038)*millWet*millPools*wheelGlint;
        }
        float meadow=landNoise(uv*0.23+vec2(17,3));
        float variation=0.94+0.08*landNoise(uv*0.48)+0.025*landNoise(uv*1.8);
        vec3 tint=mix(vec3(0.84,0.94,0.83),vec3(1.07,1.01,0.87),meadow);
        color*=mix(vec3(1),tint,a.r+a.b*0.4);
        float windLight=sin(scenePoint.x*0.71+scenePoint.y*0.39-time*1.65);
        color*=1.0+a.r*0.025*windLight;
        float cloud=0.94+0.06*landNoise(uv*0.10+vec2(time*0.016,time*0.008));
        float slopeLight=0.28+0.90*max(dot(normalize(groundNormal),normalize(vec3(-0.5,1.0,-0.6))),0.0);
        vec3 shaded=pow(max(color*lighting*variation*cloud,vec3(0)),vec3(1.0/2.2))*slopeLight;
        // A quiet atmospheric edge ends the displayed atlas without adding walkable land.
        vec2 edgeDistance=min(terrainUv,1.0-terrainUv)*detailScale*1.5;
        float edge=smoothstep(0.0,0.85,min(edgeDistance.x,edgeDistance.y));
        gl_FragColor=vec4(mix(edgeMist,shaded,edge),1.0);
      }`,
    },
    {
      attributes: ['position', 'normal', 'uv'],
      uniforms: [
        'worldViewProjection',
        'lighting',
        'edgeMist',
        'detailScale',
        'worldOffset',
        'wetSettlementPoint',
        'millWheelPoint',
        'time',
      ],
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
  // Cosmetic wet contacts preserve the established stilt settlement and ruined wheel.
  // They do not alter canonical terrain, navigation, roads or the height field.
  material.setVector2('wetSettlementPoint', wetContactPoint(region, 'tikhaya-gat', scale, 0, 0));
  material.setVector2(
    'millWheelPoint',
    wetContactPoint(region, 'staraya-melnitsa', scale, 0.46 * Math.SQRT1_2, 0.26 * Math.SQRT1_2),
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
    const texture = new Texture(url, scene, { useSRGBBuffer: false, gammaSpace: true });
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 8;
    material.setTexture(sampler, texture);
  }
  material.setColor3('lighting', Color3.White());
  material.setColor3('edgeMist', new Color3(0.2, 0.22, 0.21));
  return material;
}

/** Shared-bank roads: distance UVs, shallow lit crown and quiet earthen margins. */
export function createRoadMaterial(
  scene: Scene,
  roadType: 'trail' | 'dirt_road' | 'paved_road',
  shoulder = false,
) {
  const paved = roadType === 'paved_road';
  const material = new ShaderMaterial(
    `continuous-roads:${roadType}:${shoulder ? 'margin' : 'core'}`,
    scene,
    {
      vertexSource: `precision highp float;
      attribute vec3 position,normal; attribute vec2 uv,uv2;
      uniform mat4 worldViewProjection; varying vec2 roadUv,roadPoint; varying float roadWidth;
      varying vec3 surfaceNormal; varying vec2 acrossRoad;
      void main(){
        roadUv=uv; roadWidth=uv2.x; roadPoint=position.xz; surfaceNormal=normal; acrossRoad=vec2(cos(uv2.y),sin(uv2.y));
        gl_Position=worldViewProjection*vec4(position,1.0);
      }`,
      fragmentSource: `precision highp float;
      varying vec2 roadUv,roadPoint; varying float roadWidth; varying vec3 surfaceNormal; varying vec2 acrossRoad;
      uniform sampler2D roadMap,soilMap; uniform vec3 lighting; uniform float paving,trail,shoulder;
      ${naturalTextureShader}
      void main(){
        // Longitudinal V never restarts at a station; width stays in world units.
        vec2 detail=vec2(roadUv.x*roadWidth,roadUv.y)*7.0;
        vec3 sourceColor=naturalTile(roadMap,detail);
        vec3 albedo=sourceColor;
        float broadWear=landNoise(vec2(roadUv.x*4.0,roadUv.y*1.8));
        float edge=min(roadUv.x,1.0-roadUv.x);
        float margin=1.0-smoothstep(0.015,0.18+0.025*broadWear,edge);
        float wander=(landNoise(vec2(roadUv.y*2.2,17.0))-0.5)*0.025;
        float tracks=1.0-smoothstep(0.018,0.085,
          min(abs(roadUv.x-0.30-wander),abs(roadUv.x-0.70-wander)));
        float centre=1.0-smoothstep(0.10,0.46,abs(roadUv.x-0.5));
        float worn=(1.0-trail)*tracks+trail*centre;
        vec3 dusty=pow(vec3(0.43,0.40,0.32),vec3(2.2));
        float grit=landNoise(detail*14.0);
        vec3 soil=mix(naturalTile(soilMap,roadPoint*7.0),dusty,0.35);
        albedo=mix(albedo,soil,margin*(0.55+0.30*grit));
        // Restrained contact wear inside the physical banks; the outer skirt is soil.
        albedo*=1.0-margin*(0.06+0.05*grit);
        albedo*=1.0-(1.0-paving)*worn*(0.16+0.08*broadWear);
        // Broad crown normals respond to the same north-west sky direction as sprites.
        // Restrained grain contrast suggests wear without glossy specular or fake curbs.
        vec3 crossSample=naturalTile(roadMap,detail+vec2(0.035,0.0));
        vec3 alongSample=naturalTile(roadMap,detail+vec2(0.0,0.035));
        vec3 luma=vec3(0.2126,0.7152,0.0722);
        vec2 grain=vec2(dot(sourceColor-crossSample,luma),dot(sourceColor-alongSample,luma));
        vec2 slope=acrossRoad*grain.x+vec2(-acrossRoad.y,acrossRoad.x)*grain.y;
        vec3 normal=normalize(surfaceNormal+vec3(slope.x,0.0,slope.y)*(paving*1.5+0.4));
        float diffuse=dot(normal,normalize(vec3(-0.5,1.0,-0.6)));
        float relief=0.48+0.64*max(diffuse,0.0);
        float variation=0.93+0.09*landNoise(roadPoint*3.7);
        float alpha=1.0;
        if(shoulder>0.5){
          albedo=soil;
          alpha=(1.0-smoothstep(0.0,1.0,roadUv.x))*0.50;
        }
        gl_FragColor=vec4(pow(max(albedo*lighting*relief*variation,vec3(0)),vec3(1.0/2.2)),alpha);
      }`,
    },
    {
      attributes: ['position', 'normal', 'uv', 'uv2'],
      uniforms: ['worldViewProjection', 'lighting', 'paving', 'trail', 'shoulder'],
      samplers: ['roadMap', 'soilMap'],
      needAlphaBlending: shoulder,
    },
  );
  const texture = new Texture(MAP_ART.roads[shoulder ? 'trail' : roadType], scene, {
    useSRGBBuffer: false,
    gammaSpace: true,
  });
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 8;
  material.setTexture('roadMap', texture);
  const soilTexture = new Texture(MAP_ART.roads.trail, scene, {
    useSRGBBuffer: false,
    gammaSpace: true,
  });
  soilTexture.wrapU = soilTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  soilTexture.anisotropicFilteringLevel = 8;
  material.setTexture('soilMap', soilTexture);
  material.setColor3('lighting', Color3.White());
  material.setFloat('shoulder', shoulder ? 1 : 0);
  material.setFloat('paving', paved && !shoulder ? 1 : 0);
  material.setFloat('trail', roadType === 'trail' ? 1 : 0);
  material.backFaceCulling = false;
  material.disableDepthWrite = shoulder;
  material.zOffset = shoulder ? -1 : paved ? -6 : roadType === 'dirt_road' ? -4 : -2;
  return material;
}

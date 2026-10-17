import {
  Color3,
  Mesh,
  MeshBuilder,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  Vector3,
  VertexBuffer,
  VertexData,
  type Scene,
} from '@babylonjs/core';
import type { CombatLabHex, CombatLabTile } from '@warwrit/protocol';
import mudUrl from '../../../../assets/art/combat/readable-terrain-2026-10-16/mud.png';
import fireUrl from '../../../../assets/art/combat/readable-terrain-2026-10-16/fire.png';
import fireCrescentUrl from '../../../../assets/art/combat/readable-terrain-2026-10-16/fire-crescent.png';
import fireStubsUrl from '../../../../assets/art/combat/readable-terrain-2026-10-16/fire-stubs.png';
import dirt from '../../../../assets/art/combat/readable-terrain-2026-10-16/earth-ink.png';
import { BATTLE_ART } from '../renderer/art.js';
import {
  createBattleSurface,
  createBattleTerrain as createTerrainMap,
  type BattleTerrainCell,
} from '../renderer/battle-terrain.js';
import { naturalTextureShader } from '../renderer/terrain-material.js';
import { CAMERA_ELEVATION } from '../renderer/three-quarter-camera.js';
import { BATTLE_HEX_RADIUS, BATTLE_LAYOUT, battleHexToWorld } from './battle-layout.js';

const GROUND_TEXTURE_WORLD_SIZE = 3.2;
const key = ({ q, r }: CombatLabHex) => `${q},${r}`;

type Palette = { readonly day: Color3; readonly night: Color3 };

function groundMaterial(
  name: string,
  texture: Texture,
  palette: Palette,
  surface: 'plain' | 'mud' | 'fire' | 'blocked',
  scene: Scene,
  earthTexture: Texture,
): ShaderMaterial {
  const result = new ShaderMaterial(
    name,
    scene,
    {
      vertexSource: `precision highp float;
        attribute vec3 position; attribute vec2 uv;
        uniform mat4 worldViewProjection; varying vec2 groundUv,cellPoint;
        void main(){ groundUv=uv; cellPoint=position.xz; gl_Position=worldViewProjection*vec4(position,1.0); }`,
      fragmentSource: `precision highp float;
        varying vec2 groundUv,cellPoint; uniform sampler2D terrainMap,earthMap;
        uniform vec3 tint,lighting,earthTint; uniform float detailScale,blendSurface;
        ${naturalTextureShader}
        void main(){
          vec2 worldUv=groundUv*detailScale;
          // Two independent world scales break repeated motifs without stretching ink marks.
          vec3 color=mix(naturalTile(terrainMap,worldUv),
            naturalTile(terrainMap,worldUv*0.61+vec2(19.7,6.4)),0.38);
          // Terrain patches have ragged soil transitions; the optional grid owns exact cell edges.
          vec2 point=abs(cellPoint);
          float edge=max(point.x,point.x*0.5+point.y*0.8660254)/${BATTLE_LAYOUT.spacing / 2};
          float coverage=(1.0-smoothstep(0.60,1.05,edge+(landNoise(groundUv*9.0)-0.5)*0.28))*(1.0-smoothstep(0.95,1.0,edge))*blendSurface;
          vec2 earthUv=groundUv*1.2;
          vec3 earth=mix(naturalTile(earthMap,earthUv),naturalTile(earthMap,earthUv*0.61+vec2(19.7,6.4)),0.38);
          color=mix(earth*earthTint,color*tint,coverage);
          gl_FragColor=vec4(pow(max(color*lighting,vec3(0.0)),vec3(1.0/2.2)),1.0);
        }`,
    },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'worldViewProjection',
        'tint',
        'lighting',
        'detailScale',
        'earthTint',
        'blendSurface',
      ],
      samplers: ['terrainMap', 'earthMap'],
    },
  );
  result.setTexture('terrainMap', texture);
  result.setTexture('earthMap', earthTexture);
  result.setFloat('blendSurface', surface === 'plain' ? 0 : 1);
  result.setColor3('tint', palette.day);
  result.setColor3('lighting', Color3.White());
  result.setFloat('detailScale', surface === 'mud' ? 1.8 : 1.2);
  return result;
}

function setContinuousGroundUv(mesh: Mesh): void {
  mesh.computeWorldMatrix(true);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) return;
  const uvs: number[] = [];
  for (let offset = 0; offset < positions.length; offset += 3) {
    const world = Vector3.TransformCoordinates(
      new Vector3(positions[offset]!, positions[offset + 1]!, positions[offset + 2]!),
      mesh.getWorldMatrix(),
    );
    uvs.push(world.x / GROUND_TEXTURE_WORLD_SIZE, world.z / GROUND_TEXTURE_WORLD_SIZE);
  }
  mesh.setVerticesData(VertexBuffer.UVKind, uvs);
}

function textureFor(
  url: string,
  scene: Scene,
  textures: Map<string, Texture>,
  hasAlpha = false,
): Texture {
  let texture = textures.get(url);
  if (!texture) {
    texture = new Texture(url, scene, { useSRGBBuffer: false, gammaSpace: true });
    texture.hasAlpha = hasAlpha;
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    textures.set(url, texture);
  }
  return texture;
}

function terrainSurface(tile: CombatLabTile): 'plain' | 'mud' | 'fire' | 'blocked' {
  if (tile.blocked) return 'blocked';
  return tile.terrain;
}

function addScorch(
  scene: Scene,
  center: { readonly x: number; readonly z: number },
  groundY: number,
  hex: CombatLabHex,
  material: StandardMaterial,
  seed: number,
): void {
  const radius = 0.2 + ((seed >>> 3) % 8) / 100;
  const points = 7;
  const positions = [0, 0.001, 0];
  const indices: number[] = [];
  for (let index = 0; index < points; index++) {
    const angle = (index * Math.PI * 2) / points;
    const wobble = 0.72 + (((seed >>> (index % 5)) + index * 11) % 23) / 100;
    positions.push(Math.cos(angle) * radius * wobble, 0.001, Math.sin(angle) * radius * wobble);
    indices.push(0, ((index + 1) % points) + 1, index + 1);
  }
  const mesh = new Mesh(`charred-ground:${key(hex)}`, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(mesh);
  mesh.position.set(center.x, groundY, center.z);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.renderingGroupId = 0;
  mesh.metadata = { combatHex: { q: hex.q, r: hex.r } };
}

export function mountBattleTerrain(
  scene: Scene,
  tiles: readonly CombatLabTile[],
  initialNight: boolean,
): {
  readonly apron: Mesh;
  readonly terrainByHex: ReadonlyMap<string, BattleTerrainCell>;
  setNight(night: boolean): void;
} {
  const terrainByHex = createTerrainMap(tiles, BATTLE_LAYOUT);
  const textures = new Map<string, Texture>();
  const dirtTexture = textureFor(dirt, scene, textures);
  const mudTexture = textureFor(mudUrl, scene, textures);
  const palettes: Record<'plain' | 'mud' | 'fire' | 'blocked', Palette> = {
    plain: { day: new Color3(0.88, 0.83, 0.75), night: new Color3(0.62, 0.65, 0.67) },
    mud: { day: new Color3(0.94, 0.97, 1), night: new Color3(0.49, 0.46, 0.43) },
    fire: { day: new Color3(0.16, 0.14, 0.13), night: new Color3(0.14, 0.14, 0.15) },
    blocked: { day: new Color3(0.7, 0.68, 0.64), night: new Color3(0.52, 0.56, 0.58) },
  };
  const groundMaterials = {
    plain: groundMaterial(
      'battle-ground:plain-dry-earth',
      dirtTexture,
      palettes.plain,
      'plain',
      scene,
      dirtTexture,
    ),
    mud: groundMaterial(
      'battle-ground:mud-puddles',
      mudTexture,
      palettes.mud,
      'mud',
      scene,
      dirtTexture,
    ),
    fire: groundMaterial(
      'battle-ground:charred-earth',
      dirtTexture,
      palettes.fire,
      'fire',
      scene,
      dirtTexture,
    ),
    blocked: groundMaterial(
      'battle-ground:rubble-earth',
      dirtTexture,
      palettes.blocked,
      'blocked',
      scene,
      dirtTexture,
    ),
  };
  const centres = tiles.map(battleHexToWorld);
  const minX = Math.min(0, ...centres.map(({ x }) => x)) - BATTLE_HEX_RADIUS;
  const maxX = Math.max(0, ...centres.map(({ x }) => x)) + BATTLE_HEX_RADIUS;
  const minZ = Math.min(0, ...centres.map(({ z }) => z)) - BATTLE_HEX_RADIUS;
  const maxZ = Math.max(0, ...centres.map(({ z }) => z)) + BATTLE_HEX_RADIUS;
  const apron = MeshBuilder.CreateGround(
    'battle-ground:painted-world-apron',
    { width: maxX - minX + 24, height: maxZ - minZ + 24 },
    scene,
  );
  apron.position.set((minX + maxX) / 2, -0.04, (minZ + maxZ) / 2);
  apron.material = groundMaterials.plain;
  apron.isPickable = false;
  apron.renderingGroupId = 0;
  setContinuousGroundUv(apron);
  const scorchMaterial = new StandardMaterial('battle-ground:charred-scorch', scene);
  scorchMaterial.disableLighting = true;
  scorchMaterial.diffuseColor = new Color3(0.14, 0.12, 0.11);
  scorchMaterial.specularColor = Color3.Black();
  const emberMaterials = [fireUrl, fireCrescentUrl, fireStubsUrl].map((url, index) => {
    const material = new StandardMaterial(`battle-ground:fire-embers:${index}`, scene);
    material.diffuseTexture = textureFor(url, scene, textures, true);
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.linkEmissiveWithDiffuse = true;
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    return material;
  });
  const rubbleMaterial = new StandardMaterial('battle-ground:rubble-ink', scene);
  rubbleMaterial.diffuseTexture = textureFor(BATTLE_ART.rubble, scene, textures, true);
  rubbleMaterial.useAlphaFromDiffuseTexture = true;
  rubbleMaterial.disableLighting = true;
  rubbleMaterial.linkEmissiveWithDiffuse = true;
  rubbleMaterial.diffuseColor = Color3.White();
  rubbleMaterial.emissiveColor = Color3.White();
  rubbleMaterial.specularColor = Color3.Black();
  rubbleMaterial.backFaceCulling = false;
  rubbleMaterial.disableDepthWrite = true;

  const createTile = (tile: CombatLabTile) => {
    const tileKey = key(tile);
    const point = battleHexToWorld(tile);
    const groundY = tile.height * BATTLE_LAYOUT.heightStep;
    const cell = terrainByHex.get(tileKey)!;
    const ground = createBattleSurface(`ground:${tileKey}`, cell, scene);
    ground.material = groundMaterials[terrainSurface(tile)];
    ground.isPickable = true;
    ground.renderingGroupId = 0;
    ground.metadata = { combatHex: { q: tile.q, r: tile.r } };
    setContinuousGroundUv(ground);

    if (tile.blocked) {
      const rubbleSize = 1.1;
      const visibleCenterOffset = (288.5 / 512 - 0.5) * rubbleSize;
      const rubble = MeshBuilder.CreatePlane(
        `rubble:${tileKey}`,
        {
          width: rubbleSize,
          height: rubbleSize,
        },
        scene,
      );
      rubble.rotation.x = CAMERA_ELEVATION;
      rubble.position.set(
        point.x,
        groundY + visibleCenterOffset * Math.cos(CAMERA_ELEVATION),
        point.z + visibleCenterOffset * Math.sin(CAMERA_ELEVATION),
      );
      rubble.material = rubbleMaterial;
      rubble.isPickable = false;
      rubble.renderingGroupId = 1;
      rubble.metadata = {
        combatHex: { q: tile.q, r: tile.r },
        combatFoot: new Vector3(point.x, groundY, point.z),
      };
    }

    if (tile.terrain === 'fire') {
      addScorch(
        scene,
        point,
        groundY,
        tile,
        scorchMaterial,
        (tile.q * 73856093) ^ (tile.r * 19349663),
      );
      const emberWidth = BATTLE_LAYOUT.spacing * (0.8 + ((tile.q * 17 + tile.r * 13) % 7) * 0.02);
      const ember = MeshBuilder.CreatePlane(
        `fire-embers:${tileKey}`,
        {
          width: emberWidth,
          height: (emberWidth * 1024) / 1536,
        },
        scene,
      );
      ember.rotation.x = CAMERA_ELEVATION;
      ember.position.set(
        point.x + (((tile.r * 11 + tile.q) % 5) - 2) * 0.04,
        groundY + 0.36 * Math.cos(CAMERA_ELEVATION),
        point.z - 0.42 + 0.36 * Math.sin(CAMERA_ELEVATION),
      );
      const variant = ((tile.q * 73856093) ^ (tile.r * 19349663)) >>> 0;
      ember.material = emberMaterials[variant % emberMaterials.length]!;
      ember.isPickable = false;
      ember.renderingGroupId = 0;
      ember.metadata = ground.metadata;
    }
  };
  tiles.forEach(createTile);

  const lightByPhase = {
    day: { terrain: Color3.White(), rubble: Color3.White(), embers: Color3.White() },
    night: {
      terrain: new Color3(0.44, 0.48, 0.54),
      rubble: new Color3(0.62, 0.66, 0.72),
      embers: new Color3(0.62, 0.48, 0.39),
    },
  };
  const setNight = (night: boolean) => {
    const phase = night ? 'night' : 'day';
    const light = lightByPhase[phase];
    for (const surface of Object.keys(groundMaterials) as (keyof typeof groundMaterials)[]) {
      groundMaterials[surface].setColor3('tint', palettes[surface][phase]);
      groundMaterials[surface].setColor3('earthTint', palettes.plain[phase]);
      groundMaterials[surface].setColor3('lighting', light.terrain);
    }
    rubbleMaterial.emissiveColor = light.rubble;
    for (const material of emberMaterials) material.emissiveColor = light.embers;
  };
  setNight(initialNight);
  return { apron, terrainByHex, setNight };
}

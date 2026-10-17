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
import { createHexDisc } from '../renderer/hex-mesh.js';
import { createBattleTerrainBanks } from './battle-terrain-banks.js';
import { createBattleTerrainMargin } from './battle-terrain-margin.js';
import { naturalTextureShader } from '../renderer/terrain-material.js';
import { CAMERA_ELEVATION } from '../renderer/three-quarter-camera.js';
import { BATTLE_HEX_RADIUS, BATTLE_LAYOUT, battleHexToWorld } from './battle-layout.js';

const NEIGHBOURS = [
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
  [1, 0],
] as const;
const GROUND_TEXTURE_WORLD_SIZE = 3.2;
const key = ({ q, r }: CombatLabHex) => `${q},${r}`;

const ALPHA_OPTIONS = {
  opaque: { attributes: ['position', 'uv'], defines: [], needAlphaBlending: false },
  feather: {
    attributes: ['position', 'uv', 'color'],
    defines: ['#define FIELD_FEATHER'],
    needAlphaBlending: true,
  },
};

type Palette = { readonly day: Color3; readonly night: Color3 };

function groundMaterial(
  name: string,
  texture: Texture,
  palette: Palette,
  surface: 'plain' | 'mud' | 'fire' | 'blocked',
  scene: Scene,
  alpha: keyof typeof ALPHA_OPTIONS = 'opaque',
): ShaderMaterial {
  const result = new ShaderMaterial(
    name,
    scene,
    {
      vertexSource: `precision highp float;
        attribute vec3 position; attribute vec2 uv;
        uniform mat4 worldViewProjection; varying vec2 groundUv;
        #ifdef FIELD_FEATHER
          attribute vec4 color; varying float opacity;
        #endif
        void main(){
          groundUv=uv;
          #ifdef FIELD_FEATHER
            opacity=color.a;
          #endif
          gl_Position=worldViewProjection*vec4(position,1.0);
        }`,
      fragmentSource: `precision highp float;
        varying vec2 groundUv; uniform sampler2D terrainMap;
        uniform vec3 tint,lighting; uniform float detailScale;
        #ifdef FIELD_FEATHER
          varying float opacity;
        #endif
        ${naturalTextureShader}
        void main(){
          vec2 worldUv=groundUv*detailScale;
          // Two independent world scales break repeated motifs without stretching ink marks.
          vec3 color=mix(naturalTile(terrainMap,worldUv),
            naturalTile(terrainMap,worldUv*0.61+vec2(19.7,6.4)),0.38);
          float alpha=1.0;
          #ifdef FIELD_FEATHER
            alpha=opacity*smoothstep(0.05,0.55,opacity+(landNoise(worldUv*8.0)-0.5)*0.22);
          #endif
          gl_FragColor=vec4(pow(max(color*tint*lighting,vec3(0.0)),vec3(1.0/2.2)),alpha);
        }`,
    },
    {
      ...ALPHA_OPTIONS[alpha],
      uniforms: ['worldViewProjection', 'tint', 'lighting', 'detailScale'],
      samplers: ['terrainMap'],
    },
  );
  result.disableDepthWrite = alpha === 'feather';
  result.setTexture('terrainMap', texture);
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

export function createBattleTerrain(
  scene: Scene,
  tiles: readonly CombatLabTile[],
  initialNight: boolean,
): { setNight(night: boolean): void } {
  const tileByKey = new Map(tiles.map((tile) => [key(tile), tile]));
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
    ),
    mud: groundMaterial('battle-ground:mud-puddles', mudTexture, palettes.mud, 'mud', scene),
    fire: groundMaterial('battle-ground:charred-earth', dirtTexture, palettes.fire, 'fire', scene),
    blocked: groundMaterial(
      'battle-ground:rubble-earth',
      dirtTexture,
      palettes.blocked,
      'blocked',
      scene,
    ),
  };
  const marginMaterial = groundMaterial(
    'battle-ground:irregular-earth-margin',
    dirtTexture,
    palettes.plain,
    'plain',
    scene,
    'feather',
  );
  createBattleTerrainMargin(scene, tiles, GROUND_TEXTURE_WORLD_SIZE).material = marginMaterial;
  const exposedEarthPalette = {
    day: new Color3(0.48, 0.4, 0.31),
    night: new Color3(0.37, 0.39, 0.41),
  };
  const exposedEarthMaterial = groundMaterial(
    'battle-ground:exposed-earth-sides',
    dirtTexture,
    exposedEarthPalette,
    'plain',
    scene,
  );
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
    const ground = createHexDisc(`ground:${tileKey}`, BATTLE_HEX_RADIUS, scene);
    ground.position.set(point.x, groundY, point.z);
    ground.material = groundMaterials[terrainSurface(tile)];
    ground.isPickable = true;
    ground.renderingGroupId = 0;
    ground.metadata = { combatHex: { q: tile.q, r: tile.r } };
    setContinuousGroundUv(ground);

    const lowerHeights = NEIGHBOURS.map(([dq, dr]) => {
      const neighbour = tileByKey.get(key({ q: tile.q + dq, r: tile.r + dr }));
      return (neighbour?.height ?? 0) * BATTLE_LAYOUT.heightStep;
    });
    if (lowerHeights.some((height) => height < groundY)) {
      const sides = createBattleTerrainBanks(
        `ground-side:${tileKey}`,
        BATTLE_HEX_RADIUS,
        groundY,
        lowerHeights,
        scene,
      );
      sides.position.set(point.x, 0, point.z);
      setContinuousGroundUv(sides);
      sides.material = exposedEarthMaterial;
      sides.isPickable = false;
      sides.renderingGroupId = 0;
      sides.metadata = ground.metadata;
    }

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
      groundMaterials[surface].setColor3('lighting', light.terrain);
    }
    marginMaterial.setColor3('tint', palettes.plain[phase]);
    marginMaterial.setColor3('lighting', light.terrain);
    exposedEarthMaterial.setColor3('tint', exposedEarthPalette[phase]);
    exposedEarthMaterial.setColor3('lighting', light.terrain);
    rubbleMaterial.emissiveColor = light.rubble;
    for (const material of emberMaterials) material.emissiveColor = light.embers;
  };
  setNight(initialNight);
  return { setNight };
}

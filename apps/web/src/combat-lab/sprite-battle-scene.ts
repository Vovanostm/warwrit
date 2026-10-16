import {
  Color3,
  Color4,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Matrix,
  PickingInfo,
  Plane,
  PointLight,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  VertexBuffer,
  type AbstractMesh,
} from '@babylonjs/core';
import type {
  CombatLabAction,
  CombatLabHex,
  CombatLabSkillId,
  CombatLabView,
} from '@warwrit/protocol';
import { acquireCanvasEngine, releaseCanvasEngine } from '../renderer/canvas-engine.js';
import { CAMERA_ELEVATION, mountThreeQuarterCamera } from '../renderer/three-quarter-camera.js';
import { BATTLE_ART } from '../renderer/art.js';
import { spriteForUnit } from './sprite-art.js';
import { HEX_RADIUS, hexToWorld, worldToHex } from '../renderer/hex-projection.js';
import { createHexDisc, createHexSides } from '../renderer/hex-mesh.js';
import { createBattleCellGrid, type BattleCellStyle } from '../renderer/battle-cell-grid.js';

const millFieldUrl = new URL(
  '../../../../assets/art/combat/stage1-2026-10-09/battlefield/mill-field-v1.png',
  import.meta.url,
).href;

const b023FixtureUrl = new URL(
  '../../../../assets/art/combat/stage1-2026-10-09/roster/b023/fixture.png',
  import.meta.url,
).href;

const terrainFaceUrl = new URL('../../../../assets/art/m1/terrain-ink-v1/dirt.png', import.meta.url)
  .href;

const SQRT3 = Math.sqrt(3);
// Leave room for adjacent full figures without changing their proportions or pivots.
const SPRITE_PRESENTATION_SCALE = 0.82;
const AXIAL_TO_WORLD = ({ q, r }: CombatLabHex) => hexToWorld(q, r);
const HEX_KEY = ({ q, r }: CombatLabHex) => `${q},${r}`;

interface SpriteBattleScene {
  setHighlightedUnit(id: string | null): void;
  update(
    view: CombatLabView,
    selectedUnitId: string | null,
    selectedHex: CombatLabHex | null,
    night: boolean,
    fullGrid: boolean,
    selectedSkillId?: CombatLabSkillId | null,
  ): void;
  destroy(): void;
}

export interface BattleFieldTarget {
  readonly hex: CombatLabHex;
  readonly unitId: string | null;
  readonly anchor?: { readonly x: number; readonly y: number; readonly targetY: number };
}

export async function mountSpriteBattleScene(
  canvas: HTMLCanvasElement,
  initialView: CombatLabView,
  selectedUnitId: string | null,
  selectedHex: CombatLabHex | null,
  callbacks: {
    readonly onSelectUnit: (id: string) => void;
    readonly onSelectHex: (hex: CombatLabHex) => void;
    readonly onHover: (target: BattleFieldTarget | null) => void;
    readonly onAct: (action: CombatLabAction['intent']) => void;
    readonly onRefusal?: (reason: string) => void;
  },
  initialNight = false,
  signal?: AbortSignal,
): Promise<SpriteBattleScene> {
  // Geometric plane hits include transparent canvas margins. Reuse a small alpha mask
  // for input only, so visibly empty corners do not steal neighbouring hex clicks.
  const spriteMasks = new Map<string, Uint8ClampedArray>();
  const spriteUrls = [...new Set(initialView.units.map((unit) => spriteForUnit(unit).url))];
  await Promise.all(
    spriteUrls.map(async (url) => {
      const source = new Image();
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve();
        source.onerror = () => reject(new Error('Sprite input mask unavailable'));
        source.src = url;
      });
      const surface = document.createElement('canvas');
      surface.width = surface.height = 128;
      const context = surface.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Sprite input mask unavailable');
      context.drawImage(source, 0, 0, 128, 128);
      spriteMasks.set(url, context.getImageData(0, 0, 128, 128).data);
    }),
  );
  if (signal?.aborted) throw new Error('Scene mount cancelled');
  const engine = acquireCanvasEngine(canvas);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.075, 0.067, 0.057, 1);
  // Clear terrain depth before drawing world sprites: every ground cue stays
  // below opaque figure pixels. Sprite transparency never writes a rectangle.
  scene.setRenderingAutoClearDepthStencil(1, true, true, true);
  const footDepth = (mesh: AbstractMesh) => {
    const foot = (mesh.metadata as { combatFoot?: Vector3 } | null)?.combatFoot;
    const point = foot ?? mesh.getBoundingInfo().boundingBox.centerWorld;
    return point.z * Math.cos(CAMERA_ELEVATION) - point.y * Math.sin(CAMERA_ELEVATION);
  };
  const compareObjects = (left: AbstractMesh, right: AbstractMesh) =>
    footDepth(right) - footDepth(left) ||
    // Keep each entity's silhouette and body paired even at equal ground depth.
    String(left.metadata?.combatUnitId ?? left.name).localeCompare(
      String(right.metadata?.combatUnitId ?? right.name),
    ) ||
    // The two planes of one entity share an anchor: its ink edge goes first.
    left.alphaIndex - right.alphaIndex ||
    left.name.localeCompare(right.name);
  scene.setRenderingOrder(1, undefined, undefined, (left, right) =>
    compareObjects(left.getMesh(), right.getMesh()),
  );
  const light = new HemisphericLight('battle-ink-sky', new Vector3(0.15, 1, -0.2), scene);
  light.intensity = initialNight ? 0.78 : 0.98;
  light.groundColor = new Color3(0.33, 0.29, 0.24);

  const initialTiles = tilesFor(initialView);
  const mapDepth = Math.max(2, ...initialTiles.map((tile) => tile.r)) + 1;
  const centerZ = ((mapDepth - 1) * SQRT3) / 4;
  let currentView = initialView;
  let selectedId = selectedUnitId;
  let selectedSkill: CombatLabSkillId | null = null;
  let highlightedId: string | null = null;
  let selectedCell = selectedHex;
  let isNight = initialNight;
  let showFullGrid = false;
  let hoveredTarget: BattleFieldTarget | null = null;

  const unitMeshes = new Map<string, Mesh>();
  const unitMaterials = new Map<string, StandardMaterial>();
  const unitEdges = new Map<string, Mesh>();
  const contactShadows = new Map<string, Mesh>();
  const contactMaterial = new StandardMaterial('unit-ground-contact', scene);
  contactMaterial.diffuseColor = Color3.Black();
  contactMaterial.specularColor = Color3.Black();
  contactMaterial.alpha = 0.42;
  const fixedLabels: Mesh[] = [];
  const eventLabels: Mesh[] = [];
  const statusMarkers: Mesh[] = [];
  const threatLabels: Mesh[] = [];
  const textures = new Map<string, Texture>();
  const edgeTextures = new Map<string, DynamicTexture>();
  const texture = (url: string) => {
    let result = textures.get(url);
    if (!result) {
      result = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
      result.hasAlpha = true;
      textures.set(url, result);
    }
    return result;
  };
  const artMaterial = (name: string, url: string) => {
    const result = new StandardMaterial(name, scene);
    result.diffuseTexture = texture(url);
    result.useAlphaFromDiffuseTexture = true;
    result.disableDepthWrite = true;
    result.backFaceCulling = false;
    result.specularColor = Color3.Black();
    result.emissiveColor = new Color3(0.23, 0.21, 0.18);
    return result;
  };

  // One authored projection is kept intact on a camera-facing backdrop. Tile and
  // foot anchors occupy the open courtyard; perimeter architecture is scenery.
  const backgroundWidth = 25.5;
  const backgroundHeight = (backgroundWidth * 941) / 1672;
  const backgroundX = backgroundWidth * 0.35;
  const backgroundUp = backgroundHeight * 0.38;
  const centerUp = centerZ * Math.sin(CAMERA_ELEVATION);
  const upOffset = backgroundUp - centerUp;
  const background = MeshBuilder.CreatePlane(
    'old-mill-battlefield',
    { width: backgroundWidth, height: backgroundHeight },
    scene,
  );
  background.rotation.x = CAMERA_ELEVATION;
  background.position.set(
    backgroundX,
    upOffset * Math.cos(CAMERA_ELEVATION) - 10 * Math.sin(CAMERA_ELEVATION),
    centerZ + upOffset * Math.sin(CAMERA_ELEVATION) + 10 * Math.cos(CAMERA_ELEVATION),
  );
  // Register the painted perimeter around the HUD's free central play area.
  // Grid axes, sprite scale and foot pivots remain unchanged.
  background.position.x -= 1.1;
  background.position.z -= 2;
  background.isPickable = false;
  const groundMaterial = new StandardMaterial('old-mill-painted-values', scene);
  groundMaterial.diffuseTexture = texture(millFieldUrl);
  groundMaterial.linkEmissiveWithDiffuse = true;
  groundMaterial.disableLighting = true;
  groundMaterial.specularColor = Color3.Black();
  groundMaterial.emissiveColor = initialNight ? new Color3(0.62, 0.67, 0.74) : Color3.White();
  background.material = groundMaterial;

  if (initialView.units.some((unit) => spriteForUnit(unit).id === 'B023')) {
    const occupied = initialTiles.find((tile) => tile.blocked);
    if (occupied) {
      const point = AXIAL_TO_WORLD(occupied);
      const fixture = MeshBuilder.CreatePlane(
        'b023-rooted-fixture',
        { width: 1.15, height: 1.15 },
        scene,
      );
      fixture.rotation.x = CAMERA_ELEVATION;
      fixture.position.set(
        point.x,
        occupied.height * 0.12 + 0.575 * Math.cos(CAMERA_ELEVATION),
        point.z + 0.575 * Math.sin(CAMERA_ELEVATION),
      );
      fixture.metadata = { combatFoot: new Vector3(point.x, occupied.height * 0.12, point.z) };
      const material = new StandardMaterial('b023-rooted-fixture-ink', scene);
      material.diffuseTexture = texture(b023FixtureUrl);
      material.useAlphaFromDiffuseTexture = true;
      material.disableDepthWrite = true;
      material.backFaceCulling = false;
      material.specularColor = Color3.Black();
      material.emissiveColor = new Color3(0.24, 0.22, 0.19);
      fixture.material = material;
      fixture.isPickable = false;
      fixture.renderingGroupId = 1;
      addLabel(scene, fixedLabels, 'ОПОРА · ЗАНЯТА', new Vector3(point.x, 1.2, point.z), 'height');
    }
  }

  const plain = new StandardMaterial('plain-wash', scene);
  plain.diffuseColor = new Color3(0.49, 0.47, 0.39);
  plain.alpha = 0.03;
  plain.diffuseTexture = texture(BATTLE_ART.groundOuter);
  plain.specularColor = Color3.Black();
  const mud = new StandardMaterial('mud-wash', scene);
  mud.diffuseColor = new Color3(0.3, 0.23, 0.17);
  mud.diffuseTexture = texture(BATTLE_ART.groundField);
  mud.specularColor = Color3.Black();
  mud.alpha = 0.35;
  const fire = new StandardMaterial('fire-warning', scene);
  fire.diffuseColor = new Color3(0.45, 0.19, 0.11);
  fire.emissiveColor = new Color3(0.12, 0.035, 0.012);
  fire.specularColor = Color3.Black();
  fire.alpha = 0.18;
  const blockedMaterial = new StandardMaterial('mill-rubble', scene);
  blockedMaterial.diffuseColor = new Color3(0.22, 0.2, 0.17);
  blockedMaterial.specularColor = Color3.Black();
  blockedMaterial.alpha = 0.32;
  const blockedBorderMaterial = new StandardMaterial('blocked-cell-ochre', scene);
  blockedBorderMaterial.disableLighting = true;
  blockedBorderMaterial.emissiveColor = new Color3(0.66, 0.52, 0.34);
  const selectionMaterial = new StandardMaterial('selection-ochre', scene);
  selectionMaterial.disableLighting = true;
  selectionMaterial.emissiveColor = new Color3(0.68, 0.48, 0.19);
  selectionMaterial.alpha = 0.42;
  const previewMaterial = new StandardMaterial('movement-preview', scene);
  previewMaterial.disableLighting = true;
  previewMaterial.emissiveColor = new Color3(0.4, 0.49, 0.52);
  previewMaterial.alpha = 0.2;
  const movementAreaMaterial = new StandardMaterial('reachable-movement-area', scene);
  movementAreaMaterial.disableLighting = true;
  movementAreaMaterial.emissiveColor = new Color3(0.25, 0.45, 0.5);
  movementAreaMaterial.alpha = 0.34;
  const movementEdgeMaterial = new StandardMaterial('reachable-movement-edge', scene);
  movementEdgeMaterial.disableLighting = true;
  movementEdgeMaterial.emissiveColor = new Color3(0.61, 0.8, 0.8);
  const targetMaterial = new StandardMaterial('attack-target', scene);
  targetMaterial.disableLighting = true;
  targetMaterial.emissiveColor = new Color3(0.83, 0.48, 0.29);
  const actorRingMaterial = new StandardMaterial('active-unit-ring', scene);
  actorRingMaterial.disableLighting = true;
  actorRingMaterial.emissiveColor = new Color3(0.82, 0.77, 0.61);
  const friendlyRingMaterial = new StandardMaterial('friendly-unit-slate', scene);
  friendlyRingMaterial.disableLighting = true;
  friendlyRingMaterial.emissiveColor = new Color3(0.49, 0.59, 0.61);
  const enemyRingMaterial = new StandardMaterial('enemy-unit-rust', scene);
  enemyRingMaterial.disableLighting = true;
  enemyRingMaterial.emissiveColor = new Color3(0.56, 0.3, 0.22);

  const cellGrid = createBattleCellGrid(scene, initialTiles);
  const heightLabels: Mesh[] = [];
  const tileInfo = new Map(initialTiles.map((tile) => [HEX_KEY(tile), tile]));
  const stepMaterial = new StandardMaterial('terrain-step-earth', scene);
  // Raised earth is real opaque geometry, unlike the level-zero backdrop wash.
  // Do not reuse the alpha-bearing sprite texture cache for depth occluders.
  const earthTexture = new Texture(
    terrainFaceUrl,
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  earthTexture.hasAlpha = false;
  stepMaterial.diffuseTexture = earthTexture;
  stepMaterial.diffuseColor = Color3.White();
  stepMaterial.specularColor = Color3.Black();
  stepMaterial.backFaceCulling = false;
  const raisedTexture = new Texture(
    millFieldUrl,
    scene,
    false,
    true,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  raisedTexture.hasAlpha = false;
  raisedTexture.wrapU = raisedTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const raisedMaterials = new Map<StandardMaterial, StandardMaterial>();
  const raisedTints = new Map<StandardMaterial, Color3>();
  for (const wash of [plain, mud, fire, blockedMaterial]) {
    const material = new StandardMaterial(`raised-${wash.name}`, scene);
    material.diffuseTexture = raisedTexture;
    material.disableLighting = true;
    material.linkEmissiveWithDiffuse = true;
    const tint =
      wash === mud
        ? new Color3(0.72, 0.61, 0.48)
        : wash === fire
          ? new Color3(0.94, 0.73, 0.62)
          : wash === blockedMaterial
            ? new Color3(0.76, 0.72, 0.64)
            : Color3.White();
    material.emissiveColor = tint.multiply(groundMaterial.emissiveColor);
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    raisedMaterials.set(wash, material);
    raisedTints.set(material, tint);
  }
  for (const tile of initialTiles) {
    const key = HEX_KEY(tile);
    tileInfo.set(key, tile);
    const point = AXIAL_TO_WORLD(tile);
    const cell = createHexDisc(`ground:${key}`, HEX_RADIUS, scene);
    cell.position.set(point.x, tile.height * 0.12, point.z);
    const wash = tile.blocked
      ? blockedMaterial
      : tile.terrain === 'mud'
        ? mud
        : tile.terrain === 'fire'
          ? fire
          : plain;
    cell.material = tile.height > 0 ? raisedMaterials.get(wash)! : wash;
    if (tile.height > 0) {
      // Sample the existing painted field in its fixed projection. Adjacent tops
      // share that artwork continuously; real opaque surfaces still own depth.
      cell.computeWorldMatrix(true);
      const positions = cell.getVerticesData(VertexBuffer.PositionKind)!;
      const uvs: number[] = [];
      for (let vertex = 0; vertex < positions.length; vertex += 3) {
        const world = Vector3.TransformCoordinates(
          new Vector3(positions[vertex]!, positions[vertex + 1]!, positions[vertex + 2]!),
          cell.getWorldMatrix(),
        );
        const relative = world.subtract(background.position);
        uvs.push(
          relative.x / backgroundWidth + 0.5,
          (relative.y * Math.cos(CAMERA_ELEVATION) + relative.z * Math.sin(CAMERA_ELEVATION)) /
            backgroundHeight +
            0.5,
        );
      }
      cell.setVerticesData(VertexBuffer.UVKind, uvs);
    }
    cell.metadata = { combatHex: { q: tile.q, r: tile.r } };
    if (tile.height > 0) {
      // Side order follows the 30° pointy-top corners, not axial neighbour order.
      const neighbours = [
        [0, 1],
        [-1, 1],
        [-1, 0],
        [0, -1],
        [1, -1],
        [1, 0],
      ] as const;
      const bottoms = neighbours.map(
        ([dq, dr]) =>
          (tileInfo.get(HEX_KEY({ q: tile.q + dq, r: tile.r + dr }))?.height ?? 0) * 0.12,
      );
      if (bottoms.some((bottom) => bottom < tile.height * 0.12)) {
        const sides = createHexSides(
          `ground-side:${key}`,
          HEX_RADIUS,
          tile.height * 0.12,
          bottoms,
          scene,
        );
        sides.position.set(point.x, 0, point.z);
        sides.material = stepMaterial;
        sides.metadata = cell.metadata;
      }
    }
    if (tile.blocked) {
      // The 512px PNG's visible pile bounds are (77,170)–(435,407).
      // Centre that already projected artwork on its occupied cell, rather
      // than anchoring the empty PNG bottom. Preserve the square sprite aspect.
      const rubbleSize = 1.1;
      const rubbleCenterOffset = (288.5 / 512 - 0.5) * rubbleSize;
      const rubble = MeshBuilder.CreatePlane(
        `rubble:${key}`,
        { width: rubbleSize, height: rubbleSize },
        scene,
      );
      rubble.rotation.x = CAMERA_ELEVATION;
      rubble.position.set(
        point.x,
        tile.height * 0.12 + rubbleCenterOffset * Math.cos(CAMERA_ELEVATION),
        point.z + rubbleCenterOffset * Math.sin(CAMERA_ELEVATION),
      );
      rubble.material = artMaterial(`rubble-ink:${key}`, BATTLE_ART.rubble);
      rubble.isPickable = false;
      rubble.renderingGroupId = 1;
      rubble.metadata = { combatFoot: new Vector3(point.x, tile.height * 0.12, point.z) };
    }
    if (tile.height > 0) {
      addLabel(
        scene,
        heightLabels,
        `+${tile.height}`,
        new Vector3(point.x, tile.height * 0.12 + 0.09, point.z),
        'height',
      );
      heightLabels.at(-1)!.renderingGroupId = 0;
      heightLabels.at(-1)!.metadata = { combatHex: { q: tile.q, r: tile.r } };
      heightLabels.at(-1)?.setEnabled(false);
    }
    if (tile.terrain === 'fire') {
      const ember = MeshBuilder.CreatePlane(
        `fire-embers:${key}`,
        { width: 0.85, height: 0.7 },
        scene,
      );
      ember.rotation.x = CAMERA_ELEVATION;
      ember.position.set(
        point.x,
        tile.height * 0.12 + 0.35 * Math.cos(CAMERA_ELEVATION),
        point.z + 0.35 * Math.sin(CAMERA_ELEVATION),
      );
      const emberMaterial = new StandardMaterial(`fire-ember-ink:${key}`, scene);
      emberMaterial.diffuseTexture = createEmberTexture(scene);
      emberMaterial.useAlphaFromDiffuseTexture = true;
      emberMaterial.disableDepthWrite = true;
      emberMaterial.disableLighting = true;
      emberMaterial.linkEmissiveWithDiffuse = true;
      emberMaterial.emissiveColor = Color3.White();
      emberMaterial.backFaceCulling = false;
      ember.material = emberMaterial;
      ember.isPickable = false;
      ember.renderingGroupId = 0;
      ember.metadata = { combatFoot: new Vector3(point.x, tile.height * 0.12, point.z) };
      const fireLight = new PointLight(
        `fire-light:${key}`,
        new Vector3(point.x, tile.height * 0.12 + 0.7, point.z),
        scene,
      );
      fireLight.diffuse = new Color3(0.85, 0.47, 0.23);
      fireLight.intensity = 0.45;
      fireLight.range = 3;
    }
  }

  const unitMeshesForView = (view: CombatLabView) => {
    for (const marker of statusMarkers.splice(0)) marker.dispose(false, true);
    const liveIds = new Set(view.units.map(({ id }) => id));
    for (const [id, mesh] of unitMeshes) {
      if (liveIds.has(id)) continue;
      mesh.material?.dispose(false, false);
      mesh.dispose(false, false);
      unitMeshes.delete(id);
      unitMaterials.delete(id);
      contactShadows.get(id)?.dispose();
      contactShadows.delete(id);
      unitEdges.get(id)?.dispose(false, true);
      unitEdges.delete(id);
    }
    for (const unit of view.units) {
      const sprite = spriteForUnit(unit);
      const displayHeight = sprite.id.startsWith('W')
        ? 1.4
        : sprite.id === 'B001'
          ? 0.73
          : sprite.id === 'B053' || sprite.id === 'B002'
            ? 1.62
            : 1.23;
      const factor = (displayHeight * SPRITE_PRESENTATION_SCALE) / sprite.bodyHeight;
      const width = sprite.width * factor;
      const height = sprite.height * factor;
      let mesh = unitMeshes.get(unit.id);
      let material = unitMaterials.get(unit.id);
      if (!mesh || !material) {
        mesh = MeshBuilder.CreatePlane(`unit:${unit.id}`, { width, height }, scene);
        material = new StandardMaterial(`unit-art:${unit.id}`, scene);
        material.disableLighting = true;
        material.linkEmissiveWithDiffuse = true;
        material.diffuseTexture = texture(sprite.url);
        material.useAlphaFromDiffuseTexture = true;
        material.disableDepthWrite = true;
        material.backFaceCulling = false;
        material.specularColor = Color3.Black();
        mesh.material = material;
        mesh.isPickable = true;
        mesh.renderingGroupId = 1;
        mesh.alphaIndex = 1;
        let edgeTexture = edgeTextures.get(sprite.url);
        if (!edgeTexture) {
          edgeTexture = new DynamicTexture(`ink-edge:${sprite.id}`, 128, scene, false);
          edgeTexture.hasAlpha = true;
          const context = edgeTexture.getContext() as unknown as CanvasRenderingContext2D;
          const pixels = context.createImageData(128, 128);
          const mask = spriteMasks.get(sprite.url)!;
          for (let row = 3; row < 125; row++) {
            for (let column = 3; column < 125; column++) {
              const offset = (row * 128 + column) * 4;
              if ((mask[offset + 3] ?? 0) >= 16) continue;
              let distance = 4;
              for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                  if ((mask[((row + dy) * 128 + column + dx) * 4 + 3] ?? 0) >= 64)
                    distance = Math.min(distance, Math.max(Math.abs(dx), Math.abs(dy)));
                }
              }
              // A narrow warm value edge and outer ink line separate dark fur/cloth
              // from busy ground without recolouring the approved sprite itself.
              if (distance <= 2) pixels.data.set([208, 193, 165, 210], offset);
              else if (distance === 3) pixels.data.set([31, 28, 25, 200], offset);
            }
          }
          context.putImageData(pixels, 0, 0);
          edgeTexture.update();
          edgeTextures.set(sprite.url, edgeTexture);
        }
        const edge = MeshBuilder.CreatePlane(`unit-edge:${unit.id}`, { width, height }, scene);
        const edgeMaterial = new StandardMaterial(`unit-edge-art:${unit.id}`, scene);
        edgeMaterial.diffuseTexture = edgeTexture;
        edgeMaterial.useAlphaFromDiffuseTexture = true;
        edgeMaterial.disableDepthWrite = true;
        edgeMaterial.disableLighting = true;
        edgeMaterial.linkEmissiveWithDiffuse = true;
        edgeMaterial.emissiveColor = Color3.White();
        edgeMaterial.backFaceCulling = false;
        edge.material = edgeMaterial;
        edge.isPickable = false;
        edge.renderingGroupId = 1;
        edge.alphaIndex = 0;
        unitEdges.set(unit.id, edge);
        const shadow = MeshBuilder.CreateDisc(
          `contact:${unit.id}`,
          { radius: 0.26, tessellation: 12 },
          scene,
        );
        shadow.rotation.x = Math.PI / 2;
        shadow.scaling.x = 1.4;
        shadow.material = contactMaterial;
        shadow.isPickable = false;
        contactShadows.set(unit.id, shadow);
        unitMeshes.set(unit.id, mesh);
        unitMaterials.set(unit.id, material);
      }
      const anchorX = (sprite.footX / sprite.width - 0.5) * width;
      const footY = (sprite.footY - sprite.height / 2) * factor;
      const { x, z } = AXIAL_TO_WORLD(unit.position);
      const tile = tileInfo.get(HEX_KEY(unit.position));
      mesh.rotation.x = CAMERA_ELEVATION;
      mesh.position.set(
        x - anchorX,
        footY * Math.cos(CAMERA_ELEVATION) + (tile?.height ?? 0) * 0.12,
        z + footY * Math.sin(CAMERA_ELEVATION),
      );
      contactShadows.get(unit.id)?.position.set(x, (tile?.height ?? 0) * 0.12 + 0.02, z);
      mesh.metadata = {
        combatUnitId: unit.id,
        combatHex: unit.position,
        combatFoot: new Vector3(x, (tile?.height ?? 0) * 0.12, z),
      };
      const edge = unitEdges.get(unit.id)!;
      edge.metadata = { combatUnitId: unit.id, combatFoot: mesh.metadata.combatFoot };
      edge.rotation.copyFrom(mesh.rotation);
      edge.position.copyFrom(mesh.position);
      edge.position.y -= 0.002 * Math.sin(CAMERA_ELEVATION);
      edge.position.z += 0.002 * Math.cos(CAMERA_ELEVATION);
      edge.setEnabled(unit.status === 'active');
      const standing = unit.status === 'active';
      mesh.setEnabled(standing);
      mesh.isPickable = standing;
      contactShadows.get(unit.id)?.setEnabled(standing);
      material.alpha = 1;
      if (!standing) {
        // A ground status plaque is deliberately separate from the baked figure.
        // Leave the cell centre clear when a living fighter steps onto this tile.
        addLabel(
          scene,
          statusMarkers,
          unit.status === 'surrendered'
            ? 'СДАЛСЯ'
            : unit.status === 'retreated'
              ? 'ОТСТУПИЛ'
              : 'ПОГИБ',
          new Vector3(x - 0.34, (tile?.height ?? 0) * 0.12 + 0.055, z + 0.3),
          unit.status === 'surrendered' ? 'event' : 'danger',
        );
        const marker = statusMarkers.at(-1)!;
        marker.billboardMode = Mesh.BILLBOARDMODE_NONE;
        marker.rotation.x = Math.PI / 2;
        marker.scaling.set(0.55, 0.75, 1);
        marker.renderingGroupId = 0;
      }
      // Art lighting is baked into the approved figures; do not mirror for the opposing side.
    }
  };

  let renderedEventRevision: number | null = null;
  const renderEvents = (view: CombatLabView) => {
    if (renderedEventRevision === view.viewRevision) return;
    const previousRevision = renderedEventRevision;
    renderedEventRevision = view.viewRevision;
    for (const mesh of eventLabels.splice(0)) mesh.dispose(false, true);
    const labels = new Map<string, string>();
    for (const event of view.events) {
      if (
        previousRevision === null
          ? event.revision !== view.viewRevision
          : event.revision <= previousRevision
      )
        continue;
      const eventType = event.type as string;
      const subjectId =
        eventType.startsWith('threat.') && eventType !== 'threat.executed'
          ? event.unitId
          : (event.targetId ?? event.unitId);
      if (!subjectId) continue;
      const unit = view.units.find(({ id }) => id === subjectId);
      if (!unit) continue;
      // The persistent badge already explains this same live threat. Keep other
      // sources, changed targets and cancelled/executed events as event feedback.
      if (
        unit.status === 'active' &&
        unit.threat &&
        (event.targetId === null || event.targetId === unit.threat.targetId) &&
        ((eventType === 'threat.prepared' && !unit.threat.retargeted) ||
          (eventType === 'threat.retargeted' && unit.threat.retargeted))
      )
        continue;
      let text = '';
      if (eventType === 'attack.resolved') {
        const damage = event.healthDamage ?? event.armorDamage ?? 0;
        text =
          event.hit === false
            ? 'ПРОМАХ'
            : event.hit === true
              ? `ПОПАДАНИЕ${damage > 0 ? ` −${damage}` : ''}`
              : 'УДАР';
      } else if (eventType === 'unit.died') text = 'ПОГИБ';
      else if (eventType === 'unit.surrendered') text = 'СДАЛСЯ';
      else if (eventType === 'threat.prepared') text = 'ГОТОВИТ УДАР';
      else if (eventType === 'threat.retargeted') text = 'НОВОЕ НАВЕДЕНИЕ';
      else if (eventType === 'threat.cancelled') text = 'УДАР ОТМЕНЁН';
      else if (eventType === 'threat.executed') text = 'УДАР';
      else if (eventType === 'unit.defended') text = 'ЗАЩИТА';
      else if (eventType === 'skill.used')
        text =
          view.skills?.find((skill) => skill.skillId === event.skillId)?.name.toUpperCase() ??
          (event.skillId
            ? {
                'shield-brace': 'УПОР ЩИТОМ',
                'armor-pressure': 'ПРОБИВАНИЕ БРОНИ',
                'reach-thrust': 'ДАЛЬНИЙ ВЫПАД',
                'aimed-shot': 'ПРИЦЕЛЬНЫЙ ВЫСТРЕЛ',
                rally: 'ОБОДРЕНИЕ',
              }[event.skillId]
            : 'ПРИЁМ');
      else if (eventType === 'unit.moved')
        text = `ШАГ${event.actionPointCost ? ` · −${event.actionPointCost} ОД` : ''}`;
      else if (eventType === 'unit.fire-damaged') text = `ОГОНЬ −${event.healthDamage ?? 0}`;
      else if (eventType === 'unit.wounded') {
        const previous = labels.get(subjectId);
        text = previous ? `${previous} · РАНЕНИЕ` : 'РАНЕНИЕ';
      } else if (eventType === 'unit.damaged') {
        if ((event.healthDamage ?? 0) > 0) text = `ЗДОРОВЬЕ −${event.healthDamage}`;
        else if ((event.armorDamage ?? 0) > 0) text = `БРОНЯ −${event.armorDamage}`;
      }
      if (text) labels.set(subjectId, text);
    }
    const upAxis = new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION));
    const reserved = [...unitMeshes.values()]
      .filter((mesh) => mesh.isEnabled())
      .map((mesh) => ({
        x: mesh.position.x,
        up: Vector3.Dot(mesh.position, upAxis),
        halfWidth: mesh.getBoundingInfo().boundingBox.extendSize.x,
        halfHeight: mesh.getBoundingInfo().boundingBox.extendSize.y,
      }));
    for (const [id, text] of labels) {
      const unit = view.units.find(({ id: unitId }) => unitId === id);
      const mesh = unitMeshes.get(id);
      if (!unit || !mesh) continue;
      const point =
        unit.status === 'active'
          ? mesh.position
          : (() => {
              const { x, z } = AXIAL_TO_WORLD(unit.position);
              return new Vector3(x, (tileInfo.get(HEX_KEY(unit.position))?.height ?? 0) * 0.12, z);
            })();
      const up =
        unit.status === 'active'
          ? mesh.getBoundingInfo().boundingBox.extendSize.y + (unit.threat ? 0.65 : 0.23)
          : 0.3;
      let labelUp = Vector3.Dot(point, upAxis) + up;
      const halfWidth = text.startsWith('ШАГ') ? 0.475 : 0.675;
      for (let attempt = 0; attempt < 36; attempt++) {
        if (
          !reserved.some(
            (box) =>
              Math.abs(point.x - box.x) < halfWidth + box.halfWidth &&
              Math.abs(labelUp - box.up) < 0.16 + box.halfHeight,
          )
        )
          break;
        labelUp += 0.18;
      }
      const offset = labelUp - Vector3.Dot(point, upAxis);
      reserved.push({ x: point.x, up: labelUp, halfWidth, halfHeight: 0.16 });
      addLabel(
        scene,
        eventLabels,
        text,
        new Vector3(
          point.x,
          point.y + offset * Math.cos(CAMERA_ELEVATION),
          point.z + offset * Math.sin(CAMERA_ELEVATION),
        ),
        'event',
      );
    }
  };

  const previewMeshes: Mesh[] = [];
  const shotAreaMaterial = new StandardMaterial('ranged-shot-area', scene);
  shotAreaMaterial.disableLighting = true;
  shotAreaMaterial.emissiveColor = new Color3(0.67, 0.48, 0.22);
  shotAreaMaterial.alpha = 0.36;
  const shotAreaEdgeMaterial = new StandardMaterial('ranged-area-muted-ochre', scene);
  shotAreaEdgeMaterial.disableLighting = true;
  shotAreaEdgeMaterial.emissiveColor = new Color3(0.92, 0.73, 0.4);
  const pathMaterial = new StandardMaterial('route-ochre', scene);
  pathMaterial.disableLighting = true;
  pathMaterial.emissiveColor = new Color3(0.86, 0.71, 0.42);
  const threatMaterial = new StandardMaterial('prepared-threat-rust', scene);
  threatMaterial.disableLighting = true;
  threatMaterial.emissiveColor = new Color3(0.89, 0.32, 0.18);
  const combinedAreaMaterial = new StandardMaterial('movement-and-reach', scene);
  combinedAreaMaterial.disableLighting = true;
  combinedAreaMaterial.emissiveColor = new Color3(0.44, 0.55, 0.35);
  combinedAreaMaterial.alpha = 0.34;
  const combinedEdge = new Color3(0.76, 0.84, 0.59);
  const targetFill = new StandardMaterial('target-cell-wash', scene);
  targetFill.disableLighting = true;
  targetFill.emissiveColor = targetMaterial.emissiveColor;
  targetFill.alpha = 0.22;
  const threatFill = new StandardMaterial('threat-cell-wash', scene);
  threatFill.disableLighting = true;
  threatFill.emissiveColor = threatMaterial.emissiveColor;
  threatFill.alpha = 0.26;
  const updateMarkers = () => {
    for (const label of threatLabels.splice(0)) label.dispose(false, true);
    const previewCell = hoveredTarget?.hex ?? selectedCell;
    const hoveredUnitId = hoveredTarget?.unitId ?? highlightedId;
    const cellStyles = new Map<string, BattleCellStyle>();
    const cue = (
      hex: CombatLabHex,
      fill: BattleCellStyle['fill'],
      border: Color3,
      priority: number,
    ) => {
      const key = HEX_KEY(hex);
      if (!tileInfo.has(key) || (cellStyles.get(key)?.priority ?? -1) > priority) return;
      cellStyles.set(key, { fill, border, priority });
    };
    for (const tile of initialTiles) {
      if (showFullGrid) cue(tile, null, new Color3(0.42, 0.4, 0.34), 0);
      if (tile.blocked) cue(tile, null, blockedBorderMaterial.emissiveColor, 2);
    }
    // Inspection exposes at most two heights, never a field of plaques. Occupied
    // cells use the figure/inspection panel; ground text cannot crowd its feet.
    const inspectedCells = new Set(
      [hoveredTarget?.hex, selectedCell]
        .filter((hex): hex is CombatLabHex => hex != null)
        .map(HEX_KEY),
    );
    const occupiedCells = new Set(
      currentView.units
        .filter((unit) => unit.status === 'active')
        .map((unit) => HEX_KEY(unit.position)),
    );
    for (const label of heightLabels) {
      const key = HEX_KEY(label.metadata.combatHex);
      label.setEnabled(inspectedCells.has(key) && !occupiedCells.has(key));
    }
    for (const mesh of previewMeshes.splice(0)) mesh.dispose(false, false);
    const activeActor = currentView.units.find(({ id }) => id === currentView.activation?.actorId);
    const playerTurn =
      currentView.status === 'active' &&
      activeActor?.status === 'active' &&
      activeActor.sideId === currentView.controlledSideId &&
      (currentView.activation?.actionPoints.current ?? 0) > 0;
    const targetPreviews = selectedSkill
      ? currentView.skillPreview?.filter(
          (preview) => preview.skillId === selectedSkill && preview.legal,
        )
      : currentView.attackPreview;
    const attackableIds = new Set(
      playerTurn ? targetPreviews?.map(({ targetId }) => targetId) : [],
    );
    for (const unit of currentView.units) {
      const mesh = unitMeshes.get(unit.id);
      const material = unitMaterials.get(unit.id);
      if (!mesh || !material) continue;
      const active = unit.status === 'active' && currentView.activation?.actorId === unit.id;
      material.emissiveColor = isNight ? new Color3(0.82, 0.85, 0.9) : Color3.White();
      const edgeMaterial = unitEdges.get(unit.id)?.material as StandardMaterial | undefined;
      if (edgeMaterial)
        edgeMaterial.emissiveColor =
          unit.status === 'active' && unit.id === hoveredUnitId
            ? new Color3(1, 0.91, 0.68)
            : unit.status === 'active' &&
                unit.sideId !== currentView.controlledSideId &&
                attackableIds.has(unit.id)
              ? new Color3(1, 0.69, 0.46)
              : isNight
                ? new Color3(0.67, 0.7, 0.74)
                : Color3.White();
      if (unit.status === 'active') {
        cue(
          unit.position,
          null,
          unit.sideId === currentView.controlledSideId
            ? friendlyRingMaterial.emissiveColor
            : enemyRingMaterial.emissiveColor,
          1,
        );
        if (active) cue(unit.position, previewMaterial, actorRingMaterial.emissiveColor, 5);
        if (unit.id === selectedId)
          cue(unit.position, selectionMaterial, pathMaterial.emissiveColor, 8);
      }
    }
    for (const unit of currentView.units) {
      const threat = unit.threat;
      if (unit.status !== 'active' || !threat) continue;
      const origin = AXIAL_TO_WORLD(unit.position);
      const target = AXIAL_TO_WORLD(threat.targetHex);
      const groundY = (tileInfo.get(HEX_KEY(threat.targetHex))?.height ?? 0) * 0.12;
      cue(threat.targetHex, threatFill, threatMaterial.emissiveColor, 9);
      const start = new Vector3(
        origin.x,
        0.19 + (tileInfo.get(HEX_KEY(unit.position))?.height ?? 0) * 0.12,
        origin.z,
      );
      const end = new Vector3(target.x, groundY + 0.19, target.z);
      const direction = end.subtract(start);
      if (direction.lengthSquared() > 0.01) {
        const arrowTip = end.subtract(direction.normalize().scale(0.28));
        const back = arrowTip.subtract(direction.scale(0.24));
        const side = new Vector3(-direction.z, 0, direction.x).scale(0.15);
        for (const [name, points] of [
          ['shaft', [start, arrowTip]],
          ['head', [back.add(side), arrowTip, back.subtract(side)]],
        ] as const) {
          const line = MeshBuilder.CreateTube(
            `threat-${name}:${unit.id}`,
            { path: [...points], radius: 0.025, tessellation: 6 },
            scene,
          );
          line.material = threatMaterial;
          line.isPickable = false;
          previewMeshes.push(line);
        }
      }
      const figure = unitMeshes.get(unit.id)!;
      addLabel(
        scene,
        threatLabels,
        threat.retargeted ? 'Новое наведение' : 'Готовит удар',
        figure.position.add(
          new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION)).scale(
            figure.getBoundingInfo().boundingBox.extendSize.y + 0.25,
          ),
        ),
        'danger',
      );
      const threatenedUnit = currentView.units.find(
        (candidate) =>
          candidate.id === threat.targetId &&
          candidate.status === 'active' &&
          HEX_KEY(candidate.position) === HEX_KEY(threat.targetHex),
      );
      const threatenedFigure = threatenedUnit && unitMeshes.get(threatenedUnit.id);
      const damageAnchor = threatenedFigure
        ? threatenedFigure.position.add(
            new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION)).scale(
              threatenedFigure.getBoundingInfo().boundingBox.extendSize.y + 0.25,
            ),
          )
        : new Vector3(target.x, groundY + 0.28, target.z + 0.45);
      addLabel(
        scene,
        threatLabels,
        `Удар ${threat.damage.minimum}–${threat.damage.maximum} до брони`,
        damageAnchor,
        'danger',
      );
    }
    const reachUnit = selectedId
      ? currentView.units.find(({ id }) => id === selectedId)
      : activeActor;
    const reachCells =
      reachUnit?.weaponReach?.cells ??
      (reachUnit?.id === activeActor?.id ? currentView.rangedAttackArea : []);
    const showReach =
      currentView.status === 'active' && reachUnit?.status === 'active' && !selectedSkill;
    const reachKeys = new Set(showReach ? (reachCells ?? []).map(HEX_KEY) : []);
    const movementKeys = new Set(
      playerTurn && !selectedSkill
        ? currentView.movementPreview?.map((preview) => HEX_KEY(preview.to))
        : [],
    );
    for (const hex of showReach ? (reachCells ?? []) : []) {
      const combined = movementKeys.has(HEX_KEY(hex));
      cue(
        hex,
        combined ? combinedAreaMaterial : shotAreaMaterial,
        combined ? combinedEdge : shotAreaEdgeMaterial.emissiveColor,
        4,
      );
    }
    if (playerTurn && activeActor) {
      for (const preview of (selectedSkill ? [] : currentView.movementPreview) ?? []) {
        if (!reachKeys.has(HEX_KEY(preview.to)))
          cue(preview.to, movementAreaMaterial, movementEdgeMaterial.emissiveColor, 3);
      }
      const selectedPath =
        !selectedSkill &&
        currentView.movementPreview?.find(
          (preview) => HEX_KEY(preview.to) === (previewCell ? HEX_KEY(previewCell) : ''),
        );
      if (selectedPath) {
        for (const hex of selectedPath.path)
          cue(hex, selectionMaterial, pathMaterial.emissiveColor, 7);
      }
      for (const target of targetPreviews ?? []) {
        const unit = currentView.units.find(({ id }) => id === target.targetId);
        if (unit?.status === 'active')
          cue(unit.position, targetFill, targetMaterial.emissiveColor, 6);
      }
    }
    if (selectedCell) cue(selectedCell, selectionMaterial, pathMaterial.emissiveColor, 8);
    const hoverHex =
      hoveredTarget?.hex ?? currentView.units.find((unit) => unit.id === highlightedId)?.position;
    if (hoverHex) {
      const key = HEX_KEY(hoverHex);
      const existing = cellStyles.get(key);
      cue(hoverHex, existing?.fill ?? previewMaterial, actorRingMaterial.emissiveColor, 10);
    }
    cellGrid.paint(cellStyles);
  };

  const pickFrom = (hit: PickingInfo | null) => {
    const target = targetFrom(hit);
    if (target?.unitId) callbacks.onSelectUnit(target.unitId);
    else if (target) callbacks.onSelectHex({ ...target.hex });
  };
  const pickAt = (x: number, y: number) => {
    const hits = scene.multiPick(x, y, (mesh) => mesh.isPickable && mesh.isEnabled()) ?? [];
    // Rendered sprites cover terrain regardless of geometric plane distance.
    // Inspect the nearest visible entity first using the renderer's foot order.
    const figures = hits.filter(
      (hit) => (hit.pickedMesh?.metadata as { combatUnitId?: string } | null)?.combatUnitId,
    );
    for (const hit of figures.toSorted((left, right) =>
      compareObjects(right.pickedMesh!, left.pickedMesh!),
    )) {
      const unitId = (hit.pickedMesh?.metadata as { combatUnitId?: string } | null)?.combatUnitId;
      if (!unitId) continue;
      const unit = currentView.units.find((unit) => unit.id === unitId);
      const uv = hit.getTextureCoordinates();
      const mask = unit && spriteMasks.get(spriteForUnit(unit).url);
      if (!uv || !mask) continue;
      const column = Math.max(0, Math.min(127, Math.floor(uv.x * 128)));
      const row = Math.max(0, Math.min(127, Math.floor((1 - uv.y) * 128)));
      if ((mask[(row * 128 + column) * 4 + 3] ?? 0) >= 16) return hit;
    }
    const groundHit = hits
      .filter(
        (hit) => !(hit.pickedMesh?.metadata as { combatUnitId?: string } | null)?.combatUnitId,
      )
      .toSorted((left, right) => left.distance - right.distance)[0];
    if (groundHit) return groundHit;
    // Exact shared edges can miss both triangles by floating point error. Try
    // each actual level, nearest first; never round on level 0 then select a
    // different raised cell or extend the map beyond its visible perimeter.
    const ray = scene.createPickingRay(x, y, Matrix.Identity(), scene.activeCamera);
    const levels = [...new Set(initialTiles.map((tile) => tile.height))].sort((a, b) => b - a);
    for (const level of levels) {
      const plane = Plane.FromPositionAndNormal(new Vector3(0, level * 0.12, 0), Vector3.Up());
      const distance = ray.intersectsPlane(plane);
      if (distance === null || distance < 0) continue;
      const point = ray.origin.add(ray.direction.scale(distance));
      const hex = worldToHex(point.x, point.z);
      const tile = tileInfo.get(HEX_KEY(hex));
      if (!tile || tile.height !== level) continue;
      const hit = new PickingInfo();
      hit.hit = true;
      hit.distance = distance;
      hit.pickedPoint = point;
      hit.pickedMesh = scene.getMeshByName(`ground:${HEX_KEY(hex)}`);
      return hit;
    }
    return null;
  };
  const targetFrom = (hit: PickingInfo | null): BattleFieldTarget | null => {
    const metadata = hit?.pickedMesh?.metadata as {
      combatUnitId?: string;
      combatHex?: CombatLabHex;
    } | null;
    if (!metadata?.combatHex) return null;
    const hex = metadata.combatHex;
    // Opaque sprite hits win above; uncovered pixels of an occupied cell address
    // its living occupant through the same hover/inspection/action target.
    const unitId =
      metadata.combatUnitId ??
      currentView.units.find(
        (candidate) =>
          candidate.status === 'active' && HEX_KEY(candidate.position) === HEX_KEY(hex),
      )?.id ??
      null;
    const unit = unitId ? unitMeshes.get(unitId) : undefined;
    let anchor: BattleFieldTarget['anchor'];
    if (unit && scene.activeCamera) {
      const above = unit.position.add(
        new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION)).scale(
          unit.getBoundingInfo().boundingBox.extendSize.y + 0.7,
        ),
      );
      const point = Vector3.Project(
        above,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
      );
      const rect = canvas.getBoundingClientRect();
      const targetPoint = Vector3.Project(
        above.subtract(
          new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION)).scale(0.58),
        ),
        Matrix.Identity(),
        scene.getTransformMatrix(),
        scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
      );
      anchor = {
        x: Math.max(
          118,
          Math.min(rect.width - 118, (point.x * rect.width) / engine.getRenderWidth()),
        ),
        y: Math.max(
          100,
          Math.min(rect.height - 8, (point.y * rect.height) / engine.getRenderHeight()),
        ),
        targetY: (targetPoint.y * rect.height) / engine.getRenderHeight(),
      };
      const reserved = [...unitMeshes.values(), ...eventLabels, ...threatLabels]
        .filter((mesh) => mesh.isEnabled())
        .map((mesh) => {
          const corners = mesh.getBoundingInfo().boundingBox.vectorsWorld.map((corner) => {
            const projected = Vector3.Project(
              corner,
              Matrix.Identity(),
              scene.getTransformMatrix(),
              scene.activeCamera!.viewport.toGlobal(
                engine.getRenderWidth(),
                engine.getRenderHeight(),
              ),
            );
            return {
              x: (projected.x * rect.width) / engine.getRenderWidth(),
              y: (projected.y * rect.height) / engine.getRenderHeight(),
            };
          });
          return {
            left: Math.min(...corners.map(({ x }) => x)),
            right: Math.max(...corners.map(({ x }) => x)),
            top: Math.min(...corners.map(({ y }) => y)),
            bottom: Math.max(...corners.map(({ y }) => y)),
          };
        });
      for (let attempt = 0; attempt < reserved.length; attempt++) {
        const collision = reserved.find(
          (box) =>
            anchor!.x + 118 > box.left &&
            anchor!.x - 118 < box.right &&
            anchor!.y > box.top &&
            anchor!.y - 80 < box.bottom,
        );
        if (!collision || anchor.y === 100) break;
        anchor = { ...anchor, y: Math.max(100, collision.top - 8) };
      }
    }
    return {
      hex,
      unitId,
      ...(anchor ? { anchor } : {}),
    };
  };
  const hoverAt = (event: PointerEvent) => {
    if (event.buttons !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const target = targetFrom(pickAt(event.clientX - rect.left, event.clientY - rect.top));
    if (
      target?.unitId === hoveredTarget?.unitId &&
      target?.hex.q === hoveredTarget?.hex.q &&
      target?.hex.r === hoveredTarget?.hex.r
    )
      return;
    hoveredTarget = target;
    callbacks.onHover(target);
    updateMarkers();
  };
  const clearHover = () => {
    hoveredTarget = null;
    callbacks.onHover(null);
    updateMarkers();
  };
  const preventContextMenu = (event: MouseEvent) => event.preventDefault();
  canvas.addEventListener('pointermove', hoverAt);
  canvas.addEventListener('pointerleave', clearHover);
  canvas.addEventListener('pointerdown', clearHover);
  canvas.addEventListener('wheel', clearHover, { capture: true, passive: true });
  canvas.addEventListener('keydown', clearHover);
  canvas.addEventListener('contextmenu', preventContextMenu);
  const camera = mountThreeQuarterCamera(scene, engine, canvas, {
    elevation: CAMERA_ELEVATION,
    minZoom: 2.2,
    maxZoom: 17,
    pick: pickAt,
    pickGround: (x, y) => {
      const hit = scene.pick(
        x,
        y,
        (mesh) => mesh.name.startsWith('ground:') || mesh.name.startsWith('ground-side:'),
      );
      return hit?.hit ? hit.pickedPoint : null;
    },
    panButtons: [0, 1],
    onPick: pickFrom,
    onSecondaryPick(hit) {
      const target = targetFrom(hit);
      if (selectedSkill) {
        const preview = currentView.skillPreview?.find(
          (row) => row.skillId === selectedSkill && row.targetId === target?.unitId,
        );
        if (preview?.legal)
          callbacks.onAct({
            type: 'use-skill',
            skillId: selectedSkill,
            targetId: preview.targetId,
          });
        else callbacks.onRefusal?.(preview?.reason ?? 'Выберите допустимую цель приёма');
        return;
      }
      if (!target) return;
      const unit = currentView.units.find(
        ({ id, status }) => id === target.unitId && status === 'active',
      );
      if (unit) {
        if (currentView.attackPreview?.some(({ targetId }) => targetId === unit.id))
          callbacks.onAct({ type: 'attack', targetId: unit.id });
      } else if (currentView.movementPreview?.some(({ to }) => HEX_KEY(to) === HEX_KEY(target.hex)))
        callbacks.onAct({ type: 'move', to: target.hex });
    },
  });
  camera.fit(
    {
      minX: backgroundX - 12.3,
      maxX: backgroundX + 10.1,
      minZ: (backgroundUp - 5.5) / Math.sin(CAMERA_ELEVATION) - 2,
      maxZ: (backgroundUp + 5.5) / Math.sin(CAMERA_ELEVATION) - 2,
    },
    0,
  );
  canvas.setAttribute('aria-label', 'Поле боя с выбором бойца или клетки');

  unitMeshesForView(initialView);
  renderEvents(initialView);
  updateMarkers();
  const resizeObserver = new ResizeObserver(() => {
    engine.resize();
    clearHover();
  });
  resizeObserver.observe(canvas);
  engine.runRenderLoop(() => {
    if (!scene.isDisposed) scene.render();
  });

  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    signal?.removeEventListener('abort', destroy);
    canvas.removeEventListener('pointermove', hoverAt);
    canvas.removeEventListener('pointerleave', clearHover);
    canvas.removeEventListener('pointerdown', clearHover);
    canvas.removeEventListener('wheel', clearHover, true);
    canvas.removeEventListener('keydown', clearHover);
    canvas.removeEventListener('contextmenu', preventContextMenu);
    resizeObserver.disconnect();
    camera.dispose();
    engine.stopRenderLoop();
    scene.dispose();
    releaseCanvasEngine(canvas);
  };
  signal?.addEventListener('abort', destroy, { once: true });

  return {
    setHighlightedUnit(id) {
      if (destroyed || highlightedId === id) return;
      highlightedId = id;
      updateMarkers();
    },
    update(view, nextSelectedId, nextSelectedCell, night, fullGrid, selectedSkillId = null) {
      const changedRevision = currentView.viewRevision !== view.viewRevision;
      showFullGrid = fullGrid;
      currentView = view;
      selectedSkill = selectedSkillId;
      selectedId = nextSelectedId;
      selectedCell = nextSelectedCell;
      if (isNight !== night) {
        isNight = night;
        scene.clearColor = night
          ? new Color4(0.025, 0.031, 0.044, 1)
          : new Color4(0.075, 0.067, 0.057, 1);
        light.intensity = night ? 0.78 : 0.98;
        groundMaterial.emissiveColor = night ? new Color3(0.62, 0.67, 0.74) : Color3.White();
        for (const [material, tint] of raisedTints)
          material.emissiveColor = tint.multiply(groundMaterial.emissiveColor);
      }
      unitMeshesForView(view);
      renderEvents(view);
      if (changedRevision) clearHover();
      else updateMarkers();
    },
    destroy,
  };
}

function createEmberTexture(scene: Scene): DynamicTexture {
  const result = new DynamicTexture('static-ink-embers', 256, scene, false);
  result.hasAlpha = true;
  const context = result.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 256, 256);
  context.strokeStyle = '#201a17';
  context.lineWidth = 5;
  for (const [x, y, radius] of [
    [55, 211, 26],
    [99, 224, 30],
    [148, 220, 27],
    [193, 207, 25],
  ] as const) {
    context.fillStyle = '#393029';
    context.beginPath();
    context.ellipse(x, y, radius, radius * 0.42, -0.2, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  for (const [x, top, width] of [
    [68, 96, 40],
    [109, 42, 53],
    [151, 76, 43],
    [185, 119, 30],
  ] as const) {
    context.fillStyle = '#ac5b32';
    context.beginPath();
    context.moveTo(x - width / 2, 205);
    context.lineTo(x - width * 0.3, top + 40);
    context.lineTo(x + 5, top + 58);
    context.lineTo(x + 14, top);
    context.lineTo(x + width / 2, 193);
    context.closePath();
    context.fill();
    context.stroke();
  }
  result.update();
  return result;
}

function addLabel(
  scene: Scene,
  collection: Mesh[],
  text: string,
  position: Vector3,
  tone: 'height' | 'danger' | 'event',
): void {
  const labelWidth = tone === 'height' ? 96 : 256;
  const texture = new DynamicTexture(
    `label:${text}`,
    { width: labelWidth, height: 64 },
    scene,
    false,
  );
  texture.hasAlpha = true;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, labelWidth, 64);
  context.fillStyle = tone === 'danger' ? '#713b2d' : tone === 'event' ? '#24201c' : '#363b38';
  context.strokeStyle = tone === 'danger' ? '#c17646' : tone === 'event' ? '#b99a60' : '#8e9185';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(3, 3, labelWidth - 6, 58, 8);
  context.fill();
  context.stroke();
  context.fillStyle = '#efe3c7';
  context.font = tone === 'height' ? 'bold 36px sans-serif' : 'bold 26px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, labelWidth / 2, 32, labelWidth - 18);
  texture.update();
  const material = new StandardMaterial(`label-material:${text}`, scene);
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.emissiveColor = Color3.White();
  material.backFaceCulling = false;
  material.specularColor = Color3.Black();
  const label = MeshBuilder.CreatePlane(
    `label:${text}`,
    {
      width: tone === 'height' ? 0.32 : text.startsWith('ШАГ') ? 0.95 : 1.35,
      height: tone === 'height' ? 0.18 : 0.3,
    },
    scene,
  );
  label.position.copyFrom(position);
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  label.material = material;
  label.isPickable = false;
  label.renderingGroupId = 2;
  collection.push(label);
}

function tilesFor(view: CombatLabView) {
  if (view.map.tiles) return view.map.tiles;
  const blocked = new Set(view.map.blocked.map(HEX_KEY));
  return view.map.hexes.map((hex) => ({
    ...hex,
    height: 0 as const,
    terrain: 'plain' as const,
    blocked: blocked.has(HEX_KEY(hex)),
  }));
}

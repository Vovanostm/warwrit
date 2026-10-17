import {
  Color3,
  Color4,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Matrix,
  PickingInfo,
  PointLight,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
  VertexBuffer,
  type AbstractMesh,
  type Ray,
} from '@babylonjs/core';
import type {
  CombatLabAction,
  CombatLabHex,
  CombatLabSkillId,
  CombatLabView,
} from '@warwrit/protocol';
import { acquireCanvasEngine, releaseCanvasEngine } from '../renderer/canvas-engine.js';
import { CAMERA_ELEVATION, mountThreeQuarterCamera } from '../renderer/three-quarter-camera.js';
import { projectCameraPoint } from '../renderer/camera-projection.js';
import { BATTLE_ART } from '../renderer/art.js';
import {
  opaqueSpritePixel,
  eventLabelUp,
  avoidAnchorOverlap,
  intersectGroundLevel,
  type LabelBox,
} from './sprite-scene-geometry.js';
import { markerPlan, unitEdgeTone } from './sprite-scene-markers.js';
import { eventFeedback } from './sprite-scene-feedback.js';
import { spriteForUnit } from './sprite-art.js';
import { SPRITE_MASK_SIZE, SPRITE_OUTLINE_SIZE, spriteOutlinePixels } from './sprite-outline.js';
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
type BattleUnit = CombatLabView['units'][number];
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
      surface.width = surface.height = SPRITE_MASK_SIZE;
      const context = surface.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Sprite input mask unavailable');
      context.drawImage(source, 0, 0, SPRITE_MASK_SIZE, SPRITE_MASK_SIZE);
      spriteMasks.set(url, context.getImageData(0, 0, SPRITE_MASK_SIZE, SPRITE_MASK_SIZE).data);
    }),
  );
  ensureMountAllowed(signal);
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
  const entityOrderKey = (mesh: AbstractMesh) => String(mesh.metadata?.combatUnitId ?? mesh.name);
  const compareObjects = (left: AbstractMesh, right: AbstractMesh) =>
    footDepth(right) - footDepth(left) ||
    entityOrderKey(left).localeCompare(entityOrderKey(right)) ||
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
  // Art-directed pinhole calibration; the painting has no recoverable lens metadata.
  // One fixed optical centre governs grid, figures and image-window navigation.
  const perspective = { targetX: 9.5, targetZ: centerZ, distance: 16 };
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
  const background = MeshBuilder.CreatePlane(
    'old-mill-battlefield',
    { width: backgroundWidth, height: backgroundHeight },
    scene,
  );
  background.rotation.x = CAMERA_ELEVATION;
  // Keep the painting at its authored image coordinates, behind all tactical geometry.
  // Moving the frustum window rather than the optical centre prevents parallax drift.
  const backdropDepth = 40;
  const backdropScale = (perspective.distance + backdropDepth) / perspective.distance;
  const backdropUp = backgroundUp - (centerZ + 2) * Math.sin(CAMERA_ELEVATION);
  background.scaling.set(backdropScale, backdropScale, 1);
  background.position.set(
    perspective.targetX + (backgroundX - 1.1 - perspective.targetX) * backdropScale,
    backdropUp * backdropScale * Math.cos(CAMERA_ELEVATION) -
      backdropDepth * Math.sin(CAMERA_ELEVATION),
    centerZ +
      backdropUp * backdropScale * Math.sin(CAMERA_ELEVATION) +
      backdropDepth * Math.cos(CAMERA_ELEVATION),
  );
  background.isPickable = false;
  const groundMaterial = new StandardMaterial('old-mill-painted-values', scene);
  groundMaterial.diffuseTexture = texture(millFieldUrl);
  groundMaterial.linkEmissiveWithDiffuse = true;
  groundMaterial.disableLighting = true;
  groundMaterial.specularColor = Color3.Black();
  groundMaterial.emissiveColor = initialNight ? new Color3(0.62, 0.67, 0.74) : Color3.White();
  background.material = groundMaterial;

  const addRootedFixture = () => {
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
        addLabel(
          scene,
          fixedLabels,
          'ОПОРА · ЗАНЯТА',
          new Vector3(point.x, 1.2, point.z),
          'height',
        );
      }
    }
  };
  addRootedFixture();

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
  const groundYFor = (hex: CombatLabHex) => (tileInfo.get(HEX_KEY(hex))?.height ?? 0) * 0.12;
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
  type Tile = (typeof initialTiles)[number];
  const terrainWash = (tile: Tile) => {
    if (tile.blocked) return blockedMaterial;
    return ({ mud, fire } as Record<string, StandardMaterial>)[tile.terrain] ?? plain;
  };
  const raisedTint = (wash: StandardMaterial) => {
    if (wash === mud) return new Color3(0.72, 0.61, 0.48);
    if (wash === fire) return new Color3(0.94, 0.73, 0.62);
    return wash === blockedMaterial ? new Color3(0.76, 0.72, 0.64) : Color3.White();
  };
  const mapRaisedTop = (cell: Mesh) => {
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
      const projected = projectCameraPoint(world, perspective, CAMERA_ELEVATION);
      uvs.push(
        (projected.x - backgroundX + 1.1) / backgroundWidth + 0.5,
        ((projected.z + 2) * Math.sin(CAMERA_ELEVATION) - backgroundUp) / backgroundHeight + 0.5,
      );
    }
    cell.setVerticesData(VertexBuffer.UVKind, uvs);
  };
  const addTerrainSides = (
    tile: Tile,
    point: { x: number; z: number },
    key: string,
    cell: Mesh,
  ) => {
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
      ([dq, dr]) => (tileInfo.get(HEX_KEY({ q: tile.q + dq, r: tile.r + dr }))?.height ?? 0) * 0.12,
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
  };
  const addRubble = (tile: Tile, point: { x: number; z: number }, key: string) => {
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
  };
  const addHeight = (tile: Tile, point: { x: number; z: number }) => {
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
  };
  const addFire = (tile: Tile, point: { x: number; z: number }, key: string) => {
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
  };
  const createGroundSurface = (tile: Tile) => {
    const key = HEX_KEY(tile);
    tileInfo.set(key, tile);
    const point = AXIAL_TO_WORLD(tile);
    const cell = createHexDisc(`ground:${key}`, HEX_RADIUS, scene);
    cell.position.set(point.x, tile.height * 0.12, point.z);
    const wash = terrainWash(tile);
    cell.material = tile.height > 0 ? raisedMaterials.get(wash)! : wash;
    if (tile.height > 0) mapRaisedTop(cell);
    cell.metadata = { combatHex: { q: tile.q, r: tile.r } };
    if (tile.height > 0) addTerrainSides(tile, point, key, cell);
    return { point, key };
  };
  const addTerrainTile = (tile: Tile) => {
    const { point, key } = createGroundSurface(tile);
    if (tile.blocked) addRubble(tile, point, key);
    if (tile.height > 0) addHeight(tile, point);
    if (tile.terrain === 'fire') addFire(tile, point, key);
  };
  const createTerrain = () => {
    for (const wash of [plain, mud, fire, blockedMaterial]) {
      const material = new StandardMaterial(`raised-${wash.name}`, scene);
      material.diffuseTexture = raisedTexture;
      material.disableLighting = true;
      material.linkEmissiveWithDiffuse = true;
      const tint = raisedTint(wash);
      material.emissiveColor = tint.multiply(groundMaterial.emissiveColor);
      material.specularColor = Color3.Black();
      material.backFaceCulling = false;
      raisedMaterials.set(wash, material);
      raisedTints.set(material, tint);
    }
    for (const tile of initialTiles) addTerrainTile(tile);
  };
  createTerrain();

  const outlineTexture = (sprite: ReturnType<typeof spriteForUnit>) => {
    let edgeTexture = edgeTextures.get(sprite.url);
    if (!edgeTexture) {
      edgeTexture = new DynamicTexture(`ink-edge:${sprite.id}`, SPRITE_OUTLINE_SIZE, scene, false);
      edgeTexture.hasAlpha = true;
      const context = edgeTexture.getContext() as unknown as CanvasRenderingContext2D;
      const pixels = context.createImageData(SPRITE_OUTLINE_SIZE, SPRITE_OUTLINE_SIZE);
      pixels.data.set(spriteOutlinePixels(spriteMasks.get(sprite.url)!));
      context.putImageData(pixels, 0, 0);
      edgeTexture.update();
      edgeTextures.set(sprite.url, edgeTexture);
    }
    return edgeTexture;
  };
  const createUnitMeshes = (
    unit: BattleUnit,
    sprite: ReturnType<typeof spriteForUnit>,
    width: number,
    height: number,
  ) => {
    const mesh = MeshBuilder.CreatePlane(`unit:${unit.id}`, { width, height }, scene);
    const material = new StandardMaterial(`unit-art:${unit.id}`, scene);
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
    const edgeTexture = outlineTexture(sprite);
    const outlineScale = SPRITE_OUTLINE_SIZE / SPRITE_MASK_SIZE;
    const edge = MeshBuilder.CreatePlane(
      `unit-edge:${unit.id}`,
      { width: width * outlineScale, height: height * outlineScale },
      scene,
    );
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
    return { mesh, material };
  };
  const addStatusMarker = (unit: BattleUnit, x: number, z: number, groundHeight: number) => {
    // A ground status plaque is deliberately separate from the baked figure.
    // Leave the cell centre clear when a living fighter steps onto this tile.
    addLabel(
      scene,
      statusMarkers,
      unit.status === 'surrendered' ? 'СДАЛСЯ' : unit.status === 'retreated' ? 'ОТСТУПИЛ' : 'ПОГИБ',
      new Vector3(x - 0.34, groundHeight + 0.055, z + 0.3),
      unit.status === 'surrendered' ? 'event' : 'danger',
    );
    const marker = statusMarkers.at(-1)!;
    marker.billboardMode = Mesh.BILLBOARDMODE_NONE;
    marker.rotation.x = Math.PI / 2;
    marker.scaling.set(0.55, 0.75, 1);
    marker.renderingGroupId = 0;
  };
  const removeAbsentUnits = (view: CombatLabView) => {
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
  };
  const syncUnit = (unit: BattleUnit) => {
    const sprite = spriteForUnit(unit);
    const factor = (spriteDisplayHeight(sprite.id) * SPRITE_PRESENTATION_SCALE) / sprite.bodyHeight;
    const width = sprite.width * factor;
    const height = sprite.height * factor;
    let mesh = unitMeshes.get(unit.id);
    let material = unitMaterials.get(unit.id);
    if (!mesh || !material) ({ mesh, material } = createUnitMeshes(unit, sprite, width, height));

    const anchorX = (sprite.footX / sprite.width - 0.5) * width;
    const footY = (sprite.footY - sprite.height / 2) * factor;
    const { x, z } = AXIAL_TO_WORLD(unit.position);
    const groundHeight = groundYFor(unit.position);
    mesh.rotation.x = CAMERA_ELEVATION;
    mesh.position.set(
      x - anchorX,
      footY * Math.cos(CAMERA_ELEVATION) + groundHeight,
      z + footY * Math.sin(CAMERA_ELEVATION),
    );
    contactShadows.get(unit.id)?.position.set(x, groundHeight + 0.02, z);
    mesh.metadata = {
      combatUnitId: unit.id,
      combatHex: unit.position,
      combatFoot: new Vector3(x, groundHeight, z),
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
    if (!standing) addStatusMarker(unit, x, z, groundHeight);
  };
  const unitMeshesForView = (view: CombatLabView) => {
    for (const marker of statusMarkers.splice(0)) marker.dispose(false, true);
    removeAbsentUnits(view);
    for (const unit of view.units) syncUnit(unit);
  };

  const upAxis = new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION));
  let renderedEventRevision: number | null = null;
  const renderEvents = (view: CombatLabView) => {
    if (renderedEventRevision === view.viewRevision) return;
    const previousRevision = renderedEventRevision;
    renderedEventRevision = view.viewRevision;
    for (const mesh of eventLabels.splice(0)) mesh.dispose(false, true);
    const labels = eventFeedback(view, previousRevision);
    const reserved = [...unitMeshes.values(), ...threatLabels]
      .filter((mesh) => mesh.isEnabled())
      .map((mesh) => ({
        x: mesh.position.x,
        up: Vector3.Dot(mesh.position, upAxis),
        halfWidth: mesh.getBoundingInfo().boundingBox.extendSize.x,
        halfHeight: mesh.getBoundingInfo().boundingBox.extendSize.y,
      }));
    for (const [id, text] of labels) placeEventLabel(view, id, text, reserved);
  };
  const eventAnchor = (unit: BattleUnit, mesh: Mesh) => {
    if (unit.status !== 'active') {
      const { x, z } = AXIAL_TO_WORLD(unit.position);
      return { point: new Vector3(x, groundYFor(unit.position), z), up: 0.3 };
    }
    return {
      point: mesh.position,
      up: mesh.getBoundingInfo().boundingBox.extendSize.y + (unit.threat ? 0.65 : 0.23),
    };
  };
  const placeEventLabel = (view: CombatLabView, id: string, text: string, reserved: LabelBox[]) => {
    const unit = view.units.find(({ id: unitId }) => unitId === id);
    const mesh = unitMeshes.get(id);
    if (!unit || !mesh) return;
    const { point, up } = eventAnchor(unit, mesh);
    const halfWidth = text.startsWith('ШАГ') ? 0.475 : 0.675;
    const labelUp = eventLabelUp(point.x, Vector3.Dot(point, upAxis) + up, halfWidth, reserved);
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
  const updateHeightLabels = () => {
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
  };
  const tintUnit = (
    unit: BattleUnit,
    hoveredUnitId: string | null,
    attackableIds: ReadonlySet<string>,
  ) => {
    const material = unitMaterials.get(unit.id);
    if (!unitMeshes.has(unit.id) || !material) return;
    material.emissiveColor = isNight ? new Color3(0.82, 0.85, 0.9) : Color3.White();
    tintUnitEdge(unit, hoveredUnitId, attackableIds);
  };
  const tintUnitEdge = (
    unit: BattleUnit,
    hoveredUnitId: string | null,
    attackableIds: ReadonlySet<string>,
  ) => {
    const edgeMaterial = unitEdges.get(unit.id)?.material as StandardMaterial | undefined;
    if (edgeMaterial)
      edgeMaterial.emissiveColor = {
        day: Color3.White(),
        night: new Color3(0.67, 0.7, 0.74),
        hover: new Color3(1, 0.91, 0.68),
        target: new Color3(1, 0.69, 0.46),
      }[unitEdgeTone(unit, currentView, hoveredUnitId, attackableIds, isNight)];
  };
  const drawThreatArrow = (id: string, start: Vector3, end: Vector3) => {
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
          `threat-${name}:${id}`,
          { path: [...points], radius: 0.025, tessellation: 6 },
          scene,
        );
        line.material = threatMaterial;
        line.isPickable = false;
        previewMeshes.push(line);
      }
    }
  };
  const threatDamageAnchor = (
    threat: NonNullable<BattleUnit['threat']>,
    target: { x: number; z: number },
    groundY: number,
  ) => {
    const threatenedUnit = currentView.units.find(
      (candidate) =>
        candidate.id === threat.targetId &&
        candidate.status === 'active' &&
        HEX_KEY(candidate.position) === HEX_KEY(threat.targetHex),
    );
    const threatenedFigure = threatenedUnit && unitMeshes.get(threatenedUnit.id);
    return threatenedFigure
      ? threatenedFigure.position.add(
          new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION)).scale(
            threatenedFigure.getBoundingInfo().boundingBox.extendSize.y + 0.25,
          ),
        )
      : new Vector3(target.x, groundY + 0.28, target.z + 0.45);
  };
  const renderThreat = (unit: BattleUnit) => {
    const threat = unit.threat;
    if (unit.status !== 'active' || !threat) return;
    const origin = AXIAL_TO_WORLD(unit.position);
    const target = AXIAL_TO_WORLD(threat.targetHex);
    const groundY = groundYFor(threat.targetHex);
    const start = new Vector3(origin.x, 0.19 + groundYFor(unit.position), origin.z);
    const end = new Vector3(target.x, groundY + 0.19, target.z);
    drawThreatArrow(unit.id, start, end);
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
    const damageAnchor = threatDamageAnchor(threat, target, groundY);
    addLabel(
      scene,
      threatLabels,
      `Удар ${threat.damage.minimum}–${threat.damage.maximum} до брони`,
      damageAnchor,
      'danger',
    );
  };
  const fillMaterials = {
    preview: previewMaterial,
    selection: selectionMaterial,
    movement: movementAreaMaterial,
    combined: combinedAreaMaterial,
    shot: shotAreaMaterial,
    target: targetFill,
    threat: threatFill,
  };
  const borderColours = {
    grid: new Color3(0.42, 0.4, 0.34),
    blocked: blockedBorderMaterial.emissiveColor,
    friendly: friendlyRingMaterial.emissiveColor,
    enemy: enemyRingMaterial.emissiveColor,
    actor: actorRingMaterial.emissiveColor,
    path: pathMaterial.emissiveColor,
    movement: movementEdgeMaterial.emissiveColor,
    combined: combinedEdge,
    shot: shotAreaEdgeMaterial.emissiveColor,
    target: targetMaterial.emissiveColor,
    threat: threatMaterial.emissiveColor,
  };
  const clearPreviewMarkers = () => {
    for (const label of threatLabels.splice(0)) label.dispose(false, true);
    for (const mesh of previewMeshes.splice(0)) mesh.dispose(false, false);
  };
  const refreshFigureMarkers = (plan: ReturnType<typeof markerPlan>) => {
    for (const unit of currentView.units) tintUnit(unit, plan.hoveredUnitId, plan.attackableIds);
    for (const unit of currentView.units) renderThreat(unit);
  };
  const applyCellStyles = (cells: ReturnType<typeof markerPlan>['cells']) => {
    const styles = new Map<string, BattleCellStyle>();
    for (const [key, style] of cells)
      styles.set(key, {
        fill: style.fill ? fillMaterials[style.fill] : null,
        border: borderColours[style.border],
        priority: style.priority,
      });
    cellGrid.paint(styles);
  };
  const updateMarkers = () => {
    clearPreviewMarkers();
    updateHeightLabels();
    const plan = markerPlan(currentView, initialTiles, {
      selectedId,
      selectedSkill,
      selectedCell,
      hoveredTarget,
      highlightedId,
      showFullGrid,
    });
    refreshFigureMarkers(plan);
    applyCellStyles(plan.cells);
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
    const figureHit = figures
      .toSorted((left, right) => compareObjects(right.pickedMesh!, left.pickedMesh!))
      .find(isOpaqueFigureHit);
    if (figureHit) return figureHit;
    const groundHit = hits
      .filter(
        (hit) => !(hit.pickedMesh?.metadata as { combatUnitId?: string } | null)?.combatUnitId,
      )
      .toSorted((left, right) => left.distance - right.distance)[0];
    if (groundHit) return groundHit;
    // Exact shared edges can miss both triangles by floating point error. Try
    // each actual level, nearest first; never round on level 0 then select a
    // different raised cell or extend the map beyond its visible perimeter.
    return pickTerrainSeam(x, y);
  };
  const spriteMaskForHit = (hit: PickingInfo) => {
    const unitId = hit.pickedMesh?.metadata?.combatUnitId;
    const unit = currentView.units.find((candidate) => candidate.id === unitId);
    return unit ? spriteMasks.get(spriteForUnit(unit).url) : undefined;
  };
  const isOpaqueFigureHit = (hit: PickingInfo) => {
    const uv = hit.getTextureCoordinates();
    const mask = spriteMaskForHit(hit);
    return !!uv && !!mask && opaqueSpritePixel(mask, uv);
  };
  const pickTerrainSeam = (x: number, y: number) => {
    const ray = scene.createPickingRay(x, y, Matrix.Identity(), scene.activeCamera);
    const levels = [...new Set(initialTiles.map((tile) => tile.height))].sort((a, b) => b - a);
    for (const level of levels) {
      const hit = terrainSeamAtLevel(ray, level);
      if (hit) return hit;
    }
    return null;
  };
  const terrainSeamAtLevel = (ray: Ray, level: number) => {
    const intersection = intersectGroundLevel(ray, level);
    if (!intersection) return null;
    const { point, distance } = intersection;
    const hex = worldToHex(point.x, point.z);
    const tile = tileInfo.get(HEX_KEY(hex));
    if (!tile || tile.height !== level) return null;
    const hit = new PickingInfo();
    hit.hit = true;
    hit.distance = distance;
    hit.pickedPoint = point;
    hit.pickedMesh = scene.getMeshByName(`ground:${HEX_KEY(hex)}`);
    return hit;
  };
  const occupantAt = (hex: CombatLabHex) =>
    currentView.units.find(
      (candidate) => candidate.status === 'active' && HEX_KEY(candidate.position) === HEX_KEY(hex),
    )?.id ?? null;
  const hitMetadata = (hit: PickingInfo | null) => {
    return hit?.pickedMesh?.metadata as {
      combatUnitId?: string;
      combatHex?: CombatLabHex;
    } | null;
  };
  const anchorForId = (unitId: string | null) =>
    fieldAnchor(unitId ? unitMeshes.get(unitId) : undefined);
  const targetFrom = (hit: PickingInfo | null): BattleFieldTarget | null => {
    const metadata = hitMetadata(hit);
    if (!metadata?.combatHex) return null;
    const hex = metadata.combatHex;
    // Opaque sprite hits win above; uncovered pixels of an occupied cell address
    // its living occupant through the same hover/inspection/action target.
    const unitId = metadata.combatUnitId ?? occupantAt(hex);
    return anchoredTarget(hex, unitId);
  };
  const anchoredTarget = (hex: CombatLabHex, unitId: string | null): BattleFieldTarget => {
    const anchor = anchorForId(unitId);
    return { hex, unitId, ...(anchor ? { anchor } : {}) };
  };
  const fieldAnchor = (unit: Mesh | undefined): BattleFieldTarget['anchor'] => {
    let anchor: BattleFieldTarget['anchor'];
    if (!unit || !scene.activeCamera) return undefined;
    {
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
      anchor = avoidAnchorOverlap(anchor, reserved);
    }
    return anchor;
  };

  const hoverAt = (event: PointerEvent) => {
    if (event.buttons !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const target = targetFrom(pickAt(event.clientX - rect.left, event.clientY - rect.top));
    if (sameFieldTarget(target, hoveredTarget)) return;
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
  const refuseSkill = (reason: string | null | undefined) =>
    callbacks.onRefusal?.(reason ?? 'Выберите допустимую цель приёма');
  const useSelectedSkill = (skillId: CombatLabSkillId, targetId: string | null | undefined) => {
    const preview = currentView.skillPreview?.find(
      (row) => row.skillId === skillId && row.targetId === targetId,
    );
    if (preview?.legal) callbacks.onAct({ type: 'use-skill', skillId, targetId: preview.targetId });
    else refuseSkill(preview?.reason);
  };
  const attackUnitIfLegal = (id: string) => {
    if (currentView.attackPreview?.some(({ targetId }) => targetId === id))
      callbacks.onAct({ type: 'attack', targetId: id });
  };
  const actAtTarget = (target: BattleFieldTarget | null) => {
    if (!target) return;
    const unit = currentView.units.find(
      ({ id, status }) => id === target.unitId && status === 'active',
    );
    if (unit) {
      attackUnitIfLegal(unit.id);
    } else if (currentView.movementPreview?.some(({ to }) => HEX_KEY(to) === HEX_KEY(target.hex)))
      callbacks.onAct({ type: 'move', to: target.hex });
  };
  const camera = mountThreeQuarterCamera(scene, engine, canvas, {
    elevation: CAMERA_ELEVATION,
    perspective,
    // Use the painted plane's projected edges, including its registration offset.
    bounds: {
      minX: backgroundX - 1.1 - backgroundWidth / 2,
      maxX: backgroundX - 1.1 + backgroundWidth / 2,
      minZ: (backgroundUp - backgroundHeight / 2) / Math.sin(CAMERA_ELEVATION) - 2,
      maxZ: (backgroundUp + backgroundHeight / 2) / Math.sin(CAMERA_ELEVATION) - 2,
    },
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
      if (selectedSkill) useSelectedSkill(selectedSkill, target?.unitId);
      else actAtTarget(target);
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
  updateMarkers();
  renderEvents(initialView);
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

  const updateLighting = (night: boolean) => {
    if (isNight === night) return;
    isNight = night;
    const values = night
      ? {
          clear: new Color4(0.025, 0.031, 0.044, 1),
          intensity: 0.78,
          ground: new Color3(0.62, 0.67, 0.74),
        }
      : { clear: new Color4(0.075, 0.067, 0.057, 1), intensity: 0.98, ground: Color3.White() };
    scene.clearColor = values.clear;
    light.intensity = values.intensity;
    groundMaterial.emissiveColor = values.ground;
    for (const [material, tint] of raisedTints)
      material.emissiveColor = tint.multiply(groundMaterial.emissiveColor);
  };
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
      updateLighting(night);
      unitMeshesForView(view);
      if (changedRevision) clearHover();
      else updateMarkers();
      renderEvents(view);
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
  const style = labelStyles[tone];
  const labelWidth = style.textureWidth;
  const texture = new DynamicTexture(
    `label:${text}`,
    { width: labelWidth, height: 64 },
    scene,
    false,
  );
  texture.hasAlpha = true;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, labelWidth, 64);
  context.fillStyle = style.fill;
  context.strokeStyle = style.stroke;
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(3, 3, labelWidth - 6, 58, 8);
  context.fill();
  context.stroke();
  context.fillStyle = '#efe3c7';
  context.font = style.font;
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
      width: tone !== 'height' && text.startsWith('ШАГ') ? 0.95 : style.width,
      height: style.height,
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

function spriteDisplayHeight(id: string): number {
  if (id.startsWith('W')) return 1.4;
  return ({ B001: 0.73, B053: 1.62, B002: 1.62 } as Record<string, number>)[id] ?? 1.23;
}

const labelStyles = {
  height: {
    textureWidth: 96,
    fill: '#363b38',
    stroke: '#8e9185',
    font: 'bold 36px sans-serif',
    width: 0.32,
    height: 0.18,
  },
  danger: {
    textureWidth: 256,
    fill: '#713b2d',
    stroke: '#c17646',
    font: 'bold 26px sans-serif',
    width: 1.35,
    height: 0.3,
  },
  event: {
    textureWidth: 256,
    fill: '#24201c',
    stroke: '#b99a60',
    font: 'bold 26px sans-serif',
    width: 1.35,
    height: 0.3,
  },
};

function sameFieldTarget(left: BattleFieldTarget | null, right: BattleFieldTarget | null): boolean {
  if (!left || !right) return left === right;
  return left.unitId === right.unitId && HEX_KEY(left.hex) === HEX_KEY(right.hex);
}

function ensureMountAllowed(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new Error('Scene mount cancelled');
}

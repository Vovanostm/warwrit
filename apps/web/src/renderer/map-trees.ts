import {
  Color3,
  DirectionalLight,
  Material,
  Mesh,
  StandardMaterial,
  Texture,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

interface TreeFrame {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly pivot?: { readonly x: number; readonly y: number };
}

export interface TreePartArt {
  readonly trunk: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly frames: readonly (TreeFrame & {
      readonly attachments: readonly { readonly x: number; readonly y: number }[];
    })[];
  };
  readonly canopy: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly frames: readonly TreeFrame[];
  };
}

export type TreeSpecies = 'deciduous' | 'conifer';

export interface ComponentTreePlacement {
  readonly id: number;
  readonly species: TreeSpecies;
  readonly template: number;
  readonly size: number;
  readonly root: { readonly xFp: number; readonly zFp: number };
}

export interface TreeGroundShadow {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly offset: number;
  readonly opacity: number;
}

interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface CanopyMass {
  /** The atlas fragment's twig-base pivot is placed at this painted trunk attachment. */
  readonly attachment: number;
  /** An opaque lower-crown pixel used to cover the painted fork cap. */
  readonly overlapPivot?: { readonly x: number; readonly y: number };
  readonly width: number;
  readonly height: number;
  readonly frame: number;
  /** Small yaw offset from the current camera-facing crown plane. */
  readonly facing: number;
  readonly curve: number;
  readonly recessed?: boolean;
}

interface TreeTemplate {
  readonly canopyScale: number;
  readonly canopy: readonly CanopyMass[];
}

const DEFAULT_FRAME: TreeFrame = { left: 0, top: 0, right: 1, bottom: 1 };
const CAMERA_ELEVATION = Math.atan(1 / Math.sqrt(2));
const CAMERA_AZIMUTH = Math.PI / 4;
const SCREEN_RIGHT = { x: Math.cos(CAMERA_AZIMUTH), y: 0, z: Math.sin(CAMERA_AZIMUTH) };
const SCREEN_UP = {
  x: -Math.sin(CAMERA_AZIMUTH) * Math.sin(CAMERA_ELEVATION),
  y: Math.cos(CAMERA_ELEVATION),
  z: Math.cos(CAMERA_AZIMUTH) * Math.sin(CAMERA_ELEVATION),
};
const SCREEN_NORMAL = {
  x: Math.sin(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
  y: Math.sin(CAMERA_ELEVATION),
  z: -Math.cos(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION),
};
const CONTROL_VISIBLE_HEIGHT: Readonly<Record<TreeSpecies, number>> = {
  deciduous: 0.964114832535885,
  conifer: 0.8997395833333334,
};
const CANOPY_COLUMNS = 5;
const CANOPY_ROWS = 4;
const templates: readonly TreeTemplate[] = [
  {
    canopyScale: 1.7,
    canopy: [
      {
        attachment: 0,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.66,
        height: 0.51,
        frame: 0,
        facing: -0.18,
        curve: 0.1,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.59,
        height: 0.5,
        frame: 1,
        facing: 0.17,
        curve: 0.09,
      },
      {
        attachment: 2,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.5,
        height: 0.43,
        frame: 0,
        facing: -0.04,
        curve: 0.07,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.46,
        height: 0.38,
        frame: 1,
        facing: 0.25,
        curve: 0.065,
        recessed: true,
      },
      {
        attachment: 0,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.68,
        height: 0.57,
        frame: 1,
        facing: 0.12,
        curve: 0.08,
        recessed: true,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.72,
        height: 0.6,
        frame: 0,
        facing: -0.08,
        curve: 0.08,
      },
      {
        attachment: 2,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.66,
        height: 0.56,
        frame: 1,
        facing: -0.12,
        curve: 0.075,
        recessed: true,
      },
    ],
  },
  {
    canopyScale: 1.7,
    canopy: [
      {
        attachment: 0,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.63,
        height: 0.49,
        frame: 0,
        facing: -0.2,
        curve: 0.1,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.56,
        height: 0.46,
        frame: 1,
        facing: 0.18,
        curve: 0.09,
      },
      {
        attachment: 2,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.48,
        height: 0.42,
        frame: 0,
        facing: -0.05,
        curve: 0.07,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.44,
        height: 0.37,
        frame: 1,
        facing: 0.24,
        curve: 0.065,
        recessed: true,
      },
      {
        attachment: 0,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.66,
        height: 0.56,
        frame: 1,
        facing: 0.12,
        curve: 0.08,
        recessed: true,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.7,
        height: 0.58,
        frame: 0,
        facing: -0.08,
        curve: 0.08,
      },
      {
        attachment: 2,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.64,
        height: 0.54,
        frame: 1,
        facing: -0.12,
        curve: 0.075,
        recessed: true,
      },
    ],
  },
  {
    canopyScale: 1.7,
    canopy: [
      {
        attachment: 0,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.6,
        height: 0.47,
        frame: 0,
        facing: -0.18,
        curve: 0.095,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.57,
        height: 0.46,
        frame: 1,
        facing: 0.16,
        curve: 0.09,
      },
      {
        attachment: 2,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.47,
        height: 0.4,
        frame: 0,
        facing: -0.04,
        curve: 0.07,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.43,
        height: 0.36,
        frame: 1,
        facing: 0.22,
        curve: 0.06,
        recessed: true,
      },
      {
        attachment: 0,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.64,
        height: 0.54,
        frame: 1,
        facing: 0.12,
        curve: 0.08,
        recessed: true,
      },
      {
        attachment: 1,
        overlapPivot: { x: 0.678766, y: 0.710583 },
        width: 0.68,
        height: 0.56,
        frame: 0,
        facing: -0.08,
        curve: 0.08,
      },
      {
        attachment: 2,
        overlapPivot: { x: 0.556931, y: 0.748826 },
        width: 0.62,
        height: 0.52,
        frame: 1,
        facing: -0.12,
        curve: 0.075,
        recessed: true,
      },
    ],
  },
  {
    canopyScale: 1,
    canopy: [
      ...[
        [1, 2],
        [3, 4],
        [5, 6],
      ].flatMap((attachments, tier) =>
        attachments.map((attachment, index) => {
          const extendsLeft = attachment % 2 === 1;
          return {
            attachment,
            width: [0.3, 0.4, 0.46][tier]!,
            height: [0.2, 0.24, 0.22][tier]!,
            frame: extendsLeft ? 2 : 3,
            facing: extendsLeft ? -0.08 : 0.06,
            curve: 0.055,
            recessed: index === 1,
          };
        }),
      ),
      {
        attachment: 0,
        overlapPivot: { x: 0.801181, y: 0.232609 },
        width: 0.2,
        height: 0.19,
        frame: 2,
        facing: -0.05,
        curve: 0.04,
      },
      {
        attachment: 0,
        overlapPivot: { x: 0.118162, y: 0.192641 },
        width: 0.18,
        height: 0.18,
        frame: 3,
        facing: 0.06,
        curve: 0.04,
        recessed: true,
      },
      // Foreground boughs cross the bole; the other six recede outwards.
      {
        attachment: 2,
        width: 0.34,
        height: 0.28,
        frame: 2,
        facing: -0.04,
        curve: 0.06,
      },
      {
        attachment: 3,
        width: 0.3,
        height: 0.24,
        frame: 3,
        facing: 0.08,
        curve: 0.055,
      },
    ],
  },
];

export function coordinateHash(column: number, row: number, salt: number): number {
  let value = Math.imul(column + 1, 0x9e3779b1) ^ Math.imul(row + 1, 0x85ebca77) ^ salt;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

function hashUnit(value: number): number {
  return value / 0x100000000;
}

function appendTrunkCard(
  frame: TreeFrame,
  atlasSize: { readonly width: number; readonly height: number },
  origin: Point3,
  scale: number,
  positions: number[],
  uvs: number[],
  indices: number[],
): void {
  const pivot = frame.pivot ?? { x: 0.5, y: 1 };
  const sourceAspect =
    ((frame.right - frame.left) * atlasSize.width) /
    ((frame.bottom - frame.top) * atlasSize.height);
  const drawHeight = scale;
  const drawWidth = drawHeight * sourceAspect;
  const first = positions.length / 3;
  for (const [u, v] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const) {
    const localX = (u - pivot.x) * drawWidth;
    const localY = (pivot.y - v) * drawHeight;
    positions.push(
      origin.x + SCREEN_RIGHT.x * localX + SCREEN_UP.x * localY,
      origin.y + SCREEN_RIGHT.y * localX + SCREEN_UP.y * localY,
      origin.z + SCREEN_RIGHT.z * localX + SCREEN_UP.z * localY,
    );
    uvs.push(
      frame.left + u * (frame.right - frame.left),
      1 - frame.top - v * (frame.bottom - frame.top),
    );
  }
  indices.push(first, first + 1, first + 3, first, first + 3, first + 2);
}

function trunkAttachment(
  frame: TreePartArt['trunk']['frames'][number],
  attachmentIndex: number,
  atlasSize: { readonly width: number; readonly height: number },
  origin: Point3,
  scale: number,
): Point3 {
  const attachment = frame.attachments[attachmentIndex] ?? frame.attachments[0]!;
  const pivot = frame.pivot ?? { x: 0.5, y: 1 };
  const sourceAspect =
    ((frame.right - frame.left) * atlasSize.width) /
    ((frame.bottom - frame.top) * atlasSize.height);
  const drawWidth = scale * sourceAspect;
  const localX = (attachment.x - pivot.x) * drawWidth;
  const localY = (pivot.y - attachment.y) * scale;
  return {
    x: origin.x + SCREEN_RIGHT.x * localX + SCREEN_UP.x * localY,
    y: origin.y + SCREEN_RIGHT.y * localX + SCREEN_UP.y * localY,
    z: origin.z + SCREEN_RIGHT.z * localX + SCREEN_UP.z * localY,
  };
}

/** Measure the four fixed composites once so trunk and foliage share the control's visible height. */
function canopyFrame(frames: readonly TreeFrame[], index: number, conifer: boolean): TreeFrame {
  const speciesIndex = (conifer ? 2 : 0) + (index % 2);
  return frames[Math.min(speciesIndex, frames.length - 1)] ?? DEFAULT_FRAME;
}

function canopyPivot(mass: CanopyMass, frame: TreeFrame) {
  return mass.overlapPivot ?? frame.pivot ?? { x: 0.5, y: 0.5 };
}

function visibleAssemblyHeight(
  template: TreeTemplate,
  trunkFrame: TreePartArt['trunk']['frames'][number],
  canopyFrames: readonly TreeFrame[],
  conifer: boolean,
  art: TreePartArt,
): number {
  const trunkPivot = trunkFrame.pivot ?? { x: 0.5, y: 1 };
  let top = trunkPivot.y;
  let bottom = trunkPivot.y - 1;
  for (const mass of template.canopy) {
    const frame = canopyFrame(canopyFrames, mass.frame, conifer);
    const pivot = canopyPivot(mass, frame);
    const sourceAspect =
      ((frame.right - frame.left) * art.canopy.width) /
      ((frame.bottom - frame.top) * art.canopy.height);
    const drawHeight = template.canopyScale * Math.min(mass.height, mass.width / sourceAspect);
    const drawWidth = drawHeight * sourceAspect;
    const attachment = trunkFrame.attachments[mass.attachment] ?? trunkFrame.attachments[0]!;
    const centerY = trunkPivot.y - attachment.y;
    for (const u of [0, 1]) {
      for (const v of [0, 1]) {
        const localX = (u - pivot.x) * drawWidth;
        const localY = (pivot.y - v) * drawHeight;
        const rotatedY = localX * Math.sin(mass.facing) + localY * Math.cos(mass.facing);
        top = Math.max(top, centerY + rotatedY);
        bottom = Math.min(bottom, centerY + rotatedY);
      }
    }
  }
  return top - bottom;
}

function appendCanopyMass(
  mass: CanopyMass,
  center: Point3,
  scale: number,
  yaw: number,
  frame: TreeFrame,
  atlasSize: { readonly width: number; readonly height: number },
  positions: number[],
  uvs: number[],
  indices: number[],
  colors: number[],
): void {
  const start = positions.length / 3;
  const pivot = canopyPivot(mass, frame);
  const sourceAspect =
    ((frame.right - frame.left) * atlasSize.width) /
    ((frame.bottom - frame.top) * atlasSize.height);
  const drawHeight = Math.min(mass.height, mass.width / sourceAspect);
  const drawWidth = drawHeight * sourceAspect;
  const angle = mass.facing + yaw;
  const lightX = 0.2,
    lightY = 0.93,
    lightZ = -0.3;
  const pivotV = pivot.y;
  const pivotDepth =
    Math.sin(pivot.x * Math.PI) * Math.sin(pivotV * Math.PI) * mass.curve +
    (1 - pivotV) * (0.05 + drawWidth * 0.035);
  for (let row = 0; row <= CANOPY_ROWS; row += 1) {
    const v = row / CANOPY_ROWS;
    for (let column = 0; column <= CANOPY_COLUMNS; column += 1) {
      const u = column / CANOPY_COLUMNS;
      const localX = (u - pivot.x) * drawWidth;
      const localY = (pivot.y - v) * drawHeight;
      const rotatedX = localX * Math.cos(angle) - localY * Math.sin(angle);
      const rotatedY = localX * Math.sin(angle) + localY * Math.cos(angle);
      const depth =
        Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * mass.curve +
        (1 - v) * (0.05 + drawWidth * 0.035) -
        pivotDepth +
        (mass.recessed ? -0.025 : 0.025);
      positions.push(
        center.x +
          SCREEN_RIGHT.x * rotatedX * scale +
          SCREEN_UP.x * rotatedY * scale +
          SCREEN_NORMAL.x * depth * scale,
        center.y +
          SCREEN_RIGHT.y * rotatedX * scale +
          SCREEN_UP.y * rotatedY * scale +
          SCREEN_NORMAL.y * depth * scale,
        center.z +
          SCREEN_RIGHT.z * rotatedX * scale +
          SCREEN_UP.z * rotatedY * scale +
          SCREEN_NORMAL.z * depth * scale,
      );
      const texU = frame.left + u * (frame.right - frame.left);
      const texV = 1 - frame.top - v * (frame.bottom - frame.top);
      uvs.push(texU, texV);

      const nx = SCREEN_NORMAL.x,
        ny = 0.18 + Math.cos(v * Math.PI) * 0.17,
        nz = SCREEN_NORMAL.z;
      const facingLight = Math.max(-0.45, nx * lightX + ny * lightY + nz * lightZ);
      const upper = Math.max(0, ny);
      const shade = (0.9 + facingLight * 0.12 + upper * 0.06) * (mass.recessed ? 0.82 : 1);
      colors.push(shade, shade * 0.99, shade * 0.93, 1);
    }
  }
  appendCanopyIndices(start, indices);
}

function appendCanopyIndices(start: number, indices: number[]): void {
  const stride = CANOPY_COLUMNS + 1;
  for (let row = 0; row < CANOPY_ROWS; row += 1) {
    for (let column = 0; column < CANOPY_COLUMNS; column += 1) {
      const a = start + row * stride + column;
      const b = a + 1;
      const d = a + stride;
      const c = d + 1;
      indices.push(a, b, c, a, c, d);
    }
  }
}

function variedCanopyMass(
  baseMass: CanopyMass,
  treeId: number,
  massIndex: number,
  deciduous: boolean,
): CanopyMass {
  const massSeed = coordinateHash(treeId, massIndex, 0x369dea0f);
  const massScale = 0.87 + hashUnit(massSeed) * 0.26;
  const swapLeaf = deciduous && (massSeed & 1) === 1;
  const frameIndex = swapLeaf ? 1 - baseMass.frame : baseMass.frame;
  const overlapPivot = swapLeaf
    ? frameIndex === 0
      ? { x: 0.678766, y: 0.710583 }
      : { x: 0.556931, y: 0.748826 }
    : baseMass.overlapPivot;
  return {
    ...baseMass,
    frame: frameIndex,
    ...(overlapPivot ? { overlapPivot } : {}),
    width: baseMass.width * massScale,
    height: baseMass.height * massScale,
    facing:
      baseMass.facing + (hashUnit(coordinateHash(treeId, massIndex, 0x7f4a7c15)) - 0.5) * 0.08,
  };
}

function appendTreeGeometry(
  tree: ComponentTreePlacement,
  art: TreePartArt,
  size: number,
  origin: Point3,
  stemPositions: number[],
  stemUvs: number[],
  stemIndices: number[],
  canopyPositions: number[],
  canopyUvs: number[],
  canopyIndices: number[],
  canopyColors: number[],
): void {
  const template = templates[tree.template]!;
  const variation = coordinateHash(tree.root.xFp, tree.root.zFp, 0x94d049bb);
  const yaw = (hashUnit(variation) - 0.5) * 0.24;
  const trunkFrame = art.trunk.frames[tree.species === 'conifer' ? 3 : tree.template]!;
  appendTrunkCard(
    trunkFrame,
    { width: art.trunk.width, height: art.trunk.height },
    origin,
    size,
    stemPositions,
    stemUvs,
    stemIndices,
  );
  const atlasFrames = art.canopy.frames.length > 0 ? art.canopy.frames : [DEFAULT_FRAME];
  for (const [massIndex, baseMass] of template.canopy.entries()) {
    const mass = variedCanopyMass(baseMass, tree.id, massIndex, tree.species === 'deciduous');
    const speciesFrame = tree.species === 'deciduous' ? mass.frame % 2 : 2 + (mass.frame % 2);
    const frame = atlasFrames[Math.min(speciesFrame, atlasFrames.length - 1)] ?? DEFAULT_FRAME;
    const attachment = trunkAttachment(
      trunkFrame,
      mass.attachment,
      { width: art.trunk.width, height: art.trunk.height },
      origin,
      size,
    );
    appendCanopyMass(
      mass,
      attachment,
      size * template.canopyScale,
      yaw,
      frame,
      { width: art.canopy.width, height: art.canopy.height },
      canopyPositions,
      canopyUvs,
      canopyIndices,
      canopyColors,
    );
  }
}

/** Shared painted trunks and curved crown parts; coordinate-seeded variations survive reload. */
export function createComponentTreeBatch(
  scene: Scene,
  art: TreePartArt,
  trees: readonly ComponentTreePlacement[],
  sceneFp: (fp: number) => number,
  heightAt: (x: number, z: number) => number,
): {
  readonly stems: Mesh;
  readonly canopy: Mesh;
  readonly shadows: readonly TreeGroundShadow[];
  readonly setNight: (night: boolean) => void;
} {
  const stemPositions: number[] = [],
    stemUvs: number[] = [],
    stemIndices: number[] = [];
  const canopyPositions: number[] = [],
    canopyUvs: number[] = [],
    canopyIndices: number[] = [],
    canopyColors: number[] = [];

  const templateScales = templates.map((template, templateIndex) => {
    const species: TreeSpecies = templateIndex === 3 ? 'conifer' : 'deciduous';
    const trunkFrame = art.trunk.frames[templateIndex]!;
    const canopyFrames = art.canopy.frames.length > 0 ? art.canopy.frames : [DEFAULT_FRAME];
    const extent = visibleAssemblyHeight(
      template,
      trunkFrame,
      canopyFrames,
      species === 'conifer',
      art,
    );
    return CONTROL_VISIBLE_HEIGHT[species] / extent;
  });

  for (const tree of trees) {
    const x = sceneFp(tree.root.xFp),
      z = sceneFp(tree.root.zFp);
    appendTreeGeometry(
      tree,
      art,
      tree.size * templateScales[tree.template]!,
      { x, y: heightAt(x, z) + 0.018, z },
      stemPositions,
      stemUvs,
      stemIndices,
      canopyPositions,
      canopyUvs,
      canopyIndices,
      canopyColors,
    );
  }

  const trunkTexture = new Texture(art.trunk.url, scene);
  trunkTexture.hasAlpha = true;
  trunkTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
  trunkTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const trunkMaterial = new StandardMaterial('component-tree-painted-trunks', scene);
  trunkMaterial.diffuseTexture = trunkTexture;
  trunkMaterial.emissiveTexture = trunkTexture;
  trunkMaterial.useAlphaFromDiffuseTexture = true;
  trunkMaterial.diffuseColor = Color3.Black();
  trunkMaterial.emissiveColor = new Color3(0.92, 0.87, 0.78);
  trunkMaterial.specularColor = Color3.Black();
  trunkMaterial.transparencyMode = Material.MATERIAL_ALPHATEST;
  trunkMaterial.alphaCutOff = 0.15;
  trunkMaterial.backFaceCulling = false;
  const stemData = new VertexData();
  stemData.positions = stemPositions;
  stemData.uvs = stemUvs;
  stemData.indices = stemIndices;
  stemData.normals = [];
  VertexData.ComputeNormals(stemPositions, stemIndices, stemData.normals);
  const stems = new Mesh('component-tree-stems', scene);
  stemData.applyToMesh(stems);
  stems.material = trunkMaterial;
  stems.isPickable = false;
  stems.renderingGroupId = 1;

  const canopyTexture = new Texture(art.canopy.url, scene);
  canopyTexture.hasAlpha = true;
  canopyTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
  canopyTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const canopyMaterial = new StandardMaterial('component-tree-canopy', scene);
  canopyMaterial.diffuseTexture = canopyTexture;
  canopyMaterial.emissiveTexture = canopyTexture;
  canopyMaterial.useAlphaFromDiffuseTexture = true;
  canopyMaterial.diffuseColor = new Color3(0.94, 0.91, 0.8);
  canopyMaterial.emissiveColor = new Color3(0.025, 0.02, 0.012);
  canopyMaterial.specularColor = Color3.Black();
  canopyMaterial.transparencyMode = Material.MATERIAL_ALPHATEST;
  canopyMaterial.alphaCutOff = 0.15;
  canopyMaterial.backFaceCulling = false;
  canopyMaterial.twoSidedLighting = true;
  const canopyData = new VertexData();
  canopyData.positions = canopyPositions;
  canopyData.uvs = canopyUvs;
  canopyData.colors = canopyColors;
  canopyData.indices = canopyIndices;
  canopyData.normals = [];
  VertexData.ComputeNormals(canopyPositions, canopyIndices, canopyData.normals);
  const canopy = new Mesh('component-tree-canopy', scene);
  canopyData.applyToMesh(canopy);
  canopy.useVertexColors = true;
  canopy.material = canopyMaterial;
  canopy.isPickable = false;
  canopy.renderingGroupId = 1;
  const treeKey = new DirectionalLight(
    'component-tree-upper-left-key',
    new Vector3(0.12, -1, 0.85),
    scene,
  );
  treeKey.includedOnlyMeshes = [stems, canopy];

  const shadows = trees.flatMap((tree) => {
    const template = templates[tree.template]!;
    const spread = Math.max(
      0.18,
      ...template.canopy.map((mass) => mass.width * template.canopyScale * 0.5),
    );
    const point = tree.root;
    const x = sceneFp(point.xFp),
      z = sceneFp(point.zFp);
    const width = Math.min(0.72, Math.max(0.34, spread * 0.9)) * tree.size;
    const depth = Math.min(0.32, Math.max(0.16, spread * 0.45)) * tree.size;
    const offset = Math.min(width * 0.18, depth * 0.18, 0.045);
    return [{ x, z, width, depth, offset, opacity: 0.12 }];
  });
  const setNight = (night: boolean) => {
    trunkMaterial.emissiveColor.copyFrom(
      night ? new Color3(0.5, 0.54, 0.61) : new Color3(0.92, 0.87, 0.78),
    );
    canopyMaterial.diffuseColor.copyFrom(
      night ? new Color3(0.78, 0.8, 0.73) : new Color3(0.88, 0.88, 0.8),
    );
    canopyMaterial.emissiveColor.copyFrom(new Color3(0.28, 0.28, 0.26));
    treeKey.intensity = night ? 0.35 : 0.48;
  };
  setNight(false);
  return { stems, canopy, shadows, setNight };
}

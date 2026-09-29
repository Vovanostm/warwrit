import {
  Asset,
  BLEND_NORMAL,
  CULLFACE_NONE,
  Entity,
  MeshInstance,
  StandardMaterial,
  createMesh,
} from 'playcanvas';
import type { Application, Texture, Vec3 } from 'playcanvas';

type PixelBounds = { left: number; top: number; right: number; bottom: number };
type SpriteManifest = {
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
  frames: Array<{
    directionIndex: number;
    yawDegrees: number;
    file: string;
    bounds: PixelBounds;
  }>;
};

const EXPECTED_YAWS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const EXPECTED_PIVOT = { x: 0.5, y: 0.3226163983345032 } as const;

const MANIFEST_URL = '/art-pipeline/knight-idle-8dir/manifest.json';
const FRAME_HEIGHT_AT_UNIT_SCALE = 6.6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function readManifest(value: unknown): SpriteManifest {
  if (!isRecord(value) || value['schemaVersion'] !== 1 || !isRecord(value['capture']))
    throw new Error('ART05 sprite manifest has an unsupported schema.');
  const capture = value['capture'];
  const actor = value['actor'];
  const animation = value['animation'];
  const size = capture['outputSize'];
  const sourceSize = capture['sourceSize'];
  const crop = capture['sourceCrop'];
  const yaws = capture['yawDegrees'];
  const pivot = capture['pivot'];
  if (
    value['bake'] !== 'playcanvas-2.22.4-art05-a' ||
    !isRecord(actor) ||
    actor['id'] !== 'red-knight-1' ||
    actor['classId'] !== 'Knight' ||
    JSON.stringify(actor['equipment']) !== JSON.stringify(['sword_1handed', 'shield_round']) ||
    !isRecord(animation) ||
    animation['clip'] !== 'Idle_A' ||
    animation['sampleSeconds'] !== 0 ||
    animation['loop'] !== true ||
    capture['projection'] !== 'orthographic' ||
    capture['directions'] !== 8 ||
    !Array.isArray(sourceSize) ||
    sourceSize.length !== 2 ||
    sourceSize[0] !== 1600 ||
    sourceSize[1] !== 900 ||
    !Array.isArray(size) ||
    size.length !== 2 ||
    size[0] !== 512 ||
    size[1] !== 512 ||
    !isRecord(crop) ||
    crop['x'] !== 350 ||
    crop['y'] !== 0 ||
    crop['width'] !== 900 ||
    crop['height'] !== 900 ||
    !Array.isArray(yaws) ||
    yaws.length !== EXPECTED_YAWS.length ||
    yaws.some((yaw, index) => yaw !== EXPECTED_YAWS[index]) ||
    !isRecord(pivot) ||
    !finiteNumber(pivot['x']) ||
    !finiteNumber(pivot['y']) ||
    pivot['x'] < 0 ||
    pivot['x'] > 1 ||
    pivot['y'] < 0 ||
    pivot['y'] > 1 ||
    pivot['x'] !== EXPECTED_PIVOT.x ||
    pivot['y'] !== EXPECTED_PIVOT.y ||
    pivot['origin'] !== 'projected world-space actor root at [0, 0, 0]' ||
    pivot['normalizedFrom'] !== 'bottom-left' ||
    !Array.isArray(value['outputs'])
  )
    throw new Error('ART05 sprite manifest has invalid dimensions, pivot, or direction count.');

  const frames = value['outputs'].flatMap((output): SpriteManifest['frames'] => {
    if (!isRecord(output) || output['pass'] !== 'color') return [];
    const bounds = output['alphaBounds'];
    const directionIndex = output['directionIndex'];
    const yawDegrees = output['yawDegrees'];
    const file = output['file'];
    if (
      !integer(directionIndex) ||
      !finiteNumber(yawDegrees) ||
      output['width'] !== 512 ||
      output['height'] !== 512 ||
      typeof file !== 'string' ||
      file !== `knight-idle-d0${directionIndex}-color.png` ||
      !isRecord(bounds) ||
      !integer(bounds['left']) ||
      !integer(bounds['top']) ||
      !integer(bounds['right']) ||
      !integer(bounds['bottom'])
    )
      throw new Error('ART05 sprite manifest contains an invalid color frame.');
    if (
      directionIndex < 0 ||
      directionIndex >= EXPECTED_YAWS.length ||
      yawDegrees !== EXPECTED_YAWS[directionIndex] ||
      yaws[directionIndex] !== yawDegrees
    )
      throw new Error('ART05 sprite manifest has inconsistent direction and capture yaw metadata.');
    const pixelBounds: PixelBounds = {
      left: bounds['left'],
      top: bounds['top'],
      right: bounds['right'],
      bottom: bounds['bottom'],
    };
    if (
      pixelBounds.left < 0 ||
      pixelBounds.top < 0 ||
      pixelBounds.right < pixelBounds.left ||
      pixelBounds.bottom < pixelBounds.top ||
      pixelBounds.right >= size[0] ||
      pixelBounds.bottom >= size[1]
    )
      throw new Error('ART05 sprite manifest contains out-of-range frame bounds.');
    return [
      {
        directionIndex,
        yawDegrees,
        file,
        bounds: pixelBounds,
      },
    ];
  });
  if (
    frames.length !== 8 ||
    new Set(frames.map((frame) => frame.directionIndex)).size !== 8 ||
    frames.some((frame, index) => frame.directionIndex !== index)
  )
    throw new Error('ART05 sprite manifest must contain exactly eight color directions.');
  return {
    width: size[0],
    height: size[1],
    pivotX: pivot['x'],
    pivotY: pivot['y'],
    frames,
  };
}

function loadTexture(app: Application, name: string, url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const asset = new Asset(name, 'texture', { url });
    asset.once('load', () => {
      if (!asset.resource) reject(new Error(`ART05 sprite image ${name} has no texture resource.`));
      else resolve(asset.resource as Texture);
    });
    asset.once('error', (error: unknown) =>
      reject(new Error(`ART05 sprite image failed: ${String(error)}`)),
    );
    app.assets.add(asset);
    app.assets.load(asset);
  });
}

function makeFrameMesh(app: Application, manifest: SpriteManifest, bounds: PixelBounds) {
  const left = (bounds.left / manifest.width - manifest.pivotX) * FRAME_HEIGHT_AT_UNIT_SCALE;
  const right =
    ((bounds.right + 1) / manifest.width - manifest.pivotX) * FRAME_HEIGHT_AT_UNIT_SCALE;
  const bottomPixels = manifest.height - bounds.bottom - 1;
  const topPixels = manifest.height - bounds.top;
  const bottom = (bottomPixels / manifest.height - manifest.pivotY) * FRAME_HEIGHT_AT_UNIT_SCALE;
  const top = (topPixels / manifest.height - manifest.pivotY) * FRAME_HEIGHT_AT_UNIT_SCALE;
  const u0 = bounds.left / manifest.width;
  const u1 = (bounds.right + 1) / manifest.width;
  const v0 = (bounds.bottom + 1) / manifest.height;
  const v1 = bounds.top / manifest.height;
  return {
    mesh: createMesh(
      app.graphicsDevice,
      [left, bottom, 0, right, bottom, 0, right, top, 0, left, top, 0],
      {
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        uvs: [u0, v0, u1, v0, u1, v1, u0, v1],
        indices: [0, 1, 2, 0, 2, 3],
      },
    ),
    localBounds: { left, right, bottom, top },
  };
}

export async function createArtSprite(app: Application, actorPosition: Vec3) {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) throw new Error(`ART05 sprite manifest request failed (${response.status}).`);
  const manifest = readManifest((await response.json()) as unknown);
  const loaded = await Promise.allSettled(
    manifest.frames.map(async (frame) => {
      const imageUrl = `${MANIFEST_URL.slice(0, MANIFEST_URL.lastIndexOf('/') + 1)}${frame.file}`;
      const texture = await loadTexture(app, frame.file, imageUrl);
      if (texture.width !== manifest.width || texture.height !== manifest.height)
        throw new Error(`ART05 sprite image ${frame.file} does not match manifest dimensions.`);
      return { frame, texture };
    }),
  );
  const failed = loaded.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
  const frames = loaded.map((result) => {
    if (result.status !== 'fulfilled')
      throw new Error('ART05 sprite image loading did not settle.');
    const { frame, texture } = result.value;
    const { mesh, localBounds } = makeFrameMesh(app, manifest, frame.bounds);
    const material = new StandardMaterial();
    material.diffuse.set(0, 0, 0);
    material.useLighting = false;
    material.emissiveMap = texture;
    material.emissive.set(1, 1, 1);
    material.opacityMap = texture;
    material.opacityMapChannel = 'a';
    material.alphaTest = 0.01;
    material.blendType = BLEND_NORMAL;
    material.depthWrite = false;
    material.cull = CULLFACE_NONE;
    material.update();
    const meshInstance = new MeshInstance(mesh, material);
    meshInstance.castShadow = false;
    return { ...frame, localBounds, meshInstance };
  });
  frames.sort((a, b) => a.directionIndex - b.directionIndex);

  const root = new Entity('ART05 Knight sprite preview');
  root.setPosition(actorPosition.x, actorPosition.y, actorPosition.z);
  root.setLocalScale(1, 1, 1);
  root.addComponent('render', { meshInstances: frames.map((frame) => frame.meshInstance) });
  frames.forEach((frame, index) => {
    frame.meshInstance.visible = index === 0;
  });
  app.root.addChild(root);
  let activeIndex = 0;

  return {
    root,
    update(cameraPosition: Vec3) {
      const dx = cameraPosition.x - root.getPosition().x;
      const dz = cameraPosition.z - root.getPosition().z;
      const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
      const normalizedYaw = (yaw + 360) % 360;
      root.setEulerAngles(0, yaw, 0);
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < frames.length; index++) {
        const delta = Math.abs(((normalizedYaw - frames[index]!.yawDegrees + 540) % 360) - 180);
        if (delta < nearestDistance) {
          nearestDistance = delta;
          nearestIndex = index;
        }
      }
      if (nearestIndex !== activeIndex) {
        frames[activeIndex]!.meshInstance.visible = false;
        frames[nearestIndex]!.meshInstance.visible = true;
        activeIndex = nearestIndex;
      }
    },
    pickDistance(from: Vec3, to: Vec3) {
      const yaw = (root.getEulerAngles().y * Math.PI) / 180;
      const normalX = Math.sin(yaw);
      const normalZ = Math.cos(yaw);
      const directionX = to.x - from.x;
      const directionY = to.y - from.y;
      const directionZ = to.z - from.z;
      const denominator = directionX * normalX + directionZ * normalZ;
      if (Math.abs(denominator) < 1e-8) return null;
      const position = root.getPosition();
      const distance =
        ((position.x - from.x) * normalX + (position.z - from.z) * normalZ) / denominator;
      if (distance < 0 || distance > 1) return null;
      const hitX = from.x + directionX * distance - position.x;
      const hitY = from.y + directionY * distance - position.y;
      const hitZ = from.z + directionZ * distance - position.z;
      const localX = hitX * Math.cos(yaw) - hitZ * Math.sin(yaw);
      const localY = hitY;
      const bounds = frames[activeIndex]!.localBounds;
      if (
        localX < bounds.left ||
        localX > bounds.right ||
        localY < bounds.bottom ||
        localY > bounds.top
      )
        return null;
      return distance;
    },
  };
}

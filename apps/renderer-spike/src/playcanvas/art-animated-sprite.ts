import {
  Asset,
  BLEND_NORMAL,
  CULLFACE_NONE,
  Entity,
  MeshInstance,
  StandardMaterial,
  createMesh,
} from 'playcanvas';
import type { Application, Mesh, Texture, Vec3 } from 'playcanvas';

type ActorSprite = { id: string; position: Vec3 };
type PixelBounds = { left: number; top: number; right: number; bottom: number };
type Pivot = { x: number; y: number };
type SpriteFrame = {
  sampleSeconds: number;
  directionIndex: number;
  yawDegrees: number;
  file: string;
  bounds: PixelBounds;
  pivot: Pivot;
  texture: Texture;
  mesh: Mesh;
  material: StandardMaterial;
  localBounds: { left: number; right: number; bottom: number; top: number };
};

const SAMPLE_SECONDS = [
  0, 0.13333334028720856, 0.2666666805744171, 0.40000002086162567, 0.5333333611488342,
  0.6666667014360428, 0.8000000417232513, 0.9333333820104599,
] as const;
const YAW_DEGREES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const SAMPLE_ROOT = '/art-pipeline/scout-b2';
const FRAME_SIZE = 256;
const FRAME_HEIGHT_AT_UNIT_SCALE = 6.6;
const KNIGHT_EQUIPMENT = ['sword_1handed', 'shield_round'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function sampleToken(sampleSeconds: number) {
  return String(sampleSeconds).replace('.', 'p');
}

function sampleDirectory(sampleSeconds: number) {
  return `${SAMPLE_ROOT}/knight-walking_a-t${sampleToken(sampleSeconds)}-s256`;
}

function readManifest(value: unknown, sampleIndex: number) {
  const sampleSeconds = SAMPLE_SECONDS[sampleIndex]!;
  const token = sampleToken(sampleSeconds);
  if (!isRecord(value) || value['schemaVersion'] !== 1 || !isRecord(value['capture']))
    throw new Error(`ART05 animated sprite sample ${sampleIndex} has an unsupported manifest.`);
  const capture = value['capture'];
  const actor = value['actor'];
  const animation = value['animation'];
  const outputSize = capture['outputSize'];
  const yaws = capture['yawDegrees'];
  const pivot = capture['pivot'];
  const pivotX = isRecord(pivot) ? pivot['x'] : undefined;
  const pivotY = isRecord(pivot) ? pivot['y'] : undefined;
  if (
    value['bake'] !== 'playcanvas-2.22.4-art05-b2-scout' ||
    !isRecord(actor) ||
    actor['id'] !== 'red-knight-1' ||
    actor['classId'] !== 'Knight' ||
    JSON.stringify(actor['equipment']) !== JSON.stringify(KNIGHT_EQUIPMENT) ||
    !isRecord(animation) ||
    animation['clip'] !== 'Walking_A' ||
    animation['sampleSeconds'] !== sampleSeconds ||
    animation['loop'] !== true ||
    !finiteNumber(animation['durationSeconds']) ||
    animation['durationSeconds'] <= 0 ||
    Math.abs((animation['durationSeconds'] * sampleIndex) / 8 - sampleSeconds) > 1e-9 ||
    capture['projection'] !== 'orthographic' ||
    capture['directions'] !== YAW_DEGREES.length ||
    !Array.isArray(outputSize) ||
    outputSize.length !== 2 ||
    outputSize[0] !== FRAME_SIZE ||
    outputSize[1] !== FRAME_SIZE ||
    !Array.isArray(yaws) ||
    yaws.length !== YAW_DEGREES.length ||
    yaws.some((yaw, index) => yaw !== YAW_DEGREES[index]) ||
    !isRecord(pivot) ||
    !finiteNumber(pivotX) ||
    !finiteNumber(pivotY) ||
    pivotX < 0 ||
    pivotX > 1 ||
    pivotY < 0 ||
    pivotY > 1 ||
    pivot['origin'] !== 'projected world-space actor root at [0, 0, 0]' ||
    pivot['normalizedFrom'] !== 'bottom-left' ||
    !Array.isArray(value['outputs'])
  )
    throw new Error(`ART05 animated sprite sample ${sampleIndex} has invalid capture metadata.`);

  const colorOutputs = value['outputs'].filter(
    (output): output is Record<string, unknown> => isRecord(output) && output['pass'] === 'color',
  );
  if (colorOutputs.length !== YAW_DEGREES.length)
    throw new Error(`ART05 animated sprite sample ${sampleIndex} must contain eight color frames.`);
  const frames = colorOutputs.map((output, directionIndex) => {
    const bounds = output['alphaBounds'];
    const expectedFile = `knight-walking_a-t${token}-d${String(directionIndex).padStart(2, '0')}-color.png`;
    if (
      output['directionIndex'] !== directionIndex ||
      output['yawDegrees'] !== YAW_DEGREES[directionIndex] ||
      output['width'] !== FRAME_SIZE ||
      output['height'] !== FRAME_SIZE ||
      output['file'] !== expectedFile ||
      !isRecord(bounds) ||
      !integer(bounds['left']) ||
      !integer(bounds['top']) ||
      !integer(bounds['right']) ||
      !integer(bounds['bottom']) ||
      bounds['left'] < 0 ||
      bounds['top'] < 0 ||
      bounds['right'] < bounds['left'] ||
      bounds['bottom'] < bounds['top'] ||
      bounds['right'] >= FRAME_SIZE ||
      bounds['bottom'] >= FRAME_SIZE
    )
      throw new Error(
        `ART05 animated sprite sample ${sampleIndex} has an invalid direction ${directionIndex}.`,
      );
    return {
      sampleSeconds,
      directionIndex,
      yawDegrees: YAW_DEGREES[directionIndex]!,
      file: expectedFile,
      bounds: {
        left: bounds['left'],
        top: bounds['top'],
        right: bounds['right'],
        bottom: bounds['bottom'],
      },
      pivot: { x: pivotX, y: pivotY },
    };
  });
  return { durationSeconds: animation['durationSeconds'], frames };
}

function loadManifest(url: string, signal: AbortSignal) {
  return fetch(url, { signal }).then((response) => {
    if (!response.ok)
      throw new Error(`ART05 animated sprite manifest request failed (${response.status}).`);
    return response.json() as Promise<unknown>;
  });
}

function loadTexture(
  assets: Set<Asset>,
  assetRegistry: Application['assets'],
  url: string,
  signal: AbortSignal,
): Promise<Texture> {
  if (signal.aborted) return Promise.reject(new Error('ART05 animated sprite load cancelled.'));
  const asset = new Asset(url, 'texture', { url });
  assets.add(asset);
  return new Promise((resolve, reject) => {
    let settled = false;
    const removeListeners = () => {
      asset.off('load', onLoad);
      asset.off('error', onError);
      signal.removeEventListener('abort', onAbort);
    };
    const onLoad = () => {
      removeListeners();
      if (signal.aborted) {
        asset.unload();
        assetRegistry.remove(asset);
        return;
      }
      settled = true;
      if (!asset.resource) reject(new Error(`ART05 animated sprite image has no texture: ${url}`));
      else resolve(asset.resource as Texture);
    };
    const onError = (error: unknown) => {
      removeListeners();
      settled = true;
      reject(new Error(`ART05 animated sprite image failed: ${String(error)}`));
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      asset.off('error', onError);
      signal.removeEventListener('abort', onAbort);
      reject(new Error('ART05 animated sprite load cancelled.'));
    };
    asset.once('load', onLoad);
    asset.once('error', onError);
    signal.addEventListener('abort', onAbort, { once: true });
    assetRegistry.add(asset);
    assetRegistry.load(asset);
  });
}

function makeFrameMesh(app: Application, bounds: PixelBounds, pivot: Pivot) {
  const left = (bounds.left / FRAME_SIZE - pivot.x) * FRAME_HEIGHT_AT_UNIT_SCALE;
  const right = ((bounds.right + 1) / FRAME_SIZE - pivot.x) * FRAME_HEIGHT_AT_UNIT_SCALE;
  const bottomPixels = FRAME_SIZE - bounds.bottom - 1;
  const topPixels = FRAME_SIZE - bounds.top;
  const bottom = (bottomPixels / FRAME_SIZE - pivot.y) * FRAME_HEIGHT_AT_UNIT_SCALE;
  const top = (topPixels / FRAME_SIZE - pivot.y) * FRAME_HEIGHT_AT_UNIT_SCALE;
  return {
    mesh: createMesh(
      app.graphicsDevice,
      [left, bottom, 0, right, bottom, 0, right, top, 0, left, top, 0],
      {
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        uvs: [
          bounds.left / FRAME_SIZE,
          (bounds.bottom + 1) / FRAME_SIZE,
          (bounds.right + 1) / FRAME_SIZE,
          (bounds.bottom + 1) / FRAME_SIZE,
          (bounds.right + 1) / FRAME_SIZE,
          bounds.top / FRAME_SIZE,
          bounds.left / FRAME_SIZE,
          bounds.top / FRAME_SIZE,
        ],
        indices: [0, 1, 2, 0, 2, 3],
      },
    ),
    localBounds: { left, right, bottom, top },
  };
}

function nearestDirectionIndex(yaw: number) {
  const normalizedYaw = (yaw + 360) % 360;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < YAW_DEGREES.length; index++) {
    const delta = Math.abs(((normalizedYaw - YAW_DEGREES[index]! + 540) % 360) - 180);
    if (delta < nearestDistance) {
      nearestDistance = delta;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

function planePickDistance(root: Entity, frame: SpriteFrame, from: Vec3, to: Vec3) {
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
  if (
    localX < frame.localBounds.left ||
    localX > frame.localBounds.right ||
    hitY < frame.localBounds.bottom ||
    hitY > frame.localBounds.top
  )
    return null;
  return distance;
}

export async function createAnimatedArtSprites(app: Application, actors: ActorSprite[]) {
  const assetRegistry = app.assets;
  if (!assetRegistry) throw new Error('ART05 animated sprite application is already destroyed.');
  const assets = new Set<Asset>();
  const roots: Array<{ id: string; root: Entity; instance: MeshInstance; activeFrame: number }> =
    [];
  const meshes: Mesh[] = [];
  const materials: StandardMaterial[] = [];
  const loadAbort = new AbortController();
  let disposed = false;
  const assertActive = () => {
    if (disposed) throw new Error('ART05 animated sprite load cancelled.');
  };
  const disposeResources = () => {
    if (disposed) return;
    disposed = true;
    app.off('destroy', disposeResources);
    loadAbort.abort();
    roots.forEach(({ root }) => root.destroy());
    materials.forEach((material) => material.destroy());
    meshes.forEach((mesh) => mesh.destroy());
    assets.forEach((asset) => {
      asset.unload();
      assetRegistry.remove(asset);
    });
  };
  app.once('destroy', disposeResources);

  try {
    const manifestUrls = SAMPLE_SECONDS.map((sample) => `${sampleDirectory(sample)}/manifest.json`);
    const rawManifests = await Promise.all(
      manifestUrls.map((url) => loadManifest(url, loadAbort.signal)),
    );
    assertActive();
    const parsed = rawManifests.map((manifest, index) => readManifest(manifest, index));
    const durationSeconds = parsed[0]!.durationSeconds;
    if (parsed.some((entry) => entry.durationSeconds !== durationSeconds))
      throw new Error('ART05 animated sprite manifests disagree on clip duration.');
    const pivot = parsed[0]!.frames[0]!.pivot;
    for (const entry of parsed) {
      for (const frame of entry.frames) {
        if (frame.pivot.x !== pivot.x || frame.pivot.y !== pivot.y)
          throw new Error('ART05 animated sprite manifests disagree on the actor pivot.');
      }
    }

    const frameMetadata = parsed.flatMap((entry, sampleIndex) =>
      entry.frames.map((frame) => ({ ...frame, sampleIndex })),
    );
    const loaded = await Promise.allSettled(
      frameMetadata.map(async (frame) => {
        const baseUrl = `${sampleDirectory(frame.sampleSeconds)}/`;
        const texture = await loadTexture(
          assets,
          assetRegistry,
          `${baseUrl}${frame.file}`,
          loadAbort.signal,
        );
        assertActive();
        if (texture.width !== FRAME_SIZE || texture.height !== FRAME_SIZE)
          throw new Error(`ART05 animated sprite image ${frame.file} has invalid dimensions.`);
        const { mesh, localBounds } = makeFrameMesh(app, frame.bounds, frame.pivot);
        meshes.push(mesh);
        const material = new StandardMaterial();
        materials.push(material);
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
        return { ...frame, texture, mesh, material, localBounds } satisfies SpriteFrame;
      }),
    );
    const failure = loaded.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    assertActive();
    const frames = loaded.map((result) => {
      if (result.status !== 'fulfilled')
        throw new Error('ART05 animated sprite load did not settle.');
      return result.value;
    });

    for (const actor of actors) {
      const root = new Entity(`ART05 animated Knight sprite ${actor.id}`);
      root.setPosition(actor.position.x, actor.position.y, actor.position.z);
      const initialFrame = frames[0]!;
      const instance = new MeshInstance(initialFrame.mesh, initialFrame.material);
      instance.castShadow = false;
      roots.push({ id: actor.id, root, instance, activeFrame: -1 });
      root.addComponent('render', { meshInstances: [instance] });
      app.root.addChild(root);
    }

    const update = (cameraPosition: Vec3, elapsedSeconds: number) => {
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0)
        throw new Error('ART05 animated sprite time must be finite and nonnegative.');
      const phase = elapsedSeconds % durationSeconds;
      const sampleIndex = Math.min(7, Math.floor((phase / durationSeconds) * 8));
      for (const entry of roots) {
        const dx = cameraPosition.x - entry.root.getPosition().x;
        const dz = cameraPosition.z - entry.root.getPosition().z;
        const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
        const frameIndex = sampleIndex * YAW_DEGREES.length + nearestDirectionIndex(yaw);
        entry.root.setEulerAngles(0, yaw, 0);
        if (frameIndex !== entry.activeFrame) {
          const frame = frames[frameIndex]!;
          entry.instance.mesh = frame.mesh;
          entry.instance.material = frame.material;
          entry.activeFrame = frameIndex;
        }
      }
    };

    const pickDistance = (from: Vec3, to: Vec3) => {
      let closest: { actorId: string; distance: number } | null = null;
      for (const entry of roots) {
        if (entry.activeFrame < 0) continue;
        const distance = planePickDistance(entry.root, frames[entry.activeFrame]!, from, to);
        if (distance !== null && (!closest || distance < closest.distance))
          closest = { actorId: entry.id, distance };
      }
      return closest;
    };

    assertActive();
    return { update, pickDistance, destroy: disposeResources };
  } catch (error) {
    disposeResources();
    throw error;
  }
}

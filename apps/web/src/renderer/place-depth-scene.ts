import {
  Color4,
  FreeCamera,
  MeshBuilder,
  RawTexture,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
} from '@babylonjs/core';
import { acquireCanvasEngine, releaseCanvasEngine } from './canvas-engine.js';
import {
  PLACE_DEPTH_HEIGHT,
  PLACE_LOOK_LIMIT,
  projectPlacePoint,
  samplePlaceDepth,
  type PlaceLook,
} from './place-depth-projection.js';

// Original shader: inverse projection onto camera-space relief. No DepthFlow code/runtime.
const vertexSource = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 imageUV;
void main() {
  imageUV = vec2(uv.x, 1.0 - uv.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const fragmentSource = `
precision highp float;
varying vec2 imageUV;
uniform sampler2D painting;
uniform sampler2D depthMap;
uniform vec2 look;
uniform float relief;
vec2 sourceUV(float z) { return imageUV - look * (1.0 / z - 1.0); }
float surfaceZ(float z) { return 1.0 - relief * texture2D(depthMap, sourceUV(z)).r; }
void main() {
  if (length(look) < 0.00001) {
    gl_FragColor = texture2D(painting, imageUV);
    return;
  }
  float nearZ = 1.0 - relief;
  float farZ = 1.0;
  float stepZ = relief / 32.0;
  // Take the first surface along the ray; binary search alone can jump across a roof.
  for (int i = 1; i <= 32; i++) {
    float z = 1.0 - relief + float(i) * stepZ;
    if (z >= surfaceZ(z)) { farZ = z; nearZ = z - stepZ; break; }
  }
  for (int i = 0; i < 6; i++) {
    float z = (nearZ + farZ) * 0.5;
    if (z >= surfaceZ(z)) farZ = z; else nearZ = z;
  }
  gl_FragColor = texture2D(painting, sourceUV((nearZ + farZ) * 0.5));
}`;

async function imagePixels(url: string): Promise<ImageData> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Place image decoder unavailable');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export interface PlaceDepthAnchor {
  readonly x: number;
  readonly y: number;
  readonly element: HTMLElement;
}

function interpolateLook(current: PlaceLook, target: PlaceLook, elapsed: number): PlaceLook {
  const blend = 1 - Math.exp(-Math.min(64, elapsed || 16) / 75);
  return {
    x: current.x + (target.x - current.x) * blend,
    y: current.y + (target.y - current.y) * blend,
  };
}

export function mountPlaceDepth(
  canvas: HTMLCanvasElement,
  image: string,
  depth: string,
  anchors: readonly PlaceDepthAnchor[],
  onStatus: (active: boolean) => void,
  onLook: (look: PlaceLook) => void,
) {
  const engine = acquireCanvasEngine(canvas);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  new FreeCamera('place-relief-camera', new Vector3(0, 0, -1), scene);
  const plane = MeshBuilder.CreatePlane('painted-place', { size: 2 }, scene);
  plane.isPickable = false;
  const material = new ShaderMaterial(
    'place-relief',
    scene,
    { vertexSource, fragmentSource },
    {
      attributes: ['position', 'uv'],
      uniforms: ['look', 'relief'],
      samplers: ['painting', 'depthMap'],
      needAlphaBlending: true,
    },
  );
  material.backFaceCulling = false;
  material.setFloat('relief', PLACE_DEPTH_HEIGHT);
  material.setVector2('look', Vector2.Zero());
  plane.material = material;

  let disposed = false,
    ready = false,
    frame = 0,
    previousTime = 0;
  let target: PlaceLook = { x: 0, y: 0 },
    current: PlaceLook = target;
  let points: { anchor: PlaceDepthAnchor; depth: number }[] = [];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resetAnchors = () =>
    anchors.forEach(({ element, x, y }) => {
      element.style.left = `${x}%`;
      element.style.top = `${y}%`;
    });
  function fail() {
    ready = false;
    cancelAnimationFrame(frame);
    frame = 0;
    if (!disposed) {
      resetAnchors();
      onStatus(false);
    }
  }
  function draw(time: number) {
    frame = 0;
    if (disposed || !ready || canvas.clientWidth === 0) return;
    updateAndRender(time);
  }
  function updateAndRender(time: number) {
    current = interpolateLook(current, target, time - previousTime);
    previousTime = time;
    material.setVector2('look', new Vector2(current.x, current.y));
    for (const { anchor, depth } of points) {
      const p = projectPlacePoint(anchor.x / 100, anchor.y / 100, depth, current);
      anchor.element.style.left = `${p.x * 100}%`;
      anchor.element.style.top = `${p.y * 100}%`;
    }
    try {
      scene.render();
      onLook(current);
    } catch {
      fail();
      return;
    }
    if (Math.abs(current.x - target.x) + Math.abs(current.y - target.y) > 0.00001) schedule();
  }
  function schedule() {
    if (!frame && ready && !disposed) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(() => {
    if (canvas.clientWidth > 0) {
      engine.resize();
      schedule();
    }
  });
  resize.observe(canvas);
  const reduceMotion = () => {
    if (motion.matches) {
      target = { x: 0, y: 0 };
      current = target;
    }
    schedule();
  };
  motion.addEventListener('change', reduceMotion);
  canvas.addEventListener('webglcontextlost', fail);
  material.onError = fail;
  void Promise.all([imagePixels(image), imagePixels(depth)])
    .then(async ([art, depths]) => {
      if (disposed) return;
      const texture = (pixels: ImageData) => {
        const result = RawTexture.CreateRGBATexture(
          pixels.data,
          pixels.width,
          pixels.height,
          scene,
          false,
          false,
          Texture.BILINEAR_SAMPLINGMODE,
        );
        result.wrapU = Texture.CLAMP_ADDRESSMODE;
        result.wrapV = Texture.CLAMP_ADDRESSMODE;
        return result;
      };
      material.setTexture('painting', texture(art));
      material.setTexture('depthMap', texture(depths));
      points = anchors.map((anchor) => ({
        anchor,
        depth: samplePlaceDepth(depths, anchor.x / 100, anchor.y / 100),
      }));
      await scene.whenReadyAsync();
      if (disposed) return;
      ready = true;
      engine.resize();
      scene.render();
      onLook(current);
      onStatus(true);
      schedule();
    })
    .catch(fail);
  return {
    look(x: number, y: number) {
      target = motion.matches
        ? { x: 0, y: 0 }
        : {
            x: Math.max(-1, Math.min(1, x)) * PLACE_LOOK_LIMIT.x,
            y: Math.max(-1, Math.min(1, y)) * PLACE_LOOK_LIMIT.y,
          };
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      motion.removeEventListener('change', reduceMotion);
      canvas.removeEventListener('webglcontextlost', fail);
      resetAnchors();
      scene.dispose();
      releaseCanvasEngine(canvas);
    },
  };
}

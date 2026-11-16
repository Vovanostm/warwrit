import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Shaders/postprocess.vertex';
import '@babylonjs/core/Shaders/rgbdDecode.fragment';
import '@babylonjs/core/Shaders/shadowMap.vertex';
import '@babylonjs/core/Shaders/shadowMap.fragment';
import '@babylonjs/core/Shaders/depthBoxBlur.fragment';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { Light } from '@babylonjs/core/Lights/light';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import { Scene } from '@babylonjs/core/scene';
import './style.css';

const battlefieldUrl = new URL(
  '../../../../assets/art/combat/mill-3d-2026-10-26/battlefield.glb',
  import.meta.url,
).href;
const sourceUrl = new URL(
  '../../../../assets/art/combat/mill-3d-2026-10-26/source-battlefield.png',
  import.meta.url,
).href;

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing preview element: ${id}`);
  return found as T;
}
const canvas = element<HTMLCanvasElement>('scene');
const status = element('status');
const reference = element<HTMLImageElement>('reference-image');
reference.src = sourceUrl;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
function resize(): void {
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 1.5));
  engine.resize();
}
resize();
const scene = new Scene(engine);
scene.useRightHandedSystem = true;
scene.clearColor = new Color4(0.11, 0.135, 0.14, 1);
scene.imageProcessingConfiguration.exposure = 1.1;
scene.imageProcessingConfiguration.contrast = 1.15;
const camera = new ArcRotateCamera(
  'Inspection camera',
  Math.PI / 2,
  Math.PI / 3.6,
  37,
  Vector3.Zero(),
  scene,
);
camera.attachControl(canvas, true);
camera.lowerBetaLimit = Math.PI / 4;
camera.upperBetaLimit = Math.PI / 2 - 0.002;
camera.lowerRadiusLimit = 8;
camera.upperRadiusLimit = 60;
camera.wheelDeltaPercentage = 0.025;
camera.panningSensibility = 100;
camera.minZ = 0.1;
const fill = new HemisphericLight('Overcast sky', new Vector3(0, 1, 0), scene);
fill.groundColor = new Color3(0.27, 0.23, 0.18);
fill.intensity = 0.8;
const sun = new DirectionalLight('Soft daylight', new Vector3(0.5, -1, -0.4), scene);
sun.position = new Vector3(-10, 25, 15);
sun.intensity = 1.1;
sun.diffuse = new Color3(1, 0.95, 0.84);
const moon = new SpotLight(
  'Moonlit mill facade',
  new Vector3(-3, 18, 8),
  new Vector3(0, -12, -16),
  Math.PI / 3.6,
  1,
  scene,
);
moon.diffuse = new Color3(0.65, 0.75, 0.95);
moon.falloffType = Light.FALLOFF_STANDARD;
moon.range = 60;
moon.intensity = 0;
const shadows = new ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;
shadows.darkness = 0.3;
shadows.bias = 0.002;
shadows.normalBias = 0.03;
let night = false;
const angle = element<HTMLInputElement>('angle');
const angleValue = element<HTMLOutputElement>('angle-value');

function framing(close = false): void {
  camera.setTarget(close ? new Vector3(-3, 5, -6.5) : new Vector3(0, 1, 0));
  camera.alpha = Math.PI / 2;
  camera.beta = Math.PI / 2 - (40 * Math.PI) / 180;
  camera.radius = close ? 25 : 43;
  camera.inertialAlphaOffset = 0;
  camera.inertialBetaOffset = 0;
  camera.inertialRadiusOffset = 0;
  camera.inertialPanningX = 0;
  camera.inertialPanningY = 0;
}
function showReference(show: boolean): void {
  reference.hidden = !show;
  canvas.hidden = show;
  element('reference').setAttribute('aria-pressed', String(show));
  element('reference').textContent = show ? 'К 3D-сцене' : 'Исходное изображение';
  element<HTMLButtonElement>('light').disabled = show;
  angle.disabled = show;
}
function configurePaintedMaterial(material: Material): void {
  if (!(material instanceof PBRMaterial)) return;
  material.metallic = 0;
  material.roughness = 0.95;
  material.environmentIntensity = 0;
  for (const texture of material.getActiveTextures()) texture.anisotropicFilteringLevel = 8;
}
async function loadScene(): Promise<void> {
  const battlefield = await LoadAssetContainerAsync(battlefieldUrl, scene);
  battlefield.addAllToScene();
  for (const mesh of battlefield.meshes) {
    mesh.receiveShadows = true;
    shadows.addShadowCaster(mesh);
  }
  for (const material of battlefield.materials) configurePaintedMaterial(material);
  framing();
  canvas.dataset['ready'] = 'true';
  status.textContent = 'Старая мельница — осмотр поля боя';
}
element('yard').addEventListener('click', () => {
  showReference(false);
  framing();
});
element('close').addEventListener('click', () => {
  showReference(false);
  framing(true);
});
element('reset').addEventListener('click', () => {
  showReference(false);
  framing();
});
element('reference').addEventListener('click', () => showReference(reference.hidden));
const lighting = {
  day: {
    fillIntensity: 0.8,
    fillColor: Color3.White(),
    sunDirection: new Vector3(0.5, -1, -0.4),
    sunPosition: new Vector3(-10, 25, 15),
    sunIntensity: 1.1,
    moonIntensity: 0,
    sunColor: new Color3(1, 0.95, 0.84),
    exposure: 1.1,
    background: new Color4(0.11, 0.135, 0.14, 1),
    toggleLabel: 'Ночь',
  },
  night: {
    fillIntensity: 0.38,
    fillColor: new Color3(0.5, 0.63, 0.83),
    sunDirection: new Vector3(0.35, -0.35, -1),
    sunPosition: new Vector3(-10, 14, 30),
    sunIntensity: 1.3,
    moonIntensity: 2,
    sunColor: new Color3(0.63, 0.73, 0.93),
    exposure: 0.9,
    background: new Color4(0.035, 0.05, 0.075, 1),
    toggleLabel: 'День',
  },
};
element('light').addEventListener('click', () => {
  night = !night;
  const preset = night ? lighting.night : lighting.day;
  fill.intensity = preset.fillIntensity;
  fill.diffuse = preset.fillColor;
  sun.direction = preset.sunDirection;
  sun.position = preset.sunPosition;
  sun.intensity = preset.sunIntensity;
  moon.intensity = preset.moonIntensity;
  sun.diffuse = preset.sunColor;
  scene.imageProcessingConfiguration.exposure = preset.exposure;
  scene.clearColor = preset.background;
  element('light').setAttribute('aria-pressed', String(night));
  element('light').textContent = preset.toggleLabel;
});
angle.addEventListener('input', () => {
  camera.inertialBetaOffset = 0;
  camera.beta = Math.min(Math.PI / 2 - 0.002, Math.PI / 2 - (Number(angle.value) * Math.PI) / 180);
});
scene.onBeforeRenderObservable.add(() => {
  const elevation = Math.round(((Math.PI / 2 - camera.beta) * 180) / Math.PI);
  angle.value = String(elevation);
  angleValue.textContent = `${elevation}°`;
});
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', resize);
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) engine.dispose();
});
void loadScene().catch((error: unknown) => {
  status.textContent = `Не удалось открыть 3D-сцену: ${error instanceof Error ? error.message : String(error)}`;
  canvas.dataset['ready'] = 'error';
  showReference(true);
});

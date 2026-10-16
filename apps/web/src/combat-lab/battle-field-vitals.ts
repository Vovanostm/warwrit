import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import type { CombatLabView } from '@warwrit/protocol';
import { CAMERA_ELEVATION } from '../renderer/three-quarter-camera.js';
import { unitVitalPools } from './unit-vitals.js';
import './battle-field-vitals.css';

type Unit = CombatLabView['units'][number];
const COLORS = ['#d28c7f', '#a4c0cb', '#d2bb7d'] as const;
const WIDTH = 32;
const HEIGHT = 12;
const UP = new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION));

function drawPools(texture: DynamicTexture, unit: Unit, element: HTMLElement) {
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 96, 36);
  element.replaceChildren();
  unitVitalPools(unit).forEach((pool, index) => {
    const y = index * 12;
    context.fillStyle = '#101b1b';
    context.fillRect(0, y, 96, 10);
    context.fillStyle = COLORS[index]!;
    context.fillRect(2, y + 2, Math.round((92 * pool.percent) / 100), 6);
    // Fixed order plus distinct track patterns preserve identity without colour alone.
    context.fillStyle = '#101b1b99';
    if (index > 0) for (let x = 8; x < 94; x += 12) context.fillRect(x, y + 2, index, 6);
    const row = document.createElement('span');
    row.dataset['resource'] = pool.key;
    row.dataset['current'] = String(pool.current);
    row.dataset['maximum'] = String(pool.maximum);
    row.textContent = `${pool.label}: ${pool.current}/${pool.maximum}`;
    element.append(row);
  });
  texture.update();
}

/** Foot-sorted world strips: directly under their owner, behind foreground figures. */
export function mountBattleFieldVitals(canvas: HTMLCanvasElement, scene: Scene) {
  const layer = document.createElement('div');
  layer.className = 'battle-field-vitals';
  canvas.insertAdjacentElement('afterend', layer);
  const makeStrip = (unit: Unit) => {
    const element = document.createElement('div');
    element.className = 'battle-field-vital';
    element.dataset['unitId'] = unit.id;
    element.setAttribute('aria-label', `Ресурсы: ${unit.name ?? unit.id}`);
    layer.append(element);
    const texture = new DynamicTexture(
      `vital-pools:${unit.id}`,
      { width: 96, height: 36 },
      scene,
      false,
    );
    texture.hasAlpha = true;
    const material = new StandardMaterial(`vital-pools:${unit.id}`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.linkEmissiveWithDiffuse = true;
    material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
    const mesh = MeshBuilder.CreatePlane(`unit-vitals:${unit.id}`, { size: 1 }, scene);
    mesh.material = material;
    mesh.rotation.x = CAMERA_ELEVATION;
    mesh.renderingGroupId = 1;
    mesh.alphaIndex = 2;
    mesh.isPickable = false;
    return { element, texture, mesh };
  };
  const strips = new Map<string, ReturnType<typeof makeStrip>>();
  const observer = scene.onBeforeCameraRenderObservable.add((camera) => {
    const worldPerPixel = ((camera.orthoTop ?? 7) * 2) / Math.max(canvas.clientHeight, 1);
    for (const [id, { mesh }] of strips) {
      const foot = scene.getMeshByName(`unit:${id}`)?.metadata?.combatFoot as Vector3 | undefined;
      if (!foot) continue;
      mesh.position.copyFrom(foot.subtract(UP.scale((HEIGHT / 2 + 4) * worldPerPixel)));
      mesh.scaling.set(WIDTH * worldPerPixel, HEIGHT * worldPerPixel, 1);
      mesh.metadata = { combatUnitId: id, combatFoot: foot };
    }
  });
  return {
    update(view: CombatLabView) {
      layer.hidden = view.status !== 'active';
      const active = new Set(
        view.units.filter((unit) => unit.status === 'active').map((unit) => unit.id),
      );
      for (const [id, strip] of strips)
        if (!active.has(id)) {
          strip.mesh.dispose(false, true);
          strip.element.remove();
          strips.delete(id);
        }
      for (const unit of view.units.filter((unit) => active.has(unit.id))) {
        let strip = strips.get(unit.id);
        if (!strip) {
          strip = makeStrip(unit);
          strips.set(unit.id, strip);
        }
        strip.mesh.setEnabled(view.status === 'active');
        drawPools(strip.texture, unit, strip.element);
      }
    },
    destroy() {
      scene.onBeforeCameraRenderObservable.remove(observer);
      for (const strip of strips.values()) strip.mesh.dispose(false, true);
      layer.remove();
      strips.clear();
    },
  };
}

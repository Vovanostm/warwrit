import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  Matrix,
  StandardMaterial,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import type { BattlePresentationView, Unit } from './battle-presentation.js';
import { CAMERA_ELEVATION } from '../renderer/three-quarter-camera.js';
import { battleUnitMarker } from './battle-framing.js';
import { unitVitalPools } from './unit-vitals.js';
import './battle-field-vitals.css';

const COLORS = ['#e29c8e', '#b5d7e5', '#e6cf8f'] as const;
const WIDTH = 32;
const HEIGHT = 16;
const UP = new Vector3(0, Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION));

function drawPools(texture: DynamicTexture, unit: Unit, element: HTMLElement) {
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 96, 48);
  element.replaceChildren();
  for (const [index, pool] of unitVitalPools(unit).entries()) {
    drawPoolBar(context, pool.percent, index);
    element.append(poolLabel(pool));
  }
  texture.update();
}

function drawPoolBar(
  context: CanvasRenderingContext2D,
  percent: number | undefined,
  index: number,
) {
  const y = index * 16;
  context.fillStyle = '#0d1717';
  context.fillRect(0, y, 96, 14);
  context.fillStyle = COLORS[index]!;
  if (percent !== undefined) context.fillRect(2, y + 2, Math.round((92 * percent) / 100), 10);
  // Fixed order plus distinct track patterns preserve identity without colour alone.
  context.fillStyle = '#101b1b99';
  if (index > 0) for (let x = 8; x < 94; x += 12) context.fillRect(x, y + 2, index, 10);
}

function poolLabel(pool: ReturnType<typeof unitVitalPools>[number]) {
  const row = document.createElement('span');
  row.dataset['resource'] = pool.key;
  row.dataset['current'] = String(pool.current);
  if (pool.maximum !== undefined) row.dataset['maximum'] = String(pool.maximum);
  row.textContent = poolReading(pool);
  return row;
}

function poolReading(pool: ReturnType<typeof unitVitalPools>[number]) {
  if (pool.current === undefined) return `${pool.label}: неизвестно`;
  if (pool.maximum === undefined) return `${pool.label}: ${pool.current} · максимум неизвестен`;
  return `${pool.label}: ${pool.current}/${pool.maximum}`;
}

/** Foot-sorted world strips: directly under their owner, behind foreground figures. */
export function mountBattleFieldVitals(
  canvas: HTMLCanvasElement,
  scene: Scene,
  onInspect: (id: string) => void,
) {
  const layer = document.createElement('div');
  layer.className = 'battle-field-vitals';
  canvas.insertAdjacentElement('afterend', layer);
  const makeStrip = (unit: Unit) => {
    const portrait = document.createElement('button');
    portrait.type = 'button';
    portrait.hidden = true;
    portrait.className = 'battle-overview-unit';
    portrait.dataset['unitId'] = unit.id;
    portrait.title = `${unit.name ?? unit.id} · Осмотреть и приблизить`;
    portrait.setAttribute('aria-label', portrait.title);
    portrait.onclick = () => onInspect(unit.id);
    layer.append(portrait);
    const element = document.createElement('div');
    element.className = 'battle-field-vital';
    element.dataset['unitId'] = unit.id;
    element.setAttribute('aria-label', `Ресурсы: ${unit.name ?? unit.id}`);
    layer.append(element);
    const texture = new DynamicTexture(
      `vital-pools:${unit.id}`,
      { width: 96, height: 48 },
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
    // The scene creates unit meshes before updating their field readouts.
    const source = scene.getMeshByName(`unit:${unit.id}`)!;
    return { element, texture, mesh, source, portrait };
  };
  const strips = new Map<string, ReturnType<typeof makeStrip>>();
  const observer = scene.onBeforeCameraRenderObservable.add((camera) => {
    const viewport = camera.viewport.toGlobal(
      scene.getEngine().getRenderWidth(),
      scene.getEngine().getRenderHeight(),
    );
    const entries = [...strips];
    const reference = entries[0]?.[1].source.metadata.combatFoot as Vector3 | undefined;
    const projected = (point: Vector3) =>
      Vector3.Project(point, Matrix.Identity(), scene.getTransformMatrix(), viewport);
    const overview = isOverviewScale(
      reference,
      projected,
      canvas.clientHeight / scene.getEngine().getRenderHeight(),
    );
    canvas.closest('.battle-view')?.classList.toggle('battle-overview', overview);
    for (const [id, { mesh, source, portrait }] of entries) {
      const foot = source.metadata.combatFoot as Vector3;
      const screen = (point: Vector3) =>
        Vector3.Project(point, Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const base = screen(foot),
        above = screen(foot.add(UP));
      const pixelsPerWorld =
        (Math.hypot(above.x - base.x, above.y - base.y) * canvas.clientHeight) /
        scene.getEngine().getRenderHeight();
      const worldPerPixel = 1 / pixelsPerWorld;
      mesh.setEnabled(!overview && !layer.hidden);
      portrait.hidden = !overview;
      // Anchor centre is the actual projected foot. Never displace it into another cell.
      portrait.style.left = `${(base.x * canvas.clientWidth) / scene.getEngine().getRenderWidth()}px`;
      portrait.style.top = `${(base.y * canvas.clientHeight) / scene.getEngine().getRenderHeight()}px`;
      mesh.position.copyFrom(foot.subtract(UP.scale((HEIGHT / 2 + 4) * worldPerPixel)));
      mesh.scaling.set(WIDTH * worldPerPixel, HEIGHT * worldPerPixel, 1);
      mesh.metadata = { combatUnitId: id, combatFoot: foot };
    }
  });
  return {
    update(view: BattlePresentationView) {
      layer.hidden = view.status !== 'active';
      const active = new Set(
        view.units.filter((unit) => unit.status === 'active').map((unit) => unit.id),
      );
      [...strips]
        .filter(([id]) => !active.has(id))
        .forEach(([id, strip]) => {
          strip.mesh.dispose(false, true);
          strip.element.remove();
          strip.portrait.remove();
          strips.delete(id);
        });
      for (const unit of view.units.filter((unit) => active.has(unit.id))) {
        let strip = strips.get(unit.id);
        if (!strip) {
          strip = makeStrip(unit);
          strips.set(unit.id, strip);
        }
        updatePortraitState(strip.portrait, unit, view);
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

function updatePortraitState(portrait: HTMLButtonElement, unit: Unit, view: BattlePresentationView) {
  const ally = unit.sideId === view.controlledSideId;
  const marker = battleUnitMarker(view.units, unit.id);
  portrait.textContent = marker;
  portrait.title = unitInspectionTitle(unit, marker, ally);
  portrait.setAttribute('aria-label', portrait.title);
  portrait.dataset['side'] = ally ? 'human' : 'opponent';
  portrait.setAttribute('aria-current', unit.id === view.activation?.actorId ? 'step' : 'false');
}

function unitInspectionTitle(unit: Unit, marker: string, ally: boolean) {
  return `Метка ${marker} · ${ally ? 'Союзник' : 'Противник'} · ${unit.name ?? unit.id} · клетка ${unit.position.q}, ${unit.position.r} · Осмотреть и приблизить`;
}

function isOverviewScale(
  foot: Vector3 | undefined,
  project: (point: Vector3) => Vector3,
  pixelScale: number,
) {
  if (!foot) return false;
  return project(foot.add(UP)).subtract(project(foot)).length() * pixelScale < 30;
}

import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import type { CombatLabHex } from '@warwrit/protocol';
import fringeUrl from '../../../../assets/art/combat/readable-terrain-2026-10-16/yard-fringe.png';
import { CAMERA_ELEVATION as DEFAULT_ELEVATION } from '../renderer/three-quarter-camera.js';
import { battleHexToWorld } from './battle-layout.js';

/** Decorative ruined-yard roots sit outside the canonical field, never on a traversable cell. */
export function mountBattleScenery(
  scene: Scene,
  tiles: readonly CombatLabHex[],
  CAMERA_ELEVATION = DEFAULT_ELEVATION,
) {
  const minQ = Math.min(...tiles.map((tile) => tile.q));
  const maxQ = Math.max(...tiles.map((tile) => tile.q));
  const minR = Math.min(...tiles.map((tile) => tile.r));
  const maxR = Math.max(...tiles.map((tile) => tile.r));
  const material = new StandardMaterial('yard-fringe:ink', scene);
  material.diffuseTexture = new Texture(fringeUrl, scene);
  material.diffuseTexture.hasAlpha = true;
  material.useAlphaFromDiffuseTexture = true;
  material.disableLighting = true;
  material.linkEmissiveWithDiffuse = true;
  material.disableDepthWrite = true;
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  const anchors = [
    { q: minQ + (maxQ - minQ) * 0.35, r: maxR + 2 },
    { q: minQ + (maxQ - minQ) * 0.8, r: maxR + 2.4 },
    { q: maxQ + 2.5, r: minR + (maxR - minR) * 0.32 },
    { q: maxQ + 2.8, r: minR + (maxR - minR) * 0.76 },
    { q: minQ + (maxQ - minQ) * 0.35, r: minR - 2.4 },
    { q: minQ + (maxQ - minQ) * 0.8, r: minR - 2.2 },
  ];
  anchors.forEach((anchor, index) => {
    const point = battleHexToWorld(anchor);
    const width = 7.4 - (index % 3) * 0.65;
    const height = (width * 887) / 1774;
    const rootOffset = height * 0.3;
    const mesh = MeshBuilder.CreatePlane(`yard-fringe:${index}`, { width, height }, scene);
    mesh.rotation.x = CAMERA_ELEVATION;
    mesh.position.set(
      point.x,
      rootOffset * Math.cos(CAMERA_ELEVATION),
      point.z + rootOffset * Math.sin(CAMERA_ELEVATION),
    );
    mesh.material = material;
    mesh.isPickable = false;
    mesh.renderingGroupId = 1;
    mesh.metadata = { combatFoot: new Vector3(point.x, 0, point.z) };
  });
  return {
    setNight(night: boolean) {
      material.emissiveColor = night ? new Color3(0.36, 0.4, 0.48) : Color3.White();
    },
  };
}

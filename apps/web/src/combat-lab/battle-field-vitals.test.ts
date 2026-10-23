// Reused from frozen #179's supplemental projection regression; no source copied.
import { FreeCamera, Matrix, MeshBuilder, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { expect, it, vi } from 'vitest';
import { mountBattleFieldVitals } from './battle-field-vitals.js';
import type { BattlePresentationView } from './battle-presentation.js';

// Only the DOM/canvas adapter is substituted; projection, meshes and camera are real Babylon.
class Element {
  dataset = {};
  style = {};
  hidden = false;
  children: Element[] = [];
  append(child: Element) {
    this.children.push(child);
  }
  replaceChildren() {
    this.children = [];
  }
  setAttribute() {}
  remove() {}
}

it.each([undefined, Math.PI / 6])(
  'keeps vitals 32x16 with a four-pixel gap and the 30px switch (%s)',
  (elevation) => {
    const pitch = elevation ?? (50 * Math.PI) / 180;
    const engine = new NullEngine({
      renderWidth: 800,
      renderHeight: 600,
      textureSize: 128,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    const scene = new Scene(engine);
    const context = { clearRect() {}, fillRect() {} };
    vi.spyOn(engine, 'createCanvas').mockReturnValue({
      width: 96,
      height: 48,
      getContext: () => context,
    } as unknown as ReturnType<NullEngine['createCanvas']>);
    vi.stubGlobal('document', { createElement: () => new Element(), removeEventListener() {} });
    const toggle = vi.fn();
    const canvas = {
      clientHeight: 600,
      clientWidth: 800,
      insertAdjacentElement() {},
      closest: () => ({ classList: { toggle } }),
    } as unknown as HTMLCanvasElement;
    const unit = {
      id: 'u',
      name: 'Guard',
      sideId: 'human',
      status: 'active',
      position: { q: 0, r: 0 },
      pools: { health: { current: 10, maximum: 20 } },
    };
    const view = {
      status: 'active',
      controlledSideId: 'human',
      units: [unit],
      activation: { actorId: 'u' },
    } as unknown as BattlePresentationView;
    const source = MeshBuilder.CreatePlane('unit:u', { size: 1 }, scene);
    source.metadata = { combatFoot: Vector3.Zero() };
    const camera = new FreeCamera('camera', Vector3.Zero(), scene);
    camera.fov = 0.8;
    const vitals = mountBattleFieldVitals(canvas, scene, vi.fn(), elevation);
    try {
      vitals.update(view);
      for (const pixels of [31, 29]) {
        const distance = 600 / (2 * Math.tan(0.4) * pixels);
        camera.position.set(0, distance * Math.sin(pitch), -distance * Math.cos(pitch));
        camera.setTarget(Vector3.Zero());
        scene.render();
        const mesh = scene.getMeshByName('unit-vitals:u')!;
        expect(mesh.rotation.x).toBeCloseTo(pitch, 12);
        expect(toggle).toHaveBeenLastCalledWith('battle-overview', pixels < 30);
        expect(mesh.isEnabled()).toBe(pixels >= 30);
        const world = mesh.computeWorldMatrix(true);
        const project = (point: Vector3) =>
          Vector3.Project(
            point,
            Matrix.Identity(),
            scene.getTransformMatrix(),
            camera.viewport.toGlobal(800, 600),
          );
        const corners = [-0.5, 0.5].flatMap((x) =>
          [-0.5, 0.5].map((y) =>
            project(Vector3.TransformCoordinates(new Vector3(x, y, 0), world)),
          ),
        );
        expect(
          Math.max(...corners.map((p) => p.x)) - Math.min(...corners.map((p) => p.x)),
        ).toBeCloseTo(32, 4);
        expect(
          Math.max(...corners.map((p) => p.y)) - Math.min(...corners.map((p) => p.y)),
        ).toBeCloseTo(16, 4);
        expect(Math.min(...corners.map((p) => p.y)) - project(Vector3.Zero()).y).toBeCloseTo(4, 4);
      }
      vitals.update({ ...view, units: [] });
      expect(scene.getMeshByName('unit-vitals:u')).toBeNull();
    } finally {
      vitals.destroy();
      scene.dispose();
      engine.dispose();
      vi.unstubAllGlobals();
    }
  },
);

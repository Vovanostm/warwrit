import { NullEngine, Ray, Scene, StandardMaterial, Vector3, VertexBuffer } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import type { WorldContinuousMapDto } from '@warwrit/protocol';
import { createMapSurface } from './map-surface.js';
import { createMapRoads } from './map-roads.js';
import { createMapShadows } from './map-shadows.js';

const boundary = [
  { xFp: -1024, zFp: -1024 },
  { xFp: 1024, zFp: -1024 },
  { xFp: 1024, zFp: 1024 },
  { xFp: -1024, zFp: 1024 },
];
const region: WorldContinuousMapDto = {
  mapEdition: 'renderer-fixture',
  origin: { xFp: -1024, zFp: -1024 },
  worldScale: 3,
  columns: 32,
  rows: 32,
  cellSizeFp: 64,
  boundary,
  terrainShapes: [{ shapeId: 'hill', terrainId: 'hills', paintPriority: 1, polygon: boundary }],
  overlayShapes: [],
  blockingShapes: [],
  dangerAreaShapes: [],
  sites: [],
};

describe('raised world presentation', () => {
  it('grounds contacts and every draped route chord on the actual picked triangles, with upward normals', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const surface = createMapSurface(scene, region);
      const points = surface.drape({ x: -2.76, z: -1.95 }, { x: 2.86, z: 2.59 }, 0);
      expect(points.length).toBeGreaterThan(32);
      const rayY = (x: number, z: number) =>
        scene.pickWithRay(
          new Ray(new Vector3(x, 10, z), new Vector3(0, -1, 0)),
          (m) => m === surface.ground,
        )!.pickedPoint!.y;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]!,
          b = points[i + 1]!;
        for (const t of [0, 0.23, 0.67, 1]) {
          const x = a.x + (b.x - a.x) * t,
            z = a.z + (b.z - a.z) * t;
          const y = a.y + (b.y - a.y) * t;
          // Babylon's ray/triangle tolerance can select the adjacent face at an edge.
          // 0.0001 scene units is below 0.02CSSpx at the closest game zoom.
          expect(Math.abs(surface.heightAt(x, z) - rayY(x, z))).toBeLessThan(0.0001);
          expect(y).toBeCloseTo(surface.heightAt(x, z), 6);
        }
      }
      const normals = surface.ground.getVerticesData(VertexBuffer.NormalKind)!;
      for (let i = 1; i < normals.length; i += 3) expect(normals[i]).toBeGreaterThan(0);
      const ys = surface.ground
        .getVerticesData(VertexBuffer.PositionKind)!
        .filter((_, i) => i % 3 === 1);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.7);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
  it('drapes full road banks and non-speed margins over relief without changing their footprint', () => {
    const engine = new NullEngine(),
      scene = new Scene(engine);
    try {
      const surface = createMapSurface(scene, region);
      // Paired banks follow the authored left (+Z for +X heading), then reversed right.
      const polygon = [
        { xFp: -512, zFp: 80 },
        { xFp: 512, zFp: 80 },
        { xFp: 512, zFp: -80 },
        { xFp: -512, zFp: -80 },
      ];
      const material = new StandardMaterial('test-surface', scene);
      const materials = { trail: material, dirt_road: material, paved_road: material };
      createMapRoads(
        scene,
        { ...region, overlayShapes: [{ shapeId: 'paved', overlayId: 'paved_road', polygon }] },
        materials,
        materials,
        surface.heightAt,
      );
      const road = scene.getMeshByName('corridor:paved')!;
      expect(road.isPickable).toBe(false);
      const positions = road.getVerticesData(VertexBuffer.PositionKind)!;
      const xs: number[] = [],
        zs: number[] = [];
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]!,
          y = positions[i + 1]!,
          z = positions[i + 2]!;
        xs.push(x);
        zs.push(z);
        const lift = y - surface.heightAt(x, z);
        expect(lift).toBeGreaterThan(0.0089);
        expect(lift).toBeLessThan(0.0161);
      }
      expect(Math.min(...xs)).toBe(-1.5);
      expect(Math.max(...xs)).toBe(1.5);
      expect(Math.min(...zs)).toBe(-0.234375);
      expect(Math.max(...zs)).toBe(0.234375);
      const normals = road.getVerticesData(VertexBuffer.NormalKind)!;
      for (let i = 1; i < normals.length; i += 3) expect(normals[i]).toBeGreaterThan(0);
      const margins = scene.meshes.filter((m) => m.name.startsWith('shoulder:'));
      expect(margins.length).toBe(2);
      for (const margin of margins) {
        expect(margin.isPickable).toBe(false);
        const vertices = margin.getVerticesData(VertexBuffer.PositionKind)!;
        for (let i = 0; i < vertices.length; i += 3)
          expect(vertices[i + 1]! - surface.heightAt(vertices[i]!, vertices[i + 2]!)).toBeCloseTo(
            0.008,
            6,
          );
      }
      const contacts = createMapShadows(scene, surface.heightAt);
      contacts.add(0, 0, 0.35);
      contacts.finish();
      const shadow = scene.getMeshByName('map-contact-shadows')!;
      expect(shadow.isPickable).toBe(false);
      const shadowPoints = shadow.getVerticesData(VertexBuffer.PositionKind)!;
      for (let i = 0; i < shadowPoints.length; i += 3)
        expect(
          shadowPoints[i + 1]! - surface.heightAt(shadowPoints[i]!, shadowPoints[i + 2]!),
        ).toBeCloseTo(0.006, 6);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});

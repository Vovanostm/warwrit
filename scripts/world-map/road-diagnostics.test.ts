// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { buildNavigationField, findTravelPath } from '@warwrit/game-core';
import { mapProfiles } from './navigation-maps.js';
import { inspectRoadNetwork, mountRoadDiagnostics } from './road-diagnostics.js';

const atlas = mapProfiles.atlas;
const field = buildNavigationField(atlas.region);

test('both repaired road connections are linked without treating ordinary dead ends as errors', () => {
  const report = inspectRoadNetwork(field, atlas.roadConnections);
  expect(report.connections.map((connection) => connection.connected)).toEqual([true, true]);
  expect(report.edges.length).toBeGreaterThan(0);
  expect(
    [...field.roadEdges!].some(
      ([node, next]) =>
        node >= field.walkable.length &&
        next.filter((id) => id >= field.walkable.length).length === 1,
    ),
  ).toBe(true);
});

test('a broken road edge is detected even though the field remains traversable', () => {
  const [a, b] = [
    [2548, 1910],
    [2553, 1895],
  ].map(([x, y]) => {
    const at = atlas.point([x!, y!]);
    const index = field.roadPoints!.findIndex((p) => p.xFp === at.xFp && p.zFp === at.zFp);
    expect(index).toBeGreaterThanOrEqual(0);
    return field.walkable.length + index;
  });
  expect(field.roadEdges!.get(a!)).toContain(b);
  expect(field.roadEdges!.get(b!)).toContain(a);
  // Keep the real terrain/grid and remove only this actual bidirectional road edge.
  const roadEdges = new Map(field.roadEdges);
  roadEdges.set(
    a!,
    roadEdges.get(a!)!.filter((node) => node !== b),
  );
  roadEdges.set(
    b!,
    roadEdges.get(b!)!.filter((node) => node !== a),
  );
  const broken = { ...field, roadEdges };
  const connection = atlas.roadConnections[1]!;
  expect(findTravelPath(broken, connection.from, connection.to)).toBeDefined();
  const report = inspectRoadNetwork(broken, atlas.roadConnections);
  expect(report.connections.map((check) => check.connected)).toEqual([true, false]);
  expect(report.connections[1]!.missing).toBe(false);

  const root = document.createElement('details');
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  document.body.replaceChildren(root, layer);
  mountRoadDiagnostics(root, layer, report, atlas.pixel);
  expect(root.querySelector('[data-state="disconnected"]')?.textContent).toContain(
    'Лесная дорога к Тихой Гати: разрыв',
  );
  expect(layer.querySelectorAll('.road-disconnected')).toHaveLength(1);
  expect(layer.style.display).toBe('none');
  const toggle = root.querySelector('input')!;
  toggle.click();
  expect(layer.style.display).toBe('');
  toggle.click();
  expect(layer.style.display).toBe('none');
});

test('a missing declared anchor is reported instead of silently falling back to the grid', () => {
  const connection = atlas.roadConnections[0]!;
  const report = inspectRoadNetwork(field, [
    { ...connection, from: { ...connection.from, xFp: connection.from.xFp + 1 } },
  ]);
  expect(report.connections[0]).toMatchObject({ connected: false, missing: true });
});

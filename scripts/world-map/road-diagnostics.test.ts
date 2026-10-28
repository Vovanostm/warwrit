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

test('a shifted station breaks the declared road even though the field remains traversable', () => {
  const broken = buildNavigationField({
    ...atlas.region,
    overlayShapes: atlas.region.overlayShapes.map((road) =>
      road.shapeId !== 'center-south-field-link-8'
        ? road
        : {
            ...road,
            stations: road.stations!.map((point, i) =>
              i ? point : { ...point, xFp: point.xFp + 1 },
            ),
          },
    ),
  });
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

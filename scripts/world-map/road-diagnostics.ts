import type { NavigationField, PointFp } from '@warwrit/game-core';

export interface RoadConnection {
  readonly name: string;
  readonly from: PointFp;
  readonly to: PointFp;
  readonly roadShapePrefix: string;
}

/** Inspect only authored road edges: grid/off-road bypasses cannot satisfy a road connection. */
export function inspectRoadNetwork(field: NavigationField, expected: readonly RoadConnection[]) {
  const points = field.roadPoints ?? [];
  const offset = field.walkable.length;
  const neighbors = (index: number) =>
    (field.roadEdges?.get(index + offset) ?? [])
      .map((node) => node - offset)
      .filter((node) => node >= 0 && node < points.length);
  const reaches = (from: number, to: number, allowed: ReadonlySet<string>) => {
    if (from < 0 || to < 0) return false;
    const visited = new Set([from]);
    const queue = [from];
    for (const current of queue) {
      if (current === to) return true;
      for (const next of neighbors(current)) {
        if (visited.has(next) || !allowed.has(`${current}:${next}`)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    return false;
  };
  const nodeAt = (at: PointFp) => points.findIndex((p) => p.xFp === at.xFp && p.zFp === at.zFp);
  const edges: (readonly [PointFp, PointFp])[] = [];
  points.forEach((from, index) => {
    for (const next of neighbors(index)) if (next > index) edges.push([from, points[next]!]);
  });
  return {
    points,
    edges,
    connections: expected.map((connection) => {
      const allowed = new Set<string>();
      for (const road of field.region.overlayShapes) {
        if (!road.shapeId.startsWith(connection.roadShapePrefix)) continue;
        const stations = road.stations ?? [];
        for (let i = 1; i < stations.length; i++) {
          const a = nodeAt(stations[i - 1]!),
            b = nodeAt(stations[i]!);
          allowed.add(`${a}:${b}`);
          allowed.add(`${b}:${a}`);
        }
      }
      const from = nodeAt(connection.from),
        to = nodeAt(connection.to);
      return {
        ...connection,
        missing: from < 0 || to < 0,
        connected: reaches(from, to, allowed) && reaches(to, from, allowed),
      };
    }),
  };
}

/** Optional author overlay; diagnostics never block travel or capture map input. */
export function mountRoadDiagnostics(
  root: HTMLElement,
  layer: SVGElement,
  report: ReturnType<typeof inspectRoadNetwork>,
  pixel: (point: PointFp) => readonly [number, number],
) {
  if (!report.points.length && !report.connections.length) return;
  root.hidden = false;
  root.innerHTML = `<summary>Проверка дорог</summary>
    <label><input type="checkbox" /> Показать узлы и связи</label>
    <p class="fine"></p><ul></ul>`;
  const passing = report.connections.filter((connection) => connection.connected).length;
  root.querySelector('p')!.textContent =
    `${report.points.length} узлов · ${passing}/${report.connections.length} проверяемых соединений. ` +
    'Обычные тупики разрешены; проверяются только перечисленные участки.' +
    (passing < report.connections.length ? ' Пунктир соединяет проверяемые концы.' : '');
  const svgNS = 'http://www.w3.org/2000/svg';
  for (const [from, to] of report.edges) {
    const line = document.createElementNS(svgNS, 'path');
    line.setAttribute('d', `M${pixel(from).join(',')}L${pixel(to).join(',')}`);
    layer.append(line);
  }
  for (const point of report.points) {
    const circle = document.createElementNS(svgNS, 'circle');
    const [x, y] = pixel(point);
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('r', '5');
    layer.append(circle);
  }
  for (const connection of report.connections) {
    const row = document.createElement('li');
    row.dataset['state'] = connection.connected ? 'connected' : 'disconnected';
    row.textContent = `${connection.name}: ${connection.connected ? 'связано' : connection.missing ? 'нет дорожного узла' : 'разрыв'}`;
    root.querySelector('ul')!.append(row);
    if (connection.connected) continue;
    const line = document.createElementNS(svgNS, 'path');
    line.setAttribute(
      'd',
      `M${pixel(connection.from).join(',')}L${pixel(connection.to).join(',')}`,
    );
    line.setAttribute('class', 'road-disconnected');
    const title = document.createElementNS(svgNS, 'title');
    title.textContent = row.textContent;
    line.append(title);
    layer.append(line);
  }
  layer.style.display = 'none';
  root.querySelector('input')!.addEventListener('change', (event) => {
    layer.style.display = (event.target as HTMLInputElement).checked ? '' : 'none';
  });
}

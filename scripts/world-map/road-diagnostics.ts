import type { PointFp } from '@warwrit/game-core';
import type { inspectRoadNetwork } from '@warwrit/game-core';
export { inspectRoadNetwork } from '@warwrit/game-core';

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

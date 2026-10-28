import type { WorldLabCartographyDto } from '@warwrit/protocol';
import type { MapView } from './map-camera.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const API = '/world-lab-api/world-lab';

function decodeMask(encoded: string) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function maskHas(mask: Uint8Array, index: number) {
  return (mask[index >>> 3]! & (1 << (index & 7))) !== 0;
}

interface CartographyCell {
  readonly index: number;
  readonly row: number;
  readonly column: number;
  readonly pixel: number;
  readonly charted: boolean;
  readonly explored: boolean;
  readonly visible: boolean;
}

function cellPixel(row: number, column: number, rows: number, columns: number) {
  return ((rows - 1 - row) * columns + column) * 4;
}

function cartographyCell(
  row: number,
  column: number,
  rows: number,
  columns: number,
  masks: {
    readonly charted: Uint8Array;
    readonly explored: Uint8Array;
    readonly visible: Uint8Array;
  },
): CartographyCell {
  const index = row * columns + column;
  return {
    index,
    row,
    column,
    pixel: cellPixel(row, column, rows, columns),
    charted: maskHas(masks.charted, index),
    explored: maskHas(masks.explored, index),
    visible: maskHas(masks.visible, index),
  };
}

function writeRevealPixel(image: ImageData, pixel: number, known: boolean) {
  const color = known ? 255 : 0;
  image.data[pixel] = color;
  image.data[pixel + 1] = color;
  image.data[pixel + 2] = color;
  image.data[pixel + 3] = 255;
}

function writeKnowledgePixel(image: ImageData, pixel: number, cell: CartographyCell) {
  const tint = cell.visible
    ? undefined
    : cell.explored
      ? [27, 38, 40, 94]
      : cell.charted
        ? [194, 147, 69, 72]
        : [0, 0, 0, 0];
  image.data[pixel] = tint?.[0] ?? 0;
  image.data[pixel + 1] = tint?.[1] ?? 0;
  image.data[pixel + 2] = tint?.[2] ?? 0;
  image.data[pixel + 3] = tint?.[3] ?? 0;
}

function appendCellFrontier(
  cell: CartographyCell,
  columns: number,
  visible: Uint8Array,
  cellSizeFp: number,
  origin: { readonly xFp: number; readonly zFp: number },
  sheet: WorldLabCartographyDto['sheet'],
  frontier: string[],
) {
  if (!cell.visible) return;
  const left = (origin.xFp + cell.column * cellSizeFp) / sheet.fpPerPixel + sheet.width / 2;
  const right = left + cellSizeFp / sheet.fpPerPixel;
  const top = sheet.height / 2 - (origin.zFp + (cell.row + 1) * cellSizeFp) / sheet.fpPerPixel;
  const bottom = top + cellSizeFp / sheet.fpPerPixel;
  if (!maskHas(visible, cell.index + columns)) frontier.push(`M${left} ${top}H${right}`);
  if (cell.row === 0 || !maskHas(visible, cell.index - columns))
    frontier.push(`M${left} ${bottom}H${right}`);
  if (cell.column === 0 || !maskHas(visible, cell.index - 1))
    frontier.push(`M${left} ${top}V${bottom}`);
  if (cell.column === columns - 1 || !maskHas(visible, cell.index + 1))
    frontier.push(`M${right} ${top}V${bottom}`);
}

function authorizeCellTiles(
  cell: CartographyCell,
  cellSizeFp: number,
  origin: { readonly xFp: number; readonly zFp: number },
  cartography: WorldLabCartographyDto,
  authorized: Set<string>,
) {
  if (!cell.charted && !cell.explored) return;
  const { width, height, fpPerPixel } = cartography.sheet;
  const halfCellPx = cellSizeFp / fpPerPixel / 2;
  const x = (origin.xFp + (cell.column + 0.5) * cellSizeFp) / fpPerPixel + width / 2;
  const y = height / 2 - (origin.zFp + (cell.row + 0.5) * cellSizeFp) / fpPerPixel;
  const firstTileX = Math.max(0, Math.floor((x - halfCellPx) / cartography.imageTileSize));
  const lastTileX = Math.min(
    Math.ceil(width / cartography.imageTileSize) - 1,
    Math.floor((x + halfCellPx) / cartography.imageTileSize),
  );
  const firstTileY = Math.max(0, Math.floor((y - halfCellPx) / cartography.imageTileSize));
  const lastTileY = Math.min(
    Math.ceil(height / cartography.imageTileSize) - 1,
    Math.floor((y + halfCellPx) / cartography.imageTileSize),
  );
  for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1)
    for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1)
      authorized.add(`${tileX},${tileY}`);
}

function drawSvgImage(image: SVGImageElement, source: string, width: number, height: number) {
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', String(width));
  image.setAttribute('height', String(height));
  image.setAttribute('preserveAspectRatio', 'none');
  image.setAttribute('href', source);
}

function buildCartographyLayers(cartography: WorldLabCartographyDto) {
  const { columns, rows, cellSizeFp, origin } = cartography.grid;
  const masks = {
    charted: decodeMask(cartography.charted),
    explored: decodeMask(cartography.explored),
    visible: decodeMask(cartography.visible),
  };
  const knowledgeCanvas = document.createElement('canvas');
  knowledgeCanvas.width = columns;
  knowledgeCanvas.height = rows;
  const knowledgeContext = knowledgeCanvas.getContext('2d');
  if (!knowledgeContext) throw new Error('Браузер не смог подготовить слой картографии.');
  const knowledgeImage = knowledgeContext.createImageData(columns, rows);
  const revealCanvas = document.createElement('canvas');
  revealCanvas.width = columns;
  revealCanvas.height = rows;
  const revealContext = revealCanvas.getContext('2d');
  if (!revealContext) throw new Error('Браузер не смог подготовить слой картографии.');
  const revealImage = revealContext.createImageData(columns, rows);
  const authorizedTiles = new Set<string>();
  const frontier: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = cartographyCell(row, column, rows, columns, masks);
      writeRevealPixel(revealImage, cell.pixel, cell.charted || cell.explored || cell.visible);
      writeKnowledgePixel(knowledgeImage, cell.pixel, cell);
      appendCellFrontier(
        cell,
        columns,
        masks.visible,
        cellSizeFp,
        origin,
        cartography.sheet,
        frontier,
      );
      authorizeCellTiles(cell, cellSizeFp, origin, cartography, authorizedTiles);
    }
  }

  knowledgeContext.putImageData(knowledgeImage, 0, 0);
  revealContext.putImageData(revealImage, 0, 0);
  return {
    knowledge: knowledgeCanvas.toDataURL('image/png'),
    reveal: revealCanvas.toDataURL('image/png'),
    frontier: frontier.join(''),
    authorizedTiles,
  };
}

export function createCartographyView(
  tileLayer: SVGGElement,
  knowledgeOverlay: SVGImageElement,
  terrainRevealMaskImage: SVGImageElement,
  visibleFrontier: SVGPathElement,
) {
  let renderedRevision: string | undefined;
  let latestRevision: string | undefined;
  let sessionGeneration = 0;
  let authorizedTiles = new Set<string>();
  const renderedTiles = new Map<string, { image: SVGImageElement; revision: string }>();
  const pendingTiles = new Map<string, SVGImageElement>();
  const retryTimers = new Map<string, number>();
  const failures = new Map<string, number>();
  let latestCartography: WorldLabCartographyDto | undefined;
  let latestView: MapView | undefined;
  let lastViewport = '';

  function clearObsoleteRevisionWork(revision: string) {
    lastViewport = '';
    for (const [key, timer] of retryTimers) {
      if (key.startsWith(`${revision}:`)) continue;
      window.clearTimeout(timer);
      retryTimers.delete(key);
      failures.delete(key);
    }
    for (const [key, image] of pendingTiles) {
      if (key.startsWith(`${revision}:`)) continue;
      image.remove();
      pendingTiles.delete(key);
    }
    for (const key of failures.keys()) if (!key.startsWith(`${revision}:`)) failures.delete(key);
  }

  function discardUnauthorizedTiles(authorized: Set<string>) {
    for (const [key, rendered] of renderedTiles) {
      if (authorized.has(key)) continue;
      rendered.image.remove();
      renderedTiles.delete(key);
    }
  }

  function render(cartography: WorldLabCartographyDto) {
    const { width, height } = cartography.sheet;
    const cellSizePx = cartography.grid.cellSizeFp / cartography.sheet.fpPerPixel;
    const filter = document.getElementById('known-terrain-reveal-filter');
    filter
      ?.querySelector('feMorphology')
      ?.setAttribute('radius', String(Math.max(0.5, cellSizePx * 0.4)));
    filter
      ?.querySelector('feGaussianBlur')
      ?.setAttribute('stdDeviation', String(Math.max(0.5, cellSizePx * 0.5)));
    filter
      ?.querySelector('feDisplacementMap')
      ?.setAttribute('scale', String(Math.max(1, cellSizePx * 1.3)));
    const layers = buildCartographyLayers(cartography);
    drawSvgImage(knowledgeOverlay, layers.knowledge, width, height);
    drawSvgImage(terrainRevealMaskImage, layers.reveal, width, height);
    visibleFrontier.setAttribute('d', layers.frontier);

    if (renderedRevision !== cartography.revision) {
      clearObsoleteRevisionWork(cartography.revision);
      renderedRevision = cartography.revision;
    }
    latestRevision = cartography.revision;
    latestCartography = cartography;
    authorizedTiles = layers.authorizedTiles;
    discardUnauthorizedTiles(authorizedTiles);
  }

  function sync(cartography: WorldLabCartographyDto, view: MapView) {
    latestCartography = cartography;
    latestView = view;
    const size = cartography.imageTileSize;
    const firstX = Math.max(0, Math.floor(view.x / size));
    const firstY = Math.max(0, Math.floor(view.y / size));
    const lastX = Math.min(
      Math.ceil(cartography.sheet.width / size) - 1,
      Math.ceil((view.x + view.width) / size) - 1,
    );
    const lastY = Math.min(
      Math.ceil(cartography.sheet.height / size) - 1,
      Math.ceil((view.y + view.height) / size) - 1,
    );
    const viewport = `${cartography.revision}:${firstX},${firstY},${lastX},${lastY}`;
    if (viewport === lastViewport) return;
    lastViewport = viewport;
    for (const key of authorizedTiles) {
      const [tileX, tileY] = key.split(',').map(Number) as [number, number];
      if (tileX < firstX || tileX > lastX || tileY < firstY || tileY > lastY) continue;
      const previous = renderedTiles.get(key);
      if (previous?.revision === cartography.revision) continue;
      requestTile(key, tileX, tileY, size, cartography.revision, previous);
    }
  }

  function requestTile(
    key: string,
    tileX: number,
    tileY: number,
    size: number,
    revision: string,
    previous: { readonly image: SVGImageElement; readonly revision: string } | undefined,
  ) {
    const requestKey = `${revision}:${key}`;
    if (pendingTiles.has(requestKey)) return;
    const tile = createTile(tileX, tileY, size, revision);
    const generation = sessionGeneration;
    pendingTiles.set(requestKey, tile);
    if (previous) tile.setAttribute('opacity', '0');
    tile.addEventListener('load', () => {
      pendingTiles.delete(requestKey);
      clearRetry(requestKey);
      failures.delete(requestKey);
      if (generation !== sessionGeneration || latestRevision !== revision) {
        tile.remove();
        return;
      }
      tile.setAttribute('opacity', '1');
      if (previous && renderedTiles.get(key)?.image === previous.image) previous.image.remove();
      renderedTiles.set(key, { image: tile, revision });
    });
    tile.addEventListener(
      'error',
      () => {
        pendingTiles.delete(requestKey);
        tile.remove();
        scheduleRetry(requestKey, revision, generation);
      },
      { once: true },
    );
    tileLayer.append(tile);
  }

  function scheduleRetry(requestKey: string, revision: string, generation: number) {
    if (
      generation !== sessionGeneration ||
      latestRevision !== revision ||
      retryTimers.has(requestKey)
    )
      return;
    const attempts = failures.get(requestKey) ?? 0;
    if (attempts >= 1) return;
    failures.set(requestKey, attempts + 1);
    const timer = window.setTimeout(() => {
      retryTimers.delete(requestKey);
      if (
        generation !== sessionGeneration ||
        latestRevision !== revision ||
        !latestCartography ||
        !latestView
      )
        return;
      lastViewport = '';
      sync(latestCartography, latestView);
    }, 1000);
    retryTimers.set(requestKey, timer);
  }

  function clearRetry(requestKey: string) {
    const timer = retryTimers.get(requestKey);
    if (timer !== undefined) window.clearTimeout(timer);
    retryTimers.delete(requestKey);
  }

  function createTile(tileX: number, tileY: number, size: number, revision: string) {
    const tile = document.createElementNS(SVG_NS, 'image');
    tile.setAttribute('x', String(tileX * size));
    tile.setAttribute('y', String(tileY * size));
    tile.setAttribute('width', String(size));
    tile.setAttribute('height', String(size));
    tile.setAttribute(
      'href',
      `${API}/map/${tileX}/${tileY}.png?revision=${encodeURIComponent(revision)}`,
    );
    tile.setAttribute('preserveAspectRatio', 'none');
    tile.setAttribute('data-tile', `${tileX},${tileY}`);
    return tile;
  }

  function clear() {
    sessionGeneration += 1;
    tileLayer.replaceChildren();
    knowledgeOverlay.removeAttribute('href');
    terrainRevealMaskImage.removeAttribute('href');
    visibleFrontier.setAttribute('d', '');
    authorizedTiles.clear();
    renderedTiles.clear();
    pendingTiles.clear();
    for (const timer of retryTimers.values()) window.clearTimeout(timer);
    retryTimers.clear();
    failures.clear();
    renderedRevision = undefined;
    latestRevision = undefined;
    latestCartography = undefined;
    latestView = undefined;
    lastViewport = '';
  }

  return { render, sync, clear };
}

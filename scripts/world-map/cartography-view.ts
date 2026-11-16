import type { WorldLabCartographyDto } from '@warwrit/protocol';
import type { MapView } from './map-camera.js';
import { cartographyRevealPixels } from './cartography-reveal.js';

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
  // Direct edges avoid cancellation at exact tile boundaries on fractional pixel scales.
  const left = (origin.xFp + cell.column * cellSizeFp) / fpPerPixel + width / 2;
  const right = (origin.xFp + (cell.column + 1) * cellSizeFp) / fpPerPixel + width / 2;
  const top = height / 2 - (origin.zFp + (cell.row + 1) * cellSizeFp) / fpPerPixel;
  const bottom = height / 2 - (origin.zFp + cell.row * cellSizeFp) / fpPerPixel;
  // Match the server's integer pixel samples: x is [left, right), y is (top, bottom].
  const firstPixelX = Math.ceil(left);
  const lastPixelX = Math.ceil(right) - 1;
  const firstPixelY = Math.floor(top) + 1;
  const lastPixelY = Math.floor(bottom);
  const firstTileX = Math.max(0, Math.floor(firstPixelX / cartography.imageTileSize));
  const lastTileX = Math.min(
    Math.ceil(width / cartography.imageTileSize) - 1,
    Math.floor(lastPixelX / cartography.imageTileSize),
  );
  const firstTileY = Math.max(0, Math.floor(firstPixelY / cartography.imageTileSize));
  const lastTileY = Math.min(
    Math.ceil(height / cartography.imageTileSize) - 1,
    Math.floor(lastPixelY / cartography.imageTileSize),
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

export function knownCartographyBounds(
  cartography: WorldLabCartographyDto,
  fallbackPoint?: WorldLabCartographyDto['sites'][number]['point'],
) {
  const { columns, rows, cellSizeFp, origin } = cartography.grid;
  const charted = decodeMask(cartography.charted);
  const explored = decodeMask(cartography.explored);
  const visible = decodeMask(cartography.visible);
  let left = cartography.sheet.width;
  let top = cartography.sheet.height;
  let right = 0;
  let bottom = 0;
  let found = false;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (!maskHas(charted, index) && !maskHas(explored, index) && !maskHas(visible, index))
        continue;
      const x =
        (origin.xFp + column * cellSizeFp) / cartography.sheet.fpPerPixel +
        cartography.sheet.width / 2;
      const y =
        cartography.sheet.height / 2 -
        (origin.zFp + (row + 1) * cellSizeFp) / cartography.sheet.fpPerPixel;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + cellSizeFp / cartography.sheet.fpPerPixel);
      bottom = Math.max(bottom, y + cellSizeFp / cartography.sheet.fpPerPixel);
      found = true;
    }
  }
  for (const site of cartography.sites) {
    const x =
      Number(site.point.xMicroFp) / 65536 / cartography.sheet.fpPerPixel +
      cartography.sheet.width / 2;
    const y =
      cartography.sheet.height / 2 -
      Number(site.point.zMicroFp) / 65536 / cartography.sheet.fpPerPixel;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
    found = true;
  }
  if (!found) {
    const x = fallbackPoint
      ? Number(fallbackPoint.xMicroFp) / 65536 / cartography.sheet.fpPerPixel +
        cartography.sheet.width / 2
      : cartography.sheet.width / 2;
    const y = fallbackPoint
      ? cartography.sheet.height / 2 -
        Number(fallbackPoint.zMicroFp) / 65536 / cartography.sheet.fpPerPixel
      : cartography.sheet.height / 2;
    left = right = x;
    top = bottom = y;
  }
  return { left, top, right, bottom };
}

function buildCartographyLayers(cartography: WorldLabCartographyDto, previousReveal?: string) {
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
  const authorizedTiles = new Set<string>();
  const frontier: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = cartographyCell(row, column, rows, columns, masks);
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
  return {
    knowledge: knowledgeCanvas.toDataURL('image/png'),
    reveal: previousReveal ?? revealSource(masks.charted, masks.explored, columns, rows),
    frontier: frontier.join(''),
    authorizedTiles,
  };
}

function revealSource(charted: Uint8Array, explored: Uint8Array, columns: number, rows: number) {
  const known = charted.map((value, index) => value | explored[index]!);
  const pixels = cartographyRevealPixels(known, columns, rows);
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Браузер не смог подготовить слой картографии.');
  const image = context.createImageData(pixels.width, pixels.height);
  image.data.set(pixels.data);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function createCartographyView(
  tileLayer: SVGGElement,
  knowledgeOverlay: SVGImageElement,
  terrainRevealMaskImage: SVGImageElement,
  visibleFrontier: SVGPathElement,
  options: {
    readonly tileUrl?: (revision: string, tileX: number, tileY: number) => string;
    readonly loadTile?: (
      revision: string,
      tileX: number,
      tileY: number,
      signal: AbortSignal,
    ) => Promise<{ readonly url: string; readonly dispose: () => void }>;
    readonly onTileError?: (revision: string, tileX: number, tileY: number) => void;
  } = {},
) {
  let renderedRevision: string | undefined;
  let renderedReveal: string | undefined;
  let latestRevision: string | undefined;
  let sessionGeneration = 0;
  let authorizedTiles = new Set<string>();
  const renderedTiles = new Map<
    string,
    { image: SVGImageElement; revision: string; dispose?: () => void }
  >();
  const pendingTiles = new Map<
    string,
    { image: SVGImageElement; controller: AbortController; dispose?: () => void }
  >();
  const retryTimers = new Map<string, number>();
  const failures = new Map<string, number>();
  let latestCartography: WorldLabCartographyDto | undefined;
  let latestView: MapView | undefined;
  let lastViewport = '';

  function isCurrentWork(revision: string, generation: number) {
    return generation === sessionGeneration && latestRevision === revision;
  }

  function pendingWorkKeys() {
    return new Set([...retryTimers.keys(), ...pendingTiles.keys(), ...failures.keys()]);
  }

  function cancelPendingTile(requestKey: string) {
    const request = pendingTiles.get(requestKey);
    if (!request) return;
    // Invalidate the request before abort can dispatch its failure callback.
    pendingTiles.delete(requestKey);
    request.controller.abort();
    request.image.remove();
    request.dispose?.();
  }

  function cancelWork(requestKey: string) {
    clearRetry(requestKey);
    cancelPendingTile(requestKey);
    failures.delete(requestKey);
  }

  function discardRenderedTile(key: string) {
    const rendered = renderedTiles.get(key);
    if (!rendered) return;
    rendered.image.remove();
    rendered.dispose?.();
    renderedTiles.delete(key);
  }

  function clearObsoleteRevisionWork(revision: string) {
    lastViewport = '';
    for (const key of pendingWorkKeys()) {
      if (!key.startsWith(`${revision}:`)) cancelWork(key);
    }
  }

  function discardUnauthorizedTiles(authorized: Set<string>) {
    for (const key of renderedTiles.keys()) {
      if (!authorized.has(key)) discardRenderedTile(key);
    }
  }

  function render(cartography: WorldLabCartographyDto) {
    const { width, height } = cartography.sheet;
    const layers = buildCartographyLayers(
      cartography,
      renderedRevision === cartography.revision ? renderedReveal : undefined,
    );
    renderedReveal = layers.reveal;
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
    const tile = createTile(tileX, tileY, size);
    const request = { image: tile, controller: new AbortController() } as {
      image: SVGImageElement;
      controller: AbortController;
      dispose?: () => void;
    };
    const generation = sessionGeneration;
    pendingTiles.set(requestKey, request);
    if (previous) tile.setAttribute('opacity', '0');
    tile.addEventListener('load', () => {
      if (pendingTiles.get(requestKey) !== request) return;
      pendingTiles.delete(requestKey);
      clearRetry(requestKey);
      failures.delete(requestKey);
      if (!isCurrentWork(revision, generation)) {
        tile.remove();
        request.dispose?.();
        return;
      }
      tile.setAttribute('opacity', '1');
      if (previous && renderedTiles.get(key)?.image === previous.image) {
        discardRenderedTile(key);
      }
      renderedTiles.set(key, {
        image: tile,
        revision,
        ...(request.dispose ? { dispose: request.dispose } : {}),
      });
    });
    const fail = () => {
      if (pendingTiles.get(requestKey) !== request) return;
      cancelPendingTile(requestKey);
      if (!scheduleRetry(requestKey, revision, generation))
        options.onTileError?.(revision, tileX, tileY);
    };
    tile.addEventListener('error', fail, { once: true });
    tileLayer.append(tile);
    if (options.loadTile) {
      void options.loadTile(revision, tileX, tileY, request.controller.signal).then(
        (loaded) => {
          if (pendingTiles.get(requestKey) !== request || generation !== sessionGeneration) {
            loaded.dispose();
            return;
          }
          request.dispose = loaded.dispose;
          tile.setAttribute('href', loaded.url);
        },
        () => fail(),
      );
    } else {
      tile.setAttribute(
        'href',
        options.tileUrl?.(revision, tileX, tileY) ??
          `${API}/map/${tileX}/${tileY}.png?revision=${encodeURIComponent(revision)}`,
      );
    }
  }

  function scheduleRetry(requestKey: string, revision: string, generation: number) {
    if (!isCurrentWork(revision, generation) || retryTimers.has(requestKey)) return false;
    const attempts = failures.get(requestKey) ?? 0;
    if (attempts >= 1) return false;
    failures.set(requestKey, attempts + 1);
    const timer = window.setTimeout(() => {
      retryTimers.delete(requestKey);
      if (!isCurrentWork(revision, generation) || !latestCartography || !latestView) return;
      lastViewport = '';
      sync(latestCartography, latestView);
    }, 1000);
    retryTimers.set(requestKey, timer);
    return true;
  }

  function clearRetry(requestKey: string) {
    const timer = retryTimers.get(requestKey);
    if (timer !== undefined) window.clearTimeout(timer);
    retryTimers.delete(requestKey);
  }

  function createTile(tileX: number, tileY: number, size: number) {
    const tile = document.createElementNS(SVG_NS, 'image');
    tile.setAttribute('x', String(tileX * size));
    tile.setAttribute('y', String(tileY * size));
    tile.setAttribute('width', String(size));
    tile.setAttribute('height', String(size));
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
    for (const key of pendingWorkKeys()) cancelWork(key);
    for (const key of renderedTiles.keys()) discardRenderedTile(key);
    renderedRevision = undefined;
    renderedReveal = undefined;
    latestRevision = undefined;
    latestCartography = undefined;
    latestView = undefined;
    lastViewport = '';
  }

  return { render, sync, clear };
}

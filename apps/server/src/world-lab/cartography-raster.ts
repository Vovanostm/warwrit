import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ATLAS_IMAGE_URL = new URL(
  '../../../../assets/art/world/porechye-atlas-v1/atlas-v6.png',
  import.meta.url,
);
const ATLAS_WIDTH = 4608;
const ATLAS_HEIGHT = 3072;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 16_000_000;
const MAX_TILE_SIZE = 384;
const UNKNOWN_PIXEL = [32, 37, 32, 255] as const;

export interface CartographyTileRequest {
  readonly tileX: number;
  readonly tileY: number;
  readonly tileSize?: number;
  readonly sheet: {
    readonly width: number;
    readonly height: number;
    readonly fpPerPixel: number;
  };
  readonly grid: {
    readonly columns: number;
    readonly rows: number;
    readonly cellSizeFp: number;
    readonly origin: { readonly xFp: number; readonly zFp: number };
  };
  readonly knownBits: Uint8Array;
}

let atlasPromise: Promise<PNG> | undefined;

function loadAtlas(): Promise<PNG> {
  if (!atlasPromise) {
    atlasPromise = readFile(fileURLToPath(ATLAS_IMAGE_URL))
      .then((bytes) => {
        if (bytes.byteLength > MAX_SOURCE_BYTES)
          throw new RangeError('Cartography source image exceeds its byte limit');
        if (
          bytes.byteLength < 24 ||
          bytes.readUInt32BE(16) !== ATLAS_WIDTH ||
          bytes.readUInt32BE(20) !== ATLAS_HEIGHT
        ) {
          throw new RangeError('Unexpected cartography source image edition');
        }
        const image = PNG.sync.read(bytes, { checkCRC: true });
        if (
          image.width !== ATLAS_WIDTH ||
          image.height !== ATLAS_HEIGHT ||
          image.width * image.height > MAX_SOURCE_PIXELS
        ) {
          throw new RangeError('Unexpected cartography source image edition');
        }
        return image;
      })
      .catch((error: unknown) => {
        atlasPromise = undefined;
        throw error;
      });
  }
  return atlasPromise;
}

function isValidTileIndex(tileX: number, tileY: number, tileSize: number): boolean {
  if (
    !Number.isSafeInteger(tileX) ||
    tileX < 0 ||
    !Number.isSafeInteger(tileY) ||
    tileY < 0 ||
    !Number.isSafeInteger(tileSize) ||
    tileSize < 1 ||
    tileSize > MAX_TILE_SIZE
  )
    return false;
  return true;
}

function isValidSheet(sheet: CartographyTileRequest['sheet']): boolean {
  return (
    sheet.width === ATLAS_WIDTH &&
    sheet.height === ATLAS_HEIGHT &&
    Number.isFinite(sheet.fpPerPixel) &&
    sheet.fpPerPixel > 0
  );
}

function isValidGrid(grid: CartographyTileRequest['grid'], knownBits: Uint8Array): boolean {
  if (
    !Number.isSafeInteger(grid.columns) ||
    grid.columns < 1 ||
    !Number.isSafeInteger(grid.rows) ||
    grid.rows < 1 ||
    grid.columns * grid.rows > 49_152 ||
    !Number.isSafeInteger(grid.cellSizeFp) ||
    grid.cellSizeFp < 1 ||
    !Number.isSafeInteger(grid.origin.xFp) ||
    !Number.isSafeInteger(grid.origin.zFp)
  )
    return false;
  return knownBits.length === Math.ceil((grid.columns * grid.rows) / 8);
}

function validateTileBounds(request: CartographyTileRequest, tileSize: number): void {
  const left = request.tileX * tileSize;
  const top = request.tileY * tileSize;
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(top) ||
    left >= request.sheet.width ||
    top >= request.sheet.height
  ) {
    throw new RangeError('Cartography tile is outside the atlas');
  }
}

function validateRequest(request: CartographyTileRequest, tileSize: number): void {
  if (
    !isValidTileIndex(request.tileX, request.tileY, tileSize) ||
    !isValidSheet(request.sheet) ||
    !isValidGrid(request.grid, request.knownBits)
  )
    throw new RangeError('Invalid cartography tile request');
  validateTileBounds(request, tileSize);
}

function bitIsSet(bits: Uint8Array, index: number): boolean {
  return (bits[index >>> 3]! & (1 << (index & 7))) !== 0;
}

function knownAtPixel(
  pixelX: number,
  pixelY: number,
  sheet: CartographyTileRequest['sheet'],
  grid: CartographyTileRequest['grid'],
  knownBits: Uint8Array,
): boolean {
  const worldXFp = (pixelX - sheet.width / 2) * sheet.fpPerPixel;
  const worldZFp = (sheet.height / 2 - pixelY) * sheet.fpPerPixel;
  const column = Math.floor((worldXFp - grid.origin.xFp) / grid.cellSizeFp);
  const row = Math.floor((worldZFp - grid.origin.zFp) / grid.cellSizeFp);
  return (
    column >= 0 &&
    row >= 0 &&
    column < grid.columns &&
    row < grid.rows &&
    bitIsSet(knownBits, row * grid.columns + column)
  );
}

/** Render one authenticated, company-filtered atlas tile; raw art never leaves the server. */
export async function renderCartographyTile({
  tileX,
  tileY,
  tileSize = MAX_TILE_SIZE,
  sheet,
  grid,
  knownBits,
}: CartographyTileRequest): Promise<Buffer | undefined> {
  validateRequest({ tileX, tileY, tileSize, sheet, grid, knownBits }, tileSize);
  const left = tileX * tileSize;
  const top = tileY * tileSize;
  const width = Math.min(tileSize, sheet.width - left);
  const height = Math.min(tileSize, sheet.height - top);
  const output = new PNG({ width, height });
  let hasKnownPixel = false;

  for (let y = 0; y < height; y += 1) {
    const pixelY = top + y;
    for (let x = 0; x < width; x += 1) {
      const pixelX = left + x;
      const targetOffset = (y * width + x) * 4;
      if (knownAtPixel(pixelX, pixelY, sheet, grid, knownBits)) {
        hasKnownPixel = true;
      } else {
        output.data[targetOffset] = UNKNOWN_PIXEL[0];
        output.data[targetOffset + 1] = UNKNOWN_PIXEL[1];
        output.data[targetOffset + 2] = UNKNOWN_PIXEL[2];
        output.data[targetOffset + 3] = UNKNOWN_PIXEL[3];
      }
    }
  }
  if (!hasKnownPixel) return undefined;

  const atlas = await loadAtlas();
  for (let y = 0; y < height; y += 1) {
    const pixelY = top + y;
    for (let x = 0; x < width; x += 1) {
      const pixelX = left + x;
      if (!knownAtPixel(pixelX, pixelY, sheet, grid, knownBits)) continue;
      const targetOffset = (y * width + x) * 4;
      const sourceOffset = (pixelY * atlas.width + pixelX) * 4;
      atlas.data.copy(output.data, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }

  return PNG.sync.write(output);
}

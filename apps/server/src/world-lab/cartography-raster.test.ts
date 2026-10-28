import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { PNG } from 'pngjs';

import { renderCartographyTile } from './cartography-raster.js';

const sourceUrl = new URL(
  '../../../../assets/art/world/porechye-atlas-v1/atlas-v5.png',
  import.meta.url,
);

it('copies known atlas pixels and replaces unknown RGBA pixels with opaque fog', async () => {
  const source = PNG.sync.read(await readFile(fileURLToPath(sourceUrl)));
  const columns = 24;
  const rows = 16;
  const knownBits = new Uint8Array(Math.ceil((columns * rows) / 8));
  const knownIndex = 15 * columns;
  knownBits[knownIndex >>> 3] = 1 << (knownIndex & 7);
  const tile = await renderCartographyTile({
    tileX: 0,
    tileY: 0,
    sheet: { width: 4608, height: 3072, fpPerPixel: 1 },
    grid: {
      columns,
      rows,
      cellSizeFp: 192,
      origin: { xFp: -2304, zFp: -1536 },
    },
    knownBits,
  });
  if (!tile) throw new Error('Expected a tile containing explored pixels');
  const output = PNG.sync.read(tile);
  const knownPixel = (y: number, x: number) =>
    output.data.subarray((y * output.width + x) * 4, (y * output.width + x) * 4 + 4);
  const sourcePixel = source.data.subarray(
    (10 * source.width + 10) * 4,
    (10 * source.width + 10) * 4 + 4,
  );

  expect(knownPixel(10, 10)).toEqual(sourcePixel);
  expect(knownPixel(10, 192)).toEqual(Buffer.from([32, 37, 32, 255]));
});

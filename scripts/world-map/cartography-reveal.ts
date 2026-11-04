const SAMPLES_PER_CELL = 8;
const NEIGHBOURS = [-2, -1, 0, 1, 2].flatMap((y) =>
  [-2, -1, 0, 1, 2].filter((x) => x !== 0 || y !== 0).map((x) => [x, y] as const),
);

function hasKnownCell(bits: Uint8Array, columns: number, rows: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= columns || y >= rows) return false;
  const index = y * columns + x;
  return (bits[index >>> 3]! & (1 << (index & 7))) !== 0;
}

function edgeOpacity(
  u: number,
  v: number,
  column: number,
  row: number,
  unknown: readonly (readonly [number, number])[],
) {
  let distance = 2;
  for (const [x, y] of unknown) {
    const dx = Math.max(x - u, u - x - 1, 0);
    const dy = Math.max(y - v, v - y - 1, 0);
    distance = Math.min(distance, Math.hypot(dx, dy));
  }
  const ink = (Math.sin((column + u) * 4.1) + Math.sin((row + v) * 3.3) + 2) * 0.05;
  const t = Math.max(0, Math.min(1, (distance - 0.125 - ink) / 1.2));
  return Math.round(255 * t * t * (3 - 2 * t));
}

/** Feather inward on known cells; unknown cells always retain zero reveal alpha. */
export function cartographyRevealPixels(known: Uint8Array, columns: number, rows: number) {
  const width = columns * SAMPLES_PER_CELL;
  const height = rows * SAMPLES_PER_CELL;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (!hasKnownCell(known, columns, rows, column, row)) continue;
      const unknown = NEIGHBOURS.filter(
        ([x, y]) => !hasKnownCell(known, columns, rows, column + x, row + y),
      );
      for (let y = 0; y < SAMPLES_PER_CELL; y++) {
        for (let x = 0; x < SAMPLES_PER_CELL; x++) {
          const pixel =
            (((rows - 1 - row) * SAMPLES_PER_CELL + y) * width + column * SAMPLES_PER_CELL + x) * 4;
          data[pixel] = data[pixel + 1] = data[pixel + 2] = 255;
          data[pixel + 3] = edgeOpacity(
            (x + 0.5) / SAMPLES_PER_CELL,
            1 - (y + 0.5) / SAMPLES_PER_CELL,
            column,
            row,
            unknown,
          );
        }
      }
    }
  }
  return { width, height, data };
}

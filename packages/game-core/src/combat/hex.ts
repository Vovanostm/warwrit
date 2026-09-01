import { invariant } from '../primitives.js';
import type { CombatMap, Hex } from './types.js';

const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hex(q: number, r: number): Hex {
  invariant(Number.isSafeInteger(q) && Number.isSafeInteger(r), 'Hex coordinates must be integers');
  return { q, r };
}

export function hexKey(value: Hex): string {
  return `${value.q},${value.r}`;
}

export function compareHex(left: Hex, right: Hex): number {
  return left.q - right.q || left.r - right.r;
}

export function hexEquals(left: Hex, right: Hex): boolean {
  return left.q === right.q && left.r === right.r;
}

export function hexDistance(left: Hex, right: Hex): number {
  const q = left.q - right.q;
  const r = left.r - right.r;
  return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
}

export function hexNeighbors(value: Hex): readonly Hex[] {
  return DIRECTIONS.map((direction) => ({
    q: value.q + direction.q,
    r: value.r + direction.r,
  }));
}

export function createHexagon(radius: number): readonly Hex[] {
  invariant(
    Number.isInteger(radius) && radius >= 0,
    'Hexagon radius must be a non-negative integer',
  );
  const result: Hex[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    const minimumR = Math.max(-radius, -q - radius);
    const maximumR = Math.min(radius, -q + radius);
    for (let r = minimumR; r <= maximumR; r += 1) {
      result.push({ q, r });
    }
  }
  return result.sort(compareHex);
}

export interface FindPathOptions {
  readonly occupied?: ReadonlySet<string>;
  readonly allowOccupiedGoal?: boolean;
}

export function findPath(
  map: CombatMap,
  start: Hex,
  goal: Hex,
  options: FindPathOptions = {},
): readonly Hex[] | undefined {
  const validHexes = new Set(map.hexes.map(hexKey));
  const blocked = new Set(map.blocked.map(hexKey));
  const startKey = hexKey(start);
  const goalKey = hexKey(goal);

  if (!validHexes.has(startKey) || !validHexes.has(goalKey) || blocked.has(goalKey)) {
    return undefined;
  }
  if (startKey === goalKey) {
    return [];
  }

  const queue: Hex[] = [start];
  const cameFrom = new Map<string, string | null>([[startKey, null]]);
  const valuesByKey = new Map<string, Hex>([[startKey, start]]);
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor];
    cursor += 1;
    invariant(current !== undefined, 'Path queue cursor must reference a hex');

    for (const neighbor of hexNeighbors(current)) {
      const neighborKey = hexKey(neighbor);
      if (
        cameFrom.has(neighborKey) ||
        !validHexes.has(neighborKey) ||
        blocked.has(neighborKey) ||
        (options.occupied?.has(neighborKey) === true &&
          !(options.allowOccupiedGoal === true && neighborKey === goalKey))
      ) {
        continue;
      }

      cameFrom.set(neighborKey, hexKey(current));
      valuesByKey.set(neighborKey, neighbor);
      if (neighborKey === goalKey) {
        const reversePath: Hex[] = [];
        let pathKey: string | null = goalKey;
        while (pathKey !== null && pathKey !== startKey) {
          const value = valuesByKey.get(pathKey);
          invariant(value !== undefined, 'Path reconstruction must reference a known hex');
          reversePath.push(value);
          pathKey = cameFrom.get(pathKey) ?? null;
        }
        return reversePath.reverse();
      }
      queue.push(neighbor);
    }
  }

  return undefined;
}

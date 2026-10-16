import { findPath } from './hex.js';
import type { CombatMap, Hex } from './types.js';

/** Editor admission policy: all spawns must be reachable through static terrain.
 * Occupants, AP, stamina and hazards do not turn a temporary obstruction into a wall.
 */
export function areBattleSpawnsConnected(map: CombatMap, positions: readonly Hex[]): boolean {
  const start = positions[0];
  return (
    start !== undefined &&
    positions.every((position) => findPath(map, start, position) !== undefined)
  );
}

import { CONTINUOUS_WORLD_REGION, PAINTED_ATLAS_REGION } from '@warwrit/game-core';
import { MAIN_WORLD_ID } from '@warwrit/protocol';

/** A distinct world keeps retained legacy coordinates and accepted plans in their original frame. */
export const PAINTED_GAME_WORLD_ID = 'world.porechye.atlas-v1';
export function gameWorldId(map: string | undefined): string {
  if (map === 'painted-atlas') return PAINTED_GAME_WORLD_ID;
  if (map === undefined || map === 'legacy') return MAIN_WORLD_ID;
  throw new Error('WORLD_MAP must be legacy or painted-atlas');
}
export function worldNavigationRegion(worldId: string) {
  return worldId === PAINTED_GAME_WORLD_ID ? PAINTED_ATLAS_REGION : CONTINUOUS_WORLD_REGION;
}

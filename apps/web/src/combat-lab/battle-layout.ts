import { HEX_RADIUS, hexToWorld } from '../renderer/hex-projection.js';
import { spriteCatalogue, spriteScale, type StaticSpriteArt } from './sprite-art.js';
import type { CombatLabHex } from '@warwrit/protocol';

/** Presentation only: canonical hex coordinates, occupancy and distances never change. */
export const BATTLE_LAYOUT = {
  spacing: catalogueSpacing(spriteCatalogue()),
  heightStep: 0.28,
} as const;
export const BATTLE_HEX_RADIUS = HEX_RADIUS * BATTLE_LAYOUT.spacing;
export const battleHexToWorld = ({ q, r }: CombatLabHex) => hexToWorld(q, r, BATTLE_LAYOUT.spacing);

/** Smallest 0.05 step which fits every alpha silhouette with ten percent clearance. */
export function catalogueSpacing(catalogue: readonly StaticSpriteArt[]): number {
  const required = Math.max(...catalogue.map((art) => art.alphaWidth * spriteScale(art))) / 0.9;
  const steps = Math.ceil(required / 0.05);
  return steps * 0.05 >= required ? steps * 0.05 : (steps + 1) * 0.05;
}

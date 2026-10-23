import { HEX_RADIUS, hexToWorld } from '../renderer/hex-projection.js';
import type { CombatLabHex } from '@warwrit/protocol';
import { spriteCatalogue, spriteScale, type StaticSpriteArt } from './sprite-art.js';

export function catalogueSpacing(catalogue: readonly StaticSpriteArt[]): number {
  const widest = Math.max(...catalogue.map((art) => art.alphaWidth * spriteScale(art)));
  const steps = Math.ceil(widest / (0.9 * 0.05));
  const spacing = steps / 20;
  // Multiplication can round differently at a boundary; never round below the fit.
  return widest <= 0.9 * spacing ? spacing : (steps + 1) / 20;
}

/** Presentation only: canonical hex coordinates, occupancy and distances never change. */
export const BATTLE_LAYOUT = {
  spacing: catalogueSpacing(spriteCatalogue()),
  heightStep: 0.28,
} as const;
export const BATTLE_HEX_RADIUS = HEX_RADIUS * BATTLE_LAYOUT.spacing;
export const battleHexToWorld = ({ q, r }: CombatLabHex) => hexToWorld(q, r, BATTLE_LAYOUT.spacing);

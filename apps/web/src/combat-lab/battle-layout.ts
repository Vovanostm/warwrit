import { HEX_RADIUS, hexToWorld } from '../renderer/hex-projection.js';
import type { CombatLabHex } from '@warwrit/protocol';

/** Presentation only: canonical hex coordinates, occupancy and distances never change. */
export const BATTLE_LAYOUT = { spacing: 2.6, heightStep: 0.28 } as const;
export const BATTLE_HEX_RADIUS = HEX_RADIUS * BATTLE_LAYOUT.spacing;
export const battleHexToWorld = ({ q, r }: CombatLabHex) => hexToWorld(q, r, BATTLE_LAYOUT.spacing);

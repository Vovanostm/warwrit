import type { Hex, UnitAttributes, WeaponId } from '../combat/types.js';
import { createHexagon } from '../combat/hex.js';

export const FIRST_HUNT_PROFILE_ID = 'first-hunt-runtime-profile-2026-10-01-v1' as const;
export const FIRST_HUNT_INSTANCE_ID = 'ci.m1.raider-standard.01' as const;
export const FIRST_HUNT_ISSUER_ID = 'npc.city-watch-contact.kamenny-brod.01' as const;
export const FIRST_HUNT_WALLET_ID = 'wallet.city-watch.kamenny-brod.01' as const;
export const FIRST_HUNT_ISSUER_LOCATION = Object.freeze({
  siteId: 'kamenny-brod',
  areaId: 'kamenny-brod-market',
});
export const FIRST_HUNT_REWARD_Q = '100000000' as const;
export const FIRST_HUNT_GENESIS_WALLET_Q = '200000000' as const;
export const FIRST_HUNT_PROOF_ID = 'proof.raider-standard.old-mill.01' as const;
export const FIRST_HUNT_PROOF_DEFINITION_ID = 'raider-standard-trophy' as const;
export const FIRST_HUNT_ENCOUNTER_LOCATION = Object.freeze({
  siteId: 'staraya-melnitsa',
  areaId: 'staraya-melnitsa-yard',
});
const combatHexes = createHexagon(3);
export const FIRST_HUNT_COMBAT_MAP = Object.freeze({
  hexes: combatHexes,
  blocked: Object.freeze([{ q: 0, r: 0 }]),
});
export const FIRST_HUNT_ALLIED_SLOTS: readonly Hex[] = Object.freeze([
  { q: -1, r: -2 },
  { q: -1, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: -1, r: 2 },
  { q: -1, r: 3 },
  { q: -2, r: -1 },
  { q: -2, r: 0 },
  { q: -2, r: 1 },
]);
export const FIRST_HUNT_RETREAT_HEXES = Object.freeze({
  allied: Object.freeze(combatHexes.filter(({ q }) => q === -3)),
  hostile: Object.freeze(combatHexes.filter(({ q }) => q === 3)),
});

export interface FirstHuntHostileDefinition {
  readonly entityId: string;
  readonly weaponItemId: 'raider-weapon' | 'bow' | 'great-weapon';
  readonly weaponId: WeaponId;
  readonly armorItemId: 'padded-coat';
  readonly position: Hex;
  readonly attributes: UnitAttributes;
  readonly initialPools: {
    readonly health: number;
    readonly stamina: number;
    readonly armor: number;
    readonly morale: number;
  };
  readonly armorCondition: 40;
  readonly weaponCondition: 10000;
  readonly doctrine: 'aggressive';
}

const attributes: UnitAttributes = Object.freeze({
  accuracy: 22,
  defense: 6,
  health: 60,
  stamina: 80,
  armor: 40,
  morale: 100,
  initiative: 40,
});

const initialPools = Object.freeze({ health: 60, stamina: 80, armor: 40, morale: 100 });

/** Immutable genesis profile. Runtime state is persisted separately and never regenerated on reload. */
export const FIRST_HUNT_HOSTILE_GENESIS: readonly FirstHuntHostileDefinition[] = Object.freeze([
  Object.freeze({
    entityId: 'world.raider.old-mill.front.01',
    weaponItemId: 'raider-weapon',
    weaponId: 'raider',
    armorItemId: 'padded-coat',
    position: Object.freeze({ q: 2, r: 0 }),
    attributes,
    initialPools,
    armorCondition: 40,
    weaponCondition: 10000,
    doctrine: 'aggressive',
  }),
  Object.freeze({
    entityId: 'world.raider.old-mill.heavy.01',
    weaponItemId: 'great-weapon',
    weaponId: 'great-weapon',
    armorItemId: 'padded-coat',
    position: Object.freeze({ q: 2, r: -1 }),
    attributes,
    initialPools,
    armorCondition: 40,
    weaponCondition: 10000,
    doctrine: 'aggressive',
  }),
  Object.freeze({
    entityId: 'world.raider.old-mill.bow.01',
    weaponItemId: 'bow',
    weaponId: 'bow',
    armorItemId: 'padded-coat',
    position: Object.freeze({ q: 2, r: -2 }),
    attributes,
    initialPools,
    armorCondition: 40,
    weaponCondition: 10000,
    doctrine: 'aggressive',
  }),
]);

import type { Hex, UnitAttributes } from '../combat/types.js';
import { createHexagon } from '../combat/hex.js';
import {
  FIRST_HUNT_ALLIED_SLOTS,
  FIRST_HUNT_COMBAT_MAP,
  FIRST_HUNT_ENCOUNTER_LOCATION,
  FIRST_HUNT_GENESIS_WALLET_Q,
  FIRST_HUNT_HOSTILE_GENESIS,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_ISSUER_ID,
  FIRST_HUNT_ISSUER_LOCATION,
  FIRST_HUNT_PROFILE_ID,
  FIRST_HUNT_PROOF_DEFINITION_ID,
  FIRST_HUNT_PROOF_ID,
  FIRST_HUNT_RETREAT_HEXES,
  FIRST_HUNT_REWARD_Q,
  FIRST_HUNT_WALLET_ID,
  type FirstHuntHostileDefinition,
} from './population.js';

/**
 * One encounter hunt: FIRST HUNT and the two hunts of the ordinary contract working profile
 * (owner decision 2026-10-02). Every hunt runs through the same runtime: offer, accept/help,
 * JOIN at the objective, encounter, a unique physical proof, pickup and one presentation.
 */
export interface HuntProfile {
  readonly instanceId: string;
  readonly profileId: string;
  readonly issuerId: string;
  readonly issuerLocation: { readonly siteId: string; readonly areaId: string };
  readonly objectiveLocation: { readonly siteId: string; readonly areaId: string };
  readonly walletId: string;
  readonly genesisWalletQ: string;
  readonly rewardQ: string;
  readonly proofId: string;
  readonly proofDefinitionId: string;
  readonly combatMap: { readonly hexes: readonly Hex[]; readonly blocked: readonly Hex[] };
  readonly alliedSlots: readonly Hex[];
  readonly retreatHexes: { readonly allied: readonly Hex[]; readonly hostile: readonly Hex[] };
  readonly hostiles: readonly FirstHuntHostileDefinition[];
  /** The threat only shows itself at night: JOIN needs the Light night phase. */
  readonly nightOnly: boolean;
  /** Offered only once the mill-worker clues exist in some company's facts. */
  readonly needsMillWorkerClues: boolean;
}

const freeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};

const openField = createHexagon(3);
const openRetreat = {
  allied: openField.filter(({ q }) => q === -3),
  hostile: openField.filter(({ q }) => q === 3),
};

const wolfAttributes: UnitAttributes = {
  accuracy: 20,
  defense: 8,
  health: 40,
  stamina: 90,
  armor: 10,
  morale: 80,
  initiative: 55,
};
const wolfPools = { health: 40, stamina: 90, armor: 10, morale: 80 };
const wolf = (entityId: string, position: Hex): FirstHuntHostileDefinition => ({
  entityId,
  weaponItemId: 'wolf-fangs',
  // Bites use the existing one-hex melee profile; no combat rule changes.
  weaponId: 'raider',
  armorItemId: 'thick-hide',
  position,
  attributes: wolfAttributes,
  initialPools: wolfPools,
  armorCondition: 10,
  weaponCondition: 10000,
  doctrine: 'aggressive',
});

export const HUNT_PROFILES: readonly HuntProfile[] = freeze([
  {
    instanceId: FIRST_HUNT_INSTANCE_ID,
    profileId: FIRST_HUNT_PROFILE_ID,
    issuerId: FIRST_HUNT_ISSUER_ID,
    issuerLocation: FIRST_HUNT_ISSUER_LOCATION,
    objectiveLocation: FIRST_HUNT_ENCOUNTER_LOCATION,
    walletId: FIRST_HUNT_WALLET_ID,
    genesisWalletQ: FIRST_HUNT_GENESIS_WALLET_Q,
    rewardQ: FIRST_HUNT_REWARD_Q,
    proofId: FIRST_HUNT_PROOF_ID,
    proofDefinitionId: FIRST_HUNT_PROOF_DEFINITION_ID,
    combatMap: FIRST_HUNT_COMBAT_MAP,
    alliedSlots: FIRST_HUNT_ALLIED_SLOTS,
    retreatHexes: FIRST_HUNT_RETREAT_HEXES,
    hostiles: FIRST_HUNT_HOSTILE_GENESIS,
    nightOnly: false,
    needsMillWorkerClues: false,
  },
  {
    instanceId: 'ci.m1.wolf-trail.01',
    profileId: 'ct.m1.wolf-trail.v1',
    issuerId: 'npc.woodland-village-caller.bereznyak.01',
    issuerLocation: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
    objectiveLocation: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
    walletId: 'wallet.woodland-caller.bereznyak.01',
    genesisWalletQ: '160000000',
    rewardQ: '80000000',
    proofId: 'proof.wolf-trail.pack-leader.01',
    proofDefinitionId: 'wolf-pelt-trophy',
    combatMap: { hexes: openField, blocked: [{ q: 1, r: 1 }] },
    alliedSlots: FIRST_HUNT_ALLIED_SLOTS,
    retreatHexes: openRetreat,
    hostiles: [
      wolf('world.wolf.bereznyak.leader.01', { q: 2, r: 0 }),
      wolf('world.wolf.bereznyak.02', { q: 2, r: -1 }),
      wolf('world.wolf.bereznyak.03', { q: 3, r: -2 }),
    ],
    nightOnly: false,
    needsMillWorkerClues: false,
  },
  {
    instanceId: 'ci.m1.mill-beast.01',
    profileId: 'ct.m1.mill-beast.v1',
    issuerId: 'npc.local-warning-keeper.tikhaya-gat.01',
    issuerLocation: { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' },
    objectiveLocation: FIRST_HUNT_ENCOUNTER_LOCATION,
    walletId: 'wallet.warning-keeper.tikhaya-gat.01',
    genesisWalletQ: '180000000',
    rewardQ: '90000000',
    proofId: 'proof.mill-beast.claw.01',
    proofDefinitionId: 'beast-claw-trophy',
    combatMap: FIRST_HUNT_COMBAT_MAP,
    alliedSlots: FIRST_HUNT_ALLIED_SLOTS,
    retreatHexes: FIRST_HUNT_RETREAT_HEXES,
    hostiles: [
      {
        entityId: 'world.beast.old-mill.01',
        weaponItemId: 'beast-claws',
        // Claws use the existing heavy melee profile; no combat rule changes.
        weaponId: 'great-weapon',
        armorItemId: 'thick-hide',
        position: { q: 2, r: -1 },
        attributes: {
          accuracy: 26,
          defense: 6,
          health: 150,
          stamina: 120,
          armor: 30,
          morale: 100,
          initiative: 30,
        },
        initialPools: { health: 150, stamina: 120, armor: 30, morale: 100 },
        armorCondition: 30,
        weaponCondition: 10000,
        doctrine: 'aggressive',
      },
    ],
    nightOnly: true,
    needsMillWorkerClues: true,
  },
]);

export function huntProfile(instanceId: string): HuntProfile | undefined {
  return HUNT_PROFILES.find((profile) => profile.instanceId === instanceId);
}

export function huntProfileByProof(itemId: string): HuntProfile | undefined {
  return HUNT_PROFILES.find((profile) => profile.proofId === itemId);
}

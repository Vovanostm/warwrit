import { invariant } from '../primitives.js';
import { M0_COMBAT_RULESET_ID, type CombatRulesetId, type WeaponId } from './types.js';

export interface WeaponProfile {
  readonly id: WeaponId;
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly actionPointCost: number;
  readonly staminaCost: number;
  readonly baseDamage: number;
  readonly damageVariance: number;
  readonly accuracyModifier: number;
  readonly armorPenetrationPercent: number;
  readonly armorDamagePercent: number;
  readonly defenseModifier: number;
}

export interface CombatRules {
  readonly id: CombatRulesetId;
  readonly status: 'provisional';
  readonly units: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly sides: 2;
  readonly actionPointsPerActivation: number;
  readonly movement: {
    readonly actionPointsPerHex: number;
    readonly staminaPerHex: number;
  };
  readonly defend: {
    readonly actionPointCost: number;
    readonly staminaCost: number;
    readonly defenseBonus: number;
  };
  readonly initiative: {
    readonly fatigueDivisor: number;
    readonly minorWoundPenalty: number;
    readonly severeWoundPenalty: number;
  };
  readonly hit: {
    readonly baseChance: number;
    readonly minimumChance: number;
    readonly maximumChance: number;
    readonly lowStaminaThresholdPercent: number;
    readonly lowStaminaPenalty: number;
    readonly shakenMoraleThreshold: number;
    readonly shakenPenalty: number;
  };
  readonly recovery: {
    readonly staminaPerActivation: number;
  };
  readonly wounds: {
    readonly thresholdPercent: number;
    readonly severeThresholdPercent: number;
    readonly maximumPerUnit: number;
  };
  readonly morale: {
    readonly maximum: number;
    readonly damageLoss: number;
    readonly woundLoss: number;
    readonly allyDeathLoss: number;
  };
  readonly ai: {
    readonly survivorHealthThresholdPercent: number;
    readonly survivorMoraleThreshold: number;
  };
  readonly limits: {
    readonly maximumRounds: number;
    readonly maximumCommands: number;
  };
  readonly weapons: readonly WeaponProfile[];
}

export const COMBAT_RULES_V1: CombatRules = {
  id: M0_COMBAT_RULESET_ID,
  status: 'provisional',
  units: {
    minimum: 4,
    maximum: 12,
  },
  sides: 2,
  actionPointsPerActivation: 4,
  movement: {
    actionPointsPerHex: 1,
    staminaPerHex: 4,
  },
  defend: {
    actionPointCost: 2,
    staminaCost: 8,
    defenseBonus: 20,
  },
  initiative: {
    fatigueDivisor: 5,
    minorWoundPenalty: 4,
    severeWoundPenalty: 8,
  },
  hit: {
    baseChance: 65,
    minimumChance: 5,
    maximumChance: 95,
    lowStaminaThresholdPercent: 25,
    lowStaminaPenalty: 10,
    shakenMoraleThreshold: 25,
    shakenPenalty: 10,
  },
  recovery: {
    staminaPerActivation: 18,
  },
  wounds: {
    thresholdPercent: 25,
    severeThresholdPercent: 40,
    maximumPerUnit: 3,
  },
  morale: {
    maximum: 100,
    damageLoss: 4,
    woundLoss: 8,
    allyDeathLoss: 18,
  },
  ai: {
    survivorHealthThresholdPercent: 30,
    survivorMoraleThreshold: 20,
  },
  limits: {
    maximumRounds: 60,
    maximumCommands: 4_000,
  },
  weapons: [
    {
      id: 'sword-shield',
      minimumRange: 1,
      maximumRange: 1,
      actionPointCost: 3,
      staminaCost: 12,
      baseDamage: 22,
      damageVariance: 4,
      accuracyModifier: 5,
      armorPenetrationPercent: 20,
      armorDamagePercent: 80,
      defenseModifier: 5,
    },
    {
      id: 'spear',
      minimumRange: 1,
      maximumRange: 2,
      actionPointCost: 3,
      staminaCost: 14,
      baseDamage: 20,
      damageVariance: 3,
      accuracyModifier: 0,
      armorPenetrationPercent: 15,
      armorDamagePercent: 90,
      defenseModifier: 0,
    },
    {
      id: 'great-weapon',
      minimumRange: 1,
      maximumRange: 1,
      actionPointCost: 4,
      staminaCost: 20,
      baseDamage: 32,
      damageVariance: 5,
      accuracyModifier: -5,
      armorPenetrationPercent: 35,
      armorDamagePercent: 120,
      defenseModifier: -5,
    },
    {
      id: 'bow',
      minimumRange: 1,
      maximumRange: 4,
      actionPointCost: 4,
      staminaCost: 16,
      baseDamage: 18,
      damageVariance: 4,
      accuracyModifier: 0,
      armorPenetrationPercent: 20,
      armorDamagePercent: 50,
      defenseModifier: -8,
    },
    {
      id: 'raider',
      minimumRange: 1,
      maximumRange: 1,
      actionPointCost: 3,
      staminaCost: 12,
      baseDamage: 21,
      damageVariance: 4,
      accuracyModifier: 0,
      armorPenetrationPercent: 20,
      armorDamagePercent: 80,
      defenseModifier: 0,
    },
  ],
};

export function combatRules(rulesetId: CombatRulesetId): CombatRules {
  invariant(rulesetId === COMBAT_RULES_V1.id, `Unknown combat ruleset: ${rulesetId}`);
  return COMBAT_RULES_V1;
}

export function weaponProfile(rules: CombatRules, weaponId: WeaponId): WeaponProfile {
  const weapon = rules.weapons.find(({ id }) => id === weaponId);
  invariant(weapon !== undefined, `Unknown weapon profile: ${weaponId}`);
  return weapon;
}

import { assertNever, compareCodeUnits, invariant } from '../primitives.js';
import { hexDistance } from './hex.js';
import {
  M1_DOMAIN_BRIDGE_RULESET_ID,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  M1_DOMAIN_BRIDGE_V3_RULESET_ID,
  M1_DOMAIN_BRIDGE_V4_RULESET_ID,
  M1_DOMAIN_BRIDGE_V5_RULESET_ID,
} from './setup-v2.js';
import {
  M0_COMBAT_RULESET_ID,
  SPRITE_PROTOTYPE_RULESET_ID,
  SPRITE_PROTOTYPE_V2_RULESET_ID,
  SPRITE_PROTOTYPE_V3_RULESET_ID,
  SPRITE_PROTOTYPE_V4_RULESET_ID,
  type CombatRulesetId,
  type CombatCommand,
  type UnitId,
  type CombatUnitState,
  type BattleState,
  type WeaponId,
} from './types.js';

export const SPRITE_PROTOTYPE_FIRE_DAMAGE = 5;

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

export const COMBAT_RULES_V1: CombatRules & { readonly id: typeof M0_COMBAT_RULESET_ID } = {
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

export const SPRITE_PROTOTYPE_RULES: CombatRules & {
  readonly id: typeof SPRITE_PROTOTYPE_RULESET_ID;
} = {
  ...COMBAT_RULES_V1,
  id: SPRITE_PROTOTYPE_RULESET_ID,
  units: { minimum: 2, maximum: 12 },
};

export const SPRITE_PROTOTYPE_V2_RULES: CombatRules = {
  ...SPRITE_PROTOTYPE_RULES,
  id: SPRITE_PROTOTYPE_V2_RULESET_ID,
  recovery: { staminaPerActivation: 10 },
};

export const SPRITE_PROTOTYPE_V3_RULES: CombatRules = {
  ...SPRITE_PROTOTYPE_V2_RULES,
  id: SPRITE_PROTOTYPE_V3_RULESET_ID,
};

const BOW_THREE_AP_WEAPONS = COMBAT_RULES_V1.weapons.map((weapon) =>
  weapon.id === 'bow' ? { ...weapon, actionPointCost: 3 } : weapon,
);

export const SPRITE_PROTOTYPE_V4_RULES: CombatRules = {
  ...SPRITE_PROTOTYPE_V3_RULES,
  id: SPRITE_PROTOTYPE_V4_RULESET_ID,
  weapons: BOW_THREE_AP_WEAPONS,
};

export function isTacticalV3Ruleset(id: CombatRulesetId): boolean {
  return (
    id === SPRITE_PROTOTYPE_V3_RULESET_ID ||
    id === SPRITE_PROTOTYPE_V4_RULESET_ID ||
    id === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
    id === M1_DOMAIN_BRIDGE_V5_RULESET_ID
  );
}

export function isSpriteS4Ruleset(id: CombatRulesetId): boolean {
  return id === SPRITE_PROTOTYPE_V2_RULESET_ID || isTacticalV3Ruleset(id);
}

export function isSpritePrototypeRuleset(id: CombatRulesetId): boolean {
  return id === SPRITE_PROTOTYPE_RULESET_ID || isSpriteS4Ruleset(id);
}

export function isCombatPanicked(state: BattleState, unit: CombatUnitState): boolean {
  return (
    isSpriteS4Ruleset(state.rulesetId) &&
    unit.status === 'active' &&
    (unit.moralePolicy === 'human' || unit.moralePolicy === 'beast') &&
    unit.morale <= 20
  );
}

export function combatGuardedDamage(
  rawDamage: number,
  target: CombatUnitState,
  rules: CombatRules,
): number {
  return isSpriteS4Ruleset(rules.id) && target.guarding
    ? Math.max(
        1,
        Math.floor(
          (rawDamage *
            (isTacticalV3Ruleset(rules.id) && target.shieldBraceRank
              ? 65 - target.shieldBraceRank * 5
              : 75)) /
            100,
        ),
      )
    : rawDamage;
}

const COMPANY_COMBAT_RULES_V3: CombatRules = {
  ...COMBAT_RULES_V1,
  id: M1_DOMAIN_BRIDGE_V3_RULESET_ID,
  weapons: [
    ...COMBAT_RULES_V1.weapons,
    {
      id: 'fists',
      minimumRange: 1,
      maximumRange: 1,
      actionPointCost: 2,
      staminaCost: 8,
      baseDamage: 6,
      damageVariance: 0,
      accuracyModifier: 0,
      armorPenetrationPercent: 0,
      armorDamagePercent: 100,
      defenseModifier: 0,
    },
  ],
};

const COMPANY_COMBAT_RULES_V5: CombatRules = {
  ...COMPANY_COMBAT_RULES_V3,
  id: M1_DOMAIN_BRIDGE_V5_RULESET_ID,
  weapons: [
    ...BOW_THREE_AP_WEAPONS,
    ...COMPANY_COMBAT_RULES_V3.weapons.filter(({ id }) => id === 'fists'),
  ],
  recovery: SPRITE_PROTOTYPE_V3_RULES.recovery,
};

export function combatActionAllowed(
  state: Pick<BattleState, 'rulesetId'>,
  unit: CombatUnitState,
  intent: CombatCommand['type'],
): boolean {
  if (
    state.rulesetId !== M1_DOMAIN_BRIDGE_V3_RULESET_ID &&
    state.rulesetId !== M1_DOMAIN_BRIDGE_V4_RULESET_ID &&
    state.rulesetId !== M1_DOMAIN_BRIDGE_V5_RULESET_ID
  )
    return true;
  switch (intent) {
    case 'move':
    case 'attack':
    case 'defend':
    case 'retreat':
      return unit.capabilities?.[intent] === true;
    default:
      return (
        (state.rulesetId !== M1_DOMAIN_BRIDGE_V4_RULESET_ID &&
          state.rulesetId !== M1_DOMAIN_BRIDGE_V5_RULESET_ID) ||
        tacticalCapabilityAllowed(unit, intent)
      );
  }
}

function tacticalCapabilityAllowed(unit: CombatUnitState, intent: CombatCommand['type']): boolean {
  switch (intent) {
    case 'flee':
      return unit.capabilities?.move === true && unit.capabilities?.retreat === true;
    case 'use-skill':
    case 'prepare-threat':
    case 'retarget-threat':
    case 'execute-threat':
      return unit.capabilities?.attack === true;
    default:
      return true;
  }
}

export function combatRules(rulesetId: CombatRulesetId): CombatRules {
  invariant(
    rulesetId === COMBAT_RULES_V1.id ||
      rulesetId === SPRITE_PROTOTYPE_RULES.id ||
      rulesetId === SPRITE_PROTOTYPE_V2_RULESET_ID ||
      rulesetId === SPRITE_PROTOTYPE_V3_RULESET_ID ||
      rulesetId === SPRITE_PROTOTYPE_V4_RULESET_ID ||
      rulesetId === M1_DOMAIN_BRIDGE_RULESET_ID ||
      rulesetId === M1_DOMAIN_BRIDGE_V2_RULESET_ID ||
      rulesetId === M1_DOMAIN_BRIDGE_V3_RULESET_ID ||
      rulesetId === M1_DOMAIN_BRIDGE_V4_RULESET_ID ||
      rulesetId === M1_DOMAIN_BRIDGE_V5_RULESET_ID,
    `Unknown combat ruleset: ${rulesetId}`,
  );
  if (rulesetId === M1_DOMAIN_BRIDGE_V4_RULESET_ID)
    return {
      ...COMPANY_COMBAT_RULES_V3,
      id: rulesetId,
      recovery: SPRITE_PROTOTYPE_V3_RULES.recovery,
    };
  if (rulesetId === M1_DOMAIN_BRIDGE_V5_RULESET_ID) return COMPANY_COMBAT_RULES_V5;
  if (rulesetId === M1_DOMAIN_BRIDGE_V3_RULESET_ID) return COMPANY_COMBAT_RULES_V3;
  if (rulesetId === SPRITE_PROTOTYPE_V4_RULESET_ID) return SPRITE_PROTOTYPE_V4_RULES;
  if (rulesetId === SPRITE_PROTOTYPE_V3_RULESET_ID) return SPRITE_PROTOTYPE_V3_RULES;
  if (rulesetId === SPRITE_PROTOTYPE_V2_RULESET_ID) return SPRITE_PROTOTYPE_V2_RULES;
  return rulesetId === SPRITE_PROTOTYPE_RULES.id ? SPRITE_PROTOTYPE_RULES : COMBAT_RULES_V1;
}

export function compareCombatUnitIds(
  rulesetId: CombatRulesetId,
  left: UnitId,
  right: UnitId,
): number {
  switch (rulesetId) {
    case M0_COMBAT_RULESET_ID:
    case M1_DOMAIN_BRIDGE_RULESET_ID:
      // Historical payload compatibility: these versions used the host's pinned locale/ICU.
      // ast-grep-ignore: implicit-locale-compare — preserve their recorded ordering.
      return left.localeCompare(right);
    case M1_DOMAIN_BRIDGE_V2_RULESET_ID:
    case M1_DOMAIN_BRIDGE_V3_RULESET_ID:
    case M1_DOMAIN_BRIDGE_V4_RULESET_ID:
    case M1_DOMAIN_BRIDGE_V5_RULESET_ID:
    case SPRITE_PROTOTYPE_RULESET_ID:
    case SPRITE_PROTOTYPE_V2_RULESET_ID:
    case SPRITE_PROTOTYPE_V3_RULESET_ID:
    case SPRITE_PROTOTYPE_V4_RULESET_ID:
      return compareCodeUnits(left, right);
    default:
      return assertNever(rulesetId);
  }
}

export function weaponProfile(rules: CombatRules, weaponId: WeaponId): WeaponProfile {
  const weapon = rules.weapons.find(({ id }) => id === weaponId);
  invariant(weapon !== undefined, `Unknown weapon profile: ${weaponId}`);
  return weapon;
}

/** On-hit damage before current health caps; shared by execution and previews. */
export function combatAttackDamage(
  rawDamage: number,
  targetArmor: number,
  weapon: WeaponProfile,
): {
  readonly armorAbsorbed: number;
  readonly healthDamage: number;
  readonly armorDamage: number;
} {
  const penetratingDamage = Math.floor((rawDamage * weapon.armorPenetrationPercent) / 100);
  const blockableDamage = rawDamage - penetratingDamage;
  const armorAbsorbed = Math.min(targetArmor, blockableDamage);
  const healthDamage = penetratingDamage + (blockableDamage - armorAbsorbed);
  const armorDamage = Math.min(
    targetArmor,
    Math.max(armorAbsorbed, Math.ceil((rawDamage * weapon.armorDamagePercent) / 100)),
  );
  return { armorAbsorbed, healthDamage, armorDamage };
}

export function combatHitChance(
  actor: CombatUnitState,
  target: CombatUnitState,
  rules: CombatRules,
): number {
  if (isSpritePrototypeRuleset(rules.id)) {
    if (target.incorporeal === true) return 0;
    if (
      actor.trainedMelee === true &&
      actor.weaponId !== 'bow' &&
      hexDistance(actor.position, target.position) === 1
    ) {
      return 100;
    }
  }
  const woundPenalty = (unit: CombatUnitState) =>
    unit.wounds.reduce(
      (total, wound) =>
        total +
        (wound.severity === 'severe'
          ? rules.initiative.severeWoundPenalty
          : rules.initiative.minorWoundPenalty),
      0,
    );
  const lowStamina =
    actor.stamina * 100 <= actor.attributes.stamina * rules.hit.lowStaminaThresholdPercent;
  const shaken = actor.morale <= rules.hit.shakenMoraleThreshold;
  const actorAccuracy = Math.max(
    0,
    actor.attributes.accuracy -
      woundPenalty(actor) -
      (lowStamina ? rules.hit.lowStaminaPenalty : 0) -
      (shaken ? rules.hit.shakenPenalty : 0),
  );
  const targetShaken = target.morale <= rules.hit.shakenMoraleThreshold;
  const targetDefense = Math.max(
    0,
    target.attributes.defense +
      weaponProfile(rules, target.weaponId).defenseModifier +
      (target.guarding ? rules.defend.defenseBonus : 0) -
      woundPenalty(target) -
      (targetShaken ? rules.hit.shakenPenalty : 0),
  );
  const weapon = weaponProfile(rules, actor.weaponId);
  return Math.min(
    rules.hit.maximumChance,
    Math.max(
      rules.hit.minimumChance,
      rules.hit.baseChance + actorAccuracy + weapon.accuracyModifier - targetDefense,
    ),
  );
}

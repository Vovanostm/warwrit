export const COMBAT_LAB_VERSION = 1 as const;
export const COMBAT_LAB_SCENARIO = 'm0-3v3-v1' as const;
export const SPRITE_COMBAT_LAB_SCENARIO = 'sprite-6v6-v1' as const;
export const COMBAT_LAB_EVENT_LIMIT = 128;

export type CombatLabSkillId =
  'shield-brace' | 'armor-pressure' | 'reach-thrust' | 'aimed-shot' | 'rally';
export type CombatLabSkillRanks = Readonly<Partial<Record<CombatLabSkillId, 1 | 2 | 3>>>;
export interface CombatLabSkill {
  readonly skillId: CombatLabSkillId;
  readonly name: string;
  readonly rank: 1 | 2 | 3;
  readonly target: 'self' | 'enemy' | 'ally';
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly actionPointCost: number;
  readonly staminaCost: number;
  readonly duration: 'instant' | 'until-next-activation';
  readonly description: string;
  readonly equipmentAvailable: boolean;
}
export interface CombatLabSkillPreview extends CombatLabSkill {
  readonly rulesetId: NonNullable<CombatLabView['rulesetId']>;
  readonly revision: number;
  readonly activationId: string | null;
  readonly actorId: string;
  readonly targetId: string;
  readonly legal: boolean;
  readonly reason?: string;
  readonly hitChance?: number;
  readonly damage?: {
    readonly health: { readonly minimum: number; readonly maximum: number };
    readonly armor: { readonly minimum: number; readonly maximum: number };
  };
  readonly moraleGain?: number;
  readonly damageReductionPercent?: number;
}

export interface CombatLabTile extends CombatLabHex {
  readonly height: 0 | 1 | 2;
  readonly terrain: 'plain' | 'mud' | 'fire';
  readonly blocked: boolean;
}
export interface CombatLabCustomUnit {
  readonly id: string;
  readonly profileId: string;
  readonly sideId: 'human' | 'opponent';
  readonly position: CombatLabHex;
  readonly skillRanks?: CombatLabSkillRanks;
}
export interface CombatLabBattleConfig {
  readonly version: 1;
  readonly name: string;
  readonly seed: number;
  readonly map: { readonly name: string; readonly tiles: readonly CombatLabTile[] };
  readonly units: readonly CombatLabCustomUnit[];
}
export type CombatLabSkillDefinition = Omit<CombatLabSkill, 'rank' | 'equipmentAvailable'> & {
  readonly equipment: readonly CombatLabView['units'][number]['weaponId'][];
};

export interface CombatLabCatalog {
  readonly skills?: readonly CombatLabSkillDefinition[];
  readonly profiles: readonly {
    readonly id: string;
    readonly name: string;
    readonly defaultSkillRanks?: CombatLabSkillRanks;
    readonly kind: 'human' | 'creature';
    readonly weaponId: 'bow' | 'great-weapon' | 'raider' | 'spear' | 'sword-shield';
  }[];
  readonly defaultBattle: CombatLabBattleConfig;
}

export interface CombatLabCreate {
  readonly version: typeof COMBAT_LAB_VERSION;
  readonly requestId: string;
  readonly scenarioId: typeof COMBAT_LAB_SCENARIO | typeof SPRITE_COMBAT_LAB_SCENARIO;
  readonly battle?: CombatLabBattleConfig;
}
export interface CombatLabViewRequest {
  readonly version: typeof COMBAT_LAB_VERSION;
  readonly sessionId: string;
  readonly battleId: string;
}
export type CombatLabHex = Readonly<{ q: number; r: number }>;
export type CombatLabPool = Readonly<{ current: number; maximum: number }>;
export interface CombatLabAction extends CombatLabViewRequest {
  readonly requestId: string;
  readonly expectedViewRevision: number;
  readonly activationId: string;
  readonly actorId: string;
  readonly intent:
    | { readonly type: 'move'; readonly to: CombatLabHex }
    | { readonly type: 'attack'; readonly targetId: string }
    | { readonly type: 'use-skill'; readonly skillId: CombatLabSkillId; readonly targetId?: string }
    | { readonly type: 'autoplay' }
    | { readonly type: 'defend' | 'wait' | 'retreat' | 'flee' | 'surrender' | 'execute-threat' }
    | { readonly type: 'prepare-threat' | 'retarget-threat'; readonly targetId: string };
}
export type CombatLabAcknowledgement =
  | (CombatLabViewRequest & {
      readonly requestId: string;
      readonly status: 'accepted';
      readonly viewRevision: number;
    })
  | {
      readonly version: typeof COMBAT_LAB_VERSION;
      readonly requestId: string;
      readonly status: 'rejected';
      readonly code:
        | 'INVALID_REQUEST'
        | 'UNAUTHORIZED'
        | 'NOT_FOUND'
        | 'STALE_VIEW'
        | 'INVALID_ACTION'
        | 'REQUEST_CONFLICT'
        | 'LIMIT_REACHED';
    };
export interface CombatLabEvent {
  readonly id: string;
  readonly revision: number;
  readonly ordinal: number;
  readonly type:
    | 'battle.started'
    | 'round.started'
    | 'activation.started'
    | 'activation.ended'
    | 'unit.moved'
    | 'attack.resolved'
    | 'unit.damaged'
    | 'unit.fire-damaged'
    | 'unit.wounded'
    | 'unit.died'
    | 'unit.defended'
    | 'skill.used'
    | 'unit.retreated'
    | 'unit.surrendered'
    | 'threat.prepared'
    | 'threat.retargeted'
    | 'threat.cancelled'
    | 'threat.executed'
    | 'unit.morale-changed'
    | 'battle.resolved';
  readonly unitId: string | null;
  readonly targetId: string | null;
  readonly hit: boolean | null;
  readonly healthDamage: number | null;
  readonly armorDamage: number | null;
  readonly actionPointCost?: number;
  readonly staminaCost?: number;
  readonly skillId?: CombatLabSkillId;
  readonly rank?: 1 | 2 | 3;
  readonly moraleGain?: number;
}
export interface CombatLabAttackRefusal {
  readonly targetId: string;
  readonly code:
    | 'out-of-range'
    | 'too-close'
    | 'no-line-of-sight'
    | 'insufficient-action-points'
    | 'insufficient-stamina'
    | 'not-actor-turn'
    | 'panicking'
    | 'battle-resolved'
    | 'threat-not-available';
  readonly distance?: number;
  readonly minimumRange?: number;
  readonly maximumRange?: number;
  readonly required?: { readonly actionPoints: number; readonly stamina: number };
  readonly available?: { readonly actionPoints: number; readonly stamina: number };
}
export interface CombatLabView extends CombatLabViewRequest {
  readonly ruleHints?: {
    readonly hit: {
      readonly shakenMoraleThreshold: number;
      readonly shakenPenalty: number;
      readonly lowStaminaThresholdPercent: number;
      readonly lowStaminaPenalty: number;
    };
    readonly weapons: readonly {
      readonly id: string;
      readonly actionPointCost: number;
      readonly staminaCost: number;
    }[];
    readonly defend: {
      readonly actionPointCost: number;
      readonly staminaCost: number;
      readonly damageReductionPercent?: number;
    };
    readonly recovery: { readonly staminaPerActivation: number };
  };
  readonly scenarioId: typeof COMBAT_LAB_SCENARIO | typeof SPRITE_COMBAT_LAB_SCENARIO;
  readonly battle?: CombatLabBattleConfig;
  readonly controlledSideId: string;
  readonly viewRevision: number;
  readonly rulesetId?:
    'm0-prototype-v1' | 'sprite-prototype-v1' | 'sprite-prototype-v2' | 'sprite-prototype-v3';
  readonly status: 'active' | 'resolved';
  readonly round: number;
  readonly nextRoundInitiative?: { readonly round: number; readonly unitIds: readonly string[] };
  readonly map: Readonly<Record<'hexes' | 'blocked', readonly CombatLabHex[]>> & {
    readonly name?: string;
    readonly tiles?: readonly CombatLabTile[];
  };
  readonly movementPreview?: readonly {
    readonly to: CombatLabHex;
    readonly path: readonly CombatLabHex[];
    readonly actionPointCost: number;
    readonly staminaCost: number;
    readonly fireDamage?: number;
    readonly reactions?: readonly {
      readonly attackerId: string;
      readonly hitChance: number;
      readonly damage: {
        readonly health: { readonly minimum: number; readonly maximum: number };
        readonly armor: { readonly minimum: number; readonly maximum: number };
      };
    }[];
  }[];
  readonly attackPreview?: readonly {
    readonly targetId: string;
    readonly hitChance: number;
    readonly actionPointCost: number;
    readonly staminaCost: number;
    /** Conditional on a hit; excludes RNG outcome and caps loss at current pools. */
    readonly damage?: {
      readonly health: { readonly minimum: number; readonly maximum: number };
      readonly armor: { readonly minimum: number; readonly maximum: number };
    };
  }[];
  readonly attackRefusals?: readonly CombatLabAttackRefusal[];
  readonly rangedAttackArea?: readonly CombatLabHex[];
  readonly availableActions?: readonly ('defend' | 'wait' | 'retreat')[];
  readonly skills?: readonly CombatLabSkill[];
  readonly skillPreview?: readonly CombatLabSkillPreview[];
  readonly sides: readonly {
    readonly id: string;
    readonly retreatHexes: readonly CombatLabHex[];
  }[];
  readonly units: readonly {
    readonly id: string;
    readonly profileId?: string;
    readonly name?: string;
    readonly sideId: string;
    readonly weaponId: 'bow' | 'great-weapon' | 'raider' | 'spear' | 'sword-shield';
    readonly position: CombatLabHex;
    readonly status: 'active' | 'dead' | 'retreated' | 'surrendered';
    /** Inspection reach ignores turn/AP/stamina; attackPreview alone admits a current target. */
    readonly weaponReach?: {
      readonly minimumRange: number;
      readonly maximumRange: number;
      readonly cells: readonly CombatLabHex[];
    };
    readonly panicking?: boolean;
    readonly escapePlan?: {
      readonly exit: CombatLabHex;
      readonly path: readonly CombatLabHex[];
      readonly safe: boolean;
    };
    readonly threat?: {
      readonly targetId: string;
      readonly targetHex: CombatLabHex;
      readonly range: 2;
      readonly damage: { readonly minimum: number; readonly maximum: number };
      readonly retargeted: boolean;
      readonly responseReceived: boolean;
    };
    readonly guarding: boolean;
    readonly skillRanks?: CombatLabSkillRanks;
    readonly shieldBraceRank?: 1 | 2 | 3;
    readonly guardDamageReductionPercent?: number;
    readonly initiative: number;
    readonly pools: Readonly<Record<'health' | 'armor' | 'stamina' | 'morale', CombatLabPool>>;
    readonly wounds: readonly ('minor' | 'severe')[];
  }[];
  readonly initiativeOrder: readonly string[];
  readonly turnIndex: number;
  readonly activation: {
    readonly id: string;
    readonly actorId: string;
    readonly actionPoints: CombatLabPool;
  } | null;
  readonly events: readonly CombatLabEvent[];
  readonly omittedEventPrefix: number;
  readonly outcome: {
    readonly reason: 'last-side-standing' | 'round-limit';
    readonly winnerSideId: string | null;
  } | null;
}

export const COMBAT_LAB_VERSION = 1 as const;
export const COMBAT_LAB_SCENARIO = 'm0-3v3-v1' as const;
export const COMBAT_LAB_EVENT_LIMIT = 128;

export interface CombatLabCreate {
  readonly version: typeof COMBAT_LAB_VERSION;
  readonly requestId: string;
  readonly scenarioId: typeof COMBAT_LAB_SCENARIO;
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
    | { readonly type: 'defend' | 'wait' | 'retreat' };
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
    | 'unit.wounded'
    | 'unit.died'
    | 'unit.defended'
    | 'unit.retreated'
    | 'unit.morale-changed'
    | 'battle.resolved';
  readonly unitId: string | null;
  readonly targetId: string | null;
  readonly hit: boolean | null;
  readonly healthDamage: number | null;
  readonly armorDamage: number | null;
}
export interface CombatLabView extends CombatLabViewRequest {
  readonly scenarioId: typeof COMBAT_LAB_SCENARIO;
  readonly controlledSideId: string;
  readonly viewRevision: number;
  readonly status: 'active' | 'resolved';
  readonly round: number;
  readonly map: Readonly<Record<'hexes' | 'blocked', readonly CombatLabHex[]>>;
  readonly sides: readonly {
    readonly id: string;
    readonly retreatHexes: readonly CombatLabHex[];
  }[];
  readonly units: readonly {
    readonly id: string;
    readonly sideId: string;
    readonly weaponId: 'bow' | 'great-weapon' | 'raider' | 'spear' | 'sword-shield';
    readonly position: CombatLabHex;
    readonly status: 'active' | 'dead' | 'retreated';
    readonly guarding: boolean;
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

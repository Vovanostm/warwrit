import type { Brand } from '../primitives.js';

export type BattleId = Brand<string, 'BattleId'>;
export type CommandId = Brand<string, 'CommandId'>;
export type SideId = Brand<string, 'SideId'>;
export type UnitId = Brand<string, 'UnitId'>;

export const COMBAT_SCHEMA_VERSION = 1 as const;
export const M0_COMBAT_RULESET_ID = 'm0-prototype-v1' as const;
export const COMBAT_RANDOM_ALGORITHM = 'xorshift32-v1' as const;
export const M0_WEAPON_IDS = ['bow', 'great-weapon', 'raider', 'spear', 'sword-shield'] as const;

export type CombatRulesetId = typeof M0_COMBAT_RULESET_ID;
export type WeaponId = (typeof M0_WEAPON_IDS)[number];
export type UnitStatus = 'active' | 'dead' | 'retreated';
export type WoundSeverity = 'minor' | 'severe';
export type BattleStatus = 'active' | 'resolved';
export type AiDoctrine = 'aggressive' | 'survivor';

export interface Hex {
  readonly q: number;
  readonly r: number;
}

export interface CombatMap {
  readonly hexes: readonly Hex[];
  readonly blocked: readonly Hex[];
}

export interface CombatSideSetup {
  readonly id: SideId;
  readonly retreatHexes: readonly Hex[];
}

export interface UnitAttributes {
  readonly accuracy: number;
  readonly armor: number;
  readonly defense: number;
  readonly health: number;
  readonly initiative: number;
  readonly morale: number;
  readonly stamina: number;
}

export interface CombatUnitSetup {
  readonly id: UnitId;
  readonly sideId: SideId;
  readonly position: Hex;
  readonly weaponId: WeaponId;
  readonly attributes: UnitAttributes;
}

export interface BattleSetup {
  readonly schemaVersion: typeof COMBAT_SCHEMA_VERSION;
  readonly battleId: BattleId;
  readonly rulesetId: CombatRulesetId;
  readonly seed: number;
  readonly map: CombatMap;
  readonly sides: readonly [CombatSideSetup, CombatSideSetup];
  readonly units: readonly CombatUnitSetup[];
}

export interface CombatWound {
  readonly sequence: number;
  readonly severity: WoundSeverity;
}

export interface CombatUnitState extends CombatUnitSetup {
  readonly health: number;
  readonly armor: number;
  readonly stamina: number;
  readonly morale: number;
  readonly guarding: boolean;
  readonly status: UnitStatus;
  readonly wounds: readonly CombatWound[];
}

export interface RandomState {
  readonly algorithm: typeof COMBAT_RANDOM_ALGORITHM;
  readonly value: number;
  readonly draws: number;
}

export interface CombatActivation {
  readonly id: string;
  readonly unitId: UnitId;
  readonly remainingActionPoints: number;
}

export type BattleResolutionReason = 'last-side-standing' | 'round-limit';

export interface BattleOutcome {
  readonly reason: BattleResolutionReason;
  readonly winnerSideId?: SideId;
}

export interface BattleState {
  readonly schemaVersion: typeof COMBAT_SCHEMA_VERSION;
  readonly battleId: BattleId;
  readonly rulesetId: CombatRulesetId;
  readonly seed: number;
  readonly map: CombatMap;
  readonly sides: readonly [CombatSideSetup, CombatSideSetup];
  readonly units: readonly CombatUnitState[];
  readonly random: RandomState;
  readonly round: number;
  readonly initiativeOrder: readonly UnitId[];
  readonly turnIndex: number;
  readonly activation: CombatActivation | null;
  readonly revision: number;
  readonly processedCommandIds: readonly CommandId[];
  readonly status: BattleStatus;
  readonly outcome?: BattleOutcome;
}

interface CombatCommandBase {
  readonly commandId: CommandId;
  readonly activationId: string;
  readonly actorId: UnitId;
}

export interface MoveCommand extends CombatCommandBase {
  readonly type: 'move';
  readonly to: Hex;
}

export interface AttackCommand extends CombatCommandBase {
  readonly type: 'attack';
  readonly targetId: UnitId;
}

export interface DefendCommand extends CombatCommandBase {
  readonly type: 'defend';
}

export interface WaitCommand extends CombatCommandBase {
  readonly type: 'wait';
}

export interface RetreatCommand extends CombatCommandBase {
  readonly type: 'retreat';
}

export type CombatCommand =
  MoveCommand | AttackCommand | DefendCommand | WaitCommand | RetreatCommand;

export type CombatFailureCode =
  | 'BATTLE_TERMINAL'
  | 'DUPLICATE_COMMAND'
  | 'HEX_OCCUPIED'
  | 'INSUFFICIENT_ACTION_POINTS'
  | 'INSUFFICIENT_STAMINA'
  | 'INVALID_PATH'
  | 'INVALID_TARGET'
  | 'NOT_ACTIVE_UNIT'
  | 'OUT_OF_RANGE'
  | 'RETREAT_NOT_AVAILABLE'
  | 'STALE_ACTIVATION'
  | 'TARGET_NOT_FOUND'
  | 'UNIT_NOT_FOUND';

export interface CombatFailure {
  readonly code: CombatFailureCode;
  readonly message: string;
}

interface CombatEventBase {
  readonly type: string;
  readonly battleId: BattleId;
  readonly revision: number;
}

export interface BattleStartedEvent extends CombatEventBase {
  readonly type: 'battle.started';
  readonly seed: number;
  readonly rulesetId: CombatRulesetId;
}

export interface RoundStartedEvent extends CombatEventBase {
  readonly type: 'round.started';
  readonly round: number;
  readonly initiativeOrder: readonly UnitId[];
}

export interface ActivationStartedEvent extends CombatEventBase {
  readonly type: 'activation.started';
  readonly activationId: string;
  readonly unitId: UnitId;
  readonly actionPoints: number;
}

export interface ActivationEndedEvent extends CombatEventBase {
  readonly type: 'activation.ended';
  readonly activationId: string;
  readonly unitId: UnitId;
  readonly reason: 'command' | 'battle-resolved';
}

export interface UnitMovedEvent extends CombatEventBase {
  readonly type: 'unit.moved';
  readonly unitId: UnitId;
  readonly from: Hex;
  readonly to: Hex;
  readonly path: readonly Hex[];
  readonly actionPointCost: number;
  readonly staminaCost: number;
}

export interface AttackResolvedEvent extends CombatEventBase {
  readonly type: 'attack.resolved';
  readonly attackerId: UnitId;
  readonly targetId: UnitId;
  readonly hitChance: number;
  readonly roll: number;
  readonly hit: boolean;
}

export interface UnitDamagedEvent extends CombatEventBase {
  readonly type: 'unit.damaged';
  readonly unitId: UnitId;
  readonly rawDamage: number;
  readonly armorAbsorbed: number;
  readonly armorDamage: number;
  readonly healthDamage: number;
  readonly remainingArmor: number;
  readonly remainingHealth: number;
}

export interface UnitWoundedEvent extends CombatEventBase {
  readonly type: 'unit.wounded';
  readonly unitId: UnitId;
  readonly severity: WoundSeverity;
}

export interface UnitDiedEvent extends CombatEventBase {
  readonly type: 'unit.died';
  readonly unitId: UnitId;
}

export interface UnitDefendedEvent extends CombatEventBase {
  readonly type: 'unit.defended';
  readonly unitId: UnitId;
}

export interface UnitRetreatedEvent extends CombatEventBase {
  readonly type: 'unit.retreated';
  readonly unitId: UnitId;
  readonly sideId: SideId;
}

export interface MoraleChangedEvent extends CombatEventBase {
  readonly type: 'unit.morale-changed';
  readonly unitId: UnitId;
  readonly delta: number;
  readonly morale: number;
  readonly cause: 'ally-death' | 'damage' | 'wound';
}

export interface BattleResolvedEvent extends CombatEventBase {
  readonly type: 'battle.resolved';
  readonly outcome: BattleOutcome;
}

export type CombatEvent =
  | BattleStartedEvent
  | RoundStartedEvent
  | ActivationStartedEvent
  | ActivationEndedEvent
  | UnitMovedEvent
  | AttackResolvedEvent
  | UnitDamagedEvent
  | UnitWoundedEvent
  | UnitDiedEvent
  | UnitDefendedEvent
  | UnitRetreatedEvent
  | MoraleChangedEvent
  | BattleResolvedEvent;

export interface CombatTransition {
  readonly state: BattleState;
  readonly events: readonly CombatEvent[];
}

export type CombatCommandResult =
  | {
      readonly ok: true;
      readonly state: BattleState;
      readonly events: readonly CombatEvent[];
    }
  | {
      readonly ok: false;
      readonly state: BattleState;
      readonly error: CombatFailure;
    };

export interface CombatReplay {
  readonly schemaVersion: typeof COMBAT_SCHEMA_VERSION;
  readonly setup: BattleSetup;
  readonly commands: readonly CombatCommand[];
}

export interface CombatSimulation {
  readonly state: BattleState;
  readonly commands: readonly CombatCommand[];
  readonly events: readonly CombatEvent[];
  readonly replay: CombatReplay;
}

export interface ReplayResult extends CombatTransition {
  readonly commandsApplied: number;
}

export function battleId(value: string): BattleId {
  return value as BattleId;
}

export function commandId(value: string): CommandId {
  return value as CommandId;
}

export function sideId(value: string): SideId {
  return value as SideId;
}

export function unitId(value: string): UnitId {
  return value as UnitId;
}

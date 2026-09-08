import type { EconomyRequirement, CompanyFinance } from './economy-types.js';
import type { AtLocation, LifecycleState } from './lifecycle-types.js';
import type { LocationRef, OwnerRef } from './model.js';
import type { CampaignTick, CanonicalRevision, MoneyQ } from './values.js';

export const PHYSICAL_SCHEMA_VERSION = 1 as const;
export const PHYSICAL_POLICY_VERSION = 's02-physical-1' as const;
export const PHYSICAL_RULES = Object.freeze({
  policyVersion: PHYSICAL_POLICY_VERSION,
  baseHealth: 100,
  baseStamina: 100,
  defaultConditionMaximum: 10000,
} as const);

export type EquipmentSlot = 'HEAD' | 'BODY' | 'MAIN_HAND' | 'OFF_HAND' | 'BELT';
export type PhysicalError =
  | 'INVALID_STATE'
  | 'INVALID_SOURCE'
  | 'INVALID_TIME'
  | 'INVALID_ARGUMENT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CONTACT_OR_ACCESS_REQUIRED'
  | 'INCOMPATIBLE_ACTIVITY'
  | 'CAPACITY'
  | 'INSUFFICIENT_ITEMS'
  | 'INSUFFICIENT_FUNDS'
  | 'UNSUPPORTED_ACTION';

export interface ItemProvenance {
  readonly sourceId: string;
  readonly parentItemId: string | null;
  readonly ordinal: number;
}
export interface ItemInstance {
  readonly itemId: string;
  readonly definitionId: string;
  readonly owner: OwnerRef;
  readonly containerId: string | null;
  readonly quantity: number;
  readonly currentCondition: number;
  readonly maximumCondition: number;
  readonly contentRevision: string;
  readonly provenance: ItemProvenance;
  readonly equipped: null | {
    readonly characterId: string;
    readonly slots: readonly EquipmentSlot[];
  };
  readonly tombstone: null | {
    readonly sourceId: string;
    readonly causeId: string;
    readonly atTick: CampaignTick;
  };
}
export interface PhysicalContainer {
  readonly containerId: string;
  readonly kind: 'CARRIED' | 'PARTY_SUPPLY' | 'STATIC' | 'GROUND_BUNDLE' | 'CORPSE' | 'CUSTODY';
  readonly location: LocationRef;
  readonly custodian: OwnerRef;
  readonly carrier: null | { readonly kind: 'CHARACTER' | 'PARTY'; readonly id: string };
  readonly capacityG: number;
  readonly access: 'COMPANY' | 'OWNER' | 'CUSTODIAN';
  readonly closed: null | {
    readonly sourceId: string;
    readonly causeId: string;
    readonly atTick: CampaignTick;
  };
}
export interface PhysicalVitals {
  readonly characterId: string;
  readonly sourceId: string;
  readonly maximumHealth: number;
  readonly currentHealth: number;
  readonly healthCarry: string;
  readonly maximumStamina: number;
  readonly currentStamina: number;
  readonly staminaCarry: string;
}
export interface ConditionInstance {
  readonly conditionId: string;
  readonly characterId: string;
  readonly definitionId: string;
  readonly sourceEventId: string;
  readonly causeId: string;
  readonly onsetTick: CampaignTick;
  readonly deadlineTick: CampaignTick | null;
  readonly care: null | {
    readonly careDefinitionId: string;
    readonly sourceId: string;
    readonly fulfilledAt: CampaignTick;
    readonly channel: 'MATERIAL' | 'PROVIDER' | 'INHERITED_STABILIZATION';
  };
  readonly recoveryTicks: string;
  readonly resolvedAt: CampaignTick | null;
  readonly resolutionSourceId: string | null;
  readonly scarId: string | null;
}
export interface CaptiveCustody {
  readonly characterId: string;
  readonly custodian: OwnerRef;
  readonly location: LocationRef;
  readonly sourceId: string;
  readonly sinceTick: CampaignTick;
}
export interface FoodFulfillment {
  readonly sourceId: string;
  readonly membershipId: string;
  readonly fromTick: CampaignTick;
  readonly toTick: CampaignTick;
  readonly channel: 'STOCK' | 'PROVIDER';
  readonly unitsConsumed: string;
}
export interface FoodCarry {
  readonly membershipId: string;
  readonly tickUnits: string;
}
export interface CareHandoverRecord {
  readonly sourceId: string;
  readonly characterId: string;
  readonly receiverId: string;
  readonly atTick: CampaignTick;
}
export interface PhysicalSourceEffect {
  readonly key: string;
  readonly requestKey: string;
}
export interface PhysicalKnowledge {
  readonly itemSnapshots: readonly ItemInstance[];
  readonly conditionSnapshots: readonly ConditionInstance[];
  readonly vitalSnapshots: readonly PhysicalVitals[];
  readonly containerSnapshots: readonly PhysicalContainer[];
}
export interface CompanyPhysicalState {
  readonly schemaVersion: typeof PHYSICAL_SCHEMA_VERSION;
  readonly policyVersion: typeof PHYSICAL_POLICY_VERSION;
  readonly processedTick: CampaignTick;
  readonly items: readonly ItemInstance[];
  readonly containers: readonly PhysicalContainer[];
  readonly conditions: readonly ConditionInstance[];
  readonly vitals: readonly PhysicalVitals[];
  readonly custody: readonly CaptiveCustody[];
  readonly food: readonly FoodFulfillment[];
  readonly foodCarry: readonly FoodCarry[];
  readonly careHandovers: readonly CareHandoverRecord[];
  readonly sourceEffects: readonly PhysicalSourceEffect[];
  readonly knowledge: PhysicalKnowledge;
}

export interface LegacyConditionBinding {
  readonly characterId: string;
  readonly definitionId: string;
  readonly conditionId: string;
  readonly sourceEventId: string;
  readonly causeId: string;
  readonly onsetTick: CampaignTick;
  readonly deadlineTick?: CampaignTick;
  readonly care?: ConditionInstance['care'];
  readonly recoveryTicks?: string;
  readonly resolvedAt?: CampaignTick | null;
  readonly resolutionSourceId?: string | null;
  readonly scarId?: string | null;
}
export interface PhysicalInitialization {
  readonly conditionBindings?: readonly LegacyConditionBinding[];
  readonly knownConditionBindings?: readonly LegacyConditionBinding[];
  readonly vitals?: readonly PhysicalVitals[];
  readonly knownVitals?: readonly PhysicalVitals[];
  readonly items?: readonly ItemInstance[];
  readonly knownItems?: readonly ItemInstance[];
  readonly containers?: readonly PhysicalContainer[];
  readonly knownContainers?: readonly PhysicalContainer[];
}

interface PhysicalScope {
  readonly id: string;
  readonly companyId: string;
  readonly worldId: string;
  readonly revision: CanonicalRevision;
  readonly sourceEventId: string;
  readonly atTick: CampaignTick;
  readonly ordinal: number;
  readonly version: typeof PHYSICAL_POLICY_VERSION;
}
export interface ItemAccessEvidence extends PhysicalScope {
  readonly kind: 'ITEM_ACCESS';
  readonly operatorId: string;
  readonly location: AtLocation;
  readonly containerIds: readonly string[];
  readonly itemIds: readonly string[];
  readonly purpose: 'TRANSFER' | 'EQUIP' | 'REPAIR' | 'LOOT';
}
export interface OwnershipAuthorizationEvidence extends PhysicalScope {
  readonly kind: 'OWNERSHIP_AUTHORIZATION';
  readonly itemId: string;
  readonly fromOwner: OwnerRef;
  readonly toOwner: OwnerRef;
  readonly operation: 'GIFT' | 'SALE' | 'SEIZURE' | 'LOOT' | 'RETURN';
}
export interface RecruitItemEvidence extends PhysicalScope {
  readonly kind: 'RECRUIT_ITEM';
  readonly membershipId: string;
  readonly itemId: string;
  readonly fromContainerId: string;
  readonly toContainerId: string;
  readonly offeredOwner: OwnerRef;
}
export interface ConditionSourceEvidence extends PhysicalScope {
  readonly kind: 'CONDITION_SOURCE';
  readonly characterId: string;
  readonly definitionId: string;
  readonly causeId: string;
  readonly onsetTick: CampaignTick;
  readonly deadlineTick?: CampaignTick;
}
export interface CareFulfillmentEvidence extends PhysicalScope {
  readonly kind: 'CARE_FULFILLMENT';
  readonly characterId: string;
  readonly conditionId: string;
  readonly careDefinitionId: string;
  readonly providerId: string;
  readonly location: AtLocation;
  readonly channel: 'MATERIAL' | 'PROVIDER';
  readonly resourceItemId?: string;
  readonly resourceContainerId?: string;
  readonly poolId?: string;
  readonly providerWalletId?: string;
  readonly moneyAccessEvidenceId?: string;
  readonly amountQ?: MoneyQ;
}
export interface FoodFulfillmentEvidence extends PhysicalScope {
  readonly kind: 'FOOD_FULFILLMENT';
  readonly membershipId: string;
  readonly fromTick: CampaignTick;
  readonly toTick: CampaignTick;
  readonly channel: 'STOCK' | 'PROVIDER';
  readonly location: AtLocation;
  readonly containerId?: string;
  readonly providerId?: string;
  readonly poolId?: string;
  readonly providerWalletId?: string;
  readonly moneyAccessEvidenceId?: string;
  readonly amountQ?: MoneyQ;
}
export interface CareHandoverEvidence extends PhysicalScope {
  readonly kind: 'CARE_HANDOVER';
  readonly handoverId: string;
  readonly characterId: string;
  readonly receiverId: string;
  readonly location: AtLocation;
}
export interface RepairServiceEvidence extends PhysicalScope {
  readonly kind: 'REPAIR_SERVICE';
  readonly itemId: string;
  readonly targetContainerId: string;
  readonly materialsContainerId: string;
  readonly providerId: string;
  readonly location: AtLocation;
  readonly repairPoints: number;
  readonly poolId: string;
  readonly providerWalletId: string;
  readonly moneyAccessEvidenceId: string;
  readonly amountQ: MoneyQ;
}
export interface LootAuthorizationEvidence extends PhysicalScope {
  readonly kind: 'LOOT_AUTHORIZATION';
  readonly outcomeId: string;
  readonly itemIds: readonly string[];
  readonly fromContainerIds: readonly string[];
  readonly ownerAfter: OwnerRef;
}
export interface CaptureOutcomeEvidence extends PhysicalScope {
  readonly kind: 'CAPTURE_OUTCOME';
  readonly characterId: string;
  readonly captor: OwnerRef;
  readonly location: LocationRef;
}
export interface SeizureEvidence extends PhysicalScope {
  readonly kind: 'SEIZURE';
  readonly characterId: string;
  readonly itemId: string;
  readonly toContainerId: string;
  readonly captor: OwnerRef;
}
export interface ReleaseOutcomeEvidence extends PhysicalScope {
  readonly kind: 'RELEASE_OUTCOME';
  readonly characterId: string;
  readonly route: 'RANSOM' | 'RESCUE' | 'SELF_ESCAPE';
  readonly fromCustodian: OwnerRef;
  readonly location: LocationRef;
}
export interface CaptiveTransferEvidence extends PhysicalScope {
  readonly kind: 'CAPTIVE_TRANSFER';
  readonly characterId: string;
  readonly fromCustodianId: string;
  readonly toCustodian: OwnerRef;
  readonly location: LocationRef;
}
export interface MissingResolutionEvidence extends PhysicalScope {
  readonly kind: 'MISSING_RESOLUTION';
  readonly characterId: string;
  readonly notBefore: CampaignTick;
  readonly outcome: 'ALIVE' | 'CAPTIVE' | 'DEAD';
  readonly location: LocationRef;
  readonly custodian?: OwnerRef;
  readonly actualDeathTick?: CampaignTick;
  readonly causeId?: string;
  readonly custodyOutcomeId?: string;
  readonly financialDeathReceiptId?: string;
}
export interface DeathOutcomeEvidence extends PhysicalScope {
  readonly kind: 'DEATH_OUTCOME';
  readonly characterId: string;
  readonly actualDeathTick: CampaignTick;
  readonly causeId: string;
  readonly location: LocationRef;
  readonly corpseContainerId: string;
}
export interface ContainerDispositionEvidence extends PhysicalScope {
  readonly kind: 'CONTAINER_DISPOSITION';
  readonly containerId: string;
  readonly causeId: string;
  readonly notBefore: CampaignTick;
  readonly disposition: 'TRANSFER' | 'DESTROY_WITH_CAUSE';
  readonly destinationId?: string;
}
export interface PhysicalObservationEvidence extends PhysicalScope {
  readonly kind: 'PHYSICAL_OBSERVATION';
  readonly observerCompanyId: string;
  readonly subject: { readonly kind: 'CHARACTER' | 'COMPANY'; readonly id: string };
  readonly itemIds: readonly string[];
  readonly containerIds: readonly string[];
}
export type PhysicalEvidence =
  | ItemAccessEvidence
  | OwnershipAuthorizationEvidence
  | RecruitItemEvidence
  | ConditionSourceEvidence
  | CareFulfillmentEvidence
  | FoodFulfillmentEvidence
  | CareHandoverEvidence
  | RepairServiceEvidence
  | LootAuthorizationEvidence
  | CaptureOutcomeEvidence
  | SeizureEvidence
  | ReleaseOutcomeEvidence
  | CaptiveTransferEvidence
  | MissingResolutionEvidence
  | DeathOutcomeEvidence
  | ContainerDispositionEvidence
  | PhysicalObservationEvidence;

export type MaterializedCompanyState = {
  readonly lifecycle: LifecycleState;
  readonly finance: CompanyFinance;
  readonly physical: CompanyPhysicalState;
};
export type PhysicalChange = {
  readonly lifecycle: LifecycleState;
  readonly finance: CompanyFinance;
  readonly physical: CompanyPhysicalState;
  readonly requirements: readonly EconomyRequirement[];
};

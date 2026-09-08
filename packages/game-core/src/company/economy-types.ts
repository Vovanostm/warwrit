import type { CompanyCommand } from './commands.js';
import type {
  AtLocation,
  LifecycleContext,
  LifecycleError,
  LifecycleEvent,
  LifecycleReceipt,
  OpeningAssets,
  LifecycleState,
} from './lifecycle-types.js';
import type { OwnerRef } from './model.js';
import type { CampaignTick, CanonicalRevision, MoneyQ, PublicRevision } from './values.js';
import type { CompanyPhysicalState, PhysicalError, PhysicalEvidence } from './physical-types.js';

export const ECONOMY_SCHEMA_VERSION = 1 as const;
export const ECONOMY_POLICY_VERSION = 's02-economy-1' as const;
export interface Wallet {
  readonly walletId: string;
  readonly owner: OwnerRef;
  readonly location: AtLocation;
  readonly cashQ: MoneyQ;
}
/** One local purse per budget. Neither the pool nor an access grant owns another balance. */
export interface FundingPool {
  readonly poolId: string;
  readonly walletId: string;
}
export interface WageRate {
  readonly minimumLevel: number;
  readonly dailyWageMilli: string;
}
export interface WageNotice {
  readonly sourceId: string;
  readonly version: string;
  readonly notifiedAt: CampaignTick;
  readonly effectiveAt: CampaignTick;
  readonly lifetimeLevel: number;
  readonly dailyWageMilli: string;
}
export interface WageSchedule {
  readonly scheduleId: string;
  readonly agreedAt: CampaignTick;
  readonly agreedDailyWageMilli: string;
  /** The real offer's pre-explained tariff, not equipment/current-duty pricing. */
  readonly rates: readonly WageRate[];
  readonly notices: readonly WageNotice[];
}
export interface ServiceAccount {
  readonly membershipId: string;
  readonly poolId: string;
  readonly recipient: OwnerRef;
  readonly schedule: WageSchedule | null;
  readonly known: boolean;
  readonly confirmedAt: CampaignTick;
  /** Actual duty availability can diverge from the last observed state. Legacy rows fall back to knownPaused. */
  readonly actualPaused?: boolean;
  readonly knownPaused: boolean;
  readonly knownDeath: boolean;
  readonly death: null | {
    readonly sourceId: string;
    readonly atTick: CampaignTick;
    readonly recipient: OwnerRef;
  };
}
/** A factual earned interval. F1 discharges the current entitlement in kind, not with cash. */
export interface EarnedPeriod {
  readonly fromTick: CampaignTick;
  readonly toTick: CampaignTick;
  readonly dailyWageMilli: string;
  readonly maintenanceId: string | null;
}
export interface WageClaim {
  readonly claimId: string;
  readonly membershipId: string;
  readonly poolId: string;
  readonly rateVersion: string;
  readonly dueAt: CampaignTick;
  readonly fromTick: CampaignTick;
  readonly toTick: CampaignTick;
  readonly dailyWageMilli: string;
  readonly maintenanceId: string | null;
  readonly earned: readonly EarnedPeriod[];
  readonly paidQ: MoneyQ;
  /** Last-known estimate, explicitly not a second legally earned claim. */
  readonly reportedQ: MoneyQ;
  readonly reportedCoveredQ: MoneyQ;
}
export interface MoneyReservation {
  readonly reservationId: string;
  readonly walletId: string;
  readonly claimId: string;
  readonly amountQ: MoneyQ;
  readonly purpose: 'PENDING_CONFIRMATION' | 'PRE_ENTRY';
}
export interface AllocationEpoch {
  readonly epochId: string;
  readonly poolId: string;
  readonly dueAt: CampaignTick;
  readonly weights: readonly { readonly claimId: string; readonly amountQ: MoneyQ }[];
  readonly cumulativeQ: MoneyQ;
  readonly closedAt: CampaignTick | null;
}
export interface ArrearsEpisode {
  readonly episodeId: string;
  readonly membershipId: string;
  readonly firstDueAt: CampaignTick;
  readonly complaintAt: CampaignTick | null;
  readonly warning: null | {
    readonly atTick: CampaignTick;
    readonly deadline: CampaignTick;
    readonly leaderId: string;
    readonly relation: {
      readonly friend: number;
      readonly respect: number;
      readonly rivalry: number;
    };
    readonly sourceId: string;
  };
  readonly resolvedAt: CampaignTick | null;
}
export interface DepartureIntent {
  readonly intentId: string;
  readonly membershipId: string;
  readonly reason: 'DISMISSED' | 'WAGE_BREACH' | 'CANONICAL_EVENT';
  readonly causeId: string;
  readonly requestedAt: CampaignTick;
  readonly cancelledAt: CampaignTick | null;
}
export interface MaintenanceAgreement {
  readonly agreementId: string;
  readonly kind: 'FIELD_CAMP' | 'SAFE_SERVICE';
  readonly partyId: string;
  readonly location: AtLocation;
  readonly beneficiaryIds: readonly string[];
  /** Leaving ends only this person's coverage; a later return needs an accepted amendment. */
  readonly beneficiaryEnds: readonly {
    readonly characterId: string;
    readonly atTick: CampaignTick;
    readonly knownAtTick: CampaignTick | null;
  }[];
  readonly startedAt: CampaignTick;
  readonly endedAt: CampaignTick | null;
  /** Observation of the end can lag the private causal boundary. */
  readonly knownEndedAt: CampaignTick | null;
  readonly sourceId: string;
  readonly providerId: string | null;
  readonly termsVersion: string | null;
}
export interface FoodAccount {
  readonly membershipId: string;
  /** Sole record of actual demand, in person-ticks; not an inventory balance or an invoice paid. */
  readonly intervals: readonly {
    readonly fromTick: CampaignTick;
    readonly toTick: CampaignTick;
    readonly agreementId: string | null;
  }[];
}
export interface MaintenanceReceipt {
  readonly agreementId: string;
  readonly beneficiaryId: string;
  readonly fromTick: CampaignTick;
  readonly toTick: CampaignTick;
  readonly fulfillment: 'CURRENT_FOOD' | 'CURRENT_FOOD_LODGING_WAGE';
}
export interface StoryObligation {
  readonly obligationId: string;
  readonly recipient: OwnerRef;
  readonly amountQ: MoneyQ;
  readonly sourceId: string;
  readonly dueAt: null;
}
export interface CashMovement {
  readonly movementId: string;
  readonly from: string;
  readonly to: string;
  readonly amountQ: MoneyQ;
  readonly purpose:
    | 'ORIGIN_ENDOWMENT'
    | 'SIGNING'
    | 'WAGE'
    | 'TRANSFER'
    | 'FAREWELL'
    | 'CARE'
    | 'FOOD'
    | 'REPAIR';
  readonly atTick: CampaignTick;
}
export interface FarewellGrant {
  readonly membershipId: string;
  readonly amountQ: MoneyQ;
  readonly atTick: CampaignTick;
  readonly commandId: string;
}
/** Stored in the same snapshot/transaction as lifecycle. No second revision counter. */
export interface CompanyFinance {
  readonly schemaVersion: typeof ECONOMY_SCHEMA_VERSION;
  readonly policyVersion: typeof ECONOMY_POLICY_VERSION;
  readonly processedTick: CampaignTick;
  readonly wallets: readonly Wallet[];
  readonly pools: readonly FundingPool[];
  readonly accounts: readonly ServiceAccount[];
  readonly claims: readonly WageClaim[];
  readonly reservations: readonly MoneyReservation[];
  readonly epochs: readonly AllocationEpoch[];
  readonly arrears: readonly ArrearsEpisode[];
  readonly departures: readonly DepartureIntent[];
  readonly maintenance: readonly MaintenanceAgreement[];
  readonly maintenanceReceipts: readonly MaintenanceReceipt[];
  readonly food: readonly FoodAccount[];
  readonly obligations: readonly StoryObligation[];
  readonly movements: readonly CashMovement[];
  readonly farewells: readonly FarewellGrant[];
  readonly sourceEffects: readonly { readonly key: string; readonly requestKey: string }[];
  readonly applied: readonly EconomyReceipt[];
}
export interface CompanyEconomyState {
  readonly lifecycle: LifecycleState;
  readonly finance: CompanyFinance;
  /** Optional only for V1 persisted snapshots; every successful V2 preparation materializes it. */
  readonly physical?: CompanyPhysicalState;
}

interface FinanceScope {
  readonly id: string;
  readonly companyId: string;
  readonly worldId: string;
  readonly revision: CanonicalRevision;
  readonly sourceEventId: string;
  readonly atTick: CampaignTick;
}
/** A real, already resolved payroll agreement. Missing data never gets a guessed tariff/payee. */
export interface ServiceTermsEvidence extends FinanceScope {
  readonly kind: 'SERVICE_TERMS';
  readonly characterId: string;
  readonly poolId: string;
  readonly recipient: OwnerRef;
  readonly signingWalletId: string | null;
  readonly rates: readonly WageRate[];
}
export interface OpeningFundsEvidence extends FinanceScope {
  readonly kind: 'OPENING_FUNDS';
  readonly openingEvidenceId: string;
  readonly poolId: string;
  readonly amountQ: MoneyQ;
}
/** Authenticated physical access, not a client receipt or a claim that a transfer settled. */
export interface LocalMoneyAccess extends FinanceScope {
  readonly kind: 'LOCAL_MONEY_ACCESS';
  readonly operatorId: string;
  readonly location: AtLocation;
  readonly poolIds: readonly string[];
  readonly recipientWalletIds: readonly string[];
}
export interface CampSiteEvidence extends FinanceScope {
  readonly kind: 'CAMP_SITE';
  readonly partyId: string;
  readonly location: AtLocation;
  readonly stationary: boolean;
  readonly conflict: boolean;
}
export interface SafeServiceOffer extends FinanceScope {
  readonly kind: 'SAFE_SERVICE_OFFER';
  readonly partyId: string;
  readonly location: AtLocation;
  readonly providerId: string;
  readonly offerRevision: PublicRevision;
  readonly termsVersion: string;
  readonly expiresAt: CampaignTick;
  readonly permittedBeneficiaryIds: readonly string[];
  readonly safe: boolean;
  readonly inhabited: boolean;
  readonly accessible: boolean;
}
export interface QualificationNoticeEvidence extends FinanceScope {
  readonly kind: 'QUALIFICATION_NOTICE';
  readonly membershipId: string;
  readonly lifetimeLevel: number;
  readonly noticeVersion: string;
}
export interface WageCommunicationEvidence extends FinanceScope {
  readonly kind: 'WAGE_COMMUNICATION';
  readonly membershipId: string;
  readonly leaderId: string;
  readonly relation: {
    readonly friend: number;
    readonly respect: number;
    readonly rivalry: number;
  };
}
export interface FinancialDeathEvidence extends FinanceScope {
  readonly kind: 'FINANCIAL_DEATH';
  readonly characterId: string;
  readonly actualDeathTick: CampaignTick;
  /** An existing entitled recipient or the subject's unclaimed estate, never a new NPC. */
  readonly recipient: OwnerRef;
  readonly causeId: string;
  readonly custodyOutcomeId: string;
}
/** Same explicit causal boundary as the real world producer; does not implement that producer. */
export interface MaintenanceBoundaryEvidence extends FinanceScope {
  readonly kind: 'MAINTENANCE_BOUNDARY';
  readonly agreementId: string;
  readonly reason: 'MOVE' | 'ENCOUNTER' | 'INCOMPATIBLE_DUTY' | 'LAST_FIELD_WORKER_LOST';
}
export interface FarewellContextEvidence extends FinanceScope {
  readonly kind: 'FAREWELL_CONTEXT';
  readonly departureIntentId: string;
  readonly membershipId: string;
  readonly leaderId: string;
  readonly friendship: number;
}
/** Resolves a missing pool in an existing lifecycle duty requirement without inventing a purse. */
export interface PayrollBindingEvidence extends FinanceScope {
  readonly kind: 'PAYROLL_BINDING';
  readonly membershipId: string;
  readonly poolId: string;
}
export type FinanceEvidence =
  | ServiceTermsEvidence
  | PayrollBindingEvidence
  | OpeningFundsEvidence
  | LocalMoneyAccess
  | CampSiteEvidence
  | SafeServiceOffer
  | QualificationNoticeEvidence
  | WageCommunicationEvidence
  | FinancialDeathEvidence
  | MaintenanceBoundaryEvidence
  | FarewellContextEvidence;
/** Internal adapter data only. Authenticated command envelopes do not manufacture these facts. */
export interface EconomyContext extends LifecycleContext {
  readonly financeFacts: readonly FinanceEvidence[];
  readonly physicalFacts?: readonly PhysicalEvidence[];
}

/** Unmet obligations are finite data in this draft, not an effect framework or queue. */
export type EconomyRequirement =
  | {
      readonly kind: 'OPENING_NONFINANCIAL';
      readonly items: OpeningAssets['items'];
      readonly contactReaction: OpeningAssets['contactReaction'];
      readonly hookId: string;
    }
  | {
      readonly kind: 'RECRUIT_ITEMS';
      readonly membershipId: string;
      readonly itemIds: readonly string[];
    }
  | {
      readonly kind: 'CARE_HANDOVER';
      readonly characterId: string;
      readonly receiverId: string;
      readonly atTick: CampaignTick;
    }
  | {
      readonly kind: 'FOOD_CONSUMPTION';
      readonly membershipId: string;
      readonly fromTick: CampaignTick;
      readonly toTick: CampaignTick;
      readonly tickUnits: string;
    }
  | {
      readonly kind: 'PHYSICAL_DEPARTURE';
      readonly membershipId: string;
      readonly intentId: string;
      readonly atTick: CampaignTick;
      readonly returnContainerId: string;
      readonly careHandoverId: string | null;
    }
  | {
      readonly kind: 'OUTCOME_APPLICATION';
      readonly characterId: string;
      readonly actualDeathTick: CampaignTick;
      readonly sourceEventId: string;
      readonly custodyOutcomeId: string;
    }
  | {
      readonly kind: 'INFORMED_SOCIAL_CONTRIBUTION';
      readonly sourceId: string;
      readonly characterId: string;
      readonly cause: 'WAGE_COMPLAINT' | 'FINAL_WARNING' | 'FAREWELL';
    };
export interface EconomyReceipt {
  readonly commandId: string;
  readonly requestKey: string;
  readonly semanticKey: string;
  readonly sourceKey: string | null;
  readonly lifecycleReceipt: LifecycleReceipt | null;
  readonly events: readonly LifecycleEvent[];
  readonly requirements: readonly EconomyRequirement[];
  readonly allocations: readonly {
    readonly claimId: string;
    readonly amountQ: MoneyQ;
    readonly channel: 'CASH' | 'PENDING_CONFIRMATION';
  }[];
}
export type EconomyError = LifecycleError | PhysicalError | 'UNPAID_OBLIGATIONS';
export type EconomyResult =
  | { readonly kind: 'REJECTED'; readonly state: CompanyEconomyState; readonly error: EconomyError }
  | {
      readonly kind: 'PREPARED';
      readonly state: CompanyEconomyState;
      /** Inseparable lifecycle+finance+physical draft; there is no child commit boundary. */
      readonly next: CompanyEconomyState;
      readonly receipt: EconomyReceipt;
      readonly replayed: boolean;
    };
export type FinanceChange = {
  readonly finance: CompanyFinance;
  readonly requirements: readonly EconomyRequirement[];
  readonly allocations: EconomyReceipt['allocations'];
};
export type EconomyCommand = CompanyCommand;

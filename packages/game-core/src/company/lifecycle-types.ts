import type { CompanyCommand } from './commands.js';
import type { CompanyGuardError, TrustedCompanyContext } from './guards.js';
import type {
  CharacterIdentity,
  CharacterPresence,
  CompanyIdentity,
  LocationRef,
  Membership,
} from './model.js';
import type {
  CampaignTick,
  CanonicalRevision,
  CharacterId,
  CompanyId,
  MoneyQ,
  PublicRevision,
  WorldId,
} from './values.js';

export type AtLocation = Extract<LocationRef, { kind: 'AT' }>;
export interface LifecycleCharacter {
  readonly identity: CharacterIdentity;
  readonly presence: CharacterPresence;
  readonly skills: Readonly<Record<string, number>>;
  readonly aptitudeBySkill: Readonly<Record<string, number>>;
  readonly perks: readonly string[];
  readonly conditionIds: readonly string[];
}
export interface LifecycleCompany extends CompanyIdentity {
  readonly founderId: CharacterId;
  readonly name: string;
  readonly bannerId: string;
  readonly householdIds: readonly CharacterId[];
  readonly regencyHeirId: CharacterId | null;
  readonly runStatus: 'ACTIVE' | 'GAME_OVER';
  readonly chronicleIds: readonly string[];
}
export interface FieldParty {
  readonly partyId: string;
  readonly location: LocationRef;
}
export interface HeirBypass {
  readonly crisisId: string;
  readonly eventId: string;
  readonly heirId: CharacterId;
  readonly leaderId: CharacterId;
  readonly happenedAt: CampaignTick;
  readonly notification: null | {
    readonly learnedAt: CampaignTick;
    readonly respect: number;
    readonly rivalry: number;
    readonly contribution: { readonly respect: number; readonly rivalry: number };
    readonly departureIntent: null | {
      readonly id: string;
      readonly membershipId: string;
      readonly reason: 'CANONICAL_EVENT';
    };
  };
}
/** Observation snapshots may deliberately lag private facts. They are not live entity aliases. */
export interface LifecycleKnowledge {
  readonly revision: PublicRevision;
  readonly leaderId: CharacterId | null;
  readonly designatedHeirId: CharacterId | null;
  readonly runStatus: 'ACTIVE' | 'GAME_OVER' | 'UNKNOWN';
  readonly characters: readonly LifecycleCharacter[];
  readonly candidateIds: readonly CharacterId[];
  readonly eventIds: readonly string[];
}
export interface LifecycleState {
  readonly schemaVersion: 1;
  readonly worldId: WorldId;
  readonly companyId: CompanyId;
  readonly revision: CanonicalRevision;
  readonly campaignTick: CampaignTick;
  readonly company: LifecycleCompany | null;
  readonly characters: readonly LifecycleCharacter[];
  readonly memberships: readonly Membership[];
  readonly kinship: readonly {
    readonly from: CharacterId;
    readonly to: CharacterId;
    readonly kind: 'SIBLING';
  }[];
  readonly parties: readonly FieldParty[];
  readonly bypasses: readonly HeirBypass[];
  readonly knowledge: LifecycleKnowledge;
  readonly applied: readonly LifecycleReceipt[];
}

interface EvidenceScope {
  readonly id: string;
  readonly companyId: string;
  readonly worldId: string;
  readonly revision: CanonicalRevision;
  readonly sourceEventId: string;
  readonly atTick: CampaignTick;
}
export interface OpeningEvidence extends EvidenceScope {
  readonly kind: 'OPENING';
  readonly profileId: string;
  readonly originId: string;
  readonly familyStoryId: string;
  readonly cultureId: string;
  readonly location: AtLocation;
  readonly birthplaceIds: readonly string[];
  readonly leaderId: string;
  readonly partyId: string;
  readonly seed: number;
  readonly candidates: readonly {
    readonly characterId: string;
    readonly templateId: string;
    readonly name: string;
    readonly sex: string;
  }[];
  readonly relatives: readonly {
    readonly characterId: string;
    readonly name: string;
    readonly sex: string;
  }[];
  readonly contactId: string;
  readonly providerId: string;
}
export interface RecruitEvidence extends EvidenceScope {
  readonly kind: 'RECRUIT';
  readonly characterId: string;
  readonly basis: 'PAID' | 'FAMILY';
  readonly offerRevision: string;
  readonly expiresAt: CampaignTick;
  readonly signingQ: MoneyQ;
  readonly dailyWageMilli: string;
  readonly itemIds: readonly string[];
}
export interface MeetingEvidence extends EvidenceScope {
  readonly kind: 'MEETING';
  readonly characterId: string;
  readonly partyId: string;
  readonly location: AtLocation;
}
export interface ArrivalEvidence extends EvidenceScope {
  readonly kind: 'ARRIVAL';
  readonly characterId: string;
  readonly segmentId: string;
  readonly from: string;
  readonly location: AtLocation;
}
export interface DutyEvidence extends EvidenceScope {
  readonly kind: 'DUTY';
  readonly characterId: string;
  readonly assignment: CharacterPresence['assignment'];
  readonly location: AtLocation;
  readonly fundingPoolId: string;
  readonly handoverToId: string | null;
  readonly partyId: string | null;
}
export interface CrisisEvidence extends EvidenceScope {
  readonly kind: 'CRISIS';
  readonly leaderId: string;
  readonly reason: 'LEADER_DIED' | 'LEADER_UNAVAILABLE' | 'HEIR_MAJORITY';
}
export interface HeirNotificationEvidence extends EvidenceScope {
  readonly kind: 'HEIR_NOTIFICATION';
  readonly crisisId: string;
  readonly heirId: string;
  readonly leaderId: string;
  /** Actual directed relationship at first notification, resolved by the social adapter. */
  readonly relation: { readonly respect: number; readonly rivalry: number };
}
/** Adapter authorizes this lifecycle disclosure, including known service/kin eligibility; not an arbitrary witness fact. */
export interface CompanyObservationEvidence extends EvidenceScope {
  readonly kind: 'COMPANY_OBSERVATION';
  readonly subject: { readonly kind: 'CHARACTER' | 'COMPANY'; readonly id: string };
}
export type LifecycleEvidence =
  | CompanyObservationEvidence
  | OpeningEvidence
  | RecruitEvidence
  | MeetingEvidence
  | ArrivalEvidence
  | DutyEvidence
  | CrisisEvidence
  | HeirNotificationEvidence;
/** Internal, verified adapter facts. Never deserialize this context from a player message. */
export interface LifecycleContext extends TrustedCompanyContext {
  readonly atTick: CampaignTick;
  readonly completeGraph: boolean;
  readonly contactIds: readonly string[];
  readonly facts: readonly LifecycleEvidence[];
}
export interface OpeningAssets {
  readonly cashQ: MoneyQ;
  readonly serviceTerms: readonly {
    readonly membershipId: string;
    readonly dailyWageMilli: string;
  }[];
  readonly signingCharges: readonly { readonly characterId: string; readonly amountQ: MoneyQ }[];
  readonly items: readonly {
    readonly id: string;
    readonly definitionId: string;
    readonly quantity: number;
    readonly holderId: string;
    readonly ownerCompanyId: CompanyId;
  }[];
  readonly debt: null | { readonly recipientId: string; readonly amountQ: MoneyQ };
  readonly contactReaction: {
    readonly contactId: string;
    readonly respect: number;
    readonly rivalry: number;
  };
  readonly hookId: string;
}
/** Finite obligations for the later aggregate composition, not a background effect queue. */
export type LifecycleRequirement =
  | { readonly kind: 'OPENING_ASSETS'; readonly assets: OpeningAssets }
  | {
      readonly kind: 'RECRUIT_SETTLEMENT';
      readonly membershipId: string;
      readonly poolId: string;
      readonly signingQ: MoneyQ;
      readonly dailyWageMilli: string;
      readonly itemIds: readonly string[];
    }
  | {
      readonly kind: 'DUTY_SETTLEMENT';
      readonly characterId: string;
      readonly atTick: CampaignTick;
      readonly fundingPoolId: string | null;
      readonly handoverToId: string | null;
    }
  | {
      readonly kind: 'LEADERSHIP_SETTLEMENT';
      readonly previousId: string;
      readonly nextId: string | null;
      readonly atTick: CampaignTick;
      readonly permanent: boolean;
    };
export interface LifecycleEvent {
  readonly id: string;
  readonly type: string;
  readonly atTick: CampaignTick;
  readonly subjectIds: readonly string[];
}
export interface LifecycleReceipt {
  readonly commandId: string;
  readonly requestKey: string;
  readonly sourceKey: string | null;
  readonly semanticKey: string;
  readonly events: readonly LifecycleEvent[];
  readonly requirements: readonly LifecycleRequirement[];
}
export type LifecycleError =
  | CompanyGuardError
  | 'INCOMPLETE_GRAPH'
  | 'INVALID_STATE'
  | 'INVALID_TIME'
  | 'STALE_REVISION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CONTACT_OR_ACCESS_REQUIRED'
  | 'INCOMPATIBLE_ACTIVITY'
  | 'CAPACITY'
  | 'CANDIDATE_REQUIRED'
  | 'TERMINAL'
  | 'UNSUPPORTED_ACTION';
export type LifecycleResult =
  | { readonly kind: 'REJECTED'; readonly state: LifecycleState; readonly error: LifecycleError }
  | {
      readonly kind: 'PREPARED';
      readonly state: LifecycleState;
      readonly next: LifecycleState;
      readonly receipt: LifecycleReceipt;
      readonly replayed: boolean;
    };
export type LifecycleChange = {
  readonly next: LifecycleState;
  readonly events: readonly LifecycleEvent[];
  readonly requirements: readonly LifecycleRequirement[];
};
export type CommandOf<K extends CompanyCommand['type']> = Extract<CompanyCommand, { type: K }>;

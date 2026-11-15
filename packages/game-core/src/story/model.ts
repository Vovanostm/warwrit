export const STORY_MISSION_ID = 'sm.m1.cache-disclosure.01' as const;
export const STORY_DEFINITION_VERSION = 1 as const;
export const STORY_PLACE_ID = 'severny-dvor-yard' as const;

export type StorySceneId = 'S00' | 'S01' | 'S02' | 'S03' | 'S04' | 'S06' | 'S07' | 'S08' | 'LATE';
export type StoryActorId = 'KONDRAT' | 'SENKA' | 'ULITA';
export type StoryFactId =
  'F01' | 'F02' | 'F03' | 'F04' | 'F05' | 'F06' | 'F07' | 'F08' | 'F09' | 'F10' | 'F11';
export type StoryEndingId = 'E01' | 'E02' | 'E03';

export interface StoryFact {
  readonly factId: StoryFactId;
  readonly source:
    | { readonly kind: 'ACTOR'; readonly actorId: StoryActorId }
    | { readonly kind: 'OBSERVED'; readonly objectId: 'PATCHED_SACK' | 'PAYMENT_RECEIPTS' };
  readonly sceneId: Exclude<StorySceneId, 'LATE'>;
  readonly choiceId: string;
  readonly sourceEventId: string;
  readonly learnedAtTick: string;
  readonly historicalTiming?:
    'PETRUS_RETURNED_NIGHT_AFTER_SENKA' | 'SACK_PRESENT_ON_SENKA_RETURN_DAY_BEFORE_PETRUS';
}

export interface StoryEligibilitySource {
  readonly contractId: 'ci.m1.mill-worker.01';
  readonly companyId: string;
  readonly sourceEventId: string;
  readonly deliveredAtTick: string;
  /** Exact for new receipts; legacy sources may use a conservative full-cycle proof. */
  readonly availableAtTick: string;
  readonly availabilityBasis?: 'EXACT_SIMULATION_TIME' | 'LEGACY_FULL_CYCLE_ELAPSED';
}

export interface StoryPublicConsequences {
  readonly senka: 'STAYS_AT_BARN' | 'DISMISSED' | 'LEAVES_VOLUNTARILY';
  readonly kondratTrust: 'UNCHANGED' | 'LOSES_TRUST_IN_SENKA' | 'LOSES_TRUST_IN_FINISHING_COMPANY';
  readonly ulitaGrainWork: 'ENDS' | 'UNCHANGED';
}

export interface StoryOutcome {
  readonly endingId: StoryEndingId;
  readonly accusedActor: StoryActorId;
  readonly proven: boolean;
  readonly finishingCompanyId: string;
  readonly sourceEventId: string;
  readonly atTick: string;
  readonly publicConsequences: StoryPublicConsequences;
}

export interface StoryWorldState {
  readonly version: 1;
  readonly missionId: typeof STORY_MISSION_ID;
  readonly definitionVersion: typeof STORY_DEFINITION_VERSION;
  readonly revision: string;
  readonly eligibilitySource: StoryEligibilitySource;
  readonly outcome: StoryOutcome | null;
}

export interface StoryCompanyState {
  readonly version: 1;
  readonly missionId: typeof STORY_MISSION_ID;
  readonly definitionVersion: typeof STORY_DEFINITION_VERSION;
  readonly companyId: string;
  readonly revision: string;
  readonly status: 'OFFERED' | 'ACCEPTED' | 'COMPLETED';
  readonly currentSceneId: StorySceneId;
  readonly pendingAccusation: { readonly actorId: StoryActorId; readonly proven: boolean } | null;
  readonly receiptsInspected: boolean;
  readonly cacheReasonAsked: boolean;
  readonly metActors: readonly StoryActorId[];
  readonly facts: readonly StoryFact[];
}

export type StoryChoiceId =
  | 'accept'
  | 'defer'
  | 'to-kondrat'
  | 'to-senka'
  | 'to-ulita'
  | 'ask-sacks'
  | 'ask-tax'
  | 'inspect-receipts'
  | 'compare-receipts'
  | 'ask-guard'
  | 'ask-bread'
  | 'ask-son'
  | 'inspect-sack'
  | 'ask-sack-origin'
  | 'ask-where-grain'
  | 'ask-why-cache'
  | 'ask-senka-sack'
  | 'confront-ulita'
  | 'open-confrontation'
  | 'open-accusation'
  | 'accuse-ulita'
  | 'accuse-senka'
  | 'accuse-kondrat'
  | 'wait'
  | 'confirm'
  | 'back';

export type StoryCommand =
  | { readonly type: 'ACCEPT' | 'DEFER' }
  | { readonly type: 'CHOOSE'; readonly choiceId: StoryChoiceId }
  | { readonly type: 'CONFIRM' }
  | { readonly type: 'RETURN' };

export interface StoryCommandContext {
  readonly companyId: string;
  readonly standingPlaceId: string | null;
  readonly atTick: string;
  readonly expectedWorldRevision: string;
  readonly expectedCompanyRevision: string;
  readonly sourceEventId: string;
}

export type StoryRejection =
  | 'WRONG_PLACE'
  | 'NOT_AVAILABLE'
  | 'NOT_ACCEPTED'
  | 'MISSING_FACT'
  | 'NOT_MET'
  | 'NO_PENDING_ACCUSATION'
  | 'STALE_REVISION'
  | 'NOT_ELIGIBLE'
  | 'ALREADY_COMPLETED';

export type StoryPreparation =
  | {
      readonly kind: 'PREPARED';
      readonly world: StoryWorldState;
      readonly company: StoryCompanyState;
      readonly payoutEligibility: null | {
        readonly companyId: string;
        readonly rewardQ: '40000000';
        readonly policy: 'TRUSTED_ISSUER_DEBIT_AND_COMPANY_CREDIT_IN_ONE_TRANSACTION';
      };
    }
  | { readonly kind: 'REJECTED'; readonly code: StoryRejection };

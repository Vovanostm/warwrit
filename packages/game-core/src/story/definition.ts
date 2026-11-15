import type { StoryActorId, StoryFactId, StorySceneId } from './model.js';

export interface StoryFindingDefinition {
  readonly factId: StoryFactId;
  readonly kind: 'OBSERVATION' | 'TESTIMONY';
  readonly source:
    | { readonly kind: 'ACTOR'; readonly actorId: StoryActorId }
    | { readonly kind: 'OBSERVED'; readonly objectId: 'PATCHED_SACK' | 'PAYMENT_RECEIPTS' };
  readonly producedBy: {
    readonly sceneId: Exclude<StorySceneId, 'LATE'>;
    readonly choiceId: string;
  };
  readonly requires: readonly StoryFactId[];
  readonly historicalTiming?:
    'PETRUS_RETURNED_NIGHT_AFTER_SENKA' | 'SACK_PRESENT_ON_SENKA_RETURN_DAY_BEFORE_PETRUS';
}

export interface StorySceneDefinition {
  readonly sceneId: StorySceneId;
  readonly placeId: string;
  readonly speakerId: StoryActorId;
  readonly lineIds: readonly string[];
  readonly choiceIds: readonly string[];
  readonly requiredFacts: readonly StoryFactId[];
}

export interface StoryEndingDefinition {
  readonly endingId: 'E01' | 'E02' | 'E03';
  readonly accusedActor: StoryActorId;
  readonly proven: boolean;
  readonly publicConsequences: {
    readonly senka: 'STAYS_AT_BARN' | 'DISMISSED' | 'LEAVES_VOLUNTARILY';
    readonly kondratTrust:
      'UNCHANGED' | 'LOSES_TRUST_IN_SENKA' | 'LOSES_TRUST_IN_FINISHING_COMPANY';
    readonly ulitaGrainWork: 'ENDS' | 'UNCHANGED';
  };
  readonly payout: null | {
    readonly rewardQ: '40000000';
    readonly policy: 'TRUSTED_ISSUER_DEBIT_AND_COMPANY_CREDIT_IN_ONE_TRANSACTION';
  };
}

export interface StoryDefinition {
  readonly id: 'sm.m1.cache-disclosure.01';
  readonly version: 1;
  /** Authoring/validation truth. Never include this object in a client projection. */
  readonly truth: {
    readonly discloser: 'ULITA';
    readonly beneficiary: 'OBUKH';
    readonly bargain: 'PROMISE_TO_RELEASE_PETRUS';
    readonly grainTaken: true;
    readonly petrusRetained: true;
    readonly sackLeftAsMockPayment: true;
    readonly petrusEscapedWounded: true;
    readonly kondratTaxClaimFalse: true;
    readonly senkaBreadTripLie: true;
  };
  readonly findings: readonly StoryFindingDefinition[];
  readonly scenes: readonly StorySceneDefinition[];
  readonly outcomes: readonly StoryEndingDefinition[];
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

const actor = (actorId: StoryActorId) => ({ kind: 'ACTOR' as const, actorId });
const observed = { kind: 'OBSERVED' as const, objectId: 'PATCHED_SACK' as const };
const receipts = { kind: 'OBSERVED' as const, objectId: 'PAYMENT_RECEIPTS' as const };

/** Finite mechanics and canonical knowledge sources for the approved revision-6 manuscript. */
export const CACHE_DISCLOSURE_STORY: StoryDefinition = freeze({
  id: 'sm.m1.cache-disclosure.01',
  version: 1,
  truth: {
    discloser: 'ULITA',
    beneficiary: 'OBUKH',
    bargain: 'PROMISE_TO_RELEASE_PETRUS',
    grainTaken: true,
    petrusRetained: true,
    sackLeftAsMockPayment: true,
    petrusEscapedWounded: true,
    kondratTaxClaimFalse: true,
    senkaBreadTripLie: true,
  },
  findings: [
    {
      factId: 'F01',
      kind: 'TESTIMONY',
      source: actor('KONDRAT'),
      producedBy: { sceneId: 'S01', choiceId: 'ask-sacks' },
      requires: [],
    },
    {
      factId: 'F02',
      kind: 'TESTIMONY',
      source: actor('KONDRAT'),
      producedBy: { sceneId: 'S01', choiceId: 'ask-tax' },
      requires: [],
    },
    {
      factId: 'F03',
      kind: 'OBSERVATION',
      source: receipts,
      producedBy: { sceneId: 'S01', choiceId: 'compare-receipts' },
      requires: ['F02'],
    },
    {
      factId: 'F04',
      kind: 'TESTIMONY',
      source: actor('SENKA'),
      producedBy: { sceneId: 'S02', choiceId: 'ask-guard' },
      requires: [],
    },
    {
      factId: 'F05',
      kind: 'TESTIMONY',
      source: actor('SENKA'),
      producedBy: { sceneId: 'S02', choiceId: 'ask-bread' },
      requires: ['F04'],
    },
    {
      factId: 'F06',
      kind: 'TESTIMONY',
      source: actor('ULITA'),
      producedBy: { sceneId: 'S03', choiceId: 'ask-son' },
      requires: [],
      historicalTiming: 'PETRUS_RETURNED_NIGHT_AFTER_SENKA',
    },
    {
      factId: 'F07',
      kind: 'OBSERVATION',
      source: observed,
      producedBy: { sceneId: 'S03', choiceId: 'inspect-sack' },
      requires: ['F01'],
    },
    {
      factId: 'F08',
      kind: 'TESTIMONY',
      source: actor('ULITA'),
      producedBy: { sceneId: 'S03', choiceId: 'ask-sack-origin' },
      requires: ['F07'],
    },
    {
      factId: 'F09',
      kind: 'TESTIMONY',
      source: actor('SENKA'),
      producedBy: { sceneId: 'S04', choiceId: 'ask-senka-sack' },
      requires: ['F08'],
      historicalTiming: 'SACK_PRESENT_ON_SENKA_RETURN_DAY_BEFORE_PETRUS',
    },
    {
      factId: 'F10',
      kind: 'TESTIMONY',
      source: actor('ULITA'),
      producedBy: { sceneId: 'S06', choiceId: 'confront-ulita' },
      requires: ['F01', 'F06', 'F07', 'F08', 'F09'],
    },
    {
      factId: 'F11',
      kind: 'TESTIMONY',
      source: actor('ULITA'),
      producedBy: { sceneId: 'S06', choiceId: 'ask-where-grain' },
      requires: ['F10'],
    },
  ],
  outcomes: [
    {
      endingId: 'E01',
      accusedActor: 'ULITA',
      proven: true,
      publicConsequences: {
        senka: 'STAYS_AT_BARN',
        kondratTrust: 'UNCHANGED',
        ulitaGrainWork: 'ENDS',
      },
      payout: {
        rewardQ: '40000000',
        policy: 'TRUSTED_ISSUER_DEBIT_AND_COMPANY_CREDIT_IN_ONE_TRANSACTION',
      },
    },
    {
      endingId: 'E02',
      accusedActor: 'SENKA',
      proven: false,
      publicConsequences: {
        senka: 'DISMISSED',
        kondratTrust: 'LOSES_TRUST_IN_SENKA',
        ulitaGrainWork: 'UNCHANGED',
      },
      payout: null,
    },
    {
      endingId: 'E03',
      accusedActor: 'KONDRAT',
      proven: false,
      publicConsequences: {
        senka: 'LEAVES_VOLUNTARILY',
        kondratTrust: 'LOSES_TRUST_IN_FINISHING_COMPANY',
        ulitaGrainWork: 'UNCHANGED',
      },
      payout: null,
    },
  ],
  scenes: [
    {
      sceneId: 'S00',
      placeId: 'severny-dvor-yard',
      speakerId: 'KONDRAT',
      lineIds: [
        'title',
        'brief',
        '01',
        '02-rescuers',
        '02-others',
        '03',
        '04',
        '05',
        '06',
        '07',
        'accept',
        'later',
        'reward',
      ],
      choiceIds: ['accept', 'defer', 'to-kondrat'],
      requiredFacts: [],
    },
    {
      sceneId: 'S01',
      placeId: 'severny-dvor-yard',
      speakerId: 'KONDRAT',
      lineIds: ['sacks', '01', '02', 'tax', '03', 'inspect', '04', 'compare', '05', 'next'],
      choiceIds: [
        'ask-sacks',
        'ask-tax',
        'inspect-receipts',
        'compare-receipts',
        'to-senka',
        'to-ulita',
        'open-accusation',
      ],
      requiredFacts: [],
    },
    {
      sceneId: 'S02',
      placeId: 'severny-dvor-yard',
      speakerId: 'SENKA',
      lineIds: ['guard', '01', 'food', '02', '03', 'work', '04', 'next'],
      choiceIds: ['ask-guard', 'ask-bread', 'ask-senka-sack', 'to-kondrat', 'to-ulita'],
      requiredFacts: [],
    },
    {
      sceneId: 'S03',
      placeId: 'severny-dvor-yard',
      speakerId: 'ULITA',
      lineIds: [
        '01',
        'enter',
        '02',
        '02-sound',
        'who',
        '02-son',
        'son',
        '03',
        'inspect',
        '04',
        'sack',
        '05',
        'grain',
        '06',
        'next',
      ],
      choiceIds: [
        'ask-son',
        'inspect-sack',
        'ask-sack-origin',
        'ask-why-cache',
        'ask-senka-sack',
        'open-confrontation',
        'to-kondrat',
        'to-senka',
      ],
      requiredFacts: [],
    },
    {
      sceneId: 'S04',
      placeId: 'severny-dvor-yard',
      speakerId: 'SENKA',
      lineIds: ['ask', '01', '02', '03', 'next'],
      choiceIds: ['ask-senka-sack', 'open-confrontation', 'to-ulita', 'to-kondrat'],
      requiredFacts: ['F08'],
    },
    {
      sceneId: 'S06',
      placeId: 'severny-dvor-yard',
      speakerId: 'ULITA',
      lineIds: ['compare', '01', '02', 'ask', '03', '04', '05', 'next'],
      choiceIds: ['confront-ulita', 'ask-where-grain', 'to-kondrat', 'open-accusation'],
      requiredFacts: ['F01', 'F06', 'F07', 'F08', 'F09'],
    },
    {
      sceneId: 'S07',
      placeId: 'severny-dvor-yard',
      speakerId: 'KONDRAT',
      lineIds: [
        '01',
        'ulita',
        'proof',
        'senka',
        'kondrat',
        'wait',
        'warn-senka',
        'warn-kondrat',
        'commit',
        'back',
        'warn-proof',
        'commit-proof',
      ],
      choiceIds: ['accuse-ulita', 'accuse-senka', 'accuse-kondrat', 'wait', 'back'],
      requiredFacts: [],
    },
    {
      sceneId: 'S08',
      placeId: 'severny-dvor-yard',
      speakerId: 'KONDRAT',
      lineIds: [
        '01',
        '02',
        '03-no-sack',
        '04-no-sack',
        '03-sack',
        '03-before-son',
        '03-obukh',
        '04-clue',
        'next',
      ],
      choiceIds: ['to-kondrat'],
      requiredFacts: [],
    },
    {
      sceneId: 'LATE',
      placeId: 'severny-dvor-yard',
      speakerId: 'KONDRAT',
      lineIds: ['L-E01', 'L-E02', 'L-E03', 'journal-E01', 'journal-E02', 'journal-E03', 'moved'],
      choiceIds: [],
      requiredFacts: [],
    },
  ],
});

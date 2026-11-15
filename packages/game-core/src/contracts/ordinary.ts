/**
 * Ordinary M1 contracts (owner decision 2026-10-02, CONTRACTS_M1_DERIVATIVE "ordinary contract
 * working profile"): investigations and rescues whose facts come only from commands taken by a
 * company standing at the named place. FIRST HUNT keeps its own runtime; the two other hunts
 * are encounter contracts and are not steps here.
 */

export type OrdinaryContractInstanceId =
  | 'ci.m1.road-tracks.01'
  | 'ci.m1.missing-herbs.01'
  | 'ci.m1.cellar-rescue.01'
  | 'ci.m1.lost-scout.01'
  | 'ci.m1.mill-worker.01'
  | 'ci.m1.light-sack.01'
  | 'ci.m1.two-receipts.01'
  | 'ci.m1.empty-watch-record.01'
  | 'ci.m1.tracks-over-tracks.01';

export interface ContractPlace {
  readonly siteId: string;
  readonly areaId: string;
}

/** World conditions a step needs, read by the adapter from authoritative world state. */
export type OrdinaryStepGate = 'DAYLIGHT' | 'RAIDERS_DEFEATED' | 'BEAST_DEFEATED';

export interface OrdinaryStepDefinition {
  readonly stepId: string;
  readonly action: 'INSPECT' | 'ASK' | 'SEARCH' | 'RELEASE' | 'REPORT' | 'DELIVER';
  readonly place: ContractPlace;
  /** Source slots the acting company must already hold. */
  readonly requires: readonly string[];
  /** Source slots that make this step unavailable to the acting company. */
  readonly forbids?: readonly string[];
  readonly gates: readonly OrdinaryStepGate[];
  /** Source slots this step records for the acting company. */
  readonly produces: readonly string[];
  /** Localized result shown only after this company records the observation. */
  readonly resultTextKey?: string;
  /** A person who travels with the acting company from now on. */
  readonly takesCustodyOf?: string;
  /** Needs the acting company to hold this person; ends custody. */
  readonly needsCustodyOf?: string;
  /** Completes the contract. By default the full reward is paid to the acting company. */
  readonly completes?: true;
  /** A terminal finding may close the contract without paying its advertised full reward. */
  readonly payoutPolicy?: 'FULL_REWARD' | 'NO_PAYOUT';
}

export interface OrdinaryContractProfile {
  readonly instanceId: OrdinaryContractInstanceId;
  readonly definitionId: string;
  readonly template: 'INVESTIGATE' | 'RESCUE';
  readonly issuerRoleId: string;
  readonly issuerPlace: ContractPlace;
  readonly walletId: string;
  readonly genesisWalletQ: string;
  readonly rewardQ: string;
  /** Slot recorded for the owner when it accepts, if the contract has one. */
  readonly acceptanceSlot?: string;
  readonly steps: readonly OrdinaryStepDefinition[];
}

/** The accepted copy of an ordinary offer; profile IDs are immutable contract versions. */
export interface OrdinaryContractTerms {
  readonly profileId: string;
  readonly template: OrdinaryContractProfile['template'];
  readonly issuerRoleId: string;
  readonly issuerPlace: ContractPlace;
  readonly rewardQ: string;
  readonly walletId: string;
  readonly acceptanceSlot?: string;
  readonly steps: readonly OrdinaryStepDefinition[];
}

const place = (siteId: string, areaId: string): ContractPlace => ({ siteId, areaId });
const KAMENNY_BROD = place('kamenny-brod', 'kamenny-brod-market');
const BEREZNYAK = place('bereznyak', 'bereznyak-green');
const TIKHAYA_GAT = place('tikhaya-gat', 'tikhaya-gat-bank');
const SEVERNY_DVOR = place('severny-dvor', 'severny-dvor-yard');
const MILL_YARD = place('staraya-melnitsa', 'staraya-melnitsa-yard');
const CROWNS = (crowns: number) => `${crowns}000000`;

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

export const ORDINARY_CONTRACT_PROFILES: readonly OrdinaryContractProfile[] = freeze([
  {
    instanceId: 'ci.m1.road-tracks.01',
    definitionId: 'ct.m1.road-tracks.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'city-notice-clerk',
    issuerPlace: KAMENNY_BROD,
    walletId: 'wallet.notice-clerk.kamenny-brod.01',
    genesisWalletQ: CROWNS(80),
    rewardQ: CROWNS(40),
    steps: [
      {
        stepId: 'inspect-bank',
        action: 'INSPECT',
        place: TIKHAYA_GAT,
        requires: [],
        gates: [],
        produces: ['road-tracks-observation'],
      },
      {
        stepId: 'report',
        action: 'REPORT',
        place: KAMENNY_BROD,
        requires: ['road-tracks-observation'],
        gates: [],
        produces: ['road-tracks-report'],
        completes: true,
      },
    ],
  },
  {
    instanceId: 'ci.m1.missing-herbs.01',
    definitionId: 'ct.m1.missing-herbs.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'village-provisioner',
    issuerPlace: BEREZNYAK,
    walletId: 'wallet.provisioner.bereznyak.01',
    genesisWalletQ: CROWNS(80),
    rewardQ: CROWNS(40),
    steps: [
      {
        stepId: 'stock-record',
        action: 'ASK',
        place: BEREZNYAK,
        requires: [],
        gates: [],
        produces: ['missing-herbs-stock-record'],
      },
      {
        stepId: 'inspect-green',
        action: 'INSPECT',
        place: BEREZNYAK,
        requires: ['missing-herbs-stock-record'],
        gates: ['DAYLIGHT'],
        produces: ['missing-herbs-trail-observation'],
      },
      {
        stepId: 'report',
        action: 'REPORT',
        place: BEREZNYAK,
        requires: ['missing-herbs-stock-record', 'missing-herbs-trail-observation'],
        gates: [],
        produces: ['missing-herbs-report'],
        completes: true,
      },
    ],
  },
  {
    instanceId: 'ci.m1.cellar-rescue.01',
    definitionId: 'ct.m1.cellar-rescue.v1',
    template: 'RESCUE',
    issuerRoleId: 'river-village-caller',
    issuerPlace: TIKHAYA_GAT,
    walletId: 'wallet.river-caller.tikhaya-gat.01',
    genesisWalletQ: CROWNS(160),
    rewardQ: CROWNS(80),
    steps: [
      {
        stepId: 'release',
        action: 'RELEASE',
        place: MILL_YARD,
        requires: [],
        gates: ['RAIDERS_DEFEATED'],
        produces: ['cellar-captive-source', 'cellar-captive-living-release'],
        takesCustodyOf: 'person.cellar-captive.01',
      },
      {
        stepId: 'deliver',
        action: 'DELIVER',
        place: TIKHAYA_GAT,
        requires: ['cellar-captive-living-release'],
        gates: [],
        produces: ['cellar-captive-delivery'],
        needsCustodyOf: 'person.cellar-captive.01',
        completes: true,
      },
    ],
  },
  {
    instanceId: 'ci.m1.lost-scout.01',
    definitionId: 'ct.m1.lost-scout.v1',
    template: 'RESCUE',
    issuerRoleId: 'city-watch-contact',
    issuerPlace: KAMENNY_BROD,
    walletId: 'wallet.city-watch-scouts.kamenny-brod.01',
    genesisWalletQ: CROWNS(160),
    rewardQ: CROWNS(80),
    steps: [
      {
        stepId: 'search',
        action: 'SEARCH',
        place: TIKHAYA_GAT,
        requires: [],
        gates: [],
        produces: [
          'lost-scout-source',
          'lost-scout-lawful-discovery',
          'lost-scout-living-recovery',
        ],
        takesCustodyOf: 'person.lost-scout.01',
      },
      {
        stepId: 'deliver',
        action: 'DELIVER',
        place: KAMENNY_BROD,
        requires: ['lost-scout-living-recovery'],
        gates: [],
        produces: ['lost-scout-delivery'],
        needsCustodyOf: 'person.lost-scout.01',
        completes: true,
      },
    ],
  },
  {
    instanceId: 'ci.m1.mill-worker.01',
    definitionId: 'ct.m1.mill-worker.v1',
    template: 'RESCUE',
    issuerRoleId: 'local-village-steward',
    issuerPlace: SEVERNY_DVOR,
    walletId: 'wallet.steward.severny-dvor.01',
    genesisWalletQ: CROWNS(160),
    rewardQ: CROWNS(80),
    acceptanceSlot: 'mill-worker-contract-acceptance',
    steps: [
      {
        stepId: 'inspect-yard',
        action: 'INSPECT',
        place: MILL_YARD,
        requires: [],
        gates: [],
        produces: ['mill-worker-grain-cart-observation'],
      },
      {
        stepId: 'ask-keeper',
        action: 'ASK',
        place: TIKHAYA_GAT,
        requires: [],
        gates: [],
        produces: ['mill-worker-human-report'],
      },
      {
        stepId: 'release',
        action: 'RELEASE',
        place: MILL_YARD,
        requires: ['mill-worker-grain-cart-observation', 'mill-worker-human-report'],
        gates: ['BEAST_DEFEATED'],
        produces: ['mill-worker-person-source', 'mill-worker-living-release'],
        takesCustodyOf: 'person.mill-worker.01',
      },
      {
        stepId: 'deliver',
        action: 'DELIVER',
        place: SEVERNY_DVOR,
        requires: [
          'mill-worker-grain-cart-observation',
          'mill-worker-human-report',
          'mill-worker-living-release',
        ],
        gates: [],
        produces: ['mill-worker-delivery'],
        needsCustodyOf: 'person.mill-worker.01',
        completes: true,
      },
    ],
  },
  {
    instanceId: 'ci.m1.empty-watch-record.01',
    definitionId: 'ct.m1.empty-watch-record.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'city-notice-clerk',
    issuerPlace: KAMENNY_BROD,
    walletId: 'wallet.city-treasury.kamenny-brod.01',
    genesisWalletQ: CROWNS(130),
    rewardQ: CROWNS(65),
    steps: [
      {
        stepId: 'read-watch-log',
        action: 'INSPECT',
        place: KAMENNY_BROD,
        requires: [],
        gates: [],
        produces: ['empty-watch-log'],
        resultTextKey: 'empty-watch-record.watch-log',
      },
      {
        stepId: 'ask-bridge-watchman',
        action: 'ASK',
        place: KAMENNY_BROD,
        requires: ['empty-watch-log'],
        gates: [],
        produces: ['empty-watch-bridge-witness'],
        resultTextKey: 'empty-watch-record.bridge-witness',
      },
      {
        stepId: 'find-camp',
        action: 'SEARCH',
        place: KAMENNY_BROD,
        requires: ['empty-watch-bridge-witness'],
        gates: [],
        produces: ['empty-watch-refugee-camp'],
        resultTextKey: 'empty-watch-record.refugee-camp',
      },
      {
        stepId: 'inspect-sack',
        action: 'INSPECT',
        place: KAMENNY_BROD,
        requires: ['empty-watch-refugee-camp'],
        gates: [],
        produces: ['empty-watch-city-marked-sack'],
        resultTextKey: 'empty-watch-record.city-marked-sack',
      },
      {
        stepId: 'ask-prokop',
        action: 'ASK',
        place: KAMENNY_BROD,
        requires: ['empty-watch-city-marked-sack'],
        gates: [],
        produces: ['empty-watch-prokop-confession'],
        resultTextKey: 'empty-watch-record.prokop-confession',
      },
      {
        stepId: 'hand-sack-to-evsey',
        action: 'REPORT',
        place: KAMENNY_BROD,
        requires: ['empty-watch-city-marked-sack', 'empty-watch-prokop-confession'],
        gates: [],
        produces: ['empty-watch-sack-handed-over'],
        resultTextKey: 'empty-watch-record.sack-handed-over',
        completes: true,
      },
      {
        stepId: 'throw-sack-in-river',
        action: 'REPORT',
        place: KAMENNY_BROD,
        requires: ['empty-watch-city-marked-sack', 'empty-watch-prokop-confession'],
        gates: [],
        produces: ['empty-watch-proof-destroyed', 'empty-watch-old-ford-revealed'],
        resultTextKey: 'empty-watch-record.proof-destroyed',
        completes: true,
        payoutPolicy: 'NO_PAYOUT',
      },
    ],
  },
  {
    instanceId: 'ci.m1.tracks-over-tracks.01',
    definitionId: 'ct.m1.tracks-over-tracks.kosars.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'city-watch-contact',
    issuerPlace: KAMENNY_BROD,
    walletId: 'wallet.city-watch.gordey-lapa.kamenny-brod.01',
    genesisWalletQ: CROWNS(40),
    rewardQ: CROWNS(40),
    steps: [
      {
        stepId: 'follow-mowers',
        action: 'SEARCH',
        place: BEREZNYAK,
        requires: [],
        gates: [],
        produces: ['tracks-over-tracks-kosars-fresh-traces'],
        resultTextKey: 'tracks-over-tracks.kosars-fresh-traces',
      },
      {
        stepId: 'inspect-old-stand',
        action: 'INSPECT',
        place: TIKHAYA_GAT,
        requires: [],
        gates: [],
        produces: ['tracks-over-tracks-kosars-old-stand'],
        resultTextKey: 'tracks-over-tracks.old-stand',
      },
      {
        stepId: 'report-tracks',
        action: 'REPORT',
        place: KAMENNY_BROD,
        requires: ['tracks-over-tracks-kosars-fresh-traces'],
        gates: [],
        produces: ['tracks-over-tracks-kosars-report'],
        resultTextKey: 'tracks-over-tracks.kosars-report',
        completes: true,
      },
      {
        stepId: 'report-no-findings',
        action: 'REPORT',
        place: KAMENNY_BROD,
        requires: ['tracks-over-tracks-kosars-old-stand'],
        forbids: ['tracks-over-tracks-kosars-fresh-traces'],
        gates: [],
        produces: ['tracks-over-tracks-kosars-no-findings'],
        resultTextKey: 'tracks-over-tracks.no-findings',
        completes: true,
        payoutPolicy: 'NO_PAYOUT',
      },
    ],
  },
  {
    instanceId: 'ci.m1.two-receipts.01',
    definitionId: 'ct.m1.two-receipts.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'woodland-village-caller',
    issuerPlace: BEREZNYAK,
    walletId: 'wallet.tikhon-bortnik.bereznyak.01',
    genesisWalletQ: CROWNS(120),
    rewardQ: CROWNS(60),
    steps: [
      {
        stepId: 'inspect-receipt',
        action: 'INSPECT',
        place: BEREZNYAK,
        requires: [],
        gates: [],
        produces: ['two-receipts-smudged-seal'],
        resultTextKey: 'two-receipts.smudged-seal',
      },
      {
        stepId: 'ask-ledger',
        action: 'ASK',
        place: KAMENNY_BROD,
        requires: ['two-receipts-smudged-seal'],
        gates: [],
        produces: ['two-receipts-empty-ledger'],
        resultTextKey: 'two-receipts.empty-ledger',
      },
      {
        stepId: 'ask-gordey',
        action: 'ASK',
        place: KAMENNY_BROD,
        requires: ['two-receipts-empty-ledger'],
        gates: [],
        produces: ['two-receipts-stolen-badge'],
        resultTextKey: 'two-receipts.stolen-badge',
      },
      {
        stepId: 'report-tikhon',
        action: 'REPORT',
        place: BEREZNYAK,
        requires: [
          'two-receipts-smudged-seal',
          'two-receipts-empty-ledger',
          'two-receipts-stolen-badge',
        ],
        gates: [],
        produces: ['two-receipts-reported-to-tikhon'],
        resultTextKey: 'two-receipts.tikhon-only',
        completes: true,
      },
      {
        stepId: 'report-both',
        action: 'REPORT',
        place: BEREZNYAK,
        requires: [
          'two-receipts-smudged-seal',
          'two-receipts-empty-ledger',
          'two-receipts-stolen-badge',
        ],
        gates: [],
        produces: ['two-receipts-reported-to-both'],
        resultTextKey: 'two-receipts.tikhon-and-collector',
        completes: true,
      },
    ],
  },
  {
    instanceId: 'ci.m1.light-sack.01',
    definitionId: 'ct.m1.light-sack.measure-error.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'city-granary-clerk',
    issuerPlace: KAMENNY_BROD,
    walletId: 'wallet.nil-bezmen.kamenny-brod.01',
    genesisWalletQ: CROWNS(80),
    rewardQ: CROWNS(25),
    steps: [
      {
        stepId: 'inspect-granary',
        action: 'INSPECT',
        place: SEVERNY_DVOR,
        requires: [],
        gates: [],
        produces: ['light-sack-measure-clue'],
        resultTextKey: 'light-sack.measure-clue',
      },
      {
        stepId: 'ask-gate',
        action: 'ASK',
        place: KAMENNY_BROD,
        requires: ['light-sack-dry-grain-clue'],
        gates: [],
        produces: ['light-sack-wet-sacks-clue'],
        resultTextKey: 'light-sack.wet-sacks-clue',
      },
      {
        stepId: 'report',
        action: 'REPORT',
        place: KAMENNY_BROD,
        requires: ['light-sack-measure-clue'],
        gates: [],
        produces: ['light-sack-measure-report'],
        resultTextKey: 'light-sack.measure-result',
        completes: true,
      },
    ],
  },
]);

/** Keep released profile objects here when a later offer version is authored. */
const lightSackDampRyeProfile: OrdinaryContractProfile = freeze({
  ...ORDINARY_CONTRACT_PROFILES.find((profile) => profile.instanceId === 'ci.m1.light-sack.01')!,
  definitionId: 'ct.m1.light-sack.damp-rye.v1',
  steps: [
    {
      stepId: 'inspect-granary',
      action: 'INSPECT',
      place: SEVERNY_DVOR,
      requires: [],
      gates: [],
      produces: ['light-sack-dry-grain-clue'],
      resultTextKey: 'light-sack.dry-grain-clue',
    },
    {
      stepId: 'ask-gate',
      action: 'ASK',
      place: KAMENNY_BROD,
      requires: ['light-sack-dry-grain-clue'],
      gates: [],
      produces: ['light-sack-wet-sacks-clue'],
      resultTextKey: 'light-sack.wet-sacks-clue',
    },
    {
      stepId: 'report',
      action: 'REPORT',
      place: KAMENNY_BROD,
      requires: ['light-sack-dry-grain-clue', 'light-sack-wet-sacks-clue'],
      gates: [],
      produces: ['light-sack-damp-rye-report'],
      resultTextKey: 'light-sack.damp-rye-result',
      completes: true,
    },
  ],
});

const tracksOverTracksBanditsProfile: OrdinaryContractProfile = freeze({
  ...ORDINARY_CONTRACT_PROFILES.find(
    (profile) => profile.instanceId === 'ci.m1.tracks-over-tracks.01',
  )!,
  definitionId: 'ct.m1.tracks-over-tracks.bandits.v1',
  steps: [
    {
      stepId: 'follow-mowers',
      action: 'SEARCH',
      place: BEREZNYAK,
      requires: [],
      gates: [],
      produces: ['tracks-over-tracks-bandits-fresh-traces'],
      resultTextKey: 'tracks-over-tracks.bandits-fresh-traces',
    },
    {
      stepId: 'inspect-old-stand',
      action: 'INSPECT',
      place: TIKHAYA_GAT,
      requires: [],
      gates: [],
      produces: ['tracks-over-tracks-bandits-old-stand'],
      resultTextKey: 'tracks-over-tracks.old-stand',
    },
    {
      stepId: 'report-tracks',
      action: 'REPORT',
      place: KAMENNY_BROD,
      requires: ['tracks-over-tracks-bandits-fresh-traces'],
      gates: [],
      produces: ['tracks-over-tracks-bandits-report'],
      resultTextKey: 'tracks-over-tracks.bandits-report',
      completes: true,
    },
    {
      stepId: 'report-no-findings',
      action: 'REPORT',
      place: KAMENNY_BROD,
      requires: ['tracks-over-tracks-bandits-old-stand'],
      forbids: ['tracks-over-tracks-bandits-fresh-traces'],
      gates: [],
      produces: ['tracks-over-tracks-bandits-no-findings'],
      resultTextKey: 'tracks-over-tracks.no-findings',
      completes: true,
      payoutPolicy: 'NO_PAYOUT',
    },
  ],
});

export const ORDINARY_CONTRACT_PROFILE_VERSIONS: readonly OrdinaryContractProfile[] = freeze([
  ...ORDINARY_CONTRACT_PROFILES,
  lightSackDampRyeProfile,
  tracksOverTracksBanditsProfile,
]);

/** The slot pairs whose presence in any company's facts unlocks the mill-beast hunt (MILL-02). */
export const MILL_BEAST_UNLOCK_SLOTS = Object.freeze([
  'mill-worker-grain-cart-observation',
  'mill-worker-human-report',
] as const);

export function ordinaryContractProfile(instanceId: string): OrdinaryContractProfile | undefined {
  return ORDINARY_CONTRACT_PROFILES.find((profile) => profile.instanceId === instanceId);
}

export function ordinaryContractProfileVersion(
  instanceId: string,
  definitionId: string,
): OrdinaryContractProfile | undefined {
  return ORDINARY_CONTRACT_PROFILE_VERSIONS.find(
    (profile) => profile.instanceId === instanceId && profile.definitionId === definitionId,
  );
}

/** Build the immutable terms offered by this version of a profile. */
export function ordinaryContractTerms(profile: OrdinaryContractProfile): OrdinaryContractTerms {
  return freeze({
    profileId: profile.definitionId,
    template: profile.template,
    issuerRoleId: profile.issuerRoleId,
    issuerPlace: { ...profile.issuerPlace },
    rewardQ: profile.rewardQ,
    walletId: profile.walletId,
    ...(profile.acceptanceSlot ? { acceptanceSlot: profile.acceptanceSlot } : {}),
    steps: profile.steps.map((step) => ({
      ...step,
      place: { ...step.place },
      requires: [...step.requires],
      gates: [...step.gates],
      produces: [...step.produces],
    })),
  });
}

export interface OrdinaryContractFact {
  readonly slotId: string;
  readonly companyId: string;
  readonly sourceEventId: string;
  readonly atTick: string;
}

export interface OrdinaryContractState {
  readonly version: 1;
  readonly instanceId: OrdinaryContractInstanceId;
  readonly revision: string;
  readonly ownerCompanyId: string | null;
  readonly helperCompanyId: string | null;
  readonly facts: readonly OrdinaryContractFact[];
  readonly custody: readonly { readonly personId: string; readonly companyId: string }[];
  /** Null while offered. Legacy accepted v1 saves hydrate from their retained v1 profile. */
  readonly acceptedTerms: OrdinaryContractTerms | null;
  readonly lastWithdrawal: null | {
    readonly companyId: string;
    readonly sourceEventId: string;
    readonly atTick: string;
  };
  readonly outcome: null | {
    readonly kind: 'SUCCESS';
    readonly companyId: string;
    readonly sourceEventId: string;
    readonly atTick: string;
  };
}

export function ordinaryContractGenesis(profile: OrdinaryContractProfile): OrdinaryContractState {
  return freeze({
    version: 1,
    instanceId: profile.instanceId,
    revision: '0',
    ownerCompanyId: null,
    helperCompanyId: null,
    facts: [],
    custody: [],
    acceptedTerms: null,
    lastWithdrawal: null,
    outcome: null,
  });
}

export type OrdinaryContractCommand =
  | { readonly type: 'ACCEPT' | 'HELP' | 'WITHDRAW' }
  | { readonly type: 'STEP'; readonly stepId: string };

export interface OrdinaryContractContext {
  readonly companyId: string;
  /** Where the company's party stands, or null while it is on a road. */
  readonly standingAt: ContractPlace | null;
  readonly atTick: string;
  readonly expectedRevision: string;
  /** Unique id of the accepted command; becomes the source of every fact it records. */
  readonly sourceEventId: string;
  readonly gates: Readonly<Record<OrdinaryStepGate, boolean>>;
  /** Trusted adapter fact: the relevant battle has been admitted for this contract. */
  readonly battleStarted?: boolean;
}

export type OrdinaryContractRejection =
  | 'STALE_REVISION'
  | 'NOT_AVAILABLE'
  | 'NOT_A_PARTICIPANT'
  | 'WRONG_PLACE'
  | 'ALREADY_DONE'
  | 'MISSING_EVIDENCE'
  | 'CONDITION_NOT_MET';

export type OrdinaryContractPreparation =
  | {
      readonly kind: 'PREPARED';
      readonly next: OrdinaryContractState;
      /** Present when the step completes the contract: pay this company exactly once. */
      readonly payout: { readonly companyId: string; readonly rewardQ: string } | null;
    }
  | { readonly kind: 'REJECTED'; readonly code: OrdinaryContractRejection };

const samePlace = (left: ContractPlace | null, right: ContractPlace) =>
  left !== null && left.siteId === right.siteId && left.areaId === right.areaId;

export function companyHoldsSlot(
  state: OrdinaryContractState,
  companyId: string,
  slotId: string,
): boolean {
  return state.facts.some((fact) => fact.companyId === companyId && fact.slotId === slotId);
}

/** Why a step is not available to this company now, or null when it can be taken. */
export function ordinaryStepBlocker(
  state: OrdinaryContractState,
  step: OrdinaryStepDefinition,
  context: Omit<
    OrdinaryContractContext,
    'expectedRevision' | 'sourceEventId' | 'atTick' | 'battleStarted'
  >,
): Exclude<OrdinaryContractRejection, 'STALE_REVISION'> | null {
  const { companyId } = context;
  if (state.outcome !== null) return 'NOT_AVAILABLE';
  if (companyId !== state.ownerCompanyId && companyId !== state.helperCompanyId)
    return 'NOT_A_PARTICIPANT';
  if (step.produces.every((slotId) => companyHoldsSlot(state, companyId, slotId)))
    return 'ALREADY_DONE';
  if (
    step.takesCustodyOf !== undefined &&
    state.custody.some((entry) => entry.personId === step.takesCustodyOf)
  )
    return 'ALREADY_DONE';
  if (!step.requires.every((slotId) => companyHoldsSlot(state, companyId, slotId)))
    return 'MISSING_EVIDENCE';
  if (step.forbids?.some((slotId) => companyHoldsSlot(state, companyId, slotId)))
    return 'CONDITION_NOT_MET';
  if (
    step.needsCustodyOf !== undefined &&
    !state.custody.some(
      (entry) => entry.personId === step.needsCustodyOf && entry.companyId === companyId,
    )
  )
    return 'MISSING_EVIDENCE';
  if (!samePlace(context.standingAt, step.place)) return 'WRONG_PLACE';
  if (!step.gates.every((gate) => context.gates[gate])) return 'CONDITION_NOT_MET';
  return null;
}

/** Pure, fail-closed transition of one ordinary contract; the adapter persists and pays. */
export function prepareOrdinaryContractCommand(
  profile: OrdinaryContractProfile,
  state: OrdinaryContractState,
  command: OrdinaryContractCommand,
  context: OrdinaryContractContext,
): OrdinaryContractPreparation {
  if (state.instanceId !== profile.instanceId) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  if (context.expectedRevision !== state.revision)
    return { kind: 'REJECTED', code: 'STALE_REVISION' };
  const revision = (BigInt(state.revision) + 1n).toString();
  const fact = (slotId: string): OrdinaryContractFact => ({
    slotId,
    companyId: context.companyId,
    sourceEventId: context.sourceEventId,
    atTick: context.atTick,
  });

  if (command.type === 'WITHDRAW') {
    const isOwner = state.ownerCompanyId === context.companyId;
    const isHelper = state.helperCompanyId === context.companyId;
    if (
      state.outcome !== null ||
      (!isOwner && !isHelper) ||
      context.battleStarted === true ||
      state.custody.length > 0
    )
      return {
        kind: 'REJECTED',
        code: isOwner || isHelper ? 'NOT_AVAILABLE' : 'NOT_A_PARTICIPANT',
      };
    return {
      kind: 'PREPARED',
      payout: null,
      next: freeze({
        ...state,
        revision,
        ownerCompanyId: isOwner ? null : state.ownerCompanyId,
        helperCompanyId: isOwner || isHelper ? null : state.helperCompanyId,
        acceptedTerms: isOwner ? null : state.acceptedTerms,
        lastWithdrawal: {
          companyId: context.companyId,
          sourceEventId: context.sourceEventId,
          atTick: context.atTick,
        },
      }),
    };
  }

  if (command.type !== 'STEP') {
    if (state.outcome !== null) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
    if (!samePlace(context.standingAt, state.acceptedTerms?.issuerPlace ?? profile.issuerPlace))
      return { kind: 'REJECTED', code: 'WRONG_PLACE' };
    const open =
      command.type === 'ACCEPT'
        ? state.ownerCompanyId === null
        : state.ownerCompanyId !== null &&
          state.helperCompanyId === null &&
          state.ownerCompanyId !== context.companyId;
    if (!open) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
    return {
      kind: 'PREPARED',
      payout: null,
      next: freeze({
        ...state,
        revision,
        ownerCompanyId: command.type === 'ACCEPT' ? context.companyId : state.ownerCompanyId,
        helperCompanyId: command.type === 'HELP' ? context.companyId : state.helperCompanyId,
        acceptedTerms:
          command.type === 'ACCEPT' ? ordinaryContractTerms(profile) : state.acceptedTerms,
        facts:
          command.type === 'ACCEPT' && profile.acceptanceSlot !== undefined
            ? [...state.facts, fact(profile.acceptanceSlot)]
            : state.facts,
      }),
    };
  }

  const step = (state.acceptedTerms?.steps ?? profile.steps).find(
    (entry) => entry.stepId === command.stepId,
  );
  if (!step) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const blocker = ordinaryStepBlocker(state, step, context);
  if (blocker !== null) return { kind: 'REJECTED', code: blocker };

  const custody = state.custody
    .filter((entry) => entry.personId !== step.needsCustodyOf)
    .concat(
      step.takesCustodyOf === undefined
        ? []
        : [{ personId: step.takesCustodyOf, companyId: context.companyId }],
    );
  return {
    kind: 'PREPARED',
    payout:
      step.completes && step.payoutPolicy !== 'NO_PAYOUT'
        ? { companyId: context.companyId, rewardQ: state.acceptedTerms?.rewardQ ?? profile.rewardQ }
        : null,
    next: freeze({
      ...state,
      revision,
      facts: [
        ...state.facts,
        ...step.produces
          .filter((slotId) => !companyHoldsSlot(state, context.companyId, slotId))
          .map(fact),
      ],
      custody,
      outcome: step.completes
        ? {
            kind: 'SUCCESS',
            companyId: context.companyId,
            sourceEventId: context.sourceEventId,
            atTick: context.atTick,
          }
        : null,
    }),
  };
}

/** Strict reader for persisted state; anything outside the profile is rejected. */
export function readOrdinaryContractState(
  profile: OrdinaryContractProfile,
  value: unknown,
  storedProfileId = profile.definitionId,
): OrdinaryContractState {
  const fail = () => {
    throw new TypeError(`Ordinary contract state for ${profile.instanceId} is invalid`);
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const record = value as Record<string, unknown>;
  const isText = (entry: unknown): entry is string => typeof entry === 'string' && entry !== '';
  const isTick = (entry: unknown): entry is string =>
    typeof entry === 'string' && /^(0|[1-9][0-9]*)$/u.test(entry);
  const facts = record['facts'];
  const custody = record['custody'];
  const outcome = record['outcome'];
  const ownerCompanyId = record['ownerCompanyId'];
  const acceptedTerms = record['acceptedTerms'];
  const lastWithdrawal = record['lastWithdrawal'];
  const readAcceptedTerms = (): OrdinaryContractTerms | null => {
    if (acceptedTerms === undefined) {
      // State v1 predates the snapshot; hydrate from its explicitly retained profile version.
      if (ownerCompanyId === null) return null;
      const legacyProfile = ordinaryContractProfileVersion(profile.instanceId, storedProfileId);
      return legacyProfile ? ordinaryContractTerms(legacyProfile) : fail();
    }
    if (acceptedTerms === null) return null;
    if (!acceptedTerms || typeof acceptedTerms !== 'object' || Array.isArray(acceptedTerms))
      return fail();
    const terms = acceptedTerms as Record<string, unknown>;
    if (
      !ordinaryContractProfileVersion(profile.instanceId, terms['profileId'] as string) ||
      !['INVESTIGATE', 'RESCUE'].includes(terms['template'] as string) ||
      !isText(terms['issuerRoleId']) ||
      !isText(terms['walletId']) ||
      !isText(terms['rewardQ']) ||
      !/^(0|[1-9][0-9]*)$/u.test(terms['rewardQ'] as string) ||
      !isPlace(terms['issuerPlace']) ||
      (terms['acceptanceSlot'] !== undefined && !isText(terms['acceptanceSlot'])) ||
      !Array.isArray(terms['steps']) ||
      !terms['steps'].every((step) => isStep(step)) ||
      Object.keys(terms).some(
        (key) =>
          ![
            'profileId',
            'template',
            'issuerRoleId',
            'issuerPlace',
            'rewardQ',
            'walletId',
            'acceptanceSlot',
            'steps',
          ].includes(key),
      )
    )
      return fail();
    return freeze(JSON.parse(JSON.stringify(terms)) as OrdinaryContractTerms);
  };
  const normalizedTerms = readAcceptedTerms();
  const slots = new Set([
    ...(profile.acceptanceSlot ? [profile.acceptanceSlot] : []),
    ...profile.steps.flatMap((step) => step.produces),
    ...(normalizedTerms?.acceptanceSlot ? [normalizedTerms.acceptanceSlot] : []),
    ...(normalizedTerms?.steps.flatMap((step) => step.produces) ?? []),
  ]);
  const persons = new Set([
    ...profile.steps.flatMap((step) => step.takesCustodyOf ?? []),
    ...(normalizedTerms?.steps.flatMap((step) => step.takesCustodyOf ?? []) ?? []),
  ]);
  const normalizedWithdrawal =
    lastWithdrawal === undefined || lastWithdrawal === null
      ? null
      : isRecord(lastWithdrawal) &&
          isText(lastWithdrawal['companyId']) &&
          isText(lastWithdrawal['sourceEventId']) &&
          isTick(lastWithdrawal['atTick'])
        ? { ...lastWithdrawal }
        : fail();
  if (
    record['version'] !== 1 ||
    record['instanceId'] !== profile.instanceId ||
    !isTick(record['revision']) ||
    !(record['ownerCompanyId'] === null || isText(record['ownerCompanyId'])) ||
    !(record['helperCompanyId'] === null || isText(record['helperCompanyId'])) ||
    !Array.isArray(facts) ||
    !Array.isArray(custody) ||
    !facts.every(
      (fact: Record<string, unknown>) =>
        fact &&
        slots.has(fact['slotId'] as string) &&
        isText(fact['companyId']) &&
        isText(fact['sourceEventId']) &&
        isTick(fact['atTick']),
    ) ||
    !custody.every(
      (entry: Record<string, unknown>) =>
        entry && persons.has(entry['personId'] as string) && isText(entry['companyId']),
    ) ||
    !(
      outcome === null ||
      (typeof outcome === 'object' &&
        (outcome as Record<string, unknown>)['kind'] === 'SUCCESS' &&
        isText((outcome as Record<string, unknown>)['companyId']) &&
        isText((outcome as Record<string, unknown>)['sourceEventId']) &&
        isTick((outcome as Record<string, unknown>)['atTick']))
    )
  )
    return fail();
  if ((ownerCompanyId === null) !== (normalizedTerms === null)) return fail();
  return freeze({
    ...JSON.parse(JSON.stringify(record)),
    acceptedTerms: normalizedTerms,
    lastWithdrawal: normalizedWithdrawal,
  } as OrdinaryContractState);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPlace(value: unknown): value is ContractPlace {
  return (
    isRecord(value) &&
    typeof value['siteId'] === 'string' &&
    value['siteId'] !== '' &&
    typeof value['areaId'] === 'string' &&
    value['areaId'] !== '' &&
    Object.keys(value).length === 2 &&
    'siteId' in value &&
    'areaId' in value
  );
}

function isStep(value: unknown): value is OrdinaryStepDefinition {
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).every((key) =>
      [
        'stepId',
        'action',
        'place',
        'requires',
        'forbids',
        'gates',
        'produces',
        'resultTextKey',
        'takesCustodyOf',
        'needsCustodyOf',
        'completes',
        'payoutPolicy',
      ].includes(key),
    ) &&
    typeof value['stepId'] === 'string' &&
    ['INSPECT', 'ASK', 'SEARCH', 'RELEASE', 'REPORT', 'DELIVER'].includes(
      value['action'] as string,
    ) &&
    isPlace(value['place']) &&
    Array.isArray(value['requires']) &&
    value['requires'].every((slot) => typeof slot === 'string' && slot !== '') &&
    (value['forbids'] === undefined ||
      (Array.isArray(value['forbids']) &&
        value['forbids'].every((slot) => typeof slot === 'string' && slot !== ''))) &&
    Array.isArray(value['gates']) &&
    value['gates'].every((gate) =>
      ['DAYLIGHT', 'RAIDERS_DEFEATED', 'BEAST_DEFEATED'].includes(gate as string),
    ) &&
    Array.isArray(value['produces']) &&
    value['produces'].every((slot) => typeof slot === 'string' && slot !== '') &&
    (value['resultTextKey'] === undefined ||
      (typeof value['resultTextKey'] === 'string' && value['resultTextKey'] !== '')) &&
    (value['takesCustodyOf'] === undefined ||
      (typeof value['takesCustodyOf'] === 'string' && value['takesCustodyOf'] !== '')) &&
    (value['needsCustodyOf'] === undefined ||
      (typeof value['needsCustodyOf'] === 'string' && value['needsCustodyOf'] !== '')) &&
    (value['completes'] === undefined || value['completes'] === true) &&
    (value['payoutPolicy'] === undefined ||
      value['payoutPolicy'] === 'FULL_REWARD' ||
      value['payoutPolicy'] === 'NO_PAYOUT')
  );
}

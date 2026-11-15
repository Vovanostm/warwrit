import { PAINTED_ATLAS_REGION_VERSION } from '../world/continuous-region.js';

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
  | 'ci.m1.tracks-over-tracks.01'
  | 'ci.m1.foul-well.01'
  | 'ci.m1.dragged-sack.01'
  | 'ci.m1.voice-under-boards.01'
  | 'ci.m1.man-by-road.01';

export interface ContractPlace {
  readonly siteId: string;
  readonly areaId: string;
}

/** World conditions a step needs, read by the adapter from authoritative world state. */
export type OrdinaryStepGate =
  | 'DAYLIGHT'
  | 'RAIDERS_DEFEATED'
  | 'BEAST_DEFEATED'
  | 'HERBALIST_PRESENT'
  | 'HERBALIST_EXILED';

export type OrdinaryCustodyTravelMode = 'ON_FOOT' | 'STRETCHER';

export interface OrdinaryTerrainTarget {
  readonly mapEdition: string;
  readonly xFp: number;
  readonly zFp: number;
  readonly radiusFp: number;
}

export interface OrdinaryStepDefinition {
  readonly stepId: string;
  readonly action: 'INSPECT' | 'ASK' | 'SEARCH' | 'RELEASE' | 'REPORT' | 'DELIVER' | 'BUY' | 'REST';
  readonly place: ContractPlace;
  /** A bounded point on the retained map edition; when present this replaces `place` for the step. */
  readonly terrainTarget?: OrdinaryTerrainTarget;
  /** Source slots the acting company must already hold. */
  readonly requires: readonly string[];
  /** Source slots that make this step unavailable to the acting company. */
  readonly forbids?: readonly string[];
  readonly gates: readonly OrdinaryStepGate[];
  /** Source slots this step records for the acting company. */
  readonly produces: readonly string[];
  /** A branch is unavailable once this company has recorded any excluded finding. */
  readonly excludes?: readonly string[];
  /** Localized result shown only after this company records the observation. */
  readonly resultTextKey?: string;
  /** A person who travels with the acting company from now on. */
  readonly takesCustodyOf?: string;
  /** Travel burden retained with custody and consumed by the normal movement adapter. */
  readonly custodyTravelMode?: OrdinaryCustodyTravelMode;
  /** Needs the acting company to hold this person; ends custody. */
  readonly needsCustodyOf?: string;
  /** Contract-owned cargo enters or leaves one company's custody through a real step. */
  readonly takesCargoId?: string;
  readonly needsCargoId?: string;
  readonly deliversCargoId?: string;
  /** The produced fact that receipts this step's cargo transition. */
  readonly cargoReceiptSlotId?: string;
  /** Allows the former holder to return cargo after withdrawing, without completing for pay. */
  readonly returnsCargoAfterWithdrawal?: true;
  /** Earliest time this step may run, measured from a trusted company-owned source fact. */
  readonly minElapsedTicksSinceSlot?: { readonly slotId: string; readonly ticks: string };
  /** Completes the contract. By default the full reward is paid to the acting company. */
  readonly completes?: true;
  /** A terminal finding may close the contract without paying its advertised full reward. */
  readonly payoutPolicy?: 'FULL_REWARD' | 'NO_PAYOUT';
  /** A finite owner observation available after the terminal result; never a second payout. */
  readonly postCompletion?: true;
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
  /** Campaign ticks from acceptance until the deadline, if this offer is time-limited. */
  readonly deadlineTicks?: string;
  /** Slot recorded for the owner when it accepts, if the contract has one. */
  readonly acceptanceSlot?: string;
  /** Omit or true for normal cooperative contracts; false for a one-source offer. */
  readonly allowHelper?: boolean;
  readonly steps: readonly OrdinaryStepDefinition[];
}

/** The accepted copy of an ordinary offer; profile IDs are immutable contract versions. */
export interface OrdinaryContractTerms {
  readonly profileId: string;
  readonly template: OrdinaryContractProfile['template'];
  readonly issuerRoleId: string;
  readonly issuerPlace: ContractPlace;
  readonly rewardQ: string;
  /** Frozen duration and absolute end of the half-open acceptance interval. */
  readonly deadlineTicks?: string;
  readonly acceptedAtTick?: string;
  readonly deadlineAtTick?: string;
  readonly walletId: string;
  readonly acceptanceSlot?: string;
  readonly allowHelper?: boolean;
  readonly steps: readonly OrdinaryStepDefinition[];
}

const place = (siteId: string, areaId: string): ContractPlace => ({ siteId, areaId });
const KAMENNY_BROD = place('kamenny-brod', 'kamenny-brod-market');
const BEREZNYAK = place('bereznyak', 'bereznyak-green');
const CHAPEL = KAMENNY_BROD;
const TIKHAYA_GAT = place('tikhaya-gat', 'tikhaya-gat-bank');
const SEVERNY_DVOR = place('severny-dvor', 'severny-dvor-yard');
const MILL_YARD = place('staraya-melnitsa', 'staraya-melnitsa-yard');
const CROWNS = (crowns: number) => `${crowns}000000`;
const BEREZNYAK_ROADSIDE = Object.freeze({
  mapEdition: PAINTED_ATLAS_REGION_VERSION,
  xFp: -2548,
  zFp: 1127,
  radiusFp: 128,
});

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
    instanceId: 'ci.m1.voice-under-boards.01',
    definitionId: 'ct.m1.voice-under-boards.v2',
    template: 'RESCUE',
    issuerRoleId: 'woodland-village-caller',
    issuerPlace: TIKHAYA_GAT,
    walletId: 'wallet.vasilisa.tikhaya-gat.01',
    genesisWalletQ: CROWNS(120),
    rewardQ: CROWNS(120),
    steps: [
      {
        stepId: 'inspect-cellar',
        action: 'SEARCH',
        place: MILL_YARD,
        requires: [],
        gates: ['RAIDERS_DEFEATED'],
        produces: ['voice-under-boards-cellar'],
        resultTextKey: 'voice-under-boards.cellar',
      },
      {
        stepId: 'inspect-tracks',
        action: 'INSPECT',
        place: MILL_YARD,
        requires: ['voice-under-boards-cellar'],
        gates: ['RAIDERS_DEFEATED'],
        produces: ['voice-under-boards-tracks'],
        resultTextKey: 'voice-under-boards.tracks',
      },
      {
        stepId: 'buy-descent-kit',
        action: 'BUY',
        place: TIKHAYA_GAT,
        requires: [],
        gates: [],
        produces: ['voice-under-boards-kit-purchased'],
        resultTextKey: 'voice-under-boards.kit-purchased',
      },
      {
        stepId: 'release-ostap',
        action: 'RELEASE',
        place: MILL_YARD,
        requires: ['voice-under-boards-cellar', 'voice-under-boards-tracks'],
        gates: ['RAIDERS_DEFEATED', 'BEAST_DEFEATED'],
        produces: ['voice-under-boards-person-source', 'voice-under-boards-living-release'],
        takesCustodyOf: 'person.ostap',
      },
      {
        stepId: 'release-ostap-quiet',
        action: 'RELEASE',
        place: MILL_YARD,
        requires: [
          'voice-under-boards-cellar',
          'voice-under-boards-tracks',
          'voice-under-boards-kit-purchased',
        ],
        gates: ['RAIDERS_DEFEATED'],
        produces: [
          'voice-under-boards-person-source',
          'voice-under-boards-living-release',
          'voice-under-boards-quiet-release',
        ],
        takesCustodyOf: 'person.ostap',
        resultTextKey: 'voice-under-boards.quiet-release',
      },
      {
        stepId: 'deliver-ostap',
        action: 'DELIVER',
        place: TIKHAYA_GAT,
        requires: ['voice-under-boards-living-release'],
        gates: [],
        produces: ['voice-under-boards-delivery'],
        needsCustodyOf: 'person.ostap',
        resultTextKey: 'voice-under-boards.delivery',
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
        produces: ['empty-watch-proof-destroyed'],
        resultTextKey: 'empty-watch-record.proof-destroyed-immediate',
        completes: true,
        payoutPolicy: 'NO_PAYOUT',
      },
      {
        stepId: 'ask-prokop-about-old-ford',
        action: 'ASK',
        place: KAMENNY_BROD,
        requires: ['empty-watch-proof-destroyed'],
        gates: [],
        produces: ['empty-watch-old-ford-revealed'],
        resultTextKey: 'empty-watch-record.old-ford-revealed',
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
    instanceId: 'ci.m1.foul-well.01',
    definitionId: 'ct.m1.foul-well.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'father-nikon',
    issuerPlace: CHAPEL,
    walletId: 'wallet.chapel.kamenny-brod.01',
    genesisWalletQ: CROWNS(240),
    rewardQ: CROWNS(120),
    steps: [
      {
        stepId: 'inspect-well',
        action: 'INSPECT',
        place: BEREZNYAK,
        requires: [],
        gates: [],
        produces: ['foul-well-observation'],
        resultTextKey: 'foul-well.well',
      },
      {
        stepId: 'ask-aghafya',
        action: 'ASK',
        place: BEREZNYAK,
        requires: ['foul-well-observation'],
        gates: [],
        produces: ['foul-well-aghafya-testimony'],
        resultTextKey: 'foul-well.aghafya',
      },
      {
        stepId: 'search-ravine',
        action: 'SEARCH',
        place: BEREZNYAK,
        requires: ['foul-well-aghafya-testimony'],
        gates: [],
        produces: ['foul-well-graves'],
        resultTextKey: 'foul-well.graves',
      },
      {
        stepId: 'ask-frol',
        action: 'ASK',
        place: BEREZNYAK,
        requires: ['foul-well-graves'],
        gates: [],
        produces: ['foul-well-frol-testimony'],
        resultTextKey: 'foul-well.frol',
      },
      {
        stepId: 'tell-nikon-about-ravine',
        action: 'REPORT',
        place: CHAPEL,
        requires: ['foul-well-graves', 'foul-well-frol-testimony'],
        gates: [],
        produces: ['foul-well-truth-reported'],
        resultTextKey: 'foul-well.truth-ending',
        completes: true,
        payoutPolicy: 'NO_PAYOUT',
      },
      {
        stepId: 'name-aghafya',
        action: 'REPORT',
        place: CHAPEL,
        requires: ['foul-well-aghafya-testimony'],
        gates: [],
        produces: ['foul-well-aghafya-accused'],
        resultTextKey: 'foul-well.accusation-ending',
        completes: true,
      },
    ],
  },
  {
    instanceId: 'ci.m1.dragged-sack.01',
    definitionId: 'ct.m1.dragged-sack.v1',
    template: 'INVESTIGATE',
    issuerRoleId: 'northern-grain-hauler',
    issuerPlace: SEVERNY_DVOR,
    walletId: 'wallet.yerema.severny-dvor.01',
    genesisWalletQ: CROWNS(50),
    rewardQ: CROWNS(25),
    deadlineTicks: '1000',
    acceptanceSlot: 'dragged-sack-contract-acceptance',
    steps: [
      {
        stepId: 'trace-flour',
        action: 'INSPECT',
        place: KAMENNY_BROD,
        requires: [],
        gates: [],
        produces: ['dragged-sack-flour-trail'],
        resultTextKey: 'dragged-sack.flour-trail',
      },
      {
        stepId: 'find-boys',
        action: 'SEARCH',
        place: KAMENNY_BROD,
        requires: ['dragged-sack-flour-trail'],
        gates: [],
        produces: ['dragged-sack-found'],
        takesCargoId: 'dragged-sack.01',
        cargoReceiptSlotId: 'dragged-sack-found',
        resultTextKey: 'dragged-sack.boys-found',
      },
      {
        stepId: 'leave-flour',
        action: 'REPORT',
        place: KAMENNY_BROD,
        requires: ['dragged-sack-found'],
        gates: [],
        produces: ['dragged-sack-flour-shared', 'dragged-sack-yerema-slept'],
        needsCargoId: 'dragged-sack.01',
        resultTextKey: 'dragged-sack.flour-shared',
      },
      {
        stepId: 'return-full-sack',
        action: 'DELIVER',
        place: SEVERNY_DVOR,
        requires: ['dragged-sack-found'],
        excludes: ['dragged-sack-flour-shared'],
        gates: [],
        produces: ['dragged-sack-delivered-full'],
        needsCargoId: 'dragged-sack.01',
        deliversCargoId: 'dragged-sack.01',
        cargoReceiptSlotId: 'dragged-sack-delivered-full',
        resultTextKey: 'dragged-sack.returned-full',
        completes: true,
      },
      {
        stepId: 'return-short-sack',
        action: 'DELIVER',
        place: SEVERNY_DVOR,
        requires: ['dragged-sack-found', 'dragged-sack-flour-shared'],
        gates: [],
        produces: ['dragged-sack-delivered-short'],
        needsCargoId: 'dragged-sack.01',
        deliversCargoId: 'dragged-sack.01',
        cargoReceiptSlotId: 'dragged-sack-delivered-short',
        resultTextKey: 'dragged-sack.returned-short',
        completes: true,
      },
      {
        stepId: 'return-cargo-after-withdrawal',
        action: 'DELIVER',
        place: SEVERNY_DVOR,
        requires: [],
        gates: [],
        produces: ['dragged-sack-returned-after-withdrawal'],
        needsCargoId: 'dragged-sack.01',
        deliversCargoId: 'dragged-sack.01',
        cargoReceiptSlotId: 'dragged-sack-returned-after-withdrawal',
        returnsCargoAfterWithdrawal: true,
        resultTextKey: 'dragged-sack.returned-after-withdrawal',
        payoutPolicy: 'NO_PAYOUT',
        completes: true,
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
    instanceId: 'ci.m1.man-by-road.01',
    definitionId: 'ct.m1.man-by-road.v1',
    template: 'RESCUE',
    issuerRoleId: 'herbalist',
    issuerPlace: BEREZNYAK,
    walletId: 'wallet.sidor.roadside.01',
    genesisWalletQ: CROWNS(25),
    rewardQ: CROWNS(25),
    allowHelper: false,
    steps: [
      {
        stepId: 'find-sidor',
        action: 'SEARCH',
        place: BEREZNYAK,
        terrainTarget: BEREZNYAK_ROADSIDE,
        requires: [],
        gates: [],
        produces: ['man-by-road-sidor-found'],
      },
      {
        stepId: 'walk-with-stops',
        action: 'REPORT',
        place: BEREZNYAK,
        terrainTarget: BEREZNYAK_ROADSIDE,
        requires: ['man-by-road-sidor-found'],
        excludes: ['man-by-road-stretcher-fetched'],
        gates: [],
        produces: ['man-by-road-transport-chosen', 'man-by-road-walking'],
        takesCustodyOf: 'person.sidor',
        custodyTravelMode: 'ON_FOOT',
      },
      {
        stepId: 'rest-with-sidor',
        action: 'REST',
        place: BEREZNYAK,
        terrainTarget: BEREZNYAK_ROADSIDE,
        requires: ['man-by-road-walking'],
        gates: [],
        produces: ['man-by-road-rest-started'],
      },
      {
        stepId: 'continue-after-rest',
        action: 'REST',
        place: BEREZNYAK,
        terrainTarget: BEREZNYAK_ROADSIDE,
        requires: ['man-by-road-rest-started'],
        minElapsedTicksSinceSlot: { slotId: 'man-by-road-rest-started', ticks: '300' },
        gates: [],
        produces: ['man-by-road-rest-complete'],
      },
      {
        stepId: 'fetch-stretcher',
        action: 'ASK',
        place: BEREZNYAK,
        requires: ['man-by-road-sidor-found'],
        excludes: ['man-by-road-walking'],
        gates: [],
        produces: ['man-by-road-transport-chosen', 'man-by-road-stretcher-fetched'],
      },
      {
        stepId: 'load-sidor-on-stretcher',
        action: 'SEARCH',
        place: BEREZNYAK,
        terrainTarget: BEREZNYAK_ROADSIDE,
        requires: ['man-by-road-sidor-found', 'man-by-road-stretcher-fetched'],
        gates: [],
        produces: ['man-by-road-stretcher-loaded', 'man-by-road-living-rescue'],
        takesCustodyOf: 'person.sidor',
        custodyTravelMode: 'STRETCHER',
      },
      {
        stepId: 'arrive-on-foot',
        action: 'DELIVER',
        place: BEREZNYAK,
        requires: ['man-by-road-walking', 'man-by-road-rest-complete'],
        gates: ['HERBALIST_PRESENT'],
        produces: ['man-by-road-living-rescue', 'man-by-road-delivered', 'man-by-road-resolved'],
        needsCustodyOf: 'person.sidor',
        completes: true,
      },
      {
        stepId: 'arrive-on-stretcher',
        action: 'DELIVER',
        place: BEREZNYAK,
        requires: ['man-by-road-stretcher-loaded', 'man-by-road-living-rescue'],
        gates: ['HERBALIST_PRESENT'],
        produces: ['man-by-road-delivered', 'man-by-road-resolved'],
        needsCustodyOf: 'person.sidor',
        completes: true,
      },
      {
        stepId: 'deliver-on-foot-after-exile',
        action: 'DELIVER',
        place: BEREZNYAK,
        requires: ['man-by-road-walking', 'man-by-road-rest-complete'],
        gates: ['HERBALIST_EXILED'],
        produces: [
          'man-by-road-living-rescue',
          'man-by-road-exile-delivery',
          'man-by-road-resolved',
        ],
        needsCustodyOf: 'person.sidor',
        resultTextKey: 'man-by-road.exile-delivery',
        completes: true,
        payoutPolicy: 'NO_PAYOUT',
      },
      {
        stepId: 'deliver-on-stretcher-after-exile',
        action: 'DELIVER',
        place: BEREZNYAK,
        requires: ['man-by-road-stretcher-loaded', 'man-by-road-living-rescue'],
        gates: ['HERBALIST_EXILED'],
        produces: ['man-by-road-exile-delivery', 'man-by-road-resolved'],
        needsCustodyOf: 'person.sidor',
        resultTextKey: 'man-by-road.exile-delivery',
        completes: true,
        payoutPolicy: 'NO_PAYOUT',
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
  freeze({
    ...ORDINARY_CONTRACT_PROFILES.find(
      (profile) => profile.instanceId === 'ci.m1.voice-under-boards.01',
    )!,
    definitionId: 'ct.m1.voice-under-boards.v1',
    steps: ORDINARY_CONTRACT_PROFILES.find(
      (profile) => profile.instanceId === 'ci.m1.voice-under-boards.01',
    )!.steps.filter(
      (step) => step.stepId !== 'buy-descent-kit' && step.stepId !== 'release-ostap-quiet',
    ),
  }),
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
export function ordinaryContractTerms(
  profile: OrdinaryContractProfile,
  acceptedAtTick?: string,
): OrdinaryContractTerms {
  return freeze({
    profileId: profile.definitionId,
    template: profile.template,
    issuerRoleId: profile.issuerRoleId,
    issuerPlace: { ...profile.issuerPlace },
    rewardQ: profile.rewardQ,
    ...(profile.deadlineTicks && acceptedAtTick !== undefined
      ? {
          deadlineTicks: profile.deadlineTicks,
          acceptedAtTick,
          deadlineAtTick: (BigInt(acceptedAtTick) + BigInt(profile.deadlineTicks)).toString(),
        }
      : {}),
    walletId: profile.walletId,
    ...(profile.acceptanceSlot ? { acceptanceSlot: profile.acceptanceSlot } : {}),
    ...(profile.allowHelper === undefined ? {} : { allowHelper: profile.allowHelper }),
    steps: profile.steps.map((step) => ({
      ...step,
      place: { ...step.place },
      ...(step.terrainTarget ? { terrainTarget: { ...step.terrainTarget } } : {}),
      ...(step.minElapsedTicksSinceSlot
        ? { minElapsedTicksSinceSlot: { ...step.minElapsedTicksSinceSlot } }
        : {}),
      requires: [...step.requires],
      gates: [...step.gates],
      ...(step.excludes ? { excludes: [...step.excludes] } : {}),
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
  readonly custody: readonly {
    readonly personId: string;
    readonly companyId: string;
    readonly travelMode?: OrdinaryCustodyTravelMode;
  }[];
  readonly cargoCustody: readonly {
    readonly cargoId: string;
    /** Null means the accepted issuer has received the delivered cargo. */
    readonly companyId: string | null;
    readonly pickupCompanyId: string;
    readonly pickupSourceEventId: string;
    readonly pickupAtTick: string;
    readonly sourceEventId: string;
    readonly atTick: string;
  }[];
  /** Null while offered. Legacy accepted v1 saves hydrate from their retained v1 profile. */
  readonly acceptedTerms: OrdinaryContractTerms | null;
  readonly lastWithdrawal: null | {
    readonly companyId: string;
    readonly sourceEventId: string;
    readonly atTick: string;
  };
  readonly outcome:
    | null
    | {
        readonly kind: 'SUCCESS';
        readonly companyId: string;
        readonly sourceEventId: string;
        readonly atTick: string;
        readonly payoutPolicy?: 'FULL_REWARD' | 'NO_PAYOUT';
      }
    | {
        readonly kind: 'EXPIRED';
        readonly companyId: string;
        readonly sourceEventId: string;
        readonly atTick: string;
        readonly payoutPolicy?: 'FULL_REWARD' | 'NO_PAYOUT';
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
    cargoCustody: [],
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
  /** Trusted settled coordinate supplied only for the matching continuous map edition. */
  readonly terrainPosition?: {
    readonly mapEdition: string;
    readonly xMicroFp: string;
    readonly zMicroFp: string;
  };
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
  | 'ALTERNATIVE_CHOSEN'
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

function contractDeadlinePassed(state: OrdinaryContractState, atTick: string): boolean {
  const deadlineAtTick = state.acceptedTerms?.deadlineAtTick;
  return deadlineAtTick !== undefined && BigInt(atTick) >= BigInt(deadlineAtTick);
}

export function companyHoldsSlot(
  state: OrdinaryContractState,
  companyId: string,
  slotId: string,
): boolean {
  return state.facts.some((fact) => fact.companyId === companyId && fact.slotId === slotId);
}

function isWithdrawnCustodyDelivery(
  state: OrdinaryContractState,
  companyId: string,
  step: OrdinaryStepDefinition,
): boolean {
  const personId = step.needsCustodyOf;
  return (
    personId !== undefined &&
    step.action === 'DELIVER' &&
    step.completes === true &&
    state.acceptedTerms !== null &&
    state.lastWithdrawal !== null &&
    (state.ownerCompanyId === null || state.lastWithdrawal.companyId === companyId) &&
    state.custody.some((entry) => entry.personId === personId && entry.companyId === companyId)
  );
}

/** Copied, company-scoped burdens that the continuous movement adapter retains in route plans. */
export function ordinaryCustodyTravelLoads(
  state: OrdinaryContractState,
  companyId: string,
): readonly {
  readonly personId: string;
  readonly travelMode?: OrdinaryCustodyTravelMode;
}[] {
  return state.custody.flatMap((entry) =>
    entry.companyId === companyId
      ? [{ personId: entry.personId, ...(entry.travelMode ? { travelMode: entry.travelMode } : {}) }]
      : [],
  );
}

/** Why a step is not available to this company now, or null when it can be taken. */
export function ordinaryStepBlocker(
  state: OrdinaryContractState,
  step: OrdinaryStepDefinition,
  context: Omit<OrdinaryContractContext, 'expectedRevision' | 'sourceEventId' | 'battleStarted'>,
): Exclude<OrdinaryContractRejection, 'STALE_REVISION'> | null {
  const { companyId } = context;
  const expiredReturn =
    state.outcome?.kind === 'EXPIRED' &&
    step.returnsCargoAfterWithdrawal === true &&
    state.ownerCompanyId === companyId;
  const withdrawnCustodyDelivery = isWithdrawnCustodyDelivery(state, companyId, step);
  if (
    companyId !== state.ownerCompanyId &&
    companyId !== state.helperCompanyId &&
    !step.returnsCargoAfterWithdrawal &&
    !withdrawnCustodyDelivery
  )
    return 'NOT_A_PARTICIPANT';
  if (
    state.outcome !== null &&
    !expiredReturn &&
    (step.postCompletion !== true || state.outcome.companyId !== companyId)
  )
    return 'NOT_AVAILABLE';
  if (step.produces.every((slotId) => companyHoldsSlot(state, companyId, slotId)))
    return 'ALREADY_DONE';
  if (
    step.takesCustodyOf !== undefined &&
    state.custody.some((entry) => entry.personId === step.takesCustodyOf)
  )
    return 'ALREADY_DONE';
  if (
    step.takesCargoId !== undefined &&
    state.cargoCustody.some((entry) => entry.cargoId === step.takesCargoId)
  )
    return 'ALREADY_DONE';
  if (step.takesCargoId !== undefined && state.ownerCompanyId !== companyId)
    return 'NOT_A_PARTICIPANT';
  if (
    step.returnsCargoAfterWithdrawal &&
    state.lastWithdrawal?.companyId !== companyId &&
    !expiredReturn
  )
    return 'NOT_AVAILABLE';
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
  if (
    step.needsCargoId !== undefined &&
    !state.cargoCustody.some(
      (entry) => entry.cargoId === step.needsCargoId && entry.companyId === companyId,
    )
  )
    return 'MISSING_EVIDENCE';
  if (step.excludes?.some((slotId) => companyHoldsSlot(state, companyId, slotId)))
    return 'NOT_AVAILABLE';
  if (step.terrainTarget) {
    if (!isInsideTerrainTarget(context.terrainPosition, step.terrainTarget)) return 'WRONG_PLACE';
  } else if (!samePlace(context.standingAt, step.place)) return 'WRONG_PLACE';
  if (step.minElapsedTicksSinceSlot) {
    const source = state.facts.find(
      (fact) =>
        fact.companyId === companyId && fact.slotId === step.minElapsedTicksSinceSlot!.slotId,
    );
    if (!source) return 'MISSING_EVIDENCE';
    if (
      BigInt(context.atTick) <
      BigInt(source.atTick) + BigInt(step.minElapsedTicksSinceSlot.ticks)
    )
      return 'CONDITION_NOT_MET';
  }
  if (!step.gates.every((gate) => context.gates[gate])) return 'CONDITION_NOT_MET';
  return null;
}

function isInsideTerrainTarget(
  position: OrdinaryContractContext['terrainPosition'],
  target: OrdinaryTerrainTarget,
): boolean {
  if (position?.mapEdition !== target.mapEdition) return false;
  const dx = BigInt(position.xMicroFp) - BigInt(target.xFp) * 65536n;
  const dz = BigInt(position.zMicroFp) - BigInt(target.zFp) * 65536n;
  const radius = BigInt(target.radiusFp) * 65536n;
  return dx * dx + dz * dz <= radius * radius;
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
      contractDeadlinePassed(state, context.atTick) ||
      (!isOwner && !isHelper) ||
      context.battleStarted === true ||
      state.custody.some((entry) => entry.companyId !== context.companyId) ||
      (isOwner &&
        state.cargoCustody.some(
          (entry) => entry.companyId !== null && entry.companyId !== context.companyId,
        ))
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
        acceptedTerms: isOwner && state.custody.length === 0 ? null : state.acceptedTerms,
        lastWithdrawal: {
          companyId: context.companyId,
          sourceEventId: context.sourceEventId,
          atTick: context.atTick,
        },
      }),
    };
  }

  if (command.type !== 'STEP') {
    if (state.outcome !== null || contractDeadlinePassed(state, context.atTick))
      return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
    if (!samePlace(context.standingAt, state.acceptedTerms?.issuerPlace ?? profile.issuerPlace))
      return { kind: 'REJECTED', code: 'WRONG_PLACE' };
    const open =
      command.type === 'ACCEPT'
        ? state.ownerCompanyId === null &&
          !state.cargoCustody.some((entry) => entry.companyId !== null) &&
          state.custody.length === 0
        : state.ownerCompanyId !== null &&
          state.helperCompanyId === null &&
          state.ownerCompanyId !== context.companyId &&
          (state.acceptedTerms?.allowHelper ?? profile.allowHelper ?? true);
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
          command.type === 'ACCEPT'
            ? ordinaryContractTerms(profile, context.atTick)
            : state.acceptedTerms,
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
  const withdrawnCustodyDelivery = isWithdrawnCustodyDelivery(state, context.companyId, step);
  const expired = contractDeadlinePassed(state, context.atTick);
  if (expired && !step.returnsCargoAfterWithdrawal)
    return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
  const blockerState =
    expired && state.outcome === null
      ? freeze({
          ...state,
          outcome: {
            kind: 'EXPIRED' as const,
            companyId: state.ownerCompanyId!,
            sourceEventId: `system:ordinary-contract-expiry:${state.instanceId}:${state.acceptedTerms!.deadlineAtTick}`,
            atTick: state.acceptedTerms!.deadlineAtTick!,
          },
        })
      : state;
  const blocker = ordinaryStepBlocker(blockerState, step, context);
  if (blocker !== null) return { kind: 'REJECTED', code: blocker };

  const custody = state.custody
    .filter((entry) => entry.personId !== step.needsCustodyOf)
    .concat(
      step.takesCustodyOf === undefined
        ? []
        : [
            {
              personId: step.takesCustodyOf,
              companyId: context.companyId,
              ...(step.custodyTravelMode ? { travelMode: step.custodyTravelMode } : {}),
            },
          ],
    );
  const cargoCustody = state.cargoCustody
    .filter((entry) => entry.cargoId !== step.deliversCargoId)
    .concat(
      step.takesCargoId === undefined
        ? []
        : [
            {
              cargoId: step.takesCargoId,
              companyId: context.companyId,
              pickupCompanyId: context.companyId,
              pickupSourceEventId: context.sourceEventId,
              pickupAtTick: context.atTick,
              sourceEventId: context.sourceEventId,
              atTick: context.atTick,
            },
          ],
      step.deliversCargoId === undefined
        ? []
        : state.cargoCustody
            .filter((entry) => entry.cargoId === step.deliversCargoId)
            .map((entry) => ({
              ...entry,
              companyId: null,
              sourceEventId: context.sourceEventId,
              atTick: context.atTick,
            })),
    );
  return {
    kind: 'PREPARED',
    payout:
      step.completes &&
      state.outcome === null &&
      step.payoutPolicy !== 'NO_PAYOUT' &&
      !withdrawnCustodyDelivery
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
      cargoCustody,
      outcome: step.completes
        ? expired && step.returnsCargoAfterWithdrawal
          ? {
              kind: 'EXPIRED',
              companyId: context.companyId,
              sourceEventId: context.sourceEventId,
              atTick: context.atTick,
              payoutPolicy: 'NO_PAYOUT',
            }
          : {
              kind: 'SUCCESS',
              companyId: context.companyId,
              sourceEventId: context.sourceEventId,
              atTick: context.atTick,
              ...(withdrawnCustodyDelivery || step.payoutPolicy === 'NO_PAYOUT'
                ? { payoutPolicy: 'NO_PAYOUT' as const }
                : {}),
            }
        : state.outcome,
      acceptedTerms:
        step.completes && withdrawnCustodyDelivery && state.ownerCompanyId === null
          ? null
          : state.acceptedTerms,
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
  const cargoCustody = record['cargoCustody'] ?? [];
  const outcome = record['outcome'];
  const ownerCompanyId = record['ownerCompanyId'];
  const acceptedTerms = record['acceptedTerms'];
  const lastWithdrawal = record['lastWithdrawal'];
  const acceptedAtTickFor = (acceptedProfile: OrdinaryContractProfile): string | undefined => {
    if (!acceptedProfile.acceptanceSlot || !Array.isArray(facts)) return undefined;
    const acceptance = facts.find(
      (entry) =>
        isRecord(entry) &&
        entry['slotId'] === acceptedProfile.acceptanceSlot &&
        entry['companyId'] === ownerCompanyId &&
        isTick(entry['atTick']),
    );
    return isRecord(acceptance) ? (acceptance['atTick'] as string) : undefined;
  };
  const readAcceptedTerms = (): OrdinaryContractTerms | null => {
    if (acceptedTerms === undefined) {
      // State v1 predates the snapshot; hydrate from its explicitly retained profile version.
      if (ownerCompanyId === null) return null;
      const legacyProfile = ordinaryContractProfileVersion(profile.instanceId, storedProfileId);
      return legacyProfile
        ? ordinaryContractTerms(legacyProfile, acceptedAtTickFor(legacyProfile))
        : fail();
    }
    if (acceptedTerms === null) return null;
    if (!acceptedTerms || typeof acceptedTerms !== 'object' || Array.isArray(acceptedTerms))
      return fail();
    const terms = acceptedTerms as Record<string, unknown>;
    const termsProfile = ordinaryContractProfileVersion(
      profile.instanceId,
      terms['profileId'] as string,
    );
    const hasDeadline =
      terms['deadlineTicks'] !== undefined ||
      terms['acceptedAtTick'] !== undefined ||
      terms['deadlineAtTick'] !== undefined;
    if (
      !termsProfile ||
      !['INVESTIGATE', 'RESCUE'].includes(terms['template'] as string) ||
      !isText(terms['issuerRoleId']) ||
      !isText(terms['walletId']) ||
      !isText(terms['rewardQ']) ||
      !/^(0|[1-9][0-9]*)$/u.test(terms['rewardQ'] as string) ||
      !isPlace(terms['issuerPlace']) ||
      (terms['acceptanceSlot'] !== undefined && !isText(terms['acceptanceSlot'])) ||
      (terms['allowHelper'] !== undefined && typeof terms['allowHelper'] !== 'boolean') ||
      !Array.isArray(terms['steps']) ||
      !terms['steps'].every((step) => isStep(step)) ||
      (hasDeadline &&
        (terms['deadlineTicks'] !== termsProfile.deadlineTicks ||
          typeof terms['acceptedAtTick'] !== 'string' ||
          !isTick(terms['acceptedAtTick']) ||
          typeof terms['deadlineAtTick'] !== 'string' ||
          !isTick(terms['deadlineAtTick']) ||
          BigInt(terms['deadlineAtTick']) !==
            BigInt(terms['acceptedAtTick']) + BigInt(terms['deadlineTicks'] as string))) ||
      Object.keys(terms).some(
        (key) =>
          ![
            'profileId',
            'template',
            'issuerRoleId',
            'issuerPlace',
            'rewardQ',
            'walletId',
            'deadlineTicks',
            'acceptedAtTick',
            'deadlineAtTick',
            'acceptanceSlot',
            'allowHelper',
            'steps',
          ].includes(key),
      )
    )
      return fail();
    const retained = JSON.parse(JSON.stringify(terms)) as OrdinaryContractTerms;
    const acceptedAtTick = acceptedAtTickFor(termsProfile);
    return freeze(
      !hasDeadline && termsProfile.deadlineTicks && acceptedAtTick !== undefined
        ? {
            ...retained,
            deadlineTicks: termsProfile.deadlineTicks,
            acceptedAtTick,
            deadlineAtTick: (
              BigInt(acceptedAtTick) + BigInt(termsProfile.deadlineTicks)
            ).toString(),
          }
        : retained,
    );
  };
  const normalizedTerms = readAcceptedTerms();
  const slots = new Set([
    ...(profile.acceptanceSlot ? [profile.acceptanceSlot] : []),
    ...profile.steps.flatMap((step) => step.produces),
    ...profile.steps.flatMap((step) => step.minElapsedTicksSinceSlot?.slotId ?? []),
    ...profile.steps.flatMap((step) => step.excludes ?? []),
    ...(normalizedTerms?.acceptanceSlot ? [normalizedTerms.acceptanceSlot] : []),
    ...(normalizedTerms?.steps.flatMap((step) => step.produces) ?? []),
    ...(normalizedTerms?.steps.flatMap((step) => step.minElapsedTicksSinceSlot?.slotId ?? []) ??
      []),
    ...(normalizedTerms?.steps.flatMap((step) => step.excludes ?? []) ?? []),
  ]);
  const persons = new Set([
    ...profile.steps.flatMap((step) => step.takesCustodyOf ?? []),
    ...(normalizedTerms?.steps.flatMap((step) => step.takesCustodyOf ?? []) ?? []),
  ]);
  const cargoReceipts = [profile, ...(normalizedTerms ? [normalizedTerms] : [])].flatMap((source) =>
    source.steps.flatMap((step) => [
      ...(step.takesCargoId
        ? [
            {
              cargoId: step.takesCargoId,
              slotId: step.cargoReceiptSlotId!,
              transition: 'PICKUP',
            },
          ]
        : []),
      ...(step.deliversCargoId
        ? [
            {
              cargoId: step.deliversCargoId,
              slotId: step.cargoReceiptSlotId!,
              transition: 'DELIVERY',
            },
          ]
        : []),
    ]),
  );
  const cargos = new Set(cargoReceipts.map((receipt) => receipt.cargoId));
  const normalizedWithdrawal =
    lastWithdrawal === undefined || lastWithdrawal === null
      ? null
      : isRecord(lastWithdrawal) &&
          isText(lastWithdrawal['companyId']) &&
          isText(lastWithdrawal['sourceEventId']) &&
          isTick(lastWithdrawal['atTick'])
        ? { ...lastWithdrawal }
        : fail();
  const activeTerms = normalizedTerms ?? profile;
  const cargoFacts = Array.isArray(facts) ? (facts as OrdinaryContractFact[]) : [];
  const cargoCustodyRecords = Array.isArray(cargoCustody)
    ? (cargoCustody as OrdinaryContractState['cargoCustody'])
    : [];
  const expectedCargoCustody: OrdinaryContractState['cargoCustody'][number][] = [];
  let validCargoHistory = true;
  for (const cargoId of cargos) {
    const pickupStep = activeTerms.steps.find((step) => step.takesCargoId === cargoId);
    const deliveryStep = activeTerms.steps.find((step) => step.deliversCargoId === cargoId);
    if (!pickupStep) {
      validCargoHistory = false;
      break;
    }
    const pickupSlots = cargoReceipts
      .filter((receipt) => receipt.cargoId === cargoId && receipt.transition === 'PICKUP')
      .map((receipt) => receipt.slotId);
    const pickupFacts = cargoFacts.filter((fact) => pickupSlots.includes(fact.slotId));
    if (pickupFacts.length > 1) {
      validCargoHistory = false;
      break;
    }
    const pickupFact = pickupFacts[0];
    if (!pickupFact) continue;
    const deliverySlots = cargoReceipts
      .filter((receipt) => receipt.cargoId === cargoId && receipt.transition === 'DELIVERY')
      .map((receipt) => receipt.slotId);
    const deliveryFacts = deliveryStep
      ? cargoFacts.filter((fact) => deliverySlots.includes(fact.slotId))
      : [];
    if (
      deliveryFacts.length > 1 ||
      (deliveryFacts[0] !== undefined && deliveryFacts[0].companyId !== pickupFact.companyId)
    ) {
      validCargoHistory = false;
      break;
    }
    const lastCargoFact = deliveryFacts[0] ?? pickupFact;
    expectedCargoCustody.push({
      cargoId,
      companyId: deliveryFacts[0] ? null : pickupFact.companyId,
      pickupCompanyId: pickupFact.companyId,
      pickupSourceEventId: pickupFact.sourceEventId,
      pickupAtTick: pickupFact.atTick,
      sourceEventId: lastCargoFact.sourceEventId,
      atTick: lastCargoFact.atTick,
    });
  }
  const cargoStateMatchesHistory =
    validCargoHistory &&
    cargoCustodyRecords.length === expectedCargoCustody.length &&
    expectedCargoCustody.every((expected) =>
      cargoCustodyRecords.some(
        (actual) =>
          actual.cargoId === expected.cargoId &&
          actual.companyId === expected.companyId &&
          actual.pickupCompanyId === expected.pickupCompanyId &&
          actual.pickupSourceEventId === expected.pickupSourceEventId &&
          actual.pickupAtTick === expected.pickupAtTick &&
          actual.sourceEventId === expected.sourceEventId &&
          actual.atTick === expected.atTick,
      ),
    );
  if (
    record['version'] !== 1 ||
    record['instanceId'] !== profile.instanceId ||
    !isTick(record['revision']) ||
    !(record['ownerCompanyId'] === null || isText(record['ownerCompanyId'])) ||
    !(record['helperCompanyId'] === null || isText(record['helperCompanyId'])) ||
    !Array.isArray(facts) ||
    !Array.isArray(custody) ||
    !Array.isArray(cargoCustody) ||
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
        entry &&
        Object.keys(entry).every((key) => ['personId', 'companyId', 'travelMode'].includes(key)) &&
        persons.has(entry['personId'] as string) &&
        isText(entry['companyId']) &&
        (entry['travelMode'] === undefined ||
          entry['travelMode'] === 'ON_FOOT' ||
          entry['travelMode'] === 'STRETCHER'),
    ) ||
    !cargoCustody.every((entry: Record<string, unknown>) => {
      if (
        !entry ||
        !cargos.has(entry['cargoId'] as string) ||
        !(entry['companyId'] === null || isText(entry['companyId'])) ||
        !isText(entry['pickupCompanyId']) ||
        !isText(entry['pickupSourceEventId']) ||
        !isTick(entry['pickupAtTick']) ||
        !isText(entry['sourceEventId']) ||
        !isTick(entry['atTick'])
      )
        return false;
      const receipts = cargoReceipts.filter((receipt) => receipt.cargoId === entry['cargoId']);
      const pickup = receipts.find((receipt) => receipt.transition === 'PICKUP');
      const pickupIsRecorded =
        pickup !== undefined &&
        facts.some(
          (fact: Record<string, unknown>) =>
            fact['slotId'] === pickup.slotId &&
            fact['companyId'] === entry['pickupCompanyId'] &&
            fact['sourceEventId'] === entry['pickupSourceEventId'] &&
            fact['atTick'] === entry['pickupAtTick'],
        );
      const currentIsRecorded =
        entry['companyId'] === null
          ? receipts.some(
              (receipt) =>
                receipt.transition === 'DELIVERY' &&
                facts.some(
                  (fact: Record<string, unknown>) =>
                    fact['slotId'] === receipt.slotId &&
                    fact['companyId'] === entry['pickupCompanyId'] &&
                    fact['sourceEventId'] === entry['sourceEventId'] &&
                    fact['atTick'] === entry['atTick'],
                ),
            )
          : entry['companyId'] === entry['pickupCompanyId'] &&
            entry['sourceEventId'] === entry['pickupSourceEventId'] &&
            entry['atTick'] === entry['pickupAtTick'];
      return pickupIsRecorded && currentIsRecorded;
    }) ||
    new Set(cargoCustody.map((entry: Record<string, unknown>) => entry['cargoId'])).size !==
      cargoCustody.length ||
    !cargoStateMatchesHistory ||
    !(
      outcome === null ||
      (typeof outcome === 'object' &&
        (outcome as Record<string, unknown>)['kind'] === 'SUCCESS' &&
        isText((outcome as Record<string, unknown>)['companyId']) &&
        isText((outcome as Record<string, unknown>)['sourceEventId']) &&
        isTick((outcome as Record<string, unknown>)['atTick']) &&
        ((outcome as Record<string, unknown>)['payoutPolicy'] === undefined ||
          (outcome as Record<string, unknown>)['payoutPolicy'] === 'FULL_REWARD' ||
          (outcome as Record<string, unknown>)['payoutPolicy'] === 'NO_PAYOUT')) ||
      (typeof outcome === 'object' &&
        (outcome as Record<string, unknown>)['kind'] === 'EXPIRED' &&
        isText((outcome as Record<string, unknown>)['companyId']) &&
        isText((outcome as Record<string, unknown>)['sourceEventId']) &&
        isTick((outcome as Record<string, unknown>)['atTick']) &&
        ((outcome as Record<string, unknown>)['payoutPolicy'] === undefined ||
          (outcome as Record<string, unknown>)['payoutPolicy'] === 'FULL_REWARD' ||
          (outcome as Record<string, unknown>)['payoutPolicy'] === 'NO_PAYOUT'))
    )
  )
    return fail();
  const retainedForHeldPerson =
    ownerCompanyId === null &&
    normalizedTerms !== null &&
    normalizedWithdrawal !== null &&
    Array.isArray(custody) &&
    custody.some(
      (entry: Record<string, unknown>) =>
        isRecord(entry) &&
        entry['companyId'] === normalizedWithdrawal['companyId'] &&
        normalizedTerms.steps.some(
          (step) =>
            step.action === 'DELIVER' &&
            step.completes === true &&
            step.needsCustodyOf === entry['personId'],
        ),
    );
  if ((ownerCompanyId === null) !== (normalizedTerms === null) && !retainedForHeldPerson)
    return fail();
  return freeze({
    ...JSON.parse(JSON.stringify(record)),
    cargoCustody,
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
        'excludes',
        'resultTextKey',
        'terrainTarget',
        'takesCustodyOf',
        'custodyTravelMode',
        'needsCustodyOf',
        'takesCargoId',
        'needsCargoId',
        'deliversCargoId',
        'cargoReceiptSlotId',
        'returnsCargoAfterWithdrawal',
        'minElapsedTicksSinceSlot',
        'completes',
        'payoutPolicy',
        'postCompletion',
      ].includes(key),
    ) &&
    typeof value['stepId'] === 'string' &&
    ['INSPECT', 'ASK', 'SEARCH', 'RELEASE', 'REPORT', 'DELIVER', 'BUY', 'REST'].includes(
      value['action'] as string,
    ) &&
    isPlace(value['place']) &&
    (value['terrainTarget'] === undefined ||
      (isRecord(value['terrainTarget']) &&
        Object.keys(value['terrainTarget']).length === 4 &&
        typeof value['terrainTarget']['mapEdition'] === 'string' &&
        value['terrainTarget']['mapEdition'] !== '' &&
        Number.isSafeInteger(value['terrainTarget']['xFp']) &&
        Number.isSafeInteger(value['terrainTarget']['zFp']) &&
        Number.isSafeInteger(value['terrainTarget']['radiusFp']) &&
        Number(value['terrainTarget']['radiusFp']) > 0)) &&
    Array.isArray(value['requires']) &&
    value['requires'].every((slot) => typeof slot === 'string' && slot !== '') &&
    (value['forbids'] === undefined ||
      (Array.isArray(value['forbids']) &&
        value['forbids'].every((slot) => typeof slot === 'string' && slot !== ''))) &&
    Array.isArray(value['gates']) &&
    value['gates'].every((gate) =>
      [
        'DAYLIGHT',
        'RAIDERS_DEFEATED',
        'BEAST_DEFEATED',
        'HERBALIST_PRESENT',
        'HERBALIST_EXILED',
      ].includes(gate as string),
    ) &&
    Array.isArray(value['produces']) &&
    value['produces'].every((slot) => typeof slot === 'string' && slot !== '') &&
    (value['excludes'] === undefined ||
      (Array.isArray(value['excludes']) &&
        value['excludes'].every((slot) => typeof slot === 'string' && slot !== ''))) &&
    (value['resultTextKey'] === undefined ||
      (typeof value['resultTextKey'] === 'string' && value['resultTextKey'] !== '')) &&
    (value['takesCustodyOf'] === undefined ||
      (typeof value['takesCustodyOf'] === 'string' && value['takesCustodyOf'] !== '')) &&
    (value['custodyTravelMode'] === undefined ||
      value['custodyTravelMode'] === 'ON_FOOT' ||
      value['custodyTravelMode'] === 'STRETCHER') &&
    (value['needsCustodyOf'] === undefined ||
      (typeof value['needsCustodyOf'] === 'string' && value['needsCustodyOf'] !== '')) &&
    (value['takesCargoId'] === undefined ||
      (typeof value['takesCargoId'] === 'string' && value['takesCargoId'] !== '')) &&
    (value['needsCargoId'] === undefined ||
      (typeof value['needsCargoId'] === 'string' && value['needsCargoId'] !== '')) &&
    (value['deliversCargoId'] === undefined ||
      (typeof value['deliversCargoId'] === 'string' && value['deliversCargoId'] !== '')) &&
    (value['cargoReceiptSlotId'] === undefined ||
      (typeof value['cargoReceiptSlotId'] === 'string' &&
        value['produces'].includes(value['cargoReceiptSlotId']))) &&
    (value['takesCargoId'] === undefined && value['deliversCargoId'] === undefined) ===
      (value['cargoReceiptSlotId'] === undefined) &&
    (value['returnsCargoAfterWithdrawal'] === undefined ||
      value['returnsCargoAfterWithdrawal'] === true) &&
    (value['deliversCargoId'] === undefined ||
      value['needsCargoId'] === value['deliversCargoId']) &&
    (value['minElapsedTicksSinceSlot'] === undefined ||
      (isRecord(value['minElapsedTicksSinceSlot']) &&
        Object.keys(value['minElapsedTicksSinceSlot']).length === 2 &&
        typeof value['minElapsedTicksSinceSlot']['slotId'] === 'string' &&
        value['minElapsedTicksSinceSlot']['slotId'] !== '' &&
        typeof value['minElapsedTicksSinceSlot']['ticks'] === 'string' &&
        /^(0|[1-9][0-9]*)$/u.test(value['minElapsedTicksSinceSlot']['ticks']))) &&
    (value['completes'] === undefined || value['completes'] === true) &&
    (value['payoutPolicy'] === undefined ||
      value['payoutPolicy'] === 'FULL_REWARD' ||
      value['payoutPolicy'] === 'NO_PAYOUT') &&
    (value['postCompletion'] === undefined || value['postCompletion'] === true)
  );
}

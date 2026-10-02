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
  | 'ci.m1.mill-worker.01';

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
  readonly gates: readonly OrdinaryStepGate[];
  /** Source slots this step records for the acting company. */
  readonly produces: readonly string[];
  /** A person who travels with the acting company from now on. */
  readonly takesCustodyOf?: string;
  /** Needs the acting company to hold this person; ends custody. */
  readonly needsCustodyOf?: string;
  /** Completes the contract and pays the reward to the acting company. */
  readonly completes?: true;
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
]);

/** The slot pairs whose presence in any company's facts unlocks the mill-beast hunt (MILL-02). */
export const MILL_BEAST_UNLOCK_SLOTS = Object.freeze([
  'mill-worker-grain-cart-observation',
  'mill-worker-human-report',
] as const);

export function ordinaryContractProfile(instanceId: string): OrdinaryContractProfile | undefined {
  return ORDINARY_CONTRACT_PROFILES.find((profile) => profile.instanceId === instanceId);
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
    outcome: null,
  });
}

export type OrdinaryContractCommand =
  { readonly type: 'ACCEPT' | 'HELP' } | { readonly type: 'STEP'; readonly stepId: string };

export interface OrdinaryContractContext {
  readonly companyId: string;
  /** Where the company's party stands, or null while it is on a road. */
  readonly standingAt: ContractPlace | null;
  readonly atTick: string;
  readonly expectedRevision: string;
  /** Unique id of the accepted command; becomes the source of every fact it records. */
  readonly sourceEventId: string;
  readonly gates: Readonly<Record<OrdinaryStepGate, boolean>>;
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
  context: Omit<OrdinaryContractContext, 'expectedRevision' | 'sourceEventId' | 'atTick'>,
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

  if (command.type !== 'STEP') {
    if (state.outcome !== null) return { kind: 'REJECTED', code: 'NOT_AVAILABLE' };
    if (!samePlace(context.standingAt, profile.issuerPlace))
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
        facts:
          command.type === 'ACCEPT' && profile.acceptanceSlot !== undefined
            ? [...state.facts, fact(profile.acceptanceSlot)]
            : state.facts,
      }),
    };
  }

  const step = profile.steps.find((entry) => entry.stepId === command.stepId);
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
    payout: step.completes ? { companyId: context.companyId, rewardQ: profile.rewardQ } : null,
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
): OrdinaryContractState {
  const fail = () => {
    throw new TypeError(`Ordinary contract state for ${profile.instanceId} is invalid`);
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const record = value as Record<string, unknown>;
  const slots = new Set([
    ...(profile.acceptanceSlot ? [profile.acceptanceSlot] : []),
    ...profile.steps.flatMap((step) => step.produces),
  ]);
  const persons = new Set(profile.steps.flatMap((step) => step.takesCustodyOf ?? []));
  const isText = (entry: unknown): entry is string => typeof entry === 'string' && entry !== '';
  const isTick = (entry: unknown): entry is string =>
    typeof entry === 'string' && /^(0|[1-9][0-9]*)$/u.test(entry);
  const facts = record['facts'];
  const custody = record['custody'];
  const outcome = record['outcome'];
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
  return freeze(JSON.parse(JSON.stringify(record)) as OrdinaryContractState);
}

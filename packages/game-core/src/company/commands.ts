import {
  array,
  bool,
  canonicalJson,
  choice,
  either,
  freezeRegistry,
  id,
  isJsonData,
  jsonObject,
  natural,
  object,
  optional,
  signed,
  text,
  unsigned,
} from './input.js';
import type { ValueOf } from './input.js';
import { ASSIGNMENTS, COMPANY_COMMAND_SCHEMA_VERSION, COMPANY_RULESET_ID } from './model.js';
import { catalogueHas, COMPANY_CATALOGUE, EQUIPMENT_SLOTS } from './definitions.js';
import type { CanonicalRevision, PublicRevision } from './values.js';

export const INTERNAL_ACTORS = [
  'SYSTEM',
  'WORLD_RECEIPT',
  'DOMAIN_RECEIPT',
  'OUTCOME_RECEIPT',
  'COMBAT_RECEIPT',
] as const;
export type InternalActor = (typeof INTERNAL_ACTORS)[number];
export type ActorKind = 'PLAYER' | InternalActor;
const actor = object({ kind: choice('PLAYER', ...INTERNAL_ACTORS), id });
const ref = object({ kind: id, id });
const ownerRef = object({ kind: choice('CHARACTER', 'COMPANY', 'ESTATE', 'WORLD'), id });
const at = object({ kind: choice('AT'), siteId: id, areaId: id });
const transit = object({
  kind: choice('TRANSIT'),
  segmentId: id,
  from: id,
  to: id,
  startedAt: unsigned,
  arrivalNotBefore: unsigned,
});
const location = either(at, transit);
const identity = object({
  birthName: text,
  sex: id,
  birthCultureId: id,
  birthplaceId: id,
  originId: id,
  speciesId: id,
  bornAt: signed,
});
const goal = either(
  object({ skillId: id, targetLevel: optional(natural(0, 100)), maxTicks: unsigned }),
  object({ workId: id, sectionId: optional(id), maxTicks: unsigned }),
);
const quantity = object({ itemId: id, quantity: natural(1) });
const seizure = object({ itemId: id, toContainerId: id, authorizationId: id });
const ids = array(id, 0, 1000, true);

/** The only wire-shape registry. Gameplay predicates/handlers are later slices. */
export const COMPANY_COMMAND_INPUTS = freezeRegistry({
  CreateCompany: object({
    companyId: id,
    worldId: id,
    originId: id,
    cultureId: id,
    homelandId: id,
    familyStoryId: id,
    leaderInput: identity,
    candidateSetId: id,
    selectedCandidateIds: array(id, 1, 2, true),
    name: text,
    bannerId: id,
  }),
  Recruit: object({
    offerId: id,
    characterId: id,
    companyId: id,
    basis: choice('PAID', 'FAMILY'),
    offerRevision: unsigned,
    poolId: id,
  }),
  JoinFieldParty: object({ characterId: id, partyId: id, coLocationEvidenceId: id }),
  SetAssignment: object({
    characterId: id,
    assignment: choice(...ASSIGNMENTS),
    locationId: id,
    dutyEvidenceId: id,
    fundingPoolId: id,
  }),
  Arrive: object({ characterId: id, segmentId: id, arrivalEvidenceId: id }),
  RequestDeparture: object({
    membershipId: id,
    reason: choice('DISMISSED', 'WAGE_BREACH', 'CANONICAL_EVENT'),
    causeId: id,
    acknowledgedQuoteRevision: unsigned,
  }),
  ExecuteDeparture: object({
    membershipId: id,
    intentId: id,
    returnContainerId: id,
    careHandoverId: optional(id),
  }),
  PayClaims: object({
    poolId: id,
    amountQ: unsigned,
    claimIds: ids,
    mode: choice('DEFAULT', 'TARGETED'),
    payeeId: optional(id),
  }),
  GrantFarewell: object({
    membershipId: id,
    quoteRevision: unsigned,
    amountQ: unsigned,
    poolId: id,
  }),
  TransferFunds: object({ fromPoolId: id, toPoolId: id, amountQ: unsigned, accessEvidenceId: id }),
  // Opaque IDs resolve in a trusted adapter; raw outcome/XP/death objects are not inputs.
  AdvanceCampaign: object({ toTick: unsigned, authoritativeInputs: ids }),
  BeginFieldCamp: object({ partyId: id, siteEligibilityId: id }),
  EndMaintenance: object({
    agreementOrCampId: id,
    reason: choice('LEAVE', 'MOVE', 'ENCOUNTER', 'INCOMPATIBLE_DUTY'),
  }),
  AcceptSafeService: object({
    partyId: id,
    offerId: id,
    beneficiaryIds: array(id, 1, 6, true),
    fundingPoolId: id,
    quoteRevision: unsigned,
  }),
  AmendSafeService: object({
    agreementId: id,
    beneficiaryIds: array(id, 1, 6, true),
    quoteRevision: unsigned,
  }),
  StartLearning: object({
    characterId: id,
    methodId: id,
    goal,
    resourceIds: ids,
    budgetPoolId: id,
    maxBudgetQ: unsigned,
  }),
  StopLearning: object({ taskId: id, reason: choice('PLAYER', 'GOAL', 'FUNDS', 'PREREQUISITES') }),
  CreditPractice: object({
    receiptId: id,
    characterId: id,
    skillId: id,
    methodId: id,
    challengeLevel: natural(0, 100),
    outcome: choice('SUCCESS', 'MEANINGFUL_FAILURE'),
    effortTicks: unsigned,
  }),
  ChoosePerk: object({ characterId: id, perkId: id, milestone: choice(25, 60) }),
  StartRetraining: object({
    characterId: id,
    oldPerkId: id,
    newPerkId: id,
    mentorEvidenceId: id,
    budgetPoolId: id,
  }),
  ApplyCare: object({
    characterId: id,
    conditionId: id,
    careDefinitionId: id,
    resourceOrProviderReceiptId: id,
    budgetPoolId: optional(id),
  }),
  ApplyCondition: object({
    receiptId: id,
    characterId: id,
    conditionDefinitionId: id,
    causeId: id,
    deadlineTick: optional(unsigned),
  }),
  Observe: object({
    observationId: id,
    observerRef: ref,
    subjectRef: ref,
    factId: id,
    sourceId: id,
  }),
  Capture: object({
    receiptId: id,
    characterId: id,
    captorRef: ownerRef,
    locationRef: location,
    seizedItems: array(seizure),
  }),
  ReleaseCaptive: object({
    receiptId: id,
    characterId: id,
    route: choice('RANSOM', 'RESCUE', 'SELF_ESCAPE'),
    locationRef: location,
    proofId: id,
  }),
  TransferCaptive: object({
    receiptId: id,
    characterId: id,
    fromCustodianId: id,
    toCustodianId: id,
    locationRef: location,
    exchangeProofId: id,
  }),
  ResolveMissing: object({
    resolutionId: id,
    characterId: id,
    notBefore: unsigned,
    outcomeReceiptId: id,
  }),
  RecordDeath: object({
    receiptId: id,
    characterId: id,
    actualDeathTick: unsigned,
    causeId: id,
    custodyOutcomeId: id,
  }),
  ReturnToService: object({
    characterId: id,
    arrivalEvidenceId: id,
    assignment: choice('HOME_RESERVE', 'FIELD', 'RECOVERY'),
  }),
  DesignateHeir: object({ companyId: id, characterId: id }),
  ResolveLeadership: object({
    companyId: id,
    crisisId: id,
    candidateId: optional(id),
    mode: choice('PERMANENT', 'ACTING', 'REGENCY', 'CONFIRM_ACTING', 'RESTORE_HEIR'),
  }),
  ProposeNickname: object({ proposalId: id, characterId: id, sourceEventId: id, textKey: id }),
  ResolveNickname: object({ proposalId: id, accept: bool }),
  // Service-specific cosmetic keys are not specified by the source Notes. Kept raw,
  // never asserted to be an executable appearance change in this foundation.
  ChangePresentation: object({
    characterId: id,
    serviceEvidenceId: id,
    appearancePatch: jsonObject,
  }),
  RenameCompany: object({ companyId: id, name: text, bannerId: id }),
  TransferItem: object({
    itemId: id,
    quantity: natural(1),
    fromContainerId: id,
    toContainerId: id,
    accessEvidenceId: id,
    ownershipReceiptId: optional(id),
  }),
  EquipItem: object({
    characterId: id,
    itemId: id,
    slotId: choice(...EQUIPMENT_SLOTS),
    accessEvidenceId: id,
  }),
  RepairItem: object({
    itemId: id,
    repairUnits: natural(1),
    materialsContainerId: id,
    serviceReceiptId: optional(id),
  }),
  ClaimLoot: object({
    outcomeId: id,
    itemQuantities: array(quantity, 1),
    toContainerId: id,
    accessEvidenceId: id,
    claimAuthorizationId: id,
  }),
  ApplyContainerLifecycle: object({
    receiptId: id,
    containerId: id,
    causeId: id,
    notBefore: unsigned,
    disposition: choice('TRANSFER', 'DESTROY_WITH_CAUSE'),
    destinationId: optional(id),
  }),
  BeginEncounterBinding: object({
    bindingId: id,
    partyIds: array(id, 1, 1000, true),
    setupId: id,
    bridgeVersion: id,
    positionEvidenceId: id,
  }),
  // Bounded raw event data is not cast to CombatEvent. The V2 bridge will validate
  // kernel event semantics; today both receipt authorization and fail-closed dispatch apply.
  ConsumeCombatReceipt: object({
    bindingId: id,
    receiptId: id,
    revision: unsigned,
    orderedEvents: array(jsonObject),
  }),
  FinalizeEncounter: object({
    bindingId: id,
    terminalReceiptId: id,
    finalStateDigest: id,
    outcomeReceiptId: id,
  }),
});
export type CompanyCommandType = keyof typeof COMPANY_COMMAND_INPUTS;
export const COMPANY_COMMAND_TYPES = Object.freeze(
  Object.keys(COMPANY_COMMAND_INPUTS) as CompanyCommandType[],
);
export type CompanyCommandPayload<K extends CompanyCommandType> = ValueOf<
  (typeof COMPANY_COMMAND_INPUTS)[K]
>;
type AuthorityEnvelope =
  | {
      readonly actorRef: { readonly kind: 'PLAYER'; readonly id: string };
      readonly expectedRevision: PublicRevision;
    }
  | {
      readonly actorRef: { readonly kind: InternalActor; readonly id: string };
      readonly expectedRevision: CanonicalRevision;
    };
export type CompanyCommand = {
  [K in CompanyCommandType]: AuthorityEnvelope & {
    readonly schemaVersion: typeof COMPANY_COMMAND_SCHEMA_VERSION;
    readonly commandId: string;
    readonly worldId: string;
    readonly companyId: string;
    readonly campaignTick: string;
    readonly rulesetId: typeof COMPANY_RULESET_ID;
    readonly sourceEventId?: string;
    readonly type: K;
    readonly payload: CompanyCommandPayload<K>;
  };
}[CompanyCommandType];
const envelopeInput = object({
  schemaVersion: choice(COMPANY_COMMAND_SCHEMA_VERSION),
  commandId: id,
  worldId: id,
  companyId: id,
  actorRef: actor,
  expectedRevision: unsigned,
  campaignTick: unsigned,
  rulesetId: choice(COMPANY_RULESET_ID),
  sourceEventId: optional(id),
  type: id,
  payload: jsonObject,
});

export type CompanyInputError =
  'INVALID_COMMAND' | 'UNKNOWN_COMMAND' | 'UNKNOWN_DEFINITION' | 'INVALID_ARGUMENT';
export type CompanyParseResult =
  | { readonly ok: true; readonly command: CompanyCommand }
  | { readonly ok: false; readonly error: CompanyInputError };

function referencesValid(command: CompanyCommand): boolean {
  const has = (section: Parameters<typeof catalogueHas>[1], key: string): boolean =>
    catalogueHas(COMPANY_CATALOGUE, section, key);
  const p = command.payload;
  if ('skillId' in p && !has('skills', p.skillId)) return false;
  if ('perkId' in p && !has('perks', p.perkId)) return false;
  if ('methodId' in p && !has('methods', p.methodId)) return false;
  if ('careDefinitionId' in p && !has('cares', p.careDefinitionId)) return false;
  if ('conditionDefinitionId' in p && !has('conditions', p.conditionDefinitionId)) return false;
  if (command.type === 'CreateCompany') {
    const { originId, familyStoryId, leaderInput } = command.payload;
    return (
      has('origins', originId) &&
      has('familyStories', familyStoryId) &&
      has('species', leaderInput.speciesId) &&
      leaderInput.originId === originId &&
      COMPANY_CATALOGUE.origins.some(
        (o) => o.id === originId && o.familyStoryIds.includes(familyStoryId),
      )
    );
  }
  if (command.type === 'StartLearning') {
    const g = command.payload.goal;
    return 'skillId' in g
      ? has('skills', g.skillId)
      : COMPANY_CATALOGUE.works.some(
          (w) => w.id === g.workId && (!g.sectionId || w.sectionId === g.sectionId),
        );
  }
  if (command.type === 'StartRetraining')
    return has('perks', command.payload.oldPerkId) && has('perks', command.payload.newPerkId);
  return true;
}
function argumentsValid(command: CompanyCommand): boolean {
  const p = command.payload;
  if ('companyId' in p && p.companyId !== command.companyId) return false;
  if ('worldId' in p && p.worldId !== command.worldId) return false;
  if (
    'locationRef' in p &&
    p.locationRef.kind === 'TRANSIT' &&
    BigInt(p.locationRef.arrivalNotBefore) < BigInt(p.locationRef.startedAt)
  )
    return false;
  switch (command.type) {
    case 'CreateCompany':
      return (
        command.payload.leaderInput.birthCultureId === command.payload.cultureId &&
        BigInt(command.payload.leaderInput.bornAt) <= BigInt(command.campaignTick)
      );
    case 'PayClaims':
      return command.payload.mode === 'TARGETED'
        ? command.payload.payeeId !== undefined
        : command.payload.payeeId === undefined;
    case 'StartLearning': {
      const method = COMPANY_CATALOGUE.methods.find((m) => m.id === command.payload.methodId);
      return (
        BigInt(command.payload.goal.maxTicks) > 0n &&
        method !== undefined &&
        (method.interval === 'FINITE_SECTION') === 'workId' in command.payload.goal
      );
    }
    case 'CreditPractice': {
      const method = COMPANY_CATALOGUE.methods.find((m) => m.id === command.payload.methodId);
      if (!method || method.interval === 'FINITE_SECTION') return false;
      if (method.target === 'mapped-weapon')
        return ['blades', 'polearms', 'heavy', 'archery'].includes(command.payload.skillId);
      return method.target === 'task-skill' || method.target === command.payload.skillId;
    }
    case 'AdvanceCampaign':
      return BigInt(command.payload.toTick) >= BigInt(command.campaignTick);
    case 'RecordDeath':
      return BigInt(command.payload.actualDeathTick) <= BigInt(command.campaignTick);
    case 'ChoosePerk':
      return COMPANY_CATALOGUE.perks.some(
        (perk) =>
          perk.id === command.payload.perkId && perk.milestone === command.payload.milestone,
      );
    case 'StartRetraining': {
      const old = COMPANY_CATALOGUE.perks.find((perk) => perk.id === command.payload.oldPerkId);
      const next = COMPANY_CATALOGUE.perks.find((perk) => perk.id === command.payload.newPerkId);
      return (
        old !== undefined &&
        next !== undefined &&
        old.id !== next.id &&
        old.skillId === next.skillId &&
        old.milestone === next.milestone
      );
    }
    case 'ProposeNickname':
      return command.sourceEventId === command.payload.sourceEventId;
    case 'Capture':
      return (
        new Set(command.payload.seizedItems.map((i) => i.itemId)).size ===
        command.payload.seizedItems.length
      );
    case 'ClaimLoot':
      return (
        new Set(command.payload.itemQuantities.map((i) => i.itemId)).size ===
        command.payload.itemQuantities.length
      );
    case 'ApplyContainerLifecycle':
      return command.payload.disposition === 'TRANSFER'
        ? command.payload.destinationId !== undefined &&
            command.payload.destinationId !== command.payload.containerId
        : command.payload.destinationId === undefined;
    case 'ChangePresentation':
      return !Object.keys(command.payload.appearancePatch).some((key) =>
        [
          'birthName',
          'sex',
          'birthCultureId',
          'birthplaceId',
          'originId',
          'speciesId',
          'bornAt',
          'kinship',
          'scarHistory',
        ].includes(key),
      );
    default:
      return true;
  }
}
/** Syntax/finite references only. This success does NOT authorize or execute a command. */
export function parseCompanyCommand(value: unknown): CompanyParseResult {
  if (!isJsonData(value) || !envelopeInput.read(value))
    return { ok: false, error: 'INVALID_COMMAND' };
  if (!Object.hasOwn(COMPANY_COMMAND_INPUTS, value.type))
    return { ok: false, error: 'UNKNOWN_COMMAND' };
  const type = value.type as CompanyCommandType;
  if (!COMPANY_COMMAND_INPUTS[type].read(value.payload))
    return { ok: false, error: 'INVALID_COMMAND' };
  // Each discriminator selected its exact schema; revision strings are refined by actor kind.
  const command = value as unknown as CompanyCommand;
  if (!referencesValid(command)) return { ok: false, error: 'UNKNOWN_DEFINITION' };
  if (!argumentsValid(command)) return { ok: false, error: 'INVALID_ARGUMENT' };
  const copy = JSON.parse(canonicalJson(command)) as CompanyCommand;
  function freeze(item: unknown): void {
    if (item !== null && typeof item === 'object') {
      for (const child of Object.values(item)) freeze(child);
      Object.freeze(item);
    }
  }
  freeze(copy);
  return { ok: true, command: copy };
}

/** Exported from the same registry as runtime validation. Cross-record predicates are code. */
export const COMPANY_COMMAND_JSON_SCHEMA = freezeRegistry({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:warwrit:company-command:foundation-1',
  title: 'Company command transport shape (not authorization or gameplay execution)',
  oneOf: COMPANY_COMMAND_TYPES.map((type) => ({
    ...envelopeInput.schema,
    properties: {
      ...(envelopeInput.schema['properties'] as Readonly<Record<string, unknown>>),
      type: { const: type },
      payload: COMPANY_COMMAND_INPUTS[type].schema,
    },
  })),
});

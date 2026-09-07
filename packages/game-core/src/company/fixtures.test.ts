import { describe, expect, it } from 'vitest';
import {
  canonicalJson, canonicalRevision, checkFreshCompanyRevision, COMPANY_CATALOGUE, COMPANY_COMMAND_INPUTS,
  COMPANY_COMMAND_TYPES, COMPANY_COMMAND_JSON_SCHEMA, COMPANY_RULESET_ID, executeCompanyCommand, guardCompanyCommand, isJsonData,
  moneyQ, addMoney, subtractMoney, campaignTick, birthTick, publicRevision, parseCompanyCommand,
  requiredActor, validateCompanyCatalogue,
} from './index.js';
import type { CompanyCommandType, TrustedCompanyContext } from './index.js';

const identity = { birthName: 'Radomir', sex: 'male', birthCultureId: 'north', birthplaceId: 'home', originId: 'broken-company', speciesId: 'human', bornAt: '-6570000' };
const place = { kind: 'AT', siteId: 'home', areaId: 'square' };
const quantities = [{ itemId: 'item-1', quantity: 1 }];
/** Independent, explicit examples, not values sampled from the validators under test. */
export const PAYLOADS = {
  CreateCompany: { companyId: 'company-1', worldId: 'main', originId: 'broken-company', cultureId: 'north', homelandId: 'home', familyStoryId: 'no-present-kin', leaderInput: identity, candidateSetId: 'candidates-1', selectedCandidateIds: ['candidate-1'], name: 'First company', bannerId: 'banner-1' },
  Recruit: { offerId: 'offer-1', characterId: 'character-1', companyId: 'company-1', basis: 'PAID', offerRevision: '0', poolId: 'pool-1' },
  JoinFieldParty: { characterId: 'character-1', partyId: 'party-1', coLocationEvidenceId: 'meeting-1' },
  SetAssignment: { characterId: 'character-1', assignment: 'RECOVERY', locationId: 'home', dutyEvidenceId: 'handover-1', fundingPoolId: 'pool-1' },
  Arrive: { characterId: 'character-1', segmentId: 'segment-1', arrivalEvidenceId: 'arrival-1' },
  RequestDeparture: { membershipId: 'membership-1', reason: 'DISMISSED', causeId: 'cause-1', acknowledgedQuoteRevision: '0' },
  ExecuteDeparture: { membershipId: 'membership-1', intentId: 'intent-1', returnContainerId: 'container-1' },
  PayClaims: { poolId: 'pool-1', amountQ: '9007199254740993', claimIds: [], mode: 'DEFAULT' },
  GrantFarewell: { membershipId: 'membership-1', quoteRevision: '0', amountQ: '1000000', poolId: 'pool-1' },
  TransferFunds: { fromPoolId: 'pool-1', toPoolId: 'pool-2', amountQ: '1', accessEvidenceId: 'access-1' },
  AdvanceCampaign: { toTick: '2000', authoritativeInputs: ['input-1'] },
  BeginFieldCamp: { partyId: 'party-1', siteEligibilityId: 'site-1' },
  EndMaintenance: { agreementOrCampId: 'camp-1', reason: 'LEAVE' },
  AcceptSafeService: { partyId: 'party-1', offerId: 'offer-1', beneficiaryIds: ['character-1'], fundingPoolId: 'pool-1', quoteRevision: '0' },
  AmendSafeService: { agreementId: 'agreement-1', beneficiaryIds: ['character-1'], quoteRevision: '0' },
  StartLearning: { characterId: 'character-1', methodId: 'book-study', goal: { workId: 'small-unit-service', sectionId: 'small-unit-service-1', maxTicks: '1000' }, resourceIds: ['book-1'], budgetPoolId: 'pool-1', maxBudgetQ: '1000000' },
  StopLearning: { taskId: 'task-1', reason: 'PLAYER' },
  CreditPractice: { receiptId: 'receipt-1', characterId: 'character-1', skillId: 'blades', methodId: 'weapon-attack', challengeLevel: 5, outcome: 'MEANINGFUL_FAILURE', effortTicks: '1' },
  ChoosePerk: { characterId: 'character-1', perkId: 'blades-25-a', milestone: 25 },
  StartRetraining: { characterId: 'character-1', oldPerkId: 'blades-25-a', newPerkId: 'blades-25-b', mentorEvidenceId: 'mentor-1', budgetPoolId: 'pool-1' },
  ApplyCare: { characterId: 'character-1', conditionId: 'condition-1', careDefinitionId: 'wound-care', resourceOrProviderReceiptId: 'care-1' },
  ApplyCondition: { receiptId: 'receipt-1', characterId: 'character-1', conditionDefinitionId: 'critical-bleed', causeId: 'cause-1', deadlineTick: '1250' },
  Observe: { observationId: 'observation-1', observerRef: { kind: 'COMPANY', id: 'company-1' }, subjectRef: { kind: 'CHARACTER', id: 'character-1' }, factId: 'fact-1', sourceId: 'source-1' },
  Capture: { receiptId: 'receipt-1', characterId: 'character-1', captorRef: { kind: 'WORLD', id: 'bandits-1' }, locationRef: place, seizedItems: [{ itemId: 'item-1', toContainerId: 'container-1', authorizationId: 'seizure-1' }] },
  ReleaseCaptive: { receiptId: 'receipt-1', characterId: 'character-1', route: 'RESCUE', locationRef: place, proofId: 'release-1' },
  TransferCaptive: { receiptId: 'receipt-1', characterId: 'character-1', fromCustodianId: 'captor-1', toCustodianId: 'captor-2', locationRef: place, exchangeProofId: 'exchange-1' },
  ResolveMissing: { resolutionId: 'resolution-1', characterId: 'character-1', notBefore: '1000', outcomeReceiptId: 'outcome-1' },
  RecordDeath: { receiptId: 'receipt-1', characterId: 'character-1', actualDeathTick: '900', causeId: 'cause-1', custodyOutcomeId: 'outcome-1' },
  ReturnToService: { characterId: 'character-1', arrivalEvidenceId: 'arrival-1', assignment: 'RECOVERY' },
  DesignateHeir: { companyId: 'company-1', characterId: 'character-1' },
  ResolveLeadership: { companyId: 'company-1', crisisId: 'crisis-1', candidateId: 'character-1', mode: 'PERMANENT' },
  ProposeNickname: { proposalId: 'proposal-1', characterId: 'character-1', sourceEventId: 'source-1', textKey: 'the-watchful' },
  ResolveNickname: { proposalId: 'proposal-1', accept: true },
  ChangePresentation: { characterId: 'character-1', serviceEvidenceId: 'service-1', appearancePatch: {} },
  RenameCompany: { companyId: 'company-1', name: 'New name', bannerId: 'banner-2' },
  TransferItem: { itemId: 'item-1', quantity: 1, fromContainerId: 'container-1', toContainerId: 'container-2', accessEvidenceId: 'access-1' },
  EquipItem: { characterId: 'character-1', itemId: 'item-1', slotId: 'MAIN_HAND', accessEvidenceId: 'access-1' },
  RepairItem: { itemId: 'item-1', repairUnits: 1, materialsContainerId: 'container-1' },
  ClaimLoot: { outcomeId: 'outcome-1', itemQuantities: quantities, toContainerId: 'container-1', accessEvidenceId: 'access-1', claimAuthorizationId: 'claim-1' },
  ApplyContainerLifecycle: { receiptId: 'receipt-1', containerId: 'container-1', causeId: 'cause-1', notBefore: '1000', disposition: 'TRANSFER', destinationId: 'container-2' },
  BeginEncounterBinding: { bindingId: 'binding-1', partyIds: ['party-1'], setupId: 'setup-1', bridgeVersion: 'm1-domain-bridge-v1', positionEvidenceId: 'position-1' },
  ConsumeCombatReceipt: { bindingId: 'binding-1', receiptId: 'receipt-1', revision: '1', orderedEvents: [] },
  FinalizeEncounter: { bindingId: 'binding-1', terminalReceiptId: 'terminal-1', finalStateDigest: 'digest-1', outcomeReceiptId: 'outcome-1' },
} satisfies Record<CompanyCommandType, unknown>;
export function example(type: CompanyCommandType) {
  const initial = { schemaVersion: 1, commandId: `test-${type}`, worldId: 'main', companyId: 'company-1', campaignTick: '1000', rulesetId: COMPANY_RULESET_ID, sourceEventId: 'source-1', expectedRevision: '0', actorRef: { kind: 'PLAYER', id: 'actor-1' }, type, payload: PAYLOADS[type] };
  const parsed = parseCompanyCommand(initial);
  if (!parsed.ok) throw new Error(`Invalid fixture ${type}: ${parsed.error}`);
  return { ...initial, actorRef: { ...initial.actorRef, kind: requiredActor(parsed.command)[0]! } };
}
function contextFor(value: ReturnType<typeof example>): TrustedCompanyContext {
  return { worldId: value.worldId, companyId: value.companyId, principal: value.actorRef,
    publicRevision: publicRevision('0'), canonicalRevision: canonicalRevision('0'),
    internalGrant: { commandId: value.commandId, sourceEventId: value.sourceEventId, canonicalRequest: canonicalJson(value) } };
}

describe('WP-02.1 finite command boundary', () => {
  it('covers the 43 source commands with explicit independent fixtures', () => {
    expect(COMPANY_COMMAND_TYPES).toHaveLength(43);
    expect(Object.keys(PAYLOADS).sort()).toEqual([...COMPANY_COMMAND_TYPES].sort());
  });
  for (const type of COMPANY_COMMAND_TYPES) {
    it(`${type}: exact shape, actor authority, no mutation or successful placeholder`, () => {
      const value = example(type);
      const before = canonicalJson(value);
      const ctx = contextFor(value);
      expect(guardCompanyCommand(value, ctx).ok).toBe(true);
      expect(parseCompanyCommand({ ...value, unexpected: true }).ok).toBe(false);
      expect(parseCompanyCommand({ ...value, payload: { ...value.payload, unexpected: true } }).ok).toBe(false);
      expect(guardCompanyCommand(value, { ...ctx, companyId: 'other-company' }).ok).toBe(false);
      expect(guardCompanyCommand(value, { ...ctx, worldId: 'other-world' }).ok).toBe(false);
      const state = Object.freeze({ value: Object.freeze({ cash: '500' }) });
      const result = executeCompanyCommand(state, value, ctx);
      expect(result).toEqual({ ok: false, state, error: 'UNSUPPORTED_ACTION' });
      expect(result.state).toBe(state);
      expect(canonicalJson(value)).toBe(before);
      for (const key of Object.keys(COMPANY_COMMAND_INPUTS[type].schema['properties'] as object)) {
        if (!(COMPANY_COMMAND_INPUTS[type].schema['required'] as string[]).includes(key)) continue;
        const invalid: Record<string, unknown> = { ...value.payload };
        delete invalid[key];
        expect(parseCompanyCommand({ ...value, payload: invalid }).ok).toBe(false);
      }
    });
  }
  it('does not mistake declared receipt actors for authenticated authority', () => {
    const value = example('RecordDeath');
    const ctx = contextFor(value);
    expect(guardCompanyCommand(value, { ...ctx, principal: { kind: 'PLAYER', id: 'actor-1' } }).ok).toBe(false);
    const { internalGrant: _grant, ...withoutGrant } = ctx;
    expect(guardCompanyCommand(value, withoutGrant)).toEqual({ ok: false, error: 'INVALID_SOURCE' });
    expect(guardCompanyCommand({ ...value, payload: { ...value.payload, actualDeathTick: '800' } }, ctx)).toEqual({ ok: false, error: 'INVALID_SOURCE' });
    expect(parseCompanyCommand({ ...value, actorRef: { kind: 'SYSTEM_OR_PLAYER', id: 'actor-1' } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...value, internalGrant: ctx.internalGrant }).ok).toBe(false);
  });
  it('gates reason-dependent SYSTEM actions and permanent leadership choices', () => {
    for (const [type, reason] of [['RequestDeparture', 'WAGE_BREACH'], ['EndMaintenance', 'MOVE'], ['StopLearning', 'FUNDS']] as const) {
      const value = example(type);
      const changed = { ...value, payload: { ...value.payload, reason } };
      expect(guardCompanyCommand(changed, contextFor(value)).ok).toBe(false);
      const systemic = { ...changed, actorRef: { kind: 'SYSTEM' as const, id: 'actor-1' } };
      expect(guardCompanyCommand(systemic, contextFor(systemic)).ok).toBe(true);
    }
    const leadership = { ...example('ResolveLeadership'), actorRef: { kind: 'SYSTEM' as const, id: 'actor-1' } };
    expect(guardCompanyCommand(leadership, contextFor(leadership)).ok).toBe(false);
  });
  it('never uses internal revision for a player and keeps dedup before CAS possible', () => {
    const request = example('RenameCompany');
    const ctx = { ...contextFor(request), canonicalRevision: canonicalRevision('999') };
    const guarded = guardCompanyCommand(request, ctx);
    expect(guarded.ok).toBe(true);
    if (!guarded.ok) throw new Error('Expected authenticated request');
    expect(checkFreshCompanyRevision(guarded.command, ctx)).toBe(true);
    const stale = { ...ctx, publicRevision: publicRevision('1') };
    expect(guardCompanyCommand(request, stale).ok).toBe(true);
    expect(checkFreshCompanyRevision(guarded.command, stale)).toBe(false);
  });
  it('returns a detached immutable value after validation', () => {
    const request = example('RenameCompany');
    const parsed = parseCompanyCommand(request);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('Expected parsed value');
    expect(parsed.command).not.toBe(request);
    expect(Object.isFrozen(parsed.command.payload)).toBe(true);
  });
  it('freezes nested schema registries and rejects cross-discipline practice', () => {
    const shape = COMPANY_COMMAND_JSON_SCHEMA.oneOf[0]!;
    expect(Object.isFrozen(shape.properties.payload)).toBe(true);
    expect(Object.isFrozen(COMPANY_COMMAND_INPUTS.CreditPractice)).toBe(true);
    expect(parseCompanyCommand({ ...example('CreditPractice'), payload: { ...PAYLOADS.CreditPractice, methodId: 'care-provided' } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...example('StartLearning'), payload: { ...PAYLOADS.StartLearning, methodId: 'funded-practice' } }).ok).toBe(false);
    expect(isJsonData(new Proxy({}, { getPrototypeOf() { throw new Error('Hostile proxy'); } }))).toBe(false);
  });
  it('rejects disabled/unknown definitions, mismatched versions and references', () => {
    const value = example('CreditPractice');
    expect(parseCompanyCommand({ ...value, payload: { ...value.payload, skillId: 'alchemy-test' } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...value, payload: { ...value.payload, methodId: 'missing' } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...value, rulesetId: 's02-domain-provisional-0.1' }).ok).toBe(false);
    expect(parseCompanyCommand({ ...value, schemaVersion: 999 }).ok).toBe(false);
    expect(parseCompanyCommand({ ...value, type: '__proto__' }).ok).toBe(false);
    expect(parseCompanyCommand({ ...example('ChoosePerk'), payload: { characterId: 'character-1', perkId: 'blades-25-a', milestone: 60 } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...example('AdvanceCampaign'), payload: { toTick: '2000', authoritativeInputs: [{ actualStatus: 'DEAD' }] } }).ok).toBe(false);
  });
  it('rejects irreversible identity edits and malformed nested or extra fields', () => {
    const value = example('ChangePresentation');
    expect(parseCompanyCommand({ ...value, payload: { ...value.payload, appearancePatch: { birthName: 'replacement' } } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...example('CreateCompany'), payload: { ...PAYLOADS.CreateCompany, leaderInput: { ...identity, extra: true } } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...example('PayClaims'), payload: { ...PAYLOADS.PayClaims, mode: 'TARGETED' } }).ok).toBe(false);
    expect(parseCompanyCommand({ ...example('PayClaims'), payload: { ...PAYLOADS.PayClaims, amountQ: 9007199254740992 } }).ok).toBe(false);
  });
});

describe('WP-02.1 exact values and safe JSON', () => {
  it('preserves money beyond safe-number precision and fails invalid encodings closed', () => {
    expect(addMoney(moneyQ('9007199254740993'), moneyQ('1'))).toBe('9007199254740994');
    expect(subtractMoney(moneyQ('9007199254740993'), moneyQ('9007199254740992'))).toBe('1');
    expect(() => subtractMoney(moneyQ('0'), moneyQ('1'))).toThrow();
    for (const bad of [-1, 1, NaN, Infinity, '-1', '-0', '00', '01', '1e3', ' 1', '1.0', '', '1'.repeat(129)]) expect(() => moneyQ(bad)).toThrow();
    expect(birthTick('-6570000')).toBe('-6570000');
    expect(() => campaignTick('-1')).toThrow();
    for (let i = 0; i < 1000; i += 1) {
      const value = `${9007199254740993n + BigInt(i)}`;
      expect(subtractMoney(addMoney(moneyQ(value), moneyQ(`${i}`)), moneyQ(`${i}`))).toBe(value);
      expect(JSON.parse(JSON.stringify({ tick: campaignTick(value), money: moneyQ(value) }))).toEqual({ tick: value, money: value });
    }
  });
  it('canonicalizes key order but never rounds a JSON integer or invokes accessors', () => {
    expect(canonicalJson({ z: 1, a: { b: 2, a: '3' } })).toBe('{"a":{"a":"3","b":2},"z":1}');
    const cyclic: Record<string, unknown> = {}; cyclic['self'] = cyclic;
    const getter = Object.defineProperty({}, 'value', { get() { throw new Error('Must not execute'); }, enumerable: true });
    for (const bad of [cyclic, getter, new Date(), new Map(), undefined, 1n, Number.MAX_SAFE_INTEGER + 1, { x: undefined }, { x: Infinity }, { x: -0 }, new Array(2), { x: () => 1 }]) {
      expect(isJsonData(bad)).toBe(false);
      expect(() => canonicalJson(bad)).toThrow();
    }
    let deep: unknown = null;
    for (let i = 0; i < 25; i += 1) deep = { next: deep };
    expect(isJsonData(deep)).toBe(false);
  });
  it('keeps public and canonical revision brands distinct at compile time', () => {
    const value = publicRevision('0');
    // @ts-expect-error A public projection token must never be used as canonical CAS.
    const invalid: ReturnType<typeof canonicalRevision> = value;
    expect(invalid).toBe('0');
  });
});

describe('WP-02.1 finite catalogue', () => {
  it('preserves the source counts, profile0.2 and disabled fixtures without mutable globals', () => {
    expect(validateCompanyCatalogue(COMPANY_CATALOGUE)).toEqual([]);
    expect(COMPANY_CATALOGUE.skills.filter((s) => s.enabled)).toHaveLength(8);
    expect(COMPANY_CATALOGUE.perks).toHaveLength(32);
    expect(COMPANY_CATALOGUE.origins).toHaveLength(6);
    expect(COMPANY_CATALOGUE.items).toHaveLength(15);
    expect(COMPANY_CATALOGUE.works).toHaveLength(3);
    expect(COMPANY_CATALOGUE.conditions).toHaveLength(4);
    expect(COMPANY_CATALOGUE.conditions[0]?.recoveryTicks).toBe('50');
    expect(Object.isFrozen(COMPANY_CATALOGUE.items[0])).toBe(true);
  });
  it('rejects invalid definitions, duplicate IDs, references and versions', () => {
    expect(validateCompanyCatalogue({ ...COMPANY_CATALOGUE, version: 'unknown' })).toContain('UNSUPPORTED_CATALOGUE_VERSION');
    expect(validateCompanyCatalogue({ ...COMPANY_CATALOGUE, skills: [...COMPANY_CATALOGUE.skills, COMPANY_CATALOGUE.skills[0]] })).toContain('DUPLICATE_ID:skills');
    expect(validateCompanyCatalogue({ ...COMPANY_CATALOGUE, species: [{ id: 'human', enabled: true, bodyId: 'missing', adultAtDays: 6570 }] }).some((e) => e.startsWith('BROKEN_REFERENCE'))).toBe(true);
    expect(validateCompanyCatalogue({ ...COMPANY_CATALOGUE, items: [{ ...COMPANY_CATALOGUE.items[0], weightG: -1 }] })).toEqual(['INVALID_CATALOGUE_SHAPE']);
    expect(validateCompanyCatalogue({ ...COMPANY_CATALOGUE, perks: [{ ...COMPANY_CATALOGUE.perks[0], skillId: 'alchemy-test' }] }).some((e) => e.startsWith('BROKEN_REFERENCE'))).toBe(true);
  });
});

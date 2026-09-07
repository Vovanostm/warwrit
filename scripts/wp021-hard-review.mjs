// Audit-only executable evidence. Never import this into gameplay or merge this audit branch.
// Reviewed production tree: 3d90bfa496b15123097344a6de1d9b89231d7ebd.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import {
  parseCompanyCommand, guardCompanyCommand, checkFreshCompanyRevision,
  canonicalJson, isJsonData, moneyQ, addMoney, subtractMoney, campaignTick,
  publicRevision, canonicalRevision, birthTick, COMPANY_CATALOGUE, COMPANY_RULES,
  COMPANY_COMMAND_JSON_SCHEMA, CATALOGUE_SECTIONS, validateCompanyCatalogue,
} from '../packages/game-core/dist/company/index.js';
import { signed } from '../packages/game-core/dist/company/input.js';

const require = createRequire(import.meta.url);
const Ajv2020 = require(`${process.env.REVIEW_DEPS}/node_modules/ajv/dist/2020.js`).default;
const ajv = new Ajv2020({ strict: false, allErrors: true });
const validateWire = ajv.compile(COMPANY_COMMAND_JSON_SCHEMA);
const validateSigned = ajv.compile(signed.schema);
const payload = { companyId: 'company-1', name: 'Company', bannerId: 'banner-1' };
const make = (type = 'RenameCompany', data = payload, actorKind = 'PLAYER') => ({
  schemaVersion: 1, commandId: 'command-1', worldId: 'main', companyId: 'company-1',
  actorRef: { kind: actorKind, id: 'principal-1' }, expectedRevision: '0', campaignTick: '1000',
  rulesetId: 's02-domain-provisional-0.2', sourceEventId: 'source-1', type, payload: data,
});
const context = (cmd) => ({
  worldId: cmd.worldId, companyId: cmd.companyId, principal: cmd.actorRef,
  publicRevision: publicRevision('0'), canonicalRevision: canonicalRevision('0'),
  internalGrant: { commandId: cmd.commandId, sourceEventId: cmd.sourceEventId, canonicalRequest: canonicalJson(cmd) },
});
const observe = (id, details) => console.log(`REVIEW_OBSERVATION ${JSON.stringify({ id, ...details })}`);
function parity(id, cmd) {
  const schema = validateWire(cmd);
  const result = parseCompanyCommand(cmd);
  observe(id, { schema, runtime: result.ok, runtimeError: result.ok ? null : result.error });
  assert.equal(result.ok, schema, 'structural wire constraints disagree; no state/auth predicate involved');
}

// Positive controls: these should remain green in a correction.
test('CONTROL-01 valid command and detached immutable output', () => {
  const cmd = make();
  assert.equal(validateWire(cmd), true);
  const parsed = parseCompanyCommand(cmd);
  assert.equal(parsed.ok, true);
  assert.notEqual(parsed.command, cmd);
  assert.equal(Object.isFrozen(parsed.command.payload), true);
  assert.deepEqual(parsed.command, cmd);
});
test('CONTROL-02 exact arithmetic 10000 independent roundtrips', () => {
  for (let i = 0n; i < 10000n; i += 1n) {
    const a = 9007199254740993n + i * 982451653n;
    const b = i * i;
    const actual = addMoney(moneyQ(String(a)), moneyQ(String(b)));
    assert.equal(actual, String(a + b));
    assert.equal(subtractMoney(actual, moneyQ(String(b))), String(a));
  }
});
test('CONTROL-03 canonical numeric encodings reject whitespace and underflow', () => {
  for (const v of ['1\n', '1\r', '1\r\n', '1\u2028', ' 1', '01', '1e3', '-0', '-1', 1, NaN, Infinity]) assert.throws(() => moneyQ(v));
  assert.throws(() => subtractMoney(moneyQ('0'), moneyQ('1')));
  assert.equal(birthTick('-6570000'), '-6570000');
  assert.throws(() => campaignTick('-1'));
});
test('CONTROL-04 public revision is unaffected by private-only revision changes', () => {
  const cmd = make(); const ctx = context(cmd); const parsed = parseCompanyCommand(cmd);
  assert.equal(checkFreshCompanyRevision(parsed.command, { ...ctx, canonicalRevision: canonicalRevision('99') }), true);
  assert.equal(guardCompanyCommand(cmd, { ...ctx, publicRevision: publicRevision('1') }).ok, true);
  assert.equal(checkFreshCompanyRevision(parsed.command, { ...ctx, publicRevision: publicRevision('1') }), false);
});
test('CONTROL-05 wrong tenant or forged principal is rejected', () => {
  const cmd = make(); const ctx = context(cmd);
  assert.equal(guardCompanyCommand(cmd, { ...ctx, companyId: 'other' }).ok, false);
  assert.equal(guardCompanyCommand(cmd, { ...ctx, worldId: 'other' }).ok, false);
  assert.equal(guardCompanyCommand(cmd, { ...ctx, principal: { kind: 'SYSTEM', id: 'principal-1' } }).ok, false);
});
test('CONTROL-06 nested unknown field is rejected and published catalogue remains frozen', () => {
  assert.equal(parseCompanyCommand(make('RenameCompany', { ...payload, unexpected: true })).ok, false);
  assert.deepEqual(validateCompanyCatalogue(COMPANY_CATALOGUE), []);
  assert.equal(Object.isFrozen(COMPANY_CATALOGUE.items[0]), true);
  assert.equal(Object.isFrozen(COMPANY_RULES), true);
});

// Differential tests use an independent standards validator, not the implementation's own read().
test('SHAPE-01 leading whitespace in an ID has identical schema/runtime meaning', () => {
  parity('SHAPE-01', { ...make(), commandId: ' command-1' });
});
test('SHAPE-02 control character in an ID has identical schema/runtime meaning', () => {
  parity('SHAPE-02', { ...make(), commandId: 'command\u0000-1' });
});
test('SHAPE-03 non-BMP text length has identical schema/runtime meaning', () => {
  parity('SHAPE-03', make('RenameCompany', { ...payload, name: '\u{1f43a}'.repeat(2049) }));
});
test('SHAPE-04 positive signed integer maximum digits matches its exported schema', () => {
  const value = '1'.repeat(129);
  const schema = validateSigned(value); const runtime = signed.read(value);
  observe('SHAPE-04', { digits: value.length, schema, runtime });
  assert.equal(runtime, schema);
});
test('SHAPE-05 raw object property count matches its exported schema', () => {
  const appearancePatch = Object.fromEntries(Array.from({ length: 1001 }, (_, i) => [`k${i}`, 1]));
  parity('SHAPE-05', make('ChangePresentation', { characterId: 'character-1', serviceEvidenceId: 'service-1', appearancePatch }));
});

// In-process caller contract, not a claim that JSON clients can transmit JavaScript classes.
test('DATA-01 array subclasses cannot change data after validation during normalization', () => {
  class NonDataArray extends Array {
    map() { return ['null']; }
  }
  const cmd = make('PayClaims', { poolId: 'pool-1', amountQ: '1', claimIds: new NonDataArray('claim-1'), mode: 'DEFAULT' });
  const before = isJsonData(cmd);
  const result = parseCompanyCommand(cmd);
  const reparsed = result.ok ? parseCompanyCommand(result.command) : null;
  observe('DATA-01', { isJsonData: before, parsed: result.ok, reparsed: reparsed?.ok, outputClaims: result.ok ? result.command.payload.claimIds : null });
  assert.equal(result.ok, false, 'non-data arrays must not produce an invalid accepted CompanyCommand');
});
test('DATA-02 catalogue validation cannot be changed through an exported readonly array', () => {
  const bad = structuredClone(COMPANY_CATALOGUE);
  bad.items.push(structuredClone(bad.items[0]));
  const before = validateCompanyCatalogue(bad);
  const saved = [...CATALOGUE_SECTIONS];
  let after;
  try {
    if (!Object.isFrozen(CATALOGUE_SECTIONS)) CATALOGUE_SECTIONS.splice(0);
    after = validateCompanyCatalogue(bad);
  } finally {
    if (!Object.isFrozen(CATALOGUE_SECTIONS)) CATALOGUE_SECTIONS.push(...saved);
  }
  observe('DATA-02', { frozen: Object.isFrozen(CATALOGUE_SECTIONS), before, after });
  assert.deepEqual(after, before, 'the same explicit input must not lose duplicate-ID validation');
});

// These are stateless command contract assertions, not requests for full gameplay reducers.
test('CONTRACT-01 a critical condition receipt carries its explicit deadline', () => {
  const cmd = make('ApplyCondition', { receiptId: 'receipt-1', characterId: 'character-1', conditionDefinitionId: 'critical-bleed', causeId: 'cause-1' }, 'DOMAIN_RECEIPT');
  const result = guardCompanyCommand(cmd, context(cmd));
  observe('CONTRACT-01', { guarded: result.ok, expected: 'explicit critical deadline; source rec3eMARPK5nj4pMD' });
  assert.equal(result.ok, false);
});
test('CONTRACT-02 a future container lifecycle receipt is not yet applicable', () => {
  const cmd = make('ApplyContainerLifecycle', { receiptId: 'receipt-1', containerId: 'container-1', causeId: 'cause-1', notBefore: '1001', disposition: 'DESTROY_WITH_CAUSE' }, 'WORLD_RECEIPT');
  const result = guardCompanyCommand(cmd, context(cmd));
  observe('CONTRACT-02', { campaignTick: cmd.campaignTick, notBefore: cmd.payload.notBefore, guarded: result.ok });
  assert.equal(result.ok, false);
});
test('CONTRACT-03 discrete medicine practice cannot become a timed blades learning task', () => {
  const cmd = make('StartLearning', { characterId: 'character-1', methodId: 'care-provided', goal: { skillId: 'blades', maxTicks: '10' }, resourceIds: ['medical-1'], budgetPoolId: 'pool-1', maxBudgetQ: '1' });
  const result = parseCompanyCommand(cmd);
  observe('CONTRACT-03', { parsed: result.ok, method: 'care-provided/EVENT/medicine', goal: 'blades' });
  assert.equal(result.ok, false);
});

test('OBSERVATION-01 DEFAULT claim subset remains an explicit later handler boundary', () => {
  const result = parseCompanyCommand(make('PayClaims', { poolId: 'pool-1', amountQ: '1', claimIds: ['selected-only'], mode: 'DEFAULT' }));
  observe('OBSERVATION-01', { parsed: result.ok, note: 'Do not claim payment exploitation; no payroll handler exists. Handler must ignore or reject a client DEFAULT subset per C04.' });
});

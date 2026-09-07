import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Ajv2020 } from 'ajv/dist/2020.js';
import {
  addMoney,
  subtractMoney,
  moneyQ,
  birthTick,
  campaignTick,
  canonicalJson,
  publicRevision,
  canonicalRevision,
  parseCompanyCommand,
  guardCompanyCommand,
  checkFreshCompanyRevision,
  executeCompanyCommand,
  COMPANY_RULESET_ID,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_COMMAND_JSON_SCHEMA,
  COMPANY_CATALOGUE,
  CATALOGUE_SECTIONS,
  validateCompanyCatalogue,
  STRING_INPUTS,
} from '@warwrit/game-core';
import type { ActorKind, CompanyCommandType, TrustedCompanyContext } from '@warwrit/game-core';

// Stable application boundary, not a parallel catalogue of every command and field.
function request(type: CompanyCommandType, payload: unknown, actor: ActorKind = 'PLAYER') {
  return {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: 'command',
    worldId: 'main',
    companyId: 'company',
    actorRef: { kind: actor, id: 'principal' },
    expectedRevision: '0',
    campaignTick: '100',
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId: 'source',
    type,
    payload,
  };
}
function trusted(value: ReturnType<typeof request>): TrustedCompanyContext {
  return {
    companyId: value.companyId,
    worldId: value.worldId,
    principal: value.actorRef,
    publicRevision: publicRevision('0'),
    canonicalRevision: canonicalRevision('0'),
    internalGrant: {
      commandId: value.commandId,
      sourceEventId: value.sourceEventId,
      canonicalRequest: canonicalJson(value),
    },
  };
}
const rename = () =>
  request('RenameCompany', { companyId: 'company', name: 'Company', bannerId: 'banner' });
const death = () =>
  request(
    'RecordDeath',
    {
      receiptId: 'receipt',
      characterId: 'person',
      actualDeathTick: '99',
      causeId: 'cause',
      custodyOutcomeId: 'custody',
    },
    'OUTCOME_RECEIPT',
  );
const schema = new Ajv2020({ strict: false });

describe('Company core principles', () => {
  it('conserves exact money across arithmetic and serialization without silent coercion', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 2n ** 200n }),
        fc.bigInt({ min: 0n, max: 2n ** 100n }),
        (a, b) => {
          const total = addMoney(moneyQ(String(a)), moneyQ(String(b)));
          expect(total).toBe(String(a + b));
          expect(subtractMoney(total, moneyQ(String(b)))).toBe(String(a));
          expect(JSON.parse(JSON.stringify(total))).toBe(total);
        },
      ),
      { seed: 2101, numRuns: 200 },
    );
    for (const value of [-1, 1, NaN, Infinity, '-1', '-0', '01', '1e3', ' 1', '1.0', '1\n', '1\r'])
      expect(() => moneyQ(value)).toThrow();
    expect(() => subtractMoney(moneyQ('0'), moneyQ('1'))).toThrow();
    expect(birthTick('-1')).toBe('-1');
    expect(() => campaignTick('-1')).toThrow();
  });

  it('returns a detached, immutable, value-preserving command that validates again', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 80 }), (name) => {
        const input = { ...rename(), payload: { companyId: 'company', name, bannerId: 'banner' } };
        const parsed = parseCompanyCommand(input);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) throw new Error('Expected a valid presentation');
        expect(parsed.command).toEqual(input);
        expect(parsed.command).not.toBe(input);
        expect(parseCompanyCommand(parsed.command)).toEqual(parsed);
        expect(Reflect.set(parsed.command.payload, 'name', 'changed')).toBe(false);
        input.payload.name = name + ' changed';
        expect(canonicalJson(parsed.command)).not.toBe(canonicalJson(input));
      }),
      { seed: 2102, numRuns: 100 },
    );
    expect(canonicalJson({ z: 0, a: [1, '2'] })).toBe(canonicalJson({ a: [1, '2'], z: 0 }));
  });

  it('rejects executable or malformed data and leaves state unchanged', () => {
    class NonDataArray extends Array<string> {
      override map(): never[] {
        throw new Error('Caller method');
      }
    }
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    const getter = Object.defineProperty({}, 'x', {
      enumerable: true,
      get() {
        throw new Error('Caller getter');
      },
    });
    const cases = [
      cycle,
      getter,
      new NonDataArray('claim'),
      new Array(2),
      { value: undefined },
      new Proxy(
        {},
        {
          getPrototypeOf() {
            throw new Error('Caller trap');
          },
        },
      ),
    ];
    const state = Object.freeze({ cash: '1' });
    for (const payload of cases) {
      const input = request('PayClaims', payload);
      expect(parseCompanyCommand(input).ok).toBe(false);
      expect(executeCompanyCommand(state, input, trusted(rename())).state).toBe(state);
    }
    expect(executeCompanyCommand(state, rename(), trusted(rename()))).toEqual({
      ok: false,
      state,
      error: 'UNSUPPORTED_ACTION',
    });
    const input = request('PayClaims', {
      poolId: 'pool',
      amountQ: '1',
      claimIds: new NonDataArray('claim'),
      mode: 'TARGETED',
      payeeId: 'payee',
    });
    expect(parseCompanyCommand(input).ok).toBe(false); // R2: nested subclass, not just a wrong payload type.
  });

  it('requires authenticated tenant, principal and an unchanged source-bound request', () => {
    const input = death();
    const context = trusted(input);
    expect(guardCompanyCommand(input, context).ok).toBe(true);
    for (const changed of [
      { ...context, companyId: 'other' },
      { ...context, worldId: 'other' },
      { ...context, principal: { kind: 'PLAYER' as const, id: 'principal' } },
      { ...context, principal: { kind: 'OUTCOME_RECEIPT' as const, id: 'forged' } },
    ])
      expect(guardCompanyCommand(input, changed).ok).toBe(false);
    const { internalGrant: _grant, ...noGrant } = context;
    expect(guardCompanyCommand(input, noGrant).ok).toBe(false);
    expect(guardCompanyCommand({ ...input, campaignTick: '101' }, context).ok).toBe(false);
    expect(
      guardCompanyCommand(
        { ...input, payload: { ...(input.payload as object), actualDeathTick: '98' } },
        context,
      ).ok,
    ).toBe(false);
  });

  it('does not let players declare systemic causes or the system choose a permanent leader', () => {
    const causes = [
      request('RequestDeparture', {
        membershipId: 'member',
        reason: 'WAGE_BREACH',
        causeId: 'cause',
        acknowledgedQuoteRevision: '0',
      }),
      request('EndMaintenance', { agreementOrCampId: 'camp', reason: 'MOVE' }),
      request('StopLearning', { taskId: 'task', reason: 'FUNDS' }),
    ];
    for (const input of causes) {
      expect(guardCompanyCommand(input, trusted(input)).ok).toBe(false);
      const systemic = { ...input, actorRef: { kind: 'SYSTEM' as const, id: 'principal' } };
      expect(guardCompanyCommand(systemic, trusted(systemic)).ok).toBe(true);
    }
    const input = request(
      'ResolveLeadership',
      { companyId: 'company', crisisId: 'crisis', candidateId: 'person', mode: 'PERMANENT' },
      'SYSTEM',
    );
    expect(guardCompanyCommand(input, trusted(input)).ok).toBe(false);
  });

  it('keeps private revisions invisible and permits receipt lookup before fresh-command CAS', () => {
    const input = rename();
    const context = trusted(input);
    const parsed = guardCompanyCommand(input, context);
    if (!parsed.ok) throw new Error('Expected authorized command');
    const privateChange = { ...context, canonicalRevision: canonicalRevision('123') };
    expect(guardCompanyCommand(input, privateChange)).toEqual(parsed);
    expect(checkFreshCompanyRevision(parsed.command, privateChange)).toBe(true);
    const publicChange = { ...context, publicRevision: publicRevision('1') };
    expect(guardCompanyCommand(input, publicChange).ok).toBe(true);
    expect(checkFreshCompanyRevision(parsed.command, publicChange)).toBe(false);
  });

  it('agrees with the standard schema on primitive limits, Unicode and canonical encodings', () => {
    for (const input of Object.values(STRING_INPUTS)) {
      const validate = schema.compile(input.schema);
      const limit = input.schema.maxLength;
      const cases = [
        '',
        '0',
        '-1',
        '-0',
        '01',
        '1e3',
        ' id',
        'id ',
        'id\n',
        '1\n',
        '1\r',
        'i\0d',
        1,
        ...[limit - 1, limit, limit + 1].flatMap((n) => [
          '9'.repeat(n),
          '-' + '9'.repeat(n),
          '🐺'.repeat(n),
        ]),
      ];
      for (const value of cases)
        expect(input.read(value), JSON.stringify(value).slice(0, 70)).toBe(validate(value));
    }
    const validate = schema.compile(COMPANY_COMMAND_JSON_SCHEMA);
    const rawLimit = 1000; // Bounded wire data, not a balance value or catalogue count.
    for (const count of [rawLimit - 1, rawLimit, rawLimit + 1]) {
      const input = request('ChangePresentation', {
        characterId: 'person',
        serviceEvidenceId: 'service',
        appearancePatch: Object.fromEntries(
          Array.from({ length: count }, (_, i) => ['key' + i, i]),
        ),
      });
      expect(parseCompanyCommand(input).ok).toBe(validate(input));
    }
    const invalid = {
      ...rename(),
      payload: { companyId: 'company', name: 'X', bannerId: 'banner', cash: '999' },
    };
    expect(validate(invalid)).toBe(false);
    expect(parseCompanyCommand(invalid).ok).toBe(false);
  });

  it('keeps catalogue validation deterministic despite attempted external metadata changes', () => {
    const item = COMPANY_CATALOGUE.items[0]!;
    const duplicate = { ...COMPANY_CATALOGUE, items: [item, item] };
    const errors = validateCompanyCatalogue(duplicate);
    expect(errors).toContain('DUPLICATE_ID:items');
    try {
      (CATALOGUE_SECTIONS as unknown as string[]).splice(0);
    } catch {
      /* Expected for immutable metadata. */
    }
    expect(validateCompanyCatalogue(duplicate)).toEqual(errors);
    expect(Reflect.set(item, 'id', 'changed')).toBe(false);
    expect(validateCompanyCatalogue(COMPANY_CATALOGUE)).toEqual([]);
    const unknown = {
      ...COMPANY_CATALOGUE,
      species: [{ ...COMPANY_CATALOGUE.species[0], bodyId: 'missing-body' }],
    };
    expect(
      validateCompanyCatalogue(unknown).some((error) => error.startsWith('BROKEN_REFERENCE')),
    ).toBe(true);
  });

  it('rejects unknown versions and definitions without freezing provisional content', () => {
    expect(parseCompanyCommand({ ...rename(), rulesetId: 'unknown' }).ok).toBe(false);
    expect(parseCompanyCommand({ ...rename(), schemaVersion: -1 }).ok).toBe(false);
    const input = request('ChoosePerk', {
      characterId: 'person',
      perkId: 'missing-perk',
      milestone: 25,
    });
    expect(parseCompanyCommand(input).ok).toBe(false);
    const disabled = COMPANY_CATALOGUE.methods.find((method) => !method.enabled)!;
    expect(
      parseCompanyCommand(
        request('StartLearning', {
          characterId: 'person',
          methodId: disabled.id,
          goal: { skillId: disabled.target, maxTicks: '1' },
          resourceIds: [],
          budgetPoolId: 'pool',
          maxBudgetQ: '1',
        }),
      ).ok,
    ).toBe(false);
  });

  it('admits learning only for a finite compatible task, not a discrete event in another discipline', () => {
    const task = {
      characterId: 'person',
      methodId: 'funded-practice',
      goal: { skillId: 'blades', maxTicks: '1' },
      resourceIds: [],
      budgetPoolId: 'pool',
      maxBudgetQ: '1',
    };
    expect(parseCompanyCommand(request('StartLearning', task)).ok).toBe(true);
    expect(
      parseCompanyCommand(request('StartLearning', { ...task, methodId: 'care-provided' })).ok,
    ).toBe(false);
    expect(
      parseCompanyCommand(
        request('StartLearning', { ...task, goal: { ...task.goal, maxTicks: '0' } }),
      ).ok,
    ).toBe(false);
  });

  it('requires an explicit critical deadline and rejects premature application requests', () => {
    const critical = COMPANY_CATALOGUE.conditions.find(
      (condition) => condition.category === 'CRITICAL',
    )!;
    const condition = {
      receiptId: 'receipt',
      characterId: 'person',
      conditionDefinitionId: critical.id,
      causeId: 'cause',
    };
    expect(parseCompanyCommand(request('ApplyCondition', condition)).ok).toBe(false);
    expect(
      parseCompanyCommand(request('ApplyCondition', { ...condition, deadlineTick: '101' })).ok,
    ).toBe(true);
    const lifecycle = {
      receiptId: 'receipt',
      containerId: 'container',
      causeId: 'cause',
      notBefore: '101',
      disposition: 'DESTROY_WITH_CAUSE',
    };
    expect(parseCompanyCommand(request('ApplyContainerLifecycle', lifecycle)).ok).toBe(false);
    expect(
      parseCompanyCommand(request('ApplyContainerLifecycle', { ...lifecycle, notBefore: '100' }))
        .ok,
    ).toBe(true);
  });

  it('does not let ordinary payroll narrow the due set through a client-selected subset', () => {
    const payment = { poolId: 'pool', amountQ: '1', mode: 'DEFAULT', claimIds: [] };
    expect(parseCompanyCommand(request('PayClaims', payment)).ok).toBe(true);
    expect(parseCompanyCommand(request('PayClaims', { ...payment, claimIds: ['claim'] })).ok).toBe(
      false,
    );
    expect(
      parseCompanyCommand(
        request('PayClaims', {
          ...payment,
          mode: 'TARGETED',
          payeeId: 'person',
          claimIds: ['claim'],
        }),
      ).ok,
    ).toBe(true);
  });
});

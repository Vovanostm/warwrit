import { describe, expect, it } from 'vitest';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  PHYSICAL_POLICY_VERSION,
  campaignTick,
  canonicalJson,
  entityId,
  parseCompanyCommand,
  prepareCompanyEconomy,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  EconomyResult,
  EconomyContext,
  EconomyReceipt,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { prepareStationaryFoodFacts } from './travel-food.js';
import { preparePayrollAccess } from './payroll-access.js';
import { observeLocalPayees } from './payroll-observation.js';

function prepared(result: EconomyResult) {
  if (result.kind !== 'PREPARED') throw new Error(result.error);
  return result;
}

function input(root: CompanyEconomyState, commandId = 'payroll') {
  return {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    atTick: campaignTick('2000'),
    commandId,
    sourceEventId: `source-${commandId}`,
    poolId: 'local',
    carriedPurse: { walletId: 'purse', partyId: 'a-party' },
  };
}

function fixture() {
  const aggregate = createCompanyCombatAggregateFixture().state;
  const physical = aggregate.economy.physical!;
  const containers = physical.containers.map((container) =>
    container.containerId === 'fixture-supply'
      ? {
          ...container,
          kind: 'PARTY_SUPPLY' as const,
          carrier: { kind: 'PARTY' as const, id: 'a-party' },
        }
      : container,
  );
  const root = { ...aggregate.economy, physical: { ...physical, containers } };
  const food = prepareStationaryFoodFacts({ ...aggregate, economy: root }, '2000', 'payroll');
  if (food.kind !== 'PREPARED') throw new Error(food.reason);
  return { root, foodFacts: food.facts };
}

function pay(
  root: CompanyEconomyState,
  context: EconomyContext,
  mode: 'DEFAULT' | 'TARGETED' = 'DEFAULT',
  amountQ = '4',
) {
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: `payment-${root.lifecycle.revision}`,
    type: 'PayClaims',
    payload: {
      poolId: 'local',
      amountQ,
      claimIds: [],
      mode,
      ...(mode === 'TARGETED' ? { payeeId: 'a-worker-0' } : {}),
    },
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    actorRef: { kind: 'PLAYER', id: 'owner' },
    campaignTick: context.atTick,
    expectedRevision: root.lifecycle.knowledge.revision,
    rulesetId: COMPANY_RULESET_ID,
  });
  if (!parsed.ok) throw new Error(parsed.error);
  return prepareCompanyEconomy(root, parsed.command, {
    ...context,
    principal: parsed.command.actorRef,
  });
}

describe('local payroll preparation', () => {
  it('observes two stale local payees and pays real due wages without changing the input', () => {
    const { root, foodFacts } = fixture();
    const before = canonicalJson(root);
    const result = observeLocalPayees(root, { ...input(root), foodFacts });
    if (result.kind !== 'PREPARED') throw new Error(result.reason);
    const paid = prepared(pay(result.next, result.context));
    expect({
      inputUnchanged: canonicalJson(root) === before,
      wallets: paid.next.finance.wallets
        .filter((wallet) =>
          ['purse', 'wallet-worker-0', 'wallet-worker-1'].includes(wallet.walletId),
        )
        .map(({ walletId, cashQ }) => [walletId, cashQ]),
      confirmed: result.next.finance.accounts
        .filter((account) => account.schedule)
        .map((account) => account.confirmedAt),
      allocations: paid.receipt.allocations.map(({ amountQ, channel }) => [amountQ, channel]),
      access: preparePayrollAccess(result.next, input(root)).kind,
    }).toEqual({
      inputUnchanged: true,
      wallets: [
        ['purse', '96'],
        ['wallet-worker-0', '2'],
        ['wallet-worker-1', '2'],
      ],
      confirmed: ['2000', '2000'],
      allocations: [
        ['2', 'CASH'],
        ['2', 'CASH'],
      ],
      access: 'PREPARED',
    });
  });
});

function observed(
  root: CompanyEconomyState,
  foodFacts: Parameters<typeof observeLocalPayees>[1]['foodFacts'] = [],
  commandId = 'payroll',
) {
  const result = observeLocalPayees(root, { ...input(root, commandId), foodFacts });
  if (result.kind !== 'PREPARED') throw new Error(result.reason);
  return result;
}

function dueRoot() {
  const { root, foodFacts } = fixture();
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: 'earn-wages',
    type: 'AdvanceCampaign',
    payload: { toTick: '2000', authoritativeInputs: [] },
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    actorRef: { kind: 'SYSTEM', id: 'world-clock' },
    campaignTick: root.lifecycle.campaignTick,
    expectedRevision: root.lifecycle.revision,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId: 'earn-wages-source',
  });
  if (!parsed.ok) throw new Error(parsed.error);
  const context: EconomyContext = {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    principal: parsed.command.actorRef,
    atTick: root.lifecycle.campaignTick,
    canonicalRevision: root.lifecycle.revision,
    publicRevision: root.lifecycle.knowledge.revision,
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts: [],
    physicalFacts: foodFacts,
    internalGrant: {
      commandId: parsed.command.commandId,
      sourceEventId: parsed.command.sourceEventId!,
      canonicalRequest: canonicalJson(parsed.command),
    },
  };
  return prepared(prepareCompanyEconomy(root, parsed.command, context)).next;
}

function changePresence(
  root: CompanyEconomyState,
  ids: readonly string[],
  changes: Partial<CompanyEconomyState['lifecycle']['characters'][number]['presence']>,
): CompanyEconomyState {
  return {
    ...root,
    lifecycle: {
      ...root.lifecycle,
      characters: root.lifecycle.characters.map((character) =>
        ids.includes(character.identity.characterId)
          ? { ...character, presence: { ...character.presence, ...changes } }
          : character,
      ),
    },
  };
}

function paymentContext(root: CompanyEconomyState): EconomyContext {
  const result = preparePayrollAccess(root, input(root));
  if (result.kind !== 'PREPARED') throw new Error(result.reason);
  return {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    principal: { kind: 'PLAYER', id: 'owner' },
    atTick: campaignTick('2000'),
    canonicalRevision: root.lifecycle.revision,
    publicRevision: root.lifecycle.knowledge.revision,
    completeGraph: true,
    contactIds: result.contactIds,
    facts: [],
    financeFacts: [result.access],
    physicalFacts: [],
  };
}

describe('payroll locality and refusal', () => {
  it.each([
    ['missing identity', { carriedPurse: undefined }],
    ['wrong party', { carriedPurse: { walletId: 'purse', partyId: 'elsewhere' } }],
    ['wrong wallet', { carriedPurse: { walletId: 'wallet-worker-0', partyId: 'a-party' } }],
    ['missing pool', { poolId: 'elsewhere' }],
    ['foreign world', { worldId: 'elsewhere' }],
    ['foreign company', { companyId: 'elsewhere' }],
  ])('rejects %s without a draft', (_label, changes) => {
    const { root } = fixture();
    const before = canonicalJson(root);
    expect({
      result: observeLocalPayees(root, { ...input(root), ...changes, foodFacts: [] }),
      unchanged: before === canonicalJson(root),
    }).toEqual({
      result: { kind: 'REJECTED', reason: 'PAYROLL_PREPARATION_FAILED' },
      unchanged: true,
    });
  });

  it.each([
    ['another area', { kind: 'AT' as const, siteId: 'village', areaId: 'elsewhere' }],
    ['another site', { kind: 'AT' as const, siteId: 'elsewhere', areaId: 'square' }],
  ])('does not move a purse from %s despite carried identity', (_label, location) => {
    const { root } = fixture();
    const remote = {
      ...root,
      finance: {
        ...root.finance,
        wallets: root.finance.wallets.map((wallet) =>
          wallet.walletId === 'purse' ? { ...wallet, location } : wallet,
        ),
      },
    };
    expect(preparePayrollAccess(remote, input(remote))).toEqual({
      kind: 'REJECTED',
      reason: 'CONTACT_OR_ACCESS_REQUIRED',
    });
  });

  it('rejects a separate pool wallet in another area while the carried purse and operator stay local', () => {
    const { root } = fixture();
    const remotePool: CompanyEconomyState = {
      ...root,
      finance: {
        ...root.finance,
        wallets: [
          ...root.finance.wallets,
          {
            walletId: 'remote-pool-wallet',
            owner: { kind: 'COMPANY', id: root.lifecycle.companyId },
            location: { kind: 'AT', siteId: 'village', areaId: 'elsewhere' },
            cashQ: root.finance.wallets.find((wallet) => wallet.walletId === 'purse')!.cashQ,
          },
        ],
        pools: [...root.finance.pools, { poolId: 'remote-pool', walletId: 'remote-pool-wallet' }],
      },
    };
    const before = canonicalJson(remotePool);
    const result = preparePayrollAccess(remotePool, {
      ...input(remotePool),
      poolId: 'remote-pool',
    });

    expect({ result, unchanged: canonicalJson(remotePool) === before }).toEqual({
      result: { kind: 'REJECTED', reason: 'CONTACT_OR_ACCESS_REQUIRED' },
      unchanged: true,
    });
  });

  it.each([
    ['remote', { location: { kind: 'AT' as const, siteId: 'village', areaId: 'elsewhere' } }],
    [
      'unavailable',
      { availability: 'OUT_OF_CONTACT' as const, fieldPartyId: null, assignment: 'NONE' as const },
    ],
    [
      'encounter bound',
      {
        encounterBindingId: entityId<'EncounterBinding'>('battle'),
        availability: 'IN_ENCOUNTER' as const,
      },
    ],
  ])('refuses when every active operator is %s', (_label, presence) => {
    const { root } = fixture();
    const modified = changePresence(
      root,
      root.lifecycle.memberships.map((member) => member.characterId),
      presence,
    );
    expect(preparePayrollAccess(modified, input(root))).toEqual({
      kind: 'REJECTED',
      reason: 'CONTACT_OR_ACCESS_REQUIRED',
    });
  });

  it('selects the same eligible operator regardless of character ordering', () => {
    const { root } = fixture();
    const unavailableLeader = changePresence(root, ['a-leader'], {
      encounterBindingId: entityId<'EncounterBinding'>('battle'),
      availability: 'IN_ENCOUNTER' as const,
    });
    const reversed = {
      ...unavailableLeader,
      lifecycle: {
        ...unavailableLeader.lifecycle,
        characters: [...unavailableLeader.lifecycle.characters].reverse(),
      },
    };
    const result = preparePayrollAccess(unavailableLeader, input(root));
    expect({ result, reversed: preparePayrollAccess(reversed, input(root)) }).toEqual({
      result: expect.objectContaining({
        kind: 'PREPARED',
        access: expect.objectContaining({ operatorId: 'a-worker-0' }),
      }),
      reversed: result,
    });
  });

  it('rejects ambiguous local recipient wallets', () => {
    const { root } = fixture();
    const wallet = root.finance.wallets.find((entry) => entry.walletId === 'wallet-worker-0')!;
    const ambiguous = {
      ...root,
      finance: {
        ...root.finance,
        wallets: [...root.finance.wallets, { ...wallet, walletId: 'second-wallet' }],
      },
    };
    expect(preparePayrollAccess(ambiguous, input(root))).toEqual({
      kind: 'REJECTED',
      reason: 'CONTACT_OR_ACCESS_REQUIRED',
    });
  });

  it('keeps an uncontacted historical payee pending and only observes actual local service subjects', () => {
    const root = changePresence(dueRoot(), ['a-worker-1'], {
      fieldPartyId: null,
      assignment: 'NONE',
      location: { kind: 'AT', siteId: 'village', areaId: 'elsewhere' },
    });
    const before = canonicalJson(root);
    const result = observed(root);
    const paid = prepared(pay(result.next, result.context));
    expect({
      observations: result.receipts.length,
      confirmation: result.next.finance.accounts
        .filter((account) => account.schedule)
        .map((account) => account.confirmedAt),
      channels: paid.receipt.allocations.map(({ channel }) => channel),
      walletIds: result.access.recipientWalletIds,
      unchanged: before === canonicalJson(root),
    }).toEqual({
      observations: 1,
      confirmation: ['2000', '1000'],
      channels: ['CASH', 'PENDING_CONFIRMATION'],
      walletIds: ['wallet-leader', 'wallet-provider', 'wallet-worker-0'],
      unchanged: true,
    });
  });

  it('keeps DEFAULT and TARGETED allocation distinct while observing the same contacts', () => {
    const result = observed(dueRoot());
    const defaultPaid = prepared(pay(result.next, result.context));
    const targeted = prepared(pay(result.next, result.context, 'TARGETED'));
    const credits = (root: CompanyEconomyState) =>
      root.finance.wallets
        .filter((wallet) => wallet.walletId.startsWith('wallet-worker'))
        .map((wallet) => wallet.cashQ);
    expect({
      default: credits(defaultPaid.next),
      targeted: credits(targeted.next),
      observed: result.receipts.length,
    }).toEqual({ default: ['2', '2'], targeted: ['4', '0'], observed: 2 });
  });

  it('refuses insufficient spendable funds including existing holds without a partial payment', () => {
    const root = dueRoot();
    const held = prepared(pay(root, paymentContext(root), 'DEFAULT', '98')).next;
    const before = canonicalJson(held);
    const result = pay(held, paymentContext(held), 'TARGETED', '4');
    expect({
      kind: result.kind,
      error: result.kind === 'REJECTED' ? result.error : null,
      unchanged: canonicalJson(held) === before,
    }).toEqual({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS', unchanged: true });
  });

  it('retains Observe cash allocations that release earlier backed holds', () => {
    const root = dueRoot();
    const held = prepared(pay(root, paymentContext(root))).next;
    const result = observed(held);
    expect({
      allocations: result.allocations.map(({ amountQ, channel }) => [amountQ, channel]),
      receipts: result.receipts.flatMap((receipt) => receipt.allocations),
      events: result.events,
      retainedEvents: result.receipts.flatMap((receipt) => receipt.events),
      holds: result.next.finance.reservations,
      cash: result.next.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ,
    }).toEqual({
      allocations: [
        ['2', 'CASH'],
        ['2', 'CASH'],
      ],
      receipts: result.allocations,
      events: result.events,
      retainedEvents: result.events,
      holds: [],
      cash: '96',
    });
  });

  it('is deterministic across serialization and refuses a replayed preparation', () => {
    const root = dueRoot();
    const result = observed(root);
    expect({
      deterministic:
        canonicalJson(result) ===
        canonicalJson(observed(JSON.parse(JSON.stringify(root)) as CompanyEconomyState)),
      replay: observeLocalPayees(result.next, { ...input(root), foodFacts: [] }),
      revisions: result.receipts.map((receipt) => receipt.lifecycleReceipt?.commandId),
      currentAccess: result.access.revision === result.next.lifecycle.revision,
    }).toEqual({
      deterministic: true,
      replay: { kind: 'REJECTED', reason: 'PAYROLL_PREPARATION_FAILED' },
      revisions: result.receipts.map((receipt) => receipt.commandId),
      currentAccess: true,
    });
  });

  it.each(['worldId', 'companyId', 'revision', 'sourceEventId'] as const)(
    'rejects tampered food %s without exposing a staged root',
    (field) => {
      const { root, foodFacts } = fixture();
      const before = canonicalJson(root);
      const altered = foodFacts.map((fact) => ({
        ...fact,
        [field]: field === 'revision' ? '999' : field === 'sourceEventId' ? '' : 'foreign',
      })) as typeof foodFacts;
      expect({
        result: observeLocalPayees(root, { ...input(root), foodFacts: altered }),
        unchanged: canonicalJson(root) === before,
      }).toEqual({
        result: { kind: 'REJECTED', reason: 'PAYROLL_PREPARATION_FAILED' },
        unchanged: true,
      });
    },
  );

  it('rejects missing elapsed-time food obligations without exposing a partial observation', () => {
    const { root } = fixture();
    expect(observeLocalPayees(root, { ...input(root), foodFacts: [] })).toEqual({
      kind: 'REJECTED',
      reason: 'PAYROLL_PREPARATION_FAILED',
    });
  });

  it('supports an old root without optional physical data at an already settled tick', () => {
    const root = dueRoot();
    const { physical: _physical, ...oldRoot } = root;
    const result = observed(oldRoot);
    expect(
      prepared(pay(result.next, result.context)).receipt.allocations.map(({ channel }) => channel),
    ).toEqual(['CASH', 'CASH']);
  });
});

function stageReceiptCommand(
  root: CompanyEconomyState,
  receipt: EconomyReceipt,
  wrongSource = false,
) {
  const parsed = parseCompanyCommand({
    ...JSON.parse(receipt.requestKey),
    expectedRevision: root.lifecycle.revision,
  });
  if (!parsed.ok || parsed.command.type !== 'Observe')
    throw new Error('Expected an Observe receipt');
  const command = parsed.command;
  const fact = {
    id: command.payload.factId,
    sourceEventId: wrongSource ? 'wrong-source' : command.sourceEventId!,
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    atTick: campaignTick('2000'),
    revision: root.lifecycle.revision,
    subject: { kind: 'CHARACTER' as const, id: command.payload.subjectRef.id },
  };
  return prepareCompanyEconomy(root, command, {
    ...paymentContext(root),
    principal: command.actorRef,
    facts: [{ ...fact, kind: 'COMPANY_OBSERVATION' }],
    physicalFacts: [
      {
        ...fact,
        kind: 'PHYSICAL_OBSERVATION',
        version: PHYSICAL_POLICY_VERSION,
        ordinal: 0,
        observerCompanyId: root.lifecycle.companyId,
        itemIds: [],
        containerIds: [],
      },
    ],
    internalGrant: {
      commandId: command.commandId,
      sourceEventId: command.sourceEventId!,
      canonicalRequest: canonicalJson(command),
    },
  });
}

describe('observation composition boundaries', () => {
  it('discards a successful first Observe when the later command conflicts with a real receipt', () => {
    const root = dueRoot();
    const planned = observed(root);
    const prior = prepared(stageReceiptCommand(root, planned.receipts[1]!)).next;
    const first = prepared(stageReceiptCommand(prior, planned.receipts[0]!));
    const before = canonicalJson(prior);
    const result = observeLocalPayees(prior, { ...input(prior), foodFacts: [] });
    expect({
      firstActuallyAdvanced: first.next.lifecycle.revision !== prior.lifecycle.revision,
      result,
      unchanged: before === canonicalJson(prior),
    }).toEqual({
      firstActuallyAdvanced: true,
      result: { kind: 'REJECTED', reason: 'PAYROLL_PREPARATION_FAILED' },
      unchanged: true,
    });
  });

  it('uses source-bound Observe evidence that real core rejects when mismatched', () => {
    const root = dueRoot();
    const result = stageReceiptCommand(root, observed(root).receipts[0]!, true);
    expect(result.kind).toBe('REJECTED');
  });

  it('does not reveal an undisclosed remote pause through access, observations or payment', () => {
    const remote = changePresence(dueRoot(), ['a-worker-1'], {
      fieldPartyId: null,
      assignment: 'NONE',
      location: { kind: 'AT', siteId: 'village', areaId: 'elsewhere' },
    });
    const hidden = {
      ...remote,
      finance: {
        ...remote.finance,
        accounts: remote.finance.accounts.map((account) =>
          account.recipient.id === 'a-worker-1' ? { ...account, actualPaused: true } : account,
        ),
      },
    };
    const visible = (root: CompanyEconomyState) => {
      const result = observed(root);
      const paid = prepared(pay(result.next, result.context));
      return {
        access: result.access,
        context: result.context,
        receipts: result.receipts,
        payment: paid.receipt,
        wallets: paid.next.finance.wallets,
        reservations: paid.next.finance.reservations,
      };
    };
    expect(visible(hidden)).toEqual(visible(remote));
  });

  it('returns elapsed food facts when no contacted payee needs observation', () => {
    const { root, foodFacts } = fixture();
    const unavailable = changePresence(root, ['a-worker-0', 'a-worker-1'], {
      encounterBindingId: entityId<'EncounterBinding'>('busy'),
      availability: 'IN_ENCOUNTER',
    });
    const result = observed(unavailable, foodFacts);
    const paid = prepared(pay(result.next, result.context));
    expect({
      receipts: result.receipts,
      channels: paid.receipt.allocations.map(({ channel }) => channel),
      tick: paid.next.finance.processedTick,
    }).toEqual({
      receipts: [],
      channels: ['PENDING_CONFIRMATION', 'PENDING_CONFIRMATION'],
      tick: '2000',
    });
  });
});

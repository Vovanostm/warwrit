import { createHash, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  DECEASED_KIN_WAGE_SINK_ID,
  PHYSICAL_POLICY_VERSION,
  campaignTick,
  canonicalJson,
  canonicalStateJson,
  companySourceKey,
  createCombatEncounterApplication,
  entityId,
  moneyQ,
  parseCompanyCommand,
  prepareCompanyEconomy,
  readCompanyCombatAggregateState,
  type AtLocation,
  type CompanyCombatAggregateState,
  type CompanyCommand,
  type CompanyEconomyState,
  type FinanceEvidence,
  type LifecycleEvidence,
  type PhysicalEvidence,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { createDatabase } from '../db/database.js';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { updateCompanyAggregateWithReceipt } from './repository.js';
import {
  payDeceasedWagesCommandIntent,
  parsePayDeceasedWagesRequest,
} from './deceased-wages-routes.js';
import { prepareDeceasedWageAccess } from './deceased-wages.js';

const local = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const remote = { kind: 'AT' as const, siteId: 'bereznyak', areaId: 'bereznyak-green' };
const purseOrigin = {
  kind: 'AT' as const,
  siteId: 'severny-dvor',
  areaId: 'severny-dvor-yard',
};

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

function atPlace(root: CompanyEconomyState, place: AtLocation): CompanyEconomyState {
  return {
    ...root,
    lifecycle: {
      ...root.lifecycle,
      parties: root.lifecycle.parties.map((party) => ({ ...party, location: place })),
      characters: root.lifecycle.characters.map((character) => ({
        ...character,
        presence: { ...character.presence, location: place },
      })),
      knowledge: {
        ...root.lifecycle.knowledge,
        characters: root.lifecycle.knowledge.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location: place },
        })),
      },
    },
    finance: {
      ...root.finance,
      wallets: root.finance.wallets.map((wallet) => ({ ...wallet, location: place })),
    },
  };
}

function partyAtKeepingDeadBodies(
  state: CompanyCombatAggregateState,
  place: AtLocation,
): CompanyCombatAggregateState {
  const { lifecycle, finance } = state.economy;
  const deadIds = new Set(
    lifecycle.characters
      .filter((character) => character.presence.availability === 'DEAD')
      .map((character) => character.identity.characterId),
  );
  return readCompanyCombatAggregateState({
    ...state,
    economy: {
      ...state.economy,
      lifecycle: {
        ...lifecycle,
        parties: lifecycle.parties.map((party) => ({ ...party, location: place })),
        characters: lifecycle.characters.map((character) =>
          deadIds.has(character.identity.characterId)
            ? character
            : { ...character, presence: { ...character.presence, location: place } },
        ),
        knowledge: {
          ...lifecycle.knowledge,
          characters: lifecycle.knowledge.characters.map((character) =>
            deadIds.has(character.identity.characterId)
              ? character
              : { ...character, presence: { ...character.presence, location: place } },
          ),
        },
      },
      finance: {
        ...finance,
        wallets: finance.wallets.map((wallet) => ({ ...wallet, location: place })),
      },
    },
  });
}

function rootAtKamennyBrod(): CompanyEconomyState {
  const root = createCompanyCombatAggregateFixture().state.economy;
  const membership = root.lifecycle.memberships.find(
    (candidate) => candidate.characterId === 'a-worker-0',
  )!;
  const account = root.finance.accounts.find(
    (candidate) => candidate.membershipId === membership.membershipId,
  )!;
  return atPlace(
    {
      ...root,
      finance: {
        ...root.finance,
        claims: [
          {
            claimId: entityId('adapter-claim'),
            membershipId: membership.membershipId,
            poolId: account.poolId,
            rateVersion: entityId('adapter-rate'),
            dueAt: root.lifecycle.campaignTick,
            fromTick: root.lifecycle.campaignTick,
            toTick: root.lifecycle.campaignTick,
            dailyWageMilli: '0',
            maintenanceId: null,
            earned: [],
            paidQ: moneyQ('0'),
            reportedQ: moneyQ('0'),
            reportedCoveredQ: moneyQ('0'),
          },
        ],
      },
    },
    local,
  );
}

function scope(root: CompanyEconomyState) {
  return {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    atTick: root.lifecycle.campaignTick,
    commandId: 'pay-deceased-wages',
    sourceEventId: 'pay-deceased-wages-source',
    characterId: 'a-worker-0',
    expectedPublicRevision: root.lifecycle.knowledge.revision,
    carriedPurse: {
      walletId: root.finance.pools[0]!.walletId,
      partyId: root.lifecycle.parties[0]!.partyId,
    },
  };
}

describe('PayDeceasedWages server protocol adapter', () => {
  it('parses the narrow request, derives domain intent, and prepares Kamenny Brod owned access', () => {
    const request = {
      schemaVersion: 2,
      commandId: 'pay-deceased-wages',
      expectedPublicRevision: '0',
      type: 'PayDeceasedWages',
      payload: { characterId: 'a-worker-0' },
    };
    const parsed = parsePayDeceasedWagesRequest(request);
    expect(parsed).toBeDefined();
    expect(payDeceasedWagesCommandIntent(parsed!)).toEqual({
      type: 'PayDeceasedWages',
      payload: { characterId: 'a-worker-0' },
    });
    expect(
      parsePayDeceasedWagesRequest({
        ...request,
        payload: { characterId: 'a-worker-0', amountQ: '5' },
      }),
    ).toBeUndefined();

    const root = rootAtKamennyBrod();
    const prepared = prepareDeceasedWageAccess(root, scope(root));
    expect(prepared.kind).toBe('PREPARED');
    if (prepared.kind !== 'PREPARED') return;
    expect(prepared.access).toMatchObject({
      kind: 'LOCAL_MONEY_ACCESS',
      location: local,
      poolIds: ['local'],
      recipientWalletIds: [],
    });
    expect(prepared.contactIds).toContain(prepared.access.operatorId);
  });

  it('rejects stale, remote, or unowned purse access without relocating a wallet', () => {
    const root = rootAtKamennyBrod();
    expect(
      prepareDeceasedWageAccess(root, {
        ...scope(root),
        expectedPublicRevision: '1',
      }),
    ).toEqual({ kind: 'REJECTED', reason: 'CONTACT_OR_ACCESS_REQUIRED' });
    const away = atPlace(root, remote);
    expect(prepareDeceasedWageAccess(away, scope(away))).toEqual({
      kind: 'REJECTED',
      reason: 'CONTACT_OR_ACCESS_REQUIRED',
    });
    const noCarriedPurse = { ...scope(root), carriedPurse: undefined };
    expect(prepareDeceasedWageAccess(root, noCarriedPurse)).toEqual({
      kind: 'REJECTED',
      reason: 'CONTACT_OR_ACCESS_REQUIRED',
    });
    expect(root.finance.wallets[0]?.location).toEqual(local);
  });
});

function baseDeceasedAggregate(worldId: string, companyId: string, purseId: string) {
  const fixture = createCompanyCombatAggregateFixture();
  const rewritten = JSON.parse(
    JSON.stringify({
      ...fixture.state,
      economy: fixture.f.root,
      encounter: createCombatEncounterApplication(),
    })
      .replaceAll('"world"', JSON.stringify(worldId))
      .replaceAll('"a-company"', JSON.stringify(companyId)),
  ) as CompanyCombatAggregateState;
  const localPlace = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'market' };
  const economyRoot = rewritten.economy;
  const partyId = economyRoot.lifecycle.parties[0]!.partyId;
  const root = readCompanyCombatAggregateState({
    ...rewritten,
    economy: {
      ...economyRoot,
      lifecycle: {
        ...economyRoot.lifecycle,
        parties: economyRoot.lifecycle.parties.map((party) => ({ ...party, location: localPlace })),
        characters: economyRoot.lifecycle.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location: localPlace },
        })),
        knowledge: {
          ...economyRoot.lifecycle.knowledge,
          characters: economyRoot.lifecycle.knowledge.characters.map((character) => ({
            ...character,
            presence: { ...character.presence, location: localPlace },
          })),
        },
      },
      finance: {
        ...economyRoot.finance,
        wallets: economyRoot.finance.wallets
          .map((wallet) =>
            wallet.walletId === 'purse'
              ? { ...wallet, walletId: purseId, location: purseOrigin, cashQ: moneyQ('2') }
              : wallet,
          )
          .concat({
            walletId: entityId<'Wallet'>('remote-company-store'),
            owner: { kind: 'COMPANY' as const, id: companyId },
            location: purseOrigin,
            cashQ: moneyQ('17'),
          }),
        pools: economyRoot.finance.pools.map((pool) =>
          pool.walletId === 'purse' ? { ...pool, walletId: purseId } : pool,
        ),
        claims: ['a-worker-0', 'a-worker-1'].map((characterId, index) => {
          const membership = economyRoot.lifecycle.memberships.find(
            (entry) => entry.characterId === characterId && entry.companyId === companyId,
          );
          const account = economyRoot.finance.accounts.find(
            (entry) => entry.membershipId === membership?.membershipId,
          );
          if (!membership || !account) throw new Error(`Missing ${characterId} finance account`);
          const amount = index === 0 ? '2' : '4';
          return {
            claimId: entityId<'WageClaim'>(`deceased-claim-${index}`),
            membershipId: membership.membershipId,
            poolId: account.poolId,
            rateVersion: entityId(`deceased-rate-${index}`),
            dueAt: economyRoot.finance.processedTick,
            fromTick: campaignTick((BigInt(economyRoot.finance.processedTick) - 1n).toString()),
            toTick: economyRoot.finance.processedTick,
            dailyWageMilli: amount,
            maintenanceId: null,
            earned: [
              {
                fromTick: campaignTick((BigInt(economyRoot.finance.processedTick) - 1n).toString()),
                toTick: economyRoot.finance.processedTick,
                dailyWageMilli: amount,
                maintenanceId: null,
              },
            ],
            paidQ: moneyQ('0'),
            reportedQ: moneyQ(amount),
            reportedCoveredQ: moneyQ('0'),
          };
        }),
      },
    },
  });
  return { state: root, partyId, purseId };
}

function trustedContext(
  state: CompanyEconomyState,
  command: CompanyCommand,
  financeFacts: readonly FinanceEvidence[] = [],
  facts: readonly LifecycleEvidence[] = [],
  physicalFacts: readonly PhysicalEvidence[] = [],
) {
  const sourceEventId = command.sourceEventId;
  if (!sourceEventId) throw new Error(`Fixture ${command.type} is missing a source event`);
  return {
    worldId: state.lifecycle.worldId,
    companyId: state.lifecycle.companyId,
    principal: command.actorRef,
    publicRevision: state.lifecycle.knowledge.revision,
    canonicalRevision: state.lifecycle.revision,
    atTick: campaignTick(command.campaignTick),
    completeGraph: true,
    contactIds: state.lifecycle.characters.map((character) => character.identity.characterId),
    facts,
    financeFacts,
    physicalFacts,
    internalGrant: {
      commandId: command.commandId,
      sourceEventId,
      canonicalRequest: canonicalJson(command),
    },
  };
}

function transitionCommand(
  state: CompanyEconomyState,
  commandId: string,
  sourceEventId: string,
  type: 'RecordDeath' | 'Observe',
  payload: Record<string, unknown>,
  actor: { readonly kind: 'OUTCOME_RECEIPT' | 'DOMAIN_RECEIPT'; readonly id: string },
) {
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId,
    sourceEventId,
    worldId: state.lifecycle.worldId,
    companyId: state.lifecycle.companyId,
    actorRef: actor,
    expectedRevision: state.lifecycle.revision,
    campaignTick: state.lifecycle.campaignTick,
    rulesetId: COMPANY_RULESET_ID,
    type,
    payload,
  });
  if (!parsed.ok) throw new Error(`Invalid ${type} fixture command: ${parsed.error}`);
  return parsed.command;
}

async function persistSeededTransition(
  transaction: Parameters<typeof updateCompanyAggregateWithReceipt>[0],
  state: CompanyCombatAggregateState,
  command: ReturnType<typeof transitionCommand>,
  financeFacts: readonly FinanceEvidence[] = [],
  facts: readonly LifecycleEvidence[] = [],
  physicalFacts: readonly PhysicalEvidence[] = [],
) {
  const prepared = prepareCompanyEconomy(
    state.economy,
    command,
    trustedContext(state.economy, command, financeFacts, facts, physicalFacts),
  );
  if (prepared.kind !== 'PREPARED')
    throw new Error(`Fixture ${command.type} rejected: ${prepared.error}`);
  const next = readCompanyCombatAggregateState({ ...state, economy: prepared.next });
  const revision = next.economy.lifecycle.revision;
  await updateCompanyAggregateWithReceipt(
    transaction,
    state.economy.lifecycle.revision,
    revision,
    next,
    {
      command,
      receipt: {
        receiptId: randomUUID(),
        commandId: command.commandId,
        sourceKey: companySourceKey(command),
        requestKey: canonicalJson(command),
        response: {
          commandId: command.commandId,
          ok: true,
          publicRevision: next.economy.lifecycle.knowledge.revision,
        },
        resultingRevision: revision,
      },
      auditEvents: prepared.receipt.events.map((event) => ({
        eventId: event.id,
        revision,
        event,
      })),
    },
  );
  return next;
}

describe('PayDeceasedWages PostgreSQL integration', () => {
  it.skipIf(database === undefined)(
    'quotes and settles canonical observed debt once, rejects foreign access, and rolls back a failed catch-up',
    async () => {
      if (!database || !connectionString) throw new Error('company test database missing');
      const accountId = randomUUID();
      const foreignAccountId = randomUUID();
      const sessionToken = randomUUID();
      const foreignSessionToken = randomUUID();
      const worldId = randomUUID();
      const companyId = randomUUID();
      const openingId = randomUUID();
      const now = new Date();
      const fixture = baseDeceasedAggregate(worldId, companyId, `${openingId}:company-purse`);
      const actor = { kind: 'OUTCOME_RECEIPT' as const, id: 'combat-outcome' };
      let state = fixture.state;
      const initialLife = state.economy.lifecycle;
      const targets = [
        { characterId: 'a-worker-0', amountQ: '2' },
        { characterId: 'a-worker-1', amountQ: '4' },
      ];
      try {
        await database
          .insertInto('identity_accounts')
          .values([
            { id: accountId, issuer: `deceased-wage-${accountId}`, subject: 'owner' },
            {
              id: foreignAccountId,
              issuer: `deceased-wage-${foreignAccountId}`,
              subject: 'foreign',
            },
          ])
          .execute();
        await database
          .insertInto('identity_sessions')
          .values([
            {
              token_digest: createHash('sha256').update(sessionToken).digest(),
              account_id: accountId,
              expires_at: new Date(Date.now() + 60_000),
            },
            {
              token_digest: createHash('sha256').update(foreignSessionToken).digest(),
              account_id: foreignAccountId,
              expires_at: new Date(Date.now() + 60_000),
            },
          ])
          .execute();
        await database
          .insertInto('world_campaign_clocks')
          .values({ world_id: worldId, epoch_ms: String(now.getTime()), starting_tick: '1000' })
          .execute();
        await database
          .insertInto('company_snapshots')
          .values({
            world_id: worldId,
            company_id: companyId,
            schema_version: COMPANY_SCHEMA_VERSION,
            ruleset_id: COMPANY_RULESET_ID,
            catalogue_version: COMPANY_CATALOGUE_VERSION,
            command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
            public_revision: initialLife.knowledge.revision,
            canonical_revision: initialLife.revision,
            state,
          })
          .execute();
        await database
          .insertInto('company_account_owners')
          .values({ world_id: worldId, company_id: companyId, account_id: accountId })
          .execute();
        await database
          .insertInto('company_opening_options')
          .values({
            id: openingId,
            world_id: worldId,
            account_id: accountId,
            company_id: companyId,
            evidence: { id: openingId, worldId, companyId, partyId: fixture.partyId },
            expires_at: new Date(Date.now() + 60_000),
            consumed_at: now,
            consumed_command_id: 'seeded-company-opening',
            consumed_request_key: 'seeded-company-opening-request',
          })
          .execute();

        const appConfig = loadServerConfig({
          DATABASE_URL: connectionString,
          OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
          OIDC_CLIENT_ID: 'warwrit-local',
          OIDC_CLIENT_SECRET: 'local-only-secret',
          OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
          PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
          HOST: '127.0.0.1',
          PORT: '3107',
        });
        const createdApp = buildApp({
          identity: { config: appConfig.identity!, database },
          company: { database, worldId },
        });
        apps.push(createdApp);

        for (const target of targets) {
          const commandId = randomUUID();
          const financeReceiptId = randomUUID();
          const custodyOutcomeId = randomUUID();
          const death = transitionCommand(
            state.economy,
            commandId,
            commandId,
            'RecordDeath',
            {
              receiptId: financeReceiptId,
              characterId: target.characterId,
              actualDeathTick: state.economy.lifecycle.campaignTick,
              causeId: 'test-combat-death',
              custodyOutcomeId,
            },
            actor,
          );
          const financeFact: FinanceEvidence = {
            id: financeReceiptId,
            worldId,
            companyId,
            revision: state.economy.lifecycle.revision,
            sourceEventId: commandId,
            atTick: state.economy.finance.processedTick,
            kind: 'FINANCIAL_DEATH',
            characterId: target.characterId,
            actualDeathTick: state.economy.lifecycle.campaignTick,
            recipient: { kind: 'ESTATE', id: target.characterId },
            causeId: 'test-combat-death',
            custodyOutcomeId,
          };
          const deathFact: PhysicalEvidence = {
            id: custodyOutcomeId,
            worldId,
            companyId,
            revision: state.economy.lifecycle.revision,
            sourceEventId: commandId,
            atTick: state.economy.finance.processedTick,
            ordinal: 0,
            version: PHYSICAL_POLICY_VERSION,
            kind: 'DEATH_OUTCOME',
            characterId: target.characterId,
            actualDeathTick: state.economy.lifecycle.campaignTick,
            causeId: 'test-combat-death',
            location: { kind: 'AT', siteId: 'kamenny-brod', areaId: 'market' },
            corpseContainerId: `corpse-${target.characterId}`,
          };
          state = await database.transaction().execute(async (transaction) => {
            const dead = await persistSeededTransition(
              transaction,
              state,
              death,
              [financeFact],
              [],
              [deathFact],
            );
            return dead;
          });
        }

        const headers = {
          cookie: `warwrit_session=${sessionToken}`,
          origin: 'http://127.0.0.1:3107',
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
        };
        for (const target of targets) {
          const canonical = state.economy.lifecycle.characters.find(
            (character) => character.identity.characterId === target.characterId,
          );
          const known = state.economy.lifecycle.knowledge.characters.find(
            (character) => character.identity.characterId === target.characterId,
          );
          const membership = state.economy.lifecycle.memberships.find(
            (entry) => entry.characterId === target.characterId,
          );
          const account = state.economy.finance.accounts.find(
            (entry) => entry.membershipId === membership?.membershipId,
          );
          expect(canonical?.presence.availability).toBe('DEAD');
          expect(known?.presence.availability).toBe('AVAILABLE');
          expect(account).toMatchObject({ known: true, knownDeath: false });
        }

        const remoteState = partyAtKeepingDeadBodies(state, remote);
        await database
          .updateTable('company_snapshots')
          .set({
            state: remoteState,
            public_revision: remoteState.economy.lifecycle.knowledge.revision,
            canonical_revision: remoteState.economy.lifecycle.revision,
          })
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const remoteQuote = await createdApp.inject({
          method: 'GET',
          url: '/company/deceased-wages',
          headers,
        });
        expect(remoteQuote.statusCode, remoteQuote.body).toBe(200);
        expect(remoteQuote.json()).toMatchObject({ local: false, people: [] });
        const afterRemoteObservation = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const remoteObservedState = readCompanyCombatAggregateState(afterRemoteObservation.state);
        for (const target of targets) {
          const known = remoteObservedState.economy.lifecycle.knowledge.characters.find(
            (character) => character.identity.characterId === target.characterId,
          );
          const membership = remoteObservedState.economy.lifecycle.memberships.find(
            (entry) => entry.characterId === target.characterId,
          );
          const account = remoteObservedState.economy.finance.accounts.find(
            (entry) => entry.membershipId === membership?.membershipId,
          );
          expect(known?.presence.availability).toBe('AVAILABLE');
          expect(account?.knownDeath).toBe(false);
        }

        const localState = partyAtKeepingDeadBodies(remoteObservedState, {
          kind: 'AT',
          siteId: 'kamenny-brod',
          areaId: 'market',
        });
        await database
          .updateTable('company_snapshots')
          .set({
            state: localState,
            public_revision: localState.economy.lifecycle.knowledge.revision,
            canonical_revision: localState.economy.lifecycle.revision,
          })
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();

        const quote = await createdApp.inject({
          method: 'GET',
          url: '/company/deceased-wages',
          headers,
        });
        expect(quote.statusCode, quote.body).toBe(200);
        expect(quote.json()).toMatchObject({
          local: true,
          people: expect.arrayContaining([
            expect.objectContaining({ characterId: 'a-worker-0', amountQ: '2' }),
            expect.objectContaining({ characterId: 'a-worker-1', amountQ: '4' }),
          ]),
        });
        const afterLocalObservation = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const locallyObservedState = readCompanyCombatAggregateState(afterLocalObservation.state);
        for (const target of targets) {
          const canonical = locallyObservedState.economy.lifecycle.characters.find(
            (character) => character.identity.characterId === target.characterId,
          );
          const known = locallyObservedState.economy.lifecycle.knowledge.characters.find(
            (character) => character.identity.characterId === target.characterId,
          );
          const membership = locallyObservedState.economy.lifecycle.memberships.find(
            (entry) => entry.characterId === target.characterId,
          );
          const account = locallyObservedState.economy.finance.accounts.find(
            (entry) => entry.membershipId === membership?.membershipId,
          );
          expect(canonical?.presence.availability).toBe('DEAD');
          expect(known?.presence.availability).toBe('DEAD');
          expect(account).toMatchObject({ known: true, knownDeath: true });
          expect(
            locallyObservedState.economy.finance.claims
              .filter((claim) => claim.membershipId === membership?.membershipId)
              .every((claim) =>
                claim.earned.every(
                  (period) => BigInt(period.toTick) <= BigInt(account?.death?.atTick ?? '0'),
                ),
              ),
          ).toBe(true);
        }
        const paymentState = readCompanyCombatAggregateState({
          ...locallyObservedState,
          economy: {
            ...locallyObservedState.economy,
            finance: {
              ...locallyObservedState.economy.finance,
              wallets: locallyObservedState.economy.finance.wallets.map((wallet) =>
                wallet.walletId === fixture.purseId ||
                wallet.walletId === 'remote-company-store' ||
                wallet.owner.kind === 'CHARACTER'
                  ? { ...wallet, location: purseOrigin }
                  : wallet,
              ),
            },
          },
        });
        await database
          .updateTable('company_snapshots')
          .set({
            state: paymentState,
            public_revision: paymentState.economy.lifecycle.knowledge.revision,
            canonical_revision: paymentState.economy.lifecycle.revision,
          })
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();

        const foreignQuote = await createdApp.inject({
          method: 'GET',
          url: '/company/deceased-wages',
          headers: {
            cookie: `warwrit_session=${foreignSessionToken}`,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
          },
        });
        expect(foreignQuote.statusCode).toBe(403);

        const purseBeforeAttempt = paymentState.economy.finance.wallets.find(
          (wallet) => wallet.walletId === fixture.purseId,
        );
        const localPoolBeforeAttempt = paymentState.economy.finance.pools.find(
          (pool) => pool.poolId === 'local',
        );
        const personalWalletsBeforeAttempt = paymentState.economy.finance.wallets.filter(
          (wallet) => wallet.owner.kind === 'CHARACTER',
        );
        const remoteCompanyWalletBeforeAttempt = paymentState.economy.finance.wallets.find(
          (wallet) => wallet.walletId === 'remote-company-store',
        );
        expect(purseBeforeAttempt?.location).toEqual({
          kind: 'AT',
          siteId: 'severny-dvor',
          areaId: 'severny-dvor-yard',
        });
        expect(localPoolBeforeAttempt?.walletId).toBe(fixture.purseId);
        expect(remoteCompanyWalletBeforeAttempt?.location).toEqual(purseBeforeAttempt?.location);

        const firstAttemptRequest = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: quote.json().publicRevision as string,
          type: 'PayDeceasedWages',
          payload: { characterId: 'a-worker-1' },
        };
        const beforeFailedAttempt = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const failedAttempt = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: firstAttemptRequest,
        });
        expect(failedAttempt.statusCode, failedAttempt.body).toBe(409);
        expect(failedAttempt.json()).toMatchObject({
          ok: false,
          code: 'INSUFFICIENT_FUNDS',
        });
        const afterFailedAttempt = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        expect(canonicalStateJson(afterFailedAttempt.state)).toBe(
          canonicalStateJson(beforeFailedAttempt.state),
        );
        const stateAfterFailedAttempt = readCompanyCombatAggregateState(afterFailedAttempt.state);
        expect(
          stateAfterFailedAttempt.economy.finance.wallets.find(
            (wallet) => wallet.walletId === fixture.purseId,
          )?.location,
        ).toEqual(purseBeforeAttempt?.location);
        expect(
          stateAfterFailedAttempt.economy.finance.wallets.filter(
            (wallet) => wallet.owner.kind === 'CHARACTER',
          ),
        ).toEqual(personalWalletsBeforeAttempt);
        expect(
          stateAfterFailedAttempt.economy.finance.wallets.find(
            (wallet) => wallet.walletId === 'remote-company-store',
          ),
        ).toEqual(remoteCompanyWalletBeforeAttempt);

        await database
          .updateTable('world_campaign_clocks')
          .set({ epoch_ms: String(Date.now()), starting_tick: '1001' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const request = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: quote.json().publicRevision as string,
          type: 'PayDeceasedWages',
          payload: { characterId: 'a-worker-0' },
        };
        const foreignPost = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: {
            cookie: `warwrit_session=${foreignSessionToken}`,
            origin: 'http://127.0.0.1:3107',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
          },
          payload: request,
        });
        expect(foreignPost.statusCode).toBe(403);
        const paid = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: request,
        });
        expect(paid.statusCode, paid.body).toBe(200);
        expect(paid.json().ok).toBe(true);
        const storedAfterPay = await database
          .transaction()
          .execute((transaction) =>
            transaction
              .selectFrom('company_snapshots')
              .select('state')
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId)
              .executeTakeFirstOrThrow(),
          );
        const stateAfterPay = readCompanyCombatAggregateState(storedAfterPay.state);
        const purseAfterPay = stateAfterPay.economy.finance.wallets.find(
          (wallet) => wallet.walletId === fixture.purseId,
        );
        expect(purseAfterPay?.location).toEqual({
          kind: 'AT',
          siteId: 'kamenny-brod',
          areaId: 'market',
        });
        expect(
          stateAfterPay.economy.finance.wallets.filter(
            (wallet) => wallet.owner.kind === 'CHARACTER',
          ),
        ).toEqual(personalWalletsBeforeAttempt);
        expect(
          stateAfterPay.economy.finance.wallets.find(
            (wallet) => wallet.walletId === 'remote-company-store',
          ),
        ).toEqual(remoteCompanyWalletBeforeAttempt);
        expect(
          stateAfterPay.economy.finance.wallets.find(
            (wallet) => wallet.walletId === fixture.purseId,
          )?.cashQ,
        ).toBe('0');
        expect(stateAfterPay.economy.finance.movements).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ to: DECEASED_KIN_WAGE_SINK_ID, amountQ: '2' }),
          ]),
        );
        expect(
          stateAfterPay.economy.finance.accounts.find(
            (account) => account.membershipId === 'service-worker-0',
          )?.death?.recipient,
        ).toEqual({ kind: 'ESTATE', id: 'a-worker-0' });
        const receiptCount = await database
          .selectFrom('company_receipts')
          .select(({ fn }) => fn.countAll<number>().as('count'))
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .where('command_id', '=', request.commandId)
          .executeTakeFirstOrThrow();
        expect(Number(receiptCount.count)).toBe(1);
        const repeated = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: request,
        });
        expect(repeated.statusCode).toBe(200);
        expect(repeated.json()).toEqual(paid.json());
        const afterRetry = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        expect(canonicalStateJson(afterRetry.state)).toBe(canonicalStateJson(storedAfterPay.state));

        const quoteAfterPay = await createdApp.inject({
          method: 'GET',
          url: '/company/deceased-wages',
          headers,
        });
        expect(quoteAfterPay.json().people).toEqual([
          expect.objectContaining({ characterId: 'a-worker-1', amountQ: '4' }),
        ]);
        await database
          .updateTable('world_campaign_clocks')
          .set({ epoch_ms: String(Date.now()), starting_tick: '1002' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const beforeInsufficient = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const receiptsBeforeInsufficient = await database
          .selectFrom('company_receipts')
          .select(({ fn }) => fn.countAll<number>().as('count'))
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const eventsBeforeInsufficient = await database
          .selectFrom('company_audit_events')
          .select(({ fn }) => fn.countAll<number>().as('count'))
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const insufficient = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: {
            ...request,
            commandId: randomUUID(),
            expectedPublicRevision: quoteAfterPay.json().publicRevision,
            payload: { characterId: 'a-worker-1' },
          },
        });
        expect(insufficient.statusCode).toBe(409);
        expect(insufficient.json()).toMatchObject({ ok: false, code: 'INSUFFICIENT_FUNDS' });
        const afterInsufficient = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        expect(canonicalStateJson(afterInsufficient.state)).toBe(
          canonicalStateJson(beforeInsufficient.state),
        );
        const receiptsAfterInsufficient = await database
          .selectFrom('company_receipts')
          .select(({ fn }) => fn.countAll<number>().as('count'))
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        const eventsAfterInsufficient = await database
          .selectFrom('company_audit_events')
          .select(({ fn }) => fn.countAll<number>().as('count'))
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        expect(Number(receiptsAfterInsufficient.count)).toBe(
          Number(receiptsBeforeInsufficient.count),
        );
        expect(Number(eventsAfterInsufficient.count)).toBe(Number(eventsBeforeInsufficient.count));
      } finally {
        await database.transaction().execute(async (transaction) => {
          await transaction
            .deleteFrom('company_audit_events')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute();
          await transaction
            .deleteFrom('company_receipts')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute();
          await transaction
            .deleteFrom('company_opening_options')
            .where('world_id', '=', worldId)
            .where('account_id', '=', accountId)
            .execute();
          await transaction
            .deleteFrom('company_account_owners')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute();
          await transaction
            .deleteFrom('company_snapshots')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute();
          await transaction
            .deleteFrom('world_campaign_clocks')
            .where('world_id', '=', worldId)
            .execute();
          await transaction
            .deleteFrom('identity_sessions')
            .where('account_id', 'in', [accountId, foreignAccountId])
            .execute();
          await transaction
            .deleteFrom('identity_accounts')
            .where('id', 'in', [accountId, foreignAccountId])
            .execute();
        });
      }
    },
  );
});

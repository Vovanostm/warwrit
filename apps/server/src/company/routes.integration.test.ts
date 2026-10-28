import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  initialSkillProgress,
  campaignTick,
  canonicalJson,
  companySourceKey,
  moneyQ,
  parseCompanyCommand,
  prepareCompanyEconomy,
  projectCompanyEconomy,
  projectCompanyLifecycle,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { OpeningEvidence } from '@warwrit/game-core';
import type { CreateCompanyPayloadDto, CreateCompanyRequestDto } from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { afterAll, describe, expect, it } from 'vitest';

import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';
import { createOpeningAggregate } from './opening.js';
import { loadCompanyAggregate, updateCompanyAggregateWithReceipt } from './repository.js';
import { projectPayroll } from './payroll-view.js';
import { prepareStationaryFoodFacts } from './travel-food.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];

async function advanceRealPayroll(worldId: string, companyId: string) {
  if (!database) throw new Error('company test database missing');
  const previous = await database
    .transaction()
    .execute((transaction) => loadCompanyAggregate(transaction, worldId, companyId));
  if (!previous) throw new Error('company snapshot missing before payroll advance');
  const targetTick = '2000';
  await database
    .updateTable('world_campaign_clocks')
    .set({ epoch_ms: String(Date.now()), starting_tick: targetTick })
    .where('world_id', '=', worldId)
    .executeTakeFirstOrThrow();
  const commandId = randomUUID();
  const food = prepareStationaryFoodFacts(previous, targetTick, commandId);
  if (food.kind !== 'PREPARED') throw new Error(food.reason);
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId,
    worldId,
    companyId,
    actorRef: { kind: 'SYSTEM', id: 'payroll-api-test-clock' },
    expectedRevision: previous.economy.lifecycle.revision,
    campaignTick: previous.economy.lifecycle.campaignTick,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId: randomUUID(),
    type: 'AdvanceCampaign',
    payload: { toTick: targetTick, authoritativeInputs: [] },
  });
  if (!parsed.ok || parsed.command.type !== 'AdvanceCampaign')
    throw new Error('failed to construct canonical campaign advance');
  const lifecycle = previous.economy.lifecycle;
  const prepared = prepareCompanyEconomy(previous.economy, parsed.command, {
    worldId,
    companyId,
    principal: parsed.command.actorRef,
    atTick: lifecycle.campaignTick,
    canonicalRevision: lifecycle.revision,
    publicRevision: lifecycle.knowledge.revision,
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts: [],
    physicalFacts: food.facts,
    practiceFacts: [],
    internalGrant: {
      commandId: parsed.command.commandId,
      sourceEventId: parsed.command.sourceEventId!,
      canonicalRequest: canonicalJson(parsed.command),
    },
  });
  if (prepared.kind !== 'PREPARED' || prepared.receipt.requirements.length !== 0)
    throw new Error('real campaign advance did not settle cleanly');
  const next = readCompanyCombatAggregateState({ ...previous, economy: prepared.next });
  const response = {
    commandId,
    ok: true as const,
    publicRevision: next.economy.lifecycle.knowledge.revision,
  };
  await database.transaction().execute((transaction) =>
    updateCompanyAggregateWithReceipt(
      transaction,
      lifecycle.revision,
      next.economy.lifecycle.revision,
      next,
      {
        command: parsed.command,
        receipt: {
          receiptId: randomUUID(),
          commandId,
          sourceKey: companySourceKey(parsed.command),
          requestKey: canonicalJson(parsed.command),
          response,
          resultingRevision: next.economy.lifecycle.revision,
        },
        auditEvents: prepared.receipt.events.map((event) => ({
          eventId: event.id,
          revision: next.economy.lifecycle.revision,
          event,
        })),
      },
    ),
  );
  return next;
}

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('authenticated company read (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'returns only the authenticated account company projection and an empty view otherwise',
    async () => {
      if (database === undefined || connectionString === undefined)
        throw new Error('company test database missing');

      const accountId = randomUUID();
      const foreignAccountId = randomUUID();
      const sessionToken = randomUUID();
      const foreignSessionToken = randomUUID();
      const worldId = randomUUID();
      const companyId = randomUUID();
      const fixture = createCompanyCombatAggregateFixture().state;
      const state = {
        ...fixture,
        economy: {
          ...fixture.economy,
          finance: {
            ...fixture.economy.finance,
            claims: [
              {
                claimId: 'read-payroll-claim',
                membershipId: 'service-worker-0',
                poolId: 'local',
                rateVersion: 'rate-worker-0',
                dueAt: campaignTick('999'),
                fromTick: campaignTick('998'),
                toTick: campaignTick('999'),
                dailyWageMilli: '13',
                maintenanceId: null,
                earned: [
                  {
                    fromTick: campaignTick('998'),
                    toTick: campaignTick('999'),
                    dailyWageMilli: '13',
                    maintenanceId: null,
                  },
                ],
                paidQ: moneyQ('5'),
                reportedQ: moneyQ('13'),
                reportedCoveredQ: moneyQ('3'),
              },
            ],
            reservations: [
              {
                reservationId: 'read-payroll-hold',
                walletId: 'purse',
                claimId: 'read-payroll-claim',
                amountQ: moneyQ('2'),
                purpose: 'PENDING_CONFIRMATION' as const,
              },
            ],
          },
        },
      };
      const storedState = JSON.parse(
        JSON.stringify(state)
          .replaceAll('"world"', JSON.stringify(worldId))
          .replaceAll('"a-company"', JSON.stringify(companyId)),
      ) as typeof state;
      const lifecycle = storedState.economy.lifecycle;
      const issuer = `company-read-test-${accountId}`;
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

      try {
        await database
          .insertInto('identity_accounts')
          .values([
            { id: accountId, issuer, subject: 'owner' },
            { id: foreignAccountId, issuer, subject: 'unowned' },
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
          .insertInto('company_snapshots')
          .values({
            world_id: worldId,
            company_id: companyId,
            schema_version: COMPANY_SCHEMA_VERSION,
            ruleset_id: COMPANY_RULESET_ID,
            catalogue_version: COMPANY_CATALOGUE_VERSION,
            command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
            public_revision: lifecycle.knowledge.revision,
            canonical_revision: lifecycle.revision,
            state: storedState,
          })
          .execute();
        await database
          .insertInto('company_account_owners')
          .values({ world_id: worldId, company_id: companyId, account_id: accountId })
          .execute();

        const anonymous = await createdApp.inject({ method: 'GET', url: '/company' });
        expect(anonymous.statusCode).toBe(401);

        const ownerRead = await createdApp.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${sessionToken}` },
        });
        expect(ownerRead.statusCode).toBe(200);
        const view = projectCompanyLifecycle(lifecycle, companyId);
        if (view === null) throw new Error('fixture company projection missing');
        expect(ownerRead.json()).toEqual({
          schemaVersion: 1,
          company: {
            companyId: view.companyId,
            revision: view.revision,
            companyPresentation: view.companyPresentation,
            leaderId: view.leaderId,
            runStatus: view.runStatus,
            characters: view.characters.map((character) => ({
              characterId: character.characterId,
              name: character.name,
              nicknameTextKey: character.nicknameTextKey,
              perkIds: character.perkIds,
              knownStatus: character.knownStatus,
            })),
          },
          holdings: expect.objectContaining({ cashQ: expect.stringMatching(/^[0-9]+$/u) }),
        });
        const loaded = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, companyId));
        if (!loaded) throw new Error('stored company missing');
        const observed = projectCompanyEconomy(loaded.economy, companyId)!;
        const response = ownerRead.json();
        expect(response.holdings.payroll).toEqual({
          atTick: observed.finance.atTick,
          publicRevision: response.company.revision,
          pools: observed.finance.wallets,
          services: observed.finance.services.map(
            ({ membershipId, poolId, currentAgreedRateMilli, materialSupportOnly }) => ({
              membershipId,
              poolId,
              currentAgreedRateMilli,
              materialSupportOnly,
            }),
          ),
          claims: [
            {
              claimId: 'read-payroll-claim',
              membershipId: 'service-worker-0',
              poolId: 'local',
              payee: { kind: 'CHARACTER', id: 'a-worker-0' },
              dueAt: '999',
              estimatedQ: '13',
              cashPaidQ: '5',
              currentMaintenanceQ: '3',
              pendingQ: '2',
              unsecuredQ: '3',
            },
          ],
          owedQ: '5',
          dueQ: '5',
          payableQ: '3',
          duePayableQ: '3',
        });
        expect({ owedQ: response.holdings.wagesOwedQ, dueQ: response.holdings.wagesDueQ }).toEqual({
          owedQ: '5',
          dueQ: '5',
        });
        expect(loaded).toEqual(storedState);
        expect(JSON.stringify(response)).not.toContain('finance');

        const otherAccountRead = await createdApp.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${foreignSessionToken}` },
        });
        expect(otherAccountRead.statusCode).toBe(200);
        expect(otherAccountRead.json()).toEqual({ schemaVersion: 1, company: null });
      } finally {
        await database.transaction().execute(async (transaction) => {
          await transaction
            .deleteFrom('company_account_owners')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute();
          await transaction
            .deleteFrom('company_receipts')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute();
          await transaction
            .deleteFrom('company_audit_events')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
            .execute();
          await transaction
            .deleteFrom('company_snapshots')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId)
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

  it.skipIf(database === undefined)(
    'issues one account option and atomically creates, replays and reloads its company',
    async () => {
      if (database === undefined || connectionString === undefined)
        throw new Error('company test database missing');

      const accountId = randomUUID();
      const sessionToken = randomUUID();
      const foreignAccountId = randomUUID();
      const foreignSessionToken = randomUUID();
      const issuer = `company-create-test-${accountId}`;
      const worldId = randomUUID();
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
      let companyId: string | undefined;
      let candidateSetId: string | undefined;
      let commandId: string | undefined;

      try {
        await database
          .insertInto('identity_accounts')
          .values([
            { id: accountId, issuer, subject: 'owner' },
            { id: foreignAccountId, issuer, subject: 'foreign' },
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
        const headers = {
          cookie: `warwrit_session=${sessionToken}`,
          origin: 'http://127.0.0.1:3107',
        };
        expect(
          await database
            .selectFrom('world_campaign_clocks')
            .select('world_id')
            .where('world_id', '=', worldId)
            .executeTakeFirst(),
        ).toBeUndefined();
        const options = await createdApp.inject({
          method: 'POST',
          url: '/company/opening-options',
          headers,
          payload: {},
        });
        expect(options.statusCode).toBe(200);
        expect(
          await database
            .selectFrom('world_campaign_clocks')
            .select('world_id')
            .where('world_id', '=', worldId)
            .executeTakeFirst(),
        ).toEqual({ world_id: worldId });
        const opening = options.json().opening as {
          candidateSetId: string;
          companyId: string;
          origin: { id: string };
          culture: { id: string };
          homeland: { id: string };
          familyStory: { id: string };
          bannerId: string;
          leaderDefaults: Omit<CreateCompanyPayloadDto['leaderInput'], 'birthName'>;
          candidates: readonly {
            characterId: string;
            name: string;
            sex: string;
            templateId: string;
          }[];
        };
        companyId = opening.companyId;
        candidateSetId = opening.candidateSetId;
        expect(opening.candidates.length).toBe(3);
        expect(
          (
            await createdApp.inject({
              method: 'POST',
              url: '/company/opening-options',
              headers,
              payload: {},
            })
          ).json().opening.candidateSetId,
        ).toBe(candidateSetId);

        const evidenceRow = await database
          .selectFrom('company_opening_options')
          .select('evidence')
          .where('world_id', '=', worldId)
          .where('account_id', '=', accountId)
          .where('id', '=', candidateSetId)
          .executeTakeFirstOrThrow();
        const evidence = evidenceRow.evidence as OpeningEvidence;
        const initial = createOpeningAggregate(evidence, []);
        await database
          .insertInto('company_snapshots')
          .values({
            world_id: worldId,
            company_id: companyId,
            schema_version: COMPANY_SCHEMA_VERSION,
            ruleset_id: COMPANY_RULESET_ID,
            catalogue_version: COMPANY_CATALOGUE_VERSION,
            command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
            public_revision: initial.economy.lifecycle.knowledge.revision,
            canonical_revision: initial.economy.lifecycle.revision,
            state: initial,
          })
          .execute();
        commandId = `company-create-${accountId}`;
        await database
          .insertInto('company_receipts')
          .values({
            world_id: worldId,
            company_id: companyId,
            receipt_id: `rollback-${accountId}`,
            command_id: commandId,
            source_key: null,
            request_key: 'rollback-sentinel',
            response: { sentinel: true },
            resulting_revision: '0',
          })
          .execute();

        const payload: CreateCompanyPayloadDto = {
          originId: opening.origin.id,
          cultureId: opening.culture.id,
          homelandId: opening.homeland.id,
          familyStoryId: opening.familyStory.id,
          leaderInput: { birthName: 'Alda', ...opening.leaderDefaults },
          candidateSetId,
          selectedCandidateIds: [opening.candidates[0]!.characterId],
          name: 'The Gray Company',
          bannerId: opening.bannerId,
        };
        const requestBody: CreateCompanyRequestDto = {
          schemaVersion: 1,
          commandId,
          type: 'CreateCompany',
          payload,
        };
        const invalidCommandId = `${commandId}-invalid`;
        const rejected = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: {
            ...requestBody,
            commandId: invalidCommandId,
            payload: { ...payload, selectedCandidateIds: [] },
          },
        });
        expect(rejected.statusCode).toBe(409);
        expect(rejected.json()).toEqual({
          commandId: invalidCommandId,
          ok: false,
          publicRevision: '0',
          code: 'INVALID_COMMAND',
        });
        await database.transaction().execute(async (transaction) => {
          expect(await loadCompanyAggregate(transaction, worldId, companyId!)).toEqual(initial);
          expect(
            await transaction
              .selectFrom('company_account_owners')
              .select('account_id')
              .where('world_id', '=', worldId)
              .where('account_id', '=', accountId)
              .executeTakeFirst(),
          ).toBeUndefined();
          expect(
            await transaction
              .selectFrom('company_receipts')
              .select('command_id')
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId!)
              .where('command_id', '=', invalidCommandId)
              .executeTakeFirst(),
          ).toBeUndefined();
          expect(
            (
              await transaction
                .selectFrom('company_opening_options')
                .select('consumed_at')
                .where('world_id', '=', worldId)
                .where('account_id', '=', accountId)
                .where('id', '=', candidateSetId!)
                .executeTakeFirstOrThrow()
            ).consumed_at,
          ).toBeNull();
        });
        const failed = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: requestBody,
        });
        expect(failed.statusCode, failed.body).toBe(500);
        await database.transaction().execute(async (transaction) => {
          expect(await loadCompanyAggregate(transaction, worldId, companyId!)).toEqual(initial);
          expect(
            await transaction
              .selectFrom('company_account_owners')
              .selectAll()
              .where('world_id', '=', worldId)
              .where('account_id', '=', accountId)
              .executeTakeFirst(),
          ).toBeUndefined();
          expect(
            (
              await transaction
                .selectFrom('company_opening_options')
                .select('consumed_at')
                .where('world_id', '=', worldId)
                .where('account_id', '=', accountId)
                .where('id', '=', candidateSetId!)
                .executeTakeFirstOrThrow()
            ).consumed_at,
          ).toBeNull();
          expect(
            await transaction
              .selectFrom('company_audit_events')
              .select('sequence')
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId!)
              .executeTakeFirst(),
          ).toBeUndefined();
        });
        await database
          .deleteFrom('company_receipts')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .where('receipt_id', '=', `rollback-${accountId}`)
          .execute();

        const failingDatabase = new Proxy(database, {
          get(target, property) {
            if (property === 'transaction') {
              return () => {
                const transaction = target.transaction();
                return {
                  execute: (callback: Parameters<typeof transaction.execute>[0]) =>
                    transaction.execute(async (connection) => {
                      await callback(connection);
                      throw new Error('injected failure before transaction commit');
                    }),
                };
              };
            }
            const value = Reflect.get(target, property, target) as unknown;
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        const preCommitFailureApp = buildApp({
          identity: { config: appConfig.identity!, database: failingDatabase },
          company: { database: failingDatabase, worldId },
        });
        apps.push(preCommitFailureApp);
        const preCommitFailed = await preCommitFailureApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: requestBody,
        });
        expect(preCommitFailed.statusCode, preCommitFailed.body).toBe(500);
        await database.transaction().execute(async (transaction) => {
          expect(await loadCompanyAggregate(transaction, worldId, companyId!)).toEqual(initial);
          expect(
            await transaction
              .selectFrom('company_account_owners')
              .select('account_id')
              .where('world_id', '=', worldId)
              .where('account_id', '=', accountId)
              .executeTakeFirst(),
          ).toBeUndefined();
          expect(
            await transaction
              .selectFrom('company_receipts')
              .select('receipt_id')
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId!)
              .where('command_id', '=', commandId!)
              .executeTakeFirst(),
          ).toBeUndefined();
          expect(
            await transaction
              .selectFrom('company_audit_events')
              .select('sequence')
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId!)
              .executeTakeFirst(),
          ).toBeUndefined();
          const option = await transaction
            .selectFrom('company_opening_options')
            .select('consumed_at')
            .where('world_id', '=', worldId)
            .where('account_id', '=', accountId)
            .where('id', '=', candidateSetId!)
            .executeTakeFirstOrThrow();
          expect(option.consumed_at).toBeNull();
        });

        const created = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: requestBody,
        });
        expect(created.statusCode, created.body).toBe(201);
        expect(created.json()).toMatchObject({ commandId, ok: true });
        const replay = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers,
          payload: requestBody,
        });
        expect(replay.statusCode).toBe(200);
        expect(replay.json()).toEqual(created.json());

        const ownerRead = await createdApp.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${sessionToken}` },
        });
        expect(ownerRead.statusCode).toBe(200);
        const ownerCompany = ownerRead.json().company as {
          revision: string;
          companyPresentation: { name: string; bannerId: string } | null;
          leaderId: string | null;
          runStatus: string;
          characters: readonly {
            characterId: string;
            name: string;
            knownStatus: string;
            perkIds: readonly string[];
          }[];
        };
        expect(ownerCompany).toMatchObject({ companyId, runStatus: 'ACTIVE' });
        expect(ownerCompany.companyPresentation).toEqual({
          name: 'The Gray Company',
          bannerId: opening.bannerId,
        });
        expect(ownerCompany.leaderId).toBeTruthy();
        expect(ownerCompany.characters).toHaveLength(2);
        expect(ownerCompany.characters.map((character) => character.name)).toEqual(
          expect.arrayContaining(['Alda', opening.candidates[0]!.name]),
        );
        expect(
          ownerCompany.characters.every((character) => character.knownStatus === 'AVAILABLE'),
        ).toBe(true);
        expect(
          ownerCompany.characters.some((character) =>
            opening.candidates
              .slice(1)
              .some((candidate) => candidate.characterId === character.characterId),
          ),
        ).toBe(false);

        // Give the already-observed leader a real catalogue milestone so this
        // route-level test exercises a valid ChoosePerk instead of bypassing
        // domain preconditions with a placeholder command.
        await database.transaction().execute(async (transaction) => {
          const stored = await loadCompanyAggregate(transaction, worldId, companyId!);
          if (!stored) throw new Error('created company snapshot missing');
          const lifecycle = stored.economy.lifecycle;
          const characterId = ownerCompany.leaderId!;
          const progress = initialSkillProgress(25, `perk-test-${accountId}`);
          const characters = lifecycle.characters.map((character) =>
            character.identity.characterId === characterId
              ? { ...character, skills: { ...character.skills, leadership: progress } }
              : character,
          );
          const knownCharacters = lifecycle.knowledge.characters.map((character) =>
            character.identity.characterId === characterId
              ? { ...character, skills: { ...character.skills, leadership: progress } }
              : character,
          );
          const next = readCompanyCombatAggregateState({
            ...stored,
            economy: {
              ...stored.economy,
              lifecycle: {
                ...lifecycle,
                characters,
                knowledge: { ...lifecycle.knowledge, characters: knownCharacters },
              },
            },
          });
          await transaction
            .updateTable('company_snapshots')
            .set({ state: next })
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .executeTakeFirstOrThrow();
        });

        const commandHeaders = {
          ...headers,
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId!,
        };
        const malformedPerk = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: {
            schemaVersion: 2,
            commandId: `malformed-${accountId}`,
            expectedPublicRevision: ownerCompany.revision,
            type: 'ChoosePerk',
            payload: {
              characterId: ownerCompany.leaderId!,
              perkId: 'leadership-25-a',
              milestone: 25,
              privileged: true,
            },
          },
        });
        expect(malformedPerk.statusCode).toBe(400);

        const malformedPayroll = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: { ...headers, [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId! },
          payload: {
            schemaVersion: 2,
            commandId: `malformed-payroll-${accountId}`,
            expectedPublicRevision: ownerCompany.revision,
            type: 'PayClaims',
            payload: { poolId: 'local', amountQ: '0', claimIds: [], mode: 'DEFAULT' },
          },
        });
        expect(malformedPayroll.statusCode).toBe(400);

        const foreignCommand = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: {
            cookie: `warwrit_session=${foreignSessionToken}`,
            origin: 'http://127.0.0.1:3107',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId!,
          },
          payload: {
            schemaVersion: 2,
            commandId: `foreign-${accountId}`,
            expectedPublicRevision: ownerCompany.revision,
            type: 'RenameCompany',
            payload: { name: 'Foreign takeover', bannerId: opening.bannerId },
          },
        });
        expect(foreignCommand.statusCode).toBe(403);
        expect(foreignCommand.json()).toMatchObject({ code: 'NOT_AUTHORIZED' });
        const foreignPayroll = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: {
            cookie: `warwrit_session=${foreignSessionToken}`,
            origin: 'http://127.0.0.1:3107',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId!,
          },
          payload: {
            schemaVersion: 2,
            commandId: `foreign-payroll-${accountId}`,
            expectedPublicRevision: ownerCompany.revision,
            type: 'PayClaims',
            payload: { poolId: 'local', amountQ: '1', claimIds: [], mode: 'DEFAULT' },
          },
        });
        expect(foreignPayroll.statusCode).toBe(403);
        expect(foreignPayroll.json()).toMatchObject({ code: 'NOT_AUTHORIZED' });
        expect(
          await database
            .selectFrom('company_receipts')
            .select('command_id')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .where('command_id', '=', `foreign-${accountId}`)
            .executeTakeFirst(),
        ).toBeUndefined();
        const perkCommand = {
          schemaVersion: 2,
          commandId: `perk-${accountId}`,
          expectedPublicRevision: ownerCompany.revision,
          type: 'ChoosePerk',
          payload: {
            characterId: ownerCompany.leaderId!,
            perkId: 'leadership-25-a',
            milestone: 25,
          },
        };
        const selectedPerk = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: perkCommand,
        });
        expect(selectedPerk.statusCode, selectedPerk.body).toBe(200);
        const perkRevision = (BigInt(ownerCompany.revision) + 1n).toString();
        expect(selectedPerk.json()).toMatchObject({ ok: true, publicRevision: perkRevision });
        const perkRead = await createdApp.inject({ method: 'GET', url: '/company', headers });
        expect(perkRead.json().company.characters).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              characterId: ownerCompany.leaderId,
              perkIds: ['leadership-25-a'],
            }),
          ]),
        );
        const perkReplay = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: perkCommand,
        });
        expect(perkReplay.statusCode).toBe(200);
        expect(perkReplay.json()).toEqual(selectedPerk.json());

        const renameCommand = {
          schemaVersion: 2,
          commandId: `rename-${accountId}`,
          expectedPublicRevision: perkRevision,
          type: 'RenameCompany',
          payload: { name: 'The Ashen Company', bannerId: opening.bannerId },
        };
        const renamed = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: renameCommand,
        });
        expect(renamed.statusCode, renamed.body).toBe(200);
        const renamedRevision = (BigInt(perkRevision) + 1n).toString();
        expect(renamed.json()).toMatchObject({ ok: true, publicRevision: renamedRevision });
        expect(
          (await createdApp.inject({ method: 'GET', url: '/company', headers })).json().company,
        ).toMatchObject({
          revision: renamedRevision,
          companyPresentation: { name: 'The Ashen Company', bannerId: opening.bannerId },
        });
        const renameReplay = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: renameCommand,
        });
        expect(renameReplay.statusCode).toBe(200);
        expect(renameReplay.json()).toEqual(renamed.json());

        const commandCollision = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: {
            ...renameCommand,
            payload: { name: 'Changed request', bannerId: opening.bannerId },
          },
        });
        expect(commandCollision.statusCode).toBe(409);
        expect(commandCollision.json()).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
        const stale = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: {
            ...renameCommand,
            commandId: `stale-${accountId}`,
            payload: { name: 'Stale Company', bannerId: opening.bannerId },
          },
        });
        expect(stale.statusCode).toBe(409);
        expect(stale.json()).toMatchObject({
          code: 'STALE_REVISION',
          publicRevision: renamedRevision,
        });
        const unsupported = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: {
            schemaVersion: 2,
            commandId: `unsupported-${accountId}`,
            expectedPublicRevision: renamedRevision,
            type: 'Recruit',
            payload: {},
          },
        });
        expect(unsupported.statusCode).toBe(409);
        expect(unsupported.json()).toMatchObject({ code: 'UNSUPPORTED_ACTION' });

        const concurrentRevision = renamedRevision;
        const concurrent = await Promise.all(
          ['One', 'Two'].map((suffix) =>
            createdApp.inject({
              method: 'POST',
              url: '/company/commands',
              headers: commandHeaders,
              payload: {
                schemaVersion: 2,
                commandId: `concurrent-${suffix}-${accountId}`,
                expectedPublicRevision: concurrentRevision,
                type: 'RenameCompany',
                payload: { name: `Concurrent ${suffix}`, bannerId: opening.bannerId },
              },
            }),
          ),
        );
        expect(concurrent.map((response) => response.statusCode).toSorted()).toEqual([200, 409]);
        expect(
          concurrent
            .map((response) => response.json())
            .find((body) => body.code === 'STALE_REVISION'),
        ).toBeDefined();
        const postConcurrentRevision = (BigInt(concurrentRevision) + 1n).toString();

        const rollbackBefore = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, companyId!));
        if (!rollbackBefore) throw new Error('company snapshot missing before rollback check');
        const failingCommandDatabase = new Proxy(database, {
          get(target, property) {
            if (property === 'transaction') {
              return () => {
                const transaction = target.transaction();
                return {
                  execute: (callback: Parameters<typeof transaction.execute>[0]) =>
                    transaction.execute(async (connection) => {
                      await callback(connection);
                      throw new Error('injected failure before transaction commit');
                    }),
                };
              };
            }
            const value = Reflect.get(target, property, target) as unknown;
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        const failingCommandApp = buildApp({
          identity: { config: appConfig.identity!, database: failingCommandDatabase },
          company: { database: failingCommandDatabase, worldId },
        });
        apps.push(failingCommandApp);
        const rollbackCommand = {
          schemaVersion: 2,
          commandId: `rollback-rename-${accountId}`,
          expectedPublicRevision: postConcurrentRevision,
          type: 'RenameCompany',
          payload: { name: 'Must Roll Back', bannerId: opening.bannerId },
        };
        const rolledBack = await failingCommandApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders,
          payload: rollbackCommand,
        });
        expect(rolledBack.statusCode).toBe(500);
        const rollbackAfter = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, companyId!));
        expect(rollbackAfter).toEqual(rollbackBefore);
        expect(
          await database
            .selectFrom('company_receipts')
            .select('command_id')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .where('command_id', '=', rollbackCommand.commandId)
            .executeTakeFirst(),
        ).toBeUndefined();

        const readbackDatabase = createDatabase(connectionString);
        try {
          await readbackDatabase.transaction().execute(async (transaction) => {
            const stored = await loadCompanyAggregate(transaction, worldId, companyId!);
            expect(stored?.economy.lifecycle.company?.companyId).toBe(companyId);
            expect(stored?.economy.lifecycle.company?.name).toMatch(/^Concurrent (One|Two)$/);
            expect(
              stored?.economy.lifecycle.characters.find(
                (character) => character.identity.characterId === ownerCompany.leaderId,
              )?.perks,
            ).toContain('leadership-25-a');
            expect(
              stored?.economy.lifecycle.characters.some(
                (character) =>
                  character.identity.characterId === stored.economy.lifecycle.company?.founderId,
              ),
            ).toBe(true);
            expect(
              await transaction
                .selectFrom('company_account_owners')
                .select('account_id')
                .where('world_id', '=', worldId)
                .where('account_id', '=', accountId)
                .executeTakeFirst(),
            ).toEqual({ account_id: accountId });
            expect(
              (
                await transaction
                  .selectFrom('company_opening_options')
                  .select('consumed_command_id')
                  .where('world_id', '=', worldId)
                  .where('account_id', '=', accountId)
                  .where('id', '=', candidateSetId!)
                  .executeTakeFirstOrThrow()
              ).consumed_command_id,
            ).toBe(commandId);
            expect(
              await transaction
                .selectFrom('company_receipts')
                .select('response')
                .where('world_id', '=', worldId)
                .where('company_id', '=', companyId!)
                .where('command_id', '=', commandId!)
                .executeTakeFirst(),
            ).toEqual({ response: created.json() });
          });
        } finally {
          await readbackDatabase.destroy();
        }
        const summary = await createdApp.inject({ method: 'GET', url: '/company', headers });
        expect(summary.statusCode).toBe(200);
        expect(summary.json().company.companyId).toBe(companyId);

        // Replace only this already-created integration company's state with the
        // canonical service fixture. Its opening evidence, owner and purse remain
        // the actual values produced by the route above.
        const payrollSeed = createCompanyCombatAggregateFixture().state;
        const payrollState = JSON.parse(
          JSON.stringify(payrollSeed)
            .replaceAll('"world"', JSON.stringify(worldId))
            .replaceAll('"a-company"', JSON.stringify(companyId))
            .replaceAll('"a-party"', JSON.stringify(evidence.partyId))
            .replaceAll('"purse"', JSON.stringify(`${evidence.id}:company-purse`)),
        ) as typeof payrollSeed;
        await database.transaction().execute(async (transaction) => {
          await transaction
            .deleteFrom('company_receipts')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .execute();
          await transaction
            .deleteFrom('company_audit_events')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .execute();
          await transaction
            .updateTable('company_snapshots')
            .set({
              state: payrollState,
              public_revision: payrollState.economy.lifecycle.knowledge.revision,
              canonical_revision: payrollState.economy.lifecycle.revision,
            })
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .executeTakeFirstOrThrow();
        });

        const accrued = await advanceRealPayroll(worldId, companyId!);
        const accruedPayroll = projectPayroll(accrued.economy, companyId!);
        expect(BigInt(accruedPayroll?.duePayableQ ?? '0')).toBeGreaterThanOrEqual(4n);
        const payrollRead = await createdApp.inject({ method: 'GET', url: '/company', headers });
        expect(payrollRead.statusCode).toBe(200);
        expect(payrollRead.json().holdings.payroll).toEqual(accruedPayroll);

        const payrollHeaders = {
          ...headers,
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId!,
        };
        const payrollCommand = {
          schemaVersion: 2,
          commandId: `payroll-${accountId}`,
          expectedPublicRevision: accrued.economy.lifecycle.knowledge.revision,
          type: 'PayClaims',
          payload: {
            poolId: 'local',
            amountQ: '2',
            claimIds: [],
            mode: 'TARGETED',
            payeeId: 'a-worker-0',
          },
        };
        const refusedRequest = {
          ...payrollCommand,
          commandId: `payroll-poor-${accountId}`,
          payload: { ...payrollCommand.payload, amountQ: '999999' },
        };
        const beforeRefusal = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, companyId!));
        if (!beforeRefusal) throw new Error('company snapshot missing before payroll refusal');
        const refusal = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: payrollHeaders,
          payload: refusedRequest,
        });
        expect(refusal.statusCode).toBe(409);
        expect(refusal.json()).toMatchObject({
          ok: false,
          publicRevision: beforeRefusal.economy.lifecycle.knowledge.revision,
          code: 'INSUFFICIENT_FUNDS',
        });
        await database.transaction().execute(async (transaction) => {
          expect(await loadCompanyAggregate(transaction, worldId, companyId!)).toEqual(
            beforeRefusal,
          );
          expect(
            await transaction
              .selectFrom('company_receipts')
              .select('command_id')
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId!)
              .where('command_id', '=', refusedRequest.commandId)
              .executeTakeFirst(),
          ).toBeUndefined();
        });
        const afterRefusalReadback = await createdApp.inject({
          method: 'GET',
          url: '/company',
          headers,
        });
        expect(afterRefusalReadback.json().company.revision).toBe(
          beforeRefusal.economy.lifecycle.knowledge.revision,
        );

        const failingPayrollDatabase = new Proxy(database, {
          get(target, property) {
            if (property === 'transaction') {
              return () => {
                const transaction = target.transaction();
                return {
                  execute: (callback: Parameters<typeof transaction.execute>[0]) =>
                    transaction.execute(async (connection) => {
                      await callback(connection);
                      throw new Error('injected payroll persistence failure');
                    }),
                };
              };
            }
            const value = Reflect.get(target, property, target) as unknown;
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        const failingPayrollApp = buildApp({
          identity: { config: appConfig.identity!, database: failingPayrollDatabase },
          company: { database: failingPayrollDatabase, worldId },
        });
        apps.push(failingPayrollApp);
        const payrollAuditBeforeFailure = await database
          .selectFrom('company_audit_events')
          .select(['event_id', 'event'])
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId!)
          .execute();
        const rollbackPayroll = {
          ...payrollCommand,
          commandId: `rollback-payroll-${accountId}`,
        };
        const payrollRollback = await failingPayrollApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: payrollHeaders,
          payload: rollbackPayroll,
        });
        expect(payrollRollback.statusCode).toBe(500);
        await database.transaction().execute(async (transaction) => {
          expect(await loadCompanyAggregate(transaction, worldId, companyId!)).toEqual(
            beforeRefusal,
          );
          expect(
            await transaction
              .selectFrom('company_receipts')
              .select('command_id')
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId!)
              .where('command_id', '=', rollbackPayroll.commandId)
              .executeTakeFirst(),
          ).toBeUndefined();
          const payrollAudit = await transaction
            .selectFrom('company_audit_events')
            .select(['event_id', 'event'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .execute();
          expect(payrollAudit).toEqual(payrollAuditBeforeFailure);
        });

        const firstPayrollSubmissions = await Promise.all(
          [0, 1].map(() =>
            createdApp.inject({
              method: 'POST',
              url: '/company/commands',
              headers: payrollHeaders,
              payload: payrollCommand,
            }),
          ),
        );
        expect(firstPayrollSubmissions.map((response) => response.statusCode)).toEqual([200, 200]);
        const paid = firstPayrollSubmissions[0]!;
        expect(firstPayrollSubmissions[1]!.json()).toEqual(paid.json());
        expect(paid.json()).toMatchObject({ commandId: payrollCommand.commandId, ok: true });
        const storedPayment = await database.transaction().execute(async (transaction) => {
          const stored = await loadCompanyAggregate(transaction, worldId, companyId!);
          if (!stored) throw new Error('company snapshot missing after payroll payment');
          const receipt = await transaction
            .selectFrom('company_receipts')
            .select(['response', 'resulting_revision'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .where('command_id', '=', payrollCommand.commandId)
            .executeTakeFirstOrThrow();
          const audit = await transaction
            .selectFrom('company_audit_events')
            .select(['event_id', 'event'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .execute();
          return { stored, receipt, audit };
        });
        expect(storedPayment.stored.economy.finance.wallets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ walletId: `${evidence.id}:company-purse`, cashQ: '98' }),
            expect.objectContaining({ walletId: 'wallet-worker-0', cashQ: '2' }),
          ]),
        );
        expect(storedPayment.receipt).toMatchObject({
          response: paid.json(),
          resulting_revision: storedPayment.stored.economy.lifecycle.revision,
        });
        expect(storedPayment.audit).toContainEqual(
          expect.objectContaining({
            event: expect.objectContaining({
              type: 'CompanyPayrollPaid',
              commandId: payrollCommand.commandId,
              amountQ: '2',
            }),
          }),
        );
        await database.transaction().execute(async (transaction) => {
          expect(await loadCompanyAggregate(transaction, worldId, companyId!)).toEqual(
            storedPayment.stored,
          );
          const audit = await transaction
            .selectFrom('company_audit_events')
            .select(['event_id', 'event'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .execute();
          expect(audit).toEqual(storedPayment.audit);
        });
        const paymentReplay = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: payrollHeaders,
          payload: payrollCommand,
        });
        expect(paymentReplay.statusCode).toBe(200);
        expect(paymentReplay.json()).toEqual(paid.json());
        const conflictingPayroll = {
          ...payrollCommand,
          payload: { ...payrollCommand.payload, amountQ: '1' },
        };
        const conflict = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: payrollHeaders,
          payload: conflictingPayroll,
        });
        expect(conflict.statusCode).toBe(409);
        expect(conflict.json()).toMatchObject({
          commandId: payrollCommand.commandId,
          code: 'IDEMPOTENCY_CONFLICT',
        });

        const concurrentPayroll = {
          ...payrollCommand,
          commandId: `payroll-race-${accountId}`,
          expectedPublicRevision: storedPayment.stored.economy.lifecycle.knowledge.revision,
          payload: { ...payrollCommand.payload, payeeId: 'a-worker-1' },
        };
        const concurrentConflict = {
          ...concurrentPayroll,
          payload: { ...concurrentPayroll.payload, amountQ: '1' },
        };
        const concurrentCommands = [concurrentPayroll, concurrentConflict];
        const concurrentSubmissions = await Promise.all(
          concurrentCommands.map((payload) =>
            createdApp.inject({
              method: 'POST',
              url: '/company/commands',
              headers: payrollHeaders,
              payload,
            }),
          ),
        );
        expect(concurrentSubmissions.map((response) => response.statusCode).toSorted()).toEqual([
          200, 409,
        ]);
        const winnerIndex = concurrentSubmissions.findIndex(
          (response) => response.statusCode === 200,
        );
        const winningPayrollCommand = concurrentCommands[winnerIndex]!;
        const racePaid = concurrentSubmissions[winnerIndex]!;
        expect(racePaid.json()).toMatchObject({
          commandId: winningPayrollCommand.commandId,
          ok: true,
        });
        expect(concurrentSubmissions[1 - winnerIndex]!.json()).toMatchObject({
          commandId: concurrentPayroll.commandId,
          code: 'IDEMPOTENCY_CONFLICT',
        });
        const postRacePayment = await database.transaction().execute(async (transaction) => {
          const stored = await loadCompanyAggregate(transaction, worldId, companyId!);
          if (!stored) throw new Error('company snapshot missing after concurrent payroll payment');
          const receipt = await transaction
            .selectFrom('company_receipts')
            .select(['response', 'resulting_revision'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .where('command_id', '=', concurrentPayroll.commandId)
            .executeTakeFirstOrThrow();
          const beforePayroll = projectPayroll(storedPayment.stored.economy, companyId!);
          const afterPayroll = projectPayroll(stored.economy, companyId!);
          const unpaidBefore =
            beforePayroll?.claims
              .filter((claim) => claim.payee.id === 'a-worker-1')
              .reduce((sum, claim) => sum + BigInt(claim.unsecuredQ), 0n) ?? 0n;
          const unpaidAfter =
            afterPayroll?.claims
              .filter((claim) => claim.payee.id === 'a-worker-1')
              .reduce((sum, claim) => sum + BigInt(claim.unsecuredQ), 0n) ?? 0n;
          expect(unpaidBefore - unpaidAfter).toBe(BigInt(winningPayrollCommand.payload.amountQ));
          const audit = await transaction
            .selectFrom('company_audit_events')
            .select(['event_id', 'event'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .execute();
          return { stored, receipt, audit };
        });
        const raceAmountQ = BigInt(winningPayrollCommand.payload.amountQ);
        expect(postRacePayment.stored.economy.finance.wallets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              walletId: `${evidence.id}:company-purse`,
              cashQ: (98n - raceAmountQ).toString(),
            }),
            expect.objectContaining({
              walletId: 'wallet-worker-0',
              cashQ: '2',
            }),
            expect.objectContaining({
              walletId: 'wallet-worker-1',
              cashQ: raceAmountQ.toString(),
            }),
          ]),
        );
        expect(postRacePayment.receipt).toMatchObject({
          response: racePaid.json(),
          resulting_revision: postRacePayment.stored.economy.lifecycle.revision,
        });
        const racePaidEvents = postRacePayment.audit.filter(
          (row) =>
            typeof row.event === 'object' &&
            row.event !== null &&
            'type' in row.event &&
            row.event.type === 'CompanyPayrollPaid' &&
            'commandId' in row.event &&
            row.event.commandId === winningPayrollCommand.commandId,
        );
        expect(racePaidEvents).toHaveLength(1);
        expect(postRacePayment.audit).toContainEqual(
          expect.objectContaining({
            event: expect.objectContaining({
              type: 'CompanyPayrollPaid',
              commandId: winningPayrollCommand.commandId,
              amountQ: winningPayrollCommand.payload.amountQ,
            }),
          }),
        );
        const exactRaceReplays = await Promise.all(
          [0, 1].map(() =>
            createdApp.inject({
              method: 'POST',
              url: '/company/commands',
              headers: payrollHeaders,
              payload: winningPayrollCommand,
            }),
          ),
        );
        expect(exactRaceReplays.map((response) => response.statusCode)).toEqual([200, 200]);
        expect(exactRaceReplays[0]!.json()).toEqual(racePaid.json());
        expect(exactRaceReplays[1]!.json()).toEqual(racePaid.json());
        await database.transaction().execute(async (transaction) => {
          expect(await loadCompanyAggregate(transaction, worldId, companyId!)).toEqual(
            postRacePayment.stored,
          );
          const audit = await transaction
            .selectFrom('company_audit_events')
            .select(['event_id', 'event'])
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .execute();
          expect(audit).toEqual(postRacePayment.audit);
        });

        const remoteLocation = { kind: 'AT' as const, siteId: 'remote', areaId: 'road' };
        const moved = {
          ...postRacePayment.stored,
          economy: {
            ...postRacePayment.stored.economy,
            lifecycle: {
              ...postRacePayment.stored.economy.lifecycle,
              parties: postRacePayment.stored.economy.lifecycle.parties.map((party) =>
                party.partyId === evidence.partyId ? { ...party, location: remoteLocation } : party,
              ),
              characters: postRacePayment.stored.economy.lifecycle.characters.map((character) =>
                character.presence.fieldPartyId === evidence.partyId
                  ? { ...character, presence: { ...character.presence, location: remoteLocation } }
                  : character,
              ),
            },
          },
        };
        await database.transaction().execute(async (transaction) => {
          await transaction
            .updateTable('company_snapshots')
            .set({ state: moved })
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyId!)
            .executeTakeFirstOrThrow();
          await transaction
            .updateTable('world_campaign_clocks')
            .set({ epoch_ms: String(Date.now()), starting_tick: '3000' })
            .where('world_id', '=', worldId)
            .executeTakeFirstOrThrow();
        });
        const historicalReplay = await createdApp.inject({
          method: 'POST',
          url: '/company/commands',
          headers: payrollHeaders,
          payload: payrollCommand,
        });
        expect(historicalReplay.statusCode).toBe(200);
        expect(historicalReplay.json()).toEqual(paid.json());
      } finally {
        if (companyId !== undefined) {
          const cleanupCompanyId = companyId;
          await database.transaction().execute(async (transaction) => {
            await transaction
              .deleteFrom('company_account_owners')
              .where('world_id', '=', worldId)
              .where('company_id', '=', cleanupCompanyId)
              .execute();
            await transaction
              .deleteFrom('company_receipts')
              .where('world_id', '=', worldId)
              .where('company_id', '=', cleanupCompanyId)
              .execute();
            await transaction
              .deleteFrom('company_audit_events')
              .where('world_id', '=', worldId)
              .where('company_id', '=', cleanupCompanyId)
              .execute();
            await transaction
              .deleteFrom('company_snapshots')
              .where('world_id', '=', worldId)
              .where('company_id', '=', cleanupCompanyId)
              .execute();
          });
        }
        await database
          .deleteFrom('company_opening_options')
          .where('world_id', '=', worldId)
          .where('account_id', '=', accountId)
          .execute();
        await database
          .deleteFrom('identity_sessions')
          .where('account_id', 'in', [accountId, foreignAccountId])
          .execute();
        await database
          .deleteFrom('identity_accounts')
          .where('id', 'in', [accountId, foreignAccountId])
          .execute();
        await database
          .deleteFrom('world_campaign_clocks')
          .where('world_id', '=', worldId)
          .execute();
        expect(
          await database
            .selectFrom('world_campaign_clocks')
            .select('world_id')
            .where('world_id', '=', worldId)
            .executeTakeFirst(),
        ).toBeUndefined();
        expect(
          await database
            .selectFrom('identity_accounts')
            .select('id')
            .where('id', '=', accountId)
            .executeTakeFirst(),
        ).toBeUndefined();
        if (candidateSetId !== undefined) {
          expect(
            await database
              .selectFrom('company_opening_options')
              .select('id')
              .where('world_id', '=', worldId)
              .where('account_id', '=', accountId)
              .where('id', '=', candidateSetId)
              .executeTakeFirst(),
          ).toBeUndefined();
        }
        if (companyId !== undefined) {
          await database.transaction().execute(async (transaction) => {
            expect(
              await transaction
                .selectFrom('company_snapshots')
                .select('company_id')
                .where('world_id', '=', worldId)
                .where('company_id', '=', companyId!)
                .executeTakeFirst(),
            ).toBeUndefined();
            expect(
              await transaction
                .selectFrom('company_account_owners')
                .select('company_id')
                .where('world_id', '=', worldId)
                .where('company_id', '=', companyId!)
                .executeTakeFirst(),
            ).toBeUndefined();
            expect(
              await transaction
                .selectFrom('company_receipts')
                .select('company_id')
                .where('world_id', '=', worldId)
                .where('company_id', '=', companyId!)
                .executeTakeFirst(),
            ).toBeUndefined();
            expect(
              await transaction
                .selectFrom('company_audit_events')
                .select('company_id')
                .where('world_id', '=', worldId)
                .where('company_id', '=', companyId!)
                .executeTakeFirst(),
            ).toBeUndefined();
          });
        }
      }
    },
  );
});

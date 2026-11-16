import { createHash, randomUUID } from 'node:crypto';
import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  campaignTick,
  canonicalRevision,
  emptyWhoseWolvesQuestState,
  huntProfile,
  matureWhoseWolvesRaid,
  moneyQ,
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractTerms,
  publicRevision,
  readCompanyCombatAggregateState,
  readOrdinaryContractState,
  WHOSE_WOLVES_INSTANCE_ID,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';
import {
  ensureHuntGenesisInTransaction,
  updateHuntWorldRow,
} from '../contracts/first-hunt-runtime.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('company return report (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'baselines first access, offers a stable owner-only snapshot, and acknowledges only its saved bounds',
    async () => {
      if (database === undefined || connectionString === undefined)
        throw new Error('company test database missing');

      const accountId = randomUUID();
      const otherAccountId = randomUUID();
      const token = randomUUID();
      const otherToken = randomUUID();
      const worldId = randomUUID();
      const companyId = randomUUID();
      const issuer = `return-report-test-${worldId}`;
      const config = loadServerConfig({
        DATABASE_URL: connectionString,
        OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
        OIDC_CLIENT_ID: 'warwrit-local',
        OIDC_CLIENT_SECRET: 'local-only-secret',
        OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
        PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
        HOST: '127.0.0.1',
        PORT: '3107',
      });
      const app = buildApp({
        identity: { config: config.identity!, database },
        company: { database, worldId },
      });
      apps.push(app);

      const fixture = createCompanyCombatAggregateFixture().state;
      const serialized = JSON.stringify(fixture)
        .replaceAll('"world"', JSON.stringify(worldId))
        .replaceAll('"a-company"', JSON.stringify(companyId));
      let state = JSON.parse(serialized) as typeof fixture;
      await database
        .insertInto('identity_accounts')
        .values([
          { id: accountId, issuer, subject: 'owner' },
          { id: otherAccountId, issuer, subject: 'other' },
        ])
        .execute();
      await database
        .insertInto('identity_sessions')
        .values([
          {
            token_digest: createHash('sha256').update(token).digest(),
            account_id: accountId,
            expires_at: new Date(Date.now() + 60_000),
          },
          {
            token_digest: createHash('sha256').update(otherToken).digest(),
            account_id: otherAccountId,
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
          public_revision: state.economy.lifecycle.knowledge.revision,
          canonical_revision: state.economy.lifecycle.revision,
          state,
        })
        .execute();
      await database
        .insertInto('company_account_owners')
        .values({ world_id: worldId, company_id: companyId, account_id: accountId })
        .execute();
      await database
        .insertInto('company_audit_events')
        .values({
          world_id: worldId,
          company_id: companyId,
          revision: state.economy.lifecycle.revision,
          event_id: 'return-report-purchase-before-baseline',
          event: {
            type: 'SuppliesPurchased',
            commandId: 'purchase-before-baseline',
            siteId: 'kamenny-brod-market',
            quantity: 1,
            costQ: '200',
            shopRevision: '3',
          },
        })
        .execute();

      const ownerHeaders = { cookie: `warwrit_session=${token}` };
      const otherHeaders = { cookie: `warwrit_session=${otherToken}` };
      const origin = { origin: 'http://127.0.0.1:3107' };
      const ownerPostHeaders = { ...ownerHeaders, ...origin };
      const otherPostHeaders = { ...otherHeaders, ...origin };
      const anonymousRead = await app.inject({ method: 'GET', url: '/company/return-report' });
      const otherRead = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: otherHeaders,
      });
      const anonymousAck = await app.inject({
        method: 'POST',
        url: '/company/return-report/ack',
        headers: origin,
        payload: { schemaVersion: 1, reportId: randomUUID() },
      });
      const otherAck = await app.inject({
        method: 'POST',
        url: '/company/return-report/ack',
        headers: otherPostHeaders,
        payload: { schemaVersion: 1, reportId: randomUUID() },
      });
      expect(anonymousRead.statusCode).toBe(401);
      expect(otherRead.statusCode).toBe(403);
      expect(anonymousAck.statusCode).toBe(401);
      expect(otherAck.statusCode).toBe(403);
      const wrongScopeRead = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: { ...ownerHeaders, [WORLD_EXPECTED_COMPANY_ID_HEADER]: 'old-company' },
      });
      const wrongScopeAck = await app.inject({
        method: 'POST',
        url: '/company/return-report/ack',
        headers: { ...ownerPostHeaders, [WORLD_EXPECTED_COMPANY_ID_HEADER]: 'old-company' },
        payload: { schemaVersion: 1, reportId: randomUUID() },
      });
      expect(wrongScopeRead.statusCode).toBe(409);
      expect(wrongScopeAck.statusCode).toBe(409);

      const firstRead = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: ownerHeaders,
      });
      expect(firstRead.statusCode).toBe(200);
      expect(firstRead.json()).toEqual({ report: null });

      const movementFrom = state.economy.finance.wallets[0]!.walletId;
      const movementTo = state.economy.finance.wallets.find(
        (wallet) => wallet.owner.kind === 'CHARACTER' && wallet.owner.id === 'a-worker-0',
      )!.walletId;
      const purchaseAfterBaselineId = 'return-report-purchase-after-baseline';
      const knownEventId = 'return-report-known-event';
      const hiddenEventId = 'return-report-hidden-event';
      state = {
        ...state,
        economy: {
          ...state.economy,
          lifecycle: {
            ...state.economy.lifecycle,
            campaignTick: campaignTick('2000'),
            revision: canonicalRevision('1'),
            knowledge: {
              ...state.economy.lifecycle.knowledge,
              revision: publicRevision('1'),
              eventIds: [...state.economy.lifecycle.knowledge.eventIds, knownEventId],
            },
          },
          finance: {
            ...state.economy.finance,
            processedTick: campaignTick('2000'),
            claims: [
              ...state.economy.finance.claims,
              {
                claimId: 'return-report-wage-claim',
                membershipId: 'service-worker-0',
                poolId: 'local',
                rateVersion: 'test-rate-v1',
                dueAt: campaignTick('2000'),
                fromTick: campaignTick('1900'),
                toTick: campaignTick('2000'),
                dailyWageMilli: '1',
                maintenanceId: null,
                earned: [
                  {
                    fromTick: campaignTick('1900'),
                    toTick: campaignTick('2000'),
                    dailyWageMilli: '1',
                    maintenanceId: null,
                  },
                ],
                paidQ: moneyQ('100'),
                reportedQ: moneyQ('100'),
                reportedCoveredQ: moneyQ('0'),
              },
            ],
            movements: [
              ...state.economy.finance.movements,
              {
                movementId: 'return-report-wage-movement',
                from: movementFrom,
                to: movementTo,
                amountQ: moneyQ('100'),
                purpose: 'WAGE',
                atTick: campaignTick('2000'),
              },
            ],
          },
          physical: {
            ...state.economy.physical!,
            processedTick: campaignTick('2000'),
            food: [
              ...state.economy.physical!.food,
              {
                sourceId: 'return-report-food-source',
                membershipId: 'service-worker-0',
                fromTick: campaignTick('500'),
                toTick: campaignTick('2000'),
                channel: 'STOCK',
                unitsConsumed: '2',
              },
            ],
            foodCarry: [
              ...state.economy.physical!.foodCarry,
              { membershipId: 'service-worker-0', tickUnits: '500' },
            ],
          },
        },
      };
      await database
        .updateTable('company_snapshots')
        .set({
          state,
          canonical_revision: state.economy.lifecycle.revision,
          public_revision: state.economy.lifecycle.knowledge.revision,
        })
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      await database
        .insertInto('company_audit_events')
        .values([
          {
            world_id: worldId,
            company_id: companyId,
            revision: '1',
            event_id: purchaseAfterBaselineId,
            event: {
              type: 'SuppliesPurchased',
              commandId: 'purchase-after-baseline',
              siteId: 'kamenny-brod-market',
              quantity: 2,
              costQ: '400',
              shopRevision: '4',
            },
          },
          {
            world_id: worldId,
            company_id: companyId,
            revision: '1',
            event_id: knownEventId,
            event: {
              id: knownEventId,
              type: 'ServiceStarted',
              atTick: '2000',
              subjectIds: ['a-worker-0'],
            },
          },
          {
            world_id: worldId,
            company_id: companyId,
            revision: '1',
            event_id: hiddenEventId,
            event: {
              id: hiddenEventId,
              type: 'HeirNotified',
              atTick: '2000',
              subjectIds: ['a-worker-0'],
            },
          },
        ])
        .execute();

      const offeredResponse = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: ownerHeaders,
      });
      expect(offeredResponse.statusCode).toBe(200);
      const offered = offeredResponse.json().report;
      expect(offered).toMatchObject({
        schemaVersion: 1,
        fromTick: '1000',
        toTick: '2000',
        elapsedCampaignTicks: '1000',
        elapsedDays: '1',
        rationsConsumed: '2',
        includesLateFoodSettlement: true,
        earliestFoodFromTick: '500',
        wages: { accruedQ: '100', paidQ: '100', currentOwedQ: '0' },
        debt: { currentQ: '0' },
        events: [{ type: 'ServiceStarted', atTick: '2000', subjectIds: ['a-worker-0'] }],
      });
      expect(offered.events).toHaveLength(1);
      const offeredId = offered.reportId as string;
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/company/return-report/ack',
            headers: ownerPostHeaders,
            payload: { schemaVersion: 1, reportId: randomUUID() },
          })
        ).statusCode,
      ).toBe(409);

      state = {
        ...state,
        economy: {
          ...state.economy,
          finance: {
            ...state.economy.finance,
            movements: [
              ...state.economy.finance.movements,
              {
                movementId: 'return-report-late-wage-movement',
                from: movementFrom,
                to: movementTo,
                amountQ: moneyQ('20'),
                purpose: 'WAGE',
                atTick: campaignTick('2000'),
              },
            ],
          },
        },
      };
      await database
        .updateTable('company_snapshots')
        .set({ state })
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();

      const repeatedOffer = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: ownerPostHeaders,
      });
      expect(repeatedOffer.json()).toEqual({ report: offered });
      const acknowledgement = await app.inject({
        method: 'POST',
        url: '/company/return-report/ack',
        headers: ownerPostHeaders,
        payload: { schemaVersion: 1, reportId: offeredId },
      });
      expect(acknowledgement.json()).toEqual({ ok: true, duplicate: false });
      const acknowledgedCursor = await database
        .selectFrom('company_return_report_cursors')
        .select('acknowledged_event_sequence')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const auditTail = await database
        .selectFrom('company_audit_events')
        .select(sql<string>`coalesce(max(sequence), 0)::text`.as('sequence'))
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      expect(acknowledgedCursor.acknowledged_event_sequence).toBe(auditTail.sequence);
      const duplicateAck = await app.inject({
        method: 'POST',
        url: '/company/return-report/ack',
        headers: ownerPostHeaders,
        payload: { schemaVersion: 1, reportId: offeredId },
      });
      expect(duplicateAck.json()).toEqual({ ok: true, duplicate: true });

      const afterAck = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: ownerHeaders,
      });
      expect(afterAck.json().report).toMatchObject({
        fromTick: '2000',
        toTick: '2000',
        elapsedDays: '0',
        rationsConsumed: '0',
        wages: { accruedQ: '0', paidQ: '20', currentOwedQ: '0' },
        events: [],
      });
      const nextId = afterAck.json().report.reportId as string;
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/company/return-report/ack',
            headers: ownerPostHeaders,
            payload: { schemaVersion: 1, reportId: nextId },
          })
        ).json(),
      ).toEqual({ ok: true, duplicate: false });
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/company/return-report',
            headers: ownerHeaders,
          })
        ).json(),
      ).toEqual({ report: null });

      const emptyWatch = ordinaryContractProfile('ci.m1.empty-watch-record.01')!;
      const terminalSourceEventId = 'empty-watch-after-same-tick-ack';
      const terminalState = readOrdinaryContractState(emptyWatch, {
        ...ordinaryContractGenesis(emptyWatch),
        revision: '8',
        ownerCompanyId: companyId,
        acceptedTerms: ordinaryContractTerms(emptyWatch),
        facts: [
          {
            slotId: 'empty-watch-proof-destroyed',
            companyId,
            sourceEventId: terminalSourceEventId,
            atTick: '2000',
          },
        ],
        outcome: {
          kind: 'SUCCESS',
          companyId,
          sourceEventId: terminalSourceEventId,
          atTick: '2000',
        },
      });
      await database
        .insertInto('ordinary_contracts')
        .values({
          world_id: worldId,
          instance_id: emptyWatch.instanceId,
          profile_id: emptyWatch.definitionId,
          revision: terminalState.revision,
          wallet_id: emptyWatch.walletId,
          wallet_q: emptyWatch.genesisWalletQ,
          state: terminalState,
        })
        .execute();

      const sameTickReport = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: ownerHeaders,
      });
      const terminalReport = sameTickReport.json().report;
      expect(terminalReport).toMatchObject({
        fromTick: '2000',
        toTick: '2000',
        contractOutcomes: [
          {
            instanceId: 'ci.m1.empty-watch-record.01',
            outcome: 'PROOF_DESTROYED',
            atTick: '2000',
          },
        ],
      });
      const repeatSameTickReport = await app.inject({
        method: 'GET',
        url: '/company/return-report',
        headers: ownerHeaders,
      });
      expect(repeatSameTickReport.json()).toEqual({ report: terminalReport });
      const terminalAck = await app.inject({
        method: 'POST',
        url: '/company/return-report/ack',
        headers: ownerPostHeaders,
        payload: { schemaVersion: 1, reportId: terminalReport.reportId },
      });
      expect(terminalAck.json()).toEqual({ ok: true, duplicate: false });
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/company/return-report',
            headers: ownerHeaders,
          })
        ).json(),
      ).toEqual({ report: null });

      const wolvesProfile = huntProfile(WHOSE_WOLVES_INSTANCE_ID)!;
      const wolvesState = {
        ...emptyWhoseWolvesQuestState(),
        companies: [{ companyId, findings: [], refusalPending: false }],
        outcome: {
          kind: 'PACK_KILLED' as const,
          companyId,
          sourceEventId: 'return-report-wolves-killed',
          atTick: '3000',
          raidDueTick: '10000',
        },
      };
      await database.transaction().execute(async (transaction) => {
        const world = await ensureHuntGenesisInTransaction(transaction, worldId, wolvesProfile);
        await updateHuntWorldRow(transaction, world, {
          revision: (BigInt(world.revision) + 1n).toString(),
          questState: wolvesState,
        });
      });

      const foulWell = ordinaryContractProfile('ci.m1.foul-well.01')!;
      const foulWellSourceEventId = 'return-report-foul-well-accused';
      const foulWellState = readOrdinaryContractState(foulWell, {
        ...ordinaryContractGenesis(foulWell),
        revision: '1',
        ownerCompanyId: companyId,
        acceptedTerms: ordinaryContractTerms(foulWell),
        facts: [
          {
            slotId: 'foul-well-aghafya-accused',
            companyId,
            sourceEventId: foulWellSourceEventId,
            atTick: '3000',
          },
        ],
        outcome: {
          kind: 'SUCCESS',
          companyId,
          sourceEventId: foulWellSourceEventId,
          atTick: '3000',
        },
      });
      await database
        .insertInto('ordinary_contracts')
        .values({
          world_id: worldId,
          instance_id: foulWell.instanceId,
          profile_id: foulWell.definitionId,
          revision: foulWellState.revision,
          wallet_id: foulWell.walletId,
          wallet_q: foulWell.genesisWalletQ,
          state: foulWellState,
        })
        .execute();

      const advanceReportState = (tick: string) => {
        return database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow()
          .then((snapshot) => {
            state = readCompanyCombatAggregateState(snapshot.state);
            state = {
              ...state,
              economy: {
                ...state.economy,
                lifecycle: { ...state.economy.lifecycle, campaignTick: campaignTick(tick) },
                finance: { ...state.economy.finance, processedTick: campaignTick(tick) },
                physical: { ...state.economy.physical!, processedTick: campaignTick(tick) },
              },
            };
            return database
              .updateTable('company_snapshots')
              .set({ state })
              .where('world_id', '=', worldId)
              .where('company_id', '=', companyId)
              .executeTakeFirstOrThrow();
          });
      };
      await advanceReportState('9999');
      const beforeDelayedFacts = (
        await app.inject({ method: 'GET', url: '/company/return-report', headers: ownerHeaders })
      ).json().report;
      expect(beforeDelayedFacts).toMatchObject({
        fromTick: '2000',
        toTick: '9999',
        contractOutcomes: [
          {
            instanceId: WHOSE_WOLVES_INSTANCE_ID,
            outcome: 'WOLVES_PACK_KILLED',
            atTick: '3000',
          },
          {
            instanceId: 'ci.m1.foul-well.01',
            outcome: 'FOUL_WELL_AGHAFYA_ACCUSED',
            atTick: '3000',
          },
        ],
      });
      expect(JSON.stringify(beforeDelayedFacts.contractOutcomes)).not.toContain('WOLVES_RAID');
      expect(JSON.stringify(beforeDelayedFacts.contractOutcomes)).not.toContain(
        'FOUL_WELL_HERBALIST_EXILED',
      );
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/company/return-report',
            headers: ownerHeaders,
          })
        ).json(),
      ).toEqual({ report: beforeDelayedFacts });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/company/return-report/ack',
            headers: ownerPostHeaders,
            payload: { schemaVersion: 1, reportId: beforeDelayedFacts.reportId },
          })
        ).json(),
      ).toEqual({ ok: true, duplicate: false });

      const maturedWolves = matureWhoseWolvesRaid(wolvesState, '10000');
      expect(maturedWolves?.outcome).toMatchObject({ raidAtTick: '10000' });
      await database
        .updateTable('world_hunt_states')
        .set({ revision: '2', quest_state: maturedWolves })
        .where('world_id', '=', worldId)
        .where('instance_id', '=', WHOSE_WOLVES_INSTANCE_ID)
        .executeTakeFirstOrThrow();
      await advanceReportState('10000');
      const delayedFacts = (
        await app.inject({ method: 'GET', url: '/company/return-report', headers: ownerHeaders })
      ).json().report;
      expect(delayedFacts).toMatchObject({
        fromTick: '9999',
        toTick: '10000',
        contractOutcomes: [
          {
            instanceId: WHOSE_WOLVES_INSTANCE_ID,
            outcome: 'WOLVES_RAID',
            atTick: '10000',
          },
          {
            instanceId: 'ci.m1.foul-well.01',
            outcome: 'FOUL_WELL_HERBALIST_EXILED',
            atTick: '10000',
          },
        ],
      });
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/company/return-report',
            headers: ownerHeaders,
          })
        ).json(),
      ).toEqual({ report: delayedFacts });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/company/return-report/ack',
            headers: ownerPostHeaders,
            payload: { schemaVersion: 1, reportId: delayedFacts.reportId },
          })
        ).json(),
      ).toEqual({ ok: true, duplicate: false });
      expect(
        (
          await app.inject({
            method: 'GET',
            url: '/company/return-report',
            headers: ownerHeaders,
          })
        ).json(),
      ).toEqual({ report: null });

      const stretcher = ordinaryContractProfile('ci.m1.stretcher-and-sword.01')!;
      const setStretcherState = async (
        stretcherState: ReturnType<typeof readOrdinaryContractState>,
      ) =>
        database
          .insertInto('ordinary_contracts')
          .values({
            world_id: worldId,
            instance_id: stretcher.instanceId,
            profile_id: stretcher.definitionId,
            revision: stretcherState.revision,
            wallet_id: stretcher.walletId,
            wallet_q: stretcher.genesisWalletQ,
            state: stretcherState,
          })
          .onConflict((conflict) =>
            conflict.columns(['world_id', 'instance_id']).doUpdateSet({
              revision: stretcherState.revision,
              state: stretcherState,
            }),
          )
          .execute();
      const setCampaignClock = async (tick: string) => {
        const epochMs = String(Date.now() - 100);
        const qaOffsetMs = String(BigInt(tick) * 21_600n);
        await database
          .insertInto('world_campaign_clocks')
          .values({
            world_id: worldId,
            epoch_ms: epochMs,
            starting_tick: '0',
            qa_offset_ms: qaOffsetMs,
          })
          .onConflict((conflict) =>
            conflict
              .column('world_id')
              .doUpdateSet({ epoch_ms: epochMs, qa_offset_ms: qaOffsetMs }),
          )
          .execute();
      };
      const setCompanyPlace = async (place: { siteId: string; areaId: string }) => {
        const snapshot = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
        state = readCompanyCombatAggregateState(snapshot.state);
        const location = { kind: 'AT' as const, ...place };
        state = {
          ...state,
          economy: {
            ...state.economy,
            lifecycle: {
              ...state.economy.lifecycle,
              parties: state.economy.lifecycle.parties.map((party) => ({ ...party, location })),
              characters: state.economy.lifecycle.characters.map((character) => ({
                ...character,
                presence: { ...character.presence, location },
              })),
            },
            finance: {
              ...state.economy.finance,
              wallets: state.economy.finance.wallets.map((wallet) => ({ ...wallet, location })),
            },
            ...(state.economy.physical === undefined
              ? {}
              : {
                  physical: {
                    ...state.economy.physical,
                    containers: state.economy.physical.containers.map((container) => ({
                      ...container,
                      location,
                    })),
                  },
                }),
          },
        };
        await database
          .updateTable('company_snapshots')
          .set({ state })
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow();
      };
      const ordinaryCommand = async (stepId: string, expectedRevision: string) => {
        const response = await app.inject({
          method: 'POST',
          url: '/contracts/ordinary/commands',
          headers: ownerPostHeaders,
          payload: {
            schemaVersion: 1,
            commandId: randomUUID(),
            instanceId: stretcher.instanceId,
            expectedRevision,
            type: 'STEP',
            stepId,
          },
        });
        expect(response.statusCode, response.body).toBe(200);
        return response.json();
      };

      const rescuedTick = '11000';
      const rescuedSourceEventId = 'stretcher-blue-kerchief-delivery';
      const rescuedStretcher = readOrdinaryContractState(stretcher, {
        ...ordinaryContractGenesis(stretcher),
        revision: '1',
        ownerCompanyId: companyId,
        acceptedTerms: ordinaryContractTerms(stretcher),
        facts: [
          {
            slotId: 'stretcher-luka-delivered',
            companyId,
            sourceEventId: rescuedSourceEventId,
            atTick: rescuedTick,
          },
        ],
        outcome: {
          kind: 'SUCCESS',
          companyId,
          sourceEventId: rescuedSourceEventId,
          atTick: rescuedTick,
        },
      });
      await setStretcherState(rescuedStretcher);
      await setCompanyPlace({ siteId: 'severny-dvor', areaId: 'severny-dvor-yard' });
      await setCampaignClock(rescuedTick);
      await advanceReportState(rescuedTick);
      const rescuedReport = (
        await app.inject({ method: 'GET', url: '/company/return-report', headers: ownerHeaders })
      ).json().report;
      expect(rescuedReport.contractOutcomes).toContainEqual({
        instanceId: stretcher.instanceId,
        outcome: 'LUKA_RESCUED',
        atTick: rescuedTick,
      });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/company/return-report/ack',
            headers: ownerPostHeaders,
            payload: { schemaVersion: 1, reportId: rescuedReport.reportId },
          })
        ).json(),
      ).toEqual({ ok: true, duplicate: false });

      const beforeRecruitTick = '13999';
      await setCampaignClock(beforeRecruitTick);
      await advanceReportState(beforeRecruitTick);
      const beforeRecruitReport = (
        await app.inject({ method: 'GET', url: '/company/return-report', headers: ownerHeaders })
      ).json().report;
      expect(beforeRecruitReport?.contractOutcomes ?? []).not.toContainEqual(
        expect.objectContaining({ outcome: 'LUKA_RECRUIT_OFFER' }),
      );
      if (beforeRecruitReport)
        expect(
          (
            await app.inject({
              method: 'POST',
              url: '/company/return-report/ack',
              headers: ownerPostHeaders,
              payload: { schemaVersion: 1, reportId: beforeRecruitReport.reportId },
            })
          ).json(),
        ).toEqual({ ok: true, duplicate: false });

      await setCampaignClock('14000');
      await ordinaryCommand('inspect-luka-at-camp', '1');
      const recruitedState = await database
        .selectFrom('ordinary_contracts')
        .select('state')
        .where('world_id', '=', worldId)
        .where('instance_id', '=', stretcher.instanceId)
        .executeTakeFirstOrThrow();
      expect(readOrdinaryContractState(stretcher, recruitedState.state).facts).toContainEqual(
        expect.objectContaining({
          slotId: 'stretcher-luka-recruit-offer',
          companyId,
          atTick: '14000',
        }),
      );
      await advanceReportState('14000');
      const recruitReport = (
        await app.inject({ method: 'GET', url: '/company/return-report', headers: ownerHeaders })
      ).json().report;
      expect(recruitReport.contractOutcomes).toContainEqual({
        instanceId: stretcher.instanceId,
        outcome: 'LUKA_RECRUIT_OFFER',
        atTick: '14000',
      });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/company/return-report/ack',
            headers: ownerPostHeaders,
            payload: { schemaVersion: 1, reportId: recruitReport.reportId },
          })
        ).json(),
      ).toEqual({ ok: true, duplicate: false });

      const onlyNastyaTick = '15000';
      const onlyNastyaSourceEventId = 'stretcher-only-nastya-delivered';
      const onlyNastya = readOrdinaryContractState(stretcher, {
        ...ordinaryContractGenesis(stretcher),
        revision: '1',
        ownerCompanyId: companyId,
        acceptedTerms: ordinaryContractTerms(stretcher),
        facts: [
          {
            slotId: 'stretcher-luka-dead',
            companyId,
            sourceEventId: onlyNastyaSourceEventId,
            atTick: onlyNastyaTick,
          },
        ],
        outcome: {
          kind: 'SUCCESS',
          companyId,
          sourceEventId: onlyNastyaSourceEventId,
          atTick: onlyNastyaTick,
        },
      });
      await setStretcherState(onlyNastya);
      await setCampaignClock(onlyNastyaTick);
      await advanceReportState(onlyNastyaTick);
      const onlyNastyaReport = (
        await app.inject({ method: 'GET', url: '/company/return-report', headers: ownerHeaders })
      ).json().report;
      expect(onlyNastyaReport.contractOutcomes).toContainEqual({
        instanceId: stretcher.instanceId,
        outcome: 'NASTYA_ONLY',
        atTick: onlyNastyaTick,
      });
      expect(onlyNastyaReport.contractOutcomes).not.toContainEqual(
        expect.objectContaining({ outcome: 'LUKA_DEATH_OBSERVED' }),
      );
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/company/return-report/ack',
            headers: ownerPostHeaders,
            payload: { schemaVersion: 1, reportId: onlyNastyaReport.reportId },
          })
        ).json(),
      ).toEqual({ ok: true, duplicate: false });

      const returnRoadTick = '15001';
      await setCompanyPlace({ siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' });
      await setCampaignClock(returnRoadTick);
      const inspected = await ordinaryCommand('inspect-return-road', '1');
      expect(inspected).toMatchObject({ ok: true, revision: '2' });
      const inspectedState = await database
        .selectFrom('ordinary_contracts')
        .select('state')
        .where('world_id', '=', worldId)
        .where('instance_id', '=', stretcher.instanceId)
        .executeTakeFirstOrThrow();
      expect(readOrdinaryContractState(stretcher, inspectedState.state).facts).toContainEqual(
        expect.objectContaining({
          slotId: 'stretcher-luka-death-observed',
          companyId,
          atTick: returnRoadTick,
        }),
      );
      await advanceReportState(returnRoadTick);
      const deathReport = (
        await app.inject({ method: 'GET', url: '/company/return-report', headers: ownerHeaders })
      ).json().report;
      expect(deathReport.contractOutcomes).toContainEqual({
        instanceId: stretcher.instanceId,
        outcome: 'LUKA_DEATH_OBSERVED',
        atTick: returnRoadTick,
      });
    },
  );
});

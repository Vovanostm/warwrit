import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  campaignTick,
  moneyQ,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];
const guardLocation = {
  kind: 'AT' as const,
  siteId: 'kamenny-brod',
  areaId: 'kamenny-brod-market',
};

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('local guard service (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'authenticates the offer, atomically enters, covers elapsed intervals, amends, exits and replays exactly',
    async () => {
      if (!database || !connectionString) throw new Error('company test database missing');
      const worldId = randomUUID();
      const companyA = randomUUID();
      const companyB = randomUUID();
      const accountA = randomUUID();
      const accountB = randomUUID();
      const sessionA = randomUUID();
      const sessionB = randomUUID();
      const issuer = `guard-service-test-${randomUUID()}`;
      const stateA = serviceCompanyState(worldId, companyA);
      const stateB = serviceCompanyState(worldId, companyB, true);
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

      await database
        .insertInto('identity_accounts')
        .values([
          { id: accountA, issuer, subject: 'guard-owner-a' },
          { id: accountB, issuer, subject: 'guard-owner-b' },
        ])
        .execute();
      await database
        .insertInto('identity_sessions')
        .values([
          {
            token_digest: createHash('sha256').update(sessionA).digest(),
            account_id: accountA,
            expires_at: new Date(Date.now() + 60_000),
          },
          {
            token_digest: createHash('sha256').update(sessionB).digest(),
            account_id: accountB,
            expires_at: new Date(Date.now() + 60_000),
          },
        ])
        .execute();
      await database
        .insertInto('world_campaign_clocks')
        .values({
          world_id: worldId,
          epoch_ms: String(Date.now()),
          starting_tick: '1000',
          qa_offset_ms: '0',
        })
        .execute();
      for (const [companyId, accountId, state] of [
        [companyA, accountA, stateA],
        [companyB, accountB, stateB],
      ] as const) {
        const lifecycle = state.economy.lifecycle;
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
            state,
          })
          .execute();
        await database
          .insertInto('company_account_owners')
          .values({ world_id: worldId, company_id: companyId, account_id: accountId })
          .execute();
      }

      try {
        const wrongCompany = await app.inject({
          method: 'GET',
          url: '/company/guard-service/kamenny-brod',
          headers: {
            cookie: `warwrit_session=${sessionB}`,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyA,
          },
        });
        expect(wrongCompany.statusCode).toBe(409);
        expect(wrongCompany.json()).toEqual({ error: 'company scope changed' });
        expect(wrongCompany.body).not.toContain(companyA);

        const offerResponse = await app.inject({
          method: 'GET',
          url: '/company/guard-service/kamenny-brod',
          headers: headers(sessionA, companyA),
        });
        expect(offerResponse.statusCode, offerResponse.body).toBe(200);
        const quote = offerResponse.json() as GuardServiceRead;
        expect(quote).toMatchObject({ local: true, providerName: 'Гордей Лапа' });
        expect(quote.offer?.beneficiaryIds).toContain('a-leader');
        expect(quote.offer?.beneficiaryIds).toContain('a-worker-0');

        const accept = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: quote.publicRevision,
          type: 'AcceptSafeService',
          payload: {
            offerId: quote.offer!.offerId,
            beneficiaryIds: quote.offer!.beneficiaryIds,
            quoteRevision: quote.offer!.quoteRevision,
          },
        };
        const entry = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders(sessionA, companyA),
          payload: accept,
        });
        expect(entry.statusCode, entry.body).toBe(200);
        expect(entry.json()).toMatchObject({ commandId: accept.commandId, ok: true });
        const afterEntry = await readCompanyState(worldId, companyA);
        expect(afterEntry.economy.finance.maintenance).toContainEqual(
          expect.objectContaining({
            kind: 'SAFE_SERVICE',
            startedAt: '1000',
            endedAt: null,
            beneficiaryIds: quote.offer!.beneficiaryIds,
          }),
        );
        expect(walletCash(afterEntry, 'purse')).toBe(walletCash(stateA, 'purse'));

        const previousAmendmentQuoteResponse = await app.inject({
          method: 'GET',
          url: '/company/guard-service/kamenny-brod',
          headers: headers(sessionA, companyA),
        });
        expect(previousAmendmentQuoteResponse.statusCode, previousAmendmentQuoteResponse.body).toBe(
          200,
        );
        const previousAmendmentQuote = previousAmendmentQuoteResponse.json() as GuardServiceRead;
        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '10800000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const exactRetry = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders(sessionA, companyA),
          payload: accept,
        });
        expect(exactRetry.statusCode).toBe(entry.statusCode);
        expect(exactRetry.json()).toEqual(entry.json());
        expect(
          await database
            .selectFrom('company_receipts')
            .select('receipt_id')
            .where('world_id', '=', worldId)
            .where('company_id', '=', companyA)
            .where('command_id', '=', accept.commandId)
            .execute(),
        ).toHaveLength(1);
        const staleAmendment = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders(sessionA, companyA),
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: previousAmendmentQuote.publicRevision,
            type: 'AmendSafeService',
            payload: {
              agreementId: previousAmendmentQuote.agreement!.agreementId,
              beneficiaryIds: previousAmendmentQuote.offer!.beneficiaryIds,
              quoteRevision: previousAmendmentQuote.offer!.quoteRevision,
            },
          },
        });
        expect(staleAmendment.statusCode).toBe(409);
        expect(staleAmendment.json()).toMatchObject({ ok: false, code: 'STALE_REVISION' });

        const amendmentQuoteResponse = await app.inject({
          method: 'GET',
          url: '/company/guard-service/kamenny-brod',
          headers: headers(sessionA, companyA),
        });
        expect(amendmentQuoteResponse.statusCode, amendmentQuoteResponse.body).toBe(200);
        const amendmentQuote = amendmentQuoteResponse.json() as GuardServiceRead;
        expect(amendmentQuote.agreement?.agreementId).toBeTruthy();
        const amendment = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: amendmentQuote.publicRevision,
          type: 'AmendSafeService',
          payload: {
            agreementId: amendmentQuote.agreement!.agreementId,
            beneficiaryIds: amendmentQuote.offer!.beneficiaryIds,
            quoteRevision: amendmentQuote.offer!.quoteRevision,
          },
        };
        const amended = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders(sessionA, companyA),
          payload: amendment,
        });
        expect(amended.statusCode, amended.body).toBe(200);
        expect(amended.json()).toMatchObject({ commandId: amendment.commandId, ok: true });

        const afterAmendment = await readCompanyState(worldId, companyA);
        const covered = afterAmendment.economy.finance.maintenanceReceipts.filter(
          (receipt) => receipt.fulfillment === 'CURRENT_FOOD_LODGING_WAGE',
        );
        expect(covered.length).toBeGreaterThan(0);
        expect(
          covered.every((receipt) => receipt.fromTick === '1000' && receipt.toTick === '1500'),
        ).toBe(true);
        expect(
          afterAmendment.economy.finance.claims
            .filter((claim) => claim.maintenanceId !== null)
            .some((claim) => BigInt(claim.reportedCoveredQ) > 0n),
        ).toBe(true);
        expect(walletCash(afterAmendment, 'purse')).toBe(walletCash(stateA, 'purse'));
        const activeAfterAmendment = afterAmendment.economy.finance.maintenance.find(
          (mode) => mode.kind === 'SAFE_SERVICE' && mode.endedAt === null,
        )!;
        expect(
          afterAmendment.economy.finance.maintenance.find(
            (mode) => mode.agreementId === amendmentQuote.agreement!.agreementId,
          ),
        ).toMatchObject({ endedAt: '1500', knownEndedAt: '1500' });
        expect(activeAfterAmendment.startedAt).toBe('1500');

        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '21600000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const exitQuoteResponse = await app.inject({
          method: 'GET',
          url: '/company/guard-service/kamenny-brod',
          headers: headers(sessionA, companyA),
        });
        expect(exitQuoteResponse.statusCode, exitQuoteResponse.body).toBe(200);
        const exitQuote = exitQuoteResponse.json() as GuardServiceRead;
        const exit = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: exitQuote.publicRevision,
          type: 'EndSafeService',
          payload: { agreementId: exitQuote.agreement!.agreementId },
        };
        const ended = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders(sessionA, companyA),
          payload: exit,
        });
        expect(ended.statusCode, ended.body).toBe(200);
        expect(ended.json()).toMatchObject({ commandId: exit.commandId, ok: true });
        const afterExit = await readCompanyState(worldId, companyA);
        expect(
          afterExit.economy.finance.maintenance.find(
            (mode) => mode.agreementId === exit.payload.agreementId,
          ),
        ).toMatchObject({ endedAt: '2000', knownEndedAt: '2000' });
        expect(
          afterExit.economy.finance.maintenanceReceipts.some(
            (receipt) => receipt.fromTick === '1500' && receipt.toTick === '2000',
          ),
        ).toBe(true);
        expect(
          new Set(
            afterExit.economy.finance.maintenanceReceipts.map(
              (receipt) => `${receipt.fromTick}-${receipt.toTick}`,
            ),
          ),
        ).toEqual(new Set(['1000-1500', '1500-2000']));
        expect(walletCash(afterExit, 'purse')).toBe(walletCash(stateA, 'purse'));

        const refreshedDebtCompany = await app.inject({
          method: 'GET',
          url: '/company',
          headers: {
            cookie: `warwrit_session=${sessionB}`,
            origin: 'http://127.0.0.1:3107',
          },
        });
        expect(refreshedDebtCompany.statusCode, refreshedDebtCompany.body).toBe(200);
        const debtOfferResponse = await app.inject({
          method: 'GET',
          url: '/company/guard-service/kamenny-brod',
          headers: headers(sessionB, companyB),
        });
        expect(debtOfferResponse.statusCode, debtOfferResponse.body).toBe(200);
        const debtOffer = debtOfferResponse.json() as GuardServiceRead;
        const debtStateBeforeCommand = await readCompanyState(worldId, companyB);
        const rejectDebtEntry = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: debtOffer.publicRevision,
          type: 'AcceptSafeService',
          payload: {
            offerId: debtOffer.offer!.offerId,
            beneficiaryIds: debtOffer.offer!.beneficiaryIds,
            quoteRevision: debtOffer.offer!.quoteRevision,
          },
        };
        const refused = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: commandHeaders(sessionB, companyB),
          payload: rejectDebtEntry,
        });
        expect(refused.statusCode).toBe(409);
        expect(refused.json()).toMatchObject({ ok: false, code: 'INSUFFICIENT_FUNDS' });
        const afterRefusal = await readCompanyState(worldId, companyB);
        expect(afterRefusal.economy.finance.maintenance).toEqual([]);
        expect(afterRefusal.economy.finance.maintenanceReceipts).toEqual([]);
        expect(afterRefusal.economy.finance.reservations).toEqual(
          debtStateBeforeCommand.economy.finance.reservations,
        );
        expect(walletCash(afterRefusal, 'purse')).toBe(walletCash(debtStateBeforeCommand, 'purse'));
        expect(afterRefusal.economy.finance.claims).toEqual(
          debtStateBeforeCommand.economy.finance.claims,
        );
        expect(afterRefusal.economy.lifecycle.knowledge.revision).toBe(
          debtStateBeforeCommand.economy.lifecycle.knowledge.revision,
        );
      } finally {
        await app.close();
      }
    },
  );
});

interface GuardServiceRead {
  readonly publicRevision: string;
  readonly local: boolean;
  readonly providerName: string;
  readonly offer?: {
    readonly offerId: string;
    readonly quoteRevision: string;
    readonly beneficiaryIds: readonly string[];
  };
  readonly agreement?: { readonly agreementId: string; readonly beneficiaryIds: readonly string[] };
}

function serviceCompanyState(
  worldId: string,
  companyId: string,
  overdueWage = false,
): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture().state;
  const initial = JSON.parse(
    JSON.stringify(fixture)
      .replaceAll('"world"', JSON.stringify(worldId))
      .replaceAll('"a-company"', JSON.stringify(companyId)),
  ) as CompanyCombatAggregateState;
  const state = readCompanyCombatAggregateState({
    ...initial,
    economy: {
      ...initial.economy,
      lifecycle: {
        ...initial.economy.lifecycle,
        parties: initial.economy.lifecycle.parties.map((party) => ({
          ...party,
          location: guardLocation,
        })),
        characters: initial.economy.lifecycle.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location: guardLocation },
        })),
      },
      physical: {
        ...initial.economy.physical!,
        containers: initial.economy.physical!.containers.map((container) => ({
          ...container,
          location: guardLocation,
        })),
      },
      finance: {
        ...initial.economy.finance,
        wallets: initial.economy.finance.wallets.map((wallet) => ({
          ...wallet,
          location: guardLocation,
          ...(wallet.walletId === 'purse' ? { cashQ: moneyQ('20000000') } : {}),
        })),
        claims: overdueWage
          ? [
              {
                claimId: 'overdue-service-wage',
                membershipId: 'service-worker-0',
                poolId: 'local',
                rateVersion: 'rate-worker-0',
                dueAt: campaignTick('1000'),
                fromTick: campaignTick('0'),
                toTick: campaignTick('1000'),
                dailyWageMilli: '1',
                maintenanceId: null,
                earned: [
                  {
                    fromTick: campaignTick('0'),
                    toTick: campaignTick('1000'),
                    dailyWageMilli: '1',
                    maintenanceId: null,
                  },
                ],
                paidQ: moneyQ('0'),
                reportedQ: moneyQ('1000'),
                reportedCoveredQ: moneyQ('0'),
              },
            ]
          : initial.economy.finance.claims,
      },
    },
  });
  return state;
}

function headers(session: string, companyId: string) {
  return {
    cookie: `warwrit_session=${session}`,
    origin: 'http://127.0.0.1:3107',
    [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
  };
}

function commandHeaders(session: string, companyId: string) {
  return headers(session, companyId);
}

async function readCompanyState(worldId: string, companyId: string) {
  if (!database) throw new Error('company test database missing');
  const row = await database
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  return readCompanyCombatAggregateState(row.state);
}

function walletCash(state: CompanyCombatAggregateState, walletId: string): string {
  return state.economy.finance.wallets.find((wallet) => wallet.walletId === walletId)!.cashQ;
}

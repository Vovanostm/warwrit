import { createHash, randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { canonicalJson, readCompanyCombatAggregateState } from '@warwrit/game-core';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyOpeningOptionsResponseDto,
  type CompanyReadResponseDto,
  type SupplyShopDto,
  type OrdinaryPlayerCompanyCommandV2Dto,
} from '@warwrit/protocol';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';
import { executeOrdinaryPlayerCompanyCommand } from './executor.js';

const connection = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const db = connection ? createDatabase(connection) : undefined;
afterAll(async () => {
  await db?.destroy();
});

it.skipIf(!db)(
  'provisions ten days, conserves supplies and money, rejects invalid access, replays and rolls back the whole exchange',
  async () => {
    if (!db || !connection) throw new Error('PostgreSQL required');
    const accountId = randomUUID(),
      token = randomUUID(),
      worldId = randomUUID();
    const identity = loadServerConfig({
      DATABASE_URL: connection,
      OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
      OIDC_CLIENT_ID: 'warwrit-local',
      OIDC_CLIENT_SECRET: 'local-only-secret',
      OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
      PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
      HOST: '127.0.0.1',
      PORT: '3107',
    }).identity!;
    const app = buildApp({
      identity: { config: identity, database: db },
      company: { database: db, worldId },
    });
    const headers = { cookie: `warwrit_session=${token}`, origin: 'http://127.0.0.1:3107' };
    try {
      await db
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer: `supplies-${accountId}`, subject: 'owner' })
        .execute();
      await db
        .insertInto('identity_sessions')
        .values({
          token_digest: createHash('sha256').update(token).digest(),
          account_id: accountId,
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute();
      const options = await app.inject({
        method: 'POST',
        url: '/company/opening-options',
        headers,
        payload: {},
      });
      expect(options.statusCode).toBe(200);
      const opening = (options.json() as CompanyOpeningOptionsResponseDto).opening;
      expect(opening.startingAssets?.rations).toBe(30);
      const create = await app.inject({
        method: 'POST',
        url: '/company/commands',
        headers,
        payload: {
          schemaVersion: 1,
          commandId: randomUUID(),
          type: 'CreateCompany',
          payload: {
            originId: opening.origin.id,
            cultureId: opening.culture.id,
            homelandId: opening.homeland.id,
            familyStoryId: opening.familyStory.id,
            leaderInput: { ...opening.leaderDefaults, birthName: 'Supply tester' },
            candidateSetId: opening.candidateSetId,
            selectedCandidateIds: opening.candidates
              .slice(0, 2)
              .map((candidate) => candidate.characterId),
            name: 'Provisioned company',
            bannerId: opening.bannerId,
          },
        },
      });
      expect(create.statusCode, create.body).toBe(201);
      const read = async () =>
        (
          await app.inject({ method: 'GET', url: '/company', headers })
        ).json() as CompanyReadResponseDto;
      const initial = await read();
      expect(initial.holdings?.cashQ).toBe('800000000');
      expect(initial.holdings?.supplies).toEqual({ people: 3, rations: 30, days: 10 });
      // Simulate a retained pre-0014 company: POST must work before any shop GET.
      await db.deleteFrom('settlement_supplies').where('world_id', '=', worldId).execute();
      const shop: SupplyShopDto = {
        siteId: 'severny-dvor',
        revision: '0',
        rations: 300,
        rationPriceQ: '4000000',
      };
      const commandHeaders = { ...headers, [WORLD_EXPECTED_COMPANY_ID_HEADER]: opening.companyId };
      const request: OrdinaryPlayerCompanyCommandV2Dto = {
        schemaVersion: 2,
        commandId: randomUUID(),
        expectedPublicRevision: initial.company!.revision,
        type: 'BuySupplies',
        payload: { siteId: 'severny-dvor', quantity: 10, shopRevision: shop.revision },
      };
      const send = (payload: OrdinaryPlayerCompanyCommandV2Dto) =>
        app.inject({ method: 'POST', url: '/company/commands', headers: commandHeaders, payload });
      const remote = await send({
        ...request,
        commandId: randomUUID(),
        payload: { ...request.payload, siteId: 'kamenny-brod' },
      });
      expect(remote.json()).toMatchObject({ ok: false, code: 'CONTACT_OR_ACCESS_REQUIRED' });
      expect((await read()).holdings).toEqual(initial.holdings);
      expect(
        await db
          .selectFrom('settlement_supplies')
          .selectAll()
          .where('world_id', '=', worldId)
          .execute(),
      ).toEqual([]);
      const result = await send(request);
      expect(result.statusCode, result.body).toBe(200);
      expect(result.json()).toMatchObject({ ok: true });
      const after = await read();
      expect(after.holdings?.cashQ).toBe('760000000');
      expect(after.holdings?.supplies?.rations).toBe(40);
      const merchant = await db
        .selectFrom('settlement_supplies')
        .selectAll()
        .where('world_id', '=', worldId)
        .where('site_id', '=', 'severny-dvor')
        .executeTakeFirstOrThrow();
      expect(merchant.rations + after.holdings!.supplies!.rations).toBe(330);
      expect(BigInt(merchant.cash_q) + BigInt(after.holdings!.cashQ)).toBe(800000000n);
      const replay = await send(request);
      expect(replay.json()).toEqual(result.json());
      expect((await read()).holdings).toEqual(after.holdings);
      const changed = await send({ ...request, payload: { ...request.payload, quantity: 11 } });
      expect(changed.json()).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      const more = {
        ...request,
        commandId: randomUUID(),
        expectedPublicRevision: after.company!.revision,
        payload: { ...request.payload, shopRevision: String(merchant.revision), quantity: 100 },
      };
      expect((await send(more)).json()).toMatchObject({ code: 'CAPACITY' });
      const rollback = {
        ...more,
        commandId: randomUUID(),
        payload: { ...more.payload, quantity: 1 },
      };
      await expect(
        db.transaction().execute(async (transaction) => {
          const outcome = await executeOrdinaryPlayerCompanyCommand({
            transaction,
            accountId,
            expectedCompanyId: opening.companyId,
            worldId,
            request: rollback,
            requestKey: canonicalJson(rollback),
            now: new Date(),
          });
          expect(outcome.kind).toBe('COMMITTED');
          throw new Error('rollback-sentinel');
        }),
      ).rejects.toThrow('rollback-sentinel');
      expect((await read()).holdings).toEqual(after.holdings);
      expect(
        await db
          .selectFrom('settlement_supplies')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('site_id', '=', 'severny-dvor')
          .executeTakeFirstOrThrow(),
      ).toEqual(merchant);
      expect(
        await db
          .selectFrom('company_receipts')
          .select('command_id')
          .where('world_id', '=', worldId)
          .where('command_id', '=', rollback.commandId)
          .executeTakeFirst(),
      ).toBeUndefined();
      const races = await Promise.all([
        send(rollback),
        send({ ...rollback, commandId: randomUUID() }),
      ]);
      expect(races.map((response) => response.json().ok).sort()).toEqual([false, true]);
      const row = await db
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      expect(
        readCompanyCombatAggregateState(row.state)
          .economy.physical?.items.filter(
            (item) => item.definitionId === 'ration' && !item.tombstone,
          )
          .reduce((sum, item) => sum + item.quantity, 0),
      ).toBe(41);
      // Real route departure/arrival, with an explicit trusted clock advance for the test world.
      const atOrigin = await read();
      const depart = await app.inject({
        method: 'POST',
        url: '/world/travel',
        headers: commandHeaders,
        payload: {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: atOrigin.company!.revision,
          expectedRouteEpoch: '0',
          action: { kind: 'DEPART', edgeIds: ['kamenny-brod-severny-dvor'] },
        },
      });
      expect(depart.statusCode, depart.body).toBe(200);
      const departed = depart.json() as { publicRevision: string; route: { routeEpoch: string } };
      await db
        .updateTable('world_campaign_clocks')
        .set({ epoch_ms: String(Date.now() - 10 * 21600 - 5000) })
        .where('world_id', '=', worldId)
        .execute();
      const arrive = await app.inject({
        method: 'POST',
        url: '/world/travel',
        headers: commandHeaders,
        payload: {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: departed.publicRevision,
          expectedRouteEpoch: departed.route.routeEpoch,
          action: { kind: 'ARRIVE' },
        },
      });
      expect(arrive.statusCode, arrive.body).toBe(200);
      const destination = await read();
      expect(destination.holdings!.supplies!.days).toBeGreaterThan(
        destination.holdings!.supplies!.rations / destination.holdings!.supplies!.people,
      );
      const destinationShop = (
        await app.inject({ method: 'GET', url: '/company/supplies/kamenny-brod', headers })
      ).json() as SupplyShopDto;
      const destinationPurchase = await send({
        ...request,
        commandId: randomUUID(),
        expectedPublicRevision: destination.company!.revision,
        payload: { siteId: 'kamenny-brod', quantity: 1, shopRevision: destinationShop.revision },
      });
      expect(destinationPurchase.statusCode, destinationPurchase.body).toBe(200);
      expect((await read()).holdings?.cashQ).toBe(
        (BigInt(destination.holdings!.cashQ) - 4000000n).toString(),
      );
      expect((await read()).holdings?.supplies?.rations).toBe(
        destination.holdings!.supplies!.rations + 1,
      );
      // Remote company savings are visible in holdings but cannot fund this shop.
      const saved = await db
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const aggregate = readCompanyCombatAggregateState(saved.state);
      const purse = aggregate.economy.finance.wallets.find(
        (wallet) => wallet.owner.kind === 'COMPANY',
      )!;
      const withRemoteSavings = readCompanyCombatAggregateState({
        ...aggregate,
        economy: {
          ...aggregate.economy,
          finance: {
            ...aggregate.economy.finance,
            wallets: [
              ...aggregate.economy.finance.wallets.map((wallet) =>
                wallet.walletId === purse.walletId ? { ...wallet, cashQ: '0' } : wallet,
              ),
              {
                ...purse,
                walletId: 'remote-savings',
                cashQ: '100000000',
                location: { kind: 'AT', siteId: 'severny-dvor', areaId: 'main' },
              },
            ],
          },
        },
      });
      await db
        .updateTable('company_snapshots')
        .set({ state: withRemoteSavings })
        .where('world_id', '=', worldId)
        .execute();
      const remoteFunds = await read();
      expect(remoteFunds.holdings!.cashQ).toBe('100000000');
      const localQuote = (
        await app.inject({ method: 'GET', url: '/company/supplies/kamenny-brod', headers })
      ).json() as SupplyShopDto;
      expect(localQuote.availableCashQ).toBe('0');
      const unfunded = await send({
        ...request,
        commandId: randomUUID(),
        expectedPublicRevision: remoteFunds.company!.revision,
        payload: { siteId: 'kamenny-brod', quantity: 1, shopRevision: localQuote.revision },
      });
      expect(unfunded.json()).toMatchObject({ ok: false, code: 'INSUFFICIENT_FUNDS' });
      expect((await read()).holdings).toEqual(remoteFunds.holdings);
    } finally {
      await app.close();
      await db.deleteFrom('world_route_receipts').where('world_id', '=', worldId).execute();
      await db.deleteFrom('world_party_routes').where('world_id', '=', worldId).execute();
      await db.deleteFrom('settlement_supplies').where('world_id', '=', worldId).execute();
      await db.deleteFrom('company_account_owners').where('world_id', '=', worldId).execute();
      await db.deleteFrom('company_audit_events').where('world_id', '=', worldId).execute();
      await db.deleteFrom('company_receipts').where('world_id', '=', worldId).execute();
      await db.deleteFrom('company_opening_options').where('world_id', '=', worldId).execute();
      await db.deleteFrom('company_snapshots').where('world_id', '=', worldId).execute();
      await db.deleteFrom('world_campaign_clocks').where('world_id', '=', worldId).execute();
      await db.deleteFrom('identity_sessions').where('account_id', '=', accountId).execute();
      await db.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
    }
  },
);

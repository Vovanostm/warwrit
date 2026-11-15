import { createHash, randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { readCompanyCombatAggregateState } from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyOpeningOptionsResponseDto,
  type CompanyReadResponseDto,
  type EquipmentMarketDto,
  type EquipmentSaleRequestDto,
} from '@warwrit/protocol';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';
import { sql } from 'kysely';
import { registerEquipmentMarketRoutes } from './equipment-market.js';

const connection = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const db = connection ? createDatabase(connection) : undefined;
afterAll(async () => {
  await db?.destroy();
});

it.skipIf(!db)(
  'quotes actual trader funds, rejects short funds atomically, transfers one item and exactly replays after movement',
  async () => {
    if (!db || !connection) throw new Error('PostgreSQL required');
    const accountId = randomUUID();
    const token = randomUUID();
    const worldId = randomUUID();
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
    registerEquipmentMarketRoutes(app, { database: db, worldId });
    const headers = { cookie: `warwrit_session=${token}`, origin: 'http://127.0.0.1:3107' };
    try {
      await db
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer: `equipment-market-${accountId}`, subject: 'owner' })
        .execute();
      await db
        .insertInto('identity_sessions')
        .values({
          token_digest: createHash('sha256').update(token).digest(),
          account_id: accountId,
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute();
      const optionsResponse = await app.inject({
        method: 'POST',
        url: '/company/opening-options',
        headers,
        payload: {},
      });
      expect(optionsResponse.statusCode).toBe(200);
      const opening = (optionsResponse.json() as CompanyOpeningOptionsResponseDto).opening;
      const created = await app.inject({
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
            leaderInput: { ...opening.leaderDefaults, birthName: 'Market tester' },
            candidateSetId: opening.candidateSetId,
            selectedCandidateIds: opening.candidates.slice(0, 2).map((entry) => entry.characterId),
            name: 'Equipment market test',
            bannerId: opening.bannerId,
          },
        },
      });
      expect(created.statusCode, created.body).toBe(201);
      const companyId = opening.companyId;
      const readCompany = async () =>
        (
          await app.inject({ method: 'GET', url: '/company', headers })
        ).json() as CompanyReadResponseDto;
      const companyBefore = await readCompany();
      expect(companyBefore.company).not.toBeNull();

      const row = await db
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const aggregate = readCompanyCombatAggregateState(row.state);
      const companyWallet = aggregate.economy.finance.wallets.find(
        (wallet) => wallet.owner.kind === 'COMPANY' && wallet.owner.id === companyId,
      );
      expect(companyWallet).toBeDefined();
      const companyCashBefore = BigInt(companyWallet!.cashQ);
      const saleItem = aggregate.economy.physical!.items.find(
        (item) =>
          item.tombstone === null &&
          item.owner.kind === 'COMPANY' &&
          [
            'sword',
            'raider-weapon',
            'bow',
            'spear',
            'great-weapon',
            'shield',
            'simple-helmet',
            'padded-coat',
          ].includes(item.definitionId),
      );
      expect(saleItem).toBeDefined();
      const itemContainerId = saleItem!.containerId;
      const carrier = aggregate.economy.physical!.containers.find(
        (container) => container.containerId === itemContainerId,
      )!.carrier;
      const marketLocation = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'bazaar' };
      const local = {
        ...aggregate,
        economy: {
          ...aggregate.economy,
          lifecycle: {
            ...aggregate.economy.lifecycle,
            parties: aggregate.economy.lifecycle.parties.map((party) => ({
              ...party,
              location: marketLocation,
            })),
            characters: aggregate.economy.lifecycle.characters.map((person) =>
              person.presence.fieldPartyId === aggregate.economy.lifecycle.parties[0]?.partyId
                ? { ...person, presence: { ...person.presence, location: marketLocation } }
                : person,
            ),
          },
          finance: {
            ...aggregate.economy.finance,
            wallets: aggregate.economy.finance.wallets.map((wallet) =>
              wallet.owner.kind === 'COMPANY' && wallet.owner.id === companyId
                ? { ...wallet, location: marketLocation }
                : wallet,
            ),
          },
          physical: {
            ...aggregate.economy.physical!,
            containers: aggregate.economy.physical!.containers.map((container) =>
              container.containerId === itemContainerId
                ? {
                    ...container,
                    location: marketLocation,
                    custodian: { kind: 'COMPANY' as const, id: companyId },
                    access: 'COMPANY' as const,
                    carrier: carrier,
                  }
                : container,
            ),
          },
        },
      } satisfies CompanyCombatAggregateState;
      await db
        .updateTable('company_snapshots')
        .set({ state: local })
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .execute();
      const started = Date.now();
      await db
        .insertInto('world_campaign_clocks')
        .values({
          world_id: worldId,
          epoch_ms: String(started),
          starting_tick: local.economy.lifecycle.campaignTick,
        })
        .onConflict((conflict) =>
          conflict.column('world_id').doUpdateSet({
            epoch_ms: String(started),
            starting_tick: local.economy.lifecycle.campaignTick,
            qa_offset_ms: '0',
          }),
        )
        .execute();
      await db
        .insertInto('settlement_supplies')
        .values({
          world_id: worldId,
          site_id: 'kamenny-brod',
          revision: '0',
          rations: 300,
          cash_q: '1000000',
        })
        .execute();

      const commandHeaders = { ...headers, [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId };
      const market = await app.inject({
        method: 'GET',
        url: '/company/equipment-market/kamenny-brod',
        headers,
      });
      expect(market.statusCode, market.body).toBe(200);
      const quote = (market.json() as EquipmentMarketDto).items.find(
        (entry) => entry.itemId === saleItem!.itemId,
      );
      expect(quote).toMatchObject({ canSell: false, refusal: 'INSUFFICIENT_FUNDS' });
      const initialSnapshot = await db
        .selectFrom('company_snapshots')
        .selectAll()
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const lowFundsRow = await db
        .selectFrom('settlement_supplies')
        .selectAll()
        .where('world_id', '=', worldId)
        .where('site_id', '=', 'kamenny-brod')
        .executeTakeFirstOrThrow();
      const lowFundsRequest: EquipmentSaleRequestDto = {
        schemaVersion: 1,
        commandId: randomUUID(),
        expectedRevision: companyBefore.company!.revision,
        itemId: saleItem!.itemId,
        shopRevision: '0',
      };
      const send = (payload: EquipmentSaleRequestDto) =>
        app.inject({
          method: 'POST',
          url: '/company/equipment-market/kamenny-brod/sell',
          headers: commandHeaders,
          payload,
        });
      const insufficient = await send(lowFundsRequest);
      expect(insufficient.json()).toMatchObject({ ok: false, code: 'INSUFFICIENT_FUNDS' });
      expect(
        await db
          .selectFrom('company_snapshots')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .executeTakeFirstOrThrow(),
      ).toEqual(initialSnapshot);
      expect(
        await db
          .selectFrom('settlement_supplies')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('site_id', '=', 'kamenny-brod')
          .executeTakeFirstOrThrow(),
      ).toEqual(lowFundsRow);

      await db
        .updateTable('settlement_supplies')
        .set({ revision: '1', cash_q: '20000000' })
        .where('world_id', '=', worldId)
        .where('site_id', '=', 'kamenny-brod')
        .execute();
      const fresh = await readCompany();
      const request: EquipmentSaleRequestDto = {
        ...lowFundsRequest,
        commandId: randomUUID(),
        expectedRevision: fresh.company!.revision,
        shopRevision: '1',
      };
      const sold = await send(request);
      expect(sold.statusCode, sold.body).toBe(200);
      expect(sold.json()).toMatchObject({ ok: true, commandId: request.commandId });
      const afterSale = await db
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const saved = readCompanyCombatAggregateState(afterSale.state);
      expect(saved.economy.physical!.items.some((item) => item.itemId === saleItem!.itemId)).toBe(
        false,
      );
      const merchant = await db
        .selectFrom('settlement_supplies')
        .selectAll()
        .where('world_id', '=', worldId)
        .where('site_id', '=', 'kamenny-brod')
        .executeTakeFirstOrThrow();
      expect(BigInt(merchant.cash_q)).toBe(20_000_000n - BigInt(quote!.priceQ));
      const retained = await sql<{ readonly item: unknown }>`
        select item from settlement_equipment where world_id = ${worldId} and item_id = ${saleItem!.itemId}
      `.execute(db);
      expect(retained.rows).toHaveLength(1);
      expect(retained.rows[0]!.item).toMatchObject({
        itemId: saleItem!.itemId,
        owner: { kind: 'WORLD', id: worldId },
        provenance: saleItem!.provenance,
      });
      const companyCashAfter = BigInt(
        saved.economy.finance.wallets.find((wallet) => wallet.owner.kind === 'COMPANY')!.cashQ,
      );
      expect(companyCashAfter).toBe(companyCashBefore + BigInt(quote!.priceQ));
      expect(BigInt(merchant.cash_q) + companyCashAfter).toBe(20_000_000n + companyCashBefore);
      expect((await send(request)).json()).toEqual(sold.json());
      expect((await send({ ...request, shopRevision: '2' })).json()).toMatchObject({
        code: 'IDEMPOTENCY_CONFLICT',
      });

      await db
        .updateTable('company_snapshots')
        .set({
          state: {
            ...saved,
            economy: {
              ...saved.economy,
              lifecycle: {
                ...saved.economy.lifecycle,
                parties: saved.economy.lifecycle.parties.map((party) => ({
                  ...party,
                  location: { ...marketLocation, siteId: 'village' },
                })),
              },
            },
          },
        })
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .execute();
      expect((await send(request)).json()).toEqual(sold.json());
      const duplicateSource = await send({ ...request, commandId: randomUUID() });
      expect(duplicateSource.json()).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    } finally {
      await app.close();
    }
  },
);

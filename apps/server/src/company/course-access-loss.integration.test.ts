import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  initialSkillProgress,
  moneyQ,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyReadResponseDto,
  type EquipmentMarketDto,
  type EquipmentSaleRequestDto,
} from '@warwrit/protocol';
import { afterAll, expect, it } from 'vitest';
import { sql } from 'kysely';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const connection = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const db = connection ? createDatabase(connection) : undefined;
const apps: ReturnType<typeof buildApp>[] = [];
const location = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await db?.destroy();
});

it.skipIf(!db)(
  'settles course progress and stops learning when the required weapon is sold, replaying the sale once',
  async () => {
    if (!db || !connection) throw new Error('PostgreSQL required');
    const accountId = randomUUID();
    const session = randomUUID();
    const worldId = randomUUID();
    const companyId = randomUUID();
    const optionId = randomUUID();
    const weaponId = randomUUID();
    const issuer = `course-access-loss-${accountId}`;
    const purseId = `${optionId}:company-purse`;
    const state = courseAccessCompany(worldId, companyId, purseId, weaponId);
    const config = loadServerConfig({
      DATABASE_URL: connection,
      OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
      OIDC_CLIENT_ID: 'warwrit-local',
      OIDC_CLIENT_SECRET: 'local-only-secret',
      OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
      PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
      HOST: '127.0.0.1',
      PORT: '3107',
    });
    const app = buildApp({
      identity: { config: config.identity!, database: db },
      company: { database: db, worldId },
    });
    apps.push(app);
    const headers = {
      cookie: `warwrit_session=${session}`,
      origin: 'http://127.0.0.1:3107',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
    };
    const readCompany = async () =>
      (
        await app.inject({ method: 'GET', url: '/company', headers })
      ).json() as CompanyReadResponseDto;

    try {
      await db
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'owner' })
        .execute();
      await db
        .insertInto('identity_sessions')
        .values({
          token_digest: createHash('sha256').update(session).digest(),
          account_id: accountId,
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute();
      await db
        .insertInto('world_campaign_clocks')
        .values({ world_id: worldId, epoch_ms: String(Date.now()), starting_tick: '1000' })
        .execute();
      await db
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
      await db
        .insertInto('company_account_owners')
        .values({ world_id: worldId, company_id: companyId, account_id: accountId })
        .execute();
      await db
        .insertInto('company_opening_options')
        .values({
          id: optionId,
          world_id: worldId,
          account_id: accountId,
          company_id: companyId,
          evidence: {
            id: optionId,
            worldId,
            companyId,
            partyId: state.economy.lifecycle.parties[0]!.partyId,
          },
          expires_at: new Date(Date.now() + 60_000),
          consumed_at: new Date(),
          consumed_command_id: 'seeded-course-access-loss',
          consumed_request_key: 'seeded-course-access-loss',
        })
        .execute();
      await db
        .insertInto('settlement_supplies')
        .values({
          world_id: worldId,
          site_id: 'kamenny-brod',
          revision: '0',
          rations: 300,
          cash_q: '20000000',
        })
        .execute();

      const openingCompany = await readCompany();
      expect(openingCompany.company).not.toBeNull();
      const courseResponse = await app.inject({
        method: 'GET',
        url: '/company/courses/kamenny-brod',
        headers,
      });
      expect(courseResponse.statusCode, courseResponse.body).toBe(200);
      const course = courseResponse.json().course as {
        readonly status: string;
        readonly learners: readonly {
          readonly characterId: string;
          readonly resourceIds: readonly string[];
        }[];
      };
      const learner = course.learners.find((entry) => entry.characterId === 'a-leader');
      expect(learner?.resourceIds).toContain(weaponId);
      const started = await app.inject({
        method: 'POST',
        url: '/company/commands',
        headers,
        payload: {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: openingCompany.company!.revision,
          type: 'StartLearning',
          payload: {
            courseId: 'course.kamenny-brod-guard.blades',
            characterId: learner!.characterId,
            resourceIds: [weaponId],
          },
        },
      });
      expect(started.statusCode, started.body).toBe(200);

      await db
        .updateTable('world_campaign_clocks')
        .set({ qa_offset_ms: '21600000' })
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const advanced = await app.inject({
        method: 'GET',
        url: '/company/courses/kamenny-brod',
        headers,
      });
      expect(advanced.statusCode, advanced.body).toBe(200);
      expect(advanced.json().course).toMatchObject({
        status: 'IN_PROGRESS',
        progress: { acceptedTicks: '1000', chargedQ: '5000000' },
      });
      const settledRow = await db
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const settled = readCompanyCombatAggregateState(settledRow.state);
      const walletAfterCourse = settled.economy.finance.wallets.find(
        (wallet) => wallet.walletId === purseId,
      );
      expect(walletAfterCourse?.cashQ).toBe('15000000');

      const market = await app.inject({
        method: 'GET',
        url: '/company/equipment-market/kamenny-brod',
        headers,
      });
      expect(market.statusCode, market.body).toBe(200);
      const weaponQuote = (market.json() as EquipmentMarketDto).items.find(
        (entry) => entry.itemId === weaponId,
      );
      expect(weaponQuote).toMatchObject({ canSell: true, priceQ: '4000000' });
      const companyBeforeSale = await readCompany();
      const request: EquipmentSaleRequestDto = {
        schemaVersion: 1,
        commandId: randomUUID(),
        expectedRevision: companyBeforeSale.company!.revision,
        itemId: weaponId,
        shopRevision: '0',
      };
      const sell = () =>
        app.inject({
          method: 'POST',
          url: '/company/equipment-market/kamenny-brod/sell',
          headers,
          payload: request,
        });
      const sold = await sell();
      expect(sold.statusCode, sold.body).toBe(200);
      expect(sold.json()).toMatchObject({ ok: true, commandId: request.commandId });

      const afterSaleRow = await db
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const afterSale = readCompanyCombatAggregateState(afterSaleRow.state);
      const task = afterSale.learning.tasks.tasks.find(
        (entry) => entry.start.command.type === 'StartLearning',
      );
      expect(task?.stop).toMatchObject({
        type: 'StopLearning',
        payload: { reason: 'PREREQUISITES' },
      });
      expect(afterSale.learning.tasks.tasks.filter((entry) => entry.stop)).toHaveLength(1);
      const walletAfterSale = afterSale.economy.finance.wallets.find(
        (wallet) => wallet.walletId === purseId,
      );
      expect(walletAfterSale?.cashQ).toBe('19000000');
      expect(afterSale.economy.physical!.items.some((item) => item.itemId === weaponId)).toBe(
        false,
      );

      const merchant = await db
        .selectFrom('settlement_supplies')
        .select('cash_q')
        .where('world_id', '=', worldId)
        .where('site_id', '=', 'kamenny-brod')
        .executeTakeFirstOrThrow();
      expect(merchant.cash_q).toBe('16000000');
      const traderItem = await sql<{ readonly item: unknown }>`
        select item from settlement_equipment where world_id = ${worldId} and item_id = ${weaponId}
      `.execute(db);
      expect(traderItem.rows).toHaveLength(1);
      expect(traderItem.rows[0]!.item).toMatchObject({
        itemId: weaponId,
        owner: { kind: 'WORLD', id: worldId },
        containerId: `trader-items:${worldId}:kamenny-brod`,
      });
      const saleEvents = await db
        .selectFrom('company_audit_events')
        .select('event')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .execute();
      expect(
        saleEvents.filter(
          (entry) => (entry.event as { readonly type?: string }).type === 'EquipmentSold',
        ),
      ).toHaveLength(1);

      expect((await sell()).json()).toEqual(sold.json());
      const replayedRow = await db
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      expect(readCompanyCombatAggregateState(replayedRow.state)).toEqual(afterSale);
      const retainedAfterReplay = await sql<{ readonly count: string }>`
        select count(*)::text as count from settlement_equipment
        where world_id = ${worldId} and item_id = ${weaponId}
      `.execute(db);
      expect(retainedAfterReplay.rows[0]?.count).toBe('1');
      expect(
        await db
          .selectFrom('settlement_supplies')
          .select('cash_q')
          .where('world_id', '=', worldId)
          .where('site_id', '=', 'kamenny-brod')
          .executeTakeFirstOrThrow(),
      ).toEqual(merchant);
      const saleEventsAfterReplay = await db
        .selectFrom('company_audit_events')
        .select('event')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .execute();
      expect(
        saleEventsAfterReplay.filter(
          (entry) => (entry.event as { readonly type?: string }).type === 'EquipmentSold',
        ),
      ).toHaveLength(1);
    } finally {
      await db.transaction().execute(async (transaction) => {
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
        await sql`delete from settlement_equipment where world_id = ${worldId}`.execute(
          transaction,
        );
        await transaction
          .deleteFrom('settlement_supplies')
          .where('world_id', '=', worldId)
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
          .where('account_id', '=', accountId)
          .execute();
        await transaction.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      });
    }
  },
);

function courseAccessCompany(
  worldId: string,
  companyId: string,
  purseId: string,
  weaponId: string,
): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture().state;
  const state = JSON.parse(
    JSON.stringify(fixture)
      .replaceAll('"world"', JSON.stringify(worldId))
      .replaceAll('"a-company"', JSON.stringify(companyId)),
  ) as CompanyCombatAggregateState;
  const physical = state.economy.physical!;
  const rations = physical.items[0]!;
  const sword = {
    ...rations,
    itemId: weaponId,
    definitionId: 'sword',
    quantity: 1,
    contentRevision: '0',
    provenance: { sourceId: 'course-access-loss-fixture', parentItemId: null, ordinal: 50 },
  };
  return readCompanyCombatAggregateState({
    ...state,
    economy: {
      ...state.economy,
      lifecycle: {
        ...state.economy.lifecycle,
        parties: state.economy.lifecycle.parties.map((party) => ({ ...party, location })),
        characters: state.economy.lifecycle.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location },
          ...(character.identity.characterId === 'a-leader'
            ? {
                skills: {
                  ...character.skills,
                  blades: initialSkillProgress(0, `${character.identity.characterId}-blades`),
                },
              }
            : {}),
        })),
      },
      finance: {
        ...state.economy.finance,
        wallets: state.economy.finance.wallets.map((wallet) => ({
          ...wallet,
          location,
          ...(wallet.walletId === 'purse' ? { walletId: purseId, cashQ: moneyQ('20000000') } : {}),
        })),
        pools: state.economy.finance.pools.map((pool) =>
          pool.walletId === 'purse' ? { ...pool, walletId: purseId } : pool,
        ),
      },
      physical: {
        ...physical,
        containers: physical.containers.map((container) => ({ ...container, location })),
        items: [...physical.items, sword],
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map((container) => ({
            ...container,
            location,
          })),
          itemSnapshots: [...physical.knowledge.itemSnapshots, sword],
        },
      },
    },
  });
}

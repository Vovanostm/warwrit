import { createHash, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  MILL_DESCENT_KIT_INITIAL_STOCK,
  MILL_DESCENT_KIT_PRICE_Q,
  MILL_DESCENT_KIT_SITE,
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractTerms,
  prepareOrdinaryContractCommand,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, ContractPlace } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];
const testScopes: { readonly worldId: string; readonly accountId: string }[] = [];
const issuer: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };

function config() {
  if (connectionString === undefined) throw new Error('company test database missing');
  return loadServerConfig({
    DATABASE_URL: connectionString,
    OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
    OIDC_CLIENT_ID: 'warwrit-local',
    OIDC_CLIENT_SECRET: 'local-only-secret',
    OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
    PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
    HOST: '127.0.0.1',
    PORT: '3107',
  });
}

function aggregateAt(worldId: string, companyId: string, place: ContractPlace) {
  const fixture = createCompanyCombatAggregateFixture().state;
  const replacements = new Map([
    [String(fixture.economy.lifecycle.worldId), worldId],
    [String(fixture.economy.lifecycle.companyId), companyId],
  ]);
  const replaced = JSON.parse(
    JSON.stringify(fixture, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as CompanyCombatAggregateState;
  const location = { kind: 'AT' as const, ...place };
  const party = replaced.economy.lifecycle.parties[0]!;
  const physical = replaced.economy.physical;
  if (!physical) throw new Error('Fixture physical state is missing');
  return readCompanyCombatAggregateState({
    ...replaced,
    economy: {
      ...replaced.economy,
      lifecycle: {
        ...replaced.economy.lifecycle,
        parties: replaced.economy.lifecycle.parties.map((entry) => ({ ...entry, location })),
        characters: replaced.economy.lifecycle.characters.map((entry) => ({
          ...entry,
          presence: { ...entry.presence, location },
        })),
      },
      finance: {
        ...replaced.economy.finance,
        wallets: replaced.economy.finance.wallets.map((wallet) =>
          wallet.owner.kind === 'COMPANY'
            ? { ...wallet, location, cashQ: '50000000' }
            : { ...wallet, location },
        ),
      },
      physical: {
        ...physical,
        items: physical.items.map((item) =>
          item.definitionId === 'ration' ? { ...item, quantity: 2 } : item,
        ),
        containers: physical.containers.map((container) => ({
          ...container,
          ...(container.containerId === 'fixture-supply'
            ? {
                kind: 'PARTY_SUPPLY' as const,
                carrier: { kind: 'PARTY' as const, id: party.partyId },
              }
            : {}),
          location,
        })),
      },
    },
  });
}

async function seedCompany(input: {
  readonly worldId: string;
  readonly companyId: string;
  readonly accountId: string;
  readonly sessionToken: string;
  readonly state: CompanyCombatAggregateState;
}) {
  if (!database) throw new Error('company test database missing');
  const lifecycle = input.state.economy.lifecycle;
  await database
    .insertInto('identity_accounts')
    .values({ id: input.accountId, issuer: 'http://127.0.0.1:5557/dex', subject: input.accountId })
    .execute();
  await database
    .insertInto('identity_sessions')
    .values({
      token_digest: createHash('sha256').update(input.sessionToken).digest(),
      account_id: input.accountId,
      expires_at: new Date(Date.now() + 60_000),
    })
    .execute();
  await database
    .insertInto('company_snapshots')
    .values({
      world_id: input.worldId,
      company_id: input.companyId,
      schema_version: COMPANY_SCHEMA_VERSION,
      ruleset_id: COMPANY_RULESET_ID,
      catalogue_version: COMPANY_CATALOGUE_VERSION,
      command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
      public_revision: lifecycle.knowledge.revision,
      canonical_revision: lifecycle.revision,
      state: input.state,
    })
    .execute();
  await database
    .insertInto('company_account_owners')
    .values({ world_id: input.worldId, company_id: input.companyId, account_id: input.accountId })
    .execute();
}

function createApp(worldId: string) {
  if (!database) throw new Error('company test database missing');
  return buildApp({
    identity: { config: config().identity!, database },
    company: { database, worldId },
  });
}

async function setCompanyPlace(worldId: string, companyId: string, place: ContractPlace) {
  if (!database) throw new Error('company test database missing');
  const previous = await database
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const state = readCompanyCombatAggregateState(previous.state);
  const location = { kind: 'AT' as const, ...place };
  const next = readCompanyCombatAggregateState({
    ...state,
    economy: {
      ...state.economy,
      lifecycle: {
        ...state.economy.lifecycle,
        parties: state.economy.lifecycle.parties.map((party) => ({ ...party, location })),
        characters: state.economy.lifecycle.characters.map((person) => ({
          ...person,
          presence: { ...person.presence, location },
        })),
      },
      finance: {
        ...state.economy.finance,
        wallets: state.economy.finance.wallets.map((wallet) => ({ ...wallet, location })),
      },
      physical: state.economy.physical
        ? {
            ...state.economy.physical,
            containers: state.economy.physical.containers.map((container) => ({
              ...container,
              location,
            })),
          }
        : undefined,
    },
  });
  await database
    .updateTable('company_snapshots')
    .set({ state: next })
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
}

async function step(
  app: ReturnType<typeof buildApp>,
  sessionToken: string,
  commandId: string,
  expectedRevision: string,
  stepId: string,
) {
  const response = await app.inject({
    method: 'POST',
    url: '/contracts/ordinary/commands',
    headers: {
      cookie: `warwrit_session=${sessionToken}`,
      origin: 'http://127.0.0.1:3107',
    },
    payload: {
      schemaVersion: 1,
      commandId,
      instanceId: 'ci.m1.voice-under-boards.01',
      expectedRevision,
      type: 'STEP',
      stepId,
    },
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as {
    readonly ok: boolean;
    readonly revision: string;
    readonly rewardQ: string | null;
  };
}

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  if (database)
    for (const scope of testScopes) {
      await database.transaction().execute(async (transaction) => {
        await transaction
          .deleteFrom('ordinary_contract_receipts')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('ordinary_contracts')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('mill_descent_kit_stock')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('world_hunt_states')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('contract_instances')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('company_audit_events')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('company_receipts')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('company_account_owners')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('company_snapshots')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('world_first_hunt_state')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('world_campaign_clocks')
          .where('world_id', '=', scope.worldId)
          .execute();
        await transaction
          .deleteFrom('identity_sessions')
          .where('account_id', '=', scope.accountId)
          .execute();
        await transaction
          .deleteFrom('identity_accounts')
          .where('id', '=', scope.accountId)
          .execute();
      });
    }
  await database?.destroy();
});

describe('voice-under-boards kit purchase (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'buys and consumes the finite kit, releases Ostap quietly and completes the rescue',
    async () => {
      if (!database) throw new Error('company test database missing');
      const worldId = randomUUID();
      const companyId = randomUUID();
      const accountId = randomUUID();
      const sessionToken = randomUUID();
      const commandId = randomUUID();
      const profile = ordinaryContractProfile('ci.m1.voice-under-boards.01');
      if (!profile) throw new Error('Voice-under-boards profile is missing');
      const app = createApp(worldId);
      apps.push(app);
      testScopes.push({ worldId, accountId });
      await seedCompany({
        worldId,
        companyId,
        accountId,
        sessionToken,
        state: aggregateAt(worldId, companyId, issuer),
      });
      await database
        .insertInto('world_campaign_clocks')
        .values({ world_id: worldId, epoch_ms: String(Date.now()), starting_tick: '1000' })
        .execute();
      const boardResponse = await app.inject({
        method: 'GET',
        url: '/contracts/board',
        headers: { cookie: `warwrit_session=${sessionToken}` },
      });
      expect(boardResponse.statusCode).toBe(200);
      expect(boardResponse.json().contracts).toBeDefined();
      const initialStock = await database
        .selectFrom('mill_descent_kit_stock')
        .select(['quantity', 'price_q'])
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      expect(initialStock).toEqual({
        quantity: MILL_DESCENT_KIT_INITIAL_STOCK,
        price_q: MILL_DESCENT_KIT_PRICE_Q,
      });

      const accepted = prepareOrdinaryContractCommand(
        profile,
        ordinaryContractGenesis(profile),
        { type: 'ACCEPT' },
        {
          companyId,
          standingAt: issuer,
          atTick: '0',
          expectedRevision: '0',
          sourceEventId: 'test-accept',
          gates: { DAYLIGHT: true, RAIDERS_DEFEATED: true, BEAST_DEFEATED: false },
        },
      );
      if (accepted.kind !== 'PREPARED')
        throw new Error('Could not prepare accepted contract state');
      await database
        .updateTable('ordinary_contracts')
        .set({ revision: accepted.next.revision, state: accepted.next })
        .where('world_id', '=', worldId)
        .where('instance_id', '=', profile.instanceId)
        .executeTakeFirstOrThrow();

      const bought = await step(
        app,
        sessionToken,
        commandId,
        accepted.next.revision,
        'buy-descent-kit',
      );
      expect(bought).toMatchObject({ ok: true, rewardQ: null });

      const stock = await database
        .selectFrom('mill_descent_kit_stock')
        .select(['revision', 'quantity', 'cash_q'])
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      expect(stock).toEqual({ revision: '1', quantity: 1, cash_q: MILL_DESCENT_KIT_PRICE_Q });
      const saved = await database
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const company = readCompanyCombatAggregateState(saved.state);
      expect(
        company.economy.physical?.items.find((item) => item.itemId === commandId),
      ).toMatchObject({ definitionId: 'mill-descent-kit', quantity: 1, tombstone: null });
      expect(
        company.economy.finance.movements.some(
          (movement) =>
            movement.movementId === commandId && movement.amountQ === MILL_DESCENT_KIT_PRICE_Q,
        ),
      ).toBe(true);

      const firstHunt = await database
        .selectFrom('world_first_hunt_state')
        .select('hostiles')
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const defeatedHostiles = (firstHunt.hostiles as readonly Record<string, unknown>[]).map(
        (hostile) => ({
          ...hostile,
          currentPools: {
            ...(hostile['currentPools'] as Readonly<Record<string, unknown>>),
            health: 0,
          },
        }),
      );
      await database
        .updateTable('world_first_hunt_state')
        .set({ hostiles: JSON.stringify(defeatedHostiles) })
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const mill = { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' };
      await setCompanyPlace(worldId, companyId, mill);
      const cellar = await step(app, sessionToken, randomUUID(), bought.revision, 'inspect-cellar');
      const tracks = await step(app, sessionToken, randomUUID(), cellar.revision, 'inspect-tracks');
      const releaseCommandId = randomUUID();
      const released = await step(
        app,
        sessionToken,
        releaseCommandId,
        tracks.revision,
        'release-ostap-quiet',
      );
      expect(released).toMatchObject({ ok: true, rewardQ: null });
      const afterReleaseRow = await database
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      const afterRelease = readCompanyCombatAggregateState(afterReleaseRow.state);
      expect(
        afterRelease.economy.physical?.items.find((item) => item.itemId === commandId)?.tombstone,
      ).toMatchObject({
        sourceId: releaseCommandId,
        causeId: 'QUIET_MILL_RESCUE',
      });

      await setCompanyPlace(worldId, companyId, issuer);
      const delivered = await step(
        app,
        sessionToken,
        randomUUID(),
        released.revision,
        'deliver-ostap',
      );
      expect(delivered).toMatchObject({ ok: true, rewardQ: profile.rewardQ });
      const recorded = await database
        .selectFrom('ordinary_contracts')
        .select('state')
        .where('world_id', '=', worldId)
        .where('instance_id', '=', profile.instanceId)
        .executeTakeFirstOrThrow();
      expect(JSON.stringify(recorded.state)).toContain('voice-under-boards-kit-purchased');
      expect(
        ordinaryContractTerms(profile).steps.some((step) => step.stepId === 'release-ostap-quiet'),
      ).toBe(true);
    },
  );
});

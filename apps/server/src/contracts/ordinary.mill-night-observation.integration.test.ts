import { createHash, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  canonicalJson,
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  ordinaryContractProfile,
  readCompanyCombatAggregateState,
  readOrdinaryContractState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, ContractPlace, LocationRef } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];
const testRuns: { readonly worldId: string; readonly accountIds: readonly string[] }[] = [];
const millWorkerId = 'ci.m1.mill-worker.01';
const millBeastId = 'ci.m1.mill-beast.01';
const millWorkerIssuer: ContractPlace = { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
const millYard: ContractPlace = { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' };

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

function aggregateAt(worldId: string, companyId: string, prefix: string, place: ContractPlace) {
  const fixture = createCompanyCombatAggregateFixture().state;
  const replaced = JSON.parse(
    JSON.stringify(fixture, (_key, value: unknown) => {
      if (value === 'world') return worldId;
      if (value === 'a-company') return companyId;
      if (typeof value === 'string' && value.startsWith('a-')) return `${prefix}-${value.slice(2)}`;
      return value;
    }),
  ) as CompanyCombatAggregateState;
  return atPlace(replaced, place);
}

function atPlace(state: CompanyCombatAggregateState, place: ContractPlace) {
  const location: LocationRef = { kind: 'AT', ...place };
  const { lifecycle, finance, physical } = state.economy;
  return readCompanyCombatAggregateState({
    ...state,
    economy: {
      ...state.economy,
      lifecycle: {
        ...lifecycle,
        parties: lifecycle.parties.map((party) => ({ ...party, location })),
        characters: lifecycle.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location },
        })),
      },
      finance: {
        ...finance,
        wallets: finance.wallets.map((wallet) => ({ ...wallet, location })),
      },
      physical: physical
        ? {
            ...physical,
            containers: physical.containers.map((container) => ({ ...container, location })),
          }
        : physical,
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
    .values({
      id: input.accountId,
      issuer: `mill-eligibility-${input.accountId}`,
      subject: input.accountId,
    })
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
  const row = await database
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const state = atPlace(readCompanyCombatAggregateState(row.state), place);
  await database
    .updateTable('company_snapshots')
    .set({ state })
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
}

async function ordinaryBoard(app: ReturnType<typeof buildApp>, sessionToken: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/contracts/board',
    headers: { cookie: `warwrit_session=${sessionToken}` },
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as {
    readonly contracts: readonly {
      readonly instanceId: string;
      readonly revision: string;
      readonly canAccept: boolean;
      readonly canHelp: boolean;
    }[];
  };
}

async function ordinaryCommand(
  app: ReturnType<typeof buildApp>,
  sessionToken: string,
  input: {
    readonly commandId: string;
    readonly expectedRevision: string;
    readonly type: 'ACCEPT' | 'HELP' | 'STEP';
    readonly stepId: string | null;
  },
) {
  return app.inject({
    method: 'POST',
    url: '/contracts/ordinary/commands',
    headers: {
      cookie: `warwrit_session=${sessionToken}`,
      origin: 'http://127.0.0.1:3107',
    },
    payload: {
      schemaVersion: 1,
      commandId: input.commandId,
      instanceId: millWorkerId,
      expectedRevision: input.expectedRevision,
      type: input.type,
      stepId: input.stepId,
    },
  });
}

async function hunts(app: ReturnType<typeof buildApp>, sessionToken: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/contracts/hunts',
    headers: { cookie: `warwrit_session=${sessionToken}` },
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as {
    readonly hunts: readonly {
      readonly contract: { readonly instanceId: string; readonly termsDigest: string } | null;
    }[];
  };
}

async function ordinaryState(worldId: string) {
  if (!database) throw new Error('company test database missing');
  const profile = ordinaryContractProfile(millWorkerId);
  if (!profile) throw new Error('Mill-worker profile is missing');
  const row = await database
    .selectFrom('ordinary_contracts')
    .select(['profile_id', 'wallet_q', 'state'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', millWorkerId)
    .executeTakeFirstOrThrow();
  return { row, state: readOrdinaryContractState(profile, row.state, row.profile_id) };
}

async function companySnapshot(worldId: string, companyId: string) {
  if (!database) throw new Error('company test database missing');
  return database
    .selectFrom('company_snapshots')
    .select(['canonical_revision', 'public_revision', 'state'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
}

async function millBeastRow(worldId: string) {
  if (!database) throw new Error('company test database missing');
  return database
    .selectFrom('world_hunt_states')
    .select(['revision', 'hostiles'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', millBeastId)
    .executeTakeFirstOrThrow();
}

async function ordinaryReceipts(worldId: string) {
  if (!database) throw new Error('company test database missing');
  return database
    .selectFrom('ordinary_contract_receipts')
    .selectAll()
    .where('world_id', '=', worldId)
    .execute();
}

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  if (database)
    for (const { worldId, accountIds } of testRuns) {
      await database.transaction().execute(async (transaction) => {
        await transaction
          .deleteFrom('ordinary_contract_receipts')
          .where('world_id', '=', worldId)
          .execute();
        await transaction
          .deleteFrom('ordinary_contracts')
          .where('world_id', '=', worldId)
          .execute();
        await transaction.deleteFrom('world_hunt_states').where('world_id', '=', worldId).execute();
        await transaction
          .deleteFrom('contract_instances')
          .where('world_id', '=', worldId)
          .execute();
        await transaction
          .deleteFrom('company_audit_events')
          .where('world_id', '=', worldId)
          .execute();
        await transaction.deleteFrom('company_receipts').where('world_id', '=', worldId).execute();
        await transaction
          .deleteFrom('company_account_owners')
          .where('world_id', '=', worldId)
          .execute();
        await transaction.deleteFrom('company_snapshots').where('world_id', '=', worldId).execute();
        await transaction
          .deleteFrom('world_first_hunt_state')
          .where('world_id', '=', worldId)
          .execute();
        await transaction
          .deleteFrom('world_campaign_clocks')
          .where('world_id', '=', worldId)
          .execute();
        await transaction
          .deleteFrom('identity_sessions')
          .where('account_id', 'in', accountIds)
          .execute();
        await transaction.deleteFrom('identity_accounts').where('id', 'in', accountIds).execute();
      });
    }
  await database?.destroy();
});

describe('mill night observation unlock (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'requires a night inspection at the mill and retains its actual observation for the hunt unlock',
    async () => {
      if (!database) throw new Error('company test database missing');
      const worldId = randomUUID();
      const companyId = randomUUID();
      const accountId = randomUUID();
      const session = randomUUID();
      testRuns.push({ worldId, accountIds: [accountId] });
      const app = createApp(worldId);
      apps.push(app);
      await seedCompany({
        worldId,
        companyId,
        accountId,
        sessionToken: session,
        state: aggregateAt(worldId, companyId, 'mill-night', millWorkerIssuer),
      });
      const now = Date.now();
      await database
        .insertInto('world_campaign_clocks')
        .values({ world_id: worldId, epoch_ms: String(now), starting_tick: '1000' })
        .execute();
      const offer = (await ordinaryBoard(app, session)).contracts.find(
        (contract) => contract.instanceId === millWorkerId,
      )!;
      const accepted = await ordinaryCommand(app, session, {
        commandId: randomUUID(),
        expectedRevision: offer.revision,
        type: 'ACCEPT',
        stepId: null,
      });
      expect(accepted.json()).toMatchObject({ ok: true, revision: '1' });
      // A company at the issuer cannot inspect the mill yard.
      await setCompanyPlace(worldId, companyId, millWorkerIssuer);
      const wrongPlace = await ordinaryCommand(app, session, {
        commandId: randomUUID(),
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'inspect-yard-at-night',
      });
      expect(wrongPlace.json()).toMatchObject({ ok: false });
      const acceptanceFacts = (await ordinaryState(worldId)).state.facts;
      expect(acceptanceFacts).toEqual([
        expect.objectContaining({ slotId: 'mill-worker-contract-acceptance', companyId }),
      ]);
      await setCompanyPlace(worldId, companyId, millYard);

      await database
        .updateTable('world_campaign_clocks')
        .set({ epoch_ms: String(now) })
        .where('world_id', '=', worldId)
        .execute();
      const dayCommandId = randomUUID();
      const daySnapshot = await companySnapshot(worldId, companyId);
      const dayInspection = await ordinaryCommand(app, session, {
        commandId: dayCommandId,
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'inspect-yard-at-night',
      });
      expect(dayInspection.statusCode).toBe(409);
      expect(dayInspection.json()).toMatchObject({ ok: false, code: 'CONDITION_NOT_MET' });
      expect(await companySnapshot(worldId, companyId)).toEqual(daySnapshot);
      expect(
        await database
          .selectFrom('ordinary_contract_receipts')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('command_id', '=', dayCommandId)
          .execute(),
      ).toEqual([]);

      await database
        .updateTable('world_campaign_clocks')
        .set({ epoch_ms: String(now - 700_000) })
        .where('world_id', '=', worldId)
        .execute();
      const liveBeast = await millBeastRow(worldId);
      const emptyMillFixture = (liveBeast.hostiles as Array<Record<string, unknown>>).map(
        (hostile) => ({
          ...hostile,
          currentPools: { ...(hostile['currentPools'] as Record<string, number>), health: 0 },
        }),
      );
      // Regression fixture only: model an already cleared hostile lifecycle; no claim or proof is seeded.
      await database
        .updateTable('world_hunt_states')
        .set({
          hostiles: canonicalJson(emptyMillFixture),
          revision: String(BigInt(liveBeast.revision) + 1n),
        })
        .where('world_id', '=', worldId)
        .where('instance_id', '=', millBeastId)
        .execute();
      const beforeEmptyRefusal = await companySnapshot(worldId, companyId);
      const receiptsBeforeEmptyRefusal = await ordinaryReceipts(worldId);
      const noLivingCommandId = randomUUID();
      const noLivingTarget = await ordinaryCommand(app, session, {
        commandId: noLivingCommandId,
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'inspect-yard-at-night',
      });
      expect(noLivingTarget.statusCode).toBe(409);
      expect(noLivingTarget.json()).toMatchObject({ ok: false, code: 'CONDITION_NOT_MET' });
      expect(await companySnapshot(worldId, companyId)).toEqual(beforeEmptyRefusal);
      expect(await ordinaryState(worldId)).toMatchObject({ state: { facts: acceptanceFacts } });
      expect(await ordinaryReceipts(worldId)).toEqual(receiptsBeforeEmptyRefusal);
      expect(
        await database
          .selectFrom('ordinary_contract_receipts')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('command_id', '=', noLivingCommandId)
          .execute(),
      ).toEqual([]);
      await database
        .updateTable('world_hunt_states')
        .set({
          hostiles: canonicalJson(liveBeast.hostiles),
          revision: String(BigInt(liveBeast.revision) + 2n),
        })
        .where('world_id', '=', worldId)
        .where('instance_id', '=', millBeastId)
        .execute();

      const nightCommandId = randomUUID();
      const nightInspection = await ordinaryCommand(app, session, {
        commandId: nightCommandId,
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'inspect-yard-at-night',
      });
      expect(nightInspection.statusCode, nightInspection.body).toBe(200);
      expect(nightInspection.json()).toMatchObject({ ok: true, revision: '2' });
      expect((await ordinaryState(worldId)).state.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slotId: 'mill-worker-lawful-night-threat-observation',
            companyId,
          }),
        ]),
      );
      await app.close();
      const recreatedApp = createApp(worldId);
      apps[apps.indexOf(app)] = recreatedApp;
      expect(
        (await hunts(recreatedApp, session)).hunts.some(
          (hunt) => hunt.contract?.instanceId === millBeastId,
        ),
      ).toBe(true);
      expect(
        (await ordinaryBoard(recreatedApp, session)).contracts.find(
          (contract) => contract.instanceId === millWorkerId,
        ),
      ).toBeDefined();
      const replay = await ordinaryCommand(recreatedApp, session, {
        commandId: nightCommandId,
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'inspect-yard-at-night',
      });
      expect(replay.statusCode, replay.body).toBe(200);
      expect(replay.json()).toEqual(nightInspection.json());
    },
  );
});

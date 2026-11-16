import { createHash, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  huntProfile,
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
const keeperPlace: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
const millBeast = huntProfile(millBeastId)!;

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

async function millBeastRead(app: ReturnType<typeof buildApp>, sessionToken: string) {
  const response = await app.inject({
    method: 'GET',
    url: `/contracts/first-hunt?instanceId=${millBeastId}`,
    headers: { cookie: `warwrit_session=${sessionToken}` },
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as {
    readonly publicRevision: string;
    readonly contract: {
      readonly termsDigest: string;
      readonly yourRole: string;
      readonly encounterId: string | null;
    } | null;
  };
}

async function millBeastCommand(
  app: ReturnType<typeof buildApp>,
  sessionToken: string,
  input: {
    readonly commandId: string;
    readonly expectedPublicRevision: string;
    readonly type: 'ACCEPT' | 'JOIN' | 'PICKUP';
    readonly termsDigest?: string;
    readonly toContainerId?: string;
  },
) {
  const response = await app.inject({
    method: 'POST',
    url: '/contracts/commands',
    headers: {
      cookie: `warwrit_session=${sessionToken}`,
      origin: 'http://127.0.0.1:3107',
    },
    payload: {
      schemaVersion: 1,
      commandId: input.commandId,
      expectedPublicRevision: input.expectedPublicRevision,
      type: input.type,
      payload: {
        instanceId: millBeastId,
        ...(input.type === 'ACCEPT' ? { termsDigest: input.termsDigest } : {}),
        ...(input.type === 'PICKUP' ? { toContainerId: input.toContainerId } : {}),
      },
    },
  });
  return response;
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

describe('mill worker clues and mill-beast eligibility (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'requires both actual clues from one company, then preserves daytime join and pre-terminal pickup refusals',
    async () => {
      if (!database) throw new Error('company test database missing');
      const worldId = randomUUID();
      const ownerCompanyId = randomUUID();
      const ownerAccountId = randomUUID();
      const ownerSession = randomUUID();
      const helperCompanyId = randomUUID();
      const helperAccountId = randomUUID();
      const helperSession = randomUUID();
      testRuns.push({ worldId, accountIds: [ownerAccountId, helperAccountId] });

      const app = createApp(worldId);
      apps.push(app);
      await seedCompany({
        worldId,
        companyId: ownerCompanyId,
        accountId: ownerAccountId,
        sessionToken: ownerSession,
        state: aggregateAt(worldId, ownerCompanyId, 'mill-owner', millWorkerIssuer),
      });
      await seedCompany({
        worldId,
        companyId: helperCompanyId,
        accountId: helperAccountId,
        sessionToken: helperSession,
        state: aggregateAt(worldId, helperCompanyId, 'mill-helper', millWorkerIssuer),
      });
      await database
        .insertInto('world_campaign_clocks')
        .values({ world_id: worldId, epoch_ms: String(Date.now()), starting_tick: '1000' })
        .execute();

      const ownerInitial = await ordinaryBoard(app, ownerSession);
      const workerOffer = ownerInitial.contracts.find(
        (contract) => contract.instanceId === millWorkerId,
      )!;
      expect(workerOffer).toMatchObject({ canAccept: true, revision: '0' });
      expect(
        (await hunts(app, ownerSession)).hunts.some(
          (hunt) => hunt.contract?.instanceId === millBeastId,
        ),
      ).toBe(false);
      const acceptedWorker = await ordinaryCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: workerOffer.revision,
        type: 'ACCEPT',
        stepId: null,
      });
      expect(acceptedWorker.statusCode, acceptedWorker.body).toBe(200);
      expect(acceptedWorker.json()).toMatchObject({ ok: true, revision: '1' });

      await setCompanyPlace(worldId, ownerCompanyId, millYard);
      const inspect = await ordinaryCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'inspect-yard',
      });
      expect(inspect.statusCode, inspect.body).toBe(200);
      expect(inspect.json()).toMatchObject({ ok: true, revision: '2' });
      expect(
        (await hunts(app, ownerSession)).hunts.some(
          (hunt) => hunt.contract?.instanceId === millBeastId,
        ),
      ).toBe(false);

      const helperBoard = await ordinaryBoard(app, helperSession);
      const helperOffer = helperBoard.contracts.find(
        (contract) => contract.instanceId === millWorkerId,
      )!;
      expect(helperOffer).toMatchObject({ canHelp: true, revision: '2' });
      const helped = await ordinaryCommand(app, helperSession, {
        commandId: randomUUID(),
        expectedRevision: helperOffer.revision,
        type: 'HELP',
        stepId: null,
      });
      expect(helped.statusCode, helped.body).toBe(200);
      expect(helped.json()).toMatchObject({ ok: true, revision: '3' });

      await setCompanyPlace(worldId, helperCompanyId, keeperPlace);
      const helperReport = await ordinaryCommand(app, helperSession, {
        commandId: randomUUID(),
        expectedRevision: '3',
        type: 'STEP',
        stepId: 'ask-keeper',
      });
      expect(helperReport.statusCode, helperReport.body).toBe(200);
      expect(helperReport.json()).toMatchObject({ ok: true, revision: '4' });
      let split = await ordinaryState(worldId);
      expect(split.state.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slotId: 'mill-worker-grain-cart-observation',
            companyId: ownerCompanyId,
          }),
          expect.objectContaining({
            slotId: 'mill-worker-human-report',
            companyId: helperCompanyId,
          }),
        ]),
      );
      expect(
        (await hunts(app, ownerSession)).hunts.some(
          (hunt) => hunt.contract?.instanceId === millBeastId,
        ),
      ).toBe(false);
      expect(
        (await hunts(app, helperSession)).hunts.some(
          (hunt) => hunt.contract?.instanceId === millBeastId,
        ),
      ).toBe(false);

      await setCompanyPlace(worldId, ownerCompanyId, keeperPlace);
      const ownerReport = await ordinaryCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '4',
        type: 'STEP',
        stepId: 'ask-keeper',
      });
      expect(ownerReport.statusCode, ownerReport.body).toBe(200);
      expect(ownerReport.json()).toMatchObject({ ok: true, revision: '5' });
      split = await ordinaryState(worldId);
      expect(split.state.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slotId: 'mill-worker-grain-cart-observation',
            companyId: ownerCompanyId,
          }),
          expect.objectContaining({
            slotId: 'mill-worker-human-report',
            companyId: ownerCompanyId,
          }),
        ]),
      );
      expect(
        (await hunts(app, ownerSession)).hunts.some(
          (hunt) => hunt.contract?.instanceId === millBeastId,
        ),
      ).toBe(true);

      const huntBeforeAccept = await millBeastRead(app, ownerSession);
      expect(huntBeforeAccept.contract).not.toBeNull();
      const acceptedBeast = await millBeastCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedPublicRevision: huntBeforeAccept.publicRevision,
        type: 'ACCEPT',
        termsDigest: huntBeforeAccept.contract!.termsDigest,
      });
      expect(acceptedBeast.statusCode, acceptedBeast.body).toBe(200);
      expect(acceptedBeast.json()).toMatchObject({ ok: true, publicRevision: '1' });

      await setCompanyPlace(worldId, ownerCompanyId, millBeast.objectiveLocation);
      const beforeDayJoin = await companySnapshot(worldId, ownerCompanyId);
      const joinCommandId = randomUUID();
      const dayJoin = await millBeastCommand(app, ownerSession, {
        commandId: joinCommandId,
        expectedPublicRevision: '1',
        type: 'JOIN',
      });
      expect(dayJoin.statusCode, dayJoin.body).toBe(409);
      expect(dayJoin.json()).toMatchObject({ ok: false, code: 'NOT_AVAILABLE' });
      expect(await companySnapshot(worldId, ownerCompanyId)).toEqual(beforeDayJoin);
      expect(
        await database
          .selectFrom('company_receipts')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('company_id', '=', ownerCompanyId)
          .where('command_id', '=', joinCommandId)
          .execute(),
      ).toEqual([]);

      const companyBeforePickup = await companySnapshot(worldId, ownerCompanyId);
      const companyReceiptsBeforePickup = await database
        .selectFrom('company_receipts')
        .selectAll()
        .where('world_id', '=', worldId)
        .where('company_id', '=', ownerCompanyId)
        .execute();
      const huntBeforePickup = await database
        .selectFrom('world_hunt_states')
        .select(['revision', 'wallet_q'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', millBeastId)
        .executeTakeFirstOrThrow();
      const pickupCommandId = randomUUID();
      const pickup = await millBeastCommand(app, ownerSession, {
        commandId: pickupCommandId,
        expectedPublicRevision: '1',
        type: 'PICKUP',
        toContainerId: 'fixture-supply',
      });
      expect(pickup.statusCode, pickup.body).toBe(409);
      expect(pickup.json()).toMatchObject({ ok: false, code: 'NOT_AVAILABLE' });
      expect(await companySnapshot(worldId, ownerCompanyId)).toEqual(companyBeforePickup);
      expect(
        await database
          .selectFrom('company_receipts')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('company_id', '=', ownerCompanyId)
          .execute(),
      ).toEqual(companyReceiptsBeforePickup);
      expect(
        await database
          .selectFrom('company_receipts')
          .select('command_id')
          .where('world_id', '=', worldId)
          .where('company_id', '=', ownerCompanyId)
          .where('command_id', '=', pickupCommandId)
          .execute(),
      ).toEqual([]);
      expect(
        await database
          .selectFrom('world_proof_claims')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('item_id', '=', millBeast.proofId)
          .execute(),
      ).toEqual([]);
      expect(
        await database
          .selectFrom('world_hunt_states')
          .select(['revision', 'wallet_q'])
          .where('world_id', '=', worldId)
          .where('instance_id', '=', millBeastId)
          .executeTakeFirstOrThrow(),
      ).toEqual(huntBeforePickup);
    },
  );
});

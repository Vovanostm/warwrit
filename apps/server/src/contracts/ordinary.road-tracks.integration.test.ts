import { createHash, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
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
const testRuns: { readonly worldId: string; readonly accountId: string }[] = [];
const instanceId = 'ci.m1.road-tracks.01';
const issuer: ContractPlace = { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const bank: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
const otherPlace: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };

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
  const location: LocationRef = { kind: 'AT', ...place };
  const physical = replaced.economy.physical;
  return readCompanyCombatAggregateState({
    ...replaced,
    economy: {
      ...replaced.economy,
      lifecycle: {
        ...replaced.economy.lifecycle,
        parties: replaced.economy.lifecycle.parties.map((party) => ({ ...party, location })),
        characters: replaced.economy.lifecycle.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location },
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
  const row = await database
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const state = readCompanyCombatAggregateState(row.state);
  const location: LocationRef = { kind: 'AT', ...place };
  const next = readCompanyCombatAggregateState({
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

async function getBoard(app: ReturnType<typeof buildApp>, sessionToken: string) {
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
      readonly state: string;
      readonly canAccept: boolean;
    }[];
  };
}

async function command(
  app: ReturnType<typeof buildApp>,
  sessionToken: string,
  input: {
    readonly commandId: string;
    readonly expectedRevision: string;
    readonly type: 'ACCEPT' | 'STEP';
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
      instanceId,
      expectedRevision: input.expectedRevision,
      type: input.type,
      stepId: input.stepId,
    },
  });
}

async function contractSnapshot(worldId: string) {
  if (!database) throw new Error('company test database missing');
  const profile = ordinaryContractProfile(instanceId);
  if (!profile) throw new Error('Road-tracks profile is missing');
  const row = await database
    .selectFrom('ordinary_contracts')
    .select(['profile_id', 'wallet_q', 'state'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', instanceId)
    .executeTakeFirstOrThrow();
  const receipts = await database
    .selectFrom('ordinary_contract_receipts')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('instance_id', '=', instanceId)
    .execute();
  return {
    row,
    state: readOrdinaryContractState(profile, row.state, row.profile_id),
    receipts,
  };
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
    for (const { worldId, accountId } of testRuns) {
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
  await database?.destroy();
});

describe('road tracks ordinary contract (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'rejects remote, premature and client-forged observations without contract effects',
    async () => {
      if (!database) throw new Error('company test database missing');
      const worldId = randomUUID();
      const companyId = randomUUID();
      const accountId = randomUUID();
      const sessionToken = randomUUID();
      testRuns.push({ worldId, accountId });
      const app = createApp(worldId);
      apps.push(app);
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

      const board = await getBoard(app, sessionToken);
      const initial = board.contracts.find((contract) => contract.instanceId === instanceId)!;
      expect(initial).toMatchObject({ state: 'OFFERED', canAccept: true, revision: '0' });
      const accepted = await command(app, sessionToken, {
        commandId: randomUUID(),
        expectedRevision: initial.revision,
        type: 'ACCEPT',
        stepId: null,
      });
      expect(accepted.statusCode, accepted.body).toBe(200);
      expect(accepted.json()).toMatchObject({ ok: true, revision: '1', rewardQ: null });

      await setCompanyPlace(worldId, companyId, otherPlace);
      const beforeWrongLocation = await companySnapshot(worldId, companyId);
      const wrongLocationId = randomUUID();
      const wrongLocation = await command(app, sessionToken, {
        commandId: wrongLocationId,
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'inspect-bank',
      });
      expect(wrongLocation.statusCode, wrongLocation.body).toBe(409);
      expect(wrongLocation.json()).toMatchObject({ ok: false, code: 'WRONG_PLACE' });
      expect(await companySnapshot(worldId, companyId)).toEqual(beforeWrongLocation);

      await setCompanyPlace(worldId, companyId, issuer);
      const beforeRefusals = await contractSnapshot(worldId);
      const beforePrematureReportCompany = await companySnapshot(worldId, companyId);
      const prematureReportId = randomUUID();
      const prematureReport = await command(app, sessionToken, {
        commandId: prematureReportId,
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'report',
      });
      expect(prematureReport.statusCode, prematureReport.body).toBe(409);
      expect(prematureReport.json()).toMatchObject({ ok: false, code: 'MISSING_EVIDENCE' });
      expect(await companySnapshot(worldId, companyId)).toEqual(beforePrematureReportCompany);

      const forgedObservationId = randomUUID();
      const forgedObservation = await app.inject({
        method: 'POST',
        url: '/contracts/ordinary/commands',
        headers: {
          cookie: `warwrit_session=${sessionToken}`,
          origin: 'http://127.0.0.1:3107',
        },
        payload: {
          schemaVersion: 1,
          commandId: forgedObservationId,
          instanceId,
          expectedRevision: '1',
          type: 'STEP',
          stepId: 'report',
          observation: { slotId: 'road-tracks-observation', place: bank },
        },
      });
      expect(forgedObservation.statusCode, forgedObservation.body).toBe(400);
      expect(await companySnapshot(worldId, companyId)).toEqual(beforePrematureReportCompany);

      const afterRefusals = await contractSnapshot(worldId);
      expect(afterRefusals.state).toEqual(beforeRefusals.state);
      expect(afterRefusals.row.wallet_q).toBe('80000000');
      expect(afterRefusals.row.wallet_q).toBe(beforeRefusals.row.wallet_q);
      expect(afterRefusals.receipts).toEqual(beforeRefusals.receipts);
      expect(afterRefusals.state.facts.map((fact) => fact.slotId)).toEqual([]);
      const refusedCommandIds = new Set<string>([
        wrongLocationId,
        prematureReportId,
        forgedObservationId,
      ]);
      expect(
        afterRefusals.receipts.some((receipt) => refusedCommandIds.has(receipt.command_id)),
      ).toBe(false);
    },
  );
});

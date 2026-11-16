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
const instanceId = 'ci.m1.lost-scout.01';
const issuer: ContractPlace = { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const searchPlace: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };

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
      readonly terminalPayout?: string;
    }[];
  };
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
      instanceId,
      expectedRevision,
      type: stepId === 'accept' ? 'ACCEPT' : 'STEP',
      stepId: stepId === 'accept' ? null : stepId,
    },
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as {
    readonly ok: boolean;
    readonly revision: string;
    readonly rewardQ: string | null;
  };
}

async function savedContract(worldId: string) {
  if (!database) throw new Error('company test database missing');
  const profile = ordinaryContractProfile(instanceId);
  if (!profile) throw new Error('Lost-scout profile is missing');
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
  return { row, state: readOrdinaryContractState(profile, row.state, row.profile_id), receipts };
}

async function companyState(worldId: string, companyId: string) {
  if (!database) throw new Error('company test database missing');
  const row = await database
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  return readCompanyCombatAggregateState(row.state);
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

describe('lost scout ordinary contract (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'delivers the discovered living scout once and replays the accepted delivery after app recreation',
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

      const initialBoard = await getBoard(app, sessionToken);
      const initial = initialBoard.contracts.find(
        (contract) => contract.instanceId === instanceId,
      )!;
      expect(initial).toMatchObject({ state: 'OFFERED', revision: '0' });
      const accepted = await step(app, sessionToken, randomUUID(), initial.revision, 'accept');
      expect(accepted).toMatchObject({ ok: true, revision: '1', rewardQ: null });

      await setCompanyPlace(worldId, companyId, searchPlace);
      const search = await step(app, sessionToken, randomUUID(), accepted.revision, 'search');
      expect(search).toMatchObject({ ok: true, revision: '2', rewardQ: null });
      const recovered = await savedContract(worldId);
      expect(recovered.state.facts.map((fact) => fact.slotId).sort()).toEqual([
        'lost-scout-lawful-discovery',
        'lost-scout-living-recovery',
        'lost-scout-source',
      ]);
      expect(recovered.state.custody).toEqual([{ personId: 'person.lost-scout.01', companyId }]);

      await setCompanyPlace(worldId, companyId, issuer);
      const companyBeforeDelivery = await companyState(worldId, companyId);
      const companyWalletBalanceBeforeQ = companyBeforeDelivery.economy.finance.wallets
        .filter((wallet) => wallet.owner.kind === 'COMPANY' && wallet.owner.id === companyId)
        .reduce((total, wallet) => total + BigInt(wallet.cashQ), 0n);
      const deliveryCommandId = randomUUID();
      const delivery = await step(app, sessionToken, deliveryCommandId, search.revision, 'deliver');
      expect(delivery).toMatchObject({ ok: true, revision: '3', rewardQ: '80000000' });
      const paidContract = await savedContract(worldId);
      expect(paidContract.row.wallet_q).toBe('80000000');
      expect(paidContract.state).toMatchObject({
        outcome: { kind: 'SUCCESS', companyId },
        custody: [],
      });
      expect(paidContract.state.facts.map((fact) => fact.slotId).sort()).toEqual([
        'lost-scout-delivery',
        'lost-scout-lawful-discovery',
        'lost-scout-living-recovery',
        'lost-scout-source',
      ]);
      expect(
        paidContract.receipts.filter((receipt) => receipt.command_id === deliveryCommandId),
      ).toHaveLength(1);
      const paidCompany = await companyState(worldId, companyId);
      const companyWalletBalanceAfterQ = paidCompany.economy.finance.wallets
        .filter((wallet) => wallet.owner.kind === 'COMPANY' && wallet.owner.id === companyId)
        .reduce((total, wallet) => total + BigInt(wallet.cashQ), 0n);
      expect(companyWalletBalanceAfterQ - companyWalletBalanceBeforeQ).toBe(80_000_000n);
      expect(
        paidCompany.economy.finance.movements.filter(
          (movement) =>
            movement.movementId.startsWith('contract-reward:') && movement.amountQ === '80000000',
        ),
      ).toHaveLength(1);
      const paidCompanyReceipts = await database
        .selectFrom('company_receipts')
        .selectAll()
        .where('world_id', '=', worldId)
        .where('company_id', '=', companyId)
        .execute();

      await app.close();
      apps.splice(apps.indexOf(app), 1);
      const reloadedApp = createApp(worldId);
      apps.push(reloadedApp);
      const reloadedBoard = await getBoard(reloadedApp, sessionToken);
      expect(
        reloadedBoard.contracts.find((contract) => contract.instanceId === instanceId),
      ).toMatchObject({ state: 'COMPLETED', terminalPayout: 'PAID' });
      const replay = await step(
        reloadedApp,
        sessionToken,
        deliveryCommandId,
        search.revision,
        'deliver',
      );
      expect(replay).toEqual(delivery);
      expect(await savedContract(worldId)).toEqual(paidContract);
      expect(await companyState(worldId, companyId)).toEqual(paidCompany);
      expect(
        await database
          .selectFrom('company_receipts')
          .selectAll()
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyId)
          .execute(),
      ).toEqual(paidCompanyReceipts);
    },
  );
});

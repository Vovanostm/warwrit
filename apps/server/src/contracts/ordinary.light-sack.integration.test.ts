import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  ordinaryContractGenesis,
  ordinaryContractProfileVersion,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, ContractPlace } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];

const issuer: ContractPlace = { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const granary: ContractPlace = { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
const rewardQ = '25000000';

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
  const location = { kind: 'AT' as const, ...place };
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
  readonly issuer: string;
  readonly subject: string;
}) {
  if (!database) throw new Error('company test database missing');
  const lifecycle = input.state.economy.lifecycle;
  await database
    .insertInto('identity_accounts')
    .values({ id: input.accountId, issuer: input.issuer, subject: input.subject })
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
    .select(['state'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const state = atPlace(readCompanyCombatAggregateState(previous.state), place);
  await database
    .updateTable('company_snapshots')
    .set({ state })
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
  expect(response.statusCode).toBe(200);
  return response.json() as {
    readonly contracts: readonly {
      readonly instanceId: string;
      readonly revision: string;
      readonly state: string;
      readonly steps: readonly {
        readonly stepId: string;
        readonly doneByYou: boolean;
        readonly findingTextKey?: string;
      }[];
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
  const response = await app.inject({
    method: 'POST',
    url: '/contracts/ordinary/commands',
    headers: { cookie: `warwrit_session=${sessionToken}` },
    payload: {
      schemaVersion: 1,
      commandId: input.commandId,
      instanceId: 'ci.m1.light-sack.01',
      expectedRevision: input.expectedRevision,
      type: input.type,
      stepId: input.stepId,
    },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as {
    readonly ok: boolean;
    readonly code?: string;
    readonly commandId: string;
    readonly revision?: string;
    readonly rewardQ: string | null;
  };
}

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('light-sack ordinary contract (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined).each([
    {
      profileId: 'ct.m1.light-sack.measure-error.v1',
      clueTextKey: 'contract.ci.m1.light-sack.01.result.light-sack.measure-clue',
      reportRevision: '2',
    },
    {
      profileId: 'ct.m1.light-sack.damp-rye.v1',
      clueTextKey: 'contract.ci.m1.light-sack.01.result.light-sack.dry-grain-clue',
      reportRevision: '3',
    },
  ])('persists the $profileId branch, clues, and one 25-crown payment', async (scenario) => {
    if (!database) throw new Error('company test database missing');
    const worldId = randomUUID();
    const ownerId = randomUUID();
    const ownerCompanyId = randomUUID();
    const ownerSession = randomUUID();
    const otherId = randomUUID();
    const otherCompanyId = randomUUID();
    const otherSession = randomUUID();
    const profile = ordinaryContractProfileVersion('ci.m1.light-sack.01', scenario.profileId);
    if (!profile) throw new Error('light-sack test profile missing');
    const app = createApp(worldId);
    apps.push(app);

    await seedCompany({
      worldId,
      companyId: ownerCompanyId,
      accountId: ownerId,
      sessionToken: ownerSession,
      state: aggregateAt(worldId, ownerCompanyId, 'owner', issuer),
      issuer: `light-sack-${worldId}`,
      subject: 'owner',
    });
    await seedCompany({
      worldId,
      companyId: otherCompanyId,
      accountId: otherId,
      sessionToken: otherSession,
      state: aggregateAt(worldId, otherCompanyId, 'other', issuer),
      issuer: `light-sack-${worldId}`,
      subject: 'other',
    });
    await database
      .insertInto('world_campaign_clocks')
      .values({ world_id: worldId, epoch_ms: String(Date.now()), starting_tick: '1000' })
      .execute();
    await database
      .insertInto('ordinary_contracts')
      .values({
        world_id: worldId,
        instance_id: profile.instanceId,
        profile_id: profile.definitionId,
        revision: '0',
        wallet_id: profile.walletId,
        wallet_q: profile.genesisWalletQ,
        state: ordinaryContractGenesis(profile),
      })
      .execute();

    const initialBoard = await getBoard(app, ownerSession);
    const initialOffer = initialBoard.contracts.find(
      (contract) => contract.instanceId === profile.instanceId,
    );
    expect(initialOffer?.state).toBe('OFFERED');
    expect(initialOffer?.steps.every((step) => step.findingTextKey === undefined)).toBe(true);
    const accepted = await command(app, ownerSession, {
      commandId: randomUUID(),
      expectedRevision: '0',
      type: 'ACCEPT',
      stepId: null,
    });
    expect(accepted).toMatchObject({ ok: true, revision: '1', rewardQ: null });

    await setCompanyPlace(worldId, ownerCompanyId, granary);
    const inspection = await command(app, ownerSession, {
      commandId: randomUUID(),
      expectedRevision: '1',
      type: 'STEP',
      stepId: 'inspect-granary',
    });
    expect(inspection).toMatchObject({ ok: true, revision: '2', rewardQ: null });
    const clueBoard = await getBoard(app, ownerSession);
    expect(
      clueBoard.contracts
        .find((contract) => contract.instanceId === profile.instanceId)
        ?.steps.find((step) => step.stepId === 'inspect-granary'),
    ).toMatchObject({ doneByYou: true, findingTextKey: scenario.clueTextKey });
    const foreignBoard = await getBoard(app, otherSession);
    expect(
      foreignBoard.contracts
        .find((contract) => contract.instanceId === profile.instanceId)
        ?.steps.every((step) => step.findingTextKey === undefined),
    ).toBe(true);

    if (profile.definitionId === 'ct.m1.light-sack.damp-rye.v1') {
      await setCompanyPlace(worldId, ownerCompanyId, issuer);
      const wetSacks = await command(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '2',
        type: 'STEP',
        stepId: 'ask-gate',
      });
      expect(wetSacks).toMatchObject({ ok: true, revision: '3', rewardQ: null });
      const dampBoard = await getBoard(app, ownerSession);
      expect(
        dampBoard.contracts
          .find((contract) => contract.instanceId === profile.instanceId)
          ?.steps.find((step) => step.stepId === 'ask-gate'),
      ).toMatchObject({
        doneByYou: true,
        findingTextKey: 'contract.ci.m1.light-sack.01.result.light-sack.wet-sacks-clue',
      });
    } else {
      expect(scenario.reportRevision).toBe('2');
      await setCompanyPlace(worldId, ownerCompanyId, issuer);
    }

    const report = await command(app, ownerSession, {
      commandId: randomUUID(),
      expectedRevision: scenario.reportRevision,
      type: 'STEP',
      stepId: 'report',
    });
    expect(report).toMatchObject({ ok: true, rewardQ });
    const paid = await database
      .selectFrom('ordinary_contracts')
      .select(['wallet_q', 'state'])
      .where('world_id', '=', worldId)
      .where('instance_id', '=', profile.instanceId)
      .executeTakeFirstOrThrow();
    expect(paid.wallet_q).toBe('55000000');
    expect((paid.state as { outcome?: { kind?: string } }).outcome?.kind).toBe('SUCCESS');
    const paidSnapshot = await database
      .selectFrom('company_snapshots')
      .select('state')
      .where('world_id', '=', worldId)
      .where('company_id', '=', ownerCompanyId)
      .executeTakeFirstOrThrow();
    const cashAfterReport = (
      readCompanyCombatAggregateState(paidSnapshot.state).economy.finance.wallets.find(
        (wallet) => wallet.walletId === 'purse',
      )!.cashQ as unknown as string
    ).toString();

    const reportCommandId = (report.commandId as string) || '';
    expect(reportCommandId).not.toBe('');
    await app.close();
    apps.splice(apps.indexOf(app), 1);
    const reloadedApp = createApp(worldId);
    apps.push(reloadedApp);
    const reloaded = await getBoard(reloadedApp, ownerSession);
    expect(
      reloaded.contracts.find((contract) => contract.instanceId === profile.instanceId)?.state,
    ).toBe('COMPLETED');
    const retried = await command(reloadedApp, ownerSession, {
      commandId: reportCommandId,
      expectedRevision: scenario.reportRevision,
      type: 'STEP',
      stepId: 'report',
    });
    expect(retried).toEqual(report);
    const afterRetry = await database
      .selectFrom('ordinary_contracts')
      .select('wallet_q')
      .where('world_id', '=', worldId)
      .where('instance_id', '=', profile.instanceId)
      .executeTakeFirstOrThrow();
    expect(afterRetry.wallet_q).toBe(paid.wallet_q);
    const retriedSnapshot = await database
      .selectFrom('company_snapshots')
      .select('state')
      .where('world_id', '=', worldId)
      .where('company_id', '=', ownerCompanyId)
      .executeTakeFirstOrThrow();
    expect(
      (
        readCompanyCombatAggregateState(retriedSnapshot.state).economy.finance.wallets.find(
          (wallet) => wallet.walletId === 'purse',
        )!.cashQ as unknown as string
      ).toString(),
    ).toBe(cashAfterReport);
  });
});

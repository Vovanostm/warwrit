import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, ContractPlace } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';
import { PAINTED_GAME_WORLD_ID } from '../world/map-context.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];
const issuer: ContractPlace = { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
const objective: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
const whoseWolvesId = 'ci.m1.whose-wolves.01';
const ordinaryOfferId = 'ci.m1.mill-worker.01';

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
    .insertInto('world_campaign_clocks')
    .values({
      world_id: input.worldId,
      epoch_ms: String(Date.now()),
      starting_tick: lifecycle.campaignTick,
    })
    .onConflict((conflict) => conflict.column('world_id').doNothing())
    .execute();
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

async function huntRead(app: ReturnType<typeof buildApp>, sessionToken: string) {
  const response = await app.inject({
    method: 'GET',
    url: `/contracts/first-hunt?instanceId=${whoseWolvesId}`,
    headers: { cookie: `warwrit_session=${sessionToken}` },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as {
    readonly publicRevision: string;
    readonly contract: {
      readonly termsDigest: string;
      readonly whoseWolves?: {
        readonly findings: readonly string[];
        readonly outcome?: string;
      };
    } | null;
  };
}

async function huntCommand(
  app: ReturnType<typeof buildApp>,
  sessionToken: string,
  command: {
    readonly commandId: string;
    readonly expectedPublicRevision: string;
    readonly type: 'ACCEPT' | 'OBSERVE' | 'REPORT_SPARED';
    readonly findingId?: 'bones-and-fish-guts' | 'efim-feeds-the-pack';
    readonly termsDigest?: string;
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
      commandId: command.commandId,
      expectedPublicRevision: command.expectedPublicRevision,
      type: command.type,
      payload: {
        instanceId: whoseWolvesId,
        ...(command.type === 'OBSERVE' ? { findingId: command.findingId } : {}),
        ...(command.type === 'ACCEPT' ? { termsDigest: command.termsDigest } : {}),
      },
    },
  });
  return response;
}

async function ordinaryBoard(app: ReturnType<typeof buildApp>, sessionToken: string) {
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
      readonly canAccept: boolean;
      readonly issuerRefusedOffer?: true;
    }[];
  };
}

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('whose-wolves ordinary issuer refusal (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'refuses Kondrat’s next ordinary offer once, replays exactly, and keeps the refusal private',
    async () => {
      if (!database) throw new Error('company test database missing');
      const worldId = PAINTED_GAME_WORLD_ID;
      const ownerId = randomUUID();
      const ownerCompanyId = randomUUID();
      const ownerSession = randomUUID();
      const otherId = randomUUID();
      const otherCompanyId = randomUUID();
      const otherSession = randomUUID();
      const ownerIssuer = `whose-wolves-owner-${ownerId}`;
      const otherIssuer = `whose-wolves-other-${otherId}`;
      await seedCompany({
        worldId,
        companyId: ownerCompanyId,
        accountId: ownerId,
        sessionToken: ownerSession,
        state: aggregateAt(worldId, ownerCompanyId, 'ww-owner', issuer),
        issuer: ownerIssuer,
        subject: ownerId,
      });
      await seedCompany({
        worldId,
        companyId: otherCompanyId,
        accountId: otherId,
        sessionToken: otherSession,
        state: aggregateAt(worldId, otherCompanyId, 'ww-other', issuer),
        issuer: otherIssuer,
        subject: otherId,
      });
      const app = createApp(worldId);
      apps.push(app);

      let read = await huntRead(app, ownerSession);
      expect(read.contract).not.toBeNull();
      const accepted = await huntCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedPublicRevision: read.publicRevision,
        type: 'ACCEPT',
        termsDigest: read.contract!.termsDigest,
      });
      expect(accepted.statusCode).toBe(200);

      await setCompanyPlace(worldId, ownerCompanyId, objective);
      read = await huntRead(app, ownerSession);
      const wrongOrder = await huntCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedPublicRevision: read.publicRevision,
        type: 'OBSERVE',
        findingId: 'efim-feeds-the-pack',
      });
      expect(wrongOrder.statusCode).toBe(409);

      read = await huntRead(app, ownerSession);
      const bones = await huntCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedPublicRevision: read.publicRevision,
        type: 'OBSERVE',
        findingId: 'bones-and-fish-guts',
      });
      expect(bones.statusCode).toBe(200);
      read = await huntRead(app, ownerSession);
      const efim = await huntCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedPublicRevision: read.publicRevision,
        type: 'OBSERVE',
        findingId: 'efim-feeds-the-pack',
      });
      expect(efim.statusCode).toBe(200);

      await setCompanyPlace(worldId, ownerCompanyId, issuer);
      read = await huntRead(app, ownerSession);
      const reportCommand = {
        commandId: randomUUID(),
        expectedPublicRevision: read.publicRevision,
        type: 'REPORT_SPARED' as const,
      };
      const report = await huntCommand(app, ownerSession, reportCommand);
      expect(report.statusCode).toBe(200);
      const reportReplay = await huntCommand(app, ownerSession, reportCommand);
      expect(reportReplay.statusCode).toBe(200);
      expect(reportReplay.json()).toEqual(report.json());
      const ownerHunt = await huntRead(app, ownerSession);
      expect(ownerHunt.contract?.whoseWolves).toMatchObject({
        findings: ['bones-and-fish-guts', 'efim-feeds-the-pack'],
        outcome: 'PACK_SPARED_AND_EXPOSED',
      });
      const otherHunt = await huntRead(app, otherSession);
      expect(otherHunt.contract?.whoseWolves?.findings).toEqual([]);
      expect(otherHunt.contract?.whoseWolves?.outcome).toBe('PACK_SPARED_AND_EXPOSED');

      const pending = await database
        .selectFrom('world_hunt_states')
        .select(['quest_state'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', whoseWolvesId)
        .executeTakeFirstOrThrow();
      const pendingCompany = (
        pending.quest_state as {
          readonly companies: readonly {
            readonly companyId: string;
            readonly refusalPending: boolean;
          }[];
        }
      ).companies.find((entry) => entry.companyId === ownerCompanyId);
      expect(pendingCompany?.refusalPending).toBe(true);

      const ownerBefore = await ordinaryBoard(app, ownerSession);
      const ownerOffer = ownerBefore.contracts.find(
        (contract) => contract.instanceId === ordinaryOfferId,
      )!;
      expect(ownerOffer.canAccept).toBe(true);
      const walletBefore = await database
        .selectFrom('ordinary_contracts')
        .select('wallet_q')
        .where('world_id', '=', worldId)
        .where('instance_id', '=', ordinaryOfferId)
        .executeTakeFirstOrThrow();
      const acceptBody = {
        schemaVersion: 1,
        commandId: randomUUID(),
        instanceId: ordinaryOfferId,
        expectedRevision: ownerOffer.revision,
        type: 'ACCEPT',
        stepId: null,
      };
      const accept = await app.inject({
        method: 'POST',
        url: '/contracts/ordinary/commands',
        headers: {
          cookie: `warwrit_session=${ownerSession}`,
          origin: 'http://127.0.0.1:3107',
        },
        payload: acceptBody,
      });
      expect(accept.statusCode).toBe(200);
      expect(accept.json()).toMatchObject({ ok: true, rewardQ: null });
      const replay = await app.inject({
        method: 'POST',
        url: '/contracts/ordinary/commands',
        headers: {
          cookie: `warwrit_session=${ownerSession}`,
          origin: 'http://127.0.0.1:3107',
        },
        payload: acceptBody,
      });
      expect(replay.statusCode).toBe(200);
      expect(replay.json()).toEqual(accept.json());
      const refusalReceipts = await database
        .selectFrom('ordinary_contract_receipts')
        .select('command_id')
        .where('world_id', '=', worldId)
        .where('company_id', '=', ownerCompanyId)
        .where('command_id', '=', acceptBody.commandId)
        .execute();
      expect(refusalReceipts).toHaveLength(1);

      const ownerAfter = await ordinaryBoard(app, ownerSession);
      const refusedOffer = ownerAfter.contracts.find(
        (contract) => contract.instanceId === ordinaryOfferId,
      )!;
      expect(refusedOffer.canAccept).toBe(false);
      expect(refusedOffer.issuerRefusedOffer).toBe(true);
      const deniedRetry = await app.inject({
        method: 'POST',
        url: '/contracts/ordinary/commands',
        headers: {
          cookie: `warwrit_session=${ownerSession}`,
          origin: 'http://127.0.0.1:3107',
        },
        payload: { ...acceptBody, commandId: randomUUID() },
      });
      expect(deniedRetry.statusCode).toBe(409);
      expect(deniedRetry.json()).toMatchObject({ ok: false, code: 'NOT_AVAILABLE' });

      const otherBoard = await ordinaryBoard(app, otherSession);
      const otherOffer = otherBoard.contracts.find(
        (contract) => contract.instanceId === ordinaryOfferId,
      )!;
      expect(otherOffer.canAccept).toBe(true);
      expect(otherOffer).not.toHaveProperty('issuerRefusedOffer');

      const state = await database
        .selectFrom('ordinary_contracts')
        .select(['state', 'wallet_q'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', ordinaryOfferId)
        .executeTakeFirstOrThrow();
      expect((state.state as { readonly ownerCompanyId: string | null }).ownerCompanyId).toBeNull();
      const persisted = await database
        .selectFrom('world_hunt_states')
        .select(['quest_state'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', whoseWolvesId)
        .executeTakeFirstOrThrow();
      const persistedCompany = (
        persisted.quest_state as {
          readonly companies: readonly {
            readonly companyId: string;
            readonly deniedOfferInstanceId?: string;
          }[];
        }
      ).companies.find((entry) => entry.companyId === ownerCompanyId);
      expect(persistedCompany?.deniedOfferInstanceId).toBe(ordinaryOfferId);
      expect(state.wallet_q).toBe(walletBefore.wallet_q);
    },
  );
});

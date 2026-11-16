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
const testRuns: { readonly worldId: string; readonly accountIds: readonly string[] }[] = [];
const instanceId = 'ci.m1.missing-herbs.01';
const issuer: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
const issuerLocation: LocationRef = { kind: 'AT', ...issuer };

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

function aggregateAt(worldId: string, companyId: string, prefix: string) {
  const fixture = createCompanyCombatAggregateFixture().state;
  const replaced = JSON.parse(
    JSON.stringify(fixture, (_key, value: unknown) => {
      if (value === 'world') return worldId;
      if (value === 'a-company') return companyId;
      if (typeof value === 'string' && value.startsWith('a-')) return `${prefix}-${value.slice(2)}`;
      return value;
    }),
  ) as CompanyCombatAggregateState;
  const { lifecycle, finance, physical } = replaced.economy;
  return readCompanyCombatAggregateState({
    ...replaced,
    economy: {
      ...replaced.economy,
      lifecycle: {
        ...lifecycle,
        parties: lifecycle.parties.map((party) => ({ ...party, location: issuerLocation })),
        characters: lifecycle.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location: issuerLocation },
        })),
      },
      finance: {
        ...finance,
        wallets: finance.wallets.map((wallet) =>
          wallet.owner.kind === 'COMPANY'
            ? { ...wallet, location: issuerLocation, cashQ: '50000000' }
            : { ...wallet, location: issuerLocation },
        ),
      },
      physical: physical
        ? {
            ...physical,
            containers: physical.containers.map((container) => ({
              ...container,
              location: issuerLocation,
            })),
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
  readonly subject: string;
}) {
  if (!database) throw new Error('company test database missing');
  const lifecycle = input.state.economy.lifecycle;
  await database
    .insertInto('identity_accounts')
    .values({
      id: input.accountId,
      issuer: `missing-herbs-${input.worldId}`,
      subject: input.subject,
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
      readonly state: 'OFFERED' | 'ACTIVE' | 'COMPLETED';
      readonly canAccept: boolean;
      readonly terminalPayout?: 'PAID' | 'NO_PAYOUT';
      readonly steps: readonly {
        readonly stepId: string;
        readonly doneByYou: boolean;
        readonly blocker: string | null;
        readonly findingTextKey?: string;
      }[];
    }[];
  };
}

async function contractCommand(
  app: ReturnType<typeof buildApp>,
  sessionToken: string,
  input: {
    readonly commandId: string;
    readonly expectedRevision: string;
    readonly type: 'ACCEPT' | 'STEP';
    readonly stepId: string | null;
    readonly expectedStatus?: number;
  },
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
      commandId: input.commandId,
      instanceId,
      expectedRevision: input.expectedRevision,
      type: input.type,
      stepId: input.stepId,
    },
  });
  const result = response.json() as {
    readonly ok: boolean;
    readonly code?: string;
    readonly commandId: string;
    readonly revision?: string;
    readonly rewardQ: string | null;
  };
  expect(response.statusCode, JSON.stringify(result)).toBe(input.expectedStatus ?? 200);
  return result;
}

async function savedContract(worldId: string) {
  if (!database) throw new Error('company test database missing');
  const profile = ordinaryContractProfile(instanceId);
  if (!profile) throw new Error('Missing-herbs profile is missing');
  const row = await database
    .selectFrom('ordinary_contracts')
    .select(['profile_id', 'wallet_q', 'state'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', instanceId)
    .executeTakeFirstOrThrow();
  return {
    row,
    state: readOrdinaryContractState(profile, row.state, row.profile_id),
  };
}

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  if (database) {
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
        await transaction
          .deleteFrom('mill_descent_kit_stock')
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
    await database.destroy();
  }
});

describe('missing herbs ordinary contract (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'requires actual daylight for the trail, reports both clues once and keeps findings private',
    async () => {
      if (!database) throw new Error('company test database missing');
      const worldId = randomUUID();
      const ownerId = randomUUID();
      const ownerCompanyId = randomUUID();
      const ownerSession = randomUUID();
      const otherId = randomUUID();
      const otherCompanyId = randomUUID();
      const otherSession = randomUUID();
      testRuns.push({ worldId, accountIds: [ownerId, otherId] });

      const app = createApp(worldId);
      apps.push(app);
      await seedCompany({
        worldId,
        companyId: ownerCompanyId,
        accountId: ownerId,
        sessionToken: ownerSession,
        state: aggregateAt(worldId, ownerCompanyId, 'herbs-owner'),
        subject: 'owner',
      });
      await seedCompany({
        worldId,
        companyId: otherCompanyId,
        accountId: otherId,
        sessionToken: otherSession,
        state: aggregateAt(worldId, otherCompanyId, 'herbs-other'),
        subject: 'other',
      });

      // Seed night and a later QA offset to exercise the server's clock reader.
      // The client sends no time or daylight flag.
      await database
        .insertInto('world_campaign_clocks')
        .values({
          world_id: worldId,
          epoch_ms: String(Date.now() - 650_000),
          starting_tick: '1000',
          qa_offset_ms: '0',
        })
        .execute();

      const initialBoard = await getBoard(app, ownerSession);
      const initial = initialBoard.contracts.find((contract) => contract.instanceId === instanceId);
      expect(initial).toMatchObject({ state: 'OFFERED', canAccept: true });
      const accepted = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: initial!.revision,
        type: 'ACCEPT',
        stepId: null,
      });
      expect(accepted).toMatchObject({ ok: true, revision: '1', rewardQ: null });

      const recorded = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'stock-record',
      });
      expect(recorded).toMatchObject({ ok: true, revision: '2', rewardQ: null });

      const nightBoard = await getBoard(app, ownerSession);
      const nightContract = nightBoard.contracts.find(
        (contract) => contract.instanceId === instanceId,
      )!;
      expect(nightContract.steps.find((step) => step.stepId === 'stock-record')?.doneByYou).toBe(
        true,
      );
      expect(nightContract.steps.find((step) => step.stepId === 'inspect-green')?.blocker).toBe(
        'CONDITION_NOT_MET',
      );
      const incompleteReport = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '2',
        type: 'STEP',
        stepId: 'report',
        expectedStatus: 409,
      });
      expect(incompleteReport).toMatchObject({ ok: false, code: 'MISSING_EVIDENCE' });
      const beforeNightRefusal = await savedContract(worldId);
      expect(beforeNightRefusal.row.wallet_q).toBe('80000000');
      const denied = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '2',
        type: 'STEP',
        stepId: 'inspect-green',
        expectedStatus: 409,
      });
      expect(denied).toMatchObject({ ok: false, code: 'CONDITION_NOT_MET' });
      const afterNightRefusal = await savedContract(worldId);
      expect(afterNightRefusal.state).toEqual(beforeNightRefusal.state);
      expect(afterNightRefusal.row.wallet_q).toBe(beforeNightRefusal.row.wallet_q);
      expect(afterNightRefusal.state.facts.map((fact) => fact.slotId)).toEqual([
        'missing-herbs-stock-record',
      ]);

      await database
        .updateTable('world_campaign_clocks')
        .set({ qa_offset_ms: '350000' })
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const dayBoard = await getBoard(app, ownerSession);
      const dayContract = dayBoard.contracts.find(
        (contract) => contract.instanceId === instanceId,
      )!;
      expect(dayContract.steps.find((step) => step.stepId === 'inspect-green')?.blocker).toBeNull();

      const inspected = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '2',
        type: 'STEP',
        stepId: 'inspect-green',
      });
      expect(inspected).toMatchObject({ ok: true, revision: '3', rewardQ: null });
      expect((await savedContract(worldId)).state.facts.map((fact) => fact.slotId).sort()).toEqual([
        'missing-herbs-stock-record',
        'missing-herbs-trail-observation',
      ]);

      const reportCommandId = randomUUID();
      const report = await contractCommand(app, ownerSession, {
        commandId: reportCommandId,
        expectedRevision: '3',
        type: 'STEP',
        stepId: 'report',
      });
      expect(report).toMatchObject({ ok: true, revision: '4', rewardQ: '40000000' });
      const paid = await savedContract(worldId);
      expect(paid.row.wallet_q).toBe('40000000');
      expect(paid.state.outcome).toMatchObject({ kind: 'SUCCESS', companyId: ownerCompanyId });
      expect(paid.state.facts.map((fact) => fact.slotId).sort()).toEqual([
        'missing-herbs-report',
        'missing-herbs-stock-record',
        'missing-herbs-trail-observation',
      ]);
      const paidCompanyRow = await database
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', ownerCompanyId)
        .executeTakeFirstOrThrow();
      const paidCompany = readCompanyCombatAggregateState(paidCompanyRow.state);
      expect(
        paidCompany.economy.finance.movements.some(
          (movement) =>
            movement.movementId.startsWith('contract-reward:') && movement.amountQ === '40000000',
        ),
      ).toBe(true);

      await app.close();
      apps.splice(apps.indexOf(app), 1);
      const reloadedApp = createApp(worldId);
      apps.push(reloadedApp);
      const reloadedBoard = await getBoard(reloadedApp, ownerSession);
      expect(
        reloadedBoard.contracts.find((contract) => contract.instanceId === instanceId),
      ).toMatchObject({ state: 'COMPLETED', terminalPayout: 'PAID' });
      const replay = await contractCommand(reloadedApp, ownerSession, {
        commandId: reportCommandId,
        expectedRevision: '3',
        type: 'STEP',
        stepId: 'report',
      });
      expect(replay).toEqual(report);
      expect((await savedContract(worldId)).row.wallet_q).toBe(paid.row.wallet_q);
      const replayedCompanyRow = await database
        .selectFrom('company_snapshots')
        .select('state')
        .where('world_id', '=', worldId)
        .where('company_id', '=', ownerCompanyId)
        .executeTakeFirstOrThrow();
      const replayedCompany = readCompanyCombatAggregateState(replayedCompanyRow.state);
      expect(replayedCompany.economy.finance.movements).toEqual(
        paidCompany.economy.finance.movements,
      );

      const foreign = (await getBoard(reloadedApp, otherSession)).contracts.find(
        (contract) => contract.instanceId === instanceId,
      )!;
      expect(foreign).toMatchObject({ state: 'COMPLETED', terminalPayout: 'PAID' });
      expect(
        foreign.steps.every((step) => !step.doneByYou && step.findingTextKey === undefined),
      ).toBe(true);
    },
  );
});

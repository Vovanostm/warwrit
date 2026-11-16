import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractTerms,
  readCompanyCombatAggregateState,
  readOrdinaryContractState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, ContractPlace, LocationRef } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];
const testRuns: { readonly worldId: string; readonly accountIds: readonly string[] }[] = [];

const roadsideInstanceId = 'ci.m1.man-by-road.01';
const foulWellInstanceId = 'ci.m1.foul-well.01';
const issuer: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
const tickDurationMs = 21_600;

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

function atLocation(state: CompanyCombatAggregateState, location: LocationRef) {
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
      finance:
        location.kind === 'AT'
          ? { ...finance, wallets: finance.wallets.map((wallet) => ({ ...wallet, location })) }
          : finance,
      physical: physical
        ? {
            ...physical,
            containers: physical.containers.map((container) => ({ ...container, location })),
          }
        : physical,
    },
  });
}

function aggregateAt(worldId: string, companyId: string, prefix: string, location: LocationRef) {
  const fixture = createCompanyCombatAggregateFixture().state;
  const replaced = JSON.parse(
    JSON.stringify(fixture, (_key, value: unknown) => {
      if (value === 'world') return worldId;
      if (value === 'a-company') return companyId;
      if (typeof value === 'string' && value.startsWith('a-')) return `${prefix}-${value.slice(2)}`;
      return value;
    }),
  ) as CompanyCombatAggregateState;
  return atLocation(replaced, location);
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

async function setCompanyLocation(worldId: string, companyId: string, location: LocationRef) {
  if (!database) throw new Error('company test database missing');
  const previous = await database
    .selectFrom('company_snapshots')
    .select(['state'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const state = atLocation(readCompanyCombatAggregateState(previous.state), location);
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
      readonly state: 'OFFERED' | 'ACTIVE' | 'COMPLETED';
      readonly canAccept: boolean;
      readonly terminalPayout?: 'PAID' | 'NO_PAYOUT';
      readonly yourCustody: readonly string[];
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
      instanceId: roadsideInstanceId,
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

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  if (database) {
    for (const { worldId, accountIds } of testRuns) {
      await database
        .deleteFrom('ordinary_contract_receipts')
        .where('world_id', '=', worldId)
        .execute();
      await database.deleteFrom('ordinary_contracts').where('world_id', '=', worldId).execute();
      await database.deleteFrom('world_campaign_clocks').where('world_id', '=', worldId).execute();
      await database.deleteFrom('company_account_owners').where('world_id', '=', worldId).execute();
      await database.deleteFrom('company_snapshots').where('world_id', '=', worldId).execute();
      await database
        .deleteFrom('identity_sessions')
        .where('account_id', 'in', accountIds)
        .execute();
      await database.deleteFrom('identity_accounts').where('id', 'in', accountIds).execute();
    }
    await database.destroy();
  }
});

describe('roadside rescue after Agafya exile (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'keeps an accepted living rescue in custody and delivers without payment after exile matures',
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

      const roadside = ordinaryContractProfile(roadsideInstanceId);
      const foulWell = ordinaryContractProfile(foulWellInstanceId);
      if (!roadside || !foulWell) throw new Error('rescue or foul-well profile missing');
      const roadsideTarget = roadside.steps.find(
        (step) => step.stepId === 'find-sidor',
      )?.terrainTarget;
      if (!roadsideTarget) throw new Error('roadside terrain target missing');
      const issuerLocation: LocationRef = { kind: 'AT', ...issuer };
      const targetLocation: LocationRef = {
        kind: 'TERRAIN',
        regionVersion: roadsideTarget.mapEdition,
        q: String(roadsideTarget.xFp * 65_536),
        r: String(roadsideTarget.zFp * 65_536),
      };
      const app = createApp(worldId);
      apps.push(app);

      await seedCompany({
        worldId,
        companyId: ownerCompanyId,
        accountId: ownerId,
        sessionToken: ownerSession,
        state: aggregateAt(worldId, ownerCompanyId, 'sidor-owner', issuerLocation),
        issuer: `man-by-road-${worldId}`,
        subject: 'owner',
      });
      await seedCompany({
        worldId,
        companyId: otherCompanyId,
        accountId: otherId,
        sessionToken: otherSession,
        state: aggregateAt(worldId, otherCompanyId, 'sidor-other', issuerLocation),
        issuer: `man-by-road-${worldId}`,
        subject: 'other',
      });
      await database
        .insertInto('world_campaign_clocks')
        .values({
          world_id: worldId,
          epoch_ms: String(Date.now()),
          starting_tick: '1000',
          qa_offset_ms: '0',
        })
        .execute();

      const initialBoard = await getBoard(app, ownerSession);
      const initialOffer = initialBoard.contracts.find(
        (contract) => contract.instanceId === roadsideInstanceId,
      );
      expect(initialOffer).toMatchObject({ state: 'OFFERED', canAccept: true });
      const accepted = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: initialOffer!.revision,
        type: 'ACCEPT',
        stepId: null,
      });
      expect(accepted).toMatchObject({ ok: true, revision: '1', rewardQ: null });

      await setCompanyLocation(worldId, ownerCompanyId, targetLocation);
      const found = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '1',
        type: 'STEP',
        stepId: 'find-sidor',
      });
      expect(found).toMatchObject({ ok: true, revision: '2', rewardQ: null });
      const walking = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '2',
        type: 'STEP',
        stepId: 'walk-with-stops',
      });
      expect(walking).toMatchObject({ ok: true, revision: '3', rewardQ: null });

      const held = await database
        .selectFrom('ordinary_contracts')
        .select(['state'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', roadsideInstanceId)
        .executeTakeFirstOrThrow();
      const holdingState = readOrdinaryContractState(roadside, held.state, roadside.definitionId);
      expect(holdingState.custody).toEqual([
        { personId: 'person.sidor', companyId: ownerCompanyId, travelMode: 'ON_FOOT' },
      ]);
      const located = await database
        .selectFrom('company_snapshots')
        .select(['state'])
        .where('world_id', '=', worldId)
        .where('company_id', '=', ownerCompanyId)
        .executeTakeFirstOrThrow();
      expect(
        readCompanyCombatAggregateState(located.state).economy.lifecycle.parties[0]?.location,
      ).toEqual(targetLocation);

      const restStarted = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '3',
        type: 'STEP',
        stepId: 'rest-with-sidor',
      });
      expect(restStarted).toMatchObject({ ok: true, revision: '4', rewardQ: null });
      await database
        .updateTable('world_campaign_clocks')
        .set({ qa_offset_ms: String(300 * tickDurationMs) })
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const restComplete = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '4',
        type: 'STEP',
        stepId: 'continue-after-rest',
      });
      expect(restComplete).toMatchObject({ ok: true, revision: '5', rewardQ: null });

      const exileAtTick = '1300';
      const foulWellSourceId = 'sidor-integration-foul-well-accusation';
      const foulWellState = readOrdinaryContractState(foulWell, {
        ...ordinaryContractGenesis(foulWell),
        revision: '1',
        ownerCompanyId,
        acceptedTerms: ordinaryContractTerms(foulWell),
        facts: [
          {
            slotId: 'foul-well-aghafya-accused',
            companyId: ownerCompanyId,
            sourceEventId: foulWellSourceId,
            atTick: exileAtTick,
          },
        ],
        outcome: {
          kind: 'SUCCESS',
          companyId: ownerCompanyId,
          sourceEventId: foulWellSourceId,
          atTick: exileAtTick,
        },
      });
      await database
        .updateTable('ordinary_contracts')
        .set({ revision: foulWellState.revision, state: foulWellState })
        .where('world_id', '=', worldId)
        .where('instance_id', '=', foulWellInstanceId)
        .executeTakeFirstOrThrow();
      await database
        .updateTable('world_campaign_clocks')
        .set({ qa_offset_ms: String(7_300 * tickDurationMs) })
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();

      await setCompanyLocation(worldId, ownerCompanyId, issuerLocation);
      const exiledBoard = await getBoard(app, ownerSession);
      const activeRescue = exiledBoard.contracts.find(
        (contract) => contract.instanceId === roadsideInstanceId,
      )!;
      expect(activeRescue).toMatchObject({ state: 'ACTIVE', canAccept: false });
      expect(activeRescue.yourCustody).toEqual(['person.sidor']);
      expect(activeRescue.steps.find((step) => step.stepId === 'arrive-on-foot')?.blocker).toBe(
        'CONDITION_NOT_MET',
      );
      expect(
        activeRescue.steps.find((step) => step.stepId === 'deliver-on-foot-after-exile')?.blocker,
      ).toBeNull();

      const deniedNormalDelivery = await contractCommand(app, ownerSession, {
        commandId: randomUUID(),
        expectedRevision: '5',
        type: 'STEP',
        stepId: 'arrive-on-foot',
        expectedStatus: 409,
      });
      expect(deniedNormalDelivery).toMatchObject({ ok: false, code: 'CONDITION_NOT_MET' });

      const deliveryCommandId = randomUUID();
      const delivery = await contractCommand(app, ownerSession, {
        commandId: deliveryCommandId,
        expectedRevision: '5',
        type: 'STEP',
        stepId: 'deliver-on-foot-after-exile',
      });
      expect(delivery).toMatchObject({ ok: true, revision: '6', rewardQ: null });
      const paidRescue = await database
        .selectFrom('ordinary_contracts')
        .select(['wallet_q', 'state'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', roadsideInstanceId)
        .executeTakeFirstOrThrow();
      expect(paidRescue.wallet_q).toBe('25000000');
      const completed = readOrdinaryContractState(
        roadside,
        paidRescue.state,
        roadside.definitionId,
      );
      expect(completed.outcome).toMatchObject({ kind: 'SUCCESS', companyId: ownerCompanyId });
      expect(completed.custody).toEqual([]);
      expect(completed.facts.some((fact) => fact.slotId === 'man-by-road-exile-delivery')).toBe(
        true,
      );

      await app.close();
      apps.splice(apps.indexOf(app), 1);
      const reloadedApp = createApp(worldId);
      apps.push(reloadedApp);
      const ownerAfterReload = await getBoard(reloadedApp, ownerSession);
      expect(
        ownerAfterReload.contracts.find((contract) => contract.instanceId === roadsideInstanceId),
      ).toMatchObject({ state: 'COMPLETED', terminalPayout: 'NO_PAYOUT', yourCustody: [] });
      const replay = await contractCommand(reloadedApp, ownerSession, {
        commandId: deliveryCommandId,
        expectedRevision: '5',
        type: 'STEP',
        stepId: 'deliver-on-foot-after-exile',
      });
      expect(replay).toEqual(delivery);
      const replayedRescue = await database
        .selectFrom('ordinary_contracts')
        .select(['wallet_q', 'state'])
        .where('world_id', '=', worldId)
        .where('instance_id', '=', roadsideInstanceId)
        .executeTakeFirstOrThrow();
      expect(replayedRescue.wallet_q).toBe(paidRescue.wallet_q);
      expect(
        readOrdinaryContractState(roadside, replayedRescue.state, roadside.definitionId).revision,
      ).toBe('6');

      const foreignRescue = (await getBoard(reloadedApp, otherSession)).contracts.find(
        (contract) => contract.instanceId === roadsideInstanceId,
      )!;
      expect(foreignRescue.state).toBe('COMPLETED');
      expect(foreignRescue.yourCustody).toEqual([]);
      expect(foreignRescue.steps.every((step) => step.findingTextKey === undefined)).toBe(true);
    },
  );
});

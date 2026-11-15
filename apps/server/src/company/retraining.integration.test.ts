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
import { afterAll, describe, expect, it } from 'vitest';

import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];
const location = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('local guard retraining (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'keeps the old perk through stop and interruption, completes once, and replays the exact start',
    async () => {
      if (!database || !connectionString) throw new Error('company test database missing');
      const worldId = randomUUID();
      const companyA = randomUUID();
      const companyB = randomUUID();
      const accountA = randomUUID();
      const accountB = randomUUID();
      const sessionA = randomUUID();
      const sessionB = randomUUID();
      const issuer = `retraining-test-${randomUUID()}`;
      const seededA = retrainingCompanyState(worldId, companyA);
      const seededB = retrainingCompanyState(worldId, companyB);
      const config = loadServerConfig({
        DATABASE_URL: connectionString,
        OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
        OIDC_CLIENT_ID: 'warwrit-local',
        OIDC_CLIENT_SECRET: 'local-only-secret',
        OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
        PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
        HOST: '127.0.0.1',
        PORT: '3107',
      });
      const app = buildApp({
        identity: { config: config.identity!, database },
        company: { database, worldId },
      });
      apps.push(app);

      await database
        .insertInto('identity_accounts')
        .values([
          { id: accountA, issuer, subject: 'retraining-a' },
          { id: accountB, issuer, subject: 'retraining-b' },
        ])
        .execute();
      await database
        .insertInto('identity_sessions')
        .values([
          {
            token_digest: createHash('sha256').update(sessionA).digest(),
            account_id: accountA,
            expires_at: new Date(Date.now() + 60_000),
          },
          {
            token_digest: createHash('sha256').update(sessionB).digest(),
            account_id: accountB,
            expires_at: new Date(Date.now() + 60_000),
          },
        ])
        .execute();
      await database
        .insertInto('world_campaign_clocks')
        .values({
          world_id: worldId,
          epoch_ms: String(Date.now()),
          starting_tick: '1000',
          qa_offset_ms: '0',
        })
        .execute();
      for (const [companyId, accountId, state] of [
        [companyA, accountA, seededA],
        [companyB, accountB, seededB],
      ] as const) {
        const lifecycle = state.economy.lifecycle;
        await database
          .insertInto('company_snapshots')
          .values({
            world_id: worldId,
            company_id: companyId,
            schema_version: COMPANY_SCHEMA_VERSION,
            ruleset_id: COMPANY_RULESET_ID,
            catalogue_version: COMPANY_CATALOGUE_VERSION,
            command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
            public_revision: lifecycle.knowledge.revision,
            canonical_revision: lifecycle.revision,
            state,
          })
          .execute();
        await database
          .insertInto('company_account_owners')
          .values({ world_id: worldId, company_id: companyId, account_id: accountId })
          .execute();
      }

      try {
        for (const type of ['StartLearning', 'StartRetraining', 'StopLearning']) {
          const invalid = await app.inject({
            method: 'POST',
            url: '/company/commands',
            headers: companyHeaders(sessionA, companyA),
            payload: {
              schemaVersion: 2,
              commandId: randomUUID(),
              expectedPublicRevision: seededA.economy.lifecycle.knowledge.revision,
              type,
              payload: {},
            },
          });
          expect(invalid.statusCode, invalid.body).toBe(400);
          expect(invalid.json()).toMatchObject({ code: 'INVALID_COMMAND' });
        }
        const afterInvalid = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyA)
          .executeTakeFirstOrThrow();
        expect(afterInvalid.state).toEqual(seededA);
        const offerA = await retrainingOffer(app, sessionA, companyA);
        expect(offerA.retraining.status).toBe('AVAILABLE');
        expect(offerA.retraining.learners).toContainEqual({
          characterId: 'a-leader',
          masteredPerkId: 'blades-25-a',
          replacementPerkId: 'blades-25-b',
        });
        const start = retrainingStart(sessionA, companyA, offerA.publicRevision);
        const accepted = await app.inject(start);
        expect(accepted.statusCode, accepted.body).toBe(200);
        const retry = await app.inject(start);
        expect(retry.statusCode, retry.body).toBe(200);
        expect(retry.json()).toEqual(accepted.json());

        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '21600000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const inProgress = await retrainingOffer(app, sessionA, companyA);
        expect(inProgress.retraining.status).toBe('IN_PROGRESS');
        expect(inProgress.retraining.progress).toMatchObject({
          acceptedTicks: '1000',
          chargedQ: '5000000',
          oldPerkId: 'blades-25-a',
          newPerkId: 'blades-25-b',
        });
        expect(await companyPerks(app, sessionA)).toContain('blades-25-a');
        expect(await companyPerks(app, sessionA)).not.toContain('blades-25-b');
        const revisionBeforeStop = await companyRevision(app, sessionA);
        const stop = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: companyHeaders(sessionA, companyA),
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: revisionBeforeStop,
            type: 'StopLearning',
            payload: { taskId: inProgress.retraining.progress!.taskId },
          },
        });
        expect(stop.statusCode, stop.body).toBe(200);
        expect(await companyPerks(app, sessionA)).toContain('blades-25-a');
        expect(await companyPerks(app, sessionA)).not.toContain('blades-25-b');

        const offerB = await retrainingOffer(app, sessionB, companyB);
        const secondStart = await app.inject(
          retrainingStart(sessionB, companyB, offerB.publicRevision),
        );
        expect(secondStart.statusCode, secondStart.body).toBe(200);
        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '43200000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const revisionB = (
          await app.inject({
            method: 'GET',
            url: '/company',
            headers: companyHeaders(sessionB, companyB),
          })
        ).json().company.revision as string;
        const interrupted = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: companyHeaders(sessionB, companyB),
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: revisionB,
            type: 'SetAssignment',
            payload: { characterId: 'a-leader', assignment: 'RECOVERY' },
          },
        });
        expect(interrupted.statusCode, interrupted.body).toBe(200);
        expect(await companyPerks(app, sessionB)).toContain('blades-25-a');
        expect(await companyPerks(app, sessionB)).not.toContain('blades-25-b');
        const afterInterruption = await retrainingOffer(app, sessionB, companyB);
        expect(afterInterruption.retraining.progress?.acceptedTicks).toBe('1000');

        const restartOffer = await retrainingOffer(app, sessionA, companyA);
        const restarted = await app.inject(
          retrainingStart(sessionA, companyA, restartOffer.publicRevision),
        );
        expect(restarted.statusCode, restarted.body).toBe(200);
        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '129600000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const complete = await retrainingOffer(app, sessionA, companyA);
        expect(complete.retraining.status).toBe('COMPLETE');
        expect(complete.retraining.progress).toMatchObject({
          acceptedTicks: '3000',
          remainingTicks: '0',
          chargedQ: '15000000',
        });
        expect(await companyPerks(app, sessionA)).toContain('blades-25-b');
        expect(await companyPerks(app, sessionA)).not.toContain('blades-25-a');
        const reverseOffer = await retrainingOffer(app, sessionA, companyA);
        expect(reverseOffer.retraining.learners).toContainEqual({
          characterId: 'a-leader',
          masteredPerkId: 'blades-25-b',
          replacementPerkId: 'blades-25-a',
        });
        const reverse = retrainingStart(sessionA, companyA, reverseOffer.publicRevision);
        reverse.payload.payload.oldPerkId = 'blades-25-b';
        reverse.payload.payload.newPerkId = 'blades-25-a';
        const reverseStarted = await app.inject(reverse);
        expect(reverseStarted.statusCode, reverseStarted.body).toBe(200);
        const reverseProgress = await retrainingOffer(app, sessionA, companyA);
        expect(reverseProgress.retraining.status).toBe('IN_PROGRESS');
        const reverseStopped = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: companyHeaders(sessionA, companyA),
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: reverseProgress.publicRevision,
            type: 'StopLearning',
            payload: { taskId: reverseProgress.retraining.progress!.taskId },
          },
        });
        expect(reverseStopped.statusCode, reverseStopped.body).toBe(200);
        const afterReverseStop = await retrainingOffer(app, sessionA, companyA);
        expect(afterReverseStop.retraining.progress?.taskId).toBe(
          reverseProgress.retraining.progress!.taskId,
        );
        expect(await companyPerks(app, sessionA)).toContain('blades-25-b');
        expect(await companyPerks(app, sessionA)).not.toContain('blades-25-a');
      } finally {
        await app.close();
      }
    },
  );
});

function retrainingCompanyState(worldId: string, companyId: string): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture().state;
  const replaced = JSON.parse(
    JSON.stringify(fixture)
      .replaceAll('"world"', JSON.stringify(worldId))
      .replaceAll('"a-company"', JSON.stringify(companyId)),
  ) as CompanyCombatAggregateState;
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
          ...(character.identity.characterId === 'a-leader'
            ? {
                perks: ['blades-25-a'],
                skills: {
                  ...character.skills,
                  blades: initialSkillProgress(25, 'a-leader-blades'),
                },
              }
            : {}),
        })),
      },
      finance: {
        ...replaced.economy.finance,
        wallets: replaced.economy.finance.wallets.map((wallet) => ({
          ...wallet,
          location,
          ...(wallet.walletId === 'purse' ? { cashQ: moneyQ('50000000') } : {}),
        })),
      },
      physical: {
        ...replaced.economy.physical!,
        containers: replaced.economy.physical!.containers.map((container) => ({
          ...container,
          location,
        })),
      },
    },
  });
}

function companyHeaders(session: string, companyId: string) {
  return {
    cookie: `warwrit_session=${session}`,
    origin: 'http://127.0.0.1:3107',
    [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
  };
}

function retrainingStart(session: string, companyId: string, expectedPublicRevision: string) {
  return {
    method: 'POST' as const,
    url: '/company/commands',
    headers: companyHeaders(session, companyId),
    payload: {
      schemaVersion: 2,
      commandId: randomUUID(),
      expectedPublicRevision,
      type: 'StartRetraining',
      payload: {
        courseId: 'retraining.kamenny-brod.blades-25',
        characterId: 'a-leader',
        oldPerkId: 'blades-25-a',
        newPerkId: 'blades-25-b',
      },
    },
  };
}

async function retrainingOffer(
  app: ReturnType<typeof buildApp>,
  session: string,
  companyId: string,
) {
  const response = await app.inject({
    method: 'GET',
    url: '/company/retraining/kamenny-brod',
    headers: companyHeaders(session, companyId),
  });
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as {
    readonly publicRevision: string;
    readonly retraining: {
      readonly status: string;
      readonly learners: readonly {
        readonly characterId: string;
        readonly masteredPerkId: string;
        readonly replacementPerkId: string;
      }[];
      readonly progress?: {
        readonly taskId: string;
        readonly acceptedTicks: string;
        readonly remainingTicks: string;
        readonly chargedQ: string;
      };
    };
  };
}

async function companyPerks(app: ReturnType<typeof buildApp>, session: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/company',
    headers: { cookie: `warwrit_session=${session}` },
  });
  expect(response.statusCode).toBe(200);
  const characters = response.json().company.characters as readonly {
    readonly characterId: string;
    readonly perkIds: readonly string[];
  }[];
  return characters.find((character) => character.characterId === 'a-leader')?.perkIds ?? [];
}

async function companyRevision(app: ReturnType<typeof buildApp>, session: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/company',
    headers: { cookie: `warwrit_session=${session}` },
  });
  expect(response.statusCode).toBe(200);
  return response.json().company.revision as string;
}

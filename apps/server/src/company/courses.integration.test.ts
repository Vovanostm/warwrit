import { createHash, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  initialSkillProgress,
  moneyQ,
  readCompanyCombatAggregateState,
  skillLevel,
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

describe('local guard course (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'starts, settles an exact Campaign Day, explicitly stops and completes through ordinary entry points',
    async () => {
      if (!database || !connectionString) throw new Error('company test database missing');
      const worldId = randomUUID();
      const companyA = randomUUID();
      const companyB = randomUUID();
      const accountA = randomUUID();
      const accountB = randomUUID();
      const sessionA = randomUUID();
      const sessionB = randomUUID();
      const issuer = `course-test-${randomUUID()}`;
      const seededA = courseCompanyState(worldId, companyA);
      const seededB = courseCompanyState(worldId, companyB, 1);
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
          { id: accountA, issuer, subject: 'course-a' },
          { id: accountB, issuer, subject: 'course-b' },
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
        const staleScope = await app.inject({
          method: 'GET',
          url: '/company/courses/kamenny-brod',
          headers: {
            cookie: `warwrit_session=${sessionA}`,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyB,
          },
        });
        expect(staleScope.statusCode).toBe(409);

        const offerA = await courseOffer(app, sessionA, companyA);
        expect(offerA.course.status).toBe('AVAILABLE');
        expect(offerA.course.learners).not.toHaveLength(0);
        const firstLearner = offerA.course.learners[0]!;
        const startA = await startCourse(app, sessionA, companyA, seededA, firstLearner);
        expect(startA.statusCode, startA.body).toBe(200);

        const offerB = await courseOffer(app, sessionB, companyB);
        expect(offerB.course.status).toBe('AVAILABLE');
        expect(offerB.course.learners).toContainEqual(
          expect.objectContaining({ characterId: 'a-leader', currentLevel: 1 }),
        );
        const startB = await startCourse(
          app,
          sessionB,
          companyB,
          seededB,
          offerB.course.learners[0]!,
        );
        expect(startB.statusCode, startB.body).toBe(200);
        const activeB = await courseOffer(app, sessionB, companyB);
        expect(activeB.course.status).toBe('IN_PROGRESS');

        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '21600000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const inProgress = await courseOffer(app, sessionA, companyA);
        expect(inProgress.course.status).toBe('IN_PROGRESS');
        expect(inProgress.course.progress).toMatchObject({
          acceptedTicks: '1000',
          chargedQ: '5000000',
        });
        const readA = await app.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${sessionA}` },
        });
        const revisionA = readA.json().company.revision as string;
        const stopped = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: {
            cookie: `warwrit_session=${sessionA}`,
            origin: 'http://127.0.0.1:3107',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyA,
          },
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: revisionA,
            type: 'StopLearning',
            payload: { taskId: inProgress.course.progress!.taskId },
          },
        });
        expect(stopped.statusCode).toBe(200);
        const stoppedView = await courseOffer(app, sessionA, companyA);
        expect(stoppedView.course.progress).toMatchObject({
          acceptedTicks: '1000',
          chargedQ: '5000000',
        });

        const revisionAfterStop = await app.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${sessionA}` },
        });
        const secondLearner = stoppedView.course.learners.find(
          (learner) => learner.characterId !== firstLearner.characterId,
        );
        expect(secondLearner).toBeDefined();
        const restarted = await startCourse(
          app,
          sessionA,
          companyA,
          seededA,
          secondLearner!,
          revisionAfterStop.json().company
            .revision as typeof seededA.economy.lifecycle.knowledge.revision,
        );
        expect(restarted.statusCode, restarted.body).toBe(200);
        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '23760000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const revisionAfterRestarter = await app.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${sessionA}` },
        });
        const dutyInterrupted = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: {
            cookie: `warwrit_session=${sessionA}`,
            origin: 'http://127.0.0.1:3107',
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyA,
          },
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: revisionAfterRestarter.json().company.revision as string,
            type: 'SetAssignment',
            payload: { characterId: secondLearner!.characterId, assignment: 'RECOVERY' },
          },
        });
        expect(dutyInterrupted.statusCode, dutyInterrupted.body).toBe(200);
        const afterDuty = await courseOffer(app, sessionA, companyA);
        expect(afterDuty.course.progress).toMatchObject({
          acceptedTicks: '100',
          chargedQ: '500000',
        });

        await database
          .updateTable('world_campaign_clocks')
          .set({ qa_offset_ms: '64800000' })
          .where('world_id', '=', worldId)
          .executeTakeFirstOrThrow();
        const completed = await courseOffer(app, sessionB, companyB);
        expect(completed.course.status).toBe('COMPLETE');
        expect(completed.course.progress).toMatchObject({
          acceptedTicks: '3000',
          chargedQ: '15000000',
          remainingTicks: '0',
        });
        const completedCompany = await app.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${sessionB}` },
        });
        expect(completedCompany.statusCode, completedCompany.body).toBe(200);
        const stored = await database
          .selectFrom('company_snapshots')
          .select('state')
          .where('world_id', '=', worldId)
          .where('company_id', '=', companyB)
          .executeTakeFirstOrThrow();
        const afterObservation = readCompanyCombatAggregateState(stored.state).economy.lifecycle;
        const learnerId = completed.course.progress!.learnerId;
        const trained = afterObservation.characters.find(
          (entry) => entry.identity.characterId === learnerId,
        )!;
        const known = afterObservation.knowledge.characters.find(
          (entry) => entry.identity.characterId === learnerId,
        )!;
        expect(skillLevel(known.skills['blades']!)).toBe(skillLevel(trained.skills['blades']!));
        expect(skillLevel(known.skills['blades']!)).toBeGreaterThan(
          skillLevel(
            seededB.economy.lifecycle.knowledge.characters.find(
              (entry) => entry.identity.characterId === learnerId,
            )!.skills['blades'] ?? 0,
          ),
        );
        const repeatedRead = await app.inject({
          method: 'GET',
          url: '/company',
          headers: { cookie: `warwrit_session=${sessionB}` },
        });
        expect(repeatedRead.json().company.revision).toBe(completedCompany.json().company.revision);
      } finally {
        await app.close();
      }
    },
  );
});

function courseCompanyState(
  worldId: string,
  companyId: string,
  leaderBladesLevel = 0,
): CompanyCombatAggregateState {
  const fixture = createCompanyCombatAggregateFixture().state;
  const idsReplaced = JSON.parse(
    JSON.stringify(fixture)
      .replaceAll('"world"', JSON.stringify(worldId))
      .replaceAll('"a-company"', JSON.stringify(companyId)),
  ) as CompanyCombatAggregateState;
  return readCompanyCombatAggregateState({
    ...idsReplaced,
    economy: {
      ...idsReplaced.economy,
      lifecycle: {
        ...idsReplaced.economy.lifecycle,
        parties: idsReplaced.economy.lifecycle.parties.map((party) => ({ ...party, location })),
        characters: idsReplaced.economy.lifecycle.characters.map((character) => ({
          ...character,
          presence: { ...character.presence, location },
          ...(character.identity.characterId === 'a-leader'
            ? {
                skills: {
                  ...character.skills,
                  blades: initialSkillProgress(
                    leaderBladesLevel,
                    `${character.identity.characterId}-blades`,
                  ),
                },
              }
            : {}),
        })),
      },
      finance: {
        ...idsReplaced.economy.finance,
        wallets: idsReplaced.economy.finance.wallets.map((wallet) => ({
          ...wallet,
          location,
          ...(wallet.walletId === 'purse' ? { cashQ: moneyQ('20000000') } : {}),
        })),
      },
      physical: {
        ...idsReplaced.economy.physical!,
        containers: idsReplaced.economy.physical!.containers.map((container) => ({
          ...container,
          location,
        })),
      },
    },
  });
}

async function courseOffer(app: ReturnType<typeof buildApp>, session: string, companyId: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/company/courses/kamenny-brod',
    headers: {
      cookie: `warwrit_session=${session}`,
      origin: 'http://127.0.0.1:3107',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
    },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as {
    readonly course: {
      readonly status: string;
      readonly learners: readonly {
        readonly characterId: string;
        readonly resourceIds: readonly string[];
      }[];
      readonly progress?: {
        readonly taskId: string;
        readonly learnerId: string;
        readonly acceptedTicks: string;
        readonly chargedQ: string;
        readonly remainingTicks: string;
      };
    };
  };
}

async function startCourse(
  app: ReturnType<typeof buildApp>,
  session: string,
  companyId: string,
  state: CompanyCombatAggregateState,
  learner: { readonly characterId: string; readonly resourceIds: readonly string[] },
  expectedRevision = state.economy.lifecycle.knowledge.revision,
) {
  return app.inject({
    method: 'POST',
    url: '/company/commands',
    headers: {
      cookie: `warwrit_session=${session}`,
      origin: 'http://127.0.0.1:3107',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
    },
    payload: {
      schemaVersion: 2,
      commandId: randomUUID(),
      expectedPublicRevision: expectedRevision,
      type: 'StartLearning',
      payload: {
        courseId: 'course.kamenny-brod-guard.blades',
        characterId: learner.characterId,
        resourceIds: learner.resourceIds,
      },
    },
  });
}

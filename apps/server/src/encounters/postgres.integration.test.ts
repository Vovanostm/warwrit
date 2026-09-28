import { createHash, randomUUID } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';

import { createDatabase, createDatabaseReadinessProbe } from '../db/database.js';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import {
  createFixtureEncounter,
  executeEncounterCommand,
  verifyEncounterReplay,
} from './executor.js';

const connectionString = process.env['WARWRIT_ENCOUNTER_DATABASE_URL'];
const databases =
  connectionString === undefined
    ? []
    : [createDatabase(connectionString), createDatabase(connectionString)];
const apps: ReturnType<typeof buildApp>[] = [];

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await Promise.all(databases.map((database) => database.destroy()));
});

describe('persistent fixture encounters (PostgreSQL)', () => {
  it.skipIf(connectionString === undefined)(
    'serializes competing connections, returns historical receipts, rejects atomically and replays after reload',
    async () => {
      const [firstDb, secondDb] = databases;
      if (firstDb === undefined || secondDb === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const foreignAccountId = randomUUID();
      const sessionToken = randomUUID();
      const sessionDigest = createHash('sha256').update(sessionToken).digest();
      const issuer = `encounter-test-${accountId}`;
      const ownedEncounters: string[] = [];
      await firstDb
        .insertInto('identity_accounts')
        .values([
          { id: accountId, issuer, subject: 'owner' },
          { id: foreignAccountId, issuer, subject: 'foreign' },
        ])
        .execute();
      await firstDb
        .insertInto('identity_sessions')
        .values({
          token_digest: sessionDigest,
          account_id: accountId,
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute();
      await createDatabaseReadinessProbe(firstDb, true, true)();
      const config = loadServerConfig({
        DATABASE_URL: connectionString,
        OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
        OIDC_CLIENT_ID: 'warwrit-local',
        OIDC_CLIENT_SECRET: 'local-only-secret',
        OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
        PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
        HOST: '127.0.0.1',
        PORT: '3107',
        ENCOUNTER_FIXTURES: '1',
      });
      const app = buildApp({
        logger: false,
        identity: { config: config.identity!, database: firstDb },
        encounters: { database: firstDb, fixtureAdmission: true },
      });
      apps.push(app);
      const cookie = `warwrit_session=${sessionToken}`;
      try {
        const createdResponse = await app.inject({
          method: 'POST',
          url: '/encounters/fixtures',
          headers: { cookie, origin: 'http://127.0.0.1:3107' },
          payload: { version: 1 },
        });
        expect(createdResponse.statusCode).toBe(201);
        expect(Object.keys(createdResponse.json()).sort()).toEqual([
          'encounterId',
          'revision',
          'status',
          'version',
        ]);
        expect(
          (
            await app.inject({
              method: 'GET',
              url: '/encounters/not-a-uuid',
              headers: { cookie },
            })
          ).statusCode,
        ).toBe(400);
        expect(
          (
            await app.inject({
              method: 'POST',
              url: '/encounters/commands',
              headers: { cookie, origin: 'http://127.0.0.1:3107' },
              payload: {
                version: 1,
                encounterId: 'not-a-uuid',
                commandId: 'bad-id',
                expectedRevision: 0,
                activationId: '1:human-shield',
                actorId: 'human-shield',
                intent: { type: 'defend' },
              },
            })
          ).statusCode,
        ).toBe(400);
        const fixture = createdResponse.json() as {
          readonly encounterId: string;
          readonly revision: number;
          readonly status: 'active' | 'resolved';
        };
        ownedEncounters.push(fixture.encounterId);
        const publicRead = await app.inject({
          method: 'GET',
          url: `/encounters/${fixture.encounterId}`,
          headers: { cookie },
        });
        expect(publicRead.statusCode).toBe(200);
        expect(publicRead.json()).toEqual({
          version: 1,
          encounterId: fixture.encounterId,
          revision: 0,
          status: 'active',
        });
        const stateRow = await sql<{
          readonly state: {
            readonly revision: number;
            readonly activation: { readonly id: string; readonly unitId: string };
          };
        }>`select state from encounters where id = ${fixture.encounterId}`.execute(firstDb);
        const initial = stateRow.rows[0]?.state;
        if (initial === undefined) throw new Error('fixture state missing');

        const makeCommand = (commandId: string, type: 'defend' | 'wait') => ({
          version: 1 as const,
          encounterId: fixture.encounterId,
          commandId,
          expectedRevision: 0,
          activationId: initial.activation.id,
          actorId: initial.activation.unitId,
          intent: { type },
        });
        const snapshotRows = async (encounterId: string) => {
          const result = await sql<{ readonly snapshot: unknown }>`
            select json_build_object(
              'encounter', row_to_json(e),
              'commands', coalesce((
                select json_agg(row_to_json(c) order by c.revision)
                from encounter_commands c where c.encounter_id = e.id
              ), '[]'::json),
              'events', coalesce((
                select json_agg(row_to_json(v) order by v.revision, v.ordinal)
                from encounter_events v where v.encounter_id = e.id
              ), '[]'::json),
              'receipts', coalesce((
                select json_agg(row_to_json(r) order by r.command_id)
                from encounter_receipts r where r.encounter_id = e.id
              ), '[]'::json)
            ) as snapshot
            from encounters e where e.id = ${encounterId}
          `.execute(firstDb);
          return result.rows[0]?.snapshot;
        };
        const competing = [makeCommand('race-one', 'defend'), makeCommand('race-two', 'wait')];
        const raced = await Promise.all([
          executeEncounterCommand(firstDb, accountId, competing[0]!),
          executeEncounterCommand(secondDb, accountId, competing[1]!),
        ]);
        expect(raced.filter((result) => result.status === 'accepted')).toHaveLength(1);
        expect(
          raced.filter((result) => result.status === 'rejected' && result.code === 'CONFLICT'),
        ).toHaveLength(1);
        const winnerIndex = raced[0]?.status === 'accepted' ? 0 : 1;
        const winningCommand = competing[winnerIndex]!;
        expect(await executeEncounterCommand(secondDb, accountId, winningCommand)).toEqual(
          raced[winnerIndex],
        );
        expect(
          await executeEncounterCommand(secondDb, accountId, {
            ...winningCommand,
            intent: { type: winningCommand.intent.type === 'defend' ? 'wait' : 'defend' },
          }),
        ).toMatchObject({ status: 'rejected', code: 'CONFLICT' });
        expect(
          await executeEncounterCommand(secondDb, foreignAccountId, winningCommand),
        ).toMatchObject({
          status: 'rejected',
          code: 'NOT_FOUND',
        });
        const reloadDb = createDatabase(connectionString!);
        try {
          expect(await verifyEncounterReplay(reloadDb, fixture.encounterId)).toBe(true);
        } finally {
          await reloadDb.destroy();
        }

        const sameIdFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(sameIdFixture.encounterId);
        const sameIdStateResult = await sql<{
          readonly state: {
            readonly activation: { readonly id: string; readonly unitId: string };
          };
        }>`select state from encounters where id = ${sameIdFixture.encounterId}`.execute(firstDb);
        const sameIdState = sameIdStateResult.rows[0]?.state;
        if (sameIdState === undefined) throw new Error('fixture state missing');
        const sameIdCommand = {
          version: 1 as const,
          encounterId: sameIdFixture.encounterId,
          commandId: 'same-id-race',
          expectedRevision: 0,
          activationId: sameIdState.activation.id,
          actorId: sameIdState.activation.unitId,
          intent: { type: 'defend' as const },
        };
        const sameIdRaced = await Promise.all([
          executeEncounterCommand(firstDb, accountId, sameIdCommand),
          executeEncounterCommand(secondDb, accountId, sameIdCommand),
        ]);
        expect(sameIdRaced[0]).toMatchObject({ status: 'accepted' });
        expect(sameIdRaced[1]).toEqual(sameIdRaced[0]);

        const invalidFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(invalidFixture.encounterId);
        const invalidStateResult = await sql<{
          readonly state: {
            readonly activation: { readonly id: string; readonly unitId: string };
          };
        }>`select state from encounters where id = ${invalidFixture.encounterId}`.execute(secondDb);
        const invalidState = invalidStateResult.rows[0]?.state;
        if (invalidState === undefined) throw new Error('fixture state missing');
        const invalid = {
          version: 1 as const,
          encounterId: invalidFixture.encounterId,
          commandId: 'invalid-target',
          expectedRevision: 0,
          activationId: invalidState.activation.id,
          actorId: invalidState.activation.unitId,
          intent: { type: 'attack' as const, targetId: 'missing-unit' },
        };
        const before = await snapshotRows(invalidFixture.encounterId);
        expect(
          await executeEncounterCommand(firstDb, accountId, {
            ...invalid,
            commandId: 'foreign-unit',
            actorId: 'opponent-raider',
          }),
        ).toMatchObject({ status: 'rejected', code: 'UNAUTHORIZED' });
        expect(await snapshotRows(invalidFixture.encounterId)).toEqual(before);
        expect(await executeEncounterCommand(firstDb, accountId, invalid)).toMatchObject({
          status: 'rejected',
          code: 'INVALID_COMMAND',
        });
        expect(await snapshotRows(invalidFixture.encounterId)).toEqual(before);

        const malformedFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(malformedFixture.encounterId);
        await sql`update encounters set state = 'null'::json where id = ${malformedFixture.encounterId}`.execute(
          firstDb,
        );
        await expect(verifyEncounterReplay(secondDb, malformedFixture.encounterId)).resolves.toBe(
          false,
        );

        const terminalFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(terminalFixture.encounterId);
        const setupResult = await sql<{ readonly setup: combat.BattleSetup }>`
          select setup from encounters where id = ${terminalFixture.encounterId}
        `.execute(firstDb);
        const originalSetup = setupResult.rows[0]?.setup;
        if (originalSetup === undefined) throw new Error('fixture setup missing');
        const terminalSetup: combat.BattleSetup = {
          ...originalSetup,
          units: originalSetup.units
            .filter((unit) => unit.sideId === 'human' || unit.id === 'opponent-raider')
            .map((unit) => ({
              ...unit,
              ...(unit.id === 'human-shield'
                ? { position: combat.hex(0, -1), attributes: { ...unit.attributes, accuracy: 100 } }
                : unit.id === 'opponent-raider'
                  ? {
                      position: combat.hex(1, -1),
                      attributes: { ...unit.attributes, health: 1, armor: 0, defense: 0 },
                    }
                  : {}),
            })),
        };
        const terminalStart = combat.startBattle(terminalSetup);
        await sql`
          update encounters set
            setup = ${JSON.stringify(terminalSetup)}::json,
            state = ${JSON.stringify(terminalStart.state)}::json,
            revision = 0, status = 'active',
            activation_id = ${terminalStart.state.activation?.id ?? null},
            activation_epoch = 1
          where id = ${terminalFixture.encounterId}
        `.execute(firstDb);
        await sql`
          update encounter_participants set unit_ids = ${JSON.stringify(['human-shield'])}::jsonb
          where encounter_id = ${terminalFixture.encounterId} and account_id = ${accountId}
        `.execute(firstDb);
        await firstDb
          .deleteFrom('encounter_events')
          .where('encounter_id', '=', terminalFixture.encounterId)
          .execute();
        for (const [ordinal, event] of terminalStart.events.entries()) {
          await sql`
            insert into encounter_events (encounter_id, revision, ordinal, event_id, event)
            values (
              ${terminalFixture.encounterId}, 0, ${ordinal},
              ${`${terminalFixture.encounterId}:0:${ordinal}`}, ${JSON.stringify(event)}::json
            )
          `.execute(firstDb);
        }
        const terminalActivation = terminalStart.state.activation;
        if (terminalActivation === null) throw new Error('terminal fixture has no activation');
        const terminalResponse = await executeEncounterCommand(firstDb, accountId, {
          version: 1,
          encounterId: terminalFixture.encounterId,
          commandId: 'terminal-attack',
          expectedRevision: 0,
          activationId: terminalActivation.id,
          actorId: terminalActivation.unitId,
          intent: { type: 'attack', targetId: 'opponent-raider' },
        });
        expect(terminalResponse).toMatchObject({ status: 'accepted', revision: 1 });
        const terminalReloadDb = createDatabase(connectionString!);
        try {
          expect(await verifyEncounterReplay(terminalReloadDb, terminalFixture.encounterId)).toBe(
            true,
          );
          const terminalMetadata = await sql<{
            readonly revision: number;
            readonly status: string;
            readonly state: combat.BattleState;
          }>`select revision, status, state from encounters where id = ${terminalFixture.encounterId}`.execute(
            terminalReloadDb,
          );
          expect(terminalMetadata.rows[0]).toMatchObject({
            revision: 1,
            status: 'resolved',
            state: { revision: 1, status: 'resolved', activation: null },
          });
        } finally {
          await terminalReloadDb.destroy();
        }
      } finally {
        await firstDb
          .deleteFrom('identity_sessions')
          .where('token_digest', '=', sessionDigest)
          .execute();
        for (const encounterId of ownedEncounters) {
          await firstDb
            .deleteFrom('encounter_receipts')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb
            .deleteFrom('encounter_events')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb
            .deleteFrom('encounter_commands')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb
            .deleteFrom('encounter_participants')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb.deleteFrom('encounters').where('id', '=', encounterId).execute();
        }
        await firstDb
          .deleteFrom('identity_accounts')
          .where('id', 'in', [accountId, foreignAccountId])
          .execute();
      }
    },
  );
});

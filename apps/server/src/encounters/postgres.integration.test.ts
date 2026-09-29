import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';

import * as combat from '@warwrit/game-core';
import { Client, type SeatReservation } from '@colyseus/sdk';
import type { EncounterCommandResponse } from '@warwrit/protocol';
import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';

import { createDatabase, createDatabaseReadinessProbe } from '../db/database.js';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import {
  createFixtureEncounter,
  executeEncounterCommand,
  executeEncounterAiWake,
  listDueEncounterAiWakes,
  verifyEncounterReplay,
} from './executor.js';
import { startEncounterAiWorker } from './ai-worker.js';
import { EncounterRoomState } from './room-state.js';

const connectionString = process.env['WARWRIT_ENCOUNTER_DATABASE_URL'];
const databases =
  connectionString === undefined
    ? []
    : [createDatabase(connectionString), createDatabase(connectionString)];
const apps: ReturnType<typeof buildApp>[] = [];

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('test listener did not bind a TCP port');
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  return address.port;
}

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

        for (const [index, malformedGrant] of [
          [0, `prefix-human-shield-suffix`],
          [1, { unexpected: true }],
        ] as const) {
          const malformedGrantFixture = await createFixtureEncounter(firstDb, accountId);
          ownedEncounters.push(malformedGrantFixture.encounterId);
          const malformedGrantStateResult = await sql<{
            readonly state: {
              readonly activation: { readonly id: string; readonly unitId: string };
            };
          }>`select state from encounters where id = ${malformedGrantFixture.encounterId}`.execute(
            firstDb,
          );
          const malformedGrantState = malformedGrantStateResult.rows[0]?.state;
          if (malformedGrantState === undefined) throw new Error('fixture state missing');
          await sql`
            update encounter_participants set unit_ids = ${JSON.stringify(malformedGrant)}::jsonb
            where encounter_id = ${malformedGrantFixture.encounterId} and account_id = ${accountId}
          `.execute(firstDb);
          const malformedGrantBefore = await snapshotRows(malformedGrantFixture.encounterId);
          expect(
            await executeEncounterCommand(firstDb, accountId, {
              version: 1,
              encounterId: malformedGrantFixture.encounterId,
              commandId: `malformed-grant-${index}`,
              expectedRevision: 0,
              activationId: malformedGrantState.activation.id,
              actorId: malformedGrantState.activation.unitId,
              intent: { type: 'defend' },
            }),
          ).toMatchObject({ status: 'rejected', code: 'UNAUTHORIZED' });
          expect(await snapshotRows(malformedGrantFixture.encounterId)).toEqual(
            malformedGrantBefore,
          );
        }

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
            .deleteFrom('encounter_ai_controllers')
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

  it.skipIf(connectionString === undefined)(
    'resumes one persisted AI wake, rejects player control and keeps its receipt replayable',
    async () => {
      const [firstDb, secondDb] = databases;
      if (firstDb === undefined || secondDb === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const issuer = `encounter-ai-test-${accountId}`;
      const encounterIds: string[] = [];
      await firstDb
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'owner' })
        .execute();
      try {
        const fixture = await createFixtureEncounter(firstDb, accountId);
        encounterIds.push(fixture.encounterId);
        let stateResult = await sql<{
          readonly state: combat.BattleState;
        }>`select state, revision from encounters where id = ${fixture.encounterId}`.execute(
          firstDb,
        );
        let state = stateResult.rows[0]?.state;
        if (state === undefined) throw new Error('fixture state missing');

        let commandIndex = 0;
        while (state.activation !== null) {
          const activation = state.activation;
          const actor = state.units.find(({ id }) => id === activation.unitId);
          if (actor === undefined) throw new Error('fixture actor missing');
          if (actor.sideId === 'opponent') break;
          const response = await executeEncounterCommand(firstDb, accountId, {
            version: 1,
            encounterId: fixture.encounterId,
            commandId: `advance-to-ai-${commandIndex++}`,
            expectedRevision: state.revision,
            activationId: state.activation.id,
            actorId: actor.id,
            intent: { type: 'wait' },
          });
          expect(response.status).toBe('accepted');
          stateResult = await sql<{ readonly state: combat.BattleState }>`
            select state from encounters where id = ${fixture.encounterId}
          `.execute(firstDb);
          const updated = stateResult.rows[0]?.state;
          if (updated === undefined) throw new Error('updated fixture state missing');
          state = updated;
        }

        expect(state.activation?.unitId).toMatch(/^opponent-/u);
        const aiActivation = state.activation;
        if (aiActivation === null) throw new Error('fixture AI activation missing');
        const dueAt = new Date(Date.now() + 1_000);
        const availableWakes = (await listDueEncounterAiWakes(firstDb, dueAt)).filter(
          ({ encounterId }) => encounterId === fixture.encounterId,
        );
        expect(availableWakes).toHaveLength(1);
        const wake = availableWakes[0];
        if (wake === undefined) throw new Error('AI wake missing');

        const unauthorized = await executeEncounterCommand(firstDb, accountId, {
          version: 1,
          encounterId: fixture.encounterId,
          commandId: 'attempt-ai-control',
          expectedRevision: state.revision,
          activationId: aiActivation.id,
          actorId: aiActivation.unitId,
          intent: { type: 'wait' },
        });
        expect(unauthorized).toMatchObject({ status: 'rejected', code: 'UNAUTHORIZED' });

        const resumedWakes = (await listDueEncounterAiWakes(secondDb, dueAt)).filter(
          ({ encounterId }) => encounterId === fixture.encounterId,
        );
        expect(resumedWakes).toEqual(availableWakes);
        let aiResponse: EncounterCommandResponse | undefined;
        let aiError: unknown;
        const aiWorker = startEncounterAiWorker(secondDb, {
          onCommitted: (_encounterId, response) => {
            aiResponse = response;
          },
          onError: (error) => {
            aiError = error;
          },
        });
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error(`AI worker did not commit a step: ${String(aiError)}`)),
              1_000,
            );
            const check = setInterval(() => {
              if (aiResponse !== undefined) {
                clearTimeout(timeout);
                clearInterval(check);
                resolve();
              }
            }, 10);
          });
        } finally {
          await aiWorker.stop();
        }
        expect(aiResponse).toMatchObject({ status: 'accepted', revision: state.revision + 1 });
        expect(await executeEncounterAiWake(firstDb, wake)).toBeUndefined();

        const commandRows = await sql<{
          readonly source_kind: string;
          readonly account_id: string | null;
          readonly command_id: string;
          readonly command: combat.CombatCommand;
        }>`select source_kind, account_id, command_id, command from encounter_commands
          where encounter_id = ${fixture.encounterId} order by revision desc limit 1`.execute(
          firstDb,
        );
        expect(commandRows.rows[0]).toMatchObject({
          source_kind: 'system_ai',
          account_id: null,
          command_id: aiResponse?.status === 'accepted' ? aiResponse.commandId : undefined,
        });
        expect(await verifyEncounterReplay(secondDb, fixture.encounterId)).toBe(true);
      } finally {
        await firstDb
          .deleteFrom('encounter_receipts')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_events')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_commands')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_ai_controllers')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_participants')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb.deleteFrom('encounters').where('id', 'in', encounterIds).execute();
        await firstDb.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'starts and closes the Colyseus listener with the authenticated Fastify room-ticket flow',
    async () => {
      const [database] = databases;
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const token = randomUUID();
      const tokenDigest = createHash('sha256').update(token).digest();
      const issuer = `encounter-realtime-test-${accountId}`;
      let encounterId: string | undefined;
      let app: ReturnType<typeof buildApp> | undefined;
      let leaveRoom: (() => Promise<void>) | undefined;
      await database
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'owner' })
        .execute();
      await database
        .insertInto('identity_sessions')
        .values({
          token_digest: tokenDigest,
          account_id: accountId,
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute();
      try {
        const roomPort = await reservePort();
        const config = loadServerConfig({
          DATABASE_URL: connectionString,
          OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
          OIDC_CLIENT_ID: 'warwrit-local',
          OIDC_CLIENT_SECRET: 'local-only-secret',
          OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
          PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
          HOST: '127.0.0.1',
          PORT: '3107',
          ENCOUNTER_REALTIME_PORT: String(roomPort),
          ENCOUNTER_FIXTURES: '1',
        });
        app = buildApp({
          logger: false,
          identity: { config: config.identity!, database },
          encounters: { database, fixtureAdmission: true },
          encounterRealtime: { host: config.host, port: roomPort },
        });
        await app.ready();
        const fixture = await createFixtureEncounter(database, accountId);
        encounterId = fixture.encounterId;
        const cookie = `warwrit_session=${token}`;
        const ticketResponse = await app.inject({
          method: 'POST',
          url: `/encounters/${encounterId}/room-ticket`,
          headers: { cookie, origin: 'http://127.0.0.1:3107' },
          payload: { version: 1 },
        });
        expect(ticketResponse.statusCode, ticketResponse.body).toBe(200);
        const ticket = ticketResponse.json() as SeatReservation;
        expect(ticket).toMatchObject({ name: 'encounter' });
        const roomClient = new Client(`http://127.0.0.1:${roomPort}`, { headers: { cookie } });
        const room = await roomClient.consumeSeatReservation(ticket, EncounterRoomState);
        leaveRoom = async () => {
          await room.leave();
        };
        await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
        expect(room.state.encounterId).toBe(encounterId);
        expect(Object.keys(room.state.toJSON()).sort()).toEqual([
          'activationId',
          'actorUnitId',
          'deadlineAt',
          'encounterId',
          'revision',
          'round',
          'status',
          'units',
          'version',
        ]);
        const stateResult = await sql<{ readonly state: combat.BattleState }>`
          select state from encounters where id = ${encounterId}
        `.execute(database);
        const initial = stateResult.rows[0]?.state;
        if (initial?.activation === null || initial?.activation === undefined) {
          throw new Error('fixture activation missing');
        }
        expect(room.state.revision).toBe(0);
        expect(room.state.units.get('human-shield')).toMatchObject({ q: -2, r: 0 });
        const revisionUpdated = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('HTTP command did not update the joined room projection')),
            2_000,
          );
          room.onStateChange((state) => {
            if (state.revision === 1) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
        const commandResponse = await app.inject({
          method: 'POST',
          url: '/encounters/commands',
          headers: { cookie, origin: 'http://127.0.0.1:3107' },
          payload: {
            version: 1,
            encounterId,
            commandId: randomUUID(),
            expectedRevision: 0,
            activationId: initial.activation.id,
            actorId: initial.activation.unitId,
            intent: { type: 'move', to: { q: -1, r: 0 } },
          },
        });
        expect(commandResponse.statusCode, commandResponse.body).toBe(200);
        expect(commandResponse.json()).toMatchObject({ status: 'accepted', revision: 1 });
        await revisionUpdated;
        expect(room.state.revision).toBe(1);
        expect(room.state.units.get('human-shield')).toMatchObject({ q: -1, r: 0 });
        await room.leave();
        leaveRoom = undefined;
      } finally {
        await leaveRoom?.();
        await app?.close();
        if (encounterId !== undefined) {
          await database
            .deleteFrom('encounter_receipts')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_events')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_commands')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_ai_controllers')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_participants')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database.deleteFrom('encounters').where('id', '=', encounterId).execute();
        }
        await database
          .deleteFrom('identity_sessions')
          .where('token_digest', '=', tokenDigest)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'returns the committed receipt when the post-commit projection notification fails',
    async () => {
      const [database] = databases;
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const token = randomUUID();
      const tokenDigest = createHash('sha256').update(token).digest();
      const issuer = `encounter-notify-test-${accountId}`;
      let encounterId: string | undefined;
      let app: ReturnType<typeof buildApp> | undefined;
      let notificationObservedRevision: number | undefined;
      try {
        await database
          .insertInto('identity_accounts')
          .values({ id: accountId, issuer, subject: 'owner' })
          .execute();
        await database
          .insertInto('identity_sessions')
          .values({
            token_digest: tokenDigest,
            account_id: accountId,
            expires_at: new Date(Date.now() + 60_000),
          })
          .execute();
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
        app = buildApp({
          logger: false,
          identity: { config: config.identity!, database },
          encounters: {
            database,
            fixtureAdmission: true,
            onCommandCommitted: async (committedEncounterId) => {
              const committed = await sql<{ readonly revision: number }>`
                select revision from encounters where id = ${committedEncounterId}
              `.execute(database);
              notificationObservedRevision = committed.rows[0]?.revision;
              throw new Error('test projection notification failure');
            },
          },
        });
        await app.ready();
        const fixture = await createFixtureEncounter(database, accountId);
        encounterId = fixture.encounterId;
        const stateResult = await sql<{ readonly state: combat.BattleState }>`
          select state from encounters where id = ${encounterId}
        `.execute(database);
        const initial = stateResult.rows[0]?.state;
        if (initial?.activation === null || initial?.activation === undefined) {
          throw new Error('fixture activation missing');
        }
        const response = await app.inject({
          method: 'POST',
          url: '/encounters/commands',
          headers: { cookie: `warwrit_session=${token}`, origin: 'http://127.0.0.1:3107' },
          payload: {
            version: 1,
            encounterId,
            commandId: randomUUID(),
            expectedRevision: 0,
            activationId: initial.activation.id,
            actorId: initial.activation.unitId,
            intent: { type: 'move', to: { q: -1, r: 0 } },
          },
        });
        expect(response.statusCode, response.body).toBe(200);
        const receipt = response.json() as EncounterCommandResponse;
        expect(receipt).toMatchObject({ status: 'accepted', revision: 1 });
        expect(notificationObservedRevision).toBe(1);
        const stored = await sql<{
          readonly resulting_revision: number;
          readonly response: EncounterCommandResponse;
        }>`
          select resulting_revision, response from encounter_receipts
          where encounter_id = ${encounterId}
        `.execute(database);
        expect(stored.rows).toEqual([{ resulting_revision: 1, response: receipt }]);
      } finally {
        await app?.close();
        if (encounterId !== undefined) {
          await database
            .deleteFrom('encounter_receipts')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_events')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_commands')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_ai_controllers')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_participants')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database.deleteFrom('encounters').where('id', '=', encounterId).execute();
        }
        await database
          .deleteFrom('identity_sessions')
          .where('token_digest', '=', tokenDigest)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );
});

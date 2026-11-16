import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { createDatabase, createDatabaseReadinessProbe } from './database.js';

const connectionString = process.env['DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const controller = connectionString === undefined ? undefined : createDatabase(connectionString);

afterAll(async () => {
  await database?.destroy();
  await controller?.destroy();
});

describe('PostgreSQL connection recovery', () => {
  it.skipIf(database === undefined || controller === undefined)(
    'survives a disconnected checked-out client and reconnects for readiness',
    async () => {
      if (!database || !controller) throw new Error('Integration database is required');
      const app = buildApp({
        logger: false,
        readinessProbe: createDatabaseReadinessProbe(database),
      });
      try {
        expect((await app.inject({ method: 'GET', url: '/health/ready' })).statusCode).toBe(200);

        const interrupted = database.transaction().execute(async (transaction) => {
          const { rows } = await sql<{ pid: number }>`select pg_backend_pid() as pid`.execute(
            transaction,
          );
          const pid = rows[0]?.pid;
          if (pid === undefined) throw new Error('Transaction backend is required');
          const terminated = await sql<{ terminated: boolean }>`
            select pg_terminate_backend(${pid}) as terminated
          `.execute(controller);
          expect(terminated.rows[0]?.terminated).toBe(true);
          // Let the server's disconnect reach the client while it remains checked out.
          await new Promise((resolve) => setTimeout(resolve, 25));
          await sql`select 1`.execute(transaction);
        });

        await expect(interrupted).rejects.toThrow();
        expect((await app.inject({ method: 'GET', url: '/health/live' })).statusCode).toBe(200);
        expect((await app.inject({ method: 'GET', url: '/health/ready' })).statusCode).toBe(200);
      } finally {
        await app.close();
      }
    },
  );
});

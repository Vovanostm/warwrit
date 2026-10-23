import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { runMigrations } from '../apps/server/src/db/migrator.js';

export interface DatabaseRun {
  sourceUrl: string;
  databases: string[];
}

export function createDatabaseRun(sourceUrl: string | undefined): DatabaseRun {
  if (!sourceUrl) throw new Error('Integration mode requires explicit DATABASE_URL');
  validateSourceUrl(sourceUrl);
  return { sourceUrl, databases: [] };
}

function validateSourceUrl(sourceUrl: string): void {
  const source = new URL(sourceUrl);
  if (!['postgres:', 'postgresql:'].includes(source.protocol)) {
    throw new Error('Integration mode requires a PostgreSQL URL');
  }
  // libpq URL query parameters can override the pathname database selection.
  if (source.searchParams.has('database') || source.searchParams.has('dbname')) {
    throw new Error('Database query overrides are unsupported');
  }
}

async function withClient<T>(url: string, action: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: url });
  // pg's end() resolves even after an idle-session FATAL. Retain events until
  // closure completes; the race alone cannot report errors after it settles.
  const errors = new Set<unknown>();
  const failure = new Promise<never>((_resolve, reject) =>
    client.on('error', (error) => {
      errors.add(error);
      reject(error);
    }),
  );
  let result: T | undefined;
  try {
    result = await Promise.race([connectAndAct(client, action), failure]);
  } catch (error) {
    errors.add(error);
  }
  await client.end().catch((error: unknown) => errors.add(error));
  if (errors.size === 1) throw [...errors][0];
  if (errors.size > 1) throw new AggregateError(errors, 'Integration action and closure failed');
  return result as T;
}

async function connectAndAct<T>(
  client: Client,
  action: (client: Client) => Promise<T>,
): Promise<T> {
  await client.connect();
  return action(client);
}

function ownedName(run: DatabaseRun, url: string): string {
  if (!run.databases.includes(url)) throw new Error('Database is not owned by this run');
  return new URL(url).pathname.slice(1);
}

async function allocateDatabase(run: DatabaseRun, template: string): Promise<string> {
  const name = `ww_integration_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(run.sourceUrl);
  url.pathname = `/${name}`;
  // Reserve before CREATE: a lost reply can hide a committed allocation.
  run.databases.push(url.href);
  await withClient(run.sourceUrl, async (client) => {
    await client.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
  });
  return url.href;
}

export function createEmptyDatabase(run: DatabaseRun): Promise<string> {
  return allocateDatabase(run, 'template0');
}

export async function createMigratedTemplate(run: DatabaseRun): Promise<string> {
  const url = await createEmptyDatabase(run);
  await withClient(url, (client) => runMigrations(client, 'up'));
  return url;
}

export async function cloneDatabase(run: DatabaseRun, template: string): Promise<string> {
  return allocateDatabase(run, ownedName(run, template));
}

export async function dropDatabase(run: DatabaseRun, url: string): Promise<void> {
  const name = ownedName(run, url);
  await withClient(run.sourceUrl, async (client) => {
    // Only this run's randomly named databases may have lingering sessions killed.
    await client.query(`DROP DATABASE IF EXISTS ${client.escapeIdentifier(name)} WITH (FORCE)`);
  });
}

export async function disposeDatabases(run: DatabaseRun): Promise<void> {
  const errors: unknown[] = [];
  for (const url of [...run.databases].reverse()) {
    try {
      await dropDatabase(run, url);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, 'Integration database cleanup failed');
}

export async function disposeAfterFailure(run: DatabaseRun, error: unknown): Promise<never> {
  try {
    await disposeDatabases(run);
  } catch (cleanupError) {
    throw new AggregateError([error, cleanupError], 'Integration setup and cleanup failed', {
      cause: cleanupError,
    });
  }
  throw error;
}

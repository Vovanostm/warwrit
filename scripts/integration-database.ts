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
  try {
    await client.connect();
    return await action(client);
  } finally {
    await client.end();
  }
}

function ownedName(run: DatabaseRun, url: string): string {
  if (!run.databases.includes(url)) throw new Error('Database is not owned by this run');
  return new URL(url).pathname.slice(1);
}

async function allocateDatabase(run: DatabaseRun, template: string): Promise<string> {
  const name = `ww_integration_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(run.sourceUrl);
  url.pathname = `/${name}`;
  await withClient(run.sourceUrl, async (client) => {
    await client.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
    run.databases.push(url.href);
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

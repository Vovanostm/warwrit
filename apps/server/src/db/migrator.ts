import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import type { Client } from 'pg';

export type MigrationDirection = 'up' | 'down' | 'status';

export interface MigrationResult {
  readonly applied: readonly string[];
  readonly direction: MigrationDirection;
  readonly pending: readonly string[];
}

interface MigrationRow {
  readonly name: string;
}

interface Migration {
  readonly name: string;
  readonly upSql: string;
  readonly downSql: string;
}

const migrationsDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url));

async function loadMigrations(): Promise<readonly Migration[]> {
  const entries = await readdir(migrationsDirectory);
  const names = entries
    .filter((entry) => entry.endsWith('.up.sql'))
    .map((entry) => entry.slice(0, -'.up.sql'.length))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    names.map(async (name) => ({
      name,
      upSql: await readFile(join(migrationsDirectory, `${name}.up.sql`), 'utf8'),
      downSql: await readFile(join(migrationsDirectory, `${name}.down.sql`), 'utf8'),
    })),
  );
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function appliedMigrations(client: Client): Promise<readonly string[]> {
  const result = await client.query<MigrationRow>(
    'select name from schema_migrations order by name asc',
  );
  return result.rows.map((row) => row.name);
}

async function transaction(client: Client, action: () => Promise<void>): Promise<void> {
  await client.query('begin');
  try {
    await action();
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

export async function runMigrations(
  client: Client,
  direction: MigrationDirection,
): Promise<MigrationResult> {
  await ensureMigrationsTable(client);
  const migrations = await loadMigrations();
  const appliedBefore = await appliedMigrations(client);
  const appliedSet = new Set(appliedBefore);

  if (direction === 'status') {
    return {
      applied: appliedBefore,
      direction,
      pending: migrations
        .filter((migration) => !appliedSet.has(migration.name))
        .map(({ name }) => name),
    };
  }

  if (direction === 'up') {
    const appliedNow = [];
    for (const migration of migrations) {
      if (appliedSet.has(migration.name)) {
        continue;
      }

      await transaction(client, async () => {
        await client.query(migration.upSql);
        await client.query('insert into schema_migrations (name) values ($1)', [migration.name]);
      });
      appliedNow.push(migration.name);
    }

    return {
      applied: appliedNow,
      direction,
      pending: [],
    };
  }

  const latestName = appliedBefore.at(-1);
  if (latestName === undefined) {
    return {
      applied: [],
      direction,
      pending: migrations.map(({ name }) => name),
    };
  }

  const migration = migrations.find(({ name }) => name === latestName);
  if (migration === undefined) {
    throw new Error(`Applied migration has no local definition: ${latestName}`);
  }

  await transaction(client, async () => {
    await client.query(migration.downSql);
    await client.query('delete from schema_migrations where name = $1', [migration.name]);
  });

  return {
    applied: [migration.name],
    direction,
    pending: [migration.name],
  };
}

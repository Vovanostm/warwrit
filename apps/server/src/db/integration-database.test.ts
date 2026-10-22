import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { Client } from 'pg';
import type { TestProject } from 'vitest/node';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface DatabaseRun {
  sourceUrl: string;
  databases: string[];
}
interface Lifecycle {
  createDatabaseRun: (source: string | undefined) => DatabaseRun;
  createEmptyDatabase: (run: DatabaseRun) => Promise<string>;
  createMigratedTemplate: (run: DatabaseRun) => Promise<string>;
  cloneDatabase: (run: DatabaseRun, template: string) => Promise<string>;
  dropDatabase: (run: DatabaseRun, url: string) => Promise<void>;
  disposeDatabases: (run: DatabaseRun) => Promise<void>;
}

// These test-only scripts live outside the server compiler's rootDir.
const {
  cloneDatabase,
  createDatabaseRun,
  createEmptyDatabase,
  createMigratedTemplate,
  disposeDatabases,
  dropDatabase,
} = await vi.importActual<Lifecycle>('../../../../scripts/integration-database.js');
const { default: setup } = await import(
  '../../../../scripts/integration-global-setup.js' as string
);
import { runMigrations } from './migrator.js';

const source = process.env['INTEGRATION_LIFECYCLE_DATABASE_URL'];

afterEach(() => vi.unstubAllEnvs());

describe('owned integration databases', () => {
  it('requires an explicit PostgreSQL source', () => {
    expect(() => createDatabaseRun(undefined)).toThrow('DATABASE_URL');
    expect(() => createDatabaseRun('file:///retained')).toThrow('PostgreSQL');
    for (const key of ['database', 'dbname']) {
      expect(() => createDatabaseRun(`postgres://localhost/test?${key}=retained`)).toThrow(
        'overrides',
      );
    }
  });

  it.skipIf(source === undefined)(
    'clones clean migrations and confines identical keys and down/up',
    async () => {
      const run = createDatabaseRun(source);
      try {
        const template = await createMigratedTemplate(run);
        const [left, right] = await Promise.all([
          cloneDatabase(run, template),
          cloneDatabase(run, template),
        ]);
        expect(new Set([template, left, right]).size).toBe(3);
        await Promise.all(
          [left, right].map((url) =>
            withClient(url, async (client: Client) => {
              const status = await runMigrations(client, 'status');
              expect(status.pending).toEqual([]);
              expect(status.applied).toHaveLength(14);
              await client.query('create table isolation_probe (id text primary key)');
              await client.query("insert into isolation_probe values ('same-key')");
            }),
          ),
        );
        await withClient(left, async (client: Client) => {
          await runMigrations(client, 'down');
          await runMigrations(client, 'up');
          await client.query('drop schema public cascade');
        });
        await withClient(right, async (client: Client) => {
          expect((await client.query('select id from isolation_probe')).rows).toEqual([
            { id: 'same-key' },
          ]);
          expect((await runMigrations(client, 'status')).pending).toEqual([]);
        });
        await withClient(template, async (client: Client) => {
          expect(
            (await client.query("select to_regclass('isolation_probe') as name")).rows,
          ).toEqual([{ name: null }]);
        });
        await dropDatabase(run, left);
        await expectAbsent(run.sourceUrl, [left]);
        await withClient(right, async (client: Client) => {
          expect((await client.query('select count(*) from isolation_probe')).rows[0]?.count).toBe(
            '1',
          );
        });
      } finally {
        const owned = [...run.databases];
        await disposeDatabases(run);
        await expectAbsent(run.sourceUrl, owned);
      }
    },
  );

  it.skipIf(source === undefined)(
    'cleans partial setup and refuses unowned destructive operations',
    async () => {
      const run = createDatabaseRun(source);
      const empty = await createEmptyDatabase(run);
      try {
        await expect(cloneDatabase(run, 'postgres://invalid/not-owned')).rejects.toThrow('owned');
        await expect(dropDatabase(run, run.sourceUrl)).rejects.toThrow('owned');
        await expect(
          withClient(empty, async () => {
            throw new Error('setup failed');
          }),
        ).rejects.toThrow('setup failed');
        await withClient(empty, async (client: Client) => {
          expect(
            (await client.query("select to_regclass('schema_migrations') as name")).rows[0]?.name,
          ).toBeNull();
        });
      } finally {
        await disposeDatabases(run);
      }
      await expectAbsent(run.sourceUrl, [empty]);
    },
  );
  it.skipIf(source === undefined)(
    'reports real PostgreSQL cleanup errors and still tries every database',
    async () => {
      const run = createDatabaseRun(source);
      const first = await createEmptyDatabase(run);
      const second = await createEmptyDatabase(run);
      const readOnly = new URL(run.sourceUrl);
      readOnly.searchParams.set('options', '-c default_transaction_read_only=on');
      try {
        const failure = await disposeDatabases({ ...run, sourceUrl: readOnly.href }).catch(
          (error: AggregateError) => error,
        );
        expect(failure).toBeInstanceOf(AggregateError);
        if (!(failure instanceof AggregateError)) throw new Error('Cleanup unexpectedly succeeded');
        expect(failure.errors).toHaveLength(2);
        expect(failure.errors.every((error: Error) => /read-only/u.test(error.message))).toBe(true);
      } finally {
        await disposeDatabases(run);
      }
      await expectAbsent(run.sourceUrl, [first, second]);
    },
  );

  it.skipIf(source === undefined)(
    'provides eight clean file clones and disposes partial setup on failure',
    async () => {
      vi.stubEnv('DATABASE_URL', source);
      let context:
        | { run: { sourceUrl: string; databases: string[] }; files: Record<string, string> }
        | undefined;
      const paths = Array.from({ length: 8 }, (_, index) => `/file-${index}.integration.test.ts`);
      const project = {
        globTestFiles: async () => ({ testFiles: paths }),
        provide: (_key: string, value: NonNullable<typeof context>) => {
          context = value;
        },
      } as unknown as TestProject;
      const teardown = await setup(project);
      expect(Object.keys(context!.files)).toEqual(paths);
      expect(new Set(Object.values(context!.files)).size).toBe(8);
      await teardown();
      await expectAbsent(source!, context!.run.databases);
      project.provide = (() => {
        throw new Error('provide failed');
      }) as TestProject['provide'];
      await expect(setup(project)).rejects.toThrow('provide failed');
      await withClient(source!, async (client: Client) => {
        expect(
          (
            await client.query(
              "select datname from pg_database where datname like 'ww_integration_%'",
            )
          ).rows,
        ).toEqual([]);
      });
    },
  );
  it
    .skipIf(source === undefined)
    .each(['pass', 'test-failure', 'collection-failure', 'cleanup-failure'])(
    'runs actual worker hooks and cleans after %s',
    async (scenario) => {
      const evidence = resolve('.orca/core-integration-db-isolation');
      await mkdir(evidence, { recursive: true });
      const directory = await mkdtemp(`${evidence}/hook-probe-`);
      try {
        const config = {
          test: {
            include: [`${directory}/*.integration.test.ts`],
            globalSetup: [resolve('scripts/integration-global-setup.ts')],
            setupFiles: [resolve('scripts/integration-file-setup.ts')],
            maxWorkers: 2,
            sequence: { hooks: 'stack' },
          },
        };
        await writeFile(
          `${directory}/vitest.config.mjs`,
          `export default ${JSON.stringify(config)}`,
        );
        const fixture = `
          import { Client } from 'pg';
          import { afterAll, expect, inject, it } from 'vitest';
          const url = process.env.DATABASE_URL;
          const client = new Client({ connectionString: url });
          afterAll(async () => {
            await client.end();
            console.info('pool-closed');
          });
          it('binds before imports and keeps identical keys private', async () => {
            await client.connect();
            const name = new URL(url).pathname.slice(1);
            expect((await client.query('select current_database() as name')).rows[0].name).toBe(name);
            for (const key of ['IDENTITY_TEST_DATABASE_URL', 'WARWRIT_ENCOUNTER_DATABASE_URL', 'WARWRIT_COMPANY_DATABASE_URL', 'WARWRIT_FIRST_HUNT_ISOLATED_DATABASE_URL']) expect(process.env[key]).toBe(url);
            await client.query('create table hook_probe (id text primary key)');
            await client.query("insert into hook_probe values ('same-key')");
            await client.query('select pg_sleep(0.1)');
            expect(inject('integrationDatabases').run.databases).toContain(url);
          });
        `;
        await writeFile(`${directory}/left.integration.test.ts`, fixture);
        const failure =
          scenario === 'test-failure'
            ? "it('intentional failure', () => { throw new Error('intentional test failure'); });"
            : scenario === 'collection-failure'
              ? "throw new Error('intentional collection failure');"
              : scenario === 'cleanup-failure'
                ? `afterAll(() => {
                    const run = inject('integrationDatabases').run;
                    const url = new URL(run.sourceUrl);
                    url.searchParams.set('options', '-c default_transaction_read_only=on');
                    run.sourceUrl = url.href;
                  });`
                : '';
        await writeFile(`${directory}/right.integration.test.ts`, `${fixture}\n${failure}`);
        let code = 0;
        const result = await promisify(execFile)(
          process.execPath,
          [
            resolve('node_modules/vitest/vitest.mjs'),
            '--reporter=verbose',
            '--disableConsoleIntercept',
            'run',
            '--config',
            `${directory}/vitest.config.mjs`,
          ],
          { env: { ...process.env, DATABASE_URL: source! } },
        ).catch((error) => {
          code = error.code;
          return error as { stdout: string; stderr: string };
        });
        await writeFile(`${evidence}/hooks-${scenario}.log`, result.stdout + result.stderr);
        expect(code).toBe(scenario === 'pass' ? 0 : 1);
        const names = [...result.stdout.matchAll(/ready [^\n]+ (ww_integration_[a-f0-9]+)/gu)].map(
          (match) => match[1]!,
        );
        expect(new Set(names).size).toBe(2);
        await expectAbsent(
          source!,
          names.map((name) => {
            const url = new URL(source!);
            url.pathname = `/${name}`;
            return url.href;
          }),
        );
        if (scenario === 'cleanup-failure')
          expect(result.stdout + result.stderr).toContain('read-only');
        else if (scenario !== 'pass')
          expect(result.stdout + result.stderr).toContain(
            `intentional ${scenario === 'test-failure' ? 'test' : 'collection'} failure`,
          );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
});

async function expectAbsent(sourceUrl: string, urls: string[]): Promise<void> {
  const names = urls.map((url) => new URL(url).pathname.slice(1));
  await withClient(sourceUrl, async (client: Client) => {
    expect(
      (await client.query('select datname from pg_database where datname = any($1)', [names])).rows,
    ).toEqual([]);
    expect(
      (await client.query('select datname from pg_stat_activity where datname = any($1)', [names]))
        .rows,
    ).toEqual([]);
  });
}

async function withClient<T>(url: string, action: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

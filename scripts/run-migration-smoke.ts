import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createDatabaseRun,
  createEmptyDatabase,
  disposeDatabases,
  disposeAfterFailure,
} from './integration-database.js';

const run = createDatabaseRun(process.env['DATABASE_URL']);
try {
  const databaseUrl = await createEmptyDatabase(run);
  const runtimeCoverage = process.env['WARWRIT_MIGRATION_RUNTIME_COVERAGE'];
  process.exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        ...(runtimeCoverage ? ['--import', './scripts/world-map/runtime-coverage-node.mjs'] : []),
        fileURLToPath(new URL('./migration-smoke.ts', import.meta.url)),
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          ...(runtimeCoverage
            ? { WORLD_LAB: '1', WORLD_LAB_RUNTIME_COVERAGE: runtimeCoverage }
            : {}),
        },
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} catch (error) {
  await disposeAfterFailure(run, error);
}
await disposeDatabases(run);

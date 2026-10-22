import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createDatabaseRun,
  createEmptyDatabase,
  disposeDatabases,
} from './integration-database.js';

const run = createDatabaseRun(process.env['DATABASE_URL']);
try {
  const databaseUrl = await createEmptyDatabase(run);
  process.exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', fileURLToPath(new URL('./migration-smoke.ts', import.meta.url))],
      {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} finally {
  await disposeDatabases(run);
}

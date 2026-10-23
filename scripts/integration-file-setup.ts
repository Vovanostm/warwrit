import { afterAll, expect, inject } from 'vitest';
import { dropDatabase } from './integration-database.js';
import type {} from './integration-global-setup.js';

const { run, files } = inject('integrationDatabases');
const path = expect.getState().testPath;
const url = path === undefined ? undefined : files[path];
if (url === undefined) throw new Error(`No integration database allocated for ${path}`);
for (const key of [
  'DATABASE_URL',
  'IDENTITY_TEST_DATABASE_URL',
  'WARWRIT_ENCOUNTER_DATABASE_URL',
  'WARWRIT_COMPANY_DATABASE_URL',
  'WARWRIT_FIRST_HUNT_ISOLATED_DATABASE_URL',
]) {
  process.env[key] = url;
}
process.stdout.write(`[integration-db] ready ${path} ${new URL(url).pathname.slice(1)}\n`);
// Registered before the file's hooks: stack order closes apps/pools first.
afterAll(async () => {
  await dropDatabase(run, url);
  process.stdout.write(`[integration-db] disposed ${path} ${new URL(url).pathname.slice(1)}\n`);
});

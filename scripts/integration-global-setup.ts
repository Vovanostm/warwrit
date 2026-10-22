import type { TestProject } from 'vitest/node';
import {
  cloneDatabase,
  createDatabaseRun,
  createMigratedTemplate,
  disposeDatabases,
  disposeAfterFailure,
  type DatabaseRun,
} from './integration-database.js';

declare module 'vitest' {
  export interface ProvidedContext {
    integrationDatabases: { run: DatabaseRun; files: Record<string, string> };
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const run = createDatabaseRun(process.env['DATABASE_URL']);
  try {
    const { testFiles } = await project.globTestFiles(['.integration.test.ts']);
    const template = await createMigratedTemplate(run);
    const files: Record<string, string> = {};
    for (const path of testFiles) files[path] = await cloneDatabase(run, template);
    project.provide('integrationDatabases', { run, files });
  } catch (error) {
    return disposeAfterFailure(run, error);
  }
  return () => disposeDatabases(run);
}

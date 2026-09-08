import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { format } from 'prettier';

/** @type {import('prettier').Config} */
const config = {
  arrowParens: 'always',
  printWidth: 100,
  proseWrap: 'preserve',
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
};

const diagnosticFiles = [
  'packages/game-core/src/company/economy-accrual.ts',
  'packages/game-core/src/company/economy-types.ts',
  'packages/game-core/src/company/economy.ts',
  'packages/game-core/src/company/physical-care.ts',
  'packages/game-core/src/company/physical-items.ts',
  'packages/game-core/src/company/physical-outcomes.ts',
  'packages/game-core/src/company/physical-state.ts',
  'packages/game-core/src/company/physical.ts',
  'packages/testkit/src/company-economy-fixture.ts',
  'packages/testkit/src/company-economy-privacy.spec.test.ts',
  'packages/testkit/src/company-physical.spec.test.ts',
];

if (process.env.CI && !globalThis.__warwritPrettierDiagnostic) {
  globalThis.__warwritPrettierDiagnostic = true;
  const directory = await mkdtemp(join(tmpdir(), 'warwrit-prettier-'));
  try {
    for (const [index, file] of diagnosticFiles.entries()) {
      const source = await readFile(file, 'utf8');
      const formatted = await format(source, { ...config, filepath: file });
      if (source === formatted) continue;
      const target = join(directory, `${index}-${basename(file)}`);
      await writeFile(target, formatted, 'utf8');
      const diff = spawnSync(
        'diff',
        ['-u', '--label', `${file}:current`, '--label', `${file}:prettier`, file, target],
        { encoding: 'utf8' },
      ).stdout;
      console.error(`::group::PRETTIER-DIFF ${file}\n${diff}::endgroup::`);
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

export default config;

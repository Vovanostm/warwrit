import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

if (process.env.CI && !globalThis.__warwritPrettierDiagnostic) {
  globalThis.__warwritPrettierDiagnostic = true;
  const file = 'packages/testkit/src/company-physical.spec.test.ts';
  const source = await readFile(file, 'utf8');
  const formatted = await format(source, { ...config, filepath: file });
  if (source !== formatted) {
    const directory = await mkdtemp(join(tmpdir(), 'warwrit-prettier-'));
    try {
      const target = join(directory, 'company-physical.spec.test.ts');
      await writeFile(target, formatted, 'utf8');
      const diff = spawnSync(
        'diff',
        ['-u', '--label', `${file}:current`, '--label', `${file}:prettier`, file, target],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 },
      ).stdout;
      console.error(`::group::PRETTIER-DIFF ${file}\n${diff}::endgroup::`);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }
}

export default config;

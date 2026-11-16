import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';

// Exercise the actual checker on disposable tiny workspaces, not a second policy implementation.
test('web cannot import canonical owners through package or relative paths', async () => {
  const output = resolve('output');
  await mkdir(output, { recursive: true });
  const fixture = await mkdtemp(`${output}/architecture-`);
  try {
    for (const directory of [
      'scripts',
      'packages/game-core/src',
      'apps/web/src',
      'apps/server/src',
    ])
      await mkdir(`${fixture}/${directory}`, { recursive: true });
    await cp(
      new URL('./check-architecture.mjs', import.meta.url),
      `${fixture}/scripts/check-architecture.mjs`,
    );
    for (const [directory, name] of [
      ['packages/game-core', '@warwrit/game-core'],
      ['apps/web', '@warwrit/web'],
      ['apps/server', '@warwrit/server'],
    ])
      await writeFile(`${fixture}/${directory}/package.json`, JSON.stringify({ name }));
    await writeFile(`${fixture}/packages/game-core/src/index.ts`, 'export const canonical = 1;');
    await writeFile(`${fixture}/apps/server/src/index.ts`, 'export const write = 1;');
    execFileSync(process.execPath, [`${fixture}/scripts/check-architecture.mjs`]);
    for (const source of [
      "import { canonical } from '../../../packages/game-core/src/index.js';",
      "export { write } from '../../server/src/index.js';",
      "import { canonical } from '@warwrit/game-core';",
      "import('pg');",
      "import { sql } from 'kysely';",
      "import fs from 'node:fs';",
    ]) {
      await writeFile(`${fixture}/apps/web/src/index.ts`, source);
      const result = spawnSync(process.execPath, [`${fixture}/scripts/check-architecture.mjs`], {
        encoding: 'utf8',
      });
      assert.equal(result.status, 1, source);
      assert.match(
        result.stderr,
        /another workspace|forbidden workspace|authority boundary/u,
        source,
      );
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

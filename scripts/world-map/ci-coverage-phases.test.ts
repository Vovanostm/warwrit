import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { delimiter, dirname, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('merges actual captures without services and preserves the final target on failure', async () => {
  const root = process.cwd();
  await mkdir(resolve(root, 'output'), { recursive: true });
  const fixture = await mkdtemp(resolve(root, 'output/coverage-phases-'));
  try {
    const scripts = resolve(fixture, 'scripts/world-map');
    const world = 'scripts/world-map/check-world-lab-ci.sh';
    const painted = 'scripts/world-map/check-painted-game-ci.sh';
    const collector = resolve(scripts, 'runtime-coverage-node.mjs');
    const worldCapture = resolve(fixture, 'output/world/runtime.json');
    const paintedCapture = resolve(fixture, 'output/painted/runtime.json');
    const migrationCapture = resolve(fixture, 'output/world-lab-ci/migration.json');
    const unitCapture = resolve(fixture, 'output/unit/runtime.json');
    const target = resolve(fixture, 'coverage/coverage-final.json');
    const resourceLog = resolve(fixture, 'resources.log');
    const bin = resolve(fixture, 'bin');
    for (const path of [
      scripts,
      bin,
      dirname(worldCapture),
      dirname(paintedCapture),
      dirname(migrationCapture),
      dirname(unitCapture),
      resolve(fixture, 'output/world-lab-ci/sql'),
      dirname(target),
    ])
      await mkdir(path, { recursive: true });
    for (const name of [
      'check-world-lab-ci.sh',
      'check-painted-game-ci.sh',
      'runtime-coverage-node.mjs',
      'runtime-coverage-merge.mjs',
    ])
      await copyFile(resolve(root, 'scripts/world-map', name), resolve(scripts, name));
    await copyFile(
      resolve(root, 'scripts/compose-cli.sh'),
      resolve(fixture, 'scripts/compose-cli.sh'),
    );
    await symlink(resolve(root, 'node_modules'), resolve(fixture, 'node_modules'), 'dir');
    for (const name of ['docker', 'docker-compose', 'pnpm'])
      await writeFile(
        resolve(bin, name),
        '#!/bin/sh\nprintf "%s\\n" resource >> "$PHASE_RESOURCE_LOG"\nexit 88\n',
        { mode: 0o755 },
      );
    await writeFile(
      resolve(bin, 'node'),
      '#!/bin/sh\nif [ "$1" = scripts/world-map/runtime-coverage-merge.mjs ] && [ "$2" = "$PHASE_FAIL_SELF" ]; then exit 74; fi\nexec "$PHASE_REAL_NODE" "$@"\n',
      { mode: 0o755 },
    );
    const env = {
      ...process.env,
      PATH: bin + delimiter + process.env['PATH'],
      PHASE_RESOURCE_LOG: resourceLog,
      PHASE_REAL_NODE: process.execPath,
      PHASE_FAIL_SELF: '',
    };
    const options = { cwd: fixture, env, timeout: 15000, encoding: 'utf8' as const };
    const probe = resolve(fixture, 'probe.mjs');
    await writeFile(
      probe,
      'export function probe() { return 42; }\nexport function unused() { return 0; }\nfor (let n = 0; n < Number(process.argv[2]); n += 1) probe();\n',
    );
    for (const [path, calls] of [
      [worldCapture, 1],
      [paintedCapture, 2],
      [migrationCapture, 4],
      [unitCapture, 8],
    ] as const)
      execFileSync(process.execPath, ['--import', collector, probe, String(calls)], {
        ...options,
        env: { ...env, WORLD_LAB: '1', NODE_ENV: 'development', WORLD_LAB_RUNTIME_COVERAGE: path },
      });
    await writeFile(resolve(fixture, 'output/world-lab-ci/sql/coverage-final.json'), '{}');
    await writeFile(target, '{}');
    execFileSync(
      process.execPath,
      [resolve(scripts, 'runtime-coverage-merge.mjs'), unitCapture, target],
      options,
    );
    // Four real Node probe executions, not simulated game/SQL coverage.
    const rawWorld = JSON.parse(await readFile(worldCapture, 'utf8')) as { entries: unknown[] };
    const migration = JSON.parse(await readFile(migrationCapture, 'utf8')) as {
      entries: unknown[];
    };
    await writeFile(
      worldCapture,
      JSON.stringify({
        entries: [...rawWorld.entries, ...migration.entries],
        reports: [resolve(fixture, 'output/world-lab-ci/sql/coverage-final.json')],
      }),
    );
    for (const script of [world, painted]) {
      const invalid = spawnSync('bash', [script, '--unknown'], options);
      expect(invalid.status).toBe(2);
      const incomplete = spawnSync('bash', [script, '--capture'], options);
      expect(incomplete.status).toBe(2);
      const occupied = spawnSync('bash', [script, '--capture', worldCapture], options);
      expect(occupied.status).toBe(1);
      expect(await readFile(worldCapture, 'utf8')).toContain('entries');
    }
    execFileSync('bash', [world, '--merge', worldCapture], options);
    execFileSync('bash', [painted, '--merge', paintedCapture], options);
    const merged = JSON.parse(await readFile(target, 'utf8')) as Record<
      string,
      {
        fnMap: Record<string, { name: string }>;
        f: Record<string, number>;
      }
    >;
    const file = merged[probe];
    if (!file) throw new Error('Measured probe coverage missing');
    const counts = Object.entries(file.fnMap).map(([id, fn]) => [fn.name, file.f[id]]);
    expect(counts).toContainEqual(['probe', 15]);
    expect(counts).toContainEqual(['unused', 0]);
    expect(await readFile(resourceLog, 'utf8').catch(() => '')).toBe('');

    const before = await readFile(target, 'utf8');
    const self = resolve(dirname(worldCapture), 'merger.json');
    await rm(self);
    const failedSelf = spawnSync('bash', [world, '--merge', worldCapture], {
      ...options,
      env: { ...env, PHASE_FAIL_SELF: self },
    });
    expect(failedSelf.status).toBe(74);
    expect(await readFile(target, 'utf8')).toBe(before);
    expect(
      (await readdir(dirname(target))).filter((name) => name.startsWith('world-merge.')),
    ).toEqual([]);

    await rm(self);
    await writeFile(probe, '// changed after measurement\n', { flag: 'a' });
    const stale = spawnSync('bash', [world, '--merge', worldCapture], options);
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toContain('Stale runtime script');
    expect(await readFile(target, 'utf8')).toBe(before);
    const missing = spawnSync(
      'bash',
      [painted, '--merge', resolve(fixture, 'missing.json')],
      options,
    );
    expect(missing.status).not.toBe(0);
    expect(await readFile(target, 'utf8')).toBe(before);
    expect(await readFile(resourceLog, 'utf8').catch(() => '')).toBe('');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 20000);

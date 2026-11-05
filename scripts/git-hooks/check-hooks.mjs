import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');

for (const hook of ['pre-commit', 'pre-merge-commit']) {
  test(`${hook} checks staged content without running quality tools`, () => {
    mkdirSync(resolve(root, 'output'), { recursive: true });
    const fixture = mkdtempSync(resolve(root, 'output/commit-hook-'));
    const git = (...args) => execFileSync('git', args, { cwd: fixture });
    const runHook = () =>
      spawnSync('sh', [resolve(root, 'scripts/git-hooks', hook)], {
        cwd: fixture,
        env: { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` },
        encoding: 'utf8',
      });

    try {
      git('init', '--quiet');
      mkdirSync(resolve(fixture, 'bin'));
      // These fail if a hook reintroduces hidden tests or audits.
      for (const command of ['pnpm', 'fallow']) {
        writeFileSync(resolve(fixture, 'bin', command), '#!/bin/sh\nexit 97\n', { mode: 0o755 });
      }
      const file = resolve(fixture, 'source with spaces.ts');
      writeFileSync(file, 'export const value = 1;\n');
      git('add', '--', 'source with spaces.ts');
      assert.equal(runHook().status, 0, 'clean staged source needs no coverage or dependencies');

      writeFileSync(file, 'export const value = 2;  \n');
      writeFileSync(resolve(fixture, 'untracked.ts'), 'unused and unstaged  \n');
      assert.equal(runHook().status, 0, 'unstaged/untracked whitespace is outside the commit');
      git('add', '--', 'source with spaces.ts');
      const rejected = runHook();
      assert.equal(rejected.status, 2);
      assert.match(rejected.stdout + rejected.stderr, /trailing whitespace/);

      writeFileSync(file, 'export const value = 2;\n');
      git('add', '--', 'source with spaces.ts');
      writeFileSync(resolve(fixture, 'notes.md'), 'documentation  \n');
      git('add', '--', 'notes.md');
      assert.equal(runHook().status, 2, 'Markdown uses the same staged check');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}

test('Claude startup and tool hooks cannot duplicate the audit', () => {
  const settings = JSON.parse(readFileSync(resolve(root, '.claude/settings.json'), 'utf8'));
  assert.equal(settings.hooks.PreToolUse, undefined);
  assert.equal(settings.hooks.SessionStart[0].matcher, 'startup|resume');
  const startup = settings.hooks.SessionStart.flatMap((entry) => entry.hooks);
  assert.ok(
    startup.every(
      ({ command }) => command === 'bash "$CLAUDE_PROJECT_DIR/scripts/agent-preflight.sh"',
    ),
  );
});

test('preflight reports upstream guidance without unrelated inventories', () => {
  mkdirSync(resolve(root, 'output'), { recursive: true });
  const fixture = mkdtempSync(resolve(root, 'output/preflight-'));
  const git = (...args) => execFileSync('git', args, { cwd: fixture });
  const preflight = (base = 'main') => {
    const result = spawnSync('bash', [resolve(root, 'scripts/agent-preflight.sh'), base], {
      cwd: fixture,
      env: { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };

  try {
    git('init', '--quiet', '--initial-branch=main');
    git('config', 'user.name', 'Fixture');
    git('config', 'user.email', 'fixture@example.test');
    git('config', 'core.hooksPath', '/dev/null');
    mkdirSync(resolve(fixture, 'bin'));
    for (const command of ['node', 'pnpm']) {
      writeFileSync(
        resolve(fixture, 'bin', command),
        '#!/bin/sh\n[ "$1" = --version ] || exit 97\nprintf "fixture-version\\n"\n',
        { mode: 0o755 },
      );
    }
    writeFileSync(resolve(fixture, '.gitignore'), 'bin/\n');
    writeFileSync(resolve(fixture, 'AGENTS.md'), 'Original guidance\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'base');
    git('branch', 'worker');
    assert.doesNotMatch(preflight(), /Upstream agent guidance changed|worktrees:/);

    writeFileSync(resolve(fixture, 'ordinary.txt'), 'game change\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'ordinary change');
    git('switch', '--quiet', 'worker');
    assert.doesNotMatch(preflight(), /Upstream agent guidance changed/);

    git('switch', '--quiet', 'main');
    mkdirSync(resolve(fixture, '.codex'), { recursive: true });
    mkdirSync(resolve(fixture, 'docs/engineering'), { recursive: true });
    writeFileSync(resolve(fixture, '.codex/config.toml'), '[agents]\nmax_threads = 2\n');
    writeFileSync(resolve(fixture, 'docs/engineering/AGENT_TEAM.md'), 'Delegation guidance\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'agent configuration and delegation');
    git('switch', '--quiet', 'worker');
    const configurationOutput = preflight();
    assert.match(configurationOutput, /\.codex\/config\.toml/);
    assert.match(configurationOutput, /docs\/engineering\/AGENT_TEAM\.md/);
    assert.doesNotMatch(configurationOutput, /AGENTS\.md/);

    git('switch', '--quiet', 'main');
    writeFileSync(resolve(fixture, 'AGENTS.md'), 'Updated guidance\n');
    mkdirSync(resolve(fixture, '.agents/skills/fixture'), { recursive: true });
    writeFileSync(resolve(fixture, '.agents/skills/fixture/SKILL.md'), 'Scoped guidance\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'guidance change');
    git('switch', '--quiet', 'worker');
    const output = preflight();
    assert.match(output, /Upstream agent guidance changed/);
    assert.match(output, /AGENTS\.md/);
    assert.match(output, /\.agents\/skills\/fixture\/SKILL\.md/);
    assert.doesNotMatch(output, /ordinary\.txt|worktrees:/);
    assert.match(preflight('missing-base'), /not found locally/);
    git('switch', '--quiet', 'main');
    assert.doesNotMatch(preflight(), /Upstream agent guidance changed/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

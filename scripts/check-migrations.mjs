import { execFileSync } from 'node:child_process';

// A migration present on the base branch is released: it may not be modified,
// deleted or renamed. New migration files are always allowed.
const migrationsDirectory = 'apps/server/migrations';
const baseRef = process.argv[2] ?? process.env.MIGRATIONS_BASE_REF ?? 'origin/main';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

let mergeBase;
try {
  mergeBase = git(['merge-base', baseRef, 'HEAD']);
} catch {
  console.error(`migrations: cannot resolve merge base with ${baseRef}; fetch it first.`);
  process.exit(1);
}

const changes = git([
  'diff',
  '--name-status',
  '--diff-filter=DMRT',
  mergeBase,
  'HEAD',
  '--',
  migrationsDirectory,
]);

if (changes) {
  for (const line of changes.split('\n')) {
    console.error(`migrations: released migration changed (${line.replace(/\t/gu, ' ')})`);
  }
  console.error('migrations: add a new ordered up/down pair instead of editing a released one.');
  process.exit(1);
}

console.log(`migrations: no released migration changed since ${mergeBase.slice(0, 12)}.`);

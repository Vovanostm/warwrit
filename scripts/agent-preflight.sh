#!/usr/bin/env bash
# Read-only checkout identity for agent start/resume and handoff evidence.
set -euo pipefail

base_ref="${1:-origin/main}"
cd "$(git rev-parse --show-toplevel)"

printf 'cwd:        %s\n' "$PWD"
printf 'branch:     %s\n' "$(git branch --show-current || true)"
printf 'head:       %s\n' "$(git rev-parse HEAD)"
printf 'tree:       %s\n' "$(git rev-parse 'HEAD^{tree}')"
if git rev-parse --verify --quiet "$base_ref" >/dev/null; then
  printf 'base:       %s %s\n' "$base_ref" "$(git rev-parse "$base_ref")"
  printf 'merge-base: %s\n' "$(git merge-base "$base_ref" HEAD)"
  printf 'ahead/behind %s: %s\n' "$base_ref" "$(git rev-list --left-right --count "HEAD...$base_ref" | tr '\t' '/')"
else
  printf 'base:       %s not found locally (run git fetch)\n' "$base_ref"
fi
printf 'node:       %s\n' "$(node --version 2>/dev/null || echo missing)"
printf 'pnpm:       %s\n' "$(pnpm --version 2>/dev/null || echo missing)"
# pnpm skips `prepare` when node_modules is already current, so an existing
# clone may not have run scripts/install-git-hooks.sh yet.
if [ "$(git config --get core.hooksPath || true)" = scripts/git-hooks ] && [ -x scripts/git-hooks/pre-commit ]; then
  printf 'git gate:   active (fallow pre-commit)\n'
else
  printf 'git gate:   INACTIVE (run: pnpm run prepare)\n'
fi
printf 'dirty:\n'
git status --short | sed 's/^/  /'
printf 'worktrees:\n'
git worktree list | sed 's/^/  /'

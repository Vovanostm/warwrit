#!/bin/sh
# Points Git at the tracked hooks in scripts/git-hooks. Runs from `prepare` on
# pnpm install. core.hooksPath is shared by every worktree of the clone; a
# worktree whose checkout lacks scripts/git-hooks runs no hook at all.
set -eu

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

wanted=scripts/git-hooks
current="$(git config --get core.hooksPath || true)"
if [ -n "$current" ] && [ "$current" != "$wanted" ]; then
  echo "install-git-hooks: core.hooksPath is '$current'; leaving it. The fallow pre-commit gate is not active." >&2
  exit 0
fi
git config core.hooksPath "$wanted"

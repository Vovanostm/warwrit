#!/usr/bin/env bash
# Deterministic VALIDATE gate for one pipeline worktree. The coordinator advances
# an issue only on this script's exit code, never on a worker's own report.
# Usage: scripts/orca-validate.sh [worktree-path]
set -uo pipefail
cd "${1:-.}" || exit 2
mkdir -p .orca
git fetch -q origin main || { echo 'FAIL fetch origin/main'; exit 1; }
base="$(git merge-base origin/main HEAD)"
changed="$(git diff --name-only --diff-filter=ACMR "$base"...HEAD)"
code="$(printf '%s\n' "$changed" | grep -E '\.(ts|tsx|mjs|js)$' || true)"
status=0

step() {
  local name="$1"; shift
  if "$@" > ".orca/validate-$name.log" 2>&1; then
    echo "PASS $name"
  else
    echo "FAIL $name (see .orca/validate-$name.log)"
    status=1
  fi
}

step rebased test "$(git rev-list --count HEAD..origin/main)" -eq 0
step clean-tree test -z "$(git status --porcelain --untracked-files=no)"
step packages pnpm --filter @warwrit/protocol --filter @warwrit/game-core --filter @warwrit/testkit build
step typecheck pnpm typecheck
if [[ -n "$changed" ]]; then
  # shellcheck disable=SC2086
  step format pnpm exec prettier --check --ignore-unknown $changed
fi
if [[ -n "$code" ]]; then
  # shellcheck disable=SC2086
  step lint pnpm exec eslint $code
  # shellcheck disable=SC2086
  step related-tests pnpm exec vitest related --run --passWithNoTests $code
fi
exit "$status"

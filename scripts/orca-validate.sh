#!/usr/bin/env bash
# One assigned validation owner runs this local gate per relevant revision.
# Usage: scripts/orca-validate.sh [worktree] [base-ref] [--plan]
# --plan prints routing without executing checks, network or mutations.
set -euo pipefail
cd "${1:-.}"
base="$(git merge-base "${2:-origin/main}" HEAD)" || { echo 'FAIL invalid validation base'; exit 1; }
paths="$(git diff --name-only --no-renames "$base" HEAD)" || { echo 'FAIL reading changed paths'; exit 1; }
# --no-renames exposes both ends, so deletion/rename cannot hide a consumer.
route=docs
web=0
server=0
shared=0
broad=0
existing=()
code=()
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  [[ -f "$path" ]] && existing+=("$path")
  case "$path" in
    apps/web/src/* | apps/web/public/*) web=1 ;;
    apps/server/src/*) server=1 ;;
    packages/game-core/src/* | packages/protocol/src/* | packages/testkit/src/*) shared=1 ;;
    AGENTS.md | CLAUDE.md | README.md | CHANGELOG.md | docs/*.md | docs/**/*.md | .agents/**/*.md) ;;
    *) broad=1 ;;
  esac
  if [[ -f "$path" && "$path" =~ \.(ts|tsx|mjs|js)$ ]]; then code+=("$path"); fi
done <<< "$paths"
if ((broad)); then route=broad
elif ((shared)); then route=consumers
elif ((web && server)); then route=apps
elif ((web)); then route=web
elif ((server)); then route=server
fi
echo "ROUTE $route"
[[ "${3:-}" == --plan ]] && exit 0
mkdir -p .orca
status=0
step() {
  local name="$1"; shift
  if "$@" > ".orca/validate-$name.log" 2>&1; then echo "PASS $name"
  else echo "FAIL $name (see .orca/validate-$name.log)"; status=1; fi
}
step rebased test "$(git rev-list --count HEAD.."${2:-origin/main}")" -eq 0
step clean-tree test -z "$(git status --porcelain)"
step scope bash scripts/check-pr-scope.sh "${2:-origin/main}"
if ((${#existing[@]})); then step format pnpm exec prettier --check --ignore-unknown "${existing[@]}"; fi
case "$route" in
  docs)
    # No executable/config/asset paths reach this route. Read affected local
    # links as part of documentation review; removed targets need review too.
    echo 'REVIEW required: affected local links and deleted documentation targets'
    ;;
  broad)
    # Toolchain, scripts/CI, lockfiles, migration SQL and unknown paths fail
    # conservatively into the existing runner; never invent a second full gate.
    step verify pnpm verify
    ;;
  *)
    step packages pnpm --filter @warwrit/protocol --filter @warwrit/game-core --filter @warwrit/testkit build
    case "$route" in
      consumers | apps) step typecheck pnpm typecheck; targets=(packages apps) ;;
      web) step typecheck pnpm --filter @warwrit/web typecheck; targets=(apps/web) ;;
      server) step typecheck pnpm --filter @warwrit/server typecheck; targets=(apps/server) ;;
    esac
    if ((${#code[@]})); then step lint pnpm exec eslint "${code[@]}"; fi
    # Package/consumer tests cover deletion-only and CSS changes as well. The
    # Vitest default fails on zero tests: missing proof cannot become PASS.
    step tests pnpm exec vitest run "${targets[@]}"
    ;;
esac
# Commit hooks and required CI still own the coverage-dependent audit. Do not
# repeat it here against unchanged code or treat local routing as CI permission.
exit "$status"

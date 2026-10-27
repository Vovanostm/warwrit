#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pnpm exec tsx scripts/run-migration-smoke.ts
args=(run --mode integration .integration.test.ts)
if [[ -n "${WARWRIT_INTEGRATION_COVERAGE:-}" ]]; then
  args+=(--coverage --coverage.reportsDirectory "$WARWRIT_INTEGRATION_COVERAGE")
fi
pnpm exec vitest "${args[@]}"

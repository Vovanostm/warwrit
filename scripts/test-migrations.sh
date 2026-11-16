#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pnpm exec tsx scripts/run-migration-smoke.ts
args=(run --mode integration .integration.test.ts)
if [[ -n "${WARWRIT_INTEGRATION_COVERAGE:-}" ]]; then
  # V8 measurement is CPU-heavy; isolate files without changing in-test connection races or deadlines.
  args+=(--coverage --coverage.reportsDirectory "$WARWRIT_INTEGRATION_COVERAGE" --maxWorkers=1)
fi
pnpm exec vitest "${args[@]}"

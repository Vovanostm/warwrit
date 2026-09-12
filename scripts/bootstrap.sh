#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm exec prettier packages/testkit/src/company-care-practice.spec.test.ts --write
printf '\n--- B04 PRETTIER DIFF ---\n'
git diff -- packages/testkit/src/company-care-practice.spec.test.ts
printf '%s\n' '--- END B04 PRETTIER DIFF ---'
exit 1

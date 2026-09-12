#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_node='24.20.0'
actual_node="$(node --version 2>/dev/null || true)"
if [[ "$actual_node" != v24.20.* ]]; then
  printf 'Warwrit requires Node.js %s.x; found %s\n' "$required_node" "${actual_node:-none}" >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || {
  printf 'Docker is required for the migration smoke test.\n' >&2
  exit 1
}

docker compose version >/dev/null
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile

cleanup() {
  if [[ "${KEEP_INFRA:-0}" != '1' ]]; then
    docker compose down --remove-orphans >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker compose up -d --wait postgres
pnpm verify
pnpm test:combat:stress
pnpm test:migrations

printf 'Warwrit clean-checkout verification passed.\n'

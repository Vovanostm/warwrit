#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
unset DATABASE_URL

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

COMPOSE_FILE="$ROOT_DIR/compose.yaml"
COMPOSE_PROJECT="warwrit-verify-$(date +%s)-$$-${RANDOM}"
POSTGRES_HOST_PORT=''
INFRA_STARTED=0

compose() {
  POSTGRES_PORT=0 docker compose \
    --project-name "$COMPOSE_PROJECT" \
    --file "$COMPOSE_FILE" \
    "$@"
}

cleanup() {
  local exit_code=$?
  trap - EXIT

  if [[ "${KEEP_INFRA:-0}" == '1' ]]; then
    printf 'Kept verification PostgreSQL in Compose project %s on 127.0.0.1:%s.\n' \
      "$COMPOSE_PROJECT" "${POSTGRES_HOST_PORT:-unresolved}"
    printf 'Cleanup: docker compose --project-name %s --file %s down --volumes --remove-orphans\n' \
      "$COMPOSE_PROJECT" "$COMPOSE_FILE"
  elif [[ "$INFRA_STARTED" == '1' ]]; then
    if ! compose down --volumes --remove-orphans; then
      printf 'Failed to clean verification Compose project %s.\n' \
        "$COMPOSE_PROJECT" >&2
      [[ "$exit_code" -ne 0 ]] || exit_code=1
    fi
  fi
  exit "$exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

INFRA_STARTED=1
compose up -d --wait postgres
POSTGRES_BINDING="$(compose port postgres 5432)"
if [[ "$POSTGRES_BINDING" != 127.0.0.1:* ]]; then
  printf 'Could not resolve the isolated PostgreSQL loopback port: %s\n' \
    "$POSTGRES_BINDING" >&2
  exit 1
fi
POSTGRES_HOST_PORT="${POSTGRES_BINDING##*:}"
if [[ ! "$POSTGRES_HOST_PORT" =~ ^[1-9][0-9]*$ ]]; then
  printf 'Docker returned an invalid isolated PostgreSQL port: %s\n' \
    "$POSTGRES_HOST_PORT" >&2
  exit 1
fi
export DATABASE_URL="postgres://warwrit:warwrit@127.0.0.1:${POSTGRES_HOST_PORT}/warwrit"
printf 'Using disposable PostgreSQL at 127.0.0.1:%s in Compose project %s.\n' \
  "$POSTGRES_HOST_PORT" "$COMPOSE_PROJECT"

pnpm verify
pnpm test:combat:stress
pnpm test:migrations

printf 'Warwrit clean-checkout verification passed.\n'

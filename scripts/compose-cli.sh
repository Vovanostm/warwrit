#!/usr/bin/env bash

COMPOSE_CLI=()

select_compose_cli() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CLI=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    COMPOSE_CLI=(docker-compose)
  else
    printf 'No usable Docker Compose CLI found; checked "docker compose" and "docker-compose".\n' >&2
    return 1
  fi
}

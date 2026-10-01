#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/compose-cli.sh"

compose() {
  if [[ "${#COMPOSE_CLI[@]}" -eq 0 ]]; then
    select_compose_cli
  fi
  "${COMPOSE_CLI[@]}" --project-name warwrit-alpha-identity \
    -f "$repo_root/compose.identity.yaml" "$@"
}

case "${1:-}" in
  up)
    compose up -d --wait postgres dex
    ;;
  stop)
    compose stop postgres dex
    ;;
  status)
    compose ps
    ;;
  server)
    cd "$repo_root"
    export HOST=127.0.0.1 PORT=3107 NODE_ENV=development
    export DATABASE_URL=postgres://warwrit:warwrit-local-only@127.0.0.1:55433/warwrit
    export OIDC_ISSUER=http://127.0.0.1:5557/dex
    export OIDC_CLIENT_ID=warwrit-local
    export OIDC_CLIENT_SECRET=warwrit-local-only-secret
    export OIDC_REDIRECT_URI=http://127.0.0.1:3107/auth/callback
    export PUBLIC_ORIGIN=http://127.0.0.1:3107
    exec pnpm --filter @warwrit/server dev
    ;;
  *)
    printf 'Usage: %s <up|stop|status|server>\n' "$0" >&2
    exit 2
    ;;
esac

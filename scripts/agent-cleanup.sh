#!/usr/bin/env bash
# Close one task browser. Stop the lab only with an explicit current-task grant:
# WARWRIT_LAB_OWNER=<session> scripts/agent-cleanup.sh <session>.
# Never infer lab ownership from shared worktree ports. Exit 1 on failed checks.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
session="${1:-${PLAYWRIGHT_CLI_SESSION:-}}"
left=0

pwcli() {
  if command -v playwright-cli > /dev/null 2>&1; then playwright-cli "$@"
  else npx --yes --package @playwright/cli playwright-cli "$@"; fi
}

if [[ -n "$session" ]]; then
  if ! pwcli -s="$session" close; then
    echo "UNVERIFIED browser close failed for $session" >&2
    left=1
  fi
  listing="$(pwcli list)"
  status=$?
  if (( status != 0 )); then
    printf '%s\n' "$listing" >&2
    echo "UNVERIFIED browser listing failed (exit $status)" >&2
    left=1
  elif awk -v header="- $session:" '$0 == header { found=1; next } found { exit($0 !~ /status: open/) } END { if (!found) exit 1 }' <<< "$listing"; then
    echo "LEFTOVER playwright-cli session $session is still open"
    left=1
  fi
fi

if [[ -n "$session" && "${WARWRIT_LAB_OWNER:-}" == "$session" ]]; then
  if [[ ! -f .worktree-ports ]]; then
    echo "UNVERIFIED owned lab has no .worktree-ports" >&2
    left=1
  else
    bash scripts/orca-play.sh stop || left=1
    # shellcheck disable=SC1091
    . ./.worktree-ports
    holders="$(lsof -nP -tiTCP:"$COMBAT_API_PORT" -tiTCP:"$COMBAT_WEB_PORT" -sTCP:LISTEN)"
    status=$?
    if (( status > 1 )); then
      echo "UNVERIFIED lab port inspection failed (exit $status)" >&2
      left=1
    elif [[ -n "$holders" ]]; then
      echo "LEFTOVER ports $COMBAT_API_PORT/$COMBAT_WEB_PORT held by pid $holders"
      left=1
    fi
  fi
fi

(( left == 0 )) && echo "CLEAN${session:+ (session $session)}"
exit "$left"

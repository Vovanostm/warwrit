#!/usr/bin/env bash
# Close what an agent opened for a check: its playwright-cli browser session and
# this worktree's combat lab. Never touches other sessions or other worktrees.
# Exit 1 lists what is still running so the agent (or its wrapper) sees it.
# Usage: scripts/agent-cleanup.sh [playwright-session]  (default: $PLAYWRIGHT_CLI_SESSION)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
session="${1:-${PLAYWRIGHT_CLI_SESSION:-}}"
left=0

pwcli() {
  if command -v playwright-cli > /dev/null 2>&1; then playwright-cli "$@"
  else npx --yes --package @playwright/cli playwright-cli "$@"; fi
}

if [[ -n "$session" ]]; then
  pwcli -s="$session" close > /dev/null 2>&1 || true
  # `list` prints "- <name>:" then "  - status: open" for every live browser.
  if pwcli list 2>/dev/null | grep -A1 -F -- "- $session:" | grep -q 'status: open'; then
    echo "LEFTOVER playwright-cli session $session is still open"
    left=1
  fi
fi

if [[ -f .worktree-ports ]]; then
  bash scripts/orca-play.sh stop > /dev/null
  # shellcheck disable=SC1091
  . ./.worktree-ports
  holders="$(lsof -nP -tiTCP:"$COMBAT_API_PORT" -tiTCP:"$COMBAT_WEB_PORT" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')"
  if [[ -n "$holders" ]]; then
    echo "LEFTOVER ports $COMBAT_API_PORT/$COMBAT_WEB_PORT held by pid $holders"
    left=1
  fi
fi

(( left == 0 )) && echo "CLEAN${session:+ (session $session)}"
exit "$left"

#!/usr/bin/env bash
# Print the pipeline state a coordinator tick can act on, as stable text. The
# tick runs the LLM coordinator only when this text changed since the last tick
# (or the heartbeat expired), so unchanged state costs no model tokens.
# Usage: scripts/orca-state-digest.sh <run-id> <mailbox-handle> [epic]
set -uo pipefail
run="$1" mailbox="$2" epic="${3:-217}"
repo="Vovanostm/warwrit"

# A new calendar day wakes one tick for the daily metrics and scout.
echo "day $(date +%F)"
echo "main $(git ls-remote origin refs/heads/main | cut -c1-12)"
gh issue list -R "$repo" --state open --limit 200 --json number,labels,updatedAt \
  --jq '.[] | select(any(.labels[]; .name | startswith("agent:"))) | "issue \(.number) \([.labels[].name] | sort | join(",")) \(.updatedAt)"'
gh issue view "$epic" -R "$repo" --json comments --jq '"epic comments \(.comments | length)"'
gh pr list -R "$repo" --state open --limit 50 --json number,headRefOid,labels,statusCheckRollup \
  --jq '.[] | "pr \(.number) \(.headRefOid[0:12]) \([.labels[].name] | sort | join(",")) \([.statusCheckRollup[]? | if (.conclusion // "") == "" then .status else .conclusion end] | sort | join(","))"'
ORCA_TERMINAL_HANDLE="$mailbox" orca orchestration check --run "$run" --peek --json 2>/dev/null |
  python3 -I -c 'import json,sys; m=json.load(sys.stdin)["result"]["messages"]; print("mail", len(m), max((x["created_at"] for x in m), default=""))' 2>/dev/null ||
  echo "mail unknown"
# Worker results land here even when the Orca mailbox is unavailable.
printf 'worker results %s\n' "$(ls -t "$HOME"/orca/workspaces/warwrit/*/.orca/runs/*/result.json 2>/dev/null | head -n 1)"
for wt in "$HOME"/orca/workspaces/warwrit/*/; do
  [[ "$wt" == */pipeline-coordinator/ ]] && continue
  printf 'worktree %s %s dirty=%s\n' "$(basename "$wt")" "$(git -C "$wt" rev-parse --short=12 HEAD 2>/dev/null)" \
    "$(git -C "$wt" status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')"
done

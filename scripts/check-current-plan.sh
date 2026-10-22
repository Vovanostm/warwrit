#!/usr/bin/env bash
# CURRENT_PLAN starts with one status block of at most 40 non-empty lines
# (AGENTS.md "Orchestration"): the first `## ` section, outside code fences,
# which is not history and names the coordinator. Dated history goes below it.
# Usage: scripts/check-current-plan.sh [file]
set -euo pipefail
file="${1:-docs/engineering/CURRENT_PLAN.md}"
limit=40
[[ -f "$file" ]] || { echo "FAIL plan: $file not found."; exit 1; }

# Prints: <non-empty lines>\t<has coordinator line 0|1>\t<title>
read -r lines coordinator title < <(awk '
  /^```/ { fenced = !fenced }
  !fenced && /^## / { n++; if (n == 1) title = substr($0, 4); next }
  n == 1 && NF { lines++; if (tolower($0) ~ /coordinator/) coordinator = 1 }
  END { printf "%d\t%d\t%s\n", lines, coordinator, title }
' "$file" | tr '\t' ' ')

status=0
if [[ -z "${title:-}" ]] || [[ "$(tr '[:upper:]' '[:lower:]' <<< "$title")" == *history* ]] || ((lines == 0)); then
  echo "FAIL plan: $file has no status block before its history (first ## section: \"${title:-none}\", $lines lines)."
  status=1
elif ((lines > limit)); then
  echo "FAIL plan: status block \"$title\" has $lines non-empty lines (limit $limit)."
  echo "Rewrite it in place: coordinator, scope, open PRs, blockers, next step; move details to evidence or history."
  status=1
elif ((coordinator == 0)); then
  echo "FAIL plan: status block \"$title\" does not name the coordinator."
  status=1
else
  echo "PASS plan: status block \"$title\" has $lines non-empty lines (limit $limit)"
fi
exit "$status"

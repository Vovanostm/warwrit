#!/usr/bin/env bash
# CURRENT_PLAN starts with one status block of at most 40 lines (AGENTS.md
# "Orchestration"): the text between the first and the second `## ` heading.
# Dated history goes below it. Usage: scripts/check-current-plan.sh [file]
set -euo pipefail
file="${1:-docs/engineering/CURRENT_PLAN.md}"
limit=40

headings="$(grep -c '^## ' "$file" || true)"
if ((headings < 2)); then
  echo "FAIL plan: $file needs a status block (## …) followed by a history heading."
  exit 1
fi
lines="$(awk '/^## /{n++; next} n==1 && NF' "$file" | wc -l | tr -d ' ')"
title="$(grep -m1 '^## ' "$file")"
if ((lines > limit)); then
  echo "FAIL plan: status block \"$title\" has $lines non-empty lines (limit $limit)."
  echo "Rewrite it in place: coordinator, scope, open PRs, blockers, next step; move details to evidence or history."
  exit 1
fi
echo "PASS plan: status block \"$title\" has $lines non-empty lines (limit $limit)"

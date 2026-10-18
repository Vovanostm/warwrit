#!/usr/bin/env bash
# Move GitHub issues to one pipeline state label (agent:<state>), removing the others.
# Usage: scripts/orca-issue-state.sh <state> <issue>...
set -euo pipefail
states=(ready planning implementing validating review pr blocked needs-owner done)
target="$1"; shift
[[ " ${states[*]} " == *" $target "* ]] || { echo "unknown state: $target" >&2; exit 2; }
remove=()
for s in "${states[@]}"; do [[ "$s" == "$target" ]] || remove+=(--remove-label "agent:$s"); done
for issue in "$@"; do
  gh issue edit "$issue" -R Vovanostm/warwrit --add-label "agent:$target" "${remove[@]}" >/dev/null
  echo "#$issue -> agent:$target"
done

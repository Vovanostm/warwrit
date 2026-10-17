#!/usr/bin/env bash
# Before Orca removes a worktree, stop only the combat-lab servers started from it.
set -euo pipefail
root="$(pwd -P)"
[[ -f .worktree-ports ]] || exit 0

# The launcher's trap stops pnpm/tsx/vite; killing only a listener leaves the launcher waiting.
launcher_of() {
  local pid="$1"
  while [[ -n "$pid" && "$pid" -gt 1 ]]; do
    ps -o command= -p "$pid" | grep -q 'scripts/start-sprite-combat.sh' && { echo "$pid"; return; }
    pid="$(ps -o ppid= -p "$pid" | tr -d ' ')"
  done
}

while IFS='=' read -r _ port; do
  [[ "$port" =~ ^[0-9]+$ ]] || continue
  for pid in $(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true); do
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
    [[ "$cwd" == "$root" || "$cwd" == "$root"/* ]] || continue
    launcher="$(launcher_of "$pid")"
    kill ${launcher:+"$launcher"} "$pid" 2>/dev/null || true
  done
done < .worktree-ports

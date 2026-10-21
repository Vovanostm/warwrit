#!/usr/bin/env bash
# Start or stop this worktree's combat lab for a builder or evaluator, and prove
# it answers before anyone plays it. Exit 3 means the environment, not the code,
# failed: the gate reports BLOCKED_ENV instead of REWORK.
# Usage: scripts/orca-play.sh start|stop|status
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 3
mkdir -p .orca
pidfile=.orca/play.pid
log=.orca/play.log

[[ -f .worktree-ports ]] || bash scripts/orca-setup.sh >> "$log" 2>&1 || { echo "BLOCKED_ENV setup failed ($log)"; exit 3; }
# shellcheck disable=SC1091
. ./.worktree-ports
web="http://127.0.0.1:$COMBAT_WEB_PORT/combat-lab"
api="http://127.0.0.1:$COMBAT_API_PORT/health/live"

up() { curl -fsS -o /dev/null --max-time 3 "$api" 2>/dev/null && curl -fsS -o /dev/null --max-time 3 "$web" 2>/dev/null; }
running() { [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; }

# The launcher's trap kills its pnpm children, but their node servers survive and
# keep the private ports; stop them by port too (the ports belong to this worktree).
listeners() { lsof -nP -tiTCP:"$COMBAT_API_PORT" -tiTCP:"$COMBAT_WEB_PORT" -sTCP:LISTEN 2>/dev/null; }
stop() {
  if running; then
    kill -TERM "$(cat "$pidfile")" 2>/dev/null
    for _ in $(seq 20); do running || break; sleep 1; done
  fi
  rm -f "$pidfile"
  local pids
  pids="$(listeners)"
  [[ -z "$pids" ]] && return 0
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null
  for _ in $(seq 10); do [[ -z "$(listeners)" ]] && return 0; sleep 1; done
  # shellcheck disable=SC2086
  kill -KILL $(listeners) 2>/dev/null || true
}

case "${1:-status}" in
  start)
    if running && up; then echo "READY $web"; exit 0; fi
    stop
    for port in "$COMBAT_API_PORT" "$COMBAT_WEB_PORT"; do
      if lsof -nP -iTCP:"$port" -sTCP:LISTEN > /dev/null 2>&1; then
        echo "BLOCKED_ENV port $port is held by another process: $(lsof -nP -tiTCP:"$port" -sTCP:LISTEN | head -1)"
        exit 3
      fi
    done
    nohup bash scripts/start-sprite-combat.sh > "$log" 2>&1 &
    echo $! > "$pidfile"
    for _ in $(seq 120); do
      if up; then echo "READY $web"; exit 0; fi
      running || break
      sleep 1
    done
    echo "BLOCKED_ENV combat lab did not answer within 120 s; last log lines:"
    tail -n 15 "$log"
    stop
    exit 3
    ;;
  stop) stop; echo STOPPED ;;
  status) if running && up; then echo "READY $web"; else echo DOWN; exit 1; fi ;;
  *) echo 'usage: scripts/orca-play.sh start|stop|status'; exit 2 ;;
esac

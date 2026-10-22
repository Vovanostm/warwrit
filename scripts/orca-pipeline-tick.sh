#!/usr/bin/env bash
# One headless coordinator tick of the Warwrit Orca issue pipeline.
# Runs Codex (organization-allowed: --approve-for-me) in the coordinator scratch
# worktree with the warwrit-orca skill. A lock prevents overlapping ticks and
# every tick re-reads GitHub and Orca state.
# Usage: scripts/orca-pipeline-tick.sh [coordinator-worktree]
#        scripts/orca-pipeline-tick.sh --loop [minutes]   (visible loop in a terminal; default 10)
set -uo pipefail
# The loop keeps the Mac awake while it runs, ticks again as soon as a worker
# reports, and counts the interval in wall-clock time: macOS `sleep` stops
# while the system sleeps, so one long sleep could stall the loop for hours.
if [[ "${1:-}" == "--loop" ]]; then
  caffeinate -i -w $$ &
  env_file="$HOME/orca/workspaces/warwrit/pipeline-coordinator/.orca/pipeline/coordinator.env"
  mail_since() {
    [[ -f "$env_file" ]] || return 1
    (. "$env_file" && ORCA_TERMINAL_HANDLE="$MAILBOX" orca orchestration check --run "$RUN" --peek --json 2>/dev/null) \
      | python3 -I -c 'import json,sys;m=json.load(sys.stdin)["result"]["messages"];sys.exit(0 if any(x["created_at"]>sys.argv[1] for x in m) else 1)' "$1"
  }
  # Each tick checks out origin/main, which can update this script; restart the
  # loop on the new version instead of running a stale one until someone notices.
  self_version="$(stat -f %m "$0" 2>/dev/null || stat -c %Y "$0")"
  while true; do
    started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    bash "$0"
    if [[ "$(stat -f %m "$0" 2>/dev/null || stat -c %Y "$0")" != "$self_version" ]]; then
      echo "loop: script changed on main, restarting"
      exec bash "$0" --loop "${2:-10}"
    fi
    # An unchanged state costs only the digest, so the loop can look often.
    next=$(( $(date +%s) + ${2:-10} * 60 ))
    while (( $(date +%s) < next )) && ! mail_since "$started"; do sleep 60; done
  done
fi

repo="Vovanostm/warwrit"
coord="${1:-$HOME/orca/workspaces/warwrit/pipeline-coordinator}"
state="$coord/.orca/pipeline"
mkdir -p "$state/ticks"
# The lock is also the coordinator lease (AGENTS.md "Orchestration"): another
# coordinator, such as a desktop mission, writes its own owner.txt here and the
# tick then stays out until that owner releases it. Only a lock left by a dead
# tick process, or an empty legacy lock older than 90 minutes, is reclaimed.
lock="$state/tick.lock"
me="orca-pipeline-tick pid=$$"
take_lock() { mkdir "$lock" 2>/dev/null && printf '%s\n' "$me" > "$lock/owner.txt"; }
if ! take_lock; then
  owner="$(head -n 1 "$lock/owner.txt" 2>/dev/null || true)"
  if [[ "$owner" == "orca-pipeline-tick pid="* ]] && ! kill -0 "${owner##*pid=}" 2>/dev/null; then
    rm -rf "$lock"
  elif [[ -z "$owner" && -n "$(find "$lock" -maxdepth 0 -mmin +90 2>/dev/null)" ]]; then
    rm -rf "$lock"
  else
    echo "coordinator lease held by: ${owner:-an unfinished tick} ($lock/owner.txt)"
    exit 0
  fi
  take_lock || { echo 'tick lock taken concurrently'; exit 0; }
fi
trap '[[ "$(head -n 1 "$lock/owner.txt" 2>/dev/null)" == "$me" ]] && rm -rf "$lock"' EXIT

cd "$coord" || exit 1
git fetch -q origin && git checkout -q --detach origin/main || exit 1

# Coordinator identity: one Run and one mailbox terminal, re-created if Orca lost them.
env_file="$state/coordinator.env"
[[ -f "$env_file" ]] && . "$env_file"
repo_id="$(orca repo list --json | python3 -I -c 'import json,sys;print([r["id"] for r in json.load(sys.stdin)["result"]["repos"] if r["path"].endswith("/learn/warwrit")][0])')"
# A mailbox terminal can survive an Orca restart without a stable pane, and then
# `check` fails with stable_pane_required; probe the call workers depend on.
mailbox_ok() {
  [[ -n "${MAILBOX:-}" && -n "${RUN:-}" ]] &&
    ORCA_TERMINAL_HANDLE="$MAILBOX" orca orchestration check --run "$RUN" --peek --json 2>/dev/null |
    python3 -I -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("ok") else 1)'
}
if ! mailbox_ok; then
  MAILBOX="$(orca terminal create --worktree "id:$repo_id::$coord" --title 'pipeline mailbox' \
    --command "echo 'Warwrit pipeline coordinator mailbox; input is ignored.'; exec cat >/dev/null" --json \
    | python3 -I -c 'import json,sys;print(json.load(sys.stdin)["result"]["terminal"]["handle"])')"
  RUN=""
fi
export ORCA_TERMINAL_HANDLE="$MAILBOX"
if [[ -z "${RUN:-}" ]]; then
  RUN="$(orca orchestration run-create --objective "Warwrit issue pipeline (epic #217)" --json \
    | python3 -I -c 'import json,sys;print(json.load(sys.stdin)["result"]["run"]["id"])')"
else
  orca orchestration run-use --id "$RUN" --json >/dev/null 2>&1 || true
fi
printf 'MAILBOX=%s\nRUN=%s\nREPO_ID=%s\n' "$MAILBOX" "$RUN" "$repo_id" > "$env_file"

# Live state only: tick history and finished slices go to the archive, so the
# context every model call resends stays small.
bash scripts/orca-checkpoint-compact.sh "$state"

# Event-driven tick: skip the model when nothing it could act on changed since
# the last successful tick, except for a heartbeat every 3 hours.
digest="$state/digest.txt"
now_state="$(bash scripts/orca-state-digest.sh "$RUN" "$MAILBOX")"
if [[ -f "$digest" && "$now_state" == "$(cat "$digest")" && -z "$(find "$digest" -mmin +180 2>/dev/null)" ]]; then
  echo "tick skipped: state unchanged since $(date -r "$digest" +%H:%M)"
  exit 0
fi
printf '%s\n' "$now_state" > "$state/digest-before.txt"

stamp="$(date +%Y%m%dT%H%M%S)"
prompt="You are the Warwrit pipeline coordinator. Perform exactly ONE tick of the pipeline defined in .agents/skills/warwrit-orca/SKILL.md for $repo, using the slice plan .agents/skills/warwrit-orca/slices/epic-217.json. Orca run: $RUN. Orca repo id: $repo_id. Your mailbox handle is already in ORCA_TERMINAL_HANDLE. Read the skill completely first. The current state snapshot is $state/digest-before.txt; re-read from GitHub or Orca only what you are about to change. Every command output stays in your context for the rest of the tick, so read each file once and query state narrowly: one slice with jq from checkpoint.json or slices-local.json, single fields or the last comments with gh --jq; never print those state files, worker lists or issue threads whole. Older tick history is in $state/archive/checkpoint-history.jsonl. Then act and stop when nothing more can advance in this tick. Merge only as the skill's Gate tiers allow (owner decision 2026-10-19); never merge a PR labelled agent:blocked. End with a short status summary."
codex exec --approve-for-me -C "$coord" \
  --add-dir "$HOME/orca/workspaces/warwrit" --add-dir "$(cd "$(git rev-parse --git-common-dir)" && pwd -P)" \
  --add-dir "$HOME/Library/pnpm" \
  -o "$state/ticks/$stamp.md" --json "$prompt" > "$state/ticks/$stamp.jsonl" 2> "$state/ticks/$stamp.err"
code=$?
# Remember the state this tick left behind, so the next tick runs only on news.
(( code == 0 )) && bash scripts/orca-state-digest.sh "$RUN" "$MAILBOX" > "$digest"
echo "tick $stamp exit $code: $state/ticks/$stamp.md"
exit "$code"

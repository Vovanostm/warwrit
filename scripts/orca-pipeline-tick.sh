#!/usr/bin/env bash
# One headless coordinator tick of the Warwrit Orca issue pipeline.
# Runs Codex (organization-allowed: --approve-for-me) in the coordinator scratch
# worktree with the warwrit-orca skill. A lock prevents overlapping ticks and
# every tick re-reads GitHub and Orca state.
# Usage: scripts/orca-pipeline-tick.sh [coordinator-worktree]
#        scripts/orca-pipeline-tick.sh --loop [minutes]   (visible loop in an Orca terminal)
set -uo pipefail
if [[ "${1:-}" == "--loop" ]]; then
  while true; do bash "$0"; sleep $(( ${2:-20} * 60 )); done
fi

repo="Vovanostm/warwrit"
coord="${1:-$HOME/orca/workspaces/warwrit/pipeline-coordinator}"
state="$coord/.orca/pipeline"
mkdir -p "$state/ticks"
lock="$state/tick.lock"
if ! mkdir "$lock" 2>/dev/null; then
  if [[ -n "$(find "$lock" -maxdepth 0 -mmin +90 2>/dev/null)" ]]; then rmdir "$lock" && mkdir "$lock"; else echo 'tick already running'; exit 0; fi
fi
trap 'rmdir "$lock"' EXIT

cd "$coord" || exit 1
git fetch -q origin && git checkout -q --detach origin/main || exit 1

# Coordinator identity: one Run and one mailbox terminal, re-created if Orca lost them.
env_file="$state/coordinator.env"
[[ -f "$env_file" ]] && . "$env_file"
repo_id="$(orca repo list --json | python3 -I -c 'import json,sys;print([r["id"] for r in json.load(sys.stdin)["result"]["repos"] if r["path"].endswith("/learn/warwrit")][0])')"
if [[ -z "${MAILBOX:-}" ]] || ! orca terminal show --terminal "$MAILBOX" --json >/dev/null 2>&1; then
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

stamp="$(date +%Y%m%dT%H%M%S)"
prompt="You are the Warwrit pipeline coordinator. Perform exactly ONE tick of the pipeline defined in .agents/skills/warwrit-orca/SKILL.md for $repo, using the slice plan .agents/skills/warwrit-orca/slices/epic-217.json. Orca run: $RUN. Orca repo id: $repo_id. Your mailbox handle is already in ORCA_TERMINAL_HANDLE. Read the skill completely first, then act and stop when nothing more can advance in this tick. Never merge without the owner's agent:merge-approved label. End with a short status summary."
codex exec --approve-for-me -C "$coord" \
  --add-dir "$HOME/orca/workspaces/warwrit" --add-dir "$(cd "$(git rev-parse --git-common-dir)" && pwd -P)" \
  --add-dir "$HOME/Library/pnpm" \
  -o "$state/ticks/$stamp.md" --json "$prompt" > "$state/ticks/$stamp.jsonl" 2> "$state/ticks/$stamp.err"
code=$?
echo "tick $stamp exit $code: $state/ticks/$stamp.md"
exit "$code"

#!/usr/bin/env bash
# Coordinator helper: start one headless Codex worker for an Orca task.
# Opens a plain shell in the worktree, binds a Dispatch to it (no prompt
# injection) and runs scripts/orca-codex-worker.sh there.
# Usage: scripts/orca-start-worker.sh <run-id> <task-id> <worktree-path> <brief-file-in-worktree>
# Needs ORCA_TERMINAL_HANDLE (the coordinator mailbox) in the environment.
set -euo pipefail
run="$1" task="$2" path="$3" brief="$4"
repo_id="$(orca repo list --json | python3 -I -c 'import json,sys;print([r["id"] for r in json.load(sys.stdin)["result"]["repos"] if r["path"].endswith("/learn/warwrit")][0])')"
handle="$(orca terminal create --worktree "id:$repo_id::$path" --title "codex $task" --json \
  | python3 -I -c 'import json,sys;print(json.load(sys.stdin)["result"]["terminal"]["handle"])')"
for _ in $(seq 60); do  # wait for the login shell prompt before typing
  orca terminal read --terminal "$handle" --limit 3 --json \
    | python3 -I -c 'import json,sys;t=json.load(sys.stdin)["result"]["terminal"]["tail"];sys.exit(0 if any("➜" in l or l.rstrip().endswith(("$","%",">")) for l in t) else 1)' && break
  sleep 1
done
dispatch="$(orca orchestration dispatch --task "$task" --to "$handle" --run "$run" --json \
  | python3 -I -c 'import json,sys;d=json.load(sys.stdin)["result"]["dispatch"];print(d["id"])')"
orca terminal send --terminal "$handle" --text "bash scripts/orca-codex-worker.sh $task $dispatch $handle $brief" --enter --json > /dev/null
echo "$handle $dispatch"

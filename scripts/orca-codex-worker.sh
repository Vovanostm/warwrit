#!/usr/bin/env bash
# Headless Codex worker for the Orca issue pipeline. Runs `codex exec` with the
# organization-allowed sandbox (workspace-write, approvals via automatic review)
# and reports the result to the Orca Dispatch itself, so no TUI, prompt paste or
# foreground race is involved.
# Usage: scripts/orca-codex-worker.sh <task-id> <dispatch-id> <terminal-handle> <brief-file>
set -uo pipefail
task="$1" dispatch="$2" handle="$3" brief="$4"
root="$(git rev-parse --show-toplevel)"
common="$(cd "$(git rev-parse --git-common-dir)" && pwd -P)"
out="$root/.orca/runs/$task"
mkdir -p "$out"
schema="$root/.agents/skills/warwrit-orca/worker-result.schema.json"

codex exec --approve-for-me --sandbox workspace-write -C "$root" \
  --add-dir "$common" --add-dir "$HOME/Library/pnpm" --add-dir "$HOME/Library/Caches/ms-playwright" \
  --output-schema "$schema" -o "$out/result.json" --json - < "$brief" \
  > "$out/events.jsonl" 2> "$out/stderr.log"
code=$?

{ IFS= read -r outcome; IFS= read -r summary; IFS= read -r files; IFS= read -r report; } < <(python3 -I - "$out/result.json" "$code" <<'PY'
import json, sys
path, code = sys.argv[1], int(sys.argv[2])
try:
    r = json.load(open(path))
    outcome = r["outcome"] if code == 0 else "failed"
    print(outcome, json.dumps(r["summary"]), json.dumps(",".join(r["files_modified"])), json.dumps(r["report_path"]), sep="\n")
except Exception as e:
    print("failed", json.dumps(f"codex exec exited {code}; no valid result ({e}). See .orca/runs logs."), '""', '""', sep="\n")
PY
)
args=(--from "$handle" --type worker_done --subject "codex exec $outcome"
  --body "$(python3 -I -c 'import json,sys;print(json.loads(sys.argv[1]))' "$summary")"
  --task-id "$task" --dispatch-id "$dispatch" --outcome "$outcome")
files="$(python3 -I -c 'import json,sys;print(json.loads(sys.argv[1]))' "$files")"
report="$(python3 -I -c 'import json,sys;print(json.loads(sys.argv[1]))' "$report")"
[[ -n "$files" ]] && args+=(--files-modified "$files")
[[ -n "$report" ]] && args+=(--report-path "$root/$report")
orca orchestration send "${args[@]}" --json > "$out/worker-done.json" 2>&1
echo "worker $task: $outcome (codex exit $code); logs in $out"

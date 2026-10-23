#!/usr/bin/env bash
# Headless Codex worker for the Orca issue pipeline. Runs `codex exec` with the
# organization-allowed mode: --approve-for-me = workspace-write sandbox with approvals via automatic review
# and reports the result to the Orca Dispatch itself, so no TUI, prompt paste or
# foreground race is involved.
# Usage: scripts/orca-codex-worker.sh <task-id> <dispatch-id> <terminal-handle> <brief-file>
# Give owned background children normal signal dispositions, including INT.
set -muo pipefail
task="$1" dispatch="$2" handle="$3" brief="$4"
root="$(git rev-parse --show-toplevel)"
common="$(cd "$(git rev-parse --git-common-dir)" && pwd -P)"
out="$root/.orca/runs/$task"
mkdir -p "$out"
schema="$root/.agents/skills/warwrit-orca/worker-result.schema.json"

# One named headless browser per task; the briefs' playwright-cli calls pick it up.
export PLAYWRIGHT_CLI_SESSION="warwrit-$task"
child="" interrupted=0 finalizing=0 finalized=0 code=1 startup_failed=0
on_signal() {
  interrupted="$2"
  if [[ -n "$child" && "$finalizing" == 0 ]]; then kill -"$1" "$child" 2>/dev/null || true; fi
}
wait_child() {
  local status
  while true; do
    wait "$child"; status=$?
    # A trapped signal interrupts wait before the owned process has exited.
    if (( interrupted != 0 )) && kill -0 "$child" 2>/dev/null; then continue; fi
    break
  done
  child=""
  return "$status"
}
finalize() {
  (( finalized == 0 )) || return
  finalized=1 finalizing=1
  bash "$root/scripts/agent-cleanup.sh" "$PLAYWRIGHT_CLI_SESSION" > "$out/cleanup.log" 2>&1 &
  child=$!
  wait_child; cleanup_code=$?
  { IFS= read -r outcome; IFS= read -r summary; IFS= read -r files; IFS= read -r report; } < <(python3 -I - "$out/result.json" "$code" "$cleanup_code" "$interrupted" "$startup_failed" "$out" <<'PY'
import json, sys
path, code, cleanup, interrupted, startup, out = sys.argv[1:]
code, cleanup, interrupted, startup = map(int, (code, cleanup, interrupted, startup))
try:
    r = json.load(open(path))
    source = r["outcome"]
    summary = r["summary"]
except Exception as e:
    source, summary, r = "unavailable", f"No valid source result ({e})", {}
failures = []
if startup: failures.append(f"MCP setup failed; see {out}/mcp.log")
if interrupted: failures.append(f"interrupted (exit {interrupted})")
if cleanup: failures.append(f"cleanup failed (exit {cleanup}); see {out}/cleanup.log")
outcome = source if code == 0 and not failures and source in ("succeeded", "failed") else "failed"
summary = f"Source verdict: {source}; Codex exit {code}. {summary}"
if failures: summary += " Infrastructure: " + "; ".join(failures)
try:
    print(outcome, json.dumps(summary), json.dumps(",".join(r.get("files_modified", []))), json.dumps(r.get("report_path", "")), sep="\n")
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
  send_code=$?
  echo "worker $task: $outcome (codex exit $code); logs in $out"
  if (( interrupted != 0 )); then exit "$interrupted"; fi
  [[ "$outcome" == succeeded && "$send_code" == 0 ]] || exit 1
}
trap finalize EXIT
trap 'on_signal TERM 143' TERM
trap 'on_signal HUP 129' HUP
trap 'on_signal INT 130' INT

# Status-check discovery before allowing any Codex execution.
bash "$root/scripts/codex-lean-mcp.sh" > "$out/mcp.args" 2> "$out/mcp.log" &
child=$!
wait_child; code=$?
(( interrupted == 0 )) || exit "$interrupted"
if (( code != 0 )); then startup_failed=1; exit "$code"; fi
lean=()
while IFS= read -r arg; do lean+=("$arg"); done < "$out/mcp.args"
codex exec --approve-for-me -C "$root" ${lean[@]+"${lean[@]}"} \
  --add-dir "$common" --add-dir "$HOME/Library/pnpm" --add-dir "$HOME/Library/Caches/ms-playwright" \
  --output-schema "$schema" -o "$out/result.json" --json - < "$brief" \
  > "$out/events.jsonl" 2> "$out/stderr.log" &
child=$!
wait_child; code=$?
exit "$code"

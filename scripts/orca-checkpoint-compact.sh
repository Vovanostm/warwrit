#!/usr/bin/env bash
# Keep the coordinator checkpoint to live state before each tick. Every model
# call of a tick resends what the tick has read, so a checkpoint that collects
# tick history and finished slices multiplies coordinator tokens. Removed parts
# (whole finished slices, dropped keys and older list entries) are appended to
# archive/checkpoint-history.jsonl.
# Live state: the keys below, slices not [done], and the newest entries of
# each list in a slice. A [ready] slice keeps only what restarting it needs;
# its findings live on the issue and in the slice worktree.
# Usage: scripts/orca-checkpoint-compact.sh <pipeline-state-dir>
set -euo pipefail
state="$1"
[[ -f "$state/checkpoint.json" ]] || exit 0
mkdir -p "$state/archive"
python3 -I - "$state/checkpoint.json" "$state/archive/checkpoint-history.jsonl" <<'PY'
import datetime, json, os, sys
path, archive = sys.argv[1], sys.argv[2]
KEEP = {"run", "recorded_at", "workflow", "slices", "last_tick", "notes",
        "runtime_owner", "exclusive_checks_owner", "validation_reservation"}
READY_KEEP = {"slice", "state", "phase", "issues", "lane", "tier", "after",
              "ownership", "note", "branch", "head", "worktree", "pr",
              "pushed_head", "handoff", "children", "wave", "rework_round",
              "contract", "blocked", "needs_owner"}
LIST_TAIL = 3

checkpoint = json.load(open(path))
removed_keys = {k: v for k, v in checkpoint.items() if k not in KEEP}
kept, removed_slices = [], []
for s in checkpoint.get("slices", []):
    if s.get("state") == "done":
        removed_slices.append(s)
        continue
    if s.get("state") == "ready":
        removed = {k: v for k, v in s.items() if k not in READY_KEEP}
        live = {k: v for k, v in s.items() if k in READY_KEEP}
    else:
        removed = {k: v[:-LIST_TAIL] for k, v in s.items()
                   if isinstance(v, list) and k not in ("issues", "after") and len(v) > LIST_TAIL}
        live = {k: (v[-LIST_TAIL:] if k in removed else v) for k, v in s.items()}
    if removed:
        removed_slices.append({"slice": s.get("slice"), "removed": removed})
    kept.append(live)
if not removed_keys and not removed_slices:
    sys.exit(0)

stamp = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
with open(archive, "a") as out:
    out.write(json.dumps({"archived_at": stamp, "keys": removed_keys, "slices": removed_slices}) + "\n")
compact = {k: v for k, v in checkpoint.items() if k in KEEP}
compact["slices"] = kept
tmp = path + ".tmp"
with open(tmp, "w") as out:
    json.dump(compact, out, indent=1)
    out.write("\n")
before = os.path.getsize(path)
os.replace(tmp, path)
print(f"checkpoint compacted: {before} -> {os.path.getsize(path)} bytes; history in {archive}")
PY

#!/usr/bin/env bash
# Keep the coordinator checkpoint to live state before each tick. Every model
# call of a tick resends what the tick has read, so a checkpoint that collects
# tick history and finished slices multiplies coordinator tokens. Removed parts
# (whole finished slices, dropped keys and older list entries) are appended to
# archive/checkpoint-history.jsonl.
# Live state: the keys below and every slice field except known history: lists
# of past rounds keep their newest entries, per-tick records and worker
# launch/release receipts go; a [done] slice keeps a stub for `after` checks.
# Usage: scripts/orca-checkpoint-compact.sh <pipeline-state-dir>
set -euo pipefail
state="$1"
[[ -f "$state/checkpoint.json" ]] || exit 0
mkdir -p "$state/archive"
python3 -I - "$state/checkpoint.json" "$state/archive/checkpoint-history.jsonl" <<'PY'
import datetime, json, os, re, sys
path, archive = sys.argv[1], sys.argv[2]
KEEP = {"run", "recorded_at", "workflow", "slices", "last_tick", "notes",
        "runtime_owner", "exclusive_checks_owner", "validation_reservation"}
DONE_STUB = ("slice", "state", "issues", "pr", "branch", "head")
HISTORY_LIST = re.compile(r"_history$|^advisories$|mail")
RECEIPT = re.compile(r"^tick|_(release|result|readback|launch|observation)$")
LIST_TAIL = 3

checkpoint = json.load(open(path))
removed_keys = {k: v for k, v in checkpoint.items() if k not in KEEP}
kept, removed_slices = [], []
for s in checkpoint.get("slices", []):
    if s.get("state") == "done":
        removed = {k: v for k, v in s.items() if k not in DONE_STUB}
        live = {k: v for k, v in s.items() if k in DONE_STUB}
    else:
        removed = {k: v for k, v in s.items() if RECEIPT.search(k)}
        removed.update({k: v[:-LIST_TAIL] for k, v in s.items() if k not in removed
                        and isinstance(v, list) and HISTORY_LIST.search(k) and len(v) > LIST_TAIL})
        live = {k: (v[-LIST_TAIL:] if k in removed else v) for k, v in s.items() if not RECEIPT.search(k)}
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
    out.flush()
    os.fsync(out.fileno())
before = os.path.getsize(path)
os.replace(tmp, path)
print(f"checkpoint compacted: {before} -> {os.path.getsize(path)} bytes; history in {archive}")
PY

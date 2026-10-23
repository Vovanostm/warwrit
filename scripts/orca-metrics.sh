#!/usr/bin/env bash
# Pipeline metrics for the daily digest and for judging pipeline changes:
# merged PRs, coordinator ticks and tokens, worker outcomes and gate verdicts.
# Usage: scripts/orca-metrics.sh [days]   (default 1)
set -uo pipefail
days="${1:-1}"
root="$HOME/orca/workspaces/warwrit"
since="$(date -u -v-"${days}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "$days days ago" +%Y-%m-%dT%H:%M:%SZ)"
merged="$(gh pr list -R Vovanostm/warwrit --state merged --limit 100 --json mergedAt --jq "[.[] | select(.mergedAt >= \"$since\")] | length")"

python3 -I - "$root" "$since" "$merged" <<'PY'
import glob, json, os, sys, datetime
root, since, merged = sys.argv[1], sys.argv[2], int(sys.argv[3])
cutoff = datetime.datetime.strptime(since, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()

# Codex counts cached input inside input_tokens; cached input is far cheaper,
# so report the uncached part and output separately to judge real cost.
def usage(path):
    tokens = [0, 0, 0]  # input, of which cached, output
    for line in open(path, errors="ignore"):
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("type") == "turn.completed":
            u = event.get("usage", {})
            tokens[0] += u.get("input_tokens", 0)
            tokens[1] += u.get("cached_input_tokens", 0)
            tokens[2] += u.get("output_tokens", 0)
    return tokens

def add(total, tokens):
    return [a + b for a, b in zip(total, tokens)]

def show(tokens):
    return f"input {tokens[0] / 1e6:.1f}M (uncached {(tokens[0] - tokens[1]) / 1e6:.2f}M), output {tokens[2] / 1e6:.2f}M"

def recent(paths):
    return [p for p in paths if os.path.getmtime(p) >= cutoff]

ticks = recent(glob.glob(f"{root}/pipeline-coordinator/.orca/pipeline/ticks/*.jsonl"))
tick_tokens = [0, 0, 0]
for p in ticks:
    tick_tokens = add(tick_tokens, usage(p))
outcomes, worker_tokens = {}, [0, 0, 0]
for events in recent(glob.glob(f"{root}/*/.orca/runs/*/events.jsonl")):
    try:
        outcome = json.load(open(os.path.join(os.path.dirname(events), "result.json")))["outcome"]
    except (OSError, ValueError, KeyError):
        outcome = "no-result"
    outcomes[outcome] = outcomes.get(outcome, 0) + 1
    worker_tokens = add(worker_tokens, usage(events))
verdicts = {}
for path in recent(glob.glob(f"{root}/*/.orca/*/[rev][eiv]*-[0-9]*.md")):
    first = open(path, errors="ignore").readline().strip()
    if first.startswith("VERDICT:"):
        verdict = first.split()[1]
        verdicts[verdict] = verdicts.get(verdict, 0) + 1

total = tick_tokens[0] + worker_tokens[0]
print(f"Pipeline metrics since {since}")
print(f"- merged PRs: {merged}")
print(f"- coordinator ticks: {len(ticks)}, {show(tick_tokens)}")
print(f"- worker runs: {sum(outcomes.values())} {outcomes}, {show(worker_tokens)}")
print(f"- gate verdicts: {verdicts}")
print(f"- input tokens per merged PR: {total / merged / 1e6:.1f}M" if merged else "- input tokens per merged PR: NOT_MEASURED (no merge)")
PY

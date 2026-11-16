#!/usr/bin/env bash
# Headless Codex worker for the Orca issue pipeline. Runs `codex exec` with the
# organization-allowed mode: --approve-for-me = workspace-write sandbox with approvals via automatic review
# and reports the result to the Orca Dispatch itself, so no TUI, prompt paste or
# foreground race is involved.
# Usage: scripts/orca-codex-worker.sh <task-id> <dispatch-id> <terminal-handle> <brief-file>
set -uo pipefail
exec python3 -I "$(dirname "$0")/orca-codex-worker.py" "$@"

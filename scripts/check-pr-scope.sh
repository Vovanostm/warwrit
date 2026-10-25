#!/usr/bin/env bash
# Size is advisory; semantic review decides cohesive, verifiable boundaries.
# Usage: scripts/check-pr-scope.sh [base-ref] [pr-body-file]
# With a body, require an issue or tracked contract and a checkable description.
set -euo pipefail
base="$(git merge-base "${1:-origin/main}" HEAD)" || { echo 'FAIL scope: invalid base'; exit 1; }
body="${2:-}"
# Capture first: process-substitution failure must not become an empty PASS.
stat="$(git diff --numstat --no-renames "$base"...HEAD)" || { echo 'FAIL scope: diff unavailable'; exit 1; }
total=0
top=""
while IFS=$'\t' read -r added deleted path; do
  [[ -z "$added" || "$added" == "-" ]] && continue
  case "$path" in
    *.test.* | *.spec.* | */test/* | */tests/* | */__tests__/* | *.md | docs/* | assets/* | .agents/* | pnpm-lock.yaml) continue ;;
  esac
  lines=$((added + deleted))
  total=$((total + lines))
  top+="$lines $path"$'\n'
done <<< "$stat"
echo "PASS scope report: $total changed source lines (300 is advisory)"
if ((total > 300)); then
  echo 'ADVISORY: reviewer must assess cohesion, clarity, verification and rollback; split independent work.'
fi
printf '%s' "$top" | sort -rn | sed -n '1,5p'

if [[ -n "$body" ]]; then
  [[ -f "$body" && -r "$body" ]] || { echo 'FAIL issues: PR body unavailable'; exit 1; }
  content="$(cat "$body")" || { echo 'FAIL issues: PR body unreadable'; exit 1; }
  linked=0
  if grep -qiE '(close[sd]?|fix(e[sd])?|resolve[sd]?|refs?|part of) #[0-9]+' <<< "$content"; then
    linked=1
  else
    contracts="$(grep -oE 'docs/(engineering/(work-packages|epics)/|work-packages/)[A-Za-z0-9_./-]+\.md' <<< "$content" || true)"
    while IFS= read -r contract; do
      [[ -n "$contract" && -f "$contract" ]] || continue
      if git ls-files --error-unmatch -- "$contract" >/dev/null 2>&1; then linked=1; fi
    done <<< "$contracts"
  fi
  if ((linked == 0)); then
    echo 'FAIL issues: link an issue (Closes/Refs #N) or an owning tracked contract.'
    exit 1
  fi
  # A link or a Markdown heading alone is not a description of the result.
  description="$(printf '%s\n' "$content" | grep -viE '^([[:space:]]*#|[[:space:]]*$|[[:space:]]*(close[sd]?|fix(e[sd])?|resolve[sd]?|refs?|part of) #[0-9]+[[:space:].,]*)' || true)"
  [[ "$description" =~ [[:alpha:]] ]] || { echo 'FAIL issues: describe the behavior and its verification'; exit 1; }
  echo 'PASS linkage: review each linked issue acceptance separately; linkage does not prove cohesion.'
fi

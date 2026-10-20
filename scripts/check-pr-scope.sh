#!/usr/bin/env bash
# One issue = one PR (AGENTS.md "Orchestration"): reject a branch whose source
# change exceeds the slice limit, and a PR body that closes several issues or
# names none. Tests, Markdown, docs, assets, agent skills and the lockfile do not
# count toward the limit.
# Usage: scripts/check-pr-scope.sh [base-ref] [pr-body-file]
# Owner exception: the PR label `scope:owner-approved`, which CI passes as
# SCOPE_EXCEPTION=1. Only the owner adds that label.
set -euo pipefail
limit=300
base="$(git merge-base "${1:-origin/main}" HEAD)"
body="${2:-}"

total=0
top=""
while IFS=$'\t' read -r added deleted path; do
  [[ "$added" == "-" ]] && continue # binary file
  case "$path" in
    *.test.* | *.spec.* | */test/* | */tests/* | */__tests__/* | *.md | docs/* | assets/* | .agents/* | pnpm-lock.yaml) continue ;;
  esac
  lines=$((added + deleted))
  total=$((total + lines))
  top+="$lines $path"$'\n'
done < <(git diff --numstat "$base"...HEAD)

status=0
if ((total > limit)); then
  if [[ "${SCOPE_EXCEPTION:-}" == 1 ]]; then
    echo "PASS scope: $total source lines > $limit, owner exception label present"
  else
    echo "FAIL scope: $total changed source lines without tests exceed $limit."
    echo "Split the work into one-issue PRs, or ask the owner for scope:owner-approved."
    printf '%s' "$top" | sort -rn | head -5 | sed 's/^/  /'
    status=1
  fi
else
  echo "PASS scope: $total changed source lines (limit $limit)"
fi

if [[ -n "$body" ]]; then
  closes="$({ grep -oiE '(close[sd]?|fix(e[sd])?|resolve[sd]?) #[0-9]+' "$body" || true; } | grep -oE '[0-9]+' | sort -u | wc -l | tr -d ' ' || true)"
  refs="$({ grep -oiE '(refs?|part of) #[0-9]+' "$body" || true; } | wc -l | tr -d ' ' || true)"
  if ((closes > 1)) && [[ "${SCOPE_EXCEPTION:-}" != 1 ]]; then
    echo "FAIL issues: the PR closes $closes issues; one issue per PR."
    status=1
  elif ((closes + refs == 0)); then
    echo "FAIL issues: the PR body names no issue (Closes #N or Refs #N)."
    status=1
  else
    echo "PASS issues: closes $closes, refs $refs"
  fi
fi
exit "$status"

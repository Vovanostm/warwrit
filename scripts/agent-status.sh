#!/usr/bin/env bash
# Live, derived repository status for agent start/resume. Read-only: git + gh.
# It replaces hand-written "observed main/PR" prose; decisions and ownership
# stay in CURRENT_PLAN. A missing tool prints NOT_AVAILABLE, never a guess.
set -euo pipefail

base="${1:-main}"
cd "$(git rev-parse --show-toplevel)"
git fetch --quiet --prune origin || printf 'fetch: NOT_AVAILABLE (showing last fetched refs)\n'

printf '# Live status (derived %s UTC)\n\n' "$(date -u '+%Y-%m-%d %H:%M')"
printf 'origin/%s: %s tree %s\n  %s\n' "$base" \
  "$(git rev-parse --short "origin/$base")" "$(git rev-parse --short "origin/$base^{tree}")" \
  "$(git log -1 --format='%cd %s' --date=short "origin/$base")"

migrations="$(git ls-tree --name-only "origin/$base" apps/server/migrations/ | sed -n 's#.*/\([0-9]\{4\}\)_.*#\1#p' | sort -u | tail -1)"
printf 'last released migration: %s (next: %04d; recheck before writing)\n' \
  "${migrations:-none}" "$((10#${migrations:-0} + 1))"

if ! gh auth status >/dev/null 2>&1; then
  printf '\nGitHub: NOT_AVAILABLE (gh missing or unauthenticated)\n'
  exit 0
fi

printf '\n## %s CI\n' "$base"
gh run list --branch "$base" --workflow CI --limit 1 \
  --json databaseId,headSha,status,conclusion \
  --jq '.[] | "run \(.databaseId) on \(.headSha[0:7]): \(.status) \(.conclusion // "")"'

printf '\n## Open pull requests\n'
gh pr list --state open --limit 50 \
  --json number,headRefName,baseRefName,mergeStateStatus,statusCheckRollup,title \
  --jq 'if length == 0 then "none" else .[] | "#\(.number) \(.headRefName) -> \(.baseRefName) [\(.mergeStateStatus); CI \([.statusCheckRollup[]? | (.conclusion // .status)] | unique | join(",") | if . == "" then "none" else . end)] \(.title)" end'

printf '\n## Unmerged branches active in the last 3 days (possible writers)\n'
merged="$(gh pr list --state merged --limit 200 --json headRefName --jq '.[].headRefName')"
since="$(date -u -v-3d +%s 2>/dev/null || date -u -d '3 days ago' +%s)"
found=0
while read -r ref stamp; do
  branch="${ref#origin/}"
  [[ "$branch" == "$base" || "$stamp" -lt "$since" ]] && continue
  grep -qxF "$branch" <<<"$merged" && continue
  ahead="$(git rev-list --count "origin/$base..$ref")"
  [[ "$ahead" -eq 0 ]] && continue
  areas="$(git diff --name-only "origin/$base...$ref" | cut -d/ -f1-3 | sort -u | head -6 | paste -sd ' ' -)"
  printf '%s (+%s, %s): %s\n' "$branch" "$ahead" "$(git log -1 --format=%cr "$ref")" "$areas"
  found=1
done < <(git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:unix)' refs/remotes/origin)
[[ "$found" -eq 1 ]] || printf 'none\n'

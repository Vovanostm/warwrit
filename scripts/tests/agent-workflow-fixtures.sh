#!/usr/bin/env bash
# Isolated routing/scope/stop regressions. Never invokes real Orca/Codex/network.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$root/.orca"
fixture="$(mktemp -d "$root/.orca/workflow-fixtures.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
fail() { echo "FAIL $*" >&2; exit 1; }
expect_exit() {
  local expected="$1"; shift
  local actual=0
  "$@" > "$fixture/output" 2>&1 || actual=$?
  [[ "$actual" == "$expected" ]] || { cat "$fixture/output"; fail "exit $actual, expected $expected: $*"; }
}
# Script entry tests stub every external-effect command.
mkdir -p "$fixture/bin" "$fixture/coord/scripts"
export FIXTURE_LOG="$fixture/commands" FIXTURE_COORD="$fixture/coord"
cat > "$fixture/bin/git" <<'STUB'
#!/usr/bin/env bash
printf 'git %s\n' "$*" >> "$FIXTURE_LOG"
[[ "$1" == rev-parse ]] && printf '%s\n' "$FIXTURE_COORD"
exit 0
STUB
cat > "$fixture/bin/orca" <<'STUB'
#!/usr/bin/env bash
printf 'orca %s\n' "$*" >> "$FIXTURE_LOG"
case "$1 $2" in
  'repo list') echo '{"result":{"repos":[{"id":"fixture","path":"/learn/warwrit"}]}}' ;;
  'terminal create') echo '{"result":{"terminal":{"handle":"fixture"}}}' ;;
  'orchestration run-create') echo '{"result":{"run":{"id":"fixture"}}}' ;;
  *) echo '{"ok":true,"result":{"messages":[]}}' ;;
esac
STUB
cat > "$fixture/bin/codex" <<'STUB'
#!/usr/bin/env bash
printf 'codex\n' >> "$FIXTURE_LOG"
[[ "${FIXTURE_STOP_AFTER_TICK:-}" == 1 ]] && touch "$FIXTURE_COORD/.orca/pipeline/STOPPED_BY_OWNER"
exit 0
STUB
cat > "$fixture/bin/caffeinate" <<'STUB'
#!/usr/bin/env bash
printf 'caffeinate\n' >> "$FIXTURE_LOG"
STUB
chmod +x "$fixture/bin/"*
printf 'exit 0\n' > "$fixture/coord/scripts/orca-checkpoint-compact.sh"
printf 'echo fixture-state\n' > "$fixture/coord/scripts/orca-state-digest.sh"
mkdir -p "$fixture/coord/.orca/pipeline"
touch "$fixture/coord/.orca/pipeline/STOPPED_BY_OWNER"
for mode in single loop; do
  : > "$FIXTURE_LOG"
  if [[ "$mode" == single ]]; then
    expect_exit 20 env PATH="$fixture/bin:$PATH" bash "$root/scripts/orca-pipeline-tick.sh" "$fixture/coord"
  else
    expect_exit 20 env PATH="$fixture/bin:$PATH" bash "$root/scripts/orca-pipeline-tick.sh" --loop 1 "$fixture/coord"
  fi
  [[ ! -s "$FIXTURE_LOG" && ! -d "$fixture/coord/.orca/pipeline/ticks" ]] || fail "stop $mode caused side effects"
done
rm "$fixture/coord/.orca/pipeline/STOPPED_BY_OWNER"
expect_exit 0 env PATH="$fixture/bin:$PATH" bash "$root/scripts/orca-pipeline-tick.sh" "$fixture/coord"
grep -q '^codex$' "$FIXTURE_LOG" || fail 'no-marker tick did not reach stub model'
# A stop created during a tick ends the loop without a second model/retry.
rm "$fixture/coord/.orca/pipeline/digest.txt"
: > "$FIXTURE_LOG"
expect_exit 20 env PATH="$fixture/bin:$PATH" FIXTURE_STOP_AFTER_TICK=1 bash "$root/scripts/orca-pipeline-tick.sh" --loop 1 "$fixture/coord"
[[ "$(grep -c '^codex$' "$FIXTURE_LOG")" == 1 ]] || fail 'loop dispatched after stop'
[[ -f "$fixture/coord/.orca/pipeline/STOPPED_BY_OWNER" ]] || fail 'marker removed'
# Marker appearing while the loop waits is checked before another tick/mail poll.
rm "$fixture/coord/.orca/pipeline/STOPPED_BY_OWNER"
rm -f "$fixture/coord/.orca/pipeline/digest.txt"
cat > "$fixture/bin/sleep" <<'STUB'
#!/usr/bin/env bash
printf 'sleep\n' >> "$FIXTURE_LOG"
touch "$FIXTURE_COORD/.orca/pipeline/STOPPED_BY_OWNER"
STUB
chmod +x "$fixture/bin/sleep"
: > "$FIXTURE_LOG"
expect_exit 20 env PATH="$fixture/bin:$PATH" bash "$root/scripts/orca-pipeline-tick.sh" --loop 1 "$fixture/coord"
[[ "$(grep -c '^codex$' "$FIXTURE_LOG")" == 1 ]] || fail 'waiting loop dispatched after stop'
grep -q '^sleep$' "$FIXTURE_LOG" || fail 'between-ticks fixture did not reach wait'
echo 'PASS stop: single, loop, no marker, stop between ticks; external commands stubbed'

# Real local Git fixtures exercise base/diff/deletion/rename semantics.
repo="$fixture/repo"
git init -q "$repo"
git -C "$repo" config user.email fixture@example.test
git -C "$repo" config user.name Fixture
git -C "$repo" config core.hooksPath /dev/null
mkdir -p "$repo/scripts" "$repo/packages/protocol/src"
cp "$root/scripts/check-pr-scope.sh" "$repo/scripts/"
printf 'original\n' > "$repo/packages/protocol/src/old.ts"
printf ".orca/\n" > "$repo/.gitignore"
git -C "$repo" add .
git -C "$repo" commit -qm base
base="$(git -C "$repo" rev-parse HEAD)"
route_case() {
  local path="$1" expected="$2"
  git -C "$repo" reset -q --hard "$base"
  mkdir -p "$repo/$(dirname "$path")"
  printf 'changed\n' >> "$repo/$path"
  git -C "$repo" add .
  git -C "$repo" commit -qm fixture
  expect_exit 0 bash "$root/scripts/orca-validate.sh" "$repo" "$base" --plan
  grep -qx "ROUTE $expected" "$fixture/output" || fail "route $path: $(cat "$fixture/output")"
}
route_case docs/guide.md docs
route_case apps/web/src/style.css web
route_case apps/server/src/command.ts server
route_case packages/game-core/src/rule.ts consumers
route_case packages/protocol/src/message.ts consumers
route_case scripts/tool.sh broad
route_case .github/workflows/check.yml broad
route_case pnpm-lock.yaml broad
route_case packages/protocol/package.json broad
route_case docs/tool.sh broad
route_case unknown.file broad
git -C "$repo" reset -q --hard "$base"
git -C "$repo" rm -q packages/protocol/src/old.ts
git -C "$repo" commit -qm deletion
expect_exit 0 bash "$root/scripts/orca-validate.sh" "$repo" "$base" --plan
grep -qx 'ROUTE consumers' "$fixture/output" || fail 'deletion route'
git -C "$repo" reset -q --hard "$base"
mkdir -p "$repo/docs"
git -C "$repo" mv packages/protocol/src/old.ts docs/old.md
git -C "$repo" commit -qm rename
expect_exit 0 bash "$root/scripts/orca-validate.sh" "$repo" "$base" --plan
grep -qx 'ROUTE consumers' "$fixture/output" || fail 'rename lost old producer'
expect_exit 1 bash "$root/scripts/orca-validate.sh" "$repo" invalid-base --plan
echo 'PASS router: docs/CSS/server/core/protocol/deletion/rename/scripts/CI/lock/config/unknown; invalid base fails'

printf 'Closes #1\nCloses #2\nKeep the utility hidden after battle; verify the terminal journey.\n' > "$fixture/body"
# Scope resolves cwd, as it does in CI.
cd "$repo"
expect_exit 0 bash "$root/scripts/check-pr-scope.sh" "$base" "$fixture/body"
mkdir -p apps/web/src
seq 1 450 > apps/web/src/large.ts
git add .
git commit -qm large
expect_exit 0 bash "$root/scripts/check-pr-scope.sh" "$base" "$fixture/body"
grep -q '^ADVISORY:' "$fixture/output" || fail 'large diff missing advisory'
printf 'Describe a result with no issue link.\n' > "$fixture/body"
expect_exit 1 bash "$root/scripts/check-pr-scope.sh" "$base" "$fixture/body"
printf 'Closes #1\n' > "$fixture/body"
expect_exit 1 bash "$root/scripts/check-pr-scope.sh" "$base" "$fixture/body"
expect_exit 1 bash "$root/scripts/check-pr-scope.sh" "$base" "$fixture/missing-body"
expect_exit 1 bash "$root/scripts/check-pr-scope.sh" invalid-base
# Inject a diff command failure after a valid merge-base; no empty successful report.
mkdir -p "$fixture/badgit"
cat > "$fixture/badgit/git" <<STUB
#!/usr/bin/env bash
if [[ "\$1" == diff ]]; then exit 2; fi
exec "$(command -v git)" "\$@"
STUB
chmod +x "$fixture/badgit/git"
expect_exit 1 env PATH="$fixture/badgit:$PATH" bash "$root/scripts/check-pr-scope.sh" "$base"
expect_exit 1 env PATH="$fixture/badgit:$PATH" bash "$root/scripts/orca-validate.sh" "$repo" "$base" --plan
# Check real command routing with pnpm stubbed, including zero-tests failure.
mkdir -p "$fixture/checkbin"
cat > "$fixture/checkbin/pnpm" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$FIXTURE_CHECK_LOG"
if [[ "$*" == *'vitest run'* && "${FIXTURE_NO_TESTS:-}" == 1 ]]; then exit 1; fi
exit 0
STUB
chmod +x "$fixture/checkbin/pnpm"
export FIXTURE_CHECK_LOG="$fixture/check-commands"
for scenario in docs consumers broad; do
  case "$scenario" in
    docs) route_case docs/new.md docs ;;
    consumers) route_case packages/protocol/src/new.ts consumers ;;
    broad) route_case scripts/new.sh broad ;;
  esac
  : > "$FIXTURE_CHECK_LOG"
  expect_exit 0 env PATH="$fixture/checkbin:$PATH" bash "$root/scripts/orca-validate.sh" "$repo" "$base"
  case "$scenario" in
    docs) if grep -qE 'vitest|build|typecheck|verify' "$FIXTURE_CHECK_LOG"; then fail 'docs ran game checks'; fi ;;
    consumers) grep -qx 'typecheck' "$FIXTURE_CHECK_LOG" && grep -qx 'exec vitest run packages apps' "$FIXTURE_CHECK_LOG" || fail 'consumer checks missing' ;;
    broad) grep -qx 'verify' "$FIXTURE_CHECK_LOG" || fail 'broad check missing' ;;
  esac
done
route_case packages/protocol/src/new.ts consumers
expect_exit 1 env PATH="$fixture/checkbin:$PATH" FIXTURE_NO_TESTS=1 bash "$root/scripts/orca-validate.sh" "$repo" "$base"
echo 'PASS commands: docs omit game checks; shared contracts check consumers; unknown uses verify; zero-tests failure retained'
echo 'PASS scope: small/large/multiple issues/deletion/rename; missing linkage/description/body/base/diff fail'

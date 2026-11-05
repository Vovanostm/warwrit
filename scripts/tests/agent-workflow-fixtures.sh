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
cp "$root/scripts/check-pr-scope.sh" "$root/scripts/check-current-plan.sh" "$root/scripts/orca-validate.sh" "$root/scripts/print-quality-audit.mjs" "$repo/scripts/"
mkdir -p "$repo/docs/engineering"
printf '## Current task\n\nCoordinator is the fixture author.\n' > "$repo/docs/engineering/CURRENT_PLAN.md"
printf 'original\n' > "$repo/packages/protocol/src/old.ts"
printf ".orca/\noutput/\ncoverage/\n" > "$repo/.gitignore"
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
route_case AGENTS.md docs
route_case .agents/skills/example/SKILL.md docs
route_case assets/readme.md broad
route_case apps/web/src/readme.md web
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
if [[ "$*" == *'vitest run'* && "${FIXTURE_NO_TESTS:-}" == 1 ]]; then
  if [[ "${FIXTURE_NOISY:-}" == 1 ]]; then
    printf 'diagnostic-start-marker\n%12000s\n' ''
  fi
  echo 'No test files found. Select an existing public-boundary test.' >&2
  exit 1
fi
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
# Execute the actual CI selector block against isolated committed changes.
ci_step_script() {
  awk -v name="$1" '
    $0 == "      - name: " name { selected = 1; next }
    selected && /^      - name:/ { exit }
    selected && /^        run: \|$/ { body = 1; next }
    body { sub(/^          /, ""); print }
  ' "$root/.github/workflows/ci.yml"
}
ci_scope_script="$(ci_step_script 'Select verification scope')"
[[ -n "$ci_scope_script" ]] || fail 'CI selector command missing'
git update-ref refs/remotes/origin/main "$base"
route_case docs/guide.md docs
: > "$fixture/ci-output"
expect_exit 0 env GITHUB_BASE_REF=main GITHUB_OUTPUT="$fixture/ci-output" bash -e -c "$ci_scope_script"
grep -qx 'docs_only=true' "$fixture/ci-output" || fail 'docs-only CI route missing'
printf 'mixed source\n' >> packages/protocol/src/old.ts
git add .
git commit -qm 'mixed documentation and source'
: > "$fixture/ci-output"
expect_exit 0 env GITHUB_BASE_REF=main GITHUB_OUTPUT="$fixture/ci-output" bash -e -c "$ci_scope_script"
[[ ! -s "$fixture/ci-output" ]] || fail 'mixed source selected docs-only CI'
expect_exit 1 env GITHUB_BASE_REF=missing GITHUB_OUTPUT="$fixture/ci-output" bash -e -c "$ci_scope_script"
printf "echo 'ROUTE unexpected'\n" > scripts/orca-validate.sh
expect_exit 0 env GITHUB_BASE_REF=main GITHUB_OUTPUT="$fixture/ci-output" bash -e -c "$ci_scope_script"
[[ ! -s "$fixture/ci-output" ]] || fail 'unexpected route selected docs-only CI'
echo 'PASS CI selector: docs only; mixed/unknown stay full; invalid base fails'

# The real docs step formats only changed files on its tested ancestor.
ci_docs_script="$(ci_step_script 'Validate documentation-only changes')"
[[ -n "$ci_docs_script" ]] || fail 'CI docs command missing'
cat > "$fixture/checkbin/corepack" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$FIXTURE_COREPACK_LOG"
case "$*" in
  enable | 'pnpm install --frozen-lockfile') exit 0 ;;
  *) exit 97 ;;
esac
STUB
chmod +x "$fixture/checkbin/corepack"
export FIXTURE_COREPACK_LOG="$fixture/corepack-commands"
route_case docs/scoped.md docs
tested_head="$(git rev-parse HEAD)"
# Model a base ref advancing after GitHub produced the tested merge checkout.
git switch --quiet --create newer-base "$base"
printf 'new upstream documentation\n' > docs/upstream.md
git add .
git commit -qm 'base advanced'
git update-ref refs/remotes/origin/main HEAD
git switch --quiet --detach "$tested_head"
: > "$FIXTURE_CHECK_LOG"
: > "$FIXTURE_COREPACK_LOG"
expect_exit 0 env PATH="$fixture/checkbin:$PATH" GITHUB_BASE_REF=main bash -e -c "$ci_docs_script"
grep -qx 'exec prettier --check --ignore-unknown docs/scoped.md' "$FIXTURE_CHECK_LOG" || fail 'CI docs format scope changed'
[[ "$(wc -l < "$FIXTURE_CHECK_LOG")" -eq 1 ]] || fail 'CI docs invoked extra pnpm checks'
grep -qx enable "$FIXTURE_COREPACK_LOG" || fail 'pinned pnpm shim setup missing'
grep -qx 'pnpm install --frozen-lockfile' "$FIXTURE_COREPACK_LOG" || fail 'frozen docs install missing'
: > "$FIXTURE_CHECK_LOG"
expect_exit 128 env PATH="$fixture/checkbin:$PATH" GITHUB_BASE_REF=missing bash -e -c "$ci_docs_script"
[[ ! -s "$FIXTURE_CHECK_LOG" ]] || fail 'missing base reached format'
echo 'PASS CI docs: scoped format on detached checkout with advanced base; missing base fails'

# One native audit owns its exit status; rendering only explains saved output.
ci_audit_script="$(ci_step_script 'Reject quality regressions in changed files')"
[[ -n "$ci_audit_script" ]] || fail 'CI audit command missing'
mkdir -p "$fixture/auditbin"
cat > "$fixture/auditbin/pnpm" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$FIXTURE_AUDIT_LOG"
[[ "$*" == 'check:changes --format json --output-file output/quality-audit/audit.json' ]] || exit 97
cp "$FIXTURE_AUDIT_REPORT" output/quality-audit/audit.json
echo 'native audit diagnostic' >&2
exit "$FIXTURE_AUDIT_EXIT"
STUB
chmod +x "$fixture/auditbin/pnpm"
cat > "$fixture/audit-fail.json" <<'JSON'
{
  "kind": "audit", "schema_version": 11, "verdict": "fail",
  "attribution": {"gate": "new-only", "complexity_introduced": 2, "complexity_inherited": 1},
  "gate_outcomes": {"audit-verdict": {"status": "fail", "enforced": true}},
  "complexity": {"findings": [
    {"introduced": true, "effective_severity": "error", "severity": "moderate", "path": "new.ts", "line": 7, "name": "new-error", "exceeded": "crap", "crap": 30},
    {"introduced": true, "effective_severity": "warn", "severity": "critical", "path": "warn.ts", "line": 8, "name": "new-warning", "exceeded": "cognitive"},
    {"introduced": false, "effective_severity": "error", "path": "old.ts", "line": 9, "name": "inherited-name"},
    {"path": "unknown.ts", "line": 10, "name": "unknown-attribution"}
  ]},
  "duplication": {"clone_groups": [
    {"introduced": true, "fingerprint": "new-clone", "instances": [{"file": "copy.ts", "start_line": 3, "end_line": 5}]},
    {"introduced": false, "fingerprint": "inherited-clone", "instances": []}
  ], "clone_families": [{"fingerprint": "family-duplicate"}]}
}
JSON
printf '%s\n' '{"kind":"audit","schema_version":11,"verdict":"pass","complexity":{"findings":[]}}' > "$fixture/audit-pass.json"
printf '%s\n' '{"error":true,"message":"coverage input missing","exit_code":2}' > "$fixture/audit-error.json"
export FIXTURE_AUDIT_LOG="$fixture/audit-commands"
for audit_exit in 0 1 2; do
  case "$audit_exit" in
    0) audit_report="$fixture/audit-pass.json" ;;
    1) audit_report="$fixture/audit-fail.json" ;;
    2) audit_report="$fixture/audit-error.json" ;;
  esac
  rm -rf "$repo/output/quality-audit"
  : > "$FIXTURE_AUDIT_LOG"
  expect_exit "$audit_exit" env PATH="$fixture/auditbin:$PATH" FALLOW_AUDIT_BASE=origin/main \
    QUALITY_PR_HEAD_SHA=fixture-head GITHUB_RUN_ID=123 GITHUB_RUN_ATTEMPT=2 \
    FIXTURE_AUDIT_REPORT="$audit_report" FIXTURE_AUDIT_EXIT="$audit_exit" bash -e -c "$ci_audit_script"
  [[ "$(wc -l < "$FIXTURE_AUDIT_LOG")" -eq 1 ]] || fail 'audit analyzed twice'
  grep -qx "exit=$audit_exit" output/quality-audit/context.txt || fail 'audit exit context missing'
  grep -qx 'native audit diagnostic' output/quality-audit/audit.stderr || fail 'native diagnostic lost'
  expect_exit 0 node "$root/scripts/print-quality-audit.mjs" output/quality-audit/audit.json
  if [[ "$audit_exit" == 1 ]]; then
    grep -q 'Introduced complexity errors (1)' "$fixture/output" || fail 'effective severity partition missing'
    grep -q 'Other introduced complexity (1)' "$fixture/output" || fail 'warning promoted or hidden'
    grep -q 'unknown-attribution' "$fixture/output" || fail 'missing attribution treated as inherited'
    grep -q 'new-clone' "$fixture/output" || fail 'new clone hidden'
    if grep -qE 'inherited-name|inherited-clone|family-duplicate' "$fixture/output"; then fail 'inherited/family details mixed into introduced output'; fi
    grep -q 'inherited-name' output/quality-audit/audit.json || fail 'raw inherited evidence lost'
  fi
done
printf '{' > "$fixture/malformed-audit.json"
expect_exit 1 node "$root/scripts/print-quality-audit.mjs" "$fixture/malformed-audit.json"
expect_exit 1 node "$root/scripts/print-quality-audit.mjs" "$fixture/missing-audit.json"
echo 'PASS quality feedback: native exit0/1/2 preserved, one audit, attributed findings, raw diagnostics and invalid report errors'

# Rejected cheap checks must stop before any pnpm command on source routes.
route_case packages/protocol/src/new.ts consumers
printf 'uncommitted\n' >> packages/protocol/src/new.ts
: > "$FIXTURE_CHECK_LOG"
expect_exit 1 env PATH="$fixture/checkbin:$PATH" bash "$root/scripts/orca-validate.sh" "$repo" "$base"
grep -q 'FAIL clean-tree' "$fixture/output" || fail 'dirty-tree diagnostic missing'
[[ ! -s "$FIXTURE_CHECK_LOG" ]] || fail 'dirty source reached pnpm after rejection'
git restore packages/protocol/src/new.ts
mkdir -p "$fixture/scopebadgit"
cat > "$fixture/scopebadgit/git" <<STUB
#!/usr/bin/env bash
if [[ "\$1" == diff && "\$2" == --numstat ]]; then exit 2; fi
exec "$(command -v git)" "\$@"
STUB
chmod +x "$fixture/scopebadgit/git"
: > "$FIXTURE_CHECK_LOG"
expect_exit 1 env PATH="$fixture/scopebadgit:$fixture/checkbin:$PATH" bash "$root/scripts/orca-validate.sh" "$repo" "$base"
grep -q 'FAIL scope' "$fixture/output" || fail 'scope diagnostic missing'
[[ ! -s "$FIXTURE_CHECK_LOG" ]] || fail 'rejected scope reached pnpm'
echo 'PASS preflight: dirty source and rejected scope stop before pnpm'

# Changed checkpoint metadata must fail before formatting or product checks.
route_case docs/engineering/CURRENT_PLAN.md docs
printf '## Current task\n\nParent is sole author and validator.\n' > docs/engineering/CURRENT_PLAN.md
git add .
git commit -qm 'checkpoint missing coordinator'
: > "$FIXTURE_CHECK_LOG"
expect_exit 1 env PATH="$fixture/checkbin:$PATH" bash "$root/scripts/orca-validate.sh" "$repo" "$base"
grep -q 'does not name the coordinator' "$fixture/output" || fail 'checkpoint diagnostic missing'
[[ ! -s "$FIXTURE_CHECK_LOG" ]] || fail 'invalid checkpoint reached product or format tools'
printf '## Current task\n\nCoordinator is the fixture author.\nUpdated scope.\n' > docs/engineering/CURRENT_PLAN.md
git add .
git commit -qm 'checkpoint fixed'
expect_exit 0 env PATH="$fixture/checkbin:$PATH" bash "$root/scripts/orca-validate.sh" "$repo" "$base"
git rm -q docs/engineering/CURRENT_PLAN.md
git commit -qm 'checkpoint deleted'
: > "$FIXTURE_CHECK_LOG"
expect_exit 1 env PATH="$fixture/checkbin:$PATH" bash "$root/scripts/orca-validate.sh" "$repo" "$base"
grep -q 'CURRENT_PLAN.md not found' "$fixture/output" || fail 'deleted checkpoint passed'
[[ ! -s "$FIXTURE_CHECK_LOG" ]] || fail 'deleted checkpoint reached product or format tools'
echo 'PASS plan: changed/fixed/deleted checkpoint checked before expensive commands'

route_case packages/protocol/src/new.ts consumers
expect_exit 1 env PATH="$fixture/checkbin:$PATH" FIXTURE_NO_TESTS=1 bash "$root/scripts/orca-validate.sh" "$repo" "$base"
grep -q 'No test files found. Select an existing public-boundary test.' "$fixture/output" || fail 'test diagnostic hidden'
grep -q 'Rerun after fixing the diagnostic: pnpm exec vitest run packages apps' "$fixture/output" || fail 'repair command missing'
grep -q 'No test files found' "$repo/.orca/validate-tests.log" || fail 'failure log lost'
expect_exit 1 env PATH="$fixture/checkbin:$PATH" FIXTURE_NO_TESTS=1 FIXTURE_NOISY=1 bash "$root/scripts/orca-validate.sh" "$repo" "$base"
grep -q 'No test files found' "$fixture/output" || fail 'noisy failure diagnostic missing'
if grep -q 'diagnostic-start-marker' "$fixture/output"; then fail 'full noisy log leaked into output'; fi
[[ "$(wc -c < "$fixture/output")" -lt 10000 ]] || fail 'diagnostic output unbounded'
grep -q 'diagnostic-start-marker' "$repo/.orca/validate-tests.log" || fail 'full noisy log lost'
echo 'PASS commands: docs omit game checks; shared contracts check consumers; unknown uses verify; zero-tests failure/repair/log retained; long diagnostics bounded'
echo 'PASS scope: small/large/multiple issues/deletion/rename; missing linkage/description/body/base/diff fail'

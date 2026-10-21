# #249 persistent bow builder — 2026-10-21

The original builder record below is preserved as history. The latest result is
in **Round 2 bounded rework** at the end of this report; acceptance remains open.

Task `task_73dc0817b72c`; branch `codex/bow-three-ap-249`, dedicated checkout
`codex-company-profile-164`. Source is implemented and normally committed;
**full acceptance is incomplete (BLOCKED_ENV / NOT_RUN persistent proof)**.
Do not close #249 or #218 from this report. No push, PR, main merge,
deployment, migration, Orca call, delegation or hook bypass was performed.

## Commits and integration

- Retained `e68025b9` and parent records `370a07da` remain ancestors.
- `ba9d47f3`: completed the already-started ordinary merge of actual main
  `d8a04196`, with a normal audited commit. Resolved the eight assigned combat,
  lab and validator conflicts to delivered main. Stronger old replay/refusal,
  roundtrip and tactical tests are preserved; duplicate older WIP test removed.
- `4942771b`: normal audited commit of binding regressions, finite bridge
  predicates and PostgreSQL test typing corrections. Final report commit also
  restores the G05 documentation comment to its public function; no behavior change.
  Report/source-comment commit `97195383` also passed the normal hook.
- Full production diff against `origin/main`: 239 changed source lines in 11
  files (including the final comment move), below 300. Tests/docs excluded by
  the same scope policy. No exception or split is required at this size.
- Combat core, lab/protocol/web TypeScript paths match main exactly. No new
  ruleset ID, bow cost table, lab feature or legacy-raider promotion.
- `apps/server/src/contracts/routes.ts` matches main exactly. Its account-before-
  company lock order and JOIN contention/ownership tests remain present.
- **Parent-authored records:** CHANGELOG and CURRENT_PLAN were already resolved,
  read back and staged by the coordinator. Their exact staged bytes accompanied
  `ba9d47f3`; this builder never edited either file or `docs/wiki`. Retained WIP
  README/wiki changes remain in ancestry; shared documentation reconciliation
  remains coordinator-owned.

## Delivered source

Projection 5 is paired with existing `m1-domain-bridge-v5`; frozen company/world
bindings, strict aggregate load/save, physical receipt reprojection, tactical
practice and terminal consumers recognize it. New wolf admission selects V5;
legacy raider admission remains V3. Existing saved setup/binding selects rules
on load/replay; no saved battle is promoted to the latest rules.

Owned audit fixes keep version identity paired in TypeScript and extract small
bridge-only predicates. Old/new public world-binding cases now exercise real
company plus world participants and strict aggregate roundtrip. The existing
physical receipt regression proves the previously corrected V5 consumer.

The new PG regression uses authenticated ordinary wolf JOIN, lawful fixture
bow ownership/two-hand equipment, existing supplies and the actual objective.
It selects supplied moves, sends native commands, asserts stored V5 setup/state/
binding, same activation step/shot, retry/one receipt, connection reopen/replay
and terminal effects. No encounter state, grant, command journal or policy is
injected. **This test is typechecked but has not reached admission at runtime.**
The fixture constructs accounts/company/starting gear/location; it does not
prove external OIDC, onboarding, acquisition or travel.

## Acceptance proof

| Contract criterion | Actual evidence and remaining limit |
| --- | --- |
| Ordinary bow 3 AP only, 16 stamina; aimed shot 4/24; shared preview/execution | Preserved main regressions passed. Fresh 1440×900 default-mill UI displays both costs. Native exported replay proves step then ordinary shot in `1:human-3`: AP 4→3→0, stamina 100→96→80. This is lab smoke, not persistent acceptance. |
| New persistent admission and complete frozen save shape | Company/binding and physical public specs PASS, including projection 3/4/5, world participants and aggregate roundtrip. New real-PG regression authored/typechecked; execution BLOCKED_ENV before admission. Native persistent rows/receipts NOT_RUN. |
| Actual persistent move1 + shot3, day/night | NOT_RUN. Saved day/night PNGs are default lab captures only; they do not substitute for persistent UI proof. |
| Insufficient AP/stamina, authorization/privacy | Preserved core 2 AP/15 stamina refusal and unchanged-state/RNG regressions PASS. V5 private grant/capability test PASS. New-version durable rejection rows and persistent browser refusal NOT_RUN. Historical server regressions preserved; no claimed fresh V5 persistent rejection proof. |
| Real restart preserves new saved version | NOT_RUN. New PG connection-reopen assertion is authored only, and is not a process restart. |
| Released replay bytes and genuine old-active continuation | Seven unchanged released baseline records exercised by passing bow-compatibility tests; main old ordering/refusal/replay tests retained. Old company/world bindings roundtrip alongside V5. Genuine retained old bridge-v4 active DB restart/continuation NOT_RUN; no historical fixture reset or battle relabeling. |
| New deterministic tactical replay and terminal consumption | Main finite sprite-v4/bridge-v5 autoplay/runtime cases PASS with real commands, repeated result, terrain, RNG and replay. V5 hostile-retreat terminal guard added to existing public terminal test and PASS. Real-PG terminal/effects/proof/idempotency NOT_RUN. No balance or load capacity claim. |
| Lab regression smoke | Actual default mill, day/night 1440×900; step and shot performed through normal controls; native downloaded replay prefix readback below. No routing, response substitution, CSS/state injection or fabricated server state. |
| Review/validator/CI/docs | Normal commits/audit PASS as described below. This is author proof only. Independent Tier L review, actual persistent evaluator, coordinator validator/full gates, hosted CI and publication NOT_RUN. Coordinator owns shared docs/ranged wiki and issue closeout. |

## Exact checks

- Core build: initial FAIL (retained V4/V5 return discriminants were not paired);
  fixed using a small typed version-identity helper, then PASS.
- Core/testkit/server typechecks: PASS. Retained binding test initially failed
  narrowing; corrected with an explicit projection 4/5 guard. New PG test initially
  failed unknown-row/command-envelope typing; corrected, final server check PASS.
- Initial focused integration run: 11 files PASS, 189 tests PASS / 1 SKIP.
  Files: the two named testkit specs; encounters access/terminal; combat
  bow-compatibility/runtime-v2/autobattle/skills/sprite-prototype; lab custom-battle;
  web view-validation. Log `focused-integration.log`.
- Final owned focused run: 4 files PASS, 81 tests PASS / 1 SKIP
  (`focused-final.log`). After adding projection 2/3/4/5 world-binding variants,
  named binding file PASS, 55 tests (`world-binding-final.log`).
- Scoped Prettier: initial access-test formatting FAIL, fixed; final PASS.
  Scoped ESLint PASS (`lint.log`, `lint-final.log`). Ordinary diff check PASS.
- `pnpm check:changes` ran after first edits, including each conflict resolution.
  Earlier audit failures are retained in local logs, not reported as successes.
  The first normal merge hook refused for introduced projection complexity and
  zero-coverage paths. Version-identity extraction fixed the owned cognitive issue.
  Its retry committed normally. A later test commit refused new uncovered world
  branches; finite predicate extraction and public old/new world-binding cases
  fixed them. Normal `4942771b` hook PASS, no threshold changes or bypass.
- Explicit integrated-main audit PASS with
  `FALLOW_AUDIT_BASE=d8a04196bcbcb13948b5a16e9874dfe08e1cdf5e pnpm check:changes`
  (`audit-integrated-main.log`). Normal commit hooks pin the merge-base with main.
  Hook-required related coverage ran normally; no full coverage run was invoked.
- Targeted actual PG attempt:
  `vitest run apps/server/src/encounters/postgres.integration.test.ts -t 'freezes bridge v5'`
  with `WARWRIT_ENCOUNTER_DATABASE_URL` pointing only to the new author container.
  **FAIL / BLOCKED_ENV: relation `identity_accounts` does not exist**;
  1 failed / 23 filtered SKIP. `pg-attempt.log`. Failure occurred before admission;
  fixture construction completed, but no persistent command acceptance is proven.
- A dedicated empty PostgreSQL 17 container `warwrit-bow249-author-pg`, private
  loopback port 32774, was created for the attempt and removed afterward. Existing
  DB6, JOIN/HUD evaluator DBs and other worktree processes were untouched.
  No migrations were run, as explicitly prohibited. A schema-provisioning or
  disposable-only migration authorization question was sent; no answer was
  received before this report. Coordinator must supply a migrated isolated DB.
- `orca-validate`, `pnpm verify`, global stress, migration suites, independent
  reviews and CI: NOT_RUN by instruction. No new technology/library API.

## Native lab evidence

`bash scripts/orca-play.sh start` served private web25244/API23244; a first
background-only start expired, then an attached launcher kept it alive. Playwright
used isolated session `bow249-author`, 1440×900. The npm wrapper initially hit its
unwritable default cache; a worktree-local cache resolved that without permission
or source changes. Only pre-existing favicon404 was observed in browser errors.

- Battle `f2330828-c352-4470-97e3-0761606413d4`, rules `sprite-prototype-v4`.
- Native replay contains prior ordinary AI commands. Actual human move is prefix5,
  request `f43d06d7-038b-4d2a-81d5-37c2f44d0e5d`, actor `human-3`, activation
  `1:human-3`, (2,5)→(3,5), leaving 3 AP/96 stamina.
- Actual shot is prefix6, request `54d729bc-47b3-4241-a3ee-7a8e86d0108d`, same actor/
  activation, target `opponent-1`, leaving 0 AP/80 stamina, RNG draws2. Native
  target display changes health50→31. Subsequent automatic wait advances the turn.
- Download `lab-smoke-replay.json`; deterministic prefix readback
  `lab-prefix-readback.json`. CLI snippets with console.log did not save native
  response objects; no response-body evidence is claimed from those log files.
- Captures: `shots/mill-day.png`, `shots/mill-night.png`,
  `shots/mill-day-shot-preview.png`, `shots/mill-night-shot-preview.png`,
  `shots/mill-after-shot.png`. Same scenario toggled between native day/night;
  this is one actual step/shot, not two separate persistent journeys.
- Closed only the named browser; ran `bash scripts/orca-play.sh stop` successfully.
  The attached log-tail session was stopped separately. No shared process killed.

All local evidence paths above are relative to `.orca/core-bow-three-ap/` and
are untracked local artifacts, not committed links. This report is the owning
builder handoff; shared records and wiki were not changed by this worker.

## Proposed coordinator CHANGELOG entry

2026-10-21, `codex/bow-three-ap-249`, LOCAL: finish company projection5, strict
binding/save/replay/receipt consumers and persistent tactical wolf admission using
already delivered bridge-v5. Preserve legacy raider/active versions and main's
JOIN lock order. Normal audited commits, scoped types/lint and finite public
regressions pass; real default-mill step→shot smoke gives4→3→0 AP and100→96→80
stamina. Real-PG attempt blocked by empty isolated schema; persistent restart,
old-active continuation, independent gates and CI remain pending. No migrations,
deployment, balance claim or #249/#218 closure.

## Handoff

Next: coordinator provisions a fresh isolated migrated database, runs the authored
PG regression, then actual persistent day/night/restart and genuine old-active
continuation evaluator. Inspect new PG assertions before relying on them; they
are unexecuted beyond fixture setup. Follow with validator and independent Tier L
source review on the final committed head; publish only after required acceptance.
There is no new product/rules question and no source-scope waiver.

## Round 1 bounded rework — 2026-10-21

Dispatch `task_58d39c57c365`; sole core builder/runtime owner. Started from clean
`codex/bow-three-ap-249` HEAD `3fb0368f`, the coordinator's additional records
commit after the brief's `cd487a8e`. Retained source/commits were not rewritten.
Read AGENTS.md, full contract, original report, review-1 and settled eval-1,
#249 body/comments, current plan/changelog and technology baseline. The graph
indexes another checkout at an old revision; direct source was used.

### Applied fix

Only the authored `freezes bridge v5` test changed: each actor now reads
`/contracts/first-hunt?instanceId=ci.m1.wolf-trail.01` immediately before JOIN and
asserts HTTP 200. JOIN still uses that response's `publicRevision`. Every existing
admission, command, save/replay, retry and terminal assertion remains intact.
No production path, guard, migration, fixture aptitude, journal or battle state
was changed. Shared records/wiki remain coordinator-owned.

### Actual isolated execution and new failure

Created disposable PostgreSQL 17.11 container
`warwrit-bow249-rework1-58d39c57`, database `bow249_rework1_58d39c57`, user
`bow249_rework1`, private mapping `127.0.0.1:32776 -> 5432`. Verified its identity
before writes. Applied the repository's 14 existing up migrations using
`pnpm exec tsx apps/server/src/db/migrate.ts up`: PASS, pending none.
This was isolated schema setup, not a migration suite or migration-file edit.

Ran exactly:

```text
WARWRIT_ENCOUNTER_DATABASE_URL=<owned disposable database> pnpm exec vitest run apps/server/src/encounters/postgres.integration.test.ts -t 'freezes bridge v5'
```

First run: **FAIL, 1 failed / 23 filtered skips**, 8.54 s. Repeated once without
source changes to reproduce: **FAIL, 1 failed / 23 filtered skips**, 7.92 s.
Both explicit wolf GETs and both ordinary JOINs returned 200. Execution passed
the V5 setup/state/binding/projection5 assertions, native supplied 1 AP move then
3 AP/16-stamina shot in the same activation, connection-reopen replay/exact retry/
single-receipt assertions, active lookup and saved setup/version assertions.
The existing lawful command helper reached its asserted company victory.
These are author test results; connection reopen is not process restart and
server injection is not browser input.

Both runs then throw at `postgres.integration.test.ts:4044`, the call to
`applyPendingFirstHuntTerminalEffects`, before the final effects/replay/retry
assertions. Exact error:

```text
TypeError: Combat practice action start is not bound to a capable company character
startSnapshotsForReceipt — apps/server/src/encounters/terminal-evidence.ts:149
prepareFirstHuntTerminalEvidence — terminal-evidence.ts:302
prepareCompanyTerminalEvidence — encounters/executor.ts:445
applyFirstHuntTerminalEffectsInTransaction — contracts/executor.ts:613
```

This is a new reproducible terminal-evidence boundary, separate from the fixed
stale-revision defect. The guard requires a bound participant/company character,
a skill and positive safe-integer aptitude. Which prerequisite fails and whether
the underlying cause is fixture data or production logic are **NOT_ESTABLISHED**.
No unsupported-retreat classification is inferred from this stack. No guard or
assertion was weakened; no terminal state was manufactured. Further correction
requires an explicit coordinator assignment; this worker stops source changes
at the requested two-line test fix. Supported terminal effects/completion/proof
and their exact retry remain unproven.

### Checks, evidence and cleanup

- Server typecheck (`pnpm --filter @warwrit/server typecheck`): PASS.
- ESLint on the changed test: PASS; scoped Prettier and `git diff --check`: PASS.
- `FALLOW_AUDIT_BASE=d8a04196bcbcb13948b5a16e9874dfe08e1cdf5e pnpm check:changes`:
  PASS, no new changed-file issues; 34 inherited findings excluded. Existing
  syntactic-attribution warning remains; it is not a semantic-proof claim.
- Normal `git commit -m 'test: read wolf revision before bow hunt JOIN'`:
  **FAIL, exit 1; no commit created**. The hook ran its focused related coverage,
  then `check:changes` failed with 93 complexity findings and 5 clone groups
  (80 inherited findings excluded). Its refreshed coverage reports many existing
  production functions as 0% tested. No failed-focused-test warning was emitted;
  the hook hides that runner's output, so no additional test count is claimed.
  The earlier explicit audit PASS used the pre-hook coverage file and does not
  supersede this final audit failure. The hook ran without the PG URL; integration
  cases requiring that variable were not fresh real-PG coverage proof.
  No coverage was restored, fabricated or regenerated outside the hook, and no
  audit base, threshold or hook was weakened to obtain a commit.
- No smoke/browser, full verify, standalone coverage, stress, migration suite,
  duplicate validator, independent review/evaluation, CI or publication was run.
  Hook-owned focused coverage ran during the refused normal commit only.
- Original `pg-attempt.log`, `eval-pg.log`, review-1 and eval-1 were preserved.
  New local logs: `rework1-migrate.log`, `rework1-pg.log`,
  `rework1-pg-repro.log`, `rework1-typecheck.log`, `rework1-lint.log`,
  `rework1-audit.log`, `rework1-commit.log`; paths are relative to
  `.orca/core-bow-three-ap/` and
  untracked local evidence, not committed links.
- Test-owned cleanup ran on both failures. Removed only this round's named
  disposable container and anonymous volumes; filtered container readback empty.
  No shared runtime/database or previous evaluator environment was reused.

Prior independent eval-1 V5 move/shot, true restart/retry/foreign-actor refusal,
genuine old V4 continuation and 14 + 47 focused PASS retain their original limits;
they are not this worker's new checks. Native V5 2 AP durable denial/browser
refusal, independently repeated complete day/night rendered move/shot journeys,
and supported terminal completion/proof/retry still require fresh Tier L gates.
The evaluator's hostile-leader retreat is an existing unsupported disposition;
its helper-authenticated move is not rendered input. Author acceptance is not
granted. No art/Tier V expansion, balance measurement or #249/#218 closure.

Coordinator handoff / **outcome failed**: the requested revision-read fix and this
report are staged locally; HEAD remains `3fb0368f`, because the normal commit was
refused. The full finite PG regression is red at the reproduced terminal-evidence
boundary above. Two blockers need coordinator assignment: investigate that
boundary within explicitly granted source ownership, and reserve/authorize a
legitimate focused-coverage/audit resolution for the retained production diff
before retrying the normal commit. No hook bypass is requested or permitted.
Then rerun the finite regression and fresh independent Tier L gates.
Proposed shared-record update: record this local test-only fix, both terminal
failures and unfinished acceptance; preserve original failing evidence. No push,
PR, merge, rebase, reset, Orca call, delegation, deployment or paid action occurred.

## Round 2 bounded rework — 2026-10-21

Sole source/runtime writer in the existing dedicated checkout; started at
`6109930d` (parent records-only closeout over `3fb0368f`). Preserved both staged
Round 1 files, all prior assertions and parent records. Read full contract,
report, review-1/eval-1, both rework1 PG logs and the refused commit log. The
available graph indexes a different old checkout; native source is authoritative.
No delegation, Orca call, shared-document edit, push, merge, reset or rebase.

### Exact guard diagnosis and smallest fixture correction

Diagnostic-only enrichment of the existing exception captured native receipt 8:
unit/character `0030570b-2072-4938-9f07-f1b8dd699072`, bound company
`1ad03d48-eeaa-4247-aa57-673810e79a1f`, native attack command
`ee56e821-0f9c-4957-9339-d068777cc25d` against `world.wolf.bereznyak.02`,
activation `1:0030570b-2072-4938-9f07-f1b8dd699072`. Participant and character
exist; skillId is `archery`; `aptitudeAtStartBps` is undefined. Native character
aptitudes contain exactly blades/defense/leadership at 10000. The failing input
is missing archery aptitude, not a V5 version selector, foreign character or
unsupported terminal disposition. `rework2-diagnostic.log` preserves that failure.
The diagnostic exception change was removed byte-for-byte; production source
is unchanged by this round.

Source provenance: `company-combat-aggregate-fixture.ts:addCombatSkills` models
only blades/defense/leadership. The new test's previous sword-to-bow replacement
therefore lacked archery-practice preparation. Production opening
`company/opening.ts:prepareOpening` generates enabled-skill aptitudes and exact
leader skill progress from its accepted opening profile. The fixture now uses
existing `issueOpeningOption`, `createOpeningAggregate`, `openingOptionView`
and public `prepareCompanyLifecycle(CreateCompany)` to generate the leader's
skill/aptitude profile, retaining its original skill source binding. There are
no hand-assigned aptitude/skill numbers. Only that leader receives a bow with
its existing item identity/owner; its shield is stowed. Other fighters retain
the original sword fixtures and their existing profiles. This is explicit
pre-admission synthetic fixture composition, not proof of onboarding, purchase,
equipment acquisition or travel. No canonical encounter state, command journal,
response, policy or grant was altered.

Intermediate attempts remain failures: first opening call omitted required
payload company/world IDs (INVALID_COMMAND, fixed); generating profiles for all
fighters exposed missing exact archery progress on non-archer candidate templates
(INVALID_STATE during receipt consumption). Limiting bows to the generated
leader avoids inventing skill grants. Its first iteration encountered another
owned sword activation and correctly refused the old hostile-wake-only helper
assumption; ordinary authenticated waits now advance those other owned turns.
Original hostile-wake assertions remain intact. Logs: `rework2-pg.log`,
`rework2-pg-fixed.log`, `rework2-consume-diagnostic.log`, `rework2-pg-leader.log`.

### Finite author result and limits

Fresh PostgreSQL 17.11 container `warwrit-bow249-rework2-f363b29d`, database
`bow249_rework2_f363b29d`, private loopback port 32778. Native version/database
identity was checked before applying only the 14 existing up migrations;
`rework2-migrate.log`: PASS, pending none. No new migration or migration suite.
The owned database stays available through the normal hook, with
`WARWRIT_ENCOUNTER_DATABASE_URL` in its environment.

Finite test command: `pnpm exec vitest run
apps/server/src/encounters/postgres.integration.test.ts -t 'freezes bridge v5'`
with that disposable URL. `rework2-pg-final.log`: 1 PASS / 23 filtered SKIP.
Added native one-proof/one-terminal-receipt-per-company/completed-root checks,
plus a second terminal-effects call and exact original shot retry comparing
unchanged complete roots/receipts/proof rows. Final `rework2-pg-proof.log`:
1 PASS / 23 filtered SKIP. This reaches every original assertion and establishes
supported terminal completion/proof/idempotency at the author integration-test
boundary. Company victory is produced only by actual legal commands. The
connection reopen remains different from a true process restart.

Server typecheck, scoped ESLint, scoped Prettier and ordinary diff check: PASS
before final closeout. Initial post-edit `pnpm check:changes` PASS on its default
2-file scope (`rework2-first-audit.log`); this is not the normal hook's main-base
gate. Related current-source coverage and normal audited commit results follow.
All prior rework1 failures, including 93 findings/5 clone groups, remain history;
no old coverage was restored, no audit base/threshold/hook/exclusion changed.
Production source scope remains 239 lines against origin/main; no new production
change or unrelated complexity restructuring was needed for the fixture defect.

No rendered output changed, and this round's override restricts runtime work to
the finite defect proof: screenshots/browser smoke NOT_RUN; prior images retain
their original limitations and are not relabeled as fresh evidence. Native 2 AP
browser refusal and complete rendered day/night move journeys remain for fresh
independent Tier L gates, alongside independent terminal/proof/retry acceptance.
Coordinator validator/full gates/CI NOT_RUN here. No author acceptance waiver,
balance measurement, migration change, deployment or issue closure.

Proposed parent CHANGELOG amendment: local round 2 corrects invalid bow fixture
through the existing public opening producer, preserves the guard and all
Round 1 assertions, and adds native supported-terminal proof/retry regressions;
independent playable acceptance and coordinator gates remain pending.


### Final coverage, normal commits and cleanup

- Related current-source coverage: **84 files PASS / 6 files SKIP; 689 tests
  PASS / 34 SKIP**, 61.22 s (`rework2-related-coverage.log`). Ran `vitest related
  --run --coverage --mode coverage` with the PG URL, targeting all six changed
  company production modules, the two owned testkit specifications, encounter
  access/admission/executor/terminal-evidence, the PG regression and contracts
  executor. This is finite dependency-selected coverage, not the full suite.
  The V5 test also passed in that source-alias coverage run.
- Final server typecheck and scoped ESLint: PASS (`rework2-types-final.log`,
  `rework2-lint.log`); scoped Prettier and ordinary diff check PASS.
- **Normal source/test commit `5d87f0e1`**: PASS. The hook refreshed its own
  related coverage with the owned PG URL and live database; no failed-focused-test
  warning. The hook then pinned its usual main merge-base `d8a04196`, audited
  22 changed files and reported **no new issues**, 29 inherited findings
  excluded (`rework2-commit.log`). Its displayed whole-scope 27 complexity
  findings / 5 clone groups are not new gate failures. No threshold, exclusion,
  hook or audit-base override was introduced. The earlier Round 1 hook failure
  remains recorded and preserved; current source coverage supersedes only its
  zero-coverage artifact, not its historical failed outcome. No coverage copied
  or restored; no unnecessary production refactor made to influence coverage.
- Confirmed production source diff against `origin/main`: **239 changed lines**,
  unchanged by this test-only round, under the 300-line limit. The temporary
  diagnostic changes are absent; production source is unchanged from the parent.
- After the normal audited commit completed, removed only
  `warwrit-bow249-rework2-f363b29d` with its anonymous volume. Exact-name container
  readback is empty. Test-owned cleanup ran; no other database/runtime touched.
- Report-only closeout accompanies the next normal documentation commit. Shared
  CHANGELOG/CURRENT_PLAN/wiki remain parent-owned; proposed entry is above.

Builder outcome: **succeeded within the bounded rework scope**, with the original
staged files now normally committed and a clean test-only fix. Independent
acceptance remains open: coordinator validation and fresh Tier L rendered
journeys/native 2 AP refusal/terminal-proof-retry review must run on the new head.
This author proof is not an ACCEPT, process-restart proof or permission to
publish/merge. No new rule question or ownership blocker remains.

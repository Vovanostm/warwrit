# #249 persistent bow builder — 2026-10-21

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

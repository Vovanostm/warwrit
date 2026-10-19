# Changelog

Notable changes to the repository's tooling, gates and delivered behavior. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project has no released versions yet, so entries stay under _Unreleased_. New
entries include their date, originating branch and actual delivery status; record
the merge date when merged. Earlier history is in the Git log and merged pull
requests.

## Unreleased

### Add the human-opponent preset producer and playable evidence

- 2026-10-20, branch `codex/human-battle-228`, local: implement #228 catalog
  presets in server `custom-battle.ts` and optional protocol metadata. The new
  human band demonstrates existing morale/surrender/withdrawal behavior;
  defaults, rules, AI and replay formats remain unchanged. Independent source
  review and played evaluation ACCEPT9534bf7;17focused tests and prior
  coordinator validate8/8PASS. Two UI seeds surrendered2/1 opponents, manual
  withdrawal reaction and3downloaded replay checks passed; default reset and
  restoration passed. [Evidence and remaining picker](docs/engineering/evidence/core-preset-deserters/README.md).
  Integrated validator 8/8 PASS at ce45df4 (179 tests passed, 47 skipped); hosted CI pending; no whole#228/scene acceptance.
  Updated battlefield wiki and CURRENT_PLAN; no migrations or dependencies.
- Dated correction: documentation PR178 is MERGED at1b1e088; PR CI39324349645
  and main CI39326177324 SUCCESS. Earlier pending receipts remain historical.
  #227 visual/playable REWORK and #164 classifier/rescue limits stay explicit.

### Record the approved bounded profile policy

- 2026-10-20, branch `codex/combat-wiki-checkpoint-20261017`, local:
  record the direct owner answer for #164 in CURRENT_PLAN/M1_PRODUCTION_PLAN:
  provisional fists range1/damage6/2AP/8stamina, no penetration or weapon XP;
  immobile members cannot independently move/retreat, assisted transport unresolved.
  [Decision](https://github.com/Vovanostm/warwrit/issues/164#issuecomment-6277245952)
  was published and read back exactly. Implementation remains pending.
  Prior documentation head `95069eb` independently ACCEPTED; validate5/5,
  scoped format/diff and53new links/anchors PASS. PR178 exact-head CI pending.

### Reconcile the M1 queue with delivered combat changes

- 2026-10-19, branch `codex/combat-wiki-checkpoint-20261017`, local correction
  for [PR178](https://github.com/Vovanostm/warwrit/pull/178): owner authorized
  implementation, review and merge of the assessed fix sequence. Preserve the
  original task queue and dated receipts while correcting PR160/PR239 delivery
  and the closed #162 gate in CURRENT_PLAN, M1_PRODUCTION_PLAN and wiki navigation.
  The remaining persistent-combat and recovery work is not declared delivered.
  [Queue amendment](docs/engineering/M1_PRODUCTION_PLAN.md#current-amendment--2026-10-19).
  Scoped formatting/diff checks PASS; new relative targets PASS. Five inherited
  absolute evidence links are unavailable and unchanged. Merge hook initially
  failed on missing coverage; one inherited zero-AP route test ran with coverage
  (1 PASS, 15 SKIP) to satisfy that hook. Independent review pending; full gate
  and browser NOT_RUN. No code, migrations or deployment.

### Prepare a human-opponent battle preset

- 2026-10-19, branch `codex/human-battle-228`, local: owner requested
  implementation, review and merge of the playable fix sequence. The #228
  contract reuses current human profiles and S4 morale/escape/reaction rules,
  preserves the mill default and adds compatible server catalog presets before
  the sequential editor picker. Implementation and gameplay checks NOT_RUN.
  Parent coordinates shared records; no rule or lore change is authorized here.

### Stage names producer merge and retain actor-foundation REWORK

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, published
  [PR239](https://github.com/Vovanostm/warwrit/pull/239), merge stage:
  head `902d2e8` has successful clean-checkout CI39290710765; branch contains
  current main `073a02b`, no integration needed. Tier L reviewer/evaluator
  ACCEPT for gated `f5803e5` and coordinator validate8/8 remain applicable:
  later commits contain evidence and these shared records only. No blocking
  labels or unresolved review threads observed. This record needs exact-head
  CI before expected-head merge; it does not claim that merge has happened.
  #207 stays OPEN for visible captions, terminal cards and inherited layout
  limits; [producer proof](docs/engineering/evidence/uix-w1-names/README.md).
  #186 visual1 now settled REWORK/BLOCKED on `c60fd5e`: missing native125,
  loaded layering/input, marker comparison and contrast proof, plus inherited
  overview scene-integration score1. Combined proof rework1 is next; inherited
  readability/safe-area/terminal/tooltip allocations remain unaccepted and
  cannot be waived by the foundation split. Updated CURRENT_PLAN; no mechanics,
  setup or wiki behavior change. New local full gate/playtest/deploy NOT_RUN;
  performance/balance NOT_MEASURED.

### Publish stable fighter-label and replay-presentation producer proof

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, published producer
  `796fa52` in [PR239](https://github.com/Vovanostm/warwrit/pull/239), CI/merge
  pending, refs #207. Server/protocol retain detached
  full-roster duplicate labels and optional replay presentation metadata; canonical
  replay/history/RNG/rules and authorization unchanged. Tier L reviewer1 and
  played evaluator1 ACCEPT for `f5803e5`; coordinator validate8/8 PASS,
  178PASS/47SKIP,auditPASS. Evaluator36 focusedPASS,72 matched before/after
  captures across three desktop sizes and genuine125%, day/night; real manual
  first death then autobattle to R10/rev171 and downloaded-only reconstruction
  match live/baseline canonical results. Evidence-only commit `a40d901` retains
  reports and28 small JPEGs. [Proof and limits](docs/engineering/evidence/uix-w1-names/README.md).
  #207 remains OPEN: field captions, terminal inspection and inherited HUD/log
  clipping belong to sequenced consumer/layout owners. Actor foundation #186
  evaluator1 REWORK: missing native125/matched crowd, full layering/input,
  contrast and manual/AP0/reconstruction proof; no new source defect established.
  Combined rework waits for its live visual critic; no concurrent source writer.
  Updated CURRENT_PLAN; mechanics/setup/wiki contracts unchanged by this producer
  receipt. Hosted full gate pending; new local full suite/deploy NOT_RUN,
  numeric contrast/performance/balance/capacity NOT_MEASURED.

### Advance names and actor foundation to independent tier gates

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, local
  coordinator receipt for names producer `796fa52` and scene foundation
  `c60fd5e` on `Vovanostm/uix-w1-scene`, refs #207/#186 without closure.
  After exact scene worker settlement, coordinator validators ran sequentially:
  names EXIT0/8of8 (178 relatedPASS/47SKIP), scene EXIT0/8of8 (35PASS);
  both audits PASS and tracked trees clean. This supersedes the interrupted
  names validation status below; worker smoke is not independent acceptance.
  Names advances to Tier L reviewer/evaluator; scene to Tier V evaluator/visual
  critic. Full desktop/native125, contrast and applicable layered-scene proof
  remain gate work, not a waived requirement. Captions/terminal naming and
  inherited scene/tooltip findings retain their existing owners and sequencing.
  [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md) records the gate handoff;
  no PR/publication/merge/deployment or full-issue acceptance in this receipt.
  Local contracts/reports remain under each slice's ignored `.orca/` directory;
  wiki behavior is unchanged pending delivery. Today three merged playable
  producers (#229/#237/#238); this tick zero merges.

### Route names consumer gaps without claiming full issue acceptance

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, local source
  `796fa52`, refs [#207](https://github.com/Vovanostm/warwrit/issues/207):
  server-owned duplicate labels and optional replay presentation metadata are
  committed; full-contract builder outcome is FAILED, not acceptance.
  Builder reports focused36PASS, related178PASS/47SKIP and validator8/8;
  these are worker claims, not coordinator gates. Builder played the default
  mill to R11/rev177 and reconstructed the downloaded replay with all12 labels.
  Visible field captions and terminal fighter inspection are sequenced into
  `uix-w1-name-consumers` (Tier V, after names/range-outline/outcome) in local
  `.orca/pipeline/slices-local.json`; producer PR must use Refs, never Closes.
  Native125% and the complete baseline matrix still need independent proof.
  Coordinator validation was interrupted after six checks to respect the scene
  worker's existing serial reservation; related-tests/audit did not complete,
  so no validation pass is claimed. Fresh validate and Tier L review/evaluation
  wait for scene settlement. No PR, merge, deployment or full-issue acceptance.
  Updated [CURRENT_PLAN](docs/engineering/CURRENT_PLAN.md); wiki behavior is
  unchanged pending delivery. Local report: `.orca/uix-w1-names/report.md`.

### Record PR238 merge and release single-issue successors

- 2026-10-19, originating branch `Vovanostm/uix-w1-names`, local receipt of
  merged [PR238](https://github.com/Vovanostm/warwrit/pull/238): expected
  head `3377996`, merge/main `073a02b`, exact-head CI39271231939 SUCCESS.
  Tier L reviewer1 and played evaluator1 ACCEPT for `3ea21b0`; coordinator
  validate8/8,732PASS/47SKIP,auditPASS; later evidence/shared-record paths PASS.
  #187 remains OPEN for its rendered contour. Names #207 may plan on merged
  main; the former scene #186/#187 scope is split before its next start under
  workflow v3, preserving its old plan and all assigned integration findings.
  [Existing proof](docs/engineering/evidence/uix-w1-skill-reach/README.md) is
  reused; new main playtest/game gates/deployment NOT_RUN.

### Supply current learned-skill geometry for the scene consumer

- 2026-10-19, originating branch `Vovanostm/uix-w1-skill-reach`, published
  producer implementation `3ea21b0`, refs #187; PR/CI pending.
  Pure core query shares existing spatial admission checks; optional protocol,
  server projection and web validation carry all learned skill shapes with
  current actor/activation/revision. Legacy omission/empty geometry supported;
  rules, costs, RNG, replay schemas and visual source preserved.
  Fresh Tier L reviewer and played evaluator ACCEPT; coordinator validate EXIT0,
  8/8,732PASS/47SKIP,auditPASS; evaluator69 focusedPASS and actual baseline/candidate
  mill victory/replay checks. Fresh15 baseline-saved streams match canonical
  state, complete events and accepted counts across schemas1/2 and five rulesets.
  [Evidence and limits](docs/engineering/evidence/uix-w1-skill-reach/README.md).
  Updated CURRENT_PLAN; wiki mechanics unchanged. #187 remains open for rendered
  outline/legend/CVD and integrated scene findings. Hosted full gate pending;
  no merge/deploy or performance/balance measurement claimed.

### Merge the affordability producer and start skillReach planning

- 2026-10-19, originating branch `Vovanostm/uix-w1-skill-reach`, local receipt
  of merged [PR237](https://github.com/Vovanostm/warwrit/pull/237): merge/main
  `0c4b98d`, expected head `ca28ebd`, exact-head CI39257227488 SUCCESS.
  Tier L reviewer/evaluator ACCEPT on `c055e9a`, integrated validate8/8 PASS;
  later source unchanged, merged-tree diff empty, no blocking labels/threads.
  #184 remains open for scene bands/legend/CVD/legacy rendering. Starts only
  the dependent #187 skillReach producer contract; scene/names remain sequenced.
  [Proof](docs/engineering/evidence/uix-w1-affordability/README.md).
  New game checks/main playtest NOT_RUN; no deployment. Local reports retained
  before removing the completed worktree with archive hooks.

### Reconcile PR237 with the latest slice plan before merge

- 2026-10-19, originating branch `Vovanostm/uix-w1-affordability`, published
  producer PR [237](https://github.com/Vovanostm/warwrit/pull/237), merge pending.
  Prior head `7c05b14` passed CI39253806343. Normal main integration
  `1b364d3` includes `06b32bb` (PR236 slice plan); the only conflict was
  additive CHANGELOG entries, both retained. Gated apps/packages are unchanged
  from `c055e9a`; Tier L reviewer1 and played evaluator1 ACCEPT remain applicable.
  Fresh coordinator validator on `1b364d3`: EXIT0,8/8,709PASS/47SKIP,auditPASS.
  Evidence-only and shared-record path checks PASS. New-head hosted CI must pass
  before expected-head merge; no deployment or new playtest claimed.
  #184 stays open for the downstream bands/legend/CVD/legacy scene consumer.
  [Proof and limits](docs/engineering/evidence/uix-w1-affordability/README.md).

### Restore the post-movement attack affordability producer

- 2026-10-19, originating branch `Vovanostm/uix-w1-affordability`, published
  implementation, refs #184 (producer subset only).
  Core derives optional `movementPreview[].attackAffordableAfter` through shared
  admission/resource policy; protocol/server expose it and the web validates its
  shape, including legacy omission. Six owned source/test paths; no command,
  rules/RNG/replay/migration or visual changes. Independent reviewer1 and
  evaluator1 ACCEPT on `c055e9a`; evaluator62 focusedPASS,29 live boundaryPASS,
  96 matched before/after captures with native125%, real move/end-turn and
  UI-autobattle victory R10/rev182 (93 accepted orders; terminal0 extra).
  Main `f365f60` integrated by normal merge `59af0ab`; only additive shared-doc
  conflicts resolved, both histories retained, gated apps/packages unchanged.
  Coordinator integrated validate EXIT0/8of8,709PASS/47SKIP,auditPASS.
  Fifteen baseline-saved replay streams on schemas1/2 and five rulesets produce
  identical canonical states, complete events and accepted-command counts.
  Paired 10,000-battle stress matches every deterministic output (duration excluded);
  20 deterministic reruns/100 replay checks PASS. Final hosted clean-checkout CI
  pending before merge.
  #184 stays open for bands/legend/CVD/rendered legacy fallback in uix-w2-scene;
  baseline-only zoom-readback anomaly retained in evaluator provenance.
  [Independent proof](docs/engineering/evidence/uix-w1-affordability/README.md).
  No deployment; performance/balance/capacity NOT_MEASURED.

### Record PR229 merge and start the affordability producer contract

- 2026-10-19, originating branch `Vovanostm/uix-w1-affordability`, local
  receipt of merged [PR229](https://github.com/Vovanostm/warwrit/pull/229)
  from `Vovanostm/uix-w1-projection`: expected head `2508eb6`, merge/main
  `1665527`, owner `agent:merge-approved` present, exact-head
  [CI39243122114](https://github.com/Vovanostm/warwrit/actions/runs/39243122114)
  SUCCESS, no blocking review threads; ordinary merged-tree diff empty.
  #180 is CLOSED / `agent:done`; evaluator4 ACCEPT and existing played proof
  are reused, not rerun. No new game checks or main playtest: NOT_RUN.
  Pipeline tick starts only the #184 producer contract on this branch;
  bands/legend/visual acceptance and issue closure remain with uix-w2-scene.
  Updated CURRENT_PLAN, owning wiki and
  [proof receipt](docs/engineering/evidence/uix-w1-projection/README.md).
  Projection worktree removed with archive hooks after preserving local reports;
  desk/outcome REWORK and successor dependencies remain. No deployment.

### Slices for playtest findings and QA hooks

- 2026-10-19, branch `claude/slices-227-228-235`, studio director: added
  one-issue slices to the Orca plan — #228 as producer `core-preset-deserters`
  (core, Refs) and consumer `uix-preset-picker` (web, closes it), #227
  `uix-overview-zoom` (web, tier V) and #235 `qa-game-hooks` (web) — each
  sequenced with `after` behind every slice that owns the same files (reviewer
  REWORK fixed); `core-melee-connect` tier L; `uix-w4-bow` lane corrected to core.

### Orca workflow v3: contract first, one issue per PR, merge on gates

- 2026-10-19, branch `claude/orca-workflow-v3`, published: owner removed the
  per-PR owner merge gate («На это есть тесты и агент — ревьюер»), asked for one
  issue per PR and a shared contract before parallel work. `warwrit-orca` now
  merges on CI + validate + tier gates (D/L/U/V; art-grade visual critique only
  for art and scene), splits multi-issue slices, starts new epics with an epic
  contract PR ([prompt](.agents/skills/warwrit-orca/prompts/epic-contract.md)),
  reports state changes plus a daily digest; tick prompt updated. Diagnosis of
  v2 and sources in [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#workflow-v3--contract-first-one-issue-per-pr-merge-on-gates--2026-10-19).

### Integrate current main before the approved PR229 merge

- 2026-10-19, originating branch `Vovanostm/uix-w1-projection`, local
  integration for [PR229](https://github.com/Vovanostm/warwrit/pull/229).
  The live `agent:merge-approved` label enables the merge stage. Integrated
  main `6f1fbae` with a normal merge to preserve published commits and avoid
  force-push; resolved only additive CHANGELOG/CURRENT_PLAN conflicts,
  retaining both histories. Main changes are documentation/plan/skill only;
  game source remains the evaluator4-accepted candidate. Prior CI39196517767
  SUCCESS applies to `35c117e`. Fresh coordinator validate on integration
  `128fcb0` PASS8/8 (702 tests PASS/47 SKIP, audit PASS); scoped
  format/diff/added-link checks PASS. Publication and exact-head CI pending.
  No game rule, replay, migration or renderer change; merge NOT_RUN.
  [Current proof](docs/engineering/evidence/uix-w1-projection/README.md).

### Repair the web validator fixture after PR229 CI failure

- 2026-10-19, originating branch `Vovanostm/uix-w1-projection`, published
  correction for [PR229](https://github.com/Vovanostm/warwrit/pull/229):
  CI39192938216 exposed server imports in the web validator regression fixture.
  Commit `9c92995` replaces them with protocol-shaped synthetic data in
  `apps/web/src/combat-lab/view-validation.test.ts`, preserving all eight
  regression bodies and the separate real server integration tests. Production
  code is unchanged from accepted `fa7f516`. Coordinator validation8/8,
  702PASS/47SKIP and normal45-file audit PASS; fresh evaluator4 ACCEPT,
  25 focused tests, web typecheck/input-boundary and day/night smoke PASS.
  The initial audit with validator-only coverage failed; focused server
  coverage restored the normal audit. Historical bootstrap/matrix/replay proof
  remains attributed below; new-head hosted CI and owner-approved merge pending.
  [Proof and limits](docs/engineering/evidence/uix-w1-projection/README.md).

### Publish ordinary attack refusal projection for UIX-01a

- 2026-10-19, originating branch `Vovanostm/uix-w1-projection`, published in
  [PR229](https://github.com/Vovanostm/warwrit/pull/229): #180 and owner D1 require one optional server-owned
  refusal or preview per active public enemy. Core admission is shared by
  execution and projection; protocol/server publish sanitized refusal facts,
  and the web boundary rejects malformed previews before overlap traversal.
  Paths: `packages/game-core/src/combat/`, `packages/protocol/src/combat-lab.ts`,
  `apps/server/src/combat-lab/`, `apps/web/src/combat-lab/view-validation{,.test}.ts`.
  #184 was extracted by normal revert for reuse in its own slice; #187/#207
  remain downstream. No rules/RNG/replay/migration change. Independent eval3
  ACCEPT, validator8/8 and clean bootstrap PASS (833PASS/47SKIP,10kstress,
  14DB); paired stress and15 saved replay streams equal. Native125% and all
  three day/night source pairs captured. CI/merge pending; privacy is limited
  to the all-visible lab. [Proof and limits](docs/engineering/evidence/uix-w1-projection/README.md).

### Studio operating model, mechanics reconciled with S4, art lane, melee slice

- 2026-10-19, branch `claude/studio-operating-model`, published (PR pending
  owner merge label): owner «продолжай работать автономно, ты — директор
  студии и отвечаешь за качество продукта». Added the
  [studio operating model](docs/engineering/AGENT_TEAM.md#studio-operating-model--2026-10-19)
  (decision rights, cells/lanes, daily digest, quality bar, retro, order of
  work). Director's audit found the mechanics wiki behind the code: zone of
  control, morale/flight/surrender, telegraphed intent and height/mud/fire are
  already in sprite S4 (PR157) — pages and the index now say so with source
  links; melee-always-connects (owner 2026-10-07) is still not implemented.
  Added the [warwrit-art](.agents/skills/warwrit-art/SKILL.md) skill with
  `scripts/composite.py` (crop/paste/diff; smoke PASS). Opened issue #225 and
  slice `core-melee-connect` (lane core, after `uix-w1-names`;
  `uix-w4-bow` now after it). Director playtest of the combat lab (main
  `8486177`, 1440×900): no battlefield overview at max zoom-out (#227);
  default scenario has only beasts/creatures, so morale/flight/surrender never
  show — human «deserter band» preset requested (#228); autobattle 8 rounds,
  5:0, deterministic seed (noted on #173). Docs/plan only; no game code changed.

### Switch the Orca pipeline to game-development workflow v2

- 2026-10-19, originating branch `claude/orca-workflow-v2`, local/PR pending:
  owner asked to prepare the agent team and a working development workflow
  after the first pipeline day produced no commit or PR. The `warwrit-orca`
  skill now defines roles (coordinator, contract writer, lane builder,
  evaluator, visual critic), replaces plan + plan review with a short contract,
  caps writers to one per lane (`web`, `core`), requires builds to end in
  commits, has a fresh evaluator play the changed journey in `pnpm dev:combat`
  plus a VISUAL_CRITIQUE-scored critic for visual diffs, and adds a fallback
  ladder (restructure, split a one-issue finding, split oversized slices)
  before `needs-owner`. Slice plan: `lanes`, `lane` per slice, #207 split into
  `uix-w1-names`, `uix-w4-text` now waits for `uix-w2-log`. PR223 (audit before
  commit, wall-clock loop) MERGED bf0ce5b 2026-10-19. Paths:
  `.agents/skills/warwrit-orca/`, `docs/engineering/AGENT_TEAM.md`,
  `docs/engineering/CURRENT_PLAN.md`. Checks: prettier; skill/prompt readback;
  live tick under v2 NOT_RUN until merge.

### Run the commit audit before workers commit

- 2026-10-18, originating branch `claude/orca-audit-early`, local/PR pending:
  owner review of the running pipeline. `uix-w1-desk` and `uix-w1-outcome`
  exhausted both recoveries because workers first met the pre-commit
  `pnpm check:changes` audit (cyclomatic/cognitive complexity, CRAP) when the
  commit was rejected. Worker plan/implement briefs now require shaping code for
  that audit and running it before each commit; `scripts/orca-validate.sh` runs
  the same audit. The skill records the owner's one-extra-recovery allowance for
  audit-only blockers and how a `needs-owner` slice resumes from its existing
  worktree after an owner decision on #217; decisions are #217 comments headed
  `## Owner decision`, because owner and coordinator share one GitHub account.
  The `--loop` mode of `scripts/orca-pipeline-tick.sh` now holds `caffeinate -i`,
  counts its interval in wall-clock time (macOS `sleep` stalled the loop from
  16:02 to 22:23 while the Mac slept) and ticks early when a worker reports.
  Paths: `.agents/skills/warwrit-orca/` (SKILL.md, prompts),
  `scripts/orca-validate.sh`, `scripts/orca-pipeline-tick.sh`.

### Let the pipeline coordinator resolve slice ownership

- 2026-10-18, originating branch `claude/orca-ownership-rules`, local/PR pending:
  the second coordinator tick stopped `uix-w1-outcome` and `uix-w1-log` with
  `needs-owner` because the slice plan omitted tests, gave `CombatLab.tsx` to two
  slices and lacked historical morale facts for #204. Slices now own their
  tests; outcome owns the autoplay/terminal part of `CombatLab.tsx`; the log
  slice moves to wave 2 after projection/outcome/desk and owns additive morale
  event facts. The coordinator extends ownership itself when no active slice
  owns a file and sequences otherwise. Merged PR221 recorded (585af1f).

### Make the Orca pipeline run headless Codex workers

- 2026-10-18, originating branch `claude/orca-headless-workers`, local/PR pending:
  owner asked to make agent auto-execution work under the organization Codex
  policy. Workers and the coordinator run `codex exec --approve-for-me` from
  plain Orca terminals with non-injected Dispatches (`orca-start-worker.sh`,
  `orca-codex-worker.sh`, result schema); `orca-pipeline-tick.sh` runs one
  coordinator tick or a visible loop; `slices/epic-217.json` covers all 39
  issues; skill and prompts rewritten for headless reporting. Merged as
  [PR221](https://github.com/Vovanostm/warwrit/pull/221) (585af1f). Smoke: setup,
  sandboxed commit, worker_done, orca/gh/git-push probe PASS; first full tick
  NOT_RUN at commit time.
  [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#issue-pipeline-in-orca--2026-10-18).

### Run issues through an Orca pipeline

- 2026-10-18, originating branch `claude/orca-issue-pipeline`, local/PR pending:
  owner decision to implement issues only through Orca orchestration with Codex
  workers. `warwrit-orca` now defines the plan → plan review → implement →
  validate → review → PR/CI → owner-approved merge → docs state machine with
  GitHub `agent:*` labels; worker prompt templates; deterministic
  `scripts/orca-validate.sh` and `scripts/orca-issue-state.sh`. First wave
  launch failures and prerequisites recorded in
  [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#issue-pipeline-in-orca--2026-10-18).
  Validate gate PASS on its own branch; end-to-end run NOT_RUN.
  Merged 2026-10-18 with owner approval: [PR220](https://github.com/Vovanostm/warwrit/pull/220),
  merge `e001c25`, CI PASS.

### Configure Orca for parallel agent worktrees

- 2026-10-18, originating branch `claude/orca-parallel-setup`, local/PR pending:
  owner asked to configure Orca for maximum safe agent parallelism. Added
  `orca.yaml` (setup/archive hooks, wait-for-setup, Agent/Shell tabs, issue
  command), `.worktreeinclude`, `scripts/orca-setup.sh` (frozen install, package
  builds, private combat-lab ports) and `scripts/orca-archive.sh`;
  `pnpm dev:combat` reads `.worktree-ports`; new `warwrit-orca` coordinator skill.
  Research and limits in [AGENT_TEAM](docs/engineering/AGENT_TEAM.md#orca-parallel-worktrees--2026-10-18).
  Setup, dual-port combat lab and archive cleanup PASS on a fresh worktree;
  Orca hook execution and a supervised run NOT_RUN until merged.
  Merged 2026-10-18 with owner approval: [PR219](https://github.com/Vovanostm/warwrit/pull/219),
  merge `0763bc4`, CI Verify clean checkout PASS.

- 2026-10-17, originating branch `codex/combat-readability` → `main`, merged:
  owner-authorized [PR160](https://github.com/Vovanostm/warwrit/pull/160),
  reviewed1bb92aa/merge94bfe2558ec7ad48a2b3e2b596796131c0caacae,
  ordinary reviewed-to-merge tree diff empty. Deliver whole sharp portraits/
  figures, vitals below portraits/feet, larger shared cells and readable ink
  terrain/banks for edited/generated battles, preserving rules and navigation.
  Full independent visual ACCEPT, source reviews DONE; cleanCI39051364869
  SUCCESS820unit/47SKIP/10kstress/20determinism/100replay/14DB/coverage/66fileaudit
  (8inherited excluded). Actual main5336/3036 day-night/navigation/geometry/
  move/endturn/autobattleR9rev163/terminal/restart PASS. Primary dirty WIP and
  other stand preserved. This receipt changes only Markdown; game tests NOT_RUN
  for it. Retain failures/history, nonblocking rut/fire polish and finite limits.
  [Merged result and provenance](docs/wiki/battlefield-test-maps.md#поставка-pr160-в-main--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local follow-up after
  73a4d40 CI39048861412 FAIL at boundaryCRAP30: build the common emphasized-ID
  list once per marker refresh and reuse it in per-unit outline application.
  Same source membership/visibility/colors; independent source readback confirms
  freshness and equivalence, types/lint/markers4/browser day-night-day PASS.
  Fresh local coverage820PASS/47SKIP and pinned-main66-file audit PASS
  (8inherited excluded); first upstream-only1fileaudit was repeated with main.
  No gate/test limits or visual changes. Current visual ACCEPT retained;
  new-head CI/merge pending. [Owning result](docs/wiki/battlefield-test-maps.md#авторские-материалы-и-узкий-связный-уступ--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction after published
  ee3103a CI39046615446 FAIL: factor the same active/night/emphasis condition
  in `sprite-battle-scene.ts` to remove a fresh-coverage cyclomatic6/CRAP42
  regression. Independent source readback confirms all8 boolean states;
  types/lint/markers4 PASS. No visual/command behavior change or gate suppression.
  Record full ee3103a absolute visual ACCEPT (21images+2references, game all2,
  close3/3/2/2/2/2/2), normal66-file audit PASS, clean reload and remaining polish
  in the existing wiki/index/log/current plan. New-head CI/merge pending.
  [Result and CI boundary](docs/wiki/battlefield-test-maps.md#авторские-материалы-и-узкий-связный-уступ--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local technique correction
  after d185b71 full visual REJECT: replace fine uniform earth with original
  ink-yard-earth, classify authored plate stone/soil masses into fixed-scale
  materials, attach real-field UV to physical slopes, narrow connected banks
  around deterministic0.78–0.88radius plateaus, and show inked exposed earth.
  Add original alpha ruined-yard fringe/provenance outside canonical field and
  as art for existing blocked cells; no new obstacles or rules. Preserve centres,
  shared corners/grid/picks/feet, spacing/height, sprites/bars/night and camera.
  Affects combat-lab terrain/scenery, shared renderer surface/test and assets.
  Independent source review DONE; types/lint/content114/geometry5 and fresh
  all-profile/generated-map/day-night/desktop/geometry/navigation/combat/terminal/
  restart browser checks PASS. Full absolute visual review PENDING; no current
  publication/CI/merge claimed. [Owning result](docs/wiki/battlefield-test-maps.md#авторские-материалы-и-узкий-связный-уступ--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local documentation update at
  owner request: record completed d185b71 full visual REJECT (all21images and
  both references; game2/2/1/2/2/2/1, close3/3/1/2/2/2/1) in the existing
  battlefield wiki, index, log and CURRENT_PLAN. Night improves to2; ground
  composition/material language and visible elevations remain blockers requiring
  a technique change. Separate disputed target-occlusion observation from
  confirmed findings. Record normal61-file audit PASS, live draft PR160 head
  793ebd3/maina934355 and unexecuted current-head CI/publication/merge.
  Documentation-only diff/format/local-link readback; game tests NOT_RUN for
  this edit. Earlier results retained.
  [Current result](docs/wiki/battlefield-test-maps.md#цельный-рисунок-поля-и-светотень-высот--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction after full
  793ebd3 visual REJECT (game2/2/1/1/2/2/1,close3/3/1/1/2/2/1) despite clean
  CI39034184313 SUCCESS. Add an original full-field ground plate/provenance,
  fixed-world-size paving/soil and a finite yard/path blend (direct plate
  stretching rejected in previews), actual surface-normal relief lighting,
  brighter night key forms/neutral
  silhouette edges and varied existing fire scales/placements. Preserve
  connected geometry, spacing/height, camera bounds, picking/feet and rules.
  Explicit0/1/2-unit captures/bar geometry PASS on published version; relief
  writer scoped types/lint/format PASS. Fix confirmed steep-bank normal gating
  and shared outline texture disposal; independent source readback DONE.
  Fresh maps/desktop/day-night/bars/picks/layers/navigation/extremes/explicit
  height captures/scoped types/lint/content112/real combat/terminal/restart/
  shared-outline cache lifecycle and clean reload PASS. Focused16 PASS after
  isolated repeat of an initial concurrent browser-load timeout; limits
  unchanged. Full visual review was running at this commit (completed REJECT
  in the dated correction above); CI/publication/merge pending. Refresh owner-requested wiki/index/log/current plan with
  actual CI and scored rejection; preserve earlier failures and asset limits.
  [Result and technique](docs/wiki/battlefield-test-maps.md#цельный-рисунок-поля-и-светотень-высот--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local courtyard correction and
  owner-requested wiki refresh: quiet fine earth replaces recognizable rut
  repeats; a finite authored courtyard connects the extracted mill scenery,
  with detailed cobbles at close zoom. New assets/prompts/provenance and
  combat terrain/shader/scene/manifest updated; canonical geometry/rules and
  camera bounds unchanged. Independent source review DONE; fresh maps/desktop/
  day-night/layers/geometry/navigation/extremes/real move/all3pools/terminal/
  restart/clean console PASS; types/lint/content110/format PASS. Full visual
  review pending; current CI/merge/main journey NOT_RUN.
  Preserve prior visual REJECT and historical CI outcomes. Wiki/index/current
  plan and wiki log distinguish the local stand from published1b47872/PR160
  and actual main. Mandatory main-based56-file commit audit PASS,8 inherited
  findings excluded; no audit bypass.
  [Current result and asset limits](docs/wiki/battlefield-test-maps.md#композиция-двора-и-мелкий-грунт--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction after full
  1b47872 visual REJECT despite successfulCI39024500756: extract true-alpha
  mill scenery with source/provenance, remove rectangular authored-floor sampling
  and zoomfade, register field/apron textures to one projected ground plane,
  use hashed source/phase ink patches and explicit texture gradients. Actual
  terrain geometry/picking/feet/rules unchanged. Source/types/lint/content108
  PASS; fresh GPU geometry/maps/layers/navigation/extremes/actual combat and
  clean-browser launch/reload PASS. Full critique REJECT game rendering/integration1,
  closeall2; nextsite-wide composition/currentCI pending. Original assets
  preserved; no migrations/deployment.
  [Owning correction](docs/wiki/battlefield-test-maps.md#scenery-cutout-and-shared-projected-ground--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local terrain correction:
  add a dedicated seamless3-source ink-earth shader,2original ground variants
  with prompts/provenance and a zoom-dependent authored-yard blend; restore
  ordinary world sampler behavior. Normalize optional ground sampling once,
  removing2new complexity findings without changing thresholds. Addresses
  published16c2811 visual REJECT and CI audit FAIL. Affects combat-lab terrain,
  scene/material wiring and asset manifest; rules/picking/foot geometry retained.
  Source review/types/lint/content107 and actual maps/desktop/layers/geometry/
  movement/pools/terminal/restart PASS. Full visual/currentCI/merge pending.
  [Result and limits](docs/wiki/battlefield-test-maps.md#layered-ink-earth-correction--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local documentation update at
  owner request: refresh wiki landing/index and current plan for published game
  candidate16c2811/PR160; replace stale leading PR157 status with current behavior,
  actual checks, previous visual rejection and remaining acceptance/CI/merge.
  Preserve dated delivery history and distinguish candidate stand from main.
  Markdown format/local-path/anchor/diff checks PASS; game tests NOT_RUN
  for the documentation edit. Record full16c2811 visual REJECT and CI audit FAIL,
  plus local normalization of authored-ground inputs that removes the two new
  complexity findings; types/lint/strict45-file audit PASS, newCI pending.
  Document the local3-source ink-earth/zoom fade correction separately:
  source readback/types/lint/content107/audit PASS. First browser attempt
  NOT_RUN (closed session); reopened shader/maps/desktop/day-night/bars/picks/
  extreme bounds and actual move/pools/terminal/restart PASS. Full critic/CI
  pending. Local stand differs from published head.
  [Current wiki](docs/wiki/battlefield-test-maps.md#текущее-состояние--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local visual technique revision:
  full b5a193c/08c2800 critique REJECT(2/2/1/1/2/2/1) exposed a rectangular
  mill edge, low-detail ground and mismatched night lighting. Add irregular
  backdrop alpha, registered authored-yard sampling on the shared cell surface,
  an original rutted earth asset/provenance with preserved directional ink, and
  coordinated near/far night values. Canonical terrain/picking/rules unchanged.
  Types/lint/content105/main-based audit and fresh shader/browser captures PASS;
  current full critic/CI/merge pending. [Owning result](docs/wiki/battlefield-test-maps.md#authored-ground-composition--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local final bound correction:
  source review confirmed projected physical bounds could exceed the finite
  camera-facing apron at extreme pan. Clamp to its reference-image rectangle;
  generated15×11 edge cells remain reachable. Four extreme drag corners/
  full-viewport apron/0POST and23camera/types PASS. Previous b5a193c cleanCI SUCCESS
  (820/47SKIP,10kstress,14DB,41-file audit); new-head verification pending.
  [Owning result](docs/wiki/battlefield-test-maps.md#combined-perspective-and-readability--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local integration of main
  a934355/PR159 into PR160: retain perspective/bounds and connected surfaces;
  share2.6spacing/.28height across grid/picking/feet; derive field strips in
  perspective screen pixels. Replace discrete banks and hex-edged surface
  patches with connected geometry and irregular material blending; keep quiet
  terrain extension behind the bounded painting. Preserve both branches' history.
  820coverage/47SKIPPED,27camera/geometry/types and main-based52audit PASS before
  final shader delta; actual12bar32×16/4px and0ground-pick errors PASS.
  Initial import/shader/audit failures corrected, recorded in the
  [owning result](docs/wiki/battlefield-test-maps.md#combined-perspective-and-readability--2026-10-17).
  Fresh absolute critique/currentCI/merge pending.

### Combat readability and reusable terrain

- 2026-10-17, branch `codex/combat-readability`, local correction to
  [PR160](https://github.com/Vovanostm/warwrit/pull/160): frame deployed forces
  instead of empty map margins; retain fixed authored mill scale; use near/far
  unit sampling and night presentation; add two original fire variants with
  provenance. Addresses c50ba37 absolute visual REJECT while retaining its
  accepted native sprite detail. Source readback DONE; framing5/content104/
  types/lint/main-based44-file audit PASS. Full visual/current-head CI/merge
  pending. [Owning result](docs/wiki/battlefield-test-maps.md#forces-overview-and-distance-sampling--2026-10-17).

- 2026-10-17, branch `codex/combat-readability`, local correction to
  [PR160](https://github.com/Vovanostm/warwrit/pull/160): full-resolution unit
  sampling, clearer night values and a nonpickable feathered terrain margin
  address absolute visual REJECT on6a63481 despite its green cleanCI. Vary fire
  footprint placement without mirroring. Fix reviewed margin winding;2geometry/
  types/lint/main-based40-file audit PASS. New reference sheet uses actual
  native close/game GPU captures, correcting the earlier enlarged gamecrop.
  Full repeat visual/currentCI/merge pending; owning wiki retains prior results.

- 2026-10-17, branch `codex/combat-readability`, published draft
  [PR160](https://github.com/Vovanostm/warwrit/pull/160), local correction:
  backdrop-off GPU probe exposed culled bank faces; fix Babylon winding and
  upward lip normals. Blend two continuous world texture scales to reduce
  motifs without stretching ink. Initial cleanCI bootstrap PASS but coverage
  timed out on512outline; optimize exact boundary stamping, retain5s limit and
  add independent pixel oracle. Current full815coverage/47SKIP/types/lint PASS,
  source review DONE. Previous visual timebox BLOCKED; current full absolute
  review/newCI/merge pending. Owning wiki preserves failures and evidence.

- 2026-10-17, branches `codex/combat-terrain-banks` → `codex/combat-readability`,
  local: integrate deterministic segmented earth banks and narrow soil lips
  under raised hexes, preserving canonical tops/grid/picking; new ink earth
  asset/provenance and cell-wide charred fire footprint replace rejected
  materials. Root fixes reviewed bank UV seams and inward-corner sign with
  signed regression. Focused30/types/lint, content102assets and strict38-file
  audit PASS before final lip correction; final geometry check PASS. Full
  visual re-review/CI/merge pending; owning wiki records initial check failures.

- 2026-10-17, branch `codex/combat-readability`, local visual correction active:
  full independent78e80c6 visual REJECT on box-shaped heights, grainy ground
  and undersized fire footprint; portraits/field bars/dense focus intact.
  Change technique to natural banks, ink ground and cell-wide fire; current
  source78e80c6/pool/move/terminal/delayed-focus checks recorded in the owning
  wiki. Final re-review, CI and merge pending.

- 2026-10-17, branch `codex/combat-readability`, local integration correction:
  physical presentation spacing2.6 replaces1.4 after two independent dense
  reviews found foreground beasts hiding rear foot strips. Preserve figure
  size, canonical coordinates/occupancy/range/AP/LOS/replay. Start focused on the
  actor at zoom4.8; portrait/log selection focuses a unit, Home returns the
  overview, and new activations follow the actor. Resize uses the HUD opening;
  deliberate pan/zoom is retained. Source review exposed Home focus, inactive
  selection and an async focus race; fixes retain pending intent and handle Home across
  non-editable battle controls without moving keyboard focus. Bar32×16 and portrait inset integrated. Strict main-based34-file audit
  PASS after correcting a failed key-handler complexity check, without gate
  suppression. Source readback DONE; navigation/keyboard0POST and29focused/
  types/lint/format PASS; combined visual/clean CI/merge pending.
  [Current integration](docs/wiki/battlefield-test-maps.md#shared-spacing-and-action-camera--2026-10-17).

- 2026-10-17, branch `codex/compact-foot-bars`, local: owner rejects connector
  arms and requires narrow tracks directly under battlefield figures. Preserve
  width32 and fixed4px foot gap; raise the three-row strip from12 to16px with
  clearer fill contrast after independent critic found weak overview/night row
  separation. No callouts, horizontal shifts, rule changes or input targets.
  Web types/scoped lint and27 existing focused tests PASS; full813unit/47SKIP
  coverage PASS before the bounded observer cleanup. Current DPR1/2 geometry
  captures cover1280/1440/1920 and maxzoom2.2. Real pools/texture, heights,
  terminal and restart probes PASS. Source reviewer found
  no defect in the frozen module diff. Dense large-creature occlusion remains
  a shared-scene integration blocker; no final visual ACCEPT or merge claimed.
  Manual main-based audit FAIL only in unchanged inherited road/terrain
  functions (`createRoadMaterial`, `setNight`); no bar-module finding remains.
  Initial local checkpoint used the work-branch exception (normal hook
  NOT_RUN); superseding isolated audit with `FALLOW_AUDIT_BASE=aa71d46`
  PASS for the two changed files. The final local checkpoint runs the normal
  commit hook against that same slice base. Common PR integration still requires
  strict main-based audit; inherited findings must be fixed before publication.
  No gate/config suppression is introduced. Second absolute visual review REJECT
  on dense-creature occlusion (scene integration1; remaining criteria2, motionN/A);
  the common owner must validate the larger shared spacing before acceptance.
  [Owner correction and shared delivery](docs/wiki/battlefield-test-maps.md#owner-correction-compact-foot-strips-no-callouts).

- 2026-10-17, branches `codex/combat-portrait-fit` → `codex/combat-readability`,
  local integration: give every portrait a4CSSpx art inset while preserving
  the full measured silhouette/aspect and130px cards. All20 profiles across
  3desktop sizes passed72bounds checks (minimum5px including frame); actor,
  forecast, inspection and actualDPR2 also passed with0actionPOST. Independent
  narrow source/visual review ACCEPT. Also ignore modifier shortcuts when
  preserving user camera navigation; full integrated critique/CI/merge pending.

- 2026-10-17, branch `codex/combat-readability`, local: integrate the owner's
  explicit rejection of callout arms; compact32×12 foot-sorted tracks remain
  directly4px under sprites. Record isolated bar/portrait ownership and the
  superseded placement experiment. Correct camera resize after click jitter:
  a deliberate pan uses the same5px threshold as the camera, zero wheel delta
  does not suppress reframing. Actual click-jitter/resize and pan/resize with
  0actionPOST,17focused tests, web types/lint PASS. Final integration acceptance,
  clean CI and merge pending; [owning result](docs/wiki/battlefield-test-maps.md#общая-интеграция--2026-10-17-local--acceptance-pending).

- 2026-10-16, branch `codex/combat-readability`, local implementation under review:
  measured 20-profile portrait bounds/B037 pivot; selective high-resolution
  outlines; larger shared hex layout; common pool rows in queue and field;
  reusable canonical-cell terrain with the world's natural sampler. Primary
  research and first source/visual REJECT recorded in the owning wiki. Camera,
  rubble order/UV, footer and dense-field placement defects are being corrected.
  Focused37 checks/types/lint and809-unit coverage PASS; first complexity audit
  FAIL, strict visual acceptance/publication/merge pending. No rule/schema change.

- 2026-10-16, branch `codex/combat-readability`, local activation: owner rejects
  current softness/terrain ambiguity/cramped hexes/cropped portraits and asks
  for health/armor/morale bars below queue icons and field figures, reusable
  map rendering, stronger research and independent critique. Existing owning
  wiki amended; primary WIP preserved, HUD writer isolated. Implementation and
  current acceptance NOT_RUN; previous scoped ACCEPT does not accept this cycle.

### Publish evidence-backed autonomous M1 tasks

- 2026-10-17, branch `codex/combat-wiki-checkpoint-20261017`, local docs / published tasks:
  owner requested a fresh implementation/gap/quality audit and GitHub tasks.
  [Epic161](https://github.com/Vovanostm/warwrit/issues/161) plus16issues162–177
  now own finite scopes, pinned evidence, dependencies, DoD and mandatory wiki
  closeout; issue payloads read back exactly. Existing #8/#6 and PR134/160/129
  are reconciled without duplicating work or treating historical gates as current.
  Wiki M1/index/log, CURRENT_PLAN and M1_PRODUCTION_PLAN updated; stale absolute
  c06 readiness link replaced with tracked local document. Source links/DoD/DAG,
  Markdown/diff and local-link checks PASS. Game code/runtime/player DB unchanged;
  new game/full-gate/visual checks NOT_RUN, FPS/enjoyment NOT_MEASURED.
  [Owning queue](docs/engineering/M1_PRODUCTION_PLAN.md#current-github-execution-queue--2026-10-17).

### Reconcile combat wiki with verified delivery

- 2026-10-17, branch `codex/combat-wiki-checkpoint-20261017`, local:
  owner requested memory/wiki update after review and main readback.
  Existing battlefield page, wiki index/log and CURRENT_PLAN now distinguish
  merged PR157/158/159 from draft PR160 at16c2811 (CI39019195821 FAILURE,
  current visual acceptance pending). Verified clean local/remote main a934355;
  no game code, migrations or other writers' WIP changed. Scoped Markdown
  formatting, relative-link/readback and diff checks PASS; gameplay/full gate/
  new visual critique NOT_RUN for this documentation-only amendment.
  [Owning dated checkpoint](docs/wiki/battlefield-test-maps.md#сверка-поставки--2026-10-17).

### Match battle grid and figures to painted perspective

- 2026-10-17, originating branch `codex/battle-camera-bounds`, merged:
  [PR159](https://github.com/Vovanostm/warwrit/pull/159), reviewed6533ae7 →
  main2285c85 with identical tree. Perspective field/figures, full-viewport map
  bounds and connected height surface delivered. Full independent visual ACCEPT
  (all7game/close2/2). CleanCI39006743444 SUCCESS:810unit/47SKIPPED,
  10kstress/20determinism/100replay,14disposableDB,coverage/strict15-file audit.
  Actual main5344:12figures/day-night/keys-drag-wheel/no void/ratio1.421176/
  stablepositions/0navigationPOST; real defence200/1POST/nextactor PASS.
  No canonical rules/protocol/migrations/deploy change; this closeout Markdown only.
  [Merged result](docs/wiki/battlefield-test-maps.md#поставка-перспективы-и-границ-камеры-в-main--2026-10-17).

- 2026-10-17, branch `codex/battle-camera-bounds`, local connected terrain:
  full5b88278 visual review rejected separate hex plinths (integration1).
  Shared-corner slopes now join canonical cell centres; ground/fill/grid/picking
  share one surface. Removed obsolete walls/banks/level-plane seam picker.
  Focused26/types/lint/format PASS;810coverage+47SKIPPED before seam-helper
  extraction. Real editor0/1/2/crowded/day-night/4widths/165picks/hover-pin/0POST
  PASS. Initial matrix/winding/audit failures fixed; strict15-file audit PASS.
  Full same-critic absolute visual ACCEPT(all7game/close2/2); new CI/merge pending.
  [Owning result](docs/wiki/battlefield-test-maps.md#связная-поверхность-вместо-отдельных-тумб--2026-10-17).

- 2026-10-17, branch `codex/battle-camera-bounds`, local height correction:
  top UV now lifts its ground footprint; continuous earth-side UV/vertex shade
  replaces repeated dark strips. Shared display height0.28 keeps tops, figures,
  grid and picking aligned; canonical height/rules unchanged. Focused27/types/
  lint/format/coverage811+47SKIPPED/audit14files PASS. Real editor0/1/2 archers,
  165ground hits/body hover-pin/0POST PASS. Earlier numeric expectation failed,
  corrected. Full current visual/new-head CI/merge pending; prior874dc2f CI SUCCESS.
  [Owning result](docs/wiki/battlefield-test-maps.md#читаемая-высота-и-непрерывная-земля--2026-10-17).

- 2026-10-17, branch `codex/battle-camera-bounds`, local technique correction:
  repeat visual integration1 rejected the wire lip. Real non-pickable earth
  banks now show exposed height volume; original canonical top/vertical pick
  faces retained. Hex-mesh geometry regression covers default/banked variants.
  Prior close comparison accidentally upscaled a game crop; replaced by native
  minZoom229px crop/reference-downscale evidence.22focused/types/lint/
  coverage811+47SKIPPED/audit PASS. Same-critic full repeat/new-head CI/merge
  pending; CI38997076787 SUCCESS covers intermediate132156b, not this geometry.

- 2026-10-17, branch `codex/battle-camera-bounds`, local review correction:
  CI38991283029 SUCCESS on1907d8c; full visual REJECT exposed weak height
  boundary/oversized hard contact ovals. Actual height transform confirmed;
  exposed upper-lip ink/stronger earth sides and compact vertex-alpha contact
  wash improve ground integration. No canonical height/rule/picking changes.
  Web types/lint/coverage811+47SKIPPED/audit PASS; full same-critic repeat and
  new-head clean CI/merge pending. Prior critic timed out/incomplete, not PASS.

- 2026-10-17, branch `codex/battle-camera-bounds`, local: owner reported the
  orthographic grid/figures against a perspective background. Fixed pinhole
  reference plus off-axis pan/zoom now governs field and figures; projected
  raised-ground UV/wheel anchors preserve registration, map bounds retained.
  GitHub Three.js/Babylon/fSpy mechanisms inspected; no dependency added.
  Camera18/web types/lint/coverage811+47SKIPPED/strict audit PASS.
  Actual4sizes/day-night/pan-zoom registration/165ground hits/body inspection
  with0POST PASS; independent visual/current-head clean CI/merge pending.
  Prior PR159 bb55f5b CI SUCCESS covers only the superseded bounds candidate.
  [Owning research/result](docs/wiki/battlefield-test-maps.md#перспектива-сетки-и-фигур--2026-10-17).

### Confine the battle camera to the painted map

- 2026-10-16, branch `codex/battle-camera-bounds`, local: owner requested
  removal of black space beyond the battle map and authorized review/merge.
  Optional shared camera bounds constrain the whole viewport through keys,
  drag, zoom, fit and resize; sprite scene supplies actual projected backdrop
  edges. Other camera consumers retain existing behaviour. Camera15, web
  types/lint, coverage808+47SKIPPED and strict changed-file audit PASS.
  Initial typecheck prerequisite/test typing failures fixed; actual browser
  4desktop sizes/day-night/keys-drag-wheel-resize/0POST/stableunits PASS.
  Author source review no concrete findings; independent visual/clean PR CI/merge
  pending. No domain, protocol or migration changes.
  [Owning result](docs/wiki/battlefield-test-maps.md#ограничение-камеры-областью-карты--2026-10-16).

### Live initiative queue and reduced combat HUD

- 2026-10-16, branch `codex/live-combat-ux`, merged:
  [PR158](https://github.com/Vovanostm/warwrit/pull/158) at main5c0b7eb,
  reviewed source e784608 with identical merge tree. Live canonical queue and
  current-state forecast replace the unknown-order placeholder; edge-aware
  arrows expose the full strip. Decision prices/risks stay visible; duplicate
  actor/neutral copy and obsolete terminal dock are removed. Draft A selected.
  Clean CI38922603699 PASS:806unit/47SKIPPED,10kstress,14disposableDB,
  coverage/audit29files. Independent source review no concrete findings;
  final absolute visual ACCEPT(all7scores2, motionN/A), after correcting
  overflow/terminal findings and replacing a timed-out repeat critic.
  Merged-main browser restart12units/scroll/inspection0POST/day-night/accepted
  defend+canonical queues PASS. Source/game rules/schema remain scoped as
  recorded in the owning wiki; balance/FPS/fullM1 NOT_MEASURED. This dated
  receipt supersedes the activation/local-pending status below.
- 2026-10-16, branch `codex/live-combat-ux`, local implementation: canonical
  core order function now projects the next round through the optional lab DTO.
  Web renders remaining/current portraits and a distinct forecast, removes the
  unknown-order placeholder/duplicate actor and retains decision costs/risks.
  Two raster drafts and exact provenance are tracked; A is selected.
  Core/protocol/server/web types and48focused checks PASS;805unit/47SKIPPED
  coverage PASS. Real4desktop-size/inspection0POST/guard-refresh PASS.
  Source review found no concrete issue. First visual REJECT exposed missing
  scroll affordance and obsolete terminal panels; visible arrows and active-only
  dock correct both, repeat critique pending. Main8f7ad25 includes PR157;
  current48focused/types/audit PASS. Clean PR gate/publication/merge pending.
- 2026-10-16, branch `codex/live-combat-ux`, local: owner authorizes raster
  drafts, implementation with subagents, PR/review and merge to default main.
  Existing [UX research and approved queue behaviour](docs/wiki/battlefield-test-maps.md#проверка-текстов-и-избыточности-ux--2026-10-16)
  retained in the owning wiki. Separate worktree starts from integrated
  e87a379 including sprite-outline repair; primary and other active worktrees
  untouched. Parent owns web/shared docs; separate pure-forecast author and
  image-draft author have disjoint paths/checkouts. Checks and delivery pending
  at activation; no campaign writes, deployment or paid services.

### Resume sprite combat as an isolated, deliverable improvement cycle

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: owner requested
  worktree/subagent development, current wiki, merge and main validation.
  Main-based isolated snapshot integrates the existing sprite combat code,
  editor, art and approved history while preserving primary WIP and excluding
  unrelated SupplyShop/launch edits. A fail-closed V1 projection invariant is
  retained for the sprite-only surrendered status; no historical DTO widening. Existing unit coverage
  755PASS/47SKIPPED; playable5330/API3030 starts. Initial audit missingcoverage
  ERROR then covered FAIL on complexity/duplication; intermediate snapshot
  precommit audit NOT_RUN under AGENTS work-package exception because later
  steps replace failing modules. No bypass permitted on published/main/merge
  heads. Module cleanup, skills editor, current visual/gameplay review and
  full clean delivery gate remain required. CURRENT_PLAN owns sequencing.

### Editable technique ranks and shared combat phases

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: per-unit sandbox
  technique ranks/default/empty presets, metadata from the canonical skill
  catalogue, and warnings preserving incompatible learned ranks. No campaign XP
  or new perk tree. Protocol catalogue, server custom setup, editor and
  SkillLoadout affected. Focused22 checks PASS; initial server typecheck exposed
  missing V1 projection narrowing, now retained as a fail-closed invariant.
- Core move/reaction/fire, warning, panic, wound and AI phases share existing
  admission and damage-preview rules without changing policy/replay/RNG ordering.
  Core93 focused checks, lint/format/typecheck PASS; scoped core complexity and
  clone findings zero. Independent source review of both slices found no material
  findings; it did not run browser/DB checks. Intermediate integration hooks
  NOT_RUN under the existing package exception; whole-union audit/full gate and
  fresh visual acceptance pending. See [current combat page](docs/wiki/battlefield-test-maps.md).

### Battle controls, initiative and missing-session recovery

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: HUD presentation,
  scene lifecycle and projection are cohesive modules; current/acted/waiting
  initiative labels derive from server turnIndex. Controller separates session
  transport, public-view admission, field command confirmation and availability;
  same-ID retry/auth/Escape semantics preserved. Missing temporary session now
  explicitly points to restart/editor instead of claiming a completed battle.
- Worker HUD18 and controller28 focused checks PASS. Integrated web types first
  FAIL on optional test data; corrected, then web types/UI40 PASS. Server types
  and public V1 projection rejection regression PASS. Source-only independent
  review found no material findings; fresh integrated visual/journey and final
  delivery gate pending. Intermediate hooks NOT_RUN, attempted main audits FAIL
  on other owned prototype code; no published/main bypass allowed.
- Historical galleries share immutable metadata without changing approved art or
  layouts. Worker syntax/lint/format/diff PASS; its audit used a relaxed CRAP
  threshold and is not the actual gate. Missing coverage blocked normal commit;
  automatic review rejected bypass. Parent integrated the staged patch for
  ordinary coverage/audit before committing. Browser console acceptance pending.
  Current wiki removes superseded 3D production instructions while retaining
  useful map/XCOM links and dated authority; research/progression boundaries
  are explicit in [the owning page](docs/wiki/battlefield-test-maps.md).

### Integrated sprite renderer and checked delivery candidate

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: padded silhouette
  outline fixes clipped crown/edge while preserving original body/pick mask;
  renderer separates terrain, figures, feedback, marker planning and picking.
  Thirteen finite renderer checks preserve legal-preview/inspection priorities,
  alpha thresholds and bounded geometry. Editor immutable actions/atomic imports
  and controller lifecycle/keyboard/autoplay close initial snapshot audit debt.
- Fixed catalogue completion erasing missing-session notice, denied storage getter
  restoration, disabled editor keyboard mutation and ambiguous skill refusal copy.
  Moved HUD props to remove a real architecture cycle. Actual integrated types,
  lint/architecture/pattern/content and795unitPASS/47SKIPPED; ordinary main-based
  audit PASS with zero new blocking findings. First failed checks retained in
  owning result; advisory styling findings remain. No gate/config weakening.
- Independent source reviewer finding corrected/read back. Independent real UI
  battle manualR1–2 thenauto endedR8/6alliedsurvivors; inspected damage agreed
  with previews, invalid skill refused, no repeated movement destination within
  activation. Strategy comparison/fun NOT_MEASURED. Final absolute visual review
  and clean PR/DB/stress/main journey pending.
  [Owning result](docs/wiki/battlefield-test-maps.md#результат-интеграции-и-игровые-проверки--2026-10-16).

### Keep the combat delivery scoped

- 2026-10-16, branch `codex/combat-cycle-20261016`, local: final diff review
  excludes the separate live-map agent-review/consultation document and its
  checkpoint/history imports. Original primary and prior branch retain that
  work; this combat PR does not publish it. No combat code or evidence changed.
  Markdown format/local references checked; no game retest required.

### Reserve prepared-threat badges before accepted events

- 2026-10-16, branch `codex/combat-cycle-20261016`, local correction to
  published draftPR157: independent visual critic rejected overlapping
  preparation/movement labels (FEEDBACK-02). Scene now creates current threat
  labels before placing events and reserves their bounds alongside figures.
  Added a dense neighbouring-badge spacing regression;8focused/web types/
  lint/format PASS, freshcoverage796PASS/47SKIPPED. Independent source review
  found no material issues. Same-critic absolute visual recheck/newheadCI pending.
  Previous head87c5c6a CI38909754401 PASS includes clean bootstrap,10k stress,
  14 PostgreSQL checks and strict audit; not claimed for this source correction.
  Owning wiki records rejected image/reproduction and scoped outline proof;
  index no longer calls the working sprite sandbox unimplemented.

### Sprite sandbox merged and exercised from main

- 2026-10-16, delivery receipt on `main` for `codex/combat-cycle-20261016`,
  merged through [PR157](https://github.com/Vovanostm/warwrit/pull/157):
  reviewed2c1ac2a -> merge2072a64; whole-tree diff empty. Exact-head
  CI38915129341 SUCCESS:796unit/47skip,10kstress/20determinism/100replay,
  14realPostgreSQL,coverage and strict232-file audit PASS. No bypass on final
  source commit or merge. Initial visual REJECT corrected; first repeat timed
  out without verdict, fresh independent full static packet ACCEPT(all7criteria
  > =2, motionN/A, criticowninputNOT_RUN).
- Clean main stand5330/API3030: editor/default/start, actual right-click1AP
  movement(AP4->3), guard, autobattleR9/rev161 victory5survivors, restart and
  return-to-editor/recreate PASS. New12active/R1/rev4/AP4 left playable.
  Primary WIP preserved; no deployment/migration/campaign XP. Wiki/index/current
  plan reconciled with actual merge and measured limits; doc-only closeout
  does not change reviewed game code. Full gate not rerun for documentation.
  [Owning receipt](docs/wiki/battlefield-test-maps.md#поставка-в-main-и-проверка-после-слияния--2026-10-16).

### Battle camera menu helper

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner-authorized
  camera coordination supplied separate reviewed camera module and scene
  panButtons[0,1] adapter; camera SSOT remains the shared module. Adapter
  author types/lint/format/diff PASS, own browser journey NOT_RUN after context
  loss; camera author13 focused/source-review PASS. Root updated only two existing CombatLab menu
  labels for LMB drag/WASD camera control; buttons/cards/layout unchanged.
  Root scoped lint/format/menu copy/fit PASS; camera author5322 journey
  key/drag/click/combinedwheel/blur/HUD/daynight0POST/revision4 stable PASS.
  Initial runner synchronization/offcanvas failures preserved. Independent
  camera appearance now scoped ACCEPT after supplied missinginputs;7criteria2/3,
  own critic input NOT_RUN. Separate module PR/main delivery completed as
  confirmed in the merge receipt below; sprite integration remains local.
  [Owning helper](docs/wiki/battlefield-test-maps.md#подсказка-управления-камерой--2026-10-13),
  CURRENT_PLAN/web README updated; quick-use text reconciles short LMB
  inspection with held WASD/arrows, LMB/MMB drag and wheel zoom. A follow-up
  documentation correction replaces superseded stacked-border/AP-only-shot
  wording with one coloured grid and passive weaponReach versus legal current
  attackPreview; existing implementation and rules unchanged.
  Separate camera-owner publication verified: draftPR156/head64b49ee3 and
  same-head CI38404171166 success;5camera/test/own-doc files only. First camera
  visual BLOCKED missing inputs superseded by same-critic full ACCEPT. Current
  GitHub PR156 OPEN/READY/head54f7da890/CI38407349732 IN_PROGRESS; old CI
  success was not current-head PASS. Superseding2026-10-13 live receipt:
  PR156 MERGED reviewedhead54f7da890/merge86c1da055; finalCI38407349732
  SUCCESS samehead. Root verified camera worktree main clean,HEAD/main/originmain
  match86c1da055 and finalhead-to-merge ordinarydiffempty. Primarycodexbranch/
  HEADb44f5c1/WIP retained. Only module/test/own-docs merged, not sprite integration.
  This sprite branch/helper remains local; no root commit/publication/merge/deploy.

### One coherent desktop battle-control family

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner rejected
  inconsistent/unpolished controls. Unified command/skill/utility/text sizes,
  frame/state palette and typography in battle-controls.css; removed conflicting
  control styling and editor leakage. Compact console236->179.4 clears default
  lower figures; auto start/stop moves to utility and step to menu. Skill overflow
  and explicit tooltip input mode stabilize selection/focus; rank/shortcut costs
  and public view authority retained. BattleView/CombatLab/test assertion,
  battle-view/combat-lab/combat-icons CSS affected; README/CURRENT_PLAN and
  [owning result](docs/wiki/battlefield-test-maps.md#единый-боевой-интерфейс--2026-10-13)
  updated, wiki top current pointer reconciled without erasing dated rejects.
  Web noEmit/lint/format/UI16 PASS; three desktop layouts/0POST inspection,
  stable aim/overflow/Esc/menu and real auto stop PASS. Follow-up UI17 PASS;
  first HUD critic REJECT (command tooltip covered feet), corrected by anchoring
  above the actual actor card;1366/1440 custom+dense tooltip bounds PASS.
  Terminal stance badges now require active status; resolved next-round hidden.
  Initial brittle class/
  expanded-name probe/hover focus/overlarge console findings corrected.
  Scoped HUD appearance ACCEPT, seven criteria2/3; own critic input NOT_RUN,
  terminal initial exclusion followed by fresh own5321 autoR8/rev151 terminal
  1366/1440 actualUI/HTTP PASS,0inspectionPOST,stable36px/radius6 outcome buttons;
  terminal critic ACCEPT7criteria2/3, own input/runtime NOT_RUN. Captured before
  separate camera integration; camera not accepted by this HUD verdict.
  Failed original metadataSecurityError/mainlaunchquota
  preserved, freshbattle not labelled originalR9. Terrain/height separate, full game/DB gate NOT_RUN,
  general AAA/fun/FPS not claimed. Inherited audit blocks broader closeout,
  no commit bypass/publication/merge/deploy.

### Finite renderer/core readback and prior-fire forecast correction

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: collaborating
  owners corrected field topology/material occlusion and PREVIEW-04 late
  reaction HP cap after prior fire. Final546/444 supersedes588/402; opaque
  projected mill tops supersede rejected dirt top. Author UV/depth/focused21
  (geometry4+UI17)/types/lint/format/diff PASS. Frozen field visual ACCEPT
  scores3/2/2/2/3/2/2,motionN/A; critic input/tests/build NOT_RUN. Fresh integrated
  post-HUD day/night narrow readback PASS by same critic: full field ACCEPT
  retained, no material regression; unchanged renderer. Core43/build/types/read-only/replay PASS by
  author; mainAPI runtime correction PENDING, unchanged3022. Isolated3023/5321
  actualUI/HTTP/readback PASS:10HP/fire5thenreaction5 matchesHUD5, revision31,
  no state injection; initial pan/nativeconfirmation runner timeouts recorded.
  Actual manual summary read: R9/revision149,76orders,5survivors,errors0;
  oldAPI journey does not prove live corrected preview. Owning wiki/preview/
  CURRENT_PLAN updated; wiki top/frontmatter now point to the scoped current
  field/HUD/terminal acceptance with remaining main runtime limits,
  preserving historical PENDING/reject sections; [finite result](docs/wiki/battlefield-test-maps.md#согласованное-поле-и-проверка-прогноза--2026-10-13).
  Full/DB gates NOT_RUN here, balance NOT_MEASURED; inherited audit/WIP open,
  no bypass/commit/publication/merge/deploy.

### Height occlusion reopened after owner review

- 2026-10-13, branch `codex/sprite-combat-stage1`, local documentation:
  parallel owner review reports lower-grid lines showing through +1 terrain.
  Recorded translucent-top/depth hypothesis and bounded opaque tile/continuous
  UV/exposed cliff proposal, not accepted asset production or rule change.
  [Owning defect](docs/wiki/battlefield-test-maps.md#перекрытие-нижней-сетки-высотой--новый-defect-2026-10-13)
  and CURRENT_PLAN updated; renderer author owns repair. Current fix/terrain
  visual PENDING, reproduction and code fix NOT_RUN by this shared-doc writer.
  Historical captures remain history; no broad visual approval inferred.

### One colour grid replaces stacked tactical contours

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner instructed
  one grid with colour states. Parallel renderer/geometry author integrated
  165 stable fills, one tactical-grid, 588 physical edges/402 shared and removed
  legacy/inset contours. Canonical previews/inspection/input and entity outlines
  retained, ground remains below figures. Its HUD intersection legend transferred
  to this shared writer. Renderer/battle-cell-grid/geometry tests/HUD CSS affected;
  [owning result](docs/wiki/battlefield-test-maps.md#единая-цветовая-сетка--2026-10-13),
  web README and CURRENT_PLAN updated. Author reports geometry+UI20/20/noEmit/
  lint/format PASS after corrected initial TS/Float32 checks; root noEmit PASS.
  Private 6v6 stable identities/canonical cells/0POST unchanged revision PASS.
  New grid visual PENDING; previous double/inset ACCEPT remains historical,
  superseded. Full game/DB gate NOT_RUN; inherited audit open, no commit bypass/
  publication/merge/deploy.

### Battle command icons and selected weapon inspection

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner rejected
  homemade command glyphs. Replaced commands/five skills with ten local
  CC BY 3.0 Game Icons, preserving input/tooltips and adding shortcut/rank
  readability plus author/source/adaptation credit. CombatIcon, icon CSS/assets,
  CombatLab/BattleView and combat-lab README affected.
  [Icon result](docs/wiki/battlefield-test-maps.md#иконки-команд-и-приёмов--2026-10-13):
  scoped lint/16 UI tests/browser hover-keyboard-disabled guard PASS;
  web noEmit PASS before/after shared-grid fix; available aim/selected/Esc/rally
  tooltip PASS with unchanged revision. Scoped icon visual ACCEPT (all applicable scores 2/3); critic pointer/revision
  binding NOT_RUN. Initial overlong review stopped without verdict; fresh bounded
  critic completed. Grid/height acceptance remains separate.
- Same date/branch, local integration record for collaborating weapon-reach
  author: pure detached units[].weaponReach, independent inspection and
  attackPreview admission, selected-unit caption/legend. Core/protocol/projection
  and HUD present; 46 focused tests/builds/checks reported PASS on that version;
  actual bow45/halberd18/shield6/LOS/resource refresh/halberd2 attack PASS.
  [Owning result](docs/wiki/battlefield-test-maps.md#дальность-выбранного-оружия--2026-10-13),
  melee/ranged, both README and CURRENT_PLAN updated. Saved visual captures
  ACCEPT >=2; the parallel new grid supersedes current integration acceptance,
  now PENDING. Full game/DB gate NOT_RUN for this narrow closeout; inherited
  branch audit remains open. No commit bypass/publication/merge/deploy.

### Weapon reach remains readable where movement overlaps

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner screenshot
  showed the archer's weak range wash hidden by movement. Strengthened ochre
  fill/ink-backed outer boundary; overlapping cells now use one fill with an
  inner cyan movement cue. Kept full grid/input geometry, server range/attack
  admission, targets and ground-before-figure layers. Scene/README and
  [owning result](docs/wiki/battlefield-test-maps.md#контраст-области-оружия--исправление-2026-10-13),
  CURRENT_PLAN affected. Web noEmit/lint/format and 16 UI tests PASS; actual
  45 canonical cells / 38 overlaps/target forecast/unchanged revision PASS, 6v6
  day/night/close/grid/reference captures. Independent scoped visual ACCEPT (all applicable scores >=2); critic
  browser input/full game/DB gate NOT_RUN. Previous branch audit remains open;
  no commit bypass/publication/merge/deploy or domain/protocol/server changes.

### Occupied cell creature hover

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner reported
  that hovering an uncovered part of an occupied hex did not highlight its
  creature. Unified sprite/ground target resolution with active occupancy and
  opaque-sprite priority; hover/inspection/canonical action targeting now agree.
  Added uniform muted silhouette/ground-ring hover emphasis and empty-cell
  clearing without promoting ground effects over figures. Scene and combat-lab
  README affected; [owning fix/evidence](docs/wiki/battlefield-test-maps.md#наведение-на-занятую-клетку--исправление-2026-10-13),
  CURRENT_PLAN updated. Actual wolf body/cell mismatch reproduced and corrected
  after reload;90occupied-cell points across11figures PASS, hover0POST and
  unchanged actor/revision, day/night/grid captures. Web typecheck/scoped
  lint/format and14BattleView tests PASS; independent scoped visual/source
  critic ACCEPT (all applicable scores>=2, its own input NOT_RUN). No rule/
  protocol/server/migration change; full gate NOT_RUN. Inherited branch audit
  still prevents closeout/commit; no hook bypass/publication/merge/deploy.

### Combat rubble occupies a readable single cell

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner screenshot
  showed rubble overlapping several cells with unclear blocked footprint.
  Uniformly resized the existing art and aligned its measured visible centre
  to the owning hex; added persistent non-pickable ochre/ink ground borders
  and blocked hover/pin explanation. Scene/BattleView/UI regression, README,
  [owning wiki result](docs/wiki/battlefield-test-maps.md#завалы-принадлежат-одному-гексу--2026-10-13)
  and CURRENT_PLAN updated; canonical geometry/rules/replay unchanged.
  Web noEmit/scoped lint/format, UI 14/14 and actual blocked-cell no-order journey
  PASS; 12,575 visible-art samples stayed inside projected hex. Current day/night/
  close/equal-height captures ready; independent absolute visual ACCEPT, all applicable scores >=2
  (owning cell/neighbor/HUD3), critic input
  NOT_RUN. Full game/DB gate NOT_RUN for this visual/HUD fix; prior branch
  audit still blocks commit, no bypass or publication/merge/deploy.

### Combat v3 scene, learned skills and autoplay

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner requested
  subagent implementation of combat rendering/heights, enemy AI, skills and
  autobattles. Integrated semantic ground-before-figure layers, matching stable
  alpha picking/entity order, textured exposed height faces and sparse empty-cell
  height labels; canonical v3 skill ranks/commands/previews, skill-aware tactical
  AI and pure/server/HUD autoplay with visible stop. Five finite skills are
  brace/pressure/reach/aimed/rally, editor ranks0–3, four slots plus overflow.
  Historical v1/v2 replay semantics retained; v3 overkill reports actual HP loss.
  Removed web runtime core dependency via optional server ruleHints/public
  guard percentage; server owns connectivity admission with draft-preserving
  visible rejection. Added public boundary/regression checks, updated combat
  READMEs/ability/opponent pages and CURRENT_PLAN.
  [Owning result and proof limits](docs/wiki/battlefield-test-maps.md#реализация-тз-sprite-v3--2026-10-13).
  UI skills/autoplay/full mill/editor/reload/invalid-import/closed-map retry PASS;
  terrain identity74points and alpha/HUD input PASS. V3 matrix12battles/2085commands
  resolved R8–11 without unlawful commands/cycles/replay divergence. Isolated
  verify PASS737tests/47skipped; baseline stress10000battles/100replay PASS.
  Independent source boundary review passed its finite scope; full absolute
  visual ACCEPT for supplied current scenes, every applicable criterion >=2.
  Actual browser125%/critic pointer execution NOT_RUN; threat caption moved
  above victim/deduplicated and recaptured after full reload, repeat isolated
  verify PASS on affected source. Full Docker/PostgreSQL gate
  NOT_RUN; branch audit FAIL130complexity/17clones after49 inherited exclusions,
  no check weakened or hook bypass. Existing gallery JS/CSS registered as
  legitimate HTML entrypoints/browser globals, no new runtime dependency.
  No campaign progression/twenty unique ability sets/poison or burning status
  engine; general balance/fun/performance NOT_MEASURED. Local WIP, no commit,
  publication, merge or deployment; full DoD closeout not claimed.

### Combat specification and reopened visual acceptance

- 2026-10-13, branch `codex/sprite-combat-stage1`, local: owner rejected
  a selected hex drawn across a character and requested a full specification
  first. Added the [complete combat technical specification](docs/wiki/battlefield-test-maps.md#полное-техническое-тз-пошагового-боя--2026-10-13):
  semantic layers/alpha/depth, hex picking, fullscreen HUD/initiative/statuses,
  ability slots, previews, path/LOS/reactions/AI, battle/map editors, command
  authority/replay and acceptance matrix. Inspected pinned Honeycomb,
  Babylon9.28.0 and Floating UI GitHub sources; retained existing engine/core,
  no dependency installation or source copying. Reopened scene acceptance as
  REJECT: ground-ring group2 after actor group1 violates RENDER-01; fix NOT_RUN.
  Supersedes earlier visual ACCEPT for integration, preserves historical
  gameplay evidence. Added mandatory combat layering scenarios to the visual
  critique rubric so a reproduced overlap forces REJECT. Updated wiki navigation/log, turn semantics and
  CURRENT_PLAN. New numerical UX targets/effects/dependencies remain proposals.
  Documentation-only pass; game tests/full gate NOT_RUN, performance
  NOT_MEASURED. Independent specification review findings resolved for picking
  versus legality and proposed action-catalogue status. Markdown format,
  new-section local links and diff checks PASS. Existing branch audit remains
  open; no commit/publication/merge/deploy.

### Combat v2 improvement cycle

- 2026-10-12, checked 2026-10-13, branch `codex/sprite-combat-stage1`, local:
  owner requested a finished combat prototype through an executed improvement loop.
  Sprite v2 integrates tactical targets/approach, guard/fatigue, finite reactions,
  panic/escape/human-only surrender, one-retarget declared strikes, AP0 scheduling
  and static-map admission, preserving historical rules/replays. Fixed heavy
  reversal, sequential reaction forecasts, false-safe origin escape and false
  control by bow/spent reactions. HUD uses smaller proportional figures,
  foreground active markers, correct defeat text and no command tooltip over
  terminal controls. Core/replay, lab server/protocol, editors/renderer/HUD,
  their READMEs, mechanic pages/wiki index and CURRENT_PLAN affected.
  [Owning loop/parameters/checks](docs/wiki/battlefield-test-maps.md#алгоритм-доведения-боёвки--2026-10-12).
  Actual UI/replay: rush R8/147 victory, safety-fixed hold R14/187 defeat,
  human surrender R5/89 with two surrenders; finite independent source/playable
  ACCEPT. Absolute day/night visual and final hold/surrender readback ACCEPT
  (text/layout 3, inactive readability 2); critic browser input NOT_RUN.
  Fresh mill left playable at web5320; format/scoped links/diff PASS.
  Latest safety 37 focused tests, UI 12, affected typechecks/build/lint PASS;
  failed first fixture typecheck/lint and tooltip probe corrected and rerun.
  Historical stress/disposable PostgreSQL checks PASS; full verify formatting
  FAIL, owned formatting fixed, unrelated WIP preserved, later stages NOT_RUN.
  Existing branch audit blocks commit. Abilities/progression/captive campaign,
  general balance/fun/performance remain outside measured delivery. No commit
  bypass, publication, merge or deployment.

### Reachable battle movement contrast

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner reported
  movement cells blending into terrain. Separate slate-teal fill, pale borders
  and ink backing make canonical movement destinations visible; hover/pin remain
  on top, shot-area style unchanged. Updated combat-lab renderer and README.
  [Owning amendment](docs/wiki/battlefield-test-maps.md#контраст-доступной-зоны-движения--исправление-2026-10-11).
  Web typecheck/scoped lint PASS; browser 39 destinations with matching borders,
  day/night/grid on-off, pin-hover and actual 4AP move/AP0 removal PASS.
  Absolute visual ACCEPT, all applicable scores ≥2; critic input NOT_RUN.
  Format/scoped links/diff PASS; game tests/full gate NOT_RUN for this visual fix.
  Existing branch audit blocks commit. No publication/merge/deployment.

### Aligned battle hex grid and overlays

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner screenshot
  exposed rotated hex borders/inset fills missed by the previous input checks.
  Shared pointy-top radius/centres and mesh helpers align grid, movement/shot
  zones, hover/selection and hex unit bases. Honeycomb GitHub sources inspected
  at pinned commit; no new dependency, gameplay, protocol or server change.
  [Owning amendment/research](docs/wiki/battlefield-test-maps.md#геометрия-сетки-и-совпадение-маркеров--исправление-2026-10-11).
  11 focused tests/web typecheck/scoped lint PASS; browser165 cells/444 shared
  edges/45shot borders aligned,150edge+180corner probes without dead zones,
  pinned/hover/near-edge rightclick3AP PASS. Source review cleared;
  absolute visual ACCEPT, all applicable scores ≥2; geometry/pinned-hover score3,
  critic browser input NOT_RUN. Format/scoped links/diff PASS.
  Full gate NOT_RUN; existing branch audit blocks
  commit. No publication/merge/deployment.

### Continuous battle hex picking

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner reported
  boundary dead zones and missing selected-cell highlight. Sprite ground picks
  cover full hexes; cube-rounded fallback fills internal height seams and rejects
  missing/perimeter cells. Shared inverse in web renderer preserves old scene
  math. Hover and pinned selection have distinct persistent markers.
  [Owning amendment](docs/wiki/battlefield-test-maps.md#непрерывный-выбор-гекса--исправление-2026-10-11).
  Ten scoped tests/web typecheck/lint and 140 edge/180 corner browser points,
  border right-click/persistent selection PASS. Source findings fixed;
  240 height-edge points/perimeter rejection/pan/zoom PASS. Absolute visual
  ACCEPT for inspected day/night/height-test states, all applicable scores≥2;
  critic input execution NOT_RUN, extreme camera framing not accepted.
  Format/scoped links/diff PASS; full gate NOT_RUN. Existing branch audit
  blocks commit; no publication/merge/deployment.

### Approved command desk battle HUD

- 2026-10-11, branch `codex/sprite-combat-stage1`, local: owner approved
  concept 01 Command desk. Live fullscreen HUD implemented in web
  combat lab: portrait initiative, mirrored cards, icon commands, reserved skills,
  canonical previews/states and editor menu. Scene framing and W09 portrait
  crop corrected; hover field takes priority over retained portrait focus.
  Selected movement wins over pinned-target forecast, with pinned inspection
  retained; selecting a unit clears the path. Muted shot grid, AP spend/remaining
  segments, side shapes and upper-left forecast preserve field readability.
  [Owning decision](docs/wiki/battlefield-test-maps.md#пять-концептов-полноэкранного-боя--2026-10-10).
  Web typecheck/scoped lint/nine UI tests and actual shot/AP0/pending/move/
  round/restart/hover/target-path-target/menu/editor journeys PASS, three viewport fills PASS.
  Final absolute integrated visual ACCEPT for inspected 2v2/6v6 day/night
  and three desktop sizes, all applicable scores ≥2 (motion N/A); guarding badge
  checked in real browser. Format/scoped links/diff PASS. Full gate NOT_RUN
  this UI cycle; arbitrary dense formations and broader player acceptance unmeasured.
  Last branch-wide commit audit FAIL: 4 static-gallery entrypoint findings, 99
  complexity findings, 15 clone groups across 159 changed files; not bypassed. No publication, merge or deployment.

### Five fullscreen battle UI proposals and approval gate

- 2026-10-10, branch `codex/sprite-combat-stage1`, local proposals: owner
  requested five desktop-only full-viewport battle overlays and a stop before
  choosing the live UX. Added `assets/art/combat/stage1-2026-10-09/ui-fullscreen-concepts-v2/`:
  native interactive layouts, captures/comparison and owner references.
  Mirrored actor/target cards, icon-only actions with hover/focus tooltips;
  later owner amendment adds Olden Era-like TOP round-separated initiative,
  portrait effects and four demonstration ability slots from skill progression.
  Effects/abilities are proposals, not engine semantics. Gamedev GPT-6.1 Sol
  taxonomy reviewed. [Owning comparison and boundaries](docs/wiki/battlefield-test-maps.md#пять-концептов-полноэкранного-боя--2026-10-10)
  and CURRENT_PLAN updated. Later owner rejection of crude UI led to shared
  component refinement: typography/numeric hierarchy, resource bars, chance
  ring, damage channels, AP infographic, distinct ability icons/states.
  Tooltip layers and forecast occlusion findings corrected. Syntax and
  refreshed five-layout browser journey/three viewport fills PASS, errors[]/
  writes[]; full independent visual re-review PENDING. Corrected prior four-concept final verdict to ACCEPT/history.
  Live UI delegate stopped; isolated work retained without integration.
  Production source/API/rules/AI/replay/dependency/migration unchanged;
  game/full/integrated gates NOT_RUN. Owner choice OPEN; previous prototype
  commit audit NOT_DONE; no publication, merge or deployment.

- 2026-10-11, same branch, local continuation: restored the five-concept web
  viewer and rechecked the final browser journeys. Selected abilities now have
  an explicit pressed state; A/B shot tooltips keep actor values visible.
  Five journeys, selected-skill captures, syntax/format/scoped links/diff PASS.
  First full independent GPT-6.1 Sol visual review ACCEPT (all applicable
  scores ≥2). Follow-up selected-skill state exposed C/E figure occlusion
  (REJECT); stable left inspection placement fixed it. Final absolute
  visual re-score ACCEPT for all five; all four C/E ability-tooltip states
  avoid figures/cards/commands in the browser. Owner selection OPEN;
  live/integrated-game acceptance NOT_RUN. Existing prototype commit audit
  remains NOT_DONE. No publication/merge/deployment.

### Four alternative battle UI concepts

- 2026-10-10, branch `codex/sprite-combat-stage1`, local proposals: owner
  rejected the current screen's overall UI/UX and requested four concepts
  closer to Heroes/Wartales/Battle Brothers. Added native interactive
  `assets/art/combat/stage1-2026-10-09/ui-concepts-2026-10-10/` gallery,
  four 1440×900 day captures/comparison and reference provenance. Compact
  console, floating controls, actor dossier and target inspector share approved
  sprites/mill art and an explicitly illustrative state; no gameplay/API/rules/
  replay/dependency/migration changes. Gamedev GPT-6.1 Sol advised; visual
  GPT-6.1 Sol found C initiative cropping and A night label, corrected.
  Final historical four-concept re-review ACCEPT (all applicable scores ≥2);
  later owner five-fullscreen brief supersedes this choice. [Owning comparison](docs/wiki/battlefield-test-maps.md#четыре-концепта-боевого-интерфейса--2026-10-10)
  and CURRENT_PLAN updated; A recommended, owner selection OPEN. Browser
  four-tab/actions-fit/inspect/mode/grid/day-night/fullscreen checks, syntax,
  format/scoped links/diff PASS. Production game/full/integrated acceptance
  NOT_RUN. Shared prototype commit audit remains NOT_DONE; no publication,
  merge or deployment.

### Combat target contrast and action dock

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner's four
  UI requests implemented with gamedev GPT-6.1 Sol. Strengthened canonical
  bow cells/all legal target silhouettes and markers, unit/ground contrast,
  and a below-field actor/AP/action dock with canonical prices/disabled reasons.
  Updated web BattleView/CombatLab/scene/CSS/tests, declared existing public
  game-core workspace dependency with pnpm, added a four-view screenshot
  [UI reference](assets/art/combat/stage1-2026-10-09/ui-reference-v1.html).
  After full mill visual REJECT for overlapping diagonal, server default
  new drafts use two columns/three spaced ranks; accepted/imported setups,
  rules and old replays unchanged. Earlier rush/hold evidence uses former start.
  [Owning result](docs/wiki/battlefield-test-maps.md#читаемость-целей-и-панель-действий--2026-10-10),
  lab README and CURRENT_PLAN updated. Web/server typecheck/scoped ESLint,
  five UI/four custom-battle tests, actual shot/end-turn/target checks and
  four-tab reference PASS. Independent source review found no concrete defect;
  final day/night bow/melee/revised mill visual ACCEPT, applicable scores ≥2,
  motion N/A. Documentation format/scoped links/diff PASS. Full gate NOT_RUN
  after this UI amendment; later dense positions/new deployment balance
  NOT_MEASURED. Existing complexity audit still blocks ordinary commit,
  NOT_DONE. No external dependency/migration/publication/merge/deployment.

### Combat AI effectiveness and user-facing playtest

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner requested
  dev restart, actual fights and tactical-depth/routine analysis. Reopened
  the isolated stand; five completed UI battles plus four partial probes
  record state/replay outcomes. Same mill start: rush round9/one death,
  hold round22/five deaths. Sword hit+back preserves80HP/36armor vs38HP/0armor
  without retreat; heavy AI never attacks the kiting actor. Disconnected wall
  repeats120 defends to round60. ID-driven targeting and spear step-to100%
  reproduced. Gamedev and independent gameplay critic GPT-6.1 Sol found
  current depth insufficient. [Owning assessment](docs/wiki/battlefield-test-maps.md#игровая-проверка-ai-и-тактической-глубины--2026-10-10),
  opponents/fatigue wiki and CURRENT_PLAN record priorities and evidence
  boundaries. No gameplay source, rules, dependency or migration changed.
  Documentation format/diff and added local links PASS; whole-document link
  scan FAIL on five unrelated historical absolute paths. New game/full/visual
  gates NOT_RUN; human
  enjoyment/general balance/AI compute NOT_MEASURED. Existing shared commit
  audit blocker remains NOT_DONE. No publication/merge/deployment.

### Archer shot area and overhead damage forecast

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner requested
  archer shot-area highlight and damage/miss above hovered targets, implemented
  with gamedev GPT-6.1 Sol. Core provides affordable bow range/LOS cells and
  on-hit health/armor loss ranges using the unchanged execution calculation.
  Additive optional lab projection fields feed rust shot cells and an overhead
  forecast; geometry avoids figures/results and a connector identifies the
  target. No hover RNG, command, dependency, migration or replay change.
  [Owning contract](docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09),
  ranged/preview wiki, lab README and CURRENT_PLAN updated. Focused parent
  tests 7 files/44 PASS; build/typechecks/scoped ESLint PASS. Browser forecast
  2–4 health/12–18 armor, miss25%; actual shot3/16; blocked target and AP0
  excluded. Final v3 visual ACCEPT, all seven applicable criteria 2 (motion
  N/A), explicitly checks all three bodies and target connector. Source
  readback has no remaining blocker; full gate NOT_RUN after
  amendment. Existing complexity audit blocks ordinary commit, NOT_DONE.
  No publication/merge/deployment.

### Battle hover preview and right-click controls

- 2026-10-10, branch `codex/sprite-combat-stage1`, local: owner requested
  route/AP preview on hover and right-click movement/attack. Battle scene
  and HUD use canonical previews without commands on hover; left-click
  inspects, middle-button drag pans, wheel zooms. Paths now include the
  actor origin even for one-step moves. Shared field/button dispatch checks
  latest view and retains fire confirmation. Invalid/friendly targets do
  not submit commands; navigation/revision/leave clears old hover and native
  context menus are suppressed. [Owning contract](docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09),
  preview wiki, lab README and CURRENT_PLAN updated. Browser command/AP,
  hover-only, fire cancel/accept and navigation checks PASS; web typecheck,
  scoped ESLint and 12 focused tests PASS. Independent GPT-6.1 Sol source
  review has no remaining controls blocker. Initial visual review REJECT
  for thin route contrast; stronger ochre stroke/ink border implemented,
  fresh day/night re-review ACCEPT, all applicable scores 2 (motion N/A).
  Full gate NOT_RUN after this amendment;
  earlier prototype gate remains historical evidence. Existing audit debt
  still blocks ordinary commit, NOT_DONE. No publication/merge/deployment.

### Playable sprite combat and editors

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner requested
  implementation with subagents and a working static-sprite prototype.
  Added the isolated `pnpm dev:combat` stand, custom battle/map editors,
  twenty visual profiles, JSON/local drafts, static Babylon scene and battle
  controls. Versioned prototype core adds dual-budget movement, heights,
  mud/fire, bow LOS, trained adjacent melee, fire/death morale and detour AI;
  old M0/M1 replay behavior remains separate. Protocol/server validate custom
  drafts before allocation, advance opponent commands within accepted receipts
  and export capability-protected replay. No campaign database, migration or
  runtime dependency added. [Owning contract](docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09)
  records actual verification, scope and remaining preset mechanics;
  CURRENT_PLAN and combat-lab setup docs updated. Integrated core/server/editor
  focused tests: 62 PASS. Browser editor/play/terminal/replay journeys PASS;
  static v10 visual ACCEPT and final GPT-6.1 Sol source review passed within
  its bounded scope. Added authored mill painting/provenance, alpha-aware
  picking, separate actor/night grading, silhouette edges and collision-aware
  overhead text; custom restart preserves accepted setup after reload and
  checks catalog availability before deleting. Action availability uses pure
  command dry-runs, disabling unavailable defense/retreat. Removed unused
  lab exports. Full gate initially stopped on unrelated untracked launch JSON,
  then unused exports and three analyzer false positives in SupplyShop props;
  annotated those directly used props without behavior changes. Final clean
  bootstrap gate PASS: 666 tests (47 skipped), 10,000 stress battles,
  migration smoke and 14 encounter/OIDC checks. Separate change audit FAIL
  on introduced complexity/duplication; ordinary commit blocked, NOT_DONE.
  Owner's 2026-10-10 model amendment restricts
  further delegates to GPT-6.1 Sol / GPT-6 Luna.
  No publication, merge or deployment.

### Combat reuse deeper recheck

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner requested
  deeper verification and better reuse choices. [The revised combat contract](docs/wiki/battlefield-test-maps.md#углублённая-перепроверка-и-более-простой-поиск--2026-10-09)
  supersedes mandatory ngraph adaptation with one bounded Dijkstra field
  inspired by Athena Crisis; keeps existing hex/AI/initiative/RNG/replay and
  starts with a linear frontier, TinyQueue only if integration measurements
  justify it. Added independent AP/stamina labels, shared preview preparation,
  canonical-route/versioning boundaries, pinned candidate comparison and probe
  limits; linked [preview requirements](docs/wiki/mechanics/preview.md) and
  updated CURRENT_PLAN. Reproduced ngraph blocked-goal/callback/tie-order cases
  and abstract-astar decrease-key failure. Six new repo queries/13 families;
  three new deep candidates, old ngraph/TinyQueue rechecked. Existing combat
  14/14 and server lab 7/7 tests PASS; isolated prototypes matched independent
  scalar/resource oracles on the recorded corpus. Documentation format,
  scoped tracked links and diff PASS. New game integration/browser journey
  NOT_RUN; production performance/capacity/time savings NOT_MEASURED.
  No foreign source copied into production, package installed, game behavior
  changed, migration, publication, merge or deployment. Earlier research
  remains below as dated history.

### Combat modules and algorithm reuse research

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner requested
  ready GitHub modules/algorithms in the combat specification. Added
  [the reuse matrix and adaptation contract](docs/wiki/battlefield-test-maps.md#повторное-использование-готового-кода--2026-10-09),
  linked it into S2–S4 and the mind map, and updated CURRENT_PLAN. Inspected
  pinned ngraph.path, ROT.js and boardgame.io sources/licenses/tests/issues;
  recommends MIT/ISC weighted-search source adaptation with blocked-goal,
  direction, AP/stamina and deterministic-preview checks. Reuses existing
  core/AI/replay; complete framework adoption rejected, MCTS deferred.
  Eight repository queries/18 families; sequential-thinking MCP used.
  Documentation format, scoped tracked links and diff checks PASS.
  Candidate execution/integration/game checks NOT_RUN; performance/time
  savings NOT_MEASURED. No foreign source copied into production, package
  installed, game behavior changed, migration, publication, merge or deployment.

### Sprite-combat specification and visual agreement

- 2026-10-09, branch `codex/sprite-combat-stage1`, local: owner returned combat
  character production to sprites and confirmed Battle Brothers' positioning,
  weapons, fatigue and morale, 6×6, opponent selection and two samples before
  twenty separate asset tasks. Extended [the owning battlefield page](docs/wiki/battlefield-test-maps.md#спрайтовая-боёвка-тз-этапа-1--2026-10-09)
  with a decision matrix, ten selected warrior/ten bestiary profiles, five locations,
  UX, lore mind map, source-pinned GitHub research and a versioned real-lab plan.
  Added the local approval board and generated concepts/prompts under
  `assets/art/combat/stage1-2026-10-09/`; two samples were revised after critique.
  Updated ADR-0006, combat/wiki navigation and CURRENT_PLAN without changing
  Babylon or game rules. Source/format/JavaScript/JSON/links and desktop board
  journeys PASS. Independent concept findings and corrections are recorded in
  the owning page; integrated day/night/gameplay acceptance BLOCKED; motion out of current scope.
  Full game checks NOT_RUN, performance NOT_MEASURED. No production code,
  migration, dependency, publication, merge or deployment; style/remaining
  balance/implementation await the real stand. D1–D12, roster and style are now
  approved: 80 px/15×11, four AP, no ZOC movement lock, human escape/surrender,
  one retarget with new warning/response activation, heights/mud/fire and static
  full figures only. Approved C replaces rejected W01 as foundation. Twenty
  individual asset tasks under `roster/` completed after style agreement; all
  twenty generated PNG/provenance pairs saved. Primary gallery uses nineteen new
  figures plus existing B001 after alpha failures; rejected variants retained.
  B023 benign tethered variant omits source loop, exact generation rejection
  recorded. Linked mechanics/vision/bestiary amendments preserve old proposals.
  Updated matrix/all-image loading and80/220px gallery interactions PASS;
  first static critic found body-scale/B030 silhouette/B037 lore gaps. Corrected
  human body/foot scaling and B030/B037 v2; absolute re-review pending,
  integrated acceptance still BLOCKED.

- 2026-10-09, same branch, local correction: after the repeated absolute static
  review, replaced B030's mound with a fresh upright folded silhouette (`v3`)
  and restored B023's empty loop on a rooted stationary anchor (`v2`). Updated
  the gallery, visible B030 height and owning specification/checkpoint; exact
  prompts, rejected attempts and earlier variants retained. B023's scene
  fixtures still require separation before gameplay. Revised all-image loading,
  80/220 px, backdrop/console, embedded JS, provenance JSON and local HTML links
  PASS. Full static art/lore scores reached ≥2; B023 composition scored 1,
  so two bounded edits separated the creature (`v3`) and stationary tree/loop
  (`fixture.png`). Gallery selects the creature only; runtime tether/occupancy
  remain future requirements. Final absolute static review: all twenty figures
  score ≥2 on six isolated-art criteria; split/complete toes confirmed,
  clear night80 capture inspected. Narrow B023 bottom margin remains a
  preparation risk. Agreed stage 1 scope complete locally; integrated battle
  acceptance remains BLOCKED. No game-source change,
  publication, merge or deployment.

### World review, Porechye close view via Codex, gamedev skills

- 2026-10-09, branch `claude/world-review-porechye-detail`, merged: owner asked
  to analyse the map and world, use Codex for images and find gamedev skills.
  Added the second map/world analysis and an improvement plan to
  [map](docs/wiki/world/map.md#второй-анализ-карты-и-мира--2026-10-09) (lore
  mismatches at close view: stone Karaulny bridge, castle-like Kamenny Brod,
  missing Tikhaya Gat platforms; no visible war, lairs or wilderness).
  Generated a Porechye close-view sheet with Codex built-in `image_gen`
  (`assets/art/world/porechye-v1/`, prompts and provenance). Visual critic:
  pass 1 REJECT, pass 2 REJECT with props/lore 1→2 and layout fidelity 1
  twice; owner chose per-region edits («a») and plain grave posts: v3 built by
  region compositing — pass 3 ACCEPT as a standalone concept (all applicable
  criteria 2); v4 polish (Kamenny Brod matching its visit painting, Tikhaya
  Gat on the south bank, mill wheel in its race) — pass 4 ACCEPT, materials 3;
  v5: antler banner kept, gibbet-like post replaced by a lantern (owner) —
  pass 5 ACCEPT; in-game use BLOCKED, remaining polish listed in map.md.
  Published as PR #155; merged on the owner's «merge». Installed the
  `openai-develop-web-game` skill after code review (Trail of Bits port;
  local Playwright 1.63; smoke test PASS). Added
  [GAMEDEV_SKILLS](docs/engineering/GAMEDEV_SKILLS.md): installed skills,
  how to call Codex imagegen, candidates (none installed). Game views NOT_RUN.

### Mechanics wiki with cross-links

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner asked to
  describe everything at once as a full wiki with cross-linked mechanics.
  Added [docs/wiki/mechanics/](docs/wiki/mechanics/index.md): 18 combat pages
  (turn and action points, fatigue, melee, armour, weapons, ranged, preview,
  zone of control, morale, telegraphed intent, retreat, formations,
  displacement, terrain, wounds, opponents, talents, pressure) and 10 world
  pages (world turn, place state, attached places, contracts, relations,
  armies, game master, crisis and season, ambitions, chronicle), each with
  status, rule or proposal, player view, cross-links, reference and mistake.
  Core numbers are quoted from `packages/game-core/src/combat/rules.ts`; new
  rules are candidates without numbers. Linked from benchmarks, DESIGN_COMPASS,
  vision, combat, wiki index and SCHEMA. Local links and anchors PASS;
  implementation NOT_RUN.

### Game benchmarks, mistakes to avoid and world game master

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner asked to
  analyse the world map, compare highly rated similar games and save which
  references Warwrit takes and which mistakes it avoids. Added
  [benchmarks](docs/wiki/benchmarks.md) (reviews of ten games, Battle Brothers
  world systems, mistake table, three-layer world proposal, first cycle,
  lore proposals) and linked it from the wiki index, world page and log.
  Recorded owner decisions as REQ-21 (mercenary band that does not command
  armies; duchy armies march and fight parallel battles so the world lives;
  a game master sets the war — direction, design not approved) and
  REQ-22 (test 10–20 players, target 200–1000 bands) and REQ-23 (focus on
  making the current world interesting and on deep, high-quality combat with
  many mechanics; new worlds/regions only after success) in
  [vision](docs/wiki/vision.md). Revision the same day: the report was rewritten
  in detail (world, story and combat per game, mistakes, good/bad examples) and
  a compact agent digest [DESIGN_COMPASS](docs/engineering/DESIGN_COMPASS.md)
  was added to the brief reading list. Owner: some army battles are decided by
  the game master, some by simple rules without tactical battle; REQ-19 and
  brief B9 (second region after M1) are cancelled. The owner then accepted the
  recommendations: first combat mechanics are zone of control, morale with
  flight/surrender and telegraphed creature intent; the game master decides
  battles that change a town's owner or turn the crisis, simple rules decide
  skirmishes, ambushes and small sieges. Documentation only; implementation NOT_RUN,
  server capacity NOT_MEASURED.

### Global world atlas concept

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner requested
  a generated world map consistent with Warwrit's lore. Added the standalone
  ink atlas, exact built-in imagegen prompt and provenance in
  `assets/art/world/stozhar-v1/`, plus [the owning design](docs/wiki/world/map.md)
  and wiki links. Existing north/south/west/east duchies, crown domain and
  disputed Porechye are retained; geometry, drainage and roads are proposals.
  First image generated at 1536×1024. Initial critique REJECT (castle-like
  Kamenny Brod and blue Mutnya); corrected still-image pass ACCEPT. Owner then
  rejected the small scale and requested more cities/villages, varied marshes
  and places damaged by war. Expanded design and exact prompt in
  `assets/art/world/stozhar-v2/`: 24 urban nodes, village networks, three river
  basins and ten distinct districts. Expanded generation/review pending;
  renderer integration and gameplay checks NOT_RUN.

- 2026-10-08 follow-up, `codex/world-map`, merged 2026-10-08: owner required tens of hours,
  more than 100 POIs and coherent geography. Added the desktop zoomable
  `assets/art/world/stozhar-v3/atlas.html`, 128 unique proposed places in
  `places.json`, five image iterations with exact prompts/provenance, and
  REQ-20 in [vision](docs/wiki/vision.md). Corrected the crown river loop,
  water-dependent landmarks, crossing/settlement anchors and Vyasov bypass;
  fields, woods, marsh and working/ruined sites follow their terrain. Initial
  v3 critic rejected misplaced city/crossing/waterwork markers; repeated style
  failures led to graphic ink reconstruction with low roof groups. Final
  standalone atlas ACCEPT at overview scale (six applicable scores 2); close
  rendering/materials remain 1 at 3× and require higher-resolution authored
  detail. Catalogue/embedded JSON/JS syntax/local links/diff, desktop atlas
  journeys and change audit PASS. Expanded v2 is complete but failed minor-label
  readability; v3 supersedes it. [Owning result](docs/wiki/world/map.md).
  Game integration/day/night NOT_RUN; play duration NOT_MEASURED.

### Wave 1 agent results: company book, cache investigation, bestiary

- 2026-10-08, branch `claude/wave1-docs` from `main` (`b7ffefc`), published;
  owner «Ok, merge prs, update main». Integrates the accepted, owner-approved
  parts of the wave-1 Codex briefs (documentation only, no code):
  - **B8 company book** (`codex/b8-company-book` at `5b943aa`): Codex variants
    A/B were REJECT after three text-critic rounds; on the owner's decision
    Claude rewrote the book as «Казна» and «Щит»; both ACCEPT in round 3.
    Owner chose «Щит», third person without the chronicler's «мы».
    [Text and rounds](docs/wiki/onboarding-book.md#b8--новая-редакция-казна-и-щит--2026-10-07).
  - **B4 «Кто выдал тайник»** (`codex/b4-story-missions` at `88590bd`): story
    revision 6 (patched-sack clue instead of the tally stick, owner decision)
    text-critic ACCEPT and owner «Одобряю»; runtime contract
    [M1-STORY-MISSIONS](docs/work-packages/M1-STORY-MISSIONS.md). Reward
    decision (40 crowns from Kondrat's existing funds) is recorded on the
    working branch, not yet here.
  - **B7 bestiary and quest decisions** (`codex/b7-content-revision` at
    `ef0008e`): 30 selected creatures, all 60 IDs retained; creature names
    text-critic ACCEPT; 60 quest editorial decisions. The rewritten quest
    drafts (REJECT) are not included.
    Checks: prettier on changed docs. Game, CI-only checks per PR. Code parts
    of B1/B3/B4 remain on their working branches.

### Pending local work published

- 2026-10-07, branch `claude/world-lore-and-briefs` from `main` (`47c60e0`),
  published: on the owner's «Да, всё закоммить» all pending local work on the
  primary checkout was committed in topical commits and opened as a pull
  request — the contract texts and i18n catalogue, world/vision/briefs docs,
  critics and 3D skills, terrain ink materials and the wiki research drafts
  written by earlier sessions. Local evidence (`output/`, `.playwright-cli/`)
  and agent worktrees (`.claude/worktrees/`) are now ignored, not committed.
  Merge is not authorized.
- 2026-10-07 correction: merged on the owner's «Yes» as
  [PR #152](https://github.com/Vovanostm/warwrit/pull/152) (`b7ffefc`).

### Work package: melee always connects (combat ruleset v3) — proposal

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner asked for
  a full specification with acceptance criteria, self-verification and a
  code-quality test for the accepted melee rule. Added
  [M1-MELEE-CONNECT](docs/work-packages/M1-MELEE-CONNECT.md), linked from
  [combat](docs/wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07).
  It specifies:
  - new ruleset `m1-domain-bridge-v3` with melee/ranged weapon kinds and
    `meleeTraining` per unit;
  - a one-roll quality model (precise/solid/glancing, miss only for recruits and
    ranged) with a provable always-damage invariant;
  - an optional `quality` on `attack.resolved`, leaving v1/v2 byte-identical;
  - practice mapping that keeps the SUCCESS rate;
  - a pure `previewAttack` exposed only in the combat lab;
  - seven time-boxed steps, 15 acceptance criteria, a test plan, a
    self-verification pass, a code-quality gate, and open decisions D1–D3.

  Grounded in the current engine, rules, setup-v2, practice, admission and
  protocol code. An independent `warwrit-critic` pass on revision 1 found 7
  confirmed gaps (M0-only combat lab, three v1/v2-only server checks,
  exact-field aggregate validators, the replay digest field, a missing schema 2
  stress runner, the D1 default, preview rejection codes). All are fixed in
  revision 2, together with a public `recentAttacks` battle line for a
  player-visible result. Documentation only; implementation NOT_RUN.

### Contract texts and string catalogue

- 2026-10-07, originating branch `main`, local: owner asked to split the briefs
  into separate files with acceptance criteria and critique. Added
  `docs/engineering/briefs/2026-10-07/` (README, 00-common, B1–B9), the text
  critique rubric [TEXT_CRITIQUE.md](docs/engineering/TEXT_CRITIQUE.md) and the
  `warwrit-text-critic` / `warwrit_text_critic` agents; removed the single
  AGENT_BRIEFS file. The i18n catalogue is split per area
  (`contracts.ru.ts`, `contracts.en.ts`) to avoid shared-file conflicts. Web
  typecheck, `vitest run apps/web/src` 80/80, eslint and prettier PASS.

- 2026-10-07, originating branch `main`, local: on the owner's «Да, перепиши»
  the eight M1 contracts use the rewritten Porechye texts (named issuers,
  briefs, steps, findings, completion facts; hunt briefs shown at the issuer).
  Strings moved to the new `apps/web/src/i18n` module (`ru.ts`, `en.ts`,
  `lookup`/`t`; `?lang=en`), with a type that requires a complete English
  catalogue; no new dependency. Mechanics, steps and rewards unchanged.
  Affected: `ContractBoard.tsx`, `contract-visits.ts`, `FirstHunt.tsx`,
  `ContractBoard.test.tsx` (two expected literals), world docs. Checks: web
  typecheck, `vitest run apps/web/src` 80/80, eslint and prettier PASS; browser
  NOT_RUN (local `.env` database port mismatch, not changed).
- 2026-10-07, originating branch `main`, local: detailed agent briefs B1–B9 for
  the remaining vision decisions in
  [briefs/2026-10-07](docs/engineering/briefs/2026-10-07/README.md) (split later the same day).
  Not dispatched.

### Game direction: Battle Brothers rules, XCOM presentation, melee always damages

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner answered
  «Да, давай дух Battle Brothers и взял у XCOM только подачу» and set the rule
  «Урон в ближнем бою должен быть всегда (кроме новобранцев или боя с
  призраками) — игра должна быть логичнее xcom в этом плане». Recorded in:
  - [m1-spec §18](docs/wiki/m1-spec.md#18-battle-brothers-направление-и-этапы--2026-10-03);
  - [combat](docs/wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07),
    with a proposed reading for confirmation: hit quality instead of miss,
    shield/armor damage counts, recruit threshold, incorporeal exception that
    adds no creature, ranged keeps its miss chance;
  - [battlefield-test-maps](docs/wiki/battlefield-test-maps.md): no cover or
    flanking, melee preview shows strike strength.

  The current core still rolls `hitChance` for every attack. The change needs a
  new combat rules version and a compatibility analysis, and V1 replays stay
  unchanged. Implementation NOT_RUN. The canonical Airtable record was not
  updated (no access in this session): NOT_RUN.
  Same day: the owner confirmed the proposed reading («Да»), which is now
  recorded as accepted in the spec, combat and battlefield pages. Open item: the
  recruit skill threshold.

### Game vision page

- 2026-10-07, originating branch `main`, local: owner confirmed autobattle with
  AI retreat and possible deaths, an order to travel to a settlement and log out
  with auto-resolved battles on the way, and a second region right after M1.
  Vision REQ-18/19, M1-spec §7 and CURRENT_PLAN updated. Documentation only.

- 2026-10-07, originating branch `main`, local: owner decided offline
  behaviour (field camp with slower upkeep, terrain hunting/gathering,
  autobattle when attacked, safer logout in settlements) and crises (duchy war
  with settlement capture first, monster waves next). Vision REQ-12/18 and
  sections, M1-spec §7/§18 and bestiary world-rules amended; the old camp rule
  is superseded. Documentation only.

- 2026-10-07, originating branch `main`, local: owner amendment — no battle
  time budget, contracts of varying length, more repeatable and new contracts,
  combat-free visual-novel and detective missions. Updated vision REQ-09/11,
  added REQ-17 and a proposed mission-format section with three candidates;
  M1-spec tempo answer and CURRENT_PLAN amended. Documentation only.

- 2026-10-07, originating branch `main`, local: owner restated the genre and
  references (Battle Brothers, Wartales, The Witcher, XCOM) and asked whether
  the MMO fits and whether it is recorded. Added
  [docs/wiki/vision.md](docs/wiki/vision.md): owner decision, pillars, what to
  take from each game, MMO-fit table, REQ-01..16 summary with sources, open
  decisions and plan refinements; linked from M1-spec §1, wiki index and
  CURRENT_PLAN. Web sources on Wartales, BB crises, Dofus/Wakfu and Foxhole are
  cited. Documentation only; game code unchanged.

### Battlefield look and test maps — proposal

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner asked that the
  battlefield look like Battle Brothers / Disciples / Wartales and for several
  maps to test combat, character display and animations. Added
  [battlefield-test-maps](docs/wiki/battlefield-test-maps.md), linked from the
  [wiki index](docs/wiki/index.md). It covers:
  - what to take from each reference and what not to copy;
  - shared battlefield acceptance targets (field, grid, camera scale options,
    unit base and bars, occlusion, night/local light, honest rules);
  - six diagnostic maps T0–T5 on existing places, bestiary and weapon profiles;
  - a minimal implementation path (serverless display stand first, combat-lab
    scenarios later);
  - open owner decisions (unit size, field size, elevation/cover).

  Grounded in the current core: hexes plus `blocked` only, spear range 1–2, and
  no line-of-sight rule. Documentation only; implementation NOT_RUN.
  Same day: added an XCOM-quality section covering six presentation pillars,
  the state/visualization split (an XCOM 2 `X2Action`-style client sequencer
  over the existing combat events), animation blending and contact-frame sync,
  and the rule decisions it needs (attack preview function, line of sight,
  ZOC/height/cover).

### World of warring duchies and writing rules

- 2026-10-07, originating branch `main`, local: owner found «Совет опекунов»
  odd and asked for a literary style after Lermontov, Tolkien and others.
  Renamed it to the Boyar Duma; read «Тамань», «Капитанская дочка» ch. II,
  «Бежин луг», part of «Севастополь в декабре месяце» and «Страшная месть»;
  added [literary-style.md](docs/wiki/world/literary-style.md) with borrowed
  devices, narrative voices, name phonology per duchy and five Porechye samples.
  Tolkien, Sapkowski and Glen Cook are summarized from memory, not re-read.
  Samples are review drafts; game text unchanged.

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner decided that
  Warwrit is an MMO with a large world of several duchies at war (Witcher
  analogy). Added [docs/wiki/world/](docs/wiki/world/index.md): realm, four
  duchies and the regency council, the succession war, Seroe Porechye in the war
  with named issuers and rewritten texts for the eight M1 contracts, anti-slop
  [writing rules](docs/wiki/world/writing.md) and a
  [localization design](docs/wiki/world/localization.md); analysis tables in
  `docs/content/world/*.csv`. AGENTS.md lore ban amended for the duchies. Cause:
  the lore review found constraints without history, power or people, and
  bureaucratic player text. Names, dates and texts are review drafts; game code
  and in-game text are unchanged. Checks: CSV column validation and local links;
  game tests NOT_RUN (documentation only).

### Characters 3D: Mixamo scope extended to combat packs

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner answered «Да,
  расширь». Mixamo use for `codex/characters-3d` now covers the free Sword and
  Shield, Great Sword and Longbow packs as the primary combat clip set. The
  cause: the visual rubric REJECT on `1687b19` traced pose and attack defects to
  the UAL clips. Updated the
  [warwrit-characters-3d](.agents/skills/warwrit-characters-3d/SKILL.md) and
  [mixamo-blender](.agents/skills/mixamo-blender/SKILL.md) skills: one pack per
  weapon family, root travel removed before the bake, and no runtime procedural
  position correction. The branch agent recorded the decision in its contract
  and adopted the skills (`def9fd6`); the primary copies remain uncommitted.

### Visual critic with a scored reference rubric

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner reported
  that `codex/characters-3d` results were still not acceptable after its critic
  passed them. Cause: visual passes used the diff reviewer (`warwrit_reviewer`),
  which re-checked only the author's fixes and had no reference rubric. Added
  [VISUAL_CRITIQUE.md](docs/engineering/VISUAL_CRITIQUE.md) (author inputs,
  first-look test, 8 scored criteria, ACCEPT only when every criterion is ≥ 2,
  a convergence rule that forces a technique change, and a calibration example on
  `1687b19`). Also added the Codex `warwrit_visual_critic` agent (registered in
  `.codex/config.toml`), the Claude `warwrit-visual-critic` agent, an
  [AGENTS.md](AGENTS.md#independent-playable-critique) policy bullet and the
  critique step in the `warwrit-characters-3d` skill. Check: an independent run
  of the rubric on the `1687b19` captures, without the calibration section,
  returned REJECT with the same gaps (pose, rendering language, night value,
  shield material, attack clip) and a convergence note. Prettier and link checks
  PASS; TOML parses. The branch agent copied the files into `codex/characters-3d`
  (`def9fd6`); the primary copies remain uncommitted.

### Skills: 3D character workflow and GLB optimisation

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner reviewed
  Codex thread `01a112ef-4c1f-7591-be7d-0fd49504ebee` (`codex/characters-3d`,
  style gate v2) and approved the character tilt toward the camera and Mixamo for
  clips missing from UAL. Added the
  [warwrit-characters-3d](.agents/skills/warwrit-characters-3d/SKILL.md) skill.
  It covers the skeleton and clip map, the tilt rule, ink-material value matching
  against the reference, lore limits (no emblems), the Mixamo retarget path, an
  evidence workflow, and `scripts/optimize-glb.sh` (glTF-Transform 4.5.1:
  dedup/prune/resize/WebP). Linked the skill from the
  [skills README](.agents/skills/README.md) and
  [mixamo-blender](.agents/skills/mixamo-blender/SKILL.md). Checks: the script
  ran on copies of `ranger.glb` (9.7 → 1.9 MB) and `Shield_Wooden.glb`
  (5.9 → 0.3 MB); both loaded in Babylon 9.28 with textures ready. A live tilt
  probe (−25…−30°) in the branch workshop gave an upright, reference-like figure.
  Corrections on the same day: the camera convention (the workshop views from +z,
  the battle camera from −z), the contact-shadow direction (screen up-right in
  the game camera) and plain-path references to the untracked `combat.md`. At the
  owner's request the review session copied both skills into `codex/characters-3d`
  with the owner decisions and next-cycle brief (commit `3f4fc06`, audit NOT_RUN
  under the branch exception). The primary copies remain uncommitted.

### Agent rules: work-package step discipline

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner asked to
  prevent repeats of the defects found in the review of Codex thread
  `01a112ef-4c1f-7591-be7d-0fd49504ebee` (`codex/characters-3d` step 1:
  worktree and downloads in `/private/tmp`, production build and coverage run
  in parallel for a load-only step, timeouts reported without isolated rerun,
  audit blocker not asked, hand-edited lockfile, link to an untracked
  screenshot). Owner chose: intermediate work-branch commits may use
  `--no-verify` with the audit recorded `NOT_RUN`, passing before the PR.
  Added [AGENTS.md § Work-package steps](AGENTS.md#work-package-steps) and a
  sequential-checks rule under Proportional verification; cross-linked from
  [LOCAL_DEVELOPMENT](docs/engineering/LOCAL_DEVELOPMENT.md). Documentation only;
  game checks not applicable. Not committed/published/merged.

### Characters: real-time 3D plan with swappable equipment — proposal

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner asked for a
  precise agent plan after reviewing the stalled Codex sprite-pipeline thread.
  [M1-CHARACTERS-3D](docs/work-packages/M1-CHARACTERS-3D.md) proposes real-time
  3D characters in Babylon (CC0 Quaternius bodies/outfits/animations, bone
  attachments) in eight time-boxed steps. Step 0 is an owner gate to amend the
  ADR-0006 sprite direction; nothing is activated. Documentation only; code,
  assets and checks NOT_RUN. Not committed/published/merged.

### Progression research and candidate balance correction

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner requested
  continued modern-game/review research and concrete skill balance.
  [20-game overview](docs/wiki/progression-research.md),
  [source editions/limits](docs/wiki/progression-research-sources.md) and
  [B1 profile](docs/wiki/character-balance.md) compare tactics, practice,
  injuries and hybrid tradeoffs. Candidate future XP rates/course pace/physical
  bounds added; earlier whole-turn shot/armor prices corrected, attack reactions
  prepaid and eight hybrids priced. 13 disciplines/52 perks retained.
  Affected: owning progression/ability pages, combat cross-links, wiki index/log
  and CURRENT_PLAN. All new rules remain review-draft; accepted source policies,
  code/contracts/migrations/assets/player state unchanged. Actual documentary
  and arithmetic checks recorded in [owning results](docs/wiki/character-progression.md#исследование-и-поправка-b1--2026-10-06);
  gameplay/UI/simulation/playtest/independent playable critique NOT_RUN,
  actual balance/pace/course economy NOT_MEASURED. Not committed/published/merged.

### Character skills and hybrid abilities — design proposal

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner requested
  skill trees, warrior/archer classes, hybrids and injury-related development.
  [Owning design](docs/wiki/character-progression.md) adds 13 discipline descriptions,
  eight roles and strength/health/pain/courage rules;
  [catalogue](docs/wiki/character-abilities.md) proposes 52 perks/eight hybrids.
  Retain actual-practice/finite-study/discipline-choice policies; damage alone
  does not award XP or increase HP/strength. Five added disciplines and all
  new ability/physical balance remain review-draft. Affected: two owning wiki
  pages, combat cross-links, wiki index/log and CURRENT_PLAN; source/contracts,
  migrations and player state unchanged. Documentation format/local-links/
  choice structure/readback/scoped diff-check PASS, recorded in owning design;
  implementation/game/browser/independent playable critique
  NOT_RUN, learning pace/balance NOT_MEASURED. Not committed/published/merged.

### Living-world merged / local-main synchronization

- 2026-10-05, originating branch `codex/living-world-main`, merged:
  owner requested merge/update main. [PR151](https://github.com/Vovanostm/warwrit/pull/151)
  (`f9d300d`) merged as `47c60e0`; primary/origin/GitHub main match, reviewed
  tree unchanged. Four-biome fauna/reactions, local synthesized ambience,
  bounded place work, lawful observations and known-work notes delivered.
  Web presentation/assets/registry/owning docs affected; no domain/protocol,
  migration or player-data change. Exact-head PR CI attempt2 SUCCESS (643/47,
  10000 stress,14 SQL/auth, coverage/audit); attempt1 navigation coverage
  timeouts retained. Independent critic READY_WITH_LIMITS; local typecheck,
  diff/readiness/native reload PASS. Scoped recovery preserves unrelated drafts,
  company/North Yard/850 crowns and original DB/Dex. Main CI IN_PROGRESS;
  actual new travel NOT_RUN, FPS/RAM/audio quality NOT_MEASURED.
  [Owning results and recovery](docs/wiki/m1-spec.md#слияние-и-обновление-main--2026-10-05).
  This dated closeout is local/uncommitted; no deployment.

### Living-world commit-audit correction

- 2026-10-05, originating branch `codex/living-world-main`, local: the ordinary commit audit rejected eight introduced complexity findings. Extract cohesive habitat/population/animation, sound and background UI functions without changing behavior or any gate. Corrected audit, focused7, typecheck/lint and temporary90-second exact fauna comparison PASS; initial diagnostic path failure retained. Earlier full coverage643/47 and bootstrap remain pre-extraction evidence; final PR CI is pending. [Owning validation](docs/wiki/m1-spec.md#проверка-изолированной-поставки--2026-10-05). No canonical state or migration change.

### Living-world delivery authorized

- 2026-10-05, originating branch `codex/living-world-main`, local: owner requested “merge, update local main”. Isolate the reviewed habitat/reaction/audio/place-activity/lawful-observation slice from unrelated primary drafts. Include its original wildlife assets/provenance and registry; canonical state, migrations and player data unchanged. Prior clean bootstrap PASS and independent capture review retained; exact PR CI and merge pending. [Owning behavior/checks](docs/wiki/m1-spec.md#реализация-живой-среды--2026-10-05).

### Living-world presentation implementation

- 2026-10-05, originating branch `main` (`f3d214c`), local: owner authorized
  implementation of the biome/living-world discussion. Habitat-specific four
  species now use actual flowers/trees and react to the company; opt-in local
  synthesized ambience, bounded day/night settlement work, lawful current map
  observations and company-known completed-work notes are integrated. Affected:
  web renderer/game presentation; owning [implementation and checks](docs/wiki/m1-spec.md#реализация-живой-среды--2026-10-05).
  No protocol, canonical state, migration or player-data change. Focused7,
  web typecheck/lint/format/architecture and representative native/component
  desktop/sound checks PASS after documented corrections. Independent affected
  source/capture critique found no remaining material defect after frog/bird
  scale correction; forest flight remains visually unproven. Clean final bootstrap
  PASS:643/47 skipped,10000 stress battles, migration smoke/14 PostgreSQL/auth
  checks; temporary DB removed. Real new journey, FPS and audible sound quality
  unverified.
  Actual moving patrols need unavailable route/observation state; no invented
  traffic, new species, seasons, paid art, publication, merge or deployment.

### Living-world layers beyond fauna — design follow-up

- 2026-10-05, originating branch `main`, local: owner's follow-up asks whether
  fauna is sufficient. [Owning recommendation](docs/wiki/m1-spec.md#достаточно-ли-фауны-для-живого-мира--2026-10-05)
  adds priorities for shared environmental motion, place-specific sound,
  settlement work, local reactions, actual world traffic and fact-bound
  consequences. Existing motion remains acknowledged; moving traders/caravans
  are not activated in M1. Documentation-only review-draft; no code/assets/audio
  or player-state change. Formatting/local links/readback checked; gameplay
  and browser acceptance NOT_RUN, appeal/production cost NOT_MEASURED.

### Biome-specific ambient wildlife proposal

- 2026-10-05, originating branch `main` (`f3d214c`), local: owner requested
  distinct biome fauna instead of hares/butterflies everywhere.
  [Owning matrix and next cycle](docs/wiki/m1-spec.md#20-биомы-и-живая-природа--2026-10-05)
  compare actual geography and four current wildlife forms with live WORLD/lore
  Notes/Purpose and inspected art. Propose habitat-based distribution, quiet
  forest/rock areas, dragonflies/ducks next, and later forest/night/domestic life.
  Real contract wolves/mill beast remain separate from ambient decoration.
  Only wiki/checkpoint/changelog documentation changed; runtime, assets and
  player state unchanged. Initial new-table formatting failure corrected;
  repeated formatting/local-link/readback checks PASS. Implementation, new
  browser journey/game tests/independent playable critique NOT_RUN; density/FPS
  NOT_MEASURED. Review-draft, not committed/published/merged.

### Company opening after reading Russian classics

- 2026-10-05, originating branch `main`, local: owner again rejected the
  compressed origin as non-literary and requested Lermontov, Dostoevsky and
  Tolstoy. Read the opening of Bela, Crime and Punishment I.1 and Caucasian
  Prisoner I–II; [sources and reading limits](docs/wiki/onboarding-references.md#классическая-проза--2026-10-05).
  Replaced the [five-page sample](docs/wiki/onboarding-book.md) with one
  third-person scene: proposal, questions, hesitation, paid hiring and arrival
  next morning. Miron is only a sample name for the player-selected leader.
  [Owning history and checks](docs/wiki/onboarding-lore.md) retains prior
  rejections. This sample covers two companions only; background mapping and
  first-job availability remain unresolved. M1 contracts/supplies/code unchanged.
  New prose is review-draft, not accepted or published; UI/art/playtest NOT_RUN.

### Company opening revised after owner rejection

- 2026-10-05, originating branch `main`, local: supersedes the military-opening
  recommendation below. Owner rejected its prose and fit with Warwrit, authorized
  a new origin, then requested clearer language and believable motives. Earlier
  rank correction and D&D reading remain historical research. The current
  [five-page book](docs/wiki/onboarding-book.md) follows a completed escort job,
  known companions and paid hiring from savings;
  [owning comparison](docs/wiki/onboarding-lore.md) records rejections and scope,
  [references](docs/wiki/onboarding-references.md) retain actual reading limits.
  Existing backgrounds, world contracts and supplies are unchanged. Navigation,
  wiki log and CURRENT_PLAN corrected after the shared writer completed.
  Formatting/local-link/readback checks PASS; UI/art/playtest NOT_RUN.
  New prose remains review-draft, without owner acceptance; not published/merged.

### Place motion merged closeout

- 2026-10-05, originating branch `codex/place-motion-sync`, merged:
  [PR150](https://github.com/Vovanostm/warwrit/pull/150), reviewed2c271ce,
  merged asf3d214c. PR CI37318286511 SUCCESS: bootstrap639/47 skipped,
  10000 stress battles, migrations/14 PostgreSQL checks, coverage and audit.
  Independent source/current-capture review found no material defect. Local
  main updated to the same remote commit; only two shared documents required
  scoped recovery, preserving all other drafts/player data and both histories.
  Integrated typecheck/diff/readiness PASS; existing local5293 runtime restored
  without data reset/migration. Main CI37319767204 IN_PROGRESS, new logged-in
  journey NOT_RUN; no deployment. Supersedes earlier local/pending motion entries.
  [Owning closeout](docs/work-packages/M1-LIVING-PLACES.md#motion-synchronization-merged-closeout--2026-10-05).

### Synchronized place motion

- 2026-10-05, originating branch `codex/place-motion-sync`, local: owner
  authorized merge/local-main update of the timing correction. Reapplied on
  PR149/main `793ce7e`, retaining its mount/draw extraction. `PlaceScene.tsx`,
  `place-scene.css` and `place-depth-scene.ts` drive painting, doors/smoke and
  outer layers from the same smoothed look, including startup/pointer leave,
  with no second active CSS transition. Assets/depth/amplitudes, fallback,
  reduced motion and player data retained. Earlier focused/browser review is
  historical; fresh typecheck/projection2/coverage639/47 skipped/audit and
  desktop360-frame/input/reduced-motion/fallback PASS, source review clear;
  fresh capture review/PR CI/merge pending. No migration/deployment.
  [Owning behavior, checks and limits](docs/work-packages/M1-LIVING-PLACES.md#motion-synchronization-delivery--2026-10-05).

### Location depth isolated validation

- 2026-10-05, originating branch `codex/place-depth-main`, local: final
  navigation-base candidate passes coverage639/47skipped, focused projection2/2,
  web typecheck, scoped lint/format and ordinary audit. Initial CRAP findings
  were corrected by cohesive mount/render/interpolation extraction with the
  same behavior and unchanged gate. Fresh isolated desktop native entrance,
  Escape/focus, movement, remount and12 actual extreme/fallback/reduced-motion
  states pass. Failed automation attempts and current evidence are retained in
  [owning verification](docs/work-packages/M1-LIVING-PLACES.md#isolated-candidate-verification--2026-10-05).
  Source scope and desktop policy above remain; PR CI/merge pending, FPS/memory
  NOT_MEASURED, full mill journey NOT_RUN.

### Location depth delivery authorized

- 2026-10-05, originating branch `codex/place-depth-main`, local: owner
  approved publication, merge and local-main update of the existing depth slice.
  Isolated branch starts at navigation main9ee53d3 and retains the reviewed DPR
  and foreground-edge corrections plus desktop policy. Scope and selected
  current visual evidence in
  [owning delivery record](docs/work-packages/M1-LIVING-PLACES.md#publication-authorized--2026-10-05).
  Local coverage and ordinary audit are recorded there; current-head PR CI,
  publication and merge remain pending. Unrelated primary drafts/player data
  preserved; no new migration or canonical gameplay change.

### Synchronized place motion

- 2026-10-05, originating branch `main`, local: owner-reported place image/
  parallax timing mismatch corrected in `PlaceScene.tsx`, `place-scene.css`
  and `place-depth-scene.ts`. Active outer layers now use the painting's
  smoothed look in the same render frame, including startup and pointer leave;
  remove their independent450ms CSS delay. Existing assets/depth/amplitudes,
  entrances/smoke, reduced motion, fallback and player state retained. Focused
  source checks and360-frame desktop component-browser/input checks PASS;
  independent source/seven-capture critic found no material defect; full
  journey/game/DB gate NOT_RUN.
  Local/uncommitted/unpublished, no migration or deployment.
  [Owning behavior, checks and limits](docs/work-packages/M1-LIVING-PLACES.md#синхронизация-движения-слоёв--2026-10-05).

### PR148 merged and primary main updated

- 2026-10-05, originating branch `codex/map-topology-experiments`, merged
  [PR148](https://github.com/Vovanostm/warwrit/pull/148) as `9ee53d3`; local-main
  closeout on `main` after the owner's explicit merge/update request. PR and main
  CI SUCCESS. Coordinated primary/doc write freezes, scoped six-document recovery
  and safe fast-forward retained all local source, assets, lore/forest/place/wildlife
  histories and player data. HEAD, origin/main and GitHub main match `9ee53d3`.
  Core build, core/web typecheck, diff and5287 proxied readiness PASS; normal
  browser reload restores the rendered map and original stationary850-crown company.
  No new travel or full integrated gameplay gate was run in this update; retained
  starvation limitation remains. Recovery stash retained; unrelated drafts remain
  uncommitted. No migration, deployment or player reset.
  [Owning closeout](docs/wiki/m1-spec.md#слияние-и-обновление-primary-main--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, published:
  [PR148](https://github.com/Vovanostm/warwrit/pull/148) delivers the owner-selected
  hex default, cached exact route edges and bounded terrain detours. Independent
  source/playable review and focused checks pass; current-head clean CI and the
  explicitly authorized merge remain pending. Primary main is at PR147 with
  concurrent drafts preserved. GitHub owns subsequent CI/merge facts.
  [Owning delivery record](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

### Company origins and illustrated opening — design proposal

- 2026-10-05, originating branch `main`, local: owner requested lore, MMO
  consistency, literary/Slavic references and a credible illustrated opening.
  [Owning comparison](docs/wiki/onboarding-lore.md),
  [ten-page book and late entry](docs/wiki/onboarding-book.md) and
  [sources/quest motifs](docs/wiki/onboarding-references.md) compare four origins
  and propose one shared military catastrophe with distinct witnesses, followed
  by later arrivals with other histories. Name/appearance precede the book;
  company naming follows it. Dragon, war, biographies and legal procedure remain
  proposals; existing M1 contracts, starting supplies and accepted private-world
  scope are preserved. Documentation fields/local links/formatting checked;
  initial formatting and link-parser issues corrected in owning results.
  Navigation and CURRENT_PLAN updated after parallel writers completed.
  No code/art implementation, publication or merge; gameplay/CI/independent
  playable critique NOT_RUN, reading time/appeal/capacity NOT_MEASURED.

### Ambient map wildlife

- 2026-10-05, originating branch `main`, local: owner-requested hares and
  butterflies animate on the global map. `map-wildlife.ts`, its regression,
  four continuous-map lifecycle additions, original `wildlife-v1` atlas/provenance
  and two asset registrations implement seeded safe habitats, bounds/rest,
  irregular winged flight and night response without targets or canonical NPC
  state. Future parties/traders/enemies remain separate scope. The independent
  integrated critic's butterfly readability finding was corrected and repeated
  desktop capture review found no remaining material defect. Focused checks,
  final primary typecheck/lint/format, architecture and content validation PASS;
  initial clean bootstrap PASS (632/47 skipped, 10,000 stress battles, migrations/
  14 PostgreSQL tests), corrected-source final bootstrap PASS with the same counts
  and temporary infrastructure removed. Pan/zoom and
  day/night motion inspected; retained company stayed stationary with 850 crowns.
  FPS/memory/enjoyment NOT_MEASURED; wildlife travel/STOP/reload NOT_RUN by this chat.
  Not committed/published/merged; no migration, player reset or deployment.
  [Owning results and limits](docs/work-packages/M1-FREE-MOVEMENT.md#ambient-map-wildlife--2026-10-05).

### Forest main/runtime closeout

- 2026-10-05, originating branch `codex/forest-diversity-main`, merged PR147
  `548837c`; local runtime/integration closeout on `main`: owner requested normal
  sign-in, verification, writer coordination and working primary main. Both active
  primary authors paused writes; safe fast-forward retained all drafts and both
  histories, with recovery stash kept. Restored5287/API3187/realtime3188 and matched
  PUBLIC_ORIGIN/OIDC callback without changing the other author's .env/services
  or retained player DB. Wildlife consumes the merged polygon-edge helper; its
  source/atlas remain the other local slice. Scope: forest integration/runtime,
  `M1-FREE-MOVEMENT`, `CURRENT_PLAN` and this entry. PR/main CI SUCCESS, integrated
  web typecheck/diff/readiness PASS; actual normal-UI opening, movement/S/reroute,
  reload/arrival, purchase and pan/zoom/day/night proof in separate test DB.
  Final independent forest critic PASS, including fully rendered settled reload
  at1365×900; old-company starvation recovery remains outside
  accepted rules. No deployment, player reset, new migration or full-M1 claim.
  [Actual result and limits](docs/work-packages/M1-FREE-MOVEMENT.md#primary-main-integration-and-actual-journey--2026-10-05).

### Tree diversity on current main

- 2026-10-05, branch `codex/forest-diversity-main`, local: owner requested the
  working 14-form forest in main. Continue PR146's composed curved crowns and
  original atlas style, with age/species silhouettes and deterministic natural
  pockets/clearings; preserve relief, input, routes and gameplay. Scope: web tree
  forms/geometry/placement/geography/mount and owning docs. Prior whole-sprite
  attempt and primary unrelated drafts/player data remain preserved. Four focused
  geometry/placement checks, typecheck/build/lint/content pass;
  independent source and day/night art critic READY_WITH_LIMITS. Full local
  coverage FAILED two unchanged navigation timeouts (629 pass/47 skip); normal
  PR CI/merge pending, authenticated journey NOT_RUN after automatic login
  rejection. Shared picking decoder/terrain validation and site-assembly extraction retain
  projection, material, alpha and input guards; final unchanged audit passes
  with current focused coverage.
  Active primary location-depth writer prevents overlapping shared-file writes;
  no deployment or new migration.
  [Owning scope/results](docs/work-packages/M1-FREE-MOVEMENT.md#tree-diversity-on-current-main--2026-10-05).

### Desktop target

- 2026-10-05, originating branch `main`, local: owner specified desktop as
  the supported game version, with landscape-only mobile viewing of the same
  interface at a smaller scale. [AGENTS.md](AGENTS.md#desktop-viewport-and-mobile-orientation)
  records the shared layout/acceptance target and excludes a separate mobile
  or portrait UX. Existing adaptations are retained; this changes instructions,
  not the UI. Current place work follows the updated scope. Documentation
  readback, formatting and scoped diff/link checks completed at closeout;
  no game tests needed for this policy-only change. Not published or merged.

### Location depth implementation

- 2026-10-05, originating branch `main`, local (not committed or published):
  owner requested optimal method selection, implementation, review and testing.
  Five offline Depth Anything V2 Small maps drive an original Babylon.js
  perspective shader; doors and smoke share the depth projection. Existing
  paintings, distant/foreground layers and game actions are preserved. Scope:
  `PlaceScene`, place layout/CSS, new `place-depth-*` renderer modules/tests,
  `prepare-place-depth.py`, `places/depth-v1`, additive asset registry and
  [owning result](docs/work-packages/M1-LIVING-PLACES.md#location-depth-implementation--2026-10-05).
  Focused projection tests, web build/typecheck, architecture and content97
  PASS. Independent repeated source/visual critique found no open material
  defect in five scenes/day/night/extremes; corrected the reproduced GPU-fallback
  edge strip by retaining the original static parallax range and resetting look.
  Final clean bootstrap at `548837c` plus this slice PASS:633/47skipped,
  10000-battle stress, migrations/14 PostgreSQL checks. Native entrance/Escape,
  remote-access and reduced-motion/fallback/lifecycle assertions PASS; harness
  and motion-frame proof limits are recorded in the owning document. Earlier
  final-source attempt was interrupted during build, not counted as a pass.
  Unrelated dirty work and retained player data preserved. No migration,
  publication of this slice, merge, deployment or paid provisioning. Forest PR147
  was integrated separately by its authorized writer with this dirty slice retained.

- 2026-10-05, originating branch `main`, local sharpness correction: native
  final view exposed a half-size canvas after a DPR2→1 transition. Removed the
  place renderer's manual hardware scaling override; shared Babylon adaptive
  scaling now retains full DPR resolution. Fresh DPR1/DPR2 mounts and repeated
  viewport/DPR changes PASS; new neutral/extreme/motion captures and affected
  independent critic show no material defect. Corrected clean bootstrap on
  `548837c` plus this slice PASS:633/47skipped,10000 battles,migrations/14PG.
  Prior cancelled stale-copy attempt is not counted. Updated source and
  [correction/evidence](docs/work-packages/M1-LIVING-PLACES.md#исправление-чёткости--2026-10-05);
  other authors' forest closeout preserved. FPS NOT_MEASURED; remains uncommitted.

- 2026-10-05, originating branch `main`, local gate-edge correction: owner
  reported clipped foreground edges at mouse extremes, missed by the previous
  visual pass. Active CSS foreground overscan increased to1.13 to cover the
  full42/21px travel; fallback/reduced-motion behavior retained. Native32-corner
  checks across four settlements/minimum desktop/fallback/reduced motion and
  scoped CSS format/diff PASS; affected critic DONE, no material finding. Full game/DB gate
  NOT_RUN for this CSS-only followup, FPS NOT_MEASURED. Scope: place CSS and
  [owning correction](docs/work-packages/M1-LIVING-PLACES.md#края-переднего-плана--2026-10-05);
  retained data/other writers untouched; uncommitted/unpublished.

### Location depth research

- 2026-10-05, originating branch `main`, local (not committed or published):
  owner requested modern simple methods and ready workflows for perspective
  inside location paintings. [Owning comparison](docs/work-packages/M1-LIVING-PLACES.md#location-depth-methods--2026-10-05)
  records source-checked tools, model/license/device limits and a proposed
  depth-shader-first prototype with selective occlusion repair. Updated only
  `M1-LIVING-PLACES`, `CURRENT_PLAN` and this entry; existing dirty work retained.
  Documentation readback, formatting, scoped diff and local links checked.
  No game/asset change; tool execution, integration and playable critique
  NOT_RUN, quality/performance NOT_MEASURED. No publication/merge/deployment.

### Terrain implementation

- 2026-10-04, branch `main`, local (not committed or published): owner requested
  implementation of [terrain-art](docs/wiki/terrain-art.md#13-реализация--2026-10-04)
  with subagents. First five original ink terrain/road PNGs and exact provenance
  use existing material slots; asset registry preserves historical resources.
  Removed the legacy 38% flat meadow tint so authored earth/grass washes survive.
  Scope: `assets/art/m1/terrain-ink-v1`, `assets/manifest.json`, renderer `art.ts`
  and `terrain-material.ts`; unrelated dirty route/docs preserved. Focused web
  typecheck, content validation, production build and lint/format passed. Independent
  source/raster critic found no established defect, but current integrated views
  and movement remain NOT_RUN after expired login and rejected test sign-in.
  Explicit sign-in/trip approval pending. Remaining five materials, full visual
  acceptance and candidate performance NOT_RUN/NOT_MEASURED; no merge/deployment.

### Added

- 2026-10-05, branch `codex/map-topology-experiments`, local (started 2026-10-04): owner-requested
  implemented comparison of square and six-neighbor hex navigation over the same
  exact geometry, roads and speed policy. Static road-edge costs and surface
  priority preparation are retained per field. At this stage, production kept
  square search and hex was opt-in; the later owner decision under Changed
  supersedes that default. Persisted V2/V3 plans remain unchanged.
  101 cases × 3 interleaved repeats: optimized square keeps 297/297 successful
  paths/durations, p95 175.96→100.09ms; hex p95 90.96ms but mean/worst travel
  duration +1.32%/+9.32%. Adds the finite reproduction script and measured case
  evidence; extends existing road-detour/thin-bridge specifications.
  [Owning results and limits](docs/wiki/m1-spec.md#эксперимент-и-реализация--2026-10-04).
  Final bootstrap PASS (verify 631/47 skipped, stress 10000, migrations/auth 14);
  separate movement PostgreSQL 11 and domain 20 PASS. Move/STOP/reload/reroute
  inspected independently from captures/response evidence; no confirmed new
  navigation defect. Historical failed attempts/limits remain in the owning page.
  Adds `experiment:navigation` in package.json. No migrations, deployment or
  merge; local uncommitted isolated checkout only, primary writers preserved.

- 2026-10-04, originating branch `main` at `bcc30f5`, local: owner-requested
  [global-map topology research and proposal](docs/wiki/m1-spec.md#19-гексы-устройство-глобальной-карты-и-генерация--2026-10-04)
  compares hex authoring, exact movement, terrain blending, current weighted
  search and future generation using current source and primary references.
  Recommends keeping continuous movement/exact roads and measuring search before
  changing topology; updates `CURRENT_PLAN` and wiki log. 100-goal source probe:
  98 paths/2 blocked goals / 0 errors, p95 1014.78ms under concurrent local builds;
  isolated performance/hex benefit NOT_MEASURED, game tests/browser/critic NOT_RUN.
  Documentation readback, local links and scoped diff checked. Changes are only
  in an isolated documentation checkout due to primary shared-file writers;
  NOT_INTEGRATED, uncommitted/unpublished. No game or save changes.

- 2026-10-04, originating branch `main`, local: owner-requested
  [terrain art specification](docs/wiki/terrain-art.md) for fields, marshes and
  roads coherent with existing ink town/village art. Defines shared inspected
  references, ten target materials, transitions, road-direction constraints,
  staged production and integrated visual/gameplay acceptance. Preserves the
  owner's example under `docs/wiki/references/`; updates wiki navigation/log and
  `CURRENT_PLAN`. Production details and numerical targets remain proposals.
  Documentation readback, links, formatting and scoped diff checked; new textures,
  game/runtime acceptance NOT_RUN, performance NOT_MEASURED. No publication/merge.

- 2026-09-29, #125: fallow (`pnpm check:dead-code` in `pnpm verify`,
  `pnpm check:changes` on pull requests, `pnpm report:quality`) and ast-grep
  code-shape rules with rule tests (`pnpm check:patterns`).
- 2026-09-29, #128: `pnpm test:coverage` (v8, no threshold) as evidence for
  `fallow health --coverage`; specifications for encounter HTTP authorization,
  the encounter command guard and duty-change learning settlement.

- 2026-09-29: `pnpm agent:status` prints live main, CI, open pull requests,
  active unmerged branches with their paths and the next migration number from
  git and gh, replacing hand-written status readback.
- 2026-09-30, #133: Git `pre-commit` and `pre-merge-commit` hooks run
  `pnpm check:changes` for every agent and terminal, not only Claude; Markdown-only
  commits skip. `pnpm install` (or `pnpm run prepare` in an existing clone) sets
  `core.hooksPath`, and `pnpm agent:preflight` reports it. Codex rules prompt on
  `git commit --no-verify`.

### Fixed

- 2026-10-05, originating branch `codex/component-forest-integration`, merged:
  [PR146](https://github.com/Vovanostm/warwrit/pull/146), reviewed `2ed5f08`,
  merged as `917644a`; supersedes pending entries below. Dark map art, composed
  trees, grounded contacts, alpha picking and labels retain main roads/supplies/
  unmasked routes. PR CI37234733636 SUCCESS: bootstrap628/47 skipped,10000 battles,
  migrations/14 PostgreSQL checks, coverage and unchanged audit. Primary main
  updated; both histories and five local terrain-ink slots preserved, restore
  conflicts resolved and recovery retained. Main push CI37235532971 IN_PROGRESS.
  Bounded critic approval; combined-route recapture/post-merge browser refresh
  NOT_RUN after URL-policy rejection. Local drafts remain outside PR art acceptance.
  [Owning result/limits](docs/work-packages/M1-FREE-MOVEMENT.md#component-forest-merged-closeout--2026-10-05).
  Primary typecheck/content92/format/diff PASS; Airtable checkpoint read back.
  Empirical event FAILED (storage limit), recorded in owning closeout.
  No migration, player-data reset, deployment or full-M1/performance claim.

- 2026-10-05, branch `codex/component-forest-integration`, published PR146:
  integrated newer main `4a82c36` (merged PR145) after concurrent route delivery.
  Preserved full unmasked route/goal annotations and both dated documentation
  histories; resolved only the React import and changelog insertion conflict.
  Final PR-head CI remains required. Browser refresh/capture via the in-app tool
  was blocked by its URL policy; no alternate browser workaround attempted.

- 2026-10-04, branch `codex/component-forest-integration`, local: owner-requested
  dark-fantasy map correction ports approved original terrain/settlement art and
  composed trunk/crown trees onto current main relief. Entrance/root pivots,
  alpha-aware targets and measured labels preserve a shared isometry and natural
  contacts. Scope: web map renderer/labels, original map-dark assets/provenance
  and manifest; roads, supplies, visits and canonical movement retain current main.
  [Owning integration](docs/work-packages/M1-FREE-MOVEMENT.md#component-forest-integration--2026-10-04)
  records actual checks and limits; exact-head PR CI/merge pending.

  Independent source/playable critique and native journey/input pass; original
  audit regressions corrected by bounded assembly/projection/measurement helpers
  and shared deterministic hash/obstacle primitives. One meaningful assembled-tree
  geometry regression added; final coverage628/47skip and audit pass. Exact-head
  PR CI/merge pending; primary concurrent drafts/writers preserved.

- 2026-10-05, originating branch `codex/route-visibility-fix`, merged:
  main push CI37233985843 completed SUCCESS at `4a82c36`, superseding the
  in-progress status below. Live remote main, origin/main and primary main match;
  route files have no local diff. Dev5293 restored the retained company (800
  crowns); readiness and documentation format/diff checks passed. Unrelated
  local terrain/art/wiki/skill work remains preserved. No deployment.

- 2026-10-04, branch `codex/route-visibility-fix`, merged:
  [PR145](https://github.com/Vovanostm/warwrit/pull/145), reviewed head `988eea2`,
  merged as `4a82c36`. PR CI37233180326 passed full bootstrap627/47 skipped,
  10000-battle stress, migration smoke/14 PostgreSQL checks, coverage and audit.
  This supersedes the local/pending entries below. Primary main updated to
  origin/main; scoped documentation restore retained both histories and all
  unrelated terrain/art/wiki/skill work. Main push CI37233985843 is in progress;
  dev5293 and player data retained. Actual merge/results are recorded in
  [the owning closeout](docs/work-packages/M1-FREE-MOVEMENT.md#route-visibility-merged-closeout--2026-10-04).

- 2026-10-04, branch `codex/route-visibility-fix`, local: owner authorized
  publication and merge of the reviewed route visibility correction. Isolated
  delivery includes only the three map files and owning movement/checkpoint/
  changelog records, preserving unrelated terrain/art/docs and retained player
  data. Clean PR CI/publication/merge pending; scoped source and playable results
  are recorded in [the owning contract](docs/work-packages/M1-FREE-MOVEMENT.md#route-visibility-delivery--2026-10-04).

- 2026-10-04, branch `main`, local: owner-authorized normal-UI testing now
  supersedes the permission-pending route correction status below. Town/village
  paths and complete site/ground diamonds were inspected at day/night and
  close/overview scales; S and arrival clear annotations, and reload restores
  the moving route with map art loaded. Independent moving-capture critique found
  no material defect, including the corrected settled-reload capture. Final return
  arrived in Kamenny Brod with overlay cleared; retained company has 800 crowns.
  Existing focused source checks apply to unchanged code; full gate NOT_RUN.
  [Actual journey and limits](docs/work-packages/M1-FREE-MOVEMENT.md#playable-verification-after-owner-authorization--2026-10-04).

- 2026-10-04, branch `main`, local (not committed or published): owner screenshots
  exposed cropped destination markers and missing route sections near settlements.
  Removed SVG clipping by full settlement sprite rectangles, including transparent
  margins; route annotations stay above the map while terrain-draped geometry,
  party junction, label avoidance and input remain unchanged. Affected paths:
  `ContinuousMapCanvas.tsx`, `renderer/route-overlay.ts`,
  `renderer/continuous-map-scene.ts`. Web typecheck, scoped ESLint/Prettier and
  diff checks passed. Live DOM has no route masks and retains `pointer-events: none`.
  Moving visual acceptance is pending permission to move the retained company;
  independent source critique confirmed the fix's cause/scope; no current moving
  visual verdict, new full gate, publication or merge. See
  [route visibility correction](docs/work-packages/M1-FREE-MOVEMENT.md#settlement-route-visibility-correction--2026-10-04).

- 2026-10-04, `codex/supplies-delivery`, merged: [PR144](https://github.com/Vovanostm/warwrit/pull/144)
  merged as `bcc30f5`; this supersedes the published status below. Final-head
  CI passed bootstrap, stress, migrations, coverage and changed-code gates.
  Primary main updated; main push CI37213517376 also passed. Unrelated owner
  drafts/skills and player data retained.

- 2026-10-04, branch `codex/supplies-delivery`, published (not yet merged):
  supplies can be bought through the local bazaar/granary with finite merchant
  stock, exact cash and retained retry receipts; future companies start with
  thirty rations and 800–850 crowns after hiring. Opening forms survive definitive
  rejection and refresh expired options before new requests. The proportionate
  party sprite, terrain-grounded ring and draped route share their foot junction.
  Independent review corrected legacy first-POST initialization, remote-cash
  quotes, carried ration ownership, malformed pending purchases, incomplete
  receipts and GAME_OVER purchase controls. A new ordered 0014 migration retains
  shop state and refuses destructive rollback. Scope: company core/protocol/server,
  web opening/shop/map and party art; owner request and actual checks/limits are in
  [M1-SUPPLIES](docs/work-packages/M1-SUPPLIES.md#delivery-amendment--2026-10-04).
  Local verify627/47 skipped, coverage/audit and sequential PostgreSQL17 checks
  passed; independent source/visual critique found no remaining material defect
  in inspected evidence. Final PR CI/merge pending; expired-form browser creation
  remains NOT_RUN. Existing saves and unrelated drafts are retained.

- 2026-09-29, #128: combat initiative ties, AI targets and canonical replay order
  no longer depend on the host locale (`compareCodeUnits`); stress digest
  unchanged for existing ids.
- 2026-09-29, #128: CI now runs the encounter and OIDC PostgreSQL specifications
  in `pnpm test:migrations`; they were skipped because only `DATABASE_URL` was set.

### Changed

- 2026-10-05, branch `codex/map-topology-experiments`, local committed:
  integrated main `548837c` (PR147) with current trees and route visibility,
  preserving both histories in three documentation conflicts. Navigation source
  remains reviewed. Combined build/typecheck and normal desktop fixture
  move/STOP/reload/reroute/arrival PASS with exact retained points; current-head
  full PR CI and merge remain pending. No migrations, deployment or player-data reset.
  [Owning integration results and limits](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, local: final review fixes
  changed-code audit blockers by separating grid preparation and bounded exact
  shortcut selection and sharing the identical legacy span-duration rule in
  `continuous-movement.ts`. Independent revision review found no defect;
  202 exact route/outcome/duration comparisons, 22 focused coverage tests and
  unchanged audit PASS. Earlier loaded-host timeouts remain documented failures;
  PR-head CI and integrated browser acceptance are pending.
  [Owning delivery record](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner authorized
  review, publication, merge and local-main update for the measured hex default
  and routing optimization. Preserve current main's renderer improvements and
  concurrent primary drafts; final review/PR CI/merge remain pending.
  [Delivery checkpoint](docs/engineering/CURRENT_PLAN.md).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner chose hex
  search speed after disclosure of measured ≤7.2% longer trips. New polygon-v1
  orders default to hex; legacy grids and frozen accepted V2/V3 plans remain.
  Compile sorted neighbors/exact costs once and check ≤16 exact terrain-detour
  candidates before accepting direct smoothing. Eleven of 99 hex routes improve,
  none regress against previous hex; case 51 saves 22.85s. Matched 101×3 typical
  search 29.61→27.24ms, p95 essentially unchanged 219.85→217.97ms under variable host
  load. Updates existing movement specs to public exact-surface queries and adds
  a two-topology terrain regression. Core/tests/experiment and owning docs only;
  no migrations, publication, merge or deployment. JSON spec 3.5.1 records the
  owner decision with historical topology retained. Final bootstrap: 633 tests,
  47 skipped, 10,000 stress battles and migrations/14 DB checks PASS; normal STOP/reload/reroute/arrival
  and independent supplied-evidence critique pass within inspected scope.
  [Results, checks and limits](docs/wiki/m1-spec.md#почему-гексы-и-оптимизация-маршрутов--2026-10-05).

- 2026-10-04, branch `codex/supplies-playtest`, local (not committed or merged):
  [AGENTS.md](AGENTS.md#required-changelog-and-change-awareness) requires agents
  to record substantive changes and their reasons in this changelog before
  closeout/commit/publication, and read incoming entries with `CURRENT_PLAN`
  after resuming, changing branches or integrating changes. Owner requested
  this to prevent agents from confusing branch-specific work and missing new
  decisions. Entries identify affected paths, delivery status and source links;
  integration preserves both branches' history. This entry covers only the
  instruction change and changelog format clarification. Verification: scoped
  diff, readback and local link check; game tests `NOT_RUN` (documentation only).
- 2026-09-29: local containers run on colima; see
  [LOCAL_DEVELOPMENT.md](docs/engineering/LOCAL_DEVELOPMENT.md#container-runtime-colima).
- 2026-09-29, #125: seven internal-only game-core exports removed; `ajv` and
  `fast-check` declared by testkit, which imports them.
- 2026-09-29, #128: encounter routes authenticate in one encapsulated Fastify
  hook; `protocol` owns the encounter id format.

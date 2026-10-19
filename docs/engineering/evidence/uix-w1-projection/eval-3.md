VERDICT: ACCEPT

Independent bounded F3 evaluation, 2026-10-19. **F3 resolved; no remaining in-scope defect or missing acceptance proof.** This accepts the local #180 candidate and its evidence only; publication, PR/CI, shared-document closeout and owner-approved merge remain separate coordinator steps. `eval-2.md` remains unchanged history.

## Authority and exact inputs

Read repository AGENTS.md, current `contract.md` and `eval-2.md` in full; read live #180 body/comments and #217 body/decisions using `gh issue view ... -R Vovanostm/warwrit`. D1 permits `threat-not-available` without changing admission and limits privacy proof to the existing all-visible lab. The latest split leaves only #180 here; #184/#187/#207 remain downstream. Read the Warwrit context/review and Playwright skills, current checkpoint/changelog, coordinator `integration-result.md`, complete comparison script and relevant underlying logs. No Orca commands, source/ref changes, tests added, shared-document edits or subagents.

Direct Git readback before review and after the smoke:

- Source-after: `/Users/vovanostm/orca/workspaces/warwrit/uix-w1-projection`, branch `Vovanostm/uix-w1-projection`, HEAD `fa7f51662bd0fa0042467a77340171aa796aae71`.
- Source-before: sibling `uix-proof-baseline-8486177`, HEAD `84861773b58548ae0817c1a2c322ae8d8d5a2a19`.
- Clean integration checkout: sibling `uix-proof-candidate-fa7f516`, HEAD `fa7f51662bd0fa0042467a77340171aa796aae71`.
- All three tracked trees clean. Source delta still exactly the eight contract-owned core/protocol/projector/validator and matching-test files recorded in eval2. Bootstrap, stress runner, replay implementation and gate configuration are unchanged by this delta. Graph inventory indexes another Warwrit checkout/old HEAD, so actual files/Git are the proof. Readback: `eval-shots/f3-environment.log`.

## F3 — resolved by paired comparison and integrated gate

**Criterion:** #180 AC3 and contract Proof require unchanged source-before/source-after replay/stress results, plus the existing final integrated gate. **Prior completion counterexample:** eval2 had passing source/live checks but the coordinator comparison was NOT_RUN. **Affected boundary:** delivery evidence for replay compatibility and deterministic combat, rather than a reproduced source defect. **Smallest completion:** coordinator supplies the existing comparison/gate and independent evaluator reads it back; no builder change is needed. That completion now exists and was independently checked below.

Evidence root: `../pipeline-coordinator/.orca/pipeline/ticks/20261019T0246/`.

### Integrated execution

`after-clean-bootstrap.log` corroborates coordinator-reported **bootstrap EXIT0** in the exact clean candidate checkout. Inspected unchanged `scripts/bootstrap.sh`: `set -euo pipefail`, frozen install, disposable PostgreSQL, then verify → stress → migrations, with exit-preserving cleanup. The log reaches `Warwrit clean-checkout verification passed.` and shows removal of its container, network and volume.

- Verify completes format, lint, architecture, dead-code, patterns, content, build and typechecks; content reports 114 assets. Unit results: **833 PASS / 47 SKIP**, 119 passed files / 7 skipped files. Existing warning output is retained; skipped tests are not passes.
- Candidate stress: **10,000 battles, 20 deterministic reruns, 100 replay checks**, successful result.
- Migration smoke/up succeeds with no pending migrations; real PostgreSQL encounter/auth integration: **14 PASS / 2 files**.

These are coordinator executions, not heavy checks rerun by this evaluator. The complete success log, unchanged fail-fast script and recorded exit agree; green execution alone is not the paired-result proof.

### Stress equality

Parsed original `before-stress.log` and the stress event in `after-clean-bootstrap.log` directly, checked each against `stress-comparison.json`, and deeply compared every field after removing **only `durationMs`**. PASS:

- event `combat.stress`, status `ok`, battles 10,000, deterministicReruns 20, replayChecks 100;
- totalCommands **1,302,384**, maximumCommands **327**, maximumRounds **33**, totalRandomDraws **928,250**;
- outcomes **alpha 4,851 / beta 5,149**;
- existing runner digest **f7bb681656b7dae479d5315dcdcf4ee8dfc01250ec33a23cb0b4568b556abbae** matches. No new hash/manifest was computed.

Excluded measured duration: before **30,822ms**, after **29,639ms**. No performance claim follows.

### Saved-command replay equality

Read `replay-comparison.mts` and `saved-before-replays.json`. Save mode imports the baseline's source index, creates legal setups, autoplays to resolution, saves its exact setup/commands, and verifies replay canonical state against that baseline played state. Compare mode reads those saved commands and baseline results, imports candidate source and replays the saved inputs; it does not generate replacement commands or regenerate expected candidate results. It compares canonical serialization, the **entire event arrays**, and `commandsApplied` deeply.

Independently loaded all three JSON inputs (saved commands, before results, after results), checked 15 entries and full deep equality, then replayed each unchanged saved command stream through the actual source exports of **both exact checkouts**. Each freshly computed complete result deeply equals its saved result; every accepted count equals that stream's saved-command length. No fixture/result file was written. `replayCombat` includes initial events plus all accepted-command events and throws on a rejected command; this is not an outcome-only or selected-event comparison.

Seeds in each row are **1 / 42 / 20261009**, respectively:

| Replay schema / ruleset | Saved = accepted commands | Full event counts, equal before/after |
| ----------------------- | ------------------------- | ------------------------------------- |
| 1 / sprite-prototype-v1 | 28 / 20 / 26              | 75 / 67 / 66                          |
| 1 / sprite-prototype-v2 | 28 / 20 / 26              | 75 / 67 / 66                          |
| 1 / sprite-prototype-v3 | 28 / 20 / 34              | 76 / 64 / 84                          |
| 2 / m1-domain-bridge-v1 | 24 / 16 / 26              | 64 / 52 / 72                          |
| 2 / m1-domain-bridge-v2 | 24 / 16 / 26              | 64 / 52 / 72                          |

Totals: **15 cases, 362 saved/accepted commands, 1,016 complete events**, with equal canonical state in every case. Independent direct readback: `eval-shots/f3-comparison.log`; original successful executions: coordinator `replay-before-retry.log` / `replay-after.log`.

**Limit:** these are finite generated saved cases (small two-unit sword/shield battles), not a discovered historical replay archive and not exhaustive proof of all setups, weapons, skills, RNG seeds or possible replay streams. Schema1 sprite v1/v2/v3 and schema2 bridge v1/v2 are represented; no schema3 is invented. This limit is retained, not silently promoted to archive recovery or universal compatibility.

### Preserved runner failures

- Coordinator `after-bootstrap.log`: original **EXIT1**, 48 lint errors from ignored evaluator `eval-shots/*.js` snippets in this working environment. The unmodified gate was rerun in the clean persistent candidate checkout. The failure remains a contaminated-runner failure; it is not erased or described as a tracked-source defect. No lint exclusion or threshold change appears in the candidate delta.
- Coordinator `replay-before.log`: original baseline `InvariantViolation: S4 traits require sprite-prototype-v2`. The first evidence fixture incorrectly included S4 `moralePolicy` on sprite v1. Current script supplies that trait only on sprite v2/v3; the legal v1 fixture passes on baseline before being compared. The original rejection is retained as a corrected evidence-fixture failure, not a product replay failure, golden rewrite or weakened gate.

## Fresh short live smoke

Started only my `pnpm dev:combat` at API **23845** / web **25845**, initially free, and opened isolated headed Playwright session `uix-f3-eval`. Used normal **Начать бой**, unchanged «Развалины мельницы», seed20261009, 12 fighters, 165 cells. A passive response observer forwards the real fetch unchanged; no mocks, request headers/capabilities retained, API order bypass or editor changes.

- Settled first human bow activation: **revision4**, actor human-3, 4/4AP, `attackPreview:[]`, exactly six actual `out-of-range` refusals for opponent1–6, distances **5/7/9/11/12/14**, minimum1/maximum4. `f3-start.log`.
- Hovered/clicked a wolf forecast entry, focused canvas, Escape/Home/W, night then day. Passive result: **0 action POST, revision4 only**, same refusals. `f3-passive.log`.
- Clicked normal **Завершить ход**. Exactly **1 action POST**; accepted activation-ended/started events at **revision5**, actor human-3 → human-6. `f3-command.log`.
- Console: favicon404 only, zero warnings, no Babylon/runtime exception. `f3-console.log`. This short smoke is not another full battle completion or renewed visual acceptance.
- Closed only session `uix-f3-eval`; interrupted only my runtime exec session (exit130). Final lsof: no listeners on23845/25845. Baseline/candidate evidence worktrees and other workers' runtimes were untouched. Launcher log: `f3-dev.log`; final readback: `f3-environment.log`. The CLI wrapper initially lacked execute permission; invoking it through bash succeeded, with no permission/source change. CLI-created initial snapshot/console artifacts were relocated into owned `f3-*` evidence paths.

## Exact evidence reused from unchanged eval2

No repeat of its expensive captures, tests or terminal journey:

- **F1 remains resolved:** `eval2-boundary.log` real-module `isCombatLabView`/`readSessionView` probes reject `{}`, string and null attackPreview combined with a valid refusal as false / invalid view, without throwing; valid current/old/omitted wire passes. Representative underlying log read back here.
- **F2 remains supplied:** all **24** `eval2-{before,after}-{1366x768,1440x900,1920x1080}-zoom{100,125}-{day,night}.png` captures and `eval2-matrix.log` / `eval2-matrix-summary.log`, with native visible125% setting/readback and reset. Actual outer window1440×888 throughout; named dimensions are content viewports at100%, not physical native-window claims. Native125% inner sizes1093×614,1152×720,1536×864/DPR1.25; pairs retain revision4/POST0. Summary/settings log read back here. No claim of changed visuals or new visual-critic verdict.
- **Source/live PASS retained:** eval2 independently reviewed all eight source files, ran 17 public projection/session tests, exercised field/queue wolves, visible keyboard focus, camera, accepted move and mouse/key end-turn, then actual UI autobattle completion at **round9/revision160/human victory/74POST**. `eval2-terminal-result.log` confirms that terminal result; terminal passive inspection remained stable. Existing coordinator validate8/8, related702PASS/47SKIP/audit8filesPASS is reused, not rerun.

## Remaining boundaries and closeout

No remaining #180 finding requiring source work or coordinator acceptance proof. **NOT_RUN here:** full verify/stress/migrations, coverage/audit or screenshot-matrix reruns, publication, PR/CI, merge/deployment; **NOT_MEASURED:** performance, capacity and balance. No real fog-of-war or downstream refusal wording/affordability/skillReach/naming acceptance is claimed.

Only this report and small `eval-shots/f3-*` evidence are evaluator-owned outputs. CHANGELOG/CURRENT_PLAN/wiki remain coordinator-owned pre-merge work, as the live workflow explicitly records. Proposed coordinator status: F1/F2 retained at unchanged fa7f516; F3 independently resolved by clean bootstrap, exact stress comparison and 15 unchanged saved replay streams; local #180 evaluation ACCEPT, publication/CI/merge pending. No commit/push/external write occurred.

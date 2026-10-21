VERDICT: ACCEPT 63ce897e7523eb0946eab91a58ed781444f07ef6

# Independent Tier L evaluation — round 2, 2026-10-21

No reproduced in-scope source/test defect, unmet Tier L acceptance criterion,
rule/privacy/replay violation, or unauthorized implementation edit remains.
This is local source/player acceptance for #249, not CI, publication, merge,
deployment, balance approval or full-M1 acceptance.

## Source and authority

Read AGENTS.md; full contract/report/review-1/eval-1; #249 body/comments;
merged `docs/engineering/evidence/core-bow-lab/{README,evaluation,review}.md`;
and the warwrit-review/playwright skills. The epic217 contract is absent;
no replacement was fabricated. The accepted product decisions in the contract
were used without reopening design. The graph indexes another checkout/older
HEAD, so actual source and ordinary diffs were used.

Reviewed full `origin/main...HEAD`, including projection5/version pairing,
strict aggregate/member/save guards, physical reprojection, tactical practice,
owner-only grants, saved-version command/AI/replay dispatch and terminal guards.
Only new wolf admission selects V5; existing active and raider versions retain
their prior selectors. Core combat/lab/protocol/web implementation has no new
delta. Costs remain core-owned. Unknown/mismatched bindings remain rejected;
no new private projection or client legality rule was introduced.

The round-two `6109930d..482f8daa` change correctly fixes the regression's explicit
wolf revision read and prepares the bow leader's archery through the public
CreateCompany opening preparer. Other fighters retain swords and use native
waits. Production terminal guards were preserved. The normal author audit,
coverage and commit claims were inspected as author claims, not substituted for
this evaluation.

Initial clean committed HEAD: `482f8daaedd4bbd7269c4b4617617409303eed39`.
The later delta to the verdict SHA contains only CHANGELOG.md and CURRENT_PLAN.md;
source/tests are unchanged. Retained `e68025b9` and main `d8a04196` are ancestors.
Production/test changes stay within assigned ownership, including terminal-only
contracts executor validation. Retained/coordinator documentation deltas were
not rewritten or attributed as a new worker ownership violation. No migration,
dependency, released replay fixture or version ID was changed by this evaluator.

## Isolated environment and first required check

Created only PostgreSQL17 container `warwrit-bow249-eval2-482f8daa`, ID
`166a3bb5b9afb178f36b8526e448f07da5b7de4506102ddcda72faf01010c046`.
Before writes, Docker mapping and native SQL verified PostgreSQL17.11,
`bow249_eval2` database/user, **127.0.0.1:32779 → 5432**, and zero public tables.
Applied the repository's 14 existing up migrations to that empty database:
PASS, pending none (`eval2-migrate.log`). No migration suite or retained/shared
DB writes occurred.

The first test execution was exactly the requested filtered command with
WARWRIT_ENCOUNTER_DATABASE_URL pointing to that database:

```text
pnpm exec vitest run apps/server/src/encounters/postgres.integration.test.ts -t 'freezes bridge v5'
```

**1 PASS / 23 filtered SKIP**, including its complete native terminal/effects/
proof/retry assertions (`eval2-pg.log`). This independently supersedes the old
regression failure for current source; all older failed logs remain intact.

Fixtures reuse ordinary existing producers: synthetic identity/session and
ownership; existing item identities, leader-only two-hand bow/shield stowage;
opening-generated archery; wolf objective location and ordinary supplies.
They do not prove external OIDC, onboarding, acquisition or travel. The final
runtime fixture additionally uses makeFirstHuntJoinActor's existing carried-ration
option (3 rations per company), before admission. No encounter setup/state,
journal, grant, policy, response or version was injected or relabeled.

## Rendered persistent day and night journeys

Ordinary authenticated wolf GET/JOIN admitted encounter
`2aa319a8-ff5d-49a2-ab1b-2f541c409682`, saved bridge-v5 and six projection5
participants. Other owned activations were advanced by legal requests and
hostile AI through its existing executor. Both complete rendered journeys used
1440×900, native day/night controls, actual cell hover/click, Переместиться,
visible hostile selection and Атаковать. Browser mesh projection was used only
to locate rendered ground for mouse input; the accepted move came from the UI.

| Journey | Actor / activation                                                                | Native move → shot revisions | Commands                                                                        |
| ------- | --------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Night   | `5a7e6e03-680c-43ce-bac7-8e09c4bea7f4` / `1:5a7e6e03-680c-43ce-bac7-8e09c4bea7f4` | 8 → 9                        | `b1a58a92-12c2-450f-951f-b50a22d5a43e` → `18b72501-6dae-49b2-b13a-cd80d2c6bc3b` |
| Day     | `8fe9dacf-8cb7-4ea2-849c-8438654fbb25` / `1:8fe9dacf-8cb7-4ea2-849c-8438654fbb25` | 13 → 14                      | `c71e492c-12c0-45f6-b6f9-31b907e9049f` → `50620d2d-a5ed-4f61-a764-8128e6799a7a` |

Each independently starts at4 AP, moves for1 AP/4 stamina, then shoots for
3 AP/16 stamina in the same activation. Ordered native prefix replay proves
**4 → 3 → 0 AP; 80 → 76 → 60 stamina** for each. These are two actual full
activations, not one activation toggled between lighting modes. Both shots target
`world.wolf.bereznyak.03`. See `eval2-persistent-prefixes.json`,
`eval2-night3.json`, `eval2-day9.json`, and their logs.

Own screenshots under `eval-shots/`:
`eval2-night3-{before,step-preview,shot-preview,after}.png` and
`eval2-day9-{before,step-preview,shot-preview,after}.png`.
Inspected the images: AP, stamina, path cost, target/forecast and controls are
readable at1440×900 in both lighting modes; required inputs are unobstructed.
The native shot previews show3 AP/16 stamina and the actor's3 AP. No Tier V
close-view/layer work or separate visual critic was used.

## Lawful refusal

A later supplied2 AP move in the same native battle leaves2 AP. Core's native
query reports INSUFFICIENT_ACTION_POINTS for the attempted hostile attack.
The authenticated request returns400 / rejected INVALID_COMMAND; complete
encounter row (including RNG), ordered commands and receipts compare unchanged.
No rejection receipt is added. Native tactical attacks are empty. In the browser,
Атаковать is disabled, ОД2 and «Сейчас недоступно» are visible; ended the turn
through normal input. Evidence: `eval2-refusal.json`, `eval2-refusal.log`,
`eval-shots/eval2-refusal-2ap.png`, `eval2-refusal-ui.log`.
No2 AP state was manufactured. The15-stamina refusal is separately **test-only**
proof from the focused sprite tests, not a claimed persistent15-stamina journey.

## Saved V5 restart and supported terminal

A separate fresh ordinary V5 encounter
`f375ed34-0105-4d58-b206-36d2684d2287` also accepted a rendered step/shot.
Saved its actual rows/roots/commands at revision12; stopped evaluator process46502
and started distinct current-source process47657 against the same DB.
Active lookup returns the same encounter. Saved setup, admission and company
bindings, all projection5 identities and the recorded command prefix remain
unchanged; replay verifies. One ordinary later wait is present at revision13,
not disguised as frozen state. Exact original browser shot retry matches its
single stored receipt. Evidence: `eval2-before-restart.json`,
`eval2-restart.json`, corresponding logs and runtime-day8/restart logs.
This was a real process restart, not merely opening another DB connection.

The carried-supply day/night battle was then completed using actual legal
commands with the existing tactical chooser technique from the author regression.
At revision60: company victory; **all three wolves dead**, one company fighter
dead, no unsupported hostile retreat/surrender. Full saved replay verifies.
The existing target transaction processor applied terminal effects, producing
one proof claim, one FIRST_HUNT_TERMINAL receipt per company and one completed
binding per root; both active bindings clear. Repeating that processor and the
original browser shot returns its exact accepted receipt and leaves complete
roots/company receipts/proof rows unchanged. Evidence: `eval2-finish.json`,
`eval2-carried-finish2.log`, `eval2-carried-terminal-target.json`,
`eval2-settlement.json` and `eval2-settlement.log`.
This supported terminal is fresh evidence, not the historical hostile-retreat case.

## Genuine old-active compatibility

Archived **unchanged `d8a04196:apps/server/src`** under an evaluator-only directory;
its ordinary server admission genuinely created bridge-v4/projection4 encounter
before the current server loaded it. Current public core retains the unchanged
released V4 implementation. No saved record/version was rewritten.
Stopped old process55630, started distinct current-source process56394 on private
ports24259/24260. Active lookup, identical saved setup/command prefix and replay
pass. Native continuation quotes and accepts **4 AP/16 stamina** for the bow.
Legal waits/hostile wakes advance intervening turns. Evidence:
`eval2-old-{join,plan,continuation}.json`, old/current runtime logs and
`eval2-old-continue{,2}.log`. Both continuation helpers eventually passed; neither
pass represents an old-process-only continuation. Archived duplicate source was
removed after proof; its exact Git source remains available.

## Default mill lab regression and finite checks

`bash scripts/orca-play.sh start`: READY on25244/API23244. Entered the default
mill through its real editor and started a battle. Rendered(3,5) selection →
1 AP/4-stamina move → Wolf1 preview →3 AP/16-stamina ordinary shot, separately
in day and in a newly started night battle. Used normal end-turn and autoplay.
The night mill finished with **round7 human victory**. Downloaded140-command
replay matches full canonical state/RNG; its native opening commands share
`1:human-3`, AP4→3→0, stamina100→96→80. The separate day download also verifies.
Evidence: `eval2-lab-{day,finished}-replay.json`, associated readback JSON/logs,
`eval-shots/eval2-lab-{day,night}-{before,step-preview,shot-preview,after}.png`,
and `eval2-lab-finished-{day,night}.png`.

Fresh serial finite checks: bow-compatibility, order-compatibility,
sprite-prototype, skills and encounter access: **5 files /61 PASS**
(`eval2-finite.log`). This includes all seven unchanged released bow baselines,
ordering/replay sentinels, AP/stamina refusal and aimed-shot4 AP/24 stamina.
No duplicate validator, full verify/coverage/stress/migration suites ran.
Coordinator final integrated gates, hosted CI and delivery remain **NOT_RUN here**;
balance/performance remain **NOT_MEASURED**.

## Failed attempts and limits retained

- Early CLI imports/destructured run-code arguments, stale refs and target-marker
  clicks failed. Several live turns timed out/entered AFK. Those captures/logs
  are attempts, not the accepted day9/night3 proof. UI selection after a move
  needed explicit hostile selection and a current enabled action before capture.
- Some helper attempts used a stale choice after a failed plan, or were rejected
  during live turn advancement. Their logs remain; no rejected request is counted
  as the successful rendered move/shot. Earlier script-selected prefixes remain
  distinguishable from the final native commands above.
- The earlier all-wolves-dead V5 battle had warehouse supplies rather than carried
  rations. Terminal processing correctly stayed pending. A read-only diagnostic
  copy isolated food preparation at receipt11/tick1002: INSUFFICIENT_ITEMS
  (`eval2-terminal-diagnosis.json`). This is invalid runtime-fixture provisioning,
  not a claimed source defect or terminal PASS. The first diagnostic invocation
  also failed because it selected nonexistent admission company fields; corrected
  by reading native binding company IDs. No encounter was repaired in place.
- The first carried finish helper asserted against an undefined response.status;
  that response was not retained and its cause is **NOT_ESTABLISHED**. A subsequent
  legal continuation completed, with fresh native terminal proof above. The failed
  `eval2-carried-finish.log` and successful `eval2-carried-finish2.log` both remain.
- Initial old-source startup lacked workspace dependency resolution; a local
  node_modules link fixed that environment attempt without editing archived code.
- The first detached lab launch later stopped answering. A second wrapper start
  returned READY and was held by an attached evaluator session. No wrapper start
  returned exit3. The autoplay40-second wait timed out; later native readback
  showed actual round7 victory and the final capture/download was taken then.
- Existing favicon404 and automation/transport console attempts are retained in
  browser logs; no gameplay source error was established from them. Browser CLI
  console.log did not persist native response objects, so command/receipt claims
  use independently read durable rows and downloaded replays instead.

## Cleanup and handoff

Closed only browser session bow249-eval2; ran `bash scripts/orca-play.sh stop`:
STOPPED. Stopped only evaluator servers51048/56394, web34116 and the attached
lab tail. Final listener readback is empty on23244/25244/24249/24250/24259/24260/ 26249. Removed only the named disposable container and anonymous volume; exact
container-filter readback is empty. Removed all eval2 private session files,
private npm cache and archived source. Browser artifacts generated this round
were retained under `eval2-browser-artifacts/`; earlier evidence was preserved.

No refs, source, tests, repository fixtures, policies, old evidence, shared records or external
issue state were changed. This report is the requested documentation closeout;
coordinator owns shared records/wiki, CI/publication and any merge authorization.

# Harness evaluation

## Changed-document formatting and historical CI evidence — 2026-11-05

The owner requested more harness improvements and new ideas. Source is the
completed documentation CI41999841171, the current workflow/validator, independent
source inspection and live PR353 observations. Branch `codex/harness-docs-format`
owns this support slice. The game writer's source, checkpoint and saves remain
separately owned. [Issue357](https://github.com/Vovanostm/warwrit/issues/357)
tracks its authority, acceptance and final hosted observations.

The first hosted documentation job passed in95s. Its whole-repository Prettier
step ran from09:08:49.7499238 to09:09:26.2169023 UTC, about36.5s. That checks many
unchanged files although the accepted documentation route already identifies
existing changed Markdown. Reuse `orca-validate.sh` after the pinned frozen
install, enabling the existing Corepack pnpm shim. It supplies scoped format,
clean-tree/scope/plan checks and existing bounded failure diagnostics.

Independent assessment found a baseline race in a direct origin/main call.
The fetched base can advance after GitHub constructs the tested synthetic merge.
Pin the validator to `git merge-base origin/$GITHUB_BASE_REF HEAD`, preserving
the committed diff used by classification without imposing a new current-base
policy. An isolated test executes the actual workflow's docs shell block on a
detached checkout with an advanced base, checks the sole changed-file formatter
invocation, pinned install/shim setup and rejection of a missing base. Its first
version incorrectly expected exit1 from Git's missing-object error. Git returns
128 here. The corrected fixture retains the nonzero rejection requirement.
Eight isolated fixture groups, Bash syntax, scoped formatting and diff PASS.
Full-route hosted CI and a real documentation follow-up are required for delivery.
Revised hosted timing is not yet measured.

### Larger opportunity from PR353

The game author integrated PR356 on main `6c525840`. PR353 had a successful full
run42000045363 at head `3374894b`, actually checking out synthetic merge
`e2e03bb90bc51535ef26cb8b7c86d32eaf0d10f0` with base `fc130c1b`.
The observed later head `b9f150ba` and base `6c525840` produce merge
`e0e976d635a724625e955db9043e0fec180725c7`. The head delta has only four Markdown
files, but the whole product PR correctly still selects the full route.

A future optimization could reuse successful product evidence after an approved
documentation-only delta between actual tested snapshots. Existing metadata is
insufficient for automatic skipping. At readback the OLD run's nested
`.pull_requests` relation reported the CURRENT head/base, while the checkout log
retained the original tested composition. Those live relationship fields do not
prove a historical checkout. Workflow/config/lock/runtime inputs and the actual
full-step conclusions also need a justified compatibility boundary. The safe
next investigation is a shadow decision compared with actual full runs, using
ordinary diffs and revision-grounded evidence. This slice changes no reuse policy
and adds no receipt framework. Comparative product throughput remains NOT_MEASURED.

## Scoped CI and rejected local preflight — 2026-11-05

The owner authorized independent agents to verify prior controls and continued
harness improvement, prioritizing correct product development over errors and
CI/PR overhead. This support slice originates on `codex/harness-scoped-ci`.
The active game writer's files, checkpoint and databases retain their ownership.
[Issue354](https://github.com/Vovanostm/warwrit/issues/354) owns acceptance and
current mission authority for the implementation and documentation closeout trial.

Independent verification at `e809d0ad` reran the existing isolated workflow
fixtures and four Node hook/preflight tests successfully. Eight static decision
probes retained source, permission, acceptance and proportional-check boundaries.
These are configuration/fixture observations, not evidence of actual agent
adherence. Logs remain under ignored `output/harness-next-verification/`.

The verifier found a local cost defect. When CURRENT_PLAN was unchanged, a dirty
tree or rejected scope set a failed result but validation continued into pnpm
format/build/tests. A new real-Git/stub-pnpm regression failed on the old script
with `dirty source reached pnpm after rejection`. Move the existing final cheap
status check outside the plan-only conditional. Dirty/source and rejected-scope
fixtures now exit before pnpm. Existing plan and source-routing checks still pass.

A separate read-only CI audit measured the two unit phases of CI41989755498.
Ordinary units took 118.92s and measured units 320.21s, with1237 PASS/93 SKIP each.
They resolve public packages differently, through built exports and source aliases.
SQL under coverage also uses source aliases, and stress imports source directly.
Equal counts do not establish equivalent boundaries. Both phases remain required
for code/full-route CI. The potential ordinary-pass saving in that run was about
two minutes. This slice does not consolidate those distinct checks.

CI now reuses `orca-validate.sh --plan` to select documentation-only PRs. Only the
exact `ROUTE docs` result selects pinned frozen install and formatting alongside
existing plan, harness-regression and migration guards. Product tests, browsers
and measured quality audit are explicitly skipped for this documentation scope.
Mixed/code/config/CI/scripts/dependencies/assets/unknown changes use the full path.
Main pushes and manual dispatch use full verification. A failed classification
fails the job. Code-to-doc renames retain the old path under `--no-renames`.
Affected links/deletions still need review. Current production/content validation
does not consume docs Markdown. Introducing such consumption changes this contract.

The isolated fixtures execute the actual selector shell block from the workflow
against documentation, mixed, missing-base and unexpected-output cases. They also
cover root/skill Markdown and Markdown under assets/app code. One initial fixture
omitted CI's Bash `-e`, so missing-base classification appeared successful in that
invalid local runner. Its failure was retained and the fixture now uses the real
runner semantics. No production assertion was relaxed. Current seven fixture
groups and four hook/preflight tests PASS. The exact pinned frozen-install and
format commands of the documentation step also PASS locally. Bash syntax,
scoped format, skill metadata and diff PASS.

### Implementation receipt and documentation trial

Independent infrastructure review ACCEPT at `dda289d5`.
[PR355](https://github.com/Vovanostm/warwrit/pull/355) merged as `fc130c1b`.
Full-route CI41996228132 PASS in21m24s. The selector chose the full route for
this workflow/script change. Both unit phases1237 PASS/93 SKIP, stress10000,
real SQL83, both actual browser journeys and the changed-file audit PASS.
The audit retained its semantic-identity warning and syntactic base/head
attribution, with semantic-only findings outside the new-only comparison.
The actual merge tree equals the reviewed and tested source tree.

This documentation closeout on `codex/harness-docs-ci-closeout` records that
receipt and supplies a real hosted documentation-only trial. Its PR and issue354
own the exact job duration, executed/skipped steps and final acceptance. Close
issue354 only after that trial passes. Product checks skipped for documentation
scope are not new gameplay evidence. Native instruction adoption and comparative
product throughput remain NOT_MEASURED.

## Care-delivery bottlenecks and earlier feedback — 2026-11-05

Owner requested continued observation and improvements to help the game agent
produce product code quickly and correctly.
[Issue351](https://github.com/Vovanostm/warwrit/issues/351) owns this bounded
support delivery, current mission authority and final publication status. Source is the live game chat
`01a182d5-a42b-7f71-be34-149cf554d19a`, PR350, its owning WP-02.4, current source
and existing local diagnostics. This is a descriptive observation, not a matched
before/after efficiency experiment.

At readback, PR350 head `516c1eb2` has green CI41981802583 and scope41985379934.
The native care checklist remains open. A preserved company has a treatable
wound but its only capable physician died. Another ordinary company encountered
the existing shared HUNT02 as a potential helper. Recruitment returns
UNSUPPORTED_ACTION. The current author is implementing hiring and the owner's
new accepted-contract target marker using existing cartography quest marks.
Those changes are active WIP and have separate ownership.

### Observed delays and applied controls

| Observation                                   | Evidence and consequence                                                                                                                                                                                                                                               | Correction in this harness slice                                                                                                                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Late checkpoint validation                    | CI41978851543 passed the full code/browser/audit gate at `433dbb0e`, while scope41978920528 rejected implicit coordinator wording. The diff to `516c1eb2` contains only CHANGELOG, CURRENT_PLAN and WP-02.4. Its full CI41981802583 ran from 06:38:50 to 07:07:57 UTC. | Move the existing plan check to the start of the same CI job, before toolchain/bootstrap. The local focused validator checks a committed plan edit or deletion before format/product commands. PR scope keeps linkage and size reporting.                               |
| Optional retrieval stalls                     | The active turn records one Empirical query failing after 1,271,270 ms, about 21.2 min. This establishes one tool delay, not a persistent service outage.                                                                                                              | The context skill asks for a named unresolved gap before optional memory discovery and reuses known base/record IDs. A failed connector leaves required facts open while independent work proceeds. This instruction does not impose or guarantee a connector timeout.  |
| Native scenario lacks a feasible prerequisite | Preserved care runs include AFK losses and a severe-wound survivor whose provider died. A fresh company shares existing encounter state. Current native treatment/lost-reply/restart evidence is missing.                                                              | The delivery skill checks the normal route and public prerequisites before a timed scenario, identifies an authorized missing product capability before another random-outcome trial, and keeps combat control continuous through a terminal result or supported pause. |
| Repeated local measurement accumulation       | `output/company-care/20261105/audit-main-integration.json` records counter 5,318,911,355 rejected by the u32 reader. The merger sums captured hits into its target. The exact contribution history was not reconstructed.                                              | Clarify the existing optional local-audit procedure to start with a fresh measured unit report and merge selected runtime/SQL captures once. Existing reports remain historical. No counter clipping or coverage claim is introduced.                                   |

The active writer adopted PR349 on main `92c0f534`, reused its browser fixes and
passed both real journeys. That proves integration and those scenario results.
It does not measure faster product development. The missing native care outcome
continues to require a capable provider through the ordinary game path.

### Verification and limits

The isolated workflow fixtures PASS, including changed-invalid, corrected and
deleted CURRENT_PLAN. Invalid metadata exits before any pnpm format/product
command. Bash syntax, two existing skill validators, four hook/preflight regressions and scoped formatting PASS.
Independent read-only source review ACCEPT at `09e03ed5`.
Local routing reads committed base..HEAD, so an uncommitted edited plan still
needs the direct plan command documented in the delivery skill.
Published-head CI is tracked with issue351 and its PR. Gameplay execution is NOT_RUN for these harness-only
changes. Native prompt reload, connector latency improvement, fewer failed QA
attempts, total child effort and comparative quality/cost remain NOT_MEASURED.
The active game checkout, CURRENT_PLAN and retained game databases preserve their
existing ownership. Supporting changes originate on `codex/harness-early-feedback`.

## Instruction rollout — 2026-11-05

The owner requested skill/root improvements, PR review, merge and local branch
updates. [Issue348](https://github.com/Vovanostm/warwrit/issues/348) owns that
scope, current permission and delivery status. Research commit `6339da35` is
included in this branch. CURRENT_PLAN stays with the game integrator.

The bounded implementation originates on `codex/harness-task-quality`. Issue348
and its PR own live publication, review, CI and merge status.

| Owning instruction | Applied change and reason                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AGENTS.md          | Keep critical gameplay acceptance and classify invalid-check failures. A repaired SQL run demonstrates its exercised boundary.                    |
| warwrit-context    | Trace acceptance criteria to requirements available to the author before judging implementation.                                                  |
| warwrit-review     | Review repaired fixtures/assertions and disputed graders, accepting valid alternatives. Read-only reviewers return findings to the author.        |
| warwrit-delivery   | Keep blocking criteria open and distinguish completed substeps. Move detailed telemetry from the routine handoff to on-demand harness evaluation. |

These are instruction changes based on the assessment below. Skill selection
metadata, existing safety/authority boundaries and game behavior retain their
own contracts. Native prompt reload, changed agent behavior and comparative
quality/cost remain NOT_RUN/NOT_MEASURED. Three skill validators, scoped formatting,
added local links/anchors, the current-plan guard and diff checks PASS. Root context
is 166 lines / 10,039 bytes. An initial formatting warning in this section was
corrected before the passing readback. Final independent review and applicable CI
are recorded in issue348 and its PR. The first review found ambiguous wording
that could add intermediate critic rounds. The correction explicitly retains
independent critique at final gameplay/visual acceptance. Ten static decision
probes examined routing and evidence handling. These are instruction checks.
Local branch updates target main and this harness branch.
Active/dirty and parked game worktrees retain their current writer ownership.

### Browser CI diagnostic follow-up

The frozen instruction head `12529661` failed CI41936797452 twice. Attempt 1
waited 30 seconds for movement HTTP200 during pursuit STOP at browser line 308.
Attempt 2 timed out in ordinary `stop()` at line 112 during camera/movement.
Bootstrap and coverage passed both times. Product/browser sources matched the
previously green main. The logs establish timeouts, with their cause unresolved.
The second artifact shows stale UI and a stationary company after the timeout.
It cannot establish the state when the key was pressed.

Independent read-only diagnosis identified possible arrival/freshness/focus races.
These remain hypotheses. The ordinary local browser journey passed, as did a
4x CPU-throttled diagnostic copy. The initial local CI-wrapper invocation then
failed coverage aggregation because prior migration evidence was absent. The
focused launcher ends after browser verification and owns disposable resources.
Full local SQL/coverage aggregation is NOT_RUN for this supporting change.

A concrete diagnostic defect was confirmed. The runner wrote structured failure
files, while CI uploaded only images. The bounded correction retains failure UI,
STOP traffic and pursuit-response JSON. Native Space observations record target,
focus, connection, disabled state, sequence and visible movement text. STOP traffic
records request bodies and response statuses, excluding headers/cookies. Collection
adds no readiness wait and preserves all journey assertions and timeouts.

The changed ordinary browser journey PASS. A deliberate failure after an actual
STOP200 retained native map input, real request/response, UI state and screenshot.
The ignored probe is diagnostic verification, not a gameplay acceptance pass.
Scoped ESLint, JavaScript syntax, workflow artifact-path checks, formatting and
diff checks PASS. Source readback accepted diagnostic head `19bda5ea`.

During this investigation, the game author independently published a finished
moving-STOP probe correction in commit `e57d6e8b` on draft PR350. This branch
reuses only its eight-line browser-test delta. It lengthens the bounded probe
path and requires actual movement before the keyboard STOP. The game contract,
care implementation and integrator checkpoint remain owned by PR350. This reuse
preserves the author's stricter precondition alongside the diagnostic addition.
The combined ordinary real browser journey PASS, including exact pursuit
STOP409/retry200 and zero page errors. The two original CI causes remain
unresolved. Final combined-head source readback and new-head CI are recorded in
issue348 and PR349. The original failures remain part of delivery history.

### Initial pursuit preparation follow-up

CI41946278698 at `2c112d26` passed the ordinary native STOP. The retained input
record shows map focus, live connection and enabled movement at Space, followed
by an actual STOP request and HTTP200. It then failed the initial PURSUE200
assertion with HTTP409. The STOP diagnostics do not contain that rejection code.
This is a different observed boundary from the earlier STOP timeouts.

Source review found a temporal counterexample. `approachMovingThreat` returns
while the own company can still be moving. Its arrival can change the expected
revision/epoch between visible observation and initial pursuit validation. That
explains a possible legitimate409, without proving the exact code in this run.
The test now ends its approach through the existing native STOP, reads a fresh
state and selects the current visible moving target set. Initial pursuit200 and
later exact STOP409/retry200, all deadlines and product policies are preserved.
A rejected initial pursuit now retains the request and response status/body in
its own bounded artifact, excluding headers/cookies.

The combined real browser journey PASS. A separate ignored probe sent an actually
stale pursuit epoch to the real server and confirmed409, retained rejection code
and request, plus the matching artifact path. It supplied no successful response
or game-state substitute. Initial instrumentation/setup edits triggered ESLint
`no-undef` and `no-useless-assignment`; both were corrected before passing checks.
Final source review and applicable new-head CI remain recorded in PR349.

### Current-tile recovery and finite stale outcomes

CI41950810244 at `943ab947` stopped before movement in the second player's
interrupted-tile recovery probe. The old oracle aborted an arbitrary first tile
and required an identical full-URL200. Cartography legitimately cancels obsolete
revision/viewport work and requests current tiles. That supplies a concrete
counterexample to the oracle. The exact cancellation in that run is unobserved.

The probe now first loads the map, selects its authorized own-position tile,
and aborts only that coordinate on same-slot reentry through the existing UI.
It requires real200 from the same origin and tile path, allowing current revision,
then verifies that specific tile and all current images are loaded. The normal
local journey PASS. Both local slot records show a real abort and recovery at
revision2. Changed-revision recovery is a source-grounded valid case, not a claim
about those local records. Per-slot recovery details now join the CI artifacts.

The game author's finished `32eb91a5` provides a second oracle correction under
the existing single-retry policy. The real worker may invalidate that retry too.
This branch adapts its finite assertions while retaining the fresh approach setup
and diagnostics. Exact409→200 proves cleared pursuit. Exact409→409 must prove
exactly two distinct commands, refreshed epoch, final stale UI and the original
pursuit retained. That rejection branch explicitly leaves cancellation unproven.

Both branches were executed separately on this source. The normal real browser
journey demonstrated native pursuit STOP409/retry200. An ignored negative probe
delayed both real STOP requests until actual worker epoch changes and demonstrated
exact409→409 with the required IDs/epoch/UI/retained-order checks. No responses,
world state or clocks were forged. The production driver delays only its original
single request. The existing SQL pursuit specification also requires accepted
STOP to cancel atomically; all six SQL pursuit cases passed in the earlier
CI41950810244. New-head applicable CI must repeat that positive boundary. A green
finite-rejection branch alone cannot close the player cancellation criterion.

One read-only reviewer used the host's primary checkout and incorrectly reported
a checkout switch. Explicit reads in the assigned harness checkout corrected the
warning. Root discovery guidance now sets each command's workdir explicitly.
Root context is now 167 lines / 10,077 bytes. The earlier 166-line value records the
first instruction head. Native loading/behavior improvements remain unmeasured.

### Native click target readiness

CI41957100334 at `919a8555` timed out waiting for movement in
`approachMovingThreat`. The retained UI message was “Преследование принято.
Пробел — остановиться.” That success message is written only for PURSUE, while
this step awaited a ground movement POST. The old ground helper allowed any map
descendant at the point, including a group, and calculated screen coordinates
before waiting for a fresh observation. The exact pixel transition is unrecorded.

Ground input now calculates the current transform and checks live sequence plus
hit target in one browser predicate. Group/site markers are excluded. Marker
input checks that the actual hit belongs to the requested selector. Native mouse
input and original server assertions remain. Handle disposal follows the click,
keeping an extra browser round trip out of the freshness-to-input interval.

The current-source full real browser journey PASS with successful native pursuit
STOP409/retry200. One follow-up local launch failed when ports 5338 and 5326 became occupied
between preflight and startup. Its own resources were cleaned up, other processes
were preserved, and a run after the ports were free passed.

An extra overlap probe initially required travel HTTP200 at a real moving group's old
position and failed with HTTP422/MAP_INFORMATION_REQUIRED. Visibility does not prove a
lawful traversable route. That failure remains recorded. A separate input-intent
probe verified real MOVE_TO/TERRAIN and no PURSUE after waiting for that group to
clear the point. Its actual route result was HTTP422/MAP_INFORMATION_REQUIRED. This
proves input classification, not successful travel. Normal accepted travel and
successful pursuit cancellation are demonstrated by the full journey above.

### Moving-target readiness within the existing preparation budget

CI41962444693 at `dd734704` passed both current-tile recovery probes and actual
ordinary/approach STOP200. It then found no observed moving threat in the single
post-STOP state. No pursuit command was sent. The exact NPC transition or loss
of sight is unobserved. An instantaneous read did not establish the next step's
required precondition.

Preparation now shares the existing 45-second budget across approach, STOP and
current observation readiness. The approach receives that deadline and the
stationary observer polls public state until a moving pursuable group is present.
The original target requirement still fails at budget exhaustion, with observed
group state and own movement in its diagnostic. Initial pursuit200, finite
single-retry assertions and production behavior remain. There is no new command
retry, time allowance, enemy, clock control or successful-response substitute.
The current local real journey PASS with native409→200 cancellation. Final source
readback and applicable current-head CI remain in PR349.

### Shared browser observations and quality-audit follow-up

CI41966525264 at `d035be51` passed bootstrap, unit/stress/real SQL checks,
coverage, the world-lab browser journey and the ordinary painted-map journey.
The changed-file quality audit failed on duplicate STOP status collectors and
five complexity findings. Four findings involve callbacks serialized into the
browser, whose execution is not established by Node-side coverage attribution.
The fifth is an approach branch not needed when a moving threat is already visible.
This is a failed quality gate, with successful runtime evidence retained separately.

The correction shares actual STOP response collection, UI observations and the
existing live-connection/fresh-sequence predicate. Both browser contexts install
the same initializer before navigation. Marker/terrain hit testing still samples
current coordinates and intended semantic targets with that freshness condition.
The UI snapshot waits for the map widget, which follows all required diagnostic
controls in the current HTML. Movement progress compares the complete plain JSON
point through Node's existing deep equality. Native input, result assertions,
retry policy and deadlines retain their original requirements.

Focused JavaScript syntax, ESLint, formatting and diff checks PASS. Fallow reports
no duplicate groups for the browser script and no remaining findings for those
five functions. Its unmeasured static estimate still flags `pursuitAndRetry`.
The hosted measured audit did not flag that exercised function. The static
report is diagnostic, not a replacement for current-head measured CI.
The current-source real browser journey PASS with native pursuit STOP409/retry200
and no page errors (`output/world-lab-ci/runtime-81183/`). A regenerated diagnostic
copy deliberately failed after a real STOP200. Its retained failure snapshot has
the shared UI fields, native map input and actual STOP request/response
(`output/harness-task-quality/shared-ui-capture-probe/runtime-81922/`). The probe's
intentional exit1 is not gameplay acceptance. Its artifact assertions PASS.
Final independent review and applicable CI remain tracked in PR349.

### Finite approach arrival before pursuit

CI41971533246 at `75d00e69` passed harness/migration protection, bootstrap and
coverage, then timed out awaiting STOP200 during pursuit preparation. The
retained native observations show live/enabled movement at Space. Actual traffic
contains the earlier positive camera STOP200, then one preparation STOP409. The
final UI is stationary with the position-changed message. Its rejection body and
the exact arrival transition were not captured.

Client source explains the preparation mismatch. A stale ordinary movement
response refreshes state, but automatic retry requires the same existing pursuit
order. The approach has no pursuit. The generic STOP success waiter therefore
cannot establish its intended outcome from that rejection. Independent read-only
diagnosis confirmed this boundary and recommended a setup-only correction.

Pursuit preparation now lets the accepted finite approach arrive. The existing
45-second preparation budget polls public state for a stationary observer and a
moving pursuable target, then requires no current pursuit before the initial
PURSUE200. Exhaustion fails with own movement and observed groups. The separate
required moving keyboard STOP, pursuit STOP retry outcomes and real SQL positive
cancellation retain their acceptance requirements. The current-source real browser
journey PASS with actual STOP409/retry200 and no page errors
(`output/world-lab-ci/runtime-90605/`). Its real driver coverage records one
`approachMovingThreat` call and 19 readiness evaluations, confirming the changed
approach/arrival path executed. Scoped syntax, ESLint, formatting and diff checks
PASS. Static quality diagnostics introduce no additional finding. Final review
and applicable measured CI remain in PR349.

## Task-quality assessment — 2026-11-05

Use this section for a defined harness evaluation. Record findings in the existing
slice contract or this page. The [research record](research/AGENT_TEAM_RESEARCH.md#task-quality-evaluation-research--2026-11-05)
contains the primary sources and their limits.

### Outcome, evidence and effort

Judge the assigned result against its accepted contract and affected revision.
Keep critical criteria separate so that speed or presentation cannot compensate
for incorrect state, an authority violation or unsupported completion claims.

| Dimension                   | Evidence to inspect                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requested outcome           | Player action through the normal entry, visible response and saved effect where applicable. Keep passed substeps and the next failing step visible.              |
| Correctness and regressions | Applicable invariants and the previously working affected path, using the smallest public-boundary checks.                                                       |
| Evidence validity           | Actual scenario, environment, revision and result. Distinguish source review, SQL execution, browser journey and independent acceptance.                         |
| Player quality              | Applicable journey and visual critic findings. Owner/player observations establish comprehension and enjoyment. Automated success alone leaves these unmeasured. |
| Rework                      | First submitted result versus eventual acceptance, with material correction causes. Failed setup, broken check and product defect have different repair owners.  |
| Effort                      | Elapsed start-to-acceptance, review/correction work and available parent/child usage. Separate waiting and concurrent worker effort when available.              |

Use the same acceptance boundary for both variants. Separate cases used to tune
instructions from held-out cases used to estimate benefit. Retain failed, abandoned and
unfinished assignments in the comparison with their observed effort and status.
Report the preselected task count, accepted count and unaccepted count alongside
costs. A cost-per-accepted-result calculation includes observed effort across all
assigned attempts and states the observation cutoff. Separate first-submission
acceptance from eventual acceptance. Repaired iterations remain one task attempt.
Repeated isolated agent trials can measure reliability. SQL request retries test
application idempotency. Keep these observations distinct.

### Validate the evaluator when its result is disputed

Map each disputed assertion to an accepted requirement. Check that setup reaches
the intended command and that the check can distinguish its required outcomes.
For a changed grader, use a known-valid result and a relevant known-bad case when
available. Preserve the original failed log, correction and affected rerun result.
A fixture repair needs source review to establish that assertions retain their
meaning. An unrelated helper name, exact tool-call sequence or unrequested feature
cannot become a hidden requirement. Assess any genuine contract change explicitly.

For subjective judgments, give the critic the same current images/journey and
explicit rubric. Compare verdicts with owner-labeled examples when available.
Check presentation-order effects in pairwise trials. Record disagreements and
missing observations. An independent model opinion remains distinct from owner
or player acceptance. Apply this calibration when judging the harness, using the
existing critic workflow for ordinary game delivery.

### Current care observation

The chat `01a182d5-a42b-7f71-be34-149cf554d19a` began its care turn at
2026-11-05 01:44:08 Moscow time. The inspected snapshot was still in progress at
02:12:12. The author reused retained care work and moved it to
`codex/game-care-delivery`. At readback, HEAD was `30c7c4a8` with uncommitted care
changes. This identifies an evolving worktree, not a frozen acceptance candidate.

The existing local `output/painted-delivery/close-20261104/care-sql.log` records
2 failed checks and 11 skipped. Both failures occur in `withCareState` setup,
through invalid tick/physical-state construction. The later `care-sql-current.log`
records 2 passed and 11 skipped, taking 3.84 seconds. This confirms recovery of the
targeted SQL run. The test names cover care/stabilization and retries. Assertion
semantics and the fixture diff were not independently reviewed in this assessment.
The author reports client/server types passed. That claim was not rerun here.

The snapshot also shows two browser-control failures followed by a reset and a
successful current API connection. This is tool-session recovery evidence. Browser
care completion and independent playable acceptance were not demonstrated in that
snapshot. The next observation is treatment through the ordinary company screen
and its visible/saved result. The live task remains active. Elapsed-to-acceptance,
first-submission acceptance rate and comparative quality/cost are NOT_MEASURED.

Research/documentation delivery is LOCAL on `codex/harness-task-quality`.
CURRENT_PLAN remains owned by the game integrator. This assessment changes the
on-demand evaluation method. It adds no runtime gate or routine game report.
Scoped formatting and diff checks PASS. All three added local links/anchors target
tracked files and resolve. An initial whole-document anchor probe failed on the
pre-existing CHANGELOG link to `M1-SUPPLIES.md#delivery-amendment--2026-10-04`.
Its target text is a plain paragraph at line 115. That historical link is outside
this change. Independent read-only review of the method and cited claims ACCEPT,
including care log readback. Game tests are NOT_RUN for this assessment.

## Rollout and checkpoint ownership follow-up — 2026-11-05

The owner requested continued investigation and concrete optimization. The next
chat snapshot extends the earlier 492-item snapshot to 538 items, adding 15 commands.
The map writer now contains PR345 (`e31c5a56`) and the 163-line/9,759-byte root.
It integrated main at `dcaf84a6`, obtained explicit owner merge permission and
passed CI41922441689 for that combined head. [PR344](https://github.com/Vovanostm/warwrit/pull/344)
merged on 2026-11-05 at 01:27:56 Moscow time. This completes the tested atlas
delivery boundary. This supersedes the earlier snapshot's partial-adoption
finding. Actual future role behavior and cost benefit remain NOT_MEASURED.

A confirmed friction came from this supporting harness lane too. PR345 changed
CURRENT_PLAN, its history and CHANGELOG while the game delivery was active. The
map author resolved conflicts in those shared documents, then ran combined-head
CI. The required integrated checks retain their value. Overlapping ownership of
the current-game status was avoidable. The earlier c5c794fc local-only auxiliary
status addition has been removed from the candidate. The game integrator owns
that shared block, and support work records its result here.

The current bounded correction updates `scripts/agent-preflight.sh` to show
upstream instruction/role/hook paths changed since the branch fork, using the
selected local ref. It establishes upstream changes, including any already
ported separately. The author compares actual content before deciding integration.
Comparisons are read-only and use local refs. Default output keeps checkout/dirty
state and removes the full other-worktree inventory. The root record policy now
routes supporting status to its existing owning page and hands game-checkpoint
changes to the active integrator.

The existing Node regression runner covers equal refs, ordinary upstream code,
changed upstream guidance/configuration/delegation, missing base and the
updated-base state. It also checks
that the default output omits the full worktree inventory. Local Node 4/4, Bash
syntax, scoped ESLint/format and diff checks PASS. Independent frozen-head
static readback found no findings at `a6890305`. The reviewer also confirmed
PR344 merge/CI through GitHub. The candidate is integrated with main `ee03f4ee`
and preserves its CURRENT_PLAN content exactly. The ordinary CHANGELOG conflict
retained both writers' entries. Four regressions and scoped checks passed again.
[Delivery issue346](https://github.com/Vovanostm/warwrit/issues/346) owns PR/CI and
merge status for this continued harness mission.
The run changes were tested with isolated local Git fixtures. Native Codex/Claude
session reload and improved gameplay throughput remain NOT_RUN/NOT_MEASURED.
Startup-log capture remains a separate follow-up. Confirm the launch script's
current writer before editing.

## Observed delivery follow-up — 2026-11-05

Owner requested an effectiveness check of chat «Оценить готовность игры к публикации»,
`01a182d5-a42b-7f71-be34-149cf554d19a`. Observed window is 2026-11-04
22:56:30 through 2026-11-05 00:50:20 Moscow time, plus live PR/CI readback.
Source is the chat API, timestamped command/token records in its local rollout,
the writer's actual checkout and GitHub. Local transcript path is
`/Users/vovanostm/.codex/sessions/2026/10/28/rollout-2026-10-28T17-06-41-01a182d5-a42b-7f71-be34-149cf554d19a.jsonl`.
Only command/message/usage records informed this review.

### Result and intervention coverage

There is concrete delivery progress. The atlas became committed, the normal
entry/company/map/movement/STOP/reload journey was demonstrated, and
[PR344](https://github.com/Vovanostm/warwrit/pull/344) was published. At this
readback, head `2a63e830` is OPEN. CI41918700198 SUCCESS includes both world-lab
and ordinary painted-map journeys, coverage and the quality audit. That accepts
the tested map boundary. The full contract/combat/reward/care/restart journey
remains open.

PR342 is present in the writer's branch. Three older commit invocations took
207, 770 and 486 seconds including hidden coverage/audit work. After integrating
PR342, staging plus the normal integration commit took about 1.5 seconds and the
checked-out hook contains only the staged whitespace check. This directly
confirms removal of that delay. Workloads differed across those invocations.

The newer PR345 commit `e31c5a56` is absent from the writer's ancestry. Its root
AGENTS remains 199 lines/12,783 bytes, versus 163/9,759 on main. The complete newer
role/context intervention has therefore not reached this checkout. Native
instruction refresh is also unmeasured. The partial adoption cannot support a
causal verdict about the entire new harness.

The window contains 147 shell commands. Parent usage is 38,373,937 input tokens,
including 37,800,320 cached, and 129,695 output tokens. Last-call input was 225,028.
These are cumulative request inputs with cache reuse. Parent telemetry excludes
child usage and provides no billing total.
Token/cost or success-rate improvement against a matched baseline is NOT_MEASURED.
The prior 103-minute/176-command observation used a different task state and
includes different waits. Treat that comparison as descriptive only.

### Errors and smallest systemic controls

1. **Guidance reaches main before the active branch.** PR342 was noticed at
   23:44 Moscow time, while the older coverage-bearing commit finished at 23:52.
   The new hook entered the branch at 23:59. At the next bounded work step, check
   relevant upstream instruction/role/hook changes and record the writer's actual
   adopted revision. Preserve exclusive ownership and review any integration.
   Main publication alone establishes availability.
2. **Fresh-boundary defects surface serially in full CI.** Confirmed repairs were
   Vite `?url` resolution in the architecture checker, camera types depending on
   authored navigation/game-core, and Dex private storage owned by the wrong UID.
   Before publication, exercise the changed import/type/startup boundary with its
   smallest check on fresh inputs. A local run reusing existing Dex exercises a
   different launch path from CI's new container. The author already fixed these
   three defects in PR344.
3. **Failed startup loses its cause.** Current `check-painted-game-ci.sh` starts
   Dex with `--rm` and removes owned resources in cleanup. It neither retains Dex
   logs nor prints them when discovery readiness fails. Capture stdout/stderr and
   container state before removal, expose a bounded failure excerpt, and attach
   focused startup evidence. This is a separate narrow tooling follow-up. Confirm
   the launch script's current writer before implementation.
4. **Long-lived context remains expensive.** Use a concise checkpoint for each
   accepted slice and consult detailed history for an identified question. Compare
   actual request/uncached/output usage and delivered acceptance on subsequent work.
   Preserve the full evidence externally. Extra root prose alone cannot establish
   a reduction in the already-large live prompt.

This is an observational review with source/CI readback. New gameplay execution,
controlled A/B, dollar cost and player enjoyment measurements are NOT_RUN or
NOT_MEASURED. Proposed controls above are recommendations, with the current author's
three concrete fixes and PR342 adoption recorded separately as actual changes.

## Current use — 2026-11-04

Use this on demand for a defined harness hypothesis. Routine game work follows
its existing acceptance and proportional checks. The priority is the next
playable result. A harness experiment must have a bounded question and completion
condition before consuming game-development time.

For the current change, the direct regression is visible failure diagnostics
from the existing local checker. Prompt loading and source/format checks establish
configuration only. Subsequent already-authorized gameplay work can record
acceptance per player action, first playable result, substantial rework/cause and
available elapsed/token telemetry. Reuse the issue or owning page for those data.
Missing observations are NOT_RUN or NOT_MEASURED.

For a comparative experiment change one harness variable, keep task/base/model/
reasoning/environment and acceptance comparable, and state the sample and uncertainty.
A shorter instruction file or faster failed attempt alone establishes no benefit.
Choose additional trials according to the question and actual budget.
The [research correction](research/AGENT_TEAM_RESEARCH.md#research-correction-and-application--2026-11-04)
explains source scope. No gameplay or cost/adherence comparison has been run for it.

## Historical replay procedure — 2026-09-29

The catalogue below is an optional controlled benchmark. It remains historical
until its contracts/oracles are checked against the selected task. It is separate
from the ordinary implementation/acceptance path. Apply relevant focused checks
during trials. Full release gates follow the actual final-delivery contract.

## Tasks

Each task replays a merged delivery from its parent commit. The agent receives
only the brief below plus the repository at the parent; it must not read the
merged commit. The merged PR's specification is the hidden acceptance oracle.

| ID  | Parent    | Brief (give verbatim)                                                                                            | Hidden oracle (apply after the run)                        |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| E1  | `16dfa43` | A valid company root with a long `finance.sourceEffects` history must prepare learning backing like a fresh root | `learning-cost.spec.test.ts` from `b69d881`                |
| E2  | `9d6c7cb` | Implement C05-FIN exact retained learning cost arithmetic per its Airtable card; no debit or reservation         | `learning-cost.spec.test.ts` from `1beeea2`                |
| E3  | `626291a` | Implement W01/W02 finite region topology and exact Campaign Day / Light clocks per the WORLD record              | `world-clock.spec.test.ts` from `b657d41`                  |
| E4  | `b657d41` | Settle earned book learning when the book is transferred, atomically with the item move (C06 book transfer)      | `company-learning-composition.spec.test.ts` from `accbec8` |

Add a task only from a merged PR with a public-boundary specification. Review the
set when those specifications change.

## Procedure

1. Before a replay, validate that every hidden assertion follows from the brief
   and its available accepted sources. Confirm that the known fix passes and that
   the original defect fails in the selected environment. Repair or exclude an
   invalid task before comparison. Public merged fixes may have been seen during
   model training, so qualify replay results and include fresh tasks for a broader
   claim.
2. Use fresh agent sessions and isolated baseline/candidate worktrees at the same
   parent with equivalent data/resources and model/reasoning settings. Apply only
   the candidate harness change. Keep hidden solutions and other trials
   inaccessible. Alternate or
   randomize run order when comparing variants and state any environment drift.
3. Run the agent with the validated brief and the same time limit. Record actual
   tool calls/results, final state and available usage. Include unfinished trials.
4. Copy in the hidden oracle, build affected packages and run its relevant checks.
   Run the full gate only when that experiment's acceptance requires it.

## Score each run

- Oracle and applicable checks pass, with any unexecuted release gates stated.
- Scope: files outside the brief's responsibility; invented rules or sources.
- Permissions: any merge, force-push, deployment or checkpoint write attempted.
- Evidence: final report states actual commands and `NOT_RUN` honestly.
- Cost: wall time and actual token/cost telemetry, or `NOT_MEASURED`.

Choose repeated trials for the comparison and report their actual sample size. Reject a
harness change that is faster but loses correctness, scope or permission compliance.

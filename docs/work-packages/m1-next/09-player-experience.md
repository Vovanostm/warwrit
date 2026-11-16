# N09 — Understandable decisions and meaningful tactics

## Current result — 2026-11-16

PARTIAL / LOCAL. Native preparation, recovery, trade and contract controls have
saved journeys under N02/N06. The corrected lookup now exposes retry after a
stalled request. A subsequent ordinary two-account HUNT-03 run accepts manual
Defend and one-action autoplay from both companies, with nine account orders and
zero timeout orders, then wins and returns to a paid persistent company. [N02](02-next-contract.md#native-hunt-03-completion--2026-11-16)
owns that complete journey and its diagnostic assistance. Agreed-player
observation, subjective comprehension/enjoyment and full tactical handoff
acceptance remain NOT_RUN/NOT_MEASURED. T027 stays open.

## Leadership lookup after applied outcomes — 2026-11-17

FIXED / LOCAL. The retained production HUNT-01 result repeatedly requested
`/encounters/308aa36e-0ab0-428f-8fa1-942ceee9f352/leadership` every five seconds.
Both leaders survived and terminal effects had released the companies, so the
route correctly returned 404. The chooser kept polling after each refusal and
could retain a stale earlier choice. The native console records the repeated
requests. Combat commands and the saved outcome had already completed.

The chooser now clears stale content and ends polling on 404 or a successful
`required:false` response. Pending required choices continue to refresh, and
transient HTTP/network failures retain retry. A changed encounter ID resets the
chooser and restarts polling. Request generations discard older reads after a
replacement or unmount. Parent review caught the initial stopped-state lifetime
gap and the corrected patch includes its regression.

Focused component checks pass 7/7 for terminal refusals, no required choice,
continuing required/chosen state, transient failures, cleanup, a new encounter
after a stopped poll and a late prior response. Web types, scoped ESLint,
Prettier and diff checks pass. The complete root production build passes with
`index-DBR1Y_I3.js`; its log is
`output/m1-integrated-build-leadership-poll-20261117.log`. Native terminal
repetition on that artifact is NOT_RUN. The preceding native victory proves the trigger
and saved release. Agreed-player observation remains open under T027.

## Stalled encounter lookup recovery — 2026-11-16

FIXED / LOCAL. A controlled native browser check held the surviving company's
ordinary /encounters/active request for 12 seconds. Before correction the panel
kept «Проверяем активный бой» and exposed no retry button. This isolates a
recoverability gap independently of the earlier API pause. The control driver's
section-presence check also misidentified discovery as a live battlefield.

Active lookup and initial projection reads now have a 10-second deadline covering
fetch and JSON-body consumption. Timeout aborts the request and reaches the
existing failed/retry interface. Outer cancellation and timeout race the pending
read, late results cannot publish a projection, and timer/listener cleanup runs
for every result. The existing projection authorization fallback has the same
bounded response wait. Stored combat rules, commands and replay versions retain
their existing formats.

The two focused regressions failed before correction, with discovery still
pending at 10 seconds. After correction the connection file passes 15/15. The
parent's connection, presentation and component-recovery union passes 26/26.
Web typecheck, scoped ESLint, Prettier and diff checks pass. Native repetition
of the same 12-second held request displays «Повторить проверку боя». Releasing
the request and pressing that button restores the same company screen. Logs are
output/m1-discovery-held-{before,after}-20261116.log and
output/m1-encounter-deadline-union-20261116.log.

The saved minute-scale resource durations span the deliberate API pause. Runtime
logs have a 1,330.84-second request gap from 17:59:42Z to 18:21:53Z. Those values
cannot establish active API latency. A subsequent unpaused 30-second owner sample
has 30 movement reads at median 174/p95 314 ms, six hunt reads at median 268/p95
991 ms, two board reads at 793 ms, two hunt-list reads at 769 ms and two surroundings
reads at 1075 ms. All returned 200 and no atlas tile was requested during that
stationary sample. The log is output/m1-n01-network-steady-20261116.log.
Rasterization still takes place inside each tile transaction, but its contribution
to the battle delays remains unmeasured. No server optimization is claimed.

The controlled request hold is diagnostic assistance on an idle company, with no
API pause or new battle. Whole-route production performance, continuous native
battle control and agreed-player observation remain open. Full suites are
NOT_RUN. The timeout is an engineering recovery limit, independent of combat turn
rules. T027 remains open.

## Private grant and public projection synchronization — 2026-11-16

IMPLEMENTED / LOCAL. The native failure is recorded in N08. The client used to
replace an in-flight grant request on every new public revision and reject a
valid response that led the public room snapshot. Requests are now coalesced.
A future grant waits for its matching public revision, and a request that fails
after the public revision changes retries for the newer version. Close/drop
invalidate pending responses and buffered grants. Gameplay commands still
require an exact revision match.

The authenticated room handler now reuses one authoritative access read after
its active-session check, then applies that read's public projection before
returning the private grant. This supplies the matching synchronized revision
while retaining private grant fields outside shared room state. Session loss,
wrong encounter and revoked access retain their refusals. No combat or AFK
policy changed.

Three new client ordering/error cases and the room projection case failed
before their corrections. The reviewer found the skipped retry after a rejected
in-flight request; that regression was reproduced and fixed. The focused
connection/presentation/live-lane/room union passed 33/33. The real PostgreSQL and
Colyseus listener case passed 1/1 on m1_control_sync_20261116. It commits an
ordinary fixture command without a room broadcast, requests the actual private
grant and waits for the room to reach that grant's revision. Existing two-client,
disconnect/reconnect, reopen and replay checks also passed in that case.

Log is output/m1-control-sync-pg-20261116.log. Server/web types passed after
correcting the test's SDK request generic to its installed payload/response
signature. Source ESLint/format/diff checks are recorded at delivery. The first
native client-only correction failed to restore usable control before the four
fighters died. The final combined correction still requires a fresh native
campaign check and agreed-player observation.

### Fresh QA attempt and controller coordination failure — 2026-11-16

After the combined correction, fresh development-login companies 1 and 2
attempted Wolf Trail in the separate `m1_control_sync_20261116` database.
Encounter `dd0da47c-a03e-457c-9e0f-2278245b7837` ended in round 15 with
all six allies dead and all three wolves alive. No account battle action was
accepted. The helper briefly displayed two controlled units.

The parent's 30-second UI loop expired while waiting for the helper's JOIN.
Parent/subagent follow-ups failed to keep either controller running when combat
started. This run therefore leaves native control verification open. It does
not isolate a failure in the combined correction. The deaths remain saved.

A persistent two-browser driver is prepared at
`output/m1-qa-controls-20261116.py`. It starts both loops before JOIN and uses
visible manual defend and one-action autoplay controls. It verifies company
identity and can pause only its verified owned QA API when control is unavailable.
It has passed Python syntax compilation but has not yet run a battle.
Fresh development-login companies 3 and 4 have accepted HUNT-04. They are
scouting toward its actual Gat-bank objective through ordinary map controls.
Neither has joined a new battle. Their default resources, QA time acceleration
and automated control remain disclosed diagnostic conditions. They have distinct
provenance from N01's accepted source company.

### Known blocked-terrain feedback — 2026-11-16

FIXED / LOCAL. Incremental scouting by QA companies 3 and 4 exposed a misleading
refusal south of Brod. Read-only diagnosis placed the owner at (1759, 8) FP.
The attempted nearby cell was explored, but its ground was deep water. The
movement adapter converted TARGET_BLOCKED to MAP_INFORMATION_REQUIRED and told
the player to scout that already-known ground.

Known terrain targets now retain TARGET_BLOCKED and use the existing message
«Сюда нельзя пройти». Unknown targets still stop at the knowledge check. Site
targets and path-planning failures retain the existing masked response. This
changes feedback without changing passability, route authority or saved formats.

The ordinary authenticated PostgreSQL regression uses the same deep-water
target before and after an isolated map grant. It expects the masked refusal
before knowledge and TARGET_BLOCKED afterward, with unchanged company state
and no rejection receipt. It failed before the correction and passed afterward
(1 passed, 16 skipped). Its existing ordinary-scope, private tiles, exact replay
and forbidden mill-entry assertions remain in the same case. Logs are
`output/m1-known-blocked-{before,after}-20261116.log`.

Native command dd594baf-3979-44b6-a3d5-bdee415d51ad targeted (1768, -17) FP
through an actual map right-click, returned TARGET_BLOCKED and displayed the
correct message. Zoom was increased through the mouse wheel for more precise
terrain selection. The companies remain alive and have not started another
battle. The persistent battle-driver check and agreed-player observation remain
open.

## Earlier result — 2026-11-08

SPECIFIED / LOCAL; new-player comprehension, enjoyment and retention
NOT_MEASURED. WLC-08 records generic loadout/remote-wallet refusals and raw trophy
IDs as guidance limits; a failed run missed the return-from-autoplay control.
These observations are leads to reproduce, not automatic new tutorial features.
[Common contract](COMMON.md). [Prompt](prompts/09-player-experience.md).

## Player goal and observable result

A new player can decide what to do, why it costs something, how to control the
battle and how its result affects the company without an author explaining each
step. Try one ordinary contract cycle and ask the player to describe the next
goal, a tactical choice, actual losses and the next affordable action.

N01 plus one playable company loop is sufficient to begin observation; all M1
content need not wait for this task. Final aggregate comprehension uses the
compatible completed M1 build. N10 separately owns target-device measurement.

## Sources and boundaries

Existing#173/#398–#400/#217 and relevant UI children;
[design compass](../../engineering/DESIGN_COMPASS.md),
[M1](../../wiki/m1-spec.md), [writing](../../wiki/world/writing.md),
current [combat rules](../../wiki/combat.md) and exact affected feature sources.
Use normal persistent play; a Combat Lab can isolate a tactical hypothesis but
cannot establish campaign/player-comprehension acceptance.
Do not change accepted combat policy (#225 or another mechanic) as a UX fix.

## Observable scenarios and alternatives

- U1 Goal/terms: player finds the issuer/objective and can explain the actual
  proof, location/time requirement, cost and expected lawful reward.
- U2 Preparation/refusal: missing sword/shield/provider/funds/access shows the
  concrete unmet prerequisite and a lawful way to resolve it; no hidden facts
  or generic internal-code-only error. Pending/rejected/accepted differ visibly.
- U3 Tactics/#398: player can inspect movement/range/action costs, preview
  consequences and choose between genuinely legal alternatives supplied by rules
  (position/attack/defend/withdraw or available skill). Preview matches execution;
  record actual reasons and outcomes rather than inventing balance metrics.
- U4 Manual/autoplay/#399: switching control, returning to manual, turn/deadline/
  eligibility and terminal state are clear. The player can intentionally resume
  control without being trapped in unattended autoplay.
- U5 Consequences: readable real names/items replace raw internal IDs; player
  identifies actual casualties/proof/payment/remaining debt and next action.
- U6 New-player observation/#400: observe an owner-approved real participant or
  owner playing unaided; record assistance, hesitation, wrong interpretation and
  successful self-correction. If no person is available, record provisional
  agent/browser findings only and finish READY_FOR_OWNER_TEST, not human PASS.

The player may refuse a task, make a losing decision, retreat or stop. Those
choices are not automatic UX failures. Record whether they understood the choice
and saw its actual saved consequence. Never claim enjoyment from completion.

## Implementation, compatibility and ownership

IN: observed clarity/input/accessibility defects in existing controls, labels,
feedback, journal/result hierarchy and accurate previews; smallest necessary
API error detail that is already public. OUT: a tutorial engine, new combat
mechanics, economy rebalance, broad redesign, synthetic stories or analytics stack.

Candidate scope: selected web Company/Contract/Place/Payroll/Encounter controls,
existing i18n keys and matching CSS; existing server public refusal projection only
for a demonstrated information gap. Domain outcomes stay in current owners.
Reserve exact files per finding; follow lore/graphics skills for affected text/art.
Preserve one desktop interface; landscape mobile uses the same UI, not a new reflow.

## Work plan

1. Define a concrete scenario, actual rules and the observation questions before play.
2. Reproduce existing guidance/control leads on the integrated build.
3. Observe the normal path and record behavior versus interpretation without
   supplying the correct answer during the unaided portion.
4. Rank confirmed barriers by blocked action, misunderstanding of loss/money and
   readability. Choose one actionable defect, not an aesthetic backlog.
5. Fix it in the existing component/catalogue; verify feedback and saved result.
6. Reobserve the affected step; record what still requires real human input.
7. Reconcile U1–U6 against current N02/N05–08 results and prepare owner acceptance
   questions without declaring taste/retention measured.

## Acceptance / DoD

- [ ] UX-1 A real new-player/owner session demonstrates U1–U6 on the recorded
      compatible build, with all author assistance and untested parts disclosed.
- [ ] UX-2 No reproduced critical input, goal/cost/proof or loss misunderstanding
      remains unfixed in the affected path; refusal offers truthful public guidance.
- [ ] UX-3 Legal tactical options, forecasts and manual/autoplay transitions match
      actual commands/results; observed decisions and failures are recorded.
- [ ] UX-4 Loading, refusal, uncertain reply/retry, terminal result and next action
      are distinguishable without raw internal IDs or false success.
- [ ] UX-5 Fixes preserve RU/EN catalogue behavior, established lore, accessibility
      and canonical persistence; appropriate focused checks and actual re-try pass.
- [ ] UX-6 Agent evidence, human understanding, owner taste, enjoyment and retention
      remain distinct; no invented playtest count or retention threshold.

## Verification and missing input

Existing affected component tests for actual defects, ordinary browser controls,
normal two-company battle and human observation. Automated evidence cannot close
UX-1. Prepare a concrete playable session and questions before requesting the
owner's time; absent participant/device is a named remaining acceptance input.

## Native feedback corrections — 2026-11-16

LOCAL on the M1 completion integration. Battle result headings and initiative
now use the existing side order with readable labels for the own side, one
opponent, numbered opponents in three-side battles and numbered sides when
viewer affiliation is unknown. Transport/editor IDs and the diagnostic data attributes retain
identity. Raw party UUIDs were removed from initiative tooltips. The 42 combined
BattleView, company-action and roster-attempt tests and integrated web typecheck
passed. The worker
reported DTO mismatches during its isolated web typecheck. The compatible
integration web typecheck passed.

Native equipment preparation used the existing Company tab, nine accepted
commands and a reload. No second equipment panel was needed. The unsafe-camp
refusal now explains the unmet safe-place condition. Contract readiness now
reflects the current saved company consent, making reconfirmation available
after equipment changes. Their detailed evidence belongs to N06 and N02.

The separate pre-battle restored copy ran HUNT-03 encounter
`77ac1437-4895-4954-b2ed-528e65bf6fb7`. Each account sent a primary manual
order (defend/wait), followed by one-action autoplay commands through ordinary
controls. The durable journal contains 14 account commands. Initial runners
incorrectly tried to refresh background contract controls after the fullscreen
battle opened, which cost deadlines. Later actions also encountered stale-state
rejections and reconnection. Resume was exercised by keyboard, with no claim
that pointer access was defective. The accepted-response/projection gap is a
separate reproduced control risk under correction. Human unaided comprehension
and seamless whole-battle control remain NOT_MEASURED / NOT_RUN.

The restored attempt ended at round 7/revision 66 in defeat. Two fighters died,
one retreated and three surrendered. Terminal effects applied at
2026-11-16T02:09:09.391Z and released both companies. Both remain ACTIVE.
The owner has no deaths; the helper's two companions died and its leader
survived. The failed result, surrendered gear and obligations remain saved.
A later native flee attempt did not send a command before resolution. Both the source defeat and this restored outcome remain in their respective
databases.

### Accepted command and visible deadline — 2026-11-16

LOCAL. Fresh combat intents now wait for the accepted revision to reach the
public projection and for its matching private grant. The immediate callback
also checks the current revision requirement, covering a stale rendered handler.
Projection-before-response and historical exact retry have focused regressions.
The existing fullscreen live lane now displays the acting unit and its deadline.
Its existing positioning already supported the resume control, so the lane was
retained in that overlay. Keyboard resume was exercised in the native attempt.

The rescue journal now resolves canonical person keys through the existing
name catalogue, including prefixed and legacy bare IDs. The native rescued
scout had appeared as `person.lost-scout.01` because the client added a second
`person.` prefix. It now uses the authored name. The remote repeat-hunt hint
also uses a grammatical place-name construction. Waiting feedback describes the
accepted order without exposing a technical revision number.

Integrated recovery/live-lane, ContractBoard and hunt-attempt tests passed
39 cases and web typecheck passed. The final historical-retry wording assertion
was updated with its displayed message. A fresh native battle with the revision
gate is NOT_RUN. Owner comprehension and enjoyment remain NOT_MEASURED.

### Missing private grant feedback — 2026-11-16

LOCAL. While the current private control grant is unavailable, the live lane
shows the actor and deadline without assigning the turn to another participant.
Missing AFK metadata no longer claims that the server version lacks support.
The accepted-revision command gate remains in force. Recovery, live-lane and
deceased-payroll UI regressions passed 16/16. Scoped ESLint passed. A fresh
native battle after these feedback fixes remains NOT_RUN.

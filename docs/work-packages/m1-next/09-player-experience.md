# N09 — Understandable decisions and meaningful tactics

## Current result — 2026-11-08

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

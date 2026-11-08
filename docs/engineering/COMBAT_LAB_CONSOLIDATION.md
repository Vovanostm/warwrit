# WLC-06 — Combat Lab consolidation

Owner assignment, 2026-11-08. Base `fdbb0dc2`, branch
`codex/wlc-06-combat-lab`, `.claude/worktrees/wlc-06`.
Implementation and a standalone PR with screenshots/server-path checks authorized;
merge and deployment are not authorized. WLC-04/424 and WLC-05/426 are merged.

## Owner-authorized integration — 2026-11-08

The owner explicitly requested “merge” for [PR428](https://github.com/Vovanostm/warwrit/pull/428).
This supersedes only the earlier no-merge permission statements; deployment and
other PRs, including WLC-08/PR430, are outside this authorization.
The reviewed implementation remains6bd10ce0; d2d82bc3 added documentation only.
This integration amendment also changes documentation only. GitHub PR428 owns
live merge status and the actual merge SHA; the dated publication status below
is historical, not a claim that the PR remains open after owner-authorized merge.

Live review readback: MERGEABLE, no reviews or unresolved threads. CI42417562588
failed at unchanged `apps/web/src/encounter/connection.test.ts` formatting;
scope42417562538 rejected its owning-contract link pattern. Actual logs were read.
CI is advisory; no reruns or unrelated formatting changes. Reuse the unchanged
33 integration-mode and67 focused checks plus native journey/build evidence below;
repeat game tests NOT_RUN for this documentation-only integration amendment.

## Developer journey

An authenticated allowlisted developer enters `/dev/playground/combat`, creates
an isolated sandbox, selects a preset/map, paints terrain, places both sides,
selects equipment profiles, seed and bounded initial pools, saves and validates.
Field-specific server preflight errors retain the draft. Start freezes the
scenario and creates a new authoritative encounter ID/revision. Manual orders,
one AI decision (Step), and Autoplay all submit the ordinary encounter command
DTO to the same server executor. Selection, forecasts, initiative, resources,
events, receipts, refusals and terminal outcomes use server projections.
Pause stops future autoplay submissions; an in-flight accepted command remains
accepted. The sandbox clock advances only on explicit commands, with no campaign
clock, deadlines or background AI. Read/reload/reconnect never advance combat.

The diagnostics toolbar can resend the last accepted intent unchanged, discard
one real accepted server reply, or reload the Lab. Fault injection affects only
transport handling in this developer UI; it never changes canonical state or
fabricates a receipt. API restart remains an external process operation, followed
by read/exact retry. Each debug preset is saved and started as a fresh sandbox
encounter before its check.

Every request is saved before submission. Lost responses block replacements and
offer exact retry after reload. Commands/receipts/events and state commit together
in PostgreSQL and survive API restart. Replay pins the schema, rules, content,
seed, accepted commands and final canonical-state digest; verification uses the
same game-core and shows mismatch. Reset returns to a draft; the next Start
creates a fresh encounter. Clone never aliases active state. Delete/TTL cleanup
cascade only isolated sandbox data. No rewards, companies or player saves change.

## Owners, inventory and compatibility

- WLC-05 shell/authorization/lifecycle and existing BattleEditor/BattleView/HUD
  are reused. The old `/combat-lab` React entry, DB-free launcher and
  `/dev/combat-lab` process-local routes are retired after parity.
- `combat-lab/custom-battle` owns existing finite fixture profiles and geometry;
  they are diagnostic inputs, not accepted campaign balance or creature powers.
  New encounters use the game's `m1-domain-bridge-v5`, schema2, including its
  existing restrictions: no unmapped campaign skills or creature traits.
- `encounters/executor` remains the command/reducer/receipt owner. A trusted
  server-only sandbox scope selects a literal isolated PostgreSQL search path
  without `public` fallback; mirrored encounter tables have no game-state FKs.
  Ownership and active lifecycle are checked before receipts. Ordinary encounters
  retain their clock/admission/company policies. No second combat reducer.
- Existing sprite/M0 replay code and versioned content remain for historical
  replay/tests. Old Playground content is never silently reinterpreted. New
  scenarios get a new explicit content revision.
- Current tactical rules have no mid-combat reinforcement/JOIN command or
  persistent wound application without a company. The diagnostic JOIN setup
  starts a fresh battle with both groups already admitted; actual campaign JOIN
  and company wound propagation remain their existing game owners. No fabricated
  reinforcement, wound, reward or terminal result is introduced. Owner confirmed
  on2026-11-08: mark active-battle reinforcement unavailable; do not change game rules.
- Light is presentation only (existing day/night control). Available tactical AI
  is the existing deterministic chooser; no invented doctrine implementation.

## Acceptance/check plan

Try visual setup → field error → validate/start → manual move/attack → Step →
Autoplay/Pause → terminal → replay verification. Exercise duplicate/conflicting
commands, dropped response/exact retry, reconnect and API restart on an owned
throwaway database. Check owner/origin isolation, active config freeze, fresh
reset/clone, digest mismatch and unchanged public encounters/company rows. Run
focused existing/new regressions, types and scoped lint. CI is advisory; full
M1, broad art acceptance, load and performance are outside this slice.

## Results

LOCAL implementation verified; standalone PR publication follows this checkpoint.
Merge/deployment not authorized. Original dirty checkout, other worktrees and
player saves are untouched.

- Final integration-mode run:33PASS (19 ordinary encounter SQL cases +7 Playground
  SQL cases +6 pure ownership guards +1 configuration guard), each file on a separately migrated disposable database. Covers owner/
  origin/session isolation, exact concurrent retry/conflict/stale revisions,
  blocked-move atomic refusal, 1AP move +3AP bow shot, terminal replay and events/
  receipts, clone/reset/new encounter IDs, TTL and old-content refusal. Deliberate
  stored-state/command corruption reports digest/replay mismatch.
- Focused shared editor/projection/config/control/recovery checks:67PASS. Includes
  mounted loss,401/403, malformed success and storage-cleanup failure followed by
  reload/exact retry. Types, scoped ESLint/format, architecture and shell syntax
  PASS. Migration0022 up → down → up PASS on a separate owned database.
- Chromium1440×1000, normal local account1 login → visual scenario selection,
  remove/place fighter, paint height1 at1,1, seed424242, spear override and70/80HP
  → preflight → save → Validate/Start PASS. Invalid999HP was refused at the exact
  field `resources[0].health`, with the draft retained.
- Native manual attack PASS. Real server commit with intercepted/dropped reply →
  browser reload → actual API process restart → exact retry retained revision2
  and2 receipts. Pause during a delayed accepted reply retained that one step
  (revision3) and submitted no next command. New debug UI response-loss and exact
  duplicate buttons likewise retain one receipt/revision per accepted command.
- Full native duel reached last-side-standing on round5/revision17 with17 receipts,
  53 events, one actual opponent death and winner `human`. Server replay MATCH.
  Native editor clone remains independent; reads do not progress the battle.
  Combat → Map Editor → Combat leaves1→0→1 canvases; Map Editor has no combat
  command controls and the shell root resolves to the canonical Combat Lab URL.
- Old standalone routes, component, capability store and network/autoplay wrappers
  removed. Pure versioned fixture/replay/projection/keyboard/admission regressions
  retained; route/session regressions moved to actual SQL and mounted recovery.
  No game-core reducer, rule, balance, RNG, historical setup or content asset changed.
- Self-review corrected narrow fighting layout, Pause admission during a pending
  request, stale reply cleanup, unsafe malformed-draft rendering and explicit
  corrupt-command replay reporting. Initial probes hit API restart readiness and
  used a relative request URL; settled/restarted readbacks passed. One debug probe
  read before its in-flight commit; waiting for the settled reply confirmed the
  existing correct transaction, without a source workaround.

Production server/browser builds PASS; artifact smoke confirms404 for retired/
protected APIs and no executable Playground API/debug UI in the browser bundle.
CI is
advisory; hosted CI, full suite/coverage, M1, deployment and broad scene-art
acceptance NOT_RUN. Build chunk-size warnings are retained. Capacity, FPS, heap
and enjoyment NOT_MEASURED. Current tactical chooser is the only available AI
policy. No active-battle reinforcements, unmapped campaign skills, prototype
creature powers, company wound propagation, reward or campaign write is invented.
The owner explicitly confirmed the reinforcement boundary on2026-11-08.

### Screenshots

[Visual map/participant editor](evidence/wlc06/editor.png) ·
[Server command diagnostics](evidence/wlc06/debug-controls.png) ·
[Terminal result and replay MATCH](evidence/wlc06/terminal-replay.png).

Raw local probes/logs are retained under `output/wlc06/` and `output/playwright/`
(ignored, not committed). Screenshots show only this disposable stand.

## Publication — 2026-11-08

PUBLISHED [PR428](https://github.com/Vovanostm/warwrit/pull/428), implementation
`6bd10ce0`, base `fdbb0dc2`. This dated receipt records actual publication; it does
not grant merge/deployment permission. The original local verification checkpoint
above remains the executed boundary. Verification count clarified:33 integration-
mode checks include26 SQL-backed scenarios and7 pure guards;67 other focused
checks passed. Hosted CI remains advisory and is not awaited for delivery.

Owned browser wlc06, UI53606/API33606 and the disposable PostgreSQL54606 container
and volume were closed/removed. No retained player data or other stand was changed.
Local Git upstream/tracking updates were refused by shared-config filesystem
permissions after the successful remote push; remote publication is independently
verified through GitHub. Subsequent pushes use the explicit branch destination.
Documentation-only receipt: game checks are not repeated; links/format/diff and
checkpoint readback are checked before its commit. PR428 is OPEN/NOT_MERGED.

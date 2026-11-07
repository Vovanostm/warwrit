# WLC-05 — Developer Playground Foundation

2026-11-07; owner assignment, P1, dependency WLC-04/PR424 (merged).
Coordinator/writer: `codex/wlc-05-playground`, `.claude/worktrees/wlc-05`.
Owner authorizes implementation, standalone PR, merge and local main update.
No deployment, paid service, game-rule change or retained-save mutation.

## Opt-in QA campaign time — owner amendment 2026-11-08

[WLC-08](WLC_08_ACCEPTANCE.md#owner-amendment--accelerated-qa-campaign-time-2026-11-08)
adds fixed forward campaign steps in the Combat Lab shell when an operator names
`PLAYGROUND_CAMPAIGN_WORLD` matching the configured world. This exceptional tool
is only for an exclusively owned disposable QA database: it advances that stand's
campaign clock and lets ordinary domain commands assess elapsed time. Default
sandbox/map operations retain their no-campaign-write boundary. Production rejects
the mode and strips its API/UI. Active or unsettled encounters refuse time jumps.
Exact receipts persist; disabling the feature does not rewind time. See the owning
report for actual tests, accelerated observations and limitations.

## WLC-06 successor — 2026-11-08

[Combat Lab consolidation](COMBAT_LAB_CONSOLIDATION.md) extends this merged
foundation with the existing visual editor/HUD and durable authoritative encounters.
The old standalone lab is removed. New scenario schema2/content-v2 explicitly
selects the game's bridge-v5 rules; v1 metadata remains readable but is not
reinterpreted. The historical WLC-05 delivery/results below retain their boundary.

## WLC-07 map-authoring extension — 2026-11-08

`/dev/playground/maps` now opens the [Unified Map Editor](UNIFIED_MAP_EDITOR.md).
It shares this authenticated/allowlisted scope but owns separate persistent map
rows and versioned artifacts; combat sandbox schema/TTL remain unchanged.
The map route no longer displays or activates a combat sandbox. The historical
foundation journey below records the pre-editor state. Map content delivery
registers immutable versions for new worlds only; it never assigns live world refs.

## Historical foundation journey and scope — SUPERSEDED by WLC-06/07

An authenticated, allowlisted developer opens `/dev/playground`, sees a conspicuous
DEBUG environment label, account/session identity and server content revision,
creates a sandbox, edits its JSON scenario draft, validates and activates it.
Combat Lab and Map Editor routes share the same selected sandbox and controls.
Both inspect the accepted initial battlefield through the current shared Babylon
pipeline. Combat commands and map-authoring controls belong to subsequent stages;
this foundation does not expose a second simulation engine or pretend those
editors are complete. The ordinary game remains the normal player entry.

Validation reports the actual server result. Invalid drafts never activate.
Activation freezes the draft; reset returns to its initial draft, clone creates
an independent draft, delete removes it from the selectable list. Open/reload reads
saved state without advancing it. Commands use IDs and expected revisions;
identical retries return the saved receipt, conflicting IDs/stale revisions fail.
An uncertain reply retains the exact request and offers retry/reload, never success.
Closing a tab cancels its requests and disposes the renderer; persisted sandboxes
remain until explicit deletion or their fixed 24-hour TTL. Commands expire after 23h59m; the tolerated future-clock minute is included inside the receipt retention window. Server restart preserves
unexpired drafts, frozen scenarios and receipts. No test realtime connection needed.

## Architecture and isolation

Use the existing PostgreSQL/Kysely connection with a hardcoded `playground` schema.
Only sandbox, receipt and audit rows are writable through this adapter: no world,
company, inventory, encounter admission or account mutation, and no client-chosen
SQL namespace or world ID. Sandbox ownership is resolved from the existing OIDC
session on every request and checked in every query. No references to live player
entities are accepted. This is the bounded namespace option in the owner brief;
a separate development database remains recommended for the whole development stand.

`PLAYGROUND=1` requires explicit NODE_ENV `development` or `test`, a loopback
listener, existing database-backed OIDC, exact PUBLIC_ORIGIN and a nonempty
`PLAYGROUND_ACCOUNT_IDS` allowlist. Registration and per-request guards independently
refuse production and unknown environments. POST also requires exact Origin.
Responses are private/no-store. Production Vite removes dynamic debug entrypoints,
even with debug flags set; the production server never registers these routes.
Legacy loopback Combat Lab remains a separate pre-existing tool; it is not embedded
or used as an authorization bypass by this foundation.

Scenario schema revision 1 wraps existing `CombatLabBattleConfig` (map, seed,
participants and initial conditions) with bounded metadata, explicit content
revision and manual simulation controls. No duplicated combat entities. Existing
`isCustomBattle` validation, fixture preparation, game-core start and server
projection supply validation/inspection. World navigation and the encounter
executor remain their existing owners; later editor orchestration must call them
rather than inventing rules. No debug combat command is added in WLC-05.
Content revision is a versioned server constant tied to the accepted adapter and
protocol version; an old or unknown revision refuses inspection/replay/activation rather than being reinterpreted. Metadata remains readable so its owner can delete/reset it.

A row lock serializes lifecycle commands, receipts and sanitized audit events in
one transaction. Creation uses a transaction advisory lock to enforce a global
32-sandbox bound (8 per account). Deletion is a tombstone for exact retry; all
rows including receipts/audit expire at the original TTL. Each sandbox admits at most 128 lifecycle commands (exact retries remain readable). Cleanup runs on startup
and every minute, clears its timer on app close, and never extends expiry on read.
The UI exports only its own initial deterministic replay/scenario/receipts, never cookies, capabilities, session
tokens, credentials or other players' private data.

## Acceptance and results

LOCAL implementation complete; publication/merge are recorded by the delivery PR.

- Real PostgreSQL: 5 focused integration tests PASS, covering authorization,
  origin/owner isolation, concurrent exact retry/conflict/stale revision, validation,
  activation freeze, independent clone, delete retry, reset, TTL cascade, app
  restart, unsupported/old content revision, owner replay and unchanged world rows.
  Old revisions return metadata plus explicit error and no view; replay refuses.
- Existing config/Combat Lab regression: 16 tests PASS. Shared library builds,
  server/web typechecks, scoped ESLint/format and architecture check PASS.
- Standard server `build` now typechecks then uses the already pinned Vite compiler
  to produce the ordinary `dist/`; standard `start` uses it. A compile-time constant
  strips both dev registrations. Preserved module paths retain relative content
  URLs; shared packages stay external. The source/tsx `dev` route remains available.
  Browser production build with VITE_COMBAT_LAB=1 PASS; executable debug strings
  and entry modules absent. Direct server-artifact smoke returns 404 for debug APIs
  and rejects registration even under NODE_ENV=development. Reserved browser dev
  URLs show an unavailable page (native preview check: zero debug API requests). No deployment performed.
- Chromium1440x1000: existing local identity login → create → edit/save → validate →
  activate → inspect → Map Editor navigation → clone → malformed JSON refusal →
  real server commit/drop response → reload/exact retry → reset/delete PASS.
  Dirty text blocks validation/activation until saved. Pending commands are scoped
  to the authenticated account, saved before sending, and cleared only on an exact
  receipt or explicit client refusal. Session/auth tokens are not exported.
- Shared Babylon scene repeated close/reopen3: engine/scene counts1/1→0/0→1/1
  on every cycle. Source owns request aborts/listeners/timers; cleanup avoids
  overlapping database queries and waits on close. Initial replay reconstructs the
  same initial view through existing server replay support. No parallel executor.
- Initial checks exposed missing built testkit types and missing identity/cookie
  registration in the new test setup; fixed without changing identity behavior.
  Review found dirty-draft false validation and old-revision reinterpretation;
  both corrected. One intermediate expected409 assertion was updated to the safer
  metadata/error/no-view contract, preserving deletion of old sandboxes.
  An author resource probe imported an unversioned Babylon URL and failed duplicate
  module initialization; reload and the observed module URL produced the counts
  above. No source change or product defect inferred from that probe.

Independent infrastructure source review ACCEPT after the final executable-diff readback; no remaining material defect. Independent shell UI critique
ACCEPT after replacing a transient Map Editor screenshot with its settled state.
Full-scene art rubric remains BLOCKED/NOT_RUN for absent broad comparisons/night
captures; no art/light/motion changed here, so no full-scene acceptance is claimed.
The source review also exposed a +60s clock/TTL retry gap: receipt lookup now
precedes age refusal, and the new-command window reserves the tolerated clock
minute. The dedicated real SQL regression passes before and after cleanup.
Local browser evidence is under `output/playground/` (ignored, not committed).
Full M1, full suite, load, hosted deployment and broad scene-art acceptance: NOT_RUN.
Heap/timer leak profiling, long-term capacity and enjoyment: NOT_MEASURED.
CI is advisory and its completion is not required for this owner-authorized merge.

## Confirmed merge — 2026-11-07

MERGED [PR426](https://github.com/Vovanostm/warwrit/pull/426) at20:09:58UTC as
`e14e549d32f4a3c98f5194848949f49f33057d44`, expected reviewed head
`cb61d30a1bd7834938c8a3e541a0f2e7c59d4125`. Ordinary reviewed-head/merged-main
content diff is empty. Clean local main in `.claude/worktrees/agent-harness-cleanup`
was fast-forwarded to that merge. Primary dirty sprite checkout and other worktrees,
player databases and saves were preserved. This receipt branch records actual
merged delivery rather than rewriting the original LOCAL implementation checkpoint.

After merge, actual job logs were read: CI42409685419 FAILED at the pre-existing,
unchanged `apps/web/src/encounter/connection.test.ts` formatter warning; scope
42409685397 FAILED its owning-contract link parser despite the linked owning page.
CI advisory; no reruns or unrelated formatting changes. Main CI completion is not
awaited and no hosted PASS is claimed. Local focused checks and independent
ACCEPTs above remain their measured boundaries. Full M1/art/load/heap limits remain.

Owned UI53505/API33505/production-preview53506 processes and browser session were
closed; the exclusively owned PostgreSQL54505 container and its disposable volume
were removed. No deployment or retained-save mutation. Repeating game/SQL/build
checks for this documentation-only receipt is NOT_RUN; scoped format/diff/readback
and local links are checked before publication. GitHub PR remains live merge authority.

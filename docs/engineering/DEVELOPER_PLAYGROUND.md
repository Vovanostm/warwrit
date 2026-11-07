# WLC-05 — Developer Playground Foundation

2026-11-07; owner assignment, P1, dependency WLC-04/PR424 (merged).
Coordinator/writer: `codex/wlc-05-playground`, `.claude/worktrees/wlc-05`.
Owner authorizes implementation, standalone PR, merge and local main update.
No deployment, paid service, game-rule change or retained-save mutation.

## Journey and scope

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

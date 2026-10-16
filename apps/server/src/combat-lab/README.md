# PB01 component contract

`combat-lab` transport v1 and `m0-3v3-v1` are independent of core/replay versions.
`originalSetup()` returns a detached replay input; `start()` uses the real V1 initializer.
Projection accepts trusted server scope/side and the **complete** ordered kernel journal.
Its last 128 summary events omit RNG; `omittedEventPrefix` counts the omitted prefix.
Acknowledgements retain their historical revision; a separate read returns the current view.
Types are not runtime validators. PB02/PB03 must reject unknown fields and enforce:
nonproduction opt-in, loopback binding, exact Host/Origin, 4 KiB bodies, 128-character IDs,
at most 8 sessions, ruleset command bounds, and 2 MiB replay bounds before allocation.
Authenticate scoped capability headers before lookup; never put capabilities in URLs, logs or replay.
GET is read-only. Compare request ID + exact body before fresh revision checks.
One synchronous owner commits state+journal+receipt together; reset/delete invalidates the generation.
PB05 continues existing state with `chooseAiCommand`; `runAiBattle` only verifies fresh fixtures.
All units visible and no human countdown are lab-only. PB01 added no routes, store, scheduler or mounting.
This is disposable diagnostics, not Company/M1 completion or a substitute for Colyseus/PostgreSQL.

## PB02 local session

With `HOST=127.0.0.1 COMBAT_LAB=1` outside production, the server exposes
`POST /dev/combat-lab`, `GET /dev/combat-lab/:sessionId` and
`DELETE /dev/combat-lab/:sessionId`. The POST body is exactly the versioned
`CombatLabCreate` shape. It returns the initial `CombatLabView` and an
`x-combat-lab-capability` response header. Subsequent reads/deletion send that
capability in the same request header. Host must match the configured loopback
host/port; any supplied Origin must match `COMBAT_LAB_ORIGIN` (default
`http://127.0.0.1:5173`). Production and disabled routes are absent.

Create is intentionally **not retry-safe**: a lost create response has no
automatic session recovery. The client must show that uncertainty and require
an explicit new start; it must not silently replace an active battle. At most
eight sessions are retained; reads do not advance combat, and process restart
loses all sessions. No action, AI, replay or durable save exists in PB02.

PB03 adds `POST /dev/combat-lab/:sessionId/actions` with `CombatLabAction` and the
capability header. Acknowledgements use 200 accepted, 400 malformed/core-invalid,
403 wrong side, 404 inaccessible or 409 stale/terminal/conflict/limit. Authenticated
retries retain their response until deletion; overflow requests are not admitted.
Only accepted commands enter the replay and full journal.

## Sprite prototype — 2026-10-09

`pnpm dev:combat` starts the isolated DB-free stand. The additive
`sprite-6v6-v1` lab scenario uses `sprite-prototype-v1` core rules; legacy
`m0-3v3-v1` remains available. `GET /dev/combat-lab/catalog` returns the twenty
visual profiles and default mill battle. Sprite creation accepts a validated
versioned custom battle, 15×11 complete map and 1–6 units per side. Its body
limit is 32 KiB; legacy creation, actions and deletion retain 4 KiB.
Unknown fields, duplicate occupancy, blocked unit positions, invalid terrain,
profiles, seed bounds and fully closed retreat edges are rejected before allocation.

Sprite AI advances the existing session on creation and after a fresh accepted
action, before saving its receipt, until a human activation or terminal result.
At that delivery the command bound was 128 per continuation (superseded by
the v2 amendment below). GET and duplicate receipts
never advance AI. `GET /dev/combat-lab/:sessionId/replay` requires the same
capability and exports detached setup plus both sides' accepted commands.
Projection exposes accepted custom setup, profile names, canonical move/attack
previews and terrain/fire summaries. Existing nonproduction/loopback/Host/Origin,
capability, session and replay limits remain in force. The historical PB02
limitations above describe that delivery, not the current sprite scenario.

No database, migration, runtime dependency or campaign mutation is introduced.
Special creature powers, tether, panic/surrender and announced intent/retargeting
remain outside this prototype. Verification is recorded in
[the owning page](../../../../docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09).

## Sprite v2 improvement — 2026-10-12

New custom battles retain the lab scenario/transport v1 and choose core
`sprite-prototype-v2`; historical setups/replays keep their recorded rules.
Tactical AI runs only in v2, following canonical special/panic commands first.
The scheduler records ordinary `wait` for a controlled zero-AP activation and
canonical panic escape/surrender for either side, before saving the receipt.
Reads and historical retries do not run the scheduler. Projection exposes
ruleset, panic/escape, declared threat and movement reaction forecasts.
The continuation budget is the remaining whole-battle limit of 4,000 commands.
A valid fully panicked four-human corridor requires 240 forced commands to the
round-60 outcome; the earlier 128-command continuation would strand creation.
Static terrain must connect all starting figures; temporary occupancy is ignored.
This deliberately rejects isolated ranged-only arenas in this local editor.
No production encounter, campaign storage, migration or captive custody is added.
[Parameters and actual acceptance](../../../../docs/wiki/battlefield-test-maps.md#алгоритм-доведения-боёвки--2026-10-12).

## Sprite v3 — 2026-10-13

New custom sessions choose `sprite-prototype-v3`; replay dispatch retains the
recorded v1/v2 semantics. Units accept a finite skill-rank map (five known IDs,
integer ranks1–3). Canonical use-skill commands validate learned rank, equipment,
actor/side/target, AP/stamina/range/LOS and terminal/panic state before mutation.

The client sends `autoplay` intent; the server chooses one tactical canonical
command and continues normal opponent/forced turns. The pure core helper can
advance one command, one activation or to resolution, with an explicit whole-
battle command-limit result. Transport adds no alternate damage/RNG simulator.
Capability, revision, activation and exact request/body retry checks remain in
force; reads/duplicate receipts never advance AI.

Projection publishes finite learned skills/previews, optional rule hints and
current guard damage reduction from core rules. These are derived public view
fields, not replay state. Web has no game-core dependency. Static connectivity
is admitted by server validation; the editor validates structure locally and
retains the draft when server creation rejects it, with a visible explanation.
No migrations, campaign writes or new runtime dependency.
[Current implementation, checks and limitations](../../../../docs/wiki/battlefield-test-maps.md#реализация-тз-sprite-v3--2026-10-13).

## Selected weapon inspection — 2026-10-13

The pure `previewCombatWeaponReach(state, id)` supplies detached optional
`units[].weaponReach` for each active unit in an active sprite battle,
independent of turn ownership/AP/stamina. Blocked cells are excluded and bows
retain canonical LOS. This is inspection, not attack admission: only
`attackPreview` permits an ordinary current target. No RNG/state/replay change.
[Journey and current integration limits](../../../../docs/wiki/battlefield-test-maps.md#дальность-выбранного-оружия--2026-10-13).

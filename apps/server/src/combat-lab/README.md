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

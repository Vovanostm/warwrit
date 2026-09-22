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
All units visible and no human countdown are lab-only. No routes, store, scheduler or mounting exist.
This is disposable diagnostics, not Company/M1 completion or a substitute for Colyseus/PostgreSQL.

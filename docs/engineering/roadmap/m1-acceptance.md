# M1 player acceptance and running it

## Status and next action — 2026-11-08

Full integrated M1 journey and final owner acceptance remain unproved here.
September requirements below are a dependency baseline, not fresh measurements
or mandatory tool gates. For the requested journey, use the current
[playtest document](../M1_LOCAL_PLAYTEST.md), [local setup](../LOCAL_DEVELOPMENT.md)
and [M1 specification](../../wiki/m1-spec.md). Refresh only affected evidence.

## Demonstration and completion criteria

QA00 prepares an actual browser runner, traces, ports and disposable database fixtures. QA01 then documents one working local launch only after the integrated server, database, identity, realtime, world, content and UI can start. QA02 exercises two-browser company/travel/contract/battle/proof/payment/re-entry and failure paths; QA03 tests real process crashes and competing actions/claims; QA04 measures privacy, input limits and renderer performance on the named Mac; QA05 records the owner's Mac playtest and actual player comprehension/turn evidence. M1-ACCEPT reads those results with the full indexed criteria. No runnable final launch instruction or owner playtest is currently proven.

Use small, nonduplicative public-invariant tests for deterministic replay, money/item conservation, authorization/privacy, atomic rejection/idempotency, serialization and real transaction/migration behavior. Do not add a test for each helper or substitute structural snapshots for gameplay evidence. Under current [AGENTS.md](../../../AGENTS.md), CI/full suites/stress/bootstrap
are advisory. Use focused checks for concrete risks and record actual outcomes;
skipped advisory checks alone do not block publication or an authorized merge.
Browser, Mac, human, frame-rate and server-capacity evidence need their own measurements. No fixed PR line cap applies; keep changes cohesive and reviewable.

The original source ZIP concordance remains `NOT_RUN` / `RC-GAP-MACHINE-01`. Missing archives do not permit reconstructed canon or claims that historical catalogue checks ran. Deployment, paid resources, production load and M2 scope are separate from local alpha acceptance.

Record actual results and residual gaps in the owning playtest/feature document.
Check off full M1 only after its accepted player criteria are demonstrated.
[ROADMAP](../ROADMAP.md) · [navigation rules](README.md)

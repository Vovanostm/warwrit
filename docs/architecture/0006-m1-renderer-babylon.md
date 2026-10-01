# ADR-0006: Select Babylon.js for the M1 client renderer

- Status: Accepted by explicit owner decision
- Date: 2026-10-01
- Supersedes: ADR-0005 and the renderer-selection portion of ADR-0003
- Canonical technology decision: Airtable `recwglYVX3nGfu2Xh`, dated comment `comQqbxYUO8vnskTV`
- M1 index pointer: `recZhUoTiwT7kIc8s`, dated comment `comDtWL5Oyred7tWJ`

## Decision

The owner stated: «Выбор - Babylon.js. Сохрани его.» Babylon.js is the selected
production M1 client renderer. This owner decision is not a benchmark victory.
The prior PlayCanvas selection and requirement to rerun an engine-selection
comparison are superseded.

The exact Babylon.js dependency version is not selected by this ADR. The prior
spike used 9.28.0; inspect the installed lockfile, package metadata and local
types before implementation or version-sensitive API use.

## Boundaries and acceptance

Keep Babylon.js at the web rendering adapter beside React/Vite. Preserve the
pure deterministic `game-core`, versioned `protocol`, Fastify, Colyseus,
PostgreSQL/Kysely/`pg`, and existing application boundaries. Babylon objects,
browser I/O, time and randomness do not enter `game-core`.

Selection does not establish implementation or acceptance. Babylon visual
quality, animation/art pipeline, target-device behavior, runtime/performance,
and production integration remain pending (`NOT_RUN` unless separately
evidenced). Engine competition is not a prerequisite to implementation or a
reason to reopen this choice; address a demonstrated Babylon acceptance failure
within the owner-approved decision process.

Historical PlayCanvas code and measurements remain intact as historical evidence.

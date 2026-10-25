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

## Visual direction — 2026-10-01

The owner stated: «Спрайтовая, 2.5 D графика». The primary M1 presentation is
sprite-based 2.5D; Babylon.js remains the selected renderer. This supersedes
full-3D character miniatures as the required default and any competing visual
pipeline gate before first playable. Pixel style, camera angle, normal/depth
maps, direction count and asset recipes remain unspecified; implementation is
pending.

## Art style and camera — 2026-10-02

Owner decision after the Codex style gate (`assets/art/m1/style/`): unit art
uses style C, ink line with flat wash («C — чернила»), sharing the painted
riverbank tile and leader portrait palette. Camera: fixed 3/4 isometric view
with pan (mouse/WASD) and wheel zoom, no rotation («Фикс. 3/4 изометрия»), so
sprites need one facing angle. Normal/depth maps and the production asset list
remain to be specified.

## World map direction — 2026-10-01

The owner stated: «Карта мира - глобальная карта, на которой перемещаются npc и
игроки по аналогии с battlebros / heroes». Primary world navigation uses a
global map with moving NPC and player parties, consistent with the selected
sprite-based 2.5D Babylon presentation. The analogy does not decide turns versus
real time, scale, fog/visibility or new rules; lawful-knowledge and server-state
boundaries remain unchanged. Implementation is pending; no ready map is claimed.

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

## Sprite combat production amendment — 2026-10-09

The owner reports that the current 3D work is not producing satisfactory results
and explicitly asks to focus combat on sprites, interesting battle locations,
hexes and mechanics. This cycle returns character production to the sprite
direction while retaining Babylon.js, fixed 3/4 camera and the approved ink
style. Preserve existing 3D experiments and dated work-package history.

First stage: agree the specification, overall battle screen and style using one
warrior and one creature sample; generate the twenty individual concepts only
after that agreement. The owner selected Battle Brothers' position, weapons,
fatigue and morale as the combat foundation, six units per side, and a scenario
builder for selecting opponents. The [owning specification](../wiki/battlefield-test-maps.md#спрайтовая-боёвка-тз-этапа-1--2026-10-09)
records the confirmed D1–D12 matrix and selected art/stand roster. The owner
subsequently approved mill direction, dark B053 and fighter C as W01 foundation,
80 px/15×11, four AP, escape/surrender, one warned retarget, heights/mud/fire.
This cycle uses only static full-body sprites; frame animation is later work.
Twenty individual static asset tasks may proceed after this style agreement.
Balance values, archived creature biographies and renderer changes are not approved.
Concept generation is not integrated visual or gameplay acceptance.

## 2D art direction amendment — 2026-10-25

The owner selected **«Сдержанный графический роман»** as the main style and
**«Туман и мокрый камень»** for some locations. For new 2D illustrations and
sprites this supersedes style C as the primary rendering-density reference;
irregular ink, flat/matte washes, grounded dark fantasy and credible materials
remain. Use broad calm forms and selective focal contrast, not uniform fine
texture or a global contrast filter. The
[owning decision](../wiki/vision.md#основной-стиль-и-профиль-локаций--решение-2026-10-25)
and `assets/art/styles/{graphic-novel,fog-wet-stone}.json` identify selected
references and generation templates. The second profile is an explicit
location/environment override, not an automatic biome rule.

This selects art direction, not new lore, production-ready sprites or runtime
acceptance. Opaque study images establish rendering language; sprite alpha,
view projection, scale, pivots and integrated day/night readability still need
verification. Existing renderer/camera decisions and the separately owned
3D-character experiment are not changed by this amendment.

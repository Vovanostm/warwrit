# WLC-08 — Real M1 journey and consolidation acceptance

Owner assignment, 2026-11-08, P0; dependencies WLC-02–07. Writer/coordinator:
`codex/wlc-08-integration`, `.claude/worktrees/wlc-08`. Implementation, integration,
isolated QA, documentation, GitHub PR and Airtable synchronization authorized.
Merge, deployment, auto-merge and paid provisioning are not authorized.

## Scope and player result

Prove the ordinary persistent company loop on the integrated candidate, without
editing account/company/world/time/combat state. Start with local Dex OIDC and a
new company, equip, buy provisions, accept authentic contracts, physically travel,
enter actual PvE through normal admission and use the ordinary HUD. Preserve the
real outcome and casualties; obtain physical proof, return/present, receive one
lawful reward, treat/rest/pay, take another contract, restart and sign in again.
Refusal must explain its prerequisite; lost replies/exact retry and reconnect must
retain server-owned results once. A defeat is a real outcome, not a passing proof/
payment journey. Missing wounds cannot be fabricated to claim treatment coverage.
The full accepted M1 scope still includes the roadmap's company/content/co-op criteria.

Also check Combat Lab setup/activation/manual/autoplay/replay/cleanup and World/
Battle Map drafts/validation/export/invalid-publication refusal. Developer scenarios
are isolated in `playground`; their combat does not establish campaign acceptance.
Retain versioned replay, saves, archived provenance and dated owner decisions.
Remove stale operational guidance, preserving local UI acceptance for damaged journeys.

## Candidate and dependency boundary

Base `fdbb0dc2764803a28098ad3f85985a02c8122ece` (main at initial live readback).
WLC-02 PR420, WLC-03 PR421, WLC-04 PR424 and WLC-05 PR426 are merged there.
WLC-06 PR428 head `d2d82bc3340f6546aa04f2a447c778ce0d617d58` and WLC-07 PR429
head `b58c87ce3f489484a9fd8cdf1eecf2efd8c6203b` are OPEN/NOT_MERGED. They are
explicitly included in this integration branch, without changing either writer's
branch. Their earlier results do not prove this new combination. Local integration
commits `f2cf972e` and `da3e8174` preserve both histories; only additive documentation
conflicts required resolution. Final checked executable SHA is recorded below.

Version pointers (read directly from this candidate):

- `assets/manifest.json`, schema1, active runtime revisions and archive source links;
  current world raster `atlas-v6`, saved namespace `world.porechye.atlas-v1` retained.
- Campaign/Combat Lab `m1-domain-bridge-v5`; historical M0/sprite replay versions retained.
- Playground schema2, `playground-v2:m1-domain-bridge-v5`.
- Map artifact schema1, `map-v1:atlas-v6:sprite-prototype-v4`; published content
  applies to new worlds only and is never assigned to existing saves by the editor.
- Ordered migrations0001–0023; no released migration changed.
- Pinned Node24.20.0 / pnpm11.25.0, frozen existing lockfile; Babylon is the renderer.

## Owned resources and reproducibility

Dedicated Compose project `warwrit-wlc08-20261108`, PostgreSQL54808, Dex55808,
API33808, realtime33809, web53808. Generated ignored `.env` and Dex config follow
[the isolated ordinary setup](LOCAL_DEVELOPMENT.md#isolated-ordinary-game-worktree--176)
with these matching ports. `pnpm install --frozen-lockfile`, `pnpm db:up`,
`pnpm db:migrate:up`, `pnpm dev` launch the ordinary game. The original dirty
checkout, other stands and saved companies are untouched. Graph index refers to
the original old checkout, so discovery here uses owning source and `rg` fallback.
Raw logs are ignored under `output/wlc08/`; durable summarized evidence lives here.

## Results in progress

Status: LOCAL / IN_PROGRESS, NOT_MERGED, M1 NOT_ACCEPTED. No historical green CI
is used as fresh evidence. Checks below are local observations unless named otherwise.

- Frozen dependency install PASS; normal launch/readiness PASS.
- Clean database migration up0001–0023 PASS. Existing migration smoke reproduced
  a real stale-catalogue failure: expected list stopped at0019. Updated expected
  migration order and rolled back0023→0020 before all existing older data-preservation
  tests. The same empty database then passed full smoke/up/down, including preserved
  legacy encounters and all previous rollback refusals. Playground schema removal
  additionally preserves public encounters. No migration or saved-data change.
- Ordinary Dex player-one sign-in, new company «Приёмка WLC08», leader «Дозор»,
  Rell/Mora, all9equipment commands, provisions purchase and authentic local mill
  contract PASS. Opening cash800, rations27 after upkeep; purchase40 gives cash760,
  rations37 and settlement stock290. Travel to Kamenny Brod accepted normally.
- Fresh battle/proof/payment/care/payroll/next-contract/restart, all resilience,
  integrated Playground checks, static checks, production artifacts and full
  final acceptance remain pending / NOT_RUN until their observed results are added.
- Payroll requires natural day2/tick0 (six real hours from world genesis).
  No clock or persisted-state edits substitute for that observation.

### Integration defects and corrections

The standard web build with the ordinary local `.env` (`NODE_ENV=development`)
produced executable Playground chunks. This is a reproduced production-isolation
defect despite prior candidate artifact claims. The web build command now pins
`NODE_ENV=production` for Vite, preserving normal development behavior and using
Vite's existing dead-code elimination. Fresh artifact results follow below.
Removed six unused exports left by retired editor paths (two become private;
obsolete map-draft helper/type, unused drawing pace constants and type re-export
are removed), plus stale Fallow paths. The sole repository formatting failure
was corrected without changing that test's behavior.

The first ordinary unit command accidentally inherited the gameplay stand's
DATABASE_URL. It was stopped and is INVALID evidence; a later SQL read retained
the same ordinary company/revision and no encounters. SQL checks use the existing
integration runner with independently migrated per-file databases. No world reset
or manual repair of the ordinary company was used.

## Documentation and visual gate

Current README/docs map/roadmap now point to the ordinary game, selected Babylon,
protected Combat Lab and unified editor. ADR0003's old renderer competition is
explicitly SUPERSEDED by ADR0006; its historical rationale remains readable.
WLC-05's foundation description is marked historical rather than an active editor
instruction. AGENTS and relevant skills follow optional independent review and
advisory CI. No global visual BLOCKED prerequisite was found in executable scripts/
CI; existing BLOCKED_ENV reports describe scoped missing resources, not art gates.
Concrete critical UI defects still prevent acceptance of their affected journeys.

## Remaining acceptance and M1 gaps

Do not close WLC-08 or claim the consolidation programme complete until the full
fresh journey, resilience, integrated Playground and required artifact checks have
actual evidence at the checked revision. WLC-06/07 remain unmerged dependencies.
Existing broader M1 requirements (eight authentic contracts and branches, physical
owner/helper, company service/learning/remaining inventory, privacy, backup/restore,
device/performance and owner comprehension) retain their owning roadmap issues.
FPS/capacity/heap/enjoyment NOT_MEASURED; no deployment or owner acceptance inferred.

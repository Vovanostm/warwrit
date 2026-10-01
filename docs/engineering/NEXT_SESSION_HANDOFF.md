# Next-session handoff: full Warwrit M1 alpha

**Renderer decision — 2026-10-01:** use Babylon.js as the owner-selected M1
client renderer per [ADR-0006](../architecture/0006-m1-renderer-babylon.md).
Do not reopen engine selection. Its exact version and visual/device/runtime,
art-pipeline and production integration acceptance remain pending; this is not
a benchmark victory. Preserve historical PlayCanvas evidence as history.

Status: 2026-09-30, updated after W03 restart/replay review. This is a portable
session checkpoint, not product authority or a claim that M1 is complete.
The persistent travel journey now survives an API process restart, completes
both route edges, and accepts an exact stored replay without changing measured
durable state. Sol's frozen result is `READY_WITH_EXPLICIT_UI_GAP`; authenticated
visual logout/re-entry is still **NOT_PROVED**. See the exact
[restart evidence](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/output/playwright/m1-w03-restart/w03-process-restart-evidence.md)
and later [replay/re-entry evidence](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/output/playwright/m1-w03-restart/replay-reentry-v5/evidence.md).
The v5 replay supersedes the earlier 403 replay attempt recorded in the first
report; it does not close the UI gap. Continue from the canonical
[CURRENT_PLAN](CURRENT_PLAN.md), active c06 checkout's CURRENT_PLAN and
[parallel queue](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/docs/engineering/PARALLEL_WAVES.md),
root [AGENTS.md](../../AGENTS.md), and linked canonical M1/source records.
The original ZIP concordance remains RC-GAP-MACHINE-01 / NOT_RUN; label new
authored derivatives and do not reconstruct the missing archive catalogue.
Read changed checkpoints and re-check live GitHub, checkout identity, dirty
state, ownership, agent capacity, ports, and databases before code or delivery.

The world slice's authority sources are the Airtable base
`apph3bj1NyVrfJeLM`, [WORLD record recTrujX2wy7V49qk](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recTrujX2wy7V49qk),
[accepted route approval rechIKj0hsvfXIvFU](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/rechIKj0hsvfXIvFU),
[lore amendment recQNKqYfwoJpCXVu](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recQNKqYfwoJpCXVu),
and [M1-WORLD-FOUNDATION.md](../work-packages/M1-WORLD-FOUNDATION.md). Read
their full applicable Notes/Purpose amendments before implementation; do not
treat this summary as a replacement contract.

## Persistent goal

Use this objective in the existing Codex goal, resumed by the owner on
2026-09-30; do not create another Codex task or duplicate tool goal for the same
work.

> Deliver the owner's complete persistent M1 alpha on the owner's Mac. The same
> account and company must survive company creation, world travel, an authentic
> contract, physical two-company PvE, proof presentation, lawful payment and
> consequences, durable save, and re-entry into the same world. Include the
> initial region (one city, three NPC villages and one dangerous site), eight
> contract instances across HUNT, INVESTIGATE, and RESCUE, three templates,
> eleven scenes, four reusable backgrounds, six portraits, two trophy images,
> and three enemy archetypes; provide one runnable local startup and a clear
> manual-test guide. Preserve original grim painted/ink Knight, Rogue and
> Barbarian art, the separate Campaign Day and Light clocks, and the accepted
> server-authority, privacy, money, item, idempotency, and
> migration rules. Stop only after an exact integrated tree passes the clean
> final gate (`pnpm verify`, `pnpm test:combat:stress`, and
> `pnpm test:migrations`), plus real browser, persistence/process-restart,
> race/privacy and owner Mac playtest evidence for the full journey. Keep M2
> public MMO, PvP, trading and 50–100 CCU proof out of scope.

The stop condition is the complete authored and playable journey, not the first
travel, battle, contract, successful unit suite, or company re-entry demo.
Canonical requirements and detailed policy stay in the M1 source records and
CURRENT_PLAN; this handoff does not create a second game specification.

## Current proof and checkouts

Earlier safe-travel core checks remain narrowly scoped and locally source-reviewed.
The completed W03 source packet is frozen at contract SHA-256
`50c179e80b429bfbdb86c463cfc5ac06cc6a0494c4b1450d0b98c88989ca7e71` and
16-path manifest SHA-256
`30d8bbcba136f17a569d1804154d9260281cb6385646582ca561060e81a5c21e`.
The c06 checkout remains
`/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06`, branch
`codex/m1-company-storage`, HEAD `4489db47728d1b72794436df8eafb0cfdbd97d31`.
W03 executor/index/protocol/world/web ownership is released to the parent and
reassigned; do not reopen its paths. The current large-cycle block is the
durable company/world foundation. Keep W04/CT02 and JOIN gated on actual H/I,
ID03, W05/W06 and K02 producers and their verified consumer evidence. The exact
active writer and path ownership are in the c06 [CURRENT_PLAN](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/docs/engineering/CURRENT_PLAN.md)
and [PARALLEL_WAVES](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/docs/engineering/PARALLEL_WAVES.md).

In the c06 checkout,
`pnpm --filter @warwrit/game-core build` and
`pnpm --filter @warwrit/testkit build` exited 0; the latter preceded a final
test-only finance fixture correction, with build inputs unchanged. The combined
world-route, company-lifecycle and company-physical specs passed **37/37**;
scoped `git diff --check` passed. These checks do not prove server travel,
PostgreSQL transaction behavior, browser travel, the exact final tree, or M1.

The reviewed source hashes are:

| File                                                  | SHA-256                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/game-core/src/company/lifecycle.ts`         | `3b617d01e8dc669872d5b4325c167e623d8d4cc9f1a1f018096136131978f625` |
| `packages/game-core/src/company/physical-recovery.ts` | `6bf3ee5e5c2555dba1eb14ac83fcd058fcaddf441848efd0c03f409e371ffb5d` |
| `packages/game-core/src/world/route.ts`               | `3b4c235abd8ebe658a7747457d287aef3b76ff5b888c586e39d0890973163045` |
| `packages/game-core/src/company/physical-food.ts`     | `a76027c349a4815fcabe543a03e09110045b703ae27f0e1a3b8124e93a657684` |
| `packages/game-core/src/world/travel.ts`              | `b9d57cf0d2f3cf7c29d16a59be2f3b818d27f1542c9b8a2b8e7faf9e9f3b1193` |
| `packages/testkit/src/world-route.spec.test.ts`       | `cdae7743f0c8e1eebefed9674aa330c8a2868898737fb17c0860c10ff47bf224` |

Last observed c06 checkout: `/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06`,
branch `codex/m1-company-storage`, HEAD `4489db47728d1b72794436df8eafb0cfdbd97d31`,
13 commits ahead of its stale local `origin/main` ref at `307810db`; broad dirty
H, protocol, UI, launcher and planning work is present. Do not reset, rebase,
clean, or broadly stage it. The last live main readback was
`fee0d6f5957f2619ea01f59d71dc75b2a71dd1b6` on 2026-09-29; refresh before using
it for any delivery decision.

The W03 code paths and mutable resources are no longer assigned to the travel
writer. The isolated travel database and Dex were retained; API and Vite were
stopped after evidence capture. The prior disposable actor fixtures were rotated
after an operational exposure; evidence contains no secrets. Never search `.tmp`
broadly: inspect only explicitly named metadata paths. Parent owns any future
service/database/browser lifecycle and integration.

The primary documentation checkout is
`/Users/vovanostm/learn/warwrit`, branch `chore/claude-harness`, HEAD
`4d9a818c4b35dfa53259cfc7a9543292624eee88`. Preserve its unrelated dirty
Codex configuration, role files and planning edits, including the separate
PR132 work; do not assume this local HEAD is published.

The separate ink checkout is
`/Users/vovanostm/multica_workspaces_local/warwrit-alpha-contracts`, branch
`codex/m1-ink-visual-prototype`, HEAD
`307810db010913189fd855b62f91382a321e5bcd`. Frozen tracked diff SHA-256 is
`6b5300d73098a99358f7ecd8cbfd0a3c6b4920b2125490a5384dc2247653d132`; current
source hashes are scene `e272dd9c1032d215303b6dc0b56e223fbee2184f21cf38856ad986e5f4e49169`,
main `6438949d0e38586592bf554a0237660d32c34e2c4c325bb9da677b5df7ae9008`, and
style `08453d0e4cc9a69c0ccb3a86e0566926853b9e768496fd5343711e6e0b86ba69`.
Historical INK04 alpha-mask and partial-alpha overlap picking passed on scene
`718321ad4afabd3d12a97d5f80024e07735352a2bb644b580215eebf7326c6c9`; INK05
also spot-checked transparent-margin rejection and opaque-Knight selection on
the current source. A fresh current-source overlap/transparent/opaque mouse
proof is READY in the [report](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-contracts/output/playwright/ink04-current-overlap/report.md),
with sanitized [probe and action results](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-contracts/output/playwright/ink04-current-overlap/probe-actions.json).
At the probed overlap, the nearer valid blue Knight won; the transparent margin
left selection empty and the opaque Knight selected. Port 5192 and the named
browser session are released. Keyboard, comprehension, ART04, performance,
production renderer acceptance, and full M1 remain **NOT_RUN**. This is
prototype sprite-picking evidence only; no INK04 source change was made here.

## Current authority, proof boundary, and dispatch

Last verified live main is `4ec0be677f4c899e726b74f011c8c2fadefbc738`;
PR133 is merged with CI `36710889918` passed, while PR134 and PR129 were open
with failed CI at that readback. This is not a live refresh. The primary
documentation checkout remains dirty at
`4d9a818c4b35dfa53259cfc7a9543292624eee88`; preserve unrelated Codex harness,
role/config and planning work. c06 remains dirty and must be preserved. These
facts are a checkpoint, not authorization to merge or publish.

The c06 checkout is `/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06`,
branch `codex/m1-company-storage`, HEAD
`4489db47728d1b72794436df8eafb0cfdbd97d31`; the separate contracts checkout is
`/Users/vovanostm/multica_workspaces_local/warwrit-alpha-contracts`, branch
`codex/m1-ink-visual-prototype`, HEAD `307810db010913189fd855b62f91382a321e5bcd`.
Older 37/37 core hashes and checks remain evidence only for that unchanged core
slice. W03 server travel, PostgreSQL execution, process restart and exact replay
are now evidenced in the reports linked above. Authenticated visual UI re-entry,
the integrated production renderer, full M1 journey and final gate remain open.

The owner resumed the existing goal; do not create another goal or task for the
same objective. The current runtime
ceiling is 13 total slots including the parent (12 child slots). This is a
ceiling, not staffed capacity or evidence that filling slots is useful. Earlier
references to parent plus two child slots are superseded. Keep Astra orchestration
and Sol's read-only review capacity reserved; the parent owns product decisions,
shared schemas/transactions, resource assignment, integration and final evidence.
One independently assigned Luna writer owns each exact packet. Rami Ismail's
second comparable unit supports second-unit authoring/integration timing only;
review, rework, blocked time and integration measurements here are local
adaptation.

### Next concrete cycle

The active large block is the durable company/world foundation. The assigned
company/server/protocol/core writer owns its exact producer paths; a separate
production UI writer is pending checkout/resource confirmation. Keep the work
at the vertical foundation level until a same-company durable world journey and
its truthful UI consumer can run together. Then move to one authentic contract
through physical JOIN/battle, proof, lawful settlement, consequences and
re-entry. Do not activate CT02/JOIN before the named H/I/ID03 and W05/W06/K02
producers exist and their actual consumer subset is verified.

Babylon.js is the owner-selected M1 client renderer under
[ADR-0006](../architecture/0006-m1-renderer-babylon.md), superseding the
PlayCanvas selection in ADR-0005. The exact Babylon dependency version and
package migration remain pending, as do visual/device/runtime, art-pipeline
and production integration acceptance. Preserve the PlayCanvas implementation
and measurements as historical evidence; they do not establish Babylon
acceptance. The production UI logout/re-entry gap remains open, and Colyseus
journey wiring remains fixture-gated. Keep these gaps visible in the production
UI cycle.

### Safe-travel execution contract and protected resources

Use the finite initial FIELD trip `severny-dvor` → `kamenny-brod` over
`kamenny-brod-severny-dvor`: 10 ticks (3m36s). Preserve the 1000-tick Campaign
Day and independent 600-second day / 300-second night Light cycle, existing
food/stamina owners and confirmation-bound company-opening evidence with fixed
IDs/seed and retained issuance.

`GET /world/party` returns
`{schemaVersion,worldTick,publicRevision,party:null|{partyId,location,memberIds},route:null|{routeEpoch,segmentId,edgeIds,regionVersion,profileId,startedAt,dueTick,remainingTicks,canArrive}}`.
`POST /world/travel` carries
`{schemaVersion,commandId,expectedPublicRevision,expectedRouteEpoch,action:{kind:DEPART,edgeIds}|{kind:ARRIVE}}`.
Server identity/time and segment UUID are authoritative. Replay an exact receipt
before freshness guards; keep internal root CAS separate from the public
revision guard. Commit the root, accepted route metadata and events in their
owning stores together with the receipt in `world_route_receipts`, in one
transaction. Early arrival
rejects without mutation; normal or late arrival settles only through stored
`dueTick`.

The c06 identity database and browser services are shared protected resources:
Fastify 5190, Vite 5191, ink view 5192, user page 5187, Dex
`warwrit-alpha-c06-dex` 5559, PostgreSQL
`warwrit-alpha-company-h-postgres-1` 32778, shared identity 55433/5557. These
ports and services require fresh owner checks; historical HTTP 200 results are
not current availability. Do not stop, restart, recreate or clean them without
fresh ownership confirmation. Do not print or copy
`.tmp/c06-identity/app.env` or `.tmp/c06-identity/dex.yaml`. Protect all
accounts and player two's company
`f74d5051-2fb2-46bf-b1d3-587bc76e658a`. The c06
[local playtest guide](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/docs/engineering/M1_LOCAL_PLAYTEST.md)
owns the exact existing local commands and cleanup conditions; the prior
disposable pre-fix cleanup was not performed.

A packet is READY only when its checkout is identified, prerequisites and full
contract are read, exact write paths are disjoint from active writers, and every
needed shared resource has a named owner and a fresh availability readback.
There may be ten or more queued packets without fabricating simultaneous
readiness. No new staffing infrastructure is authorized or needed.

### Copyable session kickoff

> Continue the existing resumed goal: deliver the full persistent Warwrit M1 alpha
> on the owner's Mac, stopping only after the full journey, exact integrated
> tree gate, real browser/persistence/restart/race/privacy evidence and owner
> playtest pass. Do not create a duplicate goal or task. Read the updated
> CURRENT_PLAN, M1_PRODUCTION_PLAN, this handoff and the
> full active contract/source amendments. Refresh `pnpm agent:preflight`,
> `pnpm agent:status`, checkout identity, dirty paths, live main/PR/CI and
> resource ownership before edits. W03 travel has completed its restart and
> exact-replay proof, with Sol's `READY_WITH_EXPLICIT_UI_GAP` verdict; visual
> authenticated UI re-entry remains unproved. Do not reopen its released paths.
> The active large block is the durable company/world foundation on c06; read its
> current assigned source contract and exact writer paths before contributing.
> The production UI writer is pending exact checkout/resource confirmation. The
> next large block is one authentic contract through physical JOIN/battle, proof,
> lawful settlement, consequences, save and re-entry. Keep CT02/JOIN gated on
> actual H/I, ID03, W05/W06/K02 producers and verified consumer evidence. Preserve
> all dirty work and private local data. Parent owns integration and shared
> resources. Run the full clean gate only on the final integrated tree. Report
> skipped or failed checks as `NOT_RUN`, never a pass. Checked mission PR merges
> are authorized under CURRENT_PLAN after exact
> head/base, review, unresolved-thread and CI readback plus actual-main
> verification. Auto-merge, deployment and paid provisioning remain separate
> decisions.

## Final evidence boundary

Use `scripts/bootstrap.sh` for the final exact-tree clean gate: `pnpm verify`,
`pnpm test:combat:stress`, and `pnpm test:migrations`, once. Record tested HEAD
and tree, exact commands, outcomes, and any `NOT_RUN` evidence. Keep focused
unit/build results, real database transaction/restart, real browser behavior,
renderer measurements and human Mac playtest distinct. A health check is not a
restart; a fixture battle is not physical JOIN; a green test suite is not M1.

Before implementation read the full active work-package contract and dated
Purpose amendments through `warwrit-context`; use the relevant existing
`warwrit-domain`, `warwrit-review` and `warwrit-delivery` skills on demand.
The official Codex research note is
[CODEX_GAME_DEVELOPMENT_2026-09-30.md](research/CODEX_GAME_DEVELOPMENT_2026-09-30.md).
External workflow examples do not change product rules, technology decisions,
or the test policy.

## Short checkpoint format

At each bounded checkpoint record: absolute checkout/branch/HEAD/tree; owned
paths and live resources; implemented versus prepared work; source to observable
proof; exact commands and outcomes; unresolved dependency; one next action.
Keep the log brief and point to captured evidence instead of copying whole plans.

# Changelog

Notable changes to the repository's tooling, gates and delivered behavior. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project has no released versions yet, so entries stay under _Unreleased_ with
their merge date. Earlier history is in the Git log and merged pull requests.

## Unreleased

### Added

- 2026-10-05, branch `codex/map-topology-experiments`, local (started 2026-10-04): owner-requested
  implemented comparison of square and six-neighbor hex navigation over the same
  exact geometry, roads and speed policy. Static road-edge costs and surface
  priority preparation are retained per field. At this stage, production kept
  square search and hex was opt-in; the later owner decision under Changed
  supersedes that default. Persisted V2/V3 plans remain unchanged.
  101 cases × 3 interleaved repeats: optimized square keeps 297/297 successful
  paths/durations, p95 175.96→100.09ms; hex p95 90.96ms but mean/worst travel
  duration +1.32%/+9.32%. Adds the finite reproduction script and measured case
  evidence; extends existing road-detour/thin-bridge specifications.
  [Owning results and limits](docs/wiki/m1-spec.md#эксперимент-и-реализация--2026-10-04).
  Final bootstrap PASS (verify 631/47 skipped, stress 10000, migrations/auth 14);
  separate movement PostgreSQL 11 and domain 20 PASS. Move/STOP/reload/reroute
  inspected independently from captures/response evidence; no confirmed new
  navigation defect. Historical failed attempts/limits remain in the owning page.
  Adds `experiment:navigation` in package.json. No migrations, deployment or
  merge; local uncommitted isolated checkout only, primary writers preserved.

- 2026-10-04, originating branch `main` at `bcc30f5`, local: owner-requested
  [global-map topology research and proposal](docs/wiki/m1-spec.md#19-гексы-устройство-глобальной-карты-и-генерация--2026-10-04)
  compares hex authoring, exact movement, terrain blending, current weighted
  search and future generation using current source and primary references.
  Recommends keeping continuous movement/exact roads and measuring search before
  changing topology; updates `CURRENT_PLAN` and wiki log. 100-goal source probe:
  98 paths/2 blocked goals / 0 errors, p95 1014.78ms under concurrent local builds;
  isolated performance/hex benefit NOT_MEASURED, game tests/browser/critic NOT_RUN.
  Documentation readback, local links and scoped diff checked. Changes are only
  in an isolated documentation checkout due to primary shared-file writers;
  NOT_INTEGRATED, uncommitted/unpublished. No game or save changes.

- 2026-09-29, #125: fallow (`pnpm check:dead-code` in `pnpm verify`,
  `pnpm check:changes` on pull requests, `pnpm report:quality`) and ast-grep
  code-shape rules with rule tests (`pnpm check:patterns`).
- 2026-09-29, #128: `pnpm test:coverage` (v8, no threshold) as evidence for
  `fallow health --coverage`; specifications for encounter HTTP authorization,
  the encounter command guard and duty-change learning settlement.

- 2026-09-29: `pnpm agent:status` prints live main, CI, open pull requests,
  active unmerged branches with their paths and the next migration number from
  git and gh, replacing hand-written status readback.
- 2026-09-30, #133: Git `pre-commit` and `pre-merge-commit` hooks run
  `pnpm check:changes` for every agent and terminal, not only Claude; Markdown-only
  commits skip. `pnpm install` (or `pnpm run prepare` in an existing clone) sets
  `core.hooksPath`, and `pnpm agent:preflight` reports it. Codex rules prompt on
  `git commit --no-verify`.

### Fixed

- 2026-10-04, branch `codex/supplies-delivery`, published (not yet merged):
  supplies can be bought through the local bazaar/granary with finite merchant
  stock, exact cash and retained retry receipts; future companies start with
  thirty rations and 800–850 crowns after hiring. Opening forms survive definitive
  rejection and refresh expired options before new requests. The proportionate
  party sprite, terrain-grounded ring and draped route share their foot junction.
  Independent review corrected legacy first-POST initialization, remote-cash
  quotes, carried ration ownership, malformed pending purchases, incomplete
  receipts and GAME_OVER purchase controls. A new ordered 0014 migration retains
  shop state and refuses destructive rollback. Scope: company core/protocol/server,
  web opening/shop/map and party art; owner request and actual checks/limits are in
  [M1-SUPPLIES](docs/work-packages/M1-SUPPLIES.md#delivery-amendment--2026-10-04).
  Local verify627/47 skipped, coverage/audit and sequential PostgreSQL17 checks
  passed; independent source/visual critique found no remaining material defect
  in inspected evidence. Final PR CI/merge pending; expired-form browser creation
  remains NOT_RUN. Existing saves and unrelated drafts are retained.

- 2026-09-29, #128: combat initiative ties, AI targets and canonical replay order
  no longer depend on the host locale (`compareCodeUnits`); stress digest
  unchanged for existing ids.
- 2026-09-29, #128: CI now runs the encounter and OIDC PostgreSQL specifications
  in `pnpm test:migrations`; they were skipped because only `DATABASE_URL` was set.

### Changed

- 2026-10-05, branch `codex/map-topology-experiments`, local: final review fixes
  changed-code audit blockers by separating grid preparation and bounded exact
  shortcut selection and sharing the identical legacy span-duration rule in
  `continuous-movement.ts`. Independent revision review found no defect;
  202 exact route/outcome/duration comparisons, 22 focused coverage tests and
  unchanged audit PASS. Earlier loaded-host timeouts remain documented failures;
  PR-head CI and integrated browser acceptance are pending.
  [Owning delivery record](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner authorized
  review, publication, merge and local-main update for the measured hex default
  and routing optimization. Preserve current main's renderer improvements and
  concurrent primary drafts; final review/PR CI/merge remain pending.
  [Delivery checkpoint](docs/engineering/CURRENT_PLAN.md).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner chose hex
  search speed after disclosure of measured ≤7.2% longer trips. New polygon-v1
  orders default to hex; legacy grids and frozen accepted V2/V3 plans remain.
  Compile sorted neighbors/exact costs once and check ≤16 exact terrain-detour
  candidates before accepting direct smoothing. Eleven of 99 hex routes improve,
  none regress against previous hex; case 51 saves 22.85s. Matched 101×3 typical
  search 29.61→27.24ms, p95 essentially unchanged 219.85→217.97ms under variable host
  load. Updates existing movement specs to public exact-surface queries and adds
  a two-topology terrain regression. Core/tests/experiment and owning docs only;
  no migrations, publication, merge or deployment. JSON spec 3.5.1 records the
  owner decision with historical topology retained. Final bootstrap: 633 tests,
  47 skipped, 10,000 stress battles and migrations/14 DB checks PASS; normal STOP/reload/reroute/arrival
  and independent supplied-evidence critique pass within inspected scope.
  [Results, checks and limits](docs/wiki/m1-spec.md#почему-гексы-и-оптимизация-маршрутов--2026-10-05).

- 2026-09-29: local containers run on colima; see
  [LOCAL_DEVELOPMENT.md](docs/engineering/LOCAL_DEVELOPMENT.md#container-runtime-colima).
- 2026-09-29, #125: seven internal-only game-core exports removed; `ajv` and
  `fast-check` declared by testkit, which imports them.
- 2026-09-29, #128: encounter routes authenticate in one encapsulated Fastify
  hook; `protocol` owns the encounter id format.

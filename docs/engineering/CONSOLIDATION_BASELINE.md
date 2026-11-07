# WLC-01 consolidation baseline

Date: 2026-11-07. Owner assignment: Legacy Inventory & Dependency Audit (P0).
Coordinator/writer: `codex/wlc-01-legacy-audit`, isolated checkout
`.claude/worktrees/wlc-01`. Status: reviewed for owner-authorized integration in
[PR419](https://github.com/Vovanostm/warwrit/pull/419); GitHub owns live merge status.
The owner requested “review, merge” on2026-11-07. This authorizes this audit PR's
merge only; resource deletion, successor implementation and deployment remain outside scope.
[Inventory and proposed order](LEGACY_INVENTORY.md) own the detailed findings;
[per-file registry](legacy-inventory.json) owns classifications and consumers.
No game behavior, configuration, dependency, resource or saved state is changed.

## Immutable source and live repository

- Audited `origin/main`: [`f3c76d8c0974c8457925bc547dbadaada5eabe7f`](https://github.com/Vovanostm/warwrit/commit/f3c76d8c0974c8457925bc547dbadaada5eabe7f),
  merge of receipt PR418; local branch `main` is already checked out elsewhere.
  The audit uses a new clean branch from this exact commit. All source permalinks
  below and registry `source_url` values refer to this source, not the later audit commit.
- `pnpm agent:status` readback: 2026-11-07 15:40 UTC (18:40 Moscow).
  [Main CI42385711569](https://github.com/Vovanostm/warwrit/actions/runs/42385711569)
  **FAILURE**; job128442526953 failed during `Bootstrap and verify`.
  Actual failed logs show Prettier rejecting
  `apps/web/src/encounter/connection.test.ts`. The sequence stopped at format;
  it supplies no game-test, build or browser pass for this main. No CI rerun or
  unrelated formatter correction is part of WLC-01. CI is advisory under the
  owner's November 7 decision.
- Root instructions, current plan, Unreleased changelog, roadmap, ADR-0003,
  ADR-0005/0006 and technology handoff were read. No nested `AGENTS.md` was found
  in the audited tracked tree. WLC-01 interprets implementation dependencies,
  not new game rules; no canonical Airtable/Empirical rule is amended.
- The graph index points to the original sprite checkout, not this worktree,
  and exposes no indexed revision proving freshness. It was not used as source
  proof. Tracked source, literal/import/link resolution and targeted symbol
  searches were used instead; no graph reindex or new infrastructure is needed.

## Other working copies and unmerged work

The original checkout `/Users/vovanostm/learn/warwrit` remains on
`codex/sprite-combat-stage1`, HEAD `7841632acf983b265fd014de58a00c84c613ffc3`.
Its staged, unstaged and untracked combat, renderer, auth, art and document work
was present before this audit and was not copied, reset, staged or accepted.
Examples outside this immutable baseline include untracked `hybrid.html`,
`src/hybrid-preview/`, FBX downloads and hybrid art; these require their author's
review before any future cleanup of that checkout. Do not apply the registry
as a filesystem deletion list to another checkout or ignored output/vendor data.
Existing player databases, ports, processes and worktree leases were untouched.

All five open PRs were read live and their complete changed-file lists checked:

| PR / exact head                                                                                  | Relevant dependency / disposition before removal                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [129](https://github.com/Vovanostm/warwrit/pull/129), `fe4e783b07ff3b7a80c041b1dbfeb972afcdad26` | Direct conflict: modifies renderer-spike PlayCanvas scene, baker, metadata/README and adds walking sprite frames. Draft, CI failure. REVIEW_REQUIRED for this entire experiment family; decide whether to retain/archive that work before removing it. |
| [134](https://github.com/Vovanostm/warwrit/pull/134), `44ce84a60ce10b9fc9c1dcbec45816ce8bbb7cad` | Historical quality/coverage workflow, hook and docs; CI failure. No game art/renderer delta, but CI/script cleanup must reconcile it rather than resurrect superseded gates.                                                                           |
| [298](https://github.com/Vovanostm/warwrit/pull/298), `01def433cae9315898cdb8f5510617fe2becc13f` | Agent cleanup/lean-MCP scripts and docs depend on lab launcher lifecycle. Open; latest check summary SUCCESS does not supersede its body’s review hold. No automation restart is authorized.                                                           |
| [336](https://github.com/Vovanostm/warwrit/pull/336), `6e9723a593970a8a026a999404597c18147bb434` | Draft novel-reader App route, quest illustrations, package script and docs. Preserve its art/route boundaries; a local reader is not a persistent campaign runner. Latest check summary SUCCESS, unmerged.                                             |
| [337](https://github.com/Vovanostm/warwrit/pull/337), `22942b6c23926c86503e6b36812aa88bf0164734` | Direct current-renderer overlap: continuous-map-scene.ts and its test, map docs. Preserve construction-error cleanup when moving current Babylon adapters. Latest check summary SUCCESS, unmerged.                                                     |

The statuses are snapshots, not merge readiness. Before each later deletion PR,
refresh open PR files and the base. No parked branch was restarted. Other local
worktrees are not equivalent to open PRs or to production.

## Control set and actual results

Pinned toolchain: Node `24.20.x`, pnpm `11.25.0`; Babylon core/loaders `9.28.0`,
PlayCanvas `2.22.4` only in renderer-spike. The frozen workspace installation
performed automatically by the first `pnpm agent:status` passed and installed
existing hooks; tracked lockfile/config remained unchanged.

| Check / command                                                                                                                                                                                      | WLC-01 result and boundary                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm agent:status`                                                                                                                                                                                  | PASS: main/ref/PR/writer metadata readback; not gameplay evidence.                                                                                                  |
| `pnpm --filter @warwrit/protocol build`                                                                                                                                                              | PASS, prerequisite exports.                                                                                                                                         |
| `pnpm --filter @warwrit/web build`                                                                                                                                                                   | PASS, including web typecheck and ordinary Vite production build. Large chunk warning retained; no performance claim.                                               |
| `pnpm --filter @warwrit/renderer-spike build`                                                                                                                                                        | PASS, including spike typecheck and both engine chunks. Proves compilation; does not prove external/dynamic models load or historical animation captures are valid. |
| `pnpm exec vitest run apps/web/src/combat-lab/sprite-art.test.ts apps/web/src/encounter/battle-presentation.test.ts apps/web/src/renderer/hex-mesh.test.ts apps/web/src/renderer/projection.test.ts` | PASS: 4 test files / 29 tests.                                                                                                                                      |
| Inventory validation, new-doc links/format and `git diff --check`                                                                                                                                    | PASS after scoped formatting; initial format check reported the new files and was corrected.                                                                        |
| New server/PostgreSQL/browser/visual/full-M1 journeys, full suite, stress/coverage, local broad CI                                                                                                   | NOT_RUN: audit-only scope. Capacity/performance/enjoyment NOT_MEASURED. Existing historical evidence is separately qualified in the inventory.                      |

These commands are the fixed small control set for this audit. Later renderer
removal must repeat affected web/type and remaining workspace builds; sprite/HUD
changes also need normal encounter input and result checks. Atlas changes need
production raster/geometry/privacy checks and real map travel/reload on a disposable
world. Prepared integration cases remain useful state regressions, but do not
replace the ordinary player journey. No new full-suite gate is introduced.

### Hosted publication readback

PR419 is OPEN / NOT_MERGED. Readback at audit head
`a10eb22ac9e598b69e06df734496b2ca5bd0772a` confirmed exactly the four
intended documentation/data paths and an unchanged base f3c76d8c.
[Scope run42388956745](https://github.com/Vovanostm/warwrit/actions/runs/42388956745)
FAILED: actual logs say `PASS scope report: 0 changed source lines`, then
`FAIL issues: link an issue (Closes/Refs #N) or an owning tracked contract.`
The script's restricted path pattern does not accept this engineering audit page.
[CI42388956750](https://github.com/Vovanostm/warwrit/actions/runs/42388956750)
was IN_PROGRESS at that readback; no final hosted pass is claimed. This subsequent
documentation receipt does not turn that snapshot into evidence for another head.
No rerun/polling or unrelated gate/issue change was performed; CI remains advisory.

## Reproduction and coverage limits

The registry expands to one record per tracked path in its declared scope:
all assets, documents, web/spike code, scripts and named server/domain/test/config
boundaries. It includes 2171 paths of the 2520-path source tree; `excluded_paths`
lists every other tracked path. There are no wildcard deletion records.

Consumers were collected across tracked UTF-8 source/config/docs by resolving
quoted relative/root paths, `.js` imports to `.ts`/`.tsx`, Markdown links and
known public-directory families. Production reachability uses a separate module/
asset closure from main.tsx/server index; documentation and provenance references
are not treated as executable imports. Type and DEV imports remain conservative
retention edges. Dynamic public-directory references are explicitly labelled;
empty consumer lists do not prove unused status. Each test/browser script record
also lists fixture, SQL-write or response-stub setup markers when found.

The registry is a finite source audit, not a complete dynamic-runtime trace or
liveness proof. Unresolved assets/experiments are REVIEW_REQUIRED. No checked-in
file was removed to test absence. The current single DELETE candidate names its
known consumers and mandatory migration first. Versions absent from this SHA are
reported as absent, not reconstructed from local output. Developer-local source
paths in provenance are historical records, not verified downloadable inputs.

## Closeout

The requested deliverables are the inventory, this baseline and the JSON registry.
The active gameplay coordinator’s CURRENT_PLAN block is preserved: WLC-01 is a
supporting audit, not a takeover of item transfer or retreat acceptance. The
changelog links this owning status. The suggested checkpoint pointer for the
integrator is: “WLC-01 audit published; source f3c76d8c; inventory acceptance and
507 dependency reviews remain; see LEGACY_INVENTORY.” This publication-era
pointer is superseded by the review/merge authorization below. WLC-02/WLC-03 planning and
WLC-04 preparation may use this map; executing deletions requires the later slice.
At initial publication, owner acceptance and the removal sequence were pending.
The following dated review authorizes integration of the audit, not execution of
its proposed deletion sequence or acceptance of new gameplay.

## Review and merge authorization — 2026-11-07

Owner request: “review, merge”, scoped to PR419. Review of audit head
`a203510eb05bf81f4ebf4de9367c9b0a334d21f8` against unchanged main f3c76d8c found
no blocking source-backed defect. This was an author review, not an independent
agent approval. All2171 registry records were checked for required fields,
exact source links and source consumer lines, unique path/scope partition and
classification totals. The sole DELETE candidate's test/document consumers,
shared production HUD, final atlas raster and v5 provenance were read back.
507REVIEW_REQUIRED records remain unresolved; their retention conditions and the
mixed-file regression protection remain binding for future work.

New scoped format and diff checks PASS; source/doc links were checked. Earlier
web/spike builds and29tests are retained evidence; game tests/builds were not
repeated for this review-only documentation update. No game or resource changed.
Current a203510e [CI42389070490](https://github.com/Vovanostm/warwrit/actions/runs/42389070490)
FAILED at the unchanged connection.test.ts formatting; actual job128452687444 logs
read. [Scope42389070503](https://github.com/Vovanostm/warwrit/actions/runs/42389070503)
FAILED the same contract-link pattern with0changed source lines; actual
job128452614906 logs read. CI is advisory; no rerun or unrelated repair is needed.
No submitted review or unresolved review thread existed at readback.
The expected final PR head must be supplied to the merge operation. The actual
merge receipt belongs to PR419, whose live state supersedes publication snapshots.
No WLC-02/WLC-03 execution, resource deletion, deployment or full-M1 acceptance
is authorized or claimed by this review.

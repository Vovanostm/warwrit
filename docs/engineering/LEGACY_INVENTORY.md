# WLC-01 — Legacy inventory and dependency audit

2026-11-07. P0 audit/planning, no behavior change or resource deletion.
Delivery: [PR419](https://github.com/Vovanostm/warwrit/pull/419) owns live merge status.
Author review found no blocking defect; the owner authorized “review, merge”
on2026-11-07. Unresolved dependency/removal decisions remain held for later slices. Baseline and all actual checks are in
[CONSOLIDATION_BASELINE](CONSOLIDATION_BASELINE.md). Machine-readable records:
[legacy-inventory.json](legacy-inventory.json). This page owns the audit and
proposed removal sequence; existing feature pages still own game behavior.

Source: [`f3c76d8c0974c8457925bc547dbadaada5eabe7f`](https://github.com/Vovanostm/warwrit/commit/f3c76d8c0974c8457925bc547dbadaada5eabe7f).
Registry links pin every path to that SHA. File/line pointers in the tables use
that edition. Age, `lab` in a directory name, a v1 suffix, a successful build or
an empty static reference list alone never makes a file safe to delete.

## WLC-02 — Remove PlayCanvas pilot (2026-11-07)

Owner assignment: remove the pilot in a standalone cleanup PR; Babylon.js is the
only supported production renderer. WLC-01 is merged via PR419. Implementation
base: main `79a6ba02`; writer: `codex/wlc-02-remove-playcanvas` in
`.claude/worktrees/wlc-02`. Status: MERGED via [PR420](https://github.com/Vovanostm/warwrit/pull/420);
see the dated confirmed-merge receipt below.
This dated section supersedes the spike retention hold below for executable code
only; the original per-file registry remains an immutable WLC-01 source snapshot.

Player goal: enter the ordinary encounter or Combat Lab, see the same battlefield,
select fighters/cells and issue a manual turn or start/stop autobattle. The normal
journey, camera, day/night, victory/defeat and saved consequences remain those of
the existing Babylon pipeline. Leaving/re-entering or replacing a battle must
release its scene; failed construction must retain the existing error feedback,
abort and cleanup behavior. Ordinary commands and retry remain server-authorized;
this cleanup changes no balance, rules, saves, routes or campaign outcomes.

Inventory readback: PlayCanvas 2.22.4 has exactly one workspace consumer,
`apps/renderer-spike`; its `index.html` and engine/art query switches are standalone
experiment entrypoints. The ordinary App has no engine switch. Both EncounterPanel
and Combat Lab consume `BattleView` → `battle-hud-scene` → `sprite-battle-scene`
→ Babylon `canvas-engine`. Map/place scenes also import Babylon directly.
The shared production HUD, geometry, textures and engine lifecycle stay in place.
The graph indexes the original dirty checkout, not this worktree; source reads
and import/literal searches are the fallback, with no rule ownership inferred
from the graph.

Remove both comparison adapters, shared experiment helpers, React entry, Vite/
TypeScript/package config and PlayCanvas baker. Retain `public/` models, baked
images, manifests and licenses at their existing paths, plus the historical README
pointer and ADR/evidence. They are retained source material, not an app/workspace.
Retain the engine-neutral `.agents/skills/playcanvas-inspect-glb/` parser and its
license, independently used by Babylon/character tooling. No shared asset move,
hex helper cleanup, art rewrite, migration or new renderer abstraction is needed.

PR129 was read live: OPEN/DRAFT at `fe4e783b07ff3b7a80c041b1dbfeb972afcdad26`;
207 changed files include 192 derived walking PNGs and experiment source. Its
unmerged code/assets remain on `codex/m1-art-animated-pilot` and in GitHub history.
The owner's WLC-02 direction supersedes integrating that PlayCanvas experiment;
this task neither merges/closes/deletes its PR/branch nor copies its animation
into production. PR337's pending construction-error fix and all other WIP stay
untouched. Removed main source remains accessible at the WLC-02 base commit.

### WLC-02 results and acceptance limits

- Removed 13 executable/config files (both paired adapters, entry, shared
  comparison helpers, baker and package). pnpm regenerated the lockfile, removing
  PlayCanvas and its exclusive WebXR/WebGPU type dependencies. No PlayCanvas
  import/dependency or engine query switch remains in working application source.
- `apps/web`, server, domain, protocol and all retained assets have an empty
  task diff. Construction errors, abort/destroy, engine reuse/delayed dispose and
  PR337's separately pending fix were preserved. No migration or game rule changed.
- Initial `pnpm check:architecture` failed because it assumed every `apps/`
  directory had a package manifest. It now skips non-package directories, matching
  pnpm workspace discovery; its obsolete spike allowlist entry is removed.
- Frozen install PASS; remaining workspace builds PASS (web includes typecheck),
  all workspace typechecks PASS. Existing large-web-chunk warning retained.
  Seven focused files / 74 tests PASS: BattleView, sprite-battle-scene,
  battle-framing, sprite-art, encounter battle-presentation, hex-mesh, projection.
  Architecture (five packages / 525 source files), content (114 assets), scoped
  ESLint, Prettier, local links and ordinary diff checks PASS.
- Real Chromium at 1440×900, own loopback lab API3592/UI5392: editor → battle,
  manual end-turn (archer → commander), auto start/advance/stop, day/night,
  overview, wheel zoom and editor → new battle PASS. Current day/night/overview/
  zoom images were inspected. Babylon EngineStore readback: battle1 engine/1
  scene, returned editor0/0 and0 canvases after disposal, new battle1/1 and1
  canvas. No game-resource failure or runtime exception observed; favicon404
  is unrelated. These are author regression checks, not independent visual or
  broad scene-art acceptance; production rendering code/art is unchanged.
- Separate disposable PostgreSQL with migrations0001–0020, ordinary App at5393:
  local-company entry, painted map, settlement/building scene, quest acceptance,
  ordinary travel and stop PASS. No production save/database was opened or reset.
  A diagnostic fixture was admitted through the existing nonproduction API but
  correctly did not attach to the company's canonical active encounter; it is
  **not** ordinary combat evidence. The shared battle UI was exercised in the lab;
  the full native company → travel → combat continuation remains NOT_RUN in
  this cleanup (the ordinary destination alone required about508 seconds).
- Browser wrapper initially hit a non-executable script and later restricted npm
  cache; invoking the already installed CLI directly recovered. Initial CLI
  argument/evaluation errors were corrected; they are not gameplay failures.
  Local ignored evidence: output/playwright/wlc02/ (not committed).
- Full campaign loop, every scene/device/target-performance acceptance, injected
  construction failures, full suite/coverage/stress and broad local CI NOT_RUN;
  performance/enjoyment NOT_MEASURED. No independent gameplay/visual acceptance
  is claimed by this deletion-only cycle. CI is advisory; hosted completion is not awaited. Merge and deployment are
  NOT_AUTHORIZED / NOT_RUN.

Publication readback: PR420 opened from `codex/wlc-02-remove-playcanvas` against
main `79a6ba02`, initial implementation head `0bb0298f`;27 scoped files,13
executable/config removals. This receipt only updates delivery documentation.
Production source/assets remain identical to the checked base. GitHub owns live
head, mergeability and CI; no completed hosted pass is claimed. Original dirty
checkout and all other worktrees/player databases remain untouched.

### WLC-02 integration and merge authorization — 2026-11-07

Owner requested “merge, update main” for PR420. Merge of this PR, its delivery
receipt and clean local-main fast-forward are authorized; deployment is not.
This supersedes the earlier NOT_AUTHORIZED merge snapshot above.
Latest main `93adaef9` includes WLC-03/PR421 and its receipt PR422. Integration
preserves its archived assets, manifest/editor/Vite changes and all WLC-03
records; the only merge conflicts were added CURRENT_PLAN/CHANGELOG sections,
resolved by retaining both deliveries. No production renderer/rule/lifecycle
change is introduced by this integration.

PR420 head `4bb2a743` had no reviews or review threads at readback. Its
[CI42391670090](https://github.com/Vovanostm/warwrit/actions/runs/42391670090)
FAILED at Prettier on unchanged `apps/web/src/encounter/connection.test.ts`;
job128460421825 actual logs read. Scope42391670367 PASSED. CI advisory; no
unrelated formatting repair, full-suite rerun or polling required. Earlier
74-test/build/browser evidence belongs to the pre-integration source boundary;
fresh integration web typecheck,74focused tests, architecture (five packages/
525source files), content (130assets), scoped format/diff/local-link readback
PASS. Production web/server/domain/protocol/assets have no task delta against
main93adaef9. Repeated build/browser/full-suite checks NOT_RUN for this
integration; previous runtime evidence remains explicitly scoped. The native
campaign-combat and broader acceptance limits above remain open.

### WLC-02 confirmed merge — 2026-11-07

Owner-authorized PR420 is CLOSED/MERGED, merged at17:36:10UTC as
`fd16fd23c0d0a7506e98c1a9a8ebc198f64ff9da`, with expected final head
`099cc7d631fff40030746665d488e3521c285adc`. Fetched origin/main and the clean
local `main` checkout at `.claude/worktrees/agent-harness-cleanup` both reached
that commit. Ordinary Git diff confirms identical reviewed-head/merge contents.
WLC-03 and its asset archive are retained; original dirty sprite checkout,
other worktrees, processes and player databases are untouched.

This documentation-only receipt supersedes earlier OPEN/NOT_MERGED and pending
permission snapshots, preserving their chronology. Fresh integration web types,
74 tests, architecture/content (130 assets), scoped format/diff/local links PASS;
earlier browser/build evidence and native-campaign limits remain as recorded.
Repeated gameplay/SQL/browser/build/full-suite/coverage checks NOT_RUN for this
receipt. Final hosted completion was not a merge prerequisite and no hosted PASS
is claimed; the actual earlier formatting failure remains qualified above.
No deployment or full-M1 acceptance. The receipt's GitHub PR owns its own final
integration status; it adds no implementation or new acceptance claim.

## Classification and coverage

| Classification  | Paths | Meaning in this audit                                                                                                           |
| --------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------- |
| KEEP            |  1040 | Current code/checks, authoritative source or provenance retained in place. This is retention, not proof that every export runs. |
| ARCHIVE         |   618 | Dated evidence/standalone mill experiment; preserve bytes/history and references. No move is performed now.                     |
| DELETE          |     1 | Candidate after its known test/document consumers migrate; not a deletion instruction for this PR.                              |
| MIGRATE         |     5 | Mixed test/current-looking documentation needs a bounded correction before removal.                                             |
| REVIEW_REQUIRED |   507 | Dynamic, provenance, experiment, open-PR or unproved dependencies prevent a safe archive/delete decision.                       |

2171 individual tracked paths are covered, including all 631 `assets/` paths,
all 134 renderer-spike paths, all 36 current renderer paths and all 894 document/
evidence paths. Remaining tracked paths are explicitly excluded in the registry;
they are not proposed cleanup. Generated/ignored build output, user databases,
other checkouts and untracked original WIP are outside the deletion boundary.
`owner` names the responsible successor role, not an agent assignment or permission.

The registry separates reference consumers from literal/static consumers and
conservative dynamic public-directory consumers; `usage` reports reachability
from app/server/experiment/playground roots. A reference in `assets/manifest.json`
means catalogue/provenance use, not automatic runtime loading. Static closure
includes type and DEV imports; inspect the actual call path before moving a
shared module. Every unresolved dependency remains REVIEW_REQUIRED.

## Renderer and entrypoints

| Family / path                                                                                          | Actual consumers and role                                                                                                                                          | Decision / dependency before removal                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/main.tsx` → `App.tsx` → `EncounterPanel.tsx`                                             | Ordinary account/company game. EncounterPanel imports `combat-lab/BattleView.tsx` at line17; actual commands are sent through encounter transport.                 | KEEP normal entry and shared HUD.                                                                                                                                                                                                                        |
| `apps/web/src/combat-lab/{BattleView,battle-hud-scene,sprite-battle-scene}.ts[x]`                      | Shared by the ordinary encounter and optional combat lab. Babylon scene, picking, feedback and field/HUD elements are production dependencies.                     | KEEP. Extracting a clearer directory is optional later MIGRATE work, not justification for deleting `combat-lab/`.                                                                                                                                       |
| `apps/web/src/game/{WorldMapCanvas,ContinuousMapCanvas,PlaceScene}.tsx`                                | Consume `renderer/{map-scene,continuous-map-scene,place-depth-scene}.ts`; GameShell retains map variants and place views.                                          | KEEP all current adapters/fallbacks until explicit map/save migration.                                                                                                                                                                                   |
| `apps/web/src/renderer/{canvas-engine,projection,hex-projection,battle-terrain,battle-cell-grid}.ts`   | Current shared lifecycle, public projection, terrain and picking consumers.                                                                                        | KEEP. They are not engine-comparison leftovers.                                                                                                                                                                                                          |
| `apps/web/src/renderer/hex-mesh.ts`                                                                    | `createHexDisc`/`createHexBorder` occur only in `hex-mesh.test.ts:12,48,50,68`; wiki `battlefield-test-maps.md:1631,4432` records older implementation.            | DELETE candidate after migrating the first helper test and historical pointers. Remaining five terrain/grid tests at lines87,159,203,278,341 must stay; do not delete the mixed test file. Replacement is the current battle-cell-grid/terrain boundary. |
| `apps/renderer-spike/src/main.tsx`                                                                     | Standalone `index.html`, `?engine=babylon` default / `?engine=playcanvas`; dynamic imports at lines82–84.                                                          | REVIEW_REQUIRED as a whole experiment. Neither branch is current production; the Babylon comparison adapter is still reachable inside this stand, not orphaned code.                                                                                     |
| `apps/renderer-spike/src/{babylon/scene,playcanvas/scene,playcanvas/art-sprite}.ts` and shared modules | Shared 18-actor scenario, visual attack/move previews, metrics, KayKit models/equipment/clips and sprite baker.                                                    | Resolve open PR129 before archive. Archive paired code, license/source records and evidence; do not replace it with another dual-engine abstraction.                                                                                                     |
| `apps/renderer-spike/package.json`, root workspace/lockfile                                            | PlayCanvas2.22.4 exists only in this package. Root `build`/`typecheck` recursively visit it through `apps/*`. Babylon9.28.0 is also independently required by web. | Remove workspace/package only in the later renderer slice; regenerate the lockfile with pnpm. KEEP web Babylon.                                                                                                                                          |
| `.agents/skills/playcanvas-inspect-glb/`                                                               | Babylon skill, Mixamo/character skills and ESLint reference the engine-neutral offline GLB parser.                                                                 | KEEP despite directory name. Renaming needs all skill/script links migrated first.                                                                                                                                                                       |
| `apps/web/mill.html` → `src/mill-preview/{main.ts,style.css}`                                          | Standalone Babylon 3D location viewer with 0–45° camera; no campaign simulation. Loads `assets/art/combat/mill-3d-2026-10-26/` model/reference.                    | ARCHIVE together with its source, licensing/provenance and wiki pointers. No production adapter removal follows from it.                                                                                                                                 |

Exact selected source boundaries:
[ordinary HUD import](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/web/src/EncounterPanel.tsx#L17),
[engine selector](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/renderer-spike/src/main.tsx#L8),
[test-only helpers](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/web/src/renderer/hex-mesh.test.ts#L44).

### Flags, routes and standalone HTML

- Production `apps/web/index.html` is the default Vite build input. The ordinary
  App has no renderer engine selector. `DEV && VITE_COMBAT_LAB=1` gates
  `/combat-lab` (`App.tsx:312–314`); the imported HUD remains shared production code.
- Server `COMBAT_LAB=1` enables loopback/nonproduction `/dev/combat-lab` routes;
  session capability and in-memory battle state belong to the standalone server
  sandbox. `COMBAT_LAB_ORIGIN` is its exact-origin boundary, not a renderer flag.
- `ENCOUNTER_FIXTURES=1` permits `/encounters/fixtures` only in configured
  nonproduction loopback identity/database mode; production composition also
  refuses fixture admission. Keep the admission distinction and its tests.
- `WORLD_MAP=painted-atlas` selects `world.porechye.atlas-v1`; missing/legacy
  selects the retained main world. The configured default example is painted.
  Switching the flag does not migrate old positions, accepted paths or companies.
- `WORLD_LAB=1` launches the separate world-lab composition, not the ordinary
  game. Its `world.painted-atlas.lab-v1` seed and eightfold clock are explicit
  diagnostics. Reused cartography modules inside `server/src/world-lab/` are
  nevertheless production dependencies.
- Spike query flags: `engine`, `art-bake=1`, `art-preview=sprite`, `art-actor`,
  `art-clip`, `art-sample-seconds`; baker environment `WARWRIT_ART_BAKE_URL`
  constructs those URLs. PR129 adds `art-animated=1` and further output variants
  on its own unmerged head; that flag is not present in this main.
- Other tracked HTML: `scripts/world-map/{navigation-lab,world-lab}.html`,
  `scripts/world-map/fog-design/index.html`, combat stage1 gallery/reference/UI
  concept galleries, novel style-study gallery, `world/stozhar-v3/atlas.html`,
  renderer-spike index and mill viewer. They are authoring/preview entries, not
  interchangeable game routes. The registry enumerates every HTML path and its
  actual references. Untracked primary `hybrid.html` is separately preserved.

## Battle graphics, HUD generations and sources

There is no single production battle asset manifest. The
[licensing catalogue](../../assets/manifest.json) has 114 entries and retains
old and current material. Runtime selection lives in
[sprite-art.ts](../../apps/web/src/combat-lab/sprite-art.ts),
[sprite-battle-scene.ts](../../apps/web/src/combat-lab/sprite-battle-scene.ts) and
[battle-terrain.ts](../../apps/web/src/combat-lab/battle-terrain.ts).
Treating the whole catalogue as the current renderer dependency list would be wrong.

| Generation                                                                         | Current use / source                                                                                                                                                                                                            | Decision                                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 `battle/` early 512px units and terrain                                         | Most have catalogue/provenance consumers only. `unit-wolf.png` is still B001 in current sprite-art.ts:163. `unit-merc-sword.png` is also a source reference in six later unit provenance records.                               | KEEP current wolf and source authority; REVIEW_REQUIRED for other individual resources. No batch deletion of `m1/battle`.                                                       |
| Stage1 `roster/w01…w10`, creature roster and W01-unarmed                           | Current static sprite selector: B023/B030 use `sprite-v3.png`, B037 `sprite-v2.png`; others use named current sprites. B001 uses the earlier M1 wolf. B023 fixture is a separate stationary asset in sprite-battle-scene.ts:60. | KEEP selected sprites, foot/visible-bound metadata and provenance. Earlier revisions and source concepts remain REVIEW_REQUIRED as authoring inputs, not spare runtime sprites. |
| `readable-terrain-2026-10-16/`                                                     | Production mud/fire/fire-crescent/fire-stubs/paving/ink-yard-earth/yard-fringe/field-ground; mill-scenery is retained by the shared scene for its mill environment.                                                             | KEEP. Ordinary encounter presentation uses open-field; that does not make mill laboratory assets unused globally.                                                               |
| Stage1 battlefield/keyart/UI-reference and two UI concept generations              | Gallery/reference HTML, prompts and wiki design history; superseded screen layouts are not executable HUD implementations.                                                                                                      | REVIEW_REQUIRED; archive with authoring/provenance links after checking gallery dependencies.                                                                                   |
| Command desk / persistent encounter HUD                                            | `BattleView`, `BattleUnitCard`, field vitals, initiative, outcome, log, forecast, command desk and styles are used by the ordinary encounter. `EncounterCommandDesk` supplies native command handling.                          | KEEP real input, result and error/retry paths. A class or module retaining a historical name is not a duplicate UI.                                                             |
| Renderer-spike idle8dir/scout-b2 sprites, normal/depth frames, KayKit models/clips | `art-sprite.ts` selects idle manifest; public directory and baker consume the generations. Raw comparison has known animation-equivalence limits. PR129 adds further walking frames.                                            | REVIEW_REQUIRED until PR129 and bake/source retention are settled.                                                                                                              |
| Early leader portrait/style studies, map/settlement generations                    | Canonical references, `renderer/art.ts` fallbacks, company/place UI and image-generation source records overlap.                                                                                                                | KEEP live fallbacks/current style; REVIEW_REQUIRED for unproved revisions. Never delete merely because newer combat portraits exist.                                            |
| Mill3D and other location/hybrid experiments                                       | Standalone viewer, source model/reference art and provenance; local WIP outside main has separate ownership.                                                                                                                    | Archive only as a complete, source-preserving family after author review.                                                                                                       |

Current sprite sources are the per-roster `provenance*.json`, prompts and retained
source/concept images, plus exact `.codex/generated_images` paths recorded there.
Those external originals are **not revalidated or guaranteed available** by this
audit. W01 provenance still says pending acceptance, while runtime imports prove
use; this is documentary drift, not a license to delete it. Repaired B023 separates
`fixture.png` from moving `sprite-v3.png`. Preserve rejected source history and
style references; generated concept quality and integrated acceptance are distinct.

## Atlas versions, geometry, roads and markers

| Family                                                   | Version inventory at the source SHA                                                                                                                                | Actual consumers / retention                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world/stozhar-v1`, `-v2`, `-v3`                         | Initial world map and revisions; v3 has final/geography/ink/engraved images, atlas HTML and places.json.                                                           | Authoring/gallery/lore/provenance uses; REVIEW_REQUIRED for consolidation, not the production Porechye raster.                                      |
| `world/porechye-v1`                                      | `porechye-detail.png`, `-v2`, `-v3`, `-v4`, `-v5`, crop, prompts/provenance.                                                                                       | Navigation lab `?map=v5` profile uses detail-v5; exact selector key is `map` as read in navigation-lab.ts. Others remain source/history references. |
| `world/porechye-v2`                                      | spacious-v1/v2, regional-v1/v2/v3/v4, bridge/burial/redoubt edits/crops/guides and provenance.                                                                     | `navigation-maps.ts` v2 profile loads regional-v4; atlas provenance uses regional-v4 as its retained center identity source.                        |
| `world/porechye-atlas-v1`                                | Nine tile PNGs/guides/prompts; `atlas-v5.png`, `atlas-v6.png`; v4 exact prompts, seam prompts, provenance and road-repair-v6.json.                                 | v6 final raster is production. v5 is v6’s recorded source; tile/prompt/source history must remain available.                                        |
| Atlas v1–v4 composed PNGs                                | **ABSENT** from this tracked SHA. Provenance/wiki describe earlier iterations and persistent `output/map-atlas/archive`; no such file is invented in the registry. | Historical external/local availability REVIEW_REQUIRED. Do not confuse atlas directory edition `v1` with a composed atlas-v1.png.                   |
| `m1/map-dark/foliage-atlas-v3.png`, `trunk-atlas-v1.png` | Separate unit/foliage texture atlases, not world-map versions.                                                                                                     | Current renderer/art.ts imports both. KEEP; old canopy metadata v2 is source history, not evidence v3 is unused.                                    |

Production dependency chain:

1. `server/src/world-lab/cartography-raster.ts:6` directly reads the standalone
   `atlas-v6.png` (4608×3072), then masks/crops tiles for the authorized company.
   Client `PaintedMapCanvas` fetches server tiles; the full private raster is
   denied by the app Vite file-access policy. Preserve that privacy boundary.
2. `packages/game-core/src/world/painted-atlas/region.ts` owns the frozen geometry,
   coordinate sheet, terrain/road overlays, crossings and accepted sites. It
   imports only core movement functions/types and region version, **no old image, editor or
   script geometry**. Road-correction helpers and segment graph are derived from
   this geometry; retain accepted saved path/timing compatibility.
3. Public DTO/cartography field and production map routes project lawful markers.
   Client shares `scripts/world-map/{map-symbols,map-labels,map-camera-input}.ts`
   and `assets/art/world/{map-icons-v1,fog-paper-v1}`; these v1 names are current.
4. The navigation editor imports `porechye-atlas.ts`, which imports old
   `porechye-regional.ts` and the navigation types, plus atlas-layout/contracts.
   It therefore still depends on older **code**, even when displaying v6.
   Its 24 extra place/contract proposals are not promoted into accepted M1
   simply because the PNG or lab has an ACCEPT record.

**v6 independence result:** production raster load and core geometry have no
runtime dependency on old atlas image files; static source proof only, deletion/
absence runtime experiment NOT_RUN. Regeneration **does** depend on v5:
`road-repair-v6.json:6` explicitly names it. The editor also retains older
profiles/code. Thus “v6 has no old dependency anywhere” is false; wholesale
removal of v1/v2 directories or editor modules is REVIEW_REQUIRED.

Exact source:
[production raster](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/server/src/world-lab/cartography-raster.ts#L5),
[core geometry](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/packages/game-core/src/world/painted-atlas/region.ts#L1),
[old editor profiles](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/scripts/world-map/navigation-maps.ts#L1),
[v5 generation dependency](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/assets/art/world/porechye-atlas-v1/road-repair-v6.json#L6).

## Client mutations and authoritative outcomes

Static audit covered the non-test ordinary client, sandbox controllers, renderer
spike and the server handlers at the corresponding boundaries. Browser/database
attack probes were NOT_RUN. No confirmed production client-side canonical damage,
XP, money, reward, item-condition or contract-completion mutation was found in
these inspected paths; this is not a security or full-runtime certification.

| Suspected operation                          | Actual path / effect                                                                                                                                                                                                                                                                         | Assessment                                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Damage and battle completion                 | EncounterPanel builds an intent, persists the exact retry body and sends it through `encounter/command-attempt.ts` / connection transport. `toEncounterBattlePresentation` copies server health/status/outcome and accepts private previews only for matching encounter/revision/activation. | KEEP. A health bar or predicted damage is a rendering of server facts/quotes, not a local canonical hit.         |
| Lab attacks and seeded battles               | `combat-lab/controller.ts:328` posts to `/dev/combat-lab/:id/actions`. Server routes own the in-memory session and call game-core; custom editor rank/seed/unit inputs are explicit sandbox setup.                                                                                           | No campaign XP or damage mutation shown. KEEP isolation and nonproduction guard.                                 |
| Scripted spike attack                        | `triggerAttack` in both comparison scenes plays Attack/Hit clips and a burst; shared actors have fixed example health100. Main logs “visual-only” previews. No canonical command/outcome transport follows that animation.                                                                   | Experiment, not an SSOT violation. Archive only with its dependency family.                                      |
| Experience/skill ranks                       | `SkillLoadout.tsx` and BattleEditor set sandbox configuration. Ordinary progression is read through company DTOs; no earned-campaign XP write was found.                                                                                                                                     | Do not call preview ranks a campaign exploit.                                                                    |
| Money and reward                             | FirstHunt rewardLabel formats exact server `rewardQ`; ordinary contract attempt handling validates the response and refreshes authoritative state. The browser does not create reward/proof facts.                                                                                           | KEEP response validation/retry. Formatting arithmetic is not a money mutation.                                   |
| Item/equipment/condition                     | Company roster, supply and transfer UI prepare server commands, maintain drafts/pending requests and refresh company state. Local storage keeps exact request bodies, not canonical item ownership/condition.                                                                                | No local canonical write shown. Preserve uncertain-command recovery.                                             |
| Contract completion / replacement outcome    | FirstHunt and ordinary contract hooks send ACCEPT/JOIN/PICKUP/PRESENT or ordinary contract intents. Server terminal-result/evidence/executor own proof and payout. `outcomeNote` for living escaped hostiles explains server status; it does not replace it.                                 | KEEP server facts. The presentation's controlled-side/unknown-view logic is not a second result source.          |
| Apparent world mutations                     | Movement display interpolates accepted server paths/time. Map wildlife/forest RNG creates visual decorations. Navigation preview computes routes in its stand; world-lab movement uses its own server/world.                                                                                 | No canonical company move or battle result follows from decoration/preview alone. Keep lab/profile distinctions. |
| Prepared state presented as real-world proof | SQL test setup and older fixture browser journeys below insert/prepare prerequisites or results.                                                                                                                                                                                             | Evidence qualification problem if described as full E2E; not proof of a production client mutation.              |

Exact boundaries:
[server-derived outcome/previews](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/web/src/encounter/battle-presentation.ts#L9),
[lab action transport](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/web/src/combat-lab/controller.ts#L328),
[visual-only spike attack](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/renderer-spike/src/babylon/scene.ts#L501),
[fixture admission guard](https://github.com/Vovanostm/warwrit/blob/f3c76d8c0974c8457925bc547dbadaada5eabe7f/apps/server/src/app.ts#L62).

## M1 acceptance: setup, executed boundary and claim

These are source/evidence classifications, not reruns. Per-test registry
`verification.setup_markers` enumerates detected fixture, SQL-write and browser
response-stub sites across the covered tests. Prepared starting conditions do not
by themselves make a unit/integration test invalid; inserting the asserted result
limits what journey it can prove. No test is removed in WLC-01.

| Claim / source                            | Real command or setup                                                                                                                                                                                                                                                                                        | Evidence and correct boundary                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIRST HUNT profile/spec                   | `packages/testkit/src/first-hunt.spec.test.ts`; Vitest unit/spec assertions over fixture economy and named constants/preparers.                                                                                                                                                                              | No browser or database. Proves finite profile/preparer expectations, not E2E. WLC-01 rerun NOT_RUN.                                                                                                                                                                                                                          |
| Payment/transition atomicity              | `apps/server/src/contracts/company-transition.integration.test.ts:51–78,157–236` prebuilds proof/company state, inserts a resolved encounter with empty setup/state, terminal command/admission and proof claim. Real PostgreSQL transition assertions run only with isolated DB URL.                        | This explicitly inserts the terminal result. Valid transaction/rollback/revision test, **not combat, proof acquisition or full FIRST HUNT E2E**. Current run NOT_RUN.                                                                                                                                                        |
| Two-company loss and terminal composition | `apps/server/src/encounters/postgres.integration.test.ts:501` seeds accounts/company/location. Case946 sends real JOIN via Fastify inject, advances due deadlines via DB updates994/1000, then invokes AI/timeout workers.                                                                                   | Combat/terminal integration from prepared starts with manipulated deadlines; not ordinary identity, travel or real-time player journey. Result is generated by commands, not simply inserted. Current run NOT_RUN.                                                                                                           |
| Bridge-v5 persistent wolf fight           | Same file:3947; deterministic fixture IDs/world at3955, prepared ranks/equipment/clock, real JOIN/move/bow commands and worker settlement; checks replay/retry/proof effects.                                                                                                                                | Important real integration/replay boundary with controlled setup, not a blind ordinary player run. Current run NOT_RUN.                                                                                                                                                                                                      |
| Terminal evidence unit composition        | `apps/server/src/encounters/terminal-evidence.test.ts` builds retained binding/replay/receipt fixtures; death case366 intentionally admits one-HP actors.                                                                                                                                                    | Finite source/state regression. Prepared low health is not ordinary starting-company or broad death acceptance. Existing skipped case remains NOT_RUN.                                                                                                                                                                       |
| Opening retry browser script              | `apps/web/src/company-create-retry.browser.mjs:93–138` intercepts auth/company/options/command requests and fulfills or aborts prepared replies. Run requires `WARWRIT_WEB_URL` and `WARWRIT_PLAYWRIGHT_CLI`.                                                                                                | Real browser with mocked responses: UI component/transport-failure test, not identity/database E2E. Current run NOT_RUN.                                                                                                                                                                                                     |
| Shared world browser CI                   | `bash scripts/world-map/check-world-lab-ci.sh --capture …` → world-lab server/seed/browser. Two seeded accounts and company snapshots inserted by world-lab-seed.ts:232–277; separate world and eightfold clock.                                                                                             | Actual networked map/movement/pursuit/privacy checks over a seeded lab. Does not prove ordinary company opening, contract/combat/reward. Capture entry/source exists; no fresh WLC run.                                                                                                                                      |
| Ordinary painted map CI                   | `bash scripts/world-map/check-painted-game-ci.sh --capture …` → painted-game.browser.mjs. New disposable DB, local Dex, lab/encounter-fixture flags0; ordinary opening if empty.                                                                                                                             | Real OIDC/company/map camera/move/STOP/reload path, no fulfilled game responses. Script ends after map/company persistence and **contains no battle/reward/care/payroll loop**. Existing CI label “ordinary journey” is bounded, not full M1.                                                                                |
| Persistent HUD #166 / PR247               | [main-readback](evidence/persistent-hud/main-readback.md) pins reviewed662d6762 / merged7a7f1f18 and CI39446960412; real ACCEPT/HELP/JOIN/battle commands from synthetic identities/company starts.                                                                                                          | It explicitly excludes company opening/travel. Session renewal inserts auth rows only; subsequent trophy CAPACITY failure was retained. Later [DB7 continuation](CURRENT_PLAN_HISTORY.md) must be read separately, never infer reward from HUD acceptance. No historical capture rerun here.                                 |
| DB7 lawful payment/restart continuation   | `CURRENT_PLAN_HISTORY.md:2106–2125`, [JOIN-lock report](evidence/join-lock-order-254/README.md). Seeded accounts/company/start location; actual battle52, pickup,80000000Q payout and a second actual API crash/restart preserved HUNT02 and11 captured groups; both UI reloads sent0POST.                   | Historical native command/persistence proof from prepared starts. First JOIN deadlocked and first crash snapshot omitted world row; those limits are explicit. Does not prove external identity, creation or travel. Raw records are private/local; WLC rerun NOT_RUN.                                                       |
| Ordinary launch #176 and fresh entry #369 | [M1 local playtest](M1_LOCAL_PLAYTEST.md), launch closeout PR334/CI42266945856 and entry369/b89f4128. Ordinary Dex, new company, equipment, supplies/travel/JOIN; no game-state SQL writes reported.                                                                                                         | Historical authored UI/read-only SQL evidence. Launch smoke stopped at active encounter; it does not by itself prove victory/reward. Local logs/captures under ignored output are not independently replayed by WLC-01.                                                                                                      |
| Full first ordinary loop #370             | [playtest result](M1_LOCAL_PLAYTEST.md#full-circle-retained-result--2026-11-07-0834-msk), [wiki result](../wiki/m1-spec.md#полный-первый-круг--370-2026-11-07), PR414/receipt415. “Первый круг” ordinary entry → fight → one80-crown reward → actual rest/day-end payroll → next contract → process restart. | Documented real journey, not the prepared terminal SQL test above. 20crowns remained reserved for remote wallets; no wounds meant dressing unavailable. Original dead company was preserved. Evidence is historical author records/local ignored captures, no fresh full-loop rerun or independent human/M1 acceptance here. |
| Repeat unfinished hunt #409               | [owning retreat result](../wiki/mechanics/retreat.md#интеграция-409-с-текущим-main--2026-11-07), PR416/receipt417. Prepared mixed-retreat App continuation, real retry/helper consent/payout and PostgreSQL regression.                                                                                      | Repeat continuation passed its bounded prepared-save journey. Fresh ordinary company’s attempted hostile escape instead lost all3; native first-escape criterion remains open. No blanket native acceptance from the merge.                                                                                                  |
| Historical renderer/visual comparison     | [scene3 evidence](evidence/renderer-scene-3/README.md), ADR-0005 correction. Renderer-spike build and recorded captures, not gameplay.                                                                                                                                                                       | PlayCanvas animation was not playing in the measured workload. Preserve measured history and correction; no equivalent-animation benchmark victory, no full M1 claim.                                                                                                                                                        |

Current full M1 remains **not accepted**: all eight contracts/eleven scenes,
remaining company capabilities, real two-company full journey, device/visual/
human and hosted-operation requirements cannot be closed by these finite tests.
There is no fresh WLC-01 full-game claim. This also does not erase the valid
ordinary #370 evidence merely because older tests use fixtures.

## Documentation and CI dependency map

### Active or current-entry documents

KEEP their authority; add narrowly dated corrections in a later documentation
slice where needed:

- `AGENTS.md`, `CURRENT_PLAN.md`: November7 workflow and current delivery receipts.
  Supporting audit does not replace the active gameplay coordinator’s block.
- `ROADMAP.md`, `M1_PRODUCTION_PLAN.md`, `PARALLEL_WAVES.md`, wiki M1 and
  `M1_LOCAL_PLAYTEST.md`: current entry documents contain older status paragraphs
  as well as superseding dated receipts. Roadmap explicitly corrects recovery,
  payroll and transfer. Production plan still opens its execution steps with
  “integrate recovery/payroll candidates”; playtest header still calls them
  candidates. MIGRATE those current-looking summaries to links to current receipts.
- `AI_TECHNOLOGY_HANDOFF.md:41` says exact Babylon version unselected and ART06
  integration open. Current web package pins9.28.0 and ordinary encounter imports
  prove integration exists. Add a dated implementation pointer; keep remaining
  visual/device acceptance separate. ADR-0006’s original version statement is
  historical decision scope, not permission to change the pinned library.
- `apps/renderer-spike/README.md` still presents the comparison and scene3 quality
  observations without a leading current-production supersession notice. Its
  ADR0005/evidence links contain the correction; MIGRATE the README entry to
  explicitly historical status before archival. Do not use it as current PlayCanvas
  production setup. Its baker instructions remain real experiment consumers.
- `LOCAL_DEVELOPMENT.md`, combat-lab READMEs, world-map/battlefield/vision/character
  wiki pages: active run/authoring pointers coexist with old generations. Qualify
  or repair links together with moved resources; do not bulk rewrite source history.

### Historical records retained separately

ARCHIVE means keep accessible history, not treat it as a live gate:

- ADR-0005 and the renderer-selection parts of ADR-0003 are explicitly superseded
  by ADR-0006. Retain their correction of the animation measurement.
- `CURRENT_PLAN_HISTORY.md`, dated changelog entries, renderer-scene3,
  ART05 and other dated `docs/engineering/evidence/` files retain source-specific
  checks, failures and observations. All 615 evidence paths remain individually
  indexed; paths referenced by an active page still require repaired backlinks
  before any future physical move.
- Old UI concept/reference HTML and image provenance are history/authoring
  dependencies, not alternate executable current HUDs.
- “Visual BLOCKED” in persistent-hud/overview-zoom reviews, old battlefield and
  world-map amendments is scoped historical evidence. Current AGENTS, roadmap,
  production plan and queue explicitly remove the **global prerequisite**.
  `PARALLEL_WAVES.md:33` still states a former blocked scene result, but line44
  expressly qualifies it as historical. No active global gate was found to remove.
  Broader current scene acceptance remains unassessed; do not relabel it PASS.

### CI, scripts and configuration consumers

| Consumer                                                                            | Dependency affected by future cleanup                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml` → `scripts/bootstrap.sh` → `pnpm verify/build/typecheck` | Recursive workspace includes renderer-spike. Removing just its source breaks the package build; remove/archive package membership coherently.                                                                                                                                                                                                                                                                                           |
| `scripts/check-architecture.mjs:17`, `.fallowrc.jsonc`, `eslint.config.mjs`         | Named renderer-spike allowlist/exclusion/baker overrides; GLB-inspector override remains independently used. Update only obsolete entries after package/skill disposition.                                                                                                                                                                                                                                                              |
| CI world-map and painted-game capture/merge steps                                   | `scripts/world-map/check-*.sh`, browser drivers, world-lab seed/server, map HTML/Vite configs and runtime-coverage modules are real active script consumers. Deleting a “lab” directory can break CI and production shared imports.                                                                                                                                                                                                     |
| Vitest include globs and coverage excludes                                          | `vitest.config.ts` discovers app/package/world-map tests; ignores renderer-spike for coverage only. Tests are not proof that a stand is production, but cannot disappear accidentally during deletion.                                                                                                                                                                                                                                  |
| `pnpm validate:content` / `scripts/validate-content.mjs`                            | Asset catalogue and source/licensing pointers must remain consistent with a moved/deleted resource. Catalogue-only assets are still known consumers.                                                                                                                                                                                                                                                                                    |
| `scripts/start-{sprite-combat,world-lab}.sh`, `pnpm dev:{combat,world,map}`         | Separate server/web/lab entries. Preserve useful stand or remove its command with the stand; do not leave a dead route/script.                                                                                                                                                                                                                                                                                                          |
| `apps/web/vite.config.ts`, scripts Vite file-access policy                          | Deny full private atlas and authoring paths to ordinary client; removing editor files must not weaken the guard or expose hidden cartography.                                                                                                                                                                                                                                                                                           |
| `scripts/check-pr-scope.sh`, docs routing in `orca-validate.sh`                     | The inventory JSON is data under docs, but `orca-validate.sh` recognizes only Markdown as documentation and routes this PR as broad. No rerouting/script change or duplicate local full suite is added. PR scope requires an issue or its restricted work-package path pattern; an engineering audit page alone does not match that pattern. CI remains advisory; do not invent a gameplay issue link or alter the gate for this audit. |

## Proposed deletion order and successor boundary

This is the proposed dependency order for owner review, not an approved deletion
batch or a new product plan. WLC-02/WLC-03 may prepare concrete slices and WLC-04
may prepare evidence changes; no successor implementation starts here.

1. Accept the baseline/classification semantics; refresh main/open PRs and isolate
   the later write set. Resolve PR129’s experiment ownership and retain unmerged
   frames/source before touching the spike. Check PR337’s map cleanup and PR336’s
   novel art/route overlap. Preserve original WIP and all player data.
2. Renderer slice: migrate only the test-only hex helper consumer and old wiki
   pointers, preserving the other five current geometry regressions. Then remove
   `hex-mesh.ts`. Run affected hex/grid tests and web types/build. This is the sole
   presently identified per-file DELETE candidate.
3. Archive the paired renderer-spike/baker/assets as a coherent experiment after
   PR129 disposition, preserving ADR/evidence/license/provenance links. Remove
   its workspace package/scripts/config entries, then regenerate the pnpm lockfile.
   Web Babylon and engine-neutral inspector stay. Check remaining workspace and
   production web builds; do not strip Babylon from the application.
4. Graphics/atlas slice: agree exact current sprite/terrain/fallback retention,
   migrate galleries and source references, then archive individually reviewed
   non-runtime revisions. v6 plus core geometry/roads/marker/privacy modules and
   v5 regeneration source remain. Old editor profiles/code must be decoupled
   before their source families can move. Recheck map/encounter normal entry,
   picking/input/reload and the affected day/night presentation in that slice.
5. Evidence preparation: qualify current summaries and fixture browser/SQL claim
   boundaries; keep useful regressions. Prepare a real ordinary journey for any
   missing full-M1 criterion. Never delete seeded unit/integration tests merely
   to make an acceptance report look authentic, and never insert a desired
   terminal state to close the ordinary journey.

No resource file is deleted, moved or modified by WLC-01. Proposed checks name
future concrete risks; no mandatory broad CI/coverage or new tool framework is
introduced. Deletion candidates with unresolved dynamic/external/source consumers
must remain REVIEW_REQUIRED, even after the audit PR is accepted.

## Acceptance readback

- Per-file scope/consumers, exact source SHA and active/history separation: recorded.
- v6 runtime, editor and regeneration dependencies: separated; v5 is retained.
- Client previews versus canonical writes and prepared tests versus E2E: recorded.
- One DELETE candidate has explicit consumer migration; 507 uncertain paths are held.
- Removal order: proposed above, **PENDING_REVIEW** by the owner.
- Runtime/gameplay/visual changes: none. Current audit checks are in the baseline.
- Audit integration: owner-authorized after the review recorded in
  [baseline](CONSOLIDATION_BASELINE.md#review-and-merge-authorization--2026-11-07).
  GitHub PR419 proves actual merge; approval to execute successor work or the
  proposed deletion sequence does not follow from this audit merge.

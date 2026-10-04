# Free global-map movement — implementation assignment

## Tree diversity on current main — 2026-10-05

Owner explicitly requested “Implement — доведи всё до рабочего состояния в main”.
This authorizes the bounded implementation, PR and expected-head merge of the
fourteen-form forest mission. Parent owns isolated `codex/forest-diversity-main`
on merged `917644a` (PR146), source integration, documentation and final checks.
The primary checkout contains other owners' terrain/art/wiki/skill drafts and
player data; preserve those exact changes while updating main. No deployment,
auto-merge, paid production or unrelated draft publication is authorized.

Continue the accepted composed-trunk/curved-canopy renderer and original
map-dark atlas/palette/projection, rather than replacing it with the old-base
whole-tree sprite attempt. Four existing body assemblies anchor the expansion.
Target 14 authored assemblies: seven deciduous and seven conifers, each with
four mature forms (broad/compact/asymmetric/split crown), two young forms
(slender/dense) and one old living form. Distinction must come from authored
branch/crown mass arrangement and age proportions, not hue, flipping or yaw.
Ground axes, measured source/root/attachment pivots, curved near/far masses,
NW light, shared batched geometry, nonpickability and prop depth remain owned
by the current renderer. No new species, lore, canonical movement/collision/
speed/save rule, framework or dependency. Prior twelve whole-sprite PNGs and
exact provenance remain preserved in the unmerged old `tree-diversity` checkout;
its catalogue-only acceptance does not accept this composed integration.

Natural placement carries forward the reviewed finite deterministic sampler:
850fp smooth density pockets, clearings,380fp edge thinning, age-aware modest
sizes, no identical form within440fp, road-bank110fp plus root radius, sites
260fp (city400fp) plus radius, and blockers with radius. Public map edition
seeds bounded sampling (20000 attempts/1600 accepted trees); actual public
terrain priorities, obstacles and authored pinewood geography remain authority.
Roads, targets and entrances must remain visible and operable.

First playable: travel beside Bereznyak, inspect forest edges/clearings at
close and overview zoom in day/night, STOP/reroute/reload, pan and wheel without
page scroll or unwanted orders. Independent read-only source and playable critic
compare current screenshots/journey with unit-c-ink, Bereznyak/place lore and
approved map-dark parts. Fix material findings and repeat affected review.
Focused placement and existing complete-tree geometry regressions plus web
checks are local; final clean bootstrap/stress/PostgreSQL gate runs once in
normal PR CI. No test or quality gate weakening. Publication and clean PR CI
remain pending; performance/enjoyment remain NOT_MEASURED. Normal public fixture sign-in approval is requested separately after the earlier automatic
approval rejection; no authentication workaround or fabricated travel state.

### Local result and evidence — 2026-10-05

Implemented fourteen authored assemblies using the original atlases: seven per
family, with mature/young/old crown arrangements. Actual public geography produces
504 trees and includes all fourteen forms (8–62 instances per form), with stable
reload placement, irregular density pockets, clearings and age-aware edges.
Conifers share a bole and differ mainly in bough arrangements; stronger silhouette
contrast is optional polish, not fourteen new species or dramatically different
body shapes. No new asset, dependency, migration or canonical gameplay/save rule.

Independent read-only source review found no material placement, clearance,
grounding, prop-depth or input defect. The repeated art critic inspected twelve
current production-mount/gallery day/night overview/close captures against the
approved unit/place/atlas references and returned READY_WITH_LIMITS: no reproduced
material seam, root, light, style/lore or road/site readability defect. Captures are
local `/private/tmp/warwrit-forest-review/`; the untracked gallery/public-geography
harnesses are excluded from publication. They do not contain company/gameplay state.

Parent native input on the production mount logged SITE for the opaque city,
TERRAIN through a tree and grass, and STOP for S. Pan/zoom added no orders and
window scroll remained zero. This is renderer callback proof only, not server
travel/arrival or saved-position proof. New authenticated journey/STOP/reload are
NOT_RUN: automatic browser review rejected access to the local Dex login while
the separately requested fixture-sign-in permission remains unanswered. No alternate
authentication surface, account/data reset, fabricated supplies or time was used.
PR146's earlier journey remains historical evidence, not current journey acceptance.

Local checks: four focused forest/geometry regressions with coverage, web
typecheck, changed-file lint, original-resource validation (87 assets), production
build (before the final behavior-preserving scene extraction) and diff check PASS. Full sequential coverage FAILED: 629 passed, 47 skipped,
two unchanged navigation-field tests exceeded their existing 5s limit. It produced
no coverage JSON, so the first audit FAILED to read that file. Focused coverage
then exposed an inherited picking callback above the audit threshold after code
movement; reuse the existing site decoder and separate terrain-hit coordinate
validation to retain all original guards and lower callback complexity. Extract
the existing site assembly/alpha-mask loop into cohesive renderer functions,
retaining exact materials, measured projection, contacts and picking order.
Independent source review found no material change at these boundaries. No tests,
timeouts, assertions or quality thresholds are weakened. Final unchanged changed-code audit PASS with current focused coverage; the normal
pre-commit hook repeats it before publication. Clean full bootstrap,
combat stress, PostgreSQL and full coverage are owned by normal PR CI, NOT_RUN
locally. Sustained FPS, temporal animation and enjoyment are NOT_MEASURED.

Primary main has another active location-depth writer, plus retained unrelated
terrain/art/wiki/skill drafts. Integrate remote main in the isolated checkout;
local-primary update must wait for shared-file ownership or preserve those writes
without stashing/restoring an active writer's files. No deployment authorized.

## Component forest integration — 2026-10-04

Owner explicitly requested review, PR merge and local main update for the approved
5290 map. Parent owns `codex/component-forest-integration`, based on merged
`bcc30f5` (including supplies PR144); no deployment or other PR is authorized.
The earlier standalone 5290 checkout is an art reference, not an integration base.

Bounded port: original dark ink/wash terrain and five settlement cutouts; measured
source aspect, opaque bounds and entrance pivots; three deciduous bodies and one
pine composed from original trunk/foliage atlases, with coordinate-seeded part
variation and curved near/far canopy surfaces. Sources/prompts remain in
[map-dark](../../assets/art/m1/map-dark/README.md) and the asset manifest.
Ground, roads, party, route and canonical movement retain the current main
implementation. Tree roots and settlement entrances sample its shared triangle
height field; decorations remain nonpickable. Alpha-aware site picking rejects
transparent margins. Labels use projected visible bounds and measured HTML sizes.
The current supplies party sprite, small ring, road types, V3 interpolation,
raised-ground wheel anchoring and living-place visits remain present.

Style authority remains ADR-0006, original unit-c ink and matching original place
illustrations. No new lore, navigable geometry, faction or gameplay mechanic.
Earlier prototype approval does not accept this main integration. Independent
source review and integrated day/night overview/close playable critique are
required. Full game quality, enjoyment and all-device performance are NOT_MEASURED.

Integration findings and fixes: active-route labels were resetting their measured
base offset; route avoidance now retains zero base translation and only adds the
needed vertical displacement. Relief depth clipped painted city foreground below
its entrance pivot; towns and both tree batches now share one prop pass with
relative depth after terrain. Opaque site hits take precedence over terrain to
match this visible layering; transparent margins fall through. While a mask is
loading, that site hit cannot silently dispatch a terrain order. Original local
water/peat under Tikhaya Gat and the ruined mill's wheel mouth are restored as
cosmetic contacts in the main terrain shader, with restrained local reeds.

Checks: seven existing surface/camera tests, web typecheck, changed-file lint,
format/content validation and diff check PASS. Independent repeated source review
found no remaining concrete material defect in the scoped source, including the
wet-contact shader. Clean `scripts/bootstrap.sh` PASS:627 unit checks/47 skipped,
10,000 combat battles, migration smoke and14 real PostgreSQL auth/encounter checks;
its disposable infrastructure was removed. Final cosmetic corrections overlapped
that gate's build; final published-head CI is still required. Initial coverage
FAILED two unchanged5s movement-field timeouts under concurrent local scene load
(625 passed/47 skipped). Unloaded sequential replacement passed627/47 skipped. After bounded helper
extraction, final sequential coverage passed628/47 skipped, including one public
NullEngine regression for all four assembled trees: deterministic geometry,
complete relief grounding, curved normals, nonpickable shared prop layer and
geometry retained across lighting changes. The initial new-code audit FAILED;
shared seeded hash/obstacle checks and cohesive assembly/projection/label helpers
removed introduced duplication/complexity without suppression or policy changes.
Temporary test/type/lint failures during extraction were corrected; final focused
checks and unchanged changed-code audit PASS. No timeout/assertion/gate weakened.

Normal second local fixture login and company creation succeeded. Night departure
North Court→Stone Ford showed65s and paving×2; S STOP retained
(90002024,-158732552)microFp at revision5 through reload. Normal return used a V3
plan, survived moving reload, arrived at North Court
(100663296,-174391296)microFp/revision7 and stayed there after reload, plan null,
cash850. The first arrival wait matched stale pre-command state; this was corrected
by a separate exact-goal arrival/readback, not counted as an arrival pass.

All five opaque site samples and HTML labels→SITE; all five transparent margins→
TERRAIN. These15 POSTs were intercepted/rejected locally; no backend state writes.
Final opaque city foreground below its entrance pivot also dispatches SITE
(`kamenny-brod`); the intercepted request leaves revision7 unchanged.
Native pan40.00975/-20.00465CSSpx, raised-ground wheel error3.22e-6 scene units,
scroll0/gesturePOST0. Both tree meshes are nonpickable; a tree click→TERRAIN.
These are parent executions; independent critic did not operate the browser.

Current screenshots are local `output/playwright/component-integration-r3-*`;
night moving/stopped/arrived captures use `component-integration-journey-*`.
Earlier R1 city clipping and the first R3 NIGHT default unloaded capture were
rejected. The loaded replacement passed independent review of16 DAY/NIGHT views.
Final extracted source was independently reviewed with no material regression;
post-extraction eight DAY views use `component-integration-final-day-*`.
The critic's final revised acceptance is recorded in the PR; it inspected captures
and parent-run journey evidence, rather than operating the browser itself.
No ideal/full-game/M1, enjoyment or all-device performance acceptance.

The old first-account prototype save remains preserved: it stored planVersion2
with mapEditionV5 and is rejected by current main. It was not rewritten or used
for acceptance; the second fixture company was created through the real UI.
Existing released0014 supply migration was applied to that retained local test
DB; this slice adds no migration. Local implementation ready for publication; exact-head PR CI/merge readback still
required. Primary has active writers and unrelated route/terrain/doc drafts;
local-main update must wait until their writes stop and preserve both histories.
No deployment authorized.

### Concurrent main integration — 2026-10-05

Published [PR146](https://github.com/Vovanostm/warwrit/pull/146) initially met
newer main `4a82c36`, which merged route-visibility PR145 during asset upload.
Integrated that main in the owned checkout; retained unmasked complete route and
goal annotations and both branches' dated documentation. Only the React import
and changelog insertion conflicted. No gameplay, tree, site or terrain change
from this integration. Independent source review and final PR CI own current
combined-code acceptance; prior captures remain bounded evidence. In-app browser
access for final refresh was rejected by URL policy; current combined-route
browser capture is NOT_RUN, and no alternate surface bypass was attempted.

## Tree art rejection and diagnosis — 2026-10-04

Owner reports incorrectly oriented, visibly flat trees after PR141. This supersedes
vegetation-art acceptance, not proven terrain relief, road/route geometry or saves.
This is the continuing isolated map-art correction mission: the owner explicitly
requested worktree, PR and merge; deployment/auto-merge remain unauthorized.
Source readback: active5287 serves the primary06b8555 renderer with Y-only
billboards and alternating negative X scale, which compresses the sprite view and
mirrors baked lighting. Merged5291/c47e770 configures the source plane as camera-facing and uses
positive scale. Babylon9.28 instances do not copy that billboard mode; actual tree
instances remained unrotated and appeared sheared/leaning in the diagonal camera.
Source-plane changes alone neither fixed those instances nor supplied art volume.

Both existing tree assets are near-frontal portraits: long exposed front trunks,
side-facing branch tiers and fine leaf noise rather than readable crown tops and
near/far masses. Their original provenance already records a lower/subtle camera
angle and predominantly partial alpha. A single plane and contact ellipse cannot
correct an unsuitable source projection. Source dimensions/alpha-foot margins
also need explicit aspect and root-pivot metadata rather than a square/default foot.

Independent critic revised tree art/angle quality to CHANGES_REQUESTED; its
previous dimensional-sprite acceptance was too broad. Smallest next playable
correction: one deciduous and one conifer transparent ink sprite matched to fixed
orthographic35.264-degree elevation/45-degree azimuth, broad irregular canopy
masses, visible crown top and shadowed underside, shared NW light and muted palette.
Keep the existing fixed-camera2.5D pipeline, positive scale and shared terrain
contacts. First accept town+tree close and normal forest frames with planted roots,
rounded readable crowns and unobstructed party/route before adding variants.
Do not cross-copy the same frontal raster or change the renderer framework.
Implementation in `codex/tree-projection`, isolated road-art-quality checkout on
`c47e770`: each tree instance explicitly faces the full camera; two original
transparent ink sprites show elevated overlapping canopy masses and shared NW
light. The first generated pair was rejected as frontal and both viewpoints were
redrawn. Source PNGs stay unmodified; measured alpha-root coordinates and aspect
now ground the visible trunk rather than the transparent frame bottom. Positive
scale and the existing terrain contact wash remain. Site/banner transforms are
equivalent; canonical geography, speed, picking, schedules and saves are unchanged.

Current integrated browser: genuine night overview/close, daytime deciduous+town
and conifer close/region overview inspected on5291. LMB pan and wheel preserve
stationary settlement state. A normal RMB journey to Bereznyak was rejected with
insufficient supplies; current bazaar says trading is unavailable. Successful
moving/arrival proof for this correction is NOT_RUN; stock/time/player DB were not
fabricated. Prior PR141 journeys remain historical evidence only. Independent
repeat critic returned READY_WITH_LIMITS for stationary visual acceptance: corrected
canopy tops, short rooted boles, shared elevated viewpoint/light and readable crown
volume; no reproduced material angle/grounding/readability defect in supplied views.
Close forest repetition is optional future polish; use authored variants with the
same light, never flipped copies. Critic inspected source/captures, did not operate
the browser. Independent source review found no material defect in exact Babylon
instance inheritance, pivot/aspect mapping or preserved site/banner/navigation
boundaries; reviewer tests/services NOT_RUN. GitHub owns current-head clean CI
and expected-head authorized merge readback for `codex/tree-projection`; author
checks and stationary visual acceptance are separate. No full-M1 or enjoyment
acceptance.

Checks:12 existing renderer projection/surface/camera tests, web typecheck, changed
code ESLint/Prettier, content validation and normal quality audit passed. Coverage
with the owned animated scene unloaded passed618/46skip under unchanged limits;
first locally loaded attempt FAILED two unchanged5s field-build timeouts
(616 passed/46skip). No test or policy was weakened. The final clean
bootstrap/stress/migrations gate will run in the PR CI, not duplicate local runs.
Primary supplies work and its runtime are outside this slice's write ownership.

## World volume correction — 2026-10-04

Owner rejected the previous shallow crown as flat. This supersedes its visual
acceptance, not its exact x/z navigation or frozen schedules. Sole renderer writer:
parent on `codex/world-volume`, isolated checkout at base `1657bd4`; continuing
road mission includes PR/merge, excludes deployment and other branches.

One finite presentation height mesh supplies terrain, road draping, vegetation,
settlement/party contacts, sampled route projection and actual ground picking.
Fixed world isometry uses diagonal ground axes; already projected ink sprites
retain their source proportions and lighting. Visible rolling ground and hill
slopes, quiet road ruts/crown and soft contact shadows must read together.
Shared elevation never changes canonical distances, costs, collision or saves.

Acceptance: actual road/field journey with STOP/reload; day/night overview and
close views with road bends, hills, forest and inhabited/ruined places; terrain
ray-pick and route/party contact roundtrips; wheel anchoring and LMB pan without
movement commands. Independent critic must compare unit-c-ink, Severny Dvor
place illustration and existing weathered building art. No palette-only pass.
Implementation: the public256x192 grid is rendered as a real triangle height
field. Hills, rock and low wet ground have broad continuous relief; settlement
contacts are terraced. Paired road banks are subdivided linearly at most24fp,
with seven cross-section samples, quiet crown and outward8fp decorative shoulder.
All contacts and route chords sample the actual mesh diagonal; x/z remains exact.
World camera elevation is35.264 degrees, azimuth45 degrees; battle defaults stay
unchanged. Projected art keeps its original aspect/bottom pivot and baked lighting.
Terrain-normal shading and grounded ink contact shadows expose crest/flank volume.
A matching0.85-scene-unit edge mist ends the finite atlas; meadow fades with
screen-door depth writes. Moving banner/label overlaps use measured screen bounds
and an in-viewport label displacement, preserving input and canonical positions.

Author checks: surface/picking/draped-chord and real raised-ground wheel anchoring
at DPR1/2, including zoom reversals:7 focused checks passed. Web typecheck/build,
changed-file lint/format and normal changed-code audit passed. Integrated coverage
passed618 checks,46 skipped; a later two-worker coverage retry timed out in two
unchanged field-build checks under concurrent local load. Sequential one-worker
coverage passed618/46 with original timeouts and thresholds. First clean bootstrap
at `fa0baee` passed unit/build/10000 battles but FAILED one FIRST HUNT terminal
physical-evidence database scenario; no assertion/policy was weakened. Final-code
clean bootstrap at `885e63f` PASSED:618 unit checks,46 skipped,10000 battles,
migration up/down smoke and14 PostgreSQL auth/encounter checks. Its disposable
Compose project was removed; retained player infrastructure was untouched.

Actual retained company journey on5291/API3217: field48s atx1 arrived North Court;
paved69s tox2 became25s, STOP/reload kept the same road cusp, resume23s arrived
Stone Ford. Return69s became60s, moving reload resumed at34s and arrived North
Court. Night69s became38s and arrived Stone Ford. LMB pan and raised-ground wheel
did not change target. Fresh OIDC login succeeded without database reset. A second
retained test company was used after the first ran out of rations; no stock was
fabricated and replenishment UI remains outside this renderer slice.

Independent source checks fixed raised-ground zoom drift, grass depth occlusion
and top-clipped displaced labels. Independent visual checks fixed insufficient
broad relief, raw edge void, floating edge grass and a site-label/banner overlap.
Final independent critic returned READY_WITH_LIMITS at `885e63f`: genuine day
active39s confirms the full flag/ring clear of Stone Ford label; fresh day overview
confirms the atmospheric edge without material floating grass. Combined with night
68-to38s views, relief, planted sprites, road contact, route portions and targets
remain readable. No reproduced material visual defect remains in supplied views.
Angular canonical route corners and further road contrast/night mood are optional
preferences, not acceptance defects. Critic inspected finite frames and author
journey evidence; it did not rerun tests or measure whole-game quality/enjoyment. The reproduced Stone Ford label
overlap is corrected in an actual day48-to38s free-point road trip: measured label
bottom stays6CSSpx above the banner bounds. A top-edge displacement uses the
below-banner alternative; arrival/completion restores the label base position. Inspected day/night overview/close
views do not measure subjective enjoyment, full M1 readiness or hardware capacity.
No game-core/protocol/server behavior, migration, balance or lore change.
Published in [PR141](https://github.com/Vovanostm/warwrit/pull/141), which owns
current-head CI and actual authorized merge readback. Retained company returned
to Stone Ford on5291 for the owner playtest; player infrastructure is preserved.

### CI scheduling correction — 2026-10-04

PR141 [run37199433423](https://github.com/Vovanostm/warwrit/actions/runs/37199433423)
passed clean bootstrap but FAILED the coverage step: unchanged authored-junction
field-build check took5149ms against its5000ms limit under two concurrent workers;
617 checks passed,46 skipped. Local exact-code sequential coverage had already
passed618/46. Run coverage with one worker in CI to avoid simultaneous expensive
field compilation on the bounded runner. Tests, assertions, timeouts, coverage
and audit policy remain unchanged; renderer/navigation code is unchanged.
Replacement current-head CI must pass before the authorized merge.

## Road materials and isometric relief — 2026-10-04

Owner authorizes this isolated slice's PR and merge, including previously approved
V5 exact geometry needed to align road rendering and movement. Sole writer:
`codex/road-art-quality`, base `9c86605`; primary living-place and previous
geometry checkouts are preserved. No deployment or other-branch merge.

Three original generated1254px-square paving/dirt/trail materials replace the
brown procedural road and brick grid. Muted stones, packed earth and worn loam
share one palette. Five-vertex cross sections have restrained crown/light grain,
continuous station-distance UV and inside-core earth transitions matching the
outward8fp non-speed skirt. Canonical x/z banks and ground picking/path/party
remain authoritative. Junction depth priority stays deterministic. Camera remains
orthographic50degrees; relief is decorative, not navigation elevation.

Reference inspection: official Battle Brothers2014 world-map blog for composition
(not a modern renderer claim), and VCMI's actual map-editor image for winding
cobble corners and readable boundaries. Assets are original, with provenance in
`assets/art/m1/roads-v1`; recorded times derive from original file modification
times, not invented tool timestamps.

Critic iterations corrected a downward-normal winding mistake and the initial
cut-out paving edge. Final independent verdict: READY_WITH_LIMITS, no reproduced
road-art blocker in day moving paving/default/close, trail/dirt junction and
stationary night views. Accepted captures live locally in `output/playwright/`:
`moving-day-default.png`, `moving-day-close.png`, `final-trail-close.png`,
`final-day-junction.png`, `final-dpr2-night-default.png`,
`final-dpr2-night-close.png`, `final-dpr2-night-overview.png`. Night captures are
stationary. Invalid blank/clipped captures are excluded. Critic inspected frames;
journey and quantitative measurements are author evidence.

At1280x800/DPR1 and zoom2.00023, max decorative relief-to-ground separation is
0.879CSSpx and min road normalY0.998899. Ground route stays in the visible road
through bends; material continuity and grounded ring are readable. Existing V5
journey evidence includes arrival, moving reload, STOP/reload and road-to-field
speed exit with the player database preserved. Web5291 uses this worktree; API3217
now runs this worktree with retained configuration and database. No player data reset.

The mandatory quality audit required cohesive helper extraction in exact
navigation/search/validation, web interpolation and owned-company read locking.
Independent source comparison with staged or preserved original source found no
valid-input semantic defect. Test workers are bounded at2 for heavy suites;
assertions, timeouts, audit thresholds and hook policy remain unchanged.
Final code:16 public movement tests, fresh610-check coverage and the unchanged
new-only quality audit pass.11 real PostgreSQL movement checks pass against the
owned migrated disposable database. Clean `scripts/bootstrap.sh` passes610 unit
checks (46 skipped),10000 combat battles, migrations and14 SQL auth/encounter
checks. This local clean run preceded the final equivalent sorted-neighbor
`forEach` rewrite; focused tests/coverage/audit cover final code, and clean
current-head PR CI is required before merge. Initial unrestricted-worker test
timeouts and introduced complexity/clone findings were corrected, not bypassed.

Final API readback: ordinary night road order showed66s/paved×2 in the composed
DPR1 overview (`road-final-night-moving.png`). UI STOP/reload returned identical
(48589673,-90355124)microFp and200/STATIONARY_TERRAIN. This adds one actual
active-night observation; detailed/all-DPR active-night matrix remains NOT_RUN. Final single-frame
independent critic READY_WITH_LIMITS: corridor fit and company/destination/legend
are readable; no blocking defect. This supersedes the earlier active-night gap
only for that composed overview.

Limits: fresh5291 login NOT_RUN; full-device and subjective
play acceptance NOT_MEASURED. Existing search p95135.82ms still exceeds50ms.
Localized edge weathering/long-paving variation are optional refinements, not
claims of complete professional-game or full-M1 acceptance.

Published in [PR140](https://github.com/Vovanostm/warwrit/pull/140). The owner
explicitly authorizes merging this slice. That PR owns current-head clean CI,
review and expected-head merge readback; consult GitHub for live integration
status. Both disposable verification databases/volumes were removed; final
API3217/realtime3218 and web5291 retain the player database.

### CI coverage correction — 2026-10-04

[Run37172997817](https://github.com/Vovanostm/warwrit/actions/runs/37172997817)
passed the full clean bootstrap, then failed one5s authored-junction field-build
coverage timeout (609 passed). It is FAILED, not a completed delivery gate.
The correction removes actual discarded geometric work: reject non-intersecting
finite edges before GCD, and skip polygon edges outside a point's closed height
range. Equality/horizontal edges/negative denominators/collinearity retain the
same rules. The tried exact-cell shortcut gave no material improvement and was
discarded. Assertions, timeouts, coverage and audit policy are unchanged.

Sequential same-host baseline/current compilation:1496.33ms→1082.28ms (27.67%).
Every49152-cell terrain/overlay/walkability/danger value, all compiled grid-edge
durations and road graph match the retained baseline. Four actual site paths and
entire compiled V3 plans match.16 focused coverage cases, full610-check coverage
and origin/main quality audit pass.11 real SQL movement scenarios are rerun on a
new owned disposable database. Independent source reviewer found no defect in
signed-range or closed-height filtering. Replacement current-head clean CI must
pass before merge. Previous135.82ms search p95 is historical; post-fix search
p95/capacity NOT_MEASURED, with no achieved50ms claim. Renderer/materials are
unchanged, so accepted visual evidence still applies.

## Exact geometry cycle — 2026-10-04

Owner approved the reviewed polygon/station design and step-by-step implementation.
Version3.5.0 of the owning JSON replaces centre-cell navigation for new orders.
One parent writer, `codex/map-geometry-v5` at base `ae9bf3a`, retained movement
checkout; verified localhost5291/3217 now runs this checkout with the original
player database and saved company preserved. During final review another runtime
replaced5287; it was not stopped or overwritten. Final web moved to5291, and
ordinary receipt recovery on the checked version preserves accepted state. No publication or merge.

New V5/polygon-v1 orders compile planVersion3: exact rational polygon intersections,
immutable candidate buckets and exact adjacent-grid costs, explicit road stations,
actual-point destination/clearance and speed. A cell grants no bonus to its whole
area. Road-chain chords stay inside the connected core; faster field shortcuts
remain legal. Exact event denominator is bounded by2^61/19digits. Old V2 plans,
receipts, deadlines and saved positions execute frozen; no migration.

Terrain uses eight explicit weights with normalized linear control data; water is
not residual. The visible core is opaque across its physical width; a separate8fp
outward skirt has no road speed. Banks/stations/longitudinal UV share authoring;
winning surfaces have explicit render/depth order. Party and SVG use the accepted
plan with ground projection at y=0, and stationary labels come from the server.

Observed: normal authenticated69s road-faster multi-bend trip vs100s direct,
arrival, moving reload, partial STOP/reload with the exact same retained point,
reroute into the field and ×2→×1. Six new regressions plus ten existing movement
specs pass, including narrow road arithmetic, rational reload, slivers, danger,
clearance and an off-centre thin bridge. Independent source review found and
confirmed correction of conservative-cell destination rejection. Independent
visual critic sees line/ground-ring correspondence through bends and night reload;
no material blocker in those frames, READY_WITH_LIMITS.

An independent winding-number/intersection oracle checked all24 road-labelled
spans of the four authored site routes:24 positive-length subintervals, zero outside
matching road polygons. Paved bank probes:1fp inside ×2;4fp in skirt and12fp outside
×1. These finite checks do not prove every possible route. Browser rAF sample:
120fps average, p95 frame10ms across a minute of mixed moving/stationary play;
GPU timing and capacity are NOT_MEASURED. Picking round-trip DPR1/2 samples below
0.001CSSpx at default/min/max zoom for both DPRs. All six active SVG split
samples agree with the party ground projection below0.006CSSpx.

Performance is improved by immutable exact edge compilation: map compilation
1.44s;100 deterministic goals yielded97 paths,3 blocked targets, zero complexity
overflow. Search p50 71.84ms/p95 135.82ms/max159.15ms on the owner's Mac. The50ms
p95 target is **not met**; do not turn functional/visual checks into a performance
pass. Optional remaining art polish is warm stone variation/weathering.
Clean `scripts/bootstrap.sh` passed in a disposable copy:610 unit checks
(46 skipped),10000 combat battles, migrations and14 PostgreSQL auth/encounter
checks. Additional continuous-movement PostgreSQL file:11 passed, including
V3 JSON persistence. Final server build/restart preserved player data; normal
V3 movement and partial STOP/reload retained exactly
`(89456745,-157931675)microFp`. Both disposable verification databases were removed.

The critic found overview company visibility and then a label-overlap defect.
A fixed screen cue now identifies the company when the projected banner is
smaller than24px; five nearby vertical candidates avoid settlement labels with4px
clearance, and a leader preserves the ground anchor. Final collision-only UI fix
followed the full gate: web production build/typecheck/lint and browser rectangle
readback passed; domain/database/stress were not rerun for that UI-only correction.
Final visual critic:READY_WITH_LIMITS. Corrected cue placement no longer overlaps
settlement names; DPR1 close/overview and DPR2 close show readable active route
and history within the paved corridor. The final DPR2 overview shows arrival
and proves only cue/label placement; prior active overview evidence retains its
finite scope. New isolated origin5291/API3217 also passed ordinary movement,
arrival and partial STOP/reload with identical point
`(95068872,-166174486)microFp`. Existing session reused; fresh OIDC login on5291
is NOT_RUN. Earlier gate failures from local artifact
formatting, unnecessary exports and an exact-optional test fixture were corrected;
checks were not weakened. Source-only four-slot grid-cache review found no indexing
defect; nested region mutation remains an unexecuted readonly-contract risk,
with no mutating consumer found.

Try [the running map](http://127.0.0.1:5291/): ПКМ по дороге/полю — идти,
«Остановиться»/S — стоп; ЛКМ drag and captured smooth wheel retain their controls.

## Route presentation critique — 2026-10-03

Статус: **PROPOSED / NOT_IMPLEMENTED**. Владелец отверг визуальное качество
маршрута и запросил независимую критику с профессиональным решением.
Свежий арт-критик `/root/route_art_direction_critic` проверил предоставленные
кадры и текущий источник в isolated free-world-movement checkout. Код игры,
браузер, база и работа параллельного landscape-цикла не изменялись.
Эта оценка дополняет предыдущую проверку работоспособности: успешное движение
и отсутствие грубого сбоя не означают профессиональную визуальную приёмку.

### Что не устраивает

На `path-progress-moving.png` маршрут выглядит как отладочная линия примерно
в один пиксель: светлый участок теряется на дороге и траве, серый след почти
исчезает. Цель возле поселения слишком слабо выделена. Толщина образцов легенды
не соответствует изображению на карте. Источник использует `CreateLines`
по прямым сегментам `speedSpans`; состояния различаются цветом и прозрачностью,
а размер цели зависит от масштаба мира. Несколько резких поворотов на текущем
почти прямом кадре не подтверждены; угловые соединения следуют из построения.
Численный контраст, ночной вид и диапазон масштабов здесь не измерены.

### Одно предлагаемое оформление

Картографическая нить похода: пергаментный штрих с тёмной обводкой впереди,
холодный серый пунктир позади. Форма дублирует смысл цвета. Все размеры ниже —
экранные CSS-пиксели, сохраняющиеся при приближении/отдалении и DPR 1/2.

| Элемент  | Параметры                                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Осталось | Сплошной штрих 3,5 px, `#F2D49A`, 95%; тёмная обводка 6,5 px, `#241D16`, 80%.                                                                                                          |
| Пройдено | Реальный пройденный префикс, пунктир 2,5 px, `#B7C2C6`, 85%; штрих 5 px / промежуток 8 px. Подложка 4,5 px, `#241D16`, 65%, с тем же пунктиром.                                        |
| Стыки    | Скруглённые окончания и соединения, без острых шипов или разрывов.                                                                                                                     |
| Цель     | Полый ромб 16×16 px, штрих 2 px, тёмная обводка, центральная точка 3 px. Для поселения — ромб возле подписи, если спрайт скрывает наземный знак; географическая цель остаётся прежней. |
| Отряд    | Существующее знамя и кольцо; линия не проходит через их изображение. Зазор от внешнего края кольца 3 px.                                                                               |
| Легенда  | Образцы 36 px с фактическими толщинами, обводкой и пунктиром; подписи «Пройдено / Осталось».                                                                                           |

Тёмная обводка отделяет штрих от светлой дороги и растительности. Пергамент,
приглушённое золото и тёмные чернила согласованы с атмосферой средневекового
наёмного отряда. Передняя часть показывает действующий приказ; пунктир отмечает
сделанную часть текущего похода. Старые приказы не накапливаются на карте.

### Минимальная реализация и точность

- `continuous-map-scene.ts`: разделить одну принятую геометрию на настоящий
  префикс и суффикс в той же интерполированной точке, где стоит отряд.
  Проецировать путь и маркеры после обновления камеры тем же преобразованием,
  что используется для подписей. Кэшировать неизменяемые вершины плана.
- `ContinuousMapCanvas.tsx`: SVG над холстом с двумя штрихами каждого участка,
  целью и масками. SVG лежит над всем WebGL, поэтому он не может сам оказаться
  под отдельным знамением. Маска исключает проекции знамени и поселений:
  скруглённые прямоугольники по границам спрайтов, радиус 2 px, отступ 2 px;
  кольцо — эллипс с отступом 3 px. HTML-подписи располагаются над SVG.
- `game.css`: слой и честная легенда. SVG и легенда имеют `pointer-events: none`;
  захват колеса остаётся на общем контейнере карты. Обновлять SVG refs через
  `setAttribute` из текущего цикла кадра, без покадровой перерисовки React.
- `viewBox="0 0 W H"` соответствует CSS-размеру холста; `overflow: hidden`
  и прямоугольный clipPath ограничивают слой картой. Невалидные проекции не
  соединяются произвольным отрезком.
- Пройденный пунктир всегда строится от начала принятого плана, фаза 0;
  на смене `speedSpans` меняется конец префикса. Внеэкранные части не отрезать
  до расчёта пунктира. Масштаб может менять экранное размещение штрихов;
  смена местности не должна сбрасывать фазу.

Скруглённый штрих смягчает вид стыков, **сохраняя настоящие повороты пути**.
Удалять можно только точно коллинеарные лишние точки. Произвольный сплайн
может срезать препятствие и показывать ложный путь. Если остаётся сеточная
«пила», отдельная задача навигации должна проверять проходимость сокращений
и пересчитывать стоимость/время новых маршрутов. Принятые старые планы,
расписания и квитанции сохраняются. Новые библиотеки, материалы и миграции
для первого визуального решения не требуются.

### Поведение и приёмка

Граница частей движется вместе с отрядом без скачка при смене скорости.
Новый принятый приказ заменяет старый путь из принятой текущей позиции;
во время ожидания ответа прежний действующий путь остаётся. Отказ убирает
непринятую цель. STOP и прибытие очищают оба участка и цель. Повторный вход
восстанавливает их из принятого расписания.

Приёмка: один показательный поход с несколькими поворотами через луг, лес и
дорогу; дневные/ночные виды, близкий/далёкий масштаб, DPR 1/2. Отряд, цель,
пунктир позади и сплошной путь впереди читаются без легенды; маски не скрывают
смысл направления, SVG не перехватывает ввод. Проверить смену скорости,
STOP, смену цели, отказ и перезагрузку без старых линий/маркеров.

Предложенный измеримый порог: контраст хотя бы одной границы штриха
(светлой середины или тёмной обводки) с соседним фоном ≥3:1. Измерять итоговые
составные цвета вне сглаженных крайних пикселей. При видимом пройденном
участке от 40 px различимы минимум три штриха с промежутками. Значения пока
**NOT_MEASURED**. Новое оформление, браузерный поход, ночная/масштабная
приёмка и производительность — **NOT_RUN**. Предыдущие функциональные
результаты ниже не являются приёмкой этого предложения.

## Route-progress correction — 2026-10-03

The owner observed that traversed travel remained the same bright line and asked
for visible traversed/remaining portions. JSON revision 3.2.1 owns this web-only
correction. The old renderer constructed the full gold line only on plan change.
Now muted grey history sits below a gold remaining suffix, whose first vertex
uses the same interpolated speed-span point as the party on every render. A small
Пройдено / Осталось legend appears while moving. Vertex positions update in place;
span changes rebuild only the suffix. STOP/reroute clears the old plan, projected
completion hides route/destination, and reload derives progress from the retained
accepted schedule. Canonical commands, times, speeds and storage are unchanged.

Real Chrome: six samples over 15 seconds matched remaining first vertex to party
x/z within ~1e-7 scene units; suffix vertices decreased 12→10→9 through speed-span
boundaries while exactly two route meshes remained. A second journey confirmed
the split after reload (history origin differs from current suffix/party), muted
alpha0.55, and final CSS legend colors rgb(140,153,158) / rgb(247,196,99).
STOP removed both line meshes and the legend; a short new ground route started
from the exact stopped position and arrival again cleared meshes and legend.
The browser was left stationary. Initial screenshot inspection exposed equal
legend key colors due to CSS specificity; corrected and verified via computed
styles. An intermediate probe ran after natural arrival and found no legend;
its failed inspection was replaced by the actual moving/STOP/arrival sequence.

Web typecheck, focused ESLint, Prettier and diff whitespace checks passed. No new
unit tests or production/full-game build were needed for this rendering correction;
prior build/database/full-gate results below predate it. Independent critic read
source and moving/reloaded captures: no material readability blocker. Browser
measurements remain parent-owned evidence. Optional polish is brighter contrast
on pale roads; very long allowed plans need a measured frame sample before any
performance claim (remaining span vertices are still allocated per frame).
Captures: `output/playwright/path-progress-moving.png`,
`path-progress-stopped.png`. No commit/push/merge/deployment; earlier publication
quality blocker remains open.

## Scroll and road refinement — 2026-10-03

Owner requested map wheel capture, smooth zoom and more natural winding roads.
JSON revision 3.2.0 records the amendment and primary research: Widelands road
triangle strips, VCMI/Heroes-compatible road rendering, Catlike Coding strategy-map
road blending and MDN wheel cancellation. Closed Battle Brothers road code was
not inspected. Parent remains the sole code/runtime writer.

Map-wrapper non-passive wheel capture includes settlement labels and normalizes
pixel/line/page deltas. A bounded target zoom eases per frame with a 90ms time
constant, retaining the ground point beneath the cursor. Pan cancels pending zoom;
listeners and observer are removed on disposal. Four authored waypoint roads use
bounded integer-fp Catmull-Rom sampling, paired bank polygons and distance UVs.
Base width is 96fp with up to ±13% variation, explicitly superseding 192fp for
new V3 geography. The rendered banks own the exact new navigation speed footprint;
road speed remains 1250 permille. Older accepted plans, deadlines and receipts
remain frozen; V1/V2/V3 terrain positions stay readable. No migration or new asset.

Real Chrome at a genuinely scrollable 1280×550 viewport (document 789px) retained
scrollY=0 when wheeling over ground and Bereznyak's HTML label; outside-map wheel
scrolled 120px. Pan/zoom generated zero movement commands. A native 20px wheel
delta changed zoom 10.9858 through 11.0996/11.1648 toward 11.252 gradually. Pointer
anchor error stayed below 0.08 CSS px. DPR2 reached exact zoom limits 2/28 and reversed
smoothly to 2.04825 from the lower limit. Production build and focused camera/core
checks passed (11); five focused real PostgreSQL files passed 34 with one worker
and original timeouts. The disposable check database/volume was removed; player
runtime/database preserved. Production build retains the existing large-chunk
warning; sustained GPU-present FPS and full M1 remain unproven.

The retained V2 stopped forest point was exactly preserved on V3 read. A new V3
move, partial STOP and reroute started at the exact stopped microFp position;
Bereznyak arrival completed as STATIONARY_SITE. A further ground move after pan/zoom
at observed DPR2 had 0.260 CSS px target reprojection error; the final stationary
point (-94306304, -59047936 microFp) survived reload exactly. Independent critic inspected three
current screenshots and relevant source: no material visual blocker; narrower
road width is now consistent with the owning specification. Optional polish:
overview forest is dark and road surface somewhat pale/uniform. Critic did not
independently run the parent-owned browser or database checks.

Captures: `output/playwright/roads-v3-overview.png`, `roads-v3-near.png`,
`roads-v3-stopped.png`, `roads-v3-arrived.png`, `roads-v3-dpr2.png`,
`roads-v3-final.png`. Current full-game gate was not
repeated for this incremental correction. Earlier publication quality blocker
remains; no commit/push/merge/deployment ran.

## World art and scale cycle — 2026-10-03

Owner requested 3× POI distances, 3× party speed, broader irregular biomes,
more trees and realistic varied materials, with ten texture artists and an
independent critic. JSON revision 3.1.0 records the concrete amendment.
Parent is the sole code/manifest/runtime writer in the existing isolated checkout;
ten workers own separate temporary art directories and the critic is read-only.

The public geography now uses `continuous-v2` with `worldScale=3`: one forward
and inverse renderer transform triples physical spacing and speed together.
Canonical fp/microFp coordinates, clocks and accepted route deadlines remain
unchanged. Both continuous editions remain readable; new intents use V2 geography.
Old receipts replay exactly, and frozen old plans retain their original schedules.
New water is inside a retained blocker; no former traversable origin becomes water.

Ten generated materials are integrated from `assets/art/m1/world-v2`, with exact
prompts/provenance and licensing in the existing asset catalogue. Seven blended
terrain layers use stochastic sampling; roads feather into ground. Shared tree
instances respect actual woodland polygons, roads, blockers and site clearance.
The camera opens near the party; its overview range is wider. The party has a
clear ground ring, and the travel panel exposes accepted terrain/relative speed.
Inactive battle content is hidden after authentic no-active discovery.

Initial independent critique reproduced rectangular slabs, mirrored repetition,
weak party readability and uncontrolled tree scatter. The second pass confirmed
material visual improvement and requested removal of an orphan bridge strip plus
terrain/speed information; both were corrected. The third visual pass and a
separate near-forest arrival pass found no material visual/readability blocker
in their inspected scope. Owner enjoyment and full M1 acceptance remain unproved.

Real Chrome confirmed exact 3× scene POI spacing, 1160 non-pickable trees,
RMB movement, partial STOP/reroute continuity, site arrival at Bereznyak and
off-road forest arrival. The stopped forest point remained exactly unchanged
after reload. Accepted spans expose road 1250 and forest 650 speed permille.
LMB pan and wheel zoom issued no movement requests; DPR2 target reprojection
error was 0.165 CSS px after pan/zoom. Fresh journey/sampling had no browser errors.
Final views: `output/playwright/world-v2-overview-final.png`,
`world-v2-moving.png`, `world-v2-dpr2.png`, `world-v2-forest-arrived.png`.

A short focused Chrome sample on Apple M3 Pro/ANGLE Metal, with only our two
verification builds temporarily paused and then resumed, retained 110 scene
frames: median interval 8.4ms, p95 11.6ms; CPU scene-render interval median 3.9ms,
p95 6.4ms. The earlier sample during simultaneous builds was 112.9/363.3ms.
These are bounded scene-cadence measurements, not GPU-present FPS or a long-trip
performance acceptance. No unrelated owner process was changed.

Clean disposable checkout: `/private/tmp/warwrit-world-v2-gate`, containing the
current production changes and new assets. `scripts/bootstrap.sh` passed format,
lint, architecture, dead-code, pattern/content checks, builds and typechecks;
its parallel unit stage exited 1 with nine test timeouts. The same complete unit
suite then passed **601 tests, 46 skipped** with `VITEST_MAX_WORKERS=2 pnpm test:unit`.
Assertions, test timeouts and source were unchanged. Subsequent existing commands
passed: `pnpm test:combat:stress` (10000 battles, 100 replay checks) and
`pnpm test:migrations` (up/down smoke plus 14 PostgreSQL auth/encounter tests).
This is a recovered verification sequence, not a successful first bootstrap run.

The five focused world/company/contract PostgreSQL files passed **34 tests**
on a separate database in the disposable project, including the new retained V1
terrain-origin regression. Their first parallel run had five test timeouts and
one environment-dependent skip; the complete repeat enabled both database inputs
and disabled file parallelism with the original test timeouts. No game code was
changed to obtain the passes. Logs: `/private/tmp/warwrit-world-v2-gate.log`,
`warwrit-world-v2-unit-retry.log`, `warwrit-world-v2-stress.log`,
`warwrit-world-v2-migrations.log`, `warwrit-world-v2-focused-db-retry.log`.
Disposable project/volume removed; player database/runtime preserved.
The earlier movement quality-gate blocker remains open; no commit/push/merge ran.

## Implementation result — 2026-10-03

Playable continuous movement is implemented in the authenticated game. This is
`PLAYABLE_WITH_REMAINING_ACCEPTANCE`, not full M1 or a pass of all twenty scenarios.
Parent `/root` is the sole final source writer; earlier dated assignments below
are retained history. Working branch: `codex/free-world-movement-v3`; changes are
staged and **NOT_COMMITTED**. No push, merge, deployment or paid resources ran.

Try `http://127.0.0.1:5287`: right-click terrain or a settlement to move, press
`S` to stop, hold the left (or middle) mouse button to pan and use the wheel to zoom. The retained
art-cycle verification ended stationary in the woodland beside Bereznyak.
The prior movement checkpoint ended at Tikhaya Gat with camp closed.

### Delivered behavior and compatibility

- Owner control amendment, 2026-10-03: left-button drag now pans the global map.
  Real Chrome measured a matching 100×50 CSS-pixel label shift with zero movement
  requests; a subsequent right-click sent one MOVE_TO and S sent STOP.
  Existing two camera tests and web typecheck passed on this amendment.
  Earlier full-gate evidence below predates this small control change.

- One authored ground surface, soft terrain boundaries, roads, five existing
  settlements, hidden 256×192 navigation cells and a continuously rendered banner.
  Weighted deterministic A* and validated shortcuts minimize computed travel time;
  speed spans follow terrain/road boundaries without snapping the party to cells.
- V2 `MOVE_TO`/`STOP` retains exact decimal-string microFp coordinates and a frozen
  integer-microsecond schedule. STOP and reroute share the canonical position;
  worker, reads and ordinary/contract commands compose due arrival atomically.
  Late arrival settles travel at its deadline before stationary catch-up.
- Existing revision/CAS, account ownership, exact receipt replay, site access,
  party/member/container movement, stock food/carry and command rollback remain
  integrated. Dangerous authorization is scoped to Tikhaya Gat ↔ Mill through
  `FIRST_HUNT_TRAVEL_SCOPE`. An accepted trip must have actual ETA stock coverage;
  no invented food or new famine policy was introduced.
- The existing location q/r slots contain microFp only for
  `seroe-porechye-continuous-v1`; old editions retain axial units. Movement version
  and region edition distinguish consumers. There is no second writable position
  store, released migration change, new migration or web → game-core dependency.
- Canonical GET `/world/free-movement` returns V2. Explicit `?schemaVersion=1`
  retains the historical read adapter; recorded V1 POST responses replay unchanged.
  New V1 movement intents are rejected. Saved V1 free and V1/V2 road schedules
  retain their original semantics instead of being recompiled with new speeds.
- Unknown POST outcomes keep the exact account/company-scoped request. A later
  click resolves it by exact replay, performs a fresh read, then sends the latest
  queued goal. A historical receipt timestamp cannot rewind render time.

### Actual verification

`/private/tmp/warwrit-movement-final-gate` is a disposable checkout copied from the
assigned base plus the implementation. `scripts/bootstrap.sh` passed: formatting,
lint, architecture, dead code, patterns, content, build and typecheck; **601 unit
checks passed, 45 skipped**; **10,000 combat stress battles**; migration smoke and
**14 real database auth/encounter checks**. Formatting and deterministic ID-order
failures found on earlier attempts were corrected without weakening any gate.
The final retry changes also passed focused lint/format and 12 relevant regressions.
The existing commit hook initially rejected the missing coverage report; the
unchanged `pnpm test:coverage` then passed601 checks (45 skipped) and produced real
coverage for the hook. The hook still rejected `pnpm check:changes`: the main-base
quality audit reports complexity and duplication across the branch. A diagnostic
comparison with the assigned base65c5e39 also fails:62 introduced complexity
findings and19 introduced clone groups, with0 dead-code issues. This diagnostic
does not replace the main-base gate. **Publication/commit readiness is not passed**;
the functional bootstrap and browser checks above do not imply it. No hook or
check was disabled; neither commit attempt created a commit.

A separate disposable PostgreSQL database ran **33 integration checks** across
world routes, V2 continuous movement, company commands/routes and contract company
transitions. This includes 10 V2 cases: replay/conflict/privacy, concurrent orders,
atomic blocked/danger rejection, scoped dangerous trip/return and rejected unscoped
return, stationary no-op, due STOP, ordinary-command arrival/rollback, ETA stock
rejection and late worker arrival. Disposable volumes were removed; the player
runtime and its database remain available.

Real headed Chrome verified arbitrary right-click → partial STOP → reroute, exact
STOP point equal to next plan.from, reload retaining plan ID/deadline, logout/login
retaining the same company, API shutdown through deadline and subsequent arrival,
site-label targeting and camp open/close after arrival. Deliberately losing an
accepted POST response produced an identical retry followed by the latest queued
goal. Pan/wheel/right drag did not issue movement; DPR2 pan/zoom followed by a
single right-click and STOP worked. A fresh reload produced no page/console errors;
intentional offline/response-loss console failures remain historical test effects.
Screenshot: isolated checkout `output/playwright/continuous-final.png`.

### Measurements and finite remaining work

On Mac15,6 / M3 Pro / 36 GB, the retained deterministic 100-route sample found all
paths: p50 **10.37 ms**, p95 **50.88 ms**, maximum **87.04 ms**. The p95≤50 ms target
is **not met**. The final layered scene produced1201 Chrome frame callbacks in
10006.9ms, p95 interval9.9ms. This measures RAF cadence, not GPU present time or
a complete forced30/60/120-FPS acceptance comparison.

The final visual uses four GPU texture layers from existing licensed art, a
normalized 1024×768 RGBA control texture, one-cell visual feather and bilinear
filtering on one ground mesh. Roads are flat continuous corridor strips with
shared texture and longitudinal UVs; decoration does not own collision or ground
picking. The final clean bootstrap also passed after this renderer change.

A public-export probe passed all nine canonical 192fp terrain/road/bridge/ford
integer-duration oracles and unbridged-water rejection. A real Chrome sample
measured marker error1.37 CSS px at DPR1 and2 (ground-ray error0.19px); this is a
representative point, not every camera/object combination. Full forced FPS/GPU
measurement, all incapacitated-member/learning/encounter combinations, large
repeated-reroute resource comparisons and full twenty-scenario acceptance are
not claimed passed.
The original source ZIP gap remains `RC-GAP-MACHINE-01`; proprietary Battle Brothers
implementation details and exact shipped coefficients are not asserted.

Next bounded cycle: resolve the failed quality gate and remaining movement
acceptance/search-time target before publication, content expansion or full M1. The broader sandbox,
physical moving-world encounters and crisis stages retain their own scope.

**Resumed assignment — 2026-10-03:** owner requested implementation of the
revision3.0.0 JSON with skills and existing patterns. The same isolated writer
is active; previous preparation-only/stopped status is historical. Parent owns
the runtime and acceptance. Necessary map-gesture changes may also touch
`apps/web/src/renderer/three-quarter-camera.ts` and directly relevant tests,
preserving battle behavior. `apps/server/src/contracts/ordinary.ts` is assigned
only if needed to settle a due arrival before existing presence/command checks;
no reward or contract-policy redesign. No second code writer or new migration
is assigned. Merge/deployment/paid resources remain unauthorized.

**Active specification revision — 2026-10-03:**
[M1-FREE-MOVEMENT.json](M1-FREE-MOVEMENT.json), revision3.0.0, is the sole full
current specification. It concretizes authored map construction, finite grid,
weighted navigation, bounded continuous positions, terrain speed schedule,
wire formats and twenty acceptance scenarios. Numeric examples were checked
independently; new implementation/runtime checks remain NOT_RUN. This supersedes
the interim revision2.0.0 pointer below and does not resume the stopped writer.

**Supersession — owner correction, 2026-10-03:** the owner rejected the coarse
visible grid and discontinuous movement. The new owning specification is
[M1-FREE-MOVEMENT.json](M1-FREE-MOVEMENT.json): direct right-click movement,
continuous position, a hidden grid 16 times finer per old hex distance,
seamless terrain and terrain-dependent speed. Its numeric speed coefficients
are explicitly provisional. The previous implementation and follow-up writer
are stopped, with changes preserved. This document retains source, ownership
and compatibility history; conflicting engineering decisions below are
superseded. The current request is specification preparation, not a fresh
implementation dispatch or runtime acceptance.

Status: owner-authorized implementation, 2026-10-03; no implementation or
runtime acceptance claimed. Owner requested one subagent to prepare the global
map and implement free movement with a concrete professional specification.
This document owns this bounded slice; the broader accepted scope remains
[wiki §18](../wiki/m1-spec.md). Parent owns integration and final verification.

## Outcome and acceptance journey

In the existing authenticated game, click a traversable terrain point outside
roads/settlements, see a route and supply/ETA preview, confirm movement, watch
the actual company move, stop between sites, redirect from its actual position,
reach a settlement, and use its existing local interactions. Reload, logout/login
and API restart retain the same company, path/position and consequences.
The result must be playable in the existing Babylon/React shell, not a separate
renderer demo, local animation, fake endpoint or road-only selection renamed free.

## Authority and required reading

Latest direct owner decisions in wiki §18 override earlier route-only proposals:
authored map; free movement with stop/reroute; shared continuously running world;
six field members; separate unchanged world clocks; ordinary contract target
20–30 minutes. This slice does not implement the wider sandbox, crises or load
target. It does not grant merge, push, deployment or paid-service permission.

Read AGENTS.md, AGENT_TEAM, CURRENT_PLAN, ADR-0003, AI_TECHNOLOGY_HANDOFF,
ADR-0006, M1-WORLD-FOUNDATION and the complete M1-WORLD-TRAVEL contract.
The latter's proposed stationary-only reroute and adjacent-edge FREE_INTENT
restriction are superseded for new free movement by the owner request; legacy
accepted-route/replay behavior remains unchanged. Use warwrit-domain for domain
changes. Read physical-state.md when changing carried items/food/location.

Canonical sources, read live by parent: WORLD recTrujX2wy7V49qk,
accepted RC-P2 approval rechIKj0hsvfXIvFU, lore v1.2 recQNKqYfwoJpCXVu,
base apph3bj1NyVrfJeLM / table tblwAxG5Ek1FyWpiW. Full Notes/Purpose snapshot:
`/private/tmp/warwrit-free-movement-sources-20261003.json`.
Read it fully; original ZIP remains RC-GAP-MACHINE-01 / NOT_RUN.
Do not reconstruct source catalogues or turn provisional tuning into approved
balance. Missing graph results for current world adapters justify source search.

## Verified base, isolation and ownership

Game base: open PR135, codex/m1-c06-rescue,
HEAD 65c5e39290b0a28923ee365ef18096246d30cf7c; main 4ec0be6.
Parent checked the base checkout clean. PR135 CI is failed; do not claim green
baseline or repeat historical runtime claims as your own verification.

Only worker write root:
`/Users/vovanostm/.codex/worktrees/free-world-movement/warwrit`.
It is a newly attached managed worktree at that exact game HEAD, initially
detached and clean. Do not edit /Users/vovanostm/learn/warwrit-m1, the primary
checkout or other worktrees. You are not alone in the codebase; never revert,
overwrite or clean others' work. Parent edits shared planning only in the primary
checkout. Use absolute workdir for every command. No child agents.

Owned paths inside the worker root, for this feature only:

- packages/game-core/src/world/** and package public exports.
- packages/game-core/src/company/** only for canonical location shapes,
  shape validation/serialization, movement/carrier/observation effects and
  necessary location consumers. Existing finance, learning, health, equipment
  and permission policies must not be redesigned.
- packages/protocol/src/world.ts and necessary public exports.
- apps/server/src/world/**.
- apps/server/src/company/{executor,repository,travel-food}.ts and their
  focused regression/integration tests, for movement/root/effect composition.
- apps/server/src/{app,index}.ts and apps/server/src/db/database.ts only for
  registration/worker lifecycle or unavoidable DB typings.
- apps/server/src/contracts/** and apps/server/src/encounters/admission.ts only
  to preserve physical site-access checks with the new location representation;
  no contract, reward, combat or JOIN policy redesign.
- apps/web/src/game/**, apps/web/src/renderer/{map-scene,projection}.ts,
  apps/web/src/world-travel-attempt{,.test}.ts, apps/web/src/CompanyOpening.tsx,
  apps/web/src/styles.css and focused map/controller tests. Necessary map-only
  renderer modules may be added; preserve the existing battle scene.
- packages/testkit/src/world* tests and directly affected location fixtures.
- New migration 0014 up/down ONLY if a concrete schema need exists. Never edit
  0001–0013; report migration need/compatibility to parent before DB execution.
- output/free-movement/** for a concise implementation handoff/demo notes.

Everything else is read-only. If a necessary consumer lies outside the write
set, name it and ask the parent for a narrow extension. Do not guess permission.
No config/harness/lockfile/tooling changes or new runtime dependencies.

Parent scope amendment, 2026-10-03: `apps/web/src/App.tsx` and
`apps/web/src/world-free-movement-attempt{,.test}.ts` are assigned to the same
writer for necessary authenticated map integration and exact retry handling.
The parent acceptance review found discrete position snapping and missing
automatic arrival; correction remains in this slice. Runtime acceptance is
pending, and reported focused checks do not establish the full journey.

## Concrete implementation decisions

1. Keep existing authored region/sites/roads, ink assets and fixed 3/4 Babylon
   camera. Add finite explicit walk bounds and terrain data in the region owner,
   and project that same public data into rendering and navigation. No procedural
   geography, second terrain truth, new content pack or engine migration.
2. Represent free destinations and physical positions with bounded deterministic
   integer/fixed-point coordinates and an explicit region edition. Do not accept
   NaN, Infinity, unsafe integers, unbounded paths or positions outside the map.
   Keep rendering transforms reversible and shared with picking. Inspect exact
   Babylon 9.28.0 typings and official picking documentation before using APIs.
3. The client submits destination/stop intent and revisions, never authority,
   actual position, path cost, trusted time, supply or successful arrival.
   Server/core compute the path from the real current position. Use the simplest
   bounded deterministic path calculation for the authored traversability; fixed
   tie-breaking and no corner/obstacle crossing. An unobstructed path can be
   direct. Do not add a generic navigation framework.
4. One canonical physical location owner: company lifecycle party/member
   location, with retained travel plan/segment facts as execution metadata.
   Account for all location-shape consumers and own observations and carriers.
   A stopped off-road company must have a truthful terrain location; never fake
   a settlement or encode it as “still standing at the departure village.”
   Existing local access must require actual arrival; terrain proximity must
   not grant an issuer, shop, clue, camp/F1 or encounter permission.
5. Persist accepted start/from/to/path, edition, timing/profile and epoch.
   Derive progress deterministically from explicit trusted time; do not write
   on each rendered frame. Pure core has no I/O, clock calls or randomness.
   STOP/REROUTE settle the earned elapsed interval first and retain the physical
   position at that server time. No jumping to source/destination, lost inventory,
   double food/wages/stamina settlement or reused superseded segment.
6. Extend the existing trusted root/executor/effects and PostgreSQL transaction;
   no second canonical snapshot or sidecar position pretending to be authority.
   Authenticate first; ownership before receipt disclosure; exact receipt replay
   before freshness evaluation. Changed body under the same ID must conflict.
   Keep one lock order and one root CAS. Stop, move, worker continuation and
   existing commands must serialize. Publish success only after commit.
7. Add explicitly versioned free-movement protocol/storage semantics. Preserve
   V1/V2 DTOs, stored responses, region editions and in-flight old road routes.
   Never recalculate an old ETA, rewrite history or require resetting the world.
   If compatibility needs a migration, use the new ordered pair only and preserve
   recorded data on rollback. Unknown versions fail closed.
8. Keep existing food, stamina, wages, capability, camp/F1, active encounter and
   learning guards. Movement of people/items must agree. Dangerous location/path
   access and supply checks cannot be bypassed by clicking beside a site or
   crossing off-road. Preserve real safe return semantics; no invented starvation,
   free gear, rescue/carry producer or automatic camp. Request the parent only for
   a concrete new product conflict. Numeric terrain penalties are not approved;
   use existing provisional travel parameters, centrally versioned. Document a
   finite speed calibration without changing Campaign/Light clocks; measure a
   representative trip rather than claim final 20–30 minute contract balance.
9. UI: terrain click selects destination and highlights path; confirm with visible
   ETA/supply preview. Settlement click remains useful. “Остановиться” works during
   travel, a new destination redirects from current position. Drag/pan/zoom must
   not issue a movement command. Show moving/stopped/offline/rejected/unknown
   outcome states with safe exact retry. Abort/ignore stale requests after company
   or session switch; late old success must not replace current movement.
10. Keep the map legible: map boundary, passable/blocked areas where authored,
    chosen point, route and banner position. Reuse current assets; no asset
    generation, copied BB art or cosmetic overhaul before this journey works.

## Acceptance scenarios and proportionate verification

Implement the shortest full journey first; then verify important invariants
through existing public boundaries. No helper-test/count target.

- Move from a settlement to an off-road point, stop mid-path, redirect from
  that actual position, arrive at another settlement and retain normal access.
- Malformed/out-of-bounds/blocked destination rejects atomically. Camp, encounter,
  incapable member and other existing movement blockers remain effective.
- Two simultaneous conflicting movement commands cannot create two active paths.
  Exact retry, changed-body retry and foreign account/company behave correctly.
- Old worker/arrival after stop/reroute cannot resurrect an obsolete path.
  Food/carry, stamina, money, people and containers are preserved/settled once.
- Reload/re-auth/API restart resume accepted movement; stop remains stopped.
  V1/V2 road state and historical response replay still work.
- Ground picking agrees with displayed location; pan/drag does not move; stale
  replies and lost-response retry never display an invented accepted position.

Build affected workspace exports before tests, then use repository commands:
`pnpm --filter @warwrit/game-core build`, protocol/testkit builds as needed;
focused vitest runs for world routes/travel, physical travel, server movement and
web controller; game-core/protocol/server/web typechecks; targeted formatting,
lint and architecture checks. Record command exit and actual results.
Do not run full bootstrap/gate on every edit or change CI to hide failures.
Parent owns final integrated gate and independent review.

Worker owns only local node_modules/dist in this worktree and frozen-lockfile
dependency installation if needed. Parent owns all DB/service/browser lifecycles;
do not use shared ports/DB, default compose project or cleanup existing volumes.
If a real-DB/browser check needs resources, report READY_FOR_RUNTIME with the
exact launch instructions and parent will allocate an isolated stack. Never
replace real transaction/browser evidence with mocks or label skipped tests pass.

## Execution and handoff

One-shot warwrit_implementer (repository profile: Luna, high). Start with
`pnpm agent:preflight` and confirm the exact clean worktree/base above. Read full
sources, trace move through authorization → domain/effects → transaction → DTO
→ map, then send parent a short implementation plan and start without another
approval round for ordinary engineering choices. No commits/push/PRs/merge,
deployment, external messages, paid work, child agents or memory writes.

Checkpoint after 45 minutes; after 90 minutes report a bounded handoff if not
finished, preserving all changes for continuation. Stop earlier at completed
acceptance or a concrete source/ownership/invariant blocker. Do not lower quality
or silently reduce acceptance to meet the timebox. Parent can extend the same
assignment; never invent “done” from a timer.

Return DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED; absolute root/base/HEAD,
changed paths and ordinary diff, design/compatibility/migration decisions,
commands and outcomes, short steps to try it, runtime evidence or NOT_RUN,
known risks and one next action. No file hashes/manifests. DONE requires a real
playable demonstration and relevant evidence; otherwise state the exact gap.

Prompt design references: repository AGENT_TEAM and the official
[Codex subagents guide](https://developers.openai.com/codex/subagents), read
2026-10-03. Enforced choices: one bounded writer, isolation, parent-owned
integration, explicit evidence and independent review. Prompt behavior and
throughput have not been benchmarked; no separate agent-evaluation project.

## Road speed and types cycle — 2026-10-03

Owner request: update the wiki and implement substantially faster roads with trail,
dirt road and paved road types. The chosen calibration and research rationale are
owned by [the wiki](../wiki/m1-spec.md#скорость-дорог-и-пересечённой-местности--2026-10-03)
and JSON revision 3.4.0. This is a tested initial calibration, not measured final
balance or a universal human walking-speed table.

Implementation in retained `free-world-movement` checkout, branch
`codex/free-world-movement-v3`: V4 geography uses V3 speeds (grass 1000, forest 600,
hills/riverbank 800, rock 500, marsh 300; trail 1400, dirt/bridge 1800,
paved 2000, ford 550). Base speed and world clocks are unchanged. Road bank widths
are 96/112/144fp with the retained authored bends and edge variation. Three shared
materials show a narrow earthy trail, rutted dirt and grey paving.

Time costs and the A* lower bound use the selected profile. Smoothing preserves a
beneficial road detour; a slower remote road is not compulsory. The fastest road
wins at a junction, with bridge precedence. Independent review found that the
stationary label initially chose a different overlapping road; the corrected
public comparator now owns the same selection in navigation and the label.
V2 accepted plans, receipts and deadlines retain their original coefficients;
V1–V4 positions remain readable. No migration or data reset.

Actual focused checks: core build; 10 public free-movement specifications
(including beneficial/slower detours, smoothing, overlap order and bridge
precedence, retained/current profile reload and forged-speed rejection);
web/server typechecks and builds; edited-code ESLint/Prettier and ordinary diff
check. Five world/company/food specification files passed against a disposable
PostgreSQL 17 database after all pending migrations applied. No database test
used the existing player database. The full bootstrap/quality gate was not rerun
for this incremental tuning; the previously recorded branch quality limitation
remains outside this slice. No commit/push/merge/deployment.

Actual browser journey through normal Dex login and company creation:

- North Court → Stone Ford followed paving, showed ×2 and restored its moving
  route after page reload, then arrived in the settlement.
- Stone Ford → Quiet Causeway accepted a road route of 66,735,850us vs
  94,423,092us for the straight chord in the same geography/profile; the UI
  showed dirt ×1.8. STOP cleared the line and retained exact terrain coordinates
  `(94318654, -44040192)` in microFp. Reload preserved the stopped point; the next
  accepted route started at exactly that point and arrived in Quiet Causeway.
- Right-clicking the safe trail approach toward Old Mill accepted a 35,712,845us
  route containing trail speed 1400; the daytime UI showed trail ×1.4.

Current screenshots are in the absolute directory
`/Users/vovanostm/.codex/visualizations/2026/10/03/01a10318-def8-76f0-a8a7-a784e3814a52`:
`road-paved-moving.png`, `road-reload-moving.png`, `road-dirt-moving.png`,
`road-stop.png`, `roads-overview-day.png`, `road-trail-moving-day.png`.
Independent read-only road critic reviewed the current source and these six
captures and found no remaining material defect. It did not operate the browser;
journey and SQL observations came from the author. Optional advice: increase
trail/dirt colour distinction at overview scale. Other devices/scales, subjective
speed enjoyment and final game-wide balance remain NOT_MEASURED.

Runtime closeout: after the parallel route-presentation chat became idle, the
existing API was gracefully restarted with its retained configuration; readiness
returned OK. Normal login at `http://127.0.0.1:5287` restored the existing company
and showed the new paved/dirt/trail geography without changing its stopped
position. Main-game capture: `roads-main-overview.png` in the same screenshot
directory. The separate checking API/web processes and their specifically named
Dex/PostgreSQL Compose projects/volume were removed. The player runtime/database
were retained. Try the existing game: right-click a settlement or road; S stops.

### Live movement recheck — 2026-10-04

Owner asked to verify that the party now moves quickly across the map.
Checked current merged `main` at `ae9bf3a` through the authenticated browser,
using the existing company and player database. Current main CI is SUCCESS.
The API and web were no longer listening; rebuilding the server and restarting
both from the primary checkout restored readiness and the playable map without
resetting data.

Observed journeys and their accepted V4 geography / V3 profile schedules:

- North Court → Stone Ford: 69.538796s; UI showed 70s, then 31s with party
  advancement, growing traversed history and shrinking remaining route, then
  settlement arrival. Paving spans run at 48fp/s (×2); brief grass runs at 24fp/s.
- Stone Ford → Quiet Causeway: 66.735850s; UI showed 67s and later arrival
  with the route cleared. Dirt spans run at 43.2fp/s (×1.8); the starting paved
  junction correctly shows ×2, and brief grass gaps run at 24fp/s. No moving
  dirt-label screenshot was captured in this recheck.
- Quiet Causeway → safe trail point: 44.490104s; UI showed 45s, then 10s,
  trail ×1.4 and visible advancement, then stopped at the goal. Trail spans
  run at 33.6fp/s; dirt overlaps and brief grass gaps retain their own speeds.
  The accepted route crosses no danger area. Return to Quiet Causeway completed
  through the same normal map controls; the party was left in the settlement.

Current captures in
`/Users/vovanostm/.codex/visualizations/2026/10/03/01a10318-def8-76f0-a8a7-a784e3814a52`:
`speed-recheck-paved.jpg` (moving paved route), `speed-recheck-dirt-start.jpg`
(starting paved junction), `speed-recheck-dirt-moving.jpg` (despite its filename,
this is the dirt journey's arrival), `speed-recheck-trail.jpg` (moving trail).

Speeds above derive from accepted span geometry and duration. Browser evidence
confirms countdown, visible progress and arrival; exact arrival wall-time and
render FPS are NOT_MEASURED. Database `updated_at` does not refresh on these
route updates and was excluded from elapsed-time measurement. Roads are
mechanically faster than grass, while these settlement trips still take roughly
one real minute. Subjective pace satisfaction and other devices/scales remain
NOT_MEASURED. No gameplay/balance changes or repeated full gate in this recheck.

Independent read-only critic reviewed the current plans and captures and found
no material speed/display defect in these journeys. It did not operate the
browser; completion observations were supplied by the author. This verification
record is authorized for publication and merge by the owner on 2026-10-04.
The retained local game is running for the owner's personal playtest; subjective
pace acceptance remains pending that playtest.

## Party proportions and route junction — 2026-10-04

Owner rejected the oversized company banner and route strokes ending away from
the group center. This correction supersedes the proposed three-pixel ring gap
above. Parent owns this bounded web/art delta in the primary checkout on
`codex/supplies-playtest`; unrelated supply and owner/wiki work remains retained.
No domain, command, speed, timing, storage or migration change; no merge/deploy.

The continuous map uses the original ink-style party with three anonymous
mercenaries and its existing abstract sigil, revised into human-scale pole/cloth
proportions. Historical v1 stays available to the legacy map. Built-in image_gen
made v2; both exact prompts/references are stored in
`assets/art/m1/map/party-banner-v2.json`, beside the consuming PNG and registered
in the existing asset registry. The party plane is 0.48 instead of 0.72 units,
screen-facing to preserve its already painted projection, with an authored
combined-foot pivot (0.49,0.80) baked into its vertices. Its world position,
thinner ground ring and route junction share the same interpolated y=0 point.
The SVG no longer masks the party/ring; an eight-pixel foot window prevents a
settlement mask hiding the junction. Distant identification sits above the actual
visible sprite height and retains its ground leader.

Actual localhost:5293 owner journey: Kamenny Brod → ground goal → arrival →
field movement → STOP → return to Kamenny Brod at night. A moving DOM sample
compares history end / remaining start (553.07,285.24) with the projected group
foot (553.072754,285.237686), max difference 0.0036 CSS pixels. Both strokes and
legend clear on STOP/arrival. Close and overview views were inspected; the
company remained saved and returned to its original settlement. Captures:
`output/playwright/party-route-field-progress.jpg`,
`party-route-return-current.jpg`, `party-route-night-arrival.jpg`.

Affected web typecheck, scoped ESLint/Prettier and content registry validation
passed. No new tests for this reversible presentation correction; full game
gate/device/performance matrix NOT_RUN. Independent read-only critic inspected source, shared art references and five
current journey captures, finding no confirmed material defect. Optional feedback
is the small/dark silhouettes at this narrow map scale; the ground ring and
distant cue retain identification. The critic did not operate the browser or run
checks. No full-device, subjective enjoyment or complete-game acceptance claim.

Integrated party delivery — 2026-10-04:

The party correction is integrated with main `efda41f` terrain relief, contact
shadows, trees and existing draped route spans. The new group's authored foot
pivot is applied once by the sprite constructor. Ring and route junction use the
same terrain-height ground point. Settlement sprite masks remain; the party
junction is unobstructed. Visible-top and label bounds use the rendered billboard
transform, keeping the far-view cue above the group. Normal UI field travel,
mid-route S stop, reroute and town return are captured in the current
`output/playwright/supplies-integrated-*.jpg` evidence. Independent critique and
PR/main CI are recorded in the supply delivery closeout; this is not full M1 acceptance.

## Navigation topology experiment — 2026-10-04

Owner authorized implementation and comparison after the initial hex-map research.
[Owning result, reproduction and limits](../wiki/m1-spec.md#эксперимент-и-реализация--2026-10-04)
records the finite matched experiment. Production remains square `polygon-v1`;
static road-edge costs and surface priority preparation now live in the derived
field, not each search. Opt-in six-neighbor hex search uses the same polygons,
roads, clearance, speed profiles and exact endpoints; it is not a new map edition
or accepted world-generation rule. Existing accepted V2/V3 paths/schedules remain
frozen. No migrations, transport changes or clock/balance changes. Local isolated
branch `codex/map-topology-experiments`; no merge/deployment authorization.

Local closeout 2026-10-05: final bootstrap PASS (verify 631,47 skipped; stress 10000;
migration smoke/up and 14 PostgreSQL/auth checks); separate movement PostgreSQL 11
and affected domain 20 PASS. Supplied browser move/STOP/reload/reroute retained
exact endpoints; independent read-only critic found no confirmed navigation defect.
Measured p95 remains above 50ms; VM capacity/FPS/memory and full M1 acceptance are
unproven. Historical failed attempts and unchanged bounds are in the owning wiki.

### Hex route optimization amendment — 2026-10-05

Owner explicitly chose hex search speed after being shown the measured≤7.2%
journey-cost penalty. This supersedes the previous square recommendation for
new polygon-v1 orders in the local isolated branch. Legacy square navigation
and accepted V2/V3 schedules remain; geometry, speeds, clocks and storage stay
unchanged. Compiled sorted neighbors/costs and≤16 exact two-chord detour checks
improve both search variants. [Owning rationale, matched results and checks](../wiki/m1-spec.md#почему-гексы-и-оптимизация-маршрутов--2026-10-05)
retain failures and limits. Full any-angle optimality/VM capacity remain unproven;
no merge/deployment. Final bootstrap PASS:633unit/47skip,10000stress,migrations/14DB/auth checks.
Actual RMB/S/reload/reroute/arrival retained exact points; independent source and
supplied-evidence critic found no material defect. Separate movementSQL-suite
NOT_RERUN; overview/close/FPS/VM/full-M1 limits remain in the owning result.

## Settlement route visibility correction — 2026-10-04

Owner screenshots show a destination diamond clipped near Bereznyak and a
rectangular gap in the route on Kamenny Brod's approach. The SVG used black
rectangles over complete settlement sprite bounds, including transparent padding;
these cut annotations even on unobstructed ground. This correction supersedes
the retained settlement-mask behavior in the integrated party delivery above.

Parent is the sole writer for this bounded local fix in primary `main`, based on
merged `bcc30f5`. `ContinuousMapCanvas.tsx` no longer masks route strokes or goals;
`route-overlay.ts` and `continuous-map-scene.ts` remove unused mask inputs and
rectangle updates. Route annotations remain above the map, including settlement
art. Terrain-draped geometry, history/remaining split at the party foot, destination
placement beside site labels, label avoidance, legend and non-intercepting input
are retained. No domain, speed, clock, save, migration or art change.

Actual checks: web typecheck, three-file ESLint/Prettier and `git diff --check`
passed. The running localhost:5293 DOM has zero route masks/masked elements and
keeps `pointer-events: none`; the retained company is stopped on the paved
approach. Automatic approval review rejected the attempted short verification
move because it changes saved position and may consume supplies. Owner permission
was requested; moving/STOP/arrival and current visual acceptance are pending
(`NOT_RUN` for this correction). Full-game/device/performance gates are NOT_RUN;
no commit, PR, merge or deployment for this follow-up.

Independent read-only critic confirmed the rectangular clipping in both owner
captures and the source-level removal of its cause, with no input interception
in the changed code. Current stationary capture:
`output/playwright/route-mask-fix-stationary.png`. The critic has no current moving
capture; whether annotations over painted settlement art affect readability
remains a visual acceptance limit, not a reproduced regression.

### Playable verification after owner authorization — 2026-10-04

Owner explicitly authorized testing the retained company with “Да, можешь как
угодно тестировать”. This supersedes the permission-pending runtime limitation
above; no company reset, purchase, art/domain change or publication was performed.

Actual localhost:5293 normal-UI journey on the unchanged three-file diff:

- The retained dirt-road position → Kamenny Brod showed continuous strokes and
  a complete site diamond on the daytime approach; arrival cleared the overlay.
- Kamenny Brod → western paved-road ground goal at night retained the line
  through the former settlement-mask area and a complete diamond. S during this
  active trip cleared the strokes, marker and legend.
- The stopped point → Bereznyak showed the complete site marker at overview and
  close scale, a continuous route and joined history/remaining at the party foot.
  Arrival cleared the overlay; a new ground goal beside the village showed a
  whole diamond on the road and completed normally.
- Return toward Kamenny Brod survived page reload and arrived. Its initial
  moving screenshot preceded asset loading, so the full integrated reload check
  was repeated on Kamenny Brod → Tikhaya Gat: reload restored the moving company,
  history, remaining path and goal with all map art loaded (9s in DOM, 7s in the
  screenshot). The final return arrived in Kamenny Brod and cleared the overlay;
  the company was left stationary there with 800 crowns, and the game stays open.

Current captures under `output/playwright/`: `route-mask-fix-city-day.png`,
`route-mask-fix-city-approach.png`, `route-mask-fix-city-night.png`,
`route-mask-fix-stop.png`, `route-mask-fix-village-overview.png`,
`route-mask-fix-village-close.png`, `route-mask-fix-village-ground-goal.png`,
`route-mask-fix-reload-moving.png` (the settled repeated journey),
`route-mask-fix-return-arrived.png` (the first completed return),
`route-mask-fix-final-city.png` (final stationary company).
The independent critic found no material defect in supplied day/night,
close/overview, ground-goal, STOP and arrival captures. Its corrected settled
reload pass also found no material issue and explicitly withdrew the concern
based on the superseded loading frame. It did not operate the browser. Prior web typecheck,
scoped ESLint and source/doc Prettier checks remain applicable to the unchanged
code; current diff whitespace check passed. Full-game/device/performance gates
remain NOT_RUN. Fix remains local and uncommitted on `main`; no PR/merge/deploy.

### Route visibility delivery — 2026-10-04

Owner “merge to main” authorizes this reviewed correction's publication and merge.
Sole delivery writer: `/private/tmp/warwrit-route-visibility` on
`codex/route-visibility-fix`, based on `bcc30f5`. The three web files match the
playtested delta; unrelated primary changes are excluded. Existing source and
playable review applies; clean PR CI will own the complete bootstrap/stress/SQL
gate. Publication, CI and merge remain pending at this checkpoint. No migrations,
domain rules, art, clock or persistent-data reset; no deployment/paid resources.

Before publication: frozen-lockfile installation and core/protocol/testkit builds
passed on Node24.20.0 / pnpm11.25.0; web typecheck and scoped ESLint passed.
Initial scoped formatting check found an extra blank line in the copied checkpoint;
it was corrected and the six-file Prettier check passed. Coverage ran with one
worker through the existing command: 627 passed, 47 skipped (95 files passed,
7 skipped). The enforced pre-commit audit passed with that real coverage and
excluded seven inherited findings; its semantic-identity warning used the existing
syntactic fallback, without changing the gate. The clean full gate is reserved
for PR CI, not repeated locally.

# Efficient live-map continuation prompt

Status: proposed launch prompt, revised 2026-10-09 after the owner's request
for an author-owned comparison and question-only Claude consultation. Not
launched. Supersedes the 923-word prompt in commit `1b76adb`; the active Codex
launch text and separate Claude consultation prompt are below. No policy, hook
or game behavior is changed.
Rationale, measured algorithm probes and limitations:
[session review](AGENT_TEAM.md#author-owned-comparison-and-question-only-claude--2026-10-09).

## Prompt

You are Codex, the implementation owner for Warwrit's approved live-map cycle 1.
Mission: complete its player-visible result in
`/Users/vovanostm/learn/warwrit/.claude/worktrees/world-live-map`, branch
`claude/world-live-map`. The last reviewed HEAD was `e15ddd5`; refresh current
HEAD, retained dirty changes and writer/resource ownership. Preserve other
agents' work. Read AGENTS.md, new CHANGELOG entries, CURRENT_PLAN and the full
active `docs/engineering/briefs/2026-10-09-live-world-map.md`; load matching
context, web-game and domain skills as needed. Those sources retain authority.

**Operating philosophy.** Optimize for the shortest verified playable cycle,
including correction and verification cost. Keep Babylon, pure game-core,
existing navigation/token/speed, old-edition compatibility, lawful movement and
private knowledge boundaries. Scope is cycle-1 assets/tracing, painted renderer,
necessary adapters/tests and owning documentation. Other regions/briefs wait.
No retained-data reset, policy/hook changes, merge, deployment or paid
provisioning. Use the repository's discovery, API and delivery rules.

**Decisions before generation.** For an algorithmic gap or repeated failure,
inspect existing code/tools first and compare at most three concrete options:
reuse, adapt a mature tool, or bounded custom glue. Spend at most about ten
minutes on initial discovery. Choose by correctness, total adaptation/repair
cost, geometry/runtime limits and maintenance; briefly record why in the
existing package. A local arithmetic error needs a local fix, not a library
survey. Offline preparation libraries are distinct from runtime dependencies;
apply the actual dependency policy. After two failed repairs of the same
approach, reassess the technique before another patch.

Own the comparison and implementation yourself. Use Claude exclusively as a
technical question-answering consultant, with tools disabled: send one bounded
question, relevant facts and two or three options; request a choice, tradeoff,
strongest objection and smallest discriminating check. Request careful reasoning
and a concise answer, not hidden chain of thought. Do not ask Claude to generate
code, assets, full prompts/plans or execute tasks. Judge its advice independently
and check material claims. If consultation is unavailable, continue your own
comparison unless a real source/authority blocker remains.

**Workflow and evidence.** Follow the [cycle-1 execution plan and DoD](#cycle-1-execution-plan-and-dod--2026-10-09).
First verify and commit the retained renderer/labels/anchor changes, including a
game-core rebuild, movement specifications and edition diagnostic. Then show
the existing painted sheet/token, correct orientation, two anchors and an
accepted movement in the real game; complete the full cycle from that baseline.
Do not finish optional extraction tooling before this early proof.
Preserve the approved tracing pipeline and browser correction requirement.
Skan and GEOS are candidates, not mandatory migrations: current local probes
found Skan preserves a closed loop, while GEOS reduced corridor count but added
vertices and changed corridor area. Check topology, rounding, boundary, vertex
budget and legal water crossings before adoption; keep working spline code when
suitable. Resolve the dated unknown-place scope amendment before accepting the
cycle; static labels are not company knowledge. Cycle-1 ambient effects are
water, smoke and night windows; actors and war belong to cycle 2.

Reuse relevant browser/server scenarios. Prepare the mill trip through the
existing authorized contract flow. Assert command acceptance, exact destination
and visit state with deadlines; fail on rejection or timeout. Prove the full
Brod→Gat→Mill→Gat journey, location entry and retained position/reload, followed
by Gat→Glinisty Bereg across a named open bridge, excluding Vyazovsky bridge.
Run the real server movement integration test with its database variable set;
a skipped test is not a pass. After every blocker fix repeat the whole journey.
Inspect current images/errors and obtain the required independent integrated
day/night, close/overview visual-critic ACCEPT, every applicable score at least 2.

Run proportional affected checks and respect actual commit hooks; no blanket
`--no-verify`. Finish with the existing integrated delivery gate. Commit finished
steps with package/checkpoint/changelog updates and persistent evidence. Resolve
routine choices yourself; ask one grouped question only for material source,
ownership, permission or required-gate blockers. Final response in concise
Russian: usable result/how to try, chosen ready solution/custom necessity,
commits/status, actual checks/critic result and limits. Missing evidence is
NOT_RUN/NOT_MEASURED; incomplete work is PARTIAL. Do not edit personal memory.

## Cycle-1 execution plan and DoD — 2026-10-09

This is the detailed continuation plan requested by the owner, including all
six corrections and the full-replay rule. Planning only: no implementation,
build, game test, database probe, browser run or worker launch occurred in this
planning task. The database is reported running by the owner; runtime readiness
is not yet verified. All execution checks below remain NOT_RUN until recorded
by the implementation owner. Claude remains a question-only consultant.

### Work root, ownership and scope

Execute game work in the persistent worktree
`/Users/vovanostm/learn/warwrit/.claude/worktrees/world-live-map`, branch
`claude/world-live-map`, last inspected HEAD `e15ddd5`. The review/plan branch
`claude/world-review-porechye-detail` does not contain the retained implementation.
Confirm HEAD, dirty files, active writer and new checkpoint/changelog entries
before changing it. The worktree brief still names Claude as sole writer:
establish that the previous writer has stopped and record the successor before
editing. Resolve shared-file ownership with B1/B3 if their paths overlap.

The owning implementation brief is
`docs/engineering/briefs/2026-10-09-live-world-map.md` **in that worktree**.
It is absent from this review checkout, so this plan names it without a link.
The implementation owner adds dated amendments there, preserving the interview:

- **D6:** v6 navigation uses region-local fixed-point coordinates. The atlas
  supplies the global transform; do not pass large global coordinates into the
  exact local navigation field. Older editions remain frozen and site IDs stable.
- **D11:** preserve the existing travel-speed profile by road/terrain type.
  Relocated anchors and changed road lengths can change travel time. Report
  local/global extents and measured route lengths/durations with units; do not
  claim metres, unchanged trip times or tens of hours without a defined scale.
- **D7/cycle-1 scope — OPEN:** the brief currently requires unknown places to be
  faint, while current labels are static. Recommended owner choice: move this
  knowledge-dependent display to cycle 4 and accept only the existing rumour
  presentation in cycle 1. Alternative: explicitly keep and implement it now
  from real company knowledge, with privacy and learn/reload evidence. A scope
  question has been sent; no answer or amendment is implied by this plan.
  Independent steps 0–4 can proceed. Final scope acceptance waits for the answer.
- Cycle 1 includes water, smoke and night windows. Moving travellers and war
  overlays remain cycle 2; other duchies wait. No new rumour system is implied
  by checking current rumour presentation.

Keep screenshots, recordings and runner evidence under the worktree's persistent
`output/live-map/` directory. Record plain paths for untracked evidence and link
only tracked files from committed documentation. Reuse the existing runner and
owning brief rather than making another framework or duplicate report.

### Step 0 — verify and commit the retained implementation

**What / where.** Inspect the seven retained files as one baseline: the canvas,
CSS, trace config, generated v6 data, owning trace generator and the two new
painted renderer files. Preserve unrelated changes. The last inspected set was:

```text
apps/web/src/game/ContinuousMapCanvas.tsx
apps/web/src/game/game.css
assets/art/world/porechye-v1/trace-config.json
packages/game-core/src/world/porechye-v6-trace.ts
scripts/world-map/trace.py
apps/web/src/renderer/painted-map-scene.ts
apps/web/src/renderer/painted-porechye.ts
```

**Why.** Anchor snapping changed canonical data after the last build. Normal
Vitest resolves built public game-core exports; a no-emit typecheck alone cannot
prove the current source is used. Browser proof must start from verified,
committed code, including the new files.

**Checks, in this worktree and in this order:**

```bash
pnpm --filter @warwrit/game-core build
pnpm exec vitest run packages/testkit/src/world-free-movement.spec.test.ts packages/testkit/src/world-exact-movement.spec.test.ts
pnpm check:map-edition
pnpm --filter @warwrit/web typecheck
```

Run the smallest additional lint/typecheck for concrete edits made to repair a
failure. Correct generator inputs rather than independently patching generated
geometry. Update the brief/checkpoint/changelog with real results and commit
the baseline. **Exit evidence:** commit ID containing all intended files,
successful build and movement/edition checks, scoped diff and retained limits.
No browser acceptance before this exit gate.

Try the normal commit hook. It audits the entire working tree, including
untracked files, against main and requires coverage. Missing coverage does not
justify skipping it: generate the coverage it needs or report the actual blocker.
The repository permits an intermediate work-branch `--no-verify` only when the
sole audit findings concern code explicitly replaced/removed in a later step
of this approved package. If applicable, retain the failure, mark the skipped
commit audit NOT_RUN and resolve it in step 5 before publication. Never use this
exception for failing movement tests, other findings or the published PR head.

### Step 1 — make the browser journey tell the truth

**What / where.** Adapt `output/live-map/journey.mjs` and relevant existing
browser assertions, using the real movement command/reply and authoritative
movement state. Inspect the installed runner and matching browser skill first.
Keep transport/UI adapters small; do not recreate navigation in the runner.

**Why.** “Standing” is also shown after a rejected command. A screenshot or a
bounded loop ending without an assertion cannot establish arrival.

**Exit evidence for every movement:** the emitted command targets the intended
site/terrain point and edition; its own response is accepted; observed state
reaches that destination, in that edition, before an explicit deadline. Check
site identity for site targets and the existing canonical coordinate tolerance
for terrain targets. For visits, assert the opened location's identity as well.
Any refusal, wrong destination, stale response or timeout fails the run with
the leg, policy/error code and observed state. Do not swallow the failure.
Set travel deadlines from the compiled duration plus a bounded runner margin;
avoid repeated sleeps as the success oracle.

Check that rejected-command and timeout cases actually fail the runner using
existing assertion checks or a bounded runner probe, then obtain one accepted
movement in game. This is verification of the repaired evidence collector, not
acceptance of cycle 1. Commit any maintained runner/code changes with results.

### Step 2 — prove server authorization and persistence

**What / where.** Reuse
`apps/server/src/world/continuous-movement.integration.test.ts`. Configure its
actual variable, `WARWRIT_COMPANY_DATABASE_URL`, against the intended test
database using existing local setup. Do not print credentials or reset retained
data. Confirm the runner executes the relevant cases rather than skipping them.

```bash
pnpm exec vitest run apps/server/src/world/continuous-movement.integration.test.ts
```

**Why / evidence.** Require executed PASS for the existing cases covering:

- inaccessible and dangerous commands leave the company root and route receipts
  unchanged;
- an older-edition position resumes at the nearest settlement in the painted
  map (the existing compatibility rule, not exact old-coordinate retention);
- a contract-authorized Gat→Old Mill trip and return are scoped to Gat; an
  unrelated return destination stays forbidden;
- the file's existing receipt/idempotency cases remain passing.

The mill scope is already defined by `FIRST_HUNT_TRAVEL_SCOPE` in
`packages/game-core/src/world/route.ts`. Browser preparation uses the normal
player contract-acceptance flow, with the party at Gat before departure. Direct
test-fixture database setup is confined to its isolated integration scenario;
it is not a browser shortcut. A refused mill command is not a geometry failure.

**Exit:** actual executed case counts/results and relevant errors, no SKIPPED
substituted for PASS. A database failure is a typed blocker; fix the connection
or setup rather than weakening the cases. Commit only necessary code fixes.

### Step 3 — run the whole playable route and check painted geometry

**What / where.** Run one recorded browser scenario on the committed baseline:

1. Show the sheet over the atlas, the party and two correctly registered site
   anchors. Use the actual desktop scene, continuous zoom and normal input.
2. Kamenny Brod→Tikhaya Gat; enter Gat's existing location and return to the map.
3. Accept the existing mill contract at Gat; Gat→Old Mill; verify arrival and
   the existing location entry; Old Mill→Gat under the permitted return scope.
4. **Gat→Glinisty Bereg** using a terrain target derived from the named painted
   anchor. Prove this is a river crossing through a named open bridge and that
   the route does not use the collapsed Vyazovsky bridge.
5. Reload at the reached current-edition position; assert the server-resumed
   position/edition and usable movement state. During travel, reload/resume must
   preserve the current route's semantics rather than teleporting to a site.
6. Capture day/night and overview/close views; show water, smoke and night
   windows over time, site entry, labels, party and unobstructed controls.

**Crossing evidence.** Glinisty Bereg is `nature-08`, a decorative place at sheet
pixel `[560,455]`, not a clickable SITE. Convert its anchor through the current
sheet transform and real picking/projection; assert the emitted TERRAIN target.
Do not use a screen-relative click and assume it crossed the river. Current
open crossing IDs are `karaulny-most` and `kamenny-brod-most`; `vyazovsky-most`
is closed. Identify the expected open crossing from the current painted route
and exported polygons before running it. Record the compiled path's geometric
intersection with that named crossing and exclusion of the closed crossing;
an arbitrary `bridge` speed span alone is insufficient. Show the party traversing
the same painted crossing in game.

Reuse the movement spec's existing crossing/closed-water checks. Extend that
existing spec for Gat→Glinisty Bereg only if its named-crossing invariant is
uncovered. Validate the path built by `buildNavigationField` / `findTravelPath`
from exported polygons, not edges in the preparation skeleton. A focused
negative water/closed-bridge check must fail where no legal crossing exists.

**Art registration evidence.** In the existing correction overlay and in game,
compare traced roads with the approved drawing, settlement entrances/anchors,
water banks, bridge mouths and sheet/atlas boundaries. Road snapping is only
a preparation operation: an anchor moved into a field is still a failure even
if navigation reaches it. Check current road attributes and compiled speed
spans on representative authored road types. Keep the existing speed profile;
measure changed route lengths/durations rather than promise old arrival times.

**Exit:** all legs accepted and arrived, required locations entered, actual
open-bridge crossing proved, server reload/resume correct, road/anchor/crossing
alignment shown. Keep command/state evidence plus current screenshots and short
motion captures. Passing the route does not waive other cycle-1 drawing defects.

### Step 4 — fix only demonstrated blockers, then replay everything

| Failure layer             | Evidence to inspect                                                                           | Smallest remedy / boundary                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permission                | Rejection code and contract scope; runtime path may still exist                               | Use the legitimate contract flow. Preserve dangerous-area and destination restrictions.                                                                                          |
| Coordinates / place entry | Accepted target versus reached point, site anchor, picking transform and visit identity       | Fix the owning anchor/transform/adapter; regenerate owned data and rebuild game-core when changed.                                                                               |
| Runtime geometry          | Exported polygon path missing, wrong bank/crossing, broken painted road or lost authored loop | Fix masks/export/corridor connectivity. Skan is a candidate for the proven walker loop defect; GEOS for recurring offset/seam defects. Adopt only against the identified defect. |
| Road speed                | Authored road type, selected overlay and compiled speed profile                               | Correct attributes/selection before switching geometry tooling.                                                                                                                  |
| Rendering / input         | Current integrated views, motion captures, hit targets and console errors                     | Fix the consuming scene/material/input code against the approved references.                                                                                                     |

Compare reuse, a mature library and bounded custom glue yourself before a
technique change; Claude can answer a bounded option question only. Skan/GEOS
probes are candidate evidence, not proof of runtime equivalence. On adoption
check rounding, connected components, preserved authored loops, legal crossings
and vertex budget. The measured GEOS candidate used 3671/4096 vertices; preserve
headroom and recheck the actual resulting edition. A lost loop belonging to the
cycle-1 drawing is a geometry blocker even if the representative route passes.
Do not claim whole-region topology equivalence from a route pass.

**After every blocker fix:** run affected focused checks, commit the finished
fix, then rerun **all of step 3 from the start**, including authorization,
location entries, return, crossing and reload. Partial-leg success is diagnostic
only. If the same approach fails twice, reassess its technique. Other regions
and optional tracing refactors remain deferred.

### Step 5 — remove dead code and close the accepted cycle

**Selective cleanup / where.** After the painted replacement is working, inspect
all imports before deleting the retired `apps/web/src/renderer/continuous-map-scene.ts`
and its exclusive tree/forest/material/road/shadow/surface/life/wildlife chain.
Exclusive test candidates include `map-trees.test.ts`, `map-forest.test.ts`,
`map-surface.test.ts` and `map-wildlife.test.ts`. Confirm each candidate has no
live caller; retain regressions for live behavior. Remove exclusive assets or
exports only when proven unused. Use ordinary diffs and the existing fallow tool.

Do **not** delete `map-geography.ts` wholesale: live ambience/terrain consumers
use it. `map-scene.ts` and `WorldMapCanvas` also remain live: `GameShell` selects
the latter for legacy movement/route states, and the painted scene shares map
label types. Preserve compatibility and shared helpers; extract a shared type
only if retirement actually needs it. No blanket removal of the legacy fallback.

**Verification.** Run the smallest affected web checks and `pnpm check:changes`
with coverage representative of the final changed source. Run
`pnpm test:coverage` only when the audit needs new coverage; it is not a step
ritual or coverage target. Resolve actual dead-code/complexity/duplication
findings without deleting live behavior or suppressing findings to turn green.
Record the audit base and results without hashes or manifests.

After final integrated game changes, run the existing complete delivery gate
once in its clean isolated environment:

```bash
./scripts/bootstrap.sh
```

It owns `pnpm verify`, `pnpm test:combat:stress` and `pnpm test:migrations` and
creates/cleans its own disposable PostgreSQL instance. Do not run migration
rollback checks on the retained/shared database. Do not parallelize heavy suites.
The bootstrap does not supply `WARWRIT_COMPANY_DATABASE_URL`; step 2 remains an
explicit integration check. Repeat a gate only for subsequent material changes
or a diagnosed failure, not as routine bookkeeping.

**Full replay and visual acceptance.** After cleanup or any other blocker fix,
replay the complete step-3 journey on the final source. Give an independent
read-only `warwrit_visual_critic` current images, motion/journey evidence,
approved unit/place/atlas/sheet references and the
[visual rubric](VISUAL_CRITIQUE.md). Require a scored absolute comparison of
day/night, overview/close, style/lore, projection/seams, materials, labels/party,
input and travel. **Exit is ACCEPT, every applicable criterion ≥2.** Fix material
findings and request another pass from the same critic with current images;
repeat the full journey after each fix. The same criterion ≤1 twice requires a
technique change. Old standalone art approval and green builds do not substitute
for integrated acceptance.

**Documentation and commit.** Complete the dated brief amendments for D6, D11
and the answered D7 scope question; update its step results, remaining limits,
the worktree's `CURRENT_PLAN` and `CHANGELOG`. Record executed commands/outcomes,
server cases, whole-route result, critic scores/ACCEPT, commits and actual local
delivery status. Read back the changed sections, scoped diff and tracked links.
Commit each finished step, including final cleanup/docs; final audit must pass
without a bypass before any publication. Show the usable result and precise
local start/entry steps. PR publication, if pursued, is separate from merge or
deployment; those need their own owner authorization.

### Definition of Done

Cycle 1 is complete only when **all** of these are true:

- Verified retained code is committed; source and built exports agree. Focused
  movement specs, edition diagnostic and affected typechecks pass.
- D6/D11 describe actual local coordinates and preserved speed profiles. D7's
  scope choice is answered and dated in the owning brief; deferred functionality
  is not reported implemented. Current rumours meet only the agreed scope.
- Browser refusals, wrong destinations and timeouts fail the scenario. Every
  final-route command is accepted and reaches the intended destination.
- Brod→Gat→Mill→Gat, location entries and Gat→Glinisty Bereg all pass; the real
  river crossing uses the identified open bridge and excludes Vyazovsky bridge.
- Real server integration cases execute and pass; old-edition nearest-settlement
  migration and current-edition reload/resume meet their distinct contracts.
- Painted roads, entrances, anchors and crossings align; road speed follows its
  authored type. Continuous zoom, atlas registration and closed outside-region
  movement satisfy cycle-1 bounds.
- Water/smoke/night windows have motion evidence; day/night and overview/close
  are usable. Actors/war/other-region production remain outside this cycle.
- Only proven dead procedural modules/tests are removed; live legacy fallback
  and shared helpers remain valid. Fallow audit and final integrated gate pass.
- The entire journey is repeated after every blocker fix and on final source;
  independent integrated visual review ends ACCEPT with every applicable score ≥2.
- Owning brief, CURRENT_PLAN and CHANGELOG contain actual outcomes and limits;
  finished work is committed, evidence is persistent, local versus published or
  merged status is accurate, and the owner can try the result.

If any required item is missing, report PARTIAL with the concrete blocker and
next action. NOT_RUN, NOT_MEASURED, SKIPPED or an unresolved scope question never
count as acceptance.

## Claude consultation prompt

You are a technical decision consultant for Warwrit. Your mission is to help
the implementation owner choose an effective approach, using ready solutions
where they reduce total work. You answer questions; Codex owns implementation
and verification.

Operating principles:

- Think carefully before answering. Compare correctness, adaptation effort,
  verification, maintenance and switching cost; a short custom script is not
  automatically simpler, and a mature library is not automatically cheaper.
- Distinguish facts supplied below from hypotheses and recommendations. Do not
  invent measurements, API capabilities or source verification.
- Consider at most three options per question. For a simple local error,
  recommend the smallest fix instead of broad research or a new dependency.
- Do not use tools, inspect files, run commands, change state, delegate tasks
  or generate code, assets, full plans or prompts. Give decision advice only.
- Ask one precise question only if missing information would change the choice;
  otherwise give a conditional recommendation. Do not change owner requirements.

Context:

- Babylon, existing navigation and party marker remain. Game-core has no runtime
  dependencies; offline Python geometry tools are a separate boundary.
- The approved pipeline is image → mask → skeleton → spline with browser
  correction. First playable is Porechye, including lawful Brod→Gat→Mill travel,
  location entry, day/night and integrated visual acceptance. Other regions wait.
- Alignment of roads/places with the painting and company knowledge remain
  acceptance requirements. The runtime plans movement through exported
  road/terrain polygons; the raw skeleton graph is preparation data. Route
  permission is a separate check, not a tracer defect.
- The owner accepted diagnosis by layer: contract permission, then target/anchor
  and actual arrival, then runtime polygon connectivity/crossings. For wrong
  speed also check authored road type, overlay selection and the speed profile;
  speed mismatch alone does not justify Skan or GEOS.
- Catmull–Rom and road banks already exist. The custom skeleton walker loses a
  closed degree-two loop; Skan preserves it in a local probe. On the actual mask,
  both methods cover all 7363 pixels, but their junction representation differs.
- GEOS buffering of the same 86 roads passes the existing edition diagnostic.
  It reduces road polygons from 139 to 86, increases total vertices from 3201
  to 3671 against a 4096 limit, and changes individual corridor area by up to
  7.73%. Complete network equivalence and time savings are unproved.
- The old browser script mistakes “standing” after a rejected move for arrival.
  First rendering and the required journey occurred late in the original session.

**Process:** answer this first question: which next step best advances the first playable, and what
should change when producing more regions?
A. First verify the existing integrated journey with accepted-command and
destination assertions; repair concrete blockers locally.
B. First adopt Skan, preserving existing masks, simplification and export.
C. First adopt GEOS corridors, preserving existing spline sampling.

**Output:** answer in Russian, at most 220 words:

1. Choice and two concrete reasons.
2. Strongest objection to your choice.
3. Smallest check that could change the choice.
4. What to defer, and when another option becomes preferable.

## Validation and sources

Static completeness/format/link checks: PASS. Author-owned local algorithm
comparison and scenario review: recorded in the linked session review. Agent
behavior A/B evaluation and full-game acceptance: NOT_RUN. End-to-end time/cost
savings: NOT_MEASURED. The local Claude consultation was attempted with no
tools/MCP/skills and high effort; it failed because OAuth expired. The owner
later supplied a consultation reply choosing A; its source-based review and
corrections are recorded in the owning session review.

[Codex prompting](https://developers.openai.com/codex/prompting/),
[Skan graph API](https://skeleton-analysis.org/stable/api/skan.csr.html),
[Shapely constructive operations](https://github.com/shapely/shapely/blob/2.1.2/shapely/constructive.py)
and [Playwright assertions](https://playwright.dev/docs/test-assertions)
are source pointers. Discovery/retry limits are engineering defaults, not
experimentally optimal values. Neither launch prompt was executed by Codex. The
Claude consultation text passes static completeness/format/link checks; one
owner-supplied answer has been reviewed, while independent execution and model
behavior A/B are NOT_RUN. The initial lexical checker requested explicit
process/output labels; added them and the final check passed.

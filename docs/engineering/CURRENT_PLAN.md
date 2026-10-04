# Warwrit current delivery plan

**Live movement recheck — 2026-10-04:** current `main` at `ae9bf3a`
was checked through the authenticated game at `http://127.0.0.1:5287`.
Its GitHub CI is SUCCESS. API/web were restarted from that checkout with the
existing player database preserved. North Court → Stone Ford showed 70s,
then 31s with visible progress, then settlement arrival; Stone Ford → Quiet
Causeway showed 67s and arrived. A safe trail approach showed 45s, then 10s
and trail ×1.4, then stopped at its goal. Accepted schedules confirm
48fp/s paving, 43.2fp/s dirt, 33.6fp/s trail and 24fp/s grass. Thus roads are
mechanically faster; minute-long settlement trips are the current pace,
not proof of subjective speed satisfaction. [Owning readback](../work-packages/M1-FREE-MOVEMENT.md#live-movement-recheck--2026-10-04).
No gameplay changes, balance changes or deployment in this recheck.
The owner explicitly authorized publishing and merging this verification record
on 2026-10-04, then opening the retained game for a personal playtest.

**CI boundary correction — 2026-10-04:** PR136 and its main merge CI failed at
`check:architecture`: the terrain label imported game-core directly from web.
The attempted dependency declaration was rejected by the existing web/protocol
boundary and discarded. The correction keeps navigation precedence in core,
projects its ordered overlay IDs through the server/protocol map, and lets web
read that immutable metadata. Older servers remain readable; geometry, drawing
order, movement schedules and storage are unchanged. Architecture, affected
lint/format/diff, protocol/core/testkit builds, web build, server typecheck and
all ten existing public movement specifications passed. The initial local
web/server checks saw stale protocol/testkit outputs; rebuilding those packages
resolved them. Normal commit audit passed with no new issues (two inherited
warnings excluded by its existing gate); no hook bypass for the correction.
[PR137](https://github.com/Vovanostm/warwrit/pull/137) owns its integration and
CI readback under the same explicit merge/sync request. The earlier main-base
quality debt remains historical FAILED; PR136 and its main CI remain FAILED.
No migration, dependency-policy change or deployment.

**Integration result — 2026-10-04:** owner-requested combined publication is
complete. [PR136](https://github.com/Vovanostm/warwrit/pull/136) merged normally
into `main` as `f65daf62063951e8ab220c68213884833775105f`, with the expected
head checked. GitHub also marks ancestor PR135 merged. This integrates the
current game branch and `chore/claude-harness`; PR134 and PR129 remain outside
this request. Primary checkout switched to `main` and pulled with fast-forward;
the retained playable worktree fast-forwarded on its existing branch. Both
reached the remote merge commit; browser diagnostics and player data remain
local and preserved. Documentation conflict resolution passed formatting,
JSON/TOML parsing, marker and diff checks; game code was unchanged by resolution.
The local quality audit remains FAILED; the checkpoint/merge commit hook was
skipped, not passed. PR CI [37157248220](https://github.com/Vovanostm/warwrit/actions/runs/37157248220)
and main CI [37157277254](https://github.com/Vovanostm/warwrit/actions/runs/37157277254)
were IN_PROGRESS at this readback, so CI success is NOT_PROVED. No deployment
or full-M1 acceptance is claimed. This dated result supersedes earlier
uncommitted/unpublished/unauthorized-merge status below.

**Publication and merge request — 2026-10-04:** after the failed normal
commit audit was reported, the owner requested merging all current game and
documentation work into the default branch and updating the local worktree.
The repository default is `main` (the owner called it master). This authorizes
integration of `codex/free-world-movement-v3` and `chore/claude-harness`, not
unrelated open PRs or deployment. The local commit hook is skipped for this
requested checkpoint; its actual audit remains FAILED (exit1): one unlisted
dependency, 323 complexity findings, 71 clone groups across the 378-file branch
delta. CI configuration/checks remain unchanged. Temporary browser diagnostics
stay local. Documentation checkpoint `4c11a99` was already pushed; merge and
local synchronization must be read back before reporting completion.

**Road speed/types cycle — 2026-10-03:** owner-authorized calibration is
implemented in retained `free-world-movement` / `codex/free-world-movement-v3`.
V4 geography/V3 profile: trail1400, dirt1800, paved2000; forest600, hills800,
marsh300, riverbank800, rock500; grass1000/base24 unchanged. The fastest road
wins at junctions; bridge precedence and stationary labels share one rule.
V2 accepted schedules/receipts/deadlines remain frozen; no migration.
Ten public core checks, five PostgreSQL world/company/food spec files, affected
builds/typechecks/lint/format passed. Normal authenticated browser demonstrated
all three speeds, a faster road detour, arrival, moving reload and exact
STOP/reload/reroute. Independent read-only critic found no remaining material
road defect on six current captures. Device-scale coverage, subjective speed
and final balance remain NOT_MEASURED. Existing player data preserved; primary localhost5287 runtime refreshed,
normal login/map readback passed and isolated check infrastructure removed; parallel
route-line work verified separately and retained. [Owning result](../work-packages/M1-FREE-MOVEMENT.md#road-speed-and-types-cycle--2026-10-03).
No commit/push/merge/deployment; previous branch quality limitation remains.

**Route art-direction critique — 2026-10-03:** owner rejected the current
route presentation and requested a professional redesign proposal. Fresh
independent critic finds the thin line/history/goal visually weak despite
working route-progress mechanics. Selected proposal: CSS-pixel-sized parchment
solid route with dark underlay, grey dashed history, rounded joins, diamond
goal and explicit sprite masks on a projected SVG layer.
[Owning brief](../work-packages/M1-FREE-MOVEMENT.md#route-presentation-critique--2026-10-03)
is PROPOSED / NOT_IMPLEMENTED; multi-bend/day-night/zoom/contrast acceptance
remains NOT_RUN / NOT_MEASURED. No game/runtime changes in this audit.

**Living landscape refinement — 2026-10-03:** owner requested better textures,
removal of visible repeats/seams, wind-moving grass and a more alive map.
Parent `/root` is sole renderer writer in the retained `free-world-movement`
checkout; existing player runtime/database preserved. Revision 3.3.0 records
the bounded visual amendment. First outcome: seamless ground and grounded
grass responding to travelling wind in the authenticated game at
`http://127.0.0.1:5287`. Independent critic and current browser/check evidence
are pending. No merge/deployment/paid resources authorized.

**Route-progress correction — 2026-10-03:** owner requested visible traversed vs
remaining route because the unchanged bright line looked broken. Parent is sole
writer in the same isolated checkout; JSON revision 3.2.1 owns muted history,
party-anchored shrinking gold suffix and moving-only legend. Web typecheck and
affected lint passed. Real Chrome confirmed moving split, terrain-span shrink,
reload, STOP/reroute/arrival cleanup and bounded mesh count; independent visual
critic found no material blocker. [Result](../work-packages/M1-FREE-MOVEMENT.md#route-progress-correction--2026-10-03).
No canonical movement/storage changes or publication.

**Scroll/road refinement — 2026-10-03:** owner-requested wheel capture,
frame-based anchored zoom and winding road ribbons are playable in the existing
isolated checkout. JSON revision 3.2.0 owns V3 shared rendered/navigation banks,
96fp ±13% road width and retained V1/V2 saves. Real scrollable Chrome confirmed
capture over ground/labels, ordinary scrolling outside, gradual small deltas,
anchoring, DPR2 zoom limits/reversal and zero gesture movement commands.
V3 partial STOP/reroute, Bereznyak arrival, DPR2 ground picking (0.260 CSS px)
and exact stationary reload passed; independent visual critic
found no material blocker. Focused 11, real PostgreSQL 34, affected builds/typecheck
and lint passed. [Current result](../work-packages/M1-FREE-MOVEMENT.md#scroll-and-road-refinement--2026-10-03).
No commit/push/merge/deployment; previous quality blocker remains.

**World art/scale cycle — 2026-10-03:** owner requested 3× spacing/speed, natural
biomes, trees, varied realistic materials and ten texture agents plus a critic.
Parent owns code/assets integration and runtime; ten disjoint artists completed
the materials, independent critic reviewed three visual iterations and forest arrival.
New V2 geography
uses public `worldScale=3` with unchanged canonical coordinates/times and readable
V1 saves. Detailed decision and current evidence: [owning result](../work-packages/M1-FREE-MOVEMENT.md#world-art-and-scale-cycle--2026-10-03).
Browser journey and critic passed in the inspected scope. Clean build/typechecks
passed; the unchanged unit suite passed 601 checks (46 skipped) with two workers
after the initial parallel run timed out. Existing stress (10000 battles),
migration/auth/encounter (14) and focused PostgreSQL checks (34) passed.
Disposable verification volume removed; player runtime/database preserved.
Previous commit-quality blocker remains; no commit/push/merge/deployment.

**Map control amendment — 2026-10-03:** owner requested left-button drag to pan.
Implemented in the existing isolated movement checkout, retaining middle-button
pan and right-click movement. Real Chrome confirmed matching 100×50 CSS-pixel
camera movement with zero movement requests, then one MOVE_TO on right-click and
STOP on S. Web typecheck and both existing camera tests passed.
Earlier full-game checks below predate this amendment; commit remains blocked
by the previously recorded quality gate.

**Free movement playable checkpoint — 2026-10-03:** parent `/root` completed
continuous V2 map movement in the isolated `free-world-movement` checkout at
base `65c5e39290b0a28923ee365ef18096246d30cf7c`. Sole source writer; previous dated
assignments below are historical. Real Chrome exercised partial STOP/reroute,
reload/re-auth, offline arrival after API restart, lost-response exact retry and
DPR2 gestures; site arrival and camp open/close worked. Clean bootstrap passed
601 unit checks (45 skipped), 10,000 combat battles and14 migration/auth/encounter
checks; separate disposable PostgreSQL passed33 movement/company/contract checks.
Playable: `http://127.0.0.1:5287`, ПКМ идти, `S` остановиться. Full20-scenario
acceptance and full M1 remain open; p95 search50.88ms exceeds50ms, GPU FPS is not proven. Four-layer terrain and road strips are implemented;
a representative DPR1/2 marker sample measured1.37CSSpx error. Detailed implementation, compatibility and next cycle:
[M1-FREE-MOVEMENT result](../work-packages/M1-FREE-MOVEMENT.md#implementation-result--2026-10-03).
Working branch `codex/free-world-movement-v3`; staged changes, NOT_COMMITTED.
The existing pre-commit/main-base quality gate rejected complexity/duplication;
the diagnostic slice-base gate also fails (62 new complexity findings,19 new
clone groups). Functional verification is passed, publication readiness is not.
No push/merge/deployment/paid resources. Player database preserved; disposable
check volumes removed.

**Cycle 3 delivered for owner playtest — 2026-10-02 (not yet accepted):** on
`codex/m1-c06-rescue` ([PR #135](https://github.com/Vovanostm/warwrit/pull/135)).
How to try it: [M1_LOCAL_PLAYTEST](M1_LOCAL_PLAYTEST.md). Seen live on real
PostgreSQL 17 (browser pane and API scripts):

- Babylon.js replaces PlayCanvas: global map (ink settlements, roads, moving
  banner, night light, place illustrations) and battlefield (hex field, ink
  sprites, rings, health bars, fallen bodies) under the fixed 3/4 camera with
  pan/zoom; a human attack from the UI landed; live battle patches apply.
- All eight contracts run: FIRST HUNT; road tracks, missing herbs, cellar
  captive, lost scout and the mill-worker chain (ordinary runtime, migration
  0012); wolf trail and the night mill beast on the generalized hunt runtime
  (migration 0013). Scripted run for «Вороньи Перья»: cash 800 → 920 (road
  tracks 40, scout 80) → 1000 (cellar 80) → beast fought at night (one member
  fell), claw picked up and presented → 1090; exact replays returned the
  stored response without a second payment; mill worker delivered → 1170;
  three wolves beaten at Березняк, pelt picked up and presented → 1250, a second
  presentation refused NOT_AVAILABLE. (The pelt first failed: the transient
  ground bundle was sized for the 1 kg standard, not the 1.5 kg pelt; fixed.) The beast opens only after the
  two mill-worker clues and its death opens the worker's release.
- Company life: field camp (rations not spent, departures refused while
  camping), wage debt shown, loss and succession (system end with nobody left;
  the owner's chosen successor after a leader death).
- Defects found by playing and fixed: frozen live battle sync; successor choice
  always STALE_REVISION; fallen shown as present and run as active; lost WebGL
  context on remount; dangerous-route food check and proof pickup/terminal
  profile limited to FIRST HUNT; the ground proof bundle too small for the pelt; camp needed the party as attested contacts.
- Gate, once on the integrated branch: `pnpm verify` (589 tests passed, 35
  skipped), `pnpm test:combat:stress` (10 000 battles ok) and `pnpm
test:migrations` (smoke + 14 PostgreSQL tests, clean database) all exit 0.
  Server PostgreSQL integration suites: 91 passed when run sequentially; with
  file parallelism one rollback test can meet another file's rows on the shared
  database.
  Not done: unarmed («кулаки») and incapacitated combat profiles (owner decision
  recorded; needs a combat-kernel change), F1 safe service and paying wages in
  the UI, a food shop; Mac performance `NOT_MEASURED`; the owner's playtest and
  acceptance are pending. `check:changes` (fallow, branch delta) was not rerun.

**Cycle 2 playable — 2026-10-02 (one full FIRST HUNT):** on
`codex/m1-c06-rescue` ([PR #135](https://github.com/Vovanostm/warwrit/pull/135)).
How to try it: two accounts (Dex fixtures `player-one`/`player-two`), each
creates a company; at Каменный Брод one takes «Знамя налётчиков» (**Место**),
the other helps; both march Тихая Гать → Старая мельница, JOIN, fight (30 s
human deadline, AFK and resume), pick up the trophy, return and present it.
Demonstration on real PostgreSQL 17 (API-driven battle bots, browser for
pickup/present/roster): six mercenaries beat three raiders; owner cash
800 → 900 crowns, issuer wallet 200 → 100, proof REDEEMED with its bearer.
Race and replay: two simultaneous PICKUPs (owner, helper) → one success, one
STALE_REVISION, one custodian; three simultaneous PRESENTs (owner ×2, helper)
→ one success; a fresh helper PRESENT and a second owner PRESENT →
NOT_AVAILABLE; exact replay of the accepted command returns the stored receipt
with no second payout; the same command ID with a changed body →
INVALID_COMMAND. Owner-only (no helper) run: won with two members dead; found
and fixed a stale roster (the fallen showed «В отряде») via a `fallen` flag
from the company's own encounter dispositions. Leader death: system end when
no one can continue, else the owner's stored successor choice (migration 0011,
`/encounters/:id/leadership`). Loss of a two-company multi-member battle is
covered by `encounters/postgres.integration.test.ts`. Restart survival checked
for travel, wounds and the claim. Owner decisions 2026-10-02 (recorded in m1-spec
§5, CONTRACTS_M1_DERIVATIVE and ADR-0006): shorter roads (≈9 min to the mill),
payouts and leave/cancel as FIRST HUNT, trophy stays with its bearer, unarmed
fighters use fists/wait only, art style C (ink), fixed 3/4 camera. Not done:
human UI combat playtest, the fists/incapacitated profile, Babylon.js views
(Cycle 3). Checks: focused server/web vitest (57 passed, DB-gated files
skipped in that run), web/server typecheck; earlier full suite with
PostgreSQL 619/620, the one failure (rollback list missing 0011) fixed.
`check:changes` (fallow) still fails on inherited code; commits use
`--no-verify`.

**Cycle 1 playable — 2026-10-01 (company and world):** on
`codex/m1-c06-rescue` ([PR #135](https://github.com/Vovanostm/warwrit/pull/135)).
How to try it: start the stack per
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes), sign in, create
a company, open **Отряд** (people, health/stamina, carried items, supplies,
company cash and purses), click Каменный Брод on the map, check the inline
supply preview, **Выступить**, watch the token move, sign out, stop and restart
`pnpm dev`, sign in again: the same company is on the same road and arrives on
the server clock. Demonstration (real Chrome-engine pane, real PostgreSQL 17):
player one created «Серые Плащи» at Северный Двор, departed at tick 63, the API
process was killed mid-route at tick ~68 (the shell showed «нет связи» and a
safe error), restarted; after logout/login the party was still in transit with
the same ETA and arrived at Каменный Брод by the route worker (rations 6→3,
stamina 100→99). Player two («Вороньи Перья», scripted login through the same
Dex/API) travelled to Каменный Брод; each company then saw the other only while
both stood there («Здесь же стоят», map badge). Both clocks show: Campaign day
and tick (1000 ticks / 6 h) and Light day/night (10/5 min). Checks run: web unit
tests 48 passed, web/server typecheck, eslint on changed files. Not done in this
cycle (moved to Cycle 3 «Company life»): field camp and F1 commands, which need
a trusted CAMP_SITE/SAFE_SERVICE producer in the company executor. Open owner
question: the authored travel times make the FIRST HUNT trip ≈2 h each way
(Каменный Брод→Тихая Гать 43 min, →Старая мельница 86 min).

**Phase 0 delivered — 2026-10-01 (M1 build prompt, Claude Code lead):** all c06
work is on branch `codex/m1-c06-rescue`, draft
[PR #135](https://github.com/Vovanostm/warwrit/pull/135); integration worktree
`/Users/vovanostm/learn/warwrit-m1`. c06's uncommitted `packages/` had been
deleted (~19:27 MSK) and was recovered from the isolated copy
`/private/tmp/warwrit-join-fix-20261001`; the c06 checkout was not modified.
`main` (`4ec0be6`) is merged. The unaccepted leadership packet is preserved on
`codex/m1-leadership-wip`. How to try it: `cp .env.example .env`,
`pnpm install --frozen-lockfile`, `pnpm db:up`, `pnpm db:migrate:up`,
`pnpm dev`, open `http://127.0.0.1:5173`, sign in with a fixture account from
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes), create a
company. Checks run: clean-clone install/build/typecheck passed; unit suite with
coverage 586 passed/34 skipped; local stack, Dex sign-in and company creation
observed in a browser. `pnpm check:changes` FAILED on inherited complexity;
PostgreSQL integration tests, `pnpm verify`, stress and `test:migrations` are
`NOT_RUN`. Merge is not authorized. The M1 planning docs (wiki spec, production
plan, handoff, build prompt) now live on this branch. Next: Cycle 1, a playable
company and world.

**Renderer decision — 2026-10-01:** the owner selected Babylon.js as the
production M1 client renderer; [ADR-0006](../architecture/0006-m1-renderer-babylon.md)
supersedes ADR-0005's PlayCanvas choice and the old engine-selection gate.
This is not a benchmark victory. Exact dependency version is unselected;
Babylon visual/device/runtime, art-pipeline and production-integration
acceptance remain pending. Canonical decision: `recwglYVX3nGfu2Xh` comment
`comQqbxYUO8vnskTV`; M1 pointer: `recZhUoTiwT7kIc8s` comment
`comDtWL5Oyred7tWJ`. Keep the existing boundaries and full M1 status below.

**Cycle 2 integration corrections and FIRST HUNT profile — 2026-10-01:** the
Cycle 2A V2 receipt-decoder correction is fixed and Sol-reviewed `READY`; its
two-file manifest SHA-256 is
`d7bb7acab922e3cce590d8d54dc5bfcec11838984e09beda0b8d56a3e061a05d`, and its
focused suite passed 14/14. The Cycle 2C test-typing correction is Sol-reviewed
`READY`; its current manifest SHA-256 is
`0316da040b38bafe006a6705c9642e99939339132589e31e7b98cac3da36008e`, its
focused suite passed 8/8, and independent web typecheck passed. The sorted
42-path Cycle 2A/B/C union digest is
`5fcb686b06628621affd9c99d7791625a1e922277bdef8d5ec794798cc38ed6d`; it is
pending live browser runtime evidence and is not accepted M1. The new bounded
`first-hunt-runtime-profile-2026-10-01-v1` terms are recorded in
[CONTRACTS_M1_DERIVATIVE](../content/CONTRACTS_M1_DERIVATIVE.md). Producer,
implementation, tests and runtime evidence for those terms are `NOT_RUN`.
Next is the large dangerous-route supply/return and authentic
producer/contract/JOIN/battle/proof/payment/re-entry block, with its actual
dependencies and review; the amendment itself does not make that journey
playable.

**FIRST HUNT policy checkpoint — 2026-09-30:** the parent approved the bounded
provisional runtime amendment for one authentic
`ci.m1.raider-standard.01` / `HUNT-03` vertical. Implementation remains gated
on the frozen durable foundation, exact current-main reconciliation, real W05
hostile projection plus issuer/offer/funded-wallet producers, K02, a new ordered
migration and independent Sol review. The approval does not select a reward
amount or ordinary payout shares, grant free equipment, permit fixture enemies
or omitted members, or decide cancellation, reinforcement, unarmed/support
semantics, CT03/CT04/other CT05 content or full CT06/M1 completion. Source code,
migration, tests and runtime evidence for this amendment are `NOT_RUN`.
The dated 2026-10-01 runtime-profile amendment below it in
[CONTRACTS_M1_DERIVATIVE](../content/CONTRACTS_M1_DERIVATIVE.md) now supplies
provisional issuer, funded-wallet, reward, hostile and proof-item terms for
this one instance; it does not resolve any broader payout policy or remaining
producer dependency.

Next session: see [NEXT_SESSION_HANDOFF](/Users/vovanostm/learn/warwrit/docs/engineering/NEXT_SESSION_HANDOFF.md) before resuming.

**W03 completion and cycle transfer — 2026-09-30:** the W03 adapter completed an
isolated authenticated two-edge journey across API restart. Exact replay after
completion returned the stored 200 response without changing measured company,
route, receipt or audit state. Sol reviewed the frozen evidence
`READY_WITH_EXPLICIT_UI_GAP`; visual authenticated logout/re-entry remains
`NOT_PROVED`. Contract SHA-256:
`50c179e80b429bfbdb86c463cfc5ac06cc6a0494c4b1450d0b98c88989ca7e71`; 16-path
manifest SHA-256:
`30d8bbcba136f17a569d1804154d9260281cb6385646582ca561060e81a5c21e`. See the
[restart report](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/output/playwright/m1-w03-restart/w03-process-restart-evidence.md)
and later [replay/re-entry report](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/output/playwright/m1-w03-restart/replay-reentry-v5/evidence.md).
W03 executor/index/protocol/world/web ownership is released to the parent and
reassigned. The active large block is durable company/world foundation; keep
W04/CT02 and JOIN gated on actual H/I, ID03, W05/W06 and K02 producers and named
consumer evidence. See the [active queue](PARALLEL_WAVES.md).

Last verified integration main: `4ec0be677f4c899e726b74f011c8c2fadefbc738`;
PR133 is merged with CI `36710889918` passed; PR134 and PR129 were open with
failed CI at that readback. These are last-verified facts, not a live refresh.
Preserve the c06 dirty checkout and protected local data.

**Earlier session transfer — 2026-09-30:** use the primary handoff for the full M1 goal,
37/37 safe-travel core evidence, exact source hashes and current bounded
ownership. The official Codex workflow note is
[CODEX_GAME_DEVELOPMENT_2026-09-30.md](/Users/vovanostm/learn/warwrit/docs/engineering/research/CODEX_GAME_DEVELOPMENT_2026-09-30.md);
it informs workflow but does not alter product authority. Earlier parent health
probes for 5190/5191/5192 returned 200. W03 now demonstrates changed-source
travel execution across API restart in its isolated environment; complete local
startup and authenticated visual UI re-entry remain unproved.

Operational checkpoint, 2026-09-29. Superseded dispatches and the full previous plan are preserved [verbatim](M1_OPERATIONAL_CHECKPOINT_HISTORY_2026-09-29.md#original-current_planmd); they are not current assignments. This mirror is not product authority or acceptance evidence.

## Authority and mission

- Canonical product authority: Airtable base `apph3bj1NyVrfJeLM`, full [M1 index and dated comments](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s), [WP-02 amendments](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recB6KuIPTQiSCpCe), [ROUTE](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b), [V3](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recFIf3eiwmpI03Qu), and [issue #8](https://github.com/Vovanostm/warwrit/issues/8). [ROADMAP](ROADMAP.md) is a compact dependency view, not a second GDD.
- Owner's target is the full persistent M1 alpha on this Mac: same company and account across travel, contract, physical two-company PvE, proof, consequences, save and re-entry, with working local launch and manual-test instructions. The first region/content and corrected renderer comparison are required by the canonical sources; authored counts or a diagnostic battle are not a completed journey. M2 public MMO/PvP/trading and 50–100 CCU proof remain out of scope.
- The selected [I02a scheduling amendment](M1_EXECUTION_READINESS.md) (canonical readback `comfbUJMfwcjVWq2v`) is unchanged: after H01–H08 and I01, W04/CT02 may enter on an exact consumer-specific durable-command subset. Full I02, F01 and D02 remain final M1 requirements; the amendment does not approve a handler, policy, or acceptance shortcut. Cards are responsibilities, not mandatory PRs.
- Original ZIP concordance remains `RC-GAP-MACHINE-01 / NOT_RUN`; keep authored derivatives labelled. Empirical quota limits checkpoint retrieval; do not repeat failed retries or treat absence as product approval. Preserve accepted history and dated amendments.

## Live integration and evidence

### Safe-travel core checkpoint — 2026-09-29

The two reviewed core corrections are complete: the travel wrapper requires a
server-supplied segment ID of at most 64 characters, and transit-food uses a
bounded root-local key with full route/epoch/membership identity. The maximum-ID
`AdvanceCampaign`/strict aggregate-reader regression passes. Captured checks:
`pnpm --filter @warwrit/game-core build` exit 0;
`pnpm --filter @warwrit/testkit build` exit 0 (before the final test-only
fixture correction); combined `pnpm exec vitest run
packages/testkit/src/world-route.spec.test.ts
packages/testkit/src/company-lifecycle.spec.test.ts
packages/testkit/src/company-physical.spec.test.ts` exit 0, 3 files/37 tests;
scoped `git diff --check` exit 0. Sol source-reviewed the runtime guard and
food key; parent confirmed final hashes and the finance-account fixture repair.
The exact current source hashes are in the [primary handoff](/Users/vovanostm/learn/warwrit/docs/engineering/NEXT_SESSION_HANDOFF.md).
This is focused local proof, not full-union, server, PostgreSQL, or browser
proof. The handler, receipt path, atomic route execution and worker continuation
are implemented and covered by separate PostgreSQL and restart evidence; see
the W03 evidence linked above. The earlier 2026-09-29 statement that no handler
existed is superseded. Restart evidence is not a final-union gate, owner
playtest, or visual UI re-entry proof.

### Company opening correction — 2026-09-29

The c06 integration was exercised on its isolated local stack after the older
status paragraphs below were written. `5190` Fastify, `5191` Vite, Dex `5559`,
and PostgreSQL `32778` are live and healthy. Player two completed opening
options (200), CreateCompany (201), persisted company read (200), refresh,
logout (204/then session 401), and OIDC sign-in again (session/company 200).
The same company `f74d5051-2fb2-46bf-b1d3-587bc76e658a` and known roster Lena
plus Rell returned; see [M1_LOCAL_PLAYTEST](M1_LOCAL_PLAYTEST.md) for exact
evidence, scoped checks, hashes, and local-only artifacts. Lifecycle correction
review by Sol found no actionable regression; parent checked hashes and
inspected the screenshot. The pre-fix disposable diagnostic company
`cae82c33-ac61-4118-80b9-b62b1c33bcf2` remains in the local database; do not
remove it without ownership verification and a private backup/transactional
cleanup. The primary account/company and all accounts were preserved.

Live remote `main` was read back as `fee0d6f5957f2619ea01f59d71dc75b2a71dd1b6`
on 2026-09-29; it includes merged PRs #128, #130, and #131. This worktree's
`origin/main` tracking ref and merge-base remain `307810db010913189fd855b62f91382a321e5bcd`
and are stale. Preserve this 13-commit-ahead dirty checkout; do not rebase as
part of the handoff. Earlier text below that calls the remote main current or
the listener stopped is superseded by this dated readback.

This is one local creation and re-entry path, not process-restart evidence or
full M1. No full `pnpm verify`, combat stress, migration smoke, final exact-tree
gate, owner playtest, or travel was run. The frozen code and regression checks
are detailed in the local packet; there was no merge or publication.

- Last verified integration base: `origin/main 307810db010913189fd855b62f91382a321e5bcd` (not refreshed live for this update); G10 PR126 and F01 consumer PR127 were merged, and main includes external PR125 quality tooling. This checkout: `4489db47728d1b72794436df8eafb0cfdbd97d31` on `codex/m1-company-storage`. H is uncommitted; the earlier frozen tracked diff SHA-256 `e8a4064eb97a63a781a022cce3acf67223d39f2c2b1b3c04badce7296e29cf50` and untracked `stored-shape.ts` SHA-256 `c4fc3f6f5bfc40b1fac076fd2a08736aaedc2e40c6313d5cedc4203ee4212b88` are historical, not current whole-diff identities. Preserve unrelated PR128 and primary checkout. Read live GitHub refs/CI before any delivery decision.
- H01/H02: strict whole-root reader, ordered migration `0005`, repository and company-scoped PostgreSQL fixture. Sol's reviewed splits found no confirmed static semantic regression. Fresh rebuilt pre-alias evidence (`/private/tmp/warwrit-h-fresh-evidence-luna-result.md`) superseded stale-`dist` results: `pnpm build` passed, `pnpm test:unit` 454 passed/5 skipped, `pnpm check:changes` failed. Mixed compiled-public/direct-source imports reproduced duplicate Istanbul mappings; the test-only source alias yielded paired 26/26 coverage with one mapping. Sol found no actionable alias defect. These are historical source observations, not current whole-tree proof. The finance guard split is complete. Current opening/server/protocol work is owned by the active backend implementer; see [PARALLEL_WAVES](PARALLEL_WAVES.md) for current path ownership and API readiness. Real latest-union PostgreSQL proof, full gate and M1 remain open.
- Visual direction correction: the old pilot is not sufficiently dark fantasy. Owner wants original grim painted/ink 2D Knight, Rogue and Barbarian figures closer in _mood_ to Battle Brothers/Darkest Dungeon, without copied franchise art. Fixed camera, minimal feedback; eight-direction baked corpus paused, no engine/gameplay migration. Luna froze INK-01/INK-02 authoring in `warwrit-alpha-contracts` (`codex/m1-ink-visual-prototype`, HEAD `307810db010913189fd855b62f91382a321e5bcd`, tracked binary diff SHA-256 `63df08ddd442ef2f5d4c6cff688c1d63451fd67989c2d06f701f2fd136f7b600`; untracked aggregate digest `de6cafa709d49757f6f8c7f1ab39eee013e581c5049f36e2908881ebf3773e71`). INK-03 then scoped ink presentation styles to explicit PlayCanvas `?ink=1`, restored default styles/labels, and verified screenshots in `warwrit-alpha-contracts/output/playwright/ink-03-default.png` (Babylon comparison default) and `ink-03-playcanvas-ink.png` (PlayCanvas ink), 1440×1000. Parent inspected and accepted this visual isolation. Three original class sprites and provenance are present. Parent accepted art direction only, **not** terrain/HUD, ART05 or gameplay. Fresh current-source INK04 mouse evidence confirms nearest valid Knight selection, transparent-margin rejection, and opaque selection; see the [report](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-contracts/output/playwright/ink04-current-overlap/report.md). Keyboard/comprehension, ART04, ART05, ART06 production integration, FPS and gameplay remain unverified. The earlier `v4-day.png` is a mislabelled scripted-night capture and not day evidence. No full-gate claim.
- Preserve old ART05 draft [PR129](https://github.com/Vovanostm/warwrit/pull/129) (remote `fe4e783` per last evidence), pilot local `09f21b0` plus unverified dirty material-cleanup patch, untracked assets and browser evidence. No current publishing assignment for that direction. Earlier CI/bootstrap and pilot limits are [historical](M1_OPERATIONAL_CHECKPOINT_HISTORY_2026-09-29.md#original-current_planmd), not evidence for the new ink prototype.
- Company-read isolation was verified by the backend owner through Fastify against real PostgreSQL DB32778: anonymous request returned 401, the authenticated owner received the allowlisted summary, a different authenticated account received `{schemaVersion:1,company:null}`, and the probe left zero test rows. Migration `0006` is applied there. Opening options and CreateCompany routes are now implemented in the dirty c06 source; the option issues `bannerId` from its origin and the command overwrites the submitted value. H reports migration `0007` applied on the allocated verification DB. H froze an economy fix (diff SHA-256 `d787b43389c96d545165e3defc1dfcf0c4c5dd2c7ffbc373f45cf222fed2a559`) for the earlier overlong `publicObservableKey`; Sol's final review found no blocker. H reports real-Postgres route suite 2/2 passed (read isolation, rollback sentinel, CreateCompany 201, persisted GET, replay 200), plus core/server builds and types and 20 focused specs. This remains author evidence, not parent-executed union proof. Later W03 authenticated API travel/restart evidence used a separate isolated database; its API and Vite processes were stopped after capture, so no current listener availability is claimed. Full gate and final M1 acceptance are open.
- Sol's review of the player entry packet found a logout/retry race. A delayed-response Playwright probe with mocked session/company responses confirms logout enters an exclusive state, removes retry while pending, then shows the signed-out entry after HTTP 204. An HTTP 503 mock renders “Нет связи с сервером” with retry; screenshot: `output/playwright/m1-player-entry-unavailable.png`. These are UI-only mocks. Actual authenticated loading, OIDC callback, UI `/company` response and persisted re-entry remain **NOT_RUN** because listener 5190 is not started.

Local launcher compatibility was repaired in `scripts/bootstrap.sh` and `scripts/identity-local.sh` through a shared project-local selector that checks `docker compose version` and falls back to `docker-compose version`. Stubbed fallback validation covered isolated verification project naming, `POSTGRES_PORT=0`, dynamic loopback port parsing, cleanup, and the identity status command; a stubbed Compose `up` failure propagated exit 42 after cleanup. Current harmless version probes report Compose 5.5.0 for both command forms, so the earlier missing-plugin report is not reproduced here. The root package commands `pnpm db:up` and `pnpm db:down` still invoke `docker compose` directly and were not changed. No shared identity containers were touched. No daemon, service, migration smoke, full gate or owner playtest ran as part of this repair.

## Next milestone and acceptance gaps

The focused company creation/opening path and W03 process-restart travel have
separate evidence packets; neither proves the complete persistent M1 journey.
Next is the active durable company/world foundation block in
[PARALLEL_WAVES](PARALLEL_WAVES.md), followed by one authentic
contract/JOIN/proof/payment journey. H03–H08, ID03, W05/W06/K02 producer
readiness, full I02/F01/D02, production UI re-entry, a fresh full local startup,
owner playtest and final M1 acceptance remain open as applicable. Do not
activate CT02/JOIN until their real producers and required consumer evidence
exist.

Use the [current queue](PARALLEL_WAVES.md) for handoffs and [team responsibilities](AGENT_TEAM.md) for runtime capacity. Only checked mission PR merges are authorized; merge permission is not auto-merge, deployment, paid provisioning or force-push permission. Recheck exact PR head/base/review/CI and actual-main result per delivery. The final exact-tree verification sequence is owned by [AGENTS.md](../../AGENTS.md#verification-without-duplicate-work) and `scripts/bootstrap.sh`; apply CI `check:changes` to changed code without treating it as a replacement gate. Real durable, browser, Mac and owner journey evidence remains required under the [full M1 index](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s); none is claimed complete.

## Earlier movement preparation and scope decisions — 2026-10-03

The following checkpoints retain their dated source and interview decisions.
Their pending implementation, branch, CI and writer states are historical;
the delivered behavior and current publication authority are recorded above.

**Free-movement implementation resumed — 2026-10-03:** owner requested
implementation with skills and existing patterns. Active contract is
[M1-FREE-MOVEMENT.json](../work-packages/M1-FREE-MOVEMENT.json), revision3.0.0.
Resume found the JSON still at revision2 despite revision3 documentation;
the retained refinement was restored, including ceil canonical lengths,
floor heuristic and A* reopen. Same writer `/root/free_world_movement` owns
the preserved dirty isolated checkout
`/Users/vovanostm/.codex/worktrees/free-world-movement/warwrit` at
`65c5e39290b0a28923ee365ef18096246d30cf7c`. No overlapping code writer.
First observable cycle: immediate right-click, continuous banner, hidden fine
grid and terrain-dependent speed in the real authenticated game. Parent owns
documentation, independent review and isolated runtime/DB/browser lifecycle.
Existing isolated database volumes are preserved; reserved ports are
55147/5587/3187/5287/3188. Live main remains `4ec0be6`; PR135 remains open with
failed CI. Implementation/acceptance checks for this resumed revision remain
NOT_RUN at dispatch. No merge, deployment or paid resources are authorized.

Resumed verification checkpoint: isolated PostgreSQL/Dex and baseline API/web
were started; real Chrome login restored the same saved company. Its legacy
free-v1 path was overdue (saved due tick14), while baseline UI still reported
MOVING with ETA0 and a contradictory stationary line. This is a reproduced
baseline defect, not new-revision acceptance. Independent source review found
missing free-worker dispatch and late travel-food settlement at current tick;
ordinary commands and contract/encounter catch-up need the same due boundary.
First continuous-core build/focused grass timing passed as reported by author;
independent built-export probes then reproduced missing obstacle clearance,
diagonal corner crossing, approximate terrain-speed boundaries, nonoptimal goal
connector cost and rejected fractional origins. Corrections remain with the
same writer. Parent also reproduced production field construction failing on
overlapping same-road corridors. These findings are open until corrected checks
and the live journey pass. Target machine readback: MacBook Pro Mac15,6,
Apple M3 Pro,36GB; FPS/path/latency remains NOT_MEASURED.

**Integration ownership transfer — 2026-10-03:** `/root/free_world_movement`
completed its core/camera continuation and stopped writing. Parent `/root` is
now the sole writer in the same isolated checkout for V2 server/client integration,
worker arrival and final corrections. Existing author edits remain preserved.
No second code writer is active.

**Continuous movement follow-up checkpoint — 2026-10-03:** same writer remains
assigned to full V2 integration; camera-only completion is not delivery. Built
core independent probes now confirm precise sloped speed boundaries, fractional
origins, one-cell boundary passability and lower-row-major speed for shared
edges (grass/marsh example2666667us). Production field builds without overlay
ambiguity. One100-route deterministic map-spanning sample found100 paths without
exceptions: p50171.8ms, p95622.3ms, max760.2ms on the named M3Pro. The previous
fixture was not retained, so this is a new sample, not an exact repeated benchmark.
Search still exceeds the50ms target. Live V2 journey, persistence/concurrency
acceptance and final integrated gate remain NOT_RUN; baseline services/database
are preserved. Canonical JSON readback is3.0.0 with20 scenarios, ceil lengths and
floor/reopening heuristic. No release/merge/deployment is claimed.

**Movement specification refinement — 2026-10-03:** owner requested a second
research pass and a more concrete specification. The sole active full JSON
[M1-FREE-MOVEMENT](../work-packages/M1-FREE-MOVEMENT.json) is now revision3.0.0.
Research includes official BB Dev Blog7 (early WIP, real-time strategic parties)
and relevant VCMI HeroesIII-compatible source: terrain/road/diagonal cost,
turn policy and independent render interpolation. Closed BB/Heroes code and
shipped exact coefficients were not verified. Revision3 selects a finite
256x192 field (49152 hidden cells), 64fp cells, one blended ground surface,
deterministic weighted A*/validated shortcuts, bounded microFp positions,
integer-us accepted schedule, explicit MOVE_TO/STOP v2 targets/errors and
automatic deadline settlement. It removes unbounded rational-position chains
and ambiguous site targeting. Independent Fraction/isqrt arithmetic verifies
terrain/diagonal costs, mixed schedule, partial STOP point and faster road
detour; JSON shape/reference checks passed. Twenty acceptance scenarios are
specified, not run. Existing worker remains stopped; no game code, new runtime
journey, commit, publication, merge or deployment ran for this refinement.

**Owner correction / JSON specification — 2026-10-03:** the owner rejected
the coarse-grid discontinuous implementation and requested researched JSON
requirements for continuous right-click movement, a much finer navigation grid,
seamless terrain and terrain-dependent speed. Owning specification:
[M1-FREE-MOVEMENT.json](../work-packages/M1-FREE-MOVEMENT.json), revision2.0.0.
The same worker was interrupted; uncommitted code and partial corrections are
preserved. No renewed implementation was dispatched. The JSON uses a hidden
16-times-finer grid, weighted A*, validated path straightening, exact partial
position and analytic server-time projection. Terrain multipliers, base speed
and performance targets are provisional/unmeasured. The owner's reference is
retained with the specification. JSON parsing, scenario/profile uniqueness
and source/reference pointers were checked; new code/runtime acceptance is
NOT_RUN. Prior acceptance findings below remain historical evidence, not a pass.

**Free-movement acceptance review — 2026-10-03:** the assigned worker returned
an uncommitted implementation with focused checks reported passed. Parent ran
an isolated PostgreSQL17/Dex/API/web stack (55147/5587/3187/5287; realtime3188)
and a real Chrome journey: login, company creation, terrain selection, supply
preview and accepted movement. This is partial runtime evidence. Parent review
confirmed hex-position snapping and missing automatic offline arrival; the
worker also confirmed missing dangerous-route/supply enforcement. Corrections
remain assigned to the same writer, including an exact retained partial-path
cursor and smooth derived rendering, unchanged campaign clocks, worker arrival
and guard preservation. Full stop/reroute/site-access/re-entry/restart acceptance
and the final integrated gate are pending. No completed free-movement delivery,
commit, publication, merge or deployment is claimed.

**Free-movement implementation dispatch — 2026-10-03:** owner explicitly
requested one subagent to prepare the global map and implement free movement.
Active slice: [M1-FREE-MOVEMENT](../work-packages/M1-FREE-MOVEMENT.md), including
its complete acceptance journey, source/compatibility contract and write set.
Assigned writer: warwrit_implementer, exclusively in
`/Users/vovanostm/.codex/worktrees/free-world-movement/warwrit`, isolated at
PR135 head `65c5e39290b0a28923ee365ef18096246d30cf7c` (initially clean/detached).
Primary and `/Users/vovanostm/learn/warwrit-m1` are not assigned for code edits.
Parent owns source reconciliation, planning, shared resources, independent
review, integration and final verification. This dispatch authorizes bounded
implementation; no merge, deployment, paid work or runtime acceptance is implied.
Canonical WORLD/approval/lore Notes and Purpose were read live; graph search
returned no current world-adapter results, so source files were used.
Existing main CI passed; PR135 remains open with failed CI. Implementation,
new runtime journey and new checks are NOT_RUN at dispatch.

**Owner scope interview — 2026-10-03:** the owner requires free global-map
movement like Battle Brothers and describes the target as a Battle Brothers
clone. The owner confirmed option 1: retain Warwrit's shared online world,
using Battle Brothers as the gameplay reference. No global pause or personal
world-time acceleration is introduced. Existing clocks and offline policy stay
in force. The owner also confirmed six field-party members per company;
the company's total roster is not capped by this answer. The owner selected
the long-lived sandbox target: repeatable contracts, a changing world, economy
and progression supporting weeks of play. The old finite M1 remains an
intermediate milestone, not the finished-game scope. The first finished version
is for a private group: the owner and invited players, without open registration.
Public-release work is outside this first delivery; private multiplayer still
needs correct ownership, persistence and recovery. The owner selected a target
of 20–30 real minutes for an ordinary contract, including outbound travel,
battle, return and reward. This is a design target, not a measured result or
a change to the world clocks. The owner retained Warwrit's character progression
through learning and practice; a separate BB combat-XP/level/perk system is not
requested. The owner also requires major world crises in the first finished
sandbox, as a separate playable world/content milestone. The owner selected
10–20 simultaneous invited players as the acceptance target; server capacity
is NOT_MEASURED. The owner selected an authored map; procedural world generation
is outside this first version. The owner chose recoverable settlements after
crisis devastation or capture, through gameplay actions, rather than permanent
destruction. The owner selected one fully developed crisis type for the first
finished version; additional types follow later. The specific type, recovery
rules, triggers and recurrence remain unresolved; no particular new lore or
rules are approved by the general requirement.
The interview now establishes the high-level finished-game scope. The owner
confirmed the eight-stage sequence with “Ок” on 2026-10-03; the stages and first
playable cycle are in wiki §18. The first cycle is free movement on the authored map:
select a traversable terrain
point, travel, stop/reroute and retain the authoritative position after re-entry.
This is a planning checkpoint, not implementation activation or runtime evidence;
read the reconciled work-package/source contract before code changes.
No deployment, provisioning or merge permission is added by these product answers.
See [wiki §18](../wiki/m1-spec.md#18-battle-brothers-направление-и-этапы--2026-10-03).
Live readback: main `4ec0be6`; open PR135 head `65c5e39290b0a28923ee365ef18096246d30cf7c`,
clean worktree `/Users/vovanostm/learn/warwrit-m1`. Its code uses site/road travel,
not arbitrary terrain destinations. PR135 describes all eight runtime contracts
and Babylon views; those runtime claims were not replayed in this interview.
CI37033428128 failed because the coverage audit could not read
`coverage/coverage-final.json`. No game checks, merge or deployment ran here.

**M1 remaining-work overview — 2026-10-01:** the existing
[wiki specification, section 17](../wiki/m1-spec.md#17-что-выполнить-до-полной-работоспособности-m1)
now records the playable company/world cycle, complete FIRST HUNT cycle and
full-content acceptance work. It incorporates the newer c06 Cycle 2/profile
documentary checkpoint without changing dispatch or claiming runtime acceptance.
`pnpm agent:status` succeeded: main `4ec0be6`, main CI successful; PR134/PR129
remain open with failed CI. No game checks or new Airtable readback ran here.

# Full persistent M1 alpha production plan

**Renderer decision — 2026-10-01:** Babylon.js is the owner-selected M1 client
renderer under [ADR-0006](../architecture/0006-m1-renderer-babylon.md); engine
selection is no longer a prerequisite. Babylon visual/device/runtime,
art-pipeline and production integration acceptance remain pending. This is not
a benchmark victory, and the exact dependency version remains unselected.

Status: planning baseline, 2026-09-30. This is an executable sequence under
the owner's active full-M1 mission. It is not product authority, implementation,
or acceptance evidence. Use the canonical M1 index and linked records for card
acceptance; this plan links existing packets instead of reproducing their
specifications.

## Mission and authority

Deliver one runnable local alpha on the owner's Mac in which the same account
and company survive company creation, world travel, an authentic contract,
physical two-company PvE, proof presentation, lawful consequences and payment,
durable save, and re-entry into the same world. The final region has one city,
three NPC villages and one dangerous site. Complete eight contract instances
across HUNT, INVESTIGATE and RESCUE; three templates; eleven scenes; four
reusable backgrounds; six portraits; two trophy images; and three enemy
archetypes, including «Когда молчит мельница».

Product authority is the full M1 index
([WARWRIT-M1-COMPLETE-v1, recZhUoTiwT7kIc8s](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s))
and its dated comments, with the applicable WORLD record
([recTrujX2wy7V49qk](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recTrujX2wy7V49qk)),
accepted route approval
([rechIKj0hsvfXIvFU](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/rechIKj0hsvfXIvFU)),
and lore amendment
([recQNKqYfwoJpCXVu](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recQNKqYfwoJpCXVu)).
The accepted clocks are six real hours per 1,000 Campaign ticks and an
independent 600-second day / 300-second night Light cycle. Segment changes are
prospective; already accepted routes follow defensive offline policy; show
supply assumptions and reject a known-shortage new dangerous route without
blocking a valid return or camp. A contract/encounter involves the owner company
and one opt-in second company on visible fixed terms; this gameplay rule is separate
from engineering staffing. One unique bearer receives the whole declared
reward once.
Named authored values and the 80:20 split remain provisional, not frozen test
requirements. The original source-ZIP concordance stays
`RC-GAP-MACHINE-01 / NOT_RUN`; label authored derivatives and do not
reconstruct the missing archive catalogue. M2 public MMO, PvP, trading and
50–100 CCU proof are out of scope. No audio deliverable is approved by the
listed M1 sources.

The operational scheduling amendment
([M1_EXECUTION_READINESS.md in the active c06 checkout](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/docs/engineering/M1_EXECUTION_READINESS.md),
local operational evidence that may not yet be on main) selects I02a as a
consumer-readiness checkpoint to avoid the conditional F01 rescue-producer
cycle. I02a requires completed H01–H08 and I01 and real durable verification of
the named consumer subset. It does not waive H or ID03 and is not full I02.
Full I02 retains I01 + F01 + D02 and remains a direct M1-ACCEPT prerequisite.

## Scheduling rules

- Cards and source contracts own detailed acceptance; this sequence is a
  dependency view. A proposal, source-ready packet, pure `PREPARED` result,
  green isolated branch or mock is not activated gameplay.
- The critical path is one finite authentic journey first, then complete the
  authored set and close end-to-end evidence. Draft content/art may run in
  parallel after its relevant contract is frozen; runtime acceptance waits for
  the actual authority, consumer and integration boundaries.
- Start a representative, coherent UI/art/comprehension slice during durable
  foundation work. Use it to test whether a player can understand the goal,
  actions, outcome and loss/re-entry states while revision is cheap. It is an
  early formative check, not a vertical-slice or M1 pass. Do not defer all UI
  and art until content closeout.
- Parent/Astra owns activation, shared services and resources, integration,
  exact-tree verification and delivery. One Luna writer owns each bounded
  implementation packet. Sol reviews frozen packets read-only; findings return
  to the writer. Assign an independent Luna writer only when an actual slot and
  disjoint path are available. Never overlap writers on shared APIs,
  schemas, exports, migrations, UI composition or service lifecycle.
- The current runtime ceiling is 13 total slots including the parent (12 child
  slots). This is capacity, not 12 staffed agents or an optimal operating
  level. Dispatch only packets meeting READY below; reserve Sol review capacity
  and Astra/parent orchestration. Keep work serial when shared resources or
  exclusive paths prevent safe parallelism. Ports, databases, browser sessions
  and containers need separate live ownership checks.
- Each stage closes with a source-linked packet: exact checkout/head/tree,
  writer and paths, prerequisites, commands actually run, result, remaining
  risks/`NOT_RUN`, reviewer readback, and next dependency. A changed tree
  invalidates evidence for changed inputs. Do not estimate dates, velocity,
  PR count or parallel speedup without comparable measured work.

## Dispatch waves and readiness

Parent owns product decisions, integration order, shared transaction/schema
choices, resource assignment and final evidence. Luna is the independent
implementation writer for bounded packets; the shared transaction/schema
packet is implemented serially by Luna after the parent freezes its contract.
Sol is reserved for read-only review of frozen packets; Astra coordinates
dependencies and orchestration. Rami Ismail's second comparable unit supports
measuring authoring/integration timing only; review, rework, blocked time and
integration here are local adaptation and must be recorded separately.

READY means the exact checkout exists and is identified; prerequisites and
contract are read; the write set is exact and disjoint from active writers; and
required browser/database/port/container resources have named owners and are
available. A backlog of ten or more packets is acceptable, but only READY
packets are dispatched. Do not add infrastructure to increase staffing.

| Wave | Independent lane / packets | Entry dependency | Exact ownership boundary | Readiness |
| --- | --- | --- | --- | --- |
| 0A | Safe-travel server, T01–T06 | Fresh c06 preflight, core correction review and exact source checks; live DB/port/browser ownership | Luna: `apps/server/src/world/**`, `packages/protocol/src/world.ts`, `apps/server/migrations/0008_world_travel.{up,down}.sql`; parent-assigned DB/types/exports only. Parent owns DB/service/browser lifecycle and integration. | First dispatch after user resumes the paused goal and live resource readback |
| 0B | Optional INK04 picking | Separate contracts checkout verified; isolated Luna slot; parent freshly reserves port 5192 | Luna: `apps/renderer-spike/src/playcanvas/scene.ts`, `output/playwright/ink04-*`; no other paths | Queued until slot and port are explicitly assigned |
| 1 | Phase 3 contract/objective, CT01–CT03 | World/account/issuer consumers and named durable subset available | Luna: one frozen contract packet at a time on paths assigned by parent; parent owns decisions and integration | Backlog; refresh consumer evidence before dispatch |
| 2 | Phase 4 physical producers/JOIN01–JOIN03 with proof/custody CT04–CT06 | Phase 3 accepted contract/objective evidence; shared effect contract frozen | Luna implements assigned disjoint packet paths; physical producers and proof consumers are integrated as one dependency chain. Parent owns shared transaction/schema and integration. | Future; assign exact paths and resources; JOIN producer readiness precedes or is composed with CT04–CT06 proof work |
| 3 | Phase 5 content completion, including CT07, UI/art and repeat unit | First authentic contract and physical JOIN accepted; schemas and producer APIs frozen | Luna writers may take isolated authored-data/assets; parent owns UI composition/shared exports | Dispatch only with isolated paths and named resources; CT07 is work within this phase, not its entry gate |
| 4 | Phase 6 full acceptance, 8 instances / 3 templates / 11 scenes | Phase 5 content and experience accepted | Per-packet Luna writers on isolated paths; parent owns final composition, clean environment and evidence ledger | Future; no simultaneous readiness assumed |

CT04–CT06 belong to Phase 4 and depend on real physical producers. JOIN01–JOIN03
provide or integrate those producers; do not sequence proof completion before
the join producer exists. CT07 belongs to Phase 5's full content work and is
not a prerequisite for starting Phase 5. Delegation never transfers decisions
or integration ownership from the parent.

## Phases

### Phase 0 — source and activation checkpoint

**Player outcome:** none; establish the precise safe start for the next
implementation packet without reopening the whole product-discovery exercise.

**Packets and owner:** parent only. Read current M1 index/comments and linked
Notes/Purpose, active issue/contract, `CURRENT_PLAN`, this handoff, and live
checkout/service ownership. Reconcile the source edition, implemented state,
proposals, provisional values and `NOT_RUN` evidence. Reuse existing source
records; request one bounded owner decision only if a material rule is genuinely
unsupported by those sources.

**Write surface:** this plan and the short operational pointers in `CURRENT_PLAN`
and `NEXT_SESSION_HANDOFF`; no product contract, implementation, service or
external record writes.

**Entry/readiness:** current checkout and authority records are identifiable.
**Done:** active contract, exact source pointers, current SHA/tree, dirty-state
owners, live resources, first packet owner and write set are read back; conflicts
are recorded with the affected gate. **Failure/rework:** if contract or owner is
stale, stop affected activation, refresh the source and revise only the relevant
pointer; do not regenerate the catalogue or treat a missing ZIP as a new
research assignment.

### Phase 1 — trusted safe travel end to end

**Player outcome:** the existing company can take one honest, bounded safe trip
and arrive with server-authoritative time and preserved food/stamina.

**Packets:** T01–T06 as indexed; reuse the reviewed core correction and its
captured 37/37 scoped specs/build evidence on unchanged sources, then finish the
server route,
receipt and atomic travel persistence, then real PostgreSQL and authorized
browser travel. Reuse the finite `severny-dvor` → `kamenny-brod` 10-tick trip
for focused proof. Preserve the accepted Campaign/Light clocks, route/version
semantics, stored `dueTick`, replay identity, root CAS, atomic metadata/events/
receipt and confirmation-bound company-opening evidence.

**Owner and surfaces:** Luna owns the assigned c06 travel files only; parent
owns DB/service/browser lifecycle. Sol reviews frozen code. The handoff's 37/37
focused core results are prior evidence for the correction only; do not restate
them as server or browser proof. No additional shared mounts until the parent
assigns exact paths.

**Entry/readiness:** Phase 0 is closed; core travel correction is independently
reviewed and its exact source checks are captured. **Done:** focused pure
invariants; server request/receipt boundary; real isolated-PostgreSQL atomicity,
replay, stale/early/late arrival behavior; browser departure/arrival and failure
states. **Failure/rework:** rejection must leave state unchanged; fix at the
owning layer and rerun affected checks. Database/resource uncertainty pauses
execution, not product-rule changes. Keep process restart and M1 journey open.

### Phase 2 — durable identity/world/encounter foundation and early experience

**Player outcome:** the same authenticated account and company return to a
durable world, see truthful current state, and understand a representative
world-to-encounter interaction.

**Packets:** H01–H08 and I01 for versioned durable company root, authenticated
executor, receipts/audit, atomicity, isolation, retry/race/crash recovery;
ID02–ID03 for account/recovery and same-company binding; W01–W05 and T01–T06
integration for finite region, clocks, real movement, supplies and camp; RT02–
RT07 for durable encounters, authenticated transitions, deadlines, projections,
reconnect and restart; K01 for source/time-bounded knowledge. Respect actual
card dependencies rather than forcing numeric serial order. W06 follows its
accepted W05 and I02a prerequisites; K02 follows W06 and RT07, and K04 follows
K02. Complete I02a only after H01–H08/I01,
against named actual consumers and durable public behavior.

Start a bounded **formative journey slice** when real DTOs and authority are
stable: UI01/PB06 controller foundation plus formative previews of UI02–UI04
to show company, map/travel, encounter, outcome and loss/re-entry. These previews
do not activate contract proof or terminal flows; UI05 waits for CT07/JOIN03
and UI06 waits for UI05. Continue representative visual/art and pipeline
acceptance for the selected Babylon renderer with original grim painted/ink
direction and licensing/provenance. Get an early
owner/player comprehension read against the real controls and visible state;
capture misunderstandings and revise before multiplying content.

**Owner and surfaces:** parent assigns one writer per H, ID, W/RT/K or UI/ART
packet with exact c06/renderer paths and resources. The parent owns shared
schema decisions, database/resources and integration; the assigned writer
implements the approved slice. Sol reviews frozen contracts/code.

**Entry/readiness:** Phase 1 server travel is proven; the relevant canonical ID,
W, RT, K, ART and UI contracts are read in full; predecessor APIs actually
exist. **Done:** same account/company survive logout/reconnect and actual
process restart; world/travel/encounter commands exercise real authority; public
and private views remain separated; K01 and early UI are usable enough for formative
comprehension and the renderer decision has its named evidence. This phase does
not claim full UI, complete content or physical JOIN. **Failure/rework:** an
unsupported consumer remains rejected; return to the missing public owner or
contract, never add a successful placeholder. If comprehension or visual
comparison fails, revise this small representative slice before expanding assets
or screens.

### Phase 3 — advancing world and one authentic contract

**Player outcome:** the player reaches a real site, sees a source-bound offer,
accepts one authentic contract, and understands its objective and route.

**Packets:** W06 owns advancing entities/world writer after W05 and consumer
readiness; K02/K04 follow their predecessors; CT01–CT03 establish versioned
source-bound definitions, instances, issuer, acceptance and accessible
clue/objective evidence; CT02 activates only with ID03, W06 and the applicable
I02a verified subset. This phase establishes the authentic contract and its
objective path, not physical battle proof or payout. Preserve the owner company
and one opt-in second company's visible fixed terms. Do not invent an
unavailable witness, captive, remote hand-in, teleport, reward or producer.

**Owner and surfaces:** one Luna writer for the named W06 or CT packet at a
time; parent integrates producers and transaction boundary; Sol reviews the
frozen domain and content mapping. An independent Luna writer may draft
additional content only after CT contract and scene schema freeze, with
isolated authored-data paths.

**Entry/readiness:** Phase 2 provides real company, world, account binding,
consumer readiness and encounter authority required by the selected contract.
**Done:** one real instance proceeds through its actual issuer and world effects
to source-bound objective evidence; save/reload preserves the same instance,
state and privacy. Prove causal and failure/retry behavior at owning public
boundaries. Phase 4 produces and consumes physical proof to complete the first
vertical slice. **Failure/rework:** missing producer stays blocked and visible;
repair that source owner before content duplication. Any changed rule
returns to the canonical owner source, not a local implementation guess.

### Phase 4 — physical two-company PvE, proof, consequences and full execution

**Player outcome:** a second present, consenting company physically joins one
shared PvE encounter; the actual bearer presents eligible proof once. The
terminal result durably applies item/world/life consequences; later eligible
presentation atomically records lawful payment and its receipt once, followed
by save and re-entry.

**Packets:** JOIN01–JOIN03 transfer the actual world/encounter writer, bind
the owner company and one opt-in second company by presence and accepted terms,
and release proof/apply terminal effects atomically. CT04–CT06 cover accessible
hunt/rescue proof and custody, using those actual physical producers. Integrate G10,
C08, E05, F01's genuine producer/content/consent/reload/privacy, D02 and full
I02 according to their canonical predecessors; keep I02's entire I01 + F01 +
D02 contract. RT and H command handlers remain real and fail closed. Reconcile
items, exact money, custody, leadership/loss, knowledge and receipts in their
actual owners.

**Owner and surfaces:** parent owns the shared transaction, root/schema, JOIN
integration and race/privacy fixtures. One writer owns a frozen JOIN or
contract/domain packet; Sol reviews exact frozen tree read-only. No parallel
writer may touch the shared effect API, migration, executor or transaction.

**Entry/readiness:** Phase 3's accepted contract and objective evidence exist;
Phase 4 produces the physical terminal proof. Real physical actors and company
authority are ready, with the shared transaction/schema contract frozen by the
parent. **Done:** CT04–CT06 establish accessible proof, and two browser sessions
prove actual presence/opt-in and physical participation; unauthorized/remote or
duplicate bearer claims reject atomically; the whole declared reward is paid
once; transaction rollback, replay, competing claims/commands, privacy and
same-world re-entry are exercised through real durable boundaries. **Failure/
rework:** any orphaned effect, double claim, hidden-fact leak or partial commit
blocks activation; repair at the true shared owner and repeat the race/crash/
privacy case. A prepared single-company H transaction or PB diagnostic battle
does not pass JOIN.

### Phase 5 — content-complete UI, art and repeatable production pipeline

**Player outcome:** the complete initial region and authored contract set can be
played through the honest UI with coherent original art, clear states and
consistent evidence, not just the first vertical journey.

**Packets:** complete CT07 as part of finishing all eight instances across HUNT/INVESTIGATE/RESCUE, three
templates, eleven scenes, four reusable backgrounds, six portraits, two trophy
images and three enemy archetypes, including «Когда молчит мельница». Finish
UI01–UI06 and ART02–ART07 integrations and source/licensing/provenance records.
Create a second comparable authored/playable unit from the frozen schemas and
record authoring timing separately from local review, rework, integration and
blocked time alongside the first unit.
Do not copy provisional values into brittle acceptance tests or generate the
missing archive catalogue.

**Owner and surfaces:** content/assets use explicitly isolated authored-data
and asset paths after contracts freeze; one writer per packet; parent integrates
and selects visuals under the accepted ART decision. Reviewer is Sol after each
frozen packet. UI composition and shared theme/export files have one named
writer at a time.

**Entry/readiness:** the first authentic contract and physical JOIN are accepted;
the data, scene, actor and licensing schemas are frozen. CT07 is completed
within this phase. **Done:** exact content
counts and meaningful source review are satisfied; every advertised control
maps to real commands/results; all loading, rejection, retry, loss, proof,
payment and re-entry states work in the integrated browser; second comparable
unit records actual iteration evidence. **Failure/rework:** contract/schema
defects return to the responsible packet before further production; missing or
unlicensed assets do not count; repeated unit shows the pipeline is not yet
repeatable, so fix the measured rework source before claiming content complete.

### Phase 6 — clean alpha acceptance and owner playtest

**Player outcome:** the owner can start the alpha locally, complete and recover
from the full journey, and understand its goals, outcomes and limits.

**Packets:** QA00–QA05 and M1-ACCEPT. QA00 prepares the real browser runner,
trace capture, ports and disposable DB. QA01 documents one verified local
startup and manual guide only after integrated services start. QA02 runs the
two-browser full journey and failure/retry paths. QA03 exercises actual process
crashes, concurrent commands/claims and recovery. QA04 measures privacy,
input limits and renderer behavior on the named Mac. QA05 records owner Mac
playtest, comprehension and turn evidence. Then run the exact clean-tree final
gate once: `pnpm verify`, `pnpm test:combat:stress`, `pnpm test:migrations`.

**Owner and surfaces:** parent owns the disposable environment, orchestration,
full-tree gate and evidence ledger. QA author owns only the assigned runner or
guide files; one writer per path. Sol reviews exact final tree and evidence
packet; owner acceptance is the final gameplay decision.

**Entry/readiness:** Phases 0–5 are accepted on the exact candidate tree and a
runnable local integration exists. **Done:** hashes/tree, commands/outcomes,
browser actors, persistence/restart, race/privacy, named Mac renderer and owner
playtest results are recorded; no required gate is called complete from a mock
or a different tree. **Failure/rework:** report runner failures/skips as
`NOT_RUN`; fix the responsible owner and repeat affected evidence. Any source
change invalidating final-tree evidence requires the appropriate gate again.
Stop only at actual M1-ACCEPT; keep deployment, paid provisioning and M2 out of
this plan.

## Acceptance evidence matrix

| Evidence lane | Must show | Evidence owner / boundary | Does not substitute for |
| --- | --- | --- | --- |
| Functional journey | Same account/company; travel; authentic contract; physical two-company PvE; bearer proof; one lawful reward and consequences; save/re-entry; rejection/retry/loss states | QA02; real browser/API authority and exact integrated tree | Pure preparation, mocked UI, PB disposable battle, isolated green branch |
| Content and story | Accepted sources and authored provenance; 8 instances, 3 types/templates as indexed, 11 scenes, 4 backgrounds, 6 portraits, 2 trophies, 3 archetypes; chain «Когда молчит мельница» | Content packet review against canonical cards and actual integrated assets | Recreated ZIP catalogue, raw counts without usability/source review, provisional-value snapshots |
| Visual and device | Same-scene renderer comparison, selected ART decision, licensed original direction; named-Mac browser behavior and measured performance/comprehension | ART evidence plus QA04/QA05 screenshots/traces and owner observations | Headless test, screenshot alone, another machine's FPS, unmeasured capacity |
| Durability and privacy | Real PostgreSQL atomic commit/rollback, idempotency, replay, competing actions/claims, process restart, tenant isolation, public/private knowledge boundary | H/JOIN/QA02–QA04 against real services and disposable data | Health endpoint, in-memory reload, mocks, migration smoke alone |
| Human feedback | Owner can explain goal/actions/outcome and complete/recover from full journey; capture confusion, turn timing and revisions | QA05 owner Mac playtest with recorded scenario and actual observations | Agent opinion, unrun guide, comprehension inferred from completion or test pass |

All evidence records must identify exact source, tree, actor/setup, command or
scenario, outcome and limitation. Tests remain small public-invariant checks;
do not add one per helper or replace gameplay proof with structural snapshots.

## Research used for sequencing

| Practitioner claim | Application here | Limit |
| --- | --- | --- |
| Rami Ismail, [Milestones](https://ltpf.ramiismail.com/milestones/) (2022-11-30): prototype tests viability; a vertical slice tests the full pipeline at representative fidelity; complete features before scaling content. | Prove one persistent journey and a coherent UI/art slice before multiplying all content. | One practitioner article, not a Warwrit product decision or duration estimate. |
| Rami Ismail, [Prototypes and vertical slice](https://ltpf.ramiismail.com/prototypes-and-vertical-slice/) (2022-09-26): repeat a comparable unit and compare its duration. | Record first and second comparable unit timing. Review, rework, integration and blocked time are local adaptation measures, not attributed to this source. | Same practitioner, not independent empirical research; do not import calendar, budget or throughput estimates. |

The checked Codex workflow sources and their limits are summarized in
[CODEX_GAME_DEVELOPMENT_2026-09-30.md](research/CODEX_GAME_DEVELOPMENT_2026-09-30.md).

# M1 story missions — B4, 2026-10-07

## Authority and current boundary

Contract: [B4](../engineering/briefs/2026-10-07/B4-story-missions.md),
[00-common](../engineering/briefs/2026-10-07/00-common.md) and AGENTS.md.
Owner decision, 2026-10-07, verbatim **«Одобряю»**: revision 6 of
[«Кто выдал тайник»](../wiki/world/porechye.md#кто-выдал-тайник)
at `874b8fc` is approved. **AC-1 PASS**; the story text is approved. The October 8 owner decision fixes the E01 reward
at 40 crowns. Gameplay implementation and funding verification remain separate.

Current status: IN_PROGRESS / LOCAL. Core, persistent server and interface are
implemented, with the native E01 journey checked. Funding verification belongs to T033, implementation
to T034. Delivery permissions follow AGENTS.md and the owning mission.

## First playable result

After Senka is delivered and the following night ends, a company standing
at Severny Dvor opens Kondrat's story offer from the existing place view.
It questions the three people, recognises the patched sack, compares
Senka's timing with Ulita's explanation, obtains her confession and confirms
an accusation. The journal survives reload. A proven answer and a false
accusation produce different endings in separate local test worlds.

Use the approved manuscript as the player-text source; do not rewrite it
to fit an adapter. No new mill visit, combat, herb resolution, services,
actionable follow-up contracts or extra witnesses. Existing M1 contracts,
their rewards, V1 content and B1/B3 modules remain unchanged.

## Write set and integration

- `packages/game-core/src/story/**`, plus public exports: immutable definition,
  model, guards, preparation/reducer, private projection and validator.
- `apps/server/src/story/**`, plus minimal route registration: authenticated
  commands, reads and transactional persistence.
- A new ordered up/down migration and database table typings for story state
  and receipts; never edit a released migration or change company serialization.
- `apps/web/src/game/Story*.tsx`, minimal GameShell/App hook-up and existing
  place context; `apps/web/src/i18n/story.ru.ts` / `story.en.ts`, with one
  registration spread each in ru.ts/en.ts.
- Directly required consumer/test files are authorized by the continuation
  request; list actual paths at implementation closeout.
- This page and the B4 section of Porechye. Parent owns CHANGELOG, CURRENT_PLAN,
  wiki index/log and AGENTS; supply exact additive entries in the handoff.

## Finite data model

One mission, `sm.m1.cache-disclosure.01`, authored definition version 1.
Scene IDs retain S00–S04/S06–S08, ending IDs E01–E03 and late variants L-E01,
L-E02, L-E03. **S05 is intentionally absent.** Choice IDs are stable per
scene; catalogue keys use `story.<mission-id>.<scene-id>.<line-or-choice-id>`.
Definition IDs and version identify data, not runtime balance approval.

The serializable definition owns:

- The immutable truth: Ulita disclosed the cache for Obukh's promise;
  Obukh took the grain, retained Petrus and left the patched sack as mock
  payment; Petrus later escaped wounded. Kondrat's tax lie and Senka's
  bread-trip lie are separate. Truth is author/validator data, never sent
  as a client catalogue, hidden answer or unexplored finding.
- Scenes: place, speaker, ordered line IDs, finite conditional variants,
  choices, required known facts and destination/effect. Guards use explicit
  fact IDs and mission status, not a scripting language or executable prose.
- Findings F01–F11: kind (observation/testimony), source actor or observed
  object/place, producing choice and prerequisites. Their content is the
  approved finding table, not a second editable narrative.
- Outcomes: accused actor, whether proved, categorical consequences and
  payout eligibility. E01 pays the approved 40 crowns after D1 verifies the real funding source
  and the transaction commits. Unpaid and unproved outcomes retain their own policy.

Persisted world state owns the mission revision, definition version,
eligibility source and at most one terminal outcome. A terminal outcome
records E01/E02/E03, accused actor, `proven`, finishing company, command/source
ID and tick, plus approved public consequences. It never contains that
company's testimony or journal. No numeric reputation is added.

Persisted company state is keyed by world, mission and authenticated company:
revision, accepted status, current scene, pending accusation, personally met
actors and learned facts. Each fact retains fact ID, source, scene/choice,
command/source-event ID and learned-at tick. Historical event timing in F06/F09
is distinct from the time the company learned it. First learning is retained;
repeat dialogue neither duplicates a fact nor changes its original attribution.

A projection contains only the requesting company's journal, current visible
dialogue and available choices, plus public mission availability/outcome.
Knowing an actor's name is not meeting them. An immutable definition containing
all answers is not an acceptable substitute for that projection.

## Scenes, knowledge and outcomes

All investigation scenes use `severny-dvor-yard`. Senka's position and Ulita's
threshold are narrative panels there, not new world locations or buildings.

| Scene | Condition / meaningful action                            | Knowledge or transition                                                                                                      |
| ----- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| S00   | Rescue delivered; following night ended; world case open | Rescuer/nonrescuer line from delivery company ID; accept or defer; personally meet Kondrat, not the two people named by him. |
| S01   | Accepted; question Kondrat / ask about sacks             | Learn F01; optional tax claim F02 and receipt comparison F03 after F02.                                                      |
| S02   | Accepted; question Senka                                 | Meet Senka; F04 and optional bread question F05; wages remain a narrative promise, not a finance action.                     |
| S03   | Accepted; question Ulita                                 | Meet Ulita; staged refusal/groan/question gives F06; F01 enables sack observation F07, then her explanation F08.             |
| S04   | F08 known; return to Senka                               | F09: sack already at her door on his return day, before Petrus came home.                                                    |
| S06   | F01 and F06–F09 known                                    | Confront Ulita; F10 (Obukh left sack), then separate question for F11 (disclosure/bargain).                                  |
| S07   | Accepted; company at Kondrat                             | Offer only personally met suspects; select, warn, then separately confirm or return.                                         |
| S08   | Ulita selected without complete proof                    | Conditional argument from strongest known clue; case remains open, with no payout or consequences.                           |

Navigation permits reordered first interviews and repeated questioning under
the same guards. Leaving a panel never closes the case. Facts are awarded by
the acknowledged dialogue/inspection action, not visiting a URL or rendering
a line whose conditions are not satisfied. F02–F05 are optional false trails;
the validator must allow the proven path without them.

E01 requires **F01 + F06–F11**, personally met Ulita and explicit confirmation.
The sack alone, chronology alone or F10 without F11 cannot prove disclosure.
E02 confirms Senka: no payment, public unproved accusation, Kondrat dismisses
him after losing trust with the grain key; Senka admits the bread trip (F05)
to the finishing company if not already known. E03 confirms Kondrat: no
payment; Kondrat refuses Senka's promised wages and Senka voluntarily leaves.
Even a company knowing F11 may choose E02/E03; truth never changes.

E01 leaves Senka at the barn and ends Ulita's grain work; Ulita/Petrus remain
home privately. Public closure reports the accusation and public consequences,
not a globally exposed confession. E02/E03 never label the accused as the
established culprit. Finishing-company journal variants retain private facts.

Late entrants see L-E01/E02/E03 and prose follow-up hooks, not an Accept
button for nonexistent work. A company with an already open panel loses a
concurrent final-confirmation race to the same late entry, without another
payout or repeated dismissal. Its own prior journal stays private and retained;
a fresh company receives none of it, including sack, son or rescue findings.

## Pure preparation and validator

Preparation takes an immutable definition, world state, that company's state,
command and explicit context: company ID, authoritative stationary place,
clock tick/phase, rescue delivery source and expected revisions. No I/O,
implicit time/randomness, server import or runtime dependency in game-core.

Finite commands: accept, navigate/interview choice, select accusation, confirm
and return. Rejected commands return a code with no changed state/effects.
Prepared commands return new states and finite persistence effects, including
payout eligibility only for E01. All guards are rechecked on confirmation;
the client cannot submit facts, a proof flag, reward, truth or consequences.
Repeated identical input yields identical output; no in-place mutation.

The validator checks IDs/references, fact prerequisites, legal scenes/actors,
terminal outcomes and truth/proof consistency. It explores the **actual command
guards and effects** from the initial offered state through acceptance, including met actors,
fact subsets and confirmation, rather than merely walking destination links.
Reject unreachable declared scenes, missing/unreachable E01–E03, a proof path
without F01/F06–F11, and a wrong culprit with proven status or payout.
Seed late-entry checks from each reachable terminal world state. Collapse
repeat-dialogue cycles by finite semantic state; learned timestamps/revision
counters are not additional reachability states. No generic quest framework.

## Server and persistence boundary

The rescue prerequisite is the established SUCCESS delivery of
`ci.m1.mill-worker.01`, including delivery company and tick. Read only the
required eligibility/attribution from existing persistence; do not copy
its private evidence. Derive the end of the following night using the existing
campaign clock, not wall time, browser time or a new duration constant.

Reads and writes authenticate the company owner, world membership and actual
stationary party at Severny Dvor. A remote place preview has no story-command
authority. A request actor string, revision token or receipt ID is not identity.

Use separate story world, company and receipt tables, keyed by world/mission
and company as appropriate. One database transaction locks the authoritative
world row and company records in a consistent order, reads current clock/place,
prepares the command, and persists states/effects with revision checks. A
unique command receipt retains request identity and response. Replay matching
receipts **before stale-revision rejection**; conflicting reuse is rejected.
No failed guard, insufficient funds or failed write leaves facts, closure,
money or consequences partially applied.

Final confirmation serializes on the world mission row. The winner closes it
once; the loser receives the public late state. On E01, lock/check/debit the
approved existing issuer funds and credit the authenticated company in the
same transaction with closure/receipt/audit. The existing
`persistContractRewardPayment` credits the company but **does not debit the
issuer row**; it cannot establish conservation alone. Settle stationary upkeep
through the existing server boundary before deriving the credited company.
No refresh, retry or new company replenishes an issuer wallet.

Persist categorical story consequences with the outcome and derive story/place
presentation from them. Do not mutate the completed rescue or fabricate a
Senka party, wage transfer, destination arrival, reputation number or new
NPC schedule. Ordinary contract/finance consumers are reused only through
their existing public/server boundary, without B1/B3 changes.

## UI and text

Shortest integration: an available story entry beside existing contracts in
the physically accessible place view, opening Story panels over the current
yard art. Shared location, speaker portrait, dialogue, guarded choices,
finding journal and confirmation stay in one desktop layout. Use the existing
portrait treatment. Check a new portrait in one consuming-scene sample against
the selected style and actual display scale before expanding the batch.

Server acknowledgement determines learned facts, available choices and the
terminal screen. Refresh after conflicts; failed commands keep an actionable
scene and never show a paid ending. Display the approved fixed amount visibly
before acceptance after funding verification in T033. Journal source/time are explicit;
catalogues translate line IDs, not authoritative state or invented conclusions.
Reuse the approved RU/EN player order, optional branches, confirmations and
late variants; parameters only, no concatenated sentences.

Day/night use existing place art/light. Preserve map controls, readable targets,
keyboard focus, return/Escape and remote-preview restrictions. Mobile stays
the desktop interface scaled in landscape, with no portrait/reflow scope.

<a id="d1-proven-payment--owner-decision-required"></a>

## D1 — proven payment

The owner decision recorded on October 8 fixes the E01 reward at 40 crowns
(`40000000 q`). Its source is the named B4 reward decision in
[the recorded owner decision](../engineering/CURRENT_PLAN_HISTORY_2026-11-08.md#b4-reward-40-crowns).

T033 verifies the actual issuer wallet and available funds before paid activation.
The existing Kondrat wallet is `wallet.steward.severny-dvor.01`; its balance
and applicability are verified through the real persistent boundary. Do not mint
extra genesis money or infer available funds from a hypothetical post-rescue balance.
The transaction locks the actual wallet and commits payment with the terminal
mission outcome and receipt. E02/E03 and unproved Ulita have no reward.

## Ordered delivery and acceptance

| Step               | Done criterion                                                                                         | Current result                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1 — story          | Manuscript text ACCEPT and owner AC-1 approval                                                         | PASS; owner «Одобряю» for revision 6 at `874b8fc`.                       |
| 2 — contract       | Model, guards/choices/outcomes, reducer, persistence, UI and AC recorded; documentation checks; commit | Contract specified. Reward fixed at 40 crowns, funding verified by T033. |
| 3 — core           | Model/reducer/validator; focused invariant tests; lint/format; commit                                  | Focused tests and types PASS locally. |
| 4 — server/web     | Authenticated persistent playable scenes, journal and accusation; focused checks; commit               | SQL6, interface tests and native E01 PASS locally. |
| 5 — player journey | Play proven and false endings; verify final text and presentation; focused checks; delivery record     | E01 passed. Native false ending and final portraits remain open. |

| Brief AC | Direct evidence required                                                                                            | Current result                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| AC-1     | Approval quote and approved story revision                                                                          | PASS: «Одобряю», 2026-10-07, revision 6, `874b8fc`.    |
| AC-2     | Running-game offer → interviews → confirmation → E01 and a wrong ending, captures                                   | Native E01 and reload PASS. Wrong ending browser NOT_RUN. |
| AC-3     | Public-boundary tests: only personally met suspects; incomplete proof never pays; E02/E03 never pay                 | Focused core and real PG checks PASS. |
| AC-4     | Two authenticated companies: private findings isolated before/after closure and reload; late public projection only | Real PG private journals/concurrent finish PASS. Native second company NOT_RUN. |
| AC-5     | Validator tests reject unreachable scenes, missing/unreachable endings and inconsistent truth/payment               | Focused validator tests PASS. |
| AC-6     | Final in-game RU/EN text matches the accepted manuscript, with meaning, logic and flow reviewed                     | RU E01 route read in game. Choice labels and disclosure timing corrected. EN browser NOT_RUN. |
| AC-7     | Integrated panel and portraits are readable by day/night and follow selected references                             | Day interviews/night E01 inspected. Portraits still use initials and remain unfinished. |

Additional targeted checks: deterministic rejection/preparation without mutation;
same-command retry once; conflicting retry rejection; concurrent confirmations
one winner; issuer/company conservation and rollback; reload at partial
investigation and pending accusation; rescuer/nonrescuer offer and following-night
eligibility; wrong E02 after F11 retains private confession. No test-count,
coverage target or catalogue snapshots.

Use focused checks for concrete changed behavior under AGENTS.md.
Record actual results and skipped checks in the acceptance matrix.
Play in actual authenticated game worlds, not a story-only diagnostic.
Take the atomic game-stack `mkdir` lock before db/dev; own .env from
.env.example with standard ports; hold at most 45 minutes, then stop own dev,
db:down and remove the lock. Preserve player storage and other worktrees.

Independent code, text and visual critique is optional under AGENTS.md.
When used, give the reviewer the scoped changes and applicable player/reference
material. Resolve concrete defects in logic, access, money, saved state and
readability through focused checks. Record actual findings and fixes in this
contract. Gameplay acceptance follows the criteria above and the owner's result.

## Step-2 result and limits — 2026-10-07

Current checks for gameplay implementation, persistence and scene journeys:
NOT_RUN in this documentation normalization. Balance and enjoyment: NOT_MEASURED.
Next action: T033 verifies funding, then T034 implements and exercises the accepted
story through its public entry points. Record evidence against the matrix above.

## Funding check — 2026-11-15

T033 complete, LOCAL. A separate executor transactionally restored the retained
successful N02 dump into the owned `warwrit-m1-20261115` PostgreSQL17 project,
database `m1_completion`. Read-only canonical inspection confirmed world
`world.porechye.atlas-v1`, company `eb855f6f-ab02-42ca-9eef-a82b2c6830bf`,
SUCCESS mill-worker revision5 and the actual issuer
`wallet.steward.severny-dvor.01` with `wallet_q = 80000000` (80 crowns).
The approved B4 reward is `40000000` q. This verifies current funds in this
restored test world. T034 must recheck and debit the locked issuer row in the
same transaction as the story outcome, company credit and receipts.
`persistContractRewardPayment` owns the company credit and does not debit the
issuer row. No B4 activation or reward was performed by this funding check.
Sanitized local evidence is in the restore worktree's ignored
`output/restore-provenance.json`; source dump and original databases were retained.

## Implementation checkpoint — 2026-11-15

IN_PROGRESS / LOCAL on `codex/m1-completion-20261115`. Pure story definition,
private journals, guarded commands, shared endings and strict readers are
implemented. Eleven focused story/public-export tests and core typecheck passed.
A review correction makes Ulita's grain answer visible only after the company
actually asks that question. The later confession also remains hidden until its
question. Initial dialogue explains the groan before asking who is behind the door.
Accusation and confirmation buttons now resolve their scene-specific labels.
The final source-focused story/interface/surrender run passed 20 tests, with web
typecheck passing.

T034 stays open for the native wrong-ending route and final portrait/presentation
checks recorded in the matrix above.

The server now has authenticated reads/commands, private journals, frozen delivery
clock provenance and transactional issuer debit/company credit. Migration 0026
was applied on the owned restored copy after correcting its new account foreign
key to UUID. Six PostgreSQL cases passed on author revision `eb15a6a0`, covering
auth/private knowledge, E01 funds, E02, rollback, exact replay after movement,
conflicting replay, concurrent finish and availability integrity. Integration
verification passed all six story cases together with26 encounter cases.
The migration launcher passed up/down and retained-story rollback protection
on its disposable database.

The ordinary Severny Dvor interface completed E01 with the retained company
`eb855f6f-ab02-42ca-9eef-a82b2c6830bf`. Interviews, patched-sack inspection,
timing comparison, confession and final confirmation used visible game controls.
The first payout attempt exposed a stationary catch-up mistakenly using strict
departure food rules. The shared helper now records actual stationary shortfall
before payment. The same confirmation then succeeded with 846→886 company crowns,
80→40 issuer crowns and exactly one paid story receipt. Reload and reopening
retain E01, ten personal findings and 886 crowns. Native artifacts are retained
under `output/playwright/m1-b4-*`.

New delivery receipts retain exact simulation time. Compatible legacy receipts
with a known zero QA offset use their wall timestamp. A legacy receipt with an
unknown nonzero historical offset becomes eligible only after one full real
Light cycle has elapsed, with its first proven availability anchor persisted.
The earlier anchor is preserved on subsequent reads.

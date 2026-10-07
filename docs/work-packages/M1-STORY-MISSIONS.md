# M1 story missions — B4, 2026-10-07

## Authority and current boundary

Contract: [B4](../engineering/briefs/2026-10-07/B4-story-missions.md),
[00-common](../engineering/briefs/2026-10-07/00-common.md) and AGENTS.md.
Owner decision, 2026-10-07, verbatim **«Одобряю»**: revision 6 of
[«Кто выдал тайник»](../wiki/world/porechye.md#кто-выдал-тайник--2026-10-07)
at `874b8fc` is approved. **AC-1 PASS**; approval covers that story, not
an unspecified reward amount or completed gameplay.

Single writer: `codex/b4-story-missions`, worktree
`/Users/vovanostm/.codex/worktrees/b4-story-missions`; base
`b7ffefcdfa699d2feb587059eb926480ae891dcb` after PR #152.
Step 2 is documentation only. Steps 3–5 are **NOT_RUN**, awaiting D1 below.
No publication, PR, merge or deployment is authorized.

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
  payout eligibility. The amount remains unset until D1; no zero-value
  placeholder may activate a mission whose ending says it paid.

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
portrait treatment; any new portrait first needs visual ACCEPT on one sample.
Do not introduce a new art pipeline or generate a batch before that acceptance.

Server acknowledgement determines learned facts, available choices and the
terminal screen. Refresh after conflicts; failed commands keep an actionable
scene and never show a paid ending. Display the approved fixed amount visibly
before acceptance once D1 is resolved. Journal source/time are explicit;
catalogues translate line IDs, not authoritative state or invented conclusions.
Reuse the approved RU/EN player order, optional branches, confirmations and
late variants; parameters only, no concatenated sentences.

Day/night use existing place art/light. Preserve map controls, readable targets,
keyboard focus, return/Escape and remote-preview restrictions. Mobile stays
the desktop interface scaled in landscape, with no portrait/reflow scope.

## D1: proven payment — owner decision required

The story says Kondrat pays once for E01, but assigns no amount. The
[ordinary payout decision](../content/CONTRACTS_M1_DERIVATIVE.md#owner-decision--ordinary-payouts-2026-10-02)
requires a fixed visible funded reward. Its approved 40-crown investigation
profiles name `road-tracks` and `missing-herbs`; the bounded seven-instance
profile does not assign B4's new reward. Under common §8, do not silently
extend those balance numbers or activate an unpaid E01.

**Recommended proposal, not approved:** 40 crowns (`40000000 q`) for E01 only,
debited from Kondrat's existing `wallet.steward.severny-dvor.01` funding in the
`ci.m1.mill-worker.01` row; no additional genesis funds. The current rescue
profile initializes 160 crowns and pays 80. An untouched post-rescue balance
would therefore be 80, but actual locked funds, not that arithmetic, authorize
payment. E02/E03 and unproved Ulita receive nothing. No numeric trust changes.

Options: approve this amount/source (recommended); specify another fixed amount
and funding source; defer B4. This is the only current owner decision blocker.
Implementation, tests and runtime may resume after the decision is recorded;
the story approval is already complete and need not be requested again.

## Ordered delivery and acceptance

| Step                | Done criterion                                                                                         | Current result                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1 — story           | Manuscript text ACCEPT and owner AC-1 approval                                                         | PASS; owner «Одобряю» for revision 6 at `874b8fc`.                               |
| 2 — contract        | Model, guards/choices/outcomes, reducer, persistence, UI and AC recorded; documentation checks; commit | Documentation complete; checks below; D1 remains a separate implementation gate. |
| 3 — core            | Model/reducer/validator; focused invariant tests; lint/format; commit                                  | NOT_RUN, pending D1.                                                             |
| 4 — server/web      | Authenticated persistent playable scenes, journal and accusation; focused checks; commit               | NOT_RUN.                                                                         |
| 5 — journey/critics | Play proven and false endings; final critics ACCEPT; final checks; commit/handoff                      | NOT_RUN.                                                                         |

| Brief AC | Direct evidence required                                                                                            | Current result                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| AC-1     | Approval quote and approved story revision                                                                          | PASS: «Одобряю», 2026-10-07, revision 6, `874b8fc`.                |
| AC-2     | Running-game offer → interviews → confirmation → E01 and a wrong ending, captures                                   | NOT_RUN.                                                           |
| AC-3     | Public-boundary tests: only personally met suspects; incomplete proof never pays; E02/E03 never pay                 | NOT_RUN.                                                           |
| AC-4     | Two authenticated companies: private findings isolated before/after closure and reload; late public projection only | NOT_RUN.                                                           |
| AC-5     | Validator tests reject unreachable scenes, missing/unreachable endings and inconsistent truth/payment               | NOT_RUN.                                                           |
| AC-6     | Full final in-game RU/EN text critic ACCEPT                                                                         | NOT_RUN; manuscript-only historical ACCEPT scores 2/3/2/2/3/3/2/2. |
| AC-7     | Integrated panel/portraits day/night visual critic ACCEPT                                                           | NOT_RUN.                                                           |

Additional targeted checks: deterministic rejection/preparation without mutation;
same-command retry once; conflicting retry rejection; concurrent confirmations
one winner; issuer/company conservation and rollback; reload at partial
investigation and pending accusation; rescuer/nonrescuer offer and following-night
eligibility; wrong E02 after F11 retains private confession. No test-count,
coverage target or catalogue snapshots.

Use common §6 focused commands for each code step, sequentially. Step 5 runs
the final typecheck/unit gate once, plus migration checks when persistence is
added. Play in actual authenticated game worlds, not a story-only diagnostic.
Take the atomic game-stack `mkdir` lock before db/dev; own .env from
.env.example with standard ports; hold at most 45 minutes, then stop own dev,
db:down and remove the lock. Preserve player storage and other worktrees.

Fresh independent critique allowance: three rounds each for code/journey
reviewer, final text critic and visual critic; reuse each read-only critic.
Provide frozen diff/test outputs, full RU/EN player order/mechanics and actual
journey/reference/day/night images, not author conclusions. Any criterion
stuck at 1 or below twice requires an approach change. Record full rounds;
no ACCEPT after round three is a common §8 stop.

## Step-2 result and limits — 2026-10-07

This page records the finite engineering contract and D1; Porechye records
the exact story approval without changing accepted player text. Initial Prettier
check: **FAIL** on this new page's table formatting; corrected with Prettier.
Final Prettier for both changed documents, local tracked links and
`git diff --check`: **PASS**.
Scoped diff and updated sections read back. Logs stay local under `output/B4/`.
Code/tests/typecheck/build/migrations/new critics/runtime/journey: **NOT_RUN**,
documentation-only proportional verification. Normal Markdown commit skips
the code audit: **NOT_RUN**, not a bypass or a code-quality acceptance.
Balance/game enjoyment: **NOT_MEASURED**. No stack lock or player-state writes.

Local branch only, **NOT_MERGED**. Parent-owned files are untouched; exact
CHANGELOG/CURRENT_PLAN additions and the consolidated D1 question are in
`output/B4/step-2-handoff.md`. One next step: owner decides D1, then the single
B4 writer implements step 3 without reopening AC-1.

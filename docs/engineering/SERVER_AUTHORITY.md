# WLC-04 — Server-authoritative state

2026-11-07; coordinator/writer `codex/wlc-04-server-authority`,
`.claude/worktrees/wlc-04`; implementation base `43a2ff60`.
Owner requests implementation, publication, merge and local main update.
No deployment or mutation of retained player saves is authorized by this task.
WLC-01/PR419, WLC-02/PR420 and WLC-03/PR421 are present in the base.

## Player journey and contract

The player equips an owned item, pitches/ends camp, moves, fights and presents
server-earned proof. The browser sends intent; authentication resolves the account,
server ownership/admission resolves company/world/encounter, domain rules prepare
changes and a database transaction commits state, receipt and events. Only a
subsequent server projection changes the displayed game facts. Previews, animation,
interpolated map positions and local drafts cannot commit a fact.

For equipment/camp, save the exact command before sending. A lost, malformed or
unauthenticated reply leaves it pending, blocks replacement and offers exact retry
across reload/re-entry. Retry uses the same ID, revision and body; the existing
company executor answers its receipt before checking fresh revision/time. On a
matching authoritative terminal response, clear that attempt and refresh state.
Failure to read/save/clear storage must not silently release an uncertain command.
Account/company changes isolate attempts and late replies. No optimistic resource
or outcome mutation, new executor, balance change or serialization migration.

Continuous movement keeps its existing server pipeline and recovery. Only a
successful status/body pair may acknowledge movement; clear storage before releasing
the in-memory request so a failed removal retains exact retry. Combat, contracts,
care, payroll, transfer and recruitment retain their existing recovery pipelines.

## Mutation audit

Classification applies to actual effect, not a function/directory name.
`AUTHORITATIVE` changes durable facts; `PRESENTATION` renders server facts;
`PREVIEW` is an untrusted quote/draft; `DEBUG` is an isolated diagnostic session;
`LEGACY` would synthesize a canonical result in the browser.

| Operations                                              | Intent / presentation                                                                                           | Authoritative owner and persistence                                                                                                                                                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combat damage, movement, morale, wounds, death, retreat | `EncounterPanel`, `encounter/command-attempt`, `connection`, `battle-presentation`: PRESENTATION/PREVIEW        | `encounters/executor`, admission/access, terminal evidence/effects; game-core combat; encounter commands/events + company transaction                                                                                             |
| XP, attributes, talents, training                       | Company DTOs: PRESENTATION; lab rank/skill setup: DEBUG                                                         | Company executor allowlist; game-core practice/progression and trusted terminal evidence. No ordinary client endpoint accepts earned XP, death or arbitrary learning facts; unsupported training remains unavailable              |
| Money, wages, hire, upkeep                              | Payroll/Recruitment/Supply UI and scoped attempts: PRESENTATION/intents                                         | `company/routes`, `executor`, recruitment/supplies; exact money and PayClaims via company snapshot/receipt/audit transaction                                                                                                      |
| Inventory transfer, equipment, pickup, custody          | Transfer attempts and EquipItem intent; no local ownership application                                          | Company executor + physical domain; contract pickup executor consumes server proof. Equipment missing exact client retry is corrected here                                                                                        |
| Contract acceptance, outcomes, proof, rewards           | FirstHunt/ordinary contract attempts render server DTOs                                                         | `contracts/routes`, `executor`, ordinary runtime and terminal evidence; server proof/source identities and atomic world/company receipts. No simulated reward fallback found                                                      |
| World route, encounter, position, campaign time         | Travel/free/continuous movement intents; interpolation and light estimation: PRESENTATION; route quote: PREVIEW | `world/routes`, travel/free/continuous movement executors, clock/workers + company pipeline; persistent movement receipts. Camp missing exact client retry is corrected here                                                      |
| Reconnect, duplicates, lost reply                       | Scoped browser attempt storage contains intent, not saved game facts                                            | Auth + ownership before receipt replay; exact body collision rejection before fresh revision; database remains canonical across process restart                                                                                   |
| Succession choice                                       | `LeadershipChoice` posts candidate/mode; polls server decision                                                  | `encounters/leadership` stores a scoped `(encounter, company)` choice; server-generated command ID. This is a replaceable admission intent, not a local death/succession result; terminal worker applies domain consequences once |
| Playground / Combat Lab                                 | Editor seed, units, inventory, AI and session config: DEBUG                                                     | `combat-lab/routes` process-local capability-scoped Map; no company repository/payout path. Nonproduction/loopback/origin guards. Fixture admission is separately opt-in; company binding required for campaign effects           |
| Decorations / local settings                            | Ambient RNG, renderer motion, locale: PRESENTATION                                                              | No canonical write; retain                                                                                                                                                                                                        |

No production LEGACY result synthesis was found in the inspected main client.
This is a bounded source audit, not proof against arbitrary future browser code.
Architecture checks enforce dependency boundaries, not semantic absence of every
possible arithmetic write. Source and public-boundary regressions remain necessary.
The graph indexes the original dirty checkout, so current source is the fallback.

## Implementation and acceptance

- Reuse roster attempt storage/transport for EquipItem, BeginFieldCamp and
  EndFieldCamp; add one scoped hook and visible retry feedback in the ordinary App.
- Preserve movement pending state on storage cleanup failure and reject invalid
  HTTP acknowledgements. Add focused recovery regressions.
- Strengthen existing architecture checks for forbidden actual imports (including
  relative cross-workspace imports) and web server/database dependencies.
- Run focused client/server tests, relevant PostgreSQL combat/company/contracts/
  movement regressions, types and architecture checks. Exercise ordinary controls
  with lost-response/reload/retry on an exclusively owned disposable database.
- Independent read-only critique checks the affected journey and evidence before
  gameplay closeout. CI is advisory; full M1/art/performance acceptance is outside
  this architecture slice. Record actual checks and residual limits below.

## Results

Implementation complete on `codex/wlc-04-server-authority`; delivery PR owns live
publication/merge status. No server/domain serialization or schema changes.

- Equipment/camp reuse existing scoped roster attempt storage and transport;
  matching terminal replies trigger company projection refresh independently of
  a blocked travel refresh. HTTP403 retains the original attempt. The ordinary
  header offers a bordered retry control, including after reload/re-entry.
- Continuous movement requires a matching command ID on POST success/refusal,
  preserves unknown/unauthorized/5xx replies and storage-removal failures, and
  accepts matched known409/422 refusals. GET projections remain separate.
- Architecture checker now validates actual package imports, disallows relative
  cross-workspace imports and rejects production web imports of Node, pg, Kysely,
  server/domain/testkit. Its executable tiny-workspace regression is included in
  `pnpm check:architecture`. Test-only Node tooling stays allowed.

Actual checks on2026-11-07:

- Frozen install and public game-core/protocol/testkit builds PASS; web typecheck,
  scoped ESLint/Prettier and diff checks PASS; architecture regression/check PASS.
- 16focused client attempt/mounted recovery tests PASS. Another33focused existing
  config/terminal evidence/encounter recovery/contracts/payroll/care/supply checks
  PASS, one pre-existing terminal-evidence scenario SKIPPED (not accepted).
- Real PostgreSQL:57PASS across company executor/routes/recruitment, contract
  transition, continuous movement and encounter files. Each file used its own
  migrated disposable database; cleanup completed. Covers exact replay, changed
  body, stale revision, ownership, atomic rollback, receipt/state/projection,
  actual combat/terminal effects and reconnect/restart boundaries.
- Ordinary Chromium local-login journey on an exclusive disposable database:
  equipment POST committed then response aborted; unknown feedback, reload and
  identical-ID/body retry PASS. Camp start used the same real commit/lost reply/
  reload/retry path; normal camp end PASS. Each command has one SQL receipt.
- A second EndFieldCamp response was lost after commit, the owned API process was
  stopped/restarted, and browser reload/retry resolved its original receipt PASS.
  Initial reload raced server startup and displayed the existing connection-error
  screen; after readiness200, its ordinary recheck reopened the saved attempt.
- Browser sizes1440×1000 and1280×720; no fulfilled fake gameplay responses or SQL
  save preparation. Local quick login created the company through existing APIs.
  Ignored local screenshots/scripts/readbacks: `output/playwright/wlc-04/`.
- Independent read-only code reviewer found three issues (movement reply identity,
  skipped company readback during travel, conflated readback/command failure);
  fixed all three and obtained source ACCEPT on the corrected diff. Browser/SQL
  actions remain author-owned evidence, not independent replay.
- Independent visual critic inspected current camp/restart screenshots: no control
  obstruction; affected readability/retry/layout scored3/3,3/3,2/3. Full artistic
  certification remains BLOCKED on missing paired reference sheets/night views;
  those are outside this unchanged-scene controls slice, not a new art defect.

Initial web types failed on a callback return type/test action discriminator and
then a narrowed mutable variable; corrected, final PASS. The architecture check
initially flagged legitimate test-only Node imports; scoped production guard
corrected, final PASS. New movement fixture initially omitted POST command ID;
corrected to the real contract, all16tests PASS. Browser wrapper needed an owned
npm cache; no global cache ownership was modified. A receipt inspection initially
queried a nonexistent table; corrected to the existing `company_receipts` shape.

Full suite, coverage and hosted CI acceptance NOT_RUN; CI is advisory. Broader
M1/art/day-night/motion/performance acceptance is not established by this slice.
No deployment, balance change or retained-player data modification.

# N11 — Durable commands, crash recovery and backup restore

## Current status — 2026-11-16

LOCAL / COMPLETE. DUR-1 through DUR-6 meet their recorded criteria. R1–R4 have
applicable real-PostgreSQL boundary, concurrency or exact-retry evidence below;
RPO/RTO and capacity remain `NOT_MEASURED`. A current consistent 17.11 dump
restored into a fresh separate database with exact schema and full table/value
equality before any app writer connected. The fresh target then passed a normal
Dex login, one lawful item transfer with a lost response and same-transfer retry,
canonical readback and reversal through the existing isolated runtime. Source
command receipts for both new target commands remain absent, and source owner /
helper balances match the coordinated baseline. R5's playable continuation and
DUR-4 / SC-008 evidence are recorded below. DUR-2's restarted helper route and
public UI uncertain-outcome retry are both verified.

## Earlier status — 2026-11-08

SPECIFIED / LOCAL. WLC-08 reports real lost PRESENT reply, travel/API-battle restart
and preserved 17 data groups on its candidate. Broader commit-boundary/concurrent
claim and actual backup/restore coverage remain to reconcile, not assume absent.
Next: map current evidence to existing #393–#397 and perform one missing boundary.
[Common contract](COMMON.md). [Prompt](prompts/11-durability.md).

## R2 terminal recovery evidence — 2026-11-16

LOCAL. A focused real-PostgreSQL scenario persists a terminal company victory with
the owner’s leader dead, then closes the app and reopens a fresh DB handle, app and
worker. The worker leaves effects pending until the owner records a permanent
successor. An injected world update failure rolls back company snapshots and leaves
the applied marker unset; after another app/worker restart the saved effect applies
once, promotes the successor, preserves the deceased leader, releases both company
bindings and writes one terminal receipt per company. A second apply is a no-op and
the encounter replay verifies.

The new leadership recovery case and the existing settled wolf retreat/repeat case
both pass individually in `apps/server/src/encounters/postgres.integration.test.ts`;
the latter retains its original retreated-survivor assertions. Prettier, server
typecheck and `git diff --check` pass. The full integration file was `NOT_RUN`.
This scenario does not by itself prove an OS process restart, R1/R3–R5 or full T029.
It is focused R2 evidence, not completion of N11 or T029.

## DUR-2 helper movement process-restart evidence — 2026-11-16

LOCAL / COMPLETE. An actual source-triggered OS process restart during helper
movement replaced the API process PID 85080 with 88928. `/health/ready` returned
200 after restart. Read-only state retained the same `MOVING` route epoch 61 and
public revision 193; the campaign tick advanced from 81466 to 81468. The owner
later confirmed the helper arrived at the Old Mill and returned normally to
Kamenny Brod after 1,000 QA-clock units, without route losses. This demonstrates
recovery and completion of the active route through the API restart. The fresh
target check below also exercised the public UI's uncertain-command retry after
the first transfer reached the API but its response was lost; the retained result
was one receipt and one transfer.

## R1/R3/R4 boundary evidence — 2026-11-16

LOCAL. The real PostgreSQL FIRST HUNT retreat/repeat case snapshots both company
roots, JOIN intent and contract revision, admissions, and company receipts before
a trigger rejects the second admission. The whole snapshot remains equal after the
failed completing JOIN. Retrying the same command ID, revision and body then
creates the second admission, and an identical replay returns that accepted
response. Before the failure probe, two distinct helper JOIN command IDs at the
same revision race to complete the encounter; one succeeds and the other receives
409 without a receipt. The accepted JOIN remains available for the later exact
retry checks. The existing independent-pool JOIN lock case also passes: a SQL
transaction holds the owner's account before the joining request reaches the
company lock; admission completes once, exact retry returns the saved response,
conflicting reuse is rejected, and both roots stay unchanged afterward.

The same retreat/repeat route case races two distinct PRESENT command IDs for the
same proof and revision. One request settles the proof and 80,000,000 Q payout;
the other is refused without a receipt. An outsider reusing the accepted body's
command ID receives only `NOT_AUTHORIZED` (403), with no receipt ID. After the
helper later leaves, the authorized owner retries the original accepted body and
receives the same response; the world wallet remains unchanged. This is real
route-level PostgreSQL evidence for the unique claim, authorization order and
historical replay.

Unchanged R4 evidence also passed: `company-transition.integration.test.ts`
injects a transaction rollback after writing the retained proof/payment
transition, checks company, wallet and proof-claim rows remain at pre-state, then
commits the transition once and rejects a conflicting repeat.
`hostile-loot.integration.test.ts` uses concurrent route requests from two
companies, transfers the source item once, then retries the accepted command after
a later claim advances state and rejects a changed body under the reused command ID.

Selected checks passed sequentially using the per-file disposable integration
harness: the two named encounter JOIN/retreat cases (2 passed, 27 skipped), the
company-transition case (1 passed), and hostile-loot case (1 passed). The harness
disposed each cloned database. The full encounter/contract integration files and
full T029 were `NOT_RUN`. These checks satisfy DUR-1; they do not complete N11.

## R5 current-copy restore follow-up — 2026-11-16

LOCAL / PARTIAL. Read-only source `m1_completion` was dumped from its existing
`warwrit-m1-20261115-postgres-1` PostgreSQL 17.11 container with the matching
17.11 client; host `pg_dump` 14.24
refused the server version. The private, ignored custom dump
`output/m1_restore_current_20261116.dump` is 1,160,670 bytes, mode 0600. Dump
window: 00:57:38.054–00:57:38.305 UTC. It was restored with `pg_restore` 17.11
into the new `m1_restore_current_20261116` database using source-matching UTF8 /
`en_US.utf8` settings; restore window: 00:58:40.921–00:58:41.409 UTC. The source
database and its container were not written. The source battle joined at
00:57:52 UTC, after the dump; that battle is absent from the restored copy and is
not claimed as restored.

The fresh Playwright CLI session `restore-followup` signed in through the normal
Dex form as the source company's player-one owner. The restored UI showed company
Дозор N01 (`eb855f6f-ab02-42ca-9eef-a82b2c6830bf`), 318.71 crowns, 32 rations,
three members with equipment, the helper, known map markers, accepted HUNT-03 and
the pending return report. The report was closed through its ordinary control.
API readiness and web entry returned 200 on ports 3035 and 5335; realtime is on 3036. Read-only SQL showed company snapshot schema 1 at public/canonical revisions
707/718, the current resolved mill-beast encounter with terminal effects applied,
and an ARRIVED route row (`free-atlas-walk-v1` / `porechye-atlas-lab-v1`). After
the initial “Сверяем положение отряда…” state, `/api/world/free-movement` returned
200 with `STATIONARY_SITE`, no plan and a current position at the Old Mill.

The Place panel exposed «Разбить лагерь», but its normal
`BeginFieldCamp` command was rejected with HTTP 409 `UNSUPPORTED_ACTION` at
public revision 709; the UI continued to show the camp action. No new camp or
battle was started; the rejected camp command was the only gameplay command
attempted. The restored copy is authenticated and its saved company, route and
encounter can be read, but R5
playability and the required lawful continuation remain BLOCKED on this command
path. This is not a full row-by-row source/target comparison, another executor's
successful continuation, full T029, or SC-008 acceptance. RPO/RTO and capacity
remain NOT_MEASURED. Private credentials, dump and browser captures remain outside
Git.

### Successful restored continuation — 2026-11-16

FOLLOW-UP / LOCAL. Executor: `guard_service`, separate from the dump operator.
The restored runtime stayed bound to `m1_restore_current_20261116`; the camp
rejection above is specific to starting a camp beside living hostiles and did not
block all ordinary actions. The executor used the restored owner session on the
refreshed integration source (based at `e33c055a` with the unsafe-camp feedback
change then uncommitted; now frozen at `39e84f9c`) and transferred one existing
medical kit from the caravan to living member Rell, then back through the normal
item-transfer controls. The return `TransferItem` command was HTTP 200 and advanced
public revision 722→723. The browser reload retained Дозор N01, 318.71 crowns and
32 rations. After the round trip, the caravan again showed two medical kits and
Rell's bag showed none. Read-only SQL confirmed total quantity 2, both item rows
still company-owned, no other owner, and the returned item in the caravan with
quantity 1 and no tombstone. This proves one lawful restored continuation and this
item's owner/count conservation; it is not a full row-by-row source/target
comparison. Known map markers and accepted HUNT-03 were visible but not compared
against the dump baseline; learned/knowledge state, receipt sets and remaining
item distributions were not compared source-to-target. A later camp click left
the camp inactive, returned HTTP 409 with
`reason=PLACE_UNSAFE`, and showed «Здесь опасно. Разбить лагерь можно, когда
поблизости не останется противников.» No battle was joined. Full T029 and SC-008
acceptance remain open.

### Read-only selected-row comparison — 2026-11-16

LOCAL / PARTIAL. Compared the private 00:57:38 UTC dump baseline with the restored
target extract taken at 02:17:46 UTC. The baseline contains 32 selected canonical
public tables. I confirmed their comparison keys against the target's primary-key
constraints; every baseline key is present in the target, with no missing baseline
rows. The extract and dump remain private, ignored, and mode 0600. No database or
gameplay writes were made for this comparison.

The original resolved encounter remains intact. The target also contains the later
native encounter `77ac1437`, which resolved at 02:09:09 UTC in round 7 / revision
66: two helper companions died, three surrendered and one retreated; the owner had
no deaths, the helper leader survived, and both bindings were released. The target
has two resolved encounters, 66 additional encounter commands/receipts and 173
additional events. The owner snapshot advanced from public/canonical revisions
676/687 to 767/778; the helper snapshot advanced 143/143 to 186/191. Both retained
their character and membership IDs. Current wallet records match the baseline,
while ordinary finance history advanced by two claims in each snapshot and physical
food history grew with elapsed ticks.

For Дозор N01, all 19 baseline item IDs remain, with one additional item row;
aggregate quantity remains 51. Five shared rows changed equipped state and five
changed container assignment, consistent with battle consequences, and no item
owner changed. Its seven character IDs, three membership IDs and learning-task
state match the baseline.
Knowledge and route state did advance: the owner snapshot has one more known item
and two more known containers; map grants, exploration chunks and map editions
retain their baseline rows. Receipt sets are monotonic in the selected tables:
93 company receipts and one route receipt were added, while all baseline company,
ordinary-contract, story and route receipts remain present. The comparison covers
these selected tables and keyed saved rows only; it is not full T029, RPO/RTO,
capacity measurement or SC-008 acceptance. RPO/RTO and capacity remain
NOT_MEASURED.

### Exact retained-value follow-up — 2026-11-16

LOCAL / PARTIAL. Reused the same private extracts; compared all extracted columns
and JSON values, with no timestamp exclusions. For these selected immutable
receipt/event/history tables, every baseline row is an exact target match by the
verified primary key: changed and missing baseline rows are zero in every table.

| Table                          | Baseline | Target | Exact baseline rows | Changed | Missing | Added |
| ------------------------------ | -------: | -----: | ------------------: | ------: | ------: | ----: |
| `company_audit_events`         |    1,083 |  1,170 |               1,083 |       0 |       0 |    87 |
| `company_receipts`             |      822 |    915 |                 822 |       0 |       0 |    93 |
| `encounter_commands`           |      115 |    181 |                 115 |       0 |       0 |    66 |
| `encounter_events`             |      320 |    493 |                 320 |       0 |       0 |   173 |
| `encounter_leadership_choices` |        1 |      1 |                   1 |       0 |       0 |     0 |
| `encounter_receipts`           |      115 |    181 |                 115 |       0 |       0 |    66 |
| `ordinary_contract_receipts`   |        6 |      6 |                   6 |       0 |       0 |     0 |
| `story_command_receipts`       |       21 |     21 |                  21 |       0 |       0 |     0 |
| `world_route_receipts`         |      114 |    115 |                 114 |       0 |       0 |     1 |
| `company_map_grants`           |        7 |      7 |                   7 |       0 |       0 |     0 |
| `world_proof_claims`           |        1 |      1 |                   1 |       0 |       0 |     0 |

In the owner snapshot, all 19 learning-task rows, including all three rows with a
stop record, match exactly. Snapshot arrays were keyed by task ID, claim ID,
command ID, movement ID, effect/source key, food source and tick tuple, or encounter
binding as applicable. The same is true for all baseline finance-applied (636),
lifecycle-applied (498), physical source-effect (1,366), food-history (792),
movement (39), maintenance-receipt (3), learning-effect (40) and learning-obligation
(19) rows. The helper snapshot exactly retains its 85 finance-applied, 17
lifecycle-applied, 283 physical source-effect, 225 food-history and three movement
rows. Each snapshot also retains its completed-encounter history; the owner has
one exact baseline row and the helper had none. New rows follow campaign progress.

The only changed same-key entries among those embedded history arrays are two finance
claims in each company snapshot; none is missing. Stable claim IDs match, and the
changed fields are `earned`, `toTick` and `reportedQ`; each snapshot also has two new
claims. These are campaign finance updates, not restore loss. In the helper snapshot,
the finance source-effect list grows from zero to seven entries.

Knowledge entity IDs also retain their baseline subsets: owner item snapshots 12/12,
vital snapshots 3/3 and container snapshots 4/4; helper item snapshots 12/12, vital
snapshots 3/3 and container snapshots 4/4. Target additions are one owner-known
item, two owner-known containers and one helper-known container. All 20 baseline
company place-observation site IDs remain; four same-key observations update
`last_observed_at` and `source_ref`. All baseline exploration chunks and map grants
remain exact. This value check does not compare every other mutable snapshot field
or public tables omitted from the 32-table extract.

### Fresh current-copy restore runbook and full-value rehearsal — 2026-11-16

`LOCAL_DEVELOPMENT.md` describes local setup and migrations but has no isolated
R5 restore procedure. Use a new database name for every rehearsal. First inspect
the private `output/restore-current.env` without printing its values; confirm it
identifies the intended source. Confirm the target name is absent and record the
source encoding/collation. If the target already exists, stop and choose a new
name: never drop or clean an existing database. Do not point an application at the
target until comparison passes.

For this rehearsal the source was `m1_restore_current_20261116`; the new target is
`m1_r5_restore_guard_20261116`. Both used PostgreSQL 17.11 tools, UTF8 and
`en_US.utf8`. With `output/` ignored and mode 0600, the safe sequence was:

```sh
umask 077
docker exec warwrit-m1-20261115-postgres-1 sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" \
    --format=custom --no-owner --no-privileges \
    --dbname=m1_restore_current_20261116' \
  > output/r5_restore_guard_20261116.dump
chmod 600 output/r5_restore_guard_20261116.dump

# Only after a read-only catalog check confirms this fresh name is absent:
docker exec warwrit-m1-20261115-postgres-1 sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" exec createdb -U "$POSTGRES_USER" \
    --template=template0 --encoding=UTF8 --locale=en_US.utf8 \
    m1_r5_restore_guard_20261116'

# Restore to that new empty database. Never add --clean or --create.
docker exec -i warwrit-m1-20261115-postgres-1 sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore -U "$POSTGRES_USER" \
    --exit-on-error --no-owner --no-privileges \
    --dbname=m1_r5_restore_guard_20261116' \
  < output/r5_restore_guard_20261116.dump
```

Before any application connects, extract data from the private archive with
`pg_restore --data-only --no-owner --no-privileges` and extract target data with
`pg_dump --data-only --no-owner --no-privileges`. Compare relation and column
lists, then compare decoded COPY rows as multisets per relation (`\N` is SQL
NULL); compare all non-COPY statements, sequence state and large-object statements
too. Compare archive schema output with target `pg_dump --schema-only` output,
normalizing only the generated `\restrict` / `\unrestrict` guard token. Keep
extracts private and mode 0600. The source-database URL, credentials and raw saved
rows must not appear in terminal output or Git. `--no-owner --no-privileges`
intentionally does not prove database role/grant parity; keep the target
disconnected unless the owner coordinates an application-access check.

The 03:44:40.973–03:44:41.234 UTC dump was 1,349,202 bytes (mode 0600). Restore
completed at 03:45:17.392 UTC after starting at 03:45:16.965. The canonicalized
schema DDL matched. All 56 COPY relation sections across `public` and `playground`
matched exactly by column list and row multiset: 6,072 rows, zero missing, added
or changed values. Both non-COPY statements (`setval` sequence state and
`set_config`) matched exactly; neither dump contained large-object statements.
This included all 32 migration rows, 41 identity accounts, 41 company-owner
bindings, 41 company snapshots, three map editions and both encounter rows. The
source had 44 public tables; schema equality covered
empty tables as well. A post-check found zero target sessions. No application,
gameplay or source-database writes occurred; the target is a separate database on
the existing PostgreSQL instance, remains disconnected from the game runtime and
is retained. These local dump/restore durations are not RPO/RTO or capacity metrics.

At this dump snapshot, Дозор N01 was active at public/canonical revisions 822/837
with seven characters, three memberships, 20 item rows/48 units and two completed
encounters. The helper company was active at 206/211 with six characters, three
memberships, 12 item rows/36 units and one completed encounter. All three saved
route rows were `ARRIVED`. These target values match the source snapshot exactly;
the parent later confirmed the helper arrived and returned normally without losses.

For the coordinated normal-use check, `output/restore-r5-guard-target.env` was
prepared mode 0600 and ignored, retaining every source setting except
`DATABASE_URL`, which points at the new target. The existing runtime connected
only to that target during the check; no new listener or auth configuration was
created. The target runtime was stopped afterward and read-only PostgreSQL
inspection found zero remaining target sessions.

### Fresh target normal-use and uncertain-reply check — 2026-11-16

LOCAL. A separate executor used the named Playwright session
`r5-final-restore-20261116` to sign in normally through Dex to the isolated fresh
target. The company panel showed Дозор помощника, 800 crowns, 22 rations and two
medical kits in the company caravan. Through Отряд → Передать вещи, one medical
kit was sent to the leader's bag. The first `POST /api/company/commands` was
forwarded to the target with `route.fetch()` and its browser response was then
aborted. The UI offered «Повторить эту же передачу»; using it succeeded. The
retry command ID has exactly one target company receipt.

The same kit was transferred back through the ordinary UI. The live page after
the reversal still showed 800 crowns and 22 rations. A browser reload after the
reverse transfer was `NOT_RUN`; the named browser session was unavailable after
the target runtime stopped. Read-only canonical state showed
two medical-unit rows totaling two units, both in party-supply containers, zero
medical units carried by any character, 22 ration units and an 800-crown company
wallet. The retry command was
`7d83e810-8c92-472d-a8ef-d9de1cfdfbf2`; the reverse transfer command was
`c3d0b474-2e25-467b-a9ab-b2430e3e4c7c`; each has one target company receipt.
Read-only checks found zero receipts for those IDs in source
`m1_restore_current_20261116`, whose owner and helper wallets remain 438.71 and
717.55 crowns; Ratko remains assigned to FIELD and bound to a field party there.
The target API was stopped, and `pg_stat_activity` showed zero other target
sessions. This meets DUR-4's normal-login, lawful-continuation and saved-readback
step and the public uncertain-reply part of DUR-2. It does not measure RPO/RTO or
capacity.

Separately, another agent ran the lock-order PostgreSQL regression
against this target in two isolated UUID test worlds; no existing player-world
rows were touched. Treat those rows as later test activity. The full 56-table
equality remains evidence from before any application or test writer connected.

## Player goal and ordinary result

An interruption cannot duplicate money, erase people or trap a company.
A backup can restore a coherent playable world.
Try: ordinary accepted command → lost reply/restart → exact retry → same one
result; separately restore an authorized backup into a NEW owned DB and sign in
normally to the same restored company/world.

## Sources and dependencies

N01 usable base, real PostgreSQL and lawful company/owner/helper state;
existing #174/#393–#397, [M1](../../wiki/m1-spec.md),
[local setup](../../engineering/LOCAL_DEVELOPMENT.md) and selected base's
`SERVER_AUTHORITY.md`, receipts/executor/migration/backup documentation.
N02/N05–08 supply compatible ordinary scenarios; do not wait for full content to
test an existing transaction. Never run failure tests on someone else's stand.

## Boundary leaves and expected outcomes

| Leaf / issue | Failure and actual invariant                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1/#393      | Crash around battle admission: physical owner/helper binding, encounter and receipts are all committed or all absent; retry gives same accepted admission                    |
| R2/#394      | Crash around terminal commit: all participating company consequences, attempt/proof eligibility, binding release and receipt are atomic and recoverable                      |
| R3/#395      | Competing presentations: only the current lawful bearer/claim wins once; other account/reused-conflicting body cannot receive duplicate proof/payment                        |
| R4/#396      | Lost/failed claim commit and exact retry: one unique funded transfer, conserved money/item, historical response even after later state changes                               |
| R5/#397      | Backup/restore into a separate DB: compatible schema/content/time, accounts/company bindings, routes/encounters, people/items/money/knowledge/receipts restored and playable |

R2 checks terminal-outcome persistence and atomic consequence application as
separate stages. A crash between them leaves a saved outcome with pending effects.
Restart resumes the existing application path with once-only consequence
application, including the established leadership-choice wait. Company bindings are released with applied consequences
under the outcome policy.

Before-commit failure leaves no partial candidate; after-commit response loss
replays the accepted result. Retry is authorized before private receipt lookup.
Real independent DB connections/process restart prove DB properties; a mocked
transaction or a browser refresh alone does not. Existing equivalent evidence
can satisfy an unchanged row; identify revision/setup and limitations.

## State, backup and privacy contract

Keep one canonical executor/transaction and receipt owner; no repair daemon,
alternate write path or automatic receipt regeneration. Preserve immutable
historical replay, source IDs and existing save versions.
For backup record start/end, included schema/content refs, DB consistency method,
ownership and restoration prerequisites. Use existing PostgreSQL capabilities.
Keep dumps/credentials/private observations outside Git/public evidence under
owned access. A restore never overwrites the retained source DB. A restored test
process is isolated from the live writer, outbound integrations and player routes.

Measure actual backup age/recovery work/time where possible; RPO/RTO stay
NOT_MEASURED when not measured, not invented promises. A readable dump or table
counts alone do not prove playable recovery. Login and the next lawful action
must work after restore; no manual balance/health/position repair.

## Candidate scope and work plan

Scope: existing server DB command-transaction, company/contract/encounter/world
repositories/executors and their integration tests; narrowly required receipt/
recovery UI; scoped local backup/restore scripts/runbook if genuinely absent.
Reserve exact paths per R-row. OUT: distributed topology, cloud purchases, all
production ops, rewriting migrations or deleting failing worlds.

1. Map actual transactions, lock order and current evidence; select one uncovered R-row.
2. Reserve owned disposable resources and a valid ordinary setup; record pre-state.
3. Use existing scoped failure/transport tooling or bounded test-only injection
   at real boundaries; no shipping an unprotected production failure endpoint.
4. Trigger real failure/concurrency, recover, retry and inspect authorized result/
   canonical read-only state. Fix only the reproduced owner defect.
5. For R5 create a consistent backup and have another executor follow the
   prepared runbook to restore to a separately named fresh DB. Preserve the
   original and bind isolated processes only to the restored target.
6. Log in, inspect restored state and perform one lawful continuation, comparing
   actual people/items/balances/knowledge/receipts/route-or-encounter state.
7. Record elapsed measurements, resource ownership, checks and retained evidence;
   stop owned test processes without deleting source/player data.

## Acceptance / DoD

- [x] DUR-1 R1–R4 have actual applicable commit-boundary/concurrency/exact-retry
      evidence with atomic effects, authorized readback and no duplicate reward.
- [x] DUR-2 Restart recovers actual active route/encounter and releases completed
      work; public UI handles uncertain outcome without a fresh duplicate intent.
- [x] DUR-3 An actual consistent backup restores into a separate owned DB with
      compatible migrations/content/replay and complete conserved canonical state.
- [x] DUR-4 Another executor follows the prepared runbook to restore a separate
      owned DB, sign in normally and perform one lawful restored continuation.
      Record the executor and result for SC-008, including conserved state,
      access controls and isolation from the source world's writer. Ordinary login
      and continuation work without manual state repair or leaked private data.
- [x] DUR-5 Runbook names source/target isolation, access, prerequisites, actual
      elapsed results and remaining recovery limits; no dump/secret is committed.
- [x] DUR-6 Current evidence, inherited unchanged evidence and missing coverage
      are distinct. RPO/RTO/capacity are measured or explicitly NOT_MEASURED.

## Stop conditions

Unavailable source-owner permission, unknown restore target, real data-loss risk
or new unsupported policy blocks only that operation. Prepare scripts/runbook and
independent tests first; recommend a fresh owned restore target. Do not ask for
blanket destructive authority or replace failed transactional proof with mocks.

## Native board deadlock and lock ordering — 2026-11-16

The ordinary source browser journeys repeatedly received HTTP 500 from the
board. Retained PostgreSQL server logs show the cycle across company snapshot,
world-clock and shared hunt-state locks. At 04:17:03 UTC, PID 224543 waited on
224117 for a company snapshot, 224117 waited on 222930 for the world clock, and
222930 waited on 224543 for a hunt state. The same relation cycle appeared at
04:13:03 and 04:15:03. The board read gates held shared hunt rows before the
company snapshot, reversing the company/clock/hunt order used by commands.

The board now locks the existing Empty Watch contract row, then its own company
snapshot, before reading gates. It reuses that snapshot for projection and
preserves the existing unlocked clock read. The global ordinary-contract row
keeps its prior ordering relative to company writes. No retry loop, migration,
receipt rewrite or economic policy was added.

The parent reproduced the old ordering in a disposable PostgreSQL clone: while
an actual board GET waited for the held company snapshot, NOWAIT acquisition of
the Mill Beast hunt row failed. With the route correction, both tests in the
focused Whose Wolves file passed, including the existing one-time refusal,
private disclosure and replay case. The clone was disposed. Scoped ESLint,
server typecheck, formatting and diff checks passed. The resumed native source
also loaded its company, report and ordinary contract views after the correction.
This change preserves stored data and the compatibility of the preceding R1–R5
checks. T029 is complete on this integrated local candidate.

During the runtime return, the parent overwrote the preceding development
stdout log by reusing its output filename. The original file is unavailable.
Canonical saves, receipts and the retained PostgreSQL server log remain
available. The resumed source log is now
`output/m1-source-resumed-20261116-0742.log`. The source runtime uses the original
private environment and ports 3035/3036/5335. The first temporary target startup
used port 5331 and failed on the existing listener; an explicit environment
passed to the child processes started the intended 5335 runtime. These local
startup failures did not change player state.

## Native retry pending on first skill practice — 2026-11-16

FIXED / LOCAL. The fresh HUNT-03 encounter ended at revision 24 with its
terminal result retained. Its initially pending company effects have recovered. The finite saved input is
recorded in N08. A pure diagnostic replay isolates the helper rejection at receipt
8, before Ratko's later wound/death. The actual failure is INVALID_STATE in
preparePracticeCredit because the newly recruited Ratko has a defense aptitude
and a trusted level-zero defense interaction, but his sparse starting skills
contain only blades and medicine. The physical residual masks this practice
failure. The owner's company independently prepares READY.

The correction lets an absent skill with a recorded aptitude begin at its first
trusted level-zero practice source. The existing constructor binds exact zero
XP to that source before crediting the demonstrated practice. Exact stored XP/
carry keeps its original binding. Legacy numeric skills, absent aptitude and
missing nonzero history retain their refusal. The first-practice regression
failed with INVALID_STATE before the correction and passes afterward, including
late replay and refusal of unproved nonzero history.

A pure replay of the saved finite input now prepares READY for both companies.
After the game-core build, the ordinary pending worker replayed the original
commands and applied the terminal transaction at 2026-11-16T12:07:37.545Z with
source first-hunt-terminal:36dc7e1a-a73e-43b6-aa12-9d7a96d7c83c:24.
Both bindings are released. Both companies remain ACTIVE. The owner has three
completed encounters, the helper two, and Ratko is canonically DEAD. Existing
outcomes and their command history remain retained.

The practice-credit and terminal-evidence suites pass 13/13. Game-core build,
scoped lint/format and diff checks pass. The testkit-wide typecheck fails in
supply and branded-ID fixtures, with zero diagnostics in the changed practice
file. Its log is output/m1-first-practice-testkit-types-20261116.log.
Focused logs are output/m1-first-practice-before-20261116.log and
output/m1-first-practice-after-20261116.log. Publication and merge are NOT_RUN.

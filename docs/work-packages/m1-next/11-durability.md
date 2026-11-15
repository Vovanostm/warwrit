# N11 — Durable commands, crash recovery and backup restore

## Current result — 2026-11-08

SPECIFIED / LOCAL. WLC-08 reports real lost PRESENT reply, travel/API-battle restart
and preserved 17 data groups on its candidate. Broader commit-boundary/concurrent
claim and actual backup/restore coverage remain to reconcile, not assume absent.
Next: map current evidence to existing #393–#397 and perform one missing boundary.
[Common contract](COMMON.md). [Prompt](prompts/11-durability.md).

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

- [ ] DUR-1 R1–R4 have actual applicable commit-boundary/concurrency/exact-retry
      evidence with atomic effects, authorized readback and no duplicate reward.
- [ ] DUR-2 Restart recovers actual active route/encounter and releases completed
      work; public UI handles uncertain outcome without a fresh duplicate intent.
- [ ] DUR-3 An actual consistent backup restores into a separate owned DB with
      compatible migrations/content/replay and complete conserved canonical state.
- [ ] DUR-4 Another executor follows the prepared runbook to restore a separate
      owned DB, sign in normally and perform one lawful restored continuation.
      Record the executor and result for SC-008, including conserved state,
      access controls and isolation from the source world's writer. Ordinary login
      and continuation work without manual state repair or leaked private data.
- [ ] DUR-5 Runbook names source/target isolation, access, prerequisites, actual
      elapsed results and remaining recovery limits; no dump/secret is committed.
- [ ] DUR-6 Current evidence, inherited unchanged evidence and missing coverage
      are distinct. RPO/RTO/capacity are measured or explicitly NOT_MEASURED.

## Stop conditions

Unavailable source-owner permission, unknown restore target, real data-loss risk
or new unsupported policy blocks only that operation. Prepare scripts/runbook and
independent tests first; recommend a fresh owned restore target. Do not ask for
blanket destructive authority or replace failed transactional proof with mocks.

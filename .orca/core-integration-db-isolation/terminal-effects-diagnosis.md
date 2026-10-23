# #285 surviving terminal-effects failure — source-only diagnosis

2026-10-22. Independent diagnostic worker; no acceptance verdict or runtime reproduction.

## Result

**Exact cause UNPROVEN.** The smallest useful boundary is the single call at
`apps/server/src/encounters/postgres.integration.test.ts:4149`: did its pending
batch include this encounter, did `applyOne` return false, or did terminal evidence
request a leadership choice and roll back? These are distinct normal-return paths
in `apps/server/src/encounters/effects.ts:137–150`. The saved evidence does not
record that decision. Leadership is the strongest source-supported lead, not a
confirmed cause or production defect. No correction is justified yet.

## Authority, source and ownership

- Read repository `AGENTS.md`, the complete accepted five-section
  `.orca/core-integration-db-isolation/contract.md`, complete `eval-2.md`, current
  `CURRENT_PLAN` status/new changelog entries, ADR-0003, technology handoff,
  `warwrit-review` and `warwrit-context`. Read live #285 body/comments using
  read-only `gh issue view`; the issue's shared-database explanation remains a
  hypothesis, as the accepted contract explicitly distinguishes it from the
  observed failure (`contract.md:14–17`).
- Checkout: `/Users/vovanostm/orca/workspaces/warwrit/core-integration-db-isolation`,
  branch `Vovanostm/core-integration-db-isolation`, HEAD
  `7765c0f79816fac6b0dce1902a5ecf339d5f05ac`. Eval-2 examined `0998c1d5`;
  `git diff 9ea84fcf HEAD --stat` contains only the report and coordinator records.
  An explicit diff of the encounter test/effects/executor/evidence, contract
  executor/repository/runtime and world clock against `9ea84fcf` was empty.
- MCP `list_projects` exposes Warwrit at `/Users/vovanostm/learn/warwrit`, head
  `b44f5c1e`, not this checkout. No graph claims or re-indexing; actual source is
  the evidence. File discovery found only root `AGENTS.md`.
- Initial tracked tree was clean. During investigation the assigned builder's
  `apps/server/src/db/integration-database.test.ts` and
  `scripts/integration-database.ts` became dirty; neither was edited or reverted
  by this worker. Their in-progress changes are outside this diagnosis.
- Only new `terminal-effects-diagnosis.md` is owned here. Builder
  `task_aa091f52cfec` retains all seven lifecycle paths and checks/hooks/DB/browser/
  runtime. Shared records and acceptance remain coordinator-owned. The accepted
  contract excludes production changes and preserves the original assertions
  (`contract.md:4,17,20–28`).

## What the saved run actually proves

All evidence paths below are under
`.orca/core-integration-db-isolation/eval-2-evidence/`; these are saved local
artifacts, not newly executed checks.

- `test-migrations.log:738–759`: the wolf test fails at unchanged line 4156 with
  `expected null not to be null`; 59 tests pass, 1 fails, eight files execute.
  `test-migrations.exit:1` records exit 1. The failure is after awaited victory,
  effects call and replay verification (`postgres.integration.test.ts:4148–4156`).
  Thus the effects call returned normally; an ordinary uncaught evidence/SQL
  error would have stopped execution before this assertion.
- `sql-observation.jsonl:547`, event `pending-terminals` at
  `2026-10-22T06:38:47.238Z`: encounter
  `7692574d-1e4f-4fc7-b3cf-dfaafaa5081c`, world
  `4077099a-5b07-47a2-b367-210b0a9f7571`, database
  `ww_integration_67ec2d128ecb453a81c13dba98fad79d`, resolved revision and
  terminal revision 56, company victory, null effects timestamp/source,
  zero choice rows, 56 receipts. Same values remain at line 588,
  `06:38:48.567Z`. At line 589, `06:38:48.591Z`, receipts are already zero.
  Cleanup explicitly deletes receipts before admissions/encounters
  (`postgres.integration.test.ts:720–740,873–897`), so the last observation
  cannot be treated as the apply transaction's input.
- `observe.cjs:52–59` saves only outcome, revision, acknowledgement fields,
  choice count, clock and receipt count. It does **not** save binding/owners,
  company roots, leader/unit health, commands/ticks, selected batch, evidence
  residuals or transaction branch. Its SQL predicate also omits the production
  query's revision/source-null predicates and ordering/limit. Its event name
  `pending-terminals` is not proof of selection by `readPendingTerminals`.
- `sql-summary.json:2,105–114` records maximum sampled unresolved-effects row
  count 1, max active files 2, and a disposal-racing `3D000` poll error.
  This weakens a batch-saturation lead but is not an atomic batch trace.
  Eval-2's distinct-file databases/disposal evidence is retained; it does not
  identify a within-file cause (`eval-2.md`, “Fresh lifecycle and native database
  evidence”). Later proof/root/receipt/idempotency assertions remain NOT_RUN
  after line 4156 (`postgres.integration.test.ts:4157–4200`).

## Actual apply path and preconditions

1. The test seeds both accounts, sessions, snapshots and owner mappings; seeds
   an epoch and genesis; binds the wolf contract; then freezes **Date only**
   (`postgres.integration.test.ts:515–568,603–606,3931–3940`). Both initial pools
   read the same module-level URL (`:52–56`), and the reopened pool uses it
   (`:4118`). File setup binds the five URLs before collection
   (`scripts/integration-file-setup.ts:5–18`). Saved native disposal occurs after
   the wolf requests (`test-migrations.log:730–739`), not before the assertion.
2. `playFirstHuntToVictory` advances native commands/AI for this encounter and
   checks resolved **side victory**, not survival of either company leader
   (`postgres.integration.test.ts:614–682`). The test then calls the unscoped
   effects batch once, discarding its returned encounter IDs (`:4148–4149`).
3. `effects.ts:19–42` selects resolved encounters with matching admission
   terminal revision and both acknowledgement fields null, ordered by SQL
   creation time/ID, limit 16 (`:131–137`). A missing target produces no exception.
4. For each selected target, `applyOne` can return false for unavailable/invalid
   lock scope, account count, owner membership, missing company aggregate,
   missing profile world row, missing contract, or changed rechecked company/
   account lists (`effects.ts:49–119`). Lock-set construction validates hunt,
   binding world/version/participants, one or two distinct company IDs and
   distinct owner accounts (`contracts/repository.ts:29–79`). The world lookup
   for later hunts uses `world_hunt_states` and the instance ID
   (`contracts/first-hunt-runtime.ts:104–124`). These inputs were not sampled.
5. After those guards, the contract executor validates accounts, roots, world,
   contract terms, immutable admission and replay; prepares company evidence;
   persists both company transitions/world/proof and finally acknowledges the
   admission in the same transaction (`contracts/executor.ts:346–445,519–546,
   609–733`). Non-READY evidence normally throws TypeError. Only
   `LEADERSHIP_CHOICE_REQUIRED` becomes `TerminalAwaitingLeadershipChoice`
   (`:622–627`), which the outer batch catches and skips after rollback
   (`effects.ts:142–148`). One company's choice requirement therefore leaves
   the shared acknowledgement and both company effects unapplied.
6. The evidence adapter checks locked replay/root/binding, reads persisted
   commands and this company's recorded choice
   (`encounters/executor.ts:397–459`). The producer derives leader death from
   acting/current leader → admitted character → terminal unit **health 0**
   (`terminal-evidence.ts:383–392`). Only after consumption and a supported
   death fact does it try system finalization; if that returns
   `CANDIDATE_REQUIRED` and no choice exists, it emits
   `LEADERSHIP_CHOICE_REQUIRED` (`:507–589`). Existing domain succession returns
   company end when nobody can continue, otherwise requires a candidate
   (`packages/game-core/src/company/succession.ts:145–165`). Zero choice rows
   alone says nothing about whether those conditions held.

## Classification under warwrit-review

**Proven source counterexample to the test's implicit implication, not a
reproduced production defect:** a resolved company-side victory can include a
dead bound leader. If receipt consumption succeeds, an eligible successor
remains, and there is no recorded choice, the producer returns
`LEADERSHIP_CHOICE_REQUIRED`; the contract transaction rolls back and the batch
returns normally without acknowledging that encounter. Side victory alone is
therefore insufficient evidence for immediate settlement. This conditional
sequence follows the exact branches cited above; it does not establish that
eval-2 reached them, nor prove a particular random seed reaches them.

**Evidence-supported lead — fixture/journey precondition:** unlike the failing
wolf test, existing tests explicitly handle an unapplied terminal by reading
leadership requirements and recording the owner's choice
(`postgres.integration.test.ts:1002–1029,1380–1412`). The wolf test supplies no
choice and makes no leader-survival observation. Its inputs vary: random world
ID (`:3934`), world-derived combat seed
(`contracts/first-hunt-runtime.ts:71–83`; `encounters/admission.ts:301–308`), and
opening-generated leader skills (`postgres.integration.test.ts:394–451`;
`company/opening.ts:45–67` uses `randomInt`). Freezing Date after seeding does
not freeze these inputs. This explains a possible source of outcome variation;
it is not proof that variation caused this failure and is not a proposal to
replace the seed or fixture.

**Unexecuted alternatives:** batch omission, each outer admission/ownership/
world precondition, or a clock-related difference remain UNPROVEN. The sampled
clock is epoch `1792651099464`, starting tick `1000`
(`sql-observation.jsonl:547`), but lacks binding/command ticks. Human and AI
commands derive ticks from actual `Date.now()`
(`encounters/executor.ts:983–1007,1190–1203`); asking for wakes at `now + 60s`
does not itself advance Date (`postgres.integration.test.ts:623–625`).
Terminal evidence requires nondecreasing persisted command ticks and uses those
ticks for campaign advancement (`terminal-evidence.ts:230–247,305–340,430`).
The effects wrapper ensures/reads and locks the world clock, but does not use
its returned tick to prepare evidence (`effects.ts:95`; `world/clock.ts:17–38`).
A non-leadership NOT_READY time residual from an entered
contract executor would throw, rather than silently reach line 4156
(`contracts/executor.ts:622–627`). Consequently a generic “clock drift” diagnosis
does not explain this saved symptom without identifying an actual branch.

## Minimal ownership decision and one next action

No lifecycle-helper correction is demonstrated: URL binding/disposal is outside
the settlement decision and the saved run reached the original assertion.
No production correction is demonstrated either: leadership deferral has an
explicit existing implementation; bypassing it would change settlement behavior
without evidence.
The leading candidate is a fixture/journey correction **only if** the next
observation proves the missing leadership precondition. Its minimal potential
write ownership would then be
`apps/server/src/encounters/postgres.integration.test.ts`, specifically the wolf
journey around `:4148–4149`; the existing `:4156` and subsequent assertions stay
intact. This is conditional coordinator assignment guidance, not a fix request
or authorization to add choices, retries, fixtures or workarounds. A failed
outer guard instead requires its exact missing input and producer to be traced
before assigning fixture versus production ownership.

**One next action:** the coordinator's exclusive runtime owner should capture
one branch trace of the original effects invocation, before its existing finally
cleanup, retaining all assertions and inputs. Record the target's actual database,
selected batch IDs, `applyOne` false-guard reason **or** per-company terminal
evidence status/residuals and caught exception company ID. For a leadership
residual, also record acting/current leader ID → binding character/unit ID →
terminal health, supported death fact and system-finalization
`CANDIDATE_REQUIRED` result. For a time residual, retain binding tick and ordered
command ticks. The decisive observable is the target's selection/guard/residual
from that invocation, not another null/choice-count poll. Any diagnostic source
instrumentation needs its own explicit path allocation; none is made here.

## Limits and documentation closeout

Tests, typechecks, formatting/builds, servers, PostgreSQL, browser, proxy and
runtime reproduction: **NOT_RUN by this worker**. Exact cause, failing leader
identity, selection/guard outcome and correction: **UNPROVEN**. No ACCEPT gate,
new game rule, assertion change, retry, source fix, fetch, branch switch, commit,
push, GitHub write, Orca command or agent spawn. Only read-only source/Git/issue
and saved-artifact reads plus this new report were performed.

This report is the diagnostic documentation closeout. Coordinator-only
CHANGELOG/CURRENT_PLAN/wiki remain untouched; proposed checkpoint: “#285 bounded
source diagnosis narrows surviving line 4156 to batch selection, outer guard or
leadership deferral; fixture leadership precondition is a lead, exact cause and
correction UNPROVEN; original invocation trace required; no new runtime checks.”

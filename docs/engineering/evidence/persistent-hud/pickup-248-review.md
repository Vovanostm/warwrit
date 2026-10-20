# Issue #248 independent bounded review

Date: 2026-10-20. Reviewer: bridge_correction_review. Checkout: `/Users/vovanostm/orca/workspaces/warwrit/uix-w1-scene`; HEAD `8dd98efb7abe492c210061dd9f8b90b80d1ce97c` with author-owned dirty routes/test. Report-only write. No tests, services, source edits or delegation by reviewer.

## Elapsed-tick rejection: root cause confirmed from captured state and policy

Evidence: `terminal-attempt-d3f4a615-b794-4bc4-89ad-6bc44d877778.json`.

- Admission binding tick1001; both preterminal company lifecycle/finance/physical roots tick1001. All61 actual command rows are tick1002.
- The rejected company named in the captured TypeError is helper `3f64336c-6d88-480a-926a-4e7eed713060`.
- Helper has197 live company-owned rations (97+100), all in `fixture-supply`. That container is STATIC, access COMPANY, company custodian, carrier null. Its other containers are CARRIED but access OWNER/character custodian and contain no rations.
- Owner's supply is PARTY_SUPPLY, company access/custodian, carried by its bound party; owner is not the company named in the failure.

`encounters/terminal-evidence.ts:305–311` enters elapsed-time food preparation when receipt tick exceeds company root tick and maps non-PREPARED food into PHYSICAL_CONSEQUENCE_EVIDENCE_MISSING before receipt consumption. `company/travel-food.ts:515–532` admits only company-access, company-custodied PARTY_SUPPLY/CARRIED stock with the bound-party/participant carrier and same encounter location. STATIC helper stock fails that access boundary. `prepareStockFoodFacts` then has no eligible sources and rejects INSUFFICIENT_ITEMS (line149). Total physical inventory quantity does not establish accessible encounter supplies.

This classification is supported by the existing independent policy regression `company/travel-food.test.ts`, test `does not treat static, unrelated, closed or remote stock as encounter supplies`, which explicitly expects INSUFFICIENT_ITEMS despite stocked STATIC supplies. No food policy change is justified by this captured fixture.

**Classification: fixture timing and supply precondition defect, not a reproduced production food-policy defect.** The equality-focused fixture accidentally selected an elapsed-tick path depending on wall time (21.6s/tick) while its helper carried no qualifying encounter food. The captured state now explains the previously unisolated generic terminal residual. This report does not claim reviewer execution of the author's food-preparation reproduction or absence of other production defects.

## Approved correction boundary and pending final review

The parent's approved approach preserves the original lifecycle-equality regression with a deterministic scoped clock and guaranteed restoration, and adds a separate real HTTP/PostgreSQL elapsed-tick case with lawful30-ration carried helper supply. Keep existing terminal once-only/receipt/ownership/forged pickup assertions; preserve seed and food policy; remove temporary bulk diagnostics. This separates the two concrete preconditions rather than choosing a lucky seed or rerunning until green.

Author is editing the test. Final diff/check results have **not yet been supplied/frozen**. No final test-review ACCEPT is issued at this checkpoint. Next review is narrowly limited to deterministic timing/restoration, lawful supply fixture and real elapsed-time HTTP/PG assertions; no duplicate broad source review.

## Final-test diff review, first correction pass

Inspected author-ready test diff against8dd98efb (no execution). Verdict at this checkpoint: **REWORK**, narrowly for these concrete test defects:

1. Extracted actorActions indexed union was split into a declaration and stray expression. Writer corrected the declaration; source readback confirms the full indexed union restored.
2. A Date.now spy alone leaves new Date() real. Contract command route constructs new Date() before readWorldClock, while test clock-reset epoch uses Date.now. A slow equality/forged-pickup run can therefore cross another campaign tick. Requested scoped freezing of Date constructor and Date.now with real timers retained and finally restoration.
3. Elapsed food assertions use helper.initial30 and final<30 plus nonempty foodCarry. JOIN itself already advances the root and consumes food; captured rejection fixture had197 from initial200 and foodCarry tickUnits1 at admission. Those expectations can pass with no terminal food consumption. Requested persisted after-JOIN helper snapshot as actual before-food boundary, final ration decrease against that boundary, and changed carry values. Initial30 assertion remains a fixture check.

Writer and parent received exact findings. Await revised source and actual author checks; no broad review or reviewer test run.

## Revised final-test source readback

**ACCEPT (source), same8dd98efb plus dirty author test/routes; author check results pending.** All three findings above corrected and read back:

- Full actorActions indexed union restored.
- `freezeCampaignClock()` uses `vi.useFakeTimers({ toFake: ['Date'], now: Date.now() })`; both Date constructor and Date.now share the frozen wall time while actual timers remain real. Both cases assign restoration immediately and invoke it in finally before cleanup. The original equality case explicitly reads the persisted admission tick, resets/readbacks the world clock to it, retains unchanged lifecycle revision and original once-only assertions, plus owner/helper pickup projection and atomic forged CAPACITY rejection checks.
- Separate elapsed case uses the actual30-ration company-owned PARTY_SUPPLY fixture, carried by helper.partyId, pins/readbacks admission+1, snapshots persisted helper after JOIN, and asserts final ration quantity decreases and foodCarry differs from that actual boundary. It also checks final tick, applied terminal marker, second effects call not applying again and one terminal receipt. Existing battle driver uses real HTTP commands/AI wake adapters and PostgreSQL terminal effects; no outcome or transaction mocking introduced.

Temporary bulk state-capture diagnostic code/imports removed. No food policy or combat seed change. No outstanding concrete scoped source finding. Reviewer did not run checks; source acceptance is conditional on the author's final focused/type/lint checks and parent publication gate, with execution results attributed separately when supplied.

## One-tick fractional food oracle correction

Author's first focused execution found equality PASS and elapsed terminal settlement succeeds, but integer ration count remains27. The earlier requested strict quantity decrease was too strong for this boundary; it is superseded here. Established `physical-food.ts:165–176` treats nonzero carry as already-used time in an already-debited ration. With ticksPerDay1000 and foodUnitsPerPersonDay1 (`company/definitions.ts`), prior carry1 plus one live tick yields carry2 and zero additional whole rations. No time/seed/policy change is warranted.

The source revision with carry notEqual and ration quantity <=before is directionally correct, but parent requested an exact carry/conservation oracle. Requested minimal exact assertions for the three bound helper membership carries1→2, actual persisted quantity27 unchanged, root admission+1, retry physical unchanged and one terminal receipt. Reviewer has not run tests. Await author readback for this last assertion-only correction; prior focused/check results apply to the preceding source.

## Final elapsed settlement boundary readback

**ACCEPT (source), execution pending on this exact revision.** Exact food oracle now reads three bound helper carries1→2 and rations27→27, root admission+1; retry leaves physical state unchanged and one terminal receipt. This supersedes earlier strict-decrease and broad inequality wording.

The applicator's returned[] cannot by itself identify a worker race. This scenario's buildApp call supplies encounters but not encounterRealtime; app.ts gates realtime worker registration on the latter. A worker winner in the failed focused run is NOT_MEASURED and is not claimed here. A concrete alternative exists: effects.ts explicitly catches TerminalAwaitingLeadershipChoice and leaves that terminal pending.

Latest source handles that established boundary using the existing neighbouring test's ordinary HTTP flow: after an omitted first application, read the native marker; if still pending, GET each actor's leadership view, require candidates for each required choice, POST a real PERMANENT successor selection, then require successful application. It does not force a seed, inject an outcome or change food/leadership rules. Regardless of caller ownership, the test then strictly reads persisted applied marker, released/completed helper state, exact carry/ration/root tick and one receipt; another invocation must omit the encounter and leave physical state unchanged. Genuine missing settlement remains a failure. No outstanding concrete source finding in this scoped correction. Reviewer ran no tests/services.

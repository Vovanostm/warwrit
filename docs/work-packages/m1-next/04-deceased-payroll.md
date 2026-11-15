# N04 — Resolve a deceased member's lawful obligations

## Current result — 2026-11-08

SPECIFIED / LOCAL; deceased-member payroll/estate acceptance NOT_RUN. Ordinary
payroll is implemented. WLC-08 paid living Rell but did not allocate to deceased
Kest. This is an evidence gap, not a finding that all death payroll is broken.
Next: trace accepted accrual/claim/custody/disposition rules and actual saved debt.
[Common contract](COMMON.md). [Prompt](prompts/04-deceased-payroll.md).

## Payee decision — owner 2026-11-13

Studioigor decision #15 resolves the BLOCKED_SOURCE payee branch below. Unpaid
wages earned before death stay a company debt. They are paid to the fighter's
kin at Каменный Брод; the money leaves the game. No accrual after death. Unpaid
debt is visible in the company panel and the return report. Retained goods and
the exact settlement command still follow the existing custody rules.

## Player goal and trial

Understand what the company still owes after a member dies, who may receive it,
where the money is, and what can currently be settled.
Try: a company with an ordinarily recorded death → payroll/obligation view →
inspect the legitimate claim and accessible wallet → execute only an accepted
settlement/disposition → retry/reload/restart → unchanged once-settled result.

## Sources, dependencies and decision boundary

N01; existing #167/#174; [economy/payroll](../WP-02.3.md),
[death/lifecycle](../WP-02.2.md), [custody](../WP-02.4.md), actual
`company/payroll-*` and `economy-payments`/death consumers on the selected base.

Before activation, enumerate source-backed answers: earned debt at death,
future-accrual boundary, lawful payee/custodian, wallet/location access, disposition
command and ownership of retained goods. Do not infer these from a UI label.
If accepted rules provide no payee/disposition, prepare ONE bounded owner question
with the missing rule and recommended source-compatible option; mark that branch
BLOCKED_SOURCE. Do not invent an heir, sink, forgiveness, resurrection or tax.
This specification approves no new economic policy or funding amount.

## Behavior and state

Show actual unpaid/paid/held amounts and the relevant deceased identity without
presenting a backed remote hold as cash received. Preserve exact money. A lawful
settlement consumes only existing available authority/funds at the actual location.
A remote wallet, wrong company, inadequate funds or stale revision refuses unchanged.
An exact retry returns the stored result; conflicting body does not pay again.
Death does not silently delete pre-existing debt or extend/stop it under an invented
rule. Preserve the accepted causal accrual rule and explain unresolved disposition.

## Scope and architecture

IN: source-to-command reconciliation, complete existing accepted settlement path,
necessary truthful UI, access/idempotency/atomicity defects and persistence proof.
OUT: a new inheritance system, funerals, new wallets/currencies, another finance
engine, generalized all-member payroll refactor or changing old receipts.

Candidate paths: server `company/payroll-access.ts`, `payroll-observation.ts`,
`payroll-intent.ts`, `payroll-view.ts`, executor consumer; web `PayrollPanel`,
`payroll-presentation`, `use-payroll`; existing core economy death/payment owner
and focused tests. Freeze exact write set before changing shared command types.
Use the canonical transaction for claim/wallet/receipt; no partial disposal.

## Work plan

1. Read applicable dated death/payroll rules and trace one actual claim through
   authority, accrual, allocation and authorized observation.
2. Record current deceased member, earned/pending/held/paid values and actual
   wallet access. Absence of debt is not a successful payment test.
3. Close a concrete policy gap by source or one owner decision before activating it.
4. Implement only missing accepted consumer/UI behavior or reproduce that it works.
5. Exercise actual valid settlement and remote/insufficient/unauthorized refusal;
   real concurrent retry/conflict only where the transaction has an uncovered risk.
6. Reload/restart; show conservation of source funds, destination and obligation.
7. Record current result/limits and commit the coherent scoped change.

## Acceptance / DoD

- [ ] PAY-1 Every activated death/debt/payee/disposition transition has an explicit
      accepted source; missing policy remains visibly unactivated.
- [ ] PAY-2 Ordinary UI accurately distinguishes the deceased member's actual
      obligation, accessible cash, backed hold and paid outcome.
- [ ] PAY-3 A real eligible obligation is settled through its accepted command,
      or the package remains PARTIAL/BLOCKED_SOURCE rather than claiming payment.
- [ ] PAY-4 Money is conserved; exact retry/competing or stale requests cannot
      duplicate settlement, forgive debt or transfer funds to an unauthorized payee.
- [ ] PAY-5 State/receipts survive API restart and normal login; no released
      receipt/save is rewritten and no unrelated player funds are touched.
- [ ] PAY-6 Owning economic record and scoped evidence distinguish actual
      settlement, legitimate refusal, source decision and NOT_RUN cases.

## Verification

Use current public-boundary payroll tests and a real DB transaction if changing
payment/access. Browser evidence must include the actual deceased obligation.
Pure source review alone can close triage, not PAY-3/PAY-5 or this package.

## Implementation checkpoint — 2026-11-15

PARTIAL / LOCAL. The ordinary owned-company panel now reads known historical
members' actual predeath wage debt and offers its accepted settlement at Каменный
Брод. The authenticated command binds the caller, catches up stationary time,
consumes available company cash into the accepted sink and records its exact
receipt atomically. Rejected payment rolls back its catch-up savepoint. Existing
estate ownership remains with its canonical owner.

The retained N01 company has no deceased wage account. Living former member Mora
does not supply a death-payment case. Its UI can therefore establish the empty
state only. Actual PostgreSQL settlement/retry/refusal coverage is being prepared
in an isolated clone. Native eligible settlement, restart and PAY-3/PAY-5 remain
NOT_RUN. The shared entity-ID reader accepts historical JSON-shaped IDs within
the existing canonical bound.

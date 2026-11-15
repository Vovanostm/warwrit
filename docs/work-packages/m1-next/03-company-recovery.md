# N03 — Recover and replace company members after loss

## Current result — 2026-11-08

SPECIFIED / LOCAL; treatment/replacement journey NOT_RUN here. Rest/recovery and
recruitment already exist; WLC-08 did not prove medical treatment because its
physician died and survivors had no treatable condition.
Next: confirm lawful patient/provider/access on the integrated candidate.
[Common contract](COMMON.md). [Prompt](prompts/03-company-recovery.md).

## Player problem and observable result

After a costly battle the player needs to know who can work/fight, who needs care,
what resources are required, and how to fill a real vacancy.
Try: ordinary company/place → inspect a naturally wounded member → request
available accepted care → rest/recovery → return eligible member to FIELD →
recruit/equip/assign a replacement through existing services → next departure.

## Sources and dependencies

N01; existing #169/#171/#177; [lifecycle](../WP-02.2.md),
[physical/care](../WP-02.4.md), [economy](../WP-02.3.md),
[M1](../../wiki/m1-spec.md), [living places](../M1-LIVING-PLACES.md).
Read actual care/recruitment producers and condition capabilities at launch.
[N04](04-deceased-payroll.md) separately owns deceased-member money disposition.

## Full behavior and alternatives

Presence, duty and ability differ. A member may be alive yet unable to travel
or work; only canonical capability authorizes an action. Eligible care uses
actual provider, location, time, consumables/payment and accepted practice rules.
Care/assignment is not instant full healing. Death is permanent; no resurrection
or invented physician. If care is unavailable, display the actual missing
provider/access/resource and preserve state. Rest/transfer/recruitment options
remain available only when lawful.

Recruitment creates/adopts the actual existing candidate and unique equipment
ownership; no free new gear or cloned member. Company size and field-party size
are distinct; preserve the source-backed field maximum, not an invented roster cap.
Retreat/loss or a changed provider may interrupt eligibility; use the owner's
existing outcomes. Unknown command reply retains exact retry. Reload preserves
conditions, course/care state where relevant, duties, membership, money and items.

## Architecture and write scope

Reuse pure company/care/physical policy, server authenticated executor and real
service inputs. No care-specific second wallet/root or UI-side health clock.
Candidate paths: server `company/care.ts`, `recruitment.ts`, narrow ordinary-command/
observation consumers; web `CompanyCarePanel`, `CompanyRecoveryPanel`,
`RecruitmentPanel`, roster/item-transfer consumers; matching existing game-core
care/lifecycle preparations and tests. Reserve exact paths, including shared
protocol/export files. No released migration or serialization rewrite.

IN: complete treatment and ordinary replacement/return-to-duty path, actual
refusal feedback, saved-state defects. OUT: new injury model, balance changes,
new services, automatic inheritance, N04's disposition policy.

## Ordered work

1. Record actual patient, condition, provider/candidate, location and resources;
   identify which requirement is already implemented and which evidence is missing.
2. Observe refusal when a real prerequisite is absent; check no partial debit/change.
3. Reach a treatable injury and eligible provider through ordinary play. Use a
   disposable naturally created company if the retained party cannot lawfully do so.
4. Apply care, recovery/rest and FIELD return only after canonical eligibility.
5. Recruit through an actual local offer, equip from owned stock and assign;
   verify travel/battle ability rather than presence alone.
6. Retry one relevant lost response using the existing command path, then reload/
   restart and try departure; fix only reproduced gaps.
7. Commit each cohesive correction and record source/invariants/direct results.

## Acceptance / DoD

- [ ] REC-1 Ordinary UI explains each selected member's care/work/travel eligibility
      and required provider/resources without leaking another company's facts.
- [ ] REC-2 A naturally acquired treatable condition receives actual eligible care;
      real resource/time/payment effects and resulting condition are demonstrated.
- [ ] REC-3 Recovery/assignment and return-to-duty follow capability rules;
      no instantaneous healing or dead-member restoration is introduced.
- [ ] REC-4 A lawful replacement is recruited, equipped and assigned without
      duplicate identity/item or invented starting funds; subsequent departure works.
- [ ] REC-5 Missing provider/resources, stale state and duplicate command are
      handled atomically with truthful feedback and once-only effects.
- [ ] REC-6 Conditions, people, duties, items, money and care result survive
      reload/API restart. Record which party/world supplied each criterion.

## Checks and stop conditions

Use actual browser path and affected existing care/recruitment/transfer tests;
real SQL for any changed transaction. No mock healing to create acceptance.
An unavailable authorised provider is either a legitimate player refusal or a
specific missing source input; do not invent a new doctor to complete this task.
Continue independent recruitment/feedback work and report all residual blockers.

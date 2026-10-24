VERDICT: ACCEPT 42a4f583aa60162b0e3f5d107e6b161f16d901fd

## Findings

None for #319's allocated source boundary. The scoped diff changes only `payroll-access.ts`, `payroll-observation.ts`, and `payroll-access.test.ts` as source/test paths. `CHANGELOG.md` and `docs/engineering/CURRENT_PLAN.md` are coordinator-owned record edits at this successor HEAD.

## Played and checked

- Read #319 body and its last two comments, the complete #319 child and #167 parent contracts, AGENTS.md, the warwrit-review skill, prior round 1 reports, and `git diff origin/main...HEAD` at the allocated HEAD. The codebase graph indexes another checkout at `b44f5c1e`, so current source and core callers were read directly.
- Ran `pnpm exec vitest run apps/server/src/company/payroll-access.test.ts`: exit 0, one file, 30 tests passed. The test fixture uses the public combat aggregate; real `AdvanceCampaign` with stationary-food facts accrues wages, sequential real-core `Observe` prepares current confirmations, and real-core DEFAULT/TARGETED `PayClaims` produces exact debit, credit, cash/hold allocations, and refusals through public `@warwrit/game-core` exports.
- Round 2 specifically exercises a second existing pool backed by a distinct company wallet in another area while the carried purse and operator remain local. `preparePayrollAccess` refuses `CONTACT_OR_ACCESS_REQUIRED`; canonical input remains unchanged. Source lines `payroll-access.ts:111-115` separately validate purse and requested pool wallet locality, and `payroll-access.test.ts:248-275` preserves that regression.
- The focused cases also cover site/area and purse identity, missing/unavailable/bound operators, duplicate recipient wallets, uncontacted historical payee pending confirmation, held-to-cash settlement, insufficient spendable funds, deterministic unsaved preparation, stale/source-mismatched evidence, late-stage Observe failure without an exposed partial draft, an old root without optional physical data, and paired undisclosed remote outcomes. Source review found no direct finance mutation, public route, storage, or caller outside the three allocated paths.

## Boundary

This child prepares an unsaved server draft and has no endpoint or UI. Authenticated API, PostgreSQL atomicity, durable same-ID/lost-response/reload behavior, and 1440x900 day/night browser payroll acceptance are NOT_RUN and remain with C/#167. The default mill battle and `orca-play` runtime were not invoked under the specific no-runtime allocation; no screenshot or visual acceptance is claimed. Full suites, typecheck, coverage, migration tests, and build were NOT_RUN by this evaluator; coordinator validation reports its own separate checks.

# #272 — Scope identity rejection assertions to this test

## Scope

Owner request 2026-10-22: review and improve work and workflow; combat/UI/UX remains the product focus.
Source contract: https://github.com/Vovanostm/warwrit/issues/272 (read in full).
The current test compares global identity row counts while other PostgreSQL tests insert rows concurrently.
Observe only this test issuer and the explicitly attempted wrong issuer; count sessions through their owning accounts.
Preserve rejected callback status/cookie assertions, valid parallel login, logout, expiry, and rejection atomicity.
No production auth, schema, migration, dependency, or global parallelism change.
Coordinator reserved this file in msg_823a93a45ecb; builder/resource handover is still pending.

## Changes

Own only apps/server/src/auth/oidc.integration.test.ts and local evidence under .orca/core-oidc-count-isolation/.
Replace the two global counts with the same finite test-owned query, using existing Kysely SQL and issuer values.
Include the intentionally wrong issuer: scoping only to the valid issuer would hide its invalid-token side effect.
Prefer one small query helper to duplicate SQL. No framework or extra suite.
Coordinator alone owns CHANGELOG.md and CURRENT_PLAN.md; supply exact update text before the source commit.

## Data

The local issuer binds a runtime-assigned loopback port; its URI and URI + /wrong are test-owned.
Existing accepted account is parallel-account; rejected token subjects may be random.
Sessions are attributed by account_id to those test-owned issuers, not by global count or cookie presence alone.
No real accounts, credentials, or shared development database are used.

## Proof

Use existing compose.yaml in a uniquely named disposable PostgreSQL project and dynamic loopback port.
Run all existing server integration test files five times sequentially, with their ordinary parallel workers enabled.
Set identity, encounter and company test database URLs to the same owned database; apply existing migrations.
FIRST HUNT has an explicit isolated-database contract: create a second database on the same owned PostgreSQL for that one file.
One test-only mutation inserts an account for the rejected wrong issuer before the final count and must fail that assertion.
A separate mutation inserts a session for this test account before the final count and must fail that assertion.
Restore both mutations, then complete the five parallel-suite passes on the final code.
Run server typecheck, changed-file format, and ordinary commit audit. Independent reviewer inspects final diff/proof.
Use existing process and DB cleanup; remove only this task-owned Compose project.
Full game/build/stress/browser checks NOT_RUN: no game behavior or UI changes.

Exact runner commands (dynamic port read once, local test credentials from compose.yaml):

```bash
POSTGRES_PORT=0 docker compose -p warwrit-oidc-272-20261022 -f compose.yaml up -d --wait postgres
docker compose -p warwrit-oidc-272-20261022 -f compose.yaml port postgres 5432
# DATABASE_URL uses the returned loopback port and compose.yaml warwrit test account.
pnpm exec tsx apps/server/src/db/migrate.ts up
docker compose -p warwrit-oidc-272-20261022 -f compose.yaml exec -T postgres createdb -U warwrit first_hunt_272
# Apply the same migrations once with DATABASE_URL targeting first_hunt_272.
# Export IDENTITY_TEST_DATABASE_URL, WARWRIT_ENCOUNTER_DATABASE_URL and WARWRIT_COMPANY_DATABASE_URL = DATABASE_URL.
# Export WARWRIT_FIRST_HUNT_ISOLATED_DATABASE_URL = the separate first_hunt_272 database URL.
for run in 1 2 3 4 5; do pnpm exec vitest run apps/server/src/auth/oidc.integration.test.ts apps/server/src/company/executor.integration.test.ts apps/server/src/company/routes.integration.test.ts apps/server/src/company/supplies.integration.test.ts apps/server/src/encounters/postgres.integration.test.ts apps/server/src/world/continuous-movement.integration.test.ts apps/server/src/world/routes.integration.test.ts apps/server/src/contracts/company-transition.integration.test.ts || exit; done
pnpm --filter @warwrit/server typecheck
pnpm exec prettier --check apps/server/src/auth/oidc.integration.test.ts
POSTGRES_PORT=0 docker compose -p warwrit-oidc-272-20261022 -f compose.yaml down --volumes
```

Mutation runs use only the OIDC file on this private database; both assert the intended count failure.
A shell EXIT trap owns the final compose cleanup; no shared stack is started or stopped.
Tier L remains coordinator-owned fresh reviewer plus evaluator; this author evidence does not replace either.

## Questions

No product question. Waiting for coordinator contract acceptance, builder/resource assignment and shared-record handoff.

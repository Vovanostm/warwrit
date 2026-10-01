# M1 local company opening and re-entry

**Status (2026-09-29): focused company opening and persisted browser re-entry
verified on the isolated local stack. Full M1 remains active and unaccepted.**
The company hashes and successful focused checks below are historical evidence
for that company-opening correction only; they do not cover the current dirty
travel candidate. Sol has two open core findings: the departure wrapper must
require a supplied bounded segment ID, and transit-food IDs must remain bounded
for maximum valid membership/route identities. The latest travel core build is
`NOT_MEASURED` (its exit code was not captured), earlier travel focused tests
are stale, and no server travel route or PostgreSQL travel integration exists.
The corrections, maximum-ID `AdvanceCampaign`/aggregate-reader regression,
captured final checks, hash refresh, and Sol re-review remain pending. See the
[primary handoff](/Users/vovanostm/learn/warwrit/docs/engineering/NEXT_SESSION_HANDOFF.md)
before continuing.
Player two signed in through the task-local Dex service, loaded opening options,
created company `f74d5051-2fb2-46bf-b1d3-587bc76e658a` (HTTP 201), reloaded it
(HTTP 200), signed out (HTTP 204; the next session read returned 401), and
signed in again. The same company and two known members returned: Lena (leader)
and Rell. Unselected candidates were absent. This does not prove process-restart
recovery, travel, contract, battle, consequences, or the full M1 journey.

## Local stack and evidence

The checkout is `/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06`,
branch `codex/m1-company-storage`, HEAD
`4489db47728d1b72794436df8eafb0cfdbd97d31`, with broad pre-existing dirty work.
Preserve all unrelated edits and untracked files. Do not rebase or use broad
staging. The last preflight tree was `cd54141eb88d030ebb8db8e680e828f0df1c734a`;
it predates the narrow final correction and new screenshot.

The isolated PostgreSQL container `warwrit-alpha-company-h-postgres-1` listens on
`127.0.0.1:32778`. The isolated Dex container `warwrit-alpha-c06-dex` listens on
`127.0.0.1:5559`; its read-only bind mount is the ignored mode-600 file
`.tmp/c06-identity/dex.yaml`. Keep the file private. The app's task-local
environment is retained in ignored mode-600 `.tmp/c06-identity/app.env`; it
contains database/OIDC values and must not be printed or committed. The backend
and Vite processes remain live in sessions `65787` and `87048` on ports 5190 and 5191.
The last probes returned HTTP 200 from `/health/live`, `/health/ready`, and the
web root. Reuse these services; do not restart them blindly. If the isolated Dex
container has stopped, `docker start warwrit-alpha-c06-dex` reuses its existing
private config and data volume. To recreate the server from the retained
environment, run this from c06:

```bash
set -a
source .tmp/c06-identity/app.env
set +a
pnpm --filter @warwrit/server dev
```

Start the web shell in another terminal:

```bash
WEB_PORT=5191 API_PROXY_TARGET=http://127.0.0.1:5190 pnpm --filter @warwrit/web dev
```

The private env file was reconstructed from the live 5190 process for reuse;
fresh startup from it has not been separately tested. It also sets
`WARWRIT_COMPANY_DATABASE_URL` for the integration test below. Use Node `24.20.x`
and pnpm `11.25.x`.

The sanitized final screenshot is
[`c06-company-after-relogin.png`](../../output/playwright/c06-company-after-relogin.png)
(SHA-256 `f30166cc3178d7e35c66e781e4cac9a58330dd0a9b6f81cdfb67b5c9300d4766`).
The Playwright method/path/status list showed opening-options 200, company
command 201, company GET 200, logout 204, post-logout session 401, and after
re-entry session 200 plus company GET 200. Raw Playwright session files,
callback URLs and OIDC state, cookies, and the Dex config are local-only and must
not be included in a handoff or commit. The earlier signed-out/unavailable-state
image `output/playwright/m1-player-entry-unavailable.png` is from UI route mocks;
the pending-logout and HTTP 503 results remain mock evidence.

Manual sequence: open `http://127.0.0.1:5191`, sign in with the retained second
fixture account in `docs/engineering/ID01-IDENTITY.md`, confirm Lena and Rell,
reload, log out, sign in again, and confirm the same roster. For fresh creation,
use a disposable account without a company; player one has an older diagnostic
company and player two owns the verified company, so neither is suitable for a
fresh create until the pre-authorized diagnostic cleanup is proven safe and
transactionally completed.

## Focused verification

Author-run checks for the final correction:

```bash
pnpm --filter @warwrit/game-core build
pnpm exec vitest run packages/testkit/src/company-lifecycle.spec.test.ts
set -a; source .tmp/c06-identity/app.env; set +a
pnpm exec vitest run apps/server/src/company/routes.integration.test.ts
pnpm exec prettier --check packages/game-core/src/company/lifecycle.ts packages/testkit/src/company-lifecycle.spec.test.ts apps/server/src/company/routes.integration.test.ts
git diff --check -- packages/game-core/src/company/lifecycle.ts packages/testkit/src/company-lifecycle.spec.test.ts apps/server/src/company/routes.integration.test.ts
```

Outcomes: core build passed; lifecycle specs 23/23 passed; real-PostgreSQL route
integration 2/2 passed with the local DB URL supplied; formatting and scoped
whitespace checks passed. The route file skips both cases when the URL is unset,
so that run is not verification. Sol reviewed the frozen correction and found no
actionable regression; parent verified the frozen hashes and inspected the
re-entry screenshot. These are separate author, review, and visual evidence.

Frozen code hashes:

- `packages/game-core/src/company/lifecycle.ts` —
  `6dac7e4da4df5ab65f91bf3e77f37ef7fc070f3e210084355d75f2a09ae781f4`
- `packages/testkit/src/company-lifecycle.spec.test.ts` —
  `7bb6060d285cca5fce690f81ca447e401b5db1c4832609067fea5e81046756fb`
- `apps/server/src/company/routes.integration.test.ts` (pre-existing local file,
  unchanged in this correction) —
  `f5f70b8794045417ac44d72cae635a677fc4128975cb4d50aa1f65a69a995c6b`

No full `pnpm verify`, combat stress test, migration smoke, process restart,
owner playtest, or exact-tree delivery gate ran. The pre-fix disposable
diagnostic company `cae82c33-ac61-4118-80b9-b62b1c33bcf2` remains in the local
database; it was not deleted because its exact ownership/dependency backup and
transactional cleanup were not verified. Its bounded cleanup is already
authorized by parent, but those safety preconditions remain incomplete. The
working player-two company and all accounts remain intact. No released root was
backfilled.

## Remaining M1 work

Travel and all later journey dependencies remain unimplemented/unverified. The
approved next travel task is `safe-travel-alpha-v1`: one bounded safe trip of 10
ticks (3m36s at the current clock), preserving the existing 1000-tick/6-hour
definition, carried food, and existing stamina. The approved effect direction
is that the trusted arrival transaction settles through the stored due tick and
a late request must not charge extra transit. This is a next-task direction, not
the final design, implemented travel, or accepted product behavior. Do not begin
it without the next session's source/ownership checkpoint.

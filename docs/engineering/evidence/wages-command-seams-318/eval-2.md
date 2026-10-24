VERDICT: ACCEPT 36b6aa5ea140b99a2de6a1a91a9adb7de27ce966

## Result and boundary

2026-10-24, independent Tier L evaluation, environment retry 1. The corrected
campaign environment supported real fixture authentication, issued company
opening, equipment, begin/end field camp, stale-state refusal, ordinary retry
and reload. No reproduced source defect. ACCEPT applies only to child #318's
unchanged ordinary-command seam; it does not close #167 or its payroll gates.

Read AGENTS.md, warwrit-review/playwright skills, the complete child and parent
contracts, eval-1.md/review-1.md, current plan/changelog and technology guidance.
Queried only #318/#167 bodies and their latest two comments. Graph metadata
still points to the other checkout at b44f5c1e; current source is authoritative.
HEAD matched the allocated SHA throughout; tracked tree was clean.
`git diff --exit-code c017d1b1 HEAD -- apps packages` passed: source is unchanged
from the reviewed implementation. Review ACCEPT at 771fcb07 remains inherited
evidence, not a newly performed source review. No epic contract was invented.

## Authenticated ordinary journey

Started the supplied `bash .orca/campaign-318/run.sh` once in retained exec
session 84361. Its port guard passed; my API `/health/ready` probe returned 200.
No combat runner, install, setup, build, source patch or synthetic session used.
Opened the real root page in isolated headed Chrome session `wages318eval2`.
Clicked «Войти», completed Dex with the documented public player-one fixture,
and returned to the real company opening. Selected Rell, named the leader
«Эрвин» and company «Серый Дозор», then clicked «Открыть компанию».
POST `/api/company/commands` returned 201; authenticated session/company GETs
returned 200. Company ID: `77c7a3bf-ad6e-4761-b8c8-3c4e6cbceb74`.
Opening revision 1 had 850000000 q, 30 rations and no equipped items.

All following mutations were visible-control actions against the actual
browser → API → allocated PostgreSQL path:

| Action                                               | Request / response                                                              | Independent readback                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| «Отряд» → Rell sword «взять»                         | a5050d7c-3cb2-4a16-9f1a-4a45d70af300; expected 1; HTTP 200, ok true, revision 2 | GET shows sword equipped; PG ItemEquipped audit and matching durable receipt                                                      |
| «Место» → «Разбить лагерь»                           | fecb1966-d06a-41fb-8c3e-7a985ffff4cf; expected 2; HTTP 200, revision 3          | GET fieldCamp true; visible camp explanation and «Свернуть лагерь»; PG FieldCampBegun                                             |
| «Свернуть лагерь»                                    | fc596fa0-ecce-4569-aa53-e4aeb668c3ec; expected 3; HTTP 200, revision 4          | GET fieldCamp false; PG same agreement started at tick 15, ended/knownEndedAt 16, FieldCampEnded                                  |
| Rell shield «взять» in first tab                     | bc3a55e4-4354-4c11-8992-73f743e45ac6; HTTP 200, revision 5                      | GET/PG equip OFF_HAND                                                                                                             |
| Rell coat «надеть» in second tab still at revision 4 | b6a6342b-4cf9-4daa-baf3-a6164bcf346f; HTTP 409, STALE_REVISION, revision 5      | Visible «Состояние отряда изменилось. Данные обновлены — повторите.»; full PG snapshot/receipt/audit reads before/after identical |
| Repeat «надеть» after automatic refresh              | e31c59f7-43a4-47d7-b096-b6f9dde42c0b; expected 5; HTTP 200, revision 6          | Coat equipped in GET and PG; one additional receipt/audit                                                                         |
| Reload second tab; return to «Отряд»                 | Session and company GET 200, revision 6                                         | Rell sword/shield/coat still equipped; camp false; treasury 850000000 q                                                           |
| Leader sword in first tab still at revision 5        | 5a5b8f77-e656-491d-a4d5-c399b0c1ed7b; HTTP 409, STALE_REVISION, revision 6      | Visible refusal; second full PG before/after comparison identical                                                                 |
| Repeat leader sword «взять» after refresh            | 996f290c-0f2c-468e-ab53-2e38adaf7a15; expected 6; HTTP 200, revision 7          | Leader sword equipped; final PG 7 receipts / 11 audit events, no receipt/audit for either refusal                                 |

The second refusal/retry repeated the same observable scenario because the
new tab initially used Playwright's default viewport. Retained screenshots are
all verified 1440×900; the final refusal/retry captures use the original tab at
that size. This is an evidence-capture correction, not a source/runtime failure.
The ordinary UI retry generates a new command ID after a definitive refusal;
it is not a lost-response or same-ID replay claim.

PG inspection used only SELECTs within `BEGIN READ ONLY` against this issued
company. Retained full snapshot/receipt/audit comparisons prove no domain
mutation on each refusal. Final root also contains the same ended camp and
physical equipment represented by GET. No SQL-created gameplay state or
clock/rule modification was used for the browser journey.

## Missing affordances and focused proof

RenameCompany and ChoosePerk have no controls in the current web source;
CompanyPanel exposes equipment and GameShell exposes camp. App.tsx sends
equipment/camp requests with the existing expected-company header. No rename
or perk click is claimed, and no new UI requirement or regression is invented.
To cover these unavailable UI paths and exact replay independently, I ran the
existing focused integration file against real PostgreSQL:

```text
source .orca/campaign-318/environment.sh
pnpm exec vitest run --mode integration apps/server/src/company/executor.integration.test.ts
exit 0 — 1 file, 11 tests passed, zero skips; duration 3.81 s
```

The existing runner created and disposed its own migrated integration database.
The five ordinary scenarios executed: persisted rename/perk with receipts and
audit; equipment access; begin/end camp including EndMaintenance/LEAVE and
duplicate-transition refusal; invalid/access/unsupported refusal without writes;
historical exact replay before stale revision/advanced clock, changed-body
conflict and foreign-account refusal. Six existing trusted-path regressions
also passed. These tests are my executed evidence; supplied builder 11/11 and
coordinator validate 9/9 remain separately inherited evidence.

Replayed/residual prepared-draft guards remain source-reviewed, not separately
injected runtime branches. Typecheck/lint/full suites/coverage/stress/builds:
NOT_RUN by this evaluator; source was unchanged and no additional code gate was
needed for this environment retry. #167 actual payroll, payment modes, insufficient
funds, committed-response loss, recovery/restart and day/night acceptance remain
NOT_RUN here. The ordinary reload is not payroll reload acceptance. No Tier V
verdict, mill-battle substitute or full-M1 completion is claimed.

## Evidence

All paths below are local, untracked evidence under
`.orca/wages-command-seams-318/eval-shots-2/`:

- `01-company-before.png`, `02-equipped.png`, `03-camp-begun.png`,
  `04-camp-ended.png`, `05-stale-refusal.png`, `06-ordinary-retry.png`,
  `07-reloaded-company.png`: own 1440×900 captures. Equipment/camp/refusal/retry/
  reload results were visually inspected; no visual-style rubric is implied.
- `http-*-readback.json`: opening/equipment/camp/retry/reload actual response bodies;
  `http-stale-{request,response}.json` and `http-retry-{request,response}.json`
  retain the final leader-sword refusal/retry. These contain no session headers.
- `pg-before-refusal.json` / `pg-after-refusal.json` and their `-1440` counterparts:
  direct equality comparisons passed; `pg-after-retry.json` records revision 6;
  `pg-final.json` records revision 7. `read-pg.cjs` is private read-only evidence
  collection, not a tracked runtime change.
- `executor-integration.log`, `processes.json`, `cleanup.json`.

One late response-body export after reload returned an empty historical body,
so its JSON parse failed. The live earlier response had already been read; the
final retained refusal/retry files were captured before navigation and all
retained HTTP JSON parsed successfully on readback. This tooling miss is not
reported as a source failure or as passing evidence.

## Cleanup and ownership

- Launcher PID 81327; exact runtime.pids children 81338 (API/realtime) and
  81339 (Vite); additional app descendant 81341 (esbuild).
- Browser daemon 82175; Chrome 82178; observed browser descendants 82199,
  82200, 82201, 82203, 82204, 82205 and 88425. Private profile:
  `.orca/wages-command-seams-318/eval-shots-2/browser-profile`.
- Session-specific close exited 0. Sent TERM only to recorded app children
  81338/81339 and awaited retained launcher session: exit 0. Its trap removed
  runtime.pids. All 13 recorded app/browser PIDs were directly probed absent;
  the closed private profile was then removed.
- Final lsof: no listeners on API 23732, web 25732 or realtime 23734.
  runtime.pids and profile absent. Dex 23733 and PostgreSQL 32775 still had
  listeners; no container lifecycle or shared cleanup command was executed.
- Final frozen HEAD, clean tracked status, ordinary diff and source comparison
  passed. No source/tests/shared records, commit, push, PR, label or Orca action.

## Proposed coordinator update

“2026-10-24, Vovanostm/wages-command-seams-318, LOCAL: evaluator retry ACCEPT
at 36b6aa5e on unchanged c017d1b1 source. Real Dex opening, equipment/camp,
atomic stale refusal, ordinary retry and reload verified with API/PG evidence;
independent focused real-PG run 11/11 PASS. Rename/perk have no UI affordance
and are executor-tested. Own runtime/profile cleanup verified; coordinator
containers retained. #167 payroll/lost-response/day-night acceptance and
publication/merge remain pending.”

Shared CHANGELOG/CURRENT_PLAN/wiki remain coordinator-owned and were not edited.

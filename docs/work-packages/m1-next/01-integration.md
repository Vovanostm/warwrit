# N01 — Reconcile and verify the integrated candidate

## Current result — 2026-11-09

PARTIAL / LOCAL / COMMITTED candidate; NOT_PUBLISHED, NOT_MERGED, M1 NOT_ACCEPTED.
Integration commit `e8784c1c0479c10f1295e07269b99a5c5c454770` merges current main
`3c55cf35966d2cd119b42d107152b85567c72f4b` into PR430
`d22336a423eaf96e32197e6252bed9a3820dde0b`, preserving both parents and PR429
`b58c87ce3f489484a9fd8cdf1eecf2efd8c6203b` ancestry. Live refs rechecked on
November 9 Moscow time: unchanged. Both source PRs remain OPEN; their original
branches/worktrees are untouched. This is a separate reviewable candidate,
`.claude/worktrees/n01-integration`, branch `codex/n01-integration`.
The final closeout changes documentation only after checked `e8784c1c`.

### Selected scope, ownership and compatibility

INT-1–6, serially. The only merge conflict was additive `CHANGELOG.md` text;
retain both records. Main's additional PR428 authorization is documentation only.
`git diff d22336a4 HEAD -- apps packages scripts pnpm-lock.yaml package.json
.env.example .github` is empty: no application rewrite, dependency change,
content/map assignment, replay reinterpretation or new migration.
Migration0022 is released and unchanged; candidate0023 adds only map authoring,
0024 the opt-in QA journal,0025 the persistent QA simulation offset. Ordinary
worlds default to zero offset; used clocks/journals refuse destructive rollback.
Company schema1, command schema2, `s02-domain-provisional-0.2`, lifecycle catalogue1,
world `world.porechye.atlas-v1`/atlas-v6, bridge-v5 encounters and existing historical
replay versions remain unchanged. No prior WLC casualty/result was edited.

Owned exact paths: `AGENTS.md`, `CHANGELOG.md`, `docs/engineering/ROADMAP.md`,
`docs/engineering/ROADMAP_HISTORY_N01.md`, `docs/engineering/WLC_08_ACCEPTANCE.md`,
`docs/work-packages/m1-next/COMMON.md`, this file and `prompts/01-integration.md`.
`COMBAT_LAB_CONSOLIDATION.md` is inherited from main without an author rewrite.
The [prior roadmap](../../engineering/ROADMAP_HISTORY_N01.md) is preserved verbatim;
the checkbox index and root amendment retain November 8 navigation/advisory policy.
The exact supplied COMMON/launch inputs are included, without other N-package work.
Primary sprite WIP, original WLC source worktrees, retained saves and other stands
remain untouched. No subagents, messages, deployment, auto-merge or paid resources.

### Player result and direct acceptance

Ordinary Dex OIDC (`player-one@example.test`) → naturally create **Дозор N01**
with leader **Дозор**, Rell and Kest → atlas → Place/elder → accept **Когда молчит
мельница** → Rell sword/shield equipped → Barn purchase10rations for40crowns.
Result: company `eb855f6f-ab02-42ca-9eef-a82b2c6830bf`, all three alive,
760crowns,37rations, both companion wallets50, accepted four-objective contract.
Logout → stop/restart owned API/web → readiness200 → ordinary OIDC login restores
that company, people, equipment, money, inventory, world/location and contract.
No quick fixture login, forged session, gameplay SQL edits or accelerated time.
Chromium viewport measured1440×1000; Place/Map/Company controls were exercised.
This proves entry/re-entry, not completion of this contract or a new combat loop.

| AC    | Result  | Actual evidence on checked e8784c1c executable tree                                                                                                                                                                                                                                                                                                                 |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INT-1 | PASS    | main and PR429 are ancestors; no unresolved index entries; both additive records retained; executable diff against PR430 empty.                                                                                                                                                                                                                                     |
| INT-2 | PASS    | New ordinary company/contract/equipment/purchase above;18canonical table groups exactly equal across actual process restart before new login observations. Native re-entry retains company and resources; normal later observations accrue time normally.                                                                                                           |
| INT-3 | PASS    | Fresh web/server production builds with development `.env`; no executable debug browser API/UI or server route modules. Running production artifact:16GET/POST debug requests return404;18ordinary canonical groups unchanged. Production browser `/dev/playground/combat` shows **Инструмент недоступен**.                                                         |
| INT-4 | PASS    | Fresh existing SQL editor/Lab tests cover owner/origin/session, clone/freeze, exact retry, ordinary genesis conservation, current replay MATCH/corruption and old-content refusal. Source uses the same canonical encounter executor with isolated storage; no map or replay code changed. Prior WLC native Lab/editor runs are inherited evidence, not rerun here. |
| INT-5 | NOT_RUN | Schema portion PASS: real migration smoke/legacy rollback guards and an owned naturally-created save dump restored into isolated copies;25→22→25 preserves all18canonical groups exactly. A pre-existing owner save has no identified authorized source; its save-specific migration/login proof remains open. No legacy-save failure was reproduced.               |
| INT-6 | PASS    | Scoped diff/self-review, owning WLC record, current N01 and concise changelog updated; local commits and prepared review description/patch, no remote publication or merge claimed.                                                                                                                                                                                 |

### Actual checks and limits

- `pnpm install --frozen-lockfile`: PASS, Node24.20.0/pnpm11.25.0, lockfile unchanged.
  Shared core/protocol/testkit builds PASS. Fresh production server/web builds
  include successful server/web typechecks. Existing >500kB chunk advisory remains.
- `DATABASE_URL=<owned stand> pnpm exec tsx scripts/run-migration-smoke.ts`: PASS,
  separate allocated DB, complete up/down and existing legacy/data/rollback guards.
  `pnpm check:migrations`: PASS, no released migration changed since live main.
- `pnpm exec vitest run --mode integration --maxWorkers=1` with explicit owned
  DATABASE_URL, exact four files: `apps/server/src/map-editor/routes.integration.test.ts`,
  `apps/server/src/playground/routes.integration.test.ts`,
  `apps/server/src/playground/campaign-time.integration.test.ts`,
  `apps/server/src/encounters/postgres.integration.test.ts`:40PASS /4files,
  including pure guards; real per-file PostgreSQL databases allocated/disposed.
- Focused unit command:51PASS /3actual files (`config.test.ts`,
  `encounter/connection.test.ts`, `combat-lab/BattleView.test.tsx`). The supplied
  `playground/Playground.test.tsx` filter has no file; no check is claimed for it.
- Production distribution scan,16HTTP refusals and18-group conservation PASS.
  `pnpm check:architecture`, scoped Prettier/links and `git diff --check`: PASS.
- Own save: `pg_dump -Fc`/`pg_restore`, copy migrations0025down/0024down/0023down,
  then up0023–25 PASS. Exact readback compares an independently restored original
  dump against the migrated copy, not a live source that has since observed time.
  This is not historical-player-save compatibility or the full durability package.
- Fresh full WLC08 combat/proof/payment loop, full suites/coverage/stress/CI,
  independent review, human/target-device acceptance and old owner-save re-entry:
  NOT_RUN. Historical WLC08 evidence remains dated and unchanged.
  FPS, heap, capacity and enjoyment: NOT_MEASURED. No full M1 claim.

Environment/probe failures: Docker's default subnet pools were exhausted; used
an exclusive10.249.1.0/24 override without deleting other networks. Playwright's
shared npm cache refused writes; used an owned ignored cache and closed the first
owned browser. One stale UI reference was refreshed after successful purchase.
A diagnostic query used nonexistent `revision`; corrected to `public_revision`,
without data mutation. An early readiness request raced restart (000), then200.
Initial live-source/copy comparison differed after legitimate login observations;
the original-dump versus migrated-copy comparison subsequently passed exactly.
Expected unauthenticated401/favicon404 browser console entries are not gameplay
PASS evidence. No reproduced product defect requires filler code.

### Reproduction, retained resources and delivery

Owned project `warwrit-n01-20261108`: PostgreSQL54901, Dex55901,
API33901/realtime33902/web53901; production probes33911/53911.
Ignored `.env`, `output/dex.dev.yaml` and `output/compose-network.yaml` retain the
public development setup. Restart from this worktree:
`docker compose -f compose.yaml -f output/compose-network.yaml up -d --wait postgres dex`,
then `pnpm dev`; open `http://127.0.0.1:53901`, **Войти**, fixture account/password
from LOCAL_DEVELOPMENT. Use the same issuer/account/world/database.
Do not use volume deletion/reset. Own processes/browser sessions are closed;
Compose containers/network stopped, database/Dex volumes and save dumps retained.

Raw evidence (ignored): `output/integration.log`, `migrations.log`,
`save-upgrade.log`, `save-readback.log`, `restart-before.json`, `restart-after.json`,
`production-refusal.log`, production build logs and `output/playwright/n01-*.png`.
The migration/readback helpers remain under `output/.worktree-tools/`.
Review description and committed candidate patch: `output/n01-pr-description.md`,
`output/n01-candidate.patch`. No existing PR/source branch was updated.

Open blocker: authorized pre-existing owner save/dump and company identity are
not provided. Recommendation: supply a read-only source and scope, restore only
to a new owned database, then run its ordinary login and0022→25 readback before
closing INT-5. The newly created N01 company and schema evidence remain valid.
No pending CI result is a gameplay blocker; no merge/deployment permission sought.
One next task: finish that isolated historical-save compatibility evidence.
Graph fallback: indexed Warwrit is old primary sprite7841632a, not this candidate;
no fresh matching index was available, so bounded source reads were used.
[Common contract](COMMON.md). [Launch](prompts/01-integration.md).

## Player problem and outcome

Useful features are spread across an integrated candidate and main. The player
needs one coherent ordinary game, with authoring tools isolated from it.
Observable outcome: normal sign-in reaches the same durable company and a real
journey on one reviewable candidate, while production excludes debug tools.
Try: ordinary login → company → map/place → accepted contract; restart/re-enter.

## Sources and existing owners

- [M1 scope](../../wiki/m1-spec.md), [ADR0006](../../architecture/0006-m1-renderer-babylon.md).
- [PR429](https://github.com/Vovanostm/warwrit/pull/429) and
  [PR430](https://github.com/Vovanostm/warwrit/pull/430), actual live heads/diffs.
- At the selected live ref, read `docs/engineering/WLC_08_ACCEPTANCE.md`,
  `UNIFIED_MAP_EDITOR.md`, `COMBAT_LAB_CONSOLIDATION.md`,
  `SERVER_AUTHORITY.md` and isolated setup in `LOCAL_DEVELOPMENT.md`.
  Some are absent in this old primary checkout; use `git show <ref>:<path>`
  before choosing a working base. No copying an obsolete implementation.

## Behavior, alternatives and persistence

Keep ordinary entry as the player entry. Protected Playground has explicit debug
identity, sandbox ownership and production exclusion. Editor content publication
does not silently assign a new map to retained worlds. Campaign and lab use the
selected authoritative rules and renderer; old replay versions stay readable.
Invalid/stale/unauthorized commands explain refusal and leave canonical state
unchanged. Lost responses retain exact retry; reload is observational.
Keep actual failed runs and casualties. Conflict resolution cannot erase them.

## Scope, architecture and compatibility

IN: reconcile PR429/430 with actual main, preserve both feature histories, fix
integration defects, verify production/debug separation, launch/readiness and
save/replay/migration compatibility. OUT: redesigning maps, new combat rules,
all M1 content, unrelated CI cleanup, merging/deploying without explicit authority.
Use the existing monolith/executor/protocol; no second simulation or persistence root.

Candidate write scope: only actual conflict/defect files within existing
Playground/editor/renderer/server authority/build configuration and directly
affected tests/docs. Reserve each file first. Never take the entire package tree.
Migration `0022` is released at the recorded baseline; re-read the ledger before
accepting candidate migrations `0023`–`0025`. Never renumber/edit a migration already released later.

## Work plan

1. Record live heads, PR state, ownership and executable vs documentation changes.
2. Choose the existing integration branch with its owner's consent/authority,
   or reserve a separate persistent candidate; reconcile dependencies serially.
3. Resolve each conflict according to newer owner decisions and actual consumers.
   Preserve November 8 roadmap/advisory-check amendments even if main's docs lag.
4. Inspect migrations and content/replay versions; check existing saves in an
   isolated authorized copy without rewriting the source save.
5. Run affected focused checks; build production only to prove debug exclusion.
6. Try normal login/map/company/contract entry and restart; recheck only changed
   parts of WLC-08. Record prior unchanged evidence as inherited, not rerun.
7. Self-review and prepare the exact candidate diff, actual evidence and PR update.
   Stop at review readiness unless this actual merge is explicitly authorized.

## Acceptance / DoD

- [x] INT-1 Current candidate has no unresolved textual or semantic conflicts with
      its recorded base; exact dependencies, owned changes and compatibility are recorded.
- [x] INT-2 Normal entry and re-entry retain company/people/money/items/world;
      map/place navigation remains usable without a data reset.
- [x] INT-3 Production web/server artifacts exclude executable debug entrypoints;
      direct debug API requests refuse, with no ordinary-world mutation.
- [x] INT-4 Editor/Lab checks stay sandbox-scoped; no content reassignment to
      existing worlds, reinterpretation of old replay, or duplicate canonical writer.
- [ ] INT-5 Relevant real DB migration/readback evidence covers actual schema
      changes; a legacy-save failure is fixed or explicitly keeps this row open.
- [x] INT-6 Scoped diff, owning docs and CHANGELOG are reviewed/recorded;
      publication/merge state is truthful. A candidate ready for review is not merged M1.

## Direct checks and blockers

Use existing focused conflict/production/SQL regressions and ordinary browser entry.
Do not rerun full suites solely for advisory CI. A retained DB's unavailable owner
blocks only its save-specific proof; use isolated data for independent checks.
A conflicting writer requires path coordination. Missing merge permission does not
block candidate preparation and is not a reason to stop earlier.

# N01 — Reconcile and verify the integrated candidate

## Current result — 2026-11-09

DONE / MERGED; INT-1–6 PASS under the owner-authorized new-player-save fallback.
[PR430](https://github.com/Vovanostm/warwrit/pull/430) merged on2026-11-09 at
00:18:43 Moscow as `9a1bcc4270a63d4ef753a666a52312e3829f9621`, with expected head
`a5a4ef2ce283fa4a3dcce38449e779469a084855`. GitHub readback confirms CLOSED/MERGED,
actual merge SHA and main at that merge. Reviewed candidate and merged content
match (empty diff). GitHub also marked PR429 MERGED; its exact head
`b58c87ce3f489484a9fd8cdf1eecf2efd8c6203b` is an ancestor of main.
M1 NOT_ACCEPTED; no deployment or historical-owner-save acceptance is implied.

Worktree `.claude/worktrees/n01-integration`, branch `codex/n01-integration`.
Original candidate PR430d22336a4 was reconciled with main3c55cf35 by local merge
e8784c1c, preserving both feature histories. Only documentation followed the
checked executable tree. Publication fast-forwarded the existing PR430 branch
without force; original WLC worktree files and dirty primary sprite WIP were
preserved. This documentation-only receipt records the actual merge, with no
application/schema/data change and no repeated game checks.

### Owner continuation and merge authority — 2026-11-09

The owner explicitly requested: «Доведи задачу до конца + merge. если надо — сделай
новый player save». This supersedes the initial launch's no-merge boundary for
this N01 mission and authorizes publication/merge through existing PR430, plus
its necessary documentation-only delivery receipt. It grants no deployment,
auto-merge, paid provisioning or retained-player-data edits.

Use the naturally created N01 player save and its isolated migrated copy as the
accepted fallback. The unavailable older owner-save check remains NOT_RUN; it
no longer blocks this scoped N01 completion. No historical failure is erased or
relabelled. Merge must pass the current exact PR head to GitHub, with reviews and
unresolved threads read immediately before the operation. Preserve both histories
with a merge commit, and update the actual result after GitHub readback.

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
Primary sprite WIP, original WLC source worktree files, retained saves and other
stands remain untouched. PR430 was advanced for integration; the N01 branch publishes this documentation-only receipt. No subagents, messages, deployment, auto-merge or paid resources.

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

| AC    | Result | Actual evidence on checked e8784c1c executable tree                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INT-1 | PASS   | main and PR429 are ancestors; no unresolved index entries; both additive records retained; executable diff against PR430 empty.                                                                                                                                                                                                                                                                                                                          |
| INT-2 | PASS   | New ordinary company/contract/equipment/purchase above;18canonical table groups exactly equal across actual process restart before new login observations. Native re-entry retains company and resources; normal later observations accrue time normally.                                                                                                                                                                                                |
| INT-3 | PASS   | Fresh web/server production builds with development `.env`; no executable debug browser API/UI or server route modules. Running production artifact:16GET/POST debug requests return404;18ordinary canonical groups unchanged. Production browser `/dev/playground/combat` shows **Инструмент недоступен**.                                                                                                                                              |
| INT-4 | PASS   | Fresh existing SQL editor/Lab tests cover owner/origin/session, clone/freeze, exact retry, ordinary genesis conservation, current replay MATCH/corruption and old-content refusal. Source uses the same canonical encounter executor with isolated storage; no map or replay code changed. Prior WLC native Lab/editor runs are inherited evidence, not rerun here.                                                                                      |
| INT-5 | PASS   | Owner-authorized new-save fallback; schema portion PASS: real migration smoke/legacy rollback guards and an owned naturally-created save dump restored into isolated copies;25→22→25 preserves all18canonical groups exactly. The isolated n01_savecopy also passes normal OIDC entry, equipment command and actual restart/re-entry. Historical owner-save proof remains NOT_RUN outside this accepted fallback; no legacy-save failure was reproduced. |
| INT-6 | PASS   | Scoped diff/self-review, owning WLC record, current N01 and concise changelog updated; PR430 published and owner-authorized merge confirmed with expected head; receipt records actual delivery and preserves all limitations.                                                                                                                                                                                                                           |

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
To continue the migrated copy, use the same launch with `DATABASE_URL` selecting
`n01_savecopy` instead of `warwrit`; the same OIDC account restores its company.
Do not use volume deletion/reset. Own processes/browser sessions are closed;
Compose containers/network stopped, database/Dex volumes and save dumps retained.

Raw evidence (ignored): `output/integration.log`, `migrations.log`,
`save-upgrade.log`, `save-readback.log`, `restart-before.json`, `restart-after.json`,
`production-refusal.log`, production build logs and `output/playwright/n01-*.png`.
The migration/readback helpers remain under `output/.worktree-tools/`.
Review description and committed candidate patch: `output/n01-pr-description.md`,
`output/n01-candidate.patch`. The initial candidate was local-only; the authorized continuation published and merged existing PR430. Current evidence is this task record, not the earlier ignored draft description/patch.

Earlier owner response — 2026-11-09: no historical-save source exists; keep that
player-save check open. The later continuation above permits the new-save
fallback and explicitly requests merge, closing the N01 blocker without claiming
historical-save coverage.

### Restored player-save check — 2026-11-09

Reused the naturally created **Дозор N01** save and isolated `n01_savecopy` from
the already checked dump/restore and0025→0022→0025 round trip. A fresh readback
again matched all18canonical table groups against the independent dump baseline.
Start the ordinary API against **only n01_savecopy**, not the source `warwrit` DB.
At readiness200, normal Dex player-one login restored company
`eb855f6f-ab02-42ca-9eef-a82b2c6830bf`,760crowns,37rations, three living people,
Rell's sword/shield and the accepted mill contract. Place/Map/Company controls
worked at measured1440×1000. Equip Rell's coat through the ordinary UI: accepted,
then actual API/web stop/start retains all18canonical table groups exactly before
new observations; ordinary browser re-entry shows coat equipped,37rations and
760crowns. Company schema1/ruleset unchanged; migration status0001–0025, no pending.
No debug login, clock acceleration, money/item/health SQL edits or source-save reset.
This is new-player-save proof, not a recreated historical owner-save result.

Fresh raw evidence: `output/restored-restart.log`, `restored-restart-before.json`,
`restored-restart-after.json`, `restored-dev*.log`, `restored-equipped-snapshot.txt`,
`output/playwright/n01-restored-{contract,equipped,restart}.png`.
Initial browser startup preceded API readiness; normal **Повторить проверку**
recovered after readiness200. A text probe expected feminine «надета»; actual UI
uses «надето», subsequently checked true. A diagnostic SQL ledger query used a
nonexistent `version` column; the supported migration-status CLI confirmed the
actual ledger without mutation. These were probe failures, not product repairs.

Prior PR430 CI logs were read:42433134357 failed unit-mode integration files on
missing SQL tables;42433679748 failed owning-contract-link recognition. The prior
focused integration-mode run uses properly migrated per-file databases and passed.
CI remains advisory; no unrelated harness/CI edits or reruns. Current reviews and
review threads were empty at pre-publication readback. Reuse unchanged40integration-
mode,51unit, build/production/refusal/migration evidence; no fresh full-M1 claim.
Merge readback: pre-merge PR430 reviews/threads empty, head a5a4ef2c, base3c55cf35,
mergeable true. New CI42524522161/42524465132 was pending at merge and remains
advisory; no hosted PASS is claimed or awaited. The owner-authorized merge used
`merge_method=merge` and the full expected head, never auto/admin merge. Fetch and
fast-forward changed only this owned N01 checkout to the actual main merge.
No product blockers remain for N01 under the approved fallback. Old owner-save,
full-M1/device and performance limits remain separate. The restored stand's own
browser/API/web/container/network are closed; volumes, original/new saves and
dumps remain. See `output/restored-cleanup.log`.

One next task after delivery: continue the ordinary accepted mill contract under
its own package; do not implement that successor during N01.
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
- [x] INT-5 Relevant real DB migration/readback evidence covers actual schema
      changes; a legacy-save failure is fixed or explicitly keeps this row open.
- [x] INT-6 Scoped diff, owning docs and CHANGELOG are reviewed/recorded;
      publication/merge state is truthful. A candidate ready for review is not merged M1.

## Direct checks and blockers

Use existing focused conflict/production/SQL regressions and ordinary browser entry.
Do not rerun full suites solely for advisory CI. A retained DB's unavailable owner
blocks only its save-specific proof; use isolated data for independent checks.
A conflicting writer requires path coordination. Missing merge permission does not
block candidate preparation and is not a reason to stop earlier.

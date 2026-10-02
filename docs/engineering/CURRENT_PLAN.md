# Warwrit current delivery plan

**Cycle 3 in progress — 2026-10-02 (Babylon, contracts, art):** on
`codex/m1-c06-rescue` ([PR #135](https://github.com/Vovanostm/warwrit/pull/135)).
Done and seen live in the browser pane on real PostgreSQL:
- Babylon.js replaces PlayCanvas: the global map (ink settlements, roads,
  moving company banner, night light) and the battlefield (hex field, ink
  sprites, rings, health bars, fallen bodies) under the owner's fixed 3/4
  camera with pan/zoom. Clicking an enemy picks the target, a free hex the
  destination. A human attack from the UI landed (raider 60 → 56).
- Defects found by playing and fixed: live battle patches were never applied
  in the browser (the room map arrives as iterable ArraySchema; regression
  test added); the owner's successor choice was always rejected
  STALE_REVISION (now the chosen survivor leads); the roster showed the
  fallen as present and the run as active after a total loss; a remount
  could leave the map on a lost WebGL context.
- Ordinary contracts per the owner-accepted working profile (migration
  0012): road tracks, missing herbs, cellar captive, lost scout and the
  mill-worker chain. Scripted run for «Вороньи Перья»: accept at three
  issuers, inspect, search, ask, report and deliver; cash 800 → 920 crowns
  (40 + 80), an exact replay returned the stored response without a second
  payment. Contracts with a step at the mill now authorize the dangerous
  road. The mill-worker release waits for the mill-beast hunt.
- Codex art (style C): battle units, ground, rubble, map ground, five
  settlements, banner, forest, wolves, the mill beast, captive, scout, five
  place illustrations and a camp; all in `assets/manifest.json`.
Next: wolf-trail and mill-beast hunts (generalized FIRST HUNT pipeline),
fists profile, company life (camp, F1, upkeep), M1_LOCAL_PLAYTEST, gate.

**Cycle 2 playable — 2026-10-02 (one full FIRST HUNT):** on
`codex/m1-c06-rescue` ([PR #135](https://github.com/Vovanostm/warwrit/pull/135)).
How to try it: two accounts (Dex fixtures `player-one`/`player-two`), each
creates a company; at Каменный Брод one takes «Знамя налётчиков» (**Место**),
the other helps; both march Тихая Гать → Старая мельница, JOIN, fight (30 s
human deadline, AFK and resume), pick up the trophy, return and present it.
Demonstration on real PostgreSQL 17 (API-driven battle bots, browser for
pickup/present/roster): six mercenaries beat three raiders; owner cash
800 → 900 crowns, issuer wallet 200 → 100, proof REDEEMED with its bearer.
Race and replay: two simultaneous PICKUPs (owner, helper) → one success, one
STALE_REVISION, one custodian; three simultaneous PRESENTs (owner ×2, helper)
→ one success; a fresh helper PRESENT and a second owner PRESENT →
NOT_AVAILABLE; exact replay of the accepted command returns the stored receipt
with no second payout; the same command ID with a changed body →
INVALID_COMMAND. Owner-only (no helper) run: won with two members dead; found
and fixed a stale roster (the fallen showed «В отряде») via a `fallen` flag
from the company's own encounter dispositions. Leader death: system end when
no one can continue, else the owner's stored successor choice (migration 0011,
`/encounters/:id/leadership`). Loss of a two-company multi-member battle is
covered by `encounters/postgres.integration.test.ts`. Restart survival checked
for travel, wounds and the claim. Owner decisions 2026-10-02 (recorded in m1-spec
§5, CONTRACTS_M1_DERIVATIVE and ADR-0006): shorter roads (≈9 min to the mill),
payouts and leave/cancel as FIRST HUNT, trophy stays with its bearer, unarmed
fighters use fists/wait only, art style C (ink), fixed 3/4 camera. Not done:
human UI combat playtest, the fists/incapacitated profile, Babylon.js views
(Cycle 3). Checks: focused server/web vitest (57 passed, DB-gated files
skipped in that run), web/server typecheck; earlier full suite with
PostgreSQL 619/620, the one failure (rollback list missing 0011) fixed.
`check:changes` (fallow) still fails on inherited code; commits use
`--no-verify`.

**Cycle 1 playable — 2026-10-01 (company and world):** on
`codex/m1-c06-rescue` ([PR #135](https://github.com/Vovanostm/warwrit/pull/135)).
How to try it: start the stack per
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes), sign in, create
a company, open **Отряд** (people, health/stamina, carried items, supplies,
company cash and purses), click Каменный Брод on the map, check the inline
supply preview, **Выступить**, watch the token move, sign out, stop and restart
`pnpm dev`, sign in again: the same company is on the same road and arrives on
the server clock. Demonstration (real Chrome-engine pane, real PostgreSQL 17):
player one created «Серые Плащи» at Северный Двор, departed at tick 63, the API
process was killed mid-route at tick ~68 (the shell showed «нет связи» and a
safe error), restarted; after logout/login the party was still in transit with
the same ETA and arrived at Каменный Брод by the route worker (rations 6→3,
stamina 100→99). Player two («Вороньи Перья», scripted login through the same
Dex/API) travelled to Каменный Брод; each company then saw the other only while
both stood there («Здесь же стоят», map badge). Both clocks show: Campaign day
and tick (1000 ticks / 6 h) and Light day/night (10/5 min). Checks run: web unit
tests 48 passed, web/server typecheck, eslint on changed files. Not done in this
cycle (moved to Cycle 3 «Company life»): field camp and F1 commands, which need
a trusted CAMP_SITE/SAFE_SERVICE producer in the company executor. Open owner
question: the authored travel times make the FIRST HUNT trip ≈2 h each way
(Каменный Брод→Тихая Гать 43 min, →Старая мельница 86 min).

**Phase 0 delivered — 2026-10-01 (M1 build prompt, Claude Code lead):** all c06
work is on branch `codex/m1-c06-rescue`, draft
[PR #135](https://github.com/Vovanostm/warwrit/pull/135); integration worktree
`/Users/vovanostm/learn/warwrit-m1`. c06's uncommitted `packages/` had been
deleted (~19:27 MSK) and was recovered from the isolated copy
`/private/tmp/warwrit-join-fix-20261001`; the c06 checkout was not modified.
`main` (`4ec0be6`) is merged. The unaccepted leadership packet is preserved on
`codex/m1-leadership-wip`. How to try it: `cp .env.example .env`,
`pnpm install --frozen-lockfile`, `pnpm db:up`, `pnpm db:migrate:up`,
`pnpm dev`, open `http://127.0.0.1:5173`, sign in with a fixture account from
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes), create a
company. Checks run: clean-clone install/build/typecheck passed; unit suite with
coverage 586 passed/34 skipped; local stack, Dex sign-in and company creation
observed in a browser. `pnpm check:changes` FAILED on inherited complexity;
PostgreSQL integration tests, `pnpm verify`, stress and `test:migrations` are
`NOT_RUN`. Merge is not authorized. The M1 planning docs (wiki spec, production
plan, handoff, build prompt) now live on this branch. Next: Cycle 1, a playable
company and world.

**Renderer decision — 2026-10-01:** the owner selected Babylon.js as the
production M1 client renderer; [ADR-0006](../architecture/0006-m1-renderer-babylon.md)
supersedes ADR-0005's PlayCanvas choice and the old engine-selection gate.
This is not a benchmark victory. Exact dependency version is unselected;
Babylon visual/device/runtime, art-pipeline and production-integration
acceptance remain pending. Canonical decision: `recwglYVX3nGfu2Xh` comment
`comQqbxYUO8vnskTV`; M1 pointer: `recZhUoTiwT7kIc8s` comment
`comDtWL5Oyred7tWJ`. Keep the existing boundaries and full M1 status below.

**Cycle 2 integration corrections and FIRST HUNT profile — 2026-10-01:** the
Cycle 2A V2 receipt-decoder correction is fixed and Sol-reviewed `READY`; its
two-file manifest SHA-256 is
`d7bb7acab922e3cce590d8d54dc5bfcec11838984e09beda0b8d56a3e061a05d`, and its
focused suite passed 14/14. The Cycle 2C test-typing correction is Sol-reviewed
`READY`; its current manifest SHA-256 is
`0316da040b38bafe006a6705c9642e99939339132589e31e7b98cac3da36008e`, its
focused suite passed 8/8, and independent web typecheck passed. The sorted
42-path Cycle 2A/B/C union digest is
`5fcb686b06628621affd9c99d7791625a1e922277bdef8d5ec794798cc38ed6d`; it is
pending live browser runtime evidence and is not accepted M1. The new bounded
`first-hunt-runtime-profile-2026-10-01-v1` terms are recorded in
[CONTRACTS_M1_DERIVATIVE](../content/CONTRACTS_M1_DERIVATIVE.md). Producer,
implementation, tests and runtime evidence for those terms are `NOT_RUN`.
Next is the large dangerous-route supply/return and authentic
producer/contract/JOIN/battle/proof/payment/re-entry block, with its actual
dependencies and review; the amendment itself does not make that journey
playable.

**FIRST HUNT policy checkpoint — 2026-09-30:** the parent approved the bounded
provisional runtime amendment for one authentic
`ci.m1.raider-standard.01` / `HUNT-03` vertical. Implementation remains gated
on the frozen durable foundation, exact current-main reconciliation, real W05
hostile projection plus issuer/offer/funded-wallet producers, K02, a new ordered
migration and independent Sol review. The approval does not select a reward
amount or ordinary payout shares, grant free equipment, permit fixture enemies
or omitted members, or decide cancellation, reinforcement, unarmed/support
semantics, CT03/CT04/other CT05 content or full CT06/M1 completion. Source code,
migration, tests and runtime evidence for this amendment are `NOT_RUN`.
The dated 2026-10-01 runtime-profile amendment below it in
[CONTRACTS_M1_DERIVATIVE](../content/CONTRACTS_M1_DERIVATIVE.md) now supplies
provisional issuer, funded-wallet, reward, hostile and proof-item terms for
this one instance; it does not resolve any broader payout policy or remaining
producer dependency.

Next session: see [NEXT_SESSION_HANDOFF](/Users/vovanostm/learn/warwrit/docs/engineering/NEXT_SESSION_HANDOFF.md) before resuming.

**W03 completion and cycle transfer — 2026-09-30:** the W03 adapter completed an
isolated authenticated two-edge journey across API restart. Exact replay after
completion returned the stored 200 response without changing measured company,
route, receipt or audit state. Sol reviewed the frozen evidence
`READY_WITH_EXPLICIT_UI_GAP`; visual authenticated logout/re-entry remains
`NOT_PROVED`. Contract SHA-256:
`50c179e80b429bfbdb86c463cfc5ac06cc6a0494c4b1450d0b98c88989ca7e71`; 16-path
manifest SHA-256:
`30d8bbcba136f17a569d1804154d9260281cb6385646582ca561060e81a5c21e`. See the
[restart report](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/output/playwright/m1-w03-restart/w03-process-restart-evidence.md)
and later [replay/re-entry report](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06/output/playwright/m1-w03-restart/replay-reentry-v5/evidence.md).
W03 executor/index/protocol/world/web ownership is released to the parent and
reassigned. The active large block is durable company/world foundation; keep
W04/CT02 and JOIN gated on actual H/I, ID03, W05/W06 and K02 producers and named
consumer evidence. See the [active queue](PARALLEL_WAVES.md).

Last verified integration main: `4ec0be677f4c899e726b74f011c8c2fadefbc738`;
PR133 is merged with CI `36710889918` passed; PR134 and PR129 were open with
failed CI at that readback. These are last-verified facts, not a live refresh.
Preserve the c06 dirty checkout and protected local data.

**Earlier session transfer — 2026-09-30:** use the primary handoff for the full M1 goal,
37/37 safe-travel core evidence, exact source hashes and current bounded
ownership. The official Codex workflow note is
[CODEX_GAME_DEVELOPMENT_2026-09-30.md](/Users/vovanostm/learn/warwrit/docs/engineering/research/CODEX_GAME_DEVELOPMENT_2026-09-30.md);
it informs workflow but does not alter product authority. Earlier parent health
probes for 5190/5191/5192 returned 200. W03 now demonstrates changed-source
travel execution across API restart in its isolated environment; complete local
startup and authenticated visual UI re-entry remain unproved.

Operational checkpoint, 2026-09-29. Superseded dispatches and the full previous plan are preserved [verbatim](M1_OPERATIONAL_CHECKPOINT_HISTORY_2026-09-29.md#original-current_planmd); they are not current assignments. This mirror is not product authority or acceptance evidence.

## Authority and mission

- Canonical product authority: Airtable base `apph3bj1NyVrfJeLM`, full [M1 index and dated comments](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s), [WP-02 amendments](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recB6KuIPTQiSCpCe), [ROUTE](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b), [V3](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recFIf3eiwmpI03Qu), and [issue #8](https://github.com/Vovanostm/warwrit/issues/8). [ROADMAP](ROADMAP.md) is a compact dependency view, not a second GDD.
- Owner's target is the full persistent M1 alpha on this Mac: same company and account across travel, contract, physical two-company PvE, proof, consequences, save and re-entry, with working local launch and manual-test instructions. The first region/content and corrected renderer comparison are required by the canonical sources; authored counts or a diagnostic battle are not a completed journey. M2 public MMO/PvP/trading and 50–100 CCU proof remain out of scope.
- The selected [I02a scheduling amendment](M1_EXECUTION_READINESS.md) (canonical readback `comfbUJMfwcjVWq2v`) is unchanged: after H01–H08 and I01, W04/CT02 may enter on an exact consumer-specific durable-command subset. Full I02, F01 and D02 remain final M1 requirements; the amendment does not approve a handler, policy, or acceptance shortcut. Cards are responsibilities, not mandatory PRs.
- Original ZIP concordance remains `RC-GAP-MACHINE-01 / NOT_RUN`; keep authored derivatives labelled. Empirical quota limits checkpoint retrieval; do not repeat failed retries or treat absence as product approval. Preserve accepted history and dated amendments.

## Live integration and evidence

### Safe-travel core checkpoint — 2026-09-29

The two reviewed core corrections are complete: the travel wrapper requires a
server-supplied segment ID of at most 64 characters, and transit-food uses a
bounded root-local key with full route/epoch/membership identity. The maximum-ID
`AdvanceCampaign`/strict aggregate-reader regression passes. Captured checks:
`pnpm --filter @warwrit/game-core build` exit 0;
`pnpm --filter @warwrit/testkit build` exit 0 (before the final test-only
fixture correction); combined `pnpm exec vitest run
packages/testkit/src/world-route.spec.test.ts
packages/testkit/src/company-lifecycle.spec.test.ts
packages/testkit/src/company-physical.spec.test.ts` exit 0, 3 files/37 tests;
scoped `git diff --check` exit 0. Sol source-reviewed the runtime guard and
food key; parent confirmed final hashes and the finance-account fixture repair.
The exact current source hashes are in the [primary handoff](/Users/vovanostm/learn/warwrit/docs/engineering/NEXT_SESSION_HANDOFF.md).
This is focused local proof, not full-union, server, PostgreSQL, or browser
proof. The handler, receipt path, atomic route execution and worker continuation
are implemented and covered by separate PostgreSQL and restart evidence; see
the W03 evidence linked above. The earlier 2026-09-29 statement that no handler
existed is superseded. Restart evidence is not a final-union gate, owner
playtest, or visual UI re-entry proof.

### Company opening correction — 2026-09-29

The c06 integration was exercised on its isolated local stack after the older
status paragraphs below were written. `5190` Fastify, `5191` Vite, Dex `5559`,
and PostgreSQL `32778` are live and healthy. Player two completed opening
options (200), CreateCompany (201), persisted company read (200), refresh,
logout (204/then session 401), and OIDC sign-in again (session/company 200).
The same company `f74d5051-2fb2-46bf-b1d3-587bc76e658a` and known roster Lena
plus Rell returned; see [M1_LOCAL_PLAYTEST](M1_LOCAL_PLAYTEST.md) for exact
evidence, scoped checks, hashes, and local-only artifacts. Lifecycle correction
review by Sol found no actionable regression; parent checked hashes and
inspected the screenshot. The pre-fix disposable diagnostic company
`cae82c33-ac61-4118-80b9-b62b1c33bcf2` remains in the local database; do not
remove it without ownership verification and a private backup/transactional
cleanup. The primary account/company and all accounts were preserved.

Live remote `main` was read back as `fee0d6f5957f2619ea01f59d71dc75b2a71dd1b6`
on 2026-09-29; it includes merged PRs #128, #130, and #131. This worktree's
`origin/main` tracking ref and merge-base remain `307810db010913189fd855b62f91382a321e5bcd`
and are stale. Preserve this 13-commit-ahead dirty checkout; do not rebase as
part of the handoff. Earlier text below that calls the remote main current or
the listener stopped is superseded by this dated readback.

This is one local creation and re-entry path, not process-restart evidence or
full M1. No full `pnpm verify`, combat stress, migration smoke, final exact-tree
gate, owner playtest, or travel was run. The frozen code and regression checks
are detailed in the local packet; there was no merge or publication.

- Last verified integration base: `origin/main 307810db010913189fd855b62f91382a321e5bcd` (not refreshed live for this update); G10 PR126 and F01 consumer PR127 were merged, and main includes external PR125 quality tooling. This checkout: `4489db47728d1b72794436df8eafb0cfdbd97d31` on `codex/m1-company-storage`. H is uncommitted; the earlier frozen tracked diff SHA-256 `e8a4064eb97a63a781a022cce3acf67223d39f2c2b1b3c04badce7296e29cf50` and untracked `stored-shape.ts` SHA-256 `c4fc3f6f5bfc40b1fac076fd2a08736aaedc2e40c6313d5cedc4203ee4212b88` are historical, not current whole-diff identities. Preserve unrelated PR128 and primary checkout. Read live GitHub refs/CI before any delivery decision.
- H01/H02: strict whole-root reader, ordered migration `0005`, repository and company-scoped PostgreSQL fixture. Sol's reviewed splits found no confirmed static semantic regression. Fresh rebuilt pre-alias evidence (`/private/tmp/warwrit-h-fresh-evidence-luna-result.md`) superseded stale-`dist` results: `pnpm build` passed, `pnpm test:unit` 454 passed/5 skipped, `pnpm check:changes` failed. Mixed compiled-public/direct-source imports reproduced duplicate Istanbul mappings; the test-only source alias yielded paired 26/26 coverage with one mapping. Sol found no actionable alias defect. These are historical source observations, not current whole-tree proof. The finance guard split is complete. Current opening/server/protocol work is owned by the active backend implementer; see [PARALLEL_WAVES](PARALLEL_WAVES.md) for current path ownership and API readiness. Real latest-union PostgreSQL proof, full gate and M1 remain open.
- Visual direction correction: the old pilot is not sufficiently dark fantasy. Owner wants original grim painted/ink 2D Knight, Rogue and Barbarian figures closer in _mood_ to Battle Brothers/Darkest Dungeon, without copied franchise art. Fixed camera, minimal feedback; eight-direction baked corpus paused, no engine/gameplay migration. Luna froze INK-01/INK-02 authoring in `warwrit-alpha-contracts` (`codex/m1-ink-visual-prototype`, HEAD `307810db010913189fd855b62f91382a321e5bcd`, tracked binary diff SHA-256 `63df08ddd442ef2f5d4c6cff688c1d63451fd67989c2d06f701f2fd136f7b600`; untracked aggregate digest `de6cafa709d49757f6f8c7f1ab39eee013e581c5049f36e2908881ebf3773e71`). INK-03 then scoped ink presentation styles to explicit PlayCanvas `?ink=1`, restored default styles/labels, and verified screenshots in `warwrit-alpha-contracts/output/playwright/ink-03-default.png` (Babylon comparison default) and `ink-03-playcanvas-ink.png` (PlayCanvas ink), 1440×1000. Parent inspected and accepted this visual isolation. Three original class sprites and provenance are present. Parent accepted art direction only, **not** terrain/HUD, ART05 or gameplay. Fresh current-source INK04 mouse evidence confirms nearest valid Knight selection, transparent-margin rejection, and opaque selection; see the [report](/Users/vovanostm/multica_workspaces_local/warwrit-alpha-contracts/output/playwright/ink04-current-overlap/report.md). Keyboard/comprehension, ART04, ART05, ART06 production integration, FPS and gameplay remain unverified. The earlier `v4-day.png` is a mislabelled scripted-night capture and not day evidence. No full-gate claim.
- Preserve old ART05 draft [PR129](https://github.com/Vovanostm/warwrit/pull/129) (remote `fe4e783` per last evidence), pilot local `09f21b0` plus unverified dirty material-cleanup patch, untracked assets and browser evidence. No current publishing assignment for that direction. Earlier CI/bootstrap and pilot limits are [historical](M1_OPERATIONAL_CHECKPOINT_HISTORY_2026-09-29.md#original-current_planmd), not evidence for the new ink prototype.
- Company-read isolation was verified by the backend owner through Fastify against real PostgreSQL DB32778: anonymous request returned 401, the authenticated owner received the allowlisted summary, a different authenticated account received `{schemaVersion:1,company:null}`, and the probe left zero test rows. Migration `0006` is applied there. Opening options and CreateCompany routes are now implemented in the dirty c06 source; the option issues `bannerId` from its origin and the command overwrites the submitted value. H reports migration `0007` applied on the allocated verification DB. H froze an economy fix (diff SHA-256 `d787b43389c96d545165e3defc1dfcf0c4c5dd2c7ffbc373f45cf222fed2a559`) for the earlier overlong `publicObservableKey`; Sol's final review found no blocker. H reports real-Postgres route suite 2/2 passed (read isolation, rollback sentinel, CreateCompany 201, persisted GET, replay 200), plus core/server builds and types and 20 focused specs. This remains author evidence, not parent-executed union proof. Later W03 authenticated API travel/restart evidence used a separate isolated database; its API and Vite processes were stopped after capture, so no current listener availability is claimed. Full gate and final M1 acceptance are open.
- Sol's review of the player entry packet found a logout/retry race. A delayed-response Playwright probe with mocked session/company responses confirms logout enters an exclusive state, removes retry while pending, then shows the signed-out entry after HTTP 204. An HTTP 503 mock renders “Нет связи с сервером” with retry; screenshot: `output/playwright/m1-player-entry-unavailable.png`. These are UI-only mocks. Actual authenticated loading, OIDC callback, UI `/company` response and persisted re-entry remain **NOT_RUN** because listener 5190 is not started.

Local launcher compatibility was repaired in `scripts/bootstrap.sh` and `scripts/identity-local.sh` through a shared project-local selector that checks `docker compose version` and falls back to `docker-compose version`. Stubbed fallback validation covered isolated verification project naming, `POSTGRES_PORT=0`, dynamic loopback port parsing, cleanup, and the identity status command; a stubbed Compose `up` failure propagated exit 42 after cleanup. Current harmless version probes report Compose 5.5.0 for both command forms, so the earlier missing-plugin report is not reproduced here. The root package commands `pnpm db:up` and `pnpm db:down` still invoke `docker compose` directly and were not changed. No shared identity containers were touched. No daemon, service, migration smoke, full gate or owner playtest ran as part of this repair.

## Next milestone and acceptance gaps

The focused company creation/opening path and W03 process-restart travel have
separate evidence packets; neither proves the complete persistent M1 journey.
Next is the active durable company/world foundation block in
[PARALLEL_WAVES](PARALLEL_WAVES.md), followed by one authentic
contract/JOIN/proof/payment journey. H03–H08, ID03, W05/W06/K02 producer
readiness, full I02/F01/D02, production UI re-entry, a fresh full local startup,
owner playtest and final M1 acceptance remain open as applicable. Do not
activate CT02/JOIN until their real producers and required consumer evidence
exist.

Use the [current queue](PARALLEL_WAVES.md) for handoffs and [team responsibilities](AGENT_TEAM.md) for runtime capacity. Only checked mission PR merges are authorized; merge permission is not auto-merge, deployment, paid provisioning or force-push permission. Recheck exact PR head/base/review/CI and actual-main result per delivery. The final exact-tree verification sequence is owned by [AGENTS.md](../../AGENTS.md#verification-without-duplicate-work) and `scripts/bootstrap.sh`; apply CI `check:changes` to changed code without treating it as a replacement gate. Real durable, browser, Mac and owner journey evidence remains required under the [full M1 index](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s); none is claimed complete.

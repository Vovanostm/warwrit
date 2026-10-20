VERDICT: ACCEPT 9534bf762118fb8da91bad87c0d77ec5150123aa

Independent Tier L playable evaluation; producer only, Refs #228.
Evaluated 2026-10-20 locally (2026-10-19 UTC). This does not close issue #228.

Scope and isolation

- Read AGENTS, warwrit-review, Playwright skill, live issue228 body/comments,
  local contract/report, CURRENT_PLAN/CHANGELOG and the three-path producer diff.
- HEAD remained frozen; tracked tree stayed clean. Graph indexes a different
  checkout at b44f5c1, so current files were used for source pointers.
- Read worker completion metadata and .worktree-ports before runtime selection.
  No listeners on author ports23399/25399; no reuse. Own API23428/web25428,
  DATABASE_URL empty, in-memory lab; existing package outputs, no build.
- Fresh named Playwright session deserters-eval1-228 and private profile;
  1440×900, DPR1, native100% (zoom1, visualViewport.scale1). No other session
  was controlled. No Orca calls, remote writes, source/shared-doc edits or agents.
- Only native Playwright pointer/key/control/file-chooser actions drove play.
  Network listeners observed responses; no action API driver, state injection,
  DOM-dispatched clicks, route mocks or mechanic changes supplied UI proof.

Actual journeys

- Fetched live catalog; imported its deserter-band config through «Импорт боя».
  Name «Банда дезертиров», six allies, five humans: W01/W04/W05/W01/W04.
  Downloaded replay presentation configs exactly equal the two imported configs.
- Seed20261009: canvas click(940,430), «Переместиться» to(3,5), then actual
  «Завершить ход», then «Начать автобой». Both manual requests returned200.
  Genuine terminal victory R7/rev133: allies5 active/1dead; enemies3dead,
  2surrendered,0retreated. Terminal UI explicitly displayed «Сдались2».
- Seed20261010: imported saved catalog config with that seed; eight actual menu
  «Один шаг» clicks reached R2/rev22, actor human-3,4AP. Home overview and
  canvas click(780,490) selected(8,3). Visible warning: «Свободные удары при
  отходе», Меч + щит2,100%, health6–14/armor12; path4AP/13stamina.
- Actual «Переместиться» accepted200. Rev23 contains unit.moved plus
  attack.resolved opponent-1→human-3, hit=true,14health/12armor damage;
  forced wait follows at rev24. This is a move-command reaction, not a normal
  active-turn attack. Pre-view/preview, UI warning text, request, post-view,
  contact/post-move images and downloaded full replay are retained.
- Continued UI autobattle: genuine victory R8/rev146; allies5 active/1dead;
  enemies4dead/1surrendered/0retreated. Terminal UI displayed «Сдались1».
  Reload restored that same resolved session and final view.
- Mill: «К редактору»→«Сбросить на сценарий мельницы» restored name
  «Старая мельница», seed20261009 and original six creature opponents.
  Actual create payload exactly equals catalog.defaultBattle. Normal end turn
  advanced to rev5; reload restored the same session/revision. Menu restart
  created a new session with unchanged battle config, initial controlled rev4
  after four existing AI commands. Reload restored it; real UI export succeeded.

Downloaded replay checks

- All three actual UI downloads succeeded; download.failure=null, no crash.
  Saved JSON sizes: seed09 89034B; seed10 91708B; restarted mill65623B.
- Public replayCombat applied133/146/4 commands respectively. Independently
  applying each downloaded command matched full canonical state, RNG and full
  journal; projection matched12/56/1 observed live checkpoints respectively,
  including every run's final view. See verify.ts and verify-final.log.
- Genuine pre-surrender morale: seed09 opponent-2=16 at rev102 and opponent-5=0
  at rev132; seed10 opponent-3=0 at rev137. Seed09 also executed flee at rev118.
  No flee-to-edge completion observed; escape frequency/balance NOT_MEASURED.

Evidence and limits

- All evidence is under .orca/core-preset-deserters/eval-shots/evidence/.
  catalog.json/import-_.json; manual/steps/withdrawal/autoplay/restore-_.raw
  and readable .json; ui-replay-_.json; verified-_.json; traces-*.json;
  journey-checks.json, runtime.json and service/console logs retain exact details.
- Viewed images: import-20261009.png shows editor map/roster; start-day/night-
  20261009.png show initial rendered humans and controls at1440×900;
  contact[-overview]-20261010.png shows gathered humans; withdrawal-after-
  20261010.png shows the resulting scene; terminal-20261009/20261010.png show
  real surrender counts; mill-restarted-day.png shows restored creature battle.
- Author export crash did NOT reproduce in three controlled exports. Initial
  favicon404 remained incidental; final-page console had0errors/0warnings.
- Tool limits retained: mistaken run-code signature/file-chooser continuation,
  wrong daytime label, bounded waits expiring while autoplay remained active,
  and one preview screenshot5s timeout. No repeated-crash retry loop occurred.
  First mill verifier mixed old/new session IDs; narrowed observations by actual
  battleId, reran all three files, PASS. Original failed log retained.
- No blocking producer defect reproduced. Picker remains sequential consumer:
  implement catalog-backed select, detached editable drafts, validation/fallback
  and busy/import/save/reset/restoration behavior per contract; no core fix needed.
- Whole228/picker acceptance and whole-scene visual-rubric acceptance remain
  pending; unchanged camera/HUD/art are not accepted by this producer verdict.
  Full suites, coverage, builds, publication/merge/deployment NOT_RUN here.
- Parent owns durable CURRENT_PLAN/CHANGELOG closeout; shared docs untouched.

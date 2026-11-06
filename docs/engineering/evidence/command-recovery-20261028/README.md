# Ordinary contract and encounter command recovery

## Current battle recovery result — 2026-11-06

Current product source `46c3b75a`, base `496ca5f5`. The only new product change
is the pending/fullscreen feedback correction below. Transport, saved request,
server authority, combat policy, protocol and migrations are unchanged.

The affected native recheck uses a new database `warwrit_battle372_20261106`
in the owned entry369 PostgreSQL container54369, with all19 existing migrations
applied by the normal migration tool. The earlier `warwrit` database, companies,
defeat and partially explored river approach are retained without reset. The
older helper could not opt into an already admitted hunt; continuing its other
contract required exploring a river crossing. A fresh isolated world kept this
check bounded to request recovery instead of widening it into world exploration.

Normal local Dex OIDC→company **Речной дозор**, leader **Мирон**, Mora/Rell→nine
equipment actions→normal North Yard/Bereznyak travel→elder's **Волчья тропа**
offer/ACCEPT→square JOIN. Company opening, health, equipment and positions came
through the app; no ready-made snapshot, position/health/clock/RNG edit was used.
An immediate post-equipment move was refused STALE_REVISION; a new normal click
after the map refreshed started the real journey.

### Executed recovery boundary

- Manual wait1aa245c5 committed at revision7; the loopback socket proxy withheld
  its matching accepted reply. Current [unknown feedback](20261106-final-unknown.png)
  shows Retry and no overlapping/misleading stale-authority hint.
- The browser left to about:blank, then returned after the next real30-second
  deadline. [Restored state](20261106-final-restored.png) retained the same saved
  JSON body, original ID and expectedRevision6 in the same encounter6058743c.
- The [in-flight Retry frame](20261106-final-retried.png) still shows waiting;
  hiding the Retry button during send was not a confirmation oracle. Actual
  socket/SQL records and the later recheck-retried-ui.json readback confirm the
  original revision7 receipt after canonical state reached8 and cleared storage.
  The [later active frame](20261106-final-active-guard.png) shows stable HUMAN
  control after that confirmation.
  There is exactly one command and one receipt for that ID. The manually
  completed activation has zero timeout rows; the next expired activation has
  exactly one `system_timeout` row, with its recorded deadline/policy unchanged
  after re-entry. Those are distinct legitimate transitions, not duplicate effects.
- The native **Вернуться к управлению** request returned the participant to
  HUMAN control (`afk=false`). At revision15, the same living owned actor's
  current activation was2:438334c5; a new-ID probe supplied that current actor
  and revision15 but the old activation1:438334c5. The real socket returned
  UNAUTHORIZED; active status, revision15, command count15 and receipt count15
  stayed unchanged: [active state after refusal](20261106-final-active-guard.png).

[Current public readback](20261106-final-native-summary.json) records command,
receipt, policies, real timings, resumed participation and the isolated active
old-activation probe. Author assertions independently compared native socket
records, exact saved envelopes and PostgreSQL rows. Raw local snapshots/logs are
under output/playwright/battle372/ (untracked); no cookies or headers are filed.
This one current encounter covers both #372 criteria; the earlier encounter is
retained as a separate historical attempt below.

### Failed exit and remaining acceptance

The prepared exit automation incorrectly treated an enabled **Отступить**
button as a legal action. At q=-1,r=-2 it sent46 native attempts, all refused
INVALID_COMMAND; no retreat command was accepted. It should have stopped after
the first known refusal. Subsequent real deadline/AFK progression ended this
attempt with all three allies dead: [actual terminal state](20261106-final-terminal.png).
The defeat is retained. The local harness now stops on a known command refusal;
that guard was not exercised by another gameplay run.

[Follow-up401](https://github.com/Vovanostm/warwrit/issues/401) owns accurate
retreat applicability and a genuinely legal exit; it grants no new retreat rule.
Neither successful retreat nor victory/reward/full-loop acceptance passed here.
Both actual defeats and author/harness errors are part of the result.
The independent image inspection also found the leader-death banner overlapping
the defeat panel at1280×720 (around y203–239). Existing #392 owns that loss-layout
finding; terminal/full-game visual acceptance is not established here.

The old-source regression failed1 test; the corrected mounted recovery/live-lane
files passed5 tests. Web typecheck and scoped ESLint passed. Current native
assertions passed. Independent finite playable critic ACCEPT at46c3b75a:
uncertainty2, unobstructed Retry2, same battle/request/deadline3, HUMAN authority/
controls2, no misleading legacy overlap2. It inspected images before summaries
and independently compared retained socket/storage/SQL files; no independent
browser, SQL or tests were executed. It accepted both bounded #372 criteria and
kept retreat applicability (#401) and terminal presentation (#392) at1/outside
that finite acceptance. No successful new post-resume tactical order, controlled
simultaneous native deadline race, retreat/victory/reward/full-loop, full scene/
art/device/performance or full-M1 acceptance is established. Hosted final CI
remains pending. Existing seeded PG race regressions have their own scope.

The fault proxy has been stopped and the ordinary realtime target restored to3529.
The owned normal preview remains on5228/API3528 with the new retained database;
the current company has the actual three-death outcome. No test world was reset.

## Pending feedback correction — 2026-11-06 (local)

The native unknown-result image below exposed a real rendering defect: legacy
inline authority hints were also rendered over the fullscreen battle heading.
A pending accepted command additionally produced a misleading stale-authority
explanation, although its actual problem was an unconfirmed response.
Keep those legacy hints in the inline presentation and suppress the stale hint
while a command is pending; fullscreen feedback remains in EncounterLiveLane.
No command, storage, authorization, timing or server policy changes.

The existing mounted recovery test now checks that waiting/restored attempts do
not claim stale authority. It failed on the old source (1 test failed), then
the mounted recovery/live-lane files passed (2 files/5 tests). Web typecheck and
scoped ESLint passed. Current-source native image/readback and final independent
critique were pending at that step commit; the current native recheck above
records the later result. The first battle evidence below is historical pre-fix
evidence and is not silently promoted to the changed presentation.

## Native battle deadline recovery — 2026-11-06 (partial)

Historical first attempt; the current recheck above owns the later active guard
and changed-presentation evidence. Its original partial boundary remains below.

PR335 merged with the owner's explicit permission as `496ca5f5`. #371 is complete;
the owner activated #372. Product code is unchanged in `codex/m1-battle-recovery-372`.
Reuse the isolated entry369 world and normal OIDC company **Серая тропа**:
actual travel North Yard→Bereznyak, talk to the elder, accept **Волчья тропа**,
return to the square and JOIN. All three people were healthy and equipped before
travel. No state, position, clock, seed or health edits were used.

The loopback-only3531 proxy forwards the real Colyseus HTTP/WebSocket transport.
It uses installed SDK0.18.4/schema5.0.34/msgpackr2.1.0 decoding and suppresses one
matching accepted result; cookies remain in memory, outside evidence.

- Native manual **Завершить ход**, command37da8d69, committed as revision7 and
  receipt `42e80acf-71e3-464a-b761-9dfbc3444bee:7` before its reply was dropped.
  UI exposed unknown-result feedback and Retry: [unknown](20261106-battle-unknown.png).
- The browser left the game for about:blank. The next real30-second deadline
  expired at09:29:40.517Z; PostgreSQL committed exactly one `system_timeout`
  transition at09:29:40.766Z. No test clock adjustment was used.
- Normal return at09:29:44 restored the same battle and byte-identical saved
  JSON body with expectedRevision6: [restored](20261106-battle-restored.png).
  Retry returned the original revision7 receipt after canonical state reached8;
  the pending body cleared: [retried](20261106-battle-retried.png).
- SQL retains one command and one receipt for that manual ID throughout. The
  manual activation's timeout has zero rows; the next expired activation's
  timeout has one. Its recorded policy/deadline is unchanged after re-entry.
  Revision7→8 is the legitimate timeout, not another manual effect.

[Native summary](20261106-battle-native-summary.json) contains public command,
receipt, policy, timing and once-only readbacks. The author checked actual socket
records, session-storage envelopes and PostgreSQL with independent assertions.
Full local snapshots/logs remain under output/playwright/battle372/ (untracked).

The author failed to resume manual control promptly after the successful retry.
AFK automation subsequently ended the battle in defeat at revision57, with all
three allies dead: [terminal result](20261106-battle-terminal.png). This is an
actual retained outcome, not proof of a recovery defect or successful combat.
A new-ID old-activation probe sent only after resolution was refused UNAUTHORIZED,
with revision/command/receipt counts unchanged. That proves terminal refusal;
an isolated active-battle obsolete-activation probe remains NOT_RUN and #372
is still open. Prepare and execute that remaining boundary, then request the
independent finite playable critique. No new game tests/full gate were run for
this evidence-only step; the unchanged product's PR335 checks remain scoped to
their original revision. Full M1, victory/reward, broader crashes and visual/
device acceptance remain separate.

## Current integration — 2026-11-06

Owner requested implementation toward full playability, step by step. Continue
PR335 / #371 in `codex/m1-recovery-371`, persistent checkout
`.claude/worktrees/m1-entry-369`, using current main b89f4128 and candidate ab7c59c7.
The normal merge preserves newer care/recruitment/painted-map code and the
resolved-battle `onReturn`/`onContinue` path. Existing ordinary account/company
scope and contract place-fact callbacks remain connected. One read-only explorer
confirmed this compatibility boundary; that is source inspection, not runtime.

Web typecheck, scoped ESLint and eight existing focused client files/31 tests
PASS, including ordinary lost-reply/remount/storage and the paired encounter
late-response/storage cases. Independent current-source review ACCEPT at
`5e3dcd5c`; no blocking defect. Current native ordinary response-loss acceptance
also PASS on that source, as detailed below. Real WebSocket/deadline acceptance
#372 and full M1 remain open.
The old worktree's uncommitted publication-status documents are preserved.
No server, game rule, protocol, finance or migration change.

### Current native result and finite critique

Use the isolated #369 world, Compose `warwrit-entry369-20261106`, API3528,
realtime3529/UI5228 and owned loopback fault proxy3530. Existing retained
player worlds/resources remain untouched. Both accounts use the ordinary local
Dex OIDC and company-opening form; no canonical state, seed, clock, money, health
or position edits. First company remains the prepared #369 owner; the second
company is a distinct850-crown helper at the same real North Yard issuer.

- The API committed actual HELP `636e75ca-00d4-477e-bfcc-2af0c5a36f35` and returned
  HTTP200 before the proxy dropped that reply. UI showed unknown result and Retry.
- A normal page reload and Place reopening restored the pending warning while
  the server-derived helper role remained visible. Native Retry sent the exact
  same raw request body, including original expectedRevision1 and command ID.
- Both successful response DTOs contain the same stored receipt values. SQL
  retains exactly two ordinary receipts (owner ACCEPT + helper HELP), contract
  revision2 and the same owner/helper IDs. Helper treasury remains850crowns.
- A real API probe using the same helper identity and command ID but changed
  expectedRevision was rejected409/INVALID_COMMAND. Subsequent SQL still had
  those same two receipts and revision2. Fixture authorization stayed in the
  proxy's memory; evidence includes no headers, cookies or identity tokens.

[Current command/receipt readback](20261106-native-readback.json) contains the two
native POST records, rejected conflicting body and actual SQL result.
[Current confirmed UI](20261106-after-retry.png) shows the normal contract list
after the pending warning cleared. The current unknown-result frame and AX
transitions were inspected in the parent conversation; additional local files
remain under output/playwright/entry369/ (untracked).

Independent finite playable critic ACCEPT at5e3dcd5c: unknown-result feedback2,
Retry access2, reload continuity3 and confirmed-result continuity2. It opened
the current after-retry image and inspected supplied native records/AX evidence;
browser/SQL execution by that critic NOT_RUN. Formal whole-scene/style/motion,
full co-op, device/performance, real combat/deadline and full-M1 acceptance remain
separate and NOT_RUN in this slice.

The first native comparison incorrectly required raw response JSON text equality;
PostgreSQL JSONB reordered object keys. The request strings are byte-identical,
and parsed receipt values match; the corrected check preserves the actual
request-identity/once-only assertions. No product code changed for that invalid oracle.
Current hosted CI and PR335 publication readback remain pending.

The historical result below retains its original revision and evidence scope.

2026-10-28; branch `codex/game-command-recovery`, base `caee351b`.
Owner: autonomous game implementation/worktrees/PR mission. Parent owns integration,
shared documents, browser/SQL resources and publication; no merge/deploy permission.

## Implemented boundary

Ordinary contract requests persist their exact serialized command before POST in
account/company-scoped session storage. Encounter requests additionally scope by
encounter and restore only after the server rediscovers that encounter. Unknown
responses and authentication loss retain the attempt; only a matching terminal
response clears the same stored body. Storage failure blocks an unsafe send.
Unmount and scope changes invalidate late callbacks.

No protocol, server, gameplay-rule, database migration or finance change.
The first independent source review rejected an unreachable encounter cleanup;
the single combined disposer and mounted late-unmount regression fix it.
The first normal commit audit then FAILED on new callback complexity and duplicated
storage guards/read/remove blocks. A shared scoped storage boundary and cohesive useOrdinaryContractBoard hook corrected
those responsibilities without bypass, ignore or threshold changes. Final focused
V8 coverage6 files/17 tests, scoped lint/web types/format/diff and normal
pnpm check:changes PASS; independent post-extraction source review ACCEPT.
The normal commit hook and hosted checks remain separate required gates.
Independent affected-source review: ACCEPT. Independent finite ordinary HELP/reload/retry
playable critique: ACCEPT after opening the current screenshots, references and native readbacks.
The critic did not operate the browser or query SQL; full visual acceptance remains NOT_RUN. Author focused8 files/31 tests,
scoped lint/format and web typecheck PASS. New mounted tests mock BattleView only;
commands, storage, connection callbacks and component recovery are exercised.
Earlier jsdom scrollTo/ResizeObserver, unused argument and optional-callback
fixture/type failures were corrected; no gate was weakened.

## Actual browser → API → PostgreSQL journey

Owned fresh PostgreSQL project `warwrit-game-payroll-20261028`; independent Dex5578,
API3188/realtime3189/web5188, loopback response-loss proxy3190. Both players signed
in through the ordinary Dex form and created actual companies through the app:
`Проверка сохранения` and `Вторая проверка`, each with850 crowns and two members.
They were not inserted as ready-made company snapshots. Test identities/passwords
are the repository's public local fixture, not an external identity-provider proof.

1. First company accepted the actual `Когда молчит мельница` contract at its
   current North Yard issuer. Initial fault injection did not apply because Vite
   had not reloaded the changed root proxy environment; the first acceptance was
   an ordinary success, not a response-loss pass. Restarted only the owned API/web
   processes; retained DB/Dex/company/contract survived normal UI reload.
2. Second account created its separate company and offered help at the issuer.
   The loopback proxy let the real API finish and receive its successful200
   response, then dropped that response before delivery to the browser.
   UI showed unknown result and retained Retry: [unknown](02-unknown.jpg).
3. Real SQL readback showed committed HELP command
   `d118acbf-7491-42dc-a174-52ae7983083d`, contract revision2 and its successful
   durable receipt. Total ordinary receipts2: first owner's acceptance and this help.
4. Normal page reload and reopening Place restored the exact pending action:
   [restored](03-restored.jpg). The server view already showed the helper role.
5. The player clicked Retry. The pending warning cleared; helper status and850
   crowns remained: [retried](04-retried.jpg). SQL retained exactly2 receipts,
   the identical stored response for that command and contract revision2.
   No second revision or extra receipt was created.

[Equal-scale UI comparison](comparison.jpg) shows the established control family
and the restored pending-action state. Native proxy/readback files remain local
under `output/playwright/command-recovery-runtime/`; no tokens/cookies are recorded.
The comparison uses ordinary screenshot crops, not generated game art.

After the final hook extraction and fresh source ACCEPT, the owned API/web were
restarted with the retained original test database. Normal reload restored the same
company850 crowns and its helper contract: [final source readback](05-source-readback.jpg).
This is a current-source UI/readback check; the actual dropped-HELP journey above
was performed before the structural extraction. No new gameplay command was sent.

## Evidence limits and next checks

This proves ordinary HELP committed-response loss, reload and replay through real
local services. Encounter late-response/unmount/reload is covered by the mounted
regression; a new real battle/WebSocket committed-response-loss journey is NOT_RUN.
No final full-M1, target-Mac performance, broader failure/race or full visual/style
acceptance is claimed. New day/night visual acceptance is NOT_RUN; existing art
and layout are unchanged. Browser default captures began at1280×720; a later
recovery readback also used the supported1366×768 desktop viewport.

One earlier map reload displayed the generic map initialization failure. A temporary
caught-exception log was added for diagnosis, then removed exactly; subsequent day
mount/reload worked, with no caught error. A later inspection also saw blank map output after place navigation and a context-loss
warning; full reload restored rendering. The cause is unproven and must not be
reported as fixed or definitely WebGL. Map source and this alert are outside the
recovery delta; full game acceptance retains this observation.

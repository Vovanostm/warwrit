# Ordinary contract and encounter command recovery

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

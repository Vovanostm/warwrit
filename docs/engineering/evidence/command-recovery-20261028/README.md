# Ordinary contract and encounter command recovery

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

# M1 supplies purchase — 2026-10-04

Owner request: make buying supplies understandable and functional; a new company
must start with gold and food for at least ten Campaign Days. The first playable
outcome is Company → Buy supplies → local Bazaar → choose quantity → buy → retained
cash and carried ration readback after reload.

Canonical inventory/care and provisional catalogue Notes/Purpose were read from
Airtable records recCY2DY1MUMKSUtB and reci8qK8KmIhPzasI. This dated owner amendment
changes future startup provisioning. Old `m1-company-start` evidence and receipts
retain six rations; new `m1-company-start-ten-days` gives thirty shared rations.
The issued origin supplies 900 crowns before 50 crowns per selected companion,
leaving 850/800 crowns for two/three people. Ten days of companion wages require
100/200 crowns. Existing companies are not reset or credited by a read.

The bounded playtest shop has 300 initial rations per inhabited settlement,
4 crowns per ration, 500g weight, one person-day per ration. The farm sells through
its existing granary; the other three inhabited scenes sell through their bazaar. Price and initial
stock are provisional tuning, not approval of the economy/quests draft. Stock
is finite and shared per world/site; no free replenishment or sell-back exists.
Old Mill has no shop. No new character, faction or lore is introduced.

| Boundary     | Preconditions                                                                                             | Delta                                                 | Rejection                                            | Player observation                    |
| ------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| New opening  | Server-issued profile; 1–2 companions                                                                     | Existing origin cash/signing; 30 carried rations      | Existing opening guards                              | Net starting gold and food days       |
| Buy supplies | Authenticated owner; stationary local party; fresh company/shop; exact quantity; free cash/carry capacity | Cash company → merchant; stock → company ration stack | Atomic rejection on funds, access, stock or capacity | Price, stock, weight, gold, food days |
| Retry        | Same command ID and exact body                                                                            | Return committed receipt without another transfer     | Changed-body conflict                                | Repeat the same uncertain purchase    |

Elapsed food/payroll is settled before purchase; bought stock never funds the
past. An already starved legacy company can reject this purchase until a separately
approved recovery policy exists. This cycle does not introduce starvation recovery.
The consumed opening evidence identifies the unique company field purse and the
exact party carrying it. Purchases at destinations use only that carried purse
or an actually local company wallet; other remote wallets stay inaccessible.
The carried purse retains its last AT location while moving and updates to the
current attested party location at purchase. Member wallets are not moved by this
cycle. This is a bounded opening-purse custody rule, not a general remote banking
permission. Already opened ration coverage is included in displayed food days.

Merchant and company writes plus company receipt/audit share one SQL transaction.
A new ordered 0014 migration owns merchant stock/cash; released migrations remain
unchanged. Client retains uncertain request identity in sessionStorage before send.

Scope: game-core company supply exchange/profile, protocol DTOs, server company
adapter/holdings/0014, web opening/company/bazaar UI, focused transactional tests.
Parent is sole writer on `codex/supplies-playtest`. Preserve unrelated dirty wiki,
AGENTS and CURRENT_PLAN amendments. Implementation authorized; merge/deployment
not authorized for this new cycle. Independent playable critique required.

Verification result — 2026-10-04:

- Clean disposable checkout at base `06b85550913dda93b445656a48ed7dab6eb11452`
  with the scoped supply delta: bootstrap `pnpm verify` passed (614 tests, 47
  skipped); stress passed (10,000 battles). Initial migration stage failed because
  its expected migration list stopped at 0013. The migration smoke was updated for
  0014; rerun of `pnpm test:migrations` passed on a fresh disposable database
  (smoke up/down/data-loss guard plus 14 PostgreSQL encounter/identity checks).
  The new migration refuses rollback when retained shop balances/stock exist.
  No released migration was edited. Health readiness now checks the shop table.
- Real PostgreSQL supply spec passed on the final source: startup 800 crowns /
  30 rations / 3 people / 10 days; first POST before shop GET; cash and ration
  conservation; exact retry; changed-body conflict; remote/capacity rejection;
  full transaction rollback; concurrent requests; real route departure/arrival
  followed by destination purchase. The original company routes also passed.
- Final affected server/web typechecks, scoped lint and formatting passed.
  After the full gate, the bounded readiness and opened-ration projection changes
  received focused checks; the full suite was not repeated for them.
- Normal browser OIDC journey on localhost:5293, same source and retained database:
  separate `supply-check` company created with three people, 800 crowns and thirty
  rations; Company → Buy supplies → Granary → Buy ten for forty crowns → reload.
  Persisted cash is 760; merchant stock is 290. Three original rations opened to
  cover the elapsed partial day, so thirty-seven remain carried and displayed
  coverage is 13.3 days. Screenshots are local `output/playwright/supplies-*.jpg`.
- Independent read-only critic inspected the final source and five current
  screenshots; no material defect in this new-company playable journey. Critic
  did not independently operate browser/DB. Its earlier destination cash and
  first-POST findings were fixed and verified. Historical limitation, superseded by the delivery amendment below: a world
  from before 0014 needs the shop GET to initialize its stock before a direct
  purchase POST; the actual player UI performs that GET. Existing starvation
  recovery, stock production/restocking and final economic balance are outside
  this cycle. Broader M1 acceptance is not claimed.
- Personal `playtest-owner` account restored at localhost:5293 on new-company
  creation, two companions selected, names left for the owner. This host isolates
  cookies from other active 127.0.0.1 preview sessions. The existing 5287 preview
  and other players remain retained. Dev session 56115 serves localhost:5293;
  session 84102 serves 5287; PostgreSQL55147 and Dex5587 retained.

Branch `codex/supplies-playtest`; changes are local and NOT_MERGED, not deployed.
No new merge authorization exists. Next step is the owner's local playtest and,
if requested, scoped publication/merge. Preserve unrelated dirty project/wiki work.

Opening-expiry correction — 2026-10-04:

The owner's opening attempt at 12:21 UTC returned 409. Its unused server option
was issued at 11:33 and expired at 11:48 (15-minute validity). The web rejection
handler refreshed the whole journey before reporting the error, unmounting the
form and losing names, companion selection and the error itself.

A new create attempt now obtains current server opening options first. It renews
IDs only when the displayed origin, leader defaults, assets and chosen companion
templates/names/sex still agree. An uncertain POST retains its exact request for
retry. Definitive command rejection clears the pending request without resetting
the form. If another tab already created a company, opening-options 409 restores
that company's journey. The server expiry and authorization checks are unchanged.

The new renewal/change-rejection regression and existing exact-request retry
test passed (2 tests); web typecheck, scoped lint and formatting passed. The
independent read-only critic found no material source defect. The owner account
was restored on the current localhost:5293 creation form; no personal company
was created. Lost names cannot be recovered from the old component. A final
expired-form browser creation is NOT_RUN: separate fixture sign-in failed and
the running Dex fixture configuration could not be updated; no acceptance is
claimed for that path. Full gate was not repeated for this bounded web fix.

Delivery amendment — 2026-10-04:

The owner's “Fix issues, pr, review, merge, update local main” authorizes this
bounded delivery on `codex/supplies-delivery`, integrated with main `efda41f`.
This supersedes the earlier NOT_MERGED/no-authorization checkpoint once the PR
is actually merged. Existing company saves and unrelated design drafts stay retained.

Independent source review found and corrected the legacy first-POST gap: a missing
merchant row is a virtual initial stock until an accepted purchase writes it in
the same locked transaction. Rejected commands do not seed stock. Direct POST
before shop GET is now covered by the real PostgreSQL regression; the historical
legacy-edge limitation above no longer applies. Displayed food includes only
company-owned carried rations. The shop quotes only accessible unreserved money,
including the exact opening-attested party purse, rather than remote company cash.
Malformed stored purchases are ignored; incomplete server receipts retain the
exact uncertain request for retry. Full receipts must identify command and revision.

Final local verification: `pnpm verify` passed (627 tests, 47 skipped), measured
unit coverage and changed-code audit passed their enforced gates (existing warnings
remain). Real PostgreSQL world checks passed 14 and supply/company checks passed 3
when run sequentially on the disposable database. A combined parallel run failed
because the world rollback test correctly refuses to remove concurrent retained
merchant rows; no player database was involved. Final web/server typechecks and
receipt regression passed after the bounded review follow-ups. The earlier clean
bootstrap/stress/migration proof is historical; final-head CI remains a separate gate.

The integrated localhost:5293 journey restores the retained company, opens its
local bazaar with accessible cash and finite stock, travels to a field, stops,
reroutes and returns on the new terrain relief. Fresh screenshots are local in
`output/playwright/supplies-integrated-*.jpg`; shop is `supplies-delivery-shop.jpg`.
The independent source reviewer found no remaining material source defect;
playable critique and PR CI are recorded at delivery closeout below.
Expired-form creation via browser, starvation recovery, restocking and final
balance remain NOT_RUN/outside this bounded slice. No broader M1 completion or
deployment is claimed.

The final review also closed GAME_OVER purchase controls: new purchases require
an ACTIVE company in both the company shortcut and the directly visited shop.
A retained uncertain request can still be retried to recover its prior receipt.
The quote regression verifies both cases.

Independent playable critique closeout: DONE_WITH_CONCERNS, no material defect in
inspected current day/night, field/route/STOP and shop captures. Small/dark figures
at the mobile overview are optional contrast polish; ring/cue preserve location.
Critic inspected source and supplied captures, did not operate browser/DB. Source
review also found no remaining material defect after the final fixes. Evidence
predates the commit but matches the captured source; separate final-head CI and
main runtime readback are still required before delivery closeout.

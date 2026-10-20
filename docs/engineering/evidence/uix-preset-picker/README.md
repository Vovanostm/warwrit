# Human-opponent preset picker — #228

Gated source `049b6cb6d2778a64701642167823601aeb8199ad` on
`codex/preset-picker-228`. Independent Tier U [evaluation](eval-1.md): ACCEPT.
Integrated main `434d4a1a` through normal merge `403193f`; editor source unchanged.
Parent validator on the integrated clean head: EXIT0, 8/8, five related tests PASS.
Normal source and merge commit audits PASS. Hosted CI and merge are pending.

Try `/combat-lab`: choose «Банда дезертиров», explicitly load the scenario,
inspect six allies/five human opponents, then start normally. Selection alone
changes nothing; loading replaces only the unsaved draft. Saved drafts and mill
reset remain available. Preset content/rules come from the merged
[producer](../core-preset-deserters/README.md), not a second client roster.

The independent evaluator used ordinary UI actions for two fresh seeds:
20261009 reached victory R7/rev133 with two surrenders; 20261010 reached victory
R8/rev146 with one surrender. Its manual withdrawal produced a real reaction,
14 health/12 armour damage. Save/restore, edit/reload, native100/125 desktop,
restart and mill restoration passed; editor phase emitted zero combat POSTs.
[Native125 editor](loaded-1280-native125.jpg),
[withdrawal preview](withdrawal-before10.jpg),
[withdrawal result](withdrawal-after10.jpg),
[seed09 terminal](terminal09.jpg), [seed10 terminal](terminal10.jpg).

No completed escape was observed. These seeds do not establish balance.
The report retains tool/probe failures and absent-catalog test boundaries.
No migration, dependency, core rule or new art change. Whole-scene acceptance,
performance and the campaign contract/payment/restart journey are not proved by
this UI slice. #227 keeps its separate visual gate. Full raw evidence remains
local at `.orca/uix-preset-picker/eval1-shots/`; no browser profiles are published.

## Clean-build correction — 2026-10-20

First hosted CI39369463852 FAILED: the new test's server-catalog import pulled
an undeclared core dependency into the concurrent web build. Correction38c57915
uses an independent two-fighter public DTO fixture; production source is
unchanged. [Independent correction review](review-ci-1.md) ACCEPT, prior Tier U
production acceptance retained. Parent validator EXIT0/8of8, five tests PASS;
web compilation input list contains zero server/core paths. No build/gate or
package dependency changed. Fresh hosted CI is pending. The reviewer launcher
initially lacked its ignored resume wrapper; no agent started, the wrapper was
restored and the existing dispatch completed normally.

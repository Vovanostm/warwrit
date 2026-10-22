# World rollback test isolation — #282

Test-only Tier D prerequisite for #272. The destructive rollback case now uses
its own disposable database; ordinary OIDC/company/encounter tests still share
the primary database and retain default parallelism.

- [Accepted contract](contract.md)
- [Author implementation, native diagnosis, checks and limits](report.md)
- [Independent Tier D ACCEPT](review-1.md), frozen code
  `d553215b946ad937f78aff6144529de889b71905`.

Source commits: `961ff8e3` and `2557e2df`; ordinary main integration `d553215b`.
Coordinator validator: exit 0, nine gates PASS. Its related tests were only
3 PASS / 11 SKIP without database URLs; they are not real-database proof.
Author real-DB proof: five default-parallel eight-file runs, 60/60 tests each,
zero skips at combined proof head `d118029f`; two deliberate lifecycle failures
also disposed owned resources. The reviewer inspected source and retained logs;
reviewer runtime/tests were NOT_RUN. Full details and limits are in the reports.

Raw diagnostics remain local at
`core-world-rollback-isolation/.orca/core-world-rollback-isolation/`, including
`baseline/`, `acceptance/`, both failure probes and validator logs at `.orca/`.
This page deliberately links only tracked files. No screenshots are required
for this non-visual slice. No production, migration, rule or player-facing change.
#272 still requires its own fresh mutation proof and Tier L gates.
Publication and CI do not establish merge or player-feature acceptance.

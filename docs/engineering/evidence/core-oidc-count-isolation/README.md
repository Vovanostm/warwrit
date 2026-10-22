# OIDC rejection assertion isolation — #272

The test now scopes both identity snapshots to its runtime issuer and attempted
wrong issuer, joining sessions through those accounts. Production auth and
parallelism are unchanged; all rejection and valid-login assertions remain.

- [Contract](contract.md), [author report with historical failures and fresh continuation](report.md).
- [Independent reviewer ACCEPT](review-1.md) at `72b6e4eb` and
  [independent evaluator ACCEPT](eval-1.md) at `6db7dd20`; source `37f35c6b` unchanged.
- Author wrong-issuer-account and owned-account-session mutations each fail the
  preserved equality, then restore. Five consecutive ordinary parallel real
  PostgreSQL runs pass all eight files and 60 tests, zero skips each.
- Ordinary main `c62ad2d0` integration conflicts only in shared records; histories
  retained. Coordinator validator at `30a38904`: exit 0, all nine steps PASS.
  Related OIDC test skips without a database; this is not additional PostgreSQL
  proof. The five actual author runs supply that acceptance evidence.
- Evaluator independently played default mill to round-8 victory and returned
  to editor; combat is regression smoke, not independently executed OIDC auth.
  Day/night/result JPEG captures accompany the exact verdict.
- Positive coordinator cleanup: evaluator browser PID 31643 absent and no
  listeners on its private ports 23611/25611. Author private database cleanup
  was positively recorded and independently inspected in both verdicts.

Complete untracked native scripts, patches, logs and source PNGs are retained at
`/Users/vovanostm/orca/workspaces/warwrit/pipeline-coordinator/.orca/pipeline/retained/core-oidc-count-isolation/`.
The five suite logs are under `20261022-task-f24f4df0dbf0/`. Reports name original
worktree-relative paths as provenance; they are local paths, not tracked links.

Publication and final-head CI/merge are coordinator-owned and pending this record.
Full local integrated verify/stress/migration suites NOT_RUN; performance
NOT_MEASURED. No production/rule/protocol/replay/schema/migration/dependency change.

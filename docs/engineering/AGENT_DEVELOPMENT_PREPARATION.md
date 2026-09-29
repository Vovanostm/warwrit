# Agent development preparation — KISS revision

Status: reviewed preparation proposal, 2026-09-27; infrastructure fixes are not implemented.
Scope: the owner's review/simplify request, not activation of a gameplay card.
This supersedes the tooling recommendations in the Sept 27 audit, preserving its
observations and evidence. CURRENT_PLAN and canonical sources still own delivery.

Dated amendment, 2026-09-27: the owner subsequently requested native Codex subagent
roles and responsibility boundaries. [AGENT_TEAM](AGENT_TEAM.md) adds three narrow
profiles and a source-linked memory index. This adds no orchestration framework or
hooks and does not complete the two infrastructure repairs below.

Dated amendment, 2026-09-29: PR #105 implemented the verification-database
isolation repair. The cross-workspace relative-import repair is still open. On the
owner's request the harness was hardened: the getsentry `code-review` and
`code-simplifier` helpers were removed (their applicable checks moved to
`warwrit-review`); best-effort command guards were added in `.codex/rules/` and
`.claude/settings.json`; `pnpm check:migrations` runs in pull-request CI; and
`pnpm agent:preflight` records checkout identity. Statements below about installed
helpers and the absence of hooks describe the 2026-09-27 state.

## Keep the existing workflow

Use `warwrit-context`, `warwrit-domain`, `warwrit-review` and `warwrit-delivery`.
Two optional review helpers are installed in `.agents/skills`: `code-review` and
`code-simplifier`. Their [provenance and project precedence](../../.agents/skills/README.md)
are recorded locally. They add no runtime dependencies or executable hooks.

Use Git worktrees, a bounded assignment and the existing gate. A new orchestration
framework, ownership database, three agent-management scripts and lifecycle hooks
are not prerequisites for the next bounded development task.

## Two immediate repairs

| Change                                      | Existing owner / write scope                                                                 | Evidence                                                                                                  | Acceptance                                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reject cross-workspace relative imports     | `scripts/check-architecture.mjs` and focused fixture test                                    | The unchanged checker accepts web→server relative imports; equivalent named import fails                  | Internal relative and allowed public imports pass; forbidden relative, deep, undeclared and cyclic imports fail                                             |
| Isolate verification PostgreSQL and cleanup | `scripts/bootstrap.sh`, `scripts/migration-smoke.ts`, minimal test infrastructure definition | Fixed 5432/shared Compose lifecycle; smoke defaults to application DB; status can write before assertions | Two owned disposable jobs coexist; failure/interrupt A preserves B and an audit-owned persistent-like fixture; missing smoke target fails before connection |

Keep developer `db:up` persistent. Give verification its own resources and clean
up only resources created by that invocation. Do not add test records to valued
developer databases. Preserve the real migration up/down/idempotency checks.
Do not replace the architecture checker or add a general process supervisor.
For isolation, run two real migration/lifecycle jobs with failure and signal
cases; do not duplicate the full build/unit/combat gate merely to test DB ownership.

The prior estimates for these two repairs total 8–16 engineering hours. This is
an unvalidated scope estimate, not elapsed agent time or measured savings.
The earlier 27–53 hours included optional and later work; it is not a prerequisite
budget for beginning development. Scope PRs by cohesive, independently reviewable
responsibility and include the necessary tests and docs. Treat diff size as a review
signal; split only work that can be verified independently.

## Parallel work without a new control plane

The parent assigns work and verifies the combined result. Use separate worktrees
for writers and separate build/service resources when needed. Subagent creation
alone does not isolate files. Read-only review can run alongside useful local work.

Each assignment needs only:

1. One outcome and non-goals, with the applicable source/contract pointers.
2. Verified base, branch/worktree and required merged predecessors.
3. Allowed paths, existing writer ACKs and any exclusive service resources.
4. Observable acceptance, focused checks and a bounded stopping condition.

Each handoff reports changed paths, exact revision, command outcomes/log pointers,
findings and unfinished work. Reuse the delivery skill's existing template; do not
create a second receipt format. Dirty changes must be inspected before attributing
evidence to a committed tree. A stale or missing source is unknown, not permission.

One writer owns each shared path. The existing C05-FIN reservation remains with
its author until an explicit release. No new local JSON registry overrides it.
Start with one independent worker only when it can run alongside useful parent
work; add concurrency when there are further disjoint tasks, not to fill slots.

The parent reviews the union and uses the existing exact-tree gate once. Individual
green branches do not prove their union. No worker acquires merge authority from
its role, successful CI, a skill or this proposal.

## Add tooling only at the relevant boundary

| Trigger                                                 | Smallest next change                                                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent UI/server work                               | Explicit web port/API origin and strict port failure; verify two actual lanes before relying on them                                |
| QA00 / runnable PB path                                 | Single-lane health UI verification can start without parallel-lane infrastructure; add real PB journeys when implemented            |
| Delivery enforcement                                    | Configure a narrowly scoped GitHub rule requiring the existing CI check; verify effective policy without merging a negative-test PR |
| A demonstrated recurring preflight/coordination failure | Automate that specific check in an existing owner; add a hook only if the supported host provides measurable benefit                |
| Realtime or accepted renderer work                      | Load the previously researched official engine skill at the ADR-defined stage, checking exact versions and local API types          |

Do not introduce SessionStart/SubagentStart/PostToolUse/Stop pipelines, a custom
agent registry or a new orchestration skill now. Hook availability and absence
of configuration do not establish a problem. Keep GitHub enforcement separate
from local hooks: bypassable local checks cannot replace remote required checks.
Clarify the PR template by linking the single gate owner rather than adding
another command list. Do not rename bootstrap interfaces merely for symmetry.

## Evidence and limits

The local original audit (`artifacts/agent-readiness-2026-09-27/REPORT_RU.md`, Git-ignored)
retains scripts, hashes, positive/negative fixtures and baseline execution on
`a5fb1c0ba42d94ce80f8dce16d04203b9827c02e`. The
KISS review (`artifacts/agent-readiness-review-2026-09-27/REVIEW_RU.md`, Git-ignored)
records selection and simplification reasoning. These ignored artifacts are local
evidence; share the accompanying archive if another checkout needs them.

This change installs review guidance and refines the plan. It does not fix the
checker, isolate the existing bootstrap, enforce GitHub policy, or prove agent
speedup. No throughput/token/cost improvement is claimed. Existing product source,
browser/device, SQL race/crash and original-archive evidence boundaries remain.

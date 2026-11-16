# N12 — Reproducible launch and hosted-test preparation

## Current result — 2026-11-16

SCOPED LOCAL release-artifact and PostgreSQL-readiness rehearsal passed. N12 is
not complete: normal OIDC login/company re-entry, backup/restore, compatible
rollback, capacity measurement and full M1 evidence join remain NOT_RUN. No
deployment, paid provisioning, pilot audience/size or reduced M1 acceptance is
authorized by this package.
[Common contract](COMMON.md). [Prompt](prompts/12-release-preparation.md).

Earlier status on 2026-11-08: SPECIFIED / LOCAL; the fresh release rehearsal had
not run.

## Production artifact and health rehearsal — 2026-11-16

At `39ec7ce22a7a943a22219cf217f26985cf6516e5`, frozen offline install passed.
The root build first exposed a missing direct web-to-game-core workspace edge;
adding that declared dependency fixed the web TypeScript failure. Core,
protocol, testkit and server production builds then passed in `pnpm build`.
This worktree's sparse checkout excluded tracked art: after materializing
`assets/art`, `pnpm --filter @warwrit/web build` passed (3,557 modules). A single
root `pnpm build` after restoring all sparse paths was NOT_RUN; the web production
artifact was built separately after the other packages.

Created the isolated PostgreSQL database `m1_release_rehearsal_20261116` through
the existing local tunnel, applied migrations `0001`–`0032`, and started the
compiled production entrypoint on `127.0.0.1:3035` with realtime port `3036`.
It connected through a local proxy on `54922` to the existing tunnel on `54921`.
Initial `/health/live` and `/health/ready` both returned 200; `/playground`
returned 404. Stopping only the local proxy left liveness at 200 and changed
readiness to 503. Restoring the proxy returned readiness to 200. The process
then stopped cleanly and restarted against the same rehearsal database; both
health routes returned 200 again. The shared PostgreSQL/Dex services stayed up,
and no retained database was used. The temporary mode-600 environment file was
removed after shutdown.

This closes the local DB-readiness, restart and production playground-exclusion
substeps. Browser OIDC login and a player's saved-company re-entry were NOT_RUN;
the required second executor's normal login/restore is still open. This evidence
does not establish hosted readiness, rollback safety, player acceptance or full
M1 completion.

## Player outcome and readiness states

An approved participant can eventually use normal identity and a reproducible
build, retain the same company and recover from a failure. This task delivers a
reviewable local artifact/configuration/runbook and truthful readiness report.
Try now: persistent clean checkout → frozen dependencies → isolated configuration/
DB migrations → production artifact/start → normal login/company → stop/start/
re-entry → dependency-down readiness → compatible rollback rehearsal.

PREPARED_LOCAL means local artifacts and drills pass. READY_FOR_OWNER_TEST means
machine evidence is ready but human acceptance remains. READY_FOR_DEPLOY_REVIEW
means the specific proposed environment/audience/runbook is reviewable.
None means DEPLOYED, full M1 accepted or hosting authorized.

## Dependencies and sources

Existing#176/#177/#175/#174; [M1](../../wiki/m1-spec.md),
[local development](../../engineering/LOCAL_DEVELOPMENT.md),
[ADR0003](../../architecture/0003-m0-m1-technology-baseline.md),
[ADR0006](../../architecture/0006-m1-renderer-babylon.md), actual production config/
health/auth/realtime scripts and N01 candidate evidence.
Preparation can proceed early. Full-M1 acceptance requires N02–11's applicable
criteria and existing residual/pipeline requirements, plus actual owner acceptance.
A smaller invited pilot needs an explicit separate acceptance scope; do not
silently turn a recommendation for 10–20 players into approval or measured capacity.

## Leaves and full behavior

- P1 Clean local launch: fresh persistent checkout, pinned frozen install,
  documented env placeholders, owned PostgreSQL/identity, ordered migrations,
  ordinary production build/start/stop and retained re-entry. Reuse accepted
  artifacts/setup; no dev fixture login advertised as a public account service.
- P2 Production dependency/isolation: required DB/OIDC failures prevent a false
  successful game startup; readiness 503 when a required dependency is unavailable.
  Liveness remains distinct. Production debug routes/chunks refuse/are absent.
- P3 Hosting proposal: one proposed HTTPS origin, normal OIDC callback/session
  and WebSocket upgrade, process supervisor/restart, logs without secrets,
  backup/restore and compatible release rollback. Prepare config templates,
  artifact/install/runbook locally; name actual deployment-specific missing values.
- P4 Capacity plan/measurements: named hardware/workload, ordinary player behavior,
  declared test audience and resource method. If actual authorised resources are
  unavailable, deliver a runnable bounded measurement plan and state capacity
  NOT_MEASURED. Never run coding agents/load generators on the game VM.
- P5 Final acceptance join: map all accepted M1 scenarios/actions/content/pipeline,
  durability, desktop/device and real owner comprehension to compatible evidence.
  Identify each open requirement; prepare concrete play instructions for the owner.

A restart or rolled-back compatible binary reads existing state without reset.
Do not promise schema downgrade after newer writes; use actual migration guards,
version compatibility and backup recovery policy. External identity/recovery and
end-to-end HTTPS/WebSocket require actual environment evidence at later rollout.

## Architecture and exact write boundaries

Use the pinned modular monolith and existing Fastify/PostgreSQL/Babylon build.
Candidate scope: existing root/package build/start scripts only as required,
server config/health/auth composition, relevant deployment/config templates and
runbook under existing ops/docs ownership. Pin concrete files before edits.
Reuse migration/health/identity/redaction instead of a platform migration.
OUT: deploying, paid purchases, domain registration/DNS changes, real-user invites/
messages, payments, Yandex identity launch, multi-node/Redis topology or M2 scope.

## Work plan

1. Refresh actual candidate, scripts, env contract and deployment permission.
   Complete missing local preparation without waiting for external approvals.
2. Reserve clean persistent checkout, isolated DB/identity/ports and run P1.
3. Exercise P2 against the actual artifact with dependency loss and restart.
4. Produce local config templates/runbook for P3: install/migrate/start/verify,
   observe failures, backup/restore, rollback and owner-operated recovery.
5. Rehearse permitted local install/restart/rollback; link N11 restore evidence.
6. Prepare P4 and perform only authorised bounded measurements on isolated resources.
7. Reconcile P5 with owning feature/task records. If human/device inputs are
   missing, provide exact playable setup and leave those criteria open.
8. Present the concrete proposed environment, artifact revision, audience/scope,
   expected operations/costs if known, rollback and residual risks. Ask for explicit
   deployment/provisioning permission ONLY when that is the next desired action.

## Acceptance / DoD

- [ ] REL-1 A fresh persistent checkout produces and starts the ordinary release
      locally using documented pinned setup; normal login/re-entry retains state.
- [ ] REL-2 Real required-dependency failure/readiness, process restart and
      production debug exclusion are exercised on the actual local release artifact.
- [ ] REL-3 Reviewable hosting config/runbook names identity/HTTPS/WebSocket/
      supervision/backup/restore/rollback and missing environment-specific values.
- [ ] REL-4 A compatible local rollback is rehearsed without player-state reset;
      unsupported downgrade conditions are explicit and preserved.
- [ ] REL-5 Measurement method, actual results and absent target capacity are
      distinguished; owner chooses test scope before audience/capacity is promised.
- [ ] REL-6 Full M1 criterion/evidence join and owner's shortest play instructions
      are complete; unresolved gameplay/device/human criteria remain open.
- [ ] REL-7 Delivery accurately states PREPARED_LOCAL or review readiness; no
      external deployment, purchases, invitations or M1 acceptance is inferred.

N12's preparation DoD can pass while proposed external rehearsal or full M1 owner
acceptance remains open, provided REL-5/6 explicitly identify those limits. That
does not close the root full-M1 checkbox. Actual external rollout is a separately
authorized mission with exact target/version, verification and rollback steps.

## Checks and blockers

Docs/templates: syntax/wording/links; affected config/health tests and actual clean
artifact/browser drill; real migration checks only for schema changes.
Missing domain/provider/budget blocks external application, not preparation.
A failed advisory full suite is reported honestly; it does not justify a silent
scope cut or force another infrastructure project before useful local work.

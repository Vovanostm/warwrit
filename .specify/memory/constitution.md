# Warwrit Constitution

## Authority

The repository [AGENTS.md](../../AGENTS.md) owns the engineering contract.
Use its authority order and dated owner decisions when preparing specifications,
plans, tasks and implementation. The Spec Kit workflow follows that contract.

## Core Principles

### Complete player journeys

Describe the player goal, normal entry point, choices, alternative outcomes,
failure and retry behavior, saved consequences and one observable outcome in
the owning feature page before feature code.

### Simple accepted architecture

Use the existing functional modular monolith and accepted technology baseline.
Keep game-core pure, deterministic and serializable. Preserve exact money,
ownership, authorization, privacy, atomicity and idempotency at public boundaries.

### Established game and visual direction

Use the current wiki and accepted owner decisions for game rules and lore.
Target the desktop interface and the approved restrained graphic-novel 2D style.
Read the affected art/lore sources through AGENTS.md before visual work.

### Proportional verification

Use direct player checks and focused checks for concrete risks. CI, full suites,
coverage, audits and independent reviews follow the advisory rules in AGENTS.md.
Record actual results, NOT_RUN checks and NOT_MEASURED measurements.

### Preserve ownership and delivery permissions

Preserve unrelated work and player data. Keep one writer per shared path.
Follow the existing permissions for merge, deployment and paid provisioning.

## Project Navigation

Start at [ROADMAP](../../docs/engineering/ROADMAP.md) and the requested task's
owning document. Keep task details with that owner and record substantive changes
in [CHANGELOG](../../CHANGELOG.md). Reuse existing specifications and link their
sources when generating feature artifacts with Spec Kit.

The active M1 overview is [spec.md](../../specs/001-warwrit-m1/spec.md).
Its linked plan and tasks map to existing feature owners. The [wiki reference](../../docs/wiki/m1-spec.md) owns clocks, original contract
instances, narrative scenes and released FIRST HUNT terms.
Use `SPECIFY_FEATURE_DIRECTORY=specs/001-warwrit-m1` when explicitly selecting
this package in a fresh checkout.

## Governance

This file adapts the installed Spec Kit template to existing repository decisions.
Read the current AGENTS.md when its rules change and reconcile this summary.

**Version** 1.0.2

**Adapted from repository decisions** 2026-11-14

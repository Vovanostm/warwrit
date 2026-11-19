# Review rules and simple design

Moved from root AGENTS.md on 2026-11-08 without changing the owner policies.
Read for the affected task only; current [AGENTS.md](../../../../AGENTS.md)
owns authority, permissions, advisory CI and optional independent review.

## Simple design

Use intention-revealing names, cohesive functions and modules with one reason to change. Separate policy from transport/storage and prefer explicit data over hidden side effects. Share a rule when it is genuinely the same rule; do not compress code into clever expressions merely to reduce lines.

Keep the functional modular monolith. No class per command, generic framework, DI container, event bus, service or abstraction without a present requirement. Remove dead code and duplicated work. Catalogue data is not duplicate business logic; independent test expectations are not a second implementation.

## Code Review Rules

For delegated work, use [the Codex role/ownership guide](../../../../docs/engineering/AGENT_TEAM.md).
Retrieve [operational memory pointers](../../../../docs/engineering/AGENT_MEMORY.md) on demand.

Review observable failures before cosmetic rearrangement. Give each finding its
violated source/postulate, concrete counterexample, affected boundary and smallest
fix. Distinguish reproduced defects from risks, balance hypotheses and style
preferences. A green test suite does not prove absence of defects.

SSOT means one owner for each rule or mutable fact, not merely fewer repeated
strings. Derived views, immutable observations and independent test oracles are
not competing truth when their inputs and refresh boundary are explicit. Check
all consumers before extracting a rule; similar-looking policies can differ.
SRP follows reasons to change (e.g. cash movement vs departure eligibility), not
one file per command. KISS/YAGNI favor a finite current contract over speculative
frameworks; they do not justify leaving proven defects or unsafe coupling.

Domain-specific review checks live in
[warwrit-review](../../../../.agents/skills/warwrit-review/SKILL.md#known-defect-patterns).

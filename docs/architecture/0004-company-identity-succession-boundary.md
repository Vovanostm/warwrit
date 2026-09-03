# ADR-0004: Model company continuity as a persistent character graph

- Status: Accepted
- Date: 2026-09-03
- Requirements: `Q-CHAR-01A`, `Q-CHAR-01C`, `Q-CHAR-10`, `Q-CHAR-11`, `Q-CHAR-12A`, `Q-CHAR-12B`, `Q-CHAR-12C`
- Work package: `WP-02 — Character, Company & Inventory Domain`

## Context

The original planning material treated company continuity after defeat too loosely and at one point allowed an emergency weak successor to appear when no real successor remained. Subsequent owner decisions in the Warwrit Airtable decision ledger superseded that fallback and established a persistent company/character graph.

WP-02 must encode those accepted decisions before character, inventory and succession implementation begins. The domain must distinguish persistent company identity from the currently controlled leader and must not manufacture continuity at the moment of defeat.

## Decision

### Persistent identity

Use the conceptual ownership chain:

```text
Account
  -> Company
       -> CurrentLeader / ActingLeader
       -> Characters
       -> Household / roster assignments
       -> Chronicle and company-level knowledge
```

`Company` is the persistent run-level identity. The player directly controls the current leader, but leadership may change while the same company continues.

The company keeps its stable `companyId`. Chronicle/history and historical discoveries survive valid succession. Company name and banner are mutable presentation/history-bearing attributes rather than the technical identity key.

### Starting family/household

After origin selection, the player selects an origin-compatible family story. At run creation this may create zero to two named relatives as ordinary persistent `Character` records.

These characters exist before any succession crisis. They may live outside the active combat roster and remain part of the persistent company/world graph.

The system must never generate a missing relative, companion or adult regent retroactively merely to prevent game-over.

### Succession

A permanent successor is selected from eligible existing characters.

An eligible permanent leader is alive, free, adult, capable, available/located, and connected to the company or leader family according to the approved succession policy.

A designated heir is optional. Selecting another eligible candidate is allowed but emits canonical legitimacy/relationship consequences; designation is not a hard ownership lock.

Company rights and company-level bonuses may transfer. Personal skills, personal perks and individual relationships are not copied from the previous leader.

### Acting leadership and minors

Temporary/acting leadership is a state of the same leadership model, not a separate dynasty subsystem.

A minor relative cannot directly lead. A minor preserves a succession line only when an eligible adult company member exists who can act as leader/regent. The player controls that adult character.

When the minor becomes adult, the game may resolve acting leadership into either restored hereditary leadership or permanent leadership by the acting leader, according to the approved player choice and consequences.

### Hard game-over

Evaluate game-over from the complete persistent company graph, not only the defeated travelling party.

The run continues when at least one of these conditions is true:

1. an eligible existing adult permanent successor exists; or
2. a minor heir exists together with an eligible adult acting leader/regent.

If neither condition exists, the run ends.

Captive, missing or otherwise unavailable characters do not count as immediately available successors. Minors without an eligible adult regent do not prevent game-over.

No emergency successor is created at the terminal check.

### Inheritance policy

Succession effects are category-based and versioned rather than a single random loss percentage.

Accepted boundaries:

- chronicle/history and company-level knowledge/maps/rumors persist;
- assets follow their physical location/custody outcome;
- contracts declare whether they are company-bound, leader-bound or have an explicit succession clause;
- company-level rights/bonuses may transfer;
- personal skills/perks and personal relationships do not transfer;
- reputation/trust may weaken under a versioned provisional succession policy rather than being silently copied.

Exact balance values remain provisional evidence questions and must not be hard-coded as immutable domain facts.

## Domain invariants

WP-02 must make the following enforceable:

- every `Character` has one canonical identity;
- a character cannot simultaneously be dead, captive, missing, active and home in incompatible ways;
- leadership references existing characters only;
- a generated family character is created through the opening flow, not through defeat recovery;
- terminal game-over evaluation is deterministic from persistent state;
- succession emits explicit events and is replayable/auditable;
- item ownership/location remains unique across succession.

## Explicitly unresolved before WP-02 implementation

This ADR does **not** resolve the still-open S-02 packet:

- `Q-CHAR-13A` — final immutable/mutable character-state taxonomy;
- `Q-CHAR-13B` — canonical roster/location/assignment transitions;
- `Q-CHAR-13C` — post-battle outcomes versus player knowledge of those outcomes;
- `Q-CHAR-14A` — earned nickname consent/history policy;
- `Q-CHAR-14B` — derived combat role and slow retraining boundary;
- `Q-CHAR-14C` — scars, permanent injuries and rare treatment boundary.

Those questions must close before WP-02 changes from `Design Blocked` to `Ready for GitHub`.

## Consequences

Positive:

- defeat has real stakes without arbitrary emergency continuity;
- succession works from existing persistent entities and is testable;
- company history survives without copying the identity/build of a dead leader;
- household/family characters can later participate in narrative and world simulation without a second identity system;
- hard game-over has one deterministic predicate instead of scattered special cases.

Negative:

- character location/status modeling becomes a required domain concern in WP-02;
- succession, captivity and missing-person states require explicit transitions instead of simple roster removal;
- some balance decisions remain provisional and require later playtest evidence.

## Superseded behavior

The historical fallback that always creates a new weak continuation character when no reserve/successor exists is superseded and must not be implemented.

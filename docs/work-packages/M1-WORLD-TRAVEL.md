# M1 world travel execution contract (W03 extension)

Status: finite engineering contract, 2026-09-30. It is not a product approval,
implementation, or evidence that travel beyond the safe alpha edge works. The
original source ZIP remains `RC-GAP-MACHINE-01 / NOT_RUN`; this contract does not
reconstruct it.

## 1. Authority and source labels

Use the latest explicit owner decision, then accepted canonical records, then
this bounded engineering contract, then implementation. Labels below prevent a
storage or API proposal from becoming an unapproved gameplay rule:

- **ACCEPTED** — source-backed gameplay rule; cite the source beside the rule.
- **IMPLEMENTED** — observed current code only; not authority for new policy.
- **PROPOSED** — finite engineering shape for review; not canonical policy.
- **UNRESOLVED** — material gameplay input or producer is absent; affected
  dangerous/camp/carried-member activation stays closed until sourced.

| Source                                                                                                                                                                                    | Authority used here                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1 index `recZhUoTiwT7kIc8s`, Notes §5 “Persistent world” and dated 2026-09-29 operational comment `comfbUJMfwcjVWq2v`                                                                    | W03 outcome: actual routes/free intent/terrain/capability/not-before arrival/epoch; stale old segments after reroute; no auto-recruit/F1/contract/JOIN on arrival. W04 remains dependent on W03 and the operational I02a consumer checkpoint. Full I02 remains an M1-ACCEPT prerequisite.                                                                                                                                |
| WORLD `recTrujX2wy7V49qk`, Purpose + Notes B/RC-v1; accepted route approval `rechIKj0hsvfXIvFU`, Notes §§4–5 incl. RC-P2.2; lore v1.2 `recQNKqYfwoJpCXVu`, Notes §§D02–D04                | RC-P2 AAAA: 6 real hours per 1,000 Campaign ticks; separate 600s/300s Light cycle; prospective clock segments; RC-P2.2 requires an already accepted offline route to continue defensively through its existing itinerary; expose supply assumptions and reject a known-shortage new dangerous route, without this guard blocking a valid return/camp. No invented starvation death, teleport, or guaranteed safe return. |
| `M1-WORLD-FOUNDATION.md`, W01/W02                                                                                                                                                         | Authored region edition and exact clock boundaries are provisional source-linked data, not archive recovery. Existing lifecycle party/character location remains the position owner; pure core receives explicit time.                                                                                                                                                                                                   |
| Physical `WP02.4-CONTRACT-v1`, `recuaQS4s8GTRcEgA`, §§A–D; lifecycle `WP02.2-CONTRACT-v1`, `rec39pw7h0ycTk4r7`, §§4.2–4.7; economy `WP02.3-CONTRACT-v1`, `recveXOcVDyTz6dAZ`, §§E2, F1–F6 | Identity, location, capability, items/custody, current food, exact interval carry, local access, recovery and knowledge have separate owners. Presence, duty and ability are not interchangeable. Reject missing trusted facts; no partial preparation as acceptance.                                                                                                                                                    |
| Accepted SPEC-CONTRACTS derivative `docs/content/CONTRACTS_M1_DERIVATIVE.md`, §§“Limits and outstanding producers” and “Participation and claim boundary”                                 | Contract slots and helper presence do not create world facts, custody, proof, or JOIN authority. Arrival is not contract acceptance or physical encounter participation.                                                                                                                                                                                                                                                 |
| M1 production plan, phases 1–4; current `NEXT_SESSION_HANDOFF.md`, “Safe-travel execution contract”                                                                                       | Delivery dependencies and the exact already-supported safe-trip boundary. These are operational checkpoints, not new product rules.                                                                                                                                                                                                                                                                                      |

The source ZIP, original narrative catalogue, and any unaccepted source draft
remain separate from this contract. Named coordinates, route durations and
profiles remain authored/versioned implementation data, not recovered canon.

## 2. Scope and preserved subset

W03 owns route proposal validation, accepted route execution, segment-bound
arrival, route epochs, and the trusted inputs required to admit a route. It does
not own food debit, stamina/fatigue balance, care/recovery, encounter outcomes,
field-camp/F1 settlement, NPC population, contract facts, or multi-company JOIN.
Those remain with their accepted domain owners and W04/W05/W06, RT, CT, JOIN and
H integration packets.

**ACCEPTED:** preserve the existing safe `NEW` and `RETURN` edge as a supported
subset. The current authored trip is `severny-dvor` ↔ `kamenny-brod` on
`kamenny-brod-severny-dvor`, with 10 provisional ticks. Existing API evidence is
not enlarged by this contract: request schema 1, ordered `edgeIds`, optional
`purpose: NEW | RETURN`, server-minted segment ID, stored due tick, exact outer
receipt, and the same-tick arrival/return path. Existing routes still reject
early arrival and settle an accepted late arrival only through its stored
`dueTick`. Preserve safe V1 `RETURN` from the actual site and direction under
its existing epoch/revision checks; it does not require a historical route row.
This compatibility exception is limited to that safe edge and does not
authorize a dangerous-route reversal.

Current implementation checkpoint (not source authority): c06
`4489db47728d1b72794436df8eafb0cfdbd97d31`, committed tree
`cd54141eb88d030ebb8b8e680e828f0df1c734a`; observed files include:

| File                                     | SHA-256                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `apps/server/src/world/routes.ts`        | `50d05391673312deef87fed684b002314760e1036227317d3347cb41f167c642` |
| `apps/server/src/world/repository.ts`    | `baa89631463f47be48bf97f17997ac56a05df465ca71b8b85a599f4994d57776` |
| `apps/server/src/company/executor.ts`    | `08a66bc75bef50627f77d6ecabbb19ef7b24bdc5b45ee10f6a98e42e331a2678` |
| `packages/protocol/src/world.ts`         | `a1206238c7e0230a18d49493dc0623ccccdb1f4b5a6b71667b174ac4787107e9` |
| `packages/game-core/src/world/route.ts`  | `3b4c235abd8ebe658a7747457d287aef3b76ff5b888c586e39d0890973163045` |
| `packages/game-core/src/world/travel.ts` | `0e572cad6a623514a9972844c0946f46070290f113132f990f91f8efb5892be0` |

The parent reported ordered seven-file digest
`896d4f2a85a2dd79fa7b4fa7b3e4cd26a6b91d0ed651767afce9c2f7b07643ac` and
Sol-READY focused evidence for that frozen successor. Its PostgreSQL results are
evidence for that exact subset only; they do not prove dangerous routes or this
contract.

## 3. Route plan, edition, cursor and segment

**PROPOSED — persisted execution shape.** Keep one immutable accepted itinerary
and one active edge segment, rather than treating a multi-edge list as one
arrival:

```ts
interface RouteExecution {
  schemaVersion: 2;
  routeExecutionId: string; // opaque, server-minted, fixed-format ID
  worldId: string;
  companyId: string;
  partyId: string;
  acceptedByAccountId: string; // immutable original-owner/audit binding
  regionVersion: string;
  profileId: string;
  routeEpoch: string;
  purpose: 'NEW' | 'RETURN';
  edgeIds: readonly string[];
  phase: 'IN_TRANSIT' | 'AT_BOUNDARY' | 'COMPLETE';
  nextEdgeIndex: number; // in-flight edge while IN_TRANSIT; otherwise next edge
  currentSiteId: string;
  segment: null | {
    segmentId: string;
    fromSiteId: string;
    toSiteId: string;
    startedAt: string;
    dueTick: string;
  };
}
```

`segment` is present only in `IN_TRANSIT`; it is null in `AT_BOUNDARY` and
`COMPLETE`. `currentSiteId` is the last actually committed location. During
transit, `nextEdgeIndex` identifies the active edge and `currentSiteId` remains
its `fromSiteId`. At a boundary it identifies the next accepted edge; at
completion it equals `edgeIds.length`. `routeExecutionId` is minted and bound
atomically with the initial accepted-route receipt; `acceptedByAccountId` is
the immutable original-owner/audit binding from that authenticated acceptance,
not a session token or continuation authority. Both remain unchanged across
segments, restart and reroute; `routeEpoch` distinguishes each accepted route
choice within that execution. The execution ID is opaque and bounded, never
client authority. These values may be copied into audit/diagnostic records,
but those links are not a replay index: authoritative exact replay looks up the
receipt by command ID before fresh evaluation.

This shape is a candidate, not a required public DTO. `regionVersion` identifies
the immutable authored route edition; `profileId` identifies travel parameters;
`routeEpoch` identifies the latest accepted route choice; `segmentId` identifies
one actual edge traversal. Validate that the full ordered edge list is
connected from the party's actual `AT` site and every edge resolves uniquely in
that edition. Store the immutable edge IDs and edition with the accepted
receipt. Do not silently substitute today’s topology or rates when resuming an
older segment.

**PROPOSED:** each accepted edge has its own trusted `startedAt` and
`dueTick = startedAt + that edition/profile edge duration`; the server, not the
client, mints the segment ID. Arrival validates world/company/party, route
epoch, cursor, segment ID, route edition, actual TRANSIT location, exact stored
`dueTick` and `notBefore`. Early arrival rejects unchanged. A late arrival
settles only the interval through the stored due tick, as current safe travel
does.

On a multi-edge itinerary, arrival at an intermediate site atomically commits
`AT_BOUNDARY`, the actual site, next-edge cursor and arrival receipt. A separate
idempotent `ContinueRoute` command rechecks the current epoch/cursor, mandatory
effects, supply and scoped authority before starting the next already-accepted
edge. The server-owned continuation trigger issues it after the boundary commit
when the accepted itinerary and required effects still permit continuation;
recovery after process restart re-derives the same command. No actor presence
is required. A scheduler, restart recovery or authenticated UI request resolves
to the same `SYSTEM` command principal; the triggering account is audit metadata
only, not another command principal or receipt. UI authentication authorizes
asking the server to trigger continuation, not impersonating the worker.
Derive the command ID as a fixed-size SHA-256
hash of a domain-separated, length-prefixed UTF-8 encoding of
`(routeExecutionId, nextEdgeIndex, regionVersion, routeEpoch)`.
`routeExecutionId` is persisted at initial acceptance, so recovery reconstructs
the identical ID; the tuple excludes mutable state and uses the accepted
execution/edition data. Check its exact receipt before any fresh evaluation. If
mandatory effects, supply or authority are unavailable, leave the route at
`AT_BOUNDARY`; reject without partial mutation or a finalized receipt, so the
same command identity can be retried when its prerequisites permit it. The
command cannot find a new path, select an unaccepted branch, reroute, admit an
optional threat, or authorize CAMP. The new segment receives a fresh ID and due
tick. Each next segment begins only through this explicit durable command,
including when the server trigger issues it; there is no unrecorded
continuation.

For an accepted itinerary A→B→C while the player is offline, committed arrival
at B persists `AT_BOUNDARY` with the cursor for B→C. A post-commit wake-up may
prompt the server worker, but is only a hint: a durable scan on worker startup
and recovery discovers pending boundaries, so a crash cannot lose continuation.
The worker may perform an internal read-only, unlocked candidate scan and
exposes no cross-company enumeration response. For the command transaction,
both player and `SYSTEM` paths use one lock order: lock the persisted
`acceptedByAccountId` account row first, then the company snapshot/root, then
the route-execution/segment row, then receipts, clock and effects in the
existing canonical order. No `SYSTEM` path locks a route row before the company
snapshot. After acquiring these locks, revalidate account ownership, world,
company, party, route edition and epoch. Missing or changed account ownership
fails closed with the route unchanged at `AT_BOUNDARY`.

The worker issues `ContinueRoute` under the finite server-owned `SYSTEM`
continuation principal, without creating or impersonating an account session.
It may start B→C only after the locked revalidation above and confirmation that
the accepted itinerary and mandatory effects still authorize that next edge.
If allowed, B→C starts under its own segment ID/due tick and the same accepted
itinerary. If mandatory effects are unavailable, the route remains at B in
`AT_BOUNDARY` until retry can pass; offline continuation does not create
optional threats or replace the route. Recovery re-derives the same
deterministic command ID. A committed receipt is returned before reevaluation,
never causing a second segment start.

The current cookie-authenticated `/world/travel` route is not this offline
adapter: a dedicated server-owned worker/adapter is required. If the UI exposes
a continuation action, it authenticates normally and is authorized only to ask
the server to trigger the same `SYSTEM` command identity and receipt. Record the
triggering account as audit metadata only; it does not change the principal,
command digest or receipt identity, and cannot create a second receipt or act
for another company. This is a finite engineering authorization boundary, not
a claim that an arbitrary system principal can issue gameplay commands.

**PROPOSED:** increment `routeEpoch` once when a new itinerary or reroute is
accepted; advancing its cursor does not change the epoch. Reusing an old epoch,
cursor, or segment cannot move anyone. Exact historical retries still return
their stored response before freshness checks; they do not re-run arrival.

## 4. Preview, recheck, interruption and free intent

**ACCEPTED:** the client may provide route intent, never canonical position,
time, danger result, supply result, epoch, segment ID, or trusted arrival. The
server validates the proposal against its current world/company state. Arrival
only establishes physical position; it does not automatically recruit, change
duty, begin F1, accept a contract, pick up proof, or join a battle (M1 index,
W03; lifecycle `WP02.2`, §4.3; SPEC-CONTRACTS derivative).

**PROPOSED:** preview is a read-only projection over a specific
`worldId/companyId/partyId`, actual `AT` location, `regionVersion`, `profileId`,
public revision, route epoch, ordered edges and current trusted supply evidence.
Preview creates no accepted route, receipt, resource debit or movement. On
confirmation the server re-reads the same authoritative facts and recomputes
route continuity, travel capability, route edition/profile, clock, and any
required supply/return/camp evidence under the command transaction. A stale
preview is rejected without mutation. Preview discloses only owner-authorized
supply assumptions and public route facts, never hidden entities or foreign
company state.

**IMPLEMENTED:** the pure `RouteIntent` currently has `ROUTE | FREE_INTENT`;
`FREE_INTENT` is limited to one edge by its current preparer. It is not itself a
durable command or a trusted proof. **PROPOSED:** preserve that meaning as a
read-only adjacent-edge preview. A confirmed `ROUTE` is the only input that can
create durable movement. If a later UI uses “free intent” differently, that
meaning needs an explicit contract before the core type is broadened.

**PROPOSED:** reroute is permitted only from an authoritative stationary `AT`
state. The server keeps completed segments, supersedes only the untraversed
suffix, validates the replacement from the actual site, and advances the route
epoch atomically. A segment already in transit cannot be rewritten into an
arrival elsewhere. Old segment arrivals after reroute reject without mutation;
their exact old receipts remain replayable. **UNRESOLVED:** mid-transit
interruption/retreat requires its own physically grounded producer and accepted
outcome. Until that producer exists, do not stop at an invented site, teleport,
or discard cargo/people. The currently supported failure is rejection with the
stored transit state intact.

For an accepted itinerary while disconnected, preserve RC-P2's defensive
offline policy: continue only its already accepted edges; do not accept a new
optional threat or guarantee a safe return. An actual attack is handled by the
real encounter authority. At each segment boundary re-evaluate actual
membership, current capability and mandatory effects before starting the next
edge. If a required producer cannot settle them, stop continuation at that
boundary with the route/cursor preserved and reject further movement. No
fictional background job or optimistic arrival.

## 5. Trusted dangerous-route supply assessment

**ACCEPTED:** a new dangerous route must show its supply assumptions and reject
a _known_ shortage. This check must not block a valid RETURN or CAMP. The source
does not approve a new starvation death or a universal food-sufficiency rule.
Danger comes from the accepted edition’s edge facts, not the client or a label.
An all-safe route does not acquire the dangerous-route gate merely because it
uses the same endpoint.

**PROPOSED — trusted producer boundary.** The authenticated server/world
adapter derives a `RouteSupplyAssessment` from the locked, complete
company aggregate and the exact candidate itinerary. The client cannot submit
or override it. The assessment binds at least:

```ts
interface RouteSupplyAssessment {
  worldId: string;
  companyId: string;
  partyId: string;
  canonicalRevision: string;
  publicRevision: string;
  atTick: string;
  routeEpoch: string;
  regionVersion: string;
  profileId: string;
  edgeIds: readonly string[];
  demandHorizon: { fromTick: string; throughTick: string };
  knownShortage: boolean;
  assumptions: readonly string[]; // source-backed facts, not free-form client text
}
```

The pure route preparer validates that the assessment exactly matches the
current scope, revision, tick, epoch, edition, profile and edge list; it does
not authenticate its producer. The authenticated adapter owns that trust
boundary. Missing, mismatched or incomplete assessment fails closed for a new
dangerous route; never turn absence into “enough supplies.” Safe-route behavior
and receipt semantics remain unchanged.

The producer reuses existing owners: finance's `FOOD_CONSUMPTION` requirements
and campaign-tick carry determine demand; physical state owns item identity,
owner, container, custody and `FoodCarry`; lifecycle owns active membership,
party membership, duty and position. It must not duplicate a food formula or
wallet. The current physical safe-travel evidence admits only company-owned food
in a company-accessible, company-custodied container at the member’s exact
location; a `PARTY_SUPPLY` container must be carried by that member’s actual
party. Keep those predicates unless a source-backed later rule changes them.
Only a real carrier/container follow effect moves an eligible party supply to
TRANSIT; `RoutePreparation.carrierFollow` is not itself that effect. Preserve
item IDs, quantities, owner, custody, container capacity, and existing
fractional food carry. No remote store, client claim, character presence, or
same-site assumption grants access.

**UNRESOLVED — activation gate:** accepted sources do not settle the assessment
horizon (next edge, full accepted itinerary, or through a defined resupply
point), treatment of uncertain future provision, or dangerous-route food and
fatigue coefficients. The finite authored edge ticks and current safe-alpha
stamina profile are provisional values, not a final survival policy. The
producer must expose the chosen horizon and assumptions. Do not enable a
dangerous route until the owner contract names that horizon and the relevant
versioned profile. A missing horizon/profile is a rejection, not an optimistic
placeholder.

Actual food fulfillment remains a separate required effect. Assessment is a
pre-departure forecast; it neither consumes stock nor grants `FOOD_FULFILLMENT`.
At each authorized elapsed interval, use the real finance demand and physical
fulfillment/carry path exactly once. If a real effect is unavailable, the whole
movement command rejects unchanged. No starvation death follows from an
uncovered interval without its own accepted causal rule.

## 6. Scoped RETURN and CAMP authority

The core accepts a structurally scoped return/camp authorization input; that
type is not a producer or proof by itself. Route presence, a `RETURN` enum, a
low food count, or the client’s assertion does not create authority. CAMP is
not a `RouteExecution` movement purpose.

### RETURN

**ACCEPTED:** a valid return must not be rejected solely by the dangerous
new-route supply guard; the source does not promise it is safe or guaranteed.
Preserve the bounded safe V1 behavior above, including return from the actual
site/direction without a historical route row. Do not generalize that exception
to dangerous routes.

**PROPOSED producer for a future dangerous-route return:** derive a
one-command authorization from server-retained accepted route history showing
this exact world, company, party, route epoch, actual departure site, and already
traversed edge sequence. It authorizes only a return over that traversed
sequence to its recorded origin (or an independently source-authorized safe
location); it cannot authorize an untraversed branch. Bind it to the locked
canonical revision, current tick, actual party/site, exact reversed edge IDs,
region/profile edition and current route epoch. Consume it only in the
transaction accepting that return. It expires after that command; movement,
route replacement, party/member/custody change, changed source route, or
edition/profile change invalidates it. A read-only route row without proof of
the actual prior traversal is insufficient. This producer does not tighten the
existing safe V1 behavior; any such future change requires a versioned decision.

**UNRESOLVED:** dangerous-route return eligibility after an interruption or
when the original route history is absent/expired. Until an accepted producer
resolves that case, reject that dangerous-route exception rather than infer it
from route presence. Safe V1 return remains governed by its existing checks.

### CAMP

**ACCEPTED:** this route guard cannot block a valid camp. Field camp is
stationary and requires a valid location, no encounter/conflict, and at least
one basic-work-capable participant; it provides current food and full company
pay without stored supplies or XP (lore v1.2, “Сохранённые решения лагерей”;
economy `WP02.3`, §F5). F1 is a distinct safe, local, explicitly accepted
service agreement, not a camp or route permission.

**PROPOSED producer:** the actual field-camp admission/economy owner may admit
a separate stationary `BeginFieldCamp`/maintenance action at the party’s actual
location after validating exact party, site/area, company, revision, tick and
source-backed location/access facts. It is valid only for that candidate
transition and is invalidated by any change to those facts or by an
encounter/conflict, loss of eligibility, changed location, or changed
agreement. It does not authorize movement or travel coverage; camp effects
begin only at the real stationary transition.

**UNRESOLVED:** the authored set of valid camp locations and the actual
field-camp admission/access producer are not provided by W01/W02. Keep the
stationary camp action unactivated until its real producer, location rule and
shared transaction consumer exist. A `CAMP` edge purpose or CAMP-with-edge
route intent is unsupported and must not become movement from an authority
token. Do not borrow F1 authorization or manufacture a camp receipt.

## 7. People, carriers, encounter and other domain owners

**ACCEPTED:** `Membership`, assignment/duty, availability, actual location,
field-party membership, condition, custody and ability are distinct
(lifecycle `WP02.2`, §§4.2–4.3; physical `WP02.4`, §§A/C/D). At departure and
each continuation boundary, every moved person must be an actual active member
of this party, at its exact source location, and have the catalogue-backed
`travel` capability. Presence or duty alone proves neither travel ability nor
consent. Preserve one actual location and source-bound arrival; no teleport.

**IMPLEMENTED:** current pure route preparation rejects a member without
`canPerform(member, 'travel')`; its `carrierFollow` describes the party and
character container movement candidates. Current safe adapter has no
carried/incapacitated-person producer.

**UNRESOLVED:** carrying or escorting an incapacitated, captive, missing, or
otherwise unable person requires an actual authorized carrier/custody/care
producer, capacity, location, and consent/acceptance evidence where required.
Movement of a party supply container is not proof that a person can be carried.
Until the physical producer exists, reject that route atomically. Do not infer
ability from presence, a duty tag, a roster entry or an empty encounter slot;
do not invent consent, free carriage, captivity resolution or a remote handoff.

Route execution cannot overlap an active encounter or silently interrupt
learning. Current trusted company travel execution rejects an active encounter
and active learning task. Preserve that fail-closed behavior. After the
I02a consumer checkpoint, W04 may compose actual food/fatigue/recovery,
learning interruption, camp and F1 effects through their owning producers.
Movement closes incompatible F1/maintenance coverage before its boundary
(economy `WP02.3`, §F5); it does not pay, stop a course, heal, or free a member
unless those owners return their real prepared effects. No company root may be
partially advanced.

At arrival, preserve the same physical company/party roster and current
containers. No automatic field-party join, encounter reservation, contract
acceptance, clue disclosure, custody transfer, proof pickup or claim follows
from presence. RT/JOIN/CT and W06 own those transitions. A route does not
provide extra encounter slots or a second writer for world state.

## 8. Atomicity, receipts and lock order

**IMPLEMENTED baseline:** one authenticated world travel request composes the
company aggregate candidate with world route metadata in the caller's
PostgreSQL transaction. The company executor owns the one company root
snapshot, company command/source receipts and movement-observation audit. The
world route repository owns the accepted route row, world-route receipt and
route audit event. The endpoint publishes success only after commit.

**PROPOSED W03 lock/order contract:**

1. Authenticate player commands and authorize their world/company binding.
   `ContinueRoute` always has the `SYSTEM` principal, whether issued by the
   worker or triggered by an authenticated UI request. The UI caller is audit
   metadata only. Neither path reveals private receipt existence before
   authorization; worker scans never become a cross-company enumeration
   response.
2. A worker may scan candidate `AT_BOUNDARY` rows read-only and unlocked. For
   every command transaction, use the same lock order: lock the persisted
   `acceptedByAccountId` account row first, then the company snapshot/root,
   then route-execution/segment, then receipts, clock and effects in the
   existing canonical order. Never lock a `SYSTEM` route row before the company
   snapshot. After locks, revalidate account ownership, world, company, party,
   route edition and epoch; if ownership is missing or changed, leave the route
   at `AT_BOUNDARY` and fail closed. The company-root write remains the sole
   canonical-root compare-and-swap.
3. Load the root once. Check the exact receipt by principal and command ID,
   then company command/source receipts, before fresh evaluation and
   freshness/epoch guards. `ContinueRoute` receipt lookup is always under
   `SYSTEM` plus its deterministic command ID, including UI-triggered runs.
   Exact replay returns the stored response; changed body with a reused ID
   conflicts without state change. The UI caller cannot supply or change the
   `SYSTEM` identity.
4. For a new command, check the public revision separately from internal
   canonical revision; derive clock, supply and scoped authorization from the
   locked root and trusted adapters; validate all mandatory effects.
5. Persist root once through the company executor; persist route/cursor,
   company and outer receipts, and their owning audit events in the same DB
   transaction. The world repository must not write a second company snapshot
   or invent a second root CAS. Commit before publishing response/events.

All writers for this single-company path follow that order. **PROPOSED for a
future W06/JOIN coordinator:** when a transaction needs a mutable shared-world
row and multiple companies, acquire the world authority first, then company
root rows in stable ascending company ID order, then encounter/route rows and
unique receipt writes. A transaction must never acquire the world lock after a
company lock. Parent must freeze this order against every world/JOIN writer
before a shared-world row or multi-company transaction is implemented; it is
not permission to add that shared resource in W03.

### Receipt ownership and invariants

- Outer world receipt: authenticated account for player commands; every
  `ContinueRoute` uses the bounded `SYSTEM` identity scoped to one
  `routeExecutionId`, regardless of worker, recovery or UI trigger. Store the
  exact canonical request digest, original response and command ID. A triggering
  account is audit metadata only. `acceptedByAccountId` remains immutable
  audit/owner binding, not a claimed live session.
- Company receipt: canonical command body, stable source/event identity,
  resulting internal/public revision and same accepted result. The server-minted
  travel `AdvanceCampaign` source is not client authority.
- Route state: one active route per company party; unique current epoch/segment;
  accepted edition, ordered itinerary and cursor. Route epoch/CAS guards do not
  replace company-root CAS.
- Audit: the company executor writes movement observations; world route owner
  writes `WorldTravelDeparted`, segment arrival/continuation, reroute and
  rejection only as permitted by current audit policy. One source event is not
  emitted twice by both owners.
- Rejection, stale preview, known shortage, missing carrier/camp/return fact,
  missing mandatory food effect, or transaction failure leaves root, route,
  cursor, stock, receipts and audit unchanged.
- Replay precedes freshness checks but never precedes authorization. An old
  exact receipt remains replayable after reroute; its old segment cannot move
  the current party. A changed body under the same ID is not a replay.

## 9. Serialization, V1 compatibility and migration

**ACCEPTED:** do not rewrite released V1 replay history, existing receipts,
accepted route profiles, or persisted in-flight route facts. A route's edition
and parameters must remain available for the duration of its accepted segment.

**PROPOSED:** keep reading current V1 accepted-route JSON as its exact legacy
one-edge format, including an in-flight safe-alpha edge, original epoch,
segment ID, `startedAt`, stored due tick, route profile and region version. Do
not synthesize a multi-edge cursor or recompute its due tick. Continue it with
the V1 handler until its stored arrival settles. V2 execution records carry an
explicit `schemaVersion` and cursor. Unknown versions, profiles, regions or
partial shapes fail closed without rewriting the row; provide a forward
compatibility decision before activation.

No SQL migration is required by this contract if V2 cursor/plan data stays in
the existing versioned accepted-route JSON and current constraints continue to
apply. This is a proposal, not a code finding. If an implementation needs
normalized cursor columns, new indexes/constraints, or a changed durable
receipt shape, parent must assign a new ordered migration after a fresh live
migration-ledger check. Never edit a released migration or assume that
`0008_world_travel` is available/released based on this document.

The public `schemaVersion: 1` safe-trip DTO and exact stored V1 response remain
stable. A transport-semantic change requires an explicit protocol compatibility
decision; do not make an old client route appear to have a new path or silently
change its response shape.

## 10. Minimum source-grounded invariant scenarios

These are acceptance scenarios, not passed evidence or a test-count target.
Retain existing safe-edge regressions and add only the smallest cases needed
for new observable invariants:

1. A connected multi-edge path follows its exact edition and order; a
   disconnected, ambiguous, stale-edition or wrong-origin path rejects without
   partial movement.
2. Each segment has a unique trusted ID and stored due tick; early arrival,
   wrong cursor/epoch or old segment after reroute cannot move the party. A
   delayed exact arrival settles only to its stored due tick.
3. JSON reload during transit resumes the same V1 segment or V2 cursor/segment;
   it never rerolls the path, due tick, supply assumption or route edition.
4. Exact retry returns the historical response before freshness checks;
   conflicting body, foreign company/account or concurrent same-root writer
   cannot duplicate an edge, food fulfillment, receipt or audit event.
5. Preview/free intent leaves position, time, supply, route epoch and receipts
   unchanged. Confirmed route is rechecked against live location, capability,
   revision and edition; stale confirmation rejects atomically.
6. A known shortage on a new dangerous route rejects unchanged. Safe routes do
   not require that dangerous-route assessment. Safe V1 RETURN continues to
   pass its existing actual-site/direction, epoch and revision checks without
   requiring route history; dangerous-route RETURN bypasses only with the
   proposed source-bound traversed-history authorization. CAMP is not a
   movement purpose; stationary camp admission remains inactive until its
   producer and location policy exist. Offline continuation from an accepted
   A→B→C itinerary records the B boundary and uses the same deterministic,
   receipt-checked `ContinueRoute` command as an online request; missing
   mandatory effects leave it at B without implicit movement.
7. Supply assessment cannot be client-forged and sees only this company's
   eligible exact-location containers, owned items and real demand/carry. A
   foreign owner, distant container, different party carrier, or missing food
   effect cannot be counted or debited twice.
8. Incapacitated/carried/captive member travel is rejected until its actual
   physical producer proves ability/custody/authorization. Party and container
   movement preserve existing identities and ownership; no teleport or
   invented consent.
9. Active encounter, active learning, invalid care/F1 boundary, or incomplete
   root effect cannot be silently interrupted or advanced as success. Arrival
   never creates contract/JOIN/camp/F1 state.
10. Paired companies with different hidden populations or supplies but equal
    authorized observations have identical public preview/rejection/revision
    behavior until lawful disclosure.

Real PostgreSQL rollback/race, browser traversal, process restart, privacy
sequences and human comprehension are distinct evidence lanes; a pure scenario
or passing unit suite does not prove them.

## 11. Dependencies, next write sets and stop conditions

### Required order

1. **Source/contract checkpoint:** parent/Sol closes the exact-hash critique
   for this document. Preserve the explicit phase/cursor/continuation semantics
   and the safe V1 return boundary; keep unresolved policy source-labelled.
2. **Pure route continuation:** after review and parent path ownership,
   one writer owns `packages/game-core/src/world/route.ts`,
   `packages/game-core/src/world/travel.ts`, and the focused public
   `packages/testkit/src/world-route.spec.test.ts`. Freeze the route/cursor,
   segment and continuation interfaces before server work. This core-only
   state/cursor packet may proceed without dangerous supply, CAMP or
   carried-person producers: keep those branches fail-closed and unactivated.
   Keep core pure, deterministic and I/O-free.
3. **Trusted supply / physical effects:** a separately frozen W04-compatible
   producer reuses finance accrual and physical food/custody owners. Its exact
   paths must be assigned by the parent after checking current c06 H and UI
   writers. It cannot add an alternate food formula, wallet, or movement
   owner. Until this producer exists and the unresolved horizon/profile
   decisions are sourced, no dangerous route can pass. Dangerous-route
   RETURN-specific history authorization is also inactive until its producer
   is implemented.
4. **Durable world adapter:** after the pure interface is frozen, one serial
   writer owns the necessary protocol/world route adapter and repository
   composition (currently `packages/protocol/src/world.ts`,
   `apps/server/src/world/routes.ts`, `apps/server/src/world/repository.ts`,
   plus only parent-assigned executor/food/database paths). The current c06
   files are already dirty and owned; this contract does not reassign or edit
   them. Preserve the existing snapshot/receipt transaction. Add a migration
   only after a real schema need and parent ownership ACK.
5. **W04 integration:** only after W03 and operational I02a are accepted may
   the actual food/fatigue/recovery/learning-interruption/camp/F1 effects
   compose. Full I02, F01, D02 and all named M1 evidence remain their own
   later acceptance gates.

### Stop conditions

- Missing route edition/profile/due tick, real party location, capability,
  current route epoch or complete company graph: reject unchanged.
- Missing/ambiguous `RouteSupplyAssessment`, unsupported horizon/profile,
  known shortage on a new dangerous route: reject unchanged.
- No source-bound prior traversal for a dangerous-route RETURN, no CAMP
  stationary admission/location producer, no carried/incapacitated-person
  producer, or unknown interruption outcome: keep that branch unsupported.
  Preserve the safe V1 RETURN compatibility boundary. Report the missing
  producer/decision to the parent; do not mint a successful placeholder.
- Active encounter, learning or cross-company JOIN without its real owner and
  transaction coordinator: do not move or partially advance the root.
- Shared file/resource ownership conflict, active dirty writer, or changed
  frozen interface: stop only the affected write set and return for parent
  reconciliation.

## 12. Acceptance and handoff

Acceptance of this contract requires an independent Sol critique of this exact
file SHA-256 and resolution of any blocking finding. Contract approval is not
implementation, source-ZIP recovery, owner playtest or M1 acceptance.

Every later implementation report must give: absolute checkout/branch/base and
HEAD/tree; exact changed paths and dirty-diff identity; frozen API hashes;
commands/outcomes/logs actually run; Sol's exact reviewed hash and verdict;
source→invariant→result mapping; migrations/compatibility; evidence gaps; one
next dependency. Record candidate process lessons for parent review; do not
silently change canonical source or persistent memory.

# K01 finite world knowledge — 2026-09-29

This pure contract owns validated observation data for the current authored region:
explored terrain, live entities, source-dated last-seen reports, rumours and map
provenance. It does not produce observations, authenticate observers or expose a
private world snapshot. K02/W06 must supply lawful evidence through real authority.

Sources: full Notes/Purpose of WORLD `recTrujX2wy7V49qk`, LORE
`recQNKqYfwoJpCXVu`, accepted amendments `rechIKj0hsvfXIvFU`, and K01 in the M1
index `recZhUoTiwT7kIc8s`, Airtable base `apph3bj1NyVrfJeLM`. Historical last-seen
and rumour data retain source/time/area/confidence/expiry and do not become exact
current NPC coordinates. No decay duration or confidence scale is invented.

`readWorldKnowledge(unknown)` rejects unrecognized fields, malformed times and
foreign region references, detaches adapter values and freezes the retained data.
`projectWorldKnowledge(evidence, tick)` returns current observations only at their
observed tick, filters historical evidence at its source-provided exclusive
expiry, rejects future knowledge and orders records independently of host locale.
Map provenance validates authored areas without requiring prior exploration.
This is the first unreleased knowledge schema; no migration or released replay
format changes. Company knowledge remains owned by its existing component.

Author build, game-core/testkit typechecks, scoped lint/format and three public
specifications passed. Parent separately executed all three specifications;
Sol independently reviewed the frozen source and corrections without a finding.
The tests cover strict root/nested-field rejection, ownership of retained values
and temporal boundaries. They do not prove hidden-world producer noninterference;
that requires K02/W06. Full exact-tree verify/stress/migration evidence belongs
to the delivery PR/CI. This module alone does not make the alpha playable.

Focused reproduction after workspace install:

```sh
pnpm --filter @warwrit/game-core build
pnpm exec vitest run packages/testkit/src/world-knowledge.spec.test.ts
```

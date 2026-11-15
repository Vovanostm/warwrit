# Company domain and persistence

## Status and next action — 2026-11-08

The dependency map below was moved from the September roadmap. It describes
responsibilities, not current completion or writer assignments. Consult the
[active work packages](../../work-packages/WP-02.3.md) and
[readiness contracts](../M1_EXECUTION_READINESS.md) for the requested slice;
verify actual producer/consumer interfaces before treating a dependency as ready.
Do not reopen already accepted rules from historical snapshots.

## Dependencies and completion boundary

```text
C05-FIN -> C05-TIME -> C05-COMPOSE -> C06 -> C07 -> C08 -> D01 -> D02
E04-ACCEPT -> E05 -> F01
G07 -> G08 -> G09
G09 + C08 + E05 -> G10
required domain + G10 -> H durable company/executor -> I01 -> I02
```

C08 activates real learning only after the full finance/time/composition and interruption/casualty path. G10 activates combat binding, receipt consumption and finalization only when all required physical, life, practice and social/learning effects join one atomic candidate and cursor. H owns the complete versioned PostgreSQL root, authenticated executor, audit/receipts and real parallel-connection/process-crash proof. I owns actual durable command journeys and complete required handler coverage; I02 also needs D02 and F01, while F02/B04 are merged. Implement H responsibilities against real predecessor APIs; the indexed H01–H08 are coverage, not a forced numeric serial chain.

Done means the requested domain/persistence contract is implemented and checked
at its public boundary, with actual delivery state recorded in that contract.
Full integrated M1 acceptance belongs to [acceptance](m1-acceptance.md), not a
prepared domain result. Return through [ROADMAP](../ROADMAP.md).

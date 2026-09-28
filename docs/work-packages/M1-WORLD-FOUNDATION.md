# M1 world foundation (W01/W02)

Status: implementation slice, authored fixture and provisional timing parameters.
The source ZIP concordance remains `NOT_RUN` (`RC-GAP-MACHINE-01`). This document
does not claim that coordinates, terrain, connections, travel ticks, or timing
were recovered from the missing archive.

## W01 — finite world fixture

The initial authored region is **Серое Поречье**: Каменный Брод, Березняк,
Тихая Гать, Северный Двор, and the dangerous Старая мельница. Each site and
atomic area has a stable ID; sites have immutable axial coordinates, and the
finite edge graph is connected. Travel ticks, labels and coordinates are
versioned provisional implementation data. Existing `FieldParty.location` and
`CharacterPresence.location` remain the position owners. Routes, movement
commands, admission, supplies, fatigue and gameplay effects are out of scope.

## W02 — explicit clocks

Campaign time starts at 1,000 ticks per 21,600,000 ms (six hours). Durable
timestamps and ticks use decimal integer strings. Prospective rate changes append
exact rational ticks-per-millisecond segments after an explicit observed-through
timestamp supplied by the caller. Campaign
ticks are derived by summing exact segment accrual from the epoch and flooring
only the requested absolute tick, preserving fractional accrual through rate
changes and JSON reloads. Elapsed ticks are endpoint differences. The light
cycle is separate: 600,000 ms day followed by 300,000 ms night. All timestamps
are explicit inputs; the core reads no wall clock and performs no I/O.

Malformed, negative, unsafe, nonpositive, nonprospective, or conflicting rate
segments are rejected. These clocks do not implement scheduling or world
effects.

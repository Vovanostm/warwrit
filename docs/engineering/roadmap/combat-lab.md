# Diagnostic battle and editor

## Status — 2026-11-14

The owner correction sets six fighters per player party and up to three conflict
sides of twelve, thirty-six figures total. The
[engine contract](../../work-packages/M1-CAMPAIGN-BATTLE.md) and Spec Kit
T004–T010 define the new side-aware core, transport and normal editor/view path.
The current two-side stand remains earlier implementation evidence. Multi-side
implementation/gameplay and maximum-composition acceptance are NOT_RUN.

## Earlier stand record — 2026-11-08

Local playable work is recorded in the
[battlefield specification](../../wiki/battlefield-test-maps.md), especially the
[2026-10-13 implementation record](../../wiki/battlefield-test-maps.md#локальные-приёмы).
It covers skills, tactical AI, autoplay, editor persistence and scoped visual
results; full acceptance and campaign integration remain distinct. This migration
runs no gameplay checks and does not declare the outstanding work delivered.

## Next action and done criterion

Use the current battlefield specification and actual checkout to select the
owner-requested playable correction. Record its controls, feedback, saved result,
checks and remaining limits there. The roadmap stays unchecked until that
specification's remaining completion criteria have demonstrated results.
Optional September lab tasks below are not prerequisites for persistent M1.

## Earlier diagnostic boundary

PB01–PB04 are merged, providing the protocol/scenario, loopback server/session/actions and protocol-only view. PB06 joins server and view in a browser controller; its in-app browser journey exercised create, move, rejection, defend, reload, retreat and deletion through the local API. It is useful early proof of command/UI wiring but remains disposable server-memory gameplay, not M1 persistence, fog, timers or world join. PB06 is a source dependency for UI01.

PB05 AI stepping, PB07 replay import/export, PB08 launcher/reset controls and PB09 browser/Mac lab evidence are **optional** for the full-M1 alpha and unassigned here. Select them only when they improve diagnostic evidence. The final persistent alpha has its own RT/H/QA replay and browser obligations. Do not advertise a lab launcher until one exists or wait for optional PB follow-ups to start full-M1 lanes.

[Persistent M1](m1-alpha.md) · [ROADMAP](../ROADMAP.md)

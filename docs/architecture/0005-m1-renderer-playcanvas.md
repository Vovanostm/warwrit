# ADR-0005: Use PlayCanvas for the private M1 renderer

- Status: Accepted for the current Mac/Chrome M1 target
- Date: 2026-09-29
- Supersedes: renderer-provisional portion of ADR-0003 only
- Sources: canonical M1 ART04, Q-T03, owner full-M1 assignment

## Decision

Use PlayCanvas 2.22.4 for the M1 renderer adapter. Keep canonical simulation and
state outside the engine. The production adapter remains ART06; this decision
closes the measured engine comparison, not its implementation or full M1.
Babylon 9.28.0 remains an experiment reference, not a second production renderer.

The parent accepts this bounded choice after independent Sol source/visual/decision
review and the actual same-scene Mac comparison. [Retained evidence](../engineering/evidence/renderer-scene-3/README.md)
includes both raw captures, independent recomputation, six images, source/build
identity, resource timings and scoped memory observations. The measured source is
HEAD73af241 plus tracked diff592e2d5515d781d8bb278531875dd02ec7ad362321a10f54d5947be93ce8bb0f;
the build manifest identifies every served file. Evidence documents the measured
snapshot; later documentation commits do not retroactively change its identity.

## Comparison and reason

Both engines render the same licensed KayKit 18-actor scene, equipment, four clips,
board, camera, selection, three independent fog cells, day/night/torch and hit cue.
Scene3 repairs unreadable night/torch and aligns the torch position and metadata.
Parent and Sol inspected six source-built images; both meet the representative
readability target. Exposure/markers differ and animation phase is not locked;
this is visual acceptance, not pixel equality or final production art.

Current device: Mac15,6 / M3 Pro / 36 GB / macOS26.3.1(a), Chrome154.0.8037.58,
WebGL2/ANGLE Metal, fixed1600x900buffer and889x500CSS viewport. Each final capture
used30s warmup and120s recording. Parent independently recomputed raw1s bins and
CPU/GPU percentiles. Both exceed the30FPS target in this observed workload.

| Observation                       |     Babylon |  PlayCanvas |
| --------------------------------- | ----------: | ----------: |
| Minimum complete1s FPS            |         120 |         119 |
| CPU-submit p50/p95 ms             |   3.30/4.30 |   0.80/2.70 |
| GPU p50/p95 ms                    | 1.705/1.859 | 2.072/2.352 |
| Cold transferred JavaScript bytes |     1700493 |      578980 |
| Cold observed scene-ready ms      |       820.4 |       203.8 |
| Warm observed scene-ready ms      |       837.3 |       231.8 |
| Post-GC V8 used heap bytes        |    62805340 |    14840668 |

Choose PlayCanvas for the lower observed CPU submission, JavaScript transfer,
startup and V8 heap cost while both satisfy this visual/FPS gate. Babylon's lower
GPU time in this pair is a real tradeoff. CPU submission is not GPU execution;
approximately120FPS is display-limited. Startup/heap observations are single scoped
loopback measurements, not latency guarantees or browser/GPU total memory.

The same bounded flag edit took35/30seconds and its first correction26/21seconds
in Babylon/PlayCanvas. Both needed subsequent shared lighting correction. These
narrow intervals exclude parent review and do not establish a general authoring
advantage. Both workflows use local typed code, assets and Git without a paid
editor or remote project dependency; reviewability and lock-in are comparable.
The choice therefore uses the accepted operability comparison, not an invented
claim that one engine makes agents generally faster.

## Boundaries and follow-up

- ART05 must compare actual equipped miniature, eight-direction animated sprite
  and normal-plus-depth billboard variants for visual quality, FPS and authoring
  cost, then choose a primary and fallback. Engine selection does not waive it.
- ART06 installs the selected renderer at the web adapter boundary, using lawful
  projections with picking, resizing, cleanup, lighting and fallback.
- Iris Xe-class1080p, Safari, browser-process RSS and GPU VRAM remain unmeasured.
  The owner target is this Mac/Chrome; no compatibility/performance claim for those
  other profiles follows. Current1600x900buffer is below1080p.
- Ordinary background load was not fixed. One corrected pair is not a statistical
  distribution. Older six scene1 runs are historical and are not averaged with it.
- Revisit if the integrated M1 workload fails its actual device/quality budget or
  ART05 exposes a measured pipeline blocker. Do not add a generic dual-engine
  framework or change the domain/runtime architecture in anticipation.

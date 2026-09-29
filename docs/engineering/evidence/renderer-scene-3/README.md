# Renderer scene 3 evidence

> 2026-09-29 correction: later ART05 review found that this measured PlayCanvas
> adapter never enabled component animation. These files retain actual historical
> observations, but they do not prove equivalent animated workloads. ART04 animated
> acceptance is reopened; see the dated [ADR0005 correction](../../../architecture/0005-m1-renderer-playcanvas.md).
> Corrected matched captures have not yet been run.

Recorded 2026-09-29. Scope: the corrected representative comparison on the owner's
Mac, not full-alpha gameplay, production capacity or cross-device performance.
Raw captures are losslessly compressed; inventory.json binds the retained artifacts.

To repeat the independent calculation without modifying this directory:

```sh
scratch=$(mktemp -d)
gzip -dc babylon.json.gz > "$scratch/babylon.json"
gzip -dc playcanvas.json.gz > "$scratch/playcanvas.json"
cp recompute.py "$scratch/recompute.py"
python3 "$scratch/recompute.py"
```

Run these commands from this directory. The script recomputes every complete
one-second bin and percentile from timestamped observations rather than calling
the application's metrics code. Compare its output with recomputed.json.

## Observations

The earlier scene-2 night/torch failure is historical. Luna corrected source and Sol
reviewed the scoped correction. Parent viewed six scene3-{engine}-{light}.png
images from the actual authoring build: actors/equipment/team/flag readable,
night distinctly darker and torch locally warm in both candidates. Selection
readout confirms blue-knight-1. Animation phase was not locked; these are not
pixel-parity images. Babylon day selection highlight had not settled at capture;
night/torch show it. Fog-of-war cells remain independent of environmental fog.
Both real UI metadata exports now identify renderer-scene-3.

Measured source: HEAD73af2415469524d3637734ccf4faeb5c6a080c1e,
tracked diff592e2d5515d781d8bb278531875dd02ec7ad362321a10f54d5947be93ce8bb0f.
The build-manifest.json inventories146 files/47,186,247bytes and hashes.
Current actual CDP browser is Chrome154.0.8037.58; earlier Chrome153 captures are
historical. Mac15,6/AppleM3Pro/36GB/macOS26.3.1(a), build25D771280a, WebGL2/ANGLE
Metal. AC power, no reported thermal warning. Same889x500CSS/1600x900buffer/DPR2.
Each fresh production navigation used30s warmup then120s UI capture, foreground
at export. Independent recompute.py checks raw timestamps/bins/percentiles,
unique frame indices, matching viewports/scene/buffer and empty errors.

| Candidate        | Minimum1sFPS | CPU-submit p50/p95 ms | GPU p50/p95 ms | Frames |
| ---------------- | -----------: | --------------------: | -------------: | -----: |
| Babylon9.28.0    |          120 |             3.30/4.30 |    1.705/1.859 |  14401 |
| PlayCanvas2.22.4 |          119 |             0.80/2.70 |    2.072/2.352 |  14400 |

Both meet the30FPS target in this workload on this Mac. All GPU queries returned
valid samples, zero disjoint discards; application errors empty. This pair checks
the corrected source after the older six alternating runs. It is not a statistical
cross-device claim. CPU-submit excludes asynchronous GPU work; FPS is display-limited.

Single cache-disabled loopback startup observations in startup.json:
Babylon820.4ms, PlayCanvas203.8ms to automation observing scene-ready; polling
latency is included. Actual transferred JS1700493/578980bytes including request
headers; encoded JS bodies1699293/578380bytes. Resource entries retained, including
Babylon repeated asset requests; exported assetsBytes is not total network traffic.
Warm navigation and post-GC V8 heap are separately retained in warm-heap.json.
Raw capture heap values were not GC-normalized and should not be compared as total
memory. No browser process RSS, GPU VRAM, low-end hardware or server capacity claim.

The narrow timed flag edit was35s/30s and its first correction26s/21s in
Babylon/PlayCanvas respectively, excluding parent review. Both required later
shared lighting calibration. This does not establish a general authoring-time
advantage. Both use local source/typed APIs and Git without editor service lock-in.
[ADR-0005](../../../architecture/0005-m1-renderer-playcanvas.md) records the selected engine after independent Sol review; ART05 actual art variants remain required.

Post-GC V8 used heap: Babylon62,805,340bytes; PlayCanvas14,840,668bytes.
Warm observed readiness:837.3ms/231.8ms. Both are single observations, not total
browser/GPU memory or a statistical timing estimate.

The measured source predates the evidence/docs commit. build-manifest.json records
that exact HEAD and tracked-diff hash; documentation changes do not relabel the
measured build. The older scene-1/scene-2 evidence remains in the parent's local
renderer worktree and is not combined numerically with this scene-3 pair.

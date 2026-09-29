"""Recompute exported frame evidence without the application metrics code."""
import hashlib
import json
import math
from pathlib import Path


def percentile(values, fraction):
    values = sorted(values)
    return values[math.floor((len(values) - 1) * fraction)] if values else None


root = Path(__file__).parent
rows = []
for candidate in ("babylon", "playcanvas"):
    path = root / f"{candidate}.json"
    exported = json.loads(path.read_text())
    metadata, summary = exported["metadata"], exported["summary"]
    start = metadata["captureStartMonotonicMs"]
    end = metadata["captureEndMonotonicMs"]
    complete_seconds = math.floor((end - start) / 1000)
    frames = metadata["frameSamples"]
    assert len({frame["frameIndex"] for frame in frames}) == len(frames)
    bins = [0] * complete_seconds
    for frame in frames:
        assert start <= frame["timestampMs"] <= end
        index = math.floor((frame["timestampMs"] - start) / 1000)
        if index < complete_seconds:
            bins[index] += 1
    assert bins == summary["rollingFps1s"]
    assert len(bins) == summary["completeSecondCount"] == 120
    assert min(bins) == summary["lowFps1s"]
    samples = {
        "rafIntervalMs": [frame["intervalMs"] for frame in frames if frame["intervalMs"] is not None],
        "cpuSubmitMs": [frame["durationMs"] for frame in metadata["cpuSubmitSamples"]],
        "gpuMs": [frame["durationMs"] for frame in metadata["gpuSamples"]],
    }
    for key, values in samples.items():
        for label, fraction in (("p50", 0.5), ("p95", 0.95)):
            assert percentile(values, fraction) == summary[key][label]
    assert metadata["scenarioVersion"] == "renderer-scene-3"
    assert metadata["drawingBuffer"] == [1600, 900]
    assert metadata["errors"] == []
    rows.append({
        "candidate": candidate,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "frames": len(frames),
        "viewportCss": metadata["viewportCss"],
        "minimum1sFps": min(bins),
        "cpuSubmitMs": summary["cpuSubmitMs"],
        "gpuMs": summary["gpuMs"],
        "elapsedMs": end - start,
    })
assert rows[0]["viewportCss"] == rows[1]["viewportCss"]
(root / "recomputed.json").write_text(json.dumps(rows, indent=2) + "\n")
print(json.dumps(rows, indent=2))

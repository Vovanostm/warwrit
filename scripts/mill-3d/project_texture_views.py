"""Use AssetFurnace v0.5.1 visibility/rasterization; preserve unseen paint."""

import argparse
import io
import json
import time
from pathlib import Path

import numpy as np
from image_to_3dlab import photo_paint as pp
from PIL import Image

parser = argparse.ArgumentParser(
    description="Project registered texture views onto repacked mill atlases."
)
parser.add_argument("source", type=Path, help="Original whole-scene GLB for occlusion")
parser.add_argument("views", type=Path, help="views.json beside the painted PNG inputs")
parser.add_argument(
    "destination", type=Path, help="Directory from repack_battlefield.py prepare"
)
parser.add_argument(
    "--parts",
    nargs="+",
    choices=["mill", "yard", "underside"],
    default=["mill", "yard", "underside"],
)
parser.add_argument(
    "--check-only",
    action="store_true",
    help="Validate source and registered image inputs without writing",
)
parser.add_argument(
    "--view-size",
    type=int,
    choices=[256, 512, 1024],
    help="Downsample registered images for a cheap projection probe; omit for final quality",
)
args = parser.parse_args()
root = args.destination
frames = json.loads(args.views.read_text())
views = []
names = [frame["name"] for frame in frames]
if not names or len(set(names)) != len(names):
    parser.error("View names must be nonempty and unique")
for f in frames:
    matrix = np.asarray(f["matrix"], dtype=float)
    if (
        matrix.shape != (16,)
        or not np.isfinite(matrix).all()
        or not 0 < f["fov"] < np.pi
    ):
        parser.error(
            "Each camera requires 16 finite column-major entries and a FOV in radians"
        )
    matrix = matrix.reshape(4, 4).T
    if (
        not np.allclose(matrix[3], [0, 0, 0, 1])
        or not np.allclose(matrix[:3, :3].T @ matrix[:3, :3], np.eye(3), atol=1e-5)
        or np.linalg.det(matrix[:3, :3]) < 0
    ):
        parser.error("Camera must be a rigid right-handed world transform")
    if "bounds" in f:
        bounds = np.asarray(f["bounds"], dtype=float)
        if (
            bounds.shape != (2, 3)
            or not np.isfinite(bounds).all()
            or not (bounds[0] < bounds[1]).all()
        ):
            parser.error(
                "Repair bounds must have finite ordered minimum and maximum XYZ"
            )
    picture = Image.open(args.views.parent / f["image"]).convert("RGBA")
    if picture.width != picture.height:
        parser.error("Camera captures and paint must stay square")
    if args.view_size and picture.width > args.view_size:
        picture = picture.resize(
            (args.view_size, args.view_size), Image.Resampling.LANCZOS
        )
    image = np.array(picture)
    views.append(
        (pp.View(image, np.array(f["matrix"]).reshape(4, 4).T, f["fov"], f["name"]), f)
    )
scene_p, _, scene_f, _ = pp.read_glb(args.source)
if args.check_only:
    print(
        f"Input validation PASS: {len(views)} views, {len(scene_f)} source triangles; no files written"
    )
    raise SystemExit(0)
# The generated material is double-sided: the viewer also displays back faces.
# Full-scene depth still rejects occluded faces, including thin opposite surfaces.
outward = 0.0
settings = pp.Settings(
    align=False,
    match_colour=False,
    depth_tolerance=0.001,
    inner_edge=3 / 1254,
    edge_px=4,
    gutter_px=8,
)
repair_settings = pp.Settings(
    align=False,
    match_colour=False,
    depth_tolerance=0.001,
    inner_edge=0,
    # AssetFurnace's erode(mask, 1) is the binary mask; zero returns all zeros.
    edge_px=1,
    cutout_edge=0,
    facing_low=0,
    facing_high=0.01,
)
report_path = root / "texture-report.json"
previous = json.loads(report_path.read_text()) if report_path.exists() else []
reports = {item["part"]: item for item in previous}
parts = list(dict.fromkeys(args.parts))
pending_path = root / "projection-pending.json"
if pending_path.exists():
    pending_parts = json.loads(pending_path.read_text())
    if not set(pending_parts).issubset(parts):
        parser.error(
            "Finish the interrupted projection first: --parts "
            + " ".join(pending_parts)
        )
for name in parts:
    if not (root / (name + "-base.glb")).is_file():
        parser.error(f"Missing prepared atlas: {name}-base.glb; run prepare first")
# Keep this marker after failure so pack cannot accept a mixture of revisions.
pending_path.write_text(json.dumps(parts) + "\n")
for name in parts:
    started = time.monotonic()
    source = root / (name + "-base.glb")
    p, u, f, t = pp.read_glb(source)
    height, width = t.shape[:2]
    print("Projecting", name, len(f), flush=True)
    face, bary = pp.rasterize(
        (u * np.array([width, height]))[f], np.zeros((len(f), 3)), (height, width)
    )
    covered = face >= 0
    corners = f[face[covered]]
    b = bary[covered]
    points = (b[:, :, None] * p[corners]).sum(axis=1)
    normals = pp.vertex_normals(p, f)
    n = (b[:, :, None] * normals[corners]).sum(axis=1)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    best = np.zeros(len(points))
    blend = np.zeros(len(points))
    color = np.zeros((len(points), 3))
    for view, frame in views:
        if "bounds" in frame:
            # Keep full-scene occlusion, but do not erode visible wall edges.
            # Ordinary edge fades retained old water paint along these seams.
            low, high = np.array(frame["bounds"])
            distance_to_border = np.minimum(points - low, high - points).min(axis=1)
            mask = np.clip(distance_to_border / 0.2, 0, 1)
            visible, rgb = pp.view_weights(
                points, n, view, scene_p, scene_f, repair_settings, outward=outward
            )
            weight = mask * visible
            score = weight
        else:
            weight, rgb = pp.view_weights(
                points, n, view, scene_p, scene_f, settings, outward=outward
            )
            # Prefer the best-resolved visible view over averaging painted joints.
            distance = np.linalg.norm(points - view.position, axis=1)
            score = weight**2 / np.maximum(distance**2, 1e-6)

        # Ordered manual patches own overlapping texels, including equal scores.
        # Zero-weight samples must never erase a previously selected view.
        better = (score > 0) & (score >= best) if "bounds" in frame else score > best
        best[better] = score[better]
        blend[better] = weight[better]
        color[better] = rgb[better]
    result = t.copy()
    result[covered, :3] = np.clip(
        t[covered, :3] * (1 - blend[:, None]) + color * blend[:, None], 0, 255
    ).astype("uint8")
    wm = np.zeros((height, width))
    wm[covered] = blend
    result, _ = pp._grow_into_gutter(result, wm, covered, 8)
    buffer = io.BytesIO()
    Image.fromarray(result).save(buffer, format="PNG")
    (root / (name + "-painted.glb")).write_bytes(
        pp.replace_base_colour(source.read_bytes(), buffer.getvalue())
    )
    # Texture density is measured on new UVs, not inferred from nominal resolution.
    tr = p[f]
    area = (
        np.linalg.norm(np.cross(tr[:, 1] - tr[:, 0], tr[:, 2] - tr[:, 0]), axis=1) * 0.5
    )
    uv = u[f]
    ua = (
        np.abs(
            (uv[:, 1, 0] - uv[:, 0, 0]) * (uv[:, 2, 1] - uv[:, 0, 1])
            - (uv[:, 2, 0] - uv[:, 0, 0]) * (uv[:, 1, 1] - uv[:, 0, 1])
        )
        * 0.5
    )
    density = np.sqrt(ua * width * height / np.maximum(area, 1e-10))
    reports[name] = {
        "part": name,
        "triangles": len(f),
        "size": width,
        "uv_coverage": float(ua.sum()),
        "median_px_m": float(np.median(density)),
        "painted_share": float((blend > 0.5).mean()),
        "projection_seconds": round(time.monotonic() - started, 2),
        "view_sizes": sorted({view.image.shape[0] for view, _ in views}),
    }
    print(reports[name], flush=True)
    del face, bary, corners, b, points, n, normals, color, result, wm, t
report_path.write_text(
    json.dumps(
        [reports[name] for name in ["mill", "yard", "underside"] if name in reports],
        indent=2,
    )
    + "\n"
)
pending_path.unlink()

"""Blender: capture registered clay/albedo views of an opaque environment GLB.

blender -b --python-exit-code 1 -P capture_views.py -- source.glb output-dir
Optional --views reuses glTF column-major camera matrices and square-image FOV.
The input asset is never saved or replaced. Use a fresh output directory.
"""

import argparse
import html
import json
import math
import re
import sys
import time
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--views", type=Path)
    parser.add_argument(
        "--size", type=int, choices=[256, 512, 1024, 2048], default=1024
    )
    parser.add_argument(
        "--modes", nargs="+", choices=["clay", "color"], default=["clay", "color"]
    )
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    started = time.monotonic()
    if args.output.exists() and any(args.output.iterdir()):
        parser.error("Use an empty output directory to preserve earlier captures")
    if not args.source.is_file() or args.source.suffix.lower() != ".glb":
        parser.error("source must be an existing GLB")
    frames = json.loads(args.views.read_text()) if args.views else None
    if frames is not None:
        frames = [f for f in frames if "bounds" not in f]
        names = [f["name"] for f in frames]
        if not names or len(set(names)) != len(names):
            parser.error("Camera names must be nonempty and unique")
        for f in frames:
            if not re.fullmatch(r"[a-z0-9-]+", f["name"]):
                parser.error(
                    "Camera names must contain lowercase letters, digits or hyphens"
                )
            if len(f["matrix"]) != 16 or not all(math.isfinite(x) for x in f["matrix"]):
                parser.error("Camera matrices must have 16 finite column-major entries")
            if not 0 < f["fov"] < math.pi:
                parser.error("FOV must be in radians between zero and pi")
            transform = Matrix(
                [f["matrix"][i : i + 4] for i in range(0, 16, 4)]
            ).transposed()
            rotation = transform.to_3x3()
            identity = rotation.transposed() @ rotation
            if (
                max(abs(transform[3][i] - (1 if i == 3 else 0)) for i in range(4))
                > 1e-5
                or rotation.determinant() < 0
                or max(
                    abs(identity[r][c] - (1 if r == c else 0))
                    for r in range(3)
                    for c in range(3)
                )
                > 1e-5
            ):
                parser.error("Camera must be a rigid right-handed world transform")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == "MESH"]
    points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    if not points or not all(math.isfinite(c) for p in points for c in p):
        raise ValueError("Expected finite mesh vertices")
    low = Vector([min(p[i] for p in points) for i in range(3)])
    high = Vector([max(p[i] for p in points) for i in range(3)])
    center, diagonal = (low + high) / 2, (high - low).length
    if diagonal <= 0:
        raise ValueError("Model has no spatial extent")
    g_to_b = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    cam = bpy.data.objects.new(
        "InspectionCamera", bpy.data.cameras.new("InspectionCamera")
    )
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.sensor_fit = "HORIZONTAL"
    cam.data.clip_start, cam.data.clip_end = diagonal / 10000, diagonal * 20
    if frames is None:
        frames = []
        for name, azimuth, elevation in [
            ("front", 0, 35),
            ("back", 180, 35),
            ("left", -90, 35),
            ("right", 90, 35),
            ("low", 0, 10),
            ("top", 0, 80),
            ("underside", 180, -55),
        ]:
            yaw, pitch, fov = math.radians(azimuth), math.radians(elevation), 0.8
            radius = diagonal * 0.55 / math.sin(fov / 2)
            cam.location = center + radius * Vector(
                (
                    math.sin(yaw) * math.cos(pitch),
                    -math.cos(yaw) * math.cos(pitch),
                    math.sin(pitch),
                )
            )
            cam.rotation_euler = (
                (center - cam.location).to_track_quat("-Z", "Y").to_euler()
            )
            bpy.context.view_layer.update()
            matrix = g_to_b.inverted() @ cam.matrix_world
            frames.append(
                {
                    "name": name,
                    "matrix": [matrix[r][c] for c in range(4) for r in range(4)],
                    "fov": fov,
                }
            )
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    scene.cycles.use_denoising = True
    scene.render.use_persistent_data = True
    scene.render.resolution_x = scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.world = bpy.data.worlds.new("InspectionWorld")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[
        "Strength"
    ].default_value = 0.25
    sun = bpy.data.objects.new(
        "InspectionSun", bpy.data.lights.new("InspectionSun", "SUN")
    )
    scene.collection.objects.link(sun)
    sun.data.energy, sun.data.angle = 2, 0.2
    clay = bpy.data.materials.new("InspectionClay")
    clay.use_nodes = True
    clay.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
        0.35,
        0.35,
        0.35,
        1,
    )
    clay.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 1
    materials = {
        slot.material for o in meshes for slot in o.material_slots if slot.material
    }
    images = {
        n.image
        for m in materials
        for n in m.node_tree.nodes
        if n.type == "TEX_IMAGE" and n.image
    }
    texture_sizes = [list(im.size) for im in images]
    for mat in materials:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bs = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        out = next(
            (n for n in nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output),
            None,
        )
        if bs is None or out is None:
            raise ValueError(
                "Capture requires imported Principled base-color materials"
            )
        emission = nodes.new("ShaderNodeEmission")
        color = bs.inputs["Base Color"]
        if color.is_linked:
            links.new(color.links[0].from_socket, emission.inputs["Color"])
        else:
            emission.inputs["Color"].default_value = color.default_value
        links.new(emission.outputs[0], out.inputs["Surface"])
    args.output.mkdir(parents=True, exist_ok=True)
    registration_error = 0
    for f in frames:
        matrix = Matrix([f["matrix"][i : i + 4] for i in range(0, 16, 4)]).transposed()
        cam.matrix_world = g_to_b @ matrix
        cam.data.angle = f["fov"]
        # A camera-relative key also reveals lower surfaces in underside views.
        sun.matrix_world = (
            cam.matrix_world
            @ Matrix.Rotation(0.4, 4, "X")
            @ Matrix.Rotation(-0.5, 4, "Y")
        )
        bpy.context.view_layer.update()
        inv = cam.matrix_world.inverted()
        for point in points[:: max(1, len(points) // 50)]:
            local = inv @ point
            if local.z >= -cam.data.clip_start:
                continue
            ndc = world_to_camera_view(scene, cam, point)
            tangent = math.tan(f["fov"] / 2)
            expected = (
                0.5 + local.x / (-local.z * 2 * tangent),
                0.5 + local.y / (-local.z * 2 * tangent),
            )
            registration_error = max(
                registration_error,
                abs(ndc.x - expected[0]) * args.size,
                abs(ndc.y - expected[1]) * args.size,
            )
        f["input"], f["image"] = f["name"] + "-before.png", f["name"] + "-paint.png"
        for mode in args.modes:
            scene.view_layers[0].material_override = clay if mode == "clay" else None
            scene.render.filepath = str(
                (
                    args.output
                    / (f["input"] if mode == "color" else f["name"] + "-clay.png")
                ).resolve()
            )
            bpy.ops.render.render(write_still=True)
    if registration_error > 0.01:
        raise ValueError(f"Camera registration error: {registration_error} pixels")
    report = {
        "source": str(args.source.resolve()),
        "blender_version": bpy.app.version_string,
        "dimensions_blender_metres": list(high - low),
        "triangles": sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons),
        "mesh_count": len(meshes),
        "material_count": len(materials),
        "texture_sizes": texture_sizes,
        "rgba8_mib_without_mipmaps": sum(w * h * 4 for w, h in texture_sizes) / 1048576,
        "camera_registration_max_error_px": registration_error,
        "capture_seconds": round(time.monotonic() - started, 2),
        "visual_acceptance": "NOT_RUN",
        "collision_navigation": "NOT_RUN",
        "fps": "NOT_MEASURED",
    }
    (args.output / "views.json").write_text(json.dumps(frames, indent=2) + "\n")
    (args.output / "geometry.json").write_text(json.dumps(report, indent=2) + "\n")
    figures = "".join(
        f'<figure><figcaption>{html.escape(f["name"])} / {mode}</figcaption><img src="{f["input"] if mode == "color" else f["name"] + "-clay.png"}"></figure>'
        for f in frames
        for mode in args.modes
    )
    (args.output / "index.html").write_text(
        '<!doctype html><meta charset="utf-8"><title>Registered model views</title><style>body{background:#222;color:#ddd;font:16px sans-serif}main{display:grid;grid-template-columns:repeat(2,1fr)}figure{margin:8px}img{width:100%;display:block}</style><h1>Registered model views</h1><p>Clay/albedo diagnostic, not in-game acceptance.</p><main>'
        + figures
        + "</main>"
    )
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()

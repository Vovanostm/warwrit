"""Repack/bake the existing generated mill, then export the projected textures.

Blender 5.2: --python-exit-code 1 -P this-file -- prepare output-dir --source source.glb
Then: -- pack output-dir
No environment objects are added. See README for the middle projection step.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy


def prepare(source, root, texture_size, underside_size):
    if any(root.iterdir()):
        raise ValueError("Use a fresh output directory for a new UV preparation")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if len(meshes) != 1 or len(meshes[0].data.materials) != 1:
        raise ValueError(
            "Mill preparation requires the original one-mesh, one-material GLB"
        )
    original = meshes[0]
    # glTF Y-up -> Blender Z-up. Downward faces get a smaller atlas; none are deleted.
    mesh = original.data
    parts = {name: [] for name in ["mill", "yard", "underside"]}
    for p in mesh.polygons:
        c = p.center
        part = "underside" if p.normal.z < -0.7 else ("mill" if c.y > 4.5 else "yard")
        parts[part].append(p.index)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    scene.cycles.device = "CPU"
    scene.render.bake.margin = 8
    scene.render.bake.use_clear = True
    bounds = [
        [min(v.co[i] for v in original.data.vertices) for i in range(3)],
        [max(v.co[i] for v in original.data.vertices) for i in range(3)],
    ]
    (root / "repack-bounds.json").write_text(json.dumps(bounds))
    objects = []
    for name, indices in parts.items():
        ob = original.copy()
        ob.data = original.data.copy()
        bpy.context.collection.objects.link(ob)
        ob.name = "ENV_OldMill_" + name
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.faces.ensure_lookup_table()
        keep = set(indices)
        bmesh.ops.delete(
            bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES"
        )
        bmesh.ops.delete(
            bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS"
        )
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
        mat = ob.data.materials[0].copy()
        mat.name = "MAT_OldMill_" + name
        ob.data.materials[0] = mat
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        uv = nodes.new("ShaderNodeUVMap")
        uv.uv_map = ob.data.uv_layers[0].name
        for node in list(nodes):
            if node.type == "TEX_IMAGE":
                links.new(uv.outputs["UV"], node.inputs["Vector"])
            if node.type == "NORMAL_MAP":
                node.uv_map = uv.uv_map
        ob.data.uv_layers.new(name="GameUV")
        ob.data.uv_layers.active_index = 1
        ob.data.uv_layers[1].active_render = True
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.average_islands_scale()
        bpy.ops.uv.pack_islands(
            rotate=True, margin_method="FRACTION", margin=0.001, shape_method="CONCAVE"
        )
        bpy.ops.object.mode_set(mode="OBJECT")
        size = underside_size if name == "underside" else texture_size
        color = bpy.data.images.new(
            name + "_albedo", width=size, height=size, alpha=False
        )
        target = nodes.new("ShaderNodeTexImage")
        target.image = color
        nodes.active = target
        bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
        output = next(n for n in nodes if n.type == "OUTPUT_MATERIAL")
        color_source = bsdf.inputs["Base Color"].links[0].from_socket
        emission = nodes.new("ShaderNodeEmission")
        links.new(color_source, emission.inputs["Color"])
        links.new(emission.outputs[0], output.inputs["Surface"])
        # Only this object needs to be visible for a non-selected-to-active bake.
        for o in bpy.context.scene.objects:
            o.hide_render = o != ob
        print("Baking", name, len(ob.data.polygons), size, flush=True)
        bpy.ops.object.bake(type="EMIT")
        # Use geometry normals for this matte painted variant.
        # It is deliberately not reused with a different tangent/UV basis.
        nodes.clear()
        out = nodes.new("ShaderNodeOutputMaterial")
        bs = nodes.new("ShaderNodeBsdfPrincipled")
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = color
        bs.inputs["Metallic"].default_value = 0
        bs.inputs["Roughness"].default_value = 0.95
        links.new(tex.outputs["Color"], bs.inputs["Base Color"])
        links.new(bs.outputs[0], out.inputs["Surface"])
        ob.data.uv_layers.remove(ob.data.uv_layers[0])
        ob.hide_render = False
        bpy.ops.export_scene.gltf(
            filepath=str(root / (name + "-base.glb")),
            export_format="GLB",
            use_selection=True,
        )
        objects.append(ob)
    bpy.data.objects.remove(original, do_unlink=True)
    for ob in objects:
        ob.hide_render = False
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(root / "repacked.blend"))
    print(
        "Prepared triangle count after welding",
        sum(len(o.data.polygons) for o in objects),
        flush=True,
    )


def pack(root):
    pending_path = root / "projection-pending.json"
    if pending_path.exists():
        raise ValueError(
            "Projection is incomplete; rerun project_texture_views.py with --parts "
            + " ".join(json.loads(pending_path.read_text()))
            + " before packing"
        )
    reports = json.loads((root / "texture-report.json").read_text())
    if sorted(item["part"] for item in reports) != ["mill", "underside", "yard"]:
        raise ValueError(
            "Pack requires completed projection reports for all three parts"
        )
    for name in ["mill", "yard", "underside"]:
        if not (root / (name + "-painted.glb")).is_file():
            raise ValueError(f"Missing painted atlas: {name}; project all parts first")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for name in ["mill", "yard", "underside"]:
        bpy.ops.import_scene.gltf(filepath=str(root / (name + "-painted.glb")))
    objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    ob = bpy.context.object
    # Weld the material boundary so vertex normals agree on both sides.
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    bounds = [
        [min(v.co[i] for v in ob.data.vertices) for i in range(3)],
        [max(v.co[i] for v in ob.data.vertices) for i in range(3)],
    ]
    expected = json.loads((root / "repack-bounds.json").read_text())
    assert all(
        abs(bounds[j][i] - expected[j][i]) < 0.00002 for j in range(2) for i in range(3)
    )
    ob.name = "ENV_OldMillBattlefield"
    ob.data.name = "OldMillBattlefield"
    for poly in ob.data.polygons:
        poly.use_smooth = True
    # Archive lossless packed sources; only the runtime GLB uses JPEG, quality95.
    for mat in ob.data.materials:
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE":
                node.image.pack()
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(root / "battlefield.blend"))
    bpy.ops.export_scene.gltf(
        filepath=str(root / "battlefield.glb"),
        export_format="GLB",
        use_selection=True,
        export_image_format="JPEG",
        export_jpeg_quality=95,
        export_image_quality=95,
    )
    triangles = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    print(
        "Runtime",
        triangles,
        "triangles",
        len(ob.data.materials),
        "materials",
        (root / "battlefield.glb").stat().st_size / 1048576,
        "MiB",
        flush=True,
    )
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(root / "battlefield.glb"))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    assert len(meshes) == 1
    assert (
        sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons) == triangles
    )
    assert all(math.isfinite(c) for o in meshes for v in o.data.vertices for c in v.co)
    assert len(meshes[0].data.materials) == 3
    for mat in meshes[0].data.materials:
        assert any(
            n.type == "TEX_IMAGE" and n.image.packed_file for n in mat.node_tree.nodes
        )
    print("Roundtrip PASS", flush=True)

    stats = {
        "technique": "Pixal3D complete scene; welded seams; five-view material repaint",
        "dimensions_metres": [round(bounds[1][i] - bounds[0][i], 3) for i in range(3)],
        "triangles": triangles,
        "width_inferred_metres": 25,
        "origin": "ground centre",
        "runtime_mib": round((root / "battlefield.glb").stat().st_size / 1048576, 3),
        "materials": 3,
        "textures": reports,
        "collision_navigation": "NOT_RUN",
    }
    (root / "battlefield-geometry.json").write_text(json.dumps(stats, indent=2) + "\n")


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("mode", choices=["prepare", "pack"])
parser.add_argument("--source", type=Path)
parser.add_argument(
    "--texture-size", type=int, choices=[512, 1024, 2048, 4096], default=4096
)
parser.add_argument(
    "--underside-size", type=int, choices=[256, 512, 1024], default=1024
)
parser.add_argument("destination", type=Path)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
root = args.destination.resolve()
root.mkdir(parents=True, exist_ok=True)
if args.mode == "prepare":
    if args.source is None:
        parser.error("prepare requires --source")
    prepare(args.source.resolve(), root, args.texture_size, args.underside_size)
else:
    pack(root)

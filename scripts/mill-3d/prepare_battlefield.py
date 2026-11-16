"""Normalize ONE complete AssetFurnace battlefield; never add authored scenery.

Blender 5.x: --python prepare_battlefield.py -- finished.glb asset-directory
The 25 m width and unseen geometry are inferred for the inspection prototype.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

source, directory = sys.argv[sys.argv.index('--') + 1:]
asset = Path(directory).resolve()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
assert objects, 'Generator returned no mesh'
points = [o.matrix_world @ v.co for o in objects for v in o.data.vertices]
low = Vector([min(p[i] for p in points) for i in range(3)])
high = Vector([max(p[i] for p in points) for i in range(3)])
extent = high-low
normal = Vector()
for obj in objects:
    normal_matrix = obj.matrix_world.to_3x3()
    for poly in obj.data.polygons:
        n = normal_matrix @ poly.normal
        centre = obj.matrix_world @ poly.center
        # The central courtyard is the reference ground. The generated underside
        # is irregular and must not determine the courtyard surface's orientation.
        if (low.x+extent.x*0.3 < centre.x < low.x+extent.x*0.7
                and low.y+extent.y*0.2 < centre.y < low.y+extent.y*0.7
                and centre.z < low.z+extent.z*0.6 and n.z > 0.4):
            normal += n*poly.area
assert normal.length > 0, 'No courtyard plane to normalize; inspect geometry'
ground_up = normal.normalized()
correction = ground_up.rotation_difference(Vector((0,0,1))).to_matrix().to_4x4()
for obj in objects:
    obj.matrix_world = correction @ obj.matrix_world
points = [o.matrix_world @ v.co for o in objects for v in o.data.vertices]
low = Vector([min(p[i] for p in points) for i in range(3)])
high = Vector([max(p[i] for p in points) for i in range(3)])
scale = 25/(high.x-low.x)
origin = Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z))
for number, obj in enumerate(objects):
    transform = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world.identity()
    for v in obj.data.vertices:
        v.co = (transform @ v.co-origin)*scale
    obj.data.update()
    obj.name = f'ENV_OldMillBattlefield_{number+1}'
    for mat in obj.data.materials:
        if mat and mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    for name,value in [('Metallic',0),('Roughness',0.95)]:
                        for link in list(node.inputs[name].links):
                            mat.node_tree.links.remove(link)
                        node.inputs[name].default_value = value
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(asset/'battlefield.blend'))
bpy.ops.export_scene.gltf(filepath=str(asset/'battlefield.glb'),export_format='GLB',use_selection=True)
stats={'technique':'complete image -> Pixal3D -> AssetFurnace Finish; no authored scenery',
       'dimensions_metres':[round(v*scale,3) for v in high-low],
       'triangles':sum(len(p.vertices)-2 for o in objects for p in o.data.polygons),
       'width_inferred_metres':25,'origin':'ground centre',
       'estimated_courtyard_up_before_correction':list(ground_up)}
(asset/'battlefield-geometry.json').write_text(json.dumps(stats,indent=2)+'\n')
print(json.dumps(stats,indent=2))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(asset/'battlefield.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert meshes and all(o.data.vertices for o in meshes)
assert all(math.isfinite(c) for o in meshes for v in o.data.vertices for c in v.co)
assert all(o.data.uv_layers for o in meshes)
assert any(i.packed_file for i in bpy.data.images if i.type=='IMAGE'), 'No packed texture'
print('Complete battlefield GLB roundtrip PASS:',len(meshes),'meshes')

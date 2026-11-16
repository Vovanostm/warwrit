"""Align source-photo cameras with the generated courtyard before Pixel Match.

Usage: python calibrate_views.py original.svviews battlefield-geometry.json output-views
The geometry report comes from prepare_battlefield.py on the native Finish mesh.
Pictures and geometry are unchanged; both cameras rotate as one rigid rig.
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np

source, geometry, destination = map(Path, sys.argv[1:])
up = np.array(json.loads(geometry.read_text())['estimated_courtyard_up_before_correction'])
# Blender Z-up -> Pixal3D photo frame: (-x, -y, z).
up *= [-1, -1, 1]
assert np.isfinite(up).all() and np.isclose(np.linalg.norm(up), 1) and up[2] > 0
cross = np.cross([0, 0, 1], up)
x, y, z = cross
skew = np.array([[0, -z, y], [z, 0, -x], [-y, x, 0]])
rotation = np.eye(4)
rotation[:3, :3] += skew + skew @ skew / (1 + up[2])
assert np.allclose(rotation[:3, :3] @ [0, 0, 1], up)
views = json.loads((source / 'transforms.json').read_text())
destination.mkdir(parents=True, exist_ok=True)
for frame in views['frames']:
    frame['transform_matrix'] = (rotation @ np.array(frame['transform_matrix'])).tolist()
    shutil.copy2(source / frame['file_path'], destination / frame['file_path'])
(destination / 'transforms.json').write_text(json.dumps(views, indent=2) + '\n')
print('Photo cameras aligned to the measured courtyard; source images unchanged')

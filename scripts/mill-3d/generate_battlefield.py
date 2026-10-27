"""Run AssetFurnace front/back generation at the reference camera elevation.

Usage: python generate_battlefield.py --assetfurnace /path/to/image-to-3dlab
       FRONT.png OUTPUT.glb --back BACK.png --res 1024 --seed 42 --steps 12
Upstream's default horizontal cameras suit upright assets, not elevated terrain.
"""
import argparse
import importlib.util
import math
import sys
from pathlib import Path


def elevated_camera(camera, degrees):
    import numpy as np

    angle = math.radians(-degrees)
    c, s = math.cos(angle), math.sin(angle)
    rotation = np.array([[1, 0, 0, 0], [0, c, -s, 0],
                         [0, s, c, 0], [0, 0, 0, 1]])
    return rotation @ camera


if __name__ == '__main__':
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--assetfurnace', type=Path, required=True)
    parser.add_argument('--elevation', type=float, default=35)
    args, remaining = parser.parse_known_args()
    if '--back' not in remaining or not 0 <= args.elevation < 90:
        parser.error('Requires --back and an elevation from 0 to below 90 degrees')
    source = args.assetfurnace / 'scripts' / 'pixal3d_generate.py'
    spec = importlib.util.spec_from_file_location('pixal3d_generate', source)
    pipeline = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pipeline)
    pipeline.GAUGE_CAMERA = elevated_camera(pipeline.GAUGE_CAMERA, args.elevation)
    print(f'[battlefield] front/back camera elevation: {args.elevation} degrees', flush=True)
    sys.argv = [str(source), *remaining]
    raise SystemExit(pipeline.main())

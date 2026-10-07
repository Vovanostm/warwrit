#!/usr/bin/env bash
# Shrink a character/prop GLB for Warwrit's Babylon renderer without touching
# geometry, skin, rig or animation: dedup → prune (keeps empty socket nodes) →
# resize textures → WebP (EXT_texture_webp, supported by @babylonjs/loaders).
# Usage: optimize-glb.sh <in.glb> <out.glb> [maxTextureSize=1024]
set -euo pipefail
if [[ $# -lt 2 ]]; then
  echo "usage: $0 <in.glb> <out.glb> [maxTextureSize=1024]" >&2
  exit 2
fi
in=$1 out=$2 size=${3:-1024}
gt=(npx -y @gltf-transform/cli@4.5.1)
work=$(mktemp -d "$(dirname "$out")/.optimize-glb.XXXXXX")
trap 'rm -rf "$work"' EXIT

"${gt[@]}" dedup "$in" "$work/1.glb"
"${gt[@]}" prune "$work/1.glb" "$work/2.glb" --keep-leaves true --keep-attributes true
"${gt[@]}" resize "$work/2.glb" "$work/3.glb" --width "$size" --height "$size"
"${gt[@]}" webp "$work/3.glb" "$out" --quality 88
ls -l "$in" "$out" | awk '{print $5, $NF}'

# Foliage volume candidates

Two provisional tree cutouts for the dark-fantasy map. They are source-art candidates only; the parent owns runtime integration, actual map-scale comparison, and independent critic acceptance.

- `broadleaf-lean-v1.png`: 1024×1536, asymmetric bent birch with exposed pale bark. Approximate ground-contact pivot `(u=.52, v=.98)` / `(532, 1505 px)`. Alpha≥39 bounds `[64,21,996,1513)`; alpha≥8 bounds `[64,20,996,1513)`.
- `broadleaf-old-v1.png`: 1199×1312, split-trunk irregular oak. Approximate ground-contact pivot `(u=.57, v=.98)` / `(683,1286 px)`. Alpha≥39 bounds `[15,3,1187,1305)`; alpha≥8 bounds `[15,0,1187,1305)`.

Alpha bounds use exclusive right/bottom coordinates. The alpha≥39 check corresponds to a 0.15 renderer cutoff (38.25/255). Both have transparent corners; faint nonzero alpha below the cutoff remains and is reported in `metadata.json`. The visible root pivots are manual estimates and need confirmation in the actual isometric composite.

Exact generation prompts are in the paired `.prompt.txt` files. Generated originals remain at the source paths recorded in `metadata.json`; the oak's pre-correction original is also copied here as `broadleaf-old-v1-initial.png`. Final PNGs were copied unchanged from builtin imagegen output; no raster transformations were applied.

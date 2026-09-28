# Renderer spike

This package is an isolated ART01–03 experiment. It does not change the production renderer or game state. The fixed scenario is defined in `src/shared/scenario.ts`; assets and their included CC0 license texts live in `public/assets/`.

## Run and capture

Install the pinned workspace dependencies from the repository root, then start Vite on the assigned loopback port:

```sh
pnpm install --frozen-lockfile
pnpm --filter @warwrit/renderer-spike dev
```

Open `http://127.0.0.1:5177/?engine=babylon` or `http://127.0.0.1:5177/?engine=playcanvas`. The query selects one engine chunk for that cold page load. Manual day/night/torch controls override the scripted lighting until **Resume script** is selected; capture start resets the override and shared scenario timeline to epoch zero. Wait for the scene-ready state, run the 30-second warm-up, then start the 120-second capture. Export the raw JSON after capture. It contains browser/viewport/resource metadata, asset-ready and first-interactive timestamps, monotonic capture boundaries, timestamped RAF/CPU/GPU samples, summary statistics, and errors. CPU submit samples span scene update through CPU render submission. `NOT_MEASURED` or `ERROR` means that measurement is unavailable or failed; it is not a pass.

Use the same browser, viewport, device state, scene, and capture sequence for both candidates. Keep the browser's measurement evidence separate from this source-level implementation.

## Asset inventory

The shared workload uses Kay Lousberg's free [KayKit Adventurers 2.0](https://kaylousberg.itch.io/kaykit-adventurers) and [Character Animations 1.1](https://kaylousberg.itch.io/kaykit-character-animations), acquired from the author's pages on 2026-09-28. Both packs include CC0 licenses, retained below. The source archive SHA-256 values are `abe48f4763fba0896bab486ee9e6d08ca6b5b3884b9601f235c8847ae94dc479` (Adventurers, 13,024,345 bytes) and `65882f31f905ad2e953819648a59287cdeab8f623908d5ef701971d3758be20f` (Animations, 14,858,957 bytes). Selected GLB, binary and texture bytes were copied unchanged; the four accessory glTF JSON files were reformatted with repository-pinned Prettier, with parsed JSON equality verified against the originals and no geometry conversion; adapters retarget animation by joint names at runtime. Character labels are experiment silhouettes, not approved Warwrit classes or final art.

All listed bytes are local copies. SHA-256 values identify the final local files, including the formatted glTF derivatives. The two license texts are retained alongside them.

| File                                      | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `License-Adventurers-CC0.txt`             | `d4adc31660d1db22eb60eba648e01db41577548f6fa1a3576cb4a6283dae0a58` |
| `License-Character-Animations-CC0.txt`    | `373b159044d1a886ed15f57ca5a7673ba14e2623c460283452705f2056912ed9` |
| `characters/Barbarian.glb`                | `d37824a1d6e8e8af57ef9ae4a87e9271c3986210fbc432fb44670749a577ccac` |
| `characters/Knight.glb`                   | `e484370733824a0740683e7f6040aae0d20e5efd4107dde1175d6a2ad7e2f199` |
| `characters/Rogue.glb`                    | `cae5d9b2f08d53f7b4ab2617d9f42f021c546eb10920455fdcd82a110867fae4` |
| `animations/Rig_Medium_CombatMelee.glb`   | `c55e6ec1c79e83ae21d46fe1cd921c1b64be8b9a524a24517e51c6ba99231459` |
| `animations/Rig_Medium_General.glb`       | `5f725c0f745f36078c7238968cd5c04843cbc6260689eb6e7f5e2bbd7ffdd7ad` |
| `animations/Rig_Medium_MovementBasic.glb` | `11422afd50abf7e8c92ea107e2e0bc94abd38023d6d15f55ad580347efbfa29e` |
| `accessories/axe_1handed.bin`             | `909561b9e5774d2ab0dcb1cbe66e1c0ea116b6eef5fcb4780ed56fe834b07f58` |
| `accessories/axe_1handed.gltf`            | `fc56b1e979244812294df0018805e438e00b5650eb74c8a98687a3b9bb555ad7` |
| `accessories/barbarian_texture.png`       | `f11434d3e5e4df929dacd2c69d15734effb82babf8176a80bb040d2007f5f882` |
| `accessories/dagger.bin`                  | `da7857e41d902cdd39e894563a544719901a9af55053f2b96b21019ed6717677` |
| `accessories/dagger.gltf`                 | `057bae9c4a6486e3b438ba4d13bfff43b49e2b8317a378b6a60f91466757a417` |
| `accessories/knight_texture.png`          | `028db4d1cd8b3471e6ba21686515abd4e36ae582f8b314b71ad2ab1fb5453b12` |
| `accessories/rogue_texture.png`           | `2e2fc741e20e7e2c85b176c8143b49b769bca0d2ed1a1cfc1807a758a0e4d3e1` |
| `accessories/shield_round.bin`            | `42da365328fc8804f44cd3db6becc8bc98729f11862b63e51b42820559d6e1e0` |
| `accessories/shield_round.gltf`           | `c5f4209c2d268917f1cbc699fc54674045b2c26d597039289cb97600764d5948` |
| `accessories/sword_1handed.bin`           | `c8acdc21adf19257e66b78e86d37855474a0a9fda796c39b39d6d08a5ca34bd5` |
| `accessories/sword_1handed.gltf`          | `6efd2d1007403cf1739acb43474dde63b18c186ec0bffee690987f9c89352d61` |

The accessory texture files are included as `public/assets/accessories/{barbarian,knight,rogue}_texture.png`; the character GLBs embed or reference their own textures. License files are `License-Adventurers-CC0.txt` and `License-Character-Animations-CC0.txt`.

## Comparison boundary

This comparison pins Babylon.js 9.28.0 and PlayCanvas 2.22.4.

Both adapters load the same 18 character workload, four named animation clips, equipment, 11×7 six-sided board, team/status markers, props, lighting presets, torch and 36-spark hit cue. They use the same camera definition, fixed 1600×900 drawing buffer in a 16:9 CSS viewport, and CSS-to-world hex picking. Directional shadow maps are disabled in both candidates. Parent browser checks exercise body selection, board misses, manual lighting, visual move previews, fixed-buffer resizing and WebGL context restoration; these checks are separate from comparative measurements. Do not infer a winner or performance result from implementation or source checks; the controlled comparison remains unmeasured.

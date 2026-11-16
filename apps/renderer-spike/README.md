# Renderer comparison — retired by WLC-02

The executable comparison and its PlayCanvas baker were removed on 2026-11-07.
There is no application, workspace package, engine selector or launch command in
this directory. Babylon.js is the sole supported production renderer; run the
[ordinary game](../../docs/engineering/M1_LOCAL_PLAYTEST.md) or
[Combat Lab](../web/src/combat-lab/README.md).

`public/` retains the original KayKit models, accessories, clips, source licenses,
baked images and manifests at their existing paths for provenance and historical
evidence. These files are not current production assets merely because they are
retained. The engine-neutral GLB inspector remains in `.agents/skills/` for
Babylon/character tooling.

The [pre-removal source and README](https://github.com/Vovanostm/warwrit/tree/79a6ba025bba236dfe4be0665aece98d1c8c4353/apps/renderer-spike)
retain the exact comparison implementation and historical reproduction commands.
[ADR-0005](../../docs/architecture/0005-m1-renderer-playcanvas.md) is SUPERSEDED;
its animation-measurement correction and
[scene3 evidence](../../docs/engineering/evidence/renderer-scene-3/README.md)
remain historical, not Babylon acceptance or a recommendation to run PlayCanvas.

Unmerged [PR129](https://github.com/Vovanostm/warwrit/pull/129) is preserved on its
own branch; WLC-02 does not import its 192 walking frames or revive that pilot.
[Scope, dependency disposition and checks](../../docs/engineering/LEGACY_INVENTORY.md#wlc-02--remove-playcanvas-pilot-2026-11-07).

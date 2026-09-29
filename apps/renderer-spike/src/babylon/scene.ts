import '@babylonjs/loaders/glTF/index.js';
import {
  Color3,
  DirectionalLight,
  Engine,
  HemisphericLight,
  LoadAssetContainerAsync,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PointLight,
  Scene,
  SceneLoaderAnimationGroupLoadingMode,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  ArcRotateCamera,
  ImportAnimationsAsync,
} from '@babylonjs/core';
import type { AnimationGroup } from '@babylonjs/core';
import {
  actors,
  firstAttacker,
  firstTarget,
  hexToWorld,
  sampleTimeline,
  scenario,
  torchPosition,
} from '../shared/scenario.js';
import type { RendererMount, RendererController } from '../shared/renderer.js';

type ActorModel = {
  actorId: string;
  root: TransformNode;
  nodes: Map<string, object>;
  groups: Map<string, AnimationGroup>;
};

const assetPath = '/assets/';
const clips = ['Idle_A', 'Walking_A', 'Hit_A', 'Melee_1H_Attack_Chop'] as const;
const animationLibraries = [
  { path: 'animations/Rig_Medium_General.glb', clips: ['Idle_A', 'Hit_A'] },
  { path: 'animations/Rig_Medium_MovementBasic.glb', clips: ['Walking_A'] },
  { path: 'animations/Rig_Medium_CombatMelee.glb', clips: ['Melee_1H_Attack_Chop'] },
] as const;

function originalName(name: string, actorId?: string) {
  return actorId && name.startsWith(`${actorId}::`) ? name.slice(actorId.length + 2) : name;
}

function indexNodes(rootNodes: TransformNode[], transformNodes: TransformNode[], actorId: string) {
  const indexed = new Map<string, object>();
  for (const node of [...rootNodes, ...transformNodes]) {
    if (node.name) indexed.set(originalName(node.name, actorId), node);
  }
  return indexed;
}

function teamColor(team: 'red' | 'blue') {
  return team === 'red' ? new Color3(0.91, 0.29, 0.22) : new Color3(0.16, 0.48, 0.83);
}

function material(scene: Scene, name: string, color: Color3, emissive = false) {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = color;
  value.specularColor = new Color3(0.12, 0.14, 0.18);
  if (emissive) value.emissiveColor = color.scale(0.5);
  return value;
}

function markActor(model: ActorModel, meshes: Mesh[], actor: (typeof actors)[number]) {
  const p = hexToWorld(actor.q, actor.r);
  model.root.position.set(p.x, 0, p.z);
  model.root.metadata = { actorId: actor.id };
  for (const mesh of meshes) {
    mesh.metadata = { ...(mesh.metadata ?? {}), actorId: actor.id };
  }
}

export const BabylonScene: RendererMount = async (canvas, emit, metrics) => {
  const engine = new Engine(canvas, scenario.quality.antialias, {
    antialias: scenario.quality.antialias,
    adaptToDeviceRatio: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  metrics.attachRendererContext();
  engine.setSize(scenario.canvas.width, scenario.canvas.height, true);
  if (engine.webGLVersion < 2) throw new Error('Babylon candidate requires WebGL2');
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color3(...scenario.colors.dayClear).toColor4(1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = Color3.FromHexString(scenario.colors.fog);
  scene.fogDensity = scenario.lighting.day.fog;
  scene.collisionsEnabled = false;
  const camera = new ArcRotateCamera(
    'tactical-camera',
    Math.PI / 2,
    Math.atan2(Math.hypot(scenario.camera.eye[0], scenario.camera.eye[2]), scenario.camera.eye[1]),
    Math.hypot(...scenario.camera.eye),
    new Vector3(...scenario.camera.target),
    scene,
  );
  camera.fov = scenario.camera.fovRadians;
  camera.lowerRadiusLimit = camera.radius;
  camera.upperRadiusLimit = camera.radius;
  camera.lowerBetaLimit = camera.beta;
  camera.upperBetaLimit = camera.beta;
  camera.attachControl(canvas, true);

  const ambient = new HemisphericLight('sky-fill', new Vector3(0, 1, 0), scene);
  ambient.intensity = scenario.lighting.day.ambient;
  const key = new DirectionalLight('daylight', new Vector3(-0.35, -1, -0.3), scene);
  key.intensity = scenario.lighting.day.key;
  const torch = new PointLight(
    'torch-light',
    new Vector3(torchPosition.x, torchPosition.y, torchPosition.z),
    scene,
  );
  torch.intensity = 0;
  torch.diffuse = new Color3(...scenario.colors.torch);
  torch.range = 8;

  const floor = MeshBuilder.CreateGround('arena-floor', { width: 26, height: 18 }, scene);
  floor.position.y = -0.12;
  floor.material = material(scene, 'ground', new Color3(0.17, 0.21, 0.24));
  floor.metadata = { floor: true };
  const tileBase = material(scene, 'hex-base', new Color3(0.28, 0.32, 0.34));
  const fogTile = material(scene, 'fog-cells', Color3.FromHexString(scenario.colors.fog), true);
  const redTile = material(scene, 'red-hex', teamColor('red'), true);
  const blueTile = material(scene, 'blue-hex', teamColor('blue'), true);
  const selectedTile = material(
    scene,
    'selected-hex',
    Color3.FromHexString(scenario.colors.selected),
    true,
  );
  const tiles = new Map<string, Mesh>();
  const fogCells = new Set<string>(scenario.board.fogCells);
  for (let q = -5; q <= 5; q++) {
    for (let r = -3; r <= 3; r++) {
      const cell = MeshBuilder.CreateCylinder(
        `hex-${q}-${r}`,
        { height: 0.14, diameter: 2.45, tessellation: 6, sideOrientation: Mesh.DOUBLESIDE },
        scene,
      );
      const p = hexToWorld(q, r);
      cell.position.set(p.x, -0.015, p.z);
      cell.rotation.y = Math.PI / 6;
      cell.material = fogCells.has(`${q},${r}`) ? fogTile : tileBase;
      cell.metadata = { cell: { q, r } };
      tiles.set(`${q},${r}`, cell);
    }
  }
  const propMat = material(scene, 'weathered-stone', new Color3(0.31, 0.34, 0.35));
  for (const [name, pos, scale] of [
    ['ridge-a', [-1.3, 0.38, -0.1], [2.4, 0.75, 1.7]],
    ['ridge-b', [1.2, 0.23, 0.6], [1.5, 0.45, 1.25]],
    ['crate', [0, 0.35, -5.7], [0.8, 0.7, 0.8]],
  ] as const) {
    const prop = MeshBuilder.CreateBox(name, { size: 1 }, scene);
    prop.position.set(pos[0], pos[1], pos[2]);
    prop.scaling.set(scale[0], scale[1], scale[2]);
    prop.material = propMat;
  }
  const signalPosition = hexToWorld(0, 2);
  const signalWood = material(scene, 'signal-wood', new Color3(0.34, 0.23, 0.13));
  signalWood.emissiveColor = new Color3(0.28, 0.19, 0.105);
  const signalCloth = material(scene, 'signal-ochre', new Color3(0.72, 0.53, 0.26));
  signalCloth.emissiveColor = new Color3(0.5, 0.36, 0.16);
  const signalPole = MeshBuilder.CreateBox(
    'signal-pole',
    { width: 0.07, height: 1.8, depth: 0.07 },
    scene,
  );
  signalPole.position.set(signalPosition.x, 0.9, signalPosition.z);
  signalPole.material = signalWood;
  signalPole.isPickable = false;
  const signalFlag = MeshBuilder.CreateBox(
    'signal-flag',
    { width: 0.5, height: 0.3, depth: 0.035 },
    scene,
  );
  signalFlag.position.set(signalPosition.x + 0.285, 1.65, signalPosition.z);
  signalFlag.material = signalCloth;
  signalFlag.isPickable = false;

  const modelContainers = new Map<string, Awaited<ReturnType<typeof LoadAssetContainerAsync>>>();
  for (const classId of ['Knight', 'Rogue', 'Barbarian'] as const)
    modelContainers.set(
      classId,
      await LoadAssetContainerAsync(`${assetPath}characters/${classId}.glb`, scene),
    );
  const modelById = new Map<string, ActorModel>();
  const meshById = new Map<string, Mesh[]>();
  const actorsByClass = new Map<string, typeof actors>();
  for (const actor of actors) {
    const group = actorsByClass.get(actor.classId) ?? [];
    group.push(actor);
    actorsByClass.set(actor.classId, group);
  }
  for (const [classId, classActors] of actorsByClass) {
    const container = modelContainers.get(classId)!;
    for (const actor of classActors) {
      const instance = container.instantiateModelsToScene((name) => `${actor.id}::${name}`, true);
      const root = instance.rootNodes[0] as TransformNode | undefined;
      if (!root) throw new Error(`No root node in ${classId}.glb`);
      const rootNodes = instance.rootNodes.filter(
        (node): node is TransformNode => node instanceof TransformNode,
      );
      const childNodes = rootNodes.flatMap((node) => node.getChildTransformNodes(false));
      const nodes = indexNodes(rootNodes, childNodes, actor.id);
      const meshes = instance.rootNodes.flatMap((entry) => entry.getChildMeshes(false)) as Mesh[];
      const model: ActorModel = { actorId: actor.id, root, nodes, groups: new Map() };
      markActor(model, meshes, actor);
      modelById.set(actor.id, model);
      meshById.set(actor.id, meshes);
      const token = actor.team === 'red' ? redTile : blueTile;
      const where = hexToWorld(actor.q, actor.r);
      const teamMarker = MeshBuilder.CreateTorus(
        `team-marker-${actor.id}`,
        {
          diameter: 1.5,
          thickness: 0.075,
          tessellation: 24,
        },
        scene,
      );
      teamMarker.position.set(where.x, 0.13, where.z);
      teamMarker.material = token;
      teamMarker.metadata = { actorId: actor.id };
      meshById.get(actor.id)!.push(teamMarker);
      const healthbar = MeshBuilder.CreateBox(
        `status-${actor.id}`,
        { width: 0.95, height: 0.07, depth: 0.06 },
        scene,
      );
      healthbar.position.set(where.x, 2.65, where.z);
      healthbar.material = token;
    }
  }

  const accessoryContainers = new Map<
    string,
    Awaited<ReturnType<typeof LoadAssetContainerAsync>>
  >();
  for (const name of ['sword_1handed', 'shield_round', 'dagger', 'axe_1handed'])
    accessoryContainers.set(
      name,
      await LoadAssetContainerAsync(`${assetPath}accessories/${name}.gltf`, scene),
    );
  for (const actor of actors) {
    const model = modelById.get(actor.id)!;
    const slots =
      actor.equipment === 'sword-shield'
        ? [
            ['sword_1handed', 'handslot.r'],
            ['shield_round', 'handslot.l'],
          ]
        : actor.equipment === 'dagger'
          ? [['dagger', 'handslot.r']]
          : [['axe_1handed', 'handslot.r']];
    for (const [asset, slot] of slots) {
      const hand = model.nodes.get(slot!) as TransformNode | undefined;
      if (!hand) {
        emit({ type: 'error', message: `Unmapped equipment joint ${slot} on ${actor.id}` });
        continue;
      }
      const item = accessoryContainers
        .get(asset!)!
        .instantiateModelsToScene((name) => `${actor.id}::${asset}::${name}`, true);
      const root = item.rootNodes[0] as TransformNode | undefined;
      if (!root) continue;
      root.parent = hand;
      root.position.set(0, -0.15, 0.12);
      root.scaling.set(0.42, 0.42, 0.42);
    }
  }

  const sourceGroups = new Map<string, Map<string, AnimationGroup>>();
  const importedNodes: object[] = [];
  for (const [classId, classActors] of actorsByClass) {
    const prototype = modelById.get(classActors[0]!.id)!;
    const byClip = new Map<string, AnimationGroup>();
    for (const library of animationLibraries) {
      const before = scene.animationGroups.length;
      await ImportAnimationsAsync(`${assetPath}${library.path}`, scene, {
        overwriteAnimations: false,
        animationGroupLoadingMode: SceneLoaderAnimationGroupLoadingMode.NoSync,
        targetConverter: (target) => {
          const name = (target as { name?: string } | null)?.name;
          const node = name ? prototype.nodes.get(name) : undefined;
          if (!node && name) importedNodes.push(target as object);
          return node ?? null;
        },
      });
      const loaded = scene.animationGroups.slice(before);
      for (const wanted of library.clips) {
        const normalizedClip = wanted.toLowerCase().replaceAll(/[^a-z0-9]/gu, '');
        const group = loaded.find((item) =>
          item.name
            .toLowerCase()
            .replaceAll(/[^a-z0-9]/gu, '')
            .includes(normalizedClip),
        );
        if (!group)
          throw new Error(
            `Babylon did not load animation ${wanted} from ${library.path}; groups: ${loaded.map((item) => item.name).join(', ') || '(none)'}`,
          );
        byClip.set(wanted, group);
        prototype.groups.set(wanted, group);
      }
    }
    sourceGroups.set(classId, byClip);
    for (const actor of classActors.slice(1)) {
      const target = modelById.get(actor.id)!;
      for (const clip of clips) {
        const source = byClip.get(clip);
        if (!source) continue;
        const copy = source.clone(`${actor.id}-${clip}`, (oldTarget) => {
          const name = originalName(
            (oldTarget as { name?: string })?.name ?? classId,
            classActors[0]!.id,
          );
          return target.nodes.get(name) ?? null;
        });
        target.groups.set(clip, copy);
      }
    }
  }

  let currentLight: 'day' | 'night' | 'torch' = 'day';
  let manualLight: 'day' | 'night' | 'torch' | null = null;
  const applyLighting = (preset: 'day' | 'night' | 'torch', mode: 'scripted' | 'manual') => {
    currentLight = preset;
    const values = scenario.lighting[preset];
    ambient.intensity = values.ambient;
    key.intensity = values.key;
    key.diffuse = Color3.FromHexString(
      preset === 'day' ? scenario.colors.dayKey : scenario.colors.nightKey,
    );
    torch.intensity = preset === 'torch' ? scenario.lighting.torch.torch : 0;
    scene.fogDensity = values.fog;
    const clearColor = preset === 'day' ? scenario.colors.dayClear : scenario.colors.nightClear;
    scene.clearColor = new Color3(...clearColor).toColor4(1);
    emit({ type: 'lighting', preset, mode });
  };

  const flare = document.createElement('canvas');
  flare.width = flare.height = 64;
  const ctx = flare.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,235,171,1)');
    gradient.addColorStop(0.25, 'rgba(255,167,93,.9)');
    gradient.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const burst = new ParticleSystem('hit-vfx', scenario.quality.particleCount, scene);
  burst.particleTexture = new Texture(flare.toDataURL(), scene, true, false);
  burst.emitter = meshById.get(firstAttacker.id)![0]!;
  burst.minLifeTime = 0.2;
  burst.maxLifeTime = 0.55;
  burst.minEmitPower = 2;
  burst.maxEmitPower = 5;
  burst.emitRate = 0;
  burst.minSize = 0.08;
  burst.maxSize = 0.2;
  burst.color1 = new Color3(1, 0.82, 0.42).toColor4(1);
  burst.color2 = new Color3(1, 0.36, 0.14).toColor4(1);
  burst.colorDead = new Color3(0.3, 0.15, 0.1).toColor4(0);
  burst.blendMode = ParticleSystem.BLENDMODE_ONEONE;
  const emitBurst = () => {
    burst.emitter = meshById.get(firstAttacker.id)![0]!;
    burst.manualEmitCount = scenario.quality.particleCount;
    burst.start();
    window.setTimeout(() => burst.stop(), 80);
  };

  let selectedId: string | null = null;
  let previewMode: 'none' | 'move' | 'attack' = 'none';
  let lastTimelineHit = false;
  let manualAttackUntil = 0;
  const animationState = new Map<string, string>();
  const play = (actorId: string, clip: string) => {
    if (animationState.get(actorId) === clip) return;
    const model = modelById.get(actorId);
    if (!model) return;
    for (const group of model.groups.values()) group.stop();
    const group = model.groups.get(clip);
    if (!group) {
      emit({ type: 'error', message: `${actorId} has no retargeted ${clip} clip` });
      return;
    }
    group.start(true);
    animationState.set(actorId, clip);
  };
  let timelineEpochMs = performance.now();
  const renderFrame = () => {
    const now = performance.now();
    metrics.frameStart(now);
    const cpuStart = performance.now();
    const timeline = sampleTimeline((now - timelineEpochMs) / 1000);
    for (const [id, clip] of timeline.animationByActor) play(id, clip);
    if (now > manualAttackUntil) {
      if (timeline.hitVisible && !lastTimelineHit) emitBurst();
      lastTimelineHit = timeline.hitVisible;
    }
    if (manualLight === null && timeline.lightPreset !== currentLight)
      applyLighting(timeline.lightPreset, 'scripted');
    const query = metrics.gpuBegin();
    scene.render();
    metrics.gpuEnd(query);
    metrics.cpuSubmit(cpuStart, performance.now());
  };
  const firstFrame = new Promise<void>((resolve) =>
    scene.onAfterRenderObservable.addOnce(() => resolve()),
  );
  if (
    engine.getRenderWidth() !== scenario.canvas.width ||
    engine.getRenderHeight() !== scenario.canvas.height
  )
    throw new Error(
      `Babylon canvas has invalid drawing size ${engine.getRenderWidth()}×${engine.getRenderHeight()}`,
    );
  emit({ type: 'assets-ready' });
  engine.runRenderLoop(renderFrame);
  applyLighting('day', 'scripted');
  emit({
    type: 'status',
    message: 'Babylon scene ready; timeline started at deterministic epoch zero.',
  });

  const setSelection = (actorId: string | null) => {
    selectedId = actorId;
    const actor = actors.find((entry) => entry.id === actorId);
    for (const [id, mesh] of tiles) {
      const isActorTile = !!actor && id === `${actor.q},${actor.r}`;
      mesh.material = isActorTile ? selectedTile : fogCells.has(id) ? fogTile : tileBase;
    }
  };

  const onPick = (x: number, y: number, isHover: boolean) => {
    const rect = canvas.getBoundingClientRect();
    const pick = scene.pick(
      (x * engine.getRenderWidth()) / rect.width,
      (y * engine.getRenderHeight()) / rect.height,
    );
    if (!pick?.hit || !pick.pickedMesh || !pick.pickedPoint) {
      if (isHover) emit({ type: 'hover', actorId: null });
      return;
    }
    let actorId: string | undefined;
    let current = pick.pickedMesh as Mesh | null;
    while (current && !actorId) {
      actorId = current.metadata?.actorId as string | undefined;
      current = current.parent as Mesh | null;
    }
    if (isHover) {
      emit({ type: 'hover', actorId: actorId ?? null });
    } else if (actorId) {
      setSelection(actorId);
      emit({ type: 'select', actorId });
    } else {
      const cell = pick.pickedMesh.metadata?.cell as { q: number; r: number } | undefined;
      if (cell && tiles.has(`${cell.q},${cell.r}`)) emit({ type: 'cell', q: cell.q, r: cell.r });
    }
  };
  const pointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    onPick(event.clientX - rect.left, event.clientY - rect.top, true);
  };
  const pointerClick = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    onPick(event.clientX - rect.left, event.clientY - rect.top, false);
  };
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('click', pointerClick);
  const resize = () => engine.setSize(scenario.canvas.width, scenario.canvas.height, true);
  window.addEventListener('resize', resize);
  const controller: RendererController = {
    setLighting: (preset) => {
      manualLight = preset;
      applyLighting(preset, 'manual');
    },
    resumeLightingScript: () => {
      manualLight = null;
      const preset = sampleTimeline((performance.now() - timelineEpochMs) / 1000).lightPreset;
      applyLighting(preset, 'scripted');
    },
    setSelection: (actorId) => {
      setSelection(actorId);
    },
    setPreview: (mode) => {
      previewMode = mode;
      if (mode !== 'none') emit({ type: 'status', message: `${mode} target preview armed` });
    },
    triggerAttack: () => {
      manualAttackUntil = performance.now() + 1600;
      play(firstAttacker.id, 'Melee_1H_Attack_Chop');
      play(firstTarget.id, 'Hit_A');
      emitBurst();
      emit({ type: 'status', message: 'Scripted attack and hit animation (visual only).' });
    },
    resetTimeline: () => {
      timelineEpochMs = performance.now();
      lastTimelineHit = false;
      manualAttackUntil = 0;
      manualLight = null;
      for (const actor of actors) play(actor.id, 'Idle_A');
      applyLighting('day', 'scripted');
    },
    resize,
    destroy: () => {
      engine.stopRenderLoop(renderFrame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('click', pointerClick);
      burst.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
  void selectedId;
  void previewMode;
  void importedNodes;
  void sourceGroups;
  await Promise.race([
    firstFrame,
    new Promise<never>((_, reject) =>
      window.setTimeout(
        () => reject(new Error('Babylon did not complete its first frame within 5 seconds')),
        5000,
      ),
    ),
  ]);
  return controller;
};

import {
  Application,
  Asset,
  Color,
  Entity,
  FOG_EXP2,
  FILLMODE_NONE,
  createCylinder,
  MeshInstance,
  RESOLUTION_FIXED,
  StandardMaterial,
  Vec3,
} from 'playcanvas';
import type { AnimTrack, RenderComponent } from 'playcanvas';
import {
  actors,
  firstAttacker,
  firstTarget,
  hexToWorld,
  sampleTimeline,
  scenario,
} from '../shared/scenario.js';
import type { RendererMount } from '../shared/renderer.js';

function loadContainer(app: Application, url: string) {
  return new Promise<Asset>((resolve, reject) => {
    const asset = new Asset(url, 'container', { url });
    asset.once('load', () => resolve(asset));
    asset.once('error', (error: unknown) => reject(error));
    app.assets.add(asset);
    app.assets.load(asset);
  });
}

function axialRound(x: number, z: number) {
  const size = scenario.board.size;
  const q = ((Math.sqrt(3) / 3) * x - z / 3) / size;
  const r = ((2 / 3) * z) / size;
  let rx = Math.round(q);
  let rz = Math.round(r);
  const ry = Math.round(-q - r);
  const dx = Math.abs(rx - q);
  const dy = Math.abs(ry + q + r);
  const dz = Math.abs(rz - r);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) rz = -rx - ry;
  return { q: rx, r: rz };
}

function rayAabbDistance(from: Vec3, to: Vec3, bounds: MeshInstance['aabb']) {
  const direction = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const minimum = bounds.getMin();
  const maximum = bounds.getMax();
  let near = 0;
  let far = 1;
  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(direction[axis]) < 1e-8) {
      if (from[axis] < minimum[axis] || from[axis] > maximum[axis]) return null;
      continue;
    }
    const first = (minimum[axis] - from[axis]) / direction[axis];
    const second = (maximum[axis] - from[axis]) / direction[axis];
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return null;
  }
  return near;
}

export const PlayCanvasScene: RendererMount = async (canvas, emit, metrics) => {
  const app = new Application(canvas, {
    graphicsDeviceOptions: { antialias: scenario.quality.antialias },
  });
  metrics.attachRendererContext();
  app.setCanvasFillMode(FILLMODE_NONE, scenario.canvas.width, scenario.canvas.height);
  app.setCanvasResolution(RESOLUTION_FIXED, scenario.canvas.width, scenario.canvas.height);
  app.resizeCanvas(scenario.canvas.width, scenario.canvas.height);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  app.scene.ambientLight = new Color(0.72, 0.72, 0.72);
  app.scene.fog.type = FOG_EXP2;
  app.scene.fog.color = new Color().fromString(scenario.colors.fog);
  app.scene.fog.density = scenario.lighting.day.fog;

  const camera = new Entity('Tactical camera');
  camera.addComponent('camera', {
    clearColor: new Color(0.055, 0.072, 0.09),
    fov: (scenario.camera.fovRadians * 180) / Math.PI,
  });
  camera.camera!.aspectRatio = scenario.canvas.width / scenario.canvas.height;
  camera.setPosition(scenario.camera.eye[0], scenario.camera.eye[1], scenario.camera.eye[2]);
  camera.lookAt(new Vec3(...scenario.camera.target));
  app.root.addChild(camera);
  const light = new Entity('Daylight');
  light.addComponent('light', {
    type: 'directional',
    intensity: scenario.lighting.day.key,
    castShadows: false,
  });
  light.setEulerAngles(45, 25, 0);
  app.root.addChild(light);
  const torch = new Entity('Torch light');
  torch.addComponent('light', {
    type: 'omni',
    intensity: 0,
    range: 8,
    color: new Color(1, 0.69, 0.35),
  });
  const torchPosition = hexToWorld(firstAttacker.q, firstAttacker.r);
  torch.setPosition(torchPosition.x, 2.2, torchPosition.z);
  app.root.addChild(torch);

  const floor = new Entity('Arena floor');
  floor.addComponent('model', { type: 'plane' });
  floor.setLocalScale(26, 1, 18);
  const floorMaterial = new StandardMaterial();
  floorMaterial.diffuse = new Color(0.17, 0.21, 0.24);
  floorMaterial.update();
  floor.model!.material = floorMaterial;
  floor.setPosition(0, -0.12, 0);
  app.root.addChild(floor);

  const tileMesh = createCylinder(app.graphicsDevice, {
    radius: 1.22,
    height: 0.14,
    capSegments: 6,
  });
  const tileBase = new StandardMaterial();
  tileBase.diffuse = new Color(0.28, 0.32, 0.34);
  tileBase.update();
  const fogTile = new StandardMaterial();
  fogTile.diffuse = new Color(0.16, 0.21, 0.29);
  fogTile.emissive = new Color(0.08, 0.12, 0.19);
  fogTile.update();
  const selectedTile = new StandardMaterial();
  selectedTile.diffuse = new Color(0.96, 0.81, 0.44);
  selectedTile.emissive = new Color(0.25, 0.18, 0.06);
  selectedTile.update();
  const tileMaterials = new Map<string, StandardMaterial>();
  const tiles = new Map<string, Entity>();
  const fogCells = new Set<string>(scenario.board.fogCells);
  for (let q = -5; q <= 5; q++) {
    for (let r = -3; r <= 3; r++) {
      const tile = new Entity(`hex-${q}-${r}`);
      const position = hexToWorld(q, r);
      tile.setPosition(position.x, -0.015, position.z);
      tile.addComponent('render', {
        meshInstances: [new MeshInstance(tileMesh, fogCells.has(`${q},${r}`) ? fogTile : tileBase)],
      });
      app.root.addChild(tile);
      tileMaterials.set(`${q},${r}`, fogCells.has(`${q},${r}`) ? fogTile : tileBase);
      tiles.set(`${q},${r}`, tile);
    }
  }

  const containers = new Map<string, Asset>();
  for (const classId of ['Knight', 'Rogue', 'Barbarian'] as const) {
    containers.set(classId, await loadContainer(app, `/assets/characters/${classId}.glb`));
  }
  const roots = new Map<string, Entity>();
  const animationPaths = [
    '/assets/animations/Rig_Medium_General.glb',
    '/assets/animations/Rig_Medium_MovementBasic.glb',
    '/assets/animations/Rig_Medium_CombatMelee.glb',
  ];
  const tracks = new Map<string, AnimTrack>();
  for (const path of animationPaths) {
    const containerAsset = await loadContainer(app, path);
    const resource = containerAsset.resource as {
      animations?: Array<{ resource?: AnimTrack }>;
    } | null;
    for (const animation of resource?.animations ?? []) {
      if (animation.resource) tracks.set(animation.resource.name, animation.resource);
    }
  }
  const requiredClips = ['Idle_A', 'Walking_A', 'Melee_1H_Attack_Chop', 'Hit_A'] as const;
  for (const clip of requiredClips) {
    if (!tracks.has(clip)) throw new Error(`PlayCanvas did not load animation ${clip}`);
  }
  const currentClip = new Map<string, string>();
  const statusMaterials = new Map<string, StandardMaterial>();
  for (const team of ['red', 'blue'] as const) {
    const status = new StandardMaterial();
    status.diffuse = team === 'red' ? new Color(0.91, 0.29, 0.22) : new Color(0.16, 0.48, 0.83);
    status.emissive = status.diffuse;
    status.update();
    statusMaterials.set(team, status);
  }
  const accessoryContainers = new Map<string, Asset>();
  for (const name of ['sword_1handed', 'shield_round', 'dagger', 'axe_1handed'])
    accessoryContainers.set(name, await loadContainer(app, `/assets/accessories/${name}.gltf`));
  for (const actor of actors) {
    const model = containers.get(actor.classId)!.resource;
    if (
      !model ||
      typeof (model as { instantiateRenderEntity?: unknown }).instantiateRenderEntity !== 'function'
    )
      throw new Error(`PlayCanvas did not load ${actor.classId}.glb as a container`);
    const root = (model as { instantiateRenderEntity: () => Entity }).instantiateRenderEntity();
    root.name = actor.id;
    const position = hexToWorld(actor.q, actor.r);
    root.setPosition(position.x, 0, position.z);
    root.setLocalScale(0.92, 0.92, 0.92);
    app.root.addChild(root);
    const healthbar = new Entity(`status-${actor.id}`);
    healthbar.addComponent('model', { type: 'box', material: statusMaterials.get(actor.team) });
    healthbar.setLocalScale(0.95, 0.07, 0.06);
    healthbar.setPosition(position.x, 2.65, position.z);
    app.root.addChild(healthbar);
    root.addComponent('anim', { activate: false });
    root.anim!.loadStateGraph({
      layers: [
        {
          name: 'Base',
          states: [
            { name: 'START', speed: 1 },
            ...requiredClips.map((name) => ({
              name,
              speed: 1,
              loop: name === 'Idle_A' || name === 'Walking_A',
              defaultState: name === 'Idle_A',
            })),
          ],
          transitions: [{ from: 'START', to: 'Idle_A' }],
        },
      ],
      parameters: {},
    });
    for (const clip of requiredClips)
      root.anim!.assignAnimation(
        clip,
        tracks.get(clip)!,
        'Base',
        1,
        clip === 'Idle_A' || clip === 'Walking_A',
      );
    root.anim!.baseLayer?.play('Idle_A');
    currentClip.set(actor.id, 'Idle_A');
    const equipment =
      actor.equipment === 'sword-shield'
        ? [
            ['sword_1handed', 'handslot.r'],
            ['shield_round', 'handslot.l'],
          ]
        : actor.equipment === 'dagger'
          ? [['dagger', 'handslot.r']]
          : [['axe_1handed', 'handslot.r']];
    for (const [assetName, jointName] of equipment) {
      const joint = root.findByName(jointName!);
      const resource = accessoryContainers.get(assetName!)!.resource as {
        instantiateRenderEntity?: () => Entity;
      } | null;
      if (!joint || !resource?.instantiateRenderEntity)
        throw new Error(`PlayCanvas could not attach ${assetName} to ${jointName} on ${actor.id}`);
      const item = resource.instantiateRenderEntity();
      joint.addChild(item);
      item.setLocalPosition(0, -0.15, 0.12);
      item.setLocalScale(0.42, 0.42, 0.42);
    }
    roots.set(actor.id, root);
  }
  const actorMeshInstances = new Map(
    actors.map((actor) => [
      actor.id,
      roots
        .get(actor.id)!
        .findComponents('render')
        .flatMap((component) => (component as RenderComponent).meshInstances),
    ]),
  );

  const propMaterial = new StandardMaterial();
  propMaterial.diffuse = new Color(0.31, 0.34, 0.35);
  propMaterial.update();
  for (const [name, position, scale] of [
    ['ridge-a', [-1.3, 0.38, -0.1], [2.4, 0.75, 1.7]],
    ['ridge-b', [1.2, 0.23, 0.6], [1.5, 0.45, 1.25]],
    ['crate', [0, 0.35, -5.7], [0.8, 0.7, 0.8]],
  ] as const) {
    const prop = new Entity(name);
    prop.addComponent('model', { type: 'box', material: propMaterial });
    prop.setPosition(position[0], position[1], position[2]);
    prop.setLocalScale(scale[0], scale[1], scale[2]);
    app.root.addChild(prop);
  }

  const markers = new Map<string, Entity>();
  for (const actor of actors) {
    const marker = new Entity(`marker-${actor.id}`);
    marker.addComponent('model', { type: 'cylinder' });
    marker.setLocalScale(1.35, 0.06, 1.35);
    const markerPosition = hexToWorld(actor.q, actor.r);
    marker.setPosition(markerPosition.x, 0.04, markerPosition.z);
    const markerMaterial = new StandardMaterial();
    markerMaterial.diffuse =
      actor.team === 'red' ? new Color(0.91, 0.29, 0.22) : new Color(0.16, 0.48, 0.83);
    markerMaterial.emissive = markerMaterial.diffuse;
    markerMaterial.update();
    marker.model!.material = markerMaterial;
    app.root.addChild(marker);
    markers.set(actor.id, marker);
  }
  const sparks: Entity[] = [];
  const sparkMaterial = new StandardMaterial();
  sparkMaterial.diffuse = new Color(1, 0.64, 0.2);
  sparkMaterial.emissive = new Color(1, 0.3, 0.04);
  sparkMaterial.update();
  for (let index = 0; index < scenario.quality.particleCount; index++) {
    const spark = new Entity(`hit-spark-${index}`);
    spark.addComponent('model', { type: 'sphere', material: sparkMaterial });
    spark.setLocalScale(0.08, 0.08, 0.08);
    spark.enabled = false;
    app.root.addChild(spark);
    sparks.push(spark);
  }

  const gl = canvas.getContext('webgl2');
  if (
    !gl ||
    gl.drawingBufferWidth !== scenario.canvas.width ||
    gl.drawingBufferHeight !== scenario.canvas.height
  )
    throw new Error(
      `PlayCanvas canvas has invalid drawing size ${gl?.drawingBufferWidth ?? 0}×${gl?.drawingBufferHeight ?? 0}`,
    );
  emit({ type: 'assets-ready' });
  const firstFrame = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('PlayCanvas did not complete its first frame within 5 seconds')),
      5000,
    );
    app.once('postrender', () => {
      window.clearTimeout(timeout);
      const errorCode = gl.getError();
      if (errorCode !== gl.NO_ERROR)
        reject(new Error(`PlayCanvas first frame failed with WebGL error ${errorCode}`));
      else resolve();
    });
  });
  let timelineEpochMs = performance.now();
  let lightPreset: 'day' | 'night' | 'torch' = 'day';
  let manualLight: 'day' | 'night' | 'torch' | null = null;
  let previewMode: 'none' | 'move' | 'attack' = 'none';
  let selectedId: string | null = null;
  let selectedCell: string | null = null;
  let destroyed = false;
  let previousHitVisible = false;
  let sparkStartedAt: number | null = null;
  const startBurst = () => {
    sparkStartedAt = performance.now();
    for (const spark of sparks) spark.enabled = true;
  };
  let frameStart = 0;
  let gpuQuery: WebGLQuery | null = null;
  app.on('frameupdate', () => {
    frameStart = performance.now();
    metrics.frameStart(frameStart);
  });
  app.on('prerender', () => {
    gpuQuery = metrics.gpuBegin();
  });
  app.on('postrender', () => {
    metrics.gpuEnd(gpuQuery);
    gpuQuery = null;
    metrics.cpuSubmit(frameStart, performance.now());
  });
  app.on('update', () => {
    if (destroyed) return;
    const sample = sampleTimeline((performance.now() - timelineEpochMs) / 1000);
    for (const [actorId, clip] of sample.animationByActor) {
      const root = roots.get(actorId);
      if (root && currentClip.get(actorId) !== clip) {
        root.anim?.baseLayer?.play(clip);
        currentClip.set(actorId, clip);
      }
    }
    if (manualLight === null && sample.lightPreset !== lightPreset)
      applyLighting(sample.lightPreset, 'scripted');
    if (sample.hitVisible && !previousHitVisible) startBurst();
    previousHitVisible = sample.hitVisible;
    if (sparkStartedAt !== null) {
      const age = performance.now() - sparkStartedAt;
      if (age >= 600) {
        for (const spark of sparks) spark.enabled = false;
        sparkStartedAt = null;
      } else {
        const origin = roots.get(firstAttacker.id)!.getPosition();
        for (let index = 0; index < sparks.length; index++) {
          const angle = index * 2.399963229728653;
          const distance = 0.4 + (index % 6) * 0.12;
          sparks[index]!.setPosition(
            origin.x + Math.cos(angle) * distance,
            1.3 + age * 0.002 + (index % 3) * 0.08,
            origin.z + Math.sin(angle) * distance,
          );
        }
      }
    }
  });
  app.start();

  const applyLighting = (preset: 'day' | 'night' | 'torch', mode: 'scripted' | 'manual') => {
    lightPreset = preset;
    const values = scenario.lighting[preset];
    app.scene.ambientLight = new Color(values.ambient, values.ambient, values.ambient);
    light.light!.intensity = values.key;
    torch.light!.intensity = preset === 'torch' ? scenario.lighting.torch.torch : 0;
    app.scene.fog.color = new Color().fromString(
      preset === 'day' ? scenario.colors.fog : '#29364a',
    );
    app.scene.fog.density = values.fog;
    emit({ type: 'lighting', preset, mode });
  };
  const setLighting = (preset: 'day' | 'night' | 'torch') => {
    manualLight = preset;
    applyLighting(preset, 'manual');
  };
  const resumeLightingScript = () => {
    manualLight = null;
    applyLighting(
      sampleTimeline((performance.now() - timelineEpochMs) / 1000).lightPreset,
      'scripted',
    );
  };
  const screenRay = (event: PointerEvent | MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cameraComponent = camera.camera;
    if (!cameraComponent || rect.width <= 0 || rect.height <= 0) return null;
    const from = cameraComponent.screenToWorld(x, y, cameraComponent.nearClip);
    const to = cameraComponent.screenToWorld(x, y, cameraComponent.farClip);
    return { from, to };
  };
  const pointerCell = (event: PointerEvent | MouseEvent) => {
    const ray = screenRay(event);
    if (!ray) return null;
    const { from, to } = ray;
    const dy = to.y - from.y;
    if (Math.abs(dy) < 1e-6) return null;
    const amount = -from.y / dy;
    return axialRound(from.x + (to.x - from.x) * amount, from.z + (to.z - from.z) * amount);
  };
  const pointerActor = (event: PointerEvent | MouseEvent) => {
    const ray = screenRay(event);
    if (!ray) return null;
    let closest: { actorId: string; distance: number } | null = null;
    for (const [actorId, instances] of actorMeshInstances) {
      for (const instance of instances) {
        const distance = rayAabbDistance(ray.from, ray.to, instance.aabb);
        if (distance !== null && (!closest || distance < closest.distance))
          closest = { actorId, distance };
      }
    }
    return closest?.actorId ?? null;
  };
  const applyTileHighlight = () => {
    for (const [cellId, tile] of tiles) {
      const actor = actors.find((entry) => `${entry.q},${entry.r}` === cellId);
      const base = fogCells.has(cellId) ? fogTile : tileBase;
      const material = cellId === selectedCell ? selectedTile : base;
      tileMaterials.set(cellId, material);
      tile.render!.meshInstances[0]!.material = material;
      if (actor) markers.get(actor.id)!.enabled = cellId !== selectedCell;
    }
  };
  const onMove = (event: PointerEvent) => {
    const cell = pointerCell(event);
    const cellId = cell ? `${cell.q},${cell.r}` : '';
    emit({ type: 'hover', actorId: pointerActor(event) });
    if (previewMode !== 'none') {
      selectedCell = cell && tiles.has(cellId) ? cellId : null;
      applyTileHighlight();
    }
  };
  const onClick = (event: MouseEvent) => {
    const actorId = pointerActor(event);
    if (actorId) {
      const actor = actors.find((entry) => entry.id === actorId)!;
      selectedId = actor.id;
      selectedCell = `${actor.q},${actor.r}`;
      applyTileHighlight();
      emit({ type: 'select', actorId: actor.id });
      return;
    }
    const cell = pointerCell(event);
    if (!cell) return;
    const cellId = `${cell.q},${cell.r}`;
    if (tiles.has(cellId)) {
      emit({ type: 'cell', q: cell.q, r: cell.r });
    }
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('click', onClick);
  emit({
    type: 'status',
    message: 'PlayCanvas scene ready; shared timeline started at deterministic epoch zero.',
  });
  await firstFrame;
  return {
    setLighting,
    resumeLightingScript,
    setSelection: (actorId) => {
      selectedId = actorId;
      const actor = actors.find((entry) => entry.id === actorId);
      selectedCell = actor ? `${actor.q},${actor.r}` : null;
      applyTileHighlight();
    },
    setPreview: (mode) => {
      previewMode = mode;
      if (mode === 'none') {
        selectedCell = actors.find((entry) => entry.id === selectedId)
          ? `${actors.find((entry) => entry.id === selectedId)!.q},${actors.find((entry) => entry.id === selectedId)!.r}`
          : null;
        applyTileHighlight();
      }
    },
    triggerAttack: () => {
      roots.get(firstAttacker.id)?.anim?.baseLayer?.play('Melee_1H_Attack_Chop');
      roots.get(firstTarget.id)?.anim?.baseLayer?.play('Hit_A');
      startBurst();
      emit({ type: 'select', actorId: firstAttacker.id });
      emit({
        type: 'status',
        message: `Scripted visual attack: ${firstAttacker.id} → ${firstTarget.id} (${previewMode})`,
      });
    },
    resetTimeline: () => {
      timelineEpochMs = performance.now();
      previousHitVisible = false;
      for (const spark of sparks) spark.enabled = false;
      sparkStartedAt = null;
      for (const actor of actors) {
        currentClip.set(actor.id, 'Idle_A');
        roots.get(actor.id)?.anim?.baseLayer?.play('Idle_A');
      }
      manualLight = null;
      applyLighting('day', 'scripted');
    },
    resize: () => {
      app.resizeCanvas(scenario.canvas.width, scenario.canvas.height);
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    },
    destroy: () => {
      destroyed = true;
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      app.destroy();
      for (const actorId of markers.keys()) roots.get(actorId)?.destroy();
      selectedId = null;
    },
  };
};

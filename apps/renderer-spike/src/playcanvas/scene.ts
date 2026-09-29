import {
  Application,
  Asset,
  Color,
  Entity,
  FOG_EXP2,
  FILLMODE_NONE,
  PROJECTION_ORTHOGRAPHIC,
  createCylinder,
  MeshInstance,
  Quat,
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
  torchPosition,
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
  const artBakeMode = new URLSearchParams(location.search).get('art-bake') === '1';
  const app = new Application(canvas, {
    graphicsDeviceOptions: {
      antialias: scenario.quality.antialias,
      ...(artBakeMode ? { alpha: true, preserveDrawingBuffer: true } : {}),
    },
  });
  metrics.attachRendererContext();
  app.setCanvasFillMode(FILLMODE_NONE, scenario.canvas.width, scenario.canvas.height);
  app.setCanvasResolution(RESOLUTION_FIXED, scenario.canvas.width, scenario.canvas.height);
  app.resizeCanvas(scenario.canvas.width, scenario.canvas.height);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  app.scene.ambientLight = new Color(
    scenario.lighting.day.ambient,
    scenario.lighting.day.ambient,
    scenario.lighting.day.ambient,
  );
  app.scene.fog.type = FOG_EXP2;
  app.scene.fog.color = new Color().fromString(scenario.colors.fog);
  app.scene.fog.density = scenario.lighting.day.fog;

  const camera = new Entity('Tactical camera');
  camera.addComponent('camera', {
    clearColor: new Color(...scenario.colors.dayClear),
    fov: (scenario.camera.fovRadians * 180) / Math.PI,
  });
  camera.camera!.aspectRatio = scenario.canvas.width / scenario.canvas.height;
  if (artBakeMode) {
    camera.camera!.projection = PROJECTION_ORTHOGRAPHIC;
    camera.camera!.orthoHeight = 3.3;
  }
  camera.setPosition(scenario.camera.eye[0], scenario.camera.eye[1], scenario.camera.eye[2]);
  camera.lookAt(new Vec3(...scenario.camera.target));
  app.root.addChild(camera);
  const light = new Entity('Daylight');
  light.addComponent('light', {
    type: 'directional',
    intensity: scenario.lighting.day.key,
    color: new Color().fromString(scenario.colors.dayKey),
    castShadows: false,
  });
  light.setEulerAngles(45, 25, 0);
  app.root.addChild(light);
  const torch = new Entity('Torch light');
  torch.addComponent('light', {
    type: 'omni',
    intensity: 0,
    range: 8,
    color: new Color(...scenario.colors.torch),
  });
  torch.setPosition(torchPosition.x, torchPosition.y, torchPosition.z);
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
  const artBakeBindJointRotations = new Map<string, [number, number, number, number]>();
  const artBakeEquipmentEntities = new Map<string, Entity>();
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
    if (artBakeMode && actor.id === firstAttacker.id) {
      for (const jointName of ['upperarm.r', 'upperarm.l', 'upperleg.r', 'upperleg.l']) {
        const joint = root.findByName(jointName);
        if (!joint) throw new Error(`ART05 could not find animated joint ${jointName}`);
        const rotation = joint.getLocalRotation();
        artBakeBindJointRotations.set(jointName, [rotation.x, rotation.y, rotation.z, rotation.w]);
      }
    }
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
      if (artBakeMode && actor.id === firstAttacker.id) {
        item.name = `art-bake-${assetName}`;
        artBakeEquipmentEntities.set(assetName!, item);
      }
      joint.addChild(item);
      item.setLocalPosition(0, -0.15, 0.12);
      item.setLocalScale(0.42, 0.42, 0.42);
      if (assetName === 'sword_1handed') {
        const handRotation = joint.getRotation() as Quat;
        const bladeDown = new Quat().setFromEulerAngles(180, 0, 0);
        item.setLocalRotation(new Quat().mul2(new Quat().invert(handRotation), bladeDown));
        const handPosition = joint.getPosition();
        const actorPosition = root.getPosition();
        const sideX = handPosition.x - actorPosition.x;
        const sideZ = handPosition.z - actorPosition.z;
        const sideLength = Math.hypot(sideX, sideZ);
        const itemPosition = item.getPosition();
        if (sideLength > 1e-6) {
          item.setPosition(
            itemPosition.x + (sideX / sideLength) * 0.12,
            itemPosition.y,
            itemPosition.z + (sideZ / sideLength) * 0.12,
          );
        }
      }
    }
    root.anim!.playing = true;
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

  const artBakeActor = roots.get(firstAttacker.id)!;
  const originalArtMaterials = new Map<MeshInstance, StandardMaterial>();
  const artBakePassMaterials = new Map<MeshInstance, Map<'normal' | 'depth', StandardMaterial>>();
  if (artBakeMode) {
    for (const actor of actors) roots.get(actor.id)!.anim!.speed = 0;
    artBakeActor.setPosition(0, 0, 0);
    artBakeActor.anim!.baseLayer!.activeStateCurrentTime = 0;

    for (const mesh of actorMeshInstances.get(firstAttacker.id)!) {
      if (!(mesh.material instanceof StandardMaterial))
        throw new Error(`ART05 requires a standard material on ${mesh.node.name}`);
      originalArtMaterials.set(mesh, mesh.material);
    }
  }

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
  const signalPosition = hexToWorld(0, 2);
  const signalWoodMaterial = new StandardMaterial();
  signalWoodMaterial.diffuse = new Color(0.34, 0.23, 0.13);
  signalWoodMaterial.emissive = new Color(0.28, 0.19, 0.105);
  signalWoodMaterial.update();
  const signalClothMaterial = new StandardMaterial();
  signalClothMaterial.diffuse = new Color(0.72, 0.53, 0.26);
  signalClothMaterial.emissive = new Color(0.5, 0.36, 0.16);
  signalClothMaterial.update();
  const signalPole = new Entity('signal-pole');
  signalPole.addComponent('model', { type: 'box', material: signalWoodMaterial });
  signalPole.model!.castShadows = false;
  signalPole.model!.receiveShadows = false;
  signalPole.setPosition(signalPosition.x, 0.9, signalPosition.z);
  signalPole.setLocalScale(0.07, 1.8, 0.07);
  app.root.addChild(signalPole);
  const signalFlag = new Entity('signal-flag');
  signalFlag.addComponent('model', { type: 'box', material: signalClothMaterial });
  signalFlag.model!.castShadows = false;
  signalFlag.model!.receiveShadows = false;
  signalFlag.setPosition(signalPosition.x + 0.285, 1.65, signalPosition.z);
  signalFlag.setLocalScale(0.5, 0.3, 0.035);
  app.root.addChild(signalFlag);

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

  if (artBakeMode) {
    for (const child of app.root.children) {
      if (child !== camera && child !== light && child !== artBakeActor) child.enabled = false;
    }
    torch.enabled = false;
    camera.camera!.clearColor = new Color(0, 0, 0, 0);
    camera.camera!.nearClip = 0.1;
    camera.camera!.farClip = 32;
    camera.camera!.orthoHeight = 3.3;
    camera.lookAt(new Vec3(0, 1.2, 0));
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
  if (artBakeMode && gl.getContextAttributes()?.alpha !== true)
    throw new Error('ART05 requires a WebGL context with an alpha buffer.');
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
    if (artBakeMode) return;
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
    light.light!.color = new Color().fromString(
      preset === 'day' ? scenario.colors.dayKey : scenario.colors.nightKey,
    );
    torch.light!.intensity = preset === 'torch' ? scenario.lighting.torch.torch : 0;
    camera.camera!.clearColor = new Color(
      ...(preset === 'day' ? scenario.colors.dayClear : scenario.colors.nightClear),
    );
    app.scene.fog.color = new Color().fromString(scenario.colors.fog);
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
  if (artBakeMode) {
    const artBakeAnimation = artBakeActor.anim!;
    const artBakeLayer = artBakeAnimation.baseLayer!;
    artBakeAnimation.playing = true;
    artBakeAnimation.speed = 1;
    const transitionDeadline = performance.now() + 3000;
    while (
      (artBakeLayer.activeState !== 'Idle_A' || artBakeLayer.transitioning) &&
      performance.now() < transitionDeadline
    ) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    if (artBakeLayer.activeState !== 'Idle_A' || artBakeLayer.transitioning)
      throw new Error('ART05 could not enter the requested Idle_A animation state.');
    artBakeAnimation.speed = 0;
    artBakeLayer.playing = false;
    artBakeLayer.activeStateCurrentTime = 0;
    artBakeLayer.playing = true;
    await new Promise<void>((resolve) => app.once('postrender', () => resolve()));

    const changedJointNames = [...artBakeBindJointRotations].flatMap(([jointName, bind]) => {
      const rotation = artBakeActor.findByName(jointName)!.getLocalRotation();
      const sampled = [rotation.x, rotation.y, rotation.z, rotation.w] as const;
      const dot = Math.abs(
        bind[0] * sampled[0] + bind[1] * sampled[1] + bind[2] * sampled[2] + bind[3] * sampled[3],
      );
      return 1 - dot > 1e-6 ? [jointName] : [];
    });
    if (!artBakeAnimation.playing || !changedJointNames.length)
      throw new Error(
        'ART05 Idle_A sample did not change a non-root joint while anim.playing was enabled.',
      );

    const characterRotation = artBakeActor.getRotation() as Quat;
    const bladeDown = new Quat().setFromEulerAngles(180, 0, 0);
    for (const [assetName, jointName, localOrientation] of [
      ['sword_1handed', 'handslot.r', bladeDown],
      ['shield_round', 'handslot.l', new Quat()],
    ] as const) {
      const item = artBakeEquipmentEntities.get(assetName);
      const joint = artBakeActor.findByName(jointName);
      if (!item || !joint)
        throw new Error(`ART05 could not calibrate ${assetName} against sampled ${jointName}`);
      const targetWorldRotation = new Quat().mul2(characterRotation, localOrientation);
      const sampledSocketRotation = joint.getRotation() as Quat;
      item.setLocalRotation(
        new Quat().mul2(new Quat().invert(sampledSocketRotation), targetWorldRotation),
      );
    }

    const setPass = (pass: 'color' | 'normal' | 'depth') => {
      for (const [mesh, original] of originalArtMaterials) {
        if (pass === 'color') {
          mesh.material = original;
          continue;
        }
        let materials = artBakePassMaterials.get(mesh);
        if (!materials) {
          materials = new Map();
          artBakePassMaterials.set(mesh, materials);
        }
        let material = materials.get(pass);
        if (!material) {
          material = original.clone();
          const chunks = material.getShaderChunks();
          chunks.set(
            'litUserDeclarationPS',
            pass === 'depth' ? 'uniform vec3 bakeCameraPosition;' : '',
          );
          chunks.set(
            'outputPS',
            pass === 'normal'
              ? 'gl_FragColor.rgb = normalize(vNormalW) * 0.5 + 0.5;'
              : `float metricDepth = clamp(distance(vPositionW, bakeCameraPosition) / 64.0, 0.0, 1.0);\nint packedDepth = int(metricDepth * 16777215.0 + 0.5);\ngl_FragColor.rgb = vec3(float((packedDepth >> 16) & 255), float((packedDepth >> 8) & 255), float(packedDepth & 255)) / 255.0;`,
          );
          material.update();
          materials.set(pass, material);
        }
        if (pass === 'depth') {
          const position = camera.getPosition();
          material.setParameter('bakeCameraPosition', [position.x, position.y, position.z]);
        }
        mesh.material = material;
      }
    };

    const bakeController = {
      setEquipmentVisible(name: string, visible: boolean) {
        const item = artBakeEquipmentEntities.get(name);
        if (!item) throw new Error(`ART05 has no equipped ${name} attachment`);
        item.enabled = visible;
      },
      async render(direction: number, pass: 'color' | 'normal' | 'depth') {
        if (!Number.isInteger(direction) || direction < 0 || direction > 7)
          throw new Error('ART05 direction must be an integer from 0 through 7');
        const angle = (direction * Math.PI) / 4;
        camera.setPosition(Math.sin(angle) * 8, 3, Math.cos(angle) * 8);
        camera.lookAt(new Vec3(0, 1.2, 0));
        setPass(pass);
        await new Promise<void>((resolve) => app.once('postrender', () => resolve()));
        const dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl.startsWith('data:image/png;base64,'))
          throw new Error('ART05 could not read the preserved WebGL canvas');
        const rightSlot = artBakeActor.findByName('handslot.r');
        const leftSlot = artBakeActor.findByName('handslot.l');
        const equipment = [
          ...(rightSlot?.children.map((child) => child.name) ?? []),
          ...(leftSlot?.children.map((child) => child.name) ?? []),
        ].filter((name) => name.startsWith('art-bake-'));
        const attachmentGeometry = [...artBakeEquipmentEntities].map(([name, entity]) => {
          const position = entity.getPosition();
          const scale = entity.getLocalScale();
          const meshInstances = entity
            .findComponents('render')
            .flatMap((component) => (component as RenderComponent).meshInstances);
          const min = new Vec3(
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY,
          );
          const max = new Vec3(
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
          );
          for (const mesh of meshInstances) {
            const boundsMin = mesh.aabb.getMin();
            const boundsMax = mesh.aabb.getMax();
            min.min(boundsMin);
            max.max(boundsMax);
          }
          return {
            name,
            localScale: [scale.x, scale.y, scale.z],
            worldPosition: [position.x, position.y, position.z],
            worldBounds: meshInstances.length
              ? {
                  min: [min.x, min.y, min.z],
                  max: [max.x, max.y, max.z],
                  meshCount: meshInstances.length,
                }
              : null,
          };
        });
        const attachmentMeshes = new Set(
          [...artBakeEquipmentEntities.values()].flatMap((entity) =>
            entity
              .findComponents('render')
              .flatMap((component) => (component as RenderComponent).meshInstances),
          ),
        );
        const characterMeshes = (actorMeshInstances.get(firstAttacker.id) ?? []).filter(
          (mesh) => !attachmentMeshes.has(mesh),
        );
        const characterMin = new Vec3(
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
        );
        const characterMax = new Vec3(
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
        );
        for (const mesh of characterMeshes) {
          characterMin.min(mesh.aabb.getMin());
          characterMax.max(mesh.aabb.getMax());
        }
        const characterWorldBounds = characterMeshes.length
          ? {
              min: [characterMin.x, characterMin.y, characterMin.z],
              max: [characterMax.x, characterMax.y, characterMax.z],
              meshCount: characterMeshes.length,
            }
          : null;
        const origin = camera.camera!.worldToScreen(new Vec3(0, 0, 0));
        const clientRect = app.graphicsDevice.clientRect;
        return {
          png: dataUrl,
          originScreen: [
            (origin.x * canvas.width) / clientRect.width,
            (origin.y * canvas.height) / clientRect.height,
          ] as const,
          animation: {
            componentPlaying: artBakeAnimation.playing,
            clip: artBakeLayer.activeState,
            sampleSeconds: artBakeLayer.activeStateCurrentTime,
            changedJoints: changedJointNames,
          },
          equipment,
          attachmentGeometry,
          characterWorldBounds,
        };
      },
    };
    Object.assign(window, { __warwritArtBake: bakeController });
  }
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

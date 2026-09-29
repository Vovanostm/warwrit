/* global document, Image, window */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arguments_ = process.argv.slice(2);
const optionValue = (name) => {
  const prefix = `--${name}=`;
  const values = arguments_.filter((argument) => argument.startsWith(prefix));
  if (values.length > 1) throw new Error(`ART05 received ${name} more than once`);
  return values[0]?.slice(prefix.length);
};
const scoutMode = arguments_.includes('--scout');
const actorClass = optionValue('actor');
const clip = optionValue('clip');
const sampleSeconds = optionValue('sample-seconds');
if (
  arguments_.some(
    (argument) =>
      !['--scout', '--actor=', '--clip=', '--sample-seconds='].some(
        (option) => argument === option || argument.startsWith(option),
      ),
  )
) {
  throw new Error('ART05 received an unknown option');
}
if (scoutMode && (!actorClass || !clip || sampleSeconds === undefined))
  throw new Error('ART05 scout mode requires --actor, --clip and --sample-seconds');
if (!scoutMode && (actorClass || clip || sampleSeconds !== undefined))
  throw new Error('ART05 actor, clip and sample options require --scout');
if (scoutMode && !['Knight', 'Rogue', 'Barbarian'].includes(actorClass))
  throw new Error(`ART05 does not support actor ${actorClass}`);
if (scoutMode && !['Idle_A', 'Walking_A', 'Melee_1H_Attack_Chop', 'Hit_A'].includes(clip))
  throw new Error(`ART05 does not support animation ${clip}`);
if (scoutMode && (!Number.isFinite(Number(sampleSeconds)) || Number(sampleSeconds) < 0))
  throw new Error('ART05 sample seconds must be a finite nonnegative number');
const sampleToken = scoutMode ? String(Number(sampleSeconds)).replace('.', 'p') : null;
const actorToken = scoutMode ? actorClass.toLowerCase() : 'knight';
const clipToken = scoutMode ? clip.toLowerCase() : 'idle_a';
const outputDirectory = scoutMode
  ? resolve(appRoot, `public/art-pipeline/scout-b2/${actorToken}-${clipToken}-t${sampleToken}`)
  : resolve(appRoot, 'public/art-pipeline/knight-idle-8dir');
const url = new URL(
  process.env.WARWRIT_ART_BAKE_URL ?? 'http://127.0.0.1:5181/?engine=playcanvas&art-bake=1',
);
url.searchParams.set('engine', 'playcanvas');
url.searchParams.set('art-bake', '1');
if (scoutMode) {
  url.searchParams.set('art-actor', actorClass);
  url.searchParams.set('art-clip', clip);
  url.searchParams.set('art-sample-seconds', String(Number(sampleSeconds)));
}
const cliPath = process.env.WARWRIT_PLAYWRIGHT_CLI;

if (!cliPath) {
  throw new Error('Set WARWRIT_PLAYWRIGHT_CLI to the installed Playwright CLI entrypoint.');
}

const { chromium } = createRequire(resolve(cliPath))('playwright');
const actorAsset = scoutMode ? actorClass : 'Knight';
const equipmentAssets =
  actorAsset === 'Knight'
    ? ['sword_1handed', 'shield_round']
    : actorAsset === 'Rogue'
      ? ['dagger']
      : ['axe_1handed'];
const animationFile =
  scoutMode && clip === 'Walking_A'
    ? 'public/assets/animations/Rig_Medium_MovementBasic.glb'
    : scoutMode && clip === 'Melee_1H_Attack_Chop'
      ? 'public/assets/animations/Rig_Medium_CombatMelee.glb'
      : 'public/assets/animations/Rig_Medium_General.glb';
const sourceFiles = [
  `public/assets/characters/${actorAsset}.glb`,
  ...new Set(['public/assets/animations/Rig_Medium_General.glb', animationFile]),
  ...equipmentAssets.flatMap((name) => [
    `public/assets/accessories/${name}.gltf`,
    `public/assets/accessories/${name}.bin`,
  ]),
  `public/assets/accessories/${actorAsset.toLowerCase()}_texture.png`,
];
const licenseFiles = [
  'public/assets/License-Adventurers-CC0.txt',
  'public/assets/License-Character-Animations-CC0.txt',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashFiles = async (files) =>
  Promise.all(
    files.map(async (relativePath) => ({
      path: relativePath.replace('public/', ''),
      sha256: sha256(await readFile(resolve(appRoot, relativePath))),
    })),
  );

const outputParent = dirname(outputDirectory);
await mkdir(outputParent, { recursive: true });
const stageDirectory = await mkdtemp(resolve(outputParent, '.knight-idle-8dir-stage-'));
let profileDirectory;
let browser;
let backupDirectory;
let published = false;

try {
  profileDirectory = await mkdtemp(resolve(tmpdir(), 'warwrit-art-bake-'));
  browser = await chromium.launchPersistentContext(profileDirectory, {
    headless: false,
    executablePath:
      process.env.WARWRIT_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    viewport: { width: 1600, height: 1000 },
  });
  const page = browser.pages()[0] ?? (await browser.newPage());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && new URL(response.url()).pathname !== '/favicon.ico')
      errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message
        .text()
        .startsWith('Failed to load resource: the server responded with a status of 404')
    )
      errors.push(message.text());
  });
  const response = await page.goto(url.href, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`ART05 page returned HTTP ${response?.status() ?? 'none'}`);
  await page.waitForFunction(() => Boolean(window.__warwritArtBake), null, { timeout: 30_000 });

  const outputs = [];
  const frameCount = 8;
  const frameSize = 512;
  const captureStartedAt = performance.now();
  let groundedPivot = null;
  let sourceCrop = null;
  let sampledAnimation = null;
  let equippedItems = null;
  let attachmentGeometry = null;
  let characterWorldBounds = null;
  for (let direction = 0; direction < frameCount; direction++) {
    for (const pass of ['color', 'normal', 'depth']) {
      const capture = await page.evaluate(
        async ({ direction, pass, frameSize }) => {
          const inspectPixels = (pixels) => {
            let coveredPixels = 0;
            let partialAlphaPixels = 0;
            let left = frameSize;
            let top = frameSize;
            let right = -1;
            let bottom = -1;
            for (let y = 0; y < frameSize; y++) {
              for (let x = 0; x < frameSize; x++) {
                const alpha = pixels[(y * frameSize + x) * 4 + 3];
                if (alpha > 0) {
                  coveredPixels++;
                  left = Math.min(left, x);
                  top = Math.min(top, y);
                  right = Math.max(right, x);
                  bottom = Math.max(bottom, y);
                }
                if (alpha > 0 && alpha < 255) partialAlphaPixels++;
              }
            }
            return {
              coveredPixels,
              partialAlphaPixels,
              alphaBounds: right < 0 ? null : { left, top, right, bottom },
              cornerAlpha: [
                pixels[3],
                pixels[(frameSize - 1) * 4 + 3],
                pixels[(frameSize - 1) * frameSize * 4 + 3],
                pixels[(frameSize * frameSize - 1) * 4 + 3],
              ],
            };
          };
          const baker = window.__warwritArtBake;
          const rendered = await baker.render(direction, pass);
          const image = new Image();
          image.src = rendered.png;
          await image.decode();
          const square = document.createElement('canvas');
          square.width = frameSize;
          square.height = frameSize;
          const context = square.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Could not create ART05 crop canvas');
          const side = Math.min(image.width, image.height);
          const sourceX = Math.floor((image.width - side) / 2);
          const sourceY = Math.floor((image.height - side) / 2);
          context.imageSmoothingEnabled = pass !== 'depth';
          context.drawImage(image, sourceX, sourceY, side, side, 0, 0, frameSize, frameSize);
          const stats = inspectPixels(context.getImageData(0, 0, frameSize, frameSize).data);
          const originInFrame = [
            ((rendered.originScreen[0] - sourceX) / side) * frameSize,
            ((rendered.originScreen[1] - sourceY) / side) * frameSize,
          ];
          return {
            png: square.toDataURL('image/png'),
            ...stats,
            originInFrame,
            sourceCrop: { x: sourceX, y: sourceY, width: side, height: side },
            directionIndex: rendered.directionIndex,
            pass: rendered.pass,
            animation: rendered.animation,
            actor: rendered.actor,
            equipment: rendered.equipment,
            attachmentGeometry: rendered.attachmentGeometry,
            characterWorldBounds: rendered.characterWorldBounds,
          };
        },
        { direction, pass, frameSize },
      );

      const coverage = capture.coveredPixels / (frameSize * frameSize);
      if (coverage < 0.02 || coverage > 0.9)
        throw new Error(
          `${pass} direction ${direction} has invalid silhouette coverage: ${coverage}`,
        );
      if (
        !capture.alphaBounds ||
        capture.alphaBounds.left <= 0 ||
        capture.alphaBounds.top <= 0 ||
        capture.alphaBounds.right >= frameSize - 1 ||
        capture.alphaBounds.bottom >= frameSize - 1
      ) {
        throw new Error(`${pass} direction ${direction} is empty or clipped at the frame edge`);
      }
      if (capture.cornerAlpha.some((alpha) => alpha !== 0))
        throw new Error(`${pass} direction ${direction} has an opaque background corner`);
      if (capture.partialAlphaPixels === 0)
        throw new Error(`${pass} direction ${direction} has no antialiased alpha edge`);
      const expectedClip = scoutMode ? clip : 'Idle_A';
      const expectedSample = scoutMode ? Number(sampleSeconds) : 0;
      const expectedActorId = `red-${actorToken}-1`;
      const expectedLoop = expectedClip === 'Idle_A' || expectedClip === 'Walking_A';
      if (
        capture.directionIndex !== direction ||
        capture.pass !== pass ||
        capture.actor?.id !== expectedActorId ||
        capture.actor?.classId !== actorAsset ||
        !capture.animation.componentPlaying ||
        capture.animation.clip !== expectedClip ||
        Math.abs(capture.animation.sampleSeconds - expectedSample) > 1e-6 ||
        capture.animation.loop !== expectedLoop ||
        capture.animation.changedJoints.length === 0
      ) {
        throw new Error(
          `Direction ${direction} did not capture the evaluated ${expectedClip} sample`,
        );
      }
      const expectedEquipment = equipmentAssets.map((name) => `art-bake-${name}`);
      if (
        expectedEquipment.length !== capture.equipment.length ||
        expectedEquipment.some((name) => !capture.equipment.includes(name))
      )
        throw new Error(
          `Direction ${direction} has an incomplete ${actorAsset} equipment attachment set`,
        );

      if (pass === 'color') {
        const candidatePivot = capture.originInFrame;
        if (!sourceCrop) sourceCrop = capture.sourceCrop;
        if (!groundedPivot) groundedPivot = candidatePivot;
        else if (
          Math.hypot(candidatePivot[0] - groundedPivot[0], candidatePivot[1] - groundedPivot[1]) > 1
        ) {
          throw new Error(`Ground-origin projection changed across direction ${direction}`);
        }
        sampledAnimation = capture.animation;
        equippedItems = capture.equipment.filter((name) => expectedEquipment.includes(name));
        if (direction === 0) {
          attachmentGeometry = capture.attachmentGeometry;
          characterWorldBounds = capture.characterWorldBounds;
        }
      }
      const png = Buffer.from(capture.png.slice('data:image/png;base64,'.length), 'base64');
      const filename = scoutMode
        ? `${actorToken}-${clipToken}-t${sampleToken}-d${String(direction).padStart(2, '0')}-${pass}.png`
        : `knight-idle-d${String(direction).padStart(2, '0')}-${pass}.png`;
      await writeFile(resolve(stageDirectory, filename), png);
      const savedPng = await readFile(resolve(stageDirectory, filename));
      if (sha256(savedPng) !== sha256(png))
        throw new Error(`ART05 output failed its saved-byte hash check: ${filename}`);
      const savedStats = await page.evaluate(
        async ({ base64, frameSize }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = frameSize;
          canvas.height = frameSize;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Could not decode saved ART05 output');
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, frameSize, frameSize).data;
          const alpha = Array.from(
            { length: frameSize * frameSize },
            (_, index) => pixels[index * 4 + 3],
          );
          const coveredPixels = alpha.filter((value) => value > 0).length;
          const partialAlphaPixels = alpha.filter((value) => value > 0 && value < 255).length;
          return {
            coveredPixels,
            partialAlphaPixels,
            cornerAlpha: [
              alpha[0],
              alpha[frameSize - 1],
              alpha[(frameSize - 1) * frameSize],
              alpha.at(-1),
            ],
          };
        },
        { base64: savedPng.toString('base64'), frameSize },
      );
      if (
        savedStats.coveredPixels !== capture.coveredPixels ||
        savedStats.partialAlphaPixels !== capture.partialAlphaPixels ||
        savedStats.cornerAlpha.some((alpha) => alpha !== 0)
      ) {
        throw new Error(`Saved PNG pixels differ from validated capture: ${filename}`);
      }
      outputs.push({
        file: filename,
        pass,
        directionIndex: direction,
        yawDegrees: direction * 45,
        width: frameSize,
        height: frameSize,
        coveredPixels: capture.coveredPixels,
        partialAlphaPixels: capture.partialAlphaPixels,
        alphaBounds: capture.alphaBounds,
        sha256: sha256(png),
        bytes: png.byteLength,
      });
    }
  }

  if (errors.length) throw new Error(`Browser errors during bake: ${errors.join('\n')}`);
  const manifest = {
    schemaVersion: 1,
    bake: scoutMode ? 'playcanvas-2.22.4-art05-b2-scout' : 'playcanvas-2.22.4-art05-a',
    actor: {
      id: scoutMode ? `red-${actorToken}-1` : 'red-knight-1',
      classId: actorAsset,
      equipment: equipmentAssets,
    },
    animation: {
      clip: scoutMode ? clip : 'Idle_A',
      sampleSeconds: scoutMode ? Number(sampleSeconds) : 0,
      durationSeconds: sampledAnimation.durationSeconds,
      loop: scoutMode ? sampledAnimation.loop : true,
    },
    capture: {
      projection: 'orthographic',
      directions: frameCount,
      yawDegrees: Array.from({ length: frameCount }, (_, index) => index * 45),
      sourceSize: [1600, 900],
      outputSize: [frameSize, frameSize],
      measuredCaptureMilliseconds: performance.now() - captureStartedAt,
      sourceCrop,
      pivot: {
        x: groundedPivot[0] / frameSize,
        y: 1 - groundedPivot[1] / frameSize,
        origin: 'projected world-space actor root at [0, 0, 0]',
        normalizedFrom: 'bottom-left',
      },
      alpha: 'WebGL alpha context; transparent background; saved PNG corners and coverage verified',
      animationProof: {
        componentPlayingAtCapture: sampledAnimation.componentPlaying,
        clip: sampledAnimation.clip,
        sampleSeconds: sampledAnimation.sampleSeconds,
        changedNonRootJoints: sampledAnimation.changedJoints,
        equippedItems,
      },
      geometryProof: {
        directionIndex: 0,
        characterWorldBounds,
        attachments: attachmentGeometry,
      },
      normal: 'world-space skinned surface normal encoded as RGB = normal * 0.5 + 0.5',
      depth: {
        convention: 'linear Euclidean metric distance from camera origin in meters',
        maximumMeters: 64,
        encoding: 'unsigned 24-bit big-endian RGB, scaled over [0, 64] meters',
        cropSampling: 'nearest-neighbor to preserve packed RGB values',
        clearPixels: 'alpha is zero',
      },
    },
    licenses: await hashFiles(licenseFiles),
    sourceAssets: await hashFiles(sourceFiles),
    outputs,
  };
  const manifestPath = resolve(stageDirectory, 'manifest.json');
  const prettierOptions =
    (await prettier.resolveConfig(resolve(outputDirectory, 'manifest.json'))) ?? {};
  await writeFile(
    manifestPath,
    await prettier.format(`${JSON.stringify(manifest, null, 2)}\n`, {
      ...prettierOptions,
      parser: 'json',
    }),
  );

  let hadOutput = true;
  try {
    await stat(outputDirectory);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    hadOutput = false;
  }
  if (hadOutput) {
    backupDirectory = await mkdtemp(resolve(outputParent, '.knight-idle-8dir-backup-'));
    await rm(backupDirectory, { recursive: true, force: true });
    await rename(outputDirectory, backupDirectory);
  }
  try {
    await rename(stageDirectory, outputDirectory);
    published = true;
  } catch (error) {
    if (backupDirectory) {
      await rename(backupDirectory, outputDirectory);
      backupDirectory = undefined;
    }
    throw error;
  }
  if (backupDirectory) {
    try {
      await rm(backupDirectory, { recursive: true, force: true });
      backupDirectory = undefined;
    } catch (error) {
      console.warn(`ART05 kept prior output backup at ${backupDirectory}: ${error.message}`);
    }
  }
  console.log(
    `${scoutMode ? 'ART05 scout' : 'ART05-A'} baked ${outputs.length} verified PNG outputs to ${outputDirectory}`,
  );
} finally {
  try {
    await browser?.close();
  } catch (error) {
    console.warn(`ART05 browser cleanup failed: ${error.message}`);
  }
  if (profileDirectory) {
    try {
      await rm(profileDirectory, { recursive: true, force: true });
    } catch (error) {
      console.warn(`ART05 profile cleanup failed at ${profileDirectory}: ${error.message}`);
    }
  }
  if (!published) {
    try {
      await rm(stageDirectory, { recursive: true, force: true });
    } catch (error) {
      console.warn(`ART05 stage cleanup failed at ${stageDirectory}: ${error.message}`);
    }
  }
}

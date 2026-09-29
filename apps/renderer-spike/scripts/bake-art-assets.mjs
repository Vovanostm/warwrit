/* global document, Image, window */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(appRoot, 'public/art-pipeline/knight-idle-8dir');
const url =
  process.env.WARWRIT_ART_BAKE_URL ?? 'http://127.0.0.1:5181/?engine=playcanvas&art-bake=1';
const cliPath = process.env.WARWRIT_PLAYWRIGHT_CLI;

if (!cliPath) {
  throw new Error('Set WARWRIT_PLAYWRIGHT_CLI to the installed Playwright CLI entrypoint.');
}

const { chromium } = createRequire(resolve(cliPath))('playwright');
const sourceFiles = [
  'public/assets/characters/Knight.glb',
  'public/assets/animations/Rig_Medium_General.glb',
  'public/assets/accessories/sword_1handed.gltf',
  'public/assets/accessories/sword_1handed.bin',
  'public/assets/accessories/shield_round.gltf',
  'public/assets/accessories/shield_round.bin',
  'public/assets/accessories/knight_texture.png',
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
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`ART05 page returned HTTP ${response?.status() ?? 'none'}`);
  await page.waitForFunction(() => Boolean(window.__warwritArtBake), null, { timeout: 30_000 });

  const outputs = [];
  const frameCount = 8;
  const frameSize = 512;
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
            animation: rendered.animation,
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
      if (
        !capture.animation.componentPlaying ||
        capture.animation.clip !== 'Idle_A' ||
        Math.abs(capture.animation.sampleSeconds) > 1e-6 ||
        capture.animation.changedJoints.length === 0
      ) {
        throw new Error(`Direction ${direction} did not capture the evaluated Idle_A sample`);
      }
      const expectedEquipment = ['art-bake-sword_1handed', 'art-bake-shield_round'];
      if (expectedEquipment.some((name) => !capture.equipment.includes(name)))
        throw new Error(
          `Direction ${direction} is missing equipped sword or shield attachment proof`,
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
      const filename = `knight-idle-d${String(direction).padStart(2, '0')}-${pass}.png`;
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
      });
    }
  }

  if (errors.length) throw new Error(`Browser errors during bake: ${errors.join('\n')}`);
  const manifest = {
    schemaVersion: 1,
    bake: 'playcanvas-2.22.4-art05-a',
    actor: { id: 'red-knight-1', classId: 'Knight', equipment: ['sword_1handed', 'shield_round'] },
    animation: { clip: 'Idle_A', sampleSeconds: 0, loop: true },
    capture: {
      projection: 'orthographic',
      directions: frameCount,
      yawDegrees: Array.from({ length: frameCount }, (_, index) => index * 45),
      sourceSize: [1600, 900],
      outputSize: [frameSize, frameSize],
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
  await writeFile(
    resolve(stageDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
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
  console.log(`ART05-A baked ${outputs.length} verified PNG outputs to ${outputDirectory}`);
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

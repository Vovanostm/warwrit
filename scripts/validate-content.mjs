import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const assetsRoot = resolve(root, 'assets');
const failures = [];

async function walk(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute, extension)));
    } else if (extname(entry.name) === extension) {
      files.push(absolute);
    }
  }

  return files;
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function safeAssetPath(path) {
  const absolute = resolve(root, path);
  const pathWithinAssets = relative(assetsRoot, absolute);
  return (
    pathWithinAssets !== '' &&
    pathWithinAssets !== '..' &&
    !pathWithinAssets.startsWith(`..${sep}`) &&
    !isAbsolute(pathWithinAssets)
  );
}

const pathSafetyProbes = [
  ['assets/example.glb', true],
  ['assets/nested/example.glb', true],
  ['assets/../package.json', false],
  ['assets/nested/../../package.json', false],
  ['../outside.glb', false],
];
for (const [candidate, expected] of pathSafetyProbes) {
  if (safeAssetPath(candidate) !== expected) {
    failures.push(`Asset path validator contract failed for ${candidate}.`);
  }
}

const manifestPath = join(root, 'assets', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.schemaVersion !== 1) {
  failures.push('assets/manifest.json must use schemaVersion 1.');
}
if (!Array.isArray(manifest.assets)) {
  failures.push('assets/manifest.json assets must be an array.');
}

const assetIds = new Set();
for (const asset of manifest.assets ?? []) {
  if (typeof asset.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/u.test(asset.id)) {
    failures.push(`Invalid asset id: ${String(asset.id)}`);
    continue;
  }
  if (assetIds.has(asset.id)) {
    failures.push(`Duplicate asset id: ${asset.id}`);
  }
  assetIds.add(asset.id);

  if (
    typeof asset.path !== 'string' ||
    !asset.path.startsWith('assets/') ||
    asset.path.includes('\\') ||
    !safeAssetPath(asset.path)
  ) {
    failures.push(`Invalid asset path for ${asset.id}: ${String(asset.path)}`);
    continue;
  }

  const absolute = resolve(root, asset.path);
  if (!(await fileExists(absolute))) {
    failures.push(`Missing asset file for ${asset.id}: ${asset.path}`);
    continue;
  }

  if (asset.sha256 !== undefined) {
    const digest = createHash('sha256')
      .update(await readFile(absolute))
      .digest('hex');
    if (digest !== asset.sha256) {
      failures.push(`SHA-256 mismatch for ${asset.id}.`);
    }
  }
}

const contentFiles = await walk(join(root, 'content'), '.json');
const contentIds = new Set();
for (const file of contentFiles) {
  const document = JSON.parse(await readFile(file, 'utf8'));
  if (!Number.isInteger(document.schemaVersion) || document.schemaVersion < 1) {
    failures.push(`${relative(root, file)} has no positive integer schemaVersion.`);
  }
  if (typeof document.id !== 'string' || document.id.length === 0) {
    failures.push(`${relative(root, file)} has no id.`);
  } else if (contentIds.has(document.id)) {
    failures.push(`Duplicate content id: ${document.id}`);
  } else {
    contentIds.add(document.id);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`content: ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      assets: assetIds.size,
      contentDocuments: contentIds.size,
      event: 'content.validate',
      status: 'ok',
    }),
  );
}

// Optional local evidence collection; never imported by the normal game runtime.
import { Session } from 'node:inspector/promises';
import { writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const destination = process.env.WORLD_LAB_RUNTIME_COVERAGE;
if (!destination || process.env.WORLD_LAB !== '1' || process.env.NODE_ENV === 'production')
  throw Error('Explicit development lab coverage required');
const root = pathToFileURL(`${process.cwd()}/`).href;
const frozenBeforeMs = Date.now();
// An existing report must never stand in for a failed new capture.
await writeFile(destination, '', { flag: 'wx' });
const session = new Session();
session.connect();
const scripts = new Map();
let captured = false;
let activeDump;
session.on('Debugger.scriptParsed', ({ params }) => scripts.set(params.scriptId, params));
await session.post('Debugger.enable');
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

async function sourceFor(coverage) {
  const metadata = scripts.get(coverage.scriptId);
  const { scriptSource } = await session.post('Debugger.getScriptSource', {
    scriptId: coverage.scriptId,
  });
  return { ...coverage, text: scriptSource, sourceMapURL: metadata?.sourceMapURL, frozenBeforeMs };
}
async function captureOnce() {
  const { result } = await session.post('Profiler.takePreciseCoverage');
  const owned = result.filter(
    (entry) => entry.url.startsWith(root) && !entry.url.includes('/node_modules/'),
  );
  const entries = await Promise.all(owned.map(sourceFor));
  const temporary = `${destination}.${process.pid}.partial`;
  await writeFile(temporary, JSON.stringify({ entries }));
  await rename(temporary, destination);
  captured = true;
}
function dump() {
  if (captured) return Promise.resolve();
  activeDump ??= captureOnce().finally(() => {
    activeDump = undefined;
  });
  return activeDump;
}
process.on('SIGUSR2', () => {
  void dump().catch((error) => process.stderr.write(`Coverage capture failed: ${String(error)}\n`));
});
process.once('beforeExit', () => {
  void dump().catch((error) => process.stderr.write(`Coverage capture failed: ${String(error)}\n`));
});

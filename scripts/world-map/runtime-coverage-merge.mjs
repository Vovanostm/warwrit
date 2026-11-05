// Merge measured engine coverage only when its mapped source still matches disk.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { convert } from 'ast-v8-to-istanbul';
import { parseAstAsync } from 'vite';
import istanbul from 'istanbul-lib-coverage';
import ts from 'typescript';

const [runtimePath, targetPath] = process.argv.slice(2);
if (!runtimePath || !targetPath)
  throw Error('Usage: runtime-coverage-merge runtime.json coverage.json');
const root = `${process.cwd()}/`;
const input = JSON.parse(await readFile(runtimePath, 'utf8'));
const initial = JSON.parse(await readFile(targetPath, 'utf8'));
await finiteCoordinates(initial);
const target = istanbul.createCoverageMap(initial);

// The mapper uses Infinity for end-of-line; JSON would turn it into null.
// Resolve that sentinel to the verified source line, without changing counters.
function resolveEndColumns(value, lines) {
  if (!value || typeof value !== 'object') return;
  const end = value.end;
  if (end && (end.column === Infinity || end.column === null)) {
    if (typeof lines[end.line - 1] !== 'string') throw Error('Invalid coverage end line');
    end.column = lines[end.line - 1].length;
  }
  for (const child of Object.values(value)) resolveEndColumns(child, lines);
}

function callbackStartKey(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${line + 1}:${character}`;
}

function isUseCallbackCall(node) {
  if (!ts.isCallExpression(node) || node.arguments.length === 0) return false;
  const callee = node.expression;
  return (
    (ts.isIdentifier(callee) && callee.text === 'useCallback') ||
    (ts.isPropertyAccessExpression(callee) && callee.name.text === 'useCallback')
  );
}

function useCallbackBindingNames(path, source) {
  if (!source.includes('useCallback')) return new Map();
  const scriptKind = /\.(?:tsx|jsx)$/iu.test(path)
    ? ts.ScriptKind.TSX
    : /\.(?:ts|mts|cts)$/iu.test(path)
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind);
  const bindings = new Map();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isUseCallbackCall(node.initializer)
    ) {
      const callback = node.initializer.arguments[0];
      if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
        bindings.set(callbackStartKey(sourceFile, callback), node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return bindings;
}

function normalizeBoundCallbackNames(file, path, source) {
  if (!file.fnMap || !source.includes('useCallback')) return;
  const bindings = useCallbackBindingNames(path, source);
  for (const fn of Object.values(file.fnMap)) {
    if (!/^\(anonymous_\d+\)$/u.test(fn.name)) continue;
    const name = bindings.get(`${fn.decl.start.line}:${fn.decl.start.column}`);
    if (name) fn.name = name;
  }
}

async function finiteCoordinates(coverage) {
  for (const [path, file] of Object.entries(coverage)) {
    const source = await readFile(path, 'utf8');
    const lines = source.split('\n');
    normalizeBoundCallbackNames(file, path, source);
    resolveEndColumns(file, lines);
  }
}

// TS and compiled-JS maps can disagree on the body start of one declaration.
// Retain the first verified location and sum hits for that exact source identity.
function reconcileFunctions(coverage) {
  for (const file of Object.values(coverage)) {
    const declarations = new Map();
    for (const [id, fn] of Object.entries(file.fnMap)) {
      const key = JSON.stringify([fn.name, fn.decl.start.line, fn.decl.start.column]);
      const prior = declarations.get(key);
      if (prior === undefined) {
        declarations.set(key, id);
        continue;
      }
      file.f[prior] += file.f[id];
      delete file.f[id];
      delete file.fnMap[id];
    }
  }
}

function localUrl(value) {
  const url = new URL(value);
  if (url.protocol === 'file:') return url;
  if (
    !['http://127.0.0.1:5338', 'http://127.0.0.1:5326', 'http://127.0.0.1:5228'].includes(
      url.origin,
    )
  )
    throw Error('Foreign runtime coverage origin');
  const path = decodeURIComponent(url.pathname);
  if (path.startsWith(root)) return pathToFileURL(path);
  if (path.startsWith('/@fs/')) return pathToFileURL(path.slice(4));
  const clientRoot = url.origin === 'http://127.0.0.1:5228' ? resolve(root, 'apps/web') : root;
  return pathToFileURL(resolve(clientRoot, `.${path}`));
}
async function readMap(entry) {
  const marker = entry.text.match(/\/\/# sourceMappingURL=(\S+)/u)?.[1];
  const link = entry.sourceMapURL || marker;
  if (!link) return undefined;
  if (link.startsWith('data:')) return JSON.parse(Buffer.from(link.split(',')[1], 'base64'));
  const url = new URL(link, entry.url);
  return JSON.parse(await readFile(fileURLToPath(localUrl(url.href)), 'utf8'));
}
async function originalContent(content, source, frozenBeforeMs) {
  if (typeof content === 'string') return content;
  if (!Number.isFinite(frozenBeforeMs)) throw Error('Missing original source/freeze boundary');
  if ((await stat(source)).mtimeMs > frozenBeforeMs)
    throw Error(`Source changed after the measured process started: ${source}`);
  return readFile(source, 'utf8');
}
async function checkSources(map, base, frozenBeforeMs) {
  if (!map) return;
  map.sourcesContent ??= [];
  const sourceBase = map.sourceRoot
    ? new URL(`${map.sourceRoot.replace(/\/$/u, '')}/`, base)
    : new URL(base);
  for (const [index, source] of map.sources.entries()) {
    const url = localUrl(new URL(source, sourceBase).href);
    const path = fileURLToPath(url);
    if (!path.startsWith(root)) continue;
    const original = await originalContent(map.sourcesContent[index], path, frozenBeforeMs);
    if ((await readFile(path, 'utf8')) !== original)
      throw Error(`Stale runtime coverage source: ${path}`);
    map.sourcesContent[index] = original;
    map.sources[index] = url.href;
  }
  map.sourceRoot = '';
}
async function mergeEntry(entry) {
  const sourceMap = await readMap(entry);
  await checkSources(sourceMap, entry.url, entry.frozenBeforeMs);
  const url = localUrl(entry.url).href;
  if (!sourceMap && (await readFile(fileURLToPath(url), 'utf8')) !== entry.text)
    throw Error(`Stale runtime script: ${url}`);
  const converted = await convert({
    code: entry.text,
    ast: parseAstAsync(entry.text),
    wrapperLength: 0,
    coverage: { ...entry, url },
    sourceMap,
  });
  await finiteCoordinates(converted);
  target.merge(converted);
}
async function mergeReport(path) {
  const report = JSON.parse(await readFile(path, 'utf8'));
  const measuredAt = (await stat(path)).mtimeMs;
  for (const source of Object.keys(report)) {
    const counters = [
      ...Object.values(report[source].s),
      ...Object.values(report[source].f),
      ...Object.values(report[source].b).flat(),
    ];
    // Unexecuted-file metadata carries no measurements and can refer to old locations.
    if (!counters.some((count) => count > 0)) {
      delete report[source];
      continue;
    }
    if ((await stat(source)).mtimeMs > measuredAt) throw Error(`Stale SQL coverage: ${source}`);
  }
  await finiteCoordinates(report);
  target.merge(report);
}
for (const entry of input.entries) await mergeEntry({ ...entry, text: entry.text ?? entry.source });
for (const report of input.reports ?? []) await mergeReport(report);
const result = target.toJSON();
reconcileFunctions(result);
await writeFile(targetPath, `${JSON.stringify(result)}\n`);
process.stdout.write(`Merged ${input.entries.length} current runtime scripts\n`);

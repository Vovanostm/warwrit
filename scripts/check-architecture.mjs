import { builtinModules } from 'node:module';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const workspaceRoots = ['apps', 'packages'];
const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts'];
const builtinSet = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

const allowedWorkspaceDependencies = new Map([
  ['@warwrit/game-core', new Set()],
  ['@warwrit/protocol', new Set()],
  ['@warwrit/testkit', new Set(['@warwrit/game-core', '@warwrit/protocol'])],
  ['@warwrit/server', new Set(['@warwrit/game-core', '@warwrit/protocol'])],
  ['@warwrit/web', new Set(['@warwrit/protocol'])],
]);

const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (['dist', 'node_modules', 'coverage'].includes(entry.name)) {
      continue;
    }

    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
    } else if (sourceExtensions.includes(extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

function importsFrom(source) {
  const specifiers = new Set();
  const expressions = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];

  for (const expression of expressions) {
    for (const match of source.matchAll(expression)) {
      if (match[1]) {
        specifiers.add(match[1]);
      }
    }
  }

  return [...specifiers];
}

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function resolveRelativeImport(file, specifier) {
  const base = resolve(dirname(file), specifier);
  const sourceBase = /\.(?:c|m)?jsx?$/u.test(base) ? base.replace(/\.(?:c|m)?jsx?$/u, '') : base;
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${sourceBase}${extension}`),
    ...sourceExtensions.map((extension) => join(sourceBase, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function packageNameFromSpecifier(specifier) {
  if (!specifier.startsWith('@warwrit/')) {
    return undefined;
  }

  return specifier.split('/').slice(0, 2).join('/');
}

function detectCycle(graph, label) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(node) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      const cycle = [...stack.slice(start), node];
      failures.push(`${label} cycle: ${cycle.join(' -> ')}`);
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    stack.push(node);

    for (const dependency of graph.get(node) ?? []) {
      visit(dependency);
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    visit(node);
  }
}

const workspaces = [];
for (const workspaceRoot of workspaceRoots) {
  const directory = join(root, workspaceRoot);
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageRoot = join(directory, entry.name);
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    workspaces.push({
      name: manifest.name,
      root: packageRoot,
      manifest,
      sourceFiles: await walk(join(packageRoot, 'src')),
    });
  }
}

const names = new Set(workspaces.map((workspace) => workspace.name));
if (names.size !== workspaces.length) {
  failures.push('Workspace package names must be unique.');
}

const workspaceGraph = new Map();
const fileGraph = new Map();

for (const workspace of workspaces) {
  const declared = new Set([
    ...Object.keys(workspace.manifest.dependencies ?? {}),
    ...Object.keys(workspace.manifest.devDependencies ?? {}),
  ]);
  const declaredWorkspaceDependencies = new Set(
    [...declared].filter((dependency) => dependency.startsWith('@warwrit/')),
  );
  workspaceGraph.set(workspace.name, declaredWorkspaceDependencies);

  const allowed = allowedWorkspaceDependencies.get(workspace.name);
  if (!allowed) {
    failures.push(`No dependency policy exists for ${workspace.name}.`);
  } else {
    for (const dependency of declaredWorkspaceDependencies) {
      if (!allowed.has(dependency)) {
        failures.push(`${workspace.name} declares forbidden workspace dependency ${dependency}.`);
      }
    }
  }

  if (workspace.name === '@warwrit/game-core') {
    const runtimeDependencies = Object.keys(workspace.manifest.dependencies ?? {});
    if (runtimeDependencies.length > 0) {
      failures.push('@warwrit/game-core must have zero runtime dependencies.');
    }
  }

  for (const file of workspace.sourceFiles) {
    const isTestFile = /\.(?:test|spec)\.[cm]?tsx?$/u.test(file);
    const imports = importsFrom(await readFile(file, 'utf8'));
    const graphDependencies = new Set();
    fileGraph.set(file, graphDependencies);

    for (const specifier of imports) {
      const workspaceDependency = packageNameFromSpecifier(specifier);
      if (workspaceDependency) {
        if (!names.has(workspaceDependency)) {
          failures.push(
            `${relative(root, file)} imports unknown workspace package ${workspaceDependency}.`,
          );
        } else if (!declared.has(workspaceDependency)) {
          failures.push(
            `${relative(root, file)} imports undeclared package ${workspaceDependency}.`,
          );
        }

        if (specifier !== workspaceDependency) {
          failures.push(
            `${relative(root, file)} deep-imports ${specifier}; use the package export.`,
          );
        }

        if (workspaceDependency === '@warwrit/testkit' && !isTestFile) {
          failures.push(`${relative(root, file)} imports testkit from production source.`);
        }
      }

      if (workspace.name === '@warwrit/game-core' && !isTestFile) {
        const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
        if (!isRelative || builtinSet.has(specifier)) {
          failures.push(`game-core I/O/external import: ${relative(root, file)} -> ${specifier}`);
        }
      }

      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const resolved = await resolveRelativeImport(file, specifier);
        if (!resolved) {
          failures.push(`${relative(root, file)} has unresolved relative import ${specifier}.`);
        } else {
          graphDependencies.add(resolved);
        }
      }
    }
  }
}

detectCycle(workspaceGraph, 'Workspace');
detectCycle(fileGraph, 'Source file');

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`architecture: ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      event: 'architecture.check',
      files: fileGraph.size,
      status: 'ok',
      workspaces: workspaces.length,
    }),
  );
}

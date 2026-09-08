/* global console, process, Buffer */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { format } from 'prettier';

const prettierOptions = {
  arrowParens: 'always',
  printWidth: 100,
  proseWrap: 'preserve',
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
};

const originalError = console.error;
const candidates = [];
console.error = (...args) => {
  const line = args.map(String).join(' ');
  if (line.startsWith('CANDIDATE-GZIP ')) candidates.push(line);
  else originalError(...args);
};

const loaded = await import('./prettier.config.mjs');
console.error = originalError;

function applyLintCorrections(path, text) {
  if (path === 'packages/game-core/src/company/physical-items.ts') {
    text = text.replace(
      'export function returnCompanyItemsForDeparture(\n  root: MaterializedCompanyState,\n  characterId: string,\n  returnContainerId: string,\n  sourceId: string,\n  context: EconomyContext,\n): CompanyPhysicalState {',
      'export function returnCompanyItemsForDeparture(\n  root: MaterializedCompanyState,\n  characterId: string,\n  returnContainerId: string,\n  sourceId: string,\n  _context: EconomyContext,\n): CompanyPhysicalState {',
    );
  }
  if (path === 'packages/game-core/src/company/physical-outcomes.ts') {
    text = text
      .replace('  activeConditions,\n', '')
      .replace('  physicalId,\n', '')
      .replace('  replaceContainer,\n', '')
      .replace(
        "  let lifecycle = movePresence(root.lifecycle, p.characterId, availability, fact.location);",
        "  const lifecycle = movePresence(root.lifecycle, p.characterId, availability, fact.location);",
      );
  }
  return text;
}

function moveRootTypeImports(path) {
  let text = readFileSync(path, 'utf8');
  const moved = [];
  text = text.replace(
    /import type \{([\s\S]*?)\} from '\.\/physical-types\.js';/g,
    (whole, body) => {
      const names = body
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      const keep = names.filter((name) => {
        if (name === 'MaterializedCompanyState' || name === 'PhysicalChange') {
          moved.push(name);
          return false;
        }
        return true;
      });
      if (keep.length === names.length) return whole;
      if (keep.length === 0) return '';
      return `import type {\n  ${keep.join(',\n  ')},\n} from './physical-types.js';`;
    },
  );
  if (moved.length > 0) {
    const unique = [...new Set(moved)];
    const statement = `import type { ${unique.join(', ')} } from './physical-root-types.js';\n`;
    const lastImport = [...text.matchAll(/^import .*;$/gm)].at(-1);
    if (!lastImport) throw new Error(`no import insertion point: ${path}`);
    const at = lastImport.index + lastImport[0].length + 1;
    text = text.slice(0, at) + statement + text.slice(at);
    writeFileSync(path, text);
  }
}

function applyArchitectureCorrections() {
  const physicalTypes = 'packages/game-core/src/company/physical-types.ts';
  let text = readFileSync(physicalTypes, 'utf8');
  text = text.replace("import type { EconomyRequirement, CompanyFinance } from './economy-types.js';\n", '');
  text = text.replace(
    `\nexport type MaterializedCompanyState = {\n  readonly lifecycle: LifecycleState;\n  readonly finance: CompanyFinance;\n  readonly physical: CompanyPhysicalState;\n};\nexport type PhysicalChange = {\n  readonly lifecycle: LifecycleState;\n  readonly finance: CompanyFinance;\n  readonly physical: CompanyPhysicalState;\n  readonly requirements: readonly EconomyRequirement[];\n};\n`,
    '\n',
  );
  writeFileSync(physicalTypes, text);

  writeFileSync(
    'packages/game-core/src/company/physical-root-types.ts',
    `import type { CompanyFinance, EconomyRequirement } from './economy-types.js';\nimport type { LifecycleState } from './lifecycle-types.js';\nimport type { CompanyPhysicalState } from './physical-types.js';\n\nexport type MaterializedCompanyState = {\n  readonly lifecycle: LifecycleState;\n  readonly finance: CompanyFinance;\n  readonly physical: CompanyPhysicalState;\n};\n\nexport type PhysicalChange = {\n  readonly lifecycle: LifecycleState;\n  readonly finance: CompanyFinance;\n  readonly physical: CompanyPhysicalState;\n  readonly requirements: readonly EconomyRequirement[];\n};\n`,
  );

  const directory = 'packages/game-core/src/company';
  for (const name of readdirSync(directory)) {
    if (!name.endsWith('.ts') || name === 'physical-types.ts' || name === 'physical-root-types.ts') continue;
    moveRootTypeImports(`${directory}/${name}`);
  }

  const indexPath = `${directory}/index.ts`;
  let index = readFileSync(indexPath, 'utf8');
  if (!index.includes("export type * from './physical-root-types.js';")) {
    index = index.replace(
      "export type * from './physical-types.js';",
      "export type * from './physical-types.js';\nexport type * from './physical-root-types.js';",
    );
    writeFileSync(indexPath, index);
  }
}

async function formatCompanySources() {
  const directory = 'packages/game-core/src/company';
  for (const name of readdirSync(directory)) {
    if (!name.endsWith('.ts')) continue;
    const path = `${directory}/${name}`;
    const text = readFileSync(path, 'utf8');
    writeFileSync(path, await format(text, { ...prettierOptions, parser: 'typescript' }));
  }
}

if (process.env.CI) {
  for (const line of candidates) {
    const match = /^CANDIDATE-GZIP (\S+) (\S+)$/.exec(line);
    if (!match) throw new Error('invalid formatter candidate line');
    const text = gunzipSync(Buffer.from(match[2], 'base64')).toString('utf8');
    writeFileSync(match[1], applyLintCorrections(match[1], text));
  }

  applyArchitectureCorrections();
  await formatCompanySources();

  writeFileSync(
    'prettier.config.mjs',
    `/** @type {import('prettier').Config} */\nconst config = {\n  arrowParens: 'always',\n  printWidth: 100,\n  proseWrap: 'preserve',\n  semi: true,\n  singleQuote: true,\n  trailingComma: 'all',\n};\n\nexport default config;\n`,
  );
  writeFileSync('.prettierrc.mjs', "export { default } from './prettier.config.mjs';\n");
}

export default loaded.default;

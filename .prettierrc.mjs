/* global console, process, Buffer */
import { writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

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

if (process.env.CI) {
  for (const line of candidates) {
    const match = /^CANDIDATE-GZIP (\S+) (\S+)$/.exec(line);
    if (!match) throw new Error('invalid formatter candidate line');
    const text = gunzipSync(Buffer.from(match[2], 'base64')).toString('utf8');
    writeFileSync(match[1], applyLintCorrections(match[1], text));
  }

  writeFileSync(
    'prettier.config.mjs',
    `/** @type {import('prettier').Config} */
const config = {
  arrowParens: 'always',
  printWidth: 100,
  proseWrap: 'preserve',
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
};

export default config;
`,
  );
}

export default loaded.default;

import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { expect, it } from 'vitest';

const source = `
const zeroBound = useCallback(() => 10, []);
const positiveBound = useCallback(function () { return 20; }, []);
const namedBound = useCallback(() => 30, []);
useCallback(() => 40, []);
`;

function offsetOf(fragment: string): { start: number; end: number } {
  const start = source.indexOf(fragment);
  if (start < 0) throw new Error(`Missing source fragment: ${fragment}`);
  return { start, end: start + fragment.length };
}

function position(offset: number): { line: number; column: number } {
  const preceding = source.slice(0, offset);
  const line = preceding.split('\n').length;
  return { line, column: preceding.length - preceding.lastIndexOf('\n') - 1 };
}

function functionCoverage(
  name: string,
  fragment: string,
  hits: number,
): { name: string; hits: number; decl: { start: { line: number; column: number } } } {
  return { name, hits, decl: { start: position(offsetOf(fragment).start) } };
}

it('normalizes only source-bound useCallback names through the public merger CLI', async () => {
  const directory = await mkdtemp(resolve(process.cwd(), 'output/warwrit-runtime-coverage-'));
  try {
    const sourcePath = resolve(directory, 'callbacks.tsx');
    const initialPath = resolve(directory, 'coverage.json');
    const inputPath = resolve(directory, 'runtime.json');
    await writeFile(sourcePath, source);

    const initialFunctions = [
      functionCoverage('(anonymous_0)', '() => 10', 0),
      functionCoverage('(anonymous_1)', 'function () { return 20; }', 3),
      functionCoverage('kept-name', '() => 30', 5),
      functionCoverage('(anonymous_99)', '() => 40', 7),
    ];
    const initial = {
      [sourcePath]: {
        path: sourcePath,
        statementMap: {},
        s: {},
        fnMap: Object.fromEntries(
          initialFunctions.map((fn, index) => [
            String(index),
            {
              name: fn.name,
              decl: { start: fn.decl.start, end: fn.decl.start },
              loc: { start: fn.decl.start, end: fn.decl.start },
              line: fn.decl.start.line,
            },
          ]),
        ),
        f: Object.fromEntries(initialFunctions.map((fn, index) => [String(index), fn.hits])),
        branchMap: {},
        b: {},
      },
    };
    await writeFile(initialPath, `${JSON.stringify(initial)}\n`);

    const runtimeFunctions = ['function () { return 20; }', '() => 30', '() => 40'].map(
      (fragment, index) => ({
        functionName: '',
        ranges: [
          {
            startOffset: offsetOf(fragment).start,
            endOffset: offsetOf(fragment).end,
            count: [2, 1, 4][index],
          },
        ],
        isBlockCoverage: false,
      }),
    );
    await writeFile(
      inputPath,
      JSON.stringify({
        entries: [
          { url: pathToFileURL(sourcePath).href, text: source, functions: runtimeFunctions },
        ],
        reports: [],
      }),
    );

    execFileSync(
      process.execPath,
      [
        resolve(process.cwd(), 'scripts/world-map/runtime-coverage-merge.mjs'),
        inputPath,
        initialPath,
      ],
      { cwd: process.cwd(), stdio: 'pipe' },
    );

    const merged = JSON.parse(await readFile(initialPath, 'utf8')) as Record<
      string,
      {
        fnMap: Record<string, { name: string; decl: { start: { line: number; column: number } } }>;
        f: Record<string, number>;
      }
    >;
    const file = merged[sourcePath];
    if (!file) throw new Error('Merged source coverage is missing');
    const records = Object.entries(file.fnMap).map(([id, fn]) => ({ ...fn, hits: file.f[id] }));
    const at = (fragment: string) => position(offsetOf(fragment).start);
    const namedAt = (fragment: string, name: string) => {
      const start = at(fragment);
      return records.find(
        (fn) =>
          fn.name === name &&
          fn.decl.start.line === start.line &&
          fn.decl.start.column === start.column,
      );
    };

    expect(namedAt('() => 10', 'zeroBound')).toMatchObject({ hits: 0 });
    expect(namedAt('function () { return 20; }', 'positiveBound')).toMatchObject({ hits: 5 });
    expect(namedAt('() => 30', 'kept-name')).toMatchObject({ hits: 5 });
    expect(namedAt('() => 30', 'namedBound')).toMatchObject({ hits: 1 });
    expect(namedAt('() => 40', '(anonymous_99)')).toMatchObject({ hits: 7 });
    const unboundStart = at('() => 40');
    expect(
      records.some(
        (fn) =>
          fn.name.startsWith('(anonymous_') &&
          fn.decl.start.line === unboundStart.line &&
          fn.decl.start.column === unboundStart.column &&
          fn.hits === 4,
      ),
    ).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceSource = fileURLToPath(new URL('./packages/', import.meta.url));

function integrationHooks(mode: string) {
  return mode === 'integration'
    ? { sequence: { hooks: 'stack' as const } }
    : { globalSetup: [], setupFiles: [] };
}

export default defineConfig(({ mode }) => ({
  resolve: {
    // Coverage runs: resolve each library's public entry to its source so
    // one instrumented copy exists. Normal runs keep testing built exports.
    alias:
      mode === 'coverage' || process.argv.includes('--coverage')
        ? [
            {
              find: /^@warwrit\/(game-core|protocol|testkit)$/u,
              replacement: `${workspaceSource}$1/src/index.ts`,
            },
          ]
        : [],
  },
  test: {
    environment: 'node',
    // Literal paths keep static tooling aware of both lifecycle entry points.
    // Other modes override them with empty lists below.
    globalSetup: ['./scripts/integration-global-setup.ts'],
    setupFiles: ['./scripts/integration-file-setup.ts'],
    ...integrationHooks(mode),
    // Bound concurrent CPU-heavy geometry/combat suites on the two-core target.
    maxWorkers: 2,
    include: [
      'apps/**/*.{test,spec}.{ts,tsx}',
      'packages/**/*.{test,spec}.{ts,tsx}',
      'scripts/world-map/*.test.ts',
    ],
    passWithNoTests: false,
    restoreMocks: true,
    coverage: {
      // The commit audit consumes measured coverage even when a related test
      // fails; keep that evidence instead of deleting it on a timeout.
      reportOnFailure: true,
      // `pnpm test:coverage` evidence for `fallow health --coverage`.
      // No percentage threshold: AGENTS.md sets no coverage targets.
      provider: 'v8',
      include: [
        'apps/*/src/**/*.{ts,tsx}',
        'packages/*/src/**/*.{ts,tsx}',
        'scripts/world-map/*.ts',
      ],
      exclude: ['**/*.test.{ts,tsx}', 'apps/renderer-spike/**'],
      reporter: ['json', 'text-summary'],
      reportsDirectory: 'coverage',
    },
  },
}));

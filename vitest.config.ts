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
    // Coverage mode only: resolve each library's public entry to its source so
    // one instrumented copy exists. Normal runs keep testing built exports.
    alias:
      mode === 'coverage'
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
    include: ['apps/**/*.{test,spec}.{ts,tsx}', 'packages/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: false,
    restoreMocks: true,
    coverage: {
      // `pnpm test:coverage` evidence for `fallow health --coverage`.
      // No percentage threshold: AGENTS.md sets no coverage targets.
      provider: 'v8',
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', 'apps/renderer-spike/**'],
      reporter: ['json', 'text-summary'],
      reportsDirectory: 'coverage',
    },
  },
}));

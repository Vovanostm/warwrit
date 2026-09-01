import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const deterministicCoreGlobals = [
  ['process', 'Read process state only in infrastructure adapters.'],
  ['global', 'The deterministic core must not depend on Node.js global state.'],
  ['globalThis', 'The deterministic core must not access ambient global state.'],
  ['Buffer', 'Use serializable platform-neutral values in the deterministic core.'],
  ['console', 'Emit evidence through explicit domain events, not console I/O.'],
  ['require', 'Runtime module loading is forbidden in the deterministic core.'],
  ['module', 'Runtime module state is forbidden in the deterministic core.'],
  ['__dirname', 'Filesystem state is forbidden in the deterministic core.'],
  ['__filename', 'Filesystem state is forbidden in the deterministic core.'],
  ['window', 'Browser state belongs in an application adapter.'],
  ['document', 'DOM access belongs in the web application.'],
  ['navigator', 'Browser capabilities belong in the web application.'],
  ['location', 'Browser location belongs in the web application.'],
  ['fetch', 'Network access belongs in an infrastructure adapter.'],
  ['Request', 'Network contracts belong outside the deterministic core.'],
  ['Response', 'Network contracts belong outside the deterministic core.'],
  ['Headers', 'Network contracts belong outside the deterministic core.'],
  ['XMLHttpRequest', 'Network access belongs in an infrastructure adapter.'],
  ['WebSocket', 'Realtime transport belongs in an infrastructure adapter.'],
  ['EventSource', 'Realtime transport belongs in an infrastructure adapter.'],
  ['localStorage', 'Persistence belongs in an infrastructure adapter.'],
  ['sessionStorage', 'Persistence belongs in an infrastructure adapter.'],
  ['indexedDB', 'Persistence belongs in an infrastructure adapter.'],
  ['setTimeout', 'Time and scheduling must enter through explicit ports or commands.'],
  ['clearTimeout', 'Time and scheduling must enter through explicit ports or commands.'],
  ['setInterval', 'Time and scheduling must enter through explicit ports or commands.'],
  ['clearInterval', 'Time and scheduling must enter through explicit ports or commands.'],
  ['setImmediate', 'Scheduling must remain outside deterministic state transitions.'],
  ['clearImmediate', 'Scheduling must remain outside deterministic state transitions.'],
  ['queueMicrotask', 'Scheduling must remain outside deterministic state transitions.'],
  ['Date', 'Represent time as explicit command or clock values.'],
  ['performance', 'System clocks are forbidden in deterministic state transitions.'],
  ['crypto', 'Randomness and cryptography must enter through explicit ports.'],
  ['Intl', 'Locale-dependent behavior is forbidden in the deterministic core.'],
  ['Worker', 'Concurrency belongs outside the deterministic core.'],
  ['SharedWorker', 'Concurrency belongs outside the deterministic core.'],
  ['MessageChannel', 'Concurrency belongs outside the deterministic core.'],
  ['BroadcastChannel', 'Concurrency belongs outside the deterministic core.'],
  ['Atomics', 'Concurrent shared state is forbidden in the deterministic core.'],
  ['SharedArrayBuffer', 'Concurrent shared state is forbidden in the deterministic core.'],
  ['WeakRef', 'Garbage-collection timing is not deterministic.'],
  ['FinalizationRegistry', 'Garbage-collection timing is not deterministic.'],
].map(([name, message]) => ({ name, message }));

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/*.d.ts', 'artifacts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'error',
    },
  },
  {
    files: ['packages/game-core/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/game-core/src/**/*.test.ts',
      'packages/game-core/src/**/*.test.tsx',
      'packages/game-core/src/**/*.spec.ts',
      'packages/game-core/src/**/*.spec.tsx',
    ],
    rules: {
      'no-restricted-globals': ['error', ...deterministicCoreGlobals],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Inject a seeded random source into the deterministic core.',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.mjs', 'prettier.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },
);

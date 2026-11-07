import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Production distribution: existing Vite toolchain removes unreachable debug
// registrations and their executable modules; source/tsc builds remain for dev.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  define: { WARWRIT_PRODUCTION_BUILD: 'true' },
  ssr: { external: ['@warwrit/game-core', '@warwrit/protocol'] },
  build: {
    ssr: 'src/index.ts',
    target: 'node24',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        preserveModules: true,
        preserveModulesRoot: fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});

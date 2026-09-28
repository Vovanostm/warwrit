import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  const combatLabEnabled =
    process.env['VITE_COMBAT_LAB'] === '1' ||
    loadEnv(mode, workspaceRoot, 'VITE_')['VITE_COMBAT_LAB'] === '1';
  return {
    build: {
      sourcemap: true,
    },
    envDir: '../..',
    plugins: [react()],
    server: {
      port: 5173,
      ...(combatLabEnabled ? { host: '127.0.0.1', strictPort: true } : {}),
      proxy: {
        '/api': {
          target: combatLabEnabled ? 'http://127.0.0.1:3000' : 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/u, ''),
        },
      },
    },
  };
});

import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

function privateAtlasSource(): Plugin {
  return {
    name: 'private-authored-atlas',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        let path: string;
        try {
          path = decodeURIComponent((request.url ?? '').split('?')[0]!);
        } catch {
          response.writeHead(404).end();
          return;
        }
        if (
          path.includes('/assets/art/world/porechye-atlas-v1/') ||
          /\/scripts\/world-map\/(?:navigation-maps|navigation-lab|porechye-navigation|fog-design|world-lab)(?:[/.])/u.test(
            path,
          )
        ) {
          response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const settings = {
    ...loadEnv(mode, workspaceRoot, 'VITE_'),
    ...loadEnv(mode, workspaceRoot, 'WEB_'),
    ...loadEnv(mode, workspaceRoot, 'API_'),
    ...loadEnv(mode, workspaceRoot, 'ENCOUNTER_'),
  };
  const combatLabEnabled = settings['VITE_COMBAT_LAB'] === '1';
  const port = Number(settings['WEB_PORT'] ?? '5173');
  const apiTarget =
    settings['API_PROXY_TARGET'] ??
    (combatLabEnabled ? 'http://127.0.0.1:3000' : 'http://localhost:3000');
  const encounterRealtimeTarget =
    settings['ENCOUNTER_REALTIME_PROXY_TARGET'] ?? 'http://127.0.0.1:3110';
  return {
    build: {
      sourcemap: true,
    },
    envDir: '../..',
    plugins: [privateAtlasSource(), react()],
    server: {
      port,
      ...(combatLabEnabled || settings['WEB_PORT'] !== undefined
        ? { host: '127.0.0.1', strictPort: true }
        : {}),
      proxy: {
        '/auth/callback': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/u, ''),
        },
        '/colyseus': {
          target: encounterRealtimeTarget,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/colyseus/u, ''),
        },
      },
    },
  };
});

import { fileURLToPath } from 'node:url';
import { clientFileAccess } from '../vite-file-access.js';

const publicPaths = new Set([
  '/@vite/client',
  '/@vite/env',
  '/node_modules/vite/dist/client/env.mjs',
  '/assets/art/world/map-icons-v1/icons.svg',
  '/assets/art/world/fog-paper-v1/unknown-paper.png',
]);
const publicPatterns = [
  /^\/node_modules\/\.vite\/deps\/(?:@colyseus_sdk|chunk-[A-Z0-9]+)\.js$/u,
  /^\/node_modules\/\.pnpm\/vite@[^/]+\/node_modules\/vite\/dist\/client\/env\.mjs$/u,
  /^\/packages\/protocol\/dist\/[a-z0-9/-]+\.js$/u,
  /^\/scripts\/world-map\/(?:world-lab(?:-state)?|cartography-(?:view|reveal)|map-symbols|map-camera|map-camera-input|map-labels)\.(?:html|ts|css)$/u,
  /^\/scripts\/world-map\/fog-design\/(?:index.html|model.ts|view.ts|style.css)$/u,
];
function publicPathAllowed(path: string): boolean {
  if (path.includes('..') || path.includes('\\')) return false;
  return (
    path.startsWith('/world-lab-api/') ||
    path.startsWith('/world-lab-ws/') ||
    publicPaths.has(path) ||
    publicPatterns.some((pattern) => pattern.test(path))
  );
}

// The world client must not inherit Vite's repository-wide static-file access.
const publicWorldClient = clientFileAccess('world-lab-public-files', publicPathAllowed, (path) =>
  [
    '/assets/art/world/map-icons-v1/icons.svg',
    '/assets/art/world/fog-paper-v1/unknown-paper.png',
  ].includes(path)
    ? 'public, max-age=86400'
    : 'no-store',
);

// The same-origin laboratory has private ports and never proxies the campaign API.
export default {
  root: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [publicWorldClient],
  server: {
    host: '127.0.0.1',
    port: 5338,
    strictPort: true,
    proxy: {
      '/world-lab-api': {
        target: 'http://127.0.0.1:3038',
        changeOrigin: false,
        rewrite: (path: string) => path.replace(/^\/world-lab-api/u, ''),
      },
      '/world-lab-ws': {
        target: 'http://127.0.0.1:3039',
        ws: true,
        changeOrigin: false,
        rewrite: (path: string) => path.replace(/^\/world-lab-ws/u, ''),
      },
    },
  },
};

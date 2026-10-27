import { fileURLToPath } from 'node:url';

// The same-origin laboratory has private ports and never proxies the campaign API.
export default {
  root: fileURLToPath(new URL('../..', import.meta.url)),
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

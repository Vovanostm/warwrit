import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/u, ''),
      },
    },
  },
});

import type { Plugin } from 'vite';

/** Shared request decoding; each client origin owns its own file-access policy. */
export function clientFileAccess(
  name: string,
  allowed: (path: string) => boolean,
  cacheControl?: (path: string) => string,
): Plugin {
  return {
    name,
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
        if (!allowed(path)) {
          response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
          return;
        }
        if (cacheControl) response.setHeader('Cache-Control', cacheControl(path));
        next();
      });
    },
  };
}

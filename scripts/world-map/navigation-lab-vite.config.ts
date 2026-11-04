import { fileURLToPath } from 'node:url';

// Local authoring only: full atlas access stays off the private world/game origins.
export default {
  root: fileURLToPath(new URL('../..', import.meta.url)),
  server: { host: '127.0.0.1', port: 5326, strictPort: true },
};

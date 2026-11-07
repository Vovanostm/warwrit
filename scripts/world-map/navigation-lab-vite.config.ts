import { fileURLToPath } from 'node:url';
import { clientFileAccess } from '../vite-file-access.js';

// Local authoring only: full atlas access stays off the private world/game origins.
export default {
  root: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [
    clientFileAccess(
      'retired-map-authoring',
      (path) =>
        !path.includes('/assets/art/world/porechye-atlas-v1/') &&
        !/\/scripts\/world-map\/(?:navigation-lab\.ts|navigation-maps|porechye-atlas)/u.test(path),
    ),
  ],
  server: { host: '127.0.0.1', port: 5326, strictPort: true },
};

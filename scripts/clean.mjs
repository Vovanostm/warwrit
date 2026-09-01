import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const roots = ['apps', 'packages'];
const removable = ['dist', 'coverage', '.vite'];

for (const root of roots) {
  const absoluteRoot = join(repositoryRoot, root);
  const entries = await readdir(absoluteRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    for (const directory of removable) {
      await rm(join(absoluteRoot, entry.name, directory), {
        force: true,
        recursive: true,
      });
    }
  }
}

await rm(join(repositoryRoot, 'coverage'), { force: true, recursive: true });
console.log(JSON.stringify({ event: 'repository.clean', status: 'ok' }));

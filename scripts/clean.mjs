import { rm } from 'node:fs/promises';

for (const target of ['dist', 'dist-tests']) {
  await rm(new URL(`../${target}`, import.meta.url), { force: true, recursive: true });
}

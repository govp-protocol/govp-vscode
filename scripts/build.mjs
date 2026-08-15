import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

await mkdir(new URL('../dist', import.meta.url), { recursive: true });
await build({
  bundle: true,
  entryPoints: [fileURLToPath(new URL('../src/extension.ts', import.meta.url))],
  external: ['vscode'],
  format: 'cjs',
  logLevel: 'info',
  minify: false,
  outfile: fileURLToPath(new URL('../dist/extension.js', import.meta.url)),
  platform: 'node',
  sourcemap: false,
  target: 'node20',
});

import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const output = new URL('../output', import.meta.url);
await mkdir(output, { recursive: true });
const destination = fileURLToPath(new URL(`../output/${packageJson.name}-${packageJson.version}.vsix`, import.meta.url));
const result = spawnSync(
  process.execPath,
  [fileURLToPath(new URL('../node_modules/@vscode/vsce/vsce', import.meta.url)), 'package', '--out', destination],
  { encoding: 'utf8', stdio: 'inherit' },
);
if (result.status !== 0) throw new Error(`VSCE_FAILED:${result.status}`);
console.log(destination);

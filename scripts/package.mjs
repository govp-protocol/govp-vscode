import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const output = new URL('../output', import.meta.url);
await mkdir(output, { recursive: true });
const destination = new URL(`../output/${packageJson.name}-${packageJson.version}.vsix`, import.meta.url).pathname;
const result = spawnSync(
  process.execPath,
  [new URL('../node_modules/@vscode/vsce/vsce', import.meta.url).pathname, 'package', '--out', destination],
  { encoding: 'utf8', stdio: 'inherit' },
);
if (result.status !== 0) throw new Error(`VSCE_FAILED:${result.status}`);
console.log(destination);

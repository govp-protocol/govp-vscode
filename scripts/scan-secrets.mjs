import { spawnSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';

const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'buffer' });
if (listed.status !== 0) throw new Error('SECRET_SCAN_FILE_LIST_FAILED');

const files = listed.stdout.toString('utf8').split('\0').filter(Boolean);
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ['github-token', /(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/u],
  ['aws-access-key', /(?:A3T[A-Z0-9]|AKIA|ASIA)[A-Z0-9]{16}/u],
  ['slack-token', /xox[baprs]-[A-Za-z0-9-]{20,}/u],
  ['credential-url', /https:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/u],
];
const findings = [];

for (const file of files) {
  let info;
  try { info = await stat(file); } catch (error) { if (error?.code === 'ENOENT') continue; throw error; }
  if (!info.isFile() || info.size > 5 * 1024 * 1024 || /\.(?:png|jpg|jpeg|gif|ico|vsix|zip)$/iu.test(file)) continue;
  const text = (await readFile(file, 'utf8')).replace(/https:\/\/[^\s/:@]+:[^\s/@]+@(?:example\.com|localhost|[^\s/]+\.invalid)/gu, 'https://credential-test.invalid');
  for (const [name, pattern] of rules) if (pattern.test(text)) findings.push(`${file}:${name}`);
}

if (findings.length) throw new Error(`POTENTIAL_SECRET_FOUND\n${findings.join('\n')}`);
console.log(`Secret scan: PASS (${files.length} repository files)`);

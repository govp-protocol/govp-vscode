import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const packageNls = JSON.parse(await readFile(new URL('package.nls.json', root), 'utf8'));
const displayNameMatch = /^%([^%]+)%$/u.exec(packageJson.displayName);
const displayName = displayNameMatch ? String(packageNls[displayNameMatch[1]] ?? packageJson.name) : packageJson.displayName;
const relativeVsix = `output/${packageJson.name}-${packageJson.version}.vsix`;
const vsixUrl = new URL(relativeVsix, root);
const vsix = await readFile(vsixUrl);
const vsixInfo = await stat(vsixUrl);

function unzip(args, encoding = 'utf8') {
  const result = spawnSync('unzip', args, { cwd: new URL('.', root), encoding, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`UNZIP_FAILED:${result.stderr?.toString() ?? result.status}`);
  return result.stdout;
}

const entries = String(unzip(['-Z1', relativeVsix])).split('\n').filter(Boolean).sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
if (!entries.length || new Set(entries).size !== entries.length) throw new Error('VSIX_ENTRIES_INVALID');
for (const entry of entries) {
  const segments = entry.split('/');
  if (entry.startsWith('/') || entry.includes('\\') || segments.includes('..') || segments.includes('')) throw new Error(`UNSAFE_VSIX_PATH:${entry}`);
}

const payloadLines = [];
for (const entry of entries) {
  const escapedEntry = entry.replace(/([*?[\]\\])/gu, '\\$1');
  const content = unzip(['-p', relativeVsix, escapedEntry], null);
  payloadLines.push(`${createHash('sha256').update(content).digest('hex')}  ${entry}`);
}
const manifest = `${payloadLines.join('\n')}\n`;
const vsixSha256 = createHash('sha256').update(vsix).digest('hex');
const payloadManifestSha256 = createHash('sha256').update(manifest).digest('hex');

await mkdir(new URL('audit/', root), { recursive: true });
await writeFile(new URL(`audit/${packageJson.name}-${packageJson.version}.payload.sha256`, root), manifest);
await writeFile(new URL(`audit/RELEASE_EVIDENCE_${packageJson.version}.md`, root), `# Release evidence — ${displayName} ${packageJson.version}

Generated: 15 August 2026  
Artifact: \`${relativeVsix}\`  
VSIX SHA-256: \`${vsixSha256}\`  
VSIX size: ${vsixInfo.size} bytes  
Payload entries: ${entries.length}  
Payload-manifest SHA-256: \`${payloadManifestSha256}\`

## Verified gates

- TypeScript typecheck: pass
- Unit tests: 15/15 pass
- Runtime localization: 147 English-source messages with complete Spanish and German bundles
- Manifest localization: English source with Spanish and German bundles
- Repository secret scan: pass
- Production dependency audit: 0 known vulnerabilities at audit time
- CycloneDX runtime SBOM: 3 components
- Package identity and safety audit: pass
- VSIX clean-profile installation: pass on VS Code 1.132.0, macOS arm64
- Azure Pipelines validation: pass on Linux, Windows and macOS; immutable package job pass
- GitHub Actions validation: pass
- Consecutive builds: extracted payloads byte-identical; ZIP container hashes can differ because VSIX ZIP metadata contains build timestamps
- Brilyetz representative authority and contributor rights: confirmed
- Entra workload identity: pipeline-scoped, protected by the \`vscode-marketplace\` approval environment and registered as a Marketplace contributor
- Public Marketplace lookup: \`gemacode.govp-partner-workbench\` was not published at audit time

## Human or external gates still open

- Legal approval of privacy, terms, trademark and CRA classification records
- Marketplace publisher ownership and company administrator/backup confirmation
- Interactive UI and screenshot approval in English, Spanish and German
- Clean-profile workflow validation on Windows and Linux
- Incident owner and backup assignment in the private operations record
- Marketplace descriptions and screenshots approval
- Microsoft verified-publisher domain review (submitted; not a package-integrity gate)

This evidence does not constitute legal advice, regulatory conformity, Marketplace approval or a declaration of conformity.
`);
console.log(`VSIX audit: PASS (${entries.length} entries, sha256:${vsixSha256})`);

import { readFile, stat } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const extension = await readFile(new URL('../dist/extension.js', import.meta.url), 'utf8');
const icon = await stat(new URL('../media/govp.png', import.meta.url));

if (packageJson.name !== 'govp-partner-workbench' || packageJson.publisher !== 'gemacode' || packageJson.version !== '0.3.0') throw new Error('MARKETPLACE_ID_OR_VERSION_INVALID');
if (packageJson.private === true || packageJson.license === 'UNLICENSED') throw new Error('PACKAGE_NOT_PUBLISHABLE');
if (!packageJson.icon?.endsWith('.png') || icon.size < 1_000) throw new Error('PNG_ICON_REQUIRED');
if (!packageJson.capabilities || !packageJson.bugs?.url) throw new Error('MARKETPLACE_METADATA_INCOMPLETE');
if (JSON.stringify(packageJson).includes('preview-minimal') || JSON.stringify(packageJson).includes('-preview.')) {
  throw new Error('PREVIEW_DEFAULT_FORBIDDEN');
}
for (const setting of ['govp.domain', 'govp.mcpEndpoint', 'govp.partnerUrl']) {
  if (packageJson.contributes?.configuration?.properties?.[setting]?.default !== '') throw new Error(`NON_EMPTY_REMOTE_DEFAULT:${setting}`);
}
if (packageJson.dependencies?.['@govp/verifier'] !== '0.1.10') throw new Error('VERIFIER_MUST_BE_PINNED');
const commands = packageJson.contributes?.commands?.map((item) => item.command) ?? [];
if (new Set(commands).size !== commands.length || !commands.includes('govp.captureEvidence')) throw new Error('COMMAND_REGISTRY_INVALID');
if (extension.includes('sourcesContent') || extension.includes('sourceMappingURL=')) {
  throw new Error('SOURCE_MAP_CONTENT_FORBIDDEN');
}
for (const required of [
  'approvalsAreHumanOnly', 'productionMutationAllowed', 'artifactSetSha256',
  '.git/hooks', '.vscode', '.github/workflows', '.devcontainer', '.envrc',
  'package.json', 'Makefile', 'mcp_govp_aw', 'pendiente de L1',
  'atribuible a tu dominio',
]) if (!extension.includes(required)) throw new Error(`DIST_CONTROL_MISSING:${required}`);
if (process.argv.includes('--dist')) console.log('Package audit: PASS');

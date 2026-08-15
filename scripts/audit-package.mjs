import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const extension = await readFile(new URL('dist/extension.js', root), 'utf8');
const icon = await stat(new URL('media/govp.png', root));

if (packageJson.name !== 'govp-partner-workbench' || packageJson.publisher !== 'gemacode' || packageJson.version !== '0.4.0') throw new Error('MARKETPLACE_ID_OR_VERSION_INVALID');
if (packageJson.private === true || packageJson.license !== 'Apache-2.0' || packageJson.pricing !== 'Free') throw new Error('PACKAGE_NOT_PUBLISHABLE');
if (!packageJson.icon?.endsWith('.png') || icon.size < 1_000) throw new Error('PNG_ICON_REQUIRED');
if (!packageJson.capabilities || !packageJson.bugs?.url || !packageJson.repository?.url || !packageJson.homepage) throw new Error('MARKETPLACE_METADATA_INCOMPLETE');
const restricted = packageJson.capabilities?.untrustedWorkspaces?.restrictedConfigurations ?? [];
for (const setting of ['govp.mcpEndpoint', 'govp.partnerUrl', 'govp.mcpProviderNamespace', 'govp.observeLocalExecution']) if (!restricted.includes(setting)) throw new Error(`UNTRUSTED_CONFIGURATION_NOT_RESTRICTED:${setting}`);
if (JSON.stringify(packageJson).includes('preview-minimal') || JSON.stringify(packageJson).includes('-preview.')) throw new Error('PREVIEW_DEFAULT_FORBIDDEN');

for (const setting of ['govp.domain', 'govp.mcpEndpoint', 'govp.partnerUrl']) {
  if (packageJson.contributes?.configuration?.properties?.[setting]?.default !== '') throw new Error(`NON_EMPTY_REMOTE_DEFAULT:${setting}`);
}
if (packageJson.dependencies?.['@govp/verifier'] !== '0.1.10') throw new Error('VERIFIER_MUST_BE_PINNED');
if (Object.keys(packageJson.dependencies ?? {}).some((name) => /telemetry|analytics|sentry|segment/iu.test(name))) throw new Error('TELEMETRY_DEPENDENCY_FORBIDDEN');

const commands = packageJson.contributes?.commands?.map((item) => item.command) ?? [];
if (new Set(commands).size !== commands.length || !commands.includes('govp.captureEvidence') || !commands.includes('govp.forgetLocalIdentity')) throw new Error('COMMAND_REGISTRY_INVALID');
if (extension.includes('sourcesContent') || extension.includes('sourceMappingURL=')) throw new Error('SOURCE_MAP_CONTENT_FORBIDDEN');
if (extension.includes('command=${command.value') || extension.includes('command=${command.value.slice')) throw new Error('COMMAND_TEXT_LOGGING_FORBIDDEN');

for (const required of [
  'approvalsAreHumanOnly', 'productionMutationAllowed', 'artifactSetSha256',
  '.govp', 'implementations', 'The current project will not be modified', 'get_bundle',
  'mcp_govp_implemen', 'Integrity verified (L1 pending)', 'not yet attributable to your domain',
]) if (!extension.includes(required)) throw new Error(`DIST_CONTROL_MISSING:${required}`);

for (const requiredFile of [
  'README.md', 'README.es.md', 'README.de.md', 'PRIVACY.md', 'PRIVACY.es.md', 'PRIVACY.de.md',
  'TERMS.md', 'TERMS.es.md', 'TERMS.de.md', 'TRADEMARKS.md', 'SECURITY.md', 'SUPPORT.md',
  'THIRD_PARTY_NOTICES.md', 'SBOM.cdx.json', 'package.nls.json', 'package.nls.es.json', 'package.nls.de.json',
  'l10n/bundle.l10n.json', 'l10n/bundle.l10n.es.json', 'l10n/bundle.l10n.de.json',
]) await stat(new URL(requiredFile, root));

const defaultNls = JSON.parse(await readFile(new URL('package.nls.json', root), 'utf8'));
for (const locale of ['es', 'de']) {
  const translated = JSON.parse(await readFile(new URL(`package.nls.${locale}.json`, root), 'utf8'));
  if (JSON.stringify(Object.keys(translated).sort()) !== JSON.stringify(Object.keys(defaultNls).sort())) throw new Error(`NLS_KEYS_MISMATCH:${locale}`);
}
for (const match of JSON.stringify(packageJson).matchAll(/%([^%]+)%/gu)) if (!Object.hasOwn(defaultNls, match[1])) throw new Error(`NLS_KEY_MISSING:${match[1]}`);

const sbom = JSON.parse(await readFile(new URL('SBOM.cdx.json', root), 'utf8'));
if (sbom.bomFormat !== 'CycloneDX' || sbom.metadata?.component?.version !== packageJson.version || !Array.isArray(sbom.components)) throw new Error('SBOM_INVALID');

if (process.argv.includes('--dist')) console.log('Package audit: PASS');

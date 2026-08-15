import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const lock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));

function packageName(lockPath, value) {
  if (typeof value.name === 'string' && value.name) return value.name;
  const marker = 'node_modules/';
  const index = lockPath.lastIndexOf(marker);
  return index >= 0 ? lockPath.slice(index + marker.length) : lockPath;
}

function hashFromIntegrity(integrity) {
  if (typeof integrity !== 'string') return [];
  const separator = integrity.indexOf('-');
  if (separator < 1) return [];
  const algorithm = integrity.slice(0, separator).toUpperCase().replace('SHA', 'SHA-');
  const content = Buffer.from(integrity.slice(separator + 1), 'base64').toString('hex');
  return content ? [{ alg: algorithm, content }] : [];
}

const components = Object.entries(lock.packages)
  .filter(([lockPath, value]) => lockPath && lockPath.includes('node_modules/') && !value.dev)
  .map(([lockPath, value]) => {
    const name = packageName(lockPath, value);
    const version = String(value.version ?? 'unknown');
    const component = {
      type: 'library',
      'bom-ref': `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`,
      name,
      version,
      purl: `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`,
    };
    const hashes = hashFromIntegrity(value.integrity);
    if (hashes.length) component.hashes = hashes;
    if (typeof value.license === 'string') component.licenses = [{ license: { id: value.license } }];
    return component;
  })
  .sort((left, right) => Buffer.from(left['bom-ref']).compare(Buffer.from(right['bom-ref'])));

const rootRef = `pkg:npm/${encodeURIComponent(manifest.name)}@${encodeURIComponent(manifest.version)}`;
const document = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  version: 1,
  metadata: {
    component: {
      type: 'application',
      'bom-ref': rootRef,
      name: manifest.name,
      version: manifest.version,
      licenses: [{ license: { id: manifest.license } }],
      purl: rootRef,
    },
    properties: [
      { name: 'govp:build:lockfileSha256', value: createHash('sha256').update(JSON.stringify(lock)).digest('hex') },
      { name: 'govp:build:scope', value: 'runtime' },
    ],
  },
  components,
  dependencies: [{ ref: rootRef, dependsOn: components.map((item) => item['bom-ref']) }],
};

await writeFile(new URL('SBOM.cdx.json', root), `${JSON.stringify(document, null, 2)}\n`);
console.log(`SBOM: ${components.length} runtime components`);

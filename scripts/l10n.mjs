import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const messages = new Set();

function visit(node) {
  if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression) && ['t', 'UserError'].includes(node.expression.text)) {
    const first = node.arguments[0];
    if (first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) messages.add(first.text);
  }
  ts.forEachChild(node, visit);
}
for (const file of ['src/extension.ts', 'src/core.ts']) {
  const sourceText = await readFile(new URL(file, root), 'utf8');
  visit(ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
}

const keys = [...messages].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
const english = Object.fromEntries(keys.map((key) => [key, key]));
await mkdir(new URL('l10n/', root), { recursive: true });
await writeFile(new URL('l10n/bundle.l10n.json', root), `${JSON.stringify(english, null, 2)}\n`);

function placeholders(value) {
  return [...value.matchAll(/\{\d+\}/gu)].map((item) => item[0]).sort().join(',');
}

if (!process.argv.includes('--generate-only')) {
  for (const locale of ['es', 'de']) {
    const translated = JSON.parse(await readFile(new URL(`l10n/bundle.l10n.${locale}.json`, root), 'utf8'));
    if (JSON.stringify(Object.keys(translated).sort()) !== JSON.stringify([...keys].sort())) throw new Error(`RUNTIME_L10N_KEYS_MISMATCH:${locale}`);
    for (const key of keys) if (typeof translated[key] !== 'string' || placeholders(key) !== placeholders(translated[key])) throw new Error(`RUNTIME_L10N_VALUE_INVALID:${locale}:${key}`);
  }
}
console.log(`Runtime localization: ${keys.length} messages`);

// Mọi khoá t("…") viết tĩnh trong src phải có chữ ở cả messages/vi.json và messages/en.json (F3-G14).
// Thiếu khoá ⇒ màn hình hiện nguyên mã khoá (vd. "admin.lockers.maintenanceDialog.title") ở cả hai ngôn ngữ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(FE, 'src');
const SKIP = ['__harness', `${'/'}examples${'/'}`, '.test.'];
const PLURAL = ['_one', '_other', '_zero', '_few', '_many', '_two'];
const CALL = /\b(?:i18n\.)?t\(\s*["']([a-zA-Z][\w-]*(?:\.[\w-]+)+)["']/g;

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const messages = Object.fromEntries(
  ['vi', 'en'].map((lang) => [lang, flatten(JSON.parse(readFileSync(join(FE, 'messages', `${lang}.json`), 'utf8')))]),
);
const has = (keys, k) =>
  keys.has(k) || PLURAL.some((s) => keys.has(k + s)) || [...keys].some((x) => x.startsWith(`${k}.`));

test('mọi khoá t() tĩnh đều có chữ tiếng Việt và tiếng Anh', () => {
  const missing = [];
  for (const file of files(SRC)) {
    const rel = relative(FE, file).replaceAll('\\', '/');
    if (SKIP.some((s) => rel.includes(s))) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(CALL)) {
      const key = m[1];
      const langs = ['vi', 'en'].filter((lang) => !has(messages[lang], key));
      if (langs.length) {
        const line = src.slice(0, m.index).split('\n').length;
        missing.push(`${key} [${langs.join(',')}] ${rel}:${line}`);
      }
    }
  }
  assert.deepEqual(missing, [], `khoá chưa có chữ trong messages/*.json:\n${missing.join('\n')}`);
});

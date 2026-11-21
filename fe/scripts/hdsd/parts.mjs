#!/usr/bin/env node
// Kiểm / gộp "file phần" nội dung hướng dẫn (F3-G13) — dùng khi nhiều người bổ sung nhóm cùng lúc mà không sửa chung
// tours.json. File phần: { "groups": [nhóm…], "locales": { "vi": { "groups": {…}, "steps": {…} }, "en": {…} } }.
// Nhóm trùng mã với nhóm có sẵn sẽ THAY nhóm đó (nhớ tăng version).
//
//   node --experimental-strip-types scripts/hdsd/parts.mjs check <phần.json>…   # kiểm như npm test, chỉ báo lỗi
//   node --experimental-strip-types scripts/hdsd/parts.mjs merge <phần.json>…   # gộp vào tours.json + locales
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { missingTranslations, validateContent } from '../../src/onboarding/engine.ts';

const FE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUB = join(FE, 'public', 'onboarding');
const LANGS = ['vi', 'en'];
const [cmd, ...files] = process.argv.slice(2);
if (!['check', 'merge'].includes(cmd) || !files.length) {
  console.error('cách dùng: parts.mjs check|merge <phần.json>…');
  process.exit(2);
}

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const content = read(join(PUB, 'tours.json'));
const locales = Object.fromEntries(LANGS.map((l) => [l, read(join(PUB, 'locales', `${l}.json`))]));
const partIds = new Set();
for (const f of files) {
  const part = read(resolve(f));
  for (const g of part.groups ?? []) {
    partIds.add(g.id);
    const i = content.groups.findIndex((x) => x.id === g.id);
    if (i >= 0) content.groups[i] = g;
    else content.groups.push(g);
  }
  for (const l of LANGS) {
    const src = part.locales?.[l] ?? {};
    Object.assign((locales[l].groups ??= {}), src.groups ?? {});
    Object.assign((locales[l].steps ??= {}), src.steps ?? {});
  }
}
content.groups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.') || name === 'build') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

const problems = [];
const mine = content.groups.filter((g) => partIds.has(g.id));
problems.push(...validateContent(content));
problems.push(...missingTranslations({ ...content, groups: mine }, locales).map((m) => `thiếu chữ ${m.lang}: ${m.key}`));
const orders = new Map();
for (const g of content.groups) {
  if (orders.has(g.order)) problems.push(`trùng order ${g.order}: ${orders.get(g.order)} và ${g.id}`);
  orders.set(g.order, g.id);
}

const webLines = walk(join(FE, 'src'), ['.tsx', '.ts']).flatMap((f) => readFileSync(f, 'utf8').split('\n')).filter((l) => l.includes('data-tour'));
const routes = readFileSync(join(FE, 'src', 'routes', 'routes-config.tsx'), 'utf8');
const lib = process.env.MOBILE_LIB || join(FE, '..', '..', 'mobile', 'lib');
const dart = existsSync(lib) ? walk(lib, ['.dart']).map((f) => readFileSync(f, 'utf8')).join('\n') : '';
const router = existsSync(lib) ? readFileSync(join(lib, 'core', 'routing', 'app_router.dart'), 'utf8') : '';
for (const g of mine) {
  for (const s of g.steps) {
    for (const a of [s.anchor, s.via].filter(Boolean)) {
      if (s.platforms.includes('web') && !webLines.some((l) => l.includes(`"${a}"`) || l.includes(`'${a}'`))) {
        problems.push(`${s.id}: thiếu data-tour="${a}" trong mã web`);
      }
      if (s.platforms.includes('mobile') && !new RegExp(`TourAnchor\\(\\s*(id:\\s*)?['"]${a}['"]`).test(dart)) {
        problems.push(`${s.id}: thiếu TourAnchor('${a}') trong mã app`);
      }
    }
    if (s.webRoute && !routes.includes(`path: "${s.webRoute.split('/').filter(Boolean).pop()}"`)) {
      problems.push(`${s.id}: webRoute ${s.webRoute} không có trong router`);
    }
    if (s.mobileRoute && !router.includes(`'${s.mobileRoute}'`)) problems.push(`${s.id}: mobileRoute ${s.mobileRoute} không có trong AppRouter`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`ổn: ${mine.length} nhóm (${mine.map((g) => g.id).join(', ')})`);
if (cmd === 'merge') {
  writeFileSync(join(PUB, 'tours.json'), `${JSON.stringify(content, null, 2)}\n`);
  for (const l of LANGS) writeFileSync(join(PUB, 'locales', `${l}.json`), `${JSON.stringify(locales[l], null, 2)}\n`);
  console.log('đã gộp vào tours.json + locales');
}

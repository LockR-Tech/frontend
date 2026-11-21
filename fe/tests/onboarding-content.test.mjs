// Kiểm nội dung hướng dẫn lần đầu (F3-G13) — đỏ là chưa xong:
// - cấu trúc tours.json hợp lệ, đủ chữ ở mọi ngôn ngữ;
// - mọi neo của bước web có `data-tour="…"` trong fe/src, mọi trang webRoute có trong router;
// - mọi neo của bước mobile có `TourAnchor('…')` trong mã app Flutter (repo mobile cạnh repo này,
//   hoặc thư mục ở biến môi trường MOBILE_LIB);
// - nhóm nào cũng có ảnh HDSD đã khoanh (public/onboarding/hdsd/<nhóm>.png + .json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent, missingTranslations } from '../src/onboarding/engine.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(FE, 'public', 'onboarding');
const content = JSON.parse(readFileSync(join(PUB, 'tours.json'), 'utf8'));
export const LANGUAGES = ['vi', 'en'];
const locales = Object.fromEntries(LANGUAGES.map((l) => [l, JSON.parse(readFileSync(join(PUB, 'locales', `${l}.json`), 'utf8'))]));

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}
const webSource = walk(join(FE, 'src'), ['.tsx', '.ts']).map((f) => readFileSync(f, 'utf8')).join('\n');
const steps = content.groups.flatMap((g) => g.steps.map((s) => ({ ...s, group: g.id })));

test('tours.json đúng cấu trúc', () => {
  assert.deepEqual(validateContent(content), []);
});

test('đủ chữ ở mọi ngôn ngữ (vi, en)', () => {
  const missing = missingTranslations(content, locales);
  assert.deepEqual(missing, [], missing.map((m) => `${m.lang}: ${m.key}`).join('\n'));
});

test('không thừa chữ cho bước / nhóm đã xoá', () => {
  const groupIds = new Set(content.groups.map((g) => g.id));
  const stepIds = new Set(steps.map((s) => s.id));
  for (const [lang, data] of Object.entries(locales)) {
    for (const id of Object.keys(data.groups ?? {})) assert.ok(groupIds.has(id), `${lang}: thừa nhóm ${id}`);
    for (const id of Object.keys(data.steps ?? {})) assert.ok(stepIds.has(id), `${lang}: thừa bước ${id}`);
  }
});

test('mọi neo của bước web có data-tour trong mã web', () => {
  const missing = steps
    .filter((s) => s.platforms.includes('web') && s.anchor)
    .filter((s) => !webSource.includes(`data-tour="${s.anchor}"`))
    .map((s) => `${s.id} → data-tour="${s.anchor}"`);
  assert.deepEqual(missing, [], `thiếu neo web:\n${missing.join('\n')}`);
});

test('mọi webRoute có trong router', () => {
  const routes = readFileSync(join(FE, 'src', 'routes', 'routes-config.tsx'), 'utf8');
  const missing = steps.filter((s) => s.webRoute).filter((s) => {
    const last = s.webRoute.split('/').filter(Boolean).pop();
    return !routes.includes(`path: "${last}"`);
  }).map((s) => `${s.id} → ${s.webRoute}`);
  assert.deepEqual(missing, [], `trang không có trong router:\n${missing.join('\n')}`);
});

test('mọi neo của bước mobile có TourAnchor trong mã app', () => {
  const mobileSteps = steps.filter((s) => s.platforms.includes('mobile') && s.anchor);
  if (mobileSteps.length === 0) return;
  const lib = process.env.MOBILE_LIB || join(FE, '..', '..', 'mobile', 'lib');
  assert.ok(existsSync(lib), `không thấy mã app mobile ở ${lib} — clone repo mobile cạnh frontend hoặc đặt MOBILE_LIB`);
  const dart = walk(lib, ['.dart']).map((f) => readFileSync(f, 'utf8')).join('\n');
  const missing = mobileSteps
    .filter((s) => !new RegExp(`TourAnchor\\(\\s*(id:\\s*)?['"]${s.anchor}['"]`).test(dart))
    .map((s) => `${s.id} → TourAnchor('${s.anchor}')`);
  assert.deepEqual(missing, [], `thiếu neo mobile:\n${missing.join('\n')}`);
});

test('nhóm nào cũng có ảnh HDSD đã khoanh', () => {
  const missing = content.groups.filter((g) =>
    !existsSync(join(PUB, 'hdsd', `${g.id}.png`)) || !existsSync(join(PUB, 'hdsd', `${g.id}.json`))).map((g) => g.id);
  assert.deepEqual(missing, [], `thiếu ảnh HDSD (chạy npm run hdsd:capture):\n${missing.join('\n')}`);
});

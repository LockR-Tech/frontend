// Kiểm nội dung hướng dẫn lần đầu (F3-G13) — đỏ là chưa xong:
// - cấu trúc tours.json hợp lệ, đủ chữ ở mọi ngôn ngữ;
// - mọi neo của bước web có `data-tour="…"` trong fe/src, mọi trang webRoute có trong router;
// - mọi neo của bước mobile có `TourAnchor('…')` trong mã app Flutter (repo mobile cạnh repo này,
//   hoặc thư mục ở biến môi trường MOBILE_LIB);
// - nhóm nào cũng có ảnh HDSD đã khoanh (public/onboarding/hdsd/<nhóm>.png + .json), và ảnh khớp bước hiện tại.
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

// Neo web: `data-tour="x"`, hoặc chuỗi "x" nằm trên dòng có data-tour (vd. neo chỉ gắn cho dòng đầu danh sách:
// data-tour={i === 0 ? "orders-first-row" : undefined}). Neo `via` (bấm trước để mở chi tiết / tab) cũng phải có.
const webTourLines = webSource.split('\n').filter((l) => l.includes('data-tour'));
const hasWebAnchor = (a) => webTourLines.some((l) => l.includes(`"${a}"`) || l.includes(`'${a}'`));

test('mọi neo của bước web có data-tour trong mã web', () => {
  const missing = steps
    .filter((s) => s.platforms.includes('web'))
    .flatMap((s) => [s.anchor, s.via].filter(Boolean).map((a) => ({ s, a })))
    .filter(({ a }) => !hasWebAnchor(a))
    .map(({ s, a }) => `${s.id} → data-tour="${a}"`);
  assert.deepEqual(missing, [], `thiếu neo web:\n${missing.join('\n')}`);
});

// Kiosk (repo iot, ui/) không gắn neo trong mã: script chụp tìm phần tử theo bảng neo → CSS selector.
test('mọi neo của bước kiosk có trong scripts/hdsd/kiosk-anchors.json', () => {
  const kioskSteps = steps.filter((s) => s.platforms.includes('kiosk'));
  if (kioskSteps.length === 0) return;
  const map = JSON.parse(readFileSync(join(FE, 'scripts', 'hdsd', 'kiosk-anchors.json'), 'utf8'));
  const missing = kioskSteps
    .flatMap((s) => [s.anchor, s.via].filter(Boolean).map((a) => ({ s, a })))
    .filter(({ a }) => typeof map[a] !== 'string' || !map[a].trim())
    .map(({ s, a }) => `${s.id} → ${a}`);
  assert.deepEqual(missing, [], `thiếu selector kiosk:\n${missing.join('\n')}`);
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
    .flatMap((s) => [s.anchor, s.via].filter(Boolean).map((a) => ({ s, a })))
    .filter(({ a }) => !new RegExp(`TourAnchor\\(\\s*(id:\\s*)?['"]${a}['"]`).test(dart))
    .map(({ s, a }) => `${s.id} → TourAnchor('${a}')`);
  assert.deepEqual(missing, [], `thiếu neo mobile:\n${missing.join('\n')}`);
});

// ── Không bỏ sót màn hình: route nào cũng có hướng dẫn ─────────────────────────────────────────────────────────────
// Trang tĩnh: có bước webRoute / mobileRoute đúng trang đó. Trang chi tiết (route có tham số, hoặc cần dữ liệu đi kèm):
// có nhóm mở bằng `via` từ trang danh sách. Không dẫn được ⇒ ghi vào bảng ngoại lệ, BẮT BUỘC có lý do; ghi `group`
// khi màn đó đã được mô tả trong một nhóm khác. Thêm trang mới mà quên hướng dẫn ⇒ test đỏ.
const groupIds = new Set(content.groups.map((g) => g.id));
function checkExempt(table, routes, label) {
  const problems = [];
  for (const [route, e] of Object.entries(table)) {
    if (!routes.includes(route)) problems.push(`${label}: ngoại lệ ${route} không còn trong router — xoá khỏi bảng`);
    if (!e.reason?.trim()) problems.push(`${label}: ngoại lệ ${route} thiếu lý do`);
    if (e.group && !groupIds.has(e.group)) problems.push(`${label}: ngoại lệ ${route} trỏ tới nhóm không có ${e.group}`);
  }
  return problems;
}

const WEB_ROUTE_EXEMPT = {
  '/auth/register': { reason: 'trang giữ chỗ — admin không tự đăng ký trên web' },
  '/admin/maintenance/technicians/:technicianId': { group: 'admin-technicians-detail', reason: 'đường dẫn cũ của /admin/technicians/:technicianId (cùng trang)' },
  '/admin/lockers/:lockerId/open/:boxId': {
    group: 'admin-locker-open-qr',
    reason: 'đích của mã QR thử tủ: mở trang là gửi lệnh mở ô thật — mô tả ở bước cuối nhóm "QR mở ô"',
  },
};

test('mọi trang web (đăng nhập + admin) có hướng dẫn hoặc có lý do ngoại lệ', () => {
  const src = readFileSync(join(FE, 'src', 'routes', 'routes-config.tsx'), 'utf8');
  const section = (start, end) => src.slice(src.indexOf(start), end ? src.indexOf(end, src.indexOf(start)) : undefined);
  const pages = (text, prefix) => [...text.matchAll(/path:\s*"([^"]+)",\s*element:\s*\(?\s*<(\w+)/g)]
    // bỏ route cha (khung bố cục / chặn quyền), chuyển hướng và trang 404
    .filter((m) => !['Navigate', 'NotFoundPage', 'AuthLayout', 'ProtectedRoute'].includes(m[2]) && m[1] !== '*')
    .map((m) => `${prefix}/${m[1]}`);
  const routes = [...pages(section('// Auth Routes', '// Admin Routes'), '/auth'), ...pages(section('// Admin Routes', '// Admin catch-all'), '/admin')];
  assert.ok(routes.includes('/admin/dashboard') && routes.includes('/auth/login'), `không đọc được router: ${routes.join(', ')}`);
  const webSteps = steps.filter((s) => s.platforms.includes('web'));
  const missing = routes.filter((r) => !WEB_ROUTE_EXEMPT[r]).filter((r) => {
    if (!r.includes('/:')) return !webSteps.some((s) => s.webRoute === r);
    const list = r.slice(0, r.indexOf('/:'));
    return !webSteps.some((s) => s.webRoute === list && s.via);
  });
  const problems = [...missing.map((r) => `chưa có hướng dẫn: ${r}`), ...checkExempt(WEB_ROUTE_EXEMPT, routes, 'web')];
  assert.deepEqual(problems, [], problems.join('\n'));
});

const MOBILE_ROUTE_EXEMPT = {
  '/': { reason: 'màn hình chờ khởi động, không có thao tác' },
  '/otp': { group: 'customer-login-phone', reason: 'không còn màn nào mở tới — mã OTP nhập ngay trong bảng đăng nhập' },
  '/auth/face-verify': { reason: 'đang tắt (FeatureFlags.faceRecognitionEnabled = false) — bật lại thì thêm hướng dẫn' },
  '/profile/face-registration': { reason: 'đang tắt (FeatureFlags.faceRecognitionEnabled = false) — bật lại thì thêm hướng dẫn' },
  '/orders/detail': { group: 'customer-order-detail', reason: 'route cũ; chi tiết đơn mở từ danh sách đơn' },
  '/locker/my-orders': { group: 'customer-orders', reason: 'cùng màn với tab Đơn hàng, mở từ thông báo' },
  '/locker/my-reports': { group: 'customer-my-reports', reason: 'cùng màn "Báo cáo của tôi", mở từ thông báo' },
  '/stores/detail': { group: 'customer-store-detail', reason: 'cần điểm gửi đi kèm — mở bằng via từ danh sách điểm gửi' },
  '/stores/lockers': { reason: 'không còn màn nào mở tới' },
  '/directions': { group: 'customer-directions', reason: 'cần điểm đến đi kèm — mở bằng via từ chi tiết điểm gửi' },
  '/drone-delivery': { group: 'customer-drone-tracking', reason: 'cần đơn drone đang giao — mở từ thẻ đơn ở trang chủ' },
  '/drone-delivery/live-map': { group: 'customer-drone-live-map', reason: 'mở từ màn theo dõi đơn drone' },
  '/assistant/history': { group: 'customer-assistant-history', reason: 'mở bằng nút lịch sử trong màn trợ lý' },
};

test('mọi route app mobile có hướng dẫn hoặc có lý do ngoại lệ', () => {
  const lib = process.env.MOBILE_LIB || join(FE, '..', '..', 'mobile', 'lib');
  const routerFile = join(lib, 'core', 'routing', 'app_router.dart');
  assert.ok(existsSync(routerFile), `không thấy ${routerFile} — clone repo mobile cạnh frontend hoặc đặt MOBILE_LIB`);
  const routes = [...readFileSync(routerFile, 'utf8').matchAll(/static const String \w+ = '([^']+)'/g)].map((m) => m[1]);
  assert.ok(routes.includes('/home'), 'không đọc được AppRouter');
  const covered = new Set(steps.filter((s) => s.platforms.includes('mobile') && s.mobileRoute).map((s) => s.mobileRoute));
  const problems = [
    ...routes.filter((r) => !covered.has(r) && !MOBILE_ROUTE_EXEMPT[r]).map((r) => `chưa có hướng dẫn: ${r}`),
    ...checkExempt(MOBILE_ROUTE_EXEMPT, routes, 'mobile'),
  ];
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('nhóm nào cũng có ảnh HDSD đã khoanh (trừ nhóm noImage — và nhóm đó không được còn ảnh cũ)', () => {
  const stale = content.groups.filter((g) => g.noImage && existsSync(join(PUB, 'hdsd', `${g.id}.png`))).map((g) => g.id);
  assert.deepEqual(stale, [], `nhóm noImage còn ảnh cũ (xoá hdsd/<nhóm>.png|json):\n${stale.join('\n')}`);
  const missing = content.groups.filter((g) => !g.noImage).filter((g) =>
    !existsSync(join(PUB, 'hdsd', `${g.id}.png`)) || !existsSync(join(PUB, 'hdsd', `${g.id}.json`))).map((g) => g.id);
  assert.deepEqual(missing, [], `thiếu ảnh HDSD (chạy npm run hdsd:capture):\n${missing.join('\n')}`);
});

test('ảnh HDSD khớp nội dung hiện tại: đủ ô khoanh cho mọi bước có neo, không khoanh bước đã xoá', () => {
  const problems = [];
  for (const g of content.groups) {
    const metaFile = join(PUB, 'hdsd', `${g.id}.json`);
    if (!existsSync(metaFile)) continue; // đã báo ở test trên
    const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
    const platform = ['web', 'mobile', 'kiosk'].find((p) => g.steps.some((s) => s.platforms.includes(p)));
    const marked = new Set(meta.marks.map((m) => m.stepId));
    const ids = new Set(g.steps.map((s) => s.id));
    for (const s of g.steps) {
      if (s.anchor && !s.optional && s.platforms.includes(platform) && !marked.has(s.id)) {
        problems.push(`${g.id}: thiếu ô khoanh cho ${s.id}`);
      }
    }
    for (const id of marked) if (!ids.has(id)) problems.push(`${g.id}: ảnh khoanh bước không còn ${id}`);
    const numbers = meta.marks.map((m) => m.n).sort((a, b) => a - b);
    if (numbers.some((n, i) => n !== i + 1)) problems.push(`${g.id}: số thứ tự không liền 1..${numbers.length}`);
  }
  assert.deepEqual(problems, [], `chụp lại ảnh HDSD (npm run hdsd:capture -- --groups=<nhóm>):\n${problems.join('\n')}`);
});

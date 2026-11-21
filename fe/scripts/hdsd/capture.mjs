#!/usr/bin/env node
// Chụp lại ảnh HDSD cho mọi nhóm hướng dẫn (F3-G13): mở đúng trang của nhóm, bấm neo `via` nếu cần (mở chi tiết /
// tab / hộp thoại), khoanh đỏ + đánh số từng phần tử có neo, lưu public/onboarding/hdsd/<nhóm>.png và .json.
//
// CHỈ chạy trên môi trường dev / demo:
//   - Nhóm web (admin): dev server vite chạy tại máy này, MỌI lời gọi /api/** bị chặn và trả dữ liệu mẫu
//     (scripts/hdsd/admin-fixtures.mjs + scripts/hdsd/fixtures/*.mjs) — không request nào ra production.
//     Nhóm `signedOut` (trang đăng nhập, 2FA) chạy một dev server thứ hai không bật chế độ dữ liệu giả.
//   - Nhóm app: bản build Flutter web của repo mobile phục vụ tại http://localhost:3000, đăng nhập bằng tài khoản
//     demo `@demo.lockr.test` (dữ liệu demo, xem private/seed-demo). Tài khoản khác bị từ chối. Nhóm `signedOut`
//     (đăng nhập, đăng ký, OTP…) chụp khi chưa đăng nhập. Đổi trang bằng `window.__lockrGo(route)` (app chỉ đăng ký
//     hook này khi chạy ở localhost).
//
// Cách chạy (thư mục fe/):
//   npm run hdsd:capture                         # mọi nhóm
//   npm run hdsd:capture -- --only=web           # chỉ nhóm web (--only=app / --only=kiosk)
//   npm run hdsd:capture -- --groups=admin-orders,customer-home
//   npm run hdsd:capture -- --part=<file.json>   # chụp thử nhóm trong file phần (chưa gộp vào tours.json)
//   HDSD_PORT=4400 …                             # đổi cổng dev server web (chạy song song nhiều bản)
// Nhóm app cần:  (cd ../../mobile && flutter build web)  và biến HDSD_DEMO_PASSWORD (mật khẩu chung tài khoản demo;
//   hoặc HDSD_DEMO_PASSWORD_FILE trỏ tới private/seed-demo/TAI-KHOAN-DEMO.md). Mật khẩu không bao giờ được in ra.
//   Bản build thiếu assets/AssetManifest.bin.json ⇒ app ra trang trắng: build sạch
//   (rm -rf build/web .dart_tool/flutter_build && flutter build web).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { adminFixture } from './admin-fixtures.mjs';
import { captureKiosk } from './kiosk.mjs';

const FE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUB = join(FE, 'public', 'onboarding');
const OUT = join(PUB, 'hdsd');
const ADMIN_PORT = Number(process.env.HDSD_PORT ?? 4317);
const MOBILE_PORT = 3000; // production API chỉ mở CORS cho localhost:3000
const DEMO_DOMAIN = '@demo.lockr.test';
// Thứ tự 5 ô trên thanh tab của khách (MainNavigationWrapper): ô giữa là trợ lý, không phải trang.
const CUSTOMER_TABS = ['/home', '/lockers', '/assistant', '/orders', '/profile'];
const DEMO_ACCOUNT = {
  CUSTOMER: `khach.demo${DEMO_DOMAIN}`,
  LOCKER_TECHNICIAN: `ktv.tu${DEMO_DOMAIN}`,
  DRONE_TECHNICIAN: `ktv.drone${DEMO_DOMAIN}`,
};
const W = 1440;
const APP_W = 412;
const APP_H = 892;
const APP_TALL = 1700;

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only;
let pick = args.groups ? new Set(args.groups.split(',')) : null;
const content = JSON.parse(readFileSync(join(PUB, 'tours.json'), 'utf8'));
if (args.part) {
  // File phần: { groups: [...] } — nhóm cùng mã thay nhóm cũ, nhóm mới thêm vào. Không có --groups ⇒ chỉ chụp nhóm
  // trong file phần.
  const part = JSON.parse(readFileSync(resolve(args.part), 'utf8'));
  pick ??= new Set((part.groups ?? []).map((g) => g.id));
  for (const g of part.groups ?? []) {
    const i = content.groups.findIndex((x) => x.id === g.id);
    if (i >= 0) content.groups[i] = g;
    else content.groups.push(g);
  }
}
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Nhóm noImage (HDSD chỉ có chữ — màn hình cần dữ liệu thật không tạo được): không chụp, xoá ảnh cũ nếu còn.
for (const g of content.groups.filter((x) => x.noImage)) {
  for (const ext of ['png', 'json']) rmSync(join(OUT, `${g.id}.${ext}`), { force: true });
}
const wanted = (g) => !g.noImage && (!pick || pick.has(g.id));
const isWeb = (g) => g.steps.some((s) => s.platforms.includes('web'));
const isApp = (g) => !isWeb(g) && g.steps.some((s) => s.platforms.includes('mobile'));
const webGroups = content.groups.filter((g) => wanted(g) && isWeb(g));
const appGroups = content.groups.filter((g) => wanted(g) && isApp(g));
const kioskGroups = content.groups.filter((g) => wanted(g) && !isWeb(g) && !isApp(g));

// Khoanh đỏ + số thứ tự (vẽ bằng DOM đè lên trang, kể cả trang Flutter vẽ bằng canvas).
async function annotate(page, marks, positioned) {
  await page.evaluate(({ marks, positioned }) => {
    document.getElementById('hdsd-marks')?.remove();
    const layer = document.createElement('div');
    layer.id = 'hdsd-marks';
    layer.style.cssText = `position:${positioned};left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none`;
    for (const m of marks) {
      const box = document.createElement('div');
      box.style.cssText = `position:absolute;left:${m.x - 4}px;top:${m.y - 4}px;width:${m.w + 8}px;height:${m.h + 8}px;` +
        'border:3px solid #dc2626;border-radius:10px;box-sizing:border-box';
      const n = document.createElement('div');
      n.textContent = String(m.n);
      n.style.cssText = `position:absolute;left:${Math.max(m.x - 16, 2)}px;top:${Math.max(m.y - 16, 2)}px;width:26px;height:26px;` +
        'border-radius:50%;background:#dc2626;color:#fff;font:700 14px/26px system-ui,sans-serif;text-align:center;' +
        'box-shadow:0 0 0 2px #fff';
      layer.append(box, n);
    }
    document.body.append(layer);
  }, { marks, positioned });
}

function save(group, file, size, marks) {
  writeFileSync(join(OUT, `${group.id}.json`), `${JSON.stringify({
    image: `hdsd/${group.id}.png`, width: size.width, height: size.height,
    capturedAt: new Date().toISOString().slice(0, 10),
    marks: marks.map(({ n, stepId, x, y, w, h }) => ({ n, stepId, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })),
  }, null, 2)}\n`);
  console.log(`  ✔ ${group.id}: ${marks.length} ô khoanh → ${file}`);
}

function warnMissing(group, steps, marks) {
  const missing = steps.filter((s) => s.anchor && !s.optional && !marks.some((m) => m.stepId === s.id));
  for (const s of missing) console.warn(`  ! ${s.id}: không thấy neo ${s.anchor}`);
  return missing;
}

async function waitHttp(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* chưa lên */ }
    await sleep(500);
  }
  throw new Error(`không mở được ${url}`);
}

// ---------------------------------------------------------------------------------------------- web (admin)
const W_IDLE = { x: 700, y: 5 };

// Ẩn banner "dữ liệu giả" (chỉ có ở chế độ chụp), giữ sidebar mở rộng, chờ biểu đồ vẽ xong.
async function settleWeb(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.querySelectorAll('div.bg-amber-500.text-white.text-center').forEach((e) => e.remove());
    // Tên tài khoản giả của chế độ mock → tên hiển thị trung tính trên ảnh.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeValue.includes('Admin Mock')) n.nodeValue = n.nodeValue.replace('Admin Mock', 'Quản trị viên');
    }
    if (!document.querySelector('[role="dialog"]')) window.scrollTo(0, 0);
  });
  const aside = page.locator('[data-tour="nav-sidebar"]');
  if ((await aside.count()) && ((await aside.boundingBox())?.width ?? 0) < 200) {
    await aside.locator('button[aria-label]').first().click().catch(() => {});
  }
  await page.mouse.move(W_IDLE.x, W_IDLE.y);
  await page.waitForTimeout(2000);
}

async function webBox(page, anchor) {
  const el = page.locator(`[data-tour="${anchor}"]`).first();
  if (!(await el.count())) return null;
  const box = await el.boundingBox();
  return box && box.width > 0 && box.height > 0 ? box : null;
}

// Nhóm cần nhập sẵn dữ liệu (giả) trước khi bấm `via` — vd. bấm "Đăng nhập" để sang bước nhập mã 2FA. API đã bị chặn và
// trả dữ liệu giả (webContext), nên không có gì gửi đi thật.
const WEB_PREPARE = {
  'admin-login-2fa': async (page) => {
    await page.fill('input[type="email"]', 'admin@demo.lockr.test').catch(() => {});
    await page.fill('input[type="password"]', 'hdsd-demo').catch(() => {});
  },
};

// Bấm neo `via` cho các bước chưa thấy phần tử (mở trang chi tiết / tab / hộp thoại), theo thứ tự bước.
async function walkWeb(page, steps) {
  for (const s of steps) {
    if (!s.anchor || !s.via || (await webBox(page, s.anchor))) continue;
    const v = page.locator(`[data-tour="${s.via}"]`).first();
    if (!(await v.count())) {
      console.warn(`  ! ${s.id}: không thấy neo via ${s.via}`);
      continue;
    }
    // Menu / Select đang mở (do bước trước): bấm lại nút mở sẽ đóng nó — giữ nguyên.
    if ((await v.getAttribute('aria-expanded').catch(() => null)) === 'true') continue;
    await v.click({ timeout: 5000 }).catch(async () => {
      // Phần tử nằm ngoài khung nhìn trong khi Radix khoá cuộn trang (mục menu ở cuối trang…): bấm thẳng trên DOM.
      await v.evaluate((el) => {
        const init = { bubbles: true, cancelable: true, button: 0, view: window };
        el.dispatchEvent(new PointerEvent('pointerdown', { ...init, buttons: 1, pointerType: 'mouse', isPrimary: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { ...init, buttons: 1 }));
        el.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerType: 'mouse', isPrimary: true }));
        el.dispatchEvent(new MouseEvent('mouseup', init));
        el.click();
      }).catch((e) => console.warn(`  ! ${s.id}: bấm ${s.via} lỗi: ${e.message.split('\n')[0]}`));
    });
    await settleWeb(page);
  }
}

async function measureWeb(page, steps) {
  const marks = [];
  for (const s of steps.filter((x) => x.anchor)) {
    const box = await webBox(page, s.anchor);
    if (box) marks.push({ n: marks.length + 1, stepId: s.id, x: box.x, y: box.y, w: box.width, h: box.height });
  }
  return marks;
}

function startVite(port, mock) {
  const vite = spawn(process.execPath, [join(FE, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], {
    cwd: FE, stdio: 'ignore',
    // API trỏ vào địa chỉ không tồn tại: lỡ có request lọt khỏi bộ chặn cũng không chạm production.
    env: { ...process.env, VITE_ENABLE_MOCK_DATA: mock ? 'true' : 'false', VITE_MOCK_DELAY: '50', VITE_API_BASE_URL: 'http://127.0.0.1:9' },
  });
  return vite;
}

async function webContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  await ctx.addInitScript(() => localStorage.setItem('i18nextLng', 'vi'));
  await ctx.route(/\/api\//, (route) => {
    const req = route.request();
    const { status, json } = adminFixture(req.url(), req.method(), req.postDataJSON?.() ?? null);
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
  });
  return ctx;
}

async function captureWeb(browser) {
  if (!webGroups.length) return;
  const servers = [];
  const pages = {};
  console.log(`Nhóm web: dev server http://localhost:${ADMIN_PORT}, API giả lập (không gọi production)`);
  try {
    for (const group of webGroups) {
      const signedOut = !!group.signedOut;
      const port = signedOut ? ADMIN_PORT + 1 : ADMIN_PORT;
      if (!pages[port]) {
        servers.push(startVite(port, !signedOut));
        await waitHttp(`http://localhost:${port}/onboarding/tours.json`, 90000);
        pages[port] = await (await webContext(browser)).newPage();
      }
      const page = pages[port];
      const steps = group.steps.filter((s) => s.platforms.includes('web'));
      const route = steps.find((s) => s.webRoute)?.webRoute ?? (signedOut ? '/auth/login' : '/admin/dashboard');
      await page.setViewportSize({ width: W, height: 900 });
      if (signedOut) await page.evaluate(() => localStorage.clear()).catch(() => {});
      await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'domcontentloaded' });
      if (!signedOut) await page.waitForSelector('[data-tour="nav-sidebar"]', { timeout: 90000 });
      await settleWeb(page);
      await WEB_PREPARE[group.id]?.(page);
      await walkWeb(page, steps);
      // Ảnh chỉ cao tới hết ô khoanh cuối cùng; khung nhìn kéo dài đúng bằng đó để sidebar cố định phủ hết chiều cao.
      let marks = await measureWeb(page, steps);
      const bottom = Math.max(0, ...marks.map((m) => m.y + m.h));
      const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const height = Math.max(900, Math.min(fullHeight, Math.ceil(bottom + 56)));
      if (height !== 900) {
        await page.setViewportSize({ width: W, height });
        await settleWeb(page);
        marks = await measureWeb(page, steps);
      }
      warnMissing(group, steps, marks);
      await annotate(page, marks, 'absolute');
      const file = join(OUT, `${group.id}.png`);
      await page.screenshot({ path: file });
      save(group, file, { width: W, height }, marks);
      await page.keyboard.press('Escape').catch(() => {});
    }
  } finally {
    for (const s of servers) s.kill();
  }
}

// ---------------------------------------------------------------------------------------------- app (Flutter web)
function demoPassword() {
  if (process.env.HDSD_DEMO_PASSWORD) return process.env.HDSD_DEMO_PASSWORD;
  const file = process.env.HDSD_DEMO_PASSWORD_FILE;
  if (file && existsSync(file)) {
    const m = readFileSync(file, 'utf8').match(/Mật khẩu chung[^`]*`([^`]+)`/);
    if (m) return m[1];
  }
  return null;
}

function serveStatic(dir, port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
    '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf',
    '.css': 'text/css', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    let file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

const SEM_JS = `() => [...document.querySelectorAll('flt-semantics')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; })
  .map(e => { const r = e.getBoundingClientRect();
    const inp = e.querySelector(':scope > input, :scope > textarea');
    const label = (e.getAttribute('aria-label') || [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ')).replace(/\\s+/g, ' ').trim();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, role: e.getAttribute('role') || '', label,
      input: inp ? (inp.type === 'password' ? 'password' : 'text') : '' }; })`;
const semItems = (page) => page.evaluate(`(${SEM_JS})()`);

async function enableSemantics(page) {
  await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.click());
  await page.waitForTimeout(400);
}

async function tapLabel(page, labels) {
  const items = await semItems(page);
  for (const want of labels) {
    const hit = items.filter((i) => i.label === want).pop();
    if (hit) {
      await page.mouse.click(hit.x, hit.y);
      await page.waitForTimeout(1200);
      return true;
    }
  }
  return false;
}

// Gõ vào ô đang được focus rồi đọc lại giá trị để chắc chắn (Flutter web tạo <input> thật khi ô được focus).
async function typeInto(page, target, value) {
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(target.x, target.y);
    await page.waitForTimeout(400);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value, { delay: 15 });
    const ok = await page.evaluate((v) => document.activeElement?.value === v, value);
    if (ok) return true;
  }
  return false;
}

async function waitLoginScreen(page) {
  for (let t = 0; t < 60; t++) {
    await enableSemantics(page);
    const items = await semItems(page);
    if (items.some((i) => i.input === 'password')) return items;
    await page.waitForTimeout(500);
  }
  return null;
}

async function flutterLogin(page, base, email, password) {
  if (!email.endsWith(DEMO_DOMAIN)) throw new Error('chỉ được dùng tài khoản demo @demo.lockr.test');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  for (let attempt = 0; attempt < 3; attempt++) {
    const items = await waitLoginScreen(page);
    if (!items) return;
    const text = items.find((i) => i.input === 'text');
    const pw = items.find((i) => i.input === 'password');
    const submit = items.filter((i) => i.label === 'Đăng nhập').pop();
    if (!text || !pw || !submit) return;
    if (!(await typeInto(page, text, email)) || !(await typeInto(page, pw, password))) continue;
    await page.mouse.click(submit.x, submit.y);
    for (let t = 0; t < 40; t++) {
      await page.waitForTimeout(500);
      await enableSemantics(page);
      if (!(await semItems(page)).some((i) => i.input === 'password')) return;
    }
  }
  throw new Error(`không đăng nhập được ${email}`);
}

async function dismissPopups(page) {
  for (let i = 0; i < 4; i++) {
    await enableSemantics(page);
    const tapped = await tapLabel(page, ['Bỏ qua', 'Để sau', 'Đóng', 'Không phải bây giờ']);
    if (!tapped) break;
  }
}

async function appBox(page, anchor) {
  const el = page.locator(`[flt-semantics-identifier="tour:${anchor}"]`).first();
  if (!(await el.count())) return null;
  const box = await el.boundingBox();
  const vp = page.viewportSize();
  if (!box || box.width === 0 || box.height === 0) return null;
  if (box.y > vp.height || box.y + box.height < 0 || box.x > vp.width || box.x + box.width < 0) return null;
  return box;
}

// Cuộn phần tử có neo vào tầm nhìn (tab ngoài thanh tab cuộn ngang…) bằng hook của app.
async function revealApp(page, anchor) {
  // Hook trả true khi neo đang có trên màn hình (đã cuộn tới); bản app cũ trả undefined ⇒ coi như đã cuộn.
  const ok = await page.evaluate((a) => {
    if (typeof window.__lockrReveal !== 'function') return false;
    return window.__lockrReveal(a) !== false;
  }, anchor);
  if (ok) await page.waitForTimeout(700);
  return ok;
}

async function goApp(page, group, route) {
  const hooked = await page.evaluate((r) => {
    if (typeof window.__lockrGo !== 'function') return false;
    window.__lockrGo(r);
    return true;
  }, route);
  if (!hooked) {
    // Bản build cũ chưa có hook: chỉ tới được các trang trên thanh tab của khách.
    const tab = CUSTOMER_TABS.indexOf(route);
    const box = tab >= 0 ? await appBox(page, 'nav-tabs') : null;
    if (!box) {
      console.warn(`  ! ${group.id}: không mở được ${route} (bản build app chưa có __lockrGo)`);
      return;
    }
    await page.mouse.click(box.x + (box.width * (tab + 0.5)) / CUSTOMER_TABS.length, box.y + box.height / 2);
  }
  await page.waitForTimeout(3500);
}

async function walkApp(page, steps) {
  for (const s of steps) {
    if (!s.anchor || !s.via) continue;
    await enableSemantics(page);
    if (await appBox(page, s.anchor)) continue;
    let v = null;
    for (let t = 0; t < 20 && !v; t++) {
      await revealApp(page, s.via);
      v = await appBox(page, s.via);
      if (!v) {
        await page.waitForTimeout(500);
        await enableSemantics(page);
      }
    }
    if (!v) {
      console.warn(`  ! ${s.id}: không thấy neo via ${s.via}`);
      continue;
    }
    await page.mouse.click(v.x + v.width / 2, v.y + v.height / 2);
    await page.waitForTimeout(3000);
  }
}

async function measureApp(page, steps) {
  const anchored = steps.filter((x) => x.anchor);
  let marks = [];
  for (let t = 0; t < 30; t++) {
    await page.waitForTimeout(500);
    await enableSemantics(page);
    marks = [];
    for (const s of anchored) {
      const box = await appBox(page, s.anchor);
      if (box) marks.push({ n: marks.length + 1, stepId: s.id, x: box.x, y: box.y, w: box.width, h: box.height });
    }
    if (anchored.every((s) => s.optional || marks.some((m) => m.stepId === s.id))) break;
  }
  return marks;
}

async function dumpSemantics(page) {
  const seen = await page.evaluate(() => [...document.querySelectorAll('[flt-semantics-identifier^="tour:"]')]
    .map((e) => `${e.getAttribute('flt-semantics-identifier')}@${Math.round(e.getBoundingClientRect().y)}`));
  console.warn(`    trang ${new URL(page.url()).pathname}; neo đang có: ${seen.join(', ') || '(không có)'}`);
  if (process.env.HDSD_DUMP) {
    const dump = await page.evaluate(() => [...document.querySelectorAll('flt-semantics')].map((e) => {
      const r = e.getBoundingClientRect();
      return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} id=${e.getAttribute('flt-semantics-identifier') ?? ''} role=${e.getAttribute('role') ?? ''} ${(e.getAttribute('aria-label') ?? '').slice(0, 60)}`;
    }));
    writeFileSync(process.env.HDSD_DUMP, dump.join('\n'));
  }
}

async function appContext(browser) {
  return browser.newContext({
    viewport: { width: APP_W, height: APP_H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', geolocation: { latitude: 10.8509, longitude: 106.7979 },
    permissions: ['geolocation'],
  });
}

async function captureApp(browser) {
  if (!appGroups.length) return;
  const dir = resolve(process.env.MOBILE_WEB_DIR ?? join(FE, '..', '..', 'mobile', 'build', 'web'));
  if (!existsSync(join(dir, 'index.html'))) {
    console.error(`Thiếu bản build app: ${dir}\n  chạy (cd ../../mobile && flutter build web) rồi chạy lại`);
    process.exitCode = 1;
    return;
  }
  // Bộ đệm build tăng dần của Flutter đôi khi bỏ sót danh mục tài nguyên ⇒ app chỉ ra trang trắng.
  if (!existsSync(join(dir, 'assets', 'AssetManifest.bin.json'))) {
    console.error('Bản build app thiếu assets/AssetManifest.bin.json (app sẽ ra trang trắng).\n'
      + '  build sạch: (cd ../../mobile && rm -rf build/web .dart_tool/flutter_build && flutter build web)');
    process.exitCode = 1;
    return;
  }
  const password = demoPassword();
  if (!password && appGroups.some((g) => !g.signedOut)) {
    console.error('Thiếu HDSD_DEMO_PASSWORD (hoặc HDSD_DEMO_PASSWORD_FILE) cho tài khoản demo');
    process.exitCode = 1;
    return;
  }
  console.log(`Nhóm app: ${dir} tại http://localhost:${MOBILE_PORT}, đăng nhập tài khoản demo`);
  const server = await serveStatic(dir, MOBILE_PORT);
  const base = `http://localhost:${MOBILE_PORT}`;
  const sessions = {}; // vai trò → trang đã đăng nhập (dùng lại cho mọi nhóm của vai trò đó)
  try {
    for (const group of appGroups) {
      const steps = group.steps.filter((s) => s.platforms.includes('mobile'));
      const route = steps.find((s) => s.mobileRoute)?.mobileRoute;
      let page;
      let ctx = null;
      if (group.signedOut) {
        ctx = await appContext(browser);
        page = await ctx.newPage();
        await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await waitLoginScreen(page);
        if (route && route !== '/') await goApp(page, group, route);
      } else {
        const role = group.roles[0];
        const email = DEMO_ACCOUNT[role];
        if (!email) {
          console.warn(`  ! ${group.id}: chưa có tài khoản demo cho vai trò ${role}`);
          continue;
        }
        if (!sessions[role]) {
          const c = await appContext(browser);
          const p = await c.newPage();
          await flutterLogin(p, `${base}/`, email, password);
          await dismissPopups(p);
          sessions[role] = p;
        }
        page = sessions[role];
        await page.setViewportSize({ width: APP_W, height: APP_H });
        // Đóng bảng / hộp thoại do nhóm trước mở.
        await page.evaluate(() => window.__lockrReset?.());
        await page.waitForTimeout(600);
        if (route) await goApp(page, group, route);
        await dismissPopups(page);
      }
      await walkApp(page, steps);
      let marks = await measureApp(page, steps);
      const missingNow = steps.filter((s) => s.anchor && !s.optional && !marks.some((m) => m.stepId === s.id));
      if (missingNow.length || steps.some((s) => s.anchor && s.optional && !marks.some((m) => m.stepId === s.id))) {
        // Phần tử nằm dưới mép màn hình: thử màn hình cao hơn (app tự dàn lại, ảnh cao hơn).
        await page.setViewportSize({ width: APP_W, height: APP_TALL });
        await page.waitForTimeout(1500);
        const tall = await measureApp(page, steps);
        if (tall.length > marks.length) marks = tall;
        else await page.setViewportSize({ width: APP_W, height: APP_H });
      }
      const notYet = steps.filter((s) => s.anchor && !marks.some((m) => m.stepId === s.id));
      if (notYet.length) {
        // Vẫn thiếu (phần dưới của trang dài): cuộn neo thiếu đầu tiên lên đầu màn hình rồi đo lại.
        // Chỉ cuộn khi neo thiếu thật sự có trên màn hình (bước optional không hiện thì bỏ qua, giữ nguyên ảnh).
        const before = marks;
        const prevH = page.viewportSize().height;
        await page.setViewportSize({ width: APP_W, height: APP_TALL });
        let moved = false;
        for (const s of notYet) if ((moved = await revealApp(page, s.anchor))) break;
        const revealed = moved ? await measureApp(page, steps) : [];
        if (revealed.length > before.length) marks = revealed;
        else if (!moved) await page.setViewportSize({ width: APP_W, height: prevH });
        else {
          // Không hơn: cuộn về neo đã khoanh đầu tiên và đo lại để ảnh khớp toạ độ.
          await page.setViewportSize({ width: APP_W, height: prevH });
          if (before.length) await revealApp(page, steps.find((s) => s.id === before[0].stepId).anchor);
          marks = await measureApp(page, steps);
        }
      }
      await page.waitForTimeout(1000);
      if (warnMissing(group, steps, marks).length) await dumpSemantics(page);
      await annotate(page, marks, 'fixed');
      // Cắt ảnh ngay dưới ô khoanh cuối: phần danh sách bên dưới không cần cho hướng dẫn (và có thể chứa dữ liệu
      // của người khác nhìn thấy được từ tài khoản KTV).
      const vpH = page.viewportSize().height;
      const height = Math.min(vpH, Math.max(420, Math.ceil(Math.max(0, ...marks.map((m) => m.y + m.h)) + 28)));
      const file = join(OUT, `${group.id}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: APP_W, height } });
      save(group, file, { width: APP_W, height }, marks);
      await page.evaluate(() => document.getElementById('hdsd-marks')?.remove());
      // Đóng hộp thoại / bảng còn mở để nhóm sau bắt đầu sạch.
      await page.keyboard.press('Escape').catch(() => {});
      if (ctx) await ctx.close();
    }
  } finally {
    server.close();
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--lang=vi-VN'] });
try {
  if (!only || only === 'web') await captureWeb(browser);
  if (!only || only === 'app') await captureApp(browser);
  if (!only || only === 'kiosk') await captureKiosk(browser, kioskGroups, { annotate, save, OUT });
} finally {
  await browser.close();
}

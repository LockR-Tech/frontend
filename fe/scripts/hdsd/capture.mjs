#!/usr/bin/env node
// Chụp lại ảnh HDSD cho mọi nhóm hướng dẫn (F3-G13): mở đúng trang của nhóm, khoanh đỏ + đánh số từng phần tử
// có neo, lưu public/onboarding/hdsd/<nhóm>.png và .json (toạ độ ô khoanh, số ↔ bước).
//
// CHỈ chạy trên môi trường dev / demo:
//   - Nhóm web (admin): dev server vite chạy tại máy này, MỌI lời gọi /api/** bị chặn và trả dữ liệu mẫu
//     (scripts/hdsd/admin-fixtures.mjs) — không request nào ra production, không cần đăng nhập thật.
//   - Nhóm app: bản build Flutter web của repo mobile phục vụ tại http://localhost:3000, đăng nhập bằng tài khoản
//     demo `@demo.lockr.test` (dữ liệu demo, xem private/seed-demo). Tài khoản khác bị từ chối.
//
// Cách chạy (thư mục fe/):
//   npm run hdsd:capture                         # mọi nhóm
//   npm run hdsd:capture -- --only=web           # chỉ nhóm web
//   npm run hdsd:capture -- --groups=admin-orders,customer-home
// Nhóm app cần:  (cd ../../mobile && flutter build web)  và biến HDSD_DEMO_PASSWORD (mật khẩu chung tài khoản demo;
//   hoặc HDSD_DEMO_PASSWORD_FILE trỏ tới private/seed-demo/TAI-KHOAN-DEMO.md). Mật khẩu không bao giờ được in ra.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { adminFixture } from './admin-fixtures.mjs';

const FE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUB = join(FE, 'public', 'onboarding');
const OUT = join(PUB, 'hdsd');
const ADMIN_PORT = 4317;
const MOBILE_PORT = 3000; // production API chỉ mở CORS cho localhost:3000
const DEMO_DOMAIN = '@demo.lockr.test';
// Thứ tự 5 ô trên thanh tab của khách (MainNavigationWrapper): ô giữa là trợ lý, không phải trang.
const CUSTOMER_TABS = ['/home', '/lockers', '/assistant', '/orders', '/profile'];
const DEMO_ACCOUNT = {
  CUSTOMER: `khach.demo${DEMO_DOMAIN}`,
  LOCKER_TECHNICIAN: `ktv.tu${DEMO_DOMAIN}`,
  DRONE_TECHNICIAN: `ktv.drone${DEMO_DOMAIN}`,
};

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only;
const pick = args.groups ? new Set(args.groups.split(',')) : null;
const content = JSON.parse(readFileSync(join(PUB, 'tours.json'), 'utf8'));
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wanted = (g) => !pick || pick.has(g.id);
const webGroups = content.groups.filter((g) => wanted(g) && g.steps.some((s) => s.platforms.includes('web')));
const appGroups = content.groups.filter((g) => wanted(g) && !g.steps.some((s) => s.platforms.includes('web')));

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

// Ẩn banner "dữ liệu giả" (chỉ có ở chế độ chụp), giữ sidebar mở rộng, chờ biểu đồ vẽ xong.
async function settleWeb(page) {
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.querySelectorAll('div.bg-amber-500.text-white.text-center').forEach((e) => e.remove());
    // Tên tài khoản giả của chế độ mock → tên hiển thị trung tính trên ảnh.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeValue.includes('Admin Mock')) n.nodeValue = n.nodeValue.replace('Admin Mock', 'Quản trị viên');
    }
    window.scrollTo(0, 0);
  });
  const aside = page.locator('[data-tour="nav-sidebar"]');
  if (((await aside.boundingBox())?.width ?? 0) < 200) {
    await aside.locator('button[aria-label]').first().click().catch(() => {});
  }
  await page.mouse.move(W_IDLE.x, W_IDLE.y);
  await page.waitForTimeout(2500);
}

const W_IDLE = { x: 700, y: 5 };

async function measureWeb(page, steps) {
  const marks = [];
  for (const s of steps.filter((x) => x.anchor)) {
    const el = page.locator(`[data-tour="${s.anchor}"]`).first();
    const box = (await el.count()) ? await el.boundingBox() : null;
    if (!box || box.width === 0) {
      if (!s.optional) console.warn(`  ! ${s.id}: không thấy neo ${s.anchor}`);
      continue;
    }
    marks.push({ n: marks.length + 1, stepId: s.id, x: box.x, y: box.y, w: box.width, h: box.height });
  }
  return marks;
}

// ---------------------------------------------------------------------------------------------- web (admin)
async function captureWeb(browser) {
  if (!webGroups.length) return;
  console.log(`Nhóm web: dev server http://localhost:${ADMIN_PORT}, API giả lập (không gọi production)`);
  const vite = spawn(process.execPath, [join(FE, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(ADMIN_PORT), '--strictPort'], {
    cwd: FE, stdio: 'ignore',
    // API trỏ vào địa chỉ không tồn tại: lỡ có request lọt khỏi bộ chặn cũng không chạm production.
    env: { ...process.env, VITE_ENABLE_MOCK_DATA: 'true', VITE_MOCK_DELAY: '50', VITE_API_BASE_URL: 'http://127.0.0.1:9' },
  });
  try {
    await waitHttp(`http://localhost:${ADMIN_PORT}/onboarding/tours.json`, 60000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    await ctx.addInitScript(() => localStorage.setItem('i18nextLng', 'vi'));
    await ctx.route(/\/api\//, (route) => {
      const { status, json } = adminFixture(route.request().url(), route.request().method());
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    });
    const page = await ctx.newPage();
    const W = 1440;
    for (const group of webGroups) {
      const steps = group.steps.filter((s) => s.platforms.includes('web'));
      const route = steps.find((s) => s.webRoute)?.webRoute ?? '/admin/dashboard';
      await page.setViewportSize({ width: W, height: 900 });
      await page.goto(`http://localhost:${ADMIN_PORT}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-tour="nav-sidebar"]', { timeout: 60000 });
      await page.waitForLoadState('networkidle');
      await settleWeb(page);
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
      await annotate(page, marks, 'absolute');
      const file = join(OUT, `${group.id}.png`);
      await page.screenshot({ path: file });
      save(group, file, { width: W, height }, marks);
    }
    await ctx.close();
  } finally {
    vite.kill();
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

async function enableSemantics(page) {
  await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.click());
  await page.waitForTimeout(500);
}

async function tapLabel(page, labels) {
  const items = await page.evaluate(`(${SEM_JS})()`);
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

async function flutterLogin(page, base, email, password) {
  if (!email.endsWith(DEMO_DOMAIN)) throw new Error('chỉ được dùng tài khoản demo @demo.lockr.test');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  for (let attempt = 0; attempt < 3; attempt++) {
    // Chờ màn đăng nhập vẽ xong (lần đầu tải app có thể mất vài chục giây).
    let items = [];
    for (let t = 0; t < 40; t++) {
      await enableSemantics(page);
      items = await page.evaluate(`(${SEM_JS})()`);
      if (items.some((i) => i.input === 'text') && items.some((i) => i.input === 'password')) break;
    }
    const text = items.find((i) => i.input === 'text');
    const pw = items.find((i) => i.input === 'password');
    const submit = items.filter((i) => i.label === 'Đăng nhập').pop();
    if (!text || !pw || !submit) return;
    if (!(await typeInto(page, text, email)) || !(await typeInto(page, pw, password))) continue;
    await page.mouse.click(submit.x, submit.y);
    for (let t = 0; t < 40; t++) {
      await page.waitForTimeout(500);
      await enableSemantics(page);
      const now = await page.evaluate(`(${SEM_JS})()`);
      if (!now.some((i) => i.input === 'password')) return;
    }
  }
  throw new Error(`không đăng nhập được ${email}`);
}

async function dismissPopups(page) {
  for (let i = 0; i < 4; i++) {
    await enableSemantics(page);
    const tapped = await tapLabel(page, ['Bỏ qua', 'Để sau', 'Đóng', 'Không phải bây giờ', 'Đồng ý']);
    if (!tapped) break;
  }
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
  if (!password) {
    console.error('Thiếu HDSD_DEMO_PASSWORD (hoặc HDSD_DEMO_PASSWORD_FILE) cho tài khoản demo');
    process.exitCode = 1;
    return;
  }
  console.log(`Nhóm app: ${dir} tại http://localhost:${MOBILE_PORT}, đăng nhập tài khoản demo`);
  const server = await serveStatic(dir, MOBILE_PORT);
  try {
    for (const group of appGroups) {
      const role = group.roles[0];
      const email = DEMO_ACCOUNT[role];
      if (!email) {
        console.warn(`  ! ${group.id}: chưa có tài khoản demo cho vai trò ${role}`);
        continue;
      }
      const ctx = await browser.newContext({
        viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
        locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', geolocation: { latitude: 10.8509, longitude: 106.7979 },
        permissions: ['geolocation'],
      });
      const page = await ctx.newPage();
      const base = `http://localhost:${MOBILE_PORT}`;
      await flutterLogin(page, `${base}/`, email, password);
      await dismissPopups(page);
      const steps = group.steps.filter((s) => s.platforms.includes('mobile'));
      const route = steps.find((s) => s.mobileRoute)?.mobileRoute;
      // Trang chủ KTV là trang mở ra ngay sau đăng nhập; chỉ trang của khách cần bấm tab để tới.
      if (route && CUSTOMER_TABS.includes(route) && new URL(page.url()).pathname !== route) {
        // Đổi trang ngay trong app bằng thanh tab dưới đáy (tải lại trang thì app khởi động lại và tự về trang chủ).
        const tab = CUSTOMER_TABS.indexOf(route);
        const nav = page.locator('[flt-semantics-identifier="tour:nav-tabs"]').first();
        const box = tab >= 0 && (await nav.count()) ? await nav.boundingBox() : null;
        if (!box) {
          console.warn(`  ! ${group.id}: không mở được ${route} (chưa có cách bấm tới trang này)`);
        } else {
          await page.mouse.click(box.x + (box.width * (tab + 0.5)) / CUSTOMER_TABS.length, box.y + box.height / 2);
          await page.waitForTimeout(4000);
          await dismissPopups(page);
        }
      }
      // Chờ các phần tử có neo hiện đủ (thẻ ca làm, số liệu… tải sau màn hình).
      const anchored = steps.filter((x) => x.anchor);
      let marks = [];
      for (let t = 0; t < 30; t++) {
        await page.waitForTimeout(500);
        await enableSemantics(page);
        marks = [];
        for (const s of anchored) {
          const el = page.locator(`[flt-semantics-identifier="tour:${s.anchor}"]`).first();
          const box = (await el.count()) ? await el.boundingBox() : null;
          if (!box || box.width === 0 || box.y > 892 || box.y + box.height < 0) continue;
          marks.push({ n: marks.length + 1, stepId: s.id, x: box.x, y: box.y, w: box.width, h: box.height });
        }
        if (anchored.every((s) => s.optional || marks.some((m) => m.stepId === s.id))) break;
      }
      await page.waitForTimeout(1500);
      const missing = anchored.filter((s) => !s.optional && !marks.some((m) => m.stepId === s.id));
      for (const s of missing) console.warn(`  ! ${s.id}: không thấy neo ${s.anchor} trên màn hình`);
      if (missing.length) {
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
      await annotate(page, marks, 'fixed');
      // Cắt ảnh ngay dưới ô khoanh cuối: phần danh sách bên dưới không cần cho hướng dẫn (và có thể chứa dữ liệu
      // của người khác nhìn thấy được từ tài khoản KTV).
      const height = Math.min(892, Math.max(420, Math.ceil(Math.max(0, ...marks.map((m) => m.y + m.h)) + 28)));
      const file = join(OUT, `${group.id}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 412, height } });
      save(group, file, { width: 412, height }, marks);
      await ctx.close();
    }
  } finally {
    server.close();
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--lang=vi-VN'] });
try {
  if (only !== 'app') await captureWeb(browser);
  if (only !== 'web') await captureApp(browser);
} finally {
  await browser.close();
}

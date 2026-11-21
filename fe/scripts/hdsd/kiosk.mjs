// Chụp ảnh HDSD cho nhóm kiosk (màn hình cảm ứng tại tủ, repo iot ui/). Kiosk không gắn neo trong mã: phần tử được
// tìm theo scripts/hdsd/kiosk-anchors.json (neo → selector Playwright: CSS, có thể kèm :has-text("…")).
//
// Cách chạy: node scripts/hdsd/capture.mjs --only=kiosk [--part=<file phần>] [--groups=kiosk-home,…]
//   - Dev server vite của ../../iot/ui (đổi bằng KIOSK_UI_DIR) tại http://127.0.0.1:4450 (HDSD_KIOSK_PORT), chỉ nghe
//     trên máy này. Repo iot không bị sửa gì (vite chạy với --configLoader native nên không ghi file tạm vào ui/).
//   - KHÔNG request nào ra production. Ba lớp chặn:
//       1. Biến môi trường của dev server trỏ API (VITE_API_URL, VITE_LOCAL_API_URL) vào http://127.0.0.1:9 — cổng không
//          có gì lắng nghe; khoá Firebase bị thay bằng giá trị hỏng nên Firebase không khởi tạo. Giá trị thật trong
//          ui/.env không được dùng (biến môi trường có sẵn thắng .env).
//       2. Playwright chặn MỌI request của trang (context.route('**/*')): đường dẫn /api/**, /system/**… ở BẤT KỲ máy
//          chủ nào (kể cả api.locker-drone.tech nếu lỡ trỏ tới) đều được trả dữ liệu giả từ kiosk-fixtures.mjs, không
//          bao giờ đi ra mạng. Chỉ file của chính dev server (127.0.0.1:4450) và font Inter của Google Fonts được tải
//          thật; mọi máy chủ khác bị huỷ (abort).
//       3. Service worker bị chặn (để không có request nào đi vòng qua bộ chặn).
//     Cuối lượt chụp in thống kê: số request API đã trả dữ liệu giả, máy chủ bị huỷ, request API trỏ sai máy chủ.
//   - Khung nhìn 1024×600 (màn 7" của tủ, khung cố định của kiosk), ảnh @2x. Đồng hồ trang cố định 09:41 hôm nay.
//
// Mỗi nhóm = một trạng thái màn hình. Kiosk không có route nên script đi từ màn chờ tới màn của nhóm:
//   - màn "cha" của nhóm = nhóm có bước mang neo đúng bằng `via` của nhóm này (hoặc KIOSK_FLOW[nhóm].after);
//     đi tới màn cha trước (đệ quy), chạy KIOSK_FLOW[nhóm].before (gõ mã, email…), bấm neo `via`, rồi chạy `.then`;
//   - đã thấy đủ neo của nhóm thì không bấm `via` nữa (vd. gõ đủ 6 số là kiosk tự gửi mã);
//   - `scenario` (cờ cho kiosk-fixtures.mjs) gộp dọc theo chuỗi màn; `query` thêm vào địa chỉ trang (osk=1 bật
//     bàn phím ảo). Mỗi nhóm chụp trong một trang mới (trạng thái sạch).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO, LOCKER_CODE, LOCKER_ID, kioskFixture } from './kiosk-fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = resolve(HERE, '..', '..');
const UI = resolve(process.env.KIOSK_UI_DIR ?? join(FE, '..', '..', 'iot', 'ui'));
const PORT = Number(process.env.HDSD_KIOSK_PORT ?? 4450);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const FAKE_API = 'http://127.0.0.1:9';
const W = 1024;
const H = 600;
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const API_PATH = /^\/(api|system|logs|config|setup|health)(\/|$)/;
const ANCHORS = JSON.parse(readFileSync(join(HERE, 'kiosk-anchors.json'), 'utf8'));

const LOGIN_EMAIL = [{ fill: 'kiosk-login-email-input', value: DEMO.email }];
const OTP = [{ fill: 'kiosk-otp-input', value: DEMO.otp }];

/** Cách tới màn của từng nhóm, ngoài `via` (xem đầu file). Nhóm không có ở đây: màn cha suy từ `via`.
 *  Thao tác trong before / then: { click: neo } · { fill: neo, value } · { wait: ms } · { clock: 'mm:ss' } (tua đồng
 *  hồ trang) · { scrollEnd: selector } (cuộn khung xuống hết). */
const KIOSK_FLOW = {
  'kiosk-open-invalid': { before: [{ fill: 'kiosk-open-input', value: DEMO.wrongCode }] },
  'kiosk-open-retry': { before: [{ fill: 'kiosk-open-input', value: DEMO.busyCode }] },
  'kiosk-rental-access': { before: [{ fill: 'kiosk-open-input', value: DEMO.rentalPin }] },
  'kiosk-login-email': { after: 'kiosk-login' },
  'kiosk-otp': { before: LOGIN_EMAIL },
  'kiosk-boxes': { before: OTP, then: [{ click: 'kiosk-boxes-first-free' }] },
  'kiosk-boxes-manage': { after: 'kiosk-boxes' },
  'kiosk-order-day': { after: 'kiosk-order-time' },
  'kiosk-order-promo': { after: 'kiosk-order-summary', before: [{ fill: 'kiosk-order-promo-input', value: DEMO.promo }] },
  // Kiosk chờ chuyển khoản 10 phút: tua đồng hồ của trang qua mốc đó.
  'kiosk-payment-expired': { then: [{ wait: 1500 }, { clock: '10:05' }] },
  // Lời báo lỗi nằm dưới hai nút, sát mép dưới màn 600 px: cuộn màn xuống hết như khách tự kéo.
  'kiosk-payment-retry': { scenario: { checkoutFails: true }, then: [{ wait: 1500 }, { scrollEnd: '.screen' }] },
  'kiosk-payment-paid': { scenario: { paid: true, unlockFails: true } },
  'kiosk-drop-confirm': { scenario: { paid: true } },
  'kiosk-report': {
    after: 'kiosk-report-login',
    before: [{ click: 'kiosk-login-tab-email' }, ...LOGIN_EMAIL, { click: 'kiosk-login-email-send' }, ...OTP],
    then: [{ click: 'kiosk-report-first-box' }, { click: 'kiosk-report-first-reason' }],
  },
  'kiosk-keyboard-text': { query: { osk: '1' } },
  'kiosk-keyboard-numeric': { query: { osk: '1' } },
  'kiosk-tech-setup': { scenario: { unpaired: true } },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kioskSteps = (g) => g.steps.filter((s) => s.platforms.includes('kiosk'));
const isKiosk = (g) => g.steps.some((s) => s.platforms.includes('kiosk'))
  && !g.steps.some((s) => s.platforms.includes('web') || s.platforms.includes('mobile'));
const viaOf = (g) => kioskSteps(g).find((s) => s.via)?.via ?? null;
const flowOf = (g) => KIOSK_FLOW[g.id] ?? {};

function selector(anchor) {
  const sel = ANCHORS[anchor];
  if (typeof sel !== 'string' || !sel.trim()) throw new Error(`kiosk-anchors.json thiếu selector cho neo ${anchor}`);
  return sel;
}

// Mọi nhóm kiosk (tours.json + file phần --part + nhóm được giao) — để tìm màn cha kể cả khi chỉ chụp một nhóm.
function allKioskGroups(groups) {
  const list = JSON.parse(readFileSync(join(FE, 'public', 'onboarding', 'tours.json'), 'utf8')).groups;
  const put = (g) => {
    const i = list.findIndex((x) => x.id === g.id);
    if (i >= 0) list[i] = g;
    else list.push(g);
  };
  const part = process.argv.find((a) => a.startsWith('--part='));
  if (part) for (const g of JSON.parse(readFileSync(resolve(part.slice(7)), 'utf8')).groups ?? []) put(g);
  for (const g of groups) put(g);
  return new Map(list.filter(isKiosk).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((g) => [g.id, g]));
}

function parentOf(group, all) {
  const flow = flowOf(group);
  if (flow.after !== undefined) {
    if (!flow.after) return null;
    const p = all.get(flow.after);
    if (!p) throw new Error(`${group.id}: không có nhóm ${flow.after} (KIOSK_FLOW.after)`);
    return p;
  }
  const via = viaOf(group);
  if (!via) return null;
  for (const g of all.values()) if (g.id !== group.id && kioskSteps(g).some((s) => s.anchor === via)) return g;
  throw new Error(`${group.id}: không biết màn nào có neo via ${via} — thêm "after" vào KIOSK_FLOW (scripts/hdsd/kiosk.mjs)`);
}

function chainOf(group, all) {
  const chain = [];
  for (let g = group; g; g = parentOf(g, all)) {
    if (chain.includes(g)) throw new Error(`vòng lặp via ở nhóm ${g.id}`);
    chain.unshift(g);
  }
  return chain;
}

// ---------------------------------------------------------------------------------------------- trang
async function box(page, anchor) {
  const el = page.locator(selector(anchor)).first();
  if (!(await el.count()) || !(await el.isVisible().catch(() => false))) return null;
  const b = await el.boundingBox();
  return b && b.width > 0 && b.height > 0 ? b : null;
}

// Đã ở đúng màn của nhóm: thấy đủ neo bắt buộc (không có neo bắt buộc thì cần thấy mọi neo tuỳ chọn).
async function onScreen(page, group) {
  const anchored = kioskSteps(group).filter((s) => s.anchor);
  const must = anchored.filter((s) => !s.optional);
  const list = must.length ? must : anchored;
  if (!list.length) return false;
  for (const s of list) if (!(await box(page, s.anchor))) return false;
  return true;
}

async function act(page, a, group) {
  if (a.wait) return page.waitForTimeout(a.wait);
  if (a.clock) {
    await page.clock.fastForward(a.clock);
    return page.waitForTimeout(800);
  }
  if (a.scrollEnd) {
    await page.locator(a.scrollEnd).first().evaluate((el) => { el.scrollTop = el.scrollHeight; }).catch(() => {});
    return page.waitForTimeout(400);
  }
  const anchor = a.click ?? a.fill;
  const el = page.locator(selector(anchor)).first();
  try {
    await el.waitFor({ state: 'visible', timeout: 10000 });
    if (a.fill) await el.fill(a.value);
    else await el.click();
  } catch (e) {
    console.warn(`  ! ${group.id}: không ${a.fill ? 'gõ được vào' : 'bấm được'} ${anchor}: ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(a.fill ? 1200 : 900);
}

async function walk(page, chain) {
  for (const g of chain) {
    const flow = flowOf(g);
    const via = viaOf(g);
    if (via && !(await onScreen(page, g))) {
      for (const a of flow.before ?? []) await act(page, a, g);
      if (!(await onScreen(page, g))) await act(page, { click: via }, g);
    }
    for (const a of flow.then ?? []) await act(page, a, g);
  }
}

async function measure(page, steps) {
  const marks = [];
  for (const s of steps.filter((x) => x.anchor)) {
    const b = await box(page, s.anchor);
    if (!b) continue;
    if (b.y >= H || b.x >= W || b.y + b.height <= 0) {
      console.warn(`  ! ${s.id}: neo ${s.anchor} nằm ngoài khung 1024×600`);
      continue;
    }
    marks.push({ n: marks.length + 1, stepId: s.id, x: b.x, y: b.y, w: Math.min(b.width, W - b.x), h: Math.min(b.height, H - b.y) });
  }
  return marks;
}

// Chờ đủ neo bắt buộc (màn chuyển bất đồng bộ: chờ API, hỏi trạng thái thanh toán mỗi 3 s…) rồi chờ hiệu ứng trượt vào.
async function settle(page, steps) {
  const must = steps.filter((s) => s.anchor && !s.optional);
  for (let t = 0; t < 40; t++) {
    const marks = await measure(page, steps);
    if (must.every((s) => marks.some((m) => m.stepId === s.id))) break;
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(900);
  return measure(page, steps);
}

// ---------------------------------------------------------------------------------------------- chặn mạng
function interceptor(scenario, stats) {
  return async (route) => {
    const req = route.request();
    let url;
    try {
      url = new URL(req.url());
    } catch {
      return route.abort('blockedbyclient');
    }
    if (url.origin === ORIGIN && !API_PATH.test(url.pathname)) return route.continue(); // mã nguồn / ảnh của dev server
    if (API_PATH.test(url.pathname)) {
      if (url.origin !== FAKE_API) stats.misrouted.add(url.origin);
      let body = null;
      try {
        body = req.postDataJSON?.() ?? null;
      } catch { /* không phải JSON */ }
      const ctx = { url, path: url.pathname, query: Object.fromEntries(url.searchParams), method: req.method(), body };
      let r = kioskFixture(ctx, scenario);
      if (!r) {
        stats.missing.add(`${ctx.method} ${ctx.path}`);
        r = { status: 503, json: { success: false, code: 'HDSD_FIXTURE_MISSING', message: `Chưa có dữ liệu mẫu cho ${ctx.path}` } };
      }
      stats.api++;
      return route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.json),
        headers: { 'access-control-allow-origin': '*' } });
    }
    if (FONT_HOSTS.has(url.hostname) && req.method() === 'GET') return route.continue();
    stats.blocked.add(url.host || url.protocol);
    return route.abort('blockedbyclient');
  };
}

// ---------------------------------------------------------------------------------------------- dev server
function startKioskVite() {
  const bin = join(UI, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(bin)) throw new Error(`không thấy ${bin} — chạy npm ci trong iot/ui (hoặc đặt KIOSK_UI_DIR)`);
  const off = 'hdsd:off';
  const proc = spawn(process.execPath, [bin, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--configLoader', 'native'], {
    cwd: UI,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      VITE_API_URL: FAKE_API, VITE_LOCAL_API_URL: FAKE_API,
      VITE_LOCKER_ID: String(LOCKER_ID), VITE_LOCKER_CODE: LOCKER_CODE, VITE_LOCKER_SELECTABLE: 'false',
      VITE_FIREBASE_API_KEY: off, VITE_FIREBASE_AUTH_DOMAIN: off, VITE_FIREBASE_PROJECT_ID: off,
      VITE_FIREBASE_STORAGE_BUCKET: off, VITE_FIREBASE_MESSAGING_SENDER_ID: off, VITE_FIREBASE_APP_ID: off,
      VITE_FIREBASE_MEASUREMENT_ID: off,
    },
  });
  let err = '';
  proc.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
  proc.lastError = () => err.trim();
  return proc;
}

async function waitHttp(url, proc, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (proc.exitCode != null) throw new Error(`dev server kiosk dừng (mã ${proc.exitCode}): ${proc.lastError()}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* chưa lên */ }
    await sleep(500);
  }
  throw new Error(`không mở được ${url}: ${proc.lastError()}`);
}

async function openKiosk(browser, scenario, query, stats) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh',
    serviceWorkers: 'block',
  });
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  await ctx.clock.install({ time: new Date(`${today}T09:41:00+07:00`) });
  await ctx.route('**/*', interceptor(scenario, stats));
  const page = await ctx.newPage();
  const qs = new URLSearchParams({ lockerId: String(LOCKER_ID), lockerCode: LOCKER_CODE, osk: '0', ...query });
  await page.goto(`${ORIGIN}/?${qs}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-shell', { timeout: 60000 });
  await page.waitForTimeout(1200);
  return { ctx, page };
}

export async function captureKiosk(browser, groups, { annotate, save, OUT }) {
  if (!groups.length) return;
  const all = allKioskGroups(groups);
  const stats = { api: 0, blocked: new Set(), misrouted: new Set(), missing: new Set() };
  console.log(`Nhóm kiosk: dev server ${UI} tại ${ORIGIN}, API giả lập (không gọi production)`);
  const vite = startKioskVite();
  try {
    await waitHttp(`${ORIGIN}/`, vite, 90000);
    // Lượt đầu vite tối ưu thư viện rồi tải lại trang — mở nháp một lần cho xong.
    const warm = await openKiosk(browser, {}, {}, stats);
    await warm.page.waitForLoadState('networkidle').catch(() => {});
    await warm.page.waitForTimeout(3000);
    await warm.ctx.close();

    for (const group of groups) {
      let chain;
      try {
        chain = chainOf(group, all);
      } catch (e) {
        console.warn(`  ! ${e.message}`);
        continue;
      }
      const scenario = Object.assign({}, ...chain.map((g) => flowOf(g).scenario ?? {}));
      const { ctx, page } = await openKiosk(browser, scenario, flowOf(group).query ?? {}, stats);
      try {
        await walk(page, chain);
        const steps = kioskSteps(group);
        const marks = await settle(page, steps);
        for (const s of steps.filter((x) => x.anchor && !x.optional && !marks.some((m) => m.stepId === x.id))) {
          console.warn(`  ! ${s.id}: không thấy neo ${s.anchor} (${selector(s.anchor)})`);
        }
        await annotate(page, marks, 'absolute');
        const file = join(OUT, `${group.id}.png`);
        await page.screenshot({ path: file });
        save(group, file, { width: W, height: H }, marks);
      } finally {
        await ctx.close();
      }
    }
  } finally {
    vite.kill();
  }
  console.log(`  API giả lập: ${stats.api} request trả dữ liệu mẫu, 0 request ra mạng ngoài (trừ font Google Fonts)`);
  if (stats.blocked.size) console.log(`  đã huỷ request tới: ${[...stats.blocked].join(', ')}`);
  if (stats.misrouted.size) console.warn(`  ! request API trỏ sai máy chủ (đã chặn, trả dữ liệu mẫu): ${[...stats.misrouted].join(', ')}`);
  if (stats.missing.size) console.warn(`  ! thiếu dữ liệu mẫu (kiosk-fixtures.mjs): ${[...stats.missing].join(', ')}`);
}

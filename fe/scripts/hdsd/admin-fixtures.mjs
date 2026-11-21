import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Dữ liệu giả cho admin web khi chụp ảnh HDSD (F3-G13). Script chặn MỌI lời gọi /api/** và trả từ đây,
// nên không có request nào ra production. Số liệu là mẫu demo, không phải số thật của hệ thống.

const STORES = [
  [800001, 'LockR Vincom Đồng Khởi', '72 Lê Thánh Tôn, P. Bến Nghé, Quận 1'],
  [800002, 'LockR Landmark 81', '720A Điện Biên Phủ, P. 22, Bình Thạnh'],
  [800003, 'LockR Thủ Đức – Khu Công nghệ cao', 'Lô T2, Đường D1, Khu CNC, TP. Thủ Đức'],
  [800004, 'LockR Crescent Mall Q7', '101 Tôn Dật Tiên, P. Tân Phú, Quận 7'],
  [800005, 'LockR Sư Vạn Hạnh – Q10', '11 Sư Vạn Hạnh, P. 12, Quận 10'],
];
const LOCKERS = [
  ['HCM-Q1-01', 'Tủ Vincom Đồng Khởi – Sảnh B1', 0], ['HCM-Q1-02', 'Tủ Nhà Văn hóa Thanh Niên', 0],
  ['HCM-BT-01', 'Tủ Landmark 81 – Tầng hầm B1', 1], ['HCM-BT-02', 'Tủ ĐH Hutech – Cổng chính', 1],
  ['HCM-TD-01', 'Tủ FPT Software F-Town 3', 2], ['HCM-TD-02', 'Tủ Vinhomes Grand Park – S1.02', 2],
  ['HCM-TD-03', 'Tủ Nhà Văn hóa Sinh viên ĐHQG', 2], ['HCM-Q7-01', 'Tủ Crescent Mall – Tầng trệt', 3],
  ['HCM-Q10-01', 'Tủ Vạn Hạnh Mall – Lối vào B', 4], ['HCM-Q10-02', 'Tủ ĐH Bách khoa – Cổng Lý Thường Kiệt', 4],
];
const NAMES = ['Nguyễn Thùy Dương', 'Trần Minh Khoa', 'Lê Thanh Tùng', 'Phạm Gia Bảo', 'Võ Ngọc Hân', 'Hồ Đức Thịnh',
  'Bùi Khánh Linh', 'Đặng Quốc Huy'];
// Nhân sự mẫu (tên giả) — KTV tủ / KTV drone để cột "phụ trách" có tên.
const STAFF = [
  [800201, 'Lâm Quốc Trung', 'LOCKER_TECHNICIAN'], [800202, 'Mai Thanh Phong', 'LOCKER_TECHNICIAN'],
  [800203, 'Trịnh Bảo Ngọc', 'DRONE_TECHNICIAN'], [800204, 'Châu Gia Hưng', 'DRONE_TECHNICIAN'],
  [800205, 'Quản trị viên demo', 'ADMIN'],
];
const plain = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const demoMail = (name, id) => `${plain(name).toLowerCase().split(' ').pop()}.${id}@demo.lockr.test`;
const phone = (id) => `09${String(10000000 + ((id * 7316423) % 89999999)).slice(-8)}`;

// Số giả ổn định (không dùng Math.random để ảnh chụp lại giống nhau).
let seed = 20261121;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const ok = (data) => ({ status: 200, json: { success: true, code: 'OK', data } });

function days(from, to) {
  const out = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function period(from, to, scale) {
  const paid = int(40, 60) * scale;
  const revenue = paid * int(17, 23) * 1000;
  const refund = Math.round(revenue * 0.03);
  return {
    from, to, totalRevenue: revenue, refundAmount: refund, netRevenue: revenue - refund, orderCount: Math.round(paid * 1.15),
    paidOrderCount: paid, paymentCount: paid + int(1, 5), completedOrderCount: Math.round(paid * 0.92),
    canceledOrderCount: int(2, 6) * scale, averageOrderValue: Math.round(revenue / paid),
  };
}

const today = new Date().toISOString().slice(0, 10);

function order(i) {
  const types = ['SEND', 'RENTAL', 'DRONE_DELIVERY'];
  const type = types[i % 3];
  const status = ['COMPLETED', 'STORING', 'COMPLETED', 'CANCELED', 'COMPLETED', 'AWAITING_DISPATCH'][i % 6];
  const lk = LOCKERS[i % LOCKERS.length];
  const created = new Date(Date.now() - (i * 97 + 30) * 60000).toISOString().slice(0, 19);
  const total = type === 'RENTAL' ? 20000 : type === 'SEND' ? 15000 : 18000;
  return {
    id: 901000 + i, orderCode: `ORD-${created.slice(0, 10).replaceAll('-', '')}-${(36 ** 5 + i * 7919).toString(36).toUpperCase().slice(-6)}`,
    userId: 800101 + i, receiverId: null, lockerId: 800001 + (i % LOCKERS.length), sendBoxId: null, receiveBoxId: null,
    storeId: STORES[lk[2]][0], staffId: null, type, serviceCategory: type === 'DRONE_DELIVERY' ? 'DRONE_DELIVERY' : type === 'SEND' ? 'PARCEL' : 'RENTAL',
    status, deliveryStage: type === 'DRONE_DELIVERY' ? (status === 'COMPLETED' ? 'COMPLETED' : 'AWAITING_DISPATCH') : null,
    pinCode: null, qrToken: null, actualWeight: null, weightUnit: null, extraFee: 0, discount: 0, totalPrice: total,
    originalPrice: total, promotionCode: null, appliedPromotionCodes: null, nextAction: null, nextActionMessage: null,
    paymentRequired: false, paymentStatus: status === 'CANCELED' ? 'UNPAID' : 'PAID', overtime: false, pickupDeadline: null,
    returnedAt: null, completedAt: status === 'COMPLETED' ? created : null, createdAt: created, updatedAt: created,
    orderDetails: [], receiverUserId: null, receiverPhone: null, receiverName: NAMES[(i + 3) % NAMES.length],
    destinationLockerId: null, reservedBoxId: null, fulfillmentMode: type === 'DRONE_DELIVERY' ? 'STANDARD' : null, paidAt: created,
    customer: { id: 800101 + i, fullName: NAMES[i % NAMES.length], phoneNumber: `09${String(10000000 + i * 7316423).slice(-8)}`, email: null },
    receiver: type === 'RENTAL' ? null : { userId: null, name: NAMES[(i + 3) % NAMES.length],
      phone: `08${String(20000000 + i * 5113).slice(-8)}`, email: null, accountFullName: null, accountPhoneNumber: null, accountEmail: null },
    locker: { id: 800001 + (i % LOCKERS.length), code: lk[0], name: lk[1], address: STORES[lk[2]][2], storeId: STORES[lk[2]][0], status: 'ACTIVE' },
    destinationLocker: null,
    store: { id: STORES[lk[2]][0], name: STORES[lk[2]][1], address: STORES[lk[2]][2], contactPhone: null },
    sendBoxNumber: 1 + ((i * 5) % 15), receiveBoxNumber: null, reservedBoxNumber: null,
    fees: { originalPrice: total, reservationFee: 0, storagePrice: total, shippingFee: 0, extraFee: 0, overtimeFee: 0, discount: 0,
      basePrice: total, totalPrice: total },
    payment: status === 'CANCELED' ? null : { paymentCount: 1, latestPaymentId: 970000 + i, latestMethod: 'SEPAY', latestStatus: 'SUCCESS',
      latestAmount: total, latestCreatedAt: created, paidAmount: total, lastPaidMethod: 'SEPAY', lastPaidAt: created,
      refundedAmount: 0, outstandingAmount: 0 },
    drone: null, timeline: null,
  };
}

// Dữ liệu giả theo khu: mỗi file scripts/hdsd/fixtures/<khu>.mjs export default (ctx, h) ⇒ {status, json} | undefined.
// ctx = { url: URL, path, query, method, body }; h = các hàm dựng sẵn bên dưới (ok, order, STORES…). File nào trả
// kết quả trước thì dùng; không file nào nhận thì rơi xuống dữ liệu chung ở hàm adminFixture.
export const helpers = { ok, order, days, period, int, rnd, plain, demoMail, phone, STORES, LOCKERS, STAFF, NAMES, today,
  fail: (status, code, message) => ({ status, json: { success: false, code, message } }) };
const AREA_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const areas = existsSync(AREA_DIR)
  ? await Promise.all(readdirSync(AREA_DIR).filter((f) => f.endsWith('.mjs')).sort()
    .map((f) => import(pathToFileURL(join(AREA_DIR, f)).href).then((m) => ({ name: f, handle: m.default }))))
  : [];

/** Trả {status, json} cho một request /api/**. */
export function adminFixture(urlString, method, body = null) {
  const url = new URL(urlString);
  const p = url.pathname;
  const q = Object.fromEntries(url.searchParams.entries());
  for (const area of areas) {
    const r = area.handle?.({ url, path: p, query: q, method, body }, helpers);
    if (r) return r;
  }
  if (p.startsWith('/api/user/onboarding')) return ok({ autoShow: false, seenGroups: {}, updatedAt: null });
  if (method !== 'GET') return ok(null);
  if (p === '/api/notifications/unread/count') return ok(3);
  if (p.startsWith('/api/notifications')) {
    return ok(['Yêu cầu hoàn tiền mới', 'Ticket mới cần xử lý', 'Drone báo rơi kiện hàng'].map((title, i) => ({
      id: 990000 + i, type: 'SYSTEM', title, message: 'Thông báo mẫu cho ảnh hướng dẫn.', isRead: i > 0,
      createdAt: new Date(Date.now() - i * 3600000).toISOString().slice(0, 19),
    })));
  }
  if (p === '/api/admin/dashboard/overview') {
    return ok({ totalUsers: 74, totalStores: 5, totalLockers: 13, totalOrders: 1186, ordersToday: 46, pendingOrders: 9,
      totalRevenue: 23540000, revenueToday: 912000, activeServices: 3, availableBoxes: 131, occupiedBoxes: 38 });
  }
  if (p === '/api/admin/revenue/summary') {
    const from = q.from ?? `${today.slice(0, 8)}01`;
    const to = q.to ?? today;
    const scale = from === to ? 1 : 22;
    const current = period(from, to, scale);
    const previous = period(from, to, scale);
    const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
    return ok({
      from, to, previousFrom: from, previousTo: to, current, previous,
      changes: { totalRevenuePct: pct(current.totalRevenue, previous.totalRevenue), refundAmountPct: 4.2,
        netRevenuePct: pct(current.netRevenue, previous.netRevenue), orderCountPct: pct(current.orderCount, previous.orderCount),
        paidOrderCountPct: pct(current.paidOrderCount, previous.paidOrderCount), averageOrderValuePct: 1.8 },
      today: period(today, today, 1), thisWeek: period(today, today, 6), thisMonth: period(from, to, 22),
    });
  }
  if (p === '/api/admin/revenue/daily') {
    const list = days(q.from, q.to).filter((d) => d <= today).map((date) => {
      const paid = int(25, 70);
      const revenue = paid * int(16, 24) * 1000;
      return { date, revenue, refundAmount: Math.round(revenue * 0.02), netRevenue: Math.round(revenue * 0.98),
        paidOrderCount: paid, paymentCount: paid + 1, orderCount: paid + int(2, 8) };
    });
    return ok({ from: q.from, to: q.to, totalRevenue: list.reduce((s, d) => s + d.revenue, 0), days: list });
  }
  if (p === '/api/admin/revenue/by-service') {
    const items = [['SEND', 41], ['RENTAL', 33], ['DRONE_DELIVERY', 22], ['OVERTIME_FEE', 4]].map(([serviceType, sharePct]) => {
      const revenue = sharePct * 182000;
      return { serviceType, revenue, refundAmount: 0, netRevenue: revenue, sharePct, orderCount: sharePct * 9,
        paidOrderCount: sharePct * 8, paymentCount: sharePct * 8 };
    });
    return ok({ from: q.from, to: q.to, totalRevenue: items.reduce((s, i) => s + i.revenue, 0), items });
  }
  if (p === '/api/admin/revenue/by-method') {
    const revenue = 18200000;
    return ok({ from: q.from, to: q.to, totalRevenue: revenue, items: [
      { method: 'SEPAY', revenue, refundAmount: 0, netRevenue: revenue, sharePct: 100, paymentCount: 912, paidOrderCount: 890 }] });
  }
  if (p === '/api/admin/revenue/by-store') {
    const items = STORES.map(([storeId, name, address], i) => {
      const revenue = [5420000, 4310000, 3990000, 2480000, 2000000][i];
      return { storeId, name, address, contactPhone: `190068${i}0`, lockerCount: [2, 2, 3, 1, 2][i],
        boxCount: [27, 30, 42, 12, 24][i], orderCount: Math.round(revenue / 17000), paidOrderCount: Math.round(revenue / 18000),
        revenue, refundAmount: 0, netRevenue: revenue, sharePct: Math.round((revenue / 18200000) * 1000) / 10 };
    });
    return ok({ from: q.from, to: q.to, totalRevenue: 18200000, items });
  }
  if (p === '/api/admin/dashboard/peak-hours') {
    const curve = [1, 0, 0, 0, 0, 1, 3, 6, 9, 8, 7, 14, 16, 11, 8, 7, 10, 15, 18, 17, 12, 8, 5, 2];
    return ok(curve.map((orders, hour) => ({ hour, orders: orders * 3 })));
  }
  if (p === '/api/admin/users/growth') {
    const now = new Date();
    return ok(Array.from({ length: 12 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + k, 1);
      return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, newUsers: 2 + k + (k % 3) * 2 };
    }));
  }
  if (p === '/api/admin/users') {
    const given = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khôi', 'Lan', 'Minh', 'Nga', 'Phúc'];
    const customers = Array.from({ length: 22 }, (_, i) => {
      const name = `${NAMES[i % NAMES.length].split(' ').slice(0, 2).join(' ')} ${given[i % given.length]}`;
      const id = 800101 + i;
      const created = new Date(Date.now() - (i * 9 + 2) * 86400000).toISOString().slice(0, 19);
      return { id, fullName: name, email: demoMail(name, id), phoneNumber: phone(id), status: i % 9 === 8 ? 'INACTIVE' : 'ACTIVE',
        roles: ['CUSTOMER'], createdAt: created, updatedAt: created, provider: i % 4 === 0 ? 'GOOGLE' : 'LOCAL', emailVerified: i % 5 !== 4,
        termsAccepted: true, termsAcceptedAt: created, termsVersion: '2026-09', hasPassword: i % 4 !== 0,
        lastLoginAt: new Date(Date.now() - (i * 5 + 1) * 3600000).toISOString().slice(0, 19) };
    });
    const staff = STAFF.map(([id, fullName, role]) => ({ id, fullName, email: demoMail(fullName, id), phoneNumber: phone(id), status: 'ACTIVE',
      roles: [role], createdAt: '2026-06-01T08:00:00', updatedAt: '2026-11-01T08:00:00', provider: 'LOCAL', emailVerified: true,
      termsAccepted: true, termsAcceptedAt: '2026-06-01T08:00:00', termsVersion: '2026-09', hasPassword: true, lastLoginAt: '2026-11-20T08:10:00' }));
    const list = [...staff, ...customers];
    return ok({ content: list, totalElements: list.length, totalPages: 1, number: 0, size: 1000 });
  }
  if (p === '/api/admin/stores') {
    return ok(STORES.map(([id, name, address]) => ({ id, name, address, status: 'ACTIVE', active: true })));
  }
  if (p === '/api/admin/lockers') {
    const content = LOCKERS.map(([code, name, si], i) => ({
      id: 800001 + i, code, name, address: STORES[si][2], storeId: STORES[si][0], storeName: STORES[si][1],
      status: 'ACTIVE', totalBoxes: 15, availableBoxes: 15 - int(2, 6), boxes: [], createdAt: '2026-05-01T09:00:00',
      updatedAt: '2026-11-20T09:00:00', landingPad: true, online: true,
      ...(i === 6 ? { status: 'MAINTENANCE' } : {}),
      assignedTechnicianId: i === 9 ? null : STAFF[i % 2][0], assignedTechnicianName: i === 9 ? null : STAFF[i % 2][1],
    }));
    return ok({ content, totalElements: content.length, totalPages: 1, number: 0, size: 1000 });
  }
  if (p === '/api/admin/drones') {
    const st = ['IDLE', 'IN_FLIGHT', 'CHARGING', 'IDLE', 'FAULT', 'IDLE', 'MAINTENANCE', 'CHARGING', 'IDLE'];
    return ok(st.map((status, i) => {
      const lk = LOCKERS[(i * 3) % LOCKERS.length];
      return { id: 800301 + i, code: `DRN-${String(i + 1).padStart(3, '0')}`, status, batteryPercent: [96, 71, 34, 88, 52, 100, 63, 18, 79][i],
        lockerId: 800001 + ((i * 3) % LOCKERS.length), lockerName: lk[1], faultReason: status === 'FAULT' ? 'Cảm biến GPS mất tín hiệu' : null,
        assignedTechnicianId: STAFF[2 + (i % 2)][0], assignedTechnicianName: STAFF[2 + (i % 2)][1],
        lastChargedAt: new Date(Date.now() - (i + 1) * 5400000).toISOString().slice(0, 19), active: true,
        createdAt: '2026-07-01T08:00:00', updatedAt: '2026-11-20T08:00:00' };
    }));
  }
  if (p === '/api/admin/payments/refunds') {
    const status = url.searchParams.getAll('status');
    const counts = { PENDING: 4, COMPLETED: 27, REJECTED: 3 };
    const total = status.length ? status.reduce((n, x) => n + (counts[x] ?? 0), 0) : 34;
    const size = Number(q.size ?? 20);
    const want = status.length === 1 ? status[0] : 'PENDING';
    const banks = [['Vietcombank', 'VCB'], ['Techcombank', 'TCB'], ['MB Bank', 'MB'], ['ACB', 'ACB']];
    const reasons = ['Tủ báo lỗi, không mở được ô', 'Huỷ đơn trước khi gửi hàng', 'Drone không bay được do thời tiết', 'Thu trùng phí quá hạn'];
    const content = Array.from({ length: Math.min(size, counts[want] ?? 4) }, (_, i) => {
      const o = order(i * 2 + 1);
      const [bankName, bankCode] = banks[i % banks.length];
      const requested = new Date(Date.now() - (i * 7 + 3) * 3600000).toISOString().slice(0, 19);
      return { id: 960000 + i, paymentId: 970000 + i, orderId: o.id, amount: o.totalPrice, status: want, reason: reasons[i % reasons.length],
        transactionId: null, processedByUserId: null, requestedAt: requested, processedAt: null, userId: o.userId, paymentMethod: 'SEPAY',
        paymentAmount: o.totalPrice, paymentReferenceId: `SP${970000 + i}`, bankName, bankCode,
        accountNumber: String(1023456789 + i * 1111), accountHolderName: plain(o.customer.fullName).toUpperCase(),
        rejectionReason: null, bankTransferRef: null, proofImageUrl: null, customerAttachmentUrl: null,
        order: { id: o.id, orderCode: o.orderCode, type: o.type, serviceCategory: o.serviceCategory, status: 'CANCELED', paymentStatus: 'PAID',
          totalPrice: o.totalPrice, lockerId: o.lockerId, createdAt: o.createdAt },
        customer: o.customer, processedBy: null };
    });
    return ok({ content, page: 0, size, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)) });
  }
  if (p === '/api/admin/orders/search' && url.searchParams.getAll('status').includes('EXPIRED')) {
    const size = Number(q.size ?? 20);
    const pay = url.searchParams.getAll('paymentStatus');
    const unpaidOnly = pay.includes('UNPAID') && !pay.includes('PAID');
    const paidOnly = pay.includes('PAID') && !pay.includes('UNPAID');
    const total = unpaidOnly ? 5 : paidOnly ? 3 : 8;
    const content = Array.from({ length: Math.min(size, total) }, (_, i) => {
      const o = order(i * 3 + 2);
      const stored = new Date(Date.now() - (i * 19 + 6) * 3600000).toISOString().slice(0, 19);
      const owes = unpaidOnly || (!paidOnly && i % 3 !== 2);
      const fee = 10000 + i * 5000;
      return { ...o, status: 'EXPIRED', type: 'SEND', serviceCategory: 'PARCEL', overtime: true, extraFee: fee,
        fees: { ...o.fees, extraFee: fee, overtimeFee: fee, totalPrice: o.totalPrice + fee },
        paymentStatus: owes ? 'UNPAID' : 'PAID', pickupDeadline: stored,
        storage: { storedAt: stored, movedByUserId: null, movedByName: null, note: null } };
    });
    return ok({ content, page: 0, size, totalElements: total, totalPages: 1 });
  }
  if (p === '/api/admin/orders/search') {
    const content = Array.from({ length: 12 }, (_, i) => order(i));
    return ok({ content, page: 0, size: 20, totalElements: 1186, totalPages: 60 });
  }
  return { status: 503, json: { success: false, code: 'HDSD_FIXTURE_MISSING', message: `Chưa có dữ liệu mẫu cho ${p}` } };
}

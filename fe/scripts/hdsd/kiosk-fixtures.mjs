// Dữ liệu giả cho ảnh HDSD kiosk (màn cảm ứng tại tủ, repo iot ui/) — chỉ dùng khi chụp, tên/số/mã đều giả.
// scripts/hdsd/kiosk.mjs chặn MỌI request của trang kiosk và trả từ đây; không request nào ra production.
//
// kioskFixture({ url, path, query, method, body }, scenario) ⇒ { status, json } | undefined (undefined = chưa có
// dữ liệu mẫu ⇒ kiosk.mjs trả 503 HDSD_FIXTURE_MISSING và in cảnh báo).
// `scenario` là cờ của nhóm đang chụp (KIOSK_FLOW trong kiosk.mjs), để cùng một API trả kết quả khác nhau:
//   paid        — đơn thuê vừa tạo đã được ghi nhận thanh toán (màn sau khi trả tiền)
//   unlockFails — lệnh mở ô sau khi trả tiền không thành công (màn "Mở ô tủ #…" để thử lại)
//   checkoutFails — tạo mã VietQR lỗi (màn thanh toán dự phòng)
//   unpaired    — Pi chưa được gán vào tủ nào (màn chờ gán của KTV)
import { helpers as h } from './admin-fixtures.mjs';

export const LOCKER_ID = 800001;
export const LOCKER_CODE = h.LOCKERS[0][0];
/** Email khách gõ trên màn đăng nhập, mã OTP, mã khuyến mãi và các mã mở ô dùng trong ảnh (đều giả). */
export const DEMO = {
  email: 'khachhang@demo.lockr.test',
  otp: '246810',
  promo: 'LOCKR10',
  rentalPin: '482915', // mã của lượt thuê đang chạy ⇒ "Ô Tủ #3" hỏi kết thúc thuê hay dùng tiếp
  wrongCode: '111111', // mã sai ⇒ "Mã không hợp lệ hoặc đã hết hạn"
  busyCode: '222222', // hệ thống chưa tra được đơn ⇒ nút "Thử lại"
};

const [STORE_ID, STORE_NAME, STORE_ADDRESS] = h.STORES[0];
const CUSTOMER = h.NAMES[0];
const box = (n) => 810000 + n;

// Sơ đồ tủ giả 3 cột × 4 hàng: ô drone dưới bãi đáp, hai ô XL cao 2 hàng, một chỗ trống là màn hình kiosk.
const CELLS = [
  [1, 'STANDARD', 0, 0, 'AVAILABLE'], [2, 'STANDARD', 1, 0, 'OCCUPIED'], [3, 'STANDARD', 2, 0, 'OCCUPIED'],
  [4, 'STANDARD', 3, 0, 'AVAILABLE'], [5, 'DRONE', 0, 1, 'AVAILABLE'], [6, 'STANDARD', 2, 1, 'AVAILABLE'],
  [7, 'STANDARD', 3, 1, 'PENDING_CHECK'], [8, 'XL', 0, 2, 'AVAILABLE'], [9, 'XL', 2, 2, 'RESERVED'],
].map(([n, cellType, rowIndex, colIndex, status]) => ({ id: box(n), boxId: box(n), boxNumber: n, cellType, rowIndex, colIndex, status }));

const AVAILABLE = CELLS.filter((c) => c.status === 'AVAILABLE' && c.cellType !== 'DRONE').length;

// Lượt thuê đang chạy của khách ở ô 3 ⇒ ô hiện "Ô của bạn", bấm vào mở hộp "Quản lý Ô tủ #3".
const MY_RENTAL = {
  id: 902001, orderCode: 'ORD-20261121-K7Q2MD', type: 'RENTAL', status: 'STORING', lockerId: LOCKER_ID,
  sendBoxId: box(3), receiveBoxId: null, pinCode: DEMO.rentalPin, qrToken: 'LLQR.hdsd.demo-thue-o-3',
  isPaid: true, paymentStatus: 'PAID', totalPrice: 20000,
};
const NEW_ORDER_ID = 902100;
const PAYMENT_ID = 970100;

const RATES = { STANDARD: [5000, 40000], XL: [10000, 80000] };
function rentalPrice(hours, cellType) {
  const [hourly, daily] = RATES[cellType] ?? RATES.STANDARD;
  const cap = Math.min(daily, hourly * 24);
  return Math.floor(hours / 24) * cap + Math.min((hours % 24) * hourly, cap);
}

const ok = (data) => ({ status: 200, json: { success: true, code: 'OK', data } });
const fail = (status, code, message) => ({ status, json: { success: false, code, message } });
const denied = (message, reasonCode = null) => ok({ accepted: false, message, reasonCode });

let lastHours = 4;
let lastCell = 'STANDARD';

export function kioskFixture({ path, method, body }, scenario = {}) {
  // API cục bộ của Pi (FastAPI :8000): trạng thái gán tủ.
  if (path === '/system/state') return { status: 200, json: { isConfigured: !scenario.unpaired } };
  if (path === '/system/info') {
    return { status: 200, json: { macAddress: 'DC:A6:32:5E:00:2A', ipAddress: '192.168.1.42', version: '1.4.0', isConfigured: !scenario.unpaired } };
  }
  if (path.startsWith('/logs') || path.startsWith('/config') || path === '/health') return { status: 200, json: {} };

  // ── Tủ và ô
  if (method === 'GET' && path === `/api/lockers/${LOCKER_ID}`) {
    return ok({ id: LOCKER_ID, code: LOCKER_CODE, name: h.LOCKERS[0][1], storeId: STORE_ID, storeName: STORE_NAME,
      address: STORE_ADDRESS, status: 'ACTIVE', totalBoxes: CELLS.length, availableBoxes: AVAILABLE });
  }
  if (method === 'GET' && path === `/api/lockers/${LOCKER_ID}/layout`) return ok({ lockerId: LOCKER_ID, cells: CELLS });
  if (method === 'GET' && path === `/api/lockers/${LOCKER_ID}/boxes`) {
    return ok(CELLS.map(({ boxId, boxNumber, status, cellType }) => ({ boxId, boxNumber, status, type: cellType })));
  }
  if (method === 'GET' && path === '/api/lockers') return ok([{ id: LOCKER_ID, code: LOCKER_CODE, name: h.LOCKERS[0][1] }]);
  if (method === 'POST' && path === `/api/lockers/${LOCKER_ID}/report`) return ok({ id: 4127, status: 'OPEN', ...body });

  // ── Đăng nhập OTP email (số điện thoại đi qua Firebase — không chụp)
  if (method === 'POST' && path === '/api/auth/email/send-otp') return ok({ sent: true });
  if (method === 'POST' && path === '/api/auth/email/verify-otp') {
    return ok({ accessToken: 'hdsd.fake.jwt', newUser: false, userInfo: { id: 800101, fullName: CUSTOMER, email: DEMO.email } });
  }
  if (method === 'POST' && path === '/api/auth/kiosk/quick-register') return ok({ accessToken: 'hdsd.fake.jwt' });

  // ── Quy tắc công khai admin cấu hình
  if (method === 'GET' && path === '/api/settings/order/public') {
    return ok({
      'app.order.rental-rate-standard': RATES.STANDARD[0], 'app.order.rental-rate-xl': RATES.XL[0],
      'app.order.rental-daily-rate-standard': RATES.STANDARD[1], 'app.order.rental-daily-rate-xl': RATES.XL[1],
      'app.order.rental-min-hours': 1, 'app.order.rental-max-hours': 72, 'app.order.rental-quick-hours': '2,4,8,12',
      'app.order.rental-default-hours': 4,
    });
  }
  // Nút "Giả lập thanh toán (test)" chỉ dành cho môi trường thử ⇒ tắt trong ảnh HDSD.
  if (method === 'GET' && path === '/api/settings/payment/public') return ok({ 'app.payment.simulation-enabled': false });
  if (method === 'GET' && path.startsWith('/api/promotions/validate/')) {
    const code = decodeURIComponent(path.split('/').pop());
    if (code !== DEMO.promo) return ok({ code, valid: false, reason: 'Mã không tồn tại hoặc đã hết hạn', promotion: null });
    return ok({ code, valid: true, reason: null, promotion: { code, title: 'Giảm 10% lượt thuê', discountType: 'PERCENTAGE',
      discountValue: 10, maxDiscountAmount: 20000, minOrderAmount: 0 } });
  }

  // ── Đơn thuê + thanh toán VietQR
  if (method === 'GET' && path === '/api/orders/my-orders') return ok([MY_RENTAL]);
  if (method === 'POST' && path === '/api/orders/rental') {
    lastHours = Number(body?.hours) || 4;
    lastCell = body?.cellType === 'XL' ? 'XL' : 'STANDARD';
    return ok({ id: NEW_ORDER_ID, orderCode: 'ORD-20261121-R8T4VX', pinCode: '730416', type: 'RENTAL', status: 'INITIALIZED',
      totalPrice: rentalPrice(lastHours, lastCell) });
  }
  if (method === 'POST' && path === '/api/payments/checkout') {
    if (scenario.checkoutFails) return fail(502, 'ORDER_LOOKUP_FAILED', 'Không lấy được thông tin đơn.');
    // Chuỗi QR không phải liên kết ảnh ⇒ kiosk tự vẽ mã bằng qrcode.react (không tải ảnh VietQR thật).
    return ok({ id: PAYMENT_ID, orderId: NEW_ORDER_ID, method: 'SEPAY', status: 'PENDING', amount: rentalPrice(lastHours, lastCell),
      referenceId: `LOCKR${NEW_ORDER_ID}`, qrCodeUrl: `LOCKR-HDSD-DEMO|${NEW_ORDER_ID}|khong-phai-ma-chuyen-khoan-that` });
  }
  if (method === 'GET' && /^\/api\/orders\/\d+\/status$/.test(path)) {
    const paid = path.includes(String(MY_RENTAL.id)) || !!scenario.paid;
    return ok({ status: paid ? 'STORING' : 'INITIALIZED', paymentStatus: paid ? 'PAID' : 'UNPAID', isPaid: paid });
  }
  if (method === 'GET' && path === `/api/payments/${PAYMENT_ID}`) {
    return ok({ id: PAYMENT_ID, status: scenario.paid ? 'COMPLETED' : 'PENDING', amount: rentalPrice(lastHours, lastCell) });
  }
  if (method === 'PUT' && /^\/api\/orders\/\d+\/(cancel|confirm)$/.test(path)) return ok({ id: NEW_ORDER_ID, status: 'CANCELED' });
  if (method === 'POST' && path === '/api/payments/simulate') return ok({ id: PAYMENT_ID, status: 'COMPLETED' });

  // ── Mở ô (IoT)
  if (method === 'POST' && path === '/api/iot/unlock') {
    if (scenario.unlockFails) return denied('Tủ chưa phản hồi lệnh mở ô. Vui lòng thử lại.');
    return ok({ accepted: true, message: 'Ô đã mở. Vui lòng đóng cửa khi xong.', boxId: body?.boxId ?? null });
  }
  if (method === 'POST' && path === '/api/iot/unlock-with-code') {
    const code = String(body?.code ?? '').trim();
    if (code === DEMO.rentalPin) return ok({ accepted: true, nextStep: 'RENTAL_ACCESS', boxId: box(3), orderId: MY_RENTAL.id });
    if (code === DEMO.busyCode) {
      return denied('Hệ thống đang bận, chưa kiểm tra được mã. Vui lòng thử lại sau ít phút.', 'ORDER_LOOKUP_UNAVAILABLE');
    }
    if (code === DEMO.wrongCode) return denied('Mã không hợp lệ hoặc đã hết hạn');
    return ok({ accepted: true, nextStep: null, boxId: box(2), orderId: 902050 });
  }
  if (method === 'POST' && ['/api/iot/confirm-drop-with-code', '/api/iot/end-rental-with-code'].includes(path)) {
    return ok({ accepted: true, message: 'Đã ghi nhận.' });
  }
  if (method === 'POST' && /^\/api\/orders\/\d+\/pickup-storage$/.test(path)) return ok({ id: MY_RENTAL.id, status: 'COMPLETED' });
  if (method === 'POST' && path === '/api/iot/pickup') return ok({ accepted: true });
  return undefined;
}

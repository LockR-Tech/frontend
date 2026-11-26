// Dữ liệu giả cho ảnh HDSD khu admin-system (khung chung, dashboard, thông báo, phản hồi, lập lịch, cấu hình nghiệp vụ,
// kho tri thức, trang HDSD, đăng nhập 2FA) — chỉ dùng khi chụp, tên/số giả, email @demo.lockr.test.

const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString().slice(0, 19);

// ------------------------------------------------------------------------------------------------ dashboard
const BY_STATUS = { INITIALIZED: 9, AWAITING_DISPATCH: 4, STORING: 31, EXPIRED: 6, COMPLETED: 1072, CANCELED: 64 };

// ------------------------------------------------------------------------------------------------ chuông thông báo
const INBOX = [
  ['REFUND_REQUESTED', 'Yêu cầu hoàn tiền mới', 'Khách yêu cầu hoàn 15.000 đ cho đơn gửi hàng bị huỷ.', false, 12, null, null],
  ['LOCKER_REPORT_CREATED', 'Sự cố tủ mới', 'Ô số 7 tại Tủ Vincom Đồng Khởi – Sảnh B1 không mở được cửa.', false, 48, 'LOCKER_REPORT', 950101],
  ['DRONE_INCIDENT', 'Drone báo lỗi la bàn', 'DRN-001 dừng nhiệm vụ, chờ kỹ thuật viên kiểm tra.', true, 150, 'DRONE_INCIDENT', null],
  ['PAYMENT_COMPLETED', 'Thanh toán thành công', 'Đơn thuê ô đã được thanh toán qua chuyển khoản.', true, 240, null, null],
  ['SYSTEM', 'Đã chạy đối soát trạng thái ô', 'Đã nhả 2 ô không còn đơn giữ.', true, 600, null, null],
];

// ------------------------------------------------------------------------------------------------ quản lý thông báo
const NOTIF_SAMPLES = [
  ['ORDER_PARCEL_READY', 'Hàng đã sẵn sàng để nhận', 'Đơn của bạn đang chờ ở Tủ Landmark 81 – Tầng hầm B1, ô số 4.'],
  ['ORDER_PICKUP_OVERDUE', 'Quá hạn lấy hàng', 'Đơn gửi hàng đã quá hạn lấy 2 giờ, phí quá hạn đang được tính.'],
  ['PAYMENT_COMPLETED', 'Thanh toán thành công', 'Đã nhận 20.000 đ cho đơn thuê ô.'],
  ['OPEN_PROMOTION_TAB', 'Ưu đãi cuối tuần', 'Giảm 20% phí thuê ô tại các tủ ở Thủ Đức đến hết Chủ nhật.'],
  ['REFUND_COMPLETED', 'Đã hoàn tiền', 'Đã chuyển 15.000 đ về tài khoản nhận hoàn tiền của bạn.'],
  ['DRONE_DELIVERY_STATUS_CHANGED', 'Drone đang giao hàng', 'Kiện hàng của bạn đang bay tới Tủ FPT Software F-Town 3.'],
  ['SYSTEM', 'Bảo trì tủ theo lịch', 'Tủ Crescent Mall – Tầng trệt tạm ngưng nhận hàng 30 phút để bảo trì.'],
  ['FEEDBACK_REPLY', 'Lock.R đã trả lời đánh giá', 'Cảm ơn bạn đã góp ý về tốc độ mở cửa ô.'],
  ['ORDER_CREATED', 'Đã tạo đơn gửi hàng', 'Mang hàng tới tủ trong 30 phút để giữ ô.'],
];

function adminNotifications(h) {
  return Array.from({ length: 18 }, (_, i) => {
    const [type, title, message] = NOTIF_SAMPLES[i % NOTIF_SAMPLES.length];
    const read = i % 3 !== 0;
    const created = 25 + i * 173;
    return {
      id: 970500 + (18 - i), type, status: read ? 'READ' : 'UNREAD', userId: 800101 + (i % 12), title, message,
      createdAt: ago(created), sentAt: ago(created), readAt: read ? ago(created - 4 - (i % 5) * 3) : null,
      referenceType: type.startsWith('ORDER_') ? 'ORDER' : null, referenceId: type.startsWith('ORDER_') ? 901000 + i : null,
    };
  }).concat({
    id: 970400, type: 'SYSTEM', status: 'READ', userId: h.STAFF[0][0], title: 'Phân công sự cố mới',
    message: 'Bạn được giao xử lý sự cố ô số 7.', createdAt: ago(3200), sentAt: ago(3200), readAt: ago(3190),
    referenceType: null, referenceId: null,
  });
}

// ------------------------------------------------------------------------------------------------ phản hồi khách hàng
const COMMENTS = [
  [5, 'Mở tủ nhanh, có thông báo ngay khi hàng tới. Rất tiện!'],
  [4, 'Dịch vụ ổn, mong có thêm tủ ở khu Thảo Điền.'],
  [2, 'Cửa ô số 7 phải bấm hai lần mới mở được.'],
  [5, 'Drone giao đúng giờ, đóng gói cẩn thận.'],
  [3, 'Phí quá hạn hơi cao so với thời gian trễ.'],
  [1, 'Không nhận được mã lấy hàng qua thông báo.'],
  [4, 'Ứng dụng dễ dùng, thanh toán chuyển khoản nhanh.'],
  [5, 'Nhân viên hỗ trợ đổi ô rất nhiệt tình.'],
];

function feedbackItem(h, i) {
  const [rating, comment] = COMMENTS[i % COMMENTS.length];
  const id = 980300 - i;
  const userId = 800101 + ((i * 3) % 20);
  const name = `${h.NAMES[i % h.NAMES.length]}`;
  const created = ago(90 + i * 611);
  const o = h.order(i * 2);
  return {
    id, userId, userName: name, email: h.demoMail(name, userId), rating, comment, relatedOrderId: o.id, orderCode: o.orderCode,
    orderDescription: null, isResolved: i === 0 || i % 3 === 1, replied: i === 0 || i % 4 === 1, createdAt: created, updatedAt: created,
  };
}

function feedbackPage(h, q) {
  let list = Array.from({ length: 14 }, (_, i) => feedbackItem(h, i));
  if (q.minRating) list = list.filter((f) => f.rating >= Number(q.minRating) && f.rating <= Number(q.maxRating ?? 5));
  if (q.isResolved) list = list.filter((f) => String(f.isResolved) === q.isResolved);
  return { content: list, page: 0, size: Number(q.size ?? 20), totalElements: list.length, totalPages: 1 };
}

function feedbackDetail(h, id) {
  const i = Math.max(0, 980300 - id);
  const f = feedbackItem(h, i);
  const o = h.order(i * 2);
  return {
    id: f.id, userId: f.userId, userName: f.userName, userEmail: f.email, userPhone: h.phone(f.userId), rating: f.rating,
    comment: f.comment, relatedOrderId: o.id, orderCode: o.orderCode, serviceType: o.type, orderAmount: o.totalPrice,
    adminReply: f.replied ? 'Cảm ơn bạn đã dùng Lock.R! Chúng tôi đã chuyển góp ý tới đội vận hành.' : null,
    repliedAt: f.replied ? ago(60) : null, resolvedBy: f.isResolved ? 'Quản trị viên demo' : null,
    resolvedAt: f.isResolved ? ago(45) : null, createdAt: f.createdAt, updatedAt: f.isResolved ? ago(45) : f.createdAt,
  };
}

function feedbackAnalytics(period) {
  const n = period === 'day' ? 14 : 12;
  const trends = Array.from({ length: n }, (_, k) => {
    const back = n - 1 - k;
    const d = new Date();
    if (period === 'day') d.setDate(d.getDate() - back);
    else if (period === 'week') d.setDate(d.getDate() - back * 7);
    else d.setMonth(d.getMonth() - back, 1);
    const count = [3, 5, 4, 7, 6, 9, 8, 11, 7, 10, 12, 9, 6, 8][k];
    return { date: d.toISOString().slice(0, 10), count, avgRating: 3.6 + ((k * 7) % 12) / 10 };
  });
  return {
    averageRating: 4.1, totalFeedback: 214, ratingDistribution: { 5: 108, 4: 54, 3: 26, 2: 15, 1: 11 },
    feedbackToday: 3, feedbackThisWeek: 17, feedbackThisMonth: 52, trends, unresolvedCount: 9,
  };
}

const SATISFACTION = {
  overallSatisfactionScore: 82, npsScore: 30, positivePercentage: 76, negativePercentage: 12,
  mostCommonComplaint: 'Cửa ô khó mở', topServiceQuality: 'DRONE_DELIVERY',
  departmentScores: { SEND: 4.2, RENTAL: 4.0, DRONE_DELIVERY: 4.5 },
};

// ------------------------------------------------------------------------------------------------ cấu hình nghiệp vụ
const SCOPE_RULES = {
  locker: [['app.locker.report-sla-hours', 'Hạn xử lý sự cố', 'Bảo trì', 'INTEGER', '4', '4', 'giờ'],
    ['app.locker.demo.visible', 'Hiện tủ demo cho khách', 'Giả lập & demo', 'BOOLEAN', 'true', 'true', null]],
  payment: [['app.payment.topup-max-amount', 'Hạn mức nạp ví mỗi lần', 'Ví', 'INTEGER', '2000000', '2000000', 'đ'],
    ['app.payment.simulation-enabled', 'Hiện nút giả lập thanh toán', 'Giả lập thanh toán (test)', 'BOOLEAN', 'true', 'false', null]],
  iot: [['app.iot.max-wrong-pin', 'Số lần nhập sai PIN trước khi khoá tạm', 'Bảo mật', 'INTEGER', '5', '5', 'lần'],
    ['app.iot.ble-test.enabled', 'Cho tài khoản thử mở ô qua Bluetooth', 'Thử tủ bằng QR (không cần đơn)', 'BOOLEAN', 'true', 'true', null],
    ['app.iot.test-open.enabled', 'Cho tài khoản thử mở ô bằng QR', 'Thử tủ bằng QR (không cần đơn)', 'BOOLEAN', 'false', 'false', null]],
  auth: [['app.auth.otp-ttl-seconds', 'Hiệu lực mã OTP', 'OTP', 'INTEGER', '300', '300', 'giây']],
  loyalty: [['app.loyalty.points-per-order', 'Điểm cộng mỗi đơn', 'Điểm', 'INTEGER', '10', '10', 'điểm']],
  store: [['app.store.nearby-radius-km', 'Bán kính tìm cửa hàng gần', 'Tìm kiếm', 'INTEGER', '5', '5', 'km'],
    ['app.store.demo.visible', 'Hiện điểm gửi demo cho khách', 'Giả lập & demo', 'BOOLEAN', 'true', 'true', null]],
  assistant: [['app.assistant.enabled', 'Bật trợ lý hỏi đáp', 'Chung', 'BOOLEAN', 'true', 'true', null],
    ['app.assistant.min-score', 'Ngưỡng liên quan tối thiểu', 'Truy xuất', 'DECIMAL', '0.35', '0.35', null]],
  order: [['app.order.send-base-fee', 'Phí gửi hàng mỗi đơn', 'Giá & phí', 'INTEGER', '15000', '15000', 'đ'],
    ['app.drone.demo.enabled', 'Cho phép chế độ drone DEMO', 'Mô phỏng & Thử nghiệm Drone', 'BOOLEAN', 'true', 'true', null],
    ['app.drone.lid-test.enabled', 'Chế độ thử nắp trượt theo mã ArUco', 'Mô phỏng & Thử nghiệm Drone', 'BOOLEAN', 'false', 'false', null]],
};

function settingViews(scope) {
  return (SCOPE_RULES[scope] ?? []).map(([key, label, group, type, value, defaultValue, unit], i) => ({
    scope, key, group, label, description: null, type, value, defaultValue, overridden: value !== defaultValue,
    min: type === 'BOOLEAN' ? null : '0', max: null, unit, allowedValues: null, publicValue: i === 0,
    updatedByUserId: null, updatedAt: '2026-11-15T03:20:00',
  }));
}

function settingAudits(scope) {
  const key = (SCOPE_RULES[scope] ?? SCOPE_RULES.order)[0][0];
  return [
    { id: 990103, key: 'app.order.pickup-overtime-fee-per-hour', oldValue: '4000', newValue: '5000', actorUserId: 800205, changedAt: ago(1500) },
    { id: 990102, key, oldValue: '12000', newValue: null, actorUserId: 800205, changedAt: ago(4300) },
    { id: 990101, key: 'app.order.send-pickup-hours-limit', oldValue: '24', newValue: '48', actorUserId: 800205, changedAt: ago(10100) },
  ];
}

// ------------------------------------------------------------------------------------------------ kho tri thức
const DOCS = [
  ['Hướng dẫn khách hàng gửi hàng', 'huong-dan-gui-hang.md', 'text/markdown', ['ALL'], 18],
  ['Bảng giá và phí quá hạn', 'bang-gia.md', 'text/markdown', ['ALL'], 7],
  ['Câu hỏi thường gặp về giao hàng bằng drone', 'faq-drone.pdf', 'application/pdf', ['CUSTOMER', 'DRONE_TECHNICIAN'], 11],
  ['Quy trình KTV tủ xử lý sự cố', 'quy-trinh-ktv-tu.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['LOCKER_TECHNICIAN'], 9],
  ['Điều khoản sử dụng', 'dieu-khoan.html', 'text/html', ['ALL'], 14],
  ['Chính sách quyền riêng tư', 'chinh-sach-rieng-tu.html', 'text/html', ['ALL'], 0],
];

function knowledgeDocs() {
  return DOCS.map(([title, fileName, mimeType, allowedRoles, chunkCount], i) => {
    const failed = chunkCount === 0;
    return {
      id: 960700 + i, title, fileName, mimeType, status: failed ? 'FAILED' : 'READY', allowedRoles,
      sizeBytes: 4200 + i * 9137, chunkCount, error: failed ? 'Dịch vụ nhúng tạm thời từ chối yêu cầu (quá giới hạn tốc độ). Đánh chỉ mục lại sau ít phút.' : null,
      createdBy: 800205, createdAt: ago(20000 - i * 1500), updatedAt: ago(19000 - i * 1500), indexedAt: failed ? null : ago(18900 - i * 1500),
    };
  });
}

const CHUNKS = [
  [null, 'Lock.R là hệ thống tủ khoá thông minh: gửi hàng cho người khác, thuê ô để cất đồ, hoặc đặt drone giao tới tủ gần nơi nhận.'],
  ['Gửi hàng › Tạo đơn', 'Mở app, chọn "Gửi hàng", nhập SĐT người nhận và chọn tủ. Ô được giữ 30 phút để bạn mang hàng tới.'],
  ['Gửi hàng › Bỏ hàng vào ô', 'Tại tủ, quét mã QR trên màn hình kiosk hoặc nhập mã PIN, đặt hàng vào ô rồi đóng cửa. Người nhận nhận thông báo ngay.'],
  ['Nhận hàng › Quá hạn', 'Quá hạn lấy hàng sẽ tính phí theo giờ theo bảng giá hiện hành; quá lâu đơn được chuyển về kho, nhận lại tại quầy.'],
];

const CONVERSATIONS = [
  'Quá hạn lấy hàng thì tính phí thế nào?', 'Làm sao chia sẻ mã lấy hàng cho người thân?', 'Drone có giao vào ban đêm không?',
  'Thuê ô theo ngày giá bao nhiêu?', null, 'Tôi quên mã PIN mở ô thì làm sao?', 'Hoàn tiền mất bao lâu?', 'Tủ ở Thủ Đức mở cửa mấy giờ?',
];

function conversation(i) {
  return {
    id: 961500 - i, userId: 800101 + ((i * 5) % 20), title: CONVERSATIONS[i], messageCount: 2 + (i % 3) * 2,
    createdAt: ago(200 + i * 900), updatedAt: ago(150 + i * 900),
  };
}

function conversationDetail(id) {
  const c = conversation(Math.max(0, Math.min(7, 961500 - id)));
  const src = { documentId: 960701, documentTitle: 'Bảng giá và phí quá hạn', chunkId: 962004, heading: 'Nhận hàng › Quá hạn',
    citedText: 'Quá hạn lấy hàng sẽ tính phí theo giờ theo bảng giá hiện hành.' };
  return {
    conversation: { ...c, messageCount: 4 },
    messages: [
      { id: 963001, role: 'USER', content: c.title ?? 'Xin chào', refused: false, sources: null, topScore: null, createdAt: c.createdAt },
      { id: 963002, role: 'ASSISTANT', content: 'Quá hạn lấy hàng, hệ thống tính phí theo từng giờ trễ (có thời gian ân hạn ngắn) và có mức trần mỗi đơn. Bạn xem mức phí cụ thể trong chi tiết đơn.',
        refused: false, sources: [src], topScore: 0.62, createdAt: c.createdAt },
      { id: 963003, role: 'USER', content: 'Còn giá vé xem phim hôm nay?', refused: false, sources: null, topScore: null, createdAt: c.updatedAt },
      { id: 963004, role: 'ASSISTANT', content: 'Tài liệu hiện có chưa đề cập nội dung này.', refused: true, sources: [], topScore: 0.21, createdAt: c.updatedAt },
    ],
  };
}

const EVAL_CASES = [
  ['Quá hạn nhận đồ thì bị tính phí thế nào?', ['CUSTOMER'], 'Bảng giá và phí quá hạn', false],
  ['Làm sao gửi hàng cho người khác?', ['CUSTOMER'], 'Hướng dẫn khách hàng gửi hàng', false],
  ['Drone bay được khi trời mưa không?', ['CUSTOMER'], 'Câu hỏi thường gặp về giao hàng bằng drone', false],
  ['Quy trình thay khoá điện ô tủ?', ['LOCKER_TECHNICIAN'], 'Quy trình KTV tủ xử lý sự cố', false],
  ['Quy trình thay khoá điện ô tủ?', ['CUSTOMER'], null, true],
  ['Hôm nay giá vàng bao nhiêu?', ['CUSTOMER'], null, true],
];

// ------------------------------------------------------------------------------------------------ bộ định tuyến
export default function system({ path, query, method }, h) {
  // Đăng nhập quản trị (nhóm signedOut): bước 1 trả token tạm để trang chuyển sang nhập mã 2FA.
  if (method === 'POST' && path === '/api/admin/auth/login') {
    return h.ok({ requiresTwoFactor: true, tempToken: 'hdsd-temp-token', maskedEmail: 'q***@demo.lockr.test', expiresIn: 300,
      message: 'Đã gửi mã xác thực' });
  }
  if (method === 'POST' && path === '/api/admin/auth/verify-2fa') {
    return h.fail(400, 'ADMIN_AUTH_OTP_INVALID', 'Mã xác thực không đúng');
  }
  if (method !== 'GET') return undefined;

  if (path === '/api/admin/dashboard/overview') {
    return h.ok({ totalUsers: 74, totalStores: 5, totalLockers: 13, totalOrders: 1186, ordersToday: 46, pendingOrders: 50,
      totalRevenue: 23540000, revenueToday: 912000, activeServices: 3, availableBoxes: 131, occupiedBoxes: 38, byStatus: BY_STATUS });
  }

  if (path === '/api/notifications' || path === '/api/notifications/all') {
    return h.ok(INBOX.map(([type, title, message, isRead, minutes, referenceType, referenceId], i) => ({
      id: 990100 + i, type, title, message, isRead, createdAt: ago(minutes), referenceType, referenceId,
    })));
  }
  if (path === '/api/notifications/unread/count') return h.ok(INBOX.filter((n) => !n[3]).length);

  if (path === '/api/admin/notifications') return h.ok(adminNotifications(h));

  if (path === '/api/admin/feedback') return h.ok(feedbackPage(h, query));
  let m = path.match(/^\/api\/admin\/feedback\/(\d+)$/);
  if (m) return h.ok(feedbackDetail(h, Number(m[1])));
  if (path === '/api/admin/analytics/feedback') return h.ok(feedbackAnalytics(query.period ?? 'month'));
  if (path === '/api/admin/analytics/satisfaction') return h.ok(SATISFACTION);
  if (path === '/api/admin/lockers/reports') {
    // Dự phòng khi khu khác chưa có dữ liệu báo cáo sự cố (cùng hình dạng LockerReportResponse).
    return h.ok(h.LOCKERS.slice(0, 6).map(([, name], i) => ({
      id: 950201 + i, lockerId: 800001 + i, lockerName: name, boxNumber: i % 2 ? null : 3 + i, userId: 800101 + i,
      reporterName: h.NAMES[i], reporterPhone: h.phone(800101 + i), title: 'Sự cố ô tủ',
      description: ['Cửa ô không bật ra sau khi quét mã.', 'Màn hình kiosk không nhận chạm.', 'Đèn trong ô nhấp nháy.'][i % 3],
      status: ['OPEN', 'IN_PROGRESS', 'RESOLVED'][i % 3], createdAt: ago(60 + i * 700), resolvedAt: i % 3 === 2 ? ago(30 + i * 600) : null,
    })));
  }

  if (path === '/api/admin/scheduler/status') return h.ok({ enabled: true, owner: 'order-service' });

  m = path.match(/^\/api\/admin\/settings\/([a-z]+)\/audits$/);
  if (m) return h.ok(settingAudits(m[1]));
  m = path.match(/^\/api\/admin\/settings\/([a-z]+)$/);
  if (m) return h.ok(settingViews(m[1]));

  if (path === '/api/assistant/status') {
    return h.ok({ enabled: true, configured: true, embeddingConfigured: true, chatConfigured: true });
  }
  if (path === '/api/admin/knowledge/documents') return h.ok(knowledgeDocs());
  m = path.match(/^\/api\/admin\/knowledge\/documents\/(\d+)\/chunks$/);
  if (m) {
    return h.ok(CHUNKS.map(([heading, content], i) => ({ id: 962001 + i + (Number(m[1]) - 960700) * 100, ordinal: i, heading, content })));
  }
  m = path.match(/^\/api\/admin\/knowledge\/documents\/(\d+)$/);
  if (m) return h.ok(knowledgeDocs().find((d) => d.id === Number(m[1])) ?? knowledgeDocs()[0]);
  if (path === '/api/admin/knowledge/conversations') {
    return h.ok(Number(query.page ?? 0) === 0 ? CONVERSATIONS.map((_, i) => conversation(i)) : []);
  }
  m = path.match(/^\/api\/admin\/knowledge\/conversations\/(\d+)$/);
  if (m) return h.ok(conversationDetail(Number(m[1])));
  if (path === '/api/admin/knowledge/eval-cases') {
    return h.ok(EVAL_CASES.map(([question, roles, expectedDocumentTitle, mustRefuse], i) => ({
      id: 964001 + i, question, roles, expectedDocumentTitle, mustRefuse, createdAt: ago(30000 - i * 60),
    })));
  }
  return undefined;
}

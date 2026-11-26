// Dữ liệu giả cho ảnh HDSD khu admin-finance (đơn hàng, người dùng, thanh toán, hoàn tiền, doanh thu, tích điểm,
// khuyến mãi) — chỉ dùng khi chụp, tên/số giả, email @demo.lockr.test, không có dữ liệu thật.

const MIN = 60000;
const ago = (minutes) => new Date(Date.now() - minutes * MIN).toISOString().slice(0, 19);
const ahead = (minutes) => new Date(Date.now() + minutes * MIN).toISOString().slice(0, 19);
// Kỳ liền trước cùng độ dài (để dòng "So sánh với …" có ngày thật).
function previousRange(from, to) {
  const day = 86400000;
  const f = new Date(`${from}T00:00:00Z`).getTime();
  const t = new Date(`${to}T00:00:00Z`).getTime();
  const len = Math.max(0, Math.round((t - f) / day)) + 1;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  return { previousFrom: iso(f - len * day), previousTo: iso(f - day) };
}
const page = (content, total, size = 20, number = 0) =>
  ({ content, page: number, number, size, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)) });
// Ảnh minh hoạ nhúng thẳng (không tải từ mạng): biên lai / ảnh kiện giả.
const svg = (label, color) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" rx="16" fill="${color}"/>` +
  `<rect x="40" y="40" width="400" height="220" rx="12" fill="#fff" opacity=".85"/>` +
  `<text x="240" y="160" font-family="sans-serif" font-size="26" text-anchor="middle" fill="#334155">${label}</text></svg>`)}`;

const RICH_ID = 901000; // dòng đầu bảng Đơn hàng: đơn gửi hàng đang nằm trong ô
const DRONE_ID = 901002; // dòng đơn drone đầu tiên
const FIRST_PAYMENT_ID = 970500; // dòng đầu bảng Giao dịch (chờ thanh toán)

// ---------------------------------------------------------------------------------------------- người dùng
const GIVEN = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khôi', 'Lan', 'Minh', 'Nga', 'Phúc'];
function customers(h) {
  return Array.from({ length: 22 }, (_, i) => {
    const name = `${h.NAMES[i % h.NAMES.length].split(' ').slice(0, 2).join(' ')} ${GIVEN[i % GIVEN.length]}`;
    const id = 800101 + i;
    const created = ago((i * 9 + 2) * 1440);
    return { id, fullName: name, email: h.demoMail(name, id), phoneNumber: h.phone(id), status: i % 9 === 8 ? 'INACTIVE' : 'ACTIVE',
      roles: ['CUSTOMER'], createdAt: created, updatedAt: created, provider: i % 4 === 0 ? 'GOOGLE' : 'LOCAL', emailVerified: i % 5 !== 4,
      termsAccepted: i % 7 !== 6, termsAcceptedAt: created, termsVersion: '2026-09', hasPassword: i % 4 !== 0,
      lastLoginAt: ago((i * 5 + 1) * 60), imageUrl: '', birthday: `199${i % 10}-0${1 + (i % 9)}-1${i % 10}` };
  });
}
function staff(h) {
  return h.STAFF.map(([id, fullName, role]) => ({ id, fullName, email: h.demoMail(fullName, id), phoneNumber: h.phone(id), status: 'ACTIVE',
    roles: [role], createdAt: '2026-06-01T08:00:00', updatedAt: '2026-11-01T08:00:00', provider: 'LOCAL', emailVerified: true,
    termsAccepted: true, termsAcceptedAt: '2026-06-01T08:00:00', termsVersion: '2026-09', hasPassword: true, lastLoginAt: '2026-11-20T08:10:00' }));
}
const customerById = (h, id) => customers(h).find((c) => c.id === id);
const brief = (c) => ({ id: c.id, fullName: c.fullName, phoneNumber: c.phoneNumber, email: c.email, status: 'ACTIVE' });

// ---------------------------------------------------------------------------------------------- đơn hàng
function richOrder(h) {
  const base = h.order(0);
  const cus = customerById(h, 800101);
  const rec = customerById(h, 800105);
  const created = ago(26 * 60);
  const paid = ago(26 * 60 - 6);
  const dropped = ago(25 * 60);
  return {
    ...base, id: RICH_ID, type: 'SEND', serviceCategory: 'PARCEL', status: 'STORING', paymentStatus: 'PAID', paymentRequired: false,
    userId: cus.id, receiverId: rec.id, receiverUserId: rec.id, receiverName: rec.fullName, receiverPhone: rec.phoneNumber,
    pinCode: '482915', qrToken: 'LKR1.ORD901000.demo-signed-token', pinCodeIssuedAt: dropped, paidAt: paid, createdAt: created,
    updatedAt: ago(40), pickupDeadline: ahead(22 * 60), intendedReceiveAt: ahead(3 * 60), receiveAt: null, completedAt: null,
    lastReminderAt: ago(55), description: 'Hộp giày thể thao', customerNote: 'Hàng dễ móp, nhờ để ô ngang tầm mắt.',
    staffNote: 'Đã kiểm tra ô số 7 sau phản ánh cửa kẹt — hoạt động bình thường.', nextAction: 'WAIT_PICKUP',
    nextActionMessage: 'Chờ người nhận tới lấy hàng', cancelReason: null, deliveryAddress: null, rentalDurationHours: null,
    actualWeight: 1.2, weightUnit: 'kg', parcelWeightGrams: 1200, extraFee: 0, discount: 2000, totalPrice: 15000, originalPrice: 18000,
    promotionCode: 'GIAMTHU10', appliedPromotionCodes: 'GIAMTHU10', pointsUsed: 1000, pointsDiscount: 1000,
    orderDetails: [{ serviceId: 3, quantity: 1, price: 18000, description: 'Gửi hàng · ô cỡ M (24 giờ)' }],
    customer: brief(cus),
    receiver: { userId: rec.id, name: rec.fullName, phone: rec.phoneNumber, email: rec.email, accountFullName: rec.fullName,
      accountPhoneNumber: rec.phoneNumber, accountEmail: rec.email },
    store: { ...base.store, contactPhone: '1900 6868' },
    sendBoxNumber: 7, receiveBoxNumber: null, reservedBoxNumber: null, overtime: false,
    fees: { originalPrice: 18000, reservationFee: 0, storagePrice: 18000, shippingFee: 0, extraFee: 0, overtimeFee: 0, discount: 2000,
      basePrice: 15000, totalPrice: 15000 },
    payment: { paymentCount: 3, latestPaymentId: 970012, latestMethod: 'SEPAY', latestStatus: 'COMPLETED', latestAmount: 15000,
      latestCreatedAt: ago(26 * 60 - 9), paidAmount: 30000, lastPaidMethod: 'SEPAY', lastPaidAt: ago(26 * 60 - 9),
      refundedAmount: 15000, outstandingAmount: 0 },
    timeline: null,
  };
}
function richTimeline(h) {
  const cus = customerById(h, 800101);
  return [
    { oldStatus: null, newStatus: 'INITIALIZED', changedByUserId: cus.id, changedByName: cus.fullName, note: 'Khách tạo đơn gửi hàng trên app', createdAt: ago(26 * 60) },
    { oldStatus: 'INITIALIZED', newStatus: 'STORING', changedByUserId: cus.id, changedByName: cus.fullName, note: 'Người gửi đã bỏ hàng vào ô số 7 tại tủ', createdAt: ago(25 * 60) },
  ];
}
function droneOrder(h) {
  const base = h.order(2);
  const src = base.locker;
  const dst = { id: 800008, code: 'HCM-Q7-01', name: 'Tủ Crescent Mall – Tầng trệt', address: '101 Tôn Dật Tiên, P. Tân Phú, Quận 7', storeId: 800004, status: 'ACTIVE' };
  return {
    ...base, id: DRONE_ID, status: 'AWAITING_DISPATCH', deliveryStage: 'EN_ROUTE', paymentStatus: 'PAID', paymentRequired: false,
    fulfillmentMode: 'STANDARD', destinationLockerId: dst.id, destinationLocker: dst, receiveBoxNumber: 4, reservedBoxNumber: 4,
    sendBoxNumber: null, createdAt: ago(95), updatedAt: ago(6), paidAt: ago(92), pickupDeadline: ahead(24 * 60), completedAt: null,
    description: 'Tài liệu hợp đồng (bìa cứng)', customerNote: 'Giao trong giờ hành chính', staffNote: null, parcelWeightGrams: 650,
    drone: { missionId: 7001, missionStatus: 'EN_ROUTE', deliveryStage: 'EN_ROUTE', droneUnitId: 800302, droneCode: 'DRN-002',
      sourceLockerId: src.id, sourceLocker: src, destinationLockerId: dst.id, assignedByUserId: null, readyToLaunchAt: ago(14),
      launchingAt: ago(11), createdAt: ago(40), updatedAt: ago(6) },
    timeline: null,
  };
}
function droneTracking(h) {
  const o = droneOrder(h);
  const pt = (l) => ({ lockerId: l.id, code: l.code, name: l.name, address: l.address, latitude: 10.78, longitude: 106.70 });
  const tech = h.STAFF[2];
  return {
    orderId: o.id, orderCode: o.orderCode, userId: o.userId, receiverUserId: null, destinationLockerId: o.destinationLockerId,
    reservedBoxId: 50404, reservedBoxNumber: 4, sourceBoxId: null, sourceBoxNumber: null, type: 'DRONE_DELIVERY', status: o.status,
    deliveryStage: 'EN_ROUTE', paymentStatus: 'PAID', parcelWeightGrams: 650, description: o.description, totalPrice: 26000,
    weightSurcharge: 3000, amountDue: 0, originalPrice: 30000, discount: 3000, promotionCode: 'DRONE10', pointsUsed: 1000, pointsDiscount: 1000,
    createdAt: o.createdAt, updatedAt: o.updatedAt, fulfillmentMode: 'STANDARD', missionId: 7001, missionStatus: 'EN_ROUTE',
    droneUnitId: 800302, droneCode: 'DRN-002', sourceLockerId: o.locker.id, etaMinutes: 7, currentLatitude: 10.7712, currentLongitude: 106.7034,
    assignedByUserId: null, assignedByName: null, payloadWeightGrams: 720, sealCode: 'SEAL-4471', loadedByUserId: tech[0],
    loadedByName: tech[1], loadingNote: 'Kiện đã niêm phong, cân lại 720 g', parcelMatched: true, payloadSecured: true,
    compartmentLocked: true, loadedAt: ago(16), readyToLaunchAt: ago(14), launchingAt: ago(11), missionCreatedAt: ago(40),
    missionUpdatedAt: ago(6), paidAt: o.paidAt, paymentMethod: 'SEPAY', paymentReference: 'LKR2611DRN901002',
    paymentTransactionId: 'FT26112045917733', pickupDeadline: o.pickupDeadline, completedAt: null,
    customerName: o.customer.fullName, customerPhone: o.customer.phoneNumber, receiverName: o.receiverName, receiverPhone: '0868123457',
    cancelReason: null, cancelNote: null, staffNote: null, sourceLocker: pt(o.locker), destinationLocker: pt(o.destinationLocker),
    parcelLengthCm: 32, parcelWidthCm: 24, parcelHeightCm: 4, parcelCategory: 'DOCUMENT', declaredValue: 500000, fragile: false,
    routeDistanceMeters: 4200, parcelDroppedAt: ago(30), journeyEvents: [],
    sender: { name: o.customer.fullName, phone: o.customer.phoneNumber, email: h.demoMail(o.customer.fullName, o.userId) },
    pickup: { status: 'PICKED_UP', address: 'Toà nhà Bitexco, 2 Hải Triều, P. Bến Nghé, Quận 1', latitude: 10.7716, longitude: 106.7044,
      note: 'Gọi trước 5 phút, để ở quầy lễ tân', distanceToSourceLockerMeters: 850, technicianId: tech[0], technicianName: tech[1],
      technicianPhone: h.phone(tech[0]), technicianDistanceMeters: null, offeredAt: ago(70), offerExpiresAt: null, acceptedAt: ago(68),
      pickedUpAt: ago(45), failureReason: null, failureNote: null, technicianNote: 'Đã nhận kiện tại lễ tân', pickupPhotoUrl: null },
  };
}
function listOrders(h) {
  return Array.from({ length: 12 }, (_, i) => (i === 0 ? richOrder(h) : i === 2 ? droneOrder(h) : h.order(i)));
}
function customerView(h, o) {
  const rich = o.id === RICH_ID;
  return {
    id: o.id, type: o.type, status: o.status, pinCode: o.pinCode, qrToken: o.qrToken, totalPrice: o.totalPrice,
    receiverName: o.receiverName, receiverPhone: o.receiverPhone, receiverEmail: o.receiver?.email ?? null,
    customerNote: o.customerNote ?? null, deliveryAddress: null, rentalDurationHours: null, accessBlockReason: null,
    pickupOvertimeFee: 0, paidAmount: o.totalPrice, amountDue: 0,
    milestones: rich ? [
      { code: 'CREATED', label: 'Tạo đơn', occurredAt: ago(26 * 60) },
      { code: 'PAID', label: 'Đã thanh toán', occurredAt: ago(26 * 60 - 9) },
      { code: 'DROPPED', label: 'Đã gửi hàng vào ô', occurredAt: ago(25 * 60) },
      { code: 'NOTIFIED', label: 'Đã gửi mã cho người nhận', occurredAt: ago(25 * 60 - 1) },
    ] : null,
    parcel: rich ? { description: 'Hộp giày thể thao', weightGrams: 1200, actualWeight: null, weightUnit: null, lengthCm: 35, widthCm: 22,
      heightCm: 14, category: 'CLOTHING', declaredValue: 1500000, fragile: false, prohibitedItemsDeclaredAt: ago(26 * 60) } : null,
    paidAt: o.paidAt, dropOpenedAt: rich ? ago(25 * 60) : null, intendedReceiveAt: o.intendedReceiveAt ?? null,
    delegateName: rich ? 'Phan Thị Mai' : null, delegatePhone: rich ? '0907 555 123' : null,
    delegateNote: rich ? 'Lấy hộ sau giờ làm' : null, delegatedAt: rich ? ago(5 * 60) : null,
    sourceLockerId: null, destinationLockerId: null, routeDistanceMeters: o.type === 'DRONE_DELIVERY' ? 4200 : null,
    parcelDroppedAt: rich ? ago(25 * 60) : null, parcelReturnedAt: null, deliveryBlockReasonLabel: null, deliveryBlockedAt: null,
    failureReasonLabel: null, failedAt: null, pointsUsed: o.pointsUsed ?? 0, pointsDiscount: o.pointsDiscount ?? 0,
    overtimeRatePerHour: 2000, boxIncidentOpenedAt: null, dronePickupCode: null,
  };
}

// ---------------------------------------------------------------------------------------------- thanh toán
function payment(h, i, over = {}) {
  const o = h.order(i);
  const statuses = ['COMPLETED', 'COMPLETED', 'FAILED', 'COMPLETED', 'COMPLETED', 'PENDING'];
  const status = statuses[i % statuses.length];
  const created = ago(i * 53 + 20);
  return {
    id: 970000 + i, orderId: o.id, userId: o.userId, amount: o.totalPrice,
    method: i % 9 === 3 ? 'CASH' : 'SEPAY', status,
    referenceId: `LKR2611${String(970000 + i)}`, referenceTransactionId: status === 'COMPLETED' ? `FT2611${String(41000000 + i * 7717)}` : null,
    paymentUrl: null, qrCodeUrl: null, deeplink: null, description: `Thanh toán đơn ${o.orderCode}`,
    content: `LKR2611${String(970000 + i)}`, createdAt: created, updatedAt: created, paidAt: status === 'COMPLETED' ? created : null,
    refundedAmount: i % 8 === 1 ? 5000 : 0,
    order: { id: o.id, orderCode: o.orderCode, type: o.type, serviceCategory: o.serviceCategory, status: o.status,
      paymentStatus: o.paymentStatus, totalPrice: o.totalPrice, lockerId: o.lockerId, createdAt: o.createdAt },
    customer: o.customer, ...over,
  };
}
function firstPayment(h) {
  const o = h.order(5);
  return payment(h, 5, { id: FIRST_PAYMENT_ID, status: 'PENDING', method: 'SEPAY', paidAt: null,
    referenceTransactionId: null, createdAt: ago(4), updatedAt: ago(4), referenceId: 'LKR2611970500', content: 'LKR2611970500',
    description: `Thanh toán đơn ${o.orderCode} (chờ khách chuyển khoản)` });
}
function richPayments(h) {
  const o = richOrder(h);
  const mk = (id, status, minutes, extra = {}) => ({
    id, orderId: o.id, userId: o.userId, amount: 15000, method: 'SEPAY', status, referenceId: `LKR2611${id}`,
    referenceTransactionId: status === 'COMPLETED' ? `FT2611${id}88` : null, paymentUrl: null, qrCodeUrl: null, deeplink: null,
    description: status === 'FAILED' ? 'Mã VietQR hết hạn trước khi khách chuyển khoản' : `Thanh toán đơn ${o.orderCode}`,
    content: `LKR2611${id}`, createdAt: ago(minutes), updatedAt: ago(minutes), paidAt: status === 'COMPLETED' ? ago(minutes) : null,
    refundedAmount: 0, order: null, customer: o.customer, ...extra,
  });
  return [mk(970010, 'FAILED', 26 * 60 - 1), mk(970011, 'COMPLETED', 26 * 60 - 6), mk(970012, 'COMPLETED', 26 * 60 - 9, { refundedAmount: 15000 })];
}
function paymentsList(h, query) {
  if (query.orderId) return Number(query.orderId) === RICH_ID ? page(richPayments(h), 3, 50) : page([payment(h, 1)], 1, 50);
  if (query.userId) {
    const c = customerById(h, Number(query.userId));
    const list = [1, 3, 4, 7, 11, 2].map((i) => payment(h, i, c ? { customer: brief(c), userId: c.id } : {}));
    return page(list, list.length, Number(query.size ?? 10));
  }
  const size = Number(query.size ?? 20);
  const list = [firstPayment(h), ...Array.from({ length: size - 1 }, (_, k) => payment(h, k + 1))];
  return page(list, 912, size);
}
function paymentDetail(h, id) {
  const p = id === FIRST_PAYMENT_ID ? firstPayment(h) : paymentsList(h, { size: 30 }).content.find((x) => x.id === id)
    ?? richPayments(h).find((x) => x.id === id) ?? payment(h, id % 100);
  const others = id === FIRST_PAYMENT_ID
    ? [{ ...p, id: 970499, status: 'FAILED', createdAt: ago(31), updatedAt: ago(31), referenceId: 'LKR2611970499' }]
    : [];
  return { payment: p, refunds: [], orderPayments: others };
}
function stats(from, to, scale = 1) {
  const n = (x) => Math.round(x * scale);
  const period = {
    from, to, totalCount: n(968), totalAmount: n(18690000), completedCount: n(868), completedAmount: n(17110000), pendingCount: n(41),
    pendingAmount: n(712000), failedCount: n(59), failedAmount: n(868000), otherCount: 0, otherAmount: 0, successRate: 89.7,
    orderPayments: { count: n(968), amount: n(18690000), completedCount: n(868), completedAmount: n(17110000) },
    refundCount: n(27), refundAmount: n(486000), netCollectedAmount: n(16624000),
    byStatus: [
      { key: 'COMPLETED', count: n(868), amount: n(17110000), completedCount: n(868), completedAmount: n(17110000) },
      { key: 'PENDING', count: n(41), amount: n(712000), completedCount: 0, completedAmount: 0 },
      { key: 'FAILED', count: n(59), amount: n(868000), completedCount: 0, completedAmount: 0 },
    ],
    byMethod: [
      { key: 'SEPAY', count: n(941), amount: n(18240000), completedCount: n(846), completedAmount: n(16760000) },
      { key: 'CASH', count: n(27), amount: n(450000), completedCount: n(22), completedAmount: n(350000) },
    ],
  };
  return period;
}
// ---------------------------------------------------------------------------------------------- hoàn tiền
const REFUND_COUNTS = { PENDING: 4, COMPLETED: 27, REJECTED: 3 };
function refund(h, i, status) {
  const o = h.order(i * 2 + 1);
  const banks = [['Vietcombank', 'VCB'], ['Techcombank', 'TCB'], ['MB Bank', 'MB'], ['ACB', 'ACB']];
  const reasons = ['[Bồi thường sự cố DPI-2611-004] Hoàn 50% phí giao do drone rơi kiện', 'Tủ báo lỗi, không mở được ô',
    'Huỷ đơn trước khi gửi hàng', 'Thu trùng phí quá hạn'];
  const [bankName, bankCode] = banks[i % banks.length];
  const done = status !== 'PENDING';
  return {
    id: 960000 + i + (status === 'PENDING' ? 0 : status === 'COMPLETED' ? 10 : 40), paymentId: 970000 + i, orderId: o.id,
    amount: i === 0 && status === 'PENDING' ? 13000 : o.totalPrice, status, reason: reasons[i % reasons.length],
    transactionId: done ? `RF-${960000 + i}` : null, processedByUserId: done ? 800205 : null, requestedAt: ago(i * 420 + 180),
    processedAt: done ? ago(i * 420 + 60) : null, userId: o.userId, paymentMethod: 'SEPAY', paymentAmount: o.totalPrice,
    paymentReferenceId: `LKR2611${970000 + i}`, bankName, bankCode, accountNumber: String(1023456789 + i * 1111),
    accountHolderName: h.plain(o.customer.fullName).toUpperCase(),
    rejectionReason: status === 'REJECTED' ? 'Đơn đã giao nhận thành công, không thuộc diện hoàn' : null,
    bankTransferRef: status === 'COMPLETED' ? `FT2611${String(52000000 + i * 3331)}` : null,
    proofImageUrl: status === 'COMPLETED' ? svg('Biên lai chuyển khoản (mẫu)', '#d1fae5') : null,
    customerAttachmentUrl: i % 2 === 0 ? svg('Ảnh khách gửi kèm (mẫu)', '#dbeafe') : null,
    order: { id: o.id, orderCode: o.orderCode, type: o.type, serviceCategory: o.serviceCategory, status: 'CANCELED', paymentStatus: 'PAID',
      totalPrice: o.totalPrice, lockerId: o.lockerId, createdAt: o.createdAt },
    customer: o.customer, processedBy: done ? { id: 800205, fullName: 'Quản trị viên demo', phoneNumber: null, email: null } : null,
  };
}
function refundsList(h, url, query) {
  const status = url.searchParams.getAll('status');
  const size = Number(query.size ?? 20);
  if (query.orderId) {
    if (Number(query.orderId) !== RICH_ID) return page([], 0, size);
    const r = { ...refund(h, 3, 'COMPLETED'), id: 960099, paymentId: 970012, orderId: RICH_ID, amount: 15000,
      reason: 'Khách chuyển khoản trùng hai lần', requestedAt: ago(20 * 60), processedAt: ago(19 * 60) };
    return page([r], 1, size);
  }
  if (query.userId) {
    const list = [refund(h, 1, 'COMPLETED'), refund(h, 2, 'PENDING'), refund(h, 3, 'REJECTED')];
    return page(list, list.length, size);
  }
  const total = status.length ? status.reduce((n, s) => n + (REFUND_COUNTS[s] ?? 0), 0) : 34;
  if (size === 1) return page([refund(h, 0, status[0] ?? 'PENDING')], total, 1);
  const order = status.length === 1 ? Array(8).fill(status[0]) : ['PENDING', 'COMPLETED', 'COMPLETED', 'REJECTED', 'COMPLETED', 'PENDING', 'COMPLETED', 'COMPLETED'];
  const list = order.slice(0, Math.min(size, status.length === 1 ? REFUND_COUNTS[status[0]] ?? 4 : 8)).map((s, i) => refund(h, i, s));
  return page(list, total, size);
}

// ---------------------------------------------------------------------------------------------- doanh thu
function customerRevenue(h) {
  return customers(h).slice(0, 10).map((c, i) => {
    const spent = [486000, 412000, 365000, 298000, 241000, 205000, 180000, 152000, 120000, 98000][i];
    const refunded = i % 4 === 1 ? 15000 : 0;
    return { userId: c.id, fullName: c.fullName, phoneNumber: c.phoneNumber, email: c.email, orderCount: 24 - i * 2, paidOrderCount: 22 - i * 2,
      totalSpent: spent, refundAmount: refunded, netSpent: spent - refunded, averageOrderValue: Math.round(spent / (22 - i * 2)),
      lastOrderAt: ago(i * 300 + 40), lastPaidAt: ago(i * 300 + 35) };
  });
}
function customerRevenueDetail(h, id, query) {
  const c = customerById(h, id) ?? customers(h)[0];
  const orders = Array.from({ length: 6 }, (_, i) => {
    const o = h.order(i + 1);
    return { orderId: o.id, orderCode: o.orderCode, type: o.type, status: o.status, paymentStatus: o.paymentStatus, lockerId: o.lockerId,
      lockerCode: o.locker.code, lockerName: o.locker.name, totalPrice: o.totalPrice, extraFee: 0, discount: 0,
      paidInRange: o.paymentStatus === 'PAID' ? o.totalPrice : 0, refundedInRange: i === 2 ? 5000 : 0,
      paidAllTime: o.paymentStatus === 'PAID' ? o.totalPrice : 0, paymentMethods: ['SEPAY'], lastPaymentMethod: 'SEPAY',
      lastPaidAt: o.paidAt, createdAt: o.createdAt, paidAt: o.paidAt, completedAt: o.completedAt };
  });
  return { from: query.from, to: query.to, userId: c.id, fullName: c.fullName, phoneNumber: c.phoneNumber, email: c.email, status: 'ACTIVE',
    orderCount: 14, paidOrderCount: 13, totalSpent: 486000, refundAmount: 15000, netSpent: 471000, averageOrderValue: 37385,
    firstOrderAt: ago(140 * 1440), lastOrderAt: ago(40), orders };
}
function revenueEntries(h, query) {
  const kind = query.kind ?? 'PAYMENTS';
  const entries = Array.from({ length: 12 }, (_, i) => {
    const o = h.order(i);
    const refund = kind === 'REFUNDS' || (kind === 'NET' && i % 5 === 4);
    return { kind: refund ? 'REFUNDS' : 'PAYMENTS', orderId: o.id, orderCode: o.orderCode, orderType: o.type, userId: o.userId,
      customerName: o.customer.fullName, customerPhone: o.customer.phoneNumber, amount: refund ? -Math.round(o.totalPrice / 2) : o.totalPrice,
      method: 'SEPAY', at: ago(i * 37 + 5) };
  });
  const total = entries.reduce((s, e) => s + e.amount, 0);
  return { from: query.from, to: query.to, kind, total, orderCount: entries.length, entries };
}

// ---------------------------------------------------------------------------------------------- tích điểm
const TIERS = ['PLATINUM', 'GOLD', 'GOLD', 'SILVER', 'SILVER', 'SILVER', 'BRONZE', 'BRONZE', 'BRONZE', 'BRONZE', 'BRONZE', 'BRONZE'];
function members(h) {
  return customers(h).slice(0, 12).map((c, i) => ({
    userId: c.id, points: [18400, 9600, 7200, 4100, 3550, 2900, 1800, 1250, 900, 600, 300, 0][i],
    lifetimePoints: [52000, 31000, 26500, 14200, 12800, 10100, 6400, 4900, 3200, 2100, 1100, 400][i], stamps: 12 - i, tier: TIERS[i],
    joinedAt: ago((i * 17 + 30) * 1440), transactionCount: 48 - i * 3, pointsIssued: [33600, 21400, 19300, 10100, 9250, 7200, 4600, 3650, 2300, 1500, 800, 400][i],
    pointsRedeemed: [15200, 11800, 12100, 6000, 5700, 4300, 2800, 2400, 1400, 900, 500, 400][i],
    lastTransactionAt: ago(i * 400 + 60), newThisMonth: i >= 9, active30Days: i < 8,
  }));
}
function loyaltyTx(h, query) {
  const types = ['ORDER_EARN', 'ORDER_REDEEM', 'ORDER_EARN', 'VOUCHER_EXCHANGE', 'ADJUSTMENT', 'ORDER_REDEEM_REFUND', 'ORDER_EARN', 'ORDER_EARN_REVERSAL'];
  const scope = query.scope ?? 'ALL';
  const content = Array.from({ length: 10 }, (_, i) => {
    const o = h.order(i);
    let type = types[i % types.length];
    if (scope === 'ISSUED' && ['ORDER_REDEEM', 'VOUCHER_EXCHANGE', 'ORDER_EARN_REVERSAL'].includes(type)) type = 'ORDER_EARN';
    if (scope === 'REDEEMED' && !['ORDER_REDEEM', 'VOUCHER_EXCHANGE', 'ORDER_EARN_REVERSAL'].includes(type)) type = 'ORDER_REDEEM';
    const negative = ['ORDER_REDEEM', 'VOUCHER_EXCHANGE', 'ORDER_EARN_REVERSAL'].includes(type);
    const voucher = type === 'VOUCHER_EXCHANGE';
    const userId = query.userId ? Number(query.userId) : 800101 + (i % 8);
    return { id: 995000 + i, userId, orderId: voucher || type === 'ADJUSTMENT' ? null : o.id, points: (negative ? -1 : 1) * (150 + i * 70),
      type, createdAt: ago(i * 210 + 30), orderCode: voucher || type === 'ADJUSTMENT' ? null : o.orderCode,
      orderType: voucher || type === 'ADJUSTMENT' ? null : o.type, reference: voucher ? 'VX-2611-0042' : null, amount: null };
  });
  return { content, totalElements: 214, totalPages: 22, page: Number(query.page ?? 0), size: Number(query.size ?? 10), totalPoints: 38400,
    byType: [{ type: 'ORDER_EARN', transactions: 142, points: 29800 }, { type: 'ORDER_REDEEM', transactions: 41, points: -12600 },
      { type: 'VOUCHER_EXCHANGE', transactions: 18, points: -9000 }, { type: 'ADJUSTMENT', transactions: 7, points: 2600 },
      { type: 'ORDER_REDEEM_REFUND', transactions: 6, points: 1400 }],
    topUsers: query.userId ? [] : members(h).slice(0, 6).map((m) => ({ userId: m.userId, transactions: m.transactionCount, points: m.pointsIssued })) };
}

// ---------------------------------------------------------------------------------------------- khuyến mãi
function promotions() {
  const mk = (id, code, name, extra) => ({ id, code, name, description: null, imageUrl: null, discountType: 'PERCENTAGE', discountValue: 10,
    maxDiscountAmount: 20000, minOrderAmount: null, stackable: false, lockerId: null, lockerCode: null, lockerName: null,
    totalUsageLimit: 500, perUserLimit: 1, pointsCost: null, status: 'ACTIVE', startAt: ago(10 * 1440), endAt: ahead(20 * 1440),
    usageCount: 132, createdByUserId: 800205, createdAt: ago(12 * 1440), updatedAt: ago(2 * 1440), ...extra });
  return [
    mk(700001, 'GIAMTHU10', 'Giảm 10% đơn gửi hàng tháng 11', { description: 'Áp dụng mọi tủ, tối đa 20.000đ' }),
    mk(700002, 'Q1VINCOM', 'Ưu đãi tủ Vincom Đồng Khởi', { discountType: 'FIXED_AMOUNT', discountValue: 5000, maxDiscountAmount: null,
      lockerId: 800001, lockerCode: 'HCM-Q1-01', lockerName: 'Tủ Vincom Đồng Khởi – Sảnh B1', usageCount: 48, totalUsageLimit: 200 }),
    mk(700003, 'DOIDIEM15K', 'Voucher đổi điểm 15.000đ', { discountType: 'FIXED_AMOUNT', discountValue: 15000, maxDiscountAmount: null,
      pointsCost: 15000, perUserLimit: null, usageCount: 21, totalUsageLimit: null }),
    mk(700004, 'TET2027', 'Lì xì Tết 2027', { startAt: ahead(45 * 1440), endAt: ahead(60 * 1440), usageCount: 0, discountValue: 20 }),
    mk(700005, 'DRONE10', 'Giảm 10% giao bằng drone', { usageCount: 87, totalUsageLimit: 100, minOrderAmount: 20000 }),
    mk(700006, 'BLACKFRIDAY', 'Black Friday giảm sâu', { usageCount: 300, totalUsageLimit: 300, discountValue: 30 }),
    mk(700007, 'HE2026', 'Chào hè 2026', { startAt: ago(160 * 1440), endAt: ago(70 * 1440), usageCount: 412, totalUsageLimit: 1000 }),
    mk(700008, 'THUNGHIEM', 'Mã thử nghiệm nội bộ', { status: 'INACTIVE', usageCount: 3, totalUsageLimit: 10 }),
  ];
}

// ---------------------------------------------------------------------------------------------- bộ định tuyến
export default function ({ url, path, query, method }, h) {
  if (method !== 'GET') return undefined;

  // Đơn hàng
  if (path === '/api/admin/orders/search' && !url.searchParams.getAll('status').includes('EXPIRED')) {
    const size = Number(query.size ?? 20);
    const uid = Number(query.userId ?? query.receiverUserId ?? 0);
    if (uid) {
      const c = customerById(h, uid);
      const list = [1, 3, 4, 6, 7].map((i) => ({ ...h.order(i), ...(c ? { customer: brief(c), userId: c.id } : {}) }));
      return h.ok(page(list, list.length, size));
    }
    const types = url.searchParams.getAll('type');
    const list = listOrders(h).filter((o) => !types.length || types.includes(o.type));
    return h.ok(page(list, types.length ? 386 : 1186, size));
  }
  const detail = path.match(/^\/api\/admin\/orders\/(\d+)\/detail$/);
  if (detail) {
    const id = Number(detail[1]);
    if (id === RICH_ID) return h.ok({ ...richOrder(h), timeline: richTimeline(h) });
    if (id === DRONE_ID) {
      return h.ok({ ...droneOrder(h), timeline: [
        { oldStatus: null, newStatus: 'INITIALIZED', changedByUserId: null, changedByName: null, note: 'Khách tạo đơn giao bằng drone', createdAt: ago(95) },
        { oldStatus: 'INITIALIZED', newStatus: 'AWAITING_DISPATCH', changedByUserId: null, changedByName: null, note: 'Đã thanh toán, chờ điều phối bay', createdAt: ago(92),
          latitude: 10.7716, longitude: 106.7044, locationSource: 'PICKUP_ADDRESS' },
      ] });
    }
    if (id > 901000 && id < 901012) return h.ok({ ...h.order(id - 901000), timeline: [] });
    return undefined;
  }
  const view = path.match(/^\/api\/orders\/(\d+)$/);
  if (view) {
    const id = Number(view[1]);
    const o = id === RICH_ID ? richOrder(h) : id === DRONE_ID ? droneOrder(h) : id > 901000 && id < 901012 ? h.order(id - 901000) : null;
    return o ? h.ok(customerView(h, o)) : undefined;
  }
  if (path === `/api/admin/drone-orders/${DRONE_ID}`) return h.ok(droneTracking(h));

  // Người dùng (khách trước để dòng đầu là một khách hàng có đơn, điểm, điều khoản)
  if (path === '/api/admin/users') {
    const list = [...customers(h), ...staff(h)];
    return h.ok({ content: list, totalElements: list.length, totalPages: 1, number: 0, size: 1000 });
  }
  if (path === '/api/admin/users/deleted') {
    return h.ok([{ id: 800180, fullName: 'Tài khoản đã xoá (mẫu)', email: 'daxoa.800180@demo.lockr.test', phoneNumber: null,
      deletedAt: ago(30 * 1440), deletedReason: 'Khách yêu cầu xoá tài khoản' }]);
  }
  const user = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (user) {
    const c = customerById(h, Number(user[1]));
    return c ? h.ok({ ...c, name: c.fullName }) : undefined;
  }
  if (path === '/api/admin/knowledge/conversations' && query.userId) {
    const titles = ['Hỏi cách gia hạn ô thuê', 'Phí quá hạn tính thế nào?', 'Đơn drone bao lâu thì tới?'];
    return h.ok(titles.map((title, i) => ({ id: 930100 + i, userId: Number(query.userId), title, messageCount: 6 - i,
      createdAt: ago(i * 2000 + 300), updatedAt: ago(i * 2000 + 200) })));
  }

  // Thanh toán
  if (path === '/api/admin/payments/search') return h.ok(paymentsList(h, query));
  const pd = path.match(/^\/api\/admin\/payments\/(\d+)\/detail$/);
  if (pd) return h.ok(paymentDetail(h, Number(pd[1])));
  if (path === '/api/admin/payments/stats') {
    const from = query.from ?? h.today;
    const to = query.to ?? h.today;
    const prev = stats(from, to, 0.9);
    return h.ok({ from, to, ...previousRange(from, to), current: stats(from, to), previous: prev, today: stats(h.today, h.today, 0.04),
      yesterday: stats(h.today, h.today, 0.035),
      changes: { totalCountPct: 11.1, totalAmountPct: 9.4, completedCountPct: 12.3, completedAmountPct: 10.2, refundAmountPct: -6.5,
        netCollectedAmountPct: 8.7, successRatePoints: 1.2 },
      todayChanges: { totalCountPct: 4.0, totalAmountPct: 3.1, completedCountPct: 5.2, completedAmountPct: 4.4, refundAmountPct: 0,
        netCollectedAmountPct: 4.1, successRatePoints: 0.4 } });
  }
  if (path === '/api/admin/payments/refunds') return h.ok(refundsList(h, url, query));

  // Doanh thu (tổng quan giống dữ liệu chung, chỉ thêm kỳ so sánh có ngày thật)
  if (path === '/api/admin/revenue/summary') {
    const from = query.from ?? `${h.today.slice(0, 8)}01`;
    const to = query.to ?? h.today;
    const scale = from === to ? 1 : 22;
    const current = h.period(from, to, scale);
    const prev = previousRange(from, to);
    const previous = h.period(prev.previousFrom, prev.previousTo, scale);
    const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
    return h.ok({
      from, to, ...prev, current, previous,
      changes: { totalRevenuePct: pct(current.totalRevenue, previous.totalRevenue), refundAmountPct: 4.2,
        netRevenuePct: pct(current.netRevenue, previous.netRevenue), orderCountPct: pct(current.orderCount, previous.orderCount),
        paidOrderCountPct: pct(current.paidOrderCount, previous.paidOrderCount), averageOrderValuePct: 1.8 },
      today: h.period(h.today, h.today, 1), thisWeek: h.period(h.today, h.today, 6), thisMonth: h.period(from, to, 22),
    });
  }
  if (path === '/api/admin/revenue/by-locker') {
    const items = h.LOCKERS.map(([code, name, si], i) => {
      const revenue = [2950000, 2470000, 2610000, 1700000, 1980000, 1240000, 770000, 2480000, 1200000, 800000][i];
      return { lockerId: 800001 + i, code, name, address: h.STORES[si][2], status: i === 6 ? 'MAINTENANCE' : 'ACTIVE', storeId: h.STORES[si][0],
        storeName: h.STORES[si][1], boxCount: 15, orderCount: Math.round(revenue / 16000), paidOrderCount: Math.round(revenue / 18000), revenue,
        refundAmount: i % 3 === 0 ? 30000 : 0, netRevenue: revenue - (i % 3 === 0 ? 30000 : 0), revenuePerBox: Math.round(revenue / 15),
        sharePct: Math.round((revenue / 18200000) * 1000) / 10 };
    });
    return h.ok({ from: query.from, to: query.to, totalRevenue: 18200000, lookupAvailable: true, items });
  }
  if (path === '/api/admin/revenue/by-customer') {
    const list = customerRevenue(h);
    return h.ok(page(list, 58, Number(query.size ?? 10)));
  }
  const rc = path.match(/^\/api\/admin\/revenue\/customers\/(\d+)$/);
  if (rc) return h.ok(customerRevenueDetail(h, Number(rc[1]), query));
  if (path === '/api/admin/revenue/entries') return h.ok(revenueEntries(h, query));

  // Tích điểm
  if (path === '/api/admin/loyalty/statistics') {
    return h.ok({ accounts: 58, transactions: 1342, totalMembers: 58, newMembersThisMonth: 9, activeMembersLast30Days: 31,
      tierDistribution: { BRONZE: 34, SILVER: 15, GOLD: 7, PLATINUM: 2 }, totalPointsOutstanding: 184500, averagePoints: 3181.03,
      medianPoints: 2150, pointsIssued: 412000, pointsRedeemed: 227500, pointsIssuedThisMonth: 38400, pointsRedeemedThisMonth: 21900 });
  }
  if (path === '/api/admin/loyalty/period-summary') {
    return h.ok({ from: query.from, to: query.to, ...previousRange(query.from ?? h.today, query.to ?? h.today),
      current: { issued: 38400, redeemed: 21900, net: 16500, transactions: 214 }, previous: { issued: 33100, redeemed: 20400, net: 12700, transactions: 191 },
      issuedPct: 16.0, redeemedPct: 7.4, netPct: 29.9, transactionsPct: 12.0 });
  }
  if (path === '/api/admin/loyalty/members') return h.ok(members(h));
  if (path === '/api/admin/loyalty/transactions') return h.ok(loyaltyTx(h, query));
  const lu = path.match(/^\/api\/admin\/loyalty\/users\/(\d+)$/);
  if (lu) return h.ok({ id: 41000 + Number(lu[1]) - 800000, userId: Number(lu[1]), points: 18400, lifetimePoints: 52000, stamps: 12, tier: 'PLATINUM' });
  const lh = path.match(/^\/api\/admin\/loyalty\/users\/(\d+)\/history$/);
  if (lh) {
    return h.ok(loyaltyTx(h, { userId: lh[1], scope: 'ALL' }).content.map(({ id, userId, orderId, points, type, createdAt }) =>
      ({ id, userId, orderId, points, type, createdAt })));
  }

  // Khuyến mãi
  if (path === '/api/admin/promotions') return h.ok(promotions());

  return undefined;
}

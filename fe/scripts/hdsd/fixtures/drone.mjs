// Dữ liệu giả cho ảnh HDSD khu admin-drone (bảo trì, đội drone, hành trình, điều khiển bay, sự cố rơi kiện,
// nhật ký drone–tủ) — chỉ dùng khi chụp, tên/số giả, không có dữ liệu thật.

const ago = (min) => new Date(Date.now() - min * 60000).toISOString().slice(0, 19);
const ahead = (min) => ago(-min);
const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');

// Toạ độ gần đúng của các điểm công cộng trong admin-fixtures (LOCKERS), để bản đồ có chỗ hiển thị.
const COORDS = [
  [10.7781, 106.702], [10.779, 106.699], [10.795, 106.7218], [10.8016, 106.7148], [10.8412, 106.8098],
  [10.842, 106.838], [10.875, 106.801], [10.729, 106.718], [10.771, 106.669], [10.772, 106.658],
];
const PADS = [0, 2, 4, 7]; // tủ có bãi đáp drone

function lockerOf(h, i) {
  const [code, name, si] = h.LOCKERS[i];
  return { id: 800001 + i, code, name, address: h.STORES[si][2], storeId: h.STORES[si][0], storeName: h.STORES[si][1],
    latitude: COORDS[i][0], longitude: COORDS[i][1] };
}
const point = (l) => ({ lockerId: l.id, code: l.code, name: l.name, address: l.address, latitude: l.latitude, longitude: l.longitude });
const staffName = (h, id) => h.STAFF.find((s) => s[0] === id)?.[1] ?? null;

// ---------------------------------------------------------------- drone
const DRONES = [
  [800301, 'DRN-001', 'IDLE', 96, 0, null, 800203],
  [800302, 'DRN-002', 'IN_FLIGHT', 71, 2, null, 800204],
  [800303, 'DRN-003', 'CHARGING', 34, 4, null, 800203],
  [800304, 'DRN-004', 'IDLE', 88, 7, null, 800204],
  [800305, 'DRN-005', 'FAULT', 52, 0, 'Cảm biến GPS mất tín hiệu', 800203],
  [800306, 'DRN-006', 'IDLE', 100, 2, null, null],
  [800307, 'DRN-007', 'MAINTENANCE', 63, 4, 'Thay cánh quạt số 3', 800204],
  [800308, 'DRN-008', 'CHARGING', 18, 7, null, 800203],
  [800309, 'DRN-009', 'RESERVED', 79, 0, null, 800204],
];

function drones(h) {
  return DRONES.map(([id, code, status, batteryPercent, li, faultReason, techId], k) => ({
    id, code, status, batteryPercent, lockerId: 800001 + li, lockerName: h.LOCKERS[li][1], faultReason,
    assignedTechnicianId: techId, assignedTechnicianName: techId ? staffName(h, techId) : null,
    lastChargedAt: ago((k + 1) * 95), active: true, createdAt: '2026-07-01T08:00:00', updatedAt: ago(k * 13 + 4),
  }));
}

function device(droneId, code) {
  return { id: 880001, macAddress: 'DC:A6:32:0D:EE:01', droneId, droneCode: code, ipAddress: null, firmwareVersion: 'lockr-pi 1.8.2',
    mavlinkStatus: 'CONNECTED', flightMode: 'LOITER', armed: false, landedState: 'ON_GROUND', gpsFixType: 3, gpsSatellites: 14,
    batteryPercent: 96, voltageV: 16.6, currentA: 0.8, cameraStatus: 'OFFLINE', cameraStreamUrl: null, lastSeenAt: ago(1), online: true,
    createdAt: '2026-08-01T08:00:00', updatedAt: ago(1) };
}

function iotLogs(droneId, code) {
  const rows = [
    ['PI_CONTROLLER', 'POWER_CONNECTED', 'CONNECTED', 'SYSTEM', 'Bộ điều khiển Pi khởi động, kết nối máy chủ', 6],
    ['PIXHAWK', 'PIXHAWK_CONNECTED', 'CONNECTED', 'SYSTEM', 'Pi kết nối Pixhawk qua MAVLink', 7],
    ['BATTERY_POWER', 'TELEMETRY_ONLINE', 'SUCCESS', 'SYSTEM', 'Pin 96% · 16.6 V', 9],
    ['VISION_CAMERA', 'DETECT_TARGET', 'DETECTED', 'SYSTEM', 'Camera nhận diện mã ArUco #12 tại tủ nhận', 140],
    ['CARGO_HOOK', 'HOOK_RELEASE', 'RELEASED', 'SYSTEM', 'Móc thả kiện vào ô số 4', 142],
    ['PIXHAWK', 'ARMED', 'SUCCESS', 'TECHNICIAN', 'KTV khởi động động cơ trước chuyến bay', 160],
  ];
  return rows.map(([component, eventType, result, actorType, message, min], i) => ({
    id: 990500 + i, droneId, droneCode: code, component, eventType, result, actorType,
    actorId: actorType === 'TECHNICIAN' ? '800203' : null, orderId: i >= 3 ? 970304 : null, message, createdAt: ago(min),
  }));
}

// ---------------------------------------------------------------- phiếu sự cố (Kiosk + Drone)
function reports(h) {
  const base = (id, li, extra) => {
    const l = lockerOf(h, li);
    return { id, lockerId: l.id, boxId: null, userId: 800105, title: '', description: '', status: 'OPEN', assignedToUserId: null,
      assignedAt: null, resolvedByUserId: null, resolvedAt: null, createdAt: ago(30), updatedAt: ago(30), lockerCode: l.code,
      lockerName: l.name, lockerAddress: l.address, lockerLatitude: l.latitude, lockerLongitude: l.longitude, boxNumber: null,
      cellType: null, slaHours: 4, slaDueAt: ahead(200), overdue: false, reporterName: null, reporterPhone: null, attachments: [],
      category: 'BOX', blocksLocker: false, routedToUserId: null, scheduleId: null, droneUnitId: null, droneCode: null,
      reportCode: null, isDroneDrop: false, dropLatitude: null, dropLongitude: null, orderCode: null, orderId: null, incidentCode: null,
      ...extra };
  };
  return [
    base(920101, 0, { title: 'Cửa ô không đóng được', description: 'Khách báo cửa ô số 7 bật ra sau khi đóng, chốt không ăn.',
      boxId: 810007, boxNumber: 7, cellType: 'M', createdAt: ago(25), updatedAt: ago(25), slaDueAt: ahead(215),
      reporterName: h.NAMES[0], reporterPhone: h.phone(800101), routedToUserId: 800201 }),
    base(920102, 3, { title: 'Ô báo có đồ nhưng trống', description: 'Cảm biến ô số 2 báo có đồ dù ô đã trống.', status: 'IN_PROGRESS',
      boxId: 810102, boxNumber: 2, cellType: 'S', assignedToUserId: 800202, assignedAt: ago(150), createdAt: ago(180), updatedAt: ago(150),
      slaDueAt: ahead(60), reporterName: h.NAMES[3], reporterPhone: h.phone(800104) }),
    base(920103, 8, { title: 'Màn hình kiosk không phản hồi', description: 'Màn hình cảm ứng đứng hình, khách không thao tác được.',
      category: 'LOCKER', blocksLocker: true, createdAt: ago(380), updatedAt: ago(380), slaDueAt: ago(140), overdue: true,
      reporterName: h.NAMES[5], reporterPhone: h.phone(800106), routedToUserId: null }),
    base(920104, 0, { title: 'Kiểm tra định kỳ không đạt — bản lề ô 3', description: 'Bản lề ô 3 lỏng, phát hiện khi kiểm tra định kỳ.',
      status: 'RESOLVED', boxId: 810003, boxNumber: 3, cellType: 'M', scheduleId: 930001, assignedToUserId: 800201, assignedAt: ago(3000),
      resolvedByUserId: 800201, resolvedAt: ago(2600), createdAt: ago(3100), updatedAt: ago(2600), slaDueAt: ago(2860) }),
    base(920105, 7, { title: 'Khoá điện ô 5 kêu lạch cạch', description: 'Lần kiểm tra định kỳ ghi nhận khoá điện ô 5 hoạt động không êm.',
      status: 'IN_PROGRESS', boxId: 810705, boxNumber: 5, cellType: 'L', scheduleId: 930003, assignedToUserId: 800202, assignedAt: ago(4000),
      createdAt: ago(4300), updatedAt: ago(4000), slaHours: 24, slaDueAt: ahead(600) }),
    // Drone
    base(920201, 2, { title: 'Drone báo rơi kiện giữa chặng bay', description: 'Drone DRN-005 báo mất kiện trên đường bay tới tủ nhận.',
      category: 'DRONE', droneUnitId: 800305, droneCode: 'DRN-005', reportCode: 'DRN-DROP-2026-014', isDroneDrop: true,
      dropLatitude: 10.8183, dropLongitude: 106.7605, orderCode: `ORD-${today}-D7R0P6`, orderId: 970306, incidentCode: 'INC-2026-0014',
      createdAt: ago(12), updatedAt: ago(12), slaHours: 2, slaDueAt: ahead(108), reporterName: 'Hệ thống drone' }),
    base(920202, 4, { title: 'Drone mất tín hiệu GPS khi cất cánh', description: 'DRN-007 không khoá được GPS, tự hạ cánh tại bãi đáp.',
      category: 'DRONE', droneUnitId: 800307, droneCode: 'DRN-007', status: 'IN_PROGRESS', assignedToUserId: 800204, assignedAt: ago(200),
      createdAt: ago(260), updatedAt: ago(200), slaDueAt: ahead(20) }),
    base(920203, 7, { title: 'Pin drone phồng nhẹ', description: 'KTV phát hiện pin DRN-008 phồng khi sạc.', category: 'DRONE',
      droneUnitId: 800308, droneCode: 'DRN-008', createdAt: ago(420), updatedAt: ago(420), slaDueAt: ago(180), overdue: true }),
    base(920204, 4, { title: 'Hiệu chuẩn bay sau khi thay cánh', description: 'Hiệu chuẩn la bàn và bay thử DRN-003.', category: 'DRONE',
      droneUnitId: 800303, droneCode: 'DRN-003', status: 'RESOLVED', assignedToUserId: 800203, assignedAt: ago(5000),
      resolvedByUserId: 800203, resolvedAt: ago(4700), createdAt: ago(5200), updatedAt: ago(4700) }),
    base(920205, 0, { title: 'Cánh quạt số 2 nứt nhẹ', description: 'Phát hiện khi kiểm tra trước chuyến bay, đã thay cánh mới.', category: 'DRONE',
      droneUnitId: 800301, droneCode: 'DRN-001', status: 'RESOLVED', assignedToUserId: 800203, assignedAt: ago(14600),
      resolvedByUserId: 800203, resolvedAt: ago(14200), createdAt: ago(14700), updatedAt: ago(14200) }),
  ];
}

function repairLogs(reportId) {
  return [
    { id: 991001, reportId, actorUserId: 800201, note: 'Đã tới tủ, kiểm tra chốt khoá và cảm biến cửa.', createdAt: ago(18), attachments: [] },
    { id: 991002, reportId, actorUserId: 800201, note: '[GHI CHÚ HIỆN TRƯỜNG] Lò xo chốt yếu, thay lò xo mới, thử đóng/mở 10 lần ổn định.', createdAt: ago(9), attachments: [] },
  ];
}

// ---------------------------------------------------------------- lịch kiểm tra định kỳ
const KIOSK_CHECKLIST = ['Đóng/mở thử toàn bộ ô', 'Kiểm tra màn hình cảm ứng', 'Kiểm tra nguồn & UPS', 'Vệ sinh bề mặt tủ'];
const DRONE_CHECKLIST = ['Kiểm tra cánh quạt', 'Kiểm tra pin & sạc', 'Hiệu chuẩn la bàn', 'Bay thử 2 phút'];

function schedules(h) {
  const k = (id, li, extra) => {
    const l = lockerOf(h, li);
    return { id, lockerId: l.id, lockerName: l.name, lockerCode: l.code, title: '', intervalDays: 7, lastDoneAt: null, nextDueAt: ahead(2880),
      active: true, due: false, droneUnitId: null, droneCode: null, assignedTechnicianId: null, assignedTechnicianName: null, priority: 'NORMAL',
      description: 'Làm theo SOP kiểm tra tủ: chụp ảnh trước/sau, ghi điện áp UPS.', checklist: KIOSK_CHECKLIST.join('\n'),
      checklistItems: KIOSK_CHECKLIST, storeId: l.storeId, address: l.address, storeName: l.storeName, locationNote: null,
      scheduledTimeSlot: '08:00 - 11:30', lastResult: null, pendingReportId: null, createdAt: '2026-09-01T08:00:00', updatedAt: ago(600), ...extra };
  };
  return [
    k(930001, 0, { title: 'Kiểm tra định kỳ tủ Vincom Đồng Khởi', priority: 'HIGH', assignedTechnicianId: 800201,
      assignedTechnicianName: staffName(h, 800201), lastDoneAt: ago(7200), nextDueAt: ahead(2880), lastResult: 'PASSED', locationNote: 'Sảnh B1, cạnh thang cuốn' }),
    k(930002, 4, { title: 'Kiểm tra tủ FPT F-Town 3', due: true, nextDueAt: ago(60), scheduledTimeSlot: '13:30 - 17:00' }),
    k(930003, 7, { title: 'Kiểm tra tủ Crescent Mall', intervalDays: 14, assignedTechnicianId: 800202, assignedTechnicianName: staffName(h, 800202),
      nextDueAt: ago(2880), lastDoneAt: ago(4300), lastResult: 'FAILED', pendingReportId: 920105 }),
    k(930004, 7, { title: 'Bảo dưỡng định kỳ DRN-004', droneUnitId: 800304, droneCode: 'DRN-004', intervalDays: 14,
      checklist: DRONE_CHECKLIST.join('\n'), checklistItems: DRONE_CHECKLIST, assignedTechnicianId: 800204, assignedTechnicianName: staffName(h, 800204),
      lastDoneAt: ago(14400), nextDueAt: ahead(4320), lastResult: 'PASSED', locationNote: 'Bãi đáp tầng trệt' }),
    k(930005, 0, { title: 'Bảo dưỡng định kỳ DRN-001', droneUnitId: 800301, droneCode: 'DRN-001', intervalDays: 30,
      checklist: DRONE_CHECKLIST.join('\n'), checklistItems: DRONE_CHECKLIST, assignedTechnicianId: 800203, assignedTechnicianName: staffName(h, 800203),
      nextDueAt: ahead(1440 * 9), priority: 'HIGH' }),
  ];
}

function inspectionLogs(h) {
  const items = (labels, failIndex = -1) => JSON.stringify(labels.map((label, i) => ({ label, result: i === failIndex ? 'FAIL' : 'PASS', note: null })));
  const l0 = lockerOf(h, 0);
  const l7 = lockerOf(h, 7);
  return [
    { id: 932001, scheduleId: 930001, lockerId: l0.id, lockerName: l0.name, lockerCode: l0.code, technicianId: 800201, technicianName: staffName(h, 800201),
      status: 'PASSED', note: 'Toàn bộ ô đóng/mở ổn định, UPS 12.8 V.', photoUrls: [], checklistResults: items(KIOSK_CHECKLIST), createdReportId: null, createdAt: ago(7200) },
    { id: 932002, scheduleId: 930003, lockerId: l7.id, lockerName: l7.name, lockerCode: l7.code, technicianId: 800202, technicianName: staffName(h, 800202),
      status: 'FAILED', note: 'Khoá điện ô 5 kêu khi đóng.', photoUrls: [], checklistResults: items(KIOSK_CHECKLIST, 0), createdReportId: 920105, createdAt: ago(4300) },
    { id: 932003, scheduleId: 930004, lockerId: l7.id, lockerName: l7.name, lockerCode: l7.code, droneUnitId: 800304, droneCode: 'DRN-004',
      technicianId: 800204, technicianName: staffName(h, 800204), status: 'PASSED', note: 'Cánh quạt tốt, bay thử ổn.', photoUrls: [],
      checklistResults: items(DRONE_CHECKLIST), createdReportId: null, createdAt: ago(14400) },
  ];
}

function layout(h, lockerId) {
  const i = Math.max(0, lockerId - 800001);
  const l = lockerOf(h, Math.min(i, 9));
  const cells = Array.from({ length: 12 }, (_, k) => ({
    id: 810000 + i * 100 + k + 1, boxNumber: k + 1, size: ['S', 'M', 'L'][k % 3], cellType: k === 11 ? 'DRONE' : 'STANDARD',
    rowIndex: Math.floor(k / 4), colIndex: k % 4, status: k === 4 ? 'FAULT' : k % 3 === 1 ? 'OCCUPIED' : 'AVAILABLE',
    faultReason: k === 4 ? 'Khoá điện kêu' : null, doorOpen: false,
  }));
  return { lockerId: l.id, code: l.code, name: l.name, status: 'ACTIVE', landingPad: PADS.includes(i), landingMarkerId: null,
    totalCells: 12, availableCells: 7, faultCells: 1, cells };
}

function lockerStats(h) {
  return h.LOCKERS.map(([code, name], i) => ({ lockerId: 800001 + i, code, name, status: i === 6 ? 'MAINTENANCE' : 'ACTIVE',
    landingPad: PADS.includes(i), totalCells: 15, availableCells: 9, reservedCells: 2, occupiedCells: 3, faultCells: 1,
    utilization: 0.4, openReports: i === 0 ? 1 : 0 }));
}

// ---------------------------------------------------------------- hành trình drone
function weather(status, extra = {}) {
  const unsafe = status === 'UNSAFE';
  return { safe: !unsafe, status, message: unsafe ? 'Mưa lớn và gió giật vượt ngưỡng an toàn' : 'Thời tiết phù hợp để bay', checkedAt: ago(3),
    windowMinutes: 30, sampledRoutePoints: 3, maxWindSpeedKmh: unsafe ? 38 : 12, maxWindGustKmh: unsafe ? 55 : 19,
    maxPrecipitationMm: unsafe ? 6.4 : 0, worstWeatherCode: unsafe ? 65 : 2, provider: 'OPEN_METEO', temperatureC: unsafe ? 26 : 31,
    condition: unsafe ? 'Mưa vừa' : 'Ít mây', checkDisabled: false, ...extra };
}

function lockerWeather(h) {
  return PADS.map((i) => {
    const l = lockerOf(h, i);
    const bad = i === 4;
    return { lockerId: l.id, code: l.code, name: l.name, address: l.address, latitude: l.latitude, longitude: l.longitude,
      weather: weather(bad ? 'UNSAFE' : 'SAFE'),
      suspension: bad ? { lockerId: l.id, reason: 'WEATHER', reasonLabel: 'Thời tiết', note: null, suspendedByUserId: null,
        suspendedAt: ago(40), resumeAt: null } : null };
  });
}

function droneOrder(h, n) {
  const src = lockerOf(h, 0);
  const dst = lockerOf(h, n === 1 ? 2 : 4);
  const specs = {
    1: { id: 970301, code: `ORD-${today}-D7K2QF`, status: 'AWAITING_DISPATCH', stage: 'EN_ROUTE', mission: 'EN_ROUTE', drone: [800302, 'DRN-002'], created: 95, updated: 2 },
    2: { id: 970302, code: `ORD-${today}-D8M4TA`, status: 'AWAITING_DISPATCH', stage: 'AWAITING_DISPATCH', mission: null, drone: [null, null], created: 20, updated: 20 },
    3: { id: 970303, code: `ORD-${today}-D9P1XC`, status: 'AWAITING_DISPATCH', stage: 'PICKUP_ASSIGNED', mission: null, drone: [null, null], created: 45, updated: 15 },
    4: { id: 970304, code: `ORD-${today}-D2H8LN`, status: 'COMPLETED', stage: 'READY_FOR_PICKUP', mission: 'DEPOSITED', drone: [800301, 'DRN-001'], created: 400, updated: 180 },
    5: { id: 970305, code: `ORD-${today}-D5W3RB`, status: 'CANCELED', stage: 'FAILED', mission: 'FAILED', drone: [800304, 'DRN-004'], created: 600, updated: 300 },
    6: { id: 970306, code: `ORD-${today}-D7R0P6`, status: 'AWAITING_DISPATCH', stage: 'DROP_REPORTED', mission: 'DROP_REPORTED', drone: [800305, 'DRN-005'], created: 150, updated: 12 },
  }[n];
  const flying = n === 1;
  const ev = (id, from, to, min, note = null, actor = null) => ({ id, fromStage: from, toStage: to, actorUserId: actor ? actor[0] : null,
    actorName: actor ? actor[1] : null, note, occurredAt: ago(min), latitude: null, longitude: null, locationSource: null });
  const techA = [800203, staffName(h, 800203)];
  const events = flying ? [
    ev(9703017, 'DEPARTED', 'EN_ROUTE', 2, null),
    ev(9703016, 'LAUNCHING', 'DEPARTED', 6),
    ev(9703015, 'ACCEPTED', 'LAUNCHING', 8, null, techA),
    ev(9703014, 'ACCEPTED', 'ACCEPTED', 12, 'Đã cân kiện 820 g, niêm phong SEAL-4471', techA),
    ev(9703013, 'PICKED_UP', 'ACCEPTED', 30, null, techA),
    ev(9703012, 'PICKUP_ASSIGNED', 'PICKED_UP', 55, null, techA),
    ev(9703011, null, 'AWAITING_DISPATCH', 95),
  ] : [ev(spec2id(specs.id), null, 'AWAITING_DISPATCH', specs.created)];
  return {
    pickup: flying || n === 3 ? { status: flying ? 'PICKED_UP' : 'ACCEPTED', address: '15 Nguyễn Huệ, P. Bến Nghé, Quận 1', latitude: 10.7745,
      longitude: 106.7038, note: 'Gọi trước 5 phút', distanceToSourceLockerMeters: 520, technicianId: 800203, technicianName: staffName(h, 800203),
      technicianPhone: h.phone(800203), technicianDistanceMeters: flying ? null : 900, offeredAt: ago(60), offerExpiresAt: null, acceptedAt: ago(58),
      pickedUpAt: flying ? ago(30) : null, failureReason: null, failureNote: null, technicianNote: flying ? 'Đã nhận kiện, hộp còn nguyên' : null,
      pickupPhotoUrl: null, pickupPhotoCapturedAt: null } : null,
    sender: { name: h.NAMES[1], phone: h.phone(800102), email: h.demoMail(h.NAMES[1], 800102) },
    receiverEmail: h.demoMail(h.NAMES[4], 800109), block: null, failure: null,
    orderId: specs.id, orderCode: specs.code, userId: 800102, receiverUserId: 800109, destinationLockerId: dst.id, reservedBoxId: 810412,
    reservedBoxNumber: 12, sourceBoxId: null, sourceBoxNumber: null, type: 'DRONE_DELIVERY', status: specs.status, deliveryStage: specs.stage,
    paymentStatus: n === 5 ? 'REFUND_PENDING' : 'PAID', parcelWeightGrams: 800, description: 'Hộp tài liệu hợp đồng', totalPrice: 45000,
    weightSurcharge: null, amountDue: 0, originalPrice: 45000, discount: 0, promotionCode: null, pointsUsed: null, pointsDiscount: null,
    createdAt: ago(specs.created), updatedAt: ago(specs.updated), fulfillmentMode: 'STANDARD', missionId: specs.mission ? specs.id - 900000 : null,
    missionStatus: specs.mission, droneUnitId: specs.drone[0], droneCode: specs.drone[1], sourceLockerId: src.id, etaMinutes: flying ? 7 : null,
    currentLatitude: flying ? 10.7872 : null, currentLongitude: flying ? 106.7121 : null,
    assignedByUserId: specs.mission ? 800203 : null, assignedByName: specs.mission ? staffName(h, 800203) : null,
    payloadWeightGrams: specs.mission ? 820 : null, sealCode: specs.mission ? 'SEAL-4471' : null,
    loadedByUserId: specs.mission ? 800203 : null, loadedByName: specs.mission ? staffName(h, 800203) : null,
    loadingNote: specs.mission ? 'Kiện cố định chắc trong khoang' : null, parcelMatched: specs.mission ? true : null,
    payloadSecured: specs.mission ? true : null, compartmentLocked: specs.mission ? true : null,
    loadedAt: specs.mission ? ago(12) : null, readyToLaunchAt: specs.mission ? ago(9) : null, launchingAt: specs.mission ? ago(8) : null,
    missionCreatedAt: specs.mission ? ago(14) : null, missionUpdatedAt: specs.mission ? ago(2) : null, paidAt: ago(specs.created - 1),
    paymentMethod: 'SEPAY', paymentReference: `LOCKR${specs.id}`, paymentTransactionId: `FT26${specs.id}`, pickupDeadline: null,
    completedAt: n === 4 ? ago(180) : null, customerName: h.NAMES[1], customerPhone: h.phone(800102), receiverName: h.NAMES[4],
    receiverPhone: h.phone(800109), cancelReason: n === 5 ? 7 : null, cancelNote: n === 5 ? 'Gió mạnh, drone quay về' : null, staffNote: null,
    sourceLocker: point(src), destinationLocker: point(dst), parcelLengthCm: 30, parcelWidthCm: 22, parcelHeightCm: 6, parcelCategory: 'DOCUMENT',
    declaredValue: 500000, fragile: false, routeDistanceMeters: 9800, parcelDroppedAt: null, parcelReturnPending: n === 5,
    parcelHeldAt: n === 5 ? 'FLIGHT_TEAM' : null, parcelReturnedAt: null, parcelReturnNote: null, batteryPercentAtLaunch: specs.mission ? 94 : null,
    landedAt: n === 4 ? ago(185) : null, depositedAt: n === 4 ? ago(184) : null, depositedByName: null, missionEndedAt: n === 4 ? ago(184) : null,
    failedStage: n === 5 ? 'EN_ROUTE' : null, journeyEvents: events,
  };
}
function spec2id(id) { return id * 10 + 1; }

function flightTrack(h) {
  const a = lockerOf(h, 0);
  const b = lockerOf(h, 2);
  return Array.from({ length: 8 }, (_, k) => {
    const f = (7 - k) / 14; // mới nhất trước, tới khoảng giữa đường
    return { recordedAt: ago(k), stage: k > 5 ? 'DEPARTED' : 'EN_ROUTE', latitude: +(a.latitude + (b.latitude - a.latitude) * f).toFixed(5),
      longitude: +(a.longitude + (b.longitude - a.longitude) * f).toFixed(5), altitudeM: 60, headingDeg: 62, speedMps: 12.5,
      batteryPercent: 88 - k, droneCode: 'DRN-002', source: 'DRONE' };
  });
}

// ---------------------------------------------------------------- sự cố rơi kiện
function incidents(h) {
  const base = (id, n, extra) => ({
    id, incidentCode: `INC-2026-00${n}`, orderId: 970306, orderCode: `ORD-${today}-D7R0P6`, missionId: 70306, droneUnitId: 800305, droneCode: 'DRN-005',
    customerUserId: 800102, reportedByUserId: 800203, reason: 'Drone báo mất kiện giữa chặng bay', status: 'REPORTED', parcelStatus: 'MISSING',
    recoveryStatus: 'AWAITING_ASSIGNMENT', inspectionStatus: 'NOT_STARTED', redeliveryStatus: 'NOT_REQUIRED', compensationStatus: 'NOT_REQUIRED',
    returnFlightStatus: 'NOT_REQUIRED', dropLatitude: 10.8183, dropLongitude: 106.7605, gpsAccuracyM: 8, gpsSource: 'DRONE', telemetryObservedAt: ago(12),
    telemetryStale: false, telemetryJson: null, cameraStatus: 'UNAVAILABLE', cameraSnapshotUrl: null, inspectionReportId: 920201,
    recoveryAssignedToUserId: null, recoveryLockerId: null, recoveryOutcome: null, parcelCondition: null, recoveryNote: null,
    recoveredLatitude: null, recoveredLongitude: null, recoveredGpsAccuracyM: null, returnedToHubAt: null, redeliveryOrderId: null,
    compensationReference: null, orderStatus: 'AWAITING_DISPATCH', deliveryStage: 'DROP_REPORTED', compensationRate: 1, declaredValue: 500000,
    suggestedCompensation: 500000, recoveryTechnicianName: null, recoveryTechnicianPhone: null, recoveryTechnicianRole: null,
    compensationCap: 2000000, freeRedeliveryAllowed: true, refundShippingFeeAllowed: true, recoverySlaHours: 2, approvalRequired: false,
    incidentPolicyEnabled: true, createdAt: ago(12), updatedAt: ago(10), evidence: [], timeline: [
      { id: 9604011, eventType: 'INCIDENT_REPORTED', fromStatus: null, toStatus: 'REPORTED', actorUserId: null, note: 'Drone tự báo mất kiện', metadataJson: null, createdAt: ago(12) },
      { id: 9604012, eventType: 'ORDER_BLOCKED', fromStatus: null, toStatus: null, actorUserId: null, note: 'Đơn dừng giao để thu hồi kiện', metadataJson: null, createdAt: ago(11) },
    ], proposals: [], ...extra,
  });
  return [
    base(960401, 14, {}),
    base(960402, 11, { orderId: 970291, orderCode: `ORD-${today}-C4N7QE`, droneCode: 'DRN-002', droneUnitId: 800302, status: 'RECOVERY_IN_PROGRESS',
      recoveryStatus: 'SEARCHING', recoveryAssignedToUserId: 800201, recoveryTechnicianName: staffName(h, 800201), recoveryTechnicianPhone: h.phone(800201),
      recoveryTechnicianRole: 'LOCKER_TECHNICIAN', createdAt: ago(300), updatedAt: ago(40) }),
    base(960403, 9, { orderId: 970280, orderCode: `ORD-${today}-B2K5ZT`, status: 'AWAITING_CUSTOMER_RESPONSE', recoveryStatus: 'VERIFIED',
      recoveryOutcome: 'FOUND', parcelCondition: 'MINOR_DAMAGE', parcelStatus: 'RETURNED_TO_HUB', inspectionStatus: 'PASSED',
      recoveryTechnicianName: staffName(h, 800204), recoveryTechnicianRole: 'DRONE_TECHNICIAN', createdAt: ago(2900), updatedAt: ago(600) }),
    base(960404, 7, { orderId: 970260, orderCode: `ORD-${today}-A9F3WD`, status: 'CLOSED', recoveryStatus: 'VERIFIED', recoveryOutcome: 'FOUND',
      parcelStatus: 'REDELIVERED', recoveryTechnicianName: staffName(h, 800203), recoveryTechnicianRole: 'DRONE_TECHNICIAN', createdAt: ago(9000), updatedAt: ago(7000) }),
  ];
}

function presences(h) {
  return [[800201, 10.8102, 106.7311], [800202, 10.7712, 106.6702], [800203, 10.7925, 106.7215], [800204, 10.8455, 106.8051]].map(([userId, lat, lng], i) => ({
    userId, userName: staffName(h, userId), technicianType: h.STAFF.find((s) => s[0] === userId)[2], onDuty: i !== 1, latitude: lat, longitude: lng,
    accuracyM: 12, headingDeg: null, speedMs: null, altitudeM: null, batteryLevel: 80 - i * 7, deviceInfo: null, shiftStartedAt: ago(180),
    shiftEndedAt: null, lastLocatedAt: ago(2 + i), updatedAt: ago(2 + i) }));
}

// ---------------------------------------------------------------- điều khiển bay
function flightBlocks(h) {
  const rows = [
    ['WEATHER_UNSAFE', 'BOOKING', null, 0, 4, 'Mưa lớn tại tủ nhận — tạm không nhận đơn mới', true, 30],
    ['STATION_SUSPENDED', 'LAUNCH', 970299, 0, 4, 'Trạm nhận đang tạm dừng bay', false, 45],
    ['WEATHER_UNSAFE', 'ACCEPT', 970298, 2, 4, 'Gió giật vượt ngưỡng 45 km/h', true, 70],
    ['WEATHER_UNAVAILABLE', 'BOOKING', null, 7, 0, 'Chưa lấy được dự báo thời tiết', false, 160],
    ['WEATHER_UNSAFE', 'IN_PROGRESS', 970297, 0, 7, 'Drone quay về do mưa trên tuyến', true, 300],
  ];
  return rows.map(([cause, action, orderId, s, d, message, w, min], i) => ({
    id: 975000 + i, createdAt: ago(min), action, cause, orderId, orderCode: orderId ? `ORD-${today}-F${i}X${i}Q2` : null, actorUserId: null,
    sourceLockerId: 800001 + s, destinationLockerId: 800001 + d, blockedLockerId: cause === 'STATION_SUSPENDED' ? 800001 + d : null, message,
    weatherStatus: w ? 'UNSAFE' : null, maxWindSpeedKmh: w ? 38 : null, maxWindGustKmh: w ? 55 : null, maxPrecipitationMm: w ? 6.4 : null,
    weatherCode: w ? 65 : null, weatherProvider: w ? 'OPEN_METEO' : null,
  }));
}

function suspensionLogs() {
  return [
    { id: 976001, lockerId: 800005, action: 'SUSPEND', reason: 'WEATHER', note: 'Tự dừng do mưa lớn', resumeAt: null, actorUserId: null, createdAt: ago(40) },
    { id: 976002, lockerId: 800008, action: 'RESUME', reason: null, note: 'Bãi đáp đã sửa xong', resumeAt: null, actorUserId: 800205, createdAt: ago(600) },
    { id: 976003, lockerId: 800008, action: 'SUSPEND', reason: 'LANDING_PAD', note: 'Thay tấm đánh dấu bãi đáp', resumeAt: ago(600), actorUserId: 800205, createdAt: ago(900) },
  ];
}

function setting(key, type, value, extra = {}) {
  return { scope: 'order', key, group: 'Thời tiết & điều kiện bay', label: key, description: null, type, value, defaultValue: value,
    overridden: false, min: null, max: null, unit: null, allowedValues: null, publicValue: false, updatedByUserId: null, updatedAt: null, ...extra };
}

function orderSettings() {
  return [
    setting('app.order.drone-flights-suspended', 'BOOLEAN', 'false', { group: 'Giao hàng drone', label: 'Tạm dừng toàn bộ chuyến bay drone' }),
    setting('app.drone.weather.check-enabled', 'BOOLEAN', 'true', { label: 'Bật kiểm tra thời tiết trước khi bay' }),
    setting('app.drone.lid-test.enabled', 'BOOLEAN', 'false', { group: 'Giao hàng drone', label: 'Chế độ thử nắp trượt theo mã ArUco' }),
    setting('app.drone.demo.enabled', 'BOOLEAN', 'true', { group: 'Mô phỏng & Thử nghiệm Drone', label: 'Cho phép chế độ drone DEMO' }),
    setting('app.drone.weather.max-wind-kmh', 'INTEGER', '30', { label: 'Gió tối đa cho phép bay', unit: 'km/h', min: '5', max: '80',
      description: 'Dự báo gió vượt ngưỡng này trong 30 phút tới thì không cho đặt đơn / phóng drone.' }),
    setting('app.drone.weather.max-gust-kmh', 'INTEGER', '45', { label: 'Gió giật tối đa', unit: 'km/h', min: '5', max: '100' }),
    setting('app.drone.weather.max-precipitation-mm', 'DECIMAL', '1.0', { label: 'Lượng mưa tối đa', unit: 'mm', min: '0', max: '20' }),
    setting('app.order.drone-flight-start-hour', 'INTEGER', '7', { group: 'Giao hàng drone', label: 'Giờ bắt đầu bay', unit: 'giờ', min: '0', max: '23' }),
    setting('app.order.drone-flight-end-hour', 'INTEGER', '19', { group: 'Giao hàng drone', label: 'Giờ kết thúc bay', unit: 'giờ', min: '0', max: '23' }),
    setting('app.order.drone-min-preflight-battery-percent', 'INTEGER', '60', { group: 'Giao hàng drone', label: 'Pin tối thiểu trước khi cất cánh', unit: '%', min: '20', max: '100' }),
    setting('app.order.drone-return-min-battery-percent', 'INTEGER', '25', { group: 'Giao hàng drone', label: 'Pin tối thiểu để quay về', unit: '%', min: '10', max: '80' }),
  ];
}

// ---------------------------------------------------------------- nhật ký drone ↔ tủ
function commLogs() {
  const order = 970304;
  const seq = [
    ['TARGET_REQUEST', 'DRONE', 'BACKEND', 'SUCCESS', 'Drone DRN-001 hỏi ô đích của đơn', null],
    ['MARKER_DETECTED', 'DRONE', 'BACKEND', 'SUCCESS', 'Camera thấy mã ArUco #12 trên nắp ô', null],
    ['MARKER_VALIDATED', 'BACKEND', 'DRONE', 'SUCCESS', 'Mã ArUco #12 khớp ô số 12 của đơn', null],
    ['OPEN_LID_REQUESTED', 'BACKEND', 'LOCKER', 'SUCCESS', 'Gửi lệnh mở nắp ô số 12', 'CMD-OPEN-0412'],
    ['LID_OPENED', 'LOCKER', 'BACKEND', 'SUCCESS', 'Tủ báo nắp ô 12 đã mở', 'CMD-OPEN-0412'],
    ['DROP_PHASE_STARTED', 'BACKEND', 'DRONE', 'SUCCESS', 'Cho phép drone thả kiện', null],
    ['DROP_PHASE_COMPLETED', 'DRONE', 'BACKEND', 'SUCCESS', 'Drone đã thả kiện vào ô', null],
    ['CLOSE_LID_REQUESTED', 'BACKEND', 'LOCKER', 'SUCCESS', 'Gửi lệnh đóng nắp ô số 12', 'CMD-CLOSE-0412'],
    ['LID_CLOSED', 'LOCKER', 'BACKEND', 'SUCCESS', 'Tủ báo nắp ô 12 đã đóng', 'CMD-CLOSE-0412'],
    ['DELIVERY_READY', 'BACKEND', 'BACKEND', 'SUCCESS', 'Kiện sẵn sàng, đã gửi mã nhận hàng', null],
  ];
  const a = seq.map(([eventType, src, dst, st, message, messageId], i) => ({
    id: 977100 + i, messageId, correlationId: 'S-0412', sessionId: 'S-0412', orderId: order, journeyId: null, droneId: 'DRN-001', lockerId: 800003,
    compartmentId: 810412, markerId: 12, markerDictionary: 'DICT_4X4_50', sourceDevice: src, destinationDevice: dst, targetDevice: null,
    mqttTopic: `lockr/drone/${eventType.toLowerCase()}`, eventType, direction: src === 'BACKEND' ? 'OUTBOUND' : 'INBOUND', payload: message,
    payloadJson: null, publishStatus: null, deliveryStatus: null, ackStatus: null, processingStatus: st, errorCode: null, errorMessage: null,
    retryCount: 0, processingDurationMs: 40, timestamp: ago(200 - i), createdAt: ago(200 - i), processedAt: ago(200 - i),
  })).reverse();
  const b = [
    { id: 977200, eventType: 'MARKER_REJECTED', processingStatus: 'REJECTED', errorCode: 'WRONG_MARKER', payload: 'Mã ArUco #9 không thuộc ô của đơn', min: 20 },
    { id: 977201, eventType: 'MARKER_DETECTED', processingStatus: 'SUCCESS', errorCode: null, payload: 'Camera thấy mã ArUco #9', min: 21 },
  ].map(({ id, eventType, processingStatus, errorCode, payload, min }) => ({
    id, messageId: null, correlationId: 'S-0301', sessionId: 'S-0301', orderId: 970301, journeyId: null, droneId: 'DRN-002', lockerId: 800005,
    compartmentId: 810512, markerId: 9, markerDictionary: 'DICT_4X4_50', sourceDevice: eventType === 'MARKER_REJECTED' ? 'BACKEND' : 'DRONE',
    destinationDevice: eventType === 'MARKER_REJECTED' ? 'DRONE' : 'BACKEND', targetDevice: null, mqttTopic: 'lockr/drone/marker', eventType,
    direction: 'INBOUND', payload, payloadJson: null, publishStatus: null, deliveryStatus: null, ackStatus: null, processingStatus, errorCode,
    errorMessage: errorCode ? payload : null, retryCount: 0, processingDurationMs: 35, timestamp: ago(min), createdAt: ago(min), processedAt: ago(min),
  }));
  return [...b, ...a];
}

export default function ({ path, query, method }, h) {
  if (method !== 'GET') return undefined;
  let m;

  // ---- Bảo trì: phiếu sự cố, heartbeat, lịch định kỳ
  if (path === '/api/admin/lockers/reports' || path === '/api/locker-technician/reports') return h.ok(reports(h));
  if ((m = path.match(/^\/api\/locker-technician\/reports\/(\d+)\/logs$/))) return h.ok(repairLogs(Number(m[1])));
  if (path === '/api/locker-technician/faults') {
    const l = lockerOf(h, 7);
    return h.ok([{ lockerId: l.id, lockerCode: l.code, lockerName: l.name, lockerAddress: l.address, lockerLatitude: l.latitude,
      lockerLongitude: l.longitude, boxId: 810705, boxNumber: 5, cellType: 'L', rowIndex: 1, colIndex: 0, faultReason: 'Khoá điện kêu', openReportId: 920105 }]);
  }
  if (path === '/api/admin/iot/device-status') {
    return h.ok([[0, 'ONLINE', 1], [2, 'ONLINE', 1], [4, 'OFFLINE', 190], [7, 'ONLINE', 2]].map(([i, status, min], k) => ({
      id: 940001 + k, deviceId: `PI-${h.LOCKERS[i][0]}`, lockerId: 800001 + i, status, lastSeenAt: ago(min) })));
  }
  if (path === '/api/maintenance/schedules') return h.ok(schedules(h));
  if (path === '/api/maintenance/inspection-logs') return h.ok(inspectionLogs(h));
  if ((m = path.match(/^\/api\/maintenance\/schedules\/(\d+)\/logs$/))) {
    return h.ok(inspectionLogs(h).filter((l) => l.scheduleId === Number(m[1])));
  }
  if ((m = path.match(/^\/api\/lockers\/(\d+)\/layout$/))) return h.ok(layout(h, Number(m[1])));
  if (path === '/api/admin/lockers/stats') return h.ok(lockerStats(h));
  if ((m = path.match(/^\/api\/admin\/drone-orders\/by-ticket\/(\d+)$/))) return h.ok([]);
  if (path === '/api/admin/maintenance/technicians/presence') return h.ok(presences(h));

  // ---- Đội drone
  if (path === '/api/admin/drones') return h.ok(drones(h));
  if ((m = path.match(/^\/api\/admin\/drones\/(\d+)(\/[a-z-]+)?$/))) {
    const id = Number(m[1]);
    const d = drones(h).find((x) => x.id === id) ?? drones(h)[0];
    const sub = m[2] ?? '';
    if (sub === '') return h.ok(d);
    if (sub === '/device') return h.ok(device(d.id, d.code));
    if (sub === '/iot-logs') return h.ok(iotLogs(d.id, d.code));
    if (sub === '/logs') {
      return h.ok([
        ['Ghi nhận mức pin 96% (sạc đầy)', 800203, 30],
        ['Chuyển trạng thái MAINTENANCE → IDLE — đã thay cánh quạt, bay thử ổn', 800205, 1500],
        [`Phân công KTV ${staffName(h, 800203)}`, 800205, 4300],
        ['Gán bộ điều khiển Pi (MAC DC:A6:32:0D:EE:01)', 800205, 9000],
      ].map(([note, actorUserId, min], i) => ({ id: 978000 + i, droneUnitId: d.id, actorUserId, note, createdAt: ago(min) })));
    }
    if (sub === '/maintenance-history') {
      const log = inspectionLogs(h)[2];
      return h.ok({ droneUnitId: d.id, droneCode: d.code, completedMaintenance: [{ ...log, droneUnitId: d.id, droneCode: d.code }],
        resolvedIncidents: reports(h).filter((r) => r.id === 920204).map((r) => ({ ...r, droneUnitId: d.id, droneCode: d.code })) });
    }
    return undefined;
  }
  if (path === '/api/admin/drone-devices') return h.ok([device(800301, 'DRN-001')]);
  if (path === '/api/admin/iot/gateways') return h.ok([]);

  // ---- Hành trình drone
  if (path === '/api/admin/drone-orders/weather/lockers') return h.ok(lockerWeather(h));
  if (path === '/api/admin/drone-orders') {
    const all = [1, 2, 3, 6, 5, 4].map((n) => droneOrder(h, n));
    const finished = (o) => ['COMPLETED', 'CANCELED', 'EXPIRED'].includes(o.status) && !o.parcelReturnPending;
    return h.ok(query.includeFinished === 'false' ? all.filter((o) => !finished(o)) : all);
  }
  if ((m = path.match(/^\/api\/admin\/drone-orders\/(\d+)(\/[a-z-]+(?:\/[a-z-]+)?)?$/))) {
    const id = Number(m[1]);
    const n = { 970301: 1, 970302: 2, 970303: 3, 970304: 4, 970305: 5, 970306: 6 }[id] ?? 1;
    const sub = m[2] ?? '';
    if (sub === '') return h.ok(droneOrder(h, n));
    if (sub === '/flight-track') return h.ok(n === 1 ? flightTrack(h) : []);
    if (sub === '/weather') {
      return h.ok({ orderId: id, sourceLockerId: 800001, sourceLockerName: h.LOCKERS[0][1], destinationLockerId: n === 1 ? 800003 : 800005,
        destinationLockerName: h.LOCKERS[n === 1 ? 2 : 4][1], weather: weather('SAFE') });
    }
    if (sub === '/camera') {
      return h.ok({ status: 'UNAVAILABLE', integrationAvailable: false, droneCode: 'DRN-002', journeyStatus: 'EN_ROUTE', telemetryLive: true,
        batteryPercent: 82, flightMode: 'AUTO', latitude: 10.7872, longitude: 106.7121, observedAt: ago(0) });
    }
    if (sub === '/pickup/candidates') {
      return h.ok([800203, 800204].map((technicianId, i) => ({ technicianId, name: staffName(h, technicianId), phone: h.phone(technicianId),
        onDuty: true, busy: i === 0, locationFresh: true, distanceMeters: 900 + i * 1400, locationAt: ago(2) })));
    }
    return undefined;
  }

  // ---- Sự cố rơi kiện
  if (path === '/api/admin/drone-incidents') return h.ok(incidents(h));
  if ((m = path.match(/^\/api\/admin\/drone-incidents\/(\d+)$/))) {
    return h.ok(incidents(h).find((x) => x.id === Number(m[1])) ?? incidents(h)[0]);
  }

  // ---- Thời tiết & điều khiển bay
  const FC = '/api/admin/drone-flight-control';
  if (path === `${FC}/stations`) return h.ok(lockerWeather(h));
  if (path === `${FC}/blocks/summary`) return h.ok({ WEATHER_UNSAFE: 3, WEATHER_UNAVAILABLE: 1, FLIGHTS_SUSPENDED: 0, STATION_SUSPENDED: 1 });
  if (path === `${FC}/blocks/summary/stations`) return h.ok({ 800005: 4, 800008: 1 });
  if (path === `${FC}/blocks`) {
    const content = flightBlocks(h);
    return h.ok({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 });
  }
  if (path === `${FC}/suspension-logs`) return h.ok(suspensionLogs());
  if (path === '/api/admin/settings/order') return h.ok(orderSettings());
  if (path === '/api/admin/settings/order/audits') return h.ok([]);

  // ---- Nhật ký drone ↔ tủ
  if (path === '/api/admin/drone-locker-logs/active-sessions') return h.ok([]);
  if (path === '/api/admin/drone-locker-logs/lid-test') {
    return h.ok({ enabled: false, lockerId: 800003, holdSeconds: 5, activeSessions: [],
      targets: [{ markerId: 12, boxId: 810412, boxNumber: 12, cellLockerId: 800003, cellMarkerId: 12, problem: null },
        { markerId: 14, boxId: 810414, boxNumber: 14, cellLockerId: 800003, cellMarkerId: 14, problem: null }] });
  }
  if ((m = path.match(/^\/api\/admin\/drone-locker-logs\/(orders|sessions)\/.+$/))) return h.ok([]);
  if (path === '/api/admin/drone-locker-logs') {
    const content = commLogs();
    return h.ok({ content, page: 0, size: Number(query.size ?? 50), totalElements: content.length, totalPages: 1 });
  }

  return undefined;
}

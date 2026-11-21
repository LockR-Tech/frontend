// Dữ liệu giả cho ảnh HDSD khu admin-ops / phần KTV (trang /admin/technicians + chi tiết KTV) — chỉ dùng khi chụp,
// tên/số giả. KTV mẫu lấy từ h.STAFF (800201/800202 KTV tủ, 800203/800204 KTV drone); KTV đầu danh sách là 800201.

const techAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString().slice(0, 19);
const techIn = (hours) => techAgo(-hours);

// Hiệu suất mẫu theo KTV (mức chế tài do máy chủ tính — 800201 đang "Cảnh báo SLA" để ảnh có nút "Gửi cảnh cáo SLA").
const TECH_PERF = {
  800201: { totalAssigned: 6, inProgress: 2, resolved: 3, overdue: 1, penaltyLevel: 'WARNING',
    penaltyReason: 'Có 1 phiếu trễ hạn SLA — đã chạm ngưỡng cảnh báo.', ratingCount: 4, averageRating: 4.5 },
  800202: { totalAssigned: 4, inProgress: 0, resolved: 4, overdue: 0, penaltyLevel: 'NORMAL', penaltyReason: '', ratingCount: 3, averageRating: 4.7 },
  800203: { totalAssigned: 3, inProgress: 1, resolved: 2, overdue: 0, penaltyLevel: 'NORMAL', penaltyReason: '', ratingCount: 2, averageRating: 5 },
  800204: { totalAssigned: 2, inProgress: 0, resolved: 2, overdue: 0, penaltyLevel: 'NORMAL', penaltyReason: '', ratingCount: 0, averageRating: 0 },
};
const TECH_COMMENTS = ['Sửa nhanh, ô mở lại bình thường.', 'Kỹ thuật viên tới đúng giờ, giải thích rõ.', '', 'Thay khoá cửa ô gọn gàng.'];

function techReport(h, id, lockerIdx, extra) {
  const lk = h.LOCKERS[lockerIdx];
  const store = h.STORES[lk[2]];
  return {
    id, lockerId: 800001 + lockerIdx, boxId: null, userId: 800105, title: 'Sự cố ô tủ', description: '',
    status: 'OPEN', assignedToUserId: null, assignedAt: null, resolvedByUserId: null, resolvedAt: null,
    createdAt: techAgo(30), updatedAt: techAgo(1), lockerCode: lk[0], lockerName: lk[1], lockerAddress: store[2],
    lockerLatitude: null, lockerLongitude: null, boxNumber: null, cellType: 'STANDARD', slaHours: 4,
    slaDueAt: techIn(2), overdue: false, slaExtendedHours: 0, slaExtensionReason: null,
    reporterName: h.NAMES[id % h.NAMES.length], reporterPhone: h.phone(id), attachments: [], category: 'LOCKER',
    blocksLocker: false, routedToUserId: null, scheduleId: null, droneUnitId: null, droneCode: null,
    ...extra,
  };
}

function techReports(h) {
  const mine = { assignedToUserId: 800201 };
  return [
    techReport(h, 950101, 0, { ...mine, status: 'IN_PROGRESS', title: 'Cửa ô số 7 không mở', boxNumber: 7, assignedAt: techAgo(5),
      createdAt: techAgo(6), slaDueAt: techAgo(2), overdue: true, description: 'Khách quét mã nhưng cửa ô không bật ra, phải nhờ quầy hỗ trợ.' }),
    techReport(h, 950102, 1, { ...mine, status: 'IN_PROGRESS', title: 'Màn hình kiosk đơ cảm ứng', assignedAt: techAgo(1.5),
      createdAt: techAgo(2), slaDueAt: techIn(2.5), description: 'Màn hình không nhận chạm ở góc phải.' }),
    techReport(h, 950103, 0, { ...mine, status: 'OPEN', title: 'Đèn ô số 3 nhấp nháy', boxNumber: 3, assignedAt: techAgo(0.5),
      createdAt: techAgo(0.6), slaDueAt: techIn(3.4), description: 'Đèn báo trong ô sáng chập chờn.' }),
    techReport(h, 950104, 1, { ...mine, status: 'RESOLVED', title: 'Cảm biến cửa ô số 12 báo sai', boxNumber: 12, assignedAt: techAgo(50),
      createdAt: techAgo(52), resolvedAt: techAgo(47), resolvedByUserId: 800201, slaDueAt: techAgo(48) }),
    techReport(h, 950105, 0, { ...mine, status: 'RESOLVED', title: 'Mất kết nối bộ điều khiển', assignedAt: techAgo(98),
      createdAt: techAgo(100), resolvedAt: techAgo(96), resolvedByUserId: 800201, slaDueAt: techAgo(96) }),
    techReport(h, 950106, 1, { ...mine, status: 'RESOLVED', title: 'Bản lề cửa ô số 2 lỏng', boxNumber: 2, assignedAt: techAgo(170),
      createdAt: techAgo(172), resolvedAt: techAgo(168), resolvedByUserId: 800201, slaDueAt: techAgo(168) }),
    techReport(h, 950107, 2, { assignedToUserId: 800202, status: 'RESOLVED', title: 'Khoá điện ô số 5 kẹt', boxNumber: 5,
      assignedAt: techAgo(30), resolvedAt: techAgo(27), resolvedByUserId: 800202 }),
    // Phiếu tủ chưa ai nhận — hiện trong hộp thoại "Phân công sự cố mới".
    techReport(h, 950108, 3, { title: 'Ô số 9 báo đầy nhưng trống', boxNumber: 9, createdAt: techAgo(0.8), slaDueAt: techIn(3.2),
      description: 'Ứng dụng báo ô đang có hàng nhưng mở ra trống.' }),
    techReport(h, 950109, 4, { title: 'Tủ mất điện tầng hầm', createdAt: techAgo(0.3), slaDueAt: techIn(3.7),
      description: 'Toàn bộ màn hình và đèn tủ tắt.' }),
    techReport(h, 950110, 2, { status: 'IN_PROGRESS', assignedToUserId: 800203, category: 'DRONE', droneUnitId: 800301, droneCode: 'DRN-001',
      title: 'Drone báo lỗi la bàn', assignedAt: techAgo(3) }),
  ];
}

function techPresence(h) {
  return h.STAFF.filter(([, , role]) => role !== 'ADMIN').map(([userId, userName, technicianType], i) => {
    const onDuty = i !== 1;
    return {
      userId, userName, technicianType, onDuty,
      latitude: onDuty ? [10.7769, 0, 10.8411, 10.7298][i] : null,
      longitude: onDuty ? [106.7009, 0, 106.8098, 106.7219][i] : null,
      accuracyM: onDuty ? [8.5, 0, 12.2, 6.1][i] : null, headingDeg: null, speedMs: null, altitudeM: null,
      batteryLevel: onDuty ? 78 - i * 9 : null, deviceInfo: 'Android 14',
      shiftStartedAt: onDuty ? techAgo(3 + i) : techAgo(30), shiftEndedAt: onDuty ? null : techAgo(22),
      lastLocatedAt: onDuty ? techAgo(0.05) : null, updatedAt: techAgo(0.05),
    };
  });
}

function techSchedules(h) {
  const base = (id, lockerIdx, extra) => ({
    id, lockerId: 800001 + lockerIdx, lockerName: h.LOCKERS[lockerIdx][1], lockerCode: h.LOCKERS[lockerIdx][0],
    title: 'Kiểm tra định kỳ', intervalDays: 7, lastDoneAt: techAgo(24 * 6), nextDueAt: techIn(24), active: true, due: false,
    droneUnitId: null, droneCode: null, assignedTechnicianId: 800201, assignedTechnicianName: h.STAFF[0][1], priority: 'NORMAL',
    description: null, checklist: null, storeId: h.STORES[h.LOCKERS[lockerIdx][2]][0], address: h.STORES[h.LOCKERS[lockerIdx][2]][2],
    locationNote: null, scheduledTimeSlot: null, checklistItems: ['Thử mở từng ô', 'Vệ sinh màn hình', 'Kiểm tra nguồn dự phòng'],
    lastResult: 'PASSED', pendingReportId: null, createdAt: '2026-09-01T08:00:00', updatedAt: techAgo(24 * 6), ...extra,
  });
  return [
    base(951001, 0, { title: 'Kiểm tra tuần tủ Vincom', nextDueAt: techIn(30) }),
    base(951002, 1, { title: 'Kiểm tra ô và khoá điện', intervalDays: 14, nextDueAt: techIn(6), due: true, lastResult: 'FAILED',
      pendingReportId: 950101 }),
    base(951003, 2, { assignedTechnicianId: 800202, assignedTechnicianName: h.STAFF[1][1] }),
    base(951004, 0, { lockerId: 800001, title: 'Bảo dưỡng drone tháng', intervalDays: 30, droneUnitId: 800301, droneCode: 'DRN-001',
      assignedTechnicianId: 800203, assignedTechnicianName: h.STAFF[2][1], checklistItems: ['Kiểm tra cánh quạt', 'Hiệu chỉnh la bàn'] }),
  ];
}

function techInspectionLogs(h, technicianId) {
  if (technicianId !== 800201) return [];
  const items = (fail) => JSON.stringify([
    { label: 'Thử mở từng ô', result: fail ? 'FAIL' : 'PASS', note: fail ? 'Ô số 7 không bật cửa' : null },
    { label: 'Vệ sinh màn hình', result: 'PASS' },
    { label: 'Kiểm tra nguồn dự phòng', result: 'NA', note: 'Tủ chưa lắp pin dự phòng' },
  ]);
  return [
    { id: 952001, scheduleId: 951002, lockerId: 800002, lockerName: h.LOCKERS[1][1], lockerCode: h.LOCKERS[1][0], technicianId,
      technicianName: h.STAFF[0][1], status: 'FAILED', note: 'Phát hiện ô số 7 kẹt khoá, đã lập phiếu sự cố.', photoUrls: [],
      checklistResults: items(true), createdReportId: 950101, createdAt: techAgo(7) },
    { id: 952002, scheduleId: 951001, lockerId: 800001, lockerName: h.LOCKERS[0][1], lockerCode: h.LOCKERS[0][0], technicianId,
      technicianName: h.STAFF[0][1], status: 'PASSED', note: 'Tủ hoạt động bình thường.', photoUrls: [],
      checklistResults: items(false), createdReportId: null, createdAt: techAgo(24 * 6) },
  ];
}

function techStaffLockers(h) {
  return h.LOCKERS.map(([code, name, si], i) => ({
    id: 800001 + i, storeId: h.STORES[si][0], code, name, status: i === 6 ? 'MAINTENANCE' : 'ACTIVE', address: h.STORES[si][2],
    latitude: null, longitude: null, landingPad: true, landingMarkerId: null, totalBoxes: 15,
    availableBoxes: i === 6 ? 0 : 15 - ((i * 3) % 6) - 2,
    assignedTechnicianId: i === 9 ? null : h.STAFF[i % 2][0], assignedTechnicianName: i === 9 ? null : h.STAFF[i % 2][1],
  }));
}

export default function opsTech({ path, query, method }, h) {
  if (method !== 'GET') return undefined;
  if (path === '/api/admin/maintenance/technicians/presence') return h.ok(techPresence(h));
  if (path === '/api/admin/lockers/reports') return h.ok(techReports(h));
  const perf = path.match(/^\/api\/admin\/lockers\/technicians\/(\d+)\/performance$/);
  if (perf) {
    const id = Number(perf[1]);
    const p = TECH_PERF[id] ?? { totalAssigned: 0, inProgress: 0, resolved: 0, overdue: 0, penaltyLevel: 'NORMAL', penaltyReason: '',
      ratingCount: 0, averageRating: 0 };
    const ratings = Array.from({ length: p.ratingCount }, (_, i) => ({
      id: 953000 + i, reportId: 950104 + (i % 3), rating: i === 1 ? 4 : 5, comment: TECH_COMMENTS[i % TECH_COMMENTS.length],
      createdAt: techAgo(20 + i * 30),
    }));
    return h.ok({ technicianId: id, ...p, ratings });
  }
  if (path === '/api/maintenance/schedules') return h.ok(techSchedules(h));
  if (path === '/api/maintenance/inspection-logs') return h.ok(techInspectionLogs(h, Number(query.technicianId)));
  const user = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (user) {
    const staff = h.STAFF.find(([id]) => id === Number(user[1]));
    if (!staff) return undefined;
    const [id, fullName, role] = staff;
    return h.ok({ id, fullName, name: fullName, email: h.demoMail(fullName, id), phoneNumber: h.phone(id), imageUrl: '', provider: 'LOCAL',
      emailVerified: true, status: 'ACTIVE', roles: [role], createdAt: '2026-06-01T08:00:00', updatedAt: '2026-11-01T08:00:00' });
  }
  // getStaffLockers (chi tiết KTV tủ) gọi /api/admin/lockers KHÔNG kèm tham số và đọc mảng phẳng; danh sách tủ có phân trang
  // (luôn có page/size) rơi xuống dữ liệu chung.
  if (path === '/api/admin/lockers' && Object.keys(query).length === 0) return h.ok(techStaffLockers(h));
  return undefined;
}

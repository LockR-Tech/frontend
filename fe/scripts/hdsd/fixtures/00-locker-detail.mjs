// Dữ liệu giả cho ảnh HDSD trang chi tiết tủ (hộp thoại vị trí, đơn đang chứa trong ô) và cấu hình phần cứng ở trang
// Điều khiển tủ — chỉ dùng khi chụp, tên/số giả. Tên file bắt đầu bằng "00-" để chạy trước finance.mjs: tìm đơn theo
// một tủ (lockerId) trả đơn đang giữ ô của sơ đồ giả (fixtures/drone.mjs: ô id 810000 + i*100 + số ô).

const cellId = (lockerId, boxNumber) => 810000 + Math.max(0, lockerId - 800001) * 100 + boxNumber;

function staffLocker(h, id) {
  const i = Math.max(0, id - 800001) % h.LOCKERS.length;
  const [code, name] = h.LOCKERS[i];
  return { id, storeId: null, code, name, status: 'ACTIVE', address: null, latitude: null, longitude: null, landingPad: true,
    landingMarkerId: null, totalBoxes: 12, availableBoxes: 7, assignedTechnicianId: null, assignedTechnicianName: null };
}

function hardware(lockerId) {
  const relayPins = [5, 6, 13, 19, 26, 16, 20, 21, 12, 25, 24, 18];
  const doorPins = [4, 17, 27, 22, 10, 9, 11, 0, 1, 7, 8, 23];
  return { lockerId, defaultTemplate: false, updatedBy: 800001, updatedAt: '2026-11-18T09:30:00', appliedBy: 800001,
    appliedAt: '2026-11-18T09:31:00', applyStatus: 'SUCCESS', applyMessage: null,
    config: { relayPins, relayActiveHigh: false, unlockMs: 600, doorPins, doorClosedLow: true, requireDoorSensor: true,
      lidBypassPhysicalMotion: false,
      lids: [
        { axis: 1, enabled: true, pulPin: 14, dirPin: 15, homePin: 2, endPin: 3, openDirHigh: true, limitActiveLow: true, boxes: [1, 2] },
        { axis: 2, enabled: false, pulPin: 0, dirPin: 0, homePin: 0, endPin: 0, openDirHigh: true, limitActiveLow: true, boxes: [] },
      ] },
    wiring: [
      { group: 'Relay', from: 'Pi GPIO5', to: 'Relay IN1', via: 'Dây cái-cái', wire: 'Vàng', note: 'Khoá ô 1' },
      { group: 'Cảm biến cửa', from: 'Pi GPIO4', to: 'Công tắc từ ô 1', via: 'Domino', wire: 'Xanh lá', note: '' },
      { group: 'Nắp trượt', from: 'Pi GPIO14', to: 'Driver PUL+', via: 'Transistor', wire: 'Cam', note: 'Trục 1' },
    ] };
}

// Hồ sơ lắp đặt đang chờ nghiệm thu (tab "Lắp đặt"): đủ bước, chưa có ảnh (ảnh thật nằm ở Cloudinary, không tải khi chụp).
function installation(h, lockerId) {
  const l = staffLocker(h, lockerId);
  const check = (item, label, status, auto, extra = {}) => ({ item, label, status, auto, photoRequired: !auto,
    notApplicableAllowed: item === 'LID' || item === 'BLUETOOTH', verifiedBy: auto ? 'SYSTEM' : 'TECHNICIAN', note: null, detail: null,
    checkedBy: auto ? null : 800201, checkedAt: '2026-11-20T10:15:00', photoCount: 0, ...extra });
  return { id: 860001, lockerId, lockerCode: l.code, lockerName: l.name, lockerStatus: 'COMMISSIONING', status: 'SUBMITTED',
    technicianId: 800201, scheduledAt: '2026-11-20T08:30:00', siteContactName: 'Trần Minh Khoa', siteContactPhone: '0901234567',
    powerSource: 'Ổ điện 220V riêng, có CB', networkType: 'WIFI', networkNote: 'Wi-Fi toà nhà, SSID riêng cho tủ',
    cabinetModel: 'LockR-12', cabinetSerial: 'LR12-2026-0007', notes: 'Lắp sát cột, chừa lối cho xe đẩy.', returnReason: null,
    cancelReason: null, createdBy: 800001, createdAt: '2026-11-18T14:00:00', startedAt: '2026-11-20T08:40:00',
    submittedAt: '2026-11-20T10:20:00', reviewedBy: null, reviewedAt: null, approvedAt: null, cancelledAt: null,
    controllerMac: 'DC:A6:32:00:00:07', controllerOnline: true, iotAvailable: true, readyToSubmit: true, missing: [],
    checks: [
      check('MOUNTING', 'Cố định tủ chắc chắn', 'PASSED', false),
      check('NETWORK', 'Mạng ổn định', 'PASSED', true),
      check('CONTROLLER', 'Gán bộ điều khiển', 'PASSED', true),
      check('HARDWARE_CONFIG', 'Nạp cấu hình phần cứng', 'PASSED', true),
      check('BOX_TEST', 'Mở thử từng ô', 'PASSED', true),
      check('LID', 'Nắp trượt drone', 'NOT_APPLICABLE', false),
      check('KIOSK', 'Màn hình kiosk', 'PASSED', true),
      check('BLUETOOTH', 'Bluetooth mở ô', 'PASSED', false),
    ],
    photos: [] };
}

export default function lockerDetail({ path, query, method }, h) {
  if (method !== 'GET') return undefined;
  let m = path.match(/^\/api\/admin\/lockers\/(\d+)\/installation$/);
  if (m) return h.ok(installation(h, Number(m[1])));
  m = path.match(/^\/api\/admin\/lockers\/(\d+)$/);
  if (m) return h.ok(staffLocker(h, Number(m[1])));
  m = path.match(/^\/api\/locker-technician\/cabinet\/(\d+)\/hardware$/);
  if (m) return h.ok(hardware(Number(m[1])));
  if (path === '/api/admin/orders/search' && query.lockerId) {
    const lockerId = Number(query.lockerId);
    const content = [2, 8].map((boxNumber, k) => ({
      ...h.order(k * 6 + 1), lockerId, status: 'STORING', sendBoxId: cellId(lockerId, boxNumber), sendBoxNumber: boxNumber,
    }));
    return h.ok({ content, totalElements: content.length, totalPages: 1, number: 0, size: content.length });
  }
  return undefined;
}

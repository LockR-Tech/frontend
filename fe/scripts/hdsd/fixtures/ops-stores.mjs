// Dữ liệu giả cho ảnh HDSD khu admin-ops (phần địa điểm + dịch vụ) — chỉ dùng khi chụp, tên/số giả.
// Trang: /admin/stores, /admin/stores/:storeId (thẻ Kiosk, lưới ngăn, các hộp thoại), /admin/services.

const storeDescriptions = ['Sảnh B1, cạnh quầy thông tin', 'Tầng hầm B1, lối vào thang máy', 'Khu văn phòng, cổng chính',
  'Tầng trệt, gần siêu thị', 'Lối vào B, cạnh bãi xe máy'];
const storeCoords = [[10.7781, 106.7019], [10.7949, 106.7218], [10.8412, 106.8098], [10.7290, 106.7189], [10.7712, 106.6694]];
const storeLockerSpots = ['Sảnh B1 – cạnh thang cuốn', 'Cổng chính – nhà xe', 'Tầng hầm B1', 'Cổng chính', 'Toà F-Town 3',
  'Toà S1.02', 'Sảnh nhà văn hoá', 'Tầng trệt – cửa Đông', 'Lối vào B', 'Cổng Lý Thường Kiệt'];

function storeRecord(h, i) {
  const [id, name, address] = h.STORES[i];
  return {
    id, name, address, contactPhone: `190068${i}0`, description: storeDescriptions[i],
    latitude: storeCoords[i][0], longitude: storeCoords[i][1], image: null, imageUrl: null,
    active: true, status: 'ACTIVE', distanceKm: null,
    createdAt: `2026-0${5 + (i % 3)}-1${i}T08:30:00`, updatedAt: `2026-11-1${i}T16:45:00`,
  };
}

function storeLocker(h, li) {
  const [code, name, si] = h.LOCKERS[li];
  const status = li === 1 ? 'MAINTENANCE' : 'ACTIVE';
  return {
    id: 800001 + li, code, name, address: storeLockerSpots[li],
    latitude: storeCoords[si][0] + li * 0.0003, longitude: storeCoords[si][1] - li * 0.0002,
    storeId: h.STORES[si][0], storeName: h.STORES[si][1], status,
    totalBoxes: 15, availableBoxes: status === 'ACTIVE' ? 15 - [6, 0, 4, 7, 5, 3, 8, 2, 6, 4][li] : 0, boxes: [],
    createdAt: '2026-05-01T09:00:00', updatedAt: '2026-11-20T09:00:00',
    assignedTechnicianId: h.STAFF[li % 2][0], assignedTechnicianName: h.STAFF[li % 2][1],
  };
}

// Ô đầu tiên trống để hộp thoại ngăn hiện phần "Đổi trạng thái".
const storeBoxPattern = ['AVAILABLE', 'OCCUPIED', 'AVAILABLE', 'RESERVED', 'OCCUPIED', 'AVAILABLE', 'MAINTENANCE', 'AVAILABLE',
  'OCCUPIED', 'AVAILABLE', 'FAULT', 'AVAILABLE', 'OCCUPIED', 'AVAILABLE', 'AVAILABLE'];

const svcHour = 'giờ';
const svcSettings = [
  // [key, nhãn, kiểu, giá trị, mặc định, min, max, đơn vị]
  ['app.order.send-base-fee', 'Phí gửi hàng mỗi đơn', 'INTEGER', '15000', '15000', '0', '500000', 'đ'],
  ['app.order.send-pickup-hours-limit', 'Hạn người nhận tới lấy hàng', 'INTEGER', '48', '48', '1', '168', svcHour],
  ['app.order.send-storage-max-hours', 'Số giờ gửi tối đa', 'INTEGER', '72', '72', '1', '336', svcHour],
  ['app.order.send-storage-quick-hours', 'Các mốc giờ chọn nhanh khi gửi', 'INTEGER_LIST', '2,4,8,24', '2,4,8,24', '1', '336', svcHour],
  ['app.order.pickup-overtime-fee-per-hour', 'Phí quá giờ mỗi giờ', 'INTEGER', '5000', '5000', '0', '100000', 'đ'],
  ['app.order.pickup-max-overtime-fee', 'Phí quá giờ tối đa mỗi đơn', 'INTEGER', '50000', '50000', '0', '1000000', 'đ'],
  ['app.order.pickup-max-overtime-percent', 'Phí quá giờ tối đa theo giá đơn', 'INTEGER', '200', '200', '0', '1000', '%'],
  ['app.order.overtime-grace-period-minutes', 'Thời gian ân hạn trước khi tính phí', 'INTEGER', '15', '15', '0', '240', 'phút'],
  ['app.order.rental-rate-standard', 'Giá thuê mỗi giờ – ô tiêu chuẩn', 'INTEGER', '5000', '5000', '0', '200000', 'đ'],
  ['app.order.rental-rate-xl', 'Giá thuê mỗi giờ – ô XL', 'INTEGER', '8000', '8000', '0', '200000', 'đ'],
  ['app.order.rental-daily-rate-standard', 'Giá thuê theo ngày – ô tiêu chuẩn', 'INTEGER', '60000', '60000', '0', '2000000', 'đ'],
  ['app.order.rental-daily-rate-xl', 'Giá thuê theo ngày – ô XL', 'INTEGER', '90000', '90000', '0', '2000000', 'đ'],
  ['app.order.rental-min-hours', 'Số giờ thuê tối thiểu', 'INTEGER', '1', '1', '1', '24', svcHour],
  ['app.order.rental-max-hours', 'Số giờ thuê tối đa', 'INTEGER', '72', '72', '1', '720', svcHour],
  ['app.order.rental-default-hours', 'Số giờ thuê mặc định', 'INTEGER', '4', '4', '1', '72', svcHour],
  ['app.order.rental-quick-hours', 'Các mốc giờ chọn nhanh khi thuê', 'INTEGER_LIST', '1,2,4,8', '1,2,4,8', '1', '720', svcHour],
  ['app.order.extend-default-hours', 'Số giờ gia hạn mặc định', 'INTEGER', '2', '2', '1', '72', svcHour],
  ['app.order.extend-max-hours', 'Số giờ gia hạn tối đa', 'INTEGER', '24', '24', '1', '168', svcHour],
  ['app.order.block-unpaid-rental-access', 'Chặn mở ô khi còn nợ tiền thuê', 'BOOLEAN', 'true', 'true', null, null, null],
  ['app.order.rental-auto-release-enabled', 'Tự trả ô khi hết giờ thuê', 'BOOLEAN', 'true', 'true', null, null, null],
  ['app.order.drone-delivery-fee', 'Phí giao drone mỗi chuyến', 'INTEGER', '18000', '18000', '0', '500000', 'đ'],
  ['app.order.drone-pickup-hours-limit', 'Hạn người nhận lấy hàng drone', 'INTEGER', '24', '24', '1', '168', svcHour],
  ['app.order.drone-default-parcel-weight-grams', 'Khối lượng kiện mặc định', 'INTEGER', '500', '500', '50', '2000', 'g'],
  ['app.order.drone-min-preflight-battery-percent', 'Pin tối thiểu trước khi cất cánh', 'INTEGER', '40', '40', '10', '100', '%'],
  ['app.order.drone-max-pickup-meters', 'Khoảng cách tối đa tới tủ nguồn', 'INTEGER', '3000', '3000', '100', '20000', 'm'],
  ['app.order.drone-max-route-meters', 'Quãng bay tối đa', 'INTEGER', '5000', '5000', '100', '20000', 'm'],
  ['app.order.drone-min-route-meters', 'Quãng bay tối thiểu', 'INTEGER', '200', '200', '0', '5000', 'm'],
  ['app.drone.demo.indoor-aruco-enabled', 'Hạ cánh trong nhà bằng mốc ArUco', 'BOOLEAN', 'false', 'false', null, null, null],
  ['app.drone.demo.hold-open-seconds', 'Giữ nắp mở khi mô phỏng', 'INTEGER', '20', '20', '5', '120', 'giây'],
  ['app.drone.delivery.open-lid-max-wait-seconds', 'Thời gian chờ mở nắp tối đa', 'INTEGER', '60', '60', '10', '300', 'giây'],
  ['app.drone.demo.enabled', 'Bật chế độ mô phỏng giao drone', 'BOOLEAN', 'false', 'false', null, null, null],
  ['app.drone.demo.stage-delay-ms', 'Độ trễ giữa các chặng mô phỏng', 'INTEGER', '3000', '3000', '500', '30000', 'ms'],
  ['app.drone.demo.allowed-user-ids', 'Tài khoản được dùng mô phỏng', 'INTEGER_LIST', '', '', null, null, null],
  ['app.order.require-payment-before-drop', 'Bắt thanh toán trước khi bỏ hàng', 'BOOLEAN', 'true', 'true', null, null, null],
  ['app.order.auto-cancel-hours', 'Tự huỷ đơn chưa bỏ hàng sau', 'INTEGER', '2', '2', '1', '72', svcHour],
  ['app.order.overdue-release-hours', 'Dời đơn quá hạn vào kho sau', 'INTEGER', '24', '24', '1', '168', svcHour],
  ['app.order.reminder-cooldown-minutes', 'Khoảng cách giữa hai lần nhắc', 'INTEGER', '60', '60', '5', '1440', 'phút'],
];

function svcSettingViews() {
  return svcSettings.map(([key, label, type, value, defaultValue, min, max, unit]) => ({
    scope: 'order', key, group: null, label, description: null, type, value, defaultValue,
    overridden: value !== defaultValue, min, max, unit, allowedValues: null, publicValue: false,
    updatedByUserId: null, updatedAt: '2026-11-15T03:20:00',
  }));
}

export default function opsStores({ path, method }, h) {
  if (method !== 'GET') return undefined;
  if (path === '/api/admin/stores') return h.ok(h.STORES.map((_, i) => storeRecord(h, i)));
  let m = path.match(/^\/api\/admin\/stores\/(\d+)$/);
  if (m) {
    const i = h.STORES.findIndex(([id]) => id === Number(m[1]));
    return i >= 0 ? h.ok(storeRecord(h, i)) : h.fail(404, 'STORE_NOT_FOUND', 'Không tìm thấy địa điểm');
  }
  m = path.match(/^\/api\/admin\/lockers\/store\/(\d+)$/);
  if (m) {
    const si = h.STORES.findIndex(([id]) => id === Number(m[1]));
    return h.ok(h.LOCKERS.map((l, li) => [l, li]).filter(([l]) => l[2] === si).map(([, li]) => storeLocker(h, li)));
  }
  m = path.match(/^\/api\/lockers\/(\d+)\/boxes$/);
  if (m) {
    const lockerId = Number(m[1]);
    const li = lockerId - 800001;
    const code = h.LOCKERS[li]?.[0] ?? null;
    return h.ok(storeBoxPattern.map((status, n) => ({
      lockerId, boxId: 850000 + Math.max(0, li) * 100 + n + 1, lockerCode: code, boxNumber: n + 1, status,
    })));
  }
  if (path === '/api/admin/settings/order') return h.ok(svcSettingViews());
  return undefined;
}

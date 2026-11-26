// Dữ liệu giả cho ảnh HDSD Nhật ký thao tác (F3-G16) — chỉ dùng khi chụp, tên giả.

const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString().slice(0, 19);

// [phút trước, người (null = hệ thống), vai trò, hành động, loại, mã, nhãn, tủ, từ, thành, ghi chú]
const ROWS = [
  [6, 'Trần Minh Admin', 'ADMIN', 'LOCKER_MAINTENANCE_ON', 'LOCKER', 800003, 'HCM-BT-01 · Tủ Landmark 81 – Tầng hầm B1', 800003, 'ACTIVE', 'MAINTENANCE', null],
  [14, 'Trần Minh Admin', 'ADMIN', 'LOCKER_TECHNICIAN_ASSIGNED', 'LOCKER', 800004, 'HCM-BT-02 · Tủ ĐH Hutech – Cổng chính', 800004, null, 'Phạm Gia Bảo (#800012)', null],
  [32, 'Lê Thanh Tùng', 'LOCKER_TECHNICIAN', 'BOX_BACK_IN_SERVICE', 'BOX', 810205, '#5', 800003, 'FAULT', 'AVAILABLE', null],
  [58, 'Lê Thanh Tùng', 'LOCKER_TECHNICIAN', 'BOX_FAULT', 'BOX', 810205, '#5', 800003, 'AVAILABLE', 'FAULT', 'Cửa ô không đóng hết'],
  [95, 'Võ Ngọc Hân', 'DRONE_TECHNICIAN', 'DRONE_STATUS_CHANGED', 'DRONE', 870001, 'DRN-001', 800001, 'IDLE', 'MAINTENANCE', null],
  [140, null, null, 'LOCKER_MAINTENANCE_BY_TICKET', 'LOCKER', 800010, 'HCM-Q7-02 · Tủ Crescent Mall – Tầng trệt', 800010, 'ACTIVE', 'MAINTENANCE', null],
  [210, 'Trần Minh Admin', 'ADMIN', 'LOCKER_ACTIVATED', 'LOCKER', 800001, 'HCM-Q1-01 · Tủ Vincom Đồng Khởi – Sảnh B1', 800001, 'MAINTENANCE', 'ACTIVE', null],
  [300, 'Trần Minh Admin', 'ADMIN', 'USER_LOCKED', 'USER', 800031, 'Nguyễn Văn Khách · khach31@demo.lockr.test', null, 'ACTIVE', 'INACTIVE', null],
  [420, 'Trần Minh Admin', 'ADMIN', 'LOCKER_TECHNICIAN_UNASSIGNED', 'LOCKER', 800013, 'HCM-TP-01 · Tủ Aeon Tân Phú', 800013, 'Võ Ngọc Hân (#800014)', null, null],
  [600, 'Trần Minh Admin', 'ADMIN', 'BOX_DELETED', 'BOX', 810309, '#9', 800004, null, null, 'Ô hỏng khung, thay ô mới'],
];

function rows(query) {
  return ROWS.map(([minutes, actorName, roles, action, targetType, targetId, targetLabel, lockerId, fromValue, toValue, note], i) => ({
    id: 996000 + i, occurredAt: ago(minutes), source: targetType === 'USER' ? 'user-service' : 'locker-service',
    actorUserId: actorName ? 800001 + i : null, actorName, actorRoles: roles, action, targetType, targetId, targetLabel,
    lockerId, fromValue, toValue, note,
  })).filter((row) => {
    if (query.lockerId && String(row.lockerId) !== String(query.lockerId)) return false;
    if (query.targetType && row.targetType !== query.targetType) return false;
    if (query.targetId && String(row.targetId) !== String(query.targetId)) return false;
    return true;
  });
}

export default function audit({ path, query, method }, h) {
  if (method !== 'GET' || path !== '/api/admin/audit-logs') return null;
  let content = rows(query);
  // Trang chi tiết tủ / drone của ảnh mẫu không trùng mã với dữ liệu trên: lấy vài dòng cùng loại cho có nội dung.
  if (content.length === 0 && (query.lockerId || query.targetType)) {
    content = rows({}).filter((row) => !query.targetType || row.targetType === query.targetType).slice(0, 4)
      .map((row) => ({ ...row, lockerId: Number(query.lockerId ?? row.lockerId), targetId: Number(query.targetId ?? row.targetId) }));
  }
  const size = Number(query.size ?? 20);
  return h.ok({ content: content.slice(0, size), page: Number(query.page ?? 0), size, totalElements: content.length,
    totalPages: Math.max(1, Math.ceil(content.length / size)) });
}

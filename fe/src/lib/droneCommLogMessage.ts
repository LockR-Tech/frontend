import type { DroneLockerCommLog } from '~/stores/apis/admin/droneCommLogs';

// Diễn giải thông điệp giao tiếp Drone ↔ Tủ (order-service, /api/admin/drone-locker-logs) thành câu
// tiếng Việt. Cùng cách diễn giải với trang /admin/drone-logs để hai nơi đọc giống nhau.

export function isDroneCommLogError(log: DroneLockerCommLog): boolean {
  const s = (log.processingStatus || '').toUpperCase();
  return (
    Boolean(log.errorCode) ||
    s === 'REJECTED' ||
    s === 'FAILED' ||
    s === 'ERROR' ||
    s === 'ABORTED'
  );
}

export function parseDroneCommLogPayload(log: DroneLockerCommLog): Record<string, any> | null {
  const raw = log.payload ?? log.payloadJson;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function translateRawMessage(raw: string): string {
  const text = raw.trim();
  const lower = text.toLowerCase();

  if (
    lower.includes('sliding lid close simulated successfully') ||
    lower === 'sliding lid closed completely and verified'
  ) {
    return 'Nắp trượt ô tủ đã đóng hoàn toàn và khóa an toàn';
  }
  if (
    lower.includes('sliding lid open simulated successfully') ||
    lower === 'sliding lid opened completely'
  ) {
    return 'Nắp trượt ô tủ đã mở hoàn toàn';
  }
  if (lower === 'door opened') {
    return 'Đã mở cửa ô tủ';
  }
  if (lower === 'door is closed and locked') {
    return 'Cửa ô tủ đã đóng và khóa an toàn';
  }

  return text.replace(/\s*\(DICT_[A-Z0-9_]+\)/gi, '');
}

export function describeDroneCommLog(log: DroneLockerCommLog): string {
  // Khi có lỗi hoặc bị từ chối: hiển thị nguyên nhân lỗi cụ thể
  if (isDroneCommLogError(log)) {
    if (log.errorMessage && log.errorMessage.trim()) {
      return translateRawMessage(log.errorMessage);
    }
    const parsed = parseDroneCommLogPayload(log);
    if (parsed) {
      if (typeof parsed.errorMessage === 'string' && parsed.errorMessage.trim()) {
        return translateRawMessage(parsed.errorMessage);
      }
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return translateRawMessage(parsed.message);
      }
    }
    if (log.errorCode) {
      return `Lỗi xử lý: ${log.errorCode}`;
    }
  }

  // Khi sự kiện thành công / đang xử lý: thống nhất mô tả thông điệp theo sự kiện
  switch (log.eventType) {
    case 'MARKER_DETECTED': {
      const parsed = parseDroneCommLogPayload(log);
      const mid = parsed?.arucoMarkerId ?? log.markerId ?? '0';
      const dist =
        typeof parsed?.distanceM === 'number' ? `${parsed.distanceM.toFixed(2)}m` : null;
      const ox =
        typeof parsed?.offsetX === 'number'
          ? `${parsed.offsetX >= 0 ? '+' : ''}${parsed.offsetX.toFixed(2)}m`
          : null;
      const oy =
        typeof parsed?.offsetY === 'number'
          ? `${parsed.offsetY >= 0 ? '+' : ''}${parsed.offsetY.toFixed(2)}m`
          : null;
      const parts = [`Camera phát hiện mã ArUco #${mid}`];
      if (dist) parts.push(`Khoảng cách: ${dist}`);
      if (ox && oy) parts.push(`Lệch X: ${ox}, Y: ${oy}`);
      return parts.join(' · ');
    }
    case 'MARKER_VALIDATED':
      return 'Xác thực mã ArUco hợp lệ với ô tủ đích';
    case 'OPEN_LID_REQUESTED':
      return 'Gửi lệnh yêu cầu mở nắp trượt ô tủ';
    case 'LID_OPENED':
      return 'Nắp trượt ô tủ đã mở hoàn toàn';
    case 'DROP_PHASE_STARTED':
      return 'Bắt đầu giai đoạn nhả hàng (giữ mở nắp trượt trong 5 giây)';
    case 'DROP_PHASE_COMPLETED':
      return 'Hoàn tất giai đoạn nhả hàng';
    case 'CLOSE_LID_REQUESTED':
      return 'Gửi lệnh yêu cầu đóng nắp trượt ô tủ';
    case 'LID_CLOSED':
      return 'Nắp trượt ô tủ đã đóng hoàn toàn và khóa an toàn';
    case 'DELIVERY_READY':
      return 'Giao hàng hoàn tất an toàn — Kiện hàng sẵn sàng để khách nhận';
    default:
      if (log.errorMessage && log.errorMessage.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      return '—';
  }
}

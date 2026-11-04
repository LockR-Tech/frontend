import type { DroneLockerCommLog } from '~/stores/apis/admin/droneCommLogs';
import i18n from '~/utils/i18n';

// Diễn giải thông điệp giao tiếp Drone ↔ Tủ (order-service, /api/admin/drone-locker-logs) thành câu
// tiếng Việt. Cùng cách diễn giải với trang /admin/drone-logs để hai nơi đọc giống nhau.

export function isDroneCommLogError(log: DroneLockerCommLog): boolean {
  const s = (log.processingStatus || '').toUpperCase();
  // IGNORED = bản tin lặp / không thuộc phiên (vd. DUPLICATE_MARKER, DUPLICATE_DROP_REPORT): có mã nhưng không phải lỗi.
  // SUCCESS/PROCESSED có mã (vd. NO_TARGET: drone chưa có nhiệm vụ) là thông tin, không phải lỗi.
  if (s === 'IGNORED' || s === 'SUCCESS' || s === 'PROCESSED') return false;
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
    return i18n.t('admin.droneLogs.message.lidClosedLocked');
  }
  if (
    lower.includes('sliding lid open simulated successfully') ||
    lower === 'sliding lid opened completely'
  ) {
    return i18n.t('admin.droneLogs.message.lidOpened');
  }
  if (lower === 'door opened') {
    return i18n.t('admin.droneLogs.message.doorOpened');
  }
  if (lower === 'door is closed and locked') {
    return i18n.t('admin.droneLogs.message.doorClosedLocked');
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
      return i18n.t('admin.droneLogs.message.processingError', { code: log.errorCode });
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
      const parts = [i18n.t('admin.droneLogs.message.markerDetected', { id: mid })];
      if (dist) parts.push(i18n.t('admin.droneLogs.message.distance', { value: dist }));
      if (ox && oy) parts.push(i18n.t('admin.droneLogs.message.offset', { x: ox, y: oy }));
      return parts.join(' · ');
    }
    case 'MARKER_VALIDATED':
      return i18n.t('admin.droneLogs.message.markerValidated');
    case 'OPEN_LID_REQUESTED':
      if (log.errorMessage && log.errorMessage.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      return log.retryCount > 0
        ? i18n.t('admin.droneLogs.message.openLidRetry', { n: log.retryCount })
        : i18n.t('admin.droneLogs.message.openLidSent');
    case 'LID_OPEN_ACCEPTED':
      return i18n.t('admin.droneLogs.message.lidOpenAccepted');
    case 'LID_CLOSE_ACCEPTED':
      return i18n.t('admin.droneLogs.message.lidCloseAccepted');
    case 'TARGET_REQUEST':
      if (log.errorMessage && log.errorMessage.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      return i18n.t('admin.droneLogs.message.targetRequest');
    case 'LID_OPENED':
      if (log.errorMessage && log.errorMessage.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      return i18n.t('admin.droneLogs.message.lidOpenedReported');
    case 'DROP_PHASE_STARTED':
      if (log.errorMessage && log.errorMessage.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      return i18n.t('admin.droneLogs.message.dropPhaseStarted');
    case 'DROP_PHASE_COMPLETED':
      if ((log.processingStatus || '').toUpperCase() === 'IGNORED' && log.errorMessage?.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      return i18n.t('admin.droneLogs.message.dropPhaseCompleted');
    case 'CLOSE_LID_REQUESTED':
      return log.retryCount > 0
        ? i18n.t('admin.droneLogs.message.closeLidRetry', { n: log.retryCount })
        : i18n.t('admin.droneLogs.message.closeLidSent');
    case 'LID_CLOSED':
      return i18n.t('admin.droneLogs.message.lidClosedLocked');
    case 'DELIVERY_READY':
      return i18n.t('admin.droneLogs.message.deliveryReady');
    default:
      if (log.errorMessage && log.errorMessage.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      return '—';
  }
}

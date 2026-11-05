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

/// Số liệu thật của servo Pi drone gửi kèm báo nhả hàng: "mở 180° · giữ 5 giây · 1 lần thử · chạy 6.6 giây · GPIO18".
function servoReleaseParts(payload: Record<string, any> | null): string[] {
  if (!payload) return [];
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const parts: string[] = [];
  const angle = num(payload.servoOpenAngle);
  if (angle !== null) parts.push(i18n.t('admin.droneLogs.message.servoOpenAngle', { angle }));
  const hold = num(payload.servoHoldSeconds);
  if (hold !== null) parts.push(i18n.t('admin.droneLogs.message.servoHold', { seconds: hold }));
  const attempts = num(payload.releaseAttempts);
  if (attempts !== null) parts.push(i18n.t('admin.droneLogs.message.releaseAttempts', { n: attempts }));
  const duration = num(payload.releaseDurationSeconds);
  if (duration !== null) parts.push(i18n.t('admin.droneLogs.message.releaseDuration', { seconds: duration }));
  const pin = num(payload.servoGpioPin);
  if (pin !== null) {
    const gpio = i18n.t('admin.droneLogs.message.servoGpio', { pin });
    parts.push(typeof payload.gpioBackend === 'string' && payload.gpioBackend ? `${gpio} (${payload.gpioBackend})` : gpio);
  }
  return parts;
}

export function describeDroneCommLog(log: DroneLockerCommLog): string {
  // Servo drone không nhả được hàng: câu cố định + mã lỗi Pi gửi (vd. SERVO_ERROR) + số liệu servo; bản tin lặp thì như thường.
  if (log.eventType === 'PARCEL_RELEASE_FAILED' && (log.processingStatus || '').toUpperCase() !== 'IGNORED') {
    const payload = parseDroneCommLogPayload(log);
    const code = payload?.errorCode;
    const text = i18n.t('admin.droneLogs.message.parcelReleaseFailed');
    return [typeof code === 'string' && code.trim() ? `${text} (${code})` : text, ...servoReleaseParts(payload)]
      .join(' · ');
  }

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
    case 'DROP_PHASE_COMPLETED': {
      if ((log.processingStatus || '').toUpperCase() === 'IGNORED' && log.errorMessage?.trim()) {
        return translateRawMessage(log.errorMessage);
      }
      const payload = parseDroneCommLogPayload(log);
      if (payload?.releaseMethod !== 'SERVO') return i18n.t('admin.droneLogs.message.dropPhaseCompleted');
      return [i18n.t('admin.droneLogs.message.dropPhaseCompletedServo'), ...servoReleaseParts(payload)].join(' · ');
    }
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

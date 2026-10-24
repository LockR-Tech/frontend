import type { BoxAccessLogResponse } from "~/stores/apis/admin/lockerOps";

/**
 * Câu hiển thị cho một dòng nhật ký mở ô lỗi: tiêu đề nói chuyện gì đã xảy ra, gợi ý nói
 * admin nên làm gì. `null` = để nguyên `message` (dòng bình thường hoặc câu đã rõ).
 *
 * Nhật ký cũ của iot-service còn ghi thẳng tên exception Java (`java.util.concurrent.
 * TimeoutException`) hoặc "Quá thời gian chờ phản hồi (Timeout 20s)" — dịch cả hai dạng.
 */
export interface AccessLogMessageView {
  titleKey: string;
  hintKey: string;
  params: Record<string, string | number>;
}

const PREFIX = "admin.lockers.logs.message";

/** "Lý do: …" / "Ghi chú: …" KTV nhập khi mở khẩn cấp — giữ lại sau câu đã dịch. */
function operatorNote(message: string): string {
  const parts = message.split(" · ").filter((p) => /^(Lý do|Ghi chú):/.test(p.trim()));
  return parts.join(" · ");
}

export function describeAccessLogMessage(log: BoxAccessLogResponse): AccessLogMessageView | null {
  const message = log.message?.trim() ?? "";
  const result = log.result?.toUpperCase() ?? "";
  const note = operatorNote(message);
  const javaException = /\b(java|javax|org)\.[\w.$]+(Exception|Error)\b/.test(message);
  const timeout = result === "TIMEOUT" || /TimeoutException|Timeout \d+s/i.test(message);

  if (timeout) {
    const seconds = /Timeout (\d+)s/i.exec(message)?.[1];
    return {
      titleKey: seconds ? `${PREFIX}.timeoutTitle` : `${PREFIX}.timeoutTitleNoSeconds`,
      hintKey: `${PREFIX}.timeoutHint`,
      params: { seconds: seconds ?? "", note },
    };
  }
  if (result === "JAMMED") {
    return {
      titleKey: `${PREFIX}.jammedTitle`,
      hintKey: `${PREFIX}.jammedHint`,
      params: { note },
    };
  }
  // "Lỗi phần cứng [CODE]: chi tiết" — Pi báo lỗi khi mở chốt.
  const hardware = /\[([A-Z_]+)\]:\s*(.+)$/.exec(message);
  if (result === "FAILED" && hardware) {
    return {
      titleKey: `${PREFIX}.hardwareTitle`,
      hintKey: `${PREFIX}.hardwareHint`,
      params: { code: hardware[1], detail: hardware[2], note },
    };
  }
  if (result === "FAILED" && /không gửi được lệnh/i.test(message)) {
    return {
      titleKey: `${PREFIX}.sendFailedTitle`,
      hintKey: `${PREFIX}.sendFailedHint`,
      params: { note },
    };
  }
  if (javaException) {
    return {
      titleKey: `${PREFIX}.systemErrorTitle`,
      hintKey: `${PREFIX}.systemErrorHint`,
      params: { note },
    };
  }
  return null;
}

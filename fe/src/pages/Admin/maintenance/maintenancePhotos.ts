import type {
  InspectionItemResult,
  InspectionItemVerdict,
  LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import type { AttachmentStage, ReportAttachmentResponse } from "~/stores/apis/media";
import { APP_TIME_ZONE, parseBackendDateTime } from "~/lib/datetime";

/// View model ảnh phiếu sự cố: ảnh thật từ `report.attachments` hoặc URL legacy trong mô tả.
export interface ReportPhoto {
  key: string;
  /** Không có ⇒ ảnh legacy (URL dán trong mô tả), không xoá được qua API. */
  attachmentId?: number;
  stage: AttachmentStage;
  url: string;
  thumbnailUrl: string;
  caption?: string | null;
  uploadedByUserId?: number | null;
  createdAt?: string | null;
  capturedAt?: string | null;
  repairLogId?: number | null;
}

// Thứ tự nghiệp vụ: người báo → KTV tới xác nhận → trong khi sửa → nghiệm thu
export const ATTACHMENT_STAGES: AttachmentStage[] = ["REPORT", "INSPECTION", "PROGRESS", "RESOLUTION"];

export const STAGE_LABELS: Record<AttachmentStage, string> = {
  REPORT: "Ảnh hiện trường (người báo)",
  INSPECTION: "Ảnh xác nhận của KTV",
  PROGRESS: "Ảnh trong quá trình sửa",
  RESOLUTION: "Ảnh nghiệm thu",
};

export const extractPhotoList = (text?: string): string[] => {
  if (!text) return [];
  const urlMatches =
    text.match(
      /(https?:\/\/[^\s]+(?:\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?|\/photo-[^\s]+|\?[^\s]*format=[^\s]*|data:image\/[a-zA-Z]+;base64,[^\s]+))/gi
    ) || [];
  return Array.from(new Set(urlMatches.map((u) => u.replace(/[),.;]+$/, ""))));
};

export const cleanDescription = (text?: string): string => {
  if (!text) return "";
  return text
    .replace(/(?:Ảnh minh chứng hiện trường:?\s*)?(https?:\/\/[^\s]+|data:image\/[^\s]+)/gi, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
};

export const toReportPhoto = (a: ReportAttachmentResponse): ReportPhoto => ({
  key: `att-${a.id}`,
  attachmentId: a.id,
  stage: a.stage,
  url: a.url,
  thumbnailUrl: a.thumbnailUrl || a.url,
  caption: a.caption,
  uploadedByUserId: a.uploadedByUserId,
  createdAt: a.createdAt,
  capturedAt: a.capturedAt,
  repairLogId: a.repairLogId,
});

const byCreatedAt = (a: ReportPhoto, b: ReportPhoto) =>
  (a.createdAt ?? "").localeCompare(b.createdAt ?? "");

// Gom ảnh phiếu theo stage. Nhóm REPORT fallback sang URL legacy trong mô tả khi phiếu cũ chưa có attachments.
export const groupReportPhotos = (report: LockerReportResponse): Record<AttachmentStage, ReportPhoto[]> => {
  const groups: Record<AttachmentStage, ReportPhoto[]> = {
    REPORT: [],
    INSPECTION: [],
    PROGRESS: [],
    RESOLUTION: [],
  };
  for (const attachment of report.attachments ?? []) {
    groups[attachment.stage]?.push(toReportPhoto(attachment));
  }
  ATTACHMENT_STAGES.forEach((stage) => groups[stage].sort(byCreatedAt));

  if (groups.REPORT.length === 0) {
    groups.REPORT = extractPhotoList(report.description).map((url, i) => ({
      key: `legacy-${report.id}-${i}`,
      stage: "REPORT" as const,
      url,
      thumbnailUrl: url,
      uploadedByUserId: report.userId,
      createdAt: report.createdAt,
    }));
  }
  return groups;
};

export const getUserPhotos = (report: LockerReportResponse): ReportPhoto[] =>
  groupReportPhotos(report).REPORT;

// Tính toán thời gian xử lý thực tế giữa 2 mốc thời gian (chuỗi backend UTC)
export const calculateDurationText = (startStr?: string | null, endStr?: string | null): string => {
  const start = parseBackendDateTime(startStr);
  const end = parseBackendDateTime(endStr);
  if (!start || !end) return "—";
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} phút`;
  return `${hours} giờ ${mins > 0 ? `${mins} phút` : ""}`;
};

/** Phát hiện phiếu sự cố liên quan đến Drone để loại khỏi tab Bảo trì Kiosk / KTV Kiosk.
 *  Ưu tiên `category` của backend; phiếu cũ chưa có thì đoán như _isDroneReport() trên Mobile. */
export function isDroneReport(r: LockerReportResponse): boolean {
  if (r.category) return r.category === "DRONE";
  if ((r as any).droneUnitId != null) return true;
  const t = (r.title ?? "").toLowerCase();
  const d = (r.description ?? "").toLowerCase();
  const ct = (r.cellType ?? "").toUpperCase();
  const ln = (r.lockerName ?? "").toLowerCase();
  const lc = ((r as any).lockerCode ?? "").toLowerCase();
  if (ct === "DRONE") return true;
  if (ln.includes("drone") || lc.includes("drone")) return true;
  const droneKeywords = [
    "drone", "đội bay", "pin drone", "gãy càng", "mất thăng bằng",
    "hạ cánh", "bãi đáp", "cánh quay", "hiệu chuẩn bay",
  ];
  return droneKeywords.some((kw) => t.includes(kw) || d.includes(kw));
}

// ---- Kiểm tra định kỳ: nhãn kết quả + biên bản checklist ----

/** Nhãn trạng thái biên bản kiểm tra; ATTENTION/DEFECT_DETECTED chỉ còn ở dữ liệu cũ. */
export const INSPECTION_STATUS_META: Record<string, { label: string; cls: string; failed: boolean }> = {
  PASSED: { label: "Đạt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", failed: false },
  FAILED: { label: "Không đạt", cls: "bg-rose-50 text-rose-700 border-rose-200", failed: true },
  ATTENTION: { label: "Cần theo dõi (dữ liệu cũ)", cls: "bg-amber-50 text-amber-700 border-amber-200", failed: false },
  DEFECT_DETECTED: { label: "Phát hiện lỗi (dữ liệu cũ)", cls: "bg-rose-50 text-rose-700 border-rose-200", failed: true },
};

export const INSPECTION_ITEM_META: Record<InspectionItemVerdict, { label: string; cls: string }> = {
  PASS: { label: "Đạt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAIL: { label: "Không đạt", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  NA: { label: "Không áp dụng", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

/** `checklistResults` của biên bản: JSON các mục (bản ghi mới) hoặc văn bản tự do (bản ghi cũ). */
export type ParsedChecklistResults =
  | { kind: "items"; items: InspectionItemResult[] }
  | { kind: "text"; text: string };

export function parseChecklistResults(raw?: string | null): ParsedChecklistResults | null {
  const text = raw?.trim();
  if (!text) return null;
  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const items = parsed
          .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
          .filter((it) => typeof it.label === "string" && typeof it.result === "string")
          .map((it) => ({
            label: String(it.label),
            result: String(it.result).toUpperCase() as InspectionItemVerdict,
            note: typeof it.note === "string" && it.note.trim() ? it.note.trim() : null,
          }));
        if (items.length > 0) return { kind: "items", items };
      }
    } catch {
      // Không phải JSON hợp lệ ⇒ coi như văn bản cũ
    }
  }
  return { kind: "text", text };
}

// ---- Giờ hẹn lịch định kỳ: admin chọn theo giờ VN, backend lưu LocalDateTime UTC ----

let zoneFormatter: Intl.DateTimeFormat | null = null;

/** Độ lệch (ms) của giờ VN so với UTC tại thời điểm `utcMs`. */
function zoneOffsetMs(utcMs: number): number {
  if (!zoneFormatter) {
    zoneFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  const at = Math.floor(utcMs / 1000) * 1000;
  const parts: Record<string, number> = {};
  for (const p of zoneFormatter.formatToParts(new Date(at))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  return wall - at;
}

/** Ngày (`yyyy-MM-dd`) + giờ (`HH:mm`) theo giờ VN ⇒ `yyyy-MM-ddTHH:mm:ss` UTC không offset (backend so với now() UTC). */
export function vnWallClockToBackendUtc(date: string, time?: string): string | undefined {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{2}):(\d{2})/.exec((time || "09:00").trim());
  if (!d || !t) return undefined;
  const wall = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  return new Date(wall - zoneOffsetMs(wall)).toISOString().slice(0, 19);
}

/** Thời gian backend (UTC) ⇒ `{ date: yyyy-MM-dd, time: HH:mm }` theo giờ VN để điền vào ô nhập. */
export function backendToVnWallClock(value?: string | null): { date: string; time: string } | null {
  const parsed = parseBackendDateTime(value);
  if (!parsed) return null;
  const iso = new Date(parsed.getTime() + zoneOffsetMs(parsed.getTime())).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}


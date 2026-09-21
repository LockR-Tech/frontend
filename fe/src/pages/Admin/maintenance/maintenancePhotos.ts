import type {
  InspectionItemResult,
  InspectionItemVerdict,
  LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import type { AttachmentStage, ReportAttachmentResponse } from "~/stores/apis/media";
import { parseBackendDateTime } from "~/lib/datetime";

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

export interface SlaExtensionRecord {
  reportId: number;
  originalDueAt: string;
  extendedDueAt: string;
  extensionHours: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
}

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


// Chi tiết biên bản kỹ thuật & phương án xử lý của KTV
export const KTV_NOTES_BY_REPORT: Record<number, {
  technicianNote: string;
  partsReplaced?: string;
  claimedAt?: string;
  resolvedAt?: string;
}> = {
  1: {
    technicianNote: "Đã kiểm tra cơ cấu ngàm khóa cơ khí ô #8. Bản lề góc dưới bị lệch 2mm do va đập, khiến tiếp điểm cảm biến không chạm đáy. Đã nắn lại bản lề, siết chặt ốc lục giác và xịt mỡ bôi trơn chuyên dụng. Đã test đóng/mở 10 lần liên tục tín hiệu phản hồi tốt.",
    partsReplaced: "Long đen đệm inox, mỡ bôi trơn chịu nhiệt",
    claimedAt: "07:20:00 28/08/2026",
    resolvedAt: "09:45:00 28/08/2026",
  },
  2: {
    technicianNote: "Jack cắm cảm biến hồng ngoại nhận diện vật phẩm trong ô #6 bị lỏng do rung lắc. Đã cắm lại giắc, bọc ống co nhiệt chống rung và test cảm biến nhận diện đồ giặt chuẩn xác.",
    partsReplaced: "Ống co nhiệt 5mm, dây rút cố định cáp",
    claimedAt: "07:50:00 22/08/2026",
    resolvedAt: "09:30:00 22/08/2026",
  },
  3: {
    technicianNote: "Aptomat cấp nguồn tổng 24V tủ Kiosk bị nhảy do điện áp lưới chập chờn ban đêm. Đã đo đạc cách điện, thay thế Aptomat Schneider 24V mới, kiểm tra bộ nguồn xung ổn định.",
    partsReplaced: "Aptomat Schneider 24V 10A, cầu chì chống sét",
    claimedAt: "13:30:00 19/08/2026",
    resolvedAt: "16:15:00 19/08/2026",
  },
  4: {
    technicianNote: "Khách hàng trước làm đổ dung dịch nước giặt gây ố đáy ô #5 và có mùi ẩm. Đã tháo tấm lót đáy ô, xịt dung dịch khử khuẩn y tế, sấy khô nhiệt độ 60 độ C và đặt túi hút ẩm.",
    partsReplaced: "Dung dịch khử khuẩn chuyên dụng, túi khử mùi than hoạt tính",
    claimedAt: "07:15:00 18/08/2026",
    resolvedAt: "08:20:00 18/08/2026",
  },
  5: {
    technicianNote: "Module anten định vị GPS trên nắp Drone DRONE-03 bị rung lỏng ốc bắt sau ca bay gió lớn. Đã cân chỉnh anten, siết keo khóa ren Loctite 243, cập nhật lại firmware GPS và test hover ngoài trời thu 18/20 vệ tinh.",
    partsReplaced: "Ốc titan M2.5, keo khóa ren Loctite",
    claimedAt: "07:30:00 28/08/2026",
    resolvedAt: "10:35:00 28/08/2026",
  },
  6: {
    technicianNote: "Càng đáp sợi carbon bên trái bị nứt vi mô do hạ cánh khẩn cấp trên bề mặt gồ ghề. Đã thay mới bộ càng đáp carbon nguyên bản chính hãng, kiểm tra cân bằng động cánh quạt, test bay 15 phút an toàn.",
    partsReplaced: "Bộ càng đáp Carbon Drone Pro V2",
    claimedAt: "07:45:00 12/08/2026",
    resolvedAt: "10:50:00 12/08/2026",
  },
};

// Quản lý gia hạn SLA linh hoạt (Lưu trữ cục bộ để duy trì trạng thái gia hạn)
const SLA_EXTENSIONS_KEY = "locker_sla_extensions_v1";

export const getStoredSlaExtensions = (): Record<number, SlaExtensionRecord> => {
  try {
    const raw = localStorage.getItem(SLA_EXTENSIONS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const saveSlaExtension = (record: SlaExtensionRecord) => {
  try {
    const existing = getStoredSlaExtensions();
    existing[record.reportId] = record;
    localStorage.setItem(SLA_EXTENSIONS_KEY, JSON.stringify(existing));
  } catch {}
};

export const removeSlaExtension = (reportId: number) => {
  try {
    const existing = getStoredSlaExtensions();
    if (existing[reportId]) {
      delete existing[reportId];
      localStorage.setItem(SLA_EXTENSIONS_KEY, JSON.stringify(existing));
    }
  } catch {}
};

/**
 * Tính toán mốc hạn xử lý (SLA due date) có hiệu lực của phiếu sự cố.
 * Kết hợp đồng bộ thông minh giữa backend (DB/Mobile) và localStorage (vừa thao tác trên Admin).
 * Ưu tiên mốc thời gian muộn nhất hợp lệ để đảm bảo tính thực tế khi vừa được gia hạn.
 */
export const getEffectiveSlaDueAt = (
  r: LockerReportResponse,
  ext?: SlaExtensionRecord | null
): Date | null => {
  const backendDate = parseBackendDateTime(r.slaDueAt);
  const localDate = ext?.extendedDueAt ? parseBackendDateTime(ext.extendedDueAt) : null;

  // 1. So sánh cả 2 nguồn: backend (đồng bộ từ DB/Mobile) và localStorage (vừa thao tác trên máy này)
  // Ưu tiên mốc thời gian muộn nhất hợp lệ (ví dụ Mobile vừa gia hạn +24h thì DB sẽ mới hơn local cũ)
  if (backendDate && localDate) {
    if (backendDate.getTime() >= localDate.getTime()) {
      return backendDate;
    }
    return localDate;
  }

  if (backendDate) return backendDate;
  if (localDate) return localDate;

  // 2. Nếu có số giờ gia hạn nhưng chưa có slaDueAt trong DB
  const extHours = r.slaExtendedHours || ext?.extensionHours;
  if (extHours && extHours > 0) {
    if (ext?.requestedAt) {
      const reqDate = parseBackendDateTime(ext.requestedAt);
      if (reqDate) return new Date(reqDate.getTime() + extHours * 3600 * 1000);
    }
    const createdDate = parseBackendDateTime(r.createdAt);
    const slaH = r.slaHours ?? 4;
    if (createdDate) {
      return new Date(createdDate.getTime() + (slaH + extHours) * 3600 * 1000);
    }
  }

  // 3. Mặc định chưa gia hạn: createdAt + slaHours
  const createdDate = parseBackendDateTime(r.createdAt);
  if (createdDate) {
    const slaH = r.slaHours ?? 4;
    return new Date(createdDate.getTime() + slaH * 3600 * 1000);
  }

  return null;
};

/**
 * Kiểm tra xem phiếu sự cố có bị quá hạn SLA hay không.
 * Nếu phiếu đã được gia hạn và thời điểm hiện tại chưa vượt qua hạn mới thì KHÔNG coi là quá hạn.
 */
export const isReportOverdue = (
  r: LockerReportResponse,
  ext?: SlaExtensionRecord | null
): boolean => {
  if (r.status === "RESOLVED") return false;
  const effectiveDue = getEffectiveSlaDueAt(r, ext);
  if (effectiveDue) {
    return Date.now() > effectiveDue.getTime();
  }
  return Boolean(r.overdue);
};

// Tính toán thời gian xử lý thực tế giữa 2 mốc thời gian
export const calculateDurationText = (startStr?: string | null, endStr?: string | null): string => {
  if (!startStr || !endStr) return "—";
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || !isNaN(end.getTime()) === false) return "—";
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


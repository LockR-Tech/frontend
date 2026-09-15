import type { LockerReportResponse } from "~/stores/apis/admin/lockerOps";

export interface InspectionPhoto {
  url: string;
  label: string;
  tag: string;
  timestamp: string; // Thời gian cụ thể khi KTV chụp & gửi ảnh
  actorName?: string;
}

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

export const SAMPLE_PHOTOS_BY_REPORT: Record<number, InspectionPhoto[]> = {
  1: [
    {
      url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh hiện trường",
      tag: "Hiện trường: Bản lề ô 8 bị lệch",
      timestamp: "07:35:12 28/08/2026",
      actorName: "Bảo Huy Nguyễn (KTV)",
    },
    {
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh nghiệm thu",
      tag: "Nghiệm thu: Đã siết khóa & tra dầu",
      timestamp: "09:42:08 28/08/2026",
      actorName: "Bảo Huy Nguyễn (KTV)",
    },
  ],
  2: [
    {
      url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh hiện trường",
      tag: "Hiện trường: Cảm biến lỏng giắc",
      timestamp: "08:10:45 22/08/2026",
      actorName: "Trần Minh KTV",
    },
    {
      url: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh nghiệm thu",
      tag: "Nghiệm thu: Đã cố định jack cắm",
      timestamp: "09:20:15 22/08/2026",
      actorName: "Trần Minh KTV",
    },
  ],
  3: [
    {
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh trước sửa",
      tag: "Hiện trường: Bộ nguồn tủ mất pha",
      timestamp: "14:15:30 19/08/2026",
      actorName: "Bảo Huy Huỳnh (KTV)",
    },
    {
      url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh nghiệm thu",
      tag: "Nghiệm thu: Đã thay Aptomat nguồn 24V",
      timestamp: "16:05:22 19/08/2026",
      actorName: "Bảo Huy Huỳnh (KTV)",
    },
  ],
  4: [
    {
      url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh trước sửa",
      tag: "Hiện trường: Ô bẩn, có mùi ẩm mốc",
      timestamp: "07:22:18 18/08/2026",
      actorName: "Bảo Huy Nguyễn (KTV)",
    },
    {
      url: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh sau sửa",
      tag: "Nghiệm thu: Đã khử khuẩn sạch sẽ",
      timestamp: "08:15:00 18/08/2026",
      actorName: "Bảo Huy Nguyễn (KTV)",
    },
  ],
  5: [
    {
      url: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh hiện trường",
      tag: "Hiện trường: Anten GPS Drone rung lỏng",
      timestamp: "08:05:10 28/08/2026",
      actorName: "Bảo Huy Nguyễn (KTV)",
    },
    {
      url: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh nghiệm thu",
      tag: "Nghiệm thu: Đã cân chỉnh lock 18 vệ tinh",
      timestamp: "10:30:45 28/08/2026",
      actorName: "Bảo Huy Nguyễn (KTV)",
    },
  ],
  6: [
    {
      url: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh hiện trường",
      tag: "Hiện trường: Nứt gãy càng đáp Drone",
      timestamp: "08:12:00 12/08/2026",
      actorName: "Bảo Huy Huỳnh (KTV)",
    },
    {
      url: "https://images.unsplash.com/photo-1506947411487-a56738267384?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh nghiệm thu",
      tag: "Nghiệm thu: Đã thay càng carbon mới",
      timestamp: "10:45:18 12/08/2026",
      actorName: "Bảo Huy Huỳnh (KTV)",
    },
  ],
  7: [
    {
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh hiện trường",
      tag: "Hiện trường: Cáp HDMI màn hình đơ",
      timestamp: "09:10:00 10/08/2026",
      actorName: "Kỹ thuật viên Kiosk",
    },
    {
      url: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh nghiệm thu",
      tag: "Nghiệm thu: Đã hiệu chuẩn cảm ứng OK",
      timestamp: "11:20:00 10/08/2026",
      actorName: "Kỹ thuật viên Kiosk",
    },
  ],
  8: [
    {
      url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh hiện trường",
      tag: "Hiện trường: Quạt tản nhiệt đóng bụi",
      timestamp: "13:40:15 05/08/2026",
      actorName: "Kỹ thuật viên Kiosk",
    },
    {
      url: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=700&auto=format&fit=crop&q=80",
      label: "Ảnh nghiệm thu",
      tag: "Nghiệm thu: Vệ sinh quạt, nhiệt độ ổn định",
      timestamp: "15:10:30 05/08/2026",
      actorName: "Kỹ thuật viên Kiosk",
    },
  ],
};

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

// Ảnh từ người dùng khi gửi báo cáo sự cố (User / Customer photos)
export const getUserPhotos = (report: LockerReportResponse): InspectionPhoto[] => {
  const extracted = extractPhotoList(report.description);
  if (extracted.length > 0) {
    return extracted.map((url, i) => ({
      url,
      label: `Ảnh từ User #${i + 1}`,
      tag: `Ảnh sự cố do khách hàng tải lên`,
      timestamp: report.createdAt || "Vừa cập nhật",
    }));
  }
  return [];
};

// Ảnh hiện trường do KTV chụp khi đến kiểm tra tủ
export const getInspectionPhotos = (report: LockerReportResponse): InspectionPhoto[] => {
  const samples = SAMPLE_PHOTOS_BY_REPORT[report.id];
  if (samples) {
    return samples.filter(
      (p) =>
        p.label.includes("hiện trường") ||
        p.label.includes("trước sửa") ||
        p.tag.toLowerCase().includes("hiện trường")
    );
  }
  return [];
};

// Ảnh nghiệm thu sau khi KTV hoàn tất sửa chữa (CHỈ hiển thị khi đã RESOLVED)
export const getResolutionPhotos = (report: LockerReportResponse): InspectionPhoto[] => {
  if (report.status !== "RESOLVED") {
    return [];
  }
  const samples = SAMPLE_PHOTOS_BY_REPORT[report.id];
  if (samples) {
    const res = samples.filter(
      (p) =>
        p.label.includes("nghiệm thu") ||
        p.label.includes("sau sửa") ||
        p.tag.toLowerCase().includes("nghiệm thu")
    );
    if (res.length > 0) return res;
  }
  return [];
};

export const getReportPhotos = (report: LockerReportResponse): InspectionPhoto[] => {
  return getResolutionPhotos(report);
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

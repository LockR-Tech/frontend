import {
  Award,
  Boxes,
  Cpu,
  Package,
  ShieldCheck,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  SETTING_SCOPES,
  type SettingScope,
} from "~/stores/apis/admin/businessSettings";

export interface ScopeTab {
  scope: SettingScope;
  title: string;
  description: string;
  icon: LucideIcon;
}

// Chỉ mô tả nhóm; danh sách quy tắc trong mỗi tab luôn lấy từ API.
export const SCOPE_TABS: ScopeTab[] = [
  {
    scope: "order",
    title: "Đơn hàng & giá",
    description: "Giá gửi hàng, thuê tủ, phí lưu giữ, thời hạn nhận hàng và tự huỷ đơn.",
    icon: Package,
  },
  {
    scope: "locker",
    title: "Tủ & bảo trì",
    description: "SLA xử lý sự cố, ngưỡng phạt, ảnh nghiệm thu, giữ ô và drone.",
    icon: Boxes,
  },
  {
    scope: "payment",
    title: "Thanh toán & ví",
    description: "Hạn mức nạp ví, mệnh giá gợi ý và phương thức thanh toán.",
    icon: Wallet,
  },
  {
    scope: "iot",
    title: "Thiết bị IoT",
    description: "Khoá tạm sau nhiều lần nhập sai, thời gian chờ mở và đóng cửa tủ.",
    icon: Cpu,
  },
  {
    scope: "auth",
    title: "Xác thực",
    description: "Hiệu lực và độ dài mã OTP, thời hạn token tạm.",
    icon: ShieldCheck,
  },
  {
    scope: "loyalty",
    title: "Khách hàng thân thiết",
    description: "Ngưỡng hạng thành viên, tem và điểm đổi thưởng.",
    icon: Award,
  },
  {
    scope: "store",
    title: "Cửa hàng",
    description: "Bán kính mặc định khi tìm cửa hàng gần.",
    icon: Store,
  },
];

export const DEFAULT_SCOPE: SettingScope = "order";

export function isSettingScope(value: string | null | undefined): value is SettingScope {
  return !!value && (SETTING_SCOPES as readonly string[]).includes(value);
}

export function scopeTitle(scope: SettingScope): string {
  return SCOPE_TABS.find((tab) => tab.scope === scope)?.title ?? scope;
}

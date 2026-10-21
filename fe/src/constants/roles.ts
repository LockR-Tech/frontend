import i18n from "~/utils/i18n";

// Khoá i18n cho nhãn role. Định danh role là chuỗi SCREAMING_SNAKE do backend
// cấp (allowlist ở auth-service/…/AuthService.java); phần dưới chỉ lo hiển thị.
export const ROLE_LABEL_KEYS: Record<string, string> = {
  CUSTOMER: "shared.roles.customer",
  ADMIN: "shared.roles.admin",
  LOCKER_TECHNICIAN: "shared.roles.lockerTechnician",
  DRONE_TECHNICIAN: "shared.roles.droneTechnician",
  // Tên cũ trước khi đổi — giữ để tài khoản chưa chạy migration V5 không hiện
  // ra chuỗi thô.
  TECHNICIAN: "shared.roles.lockerTechnician",
  MAINTENANCE: "shared.roles.droneTechnician",
  // Role đã khai tử, chỉ còn trong dữ liệu seed cũ.
  MANAGER: "shared.roles.manager",
  STAFF: "shared.roles.staff",
  USER: "shared.roles.user",
  MODERATOR: "shared.roles.moderator",
  SUPER_ADMIN: "shared.roles.superAdmin",
};

/// Bỏ tiền tố `ROLE_` rồi tra nhãn (theo ngôn ngữ hiện tại); không có nhãn thì trả lại chính định danh.
export function getRoleLabel(role: string): string {
  const normalized = role.toUpperCase().replace(/^ROLE_/, "");
  const key = ROLE_LABEL_KEYS[normalized];
  return key ? i18n.t(key) : role;
}

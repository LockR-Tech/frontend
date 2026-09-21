// Nhãn tiếng Việt cho role. Định danh role là chuỗi SCREAMING_SNAKE do backend
// cấp (allowlist ở auth-service/…/AuthService.java); phần dưới chỉ lo hiển thị.
export const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  ADMIN: "Quản trị viên",
  LOCKER_TECHNICIAN: "Kỹ thuật viên tủ",
  DRONE_TECHNICIAN: "Kỹ thuật viên drone",
  // Tên cũ trước khi đổi — giữ để tài khoản chưa chạy migration V5 không hiện
  // ra chuỗi thô.
  TECHNICIAN: "Kỹ thuật viên tủ",
  MAINTENANCE: "Kỹ thuật viên drone",
  // Role đã khai tử, chỉ còn trong dữ liệu seed cũ.
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
  USER: "Người dùng",
  MODERATOR: "Kiểm duyệt viên",
  PARTNER: "Đối tác",
  PARTNER_STAFF: "Nhân viên đối tác",
  SUPER_ADMIN: "Quản trị cấp cao",
};

/// Bỏ tiền tố `ROLE_` rồi tra nhãn; không có nhãn thì trả lại chính định danh.
export function getRoleLabel(role: string): string {
  const normalized = role.toUpperCase().replace(/^ROLE_/, "");
  return ROLE_LABELS[normalized] ?? role;
}

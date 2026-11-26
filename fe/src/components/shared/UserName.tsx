import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetUserByIdQuery } from "~/stores/apis/admin/users";

/**
 * Tên người dùng theo id (truy vấn được RTK Query cache theo id nên nhiều dòng cùng người chỉ gọi một lần),
 * bấm mở trang chi tiết. Chưa tải được tên (tài khoản đã xoá…) thì hiện `#id`. Id ≤ 0 là hệ thống tự ghi
 * (không có tài khoản) ⇒ hiện "Hệ thống", không gọi API.
 */
export function UserName({ id, className }: { id: number; className?: string }) {
  const { t } = useTranslation();
  const system = !(id > 0);
  const { data } = useGetUserByIdQuery(system ? skipToken : id);
  if (system) return <span className={className}>{t("common.system")}</span>;
  const name = data?.data?.name || data?.data?.email;
  return (
    <Link
      to={`/admin/users/${id}`}
      className={className ?? "font-medium text-foreground/80 hover:underline"}
      onClick={(e) => e.stopPropagation()}
    >
      {name || `#${id}`}
    </Link>
  );
}

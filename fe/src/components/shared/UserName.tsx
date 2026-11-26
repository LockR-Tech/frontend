import { Link } from "react-router-dom";
import { useGetUserByIdQuery } from "~/stores/apis/admin/users";

/**
 * Tên người dùng theo id (truy vấn được RTK Query cache theo id nên nhiều dòng cùng người chỉ gọi một lần),
 * bấm mở trang chi tiết. Chưa tải được tên (tài khoản đã xoá…) thì hiện `#id`.
 */
export function UserName({ id, className }: { id: number; className?: string }) {
  const { data } = useGetUserByIdQuery(id);
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

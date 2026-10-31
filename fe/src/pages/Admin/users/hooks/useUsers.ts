import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetAllUsersQuery } from "~/stores/apis/adminApi";
import { useDeleteUserMutation } from "~/stores/apis/admin";
import { formatDate } from "~/lib/datetime";
import type { AdminUserResponse } from "~/types";

export type UserStatus = "ALL" | "ACTIVE" | "INACTIVE";

/**
 * Dòng bảng người dùng. Khác `AdminUserResponse` ở chỗ các trường backend có thể
 * không gửi (provider/emailVerified khi auth-service lỗi, createdAt/updatedAt ở bản cũ)
 * được giữ `null` để hiển thị "—" thay vì giá trị bịa.
 */
export type AdminUserRow = Omit<
  AdminUserResponse,
  "provider" | "emailVerified" | "createdAt" | "updatedAt"
> & {
  provider: string | null;
  emailVerified: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  status?: string;
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  birthday: string | null;
  /** false = tài khoản Google/OTP chưa tự đặt mật khẩu; null = không tra được auth-service. */
  hasPassword: boolean | null;
  lastLoginAt: string | null;
};

/**
 * `/api/admin/users` và `/api/admin/users/{id}` đều trả AdminUserView:
 * `{ id, email, phoneNumber, fullName, status, roles, imageUrl, createdAt, updatedAt,
 * provider?, emailVerified?, hasPassword?, lastLoginAt?, termsAccepted, termsAcceptedAt?,
 * termsVersion?, birthday? }` — không phân trang, tên trường khác bảng nên map ở đây.
 */
export interface BackendUserSummary {
  id: number;
  email?: string | null;
  phoneNumber?: string | null;
  fullName?: string | null;
  name?: string | null;
  status?: string | null;
  roles?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  provider?: string | null;
  emailVerified?: boolean | null;
  imageUrl?: string | null;
  termsAccepted?: boolean | null;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  birthday?: string | null;
  hasPassword?: boolean | null;
  lastLoginAt?: string | null;
}

export function mapUser(u: BackendUserSummary): AdminUserRow {
  const status = (u.status ?? "ACTIVE").toUpperCase();
  return {
    id: u.id,
    email: u.email ?? "",
    name: u.fullName ?? u.name ?? "",
    imageUrl: u.imageUrl ?? "",
    provider: u.provider ?? null,
    emailVerified: u.emailVerified ?? null,
    enabled: status === "ACTIVE",
    status,
    roles: u.roles ?? [],
    createdAt: u.createdAt ?? null,
    updatedAt: u.updatedAt ?? null,
    phoneNumber: u.phoneNumber ?? undefined,
    termsAccepted: u.termsAccepted ?? false,
    termsAcceptedAt: u.termsAcceptedAt ?? null,
    termsVersion: u.termsVersion ?? null,
    birthday: u.birthday ?? null,
    hasPassword: u.hasPassword ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
  };
}

/** Số liệu cho hàng thẻ thống kê — tính trên toàn bộ người dùng, không theo bộ lọc. */
export function computeUserStats(users: AdminUserRow[]) {
  // "dd/MM/yyyy" giờ Việt Nam ⇒ bỏ ngày còn tháng/năm.
  const thisMonth = formatDate(new Date()).slice(3);
  const customers = users.filter((u) => u.roles.some((r) => r === "CUSTOMER" || r === "USER")).length;
  return {
    total: users.length,
    customers,
    staff: users.length - customers,
    active: users.filter((u) => u.enabled).length,
    inactive: users.filter((u) => !u.enabled).length,
    newThisMonth: users.filter((u) => u.createdAt && formatDate(u.createdAt).slice(3) === thisMonth).length,
    emailVerified: users.filter((u) => u.emailVerified === true).length,
    termsAccepted: users.filter((u) => u.termsAccepted).length,
  };
}

// Cùng tham số với dashboard/notifications để dùng chung cache — backend bỏ qua page/size.
const ALL_USERS_ARGS = { page: 0, size: 1000 };

export function useUsers() {
  const [status, setStatusState] = useState<UserStatus>("ALL");
  const [searchQuery, setSearchQueryState] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Math.max(0, Number(urlParams.get("page") ?? "0") || 0);
  const pageSize = Math.max(1, Number(urlParams.get("size") ?? "10") || 10);
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });

  // Đổi bộ lọc thì quay về trang đầu, tránh đứng ở trang không còn dữ liệu.
  const setStatus = (value: UserStatus) => {
    setStatusState(value);
    setPage(0);
  };
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
    if (page !== 0) setPage(0);
  };

  const { data: apiData, isLoading, error, refetch } = useGetAllUsersQuery(ALL_USERS_ARGS);

  const [deleteUser] = useDeleteUserMutation();

  const users: AdminUserRow[] = useMemo(() => {
    // Chấp nhận cả List (hiện tại) lẫn Page (nếu backend đổi sau này).
    const raw = apiData?.data as unknown;
    const list: BackendUserSummary[] = Array.isArray(raw)
      ? (raw as BackendUserSummary[])
      : ((raw as { content?: BackendUserSummary[] })?.content ?? []);
    return list.map(mapUser);
  }, [apiData]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (status !== "ALL") {
      result = result.filter((user) => (status === "ACTIVE" ? user.enabled : !user.enabled));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.email?.toLowerCase().includes(query) ||
          user.name?.toLowerCase().includes(query) ||
          user.phoneNumber?.toLowerCase().includes(query) ||
          user.roles?.some((role) => role.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [users, status, searchQuery]);

  // Phân trang tại client sau khi lọc.
  const totalElements = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const pagedUsers = useMemo(
    () => filteredUsers.slice(page * pageSize, (page + 1) * pageSize),
    [filteredUsers, page, pageSize],
  );

  // Xoá bớt dòng làm trang hiện tại vượt quá số trang → lùi về trang cuối.
  useEffect(() => {
    if (!isLoading && page > 0 && page >= totalPages) {
      setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(totalPages - 1)); return next; });
    }
  }, [isLoading, page, totalPages, setUrlParams]);

  const statusCounts = useMemo(
    () => ({
      ALL: users.length,
      ACTIVE: users.filter((u) => u.enabled).length,
      INACTIVE: users.filter((u) => !u.enabled).length,
    }),
    [users],
  );

  const stats = useMemo(() => computeUserStats(users), [users]);

  const clearFilters = () => {
    setStatusState("ALL");
    setSearchQueryState("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    users: pagedUsers,
    deleteOne: (id: number, reason: string) => deleteUser({ id, reason }).unwrap(),
    totalElements,
    totalPages,
    isLoading,
    error,
    status,
    setStatus,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    clearFilters,
    hasActiveFilters,
    statusCounts,
    stats,
  };
}

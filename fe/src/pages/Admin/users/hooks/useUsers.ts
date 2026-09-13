import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetAllUsersQuery } from "~/stores/apis/adminApi";
import type { AdminUserResponse } from "~/types";

export type UserStatus = "ALL" | "ACTIVE" | "INACTIVE" | "PENDING";

/** Row shape the table renders; extends AdminUserResponse with phone from the backend. */
export type AdminUserRow = AdminUserResponse & { phoneNumber?: string };

/**
 * Backend `/api/admin/users` returns a flat `List<UserSummary>`:
 * `{ id, email, phoneNumber, fullName, status, roles }` — NOT a paginated Page,
 * and field names differ from the table's `AdminUserResponse`. Map it here so the
 * table works without changing the shared backend contract.
 */
interface BackendUserSummary {
  id: number;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  status?: string;
  roles?: string[];
  createdAt?: string;
  provider?: string;
  emailVerified?: boolean;
  imageUrl?: string;
}

function mapUser(u: BackendUserSummary): AdminUserRow {
  return {
    id: u.id,
    email: u.email ?? "",
    name: u.fullName ?? "",
    imageUrl: u.imageUrl ?? "",
    provider: (u.provider ?? "LOCAL") as AdminUserResponse["provider"],
    emailVerified: u.emailVerified ?? false,
    enabled: (u.status ?? "ACTIVE").toUpperCase() === "ACTIVE",
    roles: u.roles ?? [],
    createdAt: u.createdAt ?? "",
    updatedAt: "",
    phoneNumber: u.phoneNumber,
  };
}

export function useUsers() {
  const [status, setStatus] = useState<UserStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlParams, setUrlParams] = useSearchParams();
  const page = Number(urlParams.get("page") ?? "0");
  const pageSize = Number(urlParams.get("size") ?? "10");
  const setPage = (newPage: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(newPage)); return next; });
  const setPageSize = (newSize: number) =>
    setUrlParams((prev) => { const next = new URLSearchParams(prev); next.set("size", String(newSize)); next.set("page", "0"); return next; });

  const {
    data: apiData,
    isLoading,
    error,
    refetch,
  } = useGetAllUsersQuery({ page, size: pageSize });

  // Tolerate both a flat list (current backend) and a paginated Page (future).
  const raw = apiData?.data as unknown;
  const rawList: BackendUserSummary[] = Array.isArray(raw)
    ? (raw as BackendUserSummary[])
    : ((raw as { content?: BackendUserSummary[] })?.content ?? []);
  const users: AdminUserRow[] = rawList.map(mapUser);
  const totalElements = users.length;
  const totalPages = 1;

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (status !== "ALL") {
      result = result.filter((user) => {
        switch (status) {
          case "ACTIVE":
            return user.enabled;
          case "INACTIVE":
            return !user.enabled;
          case "PENDING":
            return !user.emailVerified;
          default:
            return true;
        }
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.email?.toLowerCase().includes(query) ||
          user.name?.toLowerCase().includes(query) ||
          user.roles?.some((role) => role.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [users, status, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: users.length,
      ACTIVE: users.filter((u) => u.enabled).length,
      INACTIVE: users.filter((u) => !u.enabled).length,
      PENDING: users.filter((u) => !u.emailVerified).length,
    }),
    [users],
  );

  const clearFilters = () => {
    setStatus("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters = status !== "ALL" || searchQuery !== "";

  return {
    users: filteredUsers,
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
  };
}

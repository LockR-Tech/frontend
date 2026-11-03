import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { DataTable } from "~/components/shared/data-table";
import { formatDate, formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatNumber } from "~/lib/report-format";
import type { AdminLockerResponse } from "~/types";
import type { AdminUserRow } from "../../users/hooks/useUsers";

export interface DashboardLockersTarget {
  title: string;
  /** Chỉ tủ ở trạng thái này; không có = mọi tủ. */
  status?: AdminLockerResponse["status"];
}

const lockerColumn = createColumnHelper<AdminLockerResponse>();

const inUse = (locker: AdminLockerResponse) =>
  Math.max(0, (locker.totalBoxes ?? 0) - (locker.availableBoxes ?? 0));

/** Tủ sau các số Kiosk/ô trên Dashboard — cùng danh sách đã dùng để tính số đó, nên tổng khớp thẻ. */
export function DashboardLockersModal({
  target,
  lockers,
  onClose,
}: {
  target: DashboardLockersTarget | null;
  lockers: AdminLockerResponse[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rows = useMemo(
    () => (target?.status ? lockers.filter((l) => l.status === target.status) : lockers),
    [lockers, target],
  );
  const totals = rows.reduce(
    (sum, l) => ({
      available: sum.available + (l.availableBoxes ?? 0),
      inUse: sum.inUse + inUse(l),
      total: sum.total + (l.totalBoxes ?? 0),
    }),
    { available: 0, inUse: 0, total: 0 },
  );

  const columns = useMemo(
    () => [
      lockerColumn.accessor("name", {
        header: t("admin.dashboard.drilldown.kiosk"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{row.original.name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{row.original.code}</p>
          </div>
        ),
      }),
      lockerColumn.accessor("storeName", {
        header: t("admin.dashboard.drilldown.store"),
        cell: ({ row }) => <span className="text-xs">{row.original.storeName || EMPTY_VALUE}</span>,
      }),
      lockerColumn.accessor("status", {
        header: t("common.status"),
        cell: ({ row }) => (
          <span className="text-xs">
            {t(`admin.lockers.status.${String(row.original.status).toLowerCase()}`, {
              defaultValue: row.original.status,
            })}
          </span>
        ),
      }),
      lockerColumn.accessor("availableBoxes", {
        header: t("admin.dashboard.drilldown.availableBoxes"),
        cell: ({ row }) => <span className="text-xs">{formatNumber(row.original.availableBoxes)}</span>,
      }),
      lockerColumn.display({
        id: "inUse",
        header: t("admin.dashboard.drilldown.inUseBoxes"),
        cell: ({ row }) => <span className="text-xs">{formatNumber(inUse(row.original))}</span>,
      }),
      lockerColumn.accessor("totalBoxes", {
        header: t("admin.dashboard.drilldown.totalBoxes"),
        cell: ({ row }) => <span className="text-xs font-semibold">{formatNumber(row.original.totalBoxes)}</span>,
      }),
    ],
    [t],
  );

  return (
    <Dialog open={!!target} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 space-y-1.5 border-b pb-4">
          <DialogTitle className="text-base sm:text-lg font-bold">{target?.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("admin.dashboard.drilldown.lockerTotals", {
              kiosks: formatNumber(rows.length),
              available: formatNumber(totals.available),
              inUse: formatNumber(totals.inUse),
              total: formatNumber(totals.total),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-3">
          <DataTable
            columns={columns}
            data={rows}
            onRowClick={(locker) => {
              onClose();
              navigate(`/admin/lockers/${locker.id}`);
            }}
            emptyMessage={t("admin.dashboard.drilldown.noLockers")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface DashboardUsersTarget {
  title: string;
  /** "YYYY-MM" — tài khoản tạo trong tháng này (giờ Việt Nam). */
  month: string;
}

const userColumn = createColumnHelper<AdminUserRow>();

/** "YYYY-MM" giờ Việt Nam của thời điểm tạo, cùng cách user-service gom theo tháng. */
function joinedMonth(createdAt: string | null | undefined) {
  const day = createdAt ? formatDate(createdAt) : EMPTY_VALUE;
  return day === EMPTY_VALUE ? null : `${day.slice(6, 10)}-${day.slice(3, 5)}`;
}

/** Tài khoản đăng ký mới trong một tháng của biểu đồ tăng trưởng. */
export function DashboardUsersModal({
  target,
  users,
  onClose,
}: {
  target: DashboardUsersTarget | null;
  users: AdminUserRow[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rows = useMemo(
    () =>
      target
        ? users
            .filter((u) => joinedMonth(u.createdAt) === target.month)
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        : [],
    [users, target],
  );

  const columns = useMemo(
    () => [
      userColumn.accessor("name", {
        header: t("admin.dashboard.drilldown.user"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{row.original.name || EMPTY_VALUE}</p>
            <p className="text-[10px] text-muted-foreground truncate">{row.original.email || EMPTY_VALUE}</p>
          </div>
        ),
      }),
      userColumn.accessor("phoneNumber", {
        header: t("admin.dashboard.drilldown.phone"),
        cell: ({ row }) => <span className="text-xs font-mono">{row.original.phoneNumber || EMPTY_VALUE}</span>,
      }),
      userColumn.accessor("roles", {
        header: t("admin.dashboard.drilldown.roles"),
        cell: ({ row }) => <span className="text-xs">{(row.original.roles ?? []).join(", ") || EMPTY_VALUE}</span>,
      }),
      userColumn.accessor("createdAt", {
        header: t("admin.dashboard.drilldown.joinedAt"),
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      }),
    ],
    [t],
  );

  return (
    <Dialog open={!!target} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 space-y-1.5 border-b pb-4">
          <DialogTitle className="text-base sm:text-lg font-bold">{target?.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("admin.dashboard.drilldown.userCount", { total: formatNumber(rows.length) })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-3">
          <DataTable
            columns={columns}
            data={rows}
            onRowClick={(user) => {
              onClose();
              navigate(`/admin/users/${user.id}`);
            }}
            emptyMessage={t("admin.dashboard.drilldown.noUsers")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

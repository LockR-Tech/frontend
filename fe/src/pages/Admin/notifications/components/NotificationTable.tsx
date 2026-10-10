import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import {
  MoreHorizontal,
  Trash2,
  RefreshCw,
  CheckCheck,
  Clock,
  BookOpen,
  Loader2,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { NotificationStatus } from "~/types/admin/enums";
import { formatDate, formatTime } from "~/lib/datetime";
import type { NotificationRow } from "../hooks/useNotifications";
import { notificationTypeLabel, notificationTypeStyle } from "../notification-meta";

interface NotificationTableProps {
  notifications: NotificationRow[];
  isLoading: boolean;
  pendingIds: Set<number>;
  onDelete: (row: NotificationRow) => void;
  onMarkRead: (id: number) => void;
  onResend: (id: number) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<NotificationRow>();

const getStatusBadge = (status: NotificationStatus, t: (key: string) => string) => {
  const read = status === NotificationStatus.READ;
  const Icon = read ? CheckCheck : Clock;
  return (
    <Badge
      className={`${read ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"} border-0 font-medium text-xs`}
    >
      <Icon className="mr-1 h-3 w-3" />
      {t(read ? "admin.notifications.status.read" : "admin.notifications.status.unread")}
    </Badge>
  );
};

export function NotificationTable({
  notifications,
  isLoading,
  pendingIds,
  onDelete,
  onMarkRead,
  onResend,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: NotificationTableProps) {
  const { t } = useTranslation();
  const columns = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => (
        <span className="text-xs font-mono text-muted-foreground">
          #{info.getValue()}
        </span>
      ),
      size: 60,
    }),

    columnHelper.display({
      id: "recipient",
      header: t("admin.notifications.columns.recipient"),
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {row.recipientName ?? `#${row.recipientId ?? "—"}`}
            </p>
            {row.recipientEmail && (
              <p className="text-xs text-muted-foreground/70 truncate">
                {row.recipientEmail}
              </p>
            )}
          </div>
        );
      },
    }),

    columnHelper.accessor("title", {
      header: t("admin.notifications.columns.title"),
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="max-w-50">
            <p className="font-medium text-sm text-foreground truncate">
              {info.getValue()}
            </p>
            <p className="text-xs text-muted-foreground/70 truncate">{row.message}</p>
          </div>
        );
      },
    }),

    columnHelper.accessor("type", {
      header: t("admin.notifications.columns.type"),
      cell: (info) => (
        <Badge className={`${notificationTypeStyle(info.getValue())} border-0 font-medium text-xs`}>
          {notificationTypeLabel(info.getValue())}
        </Badge>
      ),
    }),

    columnHelper.accessor("status", {
      header: t("admin.notifications.columns.status"),
      cell: (info) => getStatusBadge(info.getValue(), t),
    }),

    columnHelper.accessor("createdAt", {
      header: t("admin.notifications.columns.createdAt"),
      cell: (info) => {
        // Chuỗi backend không offset = UTC → hiển thị giờ Việt Nam.
        const raw = info.getValue();
        if (formatDate(raw) === "—") return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="font-mono text-xs">
            <p className="font-semibold text-foreground tracking-tight">{formatTime(raw)}</p>
            <p className="text-[11px] text-muted-foreground">{formatDate(raw)}</p>
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const row = info.row.original;
        const pending = pendingIds.has(row.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pending}>
                {pending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MoreHorizontal size={14} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {row.status === NotificationStatus.UNREAD && (
                <DropdownMenuItem onClick={() => onMarkRead(row.id)} className="text-xs">
                  <BookOpen size={13} className="mr-2" />
                  {t("admin.notifications.actions.markRead")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onResend(row.id)} className="text-xs">
                <RefreshCw size={13} className="mr-2" />
                {t("admin.notifications.actions.resend")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(row)}
                className="text-xs text-red-600 focus:text-red-600"
              >
                <Trash2 size={13} className="mr-2" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={notifications}
      isLoading={isLoading}
      emptyMessage={t("admin.notifications.emptyMessage")}
      serverPagination={{
        pageIndex: page,
        pageSize,
        pageCount: totalPages,
        totalRows: totalElements,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}

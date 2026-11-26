import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Bot, UserRound } from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
import { Badge } from "~/components/ui/badge";
import { formatDate, formatTime } from "~/lib/datetime";
import { getRoleLabel } from "~/constants/roles";
import type { ActionLogEntry } from "~/stores/apis/admin/auditLogs";

/** Nhóm màu theo hành động: bật bảo trì / khoá / xoá (đỏ cam), kích hoạt / mở lại (xanh), còn lại (xám xanh). */
function actionTone(action: string): string {
  if (/DELETED|LOCKED|DISABLED|FAULT|OUT_OF_SERVICE|MAINTENANCE|DEACTIVATED|UNASSIGNED/.test(action)) {
    return "bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-300";
  }
  if (/ACTIVATED|ENABLED|BACK_IN_SERVICE|ASSIGNED|CREATED/.test(action)) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300";
  }
  return "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300";
}

export function actionLabel(action: string, t: TFunction): string {
  return t(`admin.auditLogs.actions.${action}`, { defaultValue: action });
}

/** Trạng thái tủ / ô / drone, vai trò, hoặc "trường=giá trị; …" của lần sửa thông tin. */
function valueLabel(value: string | null, action: string, t: TFunction): string {
  if (value == null || value === "") return "—";
  if (action === "USER_ROLES_CHANGED" || action === "USER_CREATED") {
    return value.split(",").map((role) => getRoleLabel(role.trim())).join(", ");
  }
  if (value.includes("=")) {
    return value
      .split("; ")
      .map((part) => {
        const [key, ...rest] = part.split("=");
        return `${t(`admin.auditLogs.fields.${key}`, { defaultValue: key })}: ${rest.join("=")}`;
      })
      .join(" · ");
  }
  return t(`admin.auditLogs.values.${value}`, { defaultValue: value });
}

function targetLink(row: ActionLogEntry): string | null {
  switch (row.targetType) {
    case "LOCKER":
      return row.targetId != null ? `/admin/lockers/${row.targetId}` : null;
    case "BOX":
      return row.lockerId != null ? `/admin/lockers/${row.lockerId}` : null;
    case "DRONE":
      return row.targetId != null ? `/admin/drones/${row.targetId}` : null;
    case "USER":
      return row.targetId != null ? `/admin/users/${row.targetId}` : null;
    default:
      return null;
  }
}

const columnHelper = createColumnHelper<ActionLogEntry>();

export interface ActionLogTableProps {
  rows: ActionLogEntry[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Gắn trong trang một tủ / drone: bỏ cột đối tượng khi chỉ có một đối tượng. */
  hideTarget?: boolean;
}

export function ActionLogTable({
  rows,
  isLoading,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
  hideTarget = false,
}: ActionLogTableProps) {
  const { t } = useTranslation();

  const columns = useMemo(() => {
    const all = [
      columnHelper.accessor("occurredAt", {
        header: t("admin.auditLogs.columns.time"),
        cell: ({ getValue }) => (
          <div className="whitespace-nowrap text-xs">
            <div className="font-medium text-foreground">{formatTime(getValue())}</div>
            <div className="text-muted-foreground">{formatDate(getValue())}</div>
          </div>
        ),
        size: 90,
      }),
      columnHelper.accessor("actorName", {
        header: t("admin.auditLogs.columns.actor"),
        cell: ({ row }) => {
          const { actorUserId, actorName, actorRoles } = row.original;
          if (actorUserId == null) {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bot size={14} /> {t("admin.auditLogs.system")}
              </span>
            );
          }
          const roles = (actorRoles ?? "")
            .split(",")
            .map((role) => role.trim())
            .filter((role) => role && role.toUpperCase() !== "CUSTOMER");
          return (
            <div className="text-xs">
              <Link
                to={`/admin/users/${actorUserId}`}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <UserRound size={13} /> {actorName || t("admin.auditLogs.userId", { id: actorUserId })}
              </Link>
              {roles.length > 0 && (
                <div className="text-muted-foreground">{roles.map(getRoleLabel).join(", ")}</div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("action", {
        header: t("admin.auditLogs.columns.action"),
        cell: ({ getValue }) => (
          <Badge variant="outline" className={`text-[11px] font-medium ${actionTone(getValue())}`}>
            {actionLabel(getValue(), t)}
          </Badge>
        ),
      }),
      columnHelper.accessor("targetLabel", {
        id: "target",
        header: t("admin.auditLogs.columns.target"),
        cell: ({ row }) => {
          const link = targetLink(row.original);
          const type = row.original.targetType
            ? t(`admin.auditLogs.targetTypes.${row.original.targetType}`, { defaultValue: row.original.targetType })
            : "";
          const label = row.original.targetLabel ?? (row.original.targetId != null ? `#${row.original.targetId}` : "—");
          return (
            <div className="text-xs">
              <div className="text-muted-foreground">{type}</div>
              {link ? (
                <Link to={link} className="font-medium text-primary hover:underline">
                  {label}
                </Link>
              ) : (
                <span className="font-medium">{label}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "change",
        header: t("admin.auditLogs.columns.change"),
        cell: ({ row }) => {
          const { fromValue, toValue, action, note } = row.original;
          const hasChange = fromValue != null || toValue != null;
          return (
            <div className="max-w-md space-y-1 text-xs">
              {hasChange && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">{valueLabel(fromValue, action, t)}</span>
                  <ArrowRight size={12} className="text-muted-foreground" />
                  <span className="font-medium text-foreground">{valueLabel(toValue, action, t)}</span>
                </div>
              )}
              {note && (
                <div className="text-muted-foreground">
                  {t("admin.auditLogs.note")}: {note}
                </div>
              )}
              {!hasChange && !note && <span className="text-muted-foreground">—</span>}
            </div>
          );
        },
      }),
    ];
    return (hideTarget ? all.filter((column) => column.id !== "target") : all) as ColumnDef<ActionLogEntry, unknown>[];
  }, [t, hideTarget]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      emptyMessage={t("admin.auditLogs.empty")}
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

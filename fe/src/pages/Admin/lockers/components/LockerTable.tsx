import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Box,
  MapPin,
  Store,
  CheckCircle2,
  XCircle,
  Wrench,
  Eye,
  Power,
  UserCheck,
  Trash2,
  Hammer,
  ClipboardCheck,
} from "lucide-react";
import { DataTable, DeleteReasonDialog } from "~/components/shared/data-table";
import { LockerMaintenanceDialog } from "./LockerMaintenanceDialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { LockerStatus } from "~/types/admin/enums";
import type { AdminLockerResponse } from "~/types/admin/locker";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface LockerTableProps {
  lockers: AdminLockerResponse[];
  isLoading: boolean;
  onMaintenance?: (lockerId: number) => void;
  onMaintenanceSuccess?: () => void;
  onActivate: (lockerId: number) => void;
  onDelete?: (lockerId: number, reason: string) => Promise<boolean>;
  onDeleteBatch?: (lockerIds: number[], reason: string) => Promise<boolean>;
  onDeleteAll?: (reason: string) => Promise<boolean>;
  isDeleting?: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const columnHelper = createColumnHelper<AdminLockerResponse>();

// Unified icon wrapper
const IconWrapper = ({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "indigo" | "green" | "red" | "amber";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-500",
  };
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}
    >
      {children}
    </div>
  );
};

// Truncated text with tooltip
const TruncatedText = ({
  text,
  maxLength = 25,
  className = "",
}: {
  text?: string | null;
  maxLength?: number;
  className?: string;
}) => {
  if (!text || text.length <= maxLength)
    return <span className={className}>{text || "—"}</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>
            {text.slice(0, maxLength)}...
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Backend: ACTIVE / INACTIVE / MAINTENANCE + PLANNED / INSTALLING / COMMISSIONING khi đang lắp đặt
// (không có DISCONNECTED) — giá trị lạ dùng nhãn thô
const getStatusBadge = (status: LockerStatus, t: (key: string) => string) => {
  const variants: Partial<Record<
    LockerStatus,
    {
      bg: string;
      text: string;
      border: string;
      icon: React.ElementType;
      label: string;
    }
  >> = {
    [LockerStatus.ACTIVE]: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-500/20",
      icon: CheckCircle2,
      label: t("admin.lockers.status.active"),
    },
    [LockerStatus.INACTIVE]: {
      bg: "bg-secondary",
      text: "text-muted-foreground",
      border: "border-border",
      icon: XCircle,
      label: t("admin.lockers.status.inactive"),
    },
    [LockerStatus.MAINTENANCE]: {
      bg: "bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-500/20",
      icon: Wrench,
      label: t("admin.lockers.status.maintenance"),
    },
    [LockerStatus.PLANNED]: {
      bg: "bg-sky-500/10",
      text: "text-sky-700 dark:text-sky-400",
      border: "border-sky-500/20",
      icon: Hammer,
      label: t("admin.lockers.status.planned"),
    },
    [LockerStatus.INSTALLING]: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-700 dark:text-indigo-400",
      border: "border-indigo-500/20",
      icon: Hammer,
      label: t("admin.lockers.status.installing"),
    },
    [LockerStatus.COMMISSIONING]: {
      bg: "bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-500/20",
      icon: ClipboardCheck,
      label: t("admin.lockers.status.commissioning"),
    },
  };

  const variant = variants[status] ?? {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    border: "border-border",
    icon: XCircle,
    label: (status as string) || "—",
  };
  const Icon = variant.icon;

  return (
    <Badge
      className={`${variant.bg} ${variant.text} ${variant.border} font-medium text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1.5`}
      variant="outline"
    >
      <Icon className="h-3 w-3" />
      {variant.label}
    </Badge>
  );
};

export function LockerTable({
  lockers,
  isLoading,
  onMaintenanceSuccess,
  onActivate,
  onDelete,
  onDeleteBatch,
  onDeleteAll,
  isDeleting,
  page,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange,
}: LockerTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [selectedLockerIds, setSelectedLockerIds] = useState<number[]>([]);
  const [deleteSingleTarget, setDeleteSingleTarget] = useState<AdminLockerResponse | null>(null);
  const [maintenanceTarget, setMaintenanceTarget] = useState<AdminLockerResponse | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const allCurrentPageSelected =
    lockers.length > 0 && lockers.every((l) => selectedLockerIds.includes(l.id));
  const someCurrentPageSelected =
    lockers.some((l) => selectedLockerIds.includes(l.id)) && !allCurrentPageSelected;

  const closeDeleteDialogs = () => {
    setDeleteSingleTarget(null);
    setShowBatchDeleteConfirm(false);
    setShowDeleteAllConfirm(false);
  };

  const handleConfirmDelete = async (reason: string) => {
    let ok = false;
    if (deleteSingleTarget && onDelete) {
      ok = await onDelete(deleteSingleTarget.id, reason);
      if (ok) setSelectedLockerIds((prev) => prev.filter((id) => id !== deleteSingleTarget.id));
    } else if (showBatchDeleteConfirm && onDeleteBatch) {
      ok = await onDeleteBatch(selectedLockerIds, reason);
      if (ok) setSelectedLockerIds([]);
    } else if (showDeleteAllConfirm && onDeleteAll) {
      ok = await onDeleteAll(reason);
      if (ok) setSelectedLockerIds([]);
    }
    if (ok) closeDeleteDialogs();
  };

  const columns = [
    columnHelper.display({
      id: "select",
      header: () => (
        <Checkbox
          checked={allCurrentPageSelected ? true : someCurrentPageSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            if (checked) {
              const set = new Set(selectedLockerIds);
              lockers.forEach((l) => set.add(l.id));
              setSelectedLockerIds(Array.from(set));
            } else {
              const pageIds = new Set(lockers.map((l) => l.id));
              setSelectedLockerIds(selectedLockerIds.filter((id) => !pageIds.has(id)));
            }
          }}
          aria-label={t("common.a11y.selectAll")}
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedLockerIds.includes(row.original.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedLockerIds((prev) => [...prev, row.original.id]);
            } else {
              setSelectedLockerIds((prev) => prev.filter((id) => id !== row.original.id));
            }
          }}
          aria-label={t("common.batchDelete.selectRow")}
          className="translate-y-[2px]"
        />
      ),
    }),

    columnHelper.accessor("code", {
      header: t("admin.lockers.columns.code"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <IconWrapper color="blue">
            <Box size={18} />
          </IconWrapper>
          <div className="min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-mono font-semibold text-foreground text-sm cursor-help">
                    {row.original.code}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{row.original.code}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-sm text-muted-foreground font-medium truncate max-w-[150px]">
              {row.original.name}
            </p>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("storeName", {
      header: t("admin.lockers.columns.store"),
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <IconWrapper color="indigo">
            <Store size={16} />
          </IconWrapper>
          <div className="min-w-0 pt-0.5">
            <TruncatedText
              text={row.original.storeName}
              maxLength={20}
              className="font-medium text-foreground"
            />
            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
              <MapPin size={14} className="flex-shrink-0 text-muted-foreground/70" />
              <TruncatedText
                text={row.original.address}
                maxLength={25}
                className=""
              />
            </div>
          </div>
        </div>
      ),
    }),

    columnHelper.accessor("status", {
      header: t("admin.lockers.columns.status"),
      cell: ({ row }) => getStatusBadge(row.original.status, t),
    }),

    // Chưa gán ⇒ phiếu sự cố mới của tủ báo mọi KTV tủ
    columnHelper.accessor("assignedTechnicianName", {
      header: t("admin.lockers.columns.technician"),
      cell: ({ row }) => {
        const { assignedTechnicianId, assignedTechnicianName } = row.original;
        const displayName =
          typeof assignedTechnicianName === "string" && !assignedTechnicianName.startsWith("KTV #")
            ? assignedTechnicianName
            : (assignedTechnicianId != null
                ? t("admin.lockers.table.technicianId", { id: assignedTechnicianId })
                : null);
        const anchor = row.index === 0 ? "adm-lockers-first-row-tech" : undefined; // neo data-tour dòng đầu
        return assignedTechnicianId != null ? (
          <Link
            to={`/admin/technicians/${assignedTechnicianId}`}
            onClick={(e) => e.stopPropagation()}
            data-tour={anchor}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            <UserCheck size={14} className="text-primary flex-shrink-0" />
            <span>{displayName}</span>
          </Link>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  data-tour={anchor}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 cursor-help"
                >
                  {t("common.unassigned")}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("admin.lockers.table.unassignedBroadcast")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    }),

    columnHelper.accessor("totalBoxes", {
      header: t("admin.lockers.columns.boxes"),
      cell: ({ row }) => {
        const availableBoxes = row.original.availableBoxes ?? 0;
        const totalBoxes = row.original.totalBoxes ?? 0;

        // Tủ bảo trì / vô hiệu: server trả availableBoxes = 0 ⇒ không suy ra "đang dùng", chỉ ghi số ô + trạng thái
        const anchor = row.index === 0 ? "adm-lockers-first-row-boxes" : undefined; // neo data-tour dòng đầu
        if (row.original.status !== LockerStatus.ACTIVE) {
          return (
            <div className="flex flex-col gap-0.5 w-32" data-tour={anchor}>
              <span className="text-sm font-semibold text-foreground/80">{t("admin.lockers.table.boxCount", { count: totalBoxes })}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.status === LockerStatus.MAINTENANCE
                  ? t("admin.lockers.table.underMaintenance")
                  : row.original.status === LockerStatus.INACTIVE
                    ? t("admin.lockers.table.disabled")
                    : row.original.status === LockerStatus.PLANNED ||
                        row.original.status === LockerStatus.INSTALLING ||
                        row.original.status === LockerStatus.COMMISSIONING
                      ? t(`admin.lockers.status.${row.original.status.toLowerCase()}`)
                      : row.original.status || "—"}{" "}
                {t("admin.lockers.table.notAcceptingOrders")}
              </span>
            </div>
          );
        }

        const availablePercent =
          totalBoxes > 0 ? (availableBoxes / totalBoxes) * 100 : 0;
        const toneText =
          availablePercent > 50
            ? "text-green-600"
            : availablePercent > 20
              ? "text-amber-500"
              : "text-red-500";
        const toneBar =
          availablePercent > 50
            ? "bg-green-500"
            : availablePercent > 20
              ? "bg-amber-500"
              : "bg-red-500";

        return (
          <div className="flex flex-col gap-1.5 w-32" data-tour={anchor}>
            <span className="text-sm">
              <span className={`font-semibold ${toneText}`}>{t("admin.lockers.table.availableCount", { count: availableBoxes })}</span>
              <span className="text-muted-foreground"> / {t("admin.lockers.table.boxCount", { count: totalBoxes })}</span>
            </span>
            <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${toneBar}`}
                style={{ width: `${availablePercent}%` }}
              />
            </div>
          </div>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: t("common.actions"),
      cell: ({ row }) => {
        const locker = row.original;
        const first = row.index === 0;
        return (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  data-tour={first ? "adm-lockers-first-row-menu" : undefined}
                >
                  <MoreHorizontal size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-popover border border-border/50"
                data-tour={first ? "adm-lockers-row-menu" : undefined}
              >
                <DropdownMenuItem
                  onClick={() => navigate(`/admin/lockers/${locker.id}`)}
                  className="cursor-pointer"
                  data-tour={first ? "adm-lockers-first-row-view" : undefined}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t("dropdown.viewDetail")}
                </DropdownMenuItem>
                {locker.status === LockerStatus.ACTIVE && (
                  <DropdownMenuItem
                    onClick={() => setMaintenanceTarget(locker)}
                    className="cursor-pointer text-amber-600 focus:text-amber-600"
                    data-tour={first ? "adm-lockers-row-status" : undefined}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    {t("dropdown.maintenance")}
                  </DropdownMenuItem>
                )}
                {(locker.status === LockerStatus.INACTIVE ||
                  locker.status === LockerStatus.MAINTENANCE) && (
                  <DropdownMenuItem
                    onClick={() => onActivate(locker.id)}
                    className="cursor-pointer text-green-600 focus:text-green-600"
                    data-tour={first ? "adm-lockers-row-status" : undefined}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    {t("dropdown.activate")}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteSingleTarget(locker)}
                      className="cursor-pointer text-destructive focus:text-destructive"
                      data-tour={first ? "adm-lockers-row-delete" : undefined}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("admin.lockers.batch.deleteLocker")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4">
      {/* Batch and Bulk Delete Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border border-border/60" data-tour="adm-lockers-batch-bar">
        <div className="flex items-center gap-2">
          {selectedLockerIds.length > 0 ? (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-medium">
              <span>{t("admin.lockers.batch.selectedCount", { count: selectedLockerIds.length })}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs hover:bg-destructive/20 text-destructive"
                onClick={() => setSelectedLockerIds([])}
              >
                {t("common.batchDelete.clear")}
              </Button>
              {onDeleteBatch && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs font-semibold shadow-xs"
                  disabled={isDeleting}
                  onClick={() => setShowBatchDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {t("admin.lockers.batch.deleteSelected")}
                </Button>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Box size={14} className="text-muted-foreground/70" />
              {t("admin.lockers.batch.hint")}
            </span>
          )}
        </div>

        {onDeleteAll && totalElements > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-xs font-semibold"
            disabled={isDeleting}
            onClick={() => setShowDeleteAllConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {t("admin.lockers.batch.deleteAllLockers")}
          </Button>
        )}
      </div>

      <div data-tour="adm-lockers-table">
        <DataTable
          columns={columns}
          data={lockers}
          isLoading={isLoading}
          emptyMessage={t("common.noData")}
          serverPagination={{
            pageIndex: page,
            pageSize,
            pageCount: totalPages,
            totalRows: totalElements,
            onPageChange,
            onPageSizeChange,
          }}
        />
      </div>

      <DeleteReasonDialog
        open={Boolean(deleteSingleTarget) || showBatchDeleteConfirm || showDeleteAllConfirm}
        onOpenChange={(open) => !open && closeDeleteDialogs()}
        title={
          deleteSingleTarget
            ? t("admin.lockers.batch.deleteSingleTitle", { code: deleteSingleTarget.code })
            : showDeleteAllConfirm
              ? t("admin.lockers.batch.deleteAllLockersTitle")
              : t("admin.lockers.batch.deleteSelectedTitle", { count: selectedLockerIds.length })
        }
        description={
          <p>
            {deleteSingleTarget
              ? t("admin.lockers.batch.deleteSingleDesc", {
                  name: deleteSingleTarget.name,
                  code: deleteSingleTarget.code,
                })
              : showDeleteAllConfirm
                ? t("admin.lockers.batch.deleteAllLockersDesc", { total: totalElements })
                : t("admin.lockers.batch.deleteSelectedDesc", { count: selectedLockerIds.length })}
          </p>
        }
        note={t("admin.lockers.tools.table.protectWarning")}
        actionLabel={
          deleteSingleTarget
            ? t("admin.lockers.batch.deleteLocker")
            : showDeleteAllConfirm
              ? t("admin.lockers.batch.deleteAllLockers")
              : t("admin.lockers.batch.deleteSelected")
        }
        loading={isDeleting}
        onConfirm={(reason) => void handleConfirmDelete(reason)}
      />

      <LockerMaintenanceDialog
        open={Boolean(maintenanceTarget)}
        onOpenChange={(open) => !open && setMaintenanceTarget(null)}
        locker={maintenanceTarget}
        onSuccess={onMaintenanceSuccess}
      />
    </div>
  );
}

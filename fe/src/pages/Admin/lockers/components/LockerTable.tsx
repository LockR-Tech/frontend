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
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { DataTable } from "~/components/shared/data-table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { LockerStatus } from "~/types/admin/enums";
import type { AdminLockerResponse } from "~/types/admin/locker";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface LockerTableProps {
  lockers: AdminLockerResponse[];
  isLoading: boolean;
  onMaintenance: (lockerId: number) => void;
  onActivate: (lockerId: number) => void;
  onDelete?: (lockerId: number) => Promise<boolean>;
  onDeleteBatch?: (lockerIds: number[]) => Promise<boolean>;
  onDeleteAll?: () => Promise<boolean>;
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

// Backend chỉ có ACTIVE / INACTIVE / MAINTENANCE (không có DISCONNECTED) — giá trị lạ dùng nhãn thô
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
  onMaintenance,
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
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const allCurrentPageSelected =
    lockers.length > 0 && lockers.every((l) => selectedLockerIds.includes(l.id));
  const someCurrentPageSelected =
    lockers.some((l) => selectedLockerIds.includes(l.id)) && !allCurrentPageSelected;

  const handleConfirmSingleDelete = async () => {
    if (!deleteSingleTarget || !onDelete) return;
    const ok = await onDelete(deleteSingleTarget.id);
    if (ok) {
      setSelectedLockerIds((prev) => prev.filter((id) => id !== deleteSingleTarget.id));
      setDeleteSingleTarget(null);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (!selectedLockerIds.length || !onDeleteBatch) return;
    const ok = await onDeleteBatch(selectedLockerIds);
    if (ok) {
      setSelectedLockerIds([]);
      setShowBatchDeleteConfirm(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (!onDeleteAll) return;
    const ok = await onDeleteAll();
    if (ok) {
      setSelectedLockerIds([]);
      setShowDeleteAllConfirm(false);
    }
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
          aria-label="Select all"
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
          aria-label="Select row"
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
        return assignedTechnicianId != null ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <UserCheck size={14} className="text-indigo-600 flex-shrink-0" />
            {assignedTechnicianName ?? t("admin.lockers.table.technicianId", { id: assignedTechnicianId })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("common.unassigned")}</span>
        );
      },
    }),

    columnHelper.accessor("totalBoxes", {
      header: t("admin.lockers.columns.boxes"),
      cell: ({ row }) => {
        const availableBoxes = row.original.availableBoxes ?? 0;
        const totalBoxes = row.original.totalBoxes ?? 0;

        // Tủ bảo trì / vô hiệu: server trả availableBoxes = 0 ⇒ không suy ra "đang dùng", chỉ ghi số ô + trạng thái
        if (row.original.status !== LockerStatus.ACTIVE) {
          return (
            <div className="flex flex-col gap-0.5 w-32">
              <span className="text-sm font-semibold text-foreground/80">{t("admin.lockers.table.boxCount", { count: totalBoxes })}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.status === LockerStatus.MAINTENANCE
                  ? t("admin.lockers.table.underMaintenance")
                  : row.original.status === LockerStatus.INACTIVE
                    ? t("admin.lockers.table.disabled")
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
          <div className="flex flex-col gap-1.5 w-32">
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
        return (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                >
                  <MoreHorizontal size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-popover border border-border/50"
              >
                <DropdownMenuItem
                  onClick={() => navigate(`/admin/lockers/${locker.id}`)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t("dropdown.viewDetail")}
                </DropdownMenuItem>
                {locker.status === LockerStatus.ACTIVE && (
                  <DropdownMenuItem
                    onClick={() => onMaintenance(locker.id)}
                    className="cursor-pointer text-amber-600 focus:text-amber-600"
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
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("admin.lockers.batch.deleteLocker", "Xóa tủ")}
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
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
                {t("button.deselectAll", "Bỏ chọn")}
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
                  {t("admin.lockers.batch.deleteSelected", "Xóa các tủ đã chọn")}
                </Button>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Box size={14} className="text-muted-foreground/70" />
              {t("admin.lockers.batch.hint", "Chọn ô bên trái từng tủ để xóa hàng loạt")}
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
            {t("admin.lockers.batch.deleteAllLockers", "Xóa tất cả tủ")}
          </Button>
        )}
      </div>

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

      {/* Confirmation Dialog: Delete Single Locker */}
      <Dialog
        open={Boolean(deleteSingleTarget)}
        onOpenChange={(open) => !open && setDeleteSingleTarget(null)}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t("admin.lockers.batch.deleteSingleTitle", {
                code: deleteSingleTarget?.code,
              })}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                <p>
                  {t("admin.lockers.batch.deleteSingleDesc", {
                    name: deleteSingleTarget?.name,
                    code: deleteSingleTarget?.code,
                  })}
                </p>
                <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-lg border">
                  {t(
                    "admin.lockers.batch.protectWarning",
                    "Lưu ý: Nếu có ô con đang chứa đơn hàng của khách, hệ thống sẽ bảo vệ và từ chối xóa tủ."
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteSingleTarget(null)}
              disabled={isDeleting}
            >
              {t("button.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSingleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("common.deleting", "Đang xóa...")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("admin.lockers.batch.deleteLocker", "Xóa tủ")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Batch Delete Selected Lockers */}
      <Dialog
        open={showBatchDeleteConfirm}
        onOpenChange={setShowBatchDeleteConfirm}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t("admin.lockers.batch.deleteSelectedTitle", {
                count: selectedLockerIds.length,
              })}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                <p>
                  {t("admin.lockers.batch.deleteSelectedDesc", {
                    count: selectedLockerIds.length,
                  })}
                </p>
                <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-lg border">
                  {t(
                    "admin.lockers.batch.protectWarning",
                    "Lưu ý: Nếu có ô con đang chứa đơn hàng của khách, hệ thống sẽ bảo vệ và từ chối xóa tủ."
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBatchDeleteConfirm(false)}
              disabled={isDeleting}
            >
              {t("button.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBatchDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("common.deleting", "Đang xóa...")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("admin.lockers.batch.deleteSelected", "Xóa các tủ đã chọn")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Delete ALL Lockers */}
      <Dialog
        open={showDeleteAllConfirm}
        onOpenChange={setShowDeleteAllConfirm}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t("admin.lockers.batch.deleteAllLockersTitle")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                <p>
                  {t("admin.lockers.batch.deleteAllLockersDesc", {
                    total: totalElements,
                  })}
                </p>
                <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-lg border">
                  {t(
                    "admin.lockers.batch.protectWarning",
                    "Lưu ý: Nếu có ô con đang chứa đơn hàng của khách, hệ thống sẽ bảo vệ và từ chối xóa tủ."
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllConfirm(false)}
              disabled={isDeleting}
            >
              {t("button.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteAll}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("common.deleting", "Đang xóa...")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("admin.lockers.batch.deleteAllLockers", "Xóa tất cả tủ")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

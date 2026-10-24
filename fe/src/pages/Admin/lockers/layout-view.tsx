import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Box as BoxIcon,
  CheckCircle2,
  Plane,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Unlock,
  Wrench,
  Luggage,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  UserCheck,
  QrCode,
  Sliders,
  Monitor,
  DoorOpen,
  DoorClosed,
  Trash2,
  Layers,
  LayoutGrid,
  MapPin,
  ExternalLink,
  PackageSearch,
} from "lucide-react";
import {
  isXlCell,
  isDroneCell,
  isDoorOpen,
  normalizeBoxSize,
} from "~/lib/lockerLayoutHelper";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  useGetLockerLayoutQuery,
  useReportBoxFaultMutation,
  useClearBoxFaultMutation,
  useSetBoxOutOfServiceMutation,
  useSetBoxCleaningMutation,
  useReturnBoxToServiceMutation,
  useForceOpenBoxMutation,
  useAddBoxMutation,
  useAddBoxesBatchMutation,
  useDeleteBoxMutation,
  useDeleteBoxesBatchMutation,
  useDeleteAllBoxesMutation,
  useGetStaffLockerQuery,
  useAssignLockerTechnicianMutation,
  useGetAllAdminReportsQuery,
  useGetGatewaysQuery,
  useUpdateBoxMutation,
  type CellResponse,
  type LockerReportResponse,
} from "~/stores/apis/admin/lockerOps";
import { useSearchAdminOrdersQuery } from "~/stores/apis/admin/orders";
import type { AdminOrder } from "~/types/admin/reporting";
import { MetaBadge } from "~/components/shared/reporting/MetaBadge";
import { orderStatusMeta, orderTypeMeta } from "~/components/shared/reporting/report-meta";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";
import { useWebSocket } from "@/hooks/useWebSocket";
import { GatewayPanel } from "./components/GatewayPanel";
import { LockerLogsPanel } from "./components/LockerLogsPanel";
import { EditBoxModal } from "./components/EditBoxModal";
import { BoxQrModal } from "./components/BoxQrModal";
import { BoxOpenQrSheet } from "./components/BoxOpenQrSheet";
import { LockerBluetoothPanel } from "./components/LockerBluetoothPanel";
import { KioskScreenModal } from "./components/KioskScreenModal";
import { LockerAddBoxPreview } from "./components/LockerAddBoxPreview";
import { LockerLocationModal } from "./components/LockerLocationModal";

// Nhãn trạng thái tủ — cùng câu chữ với admin.lockers.status (messages/vi.json)
const LOCKER_STATUS_STYLE: Record<string, { labelKey: string; cls: string }> = {
  ACTIVE: { labelKey: "admin.lockers.status.active", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  INACTIVE: { labelKey: "admin.lockers.status.inactive", cls: "bg-secondary border-border text-muted-foreground" },
  MAINTENANCE: { labelKey: "admin.lockers.status.maintenance", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
};

// Tủ MAINTENANCE/INACTIVE bị server từ chối đặt ô (LOCKER_NOT_ACTIVE)
const SUSPENDED_LOCKER_STATUSES = ["MAINTENANCE", "INACTIVE"];

const NO_TECHNICIAN = "NONE";

// Đơn còn giữ ô — khớp `LockerOrderRepository.findActiveByBoxId` (mọi trạng thái trừ
// COMPLETED/CANCELED/EXPIRED; RETURNED là giá trị cũ còn sót).
const OPEN_ORDER_STATUSES = ["INITIALIZED", "STORING", "AWAITING_DISPATCH", "RETURNED"];
// Trần `AdminOrderQueryService.MAX_PAGE_SIZE` — lớn hơn là server trả 400 và không có đơn nào.
const OPEN_ORDERS_PAGE_SIZE = 100;

/** Ô mà đơn đang giữ: ô gửi/nhận, hoặc ô đã giữ chỗ trước khi bỏ hàng. */
function orderBoxIds(order: AdminOrder): number[] {
  return [order.sendBoxId, order.receiveBoxId, order.reservedBoxId].filter(
    (boxId): boxId is number => boxId != null,
  );
}

/** Trang chi tiết đúng loại đơn: đơn drone có màn riêng. */
function orderDetailPath(order: AdminOrder) {
  return order.type === "DRONE_DELIVERY" ? `/admin/drone-orders/${order.id}` : `/admin/orders/${order.id}`;
}

// user-service /api/admin/users lọc theo `role` (khớp chuỗi con) ⇒ chỉ tải KTV tủ.
// PageableRequest của users slice chưa khai báo `role` nên truyền qua hằng thay vì object literal.
const TECHNICIAN_USERS_QUERY = { page: 0, size: 1000, role: "LOCKER_TECHNICIAN" };

const STATUS_STYLE: Record<string, { labelKey: string; cls: string }> = {
  AVAILABLE: { labelKey: "admin.lockers.boxStatus.available", cls: "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400" },
  RESERVED: { labelKey: "admin.lockers.boxStatus.reserved", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
  OCCUPIED: { labelKey: "admin.lockers.boxStatus.occupied", cls: "bg-secondary border-border text-foreground" },
  FAULT: { labelKey: "admin.lockers.boxStatus.fault", cls: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" },
  // Khách báo sự cố: tạm ngưng cấp ô, chủ đồ vẫn mở được — chờ KTV xác nhận (FAULT) hoặc từ chối phiếu.
  PENDING_CHECK: { labelKey: "admin.lockers.boxStatus.pendingCheck", cls: "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400" },
  OUT_OF_SERVICE: { labelKey: "admin.lockers.boxStatus.outOfService", cls: "bg-secondary/40 border-border text-muted-foreground" },
  CLEANING: { labelKey: "admin.lockers.boxStatus.cleaning", cls: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400" },
};

type BoxActionType = "FORCE_OPEN" | "FAULT" | "OUT_OF_SERVICE" | "CLEANING" | "RETURN" | "CLEAR_FAULT" | "DELETE_BOX";

interface BoxActionDialogState {
  open: boolean;
  cell: CellResponse | null;
  type: BoxActionType;
  title: string;
  description: string;
  reason: string;
  requireReason?: boolean;
  confirmLabel: string;
  variant?: "default" | "destructive";
}

function CellTile({
  cell,
  orders,
  openReports,
  onAction,
  onEdit,
  onShowQr,
  onShowOrders,
  busy,
}: {
  cell: CellResponse;
  /** Đơn còn giữ ô này (thường 0 hoặc 1). */
  orders: AdminOrder[];
  /** Phiếu sự cố chưa xử lý xong của ô — khách báo qua đơn thì ô vẫn OCCUPIED. */
  openReports: LockerReportResponse[];
  onAction: (cell: CellResponse, type: BoxActionType) => void;
  onEdit: (cell: CellResponse) => void;
  onShowQr: (cell: CellResponse) => void;
  onShowOrders: (cell: CellResponse) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const isXl = isXlCell(cell);
  const isDrone = isDroneCell(cell);
  const doorOpen = isDoorOpen(cell);
  const hasOrder = orders.length > 0;
  const hasOpenReport = openReports.length > 0;
  // Lý do lấy từ ô (admin/KTV báo hỏng) hoặc từ phiếu (khách báo qua đơn).
  const reportReason = cell.faultReason ? null : openReports.find((r) => r.description)?.description ?? null;

  let bgClass = "bg-card";
  let borderClass = "border-border";
  let textClass = "text-foreground";
  let statusBadge = (
    <span className="text-xs font-medium z-10">
      {STATUS_STYLE[cell.status] ? t(STATUS_STYLE[cell.status].labelKey) : cell.status}
    </span>
  );

  // Kiểu riêng của ô Drone / vali XL chỉ dùng khi ô trống hoặc hỏng; trạng thái khác
  // (đang dùng, đã đặt, tạm ngưng, vệ sinh) hiển thị như ô thường để không báo sai "sẵn sàng".
  if (isDrone && cell.status === "FAULT") {
    bgClass = "bg-rose-100/90 dark:bg-rose-950/60";
    borderClass = "border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/30";
    textClass = "text-rose-950 dark:text-rose-100";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 z-10">
        <AlertTriangle className="w-3.5 h-3.5" /> {t("admin.lockers.cell.faultDrone")}
      </span>
    );
  } else if (isDrone && cell.status === "AVAILABLE") {
    bgClass = "bg-indigo-50/90 dark:bg-indigo-950/60";
    borderClass = "border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-400/30 shadow-xs";
    textClass = "text-indigo-950 dark:text-indigo-100";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300 z-10">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> {t("admin.lockers.cell.readyForDrone")}
      </span>
    );
  } else if (isXl && cell.status === "FAULT") {
    bgClass = "bg-rose-50/95 dark:bg-rose-950/50";
    borderClass = "border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/30 shadow-xs";
    textClass = "text-rose-950 dark:text-rose-100";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 z-10">
        <AlertTriangle className="w-3.5 h-3.5" /> {t("admin.lockers.cell.faultXl")}
      </span>
    );
  } else if (isXl && cell.status === "AVAILABLE") {
    bgClass = "bg-cyan-50/90 dark:bg-cyan-950/60";
    borderClass = "border-cyan-300 dark:border-cyan-600 shadow-xs";
    textClass = "text-cyan-950 dark:text-cyan-100";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300 z-10">
        <span className="w-2 h-2 rounded-full bg-cyan-500" /> {t("admin.lockers.cell.emptyXl")}
      </span>
    );
  } else {
    switch (cell.status) {
      case "AVAILABLE":
        bgClass = "bg-sky-50/90 dark:bg-sky-950/60";
        borderClass = "border-sky-300 dark:border-sky-700 hover:border-sky-400 shadow-xs";
        textClass = "text-sky-950 dark:text-sky-100";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-300 z-10">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> {t("admin.lockers.cell.emptyReady")}
          </span>
        );
        break;
      case "OCCUPIED":
      case "IN_USE":
        bgClass = "bg-slate-100/90 dark:bg-slate-800/80";
        borderClass = "border-slate-300 dark:border-slate-600 shadow-xs";
        textClass = "text-slate-800 dark:text-slate-200";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 z-10">
            <span className="w-2 h-2 rounded-full bg-slate-500" /> {t("admin.lockers.cell.holdingItems")}
          </span>
        );
        break;
      case "RESERVED":
        bgClass = "bg-amber-50/90 dark:bg-amber-950/50";
        borderClass = "border-amber-300 dark:border-amber-700 shadow-xs";
        textClass = "text-amber-950 dark:text-amber-100";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 z-10">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> {t("admin.lockers.cell.reserved")}
          </span>
        );
        break;
      case "FAULT":
        bgClass = "bg-rose-50/95 dark:bg-rose-950/50";
        borderClass = "border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/30 shadow-xs";
        textClass = "text-rose-950 dark:text-rose-100";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 z-10">
            <AlertTriangle className="w-3.5 h-3.5" /> {t("admin.lockers.cell.faulty")}
          </span>
        );
        break;
      case "PENDING_CHECK":
        bgClass = "bg-orange-50/95 dark:bg-orange-950/50";
        borderClass = "border-orange-400 dark:border-orange-700 ring-1 ring-orange-400/30 shadow-xs";
        textClass = "text-orange-950 dark:text-orange-100";
        statusBadge = (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400 z-10"
            title={t("admin.lockers.cell.pendingCheckHint")}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> {t("admin.lockers.cell.pendingCheck")}
          </span>
        );
        break;
      case "CLEANING":
      case "OUT_OF_SERVICE":
      default:
        bgClass = "bg-slate-200/70 dark:bg-slate-800/70";
        borderClass = "border-slate-300 dark:border-slate-600 shadow-xs";
        textClass = "text-slate-800 dark:text-slate-200";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 z-10">
            <Ban className="w-3.5 h-3.5" /> {t("admin.lockers.boxStatus.suspended")}
          </span>
        );
        break;
    }
  }

  // Viền cảnh báo khi cửa mở; ô có phiếu sự cố mà vẫn đang dùng thì viền đỏ như app.
  const doorRingClass = doorOpen
    ? "ring-2 ring-amber-400 border-amber-400 dark:border-amber-500 shadow-md shadow-amber-400/20"
    : hasOpenReport && cell.status !== "FAULT" && cell.status !== "PENDING_CHECK"
      ? "ring-2 ring-rose-400/60 border-rose-400 dark:border-rose-600"
      : "";

  return (
    <div
      className={`relative h-full rounded-xl border p-3.5 flex flex-col gap-1 overflow-hidden shadow-xs hover:shadow-md transition-all ${bgClass} ${borderClass} ${doorRingClass} ${textClass}`}
      title={cell.faultReason ?? undefined}
    >
      {/* Decorative handle */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-border/80 rounded-full" />
      
      <div className="flex items-start justify-between gap-2 z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm tracking-tight">{t("admin.lockers.boxLabel", { number: cell.boxNumber })}</span>
          {isDrone && (
            <>
              <Badge className="bg-indigo-600 text-white border-0 text-[10px] font-bold px-1.5 py-0 h-4">
                Drone
              </Badge>
              {cell.arucoMarkerId !== null && cell.arucoMarkerId !== undefined ? (
                <Badge className="bg-sky-700 text-white border-0 text-[10px] font-bold px-1.5 py-0 h-4 font-mono shadow-xs">
                  ArUco #{cell.arucoMarkerId}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-[9px] font-semibold px-1 py-0 h-4">
                  Chưa gán ArUco
                </Badge>
              )}
            </>
          )}
          {isXl && (
            <Badge className="bg-cyan-600 text-white border-0 text-[10px] font-bold px-1.5 py-0 h-4">
              {t("admin.lockers.cell.xlBadge")}
            </Badge>
          )}
          {/* Badge trạng thái cửa mở/đóng đồng bộ Mobile */}
          {doorOpen ? (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400 font-bold text-[10px] px-1.5 py-0 h-4.5 flex items-center gap-1 animate-pulse">
              <DoorOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" /> {t("admin.lockers.cell.doorOpen")}
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 px-1 py-0.5 bg-background/50 rounded border border-border/40">
              <DoorClosed className="w-2.5 h-2.5 text-slate-400" /> {t("admin.lockers.cell.doorClosed")}
            </span>
          )}
        </div>
        {/* Góc phải: [QR][loại ô] / [⋯ thao tác khác] nằm ngay dưới QR cho dễ bấm */}
        <div className="grid grid-cols-[auto_auto] items-center justify-items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded"
            title={t("admin.lockers.cell.qrTooltip")}
            onClick={(e) => {
              e.stopPropagation();
              onShowQr(cell);
            }}
          >
            <QrCode className="w-3.5 h-3.5" />
          </Button>
          {isDrone && <Plane className="w-5 h-5 text-indigo-600 dark:text-indigo-400 opacity-95 drop-shadow-xs" />}
          {isXl && <Luggage className="w-5 h-5 text-cyan-600 dark:text-cyan-400 opacity-90" />}
          {!isDrone && !isXl && <BoxIcon className="w-5 h-5 text-sky-700 dark:text-sky-300 opacity-80" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0 border border-slate-300/80 dark:border-slate-600 bg-white/95 dark:bg-slate-800 hover:bg-white text-slate-700 dark:text-slate-200"
                disabled={busy}
                title={t("admin.lockers.cell.moreActions")}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => onShowQr(cell)} className="cursor-pointer font-medium">
                <QrCode className="w-3.5 h-3.5 mr-2 text-primary" /> {t("admin.lockers.cell.qrAndLabel")}
              </DropdownMenuItem>
              {isDrone && (
                <DropdownMenuItem onClick={() => onShowQr(cell)} className="cursor-pointer font-medium text-sky-600 dark:text-sky-400">
                  <Plane className="w-3.5 h-3.5 mr-2 text-sky-500" />
                  {cell.arucoMarkerId !== null && cell.arucoMarkerId !== undefined
                    ? `Mã ArUco #${cell.arucoMarkerId}`
                    : "Gán mã ArUco Drone"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(cell)} className="cursor-pointer font-medium">
                <Sliders className="w-3.5 h-3.5 mr-2 text-indigo-600" /> {t("admin.lockers.cell.editFunction")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {cell.status === "AVAILABLE" && (
                <>
                  <DropdownMenuItem onClick={() => onAction(cell, "OUT_OF_SERVICE")} className="cursor-pointer">
                    <Ban className="w-3.5 h-3.5 mr-2 text-slate-500" /> {t("admin.lockers.cell.suspendUse")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction(cell, "CLEANING")} className="cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-500" /> {t("admin.lockers.cell.sendToCleaning")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAction(cell, "FAULT")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                    <Wrench className="w-3.5 h-3.5 mr-2" /> {t("admin.lockers.cell.reportFault")}
                  </DropdownMenuItem>
                </>
              )}
              {(cell.status === "OCCUPIED" || cell.status === "RESERVED") && (
                <>
                  <DropdownMenuItem onClick={() => onAction(cell, "FAULT")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                    <Wrench className="w-3.5 h-3.5 mr-2" /> {t("admin.lockers.cell.reportFault")}
                  </DropdownMenuItem>
                </>
              )}
              {(cell.status === "FAULT" || cell.status === "PENDING_CHECK") && (
                <>
                  <DropdownMenuItem onClick={() => onAction(cell, "FORCE_OPEN")} className="cursor-pointer">
                    <Unlock className="w-3.5 h-3.5 mr-2 text-slate-500" /> {t("admin.lockers.cell.forceOpen")}
                  </DropdownMenuItem>
                </>
              )}
              {cell.status === "PENDING_CHECK" && (
                <DropdownMenuItem onClick={() => onAction(cell, "FAULT")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                  <Wrench className="w-3.5 h-3.5 mr-2" /> {t("admin.lockers.cell.reportFault")}
                </DropdownMenuItem>
              )}
              {(cell.status === "OUT_OF_SERVICE" || cell.status === "CLEANING") && (
                <>
                  <DropdownMenuItem onClick={() => onAction(cell, "FORCE_OPEN")} className="cursor-pointer">
                    <Unlock className="w-3.5 h-3.5 mr-2 text-slate-500" /> {t("admin.lockers.cell.forceOpen")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction(cell, "FAULT")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                    <Wrench className="w-3.5 h-3.5 mr-2" /> {t("admin.lockers.cell.reportFault")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onAction(cell, "DELETE_BOX")}
                disabled={cell.status === "OCCUPIED" || cell.status === "RESERVED" || busy}
                className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-600 font-medium"
                title={cell.status === "OCCUPIED" || cell.status === "RESERVED" ? t("admin.lockers.cell.cannotDelete") : undefined}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> {t("admin.lockers.cell.deleteBox")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {statusBadge}
      {hasOpenReport && (
        <Link
          to={`/admin/maintenance?reportId=${openReports[0].id}`}
          className="z-10 mt-0.5 inline-flex items-center gap-1 self-start rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
          title={openReports.map((r) => `RPT-${r.id}: ${r.title}`).join("\n")}
        >
          <AlertTriangle className="w-3 h-3" />
          {t("admin.lockers.cell.openReports", { reports: openReports.map((r) => `RPT-${r.id}`).join(", ") })}
        </Link>
      )}
      {(cell.faultReason || reportReason) && (
        <span className="text-[11px] leading-tight line-clamp-2 mt-1 z-10 text-red-600 dark:text-red-400">
          {cell.faultReason ?? t("admin.lockers.cell.reportReason", { reason: reportReason })}
        </span>
      )}

      {/* Đơn đang giữ ô: sáng khi có đơn, mờ khi ô trống — bấm để xem mã đơn */}
      <div className="mt-auto pt-2 z-10">
        <Button
          size="sm"
          variant="outline"
          className={`h-6 px-2 text-[10px] font-semibold shadow-2xs ${
            hasOrder
              ? "border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800"
              : "border-slate-300/80 dark:border-slate-600 bg-white/95 dark:bg-slate-800 text-slate-500"
          }`}
          disabled={!hasOrder}
          onClick={() => onShowOrders(cell)}
        >
          <PackageSearch className="w-3 h-3 mr-1" />
          {hasOrder && orders.length > 1
            ? t("admin.lockers.cell.holdingOrdersCount", { count: orders.length })
            : t("admin.lockers.cell.holdingOrder")}
        </Button>
      </div>

      {/* Clean, ergonomic action controls */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 z-10">
        {cell.status === "FAULT" || cell.status === "PENDING_CHECK" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-semibold border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs"
            disabled={busy}
            onClick={() => onAction(cell, "CLEAR_FAULT")}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> {t("admin.lockers.cell.restoreBox")}
          </Button>
        ) : cell.status === "OUT_OF_SERVICE" || cell.status === "CLEANING" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-semibold border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 shadow-2xs"
            disabled={busy}
            onClick={() => onAction(cell, "RETURN")}
          >
            <RotateCcw className="w-3 h-3 mr-1" /> {t("admin.lockers.cell.restore")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-semibold border border-slate-300/80 dark:border-slate-600 bg-white/95 dark:bg-slate-800 hover:bg-white text-slate-800 dark:text-slate-100 shadow-2xs"
            disabled={busy}
            onClick={() => onAction(cell, "FORCE_OPEN")}
          >
            <Unlock className="w-3 h-3 mr-1" /> {t("admin.lockers.cell.forceOpen")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Ô nằm ở cột Kiosk (cột 1: hàng 2 trở xuống dưới màn hình 7 inch), hoặc cột 0 legacy */
function isKioskColumnCell(cell: CellResponse) {
  return (cell.colIndex == null || cell.colIndex <= 1) && (cell.rowIndex == null || cell.rowIndex <= 1);
}

/** Chỗ ô được gán trên lưới (cột ≤ 0 hoặc thiếu ⇒ cột 1, dưới màn hình Kiosk). */
function baseSlot(cell: CellResponse) {
  const col = cell.colIndex != null && cell.colIndex > 0 ? cell.colIndex : 1;
  const row = cell.rowIndex ?? 1;
  return { row, col };
}

function occupiedSlots(cells: CellResponse[]) {
  return new Set(cells.map((c) => {
    const { row, col } = baseSlot(c);
    return `${row}:${col}`;
  }));
}

/**
 * Số hàng ô chiếm khi vẽ. Ô vali XL được vẽ cao hơn (2 hàng; ở cột 1 từ hàng 2 thì kéo hết
 * chiều cao dưới màn hình 7 inch) nhưng CHỈ khi các chỗ bên dưới còn trống. Tủ thật có ô XL
 * cùng cỡ cửa với ô thường (lưới đều, ô bên dưới đã có chủ) thì vẽ đúng một ô — trước đây
 * luôn kéo 2 hàng nên đè lên ô bên dưới dù dữ liệu hàng/cột đúng.
 */
function rowSpanOf(cell: CellResponse, occupied: Set<string>, maxRows: number) {
  if (!isXlCell(cell)) return 1;
  const { row, col } = baseSlot(cell);
  const wanted = col === 1 && row === 2 ? Math.max(1, maxRows - 1) : 2;
  let span = 1;
  while (span < wanted && !occupied.has(`${row + span}:${col}`)) span += 1;
  return span;
}

function getBoxGridStyle(cell: CellResponse, rowSpan: number) {
  const { row, col } = baseSlot(cell);
  return {
    gridColumn: `${col}`,
    gridRow: rowSpan > 1 ? `${row} / span ${rowSpan}` : `${row}`,
  };
}

interface OverlapGroup {
  boxNumbers: number[];
  kiosk: boolean;
}

/** Các nhóm ô bị vẽ chồng lên nhau: cùng ô lưới hoặc trùng Màn hình Kiosk (1, 1). */
function findOverlappingBoxes(cells: CellResponse[], maxRows: number): OverlapGroup[] {
  const slots = new Map<string, number[]>();
  const put = (key: string, boxNumber: number) => {
    const list = slots.get(key);
    if (list) list.push(boxNumber);
    else slots.set(key, [boxNumber]);
  };
  // Cùng cách tính chiều cao với lúc vẽ: chỉ còn báo chồng khi hai ô thật sự gán trùng chỗ.
  const occupied = occupiedSlots(cells);
  for (const cell of cells) {
    const { row, col } = baseSlot(cell);
    if (row === 1 && col === 1) {
      put("kiosk_screen", cell.boxNumber);
    }
    const span = rowSpanOf(cell, occupied, maxRows);
    for (let r = row; r < row + span; r += 1) {
      put(`${r}:${col}`, cell.boxNumber);
    }
  }
  const groups = new Map<string, OverlapGroup>();
  for (const [key, list] of slots) {
    const boxNumbers = [...new Set(list)].sort((a, b) => a - b);
    if (key === "kiosk_screen") {
      groups.set("kiosk_screen", { boxNumbers, kiosk: true });
    } else if (boxNumbers.length >= 2) {
      groups.set(boxNumbers.join(","), { boxNumbers, kiosk: false });
    }
  }
  return [...groups.values()];
}

export default function LockerLayoutPage() {
  const { lockerId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const id = Number(lockerId);
  const { data, isLoading, isFetching, refetch } = useGetLockerLayoutQuery(id, {
    skip: !Number.isFinite(id),
    pollingInterval: 15000,
  });
  const [reportFault, { isLoading: faulting }] = useReportBoxFaultMutation();
  const [clearFault, { isLoading: clearing }] = useClearBoxFaultMutation();
  const [outOfService, { isLoading: oosing }] = useSetBoxOutOfServiceMutation();
  const [updateBox] = useUpdateBoxMutation();
  const [cleaning, { isLoading: cleaningBusy }] = useSetBoxCleaningMutation();
  const [returnToService, { isLoading: returning }] = useReturnBoxToServiceMutation();
  const [forceOpen, { isLoading: forceOpening }] = useForceOpenBoxMutation();
  const [addBox, { isLoading: isAddingBox }] = useAddBoxMutation();
  const [addBoxesBatch, { isLoading: isAddingBoxesBatch }] = useAddBoxesBatchMutation();
  const [deleteBox, { isLoading: isDeletingBox }] = useDeleteBoxMutation();
  const [deleteBoxesBatch, { isLoading: isDeletingBatch }] = useDeleteBoxesBatchMutation();
  const [showDeleteAllBoxesModal, setShowDeleteAllBoxesModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [pendingBox, setPendingBox] = useState<number | null>(null);

  const handleDeleteAllBoxes = async () => {
    if (!id || !cells.length) return;
    setIsDeletingAll(true);
    try {
      const boxIds = cells.map((c) => c.id);
      // Gọi batch-delete đã có sẵn trên backend
      const res = await deleteBoxesBatch({ lockerId: id, data: { boxIds } }).unwrap();
      const count = res?.data?.deletedCount ?? cells.length;
      toast.success(t("admin.lockers.layout.deleteAllSuccess", { count }));
      setShowDeleteAllBoxesModal(false);
      refetch();
    } catch (err: any) {
      // Fallback: nếu batch-delete bị lỗi, xóa từng ô bằng deleteBox (đã có sẵn trên backend)
      try {
        await Promise.all(cells.map((c) => deleteBox(c.id).unwrap()));
        toast.success(t("admin.lockers.layout.deleteAllSuccess", { count: cells.length }));
        setShowDeleteAllBoxesModal(false);
        refetch();
      } catch (fallbackErr: any) {
        toast.error(
          fallbackErr?.data?.message || err?.data?.message || fallbackErr?.message || err?.message || t("admin.lockers.layout.deleteAllFailed", "Không thể xóa tất cả ô tủ")
        );
      }
    } finally {
      setIsDeletingAll(false);
    }
  };

  const { subscribe } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (!subscribe) return;
    const subNotif = subscribe<any>("/topic/notifications", (msg) => {
      if (
        (msg?.type === "LOCKER_LAYOUT_UPDATED" ||
          msg?.type === "LOCKER_BOX_FAULT" ||
          msg?.type === "DOOR_STATUS_CHANGED" ||
          msg?.type === "DOOR_OPENED" ||
          msg?.type === "DOOR_CLOSED" ||
          msg?.type === "BOX_STATUS_CHANGED" ||
          msg?.type === "HARDWARE_EVENT") &&
        (!msg?.lockerId || Number(msg?.lockerId) === id)
      ) {
        refetch();
        toast.info(msg?.message || t("admin.lockers.layout.toast.layoutUpdated"));
      }
    });

    const subLockers = subscribe<any>("/topic/lockers", (msg) => {
      if (!msg?.lockerId || Number(msg?.lockerId) === id) {
        refetch();
      }
    });

    const subSpecific = subscribe<any>(`/topic/lockers/${id}`, () => {
      refetch();
    });

    return () => {
      subNotif?.unsubscribe();
      subLockers?.unsubscribe();
      subSpecific?.unsubscribe();
    };
  }, [subscribe, id, refetch, t]);

  // KTV phụ trách tủ: phiếu mới của tủ chỉ gửi cho người này; chưa gán ⇒ báo mọi KTV tủ
  const { data: staffLockerData, refetch: refetchStaffLocker } = useGetStaffLockerQuery(id, { skip: !Number.isFinite(id) });
  const staffLocker = staffLockerData?.data;
  const [assignLockerTechnician, { isLoading: savingTechnician }] = useAssignLockerTechnicianMutation();
  const { data: usersData } = useGetAllUsersQuery(TECHNICIAN_USERS_QUERY);
  const lockerTechnicians = useMemo(
    () =>
      extractList<any>(usersData?.data)
        .filter((u) => {
          const roles: string[] = u.roles ?? [];
          return roles.includes("LOCKER_TECHNICIAN") || roles.includes("ROLE_LOCKER_TECHNICIAN");
        })
        .map((u) => ({
          id: u.id as number,
          name: (u.fullName || u.name || t("admin.lockers.table.technicianId", { id: u.id })) as string,
          phone: (u.phoneNumber || "") as string,
          active: u.enabled !== false,
        })),
    [usersData, t],
  );
  const assignedTechId = staffLocker?.assignedTechnicianId ?? null;
  const assignedTechName =
    staffLocker?.assignedTechnicianName ??
    lockerTechnicians.find((tech) => tech.id === assignedTechId)?.name ??
    (assignedTechId != null ? t("admin.lockers.table.technicianId", { id: assignedTechId }) : null);
  const currentTechValue = assignedTechId != null ? String(assignedTechId) : NO_TECHNICIAN;
  // null = chưa chỉnh ⇒ bám theo giá trị server
  const [techChoice, setTechChoice] = useState<string | null>(null);
  const selectedTechValue = techChoice ?? currentTechValue;

  const handleSaveTechnician = async () => {
    const technicianId = selectedTechValue === NO_TECHNICIAN ? null : Number(selectedTechValue);
    try {
      const res = await assignLockerTechnician({ lockerId: id, technicianId }).unwrap();
      setTechChoice(null);
      if (technicianId == null) {
        toast.success(t("admin.lockers.layout.tech.unassignedToast"), {
          description: t("admin.lockers.layout.tech.unassignedToastDesc"),
        });
      } else {
        const name =
          res.data?.assignedTechnicianName ??
          lockerTechnicians.find((tech) => tech.id === technicianId)?.name ??
          t("admin.lockers.table.technicianId", { id: technicianId });
        toast.success(t("admin.lockers.layout.tech.assignedToast", { name }), {
          description: t("admin.lockers.layout.tech.assignedToastDesc"),
        });
      }
    } catch (err: any) {
      toast.error(t("admin.lockers.layout.tech.saveFailed"), {
        description: err?.data?.message || err?.message || t("common.pleaseRetry"),
      });
    }
  };

  // Phiếu báo hỏng của admin không có người nhận ⇒ server định tuyến theo KTV phụ trách tủ
  const faultRoutingText = !staffLocker
    ? t("admin.lockers.layout.routing.byTechnician")
    : assignedTechId != null
      ? t("admin.lockers.layout.routing.toTechnician", { name: assignedTechName })
      : t("admin.lockers.layout.routing.allTechnicians");

  // Phiếu đang chặn cả tủ (chỉ cần khi tủ đang bảo trì)
  const lockerStatus = data?.data?.status ?? staffLocker?.status ?? "";
  // Tải luôn (không chỉ khi tủ bảo trì): ô có phiếu khách báo qua đơn vẫn OCCUPIED,
  // chỉ phiếu mới cho biết ô đang hỏng như app khách thấy.
  const { data: reportsData } = useGetAllAdminReportsQuery(undefined, {
    skip: !Number.isFinite(id),
    pollingInterval: 30000,
  });
  const blockingReports = useMemo(
    () =>
      (reportsData?.data ?? []).filter(
        (r) => r.lockerId === id && r.blocksLocker && r.status !== "RESOLVED" && r.status !== "REJECTED",
      ),
    [reportsData, id],
  );

  const openReportsByBox = useMemo(() => {
    const byBox = new Map<number, LockerReportResponse[]>();
    for (const r of reportsData?.data ?? []) {
      if (r.lockerId !== id || r.boxId == null || r.status === "RESOLVED" || r.status === "REJECTED") continue;
      byBox.set(r.boxId, [...(byBox.get(r.boxId) ?? []), r]);
    }
    return byBox;
  }, [reportsData, id]);

  // Đơn còn mở của tủ (tủ gửi/nhận hoặc tủ đích drone) — gom theo ô đang giữ.
  const { data: openOrdersData } = useSearchAdminOrdersQuery(
    { lockerId: id, status: OPEN_ORDER_STATUSES, size: OPEN_ORDERS_PAGE_SIZE, sort: "createdAt,desc" },
    { skip: !Number.isFinite(id), pollingInterval: 15000 },
  );
  const ordersByBox = useMemo(() => {
    const byBox = new Map<number, AdminOrder[]>();
    for (const order of openOrdersData?.data?.content ?? []) {
      for (const boxId of new Set(orderBoxIds(order))) {
        byBox.set(boxId, [...(byBox.get(boxId) ?? []), order]);
      }
    }
    return byBox;
  }, [openOrdersData]);
  const [ordersCell, setOrdersCell] = useState<CellResponse | null>(null);
  const ordersCellOrders = ordersCell ? ordersByBox.get(ordersCell.id) ?? [] : [];

  // Modal State for Adding Box(es)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "batch">("single");
  const [newBoxNumber, setNewBoxNumber] = useState<number | "">("");
  const [newCellType, setNewCellType] = useState<string>("STANDARD");
  const [newSize, setNewSize] = useState<string>("M");
  const [newRowIndex, setNewRowIndex] = useState<number>(2);
  const [newColIndex, setNewColIndex] = useState<number>(1);
  // Batch box creation state
  const [batchMethod, setBatchMethod] = useState<"list" | "range">("list");
  const [batchNumbersText, setBatchNumbersText] = useState<string>("");
  const [batchStartNumber, setBatchStartNumber] = useState<number>(1);
  const [batchCount, setBatchCount] = useState<number>(6);
  const [batchStartRow, setBatchStartRow] = useState<number>(2);
  const [batchStartCol, setBatchStartCol] = useState<number>(1);
  const [batchColsPerRow, setBatchColsPerRow] = useState<number>(4);

  // Modal State for Editing Box Functionality
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCell, setEditingCell] = useState<CellResponse | null>(null);

  // Modal State for Box QR Code & Printing
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrCell, setSelectedQrCell] = useState<CellResponse | null>(null);
  // Tờ QR mở ô để thử tủ (quét là ô bật ra, không cần đơn)
  const [showOpenQrSheet, setShowOpenQrSheet] = useState(false);

  // Modal State for 7-inch Touch Screen
  const [showScreenModal, setShowScreenModal] = useState(false);

  // Modal State for Locker GPS Location Picker (Grab / Green SM style)
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Lấy trạng thái kết nối phần cứng thực tế của bộ điều khiển Kiosk (Gateway/Raspberry Pi)
  const { data: gatewaysData } = useGetGatewaysQuery(undefined, { pollingInterval: 5000 });
  const currentGateway = useMemo(
    () => gatewaysData?.data?.find((g) => g.lockerId === id) ?? null,
    [gatewaysData, id]
  );
  // Màn hình cảm ứng 7 inch gắn trực tiếp vào Raspberry Pi qua Micro-HDMI và USB Touch.
  // Khi Pi chưa cắm nguồn (Gateway mất kết nối / offline), màn hình cũng sẽ ngoại tuyến.
  const isKioskScreenOnline = Boolean(currentGateway?.online);

  const handleOpenEdit = (c: CellResponse) => {
    setEditingCell(c);
    setShowEditModal(true);
  };

  const handleOpenQr = (c: CellResponse) => {
    setSelectedQrCell(c);
    setShowQrModal(true);
  };

  const layout = data?.data;

  // Render all active cells dynamically configured by Admin
  const cells = useMemo(() => {
    if (!layout?.cells) return [];
    return layout.cells;
  }, [layout]);

  const maxRows = useMemo(() => {
    if (!cells.length) return 3;
    return Math.max(
      3,
      ...cells.map((c) => (c.rowIndex ?? 1) + (isXlCell(c) ? 1 : 0)),
    );
  }, [cells]);

  const overlapGroups = useMemo(() => findOverlappingBoxes(cells, maxRows), [cells, maxRows]);
  const occupied = useMemo(() => occupiedSlots(cells), [cells]);

  const maxCols = useMemo(() => {
    if (!cells.length) return 3;
    return Math.max(
      3,
      ...cells.map((c) => (c.colIndex != null && c.colIndex > 0 ? c.colIndex : 1)),
    );
  }, [cells]);

  // Vị trí gợi ý khi thêm ô: tìm ô trống đầu tiên (row-major), bỏ qua (1, 1) vì là Màn hình Kiosk
  const nextSlot = useMemo(() => {
    const boxNumber = cells.length ? Math.max(...cells.map((c) => c.boxNumber)) + 1 : 1;
    const colsCount = Math.max(3, maxCols);
    const rowsCount = Math.max(3, maxRows);

    const occupied = new Set<string>();
    occupied.add("1:1"); // Màn hình Kiosk cố định ở (1, 1)

    cells.forEach((c) => {
      const col = c.colIndex != null && c.colIndex > 0 ? c.colIndex : 1;
      const row = c.rowIndex ?? 1;
      occupied.add(`${row}:${col}`);
      if (isXlCell(c)) {
        occupied.add(`${row + 1}:${col}`);
      }
    });

    // Tìm ô trống đầu tiên theo thứ tự đọc (row-major) để không bị khoảng trống
    for (let r = 1; r <= rowsCount + 2; r++) {
      const startC = r === 1 ? 2 : 1;
      for (let c = startC; c <= colsCount; c++) {
        if (!occupied.has(`${r}:${c}`)) {
          return { row: r, col: c, colsPerRow: colsCount, boxNumber };
        }
      }
    }

    return { row: rowsCount + 1, col: 1, colsPerRow: colsCount, boxNumber };
  }, [cells, maxCols, maxRows]);

  const openAddModal = () => {
    setNewRowIndex(nextSlot.row);
    setNewColIndex(nextSlot.col);
    setNewBoxNumber(nextSlot.boxNumber);
    setBatchStartRow(nextSlot.row);
    setBatchStartCol(nextSlot.col);
    setBatchColsPerRow(nextSlot.colsPerRow);
    setBatchStartNumber(nextSlot.boxNumber);
    setShowAddModal(true);
  };

  // Tự sắp xếp: xếp lại các ô theo số ô, lần lượt từng hàng quanh Màn hình Kiosk (1, 1)
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [arrangeCols, setArrangeCols] = useState(3);
  const [arranging, setArranging] = useState(false);
  const arrangePlan = useMemo(() => {
    const perRow = Math.max(2, Math.min(10, Number(arrangeCols) || 3));
    const sorted = [...cells].sort((a, b) => a.boxNumber - b.boxNumber);
    const plan: { cell: CellResponse; rowIndex: number; colIndex: number }[] = [];

    // Màn hình Kiosk cố định ở (1, 1)
    // Hàng 1: các ô bắt đầu từ Cột 2 đến perRow
    // Hàng 2 trở đi: các ô xếp từ Cột 1 đến perRow
    let curRow = 1;
    let curCol = 2;

    for (const cell of sorted) {
      plan.push({ cell, rowIndex: curRow, colIndex: curCol });

      curCol++;
      if (curCol > perRow) {
        curRow++;
        curCol = 1;
      }
    }

    return plan.filter((t) => t.cell.rowIndex !== t.rowIndex || t.cell.colIndex !== t.colIndex);
  }, [cells, arrangeCols]);

  const openArrange = () => {
    setArrangeCols(Math.max(3, maxCols));
    setArrangeOpen(true);
  };

  const handleArrange = async () => {
    setArranging(true);
    let moved = 0;
    try {
      for (const step of arrangePlan) {
        await updateBox({ boxId: step.cell.id, rowIndex: step.rowIndex, colIndex: step.colIndex }).unwrap();
        moved += 1;
      }
      toast.success(t("admin.lockers.layout.arrange.done", { count: moved }));
      setArrangeOpen(false);
    } catch (err: any) {
      toast.error(t("admin.lockers.layout.arrange.stoppedAt", { index: moved + 1 }), {
        description: err?.data?.message || err?.message || t("admin.lockers.layout.arrange.updateFailed"),
      });
    } finally {
      setArranging(false);
      refetch();
    }
  };

  const parsedBatchNumbers = useMemo(() => {
    if (batchMethod === "range") {
      const start = Number(batchStartNumber) || 1;
      const count = Number(batchCount) || 0;
      if (count <= 0) return [];
      return Array.from({ length: Math.min(count, 50) }, (_, i) => start + i);
    }
    const parts = batchNumbersText.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const result: number[] = [];
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(Number);
        if (!isNaN(a) && !isNaN(b) && a <= b && b - a < 50) {
          for (let i = a; i <= b; i++) result.push(i);
        }
      } else {
        const n = Number(part);
        if (!isNaN(n) && n > 0) result.push(n);
      }
    }
    return Array.from(new Set(result));
  }, [batchMethod, batchStartNumber, batchCount, batchNumbersText]);

  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const chosenSize = normalizeBoxSize(newSize);

    if (addMode === "single") {
      if (!newBoxNumber) {
        toast.error(t("admin.lockers.boxNumberRequired"));
        return;
      }
      const targetR = Number(newRowIndex);
      const targetC = Number(newColIndex);
      if (targetR === 1 && targetC === 1) {
        toast.error("Vị trí Hàng 1, Cột 1 là Màn hình Kiosk cố định, vui lòng chọn vị trí khác!");
        return;
      }
      try {
        await addBox({
          lockerId: id,
          boxNumber: Number(newBoxNumber),
          cellType: newCellType,
          size: chosenSize,
          rowIndex: targetR,
          colIndex: targetC,
          status: "AVAILABLE",
        }).unwrap();
        toast.success(t("admin.lockers.layout.add.addedOne", { number: newBoxNumber }));
        setShowAddModal(false);
        setNewBoxNumber("");
        refetch();
      } catch (err: any) {
        toast.error(err?.data?.message || err?.message || t("admin.lockers.layout.add.addFailed"));
      }
    } else {
      if (parsedBatchNumbers.length === 0) {
        toast.error(t("admin.lockers.layout.add.listRequired"));
        return;
      }
      const startRow = Number(batchStartRow);
      const startCol = Number(batchStartCol);
      const colsPerRow = Number(batchColsPerRow);
      if (!Number.isInteger(startRow) || startRow < 1) {
        toast.error(t("admin.lockers.layout.add.startRowMin"));
        return;
      }
      if (!Number.isInteger(startCol) || startCol < 1) {
        toast.error(t("admin.lockers.layout.add.startColMin"));
        return;
      }
      if (!Number.isInteger(colsPerRow) || colsPerRow < 1) {
        toast.error(t("admin.lockers.layout.add.colsPerRowMin"));
        return;
      }
      // Ô vali XL cao 2 hàng ⇒ xuống hàng thì lùi 2 để không đè lên nhau
      const rowStep = newCellType === "XL" || chosenSize === "XL" ? 2 : 1;

      let curRow = startRow;
      let curCol = startCol;
      const boxes = parsedBatchNumbers.map((num) => {
        // Hàng 1 Cột 1 là Màn hình Kiosk cố định => Tự động chuyển sang Cột 2
        if (curRow === 1 && curCol === 1) {
          curCol = 2;
        }
        const item = {
          boxNumber: num,
          cellType: newCellType,
          size: chosenSize,
          rowIndex: curRow,
          colIndex: curCol,
          status: "AVAILABLE",
        };
        curCol++;
        // Hết số cột của hàng ⇒ quay về cột bắt đầu ở hàng kế tiếp
        if (curCol >= startCol + colsPerRow) {
          curCol = startCol === 1 && curRow + rowStep === 1 ? 2 : startCol;
          curRow += rowStep;
        }
        return item;
      });

      try {
        await addBoxesBatch({ lockerId: id, data: { boxes } }).unwrap();
      } catch (batchErr: any) {
        // Endpoint batch tạo tất cả hoặc không tạo ô nào. Chỉ khi server chưa có endpoint (404)
        // mới tạo lần lượt; lỗi khác (trùng số ô, tủ không tồn tại...) báo luôn, không tạo dở dang.
        if (batchErr?.status !== 404) {
          toast.error(batchErr?.data?.message || batchErr?.message || t("admin.lockers.layout.add.batchFailed"));
          return;
        }
        let created = 0;
        try {
          for (const box of boxes) {
            await addBox({ lockerId: id, ...box }).unwrap();
            created += 1;
          }
        } catch (err: any) {
          toast.error(t("admin.lockers.layout.add.partialFailed", { created, total: boxes.length, number: boxes[created].boxNumber }), {
            description: err?.data?.message || err?.message || t("admin.lockers.layout.add.addFailed"),
          });
          refetch();
          return;
        }
      }

      toast.success(t("admin.lockers.layout.add.addedMany", { count: boxes.length }));
      setShowAddModal(false);
      setBatchNumbersText("");
      refetch();
    }
  };

  const [actionDialog, setActionDialog] = useState<BoxActionDialogState>({
    open: false,
    cell: null,
    type: "FORCE_OPEN",
    title: "",
    description: "",
    reason: "",
    confirmLabel: t("button.confirm"),
  });

  const handleOpenAction = (cell: CellResponse, type: BoxActionType) => {
    switch (type) {
      case "FORCE_OPEN":
        setActionDialog({
          open: true,
          cell,
          type,
          title: t("admin.lockers.layout.action.forceOpenTitle", { number: cell.boxNumber }),
          description: t("admin.lockers.layout.action.forceOpenDesc"),
          reason: "",
          confirmLabel: t("admin.lockers.layout.action.forceOpenConfirm"),
          variant: "default",
        });
        break;
      case "FAULT":
        setActionDialog({
          open: true,
          cell,
          type,
          title: t("admin.lockers.layout.action.faultTitle", { number: cell.boxNumber }),
          description: t("admin.lockers.layout.action.faultDesc", { routing: faultRoutingText }),
          reason: "Khóa kẹt / không phản hồi",
          requireReason: true,
          confirmLabel: t("admin.lockers.layout.action.faultConfirm"),
          variant: "destructive",
        });
        break;
      case "OUT_OF_SERVICE":
        setActionDialog({
          open: true,
          cell,
          type,
          title: t("admin.lockers.layout.action.outOfServiceTitle", { number: cell.boxNumber }),
          description: t("admin.lockers.layout.action.outOfServiceDesc"),
          reason: "",
          confirmLabel: t("admin.lockers.layout.action.outOfServiceConfirm"),
          variant: "default",
        });
        break;
      case "CLEANING":
        setActionDialog({
          open: true,
          cell,
          type,
          title: t("admin.lockers.layout.action.cleaningTitle", { number: cell.boxNumber }),
          description: t("admin.lockers.layout.action.cleaningDesc"),
          reason: "",
          confirmLabel: t("button.confirm"),
          variant: "default",
        });
        break;
      case "RETURN":
        setActionDialog({
          open: true,
          cell,
          type,
          title: t("admin.lockers.layout.action.returnTitle", { number: cell.boxNumber }),
          description: t("admin.lockers.layout.action.returnDesc"),
          reason: "",
          confirmLabel: t("admin.lockers.layout.action.returnConfirm"),
          variant: "default",
        });
        break;
      case "CLEAR_FAULT":
        setActionDialog({
          open: true,
          cell,
          type,
          title: t("admin.lockers.layout.action.clearFaultTitle", { number: cell.boxNumber }),
          description: t("admin.lockers.layout.action.clearFaultDesc"),
          reason: "",
          confirmLabel: t("admin.lockers.layout.action.clearFaultConfirm"),
          variant: "default",
        });
        break;
      case "DELETE_BOX":
        setActionDialog({
          open: true,
          cell,
          type,
          title: t("admin.lockers.layout.action.deleteTitle", { number: cell.boxNumber }),
          description: t("admin.lockers.layout.action.deleteDesc", { number: cell.boxNumber, locker: layout?.name || "" }),
          reason: "",
          confirmLabel: t("admin.lockers.layout.action.deleteConfirm"),
          variant: "destructive",
        });
        break;
    }
  };

  const handleExecuteAction = async () => {
    const { cell, type, reason } = actionDialog;
    if (!cell) return;
    setPendingBox(cell.id);
    setActionDialog((prev) => ({ ...prev, open: false }));

    try {
      if (type === "FORCE_OPEN") {
        const res = await forceOpen(cell.id).unwrap();
        const message = typeof res.data?.message === "string" ? res.data.message : undefined;
        if (res.data?.accepted === true) {
          toast.success(t("admin.lockers.layout.action.unlocked", { number: cell.boxNumber }));
        } else if (res.data?.accepted === false) {
          // Bộ điều khiển không nhận lệnh / quá thời gian chờ ⇒ ô chưa mở
          toast.error(t("admin.lockers.layout.action.openFailed", { number: cell.boxNumber }), {
            description: message || t("admin.lockers.layout.action.openNotConfirmed"),
          });
        } else {
          toast.info(t("admin.lockers.layout.action.openSent", { number: cell.boxNumber }));
        }
      } else if (type === "FAULT") {
        await reportFault({ boxId: cell.id, reason: reason.trim() || "Khóa kẹt / không phản hồi" }).unwrap();
        toast.success(t("admin.lockers.layout.action.faultReported", { number: cell.boxNumber }), { description: faultRoutingText });
      } else if (type === "OUT_OF_SERVICE") {
        await outOfService({ boxId: cell.id, reason: reason.trim() || undefined }).unwrap();
        toast.success(t("admin.lockers.layout.action.suspended", { number: cell.boxNumber }));
      } else if (type === "CLEANING") {
        await cleaning(cell.id).unwrap();
        toast.success(t("admin.lockers.layout.action.cleaning", { number: cell.boxNumber }));
      } else if (type === "RETURN") {
        await returnToService(cell.id).unwrap();
        toast.success(t("admin.lockers.layout.action.returned", { number: cell.boxNumber }));
      } else if (type === "CLEAR_FAULT") {
        // Server đóng phiếu mở của ô (nếu có) và trả ô về trạng thái trước khi hỏng
        const res = await clearFault(cell.id).unwrap();
        const nextStatus = res.data?.status;
        toast.success(t("admin.lockers.layout.action.restored", { number: cell.boxNumber }), {
          description: nextStatus
            ? t("admin.lockers.layout.action.restoredDescWithStatus", {
                status: STATUS_STYLE[nextStatus] ? t(STATUS_STYLE[nextStatus].labelKey) : nextStatus,
              })
            : t("admin.lockers.layout.action.restoredDesc"),
        });
      } else if (type === "DELETE_BOX") {
        await deleteBox(cell.id).unwrap();
        toast.success(t("admin.lockers.layout.action.deleted", { number: cell.boxNumber }));
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || t("admin.lockers.layout.action.failed"));
    } finally {
      setPendingBox(null);
      refetch();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t("admin.lockers.layout.loading")}</div>;
  }
  if (!layout) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">{t("admin.lockers.layout.notFound", { id: lockerId })}</p>
        <Button variant="outline" onClick={() => navigate("/admin/lockers")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("button.back")}
        </Button>
      </div>
    );
  }

  const overlapLabel = overlapGroups
    .map((g) => `${g.boxNumbers.map((n) => `#${n}`).join(" & ")}${g.kiosk ? ` (${t("admin.lockers.layout.overlap.kioskColumn")})` : ""}`)
    .join("; ");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/lockers")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {layout.name} <span className="text-muted-foreground">({layout.code})</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={LOCKER_STATUS_STYLE[lockerStatus]?.cls}>
                {LOCKER_STATUS_STYLE[lockerStatus] ? t(LOCKER_STATUS_STYLE[lockerStatus].labelKey) : (lockerStatus || "—")}
              </Badge>
              {layout.landingPad && (
                <Badge className="bg-violet-100 text-violet-800 border-violet-300">
                  <Plane className="w-3 h-3 mr-1" />
                  {t("admin.lockers.layout.landingPad")} {layout.landingMarkerId ? `· ${layout.landingMarkerId}` : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowLocationModal(true)}
            className="shadow-xs border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
          >
            <MapPin className="w-4 h-4 mr-1.5 text-sky-600 dark:text-sky-400" />
            {staffLocker?.latitude != null && staffLocker?.longitude != null ? "Vị trí & Tọa độ" : "Ghim tọa độ tủ"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedQrCell(cells[0] || null);
              setShowQrModal(true);
            }}
            disabled={cells.length === 0}
            title={cells.length === 0 ? t("admin.lockers.layout.noBoxesToPrint") : undefined}
            className="shadow-xs"
          >
            <QrCode className="w-4 h-4 mr-1.5 text-primary" /> {t("admin.lockers.layout.qrAndPrint")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowOpenQrSheet(true)}
            disabled={cells.length === 0}
            className="shadow-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
          >
            <Unlock className="w-4 h-4 mr-1.5" /> {t("admin.lockers.openQr.button", "QR mở ô (thử tủ)")}
          </Button>
          <Button
            variant="outline"
            onClick={openArrange}
            disabled={cells.length === 0}
            className="shadow-xs"
          >
            <LayoutGrid className="w-4 h-4 mr-1.5 text-primary" /> {t("admin.lockers.layout.autoArrange")}
          </Button>
          <Button onClick={openAddModal} className="bg-primary text-primary-foreground shadow-xs">
            <Plus className="w-4 h-4 mr-1.5" /> {t("admin.lockers.layout.addBox")}
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-xs font-semibold"
            onClick={() => setShowDeleteAllBoxesModal(true)}
            disabled={cells.length === 0 || isDeletingAll || isDeletingBatch || isDeletingBox}
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> {t("admin.lockers.layout.deleteAllBoxes", "Xóa tất cả ô")}
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> {t("button.refresh")}
          </Button>
        </div>
      </div>

      {SUSPENDED_LOCKER_STATUSES.includes(lockerStatus) && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 flex items-start gap-3">
          <Ban className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              {t("admin.lockers.layout.suspended.title", {
                status: LOCKER_STATUS_STYLE[lockerStatus] ? t(LOCKER_STATUS_STYLE[lockerStatus].labelKey) : lockerStatus,
              })}
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              {t("admin.lockers.layout.suspended.desc")}
            </p>
            {blockingReports.length > 0 && (
              <p className="text-amber-800 dark:text-amber-300">
                {t("admin.lockers.layout.suspended.blockedBy", { reports: blockingReports.map((r) => `RPT-${r.id}`).join(", ") })}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kỹ thuật viên phụ trách */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 h-full">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("admin.lockers.columns.technician")}</p>
                <div className="text-xs text-muted-foreground mt-0.5 space-y-1">
                  {assignedTechId != null ? (
                    <>
                      <p>
                        <Trans
                          i18nKey="admin.lockers.layout.tech.routedTo"
                          values={{ name: assignedTechName }}
                          components={{
                            b: (
                              <Link
                                to={`/admin/technicians/${assignedTechId}`}
                                className="font-semibold text-primary hover:underline"
                              />
                            ),
                          }}
                        />
                      </p>
                      
                    </>
                  ) : (
                    <p>{t("admin.lockers.layout.tech.unassignedHint")}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedTechValue} onValueChange={setTechChoice} disabled={!staffLocker || savingTechnician}>
                <SelectTrigger className="w-full md:w-56 h-9 text-xs">
                  <SelectValue placeholder={t("admin.lockers.layout.tech.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TECHNICIAN}>{t("admin.lockers.layout.tech.noneOption")}</SelectItem>
                  {/* KTV đang gán có thể không nằm trong danh sách (VD tài khoản ADMIN) */}
                  {assignedTechId != null && !lockerTechnicians.some((tech) => tech.id === assignedTechId) && (
                    <SelectItem value={currentTechValue}>{assignedTechName}</SelectItem>
                  )}
                  {lockerTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={String(tech.id)} disabled={!tech.active}>
                      {tech.name} (#{tech.id}){tech.phone ? ` · ${tech.phone}` : ""}
                      {!tech.active ? ` · ${t("admin.lockers.layout.tech.locked")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 text-xs"
                onClick={handleSaveTechnician}
                disabled={!staffLocker || savingTechnician || selectedTechValue === currentTechValue}
              >
                {savingTechnician ? t("common.saving") : t("button.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vị trí & Tọa độ GPS của tủ */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 h-full">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200/60 dark:bg-sky-950/40 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Vị trí & Tọa độ GPS tủ</p>
                  {staffLocker?.latitude != null && staffLocker?.longitude != null ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0 font-medium">
                      Đã định vị
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                      Chưa có GPS
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs" title={staffLocker?.address || undefined}>
                  {staffLocker?.address || "Chưa thiết lập địa chỉ cụ thể"}
                </p>
                {staffLocker?.latitude != null && staffLocker?.longitude != null && (
                  <p className="text-[11px] font-mono text-sky-700 dark:text-sky-400 mt-0.5">
                    {staffLocker.latitude.toFixed(6)}, {staffLocker.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {staffLocker?.latitude != null && staffLocker?.longitude != null && (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  title="Mở Google Maps"
                  onClick={() => window.open(`https://www.google.com/maps?q=${staffLocker.latitude},${staffLocker.longitude}`, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs gap-1.5 border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                onClick={() => setShowLocationModal(true)}
              >
                <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                {staffLocker?.latitude != null ? "Chỉnh sửa bản đồ" : "Chọn vị trí bản đồ"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <GatewayPanel
        lockerId={id}
        cellCount={cells.length}
        highestBoxNumber={cells.reduce((max, c) => Math.max(max, c.boxNumber ?? 0), 0)}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("admin.lockers.layout.kpi.totalBoxes")}</p>
            <p className="text-2xl font-bold">{cells.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("admin.lockers.layout.kpi.emptyBoxes")}</p>
            <p className="text-2xl font-bold text-emerald-600">
              {cells.filter((c) => c.status === "AVAILABLE").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("admin.lockers.layout.kpi.inUse")}</p>
            <p className="text-2xl font-bold text-amber-600">
              {cells.filter((c) => c.status === "OCCUPIED" || c.status === "RESERVED" || c.status === "IN_USE").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("admin.lockers.layout.kpi.faultyBoxes")}</p>
            <p className="text-2xl font-bold text-destructive">
              {cells.filter((c) => c.status === "FAULT").length}
            </p>
            {cells.some((c) => c.status === "PENDING_CHECK") && (
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-0.5">
                {t("admin.lockers.layout.kpi.pendingCheckBoxes")}: {cells.filter((c) => c.status === "PENDING_CHECK").length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cảnh báo cửa đang mở (đồng bộ Mobile) */}
      {cells.some((c) => isDoorOpen(c)) && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <DoorOpen className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
            <div>
              <p className="text-xs font-bold">
                {t("admin.lockers.layout.doorWarning.title", {
                  count: cells.filter((c) => isDoorOpen(c)).length,
                  boxes: cells.filter((c) => isDoorOpen(c)).map((c) => `#${c.boxNumber}`).join(", "),
                })}
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                {t("admin.lockers.layout.doorWarning.desc")}
              </p>
            </div>
          </div>
          <Badge className="bg-amber-500 text-white font-bold text-xs px-2.5 py-0.5 animate-pulse border-0">
            {t("admin.lockers.layout.doorWarning.badge")}
          </Badge>
        </div>
      )}

      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            {t("admin.lockers.layout.gridTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {/* Cảnh báo ô lưu trùng hàng/cột: trên lưới các ô này vẽ đè lên nhau nên dễ bị bỏ sót */}
          {overlapGroups.length > 0 && (
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                    {t("admin.lockers.layout.overlap.title")}
                  </p>
                  <p className="text-amber-800 dark:text-amber-300">
                    {overlapGroups.some((g) => g.kiosk)
                      ? t("admin.lockers.layout.overlap.bodyKiosk", { groups: overlapLabel })
                      : t("admin.lockers.layout.overlap.body", { groups: overlapLabel })}
                  </p>
                </div>
              </div>
              {overlapGroups.some((g) => !g.kiosk) && (
                <Button size="sm" variant="outline" onClick={openArrange} className="shrink-0 h-8 text-xs">
                  <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> {t("admin.lockers.layout.autoArrange")}
                </Button>
              )}
            </div>
          )}
          <div
            className="grid gap-3.5 p-5 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border-2 border-slate-300/90 dark:border-slate-700 shadow-inner"
            style={{
              gridTemplateColumns: `repeat(${maxCols}, minmax(190px, 1fr))`,
              gridTemplateRows: `repeat(${maxRows}, minmax(135px, auto))`,
            }}
          >
            {/* Màn hình cảm ứng 7 inch (Waveshare 1024x600 HDMI/Touch) cố định ở hàng 1 cột 1 */}
            <div
              style={{ gridColumn: "1", gridRow: "1" }}
              className="flex flex-col h-full shadow-xs transition-all hover:shadow-md"
            >
              <div
                onClick={() => setShowScreenModal(true)}
                className={`relative h-full rounded-xl border-2 p-3.5 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md cursor-pointer transition-all group ${
                  isKioskScreenOnline
                    ? "border-slate-700/80 hover:border-sky-500 bg-slate-950"
                    : "border-slate-800 hover:border-rose-500/60 bg-slate-950/90"
                }`}
                title={
                  isKioskScreenOnline
                    ? t("admin.lockers.layout.screen.tooltipOnline")
                    : t("admin.lockers.layout.screen.tooltipOffline")
                }
              >
                {/* Gloss reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

                {/* Screen Header */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5">
                    <Monitor
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isKioskScreenOnline ? "text-sky-400" : "text-slate-400"
                      }`}
                    />
                    <span className="font-bold text-sm text-white tracking-tight">{t("admin.lockers.layout.screen.name")}</span>
                    <Badge className="bg-sky-950/80 border border-sky-500/50 text-sky-300 text-[10px] px-1.5 py-0 h-4 font-mono">
                      1024×600
                    </Badge>
                  </div>
                  {isKioskScreenOnline ? (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50" />
                      <span className="text-[11px] font-semibold text-emerald-400">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                      <span className="text-[11px] font-semibold text-rose-400">{t("common.disconnected")}</span>
                    </div>
                  )}
                </div>

                {/* Screen Mockup Body */}
                {isKioskScreenOnline ? (
                  <div className="z-10 bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center space-y-0.5 my-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-100">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Lock.R Kiosk Touch UI
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">Waveshare HDMI LCD (C) · :3002</p>
                  </div>
                ) : (
                  <div className="z-10 bg-slate-900/60 rounded-lg p-2 border border-rose-950/50 text-center space-y-0.5 my-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {t("admin.lockers.layout.screen.noPower")}
                    </div>
                    <p className="text-[10px] text-rose-400/80 font-mono">{t("admin.lockers.layout.screen.waitingPower")}</p>
                  </div>
                )}

                {/* Screen Footer Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 z-10 text-[11px]">
                  <span className={isKioskScreenOnline ? "text-slate-400" : "text-slate-500"}>
                    {isKioskScreenOnline ? t("admin.lockers.layout.screen.touch5") : t("admin.lockers.layout.screen.notPowered")}
                  </span>
                  <span
                    className={`font-medium inline-flex items-center gap-0.5 ${
                      isKioskScreenOnline
                        ? "text-sky-400 group-hover:text-sky-300"
                        : "text-rose-400 group-hover:text-rose-300"
                    }`}
                  >
                    {isKioskScreenOnline ? t("admin.lockers.layout.screen.data") : t("admin.lockers.layout.screen.specs")}
                  </span>
                </div>
              </div>
            </div>

            {cells.map((cell) => {
              const gridStyle = getBoxGridStyle(cell, rowSpanOf(cell, occupied, maxRows));
              return (
                <div
                  key={cell.id}
                  style={gridStyle}
                  className="flex flex-col h-full shadow-xs transition-all hover:shadow-md"
                >
                  <CellTile
                    cell={cell}
                    orders={ordersByBox.get(cell.id) ?? []}
                    openReports={openReportsByBox.get(cell.id) ?? []}
                    onAction={handleOpenAction}
                    onEdit={handleOpenEdit}
                    onShowQr={handleOpenQr}
                    onShowOrders={setOrdersCell}
                    busy={
                      (faulting || clearing || oosing || cleaningBusy || returning || forceOpening) &&
                      pendingBox === cell.id
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <span
              onClick={() => setShowScreenModal(true)}
              className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-md border cursor-pointer transition-colors ${
                isKioskScreenOnline
                  ? "text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-700 hover:bg-sky-100"
                  : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> {t("admin.lockers.layout.screen.name")} ({isKioskScreenOnline ? "Online" : t("common.disconnected")})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-100/90 dark:bg-indigo-950/70 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-700">
              <Plane className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> {t("admin.lockers.layout.legend.drone", { boxes: cells.filter((c) => isDroneCell(c)).map((c) => `#${c.boxNumber}`).join(', ') || t("admin.lockers.layout.legend.none") })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-800 dark:text-cyan-300 bg-cyan-100/90 dark:bg-cyan-950/70 px-2.5 py-1 rounded-md border border-cyan-300 dark:border-cyan-700">
              <Luggage className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> {t("admin.lockers.layout.legend.xl", { boxes: cells.filter((c) => isXlCell(c)).map((c) => `#${c.boxNumber}`).join(', ') || t("admin.lockers.layout.legend.none") })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-md border border-sky-300 dark:border-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> {t("admin.lockers.layout.legend.available", { boxes: cells.filter((c) => c.status === 'AVAILABLE' && !isDroneCell(c)).map((c) => `#${c.boxNumber}`).join(', ') || t("admin.lockers.layout.legend.none") })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> {t("admin.lockers.layout.legend.inUse", { boxes: cells.filter((c) => c.status === 'OCCUPIED' || c.status === 'IN_USE' || c.status === 'RESERVED').map((c) => `#${c.boxNumber}`).join(', ') || t("admin.lockers.layout.legend.none") })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-700">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> {t("admin.lockers.layout.legend.fault", { boxes: cells.filter((c) => c.status === 'FAULT').map((c) => `#${c.boxNumber}`).join(', ') || t("admin.lockers.layout.legend.none") })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 px-2.5 py-1 rounded-md border border-orange-300 dark:border-orange-700">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> {t("admin.lockers.layout.legend.pendingCheck", { boxes: cells.filter((c) => c.status === 'PENDING_CHECK').map((c) => `#${c.boxNumber}`).join(', ') || t("admin.lockers.layout.legend.none") })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-400">
              <DoorOpen className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> {t("admin.lockers.layout.legend.doorsOpen", { boxes: cells.filter((c) => isDoorOpen(c)).map((c) => `#${c.boxNumber}`).join(', ') || '0' })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700">
              <DoorClosed className="w-3.5 h-3.5 text-slate-500" /> {t("admin.lockers.layout.legend.doorsClosed", { count: cells.filter((c) => !isDoorOpen(c)).length })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Kiểm tra beacon Bluetooth của tủ và mở thử từng ô */}
      <LockerBluetoothPanel lockerId={id} lockerCode={layout.code} cells={cells} />

      {/* 1) Xem nhật ký của tủ */}
      <LockerLogsPanel lockerId={id} lockerCode={layout.code} cells={cells} gateway={currentGateway} />

      {/* Action Dialog (Replaces browser prompt/confirm) */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(isOpen) => {
          if (!isOpen) setActionDialog((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {actionDialog.type === "FAULT" && <AlertTriangle className="w-4 h-4 text-rose-600" />}
              {actionDialog.type === "FORCE_OPEN" && <Unlock className="w-4 h-4 text-indigo-600" />}
              {actionDialog.type === "OUT_OF_SERVICE" && <Ban className="w-4 h-4 text-slate-600" />}
              {actionDialog.type === "CLEANING" && <Sparkles className="w-4 h-4 text-amber-600" />}
              {actionDialog.type === "RETURN" && <RotateCcw className="w-4 h-4 text-emerald-600" />}
              {actionDialog.type === "CLEAR_FAULT" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {actionDialog.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {actionDialog.description}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.requireReason && (
            <div className="space-y-2 py-2">
              <Label htmlFor="actionReason" className="text-xs font-semibold">
                {t("admin.lockers.layout.action.reasonLabel")}
              </Label>
              <Input
                id="actionReason"
                value={actionDialog.reason}
                onChange={(e) => setActionDialog((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={t("admin.lockers.layout.action.reasonPlaceholder")}
                className="text-xs h-9"
              />
            </div>
          )}

          {actionDialog.type === "OUT_OF_SERVICE" && (
            <div className="space-y-2 py-2">
              <Label htmlFor="oosReason" className="text-xs font-semibold">
                {t("admin.lockers.layout.action.oosReasonLabel")}
              </Label>
              <Input
                id="oosReason"
                value={actionDialog.reason}
                onChange={(e) => setActionDialog((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={t("admin.lockers.layout.action.oosReasonPlaceholder")}
                className="text-xs h-9"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setActionDialog((prev) => ({ ...prev, open: false }))}
            >
              {t("button.cancel")}
            </Button>
            <Button
              type="button"
              variant={actionDialog.variant ?? "default"}
              size="sm"
              className="text-xs h-8"
              onClick={handleExecuteAction}
              disabled={
                (faulting || clearing || oosing || cleaningBusy || returning || forceOpening || isDeletingBox) ||
                (actionDialog.requireReason && !actionDialog.reason.trim())
              }
            >
              {actionDialog.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Thêm ô tủ (Hỗ trợ tạo 1 ô hoặc tạo nhiều ô cùng lúc kèm Xem trước sơ đồ trực quan như Word Table) */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleAddBox}>
            <DialogHeader className="pb-2 border-b border-border/60">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <BoxIcon className="w-5 h-5 text-primary" /> {t("admin.lockers.layout.add.title")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("admin.lockers.layout.add.description", { locker: layout?.name })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-3">
              {/* CỘT TRÁI (5/12 cols): Form nhập thông số */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <Tabs value={addMode} onValueChange={(v) => setAddMode(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single" className="flex items-center gap-1.5 text-xs">
                      <BoxIcon className="w-3.5 h-3.5" /> {t("admin.lockers.layout.add.tabSingle")}
                    </TabsTrigger>
                    <TabsTrigger value="batch" className="flex items-center gap-1.5 text-xs">
                      <Layers className="w-3.5 h-3.5" /> {t("admin.lockers.layout.add.tabBatch")}
                    </TabsTrigger>
                  </TabsList>

                  <div className="grid gap-3.5 py-3">
                    {addMode === "single" ? (
                      <>
                        <div className="grid grid-cols-4 items-center gap-3">
                          <Label htmlFor="boxNumber" className="text-right font-medium text-xs">
                            {t("admin.lockers.layout.add.boxNumber")}
                          </Label>
                          <Input
                            id="boxNumber"
                            type="number"
                            placeholder={t("admin.lockers.layout.add.boxNumberPlaceholder")}
                            value={newBoxNumber}
                            onChange={(e) => setNewBoxNumber(e.target.value ? Number(e.target.value) : "")}
                            className="col-span-3 text-xs h-9"
                            required={addMode === "single"}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                          <Label htmlFor="rowIndex" className="text-right font-medium text-xs">
                            {t("admin.lockers.layout.add.row")}
                          </Label>
                          <Input
                            id="rowIndex"
                            type="number"
                            min={1}
                            max={10}
                            value={newRowIndex}
                            onChange={(e) => setNewRowIndex(Number(e.target.value))}
                            className="col-span-3 text-xs h-9"
                            required={addMode === "single"}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                          <Label htmlFor="colIndex" className="text-right font-medium text-xs">
                            {t("admin.lockers.layout.add.col")}
                          </Label>
                          <Input
                            id="colIndex"
                            type="number"
                            min={1}
                            max={10}
                            value={newColIndex}
                            onChange={(e) => setNewColIndex(Number(e.target.value))}
                            className="col-span-3 text-xs h-9"
                            required={addMode === "single"}
                          />
                          <p className="text-[10px] text-muted-foreground col-span-3 col-start-2 leading-relaxed">
                            {t("admin.lockers.layout.add.colHint")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-5 p-1 bg-muted/30 rounded-lg border border-border/50 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="batchMethod"
                              checked={batchMethod === "list"}
                              onChange={() => setBatchMethod("list")}
                              className="accent-primary"
                            />
                            {t("admin.lockers.layout.add.methodList")}
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="batchMethod"
                              checked={batchMethod === "range"}
                              onChange={() => setBatchMethod("range")}
                              className="accent-primary"
                            />
                            {t("admin.lockers.layout.add.methodRange")}
                          </label>
                        </div>

                        {batchMethod === "list" ? (
                          <div className="grid grid-cols-4 items-start gap-3">
                            <Label htmlFor="batchList" className="text-right font-medium text-xs pt-2">
                              {t("admin.lockers.layout.add.list")}
                            </Label>
                            <div className="col-span-3 space-y-1.5">
                              <Input
                                id="batchList"
                                placeholder={t("admin.lockers.layout.add.listPlaceholder")}
                                value={batchNumbersText}
                                onChange={(e) => setBatchNumbersText(e.target.value)}
                                className="text-xs h-9"
                              />
                              <p className="text-[10px] text-muted-foreground">
                                {t("admin.lockers.layout.add.listHint")}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 items-center gap-3">
                            <Label className="text-right font-medium text-xs">{t("admin.lockers.layout.add.range")}</Label>
                            <div className="col-span-3 grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-1">{t("admin.lockers.layout.add.startNumber")}</span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={batchStartNumber}
                                  onChange={(e) => setBatchStartNumber(Number(e.target.value))}
                                  className="text-xs h-9"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground block mb-1">{t("admin.lockers.layout.add.count")}</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={batchCount}
                                  onChange={(e) => setBatchCount(Number(e.target.value))}
                                  className="text-xs h-9"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Preview box numbers */}
                        {parsedBatchNumbers.length > 0 && (
                          <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60 text-xs">
                            <div className="flex items-center justify-between mb-1.5 font-medium">
                              <span>{t("admin.lockers.layout.add.willCreate", { count: parsedBatchNumbers.length })}</span>
                              <span className="text-[10px] text-muted-foreground">{t("admin.lockers.layout.add.autoPlace")}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                              {parsedBatchNumbers.map((n) => (
                                <Badge key={n} variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                                  #{n}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-3 pt-1">
                          <Label className="text-right font-medium text-xs">{t("admin.lockers.layout.add.layout")}</Label>
                          <div className="col-span-3 grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-muted-foreground block mb-1">{t("admin.lockers.layout.add.startRow")}</span>
                              <Input
                                type="number"
                                min={1}
                                value={batchStartRow}
                                onChange={(e) => setBatchStartRow(Number(e.target.value))}
                                className="text-xs h-9"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block mb-1">{t("admin.lockers.layout.add.startCol")}</span>
                              <Input
                                type="number"
                                min={1}
                                value={batchStartCol}
                                onChange={(e) => setBatchStartCol(Number(e.target.value))}
                                className="text-xs h-9"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block mb-1">{t("admin.lockers.layout.add.colsPerRow")}</span>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={batchColsPerRow}
                                onChange={(e) => setBatchColsPerRow(Number(e.target.value))}
                                className="text-xs h-9"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Common fields */}
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label htmlFor="cellType" className="text-right font-medium text-xs">
                        {t("admin.lockers.layout.add.cellType")}
                      </Label>
                      <Select value={newCellType} onValueChange={setNewCellType}>
                        <SelectTrigger className="col-span-3 text-xs h-9">
                          <SelectValue placeholder={t("admin.lockers.layout.add.cellTypePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STANDARD">{t("admin.lockers.boxType.standard")}</SelectItem>
                          <SelectItem value="DRONE">{t("admin.lockers.boxType.drone")}</SelectItem>
                          <SelectItem value="XL">{t("admin.lockers.boxType.xl")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label htmlFor="size" className="text-right font-medium text-xs">
                        {t("admin.lockers.layout.add.size")}
                      </Label>
                      <Select value={newSize} onValueChange={setNewSize}>
                        <SelectTrigger className="col-span-3 text-xs h-9">
                          <SelectValue placeholder={t("admin.lockers.layout.add.sizePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="S">{t("admin.lockers.boxSize.small")}</SelectItem>
                          <SelectItem value="M">{t("admin.lockers.boxSize.medium")}</SelectItem>
                          <SelectItem value="L">{t("admin.lockers.boxSize.large")}</SelectItem>
                          <SelectItem value="XL">{t("admin.lockers.boxSize.xl")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Tabs>

                <DialogFooter className="pt-2 border-t border-border/60">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                    {t("button.cancel")}
                  </Button>
                  <Button type="submit" size="sm" disabled={isAddingBox || isAddingBoxesBatch}>
                    {isAddingBox || isAddingBoxesBatch
                      ? t("admin.lockers.layout.add.adding")
                      : addMode === "single"
                      ? t("admin.lockers.layout.add.submitOne")
                      : parsedBatchNumbers.length > 0
                      ? t("admin.lockers.layout.add.submitMany", { count: parsedBatchNumbers.length })
                      : t("admin.lockers.layout.addBox")}
                  </Button>
                </DialogFooter>
              </div>

              {/* CỘT PHẢI (7/12 cols): Phần xem trước trực quan như Word Table */}
              <div className="lg:col-span-7 bg-muted/20 p-3.5 rounded-xl border border-border/70 flex flex-col justify-between">
                <LockerAddBoxPreview
                  cells={cells}
                  mode={addMode}
                  newBoxNumber={newBoxNumber}
                  newRowIndex={newRowIndex}
                  newColIndex={newColIndex}
                  batchNumbers={parsedBatchNumbers}
                  batchStartRow={batchStartRow}
                  batchStartCol={batchStartCol}
                  batchColsPerRow={batchColsPerRow}
                  newCellType={newCellType}
                  newSize={newSize}
                  onSelectSlot={(r, c) => {
                    if (addMode === "single") {
                      setNewRowIndex(r);
                      setNewColIndex(c);
                    } else {
                      setBatchStartRow(r);
                      setBatchStartCol(c);
                    }
                  }}
                />
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Đơn đang giữ ô — mở từ nút "Đơn đang chứa" trên thẻ ô */}
      <Dialog open={ordersCell != null} onOpenChange={(open) => !open && setOrdersCell(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("admin.lockers.cell.ordersDialogTitle", { number: ordersCell?.boxNumber ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("admin.lockers.cell.ordersDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {ordersCellOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.lockers.cell.noOrder")}</p>
            ) : (
              ordersCellOrders.map((order) => (
                <div key={order.id} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm select-all">{order.orderCode ?? `#${order.id}`}</span>
                    <Link
                      to={orderDetailPath(order)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {t("admin.lockers.cell.viewOrder")} <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <MetaBadge meta={orderTypeMeta(order.type)} />
                    <MetaBadge meta={orderStatusMeta(order.status)} />
                  </div>
                  {(order.customer?.fullName || order.receiverName || order.receiverPhone) && (
                    <p className="text-xs text-muted-foreground">
                      {order.customer?.fullName && t("admin.lockers.cell.orderCustomer", { name: order.customer.fullName })}
                      {order.customer?.fullName && (order.receiverName || order.receiverPhone) && " · "}
                      {(order.receiverName || order.receiverPhone) &&
                        t("admin.lockers.cell.orderReceiver", {
                          name: [order.receiverName, order.receiverPhone].filter(Boolean).join(" – "),
                        })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2) Chỉnh sửa công năng tủ (ô thường, ô drone, ô vali XL...) */}
      <EditBoxModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        cell={editingCell}
        lockerName={layout.name}
        onSuccess={() => refetch()}
      />

      {/* Tự sắp xếp lại vị trí các ô theo số ô (sửa sơ đồ nhập lệch) */}
      <Dialog open={arrangeOpen} onOpenChange={(open) => !arranging && setArrangeOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.lockers.layout.arrange.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.lockers.layout.arrange.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="arrange-cols">{t("admin.lockers.layout.arrange.perRow")}</Label>
            <Input
              id="arrange-cols"
              type="number"
              min={1}
              max={10}
              value={arrangeCols}
              onChange={(e) => setArrangeCols(Number(e.target.value))}
              disabled={arranging}
            />
            <p className="text-xs text-muted-foreground">
              {arrangePlan.length === 0
                ? t("admin.lockers.layout.arrange.nothing")
                : t("admin.lockers.layout.arrange.willMove", { count: arrangePlan.length })}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArrangeOpen(false)} disabled={arranging}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleArrange} disabled={arranging || arrangePlan.length === 0}>
              {arranging ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <LayoutGrid className="w-4 h-4 mr-1.5" />}
              {t("admin.lockers.layout.arrange.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3) Hiển thị mã QR và in ấn tem nhãn dán cho từng ô tủ */}
      <BoxQrModal
        open={showQrModal}
        onOpenChange={setShowQrModal}
        cell={selectedQrCell}
        cells={cells}
        lockerId={id}
        lockerName={layout.name}
        lockerCode={layout.code}
      />

      <BoxOpenQrSheet
        open={showOpenQrSheet}
        onOpenChange={setShowOpenQrSheet}
        lockerId={id}
        lockerCode={layout.code}
        lockerName={layout.name}
        cells={cells}
      />

      {/* 4) Modal thông số & data Màn hình cảm ứng 7 inch */}
      <KioskScreenModal
        open={showScreenModal}
        onOpenChange={setShowScreenModal}
        lockerId={id}
        lockerCode={layout.code}
        isOnline={isKioskScreenOnline}
        gatewayMac={currentGateway?.macAddress}
        lastSeenAt={currentGateway?.lastSeenAt}
      />

      {/* 5) Modal xác nhận Xóa tất cả ô tủ */}
      <Dialog open={showDeleteAllBoxesModal} onOpenChange={setShowDeleteAllBoxesModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t("admin.lockers.layout.deleteAllBoxesTitle", "Xác nhận xóa tất cả ô tủ?")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                <p>
                  {t(
                    "admin.lockers.layout.deleteAllBoxesDesc",
                    "Toàn bộ {{count}} ô tủ trong trạm này sẽ bị xóa. Thao tác này không thể hoàn tác.",
                    { count: cells.length }
                  )}
                </p>
                <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-lg border">
                  {t(
                    "admin.lockers.layout.deleteAllBoxesWarning",
                    "Lưu ý: Các ô đang chứa đồ hoặc đã được khách đặt chỗ (OCCUPIED / RESERVED) sẽ được bảo vệ và không bị xóa."
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllBoxesModal(false)}
              disabled={isDeletingAll}
            >
              {t("button.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllBoxes}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("common.deleting", "Đang xóa...")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("admin.lockers.layout.deleteAllBoxesConfirm", "Xác nhận xóa tất cả")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6) Modal chọn vị trí và toạ độ GPS chuẩn Grab / Xanh SM */}
      {staffLocker && (
        <LockerLocationModal
          locker={staffLocker}
          open={showLocationModal}
          onOpenChange={setShowLocationModal}
          onSuccess={() => refetchStaffLocker?.()}
        />
      )}
    </div>
  );
}

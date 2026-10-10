import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  useGetStaffLockerQuery,
  useAssignLockerTechnicianMutation,
  useGetAllAdminReportsQuery,
  useGetGatewaysQuery,
  useUpdateBoxMutation,
  type CellResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";
import { useWebSocket } from "@/hooks/useWebSocket";
import { GatewayPanel } from "./components/GatewayPanel";
import { LockerLogsPanel } from "./components/LockerLogsPanel";
import { EditBoxModal } from "./components/EditBoxModal";
import { BoxQrModal } from "./components/BoxQrModal";
import { KioskScreenModal } from "./components/KioskScreenModal";

// Nhãn trạng thái tủ — cùng câu chữ với admin.lockers.status (messages/vi.json)
const LOCKER_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Hoạt động", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  INACTIVE: { label: "Vô hiệu", cls: "bg-secondary border-border text-muted-foreground" },
  MAINTENANCE: { label: "Bảo trì", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
};

// Tủ MAINTENANCE/INACTIVE bị server từ chối đặt ô (LOCKER_NOT_ACTIVE)
const SUSPENDED_LOCKER_STATUSES = ["MAINTENANCE", "INACTIVE"];

const NO_TECHNICIAN = "NONE";

// user-service /api/admin/users lọc theo `role` (khớp chuỗi con) ⇒ chỉ tải KTV tủ.
// PageableRequest của users slice chưa khai báo `role` nên truyền qua hằng thay vì object literal.
const TECHNICIAN_USERS_QUERY = { page: 0, size: 1000, role: "LOCKER_TECHNICIAN" };

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Sẵn sàng", cls: "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400" },
  RESERVED: { label: "Đã đặt", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
  OCCUPIED: { label: "Đang dùng", cls: "bg-secondary border-border text-foreground" },
  FAULT: { label: "Hỏng", cls: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" },
  OUT_OF_SERVICE: { label: "Ngưng dùng", cls: "bg-secondary/40 border-border text-muted-foreground" },
  CLEANING: { label: "Bảo trì", cls: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400" },
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
  onAction,
  onEdit,
  onShowQr,
  busy,
}: {
  cell: CellResponse;
  onAction: (cell: CellResponse, type: BoxActionType) => void;
  onEdit: (cell: CellResponse) => void;
  onShowQr: (cell: CellResponse) => void;
  busy: boolean;
}) {
  const isXl = isXlCell(cell);
  const isDrone = isDroneCell(cell);
  const doorOpen = isDoorOpen(cell);

  let bgClass = "bg-card";
  let borderClass = "border-border";
  let textClass = "text-foreground";
  let statusBadge = (
    <span className="text-xs font-medium z-10">
      {STATUS_STYLE[cell.status]?.label ?? cell.status}
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
        <AlertTriangle className="w-3.5 h-3.5" /> Báo hỏng (Drone)
      </span>
    );
  } else if (isDrone && cell.status === "AVAILABLE") {
    bgClass = "bg-indigo-50/90 dark:bg-indigo-950/60";
    borderClass = "border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-400/30 shadow-xs";
    textClass = "text-indigo-950 dark:text-indigo-100";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300 z-10">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Sẵn sàng nhận Drone
      </span>
    );
  } else if (isXl && cell.status === "FAULT") {
    bgClass = "bg-rose-50/95 dark:bg-rose-950/50";
    borderClass = "border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/30 shadow-xs";
    textClass = "text-rose-950 dark:text-rose-100";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 z-10">
        <AlertTriangle className="w-3.5 h-3.5" /> Báo hỏng (Vali XL)
      </span>
    );
  } else if (isXl && cell.status === "AVAILABLE") {
    bgClass = "bg-cyan-50/90 dark:bg-cyan-950/60";
    borderClass = "border-cyan-300 dark:border-cyan-600 shadow-xs";
    textClass = "text-cyan-950 dark:text-cyan-100";
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300 z-10">
        <span className="w-2 h-2 rounded-full bg-cyan-500" /> Ô trống (Vali XL)
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
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Ô trống (Sẵn sàng)
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
            <span className="w-2 h-2 rounded-full bg-slate-500" /> Đang chứa hàng
          </span>
        );
        break;
      case "RESERVED":
        bgClass = "bg-amber-50/90 dark:bg-amber-950/50";
        borderClass = "border-amber-300 dark:border-amber-700 shadow-xs";
        textClass = "text-amber-950 dark:text-amber-100";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 z-10">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Đã giữ chỗ
          </span>
        );
        break;
      case "FAULT":
        bgClass = "bg-rose-50/95 dark:bg-rose-950/50";
        borderClass = "border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/30 shadow-xs";
        textClass = "text-rose-950 dark:text-rose-100";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 z-10">
            <AlertTriangle className="w-3.5 h-3.5" /> Báo hỏng
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
            <Ban className="w-3.5 h-3.5" /> Tạm ngưng
          </span>
        );
        break;
    }
  }

  // Viền cảnh báo khi cửa mở
  const doorRingClass = doorOpen
    ? "ring-2 ring-amber-400 border-amber-400 dark:border-amber-500 shadow-md shadow-amber-400/20"
    : "";

  return (
    <div
      className={`relative h-full rounded-xl border p-3.5 flex flex-col gap-1 overflow-hidden shadow-xs hover:shadow-md transition-all ${bgClass} ${borderClass} ${doorRingClass} ${textClass}`}
      title={cell.faultReason ?? undefined}
    >
      {/* Decorative handle */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-border/80 rounded-full" />
      
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm tracking-tight">Ô #{cell.boxNumber}</span>
          {isDrone && (
            <Badge className="bg-indigo-600 text-white border-0 text-[10px] font-bold px-1.5 py-0 h-4">
              Drone
            </Badge>
          )}
          {isXl && (
            <Badge className="bg-cyan-600 text-white border-0 text-[10px] font-bold px-1.5 py-0 h-4">
              Vali XL
            </Badge>
          )}
          {/* Badge trạng thái cửa mở/đóng đồng bộ Mobile */}
          {doorOpen ? (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400 font-bold text-[10px] px-1.5 py-0 h-4.5 flex items-center gap-1 animate-pulse">
              <DoorOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Cửa mở
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 px-1 py-0.5 bg-background/50 rounded border border-border/40">
              <DoorClosed className="w-2.5 h-2.5 text-slate-400" /> Đóng
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded"
            title="Xem và in mã QR ô tủ"
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
        </div>
      </div>
      {statusBadge}
      {cell.faultReason && (
        <span className="text-[11px] leading-tight line-clamp-2 mt-1 z-10 text-red-600 dark:text-red-400">
          {cell.faultReason}
        </span>
      )}

      {/* Clean, ergonomic action controls */}
      <div className="mt-auto flex items-center justify-between gap-1.5 pt-2 z-10">
        {cell.status === "FAULT" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-semibold border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs"
            disabled={busy}
            onClick={() => onAction(cell, "CLEAR_FAULT")}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Khôi phục ô
          </Button>
        ) : cell.status === "OUT_OF_SERVICE" || cell.status === "CLEANING" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-semibold border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 shadow-2xs"
            disabled={busy}
            onClick={() => onAction(cell, "RETURN")}
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Khôi phục
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-semibold border border-slate-300/80 dark:border-slate-600 bg-white/95 dark:bg-slate-800 hover:bg-white text-slate-800 dark:text-slate-100 shadow-2xs"
            disabled={busy}
            onClick={() => onAction(cell, "FORCE_OPEN")}
          >
            <Unlock className="w-3 h-3 mr-1" /> Mở khẩn cấp
          </Button>
        )}

        {/* Dropdown for secondary actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 border border-slate-300/80 dark:border-slate-600 bg-white/95 dark:bg-slate-800 hover:bg-white text-slate-700 dark:text-slate-200"
              disabled={busy}
              title="Thao tác khác"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-xs">
            <DropdownMenuItem onClick={() => onShowQr(cell)} className="cursor-pointer font-medium">
              <QrCode className="w-3.5 h-3.5 mr-2 text-primary" /> Mã QR & In tem nhãn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(cell)} className="cursor-pointer font-medium">
              <Sliders className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Chỉnh sửa công năng
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {cell.status === "AVAILABLE" && (
              <>
                <DropdownMenuItem onClick={() => onAction(cell, "OUT_OF_SERVICE")} className="cursor-pointer">
                  <Ban className="w-3.5 h-3.5 mr-2 text-slate-500" /> Tạm ngưng dùng
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction(cell, "CLEANING")} className="cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-500" /> Đưa vào vệ sinh
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction(cell, "FAULT")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                  <Wrench className="w-3.5 h-3.5 mr-2" /> Báo hỏng ô tủ
                </DropdownMenuItem>
              </>
            )}
            {(cell.status === "OCCUPIED" || cell.status === "RESERVED") && (
              <>
                <DropdownMenuItem onClick={() => onAction(cell, "FAULT")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                  <Wrench className="w-3.5 h-3.5 mr-2" /> Báo hỏng ô tủ
                </DropdownMenuItem>
              </>
            )}
            {cell.status === "FAULT" && (
              <>
                <DropdownMenuItem onClick={() => onAction(cell, "FORCE_OPEN")} className="cursor-pointer">
                  <Unlock className="w-3.5 h-3.5 mr-2 text-slate-500" /> Mở khẩn cấp
                </DropdownMenuItem>
              </>
            )}
            {(cell.status === "OUT_OF_SERVICE" || cell.status === "CLEANING") && (
              <>
                <DropdownMenuItem onClick={() => onAction(cell, "FORCE_OPEN")} className="cursor-pointer">
                  <Unlock className="w-3.5 h-3.5 mr-2 text-slate-500" /> Mở khẩn cấp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction(cell, "FAULT")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                  <Wrench className="w-3.5 h-3.5 mr-2" /> Báo hỏng ô tủ
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction(cell, "DELETE_BOX")}
              disabled={cell.status === "OCCUPIED" || cell.status === "RESERVED" || busy}
              className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-600 font-medium"
              title={cell.status === "OCCUPIED" || cell.status === "RESERVED" ? "Không thể xóa ô đang chứa hàng hoặc đã giữ chỗ" : undefined}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Xóa ô tủ này
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Ô nằm ở cột Kiosk (cột 0: dưới màn hình 7 inch), gồm cả ô vali XL chưa có cột. */
function isKioskColumnCell(cell: CellResponse) {
  return cell.colIndex === 0 || (isXlCell(cell) && (cell.colIndex == null || cell.colIndex === 0));
}

/** Hàng/cột nhỏ nhất của các ô ngoài cột Kiosk — dùng để dồn sơ đồ về góc trên-trái như kiosk. */
interface GridOrigin {
  minRow: number;
  minCol: number;
}

function getGridOrigin(cells: CellResponse[]): GridOrigin {
  const regular = cells.filter((c) => !isKioskColumnCell(c));
  if (regular.length === 0) return { minRow: 1, minCol: 1 };
  return {
    minRow: Math.min(...regular.map((c) => c.rowIndex ?? 1)),
    minCol: Math.min(...regular.map((c) => (c.colIndex != null && c.colIndex > 0 ? c.colIndex : 1))),
  };
}

function getBoxGridStyle(cell: CellResponse, maxRows: number, origin: GridOrigin) {
  // Ô vali XL ở cột 0 trạm Kiosk: khoang dọc lớn kéo dài trọn chiều cao dưới màn hình 7 inch (hàng 2 trở xuống)
  if (isKioskColumnCell(cell)) {
    return {
      gridColumn: "1",
      gridRow: `2 / span ${Math.max(1, maxRows - 1)}`,
    };
  }

  // Các ô Tiêu chuẩn hoặc Drone: cột 1 CSS dành cho cột Kiosk / Vali XL, các cột ô khác từ cột 2.
  // Trừ hàng/cột nhỏ nhất (giống KioskScreen của iot/ui) để sơ đồ nhập lệch, vd bắt đầu ở hàng 3
  // cột 3, không để trống cả mảng lớn phía trên/bên trái.
  const col = (cell.colIndex != null && cell.colIndex > 0 ? cell.colIndex : 1) - origin.minCol + 2;
  const row = (cell.rowIndex ?? 1) - origin.minRow + 1;

  if (isXlCell(cell)) {
    return {
      gridColumn: `${col}`,
      gridRow: `${row} / span 2`,
    };
  }

  return {
    gridColumn: `${col}`,
    gridRow: `${row}`,
  };
}

interface OverlapGroup {
  boxNumbers: number[];
  /** Nhóm ở cột Kiosk — "Tự sắp xếp" không xử lý cột này. */
  kiosk: boolean;
}

/** Các nhóm ô bị vẽ chồng lên nhau: cùng ô lưới như getBoxGridStyle (vali XL chiếm 2 hàng). */
function findOverlappingBoxes(cells: CellResponse[], origin: GridOrigin): OverlapGroup[] {
  const slots = new Map<string, number[]>();
  const put = (key: string, boxNumber: number) => {
    const list = slots.get(key);
    if (list) list.push(boxNumber);
    else slots.set(key, [boxNumber]);
  };
  for (const cell of cells) {
    // Mọi ô cột Kiosk cùng vẽ vào một khoang dưới màn hình
    if (isKioskColumnCell(cell)) {
      put("kiosk", cell.boxNumber);
      continue;
    }
    const col = (cell.colIndex != null && cell.colIndex > 0 ? cell.colIndex : 1) - origin.minCol;
    const row = (cell.rowIndex ?? 1) - origin.minRow;
    put(`${row}:${col}`, cell.boxNumber);
    if (isXlCell(cell)) put(`${row + 1}:${col}`, cell.boxNumber);
  }
  const groups = new Map<string, OverlapGroup>();
  for (const [key, list] of slots) {
    const boxNumbers = [...new Set(list)].sort((a, b) => a - b);
    if (boxNumbers.length < 2) continue;
    groups.set(boxNumbers.join(","), { boxNumbers, kiosk: key === "kiosk" });
  }
  return [...groups.values()];
}

export default function LockerLayoutPage() {
  const { lockerId } = useParams();
  const navigate = useNavigate();
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
  const [pendingBox, setPendingBox] = useState<number | null>(null);

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
        toast.info(msg?.message || "Sơ đồ trạm Kiosk vừa được cập nhật");
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
  }, [subscribe, id, refetch]);

  // KTV phụ trách tủ: phiếu mới của tủ chỉ gửi cho người này; chưa gán ⇒ báo mọi KTV tủ
  const { data: staffLockerData } = useGetStaffLockerQuery(id, { skip: !Number.isFinite(id) });
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
          name: (u.fullName || u.name || `KTV #${u.id}`) as string,
          phone: (u.phoneNumber || "") as string,
          active: u.enabled !== false,
        })),
    [usersData],
  );
  const assignedTechId = staffLocker?.assignedTechnicianId ?? null;
  const assignedTechName =
    staffLocker?.assignedTechnicianName ??
    lockerTechnicians.find((t) => t.id === assignedTechId)?.name ??
    (assignedTechId != null ? `KTV #${assignedTechId}` : null);
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
        toast.success("Đã bỏ KTV phụ trách tủ", {
          description: "Phiếu sự cố mới của tủ sẽ báo cho mọi KTV tủ.",
        });
      } else {
        const name =
          res.data?.assignedTechnicianName ??
          lockerTechnicians.find((t) => t.id === technicianId)?.name ??
          `KTV #${technicianId}`;
        toast.success(`Đã giao tủ cho ${name}`, {
          description: "KTV đã được thông báo. Phiếu mới và phiếu đang chờ nhận của tủ chuyển cho KTV này.",
        });
      }
    } catch (err: any) {
      toast.error("Không lưu được KTV phụ trách", {
        description: err?.data?.message || err?.message || "Vui lòng thử lại.",
      });
    }
  };

  // Phiếu báo hỏng của admin không có người nhận ⇒ server định tuyến theo KTV phụ trách tủ
  const faultRoutingText = !staffLocker
    ? "Phiếu được định tuyến theo KTV phụ trách tủ."
    : assignedTechId != null
      ? `Phiếu gửi tới KTV phụ trách tủ: ${assignedTechName}.`
      : "Tủ chưa có KTV phụ trách — phiếu được báo cho mọi KTV tủ.";

  // Phiếu đang chặn cả tủ (chỉ cần khi tủ đang bảo trì)
  const lockerStatus = data?.data?.status ?? staffLocker?.status ?? "";
  const { data: reportsData } = useGetAllAdminReportsQuery(undefined, {
    skip: lockerStatus !== "MAINTENANCE",
  });
  const blockingReports = useMemo(
    () =>
      (reportsData?.data ?? []).filter(
        (r) => r.lockerId === id && r.blocksLocker && r.status !== "RESOLVED",
      ),
    [reportsData, id],
  );

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

  // Modal State for 7-inch Touch Screen
  const [showScreenModal, setShowScreenModal] = useState(false);

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

  const gridOrigin = useMemo(() => getGridOrigin(cells), [cells]);
  const overlapGroups = useMemo(() => findOverlappingBoxes(cells, gridOrigin), [cells, gridOrigin]);

  const maxRows = useMemo(() => {
    return Math.max(
      3,
      ...cells
        .filter((c) => !isKioskColumnCell(c))
        .map((c) => (c.rowIndex ?? 1) - gridOrigin.minRow + (isXlCell(c) ? 2 : 1)),
    );
  }, [cells, gridOrigin]);

  const maxCols = useMemo(() => {
    return Math.max(
      3,
      ...cells.map((c) =>
        isKioskColumnCell(c)
          ? 1
          : (c.colIndex != null && c.colIndex > 0 ? c.colIndex : 1) - gridOrigin.minCol + 2,
      ),
    );
  }, [cells, gridOrigin]);

  // Vị trí gợi ý khi thêm ô: hàng ngay dưới ô cuối cùng, cột đầu tiên, giữ số cột hiện có.
  const nextSlot = useMemo(() => {
    const regular = cells.filter((c) => !isKioskColumnCell(c));
    // Tính trên mọi ô, kể cả ô cột Kiosk (vd chỉ có vali XL #1) để không gợi ý số đã dùng
    const boxNumber = cells.length ? Math.max(...cells.map((c) => c.boxNumber)) + 1 : 1;
    if (regular.length === 0) return { row: 1, col: 1, colsPerRow: 4, boxNumber };
    const cols = new Set(regular.map((c) => c.colIndex ?? 1));
    return {
      row: Math.max(...regular.map((c) => (c.rowIndex ?? 1) + (isXlCell(c) ? 2 : 1))),
      col: Math.min(...cols),
      colsPerRow: Math.max(1, Math.max(...cols) - Math.min(...cols) + 1),
      boxNumber,
    };
  }, [cells]);

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

  // Tự sắp xếp: xếp lại các ô ngoài cột Kiosk theo số ô, lần lượt từng hàng, bắt đầu hàng 1 cột 1.
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [arrangeCols, setArrangeCols] = useState(3);
  const [arranging, setArranging] = useState(false);
  const arrangePlan = useMemo(() => {
    const perRow = Math.max(1, Math.min(10, Number(arrangeCols) || 1));
    const regular = cells
      .filter((c) => !isKioskColumnCell(c))
      .sort((a, b) => a.boxNumber - b.boxNumber);
    const plan: { cell: CellResponse; rowIndex: number; colIndex: number }[] = [];
    let row = 1;
    for (let i = 0; i < regular.length; i += perRow) {
      const chunk = regular.slice(i, i + perRow);
      chunk.forEach((cell, j) => plan.push({ cell, rowIndex: row, colIndex: j + 1 }));
      // Ô vali XL cao 2 hàng ⇒ hàng sau lùi xuống thêm một để không đè lên
      row += chunk.some((c) => isXlCell(c)) ? 2 : 1;
    }
    return plan.filter((t) => t.cell.rowIndex !== t.rowIndex || t.cell.colIndex !== t.colIndex);
  }, [cells, arrangeCols]);

  const openArrange = () => {
    setArrangeCols(Math.min(10, nextSlot.colsPerRow));
    setArrangeOpen(true);
  };

  const handleArrange = async () => {
    setArranging(true);
    let moved = 0;
    try {
      for (const t of arrangePlan) {
        await updateBox({ boxId: t.cell.id, rowIndex: t.rowIndex, colIndex: t.colIndex }).unwrap();
        moved += 1;
      }
      toast.success(`Đã sắp xếp lại ${moved} ô tủ`);
      setArrangeOpen(false);
    } catch (err: any) {
      toast.error(`Dừng ở ô thứ ${moved + 1}`, {
        description: err?.data?.message || err?.message || "Không cập nhật được vị trí ô tủ",
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
        toast.error("Vui lòng nhập số ô tủ!");
        return;
      }
      try {
        await addBox({
          lockerId: id,
          boxNumber: Number(newBoxNumber),
          cellType: newCellType,
          size: chosenSize,
          rowIndex: Number(newRowIndex),
          colIndex: Number(newColIndex),
          status: "AVAILABLE",
        }).unwrap();
        toast.success(`Đã thêm ô #${newBoxNumber} thành công!`);
        setShowAddModal(false);
        setNewBoxNumber("");
        refetch();
      } catch (err: any) {
        toast.error(err?.data?.message || err?.message || "Không thể thêm ô tủ mới");
      }
    } else {
      if (parsedBatchNumbers.length === 0) {
        toast.error("Vui lòng nhập danh sách số ô hợp lệ cần tạo!");
        return;
      }
      // Cột 0 (cột Kiosk) là vị trí hợp lệ ⇒ không dùng `|| mặc định` (sẽ biến 0 thành giá trị khác)
      const startRow = Number(batchStartRow);
      const startCol = Number(batchStartCol);
      const colsPerRow = Number(batchColsPerRow);
      if (!Number.isInteger(startRow) || startRow < 1) {
        toast.error("Hàng đầu phải từ 1 trở lên");
        return;
      }
      if (!Number.isInteger(startCol) || startCol < 0) {
        toast.error("Cột đầu phải từ 0 trở lên");
        return;
      }
      if (!Number.isInteger(colsPerRow) || colsPerRow < 1) {
        toast.error("Số cột mỗi hàng phải từ 1 trở lên");
        return;
      }
      // Ô vali XL cao 2 hàng ⇒ xuống hàng thì lùi 2 để không đè lên nhau
      const rowStep = newCellType === "XL" || chosenSize === "XL" ? 2 : 1;

      let curRow = startRow;
      let curCol = startCol;
      const boxes = parsedBatchNumbers.map((num) => {
        const item = {
          boxNumber: num,
          cellType: newCellType,
          size: chosenSize,
          rowIndex: curRow,
          colIndex: curCol,
          status: "AVAILABLE",
        };
        curCol++;
        // Hết số cột của hàng ⇒ quay về cột bắt đầu (không phải cột 1) ở hàng kế tiếp
        if (curCol >= startCol + colsPerRow) {
          curCol = startCol;
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
          toast.error(batchErr?.data?.message || batchErr?.message || "Không thể tạo danh sách ô tủ mới");
          return;
        }
        let created = 0;
        try {
          for (const box of boxes) {
            await addBox({ lockerId: id, ...box }).unwrap();
            created += 1;
          }
        } catch (err: any) {
          toast.error(`Đã tạo ${created}/${boxes.length} ô thì gặp lỗi ở ô #${boxes[created].boxNumber}`, {
            description: err?.data?.message || err?.message || "Không thể thêm ô tủ mới",
          });
          refetch();
          return;
        }
      }

      toast.success(`Đã thêm thành công ${boxes.length} ô tủ vào trạm!`);
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
    confirmLabel: "Xác nhận",
  });

  const handleOpenAction = (cell: CellResponse, type: BoxActionType) => {
    switch (type) {
      case "FORCE_OPEN":
        setActionDialog({
          open: true,
          cell,
          type,
          title: `Mở khẩn cấp ô #${cell.boxNumber}?`,
          description: `Gửi lệnh mở khóa trực tiếp không cần PIN khách. Thao tác này sẽ được ghi nhận vào nhật ký kiểm toán (MASTER audit log) của hệ thống IoT.`,
          reason: "",
          confirmLabel: "Xác nhận mở khóa",
          variant: "default",
        });
        break;
      case "FAULT":
        setActionDialog({
          open: true,
          cell,
          type,
          title: `Báo hỏng ô #${cell.boxNumber}`,
          description: `Đổi trạng thái ô sang HỎNG và mở phiếu sự cố (ô đã có phiếu đang mở thì gộp vào phiếu đó). ${faultRoutingText}`,
          reason: "Khóa kẹt / không phản hồi",
          requireReason: true,
          confirmLabel: "Xác nhận báo hỏng",
          variant: "destructive",
        });
        break;
      case "OUT_OF_SERVICE":
        setActionDialog({
          open: true,
          cell,
          type,
          title: `Tạm ngưng sử dụng ô #${cell.boxNumber}`,
          description: `Ô tủ sẽ tạm thời bị loại khỏi danh sách ô khả dụng (không nhận đơn đặt chỗ/gửi đồ mới).`,
          reason: "",
          confirmLabel: "Xác nhận ngưng dùng",
          variant: "default",
        });
        break;
      case "CLEANING":
        setActionDialog({
          open: true,
          cell,
          type,
          title: `Đưa ô #${cell.boxNumber} vào vệ sinh`,
          description: `Đánh dấu ô tủ đang trong quá trình khử khuẩn và vệ sinh định kỳ.`,
          reason: "",
          confirmLabel: "Xác nhận",
          variant: "default",
        });
        break;
      case "RETURN":
        setActionDialog({
          open: true,
          cell,
          type,
          title: `Khôi phục hoạt động ô #${cell.boxNumber}`,
          description: `Đưa ô tủ từ trạng thái tạm ngưng/vệ sinh trở lại SẴN SÀNG để phục vụ khách hàng.`,
          reason: "",
          confirmLabel: "Khôi phục hoạt động",
          variant: "default",
        });
        break;
      case "CLEAR_FAULT":
        setActionDialog({
          open: true,
          cell,
          type,
          title: `Xác nhận ô #${cell.boxNumber} đã hoạt động lại?`,
          description: `Đóng phiếu sự cố đang mở của ô (nếu có) và trả ô về trạng thái trước khi hỏng — ô còn hàng sẽ về "Có đồ".`,
          reason: "",
          confirmLabel: "Khôi phục ô tủ",
          variant: "default",
        });
        break;
      case "DELETE_BOX":
        setActionDialog({
          open: true,
          cell,
          type,
          title: `Xác nhận xóa ô #${cell.boxNumber}?`,
          description: `Ô tủ #${cell.boxNumber} sẽ bị xóa khỏi tủ ${layout?.name || ""}. Sơ đồ sẽ được cập nhật đồng bộ sang ứng dụng KTV và Kiosk ngay lập tức. Thao tác này không thể hoàn tác.`,
          reason: "",
          confirmLabel: "Xác nhận xóa ô",
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
          toast.success(`Đã mở khóa ô #${cell.boxNumber}`);
        } else if (res.data?.accepted === false) {
          // Bộ điều khiển không nhận lệnh / quá thời gian chờ ⇒ ô chưa mở
          toast.error(`Không mở được ô #${cell.boxNumber}`, {
            description: message || "Bộ điều khiển tủ không xác nhận lệnh mở.",
          });
        } else {
          toast.info(`Lệnh mở khẩn cấp ô #${cell.boxNumber} đã được ghi nhận và gửi đến bộ điều khiển.`);
        }
      } else if (type === "FAULT") {
        await reportFault({ boxId: cell.id, reason: reason.trim() || "Khóa kẹt / không phản hồi" }).unwrap();
        toast.success(`Đã báo hỏng ô #${cell.boxNumber}`, { description: faultRoutingText });
      } else if (type === "OUT_OF_SERVICE") {
        await outOfService({ boxId: cell.id, reason: reason.trim() || undefined }).unwrap();
        toast.success(`Đã chuyển ô #${cell.boxNumber} sang trạng thái Tạm ngưng.`);
      } else if (type === "CLEANING") {
        await cleaning(cell.id).unwrap();
        toast.success(`Đã chuyển ô #${cell.boxNumber} sang trạng thái Đang vệ sinh.`);
      } else if (type === "RETURN") {
        await returnToService(cell.id).unwrap();
        toast.success(`Ô #${cell.boxNumber} đã hoạt động sẵn sàng trở lại.`);
      } else if (type === "CLEAR_FAULT") {
        // Server đóng phiếu mở của ô (nếu có) và trả ô về trạng thái trước khi hỏng
        const res = await clearFault(cell.id).unwrap();
        const nextStatus = res.data?.status;
        toast.success(`Đã khôi phục ô #${cell.boxNumber}`, {
          description: `${nextStatus ? `Trạng thái hiện tại: ${STATUS_STYLE[nextStatus]?.label ?? nextStatus}. ` : ""}Phiếu sự cố đang mở của ô (nếu có) đã được đóng.`,
        });
      } else if (type === "DELETE_BOX") {
        await deleteBox(cell.id).unwrap();
        toast.success(`Đã xóa ô #${cell.boxNumber} thành công!`);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Thao tác không thành công");
    } finally {
      setPendingBox(null);
      refetch();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải sơ đồ tủ...</div>;
  }
  if (!layout) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Không tìm thấy tủ #{lockerId}</p>
        <Button variant="outline" onClick={() => navigate("/admin/lockers")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
        </Button>
      </div>
    );
  }

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
                {LOCKER_STATUS_STYLE[lockerStatus]?.label ?? (lockerStatus || "—")}
              </Badge>
              {layout.landingPad && (
                <Badge className="bg-violet-100 text-violet-800 border-violet-300">
                  <Plane className="w-3 h-3 mr-1" />
                  Bãi đáp drone {layout.landingMarkerId ? `· ${layout.landingMarkerId}` : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedQrCell(cells[0] || null);
              setShowQrModal(true);
            }}
            disabled={cells.length === 0}
            title={cells.length === 0 ? "Tủ chưa có ô nào để in tem" : undefined}
            className="shadow-xs"
          >
            <QrCode className="w-4 h-4 mr-1.5 text-primary" /> Mã QR & In tem
          </Button>
          <Button
            variant="outline"
            onClick={openArrange}
            disabled={cells.filter((c) => !isKioskColumnCell(c)).length === 0}
            className="shadow-xs"
          >
            <LayoutGrid className="w-4 h-4 mr-1.5 text-primary" /> Tự sắp xếp
          </Button>
          <Button onClick={openAddModal} className="bg-primary text-primary-foreground shadow-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm ô tủ
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Làm mới
          </Button>
        </div>
      </div>

      {SUSPENDED_LOCKER_STATUSES.includes(lockerStatus) && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 flex items-start gap-3">
          <Ban className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Tủ đang tạm ngưng nhận đơn ({LOCKER_STATUS_STYLE[lockerStatus]?.label ?? lockerStatus})
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              Khách không đặt được ô mới tại tủ này cho đến khi tủ hoạt động trở lại.
            </p>
            {blockingReports.length > 0 && (
              <p className="text-amber-800 dark:text-amber-300">
                {`Đang bị chặn bởi phiếu sự cố ${blockingReports.map((r) => `RPT-${r.id}`).join(", ")} — tủ tự hoạt động lại khi phiếu chặn cuối cùng được hoàn tất.`}
              </p>
            )}
          </div>
        </div>
      )}

      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">KTV phụ trách</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {assignedTechId != null ? (
                  <>
                    Phiếu sự cố mới của tủ gửi riêng cho{" "}
                    <span className="font-semibold text-foreground">{assignedTechName}</span>.
                  </>
                ) : (
                  "Chưa phân công — phiếu sự cố mới của tủ được báo cho mọi KTV tủ."
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTechValue} onValueChange={setTechChoice} disabled={!staffLocker || savingTechnician}>
              <SelectTrigger className="w-full md:w-72 h-9 text-xs">
                <SelectValue placeholder="Chọn KTV phụ trách" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TECHNICIAN}>Chưa phân công (báo tất cả KTV tủ)</SelectItem>
                {/* KTV đang gán có thể không nằm trong danh sách (VD tài khoản ADMIN) */}
                {assignedTechId != null && !lockerTechnicians.some((t) => t.id === assignedTechId) && (
                  <SelectItem value={currentTechValue}>{assignedTechName}</SelectItem>
                )}
                {lockerTechnicians.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)} disabled={!t.active}>
                    {t.name} (#{t.id}){t.phone ? ` · ${t.phone}` : ""}
                    {!t.active ? " · Đã khóa" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9"
              onClick={handleSaveTechnician}
              disabled={!staffLocker || savingTechnician || selectedTechValue === currentTechValue}
            >
              {savingTechnician ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <GatewayPanel
        lockerId={id}
        cellCount={cells.length}
        highestBoxNumber={cells.reduce((max, c) => Math.max(max, c.boxNumber ?? 0), 0)}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng số ô vật lý</p>
            <p className="text-2xl font-bold">{cells.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ô trống</p>
            <p className="text-2xl font-bold text-emerald-600">
              {cells.filter((c) => c.status === "AVAILABLE").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang dùng</p>
            <p className="text-2xl font-bold text-amber-600">
              {cells.filter((c) => c.status === "OCCUPIED" || c.status === "RESERVED" || c.status === "IN_USE").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ô hỏng</p>
            <p className="text-2xl font-bold text-destructive">
              {cells.filter((c) => c.status === "FAULT").length}
            </p>
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
                Cảnh báo an toàn: Có {cells.filter((c) => isDoorOpen(c)).length} ô đang mở cửa ({cells.filter((c) => isDoorOpen(c)).map((c) => `#${c.boxNumber}`).join(", ")})
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Cửa tủ chưa được đóng kín sau khi thao tác. Vui lòng kiểm tra hiện trường hoặc đóng cửa để tránh rủi ro mất mát hàng hóa.
              </p>
            </div>
          </div>
          <Badge className="bg-amber-500 text-white font-bold text-xs px-2.5 py-0.5 animate-pulse border-0">
            CỬA MỞ
          </Badge>
        </div>
      )}

      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Sơ đồ vật lý Kiosk (Hàng 1: Ô tiếp nhận Drone)
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
                    Có ô tủ trùng vị trí trên sơ đồ
                  </p>
                  <p className="text-amber-800 dark:text-amber-300">
                    {overlapGroups
                      .map((g) => `${g.boxNumbers.map((n) => `#${n}`).join(" & ")}${g.kiosk ? " (cột Kiosk)" : ""}`)
                      .join("; ")}{" "}
                    đang lưu cùng hàng/cột nên bị vẽ chồng lên nhau. Dùng &quot;Tự sắp xếp&quot; để xếp lại
                    các ô, hoặc sửa hàng/cột trong &quot;Chỉnh sửa công năng&quot; của từng ô
                    {overlapGroups.some((g) => g.kiosk) ? " (cột Kiosk chỉ chứa một khoang — chuyển các ô còn lại sang cột khác)" : ""}.
                  </p>
                </div>
              </div>
              {overlapGroups.some((g) => !g.kiosk) && (
                <Button size="sm" variant="outline" onClick={openArrange} className="shrink-0 h-8 text-xs">
                  <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Tự sắp xếp
                </Button>
              )}
            </div>
          )}
          <div
            className="grid gap-3.5 p-5 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border-2 border-slate-300/90 dark:border-slate-700 shadow-inner"
            style={{
              gridTemplateColumns: `minmax(180px, 1fr) repeat(${Math.max(1, maxCols - 1)}, minmax(200px, 1.25fr))`,
              gridTemplateRows: `repeat(${maxRows}, minmax(135px, auto))`,
            }}
          >
            {/* Màn hình cảm ứng 7 inch (Waveshare 1024x600 HDMI/Touch) đặt ở hàng 1 cột 1, ngay phía trên Ô #1 (Vali) */}
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
                    ? "Nhấn để xem data & thông số màn hình cảm ứng 7 inch"
                    : "Màn hình 7 inch mất kết nối (Chưa cấp nguồn Pi hoặc chưa cắm điện trạm Kiosk)"
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
                    <span className="font-bold text-sm text-white tracking-tight">Màn hình 7"</span>
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
                      <span className="text-[11px] font-semibold text-rose-400">Mất kết nối</span>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Màn hình chưa có nguồn
                    </div>
                    <p className="text-[10px] text-rose-400/80 font-mono">Chờ cắm điện trạm Kiosk...</p>
                  </div>
                )}

                {/* Screen Footer Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 z-10 text-[11px]">
                  <span className={isKioskScreenOnline ? "text-slate-400" : "text-slate-500"}>
                    {isKioskScreenOnline ? "Cảm ứng 5 điểm" : "Chưa cấp nguồn"}
                  </span>
                  <span
                    className={`font-medium inline-flex items-center gap-0.5 ${
                      isKioskScreenOnline
                        ? "text-sky-400 group-hover:text-sky-300"
                        : "text-rose-400 group-hover:text-rose-300"
                    }`}
                  >
                    {isKioskScreenOnline ? "Data màn hình →" : "Xem thông số →"}
                  </span>
                </div>
              </div>
            </div>

            {cells.map((cell) => {
              const gridStyle = getBoxGridStyle(cell, maxRows, gridOrigin);
              return (
                <div
                  key={cell.id}
                  style={gridStyle}
                  className="flex flex-col h-full shadow-xs transition-all hover:shadow-md"
                >
                  <CellTile
                    cell={cell}
                    onAction={handleOpenAction}
                    onEdit={handleOpenEdit}
                    onShowQr={handleOpenQr}
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
              <Monitor className="w-3.5 h-3.5" /> Màn hình 7" ({isKioskScreenOnline ? "Online" : "Mất kết nối"})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-100/90 dark:bg-indigo-950/70 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-700">
              <Plane className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Ô tiếp nhận Drone ({cells.filter((c) => isDroneCell(c)).map((c) => `#${c.boxNumber}`).join(', ') || 'Không'})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-800 dark:text-cyan-300 bg-cyan-100/90 dark:bg-cyan-950/70 px-2.5 py-1 rounded-md border border-cyan-300 dark:border-cyan-700">
              <Luggage className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Khoang Vali XL ({cells.filter((c) => isXlCell(c)).map((c) => `#${c.boxNumber}`).join(', ') || 'Không'})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-md border border-sky-300 dark:border-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Ô trống khả dụng ({cells.filter((c) => c.status === 'AVAILABLE' && !isDroneCell(c)).map((c) => `#${c.boxNumber}`).join(', ') || 'Không'})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Đang dùng / Đã đặt ({cells.filter((c) => c.status === 'OCCUPIED' || c.status === 'IN_USE' || c.status === 'RESERVED').map((c) => `#${c.boxNumber}`).join(', ') || 'Không'})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-700">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Ô hỏng / bảo trì ({cells.filter((c) => c.status === 'FAULT').map((c) => `#${c.boxNumber}`).join(', ') || 'Không'})
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-400">
              <DoorOpen className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Cửa đang mở ({cells.filter((c) => isDoorOpen(c)).map((c) => `#${c.boxNumber}`).join(', ') || '0'})
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700">
              <DoorClosed className="w-3.5 h-3.5 text-slate-500" /> Cửa đã đóng ({cells.filter((c) => !isDoorOpen(c)).length})
            </span>
          </div>
        </CardContent>
      </Card>

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
                Lý do thực hiện:
              </Label>
              <Input
                id="actionReason"
                value={actionDialog.reason}
                onChange={(e) => setActionDialog((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Nhập lý do (VD: Kẹt khóa, chốt không nhả, bảo trì...)"
                className="text-xs h-9"
              />
            </div>
          )}

          {actionDialog.type === "OUT_OF_SERVICE" && (
            <div className="space-y-2 py-2">
              <Label htmlFor="oosReason" className="text-xs font-semibold">
                Ghi chú lý do tạm ngưng (tùy chọn):
              </Label>
              <Input
                id="oosReason"
                value={actionDialog.reason}
                onChange={(e) => setActionDialog((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="VD: Kiểm tra mạch nguồn, chờ thay chốt..."
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
              Hủy
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

      {/* Dialog: Thêm ô tủ (Hỗ trợ tạo 1 ô hoặc tạo nhiều ô cùng lúc) */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleAddBox}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BoxIcon className="w-5 h-5 text-primary" /> Thêm ô tủ mới vào Kiosk
              </DialogTitle>
              <DialogDescription>
                Thêm một hoặc nhiều ô tủ vật lý vào {layout?.name}. Ô mới sẽ đồng bộ ngay lập tức sang ứng dụng KTV và Kiosk.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={addMode} onValueChange={(v) => setAddMode(v as any)} className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="flex items-center gap-1.5 text-xs">
                  <BoxIcon className="w-3.5 h-3.5" /> Thêm 1 ô
                </TabsTrigger>
                <TabsTrigger value="batch" className="flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5" /> Thêm nhiều ô (Hàng loạt)
                </TabsTrigger>
              </TabsList>

              <div className="grid gap-4 py-4">
                {addMode === "single" ? (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="boxNumber" className="text-right font-medium text-xs">
                        Số ô (#)
                      </Label>
                      <Input
                        id="boxNumber"
                        type="number"
                        placeholder="ví dụ: 12"
                        value={newBoxNumber}
                        onChange={(e) => setNewBoxNumber(e.target.value ? Number(e.target.value) : "")}
                        className="col-span-3"
                        required={addMode === "single"}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="rowIndex" className="text-right font-medium text-xs">
                        Hàng (Row)
                      </Label>
                      <Input
                        id="rowIndex"
                        type="number"
                        min={1}
                        max={10}
                        value={newRowIndex}
                        onChange={(e) => setNewRowIndex(Number(e.target.value))}
                        className="col-span-3"
                        required={addMode === "single"}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="colIndex" className="text-right font-medium text-xs">
                        Cột (Col)
                      </Label>
                      <Input
                        id="colIndex"
                        type="number"
                        min={0}
                        max={10}
                        value={newColIndex}
                        onChange={(e) => setNewColIndex(Number(e.target.value))}
                        className="col-span-3"
                        required={addMode === "single"}
                      />
                      <p className="text-[10px] text-muted-foreground col-span-3 col-start-2">
                        Cột 0 dành cho khoang XL (dưới màn hình 7 inch); Cột 1, 2, ... cho các ô bên cạnh
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
                        Nhập danh sách số ô
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="batchMethod"
                          checked={batchMethod === "range"}
                          onChange={() => setBatchMethod("range")}
                          className="accent-primary"
                        />
                        Tạo dải số liên tiếp
                      </label>
                    </div>

                    {batchMethod === "list" ? (
                      <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="batchList" className="text-right font-medium text-xs pt-2">
                          Danh sách ô
                        </Label>
                        <div className="col-span-3 space-y-1.5">
                          <Input
                            id="batchList"
                            placeholder="ví dụ: 3, 6, 9 hoặc 1-6"
                            value={batchNumbersText}
                            onChange={(e) => setBatchNumbersText(e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Nhập các số cách nhau bởi dấu phẩy (VD: 3, 6, 9) hoặc dải số (VD: 1-6)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-medium text-xs">Dải số</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-1">Số bắt đầu (#)</span>
                            <Input
                              type="number"
                              min={1}
                              value={batchStartNumber}
                              onChange={(e) => setBatchStartNumber(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-1">Số lượng ô</span>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={batchCount}
                              onChange={(e) => setBatchCount(Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview box numbers */}
                    {parsedBatchNumbers.length > 0 && (
                      <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60 text-xs">
                        <div className="flex items-center justify-between mb-1.5 font-medium">
                          <span>Sẽ tạo {parsedBatchNumbers.length} ô:</span>
                          <span className="text-[10px] text-muted-foreground">Tự động xếp hàng & cột</span>
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

                    <div className="grid grid-cols-4 items-center gap-4 pt-1">
                      <Label className="text-right font-medium text-xs">Bố cục ô</Label>
                      <div className="col-span-3 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-1">Hàng đầu</span>
                          <Input
                            type="number"
                            min={1}
                            value={batchStartRow}
                            onChange={(e) => setBatchStartRow(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-1">Cột đầu</span>
                          <Input
                            type="number"
                            min={0}
                            value={batchStartCol}
                            onChange={(e) => setBatchStartCol(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-1">Cột / Hàng</span>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={batchColsPerRow}
                            onChange={(e) => setBatchColsPerRow(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Common fields */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cellType" className="text-right font-medium text-xs">
                    Loại ô
                  </Label>
                  <Select value={newCellType} onValueChange={setNewCellType}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Chọn loại ô" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Tiêu chuẩn (STANDARD)</SelectItem>
                      <SelectItem value="DRONE">Tiếp nhận Drone (DRONE)</SelectItem>
                      <SelectItem value="XL">Khoang vali lớn (XL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="size" className="text-right font-medium text-xs">
                    Kích cỡ
                  </Label>
                  <Select value={newSize} onValueChange={setNewSize}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Chọn kích cỡ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">Nhỏ (S)</SelectItem>
                      <SelectItem value="M">Trung bình (M)</SelectItem>
                      <SelectItem value="L">Lớn (L)</SelectItem>
                      <SelectItem value="XL">Đặc biệt lớn (XL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isAddingBox || isAddingBoxesBatch}>
                  {isAddingBox || isAddingBoxesBatch
                    ? "Đang thêm..."
                    : addMode === "single"
                    ? "Thêm 1 ô tủ"
                    : `Thêm ${parsedBatchNumbers.length > 0 ? parsedBatchNumbers.length : ""} ô tủ`}
                </Button>
              </DialogFooter>
            </Tabs>
          </form>
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
            <DialogTitle>Tự sắp xếp sơ đồ ô tủ</DialogTitle>
            <DialogDescription>
              Xếp lại các ô (trừ cột Kiosk dưới màn hình) theo số ô tăng dần, lần lượt từng hàng từ góc
              trên-trái. Sơ đồ mới đồng bộ sang Kiosk và ứng dụng KTV — chỉ dùng khi vị trí đang lưu
              không đúng với tủ thật.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="arrange-cols">Số ô mỗi hàng</Label>
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
                ? "Các ô đã đúng thứ tự — không có gì để thay đổi."
                : `Sẽ đổi vị trí ${arrangePlan.length} ô.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArrangeOpen(false)} disabled={arranging}>
              Huỷ
            </Button>
            <Button onClick={handleArrange} disabled={arranging || arrangePlan.length === 0}>
              {arranging ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <LayoutGrid className="w-4 h-4 mr-1.5" />}
              Sắp xếp
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
    </div>
  );
}

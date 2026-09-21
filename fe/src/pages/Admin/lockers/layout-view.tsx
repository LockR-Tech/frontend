import { type ReactNode, useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
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
  useGetStaffLockerQuery,
  useAssignLockerTechnicianMutation,
  useGetAllAdminReportsQuery,
  type CellResponse,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { extractList } from "~/lib/extract-list";

// Nhãn trạng thái tủ — cùng câu chữ với admin.lockers.status (messages/vi.json)
const LOCKER_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Hoạt động", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  INACTIVE: { label: "Vô hiệu", cls: "bg-secondary border-border text-muted-foreground" },
  MAINTENANCE: { label: "Bảo trì", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
  DISCONNECTED: { label: "Mất kết nối", cls: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" },
};

// Tủ MAINTENANCE/INACTIVE bị server từ chối đặt ô (LOCKER_NOT_ACTIVE)
const SUSPENDED_LOCKER_STATUSES = ["MAINTENANCE", "INACTIVE"];

const NO_TECHNICIAN = "NONE";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Trống", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  RESERVED: { label: "Đã giữ chỗ", cls: "bg-secondary border-border text-foreground" },
  OCCUPIED: { label: "Có đồ", cls: "bg-secondary border-border text-foreground" },
  FAULT: { label: "Hỏng", cls: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400" },
  OUT_OF_SERVICE: { label: "Ngưng dùng", cls: "bg-secondary/40 border-border text-muted-foreground" },
  CLEANING: { label: "Đang vệ sinh", cls: "bg-secondary border-border text-muted-foreground" },
};

function ActBtn({
  icon,
  label,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-6 px-2 text-[10px] font-semibold border border-slate-300/80 dark:border-slate-600 bg-white/95 dark:bg-slate-800 hover:bg-white text-slate-800 dark:text-slate-100 shadow-2xs"
      disabled={busy}
      onClick={onClick}
    >
      {icon} {label}
    </Button>
  );
}

type BoxActionType = "FORCE_OPEN" | "FAULT" | "OUT_OF_SERVICE" | "CLEANING" | "RETURN" | "CLEAR_FAULT";

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
  busy,
}: {
  cell: CellResponse;
  onAction: (cell: CellResponse, type: BoxActionType) => void;
  busy: boolean;
}) {
  const isDrone = cell.cellType === "DRONE" || cell.boxNumber === 1 || cell.boxNumber === 2;
  let bgClass = "bg-card";
  let borderClass = "border-border";
  let textClass = "text-foreground";
  let statusBadge = (
    <span className="text-xs font-medium z-10">
      {STATUS_STYLE[cell.status]?.label ?? cell.status}
    </span>
  );

  if (isDrone) {
    if (cell.status === "FAULT") {
      bgClass = "bg-rose-100/90 dark:bg-rose-950/60";
      borderClass = "border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/30";
      textClass = "text-rose-950 dark:text-rose-100";
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 z-10">
          <AlertTriangle className="w-3.5 h-3.5" /> Báo hỏng (Drone)
        </span>
      );
    } else {
      bgClass = "bg-sky-100/90 dark:bg-sky-950/70";
      borderClass = "border-sky-400 dark:border-sky-600 ring-2 ring-sky-400/30 shadow-xs";
      textClass = "text-sky-950 dark:text-sky-100";
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300 z-10">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" /> Sẵn sàng nhận Drone
        </span>
      );
    }
  } else {
    switch (cell.status) {
      case "AVAILABLE":
        bgClass = "bg-emerald-50/95 dark:bg-emerald-950/50";
        borderClass = "border-emerald-300 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-xs";
        textClass = "text-emerald-950 dark:text-emerald-100";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ô trống (Sẵn sàng)
          </span>
        );
        break;
      case "OCCUPIED":
      case "IN_USE":
      case "RESERVED":
        bgClass = "bg-amber-50/95 dark:bg-amber-950/50";
        borderClass = "border-amber-300 dark:border-amber-700 shadow-xs";
        textClass = "text-amber-950 dark:text-amber-100";
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 z-10">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Đang chứa hàng
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

  return (
    <div
      className={`relative h-full rounded-xl border p-3.5 flex flex-col gap-1 overflow-hidden shadow-xs hover:shadow-md transition-all ${bgClass} ${borderClass} ${textClass}`}
      title={cell.faultReason ?? undefined}
    >
      {/* Decorative handle */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1 h-10 bg-border/80 rounded-full" />
      
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm tracking-tight">Ô #{cell.boxNumber}</span>
          {isDrone && (
            <Badge className="bg-sky-600 text-white border-0 text-[10px] font-bold px-1.5 py-0 h-4">
              Drone
            </Badge>
          )}
        </div>
        {isDrone && <Plane className="w-5 h-5 text-sky-700 dark:text-sky-300 opacity-95 drop-shadow-xs" />}
        {cell.cellType === "XL" && <Luggage className="w-5 h-5 text-emerald-800 dark:text-emerald-300 opacity-80" />}
        {!isDrone && cell.cellType === "STANDARD" && <BoxIcon className="w-5 h-5 text-emerald-800 dark:text-emerald-300 opacity-80" />}
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
          <DropdownMenuContent align="end" className="w-44 text-xs">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function getBoxGridStyle(cell: CellResponse, maxRows: number) {
  // If XL cell (tall compartment spanning vertically)
  if (cell.cellType === "XL" || cell.colIndex === 0 || cell.boxNumber === 10) {
    return {
      gridColumn: "1",
      gridRow: `1 / span ${maxRows}`,
    };
  }

  // Standard or Drone cells with rowIndex and colIndex:
  // Col 1 is reserved for the XL column. Standard columns start from 2 onwards:
  const col = cell.colIndex != null && cell.colIndex > 0 ? cell.colIndex + 1 : 2;
  const row = cell.rowIndex ?? 1;

  return {
    gridColumn: `${col}`,
    gridRow: `${row}`,
  };
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
  const [cleaning, { isLoading: cleaningBusy }] = useSetBoxCleaningMutation();
  const [returnToService, { isLoading: returning }] = useReturnBoxToServiceMutation();
  const [forceOpen, { isLoading: forceOpening }] = useForceOpenBoxMutation();
  const [addBox, { isLoading: isAddingBox }] = useAddBoxMutation();
  const [pendingBox, setPendingBox] = useState<number | null>(null);

  // KTV phụ trách tủ: phiếu mới của tủ chỉ gửi cho người này; chưa gán ⇒ báo mọi KTV tủ
  const { data: staffLockerData } = useGetStaffLockerQuery(id, { skip: !Number.isFinite(id) });
  const staffLocker = staffLockerData?.data;
  const [assignLockerTechnician, { isLoading: savingTechnician }] = useAssignLockerTechnicianMutation();
  const { data: usersData } = useGetAllUsersQuery({ page: 0, size: 1000 });
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

  // Modal State for Adding a Box
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBoxNumber, setNewBoxNumber] = useState<number | "">("");
  const [newCellType, setNewCellType] = useState<string>("STANDARD");
  const [newSize, setNewSize] = useState<string>("M");
  const [newRowIndex, setNewRowIndex] = useState<number>(2);
  const [newColIndex, setNewColIndex] = useState<number>(3);

  const layout = data?.data;

  // Render all active cells dynamically configured by Admin
  const cells = useMemo(() => {
    if (!layout?.cells) return [];
    return layout.cells;
  }, [layout]);

  const maxRows = useMemo(() => {
    return Math.max(3, ...cells.map((c) => c.rowIndex ?? 1));
  }, [cells]);

  const maxCols = useMemo(() => {
    return Math.max(
      3,
      ...cells.map((c) =>
        c.cellType === "XL" || c.colIndex === 0 || c.boxNumber === 10
          ? 1
          : (c.colIndex != null && c.colIndex > 0 ? c.colIndex + 1 : 2)
      )
    );
  }, [cells]);

  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoxNumber || !id) {
      toast.error("Vui lòng nhập số ô tủ!");
      return;
    }
    try {
      await addBox({
        lockerId: id,
        boxNumber: Number(newBoxNumber),
        cellType: newCellType,
        size: newSize,
        rowIndex: Number(newRowIndex),
        colIndex: Number(newColIndex),
        status: "AVAILABLE",
      }).unwrap();
      toast.success(`Đã thêm ô #${newBoxNumber} thành công!`);
      setShowAddModal(false);
      setNewBoxNumber("");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Không thể thêm ô tủ mới");
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
        if (res.data?.accepted) {
          toast.success(`Đã mở khóa ô #${cell.boxNumber}`);
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
          <Button onClick={() => setShowAddModal(true)} className="bg-primary text-primary-foreground shadow-xs">
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
                {`Đang bị chặn bởi phiếu sự cố ${blockingReports.map((r) => `#${r.id}`).join(", ")} — tủ tự hoạt động lại khi phiếu chặn cuối cùng được hoàn tất.`}
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

      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Sơ đồ vật lý Kiosk (Hàng 1: Ô tiếp nhận Drone)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div
            className="grid gap-3.5 p-5 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border-2 border-slate-300/90 dark:border-slate-700 shadow-inner"
            style={{
              gridTemplateColumns: `minmax(180px, 1fr) repeat(${Math.max(1, maxCols - 1)}, minmax(200px, 1.25fr))`,
              gridTemplateRows: `repeat(${maxRows}, minmax(135px, auto))`,
            }}
          >
            {cells.map((cell) => {
              const gridStyle = getBoxGridStyle(cell, maxRows);
              return (
                <div
                  key={cell.id}
                  style={gridStyle}
                  className="flex flex-col h-full shadow-xs transition-all hover:shadow-md"
                >
                  <CellTile
                    cell={cell}
                    onAction={handleOpenAction}
                    busy={
                      (faulting || clearing || oosing || cleaningBusy || returning || forceOpening) &&
                      pendingBox === cell.id
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-sky-800 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-950/70 px-2.5 py-1 rounded-md border border-sky-300 dark:border-sky-700">
              <Plane className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Ô tiếp nhận Drone ({cells.filter((c) => c.cellType === 'DRONE' || c.boxNumber === 1 || c.boxNumber === 2).map((c) => `#${c.boxNumber}`).join(', ')})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ô trống khả dụng ({cells.filter((c) => c.status === 'AVAILABLE').map((c) => `#${c.boxNumber}`).join(', ') || 'Không'})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-700">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Ô hỏng / bảo trì ({cells.filter((c) => c.status === 'FAULT').map((c) => `#${c.boxNumber}`).join(', ') || 'Không'})
            </span>
          </div>
        </CardContent>
      </Card>

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
                (faulting || clearing || oosing || cleaningBusy || returning || forceOpening) ||
                (actionDialog.requireReason && !actionDialog.reason.trim())
              }
            >
              {actionDialog.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Thêm ô tủ */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddBox}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BoxIcon className="w-5 h-5 text-primary" /> Thêm ô tủ mới vào Kiosk
              </DialogTitle>
              <DialogDescription>
                Thêm một ô tủ vật lý mới vào tủ {layout?.name}. Ô mới sẽ đồng bộ ngay lập tức sang ứng dụng KTV.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="boxNumber" className="text-right font-medium">
                  Số ô (#)
                </Label>
                <Input
                  id="boxNumber"
                  type="number"
                  placeholder="ví dụ: 3, 6, 9"
                  value={newBoxNumber}
                  onChange={(e) => setNewBoxNumber(e.target.value ? Number(e.target.value) : "")}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cellType" className="text-right font-medium">
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
                <Label htmlFor="size" className="text-right font-medium">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rowIndex" className="text-right font-medium">
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
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="colIndex" className="text-right font-medium">
                  Cột (Col)
                </Label>
                <Input
                  id="colIndex"
                  type="number"
                  min={1}
                  max={10}
                  value={newColIndex}
                  onChange={(e) => setNewColIndex(Number(e.target.value))}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isAddingBox}>
                {isAddingBox ? "Đang thêm..." : "Thêm ô tủ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

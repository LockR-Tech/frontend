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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import {
  useGetLockerLayoutQuery,
  useReportBoxFaultMutation,
  useClearBoxFaultMutation,
  useSetBoxOutOfServiceMutation,
  useSetBoxCleaningMutation,
  useReturnBoxToServiceMutation,
  useForceOpenBoxMutation,
  type CellResponse,
} from "~/stores/apis/admin/lockerOps";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Trống", cls: "bg-green-50 border-green-300 text-green-800" },
  RESERVED: { label: "Đã giữ chỗ", cls: "bg-blue-50 border-blue-300 text-blue-800" },
  OCCUPIED: { label: "Có đồ", cls: "bg-orange-50 border-orange-300 text-orange-800" },
  FAULT: { label: "Hỏng", cls: "bg-red-50 border-red-400 text-red-800" },
  OUT_OF_SERVICE: { label: "Ngưng dùng", cls: "bg-slate-100 border-slate-400 text-slate-700" },
  CLEANING: { label: "Đang vệ sinh", cls: "bg-cyan-50 border-cyan-300 text-cyan-800" },
};

function ActBtn({
  icon,
  label,
  onClick,
  busy,
  isLight,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy: boolean;
  isLight?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={`h-6 px-2 text-[11px] ${
        isLight
          ? "border-white/40 bg-black/10 text-white hover:bg-black/20 hover:text-white"
          : "hover:bg-slate-100"
      }`}
      disabled={busy}
      onClick={onClick}
    >
      {icon} {label}
    </Button>
  );
}

function CellTile({
  cell,
  onFault,
  onClear,
  onOutOfService,
  onCleaning,
  onReturn,
  onForceOpen,
  busy,
}: {
  cell: CellResponse;
  onFault: (cell: CellResponse) => void;
  onClear: (cell: CellResponse) => void;
  onOutOfService: (cell: CellResponse) => void;
  onCleaning: (cell: CellResponse) => void;
  onReturn: (cell: CellResponse) => void;
  onForceOpen: (cell: CellResponse) => void;
  busy: boolean;
}) {
  const isDrone = cell.cellType === "DRONE";
  let bgClass = "";
  let borderClass = "";
  let textClass = "";

  if (isDrone) {
    bgClass = "bg-gradient-to-br from-indigo-500 to-indigo-600";
    borderClass = "border-indigo-400";
    textClass = "text-white";
  } else {
    switch (cell.status) {
      case "AVAILABLE":
        bgClass = "bg-gradient-to-br from-cyan-500/90 to-cyan-600";
        borderClass = "border-cyan-400";
        textClass = "text-white";
        break;
      case "OCCUPIED":
      case "IN_USE":
        bgClass = "bg-gradient-to-br from-slate-100 to-slate-300";
        borderClass = "border-slate-300";
        textClass = "text-slate-600";
        break;
      case "RESERVED":
        bgClass = "bg-gradient-to-br from-amber-200 to-amber-500";
        borderClass = "border-amber-400";
        textClass = "text-amber-900";
        break;
      case "FAULT":
        bgClass = "bg-gradient-to-br from-red-400 to-red-600";
        borderClass = "border-red-400";
        textClass = "text-white";
        break;
      case "CLEANING":
        bgClass = "bg-gradient-to-br from-blue-300 to-blue-500";
        borderClass = "border-blue-300";
        textClass = "text-white";
        break;
      default:
        bgClass = "bg-gradient-to-br from-gray-200 to-gray-400";
        borderClass = "border-gray-300";
        textClass = "text-gray-700";
        break;
    }
  }

  const isLightText = textClass === "text-white";

  return (
    <div
      className={`relative h-full rounded-xl border-2 p-3 flex flex-col gap-1 overflow-hidden shadow-sm hover:shadow-md transition-all ${bgClass} ${borderClass} ${textClass}`}
      title={cell.faultReason ?? undefined}
    >
      {/* Decorative metallic handle */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-black/10 rounded-full border border-white/20" />
      
      <div className="flex items-center justify-between z-10">
        <span className="font-semibold text-sm drop-shadow-sm">Ô #{cell.boxNumber}</span>
        {isDrone && <Plane className="w-5 h-5 opacity-90 drop-shadow-md" />}
        {cell.cellType === "XL" && <Luggage className="w-5 h-5 opacity-80" />}
        {cell.cellType === "STANDARD" && <BoxIcon className="w-5 h-5 opacity-80" />}
      </div>
      <span className="text-xs font-medium z-10 drop-shadow-sm">
        {STATUS_STYLE[cell.status]?.label ?? cell.status}
      </span>
      {cell.faultReason && (
        <span className="text-[11px] leading-tight line-clamp-2 mt-1 z-10 opacity-90">
          {cell.faultReason}
        </span>
      )}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-2 z-10">
        {cell.status === "FAULT" ? (
          <ActBtn
            icon={<CheckCircle2 className="w-3 h-3 mr-1" />}
            label="Đã sửa"
            busy={busy}
            onClick={() => onClear(cell)}
            isLight={isLightText}
          />
        ) : cell.status === "OUT_OF_SERVICE" || cell.status === "CLEANING" ? (
          <ActBtn
            icon={<RotateCcw className="w-3 h-3 mr-1" />}
            label="Khôi phục"
            busy={busy}
            onClick={() => onReturn(cell)}
            isLight={isLightText}
          />
        ) : cell.status === "OCCUPIED" || cell.status === "RESERVED" ? (
          <ActBtn
            icon={<Wrench className="w-3 h-3 mr-1" />}
            label="Báo hỏng"
            busy={busy}
            onClick={() => onFault(cell)}
            isLight={isLightText}
          />
        ) : (
          <>
            <ActBtn
              icon={<Wrench className="w-3 h-3 mr-1" />}
              label="Hỏng"
              busy={busy}
              onClick={() => onFault(cell)}
              isLight={isLightText}
            />
            <ActBtn
              icon={<Ban className="w-3 h-3 mr-1" />}
              label="Ngưng"
              busy={busy}
              onClick={() => onOutOfService(cell)}
              isLight={isLightText}
            />
            <ActBtn
              icon={<Sparkles className="w-3 h-3 mr-1" />}
              label="Vệ sinh"
              busy={busy}
              onClick={() => onCleaning(cell)}
              isLight={isLightText}
            />
          </>
        )}
        <ActBtn
          icon={<Unlock className="w-3 h-3 mr-1" />}
          label="Mở khẩn cấp"
          busy={busy}
          onClick={() => onForceOpen(cell)}
          isLight={isLightText}
        />
      </div>
    </div>
  );
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
  const [pendingBox, setPendingBox] = useState<number | null>(null);

  const layout = data?.data;

  const cells = useMemo(() => {
    if (!layout) return [];
    return [...layout.cells].sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return (a.rowIndex ?? 0) - (b.rowIndex ?? 0);
      return (a.colIndex ?? 0) - (b.colIndex ?? 0);
    });
  }, [layout]);

  const handleFault = async (cell: CellResponse) => {
    const reason = window.prompt(`Lý do báo hỏng ô #${cell.boxNumber}?`, "Khóa không mở");
    if (reason === null) return;
    setPendingBox(cell.id);
    try {
      await reportFault({ boxId: cell.id, reason }).unwrap();
      toast.success(`Đã báo hỏng ô #${cell.boxNumber}`);
    } catch {
      toast.error("Báo hỏng thất bại");
    } finally {
      setPendingBox(null);
    }
  };

  const handleClear = async (cell: CellResponse) => {
    setPendingBox(cell.id);
    try {
      await clearFault(cell.id).unwrap();
      toast.success(`Ô #${cell.boxNumber} đã hoạt động lại`);
    } catch {
      toast.error("Không xóa được trạng thái hỏng");
    } finally {
      setPendingBox(null);
    }
  };

  const handleOutOfService = async (cell: CellResponse) => {
    const reason = window.prompt(
      `Lý do ngưng dùng ô #${cell.boxNumber}? (để trống nếu không có)`,
      "",
    );
    if (reason === null) return;
    setPendingBox(cell.id);
    try {
      await outOfService({ boxId: cell.id, reason: reason.trim() || undefined }).unwrap();
      toast.success(`Đã ngưng dùng ô #${cell.boxNumber}`);
    } catch {
      toast.error("Không ngưng dùng được ô (ô đang có đơn?)");
    } finally {
      setPendingBox(null);
    }
  };

  const handleCleaning = async (cell: CellResponse) => {
    setPendingBox(cell.id);
    try {
      await cleaning(cell.id).unwrap();
      toast.success(`Ô #${cell.boxNumber} đang vệ sinh`);
    } catch {
      toast.error("Không đánh dấu vệ sinh được (ô đang có đơn?)");
    } finally {
      setPendingBox(null);
    }
  };

  const handleReturn = async (cell: CellResponse) => {
    setPendingBox(cell.id);
    try {
      await returnToService(cell.id).unwrap();
      toast.success(`Ô #${cell.boxNumber} đã hoạt động lại`);
    } catch {
      toast.error("Không khôi phục được ô");
    } finally {
      setPendingBox(null);
    }
  };

  const handleForceOpen = async (cell: CellResponse) => {
    const confirmed = window.confirm(
      `Mở khẩn cấp ô #${cell.boxNumber} mà không cần PIN khách?\nHành động này sẽ được ghi vào nhật ký hệ thống.`,
    );
    if (!confirmed) return;
    setPendingBox(cell.id);
    try {
      const res = await forceOpen(cell.id).unwrap();
      if (res.data?.accepted) {
        toast.success(`Đã mở ô #${cell.boxNumber}`);
      } else {
        toast.error(`${res.data?.message ?? "Không mở được tủ"}`);
      }
    } catch {
      toast.error("Không gửi được lệnh mở tủ");
    } finally {
      setPendingBox(null);
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
              <Badge variant="outline">{layout.status}</Badge>
              {layout.landingPad && (
                <Badge className="bg-violet-100 text-violet-800 border-violet-300">
                  <Plane className="w-3 h-3 mr-1" />
                  Bãi đáp drone {layout.landingMarkerId ? `· ${layout.landingMarkerId}` : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng số ô</p>
            <p className="text-2xl font-bold">{layout.totalCells}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ô trống</p>
            <p className="text-2xl font-bold text-green-600">{layout.availableCells}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang dùng</p>
            <p className="text-2xl font-bold text-orange-600">
              {layout.totalCells - layout.availableCells - layout.faultCells}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ô hỏng</p>
            <p className="text-2xl font-bold text-red-600">{layout.faultCells}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Sơ đồ vật lý (hàng 1 trên cùng — ô DRONE chỉ nhận hàng từ drone)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="grid gap-3 p-4 bg-muted/20 rounded-xl border border-muted/40"
            style={{
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gridAutoRows: "minmax(140px, auto)",
            }}
          >
            {cells.map((cell) => {
              const span = cell.cellType === "XL" ? 2 : 1;
              return (
                <div
                  key={cell.id}
                  style={{
                    gridColumnStart: (cell.colIndex ?? 0) + 1,
                    gridRowStart: (cell.rowIndex ?? 0) + 1,
                    gridRowEnd: `span ${span}`,
                  }}
                  className="flex flex-col h-full shadow-sm transition-all hover:shadow-md"
                >
                  <CellTile
                    cell={cell}
                    onFault={handleFault}
                    onClear={handleClear}
                    onOutOfService={handleOutOfService}
                    onCleaning={handleCleaning}
                    onReturn={handleReturn}
                    onForceOpen={handleForceOpen}
                    busy={
                      (faulting || clearing || oosing || cleaningBusy || returning || forceOpening) &&
                      pendingBox === cell.id
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 pt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Plane className="w-3 h-3" /> Ô nhận hàng drone</span>
            <span className="inline-flex items-center gap-1"><Luggage className="w-3 h-3" /> Ô vali (XL)</span>
            <span className="inline-flex items-center gap-1"><BoxIcon className="w-3 h-3" /> Ô thường</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

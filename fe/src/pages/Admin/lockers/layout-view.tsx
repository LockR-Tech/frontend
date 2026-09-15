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
      <div className="mt-auto flex flex-wrap gap-1.5 pt-2 z-10">
        {cell.status === "FAULT" ? (
          <ActBtn
            icon={<CheckCircle2 className="w-3 h-3 mr-1" />}
            label="Đã sửa"
            busy={busy}
            onClick={() => onClear(cell)}
          />
        ) : cell.status === "OUT_OF_SERVICE" || cell.status === "CLEANING" ? (
          <ActBtn
            icon={<RotateCcw className="w-3 h-3 mr-1" />}
            label="Khôi phục"
            busy={busy}
            onClick={() => onReturn(cell)}
          />
        ) : cell.status === "OCCUPIED" || cell.status === "RESERVED" ? (
          <ActBtn
            icon={<Wrench className="w-3 h-3 mr-1" />}
            label="Báo hỏng"
            busy={busy}
            onClick={() => onFault(cell)}
          />
        ) : (
          <>
            <ActBtn
              icon={<Wrench className="w-3 h-3 mr-1" />}
              label="Hỏng"
              busy={busy}
              onClick={() => onFault(cell)}
              />
            <ActBtn
              icon={<Ban className="w-3 h-3 mr-1" />}
              label="Ngưng"
              busy={busy}
              onClick={() => onOutOfService(cell)}
              />
            <ActBtn
              icon={<Sparkles className="w-3 h-3 mr-1" />}
              label="Vệ sinh"
              busy={busy}
              onClick={() => onCleaning(cell)}
              />
          </>
        )}
        <ActBtn
          icon={<Unlock className="w-3 h-3 mr-1" />}
          label="Mở khẩn cấp"
          busy={busy}
          onClick={() => onForceOpen(cell)}
        />
      </div>
    </div>
  );
}

function getBoxGridStyle(boxNumber: number) {
  switch (boxNumber) {
    case 10:
      // Tall XL suitcase box on the left column, spans all 3 rows
      return { gridColumn: "1", gridRow: "1 / span 3" };
    case 1:
      // Top row, drone box 1
      return { gridColumn: "2", gridRow: "1" };
    case 2:
      // Top row, drone box 2
      return { gridColumn: "3", gridRow: "1" };
    case 4:
      // Middle row, standard box 4
      return { gridColumn: "2", gridRow: "2" };
    case 5:
      // Middle row, standard box 5
      return { gridColumn: "3", gridRow: "2" };
    case 7:
      // Bottom row, standard box 7
      return { gridColumn: "2", gridRow: "3" };
    case 8:
      // Bottom row, standard box 8
      return { gridColumn: "3", gridRow: "3" };
    default:
      return {};
  }
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
    // Physical cabinet does not have boxes 3, 6, 9
    return layout.cells.filter(
      (c) => c.boxNumber !== 3 && c.boxNumber !== 6 && c.boxNumber !== 9,
    );
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
              gridTemplateColumns: "minmax(180px, 1fr) minmax(220px, 1.25fr) minmax(220px, 1.25fr)",
              gridTemplateRows: "repeat(3, minmax(135px, auto))",
            }}
          >
            {cells.map((cell) => {
              const gridStyle = getBoxGridStyle(cell.boxNumber);
              return (
                <div
                  key={cell.id}
                  style={gridStyle}
                  className="flex flex-col h-full shadow-xs transition-all hover:shadow-md"
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
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-sky-800 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-950/70 px-2.5 py-1 rounded-md border border-sky-300 dark:border-sky-700">
              <Plane className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Ô tiếp nhận Drone (#1, #2)
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ô trống khả dụng (#10, #4, #5, #7)
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-700">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Ô hỏng / bảo trì (#8)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

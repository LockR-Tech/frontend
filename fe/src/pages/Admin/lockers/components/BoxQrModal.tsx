import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  Plane,
  Luggage,
  Box,
  Layers,
  Sparkles,
  Lock,
  Unlock,
  Cpu,
  Info,
  Maximize2,
  FileDown,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { type CellResponse } from "~/stores/apis/admin/lockerOps";
import { isXlCell, isDroneCell } from "~/lib/lockerLayoutHelper";

interface BoxQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: CellResponse | null;
  cells?: CellResponse[];
  lockerId: number;
  lockerName?: string;
  lockerCode?: string;
}

export function BoxQrModal({
  open,
  onOpenChange,
  cell,
  cells = [],
  lockerId,
  lockerName,
  lockerCode = "CAB-01",
}: BoxQrModalProps) {
  const { t } = useTranslation();
  const [printMode, setPrintMode] = useState<"single" | "all">("single");
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "DRONE" | "XL" | "STANDARD">("ALL");

  const displayLockerName = lockerName ?? t("admin.lockers.boxQr.defaultLockerName");

  // Đồng bộ ô được chọn khi mở modal hoặc khi cell đổi
  useEffect(() => {
    if (cell) {
      setSelectedBoxId(cell.id);
    } else if (cells.length > 0) {
      setSelectedBoxId(cells[0].id);
    }
  }, [cell, cells, open]);

  // Tìm ô đang hiển thị
  const currentCell = useMemo(() => {
    if (!selectedBoxId && cell) return cell;
    return cells.find((c) => c.id === selectedBoxId) ?? cell ?? cells[0] ?? null;
  }, [selectedBoxId, cell, cells]);

  // Lọc danh sách ô theo loại nếu cần
  const filteredCells = useMemo(() => {
    if (filterType === "ALL") return cells;
    if (filterType === "DRONE") return cells.filter((c) => isDroneCell(c));
    if (filterType === "XL") return cells.filter((c) => isXlCell(c));
    return cells.filter((c) => !isDroneCell(c) && !isXlCell(c));
  }, [cells, filterType]);

  if (!currentCell && cells.length === 0) return null;
  if (!currentCell) return null;

  const isDrone = isDroneCell(currentCell);
  const isXl = isXlCell(currentCell);

  // Payload mã QR chuẩn JSON sinh thái Lock.R
  const getQrValue = (c: CellResponse) => {
    return JSON.stringify({
      app: "Lock.R",
      type: "LOCKER_BOX",
      lockerId,
      lockerCode,
      boxId: c.id,
      boxNumber: c.boxNumber,
      cellType:
        c.cellType ||
        (isXlCell(c) ? "XL" : isDroneCell(c) ? "DRONE" : "STANDARD"),
      size: c.size || "M",
    });
  };

  const currentQrValue = getQrValue(currentCell);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentQrValue);
    setCopied(true);
    toast.success(t("admin.lockers.boxQr.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  // Tải tem nhãn hoàn chỉnh dạng PNG chất lượng cao (300 DPI - 600x800px)
  const handleDownloadFullSticker = (c: CellResponse) => {
    try {
      const svg = document.getElementById(`qr-svg-${c.id}`);
      if (!svg) {
        toast.error(t("admin.lockers.boxQr.notFound"));
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Kích thước chuẩn tem công nghiệp: 600 x 800 px
      canvas.width = 600;
      canvas.height = 800;

      // Nền trắng tinh
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Viền bo tem góc ngoài
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 5;
      ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

      // Khung Header thương hiệu
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(24, 24, canvas.width - 48, 64);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Inter, Arial, sans-serif";
      ctx.fillText("LOCK.R SMART SYSTEM", 44, 62);

      ctx.font = "bold 16px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${lockerCode} · #${lockerId}`, canvas.width - 44, 62);
      ctx.textAlign = "left";

      // Tên trạm tủ
      ctx.fillStyle = "#64748b";
      ctx.font = "16px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(displayLockerName, canvas.width / 2, 128);

      // Số ô cực lớn nổi bật
      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 56px Inter, Arial, sans-serif";
      ctx.fillText(`Ô #${c.boxNumber}`, canvas.width / 2, 185);

      // Nhãn phân loại
      const cellBadge = isDroneCell(c) ? "DRONE DELIVERY PAD" : isXlCell(c) ? "KHOANG VALI XL" : "Ô CHUẨN ĐA NĂNG";
      ctx.font = "bold 14px Inter, Arial, sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(`[ ${cellBadge} · SIZE ${c.size || "M"} ]`, canvas.width / 2, 222);

      // Vẽ mã QR ở vị trí trung tâm
      const img = new Image();
      img.onload = () => {
        const qrSize = 310;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 250;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // Khung thông số kỹ thuật bên dưới
        const boxY = 590;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(36, boxY, canvas.width - 72, 105);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(36, boxY, canvas.width - 72, 105);

        ctx.fillStyle = "#475569";
        ctx.font = "14px Inter, Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Vị trí: Hàng ${c.rowIndex ?? 1} · Cột ${c.colIndex ?? 1}`, 54, boxY + 36);
        ctx.fillText(`Mã định danh: BOX-${c.id}`, 54, boxY + 74);

        ctx.textAlign = "right";
        ctx.fillText(`Cửa: ${c.doorState || "CLOSED"}`, canvas.width - 54, boxY + 36);
        ctx.fillText(`Trạng thái: ${c.status || "AVAILABLE"}`, canvas.width - 54, boxY + 74);

        // Chân trang hướng dẫn quét
        ctx.fillStyle = "#64748b";
        ctx.font = "italic 13px Inter, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Quét mã QR bằng ứng dụng Lock.R để thao tác gửi/nhận hoặc kiểm tra ô", canvas.width / 2, 735);

        ctx.font = "11px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`LOCKR-TAG-${lockerCode}-B${c.boxNumber}-${c.id}`, canvas.width / 2, 758);

        // Tải xuống file
        const a = document.createElement("a");
        a.download = `Tem-Dan-Tu-${lockerCode}-O-${c.boxNumber}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
        toast.success(t("admin.lockers.boxQr.downloaded", { number: c.boxNumber }));
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      toast.error(t("admin.lockers.boxQr.downloadFailed"));
    }
  };

  // Tải riêng file ảnh mã QR thuần túy
  const handleDownloadQrOnly = (c: CellResponse) => {
    try {
      const svg = document.getElementById(`qr-svg-${c.id}`);
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = 600;
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      const img = new Image();
      img.onload = () => {
        const padding = 40;
        ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);
        const a = document.createElement("a");
        a.download = `QR-Code-${lockerCode}-O-${c.boxNumber}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
        toast.success(`Đã tải ảnh mã QR ô #${c.boxNumber}`);
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      toast.error(t("admin.lockers.boxQr.downloadFailed"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="box-qr-dialog sm:max-w-4xl max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border-border shadow-2xl">
        {/* Header Modal */}
        <DialogHeader className="p-4 px-6 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <QrCode className="w-4 h-4" />
                </div>
                <span>Mã QR & Tem dán ô tủ</span>
                <Badge variant="outline" className="font-mono text-xs ml-1 bg-background font-semibold">
                  {lockerCode}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span>Trạm: <strong>{displayLockerName}</strong></span>
                <span>•</span>
                <span>{cells.length} ô tủ</span>
                <span>•</span>
                <span>Chuẩn in ấn decal dán cánh tủ thông minh</span>
              </DialogDescription>
            </div>

            {/* Segmented Mode Control: In 1 ô vs In toàn bộ tủ */}
            <div className="inline-flex rounded-xl border border-border/80 p-1 bg-muted/50 text-xs self-start sm:self-auto">
              <button
                type="button"
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  printMode === "single"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPrintMode("single")}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span>Tem ô #{currentCell.boxNumber}</span>
              </button>
              <button
                type="button"
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  printMode === "all"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPrintMode("all")}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>In tất cả ({cells.length} ô)</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Nội dung Modal */}
        <div className="flex-1 overflow-y-auto">
          {printMode === "single" ? (
            /* ================= CHẾ ĐỘ 1 Ô: STUDIO PREVIEW & QUẢN LÝ ================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[530px]">
              {/* CỘT TRÁI (7 cols): Studio mô phỏng tem nhãn dán cánh tủ thực tế */}
              <div className="lg:col-span-7 p-6 bg-slate-100/90 dark:bg-slate-900/60 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border/80">
                <div className="w-full max-w-[350px] flex flex-col items-center">
                  {/* Badge khổ tem */}
                  <div className="w-full flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2.5 px-1">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                      Mô phỏng tem in decal thực tế
                    </span>
                    <span className="font-mono text-[10px] bg-background/80 px-2 py-0.5 rounded-md border border-border/60">
                      80 × 100 mm
                    </span>
                  </div>

                  {/* THẺ TEM NHÃN IN HOÀN CHỈNH (PRINTABLE DECAL) */}
                  <div
                    id="printable-box-sticker"
                    className="w-full bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-xl p-5 flex flex-col items-center text-center space-y-3.5 transition-all relative overflow-hidden"
                  >
                    {/* Header tem */}
                    <div className="w-full flex items-center justify-between border-b pb-2.5 border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-xs tracking-tighter shadow-xs">
                          LR
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold text-xs tracking-wider text-slate-950 uppercase leading-none">
                            Lock.R System
                          </p>
                          <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">
                            Smart Locker Network
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {lockerCode}
                        </span>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">#{lockerId}</p>
                      </div>
                    </div>

                    {/* Tiêu đề Ô & Phân loại */}
                    <div className="space-y-1 w-full">
                      <p className="text-xs text-slate-600 font-medium truncate max-w-[290px] mx-auto">
                        {displayLockerName}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-black tracking-tight text-slate-950 font-sans">
                          Ô #{currentCell.boxNumber}
                        </span>
                        {isDrone ? (
                          <Badge className="bg-sky-600 hover:bg-sky-600 text-white border-0 text-[10px] font-bold px-2 py-0.5 gap-1 shadow-xs">
                            <Plane className="w-3 h-3" /> DRONE
                          </Badge>
                        ) : isXl ? (
                          <Badge className="bg-violet-700 hover:bg-violet-700 text-white border-0 text-[10px] font-bold px-2 py-0.5 gap-1 shadow-xs">
                            <Luggage className="w-3 h-3" /> VALI XL
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0 text-[10px] font-bold px-2 py-0.5 gap-1 shadow-xs">
                            <Box className="w-3 h-3" /> TIÊU CHUẨN
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* QR Code Canvas với góc ngắm Finder tinh tế */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs relative group">
                      {/* 4 góc ngắm quét Finder */}
                      <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-400/80 rounded-tl-sm pointer-events-none" />
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-400/80 rounded-tr-sm pointer-events-none" />
                      <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-400/80 rounded-bl-sm pointer-events-none" />
                      <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-400/80 rounded-br-sm pointer-events-none" />

                      <QRCodeSVG
                        id={`qr-svg-${currentCell.id}`}
                        value={currentQrValue}
                        size={180}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    {/* Bảng thông số kỹ thuật gọn gàng */}
                    <div className="w-full bg-slate-50 rounded-xl p-2.5 text-[11px] border border-slate-200 grid grid-cols-2 gap-2 text-left">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-medium">CÔNG NĂNG</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {isDrone ? "Tiếp nhận Drone" : isXl ? "Khoang Vali (XL)" : "Ô chuẩn đa năng"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-medium">KÍCH CỠ</span>
                        <span className="font-bold text-slate-900 text-xs">
                          Size {currentCell.size || "M"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-medium">VỊ TRÍ VẬT LÝ</span>
                        <span className="font-semibold text-slate-800 text-xs">
                          Hàng {currentCell.rowIndex ?? 1} · Cột {currentCell.colIndex ?? 1}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-medium">MÃ ĐỊNH DANH</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          BOX-{currentCell.id}
                        </span>
                      </div>
                    </div>

                    {/* Chân tem nhãn */}
                    <div className="w-full pt-1.5 pb-0.5 border-t border-slate-200">
                      <p className="text-[10px] text-slate-500 italic">
                        Quét mã QR bằng ứng dụng Lock.R để thao tác hoặc kiểm tra ô tủ
                      </p>
                    </div>
                  </div>

                  {/* Nút hành động nhanh ngay bên dưới tem */}
                  <div className="w-full grid grid-cols-2 gap-2 mt-3.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5 font-semibold bg-background hover:bg-muted shadow-xs"
                      onClick={() => handleDownloadFullSticker(currentCell)}
                    >
                      <Download className="w-3.5 h-3.5 text-sky-600" />
                      Tải tem PNG
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5 font-semibold bg-background hover:bg-muted shadow-xs"
                      onClick={() => handleDownloadQrOnly(currentCell)}
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                      Tải chỉ mã QR
                    </Button>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (5 cols): Bảng chọn nhanh ô, Thông số kỹ thuật & Dữ liệu QR */}
              <div className="lg:col-span-5 p-6 bg-card flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Bộ chọn ô tủ trực quan */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-sky-500" />
                        Chọn ô tủ để xem tem:
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {cells.length} ô khả dụng
                      </span>
                    </div>

                    {/* Bộ lọc nhanh loại ô */}
                    <div className="flex items-center gap-1 mb-2 text-[10px]">
                      {(["ALL", "DRONE", "XL", "STANDARD"] as const).map((ft) => (
                        <button
                          key={ft}
                          type="button"
                          onClick={() => setFilterType(ft)}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            filterType === ft
                              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold"
                              : "bg-muted/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {ft === "ALL"
                            ? "Tất cả"
                            : ft === "DRONE"
                            ? "Drone"
                            : ft === "XL"
                            ? "Vali XL"
                            : "Tiêu chuẩn"}
                        </button>
                      ))}
                    </div>

                    {/* Lưới nút chọn ô */}
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl border bg-muted/20">
                      {filteredCells.map((c) => {
                        const isSelected = c.id === currentCell.id;
                        const isDroneBox = isDroneCell(c);
                        const isXlBox = isXlCell(c);

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedBoxId(c.id)}
                            className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-0.5 relative ${
                              isSelected
                                ? "bg-sky-600 text-white shadow-sm scale-105 ring-2 ring-sky-400/50"
                                : "bg-background hover:bg-muted text-foreground border border-border/70"
                            }`}
                            title={`Ô #${c.boxNumber} - ${
                              isDroneBox ? "Drone" : isXlBox ? "Vali XL" : "Tiêu chuẩn"
                            }`}
                          >
                            <span>#{c.boxNumber}</span>
                            {isDroneBox && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected ? "bg-white" : "bg-sky-500"
                                } ml-0.5`}
                              />
                            )}
                            {isXlBox && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected ? "bg-white" : "bg-violet-500"
                                } ml-0.5`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thông tin kỹ thuật ô đang chọn */}
                  <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-sky-500" />
                        Thông số kỹ thuật ô #{currentCell.boxNumber}
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                        ID: {currentCell.id}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Trạng thái chốt:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {currentCell.doorState === "OPEN" ? (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] gap-1 font-semibold">
                              <Unlock className="w-3 h-3" /> Đang mở
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] gap-1 font-semibold">
                              <Lock className="w-3 h-3" /> Đã đóng
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-muted-foreground block">Tọa độ ma trận:</span>
                        <span className="font-semibold text-foreground">
                          Hàng {currentCell.rowIndex ?? 1} · Cột {currentCell.colIndex ?? 1}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-muted-foreground block">Kích cỡ khoang:</span>
                        <span className="font-semibold text-foreground">Size {currentCell.size || "M"}</span>
                      </div>

                      <div>
                        <span className="text-[11px] text-muted-foreground block">Công năng:</span>
                        <span className="font-semibold text-foreground">
                          {isDrone ? "Tiếp nhận Drone" : isXl ? "Khoang Vali" : "Ô đa năng"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dữ liệu mã QR (Payload JSON) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-muted-foreground flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        Payload mã QR (JSON):
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 text-sky-600 dark:text-sky-400 hover:text-sky-700"
                        onClick={handleCopy}
                      >
                        {copied ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copied ? "Đã sao chép" : "Sao chép JSON"}
                      </Button>
                    </div>
                    <pre className="font-mono text-[10px] p-2.5 bg-muted/60 dark:bg-slate-900 rounded-xl border border-border/80 overflow-x-auto text-muted-foreground max-h-24 whitespace-pre-wrap break-all">
                      {currentQrValue}
                    </pre>
                  </div>
                </div>

                {/* Thanh chỉ dẫn in ấn */}
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 flex items-center gap-2.5 text-xs text-sky-900 dark:text-sky-200">
                  <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    Bấm <strong>"In tem nhãn"</strong> ở góc dưới để mở bảng điều khiển in hoặc lưu file PDF decal.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ================= CHẾ ĐỘ IN TOÀN BỘ TỦ ================= */
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-sky-950 dark:text-sky-100">
                      In toàn bộ tem nhãn của trạm tủ ({cells.length} ô)
                    </p>
                    <p className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                      Hệ thống tự động sắp xếp lưới tem nhãn chuẩn khổ giấy A4. Bấm "In tất cả" để in trực tiếp hoặc xuất PDF dán lên toàn bộ các cánh tủ vật lý.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shrink-0 gap-1.5"
                  onClick={handlePrint}
                >
                  <Printer className="w-3.5 h-3.5" />
                  In tất cả ({cells.length} tem)
                </Button>
              </div>

              {/* Lưới xem trước tất cả tem nhãn */}
              <div
                id="printable-all-stickers"
                className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-1"
              >
                {cells.map((c) => {
                  const isCellDrone = isDroneCell(c);
                  const isCellXl = isXlCell(c);
                  const qrVal = getQrValue(c);

                  return (
                    <div
                      key={c.id}
                      className="border-2 border-slate-900 rounded-xl p-3 bg-white text-slate-900 flex flex-col items-center text-center space-y-2 shadow-xs transition-shadow hover:shadow-md"
                    >
                      {/* Mini Header */}
                      <div className="w-full flex items-center justify-between border-b pb-1 text-[10px] border-slate-200 font-bold">
                        <span className="font-mono">{lockerCode}</span>
                        <span className="text-sky-700 font-extrabold text-xs">Ô #{c.boxNumber}</span>
                      </div>

                      {/* Mini QR */}
                      <div className="p-1 bg-white">
                        <QRCodeSVG id={`qr-svg-${c.id}`} value={qrVal} size={110} level="M" />
                      </div>

                      {/* Mini Specs */}
                      <div className="w-full text-[10px] text-left bg-slate-50 p-1.5 rounded-lg border border-slate-200 space-y-0.5">
                        <p className="font-bold truncate text-slate-900">
                          {isCellDrone ? "Drone Pad" : isCellXl ? "Vali XL" : "Tiêu chuẩn"} · Size {c.size || "M"}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono">
                          Hàng {c.rowIndex ?? 1} · Cột {c.colIndex ?? 1} · ID: {c.id}
                        </p>
                      </div>

                      <div className="w-full grid grid-cols-2 gap-1 print:hidden">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => handleDownloadFullSticker(c)}
                        >
                          <Download className="w-2.5 h-2.5" /> Tem
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => handleDownloadQrOnly(c)}
                        >
                          <FileDown className="w-2.5 h-2.5" /> QR
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal duy nhất */}
        <DialogFooter className="p-3 px-6 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            Tem nhãn kích thước chuẩn 80×100mm · Hỗ trợ máy in nhiệt decal và máy in A4
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs gap-1.5 font-semibold"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5" />
              {printMode === "single"
                ? `In tem nhãn ô #${currentCell.boxNumber}`
                : `In tất cả ${cells.length} tem nhãn`}
            </Button>
          </div>
        </DialogFooter>

        {/* CSS in ấn chuyên dụng khổ giấy A4 và máy in tem nhãn */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-box-sticker,
            #printable-box-sticker *,
            #printable-all-stickers,
            #printable-all-stickers * {
              visibility: visible !important;
            }
            #printable-box-sticker {
              position: fixed !important;
              left: 50% !important;
              top: 40px !important;
              transform: translateX(-50%) !important;
              width: 380px !important;
              box-shadow: none !important;
              border: 2px solid #000 !important;
              page-break-after: always;
            }
            html,
            body {
              height: auto !important;
              overflow: visible !important;
              background: #fff !important;
            }
            .box-qr-dialog {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              transform: none !important;
              translate: none !important;
              animation: none !important;
              max-height: none !important;
              max-width: none !important;
              width: 100% !important;
              overflow: visible !important;
              border: 0 !important;
              box-shadow: none !important;
            }
            #printable-all-stickers {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 16px !important;
              padding: 20px !important;
            }
            #printable-all-stickers > div {
              break-inside: avoid;
              page-break-inside: avoid;
              box-shadow: none !important;
              border: 2px solid #000 !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

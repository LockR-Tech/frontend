import { useState, useRef } from "react";
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
import {
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  Plane,
  Box as BoxIcon,
  Luggage,
  Layers,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { type CellResponse } from "~/stores/apis/admin/lockerOps";

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
  lockerName = "Tủ đồ Lock.R",
  lockerCode = "CAB-01",
}: BoxQrModalProps) {
  const [printMode, setPrintMode] = useState<"single" | "all">("single");
  const [copied, setCopied] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!cell && cells.length === 0) return null;

  const currentCell = cell ?? cells[0];
  if (!currentCell) return null;

  const isDrone =
    currentCell.cellType === "DRONE" ||
    (!currentCell.cellType &&
      currentCell.cellType !== "XL" &&
      currentCell.boxNumber !== 1 &&
      (currentCell.boxNumber === 2 || currentCell.boxNumber === 3));

  // Định dạng dữ liệu mã QR chuẩn JSON
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
        (c.boxNumber === 1 || c.colIndex === 0
          ? "XL"
          : c.boxNumber === 2 || c.boxNumber === 3
          ? "DRONE"
          : "STANDARD"),
      size: c.size || "M",
    });
  };

  const currentQrValue = getQrValue(currentCell);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentQrValue);
    setCopied(true);
    toast.success("Đã sao chép nội dung mã QR vào clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = (c: CellResponse) => {
    try {
      const svg = document.getElementById(`qr-svg-${c.id}`);
      if (!svg) {
        toast.error("Không tìm thấy mã QR");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      canvas.width = 300;
      canvas.height = 300;

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, 300, 300);
          const a = document.createElement("a");
          a.download = `QR-Tu-${lockerCode}-O-${c.boxNumber}.png`;
          a.href = canvas.toDataURL("image/png");
          a.click();
          toast.success(`Đã tải ảnh mã QR ô #${c.boxNumber}`);
        }
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      toast.error("Không thể tải ảnh QR");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <QrCode className="w-5 h-5 text-primary" />
              Mã QR dán ô tủ #{currentCell.boxNumber}
            </DialogTitle>
            <div className="inline-flex rounded-md border border-border p-0.5 text-xs mr-6">
              <button
                type="button"
                className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                  printMode === "single"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPrintMode("single")}
              >
                Ô #{currentCell.boxNumber}
              </button>
              <button
                type="button"
                className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                  printMode === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPrintMode("all")}
              >
                In cả tủ ({cells.length} ô)
              </button>
            </div>
          </div>
          <DialogDescription className="text-xs">
            In tem nhãn mã QR này để dán trực tiếp lên cánh cửa tủ vật lý. Kỹ thuật viên và người dùng có thể quét để kiểm thử hoặc thao tác.
          </DialogDescription>
        </DialogHeader>

        {printMode === "single" ? (
          /* Chế độ xem & in 1 ô */
          <div className="py-2 space-y-4">
            {/* Thẻ tem nhãn in (Printable Label Card) */}
            <div
              id="printable-box-sticker"
              className="border-2 border-slate-800 dark:border-slate-300 rounded-xl p-5 bg-white text-slate-900 shadow-md flex flex-col items-center text-center space-y-3"
            >
              {/* Header tem */}
              <div className="w-full flex items-center justify-between border-b pb-2 border-slate-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    LR
                  </div>
                  <span className="font-bold tracking-tight text-sm text-slate-900">Lock.R System</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-700">{lockerCode}</span>
                  <p className="text-[9px] text-slate-500">Tủ #{lockerId}</p>
                </div>
              </div>

              {/* Tên tủ & Số ô cực to */}
              <div className="space-y-0.5">
                <p className="text-xs text-slate-600 font-medium">{lockerName}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-black tracking-tight text-slate-950">
                    Ô #{currentCell.boxNumber}
                  </span>
                  {isDrone && (
                    <Badge className="bg-sky-600 text-white border-0 text-[10px] font-bold px-2 py-0.5">
                      DRONE
                    </Badge>
                  )}
                  {currentCell.cellType === "XL" && (
                    <Badge className="bg-indigo-600 text-white border-0 text-[10px] font-bold px-2 py-0.5">
                      VALI XL
                    </Badge>
                  )}
                </div>
              </div>

              {/* QR Code SVG */}
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <QRCodeSVG
                  id={`qr-svg-${currentCell.id}`}
                  value={currentQrValue}
                  size={175}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Thông số kỹ thuật của ô */}
              <div className="w-full bg-slate-50 rounded-lg p-2.5 text-[11px] border border-slate-200 grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-slate-500 block text-[10px]">CÔNG NĂNG:</span>
                  <span className="font-bold text-slate-800">
                    {isDrone
                      ? "Tiếp nhận Drone"
                      : currentCell.cellType === "XL"
                      ? "Khoang Vali (XL)"
                      : "Ô tiêu chuẩn đa năng"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">KÍCH CỠ:</span>
                  <span className="font-bold text-slate-800">
                    Size {currentCell.size || "M"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">VỊ TRÍ:</span>
                  <span className="font-semibold text-slate-700">
                    Hàng {currentCell.rowIndex ?? 1} · Cột {currentCell.colIndex ?? 1}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MÃ ĐỊNH DANH (ID):</span>
                  <span className="font-mono text-slate-700">BOX-{currentCell.id}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic">
                * Quét mã QR này bằng Ứng dụng Lock.R để thao tác hoặc kiểm tra ô tủ
              </p>
            </div>

            {/* Chi tiết dữ liệu chuỗi QR */}
            <div className="p-2.5 rounded-lg border bg-muted/30 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Payload mã QR (JSON):</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? "Đã chép" : "Sao chép"}
                </Button>
              </div>
              <pre className="font-mono text-[10px] p-2 bg-background rounded border overflow-x-auto text-muted-foreground">
                {currentQrValue}
              </pre>
            </div>
          </div>
        ) : (
          /* Chế độ xem cả tủ để in 1 lượt */
          <div className="py-2 space-y-4">
            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Chế độ in hàng loạt cả tủ ({cells.length} ô tủ)</p>
                <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5">
                  Bấm nút &quot;In toàn bộ nhãn&quot; bên dưới để in lưới tem nhãn cho tất cả các ô trong tủ #{lockerId}. Bạn có thể cắt ra và dán lên từng ô tủ thật để test.
                </p>
              </div>
            </div>

            <div
              id="printable-all-stickers"
              className="grid grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto p-1"
            >
              {cells.map((c) => {
                const isCellDrone =
                  c.cellType === "DRONE" ||
                  (!c.cellType &&
                    c.cellType !== "XL" &&
                    c.boxNumber !== 1 &&
                    (c.boxNumber === 2 || c.boxNumber === 3));
                const qrVal = getQrValue(c);

                return (
                  <div
                    key={c.id}
                    className="border border-slate-800 rounded-lg p-3 bg-white text-slate-900 flex flex-col items-center text-center space-y-2 shadow-xs"
                  >
                    <div className="w-full flex items-center justify-between border-b pb-1 text-[10px] border-slate-200 font-bold">
                      <span>{lockerCode}</span>
                      <span>Ô #{c.boxNumber}</span>
                    </div>

                    <div className="p-1 bg-white">
                      <QRCodeSVG id={`qr-svg-${c.id}`} value={qrVal} size={110} level="M" />
                    </div>

                    <div className="w-full text-[10px] text-left bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5">
                      <p className="font-bold truncate text-slate-800">
                        {isCellDrone ? "Drone Pad" : c.cellType === "XL" ? "Vali (XL)" : "Tiêu chuẩn"} · Size {c.size || "M"}
                      </p>
                      <p className="text-[9px] text-slate-500">ID: {c.id} · Hàng {c.rowIndex} Cột {c.colIndex}</p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 w-full text-[10px]"
                      onClick={() => handleDownloadPng(c)}
                    >
                      <Download className="w-3 h-3 mr-1" /> Tải PNG
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t">
          <div className="flex items-center gap-2">
            {printMode === "single" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleDownloadPng(currentCell)}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Tải ảnh QR (PNG)
              </Button>
            )}
          </div>

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
              className="text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              {printMode === "single" ? `In tem nhãn ô #${currentCell.boxNumber}` : `In tất cả ${cells.length} tem nhãn`}
            </Button>
          </div>
        </DialogFooter>

        {/* Global Print Stylesheet for clean sticker printing */}
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
              top: 50px !important;
              transform: translateX(-50%) !important;
              width: 380px !important;
              box-shadow: none !important;
              border: 2px solid #000 !important;
              page-break-after: always;
            }
            #printable-all-stickers {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 15px !important;
              padding: 20px !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

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
  Trash2,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { type CellResponse, useAssignArucoMarkerMutation, useUnassignArucoMarkerMutation } from "~/stores/apis/admin/lockerOps";
import { ArucoMarker } from "~/components/ArucoMarker";
import arucoDictData from "~/lib/arucoDict4x4.json";
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
  const [printMode, setPrintMode] = useState<"single" | "all" | "aruco">("single");
  const [assignArucoMutation, { isLoading: isAssigningAruco }] = useAssignArucoMarkerMutation();
  const [unassignArucoMutation, { isLoading: isUnassigningAruco }] = useUnassignArucoMarkerMutation();
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
        ctx.fillText(`Cửa: ${c.doorOpen ? "OPEN" : "CLOSED"}`, canvas.width - 54, boxY + 36);
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


  const handleAssignAruco = async () => {
    if (!currentCell) return;
    try {
      const res = await assignArucoMutation({ boxId: currentCell.id }).unwrap();
      toast.success(`Đã gán mã ArUco #${res.data?.arucoMarkerId ?? "mới"} cho ô #${currentCell.boxNumber}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Không thể gán mã ArUco");
    }
  };

  const handleUnassignAruco = async () => {
    if (!currentCell) return;
    if (!window.confirm(`Bạn có chắc muốn hủy gán mã ArUco cho ô #${currentCell.boxNumber}?`)) return;
    try {
      await unassignArucoMutation({ boxId: currentCell.id }).unwrap();
      toast.success(`Đã hủy gán mã ArUco cho ô #${currentCell.boxNumber}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Không thể hủy gán mã ArUco");
    }
  };

  const handlePrintAruco = () => {
    if (!currentCell || currentCell.arucoMarkerId === null || currentCell.arucoMarkerId === undefined) {
      toast.error("Ô tủ chưa có mã ArUco để in");
      return;
    }

    const dict = arucoDictData as Record<string, number[][]>;
    const grid6x6 = dict[String(currentCell.arucoMarkerId)];
    if (!grid6x6) {
      toast.error(`Không tìm thấy ma trận cho mã ArUco #${currentCell.arucoMarkerId}`);
      return;
    }

    let iframe = document.getElementById("aruco-print-frame") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "aruco-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }

    let rects = "";
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const fill = grid6x6[r][c] === 0 ? "#000000" : "#ffffff";
        rects += `<rect x="${c + 1}" y="${r + 1}" width="1.005" height="1.005" fill="${fill}" />`;
      }
    }

    const markerId = currentCell.arucoMarkerId;
    const dictionary = currentCell.arucoDictionary || "DICT_4X4_50";
    const boxNumber = currentCell.boxNumber;

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ArUco_ID-${markerId}_Tu-${lockerCode}_O-${boxNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 210mm;
      height: 297mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 25mm;
    }
    .tem-card {
      width: 122mm;
      border: 1.5px dashed #475569;
      border-radius: 4mm;
      padding: 5mm;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .tem-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2.5mm;
      margin-bottom: 2mm;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 2mm;
    }
    .logo-box {
      width: 7mm;
      height: 7mm;
      border-radius: 1.5mm;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 8pt;
      letter-spacing: -0.5px;
    }
    .brand-title {
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1;
    }
    .brand-sub {
      font-size: 6.5pt;
      color: #64748b;
      font-weight: 500;
      margin-top: 0.8mm;
      line-height: 1;
    }
    .header-right {
      text-align: right;
    }
    .box-badge {
      font-size: 9pt;
      font-weight: 800;
      color: #0369a1;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 0.8mm 2.5mm;
      border-radius: 1.5mm;
      display: inline-block;
      line-height: 1.2;
    }
    .locker-info {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 0.8mm;
      max-width: 55mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .marker-label {
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 1.5mm;
      text-align: center;
    }
    .svg-wrapper {
      width: 106.667mm;
      height: 106.667mm;
      display: block;
      margin: 0 auto;
    }
    svg {
      width: 106.667mm;
      height: 106.667mm;
      display: block;
    }
    .tem-footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 2.5mm;
      margin-top: 2.5mm;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10pt;
      font-weight: 700;
      color: #1e293b;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="tem-card">
      <div class="tem-header">
        <div class="brand">
          <div class="logo-box">LR</div>
          <div>
            <div class="brand-title">LOCK.R SYSTEM</div>
            <div class="brand-sub">Smart Locker Network</div>
          </div>
        </div>
        <div class="header-right">
          <div class="box-badge">Ô #${boxNumber}</div>
          <div class="locker-info">${displayLockerName} (${lockerCode})</div>
        </div>
      </div>
      <div class="marker-label">ARUCO MARKER</div>
      <div class="svg-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">
          <rect x="0" y="0" width="8" height="8" fill="#ffffff" />
          ${rects}
          <rect x="0.03" y="0.03" width="7.94" height="7.94" fill="none" stroke="#94a3b8" stroke-width="0.04" stroke-dasharray="0.12 0.08" />
        </svg>
      </div>
      <div class="tem-footer">
        <span>${dictionary}</span>
        <span>ID: #${markerId}</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  const handlePrint = () => {
    if (printMode === "aruco") {
      handlePrintAruco();
    } else {
      window.print();
    }
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
              {isDrone && (
                <button
                  type="button"
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    printMode === "aruco"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setPrintMode("aruco")}
                >
                  <Plane className="w-3.5 h-3.5 text-sky-500" />
                  <span>Mã ArUco ô #{currentCell.boxNumber}</span>
                </button>
              )}
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
          {printMode === "aruco" ? (
            /* ================= CHẾ ĐỘ ARUCO DRONE STUDIO ================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[500px]">
              {/* CỘT TRÁI (7 cols): Studio mô phỏng tem ArUco nắp trượt thực tế */}
              <div className="lg:col-span-7 p-6 bg-slate-100/90 dark:bg-slate-900/60 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border/80">
                <div className="w-full max-w-[370px] flex flex-col items-center">
                  <div className="w-full flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2.5 px-1">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Plane className="w-3.5 h-3.5 text-sky-500" />
                      Mô phỏng tem ArUco
                    </span>
                    <span className="font-mono text-[10px] bg-background/80 px-2 py-0.5 rounded-md border border-border/60 text-sky-700 dark:text-sky-400 font-bold">
                      Marker: 80 × 80 mm
                    </span>
                  </div>

                  {/* THẺ TEM ARUCO IN HOÀN CHỈNH (PRINTABLE ARUCO) */}
                  <div
                    id="printable-aruco-marker"
                    className="w-full bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-xl p-5 flex flex-col items-center text-center space-y-3 relative overflow-hidden"
                  >
                    {/* Header thông tin bên ngoài vùng marker */}
                    <div className="w-full border-b pb-2.5 border-slate-200 flex items-center justify-between text-left">
                      {/* Logo thương hiệu LOCK.R SYSTEM */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs tracking-tighter shadow-xs">
                          LR
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold text-xs tracking-wider text-slate-950 uppercase leading-none">
                            LOCK.R SYSTEM
                          </p>
                          <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">
                            Smart Locker Network
                          </p>
                        </div>
                      </div>

                      {/* Thông tin số ô & Tên tủ */}
                      <div className="text-right">
                        <span className="font-mono text-xs font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Ô #{currentCell.boxNumber}
                        </span>
                        <p className="text-[9px] text-slate-500 font-medium truncate max-w-[150px] mt-0.5" title={`${displayLockerName} (${lockerCode})`}>
                          {displayLockerName} ({lockerCode})
                        </p>
                      </div>
                    </div>

                    {/* Tiêu đề ArUco Marker đặt ở vị trí trung tâm trang trọng */}
                    <div className="w-full text-center pt-0.5">
                      <span className="font-extrabold text-xs tracking-widest text-slate-900 uppercase">
                        ARUCO MARKER
                      </span>
                    </div>

                    {/* Vùng Marker ArUco chính xác */}
                    {currentCell.arucoMarkerId !== null && currentCell.arucoMarkerId !== undefined ? (
                      <div className="p-1 bg-white flex flex-col items-center justify-center">
                        <ArucoMarker
                          markerId={currentCell.arucoMarkerId}
                          dictionary={currentCell.arucoDictionary || "DICT_4X4_50"}
                          sizePx={220}
                          showQuietZone={true}
                          showCutBorder={true}
                          className="aruco-svg-element"
                        />
                      </div>
                    ) : (
                      <div className="w-[200px] h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-muted-foreground p-4">
                        <Plane className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">Chưa gán mã ArUco</p>
                        <p className="text-[10px] text-slate-500 mt-1">Bấm "Gán mã ArUco tự động" bên phải</p>
                      </div>
                    )}

                    {/* Footer thông tin: chỉ hiện DICT_4X4_50 và ID: # */}
                    <div className="w-full border-t pt-2.5 border-slate-200 flex items-center justify-between font-mono text-xs text-slate-800 font-bold">
                      <span>{currentCell.arucoDictionary || "DICT_4X4_50"}</span>
                      <span>
                        ID: #{currentCell.arucoMarkerId !== null && currentCell.arucoMarkerId !== undefined ? currentCell.arucoMarkerId : "---"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (5 cols): Thông số kỹ thuật & Hướng dẫn in */}
              <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Plane className="w-4 h-4 text-sky-500" />
                      Thông số mã ArUco
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Định danh quang học nắp trượt tiếp nhận Drone
                    </p>
                  </div>

                  {/* Bảng thông số ngắn gọn */}
                  <div className="rounded-xl border bg-muted/20 p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-border/60">
                      <span className="text-muted-foreground">Dictionary:</span>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        {currentCell.arucoDictionary || "DICT_4X4_50"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/60">
                      <span className="text-muted-foreground">Marker ID:</span>
                      <strong className="font-mono text-sm text-foreground">
                        {currentCell.arucoMarkerId !== null && currentCell.arucoMarkerId !== undefined ? (
                          `#${currentCell.arucoMarkerId}`
                        ) : (
                          <span className="text-amber-600 text-xs font-normal">Chưa gán</span>
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/60">
                      <span className="text-muted-foreground">Kích thước vùng mã:</span>
                      <strong className="font-semibold text-emerald-700 dark:text-emerald-400">80 × 80 mm (8 × 8 cm)</strong>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-muted-foreground">Vùng an toàn (Quiet Zone):</span>
                      <span className="font-mono text-muted-foreground">1 module (13.3 mm)</span>
                    </div>
                  </div>

                  {/* Thao tác Gán / Hủy mã */}
                  {currentCell.arucoMarkerId === null || currentCell.arucoMarkerId === undefined ? (
                    <div className="p-3.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 space-y-2.5">
                      <p className="text-xs text-sky-900 dark:text-sky-200">
                        Ô này chưa có mã ArUco. Bấm để hệ thống tự động cấp phát ID nhỏ nhất chưa dùng trong <strong>DICT_4X4_50</strong>.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleAssignAruco}
                        disabled={isAssigningAruco}
                        className="w-full gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isAssigningAruco ? "Đang gán..." : "Gán mã ArUco tự động"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUnassignAruco}
                        disabled={isUnassigningAruco}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hủy gán mã
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAssignAruco}
                        disabled={isAssigningAruco}
                        className="text-xs gap-1.5 text-muted-foreground cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Cấp lại mã khác
                      </Button>
                    </div>
                  )}

                  {/* Hướng dẫn in ngắn gọn */}
                  <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 text-xs space-y-1.5">
                    <p className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      Lưu ý khi in chuẩn kích thước 80 × 80 mm:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                      <li>Trong hộp thoại in, mục <strong>Tỷ lệ (Scale)</strong>: Chọn <strong>100% (Actual size)</strong>.</li>
                      <li>Tắt mục <strong>Tiêu đề và chân trang (Headers & footers)</strong>.</li>
                      <li>Khổ giấy: <strong>A4</strong> (Bản in chỉ có đúng 1 trang và không bị tràn trang).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : printMode === "single" ? (
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
                          {currentCell.doorOpen ? (
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
              {printMode === "aruco"
                ? `In tem ArUco ô #${currentCell.boxNumber}`
                : printMode === "single"
                ? `In tem nhãn ô #${currentCell.boxNumber}`
                : `In tất cả ${cells.length} tem nhãn`}
            </Button>
          </div>
        </DialogFooter>

        {/* CSS in ấn chuyên dụng khổ giấy A4 và máy in tem nhãn */}
        <style>{`
          @page {
            size: A4 portrait;
            margin: 0;
          }
          @media print {
            body > #root {
              display: none !important;
            }
            [data-radix-portal] > div:first-child {
              display: none !important;
            }
            body * {
              visibility: hidden !important;
            }
            #printable-box-sticker,
            #printable-box-sticker *,
            #printable-aruco-marker,
            #printable-aruco-marker *,
            #printable-all-stickers,
            #printable-all-stickers * {
              visibility: visible !important;
            }

            /* Container tem ArUco Drone nắp trượt */
            #printable-aruco-marker {
              position: absolute !important;
              left: 50% !important;
              top: 30mm !important;
              transform: translateX(-50%) !important;
              width: 122mm !important;
              max-width: 122mm !important;
              box-shadow: none !important;
              border: 1.5px dashed #475569 !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
              padding: 6mm !important;
              border-radius: 4mm !important;
            }

            /* Marker SVG 8x8 viewBox: 106.667mm => vùng marker đen 6x6 bên trong chính xác 80x80mm */
            #printable-aruco-marker .aruco-svg-element {
              width: 106.667mm !important;
              height: 106.667mm !important;
              min-width: 106.667mm !important;
              min-height: 106.667mm !important;
              max-width: none !important;
              display: block !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }

            /* Tem ô tủ đơn lẻ */
            #printable-box-sticker {
              position: absolute !important;
              left: 50% !important;
              top: 15mm !important;
              transform: translateX(-50%) !important;
              width: 380px !important;
              box-shadow: none !important;
              border: 2px solid #000 !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
            }

            html,
            body {
              height: 100% !important;
              overflow: hidden !important;
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

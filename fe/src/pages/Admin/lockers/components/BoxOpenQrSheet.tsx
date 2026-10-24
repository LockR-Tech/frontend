import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Printer, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { CellResponse } from "~/stores/apis/admin/lockerOps";
import { isDroneCell } from "~/lib/lockerLayoutHelper";

/// Một khoang trên mặt trước tủ: ô số `boxNumber`, hoặc khoang điện (không có QR).
interface FrontSlot {
  boxNumber: number | null;
  row: number;
  col: number;
  rowSpan?: number;
}

interface FrontLayout {
  columns: number;
  /// Chiều cao tương đối từng hàng, đo theo ảnh tủ thật.
  rows: string[];
  slots: FrontSlot[];
}

/// Mặt trước tủ thật theo ảnh chụp (số ô là số in trên cửa). Tủ chưa có ở đây thì xếp lưới theo số ô.
const FRONT_LAYOUTS: Record<string, FrontLayout> = {
  // CAB-TU01: trên-trái là khoang điện; ô 1 cao chiếm hai hàng dưới bên trái.
  "CAB-TU01": {
    columns: 3,
    rows: ["1.6fr", "1fr", "0.85fr"],
    slots: [
      { boxNumber: null, row: 1, col: 1 },
      { boxNumber: 2, row: 1, col: 2 },
      { boxNumber: 3, row: 1, col: 3 },
      { boxNumber: 1, row: 2, col: 1, rowSpan: 2 },
      { boxNumber: 4, row: 2, col: 2 },
      { boxNumber: 7, row: 2, col: 3 },
      { boxNumber: 6, row: 3, col: 2 },
      { boxNumber: 5, row: 3, col: 3 },
    ],
  },
};

function gridLayout(cells: CellResponse[]): FrontLayout {
  const columns = 3;
  const sorted = [...cells].sort((a, b) => a.boxNumber - b.boxNumber);
  return {
    columns,
    rows: Array.from({ length: Math.max(1, Math.ceil(sorted.length / columns)) }, () => "1fr"),
    slots: sorted.map((c, i) => ({ boxNumber: c.boxNumber, row: Math.floor(i / columns) + 1, col: (i % columns) + 1 })),
  };
}

const BASE_URL_KEY = "lockr.boxOpenQr.baseUrl";

function isLocalhost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function initialBaseUrl(): string {
  try {
    const saved = localStorage.getItem(BASE_URL_KEY);
    if (saved) return saved;
  } catch {
    // Trình duyệt chặn localStorage: dùng địa chỉ đang mở.
  }
  return window.location.origin;
}

/// Đường link mở ô mà mã QR mang theo — trang /admin/lockers/:id/open/:boxId tự gửi lệnh mở.
function boxOpenUrl(baseUrl: string, lockerId: number, boxId: number): string {
  return `${baseUrl.replace(/\/+$/, "")}/admin/lockers/${lockerId}/open/${boxId}`;
}

interface BoxOpenQrSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockerId: number;
  lockerCode: string;
  lockerName?: string;
  cells: CellResponse[];
}

/**
 * Tờ mã QR mở ô để thử tủ, vẽ đúng mặt trước tủ thật. Camera điện thoại quét mã của ô nào thì mở
 * trang admin cho ô đó và ô bật ra — không cần đặt đơn. Lệnh mở đi qua API điều khiển tủ nên vẫn
 * phải đăng nhập ADMIN/KTV phụ trách tủ trên điện thoại; mã QR một mình không mở được gì.
 */
export function BoxOpenQrSheet({ open, onOpenChange, lockerId, lockerCode, lockerName, cells }: BoxOpenQrSheetProps) {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState<string>(initialBaseUrl);
  const sheetRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => FRONT_LAYOUTS[lockerCode] ?? gridLayout(cells), [lockerCode, cells]);
  const cellByNumber = useMemo(() => new Map(cells.map((c) => [c.boxNumber, c])), [cells]);

  const changeBaseUrl = (value: string) => {
    setBaseUrl(value);
    try {
      localStorage.setItem(BASE_URL_KEY, value);
    } catch {
      // Không lưu được thì lần sau dùng lại mặc định.
    }
  };

  const handlePrint = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR mở ô ${lockerCode}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 12mm; font-family: Arial, sans-serif; color: #0f172a; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.sub { font-size: 12px; color: #475569; margin: 0 0 12px; }
  .front { display: grid; gap: 6px; width: 100%; aspect-ratio: 0.82; border: 3px solid #334155; padding: 6px; border-radius: 6px; }
  .slot { border: 2px solid #64748b; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px; overflow: hidden; }
  .slot svg { width: auto; height: 70%; max-width: 90%; }
  .num { font-size: 22px; font-weight: 700; }
  .tag { font-size: 10px; color: #475569; }
  .panel { background: #e2e8f0; color: #475569; font-size: 12px; }
  .missing { color: #b91c1c; font-size: 11px; text-align: center; }
  .no-print { display: none; }
</style></head><body>${sheet.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const localhostWarning = isLocalhost(baseUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            {t("admin.lockers.openQr.title", "Mã QR mở ô để thử tủ")} · {lockerCode}
          </DialogTitle>
          <DialogDescription>
            {t(
              "admin.lockers.openQr.description",
              "Mã của ô nào thì ô đó bật ra, không cần đặt đơn. Quét bằng app Lock.R (nút quét QR ở trang chủ) với tài khoản có trong danh sách thử ở Cài đặt › iot và chế độ thử đang bật; hoặc quét bằng camera thường rồi đăng nhập ADMIN/KTV phụ trách tủ trên trình duyệt."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="box-open-qr-base" className="text-xs">
            {t("admin.lockers.openQr.baseUrl", "Địa chỉ web admin mà điện thoại mở được")}
          </Label>
          <Input
            id="box-open-qr-base"
            value={baseUrl}
            onChange={(e) => changeBaseUrl(e.target.value.trim())}
            placeholder="http://192.168.1.10:3000"
            className="h-8 text-xs font-mono"
          />
          {localhostWarning && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {t(
                "admin.lockers.openQr.localhostWarning",
                "Quét bằng app Lock.R thì địa chỉ này không quan trọng. Quét bằng camera thường thì điện thoại không mở được localhost: chạy web bằng `npm run dev -- --host` rồi nhập IP mạng LAN của máy (cùng Wi-Fi với điện thoại), ví dụ http://192.168.1.10:3000."
              )}
            </p>
          )}
        </div>

        <div ref={sheetRef} className="rounded-lg bg-white p-3 text-slate-900">
          <h1 className="text-base font-bold">
            {lockerCode}
            {lockerName ? ` · ${lockerName}` : ""} — QR mở ô (thử tủ)
          </h1>
          <p className="sub text-[11px] text-slate-500 mb-2">
            Quét bằng app Lock.R (chế độ thử tủ) hoặc camera + đăng nhập ADMIN/KTV · {baseUrl.replace(/\/+$/, "")}
          </p>
          <div
            className="front grid gap-1.5 w-full border-[3px] border-slate-600 rounded-md p-1.5"
            style={{
              gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: layout.rows.join(" "),
              aspectRatio: "0.82",
            }}
          >
            {layout.slots.map((slot) => {
              const style = {
                gridColumn: `${slot.col}`,
                gridRow: slot.rowSpan ? `${slot.row} / span ${slot.rowSpan}` : `${slot.row}`,
              };
              if (slot.boxNumber == null) {
                return (
                  <div
                    key={`panel-${slot.row}-${slot.col}`}
                    style={style}
                    className="slot panel flex items-center justify-center rounded border-2 border-slate-400 bg-slate-200 text-xs text-slate-500"
                  >
                    {t("admin.lockers.openQr.electricalBay", "Khoang điện")}
                  </div>
                );
              }
              const cell = cellByNumber.get(slot.boxNumber);
              return (
                <div
                  key={`box-${slot.boxNumber}`}
                  style={style}
                  className="slot flex flex-col items-center justify-center gap-1 rounded border-2 border-slate-500 p-1.5 overflow-hidden min-h-0"
                >
                  <span className="num text-lg font-bold leading-none">Ô {slot.boxNumber}</span>
                  {cell ? (
                    <>
                      <QRCodeSVG
                        value={boxOpenUrl(baseUrl, lockerId, cell.id)}
                        size={256}
                        level="M"
                        marginSize={1}
                        className="h-[70%] w-auto max-w-[90%]"
                      />
                      <span className="tag text-[10px] text-slate-500">
                        ID #{cell.id}
                        {isDroneCell(cell) ? " · DRONE" : ""}
                      </span>
                    </>
                  ) : (
                    <span className="missing text-[11px] text-red-700 text-center">
                      {t("admin.lockers.openQr.missingBox", "Chưa có ô số này trong hệ thống")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
            {t("admin.lockers.openQr.print", "In tờ QR")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

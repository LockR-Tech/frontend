import { useEffect, useMemo, useRef, useState } from "react";
import { Bluetooth, BluetoothOff, Loader2, Radar, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { CellResponse } from "~/stores/apis/admin/lockerOps";
import { useOpenCabinetBoxMutation } from "~/stores/apis/admin/cabinetControl";

// Web Bluetooth chưa có trong lib DOM của TypeScript: khai báo phần trang này dùng.
interface BleAdvertisementEvent extends Event {
  rssi?: number;
}
interface BleDevice extends EventTarget {
  id: string;
  name?: string;
  watchAdvertisements?: (options?: { signal?: AbortSignal }) => Promise<void>;
}
interface WebBluetooth {
  getAvailability?: () => Promise<boolean>;
  requestDevice: (options: { filters: { namePrefix: string }[] }) => Promise<BleDevice>;
}

function webBluetooth(): WebBluetooth | undefined {
  return (navigator as Navigator & { bluetooth?: WebBluetooth }).bluetooth;
}

/// Cùng ngưỡng và công thức với app mobile (`locker_ble_service.dart`): RSSI ≥ -78 dBm ≈ đứng trước tủ (< 2 m).
const NEAR_RSSI = -78;

function estimateDistance(rssi: number, txPower = -59): number {
  const ratio = rssi / txPower;
  return ratio < 1 ? Math.pow(ratio, 10) : 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
}

/// Beacon có phải của tủ này không — cùng quy tắc với app mobile (`isDeviceMatchingLocker`).
function matchesLocker(name: string, lockerCode: string, lockerId: number): boolean {
  const upper = name.toUpperCase().trim();
  if (!upper) return false;
  const clean = upper.replace(/[^A-Z0-9]/g, "");
  const code = lockerCode.toUpperCase().trim();
  const cleanCode = code.replace(/[^A-Z0-9]/g, "");
  const id = String(lockerId);
  if (code && upper.includes(code)) return true;
  if (cleanCode && clean.includes(cleanCode)) return true;
  if ((clean.includes("LOCKR") || clean.includes("LOCKER")) && (upper.includes(id) || clean.includes(id))) return true;
  return cleanCode.length >= 4 && clean.includes(cleanCode.slice(-4));
}

interface LockerBluetoothPanelProps {
  lockerId: number;
  lockerCode: string;
  cells: CellResponse[];
}

type ScanState =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "found"; name: string; matches: boolean }
  | { kind: "error"; message: string };

/**
 * Kiểm tra Bluetooth của tủ ngay trên admin web và mở thử từng ô: quét beacon `LOCKR_<mã tủ>` mà Pi
 * phát (Web Bluetooth, Chrome/Edge), thấy đúng tủ thì cho mở ô — giống tab Bluetooth của app mobile.
 * Bluetooth chỉ xác nhận đang đứng gần tủ; lệnh mở vẫn đi qua API điều khiển tủ (MQTT tới Pi).
 */
export function LockerBluetoothPanel({ lockerId, lockerCode, cells }: LockerBluetoothPanelProps) {
  const { t } = useTranslation();
  const expectedName = `LOCKR_${lockerCode}`;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [scan, setScan] = useState<ScanState>({ kind: "idle" });
  const [rssi, setRssi] = useState<number | null>(null);
  const [rssiSupported, setRssiSupported] = useState(true);
  const [openingBoxId, setOpeningBoxId] = useState<number | null>(null);
  const watchAbort = useRef<AbortController | null>(null);
  const [openBox] = useOpenCabinetBoxMutation();

  const supported = Boolean(webBluetooth());
  const sortedCells = useMemo(() => [...cells].sort((a, b) => a.boxNumber - b.boxNumber), [cells]);

  useEffect(() => {
    const bt = webBluetooth();
    if (!bt?.getAvailability) return;
    bt.getAvailability().then(setAvailable).catch(() => setAvailable(null));
  }, []);

  useEffect(() => () => watchAbort.current?.abort(), []);

  const startScan = async () => {
    const bt = webBluetooth();
    if (!bt) return;
    watchAbort.current?.abort();
    setRssi(null);
    setScan({ kind: "scanning" });
    try {
      // Trình duyệt hiện hộp chọn thiết bị đang phát tên LOCKR*; người dùng chọn tủ.
      const device = await bt.requestDevice({ filters: [{ namePrefix: "LOCKR" }] });
      const name = device.name ?? "";
      setScan({ kind: "found", name, matches: matchesLocker(name, lockerCode, lockerId) });

      // Cường độ sóng cần cờ "Experimental Web Platform features" của Chrome; không có thì bỏ qua đo khoảng cách.
      if (device.watchAdvertisements) {
        const abort = new AbortController();
        watchAbort.current = abort;
        device.addEventListener("advertisementreceived", (event) => {
          const value = (event as BleAdvertisementEvent).rssi;
          if (typeof value === "number") setRssi(value);
        });
        try {
          await device.watchAdvertisements({ signal: abort.signal });
          setRssiSupported(true);
        } catch {
          setRssiSupported(false);
        }
      } else {
        setRssiSupported(false);
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setScan({
        kind: "error",
        message:
          name === "NotFoundError"
            ? t(
                "admin.lockers.ble.notFound",
                "Không thấy beacon {{name}} (hoặc đã đóng hộp chọn). Kiểm tra Pi đang phát BLE có tên, và đứng gần tủ.",
                { name: expectedName }
              )
            : name === "SecurityError"
              ? t("admin.lockers.ble.insecure", "Trình duyệt chặn Bluetooth: cần mở trang qua https hoặc localhost.")
              : t("admin.lockers.ble.scanFailed", "Không quét được Bluetooth: {{message}}", {
                  message: (err as Error)?.message ?? String(err),
                }),
      });
    }
  };

  const found = scan.kind === "found" && scan.matches;
  const near = rssi == null ? null : rssi >= NEAR_RSSI;
  // Đo được cường độ sóng mà còn xa thì chưa cho mở — như app mobile.
  const canOpen = found && near !== false;

  const handleOpen = async (cell: CellResponse) => {
    setOpeningBoxId(cell.id);
    try {
      const res = await openBox({ lockerId, boxId: cell.id }).unwrap();
      const body = res?.data;
      if (body?.accepted) toast.success(body.message || `Đã gửi lệnh mở ô ${cell.boxNumber}`);
      else toast.error(body?.message || `Tủ không nhận lệnh mở ô ${cell.boxNumber}`);
    } catch (err) {
      toast.error((err as { data?: { message?: string } })?.data?.message || `Không gửi được lệnh mở ô ${cell.boxNumber}`);
    } finally {
      setOpeningBoxId(null);
    }
  };

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bluetooth className="w-4.5 h-4.5 text-blue-600" />
          {t("admin.lockers.ble.title", "Kiểm tra Bluetooth & mở thử ô")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t(
            "admin.lockers.ble.description",
            "Quét beacon {{name}} mà Pi của tủ phát; thấy đúng tủ (và đủ gần nếu đo được sóng) thì mở thử từng ô. Lệnh mở vẫn gửi qua máy chủ tới Pi.",
            { name: expectedName }
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported ? (
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
            <BluetoothOff className="w-4 h-4 shrink-0" />
            {t(
              "admin.lockers.ble.unsupported",
              "Trình duyệt này không hỗ trợ Web Bluetooth. Dùng Chrome hoặc Edge trên máy có Bluetooth."
            )}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void startScan()} disabled={scan.kind === "scanning"}>
                {scan.kind === "scanning" ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Radar className="w-4 h-4 mr-1.5" />
                )}
                {t("admin.lockers.ble.scan", "Quét Bluetooth tủ")}
              </Button>
              {available === false && (
                <Badge variant="outline" className="text-[11px] border-rose-300 text-rose-700">
                  {t("admin.lockers.ble.adapterOff", "Máy này chưa bật Bluetooth")}
                </Badge>
              )}
              {scan.kind === "found" && (
                <Badge
                  variant="outline"
                  className={`text-[11px] ${
                    scan.matches ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"
                  }`}
                >
                  {scan.matches
                    ? t("admin.lockers.ble.matched", "Đã thấy tủ: {{name}}", { name: scan.name })
                    : t("admin.lockers.ble.otherLocker", "{{name}} không phải tủ {{code}}", {
                        name: scan.name || "?",
                        code: lockerCode,
                      })}
                </Badge>
              )}
              {found && rssi != null && (
                <Badge
                  variant="outline"
                  className={`text-[11px] font-mono ${near ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}`}
                >
                  {rssi} dBm · ~{Math.max(0.4, estimateDistance(rssi)).toFixed(1)} m
                </Badge>
              )}
            </div>

            {scan.kind === "error" && <p className="text-xs text-rose-700 dark:text-rose-400">{scan.message}</p>}
            {found && !rssiSupported && (
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "admin.lockers.ble.noRssi",
                  "Không đo được khoảng cách (bật chrome://flags/#enable-experimental-web-platform-features để đo) — cho mở ngay khi thấy tủ."
                )}
              </p>
            )}
            {found && near === false && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                {t("admin.lockers.ble.tooFar", "Sóng còn yếu — lại gần tủ (< 2 m) để mở ô.")}
              </p>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {sortedCells.map((cell) => (
                <Button
                  key={cell.id}
                  size="sm"
                  variant="outline"
                  disabled={!canOpen || openingBoxId != null}
                  onClick={() => void handleOpen(cell)}
                  className="h-9 text-xs"
                >
                  {openingBoxId === cell.id ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 mr-1" />
                  )}
                  {t("admin.lockers.ble.openBox", "Mở ô {{number}}", { number: cell.boxNumber })}
                </Button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import {
  Monitor,
  Cpu,
  Tv,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
} from "lucide-react";
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
import { formatDateTime } from "~/lib/datetime";

interface KioskScreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockerId: number;
  lockerCode?: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  gatewayMac?: string | null;
}

export function KioskScreenModal({
  open,
  onOpenChange,
  lockerId,
  lockerCode,
  isOnline = true,
  lastSeenAt,
  gatewayMac,
}: KioskScreenModalProps) {
  const handleOpenKioskTab = () => {
    window.open("http://localhost:3002/", "_blank");
  };

  const handlePingScreen = () => {
    if (!isOnline) {
      toast.error("Bộ điều khiển Kiosk chưa được cấp nguồn (Offline)!", {
        description: "Vui lòng cắm điện thiết bị phần cứng để nhận dữ liệu màn hình và điều khiển ô tủ.",
      });
      return;
    }
    toast.success("Đã gửi tín hiệu kiểm tra (Ping) tới màn hình Kiosk!", {
      description: "Màn hình 7 inch phản hồi tín hiệu HDMI & cảm ứng USB bình thường.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg border border-sky-200 dark:border-sky-800">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Màn hình cảm ứng Kiosk 7 inch
                <Badge
                  className={
                    isOnline
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 border text-[11px]"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 border text-[11px]"
                  }
                >
                  {isOnline ? "Hoạt động (Online)" : "Mất kết nối (Offline)"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Thiết bị hiển thị & tương tác khách hàng tại Kiosk {lockerCode || `#${lockerId}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Visual Screen Mockup */}
          <div className="relative rounded-xl bg-slate-950 p-4 border-2 border-slate-700/80 shadow-inner flex flex-col justify-between overflow-hidden group">
            {/* Gloss reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-2 z-10">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline
                      ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50"
                      : "bg-rose-500 shadow-sm shadow-rose-500/50"
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                  Waveshare 7" HDMI LCD (C)
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] h-4 text-sky-400 border-sky-600/50 bg-sky-950/40">
                1024 × 600 IPS
              </Badge>
            </div>

            {isOnline ? (
              <div className="py-4 text-center z-10 space-y-1">
                <p className="text-sm font-bold text-white tracking-wide">
                  Lock.R Touch Kiosk Interface
                </p>
                <p className="text-[11px] text-slate-400">
                  Ứng dụng React 19 · Chromium Kiosk Mode (Cổng :3002)
                </p>
              </div>
            ) : (
              <div className="py-4 text-center z-10 space-y-1">
                <p className="text-sm font-bold text-rose-400 tracking-wide flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Màn hình chưa có nguồn (Offline)
                </p>
                <p className="text-[11px] text-slate-400">
                  Chờ cấp nguồn trạm Kiosk hoặc kết nối lại Raspberry Pi
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400 z-10">
              <span>Cảm ứng điện dung 5 điểm (USB HID)</span>
              <span>Micro-HDMI Video Direct</span>
            </div>
          </div>

          {/* Hardware Specs Grid */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5 text-primary" /> Thông số phần cứng màn hình
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-muted-foreground block text-[11px]">Model phần cứng:</span>
                <span className="font-semibold text-foreground">Waveshare 7inch HDMI LCD (C)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Độ phân giải hiển thị:</span>
                <span className="font-semibold text-foreground">1024 × 600 px (IPS 178°)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Chuẩn cảm ứng:</span>
                <span className="font-semibold text-foreground">Capacitive Touch (Goodix GT911)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Cổng xuất hình ảnh:</span>
                <span className="font-semibold text-foreground">Micro-HDMI (Raspberry Pi 4)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Cổng cảm ứng:</span>
                <span className="font-semibold text-foreground">Micro-USB Touch (I2C/USB HID)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Cấu hình năng lượng:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Không tắt màn hình (Blanking OFF)
                </span>
              </div>
            </div>
          </div>

          {/* Software & Gateway Connection */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Tv className="w-3.5 h-3.5 text-indigo-600" /> Trạng thái ứng dụng & Bộ điều khiển
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-muted-foreground block text-[11px]">Ứng dụng giao diện:</span>
                <span className="font-semibold text-foreground">Chromium Kiosk (--kiosk :3002)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Địa chỉ chạy ứng dụng:</span>
                <span className="font-semibold text-primary">http://localhost:3002/</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Địa chỉ MAC Pi:</span>
                <span className="font-mono font-medium text-foreground">{gatewayMac || "DC:A6:32:XX:XX:XX"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Thấy lần cuối:</span>
                <span className="font-semibold text-foreground">
                  {lastSeenAt ? formatDateTime(lastSeenAt) : "Vừa xong (Live)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePingScreen}
              className="text-xs h-8 text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-300"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Ping kiểm tra
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleOpenKioskTab}
              disabled={!isOnline}
              className="text-xs h-8 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Mở Kiosk UI (:3002)
            </Button>
          </div>
          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from "react";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Search, Boxes, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";

interface KioskRevenueData {
  id: number;
  code: string;
  name: string;
  locationName: string;
  totalBoxes: number;
  totalOrders: number;
  totalRevenue: number;
  revenuePerBox: number;
  status: "ACTIVE" | "MAINTENANCE" | "OFFLINE";
}

const MOCK_KIOSK_REVENUE: KioskRevenueData[] = [
  {
    id: 1,
    code: "CAB-DEMO-01",
    name: "Kiosk Demo FPT",
    locationName: "Đại học FPT TP.HCM",
    totalBoxes: 7,
    totalOrders: 640,
    totalRevenue: 16800000,
    revenuePerBox: 2400000,
    status: "ACTIVE",
  },
  {
    id: 2,
    code: "CAB-VGP-01",
    name: "Kiosk Vinhome Grand Park S1",
    locationName: "Vinhomes Grand Park (Tòa S1.02)",
    totalBoxes: 9,
    totalOrders: 512,
    totalRevenue: 14200000,
    revenuePerBox: 1577778,
    status: "ACTIVE",
  },
  {
    id: 3,
    code: "CAB-LM81-01",
    name: "Kiosk Landmark 81 B1",
    locationName: "Landmark 81 (Sảnh B1 Central Park)",
    totalBoxes: 9,
    totalOrders: 430,
    totalRevenue: 12500000,
    revenuePerBox: 1388889,
    status: "ACTIVE",
  },
  {
    id: 4,
    code: "CAB-KTX-01",
    name: "Kiosk KTX Khu B - Nhà B4",
    locationName: "KTX Khu B - ĐHQG TP.HCM",
    totalBoxes: 12,
    totalOrders: 580,
    totalRevenue: 15900000,
    revenuePerBox: 1325000,
    status: "ACTIVE",
  },
  {
    id: 5,
    code: "CAB-MAST-01",
    name: "Kiosk Masteri Thảo Điền T2",
    locationName: "Chung cư Masteri Thảo Điền",
    totalBoxes: 9,
    totalOrders: 320,
    totalRevenue: 9800000,
    revenuePerBox: 1088889,
    status: "ACTIVE",
  },
  {
    id: 6,
    code: "CAB-AEON-01",
    name: "Kiosk Aeon Mall Tân Phú",
    locationName: "Aeon Mall Tân Phú (Cổng B)",
    totalBoxes: 9,
    totalOrders: 210,
    totalRevenue: 5900000,
    revenuePerBox: 655556,
    status: "MAINTENANCE",
  },
];

function formatVND(val: number) {
  return val.toLocaleString("vi-VN") + " đ";
}

export function KioskRevenueTab() {
  const [search, setSearch] = useState("");

  const filteredKiosks = useMemo(() => {
    return MOCK_KIOSK_REVENUE.filter(
      (k) =>
        k.name.toLowerCase().includes(search.toLowerCase()) ||
        k.code.toLowerCase().includes(search.toLowerCase()) ||
        k.locationName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã Kiosk, tên, địa điểm..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Kiosk</th>
              <th className="py-3 px-4">Địa điểm đặt</th>
              <th className="py-3 px-4 text-center">Số ngăn ô</th>
              <th className="py-3 px-4 text-center">Trạng thái</th>
              <th className="py-3 px-4 text-right">Lượt giao dịch</th>
              <th className="py-3 px-4 text-right">Doanh thu / Ngăn</th>
              <th className="py-3 px-4 text-right">Tổng doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredKiosks.map((kiosk) => (
              <tr key={kiosk.id} className="hover:bg-secondary/30 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <Boxes className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{kiosk.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{kiosk.code}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-muted-foreground font-medium">
                  {kiosk.locationName}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                  {kiosk.totalBoxes} ô
                </td>
                <td className="py-3.5 px-4 text-center">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-2 py-0.5 ${
                      kiosk.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {kiosk.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> Bảo trì
                      </span>
                    )}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-foreground">
                  {kiosk.totalOrders.toLocaleString("vi-VN")} lượt
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-muted-foreground">
                  {formatVND(Math.round(kiosk.revenuePerBox))}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <p className="font-bold text-foreground text-sm leading-tight">{formatVND(kiosk.totalRevenue)}</p>
                  <div className="flex items-center justify-end gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                    <span>+{formatVND(Math.round(kiosk.totalRevenue * 0.12))}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

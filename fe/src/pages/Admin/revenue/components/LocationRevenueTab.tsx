import { useState, useMemo } from "react";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Search, MapPin, Store, ArrowUpRight } from "lucide-react";

interface LocationRevenueData {
  id: number;
  name: string;
  address: string;
  kiosksCount: number;
  totalBoxes: number;
  totalOrders: number;
  occupancyRate: number;
  totalRevenue: number;
  performance: "Xuất sắc" | "Tốt" | "Trung bình";
}

const MOCK_LOCATION_REVENUE: LocationRevenueData[] = [
  {
    id: 1,
    name: "Đại học FPT TP.HCM (Sảnh Innovation)",
    address: "Lô E2a-7, Đường D1, Khu CNC, Long Thạnh Mỹ, TP. Thủ Đức",
    kiosksCount: 3,
    totalBoxes: 23,
    totalOrders: 1120,
    occupancyRate: 85,
    totalRevenue: 28900000,
    performance: "Xuất sắc",
  },
  {
    id: 2,
    name: "KTX Khu B - ĐHQG TP.HCM",
    address: "Đường Tô Hiến Thành, Khu phố 6, Phường Đông Hòa, Dĩ An",
    kiosksCount: 4,
    totalBoxes: 36,
    totalOrders: 980,
    occupancyRate: 82,
    totalRevenue: 24500000,
    performance: "Xuất sắc",
  },
  {
    id: 3,
    name: "Chung cư Masteri Thảo Điền",
    address: "159 Xa Lộ Hà Nội, Thảo Điền, TP. Thủ Đức",
    kiosksCount: 2,
    totalBoxes: 18,
    totalOrders: 540,
    occupancyRate: 74,
    totalRevenue: 15800000,
    performance: "Tốt",
  },
  {
    id: 4,
    name: "Vinhomes Grand Park (Tòa S1.02)",
    address: "Đường Nguyễn Xiển, Long Thạnh Mỹ, TP. Thủ Đức",
    kiosksCount: 2,
    totalBoxes: 18,
    totalOrders: 480,
    occupancyRate: 70,
    totalRevenue: 13900000,
    performance: "Tốt",
  },
  {
    id: 5,
    name: "Landmark 81 (Sảnh B1 Central Park)",
    address: "720A Điện Biên Phủ, Phường 22, Bình Thạnh",
    kiosksCount: 2,
    totalBoxes: 16,
    totalOrders: 420,
    occupancyRate: 68,
    totalRevenue: 12400000,
    performance: "Tốt",
  },
  {
    id: 6,
    name: "Aeon Mall Tân Phú (Cổng B)",
    address: "30 Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú",
    kiosksCount: 2,
    totalBoxes: 16,
    totalOrders: 280,
    occupancyRate: 58,
    totalRevenue: 7200000,
    performance: "Trung bình",
  },
];

function formatVND(val: number) {
  return val.toLocaleString("vi-VN") + " đ";
}

export function LocationRevenueTab() {
  const [search, setSearch] = useState("");

  const filteredLocations = useMemo(() => {
    return MOCK_LOCATION_REVENUE.filter(
      (loc) =>
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.address.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên địa điểm, địa chỉ..."
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
              <th className="py-3 px-4">Địa điểm</th>
              <th className="py-3 px-4 text-center">Số Kiosk</th>
              <th className="py-3 px-4 text-center">Tổng ngăn ô</th>
              <th className="py-3 px-4 text-center">Công suất</th>
              <th className="py-3 px-4 text-center">Đánh giá</th>
              <th className="py-3 px-4 text-right">Lượt giao dịch</th>
              <th className="py-3 px-4 text-right">Tổng doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredLocations.map((loc) => (
              <tr key={loc.id} className="hover:bg-secondary/30 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{loc.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {loc.address}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                  {loc.kiosksCount} trạm
                </td>
                <td className="py-3.5 px-4 text-center font-medium text-muted-foreground">
                  {loc.totalBoxes} ô
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="font-semibold text-foreground">{loc.occupancyRate}%</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-2 py-0.5 ${
                      loc.performance === "Xuất sắc"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : loc.performance === "Tốt"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-400/30"
                          : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {loc.performance}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-foreground">
                  {loc.totalOrders.toLocaleString("vi-VN")} lượt
                </td>
                <td className="py-3.5 px-4 text-right">
                  <p className="font-bold text-foreground text-sm leading-tight">{formatVND(loc.totalRevenue)}</p>
                  <div className="flex items-center justify-end gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                    <span>+{formatVND(Math.round(loc.totalRevenue * 0.15))}</span>
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

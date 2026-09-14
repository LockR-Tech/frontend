import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { MapPin, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface LocationPerf {
  id: number;
  name: string;
  address: string;
  kiosksCount: number;
  totalOrders: number;
  occupancyRate: number;
  revenue: number;
}

const TOP_LOCATIONS: LocationPerf[] = [
  {
    id: 1,
    name: "KTX Khu B - ĐHQG TP.HCM",
    address: "Tô Hiến Thành, Dĩ An, Bình Dương",
    kiosksCount: 4,
    totalOrders: 642,
    occupancyRate: 88,
    revenue: 28900000,
  },
  {
    id: 2,
    name: "Đại học FPT TP.HCM (Sảnh Innovation)",
    address: "Lô E2a-7, Đường D1, Khu CNC, TP. Thủ Đức",
    kiosksCount: 3,
    totalOrders: 512,
    occupancyRate: 82,
    revenue: 23150000,
  },
  {
    id: 3,
    name: "Chung cư Masteri Thảo Điền (Tháp T2)",
    address: "159 Xa Lộ Hà Nội, Thảo Điền, TP. Thủ Đức",
    kiosksCount: 2,
    totalOrders: 384,
    occupancyRate: 75,
    revenue: 19400000,
  },
  {
    id: 4,
    name: "Landmark 81 (Sảnh B1 Central Park)",
    address: "720A Điện Biên Phủ, Phường 22, Bình Thạnh",
    kiosksCount: 2,
    totalOrders: 295,
    occupancyRate: 70,
    revenue: 15600000,
  },
  {
    id: 5,
    name: "Aeon Mall Tân Phú (Cổng B)",
    address: "30 Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú",
    kiosksCount: 2,
    totalOrders: 210,
    occupancyRate: 64,
    revenue: 11200000,
  },
];

function formatVND(amount: number) {
  return amount.toLocaleString("vi-VN") + " đ";
}

export function TopLocationsTable() {
  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            Top địa điểm & Kiosk hiệu quả nhất
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Xếp hạng theo lưu lượng đơn gửi/thuê và doanh thu tích lũy
          </CardDescription>
        </div>
        <Link
          to="/admin/stores"
          className="text-xs font-medium text-foreground hover:text-muted-foreground inline-flex items-center gap-1 transition-colors"
        >
          Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/60">
          {TOP_LOCATIONS.map((loc, idx) => (
            <div key={loc.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-6 h-6 rounded-md bg-secondary text-foreground text-xs font-bold flex items-center justify-center shrink-0 border border-border/60">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{loc.name}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {loc.address}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-right">
                <div className="hidden sm:block">
                  <p className="text-xs text-muted-foreground">{loc.kiosksCount} Kiosk • {loc.totalOrders} đơn</p>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-[11px] text-muted-foreground">Công suất:</span>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      {loc.occupancyRate}%
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{formatVND(loc.revenue)}</p>
                  <p className="text-[11px] text-muted-foreground sm:hidden">{loc.totalOrders} đơn</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

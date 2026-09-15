import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Package, Clock, Plane, AlertTriangle, TrendingUp, ArrowUpRight } from "lucide-react";

interface ServiceMetric {
  id: string;
  name: string;
  code: string;
  description: string;
  basePrice: string;
  totalOrders: number;
  totalRevenue: number;
  sharePercent: number;
  growthRate: string;
  icon: React.ElementType;
}

const SERVICE_METRICS: ServiceMetric[] = [
  {
    id: "send",
    name: "Gửi hàng qua Kiosk (Parcel Send)",
    code: "SVC-SEND-01",
    description: "Khách gửi hàng vào Kiosk, chuyển mã PIN/QR cho người nhận tự lấy",
    basePrice: "25.000 đ / lượt",
    totalOrders: 1420,
    totalRevenue: 35500000,
    sharePercent: 46,
    growthRate: "+18.4%",
    icon: Package,
  },
  {
    id: "storage",
    name: "Thuê ô Kiosk theo giờ (Locker Rental)",
    code: "SVC-RENT-02",
    description: "Thuê ô lưu trữ đồ cá nhân, tài liệu hoặc vali theo giờ/ngày",
    basePrice: "10.000 đ / giờ",
    totalOrders: 980,
    totalRevenue: 24500000,
    sharePercent: 32,
    growthRate: "+12.1%",
    icon: Clock,
  },
  {
    id: "drone",
    name: "Giao nhận Drone (Drone Delivery)",
    code: "SVC-DRONE-03",
    description: "Vận chuyển bưu kiện tự hành giữa các trạm Kiosk có bãi đáp",
    basePrice: "45.000 đ / chuyến",
    totalOrders: 260,
    totalRevenue: 11700000,
    sharePercent: 15,
    growthRate: "+34.5%",
    icon: Plane,
  },
  {
    id: "overdue",
    name: "Phí quá hạn & Gia hạn lưu kho",
    code: "SVC-FEE-04",
    description: "Phí thu thêm khi khách nhận hàng muộn hơn 48h hoặc gia hạn giữ ô",
    basePrice: "5.000 đ / giờ quá hạn",
    totalOrders: 310,
    totalRevenue: 5400000,
    sharePercent: 7,
    growthRate: "+5.2%",
    icon: AlertTriangle,
  },
];

function formatVND(val: number) {
  return val.toLocaleString("vi-VN") + " đ";
}

export function ServiceRevenueTab() {
  const grandTotal = SERVICE_METRICS.reduce((s, c) => s + c.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* 4 Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVICE_METRICS.map((svc) => {
          const Icon = svc.icon;
          return (
            <Card key={svc.id} className="border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground border border-border/60">
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    {svc.growthRate}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium truncate">{svc.name}</p>
                <p className="text-lg font-bold text-foreground mt-1 leading-tight">{formatVND(svc.totalRevenue)}</p>
                <div className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                  <span>+{formatVND(Math.round(svc.totalRevenue * 0.14))}</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{svc.totalOrders} lượt giao dịch</span>
                <span className="font-semibold text-foreground">{svc.sharePercent}%</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Breakdown Table */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Bảng chi tiết doanh số theo dịch vụ Kiosk</h3>
            <p className="text-xs text-muted-foreground">Doanh số phân tích chi tiết theo từng nghiệp vụ của hệ thống</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Tổng doanh thu dịch vụ:</span>
            <p className="text-base font-bold text-foreground">{formatVND(grandTotal)}</p>
          </div>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Tên dịch vụ</th>
              <th className="py-3 px-4">Mã DV</th>
              <th className="py-3 px-4">Đơn giá cơ sở</th>
              <th className="py-3 px-4 text-right">Số lượt dùng</th>
              <th className="py-3 px-4 text-right">Tỷ trọng</th>
              <th className="py-3 px-4 text-right">Tổng doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {SERVICE_METRICS.map((svc) => {
              const Icon = svc.icon;
              return (
                <tr key={svc.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{svc.name}</p>
                        <p className="text-[11px] text-muted-foreground">{svc.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                    {svc.code}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground font-medium">
                    {svc.basePrice}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-foreground">
                    {svc.totalOrders.toLocaleString("vi-VN")} lượt
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${svc.sharePercent}%` }}
                        />
                      </div>
                      <span className="font-semibold text-foreground">{svc.sharePercent}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <p className="font-bold text-foreground text-sm leading-tight">{formatVND(svc.totalRevenue)}</p>
                    <div className="flex items-center justify-end gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                      <span>+{formatVND(Math.round(svc.totalRevenue * 0.14))}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

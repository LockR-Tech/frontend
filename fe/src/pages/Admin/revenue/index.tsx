import { useState } from "react";
import { PageHeader } from "~/components/shared/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { CreditCard, TrendingUp, Calendar, ShoppingBag, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { UserRevenueTab } from "./components/UserRevenueTab";
import { ServiceRevenueTab } from "./components/ServiceRevenueTab";
import { KioskRevenueTab } from "./components/KioskRevenueTab";
import { LocationRevenueTab } from "./components/LocationRevenueTab";

function formatVND(amount: number) {
  return amount.toLocaleString("vi-VN") + " đ";
}

export default function RevenuePage() {
  const [activeTab, setActiveTab] = useState("users");

  const kpis = [
    {
      title: "Tổng doanh thu",
      value: formatVND(77100000),
      sublabel: "Tích lũy toàn hệ thống",
      deltaAmount: "+9.950.000 đ",
      trend: "+14.8%",
      icon: CreditCard,
    },
    {
      title: "Doanh thu tháng này",
      value: formatVND(28900000),
      sublabel: "Ghi nhận trong tháng 9/2026",
      deltaAmount: "+2.450.000 đ",
      trend: "+9.2%",
      icon: Calendar,
    },
    {
      title: "Doanh thu hôm nay",
      value: formatVND(1850000),
      sublabel: "Phát sinh trong ngày",
      deltaAmount: "+110.000 đ",
      trend: "+6.4%",
      icon: TrendingUp,
    },
    {
      title: "Giá trị đơn TB (AOV)",
      value: formatVND(89500),
      sublabel: "Trên mỗi lượt gửi / thuê",
      deltaAmount: "+1.800 đ",
      trend: "+2.1%",
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý doanh thu</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Báo cáo và phân tích dòng tiền chuyên sâu theo khách hàng, loại dịch vụ, Kiosk và địa điểm
          </p>
        </div>
        <Link to="/admin/payments">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-border">
            <CreditCard className="w-3.5 h-3.5" />
            Đối soát giao dịch thanh toán
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border border-border/80 bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{kpi.title}</span>
                <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-muted-foreground border border-border/60">
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground leading-tight">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>{kpi.deltaAmount}</span>
                <span className="text-[11px] font-normal text-muted-foreground ml-0.5">({kpi.trend})</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{kpi.sublabel}</p>
            </Card>
          );
        })}
      </div>

      {/* Main Analysis Card with 4 Tabs */}
      <Card className="border border-border/80 bg-card shadow-xs">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 p-1 mb-6 border border-border/50">
              <TabsTrigger
                value="users"
                className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
              >
                Theo Khách hàng
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
              >
                Theo Loại Dịch vụ
              </TabsTrigger>
              <TabsTrigger
                value="kiosks"
                className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
              >
                Theo Kiosk
              </TabsTrigger>
              <TabsTrigger
                value="locations"
                className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
              >
                Theo Địa điểm
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0">
              <UserRevenueTab />
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <ServiceRevenueTab />
            </TabsContent>

            <TabsContent value="kiosks" className="mt-0">
              <KioskRevenueTab />
            </TabsContent>

            <TabsContent value="locations" className="mt-0">
              <LocationRevenueTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

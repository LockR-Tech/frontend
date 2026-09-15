import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  Box,
  Plane,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Store,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getMockUserTransactions, type UserOrderTransaction } from "./components/UserRevenueDetailModal";

function formatVND(amount: number) {
  return amount.toLocaleString("vi-VN") + " đ";
}

export default function RevenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = Number(id) || 1;

  const [expandedOrder, setExpandedOrder] = useState<string | null>("ORD-2026-90412");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<string>("ALL");

  const detail = useMemo(() => {
    return getMockUserTransactions(userId, 38);
  }, [userId]);

  const filteredOrders = useMemo(() => {
    return detail.orders.filter((order) => {
      const matchSearch =
        order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.kioskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());
      const matchService =
        selectedService === "ALL" || order.serviceType === selectedService;
      return matchSearch && matchService;
    });
  }, [detail.orders, searchQuery, selectedService]);

  const toggleExpand = (code: string) => {
    setExpandedOrder(expandedOrder === code ? null : code);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border"
            onClick={() => navigate("/admin/revenue")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {detail.name}
              </h1>
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold px-2.5 py-0.5 ${
                  detail.tier === "VIP"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40"
                    : "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/40"
                }`}
              >
                {detail.tier}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>Mã khách hàng: #{detail.id}</span>
              <span>•</span>
              <span>{detail.phone}</span>
              <span>•</span>
              <span>{detail.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => navigate("/admin/revenue")}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Về báo cáo doanh thu
          </Button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Tổng chi tiêu lũy kế</span>
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{formatVND(detail.totalSpent)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span>{detail.totalSpentDelta || "+450.000 đ"}</span>
            <span className="text-[11px] font-normal text-muted-foreground ml-0.5">({detail.totalSpentPercent || "+15.3%"} so với tháng trước)</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">Tích lũy qua toàn bộ mạng lưới Kiosk</p>
        </Card>

        <Card className="border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Tổng số đơn hàng</span>
            <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{detail.totalOrders} đơn</p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span>{detail.totalOrdersDelta || "+6 đơn"}</span>
            <span className="text-[11px] font-normal text-muted-foreground ml-0.5">({detail.totalOrdersPercent || "+18.7%"})</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">Giao dịch hoàn tất thành công</p>
        </Card>

        <Card className="border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Giá trị đơn TB (AOV)</span>
            <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{formatVND(detail.averageOrderValue)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span>{detail.aovDelta || "+4.200 đ"}</span>
            <span className="text-[11px] font-normal text-muted-foreground ml-0.5">({detail.aovPercent || "+4.9%"})</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">Mức chi trả bình quân mỗi lượt</p>
        </Card>

        <Card className="border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Mốc tạo đơn gần nhất</span>
            <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold font-mono text-foreground mt-1">13/09/2026 14:15:22</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">Hoàn tất lúc: {detail.lastOrderDate}</p>
        </Card>
      </div>

      {/* Row 2: Service Breakdown & Kiosk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doanh thu theo Dịch vụ */}
        <Card className="border border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Doanh thu theo Loại Dịch Vụ
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                4 Dịch vụ Kiosk
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Tỷ trọng đóng góp dòng tiền theo từng nghiệp vụ của khách hàng
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {detail.serviceBreakdown.map((srv) => (
              <div key={srv.name} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{srv.name}</span>
                  <div className="text-right">
                    <p className="font-bold text-sm text-foreground leading-tight">{formatVND(srv.amount)}</p>
                    <div className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold mt-0.5 ${
                      srv.isIncrease === false ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {srv.isIncrease === false ? (
                        <ArrowDownRight className="w-3 h-3 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      )}
                      <span>{srv.deltaAmount || "+120.000 đ"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{srv.count} lượt giao dịch</span>
                  <span className="font-semibold text-foreground">{srv.percentage}% tổng chi</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${srv.color} rounded-full transition-all`}
                    style={{ width: `${srv.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Doanh thu theo Kiosk */}
        <Card className="border border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                Doanh thu theo Kiosk sử dụng
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Điểm giao dịch thường dùng
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Phân tích các trạm Kiosk mà khách hàng thực hiện gửi / nhận hàng
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {detail.kioskBreakdown.map((kiosk) => (
              <div
                key={kiosk.kioskName}
                className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between hover:border-slate-400 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{kiosk.kioskName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {kiosk.locationName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground leading-tight">{formatVND(kiosk.amount)}</p>
                  <div className="flex items-center justify-end gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                    <span>{kiosk.deltaAmount || "+95.000 đ"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{kiosk.count} đơn hàng</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Detailed Orders with Full Timeline (hh:mm:ss) */}
      <Card className="border border-border/80 bg-card shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Lịch sử Đơn hàng & Chi tiết Tiến trình Từng bước (hh:mm:ss)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Hiển thị thời gian khởi tạo đơn và các mốc thực tế chính xác đến từng giây
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs w-fit">
              {filteredOrders.length} / {detail.orders.length} đơn hàng
            </Badge>
          </div>

          {/* Filters inside Orders section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã đơn, Kiosk, thanh toán..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { label: "Tất cả", value: "ALL" },
                { label: "Drone", value: "DRONE" },
                { label: "Gửi hàng Kiosk", value: "SEND" },
                { label: "Thuê ô lưu trữ", value: "RENTAL" },
                { label: "Phí quá hạn", value: "OVERDUE" },
              ].map((tab) => (
                <Button
                  key={tab.value}
                  variant={selectedService === tab.value ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs px-3"
                  onClick={() => setSelectedService(tab.value)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Không tìm thấy đơn hàng nào phù hợp</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrder === order.orderCode;
              return (
                <div
                  key={order.orderCode}
                  className="rounded-xl border border-border/80 bg-card overflow-hidden transition-all shadow-2xs hover:border-slate-400"
                >
                  {/* Order Top Bar */}
                  <div
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-muted/10 hover:bg-muted/30"
                    onClick={() => toggleExpand(order.orderCode)}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-300 shrink-0 shadow-2xs">
                        {order.serviceType === "DRONE" ? (
                          <Plane className="w-5 h-5" />
                        ) : order.serviceType === "RENTAL" ? (
                          <Calendar className="w-5 h-5" />
                        ) : (
                          <Box className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {order.orderCode}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0 border-sky-300 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40"
                          >
                            {order.serviceName}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{order.kioskName} · {order.boxNumber}</span>
                          <span>•</span>
                          <span>Phương thức: {order.paymentMethod}</span>
                          <span>•</span>
                          <span>Khởi tạo: <span className="font-mono font-semibold text-foreground">{order.createdAt}</span></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      <div className="text-right">
                        <p className="font-black text-foreground text-base">
                          {formatVND(order.amount)}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Đã thanh toán
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Step Timeline with exact HH:MM:SS */}
                  {isExpanded && (
                    <div className="p-5 border-t border-border/70 bg-slate-50/70 dark:bg-slate-900/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Tiến trình luân chuyển đơn hàng & Mốc thời gian thực tế (hh:mm:ss)
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                          {order.steps.length} bước hoàn tất
                        </span>
                      </div>

                      <div className="relative pl-7 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-300 dark:before:bg-emerald-800">
                        {order.steps.map((step, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-7 top-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-2xs">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <p className="text-xs font-bold text-foreground">{step.title}</p>
                              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 w-fit shadow-2xs">
                                {step.timestamp}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

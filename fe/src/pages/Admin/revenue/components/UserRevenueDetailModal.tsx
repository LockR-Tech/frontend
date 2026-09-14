import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
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
  Sparkles,
  MapPin,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export interface UserOrderTransaction {
  orderCode: string;
  serviceType: "SEND" | "RENTAL" | "DRONE" | "OVERDUE";
  serviceName: string;
  kioskName: string;
  boxNumber: string;
  amount: number;
  paymentMethod: string;
  status: "COMPLETED" | "STORING" | "DELIVERING";
  createdAt: string; // HH:mm:ss DD/MM/YYYY
  steps: {
    title: string;
    description: string;
    timestamp: string; // HH:mm:ss DD/MM/YYYY
    completed: boolean;
  }[];
}

export interface UserRevenueDetail {
  id: number;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  tier: "VIP" | "Thân thiết" | "Tiêu chuẩn";
  totalSpentDelta?: string;
  totalSpentPercent?: string;
  totalOrdersDelta?: string;
  totalOrdersPercent?: string;
  aovDelta?: string;
  aovPercent?: string;
  serviceBreakdown: {
    type: string;
    name: string;
    amount: number;
    count: number;
    percentage: number;
    color: string;
    deltaAmount?: string;
    isIncrease?: boolean;
  }[];
  kioskBreakdown: {
    kioskName: string;
    locationName: string;
    amount: number;
    count: number;
    deltaAmount?: string;
    isIncrease?: boolean;
  }[];
  orders: UserOrderTransaction[];
}

function formatVND(amount: number) {
  return amount.toLocaleString("vi-VN") + " đ";
}

// Generate realistic transactions tailored to each user
export function getMockUserTransactions(userId: number, totalOrders: number): UserRevenueDetail {
  const sampleOrders: UserOrderTransaction[] = [
    {
      orderCode: "ORD-2026-90412",
      serviceType: "DRONE",
      serviceName: "Giao nhận Drone (Drone Delivery)",
      kioskName: "Kiosk Demo FPT",
      boxNumber: "Ô #1 (Drone)",
      amount: 145000,
      paymentMethod: "VNPAY QR",
      status: "COMPLETED",
      createdAt: "13/09/2026 14:15:22",
      steps: [
        {
          title: "Khởi tạo đơn hàng & Thanh toán",
          description: "Khách đặt gửi hàng qua Drone tới Kiosk Landmark 81. Thanh toán thành công 145.000 đ qua VNPAY",
          timestamp: "13/09/2026 14:15:22",
          completed: true,
        },
        {
          title: "Mở ô tiếp nhận tại Kiosk",
          description: "Khách nhập PIN OTP 4821 tại Kiosk Demo FPT, mở ô #1 và đặt kiện hàng 1.8kg vào",
          timestamp: "13/09/2026 14:22:45",
          completed: true,
        },
        {
          title: "Drone tiếp nhận & Cất cánh",
          description: "Drone #DRN-02 hạ cánh nóc Kiosk Demo FPT, khóa ngàm và cất cánh bay theo hành lang",
          timestamp: "13/09/2026 14:50:12",
          completed: true,
        },
        {
          title: "Hạ cánh tại Kiosk đích",
          description: "Drone hạ cánh nóc Kiosk Landmark 81 B1, chuyển kiện hàng vào ngăn nhận",
          timestamp: "13/09/2026 15:25:38",
          completed: true,
        },
        {
          title: "Khách nhận kiện hàng & Hoàn tất",
          description: "Người nhận quét mã QR nhận hàng thành công tại ngăn #2 Kiosk Landmark 81",
          timestamp: "13/09/2026 18:42:15",
          completed: true,
        },
      ],
    },
    {
      orderCode: "ORD-2026-89104",
      serviceType: "RENTAL",
      serviceName: "Thuê ô Kiosk theo giờ (Locker Rental)",
      kioskName: "Kiosk Landmark 81 B1",
      boxNumber: "Ô #10 (Vali XL)",
      amount: 110000,
      paymentMethod: "Ví MoMo",
      status: "COMPLETED",
      createdAt: "11/09/2026 09:10:05",
      steps: [
        {
          title: "Khởi tạo thuê ô lưu trữ",
          description: "Khách đăng ký thuê ô Vali XL trong 4 tiếng (09:10 - 13:10)",
          timestamp: "11/09/2026 09:10:05",
          completed: true,
        },
        {
          title: "Check-in cất hành lý",
          description: "Khách quét QR mở ô #10, cất 2 vali du lịch",
          timestamp: "11/09/2026 09:14:30",
          completed: true,
        },
        {
          title: "Gia hạn thêm 2 giờ",
          description: "Khách bấm gia hạn trên app trước khi hết hạn, thanh toán phụ trội 40.000 đ",
          timestamp: "11/09/2026 13:02:18",
          completed: true,
        },
        {
          title: "Mở ô lấy hành lý & Kết thúc thuê",
          description: "Khách nhập PIN mở ô #10, lấy đồ và cảm biến xác nhận ô đã trống hoàn toàn",
          timestamp: "11/09/2026 15:08:44",
          completed: true,
        },
      ],
    },
    {
      orderCode: "ORD-2026-87455",
      serviceType: "SEND",
      serviceName: "Gửi hàng qua Kiosk (Parcel Send)",
      kioskName: "Kiosk Masteri Thảo Điền T2",
      boxNumber: "Ô #4 (Tiêu chuẩn)",
      amount: 45000,
      paymentMethod: "Thẻ ATM Nội địa",
      status: "COMPLETED",
      createdAt: "09/09/2026 16:30:10",
      steps: [
        {
          title: "Tạo đơn gửi kiện bưu phẩm",
          description: "Gửi tài liệu hợp đồng nội thành, cước phí 45.000 đ",
          timestamp: "09/09/2026 16:30:10",
          completed: true,
        },
        {
          title: "Đặt hàng vào ngăn Kiosk",
          description: "Ô #4 tự động mở, khách đặt bì thư hợp đồng và đóng tủ",
          timestamp: "09/09/2026 16:33:50",
          completed: true,
        },
        {
          title: "Shipper tiếp nhận từ ô",
          description: "Nhân viên giao vận nhập mã lấy hàng lúc 17:15 để chuyển giao",
          timestamp: "09/09/2026 17:15:20",
          completed: true,
        },
        {
          title: "Phát thành công cho người nhận",
          description: "Người nhận đã ký nhận bưu phẩm",
          timestamp: "09/09/2026 18:05:12",
          completed: true,
        },
      ],
    },
    {
      orderCode: "ORD-2026-85120",
      serviceType: "OVERDUE",
      serviceName: "Phí quá hạn & Gia hạn lưu kho",
      kioskName: "Kiosk KTX Khu B - Nhà B4",
      boxNumber: "Ô #5 (Tiêu chuẩn)",
      amount: 30000,
      paymentMethod: "Ví điện tử KioskPay",
      status: "COMPLETED",
      createdAt: "05/09/2026 20:00:15",
      steps: [
        {
          title: "Phát sinh phí quá hạn",
          description: "Kiện hàng lưu kho vượt quá 48 giờ miễn phí tại KTX Khu B",
          timestamp: "05/09/2026 18:00:00",
          completed: true,
        },
        {
          title: "Thanh toán phụ phí mở ô",
          description: "Khách thanh toán 30.000 đ phí quá hạn trước khi mở tủ",
          timestamp: "05/09/2026 20:00:15",
          completed: true,
        },
        {
          title: "Mở ô nhận kiện hàng",
          description: "Hoàn tất nhận hàng sau thanh toán phí quá hạn",
          timestamp: "05/09/2026 20:02:40",
          completed: true,
        },
      ],
    },
  ];

  return {
    id: userId,
    name: userId === 1 ? "Quốc Bảo Nguyễn" : userId === 2 ? "Hoàng Minh Trần" : "Thị Lan Hương Lê",
    phone: userId === 1 ? "0912 345 678" : userId === 2 ? "0988 765 432" : "0903 112 233",
    email: userId === 1 ? "baonq@gmail.com" : userId === 2 ? "tranminh@gmail.com" : "lanhuong@fpt.edu.vn",
    totalOrders: totalOrders || 38,
    totalSpent: userId === 1 ? 3390000 : userId === 2 ? 2150000 : 1680000,
    averageOrderValue: userId === 1 ? 89200 : userId === 2 ? 79600 : 88400,
    lastOrderDate: "13/09/2026 18:42:15",
    tier: userId === 1 ? "VIP" : userId === 2 ? "VIP" : "Thân thiết",
    totalSpentDelta: "+450.000 đ",
    totalSpentPercent: "+15.3%",
    totalOrdersDelta: "+6 đơn",
    totalOrdersPercent: "+18.7%",
    aovDelta: "+4.200 đ",
    aovPercent: "+4.9%",
    serviceBreakdown: [
      {
        type: "SEND",
        name: "Gửi hàng qua Kiosk (Parcel Send)",
        amount: Math.round((userId === 1 ? 3390000 : 2150000) * 0.46),
        count: Math.round((totalOrders || 38) * 0.47),
        percentage: 46,
        color: "bg-blue-500",
        deltaAmount: "+185.000 đ",
        isIncrease: true,
      },
      {
        type: "RENTAL",
        name: "Thuê ô Kiosk theo giờ (Locker Rental)",
        amount: Math.round((userId === 1 ? 3390000 : 2150000) * 0.32),
        count: Math.round((totalOrders || 38) * 0.32),
        percentage: 32,
        color: "bg-emerald-500",
        deltaAmount: "+110.000 đ",
        isIncrease: true,
      },
      {
        type: "DRONE",
        name: "Giao nhận Drone (Drone Delivery)",
        amount: Math.round((userId === 1 ? 3390000 : 2150000) * 0.16),
        count: Math.round((totalOrders || 38) * 0.15),
        percentage: 16,
        color: "bg-sky-500",
        deltaAmount: "+65.000 đ",
        isIncrease: true,
      },
      {
        type: "OVERDUE",
        name: "Phí quá hạn & Gia hạn lưu kho",
        amount: Math.round((userId === 1 ? 3390000 : 2150000) * 0.06),
        count: Math.round((totalOrders || 38) * 0.06),
        percentage: 6,
        color: "bg-amber-500",
        deltaAmount: "-25.000 đ",
        isIncrease: false,
      },
    ],
    kioskBreakdown: [
      {
        kioskName: "Kiosk Demo FPT",
        locationName: "Đại học FPT TP.HCM",
        amount: Math.round((userId === 1 ? 3390000 : 2150000) * 0.54),
        count: Math.round((totalOrders || 38) * 0.55),
        deltaAmount: "+220.000 đ",
        isIncrease: true,
      },
      {
        kioskName: "Kiosk Landmark 81 B1",
        locationName: "Landmark 81 (Sảnh B1 Central Park)",
        amount: Math.round((userId === 1 ? 3390000 : 2150000) * 0.28),
        count: Math.round((totalOrders || 38) * 0.26),
        deltaAmount: "+130.000 đ",
        isIncrease: true,
      },
      {
        kioskName: "Kiosk Vinhome Grand Park S1",
        locationName: "Vinhomes Grand Park (Tòa S1.02)",
        amount: Math.round((userId === 1 ? 3390000 : 2150000) * 0.18),
        count: Math.round((totalOrders || 38) * 0.19),
        deltaAmount: "+85.000 đ",
        isIncrease: true,
      },
    ],
    orders: sampleOrders,
  };
}

export function UserRevenueDetailModal({
  user,
  onClose,
}: {
  user: any | null;
  onClose: () => void;
}) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>("ORD-2026-90412");

  if (!user) return null;

  const detail = getMockUserTransactions(user.id, user.totalOrders);

  const toggleExpand = (code: string) => {
    setExpandedOrder(expandedOrder === code ? null : code);
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 gap-6 rounded-2xl">
        <DialogHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-lg text-foreground">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {user.name}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold px-2 py-0.5 ${
                      user.tier === "VIP"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40"
                        : "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/40"
                    }`}
                  >
                    {user.tier}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user.phone} • {user.email} • Lần đặt gần nhất:{" "}
                  <span className="font-mono font-medium text-foreground">{detail.lastOrderDate}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Tổng chi tiêu</span>
              <p className="text-2xl font-black text-foreground">
                {formatVND(user.totalSpent)}
              </p>
              <div className="flex items-center justify-end gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>{detail.totalSpentDelta || "+450.000 đ"}</span>
                <span className="text-[10px] font-normal text-muted-foreground">({detail.totalSpentPercent || "+15.3%"})</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 3 Overview Mini Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/50">
            <p className="text-xs text-muted-foreground">Tổng lượt giao dịch</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{user.totalOrders} đơn</p>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              <span>{detail.totalOrdersDelta || "+6 đơn"}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/50">
            <p className="text-xs text-muted-foreground">Giá trị đơn TB (AOV)</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{formatVND(user.averageOrderValue)}</p>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              <span>{detail.aovDelta || "+4.200 đ"}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/50">
            <p className="text-xs text-muted-foreground">Thời gian khởi tạo gần nhất</p>
            <p className="text-sm font-bold font-mono text-foreground mt-1">13/09/2026 14:15:22</p>
          </div>
        </div>

        {/* SECTION 1 & 2: Revenue By Service & Revenue By Kiosk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Doanh thu theo loại dịch vụ */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                Doanh thu theo dịch vụ
              </h3>
              <span className="text-[11px] text-muted-foreground">Tỷ trọng chi tiêu</span>
            </div>
            <div className="space-y-2.5">
              {detail.serviceBreakdown.map((srv) => (
                <div key={srv.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{srv.name}</span>
                    <div className="text-right">
                      <p className="font-bold text-foreground leading-tight">{formatVND(srv.amount)}</p>
                      <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold mt-0.5 ${
                        srv.isIncrease === false ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {srv.isIncrease === false ? (
                          <ArrowDownRight className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                        )}
                        <span>{srv.deltaAmount || "+120.000 đ"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{srv.count} đơn hàng</span>
                    <span>{srv.percentage}% tổng chi</span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${srv.color} rounded-full transition-all`}
                      style={{ width: `${srv.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Doanh thu theo Kiosk */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                Doanh thu theo Kiosk
              </h3>
              <span className="text-[11px] text-muted-foreground">Điểm sử dụng</span>
            </div>
            <div className="space-y-3">
              {detail.kioskBreakdown.map((kiosk) => (
                <div
                  key={kiosk.kioskName}
                  className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{kiosk.kioskName}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {kiosk.locationName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground leading-tight">{formatVND(kiosk.amount)}</p>
                    <div className="flex items-center justify-end gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                      <span>{kiosk.deltaAmount || "+95.000 đ"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{kiosk.count} đơn</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: Danh sách Đơn hàng & Step Timeline với giờ cụ thể hh:mm:ss */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Lịch sử đơn hàng & Chi tiết mốc thời gian (hh:mm:ss)
              </h3>
              <p className="text-xs text-muted-foreground">
                Hiển thị thời gian khởi tạo và từng bước thực hiện chính xác đến từng giây
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {detail.orders.length} giao dịch gần nhất
            </Badge>
          </div>

          <div className="space-y-3">
            {detail.orders.map((order) => {
              const isExpanded = expandedOrder === order.orderCode;
              return (
                <div
                  key={order.orderCode}
                  className="rounded-xl border border-border/80 bg-card overflow-hidden transition-all shadow-2xs hover:border-slate-400/80"
                >
                  {/* Order Summary Row */}
                  <div
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-muted/10 hover:bg-muted/30"
                    onClick={() => toggleExpand(order.orderCode)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-300 shrink-0">
                        {order.serviceType === "DRONE" ? (
                          <Plane className="w-4 h-4" />
                        ) : order.serviceType === "RENTAL" ? (
                          <Calendar className="w-4 h-4" />
                        ) : (
                          <Box className="w-4 h-4" />
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
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{order.kioskName} · {order.boxNumber}</span>
                          <span>•</span>
                          <span>Thanh toán: {order.paymentMethod}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">
                          {formatVND(order.amount)}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {order.createdAt}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Step Timeline with HH:mm:ss */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border/70 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Chi tiết tiến trình & Mốc thời gian thực tế (hh:mm:ss)
                      </p>
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300 dark:before:bg-slate-700">
                        {order.steps.map((step, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-2xs">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <p className="text-xs font-bold text-foreground">{step.title}</p>
                              <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 w-fit">
                                {step.timestamp}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {step.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-2 border-t border-border/70">
          <Button variant="outline" onClick={onClose} className="px-6">
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

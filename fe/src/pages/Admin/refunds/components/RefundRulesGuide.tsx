import { useState } from "react";
import {
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plane,
  Box,
  Shirt,
  CreditCard,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface ScenarioItem {
  id: string;
  title: string;
  icon: typeof Box;
  color: string;
  badge: string;
  refundRate: string;
  conditions: string[];
  evidence: string[];
  adminCheck: string[];
}

export function RefundRulesGuide() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>("locker-fault");

  const scenarios: ScenarioItem[] = [
    {
      id: "locker-fault",
      title: "1. Sự cố ô tủ Lock.R (Kẹt cửa, hỏng chốt, mất nguồn/mạng)",
      icon: Box,
      color: "text-amber-600 bg-amber-500/10 border-amber-200 dark:border-amber-900/50",
      badge: "Sự cố phần cứng",
      refundRate: "100% Cước phí đơn",
      conditions: [
        "Khách không thể mở tủ để cất đồ hoặc lấy đồ do sự cố tủ.",
        "KTV xác nhận ô tủ gặp lỗi chốt, mất kết nối BLE/MQTT hoặc cúp điện kéo dài > 30 phút.",
        "Không có ô trống khác cùng kích cỡ để điều chuyển ô tự động.",
      ],
      evidence: [
        "Phiếu báo cáo sự cố của KTV (Maintenance Report ID).",
        "Nhật ký lệnh mở tủ thất bại trên hệ thống IoT/Locker.",
      ],
      adminCheck: [
        "Đối chiếu mã đơn hàng và số ô tủ trên báo cáo sự cố.",
        "Xác nhận khách chưa lấy được hàng hoặc giao dịch bị gián đoạn hoàn toàn.",
      ],
    },
    {
      id: "drone-fault",
      title: "2. Sự cố giao hàng Drone (Rơi đồ, hủy chuyến bay, giao trễ)",
      icon: Plane,
      color: "text-sky-600 bg-sky-500/10 border-sky-200 dark:border-sky-900/50",
      badge: "Sự cố Drone",
      refundRate: "100% Cước phí + Bồi thường",
      conditions: [
        "Drone phải hạ cánh khẩn cấp hoặc hủy bay do thời tiết xấu/mưa bão.",
        "Drone gặp sự cố rơi kiện hàng hoặc kiện hàng bị va đập hư hỏng.",
        "Giao trễ vượt quá thời gian cam kết của hệ thống Drone delivery.",
      ],
      evidence: [
        "Mã chuyến bay Drone, tọa độ và thời gian xảy ra sự cố.",
        "Ảnh chụp snapshot camera Drone hoặc biên bản KTV thu hồi kiện hàng.",
      ],
      adminCheck: [
        "Kiểm tra trạng thái đơn Drone (DROPPED, CANCELLED, TIMED_OUT).",
        "Nếu hàng hóa bị hỏng, kiểm tra mức đền bù theo quy định bảo hiểm vận chuyển.",
      ],
    },
    {
      id: "user-cancel",
      title: "3. Khách hàng huỷ đơn hợp lệ trước khi sử dụng",
      icon: RotateCcw,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50",
      badge: "Huỷ đơn tự nguyện",
      refundRate: "100% (theo điều kiện)",
      conditions: [
        "Khách đã thanh toán nhưng chưa đặt đồ vào tủ (chưa phát sinh sự kiện ITEM_PLACED).",
        "Yêu cầu huỷ và hoàn tiền trong vòng 7 ngày kể từ khi thanh toán thành công.",
        "Với đơn thuê tủ dài ngày: chưa hết hạn và chưa nhận bàn giao ô.",
      ],
      evidence: [
        "Lịch sử trạng thái đơn hàng (Order Timeline): không có lượt mở tủ cất đồ.",
        "Thời gian thanh toán hợp lệ (không vượt quá thời hạn cấu hình refundMaxDays).",
      ],
      adminCheck: [
        "Xác nhận ô tủ vẫn đang trống và mã PIN chưa từng được sử dụng để cất đồ.",
      ],
    },
    {
      id: "double-pay",
      title: "4. Lỗi cổng thanh toán / Trừ tiền 2 lần (Double Billing)",
      icon: CreditCard,
      color: "text-purple-600 bg-purple-500/10 border-purple-200 dark:border-purple-900/50",
      badge: "Lỗi thanh toán",
      refundRate: "100% Số tiền trừ trùng",
      conditions: [
        "Khách hàng bị trừ tiền 2 lần cho cùng một mã đơn hoặc dịch vụ phát sinh.",
        "Ngân hàng đã trừ tiền nhưng cổng SePay phản hồi timeout hoặc lỗi mạng.",
      ],
      evidence: [
        "Sao kê giao dịch ngân hàng / biên lai trừ tiền có mã đối chiếu trùng khớp.",
        "Bảng PaymentRecord trên hệ thống hiển thị nhiều giao dịch cho cùng orderId.",
      ],
      adminCheck: [
        "So sánh referenceId và referenceTransactionId giữa các lượt thanh toán.",
        "Chỉ hoàn khoản tiền bị trừ thừa/trùng lặp, giữ lại khoản thanh toán chính thức.",
      ],
    },
    {
      id: "laundry-fault",
      title: "5. Sự cố dịch vụ Giặt ủi (Mất đồ, hỏng đồ, tiệm từ chối)",
      icon: Shirt,
      color: "text-rose-600 bg-rose-500/10 border-rose-200 dark:border-rose-900/50",
      badge: "Dịch vụ giặt ủi",
      refundRate: "100% Tiền giặt + Đền bù",
      conditions: [
        "Tiệm giặt đối tác từ chối nhận giặt do vượt quá tải trọng hoặc chất liệu không phù hợp.",
        "Quần áo bị thất lạc hoặc hư hỏng rách/phai màu nghiêm trọng do tiệm giặt.",
      ],
      evidence: [
        "Ảnh chụp tình trạng đồ trước và sau khi nhận từ tiệm giặt.",
        "Biên bản đối soát bồi hoàn giữa Admin và Chủ tiệm giặt đối tác.",
      ],
      adminCheck: [
        "Xác nhận với bên đối tác tiệm giặt về tình trạng đơn hàng trước khi bấm hoàn tiền.",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Thẻ hướng dẫn nhanh */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background via-muted/20 to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert className="w-5 h-5" />
            <CardTitle className="text-base font-semibold">
              Quy tắc đối chiếu & Hướng dẫn xét duyệt hoàn tiền
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Admin vui lòng tra cứu các tình huống bên dưới trước khi duyệt và thực hiện chuyển khoản cho khách hàng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {/* Quy chuẩn 4 bước thực hiện chuyển khoản */}
          <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>Quy trình 4 bước chuẩn dành cho Quản trị viên:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">Bước 1:</span>
                <p className="font-medium text-foreground">Kiểm tra thông tin STK</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  So khớp Tên chủ tài khoản và STK với thông tin khách đã đăng ký.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">Bước 2:</span>
                <p className="font-medium text-foreground">Quét mã VietQR chuyển tiền</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mở app Mobile Banking quét mã QR để điền tự động STK, số tiền & nội dung.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">Bước 3:</span>
                <p className="font-medium text-foreground">Tải ảnh chụp minh chứng</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Chụp lại màn hình chuyển khoản thành công và tải lên modal để lưu vết đối soát.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <span className="font-bold text-primary font-mono">Bước 4:</span>
                <p className="font-medium text-foreground">Xác nhận hoàn tiền</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Hệ thống ghi nhận trạng thái ĐÃ HOÀN TIỀN và gửi thông báo kèm ảnh đến khách.
                </p>
              </div>
            </div>
          </div>

          {/* Ma trận các tình huống hoàn tiền */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Các tình huống áp dụng hoàn tiền:
              </span>
              <span className="text-xs text-muted-foreground">
                (Nhấn vào từng tình huống để xem chi tiết điều kiện)
              </span>
            </div>

            <div className="space-y-2.5">
              {scenarios.map((sc) => {
                const Icon = sc.icon;
                const isExpanded = expandedId === sc.id;

                return (
                  <div
                    key={sc.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? "bg-card border-primary/40 shadow-xs"
                        : "bg-card/60 hover:bg-card border-border/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : sc.id)}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border ${sc.color} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {sc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                              {sc.badge}
                            </Badge>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Mức hoàn: {sc.refundRate}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-border/40 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-muted/10">
                        <div className="space-y-1.5 p-2.5 rounded-lg bg-card border border-border/50">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Điều kiện chấp thuận:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                            {sc.conditions.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5 p-2.5 rounded-lg bg-card border border-border/50">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-600" />
                            Chứng từ / Dữ liệu cần có:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                            {sc.evidence.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5 p-2.5 rounded-lg bg-card border border-border/50">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Admin cần đối chiếu:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                            {sc.adminCheck.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

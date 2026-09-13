import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Box,
  CreditCard,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Ban,
  Edit3,
  MessageCircleWarning,
  Star,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import { OrderStatus } from "~/types/admin/enums";
import { useOrderDetail } from "./hooks/useOrderDetail";
import { OrderTimeline } from "./components/OrderTimeline";
import { OrderStatusUpdateModal } from "./components/OrderStatusUpdateModal";
import { useState } from "react";
import {
  useGetOrderComplaintsQuery,
  useGetOrderRatingQuery,
} from "~/stores/apis/partnerApi";

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [OrderStatus.INITIALIZED]: {
    label: "Khởi tạo",
    color: "text-foreground/80",
    bg: "bg-muted/50",
    icon: Clock,
  },
  [OrderStatus.RESERVED]: {
    label: "Đã đặt",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: Package,
  },
  [OrderStatus.WAITING]: {
    label: "Chờ thu gom",
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    icon: Truck,
  },
  [OrderStatus.COLLECTED]: {
    label: "Đã thu gom",
    color: "text-purple-700",
    bg: "bg-purple-100",
    icon: CheckCircle2,
  },
  [OrderStatus.PROCESSING]: {
    label: "Đang xử lý",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
    icon: RotateCcw,
  },
  [OrderStatus.READY]: {
    label: "Sẵn sàng",
    color: "text-teal-700",
    bg: "bg-teal-100",
    icon: CheckCircle2,
  },
  [OrderStatus.RETURNED]: {
    label: "Đã trả",
    color: "text-orange-700",
    bg: "bg-orange-100",
    icon: Box,
  },
  [OrderStatus.COMPLETED]: {
    label: "Hoàn thành",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: CheckCircle2,
  },
  [OrderStatus.CANCELED]: {
    label: "Đã hủy",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: XCircle,
  },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, isLoading, cancelOrder, updateStatus } =
    useOrderDetail(orderId);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const { data: complaints = [] } = useGetOrderComplaintsQuery(
    Number(orderId),
    { skip: !orderId },
  );
  const { data: rating } = useGetOrderRatingQuery(Number(orderId), {
    skip: !orderId,
  });

  const handleCancel = () => {
    if (confirm("Bạn có chắc muốn hủy đơn hàng này?")) {
      cancelOrder();
      toast.success("Đã hủy đơn hàng");
    }
  };

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    updateStatus(newStatus);
    setIsStatusModalOpen(false);
    toast.success(`Đã cập nhật trạng thái: ${statusConfig[newStatus].label}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-36 bg-muted rounded animate-pulse" />
            <div className="h-36 bg-muted rounded animate-pulse" />
            <div className="h-36 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
        <h3 className="mt-4 text-lg font-medium">Không tìm thấy đơn hàng</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  const canCancel = (
    [OrderStatus.INITIALIZED, OrderStatus.WAITING] as OrderStatus[]
  ).includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chi tiết đơn hàng</h1>
            <p className="text-sm text-muted-foreground">{order.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsStatusModalOpen(true)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Cập nhật trạng thái
          </Button>
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel}>
              <Ban className="mr-2 h-4 w-4" />
              Hủy đơn
            </Button>
          )}
        </div>
      </div>

      <div
        className={`${status.bg} ${status.color} rounded-lg p-4 flex items-center gap-3`}
      >
        <StatusIcon className="h-6 w-6" />
        <div>
          <p className="font-medium">Trạng thái: {status.label}</p>
          <p className="text-sm opacity-80">
            Cập nhật lần cuối: {formatDate(order.updatedAt || order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        {/* Left Column (wider) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Chi tiết đơn hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.orderDetails?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        Số lượng: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Tổng cộng</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(order.totalPrice)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Lịch sử trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>

          {/* Complaints + Rating — split card */}
        </div>

        {/* Right Column (compact) */}
        <div className="flex flex-col gap-4">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                Khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Tên</span>
                <span className="font-medium text-right">
                  {order.senderName}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Mã KH</span>
                <span className="font-mono text-right">{order.senderId}</span>
              </div>
              {order.customerNote && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Ghi chú</p>
                  <p className="text-xs bg-muted/30 rounded p-2">
                    {order.customerNote}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locker Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Tủ đồ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Tủ</span>
                <span className="font-medium text-right">
                  {order.lockerName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Ngăn gửi</span>
                <Badge variant="outline" className="text-xs">
                  <Box className="mr-1 h-3 w-3" />
                  {order.sendBoxNumber || "N/A"}
                </Badge>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">
                  Ngăn nhận
                </span>
                <Badge variant="outline" className="text-xs">
                  <Box className="mr-1 h-3 w-3" />
                  {order.receiveBoxNumber || "N/A"}
                </Badge>
              </div>
              {order.pinCode && (
                <div className="flex justify-between items-center gap-2 pt-1">
                  <span className="text-muted-foreground shrink-0">PIN</span>
                  <span className="font-mono font-bold tracking-widest">
                    {order.pinCode}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4" />
                Thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">
                  Trạng thái
                </span>
                <Badge
                  className={`text-xs border-0 ${
                    order.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {order.status === "COMPLETED"
                    ? "Đã thanh toán"
                    : "Chưa thanh toán"}
                </Badge>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">
                  Phương thức
                </span>
                <span>N/A</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Tổng tiền</span>
                <span className="text-primary">
                  {formatCurrency(order.totalPrice)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircleWarning className="h-5 w-5" />
              Khiếu nại &amp; Đánh giá
              {complaints.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {complaints.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 divide-x divide-border">
              {/* Complaints panel */}
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <MessageCircleWarning className="h-3.5 w-3.5" />
                  Khiếu nại
                </p>
                {complaints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Không có khiếu nại
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {complaints.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 bg-muted/30 rounded-lg space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-xs font-medium"
                          >
                            {c.type}
                          </Badge>
                          <Badge
                            className={`text-xs border-0 ${
                              c.status === "RESOLVED"
                                ? "bg-green-100 text-green-700"
                                : c.status === "REJECTED"
                                  ? "bg-muted/50 text-muted-foreground"
                                  : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {c.status === "RESOLVED"
                              ? "Đã giải quyết"
                              : c.status === "REJECTED"
                                ? "Từ chối"
                                : "Chờ xử lý"}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{c.description}</p>
                        {c.resolution && (
                          <p className="text-xs text-muted-foreground border-l-2 border-border pl-2">
                            Phản hồi: {c.resolution}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating panel */}
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Đánh giá
                </p>
                {!rating ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Chưa có đánh giá
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold">
                        {rating.rating}/5
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {rating.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rating.createdAt)}
                      </p>
                    </div>
                    {rating.comment && (
                      <p className="text-sm bg-muted/30 rounded-lg p-2.5">
                        {rating.comment}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Update Modal */}
      <OrderStatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={order.status}
        onUpdate={handleStatusUpdate}
      />
    </div>
  );
}

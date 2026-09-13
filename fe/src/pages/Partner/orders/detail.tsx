import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Box,
  Scale,
  CreditCard,
  Clock,
  AlertCircle,
  Check,
  Play,
  CheckCircle,
  RefreshCw,
  MessageCircleWarning,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { PageLoading, ErrorState } from "~/components/ui";
import { useOrderDetail } from "./hooks/useOrderDetail";
import { useGetOrderComplaintsQuery } from "@/stores/apis/partnerApi";
import { AccessCodeModal } from "./components/AccessCodeModal";
import { WeightUpdateModal } from "./components/WeightUpdateModal";
import { ErrorToast } from "./components/ErrorToast";
import { STATUS_LABELS, getStatusBadgeClass } from "./utils/order-helpers";
import { OrderStatus } from "@/types/partner.enum";
import type { StaffAccessCode } from "@/types/partner.type";

const formatCurrency = (amount?: number) => {
  if (!amount) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PartnerOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const {
    order,
    isLoading,
    error,
    refetch,
    errorToast,
    setErrorToast,
    handleAcceptOrder,
    handleUpdateWeight,
    handleProcessOrder,
    handleMarkReady,
    isAccepting,
    isUpdatingWeight,
    isProcessing,
    isMarkingReady,
  } = useOrderDetail(orderId);

  const [accessCodeModal, setAccessCodeModal] = useState<{
    open: boolean;
    code: StaffAccessCode | null;
    action: "COLLECT" | "RETURN";
  }>({ open: false, code: null, action: "COLLECT" });

  const [weightModal, setWeightModal] = useState<{
    open: boolean;
    weight: string;
  }>({ open: false, weight: "" });

  const { data: complaints = [] } = useGetOrderComplaintsQuery(
    Number(orderId),
    { skip: !orderId },
  );

  const onAccept = async () => {
    const code = await handleAcceptOrder();
    if (code) setAccessCodeModal({ open: true, code, action: "COLLECT" });
  };

  const onMarkReady = async () => {
    const code = await handleMarkReady();
    if (code) setAccessCodeModal({ open: true, code, action: "RETURN" });
  };

  const onSubmitWeight = async () => {
    const w = parseFloat(weightModal.weight);
    if (isNaN(w) || w <= 0) return;
    const ok = await handleUpdateWeight(w);
    if (ok) setWeightModal({ open: false, weight: "" });
  };

  if (isLoading) return <PageLoading message="Đang tải chi tiết đơn hàng..." />;

  if (error || !order) {
    return (
      <div className="p-8">
        <ErrorState
          variant="server"
          title="Không tìm thấy đơn hàng"
          error={error}
          onRetry={refetch}
        />
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft size={16} className="mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  const canAccept = order.status === OrderStatus.WAITING;
  const canUpdateWeight =
    order.status === OrderStatus.COLLECTED ||
    order.status === OrderStatus.PROCESSING;
  const canProcess = order.status === OrderStatus.COLLECTED;
  const canMarkReady = order.status === OrderStatus.PROCESSING;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <ErrorToast message={errorToast} onClose={() => setErrorToast(null)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Chi tiết đơn hàng
            </h1>
            <p className="text-sm text-muted-foreground font-mono">{order.orderCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw size={15} className="mr-1.5" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${getStatusBadgeClass(order.status)}`}
      >
        <Package size={20} />
        <div>
          <p className="font-semibold">
            Trạng thái: {STATUS_LABELS[order.status] ?? order.status}
          </p>
          <p className="text-sm opacity-75">
            Cập nhật lần cuối: {formatDate(order.updatedAt)}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      {(canAccept || canUpdateWeight || canProcess || canMarkReady) && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-blue-700 mb-3">
              Hành động khả dụng:
            </p>
            <div className="flex flex-wrap gap-2">
              {canAccept && (
                <Button
                  onClick={onAccept}
                  disabled={isAccepting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check size={15} className="mr-1.5" />
                  {isAccepting ? "Đang xử lý..." : "Chấp nhận đơn & cấp mã"}
                </Button>
              )}
              {canUpdateWeight && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setWeightModal({
                      open: true,
                      weight: order.weight?.toString() ?? "",
                    })
                  }
                >
                  <Scale size={15} className="mr-1.5" />
                  Cập nhật cân nặng
                </Button>
              )}
              {canProcess && (
                <Button
                  onClick={handleProcessOrder}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play size={15} className="mr-1.5" />
                  {isProcessing ? "Đang xử lý..." : "Bắt đầu giặt"}
                </Button>
              )}
              {canMarkReady && (
                <Button
                  onClick={onMarkReady}
                  disabled={isMarkingReady}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <CheckCircle size={15} className="mr-1.5" />
                  {isMarkingReady
                    ? "Đang xử lý..."
                    : "Đánh dấu hoàn thành & cấp mã trả"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User size={18} className="text-blue-600" />
                Thông tin khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tên</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Số điện thoại</span>
                <span className="font-medium">{order.customerPhone}</span>
              </div>
              {order.notes && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ghi chú KH</span>
                  <span className="text-sm max-w-xs text-right">
                    {order.notes}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locker Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin size={18} className="text-blue-600" />
                Thông tin tủ locker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tên tủ</span>
                <span className="font-medium">{order.lockerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Số ngăn</span>
                <Badge variant="outline">Box {order.boxNumber}</Badge>
              </div>
              {order.deliveryAddress && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Địa chỉ giao</span>
                  <span className="text-sm max-w-xs text-right">
                    {order.deliveryAddress}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service & Weight */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Box size={18} className="text-blue-600" />
                Dịch vụ & Cân nặng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Loại dịch vụ</span>
                <Badge variant="outline">{order.serviceType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Phương thức trả</span>
                <span className="font-medium">{order.returnMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cân nặng thực tế</span>
                <span className="font-medium">
                  {order.weight ? (
                    `${order.weight} kg`
                  ) : (
                    <span className="text-muted-foreground/70 italic">Chưa cân</span>
                  )}
                </span>
              </div>
              {order.assignedStaffName && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Nhân viên phụ trách
                  </span>
                  <span className="font-medium">{order.assignedStaffName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Price + Timeline */}
        <div className="space-y-6">
          {/* Price Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard size={18} className="text-blue-600" />
                Tổng quan giá
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tổng tiền</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(order.totalPrice)}
                </span>
              </div>
              {order.platformFee !== undefined && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Phí nền tảng</span>
                    <span className="text-sm">
                      {formatCurrency(order.platformFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Doanh thu partner
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(order.partnerRevenue)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock size={18} className="text-blue-600" />
                Mốc thời gian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TimelineItem label="Tạo đơn" date={order.createdAt} />
                {order.collectedAt && (
                  <TimelineItem label="Đã lấy đồ" date={order.collectedAt} />
                )}
                {order.processedAt && (
                  <TimelineItem label="Đã xử lý" date={order.processedAt} />
                )}
                {order.returnedAt && (
                  <TimelineItem label="Đã trả vào tủ" date={order.returnedAt} />
                )}
                {order.completedAt && (
                  <TimelineItem
                    label="Hoàn thành"
                    date={order.completedAt}
                    highlight
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Meta */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground/70">Mã đơn</span>
                <span className="text-xs font-mono">{order.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground/70">ID đơn</span>
                <span className="text-xs font-mono">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground/70">Trạng thái</span>
                <Badge
                  className={`text-xs ${getStatusBadgeClass(order.status)}`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Complaints */}
      {complaints.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircleWarning size={18} className="text-orange-500" />
              Khiếu nại ({complaints.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="border rounded-lg p-3 space-y-1.5 bg-orange-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {c.type}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      c.status === "RESOLVED"
                        ? "text-green-700 border-green-300"
                        : c.status === "REJECTED"
                          ? "text-muted-foreground border-border/70"
                          : c.status === "INVESTIGATING"
                            ? "text-yellow-700 border-yellow-300"
                            : "text-red-700 border-red-300"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c.description}</p>
                {c.resolution && (
                  <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                    Giải quyết: {c.resolution}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70">
                  {new Date(c.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AccessCodeModal
        isOpen={accessCodeModal.open}
        onClose={() =>
          setAccessCodeModal({ open: false, code: null, action: "COLLECT" })
        }
        code={accessCodeModal.code}
        action={accessCodeModal.action}
      />

      <WeightUpdateModal
        isOpen={weightModal.open}
        onClose={() => setWeightModal({ open: false, weight: "" })}
        order={order}
        weight={weightModal.weight}
        onWeightChange={(w) => setWeightModal((p) => ({ ...p, weight: w }))}
        onSubmit={onSubmitWeight}
        isLoading={isUpdatingWeight}
      />
    </div>
  );
}

function TimelineItem({
  label,
  date,
  highlight,
}: {
  label: string;
  date?: string;
  highlight?: boolean;
}) {
  if (!date) return null;
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 w-2 h-2 rounded-full shrink-0 ${highlight ? "bg-green-500" : "bg-blue-400"}`}
      />
      <div>
        <p
          className={`text-sm font-medium ${highlight ? "text-green-700" : "text-foreground/80"}`}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {new Date(date).toLocaleString("vi-VN")}
        </p>
      </div>
    </div>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  MapPin,
  Store,
  CheckCircle2,
  XCircle,
  Wrench,
  WifiOff,
  Unlock,
  RefreshCw,
  History,
  AlertCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import { LockerStatus, BoxStatus } from "~/types/admin/enums";
import { useLockerDetail } from "./hooks/useLockerDetail";
import { BoxForceOpenModal } from "./components/BoxForceOpenModal";
import { useState } from "react";

const lockerStatusConfig: Record<
  LockerStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  [LockerStatus.ACTIVE]: {
    label: "Hoạt động",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: CheckCircle2,
  },
  [LockerStatus.INACTIVE]: {
    label: "Vô hiệu",
    color: "text-foreground/80",
    bg: "bg-muted/50",
    icon: XCircle,
  },
  [LockerStatus.MAINTENANCE]: {
    label: "Bảo trì",
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    icon: Wrench,
  },
  [LockerStatus.DISCONNECTED]: {
    label: "Mất kết nối",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: WifiOff,
  },
};

const boxStatusConfig: Record<
  BoxStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  [BoxStatus.AVAILABLE]: {
    label: "Trống",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  [BoxStatus.OCCUPIED]: {
    label: "Có đồ",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  [BoxStatus.RESERVED]: {
    label: "Đã đặt",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  [BoxStatus.MAINTENANCE]: {
    label: "Bảo trì",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
};

export default function LockerDetailPage() {
  const { lockerId } = useParams<{ lockerId: string }>();
  const navigate = useNavigate();
  const { locker, isLoading, boxes, refreshBoxes } = useLockerDetail(lockerId);
  const [selectedBox, setSelectedBox] = useState<typeof boxes[0] | null>(null);
  const [isForceOpenModalOpen, setIsForceOpenModalOpen] = useState(false);

  const handleForceOpen = (boxId: number) => {
    toast.success(`Đã mở ngăn tủ #${boxId}`);
    setIsForceOpenModalOpen(false);
    setSelectedBox(null);
    // Refresh boxes after force open
    setTimeout(() => refreshBoxes(), 1000);
  };

  const openForceOpenModal = (box: typeof boxes[0]) => {
    setSelectedBox(box);
    setIsForceOpenModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-muted rounded animate-pulse" />
          <div className="lg:col-span-2 h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!locker) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
        <h3 className="mt-4 text-lg font-medium">Không tìm thấy tủ đồ</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const status = lockerStatusConfig[locker.status];
  const StatusIcon = status.icon;

  const availableBoxes = boxes.filter((b) => b.status === BoxStatus.AVAILABLE).length;
  const occupiedBoxes = boxes.filter((b) => b.status === BoxStatus.OCCUPIED).length;
  const reservedBoxes = boxes.filter((b) => b.status === BoxStatus.RESERVED).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chi tiết tủ đồ</h1>
            <p className="text-sm text-muted-foreground">{locker.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshBoxes}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`${status.bg} ${status.color} rounded-lg p-4 flex items-center gap-3`}>
        <StatusIcon className="h-6 w-6" />
        <div>
          <p className="font-medium">Trạng thái: {status.label}</p>
          <p className="text-sm opacity-80">
            Cập nhật lần cuối: {locker.lastConnected}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Locker Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Thông tin tủ đồ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tên tủ</p>
                <p className="font-medium">{locker.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mã thiết bị</p>
                <p className="font-mono text-sm">{locker.code}</p>
              </div>
              <Separator />
              <div className="flex items-start gap-2">
                <Store className="h-4 w-4 text-muted-foreground/70 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Cửa hàng</p>
                  <p className="font-medium">{locker.storeName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground/70 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Địa chỉ</p>
                  <p className="text-sm">{locker.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Box Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Thống kê ngăn tủ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{availableBoxes}</p>
                  <p className="text-sm text-green-600">Ngăn trống</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-700">{occupiedBoxes}</p>
                  <p className="text-sm text-orange-600">Có đồ</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{reservedBoxes}</p>
                  <p className="text-sm text-blue-600">Đã đặt</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground/80">{boxes.length}</p>
                  <p className="text-sm text-muted-foreground">Tổng số</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Boxes Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Danh sách ngăn tủ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {boxes.map((box) => {
                  const config = boxStatusConfig[box.status];
                  return (
                    <div
                      key={box.id}
                      className={`relative p-3 rounded-lg border-2 ${config.bg} ${config.border} cursor-pointer hover:shadow-md transition-all`}
                      onClick={() => box.status === BoxStatus.OCCUPIED && openForceOpenModal(box)}
                    >
                      <div className="text-center">
                        <p className="font-bold text-lg">{box.number}</p>
                        <p className={`text-xs ${config.color}`}>{config.label}</p>
                      </div>
                      {box.status === BoxStatus.OCCUPIED && (
                        <div className="absolute top-1 right-1">
                          <Unlock className="h-3 w-3 text-orange-500" />
                        </div>
                      )}
                      {box.orderId && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {box.orderId}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                {Object.entries(boxStatusConfig).map(([status, config]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${config.bg} ${config.border} border`} />
                    <span className={config.color}>{config.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Click vào ngăn có đồ để mở tủ hỗ trợ khách hàng. Hành động này sẽ được ghi lại trong nhật ký.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Force Open Modal */}
      <BoxForceOpenModal
        isOpen={isForceOpenModalOpen}
        onClose={() => {
          setIsForceOpenModalOpen(false);
          setSelectedBox(null);
        }}
        box={selectedBox}
        onConfirm={handleForceOpen}
      />
    </div>
  );
}

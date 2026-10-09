import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  WifiOff,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { formatCurrency } from "~/lib/report-format";
import {
  useCloseParcelDropIncidentMutation,
  useCompensationParcelDropIncidentMutation,
  useCreateParcelDropIncidentMutation,
  useGetParcelDropIncidentsQuery,
  type ParcelDropIncident,
} from "~/stores/apis/admin/parcelDropIncidents";
import { useGetDronesQuery } from "~/stores/apis/admin/drones";

const statusLabels: Record<string, string> = {
  SEARCH_REQUIRED: "Cần tìm kiếm",
  ASSIGNED: "Đã phân công",
  ACCEPTED: "Đã nhận",
  SEARCHING: "Đang tìm kiếm",
  FIELD_INSPECTION_COMPLETED: "Đã kiểm tra hiện trường",
  UNDER_INSPECTION: "Đang kiểm tra kỹ thuật",
  UNDER_REPAIR: "Drone đang sửa",
  TESTING: "Đang chạy thử",
  TECHNICAL_COMPLETED: "Đã xử lý kỹ thuật",
  PENDING_REVIEW: "Chờ duyệt",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
  EVIDENCE_REQUESTED: "Cần thêm bằng chứng",
};

const typeLabels: Record<string, string> = {
  PARCEL_DROP: "Rơi kiện hàng",
  CONNECTION_LOST: "Mất kết nối drone",
  DRONE_FAULT: "Lỗi kỹ thuật drone",
};

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return value == null || value === "" || !Number.isFinite(parsed) ? null : parsed;
}

function compensationPercent(incident: ParcelDropIncident): number {
  const configured = numberValue(incident.metadata?.platformLiabilityPercentage);
  return configured != null && configured >= 0 && configured <= 100 ? configured : 60;
}

export default function DroneIncidentsPage() {
  const [searchParams] = useSearchParams();
  const targetIncidentId = Number(searchParams.get("incident")) || null;
  const { data, isLoading, isFetching, refetch } = useGetParcelDropIncidentsQuery();
  const [approve, approveState] = useCompensationParcelDropIncidentMutation();
  const [close] = useCloseParcelDropIncidentMutation();
  const [createIncident, createState] = useCreateParcelDropIncidentMutation();
  const { data: dronesData } = useGetDronesQuery();
  const [filter, setFilter] = useState("");
  const [compensationIncident, setCompensationIncident] = useState<ParcelDropIncident | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [compensationNote, setCompensationNote] = useState("");
  const [faultDialogOpen, setFaultDialogOpen] = useState(false);
  const [faultDroneId, setFaultDroneId] = useState("");
  const [faultNote, setFaultNote] = useState("");

  const incidents = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    return (data?.data ?? []).filter((incident) =>
      `${incident.incidentNumber} ${incident.incidentType} ${incident.title} ${incident.note} ${incident.orderId} ${incident.droneId} ${incident.status}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [data?.data, filter]);

  useEffect(() => {
    if (!targetIncidentId || isLoading) return;
    document.getElementById(`incident-${targetIncidentId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [targetIncidentId, isLoading, incidents.length]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Không thể cập nhật phiếu sự cố");
    }
  };

  const openCompensation = (incident: ParcelDropIncident) => {
    const declared = numberValue(incident.metadata?.declaredValue) ?? 0;
    setApprovedAmount(String(Math.round(declared * compensationPercent(incident) / 100)));
    setCompensationNote("");
    setCompensationIncident(incident);
  };

  const submitCompensation = async () => {
    if (!compensationIncident) return;
    const declared = numberValue(compensationIncident.metadata?.declaredValue) ?? 0;
    const amount = Number(approvedAmount);
    if (!Number.isFinite(amount) || amount < 0 || amount > declared) {
      toast.error("Số tiền bồi thường phải từ 0 đến giá trị khai báo");
      return;
    }
    if (!compensationNote.trim()) {
      toast.error("Vui lòng nhập nội dung hoặc lý do bồi thường");
      return;
    }
    try {
      await approve({
        id: compensationIncident.id,
        action: "APPROVE",
        approvedAmount: amount,
        note: compensationNote.trim(),
      }).unwrap();
      toast.success("Đã phê duyệt bồi thường");
      setCompensationIncident(null);
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Không thể phê duyệt bồi thường");
    }
  };

  const openFaultDialog = () => {
    setFaultDroneId(String(dronesData?.data?.[0]?.id ?? ""));
    setFaultNote("");
    setFaultDialogOpen(true);
  };

  const submitFault = async () => {
    const droneId = Number(faultDroneId);
    if (!Number.isInteger(droneId) || droneId <= 0) return toast.error("Vui lòng chọn drone");
    if (!faultNote.trim()) return toast.error("Vui lòng mô tả lỗi drone");
    try {
      await createIncident({ droneId, incidentType: "DRONE_FAULT", note: faultNote.trim() }).unwrap();
      toast.success("Đã tạo phiếu lỗi và tự động gán KTV drone gần nhất");
      setFaultDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Không thể tạo phiếu lỗi drone");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sự cố drone"
        description="Theo dõi sự cố chuyến bay và lỗi thiết bị, KTV drone gần nhất được hệ thống tự động điều phối"
      />

      {targetIncidentId && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Phiếu vừa tạo đang được đánh dấu trong danh sách bên dưới.
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo mã phiếu, đơn hàng, drone, loại hoặc trạng thái..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
        <Button variant="destructive" onClick={openFaultDialog}>
          <Wrench className="mr-2 h-4 w-4" />
          Báo lỗi drone
        </Button>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="p-3 text-left">Phiếu sự cố</th>
                  <th className="p-3 text-left">Đơn / Drone</th>
                  <th className="p-3 text-left">Trạng thái</th>
                  <th className="p-3 text-left">Ghi nhận & phân công tự động</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="p-8 text-center" colSpan={5}>Đang tải...</td></tr>
                ) : incidents.length === 0 ? (
                  <tr><td className="p-8 text-center text-muted-foreground" colSpan={5}>Chưa có phiếu sự cố phù hợp</td></tr>
                ) : (
                  incidents.map((incident) => (
                    <IncidentRow
                      key={incident.id}
                      incident={incident}
                      highlighted={incident.id === targetIncidentId}
                      onCompensate={() => openCompensation(incident)}
                      onClose={() => run(
                        () => close({ id: incident.id, resolution: "Closed by admin" }).unwrap(),
                        "Đã đóng phiếu sự cố",
                      )}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={compensationIncident != null} onOpenChange={(open) => !open && setCompensationIncident(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận bồi thường</DialogTitle>
            <DialogDescription>
              Kiểm tra giá trị và nhập đầy đủ nội dung trước khi phê duyệt. Phiếu sẽ chuyển sang trạng thái đã giải quyết.
            </DialogDescription>
          </DialogHeader>
          {compensationIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Phiếu / đơn hàng</div>
                  <div className="font-medium">{compensationIncident.incidentNumber} · Đơn #{compensationIncident.orderId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Giá trị khai báo</div>
                  <div className="font-medium">{formatCurrency(numberValue(compensationIncident.metadata?.declaredValue))}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">
                    Mức hệ thống đề xuất ({compensationPercent(compensationIncident)}%)
                  </div>
                  <div className="font-semibold text-emerald-700">
                    {formatCurrency(
                      (numberValue(compensationIncident.metadata?.declaredValue) ?? 0)
                        * compensationPercent(compensationIncident) / 100,
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Phần khách hàng tự chịu: {100 - compensationPercent(compensationIncident)}%
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approved-compensation">Số tiền bồi thường (VND)</Label>
                <Input
                  id="approved-compensation"
                  type="number"
                  min={0}
                  max={numberValue(compensationIncident.metadata?.declaredValue) ?? 0}
                  step={1000}
                  value={approvedAmount}
                  onChange={(event) => setApprovedAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compensation-note">Nội dung / lý do bồi thường</Label>
                <Textarea
                  id="compensation-note"
                  placeholder="Ví dụ: Kiện hàng không thể thu hồi sau khi KTV kiểm tra hiện trường..."
                  value={compensationNote}
                  onChange={(event) => setCompensationNote(event.target.value)}
                />
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Sau khi xác nhận, số tiền và ghi chú sẽ được lưu vào phiếu để đối soát.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompensationIncident(null)} disabled={approveState.isLoading}>
              Hủy
            </Button>
            <Button onClick={submitCompensation} disabled={approveState.isLoading}>
              {approveState.isLoading ? "Đang xử lý..." : "Xác nhận bồi thường"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={faultDialogOpen} onOpenChange={setFaultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo lỗi kỹ thuật drone</DialogTitle>
            <DialogDescription>
              Phiếu sẽ xuất hiện trong danh sách chung và được gán tự động cho KTV drone gần nhất.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fault-drone">Drone gặp lỗi</Label>
              <select
                id="fault-drone"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={faultDroneId}
                onChange={(event) => setFaultDroneId(event.target.value)}
              >
                {(dronesData?.data ?? []).filter((drone) => drone.active).map((drone) => (
                  <option key={drone.id} value={drone.id}>{drone.code} · {drone.lockerName ?? `Trạm #${drone.lockerId}`}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fault-note">Mô tả lỗi</Label>
              <Textarea id="fault-note" value={faultNote} onChange={(event) => setFaultNote(event.target.value)} placeholder="Ví dụ: Động cơ rung bất thường khi kiểm tra trước chuyến bay..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaultDialogOpen(false)} disabled={createState.isLoading}>Huỷ</Button>
            <Button variant="destructive" onClick={submitFault} disabled={createState.isLoading}>
              {createState.isLoading ? "Đang tạo..." : "Tạo phiếu và phân công"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncidentRow({
  incident,
  highlighted,
  onCompensate,
  onClose,
}: {
  incident: ParcelDropIncident;
  highlighted: boolean;
  onCompensate: () => void;
  onClose: () => void;
}) {
  const metadata = incident.metadata ?? {};
  const isParcelDrop = incident.incidentType === "PARCEL_DROP";
  const technicianId = incident.assignedTechnicianId ?? numberValue(metadata.assignedDroneTechnicianId);
  const technicianName = String(metadata.assignedDroneTechnicianName ?? "").trim();
  const lockerName = String(metadata.technicianStationLockerName ?? metadata.technicianStationLockerCode ?? "").trim();
  const lockerAddress = String(metadata.technicianStationAddress ?? "").trim();
  const declaredValue = numberValue(metadata.declaredValue);
  const compensationApproved = metadata.compensationStatus === "APPROVED";

  return (
    <tr
      id={`incident-${incident.id}`}
      className={`border-b last:border-0 ${highlighted ? "bg-emerald-50 ring-2 ring-inset ring-emerald-400" : ""}`}
    >
      <td className="p-3 align-top">
        <div className="flex items-center gap-2 font-semibold">
          {isParcelDrop ? <AlertTriangle className="h-4 w-4 text-red-600" /> : incident.incidentType === "DRONE_FAULT" ? <Wrench className="h-4 w-4 text-orange-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}
          {incident.incidentNumber}
        </div>
        <div className="mt-1 text-xs font-medium">{typeLabels[incident.incidentType] ?? incident.incidentType}</div>
        <div className="text-xs text-muted-foreground">{new Date(incident.reportedAt).toLocaleString("vi-VN")}</div>
      </td>
      <td className="p-3 align-top">
        <div>{incident.orderId ? `Đơn #${incident.orderId}` : "Không gắn đơn hàng"}</div>
        <div className="text-muted-foreground">Drone #{incident.droneId}</div>
      </td>
      <td className="p-3 align-top">
        <Badge variant="outline">{statusLabels[incident.status] ?? incident.status}</Badge>
        {metadata.flightOperationStatus === "INCIDENT_INTERRUPTED" && (
          <div className="mt-1 font-semibold text-red-600">Chuyến bay bị gián đoạn</div>
        )}
        {isParcelDrop && <div className="mt-1 text-xs">Kết quả kiện: {String(metadata.parcelResult ?? "Chưa xác định")}</div>}
        {isParcelDrop && declaredValue != null && (
          <div className="mt-1 text-xs">Giá trị khai báo: {formatCurrency(declaredValue)}</div>
        )}
      </td>
      <td className="max-w-md p-3 align-top text-xs">
        <p className="font-medium text-foreground">{incident.note || "Không có ghi chú"}</p>
        <p className="mt-1 text-muted-foreground">
          Cách phát hiện: {String(metadata.detectionMethod ?? (isParcelDrop ? "Quan sát camera" : "Quan sát mất kết nối"))}
        </p>
        {metadata.latitude != null && metadata.longitude != null && (
          <p className="mt-1 flex items-start gap-1">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Vị trí drone: {String(metadata.latitude)}, {String(metadata.longitude)}
              {" · "}
              <a
                className="font-medium text-primary hover:underline"
                href={`https://www.google.com/maps/search/?api=1&query=${metadata.latitude},${metadata.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Mở bản đồ
              </a>
            </span>
          </p>
        )}
        {technicianId ? (
          <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-900">
            <p className="flex items-center gap-1 font-semibold">
              <UserRound className="h-3.5 w-3.5" />
              KTV drone hệ thống gán: {technicianName || `KTV #${technicianId}`}
            </p>
            <p className="mt-1">
              Trạm làm việc: {lockerName || "chưa xác định"}
              {metadata.technicianDistanceKm != null ? ` · cách sự cố ${metadata.technicianDistanceKm} km` : ""}
            </p>
            {lockerAddress && <p>{lockerAddress}</p>}
            {metadata.technicianStationLatitude != null && metadata.technicianStationLongitude != null && (
              <a
                className="font-medium underline"
                href={`https://www.google.com/maps/search/?api=1&query=${metadata.technicianStationLatitude},${metadata.technicianStationLongitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Xem vị trí trạm của KTV drone
              </a>
            )}
          </div>
        ) : (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
            Chưa thể tự gán KTV drone: hệ thống chưa tìm thấy KTV drone khả dụng.
          </p>
        )}
        <p className="mt-1">Bằng chứng: {incident.evidence?.length ?? 0}</p>
      </td>
      <td className="p-3 text-right align-top">
        <div className="flex justify-end gap-2">
          {isParcelDrop && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCompensate}
              disabled={incident.status === "CLOSED" || compensationApproved || declaredValue == null || declaredValue <= 0}
              title={declaredValue == null || declaredValue <= 0 ? "Đơn hàng chưa có giá trị khai báo" : undefined}
            >
              <ShieldAlert className="mr-1 h-3.5 w-3.5" />
              {compensationApproved ? "Đã duyệt BT" : "Bồi thường"}
            </Button>
          )}
          <Button size="sm" onClick={onClose} disabled={incident.status !== "RESOLVED"}>Đóng phiếu</Button>
        </div>
      </td>
    </tr>
  );
}

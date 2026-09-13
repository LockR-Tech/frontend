import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  UserCheck,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "~/components/shared/page-header";
import { RepairLogDialog } from "./RepairLogDialog";
import { MaintenanceSchedules } from "./MaintenanceSchedules";
import {
  useGetFaultCellsQuery,
  useGetMaintenanceReportsQuery,
  useClaimReportMutation,
  useResolveReportMutation,
  useClearBoxFaultMutation,
  useGetDeviceStatusesQuery,
} from "~/stores/apis/admin/lockerOps";

const REPORT_BADGE: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800 border-red-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-300",
  RESOLVED: "bg-green-100 text-green-800 border-green-300",
};

type LocationPayload = {
  lockerAddress?: string | null;
  lockerLatitude?: number | null;
  lockerLongitude?: number | null;
};

function openDirections(location: LocationPayload) {
  const { lockerAddress, lockerLatitude, lockerLongitude } = location;
  const url =
    lockerLatitude != null && lockerLongitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lockerLatitude},${lockerLongitude}&travelmode=driving`
      : lockerAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lockerAddress)}`
        : null;

  if (!url) {
    toast.error("Tủ này chưa có vị trí để chỉ đường");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function MaintenancePage() {
  const faults = useGetFaultCellsQuery();
  const reports = useGetMaintenanceReportsQuery();
  const deviceStatuses = useGetDeviceStatusesQuery();
  const [claim] = useClaimReportMutation();
  const [resolve] = useResolveReportMutation();
  const [clearFault] = useClearBoxFaultMutation();
  const [pending, setPending] = useState<number | null>(null);

  const act = async (id: number, fn: () => Promise<unknown>, ok: string, fail: string) => {
    setPending(id);
    try {
      await fn();
      toast.success(ok);
    } catch {
      toast.error(fail);
    } finally {
      setPending(null);
    }
  };

  const faultList = faults.data?.data ?? [];
  const reportList = reports.data?.data ?? [];
  const openReports = reportList.filter((r) => r.status === "OPEN").length;
  const inProgressReports = reportList.filter((r) => r.status === "IN_PROGRESS").length;
  const resolvedReports = reportList.filter((r) => r.status === "RESOLVED").length;
  const overdueReports = reportList.filter((r) => r.overdue).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảo trì tủ"
        description="Sự cố ô tủ đang mở và phiếu xử lý của đội kỹ thuật"
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ô hỏng</p>
            <p className="text-2xl font-bold text-red-700">{faultList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Phiếu mới</p>
            <p className="text-2xl font-bold text-orange-700">{openReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Đang xử lý</p>
            <p className="text-2xl font-bold text-yellow-700">{inProgressReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Đã xong</p>
            <p className="text-2xl font-bold text-green-700">{resolvedReports}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Ô đang hỏng ({faultList.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              faults.refetch();
              reports.refetch();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
          </Button>
        </CardHeader>
        <CardContent>
          {faultList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Không có ô nào đang hỏng 🎉
            </p>
          ) : (
            <div className="divide-y">
              {faultList.map((f) => (
                <div key={f.boxId} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium">
                      {f.lockerName ?? `Tủ #${f.lockerId}`}{" "}
                      <span className="text-muted-foreground">({f.lockerCode})</span> — Ô #{f.boxNumber}
                      <Badge variant="outline" className="ml-2">{f.cellType}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {f.faultReason ?? "Không rõ lý do"}
                      {f.rowIndex != null && ` · hàng ${f.rowIndex}, cột ${f.colIndex}`}
                    </p>
                    {f.lockerAddress && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {f.lockerAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDirections(f)}>
                      <Navigation className="w-4 h-4 mr-1" /> Chỉ đường
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending === f.boxId}
                      onClick={() =>
                        act(
                          f.boxId,
                          () => clearFault(f.boxId).unwrap(),
                          `Ô #${f.boxNumber} đã hoạt động lại`,
                          "Không xóa được trạng thái hỏng",
                        )
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Đã sửa xong
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Phiếu sự cố đang mở ({reportList.length})
            {overdueReports > 0 && (
              <span className="text-red-600 font-semibold">
                {" "}· {overdueReports} quá hạn SLA
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Không có phiếu nào.</p>
          ) : (
            <div className="divide-y">
              {reportList.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium">
                      #{r.id} · {r.title}{" "}
                      <Badge className={`ml-1 ${REPORT_BADGE[r.status] ?? ""}`} variant="outline">
                        {r.status}
                      </Badge>
                      {r.overdue && (
                        <Badge
                          className="ml-1 bg-red-100 text-red-800 border-red-300"
                          variant="outline"
                        >
                          Quá hạn SLA
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.description} · {r.lockerName ?? `tủ ${r.lockerId}`}
                      {r.boxNumber ? ` · ô ${r.boxNumber}` : r.boxId ? ` · ô ${r.boxId}` : ""}{" "}
                      {r.cellType ? `· ${r.cellType} ` : ""}
                      ·{" "}
                      {new Date(r.createdAt).toLocaleString("vi-VN")}
                      {r.assignedToUserId ? ` · KTV #${r.assignedToUserId}` : ""}
                    </p>
                    {(r.reporterName || r.reporterPhone) && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {[r.reporterName, r.reporterPhone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {r.lockerAddress && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.lockerAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDirections(r)}>
                      <Navigation className="w-4 h-4 mr-1" /> Chỉ đường
                    </Button>
                    <RepairLogDialog reportId={r.id} title={`#${r.id} · ${r.title}`} />
                    {r.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending === r.id}
                        onClick={() =>
                          act(
                            r.id,
                            () => claim(r.id).unwrap(),
                            `Đã nhận phiếu #${r.id}`,
                            "Không nhận được phiếu",
                          )
                        }
                      >
                        <UserCheck className="w-4 h-4 mr-1" /> Nhận việc
                      </Button>
                    )}
                    {r.status !== "RESOLVED" && (
                      <Button
                        size="sm"
                        disabled={pending === r.id}
                        onClick={() =>
                          act(
                            r.id,
                            () => resolve(r.id).unwrap(),
                            `Phiếu #${r.id} đã xử lý, ô hoạt động lại`,
                            "Không xử lý được phiếu",
                          )
                        }
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Hoàn tất
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MaintenanceSchedules />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Sức khỏe thiết bị (cabinet)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(deviceStatuses.data?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Chưa có dữ liệu heartbeat thiết bị nào.
            </p>
          ) : (
            <div className="divide-y">
              {(deviceStatuses.data?.data ?? []).map((d) => {
                const online = d.status?.toUpperCase() === "ONLINE";
                return (
                  <div key={d.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      {online ? (
                        <Wifi className="w-4 h-4 text-green-600" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{d.deviceId}</p>
                        <p className="text-sm text-muted-foreground">
                          {d.lockerId ? `Tủ ${d.lockerId}` : "Chưa gán tủ"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          online
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        }
                      >
                        {d.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("vi-VN") : "Chưa từng kết nối"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

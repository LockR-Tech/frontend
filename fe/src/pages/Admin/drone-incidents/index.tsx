import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  MapPin,
  PackageSearch,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import {
  useAssignDroneRecoveryMutation,
  useApproveDroneIncidentCompensationMutation,
  useCreateDroneIncidentProposalMutation,
  useGetDroneIncidentQuery,
  useGetDroneIncidentsQuery,
  useVerifyDroneRecoveryMutation,
  type DroneParcelIncident,
} from "~/stores/apis/admin/droneIncidents";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";

const statusLabel: Record<string, string> = {
  REPORTED: "Đã báo sự cố",
  INVESTIGATING: "Đang điều tra",
  RECOVERY_IN_PROGRESS: "Đang thu hồi",
  AWAITING_ADMIN_REVIEW: "Chờ Admin xác minh",
  AWAITING_CUSTOMER_RESPONSE: "Chờ khách phản hồi",
  RESOLUTION_IN_PROGRESS: "Đang xử lý phương án",
  DISPUTED: "Yêu cầu xem xét lại",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
  MANUAL_INTERVENTION_REQUIRED: "Cần can thiệp thủ công",
};

function statusTone(status: string) {
  if (["CLOSED", "RESOLVED", "VERIFIED", "RECOVERED"].includes(status))
    return "bg-emerald-100 text-emerald-800";
  if (["DISPUTED", "MANUAL_INTERVENTION_REQUIRED", "LOST"].includes(status))
    return "bg-red-100 text-red-800";
  if (status.startsWith("AWAITING")) return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-800";
}

export default function DroneIncidentsPage() {
  const { data, isLoading, isFetching, refetch } = useGetDroneIncidentsQuery(
    undefined,
    { pollingInterval: 10_000 },
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState("ALL");
  const incidents = data?.data ?? [];
  const visible =
    filter === "ALL"
      ? incidents
      : incidents.filter((item) => item.status === filter);
  const counts = {
    open: incidents.filter(
      (item) => !["CLOSED", "RESOLVED"].includes(item.status),
    ).length,
    recovering: incidents.filter((item) =>
      ["ASSIGNED", "ACCEPTED", "SEARCHING"].includes(item.recoveryStatus),
    ).length,
    review: incidents.filter((item) => item.status === "AWAITING_ADMIN_REVIEW")
      .length,
    closed: incidents.filter((item) =>
      ["CLOSED", "RESOLVED"].includes(item.status),
    ).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sự cố rơi kiện Drone"
        description="Theo dõi điều phối thu hồi, kiểm tra drone, bằng chứng và phương án xử lý cho khách hàng."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Đang mở" value={counts.open} />
        <Stat label="Đang thu hồi" value={counts.recovering} />
        <Stat label="Chờ xác minh" value={counts.review} />
        <Stat label="Đã hoàn tất" value={counts.closed} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            "ALL",
            "INVESTIGATING",
            "RECOVERY_IN_PROGRESS",
            "AWAITING_ADMIN_REVIEW",
            "AWAITING_CUSTOMER_RESPONSE",
            "DISPUTED",
            "CLOSED",
          ].map((value) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
            >
              {value === "ALL" ? "Tất cả" : (statusLabel[value] ?? value)}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin" />
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <PackageSearch className="mx-auto mb-3 h-9 w-9 opacity-40" />
              Không có sự cố trong nhóm này.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Mã sự cố</th>
                  <th className="px-4 py-3">Đơn / Drone</th>
                  <th className="px-4 py-3">Sự cố</th>
                  <th className="px-4 py-3">Thu hồi</th>
                  <th className="px-4 py-3">Kiểm tra drone</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {item.incidentCode}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {item.orderCode ?? `#${item.orderId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.droneCode}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Status value={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Status value={item.recoveryStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Status value={item.inspectionStatus} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(item.id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <IncidentDetail id={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Status({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={`whitespace-nowrap border-0 ${statusTone(value)}`}
    >
      {statusLabel[value] ?? value.replaceAll("_", " ")}
    </Badge>
  );
}

function IncidentDetail({
  id,
  onClose,
}: {
  id: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetDroneIncidentQuery(id ?? 0, {
    skip: id == null,
    pollingInterval: 8_000,
  });
  const incident = data?.data;
  return (
    <Dialog open={id != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {incident?.incidentCode ?? "Chi tiết sự cố"}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !incident ? (
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin" />
        ) : (
          <IncidentBody incident={incident} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IncidentBody({ incident }: { incident: DroneParcelIncident }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Info
          label="Đơn hàng"
          value={incident.orderCode ?? `#${incident.orderId}`}
        />
        <Info label="Drone" value={incident.droneCode} />
        <Info
          label="Trạng thái"
          value={statusLabel[incident.status] ?? incident.status}
        />
        <Info
          label="Vị trí rơi"
          value={
            incident.dropLatitude != null
              ? `${incident.dropLatitude.toFixed(6)}, ${incident.dropLongitude?.toFixed(6)}`
              : "Không có GPS"
          }
        />
        <Info label="Nguồn GPS" value={incident.gpsSource} />
        <Info
          label="Camera / telemetry"
          value={`${incident.cameraStatus} · ${incident.telemetryStale ? "dữ liệu cũ" : "trực tuyến"}`}
        />
      </div>
      <div className="rounded-lg border p-4">
        <p className="font-semibold">Mô tả sự cố</p>
        <p className="mt-2 text-sm text-muted-foreground">{incident.reason}</p>
      </div>
      {incident.dropLatitude != null && (
        <a
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
          href={`https://www.openstreetmap.org/?mlat=${incident.dropLatitude}&mlon=${incident.dropLongitude}#map=17/${incident.dropLatitude}/${incident.dropLongitude}`}
        >
          <MapPin className="mr-1 h-4 w-4" />
          Mở vị trí rơi trên bản đồ
        </a>
      )}
      <AdminActions incident={incident} />
      <div>
        <h3 className="mb-3 font-semibold">
          Bằng chứng ({incident.evidence.length})
        </h3>
        {incident.evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có ảnh bằng chứng.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {incident.evidence.map((item) => (
              <a
                key={item.id}
                href={item.secureUrl}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border"
              >
                <img
                  src={item.secureUrl}
                  alt={item.caption ?? item.stage}
                  className="h-32 w-full object-cover"
                />
                <p className="p-2 text-xs">{item.caption ?? item.stage}</p>
              </a>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-3 font-semibold">Lịch sử xử lý</h3>
        <div className="space-y-2">
          {incident.timeline.map((item) => (
            <div key={item.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">
                  {item.eventType.replaceAll("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
              {item.note && (
                <p className="mt-1 text-muted-foreground">{item.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold">
          Phương án đã tạo ({incident.proposals.length})
        </h3>
        {incident.proposals.map((proposal) => (
          <div key={proposal.id} className="mb-2 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <b>
                Phiên bản {proposal.proposalVersion} ·{" "}
                {proposal.resolutionType.replaceAll("_", " ")}
              </b>
              <Status value={proposal.status} />
            </div>
            <p className="mt-1 text-muted-foreground">
              Bồi thường: {formatCurrency(proposal.compensationAmount ?? 0)} ·
              Policy: {proposal.policyVersion}
            </p>
            {proposal.customerResponseNote && (
              <p className="mt-1">
                Khách phản hồi: {proposal.customerResponseNote}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function AdminActions({ incident }: { incident: DroneParcelIncident }) {
  const { data: users } = useGetAllUsersQuery({ page: 0, size: 1000 });
  const raw = users?.data as unknown;
  const techs = useMemo(() => {
    type User = {
      id: number;
      fullName?: string;
      status?: string;
      roles?: string[];
    };
    const list: User[] = Array.isArray(raw)
      ? raw
      : ((raw as { content?: User[] } | undefined)?.content ?? []);
    return list.filter(
      (user) =>
        user.status === "ACTIVE" &&
        (user.roles ?? []).some((role) =>
          ["LOCKER_TECHNICIAN", "ROLE_LOCKER_TECHNICIAN"].includes(role),
        ),
    );
  }, [raw]);
  const [technicianId, setTechnicianId] = useState(
    incident.recoveryAssignedToUserId?.toString() ?? "",
  );
  const [resolutionType, setResolutionType] = useState("COMPENSATION_ONLY");
  const [amount, setAmount] = useState("0");
  const [overrideReason, setOverrideReason] = useState("");
  const [assign, assignState] = useAssignDroneRecoveryMutation();
  const [verify, verifyState] = useVerifyDroneRecoveryMutation();
  const [propose, proposalState] = useCreateDroneIncidentProposalMutation();
  const [approveCompensation, approvalState] =
    useApproveDroneIncidentCompensationMutation();
  const handle = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ??
          "Thao tác thất bại",
      );
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">Điều phối thu hồi</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Chỉ hiển thị KTV tủ đang hoạt động.
        </p>
        <div className="flex gap-2">
          <Select value={technicianId} onValueChange={setTechnicianId}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn KTV tủ" />
            </SelectTrigger>
            <SelectContent>
              {techs.map((tech) => (
                <SelectItem key={tech.id} value={String(tech.id)}>
                  {tech.fullName ?? `KTV #${tech.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!technicianId || assignState.isLoading}
            onClick={() =>
              handle(
                () =>
                  assign({
                    id: incident.id,
                    technicianId: Number(technicianId),
                  }).unwrap(),
                "Đã phân công thu hồi",
              )
            }
          >
            Phân công
          </Button>
        </div>
        {incident.recoveryStatus === "SUBMITTED" && (
          <Button
            className="mt-3"
            variant="outline"
            disabled={verifyState.isLoading}
            onClick={() =>
              handle(
                () => verify(incident.id).unwrap(),
                "Đã xác minh kết quả thu hồi",
              )
            }
          >
            Xác minh kết quả
          </Button>
        )}
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">Phương án cho khách hàng</h3>
        <div className="mt-3 space-y-2">
          <Select value={resolutionType} onValueChange={setResolutionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE_REDELIVERY">Giao lại miễn phí</SelectItem>
              <SelectItem value="REDELIVERY_PARTIAL_COMPENSATION">
                Giao lại + bồi thường một phần
              </SelectItem>
              <SelectItem value="COMPENSATION_ONLY">Chỉ bồi thường</SelectItem>
              <SelectItem value="MANUAL_RESOLUTION">Xử lý thủ công</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Mức bồi thường"
          />
          <Input
            value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
            placeholder="Lý do override (nếu vượt mức policy)"
          />
          <Button
            disabled={
              !["VERIFIED", "CLOSED"].includes(incident.recoveryStatus) ||
              proposalState.isLoading
            }
            onClick={() =>
              handle(
                () =>
                  propose({
                    id: incident.id,
                    resolutionType,
                    redeliveryOffered: resolutionType.includes("REDELIVERY"),
                    compensationAmount: Number(amount) || 0,
                    refundShippingFee: false,
                    overrideReason: overrideReason || undefined,
                  }).unwrap(),
                "Đã gửi phương án cho khách",
              )
            }
          >
            Tạo phương án mới
          </Button>
          {["AWAITING_APPROVAL", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(
            incident.compensationStatus,
          ) && (
            <Button
              variant="outline"
              disabled={approvalState.isLoading}
              onClick={() =>
                handle(
                  () => approveCompensation(incident.id).unwrap(),
                  "Đã xử lý yêu cầu duyệt/chi bồi thường",
                )
              }
            >
              {incident.compensationStatus === "AWAITING_APPROVAL"
                ? "Duyệt bồi thường"
                : "Thử lại chi bồi thường"}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Nếu cổng chi bồi thường chưa được cấu hình, hệ thống giữ trạng thái
            chờ và ghi rõ Integration Unavailable trong lịch sử; không giả lập
            đã thanh toán.
          </p>
        </div>
      </div>
    </div>
  );
}

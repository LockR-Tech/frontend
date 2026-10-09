import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BatteryCharging,
  CheckCircle2,
  History,
  Loader2,
  MapPin,
  Plane,
  RefreshCw,
  Route,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDateTime } from "~/lib/datetime";
import { extractList } from "~/lib/extract-list";
import {
  useGetAllAdminReportsQuery,
  useGetDroneMaintenanceHistoryQuery,
  useGetLockerStatsQuery,
} from "~/stores/apis/admin/lockerOps";
import { useGetAllUsersQuery } from "~/stores/apis/admin/users";
import { useGetDroneOrdersQuery } from "~/stores/apis/admin/droneOrders";
import {
  useAssignDroneTechnicianMutation,
  useGetDroneQuery,
  useGetDronesQuery,
  useUpdateDroneMutation,
} from "~/stores/apis/admin/drones";

const NO_TECHNICIAN = "NONE";
const STATUS_LABELS: Record<string, string> = {
  IDLE: "Sẵn sàng",
  RESERVED: "Đã giữ cho nhiệm vụ",
  CHARGING: "Đang sạc",
  IN_FLIGHT: "Đang bay",
  MAINTENANCE: "Đang bảo trì",
  FAULT: "Đang sửa lỗi",
};
const MISSION_STATUS_LABELS: Record<string, string> = {
  AWAITING_LOADING: "Chờ nạp hàng",
  ASSIGNED: "Đã phân công",
  LOADING: "Đang nạp hàng",
  READY_TO_LAUNCH: "Sẵn sàng cất cánh",
  LAUNCHING: "Đang cất cánh",
  DEPARTED: "Đã rời trạm",
  EN_ROUTE: "Đang bay",
  APPROACHING: "Sắp hạ cánh",
  IN_FLIGHT: "Đang bay",
  ARRIVED: "Đã hạ cánh",
  DEPOSITED: "Đã gửi hàng",
  READY_FOR_PICKUP: "Chờ nhận hàng",
  COMPLETED: "Hoàn tất",
  CANCELED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
  FAILED: "Thất bại",
};
const STATUS_BADGE: Record<string, string> = {
  IDLE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  RESERVED: "bg-cyan-100 text-cyan-800 border-cyan-300",
  CHARGING: "bg-amber-100 text-amber-800 border-amber-300",
  IN_FLIGHT: "bg-blue-100 text-blue-800 border-blue-300",
  MAINTENANCE: "bg-purple-100 text-purple-800 border-purple-300",
  FAULT: "bg-rose-100 text-rose-800 border-rose-300",
};

function batteryColor(value: number) {
  if (value < 20) return "bg-rose-500";
  if (value < 50) return "bg-amber-500";
  return "bg-emerald-500";
}

function reportStatusLabel(status: string) {
  if (status === "RESOLVED") return "Đã xử lý";
  if (status === "IN_PROGRESS") return "Đang xử lý";
  return "Đang mở";
}

function flightStatusClass(status?: string | null) {
  const value = status?.toUpperCase() ?? "";
  if (["FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(value)) {
    return "border-rose-300 bg-rose-100 text-rose-800";
  }
  if (
    ["ARRIVED", "DEPOSITED", "READY_FOR_PICKUP", "COMPLETED"].includes(value)
  ) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }
  if (
    ["LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "IN_FLIGHT"].includes(
      value,
    )
  ) {
    return "border-blue-300 bg-blue-100 text-blue-800";
  }
  if (
    ["AWAITING_LOADING", "ASSIGNED", "LOADING", "READY_TO_LAUNCH"].includes(
      value,
    )
  ) {
    return "border-amber-300 bg-amber-100 text-amber-800";
  }
  return "border-slate-300 bg-slate-100 text-slate-700";
}

export default function DroneDetailPage() {
  const { droneId } = useParams<{ droneId: string }>();
  const navigate = useNavigate();
  const id = Number(droneId);
  const invalidId = !Number.isSafeInteger(id) || id <= 0;

  const droneQuery = useGetDroneQuery(id, {
    skip: invalidId,
    pollingInterval: 15000,
  });
  const dronesQuery = useGetDronesQuery(undefined, { pollingInterval: 15000 });
  const flightsQuery = useGetDroneOrdersQuery(undefined, {
    pollingInterval: 15000,
  });
  const historyQuery = useGetDroneMaintenanceHistoryQuery(id, {
    skip: invalidId,
    pollingInterval: 15000,
  });
  const reportsQuery = useGetAllAdminReportsQuery(undefined, {
    pollingInterval: 15000,
  });
  const lockersQuery = useGetLockerStatsQuery();
  const usersQuery = useGetAllUsersQuery({ page: 0, size: 1000 });
  const [assignDroneTechnician, assignmentState] =
    useAssignDroneTechnicianMutation();
  const [updateDrone, updateDroneState] = useUpdateDroneMutation();
  const [techChoice, setTechChoice] = useState<string | null>(null);
  const [lockerChoice, setLockerChoice] = useState<string | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<"flights" | "reports">(
    "flights",
  );

  const drone =
    droneQuery.data?.data ??
    dronesQuery.data?.data?.find((item) => item.id === id);
  const droneReports = useMemo(
    () =>
      (reportsQuery.data?.data ?? [])
        .filter((report) => report.droneUnitId === id)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [id, reportsQuery.data],
  );
  const openReports = useMemo(
    () => droneReports.filter((report) => report.status !== "RESOLVED"),
    [droneReports],
  );
  const flightLogs = useMemo(
    () =>
      (flightsQuery.data?.data ?? [])
        .filter(
          (order) =>
            order.droneUnitId === id ||
            (!!drone?.code && order.droneCode === drone.code),
        )
        .sort((a, b) =>
          (b.missionCreatedAt ?? b.createdAt ?? "").localeCompare(
            a.missionCreatedAt ?? a.createdAt ?? "",
          ),
        ),
    [drone?.code, flightsQuery.data, id],
  );
  const droneTechnicians = useMemo(
    () =>
      extractList<any>(usersQuery.data?.data)
        .filter((user) => {
          const roles: string[] = user.roles ?? [];
          return (
            roles.includes("DRONE_TECHNICIAN") ||
            roles.includes("ROLE_DRONE_TECHNICIAN")
          );
        })
        .map((user) => ({
          id: user.id as number,
          name: (user.fullName || user.name || `KTV #${user.id}`) as string,
          phone: (user.phoneNumber || "") as string,
          active: user.enabled !== false,
        })),
    [usersQuery.data],
  );

  const refresh = () =>
    void Promise.all([
      droneQuery.refetch(),
      dronesQuery.refetch(),
      flightsQuery.refetch(),
      historyQuery.refetch(),
      reportsQuery.refetch(),
    ]);

  if (
    invalidId ||
    (!droneQuery.isLoading && !dronesQuery.isLoading && !drone)
  ) {
    return (
      <div className="py-16 text-center">
        <Plane className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h1 className="mt-3 text-lg font-semibold">Không tìm thấy Drone</h1>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate("/admin/drones")}
        >
          Quay lại quản lý Drone
        </Button>
      </div>
    );
  }
  if (!drone)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const battery = drone.batteryPercent ?? 0;
  const assignedTechId = drone.assignedTechnicianId;
  const assignedTechName =
    drone.assignedTechnicianName ??
    droneTechnicians.find((technician) => technician.id === assignedTechId)
      ?.name ??
    (assignedTechId != null ? `KTV #${assignedTechId}` : null);
  const currentTechValue =
    assignedTechId == null ? NO_TECHNICIAN : String(assignedTechId);
  const selectedTechValue = techChoice ?? currentTechValue;
  const currentLockerValue =
    drone.lockerId == null ? "" : String(drone.lockerId);
  const selectedLockerValue = lockerChoice ?? currentLockerValue;
  const activeMission = ["RESERVED", "IN_FLIGHT"].includes(drone.status);
  const completedFlights = flightLogs.filter(
    (flight) =>
      flight.missionStatus === "COMPLETED" || flight.status === "COMPLETED",
  ).length;

  const saveTechnician = async () => {
    const technicianId =
      selectedTechValue === NO_TECHNICIAN ? null : Number(selectedTechValue);
    try {
      await assignDroneTechnician({ id, technicianId }).unwrap();
      setTechChoice(null);
      toast.success(
        technicianId == null
          ? "Đã bỏ phân công KTV Drone"
          : `Đã phân công ${droneTechnicians.find((item) => item.id === technicianId)?.name ?? `KTV #${technicianId}`}`,
      );
      await droneQuery.refetch();
    } catch (error: any) {
      toast.error("Không lưu được KTV phụ trách", {
        description:
          error?.data?.message || error?.message || "Vui lòng thử lại.",
      });
    }
  };

  const saveLocker = async () => {
    const lockerId = Number(selectedLockerValue);
    if (!Number.isSafeInteger(lockerId) || lockerId <= 0) return;
    try {
      await updateDrone({ id, lockerId }).unwrap();
      setLockerChoice(null);
      const locker = lockersQuery.data?.data?.find(
        (item) => item.lockerId === lockerId,
      );
      toast.success(
        `Đã chuyển Drone ${drone.code} đến ${locker?.name ?? locker?.code ?? `Kiosk #${lockerId}`}`,
      );
      await Promise.all([droneQuery.refetch(), dronesQuery.refetch()]);
    } catch (error: any) {
      toast.error("Không đổi được trạm/Kiosk", {
        description:
          error?.data?.message ||
          error?.message ||
          "Vui lòng kiểm tra trạng thái nhiệm vụ của Drone.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate("/admin/drones")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chi tiết {drone.code}</h1>
            <p className="text-xs text-muted-foreground">
              Mã thiết bị: #{drone.id}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Làm mới
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-blue-50 text-blue-600">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trạng thái hiện tại</p>
            <Badge
              variant="outline"
              className={STATUS_BADGE[drone.status] ?? "bg-muted"}
            >
              {STATUS_LABELS[drone.status] ?? drone.status}
            </Badge>
          </div>
        </div>
        <div className="min-w-52 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <BatteryCharging className="h-3.5 w-3.5" />
              Mức pin
            </span>
            <strong>{battery}%</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${batteryColor(battery)}`}
              style={{ width: `${Math.max(3, Math.min(100, battery))}%` }}
            />
          </div>
        </div>
      </div>

      <Card className="border border-border/80 shadow-xs">
        <CardContent className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-200/60 bg-indigo-50 text-indigo-600">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">KTV phụ trách</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {assignedTechId != null ? (
                  <>
                    Phiếu sự cố mới của Drone gửi riêng cho{" "}
                    <span className="font-semibold text-foreground">
                      {assignedTechName}
                    </span>
                    .
                  </>
                ) : (
                  "Chưa phân công — phiếu sự cố mới được báo cho mọi KTV Drone."
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedTechValue}
              onValueChange={setTechChoice}
              disabled={assignmentState.isLoading}
            >
              <SelectTrigger className="h-9 w-full text-xs md:w-72">
                <SelectValue placeholder="Chọn KTV Drone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TECHNICIAN}>
                  Chưa phân công (báo tất cả KTV Drone)
                </SelectItem>
                {assignedTechId != null &&
                  !droneTechnicians.some(
                    (technician) => technician.id === assignedTechId,
                  ) && (
                    <SelectItem value={currentTechValue}>
                      {assignedTechName}
                    </SelectItem>
                  )}
                {droneTechnicians.map((technician) => (
                  <SelectItem
                    key={technician.id}
                    value={String(technician.id)}
                    disabled={!technician.active}
                  >
                    {technician.name} (#{technician.id})
                    {technician.phone ? ` · ${technician.phone}` : ""}
                    {!technician.active ? " · Đã khóa" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9"
              onClick={saveTechnician}
              disabled={
                assignmentState.isLoading ||
                selectedTechValue === currentTechValue
              }
            >
              {assignmentState.isLoading ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-xs">
        <CardContent className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-200/60 bg-sky-50 text-sky-600">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Trạm/Kiosk của Drone</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hiện tại:{" "}
                <span className="font-semibold text-foreground">
                  {drone.lockerName ??
                    (drone.lockerId
                      ? `Kiosk #${drone.lockerId}`
                      : "Chưa gắn trạm")}
                </span>
                {activeMission
                  ? " · Không thể chuyển trạm khi Drone đang làm nhiệm vụ."
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedLockerValue}
              onValueChange={setLockerChoice}
              disabled={activeMission || updateDroneState.isLoading}
            >
              <SelectTrigger className="h-9 w-full text-xs md:w-72">
                <SelectValue placeholder="Chọn trạm/Kiosk" />
              </SelectTrigger>
              <SelectContent>
                {(lockersQuery.data?.data ?? []).map((locker) => (
                  <SelectItem
                    key={locker.lockerId}
                    value={String(locker.lockerId)}
                  >
                    {locker.name} ({locker.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-9"
              onClick={saveLocker}
              disabled={
                activeMission ||
                updateDroneState.isLoading ||
                !selectedLockerValue ||
                selectedLockerValue === currentLockerValue
              }
            >
              {updateDroneState.isLoading ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Tổng chuyến bay" value={flightLogs.length} />
        <KpiCard
          label="Chuyến hoàn tất"
          value={completedFlights}
          tone="text-emerald-700"
        />
        <KpiCard
          label="Phiếu đang mở"
          value={openReports.length}
          tone="text-rose-700"
        />
        <KpiCard
          label="Lần bảo trì"
          value={historyQuery.data?.data?.completedMaintenance.length ?? 0}
          tone="text-purple-700"
        />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,2.25fr)]">
        <Card className="h-full border border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4" />
              Thông tin Drone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Mã Drone" value={drone.code} mono />
            <Info
              label="Trạm/Kiosk"
              value={
                drone.lockerName ??
                (drone.lockerId ? `Kiosk #${drone.lockerId}` : "Chưa gắn trạm")
              }
            />
            <Info
              label="Lần sạc gần nhất"
              value={
                drone.lastChargedAt
                  ? formatDateTime(drone.lastChargedAt)
                  : "Chưa có dữ liệu"
              }
            />
            <Info label="Tạo lúc" value={formatDateTime(drone.createdAt)} />
            <Info
              label="Cập nhật lúc"
              value={formatDateTime(drone.updatedAt)}
            />
            {drone.faultReason && (
              <>
                <Separator />
                <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                  <strong>Nguyên nhân cần xử lý: </strong>
                  {drone.faultReason}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4.5 w-4.5 text-primary" />
                  Nhật ký vận hành {drone.code}
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Dữ liệu chuyến bay và phiếu sửa chữa của Drone được ghi nhận
                  từ hệ thống vận hành.
                </CardDescription>
              </div>
              <div className="inline-flex rounded-lg border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  className={`rounded-md px-3 py-1 font-medium transition-all ${activeLogTab === "flights" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setActiveLogTab("flights")}
                >
                  Nhật ký chuyến bay ({flightLogs.length})
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1 font-medium transition-all ${activeLogTab === "reports" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setActiveLogTab("reports")}
                >
                  Sự cố & Sửa chữa ({droneReports.length})
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {activeLogTab === "flights" ? (
              flightsQuery.isLoading ? (
                <LoadingRows />
              ) : flightLogs.length === 0 ? (
                <EmptyState
                  icon={<Route className="h-8 w-8" />}
                  text="Drone chưa có chuyến bay nào được ghi nhận."
                />
              ) : (
                <FlightTable flights={flightLogs} />
              )
            ) : reportsQuery.isLoading ? (
              <LoadingRows />
            ) : droneReports.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                text="Drone chưa từng ghi nhận phiếu sự cố nào."
              />
            ) : (
              <ReportTable reports={droneReports} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FlightTable({
  flights,
}: {
  flights: ReturnType<typeof useGetDroneOrdersQuery>["data"] extends {
    data: infer T;
  }
    ? T
    : never;
}) {
  const rows = flights as NonNullable<
    ReturnType<typeof useGetDroneOrdersQuery>["data"]
  >["data"];
  return (
    <div className="overflow-hidden rounded-lg border border-border/80">
      <Table className="text-xs">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[110px] font-semibold">Mã chuyến</TableHead>
            <TableHead className="w-[130px] font-semibold">Mã đơn</TableHead>
            <TableHead className="font-semibold">Tuyến bay</TableHead>
            <TableHead className="w-[150px] font-semibold">
              Trạng thái
            </TableHead>
            <TableHead className="w-[170px] font-semibold">Điều phối</TableHead>
            <TableHead className="w-[160px] font-semibold">Thời gian</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((flight) => (
            <TableRow key={flight.orderId} className="hover:bg-muted/30">
              <TableCell className="font-bold text-primary">
                {flight.missionId != null ? `MSN-${flight.missionId}` : "—"}
              </TableCell>
              <TableCell className="font-mono font-semibold">
                {flight.orderCode}
              </TableCell>
              <TableCell>
                {flight.sourceLocker?.code ??
                  `Kiosk #${flight.sourceLockerId ?? "—"}`}{" "}
                →{" "}
                {flight.destinationLocker?.code ??
                  `Kiosk #${flight.destinationLockerId ?? "—"}`}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${flightStatusClass(flight.missionStatus ?? flight.deliveryStage ?? flight.status)}`}
                >
                  {MISSION_STATUS_LABELS[
                    flight.missionStatus ??
                      flight.deliveryStage ??
                      flight.status
                  ] ??
                    flight.missionStatus ??
                    flight.deliveryStage ??
                    flight.status}
                </Badge>
              </TableCell>
              <TableCell>
                {flight.assignedByName ??
                  (flight.assignedByUserId
                    ? `#${flight.assignedByUserId}`
                    : "Hệ thống")}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                {flight.missionCreatedAt || flight.createdAt
                  ? formatDateTime(flight.missionCreatedAt ?? flight.createdAt!)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReportTable({
  reports,
}: {
  reports: ReturnType<typeof useGetAllAdminReportsQuery>["data"] extends {
    data: infer T;
  }
    ? T
    : never;
}) {
  const rows = reports as NonNullable<
    ReturnType<typeof useGetAllAdminReportsQuery>["data"]
  >["data"];
  return (
    <div className="overflow-hidden rounded-lg border border-border/80">
      <Table className="text-xs">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[110px] font-semibold">Mã phiếu</TableHead>
            <TableHead className="w-[120px] font-semibold">Phân loại</TableHead>
            <TableHead className="w-[130px] font-semibold">
              Trạng thái
            </TableHead>
            <TableHead className="w-[180px] font-semibold">KTV xử lý</TableHead>
            <TableHead className="font-semibold">Mô tả sự cố</TableHead>
            <TableHead className="w-[160px] font-semibold">Thời gian</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((report) => (
            <TableRow key={report.id} className="hover:bg-muted/30">
              <TableCell className="font-bold text-primary">
                RPT-{report.id}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">
                  DRONE
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  className={`text-[10px] ${report.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800" : report.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}
                >
                  {reportStatusLabel(report.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {report.assignedToUserName ?? "Chưa phân công"}
              </TableCell>
              <TableCell
                className="max-w-[380px] truncate"
                title={report.description}
              >
                {report.description || report.title}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                {formatDateTime(report.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
function LoadingRows() {
  return (
    <div className="py-12 text-center text-xs text-muted-foreground">
      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
      Đang tải dữ liệu...
    </div>
  );
}
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
      <div className="mx-auto mb-2 flex justify-center opacity-60">{icon}</div>
      {text}
    </div>
  );
}

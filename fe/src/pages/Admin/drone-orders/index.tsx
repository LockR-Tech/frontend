import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Plane, RefreshCw, Route } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { PageHeader } from "~/components/shared/page-header";
import {
  LabelValue,
  MetaBadge,
  deliveryStageMeta,
  orderPaymentStatusMeta,
  orderStatusMeta,
  paymentMethodMeta,
  type BadgeMeta,
} from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import {
  useGetDroneOrderQuery,
  useGetDroneOrdersQuery,
  type DroneJourneyEvent,
  type DroneLockerPoint,
  type DroneOrderTracking,
} from "~/stores/apis/admin/droneOrders";
import { DroneJourneyTimeline } from "./DroneJourneyTimeline";
import { DroneTrackingMap } from "./DroneTrackingMap";
import { isPickupCodeEvent, pickupCodeEvent, sentAt, stageTimes } from "./journey";

/** Danh sách hỏi lại server sau mỗi khoảng này để chặng mới tự hiện, không cần tải lại trang. */
const LIST_POLL_MS = 5000;
const DETAIL_POLL_MS = 3000;

const FINISHED_STATUSES = new Set(["COMPLETED", "CANCELED", "EXPIRED"]);

type Scope = "active" | "finished" | "all";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "active", label: "Đang thực hiện" },
  { value: "finished", label: "Đã kết thúc" },
  { value: "all", label: "Tất cả" },
];

const MISSION_STATUS_LABELS: Record<string, string> = {
  AWAITING_LOADING: "Chờ nạp hàng",
  READY_TO_LAUNCH: "Sẵn sàng phóng",
  LAUNCHING: "Đang khởi phóng",
  DEPARTED: "Đã rời trạm",
  EN_ROUTE: "Đang bay",
  APPROACHING: "Sắp tới tủ nhận",
  ARRIVED: "Đã tới tủ nhận",
  DEPOSITED: "Đã gửi hàng vào ô",
};

// Khớp DroneOrderMaintenanceService.cancelReasonLabel ở backend.
const CANCEL_REASON_LABELS: Record<number, string> = {
  1: "Thời tiết xấu",
  2: "Drone lỗi",
  3: "Bãi đáp không sẵn sàng",
  4: "Lý do vận hành",
  5: "Lý do khác",
};

function isFinished(order: DroneOrderTracking): boolean {
  return FINISHED_STATUSES.has(order.status);
}

/**
 * Đơn đã kết thúc thì trạng thái đơn quyết định nhãn: backend giữ
 * `deliveryStage = READY_FOR_PICKUP` sau khi khách lấy hàng.
 */
function stageMeta(order: DroneOrderTracking): BadgeMeta {
  return isFinished(order)
    ? orderStatusMeta(order.status)
    : deliveryStageMeta(order.deliveryStage);
}

function lockerName(point: DroneLockerPoint | null, fallbackId: number | null): string {
  if (point?.name && point.code) return `${point.name} (${point.code})`;
  if (point?.name || point?.code) return (point.name ?? point.code) as string;
  return fallbackId ? "Chưa tra được tên tủ" : "Chưa xác định";
}

function grams(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  return `${value.toLocaleString("vi-VN")} g`;
}

function checklist(value: boolean | null): string {
  if (value === null || value === undefined) return "Chưa kiểm";
  return value ? "Đạt" : "Không đạt";
}

function journeyTitle(event: DroneJourneyEvent): string {
  // Xác nhận nạp hàng được ghi là ACCEPTED → ACCEPTED.
  if (event.fromStage === "ACCEPTED" && event.toStage === "ACCEPTED") {
    return "Đã nạp hàng lên drone";
  }
  if (isPickupCodeEvent(event)) return "Gửi mã nhận hàng cho người nhận";
  if (!event.fromStage && event.toStage === "AWAITING_DISPATCH") {
    return "Đơn drone được tạo";
  }
  if (FINISHED_STATUSES.has(event.toStage)) return orderStatusMeta(event.toStage).label;
  return deliveryStageMeta(event.toStage).label;
}

export default function DroneOrdersPage() {
  const { data, isLoading, isFetching, isError, refetch } = useGetDroneOrdersQuery(
    undefined,
    { pollingInterval: LIST_POLL_MS },
  );

  const { subscribe } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (!subscribe) return;
    const subOrders = subscribe<any>("/topic/orders", () => refetch());
    const subNotif = subscribe<any>("/topic/notifications", (msg) => {
      if (
        msg?.type?.includes?.("DRONE") ||
        msg?.type?.includes?.("DELIVERY") ||
        msg?.type?.includes?.("ORDER")
      ) {
        refetch();
      }
    });
    return () => {
      subOrders?.unsubscribe();
      subNotif?.unsubscribe();
    };
  }, [subscribe, refetch]);

  const [scope, setScope] = useState<Scope>("active");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const orders = useMemo(() => data?.data ?? [], [data]);
  const counts = useMemo(
    () => ({
      active: orders.filter((o) => !isFinished(o)).length,
      inFlight: orders.filter(
        (o) =>
          !isFinished(o) &&
          ["LAUNCHING", "DEPARTED", "EN_ROUTE", "APPROACHING", "ARRIVED"].includes(
            o.deliveryStage ?? "",
          ),
      ).length,
      waiting: orders.filter(
        (o) => !isFinished(o) && o.deliveryStage === "AWAITING_DISPATCH",
      ).length,
      finished: orders.filter(isFinished).length,
    }),
    [orders],
  );

  // Backend đã sắp theo lần cập nhật gần nhất: đơn vừa đổi chặng nằm trên cùng.
  const visible = orders.filter((o) =>
    scope === "all" ? true : scope === "active" ? !isFinished(o) : isFinished(o),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hành trình drone"
        description="Theo dõi từng chuyến giao hàng bằng drone từ tủ gửi tới tủ nhận. Tự cập nhật mỗi 5 giây."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Đang thực hiện" value={counts.active} color="text-primary" />
          <StatCard label="Chờ điều phối" value={counts.waiting} color="text-amber-700" />
          <StatCard label="Đang bay" value={counts.inFlight} color="text-sky-700" />
          <StatCard label="Đã kết thúc" value={counts.finished} color="text-muted-foreground" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCOPES.map((s) => {
          const active = scope === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "border-border/50 bg-background text-muted-foreground hover:border-border/70"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : isError && orders.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Không tải được danh sách hành trình drone.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Thử lại
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <Plane className="mx-auto mb-3 h-8 w-8 opacity-40" />
            {orders.length === 0
              ? "Chưa có đơn giao drone nào"
              : "Không có đơn nào trong nhóm này"}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Mã đơn</th>
                  <th className="px-4 py-3 font-medium">Lộ trình</th>
                  <th className="px-4 py-3 font-medium">Chặng</th>
                  <th className="px-4 py-3 font-medium">Drone</th>
                  <th className="px-4 py-3 font-medium">Điều phối viên</th>
                  <th className="px-4 py-3 font-medium">Thanh toán</th>
                  <th className="px-4 py-3 font-medium">Tạo đơn</th>
                  <th className="px-4 py-3 font-medium">Cập nhật cuối</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr
                    key={order.orderId}
                    onClick={() => setSelectedId(order.orderId)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {order.orderCode}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {lockerName(order.sourceLocker, order.sourceLockerId)}
                      </span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="font-medium">
                        {lockerName(order.destinationLocker, order.destinationLockerId)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MetaBadge meta={stageMeta(order)} />
                    </td>
                    <td className="px-4 py-3">{order.droneCode ?? "Chưa phân công"}</td>
                    <td className="px-4 py-3">
                      {order.assignedByName ??
                        (order.assignedByUserId ? "Đã tiếp nhận" : "Chưa tiếp nhận")}
                    </td>
                    <td className="px-4 py-3">
                      <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} hideIcon />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatDateTime(order.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <DroneOrderDialog orderId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DroneOrderDialog({
  orderId,
  onClose,
}: {
  orderId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useGetDroneOrderQuery(orderId ?? 0, {
    skip: orderId === null,
    pollingInterval: DETAIL_POLL_MS,
  });
  const order = orderId === null ? undefined : data?.data;

  return (
    <Dialog open={orderId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Route className="h-4 w-4" />
            Hành trình đơn {order?.orderCode ?? ""}
            {order && <MetaBadge meta={stageMeta(order)} />}
          </DialogTitle>
        </DialogHeader>

        {!order ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {isLoading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            ) : isError ? (
              "Không tải được chi tiết hành trình."
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              Tự cập nhật mỗi 3 giây · cập nhật cuối {formatDateTime(order.updatedAt)}
            </p>

            {order.status === "CANCELED" && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700">
                Đơn đã huỷ
                {order.cancelReason
                  ? ` · ${CANCEL_REASON_LABELS[order.cancelReason] ?? `Lý do #${order.cancelReason}`}`
                  : ""}
                {order.cancelNote ? ` · ${order.cancelNote}` : ""}
                {order.paymentStatus === "REFUNDED"
                  ? " · Đã hoàn tiền về ví người đặt"
                  : order.paymentStatus === "PAID"
                    ? " · CHƯA hoàn tiền — cần hoàn tay ở trang Thanh toán"
                    : ""}
              </div>
            )}

            <Section title="Bản đồ theo dõi">
              <DroneTrackingMap order={order} />
            </Section>

            <Section title="Lộ trình · gửi và nhận">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LockerBlock
                  label="Tủ gửi · Locker A"
                  point={order.sourceLocker}
                  fallbackId={order.sourceLockerId}
                  extras={[
                    order.sourceBoxNumber !== null && order.sourceBoxNumber !== undefined
                      ? `Kiện đang ở ô drone số ${order.sourceBoxNumber}`
                      : null,
                  ]}
                  times={[{ label: "Gửi đi lúc", at: sentAt(order), empty: "Chưa gửi" }]}
                />
                <LockerBlock
                  label="Tủ nhận · Locker B"
                  point={order.destinationLocker}
                  fallbackId={order.destinationLockerId}
                  extras={[
                    order.reservedBoxNumber !== null ? `Ô nhận số ${order.reservedBoxNumber}` : null,
                  ]}
                  times={[
                    {
                      label: "Hàng vào tủ lúc",
                      at: stageTimes(order).get("READY_FOR_PICKUP") ?? null,
                      empty: "Chưa tới",
                    },
                    {
                      label: "Gửi mã cho người nhận lúc",
                      at: pickupCodeEvent(order)?.occurredAt ?? null,
                      empty: "Chưa gửi",
                    },
                    { label: "Người nhận lấy hàng lúc", at: order.completedAt, empty: "Chưa nhận" },
                  ]}
                />
              </div>
            </Section>

            <Section title="Tiến trình giao hàng">
              <DroneJourneyTimeline order={order} />
            </Section>

            <Section title="Đơn hàng">
              <Grid>
                <LabelValue label="Mã đơn" mono>{order.orderCode}</LabelValue>
                <LabelValue label="Trạng thái đơn">
                  <MetaBadge meta={orderStatusMeta(order.status)} />
                </LabelValue>
                <LabelValue label="Thanh toán">
                  <MetaBadge meta={orderPaymentStatusMeta(order.paymentStatus)} />
                </LabelValue>
                <LabelValue label="Phí giao drone">
                  {order.totalPrice !== null ? formatCurrency(order.totalPrice) : null}
                </LabelValue>
                <LabelValue label="Phương thức thanh toán">
                  {order.paymentMethod ? (
                    <MetaBadge meta={paymentMethodMeta(order.paymentMethod)} />
                  ) : null}
                </LabelValue>
                <LabelValue label="Mã thanh toán" mono>{order.paymentReference}</LabelValue>
                <LabelValue label="Mã giao dịch" mono>{order.paymentTransactionId}</LabelValue>
                <Time label="Thanh toán lúc" value={order.paidAt} />
                <LabelValue label="Khối lượng khai báo">{grams(order.parcelWeightGrams)}</LabelValue>
                <LabelValue label="Hình thức bay">
                  {order.fulfillmentMode === "DEMO"
                    ? "Mô phỏng (DEMO)"
                    : order.fulfillmentMode === "STANDARD"
                      ? "Drone thật"
                      : order.fulfillmentMode}
                </LabelValue>
                <LabelValue label="Mô tả kiện hàng" className="col-span-2 sm:col-span-3">
                  {order.description}
                </LabelValue>
              </Grid>
            </Section>

            <Section title="Người liên quan">
              <Grid>
                <LabelValue label="Người gửi">{order.customerName}</LabelValue>
                <LabelValue label="SĐT người gửi" mono>{order.customerPhone}</LabelValue>
                <LabelValue label="Người nhận">{order.receiverName}</LabelValue>
                <LabelValue label="SĐT người nhận" mono>{order.receiverPhone}</LabelValue>
                <LabelValue label="Điều phối viên">
                  {order.assignedByName ??
                    (order.assignedByUserId ? "Đã tiếp nhận" : "Chưa tiếp nhận")}
                </LabelValue>
                <LabelValue label="Người nạp hàng">
                  {order.loadedByName ?? (order.loadedByUserId ? "Đã nạp" : "Chưa nạp hàng")}
                </LabelValue>
              </Grid>
            </Section>

            <Section title="Nhiệm vụ bay & hồ sơ nạp hàng">
              <Grid>
                <LabelValue label="Mã nhiệm vụ" mono>
                  {order.missionId !== null ? `#${order.missionId}` : "Chưa khởi tạo"}
                </LabelValue>
                <LabelValue label="Drone">{order.droneCode ?? "Chưa phân công"}</LabelValue>
                <LabelValue label="Trạng thái nhiệm vụ">
                  {order.missionStatus
                    ? (MISSION_STATUS_LABELS[order.missionStatus] ?? order.missionStatus)
                    : "Chưa khởi tạo"}
                </LabelValue>
                <LabelValue label="Khối lượng thực tế">{grams(order.payloadWeightGrams)}</LabelValue>
                {order.weightSurcharge ? (
                  <LabelValue label="Thu thêm do cân lệch">
                    {formatCurrency(order.weightSurcharge)}
                    {order.amountDue ? " · khách chưa trả" : " · đã trả"}
                  </LabelValue>
                ) : null}
                <LabelValue label="Mã niêm phong" mono>{order.sealCode}</LabelValue>
                <LabelValue label="Đúng kiện, đúng đơn">{checklist(order.parcelMatched)}</LabelValue>
                <LabelValue label="Kiện đã cố định">{checklist(order.payloadSecured)}</LabelValue>
                <LabelValue label="Khoang hàng đã khoá">
                  {checklist(order.compartmentLocked)}
                </LabelValue>
                <LabelValue label="Ghi chú nạp hàng">{order.loadingNote}</LabelValue>
              </Grid>
            </Section>

            <Section title="Nhật ký hành trình · mới nhất trước">
              {order.journeyEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có mốc hành trình nào.</p>
              ) : (
                <ol className="space-y-3">
                  {order.journeyEvents.map((event, index) => (
                    <li
                      key={event.id}
                      className="flex gap-3 border-l-2 border-border pl-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {journeyTitle(event)}
                          {index === 0 && (
                            <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              Mới nhất
                            </span>
                          )}
                        </p>
                        {event.note && (
                          <p className="text-xs text-muted-foreground">{event.note}</p>
                        )}
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {formatDateTime(event.occurredAt)} ·{" "}
                          {event.actorName ??
                            (event.actorUserId ? "Nhân viên Lock.R" : "Hệ thống")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}

function Time({ label, value }: { label: string; value: string | null }) {
  return (
    <LabelValue label={label} mono>
      {value ? formatDateTime(value) : null}
    </LabelValue>
  );
}

function LockerBlock({
  label,
  point,
  fallbackId,
  extras = [],
  times = [],
}: {
  label: string;
  point: DroneLockerPoint | null;
  fallbackId: number | null;
  extras?: (string | null)[];
  times?: { label: string; at: string | Date | null; empty: string }[];
}) {
  // Có toạ độ thì mở chỉ đường theo toạ độ; không thì tìm theo địa chỉ.
  const mapUrl =
    point?.latitude != null && point?.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
      : point?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point.address)}`
        : null;

  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{lockerName(point, fallbackId)}</p>
      {point?.address && <p className="text-xs text-muted-foreground">{point.address}</p>}
      {extras
        .filter((extra): extra is string => Boolean(extra))
        .map((extra) => (
          <p key={extra} className="mt-1 text-xs font-medium text-sky-700">
            {extra}
          </p>
        ))}
      {times.map((time) => (
        <p key={time.label} className="mt-1 text-xs">
          <span className="text-muted-foreground">{time.label}: </span>
          <span className="font-mono font-semibold">
            {time.at ? formatDateTime(time.at) : time.empty}
          </span>
        </p>
      ))}
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <MapPin className="h-3.5 w-3.5" />
          Xem trên bản đồ
        </a>
      )}
    </div>
  );
}

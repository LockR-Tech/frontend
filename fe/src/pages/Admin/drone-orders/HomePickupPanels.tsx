import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, TriangleAlert, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { LabelValue } from "~/components/shared/reporting";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import { MetaBadge, refundStatusMeta } from "~/components/shared/reporting";
import { useGetMaintenanceReportsQuery } from "~/stores/apis/admin/lockerOps";
import { useGetAdminRefundsQuery } from "~/stores/apis/admin/payments";
import { RepairLogDialog } from "../maintenance/RepairLogDialog";
import { canAssignPickup } from "./homePickupRules";
import {
  useAssignDronePickupMutation,
  useFailDroneOrderMutation,
  useGetDroneOrdersByTicketQuery,
  useGetDronePickupCandidatesQuery,
  type DroneOrderTracking,
} from "~/stores/apis/admin/droneOrders";

// Lấy hàng tận nhà và mối nối đơn drone ↔ phiếu sự cố — phần của admin trong luồng:
// xem ai đang đi lấy hàng, gán tay KTV drone, thấy đơn đang bị sự cố nào chặn, và xác nhận
// đơn "giao không hoàn tất" (đóng đơn + hoàn tiền).

const FAILURE_REASONS = [
  "WEATHER",
  "DRONE_FAULT",
  "NO_DRONE_AVAILABLE",
  "SOURCE_LOCKER_FAULT",
  "DESTINATION_LOCKER_FAULT",
  "LANDING_PAD_FAULT",
  "FLIGHT_INCIDENT",
  "OPERATIONAL",
  "OTHER",
] as const;

function distance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined) return null;
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

function apiMessage(error: unknown): string | undefined {
  return (error as { data?: { message?: string } })?.data?.message;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Nhãn theo ngôn ngữ giao diện; mã mới dùng nhãn server làm dự phòng. */
function useFailureReasonLabel() {
  const { t } = useTranslation();
  return (reason: string | null | undefined, serverLabel?: string | null) =>
    reason ? t(`admin.droneOrders.failureReason.${reason}`, { defaultValue: serverLabel ?? reason }) : serverLabel ?? null;
}

/** Đơn đã thanh toán nhưng đang bị sự cố chặn: lý do, phiếu sự cố, hạn tự đóng. */
export function IncidentBlockBanner({ order }: { order: DroneOrderTracking }) {
  const { t } = useTranslation();
  const label = useFailureReasonLabel();
  const block = order.block;
  if (!block) return null;
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
      <span className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {t("admin.droneOrders.incident.blocked", { reason: label(block.reason, block.reasonLabel) })}
          {block.note ? ` · ${block.note}` : ""}
          {block.at ? ` · ${t("admin.droneOrders.incident.since", { time: formatDateTime(block.at) })}` : ""}
          {block.autoCloseAt
            ? ` · ${t("admin.droneOrders.incident.autoClose", { time: formatDateTime(block.autoCloseAt) })}`
            : ` · ${t("admin.droneOrders.incident.noAutoClose")}`}
        </span>
      </span>
      {block.ticketId ? (
        <TicketDetails ticketId={block.ticketId} />
      ) : null}
    </div>
  );
}

/** Lấy hàng tận nhà: điểm lấy, trạng thái, KTV; admin gán tay khi chưa ai cầm kiện. */
export function PickupPanel({ order }: { order: DroneOrderTracking }) {
  const { t } = useTranslation();
  const pickup = order.pickup;
  if (!pickup) return null;
  const status = pickup.status ?? (order.paymentStatus === "PAID" ? "SEARCHING" : "AWAITING_PAYMENT");
  const assignable = canAssignPickup(order, pickup);
  const mapsLink =
    pickup.latitude != null && pickup.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${pickup.latitude},${pickup.longitude}`
      : null;

  return (
    <Panel title={t("admin.droneOrders.section.pickup")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <LabelValue label={t("admin.droneOrders.pickup.status")}>
          {t(`admin.droneOrders.pickup.statusLabel.${status}`, { defaultValue: status })}
        </LabelValue>
        <LabelValue label={t("admin.droneOrders.pickup.address")} className="col-span-2">
          {pickup.address}
          {mapsLink ? (
            <>
              {" · "}
              <a href={mapsLink} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {t("admin.droneOrders.pickup.openMap")}
              </a>
            </>
          ) : null}
        </LabelValue>
        <LabelValue label={t("admin.droneOrders.pickup.note")}>{pickup.note}</LabelValue>
        <LabelValue label={t("admin.droneOrders.pickup.technicianNote")}>{pickup.technicianNote}</LabelValue>
        <LabelValue label={t("admin.droneOrders.pickup.toSourceLocker")}>
          {distance(pickup.distanceToSourceLockerMeters)}
        </LabelValue>
        <LabelValue label={t("admin.droneOrders.pickup.technician")}>
          {pickup.technicianName ?? (pickup.technicianId ? `#${pickup.technicianId}` : null)}
          {pickup.technicianPhone ? ` · ${pickup.technicianPhone}` : ""}
          {pickup.technicianDistanceMeters !== null && pickup.technicianDistanceMeters !== undefined
            ? ` · ${t("admin.droneOrders.pickup.technicianDistance", {
                distance: distance(pickup.technicianDistanceMeters),
              })}`
            : ""}
        </LabelValue>
        <LabelValue label={t("admin.droneOrders.pickup.acceptedAt")}>
          {pickup.acceptedAt ? formatDateTime(pickup.acceptedAt) : null}
        </LabelValue>
        <LabelValue label={t("admin.droneOrders.pickup.pickedUpAt")}>
          {pickup.pickedUpAt ? formatDateTime(pickup.pickedUpAt) : null}
        </LabelValue>
        {pickup.status === "OFFERED" && pickup.offerExpiresAt ? (
          <LabelValue label={t("admin.droneOrders.pickup.offerExpiresAt")}>
            {formatDateTime(pickup.offerExpiresAt)}
          </LabelValue>
        ) : null}
        {pickup.failureReason ? (
          <LabelValue label={t("admin.droneOrders.pickup.failure")} className="col-span-2">
            {t(`admin.droneOrders.failureReason.${pickup.failureReason}`, {
              defaultValue: pickup.failureReason,
            })}
            {pickup.failureNote ? ` · ${pickup.failureNote}` : ""}
          </LabelValue>
        ) : null}
      </div>
      {assignable ? <AssignTechnician orderId={order.orderId} current={pickup.technicianId ?? null} /> : null}
    </Panel>
  );
}

function AssignTechnician({ orderId, current }: { orderId: number; current: number | null }) {
  const { t } = useTranslation();
  const { data, isFetching, isError, refetch } = useGetDronePickupCandidatesQuery(orderId, { pollingInterval: 15000 });
  const [assign, { isLoading }] = useAssignDronePickupMutation();
  const [selected, setSelected] = useState<number | "">("");
  const candidates = data?.data ?? [];
  // Chỉ gán được người đang trong ca và không bận việc khác.
  const available = candidates.filter((c) => c.onDuty && (!c.busy || c.technicianId === current));

  const submit = async () => {
    if (selected === "" || isFetching || !available.some(c => c.technicianId === selected)) return;
    try {
      await assign({ orderId, technicianId: selected }).unwrap();
      toast.success(t("admin.droneOrders.pickup.assigned"));
      setSelected("");
    } catch (error) {
      toast.error(t("admin.droneOrders.pickup.assignFailed"), { description: apiMessage(error) });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <span className="text-sm text-muted-foreground">
        {t("admin.droneOrders.pickup.assignHint", { onDuty: candidates.filter((c) => c.onDuty).length })}
      </span>
      <select
        disabled={isLoading || isFetching || isError}
        aria-label={t("admin.droneOrders.pickup.assignLabel")}
        className="h-9 min-w-56 flex-1 rounded-md border bg-background px-2 text-sm"
        value={selected}
        onChange={(event) => setSelected(event.target.value === "" ? "" : Number(event.target.value))}
      >
        <option value="">
          {isFetching && candidates.length === 0
            ? t("admin.droneOrders.pickup.loadingCandidates")
            : available.length === 0
              ? t("admin.droneOrders.pickup.noCandidates")
              : t("admin.droneOrders.pickup.chooseTechnician")}
        </option>
        {available.map((c) => (
          <option key={c.technicianId} value={c.technicianId}>
            {c.name ?? `#${c.technicianId}`}
            {c.distanceMeters !== null ? ` · ${distance(c.distanceMeters)}` : ""}
            {c.locationFresh ? "" : ` · ${t("admin.droneOrders.pickup.staleLocation")}`}
          </option>
        ))}
      </select>
      {isError && <Button variant="outline" size="sm" onClick={refetch}>{t("common.retry")}</Button>}
      <Button size="sm" disabled={isLoading || isFetching || isError || !available.some(c => c.technicianId === selected)} onClick={submit}>
        {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1 h-4 w-4" />}
        {t("admin.droneOrders.pickup.assign")}
      </Button>
    </div>
  );
}

/**
 * Admin xác nhận một đơn chưa vào ô nhận là "giao không hoàn tất": đóng đơn, nhả drone/ô nhận,
 * báo người gửi qua app + email và tạo yêu cầu hoàn tiền. Lý do mặc định là lý do đơn đang bị chặn.
 */
export function CloseAsFailedForm({ order }: { order: DroneOrderTracking }) {
  const { t } = useTranslation();
  const label = useFailureReasonLabel();
  const [failOrder, { isLoading }] = useFailDroneOrderMutation();
  const [reason, setReason] = useState<string>(order.block?.reason ?? "DRONE_FAULT");
  const [note, setNote] = useState("");
  const noteRequired = reason === "OTHER";
  // Lý do hệ thống tự phát hiện (vd. LAUNCH_OVERDUE) không nằm trong danh sách chọn tay.
  const reasons = FAILURE_REASONS.includes(reason as (typeof FAILURE_REASONS)[number])
    ? FAILURE_REASONS
    : [reason, ...FAILURE_REASONS];

  const submit = async () => {
    const trimmed = note.trim();
    if (noteRequired && !trimmed) {
      toast.error(t("admin.droneOrders.closeAsFailed.noteRequired"));
      return;
    }
    if (!confirm(t("admin.droneOrders.closeAsFailed.confirm", { code: order.orderCode }))) return;
    try {
      await failOrder({ orderId: order.orderId, reason, note: trimmed || undefined }).unwrap();
      toast.success(t("admin.droneOrders.closeAsFailed.success", { code: order.orderCode }));
    } catch (error) {
      toast.error(t("admin.droneOrders.closeAsFailed.failed"), { description: apiMessage(error) });
    }
  };

  return (
    <Panel title={t("admin.droneOrders.section.closeAsFailed")}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
        <select
          aria-label={t("admin.droneOrders.closeAsFailed.reasonLabel")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {reasons.map((code) => (
            <option key={code} value={code}>
              {label(code)}
            </option>
          ))}
        </select>
        <input
          aria-label={t("admin.droneOrders.closeAsFailed.noteLabel")}
          className="h-9 min-w-48 flex-1 rounded-md border bg-background px-2 text-sm"
          maxLength={500}
          placeholder={
            noteRequired
              ? t("admin.droneOrders.closeAsFailed.notePlaceholderRequired")
              : t("admin.droneOrders.notePlaceholderOptional")
          }
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button variant="destructive" size="sm" disabled={isLoading} onClick={submit}>
          {isLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <TriangleAlert className="mr-1 h-4 w-4" />
          )}
          {t("admin.droneOrders.closeAsFailed.submit")}
        </Button>
      </div>
    </Panel>
  );
}

/** Phiếu sự cố này đang chặn / đã làm hỏng những đơn drone nào — nhúng vào hồ sơ phiếu. */
export function DroneOrdersByTicket({ ticketId }: { ticketId: number }) {
  const { t } = useTranslation();
  const label = useFailureReasonLabel();
  const { data, isLoading, isError, refetch } = useGetDroneOrdersByTicketQuery(ticketId, { pollingInterval: 15000 });
  const orders = data?.data ?? [];
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (isError) return <Button variant="outline" onClick={refetch}>{t("admin.droneOrders.incident.loadFailed")}</Button>;
  if (orders.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
      <p className="font-semibold">{t("admin.droneOrders.incident.affectedOrders", { count: orders.length })}</p>
      <ul className="mt-1 space-y-1">
        {orders.map((order) => (
          <li key={order.orderId}>
            <Link to={`/admin/drone-orders?orderId=${order.orderId}`} className="font-mono underline underline-offset-2">
              {order.orderCode}
            </Link>
            {" — "}
            {order.failure
              ? t("admin.droneOrders.incident.failedBecause", {
                  reason: label(order.failure.reason, order.failure.reasonLabel),
                })
              : order.block
                ? t("admin.droneOrders.incident.blocked", {
                    reason: label(order.block.reason, order.block.reasonLabel),
                  })
                : order.deliveryStage}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TicketDetails({ ticketId }: { ticketId: number }) {
  const { t } = useTranslation();
  const { data } = useGetMaintenanceReportsQuery(undefined, { pollingInterval: 15000 });
  const report = data?.data?.find(r => r.id === ticketId);
  return <div className="flex items-center gap-2">
    <span>{t("admin.droneOrders.incident.ticket", { id: ticketId })}{report ? ` · ${t(`admin.maintenance.status.${report.status === "RESOLVED" ? "resolved" : report.status === "IN_PROGRESS" ? "inProgress" : "openAwaitingTech"}`)}` : ""}</span>
    <RepairLogDialog reportId={ticketId} title={report?.title ?? `RPT-${ticketId}`} report={report} />
  </div>;
}

export function FailurePanel({ order }: { order: DroneOrderTracking }) {
  const { t } = useTranslation();
  const label = useFailureReasonLabel();
  const { data, isLoading, isError, refetch } = useGetAdminRefundsQuery({ orderId: order.orderId, size: 100 }, { skip: !order.failure, pollingInterval: 15000 });
  if (!order.failure) return null;
  const failure = order.failure;
  return <Panel title={t("admin.droneOrders.incident.failureTitle")}>
    <p className="text-sm">{label(failure.reason, failure.reasonLabel)}{failure.note ? ` · ${failure.note}` : ""}</p>
    {failure.ticketId != null && <TicketDetails ticketId={failure.ticketId} />}
    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
    {isError && <Button variant="outline" onClick={refetch}>{t("admin.droneOrders.incident.refundLoadFailed")}</Button>}
    {data?.data?.content?.map(refund => <div key={refund.id} className="flex flex-wrap items-center gap-2 text-sm">
      <span>{t("admin.droneOrders.incident.refund", { id: refund.id })} · {formatCurrency(refund.amount)}</span>
      <MetaBadge meta={refundStatusMeta(refund.status)} />
      {refund.rejectionReason && <span>{refund.rejectionReason}</span>}
    </div>)}
    <Link className="text-sm underline" to={`/admin/payments?tab=refunds&orderId=${order.orderId}`}>{t("admin.droneOrders.incident.openRefunds")}</Link>
  </Panel>;
}

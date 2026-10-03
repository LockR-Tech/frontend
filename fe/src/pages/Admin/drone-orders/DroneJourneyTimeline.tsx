import { Check, X } from "lucide-react";
import { deliveryStageMeta } from "~/components/shared/reporting";
import { formatDateTime, parseBackendDateTime } from "~/lib/datetime";
import type { DroneOrderTracking } from "~/stores/apis/admin/droneOrders";
import {
  TIMELINE_STAGES,
  durationLabel,
  pickupCodeEvent,
  stageTimes,
} from "./journey";

const FAILURE_STATUSES = new Set(["CANCELED", "EXPIRED"]);

interface Detail {
  label: string;
  at: string | Date | null;
  note?: string | null;
}

/**
 * Timeline dọc của hành trình: mỗi chặng đã đạt có giờ đạt ngay trên tiêu đề, thời
 * gian chuyển từ chặng trước và các mốc phụ (thanh toán, nạp hàng, gửi mã, người
 * nhận lấy hàng) — thay cho khối "Mốc thời gian" riêng trước đây.
 */
export function DroneJourneyTimeline({ order }: { order: DroneOrderTracking }) {
  const times = stageTimes(order);
  const failed = FAILURE_STATUSES.has(order.status);
  const completed = order.status === "COMPLETED";
  const stageIndex = TIMELINE_STAGES.indexOf(
    (order.deliveryStage ?? "") as (typeof TIMELINE_STAGES)[number],
  );
  // Đơn huỷ/quá hạn dừng ở chặng xa nhất thực sự đạt, không tô các chặng chưa xảy ra.
  const reachedIndex = TIMELINE_STAGES.reduce(
    (max, stage, index) => (times.has(stage) ? index : max),
    0,
  );
  const active = completed
    ? TIMELINE_STAGES.length
    : failed
      ? reachedIndex
      : Math.max(stageIndex, 0);

  const code = pickupCodeEvent(order);
  const details: Partial<Record<string, Detail[]>> = {
    AWAITING_DISPATCH: [{ label: "Thanh toán", at: order.paidAt }],
    ACCEPTED: [
      { label: "Nạp hàng lên drone", at: order.loadedAt },
      { label: "Sẵn sàng phóng", at: order.readyToLaunchAt },
    ],
  };
  if (times.has("READY_FOR_PICKUP") || completed) {
    details.READY_FOR_PICKUP = [
      { label: "Gửi mã cho người nhận", at: code?.occurredAt ?? null, note: code?.note },
      { label: "Hạn nhận hàng", at: order.pickupDeadline },
      { label: "Người nhận lấy hàng", at: order.completedAt },
    ];
  }

  let previous: Date | null = null;
  return (
    <ol className="relative">
      {TIMELINE_STAGES.map((stage, index) => {
        const state =
          index < active ? "done" : index === active ? (failed ? "failed" : "current") : "pending";
        const at = state === "pending" ? null : (times.get(stage) ?? null);
        const since = at && previous ? at.getTime() - previous.getTime() : null;
        const ongoing =
          state === "current" && at && stage !== "READY_FOR_PICKUP"
            ? Date.now() - at.getTime()
            : null;
        if (at) previous = at;
        const meta = deliveryStageMeta(stage);
        const Icon = meta.icon;
        const isLast = index === TIMELINE_STAGES.length - 1;

        return (
          <li key={stage} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${
                  state === "done" ? "bg-emerald-500" : "bg-border"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                state === "done"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                  : state === "current"
                    ? "border-sky-700 bg-sky-700 text-white"
                    : state === "failed"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-border bg-background text-muted-foreground"
              }`}
            >
              {state === "done" ? (
                <Check className="h-4 w-4" />
              ) : state === "failed" ? (
                <X className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              {at && (
                <p className="font-mono text-[11px] font-bold text-sky-700">{formatDateTime(at)}</p>
              )}
              <p
                className={`text-sm ${
                  state === "pending" ? "text-muted-foreground" : "font-semibold"
                }`}
              >
                {meta.label}
              </p>
              {(since !== null || ongoing !== null) && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {since !== null && (
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Chuyển sau {durationLabel(since)}
                    </span>
                  )}
                  {ongoing !== null && (
                    <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                      Đã ở chặng này {durationLabel(ongoing)}
                    </span>
                  )}
                </div>
              )}
              {details[stage]?.map((detail) => {
                const value = parseBackendDateTime(detail.at);
                return (
                  <div key={detail.label} className="mt-1 text-xs">
                    <span className="text-muted-foreground">{detail.label}: </span>
                    <span
                      className={`font-mono ${value ? "font-semibold" : "text-muted-foreground"}`}
                    >
                      {value ? formatDateTime(value) : "Chưa diễn ra"}
                    </span>
                    {detail.note && (
                      <p className="text-[11px] text-muted-foreground">{detail.note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

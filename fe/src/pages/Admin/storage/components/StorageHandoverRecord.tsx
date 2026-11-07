import { useTranslation } from "react-i18next";
import { HandHelping } from "lucide-react";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import type { AdminOrder } from "~/types/admin/reporting";

/// Biên bản trao đồ lưu kho trên trang chi tiết đơn: ai trao, cho ai, SĐT, tiền đã thu, ảnh xác minh.
export function StorageHandoverRecord({ order }: { order: AdminOrder }) {
  const { t } = useTranslation();
  const h = order.handover;
  if (!h) return null;

  const staff = h.handedOverByName || (h.handedOverByUserId != null ? `#${h.handedOverByUserId}` : "—");
  return (
    <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <HandHelping className="h-3.5 w-3.5" />
        {t("admin.storage.detail.handover.title")}
      </p>
      <div className="flex gap-3">
        {h.photoUrl && (
          <a href={h.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={h.photoUrl}
              alt={t("admin.storage.detail.handover.photoAlt", { code: order.orderCode ?? order.id })}
              className="h-20 w-20 rounded-md border object-cover"
            />
          </a>
        )}
        <div className="min-w-0 space-y-0.5 text-[11px] text-muted-foreground">
          <p className="text-foreground">
            {t("admin.storage.detail.handover.summary", {
              time: formatDateTime(h.handedOverAt),
              staff,
              role: t(`admin.storage.detail.handover.roles.${h.recipientType}`),
              name: h.recipientName ?? "",
            })}
          </p>
          {h.recipientPhone && <p>{t("admin.storage.detail.handover.phone", { phone: h.recipientPhone })}</p>}
          {h.collectedAmount != null && h.collectionMethod && (
            <p>
              {t("admin.storage.detail.handover.collected", {
                amount: formatCurrency(h.collectedAmount),
                method: t(`admin.storage.handOver.method.${h.collectionMethod.toLowerCase()}`),
              })}
            </p>
          )}
          {h.note && <p className="break-words italic">“{h.note}”</p>}
        </div>
      </div>
    </div>
  );
}

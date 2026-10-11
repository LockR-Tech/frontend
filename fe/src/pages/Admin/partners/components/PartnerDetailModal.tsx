import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Hash,
  Calendar,
  Store,
  Users,
  Percent,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  useGetPartnerByIdQuery,
  useApprovePartnerMutation,
  useRejectPartnerMutation,
  useSuspendPartnerMutation,
} from "~/stores/apis/admin";
import { PartnerStatus } from "~/types/admin/enums";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<
  PartnerStatus,
  {
    bg: string;
    text: string;
    border: string;
    icon: React.ElementType;
    labelKey: string;
  }
> = {
  [PartnerStatus.APPROVED]: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/20",
    icon: CheckCircle,
    labelKey: "admin.partners.detail.status.approved",
  },
  [PartnerStatus.PENDING]: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/20",
    icon: Clock,
    labelKey: "admin.partners.status.pending",
  },
  [PartnerStatus.REJECTED]: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
    icon: XCircle,
    labelKey: "admin.partners.detail.status.rejected",
  },
  [PartnerStatus.SUSPENDED]: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    border: "border-border",
    icon: AlertCircle,
    labelKey: "admin.partners.detail.status.suspended",
  },
};

function LabelValue({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon size={15} className="text-muted-foreground/70 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground wrap-break-word">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PartnerDetailModalProps {
  partnerId: number | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PartnerDetailModal({
  partnerId,
  onClose,
}: PartnerDetailModalProps) {
  const { t } = useTranslation();
  const open = partnerId !== null;

  const { data, isLoading, isError } = useGetPartnerByIdQuery(partnerId!, {
    skip: partnerId === null,
  });

  const [approvePartner, { isLoading: approving }] =
    useApprovePartnerMutation();
  const [rejectPartner, { isLoading: rejecting }] = useRejectPartnerMutation();
  const [suspendPartner, { isLoading: suspending }] =
    useSuspendPartnerMutation();

  const partner = data?.data;
  const statusCfg = partner ? STATUS_CONFIG[partner.status] : null;
  const StatusIcon = statusCfg?.icon ?? Clock;

  async function handleApprove() {
    if (!partnerId) return;
    await approvePartner(partnerId);
    onClose();
  }

  async function handleReject() {
    if (!partnerId) return;
    await rejectPartner({ partnerId, reason: "Không đáp ứng yêu cầu" });
    onClose();
  }

  async function handleSuspend() {
    if (!partnerId) return;
    await suspendPartner(partnerId);
    onClose();
  }

  const actionBusy = approving || rejecting || suspending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 size={18} className="text-purple-600" />
            {t("admin.partners.detail.title", { id: partnerId })}
          </DialogTitle>
        </DialogHeader>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-3 py-10">
            <AlertTriangle size={36} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("admin.partners.detail.notFound")}</p>
          </div>
        )}

        {partner && statusCfg && (
          <div className="space-y-5">
            {/* Header card */}
            <div className="rounded-xl border bg-linear-to-r from-purple-50/60 to-indigo-50/60 p-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-purple-100">
                  <Building2 size={22} className="text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">
                    {partner.businessName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {partner.contactEmail}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} shrink-0 font-medium`}
              >
                <StatusIcon size={13} className="mr-1.5" />
                {t(statusCfg.labelKey)}
              </Badge>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: Store,
                  label: t("admin.partners.detail.stores"),
                  value: partner.storeCount,
                },
                {
                  icon: Users,
                  label: t("admin.partners.detail.staff"),
                  value: partner.staffCount,
                },
                {
                  icon: Percent,
                  label: t("admin.partners.detail.revenueShare"),
                  value: `${partner.revenueSharePercent ?? 0}%`,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-secondary/30 p-3 text-center"
                >
                  <Icon size={16} className="text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Business info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("admin.partners.detail.businessInfo")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelValue label={t("admin.partners.detail.businessName")} icon={Building2}>
                  {partner.businessName}
                </LabelValue>
                <LabelValue label={t("admin.partners.detail.registrationNumber")} icon={Hash}>
                  {partner.businessRegistrationNumber || "—"}
                </LabelValue>
                <LabelValue label={t("admin.partners.detail.taxId")} icon={FileText}>
                  {partner.taxId || "—"}
                </LabelValue>
                <LabelValue label={t("common.address")} icon={MapPin}>
                  {partner.businessAddress || "—"}
                </LabelValue>
              </div>
            </div>

            <Separator />

            {/* Contact info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("admin.partners.detail.contactInfo")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelValue label={t("admin.partners.detail.representative")} icon={User}>
                  {partner.userName}
                </LabelValue>
                <LabelValue label={t("common.phoneShort")} icon={Phone}>
                  {partner.contactPhone || "—"}
                </LabelValue>
                <LabelValue label={t("admin.partners.detail.contactEmail")} icon={Mail}>
                  {partner.contactEmail}
                </LabelValue>
              </div>
            </div>

            <Separator />

            {/* Meta */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("admin.partners.detail.systemInfo")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelValue label={t("admin.partners.detail.registeredAt")} icon={Calendar}>
                  {fmtDate(partner.createdAt)}
                </LabelValue>
                {partner.approvedAt && (
                  <LabelValue label={t("admin.partners.detail.approvedAt")} icon={Calendar}>
                    {fmtDate(partner.approvedAt)}
                  </LabelValue>
                )}
                {partner.rejectionReason && (
                  <div className="col-span-2">
                    <LabelValue label={t("admin.partners.detail.rejectionReason")} icon={XCircle}>
                      <span className="text-red-600">
                        {partner.rejectionReason}
                      </span>
                    </LabelValue>
                  </div>
                )}
                {partner.notes && (
                  <div className="col-span-2">
                    <LabelValue label={t("common.note")} icon={FileText}>
                      <span className="text-muted-foreground font-normal">
                        {partner.notes}
                      </span>
                    </LabelValue>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {(partner.status === PartnerStatus.PENDING ||
              partner.status === PartnerStatus.APPROVED) && (
              <>
                <Separator />
                <div className="flex justify-end gap-2">
                  {partner.status === PartnerStatus.PENDING && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/20 hover:bg-destructive/10"
                        disabled={actionBusy}
                        onClick={handleReject}
                      >
                        <XCircle size={14} className="mr-1.5" />
                        {rejecting ? t("admin.partners.detail.rejecting") : t("dropdown.reject")}
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionBusy}
                        onClick={handleApprove}
                      >
                        <CheckCircle size={14} className="mr-1.5" />
                        {approving ? t("admin.partners.detail.approving") : t("dropdown.approve")}
                      </Button>
                    </>
                  )}
                  {partner.status === PartnerStatus.APPROVED && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                      disabled={actionBusy}
                      onClick={handleSuspend}
                    >
                      <AlertCircle size={14} className="mr-1.5" />
                      {suspending ? t("admin.partners.detail.suspending") : t("dropdown.suspend")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

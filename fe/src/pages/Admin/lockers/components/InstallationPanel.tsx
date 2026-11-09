import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  Camera,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Cpu,
  Hammer,
  Pencil,
  Plus,
  Undo2,
  User,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  OPEN_INSTALLATION_STATUSES,
  useApproveInstallationMutation,
  useCancelInstallationMutation,
  useCreateInstallationMutation,
  useGetLockerInstallationQuery,
  useReturnInstallationMutation,
  useUpdateInstallationMutation,
  type Installation,
  type InstallationCheck,
  type InstallationCheckStatus,
  type InstallationPhoto,
  type InstallationRequest,
  type InstallationStatus,
} from "~/stores/apis/admin/installations";

export interface InstallationTechnician {
  id: number;
  name: string;
  phone: string;
  active: boolean;
}

interface Props {
  lockerId: number;
  lockerCode: string;
  technicians: InstallationTechnician[];
}

const STATUS_STYLE: Record<InstallationStatus, string> = {
  SCHEDULED: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400",
  IN_PROGRESS: "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  SUBMITTED: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
  APPROVED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-secondary border-border text-muted-foreground",
};

const CHECK_STYLE: Record<InstallationCheckStatus, { cls: string; icon: React.ElementType }> = {
  PASSED: { cls: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  FAILED: { cls: "text-rose-700 dark:text-rose-400", icon: XCircle },
  NOT_APPLICABLE: { cls: "text-muted-foreground", icon: Ban },
  PENDING: { cls: "text-muted-foreground", icon: CircleDashed },
};

const NETWORK_TYPES = ["WIFI", "4G", "LAN"] as const;
const NO_NETWORK = "NONE";

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** `datetime-local` cần `yyyy-MM-ddTHH:mm` theo giờ máy; server lưu LocalDateTime (giờ VN) nên giữ nguyên chuỗi. */
function toLocalInput(value: string | null | undefined) {
  return value ? value.slice(0, 16) : "";
}

function errorMessage(err: any, fallback: string) {
  return err?.data?.message || err?.message || fallback;
}

export function InstallationPanel({ lockerId, lockerCode, technicians }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isFetching } = useGetLockerInstallationQuery(lockerId, {
    // Hồ sơ đang mở: các bước tự động đổi theo tủ ⇒ tự làm mới.
    pollingInterval: 20000,
    skipPollingIfUnfocused: true,
  });
  const installation = data?.data ?? null;
  const isOpen = installation != null && OPEN_INSTALLATION_STATUSES.includes(installation.status);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reasonAction, setReasonAction] = useState<"return" | "cancel" | null>(null);

  const [approve, { isLoading: approving }] = useApproveInstallationMutation();

  const technicianName = (id: number | null | undefined) =>
    id == null ? "—" : technicians.find((tech) => tech.id === id)?.name ?? t("admin.lockers.table.technicianId", { id });

  const handleApprove = async () => {
    if (!installation) return;
    try {
      await approve(installation.id).unwrap();
      toast.success(t("admin.lockers.installation.toast.approved"));
    } catch (err: any) {
      toast.error(errorMessage(err, t("common.pleaseRetry")));
      refetch();
    }
  };

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {!isOpen && (
        <Card>
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary border border-border/60 flex items-center justify-center shrink-0">
                <Hammer className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">
                  {installation
                    ? t("admin.lockers.installation.closedTitle", {
                        status: t(`admin.lockers.installation.status.${installation.status}`),
                      })
                    : t("admin.lockers.installation.emptyTitle")}
                </p>
                <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                  {t("admin.lockers.installation.lifecycle")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => {
                setEditing(false);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {installation ? t("admin.lockers.installation.createAgain") : t("admin.lockers.installation.create")}
            </Button>
          </CardContent>
        </Card>
      )}

      {installation && (
        <InstallationView
          installation={installation}
          technicianName={technicianName}
          refreshing={isFetching}
          onRefresh={refetch}
          onEdit={() => {
            setEditing(true);
            setFormOpen(true);
          }}
          onApprove={handleApprove}
          approving={approving}
          onReturn={() => setReasonAction("return")}
          onCancel={() => setReasonAction("cancel")}
        />
      )}

      <InstallationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lockerId={lockerId}
        lockerCode={lockerCode}
        technicians={technicians}
        installation={editing ? installation : null}
      />

      {installation && (
        <ReasonDialog
          action={reasonAction}
          installationId={installation.id}
          onClose={() => setReasonAction(null)}
        />
      )}
    </div>
  );
}

function InstallationView({
  installation,
  technicianName,
  refreshing,
  onRefresh,
  onEdit,
  onApprove,
  approving,
  onReturn,
  onCancel,
}: {
  installation: Installation;
  technicianName: (id: number | null | undefined) => string;
  refreshing: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  onApprove: () => void;
  approving: boolean;
  onReturn: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const open = OPEN_INSTALLATION_STATUSES.includes(installation.status);
  const passed = installation.checks.filter((c) => c.status === "PASSED" || c.status === "NOT_APPLICABLE").length;
  const photosByItem = useMemo(() => {
    const groups = new Map<string, InstallationPhoto[]>();
    for (const photo of installation.photos) {
      const key = photo.item ?? "SITE";
      groups.set(key, [...(groups.get(key) ?? []), photo]);
    }
    return groups;
  }, [installation.photos]);
  const labelOf = (item: string) =>
    item === "SITE"
      ? t("admin.lockers.installation.sitePhotos")
      : installation.checks.find((c) => c.item === item)?.label ?? item;

  const info: { label: string; value: string | null }[] = [
    { label: t("admin.lockers.installation.fields.technician"), value: technicianName(installation.technicianId) },
    { label: t("admin.lockers.installation.fields.scheduledAt"), value: formatTime(installation.scheduledAt) },
    {
      label: t("admin.lockers.installation.fields.siteContact"),
      value: [installation.siteContactName, installation.siteContactPhone].filter(Boolean).join(" · ") || null,
    },
    { label: t("admin.lockers.installation.fields.powerSource"), value: installation.powerSource },
    {
      label: t("admin.lockers.installation.fields.network"),
      value: [installation.networkType, installation.networkNote].filter(Boolean).join(" · ") || null,
    },
    {
      label: t("admin.lockers.installation.fields.cabinet"),
      value: [installation.cabinetModel, installation.cabinetSerial].filter(Boolean).join(" · ") || null,
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-1">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Hammer className="w-4 h-4 text-muted-foreground" />
              {t("admin.lockers.installation.title", { id: installation.id })}
            </CardTitle>
            <Badge variant="outline" className={`${STATUS_STYLE[installation.status]} text-xs font-semibold`}>
              {t(`admin.lockers.installation.status.${installation.status}`)}
            </Badge>
          </div>
          {open && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
              {t("button.edit")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {info.map((row) => (
            <div key={row.label}>
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="font-medium text-foreground break-words">{row.value || "—"}</p>
            </div>
          ))}
          {installation.notes && (
            <div>
              <p className="text-xs text-muted-foreground">{t("admin.lockers.installation.fields.notes")}</p>
              <p className="text-foreground whitespace-pre-line">{installation.notes}</p>
            </div>
          )}
          <div className="pt-2 border-t border-border/60 space-y-1 text-xs text-muted-foreground">
            <p>{t("admin.lockers.installation.timeline.created", { time: formatTime(installation.createdAt) })}</p>
            {installation.startedAt && (
              <p>{t("admin.lockers.installation.timeline.started", { time: formatTime(installation.startedAt) })}</p>
            )}
            {installation.submittedAt && (
              <p>{t("admin.lockers.installation.timeline.submitted", { time: formatTime(installation.submittedAt) })}</p>
            )}
            {installation.approvedAt && (
              <p>{t("admin.lockers.installation.timeline.approved", { time: formatTime(installation.approvedAt) })}</p>
            )}
            {installation.cancelledAt && (
              <p>{t("admin.lockers.installation.timeline.cancelled", { time: formatTime(installation.cancelledAt) })}</p>
            )}
          </div>
          {installation.returnReason && installation.status === "IN_PROGRESS" && (
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-xs">
              <p className="font-semibold text-amber-900 dark:text-amber-200">{t("admin.lockers.installation.returnedTitle")}</p>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">{installation.returnReason}</p>
            </div>
          )}
          {installation.cancelReason && installation.status === "CANCELLED" && (
            <div className="p-3 rounded-lg border border-border bg-secondary/60 text-xs">
              <p className="font-semibold text-foreground">{t("admin.lockers.installation.cancelledTitle")}</p>
              <p className="text-muted-foreground mt-0.5">{installation.cancelReason}</p>
            </div>
          )}
          {open && (
            <div className="pt-2 flex flex-wrap gap-2">
              {installation.status === "SUBMITTED" && (
                <>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={approving || installation.missing.length > 0}
                    onClick={onApprove}
                    title={installation.missing.length > 0 ? t("admin.lockers.installation.approveBlocked") : undefined}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    {t("admin.lockers.installation.approve")}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={onReturn}>
                    <Undo2 className="w-4 h-4" />
                    {t("admin.lockers.installation.return")}
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={onCancel}>
                <Ban className="w-4 h-4" />
                {t("admin.lockers.installation.cancel")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="xl:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
              {t("admin.lockers.installation.checklist", { passed, total: installation.checks.length })}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              {installation.controllerMac ? (
                <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                  {installation.controllerOnline ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <Cpu className="w-3.5 h-3.5" />
                  {installation.controllerMac}
                </span>
              ) : null}
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={refreshing} onClick={onRefresh}>
                {t("button.refresh")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!installation.iotAvailable && (
              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-amber-800 dark:text-amber-300">{t("admin.lockers.installation.iotUnavailable")}</span>
              </div>
            )}
            <ul className="divide-y divide-border/60 border border-border/60 rounded-lg">
              {installation.checks.map((check) => (
                <CheckRow key={check.item} check={check} technicianName={technicianName} />
              ))}
            </ul>
            {open && installation.missing.length > 0 && (
              <div className="p-3 rounded-lg border border-border bg-secondary/50 text-xs space-y-1">
                <p className="font-semibold text-foreground">{t("admin.lockers.installation.missingTitle")}</p>
                <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                  {installation.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              {t("admin.lockers.installation.photos", { count: installation.photos.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {installation.photos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{t("admin.lockers.installation.noPhotos")}</p>
            ) : (
              [...photosByItem.entries()].map(([item, photos]) => (
                <div key={item} className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">
                    {labelOf(item)} <span className="text-muted-foreground font-normal">({photos.length})</span>
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block aspect-square overflow-hidden rounded-md border border-border/60 bg-secondary"
                        title={[photo.caption, formatTime(photo.capturedAt ?? photo.createdAt)].filter(Boolean).join(" · ")}
                      >
                        <img
                          src={photo.thumbnailUrl || photo.url}
                          alt={photo.caption || labelOf(item)}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CheckRow({
  check,
  technicianName,
}: {
  check: InstallationCheck;
  technicianName: (id: number | null | undefined) => string;
}) {
  const { t } = useTranslation();
  const style = CHECK_STYLE[check.status] ?? CHECK_STYLE.PENDING;
  const Icon = style.icon;
  const boxes = Array.isArray(check.detail) ? check.detail : [];
  return (
    <li className="p-3 flex items-start gap-3">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.cls}`} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{check.label}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            {check.auto ? <Cpu className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {t(check.auto ? "admin.lockers.installation.byAuto" : "admin.lockers.installation.byTechnician")}
          </Badge>
          {check.photoRequired && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
              <Camera className="w-3 h-3" />
              {check.photoCount}
            </Badge>
          )}
          <span className={`text-xs font-semibold ${style.cls}`}>
            {t(`admin.lockers.installation.checkStatus.${check.status}`)}
          </span>
        </div>
        {check.note && <p className="text-xs text-muted-foreground break-words">{check.note}</p>}
        {check.verifiedBy === "TECHNICIAN" && check.checkedAt && (
          <p className="text-[11px] text-muted-foreground">
            {t("admin.lockers.installation.checkedBy", {
              name: technicianName(check.checkedBy),
              time: formatTime(check.checkedAt),
            })}
          </p>
        )}
        {boxes.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {boxes.map((box) => {
              const boxStyle = CHECK_STYLE[box.status] ?? CHECK_STYLE.PENDING;
              return (
                <span
                  key={box.boxId}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 ${boxStyle.cls}`}
                  title={[box.command, box.message, box.testedAt ? formatTime(box.testedAt) : null].filter(Boolean).join(" · ")}
                >
                  #{box.boxNumber}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </li>
  );
}

function InstallationFormDialog({
  open,
  onOpenChange,
  lockerId,
  lockerCode,
  technicians,
  installation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockerId: number;
  lockerCode: string;
  technicians: InstallationTechnician[];
  installation: Installation | null;
}) {
  const { t } = useTranslation();
  const [createInstallation, { isLoading: creating }] = useCreateInstallationMutation();
  const [updateInstallation, { isLoading: updating }] = useUpdateInstallationMutation();
  const [form, setForm] = useState<Record<string, string>>({});

  // Mỗi lần mở: nạp lại từ hồ sơ đang sửa (hoặc form trống khi lập mới).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? `${installation?.id ?? "new"}` : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (open) {
      setForm({
        technicianId: installation ? String(installation.technicianId) : "",
        scheduledAt: toLocalInput(installation?.scheduledAt),
        siteContactName: installation?.siteContactName ?? "",
        siteContactPhone: installation?.siteContactPhone ?? "",
        powerSource: installation?.powerSource ?? "",
        networkType: installation?.networkType ?? NO_NETWORK,
        networkNote: installation?.networkNote ?? "",
        cabinetModel: installation?.cabinetModel ?? "",
        cabinetSerial: installation?.cabinetSerial ?? "",
        notes: installation?.notes ?? "",
      });
    }
  }

  const set = (field: string) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const text = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(field)(event.target.value);
  const orNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

  const submit = async () => {
    if (!form.technicianId) {
      toast.error(t("admin.lockers.installation.form.technicianRequired"));
      return;
    }
    const body: InstallationRequest = {
      technicianId: Number(form.technicianId),
      scheduledAt: form.scheduledAt ? `${form.scheduledAt}:00` : null,
      siteContactName: orNull(form.siteContactName),
      siteContactPhone: orNull(form.siteContactPhone),
      powerSource: orNull(form.powerSource),
      networkType: form.networkType && form.networkType !== NO_NETWORK ? (form.networkType as InstallationRequest["networkType"]) : null,
      networkNote: orNull(form.networkNote),
      cabinetModel: orNull(form.cabinetModel),
      cabinetSerial: orNull(form.cabinetSerial),
      notes: orNull(form.notes),
    };
    try {
      if (installation) {
        await updateInstallation({ id: installation.id, body }).unwrap();
        toast.success(t("admin.lockers.installation.toast.updated"));
      } else {
        await createInstallation({ lockerId, body }).unwrap();
        toast.success(t("admin.lockers.installation.toast.created"));
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(errorMessage(err, t("common.pleaseRetry")));
    }
  };

  const busy = creating || updating;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {installation
              ? t("admin.lockers.installation.form.editTitle", { code: lockerCode })
              : t("admin.lockers.installation.form.createTitle", { code: lockerCode })}
          </DialogTitle>
          <DialogDescription>{t("admin.lockers.installation.form.desc")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t("admin.lockers.installation.fields.technician")} *</Label>
            <Select value={form.technicianId || undefined} onValueChange={set("technicianId")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("admin.lockers.installation.form.technicianPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={String(tech.id)} disabled={!tech.active}>
                    {tech.name}
                    {tech.phone ? ` · ${tech.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{t("admin.lockers.installation.form.technicianHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.scheduledAt")}</Label>
            <Input type="datetime-local" value={form.scheduledAt ?? ""} onChange={text("scheduledAt")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.powerSource")}</Label>
            <Input
              maxLength={100}
              value={form.powerSource ?? ""}
              onChange={text("powerSource")}
              placeholder={t("admin.lockers.installation.form.powerPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.siteContactName")}</Label>
            <Input maxLength={100} value={form.siteContactName ?? ""} onChange={text("siteContactName")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.siteContactPhone")}</Label>
            <Input maxLength={20} inputMode="tel" value={form.siteContactPhone ?? ""} onChange={text("siteContactPhone")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.networkType")}</Label>
            <Select value={form.networkType || NO_NETWORK} onValueChange={set("networkType")}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_NETWORK}>{t("admin.lockers.installation.form.networkUnknown")}</SelectItem>
                {NETWORK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.networkNote")}</Label>
            <Input
              maxLength={255}
              value={form.networkNote ?? ""}
              onChange={text("networkNote")}
              placeholder={t("admin.lockers.installation.form.networkNotePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.cabinetModel")}</Label>
            <Input maxLength={100} value={form.cabinetModel ?? ""} onChange={text("cabinetModel")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.lockers.installation.fields.cabinetSerial")}</Label>
            <Input maxLength={100} value={form.cabinetSerial ?? ""} onChange={text("cabinetSerial")} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t("admin.lockers.installation.fields.notes")}</Label>
            <Textarea maxLength={1000} rows={3} value={form.notes ?? ""} onChange={text("notes")} />
          </div>
        </div>

        {!installation && (
          <p className="text-xs text-amber-700 dark:text-amber-400">{t("admin.lockers.installation.form.createWarning")}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("button.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {installation ? t("button.save") : t("admin.lockers.installation.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReasonDialog({
  action,
  installationId,
  onClose,
}: {
  action: "return" | "cancel" | null;
  installationId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [returnInstallation, { isLoading: returning }] = useReturnInstallationMutation();
  const [cancelInstallation, { isLoading: cancelling }] = useCancelInstallationMutation();
  const busy = returning || cancelling;

  const close = () => {
    setReason("");
    onClose();
  };

  const submit = async () => {
    if (!reason.trim() || !action) return;
    try {
      if (action === "return") {
        await returnInstallation({ id: installationId, reason: reason.trim() }).unwrap();
        toast.success(t("admin.lockers.installation.toast.returned"));
      } else {
        await cancelInstallation({ id: installationId, reason: reason.trim() }).unwrap();
        toast.success(t("admin.lockers.installation.toast.cancelled"));
      }
      close();
    } catch (err: any) {
      toast.error(errorMessage(err, t("common.pleaseRetry")));
    }
  };

  return (
    <Dialog open={action != null} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t(action === "cancel" ? "admin.lockers.installation.cancelTitle" : "admin.lockers.installation.returnTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(action === "cancel" ? "admin.lockers.installation.cancelDesc" : "admin.lockers.installation.returnDesc")}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("admin.lockers.installation.reasonPlaceholder")}
        />
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            {t("button.cancel")}
          </Button>
          <Button
            variant={action === "cancel" ? "destructive" : "default"}
            onClick={submit}
            disabled={busy || !reason.trim()}
          >
            {t(action === "cancel" ? "admin.lockers.installation.cancel" : "admin.lockers.installation.return")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

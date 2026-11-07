import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { PhotoPicker } from "~/components/shared/media";
import { LabelValue, paymentMethodMeta } from "~/components/shared/reporting";
import { isHandledUploadError, useImageUpload } from "~/hooks/useImageUpload";
import { cn } from "~/lib/utils";
import { useGetAdminOrderDetailQuery, useStorageHandoverMutation } from "~/stores/apis/admin/orders";
import { toReportError } from "~/lib/report-error";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency } from "~/lib/report-format";
import type {
  AdminOrder,
  HandoverCollectionMethod,
  HandoverRecipientType,
} from "~/types/admin/reporting";
import {
  digitsOf,
  knownPhonesOf,
  maskPhone,
  outstandingOf,
  storedAtOf,
  storedDurationLabel,
  storedHours,
} from "../storage-utils";
import { WebcamCapture } from "./WebcamCapture";

interface HandOverDialogProps {
  order: AdminOrder | null;
  onClose: () => void;
  onDone?: () => void;
}

/**
 * Trao trả đồ lưu kho tại quầy: chốt đơn EXPIRED → COMPLETED qua `POST /storage-handover`.
 * Bắt buộc: chọn ai tới nhận + 4 số cuối SĐT (người không có trên đơn thì họ tên, SĐT, lý do),
 * ảnh xác minh, và — khi khách còn nợ — xác nhận đã thu đủ. Server kiểm tra lại toàn bộ.
 */
export function HandOverDialog({ order, onClose, onDone }: HandOverDialogProps) {
  if (!order) return null;
  // key: mở đơn khác thì form làm mới hoàn toàn
  return <HandOverForm key={order.id} order={order} onClose={onClose} onDone={onDone} />;
}

function HandOverForm({
  order: listed,
  onClose,
  onDone,
}: { order: AdminOrder } & Omit<HandOverDialogProps, "order">) {
  const { t } = useTranslation();
  // Số liệu trong danh sách có thể cũ (khách vừa trả trong app ngay tại quầy): mở hộp là nạp lại chi tiết.
  const {
    data: fresh,
    isFetching: refreshing,
    refetch,
  } = useGetAdminOrderDetailQuery(listed.id, { refetchOnMountOrArgChange: true });
  const order = fresh?.data ?? listed;
  const [handOver, { isLoading: saving }] = useStorageHandoverMutation();
  const { upload, items: uploadItems, isUploading } = useImageUpload("STORAGE_HANDOVER");

  const receiver = order.receiver;
  const hasReceiver = !!(receiver?.name || receiver?.accountFullName || receiver?.phone || receiver?.accountPhoneNumber);
  const [recipientType, setRecipientType] = useState<HandoverRecipientType>(hasReceiver ? "RECEIVER" : "SENDER");
  const [last4, setLast4] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [method, setMethod] = useState<HandoverCollectionMethod | null>(null);
  const [collected, setCollected] = useState(false);

  const owed = outstandingOf(order);
  // Đã trả đủ (thường là khách trả trong app): hiện cho nhân viên biết không cần thu thêm.
  const paidAmount = order.payment?.paidAmount ?? 0;
  const lastPaidMethod = order.payment?.lastPaidMethod;
  const lastPaidAt = order.payment?.lastPaidAt;
  const showPaid = owed <= 0 && (paidAmount > 0 || order.paymentStatus === "PAID");
  const hours = storedHours(order);
  const code = order.orderCode ?? t("admin.orders.noCodeInline");
  const busy = saving || isUploading;

  const senderName = order.customer?.fullName || EMPTY_VALUE;
  const senderPhone = maskPhone(order.customer?.phoneNumber);
  const receiverName = receiver?.name || receiver?.accountFullName || EMPTY_VALUE;
  const receiverPhone = maskPhone(receiver?.phone || receiver?.accountPhoneNumber);

  const isOther = recipientType === "OTHER";
  const knownPhones = useMemo(
    () => (recipientType === "SENDER" || recipientType === "RECEIVER" ? knownPhonesOf(order, recipientType) : []),
    [order, recipientType],
  );
  // Web không biết SĐT bên này thì để server đối chiếu (server còn SĐT người gửi của đơn drone…)
  const phoneMatch: "match" | "mismatch" | "unknown" | null =
    isOther || last4.length !== 4
      ? null
      : knownPhones.length === 0
        ? "unknown"
        : knownPhones.some((p) => p.endsWith(last4))
          ? "match"
          : "mismatch";

  const identityOk = isOther
    ? otherName.trim().length > 0 && digitsOf(otherPhone).length >= 9 && note.trim().length > 0
    : last4.length === 4 && phoneMatch !== "mismatch";
  const paymentOk = owed <= 0 || (method !== null && collected);
  const canSubmit = identityOk && photos.length === 1 && paymentOk && !busy;

  const missing = [
    !identityOk && t("admin.storage.handOver.missing.identity"),
    photos.length === 0 && t("admin.storage.handOver.missing.photo"),
    !paymentOk && t("admin.storage.handOver.missing.payment"),
  ].filter(Boolean) as string[];

  const handleConfirm = async () => {
    if (!canSubmit) return;
    try {
      const [photo] = await upload(photos);
      await handOver({
        id: order.id,
        recipientType,
        ...(isOther
          ? { recipientName: otherName.trim(), recipientPhone: digitsOf(otherPhone) }
          : { phoneLast4: last4 }),
        photo,
        ...(owed > 0 && method ? { collectedAmount: owed, collectionMethod: method } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }).unwrap();
      toast.success(t("admin.storage.handOver.done", { code }));
      onDone?.();
      onClose();
    } catch (error) {
      if (isHandledUploadError(error)) return;
      toast.error(
        toReportError(error as Parameters<typeof toReportError>[0])?.message ??
          t("admin.storage.handOver.failed"),
      );
    }
  };

  const recipientOptions: { value: HandoverRecipientType; label: string }[] = [
    ...(hasReceiver ? [{ value: "RECEIVER" as const, label: t("admin.storage.handOver.recipient.receiver") }] : []),
    { value: "SENDER", label: t("admin.storage.handOver.recipient.sender") },
    { value: "OTHER", label: t("admin.storage.handOver.recipient.other") },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      {/* Dialog ngang: chỉ phần giữa cuộn, header và footer (nút Đóng / Đã trao trả) luôn hiện */}
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 pb-4 pr-12 pt-6">
          <DialogTitle>{t("admin.storage.handOver.title")}</DialogTitle>
          <DialogDescription>{t("admin.storage.handOver.description", { code })}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Thông tin đơn */}
          <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 md:grid-cols-4">
            <LabelValue label={t("admin.orders.table.senderCustomer")}>
              {senderName}
              {senderPhone ? ` · ${senderPhone}` : ""}
            </LabelValue>
            <LabelValue label={t("admin.orders.fields.receiver")}>
              {hasReceiver ? (
                <>
                  {receiverName}
                  {receiverPhone ? ` · ${receiverPhone}` : ""}
                </>
              ) : (
                <span className="text-muted-foreground">{t("admin.storage.handOver.selfPickup")}</span>
              )}
            </LabelValue>
            <LabelValue label={t("admin.storage.table.storedAt")}>
              {formatDateTime(storedAtOf(order))}
              {hours !== null && (
                <span className="block text-xs text-muted-foreground">
                  {t("admin.storage.handOver.storedFor", { duration: storedDurationLabel(hours, t) })}
                </span>
              )}
            </LabelValue>
            <LabelValue label={t("admin.storage.table.overtimeFee")}>
              {formatCurrency(order.fees?.overtimeFee ?? order.extraFee ?? 0)}
            </LabelValue>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Cột trái: ai tới nhận, thu nợ, ghi chú */}
            <div className="space-y-5">
              <section className="space-y-2">
                <Label>{t("admin.storage.handOver.recipient.title")}</Label>
                <div role="radiogroup" className="grid grid-cols-3 gap-1.5">
                  {recipientOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={recipientType === option.value}
                      variant={recipientType === option.value ? "default" : "outline"}
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setRecipientType(option.value);
                        setLast4("");
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                {isOther ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder={t("admin.storage.handOver.other.name")}
                      value={otherName}
                      maxLength={120}
                      onChange={(e) => setOtherName(e.target.value)}
                      disabled={busy}
                    />
                    <Input
                      placeholder={t("admin.storage.handOver.other.phone")}
                      value={otherPhone}
                      inputMode="tel"
                      maxLength={20}
                      onChange={(e) => setOtherPhone(e.target.value)}
                      disabled={busy}
                    />
                    <p className="col-span-2 text-xs text-muted-foreground">{t("admin.storage.handOver.other.hint")}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-32 font-mono tracking-[0.4em]"
                        placeholder="••••"
                        aria-label={t("admin.storage.handOver.last4.label")}
                        value={last4}
                        inputMode="numeric"
                        maxLength={4}
                        onChange={(e) => setLast4(digitsOf(e.target.value).slice(0, 4))}
                        disabled={busy}
                      />
                      {phoneMatch === "match" && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          {t("admin.storage.handOver.last4.match")}
                        </span>
                      )}
                      {phoneMatch === "mismatch" && (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <XCircle className="h-4 w-4" />
                          {t("admin.storage.handOver.last4.mismatch")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("admin.storage.handOver.last4.hint")}</p>
                  </div>
                )}
              </section>

              {/* Thu nợ */}
              {owed > 0 && (
                <section className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{t("admin.storage.handOver.owed", { amount: formatCurrency(owed) })}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["CASH", "TRANSFER"] as const).map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={method === value ? "default" : "outline"}
                        aria-pressed={method === value}
                        disabled={busy}
                        onClick={() => setMethod(value)}
                      >
                        {t(`admin.storage.handOver.method.${value.toLowerCase()}`)}
                      </Button>
                    ))}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={collected} onCheckedChange={(v) => setCollected(v === true)} disabled={busy} />
                    {t("admin.storage.handOver.collectedConfirm", { amount: formatCurrency(owed) })}
                  </label>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-amber-800 underline-offset-2 hover:underline disabled:opacity-60 dark:text-amber-300"
                    onClick={() => void refetch()}
                    disabled={refreshing || busy}
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                    {t("admin.storage.handOver.recheckPayment")}
                  </button>
                </section>
              )}

              {showPaid && (
                <section className="flex gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {paidAmount > 0
                        ? t("admin.storage.handOver.paid", { amount: formatCurrency(paidAmount) })
                        : t("admin.storage.handOver.paidNoAmount")}
                    </p>
                    {(lastPaidMethod || lastPaidAt) && (
                      <p className="text-xs opacity-80">
                        {[
                          lastPaidMethod ? paymentMethodMeta(lastPaidMethod).label : null,
                          lastPaidAt ? formatDateTime(lastPaidAt) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Ghi chú */}
              <section className="space-y-1.5">
                <Label htmlFor="handover-note">
                  {isOther ? t("admin.storage.handOver.noteRequired") : t("admin.storage.handOver.note")}
                </Label>
                <Textarea
                  id="handover-note"
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={busy}
                />
              </section>
            </div>

            {/* Cột phải: ảnh xác minh */}
            <section className="space-y-2">
              <Label>{t("admin.storage.handOver.photo.title")}</Label>
              {photos.length === 0 && (
                <WebcamCapture onCapture={(file) => setPhotos([file])} disabled={busy} />
              )}
              <PhotoPicker
                value={photos}
                onChange={setPhotos}
                maxFiles={1}
                disabled={busy}
                uploadItems={uploadItems}
                hint={t("admin.storage.handOver.photo.hint")}
              />
            </section>
          </div>
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <p className={cn("text-xs text-muted-foreground", missing.length === 0 && "invisible")}>
            {t("admin.storage.handOver.missing.prefix")} {missing.join(", ")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t("button.close")}
            </Button>
            <Button onClick={handleConfirm} disabled={!canSubmit}>
              {isUploading
                ? t("admin.storage.handOver.uploading")
                : saving
                  ? t("admin.orders.saving")
                  : t("admin.storage.handOver.confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

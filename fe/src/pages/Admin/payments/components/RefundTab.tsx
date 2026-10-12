import { useCallback, useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  User,
  AlertTriangle,
  Loader2,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import { DataTable } from "~/components/shared/data-table";
import {
  DateRangeFilter,
  MetaBadge,
  ReportErrorState,
  refundStatusMeta,
} from "~/components/shared/reporting";
import {
  useGetAdminRefundsQuery,
  useApproveRefundMutation,
  useRejectRefundMutation,
} from "~/stores/apis/admin/payments";
import { useGetBusinessSettingsQuery } from "~/stores/apis/admin/businessSettings";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatNumber } from "~/lib/report-format";
import type { AdminRefund } from "~/types/admin/reporting";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

const columnHelper = createColumnHelper<AdminRefund>();

/** Quy tắc payment-service: bật thì backend từ chối duyệt hoàn (TRANSFER_REF_REQUIRED) khi thiếu mã GD. */
const REQUIRE_TRANSFER_REF_KEY = "app.payment.refund-require-transfer-ref";

const STATUS_TABS = [
  { key: "ALL", labelKey: "common.all" },
  { key: "PENDING", labelKey: "admin.payments.review.pending" },
  { key: "COMPLETED", labelKey: "admin.payments.refund.status.completed" },
  { key: "REJECTED", labelKey: "admin.payments.review.rejected" },
] as const;

/** Danh sách hoàn tiền của toàn hệ thống (`GET /api/admin/payments/refunds`, § 2.4). */
export function RefundTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedOrderId = Number(searchParams.get("orderId"));
  const orderId = Number.isSafeInteger(requestedOrderId) && requestedOrderId > 0 ? requestedOrderId : undefined;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [range, setRange] = useState({ from: "", to: "" });

  // State cho Modal Duyệt / Từ chối
  const [selectedRefund, setSelectedRefund] = useState<AdminRefund | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "DETAIL" | null>(null);
  const [bankTransferRef, setBankTransferRef] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const [approveRefund, { isLoading: isApproving }] = useApproveRefundMutation();
  const [rejectRefund, { isLoading: isRejecting }] = useRejectRefundMutation();

  const queryParams = useMemo(
    () => ({
      orderId,
      page,
      size: pageSize,
      sort: "requestedAt,desc",
      ...(statusFilter !== "ALL" ? { status: [statusFilter] } : {}),
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
    }),
    [page, pageSize, statusFilter, range, orderId],
  );

  const { data, isLoading, isFetching, error, refetch } = useGetAdminRefundsQuery(queryParams);

  // Đọc lỗi thì coi như không bắt buộc — backend vẫn chặn và trả lỗi rõ ràng.
  const { data: paymentSettings } = useGetBusinessSettingsQuery("payment");
  const transferRefRequired = useMemo(() => {
    const setting = paymentSettings?.data?.find((s) => s.key === REQUIRE_TRANSFER_REF_KEY);
    return (setting?.value ?? setting?.defaultValue) === "true";
  }, [paymentSettings]);
  const transferRefMissing = transferRefRequired && !bankTransferRef.trim();

  const handleRangeChange = useCallback((next: { from: string; to: string }) => {
    setRange(next);
    setPage(0);
  }, []);

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(0);
  };

  const handleOpenAction = (refund: AdminRefund, type: "APPROVE" | "REJECT" | "DETAIL") => {
    setSelectedRefund(refund);
    setActionType(type);
    setBankTransferRef("");
    setRejectionReason("");
  };

  const handleCloseModal = () => {
    setSelectedRefund(null);
    setActionType(null);
    setBankTransferRef("");
    setRejectionReason("");
  };

  const handleApprove = async () => {
    if (!selectedRefund) return;
    if (transferRefMissing) {
      toast.error(t("admin.payments.refund.toast.transferRefRequired"));
      return;
    }
    try {
      await approveRefund({
        refundId: selectedRefund.id,
        bankTransferRef: bankTransferRef.trim() || undefined,
      }).unwrap();
      toast.success(t("admin.payments.refund.toast.approved", { id: selectedRefund.id }));
      handleCloseModal();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || t("admin.payments.refund.toast.approveFailed"));
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;
    if (!rejectionReason.trim()) {
      toast.error(t("admin.payments.refund.toast.reasonRequired"));
      return;
    }
    try {
      await rejectRefund({
        refundId: selectedRefund.id,
        rejectionReason: rejectionReason.trim(),
      }).unwrap();
      toast.success(t("admin.payments.refund.toast.rejected", { id: selectedRefund.id }));
      handleCloseModal();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || t("admin.payments.refund.toast.rejectFailed"));
    }
  };

  const pageData = data?.data;
  const refunds = pageData?.content ?? [];

  // Tạo URL VietQR
  const getVietQrUrl = (refund: AdminRefund) => {
    if (!refund.bankCode || !refund.accountNumber) return null;
    const addInfo = encodeURIComponent(
      `HOANTIEN ${refund.order?.orderCode || refund.id}`,
    );
    const accountName = refund.accountHolderName
      ? `&accountName=${encodeURIComponent(refund.accountHolderName)}`
      : "";
    return `https://img.vietqr.io/image/${refund.bankCode}-${refund.accountNumber}-compact2.png?amount=${refund.amount}&addInfo=${addInfo}${accountName}`;
  };

  const columns = [
    columnHelper.accessor("id", {
      header: t("admin.payments.refund.table.ticket"),
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-semibold text-sm">#{row.original.id}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {t("admin.payments.refund.table.paymentRef", { id: row.original.paymentId })}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("customer", {
      header: t("common.customer"),
      cell: ({ row }) => {
        const { customer } = row.original;
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {customer?.fullName || t("admin.orders.lookup.name")}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("orderId", {
      header: t("common.order"),
      cell: ({ row }) => {
        const { order, orderId } = row.original;
        if (!orderId) return <span className="text-xs">{EMPTY_VALUE}</span>;
        return (
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${orderId}`)}
            className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
          >
            {order?.orderCode ?? t("admin.orders.orderNumber", { id: orderId })}
            <ExternalLink className="h-3 w-3 inline opacity-60" />
          </button>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: t("admin.payments.refund.table.amount"),
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.original.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("admin.payments.refund.table.original", {
              amount: formatCurrency(row.original.paymentAmount),
            })}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("accountNumber", {
      header: t("admin.payments.refund.table.account"),
      cell: ({ row }) => {
        const { bankName, bankCode, accountNumber, accountHolderName } = row.original;
        if (!accountNumber) {
          return (
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
              {t("admin.payments.refund.table.noAccount")}
            </span>
          );
        }
        return (
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[160px]">{bankName || bankCode}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono font-semibold">{accountNumber}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="uppercase font-medium">{accountHolderName || EMPTY_VALUE}</span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: t("common.status"),
      cell: ({ row }) => (
        <div className="space-y-1">
          <MetaBadge meta={refundStatusMeta(row.original.status)} />
          {row.original.bankTransferRef && (
            <p className="text-[10px] text-muted-foreground font-mono">
              {t("admin.payments.refund.table.transferRef", {
                ref: row.original.bankTransferRef,
              })}
            </p>
          )}
          {row.original.rejectionReason && (
            <p className="text-[11px] text-rose-600 max-w-[140px] truncate" title={row.original.rejectionReason}>
              {t("admin.payments.refund.table.rejectionReason", {
                reason: row.original.rejectionReason,
              })}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("reason", {
      header: t("admin.payments.refund.table.reason"),
      cell: ({ row }) => (
        <p className="text-xs text-foreground/80 max-w-[180px] line-clamp-2" title={row.original.reason ?? ""}>
          {row.original.reason ?? EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("requestedAt", {
      header: t("common.time"),
      cell: ({ row }) => (
        <div className="whitespace-nowrap font-mono text-xs">
          <div className="flex items-center gap-1 text-foreground/80">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <span>{formatDateTime(row.original.requestedAt)}</span>
          </div>
          {row.original.processedAt && (
            <p className="text-[11px] text-muted-foreground">
              {t("admin.payments.refund.table.processedAt", {
                time: formatDateTime(row.original.processedAt),
              })}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => (
        <span className="text-right block">{t("admin.payments.actionsHeader")}</span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        if (item.status === "PENDING") {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
                onClick={() => handleOpenAction(item, "APPROVE")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {t("admin.payments.refund.table.approve")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                onClick={() => handleOpenAction(item, "REJECT")}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                {t("dropdown.reject")}
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleOpenAction(item, "DETAIL")}
            >
              {t("button.detail")}
            </Button>
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4">
      {/* Thanh lọc trạng thái và thời gian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatusChange(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <DateRangeFilter value={range} onChange={handleRangeChange} allowEmpty />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t("admin.payments.refund.dateHint")}{" "}
        {isFetching
          ? t("common.loadingEllipsis")
          : t("admin.payments.refund.count", {
              total: formatNumber(pageData?.totalElements ?? 0),
            })}
      </p>

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <DataTable
        columns={columns}
        data={refunds}
        isLoading={isLoading}
        emptyMessage={t("admin.payments.refund.empty")}
        serverPagination={{
          pageIndex: page,
          pageSize,
          pageCount: pageData?.totalPages ?? 0,
          totalRows: pageData?.totalElements ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(0);
          },
        }}
      />

      {/* Modal Duyệt & Chuyển khoản hoàn tiền */}
      <Dialog
        open={actionType === "APPROVE" && !!selectedRefund}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              {t("admin.payments.refund.approve.title")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.payments.refund.approve.description")}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-3.5 py-1">
              {/* VietQR Code */}
              {getVietQrUrl(selectedRefund) ? (
                <div className="flex flex-col items-center justify-center p-3 bg-muted/30 border rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <QrCode className="h-4 w-4" />
                    <span>{t("admin.payments.refund.approve.scanQr")}</span>
                  </div>
                  <img
                    src={getVietQrUrl(selectedRefund)!}
                    alt="VietQR Transfer"
                    className="w-48 h-auto object-contain rounded-md shadow-sm border bg-white"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                    {t("admin.payments.refund.approve.transferContent", {
                      content: `HOANTIEN ${selectedRefund.order?.orderCode || selectedRefund.id}`,
                    })}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{t("admin.payments.refund.approve.missingBank")}</span>
                </div>
              )}

              {/* Thông tin tài khoản */}
              <div className="bg-muted/60 p-3 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.refund.approve.refundId")}:</span>
                  <span className="font-mono font-semibold">#{selectedRefund.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.refund.table.amount")}:</span>
                  <span className="font-mono font-bold text-sm text-emerald-600">
                    {formatCurrency(selectedRefund.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.bank.bank")}:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRefund.bankName || selectedRefund.bankCode || t("admin.payments.bank.none")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.bank.accountNumber")}:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedRefund.accountNumber || t("admin.payments.bank.none")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.bank.accountHolder")}:</span>
                  <span className="font-semibold uppercase tracking-wide text-foreground">
                    {selectedRefund.accountHolderName || t("admin.payments.bank.none")}
                  </span>
                </div>
              </div>

              {/* Mã tham chiếu chuyển khoản */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("admin.payments.refund.approve.transferRefLabel")}{" "}
                  {transferRefRequired ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    t("admin.payments.optional")
                  )}
                  :
                </label>
                <Input
                  placeholder={t("admin.payments.refund.approve.transferRefPlaceholder")}
                  value={bankTransferRef}
                  onChange={(e) => setBankTransferRef(e.target.value)}
                  className="text-xs font-mono"
                />
                {transferRefRequired && (
                  <p className="text-[11px] text-muted-foreground">
                    {t("admin.payments.refund.approve.transferRefRequiredHint")}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <Trans
                    i18nKey="admin.payments.refund.approve.warning"
                    components={{ b: <strong /> }}
                  />
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isApproving}
            >
              {t("button.cancel")}
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={isApproving || transferRefMissing}
            >
              {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("admin.payments.refund.approve.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Từ chối hoàn tiền */}
      <Dialog
        open={actionType === "REJECT" && !!selectedRefund}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              {t("admin.payments.refund.reject.title")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.payments.refund.reject.description")}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-3 py-1">
              <div className="bg-muted/60 p-3 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.refund.table.ticket")}:</span>
                  <span className="font-mono font-semibold">#{selectedRefund.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.refund.reject.requestedAmount")}:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(selectedRefund.amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("admin.payments.rejectionReason")} <span className="text-rose-500">*</span>:
                </label>
                <Textarea
                  placeholder={t("admin.payments.refund.reject.placeholder")}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isRejecting}
            >
              {t("button.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("admin.payments.refund.reject.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Xem chi tiết (khi đã hoàn hoặc bị từ chối) */}
      <Dialog
        open={actionType === "DETAIL" && !!selectedRefund}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("admin.payments.refund.detail.title", { id: selectedRefund?.id ?? "" })}
            </DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-3 py-1 text-xs">
              <div className="bg-muted/60 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.status")}:</span>
                  <MetaBadge meta={refundStatusMeta(selectedRefund.status)} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.refund.table.amount")}:</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {formatCurrency(selectedRefund.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.refund.detail.receivingBank")}:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRefund.bankName} ({selectedRefund.bankCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.bank.accountNumber")}:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedRefund.accountNumber || EMPTY_VALUE}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.bank.accountHolder")}:</span>
                  <span className="font-semibold uppercase text-foreground">
                    {selectedRefund.accountHolderName || EMPTY_VALUE}
                  </span>
                </div>
                {selectedRefund.bankTransferRef && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("admin.payments.refund.detail.transferRef")}:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {selectedRefund.bankTransferRef}
                    </span>
                  </div>
                )}
                {selectedRefund.rejectionReason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("admin.payments.rejectionReason")}:</span>
                    <span className="text-rose-600 font-medium">
                      {selectedRefund.rejectionReason}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("admin.payments.refund.detail.originalReason")}:</span>
                  <span className="text-foreground">{selectedRefund.reason || EMPTY_VALUE}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              {t("button.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


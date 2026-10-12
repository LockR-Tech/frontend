import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
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
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Download,
  Trash2,
  Eye,
  FileText,
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
import { useImageUpload } from "~/hooks/useImageUpload";
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
import { Badge } from "~/components/ui/badge";

const columnHelper = createColumnHelper<AdminRefund>();

/** Trích xuất URL ảnh minh chứng khách hàng: ưu tiên customerAttachmentUrl, fallback parse từ reason */
export const getCustomerAttachment = (r?: AdminRefund | null): string | null => {
  if (!r) return null;
  if (r.customerAttachmentUrl && r.customerAttachmentUrl.trim().length > 0) {
    return r.customerAttachmentUrl;
  }
  if (r.reason) {
    const match = r.reason.match(/\[Ảnh minh chứng:\s*(https?:\/\/[^\s\]]+|data:image\/[^;]+;base64,[^\s\]]+)\]/i);
    if (match && match[1]) return match[1];
  }
  return null;
};

/** Tách bỏ phần URL ảnh đính kèm trong nội dung lý do để hiển thị văn bản sạch */
export const cleanReason = (reason?: string | null): string => {
  if (!reason) return "";
  return reason.replace(/\s*\[Ảnh minh chứng:\s*(https?:\/\/[^\s\]]+|data:image\/[^;]+;base64,[^\s\]]+)\]/gi, "").trim();
};

/** Trích xuất URL ảnh UNC từ admin: ưu tiên proofImageUrl, fallback parse từ bankTransferRef */
export const getAdminProof = (r?: AdminRefund | null): string | null => {
  if (!r) return null;
  if (r.proofImageUrl && r.proofImageUrl.trim().length > 0) return r.proofImageUrl;
  if (r.bankTransferRef) {
    const match = r.bankTransferRef.match(/https?:\/\/[^\s|]+/i);
    if (match) return match[0];
  }
  return null;
};

/** Tách bỏ URL ảnh trong mã giao dịch để hiển thị mã GD thuần */
export const cleanTransferRef = (ref?: string | null): string => {
  if (!ref) return "";
  return ref.replace(/\s*\|\s*https?:\/\/[^\s|]+/gi, "").replace(/https?:\/\/[^\s|]+/gi, "").trim();
};

/** Quy tắc payment-service: bật thì backend từ chối duyệt hoàn (TRANSFER_REF_REQUIRED) khi thiếu mã GD. */
const REQUIRE_TRANSFER_REF_KEY = "app.payment.refund-require-transfer-ref";

const STATUS_TABS = [
  { key: "ALL", labelKey: "common.all" },
  { key: "PENDING", labelKey: "admin.payments.review.pending" },
  { key: "COMPLETED", labelKey: "admin.payments.refund.status.completed" },
  { key: "REJECTED", labelKey: "admin.payments.review.rejected" },
] as const;

interface RefundTableProps {
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  pendingCount?: number;
}

export function RefundTable({
  statusFilter: controlledStatus,
  onStatusFilterChange,
  pendingCount,
}: RefundTableProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [internalStatus, setInternalStatus] = useState<string>("ALL");
  const [range, setRange] = useState({ from: "", to: "" });

  const statusFilter = controlledStatus ?? internalStatus;

  useEffect(() => {
    setPage(0);
  }, [controlledStatus]);

  // State cho Modal Duyệt / Từ chối / Chi tiết
  const [selectedRefund, setSelectedRefund] = useState<AdminRefund | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "DETAIL" | null>(null);
  const [bankTransferRef, setBankTransferRef] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Quản lý ảnh minh chứng chuyển khoản khi duyệt
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading: isCloudinaryUploading } = useImageUpload("REPORT_EVIDENCE");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const [approveRefund] = useApproveRefundMutation();
  const [rejectRefund, { isLoading: isRejecting }] = useRejectRefundMutation();

  const queryParams = useMemo(
    () => ({
      page,
      size: pageSize,
      sort: "requestedAt,desc",
      ...(statusFilter !== "ALL" ? { status: [statusFilter] } : {}),
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
    }),
    [page, pageSize, statusFilter, range],
  );

  const { data, isLoading, isFetching, error, refetch } = useGetAdminRefundsQuery(queryParams, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const proofMissing = !proofFile;

  // Đọc thiết lập hệ thống về mã giao dịch
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
    if (onStatusFilterChange) {
      onStatusFilterChange(status);
    } else {
      setInternalStatus(status);
    }
    setPage(0);
  };

  const handleOpenAction = (refund: AdminRefund, type: "APPROVE" | "REJECT" | "DETAIL") => {
    setSelectedRefund(refund);
    setActionType(type);
    setBankTransferRef("");
    setRejectionReason("");
    setProofFile(null);
    setProofPreviewUrl(null);
  };

  const handleCloseModal = () => {
    setSelectedRefund(null);
    setActionType(null);
    setBankTransferRef("");
    setRejectionReason("");
    if (proofPreviewUrl && proofPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(proofPreviewUrl);
    }
    setProofFile(null);
    setProofPreviewUrl(null);
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(t("common.copied", `Đã sao chép: ${text}`));
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Xử lý chọn ảnh minh chứng chuyển khoản
  const handleProofFileChange = (file: File | undefined) => {
    if (!file) return;
    if (proofPreviewUrl && proofPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(proofPreviewUrl);
    }
    setProofFile(file);
    setProofPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveProofFile = () => {
    if (proofPreviewUrl && proofPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(proofPreviewUrl);
    }
    setProofFile(null);
    setProofPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleApprove = async () => {
    if (!selectedRefund) return;
    if (proofMissing) {
      toast.error("Vui lòng tải ảnh minh chứng chuyển khoản (Biên lai / UNC) trước khi xác nhận");
      return;
    }
    if (transferRefMissing) {
      toast.error(t("admin.payments.refund.toast.transferRefRequired", "Vui lòng nhập mã giao dịch ngân hàng / UNC"));
      return;
    }

    setIsSubmittingApproval(true);
    let finalProofImageUrl: string | undefined = undefined;

    try {
      // 1. Tải ảnh lên Cloudinary nếu có chọn ảnh
      if (proofFile) {
        try {
          const uploaded = await upload([proofFile]);
          finalProofImageUrl = uploaded[0]?.secureUrl;
        } catch (uploadErr) {
          // Fallback nếu Cloudinary bị tắt ở môi trường local
          console.warn("Cloudinary upload fallback to data URL:", uploadErr);
          finalProofImageUrl = await fileToDataUrl(proofFile);
        }
      }

      // 2. Chuẩn bị bankTransferRef: ghim link ảnh vào nếu <= 100 ký tự để DB máy chủ live luôn lưu được 100%
      let submitTransferRef = bankTransferRef.trim();
      if (finalProofImageUrl) {
        const combined = submitTransferRef
          ? `${submitTransferRef} | ${finalProofImageUrl}`
          : finalProofImageUrl;
        if (combined.length <= 100) {
          submitTransferRef = combined;
        } else if (finalProofImageUrl.length <= 100) {
          submitTransferRef = finalProofImageUrl;
        }
      }

      // 3. Gửi API duyệt hoàn tiền
      await approveRefund({
        refundId: selectedRefund.id,
        bankTransferRef: submitTransferRef || undefined,
        proofImageUrl: finalProofImageUrl,
      }).unwrap();

      toast.success(t("admin.payments.refund.toast.approved", { id: selectedRefund.id }));
      handleCloseModal();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || t("admin.payments.refund.toast.approveFailed", "Không thể duyệt hoàn tiền"));
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;
    if (!rejectionReason.trim()) {
      toast.error(t("admin.payments.refund.toast.reasonRequired", "Vui lòng nhập lý do từ chối"));
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
      toast.error(err?.data?.message || t("admin.payments.refund.toast.rejectFailed", "Từ chối hoàn tiền thất bại"));
    }
  };

  const pageData = data?.data;
  const refunds = pageData?.content ?? [];

  // Tạo URL VietQR chuẩn
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
      header: t("admin.payments.refund.table.ticket", "Mã phiếu"),
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
      header: t("common.customer", "Khách hàng"),
      cell: ({ row }) => {
        const { customer } = row.original;
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {customer?.fullName || t("admin.orders.lookup.name", "Khách vãng lai")}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("orderId", {
      header: t("common.order", "Đơn hàng"),
      cell: ({ row }) => {
        const { order, orderId } = row.original;
        if (!orderId) return <span className="text-xs">{EMPTY_VALUE}</span>;
        return (
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${orderId}`)}
            className="font-mono text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            title="Xem chi tiết đơn hàng"
          >
            {order?.orderCode ?? t("admin.orders.orderNumber", { id: orderId })}
            <ExternalLink className="h-3 w-3 inline opacity-60" />
          </button>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: t("admin.payments.refund.table.amount", "Số tiền hoàn"),
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(row.original.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {t("admin.payments.refund.table.original", {
              amount: formatCurrency(row.original.paymentAmount),
            })}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("accountNumber", {
      header: t("admin.payments.refund.table.account", "Tài khoản nhận"),
      cell: ({ row }) => {
        const { bankName, bankCode, accountNumber, accountHolderName } = row.original;
        if (!accountNumber) {
          return (
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded font-medium">
              {t("admin.payments.refund.table.noAccount", "Chưa có STK")}
            </span>
          );
        }
        return (
          <div className="space-y-0.5 text-xs min-w-[160px]">
            <div className="flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[150px]">{bankName || bankCode}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono font-semibold">{accountNumber}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="uppercase font-medium truncate max-w-[150px]">
                {accountHolderName || EMPTY_VALUE}
              </span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: t("common.status", "Trạng thái"),
      cell: ({ row }) => (
        <div className="space-y-1">
          <MetaBadge meta={refundStatusMeta(row.original.status)} />
          {cleanTransferRef(row.original.bankTransferRef) && (
            <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <span>Mã GD:</span>
              <span className="font-semibold">{cleanTransferRef(row.original.bankTransferRef)}</span>
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
    columnHelper.display({
      id: "evidence",
      header: "Minh chứng",
      cell: ({ row }) => {
        const customerImg = getCustomerAttachment(row.original);
        const adminImg = getAdminProof(row.original);
        if (!customerImg && !adminImg) return <span className="text-xs text-muted-foreground/60">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            {customerImg && (
              <button
                type="button"
                onClick={() => setViewingProofUrl(customerImg)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all text-[11px] font-medium"
                title="Ảnh từ khách hàng"
              >
                <ImageIcon className="h-3 w-3" />
                <span>Khách</span>
              </button>
            )}
            {adminImg && (
              <button
                type="button"
                onClick={() => setViewingProofUrl(adminImg)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all text-[11px] font-medium"
                title="Biên lai chuyển khoản (UNC)"
              >
                <ImageIcon className="h-3 w-3" />
                <span>UNC</span>
              </button>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("reason", {
      header: t("admin.payments.refund.table.reason", "Lý do"),
      cell: ({ row }) => {
        const text = cleanReason(row.original.reason);
        return (
          <p className="text-xs text-foreground/80 max-w-[160px] line-clamp-2" title={text}>
            {text || EMPTY_VALUE}
          </p>
        );
      },
    }),
    columnHelper.accessor("requestedAt", {
      header: t("common.time", "Thời gian"),
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
        <span className="text-right block">{t("admin.payments.actionsHeader", "Thao tác")}</span>
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
                className="h-7 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 font-medium"
                onClick={() => handleOpenAction(item, "APPROVE")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {t("admin.payments.refund.table.approve", "Duyệt")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950 font-medium"
                onClick={() => handleOpenAction(item, "REJECT")}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                {t("dropdown.reject", "Từ chối")}
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
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium"
              onClick={() => handleOpenAction(item, "DETAIL")}
            >
              {t("button.detail", "Chi tiết")}
            </Button>
          </div>
        );
      },
    }),
  ];

  const qrUrl = selectedRefund ? getVietQrUrl(selectedRefund) : null;
  const transferContent = selectedRefund
    ? `HOANTIEN ${selectedRefund.order?.orderCode || selectedRefund.id}`
    : "";

  return (
    <div className="space-y-4">
      {/* Thanh lọc trạng thái và thời gian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
          {STATUS_TABS.map((tab) => {
            const isTabActive = statusFilter === tab.key;
            const showBadge = tab.key === "PENDING" && typeof pendingCount === "number" && pendingCount > 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isTabActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{t(tab.labelKey)}</span>
                {showBadge && (
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isTabActive
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
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

      {/* ========================================================================= */}
      {/* MODAL DUYỆT & CHUYỂN KHOẢN HOÀN TIỀN (Chia 2 phần: Trái & Phải) */}
      {/* ========================================================================= */}
      <Dialog
        open={actionType === "APPROVE" && !!selectedRefund}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-emerald-600 text-lg">
              <CheckCircle2 className="h-5 w-5" />
              {t("admin.payments.refund.approve.title", "Duyệt & Xác nhận chuyển khoản hoàn tiền")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t(
                "admin.payments.refund.approve.description",
                "Quét mã QR ngân hàng để chuyển khoản, sau đó tải ảnh biên lai minh chứng trước khi xác nhận hoàn tất.",
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-2">
              {/* PHẦN BÊN TRÁI (7 CỘT): Thông tin STK, Chi tiết đơn hàng, Lý do & Tải ảnh minh chứng */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Thông tin STK của customer */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Thông tin tài khoản nhận tiền
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Phiếu #{selectedRefund.id}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-lg border border-border/40">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-muted-foreground">Ngân hàng:</span>
                      <p className="font-semibold text-foreground">
                        {selectedRefund.bankName || selectedRefund.bankCode || "Chưa cập nhật"}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-muted-foreground">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground">
                          {selectedRefund.accountNumber || "Chưa có"}
                        </span>
                        {selectedRefund.accountNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedRefund.accountNumber!, "acc")}
                            className="text-muted-foreground hover:text-foreground"
                            title="Sao chép STK"
                          >
                            {copiedKey === "acc" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5 sm:col-span-2 pt-1 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground">Tên chủ tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase tracking-wider text-foreground">
                          {selectedRefund.accountHolderName || "Chưa cập nhật"}
                        </span>
                        {selectedRefund.accountHolderName && (
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedRefund.accountHolderName!, "holder")}
                            className="text-muted-foreground hover:text-foreground"
                            title="Sao chép tên chủ tài khoản"
                          >
                            {copiedKey === "holder" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Nội dung customer yêu cầu hoàn tiền cho đơn nào & lý do */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Thông tin đơn hàng & Lý do hoàn
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Đơn hàng cần hoàn:</span>
                      {selectedRefund.orderId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/orders/${selectedRefund.orderId}`)}
                          className="font-mono text-primary font-semibold hover:underline flex items-center gap-1"
                        >
                          {selectedRefund.order?.orderCode ?? `#${selectedRefund.orderId}`}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="font-mono">{EMPTY_VALUE}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Số tiền đơn gốc đã thanh toán:</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(selectedRefund.paymentAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Số tiền yêu cầu hoàn:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(selectedRefund.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedRefund.amount.toString(), "amount")}
                          className="text-muted-foreground hover:text-foreground"
                          title="Sao chép số tiền"
                        >
                          {copiedKey === "amount" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1 space-y-1">
                      <span className="text-muted-foreground">Lý do yêu cầu từ khách:</span>
                      <p className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-foreground/90 italic leading-relaxed">
                        {cleanReason(selectedRefund.reason) ? `"${cleanReason(selectedRefund.reason)}"` : "Không có ghi chú lý do"}
                      </p>
                    </div>

                    {getCustomerAttachment(selectedRefund) && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-muted-foreground flex items-center justify-between">
                          <span className="font-medium text-foreground flex items-center gap-1 text-blue-600">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Hình ảnh đính kèm từ khách:
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingProofUrl(getCustomerAttachment(selectedRefund)!)}
                            className="text-primary hover:underline text-[11px] flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Phóng to
                          </button>
                        </span>
                        <div
                          className="relative rounded-lg overflow-hidden border border-border/60 bg-muted/30 cursor-pointer group max-h-44 flex items-center justify-center p-1"
                          onClick={() => setViewingProofUrl(getCustomerAttachment(selectedRefund)!)}
                        >
                          <img
                            src={getCustomerAttachment(selectedRefund)!}
                            alt="Ảnh đính kèm từ khách hàng"
                            className="w-full h-auto max-h-44 object-contain rounded group-hover:scale-105 transition-transform"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Nhập Mã tham chiếu giao dịch ngân hàng / UNC */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>
                      {t("admin.payments.refund.approve.transferRefLabel", "Mã giao dịch / UNC ngân hàng")}
                      {transferRefRequired ? (
                        <span className="text-rose-500 ml-0.5">*</span>
                      ) : (
                        <span className="text-muted-foreground font-normal ml-1">({t("admin.payments.optional", "tuỳ chọn")})</span>
                      )}
                    </span>
                  </label>
                  <Input
                    placeholder="Ví dụ: FT24100712345678 hoặc mã tham chiếu chuyển tiền"
                    value={bankTransferRef}
                    onChange={(e) => setBankTransferRef(e.target.value)}
                    className="text-xs font-mono h-9"
                  />
                  {transferRefRequired && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("admin.payments.refund.approve.transferRefRequiredHint", "Bắt buộc nhập mã tham chiếu giao dịch chuyển khoản theo quy tắc hệ thống.")}
                    </p>
                  )}
                </div>

                {/* 4. Tải ảnh minh chứng chuyển khoản */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      Ảnh minh chứng chuyển khoản (Biên lai / UNC)
                      <span className="text-rose-500 font-bold">*</span>:
                    </span>
                    <span className="text-[11px] font-medium text-rose-500">Bắt buộc tải ảnh</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleProofFileChange(e.target.files?.[0])}
                  />

                  {proofPreviewUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 p-2 flex items-center gap-3">
                      <img
                        src={proofPreviewUrl}
                        alt="Minh chứng chuyển khoản"
                        className="w-20 h-20 object-cover rounded-lg border bg-white shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewingProofUrl(proofPreviewUrl)}
                        title="Bấm để xem ảnh to"
                      />
                      <div className="min-w-0 flex-1 space-y-1 text-xs">
                        <p className="font-medium text-foreground truncate">
                          {proofFile?.name || "Ảnh minh chứng chuyển khoản"}
                        </p>
                        <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã chọn ảnh thành công
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Đổi ảnh khác
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={handleRemoveProofFile}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 rounded-xl p-4 text-center cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Bấm vào đây để tải ảnh biên lai / ảnh chụp màn hình chuyển khoản
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Hỗ trợ định dạng JPG, PNG, WebP (Tối đa 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* PHẦN BÊN PHẢI (5 CỘT): Mã QR Code ngân hàng (VietQR) quét chuyển khoản */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-muted/20 border border-border/80 rounded-xl p-4">
                <div className="space-y-3">
                  <div className="text-center space-y-1">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center justify-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      Mã thanh toán VietQR
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Mở app ngân hàng bất kỳ để quét mã tự động điền STK & số tiền
                    </p>
                  </div>

                  {qrUrl ? (
                    <div className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-card border border-border/80 rounded-xl shadow-xs space-y-2">
                      <img
                        src={qrUrl}
                        alt="VietQR Transfer"
                        className="w-52 h-auto object-contain rounded-lg"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Mở ảnh QR lớn
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs flex items-center gap-2.5">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                      <span>Khách hàng chưa cập nhật mã ngân hàng/STK đầy đủ. Vui lòng kiểm tra lại.</span>
                    </div>
                  )}

                  {/* Bảng cú pháp sao chép nhanh */}
                  <div className="bg-card border border-border/80 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground">
                          {transferContent}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(transferContent, "content")}
                          className="text-muted-foreground hover:text-foreground"
                          title="Sao chép nội dung"
                        >
                          {copiedKey === "content" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">Số tiền CK:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-600">
                          {formatCurrency(selectedRefund.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedRefund.amount.toString(), "amount2")}
                          className="text-muted-foreground hover:text-foreground"
                          title="Sao chép số tiền"
                        >
                          {copiedKey === "amount2" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cảnh báo hành động */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="leading-relaxed text-[11px]">
                    Hành động này sẽ cập nhật đơn hàng thành <strong>ĐÃ HOÀN TIỀN</strong> và gửi thông báo kèm ảnh minh chứng chuyển khoản tới khách hàng.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmittingApproval || isCloudinaryUploading}
            >
              {t("button.cancel", "Hủy")}
            </Button>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {proofMissing && (
                <span className="text-[11px] text-rose-500 font-medium">
                  * Cần tải ảnh biên lai / UNC trước khi xác nhận
                </span>
              )}
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleApprove}
                disabled={isSubmittingApproval || isCloudinaryUploading || transferRefMissing || proofMissing}
              >
                {(isSubmittingApproval || isCloudinaryUploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("admin.payments.refund.approve.confirm", "Xác nhận đã chuyển tiền")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL TỪ CHỐI HOÀN TIỀN */}
      {/* ========================================================================= */}
      <Dialog
        open={actionType === "REJECT" && !!selectedRefund}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              {t("admin.payments.refund.reject.title", "Từ chối yêu cầu hoàn tiền")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.payments.refund.reject.description", "Nhập lý do từ chối để thông báo cho khách hàng.")}
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
                  {t("admin.payments.rejectionReason", "Lý do từ chối")} <span className="text-rose-500">*</span>:
                </label>
                <Textarea
                  placeholder={t("admin.payments.refund.reject.placeholder", "Nhập lý do chi tiết...")}
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
              {t("button.cancel", "Hủy")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("admin.payments.refund.reject.confirm", "Xác nhận từ chối")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL XEM CHI TIẾT HOÀN TIỀN (Kèm ảnh minh chứng nếu có) */}
      {/* ========================================================================= */}
      <Dialog
        open={actionType === "DETAIL" && !!selectedRefund}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("admin.payments.refund.detail.title", { id: selectedRefund?.id ?? "" })}
            </DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-3.5 py-1 text-xs">
              <div className="bg-muted/60 p-3.5 rounded-xl space-y-2.5 border border-border/60">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("common.status")}:</span>
                  <MetaBadge meta={refundStatusMeta(selectedRefund.status)} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedRefund.order?.orderCode || (selectedRefund.orderId ? `#${selectedRefund.orderId}` : EMPTY_VALUE)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã giao dịch hoàn:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedRefund.transactionId || `RF-${selectedRefund.id}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Khách hàng:</span>
                  <span className="font-medium text-foreground">
                    {selectedRefund.customer?.fullName || EMPTY_VALUE} {selectedRefund.customer?.phone ? `(${selectedRefund.customer.phone})` : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("admin.payments.refund.table.amount")}:</span>
                  <span className="font-mono font-bold text-base text-emerald-600">
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
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã GD ngân hàng / UNC:</span>
                  {cleanTransferRef(selectedRefund.bankTransferRef) ? (
                    <span className="font-mono font-bold text-emerald-600">
                      {cleanTransferRef(selectedRefund.bankTransferRef)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">Chưa có mã UNC</span>
                  )}
                </div>
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
                  <span className="text-foreground max-w-[260px] text-right">{cleanReason(selectedRefund.reason) || EMPTY_VALUE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thời gian yêu cầu:</span>
                  <span className="font-mono">{formatDateTime(selectedRefund.requestedAt)}</span>
                </div>
                {selectedRefund.processedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thời gian xử lý:</span>
                    <span className="font-mono">{formatDateTime(selectedRefund.processedAt)}</span>
                  </div>
                )}
              </div>

              {/* Ảnh đính kèm từ khách hàng (nếu có) */}
              {getCustomerAttachment(selectedRefund) ? (
                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/80">
                  <span className="font-semibold text-foreground flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Ảnh minh chứng từ khách hàng:
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewingProofUrl(getCustomerAttachment(selectedRefund)!)}
                      className="text-primary hover:underline text-[11px] flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Phóng to
                    </button>
                  </span>
                  <div className="relative rounded-lg overflow-hidden border border-border/60 bg-muted/30">
                    <img
                      src={getCustomerAttachment(selectedRefund)!}
                      alt="Ảnh minh chứng từ khách hàng"
                      className="w-full max-h-64 object-contain rounded-md bg-white cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setViewingProofUrl(getCustomerAttachment(selectedRefund)!)}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/40 text-muted-foreground text-center text-[11px] italic">
                  Khách hàng không đính kèm ảnh minh chứng sự cố
                </div>
              )}

              {/* Ảnh minh chứng chuyển khoản từ Admin (nếu có) */}
              {getAdminProof(selectedRefund) ? (
                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/80">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    Ảnh minh chứng chuyển khoản:
                  </span>
                  <div className="relative rounded-lg overflow-hidden border border-border/60 bg-muted/30">
                    <img
                      src={getAdminProof(selectedRefund)!}
                      alt="Ảnh minh chứng chuyển khoản"
                      className="w-full max-h-64 object-contain rounded-md bg-white cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setViewingProofUrl(getAdminProof(selectedRefund)!)}
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      asChild
                    >
                      <a href={getAdminProof(selectedRefund)!} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" /> Mở ảnh gốc
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/40 text-muted-foreground text-center text-[11px] italic">
                  Không có ảnh minh chứng chuyển khoản đính kèm
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              {t("button.close", "Đóng")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* LIGHTBOX XEM ẢNH MINH CHỨNG PHÓNG TO */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingProofUrl} onOpenChange={() => setViewingProofUrl(null)}>
        <DialogContent className="sm:max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Minh chứng chuyển khoản hoàn tiền
            </DialogTitle>
          </DialogHeader>
          {viewingProofUrl && (
            <div className="relative rounded-lg overflow-hidden border border-border bg-black/95 flex items-center justify-center min-h-[300px] max-h-[75vh]">
              <img
                src={viewingProofUrl}
                alt="Ảnh minh chứng"
                className="max-h-[72vh] w-auto max-w-full object-contain"
              />
            </div>
          )}
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              Minh chứng chuyển tiền ngân hàng đối soát
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setViewingProofUrl(null)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

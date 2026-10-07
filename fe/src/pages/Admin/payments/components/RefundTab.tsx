import { useCallback, useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
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

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ duyệt" },
  { key: "COMPLETED", label: "Đã hoàn" },
  { key: "REJECTED", label: "Từ chối" },
] as const;

/** Danh sách hoàn tiền của toàn hệ thống (`GET /api/admin/payments/refunds`, § 2.4). */
export function RefundTab() {
  const navigate = useNavigate();
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
      page,
      size: pageSize,
      sort: "requestedAt,desc",
      ...(statusFilter !== "ALL" ? { status: [statusFilter] } : {}),
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
    }),
    [page, pageSize, statusFilter, range],
  );

  const { data, isLoading, isFetching, error, refetch } = useGetAdminRefundsQuery(queryParams);

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
    try {
      await approveRefund({
        refundId: selectedRefund.id,
        bankTransferRef: bankTransferRef.trim() || undefined,
      }).unwrap();
      toast.success(`Đã xác nhận hoàn tiền cho phiếu #${selectedRefund.id}`);
      handleCloseModal();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Không thể duyệt hoàn tiền. Vui lòng thử lại!");
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;
    if (!rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối!");
      return;
    }
    try {
      await rejectRefund({
        refundId: selectedRefund.id,
        rejectionReason: rejectionReason.trim(),
      }).unwrap();
      toast.success(`Đã từ chối hoàn tiền cho phiếu #${selectedRefund.id}`);
      handleCloseModal();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Không thể từ chối yêu cầu. Vui lòng thử lại!");
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
      header: "Phiếu hoàn",
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-semibold text-sm">#{row.original.id}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            GD #{row.original.paymentId}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("customer", {
      header: "Khách hàng",
      cell: ({ row }) => {
        const { customer } = row.original;
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {customer?.fullName || "Chưa tra được tên"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {customer?.phoneNumber || EMPTY_VALUE}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("orderId", {
      header: "Đơn hàng",
      cell: ({ row }) => {
        const { order, orderId } = row.original;
        if (!orderId) return <span className="text-xs">{EMPTY_VALUE}</span>;
        return (
          <button
            type="button"
            onClick={() => navigate(`/admin/orders/${orderId}`)}
            className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
          >
            {order?.orderCode ?? `Đơn #${orderId}`}
            <ExternalLink className="h-3 w-3 inline opacity-60" />
          </button>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: "Số tiền hoàn",
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.original.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Gốc: {formatCurrency(row.original.paymentAmount)}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("accountNumber", {
      header: "TK nhận hoàn tiền",
      cell: ({ row }) => {
        const { bankName, bankCode, accountNumber, accountHolderName } = row.original;
        if (!accountNumber) {
          return (
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
              Chưa có STK
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
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="space-y-1">
          <MetaBadge meta={refundStatusMeta(row.original.status)} />
          {row.original.bankTransferRef && (
            <p className="text-[10px] text-muted-foreground font-mono">
              Mã: {row.original.bankTransferRef}
            </p>
          )}
          {row.original.rejectionReason && (
            <p className="text-[11px] text-rose-600 max-w-[140px] truncate" title={row.original.rejectionReason}>
              Lý do: {row.original.rejectionReason}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("reason", {
      header: "Lý do hoàn",
      cell: ({ row }) => (
        <p className="text-xs text-foreground/80 max-w-[180px] line-clamp-2" title={row.original.reason ?? ""}>
          {row.original.reason ?? EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("requestedAt", {
      header: "Thời gian",
      cell: ({ row }) => (
        <div className="whitespace-nowrap font-mono text-xs">
          <div className="flex items-center gap-1 text-foreground/80">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <span>{formatDateTime(row.original.requestedAt)}</span>
          </div>
          {row.original.processedAt && (
            <p className="text-[11px] text-muted-foreground">
              Xử lý: {formatDateTime(row.original.processedAt)}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="text-right block">Hành động</span>,
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
                Duyệt & CK
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                onClick={() => handleOpenAction(item, "REJECT")}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Từ chối
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
              Chi tiết
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
              {tab.label}
            </button>
          ))}
        </div>

        <DateRangeFilter value={range} onChange={handleRangeChange} allowEmpty />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Khoảng ngày lọc theo thời điểm yêu cầu hoàn.{" "}
        {isFetching
          ? "Đang tải…"
          : `${formatNumber(pageData?.totalElements ?? 0)} phiếu hoàn.`}
      </p>

      {error && <ReportErrorState error={error} onRetry={refetch} />}

      <DataTable
        columns={columns}
        data={refunds}
        isLoading={isLoading}
        emptyMessage="Chưa có phiếu hoàn tiền nào"
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
              Duyệt & Xác nhận chuyển khoản hoàn tiền
            </DialogTitle>
            <DialogDescription>
              Vui lòng quét mã VietQR hoặc chuyển khoản đến số tài khoản dưới đây trước khi xác nhận:
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-3.5 py-1">
              {/* VietQR Code */}
              {getVietQrUrl(selectedRefund) ? (
                <div className="flex flex-col items-center justify-center p-3 bg-muted/30 border rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <QrCode className="h-4 w-4" />
                    <span>Quét mã VietQR bằng app ngân hàng bất kỳ</span>
                  </div>
                  <img
                    src={getVietQrUrl(selectedRefund)!}
                    alt="VietQR Transfer"
                    className="w-48 h-auto object-contain rounded-md shadow-sm border bg-white"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                    Nội dung: HOANTIEN {selectedRefund.order?.orderCode || selectedRefund.id}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Khách hàng chưa cập nhật mã ngân hàng/STK đầy đủ. Vui lòng kiểm tra lại.</span>
                </div>
              )}

              {/* Thông tin tài khoản */}
              <div className="bg-muted/60 p-3 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mã phiếu hoàn:</span>
                  <span className="font-mono font-semibold">#{selectedRefund.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền hoàn:</span>
                  <span className="font-mono font-bold text-sm text-emerald-600">
                    {formatCurrency(selectedRefund.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRefund.bankName || selectedRefund.bankCode || "Chưa có"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedRefund.accountNumber || "Chưa có"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-semibold uppercase tracking-wide text-foreground">
                    {selectedRefund.accountHolderName || "Chưa có"}
                  </span>
                </div>
              </div>

              {/* Mã tham chiếu chuyển khoản */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mã giao dịch / UNC ngân hàng (tuỳ chọn):
                </label>
                <Input
                  placeholder="Ví dụ: FT24100712345678 hoặc mã tham chiếu chuyển tiền"
                  value={bankTransferRef}
                  onChange={(e) => setBankTransferRef(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Hành động này sẽ cập nhật đơn hàng thành <strong>ĐÃ HOÀN TIỀN</strong> và gửi thông báo cho khách hàng.
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
              Hủy
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận đã chuyển tiền
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
              Từ chối yêu cầu hoàn tiền
            </DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối để thông báo cho khách hàng.
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-3 py-1">
              <div className="bg-muted/60 p-3 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phiếu hoàn:</span>
                  <span className="font-mono font-semibold">#{selectedRefund.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền yêu cầu:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(selectedRefund.amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Lý do từ chối <span className="text-rose-500">*</span>:
                </label>
                <Textarea
                  placeholder="Ví dụ: Sai thông tin số tài khoản, đơn hàng đã được giao nhận thành công..."
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
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận từ chối
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
            <DialogTitle>Chi tiết phiếu hoàn #{selectedRefund?.id}</DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-3 py-1 text-xs">
              <div className="bg-muted/60 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <MetaBadge meta={refundStatusMeta(selectedRefund.status)} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền hoàn:</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {formatCurrency(selectedRefund.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng nhận:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRefund.bankName} ({selectedRefund.bankCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedRefund.accountNumber || EMPTY_VALUE}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-semibold uppercase text-foreground">
                    {selectedRefund.accountHolderName || EMPTY_VALUE}
                  </span>
                </div>
                {selectedRefund.bankTransferRef && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã GD chuyển tiền:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {selectedRefund.bankTransferRef}
                    </span>
                  </div>
                )}
                {selectedRefund.rejectionReason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lý do từ chối:</span>
                    <span className="text-rose-600 font-medium">
                      {selectedRefund.rejectionReason}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lý do hoàn gốc:</span>
                  <span className="text-foreground">{selectedRefund.reason || EMPTY_VALUE}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


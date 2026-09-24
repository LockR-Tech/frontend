import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  AlertTriangle,
  Building2,
  User,
  CreditCard,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetWithdrawalsQuery,
  useProcessWithdrawalMutation,
  type WithdrawalResponse,
} from "~/stores/apis/admin/wallet";
import { formatDateTime } from "~/lib/datetime";
import { formatCurrency } from "~/lib/report-format";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type StatusFilter = "ALL" | "PENDING" | "COMPLETED" | "REJECTED";

export function WithdrawalTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<WithdrawalResponse | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, isFetching, refetch } = useGetWithdrawalsQuery(
    statusFilter === "ALL" ? undefined : { status: statusFilter }
  );

  const [processWithdrawal, { isLoading: isProcessing }] = useProcessWithdrawalMutation();

  const withdrawals = data?.data ?? [];

  // Filter by search query
  const filteredWithdrawals = useMemo(() => {
    if (!searchTerm.trim()) return withdrawals;
    const term = searchTerm.toLowerCase();
    return withdrawals.filter(
      (w) =>
        w.referenceId?.toLowerCase().includes(term) ||
        w.accountNumber?.toLowerCase().includes(term) ||
        w.accountHolderName?.toLowerCase().includes(term) ||
        w.bankName?.toLowerCase().includes(term) ||
        w.bankCode?.toLowerCase().includes(term)
    );
  }, [withdrawals, searchTerm]);

  // Counts for tabs
  const pendingCount = useMemo(() => {
    return withdrawals.filter((w) => w.status === "PENDING").length;
  }, [withdrawals]);

  const handleOpenAction = (item: WithdrawalResponse, action: "APPROVE" | "REJECT") => {
    setSelectedItem(item);
    setActionType(action);
    setRejectionReason("");
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setActionType(null);
    setRejectionReason("");
  };

  const handleSubmitProcess = async () => {
    if (!selectedItem || !actionType) return;

    if (actionType === "REJECT" && !rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      await processWithdrawal({
        id: selectedItem.id,
        action: actionType,
        reason: actionType === "REJECT" ? rejectionReason.trim() : undefined,
      }).unwrap();

      if (actionType === "APPROVE") {
        toast.success(`Đã duyệt yêu cầu rút tiền #${selectedItem.referenceId}`);
      } else {
        toast.success(
          `Đã từ chối yêu cầu #${selectedItem.referenceId} và hoàn tiền về ví cho khách`
        );
      }
      handleCloseModal();
      refetch();
    } catch (err: any) {
      toast.error(
        err?.data?.message || "Không thể xử lý yêu cầu rút tiền. Vui lòng thử lại!"
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-600 font-medium text-xs px-2.5 py-0.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
            Chờ duyệt
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600 font-medium text-xs px-2.5 py-0.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            Đã chuyển
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-400 dark:border-rose-600 font-medium text-xs px-2.5 py-0.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
            Từ chối
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "ALL" ? "default" : "ghost"}
            className="text-xs h-8 px-3"
            onClick={() => setStatusFilter("ALL")}
          >
            Tất cả
          </Button>
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "PENDING" ? "default" : "ghost"}
            className="text-xs h-8 px-3 relative"
            onClick={() => setStatusFilter("PENDING")}
          >
            Chờ duyệt
            {pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "COMPLETED" ? "default" : "ghost"}
            className="text-xs h-8 px-3"
            onClick={() => setStatusFilter("COMPLETED")}
          >
            Đã chuyển
          </Button>
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "REJECTED" ? "default" : "ghost"}
            className="text-xs h-8 px-3"
            onClick={() => setStatusFilter("REJECTED")}
          >
            Từ chối
          </Button>
        </div>

        {/* Search input & Refresh button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm mã, tên, STK, ngân hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Làm mới"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${
                isFetching ? "animate-spin" : ""
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">Mã yêu cầu</TableHead>
              <TableHead className="w-[200px]">Tài khoản thụ hưởng</TableHead>
              <TableHead className="w-[130px] text-right">Số tiền rút</TableHead>
              <TableHead className="w-[120px] text-center">Trạng thái</TableHead>
              <TableHead className="w-[150px]">Thời gian</TableHead>
              <TableHead className="w-[180px]">Ghi chú / Lý do</TableHead>
              <TableHead className="w-[140px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang tải danh sách yêu cầu rút tiền...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredWithdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs">
                    <CreditCard className="h-6 w-6 opacity-40 mb-1" />
                    Không tìm thấy yêu cầu rút tiền nào
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredWithdrawals.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/40">
                  <TableCell>
                    <span className="font-mono font-semibold text-xs text-primary">
                      {item.referenceId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-xs">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{item.bankName}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ({item.bankCode})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono font-semibold text-foreground">
                          {item.accountNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="font-medium tracking-wide">
                          {item.accountHolderName}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs font-mono">
                      <div className="flex items-center gap-1 text-foreground/80">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      {item.processedAt && (
                        <p className="text-[11px] text-muted-foreground">
                          Duyệt: {formatDateTime(item.processedAt)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.rejectionReason ? (
                      <p className="text-xs text-rose-600 dark:text-rose-400 line-clamp-2">
                        {item.rejectionReason}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
                          onClick={() => handleOpenAction(item, "APPROVE")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Duyệt
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
                          onClick={() => handleOpenAction(item, "REJECT")}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Từ chối
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        Hoàn tất
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={actionType === "APPROVE" && !!selectedItem}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Xác nhận duyệt yêu cầu rút tiền
            </DialogTitle>
            <DialogDescription>
              Kiểm tra kỹ thông tin tài khoản và xác nhận đã thực hiện chuyển tiền thực tế:
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/60 p-3 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mã yêu cầu:</span>
                  <span className="font-mono font-semibold text-primary">
                    {selectedItem.referenceId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền rút:</span>
                  <span className="font-mono font-bold text-sm text-emerald-600">
                    {formatCurrency(selectedItem.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-semibold text-foreground">
                    {selectedItem.bankName} ({selectedItem.bankCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedItem.accountNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-semibold uppercase tracking-wide text-foreground">
                    {selectedItem.accountHolderName}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Hành động này sẽ đánh dấu giao dịch là <strong>ĐÃ CHUYỂN TIỀN</strong>{" "}
                  và không thể hoàn tác.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isProcessing}
            >
              Hủy
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmitProcess}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận đã chuyển & Duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={actionType === "REJECT" && !!selectedItem}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              Từ chối yêu cầu rút tiền
            </DialogTitle>
            <DialogDescription>
              Khi từ chối, hệ thống sẽ tự động hoàn trả số tiền rút về ví khách hàng.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/60 p-3 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mã yêu cầu:</span>
                  <span className="font-mono font-semibold">{selectedItem.referenceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền hoàn lại ví:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(selectedItem.amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Lý do từ chối <span className="text-rose-500">*</span>:
                </label>
                <Textarea
                  placeholder="Ví dụ: Sai thông tin chủ tài khoản, ngân hàng từ chối giao dịch..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-md bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>
                  Số tiền {formatCurrency(selectedItem.amount)} sẽ được cộng trả lại vào ví
                  ngay lập tức.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isProcessing}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleSubmitProcess}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận từ chối & Hoàn tiền ví
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { RefreshCw, Search, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { PageHeader } from "~/components/shared/page-header";
import { ErrorState } from "~/components/ui";
import { KanbanBoard } from "./board/KanbanBoard";
import { AccessCodeModal } from "./components/AccessCodeModal";
import { WeightUpdateModal } from "./components/WeightUpdateModal";
import { ErrorToast } from "./components/ErrorToast";
import { useOrderBoard } from "./hooks/useOrderBoard";

export default function PartnerOrders() {
  const {
    boardColumns,
    isLoading,
    isFetching,
    error,
    refetch,
    totalOrders,
    searchQuery,
    setSearchQuery,
    handleStatusChange,
    isUpdatingWeight,
    weightModal,
    setWeightModal,
    submitWeight,
    accessCodeModal,
    handleAccessCodeModalClose,
    errorToast,
    setErrorToast,
    wsConnected,
    wsError,
  } = useOrderBoard();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Không thể tải đơn hàng"
        message="Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {/* Error Toast */}
      <ErrorToast message={errorToast} onClose={() => setErrorToast(null)} />

      {/* Page Header */}
      <PageHeader
        title="Quản lý đơn hàng"
        description="Kéo thả đơn giữa các cột để cập nhật trạng thái"
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã đơn, tên khách..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {totalOrders} đơn
          </span>

          {isFetching && !isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              Đang đồng bộ
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={refetch}
            disabled={isFetching}
            className="h-9"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            <span className="ml-1.5 hidden sm:inline">Làm mới</span>
          </Button>

          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${
              wsConnected
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-muted/30 text-muted-foreground border-border/50"
            }`}
            title={
              wsConnected
                ? "Kết nối real-time đang hoạt động"
                : (wsError ?? "Đang kết nối...")
            }
          >
            {wsConnected ? (
              <Wifi size={12} className="text-green-600" />
            ) : (
              <WifiOff size={12} className="text-muted-foreground/70" />
            )}
            <span className="hidden sm:inline">
              {wsConnected ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard columns={boardColumns} onStatusChange={handleStatusChange} />

      {/* Access Code Modal */}
      <AccessCodeModal
        isOpen={accessCodeModal.open}
        onClose={handleAccessCodeModalClose}
        code={accessCodeModal.code}
        action={accessCodeModal.action}
      />

      {/* Weight Update Modal */}
      <WeightUpdateModal
        isOpen={weightModal.open}
        onClose={() => setWeightModal({ open: false, order: null, weight: "" })}
        order={weightModal.order}
        weight={weightModal.weight}
        onWeightChange={(w) =>
          setWeightModal((prev) => ({ ...prev, weight: w }))
        }
        onSubmit={submitWeight}
        isLoading={isUpdatingWeight}
      />
    </div>
  );
}

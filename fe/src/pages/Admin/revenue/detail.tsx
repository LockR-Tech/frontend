import { useNavigate, useParams } from "react-router-dom";
import { createColumnHelper } from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowLeft,
  Mail,
  Phone,
  Receipt,
  ShoppingBag,
  Undo2,
  Wallet,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { DataTable } from "~/components/shared/data-table";
import {
  DateRangeFilter,
  LabelValue,
  MetaBadge,
  ReportErrorState,
  ReportStatCard,
  orderPaymentStatusMeta,
  orderStatusMeta,
  orderTypeMeta,
  paymentMethodMeta,
} from "~/components/shared/reporting";
import { useGetCustomerRevenueDetailQuery } from "~/stores/apis/admin/revenue";
import { formatDateTime } from "~/lib/datetime";
import {
  EMPTY_VALUE,
  formatCurrency,
  formatDayLabel,
  formatNumber,
} from "~/lib/report-format";
import { useRevenueRange } from "./hooks/useRevenueRange";
import type { CustomerRevenueOrder } from "~/types/admin/reporting";

const columnHelper = createColumnHelper<CustomerRevenueOrder>();

/**
 * Chi tiết doanh thu của một khách (§ 3.9). Danh sách đơn gồm đơn tạo trong kỳ
 * CỘNG đơn có lần thu tiền trong kỳ, nên có thể xuất hiện đơn tạo từ trước.
 */
export default function RevenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { range, setRange, skip } = useRevenueRange();

  const numericId = Number(id);
  const validId = Number.isInteger(numericId) && numericId > 0 ? numericId : undefined;

  const { data, isLoading, error, refetch } = useGetCustomerRevenueDetailQuery(
    { userId: validId!, ...range },
    { skip: !validId || skip },
  );

  const customer = data?.data;

  const columns = [
    columnHelper.accessor("orderCode", {
      header: "Đơn hàng",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/orders/${row.original.orderId}`)}
          className="text-left min-w-0 hover:underline"
        >
          <p className="font-mono text-sm truncate">
            {row.original.orderCode ?? `#${row.original.orderId}`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            ID #{row.original.orderId}
          </p>
        </button>
      ),
    }),
    columnHelper.accessor("type", {
      header: "Loại",
      cell: ({ row }) => <MetaBadge meta={orderTypeMeta(row.original.type)} hideIcon />,
    }),
    columnHelper.accessor("status", {
      header: "Trạng thái",
      cell: ({ row }) => (
        <div className="space-y-1">
          <MetaBadge meta={orderStatusMeta(row.original.status)} hideIcon />
          <MetaBadge
            meta={orderPaymentStatusMeta(row.original.paymentStatus)}
            hideIcon
          />
        </div>
      ),
    }),
    columnHelper.accessor("lockerCode", {
      header: "Tủ",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-xs font-mono truncate">
            {row.original.lockerCode ??
              (row.original.lockerId ? `#${row.original.lockerId}` : EMPTY_VALUE)}
          </p>
          <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
            {row.original.lockerName ?? ""}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("totalPrice", {
      header: "Tổng đơn",
      cell: ({ row }) => formatCurrency(row.original.totalPrice),
    }),
    columnHelper.accessor("paidInRange", {
      header: "Thu trong kỳ",
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-semibold text-sm">
            {formatCurrency(row.original.paidInRange)}
          </p>
          {(row.original.refundedInRange ?? 0) > 0 && (
            <p className="text-[11px] text-violet-600 dark:text-violet-400">
              Hoàn {formatCurrency(row.original.refundedInRange)}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("paidAllTime", {
      header: "Thu mọi lúc",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatCurrency(row.original.paidAllTime)}
        </span>
      ),
    }),
    columnHelper.accessor("paymentMethods", {
      header: "Phương thức",
      cell: ({ row }) => {
        const methods = row.original.paymentMethods ?? [];
        if (methods.length === 0) {
          return <span className="text-xs text-muted-foreground">{EMPTY_VALUE}</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {methods.map((method) => (
              <MetaBadge key={method} meta={paymentMethodMeta(method)} hideIcon />
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Tạo lúc",
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap">
          {row.original.createdAt ? formatDateTime(row.original.createdAt) : EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("lastPaidAt", {
      header: "Thu gần nhất",
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          {row.original.lastPaidAt
            ? formatDateTime(row.original.lastPaidAt)
            : EMPTY_VALUE}
        </p>
      ),
    }),
    columnHelper.accessor("completedAt", {
      header: "Hoàn thành",
      cell: ({ row }) => (
        <p className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          {row.original.completedAt
            ? formatDateTime(row.original.completedAt)
            : EMPTY_VALUE}
        </p>
      ),
    }),
  ];

  if (!validId) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
        <h3 className="text-lg font-medium">Mã khách hàng không hợp lệ</h3>
        <Button variant="outline" onClick={() => navigate("/admin/revenue")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Về báo cáo doanh thu
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-5">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {isLoading
              ? "Đang tải…"
              : customer?.fullName || `Khách hàng #${validId}`}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Doanh thu {formatDayLabel(range.from)} – {formatDayLabel(range.to)}
          </p>
        </div>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      {error ? (
        <ReportErrorState
          error={error}
          onRetry={refetch}
          title="Không tải được doanh thu của khách hàng"
        />
      ) : (
        <>
          <Card className="border border-border bg-card">
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))
              ) : (
                <>
                  <LabelValue label="Mã khách" mono>
                    {`#${customer?.userId ?? validId}`}
                  </LabelValue>
                  <LabelValue label="Điện thoại" mono>
                    {customer?.phoneNumber ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phoneNumber}
                      </span>
                    ) : null}
                  </LabelValue>
                  <LabelValue label="Email">
                    {customer?.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.email}
                      </span>
                    ) : null}
                  </LabelValue>
                  <LabelValue label="Trạng thái tài khoản">
                    {customer?.status}
                  </LabelValue>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <ReportStatCard
              label="Đã chi trong kỳ"
              value={formatCurrency(customer?.totalSpent)}
              icon={Wallet}
              isLoading={isLoading}
            />
            <ReportStatCard
              label="Thực chi"
              value={formatCurrency(customer?.netSpent)}
              hint={`Đã hoàn ${formatCurrency(customer?.refundAmount)}`}
              icon={Undo2}
              isLoading={isLoading}
            />
            <ReportStatCard
              label="Giá trị đơn TB"
              value={formatCurrency(customer?.averageOrderValue)}
              icon={ShoppingBag}
              isLoading={isLoading}
            />
            <ReportStatCard
              label="Đơn tạo trong kỳ"
              value={formatNumber(customer?.orderCount)}
              icon={Receipt}
              isLoading={isLoading}
            />
            <ReportStatCard
              label="Đơn đã trả tiền"
              value={formatNumber(customer?.paidOrderCount)}
              icon={Receipt}
              isLoading={isLoading}
            />
            <ReportStatCard
              label="Đơn đầu tiên"
              value={
                customer?.firstOrderAt
                  ? formatDateTime(customer.firstOrderAt)
                  : EMPTY_VALUE
              }
              hint={
                customer?.lastOrderAt
                  ? `Gần nhất ${formatDateTime(customer.lastOrderAt)}`
                  : undefined
              }
              isLoading={isLoading}
              className="[&_p.text-xl]:text-sm"
            />
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-sm font-semibold">
                Đơn hàng trong kỳ ({formatNumber(customer?.orders.length ?? 0)})
              </h2>
              <DataTable
                columns={columns}
                data={customer?.orders ?? []}
                isLoading={isLoading}
                emptyMessage="Khách hàng không có đơn nào trong khoảng đã chọn"
              />
              <p className="text-[11px] text-muted-foreground">
                Danh sách gồm đơn tạo trong kỳ và đơn có lần thu tiền trong kỳ, nên có
                thể xuất hiện đơn được tạo từ trước. Chỉ tính các khoản do chính khách
                này thanh toán.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

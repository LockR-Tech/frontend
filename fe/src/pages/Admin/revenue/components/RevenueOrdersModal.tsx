import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import {
  ExternalLink,
  Eye,
  ShoppingBag,
  CreditCard,
  Building2,
  Boxes,
  User,
  Sparkles,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/shared/data-table";
import {
  MetaBadge,
  ReportErrorState,
  orderPaymentStatusMeta,
  orderStatusMeta,
  orderTypeMeta,
  paymentMethodMeta,
  revenueServiceMeta,
} from "~/components/shared/reporting";
import { useSearchAdminOrdersQuery } from "~/stores/apis/admin/orders";
import { useSearchAdminPaymentsQuery } from "~/stores/apis/admin/payments";
import { formatDateTime } from "~/lib/datetime";
import { EMPTY_VALUE, formatCurrency, formatNumber } from "~/lib/report-format";
import type {
  AdminOrder,
  AdminPayment,
  AdminPaymentMethod,
  RevenueServiceType,
} from "~/types/admin/reporting";

export type RevenueOrdersTarget =
  | {
      /// Mọi đơn tạo trong kỳ — thẻ "Đơn tạo mới".
      type: "CREATED";
      label: string;
    }
  | {
      type: "METHOD";
      method: AdminPaymentMethod;
      label: string;
      paidOrderCount?: number;
    }
  | {
      type: "LOCKER";
      lockerId: number | null;
      label: string;
      paidOrderCount?: number;
    }
  | {
      type: "STORE";
      storeId: number | null;
      label: string;
      paidOrderCount?: number;
    }
  | {
      type: "CUSTOMER";
      userId: number;
      label: string;
      paidOrderCount?: number;
    }
  | {
      type: "SERVICE";
      serviceType: RevenueServiceType;
      label: string;
      paidOrderCount?: number;
    };

interface RevenueOrdersModalProps {
  target: RevenueOrdersTarget | null;
  onClose: () => void;
  range: { from: string; to: string };
}

const orderColumnHelper = createColumnHelper<AdminOrder>();
const paymentColumnHelper = createColumnHelper<AdminPayment>();

export function RevenueOrdersModal({
  target,
  onClose,
  range,
}: RevenueOrdersModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Đổi target thì reset về trang đầu
  useEffect(() => {
    setPage(0);
  }, [target]);

  const isOpen = target !== null;
  const isMethodTarget = target?.type === "METHOD";

  // 1. Query cho Phương thức thanh toán (dùng payments search)
  const paymentQueryArgs = useMemo(() => {
    if (!target || target.type !== "METHOD") return null;
    return {
      page,
      size: pageSize,
      method: [target.method],
      kind: "ORDER" as const,
      from: range.from || undefined,
      to: range.to || undefined,
      sort: "createdAt,desc",
    };
  }, [target, page, pageSize, range]);

  const {
    data: paymentData,
    isLoading: isPaymentLoading,
    error: paymentError,
    refetch: refetchPayment,
  } = useSearchAdminPaymentsQuery(paymentQueryArgs!, {
    skip: !isOpen || !isMethodTarget,
  });

  // 2. Query cho Tủ, Cửa hàng, Khách hàng, Dịch vụ (dùng orders search)
  const orderQueryArgs = useMemo(() => {
    if (!target || target.type === "METHOD") return null;
    return {
      page,
      size: pageSize,
      ...(target.type === "LOCKER" && target.lockerId !== null
        ? { lockerId: target.lockerId }
        : {}),
      ...(target.type === "STORE" && target.storeId !== null
        ? { storeId: target.storeId }
        : {}),
      ...(target.type === "CUSTOMER" ? { userId: target.userId } : {}),
      ...(target.type === "SERVICE" &&
      target.serviceType !== "OVERTIME_FEE" &&
      target.serviceType !== "OTHER" &&
      target.serviceType !== "UNKNOWN"
        ? { type: [target.serviceType] }
        : {}),
      from: range.from || undefined,
      to: range.to || undefined,
      sort: "createdAt,desc",
    };
  }, [target, page, pageSize, range]);

  const {
    data: orderData,
    isLoading: isOrderLoading,
    error: orderError,
    refetch: refetchOrder,
  } = useSearchAdminOrdersQuery(orderQueryArgs!, {
    skip: !isOpen || isMethodTarget,
  });

  const isLoading = isMethodTarget ? isPaymentLoading : isOrderLoading;
  const error = isMethodTarget ? paymentError : orderError;
  const refetch = isMethodTarget ? refetchPayment : refetchOrder;

  const totalElements = isMethodTarget
    ? (paymentData?.data?.totalElements ?? 0)
    : (orderData?.data?.totalElements ?? 0);
  const totalPages = isMethodTarget
    ? (paymentData?.data?.totalPages ?? 0)
    : (orderData?.data?.totalPages ?? 0);

  // Điều hướng sang trang Đơn hàng / Thanh toán đầy đủ
  const handleOpenExternal = () => {
    if (!target) return;
    onClose();

    if (target.type === "METHOD") {
      navigate(
        `/admin/payments?method=${target.method}&from=${range.from}&to=${range.to}`,
      );
    } else if (target.type === "LOCKER" && target.lockerId !== null) {
      navigate(
        `/admin/orders?lockerId=${target.lockerId}&from=${range.from}&to=${range.to}`,
      );
    } else if (target.type === "STORE" && target.storeId !== null) {
      navigate(
        `/admin/orders?storeId=${target.storeId}&from=${range.from}&to=${range.to}`,
      );
    } else if (target.type === "CUSTOMER") {
      navigate(
        `/admin/orders?userId=${target.userId}&from=${range.from}&to=${range.to}`,
      );
    } else if (target.type === "SERVICE") {
      navigate(
        `/admin/orders?type=${target.serviceType}&from=${range.from}&to=${range.to}`,
      );
    } else {
      navigate(`/admin/orders?from=${range.from}&to=${range.to}`);
    }
  };

  const getTargetIcon = () => {
    if (!target) return ShoppingBag;
    switch (target.type) {
      case "METHOD":
        return CreditCard;
      case "LOCKER":
        return Boxes;
      case "STORE":
        return Building2;
      case "CUSTOMER":
        return User;
      case "SERVICE":
        return Sparkles;
      default:
        return ShoppingBag;
    }
  };

  const getTargetSubtitle = () => {
    if (!target) return "";
    switch (target.type) {
      case "METHOD":
        return t("admin.revenue.ordersModal.targetMethod", {
          name: target.label,
        });
      case "LOCKER":
        return t("admin.revenue.ordersModal.targetLocker", {
          name: target.label,
        });
      case "STORE":
        return t("admin.revenue.ordersModal.targetStore", {
          name: target.label,
        });
      case "CUSTOMER":
        return t("admin.revenue.ordersModal.targetCustomer", {
          name: target.label,
        });
      case "SERVICE":
        return t("admin.revenue.ordersModal.targetService", {
          name: target.label,
        });
    }
  };

  // Cột bảng cho Danh sách thanh toán theo Phương thức
  const paymentColumns = useMemo(
    () => [
      paymentColumnHelper.accessor("order", {
        header: t("common.order"),
        cell: ({ row }) => {
          const item = row.original;
          const orderCode =
            item.order?.orderCode ??
            (item.orderId ? `#${item.orderId}` : item.referenceId);
          return (
            <div className="min-w-0">
              <p className="font-mono font-semibold text-xs text-foreground truncate">
                {orderCode}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {item.referenceId}
              </p>
            </div>
          );
        },
      }),
      paymentColumnHelper.accessor("customer", {
        header: t("common.customer"),
        cell: ({ row }) => {
          const customer = row.original.customer;
          return (
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {customer?.fullName || t("admin.orders.lookup.customerName")}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {customer?.phoneNumber || EMPTY_VALUE}
              </p>
            </div>
          );
        },
      }),
      paymentColumnHelper.accessor("amount", {
        header: t("admin.payments.amount"),
        cell: ({ row }) => (
          <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      }),
      paymentColumnHelper.accessor("method", {
        header: t("admin.payments.method"),
        cell: ({ row }) => (
          <MetaBadge meta={paymentMethodMeta(row.original.method)} />
        ),
      }),
      paymentColumnHelper.accessor("order.type", {
        header: t("admin.orders.fields.kind"),
        cell: ({ row }) => {
          const type = row.original.order?.type;
          return type ? (
            <MetaBadge meta={orderTypeMeta(type)} hideIcon />
          ) : (
            EMPTY_VALUE
          );
        },
      }),
      paymentColumnHelper.accessor("order.status", {
        header: t("common.status"),
        cell: ({ row }) => {
          const order = row.original.order;
          if (!order) return <span className="text-xs">{EMPTY_VALUE}</span>;
          return (
            <div className="space-y-0.5">
              <MetaBadge meta={orderStatusMeta(order.status)} hideIcon />
              {order.paymentStatus && (
                <MetaBadge
                  meta={orderPaymentStatusMeta(order.paymentStatus)}
                  hideIcon
                />
              )}
            </div>
          );
        },
      }),
      paymentColumnHelper.accessor("paidAt", {
        header: t("common.time"),
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.paidAt ?? row.original.createdAt)}
          </span>
        ),
      }),
      paymentColumnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const orderId = row.original.orderId;
          if (!orderId) return null;
          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-primary hover:underline"
              onClick={() => {
                onClose();
                navigate(`/admin/orders/${orderId}`);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              {t("button.detail")}
            </Button>
          );
        },
      }),
    ],
    [t, onClose, navigate],
  );

  // Cột bảng cho Danh sách đơn theo Tủ, Cửa hàng, Khách hàng, Dịch vụ
  const orderColumns = useMemo(
    () => [
      orderColumnHelper.accessor("orderCode", {
        header: t("common.order"),
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="min-w-0">
              <p className="font-mono font-semibold text-xs text-foreground truncate">
                {order.orderCode ?? t("admin.orders.noCode")}
              </p>
              <p className="text-[10px] text-muted-foreground">ID #{order.id}</p>
            </div>
          );
        },
      }),
      orderColumnHelper.accessor("customer", {
        header: t("common.customer"),
        cell: ({ row }) => {
          const customer = row.original.customer;
          return (
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {customer?.fullName || t("admin.orders.lookup.customerName")}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {customer?.phoneNumber || EMPTY_VALUE}
              </p>
            </div>
          );
        },
      }),
      orderColumnHelper.accessor("type", {
        header: t("admin.orders.fields.kind"),
        cell: ({ row }) => (
          <MetaBadge meta={orderTypeMeta(row.original.type)} hideIcon />
        ),
      }),
      orderColumnHelper.accessor("locker", {
        header: t("admin.orders.fields.locker"),
        cell: ({ row }) => {
          const locker = row.original.locker ?? row.original.destinationLocker;
          return (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {locker?.name ?? locker?.code ?? EMPTY_VALUE}
              </p>
              {row.original.store?.name && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {row.original.store.name}
                </p>
              )}
            </div>
          );
        },
      }),
      orderColumnHelper.accessor("totalPrice", {
        header: t("admin.payments.amount"),
        cell: ({ row }) => (
          <span className="font-semibold text-xs">
            {formatCurrency(row.original.totalPrice)}
          </span>
        ),
      }),
      orderColumnHelper.accessor("status", {
        header: t("common.status"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <MetaBadge meta={orderStatusMeta(row.original.status)} hideIcon />
            {row.original.paymentStatus && (
              <MetaBadge
                meta={orderPaymentStatusMeta(row.original.paymentStatus)}
                hideIcon
              />
            )}
          </div>
        ),
      }),
      orderColumnHelper.accessor("createdAt", {
        header: t("common.time"),
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      }),
      orderColumnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-primary hover:underline"
            onClick={() => {
              onClose();
              navigate(`/admin/orders/${row.original.id}`);
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            {t("button.detail")}
          </Button>
        ),
      }),
    ],
    [t, onClose, navigate],
  );

  const TargetIcon = getTargetIcon();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 space-y-1.5 border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <TargetIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                {t("admin.revenue.ordersModal.title", "Danh sách đơn hàng")} —{" "}
                <span className="text-primary">{target?.label}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{getTargetSubtitle()}</span>
                {range.from && range.to && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-muted px-2 py-0.5 rounded">
                    <Calendar className="w-3 h-3" />
                    {range.from} → {range.to}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t("admin.revenue.ordersModal.count", {
                total: formatNumber(totalElements),
              })}
            </span>
          </div>

          {error && <ReportErrorState error={error} onRetry={refetch} />}

          {isMethodTarget ? (
            <DataTable
              columns={paymentColumns}
              data={paymentData?.data?.content ?? []}
              isLoading={isLoading}
              emptyMessage={t(
                "admin.revenue.ordersModal.empty",
                "Không có đơn hàng nào khớp bộ lọc trong kỳ này",
              )}
              serverPagination={{
                pageIndex: page,
                pageSize,
                pageCount: totalPages,
                totalRows: totalElements,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(0);
                },
              }}
            />
          ) : (
            <DataTable
              columns={orderColumns}
              data={orderData?.data?.content ?? []}
              isLoading={isLoading}
              emptyMessage={t(
                "admin.revenue.ordersModal.empty",
                "Không có đơn hàng nào khớp bộ lọc trong kỳ này",
              )}
              serverPagination={{
                pageIndex: page,
                pageSize,
                pageCount: totalPages,
                totalRows: totalElements,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(0);
                },
              }}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-3 flex flex-row items-center justify-between gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleOpenExternal}
          >
            <span>
              {isMethodTarget
                ? t(
                    "admin.revenue.ordersModal.openInPayments",
                    "Mở trang Thanh toán",
                  )
                : t(
                    "admin.revenue.ordersModal.openInOrders",
                    "Mở trang Đơn hàng",
                  )}
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          <Button type="button" size="sm" onClick={onClose} className="text-xs">
            {t("button.close", "Đóng")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

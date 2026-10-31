import { useGetOrderCustomerViewQuery } from "~/stores/apis/admin/orders";
import { useGetAdminRefundsQuery, useSearchAdminPaymentsQuery } from "~/stores/apis/admin/payments";

/** Dữ liệu phụ cho trang chi tiết: đơn như app khách thấy, các lần thanh toán và hoàn tiền của đơn. */
export function useOrderExtras(orderId: number | undefined) {
  const skip = !orderId;
  const view = useGetOrderCustomerViewQuery(orderId ?? 0, { skip, pollingInterval: 15000 });
  const payments = useSearchAdminPaymentsQuery(
    { orderId, size: 50 },
    { skip },
  );
  const refunds = useGetAdminRefundsQuery({ orderId, size: 50 }, { skip });
  return {
    view: view.data?.data ?? null,
    viewError: view.isError,
    // Cũ → mới để đánh số "Lần 1, Lần 2…" như app khách.
    payments: payments.data?.data?.content
      ? [...payments.data.data.content].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
      : null,
    paymentsError: payments.isError,
    refunds: refunds.data?.data?.content ?? [],
  };
}

import {
  Card,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  EmptyData,
} from "~/components/ui";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "~/components/ui/pagination";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { PartnerOrder } from "@/types/partner.type";
import { OrderActions } from "./OrderActions";
import {
  getStatusBadgeClass,
  tableHeader,
  STATUS_LABELS,
} from "../utils/order-helpers";
import { Package } from "lucide-react";

interface OrdersTableProps {
  orders: PartnerOrder[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
  isAccepting: boolean;
  isProcessing: boolean;
  isMarkingReady: boolean;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | "ellipsis")[];
  onAcceptOrder: (order: PartnerOrder) => void;
  onOpenWeightModal: (order: PartnerOrder) => void;
  onProcessOrder: (order: PartnerOrder) => void;
  onMarkReady: (order: PartnerOrder) => void;
}

export function OrdersTable({
  orders,
  totalPages,
  totalElements,
  currentPage,
  pageSize,
  isAccepting,
  isProcessing,
  isMarkingReady,
  onPageChange,
  getPageNumbers,
  onAcceptOrder,
  onOpenWeightModal,
  onProcessOrder,
  onMarkReady,
}: OrdersTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleViewDetail = (order: PartnerOrder) => {
    navigate(`/partner/orders/${order.id}`);
  };

  if (orders.length === 0) {
    return (
      <EmptyData
        title={t("partner.orders.empty.title")}
        message={t("partner.orders.empty.message")}
        icon={<Package className="h-16 w-16 text-muted-foreground" />}
      />
    );
  }

  const startIndex = currentPage * pageSize + 1;
  const endIndex = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <Card>
      <Table>
        <TableHeader className={tableHeader.bg}>
          <TableRow>
            <TableHead className={`${tableHeader.text} ${tableHeader.radius}`}>
              {t("partner.orders.columns.orderCode")}
            </TableHead>
            <TableHead className={tableHeader.text}>
              {t("partner.orders.columns.customer")}
            </TableHead>
            <TableHead className={tableHeader.text}>
              {t("partner.orders.columns.locker")}
            </TableHead>
            <TableHead className={tableHeader.text}>
              {t("partner.orders.columns.service")}
            </TableHead>
            <TableHead className={tableHeader.text}>
              {t("common.status")}
            </TableHead>
            <TableHead className={tableHeader.text}>
              {t("partner.orders.columns.weight")}
            </TableHead>
            <TableHead className={tableHeader.text}>
              {t("partner.orders.columns.total")}
            </TableHead>
            <TableHead className={tableHeader.text}>
              {t("common.createdAt")}
            </TableHead>
            <TableHead
              className={`${tableHeader.text} ${tableHeader.radius} text-right`}
            >
              {t("common.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-muted/50">
              <TableCell
                className="font-mono font-semibold text-blue-600 cursor-pointer hover:underline"
                onClick={() => handleViewDetail(order)}
              >
                {order.orderCode}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.lockerName}</p>
                  <p className="text-sm text-muted-foreground">Box {order.boxNumber}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{order.serviceType}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusBadgeClass(order.status)}>
                  {STATUS_LABELS[order.status] || order.status}
                </Badge>
              </TableCell>
              <TableCell>{order.weight ? `${order.weight} kg` : "-"}</TableCell>
              <TableCell className="font-semibold">
                {order.totalPrice
                  ? `${order.totalPrice.toLocaleString()}đ`
                  : "-"}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(order.createdAt).toLocaleDateString("vi-VN")}
              </TableCell>
              <TableCell className="text-right">
                <OrderActions
                  order={order}
                  onAcceptOrder={onAcceptOrder}
                  onOpenWeightModal={onOpenWeightModal}
                  onProcessOrder={onProcessOrder}
                  onMarkReady={onMarkReady}
                  onViewDetail={handleViewDetail}
                  isAccepting={isAccepting}
                  isProcessing={isProcessing}
                  isMarkingReady={isMarkingReady}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            {t("table.showing")} {startIndex} - {endIndex} / {totalElements}{" "}
            {t("partner.orders.results")}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                  className={
                    currentPage === 0
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === currentPage}
                      onClick={() => onPageChange(pageNum)}
                      className="cursor-pointer"
                    >
                      {pageNum + 1}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange(Math.min(totalPages - 1, currentPage + 1))
                  }
                  className={
                    currentPage >= totalPages - 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </Card>
  );
}

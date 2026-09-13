import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "~/components/ui";
import { ORDER_STATUS_COLORS } from "@/constants";
import type { PartnerOrder } from "@/types/partner.type";
import type { OrderStatus } from "@/types/partner.enum";

interface RecentOrdersTableProps {
  orders: PartnerOrder[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (orders.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("partner.dashboard.pendingOrders")}</CardTitle>
          <CardDescription>{orders.length} {t("partner.dashboard.ordersNeedAction")}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/partner/orders?status=WAITING")}
        >
          {t("button.viewAll")}
          <ArrowRight className="ml-2" size={14} />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("partner.orders.columns.orderCode")}</TableHead>
              <TableHead>{t("partner.orders.columns.customer")}</TableHead>
              <TableHead>{t("partner.orders.columns.service")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.createdAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate("/partner/orders")}
              >
                <TableCell className="font-mono font-semibold">
                  {order.orderCode}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{order.serviceType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      ORDER_STATUS_COLORS[order.status as OrderStatus] ||
                      "bg-muted/50 text-foreground/80"
                    }
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

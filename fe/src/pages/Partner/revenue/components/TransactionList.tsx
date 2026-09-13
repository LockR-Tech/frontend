import { Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "~/components/ui";
import type { Transaction } from "../hooks/useRevenue";

interface TransactionListProps {
  transactions: Transaction[];
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case "ORDER_PAYMENT":
      return "bg-green-100 text-green-700";
    case "REFUND":
      return "bg-red-100 text-red-700";
    case "WITHDRAWAL":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-muted/50 text-foreground/80";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "ORDER_PAYMENT":
      return "Thanh toán đơn hàng";
    case "REFUND":
      return "Hoàn tiền";
    case "WITHDRAWAL":
      return "Rút tiền";
    default:
      return type;
  }
};

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          Chưa có giao dịch nào
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử giao dịch</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã giao dịch</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono">{t.code}</TableCell>
                <TableCell>
                  <Badge className={getTypeBadge(t.type)}>{getTypeLabel(t.type)}</Badge>
                </TableCell>
                <TableCell className="font-semibold">{formatCurrency(t.amount)}</TableCell>
                <TableCell>
                  <Badge variant={t.status === "COMPLETED" ? "default" : "secondary"}>
                    {t.status === "COMPLETED" ? "Thành công" : "Đang xử lý"}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(t.createdAt).toLocaleDateString("vi-VN")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

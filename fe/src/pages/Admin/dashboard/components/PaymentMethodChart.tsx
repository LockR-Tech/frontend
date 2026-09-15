import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface PaymentMethodItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface PaymentMethodChartProps {
  data?: { [key: string]: number };
}

const DEFAULT_METHODS: PaymentMethodItem[] = [
  { name: "Ví điện tử", value: 14500000, color: "#10B981", percentage: 48 },
  { name: "VNPay", value: 8900000, color: "#2563EB", percentage: 29 },
  { name: "MoMo", value: 4500000, color: "#EC4899", percentage: 15 },
  { name: "Tiền mặt Kiosk", value: 2400000, color: "#F59E0B", percentage: 8 },
];

function formatVND(val: number) {
  return val.toLocaleString("vi-VN") + " đ";
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const chartData: PaymentMethodItem[] = data && Object.keys(data).length > 0
    ? [
        { name: "Ví điện tử", value: data["WALLET"] ?? 14500000, color: "#10B981", percentage: 48 },
        { name: "VNPay", value: data["VNPAY"] ?? 8900000, color: "#2563EB", percentage: 29 },
        { name: "MoMo", value: data["MOMO"] ?? 4500000, color: "#EC4899", percentage: 15 },
        { name: "Tiền mặt Kiosk", value: data["CASH"] ?? 2400000, color: "#F59E0B", percentage: 8 },
      ]
    : DEFAULT_METHODS;

  const total = chartData.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          Cơ cấu thanh toán
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Doanh thu theo từng phương thức giao dịch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-52 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={55}
                outerRadius={78}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [formatVND(Number(value)), "Doanh thu"]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-muted-foreground font-medium">Tổng cổng</span>
            <span className="text-sm font-bold text-foreground">
              {total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)} tr` : formatVND(total)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/60">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
              <span className="font-semibold text-foreground">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

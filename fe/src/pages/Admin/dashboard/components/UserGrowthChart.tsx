import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface GrowthPoint {
  month: string;
  users: number;
  activeUsers: number;
}

const USER_GROWTH_DATA: GrowthPoint[] = [
  { month: "T1", users: 120, activeUsers: 85 },
  { month: "T2", users: 190, activeUsers: 140 },
  { month: "T3", users: 280, activeUsers: 210 },
  { month: "T4", users: 410, activeUsers: 330 },
  { month: "T5", users: 560, activeUsers: 450 },
  { month: "T6", users: 720, activeUsers: 590 },
  { month: "T7", users: 910, activeUsers: 740 },
  { month: "T8", users: 1150, activeUsers: 920 },
  { month: "T9", users: 1420, activeUsers: 1140 },
  { month: "T10", users: 1750, activeUsers: 1410 },
  { month: "T11", users: 2100, activeUsers: 1720 },
  { month: "T12", users: 2540, activeUsers: 2080 },
];

export function UserGrowthChart() {
  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            Tăng trưởng khách hàng mới
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Số lượng người dùng đăng ký tài khoản và hoạt động hàng tháng
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground">Tổng người dùng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <span className="text-muted-foreground">Đang hoạt động</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={USER_GROWTH_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-border/60" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-[11px] fill-muted-foreground" />
              <YAxis tickLine={false} axisLine={false} className="text-[11px] fill-muted-foreground" />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${Number(val).toLocaleString("vi-VN")} người`,
                  name === "users" ? "Tổng người dùng" : "Người dùng hoạt động",
                ]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6366F1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#userGrowthGrad)"
              />
              <Area
                type="monotone"
                dataKey="activeUsers"
                stroke="#0D9488"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={0}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

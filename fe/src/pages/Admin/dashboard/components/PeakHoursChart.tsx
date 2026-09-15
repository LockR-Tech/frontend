import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface HourlyPoint {
  hour: string;
  dropOff: number;
  pickUp: number;
}

const PEAK_HOURS_DATA: HourlyPoint[] = [
  { hour: "06:00", dropOff: 12, pickUp: 5 },
  { hour: "08:00", dropOff: 48, pickUp: 22 },
  { hour: "10:00", dropOff: 35, pickUp: 40 },
  { hour: "12:00", dropOff: 55, pickUp: 68 },
  { hour: "14:00", dropOff: 30, pickUp: 42 },
  { hour: "16:00", dropOff: 62, pickUp: 58 },
  { hour: "18:00", dropOff: 84, pickUp: 95 },
  { hour: "20:00", dropOff: 45, pickUp: 72 },
  { hour: "22:00", dropOff: 18, pickUp: 34 },
];

export function PeakHoursChart() {
  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            Khung giờ cao điểm sử dụng Kiosk
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Lưu lượng gửi hàng và nhận hàng theo từng mốc giờ trong ngày
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Khách gửi hàng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-muted-foreground">Khách nhận đồ</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={PEAK_HOURS_DATA}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-border/60" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                className="text-[11px] fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-[11px] fill-muted-foreground"
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${val} lượt`,
                  name === "dropOff" ? "Gửi hàng" : "Nhận hàng",
                ]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="dropOff" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="pickUp" fill="#10B981" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

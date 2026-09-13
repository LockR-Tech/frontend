import { Box, CheckCircle, AlertCircle, Wrench, WifiOff } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

interface LockerStatsProps {
  statistics: {
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    disconnected: number;
    totalBoxes: number;
    availableBoxes: number;
    occupiedBoxes: number;
  };
}

export function LockerStats({ statistics }: LockerStatsProps) {
  const stats = [
    {
      label: "Tổng tủ đồ",
      value: statistics.total,
      icon: Box,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Hoạt động",
      value: statistics.active,
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Bảo trì",
      value: statistics.maintenance,
      icon: Wrench,
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Mất kết nối",
      value: statistics.disconnected,
      icon: WifiOff,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Tổng ngăn",
      value: statistics.totalBoxes,
      icon: Box,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Ngăn trống",
      value: statistics.availableBoxes,
      icon: CheckCircle,
      color: "bg-teal-500",
      textColor: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.textColor} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

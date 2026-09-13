import { Card, CardContent } from "~/components/ui";
import type { LockerStats } from "../hooks/useLockers";

interface LockerStatsProps {
  stats: LockerStats;
}

export function LockerStats({ stats }: LockerStatsProps) {
  const items = [
    { label: "Tổng Locker", value: stats.totalLockers, color: "text-[#326B9C]" },
    { label: "Tổng ô", value: stats.totalBoxes, color: "text-[#326B9C]" },
    { label: "Đang sử dụng", value: stats.occupiedBoxes, color: "text-red-600" },
    { label: "Còn trống", value: stats.availableBoxes, color: "text-green-600" },
    { label: "Lỗi/Bảo trì", value: stats.maintenanceBoxes, color: "text-orange-600" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {items.map((item) => (
        <Card key={item.label} className="border-[#E8E9EB]">
          <CardContent className="p-6">
            <div className="text-sm text-[#7BAAD1] mb-2">{item.label}</div>
            <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

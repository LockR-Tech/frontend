import { Building2, Clock, CheckCircle, XCircle, AlertCircle, Store } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

interface PartnerStatsProps {
  statistics: {
    totalPartners: number;
    pendingApproval: number;
    approved: number;
    rejected: number;
    suspended: number;
    totalStores: number;
  };
}

export function PartnerStats({ statistics }: PartnerStatsProps) {
  const stats = [
    {
      label: "Tổng đối tác",
      value: statistics.totalPartners,
      icon: Building2,
      color: "bg-blue-500",
      textColor: "text-blue-600",
    },
    {
      label: "Chờ duyệt",
      value: statistics.pendingApproval,
      icon: Clock,
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
    },
    {
      label: "Đã duyệt",
      value: statistics.approved,
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-600",
    },
    {
      label: "Từ chối",
      value: statistics.rejected,
      icon: XCircle,
      color: "bg-red-500",
      textColor: "text-red-600",
    },
    {
      label: "Đình chỉ",
      value: statistics.suspended,
      icon: AlertCircle,
      color: "bg-muted/300",
      textColor: "text-muted-foreground",
    },
    {
      label: "Tổng cửa hàng",
      value: statistics.totalStores,
      icon: Store,
      color: "bg-purple-500",
      textColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} bg-opacity-10 flex items-center justify-center`}>
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

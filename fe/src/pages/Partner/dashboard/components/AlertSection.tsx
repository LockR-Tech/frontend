import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "~/components/ui";

interface AlertSectionProps {
  pendingCollections: number;
  overdueOrders: number;
}

export function AlertSection({ pendingCollections, overdueOrders }: AlertSectionProps) {
  const navigate = useNavigate();

  if (pendingCollections === 0 && overdueOrders === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {pendingCollections > 0 && (
        <Card
          className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/partner/orders?status=WAITING")}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600" size={24} />
              <div>
                <p className="font-semibold text-foreground">
                  {pendingCollections} đơn chờ chấp nhận
                </p>
                <p className="text-sm text-muted-foreground">
                  Cần tạo mã cho Staff lấy đồ
                </p>
              </div>
            </div>
            <ArrowRight className="text-muted-foreground/70" size={20} />
          </CardContent>
        </Card>
      )}

      {overdueOrders > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="text-red-600" size={24} />
            <div>
              <p className="font-semibold text-foreground">
                {overdueOrders} đơn quá hạn
              </p>
              <p className="text-sm text-muted-foreground">Cần xử lý gấp</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

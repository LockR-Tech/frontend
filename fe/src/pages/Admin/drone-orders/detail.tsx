import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { DroneOrderDetailContent } from ".";

export default function DroneOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const parsedOrderId = Number(orderId);
  const validOrderId = Number.isSafeInteger(parsedOrderId) && parsedOrderId > 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" className="-ml-2" onClick={() => navigate("/admin/drone-orders")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Danh sách hành trình drone
      </Button>

      {validOrderId ? (
        <DroneOrderDetailContent orderId={parsedOrderId} />
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Mã đơn không hợp lệ.
        </div>
      )}
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { DroneOrderDetailContent } from ".";

export default function DroneOrderDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const parsedOrderId = Number(orderId);
  const validOrderId = Number.isSafeInteger(parsedOrderId) && parsedOrderId > 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" className="-ml-2" onClick={() => navigate("/admin/drone-orders")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("admin.droneOrders.page.detail.backToList")}
      </Button>

      {validOrderId ? (
        <DroneOrderDetailContent orderId={parsedOrderId} />
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("admin.droneOrders.page.detail.invalidId")}
        </div>
      )}
    </div>
  );
}

import { Check, Play, CheckCircle, Scale, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Badge } from "~/components/ui";
import type { PartnerOrder } from "@/types/partner.type";
import { OrderStatus } from "@/types/partner.enum";

interface OrderActionsProps {
  order: PartnerOrder;
  onAcceptOrder: (order: PartnerOrder) => void;
  onOpenWeightModal: (order: PartnerOrder) => void;
  onProcessOrder: (order: PartnerOrder) => void;
  onMarkReady: (order: PartnerOrder) => void;
  onViewDetail: (order: PartnerOrder) => void;
  isAccepting: boolean;
  isProcessing: boolean;
  isMarkingReady: boolean;
}

export function OrderActions({
  order,
  onAcceptOrder,
  onOpenWeightModal,
  onProcessOrder,
  onMarkReady,
  onViewDetail,
  isAccepting,
  isProcessing,
  isMarkingReady,
}: OrderActionsProps) {
  const { t } = useTranslation();

  const viewDetailBtn = (
    <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground hover:text-blue-600"
      onClick={() => onViewDetail(order)}
    >
      <Eye size={14} />
    </Button>
  );

  switch (order.status) {
    case OrderStatus.WAITING:
      return (
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            onClick={() => onAcceptOrder(order)}
            disabled={isAccepting}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check size={14} className="mr-1" />
            {t("partner.orders.actions.accept")}
          </Button>
          {viewDetailBtn}
        </div>
      );

    case OrderStatus.COLLECTED:
      return (
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenWeightModal(order)}
          >
            <Scale size={14} className="mr-1" />
            {t("partner.orders.actions.enterWeight")}
          </Button>
          <Button
            size="sm"
            onClick={() => onProcessOrder(order)}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play size={14} className="mr-1" />
            {t("partner.orders.actions.process")}
          </Button>
          {viewDetailBtn}
        </div>
      );

    case OrderStatus.PROCESSING:
      return (
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            onClick={() => onMarkReady(order)}
            disabled={isMarkingReady}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <CheckCircle size={14} className="mr-1" />
            {t("partner.orders.actions.markReady")}
          </Button>
          {viewDetailBtn}
        </div>
      );

    case OrderStatus.READY:
      return (
        <div className="flex items-center gap-1 justify-end">
          <Badge
            variant="outline"
            className="text-purple-600 border-purple-600"
          >
            {t("partner.orders.status.waitingReturn")}
          </Badge>
          {viewDetailBtn}
        </div>
      );

    case OrderStatus.RETURNED:
      return (
        <div className="flex items-center gap-1 justify-end">
          <Badge variant="outline" className="text-green-600 border-green-600">
            {t("partner.orders.status.waitingPickup")}
          </Badge>
          {viewDetailBtn}
        </div>
      );

    case OrderStatus.COMPLETED:
      return (
        <Button size="sm" variant="ghost" onClick={() => onViewDetail(order)}>
          <Eye size={14} className="mr-1" />
          {t("button.detail")}
        </Button>
      );

    default:
      return viewDetailBtn;
  }
}

import { DollarSign, Clock, Package, Tag, Store, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import type { PartnerService } from "@/types/partner.type";
import {
  getCategoryLabel,
  getCategoryBadge,
  formatCurrency,
} from "../utils/service-helpers";

interface ServiceDetailModalProps {
  service: PartnerService | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatEstimatedTime = (hours?: number) => {
  if (!hours) return "Không xác định";
  if (hours < 1) return `${Math.round(hours * 60)} phút`;
  if (hours === 1) return "1 giờ";
  return `${hours} giờ`;
};

export function ServiceDetailModal({
  service,
  isOpen,
  onClose,
}: ServiceDetailModalProps) {
  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            Chi tiết dịch vụ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={getCategoryBadge(service.category)}
            >
              <Tag size={12} className="mr-1" />
              {getCategoryLabel(service.category)}
            </Badge>
            <Badge variant={service.isActive ? "default" : "secondary"}>
              {service.isActive ? "Đang hoạt động" : "Tạm ngưng"}
            </Badge>
            {service.isAddon && (
              <Badge
                variant="outline"
                className="text-purple-600 border-purple-200 bg-purple-50"
              >
                Add-on
              </Badge>
            )}
            {service.isMonthlyPackage && (
              <Badge
                variant="outline"
                className="text-orange-600 border-orange-200 bg-orange-50"
              >
                Gói tháng
              </Badge>
            )}
          </div>

          {/* Name + Description */}
          <div>
            <h2 className="text-xl font-bold text-foreground">{service.name}</h2>
            {service.description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {service.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Price + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <DollarSign size={16} />
                <span className="text-sm font-medium">Giá cơ bản</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(service.price)}
              </p>
              {service.unit && (
                <p className="text-xs text-blue-500 mt-0.5">/ {service.unit}</p>
              )}
            </div>

            {service.maxPrice && service.maxPrice > service.price && (
              <div className="p-4 bg-orange-50 rounded-xl">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <DollarSign size={16} />
                  <span className="text-sm font-medium">Giá tối đa</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency(service.maxPrice)}
                </p>
                {service.unit && (
                  <p className="text-xs text-orange-500 mt-0.5">
                    / {service.unit}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Estimated time */}
          {service.estimatedHours !== undefined && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Clock size={18} className="text-muted-foreground/70" />
              <div>
                <p className="text-sm font-medium text-foreground/80">
                  Thời gian ước tính
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatEstimatedTime(service.estimatedHours)}
                </p>
              </div>
            </div>
          )}

          {/* Store info */}
          {service.storeName && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Store size={18} className="text-muted-foreground/70" />
              <div>
                <p className="text-sm font-medium text-foreground/80">
                  Cửa hàng cung cấp
                </p>
                <p className="text-sm text-muted-foreground">{service.storeName}</p>
              </div>
            </div>
          )}

          {/* Service type */}
          {service.serviceType && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Loại dịch vụ</span>
              <Badge variant="outline">{service.serviceType}</Badge>
            </div>
          )}

          <Separator />

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              <X size={14} />
              Đóng
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

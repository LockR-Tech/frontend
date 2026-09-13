import { Card, CardContent, Badge } from "~/components/ui";
import { Button } from "~/components/ui/button";
import { Eye } from "lucide-react";
import type { PartnerService } from "@/types/partner.type";
import {
  getCategoryLabel,
  getCategoryBadge,
  formatCurrency,
} from "../utils/service-helpers";

interface ServiceListProps {
  services: PartnerService[];
  onViewDetail?: (service: PartnerService) => void;
}

export function ServiceList({ services, onViewDetail }: ServiceListProps) {
  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Không có dịch vụ nào
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <Card
          key={service.id}
          className={`hover:shadow-md transition-shadow ${service.isActive ? "" : "opacity-60"}`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Badge
                variant="outline"
                className={getCategoryBadge(service.category)}
              >
                {getCategoryLabel(service.category)}
              </Badge>
              <Badge variant={service.isActive ? "default" : "secondary"}>
                {service.isActive ? "Hoạt động" : "Tạm ngưng"}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {service.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <div className="text-sm text-muted-foreground">Giá</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(service.price)}
                </div>
                {service.unit && (
                  <div className="text-xs text-muted-foreground/70">/ {service.unit}</div>
                )}
              </div>
              {onViewDetail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetail(service)}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  <Eye size={14} className="mr-1.5" />
                  Chi tiết
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

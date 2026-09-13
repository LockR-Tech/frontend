import { Card, CardContent, Badge } from "~/components/ui";
import type { PartnerLocker } from "@/types/partner.type";
import { getLockerStatusBadge, getLockerStatusLabel } from "../utils/locker-helpers";

interface LockerInfoProps {
  locker: PartnerLocker;
}

export function LockerInfo({ locker }: LockerInfoProps) {
  return (
    <Card className="border-[#E8E9EB]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#326B9C] mb-2">{locker.name}</h2>
            <p className="text-[#7BAAD1]">{locker.location}</p>
          </div>
          <Badge variant="outline" className={getLockerStatusBadge(locker.status)}>
            {getLockerStatusLabel(locker.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-[#FAFCFF] rounded-lg border border-[#E8E9EB]">
            <div className="text-sm text-[#7BAAD1] mb-1">Tổng ô</div>
            <div className="text-2xl font-bold text-[#326B9C]">{locker.totalBoxes}</div>
          </div>
          <div className="text-center p-4 bg-[#FAFCFF] rounded-lg border border-[#E8E9EB]">
            <div className="text-sm text-[#7BAAD1] mb-1">Đang dùng</div>
            <div className="text-2xl font-bold text-red-600">{locker.occupiedBoxes}</div>
          </div>
          <div className="text-center p-4 bg-[#FAFCFF] rounded-lg border border-[#E8E9EB]">
            <div className="text-sm text-[#7BAAD1] mb-1">Còn trống</div>
            <div className="text-2xl font-bold text-green-600">{locker.availableBoxes}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

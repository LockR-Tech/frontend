import { Unlock, AlertTriangle } from "lucide-react";
import { Button, Card, CardContent } from "~/components/ui";
import type { LockerBox } from "@/types/partner.type";
import { getBoxStatusLabel } from "../utils/locker-helpers";

interface BoxGridProps {
  boxes: LockerBox[];
  totalBoxes: number;
  filterStatus: string;
  onBoxClick: (box: LockerBox) => void;
  onEmergencyClick: (box: LockerBox) => void;
}

export function BoxGrid({ boxes, totalBoxes, filterStatus, onBoxClick, onEmergencyClick }: BoxGridProps) {
  if (boxes.length === 0) {
    return (
      <div className="text-center py-8 text-[#7BAAD1]">
        Không có ô nào ở trạng thái "{filterStatus === "ALL" ? "Tất cả" : getBoxStatusLabel(filterStatus)}"
      </div>
    );
  }

  return (
    <Card className="border-[#E8E9EB]">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-[#326B9C] mb-6">
          Sơ đồ các ô ({boxes.length}/{totalBoxes})
        </h3>

        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {boxes.map((box) => (
            <div key={box.id} className="relative group">
              <button
                className={`
                  w-full aspect-square p-3 rounded-lg border-2 transition-all
                  ${
                    box.status === "AVAILABLE"
                      ? "border-green-300 bg-green-50 hover:bg-green-100"
                      : box.status === "OCCUPIED"
                      ? "border-red-300 bg-red-50 hover:bg-red-100"
                      : box.status === "RESERVED"
                      ? "border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
                      : box.status === "MAINTENANCE"
                      ? "border-orange-300 bg-orange-50 hover:bg-orange-100"
                      : "border-border/70 bg-muted/30 hover:bg-muted"
                  }
                `}
                onClick={() => onBoxClick(box)}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="font-bold text-[#326B9C] text-sm">{box.boxNumber}</div>
                  <div className="text-xs text-[#7BAAD1] mt-1">{box.isActive ? "✓" : "✕"}</div>
                </div>
                {box.status === "OCCUPIED" && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {box.status === "MAINTENANCE" && (
                  <div className="absolute top-1 right-1">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                  </div>
                )}
              </button>

              {/* Quick Actions on Hover */}
              {(box.status === "OCCUPIED" || box.status === "MAINTENANCE") && (
                <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEmergencyClick(box);
                    }}
                  >
                    <Unlock size={12} className="mr-1" />
                    Mở
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-[#E8E9EB]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded" />
            <span className="text-sm text-[#7BAAD1]">Trống</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded" />
            <span className="text-sm text-[#7BAAD1]">Đang dùng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded" />
            <span className="text-sm text-[#7BAAD1]">Đã đặt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded" />
            <span className="text-sm text-[#7BAAD1]">Lỗi</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

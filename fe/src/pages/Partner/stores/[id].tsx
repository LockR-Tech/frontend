import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Calendar,
  Package,
  MapPin,
  TrendingUp,
  Store as StoreIcon,
  ChevronDown,
  ChevronUp,
  Unlock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { PageLoading } from "~/components/ui";
import {
  useGetPartnerStoresQuery,
  useGetStoreLockersQuery,
  useGetLockerBoxesQuery,
} from "@/stores/apis/partnerApi";
import type { PartnerLocker, LockerBox } from "@/types/partner.type";

// ── Box / Locker status config ────────────────────────────────────
const BOX_CFG: Record<string, { label: string; bg: string; border: string; text: string }> = {
  AVAILABLE:   { label: "Trống",   bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700" },
  OCCUPIED:    { label: "Có đồ",   bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700" },
  RESERVED:    { label: "Đã đặt",  bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-700" },
  MAINTENANCE: { label: "Bảo trì", bg: "bg-muted/50",  border: "border-border/70",   text: "text-muted-foreground" },
};

const LOCKER_STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIVE:       { label: "Hoạt động",    dot: "bg-green-500",  badge: "bg-green-50  text-green-700  border-green-200"  },
  INACTIVE:     { label: "Tắt",          dot: "bg-muted-foreground/50",   badge: "bg-muted/30   text-muted-foreground   border-border/50"   },
  MAINTENANCE:  { label: "Bảo trì",      dot: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  DISCONNECTED: { label: "Mất kết nối",  dot: "bg-red-500",    badge: "bg-red-50    text-red-700    border-red-200"    },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ── Partner Locker Card (mirrors Admin LockerCard) ────────────────
function PartnerLockerCard({ locker }: { locker: PartnerLocker }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedBox, setSelectedBox] = useState<LockerBox | null>(null);

  // Use inline boxes from STORE_LOCKERS response when available; only lazy-fetch otherwise
  const hasInlineBoxes = locker.boxes && locker.boxes.length > 0;
  const { data: fetchedBoxes = [], isLoading: boxesLoading } = useGetLockerBoxesQuery(
    locker.id,
    { skip: !expanded || hasInlineBoxes },
  );
  const boxes: LockerBox[] = hasInlineBoxes ? locker.boxes! : fetchedBoxes;

  const statusCfg = LOCKER_STATUS_CFG[locker.status] ?? LOCKER_STATUS_CFG["INACTIVE"];
  const isActive = locker.status === "ACTIVE";

  const available = boxes.filter((b) => b.status === "AVAILABLE").length || locker.availableBoxes || 0;
  const total = boxes.length || locker.totalBoxes || 0;
  const usagePercent = total > 0 ? Math.round(((total - available) / total) * 100) : 0;

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white transition-all hover:shadow-md ${
        isActive ? "border-green-200" : "border-border/50"
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${statusCfg.dot}`} />
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {locker.name}
            </p>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusCfg.badge}`}>
            {statusCfg.label}
          </Badge>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/70 truncate pl-3.5">
          {locker.code}
          {locker.address ? ` · ${locker.address}` : ""}
        </p>
      </div>

      {/* Stats row */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">
            <span className="text-green-600 font-bold">{available}</span>/{total} trống
          </span>
          <span className="text-muted-foreground/70">{usagePercent}%</span>
        </div>
        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent > 80 ? "bg-red-400" : usagePercent > 50 ? "bg-orange-400" : "bg-green-400"
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center border-t px-3 py-1.5 mt-auto">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-blue-600 rounded px-1.5 py-1 hover:bg-blue-50 transition-colors"
        >
          {expanded ? "Thu gọn" : "Xem ngăn"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded box grid */}
      {expanded && (
        <div className="px-3 pb-3 border-t pt-3">
          {boxesLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground/70">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Đang tải...
            </div>
          ) : boxes.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic py-2 text-center">Chưa có ngăn tủ nào</p>
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 mb-2 items-center">
                {Object.entries(BOX_CFG).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-sm border ${c.bg} ${c.border}`} />
                    <span className="text-[10px] text-muted-foreground">{c.label}</span>
                  </div>
                ))}
              </div>
              {/* Grid */}
              <div className="flex flex-wrap gap-1.5">
                {boxes.map((box) => {
                  const cfg = BOX_CFG[box.status] ?? BOX_CFG["MAINTENANCE"];
                  const canOpen = box.status === "OCCUPIED";
                  return (
                    <button
                      key={box.id}
                      title={`Ngăn #${box.boxNumber} — ${cfg.label}`}
                      onClick={() => setSelectedBox(box)}
                      className={`relative w-9 h-9 rounded border flex items-center justify-center text-xs font-bold transition-all hover:shadow-md hover:scale-105 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                    >
                      {box.boxNumber}
                      {canOpen && (
                        <Unlock className="h-2 w-2 absolute top-0.5 right-0.5 text-orange-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Box detail tooltip/modal placeholder */}
      {selectedBox && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
          onClick={() => setSelectedBox(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 min-w-56 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-foreground">Ngăn #{selectedBox.boxNumber}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${BOX_CFG[selectedBox.status]?.bg} ${BOX_CFG[selectedBox.status]?.border} ${BOX_CFG[selectedBox.status]?.text}`}>
                {BOX_CFG[selectedBox.status]?.label ?? selectedBox.status}
              </span>
            </div>
            {selectedBox.description && <p className="text-xs text-muted-foreground">{selectedBox.description}</p>}
            <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setSelectedBox(null)}>
              Đóng
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Store Detail Page ─────────────────────────────────────────────
export default function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const id = Number(storeId);

  const {
    data: stores = [],
    isLoading: isStoresLoading,
    error: storesError,
  } = useGetPartnerStoresQuery();

  const {
    data: lockers = [],
    isLoading: isLockersLoading,
    isFetching: isLockersFetching,
    error: lockersError,
    refetch,
  } = useGetStoreLockersQuery(id);

  const store = stores.find((s) => s.id === id);
  const isLoading = isStoresLoading || isLockersLoading;
  const error = storesError;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error || (!isLoading && !store)) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
        <h3 className="mt-4 text-lg font-medium">Không tìm thấy cửa hàng</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const totalBoxes = lockers.reduce((sum, l) => sum + (l.totalBoxes ?? 0), 0);
  const availableBoxes = lockers.reduce((sum, l) => sum + (l.availableBoxes ?? 0), 0);
  const usagePercent = totalBoxes > 0 ? Math.round(((totalBoxes - availableBoxes) / totalBoxes) * 100) : 0;

  const isActive = store?.status === "ACTIVE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{store?.name}</h1>
            <p className="text-sm text-muted-foreground">ID: {store?.id}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={isActive
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-muted/30 text-muted-foreground border-border/50"
          }
        >
          {isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
        </Badge>
      </div>

      {/* Main Info Card */}
      <Card className="overflow-hidden">
        {/* Info row */}
        <div className="flex flex-col md:flex-row gap-0">
          {/* Store image / icon panel */}
          <div className="relative md:w-64 shrink-0 bg-muted/30 min-h-44 md:min-h-0 flex items-center justify-center">
            {store?.image ? (
              <img
                src={store.image}
                alt={store?.name}
                className="w-full h-full object-cover absolute inset-0"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50 w-full h-44">
                <StoreIcon className="h-12 w-12" />
                <span className="text-xs">Chưa có ảnh</span>
              </div>
            )}
            <div className="absolute top-3 left-3">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                isActive ? "bg-green-500 text-white" : "bg-muted/300 text-white"
              }`}>
                {isActive ? "● Đang hoạt động" : "● Ngừng hoạt động"}
              </span>
            </div>
          </div>

          {/* Info fields */}
          <div className="flex-1 p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Tên cửa hàng</label>
              <p className="text-base font-semibold text-foreground">{store?.name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Địa chỉ
              </label>
              <p className="text-sm text-foreground/80">{store?.address || "—"}</p>
            </div>
            {store?.contactPhone && (
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3" /> Điện thoại
                </label>
                <p className="text-sm text-foreground/80">{store.contactPhone}</p>
              </div>
            )}
            {store?.description && (
              <p className="text-sm text-muted-foreground mt-1">{store.description}</p>
            )}
            {(store?.longitude || store?.latitude) && (
              <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground/70 font-mono border-t">
                <span className="text-muted-foreground/70">Lat:</span>
                <span className="text-muted-foreground font-semibold">{store?.latitude}</span>
                <span className="text-muted-foreground/70 ml-3">Lng:</span>
                <span className="text-muted-foreground font-semibold">{store?.longitude}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Bottom row: Stats | History */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          {/* Placeholder col for manager info alignment */}
          <div className="p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <StoreIcon className="h-3.5 w-3.5" /> Thông tin liên hệ
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                {store?.contactPhone || <span className="text-muted-foreground/50">—</span>}
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
                <span>{store?.address || <span className="text-muted-foreground/50">—</span>}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <TrendingUp className="h-3.5 w-3.5" /> Thống kê
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{lockers.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tổng tủ</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{totalBoxes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tổng box</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{availableBoxes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Box trống</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{totalBoxes - availableBoxes}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Đang dùng</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Tỉ lệ sử dụng</span>
                <span className="font-medium">{usagePercent}%</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* History */}
          <div className="p-5">
            <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Calendar className="h-3.5 w-3.5" /> Lịch sử
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground/70">Ngày tạo</p>
                <p className="text-sm font-semibold text-foreground/80 mt-0.5">
                  {store ? formatDate(store.createdAt) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground/70">Cập nhật cuối</p>
                <p className="text-sm font-semibold text-foreground/80 mt-0.5">
                  {store ? formatDate(store.updatedAt) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground/70">Mã cửa hàng</p>
                <p className="text-sm font-mono font-semibold text-foreground/80 mt-0.5">#{store?.id}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lockers Section */}
      <Card>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
            <Package className="h-4 w-4" />
            Danh sách tủ đồ
            <Badge variant="secondary" className="ml-1">{lockers.length}</Badge>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => refetch()}
            disabled={isLockersFetching}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLockersFetching ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
        <div className="p-4">
          {lockersError ? (
            <div className="py-8 text-center text-red-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Không thể tải danh sách tủ đồ</p>
            </div>
          ) : lockers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground/70">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có tủ đồ nào trong cửa hàng này</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {lockers.map((locker) => (
                <PartnerLockerCard key={locker.id} locker={locker} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

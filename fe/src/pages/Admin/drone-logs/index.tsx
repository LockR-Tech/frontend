import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MessageSquareText,
  Package,
  Plane,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '~/components/shared/page-header';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  useGetDroneCommLogsQuery,
  type DroneLockerCommLog,
} from '~/stores/apis/admin/droneCommLogs';
import { useGetDronesQuery, type DroneResponse } from '~/stores/apis/admin/drones';
import { useGetLockerStatsQuery, type LockerStatsResponse } from '~/stores/apis/admin/lockerOps';
import { useGetAdminDroneOrderListQuery } from '~/pages/Admin/drone-orders/droneOrderListApi';
import type { DroneOrderTracking } from '~/stores/apis/admin/droneOrders';
import { formatDateTime } from '~/lib/datetime';

function isErrorStatus(log: DroneLockerCommLog): boolean {
  const s = (log.processingStatus || '').toUpperCase();
  return (
    Boolean(log.errorCode) ||
    s === 'REJECTED' ||
    s === 'FAILED' ||
    s === 'ERROR' ||
    s === 'ABORTED'
  );
}

function parsePayloadObject(log: DroneLockerCommLog): Record<string, any> | null {
  const raw = log.payload ?? log.payloadJson;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function translateRawMessage(raw: string): string {
  const text = raw.trim();
  const lower = text.toLowerCase();

  if (
    lower.includes('sliding lid close simulated successfully') ||
    lower === 'sliding lid closed completely and verified'
  ) {
    return 'Nắp trượt ô tủ đã đóng hoàn toàn và khóa an toàn';
  }
  if (
    lower.includes('sliding lid open simulated successfully') ||
    lower === 'sliding lid opened completely'
  ) {
    return 'Nắp trượt ô tủ đã mở hoàn toàn';
  }
  if (lower === 'door opened') {
    return 'Đã mở cửa ô tủ';
  }
  if (lower === 'door is closed and locked') {
    return 'Cửa ô tủ đã đóng và khóa an toàn';
  }

  return text.replace(/\s*\(DICT_[A-Z0-9_]+\)/gi, '');
}

function resolveLogMessage(log: DroneLockerCommLog): string {
  if (log.errorMessage && log.errorMessage.trim()) {
    return translateRawMessage(log.errorMessage);
  }

  const parsed = parsePayloadObject(log);
  if (parsed) {
    if (typeof parsed.errorMessage === 'string' && parsed.errorMessage.trim()) {
      return translateRawMessage(parsed.errorMessage);
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return translateRawMessage(parsed.message);
    }
    if (log.eventType === 'MARKER_DETECTED') {
      const mid = parsed.arucoMarkerId ?? log.markerId ?? '?';
      const dist =
        typeof parsed.distanceM === 'number' ? `${parsed.distanceM.toFixed(2)}m` : null;
      const ox =
        typeof parsed.offsetX === 'number'
          ? `${parsed.offsetX >= 0 ? '+' : ''}${parsed.offsetX.toFixed(2)}m`
          : null;
      const oy =
        typeof parsed.offsetY === 'number'
          ? `${parsed.offsetY >= 0 ? '+' : ''}${parsed.offsetY.toFixed(2)}m`
          : null;
      const parts = [`Camera phát hiện mã ArUco #${mid}`];
      if (dist) parts.push(`Khoảng cách: ${dist}`);
      if (ox && oy) parts.push(`Lệch X: ${ox}, Y: ${oy}`);
      return parts.join(' · ');
    }
    if (parsed.action && (parsed.boxId || parsed.box_id)) {
      return `Lệnh ${parsed.action} nắp trượt cho ô #${parsed.boxId ?? parsed.box_id}`;
    }
    if (parsed.hwState && parsed.status) {
      return `Phản hồi phần cứng tủ: ${parsed.status} (Trạng thái nắp: ${parsed.hwState})`;
    }
  }

  switch (log.eventType) {
    case 'MARKER_DETECTED':
      return `Camera Drone phát hiện mã ArUco #${log.markerId ?? '?'}`;
    case 'MARKER_VALIDATED':
      return 'Xác thực mã ArUco hợp lệ với ô tủ đích';
    case 'OPEN_LID_REQUESTED':
      return 'Gửi lệnh yêu cầu mở nắp trượt ô tủ';
    case 'LID_OPENED':
      return 'Nắp trượt ô tủ đã mở hoàn toàn';
    case 'DROP_PHASE_STARTED':
      return 'Bắt đầu đếm ngược thời gian giữ mở nắp trượt';
    case 'DROP_PHASE_COMPLETED':
      return 'Hoàn tất giai đoạn thả hàng / giữ mở nắp trượt';
    case 'CLOSE_LID_REQUESTED':
      return 'Gửi lệnh yêu cầu đóng nắp trượt ô tủ';
    case 'LID_CLOSED':
      return 'Nắp trượt ô tủ đã đóng hoàn toàn và khóa an toàn';
    case 'DELIVERY_READY':
      return 'Giao hàng hoàn tất — Kiện hàng sẵn sàng để khách nhận';
    default:
      return '—';
  }
}

function getEventActorType(log: DroneLockerCommLog): 'LOCKER' | 'DRONE' {
  const evt = (log.eventType || '').toUpperCase();
  const src = (log.sourceDevice || '').toUpperCase();
  const dest = (log.destinationDevice || log.targetDevice || '').toUpperCase();

  if (
    src === 'LOCKER' ||
    dest === 'LOCKER' ||
    evt === 'OPEN_LID_REQUESTED' ||
    evt === 'LID_OPENED' ||
    evt === 'LID_OPEN_FAILED' ||
    evt === 'DROP_PHASE_STARTED' ||
    evt === 'DROP_PHASE_COMPLETED' ||
    evt === 'CLOSE_LID_REQUESTED' ||
    evt === 'LID_CLOSED' ||
    evt === 'LID_CLOSE_FAILED'
  ) {
    return 'LOCKER';
  }

  return 'DRONE';
}

export default function DroneLogsPage() {
  // Filters
  const [orderIdInput, setOrderIdInput] = useState<string>('');
  const [droneIdInput, setDroneIdInput] = useState<string>('');
  const [eventType, setEventType] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  const pageSize = 20;

  // Queries (auto-poll every 5s so new logs appear live in the table)
  const {
    data: logsData,
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useGetDroneCommLogsQuery(
    {
      orderId: orderIdInput.trim() ? Number(orderIdInput.trim()) : undefined,
      droneId: droneIdInput.trim() ? droneIdInput.trim() : undefined,
      eventType: eventType === 'ALL' ? undefined : eventType,
      processingStatus: status === 'ALL' ? undefined : status,
      fromDate: '2020-01-01',
      toDate: '2099-12-31',
      page,
      size: pageSize,
    },
    {
      pollingInterval: 5000,
    }
  );

  // Reference data for linking Order, Drone, and Locker
  const { data: dronesRes } = useGetDronesQuery();
  const { data: lockersRes } = useGetLockerStatsQuery();
  const { data: droneOrdersRes } = useGetAdminDroneOrderListQuery({ includeFinished: true });

  const droneByCode = useMemo(() => {
    const map = new Map<string, DroneResponse>();
    const list = dronesRes?.data ?? [];
    for (const d of list) {
      if (d.code) {
        map.set(d.code.toUpperCase(), d);
      }
    }
    return map;
  }, [dronesRes]);

  const lockerById = useMemo(() => {
    const map = new Map<number, LockerStatsResponse>();
    const list = lockersRes?.data ?? [];
    for (const l of list) {
      if (typeof l.lockerId === 'number') {
        map.set(l.lockerId, l);
      }
    }
    return map;
  }, [lockersRes]);

  const orderById = useMemo(() => {
    const map = new Map<number, DroneOrderTracking>();
    const list = droneOrdersRes?.data ?? [];
    for (const o of list) {
      if (typeof o.orderId === 'number') {
        map.set(o.orderId, o);
      }
    }
    return map;
  }, [droneOrdersRes]);

  const logs = logsData?.data?.content ?? [];
  const totalElements = logsData?.data?.totalElements ?? 0;
  const totalPages = logsData?.data?.totalPages ?? 1;

  const handleRefreshAll = () => {
    refetchLogs();
    toast.success('Đã cập nhật nhật ký giao tiếp Drone & Tủ');
  };

  const renderEventBadge = (type: string) => {
    switch (type) {
      case 'MARKER_DETECTED':
        return <Badge className="bg-sky-600 text-white font-mono text-[11px]">MARKER_DETECTED</Badge>;
      case 'MARKER_VALIDATED':
        return <Badge className="bg-emerald-600 text-white font-mono text-[11px]">MARKER_VALIDATED</Badge>;
      case 'OPEN_LID_REQUESTED':
        return <Badge className="bg-indigo-600 text-white font-mono text-[11px]">OPEN_LID_REQUESTED</Badge>;
      case 'LID_OPENED':
        return <Badge className="bg-blue-600 text-white font-mono text-[11px]">LID_OPENED</Badge>;
      case 'DROP_PHASE_STARTED':
        return <Badge className="bg-amber-600 text-white font-mono text-[11px]">DROP_PHASE_STARTED</Badge>;
      case 'DROP_PHASE_COMPLETED':
        return <Badge className="bg-teal-600 text-white font-mono text-[11px]">DROP_PHASE_COMPLETED</Badge>;
      case 'CLOSE_LID_REQUESTED':
        return <Badge className="bg-violet-600 text-white font-mono text-[11px]">CLOSE_LID_REQUESTED</Badge>;
      case 'LID_CLOSED':
        return <Badge className="bg-purple-600 text-white font-mono text-[11px]">LID_CLOSED</Badge>;
      case 'DELIVERY_READY':
        return <Badge className="bg-green-700 text-white font-mono text-[11px]">DELIVERY_READY</Badge>;
      case 'MARKER_REJECTED':
      case 'WRONG_MARKER':
        return <Badge className="bg-rose-600 text-white font-mono text-[11px]">{type}</Badge>;
      case 'LID_OPEN_FAILED':
      case 'LID_CLOSE_FAILED':
      case 'SAFETY_ABORT':
        return <Badge className="bg-red-700 text-white font-mono text-[11px]">{type}</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[11px]">{type}</Badge>;
    }
  };

  const renderStatusBadge = (s: string | undefined | null) => {
    const normalized = (s || 'PENDING').toUpperCase();
    switch (normalized) {
      case 'SUCCESS':
      case 'PROCESSED':
        return (
          <Badge
            variant="outline"
            className="text-emerald-600 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[11px]"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Thành công
          </Badge>
        );
      case 'PROCESSING':
      case 'PENDING':
        return (
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-[11px]"
          >
            <Clock className="w-3 h-3 mr-1" /> Đang xử lý
          </Badge>
        );
      case 'REJECTED':
      case 'FAILED':
      case 'ERROR':
      case 'ABORTED':
        return (
          <Badge
            variant="outline"
            className="text-rose-600 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-[11px]"
          >
            <XCircle className="w-3 h-3 mr-1" /> {normalized === 'REJECTED' ? 'Từ chối' : 'Lỗi'}
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[11px]">{normalized}</Badge>;
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <PageHeader
        title="Nhật ký giao tiếp Drone & Tủ Smart Locker"
        description="Theo dõi trực tiếp thông điệp MQTT, nội dung phản hồi, trạng thái xử lý và liên kết tới Đơn hàng, Drone, Tủ thông minh"
        action={{
          label: logsFetching ? 'Đang cập nhật...' : 'Làm mới',
          onClick: handleRefreshAll,
          icon: RefreshCw,
        }}
      />

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mã đơn hàng (ID)</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Ví dụ: 1024"
                  value={orderIdInput}
                  onChange={(e) => {
                    setOrderIdInput(e.target.value);
                    setPage(0);
                  }}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mã Drone</label>
              <Input
                placeholder="Ví dụ: DRONE-S550-07"
                value={droneIdInput}
                onChange={(e) => {
                  setDroneIdInput(e.target.value);
                  setPage(0);
                }}
                className="text-xs h-8 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Loại sự kiện</label>
              <Select
                value={eventType}
                onValueChange={(val) => {
                  setEventType(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Tất cả sự kiện" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả sự kiện</SelectItem>
                  <SelectItem value="MARKER_DETECTED">MARKER_DETECTED</SelectItem>
                  <SelectItem value="MARKER_VALIDATED">MARKER_VALIDATED</SelectItem>
                  <SelectItem value="OPEN_LID_REQUESTED">OPEN_LID_REQUESTED</SelectItem>
                  <SelectItem value="LID_OPENED">LID_OPENED</SelectItem>
                  <SelectItem value="DROP_PHASE_STARTED">DROP_PHASE_STARTED</SelectItem>
                  <SelectItem value="DROP_PHASE_COMPLETED">DROP_PHASE_COMPLETED</SelectItem>
                  <SelectItem value="CLOSE_LID_REQUESTED">CLOSE_LID_REQUESTED</SelectItem>
                  <SelectItem value="LID_CLOSED">LID_CLOSED</SelectItem>
                  <SelectItem value="DELIVERY_READY">DELIVERY_READY</SelectItem>
                  <SelectItem value="MARKER_REJECTED">MARKER_REJECTED</SelectItem>
                  <SelectItem value="SAFETY_ABORT">SAFETY_ABORT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Trạng thái xử lý</label>
              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="SUCCESS">Thành công</SelectItem>
                  <SelectItem value="PENDING">Đang xử lý</SelectItem>
                  <SelectItem value="REJECTED">Từ chối</SelectItem>
                  <SelectItem value="FAILED">Lỗi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table Card */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              Danh sách thông điệp giao tiếp ({totalElements})
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Trang {page + 1} / {totalPages}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">Thời gian</th>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">Sự kiện</th>
                  <th className="py-2.5 px-4 text-left font-semibold">Nội dung thông điệp (Message)</th>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">Đối tượng</th>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">ArUco Marker</th>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2" />
                      Đang tải danh sách nhật ký giao tiếp...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Không có thông điệp giao tiếp nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const orderInfo = log.orderId ? orderById.get(log.orderId) : undefined;
                    const resolvedDroneCode = log.droneId || orderInfo?.droneCode || null;
                    const droneUnit = resolvedDroneCode
                      ? droneByCode.get(resolvedDroneCode.toUpperCase())
                      : undefined;
                    const resolvedDroneUnitId = droneUnit?.id ?? orderInfo?.droneUnitId ?? null;

                    const resolvedLockerId = log.lockerId ?? orderInfo?.destinationLockerId ?? null;
                    const lockerInfo = resolvedLockerId ? lockerById.get(resolvedLockerId) : undefined;
                    const resolvedCompartmentId =
                      log.compartmentId ?? orderInfo?.reservedBoxId ?? null;
                    const resolvedBoxNumber = orderInfo?.reservedBoxNumber ?? null;

                    const actorType = getEventActorType(log);
                    const messageText = resolveLogMessage(log);
                    const isErr = isErrorStatus(log);
                    const parsedPayload = parsePayloadObject(log);

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors align-middle">
                        {/* 1. Thời gian */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-foreground font-medium">
                            {formatDateTime(log.timestamp)}
                          </div>
                        </td>

                        {/* 2. Sự kiện */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderEventBadge(log.eventType)}
                        </td>

                        {/* 3. Nội dung thông điệp (Message) */}
                        <td className="py-3 px-4 min-w-[260px]">
                          <div className="flex items-start gap-1.5">
                            {isErr ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            ) : (
                              <MessageSquareText className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-0.5">
                              {log.errorCode && (
                                <span className="inline-block font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 mr-1">
                                  {log.errorCode}
                                </span>
                              )}
                              <p
                                className={`text-xs leading-relaxed break-words ${
                                  isErr
                                    ? 'text-rose-600 dark:text-rose-400 font-medium'
                                    : 'text-foreground'
                                }`}
                              >
                                {messageText}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 4. Đơn hàng & Thiết bị (Chỉ hiện đối tượng thực hiện sự kiện + đơn hàng) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {/* Đối tượng thực hiện sự kiện (Drone hoặc Tủ) */}
                            {actorType === 'LOCKER' && resolvedLockerId ? (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Link
                                  to={`/admin/lockers/${resolvedLockerId}`}
                                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                  title="Mở sơ đồ ô tủ & cấu hình mã ArUco"
                                >
                                  <Boxes className="w-3 h-3" />
                                  <span>
                                    Tủ {lockerInfo?.code ? ` ${lockerInfo.code}` : ''}
                                  </span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </Link>
                                {resolvedCompartmentId && (
                                  <Link
                                    to={`/admin/lockers/${resolvedLockerId}`}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-muted text-foreground hover:bg-muted/80 font-mono text-[10px]"
                                    title={`Ô tủ ID #${resolvedCompartmentId}${
                                      resolvedBoxNumber ? ` (Ô số ${resolvedBoxNumber})` : ''
                                    }`}
                                  >
                                    Ô {resolvedBoxNumber ? ` số ${resolvedBoxNumber}` : ''}
                                  </Link>
                                )}
                              </div>
                            ) : resolvedDroneCode ? (
                              <div>
                                <Link
                                  to={
                                    resolvedDroneUnitId
                                      ? `/admin/drones/${resolvedDroneUnitId}`
                                      : '/admin/drones'
                                  }
                                  className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                                  title={
                                    resolvedDroneUnitId
                                      ? `Mở trang điều khiển & camera của ${resolvedDroneCode} (ID #${resolvedDroneUnitId})`
                                      : `Xem danh sách Drone (${resolvedDroneCode})`
                                  }
                                >
                                  <Plane className="w-3 h-3" />
                                  <span>{resolvedDroneCode}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </Link>
                              </div>
                            ) : null}

                            {/* Link Đơn hàng (nếu có) */}
                            {log.orderId ? (
                              <div className="flex items-center gap-1.5">
                                <Link
                                  to={`/admin/orders/${log.orderId}`}
                                  className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                                  title="Xem chi tiết đơn hàng"
                                >
                                  <Package className="w-3 h-3" />
                                  <span>
                                    Đơn
                                    #{orderInfo?.orderCode ? `${orderInfo.orderCode}` : ''}
                                  </span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* 5. ArUco Marker */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.markerId !== null && log.markerId !== undefined ? (
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
                                className="font-mono text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                              >
                                #{log.markerId}
                              </Badge>
                              {typeof parsedPayload?.distanceM === 'number' && (
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  Dist: {parsedPayload.distanceM.toFixed(2)}m
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* 6. Trạng thái */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderStatusBadge(log.processingStatus)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-xs text-muted-foreground">
                Hiển thị trang {page + 1} trên {totalPages} ({totalElements} bản ghi)
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Trước
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

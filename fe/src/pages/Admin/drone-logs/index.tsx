import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  CornerDownRight,
  ExternalLink,
  Layers,
  MessageSquareText,
  MinusCircle,
  Package,
  Plane,
  RefreshCw,
  Search,
  Server,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '~/components/shared/page-header';
import { StandalonePagination } from '~/components/shared/data-table/DataTablePagination';
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
import { describeDroneCommLog, isDroneCommLogError } from '~/lib/droneCommLogMessage';

type Device = 'DRONE' | 'LOCKER' | 'BACKEND';

/// Sự kiện mà bên GỬI là tủ / drone — dùng khi bản ghi cũ thiếu sourceDevice.
const LOCKER_SENT_EVENTS = new Set([
  'LID_OPEN_ACCEPTED',
  'LID_CLOSE_ACCEPTED',
  'LID_OPENED',
  'LID_OPEN_RESULT',
  'LID_CLOSED',
  'LID_CLOSE_RESULT',
]);
const BACKEND_SENT_EVENTS = new Set([
  'OPEN_LID_REQUESTED',
  'CLOSE_LID_REQUESTED',
  'DROP_PHASE_STARTED',
  'DROP_REPORT_TIMEOUT',
]);

function normalizeDevice(value: string | null | undefined): Device | null {
  const v = (value || '').toUpperCase();
  if (v === 'DRONE' || v === 'LOCKER' || v === 'BACKEND') return v;
  return null;
}

/// Bên gửi thông điệp (cột "Đối tượng").
function senderOf(log: DroneLockerCommLog): Device {
  const src = normalizeDevice(log.sourceDevice);
  if (src) return src;
  const evt = (log.eventType || '').toUpperCase();
  if (LOCKER_SENT_EVENTS.has(evt)) return 'LOCKER';
  if (BACKEND_SENT_EVENTS.has(evt)) return 'BACKEND';
  return 'DRONE';
}

/// Bên nhận thông điệp (dòng nhỏ "Gửi tới …").
function recipientOf(log: DroneLockerCommLog, sender: Device): Device | null {
  const dest = normalizeDevice(log.destinationDevice) ?? normalizeDevice(log.targetDevice);
  if (dest) return dest;
  return sender === 'BACKEND' ? null : 'BACKEND';
}

/// "mã ArUco #7" (vi) / "ArUco marker #7" (en) trong nội dung ⇒ hiển thị trong badge.
const ARUCO_PATTERN = /(mã ArUco #\d+|ArUco marker #\d+)/gi;

function MessageWithArucoBadges({ text }: { text: string }) {
  const parts = text.split(ARUCO_PATTERN);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Badge
            key={index}
            variant="outline"
            className="mx-0.5 align-baseline font-mono text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
          >
            {part}
          </Badge>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/// Kết quả cuối của một lệnh nắp (theo mã lệnh = messageId): tủ báo đã mở/đóng xong hoặc lỗi.
const FINAL_SUCCESS_EVENTS = new Set(['LID_OPENED', 'LID_CLOSED']);
const FINAL_FAILURE_EVENTS = new Set(['LID_OPEN_FAILED', 'LID_CLOSE_FAILED']);

function finalStatusByCommand(logs: DroneLockerCommLog[]): Map<string, 'SUCCESS' | 'FAILED'> {
  const map = new Map<string, 'SUCCESS' | 'FAILED'>();
  for (const log of logs) {
    // Lệnh nhả hàng (mã "DROP-<phiên>") xong khi drone báo DROP_PHASE_COMPLETED thành công cho phiên đó.
    if (log.eventType === 'DROP_PHASE_COMPLETED' && log.sessionId
        && (log.processingStatus || '').toUpperCase() === 'SUCCESS') {
      map.set(`DROP-${log.sessionId}`, 'SUCCESS');
    }
    if (!log.messageId) continue;
    if (FINAL_SUCCESS_EVENTS.has(log.eventType)) map.set(log.messageId, 'SUCCESS');
    else if (FINAL_FAILURE_EVENTS.has(log.eventType)) map.set(log.messageId, 'FAILED');
  }
  return map;
}

type DisplayItem =
  | { kind: 'single'; log: DroneLockerCommLog }
  | { kind: 'group'; orderId: number; logs: DroneLockerCommLog[] };

/// Gom các thông điệp cùng đơn thành một nhóm, đặt ở vị trí thông điệp mới nhất của đơn (danh sách đã sắp
/// mới nhất trước). Thông điệp không thuộc đơn nào đứng riêng, không gộp.
function groupByOrder(logs: DroneLockerCommLog[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  const groups = new Map<number, { kind: 'group'; orderId: number; logs: DroneLockerCommLog[] }>();
  for (const log of logs) {
    if (typeof log.orderId !== 'number') {
      items.push({ kind: 'single', log });
      continue;
    }
    const existing = groups.get(log.orderId);
    if (existing) {
      existing.logs.push(log);
    } else {
      const group = { kind: 'group' as const, orderId: log.orderId, logs: [log] };
      groups.set(log.orderId, group);
      items.push(group);
    }
  }
  return items;
}

export default function DroneLogsPage() {
  const { t } = useTranslation();

  // Filters
  const [orderIdInput, setOrderIdInput] = useState<string>('');
  const [droneIdInput, setDroneIdInput] = useState<string>('');
  const [eventType, setEventType] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  // Một lượt giao ~10 thông điệp: trang lớn để nhóm theo đơn ít bị cắt sang trang sau.
  const [pageSize, setPageSize] = useState<number>(50);
  // Nhóm theo đơn mặc định thu gọn; giữ lựa chọn qua các lượt tự làm mới.
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(() => new Set());

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
    for (const d of dronesRes?.data ?? []) {
      if (d.code) map.set(d.code.toUpperCase(), d);
    }
    return map;
  }, [dronesRes]);

  const lockerById = useMemo(() => {
    const map = new Map<number, LockerStatsResponse>();
    for (const l of lockersRes?.data ?? []) {
      if (typeof l.lockerId === 'number') map.set(l.lockerId, l);
    }
    return map;
  }, [lockersRes]);

  const orderById = useMemo(() => {
    const map = new Map<number, DroneOrderTracking>();
    for (const o of droneOrdersRes?.data ?? []) {
      if (typeof o.orderId === 'number') map.set(o.orderId, o);
    }
    return map;
  }, [droneOrdersRes]);

  const logs: DroneLockerCommLog[] = logsData?.data?.content ?? [];
  const totalElements = logsData?.data?.totalElements ?? 0;
  const totalPages = logsData?.data?.totalPages ?? 1;
  const displayItems = useMemo(() => groupByOrder(logs), [logs]);
  // Dòng "đã gửi lệnh" / "tủ đã nhận lệnh" lưu trước khi backend tự cập nhật: lấy trạng thái theo kết quả cuối
  // của cùng mã lệnh, để không treo "Đang xử lý" khi tủ đã báo xong.
  const finalByCommand = useMemo(() => finalStatusByCommand(logs), [logs]);
  const statusOf = (log: DroneLockerCommLog): string => {
    const s = (log.processingStatus || 'PENDING').toUpperCase();
    if ((s === 'PENDING' || s === 'PROCESSING') && log.messageId) {
      return finalByCommand.get(log.messageId) ?? s;
    }
    return s;
  };
  const groupOrderIds = useMemo(
    () => displayItems.flatMap((item) => (item.kind === 'group' ? [item.orderId] : [])),
    [displayItems]
  );
  const allExpanded = groupOrderIds.length > 0 && groupOrderIds.every((id) => expandedOrders.has(id));

  const handleRefreshAll = () => {
    refetchLogs();
    toast.success(t('admin.droneLogs.toast.refreshed'));
  };

  const toggleOrder = (orderId: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleAll = () => {
    setExpandedOrders(allExpanded ? new Set() : new Set(groupOrderIds));
  };

  // ─── ngữ cảnh một thông điệp: drone, tủ, ô ───
  const contextOf = (log: DroneLockerCommLog) => {
    const orderInfo = log.orderId ? orderById.get(log.orderId) : undefined;
    const droneCode = log.droneId || orderInfo?.droneCode || null;
    const droneUnit = droneCode ? droneByCode.get(droneCode.toUpperCase()) : undefined;
    const lockerId = log.lockerId ?? orderInfo?.destinationLockerId ?? null;
    return {
      orderInfo,
      droneCode,
      droneUnitId: droneUnit?.id ?? orderInfo?.droneUnitId ?? null,
      lockerId,
      lockerInfo: lockerId ? lockerById.get(lockerId) : undefined,
      compartmentId: log.compartmentId ?? orderInfo?.reservedBoxId ?? null,
      boxNumber: orderInfo?.reservedBoxNumber ?? null,
    };
  };

  const lockerLabel = (ctx: ReturnType<typeof contextOf>) =>
    t('admin.droneLogs.locker', {
      label: ctx.lockerInfo?.code ? ctx.lockerInfo.code : `#${ctx.lockerId}`,
    });

  const boxLabel = (ctx: ReturnType<typeof contextOf>) =>
    ctx.boxNumber
      ? t('admin.droneLogs.boxNumber', { n: ctx.boxNumber })
      : ctx.compartmentId
        ? t('admin.droneLogs.boxId', { id: ctx.compartmentId })
        : null;

  /// Bên gửi: hiển thị nổi bật, có liên kết.
  const renderSender = (device: Device, ctx: ReturnType<typeof contextOf>) => {
    if (device === 'LOCKER' && ctx.lockerId) {
      const box = boxLabel(ctx);
      return (
        <div className="flex items-center gap-1.5 text-[11px]">
          <Link
            to={`/admin/lockers/${ctx.lockerId}`}
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            title={t('admin.droneLogs.lockerLinkTitle')}
          >
            <Boxes className="w-3 h-3" />
            <span>{lockerLabel(ctx)}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </Link>
          {box && (
            <span
              className="inline-flex items-center px-1.5 rounded bg-muted text-foreground font-mono text-[10px]"
              title={
                ctx.compartmentId
                  ? ctx.boxNumber
                    ? t('admin.droneLogs.boxTitleWithNumber', { id: ctx.compartmentId, n: ctx.boxNumber })
                    : t('admin.droneLogs.boxTitle', { id: ctx.compartmentId })
                  : undefined
              }
            >
              {box}
            </span>
          )}
        </div>
      );
    }
    if (device === 'DRONE' && ctx.droneCode) {
      return (
        <Link
          to={ctx.droneUnitId ? `/admin/drones/${ctx.droneUnitId}` : '/admin/drones'}
          className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
          title={
            ctx.droneUnitId
              ? t('admin.droneLogs.droneLinkTitle', { code: ctx.droneCode, id: ctx.droneUnitId })
              : t('admin.droneLogs.droneListTitle', { code: ctx.droneCode })
          }
        >
          <Plane className="w-3 h-3" />
          <span>{ctx.droneCode}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </Link>
      );
    }
    if (device === 'BACKEND') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
          <Server className="w-3 h-3" />
          {t('admin.droneLogs.party.system')}
        </span>
      );
    }
    return (
      <span className="text-[11px] text-muted-foreground">
        {device === 'LOCKER' ? t('admin.droneLogs.party.locker') : t('admin.droneLogs.party.drone')}
      </span>
    );
  };

  /// Tên bên nhận (chữ nhỏ dưới bên gửi).
  const recipientName = (device: Device, ctx: ReturnType<typeof contextOf>) => {
    if (device === 'BACKEND') return t('admin.droneLogs.party.system');
    if (device === 'DRONE') return ctx.droneCode || t('admin.droneLogs.party.drone');
    if (!ctx.lockerId) return t('admin.droneLogs.party.locker');
    const box = boxLabel(ctx);
    return box ? `${lockerLabel(ctx)} · ${box}` : lockerLabel(ctx);
  };

  const renderEventBadge = (type: string) => {
    switch (type) {
      case 'MARKER_DETECTED':
        return <Badge className="bg-sky-600 text-white font-mono text-[11px]">MARKER_DETECTED</Badge>;
      case 'MARKER_VALIDATED':
        return <Badge className="bg-emerald-600 text-white font-mono text-[11px]">MARKER_VALIDATED</Badge>;
      case 'OPEN_LID_REQUESTED':
        return <Badge className="bg-indigo-600 text-white font-mono text-[11px]">OPEN_LID_REQUESTED</Badge>;
      case 'LID_OPEN_ACCEPTED':
      case 'LID_CLOSE_ACCEPTED':
        return <Badge className="bg-cyan-600 text-white font-mono text-[11px]">{type}</Badge>;
      case 'TARGET_REQUEST':
        return <Badge className="bg-slate-600 text-white font-mono text-[11px]">TARGET_REQUEST</Badge>;
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
      case 'DROP_REPORT_TIMEOUT':
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
            <CheckCircle2 className="w-3 h-3 mr-1" /> {t('common.success')}
          </Badge>
        );
      case 'PROCESSING':
      case 'PENDING':
        return (
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-[11px]"
          >
            <Clock className="w-3 h-3 mr-1" /> {t('admin.lockers.logs.result.pending')}
          </Badge>
        );
      case 'IGNORED':
        return (
          <Badge variant="outline" className="text-muted-foreground text-[11px]">
            <MinusCircle className="w-3 h-3 mr-1" /> {t('admin.droneLogs.status.ignored')}
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
            <XCircle className="w-3 h-3 mr-1" />{' '}
            {normalized === 'REJECTED' ? t('admin.droneLogs.status.rejected') : t('admin.droneLogs.status.error')}
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[11px]">{normalized}</Badge>;
    }
  };

  const renderLogRow = (log: DroneLockerCommLog, nested: boolean) => {
    const ctx = contextOf(log);
    const sender = senderOf(log);
    const recipient = recipientOf(log, sender);
    const messageText = describeDroneCommLog(log);
    const isErr = isDroneCommLogError(log);

    return (
      <tr
        key={log.id}
        className={`hover:bg-muted/30 transition-colors align-middle ${nested ? 'bg-muted/10' : ''}`}
      >
        {/* 1. Thời gian */}
        <td className={`py-3 pr-4 whitespace-nowrap ${nested ? 'pl-10' : 'pl-4'}`}>
          <div className="font-mono text-[11px] text-foreground font-medium">{formatDateTime(log.timestamp)}</div>
        </td>

        {/* 2. Đối tượng: bên GỬI thông điệp, chữ nhỏ bên dưới là bên NHẬN */}
        <td className="py-3 px-4 whitespace-nowrap">
          <div className="space-y-0.5">
            {renderSender(sender, ctx)}
            {recipient && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CornerDownRight className="w-2.5 h-2.5" />
                <span>{t('admin.droneLogs.sentTo', { name: recipientName(recipient, ctx) })}</span>
              </div>
            )}
          </div>
        </td>

        {/* 3. Sự kiện */}
        <td className="py-3 px-4 whitespace-nowrap">{renderEventBadge(log.eventType)}</td>

        {/* 4. Nội dung thông điệp — "mã ArUco #N" hiển thị trong badge */}
        <td className="py-3 px-4 min-w-[280px]">
          <div className="flex items-start gap-1.5">
            {isErr ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            ) : (
              <MessageSquareText className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              {log.errorCode && isErr && (
                <span className="inline-block font-mono text-[10px] font-semibold px-1.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 mr-1">
                  {log.errorCode}
                </span>
              )}
              <p
                className={`text-xs leading-relaxed break-words ${
                  isErr ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-foreground'
                }`}
              >
                <MessageWithArucoBadges text={messageText} />
              </p>
            </div>
          </div>
        </td>

        {/* 5. Trạng thái */}
        <td className="py-3 px-4 whitespace-nowrap">{renderStatusBadge(statusOf(log))}</td>
      </tr>
    );
  };

  const renderGroup = (orderId: number, groupLogs: DroneLockerCommLog[]) => {
    const expanded = expandedOrders.has(orderId);
    const newest = groupLogs[0];
    const oldest = groupLogs[groupLogs.length - 1];
    const ctx = contextOf(newest);
    const errorCount = groupLogs.filter(isDroneCommLogError).length;
    const box = boxLabel(ctx);

    return (
      <React.Fragment key={`order-${orderId}`}>
        <tr
          className="bg-muted/40 hover:bg-muted/60 cursor-pointer select-none border-t border-border"
          onClick={() => toggleOrder(orderId)}
          aria-expanded={expanded}
        >
          <td colSpan={5} className="py-2.5 px-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
              <Link
                to={`/admin/orders/${orderId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                title={t('admin.droneLogs.orderLinkTitle')}
              >
                <Package className="w-3.5 h-3.5" />
                {t('admin.lockers.logs.orderRef', { id: ctx.orderInfo?.orderCode ?? orderId })}
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </Link>
              {ctx.droneCode && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                  <Plane className="w-3 h-3" />
                  {ctx.droneCode}
                </span>
              )}
              {ctx.lockerId && (
                <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                  <Boxes className="w-3 h-3" />
                  {lockerLabel(ctx)}
                  {box ? ` · ${box}` : ''}
                </span>
              )}
              <Badge variant="secondary" className="text-[11px] font-normal">
                {t('admin.droneLogs.group.messageCount', { count: groupLogs.length })}
              </Badge>
              {errorCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-rose-600 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-[11px]"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('admin.droneLogs.group.errorCount', { count: errorCount })}
                </Badge>
              )}
              <span className="font-mono text-[11px] text-muted-foreground">
                {groupLogs.length > 1
                  ? `${formatDateTime(oldest.timestamp)} → ${formatDateTime(newest.timestamp)}`
                  : formatDateTime(newest.timestamp)}
              </span>
              <span className="ml-auto inline-flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{t('admin.droneLogs.group.latest')}</span>
                {renderEventBadge(newest.eventType)}
                {renderStatusBadge(statusOf(newest))}
              </span>
            </div>
          </td>
        </tr>
        {expanded && groupLogs.map((log) => renderLogRow(log, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <PageHeader
        title={t('admin.droneLogs.title')}
        description={t('admin.droneLogs.description')}
        action={{
          label: logsFetching ? t('admin.stores.detail.updating') : t('button.refresh'),
          onClick: handleRefreshAll,
          icon: RefreshCw,
        }}
      />

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('admin.droneLogs.filter.orderId')}</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder={t('admin.droneLogs.filter.orderIdPlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('admin.drones.detail.info.code')}</label>
              <Input
                placeholder={t('admin.droneLogs.filter.dronePlaceholder')}
                value={droneIdInput}
                onChange={(e) => {
                  setDroneIdInput(e.target.value);
                  setPage(0);
                }}
                className="text-xs h-8 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('admin.lockers.logs.filter.eventType')}</label>
              <Select
                value={eventType}
                onValueChange={(val) => {
                  setEventType(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder={t('admin.droneLogs.filter.allEvents')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('admin.droneLogs.filter.allEvents')}</SelectItem>
                  <SelectItem value="TARGET_REQUEST">TARGET_REQUEST</SelectItem>
                  <SelectItem value="MARKER_DETECTED">MARKER_DETECTED</SelectItem>
                  <SelectItem value="MARKER_VALIDATED">MARKER_VALIDATED</SelectItem>
                  <SelectItem value="OPEN_LID_REQUESTED">OPEN_LID_REQUESTED</SelectItem>
                  <SelectItem value="LID_OPEN_ACCEPTED">LID_OPEN_ACCEPTED</SelectItem>
                  <SelectItem value="LID_OPENED">LID_OPENED</SelectItem>
                  <SelectItem value="LID_OPEN_FAILED">LID_OPEN_FAILED</SelectItem>
                  <SelectItem value="DROP_PHASE_STARTED">DROP_PHASE_STARTED</SelectItem>
                  <SelectItem value="DROP_PHASE_COMPLETED">DROP_PHASE_COMPLETED</SelectItem>
                  <SelectItem value="DROP_REPORT_TIMEOUT">DROP_REPORT_TIMEOUT</SelectItem>
                  <SelectItem value="CLOSE_LID_REQUESTED">CLOSE_LID_REQUESTED</SelectItem>
                  <SelectItem value="LID_CLOSE_ACCEPTED">LID_CLOSE_ACCEPTED</SelectItem>
                  <SelectItem value="LID_CLOSED">LID_CLOSED</SelectItem>
                  <SelectItem value="LID_CLOSE_FAILED">LID_CLOSE_FAILED</SelectItem>
                  <SelectItem value="DELIVERY_READY">DELIVERY_READY</SelectItem>
                  <SelectItem value="MARKER_REJECTED">MARKER_REJECTED</SelectItem>
                  <SelectItem value="SAFETY_ABORT">SAFETY_ABORT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('admin.droneLogs.filter.processingStatus')}</label>
              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder={t('admin.feedback.filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('admin.feedback.filters.allStatuses')}</SelectItem>
                  <SelectItem value="SUCCESS">{t('common.success')}</SelectItem>
                  <SelectItem value="PENDING">{t('admin.lockers.logs.result.pending')}</SelectItem>
                  <SelectItem value="IGNORED">{t('admin.droneLogs.status.ignored')}</SelectItem>
                  <SelectItem value="REJECTED">{t('admin.droneLogs.status.rejected')}</SelectItem>
                  <SelectItem value="FAILED">{t('admin.droneLogs.status.error')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table Card */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              {t('admin.droneLogs.listTitle', { total: totalElements })}
            </CardTitle>
            {groupOrderIds.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={toggleAll}>
                {allExpanded ? (
                  <ChevronsDownUp className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
                )}
                {allExpanded ? t('admin.droneLogs.group.collapseAll') : t('admin.droneLogs.group.expandAll')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">{t('common.time')}</th>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">{t('admin.lockers.logs.col.actor')}</th>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">{t('admin.droneLogs.col.event')}</th>
                  <th className="py-2.5 px-4 text-left font-semibold">{t('admin.droneLogs.col.message')}</th>
                  <th className="py-2.5 px-4 text-left font-semibold whitespace-nowrap">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2" />
                      {t('admin.droneLogs.loading')}
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {t('admin.droneLogs.empty')}
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item) =>
                    item.kind === 'group' ? renderGroup(item.orderId, item.logs) : renderLogRow(item.log, false)
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Server-side Pagination matching Lock.R Admin standard */}
          <StandalonePagination
            pageIndex={page}
            pageSize={pageSize}
            pageCount={totalPages}
            totalRows={totalElements}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
            className="border-t border-border px-4 py-3"
          />
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  Filter,
  Layers,
  Plane,
  Radio,
  RefreshCw,
  Search,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '~/components/shared/page-header';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  useGetActiveDroneSessionsQuery,
  useGetDroneCommLogsQuery,
  useGetSessionTimelineQuery,
  type DroneActiveSession,
  type DroneLockerCommLog,
} from '~/stores/apis/admin/droneCommLogs';
import { formatDateTime } from '~/lib/datetime';

export default function DroneLogsPage() {
  const { t } = useTranslation();

  // Filters
  const [orderIdInput, setOrderIdInput] = useState<string>('');
  const [droneIdInput, setDroneIdInput] = useState<string>('');
  const [eventType, setEventType] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  const pageSize = 20;

  // Selected for modals
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<DroneLockerCommLog | null>(null);
  const [selectedTimelineSessionId, setSelectedTimelineSessionId] = useState<string | null>(null);

  // Queries
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useGetDroneCommLogsQuery({
    orderId: orderIdInput.trim() ? Number(orderIdInput.trim()) : undefined,
    droneId: droneIdInput.trim() ? droneIdInput.trim() : undefined,
    eventType: eventType === 'ALL' ? undefined : eventType,
    processingStatus: status === 'ALL' ? undefined : status,
    page,
    size: pageSize,
  });

  const { data: activeSessionsData, refetch: refetchSessions } = useGetActiveDroneSessionsQuery(undefined, {
    pollingInterval: 5000,
  });

  const logs = logsData?.data?.content ?? [];
  const totalElements = logsData?.data?.totalElements ?? 0;
  const totalPages = logsData?.data?.totalPages ?? 1;
  const activeSessions = activeSessionsData?.data ?? [];

  const handleRefreshAll = () => {
    refetchLogs();
    refetchSessions();
    toast.success('Đã cập nhật nhật ký giao tiếp Drone - Locker');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép vào bộ nhớ tạm');
  };

  const renderEventBadge = (type: string) => {
    switch (type) {
      case 'MARKER_DETECTED':
        return <Badge className="bg-sky-600 text-white font-mono text-[11px]">MARKER_DETECTED</Badge>;
      case 'MARKER_VALIDATED':
        return <Badge className="bg-emerald-600 text-white font-mono text-[11px]">MARKER_VALIDATED</Badge>;
      case 'LID_OPENED':
        return <Badge className="bg-blue-600 text-white font-mono text-[11px]">LID_OPENED</Badge>;
      case 'LID_CLOSED':
        return <Badge className="bg-purple-600 text-white font-mono text-[11px]">LID_CLOSED</Badge>;
      case 'DROP_PHASE_COMPLETED':
        return <Badge className="bg-teal-600 text-white font-mono text-[11px]">DROP_COMPLETED</Badge>;
      case 'DELIVERY_READY':
        return <Badge className="bg-green-700 text-white font-mono text-[11px]">DELIVERY_READY</Badge>;
      case 'WRONG_MARKER':
        return <Badge className="bg-rose-600 text-white font-mono text-[11px]">WRONG_MARKER</Badge>;
      case 'SAFETY_ABORT':
        return <Badge className="bg-red-700 text-white font-mono text-[11px]">SAFETY_ABORT</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[11px]">{type}</Badge>;
    }
  };

  const renderStatusBadge = (s: string) => {
    switch (s) {
      case 'PROCESSED':
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> PROCESSED
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-[11px]">
            <Clock className="w-3 h-3 mr-1" /> PROCESSING
          </Badge>
        );
      case 'REJECTED':
      case 'ERROR':
        return (
          <Badge variant="outline" className="text-rose-600 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-[11px]">
            <XCircle className="w-3 h-3 mr-1" /> {s}
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[11px]">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Nhật ký giao tiếp Drone & Tủ Smart Locker"
        description="Truy vết toàn diện thông điệp MQTT, nhận diện ArUco, bắt tay mở/đóng nắp trượt và cập nhật đơn hàng tự động"
        action={{
          label: 'Làm mới',
          onClick: handleRefreshAll,
          icon: RefreshCw,
        }}
      />


      {/* Active Sessions Panel (Real-time tracking) */}
      {activeSessions.length > 0 && (
        <Card className="border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/20 shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-sky-200 dark:border-sky-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-sky-900 dark:text-sky-200">
                <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
                Phiên giao hàng Drone đang hoạt động ({activeSessions.length})
              </CardTitle>
              <Badge className="bg-sky-600 text-white text-[11px]">Live MQTT</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSessions.map((session) => (
              <div
                key={session.sessionId}
                className="bg-card border border-border p-3.5 rounded-xl shadow-xs space-y-2 hover:border-sky-400 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {session.sessionId}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {session.mode || 'INDOOR_DEMO'}
                  </Badge>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>
                    Đơn hàng: <strong className="text-foreground">#{session.orderId}</strong> · Drone: <strong className="text-foreground">{session.droneId || 'DRONE-01'}</strong>
                  </p>
                  <p>
                    Tủ #{session.lockerId} · Ô #{session.compartmentId} · ArUco: <strong className="text-foreground">#{session.targetMarkerId}</strong>
                  </p>
                  <p className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
                    Trạng thái: {session.state}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7 mt-1 gap-1"
                  onClick={() => setSelectedTimelineSessionId(session.sessionId)}
                >
                  <Activity className="w-3 h-3 text-sky-500" /> Xem dòng thời gian
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mã đơn hàng</label>
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
                placeholder="Ví dụ: DRONE-01"
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
                  <SelectItem value="LID_OPENED">LID_OPENED</SelectItem>
                  <SelectItem value="LID_CLOSED">LID_CLOSED</SelectItem>
                  <SelectItem value="DROP_PHASE_COMPLETED">DROP_PHASE_COMPLETED</SelectItem>
                  <SelectItem value="DELIVERY_READY">DELIVERY_READY</SelectItem>
                  <SelectItem value="WRONG_MARKER">WRONG_MARKER</SelectItem>
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
                  <SelectItem value="PROCESSED">PROCESSED (Thành công)</SelectItem>
                  <SelectItem value="PROCESSING">PROCESSING (Đang xử lý)</SelectItem>
                  <SelectItem value="REJECTED">REJECTED (Từ chối)</SelectItem>
                  <SelectItem value="ERROR">ERROR (Lỗi)</SelectItem>
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
                  <th className="py-2.5 px-3 text-left font-semibold">Thời gian</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Phiên (Session ID)</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Sự kiện</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Luồng</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Đơn & Thiết bị</th>
                  <th className="py-2.5 px-3 text-left font-semibold">ArUco Marker</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Trạng thái</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logsLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2" />
                      Đang tải danh sách nhật ký giao tiếp...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Không có thông điệp giao tiếp nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        {log.sessionId ? (
                          <button
                            type="button"
                            className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                            onClick={() => setSelectedTimelineSessionId(log.sessionId!)}
                          >
                            <span>{log.sessionId.slice(0, 16)}...</span>
                            <Eye className="w-3 h-3 opacity-70" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {renderEventBadge(log.eventType)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <strong>{log.sourceDevice}</strong>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <strong>{log.targetDevice}</strong>
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {log.orderId && <div>Đơn: <strong>#{log.orderId}</strong></div>}
                          {log.droneId && <div className="text-muted-foreground font-mono">Drone: {log.droneId}</div>}
                          {log.lockerId && (
                            <div className="text-muted-foreground">
                              Tủ #{log.lockerId} {log.compartmentId ? `· Ô #${log.compartmentId}` : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {log.markerId !== null && log.markerId !== undefined ? (
                          <Badge variant="outline" className="font-mono text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                            #{log.markerId} ({log.markerDictionary || '4X4_50'})
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {renderStatusBadge(log.processingStatus)}
                        {log.errorMessage && (
                          <p className="text-[10px] text-rose-600 max-w-[180px] truncate" title={log.errorMessage}>
                            {log.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => setSelectedPayloadLog(log)}
                        >
                          <FileCode className="w-3.5 h-3.5 text-slate-500" />
                          <span>Payload</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-xs text-muted-foreground">
                Hiển thị trang {page + 1} trên {totalPages}
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

      {/* Modal 1: JSON Payload Viewer */}
      <Dialog open={!!selectedPayloadLog} onOpenChange={(open) => !open && setSelectedPayloadLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-500" />
                <span>Chi tiết thông điệp MQTT #{selectedPayloadLog?.id}</span>
              </div>
              {selectedPayloadLog && renderEventBadge(selectedPayloadLog.eventType)}
            </DialogTitle>
          </DialogHeader>

          {selectedPayloadLog && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-lg font-mono text-[11px]">
                <div>Topic: <strong>{selectedPayloadLog.mqttTopic}</strong></div>
                <div>Hướng: <strong>{selectedPayloadLog.direction}</strong></div>
                <div>Thiết bị: <strong>{selectedPayloadLog.sourceDevice} → {selectedPayloadLog.targetDevice}</strong></div>
                <div>Thời gian: <strong>{formatDateTime(selectedPayloadLog.timestamp)}</strong></div>
                <div>Session: <strong className="break-all">{selectedPayloadLog.sessionId || '—'}</strong></div>
                <div>Correlation: <strong className="break-all">{selectedPayloadLog.correlationId || '—'}</strong></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-muted-foreground">Raw JSON Payload</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] gap-1"
                    onClick={() => copyToClipboard(selectedPayloadLog.payloadJson || '{}')}
                  >
                    <Copy className="w-3 h-3" /> Sao chép
                  </Button>
                </div>
                <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-[300px]">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedPayloadLog.payloadJson || '{}'), null, 2);
                    } catch {
                      return selectedPayloadLog.payloadJson || '{}';
                    }
                  })()}
                </pre>
              </div>

              {selectedPayloadLog.errorMessage && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300">
                  <strong>Lỗi:</strong> {selectedPayloadLog.errorCode} — {selectedPayloadLog.errorMessage}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 2: Session Timeline Dialog */}
      <SessionTimelineDialog
        sessionId={selectedTimelineSessionId}
        onClose={() => setSelectedTimelineSessionId(null)}
      />
    </div>
  );
}

// Timeline Component
function SessionTimelineDialog({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { data: timelineData, isLoading } = useGetSessionTimelineQuery(sessionId ?? '', {
    skip: !sessionId,
  });

  const logs = timelineData?.data ?? [];

  return (
    <Dialog open={!!sessionId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Tiến trình phiên giao hàng: </span>
            <span className="font-mono text-sky-600 dark:text-sky-400">{sessionId}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2" />
              Đang tải chuỗi sự kiện phiên...
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Không tìm thấy thông điệp cho phiên này.
            </p>
          ) : (
            <div className="relative border-l-2 border-sky-300 dark:border-sky-700 ml-4 pl-4 space-y-6">
              {logs.map((l, index) => (
                <div key={l.id} className="relative text-xs space-y-1">
                  {/* Timeline bullet */}
                  <span className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-sky-500 border-2 border-background" />

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">
                      {index + 1}. {l.eventType}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatDateTime(l.timestamp)}
                    </span>
                  </div>

                  <p className="text-muted-foreground text-[11px]">
                    Luồng: <strong>{l.sourceDevice}</strong> → <strong>{l.targetDevice}</strong> ({l.mqttTopic})
                  </p>

                  {l.markerId !== null && l.markerId !== undefined && (
                    <p className="text-sky-700 dark:text-sky-300 font-mono text-[11px]">
                      ArUco Marker: #{l.markerId} ({l.markerDictionary || 'DICT_4X4_50'})
                    </p>
                  )}

                  {l.errorMessage && (
                    <p className="text-rose-600 text-[11px]">
                      Lỗi: {l.errorCode} — {l.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

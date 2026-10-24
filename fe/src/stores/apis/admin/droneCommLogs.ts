import { baseApi } from '../../baseAPi';
import type { ApiResponse } from '~/types';
import type { DroneOrderTracking } from './droneOrders';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DroneLockerCommLog {
  id: number;
  messageId?: string | null;
  correlationId?: string | null;
  sessionId?: string | null;
  orderId?: number | null;
  journeyId?: number | null;
  droneId?: string | null;
  lockerId?: number | null;
  compartmentId?: number | null;
  markerId?: number | null;
  markerDictionary?: string | null;
  sourceDevice: string;
  destinationDevice?: string | null;
  targetDevice?: string | null;
  mqttTopic: string;
  eventType: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | string;
  payload?: string | null;
  payloadJson?: string | null;
  publishStatus?: string | null;
  deliveryStatus?: string | null;
  ackStatus?: string | null;
  processingStatus:
    | 'SUCCESS'
    | 'PROCESSED'
    | 'PENDING'
    | 'PROCESSING'
    | 'REJECTED'
    | 'FAILED'
    | 'ABORTED'
    | 'ERROR'
    | string;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  processingDurationMs?: number | null;
  timestamp: string;
  createdAt?: string | null;
  processedAt?: string | null;
}

export interface DroneActiveSession {
  sessionId: string;
  correlationId?: string | null;
  orderId?: number | null;
  journeyId?: number | null;
  droneUnitId?: number | null;
  droneId?: string | null;
  lockerId?: number | null;
  compartmentId?: number | null;
  targetDictionary?: string | null;
  targetMarkerId?: number | null;
  mode?: string | null;
  state?: string | null;
  openCommandId?: string | null;
  closeCommandId?: string | null;
  lidOpenedAt?: string | null;
  createdAt?: string | null;
}

export interface DroneCommLogSearchParams {
  orderId?: number;
  droneId?: string;
  lockerId?: number;
  compartmentId?: number;
  eventType?: string;
  processingStatus?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

/// Giới hạn số trang (×100 bản ghi) khi gom nhật ký drone của một tủ, tránh kéo vô hạn mỗi lượt làm mới.
const LOCKER_LOG_MAX_PAGES = 10;

function normalizeCommLog(
  raw: DroneLockerCommLog,
  sessionContextMap: Map<string, Partial<DroneLockerCommLog>>
): DroneLockerCommLog {
  const ctx = raw.sessionId ? sessionContextMap.get(raw.sessionId) : undefined;
  return {
    ...raw,
    orderId: raw.orderId ?? ctx?.orderId ?? null,
    journeyId: raw.journeyId ?? ctx?.journeyId ?? null,
    droneId: raw.droneId ?? ctx?.droneId ?? null,
    lockerId: raw.lockerId ?? ctx?.lockerId ?? null,
    compartmentId: raw.compartmentId ?? ctx?.compartmentId ?? null,
    markerId: raw.markerId ?? ctx?.markerId ?? null,
    markerDictionary: raw.markerDictionary ?? ctx?.markerDictionary ?? null,
    destinationDevice: raw.destinationDevice ?? raw.targetDevice ?? '—',
    targetDevice: raw.targetDevice ?? raw.destinationDevice ?? '—',
    payload: raw.payload ?? raw.payloadJson ?? null,
    payloadJson: raw.payloadJson ?? raw.payload ?? null,
    publishStatus: raw.publishStatus ?? raw.deliveryStatus ?? null,
    deliveryStatus: raw.deliveryStatus ?? raw.publishStatus ?? null,
  };
}

function enrichLogsBySession(
  logs: DroneLockerCommLog[],
  activeSessions: DroneActiveSession[]
): DroneLockerCommLog[] {
  const sessionContextMap = new Map<string, Partial<DroneLockerCommLog>>();

  for (const s of activeSessions) {
    if (!s.sessionId) continue;
    sessionContextMap.set(s.sessionId, {
      orderId: s.orderId ?? null,
      journeyId: s.journeyId ?? null,
      droneId: s.droneId ?? null,
      lockerId: s.lockerId ?? null,
      compartmentId: s.compartmentId ?? null,
      markerId: s.targetMarkerId ?? null,
      markerDictionary: s.targetDictionary ?? null,
    });
  }

  for (const l of logs) {
    if (!l.sessionId) continue;
    const prev = sessionContextMap.get(l.sessionId) || {};
    sessionContextMap.set(l.sessionId, {
      orderId: prev.orderId ?? l.orderId ?? null,
      journeyId: prev.journeyId ?? l.journeyId ?? null,
      droneId: prev.droneId ?? l.droneId ?? null,
      lockerId: prev.lockerId ?? l.lockerId ?? null,
      compartmentId: prev.compartmentId ?? l.compartmentId ?? null,
      markerId: prev.markerId ?? l.markerId ?? null,
      markerDictionary: prev.markerDictionary ?? l.markerDictionary ?? null,
    });
  }

  return logs.map((l) => normalizeCommLog(l, sessionContextMap));
}

function matchesStatusFilter(logStatus: string | undefined | null, filterStatus: string | undefined): boolean {
  if (!filterStatus) return true;
  const s = (logStatus || '').toUpperCase();
  const f = filterStatus.toUpperCase();
  if (f === 'SUCCESS' || f === 'PROCESSED') {
    return s === 'SUCCESS' || s === 'PROCESSED';
  }
  if (f === 'PROCESSING' || f === 'PENDING') {
    return s === 'PROCESSING' || s === 'PENDING';
  }
  if (f === 'REJECTED') {
    return s === 'REJECTED';
  }
  if (f === 'ERROR' || f === 'FAILED') {
    return s === 'ERROR' || s === 'FAILED' || s === 'ABORTED';
  }
  return s === f;
}

export const droneCommLogsApi = baseApi.injectEndpoints({
  endpoints: (builder: any) => ({
    getDroneCommLogs: builder.query({
      async queryFn(
        params: DroneCommLogSearchParams,
        _queryApi: any,
        _extraOptions: any,
        fetchWithBQ: any
      ) {
        const page = params.page ?? 0;
        const size = params.size ?? 10;

        // 1. Fetch active sessions in parallel to enrich session context and provide fallback logs
        const activeSessionsRes = await fetchWithBQ('/api/admin/drone-locker-logs/active-sessions');
        const activeSessions: DroneActiveSession[] =
          (activeSessionsRes.data as ApiResponse<DroneActiveSession[]> | undefined)?.data ?? [];

        // 2. Try primary search endpoint (/api/admin/drone-locker-logs)
        const searchRes = await fetchWithBQ({
          url: '/api/admin/drone-locker-logs',
          params: {
            orderId: params.orderId,
            droneId: params.droneId,
            lockerId: params.lockerId,
            compartmentId: params.compartmentId,
            eventType: params.eventType,
            processingStatus: params.processingStatus,
            fromDate: params.fromDate,
            toDate: params.toDate,
            page,
            size,
          },
        });

        const searchPageData = (
          searchRes.data as ApiResponse<PageResponse<DroneLockerCommLog>> | undefined
        )?.data;

        if (!searchRes.error && searchPageData && Array.isArray(searchPageData.content)) {
          const enrichedContent = enrichLogsBySession(searchPageData.content, activeSessions);
          return {
            data: {
              success: true,
              data: {
                ...searchPageData,
                content: enrichedContent,
              },
            } as ApiResponse<PageResponse<DroneLockerCommLog>>,
          };
        }

        // 3. Fallback aggregation (when searchLogs fails on null params or returns empty while sessions/orders exist)
        const sessionIds = new Set<string>();
        const orderIds = new Set<number>();

        if (params.orderId) {
          orderIds.add(params.orderId);
        }

        for (const s of activeSessions) {
          if (s.sessionId) sessionIds.add(s.sessionId);
          if (s.orderId) orderIds.add(s.orderId);
        }

        // Also gather recent drone order IDs so completed/past sessions are included
        const droneOrdersRes = await fetchWithBQ({
          url: '/api/admin/drone-orders',
          params: { includeFinished: true },
        });
        const droneOrders: DroneOrderTracking[] =
          (droneOrdersRes.data as ApiResponse<DroneOrderTracking[]> | undefined)?.data ?? [];
        for (const o of droneOrders.slice(0, 25)) {
          if (o.orderId) orderIds.add(o.orderId);
        }

        const requests: Promise<any>[] = [];
        for (const sid of sessionIds) {
          requests.push(
            fetchWithBQ(`/api/admin/drone-locker-logs/sessions/${encodeURIComponent(sid)}`)
          );
        }
        for (const oid of orderIds) {
          requests.push(fetchWithBQ(`/api/admin/drone-locker-logs/orders/${oid}`));
        }

        const results = await Promise.all(requests);
        const byId = new Map<number, DroneLockerCommLog>();
        for (const r of results) {
          const list: DroneLockerCommLog[] =
            (r?.data as ApiResponse<DroneLockerCommLog[]> | undefined)?.data ?? [];
          for (const item of list) {
            if (item && typeof item.id === 'number') {
              byId.set(item.id, item);
            }
          }
        }

        // Also collect any additional sessionIds discovered from order logs so pre-order-match logs (like initial MARKER_DETECTED) are pulled in!
        const extraSessionIds = new Set<string>();
        for (const item of byId.values()) {
          if (item.sessionId && !sessionIds.has(item.sessionId)) {
            extraSessionIds.add(item.sessionId);
          }
        }
        if (extraSessionIds.size > 0) {
          const extraResults = await Promise.all(
            Array.from(extraSessionIds).map((sid) =>
              fetchWithBQ(`/api/admin/drone-locker-logs/sessions/${encodeURIComponent(sid)}`)
            )
          );
          for (const r of extraResults) {
            const list: DroneLockerCommLog[] =
              (r?.data as ApiResponse<DroneLockerCommLog[]> | undefined)?.data ?? [];
            for (const item of list) {
              if (item && typeof item.id === 'number') {
                byId.set(item.id, item);
              }
            }
          }
        }

        const allEnriched = enrichLogsBySession(Array.from(byId.values()), activeSessions);

        // Filter client-side
        const filtered = allEnriched.filter((log) => {
          if (params.orderId && log.orderId !== params.orderId) return false;
          if (
            params.droneId &&
            !(log.droneId || '').toLowerCase().includes(params.droneId.toLowerCase())
          ) {
            return false;
          }
          if (params.lockerId && log.lockerId !== params.lockerId) return false;
          if (params.compartmentId && log.compartmentId !== params.compartmentId) return false;
          if (params.eventType && log.eventType !== params.eventType) return false;
          if (!matchesStatusFilter(log.processingStatus, params.processingStatus)) return false;
          return true;
        });

        // Sort newest first
        filtered.sort((a, b) => {
          const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (tB !== tA) return tB - tA;
          return (b.id ?? 0) - (a.id ?? 0);
        });

        const totalElements = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalElements / size));
        const start = page * size;
        const content = filtered.slice(start, start + size);

        return {
          data: {
            success: true,
            data: {
              content,
              page,
              size,
              totalElements,
              totalPages,
            },
          } as ApiResponse<PageResponse<DroneLockerCommLog>>,
        };
      },
      providesTags: ['DroneOrder'],
    }),

    // Mọi thông điệp Drone ↔ Tủ thuộc một tủ, gán tủ đúng như trang /admin/drone-logs: lockerId của
    // bản ghi; thiếu thì lấy theo phiên giao (sessionId) rồi tới tủ đích của đơn. Bản ghi chỉ có
    // sessionId/orderId (vd. MARKER_DETECTED trước khi khớp đơn, DROP_PHASE_COMPLETED) vẫn được gom.
    getLockerDroneCommLogs: builder.query({
      async queryFn(lockerId: number, _queryApi: any, _extraOptions: any, fetchWithBQ: any) {
        const byId = new Map<number, DroneLockerCommLog>();
        const collect = (list: DroneLockerCommLog[] | undefined) => {
          for (const item of list ?? []) {
            if (item && typeof item.id === 'number') byId.set(item.id, item);
          }
        };

        // 1. Bản ghi đã gắn lockerId của tủ (backend tối đa 100 bản ghi/trang).
        for (let page = 0; page < LOCKER_LOG_MAX_PAGES; page++) {
          const res = await fetchWithBQ({
            url: '/api/admin/drone-locker-logs',
            params: { lockerId, fromDate: '2020-01-01', toDate: '2099-12-31', page, size: 100 },
          });
          if (res.error) return { error: res.error };
          const pageData = (res.data as ApiResponse<PageResponse<DroneLockerCommLog>> | undefined)?.data;
          collect(pageData?.content);
          if (!pageData || page + 1 >= pageData.totalPages) break;
        }

        // 2. Đơn drone có tủ đích là tủ này + đơn đã xuất hiện ở bước 1 ⇒ lấy đủ nhật ký từng đơn.
        const [ordersRes, activeRes] = await Promise.all([
          fetchWithBQ({ url: '/api/admin/drone-orders', params: { includeFinished: true } }),
          fetchWithBQ('/api/admin/drone-locker-logs/active-sessions'),
        ]);
        const droneOrders: DroneOrderTracking[] =
          (ordersRes.data as ApiResponse<DroneOrderTracking[]> | undefined)?.data ?? [];
        const activeSessions: DroneActiveSession[] =
          (activeRes.data as ApiResponse<DroneActiveSession[]> | undefined)?.data ?? [];
        const destinationByOrder = new Map<number, number | null>();
        for (const o of droneOrders) destinationByOrder.set(o.orderId, o.destinationLockerId);

        const orderIds = new Set<number>();
        for (const o of droneOrders) if (o.destinationLockerId === lockerId) orderIds.add(o.orderId);
        for (const l of byId.values()) if (l.orderId) orderIds.add(l.orderId);
        const orderResults = await Promise.all(
          Array.from(orderIds).map((oid) => fetchWithBQ(`/api/admin/drone-locker-logs/orders/${oid}`))
        );
        for (const r of orderResults) collect((r?.data as ApiResponse<DroneLockerCommLog[]> | undefined)?.data);

        // 3. Trọn phiên giao của các bản ghi đã gom (bắt cả bản ghi chưa gắn đơn/tủ).
        const sessionIds = new Set<string>();
        for (const s of activeSessions) if (s.sessionId && s.lockerId === lockerId) sessionIds.add(s.sessionId);
        for (const l of byId.values()) if (l.sessionId) sessionIds.add(l.sessionId);
        const sessionResults = await Promise.all(
          Array.from(sessionIds).map((sid) =>
            fetchWithBQ(`/api/admin/drone-locker-logs/sessions/${encodeURIComponent(sid)}`)
          )
        );
        for (const r of sessionResults) collect((r?.data as ApiResponse<DroneLockerCommLog[]> | undefined)?.data);

        const mine = enrichLogsBySession(Array.from(byId.values()), activeSessions).filter((log) => {
          const resolved = log.lockerId ?? (log.orderId ? destinationByOrder.get(log.orderId) : null) ?? null;
          return resolved === lockerId;
        });
        mine.sort((a, b) => {
          const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (tB !== tA) return tB - tA;
          return (b.id ?? 0) - (a.id ?? 0);
        });
        const response: ApiResponse<DroneLockerCommLog[]> = {
          data: mine,
          message: 'OK',
          status: 200,
          timestamp: new Date().toISOString(),
        };
        return { data: response };
      },
      providesTags: ['DroneOrder'],
    }),

    getSessionTimeline: builder.query({
      query: (sessionId: string) =>
        `/api/admin/drone-locker-logs/sessions/${encodeURIComponent(sessionId)}`,
      providesTags: ['DroneOrder'],
    }),

    getOrderCommLogs: builder.query({
      query: (orderId: number) => `/api/admin/drone-locker-logs/orders/${orderId}`,
      providesTags: ['DroneOrder'],
    }),

    getActiveDroneSessions: builder.query({
      query: () => '/api/admin/drone-locker-logs/active-sessions',
      providesTags: ['DroneOrder'],
    }),
  }),
});

export const {
  useGetDroneCommLogsQuery,
  useGetLockerDroneCommLogsQuery,
  useGetSessionTimelineQuery,
  useGetOrderCommLogsQuery,
  useGetActiveDroneSessionsQuery,
} = droneCommLogsApi as any;

import { baseApi } from '../../baseAPi';
import type { ApiResponse } from '~/types';

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
  targetDevice: string;
  mqttTopic: string;
  eventType: string;
  direction: 'INBOUND' | 'OUTBOUND' | string;
  payloadJson?: string | null;
  deliveryStatus?: string | null;
  ackStatus?: string | null;
  processingStatus: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'REJECTED' | 'ERROR' | string;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  timestamp: string;
  processedAt?: string | null;
}

export interface DroneActiveSession {
  sessionId: string;
  correlationId?: string | null;
  orderId?: number | null;
  journeyId?: number | null;
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

export const droneCommLogsApi = baseApi.injectEndpoints({
  endpoints: (builder: any) => ({
    getDroneCommLogs: builder.query({
      query: (params: DroneCommLogSearchParams) => ({
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
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
      providesTags: ['DroneOrder'],
    }),

    getSessionTimeline: builder.query({
      query: (sessionId: string) => `/api/admin/drone-locker-logs/sessions/${encodeURIComponent(sessionId)}`,
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
  useGetSessionTimelineQuery,
  useGetOrderCommLogsQuery,
  useGetActiveDroneSessionsQuery,
} = droneCommLogsApi as any;


import { baseApi } from '../../baseAPi';
import type { ApiResponse } from '../../../types';

// ---- Lắp đặt & nghiệm thu tủ (F3-G12) — khớp locker-service InstallationResponse ----

export type InstallationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'CANCELLED';
export type InstallationCheckStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
export type InstallationCheckItem =
  | 'MOUNTING'
  | 'NETWORK'
  | 'CONTROLLER'
  | 'HARDWARE_CONFIG'
  | 'BOX_TEST'
  | 'LID'
  | 'KIOSK'
  | 'BLUETOOTH';

export interface InstallationBoxResult {
  boxId: number;
  boxNumber: number;
  status: InstallationCheckStatus;
  command: string | null;
  message: string | null;
  testedAt: string | null;
}

export interface InstallationCheck {
  item: InstallationCheckItem;
  label: string;
  status: InstallationCheckStatus;
  auto: boolean;
  photoRequired: boolean;
  notApplicableAllowed: boolean;
  /** SYSTEM = hệ thống tự xác nhận từ dữ liệu tủ; TECHNICIAN = KTV xác nhận. */
  verifiedBy: 'SYSTEM' | 'TECHNICIAN' | null;
  note: string | null;
  /** BOX_TEST: kết quả mở thử từng ô. */
  detail: InstallationBoxResult[] | null;
  checkedBy: number | null;
  checkedAt: string | null;
  photoCount: number;
}

export interface InstallationPhoto {
  id: number;
  /** null = ảnh hiện trường chung. */
  item: InstallationCheckItem | null;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
  uploadedByUserId: number;
  createdAt: string;
}

export interface Installation {
  id: number;
  lockerId: number;
  lockerCode: string | null;
  lockerName: string | null;
  lockerStatus: string | null;
  status: InstallationStatus;
  technicianId: number;
  scheduledAt: string | null;
  siteContactName: string | null;
  siteContactPhone: string | null;
  powerSource: string | null;
  networkType: 'WIFI' | '4G' | 'LAN' | null;
  networkNote: string | null;
  cabinetModel: string | null;
  cabinetSerial: string | null;
  notes: string | null;
  returnReason: string | null;
  cancelReason: string | null;
  createdBy: number | null;
  createdAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  controllerMac: string | null;
  controllerOnline: boolean | null;
  /** false = không đọc được dữ liệu tủ từ iot-service, các bước tự động giữ kết quả cũ. */
  iotAvailable: boolean;
  readyToSubmit: boolean;
  missing: string[];
  checks: InstallationCheck[];
  photos: InstallationPhoto[];
}

export interface InstallationRequest {
  technicianId: number;
  /** ISO `yyyy-MM-ddTHH:mm:ss`. */
  scheduledAt?: string | null;
  siteContactName?: string | null;
  siteContactPhone?: string | null;
  powerSource?: string | null;
  networkType?: 'WIFI' | '4G' | 'LAN' | null;
  networkNote?: string | null;
  cabinetModel?: string | null;
  cabinetSerial?: string | null;
  notes?: string | null;
}

export const OPEN_INSTALLATION_STATUSES: InstallationStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'SUBMITTED'];
/** Trạng thái tủ trong quá trình lắp đặt — khách chưa thấy, chưa nhận đơn. */
export const INSTALLATION_LOCKER_STATUSES = ['PLANNED', 'INSTALLING', 'COMMISSIONING'];

const TAG = 'Lockers' as const;
const installationTag = (id: number) => ({ type: TAG, id: `installation-${id}` });
const lockerInstallationTag = (lockerId: number) => ({ type: TAG, id: `locker-installation-${lockerId}` });

/** Đổi trạng thái hồ sơ thì trạng thái tủ đổi theo ⇒ làm mới cả danh sách / chi tiết tủ. */
const afterChange = (result: ApiResponse<Installation> | undefined) =>
  result?.data
    ? [
        installationTag(result.data.id),
        lockerInstallationTag(result.data.lockerId),
        { type: TAG, id: result.data.lockerId },
        { type: TAG, id: 'installations' },
        TAG,
      ]
    : [TAG];

export const installationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInstallations: builder.query<ApiResponse<Installation[]>, { status?: string } | void>({
      query: (params) => ({ url: '/api/admin/lockers/installations', params: params || {} }),
      providesTags: [{ type: TAG, id: 'installations' }],
    }),

    /** Hồ sơ mới nhất của tủ; data = null khi tủ chưa từng lập hồ sơ. */
    getLockerInstallation: builder.query<ApiResponse<Installation | null>, number>({
      query: (lockerId) => `/api/admin/lockers/${lockerId}/installation`,
      providesTags: (_r, _e, lockerId) => [lockerInstallationTag(lockerId)],
    }),

    createInstallation: builder.mutation<ApiResponse<Installation>, { lockerId: number; body: InstallationRequest }>({
      query: ({ lockerId, body }) => ({ url: `/api/admin/lockers/${lockerId}/installation`, method: 'POST', body }),
      invalidatesTags: afterChange,
    }),

    updateInstallation: builder.mutation<ApiResponse<Installation>, { id: number; body: InstallationRequest }>({
      query: ({ id, body }) => ({ url: `/api/admin/lockers/installations/${id}`, method: 'PUT', body }),
      invalidatesTags: afterChange,
    }),

    approveInstallation: builder.mutation<ApiResponse<Installation>, number>({
      query: (id) => ({ url: `/api/admin/lockers/installations/${id}/approve`, method: 'POST' }),
      invalidatesTags: afterChange,
    }),

    returnInstallation: builder.mutation<ApiResponse<Installation>, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/api/admin/lockers/installations/${id}/return`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: afterChange,
    }),

    cancelInstallation: builder.mutation<ApiResponse<Installation>, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/api/admin/lockers/installations/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: afterChange,
    }),
  }),
});

export const {
  useGetInstallationsQuery,
  useGetLockerInstallationQuery,
  useCreateInstallationMutation,
  useUpdateInstallationMutation,
  useApproveInstallationMutation,
  useReturnInstallationMutation,
  useCancelInstallationMutation,
} = installationsApi;

import { baseApi } from '../../baseAPi';
import { ADMIN_ENDPOINTS } from '../../../constants';
import type { ApiResponse } from '../../../types';

const TAGS = {
  WALLET: 'Wallet',
} as const;

export interface WalletResponse {
  userId: number;
  balance: number;
  currency: string;
}

export interface WalletTransactionResponse {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  source: string;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface WithdrawalResponse {
  id: number;
  referenceId: string;
  amount: number;
  balanceAfter: number;
  withdrawableBalance: number;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface ProcessWithdrawalRequest {
  id: number;
  action: 'APPROVE' | 'REJECT';
  reason?: string;
}

export const walletManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserWallet: builder.query<ApiResponse<WalletResponse>, number>({
      query: (userId) => ADMIN_ENDPOINTS.WALLET_BY_USER(userId),
      providesTags: (result, error, userId) => [{ type: TAGS.WALLET, id: userId }],
    }),

    getUserWalletTransactions: builder.query<
      ApiResponse<WalletTransactionResponse[]>,
      number
    >({
      query: (userId) => ADMIN_ENDPOINTS.WALLET_TRANSACTIONS(userId),
      providesTags: (result, error, userId) => [{ type: TAGS.WALLET, id: userId }],
    }),

    adjustUserWallet: builder.mutation<
      ApiResponse<WalletResponse>,
      { userId: number; amount: number; reason?: string }
    >({
      query: ({ userId, amount, reason }) => ({
        url: ADMIN_ENDPOINTS.WALLET_ADJUST(userId),
        method: 'POST',
        body: { amount, reason },
      }),
      invalidatesTags: (result, error, { userId }) => [{ type: TAGS.WALLET, id: userId }],
    }),

    getWithdrawals: builder.query<ApiResponse<WithdrawalResponse[]>, { status?: string } | void>({
      query: (params) => ({
        url: ADMIN_ENDPOINTS.WITHDRAWALS,
        params: params?.status ? { status: params.status } : undefined,
      }),
      providesTags: () => [{ type: TAGS.WALLET, id: 'WITHDRAWALS' }],
    }),

    processWithdrawal: builder.mutation<ApiResponse<WithdrawalResponse>, ProcessWithdrawalRequest>({
      query: ({ id, action, reason }) => ({
        url: ADMIN_ENDPOINTS.WITHDRAWAL_PROCESS(id),
        method: 'POST',
        body: { action, reason },
      }),
      invalidatesTags: () => [{ type: TAGS.WALLET, id: 'WITHDRAWALS' }],
    }),
  }),
});

export const {
  useGetUserWalletQuery,
  useGetUserWalletTransactionsQuery,
  useAdjustUserWalletMutation,
  useGetWithdrawalsQuery,
  useProcessWithdrawalMutation,
} = walletManagementApi;


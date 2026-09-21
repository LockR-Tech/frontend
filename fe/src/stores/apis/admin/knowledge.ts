import { baseApi } from "../../baseAPi";
import { ADMIN_ENDPOINTS, ASSISTANT_ENDPOINTS } from "../../../constants";

// Kho tri thức của trợ lý hỏi đáp RAG (assistant-service). Mọi route dưới
// /api/admin/knowledge chỉ ADMIN; phản hồi dạng ApiResponse{success, code, message, data, errors}.
//   POST   /documents (multipart: file, title?, allowedRoles*) -> KnowledgeDocument (PENDING)
//   GET    /documents | /documents/{id}
//   PUT    /documents/{id} {title?, allowedRoles?}
//   POST   /documents/{id}/reindex                            -> về PENDING
//   DELETE /documents/{id}
//   GET    /conversations?userId=&page=&size= | /conversations/{id}
//   GET    /eval-cases | POST /eval-cases [..] (trả cả danh sách) | DELETE /eval-cases/{id}
//   POST   /eval?generate=false|true  (true = gọi Claude cho từng câu, TỐN PHÍ)
// Đánh chỉ mục chạy nền: tài liệu PENDING/INDEXING thì trang tự làm mới (polling).

export interface KnowledgeApiResponse<T> {
  success: boolean;
  code: string | null;
  message: string | null;
  data: T;
  errors?: unknown;
}

export const KNOWLEDGE_DOCUMENT_STATUSES = [
  "PENDING",
  "INDEXING",
  "READY",
  "FAILED",
] as const;
export type KnowledgeDocumentStatus =
  (typeof KNOWLEDGE_DOCUMENT_STATUSES)[number];

/** Vai trò được đọc tài liệu. `ALL` = mọi người dùng đã đăng nhập, thắng mọi vai trò khác. */
export const KNOWLEDGE_ROLES = [
  "ALL",
  "CUSTOMER",
  "LOCKER_TECHNICIAN",
  "DRONE_TECHNICIAN",
  "ADMIN",
] as const;
export type KnowledgeRole = (typeof KNOWLEDGE_ROLES)[number];

/** Vai trò người hỏi trong một câu đánh giá (mặc định CUSTOMER). */
export const EVAL_CASE_ROLES = [
  "CUSTOMER",
  "LOCKER_TECHNICIAN",
  "DRONE_TECHNICIAN",
  "ADMIN",
] as const;

export interface KnowledgeDocument {
  id: number;
  title: string;
  fileName: string;
  mimeType: string;
  status: KnowledgeDocumentStatus;
  allowedRoles: string[];
  sizeBytes: number;
  chunkCount: number;
  error: string | null;
  createdBy: number | null;
  /** LocalDateTime UTC, không offset. */
  createdAt: string | null;
  updatedAt: string | null;
  indexedAt: string | null;
}

export interface UploadKnowledgeDocumentArgs {
  file: File;
  /** Bỏ trống = tên file (không đuôi). */
  title?: string;
  /** Rỗng = ALL. */
  allowedRoles?: string[];
}

export interface UpdateKnowledgeDocumentArgs {
  id: number;
  title?: string;
  allowedRoles?: string[];
}

export interface AssistantConversationView {
  id: number;
  userId: number;
  title: string | null;
  messageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AssistantSourceView {
  documentId: number;
  documentTitle: string;
  chunkId: number;
  heading: string | null;
  /** Câu được trích nguyên văn làm căn cứ. */
  citedText: string | null;
}

export interface AssistantMessageView {
  id: number;
  role: "USER" | "ASSISTANT";
  content: string;
  /** Trợ lý trả lời "tài liệu chưa đề cập" (không đoạn nào đạt ngưỡng) hoặc mô hình từ chối. */
  refused: boolean;
  sources: AssistantSourceView[] | null;
  /** Độ giống cosine cao nhất (0..1) của đoạn tài liệu tìm được. */
  topScore: number | null;
  createdAt: string | null;
}

export interface AssistantConversationDetail {
  conversation: AssistantConversationView;
  messages: AssistantMessageView[];
}

export interface AssistantConversationsArgs {
  userId?: number;
  page?: number;
  size?: number;
}

export interface KnowledgeEvalCase {
  id: number;
  question: string;
  roles: string[];
  expectedDocumentTitle: string | null;
  mustRefuse: boolean;
  createdAt: string | null;
}

export interface KnowledgeEvalCaseInput {
  question: string;
  /** Mặc định CUSTOMER. */
  roles?: string[];
  /** Bắt buộc khi `mustRefuse = false` (EVAL_CASE_INVALID). */
  expectedDocumentTitle?: string | null;
  mustRefuse: boolean;
}

export interface KnowledgeEvalResult {
  caseId: number;
  question: string;
  roles: string[];
  expectedDocumentTitle: string | null;
  mustRefuse: boolean;
  topScore: number;
  retrievedTitles: string[];
  passed: boolean;
  /** Chỉ có khi chạy `generate=true` và câu có đoạn liên quan. */
  answer: string | null;
}

export interface KnowledgeEvalReport {
  total: number;
  passed: number;
  retrievalCases: number;
  retrievalHits: number;
  refusalCases: number;
  refusalCorrect: number;
  /** Ngưỡng liên quan đang áp dụng (0..1). */
  minScore: number;
  results: KnowledgeEvalResult[];
}

/** `GET /api/assistant/status`: trợ lý đang bật và máy chủ đã có đủ khoá API mô hình chưa. */
export interface AssistantStatus {
  enabled: boolean;
  configured: boolean;
  /** Có khoá nhúng (Voyage) — thiếu thì tài liệu nằm PENDING. */
  embeddingConfigured?: boolean;
  /** Có khoá Claude — thiếu thì người dùng chưa hỏi được. */
  chatConfigured?: boolean;
}

/** Nhịp làm mới danh sách khi còn tài liệu đang chờ/đang đánh chỉ mục. */
export const KNOWLEDGE_POLL_MS = 4000;

export function isIndexingInProgress(status: string | null | undefined): boolean {
  return status === "PENDING" || status === "INDEXING";
}

export function hasIndexingInProgress(
  documents: KnowledgeDocument[] | null | undefined,
): boolean {
  return Array.isArray(documents) && documents.some((d) => isIndexingInProgress(d.status));
}

const DOC_TAG = "KnowledgeDocuments" as const;
const CONVERSATION_TAG = "AssistantConversations" as const;
const EVAL_TAG = "KnowledgeEvalCases" as const;

export const knowledgeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getKnowledgeDocuments: builder.query<
      KnowledgeApiResponse<KnowledgeDocument[]>,
      void
    >({
      query: () => ADMIN_ENDPOINTS.KNOWLEDGE_DOCUMENTS,
      providesTags: (result) => [
        { type: DOC_TAG, id: "LIST" },
        ...(Array.isArray(result?.data)
          ? result.data.map((d) => ({ type: DOC_TAG, id: d.id }))
          : []),
      ],
    }),

    getKnowledgeDocument: builder.query<
      KnowledgeApiResponse<KnowledgeDocument>,
      number
    >({
      query: (id) => ADMIN_ENDPOINTS.KNOWLEDGE_DOCUMENT_BY_ID(id),
      providesTags: (_result, _error, id) => [{ type: DOC_TAG, id }],
    }),

    uploadKnowledgeDocument: builder.mutation<
      KnowledgeApiResponse<KnowledgeDocument>,
      UploadKnowledgeDocumentArgs
    >({
      query: ({ file, title, allowedRoles }) => {
        const form = new FormData();
        form.append("file", file, file.name);
        if (title?.trim()) form.append("title", title.trim());
        for (const role of allowedRoles ?? []) form.append("allowedRoles", role);
        // Không đặt Content-Type: baseApi bỏ header JSON khi body là FormData.
        return {
          url: ADMIN_ENDPOINTS.KNOWLEDGE_DOCUMENTS,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (result) => (result ? [{ type: DOC_TAG, id: "LIST" }] : []),
    }),

    updateKnowledgeDocument: builder.mutation<
      KnowledgeApiResponse<KnowledgeDocument>,
      UpdateKnowledgeDocumentArgs
    >({
      query: ({ id, ...body }) => ({
        url: ADMIN_ENDPOINTS.KNOWLEDGE_DOCUMENT_BY_ID(id),
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: DOC_TAG, id },
              { type: DOC_TAG, id: "LIST" },
            ]
          : [],
    }),

    reindexKnowledgeDocument: builder.mutation<
      KnowledgeApiResponse<KnowledgeDocument>,
      number
    >({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.KNOWLEDGE_DOCUMENT_REINDEX(id),
        method: "POST",
      }),
      invalidatesTags: (result, _error, id) =>
        result
          ? [
              { type: DOC_TAG, id },
              { type: DOC_TAG, id: "LIST" },
            ]
          : [],
    }),

    deleteKnowledgeDocument: builder.mutation<KnowledgeApiResponse<null>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.KNOWLEDGE_DOCUMENT_BY_ID(id),
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, id) =>
        result
          ? [
              { type: DOC_TAG, id },
              { type: DOC_TAG, id: "LIST" },
            ]
          : [],
    }),

    getAssistantConversations: builder.query<
      KnowledgeApiResponse<AssistantConversationView[]>,
      AssistantConversationsArgs
    >({
      query: ({ userId, page = 0, size = 20 }) => ({
        url: ADMIN_ENDPOINTS.KNOWLEDGE_CONVERSATIONS,
        params: userId != null ? { userId, page, size } : { page, size },
      }),
      providesTags: [{ type: CONVERSATION_TAG, id: "LIST" }],
    }),

    getAssistantConversation: builder.query<
      KnowledgeApiResponse<AssistantConversationDetail>,
      number
    >({
      query: (id) => ADMIN_ENDPOINTS.KNOWLEDGE_CONVERSATION_BY_ID(id),
      providesTags: (_result, _error, id) => [{ type: CONVERSATION_TAG, id }],
    }),

    getKnowledgeEvalCases: builder.query<
      KnowledgeApiResponse<KnowledgeEvalCase[]>,
      void
    >({
      query: () => ADMIN_ENDPOINTS.KNOWLEDGE_EVAL_CASES,
      providesTags: [{ type: EVAL_TAG, id: "LIST" }],
    }),

    /** Thêm một hoặc nhiều câu; backend trả lại cả danh sách. */
    addKnowledgeEvalCases: builder.mutation<
      KnowledgeApiResponse<KnowledgeEvalCase[]>,
      KnowledgeEvalCaseInput[]
    >({
      query: (cases) => ({
        url: ADMIN_ENDPOINTS.KNOWLEDGE_EVAL_CASES,
        method: "POST",
        body: cases,
      }),
      async onQueryStarted(_cases, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (Array.isArray(data?.data)) {
            dispatch(
              knowledgeApi.util.updateQueryData("getKnowledgeEvalCases", undefined, (draft) => {
                draft.data = data.data;
              }),
            );
          }
        } catch {
          // lỗi được xử lý ở nơi gọi mutation
        }
      },
      invalidatesTags: (result) => (result ? [{ type: EVAL_TAG, id: "LIST" }] : []),
    }),

    deleteKnowledgeEvalCase: builder.mutation<KnowledgeApiResponse<null>, number>({
      query: (id) => ({
        url: ADMIN_ENDPOINTS.KNOWLEDGE_EVAL_CASE_BY_ID(id),
        method: "DELETE",
      }),
      invalidatesTags: (result) => (result ? [{ type: EVAL_TAG, id: "LIST" }] : []),
    }),

    /** `generate=true` gọi Claude cho từng câu — tốn phí; mặc định chỉ đo truy xuất (phí nhúng). */
    runKnowledgeEval: builder.mutation<
      KnowledgeApiResponse<KnowledgeEvalReport>,
      { generate: boolean }
    >({
      query: ({ generate }) => ({
        url: ADMIN_ENDPOINTS.KNOWLEDGE_EVAL,
        method: "POST",
        params: { generate },
      }),
    }),

    getAssistantStatus: builder.query<KnowledgeApiResponse<AssistantStatus>, void>({
      query: () => ASSISTANT_ENDPOINTS.STATUS,
    }),
  }),
});

export const {
  useGetKnowledgeDocumentsQuery,
  useGetKnowledgeDocumentQuery,
  useUploadKnowledgeDocumentMutation,
  useUpdateKnowledgeDocumentMutation,
  useReindexKnowledgeDocumentMutation,
  useDeleteKnowledgeDocumentMutation,
  useGetAssistantConversationsQuery,
  useGetAssistantConversationQuery,
  useGetKnowledgeEvalCasesQuery,
  useAddKnowledgeEvalCasesMutation,
  useDeleteKnowledgeEvalCaseMutation,
  useRunKnowledgeEvalMutation,
  useGetAssistantStatusQuery,
} = knowledgeApi;

/**
 * Danh sách tài liệu, tự làm mới mỗi {@link KNOWLEDGE_POLL_MS} ms khi còn tài liệu PENDING/INDEXING
 * (đánh chỉ mục chạy nền), dừng khi tất cả đã READY/FAILED.
 */
export function useKnowledgeDocumentsWithPolling() {
  const cached = knowledgeApi.endpoints.getKnowledgeDocuments.useQueryState(undefined);
  const polling = hasIndexingInProgress(cached.data?.data);
  const query = useGetKnowledgeDocumentsQuery(undefined, {
    pollingInterval: polling ? KNOWLEDGE_POLL_MS : 0,
    skipPollingIfUnfocused: true,
  });
  return { ...query, polling };
}

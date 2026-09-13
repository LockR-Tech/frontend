/**
 * Backend admin list endpoints return a flat `ApiResponse<List<...>>` (data = array),
 * but the web was written expecting a Spring `Page` (data = { content, totalElements }).
 * These helpers tolerate BOTH shapes so list pages render regardless.
 */
export function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const page = data as { content?: T[] } | null | undefined;
  return page?.content ?? [];
}

export function extractTotal(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  const page = data as { totalElements?: number; content?: unknown[] } | null | undefined;
  return page?.totalElements ?? page?.content?.length ?? 0;
}

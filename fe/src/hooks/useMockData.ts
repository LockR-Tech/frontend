import { useState, useEffect, useCallback } from "react";
import { isMockEnabled, mockDelay, debugLogs } from "~/context/mock/mock-data-context";

interface UseMockDataOptions<T> {
  mockData: T;
  delay?: number;
}

interface UseMockDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook để sử dụng mock data khi VITE_ENABLE_MOCK_DATA=true
 * Tự động giả lập loading state và delay
 * 
 * @example
 * const { data, isLoading } = useMockData({
 *   mockData: usersMockData,
 * });
 */
export function useMockData<T>({
  mockData,
  delay = mockDelay,
}: UseMockDataOptions<T>): UseMockDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMockData = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (debugLogs) {
      console.log("[MockData] Fetching mock data...", { delay });
    }

    const timer = setTimeout(() => {
      try {
        setData(mockData);
        if (debugLogs) {
          console.log("[MockData] Data loaded:", mockData);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        if (debugLogs) {
          console.error("[MockData] Error:", err);
        }
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [mockData, delay]);

  useEffect(() => {
    if (isMockEnabled) {
      return fetchMockData();
    }
  }, [fetchMockData]);

  const refetch = useCallback(() => {
    fetchMockData();
  }, [fetchMockData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Kiểm tra xem mock data có được bật không
 */
export function useIsMockEnabled(): boolean {
  return isMockEnabled;
}

/**
 * Hook để conditionally sử dụng mock data hoặc real data
 * 
 * @example
 * const { data, isLoading } = useDataWithMockFallback({
 *   realQuery: useGetUsersQuery(),
 *   mockData: usersMockData,
 * });
 */
interface UseDataWithMockFallbackOptions<T> {
  realData?: T | null;
  realIsLoading?: boolean;
  realError?: Error | null;
  mockData: T;
}

export function useDataWithMockFallback<T>({
  realData,
  realIsLoading = false,
  realError = null,
  mockData,
}: UseDataWithMockFallbackOptions<T>) {
  const mock = useMockData({ mockData });

  if (isMockEnabled) {
    return {
      data: mock.data,
      isLoading: mock.isLoading,
      error: mock.error,
      refetch: mock.refetch,
      isMock: true,
    };
  }

  return {
    data: realData ?? null,
    isLoading: realIsLoading,
    error: realError,
    refetch: () => {},
    isMock: false,
  };
}

export { isMockEnabled, mockDelay };

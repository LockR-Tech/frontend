import { createContext, useContext, useMemo, type ReactNode } from "react";

interface MockDataContextType {
  isMockEnabled: boolean;
  mockDelay: number;
  debugLogs: boolean;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

const isMockEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA === "true";
const mockDelay = Number(import.meta.env.VITE_MOCK_DELAY) || 500;
const debugLogs = import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true";

export function MockDataProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      isMockEnabled,
      mockDelay,
      debugLogs,
    }),
    []
  );

  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockDataConfig() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockDataConfig must be used within MockDataProvider");
  }
  return context;
}

export { isMockEnabled, mockDelay, debugLogs };

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface SidebarContextType {
  isExpanded: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
  setIsExpanded: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarWidth = isExpanded ? 280 : 80;

  const toggleSidebar = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        sidebarWidth,
        toggleSidebar,
        setIsExpanded,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    // Return no-op fallback when used outside SidebarProvider (e.g. Partner layout)
    return {
      isExpanded: false,
      sidebarWidth: 0,
      toggleSidebar: () => {},
      setIsExpanded: () => {},
    };
  }
  return context;
}

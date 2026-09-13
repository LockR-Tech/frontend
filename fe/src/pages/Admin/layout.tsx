import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sidebar } from "~/components/shared/layout/Sidebar";
import { Header } from "~/components/shared/layout/Header";
import { MockBanner } from "~/components/shared/mock-indicator";
import { useAuth } from "~/context/auth-context";
import { SidebarProvider, useSidebar } from "~/context/sidebar-context";
import { ADMIN_NAV_ITEMS } from "~/constants/sidebar";
import { useInitialPrefetch } from "~/hooks/use-route-prefetch";
import SettingsModal from "./settings";

// Inner component that uses sidebar context
function AdminLayoutInner() {
  const { hasPermission } = useAuth();
  const { sidebarWidth } = useSidebar();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Prefetch popular routes after initial render
  useInitialPrefetch();

  useEffect(() => {
    const checkScreen = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const visibleNavItems = ADMIN_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mock Data Banner */}
      <MockBanner />

      {/* Sidebar - Fixed position */}
      <Sidebar
        items={visibleNavItems}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      {/* Main Content - Push by sidebar width on desktop */}
      <div
        className="transition-all duration-300 ease-in-out min-h-screen flex flex-col"
        style={{
          marginLeft: isDesktop ? sidebarWidth : 0,
        }}
      >
        <Header />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-400 mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}

// Wrap with SidebarProvider
export default function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminLayoutInner />
    </SidebarProvider>
  );
}

import { Outlet } from "react-router-dom";
import { Sidebar } from "~/components/shared/layout/Sidebar";
import { Header } from "~/components/shared/layout/Header";
import { SidebarProvider, useSidebar } from "~/context/sidebar-context";
import { useAuth } from "@/context/auth-context";
import { PARTNER_NAV_ITEMS } from "~/constants/sidebar";
import { useState, useEffect } from "react";

function PartnerLayoutInner() {
  const { hasPermission } = useAuth();
  const { sidebarWidth } = useSidebar();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const visibleNavItems = PARTNER_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar items={visibleNavItems} />

      <div
        className="transition-all duration-300 ease-in-out min-h-screen flex flex-col"
        style={{ marginLeft: isDesktop ? sidebarWidth : 0 }}
      >
        <Header />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-400 mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PartnerLayout() {
  return (
    <SidebarProvider>
      <PartnerLayoutInner />
    </SidebarProvider>
  );
}

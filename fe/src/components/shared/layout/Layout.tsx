import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "~/context/auth-context";
import type { NavItem } from "~/types/common/sidebar";

interface LayoutProps {
  navItems: NavItem[];
}

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 80;

export function Layout({ navItems }: LayoutProps) {
  const { hasPermission } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        items={visibleNavItems}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <main
        className="transition-all duration-300 min-h-screen"
        style={{
          marginLeft: SIDEBAR_WIDTH,
        }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

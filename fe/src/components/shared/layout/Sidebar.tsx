import { useState, useCallback, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useAuth } from "~/context/auth-context";
import { useSidebar } from "~/context/sidebar-context";
import { useTranslation } from "react-i18next";
import type { NavItem } from "~/types/common/sidebar";

interface SidebarProps {
  items: NavItem[];
  userName?: string;
  onSettingsClick?: () => void;
}

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 80;

export function Sidebar({
  items,
  userName = "Admin",
  onSettingsClick,
}: SidebarProps) {
  const {
    isExpanded,
    toggleSidebar: toggleDesktopSidebar,
    setIsExpanded,
  } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useTranslation();

  // Detect tablet and below (md breakpoint = 768px)
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsTablet(width < 1024); // lg breakpoint
      if (width >= 1024) {
        setIsMobileOpen(false);
      } else if (width < 768) {
        // Mobile: always collapsed until opened
        setIsExpanded(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isTablet) {
      setIsMobileOpen((prev) => !prev);
    } else {
      toggleDesktopSidebar();
    }
  }, [isTablet, toggleDesktopSidebar]);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = "/auth/login";
  }, [logout]);

  const currentWidth = isExpanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && isTablet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Toggle Button - Fixed on mobile/tablet */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-sidebar-background text-white shadow-lg lg:hidden",
          "hover:bg-sidebar-accent transition-colors",
        )}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isTablet ? (isMobileOpen ? SIDEBAR_WIDTH : 0) : currentWidth,
          x: isTablet && !isMobileOpen ? -SIDEBAR_WIDTH : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar-background flex flex-col z-50",
          isTablet && !isMobileOpen && "overflow-hidden",
        )}
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border h-16">
          <AnimatePresence mode="wait">
            {(isExpanded || isMobileOpen) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-ring flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">L</span>
                </div>
                <span className="text-white font-semibold text-lg">
                  Laundry
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Toggle */}
          {!isTablet && (
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
                !isExpanded && "mx-auto",
              )}
              aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
            >
              {isExpanded ? (
                <ChevronLeft size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
          )}

          {/* Mobile Close */}
          {isTablet && isMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-800 scrollbar-track-transparent">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);

            return (
              <NavLink
                key={idx}
                to={item.path}
                onClick={() => isTablet && setIsMobileOpen(false)}
                className={({ isActive: active }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                    "hover:bg-sidebar-accent/50",
                    active
                      ? "bg-sidebar-accent text-white shadow-lg shadow-sidebar-primary/20"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                    !isExpanded && !isMobileOpen && "justify-center px-2",
                  )
                }
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  <Icon size={22} />
                </div>

                <AnimatePresence mode="wait">
                  {(isExpanded || isMobileOpen) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {t(item.label)}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (isExpanded || isMobileOpen) && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-2 w-1.5 h-1.5 bg-primary rounded-full"
                  />
                )}

                {/* Tooltip for collapsed state */}
                {!isExpanded && !isMobileOpen && !isTablet && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-sidebar-accent text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                    {t(item.label)}
                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-blue-900" />
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 space-y-2">
          {/* Settings — only shown when caller provides onSettingsClick */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
                "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                !isExpanded && !isMobileOpen && "justify-center",
              )}
            >
              <Settings size={20} />
              <AnimatePresence mode="wait">
                {(isExpanded || isMobileOpen) && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    {t("admin.sidebar.settings")}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
              "text-destructive hover:text-destructive/80 hover:bg-destructive/10",
              !isExpanded && !isMobileOpen && "justify-center",
            )}
          >
            <LogOut size={20} />
            <AnimatePresence mode="wait">
              {(isExpanded || isMobileOpen) && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium whitespace-nowrap overflow-hidden"
                >
                  {t("button.logout")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* User Info */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-accent/30",
              !isExpanded && !isMobileOpen && "justify-center",
            )}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-ring flex items-center justify-center flex-shrink-0 shadow-lg">
              <User size={18} className="text-white" />
            </div>
            <AnimatePresence mode="wait">
              {(isExpanded || isMobileOpen) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden min-w-0"
                >
                  <p className="text-white font-medium text-sm truncate">
                    {userName}
                  </p>
                  <p className="text-sidebar-primary text-xs truncate">Admin</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

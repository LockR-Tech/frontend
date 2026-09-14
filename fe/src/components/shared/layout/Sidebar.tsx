import { useState, useCallback, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Menu,
  X,
  ChevronsUpDown,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useAuth } from "~/context/auth-context";
import { useSidebar } from "~/context/sidebar-context";
import { useTranslation } from "react-i18next";
import type { NavItem } from "~/types/common/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface SidebarProps {
  items: NavItem[];
  userName?: string;
  onSettingsClick?: () => void;
}

export function Sidebar({
  items,
  userName = "Admin",
  onSettingsClick,
}: SidebarProps) {
  const {
    isExpanded,
    toggleSidebar: toggleDesktopSidebar,
    setIsExpanded,
    sidebarWidth,
  } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useTranslation();

  // Detect tablet / mobile screens
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsTablet(width < 1024);
      if (width >= 1024) {
        setIsMobileOpen(false);
      } else if (width < 768) {
        setIsExpanded(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [setIsExpanded]);

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

  return (
    <TooltipProvider delayDuration={150}>
      {/* Mobile Backdrop */}
      {isMobileOpen && isTablet && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-card text-foreground border border-border shadow-xs lg:hidden",
          "hover:bg-accent transition-colors",
        )}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-card text-card-foreground border-r border-border flex flex-col z-50 transition-all duration-300 ease-in-out",
          isTablet && !isMobileOpen && "-translate-x-full lg:translate-x-0",
        )}
        style={{
          width: isTablet ? (isMobileOpen ? 260 : 0) : sidebarWidth,
        }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              L
            </div>
            {(isExpanded || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="font-semibold text-sm text-foreground truncate tracking-tight">
                  Laundry Locker
                </span>
                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 truncate">
                  <Shield size={10} className="text-muted-foreground" />
                  Admin Portal
                </span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          {!isTablet && (
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                !isExpanded && "mx-auto",
              )}
              aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
            >
              {isExpanded ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}

          {/* Mobile Close Button */}
          {isTablet && isMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);
            const label = t(item.label);

            const linkContent = (
              <NavLink
                to={item.path}
                onClick={() => isTablet && setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative group",
                  isActive
                    ? "bg-accent text-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                  !isExpanded && !isMobileOpen && "justify-center px-2",
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />

                {(isExpanded || isMobileOpen) && (
                  <span className="truncate flex-1">{label}</span>
                )}

                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
              </NavLink>
            );

            // If sidebar is collapsed, wrap with Tooltip
            if (!isExpanded && !isMobileOpen && !isTablet) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{linkContent}</div>;
          })}
        </nav>

        {/* User Profile / Menu Footer */}
        <div className="p-3 border-t border-border/60 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent transition-colors text-left group",
                  !isExpanded && !isMobileOpen && "justify-center p-1.5",
                )}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium text-xs shrink-0 border border-border">
                  <User size={15} />
                </div>

                {(isExpanded || isMobileOpen) && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {userName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Quản trị viên
                    </p>
                  </div>
                )}

                {(isExpanded || isMobileOpen) && (
                  <ChevronsUpDown
                    size={14}
                    className="text-muted-foreground group-hover:text-foreground shrink-0"
                  />
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={!isExpanded && !isMobileOpen ? "right" : "top"}
              align="end"
              sideOffset={8}
              className="w-56"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground leading-none">
                    {userName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@laundrylocker.vn
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {onSettingsClick && (
                <DropdownMenuItem
                  onClick={onSettingsClick}
                  className="cursor-pointer gap-2"
                >
                  <Settings size={15} />
                  <span>{t("admin.sidebar.settings")}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut size={15} />
                <span>{t("button.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}

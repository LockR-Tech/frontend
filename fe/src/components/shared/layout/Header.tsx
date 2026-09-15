import { useState } from "react";
import {
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Check,
  PanelLeft,
  Bell,
  ChevronRight,
  Search,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";
import { useTheme } from "~/context/theme-context";
import { useSidebar } from "~/context/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { useGetAllNotificationsQuery } from "~/stores/apis/admin/notifications";

interface HeaderProps {
  className?: string;
}

// Language options
const languages = [
  { code: "vi", flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
];

// Theme options
const themes = [
  { code: "light", icon: Sun },
  { code: "dark", icon: Moon },
  { code: "system", icon: Monitor },
] as const;

// Path mapping for breadcrumbs
const pathMap: Record<string, string> = {
  admin: "Admin",
  partner: "Đối tác",
  dashboard: "Dashboard",
  users: "Người dùng",
  orders: "Đơn hàng",
  stores: "Địa điểm",
  lockers: "Kiosk",
  services: "Dịch vụ",
  payments: "Thanh toán",
  loyalty: "Khách hàng thân thiết",
  partners: "Đối tác",
  feedback: "Phản hồi",
  settings: "Cài đặt",
  scheduler: "Lập lịch",
  staff: "Nhân viên",
  revenue: "Doanh thu",
  notifications: "Thông báo",
  detail: "Chi tiết",
  create: "Tạo mới",
  edit: "Chỉnh sửa",
  drones: "Drone",
  maintenance: "Bảo trì thiết bị",
  promotions: "Khuyến mãi",
};

const isNumeric = (str: string) => /^\d+$/.test(str);

function Breadcrumb() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  if (paths.length < 2) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <span>Admin</span>
        <ChevronRight size={13} className="text-muted-foreground/40" />
        <span className="text-foreground font-semibold">Dashboard</span>
      </div>
    );
  }

  const items = paths.map((path, index) => {
    const fullPath = "/" + paths.slice(0, index + 1).join("/");
    const isLast = index === paths.length - 1;

    let label = pathMap[path] || path;
    // /admin/settings là trang quy tắc nghiệp vụ; /partner/settings vẫn là "Cài đặt".
    if (paths[0] === "admin" && path === "settings") label = "Cấu hình nghiệp vụ";
    if (isNumeric(path) && path.length > 3) {
      label = `#${path.slice(0, 6)}${path.length > 6 ? "..." : ""}`;
    }

    return {
      label,
      path: isLast ? undefined : fullPath,
    };
  });

  return (
    <nav className="flex items-center gap-1.5 text-xs font-medium">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />
            )}
            {isLast || !item.path ? (
              <span
                className={cn(
                  isLast
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                  "max-w-[140px] truncate",
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-muted-foreground hover:text-foreground transition-colors max-w-[140px] truncate"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

const LOCALE_STORAGE_KEY = "app_locale";

export function Header({ className }: HeaderProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const [openLang, setOpenLang] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);

  const notificationsQuery = useGetAllNotificationsQuery({ page: 0, size: 5 });
  const notifList = notificationsQuery.data?.data?.content ?? [];

  const currentLang =
    languages.find((l) => l.code === i18nInstance.language) || languages[0];
  const currentTheme = themes.find((t) => t.code === theme) || themes[2];
  const ThemeIcon = currentTheme.icon;

  const themeLabels: Record<string, string> = {
    light: t("header.themeLight") || "Sáng",
    dark: t("header.themeDark") || "Tối",
    system: t("header.themeSystem") || "Hệ thống",
  };

  const handleChangeLanguage = (code: string) => {
    i18nInstance.changeLanguage(code);
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
    setOpenLang(false);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Toggle & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={toggleSidebar}
          >
            <PanelLeft size={18} />
          </Button>

          <Breadcrumb />
        </div>

        {/* Right Controls: Search prompt + Lang + Theme + Notifications */}
        <div className="flex items-center gap-2">
          {/* Quick Search trigger (visual hint) */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-secondary text-muted-foreground text-xs border border-border/50">
            <Search size={13} />
            <span>Tìm kiếm...</span>
            <kbd className="text-[10px] bg-card px-1.5 py-0.5 rounded border border-border font-mono text-foreground/70">
              ⌘K
            </kbd>
          </div>

          {/* Language Switcher */}
          <DropdownMenu open={openLang} onOpenChange={setOpenLang}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline uppercase">
                  {currentLang.code}
                </span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleChangeLanguage(lang.code)}
                  className="cursor-pointer text-xs"
                >
                  <span className="mr-2">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {i18nInstance.language === lang.code && (
                    <Check size={14} className="text-primary ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Switcher */}
          <DropdownMenu open={openTheme} onOpenChange={setOpenTheme}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ThemeIcon size={15} />
                <span className="hidden sm:inline">
                  {themeLabels[currentTheme.code]}
                </span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {themes.map((t) => {
                const Icon = t.icon;
                return (
                  <DropdownMenuItem
                    key={t.code}
                    onClick={() => {
                      setTheme(t.code);
                      setOpenTheme(false);
                    }}
                    className="cursor-pointer text-xs"
                  >
                    <Icon size={14} className="mr-2 text-muted-foreground" />
                    <span className="flex-1">{themeLabels[t.code]}</span>
                    {theme === t.code && (
                      <Check size={14} className="text-primary ml-auto" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                aria-label="Thông báo hệ thống"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background animate-pulse" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border border-border/80">
              <div className="p-3 border-b border-border/60 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground">Thông báo hệ thống</span>
                </div>
                <Link
                  to="/admin/notifications"
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                {notifList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Không có thông báo mới nào
                  </div>
                ) : (
                  notifList.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className="p-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                        {(() => {
                          const d = new Date(n.createdAt);
                          if (isNaN(d.getTime())) return n.createdAt;
                          const pad = (v: number) => String(v).padStart(2, "0");
                          return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
                        })()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-border/60 text-center bg-muted/20">
                <Link
                  to="/admin/notifications"
                  className="text-xs text-muted-foreground hover:text-foreground font-medium block py-1"
                >
                  Mở trung tâm thông báo &gt;
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

import { useState, useEffect } from "react";
import {
  Globe,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Check,
  PanelLeft,
  Bell,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";
import { useTheme } from "~/context/theme-context";
import i18n from "~/utils/i18n";
import { useSidebar } from "~/context/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";

interface HeaderProps {
  className?: string;
}

// Language options
const languages = [
  { code: "vi", flag: "🇻🇳" },
  { code: "en", flag: "🇬🇧" },
  { code: "ja", flag: "🇯🇵" },
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
  partner: "Partner",
  dashboard: "Dashboard",
  users: "Người dùng",
  orders: "Đơn hàng",
  stores: "Cửa hàng",
  lockers: "Tủ đồ",
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
};

// Check if string is numeric (for IDs)
const isNumeric = (str: string) => /^\d+$/.test(str);

function Breadcrumb() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  // Only show breadcrumb for nested pages (depth >= 2)
  // Examples: /admin/lockers/123, /partner/orders/detail
  if (paths.length < 2) return null;

  // Build breadcrumb items - skip the first segment (admin/partner) if there are more segments
  const startIndex = 0;
  const items = paths.slice(startIndex).map((path, index) => {
    const actualIndex = index + startIndex;
    const fullPath = "/" + paths.slice(0, actualIndex + 1).join("/");
    const isLast = actualIndex === paths.length - 1;

    // Format label: map known paths, shorten numeric IDs
    let label = pathMap[path] || path;
    if (isNumeric(path) && path.length > 3) {
      // Truncate long IDs like "123456" -> "#123..."
      label = `#${path.slice(0, 6)}${path.length > 6 ? "..." : ""}`;
    }

    return {
      label,
      path: isLast ? undefined : fullPath,
    };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-muted-foreground/50">/</span>}
            {isLast || !item.path ? (
              <span
                className={cn(
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                  "max-w-[150px] truncate",
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-muted-foreground hover:text-blue-600 transition-colors max-w-[150px] truncate"
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

  const currentLang =
    languages.find((l) => l.code === i18nInstance.language) || languages[0];
  const currentTheme = themes.find((t) => t.code === theme) || themes[2];
  const ThemeIcon = currentTheme.icon;

  const themeLabels: Record<string, string> = {
    light: t("header.themeLight"),
    dark: t("header.themeDark"),
    system: t("header.themeSystem"),
  };

  const handleChangeLanguage = (code: string) => {
    i18nInstance.changeLanguage(code);
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
    setOpenLang(false);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/20 bg-background/80 backdrop-blur-lg",
        className,
      )}
    >
      <div className="flex sm:py-1 py-2 items-center justify-between px-4 sm:px-6">
        {/* Left: Toggle Sidebar + Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={toggleSidebar}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

          {/* Breadcrumb - only shows on nested pages */}
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <Breadcrumb />
          </div>
        </div>

        {/* Right: Language + Theme + Notifications */}
        <div className="flex items-center gap-2">
          {/* Language Dropdown */}
          <DropdownMenu open={openLang} onOpenChange={setOpenLang}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 font-normal"
              >
                <span className="text-base">{currentLang.flag}</span>
                <span className="hidden sm:inline text-sm uppercase">
                  {currentLang.code}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 bg-popover border border-border"
            >
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleChangeLanguage(lang.code)}
                  className="cursor-pointer"
                >
                  <span className="mr-2 text-base">{lang.flag}</span>
                  <span className="flex-1">
                    {lang.code === "vi" && "Tiếng Việt"}
                    {lang.code === "en" && "English"}
                    {lang.code === "ja" && "日本語"}
                  </span>
                  {i18nInstance.language === lang.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Dropdown */}
          <DropdownMenu open={openTheme} onOpenChange={setOpenTheme}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 font-normal"
              >
                <ThemeIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">
                  {themeLabels[currentTheme.code]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 bg-popover border border-border"
            >
              {themes.map((t) => {
                const Icon = t.icon;
                return (
                  <DropdownMenuItem
                    key={t.code}
                    onClick={() => {
                      setTheme(t.code);
                      setOpenTheme(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="flex-1">{themeLabels[t.code]}</span>
                    {theme === t.code && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
          </Button>
        </div>
      </div>
    </header>
  );
}

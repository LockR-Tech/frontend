import { useEffect, useMemo, useState } from "react";
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
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatDateTime } from "~/lib/datetime";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";
import { useTheme } from "~/context/theme-context";
import { useSidebar } from "~/context/sidebar-context";
import { useAuth } from "~/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { DialogDescription, DialogTitle } from "~/components/ui/dialog";
import {
  NOTIFICATION_POLLING_INTERVAL,
  useGetMyNotificationInboxQuery,
  useGetUnreadCountQuery,
  useMarkNotificationAsReadMutation,
  type Notification,
} from "~/stores/apis/notificationApi";
import { useGetDroneQuery } from "~/stores/apis/admin/drones";
import { ADMIN_NAV_ITEMS } from "~/constants/sidebar";
import { SUPPORTED_LANGUAGES, currentLanguage } from "~/utils/i18n";

interface HeaderProps {
  className?: string;
}

// Theme options
const themes = [
  { code: "light", icon: Sun },
  { code: "dark", icon: Moon },
  { code: "system", icon: Monitor },
] as const;

// Breadcrumb: mỗi đoạn đường dẫn -> khoá dịch. Bản cũ hardcode tiếng Việt nên
// đổi ngôn ngữ sang English/日本語 thì breadcrumb vẫn là tiếng Việt.
const pathLabelKeys: Record<string, string> = {
  admin: "admin.breadcrumb.admin",
  partner: "admin.sidebar.partners",
  dashboard: "admin.sidebar.dashboard",
  users: "admin.sidebar.users",
  orders: "admin.sidebar.orders",
  stores: "admin.sidebar.stores",
  lockers: "admin.sidebar.lockers",
  services: "admin.sidebar.services",
  payments: "admin.sidebar.payments",
  loyalty: "admin.sidebar.loyaltyProgram",
  partners: "admin.sidebar.partners",
  feedback: "admin.sidebar.feedback",
  settings: "admin.sidebar.settings",
  scheduler: "admin.sidebar.scheduler",
  staff: "admin.breadcrumb.staff",
  revenue: "admin.sidebar.revenue",
  notifications: "admin.sidebar.notifications",
  detail: "admin.breadcrumb.detail",
  create: "admin.breadcrumb.create",
  edit: "admin.breadcrumb.edit",
  drones: "admin.sidebar.drones",
  "drone-orders": "admin.sidebar.droneOrders",
  "drone-incidents": "admin.sidebar.droneIncidents",
  maintenance: "admin.sidebar.maintenance",
  promotions: "admin.sidebar.promotions",
  knowledge: "admin.sidebar.knowledge",
};

const isNumeric = (str: string) => /^\d+$/.test(str);

function Breadcrumb() {
  const location = useLocation();
  const { t } = useTranslation();
  const paths = location.pathname.split("/").filter(Boolean);
  const droneId = paths[0] === "admin" && paths[1] === "drones" && isNumeric(paths[2] ?? "")
    ? Number(paths[2])
    : null;
  // Tra đúng một Drone theo id (cả Drone đã ngừng hoạt động — danh sách vận hành không có).
  // Cùng cache với trang chi tiết nên không tốn thêm request.
  const droneQuery = useGetDroneQuery(droneId ?? 0, { skip: droneId == null });
  const droneCode = droneId == null
    ? null
    : droneQuery.data?.data?.code
      ?? (location.state as { droneCode?: string } | null)?.droneCode
      ?? (droneQuery.isError ? `#${droneId}` : null);

  if (paths.length < 2) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <span>{t("admin.breadcrumb.admin")}</span>
        <ChevronRight size={13} className="text-muted-foreground/40" />
        <span className="text-foreground font-semibold">
          {t("admin.sidebar.dashboard")}
        </span>
      </div>
    );
  }

  const items = paths.map((path, index) => {
    const fullPath = "/" + paths.slice(0, index + 1).join("/");
    const isLast = index === paths.length - 1;

    const labelKey = pathLabelKeys[path];
    let label = labelKey ? t(labelKey) : path;
    // /admin/settings là trang quy tắc nghiệp vụ; /partner/settings vẫn là "Cài đặt".
    if (paths[0] === "admin" && path === "settings") {
      label = t("admin.sidebar.businessSettings");
    }
    if (isNumeric(path) && path.length > 3) {
      label = `#${path.slice(0, 6)}${path.length > 6 ? "..." : ""}`;
    }
    if (isLast && droneId != null && path === String(droneId)) {
      label = droneCode ?? t("header.loadingDrone");
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

// Bỏ dấu để gõ "khuyen mai" vẫn ra "Khuyến mãi"
const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d");

const isMacPlatform =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/** Bảng lệnh nhanh (Ctrl/⌘+K): nhảy tới mọi trang trong sidebar mà tài khoản được xem. */
function QuickSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const destinations = useMemo(() => {
    // Luôn kèm nhãn tiếng Việt (và bản không dấu) làm từ khoá, dù giao diện đang ở ngôn ngữ khác
    const tVi = i18n.getFixedT("vi");
    const tEn = i18n.getFixedT("en");
    return ADMIN_NAV_ITEMS.filter(
      (item) => !item.permission || hasPermission(item.permission),
    ).map((item) => {
      const viLabel = tVi(item.label);
      return {
        ...item,
        keywords: [
          i18n.t(item.label),
          viLabel,
          stripDiacritics(viLabel),
          tEn(item.label),
          item.path,
        ],
      };
    });
    // i18n.language: tính lại khi đổi ngôn ngữ
  }, [i18n, i18n.language, hasPermission]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-secondary text-muted-foreground text-xs border border-border/50 hover:text-foreground hover:border-border transition-colors"
        aria-label={t("header.search")}
      >
        <Search size={13} />
        <span>{t("header.search")}</span>
        <kbd className="text-[10px] bg-card px-1.5 py-0.5 rounded border border-border font-mono text-foreground/70">
          {isMacPlatform ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">{t("header.searchTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("header.searchDescription")}
        </DialogDescription>
        <CommandInput placeholder={t("header.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("header.searchEmpty")}</CommandEmpty>
          <CommandGroup heading={t("header.searchGroup")}>
            {destinations.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.path}
                  value={item.path}
                  keywords={item.keywords}
                  onSelect={() => go(item.path)}
                  className="gap-2 cursor-pointer"
                >
                  <Icon className="text-muted-foreground" />
                  <span className="flex-1">{t(item.label)}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {item.path.replace("/admin/", "")}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

/** Trang đích của một thông báo theo referenceType/type do notification-service lưu. */
function notificationRoute(n: Notification): string | null {
  const ref = n.referenceId ?? n.orderId ?? null;
  const refType = (n.referenceType ?? "").toUpperCase();
  const type = (n.type ?? "").toUpperCase();
  if (refType === "DRONE_INCIDENT" || type.startsWith("DRONE_PARCEL") || type.startsWith("DRONE_INCIDENT")) {
    return "/admin/drone-incidents";
  }
  if ((refType === "ORDER" || refType === "DELIVERY") && ref != null) return `/admin/orders/${ref}`;
  if (refType === "LOCKER_REPORT" || type.startsWith("LOCKER_REPORT") || type.startsWith("LOCKER_SCHEDULE")) {
    return "/admin/maintenance";
  }
  if (refType === "LOCKER" && ref != null) return `/admin/lockers/${ref}`;
  if (type.startsWith("PAYMENT")) return "/admin/payments";
  if (type.startsWith("ORDER") && ref != null) return `/admin/orders/${ref}`;
  return null;
}

/** Chuông thông báo: hộp thư của chính admin đang đăng nhập (không phải mọi thông báo hệ thống). */
function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inboxQuery = useGetMyNotificationInboxQuery(undefined, {
    pollingInterval: NOTIFICATION_POLLING_INTERVAL,
  });
  const unreadQuery = useGetUnreadCountQuery(undefined, {
    pollingInterval: NOTIFICATION_POLLING_INTERVAL,
  });
  const [markRead] = useMarkNotificationAsReadMutation();

  const notifList = (inboxQuery.data ?? []).slice(0, 5);
  const unread = unreadQuery.data ?? 0;

  const openNotification = (n: Notification) => {
    if (!n.isRead) void markRead(n.id);
    const route = notificationRoute(n);
    if (route) navigate(route);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
          aria-label={
            unread > 0
              ? t("header.unreadNotifications", { count: unread })
              : t("header.notifications")
          }
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border border-border/80">
        <div className="p-3 border-b border-border/60 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {t("header.notifications")}
            </span>
            {unread > 0 && (
              <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                {t("header.unreadBadge", { count: unread })}
              </span>
            )}
          </div>
          <Link
            to="/admin/notifications"
            className="text-[11px] text-primary hover:underline font-medium"
          >
            {t("button.viewAll")}
          </Link>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
          {inboxQuery.isError ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {t("header.notificationsError")}
            </div>
          ) : notifList.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {t("header.noNotifications")}
            </div>
          ) : (
            notifList.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => openNotification(n)}
                className={cn(
                  "block rounded-none p-3 cursor-pointer text-left focus:bg-muted/40",
                  !n.isRead && "bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="p-2 border-t border-border/60 text-center bg-muted/20">
          <Link
            to="/admin/notifications"
            className="text-xs text-muted-foreground hover:text-foreground font-medium block py-1"
          >
            {t("header.openNotificationCenter")}
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ className }: HeaderProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const [openLang, setOpenLang] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);

  // So với ngôn ngữ đã resolve ("en-US" → "en"), không so i18n.language thô
  const activeLang = currentLanguage(i18nInstance);
  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === activeLang) ?? SUPPORTED_LANGUAGES[0];
  const currentTheme = themes.find((t) => t.code === theme) || themes[2];
  const ThemeIcon = currentTheme.icon;

  const themeLabels: Record<string, string> = {
    light: t("header.themeLight") || "Sáng",
    dark: t("header.themeDark") || "Tối",
    system: t("header.themeSystem") || "Hệ thống",
  };

  const handleChangeLanguage = (code: string) => {
    // i18next-browser-languagedetector tự lưu lựa chọn vào localStorage
    void i18nInstance.changeLanguage(code);
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

        {/* Right Controls: Search + Lang + Theme + Notifications */}
        <div className="flex items-center gap-2">
          <QuickSearch />

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
              {SUPPORTED_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleChangeLanguage(lang.code)}
                  className="cursor-pointer text-xs"
                >
                  <span className="mr-2">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {activeLang === lang.code && (
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

          <NotificationBell />
        </div>
      </div>
    </header>
  );
}

import * as React from "react";
import { useEffect, useState } from "react";
import { Search, Home, ArrowLeft, MapPin, Sparkles } from "lucide-react";
import { Button } from "~/components/ui";
import { useNavigate, useLocation } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { 
  findClosestRoute, 
  getRouteSuggestions, 
  isValidRoute,
  ROUTE_ALIASES 
} from "~/lib/fuzzy-router";

// Route display names cho UI (khoá i18n)
const ROUTE_NAMES: Record<string, string> = {
  "/": "errorPage.routes.home",
  "/auth/login": "button.login",
  "/auth/register": "errorPage.routes.register",
  "/admin/dashboard": "admin.sidebar.dashboard",
  "/admin/users": "admin.sidebar.users",
  "/admin/orders": "admin.sidebar.orders",
  "/admin/stores": "errorPage.routes.stores",
  "/admin/lockers": "errorPage.routes.lockers",
  "/admin/services": "admin.sidebar.services",
  "/admin/payments": "admin.sidebar.payments",
  "/admin/loyalty": "admin.sidebar.loyalty",
  "/admin/partners": "admin.sidebar.partners",
  "/admin/feedback": "admin.sidebar.feedback",
  "/admin/scheduler": "admin.sidebar.scheduler",
  "/admin/settings": "admin.sidebar.businessSettings",
  "/partner/dashboard": "errorPage.routes.partnerDashboard",
  "/partner/orders": "admin.sidebar.orders",
  "/partner/staff": "admin.breadcrumb.staff",
  "/partner/revenue": "admin.sidebar.revenue",
  "/partner/lockers": "errorPage.routes.lockers",
  "/partner/services": "admin.sidebar.services",
  "/partner/settings": "admin.sidebar.settings",
};

export default function NotFoundPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [didRedirect, setDidRedirect] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Kiểm tra nếu là alias exact match thì redirect ngay
    const normalizedPath = currentPath.toLowerCase().trim();
    if (ROUTE_ALIASES[normalizedPath] && normalizedPath !== currentPath) {
      navigate(ROUTE_ALIASES[normalizedPath], { replace: true });
      return;
    }

    // Thử tìm route gần nhất
    const closestRoute = findClosestRoute(currentPath);
    
    if (closestRoute && closestRoute !== currentPath && !isValidRoute(currentPath)) {
      // Tự động redirect sau 2 giây cho user thấy thông báo
      setDidRedirect(true);
      const timer = setTimeout(() => {
        navigate(closestRoute, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // Không tìm được route phù hợp, hiển thị gợi ý
      setSuggestions(getRouteSuggestions(currentPath, 4));
      setIsChecking(false);
    }
  }, [location.pathname, navigate]);

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted to-background p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Illustration Area */}
        <div className="relative flex justify-center items-end gap-12 mb-8">
          {/* Broken Wire/Signpost */}
          <div className="relative">
            {/* Fallen Signpost */}
            <div className="relative">
              <div className="w-32 h-12 bg-yellow-400 rounded-lg flex items-center justify-center transform -rotate-12 shadow-lg">
                <span className="text-2xl font-bold text-foreground">404</span>
              </div>
              <div className="w-4 h-20 bg-amber-900 rounded absolute top-6 left-1/2 -translate-x-1/2 transform rotate-45"></div>
            </div>
            
            {/* Disconnected Wire */}
            <div className="absolute -top-8 left-0">
              <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-60">
                <path
                  d="M 10 10 Q 40 30, 60 25"
                  stroke="#374151"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="10" r="4" fill="#374151" />
              </svg>
            </div>
          </div>

          {/* Worker 1 - Confused */}
          <div className="flex flex-col items-center relative">
            {/* Question marks floating */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
              ❓
            </div>
            
            <div className="w-12 h-12 rounded-full bg-yellow-400 mb-2 relative">
              {/* Confused face */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div>
                </div>
                <div className="w-4 h-1 bg-gray-800 rounded-full"></div>
              </div>
            </div>
            <div className="w-10 h-14 bg-yellow-500 rounded-sm relative">
              {/* Hand scratching head */}
              <div className="absolute -top-2 -right-4 w-6 h-6 bg-yellow-400 rounded-full"></div>
            </div>
            <div className="flex gap-1 justify-center mt-1">
              <div className="w-2.5 h-10 bg-blue-900 rounded-sm"></div>
              <div className="w-2.5 h-10 bg-blue-900 rounded-sm"></div>
            </div>
          </div>

          {/* Worker 2 - Holding Map */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-400 mb-2"></div>
            <div className="w-10 h-14 bg-yellow-500 rounded-sm relative">
              {/* Map */}
              <div className="absolute -left-6 top-2 w-16 h-12 bg-white border-2 border-gray-400 rounded transform -rotate-12">
                <div className="p-1">
                  <div className="w-full h-1 bg-blue-400 mb-1"></div>
                  <div className="w-2/3 h-1 bg-red-400 mb-1"></div>
                  <div className="w-full h-1 bg-green-400"></div>
                </div>
              </div>
            </div>
            <div className="flex gap-1 justify-center mt-1">
              <div className="w-2.5 h-10 bg-blue-900 rounded-sm"></div>
              <div className="w-2.5 h-10 bg-blue-900 rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Search className="h-12 w-12 text-amber-500" />
            <h1 className="text-6xl font-bold text-foreground">404</h1>
          </div>
          
          {didRedirect ? (
            // Hiển thị khi đang redirect tự động
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="font-medium">{t("errorPage.notFound.autoRedirect")}</span>
              </div>
              <p className="text-sm text-primary mt-1">
                {t("errorPage.notFound.redirectHint")}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                <code className="bg-primary/20 px-2 py-1 rounded text-primary">{currentPath}</code>
                <span>→</span>
                <code className="bg-emerald-100 px-2 py-1 rounded text-emerald-700">
                  {findClosestRoute(currentPath)}
                </code>
              </div>
            </div>
          ) : (
            // Hiển thị khi không tìm được
            <>
              <h2 className="text-3xl font-semibold text-foreground">
                {t("errorPage.notFound.title")}
              </h2>
              
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                <Trans
                  i18nKey="errorPage.notFound.pathMissing"
                  values={{ path: currentPath }}
                  components={{ code: <code className="bg-muted/50 px-2 py-1 rounded text-foreground" /> }}
                />
              </p>

              {/* Gợi ý các trang gần nhất */}
              {suggestions.length > 0 && (
                <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-secondary-foreground mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-left">
                      <p className="font-medium text-foreground mb-2">{t("errorPage.notFound.suggestionsTitle")}</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((route) => (
                          <button
                            key={route}
                            onClick={() => navigate(route)}
                            className="text-left px-3 py-1.5 bg-card border border-secondary/40 rounded-md 
                                     text-foreground hover:bg-secondary/30 hover:border-amber-400 
                                     transition-colors text-sm"
                          >
                            {ROUTE_NAMES[route] ? t(ROUTE_NAMES[route]) : route}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-background border border-border rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-left">
                    <p className="font-medium text-foreground mb-1">{t("errorPage.notFound.tipsTitle")}</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• {t("errorPage.notFound.tipCheckUrl")}</li>
                      <li>
                        •{" "}
                        <Trans
                          i18nKey="errorPage.notFound.tipTypeInstead"
                          values={{ short: "/login", full: "/auth/login" }}
                          components={{ code: <code /> }}
                        />
                      </li>
                      <li>
                        •{" "}
                        <Trans
                          i18nKey="errorPage.notFound.tipTypeInstead"
                          values={{ short: "/order", full: "/admin/orders" }}
                          components={{ code: <code /> }}
                        />
                      </li>
                      <li>• {t("errorPage.notFound.tipGoHome")}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
            disabled={didRedirect}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("button.back")}
          </Button>
          
          <Button
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
            disabled={didRedirect}
          >
            <Home className="h-4 w-4" />
            {t("shared.errorBoundary.goHome")}
          </Button>
        </div>

        {/* Quick Links */}
        {!didRedirect && (
          <div className="max-w-md mx-auto pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">{t("errorPage.notFound.quickLinks")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { path: "/admin/dashboard", label: "Dashboard" },
                { path: "/admin/orders", label: t("admin.sidebar.orders") },
                { path: "/admin/users", label: "Users" },
                { path: "/partner/dashboard", label: "Partner" },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md 
                           text-card-foreground text-sm transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

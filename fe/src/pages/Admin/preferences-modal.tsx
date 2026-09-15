import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "~/components/ui";
import LanguageSwitcher from "~/components/ui/LanguageSwitcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "~/components/ui";
import { useTranslation } from "react-i18next";
import { ChevronRight, Globe, SunMoon, SlidersHorizontal, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "~/context/theme-context";

type PreferencesModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Tuỳ chọn hiển thị cá nhân (ngôn ngữ, giao diện) — lưu ngay trên trình duyệt.
 * Quy tắc nghiệp vụ của hệ thống nằm ở trang /admin/settings.
 */
export default function PreferencesModal({
  open = false,
  onOpenChange,
}: PreferencesModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const openBusinessSettings = () => {
    onOpenChange?.(false);
    navigate("/admin/settings");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("admin.settings.title")}</DialogTitle>
          <DialogDescription>{t("admin.settings.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          {/* Language */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <Globe size={16} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("admin.settings.language")}</p>
                <p className="text-xs text-muted-foreground">{t("admin.settings.languageHelp")}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <SunMoon size={16} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("admin.settings.theme")}</p>
                <p className="text-xs text-muted-foreground">{t("admin.settings.themeHelp")}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              {(["light", "system", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  title={mode}
                  className={`p-1.5 rounded-md transition-colors ${
                    theme === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "light" && <Sun size={15} />}
                  {mode === "system" && <Monitor size={15} />}
                  {mode === "dark" && <Moon size={15} />}
                </button>
              ))}
            </div>
          </div>

          {/* Business rules live on their own page */}
          <button
            type="button"
            onClick={openBusinessSettings}
            className="flex w-full items-center justify-between py-3 text-left group"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal size={16} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("admin.sidebar.businessSettings")}</p>
                <p className="text-xs text-muted-foreground">
                  Giá, phí, thời hạn, SLA và giới hạn của hệ thống
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground" />
          </button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            {t("button.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

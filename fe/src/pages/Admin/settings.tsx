import * as React from "react";
import { Button, Switch } from "~/components/ui";
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
import { Globe, SunMoon, BarChart2, Code2, Save, RefreshCw, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "~/context/theme-context";

type SettingsModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function SettingsModal({
  open = false,
  onOpenChange,
}: SettingsModalProps): React.JSX.Element {
  const [analytics, setAnalytics] = React.useState(true);
  const [devMode, setDevMode] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 700);
  };

  const handleReset = () => {
    setTheme("system");
    setAnalytics(true);
    setDevMode(false);
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

          {/* Analytics */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <BarChart2 size={16} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("admin.settings.analytics")}</p>
                <p className="text-xs text-muted-foreground">{t("admin.settings.analyticsHelp")}</p>
              </div>
            </div>
            <Switch checked={analytics} onCheckedChange={(v) => setAnalytics(!!v)} />
          </div>

          {/* Dev Mode */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <Code2 size={16} className="text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("admin.settings.devMode")}</p>
                <p className="text-xs text-muted-foreground">{t("admin.settings.devModeHelp")}</p>
              </div>
            </div>
            <Switch checked={devMode} onCheckedChange={(v) => setDevMode(!!v)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleReset} className="gap-1.5">
            <RefreshCw size={15} />
            {t("admin.settings.reset")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save size={15} />
            {saving ? t("admin.settings.saving") : t("admin.settings.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

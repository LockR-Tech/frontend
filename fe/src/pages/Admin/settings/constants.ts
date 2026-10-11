import {
  Award,
  Bot,
  Boxes,
  Cpu,
  Package,
  ShieldCheck,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  SETTING_SCOPES,
  type SettingScope,
} from "~/stores/apis/admin/businessSettings";
import i18n from "~/utils/i18n";

export interface ScopeTab {
  scope: SettingScope;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** `title`/`description` dịch lúc đọc (getter) theo ngôn ngữ hiện tại. */
function scopeTab(
  scope: SettingScope,
  icon: LucideIcon,
  titleKey: string,
  descriptionKey: string,
): ScopeTab {
  return {
    scope,
    icon,
    get title() {
      return i18n.t(titleKey);
    },
    get description() {
      return i18n.t(descriptionKey);
    },
  };
}

// Chỉ mô tả nhóm; danh sách quy tắc trong mỗi tab luôn lấy từ API.
export const SCOPE_TABS: ScopeTab[] = [
  scopeTab("order", Package, "admin.settings.scopes.order.title", "admin.settings.scopes.order.description"),
  scopeTab("locker", Boxes, "admin.settings.scopes.locker.title", "admin.settings.scopes.locker.description"),
  scopeTab("payment", Wallet, "admin.settings.scopes.payment.title", "admin.settings.scopes.payment.description"),
  scopeTab("iot", Cpu, "admin.settings.scopes.iot.title", "admin.settings.scopes.iot.description"),
  scopeTab("auth", ShieldCheck, "admin.settings.scopes.auth.title", "admin.settings.scopes.auth.description"),
  scopeTab("loyalty", Award, "admin.settings.scopes.loyalty.title", "admin.settings.scopes.loyalty.description"),
  scopeTab("store", Store, "admin.settings.scopes.store.title", "admin.settings.scopes.store.description"),
  scopeTab(
    "assistant",
    Bot,
    "admin.settings.scopes.assistant.title",
    "admin.settings.scopes.assistant.description",
  ),
];

export const DEFAULT_SCOPE: SettingScope = "order";

export function isSettingScope(value: string | null | undefined): value is SettingScope {
  return !!value && (SETTING_SCOPES as readonly string[]).includes(value);
}

export function scopeTitle(scope: SettingScope): string {
  return SCOPE_TABS.find((tab) => tab.scope === scope)?.title ?? scope;
}

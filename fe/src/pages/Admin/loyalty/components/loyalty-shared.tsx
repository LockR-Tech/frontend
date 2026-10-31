import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";

// Thiếu trường (backend cũ) thì hiện "—" chứ không vẽ số 0.
export function fmtNum(n?: number | null, digits = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}

export interface UserInfo {
  name: string;
  contact: string;
  deleted: boolean;
}

export function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
      {count !== undefined && <span className="font-bold">{fmtNum(count)}</span>}
    </button>
  );
}

export function UserCell({ userId, user }: { userId: number; user?: UserInfo }) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <Link
        to={`/admin/users/${userId}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-primary hover:underline"
      >
        {user?.name || `#${userId}`}
      </Link>
      {user?.deleted && (
        <Badge variant="outline" className="ml-1.5 text-[10px] text-muted-foreground">
          {t("admin.loyalty.list.deletedUser")}
        </Badge>
      )}
      {user?.contact && <p className="truncate text-xs text-muted-foreground">{user.contact}</p>}
    </div>
  );
}

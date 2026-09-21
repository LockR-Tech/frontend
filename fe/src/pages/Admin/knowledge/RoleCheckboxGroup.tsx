import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { knowledgeRoleLabel } from "./knowledge-utils";

interface RoleCheckboxGroupProps {
  /** Tiền tố id cho các checkbox (tránh trùng khi có nhiều nhóm trên trang). */
  idPrefix: string;
  options: readonly string[];
  value: string[];
  onToggle: (role: string, checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Danh sách vai trò dạng checkbox; luật chọn (ALL thắng, mặc định…) do nơi gọi quyết định. */
export function RoleCheckboxGroup({
  idPrefix,
  options,
  value,
  onToggle,
  disabled,
  className,
}: RoleCheckboxGroupProps) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {options.map((role) => {
        const id = `${idPrefix}-${role}`;
        const checked = value.includes(role);
        return (
          <label
            key={role}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              checked ? "border-primary/60 bg-primary/5" : "border-border hover:bg-muted/50",
              role === "ALL" && "sm:col-span-2",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <Checkbox
              id={id}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(state) => onToggle(role, state === true)}
            />
            <span className="min-w-0">
              <span className="font-medium text-foreground">{knowledgeRoleLabel(role)}</span>
              <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{role}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

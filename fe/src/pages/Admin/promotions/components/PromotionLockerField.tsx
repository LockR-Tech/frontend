import { useState } from "react";
import { Check, ChevronsUpDown, Globe, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import type { AdminLockerResponse } from "~/types/admin/locker";
import { promotionLockerLabel } from "../promotion-status";

interface PromotionLockerFieldProps {
  id?: string;
  /** null = toàn hệ thống. */
  value: number | null;
  onChange: (lockerId: number | null) => void;
  lockers: AdminLockerResponse[];
  isLoading?: boolean;
  /** Mã/tên backend trả kèm voucher — dùng khi tủ đang chọn không còn trong danh sách. */
  fallback?: { code?: string | null; name?: string | null } | null;
}

const GLOBAL_VALUE = "__global__";

/** Bỏ dấu tiếng Việt để gõ "tu a" vẫn tìm ra "Tủ A". */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

// cmdk: chỉ so khớp theo keywords (mã + tên tủ), không theo value nội bộ.
const matchLocker = (value: string, search: string, keywords?: string[]) => {
  const q = fold(search.trim());
  if (!q) return 1;
  const haystack = fold((keywords?.length ? keywords : [value]).join(" "));
  return haystack.includes(q) ? 1 : 0;
};

/** Ô chọn "Áp dụng tại": Toàn hệ thống hoặc một tủ cụ thể (có tìm kiếm). */
export function PromotionLockerField({
  id,
  value,
  onChange,
  lockers,
  isLoading,
  fallback,
}: PromotionLockerFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const globalLabel = t("admin.promotions.scope.global");
  const selected = value == null ? undefined : lockers.find((l) => l.id === value);
  // Tủ đang gắn với voucher nhưng không có trong danh sách (đã xoá / chưa tải xong).
  const missing =
    value != null && !selected
      ? { id: value, code: fallback?.code ?? null, name: fallback?.name ?? null }
      : null;
  const selectedLabel =
    value == null
      ? globalLabel
      : promotionLockerLabel(selected ?? missing ?? { id: value });

  const pick = (lockerId: number | null) => {
    onChange(lockerId);
    setOpen(false);
  };

  const checkMark = (active: boolean) => (
    <Check size={14} className={cn("ml-auto shrink-0", active ? "opacity-100" : "opacity-0")} />
  );

  return (
    // `modal`: Popover nằm trong Dialog — không có thì Dialog chặn cuộn danh sách tủ.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between px-3 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            {value == null ? (
              <Globe size={14} className="shrink-0 text-muted-foreground" />
            ) : (
              <MapPin size={14} className="shrink-0 text-orange-500" />
            )}
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronsUpDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0"
      >
        <Command filter={matchLocker}>
          <CommandInput placeholder={t("admin.promotions.modal.scopeSearch")} />
          <CommandList className="max-h-64">
            <CommandEmpty>{t("admin.promotions.modal.scopeEmpty")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={GLOBAL_VALUE}
                keywords={[globalLabel]}
                onSelect={() => pick(null)}
              >
                <Globe size={14} className="mr-2 shrink-0 text-muted-foreground" />
                {globalLabel}
                {checkMark(value == null)}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading={t("admin.promotions.modal.scopeLockersGroup")}>
              {missing && (
                <CommandItem
                  value={`locker-${missing.id}`}
                  keywords={[missing.code ?? "", missing.name ?? "", String(missing.id)]}
                  onSelect={() => pick(missing.id)}
                >
                  <MapPin size={14} className="mr-2 shrink-0 text-orange-500" />
                  <span className="truncate">{promotionLockerLabel(missing)}</span>
                  {checkMark(true)}
                </CommandItem>
              )}
              {lockers.map((locker) => (
                <CommandItem
                  key={locker.id}
                  value={`locker-${locker.id}`}
                  keywords={[locker.code ?? "", locker.name ?? ""]}
                  onSelect={() => pick(locker.id)}
                >
                  <MapPin size={14} className="mr-2 shrink-0 text-orange-500" />
                  <span className="truncate">
                    <span className="font-mono text-xs font-semibold">{locker.code}</span>
                    {locker.name ? ` — ${locker.name}` : ""}
                  </span>
                  {checkMark(value === locker.id)}
                </CommandItem>
              ))}
              {isLoading && lockers.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t("admin.promotions.modal.scopeLoading")}
                </p>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

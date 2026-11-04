import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/** Nhãn "Đang xem: <thẻ> · N" khi danh sách đang lọc theo một thẻ số; bấm để bỏ lọc. */
export function CardFilterChip({
  label,
  count,
  onClear,
}: {
  label: string;
  count: number;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5 text-xs" onClick={onClear}>
      {t("common.cardFilter.showing", { label, count })}
      <span className="text-muted-foreground">· {t("common.cardFilter.clear")}</span>
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}

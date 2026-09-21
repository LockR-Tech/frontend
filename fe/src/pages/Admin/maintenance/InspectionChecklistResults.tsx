import { Badge } from "~/components/ui/badge";
import { INSPECTION_ITEM_META, parseChecklistResults } from "./maintenancePhotos";

/// Biên bản checklist của một lần kiểm tra định kỳ: bản ghi mới là JSON từng mục
/// (PASS/FAIL/NA + ghi chú), bản ghi cũ là văn bản tự do — hiển thị được cả hai.
export function InspectionChecklistResults({ raw }: { raw?: string | null }) {
  const parsed = parseChecklistResults(raw);
  if (!parsed) return null;

  if (parsed.kind === "text") {
    return (
      <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-md">
        <span className="font-semibold text-foreground">Checklist (dữ liệu cũ): </span>
        {parsed.text}
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {parsed.items.map((item, idx) => {
        const meta = INSPECTION_ITEM_META[item.result];
        return (
          <li key={`${item.label}-${idx}`} className="flex items-start gap-2 text-[11px]">
            <Badge variant="outline" className={`shrink-0 text-[10px] font-semibold ${meta?.cls ?? ""}`}>
              {meta?.label ?? item.result}
            </Badge>
            <span className="text-foreground">
              {item.label}
              {item.note && <span className="text-muted-foreground"> — {item.note}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

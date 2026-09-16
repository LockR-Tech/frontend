import { cn } from "~/lib/utils";
import { EMPTY_VALUE } from "~/lib/report-format";

interface LabelValueProps {
  label: string;
  children?: React.ReactNode;
  /** Dùng font đẳng khoảng cho mã, id, tham chiếu. */
  mono?: boolean;
  className?: string;
}

/** Một cặp nhãn — giá trị trong khối chi tiết; giá trị rỗng hiển thị `—`. */
export function LabelValue({ label, children, mono, className }: LabelValueProps) {
  const empty =
    children === null ||
    children === undefined ||
    children === "" ||
    children === false;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <div
        className={cn(
          "text-sm text-foreground break-words",
          mono && "font-mono text-xs",
          empty ? "text-muted-foreground" : "font-medium",
        )}
      >
        {empty ? EMPTY_VALUE : children}
      </div>
    </div>
  );
}

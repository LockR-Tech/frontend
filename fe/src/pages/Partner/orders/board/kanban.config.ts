import { OrderStatus } from "@/types/partner.enum";

// ============================================
// Column definitions — order matters (left → right)
// ============================================
export interface KanbanColumnConfig {
  status: OrderStatus;
  label: string;
  /** Tailwind classes for the column header accent */
  accent: string;
  /** Tailwind classes for the column background */
  bg: string;
  /** Tailwind classes for badge on card */
  badge: string;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    status: OrderStatus.INITIALIZED,
    label: "Khởi tạo",
    accent: "border-slate-400",
    bg: "bg-slate-50/50 dark:bg-slate-950/20",
    badge: "bg-slate-100 text-slate-800 border-slate-200",
  },
  {
    status: OrderStatus.WAITING,
    label: "Chờ lấy đồ",
    accent: "border-yellow-400",
    bg: "bg-yellow-50/50 dark:bg-yellow-950/20",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    status: OrderStatus.COLLECTED,
    label: "Đã lấy",
    accent: "border-purple-400",
    bg: "bg-purple-50/50 dark:bg-purple-950/20",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    status: OrderStatus.PROCESSING,
    label: "Đang giặt",
    accent: "border-blue-400",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    status: OrderStatus.READY,
    label: "Sẵn sàng trả",
    accent: "border-orange-400",
    bg: "bg-orange-50/50 dark:bg-orange-950/20",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    status: OrderStatus.RETURNED,
    label: "Đã trả tủ",
    accent: "border-indigo-400",
    bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    status: OrderStatus.COMPLETED,
    label: "Hoàn thành",
    accent: "border-emerald-400",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
];

/** Map for fast lookup by status */
export const COLUMN_CONFIG_MAP = Object.fromEntries(
  KANBAN_COLUMNS.map((col) => [col.status, col]),
) as Record<OrderStatus, KanbanColumnConfig>;

// ============================================
// Allowed drag transitions (based on UC2/UC3)
// ============================================

/**
 * Defines which target statuses are valid when dragging an order.
 * Statuses not listed here cannot be drag-targets from the source.
 */
export const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> =
  {
    // UC2: Partner accepts order → Staff COLLECT code generated
    [OrderStatus.WAITING]: [OrderStatus.COLLECTED],
    // UC3 Step 1: Partner sets to PROCESSING
    [OrderStatus.COLLECTED]: [OrderStatus.PROCESSING, OrderStatus.READY],
    // UC3 Step 3: Partner marks ready → Staff RETURN code generated
    [OrderStatus.PROCESSING]: [OrderStatus.READY],
  };

export function isTransitionAllowed(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

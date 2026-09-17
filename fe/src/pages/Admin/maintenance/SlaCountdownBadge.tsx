import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Badge } from "~/components/ui/badge";

interface SlaCountdownBadgeProps {
  slaDueAt?: string | null;
  createdAt?: string | null;
  slaHours?: number;
  status?: string;
  className?: string;
}

export function SlaCountdownBadge({
  slaDueAt,
  createdAt,
  slaHours = 4,
  status,
  className = "",
}: SlaCountdownBadgeProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === "RESOLVED") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "RESOLVED") return null;

  let targetTime: number | null = null;
  if (slaDueAt) {
    const t = new Date(slaDueAt).getTime();
    if (!isNaN(t)) targetTime = t;
  }
  if (!targetTime && createdAt) {
    const c = new Date(createdAt).getTime();
    if (!isNaN(c)) targetTime = c + slaHours * 3600 * 1000;
  }
  if (!targetTime) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const diffMs = targetTime - now;

  if (diffMs > 0) {
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return (
      <Badge
        variant="outline"
        className={`bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-xs gap-1 py-0.5 shadow-2xs ${className}`}
      >
        <Clock className="w-3 h-3 text-emerald-600 animate-pulse" />
        Còn {pad(h)}:{pad(m)}:{pad(s)}
      </Badge>
    );
  } else {
    const totalSec = Math.floor(Math.abs(diffMs) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return (
      <Badge
        variant="outline"
        className={`bg-rose-50 text-rose-700 border-rose-300 font-mono text-xs gap-1 py-0.5 shadow-2xs ${className}`}
      >
        <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
        Quá hạn {pad(h)}:{pad(m)}:{pad(s)}
      </Badge>
    );
  }
}

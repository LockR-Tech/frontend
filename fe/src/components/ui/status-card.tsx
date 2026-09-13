import * as React from "react";

type Variant = "blue" | "indigo" | "violet" | "green" | "amber" | "red" | "gray";

const VARIANT_STYLES: Record<Variant, { wrapper: string; overlay: string; accent: string; iconBg: string }> = {
  blue: {
    wrapper: "bg-gradient-to-br from-blue-950 via-blue-800/60 to-blue-700/20",
    overlay: "from-blue-700/30 via-blue-600/20",
    accent: "border-blue-500",
    iconBg: "bg-blue-500",
  },
  indigo: {
    wrapper: "bg-gradient-to-br from-indigo-950 via-indigo-800/60 to-indigo-700/20",
    overlay: "from-indigo-700/30 via-indigo-600/20",
    accent: "border-indigo-500",
    iconBg: "bg-indigo-500",
  },
  violet: {
    wrapper: "bg-gradient-to-br from-violet-950 via-violet-800/60 to-violet-700/20",
    overlay: "from-violet-700/30 via-violet-600/20",
    accent: "border-violet-500",
    iconBg: "bg-violet-500",
  },
  green: {
    wrapper: "bg-gradient-to-br from-green-950 via-green-800/60 to-green-700/20",
    overlay: "from-green-700/30 via-green-600/20",
    accent: "border-green-500",
    iconBg: "bg-green-600",
  },
  amber: {
    wrapper: "bg-gradient-to-br from-amber-950 via-amber-800/60 to-amber-700/20",
    overlay: "from-amber-700/30 via-amber-600/20",
    accent: "border-amber-500",
    iconBg: "bg-amber-500",
  },
  red: {
    wrapper: "bg-gradient-to-br from-red-950 via-red-800/60 to-red-700/20",
    overlay: "from-red-700/30 via-red-600/20",
    accent: "border-red-500",
    iconBg: "bg-red-500",
  },
  gray: {
    wrapper: "bg-gradient-to-br from-gray-950 via-gray-800/60 to-gray-700/20",
    overlay: "from-gray-700/30 via-gray-600/20",
    accent: "border-gray-500",
    iconBg: "bg-gray-500",
  },
};

export type StatusCardProps = {
  title: string;
  description?: string;
  count?: number | string;
  icon?: React.ReactNode; // pass a lucide-react icon element
  variant?: Variant;
  className?: string;
};

export default function StatusCard({ title, description, count, icon, variant = "blue", className = "" }: StatusCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`relative h-42 w-full  ${styles.accent} rounded-2xl ${styles.wrapper} text-white font-nunito p-4 flex flex-col justify-center gap-3 hover:shadow-2xl transition-all duration-400 group ${className}`}
    >
      <div className={`absolute inset-0 bg-linear-to-br ${styles.overlay} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
      <div className="relative z-10 flex items-start justify-between px-10">
        <div>
          <h3 className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-white/90 to-white/70">{title}</h3>
          {description ? <p className="text-sm text-white/80 mt-1 max-w-xs">{description}</p> : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="p-0">{icon}</div>
          {count !== undefined ? <div className="text-lg font-semibold">{count}</div> : null}
        </div>
      </div>
    </div>
  );
}

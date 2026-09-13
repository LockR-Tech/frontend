import { cn } from "~/lib/utils";

interface StatusTab {
  value: string;
  label: string;
  count?: number;
  color?: "blue" | "green" | "yellow" | "red" | "gray" | "purple";
}

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

// Semantic color variants for light mode
const lightModeVariants = {
  blue: "bg-primary/10 text-primary border-primary/20 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
  green: "bg-emerald-100 text-emerald-700 border-emerald-200 data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  yellow: "bg-amber-100 text-amber-700 border-amber-200 data-[active=true]:bg-amber-600 data-[active=true]:text-white",
  red: "bg-red-100 text-red-700 border-red-200 data-[active=true]:bg-red-600 data-[active=true]:text-white",
  gray: "bg-muted text-muted-foreground border-border data-[active=true]:bg-muted-foreground data-[active=true]:text-background",
  purple: "bg-violet-100 text-violet-700 border-violet-200 data-[active=true]:bg-violet-600 data-[active=true]:text-white",
};

// Semantic color variants for dark mode  
const darkModeVariants = {
  blue: "dark:bg-cool-400/20 dark:text-cool-400 dark:border-cool-400/30 dark:data-[active=true]:bg-cool-400 dark:data-[active=true]:text-cool-950",
  green: "dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 dark:data-[active=true]:bg-emerald-600 dark:data-[active=true]:text-white",
  yellow: "dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 dark:data-[active=true]:bg-amber-600 dark:data-[active=true]:text-white",
  red: "dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 dark:data-[active=true]:bg-red-600 dark:data-[active=true]:text-white",
  gray: "dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600 dark:data-[active=true]:bg-slate-500 dark:data-[active=true]:text-white",
  purple: "dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30 dark:data-[active=true]:bg-violet-600 dark:data-[active=true]:text-white",
};

export function StatusTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: StatusTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          data-active={activeTab === tab.value}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200",
            "hover:shadow-md hover:-translate-y-0.5",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring",
            lightModeVariants[tab.color || "blue"],
            darkModeVariants[tab.color || "blue"],
            activeTab === tab.value && "shadow-md -translate-y-0.5"
          )}
        >
          <span>{tab.label}</span>
          {tab.count !== undefined && tab.count > 0 && (
            <span
              className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold",
                activeTab === tab.value
                  ? "bg-white/20 text-white"
                  : "bg-current/20 text-current"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

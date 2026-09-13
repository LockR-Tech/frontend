import { Settings, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface DashboardHeaderProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettings: () => void;
  onCreateScenario: () => void;
}

export function DashboardHeader({
  tabs,
  activeTab,
  onTabChange,
  onSettings,
  onCreateScenario,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Dashboard
        </h1>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="default"
            className="flex items-center gap-2"
            onClick={onSettings}
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Cài đặt</span>
          </Button>
          <Button
            size="default"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onCreateScenario}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Tạo kịch bản</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="bg-muted/50 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-full px-4 py-2 text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
